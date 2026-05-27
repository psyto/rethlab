import { PrismaClient } from '@prisma/client';

export async function seedRethConsensusEconomicsJA(prisma: PrismaClient) {
  const tags = ['reth', 'consensus', 'economics', 'slashing', 'simulation', 'l1'];

  await prisma.course.create({
    data: {
      slug: 'reth-consensus-economics-ja',
      title: 'Consensus Economics & Slashing Lab',
      description: 'Rust L1の経済安全性を扱う実践コース。報酬設計、slashing規則、攻撃シナリオ、パラメータ感度分析を学ぶ。',
      difficulty: 'ADVANCED',
      duration: 180,
      xpReward: 500,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 360,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          { title: 'Incentive Model', sortOrder: 0, lessons: { create: [
            { title: '報酬モデル設計', slug: 'consensus-econ-reward-model-ja', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 80, content: '# 報酬モデル設計\n\nドラフトレッスン雛形。' },
            { title: '攻撃面のマッピング', slug: 'consensus-econ-attack-surfaces-ja', type: 'CONTENT', sortOrder: 1, duration: 25, xpReward: 70, content: '# 攻撃面のマッピング\n\nドラフトレッスン雛形。' },
          ]}},
          { title: 'Slashing Policy', sortOrder: 1, lessons: { create: [
            { title: 'Slashing規則設計', slug: 'consensus-econ-slashing-rules-ja', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 80, content: '# Slashing規則設計\n\nドラフトレッスン雛形。' },
            { title: '二重署名ケーススタディ', slug: 'consensus-econ-equivocation-cases-ja', type: 'CONTENT', sortOrder: 1, duration: 25, xpReward: 70, content: '# 二重署名ケーススタディ\n\nドラフトレッスン雛形。' },
          ]}},
          { title: 'Parameter Simulation', sortOrder: 2, lessons: { create: [
            { title: 'パラメータ感度分析', slug: 'consensus-econ-parameter-sensitivity-ja', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 90, content: '# パラメータ感度分析\n\nドラフトレッスン雛形。' },
            { title: 'Capstone — policy sheet', slug: 'consensus-econ-capstone-policy-sheet-ja', type: 'CONTENT', sortOrder: 1, duration: 40, xpReward: 110, content: '# Capstone — policy sheet\n\nドラフトレッスン雛形。' },
          ]}},
        ],
      },
    },
  });
}
