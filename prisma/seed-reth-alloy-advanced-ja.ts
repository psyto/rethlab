import { PrismaClient } from '@prisma/client';

export async function seedRethAlloyAdvancedJA(prisma: PrismaClient) {
  const tags = ['alloy', 'rust', 'advanced', 'rpc', 'provider'];

  await prisma.course.create({
    data: {
      slug: 'alloy-advanced-ja',
      title: 'Inside Alloy — Rust Ethereum ライブラリを読む',
      description:
        'alloy のソースを 1 行ずつ読み解く — Rust EVM スタックの **ネットワーク層 + 認証層** を、`Provider`・`Network`・`Signer`/`Filler` のトレイトファミリ越しに歩く。3 つの独立した中級コース（Revm・Reth・Alloy）の 1 つで、受講順は自由。alloy は Reth と dapp が依拠する基盤なので、Rust で Ethereum を扱うあらゆる場面で本コースは効いてくる。',
      difficulty: 'INTERMEDIATE',
      duration: 145,
      xpReward: 385,
      track: 'alloy-advanced',
      tags,
      isPublished: true,
      sortOrder: 1210,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Alloyの内側',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'レッスン0 — Inside Alloy へようこそ',
                  slug: 'alloy-advanced-welcome-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# レッスン0 — Inside Alloy へようこそ

## 問い

これは RethLab の 3 つの独立した中級ティアコースの 1 つ。**Alloy は他のすべてが依拠する基盤** — Reth は alloy の型を使い、Revm は alloy の primitive を使い、Rust から Ethereum と通信する dapp / MEV ボット / インデクサはすべて alloy の \`Provider\` を使う。**どこから始め、何を前提に読むか？**

## 原理（最小モデル）

- **3 中級コースの位置.** Inside Revm（EVM エンジン）+ Inside Reth（Staged Sync・ExEx・SDK）+ **Inside Alloy**（このコース、Provider・Network・Signer）。受講順は自由、3 つは独立。
- **3 トピックチェーン.** Provider（Ethereum ノードと話す中心トレイト）+ Network（Ethereum / Optimism / カスタム L2 を同 API で扱う仕組み）+ Signer/Filler（署名・ガス推定・nonce 管理を層状プロバイダに合成）。各々が「積み上げ → ウォークスルー → クイズ → ドリル」の 4 部構成。
- **教えるのは「alloy のソースを読む」スキル.** Inside Revm が revm を読む力を養うのと同じ形。Provider を *使う* ではなく *読む* ことを学ぶ。
- **前提知識 2 領域.** 中級 Rust（generics + trait bounds + 関連型 + Arc + async/Future + auto_impl）+ alloy をユーザーとして使った経験（Provider::get_balance、ProviderBuilder、tx 署名）。
- **EVM 内部の知識は不要.** Alloy は EVM の上で動く — 通信相手はノードであって opcode ではない。

## 具体例

3 中級コースの分担:

| コース | 焦点 |
| :--- | :--- |
| Inside Revm | EVM エンジン内部 — 未受講なら先に推奨 |
| Inside Reth | Reth: Staged Sync・ExEx・Reth SDK |
| **Inside Alloy**（ここ） | Alloy: Provider・Network・Signer |

セットアップ（一度だけ）:

\`\`\`bash
# 1. alloy-rs/alloy を clone
git clone https://github.com/alloy-rs/alloy

# 2. 動く cargo ツールチェイン確認
rustc --version

# 3. セカンドモニタか分割端末（読みながらソース参照）
\`\`\`

## ステップで組み立てる

### Step 1: 3 トピックチェーンを把握

Provider → Network → Signer。各々 buildup + walkthrough + quiz + drill の 4 段。

### Step 2: 前提を自己チェック

中級 Rust + alloy 使用経験。心もとなければ Fundamentals（\`alloy-primitives-signing\`、\`alloy-provider\`）に戻る。

### Step 3: セットアップを済ませる

alloy clone + cargo 確認 + 別画面でソース参照。「Find in repo」プロンプトはリポを実際に開いていないと意味がない。

### Step 4: 終了後の到達点

alloy のホットパスを読みこなし、カスタム Provider レイヤーを構築できる — MEV パイプライン / インデクサ / Reth-SDK App-chain が本番投入しているコード相当。

## まとめ（3行）

- Inside Alloy = RethLab 3 中級コースの 1 つ、Alloy は他すべて（Reth + Revm + dapp）が依拠する基盤、本コースは alloy ソースを *読む* スキル。
- 3 トピックチェーン（Provider / Network / Signer）+ Testing + 最終 quiz、各々 buildup + walkthrough + quiz + drill の 4 部構成。
- 前提 = 中級 Rust + alloy 使用経験、EVM 内部の知識は不要、セットアップ（alloy clone + cargo）を済ませて Lesson 1 「\`Provider\` トレイトをステップで組み立てる」から始める。
`,
                },
                {
                  title: 'レッスン1 — `Provider` トレイトをステップで組み立てる',
                  slug: 'alloy-provider-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン1 — \`Provider\` トレイトをステップで組み立てる

## 問い

Ethereum ノードと通信する Rust プログラム — MEV ボット / インデクサ / dapp バックエンド / Reth-SDK アプリ — は、すべて \`alloy-rs/alloy\` の \`Provider\` トレイトを経由する。**生 JSON-RPC は直接叩かず、必ずこの 1 つのトレイトに集約 — 6 つの新概念が一度に降ってくる、組み立てると理由が見えるか？**

## 原理（最小モデル）

- **素朴な RPC クライアントの 3 失敗.** URL ハードコード + トランスポートハードコード（HTTP のみ）+ チェーンハードコード（Ethereum 形式）。修正 = **3 軸をトレイトに抽象化**。
- **Step 1: メソッドだけのトレイト.** Ethereum で動くが Optimism で破綻（tx envelope が違う）。
- **Step 2: \`Network\` トレイトで型レベル辞書.** \`type TxEnvelope\` / \`type ReceiptEnvelope\` 等、関連型でチェーン固有型を一束に。Provider に \`N: Network\` ジェネリックパラメータ追加。
- **\`N: Network = Ethereum\` デフォルト.** ユーザーの 99% は Ethereum、デフォルトで楽にし Optimism のみ明示。
- **Step 3: トランスポート抽象トレイト.** プロバイダ実装 1 つで HTTP/WS/IPC 全対応、struct ごとに書かない。
- **Step 4: \`RootProvider\` + \`root()\`.** ラッパープロバイダが 30 メソッドを再実装せずトランスポート委譲、書くのは 1 行（\`self.inner.root()\`）。
- **Step 5: \`FillProvider\` / \`Filler\`.** Signer / Nonce / Gas / ChainId を合成可能な層に、ビルダーで積層。
- **Step 6: \`#[auto_impl(&, &mut, Box, Rc, Arc)]\`.** \`Arc<P>\` がそのまま \`Provider\` として動く、タスク間で安価共有。

## 具体例

最終的に組み立てる本物のトレイトヘッダー:

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync {
    fn root(&self) -> &RootProvider<N>;

    fn client(&self) -> ClientRef<'_> { self.root().client() }
    fn weak_client(&self) -> WeakClient { self.root().weak_client() }

    fn get_block_number(&self) -> ProviderCall<NoParams, U64, BlockNumber> { /* ... */ }
    fn get_balance(&self, address: Address) -> RpcWithBlock<Address, U256> { /* ... */ }
    fn call(&self, tx: N::TransactionRequest) -> EthCall<N> { /* ... */ }
    fn send_transaction(&self, tx: N::TransactionRequest) -> SendTransaction<N> { /* ... */ }
    // ...他にも多数の RPC メソッド
}
\`\`\`

素朴な RPC クライアント:

\`\`\`rust
async fn get_balance(addr: Address) -> Result<U256, Box<dyn Error>> {
    let body = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        "params": [addr, "latest"],
        "id": 1,
    });
    let client = reqwest::Client::new();
    let resp = client.post("http://localhost:8545").json(&body).send().await?;
    let parsed: serde_json::Value = resp.json().await?;
    Ok(U256::from_str_radix(&parsed["result"].as_str().unwrap()[2..], 16)?)
}
\`\`\`

3 失敗:
1. **URL ハードコード** — Anvil / Alchemy / プライベートノード / フォークを切り替え不可
2. **トランスポートハードコード** — HTTP のみ、WebSocket / IPC は別関数
3. **チェーンハードコード** — Optimism の \`L1Cost\` フィールド / カスタム L2 の独自エンベロープに対応不可

Step 1（メソッドだけ）:

\`\`\`rust
#[async_trait]
pub trait Provider {
    async fn get_balance(&self, address: Address) -> Result<U256>;
    async fn get_block_number(&self) -> Result<u64>;
    async fn call(&self, tx: TransactionRequest) -> Result<Bytes>;
    async fn send_transaction(&self, tx: TransactionRequest) -> Result<TxHash>;
    // ... Ethereum RPC 動詞ごとに 30+ メソッド
}
\`\`\`

Step 2（Network ジェネリック追加）:

\`\`\`rust
pub trait Network: Send + Sync + 'static {
    type TxEnvelope: ...;
    type UnsignedTx: ...;
    type ReceiptEnvelope: ...;
    type Header: ...;
    type TransactionRequest: ...;
    type TransactionResponse: ...;
    type ReceiptResponse: ...;
    type HeaderResponse: ...;
    type BlockResponse: ...;
}

pub struct Ethereum;
impl Network for Ethereum { /* ...標準型... */ }

pub struct Optimism;
impl Network for Optimism { /* ...OP 固有型... */ }
\`\`\`

\`Provider\` を \`N\` でジェネリック化:

\`\`\`rust
pub trait Provider<N: Network> {
    async fn get_balance(&self, address: Address) -> Result<U256>;  // 全チェーン共通
    async fn call(&self, tx: N::TransactionRequest) -> Result<Bytes>;  // チェーン固有
    async fn send_transaction(&self, tx: N::TransactionRequest) -> Result<...>;  // チェーン固有
}
\`\`\`

Step 3（トランスポート抽象）:

\`\`\`rust
pub trait Transport {
    async fn send(&self, request: RpcRequest) -> Result<RpcResponse>;
}

// 1 つの具象プロバイダ、トランスポートでパラメータ化
pub struct ProviderImpl<T: Transport, N: Network> {
    transport: T,
    _network: PhantomData<N>,
}
\`\`\`

Step 4（\`RootProvider\` + \`root()\`）:

\`\`\`rust
pub trait Provider<N: Network = Ethereum> {
    fn root(&self) -> &RootProvider<N>;
    // すべての RPC メソッドのデフォルト impl は self.root() を経由
}

pub struct RootProvider<N: Network = Ethereum> {
    client: ClientRef<'_>,  // 実際のトランスポート
    _network: PhantomData<N>,
}
\`\`\`

Step 5（\`FillProvider\` / \`Filler\`）:

\`\`\`rust
pub struct FillProvider<F: Filler<N>, P: Provider<N>, N: Network> {
    filler: F,
    inner: P,
    _network: PhantomData<N>,
}

impl<F: Filler<N>, P: Provider<N>, N: Network> Provider<N> for FillProvider<F, P, N> {
    fn root(&self) -> &RootProvider<N> { self.inner.root() }

    async fn send_transaction(&self, mut tx: N::TransactionRequest) -> Result<...> {
        self.filler.fill(&mut tx).await?;
        self.inner.send_transaction(tx).await
    }
}
\`\`\`

ユーザービルダー:

\`\`\`rust
let provider = ProviderBuilder::new()
    .filler(NonceFiller)
    .filler(GasFiller)
    .signer(my_signer)
    .on_http(url);
\`\`\`

Step 6（\`auto_impl\` で \`Arc<P>\` 対応）:

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync { /* ... */ }
\`\`\`

\`Arc<P>\` が \`Provider\` として動く → MEV ボット / インデクサが 1 プロバイダを多タスク共有可能。

## 失敗例（誤解）

「メソッドだけのトレイトで Ethereum 専用 → 後で Optimism 用に別トレイト」— **間違い**。9 割同一になる、Network 抽象で型レベル辞書化が正解。

「Provider 実装ごとに HTTP / WS / IPC の 3 struct」— **間違い**。同じトレイトメソッドの本体コピペ = 筋が悪い。Transport トレイトで 1 implementation。

「ラッパーは 30 メソッド全部オーバーライド」— **間違い**。\`root()\` 1 行 + デフォルト実装が \`self.root()\` 経由 → ラッパー作者は **変えたいメソッドだけオーバーライド**。

## ステップで組み立てる

### Step 1: 素朴な RPC の 3 失敗

URL + トランスポート + チェーンがすべてハードコード。

### Step 2: 3 軸をトレイトに抽象化

トランスポート抽象 + Network 抽象 + デフォルト Ethereum。

### Step 3: \`N: Network = Ethereum\` デフォルト

ユーザー 99% は Ethereum、デフォルトで楽に + Optimism のみ明示。

### Step 4: \`RootProvider\` + \`root()\` の間接化

ラッパーは \`self.inner.root()\` の 1 行で 30 メソッド委譲完了。

### Step 5: \`FillProvider\` で層状合成

Signer / Nonce / Gas / ChainId を任意組み合わせ可能、ビルダーで積層。

### Step 6: \`auto_impl\` で 5 種ラッパー

\`&\` / \`&mut\` / \`Box\` / \`Rc\` / \`Arc\` → \`Arc<P>\` がタスク共有プリミティブ。

## 答え合わせ

- **デフォルト \`N: Network = Ethereum\` の利点**: ユーザーの 99% は Ethereum → \`Provider<Ethereum>\` ではなく \`Provider\` で済む。Optimism / カスタム L2 のユーザーだけ明示。**一般ケースを楽にし、まれなケースを明示にする**。
- **\`root()\` が解決する問題**: ラッパープロバイダ（SignerProvider / Filler）が **30 メソッドを再実装する代わりに 1 メソッド（\`self.inner.root()\`）で委譲**。トレイトのデフォルトメソッドが \`self.root()\` 経由でトランスポートにアクセス → ラッパー作者は変えたいメソッドだけオーバーライド。
- **\`auto_impl(Arc, ...)\` が本番で効く理由**: MEV ボット / インデクサ / dapp サーバーは 1 プロバイダを多タスクで共有したい → \`Arc<Provider>\` が自然 → Arc は安価クローン + 1000 ワーカーへ配布 + 全員同接続プール。\`auto_impl\` が \`Arc<P>\` の Provider 実装を自動生成。

## 合格基準

- 素朴な RPC の 3 失敗を即答できる。
- \`N: Network = Ethereum\` デフォルトの理由を言える。
- \`root()\` + デフォルト実装パターンが解く問題を即答できる。
- \`FillProvider\` で層状合成（Signer / Nonce / Gas / ChainId）を組める。
- \`auto_impl\` の 5 種ラッパーと \`Arc\` の本番用途を言える。

## まとめ（3行）

- \`Provider\` トレイト = 素朴な RPC の 3 失敗（URL / トランスポート / チェーン）を解決する 6 設計判断の積み重ね。
- \`N: Network = Ethereum\` ジェネリック + トランスポート抽象 + \`RootProvider\` / \`root()\` の間接化 + \`FillProvider\` 層状合成 + \`auto_impl(Arc, ...)\` でタスク共有。
- 次のレッスンで alloy 本体の \`crates/provider/src/provider/trait.rs\` を 1 行ずつ読み、各行を組み立てステップに対応づける。
`,
                },
                {
                  title: 'レッスン2 — 本物の `Provider` トレイトを読む',
                  slug: 'alloy-provider-walkthrough-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン2 — 本物の \`Provider\` トレイトを読む

## 問い

素朴な RPC から本物のトレイトの形まで \`Provider\` を組み立ててきた。**今度はソースを開く — 各行は組み立てステップにどう対応するか + 戻り値型の機構（\`ProviderCall\` / \`RpcWithBlock\` / \`EthCall\` / \`PendingTransactionBuilder\`）の存在理由は？**

## 原理（最小モデル）

- **\`Send + Sync\` スーパートレイト.** 本番ユーザーは \`Arc<P>\` をワーカータスクへクローン、これがないとコンパイル不可。
- **\`auto_impl(&, &mut, Box, Rc, Arc)\` の 5 種.** \`Provider\` は状態読み取りに \`&self\` のみ → 5 種すべてが動く。\`Database\`（revm）の \`&mut self\` 制約とは非対称。
- **\`root()\` だけが必須.** ほかは全部デフォルト実装、ラッパーは \`self.inner.root()\` の 1 行で済む。
- **\`client()\` と \`weak_client()\` の 2 種.** 短命 RPC は client（強参照、ライフタイム束縛）/ 長寿命タスク（サブスクリプション、\`tokio::spawn\`）は weak_client（Weak 参照、drop を妨げない）。
- **3 戻り値型パターン.** \`ProviderCall\`（パラメータなし）/ \`RpcWithBlock\`（ブロック選択）/ \`EthCall\`（多次元オプション）。各々が対応 RPC のオプション構造に合うビルダー。
- **\`SendTransaction\` の複数ステップ.** 1. 送信 → 2. 確認数設定 → 3. await でレシート。「送信 → 採掘 → 確定」ステートマシン。

## 具体例

トレイトヘッダー:

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync {
    fn root(&self) -> &RootProvider<N>;

    fn client(&self) -> ClientRef<'_> {
        self.root().client()
    }

    fn weak_client(&self) -> WeakClient {
        self.root().weak_client()
    }
    // ...多数の RPC メソッド、すべてデフォルト実装
}
\`\`\`

\`Database\` vs \`Provider\` の auto_impl 非対称:

| トレイト | auto_impl | メソッド signature |
| :--- | :--- | :--- |
| \`Database\`（revm） | \`&mut, Box\` | \`&mut self\` — キャッシュその場書き換え |
| \`Provider\`（alloy） | \`&, &mut, Box, Rc, Arc\` | \`&self\` — キャッシュは内部可変性で |

\`Database\` は \`&mut self\` → \`&\`/\`Rc\`/\`Arc\` 使えない（\`&mut T\` 取り出せない）。\`Provider\` は \`&self\` → 5 種全部 OK。

3 戻り値型パターン:

**\`get_block_number\`** — パラメータなし、シンプル結果:

\`\`\`rust
fn get_block_number(&self) -> ProviderCall<NoParams, U64, BlockNumber> {
    self.client().request_noparams("eth_blockNumber").into()
}
\`\`\`

\`ProviderCall<P, R, F>\` = future ビルダー、\`P\` = パラメータ型、\`R\` = 生応答型、\`F\` = ユーザー型。\`impl Future\` ではなく builder にすることで全 RPC メソッドが同じ形 + カスタマイズの仕組み常備。

**\`get_balance\`** — ビルダー経由でブロック選択:

\`\`\`rust
fn get_balance(&self, address: Address) -> RpcWithBlock<Address, U256> {
    RpcWithBlock::new_provider(move |block| {
        self.client().request("eth_getBalance", (address, block)).into()
    })
}
\`\`\`

\`RpcWithBlock\` がブロック選択ビルダー:

\`\`\`rust
provider.get_balance(addr).await                            // latest（デフォルト）
provider.get_balance(addr).block_id(1_000_000.into()).await // 過去
provider.get_balance(addr).hash(some_hash).await            // ブロックハッシュ
provider.get_balance(addr).pending().await                  // pending ブロック
\`\`\`

**\`call\`** — カスタマイズの幅大:

\`\`\`rust
fn call(&self, tx: N::TransactionRequest) -> EthCall<N> {
    EthCall::new(self.client(), tx)
}
\`\`\`

\`EthCall\` チェーン可能メソッド:
- \`.block(BlockId)\` — 特定ブロックに対する eth_call
- \`.overrides(state_overrides)\` — 状態オーバーライド付き（アカウントなりすまし、残高 / コード上書き）
- \`.gas(...)\`、\`.value(...)\`、\`.from(...)\` — tx 補正

3 戻り値型と RPC オプション構造の対応:

| RPC メソッド | オプションパラメータ | 戻り値型 |
| :--- | :--- | :--- |
| \`eth_blockNumber\` | なし | \`ProviderCall\`（await するだけ） |
| \`eth_getBalance\` | block | \`RpcWithBlock\`（オプション次元 1 つ） |
| \`eth_call\` | block, from, gas, value, state | \`EthCall\`（オプション次元が多数） |

デフォルト実装パターン:

\`\`\`rust
fn get_X(&self, args...) -> SomeReturnType {
    self.client().request("rpc_methodName", args).into()
}
\`\`\`

クライアント経由でリクエスト構築 → \`.into()\` で適切なビルダー / future 型へ変換 → **ラッパーが変えたい部分以外をオーバーライドしなくて良い** 理由。

\`send_transaction\` の複数ステップ:

\`\`\`rust
fn send_transaction(&self, tx: N::TransactionRequest) -> SendTransaction<N>
\`\`\`

ステートマシン:

\`\`\`rust
provider.send_transaction(tx).await?                       // tx ハッシュのみ、待たない
provider.send_transaction(tx).with_required_confirmations(3).get_receipt().await? // 3 ブロック待つ
\`\`\`

## 失敗例（誤解）

「\`Provider\` も \`Database\` も同じ auto_impl リスト」— **間違い**。\`Database\` = \`&mut, Box\`（2 種）/ \`Provider\` = \`&, &mut, Box, Rc, Arc\`（5 種）。差異は **\`&mut self\` vs \`&self\` のメソッド signature**、auto_impl リストは契約の厳密宣言。

「\`get_balance\` は \`impl Future<Output = U256>\` を返せば十分」— **間違い**。**\`RpcWithBlock\`** で await 前にブロック選択カスタマイズ可能、全 RPC が同じビルダー形 → カスタマイズ仕組みが常備。

「\`weak_client()\` は \`client()\` の劣化版」— **間違い**。長寿命タスク（サブスクリプション、\`tokio::spawn\`）用、Weak 参照は drop を妨げない → プロバイダ drop でタスクが気づいてシャットダウン。

## ステップで組み立てる

### Step 1: トレイトヘッダーの 3 注目点

\`Send + Sync\` + \`auto_impl(5 種)\` + \`root()\` のみ必須。

### Step 2: \`Database\` vs \`Provider\` 非対称の理由

\`&mut self\` vs \`&self\` のメソッド signature。

### Step 3: \`client()\` と \`weak_client()\` の使い分け

短命 RPC = client / 長寿命タスク = weak_client。

### Step 4: 3 戻り値型パターン

\`ProviderCall\`（オプション 0）/ \`RpcWithBlock\`（オプション 1 次元）/ \`EthCall\`（多次元）。

### Step 5: デフォルト実装パターン

\`self.client().request(name, args).into()\` の 1 行、ラッパーは変える部分のみ override。

### Step 6: \`send_transaction\` ステートマシン

送信 → 確認数設定 → await でレシート。

## 答え合わせ

- **\`Provider\` と \`Database\` の auto_impl 非対称の決め手**: メソッド signature の違い。\`Database::basic(&mut self, addr)\` は \`&mut\` → \`&\`/\`Rc\`/\`Arc\` から取り出せない。\`Provider::get_balance(&self, addr)\` は \`&self\` → 5 種すべて OK。**キャッシュ戦略の選択（その場書き換え vs 内部可変性）が auto_impl 幅を決める**。
- **\`get_balance\` が \`impl Future\` でなく \`RpcWithBlock\` を返す理由**: ほとんどの呼び出しは \`latest\` だが、ビルダーパターンで \`.block_id(N)\` / \`.hash(h)\` / \`.pending()\` で過去 / ハッシュ / pending を選択可能 → **メソッド 1 つで問い合わせ方多数**。関数引数で \`block_id\` を渡す設計だと全メソッドが煩雑化。
- **\`SignerProvider\` ラッパーが書くメソッド数**: \`send_transaction\` の **1 つだけ**（tx 署名 + inner に転送）。残り 29 はトレイトのデフォルト実装に任せる → それらは \`self.root()\` 経由でトランスポート取得。**30 メソッド本体書く代わりに 1 個**。

## 合格基準

- \`auto_impl\` の 5 種を即答できる。
- \`Database\` vs \`Provider\` の非対称を signature 差で説明できる。
- \`client()\` と \`weak_client()\` の使い分けを言える。
- 3 戻り値型と RPC オプション構造の対応を言える。
- \`send_transaction\` ステートマシン 3 ステップを順に言える。

## まとめ（3行）

- \`Provider\` ヘッダー = \`Send + Sync\` + \`auto_impl(5 種、\`Database\` の 2 種と非対称)\` + \`root()\` のみ必須 + デフォルト実装 30 メソッド。
- 3 戻り値型（\`ProviderCall\` / \`RpcWithBlock\` / \`EthCall\`）が各 RPC のオプション構造に合うビルダー、await 前カスタマイズで「1 メソッド + 問い合わせ方多数」を実現。
- \`SignerProvider\` は \`send_transaction\` 1 つだけ override、残り 29 はデフォルト実装が \`self.root()\` 経由で動く = ラッパー作者の 30 メソッド本体書きが 1 個に。
`,
                },
                {
                  title: 'クイズ — Provider',
                  slug: 'alloy-provider-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ — Provider

\`Provider\` トレイトの \`N: Network = Ethereum\` デフォルト、\`auto_impl(5 種)\`、\`root()\` 間接化、3 戻り値型（\`ProviderCall\` / \`RpcWithBlock\` / \`EthCall\`）、\`FillProvider\` 層状合成を確認する。

組み立てとウォークスルーにまたがる設計判断を問う 4 問。**クイズはうなずきでは通せない。** 2 問以上落としたら、ドリルへ進む前に \`Provider\` のステップに戻ること。
`,
                  quizQuestions: [
                    {
                      question: "`Provider` には `auto_impl(&, &mut, Box, Rc, Arc)`（5 種のラッパー）があり、Revm の `Database` には `auto_impl(&mut, Box)`（2 種のラッパー）しかない。この非対称を生んでいる、2 トレイト間の決定的な構造上の違いはなにか?",
                      options: [
                        "`Database` のほうが古く、auto_impl のリストは新しいラッパーが追加されるたびに少しずつ育ったから。",
                        "`Provider` は `Send + Sync` を要求するが `Database` は要求しない。そのぶん多くのラッパー型が有効になる。",
                        "`Provider` のメソッドは `&self` を取る（キャッシュは実装内の内部可変性に任せる）。`Database` のメソッドは `&mut self` を取り、実装がキャッシュをその場で書き換えられる — ただし `&mut self` は `&`/`Rc`/`Arc` を排除する。これらは `&T` しか取り出せないからだ。",
                        "auto_impl クレートは、失敗しうる操作を含むトレイトの `Rc`/`Arc` をサポートしないから。",
                      ],
                      correctIndex: 2,
                      explanation: "ラッパー互換性を決めているのはレシーバ型。`&mut self` は `&`/`Rc`/`Arc` を排除する — これらは `&T` しか取り出せないからだ。`&self` ならすべてのラッパーで動く — どれも `&T` は取り出せるから。どちらの設計も妥当 — その場キャッシュ（Database の選択）と共有並行アクセス（Provider の選択）のあいだのトレードオフ。Database は `&mut` を選ぶ — 各実装がキャッシュを `RwLock` で包む強制を避けるため。Provider は `&self` を選ぶ — 本番ユーザーが 1 つのプロバイダを `Arc<P>` 経由で多数のタスクから共有したいから。",
                    },
                    {
                      question: "`Provider<N: Network = Ethereum>` が、単なる `Provider<N: Network>` ではなく *デフォルト付きの* 型パラメータでパラメータ化されているのはなぜか?",
                      options: [
                        "Rust はジェネリックトレイトに対する `dyn Trait` を成立させるためにデフォルトを要求する。",
                        "ユーザーの大多数は Ethereum を使う。デフォルトのおかげで、皆が `Provider<Ethereum>` ではなく `Provider` と書ける — 書き換えるのは Optimism / カスタム L2 のユーザーだけ。",
                        "`Network` は本物のトレイトではなく、ドキュメント目的のマーカーにすぎないから。",
                        "Alloy は Ethereum 専用ライブラリとして始まり、ジェネリックパラメータは後方互換のための名残だから。",
                      ],
                      correctIndex: 1,
                      explanation: "デフォルト型パラメータは一般ケースを楽にし、まれなケースを明示的に保つ。デフォルトがなければ、Ethereum ユーザーは至るところで `Provider<Ethereum>` を書く羽目になる。トレイト自体は設計上 Ethereum 専用ではない — alloy は Optimism、Anvil、カスタム L2 を明示的にサポートしている — が、Ethereum が 95% のケースなので API はそちらに寄せている。Revm の `IT: ITy` ジェネリックと同じ形 — 変動するところを抽象化し、支配的なケースをデフォルトに据える。",
                    },
                    {
                      question: "`get_balance` が `impl Future<Output = U256>` ではなく `RpcWithBlock<Address, U256>` を返すのはなぜか?",
                      options: [
                        "`RpcWithBlock` のほうが `Future` より高速で、`Future` にはできない遅延評価を実装するから。",
                        "`RpcWithBlock` はビルダーで、ユーザーが await 前に呼び出し側で問い合わせ対象ブロックを選べる（`.block_id(N)`、`.hash(...)`、`.pending()`）。`get_balance` 内に「latest」をハードコードしてしまうと、過去のブロックを問い合わせたいユーザーは別のメソッドを組み立てざるを得なくなる。",
                        "Rust はトレイトメソッドが `impl Future` を直接返すことを許さないから。",
                        "`RpcWithBlock` は最終的な `impl Future` を包む後方互換シムで、alloy の将来版では削除されるから。",
                      ],
                      correctIndex: 1,
                      explanation: "各 RPC メソッドには固有の *オプション構造* がある — `eth_getBalance` は任意のブロックを指定して問い合わせられる。ビルダー戻り値型はそうしたオプションをチェーンメソッドとして公開する。一般ケース（latest 用の `.await`）は簡潔に、まれなケース（`.block_id(N).await`）は明示的に保てる。`EthCall` は `eth_call` の 4〜5 個のオプションパラメータに同じことを行う。狙いは **型駆動の発見しやすさ**: IDE が戻り値型のビルダーメソッドを通じて妥当なオプションを提示してくれる。",
                    },
                    {
                      question: "あなたは `SignerProvider` を書いている — 内側のプロバイダに転送する前に外向きトランザクションへ署名するラッパープロバイダだ。トレイトには 30 以上のメソッドがある。実際に書くメソッド本体はいくつか?",
                      options: [
                        "30 以上 — トレイトには既定実装がないので、すべてのメソッドを実装しなければならない。",
                        "1 つ — `send_transaction` のみ。ほかは `auto_impl` から来る。",
                        "2 つ — `root()`（`self.inner.root()` に転送）と `send_transaction`（署名してから内側に転送）。残りのメソッドはデフォルト実装が自動で `self.root()` を使う — 内側プロバイダのトランスポートにルーティングされる。",
                        "5 つ程度 — `root()`、`send_transaction` に加え、nonce / ガス / チェーン処理のための関連メソッド `estimate_gas`、`get_transaction_count`、`chain_id` も。",
                      ],
                      correctIndex: 2,
                      explanation: "合計 2 メソッド。*必須* メソッドは `root()` のみ（`self.inner.root()` に転送する 1 行）。`send_transaction` はカスタマイズしたい本体。それ以外はトレイトのデフォルト実装が走り、`self.root()` 経由でトランスポートにアクセスする — そして `root()` 自身が内側に転送するので、結果として内側プロバイダのトランスポートに自動でルーティングされる。これが組み立てのステップ 4 の `root()` 間接化が **設計の要** である理由。(Nonce、ガス、チェーン ID の充填は別個の `Filler` が担い — `SignerProvider` と並んで `FillProvider` チェーンに組み込まれる。)",
                    },
                  ],
                },
                {
                  title: 'レッスン3 — ドリル: ログ Provider ラッパーを作る',
                  slug: 'alloy-provider-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン3 — ドリル: ログ Provider ラッパーを作る

## 問い

読むだけではリハーサル、**手を動かすことで記憶**。任意の Provider をラップし、RPC 呼び出しを内側へ転送する前にログ出力する \`LoggingProvider\` を書く。**本番のインデクサ / MEV パイプラインが実際に動かしているコード相当 — alloy をフォークせず観測可能性を層として積む。どう実装する？**

## 原理（最小モデル）

- **セットアップ 3 要素.** Foundry / Anvil（ローカルノード）+ 新規 cargo プロジェクト + Cargo.toml に alloy + tokio + tracing。
- **\`FillProvider\` のオーバーライド数.** 30 以上のうち 3-5 個のみ（\`send_transaction\` + ガス充填まわりの \`call\`/\`estimate_gas\`）、残り ~25 個はデフォルト実装。
- **\`LoggingProvider\` の最小実装.** \`inner: P\` + \`PhantomData<N>\` + \`root()\` 委譲 + 各 RPC メソッドで log + 委譲。
- **メソッド単位 opt-in.** 明示的に override しないメソッドはデフォルト実装に落ち、ログを出さない。
- **積層は自動.** \`LoggingProvider<FillProvider<NonceFiller, FillProvider<GasFiller, FillProvider<ChainIdFiller, RootProvider>>>>\` のタワー = 各ラッパーの \`root()\` が 1 段内側に転送、トレイトのデフォルト実装が \`self.root()\` 経由で root にアクセス → N 層でも実行時は 1 本の間接化チェーン。
- **\`ProviderBuilder.with_recommended_fillers()\` で nonce / gas / chain-id 自動.**

## 具体例

セットアップ:

\`\`\`bash
# 1. Foundry / Anvil
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 2. 新規 cargo プロジェクト
cargo new alloy-logging-drill --bin
cd alloy-logging-drill
\`\`\`

\`Cargo.toml\`:

\`\`\`toml
[dependencies]
alloy = { version = "0.x", features = ["full", "provider-http", "node-bindings"] }
tokio = { version = "1", features = ["full"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
\`\`\`

\`LoggingProvider\` 実装:

\`\`\`rust
use alloy::network::{Ethereum, Network};
use alloy::primitives::Address;
use alloy::providers::{Provider, RootProvider};
use std::marker::PhantomData;

pub struct LoggingProvider<P, N: Network = Ethereum> {
    inner: P,
    _network: PhantomData<N>,
}

impl<P, N: Network> LoggingProvider<P, N> {
    pub fn new(inner: P) -> Self {
        Self { inner, _network: PhantomData }
    }
}

impl<P, N> Provider<N> for LoggingProvider<P, N>
where
    P: Provider<N>,
    N: Network,
{
    fn root(&self) -> &RootProvider<N> {
        self.inner.root()
    }

    fn get_balance(&self, address: Address) -> alloy::providers::RpcWithBlock<Address, alloy::primitives::U256> {
        tracing::info!(?address, "LoggingProvider: get_balance called");
        self.inner.get_balance(address)
    }
}
\`\`\`

**メソッド本体 2 つ書いた**: \`root\` + \`get_balance\`。

\`get_block_number\` を呼んでも **ログは出ない** — トレイトのデフォルト実装に落ち、\`self.client()\` 経由で基盤トランスポートへ直接ルーティング。**メソッド単位 opt-in**、明示的にインターセプトしたものしか目にしない。

Anvil + main 配線:

\`\`\`bash
# 別ターミナル
anvil
\`\`\`

\`\`\`rust
use alloy::providers::ProviderBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    let inner = ProviderBuilder::new()
        .on_http("http://localhost:8545".parse()?);

    let provider = LoggingProvider::new(inner);

    // 最初のプリファンド Anvil アカウント
    let addr: Address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".parse()?;
    let balance = provider.get_balance(addr).await?;
    println!("balance: {balance}");

    // こちらはログされないはず（get_block_number はインターセプトしていない）
    let block_number = provider.get_block_number().await?;
    println!("block: {block_number}");

    Ok(())
}
\`\`\`

期待出力:

\`\`\`
INFO LoggingProvider: get_balance called address=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
balance: 10000000000000000000000
block: 0
\`\`\`

\`FillProvider\` と積層:

\`\`\`rust
let inner = ProviderBuilder::new()
    .with_recommended_fillers()  // nonce + gas + chain-id filler を追加
    .on_http("http://localhost:8545".parse()?);

let provider = LoggingProvider::new(inner);

let bal = provider.get_balance(addr).await?;
\`\`\`

積層タワー: \`LoggingProvider<FillProvider<NonceFiller, FillProvider<GasFiller, FillProvider<ChainIdFiller, RootProvider>>>>\`。

**自動合成の仕組み**: 各ラッパーの \`root()\` が 1 段内側に転送 → トレイトのデフォルト実装は \`self.root()\` で root に到達 → 塔全体がトレイトレベルで平坦化 → N 層でも実行時は 1 本の間接化チェーン。

## 失敗例（誤解）

「\`FillProvider\` は 30 メソッド全部 override」— **間違い**。3-5 個のみ（\`send_transaction\` + ガス充填まわり）、残りはデフォルト実装が \`self.root()\` 経由でルーティング。

「ログを全 RPC メソッドに入れる」— **不適切**。本番観測性層は重要メソッド（\`send_transaction\` / \`call\` / \`get_logs\` / \`get_balance\`）のみ override、30 個全部ではない。

「ラッパーの積層は手動配線が必要」— **間違い**。\`root()\` + デフォルト実装の合成で **自動**、各ラッパーは互いを知らずに済む。新規ラッパーは純粋にコードを足すだけ。

## ステップで組み立てる

### Step 1: \`FillProvider\` を読む

\`crates/provider/src/fillers/mod.rs\` で \`impl Provider for FillProvider\`、\`root()\` が \`self.inner.root()\` 転送、override は 3-5 個。

### Step 2: \`LoggingProvider\` スケッチ

\`inner: P\` + \`PhantomData<N>\` + \`root()\` 委譲 + log メソッド。

### Step 3: Anvil で動作確認

\`get_balance\` でログ + \`get_block_number\` でログなしを観察。

### Step 4: \`FillProvider\` と積層

\`with_recommended_fillers()\` + \`.wallet(signer)\` でタワー構築。

### Step 5: 積層自動合成の理解

\`root()\` + デフォルト実装で各ラッパー独立、N 層でも実行時 1 本の間接化。

## 答え合わせ

- **\`FillProvider\` が 30 メソッド中 3-5 個しか override しない理由**: トレイトのデフォルト実装が \`self.client()\` を呼ぶ → これは \`self.root().client()\` に落ちる → \`FillProvider::root()\` が \`self.inner.root()\` 返す → 各デフォルト実装メソッドが **自動的に内側プロバイダのトランスポート経由でルーティング**。書くコードゼロ。
- **\`LoggingProvider\` で \`get_block_number\` がログを出さない理由**: \`get_balance\` のみインターセプト。\`get_block_number\` はデフォルト実装に落ち、そこで \`self.client()\` を使い、\`self.root()\` 経由で基盤トランスポートへ直接ルーティング。**ログはメソッド単位の opt-in**。
- **\`LoggingProvider<FillProvider<...>>\` の自動合成**: 各ラッパーの \`root()\` がさらに 1 段内側に転送 → トレイトのデフォルト実装は \`self.root()\` 経由で root にアクセス → 塔全体がトレイトレベルで平坦化 → **N 層あっても実行時は 1 本の間接化チェーン**。ラッパーの組み合わせ任意、互いに無知、新規追加は純粋にコード足すだけ。

## 合格基準

- \`FillProvider\` の override 数（3-5 個）を即答できる。
- \`LoggingProvider\` の最小実装（\`root\` + 1 メソッド）を書ける。
- メソッド単位 opt-in を 1 文で説明できる。
- \`with_recommended_fillers()\` で nonce / gas / chain-id 自動追加を理解している。
- 積層自動合成（\`root()\` + デフォルト実装）の仕組みを言える。

## まとめ（3行）

- \`LoggingProvider\` = \`inner: P\` + \`PhantomData<N>\` + \`root()\` 委譲 + 各 RPC メソッドで log + 委譲、本番観測性層の標準パターン。
- メソッド単位 opt-in で重要メソッドのみ intercept、残りはデフォルト実装が \`self.root()\` 経由で動く → 書くコードゼロ。
- 積層タワー（\`LoggingProvider<FillProvider<...>>\`）は \`root()\` + デフォルト実装で自動合成、N 層でも実行時 1 本の間接化、ラッパー互いに無知。
`,
                },
                {
                  title: 'レッスン4 — `Network` トレイトをステップで組み立てる',
                  slug: 'alloy-network-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン4 — \`Network\` トレイトをステップで組み立てる

## 問い

Optimism の tx には \`l1_block_number\` + \`mint\` フィールド、レシートに \`l1_fee\`。Polygon zkEVM の tx エンベロープにはシーケンサ署名。**各 L2 が独自 tx / レシート / ブロック形を持つ — それでも同じ \`Provider\` API がそのすべてで動く。どうやって？**

## 原理（最小モデル）

- **素朴な「Ethereum ハードコード」の 3 失敗.** Optimism（\`l1_fee\`） + Anvil cheat + カスタム L2（独自エンベロープ）で破綻。
- **\`Network\` = 型レベル辞書.** 1 トレイト + 関連型で「あるチェーンが使う型一式」を 1 か所で決まる。
- **10 関連型の必要性.** TxType / TxEnvelope / UnsignedTx / TransactionRequest / TransactionResponse / ReceiptEnvelope / ReceiptResponse / Header / HeaderResponse / BlockResponse。各々が具体的失敗モードに対して存在理由。
- **トランザクションのライフサイクル分割.** Request（ビルダーで組み立て）→ Unsigned（フィールド全部埋まり、署名前）→ Envelope（署名済み）→ Response（block_hash / index 焼き込み）。各々別の型 → コンパイラが「Request はブロードキャスト不可」「Response に署名不可」を強制。
- **Receipt も Block も 2 種分割.** Envelope（コンセンサス形、Merkle ルート対象）+ Response（RPC 装飾フィールド付き）。
- **関連型 > ジェネリックパラメータ 10 個.** 一貫性担保（混ぜ合わせ防止）+ 呼び出し側冗長性削減（\`Provider<N: Network>\` で 10 型引き込み）+ 型レベル同一性（\`N::TransactionRequest\` で関数書ける）。
- **\`Network: Send + Sync + 'static\`.** Arc<Provider<N>> パターンに不可欠、'static で借用ライフタイム禁止。

## 具体例

最終形:

\`\`\`rust
pub trait Network: Send + Sync + 'static {
    type TxType: ...;
    type TxEnvelope: ...;
    type UnsignedTx: ...;
    type ReceiptEnvelope: ...;
    type Header: ...;
    type TransactionRequest: ...;
    type TransactionResponse: ...;
    type ReceiptResponse: ...;
    type HeaderResponse: ...;
    type BlockResponse: ...;
}
\`\`\`

Ethereum ハードコードの 3 失敗:
1. **Optimism**: Tx envelope に \`mint\` フィールド + レシートに \`l1_gas_used\` + \`l1_block_number\`
2. **Anvil / Hardhat**: \`impersonateAccount\` で標準型に存在しないデバッグフィールド
3. **カスタム L2**: Polygon zkEVM / Scroll / Linea が独自 tx エンベロープバリアント

Step 1（素朴な 3 型）:

\`\`\`rust
trait Network {
    type Transaction;
    type Receipt;
    type Block;
}

struct Ethereum;
impl Network for Ethereum {
    type Transaction = EthereumTx;
    type Receipt    = EthereumReceipt;
    type Block      = EthereumBlock;
}

struct Optimism;
impl Network for Optimism {
    type Transaction = OpTx;
    type Receipt    = OpReceipt;
    type Block      = OpBlock;
}
\`\`\`

しかし「トランザクション」は 1 型ではなく **複数あり**:

| 状態 | 役割 | 検証 |
| :--- | :--- | :--- |
| \`TransactionRequest\` | ユーザーが組み立て | フィールドの大半オプション |
| \`UnsignedTx\` | 全フィールド埋まり | nonce / gas / chain_id 解決済、署名直前 |
| \`TxEnvelope\` | 署名済み | ブロードキャスト対象 |
| \`TransactionResponse\` | RPC 戻り値 | block_hash / block_number / transaction_index 焼き込み |

役割ごとにフィールド・検証・シリアライズが異なる → **1 つの和型に押し込むとランタイム検証が必要、分割すれば型システムが「Request はブロードキャスト不可」「Response に署名不可」を強制**。

Step 2（6 関連型）:

\`\`\`rust
trait Network {
    type TxEnvelope;
    type UnsignedTx;
    type TransactionRequest;
    type TransactionResponse;
    type Receipt;
    type Block;
}
\`\`\`

Step 3（Receipt + Block も分割、+ \`TxType\`）:

| 型 | 用途 |
| :--- | :--- |
| ReceiptEnvelope | コンセンサス形（Merkle ルート対象） |
| ReceiptResponse | RPC 戻り値（transaction_hash / block_hash / block_number / index 装飾） |
| Header | コンセンサスヘッダー |
| HeaderResponse | RPC 整形済み（ハッシュ計算済、JSON 化のため gas_used が文字列） |
| BlockResponse | RPC 完全ブロックペイロード |
| TxType | tx 分類用 enum タグ（Legacy / EIP-1559 / EIP-4844 / OP-Deposit） |

Step 4（関連型 vs ジェネリックパラメータ）:

**ジェネリックパラメータ 10 個**:

\`\`\`rust
struct Provider<TxRequest, TxEnvelope, Receipt, Block, ...> { ... }
\`\`\`

3 問題:
1. **一貫性なし**: \`Provider<EthereumTxRequest, OptimismTxEnvelope, ...>\` がそのままコンパイル = 混ぜ合わせ自由
2. **呼び出し側冗長**: \`Provider\` の全 signature に 10 パラメータ必要
3. **型レベル同一性なし**: \`Network\` 名がトレイト → \`fn for_network<N: Network>(...) -> N::TransactionRequest\` 書ける、素ジェネリックは書けない

**関連型 = 「これらは組で動く」**、ジェネリックパラメータ = 「どんな組み合わせでも有効」。チェーンプリミティブには前者。

Step 5（トレイト境界 \`Send + Sync + 'static\`）:

\`\`\`rust
pub trait Network: Send + Sync + 'static { ... }
\`\`\`

- **\`Send + Sync\`**: \`Arc<Provider<N>>\` パターンに不可欠、これがないとコンパイル不可
- **\`'static\`**: \`PhantomData<N>\` を持つ Provider が借用ライフタイム継承 → \`Arc\` も借用元設定より長生きできない → 'static で借用禁止 → Arc 自立

## 失敗例（誤解）

「『同じデータ、状態が違うだけ』の 1 型で十分」— **間違い**。署名・block_hash がオプションの巨大 struct → \`broadcast(&tx)\` で「署名は存在するか? block_hash は不在か?」のランタイム検証必要。**4 状態を別型にすれば型システムが強制**。

「関連型 10 個は冗長、ジェネリック 10 個と同じ」— **間違い**。関連型は **一貫性 + 呼び出し側簡潔さ + 型レベル同一性** の 3 利点。素ジェネリックでは混ぜ合わせ可能 + \`Provider\` signature に毎回 10 パラメータ。

「\`'static\` は『永遠に生きる』だけ」— **間違い**。具体的に: \`MyNetwork<'a>\` だと \`Provider<MyNetwork<'a>>\` も継承 → \`Arc<Provider<MyNetwork<'a>>>\` が \`'a\` に縛られ → Arc が借用元設定より長生き不可。**\`'static\` で borrowed パターン排除 → Arc 自立**。

## ステップで組み立てる

### Step 1: 素朴な「Ethereum ハードコード」の 3 失敗

Optimism / Anvil cheat / カスタム L2。

### Step 2: トランザクションを 4 状態に分割

Request / Unsigned / Envelope / Response、型システムが状態遷移強制。

### Step 3: Receipt と Block も 2 種分割

Envelope（コンセンサス）+ Response（RPC 装飾）。

### Step 4: 10 関連型を即答

TxType + TxEnvelope + UnsignedTx + TransactionRequest + TransactionResponse + ReceiptEnvelope + ReceiptResponse + Header + HeaderResponse + BlockResponse。

### Step 5: 関連型 vs ジェネリックパラメータ

関連型 = これらは組で動く / ジェネリック = どんな組み合わせでも有効。チェーンには関連型。

### Step 6: トレイト境界の意味

\`Send + Sync + 'static\` → \`Arc<Provider<N>>\` パターン成立。

## 答え合わせ

- **\`TransactionRequest\` と \`TxEnvelope\` を別関連型にする型システムの強制**: 1 型 + オプションフィールドだと \`broadcast(&tx)\` で「署名は本当に存在するか?」のランタイム検証が必要 → \`TransactionRequest\` / \`UnsignedTx\` / \`TxEnvelope\` / \`TransactionResponse\` に分けると **不整合な状態はそもそも構築できない**、各関数 signature が正しい状態だけ受け取る。
- **関連型がジェネリックパラメータ 10 個より優れる 3 帰結**: ① 一貫性担保（\`Provider<EthereumTxRequest, OptimismTxEnvelope>\` を構文的に禁止、チェーン型混ぜ防止）、② 呼び出し側冗長性削減（\`Provider<N: Network>\` で 10 型一括引き込み）、③ 型レベル同一性（\`N::TransactionRequest\` で N 上ジェネリックな関数書ける、素ジェネリックでは不可能）。
- **\`'static\` 境界がないと壊れるパターン**: \`MyNetwork<'a>\` のような借用ライフタイム → \`Provider<MyNetwork<'a>>\` も継承 → \`Arc<Provider<MyNetwork<'a>>>\` が \`'a\` に縛られ → Arc が借用元の設定より長生き不可。Provider をグローバル \`Arc\` に置くパターンが壊れる。\`'static\` で borrowed パターン排除し Arc 自立。

## 合格基準

- 素朴 Ethereum ハードコードの 3 失敗を即答できる。
- トランザクション 4 状態（Request / Unsigned / Envelope / Response）を順に言える。
- 10 関連型を即答できる。
- 関連型 vs ジェネリックパラメータの 3 帰結を言える。
- \`Send + Sync + 'static\` 各境界の意味を言える。

## まとめ（3行）

- \`Network\` = 型レベル辞書、10 関連型（Tx 4 状態 + Receipt 2 種 + Block 関連 3 種 + TxType）が各々失敗モードに対する存在理由。
- 関連型は「これらは組で動く」（混ぜ合わせ防止 + 呼び出し側簡潔 + 型レベル同一性）、ジェネリックパラメータでは実現不可能。
- \`Send + Sync + 'static\` で \`Arc<Provider<N>>\` パターン成立、次のレッスンで本物の Ethereum + Optimism 実装を並列比較する。
`,
                },
                {
                  title: 'レッスン5 — 本物の `Network` トレイト + Ethereum / Optimism 実装を読む',
                  slug: 'alloy-network-walkthrough-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン5 — 本物の \`Network\` トレイト + Ethereum / Optimism 実装を読む

## 問い

10 関連型 + トレイト境界を組み立ててきた。**本物のソースで関連型ごとのトレイト境界、alloy の Ethereum 実装、Optimism 実装の並列比較、TransactionBuilder ヘルパートレイトを確認。一貫性の性質は具体的にどう働くか？**

## 原理（最小モデル）

- **\`Network\` 自身の境界 6 種.** \`Debug + Clone + Copy + Send + Sync + Sized + 'static\`。Copy = ゼロサイズマーカー型として値で気軽渡し。
- **マーカー struct パターン.** \`struct Ethereum;\` は 1 バイト（Copy 可能）。チェーン設定（chain_id / hardfork）は別の場所、Network は「型ファミリの選択」のみ。
- **\`TxType: Into<u8> + TryFrom<u8>\`.** EIP-2718 型付きエンベロープ仕様、高位 enum とワイヤ 1 バイトのマッピング。Optimism の \`0x7E\` (Deposit) で拡張。
- **\`type TxEnvelope: TransactionEnvelope<Self>\`.** 関連型ごしに揃ったヘルパートレイト、Self でパラメータ化。
- **Ethereum 実装.** \`alloy_consensus\`（コンセンサス形）+ \`alloy_rpc_types_eth\`（RPC 形）の 2 クレートにまたがる。クレート境界 = 概念境界。
- **Optimism は 10 中 8 がオーバーライド.** Tx 5 スロット + Receipt 2 スロット + BlockResponse がオーバーライド、Header と HeaderResponse のみ共有。
- **\`TransactionBuilder<N>\` ヘルパートレイト.** 流暢な \`.with_to(addr).with_value(eth(1))\` を chain-agnostic に。
- **\`AnyNetwork\` = 寛容な逃げ道.** 任意フィールド受け入れる serde 風型、ブロックエクスプローラ / マルチチェーンインデクサ向け。

## 具体例

トレイト全境界:

\`\`\`rust
pub trait Network: Debug + Clone + Copy + Send + Sync + Sized + 'static {
    // トランザクション側
    type TxType: Into<u8> + PartialEq + Eq + TryFrom<u8> + Send + Sync + 'static;
    type TxEnvelope: TransactionEnvelope<Self> + ...;
    type UnsignedTx: From<Self::TxEnvelope> + ...;
    type TransactionRequest: TransactionBuilder<Self> + ...;
    type TransactionResponse: Transaction<Self> + ...;

    // レシート側
    type ReceiptEnvelope: ReceiptEnvelope<Self> + ...;
    type ReceiptResponse: ReceiptResponse + ...;

    // ヘッダー / ブロック側
    type Header: BlockHeader + ...;
    type HeaderResponse: HeaderResponse + ...;
    type BlockResponse: BlockResponse<Self> + ...;
}
\`\`\`

Ethereum 実装:

\`\`\`rust
#[derive(Debug, Clone, Copy)]
pub struct Ethereum;

impl Network for Ethereum {
    type TxType = alloy_consensus::TxType;
    type TxEnvelope = alloy_consensus::TxEnvelope;
    type UnsignedTx = alloy_consensus::TypedTransaction;
    type ReceiptEnvelope = alloy_consensus::ReceiptEnvelope;
    type Header = alloy_consensus::Header;

    type TransactionRequest = alloy_rpc_types_eth::TransactionRequest;
    type TransactionResponse = alloy_rpc_types_eth::Transaction;
    type ReceiptResponse = alloy_rpc_types_eth::TransactionReceipt;
    type HeaderResponse = alloy_rpc_types_eth::Header;
    type BlockResponse = alloy_rpc_types_eth::Block;
}
\`\`\`

注目点 2 つ:
1. **クレート境界 = 概念境界**: コンセンサス形（\`alloy-consensus\`）vs RPC 形（\`alloy-rpc-types-eth\`）
2. **\`UnsignedTx = TypedTransaction\`**: EIP-2718 型付き tx バリアントのいずれか、完全埋まり署名直前

Optimism 実装:

\`\`\`rust
#[derive(Debug, Clone, Copy)]
pub struct Optimism;

impl Network for Optimism {
    type TxType = op_alloy_consensus::OpTxType;          // ← 異なる (Deposit 追加)
    type TxEnvelope = op_alloy_consensus::OpTxEnvelope;  // ← 異なる
    type UnsignedTx = op_alloy_consensus::OpTypedTransaction;  // ← 異なる
    type ReceiptEnvelope = op_alloy_consensus::OpReceiptEnvelope; // ← 異なる (l1_fee フィールド)

    type Header = alloy_consensus::Header;  // ← Ethereum から再利用
    type HeaderResponse = alloy_rpc_types_eth::Header;  // ← 再利用

    type TransactionRequest = op_alloy_rpc_types::TransactionRequest;  // ← 異なる (mint フィールド)
    type TransactionResponse = op_alloy_rpc_types::Transaction;  // ← 異なる
    type ReceiptResponse = op_alloy_rpc_types::OpTransactionReceipt;  // ← 異なる
    type BlockResponse = op_alloy_rpc_types::Block;  // ← 異なる (OP tx を運ぶ)
}
\`\`\`

10 スロット中 **8 がオーバーライド、2 が共有**:
- 5 Tx 関連スロット（TxType、TxEnvelope、UnsignedTx、TransactionRequest、TransactionResponse）すべて違う = Optimism deposit-tx バリアントが波及
- 2 Receipt 関連（ReceiptEnvelope、ReceiptResponse）違う = L1 ガス / L1 ブロック フィールド波及
- Header と HeaderResponse 共有 = OP は コンセンサスヘッダレベルで EVM 互換
- BlockResponse 違う = ブロックの tx リストに OP 型が含まれる

\`TransactionBuilder<N>\` ヘルパートレイト:

\`\`\`rust
pub trait TransactionBuilder<N: Network>: ... {
    fn input(&self) -> Option<&Bytes>;
    fn set_input(&mut self, input: Bytes);
    fn with_input(mut self, input: Bytes) -> Self { ... }

    fn from(&self) -> Option<Address>;
    fn set_from(&mut self, from: Address);
    fn with_from(mut self, from: Address) -> Self { ... }

    fn to(&self) -> Option<Address>;
    fn set_to(&mut self, to: Address);
    fn with_to(mut self, to: Address) -> Self { ... }

    // ...with_value、with_gas_price、with_chain_id、with_nonce 等
}
\`\`\`

chain-agnostic ジェネリック関数:

\`\`\`rust
fn build_request<N: Network>() -> N::TransactionRequest {
    <N::TransactionRequest>::default()
        .with_to(Address::ZERO)
        .with_value(U256::from(1_000))
}
\`\`\`

Ethereum / Optimism / AnyNetwork / カスタム L2 すべてで動く。

\`AnyNetwork\`（寛容な逃げ道）:

\`\`\`rust
impl Network for AnyNetwork {
    type TxType = WithOtherFields<...>;
    type TxEnvelope = AnyTxEnvelope;
    type TransactionResponse = AnyRpcTransaction;
    // ...
}
\`\`\`

ブロックエクスプローラ / マルチチェーンインデクサ / 汎用 RPC プロキシ向け。代償 = チェーン固有フィールドの静的型付けを失い、\`.other()\` で取り出し。

## 失敗例（誤解）

「\`Network\` はチェーン設定 struct」— **間違い**。**ゼロサイズマーカー型**、チェーン設定（chain_id / hardfork）は別の場所。\`Network\` の問いは「*どの型ファミリ* を使うか」 — 静的・型レベル。

「Optimism は Ethereum 型を全部オーバーライド」— **間違い**。10 中 8 オーバーライド、Header と HeaderResponse は **共有**（OP コンセンサスヘッダレベルで EVM 互換）。一貫性の性質が共有を許す。

「\`TransactionBuilder\` メソッドを関連型に直接置く」— **間違い**。**別トレイトにすることで N 上ジェネリック関数が書ける**（Ethereum / Optimism / AnyNetwork 横断で動く）、メソッドを関連型に置くと chain-agnostic コード書けない。

## ステップで組み立てる

### Step 1: Network 自身の 6 境界

Debug + Clone + Copy + Send + Sync + Sized + 'static。Copy = ゼロサイズマーカー型。

### Step 2: \`TxType: Into<u8> + TryFrom<u8>\`

EIP-2718 wire-byte ↔ enum mapping、Optimism \`0x7E\` で拡張。

### Step 3: 関連型ごしのヘルパートレイト

\`type TxEnvelope: TransactionEnvelope<Self>\` パターン、Self でパラメータ化、chain-agnostic ヘルパー。

### Step 4: Ethereum 実装の 2 クレート構造

\`alloy-consensus\` + \`alloy-rpc-types-eth\` = コンセンサス vs RPC の概念境界。

### Step 5: Optimism vs Ethereum を 10 スロット並列比較

8 オーバーライド + 2 共有（Header / HeaderResponse）。

### Step 6: \`TransactionBuilder<N>\` 別トレイトの利点

chain-agnostic ジェネリック関数書ける。

### Step 7: \`AnyNetwork\` の使い分け

アプリ = 具体的 Network（Ethereum / Optimism）/ ツール = AnyNetwork。

## 答え合わせ

- **\`Network\` が \`Copy\` を要求する理由**: ゼロサイズマーカー型（\`struct Ethereum;\` は 1 バイト or 0）→ ライフタイムを気にせず値で気軽渡し可能。Clone だけだと借用が必要、Copy で関数引数 / フィールドに直接書ける。
- **Header が共有で BlockResponse が違う理由**: Optimism コンセンサスヘッダは EVM 互換（同じ Merkle ルート構造）→ Header / HeaderResponse 共有 OK。BlockResponse は **ブロックの tx リストに OP 型が含まれる** → Ethereum の \`Block\` を再利用すると OP deposit が Ethereum 型 tx として誤シリアライズ → 別物必須。**tx リスト含むものは波及、ヘッダレベルは共有可能**。
- **\`TransactionBuilder\` が別トレイトである利点**: 同じビルダーメソッドが Ethereum / Optimism / カスタム L2 で動く + N 上ジェネリック関数（\`fn build_request<N: Network>() -> N::TransactionRequest\`）が書ける = **型レベル辞書 + ヘルパートレイト = チェーン横断で移植可能なコード**。

## 合格基準

- Network 6 境界（Debug + Clone + Copy + Send + Sync + Sized + 'static）を即答できる。
- マーカー struct パターンと Copy の意味を 1 文で説明できる。
- Ethereum 実装の 2 クレート構造を言える。
- Optimism vs Ethereum の 10 スロット並列比較（8 違 + 2 同）を即答できる。
- \`TransactionBuilder<N>\` 別トレイトの利点を 1 文で説明できる。
- \`AnyNetwork\` を使う場面を言える。

## まとめ（3行）

- \`Network\` 全境界 \`Debug + Clone + Copy + Send + Sync + Sized + 'static\`、関連型ごしのヘルパートレイト（\`type TxEnvelope: TransactionEnvelope<Self>\`）+ TxType の EIP-2718 マッピング。
- Ethereum vs Optimism 並列 = 10 中 8 オーバーライド + 2 共有（Header / HeaderResponse）、コンセンサス（\`alloy-consensus\`）と RPC（\`alloy-rpc-types-eth\`）のクレート境界 = 概念境界。
- \`TransactionBuilder<N>\` 別トレイト = chain-agnostic ジェネリック関数、\`AnyNetwork\` = 任意チェーン扱うツール向けの寛容な逃げ道。
`,
                },
                {
                  title: 'クイズ — Network',
                  slug: 'alloy-network-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 7,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ — Network

\`Network\` トレイトの 10 関連型、トランザクション 4 状態分割、Ethereum 実装の 2 クレート構造、Optimism 並列（8 オーバーライド + 2 共有）、\`TransactionBuilder<N>\` ヘルパートレイトを確認する。

組み立てとウォークスルーにまたがる設計判断を問う 4 問。**クイズはうなずきでは通せない。** 2 問以上落としたら、ドリルへ進む前に \`Network\` のステップに戻ること。
`,
                  quizQuestions: [
                    {
                      question: "`Network` はチェーン固有な 10 種の形（TxType、TxEnvelope、TransactionRequest ほか）を、struct のジェネリックパラメータ 10 個ではなく *関連型* として持っている。Network 上ジェネリックなコードにとって、この選択が決定的に効いてくる利点は?",
                      options: [
                        "関連型のほうがジェネリックパラメータより高速にコンパイルされる。",
                        "一貫性 + 簡潔さ: 関連型は「これらは組で動く」をひとまとめにする（誤って `Provider<EthereumTxRequest, OptimismReceipt>` を組み立てられない）。さらに、呼び出し側はジェネリックパラメータ 10 個ではなく `<N: Network>` ひとつだけを書けば済む。",
                        "ジェネリックパラメータはトレイトメソッドのシグネチャには現れず、トレイト本体内でしか使えないから。",
                        "関連型は `dyn Trait` をサポートするが、ジェネリックパラメータはしないから。",
                      ],
                      correctIndex: 1,
                      explanation: "決め手は一貫性の性質。ジェネリックパラメータは「どんな組み合わせでも有効」を表現する; 関連型は「これらは組で動く」を表現する。チェーンプリミティブ — `EthereumTxRequest` は `EthereumTxEnvelope` と組まなければならない — には後者の意味論が必要。加えて、素のジェネリックでは Provider に言及するすべてのシグネチャに 10 個のパラメータを書く必要がある; `N: Network` 1 つでそれをまとめて引き込める。(コンパイル時間や `dyn` 互換性を挙げる選択肢は不正確; どちらの方式でも問題なく動く。)",
                    },
                    {
                      question: "`Network` には `TransactionRequest`、`UnsignedTx`、`TxEnvelope`、`TransactionResponse` という別々の関連型がある — 一見すると同じデータの 4 つの表現。なぜ分けているのか?",
                      options: [
                        "後方互換 — 古い alloy バージョンが別々の型を使っていた名残。",
                        "各表現はオプションフィールドつきの同じデータ; 分割は単なるドキュメント上の装飾。",
                        "各表現はトランザクションのライフサイクルで異なる役割（構築 → 充填 → 署名 → 返却）を担う。分割によって不正な状態を構築できなくする: 型システムが `broadcast(&request)` や `sign(&response)` をコンパイル時に拒否する。統一型では検証がランタイムに追い出される。",
                        "性能のため — それぞれの型に最適化されたメモリレイアウトがある。",
                      ],
                      correctIndex: 2,
                      explanation: "署名がオプション、block_hash がオプション……の 1 つの型では、検証がランタイムへ追い出される。`broadcast(&tx)` は「署名は存在するか? block_hash は不在か?」をチェックする羽目になる — 本来コンパイラが拒否すべきものがランタイムエラーになる。分割すればそうした状態をそもそも構築できなくなる。各関数のシグネチャは正しいライフサイクル状態だけを受け取るようになる。Rust のタイプステートパターンと同種のトレードオフを、Ethereum の tx に適用したもの。",
                    },
                    {
                      question: "Optimism の `Network` 実装は独自の `BlockResponse` を定義する一方、Ethereum の `Header` はそのまま再利用する。なぜこの非対称が生じるのか?",
                      options: [
                        "`BlockResponse` は `Header` より新しく alloy に追加されたもので、Optimism 側の型がまだリファクタされていないだけ。",
                        "`Header` はコンセンサスが定義する形で、Optimism はヘッダーレベルで EVM 互換 — number、hash、timestamp といった構造が同一。一方、`BlockResponse` は *ブロックのトランザクションリスト* を内包し、Optimism のトランザクションには OP 固有の Deposit バリアントが含まれる。Ethereum の `Block` を再利用してしまうと、OP デポジットが Ethereum 型 tx としてシリアライズされてしまい誤りになる。",
                        "ヘッダーのほうがブロックより小さく、再利用するとメモリコストが減るから。",
                        "`BlockResponse` は `Header` より新しい概念で、Optimism も最終的には Ethereum のものを共有する予定だから。",
                      ],
                      correctIndex: 1,
                      explanation: "ここに一貫性の性質の機微が出ている。型がチェーン横断で *内容的に同一* なところは、トレイトが共有を許す — Optimism のヘッダーは文字どおり `alloy_consensus::Header` だ。型がチェーン固有の内容を抱え込む箇所（OP 型の tx を含む tx リストのように）はオーバーライドが避けられない — でなければツールが正しくシリアライズできない。**この選択はデータに強制されるものであって、好みの問題ではない。** ReceiptResponse にも同じ論理が当てはまる（L1 fee フィールドのために別物になる）。",
                    },
                    {
                      question: "`TransactionBuilder<N>` は、`Network::TransactionRequest` が実装するよう要求される *別の* トレイトであって、関連型に直接生えたメソッドではない。この分離はなにを可能にしているか?",
                      options: [
                        "各 `Network::TransactionRequest` 実装が、ビルダーメソッドを個別にオーバーライドできるようにするため。",
                        "Rust が関連型のメソッドを別トレイト経由で定義することを強制するから。",
                        "N 上ジェネリックなコードを可能にするため: `fn build_request<N: Network>() -> N::TransactionRequest { <N::TransactionRequest>::default().with_to(addr).with_value(v) }`。`TransactionBuilder<N>` がトレイトなので、どのチェーンの `TransactionRequest` が選ばれても同じメソッド名で扱える — その結果、同じコードが Ethereum、Optimism、AnyNetwork で動く。",
                        "後方互換のシム; alloy の将来版はメソッドをインライン化する予定だから。",
                      ],
                      correctIndex: 2,
                      explanation: "パターンは **型レベル辞書（Network）+ 辞書キーでパラメータ化されたヘルパートレイト（TransactionBuilder<N>）＝ チェーン横断で移植可能なコード。** 別トレイトにしなければ、`with_to(...)` や `with_value(...)` は `EthereumTransactionRequest` と `OpTransactionRequest` 各々の固有メソッドになり、`N::TransactionRequest` 経由で呼べない。別トレイトに切り出し境界として要求することで、\`<N::TransactionRequest>::default().with_to(...)\` をジェネリックに動かせる。同じイディオムが `TxEnvelope` 上の `TransactionEnvelope<Self>`、`BlockResponse` 上の `BlockResponse<Self>` にも現れる。",
                    },
                  ],
                },
                {
                  title: 'レッスン6 — ドリル: Ethereum *と* Optimism で動く N 上ジェネリックなコード',
                  slug: 'alloy-network-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン6 — ドリル: Ethereum *と* Optimism で動く N 上ジェネリックなコード

## 問い

読むだけではリハーサル、**手を動かすことで記憶**。チェーンごとのコードを書かずに、Ethereum でも Optimism でも動く 1 関数を書く。**本番のブロックエクスプローラ / インデクサ / MEV ボットが投入するコード相当 — 何が「同じコード、違う型パラメータ」を可能にするか？**

## 原理（最小モデル）

- **セットアップ.** Anvil（ローカル）+ Optimism mainnet RPC + 新規 cargo + \`alloy\` + \`op-alloy\`。
- **op-alloy の Network 実装を読む.** 10 関連型のうち 8 がオーバーライド、Header と HeaderResponse のみ共有。
- **N 上ジェネリック関数.** \`fn block_summary<N, P>(provider: &P, block_id: BlockId) -> Result<String> where N: Network, P: Provider<N>\` で本体 1 つ。
- **コンパイラの特殊化.** Ethereum / Optimism で具体化 → 2 つの特殊化コピー出力、各々最適化済。
- **コンパイル時混ぜ防止.** \`block_summary::<Optimism, _>(&eth_provider, ...)\` は関連型不一致でコンパイルエラー、一貫性の性質がコンパイル時に守る。
- **3 つ目チェーン追加 = 新 struct + impl Network のみ.** \`struct PolygonZkEvm; impl Network for PolygonZkEvm { ... }\` で関数本体は変えず。

## 具体例

セットアップ:

\`\`\`bash
# ターミナル 1: Anvil
anvil

# ターミナル 2: プロジェクト
cargo new alloy-network-drill --bin
cd alloy-network-drill
\`\`\`

\`Cargo.toml\`:

\`\`\`toml
[dependencies]
alloy = { version = "0.x", features = ["full", "provider-http"] }
op-alloy = { version = "0.x" }
tokio = { version = "1", features = ["full"] }
eyre = "0.6"
\`\`\`

10 スロット並列比較:

| スロット | Ethereum の値 | Optimism の値 | 同じ? |
| :--- | :--- | :--- | :--- |
| TxType | \`alloy_consensus::TxType\` | \`op_alloy_consensus::OpTxType\` | ❌ |
| TxEnvelope | \`alloy_consensus::TxEnvelope\` | \`op_alloy_consensus::OpTxEnvelope\` | ❌ |
| UnsignedTx | \`alloy_consensus::TypedTransaction\` | OP 類似 | ❌ |
| ReceiptEnvelope | \`alloy_consensus::ReceiptEnvelope\` | OP 類似 | ❌ |
| Header | \`alloy_consensus::Header\` | \`alloy_consensus::Header\` | ✅ |
| TransactionRequest | \`alloy_rpc_types_eth::TransactionRequest\` | OP 類似 | ❌ |
| TransactionResponse | \`alloy_rpc_types_eth::Transaction\` | OP 類似 | ❌ |
| ReceiptResponse | \`alloy_rpc_types_eth::TransactionReceipt\` | OP 類似 | ❌ |
| HeaderResponse | \`alloy_rpc_types_eth::Header\` | \`alloy_rpc_types_eth::Header\` | ✅ |
| BlockResponse | \`alloy_rpc_types_eth::Block\` | OP 類似 | ❌ |

**8 違う、2 共有**（Header と HeaderResponse）。一貫性の性質がオーバーライドを強制。

N 上ジェネリックなブロックサマリ:

\`\`\`rust
use alloy::network::{primitives::BlockTransactionsKind, Network};
use alloy::providers::Provider;
use alloy::rpc::types::BlockId;

async fn block_summary<N, P>(provider: &P, block_id: BlockId) -> eyre::Result<String>
where
    N: Network,
    P: Provider<N>,
{
    let block = provider
        .get_block(block_id)
        .kind(BlockTransactionsKind::Hashes)
        .await?
        .ok_or_else(|| eyre::eyre!("block not found"))?;

    use alloy::network::BlockResponse;
    let header = block.header();

    use alloy::network::primitives::HeaderResponse;
    Ok(format!(
        "block {} on chain — hash={:?}",
        header.number(),
        header.hash(),
    ))
}
\`\`\`

Ethereum + Optimism main:

\`\`\`rust
use alloy::network::Ethereum;
use alloy::providers::ProviderBuilder;
use op_alloy::network::Optimism;

#[tokio::main]
async fn main() -> eyre::Result<()> {
    // Ethereum (Anvil)
    let eth_provider = ProviderBuilder::new()
        .on_http("http://localhost:8545".parse()?);
    let s = block_summary::<Ethereum, _>(&eth_provider, BlockId::latest()).await?;
    println!("ETH: {s}");

    // Optimism mainnet
    let op_provider = ProviderBuilder::<_, _, Optimism>::default()
        .on_http("https://mainnet.optimism.io".parse()?);
    let s = block_summary::<Optimism, _>(&op_provider, BlockId::latest()).await?;
    println!(" OP: {s}");

    Ok(())
}
\`\`\`

混ぜると コンパイルエラー:

\`\`\`rust
// コンパイルエラー
let s = block_summary::<Optimism, _>(&eth_provider, BlockId::latest()).await?;
\`\`\`

エラー: "expected \`Optimism::TransactionRequest\`, found \`Ethereum::TransactionRequest\`"。**一貫性の性質がコンパイル時にあなたを守る**。

## 失敗例（誤解）

「Network = ランタイム設定で切り替え」— **間違い**。**コンパイル時の型レベル選択**、ランタイム切り替えではない。各 chain に対して特殊化コピーがコンパイルされる。

「ジェネリック関数だから動的ディスパッチ」— **間違い**。N: Network はトレイト境界、関連型は静的ディスパッチ → **コンパイラがチェーンごとに特殊化コピー出力**、vtable なし、性能ペナルティなし。

「Polygon zkEVM 追加には alloy 自体を改造」— **間違い**。新 struct + \`impl Network for PolygonZkEvm { ... }\` のみ、関数本体は変えず。

## ステップで組み立てる

### Step 1: 10 スロット並列比較表を読む

8 違う + 2 共有を理解。

### Step 2: N 上ジェネリック関数を書く

\`fn block_summary<N, P>(provider: &P, block_id: BlockId) where N: Network, P: Provider<N>\`。

### Step 3: Ethereum (Anvil) で動かす

\`block_summary::<Ethereum, _>(&eth_provider, BlockId::latest()).await\`。

### Step 4: Optimism mainnet で動かす

\`block_summary::<Optimism, _>(&op_provider, BlockId::latest()).await\`、**同じ関数、違う型パラメータ**。

### Step 5: 混ぜると コンパイルエラー観察

\`block_summary::<Optimism, _>(&eth_provider, ...)\` で関連型不一致エラー。

### Step 6: Polygon zkEVM 追加方法

新 struct + \`impl Network for PolygonZkEvm { ... }\` のみ、関数本体は変えず。

## 答え合わせ

- **コンパイラの特殊化コピー数**: Ethereum と Optimism の 2 種類で具体化 → **2 つの特殊化コピー出力**、各々最適化済。性能上重要 = vtable 経由の動的ディスパッチなし、静的ディスパッチで関連型解決 → ホットループでも遅くならない。
- **Header 共有 + BlockResponse 違いの差**: Header = コンセンサスヘッダレベル（OP は EVM 互換）→ 共有。BlockResponse = **ブロックの tx リストに OP 型が含まれる** → Ethereum \`Block\` 再利用すると OP deposit が誤シリアライズ → 別物必須。**「tx リスト含むもの = 波及、ヘッダレベル = 共有可能」**。
- **混ぜたときのコンパイルエラー経路**: \`block_summary::<Optimism, _>(&eth_provider, ...)\` で \`P: Provider<Optimism>\` 境界要求 → \`eth_provider: P_eth\` が \`Provider<Ethereum>\` 実装 → \`Provider<Optimism>\` 未実装 → **関連型不一致エラー**（"expected Optimism::TransactionRequest, found Ethereum::TransactionRequest"）→ コンパイル拒否。

## 合格基準

- 10 スロット並列比較表を即答できる。
- N 上ジェネリック関数 signature を書ける。
- 「同じ関数、違う型パラメータ」を 1 文で説明できる。
- コンパイラの特殊化コピー数を即答できる。
- Polygon zkEVM 追加方法（新 struct + impl Network のみ）を言える。

## まとめ（3行）

- N 上ジェネリック関数（\`fn block_summary<N, P>(provider: &P) where N: Network, P: Provider<N>\`）で Ethereum / Optimism / 任意のチェーンで動く 1 本体。
- コンパイラが各 chain に対して特殊化コピー出力（静的ディスパッチ、vtable なし、性能ペナルティなし）、混ぜたら関連型不一致でコンパイルエラー。
- Polygon zkEVM 追加 = 新 struct + impl Network のみ、関数本体不変 = 本番ブロックエクスプローラ / マルチチェーンインデクサのパターン。
`,
                },
                {
                  title: 'レッスン7 — `Signer` トレイトをステップごとに組み立てる',
                  slug: 'alloy-signer-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン7 — \`Signer\` トレイトをステップごとに組み立てる

## 問い

MEV サーチャーは AWS KMS で署名（秘密鍵が AWS の外に出ない）、トレジャリーは Ledger で署名（ハードウェアウォレット、毎回ボタン押下）、テストは生 secp256k1 バイトで署名。**同じ alloy アプリケーションコードが 3 つすべてを駆動する — 何が可能にするか？**

## 原理（最小モデル）

- **素朴 sign 関数の 4 失敗.** AWS KMS（async ネットワーク）+ Ledger（async USB + 人間押下）+ マルチチェーン（OP \`OpTypedTransaction\` ≠ Ethereum）+ 多種署名（EIP-191 / EIP-712 / 生ハッシュ）。
- **3 軸抽象化.** 署名者の所在（プロセス内 / クラウド / ハードウェア）+ なにに署名するか（ハッシュ / メッセージ / tx）+ async か sync か。
- **\`Signer\` = チェーン非依存のハッシュ/メッセージ署名.** async、\`sign_hash\` のみ必須、\`sign_message\` は EIP-191 プレフィックス付きのデフォルト実装。
- **\`TxSigner<Sig>\` = 別トレイト.** Tx 署名はチェーン認識（\`SignableTransaction\` 経由）、\`Signer\` は chain-agnostic に保つ。
- **\`SignerSync\` = sync 並列ミラー.** プロセス内署名者は両方実装、ネットワーク束縛は async のみ。
- **\`WalletFiller\` で Provider に接続.** \`ProviderBuilder.wallet(signer)\` の糖衣、FillProvider チェーンに署名層を積む。
- **デフォルト実装 + オーバーライド.** \`sign_message\` のデフォルトは EIP-191、AWS KMS が独自プレフィクシングする場合は \`AwsSigner\` 側でオーバーライド。

## 具体例

最終形:

\`\`\`rust
#[async_trait]
pub trait Signer<Sig = Signature> {
    async fn sign_hash(&self, hash: &B256) -> Result<Sig>;
    async fn sign_message(&self, message: &[u8]) -> Result<Sig> { /* デフォルト: ハッシュ化して sign_hash */ }
    fn address(&self) -> Address;
    fn chain_id(&self) -> Option<ChainId>;
    fn set_chain_id(&mut self, chain_id: Option<ChainId>);
}

#[async_trait]
pub trait TxSigner<Sig> {
    fn address(&self) -> Address;
    async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Sig>) -> Result<Sig>;
}

pub trait SignerSync<Sig = Signature> { /* Signer の sync ミラー */ }
\`\`\`

素朴 sign 関数:

\`\`\`rust
fn sign_tx(privkey: B256, mut tx: TypedTransaction) -> Result<TxEnvelope> {
    let hash = tx.signature_hash();
    let sig = secp256k1_sign(privkey, hash)?;
    Ok(tx.with_signature(sig))
}
\`\`\`

4 失敗:
1. **AWS KMS** — 秘密鍵が AWS の外に出ない、署名は async ネットワーク
2. **Ledger** — 鍵はデバイス、async USB + 人間押下
3. **マルチチェーン** — OP の \`OpTypedTransaction\` は Ethereum \`TypedTransaction\` ではない
4. **多種署名** — EIP-191（personal_sign）、EIP-712（typed data）、生ハッシュ

Step 1（async + 1 メソッド）:

\`\`\`rust
#[async_trait]
trait Signer {
    async fn sign_hash(&self, hash: B256) -> Result<Signature>;
}

struct LocalSigner { privkey: B256 }
impl Signer for LocalSigner { /* プロセス内 */ }

struct AwsSigner { client: AwsKmsClient, key_id: String }
impl Signer for AwsSigner { /* ネットワーク呼び出し */ }

struct LedgerSigner { dev: LedgerDevice }
impl Signer for LedgerSigner { /* USB 呼び出し */ }
\`\`\`

Step 2（\`sign_message\` デフォルト実装）:

\`\`\`rust
#[async_trait]
trait Signer {
    async fn sign_hash(&self, hash: &B256) -> Result<Signature>;

    async fn sign_message(&self, message: &[u8]) -> Result<Signature> {
        let prefixed = eip191_hash(message);  // "\\x19Ethereum Signed Message:\\n" + len + msg
        self.sign_hash(&prefixed).await
    }
}
\`\`\`

すべての Signer が \`sign_message\` をコストなしで得る + AWS KMS のような独自プレフィクシング実装はオーバーライド可能。

Step 3（\`TxSigner\` を別トレイトに）:

選択肢 A: Signer をネットワーク上ジェネリック化 \`Signer<N: Network>\`
選択肢 B: Tx 署名を別トレイトに、Signer は chain-agnostic

alloy は **選択肢 B**:

\`\`\`rust
#[async_trait]
pub trait TxSigner<Sig> {
    fn address(&self) -> Address;
    async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Sig>) -> Result<Sig>;
}
\`\`\`

理由 3 つ:
1. 署名操作の大部分は tx 署名ではない（EIP-191 + EIP-712 のほうが dapp で一般的）
2. Signer 実装はチェーン横断で再利用可能（LocalSigner は Ethereum か Optimism か気にしない）
3. Tx 署名は自然に多態的（1 Signer が \`TxSigner<Ethereum>\` と \`TxSigner<Optimism>\` を別実装）

Step 4（\`SignerSync\` 分離）:

\`\`\`rust
pub trait SignerSync<Sig = Signature> {
    fn sign_hash_sync(&self, hash: &B256) -> Result<Sig>;
    fn sign_message_sync(&self, message: &[u8]) -> Result<Sig> { /* デフォルト */ }
    fn chain_id_sync(&self) -> Option<ChainId>;
}
\`\`\`

LocalSigner は両方実装、AwsSigner / LedgerSigner は async のみ。

Step 5（\`WalletFiller\` で Provider 接続）:

\`\`\`rust
pub struct WalletFiller<W> {
    wallet: W,
}

impl<W: TxSigner<...>, N: Network> Filler<N> for WalletFiller<W> {
    async fn fill(&self, tx: &mut N::TransactionRequest) -> Result<()> {
        // 1. リクエストから unsigned tx を解決
        // 2. self.wallet.sign_transaction(...)
        // 3. 署名を取り付け
    }
}
\`\`\`

ユーザーコード:

\`\`\`rust
let signer = PrivateKeySigner::random();
let provider = ProviderBuilder::new()
    .wallet(signer)               // WalletFiller(signer) をインストール
    .with_recommended_fillers()
    .on_http(url);

provider.send_transaction(tx).await?;  // tx は WalletFiller により署名される
\`\`\`

## 失敗例（誤解）

「\`Signer\` だけで tx 署名も賄える」— **間違い**。Tx は \`SignableTransaction\` でチェーン認識必要 → \`Signer\` を \`N: Network\` でジェネリック化すると全 signer signature がふくらむ + チェーン横断再利用不可。**\`TxSigner\` を別トレイトに**。

「sync 版を作る必要なし、async で統一」— **間違い**。プロセス内署名者で async = future オーバーヘッド + ホットループで損。**\`SignerSync\` でプロセス内が両方実装**、ネットワーク束縛は async のみ。

「\`sign_message\` を関数（トレイトメソッドではない）にする」— **間違い**。AWS KMS が独自プレフィクシングを実装したい → デフォルト実装ならオーバーライド可能、トレイト外関数では不可能。**「共通挙動 + 実装単位カスタマイズ」がデフォルト実装の正しい用途**。

## ステップで組み立てる

### Step 1: 素朴 sign 関数の 4 失敗

AWS KMS + Ledger + マルチチェーン + 多種署名。

### Step 2: 3 軸抽象化

所在 + 何に署名 + async/sync。

### Step 3: \`Signer\` を async + chain-agnostic に

\`sign_hash\` のみ必須、\`sign_message\` デフォルト実装。

### Step 4: \`TxSigner\` 別トレイトの 3 理由

dapp 利用パターン + chain-agnostic 再利用 + 多態性。

### Step 5: \`SignerSync\` で sync 並列

LocalSigner 両方実装、AWS / Ledger は async のみ。

### Step 6: \`WalletFiller\` で Provider 統合

\`ProviderBuilder.wallet(signer)\` が糖衣、FillProvider チェーンに署名層。

## 答え合わせ

- **\`Signer\` が async である理由**: AWS KMS（ネットワーク呼び出し）+ Ledger（USB + 人間押下）の 2 つが async 必須。プロセス内でも async 統一で 1 トレイトに集約、sync 専用は \`SignerSync\` で並列に。
- **\`TxSigner\` が別トレイトである 3 理由**: ① 署名操作の大部分は tx 署名ではない（EIP-191 + EIP-712 が dapp で一般的）→ Signer signature ふくらませない、② Signer 実装はチェーン横断再利用可能（LocalSigner は Ethereum / Optimism 両対応）、③ Tx 署名は自然に多態的（1 Signer が \`TxSigner<Ethereum>\` + \`TxSigner<Optimism>\` を別コードパスで実装可能）。
- **\`WalletFiller\` の役割**: \`Signer\` / \`TxSigner\` は **どう署名するか** を抽象化、\`WalletFiller\` はリクエストフローの正しいタイミング（unsigned tx 構築後）で署名を呼び出す Filler 機構。\`ProviderBuilder.wallet(signer)\` ユーザー API は内部で \`WalletFiller(signer)\` を FillProvider に積む糖衣。

## 合格基準

- 素朴 sign 関数の 4 失敗を即答できる。
- 3 軸抽象化（所在 + 対象 + async/sync）を言える。
- \`Signer\` / \`TxSigner\` / \`SignerSync\` の 3 トレイトを役割で言える。
- \`TxSigner\` 別トレイトの 3 理由を言える。
- \`WalletFiller\` の役割（Filler 機構経由で Provider 統合）を 1 文で説明できる。

## まとめ（3行）

- 3 トレイト（\`Signer\` chain-agnostic async / \`TxSigner<Sig>\` chain-aware tx 署名 / \`SignerSync\` sync 並列ミラー）= 素朴 sign の 4 失敗（AWS / Ledger / マルチチェーン / 多種署名）を解決する 3 軸抽象化。
- \`Signer\` の \`sign_message\` デフォルト実装で EIP-191 を共通化 + オーバーライド可能、\`TxSigner\` 別トレイトで chain-agnostic 再利用 + 多態性。
- \`ProviderBuilder.wallet(signer)\` が \`WalletFiller(signer)\` を FillProvider に積む糖衣、署名層が nonce / gas / chain-id filler と同じ機構で動く。
`,
                },
                {
                  title: 'レッスン8 — 実 `Signer` トレイト + `PrivateKeySigner` / `AwsSigner` / `WalletFiller` を読む',
                  slug: 'alloy-signer-walkthrough-ja',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 25,
                  content: `# レッスン8 — 実 \`Signer\` トレイト + \`PrivateKeySigner\` / \`AwsSigner\` / \`WalletFiller\` を読む

## 問い

3 トレイト分割 + \`WalletFiller\` 橋渡しを組み立てた。**実ソースで全境界 + \`PrivateKeySigner\` のキャッシュ戦略 + \`AwsSigner\` の recovery-id 復元 + \`SignableTransaction\` 接着剤 + \`WalletFiller\` の FillProvider 組み込み — どこにあるか？**

## 原理（最小モデル）

- **\`Sig = Signature\` デフォルト付きジェネリックパラメータ.** ECDSA secp256k1 がデフォルト、BLS / ed25519 / 耐量子で別実装可能。
- **\`Sig\` が関連型ではなくジェネリックパラメータの理由.** 同じ署名者が複数 \`Sig\` で \`Signer\` 実装可能（\`Signer<Signature>\` + \`Signer<RawBytes>\` 両方）。
- **\`auto_impl(&mut, Box, Arc)\` の 3 種.** \`Provider\` の 5 種より狭い。\`&\` なし = \`set_chain_id(&mut self)\` 変更メソッド + \`Rc\` なし = \`Signer: Send + Sync\` で \`Rc<T>\` は \`!Send + !Sync\`。
- **\`PrivateKeySigner\` の構造.** \`SigningKey\` + キャッシュ済み \`address\` + per-signer \`chain_id\`。5 コンストラクタ（random / from_bytes / from_str / from_signing_key / random_with）。
- **\`AwsSigner\` の recovery-id 復元.** AWS KMS は \`(r, s)\` のみ返す → \`v\` は v=0 と v=1 を試してキャッシュ済み \`address\` を再現する方を選ぶ。
- **\`address()\` キャッシュが必要な理由.** すべての tx で複数回呼ばれる、ネットワーク呼び出しだったら tx ごとに往復レイテンシ。
- **\`SignableTransaction\` 接着剤.** 各チェーン \`UnsignedTx\` が実装、\`TxSigner\` はチェーン非依存で動く（\`signature_hash()\` 呼ぶだけ）。
- **\`WalletFiller\` = \`TxFiller<N>\`.** nonce / gas / chain-id filler と同じ \`TxFiller<N>\` トレイト、合成可能。

## 具体例

トレイトヘッダ:

\`\`\`rust
#[async_trait]
#[auto_impl(&mut, Box, Arc)]
pub trait Signer<Sig = Signature>: Send + Sync {
    async fn sign_hash(&self, hash: &B256) -> Result<Sig>;

    async fn sign_message(&self, message: &[u8]) -> Result<Sig> {
        self.sign_hash(&eip191_hash_message(message)).await
    }

    fn address(&self) -> Address;
    fn chain_id(&self) -> Option<ChainId>;
    fn set_chain_id(&mut self, chain_id: Option<ChainId>);
}
\`\`\`

3 注目点:
- **\`Sig = Signature\` デフォルト**: ECDSA secp256k1 デフォルト、BLS / ed25519 / 耐量子で別実装可能
- **\`auto_impl(&mut, Box, Arc)\` の 3 種**: \`&\` なし（\`set_chain_id\` が変更メソッド）+ \`Rc\` なし（\`Signer: Send + Sync\` だが Rc は \`!Send + !Sync\`）
- **\`Send + Sync\` スーパートレイト**: \`Arc<S>\` でタスク間共有

\`PrivateKeySigner\`:

\`\`\`rust
pub struct PrivateKeySigner {
    signer: SigningKey,
    address: Address,        // 構築時にキャッシュ
    chain_id: Option<ChainId>,
}

impl PrivateKeySigner {
    pub fn random() -> Self { /* OsRng → SigningKey */ }
    pub fn random_with(rng: &mut impl CryptoRng) -> Self { /* tests */ }
    pub fn from_bytes(bytes: &B256) -> Result<Self> { /* k256 鍵をパース */ }
    pub fn from_str(s: &str) -> Result<Self> { /* hex → from_bytes */ }
    pub fn from_signing_key(signer: SigningKey) -> Self { /* 直接 */ }
}
\`\`\`

\`address\` を構築時キャッシュ理由: 公開鍵からの導出は非自明（非圧縮 pubkey を keccak → 最後 20 バイト）→ 1 度だけ計算。

\`Signer\` + \`SignerSync\` の両方実装:

\`\`\`rust
fn high_throughput_path<S: SignerSync>(signer: &S) { /* sync、future オーバーヘッドなし */ }
fn cloud_compatible_path<S: Signer>(signer: &S) { /* async、AWS でも動く */ }
\`\`\`

sync パスが実作業、async は async ブロックで sync 呼び出すだけ。**async は sync の上に安価に合成可能、逆は不可**。

\`AwsSigner\`:

\`\`\`rust
pub struct AwsSigner {
    client: Client,
    key_id: String,
    address: Address,       // キャッシュ済
    chain_id: Option<ChainId>,
}

#[async_trait]
impl Signer for AwsSigner {
    async fn sign_hash(&self, hash: &B256) -> Result<Signature> {
        let resp = self.client
            .sign()
            .key_id(&self.key_id)
            .message(Blob::new(hash.to_vec()))
            .message_type(MessageType::Digest)
            .send()
            .await?;
        let sig = der_to_alloy(&resp.signature.as_ref())?;
        let recid = recover_recid(hash, &sig, &self.address)?;
        Ok(Signature { /* ... */ })
    }
}

// AwsSigner は SignerSync を impl しない — AWS KMS 経由には sync パスがない
\`\`\`

3 注目点:
1. **AWS は DER エンコード署名を返す** → alloy の (r, s, v) タプルに変換
2. **Recovery ID は AWS が返さない** → v=0 と v=1 を試してアドレスマッチで復元
3. **\`SignerSync\` 実装なし** → ネットワーク越しなので sync 不可能

\`SignableTransaction\` 接着剤:

\`\`\`rust
pub trait SignableTransaction<Sig> {
    fn set_chain_id(&mut self, chain_id: ChainId);
    fn set_chain_id_checked(&mut self, chain_id: ChainId) -> bool;
    fn encode_for_signing(&self, out: &mut dyn BufMut);
    fn signature_hash(&self) -> B256;
    fn into_signed(self, signature: Sig) -> Signed<Self, Sig>
    where
        Self: Sized;
}
\`\`\`

各チェーン \`UnsignedTx\`（Ethereum \`TypedTransaction\` / Optimism \`OpTypedTransaction\`）が実装。\`TxSigner\` はチェーン非依存で動く:

\`\`\`rust
async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Signature>) -> Result<Signature> {
    let hash = tx.signature_hash();
    self.sign_hash(&hash).await
}
\`\`\`

\`WalletFiller\`:

\`\`\`rust
pub struct WalletFiller<W> {
    pub wallet: W,
}

impl<W, N: Network> TxFiller<N> for WalletFiller<W>
where
    W: NetworkWallet<N>,
{
    type Fillable = Sendable<N::TxEnvelope>;

    async fn fill(&self, fillable: Self::Fillable, tx: &mut SendableTx<N>) -> TransportResult<...> {
        let envelope = self.wallet.sign_request(/* fillable からの unsigned tx */).await?;
        tx.envelope = Some(envelope);
        Ok(...)
    }
}
\`\`\`

\`.wallet(signer)\` 糖衣:

\`\`\`rust
impl<P, N> ProviderBuilder<P, N>
where
    P: ProviderLayer<...>,
    N: Network,
{
    pub fn wallet<W: NetworkWallet<N>>(self, wallet: W) -> ProviderBuilder<...> {
        self.layer(WalletFiller::new(wallet))
    }
}
\`\`\`

\`.wallet(signer)\` = \`.layer(WalletFiller::new(signer))\` 糖衣、**nonce / gas / chain-id filler と同じ合成機構共有**。

## 失敗例（誤解）

「\`address()\` を毎回ネットワーク呼び出し」— **致命的**。すべての tx で複数回呼ばれる（追跡 + ロギング + 適格性チェック + コールフレーム構築）→ tx ごとに AWS 往復レイテンシ。**構築時キャッシュで一度きりセットアップ + ほぼゼロの per-call**。

「\`Rc<Signer>\` で thread-local 共有」— **間違い**。\`Signer: Send + Sync\` 要求 → \`Rc<T>\` は \`!Send + !Sync\`（参照カウントが atomic でない）→ コンパイル拒否。**Arc<Signer> のみ**。

「\`AwsSigner\` で recovery-id 不要」— **間違い**。AWS は \`(r, s)\` のみ返す、\`v\` は **両可能性を試して復元** 必要。\`PrivateKeySigner\` は \`k256\` の sign-recoverable で直接得られる、追加コストなし。

## ステップで組み立てる

### Step 1: \`Sig = Signature\` デフォルト + ジェネリック

ECDSA デフォルト、BLS / ed25519 で別実装可能、ジェネリックパラメータで複数 \`Sig\` 実装可能。

### Step 2: \`auto_impl(&mut, Box, Arc)\` の 3 種理由

\`&\` なし = 変更メソッド、\`Rc\` なし = Send/Sync 制約。

### Step 3: \`PrivateKeySigner\` キャッシュ戦略

構築時 \`address\` キャッシュ、5 コンストラクタ。

### Step 4: \`AwsSigner\` の recovery-id 復元

AWS \`(r, s)\` のみ → v=0/v=1 試してアドレスマッチで復元、SignerSync 実装なし。

### Step 5: \`SignableTransaction\` 接着剤

各 UnsignedTx 実装、TxSigner はチェーン非依存。

### Step 6: \`WalletFiller\` = \`TxFiller<N>\`

nonce / gas / chain-id と同機構、\`.wallet(signer)\` 糖衣。

## 答え合わせ

- **\`Sig\` が関連型ではなくジェネリックパラメータの理由**: 同じ署名者が **異なる \`Sig\` で複数回トレイト実装可能** → \`PrivateKeySigner\` が \`Signer<Signature>\`（標準 ECDSA）と \`Signer<RawBytes>\`（生バイト出力）両方を実装可能。関連型なら実装ごとに \`Sig\` ひとつ確定 = 「複数 Sig で同じ署名者」が表現不可能。
- **\`AwsSigner\` で recovery-id を自前復元する理由**: AWS KMS は \`(r, s)\` のみ返す（DER エンコード）→ \`v\`（リカバリバイト）は API 仕様外。**両可能性（v=0、v=1）を試してアドレスを再現するほう** を選ぶ → AWS 呼び出し 1 回 + アドレス導出 2 通り。\`PrivateKeySigner\` は \`k256::sign_recoverable\` で v が署名の一部として返る → 追加コストなし。
- **\`address()\` キャッシュが必要な理由**: すべての tx で複数回呼ばれる（追跡 / ロギング / 署名適格性 / コールフレーム構築）→ ネットワーク呼び出しだったら tx ごとに AWS 往復レイテンシ（数百 ms）→ 全 tx が誰の鍵で署名したか知るためだけに遅延。**構築時キャッシュ = 一度きりセットアップ + ほぼゼロ per-call**。

## 合格基準

- \`Sig\` がジェネリックパラメータである理由を即答できる。
- \`auto_impl(&mut, Box, Arc)\` の 3 種と省略 2 種の理由を言える。
- \`PrivateKeySigner\` の \`address\` キャッシュ理由を 1 文で説明できる。
- \`AwsSigner\` の recovery-id 復元手順を言える。
- \`SignableTransaction\` 接着剤の役割を 1 文で説明できる。
- \`WalletFiller\` が \`TxFiller<N>\` で nonce filler と同機構と理解している。

## まとめ（3行）

- \`Signer<Sig = Signature>\` ジェネリック + \`auto_impl(&mut, Box, Arc)\`（\`&\` なし = 変更メソッド、\`Rc\` なし = Send/Sync）+ \`Send + Sync\` で \`Arc<S>\` パターン成立。
- \`PrivateKeySigner\` は \`address\` 構築時キャッシュ + Signer/SignerSync 両方実装、\`AwsSigner\` は recovery-id を v=0/v=1 試行で復元 + async のみ実装。
- \`SignableTransaction\` 接着剤で \`TxSigner\` がチェーン非依存、\`WalletFiller\` が nonce / gas / chain-id と同じ \`TxFiller<N>\` で FillProvider に積層、\`.wallet(signer)\` ユーザー API はその糖衣。
`,
                },
                {
                  title: 'クイズ — Signer',
                  slug: 'alloy-signer-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ — Signer

\`Signer\` / \`TxSigner\` / \`SignerSync\` の 3 トレイト分割、\`PrivateKeySigner\` のキャッシュ戦略、\`AwsSigner\` の recovery-id 復元、\`SignableTransaction\` 接着剤、\`WalletFiller\` の \`TxFiller<N>\` 統合を確認する。

組み立てとウォークスルーにまたがる設計判断を問う 4 問。**クイズはうなずきでは通せない。** 2 問以上落としたら、ドリルへ進む前に \`Signer\` のステップに戻ること。
`,
                  quizQuestions: [
                    {
                      question: "Alloy は署名を 2 つのトレイトに分けている: \`Signer\`（チェーン非依存。ハッシュ / メッセージに署名）と \`TxSigner<Sig>\`（チェーン認識。\`SignableTransaction\` 経由でトランザクションに署名）。なぜ \`TxSigner\` は \`Signer\` のメソッドではなく、*別の* トレイトなのか?",
                      options: [
                        "後方互換のため — 古い alloy バージョンには \`Signer\` しかなく、\`TxSigner\` は非破壊な追加として後付けされたから。",
                        "署名操作の大部分は tx 署名ではない（dapp の利用は EIP-191 メッセージや EIP-712 typed data が支配的）。まれな tx ケースのために \`Signer\` 全体をチェーンでパラメータ化すると、すべての署名者のシグネチャがふくらむ。加えて、\`Signer\` 実装（\`PrivateKeySigner\` など）はチェーン非依存でネットワーク横断に再利用できる — \`N\` でタグを付けると、チェーンごとに 1 つの署名者 struct を強いることになる。",
                        "Rust のトレイト一貫性ルールが、同じトレイトに sync と async のメソッドを混在させることを禁じるから。",
                        "\`Signer\` は外部ライブラリが実装し、\`TxSigner\` は alloy が実装する。明確な境界を保つために分けている。",
                      ],
                      correctIndex: 1,
                      explanation: "理由は 2 つが重なっている。第一に、署名操作はたいてい tx 署名ではない — 本番コードの大半は EIP-191 メッセージか EIP-712 typed data に署名する。\`Signer\` に tx 署名を載せると、まれなケースのために全署名者をパラメータ化する羽目になる。第二に、\`PrivateKeySigner\` は本質的にチェーン非依存(secp256k1 鍵は Ethereum か Optimism かを気にしない)。\`Signer\` を \`N\` でタグ付けすると、\`PrivateKeySigner<Ethereum>\` と \`PrivateKeySigner<Optimism>\` を別型として要求することになり、ムダが生じる。分割によって \`Signer\` をチェーン非依存で再利用可能に保ちつつ、\`TxSigner<N>\` がチェーン固有の tx 署名能力を担う — *1 つの* \`Signer\` 実装で *複数の* チェーンに対応できる。",
                    },
                    {
                      question: "\`Signer<Sig = Signature>\` は \`Sig\` を関連型ではなく、*トレイトのジェネリックパラメータ* としてパラメータ化している（\`Network::TxEnvelope\` のような関連型ではなく）。決定的な理由は?",
                      options: [
                        "ジェネリックパラメータのほうが関連型より高速にコンパイルされるから。",
                        "関連型はデフォルトを持てず、ジェネリックパラメータは持てるから。\`Signature\` をデフォルトにできることが唯一の理由。",
                        "1 つの署名者が、異なる \`Sig\` 型でトレイトを *複数回* 実装したい場合があるから — 例: 同じ struct に \`impl Signer<Signature> for X\` と \`impl Signer<RawBytes> for X\` を併存させる。ジェネリックパラメータ ＝ 「互換な Sig を任意に選んで、このトレイトを複数回実装できる」。関連型 ＝ 「実装ごとに Sig をひとつだけ確定する」。署名者には複数実装を許す形が正しい意味論。",
                        "ジェネリックパラメータは \`dyn Trait\` を許すが、関連型は許さないから。",
                      ],
                      correctIndex: 2,
                      explanation: "選択の基準は、型ごとに複数の実装が意味を持つかどうか。Network の \`TxEnvelope\` はチェーンごとに固定（Ethereum に対して有効な TxEnvelope 型を 2 つ持つことはありえない）— 関連型が合う。Signer の \`Sig\` は操作ごとに異なりうる: ECDSA 鍵の署名者は通常用途に \`Signature\` を、生バイト出力 API に \`Bytes\` を生成できる — ジェネリックパラメータならその両立が可能。**ジェネリック ＝ 「複数実装が有効」。関連 ＝ 「型ごとに 1 つの実装」。** 同じ形の設計判断でも、ユースケースで答えが変わる。（デフォルト値はどちらの形式でも持てる — それは理由にはならない。)",
                    },
                    {
                      question: "\`PrivateKeySigner\` も \`AwsSigner\` も、\`address()\` を呼び出すたびに計算するのではなく構築時にキャッシュしている。なぜ重要か — コストモデルはどうなっているか?",
                      options: [
                        "\`address()\` は private で、実質的に signer クレートの外から呼ばれないから。キャッシュは様式的な選択にすぎない。",
                        "\`address()\` は *すべてのトランザクション* で呼ばれる（追跡、ロギング、署名適格性チェック、コールフレーム構築などのため、tx ごとに複数回呼ばれることも多い）。\`AwsSigner\` でキャッシュなしだと、\`address()\` の呼び出しごとに AWS への往復が発生し、tx あたり 50〜200ms のレイテンシが乗る。\`PrivateKeySigner\` ならキャッシュなしでも 1 回ごとの keccak256-of-pubkey で済むが、それでもムダ。構築時のキャッシュは、一度きりのセットアップと、ほぼゼロの per-call コストを取引する形になる。",
                        "Ethereum プロトコルが、セッション中の全呼び出しで \`address()\` が安定値を返すことを要求するから。",
                        "Rust の借用チェッカーが \`address()\` を作業つきのメソッドにすることを許さないから — 事前計算値を読まざるをえない。",
                      ],
                      correctIndex: 1,
                      explanation: "鍵はアクセスパターン。すべてのトランザクションが \`address()\` に少なくとも 1 度（送信者チェック、署名適格性）触れ、ロギング、監視、コールフレーム構築のためにそれ以上触れることも多い。とくに \`AwsSigner\` でキャッシュなしだと、tx ごとに \`describe_key\` への往復が発生する — *誰の鍵で署名するかを知るためだけに* 全トランザクションを AWS のレイテンシで待たせることになる。構築時に 1 度キャッシュ（\`AwsSigner::new\` 内で）すれば、そのコストは 1 回しか支払われない。\`PrivateKeySigner\` の per-call コストは「非圧縮 pubkey の keccak256 の末尾 20 バイトを取る」処理 — 安価ではあるが、繰り返すのは無意味。**tx ごとに繰り返す高コストはキャッシュする; もとから安価なコストはキャッシュしない。**",
                    },
                    {
                      question: "ユーザーコードが \`ProviderBuilder.wallet(signer).build()\` を呼ぶ。alloy 内部を追ってみる: 出来上がるプロバイダの実際の層構造はどうなっており、\`sign_transaction\` はどこで呼ばれるか?",
                      options: [
                        "\`ProviderBuilder.wallet(signer)\` は署名者をプロバイダに直接格納する。\`send_transaction\` が内側プロバイダへ転送する前に、内部で \`signer.sign_transaction()\` を呼ぶ。",
                        "\`.wallet(signer)\` は \`.layer(WalletFiller::new(signer))\` の糖衣 — FillProvider チェーンに \`WalletFiller<W>\` を \`TxFiller<N>\` として組み込む（\`NonceFiller\`、\`GasFiller\`、\`ChainIdFiller\` と並べて）。ユーザーが \`provider.send_transaction(...)\` を呼ぶと、各 filler の \`fill()\` がスタック順に実行され、\`WalletFiller::fill\` が値の埋まった unsigned tx に対して \`wallet.sign_transaction()\` を呼んで署名を取り付ける。",
                        "\`.wallet(signer)\` は単なる便利メソッド — 署名者はリクエスト型へ move され、署名は RPC エンコード後のトランスポート層で行われる。",
                        "\`.wallet(signer)\` は、次のプロバイダ層に「署名済みリクエストを期待する」と伝えるマーカー。署名は \`send_transaction\` 呼び出しの前に外部で済ませる前提だ。",
                      ],
                      correctIndex: 1,
                      explanation: "\`.wallet(signer)\` は \`.layer(WalletFiller::new(signer))\` の糖衣。署名者は nonce / gas / chain-id と同じ Filler 機構を経て Provider チェーンに組み込まれる — \`WalletFiller<W>\` は FillProvider チェーンで動く \`TxFiller<N>\` だ。リクエストが流れると、各 filler はスタック順に実行される（典型的には nonce → gas → chain-id → wallet → send）。Wallet filler が最後に来るのは、署名ハッシュを計算する前に unsigned tx が完全に埋まっている（nonce / gas / chain-id が充填済み）必要があるから。Provider チェーン由来の合成パターンがここでもそのまま使われ、署名が新しいプレイヤーとして加わるかたち。",
                    },
                  ],
                },
                {
                  title: 'レッスン9 — ドリル: FillProvider チェーン経由でエンドツーエンドの署名済 tx',
                  slug: 'alloy-signer-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 12,
                  duration: 12,
                  xpReward: 25,
                  content: `# レッスン9 — ドリル: FillProvider チェーン経由でエンドツーエンドの署名済 tx

## 問い

読むだけではリハーサル、**手を動かすことで記憶**。実際の署名者を ProviderBuilder に配線、Anvil に対して署名済み tx を送信、FillProvider チェーンが nonce / gas / chain-id / 署名をスタック順に処理するのを観察。**Provider + Network + Signer 3 チェーンの総決算 — どう組み合わさるか？**

## 原理（最小モデル）

- **\`PrivateKeySigner\` で \`sign_hash\` 直接.** \`k256::sign_recoverable\` で \`(r, s, v)\` 全部得られる、追加 recovery 不要。
- **4 Filler のスタック順序.** NonceFiller → GasFiller → ChainIdFiller → WalletFiller。「fill → sign」順序は譲れない（署名ハッシュ計算前に nonce/gas/chain_id 揃う必要）。
- **\`with_recommended_fillers()\` + \`.wallet(signer)\`.** nonce + gas + chain-id 自動 + 署名層追加。
- **3 チェーン総合.** Provider チェーン（\`ProviderBuilder\`）+ Network チェーン（\`TransactionBuilder\` の \`.with_to\` / \`.with_value\`）+ Signer チェーン（\`.wallet()\`）が 1 実行可能プログラム。
- **Filler 外すと失敗.** NonceFiller なしだと "missing nonce"、GasFiller なしだと "missing gas" 等。各 filler がギャップを 1 つずつ埋める証拠。
- **タワー型の型レベル具現化.** \`FillProvider<JoinFill<JoinFill<JoinFill<JoinFill<Identity, GasFiller>, NonceFiller>, ChainIdFiller>, WalletFiller<EthereumWallet>>, RootProvider, Ethereum>\` がスタック順序を型でエンコード。

## 具体例

セットアップ:

\`\`\`bash
# ターミナル 1: Anvil（10 アカウントを prefund）
anvil

# ターミナル 2: プロジェクト
cargo new alloy-signer-drill --bin
cd alloy-signer-drill
\`\`\`

\`Cargo.toml\`:

\`\`\`toml
[dependencies]
alloy = { version = "0.x", features = ["full", "provider-http", "signer-local"] }
tokio = { version = "1", features = ["full"] }
eyre = "0.6"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
\`\`\`

ドリル 1（ハッシュ直接署名）:

\`\`\`rust
use alloy::primitives::{B256, keccak256};
use alloy::signers::{Signer, local::PrivateKeySigner};

#[tokio::main]
async fn main() -> eyre::Result<()> {
    tracing_subscriber::fmt().with_env_filter("info").init();

    let signer = PrivateKeySigner::random();
    let signer_addr = signer.address();
    println!("signer address: {signer_addr}");

    let message = b"hello, alloy";
    let hash = keccak256(message);
    let sig = signer.sign_hash(&hash).await?;

    let recovered = sig.recover_address_from_prehash(&hash)?;
    assert_eq!(recovered, signer_addr);
    println!("recovered: {recovered}  (matches: {})", recovered == signer_addr);

    Ok(())
}
\`\`\`

ドリル 2（FillProvider + 実 tx 送信）:

\`\`\`rust
use alloy::providers::{Provider, ProviderBuilder};
use alloy::primitives::{Address, U256, address};

// ドリル 2: FillProvider 経由で実際に署名済みの tx を送る
let funded_pk = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
let funded_signer: PrivateKeySigner = funded_pk.parse()?;
let funded_addr = funded_signer.address();
println!("funded sender: {funded_addr}");

let provider = ProviderBuilder::new()
    .with_recommended_fillers()  // nonce + gas + chain_id
    .wallet(funded_signer)        // 署名
    .on_http("http://localhost:8545".parse()?);

// 新規アドレスに 1 ETH 送信
let recipient: Address = address!("000000000000000000000000000000000000beef");
let value = U256::from(1_000_000_000_000_000_000u128);  // 1 ETH

let pending = provider
    .send_transaction(
        alloy::rpc::types::TransactionRequest::default()
            .with_to(recipient)
            .with_value(value)
    )
    .await?;
let receipt = pending.get_receipt().await?;
println!("tx hash: {:?}", receipt.transaction_hash);
println!("status: {:?}", receipt.status());

let recipient_balance = provider.get_balance(recipient).await?;
println!("recipient balance: {recipient_balance}");
\`\`\`

期待出力:

\`\`\`
signer address: 0x... (ランダム)
recovered: 0x... (matches: true)
funded sender: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
tx hash: 0x...
status: true
recipient balance: 1000000000000000000
\`\`\`

4 Filler の処理表:

| Filler | 埋めたフィールド | 処理 |
| :--- | :--- | :--- |
| NonceFiller | \`nonce\` | \`eth_getTransactionCount(from, "pending")\` 呼ぶ |
| GasFiller | \`gas\` / \`gasPrice\` / \`maxFeePerGas\` + \`maxPriorityFeePerGas\` | \`eth_estimateGas\` + \`eth_gasPrice\`（or \`eth_feeHistory\`）呼ぶ |
| ChainIdFiller | \`chainId\` | \`eth_chainId\` を 1 度呼んでキャッシュ |
| WalletFiller | \`signature\`（\`TxEnvelope\` 化） | \`SignableTransaction\` 構築 + \`signer.sign_transaction()\` + 署名取り付け |

**順序が重要**: WalletFiller は他の filler の **後** に走る（署名ハッシュ計算前に nonce/gas/chain_id 揃う必要）。

Filler 外して失敗観察:

\`\`\`rust
let provider_no_fillers = ProviderBuilder::new()
    .wallet(funded_signer.clone())  // wallet のみ
    .on_http("http://localhost:8545".parse()?);

let result = provider_no_fillers
    .send_transaction(
        TransactionRequest::default()
            .with_to(recipient)
            .with_value(U256::from(1_000_000_000_000_000_000u128))
    )
    .await;
println!("no-filler result: {:?}", result);
\`\`\`

エラー: "missing nonce" or "missing gas" or "missing maxFeePerGas"。**filler が実際に作業している証拠**。

最終 Provider 型（任意観察）:

\`\`\`
FillProvider<JoinFill<JoinFill<JoinFill<JoinFill<Identity, GasFiller>, NonceFiller>, ChainIdFiller>, WalletFiller<EthereumWallet>>, RootProvider, Ethereum>
\`\`\`

左から右に読む: \`FillProvider\` が内側プロバイダラップ、\`JoinFill<...>\` チェーンが 4 filler スタック、Wallet 最外で送信時最後適用。**型レベルでスタック順エンコード**。

## 失敗例（誤解）

「WalletFiller を NonceFiller 前に置いてもよい」— **致命的**。署名ハッシュは nonce / gas / chain_id を含む → これらが埋まる前に署名すると無効署名。**fill → sign 順序譲れない**。

「\`with_recommended_fillers()\` だけで wallet 不要」— **間違い**。署名がない → \`TxEnvelope\` 化できない → broadcast 不可能。両方必要。

「Anvil の prefund 秘密鍵は本番で使える」— **絶対 NG**。Anvil の dev 鍵は **公開済み**、本番で使うと即盗難。**Anvil dev 鍵はテストのみ**。

## ステップで組み立てる

### Step 1: \`PrivateKeySigner::sign_hash\` を直接

\`k256::sign_recoverable\` で \`(r, s, v)\` 取得、\`recover_address_from_prehash\` で検証。

### Step 2: \`ProviderBuilder.with_recommended_fillers().wallet(signer)\`

4 filler スタック + 署名層追加。

### Step 3: 実 tx 送信

\`TransactionRequest::default().with_to(recipient).with_value(value)\` + \`send_transaction().get_receipt()\`。

### Step 4: 4 Filler 処理表

NonceFiller / GasFiller / ChainIdFiller / WalletFiller の RPC 呼び出しと埋めるフィールド。

### Step 5: Filler 外して失敗観察

NonceFiller なしで "missing nonce"、各 filler のギャップ埋め確認。

### Step 6: 最終 Provider 型のタワー観察

\`FillProvider<JoinFill<JoinFill<...>>>\` がスタック順を型でエンコード。

## 答え合わせ

- **\`PrivateKeySigner\` で recovery-id 不要、\`AwsSigner\` で必要な理由**: \`PrivateKeySigner\` = \`k256::sign_recoverable\` が \`(r, s, v)\` 全部返す → 追加処理なし。\`AwsSigner\` = AWS KMS が \`(r, s)\` のみ → \`v\` は v=0/v=1 試して **キャッシュ済み address を再現するほう** を選ぶ。クラウド署名のコスト。
- **4 Filler の実行順と RPC 呼び出し**: NonceFiller → \`eth_getTransactionCount\`、GasFiller → \`eth_estimateGas\` + \`eth_gasPrice\`（or \`eth_feeHistory\`）、ChainIdFiller → \`eth_chainId\`（キャッシュ）、WalletFiller → \`signer.sign_transaction\`。**fill → sign 順序が譲れない**。
- **\`WalletFiller\` が filler チェーン最後の理由**: 署名ハッシュ計算は nonce / gas / chain_id を含む → これらが埋まる前に署名すると **無効署名**。NonceFiller より前に走らせると署名 = 古い nonce → ネットワークが reject。**fill → sign 順序、譲れない**。

## 合格基準

- \`PrivateKeySigner.sign_hash\` の \`(r, s, v)\` 取得を即答できる。
- 4 Filler の処理表（埋めるフィールド + RPC 呼び出し）を書ける。
- WalletFiller が最後である理由を 1 文で説明できる。
- Filler 外したときの "missing nonce" / "missing gas" 失敗パターンを言える。
- 最終 Provider 型のタワー（\`FillProvider<JoinFill<JoinFill<...>>>\`）が型レベルでスタック順エンコードと理解している。

## まとめ（3行）

- 3 チェーン総決算 = Provider（\`ProviderBuilder\`）+ Network（\`TransactionBuilder\` の \`.with_to\` / \`.with_value\`）+ Signer（\`.wallet()\`）が 1 実行可能プログラム。
- 4 Filler スタック（NonceFiller → GasFiller → ChainIdFiller → WalletFiller）= **fill → sign 順序譲れない**、署名ハッシュ計算前に nonce/gas/chain_id 揃う必要。
- 最終 Provider 型タワーが型レベルでスタック順エンコード、Filler 外すと "missing X" で fail = 各 filler のギャップ埋めが実証される、dapp / MEV ボット / インデクサが本番投入する標準パターン。
`,
                },
                {
                  title: 'レッスン10 — alloy 消費者コードのテスト',
                  slug: 'alloy-testing-ja',
                  type: 'CONTENT',
                  sortOrder: 13,
                  duration: 22,
                  xpReward: 45,
                  content: `# レッスン10 — alloy 消費者コードのテスト

## 問い

Provider / Network / Signer に依存するコード（Building tier の MEV searcher / indexer / wallet backend / swap aggregator）をどうユニットテストするか？ **実 RPC エンドポイントを立てずにテストできないと、test gate は機能しない — どのパターンが本番標準か？**

## 原理（最小モデル）

- **3 種テスト.** プログラム制御 anvil（ほぼ常時）+ Forked anvil（実 mainnet 状態）+ トレイト差し替え（稀、ロジックがチェーンセマンティクスに依存しない）。
- **\`Anvil::new().spawn()\` で 50ms 起動.** alloy 同梱、テスト内インプロセス、10 アカウント prefund + RPC URL 返す。
- **\`AnvilApi\` トレイト拡張.** \`anvil_set_balance\` / \`anvil_set_storage_at\` / \`anvil_set_code\` / \`anvil_impersonate_account\` / \`anvil_mine\` / \`anvil_snapshot\`+\`anvil_revert\`。**同じ Provider トレイトの拡張**、本番で使うプロバイダがテストでも走る。
- **Forked anvil でブロック pin 必須.** pin しなければ非決定的、CI 意味なし。pin すれば assertion 厳しく可能。
- **手書きモックは稀.** 純粋決定関数を秒間数百バリエーションで回したいときのみ。実務では anvil が十分速くスキップ不要。
- **Building tier 接続.** 全アプリの test gate スケッチが \`forked_provider_at(...)\` の 1 行ラッパ、本レッスンが Building の前提。
- **「表面同等性」が mock 中心アプローチに勝つ理由.** 本番プロバイダ + cheat = テストでも本物の Provider トレイトが走る、cheat は同表面に重なる。

## 具体例

3 種テスト:

| テスト種別 | 使う Provider | コスト | いつ使うか |
| :--- | :--- | :--- | :--- |
| プログラム制御 anvil | \`anvil\` インプロセス | 起動 ~50ms | ほぼ常時、ユニットテストに十分速い |
| Forked anvil | \`anvil --fork-url <RPC>\` + ブロック pin | ~200ms + RPC クォータ | 実 mainnet コントラクト状態必要 |
| トレイト差し替え | \`impl Provider for ...\` の自作 struct | なし | 稀、チェーンセマンティクス非依存 |

プログラム制御 anvil:

\`\`\`rust
use alloy::node_bindings::Anvil;
use alloy::providers::ProviderBuilder;
use alloy::primitives::U256;

#[tokio::test]
async fn user_balance_round_trips() {
    let anvil = Anvil::new().spawn();              // インプロセスで ~50 ms
    let provider = ProviderBuilder::new().connect_http(anvil.endpoint().parse().unwrap());

    let addr = anvil.addresses()[0];
    let balance = provider.get_balance(addr).await.unwrap();
    assert_eq!(balance, U256::from(10_000) * U256::from(10).pow(U256::from(18)));

    drop(anvil);  // drop で anvil プロセスは終了
}
\`\`\`

\`AnvilApi\` トレイト拡張:

\`\`\`rust
use alloy::providers::ext::AnvilApi;

#[tokio::test]
async fn impersonates_a_real_address() {
    let anvil = Anvil::new().spawn();
    let provider = ProviderBuilder::new().connect_http(anvil.endpoint().parse().unwrap());

    let vitalik: Address = "0xab5801a7d398351b8be11c439e05c5b3259aec9b".parse().unwrap();

    // Cheat 1: vitalik に 100 ETH 与える
    provider.anvil_set_balance(vitalik, U256::from(100) * U256::from(10).pow(U256::from(18))).await.unwrap();

    // Cheat 2: vitalik になりすます
    provider.anvil_impersonate_account(vitalik).await.unwrap();

    // 署名不要で vitalik 発の tx を送る
    let tx = TransactionRequest::default().from(vitalik).to(BOB).value(U256::from(1));
    let receipt = provider.send_transaction(tx).await.unwrap().get_receipt().await.unwrap();
    assert!(receipt.status());

    provider.anvil_stop_impersonating_account(vitalik).await.unwrap();
}
\`\`\`

cheat の全体像:
- \`anvil_set_balance\` / \`anvil_set_storage_at\` / \`anvil_set_code\` — 状態書き換え
- \`anvil_impersonate_account\` — なりすまし
- \`anvil_mine\` — 強制 mine
- \`anvil_snapshot\` / \`anvil_revert\` — 状態チェックポイントとロールバック

**MEV / wallet / indexer のテストを実現可能にする道具立て**。

Forked anvil（実 mainnet 状態）:

\`\`\`rust
#[tokio::test]
async fn quotes_against_real_uniswap_v3() {
    let anvil = Anvil::new()
        .fork("https://eth.merkle.io")
        .fork_block_number(18_500_000)
        .spawn();
    let provider = ProviderBuilder::new().connect_http(anvil.endpoint().parse().unwrap());

    // ブロック 18_500_000 時点の USDC/WETH 0.3% pool
    let pool: Address = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640".parse().unwrap();
    let slot0 = provider.call(/* IUniswapV3Pool::slot0Call */).await.unwrap();
    // slot0 は決定的（実行間で）
}
\`\`\`

**ブロック pin 必須**: pin しないと non-deterministic、CI 意味なし。pin すれば assertion 厳しく（QuoterV2 出力との 5 bps 以内など）。

手書きモック（稀）:

\`\`\`rust
struct CannedProvider {
    balance_responses: Vec<U256>,
    call_count: AtomicUsize,
}

#[async_trait]
impl Provider for CannedProvider {
    fn root(&self) -> &RootProvider { /* ... */ }

    fn get_balance(&self, _addr: Address) -> ProviderCall<NoParams, U256, U256> {
        let idx = self.call_count.fetch_add(1, Ordering::SeqCst);
        ProviderCall::ready(Ok(self.balance_responses[idx]))
    }
    // 他メソッドはデフォルト実装（呼ばれたら panic）
}
\`\`\`

実務でレア = anvil 十分速い + cheat 充実で大半スキップ不要。

Building tier 接続:

\`\`\`rust
let svc = test_service().await;
let provider = forked_provider_at(FORK_RPC, PINNED_BLOCK).await;
\`\`\`

\`forked_provider_at(...)\` = §3 の \`Anvil::new().fork(...).spawn()\` パターン 1 行ラッパ。

## 失敗例（誤解）

「Forked anvil のブロック pin なしで OK」— **間違い**。ブロックなしだと pool price が動く → assertion 許容幅広く必要 → 何を担保したか不明。**pin で決定的テスト**。

「手書き mock のほうが速いから本番向き」— **間違い**。anvil ~50ms 起動、十分速い。mock = Provider トレイトを部分実装 → 本番経路と乖離 + cheat 使えない。**anvil 表面同等性が勝つ**。

「\`AnvilApi\` は独立トレイト」— **間違い**。**Provider のトレイト拡張**、本番で使うのと同じ Provider がテストでも走る。基底トランスポートが anvil のときに（そのときに限り）プロバイダ上のメソッド呼び出しになる。

## ステップで組み立てる

### Step 1: 3 種テストを選ぶ

ほぼ常時 = プログラム制御 anvil / 実 mainnet 状態 = Forked anvil / 稀 = トレイト差し替え。

### Step 2: \`Anvil::new().spawn()\` パターン

50ms 起動、10 prefund アカウント、\`anvil.endpoint()\` で URL。

### Step 3: \`AnvilApi\` cheats

\`anvil_set_balance\` + \`anvil_impersonate_account\` で MEV / wallet テスト実現。

### Step 4: Forked anvil でブロック pin

\`.fork(rpc).fork_block_number(N)\` で決定的、実 mainnet コントラクト状態。

### Step 5: 手書きモックは稀

純粋決定関数を秒間数百バリエーション = mock、それ以外 = anvil。

### Step 6: Building tier 接続

全アプリ test gate が \`forked_provider_at(...)\` 1 行、本レッスンが前提。

## 答え合わせ

- **\`Anvil::new().spawn()\` が手書き \`MockProvider\` より忠実度が高い理由**: 本番で使う Provider トレイトがテストでも走る + cheat はその同じ表面に重なる → **表面同等性**。Mock は Provider トレイトを部分実装 → 本番経路と乖離 + cheat 使えない + 手書きコスト。anvil ~50ms 起動で速度差ほぼなし。
- **Forked anvil でブロック pin 必須な理由**: pin しないと pool price がブロックごとに動く → assertion 許容幅広く必要（QuoterV2 出力との 5%? 10%?）→ **何を担保したか不明**。pin = 決定的 → 厳しい assertion 可能（5 bps 以内）→ CI で意味ある。
- **\`AnvilApi\` がトレイト拡張で別型でない理由**: 本番で使う Provider をテストでも使う → cheat はその同じ Provider 上のメソッド呼び出しになる（基底トランスポートが anvil のときのみ動く）。別型だとテスト用プロバイダと本番用プロバイダで API 表面が違う → mock 中心アプローチに退化。**表面同等性がパターンの肝**。

## 合格基準

- 3 種テスト（プログラム制御 anvil / Forked anvil / トレイト差し替え）を即答できる。
- \`Anvil::new().spawn()\` の 50ms 起動 + 10 prefund アカウントを言える。
- \`AnvilApi\` cheats（\`anvil_set_balance\` / \`anvil_impersonate_account\` 等）を即答できる。
- Forked anvil のブロック pin 必須理由を 1 文で説明できる。
- 表面同等性が mock 中心に勝つ理由を 1 文で説明できる。

## まとめ（3行）

- 3 種テスト = プログラム制御 anvil（ほぼ常時、50ms 起動）/ Forked anvil（実 mainnet、ブロック pin 必須）/ トレイト差し替え（稀）。
- \`AnvilApi\` cheats（set_balance / impersonate_account / snapshot / revert）= MEV / wallet / indexer テストを実現可能にする道具立て、Provider のトレイト拡張で本番と同表面。
- 「表面同等性」が mock 中心アプローチに勝つ理由 = 本番で使う Provider がテストでも走る + cheat 同表面に重なる、anvil ~50ms で速度差なし、Building tier 全アプリ test gate の前提。
`,
                },
                {
                  title: 'クイズ — Inside Alloy 完走',
                  slug: 'alloy-advanced-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 14,
                  duration: 8,
                  xpReward: 25,
                  content: `# クイズ — Inside Alloy 完走

3 トピックチェーン（Provider / Network / Signer）+ Testing の構造的事実を確認する。3 中級コース（Revm・Reth・Alloy）完走に向けたゲート。

3 問。**クイズはうなずきでは通せない。** 2 問落としたら、Inside Alloy を終えたと言う前に、該当チェーンの組み立てを読み直すこと。
`,
                  quizQuestions: [
                    {
                      question: "\`Provider\` の \`root()\` メソッドはトレイトで唯一必須のメソッド — ほかの RPC メソッドはすべてデフォルト実装を持つ。設計上、決定的に効いているアーキテクチャ的な意図は?",
                      options: [
                        "ロギング / トレース用にプロバイダ名を返すため。",
                        "ラッパープロバイダ（署名、filler チェーン、カスタム層）が 30 以上の RPC メソッドを再実装せずにトランスポートアクセスを委譲できるようにするため。ラッパー側は \`root()\` を内側プロバイダの \`root()\` へ転送する。あとはトレイトのデフォルト実装が \`self.root()\` 経由で実トランスポートへルーティングする — ラッパーの塔を自動的に貫通していく。",
                        "API 安定性のために残された後方互換メソッドだから。",
                        "Rust の \`dyn Provider\` インフラに必要だから。",
                      ],
                      correctIndex: 1,
                      explanation: "\`root()\` の間接化こそが FillProvider のスタックを成り立たせている要素。ラッパー作者は *メソッド本体ひとつ*（root の転送）と、オーバーライドしたい特定のメソッドだけを書けばよい; 残りの 30 以上のメソッドはトレイトのデフォルト実装からそのまま得られる。これがあるからこそ \`LoggingProvider\`、\`FillProvider\`、\`WalletFiller\` や任意のカスタム層が、N×M のメソッド本体爆発なしに合成できる。Provider チェーンのステップ 4 で見たパターンそのもの。",
                    },
                    {
                      question: "\`Network\` は、トレイトのジェネリックパラメータ 10 個ではなく、*関連型* を 10 個（TxType、TxEnvelope、TransactionRequest、TransactionResponse、ReceiptEnvelope、ReceiptResponse、Header、HeaderResponse、BlockResponse、UnsignedTx）持っている。Network 上ジェネリックなコードに対して効いてくる利点は?",
                      options: [
                        "関連型のほうがジェネリックパラメータより高速にコンパイルされるから。",
                        "一貫性 + 簡潔さ: 関連型は「これらは組で動く」をひとまとめにする（Ethereum の TxRequest は Ethereum の TxEnvelope と組まなければならず、Optimism のものとは組めない）。加えて、呼び出し側は素のジェネリック 10 個ではなくパラメータ 1 個（\`<N: Network>\`）を書けばよい。",
                        "ジェネリックパラメータはトレイトメソッドのシグネチャでは使えず、トレイト本体内でしか使えないから。",
                        "関連型は \`dyn Trait\` をサポートし、ジェネリックパラメータはしないから。",
                      ],
                      correctIndex: 1,
                      explanation: "決め手は一貫性の性質。\`Provider<EthereumTxRequest, OptimismReceipt>\` は素のジェネリックならコンパイルしてしまう — 違うチェーンの型を混ぜるのを止める仕組みがない。関連型なら 1 つの \`Network\` 実装の下にまとまり、\`Ethereum\` を選んだ時点で一貫した一式が選ばれる。加えて、Provider に言及するすべてのシグネチャに素のジェネリック 10 個を書く必要がなくなり、\`N: Network\` 1 つで 10 種類の型をまとめて引き込める。alloy 内のほかの場所でも同じイディオムが使われる: \`TransactionEnvelope<Self>\`、\`BlockResponse<Self>\` — 辞書キーでパラメータ化されたヘルパートレイトが、N 上ジェネリックなコードを移植可能に保つ。",
                    },
                    {
                      question: "ユーザーコードが \`ProviderBuilder.wallet(signer).on_http(url)\` を呼ぶ。alloy 内部を追ってみる: \`signer\` を Provider チェーンに組み込んでいる実際の仕組みは?",
                      options: [
                        "\`.wallet(signer)\` は署名者をプロバイダに直接格納し、\`send_transaction\` の内部で \`signer.sign_transaction()\` を呼ぶ。",
                        "\`.wallet(signer)\` は \`.layer(WalletFiller::new(signer))\` の糖衣 — FillProvider チェーンに \`WalletFiller<W>\` を \`TxFiller<N>\` として組み込む（\`NonceFiller\` / \`GasFiller\` / \`ChainIdFiller\` と並べて）。\`send_transaction\` が走ると、各 filler の \`fill()\` がスタック順に実行され、\`WalletFiller::fill\` が値の埋まった unsigned tx に対して \`signer.sign_transaction()\` を呼んで署名を取り付ける。",
                        "\`.wallet(signer)\` は、次のプロバイダ層に「署名済みリクエストを期待する」と告げるマーカー。署名は外部で行われる。",
                        "\`.wallet(signer)\` は基盤トランスポートを差し替え、出ていく JSON-RPC ペイロードに署名を注入する。",
                      ],
                      correctIndex: 1,
                      explanation: "\`.wallet(signer)\` は \`.layer(WalletFiller::new(signer))\` の糖衣。署名者は nonce / gas / chain-id と同じ Filler 機構を経て Provider チェーンに組み込まれる — \`WalletFiller<W>\` は FillProvider チェーン上で動く \`TxFiller<N>\` だ。順序が重要: \`WalletFiller\` は *最後* に走る — 署名ハッシュを計算する前に nonce / gas / chain_id が埋まっている必要があるから。3 つのチェーン（Provider の \`Filler\`、Network の \`TxFiller<N>\`、Signer の \`Signer\` + \`WalletFiller\`）が 1 つの実行可能プログラムに合成される — 3 つすべてをやり切ったアーキテクチャ上の見返りだ。",
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  });
}
