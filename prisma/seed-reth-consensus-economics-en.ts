import { PrismaClient } from '@prisma/client';

export async function seedRethConsensusEconomicsEN(prisma: PrismaClient) {
  const tags = ['reth', 'consensus', 'economics', 'slashing', 'simulation', 'l1'];

  await prisma.course.create({
    data: {
      slug: 'reth-consensus-economics-en',
      title: 'Consensus Economics & Slashing Lab',
      description: 'Economic safety layer for Rust L1 chains: reward design, slashing rules, attack scenarios, and parameter sensitivity.',
      difficulty: 'ADVANCED',
      duration: 180,
      xpReward: 500,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 360,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          { title: 'Incentive Model', sortOrder: 0, lessons: { create: [
            { title: 'Reward model design', slug: 'consensus-econ-reward-model-en', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 80, content: '# Reward model design\n\nDraft lesson scaffold.' },
            { title: 'Attack surface mapping', slug: 'consensus-econ-attack-surfaces-en', type: 'CONTENT', sortOrder: 1, duration: 25, xpReward: 70, content: '# Attack surface mapping\n\nDraft lesson scaffold.' },
          ]}},
          { title: 'Slashing Policy', sortOrder: 1, lessons: { create: [
            { title: 'Slashing rule design', slug: 'consensus-econ-slashing-rules-en', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 80, content: '# Slashing rule design\n\nDraft lesson scaffold.' },
            { title: 'Equivocation case studies', slug: 'consensus-econ-equivocation-cases-en', type: 'CONTENT', sortOrder: 1, duration: 25, xpReward: 70, content: '# Equivocation case studies\n\nDraft lesson scaffold.' },
          ]}},
          { title: 'Parameter Simulation', sortOrder: 2, lessons: { create: [
            { title: 'Parameter sensitivity analysis', slug: 'consensus-econ-parameter-sensitivity-en', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 90, content: '# Parameter sensitivity analysis\n\nDraft lesson scaffold.' },
            { title: 'Capstone — policy sheet', slug: 'consensus-econ-capstone-policy-sheet-en', type: 'CONTENT', sortOrder: 1, duration: 40, xpReward: 110, content: '# Capstone — policy sheet\n\nDraft lesson scaffold.' },
          ]}},
        ],
      },
    },
  });
}
