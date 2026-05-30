import { PrismaClient } from '@prisma/client';

export async function seedRethP2PNetworkingEN(prisma: PrismaClient) {
  const tags = ['p2p', 'networking', 'devp2p', 'libp2p', 'advanced'];

  await prisma.course.create({
    data: {
      slug: 'reth-p2p-networking-en',
      title: 'P2P Networking Internals — From devp2p to Custom Gossip',
      description:
        'Read reth\'s P2P stack one layer at a time — the devp2p bundle (discv5 + RLPx + eth/68), the six-crate \`crates/net/\` structure, and the custom-gossip extension point that powers MEV-Boost-style messaging. By the end you can drop a chain-specific sub-protocol into a reth node and reason about peer discovery, scoring, and bandwidth across the whole stack.',
      difficulty: 'ADVANCED',
      duration: 61,
      xpReward: 175,
      track: 'reth-p2p-networking',
      tags,
      isPublished: true,
      sortOrder: 1430,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'P2P Networking',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Lesson 1 — P2P fundamentals: devp2p, libp2p, and peer discovery',
                  slug: 'p2p-fundamentals-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# Lesson 1 — P2P fundamentals: devp2p, libp2p, and peer discovery

## Question

You launch a fresh reth node = zero peers, zero blocks, zero state. Seconds later it is downloading headers from somewhere — **where did the peers come from?** A node that is not on the network cannot ask the network for peers. **This is the bootstrapping problem**, and the P2P layer has to solve it before anything else can begin.

## Principle (minimum model)

- **Two-layer structure.** Discovery (find peers, discv4 / discv5 = Kademlia DHT) + Transport (talk to peers, RLPx = encrypted TCP).
- **Bootstrapping is solved by bootnodes.** Well-known IPs hardcoded into the chainspec, connect to one → it gives you more peers → the DHT takes over.
- **devp2p = Ethereum-purpose stack.** discv5 (peer discovery) + RLPx (encrypted TCP) + eth/68 (block + tx gossip).
- **Kademlia "closeness" = XOR distance over node IDs.** Topological, no geographic meaning. Nodes close in ID space find each other efficiently = O(log N) hops.
- **ENR = Ethereum Node Record.** ID + IP + port + capability. Discovery queries return ENRs.
- **RLPx ≈ Ethereum-flavored TLS.** ECDH + ECDSA + AES-CTR + RLP framing. **peer ID = the public key itself** — no central CA, hence the reason to skip TLS.
- **eth/68 announces tx by hash first.** Avoids the amplification problem where every node rebroadcasts every tx body to every other node.
- **libp2p = the multi-chain alternative.** Discovery / transport / encryption / multiplexing kept as independent layers. Adopted by Polkadot, IPFS, Solana, Lighthouse. Reth uses devp2p for historical reasons.

## Worked example + steps

# P2P fundamentals — devp2p, libp2p, and peer discovery

You launch a fresh reth node. It has no peers, no blocks, no state. Within seconds it's downloading headers from somewhere — but *where did the peers come from*? It can't ask the network for peers without already being on the network. That chicken-and-egg is the **bootstrapping problem**, and it's the first thing the P2P layer has to solve before anything else can happen.

The P2P layer stays invisible until it isn't: sync stalls, gossip drops your tx, peer scoring boots you off the network. When that happens, you need to know what's running underneath. On Ethereum that's **devp2p** — Ethereum's purpose-built peer-to-peer stack. Other chains use **libp2p** (a modular, multi-chain alternative) or roll their own.


## 1. The two layers

Every P2P stack splits the work in two:

| Layer | Job | Protocol on Ethereum |
| :--- | :--- | :--- |
| **Discovery** | "Find peers" | discv4 / discv5 (Kademlia DHT) |
| **Transport** | "Talk to peers" | RLPx (encrypted TCP) |

Discovery is the bootstrapping problem from the opener — peers need peers to find peers. The answer: **bootnodes**, well-known IP addresses hardcoded into the chainspec. You connect to one, it gives you more, the DHT takes over.

## 2. devp2p — Ethereum's protocol

[devp2p](https://github.com/ethereum/devp2p) is the protocol Ethereum nodes speak. Ethereum-specific (not multi-chain). It bundles three pieces:

- **discv5**: peer discovery via Kademlia DHT (a distributed hash table for finding nodes)
- **RLPx**: encrypted, authenticated TCP transport
- **eth/68** (current sub-protocol): block + transaction gossip

When you run a reth node, all of this is happening:

\`\`\`mermaid
flowchart LR
    Boot["Bootnode"] -->|seed peer list| You["Your Reth node"]
    You -->|discv5 ping| Peer1["Peer 1"]
    You -->|discv5 ping| Peer2["Peer 2"]
    Peer1 -->|RLPx handshake| You
    You -->|eth/68: blocks, txs| Peer1
    You -->|eth/68: blocks, txs| Peer2
\`\`\`

## 3. discv5 — peer discovery via Kademlia

How do you scale "find me peers" from one bootnode to a global network of millions? Kademlia.

Kademlia is a **distributed hash table (DHT)** — a structure where each node holds a small slice of the directory and routes queries to nodes that hold the rest. Each Ethereum node has a 256-bit ID (derived from its public key). To find peers "close to" some target ID, you query nodes you already know; they return their closest known peers; you query those; repeat. Recursive lookup, O(log N) hops.

For Ethereum:
- Each peer publishes an **ENR (Ethereum Node Record)** — its ID, IP, port, capabilities
- Discovery queries return ENRs
- Bootnodes are well-known starting points (in the chainspec)


Kademlia's "closeness" is XOR distance over node IDs — purely topological, no geographic meaning. The point: nodes close in ID can find each other efficiently. That's what makes finding any peer in a network of millions tractable.

## 4. RLPx — the transport layer

Once you have a peer's address, you need an encrypted channel to talk to it. That's RLPx.

- **Handshake**: ECDH key exchange + signature verification
- **Encryption**: AES-CTR with per-direction keys
- **Framing**: RLP-encoded messages with length prefixes (RLP = Recursive Length Prefix, Ethereum's wire encoding)

Think of RLPx as **TLS for Ethereum** — encrypted, authenticated, ordered byte stream. Why not just use TLS? Pre-2015 history, plus subtle requirements TLS doesn't fit: peer ID *is* the pubkey, no centralized CA.

## 5. eth/68 — the sub-protocol

RLPx gives you a secure channel; **eth/68** is what flows through it. The current Ethereum sub-protocol. Messages include:

| Message | Purpose |
| :--- | :--- |
| Status | Handshake — fork version, chain ID, head |
| NewBlock | Announce a new block |
| BlockBodies | Request/respond block bodies |
| NewPooledTransactionHashes | Announce pending tx (hashes only) |
| PooledTransactions | Request full tx bodies |
| Receipts | Request/respond receipts |

Note: in eth/68, transactions are announced as **hashes first** — peers request the full body only if they don't already have it. This kills the "every node re-broadcasts every full tx" amplification.

## 6. libp2p — the alternative

If devp2p is the bundled Ethereum stack, [libp2p](https://github.com/libp2p/) is the unbundled multi-chain one. Used by:
- Polkadot (built on libp2p)
- IPFS (libp2p's origin)
- Solana (custom transport but libp2p concepts)
- Many newer chains

libp2p separates concerns: discovery (separate), transports (TCP/QUIC/WebRTC), encryption (Noise — a key-agreement protocol framework), multiplexing (yamux/mplex — running many logical streams over one connection). You compose what you need.

Why Ethereum doesn't use libp2p: history. devp2p existed first; switching is hard. Some newer Ethereum tools (Lighthouse, a consensus client) use libp2p anyway; reth sticks with devp2p to match the execution-layer protocol.

## 7. For Reth-based chains

A new chain built on Reth has a choice:

- **Use devp2p** (default, what reth provides) — works out of the box
- **Customize devp2p** — add custom sub-protocols (e.g., \`tempo/1\` for payment-specific messages)
- **Add libp2p sidecar** — for cases where you need different networking semantics

For Tempo: likely **devp2p with custom sub-protocol** for payment-specific gossip (e.g., merchant identity attestations, payment finality hints).

For Hyperliquid: their custom transport (HyperBFT communication) is **separate from execution-layer P2P** — they layered their own network on top of devp2p for consensus.

## 8. Practice

1. Open [discv5 spec](https://github.com/ethereum/devp2p/blob/master/discv5/discv5.md) and identify the 4 message types
2. Browse reth's [\`crates/net/network\`](https://github.com/paradigmxyz/reth/tree/main/crates/net/network) — find the entry point
3. Identify: how would you add a custom sub-protocol for payment-specific gossip?

> Final check: in one sentence, what's the bootstrapping problem solved by **bootnodes**? **If your answer doesn't reference "peers need peers to find peers," re-read §1.**

> 🛣️ **The road not taken (Solana):** Solana's block propagation is **Turbine** — a tree-based broadcast protocol, not gossip. The leader splits each block into *shreds* (small packets) and propagates them via a deterministic peer tree: each shred reaches every validator in roughly O(log N) hops, vs devp2p's O(N) gossip flooding. The result: dramatically lower bandwidth waste per block, but the design assumes every validator has near-symmetric high-bandwidth connectivity. devp2p's gossip wastes bandwidth (every validator receives each tx multiple times) but tolerates wildly heterogeneous network conditions and adversarial peers gracefully. Turbine optimizes for *throughput-at-scale with good peers*; devp2p optimizes for *survivability with bad peers*. Both are valid network-layer choices; the choice tracks what kind of validator network the chain is willing to require.

## Pass criteria

- State the two-layer split (Discovery vs Transport) and which protocols staff each role on Ethereum.
- Explain bootstrapping via bootnodes in one sentence — and why DNS-based discovery is a sibling, not a replacement.
- Define Kademlia XOR distance and the O(log N) lookup property.
- Name the three pieces inside devp2p (discv5 / RLPx / eth/68) and what each does.
- Explain why peer ID *is* the public key (no central CA) and why that excludes plain TLS.
- Summarize the eth/68 hash-first announcement and what amplification problem it avoids.
- Contrast devp2p vs libp2p in a sentence — and explain why Reth uses devp2p.

## Summary (3 lines)

- P2P two-layer split (Discovery = discv5 / Kademlia DHT + Transport = RLPx). Bootstrapping is solved by bootnodes hardcoded in the chainspec.
- devp2p bundles three pieces (discv5 + RLPx + eth/68); ENRs are the records returned by lookup. Peer ID = the public key, so RLPx ships its own crypto rather than TLS.
- libp2p is the modular multi-chain sibling; Reth speaks devp2p for historical reasons. Next lesson reads the actual reth crate that implements all of this.
`,
                },
                {
                  title: 'Lesson 2 — Reading reth\'s network crate',
                  slug: 'p2p-reth-network-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 17,
                  xpReward: 45,
                  content: `# Lesson 2 — Reading reth's network crate

## Question

You want to add a custom sub-protocol to your chain — a settlement finality hint, an MEV bundle gossip channel, whatever. **Where in the reth tree does that code live, and which existing pieces does it plug into?** Reth's network layer lives under [\`crates/net/\`](https://github.com/paradigmxyz/reth/tree/main/crates/net) and is spread across six sub-crates totalling roughly 30k lines of Rust.

## Principle (minimum model)

- **Six sub-crates.** \`net/discv5\` / \`net/eth-wire\` / \`net/network\` / \`net/network-api\` / \`net/peers\` / \`net/dns\`.
- **Read in five passes.** network-api (the API surface) → network (orchestration) → eth-wire (protocol messages) → peers (peer state machine) → discv5 (DHT internals).
- **\`NetworkManager\` is the central orchestrator.** Wires together Swarm + NetworkHandle + Discovery + NetworkState; three input streams (peer messages + new peers + commands) feed into one dispatcher.
- **Swarm state machine.** NewConnection → Handshake → Negotiation → Active → Disconnected. Hard cap of 25–50 peers; eviction is score-based.
- **eth-wire defines message structs with RLP-derive.** \`#[derive(RlpDecodable, RlpEncodable)]\` auto-generates the wire format from the struct definition.
- **Peer state machine has four parts.** Capability set + Score (response time / error rate) + Stats (bytes / message count) + connection state.
- **Custom sub-protocols are the extension point for chain-specific gossip.** Implement NAME + VERSION + MESSAGES_COUNT + on_message; they run alongside eth/68 on the same RLPx connection.
- **Peer scoring is a strategic knob.** Not just for ejecting bad peers — also for prioritising trusted infra (MEV / privacy / performance chains all use this as a strategy lever).

## Worked example + steps

# Reading reth's network crate

You want to add a custom sub-protocol for your chain — say, payment-finality hints or MEV bundle gossip. Where in the reth tree does that code go, and what existing pieces does it plug into? Reth's network layer lives at [\`crates/net/\`](https://github.com/paradigmxyz/reth/tree/main/crates/net) — ~30k lines of Rust split across six sub-crates handling discovery, transport, gossip, and peer management. This lesson is the orientation: what's where, what each crate does, where the extension points are.


## 1. The network crate map

| Crate | Role |
| :--- | :--- |
| \`net/discv5\` | discv5 implementation (Kademlia DHT) |
| \`net/eth-wire\` | Wire encoding/decoding for eth/68 messages |
| \`net/network\` | Top-level orchestration |
| \`net/network-api\` | Public API for app code |
| \`net/peers\` | Peer management, scoring, eviction |
| \`net/dns\` | DNS-based peer discovery (alternate to discv5) |

Reading order if you want to understand the whole thing:
1. \`network-api\` (API surface)
2. \`network\` (main orchestration)
3. \`eth-wire\` (the protocol messages)
4. \`peers\` (the peer state machine)
5. \`discv5\` (the discovery DHT)

## 2. The NetworkManager — central orchestrator

Every peer message, every discovery hit, every "broadcast this tx" command from the rest of the node flows through one struct. That struct is \`NetworkManager\`, in \`crates/net/network/src/manager.rs\`:

\`\`\`rust
pub struct NetworkManager<C> {
    swarm: Swarm<C>,                    // Peer connections
    handle: NetworkHandle,              // Public API handle
    from_handle_rx: UnboundedReceiver<NetworkHandleMessage>,
    discovery: Discovery,                // discv5 / DNS
    state: NetworkState<C>,             // Internal state
    // ...
}
\`\`\`

The \`run\` loop is small:
1. Poll \`swarm\` for peer messages
2. Poll \`discovery\` for newly discovered peers
3. Poll \`from_handle_rx\` for commands (e.g., "broadcast this tx")
4. Dispatch each event

Three input streams, one dispatcher. That's the heart of reth's networking.

> 🔍 **Find in repo.** Open \`crates/net/network/src/manager.rs\` and find the main \`poll_next\` or \`run\` method. **What's the polling order?** Why might that matter?

## 3. The Swarm — peer connection pool

\`Swarm\` is the pool of active peer connections under \`NetworkManager\`. Each connection runs through a small state machine:

\`\`\`
NewConnection → Handshake → Negotiation → Active → Disconnected
\`\`\`

For each peer:
- **NewConnection**: TCP connect or accept
- **Handshake**: RLPx authentication
- **Negotiation**: agree on supported sub-protocols (eth/68 etc.)
- **Active**: exchange messages
- **Disconnected**: graceful close or error

The Swarm enforces **peer limits** (typically 25-50 active) and **eviction policy** (drop low-scoring peers when new ones want in).

## 4. eth-wire — the protocol messages

Wire-format code lives in one crate. Each eth/68 message is a Rust struct with RLP-derive macros doing the encoding for you:

\`\`\`rust
#[derive(Debug, RlpDecodable, RlpEncodable)]
pub struct NewBlock {
    pub block: Block,
    pub total_difficulty: U256,
}

#[derive(Debug, RlpDecodable, RlpEncodable)]
pub struct NewPooledTransactionHashes {
    pub types: Vec<u8>,
    pub sizes: Vec<u32>,
    pub hashes: Vec<TxHash>,
}
\`\`\`

The derive macros generate the wire format. **Every message is RLP** — the same encoding used for transactions and blocks.

For custom sub-protocols, you define your own message structs and register them with the network. (We do that in lesson 3.)

## 5. The peer state machine

\`crates/net/peers/src/peer.rs\` tracks per-peer state:

- **Capability set**: what sub-protocols does this peer support?
- **Score**: based on response time, error rate, banhammer events
- **Stats**: bytes sent/received, messages by type, timing
- **Connection state**: handshake done, sub-protocol negotiated, etc.

Peer scoring matters: peers that misbehave get evicted. The default scoring penalizes:
- Slow responses
- Invalid messages (bad RLP, wrong hashes)
- Misbehavior (sending old txs repeatedly, claiming to have data they don't have)

## 6. Adding custom sub-protocols

This is the extension point most Reth-based chains use. Need chain-specific gossip — merchant attestations, payment finality hints, sequencer coordination? You ship a sub-protocol:

\`\`\`rust
// In your chain's crate
pub struct TempoSubProtocol {
    // Your state
}

impl SubProtocol for TempoSubProtocol {
    const NAME: &'static [u8] = b"tempo";
    const VERSION: u8 = 1;
    const MESSAGES_COUNT: u8 = 5;

    fn on_message(&mut self, peer: PeerId, msg: Bytes) -> eyre::Result<()> {
        let parsed: TempoMessage = decode(&msg)?;
        match parsed {
            TempoMessage::MerchantAttestation(att) => self.handle_attestation(peer, att),
            TempoMessage::PaymentFinalityHint(hint) => self.handle_hint(peer, hint),
            // ...
        }
    }
}
\`\`\`

Register this with the network manager and your custom protocol runs alongside eth/68 on the same RLPx connections. No new TCP ports, no separate discovery — it rides on the existing peering. Tempo likely uses this pattern for payment-specific gossip.

## 7. The peer scoring opportunity

Default peer scoring is generic — it punishes bad actors. But scoring is also a *steering wheel* for specialized chains:

- **MEV-relevant chains**: score peers based on tx propagation speed
- **Privacy-focused chains**: score peers based on metadata leakage
- **Performance-focused chains**: score peers based on bandwidth + latency

For Tempo: a payment-priority chain might score peers by **whether they're known merchant infra** vs. generic peers. This is a chain-specific networking decision.


## 8. Practice

1. Browse \`crates/net/network/src/manager.rs\` — find the main poll loop
2. Open \`crates/net/eth-wire\` — find the message enum
3. Identify: how would you add a custom message type for payment finality hints?
4. Estimate: how many peers does a typical reth node maintain? How does this scale to 1000+ chains?

> Final check: in one sentence, where in reth would you add a custom sub-protocol for chain-specific gossip? **If your answer doesn't reference NetworkManager or sub-protocol registration, re-read §6.**

## Pass criteria

- Name the six sub-crates under \`crates/net/\` and what each owns.
- Recite the five-pass reading order (network-api → network → eth-wire → peers → discv5).
- Sketch \`NetworkManager\`: three input streams, one dispatcher.
- Walk the Swarm state machine from NewConnection through Disconnected.
- Describe the four pieces inside the peer struct.
- Explain where a custom sub-protocol plugs in (NAME / VERSION / MESSAGES_COUNT / on_message).
- Give two reasons peer scoring is strategic, not just defensive.

## Summary (3 lines)

- Reth's network crate = six sub-crates (~30k lines), centred on \`NetworkManager\` (three inputs, one dispatcher), best read API-surface-first.
- eth-wire uses RLP-derive macros to keep message structs and wire format in lock-step; the peer state machine has four parts and is the substrate for scoring.
- Custom sub-protocols are first-class: same RLPx connection, separate NAME/VERSION namespace. Next lesson builds one for MEV-style messaging.
`,
                },
                {
                  title: 'Lesson 3 — Building custom gossip: MEV-Boost-style messaging on Reth',
                  slug: 'p2p-custom-gossip-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 50,
                  content: `# Lesson 3 — Building custom gossip: MEV-Boost-style messaging on Reth

## Question

You're running a searcher node. You find a profitable bundle → you want it to reach a small set of trusted builders, not the whole mempool. **eth/68 tx gossip assumes a public "everyone relays for everyone" model** and has no concept of "send only to this peer set". **What custom sub-protocol closes that gap?**

## Principle (minimum model)

- **eth/68 makes three assumptions that custom gossip breaks.** Public (anyone connected can see it) + consensus-relevant + every peer cooperates on relay.
- **Custom gossip needs three things.** Private gossip (specific peer sets only) + application-layer routing (capability-based) + custom signing (chain-specific auth).
- **Four production examples.** MEV-Boost bundles (private orderflow) + shared-sequencer pre-confirmations + payment-rail merchant attestations + L2-to-L2 sequencer coordination.
- **\`bundle/1\` protocol has four messages.** Hello (handshake) + BundleAnnounce (hash + expected profit) + BundleRequest (hash + requester signature) + BundleData (encrypted payload).
- **Three discovery patterns for private protocols.** Allowlist (peer IDs hardcoded) + out-of-band invite (peer IDs swapped on Discord / GitHub — the MEV-Boost pattern) + Tor routing (full network-location hiding).
- **MEV-Boost's four roles.** Relayer (sells) + Builder (assembles) + Proposer (picks winner) + sealed-bid auction.
- **Four DoS-mitigation axes.** Announce spam (per-peer rate limit + signature required) + fake bundles (signature checked on request) + bandwidth exhaustion (per-peer caps + eviction) + Sybil (peer-ID allowlist or PoS binding).
- **Custom gossip is a strategic surface, not just a tech detail.** Whoever sees the orderflow first wins the auction — the gossip topology *is* the market structure.

## Worked example + steps

# Building custom gossip — MEV-Boost-style messaging on Reth

You're running a searcher node. You find a profitable bundle. You want to ship it only to a small set of trusted builders — not broadcast it to every peer on the network so the bundle leaks and gets front-run. eth/68 transaction gossip is the wrong tool: it's public, it assumes "everyone relays everything," and it has no concept of "send to *these specific* peers."

That's the gap **custom sub-protocols** fill. This lesson builds a minimal one — a peer-to-peer message bus on top of reth's networking — that lets your application broadcast and receive chain-specific messages on its own rules. Same pattern used by MEV-Boost, private mempools, shared sequencer coordination, and payment-routing infra.


## 1. The motivation — when default gossip fails

eth/68 carries **canonical chain data** — blocks, transactions, receipts. Its assumptions:
- Messages are public (anyone with a connection sees them)
- Messages are about consensus
- Peers cooperate by relaying everything

Custom traffic breaks all three. To ship it you need:
- **Private gossip** — only your peer set sees it
- **Application-layer routing** — route to specific peers based on capabilities
- **Custom signatures** — chain-specific authentication

Where this shows up in production:
- MEV-Boost bundles (private orderflow)
- Shared sequencer pre-confirmations
- Payment rail merchant attestations
- L2 sequencer-to-sequencer coordination

## 2. The minimal custom protocol

You're going to build a protocol called \`bundle/1\`. Its job: peers announce "I have a profitable bundle" and others can request it.

Four message types:

| Message | Purpose |
| :--- | :--- |
| \`Hello\` | Handshake — share what we support |
| \`BundleAnnounce\` | "Hash X is a bundle, ~Y gas to extract" |
| \`BundleRequest\` | "Send me bundle X" |
| \`BundleData\` | The full bundle (encrypted to sender) |

\`\`\`rust
#[derive(Debug, RlpDecodable, RlpEncodable)]
pub enum BundleMessage {
    Hello { protocol_version: u8, peer_capabilities: u64 },
    BundleAnnounce { bundle_hash: B256, expected_profit_gwei: u64 },
    BundleRequest { bundle_hash: B256, requester_signature: Bytes },
    BundleData { bundle_hash: B256, encrypted_payload: Bytes },
}
\`\`\`

## 3. The protocol handler

Implement a Reth-compatible sub-protocol:

\`\`\`rust
use reth_network::SubProtocol;
use std::collections::HashMap;

pub struct BundleProtocol {
    known_bundles: HashMap<B256, Bundle>,
    peer_set: HashSet<PeerId>,
    signer: PrivateKeySigner,
}

impl SubProtocol for BundleProtocol {
    const NAME: &'static [u8] = b"bundle";
    const VERSION: u8 = 1;
    const MESSAGE_COUNT: u8 = 4;

    fn on_handshake(&mut self, peer: PeerId) -> eyre::Result<()> {
        // Authenticate peer is in our allowlist
        if !self.peer_set.contains(&peer) {
            return Err(eyre!("not authorized peer"));
        }
        Ok(())
    }

    fn on_message(&mut self, peer: PeerId, msg: Bytes) -> eyre::Result<Option<Bytes>> {
        let parsed: BundleMessage = decode(&msg)?;

        match parsed {
            BundleMessage::Hello { protocol_version, .. } => {
                tracing::info!(peer = ?peer, version = protocol_version, "peer joined");
                Ok(None)
            }

            BundleMessage::BundleAnnounce { bundle_hash, expected_profit_gwei } => {
                // If we don't have the bundle, request it
                if !self.known_bundles.contains_key(&bundle_hash) {
                    let request = BundleMessage::BundleRequest {
                        bundle_hash,
                        requester_signature: self.signer.sign(&bundle_hash)?.to_bytes(),
                    };
                    Ok(Some(encode(&request)))
                } else {
                    Ok(None)
                }
            }

            BundleMessage::BundleRequest { bundle_hash, requester_signature } => {
                // Verify request signature
                verify_signature(&bundle_hash, &requester_signature)?;

                // Send the bundle
                if let Some(bundle) = self.known_bundles.get(&bundle_hash) {
                    let encrypted = encrypt_for_peer(&peer, bundle.serialize());
                    let response = BundleMessage::BundleData {
                        bundle_hash,
                        encrypted_payload: encrypted,
                    };
                    Ok(Some(encode(&response)))
                } else {
                    Ok(None)
                }
            }

            BundleMessage::BundleData { bundle_hash, encrypted_payload } => {
                // Decrypt and store
                let decrypted = decrypt_from_peer(&peer, encrypted_payload)?;
                let bundle = Bundle::deserialize(&decrypted)?;
                self.known_bundles.insert(bundle_hash, bundle);
                Ok(None)
            }
        }
    }
}
\`\`\`

That's the protocol. ~70 lines for a peer-to-peer bundle marketplace.

## 4. Registering with reth

\`\`\`rust
use reth_node_builder::NodeBuilder;

let bundle_protocol = BundleProtocol::new(allowlisted_peers, signer);

let node = NodeBuilder::new(config)
    .with_components(
        Components::default()
            .add_sub_protocol(bundle_protocol)
    )
    .launch()
    .await?;
\`\`\`

That's it. Your custom protocol runs on the same RLPx connections as eth/68. Peers that support \`bundle/1\` send and receive these messages. Peers that don't are unaffected.

## 5. Peer discovery for private protocols

There's a problem you should be uncomfortable with: default discv5 announces your full capability list. Anyone scanning the network can see "this node supports bundle/1" — which defeats the privacy goal. So private protocols don't use discv5 for peer-finding. Common patterns:

- **Allowlist-based**: hardcode peer IDs of your protocol participants
- **Out-of-band invitation**: have peers exchange contact info via separate channel
- **Tor-routed**: hide network location entirely

MEV-Boost uses the second pattern: bundle relays distribute their peer IDs via Discord, GitHub, etc. The protocol is then point-to-point between known parties.

## 6. The MEV-Boost pattern

[Flashbots' MEV-Boost](https://github.com/flashbots/mev-boost) is the production reference for this whole approach. Its key ideas, mapped to our custom protocol:

| Concept | Implementation |
| :--- | :--- |
| **Relayer-builder separation** | Relayer (publishes "I have a block for sale"), builder (constructs blocks), proposer (picks winning bid) |
| **Sealed-bid auctions** | Builders submit bids; proposer picks highest |
| **Reputation-based** | Builders earn reputation, relayers track abusers |
| **Network-layer trust** | All over private p2p — not on-chain |

For a payment-priority chain like Tempo, an MEV-Boost-equivalent might be:

- **Relayers**: aggregate merchant payment bundles
- **Builders**: construct payment-priority blocks (merchant tx + bundle settlement)
- **Sequencer**: picks the most-profitable + most-merchant-friendly bundle

Could ship in 2026 if Tempo decentralizes its sequencer.

## 7. The DOS protection problem

Custom protocols expose new attack surfaces. Default eth/68 has battle-tested defenses; yours has none until you write them. The minimum:

| Attack | Mitigation |
| :--- | :--- |
| Spam announcements | Rate limit per peer; require signed announcements |
| Fake bundles | Require signature on announce + verify on request |
| Bandwidth exhaustion | Per-peer bandwidth caps; eviction on excess |
| Sybil (many fake peers) | Peer ID allowlist or proof-of-stake binding |

Skip these and your custom protocol is a DOS amplifier — every peer can flood every other peer through your code. Build the protections in alongside the core logic, not as a follow-up.

## 8. For my projects

### Telos (Tempo↔HL intent matching)

Custom gossip would be useful for:
- "I have an intent matching opportunity"
- "Bid X for executing this intent"
- "Proof of intent execution"

These don't fit Ethereum tx semantics. A custom protocol on top of reth's networking is the natural fit.

### mppsol (cross-VM settlement)

Settlement attestations from Tempo to Solana go via CCIP (already covered). But for **intra-Tempo coordination**, custom gossip could:
- Announce pending merchant settlements before they hit the chain
- Coordinate among merchant nodes for HA

### Hyperliquid integration

If you build a node that participates in HL's network, you'd need to understand their custom protocols. They are not public, but the pattern is the same: custom sub-protocols on RLPx-like transport.

## 9. Practice

1. Sketch a 2-message protocol for "broadcast my merchant attestation"
2. Identify: how does the allowlist prevent Sybil attacks?
3. Think: what's the bandwidth cost of broadcasting 1000 messages/sec to 10 peers?
4. Read [MEV-Boost spec](https://github.com/flashbots/mev-boost) and find the relayer protocol

## 10. Reading list

- [reth network crate](https://github.com/paradigmxyz/reth/tree/main/crates/net)
- [MEV-Boost docs](https://docs.flashbots.net/flashbots-mev-boost/introduction)
- [libp2p tutorials](https://docs.libp2p.io/) — for understanding modular networking

> Final check: in one sentence, why is "custom gossip" the natural extension for chain-specific applications like MEV markets and payment routing? **If your answer doesn't reference "default gossip is for canonical chain data only," re-read §1.**

## Pass criteria

- List the three eth/68 assumptions and which ones break for private orderflow.
- Name the three pieces needed for custom gossip and one production system that uses each.
- Walk the four-message \`bundle/1\` handshake and explain why announce/request are separate.
- Compare the three discovery patterns (allowlist / out-of-band / Tor) by trade-off.
- Map MEV-Boost's four roles onto the auction structure.
- Sketch the four DoS-mitigation axes with one mitigation each.
- Explain why gossip topology is also market structure.

## Summary (3 lines)

- Custom gossip = chain-specific messaging that breaks eth/68's three assumptions (Public / Consensus-relevant / everyone-relays). Three building blocks: private peer set + app-layer routing + custom signing.
- \`bundle/1\` shows the canonical shape: Hello + Announce + Request + Data; MEV-Boost's four-role auction is the production reference. Discovery uses allowlists, out-of-band invites, or Tor.
- DoS is mitigated across four axes (announce spam / fake bundles / bandwidth / Sybil). The gossip topology is itself a market structure — the search surface determines who wins.
`,
                },
                {
                  title: 'Quiz — P2P Networking',
                  slug: 'p2p-final-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# Quiz — P2P Networking

## Question

Recap the structural facts of the three lessons: two-layer P2P split, devp2p vs libp2p, NetworkManager + Swarm + peer state machine, and custom-gossip pattern with private peer sets.

## Principle (minimum model)

- **Two-layer recap.** Discovery (discv5 / Kademlia DHT) + Transport (RLPx). Bootstrapping via bootnodes; ENRs as the lookup-result record.
- **devp2p vs libp2p.** devp2p = Ethereum-purpose bundle (discv5 + RLPx + eth/68). libp2p = modular, multi-chain. Reth uses devp2p for historical reasons.
- **reth crate structure.** Six sub-crates under \`crates/net/\`; NetworkManager is the orchestrator (three input streams, one dispatcher).
- **Custom gossip pattern.** Private peer set + app-layer routing + custom signing; runs alongside eth/68 on the same RLPx connection.
- **MEV-Boost shape.** Four roles (Relayer / Builder / Proposer / auction); sealed-bid auction over private orderflow.

## Worked example + steps

# Final quiz: P2P networking

The P2P final check. You'll need this to integrate with custom protocols, build MEV infra, or extend reth's networking.

## Summary (3 lines)

- Five questions covering the three lessons' core structural facts. Gate to the next track.
- Get two or more wrong → re-read the buildup lessons before moving on.
- Pass → advance to the next Advanced track (consensus / sequencer / validator-ops / cross-chain).
`,
                  quizQuestions: [
                    {
                      "question": "What's the **structural difference** between devp2p (Ethereum) and libp2p (Polkadot, IPFS)?",
                      "options": [
                        "devp2p is faster than libp2p.",
                        "devp2p is purpose-built for Ethereum and assumes Ethereum-specific protocols. libp2p is modular, multi-chain — separating transports, encryption, multiplexing into composable pieces. Ethereum doesn't use libp2p mostly for historical reasons; devp2p existed first.",
                        "devp2p only works with Solana, libp2p only works with Ethereum.",
                        "libp2p doesn't support peer discovery."
                      ],
                      "correctIndex": 1,
                      "explanation": "Two different design philosophies: purpose-built (devp2p) vs modular (libp2p). Both work; both have trade-offs. Ethereum execution layer uses devp2p; consensus layer (Lighthouse) uses libp2p. For Reth-based chains, devp2p is the natural inheritance."
                    },
                    {
                      "question": "**discv5** uses Kademlia DHT. **Why is Kademlia chosen for peer discovery instead of just having a central directory?**",
                      "options": [
                        "Kademlia is faster than centralized.",
                        "Centralized directories are single points of failure and censorship; Kademlia is decentralized — every node helps others discover peers, no single party controls the network. The trade-off is O(log N) lookups vs O(1), but with the security/decentralization gain.",
                        "Kademlia is more memory-efficient.",
                        "There is no other option."
                      ],
                      "correctIndex": 1,
                      "explanation": "Centralized = single point of failure for censorship/manipulation. Kademlia = decentralized but more complex. For a permissionless blockchain network, decentralization wins over efficiency. The slight latency cost is acceptable for the security benefits."
                    },
                    {
                      "question": "In eth/68, **transactions are announced as hashes first**, not full bodies. **Why?**",
                      "options": [
                        "Hashes are smaller.",
                        "Most peers already have most txs (they've seen them propagate). Announcing as hash, then requesting only what you don't have, **avoids re-broadcasting every tx to every peer at full size**. Saves enormous bandwidth at network scale.",
                        "Full tx bodies are encrypted, hashes are not.",
                        "Hash announcement is required by EIP-1559."
                      ],
                      "correctIndex": 1,
                      "explanation": "Bandwidth optimization. If a tx propagates through the network, every peer sees the hash quickly. They only request the full body if they don't have it. This drops total network bandwidth by ~10x compared to broadcasting full txs. Critical for scaling."
                    },
                    {
                      "question": "**Reth's NetworkManager** is the central orchestrator. What 3 streams does it poll?",
                      "options": [
                        "CPU, memory, disk.",
                        "Swarm (peer messages from active connections), Discovery (newly discovered peers from discv5/DNS), from_handle_rx (commands from app code — broadcast tx, request block, etc.).",
                        "RPC, WebSocket, IPC.",
                        "Block, transaction, receipt."
                      ],
                      "correctIndex": 1,
                      "explanation": "The central event loop combines 3 input streams: external traffic (Swarm), new peers (Discovery), app commands (handle channel). NetworkManager polls all 3 and dispatches. This is the heart of Reth's networking."
                    },
                    {
                      "question": "To add **custom gossip** to a Reth-based chain (e.g., for MEV bundle marketplace), what's the architectural approach?",
                      "options": [
                        "Modify eth/68 to add new message types.",
                        "Implement a **custom sub-protocol** that runs on the same RLPx connections as eth/68. Define your message enum (RLP-encoded), implement the SubProtocol trait, register with NetworkManager. Custom protocol runs alongside without interfering with eth/68.",
                        "Fork reth and add your protocol to the core.",
                        "Use libp2p instead of devp2p."
                      ],
                      "correctIndex": 1,
                      "explanation": "Sub-protocol pattern: reth's networking is extensible by design. You add your protocol as a peer; multiple peers can share an RLPx connection. eth/68, snap (state sync), and your custom protocol all run side-by-side. The infrastructure scales."
                    },
                    {
                      "question": "**Peer scoring** in Reth penalizes bad behavior. What's the **proactive use case** that bad behavior detection misses?",
                      "options": [
                        "There is no proactive use.",
                        "Peer scoring can also be used to **prioritize specific peers**: a sequencer might score known-good merchant infrastructure higher than random peers, ensuring better service or lower latency for those flows. This shifts peer scoring from defensive (block bad) to strategic (route good).",
                        "Proactive scoring is a marketing concept, not technical.",
                        "Peer scoring is only relevant for full nodes."
                      ],
                      "correctIndex": 1,
                      "explanation": "Default scoring is reactive (drop bad peers). For specialized chains, scoring becomes strategic — you can route MEV-relevant info to known builders, payment data to merchant nodes, etc. This is the Reth extension point for chain-specific networking strategy."
                    },
                    {
                      "question": "Why are **custom gossip protocols** needed for things like MEV-Boost when **default eth/68 transaction gossip** already exists?",
                      "options": [
                        "Custom gossip is faster than eth/68.",
                        "eth/68 is for canonical chain data (blocks, txs, receipts) and assumes public-by-default + cooperative-relay. MEV-Boost needs **private routing** (only certain peers see bundles), **application-layer auctions** (bundle pricing), and **out-of-protocol authentication** (relayer identity). These are application concerns that don't fit on-chain semantics.",
                        "MEV-Boost requires HTTPS and eth/68 doesn't support it.",
                        "Custom gossip is mandated by the EVM spec."
                      ],
                      "correctIndex": 1,
                      "explanation": "eth/68 is the wrong abstraction for non-chain messages. Custom protocols give you private routing, application-layer signaling, and chain-independent semantics. MEV-Boost, shared sequencer coordination, payment-rail routing all live here."
                    }
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
