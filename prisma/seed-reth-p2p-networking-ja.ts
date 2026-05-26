import { PrismaClient } from '@prisma/client';

export async function seedRethP2PNetworkingJA(prisma: PrismaClient) {
  const tags = ['reth', 'p2p', 'devp2p', 'libp2p', 'gossip', 'peer-scoring', 'networking', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-p2p-networking-ja',
      title: 'P2P ネットワーキング内部 — devp2p からカスタム gossip まで',
      description:
        'すべての blockchain が依存するが少ないエンジニアしか理解しないネットワーク層。devp2p vs libp2p、peer discovery (Kademlia、ENR)、RLPx 暗号化、transaction gossip、eth/68 サブプロトコル、reth の network crate を読み、peer scoring、MEV / private orderflow / sequencer coordination 用のカスタム gossip 動作を構築。',
      difficulty: 'ADVANCED',
      duration: 110,
      xpReward: 350,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 330,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'P2P ネットワーキング',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'P2P の基礎 — devp2p、libp2p、peer discovery',
                  slug: 'p2p-fundamentals-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# P2P の基礎 — devp2p、libp2p、peer discovery

新しい reth ノードを起動した直後は、peer ゼロ、ブロックゼロ、state ゼロ。それが数秒後にはどこかから header をダウンロードしている — しかし *peer はどこから来たのか*? まだネットワーク上にいないノードが、そのネットワークに peer を尋ねられるはずがない。この鶏と卵の状況こそが **bootstrapping 問題** であり、P2P 層が他の何かを始める前に真っ先に解決しなければならない課題です。

P2P 層は壊れるまで姿を見せません。sync が止まる、gossip が tx を取りこぼす、peer scoring がノードをネットワークから締め出す — そうなって初めて、その下で何が動いているのかを知る必要に迫られます。Ethereum では **devp2p** — Ethereum 専用に設計された peer-to-peer スタックがこの層を担います。他の chain は **libp2p** (モジュラーで複数チェーンに対応する代替実装)、もしくは独自実装を採用しています。

> 🛑 **スクロール前に予測。** Reth ノードをゼロから sync させる。**最初に見つかるのは peer か、それともブロックか?** 既知の peer が一つもない状態で、どうやって peer を見つけるのか?

## 1. 2 層構造

どの P2P スタックも、その役割は大きく 2 つに分かれます:

| 層 | 役割 | Ethereum でのプロトコル |
| :--- | :--- | :--- |
| **Discovery** | 「Peer を見つける」 | discv4 / discv5 (Kademlia DHT) |
| **Transport** | 「Peer と話す」 | RLPx (暗号化 TCP) |

Discovery 層が抱えるのが、冒頭の bootstrapping 問題 — peer を見つけるには peer が必要、というジレンマです。答えは **bootnode**、すなわち chainspec にハードコードされた既知の IP。まずはそこに 1 つ接続し、そこから他の peer を教えてもらい、あとは DHT が引き継ぎます。

## 2. devp2p — Ethereum のプロトコル

[devp2p](https://github.com/ethereum/devp2p) は、Ethereum ノードが話すプロトコルです。Ethereum 専用 (マルチチェーン対応ではない) で、次の 3 つの要素を束ねた構成になっています:

- **discv5**: Kademlia DHT 経由の peer discovery (ノードを探すための分散ハッシュテーブル)
- **RLPx**: 暗号化・認証付きの TCP transport
- **eth/68** (現行サブプロトコル): ブロック + transaction の gossip

Reth ノードを走らせると、これらすべてが同時に動き出します:

\`\`\`mermaid
flowchart LR
    Boot["Bootnode"] -->|seed peer list| You["自 Reth ノード"]
    You -->|discv5 ping| Peer1["Peer 1"]
    You -->|discv5 ping| Peer2["Peer 2"]
    Peer1 -->|RLPx ハンドシェイク| You
    You -->|eth/68: ブロック、txs| Peer1
    You -->|eth/68: ブロック、txs| Peer2
\`\`\`

## 3. discv5 — Kademlia 経由の peer discovery

1 つの bootnode から始めて、数百万ノード規模のグローバルネットワークで「peer を見つける」処理をどうスケールさせるのか? その答えが Kademlia です。

Kademlia は **分散ハッシュテーブル (DHT)** — 各ノードがディレクトリのごく一部だけを持ち、残りを持つノードへ query をルーティングする構造です。各 Ethereum ノードは 256 bit の ID を持ち (公開鍵から導出されます)、「ターゲット ID に近い」peer を探すときは、既知の peer に問い合わせ、相手が知る最も近い peer を返してもらい、それに対してまた問い合わせ — という再帰的な lookup を繰り返します。計算量は O(log N) ホップ。

Ethereum 向けには次の仕組みが乗っています:
- 各 peer が **ENR (Ethereum Node Record)** を公開する — ID、IP、port、capability を含む
- Discovery query は ENR を返す
- Bootnode は chainspec に書かれた well-known な開始点

> 🛑 **理解度チェック。** 「Kademlia は最も近い peer を見つける」とよく言われる。**しかし任意の peer が欲しいだけなのに、なぜ「最も近い」が重要なのか?** 答えが「routing のため」だけで止まるなら、ここを読み直しましょう。

Kademlia の「近さ」はノード ID 上の XOR distance であり、純粋にトポロジカルなもので、地理的な意味は一切ありません。要点は、ID 空間で近いノード同士は効率的にお互いを見つけられるという性質です。これがあるからこそ、数百万規模のネットワークでも任意の peer を探すことが現実的な計算量に収まります。

## 4. RLPx — Transport 層

Peer のアドレスを手に入れたら、実際に話すには暗号化チャネルが必要です。それを担うのが RLPx です。

- **Handshake**: ECDH 鍵交換 + 署名検証
- **Encryption**: 方向ごとの鍵を用いた AES-CTR
- **Framing**: 長さ prefix 付きの RLP エンコードメッセージ (RLP = Recursive Length Prefix、Ethereum の wire encoding)

RLPx は **Ethereum 版の TLS** と捉えるとよいでしょう — 暗号化され、認証され、順序保証のあるバイトストリームです。ではなぜ TLS をそのまま使わないのか? 一つは 2015 年以前の歴史的経緯、もう一つは TLS が合わない微妙な要件があるためです。すなわち、peer ID が *そのまま* 公開鍵であり、中央 CA を一切持たないという設計です。

## 5. eth/68 — サブプロトコル

RLPx が安全なチャネルを提供し、その上を流れるのが **eth/68** — 現行の Ethereum サブプロトコルです。主なメッセージは次のとおり:

| メッセージ | 目的 |
| :--- | :--- |
| Status | Handshake — fork バージョン、chain ID、head |
| NewBlock | 新ブロックのアナウンス |
| BlockBodies | ブロックボディの要求 / 応答 |
| NewPooledTransactionHashes | Pending tx (hash のみ) のアナウンス |
| PooledTransactions | フルな tx ボディの要求 |
| Receipts | Receipt の要求 / 応答 |

注目すべき点として、eth/68 では transaction が **まず hash でアナウンスされ**、peer は手元に持っていない場合だけフルなボディを要求します。これによって「全ノードがすべての tx を再ブロードキャストする」という増幅問題を根本から潰しています。

## 6. libp2p — もう一つの選択肢

devp2p が Ethereum 専用に束ねられたスタックだとすれば、[libp2p](https://github.com/libp2p/) は束ねを解いたマルチチェーン版と言えます。採用例は:
- Polkadot (libp2p ベース)
- IPFS (libp2p の発祥地)
- Solana (transport はカスタムだが libp2p の概念を踏襲)
- その他、多くの新興 chain

libp2p は関心事を明確に分離する設計です。discovery、transport (TCP / QUIC / WebRTC)、encryption (Noise — 鍵合意プロトコルのフレームワーク)、multiplexing (yamux / mplex — 一つの接続上で複数の論理ストリームを走らせる) がそれぞれ独立しており、必要なものを組み合わせて使えます。

なぜ Ethereum は libp2p を使わないのか? 答えは歴史的経緯です。devp2p が先に存在しており、後から乗り換えるのが難しいのです。新しめの Ethereum ツール、たとえば Lighthouse などの consensus client では libp2p が使われていますが、reth は execution 層のプロトコルに揃える形で devp2p を採用し続けています。

## 7. Reth ベースの chain を作る側の視点

Reth 上に新しい chain を立ち上げるなら、選択肢は以下の通りです:

- **devp2p をそのまま使う** (デフォルト。reth がすぐ提供してくれる) — 何もしなくても動きます
- **devp2p をカスタマイズする** — 独自のサブプロトコルを追加する (例: 決済固有メッセージを運ぶ \`tempo/1\` など)
- **libp2p sidecar を追加する** — 異なるネットワーキング semantics が必要な場合

Tempo を想像するなら、おそらく **カスタムサブプロトコル付きの devp2p** が現実的で、決済固有の gossip (例: merchant identity attestation、payment finality hint) をそこに乗せる形になるでしょう。

Hyperliquid の場合、独自の transport (HyperBFT 通信) は **execution 層の P2P と分離** されています。devp2p の上に、consensus 用の独自ネットワークを別レイヤーとして重ねている構造です。

## 8. 練習

1. [discv5 spec](https://github.com/ethereum/devp2p/blob/master/discv5/discv5.md) を開き、4 つのメッセージタイプを特定する
2. Reth の [\`crates/net/network\`](https://github.com/paradigmxyz/reth/tree/main/crates/net/network) をブラウズし、エントリポイントを見つける
3. 自分の言葉でまとめる: 決済固有 gossip 用のカスタムサブプロトコルをどう追加するか?

> 最終チェック: 一文で答えてみる。**bootnode** が解決する bootstrapping 問題とは何か? **答えに「peer を見つけるには peer が必要」というジレンマが含まれていなければ、§1 を読み直す**。

> 🛣️ **もう一つの道 (Solana):** Solana のブロック伝播は **Turbine** — gossip ではなく、ツリー型のブロードキャストプロトコル。リーダーが各ブロックを *shred* (小さなパケット) に分割し、決定論的なピアツリー経由で伝播する: 各 shred は devp2p の O(N) の gossip flooding ではなく、おおむね O(log N) ホップで全バリデータに到達する。結果: ブロックあたりの帯域浪費が大幅に下がるが、前提として全バリデータがほぼ対称的な高帯域接続を持つ必要がある。devp2p の gossip は帯域を浪費する (各バリデータが各 tx を複数回受信する) が、非対称なネットワーク状況や敵対的なピアにも優雅に耐える。Turbine は *良いピアでの規模あるスループット* を最適化する; devp2p は *悪いピアでも生き残ること* を最適化する。どちらもネットワーク層の有効な選択で、選択はチェーンがどんなバリデータネットワークを要求できるかに従う。`,
                },
                {
                  title: 'Reth の network crate を読む',
                  slug: 'p2p-reth-network-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 17,
                  xpReward: 45,
                  content: `# Reth の network crate を読む

自分の chain 向けに、カスタムサブプロトコル — 決済 finality hint や MEV bundle gossip など — を追加したい。そのコードを reth ツリーのどこに置けばよいか、既存のどのピースにつなぎ込めばよいか? Reth のネットワーク層は [\`crates/net/\`](https://github.com/paradigmxyz/reth/tree/main/crates/net) にあり、discovery、transport、gossip、peer 管理を扱う 6 つのサブ crate に分散した、Rust 約 30k 行のコードベースです。本レッスンはその全体地図 — 何がどこにあり、各 crate は何をしており、拡張点はどこかを押さえます。

> 🛑 **スクロール前に予測。** Reth のネットワークは約 6 つのサブ crate に分かれている。**どんな関心事の分離が妥当だろうか?** 読み始める前に、自分でモジュール構成をスケッチしてみる。(ヒント: discovery、transport、サブプロトコルは分けるのが自然な出発点。)

## 1. ネットワーク crate マップ

| Crate | 役割 |
| :--- | :--- |
| \`net/discv5\` | discv5 の実装 (Kademlia DHT) |
| \`net/eth-wire\` | eth/68 メッセージの wire エンコード / デコード |
| \`net/network\` | トップレベルのオーケストレーション |
| \`net/network-api\` | アプリケーションコード向けの公開 API |
| \`net/peers\` | Peer 管理、scoring、eviction |
| \`net/dns\` | DNS ベースの peer discovery (discv5 の代替) |

全体を読み解きたいなら、おすすめの順番は次の通りです:
1. \`network-api\` (API の表面を把握)
2. \`network\` (メインのオーケストレーション)
3. \`eth-wire\` (プロトコルメッセージ)
4. \`peers\` (peer の状態機械)
5. \`discv5\` (discovery 用の DHT)

## 2. NetworkManager — 中央オーケストレータ

すべての peer メッセージ、すべての discovery ヒット、ノードの他の部分から飛んでくる「この tx をブロードキャストせよ」というコマンド — それらがすべて一つの struct を通過します。それが \`NetworkManager\` で、定義は \`crates/net/network/src/manager.rs\` にあります:

\`\`\`rust
pub struct NetworkManager<C> {
    swarm: Swarm<C>,                    // Peer 接続
    handle: NetworkHandle,              // 公開 API ハンドル
    from_handle_rx: UnboundedReceiver<NetworkHandleMessage>,
    discovery: Discovery,                // discv5 / DNS
    state: NetworkState<C>,             // 内部状態
    // ...
}
\`\`\`

\`run\` ループ自体は小さなものです:
1. \`swarm\` を poll して peer メッセージを受け取る
2. \`discovery\` を poll して新たに発見された peer を受け取る
3. \`from_handle_rx\` を poll してコマンド (例: 「この tx をブロードキャスト」) を受け取る
4. 各イベントを dispatch する

入力ストリームは 3 本、dispatcher は 1 つ。これが reth ネットワーキングの心臓部です。

> 🔍 **リポで探す。** \`crates/net/network/src/manager.rs\` を開き、メインの \`poll_next\` あるいは \`run\` メソッドを見つける。**Polling の順序はどうなっているか?** そして、その順序がなぜ重要なのか?

## 3. Swarm — peer 接続プール

\`Swarm\` は \`NetworkManager\` の下で動く、アクティブな peer 接続のプールです。各接続は小さな状態機械として動きます:

\`\`\`
NewConnection → Handshake → Negotiation → Active → Disconnected
\`\`\`

各 peer について、状態は次のように遷移します:
- **NewConnection**: TCP 接続を確立、あるいは accept する
- **Handshake**: RLPx で認証する
- **Negotiation**: サポートするサブプロトコル (eth/68 など) を合意する
- **Active**: メッセージを交換する
- **Disconnected**: 正常終了、あるいはエラーで切断する

Swarm はここで **peer 数の上限** (典型的には 25〜50 のアクティブ接続) と **eviction policy** (新しい接続が入りたいときにスコアの低い peer を drop する) を強制しています。

## 4. eth-wire — プロトコルメッセージ

Wire フォーマット関連のコードは、一つの crate にまとめられています。eth/68 の各メッセージは Rust の struct として表現され、RLP-derive マクロが encoding を生成します:

\`\`\`rust
#[derive(Debug, RlpDecodable, RlpEncodable)]
pub struct NewBlock {
    pub block: Block,
    pub total_difficulty: U256,
}

#[derive(Debug, RlpDecodable, RlpEncodable)]
pub struct NewPooledTransactionHashes {
    pub types: Vec<u8>,
    pub sizes: Vec<u32>,
    pub hashes: Vec<TxHash>,
}
\`\`\`

Derive マクロが wire フォーマットを生成してくれます。**すべてのメッセージは RLP** — transaction や block に使われているのと同じエンコードです。

カスタムサブプロトコルを作るには、独自のメッセージ struct を定義して、それをネットワークに登録するだけです。(レッスン 3 で実際に書きます。)

## 5. Peer の状態機械

\`crates/net/peers/src/peer.rs\` が、peer ごとの状態を追跡しています:

- **Capability セット**: その peer がサポートするサブプロトコル
- **Score**: 応答時間、エラー率、banhammer イベントなどから算出
- **Stats**: 送受信バイト数、タイプ別のメッセージ数、タイミングなど
- **接続状態**: handshake が完了したか、サブプロトコルが negotiate されたか、など

ここで peer scoring が重要になります。不正な振る舞いをする peer は evict されます。デフォルトの scoring は次のような行動に対してペナルティを与えます:
- 応答が遅い
- 不正なメッセージ (壊れた RLP、ハッシュの不一致など)
- 不正な振る舞い (古い tx を繰り返し送ってくる、持っていないデータを持っていると主張する、など)

## 6. カスタムサブプロトコルを追加する

ここが、ほとんどの Reth ベース chain が利用する拡張ポイントです。chain 固有の gossip — merchant attestation、決済 finality hint、sequencer coordination など — が必要であれば、サブプロトコルとして出荷します:

\`\`\`rust
// 自 chain の crate 内
pub struct TempoSubProtocol {
    // 状態
}

impl SubProtocol for TempoSubProtocol {
    const NAME: &'static [u8] = b"tempo";
    const VERSION: u8 = 1;
    const MESSAGES_COUNT: u8 = 5;

    fn on_message(&mut self, peer: PeerId, msg: Bytes) -> eyre::Result<()> {
        let parsed: TempoMessage = decode(&msg)?;
        match parsed {
            TempoMessage::MerchantAttestation(att) => self.handle_attestation(peer, att),
            TempoMessage::PaymentFinalityHint(hint) => self.handle_hint(peer, hint),
            // ...
        }
    }
}
\`\`\`

これを NetworkManager に登録すれば、カスタムプロトコルが eth/68 と同じ RLPx 接続の上で並走します。新しい TCP port も、別個の discovery も不要 — 既存の peering にそのまま乗ります。Tempo も、決済固有の gossip にはおそらくこのパターンを使うでしょう。

## 7. Peer scoring が秘める可能性

デフォルトの peer scoring は汎用的で、悪い peer にペナルティを与えるためのものです。しかし scoring は、特化型 chain にとっては *戦略的なハンドル* にもなり得ます:

- **MEV 関連 chain**: tx 伝播速度で peer をスコアリングする
- **プライバシー特化 chain**: メタデータの漏洩度合いで peer をスコアリングする
- **パフォーマンス特化 chain**: 帯域とレイテンシで peer をスコアリングする

Tempo の文脈で言えば、決済優先 chain は **既知の merchant インフラ** を汎用 peer よりも高くスコアリングする、といった選択肢があり得ます。これは chain 固有のネットワーキング戦略上の意思決定です。

> 🛑 **理解度チェック。** 「Peer scoring は bad peer を排除するためのもの」 — これは **半分しか当たっていません**。Sequencer にとって有用な、peer scoring の積極的活用とは何でしょうか? 答えに「既知インフラを優先する」あるいは「MEV 関連トラフィックのルーティング」が含まれていなければ、このセクションを読み直してください。

## 8. 練習

1. \`crates/net/network/src/manager.rs\` をブラウズし、メインの poll ループを見つける
2. \`crates/net/eth-wire\` を開き、メッセージの enum を見つける
3. 自分で考える: 決済 finality hint 用のカスタムメッセージタイプを、どのように追加するか?
4. 推定する: 典型的な reth ノードはいくつの peer を維持しているか? それは 1000+ chain 規模にどうスケールするか?

> 最終チェック: 一文で答えてみる。reth のどこにフックすれば、chain 固有の gossip 用カスタムサブプロトコルを追加できるか? **答えに NetworkManager またはサブプロトコルの登録が含まれていなければ、§6 を読み直す**。`,
                },
                {
                  title: 'カスタム gossip 構築 — Reth 上の MEV-Boost 系メッセージング',
                  slug: 'p2p-custom-gossip-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 50,
                  content: `# カスタム gossip 構築 — Reth 上の MEV-Boost 系メッセージング

Searcher ノードを走らせているとしましょう。収益性の高い bundle を見つけた。これは信頼できる builder の小集団にだけ送りたい — ネットワーク上のすべての peer にブロードキャストして bundle が漏れ、front-run されるような事態は避けたい。eth/68 の transaction gossip では、このユースケースには合いません。なぜなら、それは public 前提で、「全員が全員を relay する」モデルを採用しており、「*この特定の* peer 集合にだけ送る」という概念を持たないからです。

そのギャップを埋めるのが **カスタムサブプロトコル** です。本レッスンでは、その最小版を構築します — reth のネットワーキング上で動く peer-to-peer メッセージバスで、独自のルールに従って、アプリケーションが chain 固有メッセージをブロードキャストおよび受信できるようにします。MEV-Boost、private mempool、共有 sequencer の coordination、決済 routing インフラ — これらが採用しているのと同じパターンです。

> 🛑 **スクロール前に予測。** Private な peer 集合に「この MEV bundle を売りに出す」というメッセージをブロードキャストしたい。**なぜ eth/68 transaction を使わないのか?** Tx gossip を悪用するのではなく、別の gossip プロトコルを立ち上げることで得られるものは何か?

## 1. 動機 — デフォルト gossip が機能しないとき

eth/68 が運ぶのは **canonical chain data** — block、transaction、receipt です。その前提は次の通り:
- メッセージは public (接続を持つ誰もが見られる)
- メッセージは consensus に関するもの
- Peer は皆、relay に協力する

カスタムトラフィックは、この 3 つすべてを壊します。出荷するには次の要素が必要です:
- **Private gossip** — 特定の peer 集合にしか見えない
- **アプリケーション層の routing** — capability に基づいて、特定の peer にだけ届ける
- **カスタム署名** — chain 固有の認証方式

本番環境でこのパターンが顔を出すのは、次のような場面です:
- MEV-Boost bundle (private orderflow)
- 共有 sequencer の pre-confirmation
- 決済レールにおける merchant attestation
- L2 sequencer 間の coordination

## 2. 最小のカスタムプロトコル

ここで \`bundle/1\` という名前のプロトコルを構築します。役割はシンプル — peer が「収益的な bundle を持っている」とアナウンスし、他の peer がそれを要求できるようにすることです。

メッセージは次の 4 タイプ:

| メッセージ | 目的 |
| :--- | :--- |
| \`Hello\` | Handshake — サポート共有 |
| \`BundleAnnounce\` | 「Hash X は bundle、~Y gas 抽出」 |
| \`BundleRequest\` | 「Bundle X 送って」 |
| \`BundleData\` | フル bundle (送信者向け暗号化) |

\`\`\`rust
#[derive(Debug, RlpDecodable, RlpEncodable)]
pub enum BundleMessage {
    Hello { protocol_version: u8, peer_capabilities: u64 },
    BundleAnnounce { bundle_hash: B256, expected_profit_gwei: u64 },
    BundleRequest { bundle_hash: B256, requester_signature: Bytes },
    BundleData { bundle_hash: B256, encrypted_payload: Bytes },
}
\`\`\`

## 3. プロトコルハンドラ

Reth 互換のサブプロトコルを実装します:

\`\`\`rust
use reth_network::SubProtocol;
use std::collections::HashMap;

pub struct BundleProtocol {
    known_bundles: HashMap<B256, Bundle>,
    peer_set: HashSet<PeerId>,
    signer: PrivateKeySigner,
}

impl SubProtocol for BundleProtocol {
    const NAME: &'static [u8] = b"bundle";
    const VERSION: u8 = 1;
    const MESSAGE_COUNT: u8 = 4;

    fn on_handshake(&mut self, peer: PeerId) -> eyre::Result<()> {
        // Peer が allowlist に含まれているかを認証
        if !self.peer_set.contains(&peer) {
            return Err(eyre!("not authorized peer"));
        }
        Ok(())
    }

    fn on_message(&mut self, peer: PeerId, msg: Bytes) -> eyre::Result<Option<Bytes>> {
        let parsed: BundleMessage = decode(&msg)?;

        match parsed {
            BundleMessage::Hello { protocol_version, .. } => {
                tracing::info!(peer = ?peer, version = protocol_version, "peer joined");
                Ok(None)
            }

            BundleMessage::BundleAnnounce { bundle_hash, expected_profit_gwei } => {
                // 手元に bundle がなければ要求する
                if !self.known_bundles.contains_key(&bundle_hash) {
                    let request = BundleMessage::BundleRequest {
                        bundle_hash,
                        requester_signature: self.signer.sign(&bundle_hash)?.to_bytes(),
                    };
                    Ok(Some(encode(&request)))
                } else {
                    Ok(None)
                }
            }

            BundleMessage::BundleRequest { bundle_hash, requester_signature } => {
                // 要求側の署名を検証
                verify_signature(&bundle_hash, &requester_signature)?;

                // Bundle を送信
                if let Some(bundle) = self.known_bundles.get(&bundle_hash) {
                    let encrypted = encrypt_for_peer(&peer, bundle.serialize());
                    let response = BundleMessage::BundleData {
                        bundle_hash,
                        encrypted_payload: encrypted,
                    };
                    Ok(Some(encode(&response)))
                } else {
                    Ok(None)
                }
            }

            BundleMessage::BundleData { bundle_hash, encrypted_payload } => {
                // 復号して保存
                let decrypted = decrypt_from_peer(&peer, encrypted_payload)?;
                let bundle = Bundle::deserialize(&decrypted)?;
                self.known_bundles.insert(bundle_hash, bundle);
                Ok(None)
            }
        }
    }
}
\`\`\`

これでプロトコルは完成です。約 70 行で、peer-to-peer な bundle マーケットプレイスが立ち上がります。

## 4. Reth への登録

\`\`\`rust
use reth_node_builder::NodeBuilder;

let bundle_protocol = BundleProtocol::new(allowlisted_peers, signer);

let node = NodeBuilder::new(config)
    .with_components(
        Components::default()
            .add_sub_protocol(bundle_protocol)
    )
    .launch()
    .await?;
\`\`\`

これだけです。カスタムプロトコルが、eth/68 と同じ RLPx 接続の上で動き始めます。\`bundle/1\` をサポートする peer はこれらのメッセージを送受信し、サポートしない peer には何の影響もありません。

## 5. Private プロトコルにおける peer discovery

ここで気をつけるべき問題があります: デフォルトの discv5 は capability のリストを丸ごとアナウンスしてしまうため、ネットワークをスキャンする者は誰でも「このノードは bundle/1 をサポートしている」と知ることができます。これでは、せっかくのプライバシー目標が台無しです。そのため、private プロトコルは peer 探索に discv5 を使いません。一般的なパターンは次のとおりです:

- **Allowlist ベース**: プロトコル参加者の peer ID をハードコードする
- **Out-of-band な招待**: 別のチャネル経由で peer 同士が連絡先を交換する
- **Tor 経由でルーティング**: ネットワーク上の位置を完全に隠す

MEV-Boost は 2 番目のパターンを採用しています: bundle relay の peer ID は、Discord や GitHub などのチャネルを通じて配布されます。プロトコル自体は、既知の当事者同士の point-to-point な通信として動きます。

## 6. MEV-Boost のパターン

[Flashbots の MEV-Boost](https://github.com/flashbots/mev-boost) は、このアプローチ全体の本番運用におけるリファレンス実装です。中心となる概念を、カスタムプロトコルの観点で対応付けると以下のようになります:

| 概念 | 実装 |
| :--- | :--- |
| **Relayer と builder の分離** | Relayer (「ブロックを売りに出す」窓口)、builder (ブロックを組み立てる役)、proposer (勝ち入札を選ぶ役) |
| **Sealed-bid auction** | Builder が入札を行い、proposer が最高額のものを選ぶ |
| **評判ベース** | Builder は評判を積み上げ、relayer は不正な参加者を追跡する |
| **ネットワーク層での trust** | すべては private な p2p 上で完結し、on-chain には乗らない |

Tempo のような決済優先の chain 向けには、MEV-Boost に相当するものは次のような形になるでしょう:

- **Relayer**: merchant の支払い bundle を集約する役
- **Builder**: 決済優先のブロックを組み立てる役 (merchant tx + bundle 決済)
- **Sequencer**: 最も収益性が高く、かつ最も merchant に有利な bundle を選ぶ役

Tempo が sequencer を分散化するタイミングが来れば、2026 年中の出荷も現実的です。

## 7. DOS 対策という宿題

カスタムプロトコルは、新たな攻撃面を晒すことになる。デフォルトの eth/68 には実戦で鍛えられた防御策が組み込まれていますが、自作プロトコルには、自分で書くまで何もありません。最低限、押さえたい項目は次の通り:

| 攻撃 | Mitigation |
| :--- | :--- |
| アナウンスの spam | Peer ごとのレート制限を導入し、署名付きアナウンスを必須にする |
| 偽の bundle | Announce 時に署名を要求し、要求時に検証する |
| 帯域の食いつぶし | Peer ごとに帯域上限を設け、超過したら eviction する |
| Sybil 攻撃 (大量の偽 peer) | Peer ID の allowlist 化、あるいは proof-of-stake への紐付けを行う |

これらをスキップしてしまうと、カスタムプロトコルはあっという間に DOS amplifier に化けます — 一つの peer が、あなたのコードを介して他のすべての peer に対して flood できるからです。コアロジックと並行して保護策を組み込むのが筋であり、後回しにすべきではありません。

## 8. 自分のプロジェクトに当てはめると

### Telos (Tempo↔HL の intent matching)

カスタム gossip が役立つメッセージとして、次のようなものが考えられます:
- 「intent のマッチング機会がある」
- 「この intent の実行に X を入札する」
- 「intent 実行の proof」

これらは Ethereum の tx semantics には乗りません。reth のネットワーキング上に乗せるカスタムプロトコルが、ちょうど自然な居場所になります。

### mppsol (cross-VM 決済)

Tempo から Solana への決済 attestation 自体は CCIP 経由で扱います (これは既に別レッスンで扱った内容)。一方、**Tempo 内部の coordination** にはカスタム gossip が向いています:
- chain に到達する前の、pending な merchant 決済をアナウンスする
- HA を目的とした、merchant ノード同士の協調

### Hyperliquid との統合

HL のネットワークに参加するノードを構築したいなら、彼らの独自プロトコルを理解する必要がある。公開仕様ではありませんが、パターンとしては同じ筋 — RLPx 系の transport の上に乗せたカスタムサブプロトコルです。

## 9. 練習

1. 「merchant attestation のブロードキャスト」用に、2 メッセージで済むプロトコルをスケッチする
2. 自分で説明する: Allowlist は、どのような仕組みで Sybil 攻撃を防ぐのか?
3. 計算してみる: 1 秒あたり 1000 メッセージを 10 peer にブロードキャストするときの帯域コストはどれくらいになるか?
4. [MEV-Boost spec](https://github.com/flashbots/mev-boost) を読み、relayer プロトコルの部分を見つける

## 10. さらに読むなら

- [reth network crate](https://github.com/paradigmxyz/reth/tree/main/crates/net)
- [MEV-Boost docs](https://docs.flashbots.net/flashbots-mev-boost/introduction)
- [libp2p tutorials](https://docs.libp2p.io/) — モジュラーなネットワーキングを理解するために

> 最終チェック: 一文で答えてみる。なぜ「カスタム gossip」は、MEV マーケットや決済 routing のような chain 固有アプリにとって自然な拡張ポイントになるのか? **答えに「デフォルトの gossip は canonical chain data しか扱わない」という観点が含まれていなければ、§1 を読み直す**。`,
                },
                {
                  title: 'ファイナルクイズ: P2P ネットワーキング',
                  slug: 'p2p-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# ファイナルクイズ: P2P ネットワーキング

P2P 層の最終チェックです。カスタムプロトコルの統合、MEV インフラの構築、reth のネットワーキング拡張に取り組むうえで必要となる知識を確認します。`,
                  quizQuestions: [
                    {
                      question: 'devp2p (Ethereum) と libp2p (Polkadot、IPFS) の **構造的な違い** は何か?',
                      options: [
                        'devp2p は libp2p より速い。',
                        'devp2p は Ethereum 専用に設計されており、Ethereum 固有のプロトコルを前提とする。一方 libp2p はモジュラーかつマルチチェーン対応で、transport、encryption、multiplexing を組み合わせ可能なピースに分離している。Ethereum が libp2p を使わない主な理由は歴史的なもので、devp2p の方が先に存在していた。',
                        "devp2p は Solana のみ、libp2p は Ethereum のみで動く。",
                        "libp2p は peer discovery をサポートしない。",
                      ],
                      correctIndex: 1,
                      explanation: '2 つの異なる設計哲学です: 専用設計 (devp2p) と モジュラー設計 (libp2p)。どちらも実運用に耐えており、それぞれにトレードオフがあります。Ethereum の execution 層は devp2p、consensus 層 (Lighthouse) は libp2p を採用しています。Reth ベースの chain にとっては、devp2p をそのまま引き継ぐのが自然な選択です。',
                    },
                    {
                      question: '**discv5** は Kademlia DHT を採用している。**なぜ中央ディレクトリではなく Kademlia が peer discovery に選ばれたのか?**',
                      options: [
                        'Kademlia の方が中央集権型より速いから。',
                        "中央ディレクトリは単一障害点になりやすく、検閲のレバーにもなる。Kademlia は分散型で、すべてのノードが他の peer の発見を助け、特定の当事者がネットワークを支配することはない。トレードオフは O(log N) の lookup vs O(1) だが、セキュリティと分散性で得るものの方が大きい。",
                        "Kademlia の方がメモリ効率が良いから。",
                        '他に選択肢がなかったから。',
                      ],
                      correctIndex: 1,
                      explanation: '中央集権型は、検閲や操作の単一障害点になります。Kademlia は分散型ですが、その分だけ複雑です。Permissionless な blockchain ネットワークでは、効率性よりも分散性が優先されます。わずかなレイテンシのコストは、得られるセキュリティ上の利点と引き換えに許容できる範囲です。',
                    },
                    {
                      question: 'eth/68 では、**transaction はまず hash でアナウンスされ**、フルボディでは送られない。**なぜか?**',
                      options: [
                        'Hash の方がサイズが小さいから。',
                        'ほとんどの peer は、ほとんどの tx を既に持っている (伝播の過程で目にしている)。Hash でアナウンスし、手元にないものだけをフルボディで要求すれば、**すべての tx をフルサイズですべての peer に再ブロードキャストするのを避けられる**。ネットワーク規模で見れば、莫大な帯域の節約になる。',
                        "Tx のフルボディは暗号化されるが、hash は暗号化されないから。",
                        "Hash でのアナウンスは EIP-1559 で必須化されたから。",
                      ],
                      correctIndex: 1,
                      explanation: '帯域の最適化です。Tx がネットワーク内を伝播すれば、すべての peer が hash を素早く目にします。手元にないものだけフルボディを要求すれば事足りるため、ネットワーク全体の総帯域は、フル tx をブロードキャストする場合と比較して約 10 分の 1 に削減されます。スケーリングを考えるうえで決定的な工夫です。',
                    },
                    {
                      question: "**Reth の NetworkManager** は中央オーケストレータの役割を担っている。**poll される 3 つのストリームは何か?**",
                      options: [
                        'CPU、メモリ、ディスク。',
                        'Swarm (アクティブな接続から流れてくる peer メッセージ)、Discovery (discv5 や DNS から得られる新規 peer)、from_handle_rx (アプリケーションコードから送られてくるコマンド — tx のブロードキャスト、block の要求など)。',
                        "RPC、WebSocket、IPC。",
                        'Block、transaction、receipt。',
                      ],
                      correctIndex: 1,
                      explanation: "中央のイベントループが、3 つの入力ストリームを統合します: 外部からのトラフィック (Swarm)、新規 peer (Discovery)、アプリケーションからのコマンド (handle チャネル)。NetworkManager がそれらをすべて poll し、dispatch する — これが Reth ネットワーキングの心臓部です。",
                    },
                    {
                      question: 'Reth ベースの chain に **カスタム gossip** を追加する場合 (例: MEV bundle マーケットプレイス向けなど)、アーキテクチャ的にはどう取り組むか?',
                      options: [
                        "eth/68 を修正して新しいメッセージタイプを追加する。",
                        '**カスタムサブプロトコル** を実装し、eth/68 と同じ RLPx 接続の上で動かす。メッセージの enum を定義し (RLP エンコード)、SubProtocol トレイトを実装し、NetworkManager に登録する。カスタムプロトコルは eth/68 と干渉せず、並走する。',
                        "reth を fork してコアにプロトコルを追加する。",
                        'devp2p ではなく libp2p を使う。',
                      ],
                      correctIndex: 1,
                      explanation: "サブプロトコルパターンが答えです。reth のネットワーキングは、設計の段階から拡張可能になっています。プロトコルを一つの「層」として追加し、複数のプロトコルが同じ RLPx 接続を共有します。eth/68、snap (state sync)、そして自作のカスタムプロトコルが、すべて並行して動きます。インフラはこの仕組みでスケールします。",
                    },
                    {
                      question: "Reth の **Peer scoring** は不正な振る舞いにペナルティを与える。では、不正検知だけを見ていると見落としがちな **積極的なユースケース** とは何か?",
                      options: [
                        '積極的な使い方は存在しない。',
                        "Peer scoring は **特定の peer を優遇する** 用途にも使える。たとえば sequencer が、既知の良質な merchant インフラをランダムな peer よりも高くスコアリングし、そうした peer からのフローを優先的に処理したり、低レイテンシを保証したりできる。これによって peer scoring は、防御的 (悪い peer をブロック) なものから、戦略的 (良い peer にルーティング) なものへとシフトする。",
                        "積極的 scoring はマーケティング上の概念で、技術的な実体はない。",
                        "Peer scoring はフルノードにしか関係しない。",
                      ],
                      correctIndex: 1,
                      explanation: 'デフォルトの scoring は反応的なもの (悪い peer を drop する) ですが、特化型 chain にとっては戦略的な道具にもなります — MEV 関連の情報を既知の builder に、決済データを merchant ノードに、といった形でルーティングできるのです。これこそが、chain 固有のネットワーキング戦略における Reth の拡張ポイントです。',
                    },
                    {
                      question: "MEV-Boost のような仕組みになぜ **カスタム gossip プロトコル** が必要なのか? **デフォルトの eth/68 transaction gossip** がすでに存在しているにもかかわらず。",
                      options: [
                        "カスタム gossip の方が eth/68 より速いから。",
                        'eth/68 は canonical chain data (block、tx、receipt) を運ぶためのもので、public-by-default かつ cooperative-relay を前提としている。一方 MEV-Boost には、**private なルーティング** (特定の peer にしか bundle が見えない)、**アプリケーション層のオークション** (bundle に値段がつく)、**プロトコル外の認証** (relayer の identity) が必要となる。これらは on-chain の semantics には乗らない、アプリケーション固有の関心事である。',
                        "MEV-Boost は HTTPS を要求するが、eth/68 はそれをサポートしないから。",
                        "カスタム gossip は EVM 仕様で要求されているから。",
                      ],
                      correctIndex: 1,
                      explanation: 'eth/68 は、chain に乗らないメッセージを運ぶには間違った抽象です。カスタムプロトコルこそが、private なルーティング、アプリケーション層のシグナリング、chain から独立した semantics を提供します。MEV-Boost、共有 sequencer の coordination、決済レールの routing — これらはすべてこの層に居場所があります。',
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
