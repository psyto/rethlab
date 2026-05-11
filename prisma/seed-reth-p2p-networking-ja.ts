import { PrismaClient } from '@prisma/client';

export async function seedRethP2PNetworkingJA(prisma: PrismaClient) {
  const tags = ['reth', 'p2p', 'devp2p', 'libp2p', 'gossip', 'peer-scoring', 'networking', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-p2p-networking-ja',
      title: 'P2P ネットワーキング内部 — devp2p からカスタム gossip まで',
      description:
        'すべての blockchain が依存するが少ないエンジニアしか理解しないネットワーク層。devp2p vs libp2p、peer discovery (Kademlia、ENR)、RLPx 暗号化、transaction gossip、eth/68 サブプロトコル、reth の network crate を読み、peer scoring、MEV / private orderflow / sequencer coordination 用のカスタム gossip 動作を構築。',
      difficulty: 'EXPERT',
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

すべての Ethereum ノードが他ノードと **devp2p** 経由で通信 — Ethereum 目的別 peer-to-peer プロトコル。他 chain は **libp2p** (モジュラー、マルチチェーン) かカスタムスタック使用。P2P 層は壊れるまで invisible: sync stall、gossip が tx を drop、peer scoring がネットワークから boot するとき、下で何が起きているか知る必要。

> 🛑 **スクロール前に予測。** Reth ノードがゼロから sync。**最初に peer を見つけるか、ブロックを見つけるか?** 既知 peer なしでどう peer 見つけるか?

## 1. 2 層

P2P ネットワーキングは 2 つの関心事に分割:

| 層 | 仕事 | Ethereum でのプロトコル |
| :--- | :--- | :--- |
| **Discovery** | 「Peer を見つける」 | discv4 / discv5 (Kademlia DHT) |
| **Transport** | 「Peer と話す」 | RLPx (暗号化 TCP) |

Discovery は **bootstrapping 問題** — 何かする前に peer 必要、peer なしでどう peer 見つける? 答え: hardcoded bootnode。

## 2. devp2p — Ethereum のプロトコル

[devp2p](https://github.com/ethereum/devp2p) は Ethereum ノードが使うプロトコル。Ethereum 固有 (マルチチェーンでない)。定義:

- **discv5**: Kademlia DHT 経由 peer discovery
- **RLPx**: 暗号化、認証 TCP transport
- **eth/68** (現サブプロトコル): ブロック + transaction gossip

Reth ノード走らせる時、すべてがこれ起こっている:

\`\`\`mermaid
flowchart LR
    Boot["Bootnode"] -->|seed peer list| You["自 Reth ノード"]
    You -->|discv5 ping| Peer1["Peer 1"]
    You -->|discv5 ping| Peer2["Peer 2"]
    Peer1 -->|RLPx ハンドシェイク| You
    You -->|eth/68: ブロック、txs| Peer1
    You -->|eth/68: ブロック、txs| Peer2
\`\`\`

## 3. discv5 — Kademlia 経由 peer discovery

Kademlia は **分散ハッシュテーブル (DHT)**。各ノードが 256 bit ID 持つ (公開鍵から導出)。「ターゲット ID に近い」peer を見つけるには、知っている peer に query、彼らが知っている最も近い peer を返す — 再帰 lookup。

Ethereum 向け:
- 各 peer が **ENR (Ethereum Node Record)** 公開 — ID、IP、port、能力
- Discovery query が ENR 返す
- Bootnode は well-known 開始点 (chainspec 内)

> 🛑 **理解度チェック。** 「Kademlia は最も近い peer を見つける」**任意の peer 欲しい時、なぜ「最も近い」が重要?** 答えが「routing 用」だけなら再読。

Kademlia の「近さ」はノード ID 上の XOR distance — 純粋にトポロジカル、地理的意味なし。ポイント: ID で近いノードが互いに効率的に見つかる (O(log N) lookup)。**スケーラブル** に何百万のネットワークで任意の peer 見つける方法。

## 4. RLPx — Transport 層

Discovery 後、ノードは実際に話すために RLPx 使用:

- **Handshake**: ECDH 鍵交換 + 署名検証
- **Encryption**: 方向ごと鍵で AES-CTR
- **Framing**: 長さ prefix 付き RLP エンコードメッセージ

RLPx は **大体 TLS for Ethereum** — 暗号化、認証、順序付けバイトストリーム。Ethereum が TLS でなく独自プロトコル持つ理由: 2015 前歴史、加えて微妙な要件 (peer ID = pubkey、中央 CA なし)。

## 5. eth/68 — サブプロトコル

RLPx 上で peer は **eth/68**、現 Ethereum サブプロトコル、を話す。メッセージ含む:

| メッセージ | 目的 |
| :--- | :--- |
| Status | Handshake — fork バージョン、chain ID、head |
| NewBlock | 新ブロックアナウンス |
| BlockBodies | ブロックボディ要求/応答 |
| NewPooledTransactionHashes | Pending tx (hash のみ) アナウンス |
| PooledTransactions | フル tx ボディ要求 |
| Receipts | Receipt 要求/応答 |

注: eth/68 で、transaction は **hash 先にアナウンス** — peer は持っていなければフルボディだけ要求。これが全 tx の全 peer への再ブロードキャスト避ける。

## 6. libp2p — 代替

[libp2p](https://github.com/libp2p/) は **モジュラー、マルチチェーン** P2P インフラ。使用:
- Polkadot (libp2p ベース)
- IPFS (libp2p の起源)
- Solana (カスタム transport だが libp2p 概念)
- 多くの新 chain

libp2p は関心事分離: discovery (別)、transport (TCP/QUIC/WebRTC)、encryption (Noise)、multiplexing (yamux/mplex)。必要なもの compose。

Ethereum が libp2p 使わない理由: 歴史。devp2p が先に存在。切り替え難。一部の新 Ethereum ツール (Lighthouse consensus client) は libp2p 使用; reth は devp2p 使用 (execution 層プロトコルと一致)。

## 7. Reth ベース chain 向け

Reth 上の新 chain には選択肢:

- **devp2p 使用** (デフォルト、reth が提供) — そのまま動く
- **devp2p カスタマイズ** — カスタムサブプロトコル追加 (e.g., 決済固有メッセージ用 \`tempo/1\`)
- **libp2p sidecar 追加** — 違うネットワーキング semantics 必要な場合

Tempo 向け: **カスタムサブプロトコル付き devp2p** likely、決済固有 gossip (e.g., merchant identity attestation、payment finality hint)。

Hyperliquid 向け: 彼らのカスタム transport (HyperBFT 通信) は **execution 層 P2P から分離** — devp2p 上に独自ネットワークを consensus 用に重ねた。

## 8. 練習

1. [discv5 spec](https://github.com/ethereum/devp2p/blob/master/discv5/discv5.md) 開いて 4 メッセージタイプ特定
2. Reth の [\`crates/net/network\`](https://github.com/paradigmxyz/reth/tree/main/crates/net/network) ブラウズ — エントリポイント見つける
3. 特定: 決済固有 gossip 用カスタムサブプロトコルどう追加?

> 最終チェック: 一文で、**bootnode** が解決する bootstrapping 問題は? **答えに「peer 見つけるには peer 必要」がなければ §3 を再読**。`,
                },
                {
                  title: 'Reth の network crate を読む',
                  slug: 'p2p-reth-network-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 17,
                  xpReward: 45,
                  content: `# Reth の network crate を読む

Reth のネットワーク層は [\`crates/net/\`](https://github.com/paradigmxyz/reth/tree/main/crates/net) に。実質的 — discovery、transport、gossip、peer 管理を処理する Rust ~30k 行。本レッスンが orientation: 何がどこに、各 crate が何するか、カスタム chain にどこで拡張するか。

> 🛑 **スクロール前に予測。** Reth のネットワークは ~5 サブ crate。**どんな関心事分離が意味あるか?** 読む前にモジュールスケッチ。(ヒント: discovery、transport、サブプロトコルは明らかな出発点。)

## 1. ネットワーク crate マップ

| Crate | 役割 |
| :--- | :--- |
| \`net/discv5\` | discv5 実装 (Kademlia DHT) |
| \`net/eth-wire\` | eth/68 メッセージ wire エンコード/デコード |
| \`net/network\` | トップレベルオーケストレーション |
| \`net/network-api\` | アプリコード用公開 API |
| \`net/peers\` | Peer 管理、scoring、eviction |
| \`net/dns\` | DNS ベース peer discovery (discv5 代替) |

全部理解したいなら読む順序:
1. \`network-api\` (API 表面)
2. \`network\` (メインオーケストレーション)
3. \`eth-wire\` (プロトコルメッセージ)
4. \`peers\` (peer 状態機械)
5. \`discv5\` (discovery DHT)

## 2. NetworkManager — 中央オーケストレータ

\`crates/net/network/src/manager.rs\` で、\`NetworkManager\` が所有する中央 struct:

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

\`run\` ループ:
1. \`swarm\` を peer メッセージ用に poll
2. \`discovery\` を新発見 peer 用に poll
3. \`from_handle_rx\` をコマンド (e.g., 「この tx をブロードキャスト」) 用に poll
4. 各イベント dispatch

これが **全ネットワーキングの中央イベントループ**。すべての peer メッセージ、すべての discovery イベント、すべてのアプリ initiated ブロードキャストがここを通る。

> 🔍 **リポで探す。** \`crates/net/network/src/manager.rs\` を開いてメイン \`poll_next\` or \`run\` メソッド見つける。**Polling 順序は?** なぜそれが重要かも?

## 3. Swarm — peer 接続プール

\`Swarm\` がアクティブ peer 接続管理。各接続は stage を通る:

\`\`\`
NewConnection → Handshake → Negotiation → Active → Disconnected
\`\`\`

各 peer 向け:
- **NewConnection**: TCP 接続 or accept
- **Handshake**: RLPx 認証
- **Negotiation**: サポートサブプロトコル合意 (eth/68 等)
- **Active**: メッセージ交換
- **Disconnected**: graceful close or エラー

Swarm が **peer 制限** (典型 25-50 アクティブ) と **eviction policy** (低スコア peer drop) 強制。

## 4. eth-wire — プロトコルメッセージ

eth/68 の各メッセージタイプは RLP エンコード付き Rust struct:

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

Derive マクロが wire フォーマット生成。**すべてのメッセージは RLP** — transaction と block に使う同じエンコード。

カスタムサブプロトコル向けに、独自メッセージ struct 定義してネットワークに登録。

## 5. Peer 状態機械

\`crates/net/peers/src/peer.rs\` が peer ごと状態追跡:

- **Capability セット**: この peer がサポートするサブプロトコル
- **Score**: 応答時間、エラー率、banhammer イベントベース
- **Stats**: バイト送受信、タイプ別メッセージ、タイミング
- **接続状態**: handshake 完了、サブプロトコル negotiated、等

Peer scoring 重要: 不正動作 peer は evict。デフォルト scoring が罰則:
- 遅い応答
- Invalid メッセージ (悪 RLP、間違い hash)
- 不正動作 (古い tx 繰り返し送信、持っていない data 持っていると主張)

## 6. カスタムサブプロトコル追加

カスタム chain (Tempo、Hyperliquid、etc.) 向け、**chain 固有 gossip** が欲しい:

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

これをネットワークマネージャに登録、カスタムプロトコルが同じ RLPx 接続上で eth/68 と並んで動く。

これが chain 固有ネットワーキングの **拡張点**。Tempo は (おそらく) 決済固有 gossip にこれ使用。任意の chain 固有プロトコル出荷するならこれ使用。

## 7. Peer scoring の機会

デフォルト peer scoring は汎用 — 悪役罰則。特化 chain 向け:

- **MEV 関連 chain**: tx propagation 速度で peer スコア
- **プライバシー特化 chain**: メタデータ漏洩で peer スコア
- **性能特化 chain**: 帯域 + レイテンシで peer スコア

Tempo 向け: 決済優先 chain は **既知 merchant インフラ** vs 汎用 peer で peer スコアの可能性。これは chain 固有ネットワーキング決定。

> 🛑 **理解度チェック。** 「Peer scoring は bad peer を out にするだけ」**半分正しい**。Sequencer に有用な peer scoring の積極利用は? 答えに「既知インフラ優先」or「MEV 関連 routing」がなければこのセクション再読。

## 8. 練習

1. \`crates/net/network/src/manager.rs\` ブラウズ — メイン poll ループ見つける
2. \`crates/net/eth-wire\` 開く — メッセージ enum 見つける
3. 特定: 決済 finality hint 用カスタムメッセージタイプどう追加?
4. 推定: 典型 reth ノードは何 peer 維持? これが 1000+ chain にどうスケール?

> 最終チェック: 一文で、reth のどこで chain 固有 gossip 用カスタムサブプロトコル追加? **答えに NetworkManager or サブプロトコル登録がなければ §6 を再読**。`,
                },
                {
                  title: 'カスタム gossip 構築 — Reth 上の MEV-Boost 系メッセージング',
                  slug: 'p2p-custom-gossip-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 50,
                  content: `# カスタム gossip 構築 — Reth 上の MEV-Boost 系メッセージング

デフォルト eth/68 gossip は vanilla chain に問題ない。だが特化インフラ — MEV-Boost、private mempool、共有 sequencer coordination、決済 routing — は **カスタム gossip プロトコル** 必要。本レッスンが最小版構築: reth のネットワーキング上の peer-to-peer メッセージバスで、アプリが chain 固有メッセージをブロードキャスト + 受信可能に。

> 🛑 **スクロール前に予測。** Private peer セットに「この MEV bundle 売り出し」をブロードキャストしたい。**なぜ eth/68 transaction 使わない?** Tx gossip 悪用ではなく別 gossip プロトコルが与えるものは?

## 1. 動機 — デフォルト gossip が失敗する時

eth/68 gossip は **canonical chain data** 用 — block、transaction、receipt。前提:
- メッセージは public (接続持つ誰でも見る)
- メッセージは consensus について
- Peer が relay 協力

非 canonical メッセージ向けに必要:
- **Private gossip** — peer セットだけ見える
- **アプリケーション層 routing** — capability ベースで特定 peer に route
- **カスタム署名** — chain 固有認証

例:
- MEV-Boost bundle (private orderflow)
- 共有 sequencer pre-confirmation
- 決済レール merchant attestation
- L2 sequencer 間 coordination

## 2. 最小カスタムプロトコル

\`bundle/1\` というプロトコル構築。仕事: peer が「収益的 bundle 持つ」とアナウンス、他が要求可能。

3 メッセージタイプ:

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

Reth 互換サブプロトコル実装:

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
        // Peer がアロー list 内か認証
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
                // Bundle 持っていなければ要求
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
                // 要求署名検証
                verify_signature(&bundle_hash, &requester_signature)?;

                // Bundle 送信
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
                // 復号化 + 保存
                let decrypted = decrypt_from_peer(&peer, encrypted_payload)?;
                let bundle = Bundle::deserialize(&decrypted)?;
                self.known_bundles.insert(bundle_hash, bundle);
                Ok(None)
            }
        }
    }
}
\`\`\`

これがプロトコル。~70 行で peer-to-peer bundle マーケットプレイス。

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

それだけ。カスタムプロトコルが eth/68 と同じ RLPx 接続上で動く。\`bundle/1\` サポート peer がこれらメッセージ送受信。サポートしない peer は影響なし。

## 5. Private プロトコル向け peer discovery

デフォルト discv5 は全 capability list アナウンス — 誰でも「このノードは bundle/1 サポート」見える。Private プロトコル向けに、典型的に:

- **Allowlist ベース**: プロトコル参加者の peer ID hardcode
- **Out-of-band 招待**: peer が別チャネル経由で連絡先交換
- **Tor routed**: ネットワーク位置完全隠蔽

MEV-Boost 系: bundle relay が peer ID を Discord、GitHub などで配布 — out-of-band。プロトコルは既知当事者間 point-to-point。

## 6. MEV-Boost パターン

[Flashbots の MEV-Boost](https://github.com/flashbots/mev-boost) が本番参照。鍵概念、カスタムプロトコルに適用:

| 概念 | 実装 |
| :--- | :--- |
| **Relayer-builder 分離** | Relayer (「ブロック売出」公開)、builder (ブロック構築)、proposer (勝ち入札選択) |
| **Sealed-bid auction** | Builder が入札; proposer が最高選択 |
| **評判ベース** | Builder が評判 earn、relayer が悪用者追跡 |
| **ネットワーク層 trust** | 全部 private p2p 上 — on-chain でない |

Tempo のような決済優先 chain 向け、MEV-Boost 等価物 likely:

- **Relayer**: merchant 支払い bundle 集約
- **Builder**: 決済優先ブロック構築 (merchant tx + bundle 決済)
- **Sequencer**: 最収益的 + 最 merchant フレンドリ bundle 選択

Tempo が sequencer 分散化したら 2026 出荷可能。

## 7. DOS 保護問題

カスタムプロトコルが新攻撃面公開:

| 攻撃 | Mitigation |
| :--- | :--- |
| Spam アナウンス | Peer ごとレート制限; 署名済アナウンス要求 |
| Fake bundle | Announce 時署名要求 + 要求時検証 |
| 帯域消耗 | Peer ごと帯域上限; 超過時 eviction |
| Sybil (多 fake peer) | Peer ID allowlist or proof-of-stake binding |

これらなしだとカスタムプロトコルは DOS amplifier。コアロジックと並行に保護構築。

## 8. Hiro のプロジェクト向け

### Telos (Tempo↔HL intent matching)

カスタム gossip 役立つ:
- 「Intent matching 機会持つ」
- 「この intent 実行に X 入札」
- 「Intent 実行 proof」

これらは Ethereum tx semantics に合わない。reth のネットワーキング上カスタムプロトコルが自然 fit。

### mppsol (cross-VM 決済)

Tempo から Solana への決済 attestation は CCIP 経由 (すでにカバー)。だが **intra-Tempo coordination** 向け、カスタム gossip:
- chain 到達前に pending merchant 決済アナウンス
- HA 用 merchant ノード間 coordinate

### Hyperliquid 統合

HL のネットワーク参加ノード構築するなら、彼らのカスタムプロトコル理解必要。Public でないが、パターンは同じ: RLPx 系 transport 上のカスタムサブプロトコル。

## 9. 練習

1. 「Merchant attestation ブロードキャスト」用 2 メッセージプロトコルスケッチ
2. 特定: Allowlist がどう Sybil 攻撃防ぐ?
3. 考える: 1000 メッセージ/秒を 10 peer にブロードキャストの帯域コスト?
4. [MEV-Boost spec](https://github.com/flashbots/mev-boost-spec) 読んで relayer プロトコル見つける

## 10. 読み物

- [reth network crate](https://github.com/paradigmxyz/reth/tree/main/crates/net)
- [MEV-Boost docs](https://docs.flashbots.net/flashbots-mev-boost/architecture-overview)
- [libp2p tutorials](https://docs.libp2p.io/) — モジュラーネットワーキング理解用

> 最終チェック: 一文で、なぜ「カスタム gossip」が MEV マーケットや決済 routing のような chain 固有アプリの自然な拡張か? **答えに「デフォルト gossip は canonical chain data のみ」がなければ §1 を再読**。`,
                },
                {
                  title: 'ファイナルクイズ: P2P ネットワーキング',
                  slug: 'p2p-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# ファイナルクイズ: P2P ネットワーキング

P2P 最終チェック。カスタムプロトコル統合、MEV インフラ構築、reth のネットワーキング拡張に必要。`,
                  quizQuestions: [
                    {
                      question: 'devp2p (Ethereum) と libp2p (Polkadot、IPFS) の **構造的違い** は?',
                      options: [
                        'devp2p は libp2p より速い。',
                        'devp2p は Ethereum 目的別、Ethereum 固有プロトコル仮定。libp2p はモジュラー、マルチチェーン — transport、encryption、multiplexing を構成可能ピースに分離。Ethereum が libp2p 使わない主な理由は歴史的; devp2p が先に存在。',
                        "devp2p は Solana のみ、libp2p は Ethereum のみで動く。",
                        "libp2p は peer discovery サポートしない。",
                      ],
                      correctIndex: 1,
                      explanation: '2 つの違う設計哲学: 目的別 (devp2p) vs モジュラー (libp2p)。両方とも動く; 両方ともトレードオフ。Ethereum execution 層は devp2p; consensus 層 (Lighthouse) は libp2p。Reth ベース chain 向け、devp2p が自然な継承。',
                    },
                    {
                      question: '**discv5** は Kademlia DHT 使う。**なぜ中央ディレクトリではなく Kademlia が peer discovery に選ばれた?**',
                      options: [
                        'Kademlia が中央集権より速い。',
                        "中央ディレクトリは単一障害点で検閲点; Kademlia は分散化 — すべてのノードが他の peer discovery 助ける、単一当事者がネットワーク制御しない。トレードオフは O(log N) lookup vs O(1) だがセキュリティ/分散化の gain。",
                        "Kademlia がよりメモリ効率的。",
                        '他に選択肢がない。',
                      ],
                      correctIndex: 1,
                      explanation: '中央集権 = 検閲/操作の単一障害点。Kademlia = 分散化だがより複雑。Permissionless blockchain ネットワークには、効率より分散化が勝つ。わずかなレイテンシコストはセキュリティ利益に対し許容可能。',
                    },
                    {
                      question: 'eth/68 で、**transaction は hash 先にアナウンス**、フルボディでなく。**なぜ?**',
                      options: [
                        'Hash がより小さい。',
                        '大半 peer は大半 tx すでに持つ (伝播見た)。Hash でアナウンス、持っていないものだけ要求が **全 tx を全 peer にフルサイズ再ブロードキャスト避ける**。ネットワーク規模で巨大な帯域節約。',
                        "Tx フルボディは暗号化、hash は違う。",
                        "Hash アナウンスは EIP-1559 で必須。",
                      ],
                      correctIndex: 1,
                      explanation: '帯域最適化。Tx がネットワーク伝播すれば、すべての peer が hash を素早く見る。持っていなければフルボディだけ要求。これでネットワーク総帯域がフル tx ブロードキャスト比 ~10x 削減。スケーリングに critical。',
                    },
                    {
                      question: "**Reth の NetworkManager** が中央オーケストレータ。**どの 3 ストリームを poll する?**",
                      options: [
                        'CPU、メモリ、ディスク。',
                        'Swarm (アクティブ接続からの peer メッセージ)、Discovery (discv5/DNS からの新発見 peer)、from_handle_rx (アプリコードからのコマンド — tx ブロードキャスト、block 要求、等)。',
                        "RPC、WebSocket、IPC。",
                        'Block、transaction、receipt。',
                      ],
                      correctIndex: 1,
                      explanation: "中央イベントループが 3 入力ストリーム結合: 外部トラフィック (Swarm)、新 peer (Discovery)、アプリコマンド (handle チャネル)。NetworkManager が 3 つ全部 poll、dispatch。これが Reth ネットワーキングの心臓。",
                    },
                    {
                      question: 'Reth ベース chain に **カスタム gossip** 追加 (e.g., MEV bundle マーケットプレイス用) する場合、アーキテクチャ的アプローチは?',
                      options: [
                        "eth/68 修正して新メッセージタイプ追加。",
                        '**カスタムサブプロトコル** 実装、eth/68 と同じ RLPx 接続上で動く。メッセージ enum 定義 (RLP エンコード)、SubProtocol trait 実装、NetworkManager に登録。カスタムプロトコルが eth/68 と干渉せず並んで動く。',
                        "reth fork してコアにプロトコル追加。",
                        'devp2p ではなく libp2p 使用。',
                      ],
                      correctIndex: 1,
                      explanation: "サブプロトコルパターン: reth のネットワーキングは設計で拡張可能。プロトコルを peer として追加; 複数 peer が RLPx 接続共有可能。eth/68、snap (state sync)、カスタムプロトコルすべて並行に動く。インフラがスケール。",
                    },
                    {
                      question: "Reth の **Peer scoring** が悪動作罰則。悪動作検知が見落とす **積極的ユースケース** は?",
                      options: [
                        '積極的使用なし。',
                        "Peer scoring は **特定 peer 優先** にも使える: sequencer が既知良 merchant インフラを random peer より高くスコア、それらフローによりサービス or 低レイテンシ保証。これが peer scoring を防御的 (悪 block) から戦略的 (良 route) にシフト。",
                        "積極的 scoring はマーケティング概念、技術でない。",
                        "Peer scoring はフルノードのみ関連。",
                      ],
                      correctIndex: 1,
                      explanation: 'デフォルト scoring は反応的 (悪 peer drop)。特化 chain 向け、scoring は戦略的 — MEV 関連 info を既知 builder に、決済データを merchant ノードに、等 route 可能。これが chain 固有ネットワーキング戦略の Reth 拡張点。',
                    },
                    {
                      question: "MEV-Boost のようなものに **カスタム gossip プロトコル** がなぜ必要、**デフォルト eth/68 transaction gossip** がすでに存在するのに?",
                      options: [
                        "カスタム gossip が eth/68 より速い。",
                        'eth/68 は canonical chain data (block、tx、receipt) 用で public-by-default + cooperative-relay 仮定。MEV-Boost は **private routing** (特定 peer だけ bundle 見える)、**アプリケーション層 auction** (bundle 価格)、**プロトコル外認証** (relayer identity) 必要。これらは on-chain semantics に合わないアプリケーション関心事。',
                        "MEV-Boost が HTTPS 要求、eth/68 サポートしない。",
                        "カスタム gossip は EVM spec が要求。",
                      ],
                      correctIndex: 1,
                      explanation: 'eth/68 は非 chain メッセージに間違った抽象。カスタムプロトコルが private routing、アプリケーション層 signaling、chain 独立 semantics 与える。MEV-Boost、共有 sequencer coordination、決済レール routing 全部ここに住む。',
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
