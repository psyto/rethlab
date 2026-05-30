import { PrismaClient } from '@prisma/client';

export async function seedRethMultinodeTestnetEN(prisma: PrismaClient) {
  const tags = ['reth', 'devnet', 'testnet', 'partition', 'fork', 'p2p', 'l1'];

  await prisma.course.create({
    data: {
      slug: 'reth-multinode-testnet-en',
      title: 'Multi-Node Devnet to Testnet',
      description: 'Distributed readiness for Rust L1s: multi-validator topology, partition/rejoin drills, fork observation, and promotion gates.',
      difficulty: 'ADVANCED',
      duration: 170,
      xpReward: 480,
      track: 'reth-l1-architect',
      tags,
      isPublished: false,
      sortOrder: 370,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          { title: 'Topology and Bootstrap', sortOrder: 0, lessons: { create: [
            { title: 'Topology design for 4-7 validators', slug: 'multinode-topology-design-en', type: 'CONTENT', sortOrder: 0, duration: 25, xpReward: 70, content: '# Topology design for 4-7 validators\n\nDraft lesson scaffold.' },
            { title: 'Bootstrap multi-validator devnet', slug: 'multinode-bootstrap-validators-en', type: 'CONTENT', sortOrder: 1, duration: 25, xpReward: 70, content: '# Bootstrap multi-validator devnet\n\nDraft lesson scaffold.' },
          ]}},
          { title: 'Failure Injection', sortOrder: 1, lessons: { create: [
            { title: 'Latency and packet-loss injection', slug: 'multinode-latency-injection-en', type: 'CONTENT', sortOrder: 0, duration: 25, xpReward: 70, content: '# Latency and packet-loss injection\n\nDraft lesson scaffold.' },
            { title: 'Partition and rejoin exercise', slug: 'multinode-network-partition-rejoin-en', type: 'CONTENT', sortOrder: 1, duration: 25, xpReward: 70, content: '# Partition and rejoin exercise\n\nDraft lesson scaffold.' },
            { title: 'Fork observability', slug: 'multinode-fork-observability-en', type: 'CONTENT', sortOrder: 2, duration: 20, xpReward: 60, content: '# Fork observability\n\nDraft lesson scaffold.' },
          ]}},
          { title: 'Promotion Readiness', sortOrder: 2, lessons: { create: [
            { title: 'Testnet gate checklist', slug: 'multinode-testnet-gate-check-en', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 80, content: '# Testnet gate checklist\n\nDraft lesson scaffold.' },
          ]}},
        ],
      },
    },
  });
}
