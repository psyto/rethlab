# L1 Engineer Curriculum Extension (RethLab)

This document defines five expansion modules to move learners from "can implement" to "can operate and ship a production Rust L1 chain."

## Module 1: Validator Ops Bootcamp

- Objective: Shift from local success to reliable operations.
- Scope: key management, backup/restore, observability, incident response, rolling upgrades.
- Entry requirements: completed Step 1 (Consensus) and basic Linux operations.
- Exit criteria:
  - Can run a validator with documented startup and recovery procedures.
  - Can execute a simulated incident runbook within a target recovery window.
- Deliverables:
  - `validator-ops-runbook.md`
  - `incident-playbook.md`

## Module 2: Consensus Economics & Slashing Lab

- Objective: Connect consensus implementation to economic safety.
- Scope: reward design, slashing conditions, attack scenarios, parameter sensitivity.
- Entry requirements: Module 1 complete; consensus concepts (BFT, finality) understood.
- Exit criteria:
  - Can explain why each slashing rule exists and what attack it mitigates.
  - Can justify a baseline parameter set with simulation outputs.
- Deliverables:
  - `economics-parameter-sheet.md`
  - reproducible simulation notebook or script

## Module 3: Multi-Node Devnet to Testnet

- Objective: Graduate from single-validator to distributed behavior.
- Scope: 4-7 validator topology, partition/rejoin, latency injection, fork observation.
- Entry requirements: Module 1 complete.
- Exit criteria:
  - Can reproduce and explain at least three network-failure scenarios.
  - Can recover network liveness/safety under predefined test conditions.
- Deliverables:
  - multi-node environment (`docker-compose` or equivalent)
  - scenario test scripts and result logs

## Module 4: Performance & Capacity Engineering

- Objective: Build systems that are measurable, fast, and stable.
- Scope: throughput/latency benchmarking, profiling, bottleneck removal, SLO definitions.
- Entry requirements: Module 3 complete.
- Exit criteria:
  - Can produce a baseline benchmark report and one measurable improvement.
  - Can define and defend SLOs for target workload.
- Deliverables:
  - `performance-baseline.md`
  - profiling artifacts + optimization PR
  - `slo-budget.md`

## Module 5: Production Security & Governance

- Objective: Add operational control and security discipline required for production L1s.
- Scope: threat modeling, secrets management, dependency policy, emergency response, change control.
- Entry requirements: Modules 1-4 complete.
- Exit criteria:
  - Can run a lightweight threat model and map controls to risks.
  - Can execute emergency rollback and governance approval flow.
- Deliverables:
  - `security-checklist.md`
  - `governance-change-process.md`

## Recommended sequencing

1. Module 1 (Ops)
2. Module 2 (Economics)
3. Module 3 (Distributed testnet)
4. Module 4 (Performance)
5. Module 5 (Security/Governance)

## Assessment model

- 40% implementation correctness
- 30% operational reliability (runbooks, recovery drills)
- 20% performance evidence (benchmarks/profiling)
- 10% security/governance completeness

## Integration with existing RethLab path

- Existing OpenHL Step 0-6 remains the implementation spine.
- These modules are post-Step-6 professionalization layers.
- Completion target: "can design, run, and defend a production-grade Rust L1 system."
