import { PrismaClient } from '@prisma/client';

export async function seedRethP2PNetworkingJA(prisma: PrismaClient) {
  const tags = ['reth', 'p2p', 'devp2p', 'libp2p', 'gossip', 'peer-scoring', 'networking', 'advanced'];

  await prisma.course.create({
    data: {
      slug: 'reth-p2p-networking-ja',
      title: 'P2P ネットワーキング内部 — devp2p からカスタム gossip まで',
      description:
        'すべての blockchain が依存するが少ないエンジニアしか理解しないネットワーク層。devp2p vs libp2p、peer discovery (Kademlia、ENR)、RLPx 暗号化、transaction gossip、eth/68 サブプロトコル、reth の network crate を読み、peer scoring、MEV / private orderflow / sequencer coordination 用のカスタム gossip 動作を構築。',
      difficulty: 'ADVANCED',
      duration: 61,
      xpReward: 350,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 1330,
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
                  title: 'レッスン0 — P2P の基礎（devp2p、libp2p、peer discovery）',
                  slug: 'p2p-fundamentals-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# レッスン0 — P2P の基礎（devp2p、libp2p、peer discovery）

## 問い

新しい reth ノードを起動した直後 = peer ゼロ、ブロックゼロ、state ゼロ。数秒後にはどこかから header をダウンロードしている — **peer はどこから来たか？** まだネットワーク上にいないノードが、そのネットワークに peer を尋ねられるはずがない。**これが bootstrapping 問題**、P2P 層が他の何かを始める前に解決しなければならない。

## 原理（最小モデル）

- **2 層構造.** Discovery（peer を見つける、discv4 / discv5 = Kademlia DHT）+ Transport（peer と話す、RLPx = 暗号化 TCP）。
- **Bootstrapping は bootnode で解決.** chainspec にハードコードされた既知 IP、1 つ接続 → 他 peer を教えてもらう → DHT が引き継ぐ。
- **devp2p = Ethereum 専用スタック.** discv5（peer discovery）+ RLPx（暗号化 TCP）+ eth/68（block + tx gossip）。
- **discv5 / Kademlia の「近さ」= ノード ID 上の XOR distance.** トポロジカル、地理的意味なし。ID 空間で近い同士が効率的に互いを見つけられる = O(log N) ホップ。
- **ENR = Ethereum Node Record.** ID + IP + port + capability。Discovery query は ENR を返す。
- **RLPx ≈ Ethereum 版 TLS.** ECDH + ECDSA + AES-CTR + RLP frame。**peer ID = 公開鍵そのもの**、中央 CA なし → TLS を使わない理由。
- **eth/68 が tx を hash で先にアナウンス.** 全ノード全 tx 再ブロードキャストの増幅問題を回避。
- **libp2p = マルチチェーン代替.** discovery / transport / encryption / multiplexing を独立分離。Polkadot、IPFS、Solana、Lighthouse 採用。Reth は歴史的経緯で devp2p。

## 具体例

2 層プロトコル:

| 層 | 役割 | Ethereum での実装 |
| :--- | :--- | :--- |
| Discovery | 「Peer を見つける」 | discv4 / discv5（Kademlia DHT） |
| Transport | 「Peer と話す」 | RLPx（暗号化 TCP） |

Reth ノード起動時のデータフロー:

\`\`\`mermaid
flowchart LR
    Boot["Bootnode"] -->|seed peer list| You["自 Reth ノード"]
    You -->|discv5 ping| Peer1["Peer 1"]
    You -->|discv5 ping| Peer2["Peer 2"]
    Peer1 -->|RLPx ハンドシェイク| You
    You -->|eth/68: ブロック、txs| Peer1
    You -->|eth/68: ブロック、txs| Peer2
\`\`\`

devp2p の 3 要素:

- **discv5**: Kademlia DHT 経由 peer discovery（ノード探し用の分散ハッシュテーブル）
- **RLPx**: 暗号化・認証付き TCP transport
- **eth/68**: ブロック + transaction gossip サブプロトコル

eth/68 メッセージ:

| メッセージ | 目的 |
| :--- | :--- |
| Status | Handshake — fork バージョン、chain ID、head |
| NewBlock | 新ブロックアナウンス |
| BlockBodies | ブロックボディ要求 / 応答 |
| NewPooledTransactionHashes | Pending tx（hash のみ）アナウンス |
| PooledTransactions | フル tx ボディ要求 |
| Receipts | Receipt 要求 / 応答 |

libp2p 採用例:
- Polkadot（libp2p ベース）
- IPFS（発祥地）
- Solana（transport カスタム、概念踏襲）
- Lighthouse（Ethereum consensus client）

## 失敗例（誤解）

「Kademlia の『近さ』は地理的」— **間違い**。ノード ID 上の **XOR distance**、トポロジカル。地理的意味なし。**ID 空間で近いノード同士が効率的に互いを見つけられる** 数学的性質が O(log N) ホップを成立させる。

「Ethereum は TLS を使えば良い」— **間違い**。devp2p の前提は **peer ID = 公開鍵そのもの**、中央 CA なし。TLS は CA 前提なので合わない。歴史的経緯（2015 年以前）+ 中央 CA なし設計の合致で RLPx 独自実装。

「全 tx を全ノードに再ブロードキャスト」— **間違い**。eth/68 は tx を **hash で先にアナウンス** → peer は未保有なら body を要求。**増幅問題を根本から潰す**。

> 🛑 **予測。** Reth ノードをゼロから sync させる。最初に見つかるのは peer かブロックか？ 既知 peer 一つもない状態でどうやって peer を見つける？（答え: **peer が先**、ブロックは後。Bootnode = chainspec にハードコードされた既知 IP → ノード起動時にまず bootnode に接続 → bootnode が「これらの peer を試せ」とリストを返す → 各 peer に discv5 ping → 接続できた peer から更に Kademlia 経由で peer 探索 → 数十 peer 集まったら eth/68 で block 取得開始。**bootnode = 鶏と卵の解、まず人間が中央集権的に提供したリストを起点に分散ネットワーク参加**。chain ローンチ時の信頼基盤。）

## ステップで組み立てる

### Step 1: 2 層構造を即答

Discovery（discv5）+ Transport（RLPx）。

### Step 2: Bootnode が解く問題

「Peer を見つけるには peer が必要」のジレンマ → chainspec に既知 IP ハードコード → 起点。

### Step 3: Kademlia の「近さ」を理解

ノード ID の XOR distance、トポロジカル、O(log N) ホップ。

### Step 4: RLPx ≈ TLS の違い

ECDH + ECDSA + AES-CTR + RLP。peer ID = 公開鍵、中央 CA なし → TLS 不採用。

### Step 5: eth/68 の hash-first 設計

NewPooledTransactionHashes（hash アナウンス）→ PooledTransactions（必要時のみ body 要求）。

### Step 6: libp2p との対比

devp2p = Ethereum 専用束ね / libp2p = マルチチェーン用にモジュール分離（discovery / transport / encryption / multiplexing）。Reth は歴史的経緯で devp2p。

### Step 7: Reth ベース chain の選択肢

devp2p そのまま / カスタムサブプロトコル追加（\`tempo/1\` など）/ libp2p sidecar 追加。

## 答え合わせ

- **Kademlia の「近さ」が重要な理由**: 単に routing のためではなく **数学的性質**。ID 空間で近いノード同士が **効率的に互いを見つけられる** → O(log N) ホップで任意 peer 探索可能（数百万ノード規模でスケール）。「近い」= 「ID 空間トポロジ上の局所性」。これがなければ Discovery は線形探索になる。
- **Bootstrap 問題の構造**: 「Peer を見つけるには peer が必要」のジレンマ = **チェーンの最初は人間が解決する**。Bootnode = chainspec にハードコードされた既知 IP リスト → ノード起動時の信頼起点。Bootnode が落ちると新規 join 不可だが、複数 bootnode と DNS-based fallback で冗長化。**完全分散化は到達不能、Bootstrap は中央集権から始まる**。
- **eth/68 の hash-first 設計の効果**: 「N peer × M tx × 1 リレイ = N×M」を「N peer × M tx × hash 1 つ + 必要時のみ body 取得」に削減 → 帯域 ~32 byte hash で済む。全 peer が全 body を不要に持つ問題を回避。Mempool 同期コストが O(M^2) から O(M log N) に。

## 合格基準

- 2 層（Discovery + Transport）と devp2p の 3 要素を即答できる。
- Bootnode が解く bootstrap 問題を 1 文で説明できる。
- Kademlia の XOR distance + O(log N) ホップの意味を言える。
- RLPx と TLS の違い（peer ID = 公開鍵、CA なし）を言える。
- eth/68 の hash-first 設計が回避する増幅問題を計算できる。

## まとめ（3行）

- P2P 2 層構造（Discovery = discv5 / Kademlia DHT + Transport = RLPx）、Bootstrap 問題は bootnode で解決（chainspec ハードコード）。
- devp2p = Ethereum 専用束ね（discv5 + RLPx + eth/68）、libp2p = マルチチェーン用モジュール分離（Polkadot / Lighthouse / IPFS / Solana）。
- eth/68 の hash-first 設計で全 tx 再ブロードキャストの増幅問題を回避、Reth ベース chain はカスタムサブプロトコル追加で chain 固有 gossip を実現。
`,
                },
                {
                  title: 'レッスン1 — Reth の network crate を読む',
                  slug: 'p2p-reth-network-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 17,
                  xpReward: 45,
                  content: `# レッスン1 — Reth の network crate を読む

## 問い

自分の chain 向けに、カスタムサブプロトコル — 決済 finality hint や MEV bundle gossip など — を追加したい。**そのコードを reth ツリーのどこに置き、既存のどのピースにつなぐか？** Reth のネットワーク層は [\`crates/net/\`](https://github.com/paradigmxyz/reth/tree/main/crates/net) にあり、6 つのサブ crate に分散した Rust ~30k 行。

> 注: 以下のコード断片は構造理解のための概念スニペットです（\`...\` は省略箇所）。そのまま実行する用途ではありません。

## 原理（最小モデル）

- **6 サブ crate.** \`net/discv5\` / \`net/eth-wire\` / \`net/network\` / \`net/network-api\` / \`net/peers\` / \`net/dns\`。
- **読む順序 5 段.** network-api（API 表面）→ network（オーケストレーション）→ eth-wire（プロトコルメッセージ）→ peers（peer 状態機械）→ discv5（DHT）。
- **NetworkManager = 中央オーケストレータ.** Swarm + NetworkHandle + Discovery + NetworkState を統合、入力 3 本（peer メッセージ + 新 peer + コマンド）→ dispatcher 1 つ。
- **Swarm の状態機械.** NewConnection → Handshake → Negotiation → Active → Disconnected。peer 上限 25-50 + score ベース eviction policy。
- **eth-wire でメッセージ struct + RLP-derive.** \`#[derive(RlpDecodable, RlpEncodable)]\` で wire フォーマット自動生成。
- **Peer 状態機械の 4 構成.** Capability セット + Score（応答時間 / エラー率） + Stats（バイト数 / メッセージ数） + 接続状態。
- **カスタムサブプロトコル = chain 固有 gossip の拡張点.** NAME + VERSION + MESSAGES_COUNT + on_message で実装、eth/68 と同 RLPx 接続上で並走。
- **Peer scoring は戦略的ハンドル.** 悪い peer 排除だけでなく **既知インフラを優先**、MEV / プライバシー / パフォーマンス chain の戦略的選択。

## 具体例

6 サブ crate マップ:

| Crate | 役割 |
| :--- | :--- |
| \`net/discv5\` | discv5 実装（Kademlia DHT） |
| \`net/eth-wire\` | eth/68 メッセージ wire エンコード / デコード |
| \`net/network\` | トップレベルオーケストレーション |
| \`net/network-api\` | アプリケーション向け公開 API |
| \`net/peers\` | Peer 管理、scoring、eviction |
| \`net/dns\` | DNS ベース peer discovery（discv5 代替） |

読む順序: network-api → network → eth-wire → peers → discv5。

NetworkManager（[\`crates/net/network/src/manager.rs\`](https://github.com/paradigmxyz/reth/tree/main/crates/net/network)）:

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

run ループ:
1. \`swarm\` を poll → peer メッセージ
2. \`discovery\` を poll → 新規発見 peer
3. \`from_handle_rx\` を poll → コマンド（「この tx をブロードキャスト」）
4. 各イベントを dispatch

**入力 3 本、dispatcher 1 つ = reth ネットワーキングの心臓**。

Swarm 状態機械:

\`\`\`
NewConnection → Handshake → Negotiation → Active → Disconnected
\`\`\`

各遷移の意味:
- **NewConnection**: TCP 接続確立 or accept
- **Handshake**: RLPx で認証
- **Negotiation**: サポートサブプロトコル（eth/68 など）合意
- **Active**: メッセージ交換
- **Disconnected**: 正常終了 or エラー

Swarm は peer 数上限（25-50 active）+ eviction policy（score 低 peer を新接続で drop）を強制。

eth-wire メッセージ struct:

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

Peer 状態機械の 4 構成:
- **Capability セット**: サポートサブプロトコル
- **Score**: 応答時間 / エラー率 / banhammer から算出
- **Stats**: 送受信バイト数、メッセージタイプ別、タイミング
- **接続状態**: handshake / negotiation 段階

カスタムサブプロトコル例:

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

NetworkManager に登録 → eth/68 と同 RLPx 接続上で並走。**新 TCP port / 別 discovery 不要**、既存 peering 使い回し。

Peer scoring 戦略例:

- **MEV 関連 chain**: tx 伝播速度で peer scoring
- **プライバシー特化 chain**: メタデータ漏洩度で peer scoring
- **パフォーマンス特化 chain**: 帯域・レイテンシで peer scoring
- **決済優先 chain（Tempo）**: 既知 merchant インフラを汎用 peer より高 score

## 失敗例（誤解）

「カスタムプロトコル = 別の TCP port + 別 discovery」— **間違い**。NetworkManager 登録で **eth/68 と同 RLPx 接続上で並走**。peer がカスタム NAME をサポートすれば送受信、しなければ無影響。**既存 peering をそのまま使う**。

「Peer scoring = 悪い peer の排除のみ」— **半分間違い**。デフォルトは悪い peer ペナルティだが **戦略的ハンドル** にもなる。Sequencer / MEV chain / プライバシー chain で「既知インフラ優先 / MEV 関連トラフィック routing」など chain 固有戦略。

「30k 行のコードを全部読まないと理解できない」— **間違い**。**読む順序 5 段**（network-api → network → eth-wire → peers → discv5）で表面から深層へ。中心は NetworkManager 1 つ、入力 3 本、dispatcher 1 つ。

> 🛑 **予測。** Reth のネットワークは ~6 サブ crate に分かれている。どんな関心事の分離が妥当？（ヒント: discovery / transport / サブプロトコルは分けるのが自然）（答え: ① **discovery**（discv5 + DNS）= 「peer を見つける」、② **transport**（network 内 swarm）= 「peer と話す（RLPx 接続管理）」、③ **サブプロトコル**（eth-wire）= 「何を話すか（メッセージ struct + RLP）」、④ **peer 管理**（peers）= 「誰と話すか（状態 + score + eviction）」、⑤ **公開 API**（network-api）= 「アプリケーション層に何を見せるか」、⑥ **オーケストレーション**（network）= 「全部を統合する 1 ループ」。**関心事分離 + 拡張点が明確** = カスタムサブプロトコルは eth-wire パターン + network 登録だけで足りる。）

## ステップで組み立てる

### Step 1: 6 サブ crate を即答

discv5 / eth-wire / network / network-api / peers / dns。

### Step 2: 読む順序 5 段

network-api → network → eth-wire → peers → discv5。

### Step 3: NetworkManager の入出力

入力 3 本（peer msg + 新 peer + cmd）→ dispatcher 1 つ。

### Step 4: Swarm 5 状態

NewConnection → Handshake → Negotiation → Active → Disconnected。

### Step 5: eth-wire の RLP-derive パターン

\`#[derive(RlpDecodable, RlpEncodable)]\` で wire フォーマット自動。**全メッセージ RLP**（tx / block と同じ）。

### Step 6: カスタムサブプロトコルの 4 要素

NAME + VERSION + MESSAGES_COUNT + on_message。

### Step 7: Peer scoring を戦略的に使う

悪い排除 + 既知インフラ優先 + chain 固有戦略（MEV / プライバシー / 帯域）。

## 答え合わせ

- **NetworkManager の poll 順序の重要性**: 順序が ① swarm（peer message）→ ② discovery（new peer）→ ③ command（broadcast）の場合、peer message を優先処理 → discovery が遅延しても既存接続継続。逆順だと discovery が忙しいときに既存接続のメッセージが詰まる → スループット低下。**ホットパス（peer message）を先に処理**。
- **カスタムプロトコルが既存 peering を使い回せる理由**: RLPx は **multiplexing 対応**（1 接続上で複数論理ストリーム）+ ネゴシエーション段階で双方の capability list を交換 → 双方サポートのプロトコルだけ active。カスタム NAME 追加でも eth/68 と並列、新 port 不要 + 新 handshake 不要 + 新 encryption 不要。
- **Peer scoring の戦略的活用例**: ① MEV chain で「低レイテンシ peer 優先」→ MEV 機会を先に取れる、② プライバシー chain で「Tor 経由 peer 優先」→ メタデータ漏洩最小化、③ 決済 chain で「既知 merchant ノード優先」→ 決済優先パケットの SLA、④ 帯域 chain で「高帯域 peer 優先」→ 大量データ転送効率化。**chain 固有目的に合わせて scoring 重み付け**。

## 合格基準

- 6 サブ crate を即答できる。
- 読む順序 5 段を順に言える。
- NetworkManager の入力 3 本と dispatcher 1 つを言える。
- Swarm 状態機械 5 段を順に言える。
- カスタムサブプロトコル 4 要素（NAME / VERSION / MESSAGES_COUNT / on_message）を即答できる。

## まとめ（3行）

- Reth network crate = 6 サブ crate（~30k 行）、中心は NetworkManager（入力 3 本、dispatcher 1 つ）、読む順序は API 表面 → 深層。
- カスタムサブプロトコル = NAME + VERSION + on_message で実装、eth/68 と同 RLPx 接続上で並走、新 port / 新 discovery 不要。
- Peer scoring は「悪い排除」だけでなく「chain 固有戦略」（MEV 速度 / プライバシー / 帯域 / 既知インフラ優先）の戦略的ハンドル。
`,
                },
                {
                  title: 'レッスン2 — カスタム gossip 構築（Reth 上の MEV-Boost 系メッセージング）',
                  slug: 'p2p-custom-gossip-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 50,
                  content: `# レッスン2 — カスタム gossip 構築（Reth 上の MEV-Boost 系メッセージング）

## 問い

Searcher ノードを走らせている。収益性の高い bundle を見つけた → 信頼できる builder の小集団にだけ送りたい。**eth/68 transaction gossip では public 前提で「全員が全員を relay」モデル**、「この特定の peer 集合にだけ送る」概念を持たない。**そのギャップを埋めるカスタムサブプロトコルとは？**

## 原理（最小モデル）

- **eth/68 の 3 前提（カスタムは全部壊す）.** Public（接続持つ誰でも見える）+ consensus 関連 + peer 全員 relay 協力。
- **カスタムが必要な 3 要素.** Private gossip（特定 peer 集合のみ）+ アプリ層 routing（capability ベース）+ カスタム署名（chain 固有認証）。
- **本番例 4 つ.** MEV-Boost bundle（private orderflow）+ 共有 sequencer pre-confirmation + 決済レール merchant attestation + L2 sequencer 間 coordination。
- **\`bundle/1\` プロトコル 4 メッセージ.** Hello（handshake）+ BundleAnnounce（hash + 期待利益）+ BundleRequest（hash + 要求者署名）+ BundleData（暗号化 payload）。
- **Private プロトコルの discovery 3 パターン.** Allowlist（peer ID ハードコード）+ Out-of-band 招待（Discord / GitHub で peer ID 配布、MEV-Boost）+ Tor routing（ネットワーク位置完全隠蔽）。
- **MEV-Boost の 4 役割対応.** Relayer（売り）+ Builder（組み立て）+ Proposer（勝ち選択）+ Sealed-bid auction。
- **DOS 対策 4 軸.** Announce spam（peer ごとレート制限 + 署名要求）+ 偽 bundle（要求時署名検証）+ 帯域食いつぶし（peer ごと上限 + eviction）+ Sybil（peer ID allowlist or PoS 紐付け）。

## 具体例

eth/68 の 3 前提とカスタムが破る部分:

| eth/68 前提 | カスタムで壊す |
| :--- | :--- |
| Public（接続持つ誰でも見える） | Private（特定 peer 集合のみ） |
| Consensus 関連 | アプリ層 routing |
| Peer 全員 relay 協力 | カスタム署名 |

\`bundle/1\` プロトコルの 4 メッセージ:

| メッセージ | 目的 |
| :--- | :--- |
| Hello | Handshake — サポート共有 |
| BundleAnnounce | 「Hash X は bundle、~Y gas 抽出」 |
| BundleRequest | 「Bundle X 送って」 |
| BundleData | フル bundle（送信者向け暗号化） |

メッセージ定義:

\`\`\`rust
#[derive(Debug, RlpDecodable, RlpEncodable)]
pub enum BundleMessage {
    Hello { protocol_version: u8, peer_capabilities: u64 },
    BundleAnnounce { bundle_hash: B256, expected_profit_gwei: u64 },
    BundleRequest { bundle_hash: B256, requester_signature: Bytes },
    BundleData { bundle_hash: B256, encrypted_payload: Bytes },
}
\`\`\`

ハンドラ実装:

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

Reth への登録:

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

Private プロトコルの discovery 3 パターン:

| パターン | 仕組み | 例 |
| :--- | :--- | :--- |
| Allowlist ベース | 参加者 peer ID をハードコード | 内部 sequencer ネット |
| Out-of-band 招待 | 別チャネル（Discord / GitHub）で peer ID 配布 | **MEV-Boost** |
| Tor routing | ネットワーク位置完全隠蔽 | 高プライバシー chain |

MEV-Boost の 4 役割対応:

| 概念 | 実装 |
| :--- | :--- |
| Relayer と builder の分離 | Relayer（売り窓口）+ Builder（組立て）+ Proposer（勝ち選択） |
| Sealed-bid auction | Builder 入札、proposer が最高額選択 |
| 評判ベース | Builder 評判蓄積、relayer が不正参加者追跡 |
| ネットワーク層 trust | 全て private p2p で完結、on-chain には乗らない |

DOS 対策 4 軸:

| 攻撃 | Mitigation |
| :--- | :--- |
| アナウンス spam | Peer ごとレート制限 + 署名付きアナウンス必須 |
| 偽 bundle | Announce 時署名要求、要求時に検証 |
| 帯域食いつぶし | Peer ごと帯域上限 + 超過で eviction |
| Sybil（偽 peer 大量） | Peer ID allowlist or PoS 紐付け |

## 失敗例（誤解）

「eth/68 で MEV bundle を gossip すれば良い」— **間違い**。eth/68 は public 前提、bundle がネットワーク上の全員に漏れる → front-run される → searcher の収益消失。**「private gossip」概念がない**。

「discv5 で private peer 集合を見つけられる」— **間違い**。デフォルト discv5 は capability list を **丸ごとアナウンス** → ネットワークスキャンする者が「このノードは bundle/1 サポート」と特定可能 → プライバシー目標台無し。**Allowlist / Out-of-band / Tor のいずれか**。

「DOS 対策は後回しで良い」— **間違い**。カスタムプロトコルは新たな攻撃面、デフォルト eth/68 の実戦防御がない。**コアロジックと並行して保護を組み込む**。最低 4 軸（spam / 偽 bundle / 帯域 / Sybil）を最初から。

> 🛑 **予測。** Private な peer 集合に「MEV bundle を売りに出す」メッセージをブロードキャストしたい。なぜ eth/68 transaction を使わない？ 別 gossip プロトコルを立ち上げる利点は？（答え: ① **eth/68 は public 前提**、bundle がネットワーク上の全員に漏れる → front-run される → searcher 収益消失、② **eth/68 は「特定 peer 集合へ送る」概念がない**、全員 relay モデル = 制御不能、③ **eth/68 は consensus データ前提**、アプリ層 routing（builder への入札、relayer の選択）が表現不能。**カスタムサブプロトコル 3 利益** = ① Private（peer set 制御）+ ② Application-layer routing（capability ベース）+ ③ Custom 署名（chain 固有認証）。MEV-Boost / 共有 sequencer / 決済レール / 共有 sequencer coordination はすべてこのパターン。）

## ステップで組み立てる

### Step 1: eth/68 の 3 前提と破る部分

Public / Consensus / 全員 relay → Private / アプリ層 routing / カスタム署名。

### Step 2: \`bundle/1\` 4 メッセージ

Hello / Announce / Request / Data。

### Step 3: SubProtocol 4 必須要素

NAME / VERSION / MESSAGE_COUNT / on_message。

### Step 4: Private discovery 3 パターン

Allowlist / Out-of-band（MEV-Boost）/ Tor。**discv5 は丸ごとアナウンスで使えない**。

### Step 5: MEV-Boost 4 役割の対応

Relayer / Builder / Proposer / Sealed-bid auction。

### Step 6: DOS 対策 4 軸を最初から

Spam（レート + 署名）+ 偽 bundle（署名検証）+ 帯域（上限 + eviction）+ Sybil（allowlist / PoS）。

### Step 7: chain 固有用途への当てはめ

Telos（intent matching）/ mppsol（決済 attestation）/ Hyperliquid（独自 transport）/ Tempo（決済 finality hint）。**カスタム gossip は MEV / 決済 / sequencer coordination の自然な拡張点**。

## 答え合わせ

- **eth/68 がカスタムに合わない 3 理由**: ① **Public 前提**（MEV bundle が漏れる）、② **Consensus 関連メッセージ前提**（アプリ層 routing 不可）、③ **全員 relay 協力前提**（特定 peer 集合に送る概念なし）。カスタムサブプロトコルの 3 利益（Private / Application routing / Custom 署名）が eth/68 の 3 前提を反転。
- **discv5 が Private プロトコルに使えない理由**: capability list を **丸ごとアナウンス** → ネットワークスキャンする者が「このノードは \`bundle/1\` サポート」と特定可能 → プライバシー目標台無し。代替は Allowlist（peer ID ハードコード）/ Out-of-band 招待（Discord / GitHub、MEV-Boost）/ Tor routing。
- **DOS 対策を最初から組む理由**: カスタムプロトコルは新たな攻撃面、デフォルト eth/68 の実戦防御がない → 1 peer がコードを介して他 peer に flood 可能 = DOS amplifier 化。Coreロジックと並行して 4 軸（spam / 偽 bundle / 帯域 / Sybil）保護を組む。**後回しは致命的**。

## 合格基準

- eth/68 の 3 前提とカスタムが破る部分を言える。
- \`bundle/1\` の 4 メッセージを即答できる。
- SubProtocol の 4 必須要素を言える。
- Private discovery 3 パターン（Allowlist / Out-of-band / Tor）を例で言える。
- DOS 対策 4 軸を即答できる。

## まとめ（3行）

- カスタム gossip = eth/68 の 3 前提（Public / Consensus / 全員 relay）を破る chain 固有メッセージング、3 利益（Private peer set + アプリ層 routing + カスタム署名）。
- 実装は SubProtocol trait の 4 要素（NAME + VERSION + MESSAGE_COUNT + on_message）+ Reth NodeBuilder で 1 行登録、eth/68 と同 RLPx 接続上で並走。
- 本番例 = MEV-Boost（Relayer + Builder + Proposer + Sealed-bid auction）+ 共有 sequencer coordination + 決済レール attestation、DOS 対策 4 軸（spam / 偽 / 帯域 / Sybil）を最初から組む。
`,
                },
                {
                  title: 'ファイナルクイズ — P2P ネットワーキング',
                  slug: 'p2p-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# ファイナルクイズ — P2P ネットワーキング

ネットワーク層の最終チェック。Reth ベース chain で peer scoring、カスタム gossip、MEV-Boost 系メッセージングを設計するために必要。

レッスン0-2 を通じて: P2P 基礎（2 層 = Discovery + Transport / devp2p vs libp2p / Kademlia XOR distance / RLPx ≈ TLS の差 / eth/68 hash-first）/ Reth network crate（6 サブ crate / NetworkManager 入力 3 本 + dispatcher 1 つ / Swarm 5 状態 / カスタムサブプロトコル 4 要素）/ カスタム gossip 構築（eth/68 の 3 前提を破る / bundle/1 4 メッセージ / Private discovery 3 パターン / MEV-Boost 4 役割 / DOS 対策 4 軸）の構造的事実を確認する。
`,
                  quizQuestions: [
                    {
                      "question": "devp2p (Ethereum) と libp2p (Polkadot、IPFS) の **構造的な違い** は何か?",
                      "options": [
                        "devp2p は libp2p より速い。",
                        "devp2p は Ethereum 専用に設計されており、Ethereum 固有のプロトコルを前提とする。一方 libp2p はモジュラーかつマルチチェーン対応で、transport、encryption、multiplexing を組み合わせ可能なピースに分離している。Ethereum が libp2p を使わない主な理由は歴史的なもので、devp2p の方が先に存在していた。",
                        "devp2p は Solana のみ、libp2p は Ethereum のみで動く。",
                        "libp2p は peer discovery をサポートしない。"
                      ],
                      "correctIndex": 1,
                      "explanation": "2 つの異なる設計哲学である: 専用設計 (devp2p) と モジュラー設計 (libp2p)。どちらも実運用に耐えており、それぞれにトレードオフがある。Ethereum の execution 層は devp2p、consensus 層 (Lighthouse) は libp2p を採用している。Reth ベースの chain にとっては、devp2p をそのまま引き継ぐのが自然な選択である。"
                    },
                    {
                      "question": "**discv5** は Kademlia DHT を採用している。**なぜ中央ディレクトリではなく Kademlia が peer discovery に選ばれたのか?**",
                      "options": [
                        "Kademlia の方が中央集権型より速いから。",
                        "中央ディレクトリは単一障害点になりやすく、検閲のレバーにもなる。Kademlia は分散型で、すべてのノードが他の peer の発見を助け、特定の当事者がネットワークを支配することはない。トレードオフは O(log N) の lookup vs O(1) だが、セキュリティと分散性で得るものの方が大きい。",
                        "Kademlia の方がメモリ効率が良いから。",
                        "他に選択肢がなかったから。"
                      ],
                      "correctIndex": 1,
                      "explanation": "中央集権型は、検閲や操作の単一障害点になる。Kademlia は分散型だが、その分だけ複雑である。Permissionless な blockchain ネットワークでは、効率性よりも分散性が優先される。わずかなレイテンシのコストは、得られるセキュリティ上の利点と引き換えに許容できる範囲である。"
                    },
                    {
                      "question": "eth/68 では、**transaction はまず hash でアナウンスされ**、フルボディでは送られない。**なぜか?**",
                      "options": [
                        "Hash の方がサイズが小さいから。",
                        "ほとんどの peer は、ほとんどの tx を既に持っている (伝播の過程で目にしている)。Hash でアナウンスし、手元にないものだけをフルボディで要求すれば、**すべての tx をフルサイズですべての peer に再ブロードキャストするのを避けられる**。ネットワーク規模で見れば、莫大な帯域の節約になる。",
                        "Tx のフルボディは暗号化されるが、hash は暗号化されないから。",
                        "Hash でのアナウンスは EIP-1559 で必須化されたから。"
                      ],
                      "correctIndex": 1,
                      "explanation": "帯域の最適化である。Tx がネットワーク内を伝播すれば、すべての peer が hash を素早く目にする。手元にないものだけフルボディを要求すれば事足りるため、ネットワーク全体の総帯域は、フル tx をブロードキャストする場合と比較して約 10 分の 1 に削減される。スケーリングを考えるうえで決定的な工夫である。"
                    },
                    {
                      "question": "**Reth の NetworkManager** は中央オーケストレータの役割を担っている。**poll される 3 つのストリームは何か?**",
                      "options": [
                        "CPU、メモリ、ディスク。",
                        "Swarm (アクティブな接続から流れてくる peer メッセージ)、Discovery (discv5 や DNS から得られる新規 peer)、from_handle_rx (アプリケーションコードから送られてくるコマンド — tx のブロードキャスト、block の要求など)。",
                        "RPC、WebSocket、IPC。",
                        "Block、transaction、receipt。"
                      ],
                      "correctIndex": 1,
                      "explanation": "中央のイベントループが、3 つの入力ストリームを統合する: 外部からのトラフィック (Swarm)、新規 peer (Discovery)、アプリケーションからのコマンド (handle チャネル)。NetworkManager がそれらをすべて poll し、dispatch する — これが Reth ネットワーキングの心臓部である。"
                    },
                    {
                      "question": "Reth ベースの chain に **カスタム gossip** を追加する場合 (例: MEV bundle マーケットプレイス向けなど)、アーキテクチャ的にはどう取り組むか?",
                      "options": [
                        "eth/68 を修正して新しいメッセージタイプを追加する。",
                        "**カスタムサブプロトコル** を実装し、eth/68 と同じ RLPx 接続の上で動かす。メッセージの enum を定義し (RLP エンコード)、SubProtocol トレイトを実装し、NetworkManager に登録する。カスタムプロトコルは eth/68 と干渉せず、並走する。",
                        "reth を fork してコアにプロトコルを追加する。",
                        "devp2p ではなく libp2p を使う。"
                      ],
                      "correctIndex": 1,
                      "explanation": "サブプロトコルパターンが答えである。reth のネットワーキングは、設計の段階から拡張可能になっている。プロトコルを一つの「層」として追加し、複数のプロトコルが同じ RLPx 接続を共有する。eth/68、snap (state sync)、そして自作のカスタムプロトコルが、すべて並行して動く。インフラはこの仕組みでスケールする。"
                    },
                    {
                      "question": "Reth の **Peer scoring** は不正な振る舞いにペナルティを与える。では、不正検知だけを見ていると見落としがちな **積極的なユースケース** とは何か?",
                      "options": [
                        "積極的な使い方は存在しない。",
                        "Peer scoring は **特定の peer を優遇する** 用途にも使える。たとえば sequencer が、既知の良質な merchant インフラをランダムな peer よりも高くスコアリングし、そうした peer からのフローを優先的に処理したり、低レイテンシを保証したりできる。これによって peer scoring は、防御的 (悪い peer をブロック) なものから、戦略的 (良い peer にルーティング) なものへとシフトする。",
                        "積極的 scoring はマーケティング上の概念で、技術的な実体はない。",
                        "Peer scoring はフルノードにしか関係しない。"
                      ],
                      "correctIndex": 1,
                      "explanation": "デフォルトの scoring は反応的なもの (悪い peer を drop する) だが、特化型 chain にとっては戦略的な道具にもなります — MEV 関連の情報を既知の builder に、決済データを merchant ノードに、といった形でルーティングできるのである。これこそが、chain 固有のネットワーキング戦略における Reth の拡張ポイントである。"
                    },
                    {
                      "question": "MEV-Boost のような仕組みになぜ **カスタム gossip プロトコル** が必要なのか? **デフォルトの eth/68 transaction gossip** がすでに存在しているにもかかわらず。",
                      "options": [
                        "カスタム gossip の方が eth/68 より速いから。",
                        "eth/68 は canonical chain data (block、tx、receipt) を運ぶためのもので、public-by-default かつ cooperative-relay を前提としている。一方 MEV-Boost には、**private なルーティング** (特定の peer にしか bundle が見えない)、**アプリケーション層のオークション** (bundle に値段がつく)、**プロトコル外の認証** (relayer の identity) が必要となる。これらは on-chain の semantics には乗らない、アプリケーション固有の関心事である。",
                        "MEV-Boost は HTTPS を要求するが、eth/68 はそれをサポートしないから。",
                        "カスタム gossip は EVM 仕様で要求されているから。"
                      ],
                      "correctIndex": 1,
                      "explanation": "eth/68 は、chain に乗らないメッセージを運ぶには間違った抽象である。カスタムプロトコルこそが、private なルーティング、アプリケーション層のシグナリング、chain から独立した semantics を提供する。MEV-Boost、共有 sequencer の coordination、決済レールの routing — これらはすべてこの層に居場所がある。"
                    }
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
