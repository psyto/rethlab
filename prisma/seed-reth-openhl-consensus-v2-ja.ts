import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlConsensusV2JA(prisma: PrismaClient) {
  const tags = ['reth', 'malachite', 'bft', 'evm', 'openhl', 'expert', 'v2'];

  await prisma.course.create({
    data: {
      slug: 'reth-openhl-consensus-v2-ja',
      title: 'Step 1. Consensus v2 — Workspace最短構築',
      description:
        'OpenHLの土台となるWorkspace構築を、依存設計の原理に絞って短く学ぶ。',
      difficulty: 'EXPERT',
      duration: 55,
      xpReward: 160,
      track: 'diy-perp',
      tags,
      isPublished: true,
      sortOrder: 601,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Foundations v2',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'レッスン1 v2 — Workspace + Reth + Malachite の最小原理',
                  slug: 'openhl-workspace-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 70,
                  content: `# レッスン1 v2 — Workspace + Reth + Malachite の最小原理

## 問い
なぜ OpenHL の最初の1手は「機能実装」ではなく「依存固定」なのか？

## 原理（最小モデル）
OpenHL 初期構築の本質は、**コードを書く前に再現性を固定する**こと。

- 再現性の単位は「crate単体」ではなく **workspace全体**
- Reth/Malachite は巨大依存なので、途中でぶつかると手戻りが大きい
- 本番系L1では semver より **commit SHA pin** が優先される

つまり最初のゴールは「機能」ではなく、
**依存グラフが安定して解決できる土台**を作ることになる。

## 具体例
このレッスンで通すべき最小の完了条件は 1 つだけ。

\`cargo check --workspace\`

これが通る状態を先に作ると、後続レッスンは設計そのものに集中できる。

## 失敗例（誤解）
「まず actor や bridge を書き始めれば速い」は誤り。
依存固定を後回しにすると、途中でReth系の衝突が出て
実装と環境調整が混ざり、原因分離が難しくなる。

## ステップで組み立てる
### Step 0: 前提を固定する
\`\`\`bash
rustc --version
cargo --version
\`\`\`
期待出力: Rust/Cargo のバージョンが表示される。  
失敗時修正: toolchain 未導入なら \`rustup\` を先に導入。

### Step 1: 最小 workspace を作る
\`\`\`bash
mkdir -p ~/code/my-openhl-v2 && cd ~/code/my-openhl-v2
cargo init --lib
rm Cargo.toml src/lib.rs
mkdir -p crates/types/src bin/openhl/src
\`\`\`
この時点の目的は、既存資産を流用せず「構成だけ」を検証できる土台を作ること。

### Step 2: 2 crate 構成を定義する
ルート \`Cargo.toml\` を次で作る。
\`\`\`toml
[workspace]
resolver = "3"
members = ["crates/types", "bin/openhl"]
\`\`\`
\`crates/types/Cargo.toml\` と \`bin/openhl/Cargo.toml\` を作成し、どちらも \`[package]\` と \`[lints]\` を定義する。
そのうえで \`bin/openhl/src/main.rs\` に次を書く。
\`\`\`rust
fn main() { println!("openhl-v2 bootstrap"); }
\`\`\`
\`members\` はビルド単位の境界。ここがズレると path 解決エラーや未ビルドが起きる。
\`resolver = "3"\` は feature 解決規則を固定し、後続で巨大依存を追加しても解決挙動が揺れにくくなる。

### Step 3: 検証する
\`\`\`bash
cargo check --workspace
cargo run --bin openhl
\`\`\`
ここは「実装」ではなく「構成」の確認。最小 \`main\` にすることで、エラー原因を workspace 構成と実装ロジックで切り分けやすくする。
期待出力: \`openhl-v2 bootstrap\` が表示される。  
失敗時修正: \`members\` の path とディレクトリ名の一致を再確認する。

### 合格基準
- \`cargo check --workspace\` が \`Finished\` になる
- 実行時に \`openhl-v2 bootstrap\` が表示される

## まとめ（3行）
- OpenHL の初手は「機能追加」ではなく「再現性固定」。
- 依存は workspace で一元管理し、SHA pinで揺れを止める。
- 先に \`cargo check --workspace\` を通すのが最短ルート。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
