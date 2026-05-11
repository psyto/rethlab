import { PrismaClient } from '@prisma/client';

export async function seedRethValidatorOpsEN(prisma: PrismaClient) {
  const tags = ['reth', 'validator', 'hsm', 'mpc', 'slashing', 'hot-upgrade', 'ops', 'l1', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-validator-ops-en',
      title: 'Validator Operations — Keys, Slashing, and Coordinated Upgrades',
      description:
        "The operational layer between writing consensus code and running consensus in production. Validator key management (hot keys, HSM, MPC, threshold signatures), slashing detection and double-signing prevention, and coordinated hardfork upgrades. The skills that turn a working consensus implementation into a production L1 that doesn't lose its operators' stake.",
      difficulty: 'EXPERT',
      duration: 110,
      xpReward: 350,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 340,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Validator Operations',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Validator key management — hot keys, HSM, MPC, threshold signatures',
                  slug: 'validator-keys-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# Validator key management — hot keys, HSM, MPC, threshold signatures

A validator's signing key is its **economic identity**. Lose the key → lose your stake. Leak the key → an attacker can double-sign → slashing → lose your stake. Reuse the key → same. This lesson is the operational reality of running validators: how production teams keep keys safe, what fails when they don't, and the cryptographic primitives that make scaling validator sets possible.

> 🛑 **Predict before scrolling.** A validator runs 100 nodes. **How many copies of the signing key exist?** If your first instinct is "1 (the original) + 100 (running)," what attack does that allow?

## 1. The validator key threat model

A validator key must:
- **Sign blocks/attestations** when it's the leader/voter
- **Never sign two different messages at the same height/round** (slashing)
- **Never be exposed** to the open internet
- **Survive operator turnover** (you'll have multiple ops people)
- **Survive disasters** (hardware failure, data center loss)

Each of these is a separate security challenge. **No single solution solves all of them.**

## 2. The four solutions, in order of sophistication

### 2.1 Hot key in a config file

\`\`\`bash
# This is dangerous
echo "0xabc123..." > /var/lib/validator/key.txt
\`\`\`

Pros: simple, works.
Cons: Anyone with file system access has the key. Backup = clone of key.

**Used in development, not production for valuable validators.**

### 2.2 HSM (Hardware Security Module)

A HSM is **a physical device that holds the private key and signs without exposing it**. AWS CloudHSM, YubiHSM, or dedicated boxes from vendors like Thales.

Workflow:
1. Validator generates key inside HSM
2. Public key is exposed; private key never is
3. To sign: validator software sends hash to HSM; HSM returns signature
4. If validator software is compromised, attacker can sign anything **valid** but not steal the key

Pros: Key never on disk, never in memory of validator process.
Cons: Single device; physical loss = key loss. Backup is hard.

**Used by professional validators (Ledger Enterprise, Fireblocks, etc.) for ETH staking pools.**

### 2.3 MPC (Multi-Party Computation)

The key is **split across multiple devices**. Signing requires N-of-M cooperation. No single device ever has the full key.

Example: 3 devices in 3 data centers. To sign, 2 of 3 cooperate. If 1 device is compromised, attacker has 1/3 of the key — useless. To get 2/3, you'd need to compromise 2 separate facilities.

Pros: No single device holds the key.
Cons: Requires cooperation = latency on every signature. Complex protocol.

**Used by very large staking operations (Fireblocks, Coinbase Cloud, etc.).**

### 2.4 Threshold signatures (the cryptographic version of MPC)

Same idea as MPC but using **threshold signature cryptography**. Each device holds a "share" of the key. Signing produces a normal-looking signature without ever reconstructing the full key.

BLS threshold signatures are the standard for Ethereum-style PoS:
- Each validator has a share of the aggregate signing key
- Block signing aggregates partial signatures into one final signature
- Verifiers don't know it's a threshold signature — they just see a standard BLS sig

Pros: Cryptographically clean. No "reconstruction" step.
Cons: Complex setup, key generation ceremony required.

**Used by Ethereum's beacon chain validators with multi-node setups, and by chains like Aleo, Filecoin, etc.**

> 🛑 **Anti-fluency.** "MPC is the same as threshold signatures." **Wrong.** They're different. State the difference. (Hint: one is a protocol over arbitrary signatures, the other is a cryptographic property.)

MPC is a **general protocol** to compute functions over secret shares without revealing them — works for any function, including signing. Threshold signatures are a **specific cryptographic primitive** where signature schemes natively support secret-sharing. Threshold sigs are cleaner; MPC is more flexible.

## 3. The "two-keys" pattern

Most production validators separate:

- **Withdrawal key** (cold): controls the staked funds. Held offline (paper, hardware wallet)
- **Signing key** (hot): controls voting/proposing. Held online, slashable

The pattern: if the signing key gets compromised, the attacker can **slash** the validator (cost: hot stake) but **cannot steal** funds (withdrawal key is cold). Loss is bounded.

For Ethereum:
- Withdrawal credentials (0x01...): cold storage
- Validator key (BLS): online for attestations and proposals

For Hyperliquid:
- Validator signing key: online
- Reward/withdrawal key: cold

## 4. The slashing-prevention checklist

You must guarantee:
1. **Single signer per identity** — never run two processes with the same key
2. **Slashing-protection database** — track every signed message, refuse to sign anything that would cause slashing
3. **Fail-closed on uncertainty** — if you can't verify recent history, don't sign
4. **Network partition tolerance** — if you're behind a partition and lose sync, don't sign (you might be on a fork)

\`crates/ethereum/blockchain-tree\` in reth has slashing-protection logic for Ethereum PoS. Custom L1s need their own (Cosmos uses CometBFT's; Solana uses gulp-style ledger replay).

> 🛑 **Predict.** A validator runs duplicate processes on two machines for redundancy. **What's the slashable offense waiting to happen?** Walk through the failure scenario.

Both machines have the same key. Both sign the same epoch's attestation. One is the canonical. The other gets seen by the network as a **double-signing event**. Slashed. The redundancy attempt becomes the slashing offense.

The fix: **active-passive** with strict failover (only one node has signing authority at a time, transitions via consensus protocol).

## 5. The remote signer pattern

Production validators often use **remote signers**:

\`\`\`
[Validator node] --signs blocks via API-->  [Remote signer with HSM]
                                                  |
                                                  +--Tracks signed messages
                                                  +--Refuses dangerous signs
                                                  +--Holds the key in HSM
\`\`\`

The validator node never has the key. It connects to a remote signer service that does the actual signing. The remote signer enforces slashing-protection (it refuses to sign two conflicting messages).

Production implementations:
- **Web3Signer** (Ethereum) — Java-based remote signer
- **Eth-Signer** — Rust alternative
- **Tetuna** — slashing-protection database

For Tempo or Hyperliquid: similar pattern. Validators run their consensus node + a remote signer; key is in HSM.

## 6. Multi-region deployment

To survive a data center loss:
- **Active validator in DC1** (signs blocks)
- **Standby in DC2** (ready to take over)
- **Cold backup in DC3** (DR)

The transition between active and standby is the hardest part. **It cannot be automatic** — risk of both signing simultaneously. Usually:

1. Active signs block N
2. Active confirms block N propagated and finalized
3. Manual operator confirms shutdown
4. Standby takes signing authority
5. Standby signs block N+1

For BFT chains with view changes, the cost is a missed slot. For Nakamoto-style chains, even less impact.

## 7. For Hiro's projects

### Tempo validator operation

If Tempo decentralizes and you become a validator:
- HSM for signing key
- 3-region active-passive setup
- Slashing-protection database integrated with consensus client
- Withdrawal key on dedicated hardware wallet, offline

This is the **launch operational checklist** for any L1 validator role.

### Soltempo / mppsol relayer operations

Relayers in CCIP, soltempo, mppsol use their own keys. Same principles apply:
- Don't expose keys in code
- Use HSM or similar for production
- Rotate keys periodically
- Have backups

## 8. Practice

1. Compute: if 3 nodes use BLS threshold signing with t=2, how many compromised nodes can still sign? How many before they can sign without consent?
2. Read [Web3Signer docs](https://docs.web3signer.consensys.net/) — slashing-protection section
3. Identify: what's the slashing risk if you migrate to a new HSM during operation?

## 9. Reading list

- [EIP-2335 (BLS keystore)](https://eips.ethereum.org/EIPS/eip-2335)
- [Web3Signer](https://github.com/Consensys/web3signer)
- [Cosmos validator security](https://hub.cosmos.network/main/validators/security.html)

> Final check: in one sentence, why is "having backups of the signing key" a slashing vulnerability rather than a feature? **If your answer doesn't include "duplicate signers can produce slashable equivocations," re-read §4.**`,
                },
                {
                  title: 'Slashing detection and the offline validator',
                  slug: 'validator-slashing-detection-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Slashing detection and the offline validator

A validator's most expensive mistake is **signing two conflicting messages** — a slashable offense that costs them stake. The second-most-expensive is **going offline during high participation** — an inactivity penalty. This lesson is about how to detect and prevent both, and how watchers earn whistleblower rewards by finding slashable evidence.

> 🛑 **Predict before scrolling.** A validator goes offline for 2 days. **How much do they lose?** What if they go offline during a partition that takes a third of validators with them?

## 1. The two ways to lose stake

| Way | What | Why |
| :--- | :--- | :--- |
| **Active misbehavior (slashing)** | Sign 2 conflicting messages | Cryptographically provable; major penalty |
| **Passive misbehavior (inactivity)** | Don't sign at all | Eroding penalty during partitions |

Both are protocol-enforced. Both reduce your stake. The key difference: slashing is **catastrophic** (lose much/all of stake in one event), inactivity is **slow** (lose small amounts over time).

For Ethereum mainnet (2026 parameters approx):
- Slashing: ~1 ETH minimum, scales up with correlated slashing
- Inactivity leak: ~0.1% of stake per day of non-participation during finality issues

## 2. Slashable offenses, in detail

### 2.1 Double voting

Two votes for the same height with different blocks:

\`\`\`
Vote1: { height: 1000, block: 0xA..., signature: SigA }
Vote2: { height: 1000, block: 0xB..., signature: SigB }
\`\`\`

If both votes are valid and both are signed by validator V, V is slashable. **Anyone with both signatures can construct a slashing proof.**

The fix: validator software MUST track every signed vote and refuse to sign a second vote for the same height. This is the **slashing-protection database**.

### 2.2 Surround voting (Casper FFG specific)

Vote1: source A → target B
Vote2: source C → target D

If C > A and B > D (the second "surrounds" the first), this is slashable. The fix: track every voted source/target pair; reject votes that would surround prior votes.

### 2.3 Equivocation in BFT (Tendermint, HotStuff)

Two pre-commits for the same height/round but different blocks. Same logic as double voting; the slashing-protection database must catch it.

## 3. The slashing-protection database

Every production validator runs one. Its job:

\`\`\`
Before signing message M at height H, round R:
  if any prior signed message exists at (H, R) with different content:
    REFUSE to sign  → no slashing event
  else:
    sign M
    record M in database
\`\`\`

The database must:
- Persist across restarts
- Survive software updates
- Be backed up (so a fresh database doesn't fall behind reality)

Common implementations:
- **EIP-3076 format** — standard for Ethereum
- **CometBFT priv_validator_state.json** — Cosmos chains
- **Custom files** — chain-specific formats

## 4. The remote signer integration

Most production validators run a remote signer that **also** enforces slashing-protection:

\`\`\`
[Validator node]  --request to sign-->  [Remote Signer]
                                            |
                                            +- Check slashing-protection DB
                                            +- If safe: sign + record
                                            +- If unsafe: refuse
\`\`\`

This gives **defense in depth**. The validator node might have a bug, but the remote signer's database is the final check. **Even if the validator node tries to double-sign, the remote signer refuses.**

Web3Signer (Ethereum) implements this. CometBFT validators have their own variant.

> 🛑 **Anti-fluency.** Why does the slashing-protection DB need to be **on the same machine as the signer**? Can it be remote (network call)? If your answer doesn't reference "atomicity" or "network failure during signing," reread §3-4.

The DB and signer must commit in **one atomic operation**. If you sign, then try to record but the network fails, you've signed without recording — and on retry you might sign again. Atomicity = both succeed or neither. Network-remote DBs add a window where atomicity is broken.

## 5. Whistleblower watchers

Slashing is **cryptographically provable** — anyone with the two conflicting signatures can submit a slashing transaction. Most chains pay a small fraction of the slashed stake to the submitter as a **whistleblower reward**.

For Ethereum: ~1/512 of the slashed amount goes to whoever submitted the proof. For a major slashing of $1M, that's ~$2k — enough to incentivize watchers.

Watcher implementations:
- Scan blockchain for attestations
- Index by (validator, height, round)
- Detect conflicts
- Submit slashing tx

If you're building a watcher: it's open-source territory, similar to MEV searchers but for protocol-level violations.

## 6. The offline validator — inactivity penalty

If a validator is offline:
- During normal operations: they miss rewards (small daily loss)
- During finality issues (>1/3 offline): **inactivity leak** kicks in

Inactivity leak: every epoch, offline validators lose stake. The rate increases the longer finality remains delayed. **The chain self-heals** — eventually online validators are >2/3 and finality resumes, leaving offline ones with reduced stake.

This is **the BFT-style chain's response to mass offline events**. Instead of halting forever, the protocol slowly removes offline validators until quorum is achievable.

## 7. The Network Partition Risk

The classic disaster:
1. Network partition splits validator set
2. Each partition might think they're the majority
3. Each might continue signing on different forks
4. When partition heals: massive cross-fork slashing

Mitigations:
- **Liveness watchdog**: detect partition (no recent blocks from peers); stop signing
- **Network heartbeat**: verify connectivity to other validators before signing
- **Forced sync**: refuse to sign until catching up with the network

A well-built validator has multiple of these checks. Compromised validator software (where these checks are disabled) is a real risk.

> 🛑 **Predict.** Your validator is in DC1. DC1 loses internet for 30 minutes. **Should the validator continue signing?** What are the failure modes if it does? What if it doesn't?

If it continues signing: it might be on a partition and producing blocks the rest of the network doesn't see. Eventually network heals, the validator's chain is the wrong one, double-sign equivalent → slashed.

If it stops signing: 30 minutes of inactivity (small penalty). When connection restores, sync up and resume.

**Stop signing is correct.** Lose a tiny inactivity penalty rather than risk slashing. The validator software should automatically detect this and fail-closed.

## 8. For Hiro's projects

### Tempo validator if you operate

- Slashing-protection DB on each validator node + remote signer
- 30-minute heartbeat check; refuse to sign if connectivity lost
- 2-region active-passive (transition only via consensus protocol)
- Daily DB backup to S3 with versioning

### Watcher opportunity

There may be a market for slashing watchers on Tempo (assuming it has slashing on launch). Building a watcher is ~few hundred lines of Rust + indexing — could be a small income stream.

## 9. Practice

1. Compute: validator with 1000 ETH stake. Slashed by 5% via double-vote. How much do they lose?
2. Identify: if validator A is online with 95% participation, validator B is offline. After 1 month, which has more stake?
3. Write pseudo-code for slashing-protection logic
4. Read [Web3Signer slashing protection](https://docs.web3signer.consensys.net/concepts/slashing-protection)

## 10. Reading list

- [EIP-3076 (slashing protection format)](https://eips.ethereum.org/EIPS/eip-3076)
- [Web3Signer](https://github.com/Consensys/web3signer)
- [Inactivity leak design](https://eth2book.info/altair/part2/incentives/inactivity)

> Final check: in one sentence, why is "stop signing if uncertain" the correct default for a validator? **If your answer doesn't reference "slashing > inactivity penalty," re-read §7.**`,
                },
                {
                  title: 'Hot upgrades and coordinated chain upgrades',
                  slug: 'validator-hot-upgrades-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 16,
                  xpReward: 45,
                  content: `# Hot upgrades and coordinated chain upgrades

An L1 with a fixed validator set needs to **upgrade in place** — switch consensus rules, change parameters, fix bugs — without halting. This is the **hardest operational problem in blockchains** because validators must coordinate exactly: if some upgrade and others don't, you fork. This lesson covers the protocol mechanisms and operational drills that make hot upgrades work.

> 🛑 **Predict before scrolling.** Ethereum has executed 10+ hardforks without major outages. **What's the protocol mechanism that makes this work?** It's not "everyone upgrades at the same time" — that's impossible to coordinate. Something stronger.

## 1. The core mechanism — height-gated rules

A hardfork is defined by:
- A **block height (or timestamp)** at which new rules activate
- A **set of new rules** (consensus, EVM, gas, etc.)

Validators don't all upgrade simultaneously. They upgrade **before** the activation height. Then at the activation block, all upgraded validators apply the new rules. Validators who haven't upgraded continue with old rules — they **fall off**, producing blocks the rest of the network rejects.

\`\`\`
Block 999: All validators (old + new code) accept this block
Block 1000: Activation point
Block 1001: Old code validators reject this (it follows new rules);
           new code validators accept it
\`\`\`

After activation, the chain follows the new rules. Old code is **explicitly invalid**.

## 2. The activation conditions

Activation is typically:

| Type | Use case | Risk |
| :--- | :--- | :--- |
| **Block height** | Deterministic activation | Easy; works on PoW and PoS |
| **Timestamp** | Wall-clock activation | Less precise; protocol can drift |
| **Difficulty** (PoW) | Historical Ethereum | Outdated |
| **Total difficulty** | Ethereum's Merge transition | One-time use |

Modern PoS chains use **timestamp** for human-readability and **block height** for precision. Casper FFG uses **epoch boundary**.

For Tempo or Hyperliquid: timestamp-based activation. "At Unix timestamp X, switch to fork Y."

## 3. The upgrade coordination protocol

Operators must:
1. **Receive the upgrade announcement** (Github issue, Discord, etc.)
2. **Download and verify the new binary**
3. **Deploy to all validator nodes** before activation
4. **Verify the deployment** is correct
5. **Wait for the activation block** — the new rules apply automatically

If any validator misses step 3, they **fall off the chain** at activation. They can rejoin by upgrading and syncing back up.

For Ethereum: this is exactly how Merge, Shanghai, Cancun, Pectra activations worked. Validators have 1-2 weeks of warning to upgrade.

> 🛑 **Anti-fluency.** "If 99% of validators upgrade and 1% don't, the chain forks." **Yes, but...** What happens to the 1%? Do they ever come back? Trace the recovery scenario.

The 1% produce a "stale fork" with old rules. The 99% follow the canonical chain with new rules. From the perspective of the 99%, the 1% are simply offline (their blocks are rejected). To recover:
1. Operator notices "my validator is producing rejected blocks"
2. Upgrades the binary
3. Validator syncs to the canonical chain (gets blocks from peers)
4. Resumes signing on the canonical chain

No slashing risk (they were on a different fork, not double-signing on the canonical one). Just inactivity penalty.

## 4. The upgrade is in the chain spec

For a Reth-based chain, upgrades are encoded in **chain spec**. From Lesson 5 of Course 1 (Consensus Engineering):

\`\`\`rust
pub enum CustomHardfork {
    Bedrock,
    Canyon,
    Ecotone,
    // ...
}

impl CustomHardfork {
    pub fn activation_block_number(&self, chain: &CustomChain) -> Option<u64> {
        match (self, chain) {
            (Self::Bedrock, CustomChain::Mainnet) => Some(105_235_063),
            (Self::Canyon, CustomChain::Mainnet) => Some(125_000_000),
            // ...
        }
    }
}
\`\`\`

When the chain spec ships in a new binary version, validators upgrading to that version get the new activation table. At the activation block, the new rules kick in.

**The chain spec IS the upgrade**.

## 5. Pre-fork dry runs

Production chains run upgrades on **testnets first**:
- Hold mainnet activation 2-3 weeks out
- Run the same fork on testnet
- Validate everything works
- If issues found, delay mainnet

This catches bugs that would otherwise be catastrophic. Ethereum's Pectra fork delay (twice) was due to testnet issues caught during dry runs.

For Tempo: there's likely Tempo Moderato (testnet) for exactly this. The fork sequence goes Moderato → Mainnet, with weeks between.

## 6. Hot software updates (vs hot fork)

Two different things:

- **Hot fork** = upgrade consensus rules. This is what we've been discussing.
- **Hot software update** = upgrade validator software without restart. This is operational.

For hot software updates:
- Validator software is restarted with new version
- During restart, it's offline (small inactivity penalty)
- New version continues from prior chain state

Most chains accept that **a brief restart is fine**. The slashing-protection database survives the restart, so no risk of double-signing.

Some advanced setups use:
- **Active-passive failover** — restart passive node first, then transition signing authority, then restart active node
- **Live code patching** — extremely rare; only for performance fixes that can't tolerate downtime

## 7. The emergency response playbook

What if a bug is discovered **after deployment**?

| Severity | Response |
| :--- | :--- |
| **Stale blocks** | Wait — chain self-heals when peers come back |
| **Bug producing incorrect state** | Coordinated rollback (validators agree to abandon a chain segment) |
| **Stealing-funds bug** | Emergency hardfork to disable functionality |
| **Consensus halt** | Coordinated reset (rare; major event) |

The 2016 DAO incident was a coordinated hardfork to recover stolen funds. The 2024 incident on Polkadot (validator misbehavior) was a coordinated rollback. Each of these had ~24 hour response cycles.

For Tempo: there will eventually be incidents. The validator set + governance must have a documented playbook before launch.

## 8. The "halt and recover" pattern

For purely BFT chains (Tempo, Hyperliquid):
- If >1/3 validators go offline, chain halts (BFT property)
- Operators bring validators back online
- Chain resumes producing blocks

Compared to Ethereum (which has inactivity leak to recover from): BFT chains have a cleaner halt-and-recover. **Halt is acceptable** because the chain doesn't fork or lose safety; it just stops.

For Tempo: this means **outages are by design** during big incidents. Better halt than fork.

## 9. Practice

1. Read [Ethereum's Pectra upgrade announcement](https://eips.ethereum.org/EIPS/eip-7600)
2. Identify: what's in the EIP for activation logic?
3. Sketch: your validator setup for an L1 upgrade. What's the deployment sequence?
4. Identify: under what circumstances would you delay a fork activation?

## 10. Reading list

- [Ethereum hardfork list](https://ethereum.org/en/history/) — see how forks have been coordinated
- [Ethereum execution-apis EngineAPI](https://github.com/ethereum/execution-apis) — how EL/CL coordinate fork activation
- [Cosmos chain upgrade docs](https://docs.cosmos.network/v0.50/learn/advanced/upgrade)

> Final check: in one sentence, why is "all validators upgrade at the exact same time" the wrong mental model for a hardfork? **If your answer doesn't reference "height-gated rules in the chain spec," re-read §1-2.**`,
                },
                {
                  title: 'Final quiz: validator operations',
                  slug: 'validator-final-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# Final quiz: validator operations

The validator ops final check. You'll need this to operate any validator, design L1 economics, or understand why production chains fail.`,
                  quizQuestions: [
                    {
                      question: "Why is **MPC (Multi-Party Computation)** for validator keys structurally different from just **distributing a key across N hosts**?",
                      options: [
                        "MPC is faster.",
                        'MPC ensures **no single device ever has the full key** — each holds a share, signing requires N-of-M cooperation, attacking one device gives the attacker a useless fraction. Distributing a key across N hosts means N hosts each have the full key (or pieces that can be reconstructed) — attacking any one is catastrophic.',
                        'MPC is required by EIP-2335.',
                        "MPC uses less storage.",
                      ],
                      correctIndex: 1,
                      explanation: "MPC is cryptographically guaranteed not to reconstruct the key during signing. Distributed keys (poorly designed) leak full keys to multiple hosts. MPC is one of the few ways to genuinely scale validator key security without single points of trust.",
                    },
                    {
                      question: "Why does running **duplicate validators on two machines** typically result in **slashing**, not redundancy?",
                      options: [
                        'Slashing is unrelated to validator setup.',
                        'Both machines have the same key. Both sign attestations for the same height/round. Both signatures are valid. The network sees two conflicting signatures from the same identity — **slashable equivocation**. The redundancy attempt becomes the slashing offense.',
                        'Two-machine setups are forbidden by Ethereum spec.',
                        "Duplicate validators consume too much bandwidth.",
                      ],
                      correctIndex: 1,
                      explanation: 'This is the classic "trying to be careful, getting slashed" outcome. The fix is active-passive with strict failover (only one node ever has signing authority at a time, transition via consensus protocol). Even better: remote signer architecture where the key holder enforces single-signing at the protocol level.',
                    },
                    {
                      question: "Why is the **slashing-protection database** required to be on the **same machine as the signer**?",
                      options: [
                        'For latency reasons only.',
                        "The DB write and the signing operation must be **atomic** — either both succeed or neither. A network-remote DB introduces a window where you sign first but DB update fails (e.g., network glitch), then retry could sign again. Atomicity is required to prevent double-sign on retry.",
                        'Required by EIP-3076 specifically.',
                        "Network calls are too slow.",
                      ],
                      correctIndex: 1,
                      explanation: 'Atomic operation requirement. Local DB + signer in one process = atomic. Remote DB = race condition. The "atomic" guarantee is the entire security model of slashing-protection.',
                    },
                    {
                      question: 'A validator is offline during a network partition. **Should it continue signing when partition heals?**',
                      options: [
                        'Yes, immediately resume signing.',
                        "**No, stop signing during partition.** If it continues signing, it might be on a fork and producing blocks the rest of the network doesn't see. When the network heals, the validator's chain is wrong → equivocates with canonical chain → slashed. Better to lose inactivity penalty (small) than slashing penalty (large).",
                        "Stop signing only if the operator says so.",
                        'Signing during partition is impossible.',
                      ],
                      correctIndex: 1,
                      explanation: 'Stop-signing is the correct default. Inactivity penalty is tiny; slashing penalty is large. The validator must detect "I might be on a partition" and refuse to sign until it can verify connectivity to >2/3 of peers. This is "fail-closed on uncertainty" — a core safety property.',
                    },
                    {
                      question: 'In a coordinated hardfork, **why do validators not all upgrade simultaneously**? What ensures they all switch to new rules at the right moment?',
                      options: [
                        'Hardforks require manual coordination via a chat room.',
                        'The chain spec encodes **activation block height (or timestamp)**: at that block, the new rules apply. Validators upgrade *before* the activation — they could be early or late. At the activation block, new rules become consensus-enforced. Validators who haven\'t upgraded continue with old rules and fork off; they can rejoin by upgrading and syncing.',
                        'Forks are triggered by majority vote at runtime.',
                        'Only Ethereum supports hardforks.',
                      ],
                      correctIndex: 1,
                      explanation: 'Height-gated rules are the magic. Operators have weeks to upgrade individually. At the activation block, everyone runs the same rules — those who don\'t fall off. Recovery is straightforward (upgrade + sync). This is how every major chain coordinates upgrades.',
                    },
                    {
                      question: 'Why does the **withdrawal key** stay cold while the **signing key** stays online?',
                      options: [
                        "Cold storage is mandatory for all keys.",
                        "Separation of concerns. The signing key needs to be online for attestations/proposals (slashable if leaked → at worst lose hot stake). The withdrawal key controls the actual staked funds — keeping it cold means even if a signing key is compromised, the funds can't be moved by the attacker.",
                        'Withdrawal keys are required to be cold by EIP-2335.',
                        "Hot keys cannot be used for withdrawals.",
                      ],
                      correctIndex: 1,
                      explanation: 'Defense in depth. Worst case if signing key is leaked: validator gets slashed. The full staked balance is still safe because the withdrawal credential is cold. This is the standard for serious validator setups; without it, a key leak is catastrophic.',
                    },
                    {
                      question: 'What\'s the **whistleblower reward** in PoS chains, and what does it enable?',
                      options: [
                        "A fixed daily payment to all validators.",
                        "When someone submits a slashing proof (the two conflicting signatures), they get a small fraction (typically ~1/512) of the slashed stake. This creates an economic incentive for **independent watchers** to monitor the chain and submit slashing proofs — enforcing the protocol without requiring everyone to do so. Permissionless enforcement.",
                        'A bonus paid to validators who maintain perfect uptime.',
                        'A penalty for late attestations.',
                      ],
                      correctIndex: 1,
                      explanation: 'Whistleblower rewards turn slashing detection into an economic game. Anyone can profit by spotting double-signs. This means the protocol\'s integrity isn\'t dependent on a central party — anyone watching can enforce. Critical for permissionless decentralization.',
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
