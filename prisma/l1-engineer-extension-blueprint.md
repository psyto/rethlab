# L1 Engineer Extension Seed Blueprint

This blueprint translates the L1 professionalization plan into seed-ready course structures for Prisma.

## Design rules

- Keep existing OpenHL Step 0-6 as implementation spine.
- Add post-Step-6 productionization courses under `track: reth-l1-architect`.
- Use EN/JA pair seeds (`seed-reth-*-en.ts` and `seed-reth-*-ja.ts`).
- Keep slug stability; never rename after publish.

## Course set (EN/JA)

### 1) Validator Ops Bootcamp

- EN slug: `reth-validator-ops-bootcamp-en`
- JA slug: `reth-validator-ops-bootcamp-ja`
- Difficulty: `ADVANCED`
- Duration target: 150
- XP target: 420
- Track: `reth-l1-architect`
- Tags: `reth,validator,ops,runbook,sre,incident,l1`

Modules:
1. Runbook Foundations
- `validator-ops-slo-sli-en|ja`
- `validator-ops-observability-stack-en|ja`
- `validator-ops-backup-restore-en|ja`

2. Incident Drills
- `validator-ops-double-sign-incident-en|ja`
- `validator-ops-partition-incident-en|ja`
- `validator-ops-upgrade-rollback-en|ja`

3. Capstone
- `validator-ops-capstone-runbook-en|ja`

### 2) Consensus Economics & Slashing Lab

- EN slug: `reth-consensus-economics-en`
- JA slug: `reth-consensus-economics-ja`
- Difficulty: `ADVANCED`
- Duration target: 180
- XP target: 500
- Track: `reth-l1-architect`
- Tags: `reth,consensus,economics,slashing,simulation,l1`

Modules:
1. Incentive Model
- `consensus-econ-reward-model-en|ja`
- `consensus-econ-attack-surfaces-en|ja`

2. Slashing Policy
- `consensus-econ-slashing-rules-en|ja`
- `consensus-econ-equivocation-cases-en|ja`

3. Parameter Simulation
- `consensus-econ-parameter-sensitivity-en|ja`
- `consensus-econ-capstone-policy-sheet-en|ja`

### 3) Multi-Node Devnet to Testnet

- EN slug: `reth-multinode-testnet-en`
- JA slug: `reth-multinode-testnet-ja`
- Difficulty: `ADVANCED`
- Duration target: 170
- XP target: 480
- Track: `reth-l1-architect`
- Tags: `reth,devnet,testnet,p2p,fork,partition,l1`

Modules:
1. Topology and Bootstrap
- `multinode-topology-design-en|ja`
- `multinode-bootstrap-validators-en|ja`

2. Failure Injection
- `multinode-latency-injection-en|ja`
- `multinode-network-partition-rejoin-en|ja`
- `multinode-fork-observability-en|ja`

3. Promotion Readiness
- `multinode-testnet-gate-check-en|ja`

### 4) Performance & Capacity Engineering

- EN slug: `reth-performance-capacity-en`
- JA slug: `reth-performance-capacity-ja`
- Difficulty: `EXPERT`
- Duration target: 200
- XP target: 560
- Track: `reth-l1-architect`
- Tags: `reth,performance,benchmark,profiling,slo,capacity`

Modules:
1. Baseline and Workload
- `perf-workload-definition-en|ja`
- `perf-baseline-measurement-en|ja`

2. Profiling and Optimization
- `perf-hotpath-profiling-en|ja`
- `perf-bottleneck-removal-en|ja`

3. SLO and Capacity
- `perf-slo-budget-en|ja`
- `perf-capstone-capacity-plan-en|ja`

### 5) Production Security & Governance

- EN slug: `reth-security-governance-en`
- JA slug: `reth-security-governance-ja`
- Difficulty: `EXPERT`
- Duration target: 180
- XP target: 520
- Track: `reth-l1-architect`
- Tags: `reth,security,governance,threat-model,change-management`

Modules:
1. Security Operations
- `security-threat-model-en|ja`
- `security-secrets-supplychain-en|ja`

2. Emergency Controls
- `security-emergency-response-en|ja`
- `security-rollback-communications-en|ja`

3. Governance Process
- `security-governance-change-control-en|ja`
- `security-capstone-readiness-review-en|ja`

## Suggested sortOrder placement

- Place these after existing L1 architect set (`consensus-engineering`, `cross-chain-bridges`, `sequencer-rollup`, `p2p-networking`, `validator-ops`).
- Suggested course sortOrder (EN/JA mirrored):
  - Validator Ops Bootcamp: 350
  - Consensus Economics: 360
  - Multi-Node Testnet: 370
  - Performance & Capacity: 380
  - Security & Governance: 390

## Implementation checklist

1. Create EN seed files:
- `seed-reth-validator-ops-bootcamp-en.ts`
- `seed-reth-consensus-economics-en.ts`
- `seed-reth-multinode-testnet-en.ts`
- `seed-reth-performance-capacity-en.ts`
- `seed-reth-security-governance-en.ts`

2. Create JA mirror files with translated titles/slugs:
- `...-ja.ts` counterparts

3. Register all seed functions in:
- `prisma/seed.ts`
- `prisma/seed-upsert.ts`

4. Verify:
- `npm run seed:upsert`
- confirm catalog visibility and order
- run metadata checks for slug-based links

## Non-goals (for this batch)

- No schema changes.
- No runtime routing changes.
- No progress model changes.

