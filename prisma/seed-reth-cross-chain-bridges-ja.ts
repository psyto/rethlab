import { PrismaClient } from '@prisma/client';

export async function seedRethCrossChainBridgesJA(prisma: PrismaClient) {
  const tags = ['reth', 'bridges', 'ccip', 'optimism', 'wormhole', 'ibc', 'light-client', 'l1', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-cross-chain-bridges-ja',
      title: 'Cross-Chain Bridges — CCIP から light client まで',
      description:
        'chain 間で価値がどう動くかを正直に会計する: 「この multisig を信頼」から「source chain のコンセンサスしか信頼しない」までの trust モデル、攻撃の歴史 ($2B+ 盗まれた)、本番 bridge コード (OP Standard Bridge、Chainlink CCIP、Wormhole、IBC) を読み、Reth 上に最小の light-client 検証 bridge を作る。Tempo↔Solana 決済、OP-stack bridge、ZK light client を architect する準備ができる。',
      difficulty: 'EXPERT',
      duration: 150,
      xpReward: 450,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 310,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Bridge の基礎',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Bridge とは何か? Trust モデルと bridge トリレンマ',
                  slug: 'bridges-trust-models-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# Bridge とは何か? Trust モデルと bridge トリレンマ

**Bridge** は、chain A での state 変更が chain B での state 変更を引き起こすシステム。クロスチェーンインフラの全分野は、これを動かすために **どれだけ信頼が必要か** と、その信頼を最小化した時に **どんな攻撃が残るか** を見つけ出す作業。

> 🛑 **スクロール前に予測。** 過去 3 年で 3 つの bridge が $300M+ ずつハックされた (Ronin、Wormhole、Nomad)。**共通の攻撃パターンは?** (ヒント: スマートコントラクトのバグではない。)

## 1. Bridge プリミティブ — 価値 vs メッセージ

「Bridge」の 2 種類:

| 種類 | 何が動くか | 例 |
| :--- | :--- | :--- |
| **Asset bridge** | トークン残高 (canonical または wrapped) | USDC をチェーン間で |
| **Message bridge** | 任意の calldata | LayerZero、CCIP arbitrary message |

Asset は messaging の特殊ケース: asset bridge は message bridge + 各側のトークンコントラクト。**すべてのクロスチェーンインフラは根本的に message bridge** で、上に規約が乗る。

Tempo↔Solana 決済 (mppsol) 向け: message bridge。「Asset」は決済領収書、トークンではない。
OP↔Ethereum 向け: ネイティブトークン規約付き message bridge (ETH deposit/withdrawal)。
BTC↔EVM (wrapped BTC) 向け: asset bridge。

## 2. Trust スペクトラム

Bridge は **何を信頼せねばならないか** のスペクトラム上に位置する:

\`\`\`
外部信頼 (最悪)                                              内部信頼 (最良)
  ↓                                                              ↓
[Multisig] → [Optimistic with challenges] → [PoS bridge] → [Light client] → [ZK light client]
\`\`\`

| Trust モデル | 信頼するもの | 例 | コスト |
| :--- | :--- | :--- | :--- |
| **Multisig** | M-of-N 署名者委員会 | Wormhole (19 guardian) | 検証安価、信頼コスト高 |
| **Optimistic** | チャレンジ期間 (~7 日) | Nomad、Across | 速いクレーム、長い finality |
| **PoS bridge** | 別 chain のバリデータ | LayerZero (DVN モデル) | 可変 |
| **Light client** | source chain のコンセンサス + ヘッダー読み取り | Helios、ネイティブ rollup bridge | 信頼安価、検証コスト高 |
| **ZK light client** | 数学 (source コンセンサスの zk 証明) | Sui-bridge (開発中)、Espresso | 信頼安価、証明コスト高 |

Trust の観点で最良の bridge は **destination chain 上の source chain の ZK light client**。最悪は **multisig** — 人間が共謀しないことを信頼している。

> 🛑 **理解度チェック。** 13-of-19 multisig bridge は 19 が多いから「分散化」に感じる。**実際にはなぜ脆弱?** Multisig に効くが light client には効かない具体的な攻撃は?

Multisig 鍵は **盗まれうる** (Ronin: $625M、攻撃者が spear-phishing で 9 鍵中 5 を取得)。署名者自身が **共謀** できる (強制なし)。署名インフラが **侵害される** ことがある (Wormhole: 鍵盗難ではなく署名検証バグ、しかし multisig インフラの脆さを証明)。

Light client にはこれらの故障モードがない — **source chain のコンセンサスルール** に対してヘッダーを検証する。騙す唯一の方法は source chain そのものを騙すこと。

## 3. Bridge トリレンマ

以下 3 つを全部持つことはできない:

- **Trustlessness** — 外部信頼仮定なし
- **Generality** — 任意の chain をサポート
- **Extensibility** — 新 chain 追加が容易

**Trustless + general** → chain 追加が高コスト (各ペアに light client 実装が必要)。これが IBC/Cosmos モデル。
**Trustless + extensible** → 類似 chain のみ動作。これが OP Stack アプローチ (L2 群が 1 つの bridge インタフェースを共有)。
**General + extensible** → trustless ではない。これが Wormhole/LayerZero — 多 chain サポート、追加容易、ただし multisig や DVN セットを信頼。

Tempo (Paradigm L1) が Ethereum に bridge するとき: trustless + bespoke = Ethereum 上の Tempo light client、その逆も。最終的に ZK light client。

Tempo が Solana に bridge するとき: trustless は現状不可能 (cross-VM、違うコンセンサス、違う暗号)。**Multisig** か **PoS** モデルが必要。**Chainlink CCIP** がここでの本番回答。

## 4. Bridge 攻撃殿堂

実攻撃、盗まれた額順、根本原因付き:

| 年 | Bridge | 盗難 | 根本原因 |
| :--- | :--- | :--- | :--- |
| 2022 | Ronin | $625M | Multisig 鍵侵害 (9 鍵中 5 を phishing) |
| 2022 | Wormhole | $325M | Guardian set ロジックの署名検証バグ |
| 2022 | Nomad | $190M | 初期化バグ + replay 攻撃 |
| 2021 | Poly Network | $611M (返却) | ストレージレイアウト仮定バグ |
| 2024 | Orbit | $80M | Multisig 鍵侵害 |

**5 中 3 が 鍵/署名 侵害**。スマートコントラクトロジックではなく、運用セキュリティ失敗。

教訓: **Multisig bridge は理論的に suboptimal なだけでなく、運用上危険**。監査済コードでも、鍵自体が攻撃面。

> 🛑 **予測。** 今日 $1B+ TVL bridge を設計中。**どの trust モデルを選び、フォールバックは?** 統合速度、コスト、攻撃面、時間軸を考える。

## 5. 自分のプロジェクトへの含意

### Tempo↔Ethereum (Telos、Soltempo)

- 今: **Chainlink CCIP** — 最良の本番選択肢、マルチネットワーク DON
- 2-3 年: Ethereum 上の **light client** of Tempo (とその逆)
- 5+ 年: 証明コストが下がれば **ZK light client**

### Tempo↔Solana (mppsol)

- 今: **CCIP** (2026 で Solana サポート)
- 将来: **ZK light client** — EVM↔非 EVM で違う暗号、最も困難
- 回避策: Ethereum 経由で中継 (より長いが両方向 light-client 検証可能)

### Hyperliquid↔Ethereum

- 今: **Hyperliquid bridge** (カスタム multisig)
- Hyperliquid 独自のロードマップは trust モデル改善について不明; 速度優先

## 6. 検証コストのトレードオフ

各 trust モデルについて、**prover** (誰が bridge クレームを書くか) と **verifier** (誰がチェックするか) のコスト分割:

| モデル | Prover コスト | Verifier コスト | いつ勝つか |
| :--- | :--- | :--- | :--- |
| Multisig | 安価 (hash 署名) | 安価 (署名検証) | 統合速度 |
| Light client | 安価 (ヘッダー中継のみ) | 高 (コンセンサス検証) | 高価値、低頻度 |
| ZK light client | 高 (コンセンサス証明) | 安価 (証明検証) | 高価値、高頻度 |

決済レール bridge (Tempo) 向け: 頻度高 (各 merchant 決済)。**ZK light client** が正しい asymptote — 高 prover コストが多くの検証に償却される。

> 🛑 **理解度チェック。** ZK light client が証明あたり $10。各証明が $50K 価値のメッセージ 1000 を解放。**Bridge は「高価」?** 数学を示す。なぜ正しいコスト指標が常に「$/value-secured」で「$/proof」ではないのか?

## 7. 読み物

- [a16z bridge taxonomy](https://www.coindesk.com/tech/2023/07/13/the-best-blockchain-bridges-defined-by-trust-models/) — trust モデルフレームワーク
- [Chainlink CCIP whitepaper](https://chain.link/whitepaper) — DON ベース bridge 設計
- [Helios](https://github.com/a16z/helios) — Rust Ethereum light client (次レッスンで読む)

## 8. 練習

各 chain ペアについて、今日の現実的 trust モデルを特定:

1. Ethereum mainnet ↔ Optimism (canonical bridge)
2. Ethereum mainnet ↔ Polygon PoS
3. Solana ↔ Ethereum 上の Wormhole asset
4. Tempo ↔ Ethereum (公開情報による)
5. Bitcoin ↔ 任意の EVM chain

> 最終チェック: 一文で、bridge 設計時に最適化すべき次元として、なぜ「trust モデル」が速度やコストよりも重要か? **答えに攻撃の歴史や bridge トリレンマが出なければ §3 と §4 を再読**。`,
                },
                {
                  title: 'Light client — gold standard の検証プリミティブ',
                  slug: 'bridges-light-clients-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Light client — gold standard の検証プリミティブ

**Light client** は、フルノードを走らせずに chain の state を検証するプログラム。ヘッダーだけダウンロード、コンセンサスルールに従い、コンセンサスプロトコルが保証するものだけを信頼する。クロスチェーン bridge において、light client は **trust 最小化の gold standard** であり、Rust が本番 light client の選択言語。

> 🛑 **スクロール前に予測。** Ethereum フルノードは ~1TB の state を保存。Light client は ~MB を保存。**Light client にできないことは?** スクロール前に 3 つ挙げる。(ヒント: 何が state を要求するか考える。)

## 1. Light client とは何か — そして何でないか

Light client は **できる**:
- Block header が genesis に chain する検証
- State inclusion proof (state root に対する Merkle proof) の検証
- Transaction が含まれた検証 (tx root に対する Merkle proof)
- コンセンサス追従 (現在の finalized state を追跡)

Light client は **できない**:
- Proof なしで任意の state を look up (full state なし)
- 任意の transaction を実行 (実行する full state なし)
- State proof を生成 (検証のみ)

つまり light client は **chain state に関するクレームの検証者** であって生成者ではない。Bridge は light client を使って「transaction X が chain Y で起きた」とのクレームを **検証** する — relayer がクレーム + proof を生成、light client が検証。

## 2. Ethereum light client プロトコル

Ethereum の PoS が PoW 時代より light client を遥かに安価にした。プロトコル ([\`ethereum/consensus-specs\`](https://github.com/ethereum/consensus-specs)):

- 各 **sync committee period** (~27 時間) ごとに、512 バリデータがランダムに選ばれて sync committee になる
- Sync committee がその期間の全 block header に署名
- Light client は sync committee + 署名だけダウンロード
- Light client は committee の BLS 集約公開鍵に対して署名を検証

Ethereum に従うために light client が必要なもの:
- **初期信頼 checkpoint** (out-of-band で取得必要、e.g., 信頼ソースから)
- **Sync committee 更新** 各期間 (committee 回転を検証)
- **Header 更新** 期間中 (現 committee 署名で検証)

それだけ。期間あたり ~MB、full state は TB と比較。**検証コストは 512 BLS 署名集約 + チェック、~ms**。

## 3. Helios を読む — Rust Ethereum light client

[\`a16z/helios\`](https://github.com/a16z/helios) は a16z の本番グレード Rust Ethereum light client。Wallet、indexer、bridge で使用。~10k 行 Rust。

アーキテクチャ:

\`\`\`mermaid
flowchart LR
    Trusted["信頼 checkpoint<br/>(slot, blockRoot)"] --> Sync["head に sync"]
    Sync --> Update["Sync committee<br/>各期間で更新"]
    Update --> Header["Header 更新<br/>現 committee 経由"]
    Header --> Verify["クレーム検証<br/>(execution payload、<br/>state proof)"]
    RPC["RPC server"] --> Verify
    Apps["Bridge / Indexer"] --> RPC
\`\`\`

読むべき主要ファイル:

- \`consensus/src/consensus.rs\` — コンセンサスクライアント (sync committee + header 検証)
- \`execution/src/state.rs\` — execution 層からの state inclusion proof 検証
- \`rpc/src/lib.rs\` — RPC server (アプリが検証済 state をクエリ可能)

全体が wasm 経由でブラウザで動く。**それがポイント** — wallet が Infura を信頼せず Ethereum を検証可能。

> 🔍 **リポで探す。** Helios の [\`consensus/src/consensus.rs\`](https://github.com/a16z/helios/blob/master/consensus/src/consensus.rs) を開く。Sync committee 署名が検証される箇所を見つける。**どんな BLS 集約が起きているか?** 検証フローを追跡。

## 4. Reth ベース chain での light client

カスタム L1 (Tempo、Hyperliquid、etc.) が bridge destination になるには、**誰かが target chain 上に自分の chain の light client を書く** 必要がある。

2 アプローチ:

### 4.1 Naive light client (BFT chain)

L1 が BFT コンセンサス (e.g., HotStuff) を使う。Light client は:
- Validator set 追跡 (回転イベント含む)
- 2f+1 署名された block header 検証
- State root に対する state inclusion proof 検証

Ethereum 上の Solidity contract で: BLS 集約署名付きで header 検証あたり ~5000 gas。50 gwei で header あたり ~$0.50。

これは動く! ただし BFT ルールを知る Solidity contract が必要。

### 4.2 ZK light client

同じフロー、BFT 検証が off-chain で **zkVM proof 内** で起きる。Ethereum 上のコントラクトは ZK proof を検証するだけ (定数コスト、~100k gas)。

本番例 (2026):

- Ethereum light client 向け **Succinct の SP1** — sync committee 検証を証明
- **Espresso** — 共有 sequencer 向け ZK light client
- **Polyhedra** — 各種 chain 向け ZK light client

ZK light client が bridge の **endgame**。Trust = 数学。

> 🛑 **理解度チェック。** 「ZK light client は定数コスト」。**部分的に正しい**。On-chain 検証コストは定数; off-chain proof 生成は高 (2026 で $1-10 per proof)。コストモデルを言い直す: いつ ZK light client が naive light client より安いか?

スループットが高い時。Naive: O(N) コスト、N = ヘッダー数。ZK: on-chain O(1) + off-chain O(N)。ZK は多くのヘッダー検証 + on-chain ガスが拘束制約の時に勝つ。

## 5. Reth での light client 統合

Reth ベース chain が light client 統合で果たす 2 役割:

### 5.1 Source chain としての Reth

自分の Reth ベース L1 がブロック生成。Light-client-friendly にするには:
- **Header フォーマット** に検証情報を含む (state root、validator set commitment、BLS 集約署名)
- **ブロック生成** がヘッダーに validator set 変更をコミット
- **State tree** が Merkle-Patricia (state inclusion proof 生成可能)

Reth がデフォルトで全部与える。自分の consensus impl が正しいフィールドをヘッダーに書くことを確認するだけ。

### 5.2 Destination chain としての Reth

自分の Reth ベース L1 が他 chain からメッセージを受信。自分の chain の bridge contract が source chain のヘッダー + proof を検証する必要。これが light client *コントラクト* が住む場所。

Ethereum→Tempo 向け: Tempo 上の Solidity contract が Ethereum の sync committee 検証を走らせる。Header あたり ~5000 gas。

Reth EVM は mainnet と同じなので、任意の Solidity light client (Helios のコントラクト、カスタム) が動く。

## 6. 練習

1. [\`a16z/helios\`](https://github.com/a16z/helios) をブラウズ — 時間があれば clone
2. BLS 署名検証ロジックを含むファイルを特定
3. 推定: 自分の L1 が 30 バリデータ (Ethereum の 512 vs) なら、light client 検証はどれだけ安いか?
4. スケッチ: カスタム L1 の block ヘッダーが light client 向けに公開すべきフィールドは?

## 7. 読み物

- [Helios source](https://github.com/a16z/helios) — 本番 Rust light client
- [Ethereum light client spec](https://github.com/ethereum/consensus-specs/blob/dev/specs/altair/light-client/sync-protocol.md) — 正式プロトコル
- [SP1 light client](https://github.com/succinctlabs/sp1) — ZK light client 実装

> 最終チェック: 一文で、自分の L1 の light client が他 chain からの自分の state 検証を **最も trust 最小化** にする理由は? **答えに「source chain のコンセンサスだけ信頼」がなければ §1 を再読**。`,
                },
              ],
            },
          },
          {
            title: '実 Bridge を読む',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'OP Standard Bridge — canonical な L2 deposit/withdrawal パターン',
                  slug: 'bridges-op-standard-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# OP Standard Bridge — canonical な L2 deposit/withdrawal パターン

OP Standard Bridge は canonical な「trustless L1↔L2 bridge」参照。すべての OP Stack chain (Optimism、Base、Mode など) が使う。**rollup 自身のコンセンサスを bridge のセキュリティモデルとして使う** 教科書的例 — 別 multisig なし、別バリデータなし、chain そのもののみ。

> 🛑 **スクロール前に予測。** Ethereum から Optimism に 1 ETH を deposit。同じ ETH が Optimism に ~2 分で現れる。1 ETH を引き出す。**Ethereum で再び使えるまでどれだけかかるか?** なぜか?

## 1. Deposit フロー

L1→L2 (deposit) は容易な方向:

\`\`\`mermaid
sequenceDiagram
    participant User
    participant L1Bridge as L1StandardBridge (Ethereum)
    participant Inbox as OptimismPortal (Ethereum)
    participant L2 as L2 chain
    participant L2Bridge as L2StandardBridge (Optimism)

    User->>L1Bridge: depositERC20(token, amount)
    L1Bridge->>Inbox: depositTransaction(...)
    Note over Inbox: DepositInitiated イベント発火
    L2->>L2: Sequencer が L1 イベントを読む
    L2->>L2Bridge: finalizeBridgeERC20(user, token, amount)
    L2Bridge->>User: Wrapped token を user に mint
\`\`\`

鍵となる洞察: **deposit は強制 inclusion**。L1 contract がイベント発火; L2 sequencer は期限 (e.g., ~1 時間) 内に処理 **しなければならない**。されないなら、誰でも L2 inbox 経由で強制 inclusion 可能。

これが deposit を **trustless** にする — rollup 自身のコンセンサスルールが inclusion を強制。Multisig なし。

## 2. Withdrawal フロー

L2→L1 (withdrawal) は遥かに難しい:

\`\`\`mermaid
sequenceDiagram
    participant User
    participant L2Bridge as L2StandardBridge (Optimism)
    participant Output as L2OutputOracle (Ethereum)
    participant L1Bridge as L1StandardBridge (Ethereum)

    User->>L2Bridge: withdraw(token, amount)
    L2Bridge->>L2Bridge: User の wrapped token を burn
    Note over L2Bridge: WithdrawalInitiated イベント発火
    L2->>Output: State root 提出 (~1 時間ごと)
    Note over Output: 7 日間チャレンジ期間
    User->>L1Bridge: proveWithdrawal(proof, output)
    L1Bridge->>L1Bridge: Withdrawal の Merkle proof 検証
    L1Bridge->>L1Bridge: チャレンジ期間待ち
    User->>L1Bridge: finalizeWithdrawal()
    L1Bridge->>User: L1 トークン転送
\`\`\`

3 つがこれを遅くする:
1. State root 提出: ~1 時間ごと (設定可能)
2. チャレンジ期間: 7 日 (fraud proof 提出可能なため)
3. 2 段階確定: prove + finalize (別 transaction)

**合計**: withdrawal 開始から L1 決済まで ~7 日。

> 🛑 **理解度チェック。** 「7 日はユーザに受け入れ不可」**なぜ必要?** チャレンジ期間が防ぐ攻撃は? 答えに「rollup の optimistic セキュリティモデル」がなければ再読。

チャレンジ期間は、sequencer が L2 state について嘘をついたら誰でも **fraud proof** を提出できるように存在。これなしでは sequencer が詐欺的 state root を提出し L1 contract がそれを信頼してしまう。

## 3. 実コントラクトを読む

Canonical な OP bridge コードは [\`ethereum-optimism/optimism\`](https://github.com/ethereum-optimism/optimism)、\`packages/contracts-bedrock/\` にある。主要ファイル:

| Contract | 役割 |
| :--- | :--- |
| \`L1StandardBridge.sol\` | L1 ユーザエントリ (deposit)、エグジット (withdraw) |
| \`L2StandardBridge.sol\` | L2 ミラー — withdrawal で wrapped token burn |
| \`OptimismPortal.sol\` | 実 L1 inbox/outbox for クロスドメインメッセージ |
| \`L2OutputOracle.sol\` | L1 上に L2 state root コミットメント保存 |
| \`L1CrossDomainMessenger.sol\` | 汎用メッセージパッシング (トークンだけでなく) |

**Bridge は asset インタフェースに過ぎない**。下に任意の calldata を扱う汎用クロスドメインメッセンジャがある。

> 🔍 **リポで探す。** [\`L1StandardBridge.sol\`](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/L1/L1StandardBridge.sol) を開く。\`depositERC20\` 呼び出し時の動作を追跡。**Deposit が L2 上にあると L1 contract が確信するのはいつ?**

確信するのは **L1 transaction が landing した時**。L2 sequencer は (プロトコルルールにより) deposit 含める強制。Trust 仮定: rollup のコンセンサスが sequencer の振る舞いを強制、sequencer が cheat したら rollup が分岐 (fraud proof)。

## 4. Fast withdrawal market

7 日 withdrawal は多くのユースケースで使えない。市場の応答: **第三者の fast withdrawal**。

流動性プロバイダ:
1. L2 で withdrawal 開始を観測
2. すぐに L1 トークン送信 (手数料引いて)
3. 7 日待つ
4. 期間経過時に L1 withdrawal クレーム

LP は **withdrawal リスク** (L1 state proof 失敗の場合) を引き受け、手数料収入と引き換え。Across、Hop、Connext のようなマーケットがこれを大規模に実施。

これは trust 意味では **bridge ではない** — trustless bridge の上に層をなす金融商品。Trust 分割:
- Bridge 自体: trustless (rollup コンセンサス)
- Fast withdrawal LP: 資本リスク (user 信頼なし、市場効率のみ)

## 5. Standard Bridge vs Native Bridge

OP Stack は両方持つ:

- **Standard Bridge**: ERC20 をマッピング — 任意トークン用
- **Native Bridge**: ETH (と OP トークン) を直接扱う

Standard Bridge 経由でトークンを bridge するには、**登録** 必要 — L1 と L2 トークンアドレスを対応付け。さもなければ bridge は何を L2 representation として mint すべきか分からない。

Tempo 向けに重要: Tempo がそのチェーンネイティブの stablecoin を持ち、それを Ethereum に欲しいなら、Tempo-Ethereum トークンペア登録付きの **Standard Bridge 等価物** が必要。

## 6. Tempo↔Ethereum 経由 OP Standard Bridge?

Tempo は **OP Stack ではない** (スタンドアロン L1)。OP Standard Bridge は直接適用されない。だが **パターンは** 適用される:

Tempo↔Ethereum 向けの等価物:
- Tempo Standard Bridge (両側の Solidity contract)
- Tempo 上の Ethereum light client
- Ethereum 上の Tempo light client (困難な方)
- Withdrawal チャレンジ期間 (light client まだないなら長い)

ZK light client が出荷されるまで、これは **CCIP の領域** — 次レッスンで扱う。

## 7. 読解演習

\`ethereum-optimism/optimism/packages/contracts-bedrock\` で:

1. \`L1StandardBridge.sol\` — deposit 関数を完全に読む
2. \`OptimismPortal.sol\` — L2 → L1 メッセージが受信される場所を見つける
3. \`L2OutputOracle.sol\` — state root を提出する関数を見つける
4. **計算**: 1 withdrawal が何 L1 transaction を要するか? なぜ?

3 つの答え: \`proveWithdrawalTransaction\` + 待ち + \`finalizeWithdrawalTransaction\`。最低 L1 tx 2 つ。

## 8. op-bridge ExEx パターン

Building tier (L2 — Reorg-Aware Indexer) から、[op-bridge ExEx example](https://github.com/paradigmxyz/reth-exex-examples/tree/main/op-bridge) は L1StandardBridge イベントを watch する実世界 indexer:

\`\`\`rust
sol!(L1StandardBridge, "l1_standard_bridge_abi.json");
use crate::L1StandardBridge::{
    ETHBridgeFinalized, ETHBridgeInitiated, L1StandardBridgeEvents,
};
\`\`\`

これが **indexer (と bridge) がクロスチェーンイベントを消費する方法**。ExEx が各ブロックを watch、bridge イベントをデコード、自身の DB に保存。反対側の bridge contract がこの index をクエリ可能。

同じパターンが Tempo で動く: Tempo 上で CCIP bridge イベントを watch する ExEx が merchant treasury システムにフィード。

## 9. 読み物

- [Optimism docs](https://docs.optimism.io/builders/dapp-developers/bridging/messaging) — 開発者視点
- [OP Stack contracts-bedrock](https://github.com/ethereum-optimism/optimism/tree/develop/packages/contracts-bedrock) — 実コード
- [Across whitepaper](https://docs.across.to/) — fast withdrawal market 設計

> 最終チェック: 一文で、なぜ OP Standard Bridge が「trustless」だが 7 日 withdrawal 遅延を要するか? **答えに「optimistic セキュリティ + fraud proof」がなければ §2 を再読**。`,
                },
                {
                  title: 'Chainlink CCIP — Tempo が使うクロスチェーンレール',
                  slug: 'bridges-ccip-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 45,
                  content: `# Chainlink CCIP — Tempo が使うクロスチェーンレール

Chainlink CCIP (Cross-Chain Interoperability Protocol) は **任意 chain ペア** 用の本番 bridge。Tempo は Ethereum↔Tempo↔Solana 決済に CCIP を使用。Hyperliquid は使用しない (独自 bridge)。mppsol と soltempo にとって、CCIP は理論的代替ではなく **運用上の現実**。

> 🛑 **スクロール前に予測。** CCIP は「Risk Management Network」を持ち、メッセージを **ブロックする** 権限を持つ。**なぜ?** 純粋暗号では防げない、どんな攻撃を防ぐか?

## 1. CCIP のアーキテクチャ 60 秒

\`\`\`mermaid
flowchart LR
    Source["Source chain<br/>(Ethereum)"] -->|user tx| Router["CCIP Router"]
    Router -->|emit| OnRamp["OnRamp contract"]
    OnRamp -->|message| DON["Decentralized Oracle Network<br/>(commit + execute)"]
    DON -->|verify + relay| OffRamp["OffRamp contract"]
    OffRamp -->|deliver| Dest["Destination chain<br/>(Tempo)"]
    RMN["Risk Management<br/>Network"] -.->|cursing| DON
\`\`\`

2 つのノードネットワークがプロトコルを運用:

| ネットワーク | 役割 | Trust モデル |
| :--- | :--- | :--- |
| **Committing DON** | Source-chain イベントを Merkle commitment に集約 | M-of-N PoS バリデータ |
| **Executing DON** | Destination chain でメッセージ実行 | 同/別 N-of-M |
| **Risk Management Network** | 悪意ある or 制裁メッセージを veto | 別バリデータセット、off-chain monitoring |

つまり CCIP は **技術的には multisig** — ただしクロスチェーンメッセージング向けに特化的に構築:
- 典型 multisig より大きいバリデータセット
- 緊急用の別「cursing」/ freeze 権限 (RMN)
- Asset bridge 用のトークンプールアーキテクチャ
- Chain ごと設定可能なリスクパラメータ

> 🛑 **理解度チェック。** 「CCIP は trustless」**間違い**。洗練された保護付きの multisig。実 trust 仮定を述べる: 誰が共謀して資金を盗めるか、何が止めるか?

Committing DON + executing DON が共謀してメッセージを偽造可能。**RMN** がバックアップ — DON が誤動作したら、RMN は特定レーンを停止可能。第二防衛層を加えるが、暗号的に trustless ではなく信頼ベース。

## 2. メッセージフォーマット

CCIP メッセージが含むもの:

\`\`\`solidity
struct Any2EVMMessage {
    bytes32 messageId;       // 一意 ID
    uint64 sourceChainSelector;
    bytes sender;            // Source 上の ABI エンコード sender
    bytes data;              // 任意の calldata
    EVMTokenAmount[] destTokenAmounts;  // Destination で release するトークン
}
\`\`\`

メッセージ使用 2 方法:

| ユースケース | 何を送るか | 例 |
| :--- | :--- | :--- |
| **データのみ** | \`data\` (任意の calldata) | 汎用クロスチェーン呼び出し |
| **トークン** | \`destTokenAmounts\` | Asset 転送 |
| **プログラマブル** | 両方 | クロスチェーン swap、settle-and-call |

Soltempo 向けのユースケース: **トークン + データ** — Ethereum から Tempo に USDC 送信、merchant 決済を識別するメタデータ付き。

## 3. トークンプールモデル

Asset 用に、CCIP は汎用 wrapper ではなく **トークンプール** を使用:

- 各 chain の **プールコントラクト** が asset 保持
- Bridge 時、source プールが asset を lock; destination プールが release
- **Burn-mint** モデル: source プールが burn; destination プールが mint

Tempo の Ethereum への USDC 接続は CCIP 経由の burn-mint。Source-chain USDC が burn、destination USDC が同 total supply のプールから mint。

これが **wrapped token より単純で安全** — 別「USDC.e」representation なし、ただ違う chain 上の同じ USDC。

> 🔍 **リポで探す。** [\`smartcontractkit/ccip\`](https://github.com/smartcontractkit/ccip) — CCIP コントラクト。\`TokenPool.sol\` を見つける。**継承構造は?** Contract は異なるトークンタイプ向けに複数 variant を持つ。

## 4. レーンモデル

CCIP は **レーン** をサポート — 有向 chain ペア。レーン Ethereum→Tempo は Tempo→Ethereum と異なる。各レーンが:

- 独自 DON committee 設定
- 独自リスクパラメータ (最大スループット、手数料)
- 独自トークンマッピング

レーンは **chain ペアごとに launch**。CCIP は現在 30+ chain サポート、~900 レーン可能。各レーンが独自デプロイコスト。

Tempo 向け: Tempo↔Ethereum と Tempo↔Solana のレーン存在。双方向、両方トークン + データサポート。

## 5. 手数料モデル

CCIP は次で課金:

- Source chain の **ネイティブガストークン** (Ethereum なら ETH、etc.)
- **LINK** (Chainlink トークン、~20% 割引)

手数料カバー:
- Source-chain ガス、メッセージ発火
- Destination-chain ガス、メッセージ実行
- DON 運用コスト
- リスクプレミアム

Soltempo 向け: 各決済が CCIP 手数料 ~$0.50-$2 (chain ペア依存)。$100+ 支払いには許容可能。

## 6. CCIP vs 代替

Merchant 規模支払い (Tempo のユースケース) で比較:

| Bridge | Trust モデル | メッセージあたり手数料 | レイテンシ | Tempo にとって? |
| :--- | :--- | :--- | :--- | :--- |
| **CCIP** | PoS DON + RMN | $0.50-$2 | ~10 分 | 本番準備済、Solana サポート |
| **LayerZero** | DVN モデル | $0.30-$1 | ~5 分 | Solana サポート、より柔軟 |
| **Wormhole** | 19-of-N guardian multisig | $0.20-$1 | ~2 分 | 最安、ただし multisig リスク |
| **OP Standard** | Rollup コンセンサス | ~$0.10 + L1 ガス | 7 日 | L2 のみ、Tempo 用ではない |

CCIP が Tempo で勝つのは **trust + 規制** — Chainlink が最も確立されたクロスチェーンインフラ、保険あり、機関統合あり。Merchant 関係付き決済レール向けに、これが重要。

## 7. 統合パターン

自分のコントラクト (e.g., Tempo 上の soltempo 決済コントラクト) が CCIP メッセージを受信するには:

\`\`\`solidity
// CCIPReceiver を継承
contract SoltempoVault is CCIPReceiver {
    function _ccipReceive(Any2EVMMessage memory message) internal override {
        // Sender をデコード (認可された soltempo source contract であるべき)
        address sourceContract = abi.decode(message.sender, (address));
        require(sourceContract == authorizedSource, "unauthorized");

        // 支払いメタデータデコード
        PaymentReceipt memory receipt = abi.decode(message.data, (PaymentReceipt));

        // 受信した USDC で merchant 状態を更新
        _processSettlement(message.destTokenAmounts, receipt);
    }
}
\`\`\`

これがアプリケーションインタフェース — 継承、1 関数 override、sender 検証、メッセージ処理。

Tempo↔Solana 向けに、destination chain は非 EVM、receiver は **Anchor (Rust)** で:

\`\`\`rust
#[program]
mod soltempo_vault {
    use ccip_solana::CcipReceiver;

    pub fn ccip_receive(ctx: Context<CcipReceive>, message: Any2SVMMessage) -> Result<()> {
        // Sender 検証
        require!(message.sender == authorized_source, ErrorCode::Unauthorized);

        // 決済処理
        process_settlement(ctx, message)
    }
}
\`\`\`

同じ構造、違う言語。**これが soltempo が実際に走らせる統合**。

## 8. mppsol アーキテクチャ

(戦略文書から思い出す): mppsol は Reth/REVM↔Solana 決済層。CCIP がレール。

\`\`\`
Merchant 支払い ──[CCIP]── Solana DeFi ──[CCIP]── Tempo merchant 残高
       ↑                       ↓                          ↑
  Ethereum USDC            Yield earn                オンデマンド引出し
\`\`\`

全アーキテクチャが **CCIP 媒介クロス VM メッセージパッシング**。Tempo の merchant ops 向け bridge 層 = CCIP。スケールで他の選択肢が viable ではなかった。

> 🛑 **予測。** Merchant が $1M を soltempo 経由 CCIP で決済、手数料 $0.50。**手数料モデルは viable?** 1000 merchant が同時決済したら — CCIP は scale するか?

決済規模向け: $0.50 on $1M = 0.005% 手数料。大幅 viable。スループット: CCIP は現在レーンあたり ~10-100 msg/sec サポート、1000 同時決済は queue。非即時フローには許容; merchant がリアルタイム UX 要求なら問題。

## 9. 読み物

- [CCIP whitepaper](https://chain.link/whitepaper)
- [CCIP コントラクト](https://github.com/smartcontractkit/ccip)
- [CCIP 開発者ドキュメント](https://docs.chain.link/ccip) — 統合ガイド

## 10. 練習

1. CCIP コントラクトリポをブラウズ
2. \`Router.sol\` を見つける — ユーザのエントリポイント
3. メッセージを source の \`ccipSend\` から destination の \`ccipReceive\` まで追跡
4. 3 trust 境界を特定 (committing DON、executing DON、RMN)

> 最終チェック: 一文で、なぜ CCIP が Tempo↔Solana で **最も trust 最小化ではない** にもかかわらず **運用上の選択** か? **答えに「Solana サポート + 規制快適性 + 本番成熟度」がなければ §6 を再読**。`,
                },
                {
                  title: 'Wormhole と IBC — マルチチェーンメッセージプロトコル',
                  slug: 'bridges-wormhole-ibc-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 14,
                  xpReward: 40,
                  content: `# Wormhole と IBC — マルチチェーンメッセージプロトコル

Wormhole と IBC は CCIP を超えた 2 つの本番マルチチェーンメッセージプロトコル。非常に異なる聴衆にサービス。**Wormhole** は「すべてを接続する permissionless multisig bridge」 — 速く、安く、よりリスキー。**IBC** は「Cosmos chain 向け trust 最小化 bridge」 — 遅く、より安全、エコシステムロック。

> 🛑 **スクロール前に予測。** Wormhole は 30+ chain を接続。IBC は Cosmos chain だけ接続。**なぜ IBC は Ethereum サポートを追加して支配的 bridge になれない?**

## 1. Wormhole — scale する multisig

[\`wormhole-foundation/wormhole\`](https://github.com/wormhole-foundation/wormhole) は guardian ベース bridge。アーキテクチャ:

- **19 Guardian ノード**、各々がバリデータを走らせる
- Guardian が source-chain イベントを観測
- 各 guardian が attestation 署名: 「chain Y でイベント X を見た」
- **13-of-19** guardian 署名 → メッセージ valid
- Destination chain が署名集約検証

Wormhole は Solana、Ethereum、Sui、Aptos、Bitcoin (wrapping 経由) を含む 30+ chain サポート。**13-of-19 multisig が唯一の trust 仮定**。

### 1.1 Wormhole の攻撃の歴史

2022 年、Wormhole は **$325M** で exploit された。バグは **鍵侵害ではなく** — Solana コントラクトの署名検証バグ。攻撃者が欠けたチェックを exploit して guardian 署名を偽造。

**教訓**: Multisig bridge は鍵だけでなく **検証ロジック** でも頻繁に失敗する。guardian 数は、チェックするコントラクトにバグがあれば意味がない。

> 🛑 **理解度チェック。** Wormhole は 19 guardian。**f は?** なぜ「guardian が多い = より安全」が multisig を考える間違った方法か?

f = ⌊(19-1)/3⌋ = 6 Byzantine 耐性。だが実故障モードは Byzantine 共謀ではなく — **運用侵害** (鍵盗難) か **検証バグ** (Wormhole 2022)。Guardian を増やしてもコントラクトにバグがあれば助からない。

### 1.2 Tempo 向けの Wormhole

Tempo が Wormhole を使えるか? 技術的には yes。だが:
- Wormhole のリスクプロファイル (multisig + 歴史) は **規制された支払い** にあまり受け入れられない
- CCIP のほうが Solana サポートが良い
- Wormhole の開発者フォーカスは Solana-Ethereum、新興 L1 はあまり

Tempo merchant 決済向け: CCIP 優先。CCIP が利用不可になった場合の fallback だが、primary ではない。

## 2. IBC — Cosmos 向けの gold standard

[\`cosmos/ibc-go\`](https://github.com/cosmos/ibc-go) は Inter-Blockchain Communication プロトコル。Cosmos chain 間 (Osmosis、Juno など) の全 bridge を支える。

### 2.1 IBC の動作

\`\`\`mermaid
flowchart LR
    A["Cosmos Hub<br/>(source)"] -->|1. Packet 送信| AClient["IBC client<br/>on source"]
    AClient -->|2. Commit + sign| Relayer["IBC Relayer<br/>(off-chain)"]
    Relayer -->|3. Headers + proof 中継| BClient["IBC client<br/>on destination"]
    BClient -->|4. Header に対し検証| B["Osmosis<br/>(destination)"]
\`\`\`

各 chain が **他 chain の light client** を走らせる。Relayer (誰でも — permissionless) が提出:
- Source chain ヘッダー (destination の light client に対し検証)
- Source-chain state 変更の proof (検証済ヘッダーに対し検証)

Proof が valid なら、destination chain がクロスチェーンアクション実行。**純粋暗号**、multisig なし。

### 2.2 なぜ IBC が Cosmos に制限されるか

Chain X の IBC light client を chain Y で走らせるには、**chain Y が chain X のコンセンサスルールを検証** 必要。Cosmos chain では全てが Tendermint 使用なので同じ light client コードが動く。

Ethereum 向けには、Tendermint 検証実装の Solidity contract が必要 — 高価で複雑。Solana 向けには、同じ Anchor program が必要。**クロスエコシステム IBC は理論的に可能だが実用的には稀** — 実装コストのため。

進展あり: [Polymer](https://www.polymerlabs.org/) が rollup 経由で Cosmos を Ethereum に接続する IBC ハブを構築中。**Tempo (Reth ベース EVM chain) 向けに、IBC は自然な選択ではない** — CosmWasm で Tempo light client + Tempo で Tendermint light client (Solidity) 構築が必要。可能だが marginal benefit のため高コスト。

## 3. Wormhole + IBC + CCIP: 各々がいつ勝つか

| ユースケース | 最適 | 理由 |
| :--- | :--- | :--- |
| Solana ↔ Ethereum | CCIP or Wormhole | 両方とも成熟した Solana サポート |
| Cosmos chain (e.g., Osmosis ↔ Juno) | IBC | Trustless、他選択肢なし |
| EVM L1 ↔ EVM L1 (e.g., Tempo ↔ Polygon) | CCIP、LayerZero | 両方とも汎用 EVM-EVM |
| L2 ↔ L1 (OP Stack 内) | OP Standard Bridge | Trustless |
| Bitcoin ↔ EVM | Wormhole (wrapping 経由) | 代替少 |
| Permissionless 任意 chain | Wormhole | 最大エコシステムリーチ |

**Tempo のニーズ (merchant 決済) 向け**: CCIP が答え。エコシステム拡大向け (e.g., 将来 Cosmos chain への接続)、Polymer や類似アダプターが Tempo↔IBC を bridge 可能。

## 4. Trust スペクトラム再訪

Lesson 1 から、trust スペクトラム:

\`\`\`
[Multisig] → [Optimistic] → [PoS bridge] → [Light client] → [ZK light client]
\`\`\`

各プロトコルの位置:

| プロトコル | 位置 |
| :--- | :--- |
| Wormhole | Multisig (13-of-19) |
| CCIP | PoS bridge (DON + RMN) |
| OP Standard | Optimistic + rollup コンセンサス |
| IBC | Light client (Tendermint) |
| 将来の ZK light client | ZK light client |

**Trust モデルが改善すると複雑さとコストが増加**。IBC は destination 上で source chain の full light client 必要。ZK light client は zkVM 内でコンセンサスを証明する必要。

## 5. 自分のプロジェクト向け

### mppsol (Reth/REVM ↔ Solana)

- 今: **CCIP** プライマリ、Wormhole 代替
- 将来: **ZK light client** — EVM↔非 EVM zk インフラ成熟時

### soltempo (Tempo→Solana 経由 merchant 決済)

- 今: **CCIP 専用**
- 理由: CCIP は on-chain リスク管理 (RMN が pause 可能)、規制快適性

### Telos (Tempo↔HL intent matching)

- Tempo↔HL bridge はまだ公開存在しない
- ありえる選択肢: HyperLiquid bridge (カスタム multisig) or 将来の共有 sequencer / ZK proof
- これが **bridge ギャップ** — Wormhole、CCIP、IBC いずれも現在 Tempo↔HL を full 機能セットで span していない

## 6. 読み物

- [Wormhole core](https://github.com/wormhole-foundation/wormhole) — multisig bridge
- [Wormhole 攻撃 post-mortem](https://web3isgoinggreat.com/?id=wormhole-bridge) — 2022 hack 詳細
- [IBC 仕様](https://github.com/cosmos/ibc) — 正式 IBC 仕様
- [Polymer](https://github.com/polymerdao) — IBC-on-EVM rollup ハブ

## 7. 練習

1. Wormhole の Solana program をブラウズ — 署名集約ロジック見つける
2. \`ibc-go\` をブラウズ — light client インタフェース見つける
3. 比較: 各システムで「クロスチェーンメッセージ検証」が何行か?

> 最終チェック: 一文で、なぜ Wormhole と IBC が **競合ではなく相補的** か? **答えに「異なる trust 食欲を持つ異なるエコシステム」がなければ §3 を再読**。`,
                },
              ],
            },
          },
          {
            title: 'Bridge を作る',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Reth 上の最小 bridge を作る — light-client 検証メッセージング',
                  slug: 'bridges-build-minimal-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 22,
                  xpReward: 55,
                  content: `# Reth 上の最小 bridge を作る — light-client 検証メッセージング

理論は読んだ。本番コードは見た。次は **最小 viable trust 最小化 bridge** を作る: Ethereum→Tempo bridge、Tempo が Ethereum light client を走らせ source イベントの inclusion proof を検証。

> 🛑 **スクロール前に予測。** Bridge は 3 コンポーネント: Ethereum 上のコントラクト、relayer、Tempo 上のコントラクト。**各々が何をして、何を信頼するか?**

## 1. アーキテクチャ

\`\`\`mermaid
flowchart LR
    User["User on Ethereum"] -->|1. USDC lock + イベント発火| L1Contract["L1 Bridge Contract"]
    L1Contract -->|2. イベント観測| Relayer["Relayer<br/>(off-chain、誰でも)"]
    Relayer -->|3. Proof 提出| L2Contract["Tempo Bridge Contract"]
    L2Contract -->|4. Ethereum light client に対し検証| LightClient["Ethereum Light Client<br/>on Tempo"]
    LightClient -->|valid| L2Contract
    L2Contract -->|5. Wrapped USDC mint| User2["User on Tempo"]
\`\`\`

各コンポーネント:

| コンポーネント | Trust モデル | 何を信頼するか |
| :--- | :--- | :--- |
| L1 Contract | 自身 | 何も信頼しない — source of truth |
| Relayer | Permissionless | 誰でも relayer 可能; 信頼不要 |
| L2 Contract | Light client | light client 経由 Ethereum のコンセンサスのみ信頼 |
| Light client | Ethereum コンセンサス | sync committee 署名のみ信頼 |

**全システムが trustless** — Ethereum の PoS が正直であることを信頼、それ以外は何も。

## 2. L1 コントラクト

L1 コントラクトは最も単純な部分 — イベント発火のみ:

\`\`\`solidity
contract EthereumBridge {
    mapping(address => mapping(address => uint256)) public locked;

    event Locked(
        address indexed user,
        address indexed token,
        uint256 amount,
        bytes32 indexed destChainId
    );

    function lock(address token, uint256 amount, bytes32 destChainId) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        locked[msg.sender][token] += amount;
        emit Locked(msg.sender, token, amount, destChainId);
    }
}
\`\`\`

それだけ。**Relayer 不要; イベントは on-chain**。誰でもイベントを観測し proof 付きで Tempo でクレーム試行可能。

## 3. Relayer

Relayer の仕事:

1. Ethereum で \`Locked\` イベントを watch
2. Inclusion proof を生成: 「このイベントは block N、ここに Merkle path」
3. Tempo の bridge コントラクトに proof 提出

Rust で relayer:

\`\`\`rust
use alloy_provider::{Provider, ProviderBuilder};
use alloy_primitives::Address;

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let l1_provider = ProviderBuilder::new()
        .on_http("https://ethereum-rpc.url".parse()?);
    let l2_provider = ProviderBuilder::new()
        .on_http("https://tempo-rpc.url".parse()?);

    // L1 の latest finalized block 取得
    let block = l1_provider
        .get_block(BlockId::finalized())
        .full()
        .await?
        .expect("no finalized block");

    // 最近ブロックの Locked イベント検索
    let logs = l1_provider
        .get_logs(&Filter::new()
            .from_block(block.header.number - 100)
            .address(L1_BRIDGE)
            .event("Locked(address,address,uint256,bytes32)"))
        .await?;

    for log in logs {
        // Inclusion proof 構築
        let proof = build_inclusion_proof(&log, &block).await?;

        // L2 に提出
        let tx = l2_provider
            .send_transaction(TransactionRequest::default()
                .with_to(L2_BRIDGE)
                .with_input(encode_claim_call(&log, &proof)))
            .await?;

        let receipt = tx.get_receipt().await?;
        println!("Submitted claim for {:?}, tx: {:?}",
            log.transaction_hash,
            receipt.transaction_hash);
    }

    Ok(())
}
\`\`\`

Relayer は **stateless** — 誰でも走らせられる。Ethereum 観測して proof 提出するだけ。Down したら、他が引き継ぐ。

## 4. Tempo 上の light client

Tempo の bridge コントラクトが「このイベントが Ethereum block N で起きた」を検証する必要。そのために **Tempo 上で最新検証済 Ethereum block** を知る必要。

Light client コントラクトが維持:

\`\`\`solidity
contract EthereumLightClient {
    struct Header {
        bytes32 blockRoot;
        uint64 slot;
        bytes32 stateRoot;
        bytes32 receiptsRoot;
    }

    mapping(uint64 => Header) public headers;
    bytes32 public currentSyncCommitteeHash;

    function updateSyncCommittee(
        SyncCommitteeUpdate calldata update
    ) external {
        // 現 committee の 2/3+ で署名されたか検証
        verifyCommitteeSignature(update);
        // 次期間用に現 committee 更新
        currentSyncCommitteeHash = computeCommitteeHash(update.newCommittee);
    }

    function addHeader(
        Header calldata header,
        bytes calldata signatures
    ) external {
        // 現 committee の 2/3+ で署名されたか検証
        verifyHeaderSignature(header, signatures, currentSyncCommitteeHash);
        headers[header.slot] = header;
    }

    function verifyInclusion(
        uint64 slot,
        bytes32 leaf,
        bytes calldata proof
    ) external view returns (bool) {
        return MerkleProof.verify(headers[slot].receiptsRoot, leaf, proof);
    }
}
\`\`\`

これで Tempo の bridge コントラクトがこれを使用:

\`\`\`solidity
contract TempoBridge {
    EthereumLightClient public lightClient;

    function claim(
        uint64 slot,
        bytes32 eventHash,
        bytes calldata merkleProof,
        address user,
        address token,
        uint256 amount
    ) external {
        // イベントが light client 経由で Ethereum block N にあったか検証
        require(
            lightClient.verifyInclusion(slot, eventHash, merkleProof),
            "invalid proof"
        );
        // Wrapped USDC を Tempo で mint
        IERC20(wrappedToken[token]).mint(user, amount);
    }
}
\`\`\`

これが bridge 全体。**3 コントラクト**、**1 relayer サービス**、**Ethereum のコンセンサスのみ信頼**。

## 5. コスト内訳

Bridge transaction あたり:

| 操作 | Chain 上のコスト | いつ? |
| :--- | :--- | :--- |
| L1 \`lock\` | ~80k gas (~$2) | User tx ごと |
| Light client \`updateSyncCommittee\` | ~50k gas (~$1.50) | 27 時間ごと (1 sync committee 期間) |
| Light client \`addHeader\` | ~20k gas (~$0.60) | Ethereum block ごと (~12s) |
| L2 \`claim\` | ~150k gas (~$4.50) | User tx ごと |

Light client 更新は継続実行 (誰でも更新支払い; マーケットが維持)。**ユーザ向けコスト**: bridge tx あたり ~$6-7、ガス依存。

ZK light client variant 向け、\`addHeader\` を epoch あたり定数コスト proof 検証 1 つに置き換え、総コスト ~10x 削減。

## 6. 作ったシステム全体

\`\`\`
Source (Ethereum)                 Destination (Tempo)
─────────────────                 ─────────────────────
EthereumBridge.sol                EthereumLightClient.sol
   ↓ Locked イベント                  ↑ updateSyncCommittee
   ↓                                 ↑ addHeader
Relayer (off-chain)  ──────►       TempoBridge.sol
                                    ↑ claim (light client 使用)
                                    ↓ wrapped USDC mint
\`\`\`

**Trust 仮定**: Ethereum の PoS が動く。それ以外何もなし。

これが **OP Standard Bridge が optimistic 遅延なしでやること**、**ZK rollup が本番化したらやること**、**Espresso と類似共有 sequencer が今日やること**。

## 7. 難しい部分 (詳細)

このスケッチは実際の複雑さを省略:

### 7.1 Light client trusted setup

Tempo の light client は初期信頼 checkpoint が必要。どうやって? 2 選択肢:

- **Tempo チームを信頼** ローンチ時 (launch には許容可能)
- **DAO ガバナンス** が初期 checkpoint 更新 (IBC が新 client に使用)

両方とも本番に reasonable。Trust 仮定は **setup 時のみ**、継続的ではない。

### 7.2 Replay protection

各クレームは固有の source イベント参照必要。同じ event hash で同じ USDC を 2 回 bridge したら、L2 コントラクトが reject すべき。

標準パターン: claimed event hash を mapping で追跡:

\`\`\`solidity
mapping(bytes32 => bool) public claimed;
require(!claimed[eventHash], "already claimed");
claimed[eventHash] = true;
\`\`\`

### 7.3 Withdrawal 方向 (Tempo → Ethereum)

上記システムは **deposit のみ**。Withdrawal は逆:
- Tempo bridge が Withdrawn イベント発火
- Ethereum 上の Tempo light client (困難な方)
- L1 bridge が Tempo light client に対する proof を受け入れ

Tempo (Reth ベース BFT) 向け、Ethereum 上の light client は **Ethereum のものより遥かに単純** — 有界 validator set、BFT 署名。BLS 集約付き ~30 バリデータ = header あたり ~5k gas。

## 8. 練習

1. EthereumLightClient コントラクトをより完全にスケッチ
2. 推定: 12s block time で L1→Tempo light client はどれだけ頻繁に更新必要?
3. Relayer が invalid proof 提出したら? Bridge はどうする?
4. システムは Ethereum reorg をどう扱うか (finality 前/後)?

## 9. 読み物

- [Helios source](https://github.com/a16z/helios) — Rust Ethereum light client (relayer の参照)
- [LayerZero V2](https://docs.layerzero.network) — モジュラー bridge アーキテクチャ
- [Espresso shared sequencer](https://docs.espressosys.com/sequencer) — 本番共有 bridge

> 最終チェック: 一文で、light-client 検証 bridge の **唯一の trust 仮定** と、それが **gold standard** である理由は? **答えに「source chain のコンセンサス + 何も他に」がなければ §1 を再読**。`,
                },
                {
                  title: 'ファイナルクイズ: クロスチェーン bridge',
                  slug: 'bridges-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 50,
                  content: `# ファイナルクイズ: クロスチェーン bridge

クロスチェーン最終チェック。Tempo、Hyperliquid、または任意の Reth ベース L1 に触れる bridge を architect するのに必要。`,
                  quizQuestions: [
                    {
                      question: 'なぜ **過去 top 5 bridge ハックの 3 つ** がスマートコントラクトバグではなく鍵 / 運用侵害なのか?',
                      options: [
                        'スマートコントラクトは正式に検証されているのでバグは稀。',
                        'Multisig bridge はセキュリティを鍵保持者に依存; 鍵の十分なサブセット (phishing、malware、insider) が侵害されると、コントラクトのコードは無関係 — 署名は正しく検証される。運用セキュリティが最弱リンク。',
                        'ハッカーは取引所のような容易なターゲットを好む。',
                        'スマートコントラクトハックは bridge ハックに分類されない。',
                      ],
                      correctIndex: 1,
                      explanation: 'Ronin ($625M)、Orbit ($80M)、Poly Network ($611M 返却) — 全て鍵侵害。Bridge のコードは正確にやるべきことをした: 署名検証。攻撃が成功したのは鍵自体が盗まれたから。これが multisig が基本的なリスクモデルで、機能選択ではない理由。',
                    },
                    {
                      question: "**bridge トリレンマ** は何で、Chainlink CCIP はどの 2 角を選ぶか?",
                      options: [
                        '速度、コスト、セキュリティ。CCIP は速度とセキュリティを選ぶ。',
                        'Trustlessness、generality、extensibility。どの 2 つは持てるが全 3 つは持てない。CCIP は **general** (多 chain) + **extensible** (chain 追加容易) を選び **trustless** を犠牲 — 純粋暗号でなく PoS DON + RMN に依存。',
                        'レイテンシ、スループット、コスト。CCIP はスループットとコストを選ぶ。',
                        'L1、L2、サイドチェーン。CCIP は L1 と L2 をサポート。',
                      ],
                      correctIndex: 1,
                      explanation: 'トリレンマはアーキテクチャ制約: trustless + general + extensible — 2 つ選ぶ。CCIP は general + extensible (マルチチェーン、追加容易)。IBC は trustless + general (Cosmos chain)。OP Standard は trustless + extensible (OP Stack のみ)。全 3 つを得るシステムはない。',
                    },
                    {
                      question: 'OP Standard Bridge で、なぜ **withdrawal は 7 日** だが **deposit は 2 分** か?',
                      options: [
                        'L2 が L1 より遅い。',
                        'Deposit は強制 inclusion (rollup コンセンサスが L2 が処理しなければならないと強制); withdrawal は **7 日チャレンジ期間** が必要 — sequencer が L2 state について嘘をついたら誰でも fraud proof 提出可能。非対称性は optimistic セキュリティモデルから来る。',
                        'エンジニアが任意の数字を選んだ。',
                        'Withdrawal が deposit より多くガスを使う。',
                      ],
                      correctIndex: 1,
                      explanation: 'Deposit: L1 イベントは rollup が処理しなければならない (プロトコル組み込み)。Withdrawal: L2 state の正直さに依存、チャレンジ期間待ちが必要。7 日は悪意ある sequencer に対する fraud proof 検出 + 提出に必要な時間。',
                    },
                    {
                      question: 'なぜ **chain Y 上の chain X の light client** が **trust 最小化** とみなされ、**13-of-19 multisig** はそうでないか?',
                      options: [
                        'Light client が multisig よりバリデータ多い。',
                        "Light client は chain X のコンセンサスルールを直接検証 — 騙すには chain X 自身を騙さねばならない。Multisig は鍵侵害のみ必要; source chain を腐敗させる必要なし。Light client の trust 仮定 = source chain のセキュリティ; multisig の trust 仮定はずっと弱い。",
                        'Multisig は一部司法管轄区で違法。',
                        'Light client は Rust、multisig は Solidity で書かれている。',
                      ],
                      correctIndex: 1,
                      explanation: 'Trust 最小化は *bridge 攻撃に何を侵害する必要があるか* についてのもの。Light client: source chain コンセンサスを破る必要 ($billions の stake リスク)。Multisig: ~13 鍵を侵害 (遥かに安価、ソーシャルエンジニアリング可能)。Bridge セキュリティ = trust 要件、バリデータ数ではない。',
                    },
                    {
                      question: 'Tempo は merchant 決済層に **Chainlink CCIP** を使う。**なぜ Wormhole、IBC、OP Standard ではなく CCIP?**',
                      options: [
                        'CCIP が最安選択肢。',
                        'CCIP は: (1) 本番 Solana サポート (Tempo は ETH ↔ Tempo ↔ Solana フロー必要); (2) pause/veto 権限の Risk Management Network; (3) Chainlink の確立されたポジションからの機関 / 規制快適性。Wormhole は multisig リスクを持ち Tempo は規制された支払いを扱う。IBC は EVM↔Solana を span しない。OP Standard は OP Stack 内のみ動く。',
                        'Solana 互換性のために CCIP が要求される。',
                        'CCIP が唯一の EVM 互換 bridge。',
                      ],
                      correctIndex: 1,
                      explanation: '規制された merchant フローを扱う支払いレール向けに、CCIP のポジショニングが絶対的手数料より重要。RMN が Tempo に安全ブレーキを与える (悪メッセージを pause 可能)。Chainlink の機関採用がコンプライアンス会話を単純化。Trust モデルは「最良」ではないが「本番支払いには十分」 — Wormhole は規制フロー向けでない。',
                    },
                    {
                      question: 'Light-client 検証 bridge は destination chain が **source chain のコンセンサスルールを検証** することを要する。**なぜこれが Cosmos の IBC では高価だが OP Standard Bridge では安価か?**',
                      options: [
                        'OP Standard が ZK proof を使う。',
                        "Cosmos IBC は source chain の Tendermint コンセンサスを検証 (full BFT 署名検証、header あたり ~5000 gas)。OP Standard Bridge は optimistic セキュリティ使用: destination chain は on-chain で fraud proof 提出されるのを 7 日待ち、その後 state root を信頼。違うセキュリティモデル = 違う検証コスト。",
                        'OP Standard は layer-2 なので安価。',
                        'IBC はカスタムハードウェアが必要、OP Standard は commodity ノードで動く。',
                      ],
                      correctIndex: 1,
                      explanation: "IBC は genuine な light client 検証 — 高価だが trustless。OP Standard は optimistic — 検証が遅延 (オンデマンド fraud proof) なので安価、7 日 window が trust の代替。両方 trust 最小化だが違う方法で。",
                    },
                    {
                      question: '最小 trust 最小化 bridge 構築は 3 コンポーネント要: L1 contract、relayer、L2 contract。**Relayer は何を信頼し、なぜ重要か?**',
                      options: [
                        'Relayer は L1 と L2 の sequencer を信頼する。',
                        'Relayer は **permissionless で何も信頼しない**。誰でも relayer 実行可能。L1 イベント観測、Merkle proof 構築、L2 に提出。L2 コントラクトの light client が proof を検証すれば、アクション実行。Relayer の正直さは関係なし — 暗号 proof だけ重要。',
                        'Relayer はユーザを信頼し、KYC を要求。',
                        'Relayer は Chainlink が運用し、彼らの oracle ネットワークを信頼。',
                      ],
                      correctIndex: 1,
                      explanation: 'Relayer permissionlessness が全ポイント。Bridge は特定 relayer の正直さに依存しない — relayer が少なくとも 1 つ存在することのみに依存。これが censorship-resistant; 全 CCIP ノードが offline でも誰でも中継に入れる。',
                    },
                    {
                      question: 'Soltempo の **Tempo↔Solana** 向け、**なぜ ZK light client が今日動かない** か、trust 最小化 endgame であるにもかかわらず?',
                      options: [
                        'Solana がスマートコントラクトをサポートしない。',
                        'EVM↔非 EVM ZK light client は source chain のコンセンサス (Solana の Tower BFT) を zkVM 内で証明、その後 Solana で検証必要。暗号が独特で成熟した本番実装がまだ存在しない (2026 時点)。CCIP が DON+RMN multisig モデルでギャップを埋める。',
                        'Solana がクロスチェーン bridge を許可しない。',
                        'ZK proof が生成コスト高すぎる。',
                      ],
                      correctIndex: 1,
                      explanation: 'EVM↔EVM ZK light client は存在 (e.g., Polyhedra、SP1)。EVM↔非 EVM はより困難 — source chain のコンセンサス構造が zkVM 内で効率的で、AND destination chain が ZK proof 検証を持つ必要。Solana は非 EVM 暗号を加える。成熟した本番ケースが 2026 で現れ始めるがまだ table-stakes ではない。',
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
