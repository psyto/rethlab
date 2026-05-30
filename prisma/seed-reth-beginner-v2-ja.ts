import { PrismaClient } from '@prisma/client';

export async function seedRethBeginnerV2JA(prisma: PrismaClient) {
  const tags = ['reth', 'revm', 'alloy', 'rust', 'beginner', 'v2'];

  await prisma.course.create({
    data: {
      slug: 'reth-beginner-v2-ja',
      title: 'Reth入門 v2 — 根本理解ショート版',
      description:
        'Reth・Revm・Alloyの役割と学ぶ理由を、根本原理に絞って短く理解する。',
      difficulty: 'BEGINNER',
      duration: 30,
      xpReward: 90,
      track: 'reth-beginner',
      tags,
      isPublished: true,
      sortOrder: 101,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'なぜRust Ethereumスタックなのか（v2）',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'なぜReth・Revm・Alloyを学ぶのか',
                  slug: 'why-rust-ethereum-stack-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 12,
                  xpReward: 20,
                  content: `# なぜReth・Revm・Alloyを学ぶのか

## 問い
なぜ今、Rust Ethereumスタックを学ぶ価値があるのか？

## 原理（最小モデル）
Rust Ethereumスタックの本質は、**EVMを部品として再構成できること**である。

- **Alloy**: 型・署名・RPC通信の土台
- **Revm**: EVM実行エンジン
- **Reth**: ノード全体の実装

この3層が分かれているため、
「RPCクライアントだけ使う」「実行エンジンだけ差し替える」「ノード全体を拡張する」が可能になる。

## 具体例
Foundryの実行系はRevmを使っている。
つまり開発ツールで学んだ実行モデルと、本番ノード側の理解がつながる。

## 失敗例（誤解）
「Rethが主流シェアだから学ぶ」は誤り。
主な価値はシェアではなく、**モジュール性と拡張可能性**にある。

## 演習（1問）
次の作業を誰が担当するか答える。
1. 
署名してRPC送信する
2. EVM命令を実行する
3. P2P同期してブロックを取り込む

## まとめ
- Rust Ethereumは「部品化されたEVMスタック」。
- Alloy / Revm / Reth は役割が異なる。
- 学ぶ順は Alloy → Revm → Reth が最短。`,
                },
                {
                  title: 'Reth・Revm・Alloyの三つ巴',
                  slug: 'three-pillars-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 20,
                  content: `# Reth・Revm・Alloyの三つ巴

## 問い
3つの名前をどう切り分ければ、設計判断で迷わなくなるか？

## 原理（最小モデル）
責務の境界で覚える。

- **Alloy**: Ethereumと会話するための言語（型・署名・RPC）
- **Revm**: EVMの計算本体
- **Reth**: ネットワークと実行を統合したノード

依存方向は次の通り。

\`Reth -> Revm -> Alloy\`

## 具体例
「取引前シミュレーションを高速化したい」はRevm領域。
「ノードに監視ロジックを差し込みたい」はReth領域。
「型安全にRPCを書きたい」はAlloy領域。

## 失敗例（誤解）
「Rethを学べばAlloyは不要」は誤り。
実務で最も頻繁に触るのは、むしろAlloyである。

## 演習（1問）
次のタスクをAlloy / Revm / Rethに分類する。
- EIP-712署名
- ローカルでEVM実行
- ノード同期の拡張

## まとめ
- 3者は競合ではなく階層分担。
- 設計の迷いは責務境界で解消できる。
- 実務導入はAlloy起点が最短。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
