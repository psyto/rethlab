import { PrismaClient } from '@prisma/client';

export async function seedRethRevmAdvancedV2JA(prisma: PrismaClient) {
  const tags = ['revm', 'rust', 'advanced', 'opcode', 'evm-internals', 'v2'];

  await prisma.course.create({
    data: {
      slug: 'revm-advanced-v2-ja',
      title: 'Inside Revm v2 — 中級読解コース',
      description:
        'Revmのopcode実装を、重要行を追いながら段階的に読む。',
      difficulty: 'INTERMEDIATE',
      duration: 62,
      xpReward: 190,
      track: 'revm-advanced',
      tags,
      isPublished: true,
      sortOrder: 211,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Revm読解 v2',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'add opcode をステップで組み立てる v2',
                  slug: 'revm-add-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 75,
                  content: `# add opcode をステップで組み立てる v2

## 問い
なぜ Revm の add 実装は短いのに、設計的には重いのか？

## 原理（最小モデル）
add は「pop 2 / push 1」だが、実装品質は次で決まる。

- 型境界（どの実行文脈でも使えるか）
- スタック操作回数（ホットパス最適化）
- overflow 挙動（EVM準拠）

## 失敗例（誤解）
「\`a + b\` なら十分」は誤り。
EVM は 2^256 の wrapping を要求するため、通常加算は不一致を生む。

## ステップで組み立てる
### Step 0: 読解対象を固定する
\`\`\`bash
cd ~/code
git clone https://github.com/bluealloy/revm revm-reference
cd revm-reference
\`\`\`
期待出力: リポジトリが取得できる。  
失敗時修正: clone 失敗時はネットワーク/権限を確認。

### Step 1: 素朴実装
\`\`\`rust
let a = stack.pop().ok_or(StackUnderflow)?;
let b = stack.pop().ok_or(StackUnderflow)?;
stack.push(a + b);
\`\`\`

ここでの目的は意味を固定すること。  
重要行は \`stack.push(a + b)\`。数学的には正しいが、実装としてはまだ粗い。

失敗しやすい点:
- underflow を未処理にする
- overflow 挙動を Rust 既定に任せる

### Step 2: 参照更新へ最適化
\`\`\`rust
let a = stack.pop().ok_or(StackUnderflow)?;
let b = stack.last_mut().ok_or(StackUnderflow)?;
*b = a.wrapping_add(*b);
\`\`\`

ここでの目的はホットパスの操作回数を減らすこと。  
重要行は \`last_mut()\` と \`wrapping_add\`。push を減らしつつ EVM挙動を維持する。

失敗しやすい点:
- \`+\` を使って debug/release で挙動が割れる
- \`last_mut\` 前に空スタックを考慮しない

### Step 3: ジェネリック境界を読む
\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    // ...
    Ok(())
}
\`\`\`

ここでの目的は「同じ add を複数実行文脈で再利用する」こと。  
重要行は \`IT: ITy\` と \`H: ?Sized\`。実行モード差分と trait object 許容を表す。

失敗しやすい点:
- シグネチャの意味を読まずに本体だけ追う
- \`?Sized\` を不要と誤解する

### Step 4: 実装意味を固定する
\`\`\`rust
pub fn add<IT: ITy, H: ?Sized>(context: Ictx<'_, H, IT>) -> Result {
    let op1 = context.interpreter.stack.pop().ok_or(StackUnderflow)?;
    let op2 = context.interpreter.stack.last_mut().ok_or(StackUnderflow)?;
    *op2 = op1.wrapping_add(*op2);
    Ok(())
}
\`\`\`
- \`IT\`: 実行モード差分
- \`H: ?Sized\`: trait object 許容
- \`wrapping_add\`: EVM一致挙動

### Step 5: 検証する
\`\`\`bash
cargo check -p revm-interpreter
\`\`\`
期待出力: interpreter crate のビルドが通る。  
失敗時修正: ジェネリック境界の型不一致を先に疑う。

この3点を説明できれば、add だけでなく他 opcode の読解速度も上がる。

### 合格基準
- add 実装の3つの設計理由を説明できる
- naive 実装と最適化実装の差を説明できる

## まとめ（3行）
- add は最小だが、EVM準拠の核心が詰まる。
- 最適化は「回数削減」と「挙動一致」の両立。
- ジェネリック境界を読むと Revm 全体が理解しやすくなる。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
