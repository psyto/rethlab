import { PrismaClient } from '@prisma/client';

export async function seedRethMultinodeTestnetJA(prisma: PrismaClient) {
  const tags = ['reth', 'devnet', 'testnet', 'partition', 'fork', 'p2p', 'l1'];

  await prisma.course.create({
    data: {
      slug: 'reth-multinode-testnet-ja',
      title: 'Multi-Node Devnet to Testnet',
      description: 'Rust L1の分散運用準備。マルチバリデータ構成、分断/再結合、fork観測、testnet昇格ゲートを扱う。',
      difficulty: 'ADVANCED',
      duration: 170,
      xpReward: 480,
      track: 'reth-l1-architect',
      tags,
      isPublished: false,
      sortOrder: 370,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          { title: 'Topology and Bootstrap', sortOrder: 0, lessons: { create: [
            { title: '4-7バリデータ構成の設計', slug: 'multinode-topology-design-ja', type: 'CONTENT', sortOrder: 0, duration: 25, xpReward: 70, content: '# 4-7バリデータ構成の設計\n\nドラフトレッスン雛形。' },
            { title: 'マルチバリデータdevnetの起動', slug: 'multinode-bootstrap-validators-ja', type: 'CONTENT', sortOrder: 1, duration: 25, xpReward: 70, content: '# マルチバリデータdevnetの起動\n\nドラフトレッスン雛形。' },
          ]}},
          { title: 'Failure Injection', sortOrder: 1, lessons: { create: [
            { title: '遅延・パケットロス注入', slug: 'multinode-latency-injection-ja', type: 'CONTENT', sortOrder: 0, duration: 25, xpReward: 70, content: '# 遅延・パケットロス注入\n\nドラフトレッスン雛形。' },
            { title: '分断と再結合の演習', slug: 'multinode-network-partition-rejoin-ja', type: 'CONTENT', sortOrder: 1, duration: 25, xpReward: 70, content: '# 分断と再結合の演習\n\nドラフトレッスン雛形。' },
            { title: 'forkの可観測性', slug: 'multinode-fork-observability-ja', type: 'CONTENT', sortOrder: 2, duration: 20, xpReward: 60, content: '# forkの可観測性\n\nドラフトレッスン雛形。' },
          ]}},
          { title: 'Promotion Readiness', sortOrder: 2, lessons: { create: [
            { title: 'testnet昇格チェックリスト', slug: 'multinode-testnet-gate-check-ja', type: 'CONTENT', sortOrder: 0, duration: 30, xpReward: 80, content: '# testnet昇格チェックリスト\n\nドラフトレッスン雛形。' },
          ]}},
        ],
      },
    },
  });
}
