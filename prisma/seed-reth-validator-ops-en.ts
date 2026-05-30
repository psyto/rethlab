import { PrismaClient } from '@prisma/client';

export async function seedRethValidatorOpsEN(prisma: PrismaClient) {
  const tags = ['validator', 'ops', 'slashing', 'hardfork', 'advanced'];

  await prisma.course.create({
    data: {
      slug: 'reth-validator-ops-en',
      title: 'Validator Operations — Keys, Slashing, and Coordinated Upgrades',
      description:
        'The validator-operations triangle for production teams: key management (config file → HSM → MPC → threshold sigs + the two-key pattern), slashing avoidance (DB + fail-closed under partition), and coordinated chain upgrades (height-gated chain spec, four emergency tiers). By the end you can defend a validator stack from the three failure modes that actually take operators down at 3 AM.',
      difficulty: 'ADVANCED',
      duration: 60,
      xpReward: 170,
      track: 'reth-validator-ops',
      tags,
      isPublished: true,
      sortOrder: 1440,
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
                  title: 'Lesson 1 — Validator key management: hot keys, HSM, MPC, threshold signatures',
                  slug: 'validator-keys-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# Lesson 1 — Validator key management: hot keys, HSM, MPC, threshold signatures

## Question

It is 3 AM. The staking operator gets paged. A second validator process accidentally started on the standby box — same key, both online, both signed an attestation at the same height. The network sees two valid signatures from the same identity → **equivocation** → $2 M penalty. **The validator signing key is the validator's economic identity. How do production teams protect it?**

## Principle (minimum model)

- **Five requirements that no single solution satisfies.** Can sign + never signs twice at the same height/round + not exposed on the public internet + survives operator turnover + survives disaster (HW failure / DC loss).
- **Four solutions, ordered by sophistication.** Config-file hot keys (dev only) → HSM (tamper-resistant hardware, key never leaves) → MPC (split across N-of-M devices) → threshold signatures (BLS, cryptographic share, no reconstruction required).
- **MPC ≠ threshold signatures.** MPC = general-purpose protocol (compute any function over secret shares) / threshold signatures = a specific cryptographic primitive (the signature scheme itself supports secret-sharing natively).
- **The "two keys" pattern.** Withdrawal key (cold, controls stake funds) + signing key (hot, votes / proposes / slashable). **Blast radius is bounded:** even if the signing key leaks, the funds can't be moved (only slashed).
- **Four anti-slashing rules.** Exactly one signer per identity + slashing-protection DB + fail-closed under uncertainty + survives network partition.
- **Remote-signer pattern.** The validator node holds no keys → it asks the remote signer → the HSM signs after enforcing slashing protection. Web3Signer / Eth-Signer / Tetuna are production examples.
- **Multi-region active-passive.** DC1 active + DC2 standby + DC3 cold backup. **Transition is manual + only via consensus** (to avoid both signing at the same time).

## Worked example + steps

# Validator key management — hot keys, HSM, MPC, threshold signatures

A staking operator gets paged at 3 AM. A second validator process accidentally started on the standby box — same key, both online, both signing attestations at height 9,801,442. By the time anyone notices, the network has already seen two valid signatures from one identity. That's **equivocation** (the consensus term for signing two conflicting messages at the same slot), and the protocol slashes them for it. They wake up to a $2M penalty for a duplicate process.

A validator's signing key is its **economic identity**. Lose it → lose your stake. Leak it → attacker double-signs → slashing → lose your stake. Reuse it → same. This lesson is the operational reality: how production teams keep keys safe, what fails when they don't, and the cryptographic primitives that scale validator sets.


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

An HSM is **a tamper-resistant physical device that holds the private key and signs without ever exposing it**. AWS CloudHSM, YubiHSM, or dedicated boxes from vendors like Thales.

Workflow:
1. Validator generates key inside the HSM
2. Public key is exposed; private key never leaves the device
3. To sign: validator software sends a hash to the HSM; HSM returns the signature
4. If validator software is compromised, the attacker can sign anything **valid** but cannot steal the key itself

Pros: Key never on disk, never in the validator process's memory.
Cons: Single device — physical loss = key loss. Backup is hard.

**Used by professional validators (Ledger Enterprise, Fireblocks, etc.) for ETH staking pools.**

### 2.3 MPC (Multi-Party Computation)

The key is **split across multiple devices**, and signing requires N-of-M cooperation. No single device ever holds the full key.

Example: 3 devices in 3 data centers. To sign, 2 of 3 cooperate. Compromise 1 device → attacker has 1/3 of the key, useless. To get to 2/3, you'd need to compromise 2 separate facilities.

Pros: No single device holds the key.
Cons: Requires cooperation = latency on every signature. Complex protocol.

**Used by very large staking operations (Fireblocks, Coinbase Cloud, etc.).**

### 2.4 Threshold signatures (the cryptographic version of MPC)

Same idea as MPC, but using **threshold signature cryptography** (signature schemes specifically designed to be produced by N-of-M shareholders without ever reassembling the key). Each device holds a "share" of the key. Signing produces a normal-looking signature without ever reconstructing the full key.

BLS threshold signatures (BLS = a pairing-based signature scheme that aggregates cleanly) are the standard for Ethereum-style PoS:
- Each validator has a share of the aggregate signing key
- Block signing aggregates partial signatures into one final signature
- Verifiers don't know it's a threshold signature — they just see a standard BLS sig

Pros: Cryptographically clean. No "reconstruction" step.
Cons: Complex setup, key generation ceremony required.

**Used by Ethereum's beacon chain validators with multi-node setups, and by chains like Aleo, Filecoin, etc.**


MPC is a **general protocol** to compute functions over secret shares without revealing them — works for any function, including signing. Threshold signatures are a **specific cryptographic primitive** where signature schemes natively support secret-sharing. Threshold sigs are cleaner; MPC is more flexible.

## 3. The "two-keys" pattern

The point of this pattern: bound the blast radius of a key leak. Most production validators separate:

- **Withdrawal key** (cold): controls the staked funds. Held offline (paper, hardware wallet)
- **Signing key** (hot): controls voting/proposing. Held online, slashable

If the signing key gets compromised, the attacker can **slash** the validator (cost: hot stake) but **cannot steal** funds (withdrawal key is cold). Loss is bounded.

For Ethereum:
- Withdrawal credentials (0x01...): cold storage
- Validator key (BLS): online for attestations and proposals

For Hyperliquid:
- Validator signing key: online
- Reward/withdrawal key: cold

## 4. The slashing-prevention checklist

These four rules are what separates "validator that earns rewards" from "validator that gets slashed." You must guarantee:
1. **Single signer per identity** — never run two processes with the same key
2. **Slashing-protection database** — track every signed message, refuse to sign anything that would cause slashing
3. **Fail-closed on uncertainty** — if you can't verify recent history, don't sign
4. **Network partition tolerance** — if you're behind a partition and lose sync, don't sign (you might be on a fork)

\`crates/ethereum/blockchain-tree\` in reth has slashing-protection logic for Ethereum PoS. Custom L1s need their own (Cosmos uses CometBFT's; Solana uses gulp-style ledger replay).


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

## 7. For my projects

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

> Final check: in one sentence, why is "having backups of the signing key" a slashing vulnerability rather than a feature? **If your answer doesn't include "duplicate signers can produce slashable equivocations," re-read §4.**

## Pass criteria

- List the five requirements and explain why no single solution satisfies all of them.
- Walk the four solutions in order and the trade-off each makes.
- Explain why MPC and threshold signatures are not the same thing.
- Describe the two-key pattern and why it bounds the blast radius.
- State the four anti-slashing rules with one sentence each.
- Sketch the remote-signer pattern and which production tools implement it.
- Explain why active-passive failover must run through consensus, not a load balancer.

## Summary (3 lines)

- Validator key management is bounded by five hard requirements; no single tool solves all of them, so production stacks layer HSM + slashing-protection DB + remote signer + active-passive multi-region.
- MPC and threshold signatures are different primitives; both solve secret-sharing, but threshold sigs are scheme-native and operationally simpler.
- The two-key pattern (withdrawal cold / signing hot) bounds blast radius — even a full signing-key leak cannot move funds, only slash them. Next lesson reads what actually triggers a slashing event.
`,
                },
                {
                  title: 'Lesson 2 — Slashing detection and the offline validator',
                  slug: 'validator-slashing-detection-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Lesson 2 — Slashing detection and the offline validator

## Question

There are exactly two ways a validator loses stake. The expensive one: **sign two contradictory messages** (slashing — one event burns the bulk of the stake). The slow one: **be offline when the network needs you** (inactivity penalty — a few basis points a day). **Every operational decision is "pick the smaller of these two losses." What are the decision axes?**

## Principle (minimum model)

- **Two paths to losing stake.** Active (slashing — cryptographically provable, catastrophic) + passive (inactivity — gradual, small per epoch).
- **Three flavours of slashable violation.** Double voting (same height, different blocks) + surround voting (Casper FFG — a later vote brackets an earlier one) + BFT equivocation (same height/round, different pre-commit).
- **Slashing-protection DB is standard.** Before signing, check whether a different message at this (H, R) was already signed → if yes, refuse → if no, sign + record.
- **The DB must be persistent + restart-safe + soft-update-safe + backed up.**
- **DB write and signature must be atomic.** A network-remote DB introduces a window where atomicity breaks → it has to live on the same machine.
- **Remote signer + DB = defence in depth.** Even if the validator node has a bug, the remote signer's DB is the last line.
- **Whistleblower reward.** On Ethereum the reporter gets ~1/512 of the slashed amount — so a $1 M slashing pays ~$2 k to watchers, creating economic incentive to monitor.
- **Inactivity leak.** When >1/3 are offline, finality stalls → every epoch shaves the offline stake → the chain self-heals back to >2/3 online.
- **During a network partition, fail-closed is the right answer.** Keep signing (slashing risk) vs stop (small inactivity penalty) → stopping is always correct.

## Worked example + steps

# Slashing detection and the offline validator

There are exactly two ways to lose validator stake. The expensive way: **sign two conflicting messages** (slashing — one event, big chunk of stake gone). The slow way: **be offline when the network needs you** (inactivity penalty — drips out over days). Every operational decision in this lesson comes down to picking the smaller of those two losses when something goes wrong.


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

Casper FFG (Ethereum's finality gadget) has validators vote on **source → target** checkpoint pairs. A surround-vote is one where a later vote's range strictly contains an earlier vote's range:

Vote1: source A → target B
Vote2: source C → target D

If C < A and D > B (the second "surrounds" the first), this is slashable. The fix: track every voted source/target pair; reject votes that would surround prior votes.

### 2.3 Equivocation in BFT (Tendermint, HotStuff)

Two pre-commits (the "I'm committed to this block" message in a BFT round) for the same height/round but different blocks. Same logic as double voting; the slashing-protection database must catch it.

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


The DB and signer must commit in **one atomic operation**. If you sign, then try to record but the network fails, you've signed without recording — and on retry you might sign again. Atomicity = both succeed or neither. Network-remote DBs add a window where atomicity is broken.

## 5. Whistleblower watchers

The protocol enforces slashing **only when somebody submits the proof**. That's where watchers come in. Slashing is **cryptographically provable** — anyone with the two conflicting signatures can submit a slashing transaction. Most chains pay a small fraction of the slashed stake to the submitter as a **whistleblower reward**.

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

Inactivity leak (the mechanism Ethereum uses to force a partitioned chain back to >2/3 online): every epoch, offline validators lose stake. The rate increases the longer finality remains delayed. **The chain self-heals** — eventually online validators are >2/3 and finality resumes, leaving offline ones with reduced stake.

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


If it continues signing: it might be on a partition and producing blocks the rest of the network doesn't see. Eventually network heals, the validator's chain is the wrong one, double-sign equivalent → slashed.

If it stops signing: 30 minutes of inactivity (small penalty). When connection restores, sync up and resume.

**Stop signing is correct.** Lose a tiny inactivity penalty rather than risk slashing. The validator software should automatically detect this and fail-closed.

## 8. For my projects

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

> Final check: in one sentence, why is "stop signing if uncertain" the correct default for a validator? **If your answer doesn't reference "slashing > inactivity penalty," re-read §7.**

## Pass criteria

- Name the two paths to losing stake and the order of magnitude of each.
- Distinguish double-vote, surround-vote, and BFT equivocation in one sentence each.
- Explain why the slashing-protection DB must be local (atomicity with the signature).
- Sketch the four DB durability requirements.
- Explain why remote-signer + local DB is defence in depth, not duplication.
- Recall the Ethereum whistleblower share and what behaviour it incentivises.
- Walk the inactivity-leak self-healing mechanism.
- State the fail-closed rule for network partitions and why it dominates.

## Summary (3 lines)

- Two paths to losing stake: slashing (catastrophic, cryptographically provable) and inactivity (gradual, small). All operational decisions reduce to picking the smaller of the two.
- Slashing-protection DB is the standard defence — it must be local for atomicity, persistent, restart-safe, and backed up. Remote signer + DB stacks them for defence in depth.
- Network partitions: fail-closed (stop signing) every time — the inactivity tax is always smaller than the slashing risk. Next lesson covers chain-wide coordinated upgrades.
`,
                },
                {
                  title: 'Lesson 3 — Hot upgrades and coordinated chain upgrades',
                  slug: 'validator-hot-upgrades-en',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 16,
                  xpReward: 45,
                  content: `# Lesson 3 — Hot upgrades and coordinated chain upgrades

## Question

It's mainnet hardfork day. The new binary rewrites consensus rules. Tens of thousands of validators are scattered across the world — no master switch, no maintenance window, the chain doesn't stop. **And yet at 14:13 UTC, every validator still on the canonical chain simultaneously starts producing blocks under the new rules. How?**

## Principle (minimum model)

- **The coordination mechanism is not "everyone upgrades at the same time".** **The binary itself knows when to switch** = the rules are height-gated.
- **Four activation methods.** Block height (deterministic, works for PoW and PoS) + timestamp (wall-clock, less precise) + difficulty (PoW historical) + total difficulty (Ethereum Merge, one-shot).
- **Upgrade *before* activation, and it's fine.** After activation, upgraded validators apply new rules; un-upgraded ones produce a stale fork and drop off the network.
- **Five-step rollout.** Receive announcement → download + verify new binary → deploy before activation → verify deployment → wait for activation.
- **What is being upgraded is the chain spec.** The \`activation_block_number\` table ships with the binary.
- **Pre-fork dry run.** Testnet does the same fork 2–3 weeks earlier → any issue delays mainnet (Pectra was delayed twice).
- **Hot fork ≠ hot software update.** Hot fork = consensus rules change / hot software update = no restart. A short restart is fine — the slashing-protection DB survives it.
- **Four emergency tiers.** Stale blocks (self-heals) / invalid state (coordinated rollback) / fund theft (emergency hardfork) / consensus halt (coordinated reset — rare).
- **BFT chains are halt-and-recover by design.** >1/3 offline → halt → operators recover → resume. **Halting is acceptable** (no fork, safety preserved).

## Worked example + steps

# Hot upgrades and coordinated chain upgrades

Picture mainnet hardfork day. The new binary changes consensus rules. Tens of thousands of validators run it, spread across every continent, every cloud, every home setup. There is no master switch. There is no scheduled maintenance window. The chain cannot pause. And yet at 14:13 UTC, **every validator that's going to stay on the canonical chain starts producing blocks under the new rules at the same time** — and the ones that didn't upgrade quietly fork off into irrelevance. How?

That coordination problem is the **hardest operational problem in blockchains**: validators must switch rules in lockstep without ever talking to each other directly. This lesson covers the protocol mechanisms and operational drills that make it work.


## 1. The core mechanism — height-gated rules

The trick is that **the binary already knows when to switch**. A hardfork is defined by:
- A **block height (or timestamp)** at which new rules activate
- A **set of new rules** (consensus, EVM, gas, etc.)

Validators don't all upgrade simultaneously. They upgrade **before** the activation height. Then at the activation block, every upgraded validator applies the new rules — same block, same instant, no coordination needed. Validators who haven't upgraded continue with old rules and **fall off**, producing blocks the rest of the network rejects.

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


The 1% produce a "stale fork" with old rules. The 99% follow the canonical chain with new rules. From the perspective of the 99%, the 1% are simply offline (their blocks are rejected). To recover:
1. Operator notices "my validator is producing rejected blocks"
2. Upgrades the binary
3. Validator syncs to the canonical chain (gets blocks from peers)
4. Resumes signing on the canonical chain

No slashing risk (they were on a different fork, not double-signing on the canonical one). Just inactivity penalty.

## 4. The upgrade is in the chain spec

For a Reth-based chain, upgrades are encoded in the **chain spec** (the Rust struct that defines a chain's identity — genesis, fork heights, chain ID). From Lesson 5 of Course 1 (Consensus Engineering):

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
- If >1/3 validators go offline, chain halts (a direct consequence of BFT's >2/3 quorum requirement — no quorum means no progress)
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
- [Cosmos chain upgrade docs](https://docs.cosmos.network/)

> Final check: in one sentence, why is "all validators upgrade at the exact same time" the wrong mental model for a hardfork? **If your answer doesn't reference "height-gated rules in the chain spec," re-read §1-2.**

## Pass criteria

- Explain why "everyone simultaneously upgrades" is not the actual coordination mechanism.
- List the four activation methods and which chains use each.
- State what happens to validators that upgrade after activation, vs before.
- Walk the five-step rollout for a mainnet hardfork.
- Explain what is actually upgraded (the chain spec / activation_block_number).
- Describe the role of testnet dry runs and the Pectra precedent.
- Distinguish hot fork from hot software update.
- Name the four emergency tiers and the response posture for each.

## Summary (3 lines)

- Coordinated upgrades work because the binary knows the activation height (chain spec); operators upgrade ahead of activation, and the chain switches itself at the gate.
- Four activation methods, four emergency tiers, five-step rollout. Hot fork ≠ hot software update — short restarts are routine because the slashing-protection DB survives them.
- BFT chains are halt-and-recover; halting is acceptable because it preserves safety over liveness. Final quiz tests recall across keys / slashing / upgrades.
`,
                },
                {
                  title: 'Quiz — Validator Operations',
                  slug: 'validator-final-quiz-en',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# Quiz — Validator Operations

## Question

Recap the three lessons: key management (HSM / MPC / threshold sigs), slashing detection (the DB + fail-closed rule), and coordinated upgrades (height-gated chain spec).

## Principle (minimum model)

- **Key management recap.** Five requirements, four solutions (config file → HSM → MPC → threshold sigs), two-key pattern (withdrawal cold / signing hot), remote signer + active-passive multi-region.
- **Slashing recap.** Two paths to losing stake (slashing vs inactivity), three slashable violations (double / surround / equivocation), slashing-protection DB is local + atomic + persistent.
- **Upgrade recap.** Height-gated chain spec, four activation methods, five-step rollout, four emergency tiers, BFT halt-and-recover.

## Worked example + steps

# Final quiz: validator operations

The validator ops final check. You'll need this to operate any validator, design L1 economics, or understand why production chains fail.

## Summary (3 lines)

- Seven questions spanning keys, slashing, and upgrades — the operational triangle for validators.
- Get two or more wrong → re-read the relevant lesson before moving on.
- Pass → advance to the bootcamp courses for hands-on labs (or to Production Security & Governance for the org-level view).
`,
                  quizQuestions: [
                    {
                      "question": "Why is **MPC (Multi-Party Computation)** for validator keys structurally different from just **distributing a key across N hosts**?",
                      "options": [
                        "MPC is faster.",
                        "MPC ensures **no single device ever has the full key** — each holds a share, signing requires N-of-M cooperation, attacking one device gives the attacker a useless fraction. Distributing a key across N hosts means N hosts each have the full key (or pieces that can be reconstructed) — attacking any one is catastrophic.",
                        "MPC is required by EIP-2335.",
                        "MPC uses less storage."
                      ],
                      "correctIndex": 1,
                      "explanation": "MPC is cryptographically guaranteed not to reconstruct the key during signing. Distributed keys (poorly designed) leak full keys to multiple hosts. MPC is one of the few ways to genuinely scale validator key security without single points of trust."
                    },
                    {
                      "question": "Why does running **duplicate validators on two machines** typically result in **slashing**, not redundancy?",
                      "options": [
                        "Slashing is unrelated to validator setup.",
                        "Both machines have the same key. Both sign attestations for the same height/round. Both signatures are valid. The network sees two conflicting signatures from the same identity — **slashable equivocation**. The redundancy attempt becomes the slashing offense.",
                        "Two-machine setups are forbidden by Ethereum spec.",
                        "Duplicate validators consume too much bandwidth."
                      ],
                      "correctIndex": 1,
                      "explanation": "This is the classic \"trying to be careful, getting slashed\" outcome. The fix is active-passive with strict failover (only one node ever has signing authority at a time, transition via consensus protocol). Even better: remote signer architecture where the key holder enforces single-signing at the protocol level."
                    },
                    {
                      "question": "Why is the **slashing-protection database** required to be on the **same machine as the signer**?",
                      "options": [
                        "For latency reasons only.",
                        "The DB write and the signing operation must be **atomic** — either both succeed or neither. A network-remote DB introduces a window where you sign first but DB update fails (e.g., network glitch), then retry could sign again. Atomicity is required to prevent double-sign on retry.",
                        "Required by EIP-3076 specifically.",
                        "Network calls are too slow."
                      ],
                      "correctIndex": 1,
                      "explanation": "Atomic operation requirement. Local DB + signer in one process = atomic. Remote DB = race condition. The \"atomic\" guarantee is the entire security model of slashing-protection."
                    },
                    {
                      "question": "A validator is on one side of a network partition. **Should it continue signing during the partition?**",
                      "options": [
                        "Yes, immediately resume signing.",
                        "**No, stop signing during partition.** If it continues signing, it might be on a fork and producing blocks the rest of the network doesn't see. When the network heals, the validator's chain is wrong → equivocates with canonical chain → slashed. Better to lose inactivity penalty (small) than slashing penalty (large).",
                        "Stop signing only if the operator says so.",
                        "Signing during partition is impossible."
                      ],
                      "correctIndex": 1,
                      "explanation": "Stop-signing is the correct default. Inactivity penalty is tiny; slashing penalty is large. The validator must detect \"I might be on a partition\" and refuse to sign until it can verify connectivity to >2/3 of peers. This is \"fail-closed on uncertainty\" — a core safety property."
                    },
                    {
                      "question": "In a coordinated hardfork, **why do validators not all upgrade simultaneously**? What ensures they all switch to new rules at the right moment?",
                      "options": [
                        "Hardforks require manual coordination via a chat room.",
                        "The chain spec encodes **activation block height (or timestamp)**: at that block, the new rules apply. Validators upgrade *before* the activation — they could be early or late. At the activation block, new rules become consensus-enforced. Validators who haven't upgraded continue with old rules and fork off; they can rejoin by upgrading and syncing.",
                        "Forks are triggered by majority vote at runtime.",
                        "Only Ethereum supports hardforks."
                      ],
                      "correctIndex": 1,
                      "explanation": "Height-gated rules are the magic. Operators have weeks to upgrade individually. At the activation block, everyone runs the same rules — those who don't fall off. Recovery is straightforward (upgrade + sync). This is how every major chain coordinates upgrades."
                    },
                    {
                      "question": "Why does the **withdrawal key** stay cold while the **signing key** stays online?",
                      "options": [
                        "Cold storage is mandatory for all keys.",
                        "Separation of concerns. The signing key needs to be online for attestations/proposals (slashable if leaked → at worst lose hot stake). The withdrawal key controls the actual staked funds — keeping it cold means even if a signing key is compromised, the funds can't be moved by the attacker.",
                        "Withdrawal keys are required to be cold by EIP-2335.",
                        "Hot keys cannot be used for withdrawals."
                      ],
                      "correctIndex": 1,
                      "explanation": "Defense in depth. Worst case if signing key is leaked: validator gets slashed. The full staked balance is still safe because the withdrawal credential is cold. This is the standard for serious validator setups; without it, a key leak is catastrophic."
                    },
                    {
                      "question": "What's the **whistleblower reward** in PoS chains, and what does it enable?",
                      "options": [
                        "A fixed daily payment to all validators.",
                        "When someone submits a slashing proof (the two conflicting signatures), they get a small fraction (typically ~1/512) of the slashed stake. This creates an economic incentive for **independent watchers** to monitor the chain and submit slashing proofs — enforcing the protocol without requiring everyone to do so. Permissionless enforcement.",
                        "A bonus paid to validators who maintain perfect uptime.",
                        "A penalty for late attestations."
                      ],
                      "correctIndex": 1,
                      "explanation": "Whistleblower rewards turn slashing detection into an economic game. Anyone can profit by spotting double-signs. This means the protocol's integrity isn't dependent on a central party — anyone watching can enforce. Critical for permissionless decentralization."
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
