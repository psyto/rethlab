import { PrismaClient } from '@prisma/client';

export async function seedRethPerformanceCapacityEN(prisma: PrismaClient) {
  const tags = ['reth', 'performance', 'capacity', 'benchmark', 'profiling', 'slo', 'l1'];

  await prisma.course.create({
    data: {
      slug: 'reth-performance-capacity-en',
      title: 'Performance & Capacity Engineering',
      description: 'Performance discipline for Rust L1 chains: workload definition, profiling, bottleneck removal, SLO budgets, and capacity planning.',
      difficulty: 'EXPERT',
      duration: 200,
      xpReward: 560,
      track: 'reth-l1-architect',
      tags,
      isPublished: false,
      sortOrder: 380,
      locale: 'en',
      instructorName: 'RethLab',
      modules: {
        create: [
          { title: 'Baseline and Workload', sortOrder: 0, lessons: { create: [
            { title: 'Workload definition', slug: 'perf-workload-definition-en', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 80, content: '# Workload definition\n\nDraft lesson scaffold.' },
            { title: 'Baseline measurement', slug: 'perf-baseline-measurement-en', type: 'CONTENT', sortOrder: 1, duration: 30, xpReward: 80, content: '# Baseline measurement\n\nDraft lesson scaffold.' },
          ]}},
          { title: 'Profiling and Optimization', sortOrder: 1, lessons: { create: [
            { title: 'Hot-path profiling', slug: 'perf-hotpath-profiling-en', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 90, content: '# Hot-path profiling\n\nDraft lesson scaffold.' },
            { title: 'Bottleneck removal', slug: 'perf-bottleneck-removal-en', type: 'CONTENT', sortOrder: 1, duration: 30, xpReward: 90, content: '# Bottleneck removal\n\nDraft lesson scaffold.' },
          ]}},
          { title: 'SLO and Capacity', sortOrder: 2, lessons: { create: [
            { title: 'SLO budget design', slug: 'perf-slo-budget-en', type: 'CONTENT', sortOrder: 0, duration: 35, xpReward: 100, content: '# SLO budget design\n\nDraft lesson scaffold.' },
            { title: 'Capstone — capacity plan', slug: 'perf-capstone-capacity-plan-en', type: 'CONTENT', sortOrder: 1, duration: 45, xpReward: 120, content: '# Capstone — capacity plan\n\nDraft lesson scaffold.' },
          ]}},
        ],
      },
    },
  });
}
