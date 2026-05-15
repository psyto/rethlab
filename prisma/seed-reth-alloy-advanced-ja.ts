import { PrismaClient } from '@prisma/client';

export async function seedRethAlloyAdvancedJA(prisma: PrismaClient) {
  const tags = ['alloy', 'rust', 'advanced', 'rpc', 'provider'];

  await prisma.course.create({
    data: {
      slug: 'alloy-advanced-ja',
      title: 'Inside Alloy — Rust Ethereum ライブラリを読む',
      description:
        'alloy のソースを 1 行ずつ読み解く — `Provider` トレイト、`Network` 抽象、`Signer`/`Filler` モデル。3 つの独立した Advanced コース（Revm・Reth・Alloy）の 3 つ目で、受講順は自由。alloy は Reth と dapp が依拠する基盤なので、Rust で Ethereum を扱うあらゆる場面で本コースは効いてきます。',
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
                  title: 'Inside Alloy へようこそ — このコースの読み方',
                  slug: 'alloy-advanced-welcome-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 7,
                  xpReward: 15,
                  content: `# Inside Alloy へようこそ — このコースの読み方

これは RethLab の 3 つの独立した Advanced ティアコースの 1 つです:

- **Inside Revm** — EVM エンジンの内側
- **Inside Reth** — Reth の内側: Staged Sync・ExEx・Reth SDK
- **Inside Alloy**（あなたはここ）— Alloy の内側: Provider・Network・Signer

Alloy はほかの全員が依拠する基盤 — Reth は alloy の型を使い、Revm は alloy の primitive を使い、Rust から Ethereum と通信する dapp / MEV ボット / インデクサはすべて alloy の \`Provider\` を使います。本コースが教えるのは **alloy のソースを読む** スキル — Inside Revm が revm を読む力を養うのと同じ形です。

> 📋 **Advanced ティアは初めて?** 始める前に *Bridge to Advanced* の末尾にある **「Advanced コースの読み方」** に目を通してください。編集スタイル（Predict プロンプト、クイズゲート、build-up → walkthrough → quiz → drill のチェーン構造）とペース配分を説明しています。3 つの Advanced コース全てに共通なので、1 度だけ読めば十分。

## このコースが教えること

[\`alloy-rs/alloy\`](https://github.com/alloy-rs/alloy) のソースを 1 行ずつ読みます:

- **\`Provider\` トレイト** — Ethereum ノードと話すための中心的な抽象
- **\`Network\` 抽象** — alloy が Ethereum・Optimism・Anvil・カスタム L2 を同じ API で扱う仕組み
- **\`Signer\` / \`Filler\` モデル** — トランザクション署名、ガス推定、nonce 管理を層状のプロバイダに合成する仕組み

トピックチェーンは 3 本、それぞれ build-up + walkthrough + quiz + drill の構成。

読み終える頃には alloy のホットパスを読みこなし、カスタム Provider レイヤーを構築できるようになります — MEV パイプライン、インデクサ、Reth-SDK App-chain が本番に投入しているのと同じ種類のコードです。

## 前提知識

**中級 Rust**（Bridge to Advanced でカバー）:
- ジェネリクスとトレイト境界、関連型、デフォルト型パラメータ
- \`Arc<T>\`、\`dyn Trait\`、層状の所有権
- \`async\` / \`Future\` の基礎、Tokio ランタイムモデル
- \`auto_impl\` マクロと手続き属性

**EVM 内部の知識は不要。** Alloy は EVM の上で動きます — 通信相手はノードであって opcode ではありません。(3 つの Advanced コース全てを受けるなら、EVM 内部は Inside Revm で扱います。)

**alloy をユーザーとして使った経験** — \`Provider::get_balance\`、\`ProviderBuilder\`、tx 署名 — は Fundamentals（\`alloy-primitives-signing\`、\`alloy-provider\`）で扱います。心もとなければ Fundamentals レッスンを先に。本コースが教えるのは alloy を *使う* ことではなく *読む* ことです。

## セットアップ — 一度だけ

レッスン 1 に入る前に、別ウィンドウで準備:

1. **\`alloy-rs/alloy\` を clone** — \`git clone https://github.com/alloy-rs/alloy\`
2. **動作する \`cargo\` ツールチェイン** — \`rustc --version\` で現代的なバージョンが表示されること
3. **セカンドモニタか分割端末** — 読みながらソースを参照するため

「Find in repo」プロンプトはリポジトリを実際に開いていないと意味を成しません。始める前にここを済ませておく。

## 準備完了

コース詳細に戻り、**\`Provider\` トレイトをステップで組み立てる** から始めましょう。

Inside Alloy を終えると、3 つの Advanced コースをすべて完了したことになります。続く **Expert** では手続きマクロと zkVM 統合を深掘りします。`,
                },
                {
                  title: '\`Provider\` トレイトをステップで組み立てる',
                  slug: 'alloy-provider-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 10,
                  xpReward: 25,
                  content: `# \`Provider\` トレイトをステップで組み立てる

Ethereum ノードと通信する Rust プログラム — MEV ボット、インデクサ、dapp バックエンド、Reth-SDK アプリ — は、すべて [\`alloy-rs/alloy\`](https://github.com/alloy-rs/alloy) の \`Provider\` を経由する。RPC の上に立つ唯一の抽象だ。\`crates/provider/src/provider/trait.rs\` を開くと、トレイトヘッダーはこんな形（抜粋）になっている:

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

いろいろなことが一度に起きている: デフォルト付きの \`N: Network\` ジェネリック（チェーンを表す — Ethereum、Optimism、カスタム L2）、別途定義された \`RootProvider\` 型を返す \`root()\` アクセサ、見慣れないラッパー型（\`ProviderCall\`、\`RpcWithBlock\`、\`EthCall\`）を返すメソッド群、そして 5 種類のラッパー型をカバーする \`auto_impl\`（\`&P\`、\`Box<P>\`、\`Arc<P>\` などに対するトレイト実装を導出するマクロ）。

予備知識ゼロで読むと、一度に 6 つの新概念が押し寄せる。もう少し楽な道がある: **積み上げる**。書きうる最も素朴な RPC クライアントから始め、複雑さを 1 段ずつ獲得していく。最終的には本物の形（Network パラメータ化、トランスポート間接化、層状プロバイダ、その他もろもろ）を自分の手で組み立てたことになる。

> 📂 **別タブで \`alloy-rs/alloy\` を開く。** 各ステップで突き合わせる。モジュールの正確なパスはリリースごとに動くが、組み立てる構造は変わらない。

## ステップ 0 — 素朴な RPC クライアント

なにも考えずに Rust ↔ Ethereum ブリッジを書くと、\`get_balance\` はおおむねこんな形になる:

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

自由関数。URL はハードコード。トランスポート（HTTP）もハードコード。チェーン（Ethereum 形式の JSON-RPC）もハードコード。

> 🛑 **予測。** スクロールせずに: この素朴な設計が本番運用で生き残れない理由を 3 つ挙げる。ヒント — それぞれ別 *種類* の問題。

3 つ:

1. **URL がハードコード。** Anvil、Alchemy 経由のメインネット、プライベートノード、フォークハーネス — 関数を書き直さなければ切り替えられない。
2. **トランスポートがハードコード。** HTTP しか扱えない。WebSocket サブスクリプションや IPC 接続は別の伝送機構なので、HTTP を直接埋め込むと、3 種類のトランスポートに対して同じ関数を 3 度書く羽目になる。
3. **チェーンがハードコード。** Optimism のトランザクションには \`L1Cost\` フィールドがある。カスタム L2 はそれぞれ独自のエンベロープ形状を持つ。JSON-RPC のメソッド名は共通だが、パラメータと応答型は異なる。Ethereum の形をハードコードすると、それ以外のチェーンとは通信できない。

直しかた: **この 3 軸をトレイトに抽象化する。** 各軸はジェネリックパラメータとなり、ユーザーは構築時に一度だけ選び、トレイトメソッドの本体はそれに左右されない。

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

\`Provider\` がトレイトになった。実装側が呼び出しの実現方法を選ぶ（HTTP、WebSocket、モックなど）。ユーザーはトレイトに対して書き、トランスポートのことは気にしない。

これは *Ethereum* なら通用する。が、Optimism が欲しくなった瞬間にトレイトの形が足りないことに気づく。

## ステップ 2 — 複数チェーン: \`Network\` 抽象

Optimism の \`TransactionRequest\` には \`l1_block_number\` ヒントがある。Optimism のレシートには \`l1_fee\` フィールドがある。RPC のメソッド名は同じ（\`eth_sendTransaction\`、\`eth_getTransactionReceipt\`）でも *型* が違う。

\`OptimismProvider\` を別建てのトレイトとして書きたくはない — 9 割は同一になってしまう。代わりに **チェーンプリミティブを \`Network\` トレイトの背後に抽象化する**:

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

\`Network\` は *型レベルの辞書* — \`N: Network\` を選ぶと、そのチェーンが使う型一式が 1 か所でまとめて決まる。

これで \`Provider\` は \`N\` でジェネリックになる:

\`\`\`rust
pub trait Provider<N: Network> {
    async fn get_balance(&self, address: Address) -> Result<U256>;  // 全チェーン共通 — 変わらず
    async fn call(&self, tx: N::TransactionRequest) -> Result<Bytes>;  // チェーン固有
    async fn send_transaction(&self, tx: N::TransactionRequest) -> Result<...>;  // チェーン固有
    // ...
}
\`\`\`

> 🛑 **予測。** デフォルト型パラメータ付きの \`N: Network = Ethereum\` が、デフォルトなしの \`N: Network\` より優れている理由は?

理由は **ユーザーの 99% は Ethereum を使いたい** から。デフォルトのおかげで \`Provider<Ethereum>\` と書かずに \`Provider\` で済む。書き換えが必要なのは Optimism / カスタム L2 のユーザーだけ。デフォルト型パラメータは一般ケースを楽にし、まれなケースを明示にする。

本物の alloy トレイトもまさにそのデフォルトを持つ: \`pub trait Provider<N: Network = Ethereum>\`。

## ステップ 3 — 複数のトランスポート: 間接化を挟む

実装が 2 つあると想像する: \`HttpProvider\` と \`WsProvider\`。どちらもトレイトを満たす。だが *基盤クライアント*（JSON-RPC ペイロードを送る当の主体）が違う — 片方は \`reqwest::Client\`、もう片方は WebSocket 接続。

トランスポートを型の一部として持たせると:

\`\`\`rust
struct HttpProvider<N: Network> { client: reqwest::Client, url: Url, _phantom: PhantomData<N> }
struct WsProvider<N: Network>   { conn: WsConnection, _phantom: PhantomData<N> }
struct IpcProvider<N: Network>  { /* ... */ }
\`\`\`

同じトレイトメソッドを持つ struct が 3 つできて、本体はコピペ。これは筋が悪い。

良い案: **トランスポートのトレイトを導入する**。プロバイダは JSON-RPC を送れる *何か* を保持する; その「何か」はトレイトオブジェクト:

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

> 🔍 **リポジトリで確認。** alloy で \`alloy-transport\` と \`alloy-transport-http\` を検索。トランスポートが別クレートに切り出されている点に注目。おかげで \`alloy-transport-http\` *だけ*、あるいは \`alloy-transport-ws\` *だけ* に依存できる — 両方を引き込まずに済む。

(現行 alloy では、トランスポート抽象は \`tower::Service\` を内側に持つ \`Transport\` + \`TransportConnect\` という、より精緻な設計へ進化しています。とはいえ構造的な決定 — トランスポートを抽象化して 1 つのプロバイダ実装ですべてを動かす — は不変の骨格です。)

## ステップ 4 — \`RootProvider\` と \`root()\` による間接化

ここまでで struct は 1 つ: \`ProviderImpl<T, N>\`。だが alloy を設計した側が直面した問題がある: **ユーザーはプロバイダをラップしたい**。

外向きのトランザクションを *自動的に署名する* プロバイダが欲しいとする。\`SignerProvider\` を書く: 内側の \`Provider\` をラップし、\`send_transaction\` をオーバーライドする:

\`\`\`rust
pub struct SignerProvider<P: Provider, S: Signer> {
    inner: P,
    signer: S,
}
\`\`\`

\`SignerProvider\` 自体が \`Provider\` を実装すれば（大半のメソッドは \`inner\` に転送し、\`send_transaction\` だけオーバーライド）、ユーザーは積層できる: \`SignerProvider<NonceFiller<HttpProvider>>\`。

ただしこれらのラッパーは自前のトランスポートを持たない — トランスポートにアクセスするには *いちばん内側の* プロバイダへ委譲する必要がある。そこで \`root()\` メソッド:

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

\`RootProvider\` は **トランスポートを所有する具象 struct**。これ以外の Provider 実装は内側のプロバイダを保持し、その内側に \`root()\` を転送するだけでよい。トレイトのデフォルトメソッドは \`self.root()\` 経由でトランスポートにアクセスする — だからラッパーの作者は、変更したい箇所だけをオーバーライドすればよい。

> 🛑 **理解度チェック。** スクロールせずに: \`SignerProvider\` を書いている状況を想定する。どのメソッドをオーバーライドし、どれをデフォルトに任せるか? \`root()\` の間接化がこれをすっきりさせるのはなぜか?

オーバーライドするのは \`send_transaction\`（tx に署名してから inner に転送）。残り（\`get_balance\`、\`call\` など）はトレイトのデフォルト実装に任せる — それらは \`self.root()\` 経由でトランスポートを取得する。**メソッド本体を 30 個書く代わりに 1 個で済む。**

## ステップ 5 — 層状プロバイダ: \`FillProvider\` と \`Filler\`

ステップ 4 のラッパーパターンは一般化できる。よくある要求:

- **外向きのトランザクションに署名する**（\`Signer\`）
- **nonce を埋める**（ユーザーが指定していなければ \`get_transaction_count\` を問い合わせる）
- **ガス見積もりを埋める**（ユーザーがガス上限を指定していなければ \`estimate_gas\` を実行）
- **チェーン ID を埋める**（\`chain_id\` を 1 度問い合わせ、すべての tx に付与する）

それぞれが \`Filler\` — 送信前に外向きの \`TransactionRequest\` に手を入れる、小さなロジックの単位。次のように合成する:

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

これを積層する: \`FillProvider<NonceFiller, FillProvider<GasFiller, FillProvider<SignerFiller, RootProvider>>>\`。各層が 1 ピースを埋める。ユーザーはビルダーで組み立てる:

\`\`\`rust
let provider = ProviderBuilder::new()
    .filler(NonceFiller)
    .filler(GasFiller)
    .signer(my_signer)
    .on_http(url);
\`\`\`

\`.filler(...)\` のたびに内側のプロバイダがさらに \`FillProvider\` 層でラップされる。**継承ではなく合成 — RPC クライアント構築に適用したかたち。**

## ステップ 6 — 共有利用のための \`auto_impl\`

最後のピース。本物の alloy はこうなっている:

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync { /* ... */ }
\`\`\`

\`auto_impl\` は、\`P: Provider\` であれば \`&P\`、\`&mut P\`、\`Box<P>\`、\`Rc<P>\`、\`Arc<P>\` についても \`Provider\` 実装を導出する。なぜか?

理由は **MEV ボット、インデクサ、dapp サーバーは、1 つのプロバイダを多数のタスクで共有したい** から。自然なかたちは \`Arc<Provider>\` — Arc は安価にクローンでき、1000 個のワーカータスクへ配り、全員が同じ接続プールに当たる。\`auto_impl\` が \`Arc<P>\` の \`Provider\` 実装を自動生成してくれるので、呼び出し側は \`Arc<dyn Provider>\` や \`Arc<P>\` を \`P\` 自身と互換に使える。

## ここまでに組み立てたもの

\`\`\`rust
#[auto_impl(&, &mut, Box, Rc, Arc)]
pub trait Provider<N: Network = Ethereum>: Send + Sync {
    fn root(&self) -> &RootProvider<N>;
    // self.root() を経由するデフォルト実装の RPC メソッド群
}
\`\`\`

どのピースも、それぞれ存在理由を稼いでいる:

- **\`N: Network = Ethereum\`**（ステップ 2）— 型レベル辞書、デフォルトのおかげで Ethereum ユーザーは楽
- **トランスポート抽象トレイト**（ステップ 3）— プロバイダ実装 1 つで HTTP / WS / IPC すべてに対応
- **\`RootProvider\` + \`root()\`**（ステップ 4）— ラッパーが 30 個のメソッドを再実装せずにトランスポートへ委譲できる
- **\`FillProvider\` / \`Filler\`**（ステップ 5）— 署名、nonce、ガスを合成可能な層に
- **\`auto_impl\`**（ステップ 6）— \`Arc<P>\` がそのまま \`Provider\` として動く; タスク間で安価に共有できる

次のレッスンでは、alloy 本体の \`crates/provider/src/provider/trait.rs\` を 1 行ずつ読み、各行を組み立てステップに対応づけていきます。

## 先に進む前のリコール

スクロールせずに:

1. デフォルトつきの \`N: Network = Ethereum\` が、デフォルトなしの \`N: Network\` より優れる理由は?
2. \`root()\` が解決している問題はなにか — 「各 Provider 実装が自分のトランスポートを持つ」では解けない部分はどこか?
3. \`SignerProvider\` の \`Provider\` 実装をスケッチしてみる — どのメソッド本体を書き、どれをデフォルトに任せるか?
4. \`auto_impl(Arc, ...)\` が alloy の本番利用で効いてくる理由は?

どれかが曖昧なら戻って読み直す。次のレッスンは、alloy 本体の \`Provider\` ソースのガイド付きウォークスルー。
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

素朴な RPC クライアントから本物のトレイトの形まで \`Provider\` を組み立ててきました。今度はソースを開きます — [\`crates/provider/src/provider/trait.rs\`](https://github.com/alloy-rs/alloy/blob/main/crates/provider/src/provider/trait.rs) を開いて、本番版を 1 行ずつ読み解きます。読むピースのひとつひとつが、それを動機づけた組み立てステップに対応しているはずです。

特に大事なのは、組み立てが意図的に省いた部分を埋めること — **戻り値型の機構**（\`ProviderCall\`、\`RpcWithBlock\`、\`EthCall\`、\`PendingTransactionBuilder\` — await する *前* に RPC 呼び出しをカスタマイズできる future ビルダー型）。これらのラッパー型は、alloy に初めて触れる人がもっとも奇妙に感じる部分です — が、存在理由が見えてくると、トレイトの面構えは恣意的なものではなくなります。

> 📂 **\`alloy-rs/alloy/crates/provider/src/provider/trait.rs\` を今開く。** 行番号やメソッド本体は動きますが、構造的なポイントは変わりません。レッスンが「現行 alloy main」と言っていても、引用部分は **必ず自分の手元で確認** してください。

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

注目すべき点が 3 つ:

### \`Send + Sync\` スーパートレイト

すべての \`Provider\` 実装は、スレッド間で安全に move できる（\`Send\` — 値を別スレッドに渡せる）かつ、複数スレッドから安全に参照できる（\`Sync\` — \`&P\` を共有できる）必要がある。これは飾りではない — 本番ユーザーはプロバイダを \`Arc<P>\`（アトミック参照カウントの共有ポインタ）でラップし、Arc を多数のタスクハンドラ（ワーカー、MEV サーチャー、インデクサのストリーム処理）へクローンする。\`Send + Sync\` がなければ、そうした使い方はそもそもコンパイルしない。

### \`#[auto_impl(&, &mut, Box, Rc, Arc)]\`

5 種のラッパー。Inside Revm の \`DatabaseRef\` と同じ形、同じ理由: \`Provider\` は状態読み取りに \`&self\` しか必要としない — メソッドシグネチャに \`&mut self\` の変更系がない — ので、5 種のラッパー型すべてがトレイトを通して動く。\`Arc<P>\` と \`Rc<P\>\` は安価な共有ハンドルを提供する。

> 🛑 **予測。** \`Database\`（revm）は \`auto_impl(&mut, Box)\` — 2 種だけ。\`Provider\`（こちら）は 5 種。**\`Database\` と \`Provider\` の構造上のどんな違いが、この非対称を生んでいるのか?**

\`Database\` のメソッドは \`&mut self\` を取る（実装側がキャッシュをその場で書き換えられるように）。これだと \`&\`/\`Rc\`/\`Arc\` は使えない — それらは \`&mut T\` を取り出せないからだ。\`Provider\` のメソッドは \`&self\` を取る — キャッシュが必要なら実装側で内部可変性（\`Mutex\`、\`OnceLock\`、アトミックプリミティブ）を使う。\`auto_impl\` の幅広いリストは、\`&self\` を選んだことの直接的な帰結。同じ形のトレードオフだが、ユースケースに応じて答えが違う。

### \`root()\` だけが必須メソッド

ほかはすべてデフォルト実装。**実装側は root を指せばよいだけ。** ラップするプロバイダ（signer、ガス filler、nonce filler）は、\`root()\` を内側へ転送するだけで実装できる: \`self.inner.root()\`。トレイトのデフォルトメソッドは \`self.root()\` 経由でトランスポートにアクセスする。**ラッパー作者が書くのは 1 行。**

> 🔍 **リポジトリで確認。** alloy 全体から \`fn root(&self) -> &RootProvider\` を検索する。実装の数を数えてみる — ラッパープロバイダにも、アダプタにも、テストフィクスチャにも 1 つずつ存在する。これが設計全体を支える要のメソッド。

## トランスポートアクセサ: \`client()\` と \`weak_client()\`

2 種類:

\`\`\`rust
fn client(&self) -> ClientRef<'_>     // 強参照、ライフタイム束縛
fn weak_client(&self) -> WeakClient   // 所有 weak 参照、ライフタイムなし
\`\`\`

なぜ 2 種類か?

- **\`client()\`** — 同期的な呼び出し向け: クライアントを短く借り、リクエストを送って応答を得る。ライフタイム束縛 — 借用元より長くは生きられない。
- **\`weak_client()\`** — 借用元より長く生きるタスク向け: サブスクリプション、長寿命のバックグラウンドタスク、\`tokio::spawn\` で投入するもの — プロバイダを生かし続けたくないがクライアントへのハンドルは必要、というケース。\`Weak\` 参照は drop を妨げない; プロバイダが drop されればタスクは気づいてシャットダウンする。

この非対称は、alloy がサポートする 2 つの運用モードに対応する: 短命な RPC 呼び出しと、長寿命なサブスクリプションのストリーム。

## RPC メソッド群 — 代表的な 3 つの形

30 以上あるメソッドを全部読もうとしないこと。*戻り値型のパターン* を示す 3 つを読む:

### \`get_block_number\` — パラメータなし、シンプルな結果

\`\`\`rust
fn get_block_number(&self) -> ProviderCall<NoParams, U64, BlockNumber> {
    self.client().request_noparams("eth_blockNumber").into()
}
\`\`\`

\`ProviderCall<P, R, F>\` は **future ビルダー** — まだ \`await\` していない、進行中の RPC 呼び出しを表す。型パラメータは 3 つ: \`P\` = パラメータ型、\`R\` = 生応答型、\`F\` = 最終的にユーザーに渡る型（例: \`BlockNumber\` は使い勝手のため \`U64\` を re-type したもの）。

\`impl Future<Output = u64>\` ではなく、なぜわざわざこの型か? **\`ProviderCall\` は await の前に呼び出しをカスタマイズさせる** ためだ。\`get_block_number\` にはカスタマイズの余地がほとんどないが、トレイトはすべての RPC メソッドに同じ形を使うので、カスタマイズの仕組みは常に手元にある。

### \`get_balance\` — ビルダー経由でブロックを選択

\`\`\`rust
fn get_balance(&self, address: Address) -> RpcWithBlock<Address, U256> {
    RpcWithBlock::new_provider(move |block| {
        self.client().request("eth_getBalance", (address, block)).into()
    })
}
\`\`\`

\`RpcWithBlock\` は、**どのブロック** に対して問い合わせるかを呼び出し側に選ばせるビルダー:

\`\`\`rust
provider.get_balance(addr).await                            // latest（デフォルト）
provider.get_balance(addr).block_id(1_000_000.into()).await // 過去
provider.get_balance(addr).hash(some_hash).await            // ブロックハッシュ
provider.get_balance(addr).pending().await                  // pending ブロック
\`\`\`

\`get_balance\` の内側に「latest」をハードコードしてしまうと、過去や pending を問い合わせたいユーザーは別のメソッドを組み立てざるを得ない。ビルダーパターンを使えば **メソッドは 1 つ、問い合わせ方は多数** を維持できる。

> 🛑 **理解度チェック。** ブロックの選択を、\`get_balance(addr, block_id)\` のように関数引数で渡すのではなく、呼び出し側のメソッドチェーン（\`.block_id(...)\`）で行う設計にしたのはなぜか?

ほとんどの呼び出しは \`latest\` を求めており、各メソッドのシグネチャに \`block_id\` パラメータを足すと呼び出し側ごとに煩雑になるから。ビルダーパターンは一般ケース（\`get_balance(addr).await\`）を簡潔に、まれなケース（\`...block_id(N).await\`）を明示的に保つ。デフォルト型パラメータと同種のトレードオフ — API を 95% のケースに寄せている。

### \`call\` — カスタマイズの幅が大きいケース

\`\`\`rust
fn call(&self, tx: N::TransactionRequest) -> EthCall<N> {
    EthCall::new(self.client(), tx)
}
\`\`\`

\`EthCall\` はもっとも作り込まれたビルダー。チェーンできるメソッドを見ていく:

- \`.block(BlockId)\` — 特定ブロックに対する eth_call
- \`.overrides(state_overrides)\` — 状態オーバーライド付き eth_call（アカウントなりすまし、残高上書き、コード上書き）
- \`.gas(...)\`、\`.value(...)\`、\`.from(...)\` — 呼び出し直前に tx を補正

\`eth_call\` の JSON-RPC メソッドは 4〜5 個のオプションパラメータを持つ。これを 1 つのメソッドシグネチャにすべて押し込むと、まず読めない代物になる。ビルダーパターンはそれを連鎖メソッド群に分解する。**各メソッドは \`EthCall\` 自身の \`fn\` であり、\`Provider\` からは独立している。**

> 🔍 **リポジトリで確認。** \`crates/provider/src/provider/eth_call.rs\`（手元のバージョンで \`EthCall\` が定義されている場所）を開く。チェーン可能メソッドの数を数える。その数が \`eth_call\` の API 表面 — JSON-RPC メソッドのオプションフィールドと 1:1 に対応している。

## パターン: ビルダー戻り値型

3 つの戻り値形（\`ProviderCall\`、\`RpcWithBlock\`、\`EthCall\`）は、一見すると API のふくらみすぎに見えるかもしれない。が、そうではない。**それぞれが、対応する RPC メソッドのオプション構造に合わせた汎用ビルダーパターン。**

| RPC メソッド | オプションパラメータ | 戻り値型 |
| :--- | :--- | :--- |
| \`eth_blockNumber\` | なし | \`ProviderCall\`（await するだけ）|
| \`eth_getBalance\` | block | \`RpcWithBlock\`（オプション次元 1 つ）|
| \`eth_call\` | block, from, gas, value, state | \`EthCall\`（オプション次元が多数）|

戻り値型はそのメソッドの JSON-RPC 仕様に合うカスタマイズだけを公開する。**型駆動の発見しやすさ** — IDE が戻り値型のビルダーメソッドを通じて妥当なオプションを提示する。

## デフォルト実装の動作

トレイト本体はほとんどがデフォルト実装。ほぼ全メソッドがこの形に従う:

\`\`\`rust
fn get_X(&self, args...) -> SomeReturnType {
    self.client().request("rpc_methodName", args).into()
}
\`\`\`

クライアント経由でリクエストを構築する（\`self.client()\` は最終的に \`RootProvider\` のトランスポートまで届く）。最後の \`.into()\` で適切なビルダー / future 型へ変換する。

これが **ラッパープロバイダが実際に変えたい部分以外をオーバーライドしなくてよい** 理由。\`SignerProvider\` は \`send_transaction\` をオーバーライドする; それ以外はデフォルトに任せ、自動的に \`self.root()\`（そしてその先のトランスポート）が使われる。

## \`PendingTransactionBuilder\` — トランザクション送信

個別に見ておきたいメソッドが 1 つ:

\`\`\`rust
fn send_transaction(&self, tx: N::TransactionRequest) -> SendTransaction<N>
\`\`\`

\`SendTransaction\` は上のビルダーと似ているが、複数ステップのやり取りを扱う:

1. トランザクションを送信する（\`PendingTransactionBuilder\` が返る）
2. 必要に応じて設定: 待つ確認数、タイムアウトなど
3. await — トランザクションが採掘されたらレシートを得る

ビルダーはユーザーに「どこまで待つか」を選ばせる:

\`\`\`rust
provider.send_transaction(tx).await?                       // tx ハッシュのみ、待たない
provider.send_transaction(tx).with_required_confirmations(3).get_receipt().await? // 3 ブロック待つ
\`\`\`

同じビルダーパターンが、**「tx 送信 → 採掘 → 確定」のステートマシン** に対応する形に広がっている。

## クイズ前のリコール

スクロールせずに:

1. \`Provider\` は \`auto_impl(&, &mut, Box, Rc, Arc)\`、\`Database\` は \`auto_impl(&mut, Box)\`。**この非対称を生んでいる、トレイト構造上の決め手はなにか?**
2. \`get_balance\` が \`impl Future<Output = U256>\` ではなく \`RpcWithBlock\` を返すのはなぜか?
3. \`SignerProvider\`（ラッパープロバイダ）は内側のプロバイダへ 30 以上のメソッドを転送しなければならない。作者が実際に書くメソッド本体はいくつか、そしてその理由は?
4. \`weak_client()\` は \`client()\` と並んで存在する。weak のほうを使うのはどんなときか?

次のレッスンは進行をゲートするクイズ。**クイズはうなずきでは通せない** — 答えが曖昧なら、今のうちにリコールに取り組むこと。
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

組み立てとウォークスルーにまたがる設計判断を問う 4 問。ほかの Advanced クイズと同じルール: **クイズはうなずきでは通せない。**

2 問以上落としたら、ドリルへ進む前に *\`Provider\` トレイトをステップで組み立てる* に戻ること。`,
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
                  title: 'ドリル: ログ Provider ラッパーを作る',
                  slug: 'alloy-provider-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 4,
                  duration: 12,
                  xpReward: 25,
                  content: `# ドリル: ログ Provider ラッパーを作る

読むだけではリハーサル。**手を動かすことで記憶になる。** このドリルでは、「ラッパープロバイダを読んだ」段階から「実際に書いて、実 RPC エンドポイントに当て、各呼び出しの経路に自分のコードが介在しているのを見届けた」段階まで進みます。

任意の Provider をラップし、選んだ RPC 呼び出しを内側のプロバイダへ転送する前にログ出力する \`LoggingProvider\` を書きます。これは **本番のインデクサや MEV パイプラインで実際に動いているのとまったく同じ種類のコード**: alloy をフォークせずに、RPC クライアントの上に観測可能性を層として積み増す形です。

## セットアップ

必要なものは 3 つ:

1. **Foundry / Anvil** — alloy が通信する相手となるローカル Ethereum 開発ノード:

   \`\`\`bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   \`\`\`

2. **新規の cargo プロジェクト** — alloy クローンとは別ディレクトリ。ただし alloy に依存させる:

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

   (find-in-repo プロンプト用にクローンしている現行 alloy のバージョンに合わせる。\`Provider\` の構造的な形はバージョン間で変わらないが、フィーチャーフラグは動くことがある。)

## ドリル 1 — まず \`FillProvider\` を読む

自分のラッパーを書く前に、alloy の既存実装を読む。\`alloy-rs/alloy\` クローンを開いて次を探す:

\`\`\`
crates/provider/src/fillers/mod.rs
\`\`\`

> 🔍 **\`impl<F, P, N> Provider<N> for FillProvider<F, P, N>\` を探す**（手元のバージョンで等価な形）。確認するポイント:
>
> 1. \`root()\` メソッド — なにを返すか? *(\`self.inner.root()\` へ転送しているはず)*
> 2. \`FillProvider\` が明示的にオーバーライドする RPC メソッドはどれか? *(数は少ないはず — \`send_transaction\`、ガス充填まわりで \`call\`/\`estimate_gas\` 程度)*
> 3. オーバーライドされていないメソッドはトレイトのデフォルト実装に落ちる。**それらのデフォルトが内側プロバイダのトランスポートに到達できるのは、なんのおかげか?**

> 🛑 **問い（スクロール前に書き留める）:** \`FillProvider\` は 30 以上あるうち〜3〜5 個のメソッドしかオーバーライドしない。残りの〜25 個は \`FillProvider\` 内のコードなしで正しくルーティングされる。**なぜか?**

理由は、トレイトのデフォルト実装が \`self.client()\` を呼び、これは \`self.root().client()\` に落ちるから。\`FillProvider\` の \`root()\` は \`self.inner.root()\` を返す — だから各デフォルト実装メソッドは自動的に内側プロバイダのトランスポート経由でルーティングされる。**メソッドごとに書くコードはない。** これが組み立てで見た \`root()\` 間接化の見返り。

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

(\`get_balance\` の正確な戻り値型は alloy のバージョンによってエイリアスが多少違うかもしれない。IDE がトレイトのシグネチャとして提示するものに合わせる; 構造は同じ。)

> 🛑 **続ける前に予測。** メソッド本体は 2 つ書いた（\`root\` + \`get_balance\`）。\`logging_provider.get_block_number().await\` の呼び出しは、なにかログを出すか? 理由は?

出さない — インターセプトしたのは \`get_balance\` だけ。\`get_block_number\` はトレイトのデフォルト実装に落ち、そこで \`self.client()\` を使い、\`self.root()\` 経由で基盤トランスポートへ直接ルーティングされる。**ログはメソッド単位の opt-in** で、ラッパーは明示的にインターセプトしたものしか目にしない。

本番の観測性層なら、重要なメソッド（\`send_transaction\`、\`call\`、\`get_logs\`、\`get_balance\`）をインターセプトする — 30 個すべてではない。同じ見返り: 価値を生むメソッドの本体だけを書き、残りはデフォルトに任せる。

## ドリル 3 — Anvil に配線する

別のターミナルで Anvil を起動:

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

    // こちらはログされないはず（get_block_number はインターセプトしていない）
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

> 🛑 **出力を確認する。** ログが \`get_balance\` でのみ発火し、\`get_block_number\` では発火していないことを確かめる。両方でログが出るならコードが間違っている（うっかり別のメソッドもオーバーライドしている）。どちらも出ないなら、ラッパー自体が使われていない（ラップを忘れている、または \`tracing_subscriber\` が初期化されていない）。

## ドリル 4 — \`ProviderBuilder\` の Filler と積層する

本番のプロバイダは通常 *すでに* nonce / ガス / チェーン ID 管理のために \`FillProvider\` でラップされている。\`LoggingProvider\` はこれらと合成すべきで、置き換えるべきではない。

配線を変更して alloy の推奨 filler を含める:

\`\`\`rust
let inner = ProviderBuilder::new()
    .with_recommended_fillers()  // nonce + gas + chain-id filler を追加
    .on_http("http://localhost:8545".parse()?);

let provider = LoggingProvider::new(inner);

let bal = provider.get_balance(addr).await?;
\`\`\`

> 🔍 **問い:** 実行する。ログは引き続き発火するか? そして層化が動く理由は — \`LoggingProvider<FillProvider<NonceFiller, FillProvider<GasFiller, FillProvider<ChainIdFiller, RootProvider>>>>\` はラッパーの塔だ。**この合成を自動で成立させている、\`Provider\` のどんな性質か?**

各ラッパーの \`root()\` がさらに 1 段内側に転送し、トレイトのデフォルト実装は \`self.root()\` 経由で root にアクセスできさえすればよいから。塔全体はトレイトのレベルで平坦化される — **N 層のラッパーがあっても、実行時には 1 本の間接化チェーン。**

これがアーキテクチャ上の解放: ラッパーの組み合わせは任意、各ラッパーは互いを知らずに済み、新しいラッパー層の追加は純粋にコードを足すだけ。

## レッスン末のリコール

スクロールせずに、自分の言葉で:

1. \`FillProvider\` は 30 以上のうち〜3〜5 個のメソッドをオーバーライドする。**オーバーライドしていないメソッドが、内側プロバイダのトランスポートに到達できるのはなんのおかげか?**
2. あなたの \`LoggingProvider\` は \`get_balance\` だけログを出す。同じラッパー越しに呼ばれているのに、\`get_block_number\` がログを出さないのはなぜか?
3. \`LoggingProvider<FillProvider<...>>\` はラッパーの積層。**各ラッパーが互いを知らないままで、この合成を自動的に成立させているトレイトレベルの 1 つの性質はなにか?**

答えが曖昧なら、レッスンはあなたを掴んだままだ。ドリルをやり直すか、組み立てのステップ 4（\`root()\`）を読み直す。

このドリルを終えた時点で、本番 MEV パイプラインやインデクサで使われているのと同じ種類のコード — alloy をフォークせずに観測可能性を層として積み増す — を投入したことになる。**次のチェーン: \`Network\` 抽象。**`,
                },
                {
                  title: '\`Network\` トレイトをステップで組み立てる',
                  slug: 'alloy-network-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 5,
                  duration: 10,
                  xpReward: 25,
                  content: `# \`Network\` トレイトをステップで組み立てる

Optimism のトランザクションは L1 \`mint\` フィールドを持つ。レシートには \`l1_fee\` と \`l1_block_number\` が乗る。Polygon zkEVM の tx エンベロープにはシーケンサ署名がある。各 L2 は独自の tx・レシート・ブロックの形を持つ — それでも同じ \`Provider\` API がそのすべてで動く。**どうやって?** \`Network\` を通してだ: alloy の *型レベル辞書*（1 つのトレイトで、その関連型が、あるチェーンが使うチェーン固有の型一式を選ぶ）。

Provider チェーンでは \`Network\` をブラックボックスとして扱いました。本チェーンではその中身を開けていきます。

このレッスンを終える頃には、以下のすべてを組み立てたことになります:

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

10 個の関連型。各々を必要としている失敗モードを見るまでは、奇妙な形に映る。

> 📂 **別タブで \`alloy-rs/alloy/crates/network\` を開く。** \`crates/consensus\` も用意 — 具象型（\`TxEnvelope\`、\`Header\` ほか）の大半はそちらに置かれている。

## ステップ 0 — 素朴な Provider、Ethereum にハードコード

Provider チェーンの早い段階では、\`send_transaction\` はこんな形でした:

\`\`\`rust
fn send_transaction(&self, tx: EthereumTransactionRequest) -> SendTransaction;
\`\`\`

\`EthereumTransactionRequest\` がハードコード。レシートもハードコード。ブロックヘッダーもハードコード。メインネットでは動く — しかしメインネットでしか動かない。

> 🛑 **予測。** スクロールせずに: このハードコード設計が破綻する本番チェーンを 3 つ挙げる。ヒント — それぞれがトランザクションやレシートの *別の形* を要求する。

3 つ:

1. **Optimism。** Tx エンベロープには L1 デポジット由来 ETH のための \`mint\` フィールドが乗る。レシートには \`l1_gas_used\` と \`l1_block_number\`。ハードコードされた Ethereum 型ではこれらを運べない。
2. **Anvil / Hardhat（カスタムハードフォーク付き）。** Anvil の \`impersonateAccount\` は、標準 Ethereum 型には存在しないデバッグフィールド付きのレシートを返す。
3. **カスタム tx エンベロープを持つカスタム L2。** Polygon zkEVM、Scroll、Linea — それぞれ L1 データ手数料やシーケンサ署名のために独自の tx エンベロープバリアントを抱える。

直しかた: **チェーン固有型をトレイトの背後に抽象化する。**

## ステップ 1 — 最初のスケッチ: 概念ごとに 1 型

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

これは *おおむね* 正しい。関連型は 3 つ。Ethereum と Optimism がそれぞれ自分の型一式を選ぶ。Network 上ジェネリックなコード（\`Provider<N: Network>\` など）は、関連型を介して読み書きする。

しかし「トランザクション」は 1 つの型ではない — *複数あり*、それぞれが異なる役割を担っている。

## ステップ 2 — トランザクションには複数のライフサイクルがある

1 つのトランザクションは複数の表現を経て進む:

- **\`TransactionRequest\`** — ユーザーが *組み立てる* もの。フィールドの大半はオプション。ビルダー API で組み立てる: \`TransactionRequest::default().with_to(addr).with_value(...)\`。
- **\`UnsignedTx\`** — *すべてのフィールドが埋まった* リクエスト: nonce が解決され、ガスが見積もられ、chain_id がセットされ、署名用のハッシュを取れる状態。
- **\`TxEnvelope\`** — 署名済みトランザクション。\`UnsignedTx\` + 署名。ワイヤに乗ってブロードキャストされる対象。
- **\`TransactionResponse\`** — \`eth_getTransactionByHash\` が返すトランザクション。\`block_hash\`、\`block_number\`、\`transaction_index\` が焼き込まれている。

役割ごとにフィールド、検証、シリアライズが異なる。これらを 1 つの \`Transaction\` 型に押し込むと、各メソッドは広すぎる和型に対してランタイム検証を行うはめになる。分けてしまえば、型システムが「\`TransactionRequest\` はブロードキャストできない」「\`TransactionResponse\` に署名できない」を強制できる。

> 🛑 **理解度チェック。** 「同じデータ、状態が違うだけ」はもっともらしいが、正しい捉え方ではない。**署名がオプション、block_hash がオプション……の 1 つの型がなぜダメなのか?**

検証がランタイムへ押し出されてしまう。\`broadcast(&tx)\` は「署名は本当に存在するか? block_hash は不在か（すでに block_hash を持つ tx をブロードキャストするのは無意味）」をチェックする羽目になる — 本来コンパイラが拒否すべきものがランタイムエラーになる。\`TransactionRequest\` / \`UnsignedTx\` / \`TxEnvelope\` / \`TransactionResponse\` に分けると、こうした不整合な状態はそもそも構築できない。各関数のシグネチャが正しい状態だけを受け取るようになる。

そこでトレイトが膨らんでいく:

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

関連型は 6 つ。続いてレシートとブロックも同じように分割する必要があることが分かる。

## ステップ 3 — レシートとヘッダーも分割される

\`eth_getTransactionReceipt\` は、コンセンサスが定義するフィールド *に加えて* RPC が付ける装飾フィールド（transaction_hash、block_hash、block_number、transaction_index など）を持つレシート様のオブジェクトを返す。純粋なコンセンサス形 — Merkle ルートに入るもの — は API 応答とは別物だ。

同じ分割を当てはめる:

- **\`ReceiptEnvelope\`** — コンセンサス形。コンセンサスプロトコルが気にするもの。
- **\`ReceiptResponse\`** — RPC 戻り値型。「チェーン上のどこにあるか」のメタデータが付く。

ヘッダーも同じ形:

- **\`Header\`** — コンセンサスヘッダー
- **\`HeaderResponse\`** — RPC 整形済みヘッダー（ハッシュ計算済み、JSON 化のため gas_used が文字列、など）
- **\`BlockResponse\`** — RPC 経由で返ってくる完全なブロックペイロード

さらにもう 1 つ — Ethereum も Optimism も、扱っている tx が *どの種別* か（Legacy / EIP-1559 / EIP-4844 / OP-Deposit）を識別する必要がある:

- **\`TxType\`** — トランザクション分類用の enum タグ

これでトレイトはこうなる:

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

関連型は 10 個。それぞれが具体的な失敗モードに対して存在理由を稼いでいる。

## ステップ 4 — なぜ関連型なのか、ジェネリックパラメータではなく

初めて alloy を読んだときに引っかかった設計選択がこれだ: **なぜこれは関連型のトレイトで、ジェネリックパラメータを持つ struct ではないのか?** 例えば:

\`\`\`rust
struct Provider<TxRequest, TxEnvelope, Receipt, Block, ...> { ... }
\`\`\`

> 🛑 **予測。** スクロールせずに: ジェネリックパラメータを多数並べた struct のなにがダメなのか?

問題は 3 つ:

1. **一貫性が担保されない。** \`Provider<EthereumTxRequest, OptimismTxEnvelope, ...>\` がそのままコンパイルしてしまう。違うチェーンの型を混ぜ合わせるのを止めるものが何もない。関連型なら 1 つの \`Network\` 実装の下にそれらを束ねられる — \`Ethereum\` か \`Optimism\` を選ぶだけで、整合した一式が手に入る。
2. **呼び出し側ごとの冗長さ。** \`Provider\` に言及するシグネチャはすべて、10 個のジェネリックパラメータを書き並べる必要がある。\`Provider<N: Network>\` ならパラメータ 1 つで 10 型を引き込める。
3. **型レベルの同一性がない。** \`Network\` は *トレイト* なので、\`fn for_network<N: Network>(...) -> N::TransactionRequest\` のような関数が書ける。Network 名そのものが同一性を運ぶ。素のジェネリックには、その同一性がない。

**関連型は「これらは組で動く」を表現する。** ジェネリックパラメータは「どんな組み合わせでも有効」を表現する。チェーンプリミティブには前者が正しい意味論だ。

本物の alloy はまさにこの理由で関連型を採用している。alloy の中で「あるチェーンの tx エンベロープ」に触れる関数を見ると、それは \`N::TxEnvelope\`（関連型アクセス）であって \`E\`（ジェネリックパラメータ）ではない。

## ステップ 5 — トレイト境界: \`Send + Sync + 'static\`

\`\`\`rust
pub trait Network: Send + Sync + 'static { ... }
\`\`\`

境界は 3 つ。

- **\`Send + Sync\`** — \`Provider\` が要求するのと同じ理由から: 本番ユーザーは \`Arc<Provider<N>>\` でラップしてタスク間でクローンする。関連型とネットワーク型そのものが、送受信・共有について安全である必要がある。これらがないと \`Arc<Provider<MyNetwork>>\` はコンパイルしない。
- **\`'static\`** — \`Provider\` は \`PhantomData<N>\` を保持する。\`N\` が非 \`'static\` のライフタイムパラメータを持つと、各 \`Provider\` インスタンスがそのライフタイムに縛られる — 「グローバルな \`Arc\` に Provider を置く」パターンを壊す厳しい制約だ。

> 🛑 **理解度チェック。** 「\`'static\` は永遠に生きる」というのは受け売りの説明。自分の言葉で: \`Network\` 実装が非 \`'static\` のライフタイムパラメータを持てたら、*具体的に* なにが壊れるか? どんな失敗が起きるかをスケッチしてみる。

\`MyNetwork\` が借用ライフタイムを持つとする（例: \`MyNetwork<'a>\`、ここで \`'a\` は外部設定のライフタイム）。すると \`Provider<MyNetwork<'a>>\` もそのライフタイムを継承する。プロバイダを \`Arc\`（\`Arc<Provider<MyNetwork<'a>>>\`）に入れると、\`Arc\` 自身も \`'a\` に縛られることになる。**Arc は、借用元の設定より長生きできない。** \`'static\` を要求すればこのパターンを排除できる: \`MyNetwork\` 実装は自分のデータをすべて所有し、借用は持たない。Arc は自立できる。

## ステップ 6 — 仕上げ

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

関連型にはそれぞれ自分のトレイト境界が付いている（例: \`Serialize + DeserializeOwned\`、\`Clone\`、\`Encodable\`）— これらが応答を RPC シリアライズ可能に、エンベロープを RLP エンコード可能にしている。このレッスンではそれらの境界には踏み込まない; 次のレッスンで詳しく読む。

並べてみる:

- **TxType** — enum タグ（Legacy / EIP-1559 / EIP-4844 / チェーン固有バリアント）
- **TxEnvelope / UnsignedTx** — 署名前 / 署名後のコンセンサス形
- **TransactionRequest / TransactionResponse** — ユーザーが組み立てる側と RPC が返す側
- **ReceiptEnvelope / ReceiptResponse** — コンセンサス形と RPC 戻り値
- **Header / HeaderResponse / BlockResponse** — コンセンサスヘッダー、RPC ヘッダー、RPC ブロック

alloy の具象実装は: \`Ethereum\`（\`alloy-network\` 内）、\`Optimism\`（\`alloy-op-network\` 内）、\`AnyNetwork\`（「事前にチェーンが分からない」ツール向けの寛容な実装で、serde 風の型を関連型に持つ）。

## 先に進む前のリコール

スクロールせずに:

1. \`TransactionRequest\` と \`TxEnvelope\` は別々の関連型。**この 2 つを統一した \`Transaction\` 型では強制できず、別々にすることで型システムが強制してくれるのは何か?**
2. \`Network\` は *関連型* を使い、ジェネリックパラメータは使わない。**Network 上ジェネリックなコードにとって、この選択がもたらす具体的な帰結を 2 つ挙げる。**
3. **\`'static\`** はトレイト境界のひとつ。\`Network: Send + Sync\`（\`'static\` なし）だったらどんなパターンが壊れるか?
4. Optimism のデポジットには L1 \`mint\` フィールドが含まれる。**\`Ethereum\` と \`Optimism\` で値が異なる必要があるのはどの関連型か?**

答えが曖昧ならスクロールして戻る。次のレッスンでは、alloy 本体の \`Network\` トレイトと \`Ethereum\` / \`Optimism\` の実装を詳しく読みます。
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

10 個の関連型とトレイト境界を、素朴な出発点から動機づけてきました。今度は本物のソースを読みます — 組み立てで省いた関連型ごとのトレイト境界、alloy の \`Ethereum\` 実装、\`Optimism\` 実装の並列比較、そして \`TransactionRequest\` をチェーンをまたいで流暢に扱うためのヘルパートレイト（\`TransactionBuilder\`）まで。

組み立てステップ 4 で見た「一貫性の性質」（関連型は『これらは組で動く』をひとまとめにする）が、ここで具体的な形になります。並べて見ると、Optimism がどのスロットをオーバーライドし、どのスロットを Ethereum から再利用しているかが一目で分かります。

> 📂 **3 つのファイルをタブで開く:**
> - \`crates/network/src/lib.rs\` — \`Network\` トレイト
> - \`crates/network/src/ethereum/mod.rs\` — \`Ethereum\` 実装
> - \`alloy-rs/op-alloy\`（別リポジトリ）— \`Optimism\` 実装用
>
> モジュールの正確なパスはリリースごとに動くが、形は変わらない。

## 全境界付きのトレイト

本物の \`Network\` トレイトは関連型ごとにトレイト境界を持つ — 組み立てではそれらを \`...\` と省略していた。おおよその形:

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

注目すべき点が 3 つ:

### \`Network\` 自身の \`Debug + Clone + Copy + Send + Sync + Sized + 'static\`

組み立てでは \`Send + Sync + 'static\` に触れた。本物のトレイトはさらに上乗せする:

- **\`Debug\`** — Network 実装は \`{:?}\` で印字できる必要がある。主にトレースログ用（「Ethereum チェーンで Provider を構築...」）。
- **\`Clone + Copy\`** — \`Network\` 実装は *ゼロサイズのマーカー型*。\`struct Ethereum;\` は 1 バイト（アラインメント次第ではゼロ）。\`Copy\` があるおかげで、ライフタイムを気にせず値で気軽に渡せる。
- **\`Sized\`** — デフォルトではあるが明示している。\`PhantomData<N>\` が struct のフィールドとして動くようにするため。

> 🛑 **予測。** \`Network\` が意図的にゼロサイズのマーカー型で、チェーン設定を保持する struct ではないのはなぜか?

理由は、チェーン設定（chain ID、ハードフォークスケジュールなど）は *プロバイダ接続ごと* に変わるものであり、ネットワーク型ごとに変わるわけではないから。メインネットを指すか Sepolia を指すかでも、ユーザーは *同じ* \`Ethereum\` ネットワーク型を使う — 違いはチェーン仕様の側にあり、そちらは別の場所に置かれている。\`Network\` が答える問いは「*どの型ファミリ* を使うか」 — 静的で型レベルの問いであって、ランタイム設定ではない。マーカー struct はそれをぴたりと表現する。

### \`TxType: Into<u8> + TryFrom<u8>\`

これはコンセンサスシリアライゼーション用のフック。EIP-2718（Ethereum の型付きトランザクションエンベロープ仕様）は、各トランザクションを 1 バイトのプレフィックスで型付けする（0x01 = EIP-2930 アクセスリスト、0x02 = EIP-1559 base fee、0x03 = EIP-4844 blob tx）。\`Into<u8>\` と \`TryFrom<u8>\` の境界によって、高位の enum とワイヤ上のバイトのマッピングが可能になる:

\`\`\`rust
let tx_type: TxType = bytes[0].try_into()?;
let byte: u8 = tx_type.into();
\`\`\`

\`TryFrom\` であって \`From\` ではない理由は、すべてのバイト値が有効な tx 型に対応するわけではないから。Optimism はこの集合を拡張する: \`0x7E\` が OP-Deposit トランザクションだ。だから Optimism の \`TxType\` は *別の* enum で、\`TryFrom\` 実装も別物になる。とはいえどちらも \`Into<u8>\` は実装する。**トレイトの形は同じで、バリアントの集合だけがチェーンごとに変わる。**

### \`TransactionEnvelope<Self>\` — 関連型上のトレイト境界パターン

\`type TxEnvelope: TransactionEnvelope<Self>\` を見てほしい。関連型自身が別のトレイト（\`TransactionEnvelope\`）を実装する必要があり、そのトレイトは *所属するネットワークでパラメータ化* されている。

これは alloy のイディオム「関連型ごしに揃ったヘルパートレイト」: 各 \`Network::TxEnvelope\` が \`TransactionEnvelope<Self>\` を実装することで、Network 上ジェネリックなコードからチェーンによらず \`.tx_hash()\` や \`.signer()\` を呼び出す統一手段が得られる。

\`ReceiptEnvelope<Self>\`、\`BlockResponse<Self>\`、\`TransactionBuilder<Self>\` も同じパターン。関連型は *Self でパラメータ化されたヘルパーを実装するよう制約される*。Provider 側で \`Provider<N>\` が使っているのと同じ手口だ。

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

注目すべき点が 2 つ:

1. **関連型は 2 つのクレートにまたがる。** コンセンサス形（\`TxEnvelope\`、\`Header\`、\`ReceiptEnvelope\`）は \`alloy-consensus\` 由来。RPC 形（\`Transaction\`、\`TransactionReceipt\`、\`Block\`）は \`alloy-rpc-types-eth\` 由来。**クレート境界が「コンセンサスが扱う領域」と「RPC が返すもの」という概念的な切り分けと一致している。**
2. **\`UnsignedTx = TypedTransaction\`。** 命名が少し意外に見える。\`TypedTransaction\` は「EIP-2718 の型付きトランザクションバリアントのいずれか、完全に埋まっていて署名直前」を意味する alloy 側の名前。組み立てで言う「充填後・署名前」の状態だ。

> 🔍 **リポジトリで確認。** \`alloy_consensus::TxEnvelope\` を開く。tx 型ごとに 1 バリアントを持つ enum（\`Legacy\`、\`Eip2930\`、\`Eip1559\`、\`Eip4844\`）。確認: \`TxEnvelope\` は *署名済み*（エンベロープ＝署名を含む）で、\`TypedTransaction\` は *未署名* — になっているか? **その通り。** これが組み立てステップ 2 で説明したライフサイクルだ。

## \`Optimism\` 実装 — どこが変わるか

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

(モジュールパスは大まか。現行 op-alloy を確認のこと。)

**一貫性の性質の働きかた:**

- 5 つの *トランザクション* 関連スロット（TxType、TxEnvelope、UnsignedTx、TransactionRequest、TransactionResponse）はすべて Ethereum と違う。Optimism の deposit-tx バリアントがすべてに波及するためだ。
- 2 つの *レシート* 関連スロット（ReceiptEnvelope、ReceiptResponse）はどちらも違う。L1 ガス / L1 ブロックのフィールドが波及するためだ。
- *ヘッダー* 型と \`HeaderResponse\` は **Ethereum と共有**。Optimism のブロックは同じヘッダー構造を持つから（OP がコンセンサスヘッダーのレベルで EVM 互換であることの副産物）。
- \`BlockResponse\` は別物。なぜなら *ブロックのトランザクションリスト* に OP 型のトランザクションが含まれるから。Ethereum の \`Block\` を再利用すると、OP のデポジットが Ethereum 型 tx としてシリアライズされてしまう — それは誤り。

> 🛑 **理解度チェック。** 素朴な設計なら、各チェーンが 10 個の型をゼロから定義する — ほとんどのチェーンが大半の型を Ethereum と共有していたとしても。**なぜここでは「別クレートから関連型を引く」が正しいパターンで、「Network 実装ごとに各型を再実装」ではないのか?**

理由は、一貫性の性質が *双方向* に働くから。型が異なる箇所はオーバーライドしなければならない。同じ箇所は共有しなければならない — そうしないと、複数のチェーンを共通のツール（例えば任意のチェーンのヘッダーを読む汎用ブロックエクスプローラ）で相互運用できなくなる。関連型のアプローチはこの両立を可能にする: 変動するスロットだけをオーバーライドし、変動しないスロットは共有する。**Optimism の \`Header\` が文字どおり \`alloy_consensus::Header\` である事実は、Network 上ジェネリックに書かれたヘッダーパーサが、再コンパイルなしで Ethereum でも Optimism でも動くことを意味する。**

## \`TransactionBuilder\` ヘルパートレイト

関連型 \`TransactionRequest\` にはトレイト境界 \`TransactionBuilder<Self>\` が付く。これは流暢な構築メソッドを公開する *別の* トレイトだ:

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

これが \`TransactionRequest::default().with_to(addr).with_value(eth(1))\` のような流暢な構築感を生む。

> 🔍 **リポジトリで確認。** \`crates/network/src/transaction/builder.rs\` を開く。\`with_*\` / \`set_*\` のメソッド数を数える。かなり多い。**なぜこれが \`Network\` とは別トレイトで、関連型に直接メソッドを置く形になっていないのか?**

理由は、同じビルダーメソッドが Ethereum の \`TransactionRequest\` でも Optimism の \`TransactionRequest\` でも動く必要があるから — そして \`TransactionBuilder<N>\` をトレイトにすることで、リクエストを組み立てる N 上ジェネリックなコードが書けるようになる:

\`\`\`rust
fn build_request<N: Network>() -> N::TransactionRequest {
    <N::TransactionRequest>::default()
        .with_to(Address::ZERO)
        .with_value(U256::from(1_000))
}
\`\`\`

同じコードで Ethereum、Optimism、AnyNetwork、カスタム L2 のいずれでも動く。**型レベル辞書 + ヘルパートレイト ＝ チェーン横断で移植可能なコード。**

## \`AnyNetwork\` — 寛容な逃げ道

\`alloy-network\` には 3 つ目の Network 実装 \`AnyNetwork\` がある。これは「事前にチェーンが分からない」モードで、任意のフィールドを受け入れる serde 風の型を使う:

\`\`\`rust
impl Network for AnyNetwork {
    type TxType = WithOtherFields<...>;
    type TxEnvelope = AnyTxEnvelope;
    type TransactionResponse = AnyRpcTransaction;
    // ...
}
\`\`\`

ブロックエクスプローラ、マルチチェーンインデクサ、汎用 RPC プロキシのようなツールは \`AnyNetwork\` を使う。コンパイル時にはチェーンが特定できないまま、RPC 応答に現れる任意のフィールドを受け入れる必要があるからだ。代わりに払う代償は、チェーン固有フィールドの静的型付けを失い、\`.other()\` アクセサ経由で取り出さなければならなくなること。

*アプリケーション* コードを書くときは \`Ethereum\` か \`Optimism\`（あるいは具体的な Network 実装）を選ぶ。*任意のチェーンを扱うツール* を書くときは \`AnyNetwork\` を選ぶ。

## クイズ前のリコール

スクロールせずに:

1. \`Network\` は \`Debug + Clone + Copy + Send + Sync + Sized + 'static\` を要求する。とくに \`Copy\` がある理由は? \`Clone\` だけでは得られないものを、なにが可能にするか?
2. Optimism の \`Network\` 実装は Ethereum の \`Header\` を再利用するが、\`BlockResponse\` は独自に定義する。**前者は同一でよいのに、後者が違う必要があるのはなぜか?**
3. \`TransactionBuilder<N>\` は *別の* トレイトで、\`Network::TransactionRequest\` のメソッドではない。この分離があることで、どんなコードが書けるようになるか?
4. \`Ethereum\` / \`Optimism\` のような具体的な実装ではなく、\`AnyNetwork\` を使うべきなのはどんなときか?

次のレッスンはクイズ。答えが曖昧なら、今のうちにリコールに取り組む。
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

組み立てとウォークスルーにまたがる設計判断を問う 4 問。ほかの Advanced クイズと同じルール: **クイズはうなずきでは通せない。**

2 問以上落としたら、ドリルへ進む前に *\`Network\` トレイトをステップで組み立てる* に戻ること。`,
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
                  title: 'ドリル: Ethereum *と* Optimism で動く N 上ジェネリックなコードを書く',
                  slug: 'alloy-network-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 8,
                  duration: 12,
                  xpReward: 25,
                  content: `# ドリル: Ethereum *と* Optimism で動く N 上ジェネリックなコードを書く

読むだけではリハーサル。**手を動かすことで記憶になる。** このドリルでは、「\`Network\` が型レベル辞書だと読んだ」段階から、「チェーンごとのコードを書かずに、Ethereum でも Optimism でも動く 1 つの関数を書き上げた」段階まで進みます。

本番での見返り: ブロックエクスプローラ、インデクサ、MEV ボット — 複数の EVM 互換チェーンをサポートしたいツールはすべて、中核ロジックを一度だけ \`N: Network\` 上ジェネリックに書きます。今回はその実演をします。

## セットアップ

ターミナルを 2 つ:

**ターミナル 1 — Anvil（ローカル Ethereum）:**

\`\`\`bash
anvil
\`\`\`

(Foundry を未インストールなら: \`curl -L https://foundry.paradigm.xyz | bash && foundryup\`。)

**ターミナル 2 — プロジェクト:**

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

(現行バージョンに pin する。\`op-alloy\` の正確なクレート名はリリースをまたいで動くことがある — crates.io で現在のパッケージングを確認すること。)

## ドリル 1 — op-alloy の \`Network\` 実装を読む

コードを書く前に、ウォークスルーで述べた主張を実ソースで裏取りする。

> 🔍 **op-alloy の \`impl Network for Optimism\` ブロックを探す**。パスは時期により異なる — \`crates/network/src/lib.rs\` などをあたる。

各関連型の右辺（RHS）を読む:

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

> 🛑 **問い（スクロール前に書き留める）:** 実コードに照らして表を検証する。**Ethereum と違うスロットはいくつあるか?** 10 中およそ 7〜8 のはず。その正確な数が、Optimism のチェーン固有な形がどこに住むかを教えてくれる — そしてそこは、まさに一貫性の性質がオーバーライドを強いる場所だ。

違いがない 2 スロット（\`Header\` と \`HeaderResponse\`）は、両チェーンで内容的に同一なデータ。tx、レシート、ブロックペイロードが絡む箇所はどこでも、tx リストの一貫性がオーバーライドを強制する。

## ドリル 2 — N 上ジェネリックなブロックサマリを書く

\`src/main.rs\` で、*任意の* チェーンのブロックを取得しサマリ文字列を生成する関数を書く。関数は \`N: Network\` 上ジェネリック:

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

(メソッド名は現行 alloy に近づけた目安。正確な \`HeaderResponse\` / \`BlockResponse\` トレイトメソッドは IDE が表示してくれる。要点は **\`block.header()\` も \`header.number()\` も、\`N\` に依らずジェネリックに動く** ということ。)

> 🛑 **予測。** main を書く前に問いたい: この関数は \`&P: Provider<N>\` を取り、\`N: Network\` でジェネリック。**Ethereum と Optimism で呼び出し側はどう見えるか — 同じコードか、別物か?**

同じコード、型パラメータだけが違う。呼び出し側は \`N\` を \`Ethereum\` か \`op_alloy::network::Optimism\` のいずれかに具体化する。関数本体は変わらない。

## ドリル 3 — Ethereum（Anvil）に対して実行

main を追加する:

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

実行: \`cargo run\`。こんな出力になるはず:

\`\`\`
ETH: block 0 on chain — hash=0x...
\`\`\`

(Anvil はブロック 0 から始まる。もっと高い番号が欲しければ \`anvil_mine\` で採掘するが、本ドリルには不要。)

## ドリル 4 — 同じ関数を op-mainnet（Optimism）に対して

\`main\` に Optimism 呼び出しを追加する:

\`\`\`rust
use op_alloy::network::Optimism;

// ... Ethereum 呼び出しの後 ...

let op_provider = ProviderBuilder::<_, _, Optimism>::default()
    .on_http("https://mainnet.optimism.io".parse()?);
let s = block_summary::<Optimism, _>(&op_provider, BlockId::latest()).await?;
println!(" OP: {s}");
\`\`\`

(非 Ethereum ネットワーク向けの \`ProviderBuilder\` 構文は若干異なる場合がある; op-alloy のサンプルを参照すること。構造上のポイントは「同じ関数、違う \`N\`」だ。)

再度実行する。ブロックサマリが 2 件見えるはず — 1 つは Anvil（ブロック 0 など）、もう 1 つは op-mainnet（実際のブロック番号、執筆時点で 1.3 億近辺）。

> 🔧 **同じ関数本体から両方の出力が出た。** これが型レベル辞書の見返り: \`block_summary\` は 1 度だけ書かれ、2 種類の \`N\` パラメータで具体化され、コンパイラはチェーンごとに適切な型に対して動く 2 つの特殊化コピーを出力する。

## ドリル 5 — 理解度チェック: 混ぜると何が起きるか

次を試す（**コンパイルしないはず**）:

\`\`\`rust
let eth_block = eth_provider.get_block(BlockId::latest()).await?;
let s = block_summary::<Optimism, _>(&eth_provider, BlockId::latest()).await?;
\`\`\`

> 🛑 **実行前にエラーを予測する。** \`block_summary\` は \`N: Network\` でパラメータ化され、プロバイダは \`Provider<N>\` でなければならない。\`eth_provider\` は \`Provider<Ethereum>\` だ。**コンパイラは何を拒否するか?**

コンパイラは 2 つ目の呼び出しを拒否する。\`eth_provider\` の関連型が \`Optimism\` のものと一致しないからだ。エラーは「expected \`Optimism::TransactionRequest\`, found \`Ethereum::TransactionRequest\`」のような表現になるはず。

これがコンパイル時にあなたを守ってくれる一貫性の性質。**Ethereum 型の応答を、誤って Optimism 型のコードへ流し込めない。** これが組み立てステップ 4 で「関連型 10 個 > 素のジェネリックパラメータ 10 個」だった理由だ。

## レッスン末のリコール

スクロールせずに、自分の言葉で:

1. \`block_summary\` は関数本体ひとつ。**Ethereum と Optimism 両方で具体化された場合、コンパイラはいくつの特殊化コピーを出力するか?** それがなぜ性能上重要か?
2. \`Header\` は Ethereum と Optimism で再利用されるが、\`BlockResponse\` は別物。**ドリル 1 の表は、*どんな種類のデータ* がオーバーライドを強制し、どんな種類が共有を許すかについて何を明らかにしたか?**
3. コンパイラは \`block_summary::<Optimism>(&eth_provider, ...)\` を拒否する。経路を追う: どのトレイト境界に違反し、どの関連型の不一致がエラーを生むのか?
4. 3 つ目のチェーンとして Polygon zkEVM を足したい場合、何を書くか?（ヒント: 新しい \`struct PolygonZkEvm; impl Network for PolygonZkEvm { ... }\` を書く。）

このドリルを終えた時点で、本番のインデクサやエクスプローラが投入しているのと同じ形のマルチチェーンツール — \`N: Network\` 上ジェネリックな中核関数 1 つを、コンパイル時にチェーンごとに特殊化させる形 — を投入したことになる。**次のチェーン: \`Signer\` モデル — alloy が署名、ガス、nonce の充填を層状の Provider に合成する仕組み。**`,
                },
                {
                  title: '\`Signer\` トレイトをステップごとに組み立てる',
                  slug: 'alloy-signer-buildup-ja',
                  type: 'CONTENT',
                  sortOrder: 9,
                  duration: 10,
                  xpReward: 25,
                  content: `# \`Signer\` トレイトをステップごとに組み立てる

MEV サーチャーは AWS KMS の鍵で署名する（クラウド鍵 — 秘密鍵は AWS の外に出ない）。トレジャリーのオペレータは Ledger で署名する（ハードウェアウォレット — 鍵は USB デバイス上にあり、毎回ボタン押下が要る）。テストスイートはプロセス内の生 secp256k1 バイトで署名する。**同じ alloy のアプリケーションコードが、この 3 つすべてを駆動できなければならない。** これが \`Signer\` トレイトの形を決めている制約だ。

本チェーンでは、それを可能にする抽象を組み立てる: \`Signer\` トレイト、チェーン固有版の \`TxSigner<N>\`、async / sync の分離、そして Provider ドリルで使った \`ProviderBuilder\` に署名を結びつける \`WalletFiller\`。

このレッスンを終える頃には、次のピース一式を組み立てたことになる:

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

トレイトは 3 つ。それぞれが、近道をしようとすると遭遇する具体的な失敗モードに対して存在理由を稼いでいる。

> 📂 **別タブで \`alloy-rs/alloy/crates/signer\` を開く。**

## ステップ 0 — 素朴な sign 関数

なにも考えずに書けば、署名は 1 つの自由関数になるだろう:

\`\`\`rust
fn sign_tx(privkey: B256, mut tx: TypedTransaction) -> Result<TxEnvelope> {
    let hash = tx.signature_hash();
    let sig = secp256k1_sign(privkey, hash)?;
    Ok(tx.with_signature(sig))
}
\`\`\`

関数。\`B256\` の秘密鍵がハードコード。\`TypedTransaction\`（Ethereum 型）がハードコード。\`secp256k1_sign\`（プロセス内、sync、I/O なし）もハードコード。

> 🛑 **予測。** スクロールせずに: この素朴な設計が破綻する本番シナリオを 3 つ挙げる。（ヒント: それぞれ *別カテゴリ* の署名 — どれもプロセス内に生秘密鍵を持っていない。）

3 つ:

1. **AWS KMS / Cloud HSM。** 秘密鍵は AWS の外に出ない。署名はリモートサービスへの *async なネットワーク呼び出し* になる。関数は署名を返すだけで、呼び出し側は鍵を保持しない。
2. **ハードウェアウォレット（Ledger、Trezor）。** 鍵はデバイス上。署名は人間のボタン押下を待つ *async な USB / IPC* 呼び出し。
3. **マルチチェーン。** Optimism の \`UnsignedTx\` は Ethereum の \`TypedTransaction\` ではなく \`OpTypedTransaction\`（deposit バリアントを含む）。1 つの型をハードコードすると、ほかのチェーンでは動かない。

さらに横断的な 4 つ目: **署名はいつでも tx 署名とは限らない**。\`personal_sign\`（EIP-191 プレフィックス付きの \`eth_sign\`）、\`signTypedData_v4\`（EIP-712）、オフチェーンコミットメントの生ハッシュ署名 — どれも *なにかしらの* 署名能力を必要とするが、入力の種類が違う。

直しかた: **3 軸で抽象化する。** 署名者の所在（プロセス内 / クラウド / ハードウェア）、なにに署名するか（ハッシュ / メッセージ / tx）、async か sync か。各軸が独自のトレイトかトレイトメソッドを得る。

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

メソッドは 1 つ: 32 バイトハッシュを取り、署名を返す。async（クラウドとハードウェア実装が I/O できるように）。各 \`Signer\` 実装が鍵をどこに置くかを選ぶ。

これで *生ハッシュ* 署名は動く。だがユーザーはほとんどの場合 \`sign_hash\` を直接は呼ばない — もっと高水準のメソッドを使う:

- \`sign_message(b"hello")\` — EIP-191 プレフィックスを付け、ハッシュ化し、署名する
- \`sign_transaction(tx)\` — tx をエンコードし、ハッシュ化し、署名する

これらのメソッドはハッシュ化の *前に* 追加作業を行う。だから、それを追加していく。

## ステップ 2 — デフォルト実装付きの \`sign_message\` を追加

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

\`sign_message\` は EIP-191 のプレフィックス処理を行ってから \`sign_hash\` を呼ぶ *デフォルト実装* を持つ。**すべての \`Signer\` が \`sign_message\` を追加コストなしで得られる** が、独自のプレフィックスロジックを持つリモート署名者は、それをオーバーライドできる。

> 🛑 **理解度チェック。** なぜデフォルト実装にするのか — 自由関数 \`fn sign_message<S: Signer>(s: &S, msg: &[u8])\` ではいけないのか?

理由は、**デフォルト実装なら署名者側で挙動をオーバーライドできる** から。AWS KMS は、独自にプレフィクシングを行うサービスへメッセージのバイト列を転送したいかもしれない — \`AwsSigner\` 側で \`sign_message\` をオーバーライドすれば、呼び出し側のコードを変えずに済む。自由関数ではオーバーライドできない。「共通の挙動 + 実装単位のオプションカスタマイズ」が欲しいときには、デフォルト実装が正しい道具だ。

これは \`Provider\` と同じ形（Provider チェーンのステップ 4）: デフォルト実装が共通ケースを、オーバーライドがチェーン固有ケースを引き受け、すべてを 1 つのトレイトの裏でまとめる。

## ステップ 3 — Tx 署名はハッシュ署名にとどまらない

\`sign_transaction\` を考える:

\`\`\`rust
async fn sign_transaction(&self, tx: TypedTransaction) -> Result<TxEnvelope> { ... }
\`\`\`

やるべきこと:

1. tx の種別（Legacy / EIP-1559 / その他）に従ってエンコードする
2. そのエンコードをハッシュ化する（*署名ハッシュ*。*トランザクションハッシュ* とは別物）
3. ハッシュに署名する
4. 署名を取り付けて \`TxEnvelope\` を作る

ここで壁にぶつかる: **\`TypedTransaction\` は Ethereum 固有の型**。Optimism の deposit tx は \`TypedTransaction\` ではなく \`OpTypedTransaction\` だ。\`Signer\` に \`sign_transaction(&TypedTransaction)\` を持たせると、OP 用の署名者は Ethereum 専用に成り下がらない限り実装できない。

選択肢は 2 つ:

- **選択肢 A:** \`Signer\` をネットワーク上ジェネリックにする: \`sign_transaction(&N::UnsignedTx)\` を持つ \`Signer<N: Network>\`。
- **選択肢 B:** tx 署名を *別トレイト* に分け、そちらがチェーン認識を担う; \`Signer\` はチェーン非依存のままにする。

> 🛑 **予測。** alloy はどちらを選ぶか、その理由は?（ヒント — tx 署名と生ハッシュ署名のどちらをどれくらい頻繁に行うかを考える。)

Alloy は **選択肢 B** を選ぶ。\`Signer\` はシンプルに保つ（チェーン非依存、ハッシュ専用）。\`TxSigner<N>\` を tx 署名用の別トレイトにする。理由:

1. **署名操作の大部分は tx 署名ではない。** EIP-191 メッセージと EIP-712 typed data のほうが dapp ではずっと一般的だ。まれな tx ケースのために \`Signer\` 全体を \`N\` でパラメータ化すると、全署名者のシグネチャがふくらんでしまう。
2. **\`Signer\` 実装はチェーン横断で再利用できる。** \`LocalSigner\` は Ethereum か Optimism かを気にしない — ハッシュに署名するだけだ。\`N\` でタグを付けると、チェーンごとに 1 つの署名者 struct を強いることになる。
3. **Tx 署名は自然に多態的。** 1 つの署名者が \`TxSigner<Ethereum>\` と \`TxSigner<Optimism>\` をそれぞれ別のコードパスで実装できる。これらを 1 つのトレイトに束ねるとやりにくくなる。

そこで:

\`\`\`rust
#[async_trait]
pub trait TxSigner<Sig> {
    fn address(&self) -> Address;
    async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Sig>) -> Result<Sig>;
}
\`\`\`

(\`SignableTransaction\` は、各チェーンの \`UnsignedTx\` 型が実装するトレイト。\`Signer\` はチェーンの種類を知る必要はなく、与えられた \`SignableTransaction\` をどう署名するかを知っていればよい。)

## ステップ 4 — async と sync: \`SignerSync\` の分離

async は AWS や Ledger では妥当だ。しかしもっとも一般的なケース — プロセス内鍵による署名 — では、async はオーバーヘッドになる。\`sign_hash\` 呼び出しは I/O がなくても future を経由してしまう。

対処は 2 通り:

- オーバーヘッドを受け入れる: プロセス内でも全面的に \`async fn\` を使う。
- 並列の **sync** トレイトを用意し、プロセス内署名者には両方を実装させる。

Alloy は後者を採る:

\`\`\`rust
pub trait SignerSync<Sig = Signature> {
    fn sign_hash_sync(&self, hash: &B256) -> Result<Sig>;
    fn sign_message_sync(&self, message: &[u8]) -> Result<Sig> { /* デフォルト */ }
    fn chain_id_sync(&self) -> Option<ChainId>;
}
\`\`\`

\`LocalSigner\` は \`Signer\`（async）と \`SignerSync\`（sync）の両方を実装する。\`AwsSigner\` と \`LedgerSigner\` が実装するのは \`Signer\` のみ — ネットワークに縛られるため、sync では署名できない。

S 上ジェネリックなコードは、どちらの境界も要求できる: async を許容してよいコードは \`fn foo<S: Signer>\`、安価なパスが必要なコードは \`fn bar<S: SignerSync>\` と書く。

> 🛑 **理解度チェック。** なぜ \`SignerSync\` は、単に非 async の \`sign_hash\` を持つ \`Signer\` ではないのか? なぜ別トレイトなのか?

理由は、**Rust において \`async fn\` を持つトレイトと持たないトレイトは別物だから**。プロセス内署名者は両方を実装できる — sync メソッドが実作業を行い、async メソッドは互換性のためにそれを \`async\` で包むだけ。ネットワーク束縛の署名者は async トレイトしか実装できない。S 上ジェネリックなコード側で、どちらの契約を要求するかを選べばよい。1 つに統合してしまうと、全署名者が async に縛られ、sync の安価パスでの最適化が失われる。

## ステップ 5 — \`Provider\` への接続: \`WalletFiller\`

Provider チェーンを思い出してほしい: \`FillProvider<F: Filler<N>, P, N>\` を使えば、内側のプロバイダの手前にチェーン認識ロジックを積層できる。署名もそうした Filler の 1 つだ:

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

(あくまでおおよその形 — 本物の alloy では、unsigned tx の組み立てと署名にもう少し細部がある。)

これが橋渡し: \`Signer\`（あるいは \`TxSigner<N>\`）トレイトが *どう署名するか* を抽象化し、\`WalletFiller\` がリクエストフローの正しいタイミングで署名を *呼び出す* Filler 側の機構を担う。

ユーザーコード:

\`\`\`rust
let signer = PrivateKeySigner::random();
let provider = ProviderBuilder::new()
    .wallet(signer)               // WalletFiller(signer) をインストール
    .with_recommended_fillers()
    .on_http(url);

provider.send_transaction(tx).await?;  // tx は WalletFiller により署名される
\`\`\`

\`.wallet(...)\` ビルダーメソッドは Filler の組み込み口で、署名者を \`WalletFiller\` で包んで FillProvider チェーンに積む。ユーザーは \`Signer\` を直接意識せず、「ビルダーにウォレットを渡す」と考えればよい。

## ここまでに組み立てたもの

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

各ピースは存在理由を稼いでいる:

- **\`Signer\` の async**（ステップ 1）— クラウドとハードウェアの署名者に対応する
- **\`sign_message\` のデフォルト実装**（ステップ 2）— 共通の EIP-191 パスを提供しつつ、オーバーライドの口を残す
- **\`TxSigner\` を別トレイトに**（ステップ 3）— \`Signer\` をチェーン非依存に保ち、署名者を複数チェーン向けに実装可能にする
- **\`SignerSync\` を並列トレイトに**（ステップ 4）— プロセス内鍵で async のオーバーヘッドを回避; ネットワーク束縛の署名者は async のみ
- **\`WalletFiller\`**（ステップ 5）— Provider チェーンの Filler 機構を介して \`Signer\` / \`TxSigner\` を \`Provider\` のリクエストフローへつなぐ

次のレッスンでは、alloy 本体の \`Signer\` トレイト、\`PrivateKeySigner\` 実装、\`AwsSigner\` 実装、\`WalletFiller\` のソースを行単位で読みます。

## 先に進む前のリコール

スクロールせずに:

1. **\`Signer\` が async である理由は?** async が *必須* な本番署名者を 2 つ挙げる。
2. **\`TxSigner<Sig>\` が \`Signer\` から分離された別トレイトである理由は?** tx 署名が単に \`Signer\` のメソッドだったら、なにが壊れるか?
3. **\`SignerSync\` が存在する理由は?** プロセス内署名者が \`Signer\` と並べて \`SignerSync\` も実装することで、なにが得られるか?
4. ユーザーコードの \`ProviderBuilder.wallet(signer)\` は、\`WalletFiller\` や \`Filler\` を直接は言及しない。それらは内部でどう結び付くか?

どれかの答えが揺らぐなら、戻って読み直すこと。次のレッスンでは、alloy 本体の \`Signer\` ソースと具体実装を読みます。
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

3 トレイトへの分割（\`Signer\` / \`TxSigner\` / \`SignerSync\`）と \`WalletFiller\` の橋渡しを動機づけてきました。今度は実ソースを読みます — 全境界付きのトレイトヘッダ、プロセス内の \`PrivateKeySigner\`、クラウドの \`AwsSigner\`（AWS が返してくれないリカバリバイトを総当たりで復元しなければならない箇所）、\`SignableTransaction\` の接着剤、\`WalletFiller\` の FillProvider チェーンへの組み込み — そのすべて。

> 📂 **タブで 4 つのファイルを開く:**
> - \`crates/signer/src/signer.rs\` — \`Signer\` と \`SignerSync\` トレイト
> - \`crates/signer-local/src/private_key.rs\` — \`PrivateKeySigner\` の実装
> - \`crates/signer-aws/src/signer.rs\` — \`AwsSigner\` の実装
> - \`crates/provider/src/fillers/wallet.rs\` — \`WalletFiller\`
>
> パスはバージョンごとに動くが、構造的な形は変わらない。

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

押さえるべき点が 3 つ:

### \`Sig = Signature\` — デフォルト付きのジェネリックパラメータ

組み立てでは \`Signer<Sig = Signature>\` と書いた。\`Sig\` というパラメータがあるのは、すべてのチェーンが ECDSA secp256k1 署名を使うわけではないからだ（Ethereum の曲線 — 65 バイトの (r, s, v) タプル）。L2 のなかには BLS（集約に向く）を使うものや、ed25519（Solana の曲線）を使うもの、耐量子計算スキームを使うものもある。\`Signature\`（alloy の secp256k1 型）をデフォルトにすれば、\`impl Signer\` を書くと暗黙に \`impl Signer<Signature>\` になる — 一般ケースの取り回しを保ちつつ、別スキームを差し込める。

> 🛑 **予測。** なぜ \`Sig\` は *関連型* ではなく、*トレイトのジェネリックパラメータ* なのか?（\`Network::TxEnvelope\` のように関連型にせず。)

理由は、**同じ署名者が、操作によって異なる署名型を生成しうる** から。ECDSA 鍵を保持する 1 つの \`PrivateKeySigner\` は \`Signer<Signature>\`（ハッシュ署名用）と \`TxSigner<Signature>\`（tx 署名用）の両方を実装できる — あるいは必要なら、生バイト出力のバリアント用に \`Signer<RawBytes>\` を実装することもできる。ジェネリックパラメータ ＝ 「異なる \`Sig\` でこのトレイトを複数回実装してよい」。関連型 ＝ 「実装ごとに \`Sig\` をひとつだけ確定する」。署名者にはジェネリックパラメータが正しい形だ。

### \`auto_impl(&mut, Box, Arc)\`

ラッパーは 3 種類 — \`Provider\` の 5 種（\`&, &mut, Box, Rc, Arc\`）より狭い。

省略は意図的:

- **\`&\` なし** — \`set_chain_id(&mut self, ...)\` は変更を伴うメソッド。\`&self\` 越しではトレイトを通してコンパイルできない。(\`Provider\` には \`&mut self\` メソッドがないため、より広いリストを持てる。)
- **\`Rc\` なし** — \`Signer\` は \`Send + Sync\` を要求するが、\`Rc<T>\` は参照カウントが原子的でないため \`!Send\` かつ \`!Sync\`。スレッドセーフな \`Arc<T>\` だけが残る。

2 つの省略、それぞれ別の理由。**auto_impl のリストは、トレイト契約に対する厳密な宣言。**

### \`Send + Sync\` スーパートレイト

\`Provider\` が要求するのと同じ理由から: 本番コードは署名者を \`Arc<S>\` で包んでタスク間で共有する。これらの境界があるおかげで、\`Arc<dyn Signer>\` や \`Arc<S: Signer>\` がそのまま自然な共有プリミティブとして機能する。

## \`PrivateKeySigner\` — プロセス内の実装

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

フィールドは 3 つ。\`SigningKey\` が実際の秘密鍵。\`address\` は *構築時にキャッシュ* される（公開鍵からの導出は非自明 — 非圧縮 pubkey を keccak し最後 20 バイトを取る — ので 1 度だけ計算する）。\`chain_id\` は per-signer であって per-call ではない。多くのユーザーは 1 つの署名者を 1 つのチェーンに固定したいからだ。

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

5 つのコンストラクタが現実的な鍵ソースを網羅する: テスト用の random、保存済みの鍵用の from-bytes、hex 用の from-string、すでに \`SigningKey\` を持っている呼び出し側のための直接構築。**構築まわりは、\`PrivateKeySigner\` がネットワーク束縛の署名者と振る舞いが分かれる唯一の局面** — 後者には独自の接続 / 設定フローがある。

### \`Signer\` と \`SignerSync\` の両方を実装

\`PrivateKeySigner\` は async の \`Signer\` トレイトと sync の \`SignerSync\` トレイトを *両方* 実装する。S 上ジェネリックなコードからは、どちらでも使える:

\`\`\`rust
fn high_throughput_path<S: SignerSync>(signer: &S) { /* sync、future オーバーヘッドなし */ }
fn cloud_compatible_path<S: Signer>(signer: &S) { /* async、AWS でも動く */ }
\`\`\`

\`PrivateKeySigner\` の sync パスが実際の署名処理を行い、async パスは \`async\` ブロックの中で sync パスを呼び出すだけの薄いラッパー。**async 実装は sync の上に安価に合成できるが、逆は成り立たない** — これが、より少ない実装しか満たせない \`SignerSync\` が別トレイトとして存在する理由だ。

> 🔍 **リポジトリで確認。** \`alloy-signer-local/src/private_key.rs\` を開く。\`impl Signer for PrivateKeySigner\` と \`impl SignerSync for PrivateKeySigner\` の両方が存在することを確かめる。async の \`sign_hash\` 本体を読む — ただの \`async { self.sign_hash_sync(...) }\` になっているか?

## \`AwsSigner\` — クラウドの実装

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

(あくまでおおよその形 — 本物の alloy は DER デコードと recovery-id 復元のあたりがもっと細かい。)

注目すべき点は 3 つ:

1. **AWS は DER エンコードされた署名を返す**。alloy が使う (r, s, v) タプル形式ではない。デコードして変換するのは署名者側の責務。
2. **Recovery ID は AWS が返してくれない。** AWS は r と s だけを返す。\`v\`（リカバリバイト）は、両方の可能性を試してキャッシュ済みの \`address\` を再現するほうを選ぶ、という形で *復元* するしかない。**AWS への呼び出し 1 回 → アドレス導出を 2 通り試す → 一致したほうの署名を採用。**
3. **\`SignerSync\` の実装はない。** AWS 呼び出しはネットワーク越しなので sync パスが存在しない。sync を要求する S 上ジェネリックなコードは、AWS 署名者が使えないことを受け入れなければならない。

> 🛑 **理解度チェック。** \`PrivateKeySigner\` は構築時に \`address\` をキャッシュする（pubkey からの一発導出）。\`AwsSigner\` は \`describe_key\` を一度呼んでキャッシュする。**なぜすべての署名者がアドレスをキャッシュするのか? \`address()\` が毎回ネットワーク呼び出しだったら、なにが壊れるか?**

理由は、\`address()\` が *すべてのトランザクション* で呼ばれ、しばしば *tx ごとに複数回* 呼ばれるから（追跡、ロギング、署名適格性チェック、コールフレームの構築などのため）。これがネットワーク呼び出しだったら、すべてのトランザクションが *誰の鍵で署名したかを知るためだけに* AWS への往復レイテンシを被ることになる。構築時のキャッシュは、一度きりのセットアップコストと、ほぼゼロの per-call コストを交換する取引だ。

## \`SignableTransaction\` — チェーン認識を担う接着剤

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

各チェーンの \`UnsignedTx\` 型（Ethereum の \`alloy_consensus::TypedTransaction\`、Optimism の \`OpTypedTransaction\`）が \`SignableTransaction<Signature>\` を実装する。これによって、\`TxSigner::sign_transaction\` はチェーンの種類を知らずに動く対象を得る:

\`\`\`rust
async fn sign_transaction(&self, tx: &mut dyn SignableTransaction<Signature>) -> Result<Signature> {
    let hash = tx.signature_hash();
    self.sign_hash(&hash).await
}
\`\`\`

\`TxSigner\` は、対象がどんな種類の tx かを知らない。トレイトオブジェクトに対して \`signature_hash()\` を呼び、32 バイトのハッシュを取り、それに署名する — それだけ。**SignableTransaction の橋を介して、チェーン非依存の署名者とチェーン固有の UnsignedTx が結びつく。**

> 🔍 **リポジトリで確認。** \`alloy_consensus::TypedTransaction\` を開く。\`impl SignableTransaction<Signature> for TypedTransaction\` を見つける。\`signature_hash\` が tx 型でディスパッチすることを確かめる（Legacy は RLP エンコードした tx を使う、EIP-1559 は \`0x02 || rlp(tx)\` の keccak を使う、など） — エンコードのルールは実装の *内側* にあり、署名者からは見えない。

## \`WalletFiller\` — Provider 機構への橋渡し

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

(本物の alloy コードは、ここでは省いた他のトレイト — \`NetworkWallet<N>\`、\`TxFiller<N>\`、\`Sendable\` — も絡む。構造上の要点は: \`WalletFiller\` はウォレット型 \`W\` 上ジェネリックで、ネットワーク \`N\` でパラメータ化され、Provider チェーンの nonce / gas / chain-id filler と同じ \`TxFiller<N>\` トレイトを実装するということ。)

ユーザーに見えるビルダーメソッド \`.wallet(signer)\`:

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

\`.wallet(signer)\` は \`.layer(WalletFiller::new(signer))\` の糖衣。**nonce / gas / chain-id の filler と同じ合成機構を共有している。** 署名者は \`WalletFiller\` に包まれ、他の filler と並べて積まれることで、FillProvider チェーンへ統合される。

これが、ユーザーが \`WalletFiller\` を直接目にしない理由だ: 公開された API としては \`ProviderBuilder.wallet(...)\` があり、その下では Provider チェーンと同じ Filler 機構が動いている。

## \`sign_dynamic_typed_data\` — EIP-712（手短に）

補足として: alloy は EIP-712 署名（ドメインセパレータ付きの typed data。dapps のオフチェーン注文署名で多用される）のために、別途 \`SignerSync::sign_dynamic_typed_data(typed_data: &TypedData) -> Result<Signature>\` を用意している。流れは:

1. EIP-712 ハッシュを計算する（ドメインハッシュ + struct ハッシュに \`0x1901\` プレフィックスを付けたもの）
2. その結果で \`sign_hash\` を呼ぶ

\`sign_message\` と同じデフォルト実装のパターン: 低レベルの \`sign_hash\` が実作業を行い、高レベルのメソッドが EIP-712 プレフィクシングを処理して下を呼ぶ。**1 つのトレイト、複数の入力型、最終的にはすべて同じ低レベル署名処理にルーティングされる。**

## クイズ前のリコール

スクロールせずに:

1. \`Signer\` の \`auto_impl\` は \`(&mut, Box, Arc)\`。\`&\` がなく、\`Rc\` もないのはなぜか?
2. \`PrivateKeySigner\` は構築時に \`address\` をキャッシュする。経路を追う: \`AwsSigner\` の \`address()\` がキャッシュなしだったらどう振る舞うか?
3. \`AwsSigner\` は KMS から \`(r, s)\` しか得られない。\`PrivateKeySigner::sign_hash\` では不要な、\`AwsSigner::sign_hash\` で必要になる recovery-id 関連の処理はなにか?
4. ユーザーは \`ProviderBuilder.wallet(signer)\` を呼ぶ。\`WalletFiller\` の機構を通って結果のプロバイダがどんな層構造になるかを追う。署名者の \`sign_transaction\` は実際のところどこで呼ばれるか?

次のレッスンはクイズ。どれかの答えが揺らぐなら、今のうちにリコールに取り組む。
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

Signer の組み立てとウォークスルーにまたがる設計判断を問う 4 問。ほかの Advanced クイズと同じルール: **クイズはうなずきでは通せない。**

2 問以上落としたら、ドリルへ進む前に *\`Signer\` トレイトをステップごとに組み立てる* に戻ること。`,
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
                      explanation: "理由は 2 つが重なっている。第一に、署名操作はたいてい tx 署名ではない — 本番コードの大半は EIP-191 メッセージか EIP-712 typed data に署名する。\`Signer\` に tx 署名を載せると、まれなケースのために全署名者をパラメータ化する羽目になる。第二に、\`PrivateKeySigner\` は本質的にチェーン非依存（secp256k1 鍵は Ethereum か Optimism かを気にしない）。\`Signer\` を \`N\` でタグ付けすると、\`PrivateKeySigner<Ethereum>\` と \`PrivateKeySigner<Optimism>\` を別型として要求することになり、ムダが生じる。分割によって \`Signer\` をチェーン非依存で再利用可能に保ちつつ、\`TxSigner<N>\` がチェーン固有の tx 署名能力を担う — *1 つの* \`Signer\` 実装で *複数の* チェーンに対応できる。",
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
                  title: 'ドリル: FillProvider チェーン経由でエンドツーエンドの署名済 tx を出荷',
                  slug: 'alloy-signer-drill-ja',
                  type: 'CONTENT',
                  sortOrder: 12,
                  xpReward: 25,
                  duration: 12,
                  content: `# ドリル: FillProvider チェーン経由でエンドツーエンドの署名済 tx を出荷

読むだけではリハーサル。**手を動かすことで記憶になる。** このドリルでは、「\`Signer\` と \`WalletFiller\` を読んだ」段階から、「実際の署名者を実際の ProviderBuilder に配線し、Anvil に対して署名済みトランザクションを送り、FillProvider チェーンが nonce / gas / chain-id / 署名をスタック順に処理するのを観察した」段階まで進みます。

これは Provider、Network、Signer 各チェーンの **総決算**: 3 つのトレイトファミリすべてが 1 つの実行可能プログラムに合流します。

## セットアップ

ターミナルを 2 つ:

**ターミナル 1 — Anvil:**

\`\`\`bash
anvil
\`\`\`

(Anvil は起動時に資金が振り込まれた 10 個のアカウントを表示する; 最初の 1 つを使う。)

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

## ドリル 1 — \`PrivateKeySigner\` でハッシュに直接署名する

Provider チェーンをまるごと組む前に、最低レベルの \`Signer::sign_hash\` インタフェースを叩いてみる。署名から署名者のアドレスを復元することで動作確認する。

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

\`cargo run\`。署名者のアドレスに続き、それと一致する復元アドレスが表示されるはず。

> 🛑 **問い（書き留めてから先に進む）:** \`signer.sign_hash(&hash)\` は \`Result<Signature>\` を返す。\`Signature\` は alloy の \`(r, s, v)\` タプル。**署名者は \`v\`（リカバリバイト）を計算するために、内部でなにをしなければならなかったか?**

\`PrivateKeySigner\` では、\`v\` は \`k256\` の ECDSA recoverable 署名プリミティブから直接得られる — secp256k1 の sign-recoverable 関数が署名の一部として返してくれる。**追加の処理は不要。** だから \`PrivateKeySigner::sign_hash\` の暗号処理は実質 1 行: \`(r, s, v) = k256::sign_recoverable(privkey, hash)\`。

\`AwsSigner\` では、\`v\` は *自前で復元* しなければならない（v=0 と v=1 を試し、どちらがキャッシュ済みの \`address\` を再現するか見る）。これがウォークスルーで触れたクラウド署名のコスト。

## ドリル 2 — 署名者を \`ProviderBuilder\` に配線して実 tx を送る

完全な FillProvider チェーンを動かしてみる。\`ProviderBuilder.wallet(signer)\` で署名者を組み込み、さらに \`with_recommended_fillers()\` で nonce / gas / chain-id の filler を加える。

\`main.rs\` に追加（ドリル 1 のコードの後）:

\`\`\`rust
use alloy::providers::{Provider, ProviderBuilder};
use alloy::primitives::{Address, U256, address};

// ドリル 2: FillProvider 経由で実際に署名済みの tx を送る
// Anvil が起動時に表示する資金入りアカウントの 1 つを使う（秘密鍵は起動ログから取得）
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

(\`.with_to(...)\` や \`.with_value(...)\` は Network チェーン由来の \`TransactionBuilder<N>\` トレイトのメソッド。すべてがどう組み合わさっているかに注目: Provider チェーンの \`ProviderBuilder\`、Network チェーンの \`TransactionBuilder\`、Signer チェーンの \`.wallet()\` — 3 つのチェーンが、1 つの実行可能プログラムに集約されている。)

\`cargo run\` するとこんな出力になるはず:

\`\`\`
signer address: 0x... (ランダム)
recovered: 0x... (matches: true)
funded sender: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
tx hash: 0x...
status: true
recipient balance: 1000000000000000000
\`\`\`

受信者の残高はちょうど 1 ETH（1_000_000_000_000_000_000 wei）。**署名済みトランザクションが着地した; FillProvider チェーンが仕事をした。**

## ドリル 3 — 実行された filler を追う

\`with_recommended_fillers()\` と \`.wallet(signer)\` の呼び出しによって、4 つの \`TxFiller\` がチェーンに積み重ねられた。\`send_transaction\` が実際に送信を始める前に、各 filler が出ていく \`TransactionRequest\` に対してスタック順に実行されたはず。

> 🛑 **予測（スクロール前に書き留める）：** あなたの \`TransactionRequest::default().with_to(recipient).with_value(value)\` は \`to\` と \`value\` しか設定していなかった。レシートを見ると、tx には nonce、ガス上限、ガス価格（または maxFeePerGas）、chain_id、署名が乗っている。**欠けていた各フィールドについて、*どの filler* が埋め、*どんな処理* を行ったかを挙げる。**

4 つの filler と処理内容:

| Filler | 埋めたフィールド | 処理 |
| :--- | :--- | :--- |
| \`NonceFiller\` | \`nonce\` | \`eth_getTransactionCount(from, "pending")\` を呼ぶ |
| \`GasFiller\` | \`gas\`、\`gasPrice\`（legacy）または \`maxFeePerGas\` + \`maxPriorityFeePerGas\`（EIP-1559） | \`eth_estimateGas\` と \`eth_gasPrice\`（あるいは EIP-1559 では \`eth_feeHistory\`）を呼ぶ |
| \`ChainIdFiller\` | \`chainId\` | \`eth_chainId\` を 1 度呼んでキャッシュ |
| \`WalletFiller\` | \`signature\`（これが \`TxEnvelope\` となる） | リクエストから \`SignableTransaction\` を構築し、\`signer.sign_transaction()\` を呼び、署名を取り付けて署名済みエンベロープにする |

順序が重要: \`WalletFiller\` はほかの filler の *後* に走らなければならない。署名ハッシュを計算する前に nonce / gas / chain_id がそろっている必要があるからだ。**「fill → sign」の順序は譲れない。**

> 🔍 **リポジトリで確認。** \`crates/provider/src/fillers/\`（または filler が置かれている場所）を開く。\`TxFiller<N>\` トレイトがあり、\`NonceFiller\`、\`GasFiller\`、\`ChainIdFiller\`、\`WalletFiller\` のすべてが \`impl TxFiller<N>\` していることを確かめる。**これらは差し替え可能で、順序は \`with_recommended_fillers\` と \`.wallet()\` がどう挿入するかで決まる。**

## ドリル 4 — 理解度チェック: filler を外して失敗を観察する

コードを変更して \`with_recommended_fillers()\` を *外す*:

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

> 🛑 **実行前に予測する。** どんなエラーが出ると思うか? ヒント — WalletFiller は引き続き動く（これは wallet が指定されているから）が、それ以外は欠落している。

どの検証が最初に発火するかによって、\`"Error: missing nonce"\` か \`"Error: missing gas"\` / \`"missing maxFeePerGas"\` のようなメッセージが見えるはず。**このエラーは、filler が実際に作業をしている証拠** — filler がないとリクエストは不完全。元に戻すとプログラムは動く。

> 🔍 **もう 1 通りバリエーションを試す。** nonce filler だけを追加し、次に何が足りないかを確かめる。続いて gas を追加し、次に何が足りないかを観察する。**各 filler がギャップを 1 つずつ埋めていく。**

## ドリル 5 — 最終的な Provider 型を観察（任意）

積層された FillProvider 型を *目で見たい* なら、次を追加して \`cargo\` に文句を言わせる:

\`\`\`rust
let _: () = provider;  // 型不一致エラーが実型を表示する
\`\`\`

コンパイラはこんな感じを表示するはず:

\`\`\`
expected (), found
  FillProvider<JoinFill<JoinFill<JoinFill<JoinFill<Identity, GasFiller>, NonceFiller>, ChainIdFiller>, WalletFiller<EthereumWallet>>, RootProvider, Ethereum>
\`\`\`

(正確な型名は alloy 内部の命名による。) 左から右に読む: \`FillProvider\` が内側のプロバイダをラップし、\`JoinFill<...>\` のチェーンが 4 つの filler のスタックを成す。Wallet がもっとも外側に来て、\`send_transaction\` 実行時には最後に適用される。

**これは Provider チェーンの「正しい塔を組む」レッスンの、型レベルでの具現化** — 型自身が filler のスタック順をエンコードしている。

## レッスン末のリコール

スクロールせずに、自分の言葉で:

1. \`PrivateKeySigner\` は recovery-id の処理を必要としないが、\`AwsSigner\` は必要とする。**アーキテクチャ上の理由はなにか?** それぞれで \`v\` はどこから出てくるか?
2. ドリル 2 の流れを追う: \`provider.send_transaction(req)\` が呼ばれてから、ネットワークが署名済みエンベロープを目にするまでのあいだ、**どの filler がどの順で動き、どんな RPC 呼び出しを発したか?**
3. **なぜ \`WalletFiller\` は filler チェーンの *最後* なのか?** \`NonceFiller\` より前に走らせると、なにが壊れるか?
4. プロバイダの型はコンパイラ表示上、深く入れ子になった \`FillProvider<JoinFill<JoinFill<...>>>\` になる。**この入れ子の深さは、実行時の何に対応するか?**

どれかの答えが揺らぐなら、レッスンはあなたの手中に収まっていない。ドリルをやり直すか、組み立てを読み直すこと。

このドリルを終えた時点で、*完全な Provider / Network / Signer のトリオを通した署名済みトランザクション* を投入したことになる — dapp、MEV ボット、インデクサが本番で使っているのと同じ形だ。**Provider、Network、Signer のチェーンが完走。** 次はコースの最終クイズ。`,
                },
                {
                  title: 'Inside Alloy 最終クイズ',
                  slug: 'alloy-advanced-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 13,
                  duration: 8,
                  xpReward: 25,
                  content: `# Inside Alloy 最終クイズ

3 つのチェーンを横断する最終チェック: \`Provider\`、\`Network\`、\`Signer\`。

3 問。同じルール: **クイズはうなずきでは通せない。** 2 問落としたら、Inside Alloy を終えたと言う前に、該当チェーンの組み立てを読み直すこと。`,
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
