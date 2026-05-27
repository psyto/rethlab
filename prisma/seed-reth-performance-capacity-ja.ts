import { PrismaClient } from '@prisma/client';

export async function seedRethPerformanceCapacityJA(prisma: PrismaClient) {
  const tags = ['reth', 'performance', 'capacity', 'benchmark', 'profiling', 'slo', 'l1'];

  await prisma.course.create({
    data: {
      slug: 'reth-performance-capacity-ja',
      title: 'Performance & Capacity Engineering',
      description: 'Rust L1向け性能工学。ワークロード定義、プロファイリング、ボトルネック除去、SLO予算、容量計画を扱う。',
      difficulty: 'EXPERT',
      duration: 200,
      xpReward: 560,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 380,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          { title: 'Baseline and Workload', sortOrder: 0, lessons: { create: [
            { title: 'ワークロード定義', slug: 'perf-workload-definition-ja', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 80, content: '# ワークロード定義\n\nドラフトレッスン雛形。' },
            { title: 'ベースライン計測', slug: 'perf-baseline-measurement-ja', type: 'CONTENT', sortOrder: 1, duration: 30, xpReward: 80, content: '# ベースライン計測\n\nドラフトレッスン雛形。' },
          ]}},
          { title: 'Profiling and Optimization', sortOrder: 1, lessons: { create: [
            { title: 'ホットパスのプロファイリング', slug: 'perf-hotpath-profiling-ja', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 90, content: '# ホットパスのプロファイリング\n\nドラフトレッスン雛形。' },
            { title: 'ボトルネック除去', slug: 'perf-bottleneck-removal-ja', type: 'CONTENT', sortOrder: 1, duration: 30, xpReward: 90, content: '# ボトルネック除去\n\nドラフトレッスン雛形。' },
          ]}},
          { title: 'SLO and Capacity', sortOrder: 2, lessons: { create: [
            { title: 'SLO予算設計', slug: 'perf-slo-budget-ja', type: 'CONTENT', sortOrder: 0, duration: 35, xpReward: 100, content: '# SLO予算設計\n\nドラフトレッスン雛形。' },
            { title: 'Capstone — 容量計画', slug: 'perf-capstone-capacity-plan-ja', type: 'CONTENT', sortOrder: 1, duration: 45, xpReward: 120, content: '# Capstone — 容量計画\n\nドラフトレッスン雛形。' },
          ]}},
        ],
      },
    },
  });
}
