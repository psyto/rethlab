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
