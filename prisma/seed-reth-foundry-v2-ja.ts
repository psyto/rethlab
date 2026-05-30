import { PrismaClient } from '@prisma/client';

export async function seedRethFoundryV2JA(prisma: PrismaClient) {
  const tags = ['foundry', 'forge', 'anvil', 'cast', 'solidity', 'testing', 'v2'];

  await prisma.course.create({
    data: {
      slug: 'mastering-foundry-v2-ja',
      title: 'Foundryを極める v2 — 中級読解コース',
      description:
        'Foundryのテスト実行モデルを、重要コードを段階的に読みながら理解する。',
      difficulty: 'INTERMEDIATE',
      duration: 60,
      xpReward: 180,
      track: 'reth-stack',
      tags,
      isPublished: true,
      sortOrder: 191,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Foundry読解 v2',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'forge test をステップで組み立てる v2',
                  slug: 'foundry-forge-test-basics-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 28,
                  xpReward: 70,
                  content: `# forge test をステップで組み立てる v2

## 問い
なぜ Foundry は「速く回せるテスト規律」を作りやすいのか？

## 原理（最小モデル）
Foundry の強みは、テストが EVM 実行と近い距離で回ること。

- 単一コマンドで build + test を回せる
- fuzz / invariant が同じ流れで実行できる
- 失敗ケースを再現しやすい

## 失敗例（誤解）
「assert を増やせば品質が上がる」は誤り。
重要なのは、保存則を定義して反例探索できる形にすること。

## ステップで組み立てる
### Step 0: Foundry 設定を固定する
\`\`\`toml
[fuzz]
runs = 256
\`\`\`
期待出力: \`foundry.toml\` に設定が保存される。  
失敗時修正: 設定セクション名のスペルミスを確認。

### Step 1: 最小テストを書く
\`test/Counter.t.sol\` に基本テストを置く。\`assertEq\` で期待値を固定する。

\`\`\`solidity
function test_Increment() public {
    counter.increment();
    assertEq(counter.number(), 1);
}
\`\`\`

ここでの目的は「成功パスの基準点」を作ること。  
重要行は \`assertEq(counter.number(), 1)\`。この1行が状態遷移の仕様になる。

失敗しやすい点:
- 初期状態前提を暗黙にする（setUp不足）
- 複数責務を1テストに混ぜる

### Step 2: 失敗系を先に定義する
\`vm.expectRevert\` で negative path を固定する。

\`\`\`solidity
function test_RevertWhen_DecrementBelowZero() public {
    vm.expectRevert();
    counter.decrement();
}
\`\`\`

ここでの目的は「禁止条件」を仕様化すること。  
重要行は \`vm.expectRevert()\`。呼び出し前に置く順序が必須。

失敗しやすい点:
- \`expectRevert\` を呼び出し後に置く
- revert reason を過剰に固定して保守性を落とす

### Step 3: fuzz に拡張する
入力空間を広げ、反例探索へ切り替える。

\`\`\`solidity
function testFuzz_SetNumber(uint256 x) public {
    counter.setNumber(x);
    assertEq(counter.number(), x);
}
\`\`\`

ここでの目的は「例ベース」から「性質ベース」へ移すこと。  
重要行は \`assertEq(counter.number(), x)\`。任意入力で成り立つべき性質を表す。

失敗しやすい点:
- 前提条件が必要なのに \`vm.assume\` を置かない
- 正常系と異常系の性質を同一テストで混ぜる

### Step 4: 実行確認
\`\`\`bash
forge test -vvv
\`\`\`

\`-vvv\` を使う理由は、失敗時に前提崩壊点を即特定するため。  
テスト名・失敗入力・スタック情報の読み方をセットで確認する。

### Step 5: 失敗時の修正ポイント
1. setUp で初期値を明示する  
2. expectRevert の位置を呼び出し前に置く  
3. fuzz 前提が必要なら \`vm.assume\` を追加する

### 合格基準
- 正常系・失敗系・fuzz の3系統を1つずつ実装できる
- 失敗時にどの前提が壊れたか説明できる

## まとめ（3行）
- Foundry は「速く回す」ためのテスト環境。
- assert 追加より、性質（保存則）設計が先。
- 正常系→失敗系→fuzz の順で組むと壊れにくい。`,
                },
                {
                  title: 'forge invariant をステップで組み立てる v2',
                  slug: 'foundry-forge-invariant-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 75,
                  content: `# forge invariant をステップで組み立てる v2

## 問い
なぜ単体テストが通っても、シーケンス実行で壊れるのか？

## 原理（最小モデル）
invariant は「1回の呼び出し」ではなく「呼び出し列」を検証する。

- handler が操作列を生成する
- 各ステップ後に不変条件を評価する
- 反例は最小化されて再現可能になる

## 失敗例（誤解）
「fuzz があるなら invariant は不要」は誤り。
fuzz 単体は単発入力中心で、状態遷移列の破綻を見逃しやすい。

## ステップで組み立てる
### Step 0: invariant 設定を foundry.toml に入れる
\`\`\`toml
[invariant]
runs = 256
depth = 64
fail_on_revert = false
\`\`\`
目的は探索規模を固定し、再現可能な実験条件を先に作ること。  
失敗しやすい点: default 設定のまま比較して run ごとの挙動差を見失う。

### Step 1: テストケースの雛形を作る
\`\`\`solidity
contract InsuranceFundInvariantTest is Test {
    InsuranceFund fund;
    Handler handler;
}
\`\`\`
目的は invariant 対象を1つのテストコントラクトへ閉じ込めること。  
失敗しやすい点: unit test と invariant test を同じファイルで混在させ、責務が崩れる。

### Step 2: テスト対象を固定する
\`\`\`solidity
function setUp() public {
    fund = new InsuranceFund(1_000_000);
}
\`\`\`
目的は探索前に初期状態を固定すること。  
失敗しやすい点: setUp を省略してランダム初期状態のまま比較してしまう。

### Step 3: 不変条件を定義する
\`\`\`solidity
function invariant_TotalConserved() public {
    assertEq(fund.balance() + fund.withdrawn(), fund.initialBalance());
}
\`\`\`
目的は検証対象を「値」ではなく「性質」に切り替えること。  
重要行は \`assertEq(...)\` の左右。保存則を壊さない式になっているかを先に点検する。

### Step 4: Handler を作る
\`\`\`solidity
contract Handler {
    InsuranceFund fund;
    function withdraw(uint64 amount) external { fund.withdrawShortfall(amount); }
}
\`\`\`
目的は呼び出し列の生成器を分離すること。ここで状態遷移の幅が決まる。  
失敗しやすい点: Handler が1操作しか持たず、探索幅が狭すぎる。

### Step 5: targetContract を接続する
\`\`\`solidity
function setUp() public {
    handler = new Handler(fund);
    targetContract(address(handler));
}
\`\`\`
重要行は \`targetContract\`。invariant runner に探索対象を登録する。  
失敗しやすい点: target 登録漏れで invariant が実質未実行になる。

### Step 6: 実行して反例を読む
\`\`\`bash
forge test --match-test invariant_ -vvv
\`\`\`
期待出力は invariant テストが green か、失敗時に call sequence が表示されること。  
失敗時は「どの呼び出し列で壊れたか」を先に読む。

### Step 7: 失敗時の修正ポイントを適用する
1. 保存則の式を再確認（項の取り違え）
2. Handler の操作集合を増やす
3. 事前条件が必要な操作には \`vm.assume\` を入れる

### 合格基準
- foundry.toml 設定 / invariant / handler / targetContract の4点を実装できる
- 失敗列から壊れた保存則を説明できる

## まとめ（3行）
- invariant は状態遷移列に対する仕様検証。
- handler 分離が探索品質を決める。
- 反例を読めることが実運用品質につながる。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
