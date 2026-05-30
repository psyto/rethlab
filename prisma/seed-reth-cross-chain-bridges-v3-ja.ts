import { PrismaClient } from '@prisma/client';

export async function seedRethCrossChainBridgesV3JA(prisma: PrismaClient) {
  const tags = ['reth', 'bridges', 'ccip', 'optimism', 'wormhole', 'ibc', 'light-client', 'l1', 'advanced'];

  await prisma.course.create({
    data: {
      slug: 'reth-cross-chain-bridges-v3-ja',
      title: 'Cross-Chain Bridges — CCIP から light client まで',
      description:
        'chain 間で価値がどう動くかを正直に会計する: 「この multisig を信頼」から「source chain のコンセンサスしか信頼しない」までの trust モデル、攻撃の歴史 ($2B+ 盗まれた)、本番 bridge コード (OP Standard Bridge、Chainlink CCIP、Wormhole、IBC) を読み、Reth 上に最小の light-client 検証 bridge を作る。Tempo↔Solana 決済、OP-stack bridge、ZK light client を architect する準備ができる。',
      difficulty: 'ADVANCED',
      duration: 150,
      xpReward: 450,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 1310,
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
                  title: 'レッスン0 — Bridge とは何か？ Trust モデルと bridge トリレンマ',
                  slug: 'bridges-trust-models-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# レッスン0 — Bridge とは何か？ Trust モデルと bridge トリレンマ

## 問い

**過去 5 年で bridge から $2B+ が盗まれている**。マイナーな DeFi 領域の話ではない — 業界最大手チームが運用する TVL 最上位の bridge から: Ronin ($625M)、Wormhole ($325M)、Poly Network ($611M、返却済み)、Nomad ($190M)。**chain A の state を chain B に動かすために何を信頼しなければならないか、その信頼を最小化したあとに残る攻撃面は何か？**

## 原理（最小モデル）

- **Asset bridge = message bridge + 各側のトークンコントラクト.** すべてのクロスチェーンインフラは根本的にメッセージパッシング。
- **Trust スペクトラム 5 段階.** Multisig（最悪、19 guardian など）→ Optimistic（チャレンジ 7 日）→ PoS bridge（DON）→ Light client（source コンセンサス）→ ZK light client（数学、最良）。
- **Bridge トリレンマ.** Trustlessness / Generality / Extensibility の 3 つ同時は不可能。
- **Multisig は鍵 + 検証ロジックの 2 経路で破られる.** Ronin = 鍵盗難（phishing で 9/5）、Wormhole = 署名検証バグ。
- **検証コスト trade.** Multisig（prover 安、verifier 安）/ Light client（prover 安、verifier 高）/ ZK（prover 高、verifier 安）→ **高頻度・高価値ほど ZK が勝つ**。
- **正しいコスト指標は $/value-secured.** $/proof ではない。

## 具体例

Trust スペクトラム:

\`\`\`
外部信頼 (最悪)                                              内部信頼 (最良)
  ↓                                                              ↓
[Multisig] → [Optimistic with challenges] → [PoS bridge] → [Light client] → [ZK light client]
\`\`\`

| Trust モデル | 信頼するもの | 例 | コスト |
| :--- | :--- | :--- | :--- |
| Multisig | M-of-N 署名者委員会 | Wormhole (19 guardian) | 検証安、信頼コスト高 |
| Optimistic | チャレンジ期間 (~7 日) | Nomad、Across | 速いクレーム、長い finality |
| PoS bridge | 別 chain のバリデータ | LayerZero (DVN モデル) | 可変 |
| Light client | source コンセンサス + ヘッダー読み取り | Helios、ネイティブ rollup bridge | 信頼安、検証コスト高 |
| ZK light client | 数学 (source コンセンサスの zk 証明) | Sui-bridge (開発中)、Espresso | 信頼安、証明コスト高 |

Bridge トリレンマ:

- **Trustless + general** → chain 追加コスト高（各ペア light client 必要）= IBC/Cosmos モデル
- **Trustless + extensible** → 類似 chain しか動かない = OP Stack（L2 群が 1 bridge インタフェース共有）
- **General + extensible** → trustless にならない = Wormhole/LayerZero（multisig / DVN 信頼）

Bridge 攻撃殿堂:

| 年 | Bridge | 盗難 | 根本原因 |
| :--- | :--- | :--- | :--- |
| 2022 | Ronin | $625M | Multisig 鍵侵害 (9/5 phishing) |
| 2022 | Wormhole | $325M | Guardian set ロジック署名検証バグ |
| 2022 | Nomad | $190M | 初期化バグ + replay |
| 2021 | Poly Network | $611M（返却）| ストレージレイアウト仮定バグ |
| 2024 | Orbit | $80M | Multisig 鍵侵害 |

検証コスト trade:

| モデル | Prover コスト | Verifier コスト | いつ勝つか |
| :--- | :--- | :--- | :--- |
| Multisig | 安（hash 署名） | 安（署名検証） | 統合速度 |
| Light client | 安（ヘッダー中継のみ） | 高（コンセンサス検証） | 高価値、低頻度 |
| ZK light client | 高（コンセンサス証明） | 安（証明検証） | 高価値、高頻度 |

## 失敗例（誤解）

「13-of-19 multisig は 19 という数の多さから分散化されている」— **間違い**。鍵は **盗まれうる**（Ronin: $625M、phishing で 9/5 取得）+ 署名者が **共謀** 可能 + 署名インフラ侵害可能（Wormhole: 鍵盗難ではなく署名検証バグ）。Light client にはこれら故障モードがない。

「ZK light client は定数コスト」— **半分正しい**。on-chain 検証は定数だが off-chain proof 生成は高い（2026 時点で 1 proof $1-10）。**naive light client より安くなるのは高スループット時**（naive O(N)、ZK on-chain O(1) + off-chain O(N)、ガス律速で ZK 勝つ）。

「Asset bridge と Message bridge は別物」— **間違い**。Asset bridge = message bridge + 各側トークンコントラクト。すべてのクロスチェーンインフラは本質的にメッセージパッシング、asset は規約。

> 🛑 **予測。** 5 攻撃（Ronin / Wormhole / Nomad / Poly Network / Orbit）のうち 3 つは $300M+ ハック。共通する攻撃パターンは？（ヒント: スマートコントラクトのバグではない）（答え: **bridge の trust 機構そのものが破られた**。Ronin / Orbit = multisig 鍵侵害（phishing で人間の鍵を盗む）、Wormhole = 署名検証バグ（コントラクトが署名者を実際には検証していなかった）、Nomad = 初期化バグ + replay、Poly Network = ストレージレイアウト仮定バグ。**コア資産ロジック（トークンコントラクト）ではなく、クロスチェーンの信頼・検証ロジックが攻撃面**。Multisig + 検証バグの 2 経路。Light client にはこの攻撃面がない — source chain そのものを騙すしかない。）

## ステップで組み立てる

### Step 1: Asset vs Message bridge を 1 文で

Asset bridge = message bridge + トークンコントラクト。本質はメッセージパッシング。

### Step 2: Trust スペクトラム 5 段階

Multisig → Optimistic → PoS → Light client → ZK light client。**右ほど trustless + 複雑**。

### Step 3: Bridge トリレンマ

Trustlessness / Generality / Extensibility の 2 つしか選べない。IBC = trustless + general、OP = trustless + extensible、Wormhole/LayerZero = general + extensible。

### Step 4: Multisig が破られる 2 経路

鍵侵害（人間） + 検証ロジックバグ（コード）。Guardian を増やしても解決しない。

### Step 5: 検証コスト trade

Multisig（安・安、速度勝つ）/ Light client（安・高、低頻度勝つ）/ ZK（高・安、高頻度勝つ）。**$/value-secured で評価**。

### Step 6: 自分の chain ペアに当てはめる

| Chain ペア | 現実的選択 |
| :--- | :--- |
| Ethereum ↔ OP | OP Standard Bridge（rollup コンセンサス、trustless）|
| Ethereum ↔ Polygon PoS | PoS bridge（heimdall validator 信頼）|
| Solana ↔ Ethereum | Wormhole / CCIP（multisig / PoS DON）|
| Tempo ↔ Ethereum | CCIP 今日、light client 2-3 年、ZK light client 5 年以降 |
| Tempo ↔ Solana | CCIP 今日（cross-VM trustless は現状不可能）|
| Bitcoin ↔ EVM | Wormhole / wrapping（代替少なく multisig 系）|

## 答え合わせ

- **ZK light client コスト評価**: 証明 $10、1 証明で $50K × 1000 件 = $50M 解放 → コスト 0.00002% = **超安価**。$/proof ではなく **$/value-secured** が正しい指標。
- **Trust モデルが速度・コストより重要な理由**: 速度・コストは UX 改善、trust モデルは **攻撃面そのもの**。$2B+ の bridge 盗難は速度設計ではなく trust 設計の失敗。bridge トリレンマで何を諦めるか（trustlessness / generality / extensibility）の選択が下流すべてを規定。
- **5 攻撃の根本原因分布**: 2/5 = 鍵侵害（Ronin、Orbit）、3/5 = 検証ロジックバグ（Wormhole、Nomad、Poly Network）。**Multisig は 2 経路で破られる** = 鍵 OR コード。Light client は 1 経路（source chain を騙すしかない）。

## 合格基準

- Asset vs Message bridge を即答できる（後者の特殊化が前者）。
- Trust スペクトラム 5 段階を順に言える。
- Bridge トリレンマの 3 軸と各 chain の選択を即答できる。
- Multisig 2 経路（鍵 + 検証）の攻撃を例で言える。
- $/value-secured コスト指標の意味を計算できる。

## まとめ（3行）

- Bridge = メッセージパッシング、Trust スペクトラム 5 段階（Multisig → Optimistic → PoS → Light client → ZK light client）の選択が下流すべてを規定。
- Bridge トリレンマ（Trustlessness / Generality / Extensibility）の 3 同時不可、$2B+ 攻撃の根本原因は **trust 機構そのもの**（鍵 OR 検証ロジック）= multisig の宿命。
- 高頻度・高価値ほど ZK light client が漸近的に勝つ、正しいコスト指標は $/value-secured。
`,
                },
                {
                  title: 'レッスン1 — Light client（gold standard の検証プリミティブ）',
                  slug: 'bridges-light-clients-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# レッスン1 — Light client（gold standard の検証プリミティブ）

## 問い

Ethereum フルノード = ストレージ ~1TB + RAM ~200GB。**Light client は同じ仕事を数 MB + スマホ CPU で行う**。Block header をダウンロードし、フルノードと同じコンセンサスルールに従う。**source chain の light client を destination chain の中に置いてクロスチェーンメッセージを暗号的に検証できるか？** Yes なら trust 最小化の gold standard。

## 原理（最小モデル）

- **Light client にできる 4 つ.** Block header → genesis のチェーン検証 / state inclusion proof 検証 / transaction inclusion 検証 / コンセンサス追従。
- **Light client にできない 3 つ.** Proof なし任意 state 参照 / 任意 tx 実行 / state proof 生成（検証のみ）。
- **Sync committee + BLS が PoS Ethereum で light client を成立させた.** 512 validator のローテーションサブセット、N 署名を 1 つに集約、~MB / 期間 ~27 時間。
- **3 必要要素.** 初期信頼 checkpoint（out-of-band）+ sync committee 更新（期間ごと）+ header 更新（committee 署名検証）。
- **Helios = a16z 製の本番 Rust Ethereum light client.** ~10k 行、wallet / indexer / bridge で使用、wasm でブラウザ動作。
- **Reth ベース chain の light client 設計.** Naive（BFT、Ethereum 上で ~5000 gas/header）vs ZK（off-chain proof + Ethereum 上で定数 ~100k gas）。
- **ZK light client が bridge の endgame.** Trust = 数学、本番例 = SP1 / Espresso / Polyhedra。

## 具体例

Light client のできる / できない:

| できる | できない |
| :--- | :--- |
| Block header の genesis チェーン検証 | Proof なし任意 state 参照 |
| State inclusion proof 検証（state root） | 任意 tx 実行 |
| Tx inclusion 検証（tx root） | State proof 生成 |
| コンセンサス追従（finalized state 追跡）| |

Ethereum light client プロトコル:

- **Sync committee period** ~27 時間ごとに 512 validator ランダム選出 = sync committee
- Sync committee がその期間の **すべての block header** に署名
- Light client が committee メンバーシップ + 署名のみダウンロード
- BLS 集約公開鍵で検証 = ~ms

Helios アーキテクチャ:

\`\`\`mermaid
flowchart LR
    Trusted["信頼 checkpoint<br/>(slot, blockRoot)"] --> Sync["head に sync"]
    Sync --> Update["Sync committee<br/>各期間で更新"]
    Update --> Header["Header 更新<br/>現 committee 経由"]
    Header --> Verify["クレーム検証<br/>(execution payload、<br/>state proof)"]
    RPC["RPC server"] --> Verify
    Apps["Bridge / Indexer"] --> RPC
\`\`\`

Helios 主要ファイル（[\`a16z/helios\`](https://github.com/a16z/helios)）:

- \`consensus/src/consensus.rs\` — コンセンサスクライアント（sync committee + header 検証）
- \`execution/src/state.rs\` — execution 層からの state inclusion proof 検証
- \`rpc/src/lib.rs\` — RPC server（アプリから検証済み state クエリ可能）

Reth ベース chain での light client 2 アプローチ:

**Naive light client（BFT chain）:**
- Validator セット追跡（交代イベント込み）
- 2f+1 署名された header 検証
- State root に対する inclusion proof 検証
- Ethereum 上で BLS 集約込み ~5000 gas/header = 50 gwei で ~$0.50/header

**ZK light client:**
- BFT 検証が off-chain zkVM proof 内
- Ethereum 上で proof 検証のみ = 定数 ~100k gas
- 本番例: Succinct SP1（Ethereum light client）/ Espresso（共有 sequencer）/ Polyhedra（各種 chain）

Reth ベース chain の役割:

| 役割 | 何をする | Reth が提供 |
| :--- | :--- | :--- |
| **Source chain** | ブロック生成、light client フレンドリーな header | デフォルトで Header / Merkle tree / BLS 集約 |
| **Destination chain** | bridge contract が source の header + proof 検証 | EVM mainnet 互換 = 任意の Solidity light client が動く |

## 失敗例（誤解）

「Light client は full state を持たないから検証不可能」— **間違い**。Light client は state を **生成** しないが、proof があれば **検証** できる。Bridge は light client を **検証者** として使う（relayer が proof 生成 + light client が検証）。

「Ethereum PoW 時代の light client は研究用」— **正しい**。PoS が経済性を変えた（固定 validator + BLS 集約）→ 実用領域に。**プロトコル選択次第で light client の実用性が決まる**。

「ZK light client は遅い」— **半分間違い**。**on-chain 検証は定数（~ms）** で爆速、off-chain proof 生成が ~分-時間で高コスト。高スループットなら ZK が漸近的に勝つ。

> 🛑 **予測。** Light client は ~MB、フルノードは ~1TB。Light client にできないことを 3 つ挙げる（state を必要とするものを考える）（答え: ① **proof なしで任意 state 参照** — full state を持たない、② **任意 tx 実行** — 実行に必要な full state を持たない、③ **state proof の生成** — 検証のみ可能。Light client は state に関するクレームの **検証者** であって **生成者** ではない。Bridge では relayer が proof 生成 + light client が検証 = 役割分担。）

## ステップで組み立てる

### Step 1: できる / できない 4+3 を即答

できる: header 検証 + state inclusion 検証 + tx inclusion 検証 + コンセンサス追従。
できない: 任意 state 参照 + 任意 tx 実行 + state proof 生成。

### Step 2: Sync committee の仕組み

512 validator ローテーション + BLS 集約 + ~MB/期間 + ~27 時間/期間。

### Step 3: 3 必要要素

初期信頼 checkpoint（一度だけ out-of-band）+ sync committee 更新（期間ごと）+ header 更新（期間中）。

### Step 4: Helios の構造を読む

\`consensus.rs\`（コンセンサス）/ \`state.rs\`（state proof）/ \`rpc/lib.rs\`（アプリ向け RPC）。wasm でブラウザ動作。

### Step 5: Naive vs ZK light client

Naive = O(N) per-header on-chain / ZK = O(1) on-chain + O(N) off-chain。高スループットで ZK 漸近勝利。

### Step 6: Reth ベース chain の役割

Source = Reth がデフォルトで light client フレンドリー / Destination = mainnet 互換で任意 Solidity light client 動作。

## 答え合わせ

- **PoS が PoW より light client friendly な理由**: PoW = chain-of-work 検証（マイナー逐次署名なし、Merkle proof のみ）→ trust 仮定が弱い + 安価検証困難。PoS = 固定 validator + BLS 集約 → 「committee が署名したか」を 1 つの BLS 検証で確認可能 → 数 MB + ~ms。**経済モデルが light client を成立させた**。
- **ZK light client が漸近的に安くなる場面**: スループットが高く on-chain ガスが律速。Naive O(N) per-header → ZK O(1) on-chain + O(N) off-chain（GPU で安く）。10000 header / 日なら naive $5000、ZK $50 + off-chain $10 = $60。**100× 削減**。
- **Reth ベース chain の light client 設計の自由度**: Source 側は Reth がデフォルトで提供（Header + Merkle + BLS）、Destination 側は mainnet 互換 EVM で任意 Solidity light client が動く。**自由度を最大化したまま最小信頼を維持**。Tempo の場合、Ethereum 上の Tempo light client を別途書く必要あり（こちらは validator ~30 で安価）。

## 合格基準

- Light client の できる 4 / できない 3 を即答できる。
- Sync committee + BLS の仕組みを 1 文で説明できる。
- 3 必要要素を順に言える。
- Helios の 3 主要ファイルを役割で言える。
- Naive vs ZK light client の漸近コスト trade を計算できる。

## まとめ（3行）

- Light client = 数 MB + スマホ CPU でフルノードと同じ検証、PoS + BLS 集約が経済性を成立、Helios が a16z 製 Rust 本番実装（~10k 行）。
- 3 必要要素（初期信頼 checkpoint + sync committee 更新 + header 更新）で chain に追従、検証は ~ms。
- Bridge endgame = ZK light client（trust = 数学、on-chain O(1)、高スループットで漸近勝利、Succinct SP1 / Espresso / Polyhedra が本番例）。
`,
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
                  title: 'レッスン2 — OP Standard Bridge（canonical な L2 deposit/withdrawal）',
                  slug: 'bridges-op-standard-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# レッスン2 — OP Standard Bridge（canonical な L2 deposit/withdrawal）

## 問い

すべての OP Stack chain（Optimism、Base、Mode、Worldchain、Zora）が同じ bridge を走らせる。各 chain が個別に multisig や validator を立てない。**rollup 自身のコンセンサスが bridge の trust アンカー**。これが canonical な「trustless L1↔L2」リファレンス。**Bridge は rollup へのインタフェース、trust は rollup にある — その構造は？**

## 原理（最小モデル）

- **Bridge は rollup インタフェースで trust は rollup 側.** Multisig も guardian もない、rollup コンセンサスが強制。
- **Deposit = 強制 inclusion で trustless.** L1 contract がイベント発火 → L2 sequencer が ~1 時間以内に処理必須 → 未処理なら誰でも強制 inclusion。
- **Withdrawal = 7 日チャレンジ期間で遅延.** State root 提出 ~1h ごと + チャレンジ 7 日 + prove + finalize 2 段階 → 合計 ~7 日。
- **5 contract 構成.** L1StandardBridge + L2StandardBridge + OptimismPortal + L2OutputOracle + L1CrossDomainMessenger。Bridge は asset interface、その下が汎用 messenger。
- **Standard Bridge と Native Bridge の併存.** ERC20 マッピング（要登録）vs ETH 直接。
- **Fast withdrawal market が UX 解.** 第三者 LP が 7 日リスク引き受け + 手数料、Across / Hop / Connext。trustless bridge 上の金融商品。
- **ExEx パターンで bridge イベントを取り込み.** op-bridge example が \`sol!\` + \`decode_raw_log\` で型安全イベント取り込み。

## 具体例

Deposit フロー:

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

Withdrawal フロー:

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

5 contract（[\`ethereum-optimism/optimism\`](https://github.com/ethereum-optimism/optimism) の \`packages/contracts-bedrock/\`）:

| Contract | 役割 |
| :--- | :--- |
| \`L1StandardBridge.sol\` | L1 側ユーザ入口（deposit）+ 出口（withdraw） |
| \`L2StandardBridge.sol\` | L2 側ミラー — withdrawal で wrapped token burn |
| \`OptimismPortal.sol\` | クロスドメインメッセージ用 L1 inbox/outbox |
| \`L2OutputOracle.sol\` | L1 上に L2 state root commitment 保存 |
| \`L1CrossDomainMessenger.sol\` | 汎用メッセージパッシング（トークン以外も） |

Withdrawal 遅延の 3 要因:

1. State root 提出: ~1 時間ごと（設定可能）
2. チャレンジ期間: 7 日（fraud proof のため）
3. 2 段階確定: prove + finalize（別々の tx）

合計 ~7 日。

Fast withdrawal market:

1. L2 で withdrawal 観測
2. ただちに L1 トークン送金（手数料差し引き）
3. 7 日待つ
4. 期間経過後に L1 で withdrawal クレーム

LP = **withdrawal リスク**（state proof 失敗）引き受け + 手数料獲得。Across / Hop / Connext が運営。

ExEx パターン（[op-bridge example](https://github.com/paradigmxyz/reth-exex-examples/tree/main/op-bridge) より）:

\`\`\`rust
sol!(L1StandardBridge, "l1_standard_bridge_abi.json");
use crate::L1StandardBridge::{
    ETHBridgeFinalized, ETHBridgeInitiated, L1StandardBridgeEvents,
};

// 各ブロックを監視 → bridge イベントを decode → 自前 DB に保存
// 反対側の bridge contract がこの index に問い合わせ
\`\`\`

## 失敗例（誤解）

「OP Standard Bridge は multisig を信頼する」— **間違い**。Bridge は **rollup コンセンサス** を信頼するだけ。Multisig は介在しない。「trustless = rollup 自身が安全な範囲で trustless」。

「Withdrawal 7 日は技術的限界」— **間違い**。**設計選択**（optimistic rollup の fraud proof window）。ZK rollup なら数時間。7 日は fraud proof 提出窓口で、これがなければ sequencer の嘘を検知できない。

「Standard Bridge と Native Bridge は同じ」— **間違い**。Standard = ERC20 マッピング（要登録、L1/L2 アドレス対応付け）、Native = ETH + OP トークン直接。**登録なしの ERC20 は bridge 不可**。

> 🛑 **予測。** Ethereum → Optimism に 1 ETH deposit すると ~2 分で反映。1 ETH 引き出しは Ethereum 側で再び使えるまでどれだけかかるか？ なぜ？（答え: **~7 日**。理由 3 段: ① state root 提出 ~1h ごと、② 7 日チャレンジ期間（fraud proof window）、③ 2 段階確定（prove + finalize の別 tx）。**deposit は強制 inclusion で trustless**（rollup コンセンサスが L1 イベントを ~1h 以内に取り込み強制）、**withdrawal は fraud proof window が必要**（sequencer が L2 state について嘘ついた場合に誰でも fraud proof で reject できるよう待つ）。trustless だが速度差は構造的。）

## ステップで組み立てる

### Step 1: Deposit vs Withdrawal の非対称

Deposit = ~2 分 trustless（強制 inclusion）/ Withdrawal = 7 日（fraud proof window）。

### Step 2: 5 contract を即答

L1StandardBridge / L2StandardBridge / OptimismPortal / L2OutputOracle / L1CrossDomainMessenger。Bridge は asset interface、その下が汎用 messenger。

### Step 3: Withdrawal 遅延 3 要因

State root 提出 + チャレンジ 7 日 + 2 段階確定。

### Step 4: Fast withdrawal market

第三者 LP が 7 日リスク引き受け + 手数料、trustless bridge 上の金融商品。

### Step 5: ExEx でイベント取り込み

\`sol!\` + \`decode_raw_log\` で型安全イベント取り込み、自前 indexer / bridge に流す。

### Step 6: Tempo↔Ethereum に当てはめる

Tempo = OP Stack でないスタンドアロン L1 → OP Standard Bridge そのまま不可、**パターンのみ適用**。必要:
- Tempo Standard Bridge（両側 Solidity）
- Tempo 上で Ethereum light client
- Ethereum 上で Tempo light client（難しい方）
- ZK light client 本番化までは CCIP の領域

## 答え合わせ

- **Deposit が trustless な理由**: L1 contract がイベント発火 → L2 sequencer が ~1h 以内に取り込み必須 → 未処理なら誰でも強制 inclusion → rollup コンセンサスが強制。**Sequencer の善意ではなく rollup ルールが trust 担保**。
- **Withdrawal 7 日の正当化**: fraud proof window。sequencer が「L2 state は X」と嘘の state root を提出した場合、誰でも 7 日以内に fraud proof を提出して reject 可能。これがなければ L1 が sequencer を信用するだけ → multisig と同等。**7 日 = optimistic セキュリティの代価**。
- **Bridge と Native Bridge の使い分け**: ETH = Native（OP Stack のネイティブ assetなので直接）、他 ERC20 = Standard（L1/L2 トークンアドレス登録 + マッピング、登録なしは bridge 不可）。**Standard が「任意トークン用」、Native が「特権 asset 用」**。

## 合格基準

- Deposit vs Withdrawal の trust モデルと時間を即答できる。
- 5 contract を役割で言える。
- Withdrawal 遅延 3 要因を順に言える。
- Fast withdrawal market が trustless bridge + 金融商品の構造であることを説明できる。
- ExEx パターンで bridge イベントを取り込む \`sol!\` + \`decode_raw_log\` を書ける。

## まとめ（3行）

- OP Standard Bridge = canonical「trustless L1↔L2」、Multisig も guardian もなし、rollup コンセンサスが trust アンカー。
- Deposit ~2 分（強制 inclusion）vs Withdrawal ~7 日（fraud proof window）= optimistic セキュリティの代価、5 contract（L1/L2 Standard + Portal + OutputOracle + CrossDomainMessenger）。
- ExEx + \`sol!\` で bridge イベントを型安全に取り込み、Tempo は OP パターンを参照しつつ独自 Standard Bridge + 双方向 light client + 暫定 CCIP。
`,
                },
                {
                  title: 'レッスン3 — Chainlink CCIP（Tempo が使うクロスチェーンレール）',
                  slug: 'bridges-ccip-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 45,
                  content: `# レッスン3 — Chainlink CCIP（Tempo が使うクロスチェーンレール）

## 問い

Tempo で merchant が USDC で決済を受け取る。裏側で treasury 用に Ethereum、DeFi yield 用に Solana に決済必要 — 3 chain にまたがり 2 つは直接通信不可。**Tempo が今日まさに本番で動かしているクロスチェーン決済のレールが Chainlink CCIP** — light client でも Wormhole fork でもない、任意 chain ペア向け本番 bridge。

## 原理（最小モデル）

- **2 ネットワーク + RMN.** Committing DON（source イベント → Merkle commitment）+ Executing DON（destination で実行）+ Risk Management Network（悪意 / 制裁メッセージ veto、別 validator）。
- **CCIP は技術的には multisig.** 専用設計（大 validator + RMN + トークンプール + chain ごとリスクパラメータ）= 「洗練された multisig」。
- **Trust 仮定: DON 共謀 + RMN.** DON 共謀でメッセージ偽造可、RMN がバックアップ（特定レーン停止）。**暗号 trustless ではなく信頼ベース**。
- **メッセージ 3 形態.** Data-only（任意 calldata） / Token（asset 転送） / Programmable（両方、Soltempo の主用途）。
- **トークンプールモデルで wrapping カオス回避.** Burn-mint（USDC.e ではなく canonical USDC）/ Lock-release（プール保持）。
- **レーンモデル.** 向きのある chain ペア、Ethereum→Tempo と Tempo→Ethereum は別。30+ chain × ~900 レーン構成可能。
- **手数料.** Native gas または LINK（~20% 割引）、$0.50-$2/msg = 決済 $100+ で許容。
- **CCIP vs 代替.** Wormhole（19/N multisig、最安 multisig リスク）/ LayerZero（DVN モデル、柔軟）/ OP Standard（L2 専用 7 日）。Tempo は trust + 規制で CCIP 勝ち。

## 具体例

CCIP アーキテクチャ:

\`\`\`mermaid
flowchart LR
    Source["Source chain<br/>(Ethereum)"] -->|user tx| Router["CCIP Router"]
    Router -->|emit| OnRamp["OnRamp contract"]
    OnRamp -->|message| DON["Decentralized Oracle Network<br/>(commit + execute)"]
    DON -->|verify + relay| OffRamp["OffRamp contract"]
    OffRamp -->|deliver| Dest["Destination chain<br/>(Tempo)"]
    RMN["Risk Management<br/>Network"] -.->|cursing| DON
\`\`\`

3 ネットワーク:

| ネットワーク | 役割 | Trust モデル |
| :--- | :--- | :--- |
| Committing DON | Source イベントを Merkle commitment に集約 | M-of-N の PoS validator |
| Executing DON | Destination でメッセージ実行 | 同じ / 別の N-of-M |
| Risk Management Network | 悪意 / 制裁メッセージ veto | 別 validator、off-chain monitoring |

メッセージフォーマット:

\`\`\`solidity
struct Any2EVMMessage {
    bytes32 messageId;       // 一意 ID
    uint64 sourceChainSelector;
    bytes sender;            // Source 上の ABI エンコード sender
    bytes data;              // 任意の calldata
    EVMTokenAmount[] destTokenAmounts;  // Destination で release するトークン
}
\`\`\`

メッセージ 3 形態:

| ユースケース | 何を送るか | 例 |
| :--- | :--- | :--- |
| Data-only | \`data\`（任意 calldata） | 汎用クロスチェーン呼び出し |
| Token | \`destTokenAmounts\` | Asset 転送 |
| Programmable | 両方 | クロスチェーン swap、settle-and-call、**Soltempo** |

CCIP vs 代替（merchant 規模支払い）:

| Bridge | Trust モデル | 手数料 | レイテンシ | Tempo にとって |
| :--- | :--- | :--- | :--- | :--- |
| CCIP | PoS DON + RMN | $0.50-$2 | ~10 分 | 本番準備済、Solana サポート |
| LayerZero | DVN モデル | $0.30-$1 | ~5 分 | Solana サポート、柔軟 |
| Wormhole | 19-of-N guardian multisig | $0.20-$1 | ~2 分 | 最安だが multisig リスク |
| OP Standard | Rollup コンセンサス | ~$0.10 + L1 gas | 7 日 | L2 専用、Tempo 用途に不適 |

Solidity Receiver（Tempo 上の Soltempo Vault）:

\`\`\`solidity
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

Rust Receiver（Tempo→Solana、Anchor）:

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

mppsol アーキテクチャ:

\`\`\`
Merchant 支払い ──[CCIP]── Solana DeFi ──[CCIP]── Tempo merchant 残高
       ↑                       ↓                          ↑
  Ethereum USDC            Yield earn                オンデマンド引出し
\`\`\`

## 失敗例（誤解）

「CCIP は trustless」— **間違い**。技術的には multisig（committing + executing DON）+ RMN（バックアップ）。**洗練された保護機構を備えた multisig** であって暗号 trustless ではない。DON 共謀でメッセージ偽造可、RMN がそれを止めるが信頼ベース。

「Wormhole の方が安いから choose Wormhole」— **半分間違い**。確かに $0.20-$1 で最安、$0.50-$2 の CCIP より安い。しかし **multisig リスク**（過去 $325M ハック）+ 規制統合の弱さ。Tempo は trust + 規制 + 本番成熟度で CCIP。

「トークンプール = wrapping」— **間違い**。Wrapping は USDC.e のような偽 USDC を作る、トークンプールは **canonical USDC のまま** burn-mint（source で burn、destination で同 total supply から mint）。**「USDC.e」は存在せず、別 chain 上の同じ USDC**。

> 🛑 **予測。** CCIP は「Risk Management Network」がメッセージを **ブロックする** 権限を備えている。なぜ？ 純粋暗号で防げない何の攻撃を防ぐ？（答え: ① **DON 共謀メッセージ偽造**（committing + executing DON が共謀すれば不正メッセージ通せる）、② **特定アドレスの悪意活動**（北朝鮮制裁アドレスからの bridge を停止）、③ **緊急時の規制対応**（裁判所命令でレーン停止）、④ **新興バグ発覚時の影響限定**（DON ソフトウェアバグ判明時にレーンを pause）。**暗号は数学的に正しい結果を保証するが、人間社会の例外を扱えない** → RMN が「数学が正しくても社会的に正しくない」ケースの安全弁。第二防衛層。）

## ステップで組み立てる

### Step 1: 3 ネットワークを即答

Committing DON / Executing DON / RMN。

### Step 2: メッセージ 3 形態

Data-only / Token / Programmable。Soltempo は Programmable（USDC + 決済メタデータ）。

### Step 3: トークンプールの burn-mint vs lock-release

USDC = burn-mint（canonical 維持）/ wrapped token = lock-release（pool 保持）。**wrapping カオス回避**。

### Step 4: CCIP vs 代替を判断

Trust + 規制成熟度 = CCIP。最安 = Wormhole（multisig リスク）。柔軟性 = LayerZero。L2 専用 = OP Standard。

### Step 5: Solidity / Rust Receiver パターン

\`CCIPReceiver\` 継承 + \`_ccipReceive\` override + sender 検証 + メッセージ処理。EVM = Solidity / Solana = Anchor Rust。**同じパターン、言語差**。

### Step 6: 手数料モデル

Native gas または LINK（20% 割引）、$0.50-$2/msg。**$100+ の決済で許容**（0.5% 以下）。

### Step 7: スケール検証

レーンあたり 10-100 msg/sec、1000 同時決済はキュー積み。即時性必須なら問題、非即時なら許容。

## 答え合わせ

- **CCIP の真の trust 仮定**: DON 共謀でメッセージ偽造可 + RMN がバックアップ（特定レーン停止可能）+ 規制対応で外部介入可能。**「multisig + 第二防衛層」**。暗号 trustless ではないが、本番運用 + 規制統合 + RMN 安全弁で機関投資家向きの trust モデル。
- **Soltempo が CCIP 専用の理由**: ① Solana サポートが成熟（CCIP は 2026 で対応）、② RMN による on-chain リスク管理（規制対応で重要）、③ 機関統合実績 + 保険、④ Chainlink の最も確立されたクロスチェーンインフラ。**規制された決済レール = 速度より trust + 制度**。
- **$1M 決済 $0.50 手数料の妥当性**: 0.005% = 極低い。クレジットカード 2-3% / 国際送金 5-10% と比較で圧倒的。スループット限界（レーン 10-100 msg/s）= 1000 同時決済キューイングで非即時用途には許容、merchant リアルタイム UX 要求では問題。

## 合格基準

- 3 ネットワーク（Committing / Executing DON + RMN）を即答できる。
- メッセージ 3 形態と Soltempo の使い分けを言える。
- トークンプール（burn-mint vs lock-release）を説明できる。
- CCIP vs Wormhole / LayerZero / OP Standard を 4 軸で比較できる。
- Solidity / Rust Receiver パターンを書ける。

## まとめ（3行）

- CCIP = 「洗練された multisig」（Committing + Executing DON + RMN）、技術的 trustless ではないが本番運用 + 規制統合 + RMN 安全弁で機関投資家向き trust モデル。
- トークンプール burn-mint で wrapping カオス回避（USDC.e 不要）、メッセージ 3 形態（Data / Token / Programmable）、$0.50-$2/msg で決済 $100+ に許容。
- Tempo（Soltempo + mppsol）が本番採用 = trust + 規制 + Solana サポート成熟度の組み合わせで Wormhole / LayerZero を上回る、Solidity \`CCIPReceiver\` + Rust Anchor で両 VM 対応。
`,
                },
                {
                  title: 'レッスン4 — Wormhole と IBC（マルチチェーンメッセージプロトコル）',
                  slug: 'bridges-wormhole-ibc-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 14,
                  xpReward: 40,
                  content: `# レッスン4 — Wormhole と IBC（マルチチェーンメッセージプロトコル）

## 問い

CCIP が規制環境下の Tempo merchant 用 bridge なら、**Wormhole は 2022 年に Solana DeFi が Ethereum に届くために使った bridge**（速・安・19 鍵 multisig、過去ハック済）。**IBC は 2019 年以降 Cosmos chain が使い続けている**（遅・安全・Cosmos 内）。**CCIP が真ん中、両端を画す 2 つを並べると何が見えるか？**

## 原理（最小モデル）

- **Wormhole = 19 guardian + 13-of-19 multisig.** Solana / Ethereum / Sui / Aptos / Bitcoin（wrapping）含む 30+ chain サポート。**唯一の trust 仮定 = 13-of-19**。
- **2022 ハック $325M は鍵盗難ではなく署名検証バグ.** Solana program のチェック漏れ。**Multisig は鍵 + 検証ロジックの 2 経路で破られる**。
- **IBC = 各 chain が相手の light client を動かす.** Relayer（permissionless）が header + state proof 提出 → destination の light client で検証 → 純粋暗号、multisig 介在せず。
- **IBC が Cosmos 外で支配しない理由.** chain Y で chain X の light client を動かすには Y が X のコンセンサスルールを検証可能必要 → Cosmos = Tendermint 共通で同コード使い回し、Ethereum で Tendermint 検証実装は高価。
- **Polymer が IBC↔Ethereum を rollup ハブで橋渡し中.**
- **Trust スペクトラム再訪.** Wormhole = Multisig / CCIP = PoS / OP Standard = Optimistic + Rollup / IBC = Light client / 将来 = ZK light client。

## 具体例

Wormhole アーキテクチャ:

- **19 個の Guardian ノード**、それぞれが validator 運用
- Guardian が source-chain イベント観測
- 各 guardian が attestation 署名: 「chain Y で event X 観測」
- **13-of-19** 署名でメッセージ valid
- Destination chain が署名集約検証

2022 ハック事例:

- 攻撃者が Wormhole-bridged ETH を $325M 持ち去り
- 根本原因 = **署名検証バグ**（鍵盗難ではない）
- Solana program のチェック漏れ
- 攻撃者は妥当に見える署名を偽造 = 19 guardian がいてもコントラクトにバグあれば無意味

IBC フロー:

\`\`\`mermaid
flowchart LR
    A["Cosmos Hub<br/>(source)"] -->|1. Packet 送信| AClient["IBC client<br/>on source"]
    AClient -->|2. Commit + sign| Relayer["IBC Relayer<br/>(off-chain)"]
    Relayer -->|3. Headers + proof 中継| BClient["IBC client<br/>on destination"]
    BClient -->|4. Header に対し検証| B["Osmosis<br/>(destination)"]
\`\`\`

IBC の特徴:
- **各 chain が相手の light client** 動作
- relayer 誰でも（permissionless）
- relayer = source header + state 変更の proof 提出
- proof 検証 = destination chain が暗号的にクロスチェーンアクション実行
- multisig 介在せず

なぜ IBC が Cosmos 外で支配しないか:
- chain Y で chain X の light client → Y が X のコンセンサスルールを検証可能必要
- **Cosmos chain は全部 Tendermint → 同 light client コードがそのまま動く**
- Ethereum で Tendermint 検証 = 高価 Solidity contract
- Solana で同等 = Anchor program
- **クロスエコシステム IBC は理論可能だが実装コスト高で実用例乏しい**

Wormhole + IBC + CCIP の使い分け:

| ユースケース | 最適 | 理由 |
| :--- | :--- | :--- |
| Solana ↔ Ethereum | CCIP / Wormhole | Solana サポート成熟 |
| Cosmos chain 同士 | IBC | Trustless、他に選択肢なし |
| EVM L1 ↔ EVM L1 | CCIP / LayerZero | 汎用 EVM-EVM 向け |
| L2 ↔ L1（OP Stack） | OP Standard | Trustless |
| Bitcoin ↔ EVM | Wormhole（wrapping） | 代替少 |
| Permissionless 任意 chain | Wormhole | エコシステム到達範囲最大 |

Trust スペクトラム再訪:

| プロトコル | 位置 |
| :--- | :--- |
| Wormhole | Multisig（13-of-19） |
| CCIP | PoS bridge（DON + RMN） |
| OP Standard | Optimistic + rollup コンセンサス |
| IBC | Light client（Tendermint） |
| 将来 ZK light client | ZK light client |

## 失敗例（誤解）

「Wormhole は 19 guardian = 分散化されている」— **間違い**。f = ⌊(19-1)/3⌋ = 6 Byzantine 耐性だが、**実際の故障モードは Byzantine 共謀ではなく運用侵害（鍵盗難）か検証バグ**。Guardian を増やしてもコントラクトバグは救えない。

「IBC は Ethereum サポートを追加すれば支配的 bridge」— **間違い**。Tendermint 検証を Solidity で実装するコストが高い + 各 chain 用 light client が必要 → **chain 追加コストが超線形**。bridge トリレンマで「trustless + general」を選ぶと extensibility を諦める = IBC が Cosmos に閉じる理由。

「CCIP が trustless」— **間違い**（再掲）。**multisig + 第二防衛層**。Wormhole（13/19）と CCIP（DON + RMN）は同じ multisig 系列で trust スペクトラム上は近い。IBC は完全別系列（light client = 暗号）。

> 🛑 **予測。** Wormhole は 30+ chain、IBC は Cosmos chain のみ。なぜ IBC は Ethereum サポート追加して支配的にできないか？（答え: ① **chain ごと light client 実装コスト高** = Cosmos 全部 Tendermint で同コード使い回しできるが、Ethereum で Tendermint 検証実装は高価 Solidity + Solana で Anchor program 必要、② **bridge トリレンマ**（trustless + general + extensible 同時不可）で IBC は「trustless + general」を選ぶ → extensibility を諦める = 各ペア light client 実装でしか動かない、③ **エコシステム拡張のインセンティブが弱い** = Cosmos 内では IBC が必須だが、Ethereum / Solana 側は既存 bridge（CCIP / Wormhole）で十分。**Polymer が rollup ハブで橋渡し中**だが本番化に時間 + IBC の優位性（trustless）が他の Solana / Ethereum 向け bridge ユーザに刺さりにくい。）

## ステップで組み立てる

### Step 1: Wormhole と IBC の対比

Wormhole = multisig（19 guardian、13 必要）、30+ chain サポート / IBC = light client、Cosmos 内のみ。**両極**。

### Step 2: 2022 ハックの教訓

Multisig は鍵 + 検証ロジックの 2 経路で破られる。Guardian を増やしてもバグは救えない。

### Step 3: IBC が Cosmos に閉じる構造的理由

各 chain で相手の light client → Cosmos は Tendermint 共通で動く → Ethereum / Solana は別実装で高コスト。**bridge トリレンマで extensibility 諦め**。

### Step 4: 6 ユースケースの使い分け

Solana↔Ethereum（CCIP/Wormhole）/ Cosmos 内（IBC）/ EVM↔EVM（CCIP/LZ）/ L2↔L1 同 stack（OP Standard）/ BTC↔EVM（Wormhole）/ 任意 chain（Wormhole）。

### Step 5: Trust スペクトラム上の位置

Wormhole（Multisig）< CCIP（PoS）< OP Standard（Optimistic + Rollup）< IBC（Light client）< 将来 ZK light client。

### Step 6: Polymer = IBC↔Ethereum 橋渡しの試み

Rollup ハブで Cosmos の IBC を Ethereum エコシステムに接続。**本番化中、Tempo 用途では時期尚早**。

## 答え合わせ

- **Wormhole 19 guardian の本当のセキュリティ**: 理論的 f = 6（19 guardian で 6 Byzantine 許容）だが、**実故障モード = 共謀ではなく** ① 運用侵害（鍵盗難で 9/5 取得など）、② 検証バグ（コントラクトが署名を実際に検証していない）。Guardian 数は 2 経路（鍵 + コード）どちらの攻撃も救わない。**multisig の根本的脆さ**。
- **IBC が Cosmos に閉じる理由**: ① 各 chain ペアで相手の light client 実装必要 → Cosmos 内 Tendermint 共通でコスト 0、Ethereum / Solana で別実装 → 高コスト、② bridge トリレンマで trustless + general を選ぶと extensibility 諦め、③ Cosmos 外のユーザは既存 bridge で十分（CCIP / Wormhole の集客力）→ IBC 拡張のインセンティブ弱。**Polymer が rollup ハブで橋渡し中だが本番化に時間**。
- **3 プロトコルが「競合ではなく相補的」な理由**: 異なる trust 許容度 + 異なるエコシステム。Wormhole = Solana / Bitcoin 向け（multisig 許容ユーザ + 速度優先）、CCIP = 機関投資家 / 規制対象（PoS + RMN + 規制統合）、IBC = Cosmos 内（trustless 必須 + 同コンセンサス前提）。**棲み分けが trust スペクトラム + エコシステム 2 軸で決まる**。

## 合格基準

- Wormhole 19/13 multisig と 2022 ハック教訓を即答できる。
- IBC が各 chain で相手 light client を動かす仕組みを言える。
- IBC が Cosmos 外で支配しない理由を構造的に説明できる。
- 6 ユースケースの最適 bridge を判断できる。
- Trust スペクトラム上の 5 プロトコル位置を順に言える。

## まとめ（3行）

- Wormhole = 19/13 multisig（30+ chain、最広範、最 trust 仮定弱）/ IBC = 各 chain 相互 light client（Cosmos 内 trustless）= trust スペクトラム両極。
- 2022 Wormhole ハック教訓 = Multisig は鍵 + 検証ロジックの 2 経路で破られる、Guardian 数は救えない、Light client にはこの攻撃面なし。
- 3 プロトコル（Wormhole / CCIP / IBC）は競合ではなく相補的、棲み分けは trust スペクトラム + エコシステム 2 軸で決まる、Polymer が IBC↔EVM 橋渡し中。
`,
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
                  title: 'レッスン5 — Reth 上の最小 bridge を作る（light-client 検証メッセージング）',
                  slug: 'bridges-build-minimal-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 22,
                  xpReward: 55,
                  content: `# レッスン5 — Reth 上の最小 bridge を作る（light-client 検証メッセージング）

## 問い

理論 + 本番コードを読んだ。**次は最小の trust 最小化 bridge を実際に組む** — Tempo が Ethereum light client を動かし、source イベントの inclusion proof を検証する Ethereum→Tempo フロー。multisig なし、guardian なし、fast-withdrawal LP なし。**Bridge は 3 コンポーネントから成る — それぞれが何をして何を信頼するか？**

## 原理（最小モデル）

- **3 コンポーネント.** L1 Bridge Contract（source、何も信頼しない）+ Relayer（permissionless、信頼不要）+ L2 Bridge Contract + Light client（Ethereum コンセンサスのみ信頼）。
- **Trust 仮定 1 つ.** Ethereum の PoS が正しく動くこと、それ以外は何もない。
- **L1 Contract = イベント発火のみ.** Lock + emit Event、relayer 依存なし、permissionless 観測可能。
- **Relayer = stateless 中継.** Locked イベント観測 → inclusion proof 生成 → L2 contract に提出。誰でも動かせる、落ちたら他が引き継ぐ。
- **L2 Light client が 3 メソッド.** \`updateSyncCommittee\` 期間ごと + \`addHeader\` block ごと + \`verifyInclusion\` 検証。
- **L2 Bridge contract.** Light client.verifyInclusion → wrapped token mint。
- **コスト = ~$6-7 / bridge tx.** ZK light client なら ~10 分の 1。
- **3 落とし穴.** Light client trusted setup（初期 checkpoint）+ Replay 防止（claimed mapping）+ Withdrawal 方向（Ethereum で Tempo light client、こちらが難しい）。

## 具体例

アーキテクチャ:

\`\`\`mermaid
flowchart LR
    User["User on Ethereum"] -->|1. USDC lock + イベント発火| L1Contract["L1 Bridge Contract"]
    L1Contract -->|2. イベント観測| Relayer["Relayer<br/>(off-chain、誰でも)"]
    Relayer -->|3. Proof 提出| L2Contract["Tempo Bridge Contract"]
    L2Contract -->|4. Ethereum light client に対し検証| LightClient["Ethereum Light Client<br/>on Tempo"]
    LightClient -->|valid| L2Contract
    L2Contract -->|5. Wrapped USDC mint| User2["User on Tempo"]
\`\`\`

L1 Contract（Solidity）:

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

Relayer（Rust）:

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

L2 Light client（Solidity）:

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
        // 現 committee の 2/3+ で署名されたかを検証
        verifyCommitteeSignature(update);
        // 次期間用に現 committee を更新
        currentSyncCommitteeHash = computeCommitteeHash(update.newCommittee);
    }

    function addHeader(
        Header calldata header,
        bytes calldata signatures
    ) external {
        // 現 committee の 2/3+ で署名されたかを検証
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

L2 Bridge contract（Solidity）:

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
        // イベントが light client 経由で Ethereum の block N にあったかを検証
        require(
            lightClient.verifyInclusion(slot, eventHash, merkleProof),
            "invalid proof"
        );
        // Tempo 上で wrapped USDC を mint
        IERC20(wrappedToken[token]).mint(user, amount);
    }
}
\`\`\`

コスト内訳:

| 操作 | Chain 上のコスト | いつ発生 |
| :--- | :--- | :--- |
| L1 \`lock\` | ~80k gas (~$2) | User tx ごと |
| Light client \`updateSyncCommittee\` | ~50k gas (~$1.50) | 27 時間ごと（sync committee 期間） |
| Light client \`addHeader\` | ~20k gas (~$0.60) | Ethereum block ごと（~12s） |
| L2 \`claim\` | ~150k gas (~$4.50) | User tx ごと |

**ユーザコスト**: bridge tx あたり ~$6-7（ガス価格依存）。

ZK light client 版なら \`addHeader\` を epoch あたり 1 件の定数コスト proof 検証に置換 → 総コスト **~10 分の 1**。

Replay 防止:

\`\`\`solidity
mapping(bytes32 => bool) public claimed;
require(!claimed[eventHash], "already claimed");
claimed[eventHash] = true;
\`\`\`

Withdrawal 方向（Tempo → Ethereum）の追加要件:
- Tempo bridge が Withdrawn イベント発火
- Ethereum 上で Tempo の light client（こちらが難しい方）
- L1 bridge が Tempo light client に対する proof 受け入れ

Tempo（Reth ベース BFT）の場合、Ethereum 上の Tempo light client は Ethereum のそれより単純（validator セット有界 + BFT 署名で済む、~30 validator なら header ~5k gas）。

## 失敗例（誤解）

「Relayer を信頼する必要がある」— **間違い**。Relayer は **stateless 中継**、誰でも動かせる。proof が valid なら採用、invalid なら reject。落ちたら別の誰かが引き継ぐ。**信頼すべきは Ethereum のコンセンサスのみ**。

「Light client trusted setup = 永続的信頼」— **半分間違い**。trusted setup は **setup 時のみ**（初期 checkpoint = Tempo チーム / DAO 信頼）。継続的信頼ではない、IBC も新 client で DAO ガバナンス採用。

「Withdrawal も同じく簡単」— **間違い**。Ethereum で Tempo の light client が必要 = こちらが難しい方。ただし Tempo BFT は有界 validator + BFT 署名で Ethereum PoS（512 sync committee）より単純 = ~30 validator で header ~5k gas。

> 🛑 **予測。** Bridge は 3 コンポーネント = L1 contract + Relayer + L2 contract + Light client（L2 内）。それぞれが何をして何を信頼するか？（答え: ① **L1 Bridge Contract** = lock + Locked イベント発火、**自身が source of truth、何も信頼しない**。② **Relayer** = Ethereum 観測 → inclusion proof 生成 → L2 提出、**permissionless、信頼不要**（proof が valid なら誰でも採用される）。③ **L2 Bridge Contract** = light client.verifyInclusion → wrapped token mint、**light client 経由で Ethereum コンセンサスのみ信頼**。④ **L2 Light client** = updateSyncCommittee + addHeader + verifyInclusion、**Ethereum sync committee 署名のみ信頼**。**システム全体の trust 仮定 = Ethereum の PoS が正しく動くこと、それ以外何もない**。）

## ステップで組み立てる

### Step 1: 4 コンポーネントの責務

L1 Bridge / Relayer / L2 Bridge / L2 Light client。各々の trust モデル即答。

### Step 2: L1 Contract = lock + emit

最も単純、relayer 依存なし、誰でも観測可能。

### Step 3: Relayer = stateless 中継

Locked 観測 → inclusion proof → L2 提出。誰でも動かせる + 落ちたら引き継ぎ可能。

### Step 4: L2 Light client = 3 メソッド

\`updateSyncCommittee\`（期間ごと）+ \`addHeader\`（block ごと）+ \`verifyInclusion\`（クエリ）。

### Step 5: L2 Bridge = verify → mint

Light client.verifyInclusion 結果のみで mint 判断。**他の trust 仮定なし**。

### Step 6: 3 落とし穴を意識

Trusted setup（初期 checkpoint のみ）+ Replay 防止（claimed mapping）+ Withdrawal 方向（Ethereum で Tempo light client、有界 BFT で安価）。

### Step 7: コスト計算

~$6-7 / bridge tx、ZK light client で ~10 分の 1。

## 答え合わせ

- **全 trust 仮定の正体**: Ethereum の PoS が正しく動くこと。それ以外なし。L1 contract = source of truth（自身）、Relayer = permissionless（誰でも、proof valid なら）、L2 Bridge = light client 経由で Ethereum コンセンサス、Light client = sync committee 署名。**4 段階チェーンで全部が Ethereum コンセンサスに帰着**。
- **3 ユースケースの相当物**: ① **OP Standard Bridge** = optimistic 7 日遅延なしで実現する版（OP は fraud proof window 必要、これは light client で即時 finality）、② **ZK rollup** が本番化したときの目標（light client が ZK proof で置換）、③ **Espresso 共有 sequencer** が今日やっていること（共有 light client が複数 rollup の bridge）。**「trustless bridge」の標準解**。
- **Withdrawal 方向の難しさと解**: Ethereum で Tempo light client = Tempo BFT 検証を Solidity で実装、ただし **有界 validator + BFT 署名で Ethereum PoS（512 sync committee）より単純** = ~30 validator なら header ~5k gas（Ethereum sync committee の 1/10）。**逆向きは構造的に難しいが Tempo BFT の単純さが救う**。

## 合格基準

- 4 コンポーネント（L1 / Relayer / L2 / Light client）を即答できる。
- Trust 仮定 1 つ（Ethereum PoS）を即答できる。
- L1 \`lock\` + L2 Light client 3 メソッドを Solidity で書ける。
- Relayer の Rust ループを書ける。
- 3 落とし穴（trusted setup / replay / withdrawal）を即答できる。

## まとめ（3行）

- 最小 bridge = 3 コンポーネント（L1 \`lock\` + Relayer + L2 \`claim\` + Light client）、trust 仮定 1 つ（Ethereum PoS）、コスト ~$6-7 / tx。
- Solidity 4 contract（EthereumBridge + EthereumLightClient + TempoBridge + Replay mapping）+ Rust Relayer = trustless bridge の標準解、OP Standard / ZK rollup / 共有 sequencer の参照実装。
- Withdrawal 方向は Ethereum 上で Tempo light client 必要だが、有界 BFT で Ethereum PoS より単純（~30 validator で header ~5k gas）= 構造的に難しいが Tempo の単純さが救う。
`,
                },
                {
                  title: 'ファイナルクイズ — クロスチェーン bridge',
                  slug: 'bridges-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 50,
                  content: `# ファイナルクイズ — クロスチェーン bridge

クロスチェーンの最終チェック。Tempo、Hyperliquid、あるいは任意の Reth ベース L1 に触れる bridge を設計するために必要。

レッスン0-5 を通じて: Trust モデル（5 段階スペクトラム / bridge トリレンマ / $2B+ 攻撃の根本原因）/ Light client（できる/できない / sync committee + BLS / Helios / ZK 漸近勝利）/ OP Standard Bridge（Deposit ~2 分 vs Withdrawal 7 日 / 5 contract / Fast withdrawal market）/ Chainlink CCIP（DON + RMN / トークンプール burn-mint / Soltempo 採用）/ Wormhole + IBC（multisig vs light client 両極 / IBC が Cosmos に閉じる構造的理由）/ 最小 bridge 構築（4 コンポーネント / trust 仮定 1 つ）の構造的事実を確認する。
`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
