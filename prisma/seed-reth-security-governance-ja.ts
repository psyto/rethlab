import { PrismaClient } from '@prisma/client';

export async function seedRethSecurityGovernanceJA(prisma: PrismaClient) {
  const tags = ['reth', 'security', 'governance', 'threat-model', 'change-management', 'l1'];

  await prisma.course.create({
    data: {
      slug: 'reth-security-governance-ja',
      title: 'Production Security & Governance',
      description: '本番Rust L1向けのセキュリティ/ガバナンス層。脅威モデリング、秘密情報管理、緊急対応、変更統制を扱う。',
      difficulty: 'EXPERT',
      duration: 180,
      xpReward: 520,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 390,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          { title: 'Security Operations', sortOrder: 0, lessons: { create: [
            { title: 'L1運用の脅威モデリング', slug: 'security-threat-model-ja', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 80, content: '# L1運用の脅威モデリング\n\nドラフトレッスン雛形。' },
            { title: '秘密情報管理とサプライチェーン統制', slug: 'security-secrets-supplychain-ja', type: 'CONTENT', sortOrder: 1, duration: 30, xpReward: 80, content: '# 秘密情報管理とサプライチェーン統制\n\nドラフトレッスン雛形。' },
          ]}},
          { title: 'Emergency Controls', sortOrder: 1, lessons: { create: [
            { title: '緊急対応ワークフロー', slug: 'security-emergency-response-ja', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 90, content: '# 緊急対応ワークフロー\n\nドラフトレッスン雛形。' },
            { title: 'ロールバックとコミュニケーション', slug: 'security-rollback-communications-ja', type: 'CONTENT', sortOrder: 1, duration: 25, xpReward: 70, content: '# ロールバックとコミュニケーション\n\nドラフトレッスン雛形。' },
          ]}},
          { title: 'Governance Process', sortOrder: 2, lessons: { create: [
            { title: '変更統制ポリシー', slug: 'security-governance-change-control-ja', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 90, content: '# 変更統制ポリシー\n\nドラフトレッスン雛形。' },
            { title: 'Capstone — readiness review', slug: 'security-capstone-readiness-review-ja', type: 'CONTENT', sortOrder: 1, duration: 35, xpReward: 110, content: '# Capstone — readiness review\n\nドラフトレッスン雛形。' },
          ]}},
        ],
      },
    },
  });
}
