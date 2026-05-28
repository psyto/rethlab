import { PrismaClient } from '@prisma/client';

export async function seedRethValidatorOpsBootcampEN(prisma: PrismaClient) {
  const tags = ['reth', 'validator', 'ops', 'runbook', 'incident', 'sre', 'l1'];

  await prisma.course.create({
    data: {
      slug: 'reth-validator-ops-bootcamp-en',
      title: 'Validator Ops Bootcamp — Runbooks, Incidents, and Recovery',
      description:
        'Hands-on validator operations lab with executable drills: SLO/SLI setup, incident detection, double-signer containment, and rollback recovery.',
      difficulty: 'ADVANCED',
      duration: 170,
      xpReward: 520,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 350,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Runbook Foundations',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'SLO/SLI for validator operations',
                  slug: 'validator-ops-slo-sli-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 28,
                  xpReward: 90,
                  content: `# SLO/SLI for validator operations

A validator that misses 30 minutes of attestations loses inflation rewards and may trigger a *liveness* slashing on chains that punish prolonged absence. A validator that double-signs even once can lose tens of percent of its stake. **The cost of degradation is non-linear, and you don't know which degradation will trigger the next loss.** That's why validator operations is a discipline of *budgets*: how much error is acceptable per quarter, how the team is allowed to spend that budget, and how the runbook turns "things look weird" into "page someone now."

This lesson sets up the language — **SLI**, **SLO**, and **error budget** — that the rest of the bootcamp uses to talk about what's worth waking up for.

## 1. SLI vs SLO — the two-line definition

- **SLI (Service Level Indicator)**: a *number you can measure* about your validator. Examples: head lag in seconds, percent of slots attested in the last hour, p99 import latency, peer count.
- **SLO (Service Level Objective)**: a *target* you commit to for an SLI over a window. Example: "head lag &lt; 6 seconds for 99.5% of the last 7 days."

The SLO is what the on-call rotation defends. The SLI is what the dashboard shows. **An SLO without an SLI is wishful thinking; an SLI without an SLO is just telemetry.**

## 2. The four SLIs that matter for a Reth validator

You can instrument hundreds of metrics. These four are the load-bearing ones — every well-run validator team tracks at least these:

| SLI | What it measures | Why it's load-bearing |
| :--- | :--- | :--- |
| **Head lag** | \`(network_head_block - local_head_block)\` in seconds | The single best summary signal. If you're behind the chain, you're attesting on stale state or missing slots entirely. |
| **Attestation participation** | Percentage of expected attestations actually emitted in the last N slots | The direct economic signal — every missed attestation is forgone reward. |
| **Import latency p99** | Time from "block received from peer" to "block executed and added to canonical chain" | Reveals slow EVM execution, disk pressure, or database compaction stalls before they cascade into head lag. |
| **Peer churn rate** | Connections gained/lost per minute | An early warning for sync issues, network partitions, or eclipse attacks. |

Other things you'll instrument (RAM, disk, network bandwidth, signer uptime) are *secondary* — they explain *why* the four SLIs above moved, but they aren't the front-line signals on their own.

## 3. From SLI to SLO — picking the targets

A target is just a number, but the wrong number is the difference between a useful page and alert fatigue. Three useful starting SLOs for a single-chain Reth validator on a fast network (Ethereum mainnet, OP-stack chain):

| SLO | Target | Rationale |
| :--- | :--- | :--- |
| **Head lag** | < 6 seconds for **99.5%** of any 7-day window | One slot of slack is fine. Three slots is a problem. Six is a *liveness* issue. |
| **Attestation participation** | ≥ **99.0%** over rolling 24h | Below 95% your inflation reward is meaningfully impacted; below 99% you should know why. |
| **Import latency p99** | < 1500ms for **99.0%** of blocks over rolling 24h | The chain's block time is ~12s on Ethereum mainnet; if a single import takes >1.5s, you're eating most of the per-slot budget. |

These are *starting* points. Real production teams tune them to their stake size, their chain's economics, and their team's tolerance for being paged on weekends. **The discipline isn't memorizing these numbers; it's writing them down and reviewing them quarterly.**

## 4. Error budgets — the policy half of the discipline

If your SLO is "99.5% head lag below 6s," you've implicitly given yourself a budget of **0.5% out-of-SLO time** per window — about 50 minutes per week. That budget is the *error budget*.

The policy: **what does the team do when the budget is being burned?** Three tiers worth knowing:

- **Green (budget healthy)** — ship upgrades, run drills, take risk.
- **Yellow (budget &gt;50% burned, more than half the window remaining)** — pause non-urgent changes, post-mortem the recent burns, page the secondary on-call to investigate.
- **Red (budget exhausted)** — freeze deploys, halt experimental features (custom precompiles, new gossip protocols), root-cause the spend before resuming.

Two anti-patterns the bootcamp will train you out of: (a) **leaving the policy implicit** ("we'll figure it out when it happens" — you won't, you'll improvise badly), and (b) **treating green as "do nothing."** Green is when you do the prevention work; red is when you can't afford to.

## 5. Alert tiers — turning SLIs into pages

The SLI dashboard tells you what *is*; the alert routing tells you what *requires a human now*. A minimal three-tier scheme:

| Tier | Trigger | Routing |
| :--- | :--- | :--- |
| **PAGE** | SLI breached and the breach has lasted > 60s (or any double-sign indicator) | Primary on-call's phone, secondary's chat after 5 min |
| **TICKET** | SLI breach < 60s OR error budget &gt;50% burned with 5 days left | On-call channel, no phone, review in next standup |
| **LOG** | Anomaly that doesn't reach a tier-2 threshold | Metrics archive, dashboards |

The PAGE tier is for things the on-call *cannot* afford to acknowledge and ignore — anything that could be a double-sign, a stuck head, or a validator that's been offline more than a slot. Everything else is TICKET or LOG. **The cost of a false PAGE is high (sleep), but the cost of a missed real PAGE is much higher (slashing, lost rewards, reputational damage).** Err on the side of paging, but ruthlessly tune away pages that don't lead to real action.

> 🛑 **Predict before scrolling.** A validator's head lag jumps from 2s to 9s and stays there for 90 seconds, then recovers. **Should this have paged the on-call?** Sketch the answer in terms of SLO breach + duration + error budget impact before continuing to the hands-on section below.

(Answer: yes — 9s exceeds the 6s SLO target, and 90s is well past the 60s sustain threshold for the PAGE tier. Even after recovery, this event consumes ~3% of the weekly head-lag error budget and should produce a post-mortem in the next stand-up.)

## Prerequisites

- You can run shell commands locally.
- Repo cloned and current directory is repo root.

## Hands-on steps

1. Initialize lab artifacts:

\`\`\`bash
cd examples/validator-ops
./scripts/init-lab.sh
\`\`\`

Expected output:

\`\`\`text
[ok] lab initialized
\`\`\`

2. Open baseline metrics:

\`\`\`bash
cat artifacts/metrics-baseline.json
\`\`\`

3. Define SLI/SLO targets in runbook:

- Edit: \`artifacts/validator-ops-runbook.md\`
- Add 4 SLIs and 3 SLOs.

## Pass criteria

- \`artifacts/validator-ops-runbook.md\` exists
- Contains sections: \`Reliability Targets\`, \`Alert tiers\`, \`Error budget policy\`

## Verification

\`\`\`bash
grep -n "Reliability Targets\|Alert tiers\|Error budget" artifacts/validator-ops-runbook.md
\`\`\`
`,
                },
                {
                  title: 'Observability stack for validator nodes',
                  slug: 'validator-ops-observability-stack-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 28,
                  xpReward: 90,
                  content: `# Observability stack for validator nodes

## Hands-on steps

1. Simulate lag incident signal:

\`\`\`bash
cd examples/validator-ops
./scripts/simulate-head-lag.sh
cat artifacts/incident-head-lag.log
\`\`\`

2. Triage checklist (write in runbook):

- local vs network-wide lag
- import latency correlation
- peer churn check

3. Add a "Detection" section to:\
\`artifacts/validator-ops-runbook.md\`.

## Expected evidence

- \`artifacts/incident-head-lag.log\` contains \`ALERT=PAGE\`

## Verification

\`\`\`bash
grep -q "ALERT=PAGE" artifacts/incident-head-lag.log && echo PASS
\`\`\`
`,
                },
              ],
            },
          },
          {
            title: 'Incident Drills',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'Double-sign incident response',
                  slug: 'validator-ops-double-sign-incident-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 32,
                  xpReward: 100,
                  content: `# Double-sign incident response

## Hands-on steps

1. Run incident simulation:

\`\`\`bash
cd examples/validator-ops
./scripts/simulate-double-signer.sh
cat artifacts/incident-double-signer.log
\`\`\`

2. Extract containment timeline into runbook:

- containment start
- secondary signer stop
- single-writer verification

3. Add 3 prevention controls to runbook:

- signer lease lock
- startup guard
- duplicate-signer alert

## Pass criteria

- Incident log includes \`single-writer=PASS\`
- Runbook has a "Double-sign Containment" section

## Verification

\`\`\`bash
grep -q "single-writer=PASS" artifacts/incident-double-signer.log && echo PASS
grep -n "Double-sign Containment" artifacts/validator-ops-runbook.md
\`\`\`
`,
                },
                {
                  title: 'Upgrade rollback drill',
                  slug: 'validator-ops-upgrade-rollback-en',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 32,
                  xpReward: 100,
                  content: `# Upgrade rollback drill

## Hands-on steps

1. Run rollback drill:

\`\`\`bash
cd examples/validator-ops
./scripts/rollback-drill.sh
cat artifacts/rollback-drill.log
\`\`\`

2. Document policy in runbook:

- canary window
- rollback triggers
- post-rollback checks

## Pass criteria

- Log includes \`recovery PASS\`
- Runbook has "Rollback Procedure" section

## Verification

\`\`\`bash
grep -q "recovery PASS" artifacts/rollback-drill.log && echo PASS
grep -n "Rollback Procedure" artifacts/validator-ops-runbook.md
\`\`\`
`,
                },
              ],
            },
          },
          {
            title: 'Capstone',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Capstone — production runbook review',
                  slug: 'validator-ops-capstone-runbook-en',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 140,
                  content: `# Capstone — production runbook review

## Goal

Complete the following artifacts:

- \`artifacts/validator-ops-runbook.md\`
- \`artifacts/incident-head-lag.log\`
- \`artifacts/incident-double-signer.log\`
- \`artifacts/rollback-drill.log\`

## Final verification

\`\`\`bash
cd examples/validator-ops
./scripts/verify-drill.sh
\`\`\`

Expected output:

\`\`\`text
[pass] validator-ops simulation checks passed
\`\`\`

## Pass criteria

- Verification script passes
- Runbook includes all sections from template
- You can explain one improvement made after drills
`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
