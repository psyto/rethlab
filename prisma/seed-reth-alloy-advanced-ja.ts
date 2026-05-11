import { PrismaClient } from '@prisma/client';

export async function seedRethAlloyAdvancedJA(prisma: PrismaClient) {
  const tags = ['alloy', 'rust', 'advanced', 'rpc', 'provider'];

  await prisma.course.create({
    data: {
      slug: 'alloy-advanced-ja',
      title: 'Alloy Advanced — Rust Ethereum ライブラリを読む',
      description:
        'alloy のソースを 1 行ずつ読み解く — `Provider` トレイト、`Network` 抽象、`Signer`/`Filler` モデル。3 つの独立した Advanced コース（Revm・Reth・Alloy）の 3 つ目で、順番は自由。alloy は Reth と dapp が依拠する基盤なので、このコースは Rust Ethereum コードを書くあらゆる場面で報われる。',
      difficulty: 'INTERMEDIATE',
      duration: 123,
      xpReward: 340,
      track: 'alloy-advanced',
      tags,
      isPublished: true,
      sortOrder: 200,
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
                  title: 'Alloy Advanced へようこそ — このコースの読み方',
                  slug: 'alloy-advanced-welcome-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# Alloy Advanced へようこそ — このコースの読み方

これは RethLab の 3 つの独立した Advanced ティアコースの 1 つです:

- **Revm Advanced** — EVM エンジンの内側
- **Reth Advanced** — Reth の内側: Staged Sync・ExEx・Reth SDK
- **Alloy Advanced**（あなたはここ）— Alloy の内側: Provider・Network・Signer

Alloy は他の全員が依拠する基盤 — Reth は alloy の型を使い、Revm は alloy の primitive を使い、Rust から Ethereum と話すすべての dapp / MEV ボット / インデクサが alloy の \`Provider\` を使います。このコースは **alloy のソースを読む** スキルを教えます — Revm Advanced が revm を読むスキルを教えるのと同じ形で。

> 📋 **Advanced ティアは初めて?** 始める前に *Bridge to Advanced* の末尾の **「Advanced コースの読み方」** を読んでください。編集スタイル（Predict プロンプト、クイズゲート、build-up → walkthrough → quiz → drill のチェーン構造）とペースを説明しています。3 つの Advanced コース全てに適用されるので、1 度だけ読めば OK。

## このコースが教えること

[\`alloy-rs/alloy\`](https://github.com/alloy-rs/alloy) のソースを 1 行ずつ読みます:

- **\`Provider\` トレイト** — Ethereum ノードと話すための中心的な抽象
- **\`Network\` 抽象** — alloy が Ethereum・Optimism・Anvil・カスタム L2 を同じ API で扱う仕組み
- **\`Signer\` / \`Filler\` モデル** — トランザクション署名、ガス推定、nonce 管理を層状のプロバイダに合成する仕組み

トピックチェーン 3 本、各々が build-up + walkthrough + quiz + drill。

終わる頃には alloy のホットパスを読み、カスタム Provider レイヤーを構築できるようになります — MEV パイプライン、インデクサ、Reth-SDK App-chain が本番出荷するのと同じ種類のコード。

## 前提知識

**中級 Rust**（Bridge to Advanced でカバー）:
- ジェネリクスとトレイト境界、関連型、デフォルト型パラメータ
- \`Arc<T>\`、\`dyn Trait\`、層状の所有権
- \`async\` / \`Future\` の基礎、Tokio ランタイムモデル
- \`auto_impl\` マクロと手続き属性

**EVM 内部知識は不要。** Alloy は EVM の上で動きます — ノードと話すのであって opcode と話すわけではない。(3 つの Advanced コース全てを取るなら EVM 内部は Revm Advanced で見ます。)

**alloy をユーザーとして使った経験** — \`Provider::get_balance\`、\`ProviderBuilder\`、tx 署名 — Fundamentals（\`alloy-primitives-signing\`、\`alloy-provider\`）でカバー。それが不安なら Fundamentals レッスンを先に。このコースは alloy を *使う* ではなく *読む* ことを教えます。

## セットアップ — 1 度だけ

レッスン 1 の前に、別ウィンドウで準備:

1. **\`alloy-rs/alloy\` を clone** — \`git clone https://github.com/alloy-rs/alloy\`
2. **動く \`cargo\` ツールチェイン** — \`rustc --version\` が現代的な版を出すこと
3. **セカンドモニタか分割端末** — 読みながらソースを参照する

「Find in repo」プロンプトはリポジトリを実際に開いていないと意味がありません。始める前にこのループを閉じる。

## 準備完了

コース詳細に戻り、**\`Provider\` トレイトをステップで組み立てる** から始めましょう。

Alloy Advanced の後: 3 つの Advanced コースを全て完了したことになります。**Expert** で手続きマクロと zkVM 統合の深掘りに進みます。`,
                },
                {
                  title: '\`Provider\` トレイトをステップで組み立てる',
                  slug: 'alloy-provider-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 25,
                  content: `# \`Provider\` トレイトをステップで組み立てる

[\`alloy-rs/alloy\`](https://github.com/alloy-rs/alloy) の \`Provider\` は Ethereum ノードと話すための中心的な抽象です。RPC エンドポイントに触れる Rust の dapp、MEV ボット、インデクサ、Reth-SDK アプリすべてがこれを使います。\`crates/provider/src/provider/trait.rs\` を開くと、トレイトはこんな形（抜粋）:

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

複数のことが一度に起きています: デフォルト付きの \`N: Network\` ジェネリック、別の \`RootProvider\` 型を返す \`root()\` アクセサ、見慣れないラッパー型（\`ProviderCall\`、\`RpcWithBlock\`、\`EthCall\`）を返すメソッド、5 つのラッパー型をカバーする \`auto_impl\`。

冷たく読むと一度に 6 つの新概念が来ます。もっと楽な道: **積み上げる**。書ける最も素朴な RPC クライアントから始めて、複雑さを 1 つずつ獲得する。終わりには本物の形（Network パラメータ化、トランスポート間接化、層状プロバイダ、すべて）を組み立てたことになる。

> 📂 **別タブで \`alloy-rs/alloy\` を開く。** 各ステップで照合する。正確なモジュールパスはリリースごとに動きます; 組み立てる構造は永続的です。

## ステップ 0 — 素朴な RPC クライアント

何も考えずに Rust ↔ Ethereum ブリッジを書くと、\`get_balance\` はこんな形:

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

自由関数。URL ハードコード。トランスポート（HTTP）ハードコード。チェーン（Ethereum 形 JSON-RPC）ハードコード。

> 🛑 **予測。** スクロールせずに: この素朴な設計が本番接触で生き残れない理由を 3 つ挙げる。ヒント — それぞれ違う *種類の* 問題。

3つ:

1. **URL ハードコード。** Anvil、Alchemy 経由のメインネット、プライベートノード、フォークハーネス — 関数を書き直さずに切り替えられない。
2. **トランスポートハードコード。** HTTP のみ。WebSocket サブスクリプションや IPC 接続は別のトランスポート機構; HTTP を埋め込むと 3 つのトランスポート用に同じ関数を 3 回書くことになる。
3. **チェーンハードコード。** Optimism トランザクションには \`L1Cost\` フィールドがある。カスタム L2 は独自のエンベロープ形状を持つ。JSON-RPC メソッド名は重複するがパラメータと応答型は異なる。Ethereum の形をハードコードすると、それ以外と話せない。

修正: **これら 3 軸をトレイトに抽象化する。** 各軸はジェネリックパラメータになり、ユーザーは構築時に 1 度選び、トレイトメソッドの本体は変わらない。

## ステップ 1 — 最初のトレイト: RPC メソッドの上の Provider

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

\`Provider\` がトレイトに。実装は呼び出しをどう実現するかを選ぶ（HTTP、WebSocket、モックなど）。ユーザーはトレイトに対して書き、トランスポートのことは考えない。

これは *Ethereum* には効きます。でも Optimism が欲しい瞬間にトレイトが間違っているとわかります。

## ステップ 2 — 複数チェーン: \`Network\` 抽象

Optimism の \`TransactionRequest\` には \`l1_block_number\` ヒントがある。Optimism のレシートには \`l1_fee\` フィールドがある。同じ RPC メソッド名は存在する（\`eth_sendTransaction\`、\`eth_getTransactionReceipt\`）が *型* が違う。

\`OptimismProvider\` を並行トレイトとして書きたくはない — 90% は同一になる。代わりに **チェーンプリミティブを \`Network\` トレイトの後ろに抽象化** する:

\`\`\`rust
pub trait Network: Send + Sync + 'static {
    type TxEnvelope: ...;            // 署名済みトランザクション表現
    type UnsignedTx: ...;            // 未署名 tx
    type ReceiptEnvelope: ...;       // 署名済みレシート
    type Header: ...;                // ブロックヘッダー
    type TransactionRequest: ...;    // RPC 呼び出しの形
    type TransactionResponse: ...;   // RPC 応答
    type ReceiptResponse: ...;
    type HeaderResponse: ...;
    type BlockResponse: ...;
}

pub struct Ethereum;
impl Network for Ethereum { /* ...標準型... */ }

pub struct Optimism;
impl Network for Optimism { /* ...OP 固有型... */ }
\`\`\`

\`Network\` は *型レベル辞書* — \`N: Network\` を選ぶとチェーンが使う型の束を 1 箇所で選択する。

これで \`Provider\` は \`N\` でジェネリックに:

\`\`\`rust
pub trait Provider<N: Network> {
    async fn get_balance(&self, address: Address) -> Result<U256>;  // 全チェーン共通 — 変わらず
    async fn call(&self, tx: N::TransactionRequest) -> Result<Bytes>;  // チェーン固有
    async fn send_transaction(&self, tx: N::TransactionRequest) -> Result<...>;  // チェーン固有
    // ...
}
\`\`\`

> 🛑 **予測。** なぜ \`N: Network = Ethereum\`（デフォルト型パラメータ付き）がデフォルトなしの \`N: Network\` より良いか?

なぜなら **ユーザーの 99% は Ethereum を欲しがる**から。デフォルトのおかげで \`Provider<Ethereum>\` ではなく \`Provider\` と書ける。Optimism / カスタム L2 ユーザーだけが上書きする。デフォルト型パラメータは一般ケースを楽にし、レアケースは明示的にする。

本物の alloy トレイトはまさにこのデフォルトを持つ: \`pub trait Provider<N: Network = Ethereum>\`。

## ステップ 3 — 複数のトランスポート: 間接化

2 つの実装を想像する: \`HttpProvider\` と \`WsProvider\`。両方ともトレイトを満たす。でも *基盤クライアント*（JSON-RPC ペイロードを送る何か）が違う — 一方は \`reqwest::Client\`、もう一方は WebSocket 接続。

トランスポートが型の一部なら:

\`\`\`rust
struct HttpProvider<N: Network> { client: reqwest::Client, url: Url, _phantom: PhantomData<N> }
struct WsProvider<N: Network>   { conn: WsConnection, _phantom: PhantomData<N> }
struct IpcProvider<N: Network>  { /* ... */ }
\`\`\`

同じトレイトメソッドを持つ 3 つの struct、本体はコピペ。悪い。

良い案: **トランスポートトレイトを導入する**。プロバイダは JSON-RPC を送れる *何か* を持つ; その何かはトレイトオブジェクト:

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

> 🔍 **リポジトリで確認。** alloy で \`alloy-transport\` と \`alloy-transport-http\` を検索。トランスポートが別クレートになっていることに注目。これにより \`alloy-transport-http\` *だけ* または \`alloy-transport-ws\` *だけ* に依存できる、両方は引き込まずに。

(現行 alloy では、トランスポートトレイトは \`tower::Service\` を裏に持つ \`Transport\` + \`TransportConnect\` のより精巧な設計に進化しています。でも構造的決定 — トランスポートを抽象化して 1 つのプロバイダ実装で全てを動かす — は永続的な形。)

## ステップ 4 — \`RootProvider\` と \`root()\` 間接化

ここまでで 1 つの struct: \`ProviderImpl<T, N>\`。でも alloy を設計した SDK の人たちが直面した問題: **ユーザーはプロバイダをラップしたい**。

外向きトランザクションを *自動的に署名する* プロバイダが欲しいとする。\`SignerProvider\` を書く: 内部の \`Provider\` をラップして \`send_transaction\` をオーバーライド:

\`\`\`rust
pub struct SignerProvider<P: Provider, S: Signer> {
    inner: P,
    signer: S,
}
\`\`\`

\`SignerProvider\` 自体が \`Provider\` を実装すれば（ほとんどのメソッドを \`inner\` に転送し、\`send_transaction\` をオーバーライド）、ユーザーは積層できる: \`SignerProvider<NonceFiller<HttpProvider>>\`。

でもこれらのラッパーは独自のトランスポートを持たない — トランスポートアクセスのために *最も内側の* プロバイダに委譲する必要がある。だから \`root()\` メソッド:

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

\`RootProvider\` は **トランスポートを所有する具象 struct**。それ以外の Provider 実装は内部のプロバイダを保持して、その内部に \`root()\` を転送するだけ。トレイトのデフォルトメソッドは \`self.root()\` にフォールバックしてトランスポートアクセスする — だからラッパーの作者は変更したい部分だけをオーバーライドする。

> 🛑 **理解度チェック。** スクロールせずに: \`SignerProvider\` を書いていると想像する。どのメソッドをオーバーライドし、どれをデフォルトに任せる? なぜ \`root()\` 間接化がこれをきれいにするのか?

\`send_transaction\` をオーバーライドする（tx に署名、そして inner に転送）。それ以外（\`get_balance\`、\`call\` 等）はトレイトのデフォルト impl に発火させる — それらは \`self.root()\` を使ってトランスポートを得る。**メソッド本体を 30 個書く代わりに 1 個書く。**

## ステップ 5 — 層状プロバイダ: \`FillProvider\` と \`Filler\`

ステップ 4 のラッパーパターンは一般化する。よくあるニーズ:

- **外向きトランザクションに署名する**（\`Signer\`）
- **nonce を埋める**（ユーザーが指定しないなら \`get_transaction_count\` を問い合わせる）
- **ガス見積もりを埋める**（ユーザーがガス上限を指定しないなら \`estimate_gas\` を実行）
- **チェーン ID を埋める**（\`chain_id\` を 1 度問い合わせ、すべての tx に付ける）

それぞれが \`Filler\` — 送信前に外向き \`TransactionRequest\` を変更する小さなロジック片。次のように合成する:

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

積層する: \`FillProvider<NonceFiller, FillProvider<GasFiller, FillProvider<SignerFiller, RootProvider>>>\`。各層が 1 ピースを埋める。ユーザーはビルダーで組み立てる:

\`\`\`rust
let provider = ProviderBuilder::new()
    .filler(NonceFiller)
    .filler(GasFiller)
    .signer(my_signer)
    .on_http(url);
\`\`\`

各 \`.filler(...)\` 呼び出しが内部プロバイダをさらに \`FillProvider\` 層でラップする。**継承ではなく合成 — RPC クライアント構築に適用。**

## ステップ 6 — 共有利用のための \`auto_impl\`

最後の 1 ピース。本物の alloy は:

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync { /* ... */ }
\`\`\`

\`auto_impl\` は \`P: Provider\` のとき \`&P\`、\`&mut P\`、\`Box<P>\`、\`Rc<P>\`、\`Arc<P>\` の \`Provider\` を導出する。なぜか?

なぜなら **MEV ボット、インデクサ、dapp サーバーは皆、1 つのプロバイダを多くのタスクで共有したい**から。自然な形は \`Arc<Provider>\` — Arc を安価にクローンし、1000 のワーカータスクに渡し、全員が同じ接続プールに当たる。\`auto_impl\` は \`Arc<P>\` の \`Provider\` 実装を無料で作るので、呼び出し側は \`Arc<dyn Provider>\` や \`Arc<P>\` を \`P\` 自体と互換的に使える。

## ここまでに組み立てたもの

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync {
    fn root(&self) -> &RootProvider<N>;
    // self.root() を経由するデフォルト実装の RPC メソッド群
}
\`\`\`

各ピースは存在意義を稼いだ:

- **\`N: Network = Ethereum\`**（ステップ 2）— 型レベル辞書、デフォルトが Ethereum ユーザーに楽
- **トランスポートトレイト抽象**（ステップ 3）— 1 プロバイダ実装で HTTP / WS / IPC 全て
- **\`RootProvider\` + \`root()\`**（ステップ 4）— ラッパーが 30 メソッド再実装せずトランスポート委譲できる
- **\`FillProvider\` / \`Filler\`**（ステップ 5）— 署名、nonce、ガスの合成可能な層
- **\`auto_impl\`**（ステップ 6）— \`Arc<P>\` が \`Provider\` として動く; タスク間で安価に共有

次のレッスンでは alloy の本物の \`crates/provider/src/provider/trait.rs\` を 1 行ずつ読み、各行を組み立てステップに対応させます。

## 次に進む前のリコール

スクロールせずに:

1. なぜ \`N: Network = Ethereum\`（デフォルトあり）が \`N: Network\`（デフォルトなし）より良いのか?
2. \`root()\` は何の問題を解決するか — 「各 Provider 実装が自分のトランスポートを所有する」では解決できないことは?
3. \`SignerProvider\` の \`Provider\` 実装をスケッチ — どのメソッド本体を書き、どれをデフォルトに任せるか?
4. \`auto_impl(Arc, ...)\` がなぜ alloy の本番利用で重要か?

どれか曖昧ならスクロールバック。次のレッスンは alloy の本物の \`Provider\` ソースのガイド付きウォークスルー。
`,
                },
                {
                  title: '本物の \`Provider\` トレイトを読む',
                  slug: 'alloy-provider-walkthrough-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 10,
                  xpReward: 25,
                  content: `# 本物の \`Provider\` トレイトを読む

組み立てレッスンは素朴な開始点から \`Provider\` の各部分を構築しました。このレッスンは逆 — [\`crates/provider/src/provider/trait.rs\`](https://github.com/alloy-rs/alloy/blob/main/crates/provider/src/provider/trait.rs) を開いて本番版を 1 行ずつ読み、各ピースを動機に対応させる。

最も重要: 組み立てが意図的に省いた部分をカバーする — **返り値型機構**（\`ProviderCall\`、\`RpcWithBlock\`、\`EthCall\`、\`PendingTransactionBuilder\`）。これらラッパー型は新参者が alloy で最も奇妙に感じる部分 — でも存在理由が見えると、トレイト表面が恣意的に見えなくなる。

> 📂 **\`alloy-rs/alloy/crates/provider/src/provider/trait.rs\` を今開く。** 正確な行番号やメソッド本体は動きます; 構造的ポイントは永続的です。レッスンが「現行 alloy main」と言っても、引用前に **自分で確認** してください。

## トレイトヘッダー

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

注目する 3 つ:

### \`Send + Sync\` スーパートレイト

すべての \`Provider\` 実装はスレッド間移動安全（\`Send\`）かつ複数スレッドからの参照安全（\`Sync\`）でなければならない。これは飾りではない — 本番ユーザーはプロバイダを \`Arc<P>\` でラップし、Arc を多数のタスクハンドラ（ワーカー、MEV サーチャー、インデクサストリーム）にクローンする。\`Send + Sync\` なしではそれらの利用がコンパイルしない。

### \`#[auto_impl(&, &mut, Box, Rc, Arc)]\`

5 つのラッパー。Revm Advanced の \`DatabaseRef\` と同じ形、同じ理由で: \`Provider\` は状態読み取りに \`&self\` だけを必要とする — メソッドシグネチャに \`&mut self\` 変異がない — ので、5 つのラッパー型すべてがトレイト経由で動く。\`Arc<P>\` と \`Rc<P>\` は安価な共有ハンドルを与える。

> 🛑 **予測。** \`Database\`（revm）は \`auto_impl(&mut, Box)\` — 2 つだけ。\`Provider\`（ここ）は 5 つ。**\`Database\` と \`Provider\` の構造的違いで非対称を駆動するのは何か?**

\`Database\` のメソッドは \`&mut self\` を取る（実装がキャッシュをその場で変更できるよう）。それは \`&\`/\`Rc\`/\`Arc\` を除外する — これらは \`&mut T\` を出さないから。\`Provider\` のメソッドは \`&self\` を取る — キャッシュが必要なら、実装の中で内部可変性（\`Mutex\`、\`OnceLock\`、アトミックプリミティブ）を使う。広い \`auto_impl\` リストは \`&self\` 選択の直接の帰結。同じトレードオフ形、ユースケースごとに違う決定。

### \`root()\` は唯一の必須メソッド

それ以外はすべてデフォルト実装。**実装は root を指すだけでよい。** ラップするプロバイダ（signer、ガスフィラー、nonce フィラー）は \`root()\` を内部に転送して実装する: \`self.inner.root()\`。そしてトレイトのデフォルトメソッドは \`self.root()\` 経由でトランスポートにアクセスする。**ラッパーの作者は 1 行書く。**

> 🔍 **リポジトリで確認。** alloy 全体で \`fn root(&self) -> &RootProvider\` を検索。実装数を数える — すべてのラッパープロバイダ、すべてのアダプタ、すべてのテストフィクスチャに 1 つある。これが設計全体の load-bearing メソッド。

## トランスポートアクセサ: \`client()\` vs \`weak_client()\`

2 種:

\`\`\`rust
fn client(&self) -> ClientRef<'_>     // 強参照、ライフタイム束縛
fn weak_client(&self) -> WeakClient   // 所有 weak 参照、ライフタイムなし
\`\`\`

なぜ 2 種?

- **\`client()\`** — 同期呼び出し用: クライアントを短く借りて、リクエストを送り、応答を得る。ライフタイム束縛 — 借用より長く生きられない。
- **\`weak_client()\`** — 借用より長く生きるタスク用: サブスクリプション、長寿命バックグラウンドタスク、\`tokio::spawn\` でスポーンするものでプロバイダを生かし続けない形でクライアントへのハンドルが必要なもの。\`Weak\` 参照は drop を妨げない; プロバイダが drop されると、タスクが気づいてシャットダウンする。

非対称は alloy がサポートする 2 つの運用モードに対応する: 短寿命の RPC 呼び出しと長寿命のサブスクリプションストリーム。

## RPC メソッドサーフェス — 3 つの代表的な形

30+ メソッドを全部読もうとしないこと。*返り値型パターン* を示す 3 つを読む:

### \`get_block_number\` — パラメータなし、シンプルな結果

\`\`\`rust
fn get_block_number(&self) -> ProviderCall<NoParams, U64, BlockNumber> {
    self.client().request_noparams("eth_blockNumber").into()
}
\`\`\`

\`ProviderCall<P, R, F>\` は **future ビルダー** — まだ \`await\` していない進行中の RPC 呼び出しを表す。3 つの型パラメータ: \`P\` = パラメータ型、\`R\` = 生応答型、\`F\` = 最終ユーザー向け型（例: \`BlockNumber\` は人間工学のため \`U64\` を re-type）。

なぜ \`impl Future<Output = u64>\` ではないか? なぜなら **\`ProviderCall\` は await 前に呼び出しをカスタマイズさせる**から。\`get_block_number\` にはあまりカスタマイズするものがないが、トレイトはすべての RPC メソッドに同じ形を使うので、カスタマイズ機構は常に利用可能。

### \`get_balance\` — ビルダー経由のブロックセレクタ

\`\`\`rust
fn get_balance(&self, address: Address) -> RpcWithBlock<Address, U256> {
    RpcWithBlock::new_provider(move |block| {
        self.client().request("eth_getBalance", (address, block)).into()
    })
}
\`\`\`

\`RpcWithBlock\` は **どのブロック** で問い合わせるかを呼び出し側で選ばせるビルダー:

\`\`\`rust
provider.get_balance(addr).await                            // latest（デフォルト）
provider.get_balance(addr).block_id(1_000_000.into()).await // 過去
provider.get_balance(addr).hash(some_hash).await            // ブロックハッシュ
provider.get_balance(addr).pending().await                  // pending ブロック
\`\`\`

\`get_balance\` の中に「latest」をハードコードすると、過去や pending クエリが欲しいユーザーは別のメソッドを構築せざるを得ない。ビルダーパターンは **1 メソッド、多くの問い合わせ方** を保つ。

> 🛑 **理解度チェック。** なぜブロックセレクタは呼び出し側（\`.block_id(...)\` 経由）で選ばれ、\`get_balance(addr, block_id)\` のように関数引数として渡されないのか?

なぜならほとんどの呼び出しは \`latest\` を欲しがり、各メソッドのシグネチャに \`block_id\` パラメータを膨らませると各呼び出し側で煩雑になるから。ビルダーパターンは一般ケース（\`get_balance(addr).await\`）を簡潔に、レアケース（\`...block_id(N).await\`）を明示的に保つ。デフォルト型パラメータと同じトレードオフ — API を 95% ケースに寄せる。

### \`call\` — カスタマイズ重視のもの

\`\`\`rust
fn call(&self, tx: N::TransactionRequest) -> EthCall<N> {
    EthCall::new(self.client(), tx)
}
\`\`\`

\`EthCall\` は最も精巧なビルダー。チェーンできるものを見る:

- \`.block(BlockId)\` — 特定ブロックに対する eth_call
- \`.overrides(state_overrides)\` — 状態オーバーライド付き eth_call（アカウントなりすまし、残高上書き、コード上書き）
- \`.gas(...)\`、\`.value(...)\`、\`.from(...)\` — 呼び出し前に tx を修正

\`eth_call\` JSON-RPC メソッドには 4-5 のオプションパラメータがある。それらすべてを 1 つのメソッドシグネチャにエンコードすると読めない混乱。ビルダーパターンは連鎖可能なメソッドに因子分解。**各メソッドは \`EthCall\` 上の独自の \`fn\`、\`Provider\` から独立。**

> 🔍 **リポジトリで確認。** \`crates/provider/src/provider/eth_call.rs\`（あなたのバージョンで \`EthCall\` がある場所）を開く。連鎖可能メソッドを数える。その数は \`eth_call\` の API サーフェス — JSON-RPC メソッドのオプションフィールドと 1:1 で対応する。

## パターン: ビルダー返り値型

3 つの返り値形（\`ProviderCall\`、\`RpcWithBlock\`、\`EthCall\`）は API 肥大化に見えるかもしれない。違う。**各々は基盤 RPC メソッドのオプション性構造に合わせた汎用ビルダーパターン。**

| RPC メソッド | オプションパラメータ | 返り値型 |
| :--- | :--- | :--- |
| \`eth_blockNumber\` | なし | \`ProviderCall\`（await するだけ）|
| \`eth_getBalance\` | block | \`RpcWithBlock\`（1 つのオプション次元）|
| \`eth_call\` | block, from, gas, value, state | \`EthCall\`（多数のオプション次元）|

各返り値型はそのメソッドの JSON-RPC 仕様に合うカスタマイズだけを公開する。**型駆動の発見可能性** — IDE が返り値型のビルダーメソッドを通じて合法なオプションを見せる。

## デフォルト実装の動き

トレイト本体はほとんどデフォルト実装。ほぼ全メソッドがこの形に従う:

\`\`\`rust
fn get_X(&self, args...) -> SomeReturnType {
    self.client().request("rpc_methodName", args).into()
}
\`\`\`

クライアント経由でリクエストを構築（\`self.client()\` は最終的に \`RootProvider\` のトランスポートに到達）。\`.into()\` で適切なビルダー/future 型に変換。

これが **ラッパープロバイダが実際に変更するもの以外をオーバーライドしなくていい** 理由。\`SignerProvider\` は \`send_transaction\` をオーバーライドする; それ以外はデフォルトに落ちて、\`self.root()\`（そしてそこからトランスポート）を自動で使う。

## \`PendingTransactionBuilder\` — トランザクション送信

別途見るべき 1 メソッド:

\`\`\`rust
fn send_transaction(&self, tx: N::TransactionRequest) -> SendTransaction<N>
\`\`\`

\`SendTransaction\` は上のビルダーと似ているが、複数ステップのやり取りを扱う:

1. トランザクションを送信（\`PendingTransactionBuilder\` を返す）
2. オプションで設定: 何回の確認を待つか、タイムアウト等
3. await — トランザクションがマインされたらレシートを得る

ビルダーはユーザーに「待機」のレベルを選ばせる:

\`\`\`rust
provider.send_transaction(tx).await?                       // tx ハッシュのみ、待たない
provider.send_transaction(tx).with_required_confirmations(3).get_receipt().await? // 3 ブロック待つ
\`\`\`

同じビルダーパターン、でも **「tx 送信 → マインされた → 確定」のステートマシン** を跨ぐ形に拡張。

## クイズ前のリコール

スクロールせずに:

1. \`Provider\` は \`auto_impl(&, &mut, Box, Rc, Arc)\`、\`Database\` は \`auto_impl(&mut, Box)\`。**どんな load-bearing な構造的違いが非対称を駆動するか?**
2. なぜ \`get_balance\` は \`impl Future<Output = U256>\` ではなく \`RpcWithBlock\` を返すのか?
3. \`SignerProvider\`（ラッパープロバイダ）は内部プロバイダに 30+ メソッドを転送する必要がある。作者は実際にいくつのメソッド本体を書くか、なぜか?
4. \`weak_client()\` は \`client()\` と並んで存在する。weak 版をいつ使うか?

次のレッスンは進行をゲートするクイズ。**クイズはうなずきで通せない** — 答えが曖昧なら今リコールに取り組む。
`,
                },
                {
                  title: 'クイズ: \`Provider\` トレイトの形は身についた?',
                  slug: 'alloy-provider-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ: \`Provider\` トレイトの形は身についた?

組み立てとウォークスルーにわたる設計判断をカバーする 4 問。他の Advanced クイズと同じルール: **クイズはうなずきで通せない。**

2 問以上落としたら、ドリルへ進む前に *\`Provider\` トレイトをステップで組み立てる* に戻る。`,
                  quizQuestions: [
                    {
                      question: "`Provider` には `auto_impl(&, &mut, Box, Rc, Arc)`（5 つのラッパー）があり、Revm の `Database` には `auto_impl(&mut, Box)`（2 つのラッパー）がある。この非対称を駆動する 2 トレイト間の load-bearing な構造的違いは何か?",
                      options: [
                        "`Database` の方が古く; auto_impl リストは新しいラッパーが追加されるにつれ時間とともに育った。",
                        "`Provider` は `Send + Sync` を要求する; `Database` は要求しない、だからより多くのラッパー型が有効。",
                        "`Provider` のメソッドは `&self` を取る（キャッシュは実装内の内部可変性に委譲）。`Database` のメソッドは `&mut self` を取り、実装がキャッシュをその場で変更できる — でも `&mut self` は `&`/`Rc`/`Arc` を除外する、それらは `&T` しか出さないから。",
                        "auto_impl クレートは失敗する可能性のある操作を持つトレイトの `Rc`/`Arc` をサポートしない。",
                      ],
                      correctIndex: 2,
                      explanation: "受信者型がラッパー互換性を駆動する。`&mut self` は `&`/`Rc`/`Arc` を除外する — それらは `&T` しか出さないから。`&self` はすべてのラッパーで動く — 全部 `&T` を出すから。両設計とも有効 — トレードオフはその場キャッシュ（Database の選択）と共有並行アクセス（Provider の選択）の間。Database は `&mut` を選ぶ — 各実装がキャッシュを `RwLock` でラップする強制を避けるため。Provider は `&self` を選ぶ — 本番ユーザーは多くのタスクで 1 プロバイダを `Arc<P>` 経由で共有したいから。",
                    },
                    {
                      question: "なぜ `Provider<N: Network = Ethereum>` は単なる `Provider<N: Network>` ではなく *デフォルト* 型パラメータでパラメータ化されているのか?",
                      options: [
                        "Rust はジェネリックトレイトに `dyn Trait` をサポートするためデフォルトを要求する。",
                        "ユーザーの大多数は Ethereum を欲しがる。デフォルトのおかげで皆が `Provider<Ethereum>` ではなく `Provider` と書ける — Optimism / カスタム L2 ユーザーだけが上書きする。",
                        "`Network` は本物のトレイトではない — ドキュメント目的のマーカーのみ。",
                        "Alloy は Ethereum 専用ライブラリとして始まり、ジェネリックパラメータは後方互換シム。",
                      ],
                      correctIndex: 1,
                      explanation: "デフォルト型パラメータは一般ケースを楽にし、レアケースを明示的に保つ。デフォルトなしだと、各 Ethereum ユーザーは至る所で `Provider<Ethereum>` を書く羽目になる。トレイトは設計上 Ethereum 専用ではない — alloy は明示的に Optimism、Anvil、カスタム L2 をサポート — でも Ethereum が 95% ケースなので API はそちらに寄る。Revm の `IT: ITy` ジェネリックと同じ形 — 変動を抽象化し、支配的なケースをデフォルトにする。",
                    },
                    {
                      question: "なぜ `get_balance` は `impl Future<Output = U256>` ではなく `RpcWithBlock<Address, U256>` を返すのか?",
                      options: [
                        "`RpcWithBlock` は `Future` より速い — `Future` ができない遅延評価を実装する。",
                        "`RpcWithBlock` はビルダーで、ユーザーが await 前に呼び出し側で問い合わせるブロックを選べる（`.block_id(N)`、`.hash(...)`、`.pending()`）。`get_balance` 内に「latest」をハードコードすると、過去クエリが欲しいユーザーは別のメソッドを構築せざるを得ない。",
                        "Rust はトレイトメソッドが `impl Future` を直接返すことを許さない。",
                        "`RpcWithBlock` は最終的な `impl Future` 周りの後方互換ラッパー; alloy の将来版は削除する。",
                      ],
                      correctIndex: 1,
                      explanation: "各 RPC メソッドには特定の *オプション性構造* がある — `eth_getBalance` は任意のブロックで問い合わせられる。ビルダー返り値型はそれらのオプションを連鎖メソッドとして公開する。一般ケース（latest 用の `.await`）は簡潔; レアケース（`.block_id(N).await`）は明示的。`EthCall` は `eth_call` の 4-5 のオプションパラメータに同じことをする。形は **型駆動の発見可能性**: IDE が返り値型のビルダーメソッドを通じて合法なオプションを見せる。",
                    },
                    {
                      question: "あなたが `SignerProvider` を書いている — 内部プロバイダに転送する前に外向きトランザクションに署名するラッパープロバイダ。トレイトには 30+ メソッドがある。実際に何個のメソッド本体を書くか?",
                      options: [
                        "30+ — トレイトが non-default なのですべてのメソッドを実装しなければならない。",
                        "1 — `send_transaction` だけ。他のメソッドは `auto_impl` から来る。",
                        "2 — `root()`（`self.inner.root()` に転送）と `send_transaction`（署名して内部に転送）。それ以外のメソッドのデフォルト実装は自動で `self.root()` を使う — 内部プロバイダのトランスポートを経由する。",
                        "5 程度 — `root()`、`send_transaction`、加えて関連メソッド `estimate_gas`、`get_transaction_count`、`chain_id` で nonce / ガス / チェーン処理用。",
                      ],
                      correctIndex: 2,
                      explanation: "合計 2 メソッド。`root()` だけが *必須* メソッド（`self.inner.root()` に転送する 1 行）。`send_transaction` がカスタマイズしたいもの。それ以外はトレイトのデフォルト実装を取り、`self.root()` でトランスポートにアクセス — それは自動で内部プロバイダのトランスポート経由でルーティングされる、なぜなら内部の `root()` がまさに転送先だから。これが組み立てのステップ 4 の `root()` 間接化が **load-bearing** な設計選択である理由。(Nonce、ガス、チェーン ID 充填は別の `Filler` で扱われる — `SignerProvider` と並んで `FillProvider` チェーンに組み込まれる。)",
                    },
                  ],
                },
                {
                  title: 'ドリル: ログ Provider ラッパーを作る',
                  slug: 'alloy-provider-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 12,
                  xpReward: 25,
                  content: `# ドリル: ログ Provider ラッパーを作る

読むのはリハーサル。**実行が記憶。** このドリルは「ラッパープロバイダについて読んだ」から「書いて、実際の RPC エンドポイントに対して実行し、各呼び出しの経路に自分のコードがあるのを見た」までを連れて行く。

任意の Provider をラップし、選択した各 RPC 呼び出しを内部プロバイダに転送する前にログするような \`LoggingProvider\` を書く。これは **本番のインデクサと MEV パイプラインが出荷するのとまさに同じコード**: alloy をフォークせずに RPC クライアントの上に観測可能性を層状に積む。

## セットアップ

3 つ必要:

1. **Foundry / Anvil** — alloy が話すローカル Ethereum 開発ノード:

   \`\`\`bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   \`\`\`

2. **新規 cargo プロジェクト** — alloy クローンとは別、でも alloy に依存:

   \`\`\`bash
   cargo new alloy-logging-drill --bin
   cd alloy-logging-drill
   \`\`\`

3. **\`Cargo.toml\` に alloy + tokio + tracing を追加**:

   \`\`\`toml
   [dependencies]
   alloy = { version = "0.x", features = ["full", "provider-http", "node-bindings"] }
   tokio = { version = "1", features = ["full"] }
   tracing = "0.1"
   tracing-subscriber = { version = "0.3", features = ["env-filter"] }
   \`\`\`

   (find-in-repo プロンプト用にクローンした現行 alloy バージョンに合わせる。\`Provider\` の構造的形はバージョンを越えて永続的; 特定のフィーチャーフラグは動く。)

## ドリル 1 — 先に \`FillProvider\` を読む

自分のラッパーを書く前に、alloy の既存のを読む。\`alloy-rs/alloy\` クローンを開いて見つける:

\`\`\`
crates/provider/src/fillers/mod.rs
\`\`\`

> 🔍 **\`impl<F, P, N> Provider<N> for FillProvider<F, P, N>\` を見つける**（あなたのバージョンで等価な形）。見るもの:
>
> 1. \`root()\` メソッド — 何を返すか? *(\`self.inner.root()\` に転送するはず)*
> 2. \`FillProvider\` が明示的にオーバーライドする RPC メソッドは? *(少数のはず — \`send_transaction\`、ガス充填用に \`call\`/\`estimate_gas\` 程度)*
> 3. オーバーライドされていないメソッド — トレイトのデフォルト実装に落ちる。**それらのデフォルトが内部プロバイダのトランスポートにアクセスできるのは何のおかげか?**

> 🛑 **質問（スクロール前に書き留める）:** \`FillProvider\` は 30+ のうち〜3-5 のメソッドをオーバーライドする。他の〜25 メソッドは \`FillProvider\` 内のコードなしで正しくルーティングされる。**なぜか?**

なぜならトレイトのデフォルト実装は \`self.client()\` を呼び、それは \`self.root().client()\` に落ちるから。\`FillProvider\` の \`root()\` は \`self.inner.root()\` を返す — だから各デフォルト実装メソッドは自動で内部プロバイダのトランスポート経由でルーティングされる。**メソッドごとのコードなし。** これが組み立てからの \`root()\` 間接化の見返り。

## ドリル 2 — \`LoggingProvider\` をスケッチする

\`src/main.rs\`（または好みで別ファイル \`src/logging_provider.rs\`）に:

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

(\`get_balance\` の正確な返り値型はあなたの alloy バージョンで多少違うエイリアスがあるかもしれない。IDE がトレイトのシグネチャに表示するものに合わせて調整; 構造は同じ。)

> 🛑 **続ける前に予測。** メソッド本体を 2 つ書いた（\`root\` + \`get_balance\`）。\`logging_provider.get_block_number().await\` の呼び出しは何かログするか? 理由は?

しない — \`get_balance\` だけインターセプトした。\`get_block_number\` はトレイトのデフォルト実装に落ちる、それは \`self.client()\` を使って \`self.root()\` 経由で基盤トランスポートに直接ルーティングする。**ログはメソッドごとに opt-in**: ラッパーは明示的にインターセプトしたものだけを見る。

本番の観測性層なら、重要なメソッド（\`send_transaction\`、\`call\`、\`get_logs\`、\`get_balance\`）をインターセプトする — 30+ 全部ではない。同じ見返り: 価値を稼ぐ本体だけ書き、残りはデフォルト。

## ドリル 3 — Anvil に対して配線する

セカンドターミナルで Anvil 開始:

\`\`\`bash
anvil
\`\`\`

(デフォルト: \`http://localhost:8545\`、chain ID 31337、10 のプリファンドアカウント付き。)

\`main.rs\` で:

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

    // ログしないはず（get_block_number はインターセプトしていない）
    let block_number = provider.get_block_number().await?;
    println!("block: {block_number}");

    Ok(())
}
\`\`\`

\`cargo run\`。こう見えるはず:

\`\`\`
INFO LoggingProvider: get_balance called address=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
balance: 10000000000000000000000
block: 0
\`\`\`

> 🛑 **出力を見る。** ログが \`get_balance\` *だけ* 発火し、\`get_block_number\` では発火しないことを確認。両方ログするならコードが間違っている（誤って何か他をオーバーライドした）。どちらもログしないならラッパーが使われていない（ラップを忘れたか \`tracing_subscriber\` が初期化されていない）。

## ドリル 4 — \`ProviderBuilder\` の Filler と積層する

本番プロバイダは通常 *既に* nonce/ガス/チェーン ID 管理用に \`FillProvider\` でラップされている。あなたの \`LoggingProvider\` はそれらと合成すべきで、置き換えるべきではない。

配線を変更して alloy の推奨 filler を含める:

\`\`\`rust
let inner = ProviderBuilder::new()
    .with_recommended_fillers()  // nonce + gas + chain-id filler を追加
    .on_http("http://localhost:8545".parse()?);

let provider = LoggingProvider::new(inner);

let bal = provider.get_balance(addr).await?;
\`\`\`

> 🔍 **質問:** 実行する。ログはまだ発火するか? なぜ層化が動くのか — \`LoggingProvider<FillProvider<NonceFiller, FillProvider<GasFiller, FillProvider<ChainIdFiller, RootProvider>>>>\` はラッパーの塔。**この合成を自動にする \`Provider\` のどんな性質か?**

なぜなら各ラッパーの \`root()\` は次の内側レベルに転送し、トレイトのデフォルト実装は \`self.root()\` 経由で root へのアクセスだけを必要とするから。塔全体はトレイトレベルで平坦化される — **N レベルのラッパー、ランタイムでは 1 つの間接化チェーン。**

これがアーキテクチャ的アンロック: ラッパーの任意の合成、どのラッパーも他を意識しない、新しいラッパー層の追加は純粋に加算的なコード。

## レッスン末リコール

スクロールせずに、自分の言葉で:

1. \`FillProvider\` は 30+ のうち〜3-5 メソッドをオーバーライド。**オーバーライドされていないメソッドが内部プロバイダのトランスポートにアクセスできるのは何のおかげか?**
2. あなたの \`LoggingProvider\` は \`get_balance\` だけログする。同じラッパーで呼び出されているのに \`get_block_number\` はなぜログしないのか?
3. \`LoggingProvider<FillProvider<...>>\` はラッパーの積層。**この合成を、各ラッパーが他を意識しないのに自動にするトレイトレベルの単一の性質は何か?**

答えが曖昧なら、レッスンはあなたを離していない。ドリルを再実行するか、組み立てのステップ 4（\`root()\`）を再読する。

このドリルの後、本番 MEV パイプラインとインデクサが使うのと同じ種類のコードを出荷した — alloy をフォークせずに観測可能性を上に積層。**次のチェーン: \`Network\` 抽象。**`,
                },
                {
                  title: '\`Network\` トレイトをステップで組み立てる',
                  slug: 'alloy-network-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# \`Network\` トレイトをステップで組み立てる

Provider チェーンで \`N: Network = Ethereum\` に触れたが、\`Network\` をブラックボックス扱いしました。**このチェーンはそれを開きます。** \`Network\` はチェーン固有のプリミティブのための alloy の *型レベル辞書* — 1 つの \`Provider\` 実装で Ethereum・Optimism・Anvil・カスタム L2 と同じ API で話せる仕組み。

このレッスンの終わりには次のすべてを組み立てたことになる:

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

10 個の関連型。各々を駆動する失敗モードを見るまで形は奇妙に見える。

> 📂 **別タブで \`alloy-rs/alloy/crates/network\` を開く。** \`crates/consensus\` も用意 — 具象型（\`TxEnvelope\`、\`Header\` 等）のほとんどはそこに住む。

## ステップ 0 — 素朴な Provider、Ethereum にハードコード

以前、Provider の \`send_transaction\` はこんな形:

\`\`\`rust
fn send_transaction(&self, tx: EthereumTransactionRequest) -> SendTransaction;
\`\`\`

\`EthereumTransactionRequest\` ハードコード。レシートハードコード。ブロックヘッダーハードコード。

> 🛑 **予測。** スクロールせずに: このハードコード設計が壊れる本番チェーンを 3 つ挙げる。ヒント — それぞれがトランザクションやレシートの *異なる形*。

3つ:

1. **Optimism。** Tx エンベロープには L1 デポジット由来 ETH 用の \`mint\` フィールドが含まれる。レシートには \`l1_gas_used\` と \`l1_block_number\`。ハードコードされた Ethereum 型はこれらを運べない。
2. **Anvil / Hardhat（カスタムハードフォーク付き）。** Anvil の \`impersonateAccount\` は標準 Ethereum 型にはないデバッグフィールド付きレシートを返す。
3. **カスタム tx エンベロープを持つカスタム L2。** Polygon zkEVM、Scroll、Linea — それぞれ L1 データ手数料、シーケンサ署名等用の独自 tx エンベロープバリアントを持つ。

修正: **チェーン固有型をトレイトの後ろに抽象化。**

## ステップ 1 — 最初のスケッチ: コンセプトごとに 1 型

素朴なトレイト:

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

これは *ほぼ* 正しい。3 つの関連型。Ethereum と Optimism がそれぞれ自分の束を選ぶ。Network 上ジェネリックなコード（\`Provider<N: Network>\` など）は関連型を経由で読み書きする。

でも「トランザクション」は 1 つの型ではない — *複数あり*、それぞれ異なる役割を持つ。

## ステップ 2 — トランザクションには複数の生がある

単一のトランザクションは複数の表現を通過する:

- **\`TransactionRequest\`** — ユーザーが *構築する* もの。ほとんどのフィールドはオプション。ビルダー API で構築: \`TransactionRequest::default().with_to(addr).with_value(...)\`。
- **\`UnsignedTx\`** — *完全に充填された* リクエスト: nonce 解決、ガス見積もり、chain_id セット。署名のためのハッシュ準備完了。
- **\`TxEnvelope\`** — 署名済みトランザクション。\`UnsignedTx\` + 署名。ワイヤ経由でブロードキャストされるもの。
- **\`TransactionResponse\`** — \`eth_getTransactionByHash\` が返すトランザクション。\`block_hash\`、\`block_number\`、\`transaction_index\` が焼き込まれている。

各役割は異なるフィールド、検証、シリアライゼーションを持つ。これらを 1 つの \`Transaction\` 型に押し込むと、各メソッドが広い和に対してランタイム検証を行わざるを得ない。分けることで型システムは「\`TransactionRequest\` をブロードキャストできない」または「\`TransactionResponse\` に署名できない」を強制できる。

> 🛑 **理解度チェック。** 「同じデータ、違う状態」は plausible に聞こえるが正しいフレーミングではない。**オプション署名、オプション block_hash 等を持つ 1 つの型の何が悪いか?**

検証がランタイムに押される。\`broadcast(&tx)\` は「署名は実際に存在するか? block_hash は不在か（既に block_hash を持つ tx をブロードキャストするのはナンセンス）?」をチェックすることになる — コンパイラが拒否すべきランタイムエラー。\`TransactionRequest\` / \`UnsignedTx\` / \`TxEnvelope\` / \`TransactionResponse\` に分けると、それらが構築不可能になる。各関数のシグネチャは正しい状態だけを受け入れる。

だからトレイトが育つ:

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

6 つの関連型。レシートとブロックも同様の分割が必要だとわかる。

## ステップ 3 — レシートとヘッダーも分割される

\`eth_getTransactionReceipt\` はコンセンサス定義フィールド *プラス* RPC 装飾フィールド（transaction_hash、block_hash、block_number、transaction_index 等）を持つレシート様オブジェクトを返す。純粋なコンセンサス形 — Merkle ルートに入るもの — は API 応答とは異なる。

同じ分割:

- **\`ReceiptEnvelope\`** — コンセンサス形。コンセンサスプロトコルが気にするもの。
- **\`ReceiptResponse\`** — RPC 返り値型、追加の「チェーン上のどこ」メタデータ付き。

ヘッダーも同じ形:

- **\`Header\`** — コンセンサスヘッダー
- **\`HeaderResponse\`** — RPC 整形ヘッダー（ハッシュ計算済み、JSON 用に gas_used を文字列で等）
- **\`BlockResponse\`** — RPC 経由で返される完全なブロックペイロード

加えてもう 1 つ — Ethereum と Optimism は扱っているのが*どの種類の*トランザクションか識別する必要がある（Legacy / EIP-1559 / EIP-4844 / OP-Deposit）:

- **\`TxType\`** — トランザクションカテゴリ用 enum タグ

これでトレイトは:

\`\`\`rust
trait Network {
    type TxType;
    type TxEnvelope;
    type UnsignedTx;
    type TransactionRequest;
    type TransactionResponse;
    type ReceiptEnvelope;
    type ReceiptResponse;
    type Header;
    type HeaderResponse;
    type BlockResponse;
}
\`\`\`

10 個の関連型。各々が特定の失敗モードに対して存在意義を稼ぐ。

## ステップ 4 — なぜ関連型、ジェネリックパラメータではない

私が初めて alloy を読んで困惑した設計選択: **なぜこれは関連型トレイトで、ジェネリックパラメータの struct ではないのか?** 例えば:

\`\`\`rust
struct Provider<TxRequest, TxEnvelope, Receipt, Block, ...> { ... }
\`\`\`

> 🛑 **予測。** スクロールせずに: マルチジェネリック struct の何が悪いか?

3 つの問題:

1. **凝集性なし。** \`Provider<EthereumTxRequest, OptimismTxEnvelope, ...>\` がコンパイルしてしまう。異なるチェーンの型を混ぜることを止めるものが何もない。関連型は 1 つの \`Network\` 実装の下にそれらをまとめる — \`Ethereum\` か \`Optimism\` を選べば、一貫した集合全体を得る。
2. **各呼び出し側での冗長さ。** \`Provider\` に言及する各シグネチャは 10 個のジェネリックパラメータを書き出さなければならない。\`Provider<N: Network>\` は 10 型を引き込む 1 パラメータ。
3. **型レベルの同一性なし。** \`Network\` は *トレイト* なので、\`fn for_network<N: Network>(...) -> N::TransactionRequest\` のような関数を書ける。Network 名は同一性を運ぶ。緩いジェネリックは運ばない。

**関連型は「これらは一緒に行く」を表現する。** ジェネリックパラメータは「任意の組み合わせが有効」を表現する。チェーンプリミティブには、前者が正しい意味論。

本物の alloy はまさにこの理由で関連型を使う。alloy の中で「チェーンの tx エンベロープ」に触れる関数を見ると — それは \`N::TxEnvelope\`（関連型アクセス）であって \`E\`（ジェネリックパラメータ）ではない。

## ステップ 5 — トレイト境界: \`Send + Sync + 'static\`

\`\`\`rust
pub trait Network: Send + Sync + 'static { ... }
\`\`\`

3 つの境界。

- **\`Send + Sync\`** — \`Provider\` がこれらを要求するのと同じ理由: 本番ユーザーは \`Arc<Provider<N>>\` でラップしてタスク間でクローンする。関連型とネットワーク型自体が send/share に安全である必要がある。これらなしでは \`Arc<Provider<MyNetwork>>\` がコンパイルしない。
- **\`'static\`** — \`Provider\` は \`PhantomData<N>\` を保持する。\`N\` が non-static ライフタイムパラメータを持つと、各 \`Provider\` インスタンスがライフタイム束縛される — 「グローバル \`Arc\` に Provider を置く」パターンを壊す鋭い制約。

> 🛑 **理解度チェック。** 「\`'static\` は永遠に生きるという意味」は受け売り。自分の言葉で: \`Network\` 実装が non-\`'static\` ライフタイムパラメータを持てたら *具体的に* 何が壊れるか? 失敗をスケッチ。

\`MyNetwork\` が借用ライフタイムを持つなら（例: \`MyNetwork<'a>\` で \`'a\` は外部設定のライフタイム）、\`Provider<MyNetwork<'a>>\` はそのライフタイムを継承する。プロバイダを \`Arc\`（\`Arc<Provider<MyNetwork<'a>>>\`）に格納することは \`Arc\` も \`'a\` で束縛されることを意味する。**Arc は設定が借用されているものより長生きできない。** \`'static\` はそのパターンを排除する: \`MyNetwork\` 実装は自分のデータをすべて所有し、借用なし。Arc は自立する。

## ステップ 6 — まとめる

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

各関連型は自身のトレイト境界を持つ（例: \`Serialize + DeserializeOwned\`、\`Clone\`、\`Encodable\`）— これらが応答を RPC シリアライズ可能に、エンベロープを RLP エンコード可能にする。このレッスンではそれらの境界をスキップ; 次のレッスンで詳しく読む。

形:

- **TxType** — enum タグ（Legacy / EIP1559 / EIP4844 / チェーン固有バリアント）
- **TxEnvelope / UnsignedTx** — 署名前/後のコンセンサス形
- **TransactionRequest / TransactionResponse** — ユーザーが構築する vs RPC が返す
- **ReceiptEnvelope / ReceiptResponse** — コンセンサス形 vs RPC 返り値
- **Header / HeaderResponse / BlockResponse** — コンセンサスヘッダー、RPC ヘッダー、RPC ブロック

alloy の具象実装: \`Ethereum\`（\`alloy-network\` 内）、\`Optimism\`（\`alloy-op-network\` 内）、\`AnyNetwork\`（「事前にチェーンが分からない」ツール用 serde 風型を持つ寛容な実装）。

## 次に進む前のリコール

スクロールせずに:

1. \`TransactionRequest\` と \`TxEnvelope\` は異なる関連型。**統一された \`Transaction\` 型では強制できない、これらを別に保つことで型システムが強制するものは?**
2. \`Network\` は *関連型* を使い、ジェネリックパラメータを使わない。**Network 上ジェネリックなコードに対するこの選択の具体的な帰結を 2 つ挙げる。**
3. **\`'static\`** はトレイトの境界の 1 つ。\`Network: Send + Sync\`（\`'static\` なし）だったらどんなパターンが壊れるか?
4. Optimism デポジットには L1 \`mint\` フィールドが含まれる。**\`Ethereum\` と \`Optimism\` の間で異なる必要がある関連型は?**

答えが曖昧ならスクロールバック。次のレッスンは alloy の本物の \`Network\` トレイト + \`Ethereum\` と \`Optimism\` の実装を詳細に読む。
`,
                },
                {
                  title: '本物の \`Network\` トレイト + Ethereum / Optimism 実装を読む',
                  slug: 'alloy-network-walkthrough-ja',
                  type: 'CONTENT',
                  sortOrder: 6,
                  duration: 10,
                  xpReward: 25,
                  content: `# 本物の \`Network\` トレイト + Ethereum / Optimism 実装を読む

組み立てが 10 個の関連型とトレイト境界を正当化しました。**このレッスンは本物のソースを読む** — 組み立てが省いた関連型ごとのトレイト境界、\`Ethereum\` 実装、\`Optimism\` 実装を並べて、関連する \`TransactionBuilder\` ヘルパートレイトも。

組み立てステップ 4 の凝集性プロパティ（「あるスロットを変えると他に波及」）がここで具体的になる: Optimism が正確にどのスロットをオーバーライドし、どのスロットを Ethereum から再利用するかが見える。

> 📂 **3 つのファイルをタブで開く:**
> - \`crates/network/src/lib.rs\` — \`Network\` トレイト
> - \`crates/network/src/ethereum/mod.rs\` — \`Ethereum\` 実装
> - \`alloy-rs/op-alloy\`（別リポジトリ）— \`Optimism\` 実装用
>
> 正確なモジュールパスはリリースごとに動く。形は永続的。

## トレイト境界すべて付きのトレイト

本物の \`Network\` トレイトは各関連型にトレイト境界を持つ — 組み立てではそれらを \`...\` と書いた。おおよその形:

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

注目する 3 つ:

### \`Network\` 自体の \`Debug + Clone + Copy + Send + Sync + Sized + 'static\`

組み立ては \`Send + Sync + 'static\` に触れた。本物のトレイトは追加:

- **\`Debug\`** — Network 実装は \`{:?}\` 印字可能でなければならない。主にトレースログ用（「Ethereum チェーンで Provider 構築...」）。
- **\`Clone + Copy\`** — \`Network\` 実装は *ゼロサイズマーカー型*。\`struct Ethereum;\` は 1 バイト（またはアラインメント次第でゼロ）。\`Copy\` のおかげでライフタイムを気にせず値で自由に渡せる。
- **\`Sized\`** — デフォルトだが明示的。\`PhantomData<N>\` が struct フィールドで動くようにする。

> 🛑 **予測。** なぜ \`Network\` は意図的にゼロサイズマーカーで、チェーン設定を保持する struct ではないのか?

なぜならチェーン設定（chain ID、ハードフォークスケジュール等）は *プロバイダ接続ごと* に変わるのであって、ネットワーク型ごとではないから。メインネット vs Sepolia を指すユーザーは *同じ* \`Ethereum\` ネットワーク型を使う — 違いはチェーン仕様、それは別の場所に住む。\`Network\` は「*どの型ファミリ* を使うか」に答える — それは静的な型レベルの問いで、ランタイム設定ではない。マーカー struct はそれを完璧にエンコードする。

### \`TxType: Into<u8> + TryFrom<u8>\`

これはコンセンサスシリアライゼーションフック。EIP-2718 トランザクションは単一バイトプレフィックスで型付けされる（0x01 = EIP-2930、0x02 = EIP-1559、0x03 = EIP-4844）。\`Into<u8>\` と \`TryFrom<u8>\` 境界が高レベル enum とワイヤバイトの間のマッピングを可能にする:

\`\`\`rust
let tx_type: TxType = bytes[0].try_into()?;
let byte: u8 = tx_type.into();
\`\`\`

\`TryFrom\`（\`From\` ではない）— なぜなら全バイトが有効な tx 型ではない。Optimism はこの集合を拡張する: \`0x7E\` は OP-Deposit トランザクション。だから Optimism の \`TxType\` は *違う* enum で違う \`TryFrom\` 実装を持つ、両方とも \`Into<u8>\` だが。**トレイト形は同じ; バリアント集合がチェーンごとに違う。**

### \`TransactionEnvelope<Self>\` — 関連型上のトレイト境界パターン

\`type TxEnvelope: TransactionEnvelope<Self>\` を見る。関連型自体が別のトレイト（\`TransactionEnvelope\`）を実装する必要があり、そのトレイトは *所属するネットワークでパラメータ化* されている。

これは alloy のイディオム「関連型を超えた一貫したヘルパートレイト」: 各 \`Network::TxEnvelope\` は \`TransactionEnvelope<Self>\` を実装し、これが Network 上ジェネリックなコードに、チェーンに関係なく \`.tx_hash()\` や \`.signer()\` のようなメソッドを呼ぶ統一的な方法を与える。

\`ReceiptEnvelope<Self>\`、\`BlockResponse<Self>\`、\`TransactionBuilder<Self>\` も同じパターン。関連型は *Self でパラメータ化されたヘルパーを実装するよう制約される*。Provider 側で \`Provider<N>\` が使うのと同じトリック。

## \`Ethereum\` 実装

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

注目する 2 つ:

1. **関連型は 2 つのクレートに住む。** コンセンサス形（\`TxEnvelope\`、\`Header\`、\`ReceiptEnvelope\`）は \`alloy-consensus\` から。RPC 形（\`Transaction\`、\`TransactionReceipt\`、\`Block\`）は \`alloy-rpc-types-eth\` から。**クレート境界は「コンセンサスが気にすること」と「RPC が返すもの」の概念的分割にマッチする。**
2. **\`UnsignedTx = TypedTransaction\`。** やや意外な名前。\`TypedTransaction\` は alloy の名前で「EIP-2718 型付きトランザクションバリアントのいずれか、完全に充填され、署名準備完了」。組み立ての post-fill-pre-sign 状態。

> 🔍 **リポジトリで確認。** \`alloy_consensus::TxEnvelope\` を開く。tx 型ごとに 1 バリアント（\`Legacy\`、\`Eip2930\`、\`Eip1559\`、\`Eip4844\`）の enum。確認: \`TxEnvelope\` は *署名済み*（エンベロープ = 署名含む）で、\`TypedTransaction\` は *未署名* か? **はい。** これが組み立てのステップ 2 が説明したライフサイクル。

## \`Optimism\` 実装 — 何が変わるか

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

(モジュールパスは大まかなもの; 現行 op-alloy を確認。)

**凝集性プロパティの動き:**

- 4 つの *トランザクション* スロット全部（TxType、TxEnvelope、UnsignedTx、TransactionRequest、TransactionResponse）が Ethereum と異なる。Optimism の deposit-tx バリアントがそれら全部に波及する。
- 3 つの *レシート* スロット全部（ReceiptEnvelope、ReceiptResponse）が異なる。L1 ガス / L1 ブロックフィールドが波及。
- *ヘッダー* 型と \`HeaderResponse\` は **Ethereum と共有**。Optimism のブロックは同じヘッダー構造を持つ（OP がコンセンサスヘッダーレベルで EVM 互換であることの副作用）。
- \`BlockResponse\` は異なる、なぜなら *ブロックのトランザクションリスト* が OP 型トランザクションを含むから。Ethereum の \`Block\` を再利用すると OP デポジットが Ethereum 型 tx としてシリアライズされる — 間違い。

> 🛑 **理解度チェック。** 素朴な設計なら各チェーンが 10 型全部をゼロから定義する — ほとんどのチェーンがほとんどの型を Ethereum と共有するときでも。**なぜ「別クレートから関連型」がここで正しいパターンなのか、「各 Network 実装が各型を再実装」ではなく?**

なぜなら凝集性プロパティは *双方向* だから。型が異なるところはオーバーライドしなければならない。異ならないところは共有しなければならない — そうしないと複数のチェーンが共有ツール（例: 任意のチェーンのヘッダーを読む汎用ブロックエクスプローラ）で相互運用できない。関連型アプローチは混合を可能にする: 変動するスロットをオーバーライド、変動しないスロットを共有。**Optimism の \`Header\` が文字通り \`alloy_consensus::Header\` であることは、Network 上ジェネリックに書かれたヘッダーパーサが Ethereum と Optimism で再コンパイルなしに動くことを意味する。**

## \`TransactionBuilder\` ヘルパートレイト

関連型 \`TransactionRequest\` はトレイト境界 \`TransactionBuilder<Self>\` を持つ。これは流れるような構築メソッドを公開する *別* のトレイト:

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

    // ...with_value、with_gas_price、with_chain_id、with_nonce 等。
}
\`\`\`

これが \`TransactionRequest::default().with_to(addr).with_value(eth(1))\` の流れるような感じを与える。

> 🔍 **リポジトリで確認。** \`crates/network/src/transaction/builder.rs\` を開く。\`with_*\` と \`set_*\` メソッドを数える。多数ある。**なぜ \`Network\` から別のトレイトで、関連型に直接メソッドを置かないのか?**

なぜなら同じビルダーメソッドが Ethereum の \`TransactionRequest\` と Optimism の \`TransactionRequest\` 両方で動く必要があるから — そして \`TransactionBuilder<N>\` がトレイトなので、リクエストを構築する N 上ジェネリックなコードを書ける:

\`\`\`rust
fn build_request<N: Network>() -> N::TransactionRequest {
    <N::TransactionRequest>::default()
        .with_to(Address::ZERO)
        .with_value(U256::from(1_000))
}
\`\`\`

同じコード、Ethereum、Optimism、AnyNetwork、カスタム L2 で動く。**型レベル辞書 + ヘルパートレイト = チェーン横断のポータブルコード。**

## \`AnyNetwork\` — 寛容な逃げ口

\`alloy-network\` には 3 番目の Network 実装 \`AnyNetwork\` がある。これは「事前にチェーンが分からない」モード — 任意のフィールドを受け入れる serde 風型を使う:

\`\`\`rust
impl Network for AnyNetwork {
    type TxType = WithOtherFields<...>;
    type TxEnvelope = AnyTxEnvelope;
    type TransactionResponse = AnyRpcTransaction;
    // ...
}
\`\`\`

ブロックエクスプローラ、マルチチェーンインデクサ、汎用 RPC プロキシのようなツールは \`AnyNetwork\` を使う、なぜならコンパイル時にチェーンを知らずに RPC 応答に現れる任意のフィールドを受け入れる必要があるから。トレードオフ: チェーン固有フィールドの静的型付けを失い、\`.other()\` アクセサ経由でそれらを抽出しなければならない。

*アプリケーション* コードを書くときは \`Ethereum\` または \`Optimism\`（あるいは本物の Network 実装）を選ぶ。*任意のチェーンを扱うツール* を書くときは \`AnyNetwork\` を選ぶ。

## クイズ前のリコール

スクロールせずに:

1. \`Network\` は \`Debug + Clone + Copy + Send + Sync + Sized + 'static\` を要求する。なぜ特に \`Copy\` か — \`Clone\` だけでは可能でないことを何が可能にするか?
2. Optimism の \`Network\` 実装は Ethereum の \`Header\` を再利用するが、独自の \`BlockResponse\` を定義する。**前者が異ならないなら、なぜ後者が異なるのか?**
3. \`TransactionBuilder<N>\` は *別の* トレイトで、\`Network::TransactionRequest\` のメソッドではない。この分離はどんな種類のコードを可能にするか?
4. 具体的な \`Ethereum\` / \`Optimism\` 実装ではなく \`AnyNetwork\` をいつ使うか?

次のレッスンはクイズ。答えが曖昧なら今リコールに取り組む。
`,
                },
                {
                  title: 'クイズ: \`Network\` トレイトの形は身についた?',
                  slug: 'alloy-network-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 7,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ: \`Network\` トレイトの形は身についた?

組み立てとウォークスルーにわたる設計判断をカバーする 4 問。他の Advanced クイズと同じルール: **クイズはうなずきで通せない。**

2 問以上落としたら、ドリルへ進む前に *\`Network\` トレイトをステップで組み立てる* に戻る。`,
                  quizQuestions: [
                    {
                      question: "`Network` は 10 のチェーン固有形（TxType、TxEnvelope、TransactionRequest 等）に *関連型* を使う、struct の 10 ジェネリックパラメータではなく。Network 上ジェネリックなコードに対するこの選択の load-bearing な利益は?",
                      options: [
                        "関連型はジェネリックパラメータより速くコンパイルする。",
                        "凝集性 + 簡潔さ: 関連型は「これらは一緒に行く」をグループ化する（だから `Provider<EthereumTxRequest, OptimismReceipt>` を誤って構築できない）、AND 呼び出し側は 10 個ではなく 1 パラメータ（`<N: Network>`）だけを書き出す。",
                        "ジェネリックパラメータはトレイトメソッドシグネチャ内に現れない、トレイト本体内のみ。",
                        "関連型は `dyn Trait` をサポート; ジェネリックパラメータはしない。",
                      ],
                      correctIndex: 1,
                      explanation: "凝集性プロパティが決め手。ジェネリックパラメータは「任意の組み合わせが有効」を表現; 関連型は「これらは一緒に行く」を表現。チェーンプリミティブ — `EthereumTxRequest` は `EthereumTxEnvelope` とペアにしなければならない — には後者の意味論が必要。ボーナス: 生のジェネリックで Provider に言及する各シグネチャは 10 パラメータを書き出さなければならない; 1 つの `N: Network` がそれら全部を引き込む。(コンパイル時間と `dyn` 互換性のディストラクタは技術的に間違い; どちらも両方のアプローチで問題なく動く。)",
                    },
                    {
                      question: "`Network` には `TransactionRequest`、`UnsignedTx`、`TxEnvelope`、`TransactionResponse` の別関連型がある — 同じデータに感じる 4 つの表現。なぜ分割?",
                      options: [
                        "後方互換 — 古い alloy バージョンは異なる型を使っていた。",
                        "各表現はオプションフィールド付きの同じデータ; 分割はドキュメント目的の装飾。",
                        "各表現はトランザクションライフサイクルで異なる役割を持つ（構築 → 充填 → 署名 → 返す）。分割により不正な状態を不可能にする: 型システムがコンパイル時に `broadcast(&request)` や `sign(&response)` を拒否する。統一型は検証をランタイムに押し上げる。",
                        "性能 — 各型は独自の最適化メモリレイアウトを持つ。",
                      ],
                      correctIndex: 2,
                      explanation: "オプション署名、オプション block_hash 等を持つ 1 つの型を持つと検証がランタイムに押される。`broadcast(&tx)` は「署名は存在するか? block_hash は不在か?」をチェックすることになる — コンパイラが拒否すべきランタイムエラー。分割によりそれらの状態を構築不可能にする。各関数シグネチャは正しいライフサイクル状態だけを受け入れる。Rust のタイプステートパターンと同じトレードオフ、Ethereum tx に適用。",
                    },
                    {
                      question: "Optimism の `Network` 実装は独自の `BlockResponse` を定義するが Ethereum の `Header` を再利用する。なぜ非対称?",
                      options: [
                        "`BlockResponse` は `Header` より新しく alloy に追加された; Optimism 型がまだリファクタされていないだけ。",
                        "`Header` はコンセンサス定義で、Optimism はヘッダーレベルで EVM 互換 — 同じ構造（number、hash、timestamp）。でも `BlockResponse` は *ブロックのトランザクションリスト* を含み、Optimism のトランザクションは OP 固有 Deposit バリアントを含む。Ethereum の `Block` を再利用すると OP デポジットが Ethereum 型 tx としてシリアライズされる — 間違い。",
                        "ヘッダーはブロックより小さい、だから再利用するとメモリコストが少ない。",
                        "`BlockResponse` は `Header` より新しいコンセプト; Optimism は最終的に Ethereum のを共有する予定。",
                      ],
                      correctIndex: 1,
                      explanation: "これは凝集性プロパティの繊細さ。型がチェーン横断で *内容的に同一* なところは、トレイトが共有を可能にする — Optimism のヘッダーは文字通り `alloy_consensus::Header`。型がチェーン固有内容を埋め込むところ（OP 型 tx を含む tx リストのように）はオーバーライドしなければならない — そうしないとツールが正しくシリアライズできない。**選択はデータによって強制される、様式的ではない。** ReceiptResponse にも同じロジックが当てはまる（L1 fee フィールドのため異なる）。",
                    },
                    {
                      question: "`TransactionBuilder<N>` は `Network::TransactionRequest` が実装することを要求される *別の* トレイトで、関連型に直接のメソッドではない。この分離は何を可能にするか?",
                      options: [
                        "各 `Network::TransactionRequest` 実装がビルダーメソッドを個別にオーバーライドできる。",
                        "Rust は関連型のメソッドを別トレイト経由で定義することを要求する。",
                        "N 上ジェネリックなコードを可能にする: `fn build_request<N: Network>() -> N::TransactionRequest { <N::TransactionRequest>::default().with_to(addr).with_value(v) }`。同じコードが Ethereum、Optimism、AnyNetwork で動く、なぜなら `TransactionBuilder<N>` がどのチェーンの `TransactionRequest` が選ばれてもメソッド名が同じトレイトだから。",
                        "後方互換シム; alloy の将来版はメソッドをインライン化する。",
                      ],
                      correctIndex: 2,
                      explanation: "パターンは **型レベル辞書（Network）+ 辞書キーでパラメータ化されたヘルパートレイト（TransactionBuilder<N>）= チェーン横断のポータブルコード。** 別トレイトなしでは、`with_to(...)` と `with_value(...)` は `EthereumTransactionRequest` と `OpTransactionRequest` の固有メソッド — `N::TransactionRequest` 経由で呼べない。別トレイト + 境界が \`<N::TransactionRequest>::default().with_to(...)\` をジェネリックに動かす。同じイディオム: `TxEnvelope` 上の `TransactionEnvelope<Self>`、`BlockResponse` 上の `BlockResponse<Self>`。",
                    },
                  ],
                },
                {
                  title: 'ドリル: Ethereum *と* Optimism で動く N 上ジェネリックなコードを書く',
                  slug: 'alloy-network-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# ドリル: Ethereum *と* Optimism で動く N 上ジェネリックなコードを書く

読むのはリハーサル。**実行が記憶。** このドリルは「型レベル辞書としての \`Network\` について読んだ」から「Ethereum と Optimism 両方に対してチェーンごとのコードなしで動く 1 関数を書いた」までを連れて行く。

本番での見返り: ブロックエクスプローラ、インデクサ、MEV ボット — 複数の EVM 互換チェーンをサポートしたい何でも、コアロジックを 1 度、\`N: Network\` 上ジェネリックに書く。それをここでやる。

## セットアップ

2 つのターミナル:

**ターミナル 1 — Anvil（ローカル Ethereum）:**

\`\`\`bash
anvil
\`\`\`

(Foundry をインストールしていないなら: \`curl -L https://foundry.paradigm.xyz | bash && foundryup\`。)

**ターミナル 2 — あなたのプロジェクト:**

\`\`\`bash
cargo new alloy-network-drill --bin
cd alloy-network-drill
\`\`\`

\`Cargo.toml\` に追加:

\`\`\`toml
[dependencies]
alloy = { version = "0.x", features = ["full", "provider-http"] }
op-alloy = { version = "0.x" }   # Optimism Network 実装用
tokio = { version = "1", features = ["full"] }
eyre = "0.6"
\`\`\`

(現行バージョンに pin する; \`op-alloy\` の正確なクレート名はリリース間で動く可能性 — crates.io で現在のパッケージングを検索。)

## ドリル 1 — op-alloy の \`Network\` 実装を読む

コードを書く前に、ウォークスルーの主張を実ソースに対して検証。

> 🔍 **op-alloy の \`impl Network for Optimism\` ブロックを見つける**。パスは様々 — \`crates/network/src/lib.rs\` 等を試す。

各関連型の RHS を読む:

| スロット | Ethereum の値 | Optimism の値 | 同じ? |
| :--- | :--- | :--- | :--- |
| \`TxType\` | \`alloy_consensus::TxType\` | \`op_alloy_consensus::OpTxType\` | ❌ |
| \`TxEnvelope\` | \`alloy_consensus::TxEnvelope\` | \`op_alloy_consensus::OpTxEnvelope\` | ❌ |
| \`UnsignedTx\` | \`alloy_consensus::TypedTransaction\` | OP 類似 | ❌ |
| \`ReceiptEnvelope\` | \`alloy_consensus::ReceiptEnvelope\` | OP 類似 | ❌ |
| \`Header\` | \`alloy_consensus::Header\` | \`alloy_consensus::Header\` | ✅ |
| \`TransactionRequest\` | \`alloy_rpc_types_eth::TransactionRequest\` | OP 類似 | ❌ |
| \`TransactionResponse\` | \`alloy_rpc_types_eth::Transaction\` | OP 類似 | ❌ |
| \`ReceiptResponse\` | \`alloy_rpc_types_eth::TransactionReceipt\` | OP 類似 | ❌ |
| \`HeaderResponse\` | \`alloy_rpc_types_eth::Header\` | \`alloy_rpc_types_eth::Header\`（おそらく）| ✅ |
| \`BlockResponse\` | \`alloy_rpc_types_eth::Block\` | OP 類似 | ❌ |

> 🛑 **質問（スクロール前に答えを書き留める）:** 実コードでテーブルを検証。**Ethereum と異なるスロット数は?** 10 のうち〜7-8 のはず。正確な数は Optimism のチェーン固有形が住む場所を教えてくれる — そしてそれはまさに凝集性プロパティがオーバーライドを強制する場所。

異ならない 2 スロット（\`Header\` と \`HeaderResponse\`）はデータが両チェーン横断で内容的に同一なもの。tx、レシート、ブロックペイロードが関わるところはどこでも、tx リスト凝集性がオーバーライドを強制する。

## ドリル 2 — N 上ジェネリックなブロックサマリを書く

\`src/main.rs\` で、*任意の* チェーンのブロックを取りサマリ文字列を生成する関数を書く。関数は \`N: Network\` 上ジェネリック:

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

    // BlockResponse トレイトが .header() と .transactions() を与える
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

(メソッド名は現行 alloy への近似。IDE が正確な \`HeaderResponse\` と \`BlockResponse\` トレイトメソッドを表示する。要点: **\`block.header()\` と \`header.number()\` は \`N\` に関係なくジェネリックに動く。**)

> 🛑 **予測。** main を書く前に問う: この関数は \`&P: Provider<N>\` を取り、\`N: Network\` がジェネリック。**Ethereum vs Optimism で呼び出し側はどう見える — 同じコードか、異なるコードか?**

同じコード、異なる型パラメータ。呼び出し側は \`N\` を \`Ethereum\` または \`op_alloy::network::Optimism\` のいずれかに具体化する。関数本体は不変。

## ドリル 3 — Ethereum（Anvil）に対して実行

main を追加:

\`\`\`rust
use alloy::network::Ethereum;
use alloy::providers::ProviderBuilder;

#[tokio::main]
async fn main() -> eyre::Result<()> {
    // Ethereum (Anvil)
    let eth_provider = ProviderBuilder::new()
        .on_http("http://localhost:8545".parse()?);
    let s = block_summary::<Ethereum, _>(&eth_provider, BlockId::latest()).await?;
    println!("ETH: {s}");

    Ok(())
}
\`\`\`

実行: \`cargo run\`。こんな感じが見えるはず:

\`\`\`
ETH: block 0 on chain — hash=0x...
\`\`\`

(Anvil はブロック 0 から開始。もっと高い数を欲しいなら \`anvil_mine\` でマイン; ドリルには不要。)

## ドリル 4 — 同じ関数で op-mainnet（Optimism）に対して

\`main\` に Optimism 呼び出しを追加:

\`\`\`rust
use op_alloy::network::Optimism;

// ... Ethereum 呼び出しの後 ...

let op_provider = ProviderBuilder::<_, _, Optimism>::default()
    .on_http("https://mainnet.optimism.io".parse()?);
let s = block_summary::<Optimism, _>(&op_provider, BlockId::latest()).await?;
println!(" OP: {s}");
\`\`\`

(非 Ethereum ネットワーク用の正確な \`ProviderBuilder\` 構文は異なる可能性; op-alloy の例を確認。構造的ポイントは: 同じ関数、異なる \`N\`。)

再実行。2 つのブロックサマリが見えるはず — 1 つは Anvil（ブロック 0 等）、1 つは op-mainnet（実ブロック番号、例: 執筆時点で 1.3 億近辺）。

> 🔧 **同じ関数本体が両出力を生成した。** これが型レベル辞書の見返り: \`block_summary\` は 1 度書かれ、2 つの異なる \`N\` パラメータで具体化され、コンパイラはチェーンごとに適切な型に対して動く 2 つの特殊化されたコピーを emit する。

## ドリル 5 — 理解度チェック: 混ぜたら何が起きる?

これを試す（コンパイル *しないはず*）:

\`\`\`rust
let eth_block = eth_provider.get_block(BlockId::latest()).await?;
let s = block_summary::<Optimism, _>(&eth_provider, BlockId::latest()).await?;
\`\`\`

> 🛑 **実行前にエラーを予測。** \`block_summary\` は \`N: Network\` でパラメータ化され、プロバイダは \`Provider<N>\` でなければならない。\`eth_provider\` は \`Provider<Ethereum>\`。**コンパイラは何を拒否するか?**

コンパイラは 2 つ目の呼び出しを拒否する、なぜなら \`eth_provider\` の関連型が \`Optimism\` のと一致しないから。エラーは「expected \`Optimism::TransactionRequest\`, found \`Ethereum::TransactionRequest\`」のようなものに言及するはず。

これがコンパイル時にあなたを保護する凝集性プロパティ。**Ethereum 型応答を Optimism 型コードに誤って供給できない。** これが組み立てステップ 4 で関連型が 10 個の生のジェネリックパラメータより良かった理由。

## レッスン末リコール

スクロールせずに、自分の言葉で:

1. \`block_summary\` は 1 関数本体。**Ethereum と Optimism の両方で具体化されたとき、コンパイラは何個の特殊化コピーを emit するか?** なぜそれが性能に重要か?
2. \`Header\` は Ethereum と Optimism で再利用されるが、\`BlockResponse\` は異なる。**ドリル 1 のテーブルは *どんな種類のデータ* がオーバーライドを強制し、共有を許すかについて何を明らかにするか?**
3. コンパイラは \`block_summary::<Optimism>(&eth_provider, ...)\` を拒否する。トレースする: どのトレイト境界が違反され、どの関連型の不一致がエラーを生むか?
4. Polygon zkEVM を 3 つ目のチェーンとして追加したい場合、何を書くか?（ヒント: 新しい \`struct PolygonZkEvm; impl Network for PolygonZkEvm { ... }\` を書く。）

このドリルの後、本番インデクサとエクスプローラが出荷するのと同じ形のマルチチェーンツールを出荷した: 1 つのコア関数、\`N: Network\` 上ジェネリック、コンパイル時にチェーンごとに特殊化。**次のチェーン: \`Signer\` モデル — alloy が署名、ガス、nonce 充填を層状の Provider に合成する仕組み。**`,
                },
                {
                  title: '\`Signer\` トレイトをステップごとに組み立てる',
                  slug: 'alloy-signer-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# \`Signer\` トレイトをステップごとに組み立てる

\`Provider\`（RPC 抽象）と \`Network\`（チェーンプリミティブ）を組み立てた。3 つ目の基礎的な alloy 概念は **トランザクションがどう署名されるか**。本番ユーザは生秘密鍵、AWS KMS、ハードウェアウォレット、ニーモニック由来鍵、リモート署名サービスで署名する — そして *同じ* アプリケーションコードがそれら全てに対して動かなければならない。

このチェーンはそれを可能にする抽象についてだ: \`Signer\` トレイト、\`TxSigner<N>\` のチェーン固有版、async/sync 分割、Provider ドリルで使った \`ProviderBuilder\` に署名を結びつける \`WalletFiller\`。

このレッスン終了時には次の全ピースを組み立てたことになる:

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

3 つのトレイト。それぞれが、ショートカットしようとすると遭遇する特定の失敗モードに対して存在意義を稼ぐ。

> 📂 **別タブで \`alloy-rs/alloy/crates/signer\` を開く。**

## ステップ 0 — ナイーブな sign 関数

何も考えなければ、署名を 1 つの自由関数として書くだろう:

\`\`\`rust
fn sign_tx(privkey: B256, mut tx: TypedTransaction) -> Result<TxEnvelope> {
    let hash = tx.signature_hash();
    let sig = secp256k1_sign(privkey, hash)?;
    Ok(tx.with_signature(sig))
}
\`\`\`

関数。ハードコードされた \`B256\` 秘密鍵。ハードコードされた \`TypedTransaction\`（Ethereum 型）。ハードコードされた \`secp256k1_sign\`（プロセス内、sync、I/O なし）。

> 🛑 **予測。** スクロールせずに: このナイーブ設計が失敗する本番シナリオを 3 つ挙げる。（ヒント: 各々が *異なるカテゴリ* の署名 — どれもプロセス内に生秘密鍵を持っていない。）

3 つ:

1. **AWS KMS / Cloud HSM。** 秘密鍵は AWS から決して出ない。署名はリモートサービスへの *async ネットワーク呼び出し*。関数は署名を返す; 呼び出し側は鍵を保持しない。
2. **ハードウェアウォレット（Ledger、Trezor）。** 鍵はデバイス上。署名は人間のボタン押下を待つ *async USB / IPC* 呼び出し。
3. **マルチチェーン。** Optimism の \`UnsignedTx\` は Ethereum の \`TypedTransaction\` ではなく \`OpTypedTransaction\`（deposit バリアント付き）。1 つの型をハードコードすると、関数は他チェーンで動かない。

加えて 4 つ目（横断的）: **署名は常に tx 署名とは限らない**。\`personal_sign\`（EIP-191 プレフィックス付き \`eth_sign\`）、\`signTypedData_v4\`（EIP-712）、オフチェーンコミットメント用の生ハッシュ署名 — どれも *何らかの* 署名能力を必要とするが、異なる入力で動く。

修正: **3 つの軸に沿って抽象化する。** 署名者の場所（プロセス内 / クラウド / ハードウェア）、何に署名するか（ハッシュ / メッセージ / tx）、async vs sync。各軸が独自のトレイトかトレイトメソッドを得る。

## ステップ 1 — 最初のスケッチ: 単一の \`Signer\` トレイト

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

1 つのメソッド: 32 バイトハッシュを取り、署名を返す。Async（クラウドとハードウェア impl が I/O できるよう）。各 \`Signer\` impl が鍵をどこに格納するかを選ぶ。

これは *生ハッシュ* 署名には機能する。しかしユーザはほとんど \`sign_hash\` を直接呼ばない — もっと高水準のものを呼ぶ:

- \`sign_message(b"hello")\` — EIP-191 プレフィックス適用、ハッシュ化、署名
- \`sign_transaction(tx)\` — tx エンコード、ハッシュ化、署名

これらのメソッドはハッシュ化 *前* に追加作業をする。だから追加する。

## ステップ 2 — デフォルト impl 付き \`sign_message\` を追加

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

\`sign_message\` は EIP-191 プレフィクシングを行い \`sign_hash\` を呼ぶ *デフォルト impl* を持つ。**全ての \`Signer\` が \`sign_message\` を無料で得る** が、リモート署名者は自身のプレフィックスロジックを持つならそれをオーバーライドできる。

> 🛑 **理解度チェック。** なぜデフォルト impl で、自由関数 \`fn sign_message<S: Signer>(s: &S, msg: &[u8])\` ではないのか?

なぜなら **デフォルト impl は署名者が振る舞いをオーバーライドできるようにする**。AWS KMS は自身のプレフィクシングを行うサービスにメッセージバイトを転送したいかもしれない — \`AwsSigner\` で \`sign_message\` をオーバーライドすれば、呼び出し側を変更せずにそれができる。自由関数はオーバーライドできない。「共通の振る舞い + オプションの impl 単位カスタマイズ」が欲しいときデフォルト impl が正しいツール。

これは \`Provider\` と同じ形（Provider チェーンのステップ 4): デフォルト impl が共通ケースを、オーバーライドがチェーン固有ケースを、全て 1 つのトレイトの背後で扱う。

## ステップ 3 — Tx 署名はハッシュ署名以上

\`sign_transaction\` を考える:

\`\`\`rust
async fn sign_transaction(&self, tx: TypedTransaction) -> Result<TxEnvelope> { ... }
\`\`\`

必要なこと:

1. tx の型に従ってエンコード（Legacy / EIP-1559 / その他）
2. そのエンコードをハッシュ化（*署名ハッシュ*、*トランザクションハッシュ* とは別物）
3. ハッシュに署名
4. 署名を取り付けて \`TxEnvelope\` を生成

ここで問題: **\`TypedTransaction\` は Ethereum 固有型**。Optimism の deposit tx は \`TypedTransaction\` ではない — \`OpTypedTransaction\` だ。\`Signer\` に \`sign_transaction(&TypedTransaction)\` を置くと、OP 署名者は Ethereum のみに退化せずには実装できない。

2 つの選択肢:

- **選択肢 A:** \`Signer\` をネットワーク上ジェネリックにする: \`sign_transaction(&N::UnsignedTx)\` を持つ \`Signer<N: Network>\`。
- **選択肢 B:** tx 署名を *別トレイト* に分割し、チェーン認識部分を扱う; \`Signer\` はチェーン非依存のままにする。

> 🛑 **予測。** alloy はどちらを選ぶか、なぜか?（ヒント — tx 署名と生ハッシュ署名のどちらをどれだけの頻度で行うか考える。)

Alloy は **選択肢 B** を選ぶ: \`Signer\` はシンプルに保たれる（チェーン非依存、ハッシュのみ); \`TxSigner<N>\` は tx 署名のための別トレイト。理由:

1. **ほとんどの署名操作は tx 署名ではない。** EIP-191 メッセージと EIP-712 typed data のほうが dapps では遥かに一般的。稀な tx ケースのために全 \`Signer\` を \`N\` でパラメータ化するのは、全署名者シグネチャを膨張させる。
2. **\`Signer\` impl はチェーン横断で再利用可能。** \`LocalSigner\` は Ethereum か Optimism かを気にしない — ハッシュに署名するだけだ。\`N\` でタグづけすると、チェーンごとに 1 つの署名者構造体を強制する。
3. **Tx 署名は自然に多態的。** 署名者は \`TxSigner<Ethereum>\` と \`TxSigner<Optimism>\` を別々に、異なるコードパスで実装できる。1 つのトレイトに束ねるとそれが難しくなる。

ゆえに:

\`\`\`rust
#[async_trait]
pub trait TxSigner<Sig> {
    fn address(&self) -> Address;
    async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Sig>) -> Result<Sig>;
}
\`\`\`

(\`SignableTransaction\` は各チェーンの \`UnsignedTx\` 型が実装するトレイト。\`Signer\` はどのチェーンかを知る必要はない — 与えられた \`SignableTransaction\` をどう署名するかを知るだけでよい。)

## ステップ 4 — Async vs sync: \`SignerSync\` 分割

Async は AWS / Ledger には問題ない。しかしプロセス内鍵署名 — 最も一般的なケース — では async はオーバーヘッド。\`sign_hash\` 呼び出しは I/O がなくても future を経由する。

これを扱う 2 通り:

- オーバーヘッドを受け入れる: プロセス内でも \`async fn\` をどこでも使う。
- 並列の **sync** トレイトを提供し、プロセス内署名者には両方を実装させる。

Alloy は後者を選ぶ:

\`\`\`rust
pub trait SignerSync<Sig = Signature> {
    fn sign_hash_sync(&self, hash: &B256) -> Result<Sig>;
    fn sign_message_sync(&self, message: &[u8]) -> Result<Sig> { /* デフォルト */ }
    fn chain_id_sync(&self) -> Option<ChainId>;
}
\`\`\`

\`LocalSigner\` は \`Signer\`（async）と \`SignerSync\`（sync）の両方を実装する。\`AwsSigner\` と \`LedgerSigner\` は \`Signer\` のみを実装する — ネットワーク束縛なので sync で署名できない。

S 上ジェネリックなコードはどちらの境界も要求できる: async 許容性が必須なコードは \`fn foo<S: Signer>\`、安価なパスが必要なコードは \`fn bar<S: SignerSync>\`。

> 🛑 **理解度チェック。** なぜ \`SignerSync\` は単に non-async \`sign_hash\` を持つ \`Signer\` ではないのか? なぜ別トレイトなのか?

なぜなら **\`async fn\` を持つトレイトと \`async fn\` を持たないトレイトは Rust では異なる種類のもの**。プロセス内署名者は両方を実装できる — sync メソッドが実作業を行い、async メソッドは互換性のために \`async\` でラップするだけ。ネットワーク束縛署名者は async トレイトのみ実装可能。S 上ジェネリックなコードはどちらの契約を要求するか選ぶ。融合させると全署名者を async にコミットさせ、安価-sync 最適化を失う。

## ステップ 5 — \`Provider\` への結びつけ: \`WalletFiller\`

Provider チェーンを思い出す: \`FillProvider<F: Filler<N>, P, N>\` は内部プロバイダの前にチェーン認識ロジックをスタックできる。署名はそんな Filler の 1 つ:

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

(おおよその形 — 正確な alloy には unsigned tx がどう構築・署名されるかについてさらにニュアンスがある。)

これがブリッジ: \`Signer\`（または \`TxSigner<N>\`）トレイトが署名 *の方法* を抽象化する; \`WalletFiller\` がリクエストフローの正しいタイミングで署名を *呼び出す* Filler 側の機構。

ユーザコード:

\`\`\`rust
let signer = PrivateKeySigner::random();
let provider = ProviderBuilder::new()
    .wallet(signer)               // WalletFiller(signer) をインストール
    .with_recommended_fillers()
    .on_http(url);

provider.send_transaction(tx).await?;  // tx は WalletFiller により署名される
\`\`\`

\`.wallet(...)\` ビルダメソッドは Filler インストーラで、署名者を \`WalletFiller\` でラップし FillProvider チェーンにスタックする。ユーザは \`Signer\` を直接考えない — 「ウォレットをビルダに渡す」と考える。

## 何を組み立てたか

\`\`\`rust
// 最低レベル: チェーン非依存のハッシュ/メッセージ署名
#[async_trait]
pub trait Signer<Sig = Signature> {
    async fn sign_hash(&self, hash: &B256) -> Result<Sig>;
    async fn sign_message(&self, message: &[u8]) -> Result<Sig> { /* デフォルト */ }
    fn address(&self) -> Address;
    fn chain_id(&self) -> Option<ChainId>;
    fn set_chain_id(&mut self, chain_id: Option<ChainId>);
}

// プロセス内鍵のための Sync ミラー
pub trait SignerSync<Sig = Signature> { /* 並列 sync API */ }

// Tx 署名: 別トレイト、任意の SignableTransaction に対して動く
#[async_trait]
pub trait TxSigner<Sig> {
    fn address(&self) -> Address;
    async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Sig>) -> Result<Sig>;
}
\`\`\`

各ピースが存在意義を稼いだ:

- **\`Signer\` async**（ステップ 1) — クラウドとハードウェア署名者を扱う。
- **\`sign_message\` デフォルト impl**（ステップ 2) — オーバーライドフック付き共通 EIP-191 パス。
- **\`TxSigner\` 別トレイト**（ステップ 3) — \`Signer\` をチェーン非依存に保つ; 署名者が複数チェーンを実装可能にする。
- **\`SignerSync\` 並列トレイト**（ステップ 4) — プロセス内鍵が async オーバーヘッドを回避; ネット束縛署名者は async のみ。
- **\`WalletFiller\`**（ステップ 5) — Provider チェーンの Filler 機構経由で \`Signer\`/\`TxSigner\` を \`Provider\` リクエストフローに橋渡し。

次のレッスンは alloy の実 \`Signer\` トレイト、\`PrivateKeySigner\` impl、\`AwsSigner\` impl、\`WalletFiller\` ソースを行ごとに読む。

## 進む前にリコール

スクロールせずに:

1. **なぜ \`Signer\` は async で sync ではないのか?** async が *必要* な本番署名者 2 つを挙げる。
2. **なぜ \`TxSigner<Sig>\` は \`Signer\` から別トレイトなのか?** tx 署名が単に \`Signer\` のメソッドだったら何が壊れるか?
3. **なぜ \`SignerSync\` が存在するのか?** プロセス内署名者が \`Signer\` と並んでそれを実装することで何を得るか?
4. ユーザコード \`ProviderBuilder.wallet(signer)\` は \`WalletFiller\` や \`Filler\` を直接言及しない。それらは内部でどう繋がるか?

どれかの答えが揺らぐならスクロールバック。次のレッスンは alloy の実 \`Signer\` ソースと具体 impl を読む。
`,
                },
                {
                  title: '実 \`Signer\` トレイト + \`PrivateKeySigner\` / \`AwsSigner\` / \`WalletFiller\` を読む',
                  slug: 'alloy-signer-walkthrough-ja',
                  type: 'CONTENT',
                  sortOrder: 10,
                  duration: 10,
                  xpReward: 25,
                  content: `# 実 \`Signer\` トレイト + \`PrivateKeySigner\` / \`AwsSigner\` / \`WalletFiller\` を読む

組み立てが 3 トレイト分割（\`Signer\` / \`TxSigner\` / \`SignerSync\`）と \`WalletFiller\` ブリッジを正当化した。**このレッスンは実ソースを読む** — 全境界付きトレイトヘッダ、プロセス内 \`PrivateKeySigner\`、クラウド \`AwsSigner\`、\`SignableTransaction\` グルー、\`WalletFiller\` の FillProvider チェーンへの統合。

> 📂 **タブで 4 ファイルを開く:**
> - \`crates/signer/src/signer.rs\` — \`Signer\` と \`SignerSync\` トレイト
> - \`crates/signer-local/src/private_key.rs\` — \`PrivateKeySigner\` impl
> - \`crates/signer-aws/src/signer.rs\` — \`AwsSigner\` impl
> - \`crates/provider/src/fillers/wallet.rs\` — \`WalletFiller\`
>
> 正確なパスはドリフトする; 構造的形は耐久する。

## トレイトヘッダ（実ソース）

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

しっかり見るべき 3 つ:

### \`Sig = Signature\` — デフォルト関連型スタイルパラメータ

組み立ては \`Signer<Sig = Signature>\` と書いた。\`Sig\` パラメータが存在するのは、全チェーンが ECDSA k1 secp256k1 署名を使うわけではないから。一部の L2 は BLS、一部は ed25519、一部は耐量子計算スキームを使う。\`Signature\`（alloy の k1 secp256k1 型）をデフォルトにすることで一般ケースを人間工学的に保ちつつ — \`impl Signer\` は暗黙的に \`impl Signer<Signature>\` — 代替スキームをプラグインできる。

> 🛑 **予測。** なぜ \`Sig\` は *関連型* ではなく *トレイトのジェネリックパラメータ* なのか?（\`Network::TxEnvelope\` のように)

なぜなら **同じ署名者が異なる操作で異なる署名型を生成し得る**。ECDSA 鍵を保持する 1 つの \`PrivateKeySigner\` は \`Signer<Signature>\`（ハッシュ署名用）と \`TxSigner<Signature>\`（tx 署名用）の両方を実装し得る — あるいは望むなら生バイト出力バリアント用の \`Signer<RawBytes>\` も。ジェネリックパラメータ = 「異なる \`Sig\` でこのトレイトを複数回実装できる」。関連型 = 「impl ごとに正確に 1 つの \`Sig\` にコミットする」。署名者にはジェネリックが正しい形。

### \`auto_impl(&mut, Box, Arc)\`

3 つのラッパ — \`Provider\` の 5 つ（\`&, &mut, Box, Rc, Arc\`）より狭い。

省略は意図的:

- **\`&\` なし** — \`set_chain_id(&mut self, ...)\` は変更メソッド。\`&self\` ではトレイト経由でコンパイルされない。(\`Provider\` には \`&mut self\` メソッドがないため、より広いリストを持つ。)
- **\`Rc\` なし** — \`Signer\` は \`Send + Sync\` を要求するが、\`Rc<T>\` は \`Rc\` の参照カウントが原子的でないため \`!Send\` かつ \`!Sync\`。\`Arc<T>\` がスレッドセーフ版で残る。

2 つの省略、2 つの異なる理由。**auto_impl リストはトレイト契約に関する正確な宣言。**

### \`Send + Sync\` スーパートレイト

\`Provider\` がそれらを要求するのと同じ理由: 本番コードは署名者を \`Arc<S>\` でラップしタスク横断で共有する。トレイト境界が \`Arc<dyn Signer>\` と \`Arc<S: Signer>\` を自然な共有プリミティブとして機能させる。

## \`PrivateKeySigner\` — プロセス内 impl

\`\`\`rust
pub struct PrivateKeySigner {
    /// k256（Rust BIP-340 secp256k1）の \`SigningKey\`。
    signer: SigningKey,
    /// 公開鍵から導出された Ethereum アドレス。
    address: Address,
    /// EIP-155 リプレイ保護用 Chain ID。
    chain_id: Option<ChainId>,
}
\`\`\`

3 フィールド。\`SigningKey\` は実秘密鍵。\`address\` は *構築時にキャッシュ* される（公開鍵から導出するのは非自明 — 非圧縮 pubkey の keccak、最後 20 バイトを取る — なので 1 度だけ計算)。\`chain_id\` は per-signer であり per-call ではない、なぜなら多くのユーザは 1 つの署名者を 1 つのチェーンにピン留めしたいから。

### コンストラクタ

\`\`\`rust
impl PrivateKeySigner {
    pub fn random() -> Self { /* OsRng → SigningKey */ }
    pub fn random_with(rng: &mut impl CryptoRng) -> Self { /* tests */ }
    pub fn from_bytes(bytes: &B256) -> Result<Self> { /* k256 鍵をパース */ }
    pub fn from_str(s: &str) -> Result<Self> { /* hex → from_bytes */ }
    pub fn from_signing_key(signer: SigningKey) -> Self { /* 直接 */ }
}
\`\`\`

現実的な鍵ソースをカバーする 5 コンストラクタ: テスト用 random、保存鍵用 from-bytes、hex 用 from-string、他所で既に \`SigningKey\` を持つ呼び出し側用 direct。**構築は \`PrivateKeySigner\` がネットワーク束縛署名者と異なる唯一の場所** — 彼らは独自の接続/設定フローを持つ。

### \`Signer\` と \`SignerSync\` の両方

\`PrivateKeySigner\` は async \`Signer\` トレイトと sync \`SignerSync\` トレイトの *両方* を実装する。S 上ジェネリックなコードはどちらも使える:

\`\`\`rust
fn high_throughput_path<S: SignerSync>(signer: &S) { /* sync、future オーバーヘッドなし */ }
fn cloud_compatible_path<S: Signer>(signer: &S) { /* async、AWS でも動く */ }
\`\`\`

\`PrivateKeySigner\` の sync パスが実署名作業を行う; async パスは \`async\` ブロック内で sync パスを呼ぶ薄いラッパ。**Async impl は sync の上に安価に合成される; 逆は機能しない**、これが \`SignerSync\` がより少ない impl が満たす別トレイトとして存在する理由。

> 🔍 **リポジトリで見つける。** \`alloy-signer-local/src/private_key.rs\` を開く。\`impl Signer for PrivateKeySigner\` と \`impl SignerSync for PrivateKeySigner\` の両方が存在することを確認。async \`sign_hash\` 本体を読む — 単に \`async { self.sign_hash_sync(...) }\` か?

## \`AwsSigner\` — クラウド impl

\`\`\`rust
pub struct AwsSigner {
    client: Client,         // \`aws-sdk-kms\` Client
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
        // resp.signature は DER エンコード; alloy Signature に変換
        let sig = der_to_alloy(&resp.signature.as_ref())?;
        // 両可能性を試しアドレスをマッチさせて recovery id を回復
        let recid = recover_recid(hash, &sig, &self.address)?;
        Ok(Signature { /* ... */ })
    }
    // ...
}

// AwsSigner は SignerSync を impl しない — AWS KMS 経由には sync パスがない。
\`\`\`

(おおよそ — 正確な alloy は DER デコードと recovery-id 解決の周りでより精緻。)

注目に値する 3 つ:

1. **AWS は DER エンコード署名を返す**、alloy が使う (r, s, v) タプルではない。署名者の責任はデコードして適応させること。
2. **Recovery ID は AWS から返されない。** AWS は r と s のみを返す。\`v\`（recovery バイト）は両可能性を試しキャッシュ済 \`address\` を生成する方をチェックすることで *回復* されなければならない。**1 AWS 呼び出し → 2 アドレス導出試行 → 1 マッチした署名。**
3. **\`SignerSync\` impl なし。** AWS 呼び出しはネットワークを越えるので sync パスがない。sync を必要とする S 上ジェネリックなコードは AWS 署名者が除外されることを受け入れなければならない。

> 🛑 **理解度チェック。** \`PrivateKeySigner\` は構築時に \`address\` をキャッシュする（一発 pubkey 導出)。\`AwsSigner\` は \`describe_key\` 経由で照会するためキャッシュする。**なぜ全署名者がアドレスをキャッシュするのか? \`address()\` が毎回ネットワーク呼び出しだったら何が壊れるか?**

なぜなら \`address()\` は *全トランザクションで* 呼ばれ、しばしば *tx ごとに複数回* 呼ばれる（追跡、ロギング、署名適格性チェック、コールフレーム構築のため)。ネットワーク呼び出しなら、全トランザクションが *誰の鍵が署名したかを知るためだけに* AWS 往復レイテンシを被る。構築時のキャッシュは 1 回限りのセットアップを償却ゼロ per-call コストと交換する。

## \`SignableTransaction\` — チェーン認識グルー

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

各チェーンの \`UnsignedTx\` 型（Ethereum 用 \`alloy_consensus::TypedTransaction\`、Optimism 用 \`OpTypedTransaction\`）が \`SignableTransaction<Signature>\` を実装する。それが \`TxSigner::sign_transaction\` にチェーンを知らずに動く対象を与える:

\`\`\`rust
async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Signature>) -> Result<Signature> {
    let hash = tx.signature_hash();
    self.sign_hash(&hash).await
}
\`\`\`

\`TxSigner\` はそれがどんな種類の tx かを知らない。トレイトオブジェクトに対し \`signature_hash()\` を呼び、32 バイトハッシュを得て、それに署名するだけ。**SignableTransaction ブリッジ経由で、チェーン非依存の署名者 + チェーン固有の UnsignedTx。**

> 🔍 **リポジトリで見つける。** \`alloy_consensus::TypedTransaction\` を開く。\`impl SignableTransaction<Signature> for TypedTransaction\` を見つける。\`signature_hash\` が tx 型でディスパッチすることを確認（Legacy は RLP エンコード tx を使う、EIP-1559 は \`0x02 || rlp(tx)\` の keccak を使う、等) — エンコードルールは impl の *中* にある。署名者はそれらを見ない。

## \`WalletFiller\` — Provider 機構へのブリッジ

\`\`\`rust
pub struct WalletFiller<W> {
    pub wallet: W,
}

impl<W, N: Network> TxFiller<N> for WalletFiller<W>
where
    W: NetworkWallet<N>,
{
    type Fillable = Sendable<N::TxEnvelope>;

    // ...unsigned tx を構築し、署名し、署名をリクエストに取り付け
    async fn fill(&self, fillable: Self::Fillable, tx: &mut SendableTx<N>) -> TransportResult<...> {
        let envelope = self.wallet.sign_request(/* fillable からの unsigned tx */).await?;
        tx.envelope = Some(envelope);
        Ok(...)
    }
    // ...
}
\`\`\`

(正確な alloy コードはいくつかのトレイト — \`NetworkWallet<N>\`、\`TxFiller<N>\`、\`Sendable\` — を含み、私たちはそれらをスキップ。構造的ポイント: \`WalletFiller\` はウォレット型 \`W\` 上ジェネリック、ネットワーク \`N\` でパラメータ化、Provider チェーンの nonce/gas/chain-id filler と同じ \`TxFiller<N>\` トレイトを実装。)

ユーザに見えるビルダメソッド \`.wallet(signer)\`:

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

\`.wallet(signer)\` は \`.layer(WalletFiller::new(signer))\` の偽装。**Nonce/gas/chain-id filler と同じ合成機構。** 署名者は \`WalletFiller\` でラップされ他とともにスタックされることで FillProvider チェーンに統合される。

これがユーザが \`WalletFiller\` を直接見ない理由: \`ProviderBuilder.wallet(...)\` がドキュメント化された表面。下では Provider チェーンと同じ Filler 機構。

## \`sign_dynamic_typed_data\` — EIP-712（簡潔に）

完全性のため: alloy は EIP-712 署名（ドメインセパレータ付き typed data、dapps でオフチェーン署名注文に多用）のための別 \`SignerSync::sign_dynamic_typed_data(typed_data: &TypedData) -> Result<Signature>\` を持つ。形は:

1. EIP-712 ハッシュを計算（ドメインハッシュ + struct ハッシュ、\`0x1901\` プレフィックス付き)
2. 結果で \`sign_hash\` を呼ぶ

\`sign_message\` と同じデフォルト impl パターン: 低レベル \`sign_hash\` が作業を行う; 高レベルメソッドが EIP-712 プレフィクシングを処理し下を呼ぶ。**1 つのトレイト、複数の入力型、全て同じ低レベル署名 op を経由してルーティング。**

## クイズ前のリコール

スクロールせずに:

1. \`Signer\` の \`auto_impl\` リストは \`(&mut, Box, Arc)\`。なぜ \`&\` なし、なぜ \`Rc\` なし?
2. \`PrivateKeySigner\` は構築時に \`address\` をキャッシュする。トレースする: \`AwsSigner\` で \`address()\` が非キャッシュだったらどう機能するか?
3. \`AwsSigner\` は KMS から \`(r, s)\` のみを返す。\`PrivateKeySigner::sign_hash\` がしない recovery-id 作業を \`AwsSigner::sign_hash\` は何をするか?
4. ユーザは \`ProviderBuilder.wallet(signer)\` を呼ぶ。\`WalletFiller\` 機構を通してトレース: 結果のプロバイダの層構造は何で、署名者の \`sign_transaction\` は実際にどこで呼ばれるか?

次のレッスンはクイズ。どれかの答えが揺らぐなら今これらのリコールに従事する。
`,
                },
                {
                  title: 'クイズ: \`Signer\` モデルは身についたか?',
                  slug: 'alloy-signer-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 11,
                  duration: 4,
                  xpReward: 25,
                  content: `# クイズ: \`Signer\` モデルは身についたか?

Signer 組み立てとウォークスルーを横断した設計決定をカバーする 4 問。他の Advanced クイズと同じルール: **クイズを頷きで通過することはできない。**

2 問以上落とすなら、ドリルに進む前に *\`Signer\` トレイトをステップごとに組み立てる* に戻る。`,
                  quizQuestions: [
                    {
                      question: "Alloy は署名を 2 つのトレイトに分割する: \`Signer\`（チェーン非依存、ハッシュ/メッセージに署名）と \`TxSigner<Sig>\`（チェーン認識、\`SignableTransaction\` 経由でトランザクションに署名)。なぜ \`TxSigner\` は \`Signer\` のメソッドではなく *別* トレイトなのか?",
                      options: [
                        "後方互換性 — 古い alloy バージョンには \`Signer\` のみがあり、\`TxSigner\` は非破壊追加として後で追加された。",
                        "ほとんどの署名操作は tx 署名ではない（EIP-191 メッセージと EIP-712 typed data が dapp 使用を支配する)。稀な tx ケースのために全 \`Signer\` をチェーンパラメータ化することは、全署名者のシグネチャを膨張させる。加えて、\`Signer\` impl（\`PrivateKeySigner\` のような）はチェーン非依存でネットワーク横断で再利用可能 — それらを \`N\` でタグづけするとチェーンごとに 1 つの署名者構造体を強制する。",
                        "Rust のトレイト一貫性ルールが、同じトレイトに sync と async メソッドを置くことを禁じる。",
                        "\`Signer\` は外部ライブラリにより実装される; \`TxSigner\` は alloy により実装される。分割が明確な境界を維持する。",
                      ],
                      correctIndex: 1,
                      explanation: "2 つの理由が合成する。第一に、署名は通常 tx 署名ではない — ほとんどの本番コードは EIP-191 メッセージか EIP-712 typed data に署名する。\`Signer\` に tx 署名を置くと、全署名者を稀ケースでパラメータ化することになる。第二に、\`PrivateKeySigner\` は本質的にチェーン非依存（secp256k1 鍵はチェーンが Ethereum か Optimism かを気にしない)。\`Signer\` を \`N\` でタグづけすると \`PrivateKeySigner<Ethereum>\` と \`PrivateKeySigner<Optimism>\` を別個型として強制する — 無駄。分割が \`Signer\` をチェーン非依存で再利用可能に保ちつつ、\`TxSigner<N>\` がチェーン固有の tx 署名能力を運ぶ — *単一の* \`Signer\` impl が *複数* チェーンに対して提供できる。",
                    },
                    {
                      question: "\`Signer<Sig = Signature>\` は \`Sig\` を関連型ではなく *トレイト上のジェネリックパラメータ* としてパラメータ化する（\`Network::TxEnvelope\` のように)。荷重を担う理由は?",
                      options: [
                        "ジェネリックパラメータは関連型より高速にコンパイルされる。",
                        "関連型はデフォルトを持てない; ジェネリックパラメータは持てる。\`Signature\` をデフォルトにすることが唯一の理由。",
                        "単一の署名者が異なる \`Sig\` 型でトレイトを *複数回* 実装したい場合がある — 例: 同じ struct に \`impl Signer<Signature> for X\` と \`impl Signer<RawBytes> for X\`。ジェネリックパラメータ = 「任意の互換 Sig でこのトレイトを実装できる」。関連型 = 「impl ごとに正確に 1 つの Sig にコミットする」。署名者にはマルチ impl が正しいセマンティクス。",
                        "ジェネリックパラメータは \`dyn Trait\` を許す; 関連型は許さない。",
                      ],
                      correctIndex: 2,
                      explanation: "選択は型ごとに複数 impl が意味をなすかで決まる。Network の \`TxEnvelope\` はチェーンごとに固定（Ethereum に有効な TxEnvelope 型を 2 つ持てない) — 関連型。Signer の \`Sig\` は操作ごと: ECDSA 鍵署名者は通常使用には \`Signature\` を、生出力 API には \`Bytes\` を生成し得る — ジェネリックパラメータが両方の実装を可能にする。**ジェネリック = 「複数 impl が有効」。関連 = 「型ごとに 1 つの impl」。** 同じトレイト形決定、ユースケースごとに異なる答え。（デフォルト値は両形式で機能する — それは理由ではない。)",
                    },
                    {
                      question: "\`PrivateKeySigner\` と \`AwsSigner\` の両方が、各 \`address()\` 呼び出しで計算するのではなく構築時に \`address\` をキャッシュする。これがなぜ重要か — コストモデルは?",
                      options: [
                        "\`address()\` は private だから — 実際には signer crate 外から呼ばれず、キャッシュは様式的選択。",
                        "\`address()\` は *全トランザクションで* 呼ばれる（しばしば tx ごとに複数回 — 追跡、ロギング、署名適格性チェック、コールフレーム構築のため)。\`AwsSigner\` では非キャッシュ \`address()\` は *呼び出しごとに* AWS ネットワーク往復となり、トランザクションごとに 〜50-200ms レイテンシを追加する。\`PrivateKeySigner\` では非キャッシュは呼び出しごとに 1 回の keccak256-of-pubkey — 安価だがそれでも無駄。構築時のキャッシュは 1 回限りのセットアップを償却ゼロ per-call コストと交換する。",
                        "Ethereum プロトコルが \`address()\` がセッション内全呼び出しで安定値を返すことを要求する。",
                        "Rust の借用チェッカーが \`address()\` を作業を行うメソッドにすることを許さない — 事前計算値を読まなければならない。",
                      ],
                      correctIndex: 1,
                      explanation: "アクセスパターンが鍵。全トランザクションが \`address()\` に少なくとも 1 度（送信者チェック、署名適格性)、しばしばそれ以上（ロギング、監視、コールフレーム構築）触れる。\`AwsSigner\` 特に、非キャッシュは tx ごとに \`describe_key\` 往復を意味する — *誰の鍵が署名するかを知るためだけに* 全トランザクションを AWS ネットワークレイテンシで待たせる。構築時に 1 度キャッシュ（\`AwsSigner::new\` で）すればコストは 1 回のみ支払われる。\`PrivateKeySigner\` の per-call コストは keccak256-of-uncompressed-pubkey-take-last-20-bytes — 安価だが繰り返すのは無意味。**tx ごとに繰り返すコストはキャッシュする; 既に安価なコストはキャッシュしない。**",
                    },
                    {
                      question: "ユーザコードが \`ProviderBuilder.wallet(signer).build()\` を呼ぶ。alloy を通してトレース: 結果のプロバイダの実際の層構造は何で、\`sign_transaction\` はどこで呼ばれるか?",
                      options: [
                        "\`ProviderBuilder.wallet(signer)\` は署名者をプロバイダに直接格納する; \`send_transaction\` が内部プロバイダに転送する前に \`signer.sign_transaction()\` を内部で呼ぶ。",
                        "\`.wallet(signer)\` は \`.layer(WalletFiller::new(signer))\` に脱糖される — FillProvider チェーンに \`WalletFiller<W>\` を \`TxFiller<N>\` としてインストール（\`NonceFiller\`、\`GasFiller\`、\`ChainIdFiller\` と並んで)。ユーザが \`provider.send_transaction(...)\` を呼ぶと、各 filler の \`fill()\` がチェーン順で実行する; \`WalletFiller::fill\` が値が埋まった unsigned tx に対し \`wallet.sign_transaction()\` を呼び署名を取り付ける。",
                        "\`.wallet(signer)\` は純粋に便宜メソッド — 署名者はリクエスト型に moved-in され、署名は RPC エンコード後にトランスポート層で起こる。",
                        "\`.wallet(signer)\` は次のプロバイダ層に署名済リクエストを期待するよう告げるマーカー; 署名は \`send_transaction\` が呼ばれる前に外部で起こる。",
                      ],
                      correctIndex: 1,
                      explanation: "\`.wallet(signer)\` は \`.layer(WalletFiller::new(signer))\` の糖衣。署名者は nonce/gas/chain-id と同じ Filler 機構経由で Provider チェーンに入る — \`WalletFiller<W>\` は FillProvider チェーンで動く \`TxFiller<N>\`。リクエストが流れると、各 filler はスタック順で実行する（典型: nonce → gas → chain-id → wallet → send)。Wallet filler が最後に位置するのは、署名ハッシュを計算する前に unsigned tx が完全に埋まっている（nonce/gas/chainid 充填済）必要があるから。Provider チェーンからのクロスチェーン合成パターンがここでも同じ、ただし署名が新しい参加者として加わる。",
                    },
                  ],
                },
                {
                  title: 'ドリル: FillProvider チェーン経由でエンドツーエンドの署名済 tx を出荷',
                  slug: 'alloy-signer-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 12,
                  xpReward: 25,
                  duration: 12,
                  content: `# ドリル: FillProvider チェーン経由でエンドツーエンドの署名済 tx を出荷

読書はリハーサル。**やることが記憶。** このドリルは「\`Signer\` と \`WalletFiller\` について読んだ」から「実署名者を実 ProviderBuilder に配線し、Anvil に対して署名済トランザクションを送信し、FillProvider チェーンが nonce / gas / chain-id / 署名をスタック順で行うのを観察した」へ連れていく。

これは Provider、Network、Signer チェーンの **総まとめ**: 3 つのトレイトファミリ全てが 1 つの実行可能プログラムで合流する。

## セットアップ

2 ターミナル:

**ターミナル 1 — Anvil:**

\`\`\`bash
anvil
\`\`\`

(Anvil は起動時に 10 個の事前資金供給アカウントを表示する; 最初の 1 つを使う。)

**ターミナル 2 — プロジェクト:**

\`\`\`bash
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

## ドリル 1 — \`PrivateKeySigner\` でハッシュに直接署名

完全な Provider チェーンを配線する前に、最低レベル \`Signer::sign_hash\` インタフェースを行使する。結果の署名から署名者のアドレスを回復することで検証する。

\`src/main.rs\`:

\`\`\`rust
use alloy::primitives::{B256, keccak256};
use alloy::signers::{Signer, local::PrivateKeySigner};

#[tokio::main]
async fn main() -> eyre::Result<()> {
    tracing_subscriber::fmt().with_env_filter("info").init();

    // ドリル 1: ハッシュに直接署名
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

\`cargo run\`。署名者のアドレス、続いてマッチする回復アドレスが見えるはず。

> 🛑 **質問（書き留めてから先へ）:** \`signer.sign_hash(&hash)\` は \`Result<Signature>\` を返す。\`Signature\` は alloy の \`(r, s, v)\` タプル。**署名者は \`v\`（recovery バイト）を計算するために内部で何をしなければならなかったか?**

\`PrivateKeySigner\` では、\`v\` は \`k256\` ECDSA recoverable 署名プリミティブから直接落ちてくる — secp256k1 sign-recoverable 関数が署名の一部としてそれを返す。**追加作業なし。** これが \`PrivateKeySigner::sign_hash\` が暗号 1 行である理由: \`(r, s, v) = k256::sign_recoverable(privkey, hash)\`。

\`AwsSigner\` では、\`v\` は *手動で回復* されなければならない（v=0 と v=1 を試し、どちらがキャッシュ済 \`address\` を生成するかを見る)。それがウォークスルーが指摘したクラウド署名のコスト。

## ドリル 2 — 署名者を \`ProviderBuilder\` に配線し実 tx を送信

完全な FillProvider チェーンを行使する。\`ProviderBuilder.wallet(signer)\` で署名者をインストール、加えて \`with_recommended_fillers()\` で nonce / gas / chain-id filler を追加。

\`main.rs\` に追加（ドリル 1 コードの後):

\`\`\`rust
use alloy::providers::{Provider, ProviderBuilder};
use alloy::primitives::{Address, U256, address};

// ドリル 2: FillProvider 経由で実署名済 tx
// Anvil の事前資金供給アカウントの 1 つを使用（Anvil 起動出力から秘密鍵）
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

(\`.with_to(...)\`、\`.with_value(...)\` 呼び出しは Network チェーンからの \`TransactionBuilder<N>\` トレイトメソッド。全てがどう合成するかに注目: Provider チェーンの \`ProviderBuilder\`、Network チェーンの \`TransactionBuilder\`、Signer チェーンの \`.wallet()\` — 3 チェーン、1 実行可能プログラム。)

\`cargo run\` はこんな感じを生成するはず:

\`\`\`
signer address: 0x... (ランダム)
recovered: 0x... (matches: true)
funded sender: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
tx hash: 0x...
status: true
recipient balance: 1000000000000000000
\`\`\`

受信者残高はちょうど 1 ETH（1_000_000_000_000_000_000 wei)。**署名済トランザクションが着地した; FillProvider チェーンが仕事をした。**

## ドリル 3 — 実行された filler をトレース

\`with_recommended_fillers()\` + \`.wallet(signer)\` 呼び出しが 4 つの \`TxFiller\` をチェーンに重ねた。\`send_transaction\` が何かを送信できる前に、各 filler は流出する \`TransactionRequest\` 上でスタック順に実行された。

> 🛑 **予測（スクロール前に書き留める）：** あなたの \`TransactionRequest::default().with_to(recipient).with_value(value)\` は \`to\` と \`value\` のみを設定した。レシートは tx が nonce、gas limit、gas price（または maxFeePerGas)、chain_id、署名を持っていたことを示す。**各欠損フィールドについて、*どの filler* がそれを埋めたか、*どんなアクション* を取ったかを挙げる。**

4 つの filler とそのアクション:

| Filler | 埋めたフィールド | アクション |
| :--- | :--- | :--- |
| \`NonceFiller\` | \`nonce\` | \`eth_getTransactionCount(from, "pending")\` を呼ぶ |
| \`GasFiller\` | \`gas\`、\`gasPrice\`（legacy）または \`maxFeePerGas\` + \`maxPriorityFeePerGas\`（EIP-1559) | \`eth_estimateGas\` と \`eth_gasPrice\`（または EIP-1559 の \`eth_feeHistory\`）を呼ぶ |
| \`ChainIdFiller\` | \`chainId\` | \`eth_chainId\` を 1 度呼びキャッシュ |
| \`WalletFiller\` | \`signature\`（それが \`TxEnvelope\` になる) | リクエストから \`SignableTransaction\` を構築、\`signer.sign_transaction()\` を呼ぶ、署名済エンベロープを生成するため署名を取り付ける |

順序が重要: \`WalletFiller\` は他の *後* に動く、なぜなら署名ハッシュを計算する前に nonce/gas/chain_id が存在する必要があるから。**Sign-after-fill は譲歩不可能。**

> 🔍 **リポジトリで見つける。** \`crates/provider/src/fillers/\`（または filler が住む場所）を開く。確認: \`TxFiller<N>\` トレイトがあり、\`NonceFiller\`、\`GasFiller\`、\`ChainIdFiller\`、\`WalletFiller\` が全て \`impl TxFiller<N>\`。**それらは交換可能; 順序は \`with_recommended_fillers\` と \`.wallet()\` がどう挿入するかで決まる。**

## ドリル 4 — 理解度チェック: filler をスキップして失敗を観察

コードを変更して \`with_recommended_fillers()\` を *スキップ*:

\`\`\`rust
let provider_no_fillers = ProviderBuilder::new()
    .wallet(funded_signer.clone())  // wallet のみ、nonce/gas/chain_id なし
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

> 🛑 **実行前に予測。** どんなエラーを期待するか? ヒント — WalletFiller は引き続き動く（それは wallet)、しかし他は全て欠損。

\`"Error: missing nonce"\` か \`"Error: missing gas"\`/\`"missing maxFeePerGas"\` のようなものが見えるはず、どの検証が最初に発火するか次第。**エラーは filler が実作業をすることを証明する** — それらなしではリクエストは不完全。戻すとプログラムが動く。

> 🔍 **もう 1 つのバリエーションを試す。** nonce filler のみを追加し、次に何が欠損するか観察。gas を追加し、次に何が欠損するか観察。**各 filler が 1 つのギャップを閉じる。**

## ドリル 5 — 最終 Provider 型を検査（オプション)

層状 FillProvider 型を *見たい* なら、これを追加し \`cargo\` に文句を言わせる:

\`\`\`rust
let _: () = provider;  // 型不一致エラーが実型を表示する
\`\`\`

コンパイラはこんな感じを表示するはず:

\`\`\`
expected (), found
  FillProvider<JoinFill<JoinFill<JoinFill<JoinFill<Identity, GasFiller>, NonceFiller>, ChainIdFiller>, WalletFiller<EthereumWallet>>, RootProvider, Ethereum>
\`\`\`

(正確な型は alloy の内部命名による。) 左から右に読む: \`FillProvider\` が内部プロバイダをラップする; \`JoinFill<...>\` チェーンが 4 つの filler のスタック。Wallet は最外層に座り、\`send_transaction\` 中に最後に適用される。

**これは Provider チェーンの「正しい塔を構築する」レッスンの型レベル実現** — 型自身が filler スタック順をエンコードする。

## レッスン末リコール

スクロールせずに、自分の言葉で:

1. \`PrivateKeySigner\` は recovery-id 作業をする必要がない; \`AwsSigner\` はする。**アーキテクチャ的原因は何か?** 各々で \`v\` はどこから来るか?
2. ドリル 2 をトレース: \`provider.send_transaction(req)\` が呼ばれてからネットワークが署名済エンベロープを見るまでの間、**どの filler がどの順で動き、どんな RPC 呼び出しを行ったか?**
3. **なぜ \`WalletFiller\` は filler チェーンの *最後* なのか?** \`NonceFiller\` の前に動くと何が壊れるか?
4. プロバイダのコンパイラ表示型は深い \`FillProvider<JoinFill<JoinFill<...>>>\`。**ネスト深さは実行時に何を表すか?**

どれかの答えが揺らぐなら、レッスンはあなたで終わっていない。ドリルを再実行するか組み立てを再読する。

このドリルの後、*完全な Provider/Network/Signer トリオを通した署名済トランザクション* を出荷した — 全 dapp、MEV bot、インデクサが本番で使うのと同じ形。**Provider、Network、Signer チェーンが完了。** コースの最終クイズが次の停留所。`,
                },
                {
                  title: 'Alloy Advanced 最終クイズ',
                  slug: 'alloy-advanced-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 13,
                  duration: 8,
                  xpReward: 25,
                  content: `# Alloy Advanced 最終クイズ

3 つのチェーン横断の最終チェック: \`Provider\`、\`Network\`、\`Signer\`。

3 問。同じルール: **クイズを頷きで通過することはできない。** 2 問落としたら、Alloy Advanced を終えたと主張する前に該当チェーンの組み立てを再読する。`,
                  quizQuestions: [
                    {
                      question: "\`Provider\` の \`root()\` メソッドはトレイトで唯一必須のメソッド — 他の全 RPC メソッドはデフォルト impl を持つ。荷重を担うアーキテクチャ目的は?",
                      options: [
                        "ロギング/トレーシング用にプロバイダ名を返す。",
                        "ラッパプロバイダ（署名、filler チェーン、カスタム層）が 30+ 全 RPC メソッドを再実装せずにトランスポートアクセスを委譲できるようにする。ラッパは \`root()\` を内部プロバイダの \`root()\` に転送する; トレイトのデフォルト impl が \`self.root()\` 経由で実トランスポートにルーティングする — ラッパスタックを自動的に通り抜ける。",
                        "API 安定性のために保持された後方互換メソッド。",
                        "Rust の \`dyn Provider\` インフラに要求される。",
                      ],
                      correctIndex: 1,
                      explanation: "\`root()\` 間接化が FillProvider スタックを機能させるもの。ラッパ作者は *1 つのメソッド本体*（root 転送）+ オーバーライドしたい特定メソッドだけを書く; 他 30+ メソッドはトレイトのデフォルト impl 経由で無料で来る。これが \`LoggingProvider\`、\`FillProvider\`、\`WalletFiller\`、任意のカスタム層が N×M ラッパメソッド本体爆発なしに合成できるようにする。Provider チェーンのステップ 4 のパターン。",
                    },
                    {
                      question: "\`Network\` はトレイト上の 10 ジェネリックパラメータではなく 10 個の *関連型*（TxType、TxEnvelope、TransactionRequest、TransactionResponse、ReceiptEnvelope、ReceiptResponse、Header、HeaderResponse、BlockResponse、UnsignedTx）を使う。Network 上ジェネリックなコードに対する荷重を担う利点は?",
                      options: [
                        "関連型はジェネリックパラメータより高速にコンパイルされる。",
                        "凝集性 + 簡潔性: 関連型は「これらは一緒に行く」をグループ化する（Ethereum の TxRequest は Ethereum の TxEnvelope とペアにならなければならず、Optimism のとは決してペアにならない）、加えて呼び出し側は 10 個の生ジェネリックではなく 1 つのパラメータ（\`<N: Network>\`）だけを綴る。",
                        "ジェネリックパラメータはトレイトメソッドシグネチャでは使用できず、トレイト本体でのみ使用できる。",
                        "関連型は \`dyn Trait\` をサポートする; ジェネリックパラメータはしない。",
                      ],
                      correctIndex: 1,
                      explanation: "凝集性が決定的機能: \`Provider<EthereumTxRequest, OptimismReceipt>\` は生ジェネリックならコンパイルされる — 異なるチェーンの型を混ぜることを止めるものは何もない。関連型がそれらを 1 つの \`Network\` impl 下にグループ化するので、\`Ethereum\` を選ぶと一貫したセットを選ぶ。加えて Provider に言及する全シグネチャは生ジェネリックで 10 パラメータを綴らなければならない; 1 つの \`N: Network\` がそれら全てを引き込む。alloy の他の部分でも同じイディオム: \`TransactionEnvelope<Self>\`、\`BlockResponse<Self>\` — 辞書キーでパラメータ化されたヘルパトレイトが N 上ジェネリックなコードを移植可能に保つ。",
                    },
                    {
                      question: "ユーザコードが \`ProviderBuilder.wallet(signer).on_http(url)\` を呼ぶ。alloy を通してトレース: \`signer\` を Provider チェーンに統合する実機構は?",
                      options: [
                        "\`.wallet(signer)\` は署名者をプロバイダに直接格納する; \`send_transaction\` が内部で \`signer.sign_transaction()\` を呼ぶ。",
                        "\`.wallet(signer)\` は \`.layer(WalletFiller::new(signer))\` に脱糖される — FillProvider チェーンに \`WalletFiller<W>\` を \`TxFiller<N>\` としてインストール、\`NonceFiller\`/\`GasFiller\`/\`ChainIdFiller\` と並んで。\`send_transaction\` が動くと、各 filler の \`fill()\` がスタック順に動く; \`WalletFiller::fill\` が値が埋まった unsigned tx に対し \`signer.sign_transaction()\` を呼び、署名を取り付ける。",
                        "\`.wallet(signer)\` は次のプロバイダ層に署名済リクエストを期待するよう告げるマーカー; 署名は外部で起こる。",
                        "\`.wallet(signer)\` は流出 JSON-RPC ペイロードに署名を注入するため基底トランスポートを変更する。",
                      ],
                      correctIndex: 1,
                      explanation: "\`.wallet(signer)\` は \`.layer(WalletFiller::new(signer))\` の糖衣。署名者は nonce/gas/chain-id と同じ Filler 機構経由で Provider チェーンに入る — \`WalletFiller<W>\` は FillProvider チェーンで動く \`TxFiller<N>\`。順序が重要: \`WalletFiller\` は *最後* に動く、なぜなら署名ハッシュを計算する前に nonce/gas/chain_id が埋まっている必要があるから。3 チェーン（Provider の \`Filler\`、Network の \`TxFiller<N>\`、Signer の \`Signer\` + \`WalletFiller\`）が 1 つの実行可能プログラムに合成する — 3 つ全てを行ったアーキテクチャ的見返り。",
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
