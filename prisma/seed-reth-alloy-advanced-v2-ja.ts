import { PrismaClient } from '@prisma/client';

export async function seedRethAlloyAdvancedV2JA(prisma: PrismaClient) {
  const tags = ['alloy', 'rust', 'advanced', 'rpc', 'provider', 'v2'];

  await prisma.course.create({
    data: {
      slug: 'alloy-advanced-v2-ja',
      title: 'Inside Alloy v2 — Provider設計の芯',
      description:
        'Providerトレイト設計を、責務分離の観点で短く理解する。',
      difficulty: 'INTERMEDIATE',
      duration: 45,
      xpReward: 140,
      track: 'alloy-advanced',
      tags,
      isPublished: true,
      sortOrder: 201,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Alloyの内側 v2',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: '`Provider` トレイトをステップで組み立てる v2',
                  slug: 'alloy-provider-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 22,
                  xpReward: 60,
                  content: `# \`Provider\` トレイトをステップで組み立てる v2

## 問い
なぜ alloy は単純なRPC関数群ではなく、\`Provider<N>\` というトレイト中心設計なのか？

## 原理（最小モデル）
設計課題は常に3軸ある。

1. **チェーン差分**（Ethereum / Optimism / L2独自型）
2. **トランスポート差分**（HTTP / WS / IPC）
3. **送信前処理**（署名・nonce・gas 補完）

この3軸を同時に扱うために、alloy は次の分担を取る。

- \`Network\`：チェーン固有型の辞書
- \`Provider\`：RPC操作の一貫API
- \`RootProvider\`：実トランスポートの根
- \`FillProvider\`：署名/補完の層を合成

## 具体例
\`Provider<N: Network = Ethereum>\` の形により、
通常利用はデフォルトEthereumで簡潔に、
L2利用時だけ型を明示できる。

## 失敗例（誤解）
「HTTP用ProviderとWS用Providerを別々に大量実装する」は誤り。
重複実装が増え、メソッド追加時に差分バグが出やすい。

## ステップで組み立てる
### Step 0: 素朴な関数
\`\`\`rust
async fn get_balance(url: &str, addr: Address) -> Result<U256> {
    // HTTP固定 + Ethereum前提
    todo!()
}
\`\`\`
URL/Transport/Chain差分が混ざるのが問題の出発点。

### Step 1: Provider 抽象
\`\`\`rust
pub trait Provider {
    fn get_balance(&self, address: Address) -> Result<U256>;
    fn get_block_number(&self) -> Result<u64>;
}
\`\`\`
呼び出し側を実装詳細から分離する。

### Step 2: Network 抽象
\`\`\`rust
pub trait Network {
    type TransactionRequest;
    type ReceiptResponse;
}
\`\`\`
チェーン固有差分を関連型に閉じ込める。

### Step 3: Provider を Network で一般化
\`\`\`rust
pub trait Provider<N: Network = Ethereum> {
    fn get_balance(&self, address: Address) -> Result<U256>;
    fn send_transaction(&self, tx: N::TransactionRequest) -> SendTransaction<N>;
}
\`\`\`
ここが Provider の境界。入力型を \`N\` 側に寄せる。

### Step 4: Transport 分離
\`\`\`rust
pub trait Transport {
    fn send(&self, req: RpcRequest) -> Result<RpcResponse>;
}
\`\`\`
HTTP/WS/IPC の差を Provider 本体から外す。

### Step 5: RootProvider 導入
\`\`\`rust
pub trait Provider<N: Network = Ethereum> {
    fn root(&self) -> &RootProvider<N>;
    fn get_balance(&self, address: Address) -> RpcWithBlock<Address, U256> { /* ... */ }
}
\`\`\`
\`root()\` は実送信レイヤへの共通入口。重複実装を減らす。

### Step 6: FillProvider 合成
\`\`\`rust
pub struct FillProvider<F, P, N>
where
    F: TxFiller<N>,
    P: Provider<N>,
    N: Network,
{
    filler: F,
    inner: P,
    _n: core::marker::PhantomData<N>,
}
\`\`\`
継承ではなく合成で、署名/nonce/gas 補完を挿入する。

### Step 7: 完成形
\`\`\`rust
type AppProvider = FillProvider<NonceFiller, RootProvider<Ethereum>, Ethereum>;
\`\`\`
読む順序は、\`Provider\` → \`Network\` → \`root()\` → Fill 層。

## ステップで組み立てる（実コード追跡）
### Step 1: alloy ソースを取得する
\`\`\`bash
cd ~/code
git clone https://github.com/alloy-rs/alloy alloy-reference
cd alloy-reference
\`\`\`

### Step 2: 実コードで責務を追う
次を実行して、定義場所を開く。
\`\`\`bash
rg "trait Provider<|trait Network|struct RootProvider|FillProvider" crates -n
\`\`\`
出てきたファイルを開き、各型の責務を1行メモする。

### Step 3: 小さな差分を作る
\`Provider\` のメソッドを1つ選び、以下を手で書く（新規メモファイルで可）。
1. そのメソッドが依存する \`Network\` 型
2. \`root()\` 経由で辿る先
3. filler が介入するとしたらどこか

### 合格基準
- \`rg\` で4要素（Provider/Network/RootProvider/FillProvider）を発見できる
- 1メソッドについて「型→送信→補完」の流れを説明できる

## まとめ（3行）
- \`Provider\` はRPC機能、\`Network\` は型、\`Transport\` は搬送路。
- \`root()\` と層合成で拡張点を局所化できる。
- 継承より合成を採ることで実装重複を抑える。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
