import { PrismaClient } from '@prisma/client';

export async function seedRethSecurityGovernanceEN(prisma: PrismaClient) {
  const tags = ['reth', 'security', 'governance', 'threat-model', 'change-management', 'l1'];

  await prisma.course.create({
    data: {
      slug: 'reth-security-governance-en',
      title: 'Production Security & Governance',
      description: 'Security and governance layer for production Rust L1s: threat models, secret management, emergency response, and change control.',
      difficulty: 'EXPERT',
      duration: 180,
      xpReward: 520,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 390,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          { title: 'Security Operations', sortOrder: 0, lessons: { create: [
            { title: 'Threat modeling for L1 operations', slug: 'security-threat-model-en', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 80, content: '# Threat modeling for L1 operations\n\nDraft lesson scaffold.' },
            { title: 'Secrets and supply-chain controls', slug: 'security-secrets-supplychain-en', type: 'CONTENT', sortOrder: 1, duration: 30, xpReward: 80, content: '# Secrets and supply-chain controls\n\nDraft lesson scaffold.' },
          ]}},
          { title: 'Emergency Controls', sortOrder: 1, lessons: { create: [
            { title: 'Emergency response workflow', slug: 'security-emergency-response-en', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 90, content: '# Emergency response workflow\n\nDraft lesson scaffold.' },
            { title: 'Rollback and communications', slug: 'security-rollback-communications-en', type: 'CONTENT', sortOrder: 1, duration: 25, xpReward: 70, content: '# Rollback and communications\n\nDraft lesson scaffold.' },
          ]}},
          { title: 'Governance Process', sortOrder: 2, lessons: { create: [
            { title: 'Change control policy', slug: 'security-governance-change-control-en', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 90, content: '# Change control policy\n\nDraft lesson scaffold.' },
            { title: 'Capstone — readiness review', slug: 'security-capstone-readiness-review-en', type: 'CONTENT', sortOrder: 1, duration: 35, xpReward: 110, content: '# Capstone — readiness review\n\nDraft lesson scaffold.' },
          ]}},
        ],
      },
    },
  });
}
