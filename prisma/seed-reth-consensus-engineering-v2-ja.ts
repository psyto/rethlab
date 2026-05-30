import { PrismaClient } from '@prisma/client';

export async function seedRethConsensusEngineeringV2JA(prisma: PrismaClient) {
  const tags = ['reth', 'consensus', 'bft', 'l1', 'expert', 'v2'];

  await prisma.course.create({
    data: {
      slug: 'reth-consensus-engineering-v2-ja',
      title: 'Consensus Engineering v2 — Reth Consensus Trait集中編',
      description:
        'RethのConsensus traitを、検証責務の原理に絞って短く理解する。',
      difficulty: 'ADVANCED',
      duration: 48,
      xpReward: 150,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 301,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Reth実装読解 v2',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Reth `Consensus` traitを読む v2',
                  slug: 'consensus-reth-trait-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 24,
                  xpReward: 65,
                  content: `# Reth \`Consensus\` traitを読む v2

## 問い
Rethノードで \`Consensus\` trait は何を保証し、何を保証しないのか？

## 原理（最小モデル）
\`Consensus\` trait は、**ブロック受理の境界面**である。

ここで検証するのは主に次の2層。

- ヘッダ妥当性（時刻・難易度/PoS条件・親整合）
- execution結果との整合（state transition前提の一致）

重要なのは、\`Consensus\` が「全システムを実装」するのではなく、
**受理判定の契約（contract）を定義する**点。

## 具体例
Rethはこの境界を差し替え可能にしているため、
L1ごとに独自ルール（例: PoL系、BFT系）を注入できる。

## 失敗例（誤解）
「Consensus traitを差し替えればネットワーク層まで自動で合う」は誤り。
実際は、forkchoice・payload供給・検証責務の接続を
周辺コンポーネントと整合させる必要がある。

## ステップで組み立てる
### Step 0: 読解対象を固定する
\`\`\`bash
cd ~/code
git clone https://github.com/paradigmxyz/reth reth-reference
cd reth-reference
\`\`\`
期待出力: リポジトリ取得完了。  
失敗時修正: clone できない場合はネットワークと権限を確認。

### Step 1: trait の骨格を読む
\`\`\`rust
pub trait Consensus<B: Block>: HeaderValidator<B::Header> {
    fn validate_body_against_header(...);
    fn validate_block_pre_execution(...);
}

pub trait FullConsensus<N: NodePrimitives>: Consensus<N::Block> {
    fn validate_block_post_execution(...);
}
\`\`\`
この形だけで重要な設計が読める。pre/body/post の3段で検証を分離し、post だけ execution 結果を受け取る。

### Step 2: pre と post の違いを固定する
\`\`\`rust
fn validate_block_pre_execution(&self, block: &SealedBlock<B>) -> Result<(), Self::Error> {
    // 形式・基本整合性を先に弾く
    Ok(())
}
\`\`\`
- pre: EVM実行なしで判定できる整合性（形式・基本妥当性）
- post: 実行後にしか判定できない整合性（state root / gas / receipts）
この分離があることで、壊れたブロックを安価に早期 reject できる。

### Step 3: HeaderValidator 境界を確認する
\`\`\`rust
pub trait HeaderValidator<H> {
    fn validate_header(&self, header: &SealedHeader<H>) -> Result<(), ConsensusError>;
    fn validate_header_against_parent(
        &self,
        header: &SealedHeader<H>,
        parent: &SealedHeader<H>,
    ) -> Result<(), ConsensusError>;
}
\`\`\`
\`Consensus: HeaderValidator\` によって、「ヘッダ単体検証」と「ブロック全体検証」の境界を明示している。この境界を先に掴むと実装差し替え時の影響範囲を読み違えにくい。

### Step 4: 接続順序を検証する
\`\`\`rust
let pre = consensus.validate_block_pre_execution(&block)?;
let exec = executor.execute(block.clone())?;
consensus.validate_block_post_execution(&recovered_block, &exec)?;
\`\`\`
1. trait 定義で検証フェーズを把握  
2. Ethereum 実装で各フェーズの具体チェックを確認  
3. 呼び出し側で pre→execution→post の接続順序を確認  
この順で読むと、「どこで壊れるか」を追跡しやすい。

### Step 5: 実ファイル検索で照合する
\`\`\`bash
rg "validate_block_pre_execution|validate_block_post_execution" crates -n
\`\`\`
期待出力: trait 定義と呼び出し地点が確認できる。  
失敗時修正: 先に trait 定義側を開いてシンボル名を再確認する。

### 合格基準
- pre/body/post 各段の責務を1文で説明できる
- 「どの入力が post でしか得られないか」を説明できる

## まとめ（3行）
- \`Consensus\` は受理契約であり、実装全体ではない。
- 差し替え可能性はL1カスタム化の中核。
- trait差し替え時は周辺責務との境界整合が必須。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
