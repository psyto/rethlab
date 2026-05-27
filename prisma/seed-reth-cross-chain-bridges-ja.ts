import { PrismaClient } from '@prisma/client';

export async function seedRethCrossChainBridgesJA(prisma: PrismaClient) {
  const tags = ['reth', 'bridges', 'ccip', 'optimism', 'wormhole', 'ibc', 'light-client', 'l1', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-cross-chain-bridges-ja',
      title: 'Cross-Chain Bridges — CCIP から light client まで',
      description:
        'chain 間で価値がどう動くかを正直に会計する: 「この multisig を信頼」から「source chain のコンセンサスしか信頼しない」までの trust モデル、攻撃の歴史 ($2B+ 盗まれた)、本番 bridge コード (OP Standard Bridge、Chainlink CCIP、Wormhole、IBC) を読み、Reth 上に最小の light-client 検証 bridge を作る。Tempo↔Solana 決済、OP-stack bridge、ZK light client を architect する準備ができる。',
      difficulty: 'ADVANCED',
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

**過去 5 年で bridge から $2B+ が盗まれている**。マイナーな DeFi 領域の話ではない — 業界最大手チームが運用する、TVL 最上位の bridge から: Ronin ($625M)、Wormhole ($325M)、Poly Network ($611M、返却済み)、Nomad ($190M)。クロスチェーンアーキテクチャの設計判断はすべて、ひとつの問いから派生する: **chain A の state を chain B に動かすために何を信頼しなければならないか、そしてその信頼を最小化したあとに残る攻撃面は何か?**

**Bridge** はその問いに答えるシステム。クロスチェーンインフラの全分野は、**信頼の量** と **残る攻撃面** のバリエーションでしかない。

> 🛑 **スクロール前に予測。** このうち 3 つは $300M+ のハック。**共通する攻撃パターンは?** (ヒント: スマートコントラクトのバグではない。)

## 1. Bridge プリミティブ — 価値 vs メッセージ

「Asset bridge」と「Message bridge」は別物のように語られがちだが、本質的に別ではない。**Asset bridge = message bridge + 各側のトークンコントラクト**。すべてのクロスチェーンインフラは根本的にメッセージパッシングで、asset ケースはその上に規約を重ねたものに過ぎない。

| 種類 | 何が動くか | 例 |
| :--- | :--- | :--- |
| **Asset bridge** | トークン残高 (canonical または wrapped) | USDC をチェーン間で |
| **Message bridge** | 任意の calldata | LayerZero、CCIP arbitrary message |

Tempo↔Solana 決済 (mppsol) の場合: message bridge。ここで動く「asset」は決済の領収書であって、トークンではない。
OP↔Ethereum の場合: ネイティブトークン規約を伴う message bridge (ETH deposit/withdrawal)。
BTC↔EVM (wrapped BTC) の場合: asset bridge。

## 2. Trust スペクトラム

すべての bridge は同じ 1 つの軸上のどこかに位置している: **何を信頼するか?** 最悪端は人間の委員会。最良端は数学。

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

Trust の観点で最良の bridge は **destination chain 上で動く source chain の ZK light client**。最悪は **multisig** — 人間が共謀しないという仮定に依存している。

> 🛑 **理解度チェック。** 13-of-19 multisig bridge は 19 という数の多さから「分散化されている」ように見える。**実際にはなぜ脆いのか?** Multisig には効くが light client には効かない具体的な攻撃は?

Multisig 鍵は **盗まれうる** (Ronin: $625M、攻撃者が spear-phishing で 9 鍵中 5 を取得)。署名者自身が **共謀** することもできる (強制する仕組みがない)。署名インフラが **侵害される** こともある (Wormhole: 鍵盗難ではなく署名検証バグだったが、multisig インフラの脆さを示した)。

Light client にはこれらの故障モードがない — **source chain のコンセンサスルール** に対してヘッダーを検証するだけ。騙す唯一の方法は source chain そのものを騙すこと。

## 3. Bridge トリレンマ

以下 3 つすべてを同時に満たすことはできない:

- **Trustlessness** — 外部信頼仮定なし
- **Generality** — 任意の chain をサポート
- **Extensibility** — 新 chain の追加が容易

**Trustless + general** → chain 追加のコストが高い (各ペアに light client 実装が必要)。これが IBC/Cosmos モデル。
**Trustless + extensible** → 類似 chain でしか動かない。これが OP Stack のアプローチ (L2 群が 1 つの bridge インタフェースを共有)。
**General + extensible** → trustless にはならない。これが Wormhole/LayerZero — 多 chain をサポートし追加も容易だが、multisig や DVN セットを信頼する必要がある。

Tempo (Paradigm L1) が Ethereum に bridge する場合: trustless + bespoke = Ethereum 上に Tempo light client、その逆も同様。最終的には ZK light client へ。

Tempo が Solana に bridge する場合: trustless は現状不可能 (cross-VM、コンセンサスも暗号も異なる)。**Multisig** または **PoS** モデルが必要。ここでの本番回答が **Chainlink CCIP**。

## 4. Bridge 攻撃殿堂

実際の攻撃を、盗まれた額順、根本原因とともに並べる:

| 年 | Bridge | 盗難 | 根本原因 |
| :--- | :--- | :--- | :--- |
| 2022 | Ronin | $625M | Multisig 鍵侵害 (9 鍵中 5 を phishing) |
| 2022 | Wormhole | $325M | Guardian set ロジックの署名検証バグ |
| 2022 | Nomad | $190M | 初期化バグ + replay 攻撃 |
| 2021 | Poly Network | $611M (返却) | ストレージレイアウト仮定バグ |
| 2024 | Orbit | $80M | Multisig 鍵侵害 |

**5 件中 2 件は鍵の侵害そのもの** (Ronin、Orbit) — 残る 3 件はコア資産ロジックではなく、クロスチェーンの trust / 検証ロジック側のバグ。いずれにせよ、壊れているのは bridge の trust 機構であって、その下のトークンコントラクトではない。

教訓: **Multisig bridge は理論的に suboptimal なだけでなく、運用上も危険**。監査済みのコードであっても、鍵そのものが攻撃面になる。

> 🛑 **予測。** 今日 $1B+ TVL の bridge を設計するとする。**どの trust モデルを選び、フォールバックはどう置くか?** 統合速度、コスト、攻撃面、時間軸を考えて答える。

## 5. 自分のプロジェクトへの含意

### Tempo↔Ethereum (Telos、Soltempo)

- 現時点: **Chainlink CCIP** — 最良の本番選択肢、マルチネットワーク DON
- 2-3 年後: Ethereum 上で Tempo の **light client** を動かす (逆方向も)
- 5 年以降: 証明コストが下がれば **ZK light client**

### Tempo↔Solana (mppsol)

- 現時点: **CCIP** (2026 で Solana サポート)
- 将来: **ZK light client** — EVM↔非 EVM で暗号が異なり、最も難しい組み合わせ
- 回避策: Ethereum 経由で中継 (経路は長くなるが両方向で light-client 検証ができる)

### Hyperliquid↔Ethereum

- 現時点: **Hyperliquid bridge** (カスタム multisig)
- Hyperliquid 自身のロードマップ上、trust モデル改善の方針は明示されていない; 速度を優先

## 6. 検証コストのトレードオフ

各 trust モデルについて、**prover** (誰が bridge クレームを書くか) と **verifier** (誰がチェックするか) のコスト配分を見る:

| モデル | Prover コスト | Verifier コスト | いつ勝つか |
| :--- | :--- | :--- | :--- |
| Multisig | 安価 (hash 署名) | 安価 (署名検証) | 統合速度 |
| Light client | 安価 (ヘッダー中継のみ) | 高 (コンセンサス検証) | 高価値、低頻度 |
| ZK light client | 高 (コンセンサス証明) | 安価 (証明検証) | 高価値、高頻度 |

決済レール bridge (Tempo) では: 頻度が高い (merchant 決済ごとに発生)。**ZK light client** が正しい漸近形 — 高い prover コストが多数の検証に償却される。

> 🛑 **理解度チェック。** ZK light client は証明あたり $10。各証明が $50K 相当のメッセージ 1000 件を解放するとする。**この bridge は「高価」と言えるか?** 計算して示す。なぜ正しいコスト指標が常に「$/value-secured」であって「$/proof」ではないのか?

## 7. 読み物

- [a16z bridge taxonomy](https://www.coindesk.com/tech/2023/07/13/the-best-blockchain-bridges-defined-by-trust-models/) — trust モデルフレームワーク
- [Chainlink CCIP whitepaper](https://chain.link/whitepaper) — DON ベース bridge 設計
- [Helios](https://github.com/a16z/helios) — Rust Ethereum light client (次レッスンで読む)

## 8. 練習

各 chain ペアについて、今日現実的に採用される trust モデルを特定する:

1. Ethereum mainnet ↔ Optimism (canonical bridge)
2. Ethereum mainnet ↔ Polygon PoS
3. Solana ↔ Ethereum 上の Wormhole asset
4. Tempo ↔ Ethereum (公開情報に基づく)
5. Bitcoin ↔ 任意の EVM chain

> 最終チェック: 一文で、bridge 設計で最適化すべき次元として、なぜ「trust モデル」が速度やコストより重要なのか? **答えに攻撃の歴史や bridge トリレンマが出てこなければ §3 と §4 を再読**。`,
                },
                {
                  title: 'Light client — gold standard の検証プリミティブ',
                  slug: 'bridges-light-clients-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Light client — gold standard の検証プリミティブ

Ethereum のフルノードはストレージ ~1TB と RAM ~200GB を必要とする。**Light client** は同じ仕事 — chain が主張どおりのものであることの検証 — を、数 MB のストレージとスマホレベルの CPU で行う。Block header をダウンロードし、フルノードと同じコンセンサスルールに従い、プロトコル自身が保証するものだけを信頼する。それ以外は **何も信頼しない**。

これが、まじめなクロスチェーン bridge がいずれ必ず辿りつく問いの背景になる: **source chain の light client を destination chain の中に置いて、クロスチェーンメッセージを暗号的に検証できないか?** 答えが yes であれば、それが **trust 最小化の gold standard**。そしてその領域に到達した本番 light client は Rust で書かれている。

> 🛑 **スクロール前に予測。** Light client は ~MB、フルノードは ~1TB。**Light client にできないことは何か?** スクロール前に 3 つ挙げる。(ヒント: 何が *state* を必要とするか考える。)

## 1. Light client とは何か — そして何でないか

Light client に **できること**:
- Block header が genesis までつながっていることの検証
- State inclusion proof (state root に対する Merkle proof) の検証
- Transaction の包含検証 (tx root に対する Merkle proof)
- コンセンサスへの追従 (現在の finalized state の追跡)

Light client に **できないこと**:
- Proof なしで任意の state を参照すること (full state を持たない)
- 任意の transaction を実行すること (実行に必要な full state を持たない)
- State proof を生成すること (検証のみ可能)

つまり light client は **chain state に関するクレームの検証者** であって、生成者ではない。Bridge は light client を使って「transaction X が chain Y で起きた」というクレームを **検証** する — relayer がクレームと proof を生成し、light client がそれを検証する。

## 2. Ethereum light client プロトコル

PoW 時代の Ethereum における light client は研究用のおもちゃに過ぎなかった — chain-of-work をブラウザ内で安価に検証する話は実用には届かなかった。PoS が経済性を変えた: 固定 validator セット + BLS 集約署名 (N 個の署名を 1 つの短い署名にまとめる) によって、light client 検証が安価になる。プロトコルは [\`ethereum/consensus-specs\`](https://github.com/ethereum/consensus-specs) にある:

- 各 **sync committee period** (~27 時間) ごとに、512 validator がランダムに選ばれて **sync committee** になる — その期間の block header に署名することだけを担当するローテーションサブセット
- Sync committee がその期間のすべての block header に署名する
- Light client は sync committee のメンバーシップ情報と署名だけをダウンロードする
- Light client は committee の BLS 集約公開鍵に対して署名を検証する (BLS = N 個の署名を 1 つに集約できる署名方式)

Ethereum に追従するために light client が必要とするもの:
- **初期信頼 checkpoint** (out-of-band で取得する必要がある。例: 信頼できるソースから)
- 各期間ごとの **sync committee 更新** (committee の交代を検証)
- 期間中の **header 更新** (現 committee の署名で検証)

それだけ。期間あたり ~MB で、full state の TB 級と比較すると桁違いに小さい。**検証コストは 512 BLS 署名の集約 + チェックで ~ms**。

## 3. Helios を読む — Rust Ethereum light client

[\`a16z/helios\`](https://github.com/a16z/helios) は a16z による本番グレードの Rust Ethereum light client。wallet、indexer、bridge で使われている。~10k 行の Rust。

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
- \`rpc/src/lib.rs\` — RPC server (アプリから検証済み state を問い合わせられる)

全体が wasm 経由でブラウザでも動く。**ここが要点** — wallet が Infura を信頼せず Ethereum を検証できる。

> 🔍 **リポで探す。** Helios の [\`consensus/src/consensus.rs\`](https://github.com/a16z/helios/blob/master/consensus/src/consensus.rs) を開く。sync committee 署名が検証される箇所を見つける。**どのような BLS 集約が起きているか?** 検証フローを追って読む。

## 4. Reth ベース chain での light client

カスタム L1 (Tempo、Hyperliquid など) が bridge の destination になるためには、**誰かが target chain 上に自分の chain の light client を書く** 必要がある。

アプローチは 2 つ:

### 4.1 Naive light client (BFT chain)

L1 が BFT コンセンサス (例: HotStuff) を使う場合、light client は:
- Validator セットを追跡する (交代イベントも含む)
- 2f+1 署名された block header を検証する
- State root に対する state inclusion proof を検証する

Ethereum 上の Solidity contract として: BLS 集約署名込みで header 検証あたり ~5000 gas。50 gwei なら header あたり ~$0.50。

これで動く。ただし BFT ルールを知っている Solidity contract が必要だ。

### 4.2 ZK light client

フローは同じだが、BFT 検証が off-chain の **zkVM proof 内** で行われる。Ethereum 上のコントラクトは ZK proof を検証するだけで済む (定数コスト、~100k gas)。

本番例 (2026):

- **Succinct の SP1** による Ethereum light client — sync committee 検証を証明する
- **Espresso** — 共有 sequencer 向けの ZK light client
- **Polyhedra** — 各種 chain 向けの ZK light client

ZK light client が bridge の **endgame**。Trust = 数学。

> 🛑 **理解度チェック。** 「ZK light client は定数コスト」というのは **半分正しい**。on-chain 検証コストは定数だが、off-chain での proof 生成は高い (2026 時点で 1 proof あたり $1-10)。コストモデルを言い直してみよう: ZK light client が naive light client より安くなるのはどんな時か?

スループットが高い時。Naive は O(N) コスト (N = ヘッダー数)。ZK は on-chain O(1) + off-chain O(N)。多数のヘッダー検証が必要で on-chain ガスが律速になっている場合、ZK が勝つ。

## 5. Reth での light client 統合

Reth ベース chain が light client 統合で果たす役割は 2 つ:

### 5.1 Source chain としての Reth

自分の Reth ベース L1 がブロックを生成する側。light-client フレンドリーにするには:
- **Header フォーマット** に検証情報を含める (state root、validator set commitment、BLS 集約署名)
- **ブロック生成** で validator セットの変更を header にコミットする
- **State tree** が Merkle-Patricia である (state inclusion proof を生成できる)

Reth はこれらをデフォルトでひと通り提供してくれる。あとは自分の consensus 実装が正しいフィールドを header に書き込んでいるかを確認すればよい。

### 5.2 Destination chain としての Reth

自分の Reth ベース L1 が他 chain からメッセージを受け取る側。自分の chain の bridge contract が source chain のヘッダーと proof を検証する必要があり、ここに light client *コントラクト* が住む。

Ethereum→Tempo の場合: Tempo 上の Solidity contract が Ethereum の sync committee 検証を走らせる。Header あたり ~5000 gas。

Reth EVM は mainnet と同一なので、任意の Solidity light client (Helios のコントラクトでもカスタムでも) がそのまま動く。

## 6. 練習

1. [\`a16z/helios\`](https://github.com/a16z/helios) を眺める — 時間があれば clone してみる
2. BLS 署名検証ロジックを含むファイルを特定する
3. 推定: 自分の L1 が 30 validator (Ethereum の 512 と比較) だとしたら、light client 検証はどれだけ安くなるか?
4. スケッチ: カスタム レッスン1の block ヘッダーが light client 向けに公開すべきフィールドは何か?

## 7. 読み物

- [Helios source](https://github.com/a16z/helios) — 本番 Rust light client
- [Ethereum light client spec](https://github.com/ethereum/consensus-specs/blob/dev/specs/altair/light-client/sync-protocol.md) — 正式仕様
- [SP1 light client](https://github.com/succinctlabs/sp1) — ZK light client 実装

> 最終チェック: 一文で、自分の レッスン1の light client が他 chain からの自分の state 検証を **最も trust 最小化** にする理由を答える。**答えに「source chain のコンセンサスだけ信頼」が出てこなければ §1 を再読**。`,
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

すべての OP Stack chain — Optimism、Base、Mode、Worldchain、Zora — が同じ bridge を走らせている。各 chain が個別に multisig を選んだり validator セットを立ち上げたりはしない。どれも rollup 自身のコンセンサスを bridge のセキュリティモデルとして使う。**Bridge は rollup へのインタフェースに過ぎず、trust アンカーは rollup 側にある**。これが canonical な「trustless L1↔L2」のリファレンスで、一度読めば、任意のネイティブ L2 bridge に (バリエーションを伴って) 現れるパターンが見えるようになる。

> 🛑 **スクロール前に予測。** Ethereum から Optimism に 1 ETH を deposit すると、~2 分で反映される。1 ETH を引き出す場合、**Ethereum 側で再び使えるようになるまでどれだけかかるか? なぜか?**

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

鍵となる洞察: **deposit は強制 inclusion**。L1 contract がイベントを発火させ、L2 sequencer は期限 (例: ~1 時間) 内にそれを処理 **しなければならない**。処理しなければ、誰でも L2 inbox 経由で強制 inclusion を発動できる。

これが deposit を **trustless** にする — rollup 自身のコンセンサスルールが inclusion を強制する。multisig は介在しない。

## 2. Withdrawal フロー

L2→L1 (withdrawal) は格段に難しい:

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

遅くする要因は 3 つ:
1. State root の提出: ~1 時間ごと (設定可能)
2. チャレンジ期間: 7 日 (fraud proof 提出のため)
3. 2 段階の確定: prove + finalize (別々の transaction)

**合計**: withdrawal 開始から L1 決済まで ~7 日。

> 🛑 **理解度チェック。** 「7 日はユーザにとって受け入れがたい」のは確かだが、**なぜこの期間が必要なのか?** チャレンジ期間が防いでいる攻撃は何か? 答えに「rollup の optimistic セキュリティモデル」が出てこなければ再読。

チャレンジ期間は、sequencer が L2 state について嘘をついた場合に誰でも **fraud proof** を提出できるようにするために存在する。これがなければ、sequencer が不正な state root を提出して L1 contract がそのまま信じてしまう。

## 3. 実コントラクトを読む

Canonical な OP bridge コードは [\`ethereum-optimism/optimism\`](https://github.com/ethereum-optimism/optimism) の \`packages/contracts-bedrock/\` 配下にある。主要ファイル:

| Contract | 役割 |
| :--- | :--- |
| \`L1StandardBridge.sol\` | L1 側のユーザ入り口 (deposit) と出口 (withdraw) |
| \`L2StandardBridge.sol\` | L2 側のミラー — withdrawal で wrapped token を burn |
| \`OptimismPortal.sol\` | クロスドメインメッセージ用の実体としての L1 inbox/outbox |
| \`L2OutputOracle.sol\` | L1 上に L2 state root のコミットメントを保存 |
| \`L1CrossDomainMessenger.sol\` | 汎用メッセージパッシング (トークン以外も扱う) |

**Bridge は asset 用のインタフェースに過ぎない**。その下に、任意の calldata を扱う汎用クロスドメインメッセンジャが存在する。

> 🔍 **リポで探す。** [\`L1StandardBridge.sol\`](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/src/L1/L1StandardBridge.sol) を開く。\`depositERC20\` が呼ばれたときの挙動を追って読む。**L1 contract が「deposit はもう L2 上にある」と確信するのはいつか?**

確信するのは **L1 transaction が確定した時点**。L2 sequencer は (プロトコルルールにより) その deposit を必ず取り込まなければならない。trust 仮定はこうだ: rollup のコンセンサスが sequencer の振る舞いを強制し、sequencer がズルをすれば rollup が fork する (fraud proof)。

## 4. Fast withdrawal market

7 日の withdrawal は多くのユースケースで実用にならない。市場の応答が **第三者による fast withdrawal**。

流動性プロバイダの動き:
1. L2 上で withdrawal の開始を観測する
2. ただちに L1 トークンをユーザに送る (手数料を差し引いた額)
3. 7 日待つ
4. 期間経過後に レッスン1で withdrawal をクレームする

LP は **withdrawal リスク** (レッスン1の state proof が失敗するリスク) を引き受ける代わりに手数料を得る。Across、Hop、Connext のような市場がこれを大規模に運営している。

これは trust の意味では **bridge ではない** — trustless bridge の上に重ねた金融商品だ。trust の分担はこうなる:
- Bridge 自体: trustless (rollup コンセンサス)
- Fast withdrawal LP: 資本リスク (ユーザ側の信頼は不要、市場効率の問題)

## 5. Standard Bridge vs Native Bridge

OP Stack は両方を持っている:

- **Standard Bridge**: ERC20 をマッピング — 任意トークン用
- **Native Bridge**: ETH (と OP トークン) を直接扱う

Standard Bridge 経由でトークンを bridge するには、**登録** が必要だ — L1とL2のトークンアドレスを対応付ける。これがないと、bridge は L2 側でどのトークンを mint すべきか判断できない。

Tempo にとって重要な点: Tempo がそのチェーンネイティブの stablecoin を持ち、それを Ethereum に持っていきたいなら、Tempo-Ethereum 間のトークンペア登録を伴う **Standard Bridge 相当の仕組み** が必要になる。

## 6. Tempo↔Ethereum に OP Standard Bridge を使えるか?

Tempo は **OP Stack ではない** (スタンドアロン L1) ので、OP Standard Bridge をそのまま適用することはできない。だが **パターンは** 適用できる:

Tempo↔Ethereum で必要になる相当物:
- Tempo Standard Bridge (両側の Solidity contract)
- Tempo 上で動く Ethereum light client
- Ethereum 上で動く Tempo light client (こちらが難しい方)
- Withdrawal チャレンジ期間 (light client がまだ無いなら長くなる)

ZK light client が本番投入されるまで、ここは **CCIP の領域** となる — 次レッスンで扱う。

## 7. 読解演習

\`ethereum-optimism/optimism/packages/contracts-bedrock\` で:

1. \`L1StandardBridge.sol\` — deposit 関数を最初から最後まで読む
2. \`OptimismPortal.sol\` — L2 → L1 メッセージを受信している箇所を見つける
3. \`L2OutputOracle.sol\` — state root を提出する関数を見つける
4. **計算**: 1 件の withdrawal に L1 transaction は何回必要か? その理由は?

4 番の答え: \`proveWithdrawalTransaction\` + 待機 + \`finalizeWithdrawalTransaction\`。L1 tx は最低 2 件。

## 8. op-bridge ExEx パターン

Building tier (L2 — Reorg-Aware Indexer) で見たように、[op-bridge ExEx example](https://github.com/paradigmxyz/reth-exex-examples/tree/main/op-bridge) は L1StandardBridge のイベントを監視する実世界の indexer だ:

\`\`\`rust
sol!(L1StandardBridge, "l1_standard_bridge_abi.json");
use crate::L1StandardBridge::{
    ETHBridgeFinalized, ETHBridgeInitiated, L1StandardBridgeEvents,
};
\`\`\`

これが **indexer (および bridge) がクロスチェーンイベントを取り込む方法**。ExEx が各ブロックを監視して bridge イベントをデコードし、自前の DB に保存する。反対側の bridge contract はこの index に問い合わせれば済む。

同じパターンが Tempo でも機能する: Tempo 上で CCIP の bridge イベントを監視する ExEx が、そのまま merchant treasury システムに流し込める。

## 9. 読み物

- [Optimism docs](https://docs.optimism.io/builders/dapp-developers/bridging/messaging) — 開発者視点
- [OP Stack contracts-bedrock](https://github.com/ethereum-optimism/optimism/tree/develop/packages/contracts-bedrock) — 実コード
- [Across whitepaper](https://docs.across.to/) — fast withdrawal market の設計

> 最終チェック: 一文で、OP Standard Bridge が「trustless」でありながら 7 日の withdrawal 遅延を必要とする理由を答える。**答えに「optimistic セキュリティ + fraud proof」が出てこなければ §2 を再読**。`,
                },
                {
                  title: 'Chainlink CCIP — Tempo が使うクロスチェーンレール',
                  slug: 'bridges-ccip-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 45,
                  content: `# Chainlink CCIP — Tempo が使うクロスチェーンレール

Tempo で merchant が USDC で決済を受け取る。その USDC は裏側で、treasury 用に Ethereum へ、DeFi yield 用に Solana へと決済される必要がある — 3 つの chain にまたがり、しかもうち 2 つは互いに直接やりとりできない。**これは理論上の bridge 課題ではなく、Tempo が今日まさに本番で動かしているクロスチェーン決済であり、それが走るレールが Chainlink CCIP** (Cross-Chain Interoperability Protocol) だ。light client ではない。Wormhole の fork でもない。任意の chain ペアを想定して設計された本番 bridge である。

Hyperliquid は CCIP を使わない (独自 bridge)。しかし mppsol や soltempo にとって、CCIP は理論的な代替案ではなく **運用上の現実**。Tempo の payments スタックに触れるものを設計するつもりがあるなら、理解しておくのは選択肢ではなく必須だ。

> 🛑 **スクロール前に予測。** CCIP は「Risk Management Network」を持ち、メッセージを **ブロックする** 権限を備えている。**なぜか?** 純粋な暗号だけでは防げない、どのような攻撃を防ぐためのものか?

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

プロトコルを運用するノードネットワークは 2 つ(下表のうち最初の 2 行が DON、3 行目の Risk Management Network は別建ての安全ネット):

| ネットワーク | 役割 | Trust モデル |
| :--- | :--- | :--- |
| **Committing DON** | Source-chain のイベントを Merkle commitment に集約する | M-of-N の PoS validator |
| **Executing DON** | Destination chain 上でメッセージを実行する | 同じ/別の N-of-M |
| **Risk Management Network** | 悪意ある、または制裁対象のメッセージを veto する | 別の validator セット、off-chain monitoring |

要するに CCIP は **技術的には multisig** — ただしクロスチェーンメッセージング向けに専用設計されたものだ:
- 典型的な multisig より大きい validator セット
- 緊急用の独立した「cursing」/ freeze 権限 (RMN)
- Asset bridge 用のトークンプールアーキテクチャ
- Chain ごとに設定可能なリスクパラメータ

> 🛑 **理解度チェック。** 「CCIP は trustless」というのは **誤り**。洗練された保護機構を備えた multisig である。実際の trust 仮定を言語化する: 誰が共謀すれば資金を盗めるか、それを止めているのは何か?

Committing DON と executing DON が共謀すればメッセージを偽造できる。**RMN** がそのバックアップ — DON が誤動作した場合、RMN は特定のレーンを停止できる。これは第二の防衛層を加えてはいるが、暗号的な trustless ではなく信頼ベースのままだ。

## 2. メッセージフォーマット

CCIP メッセージが含む内容:

\`\`\`solidity
struct Any2EVMMessage {
    bytes32 messageId;       // 一意 ID
    uint64 sourceChainSelector;
    bytes sender;            // Source 上の ABI エンコード sender
    bytes data;              // 任意の calldata
    EVMTokenAmount[] destTokenAmounts;  // Destination で release するトークン
}
\`\`\`

メッセージの使い方は 2 通り:

| ユースケース | 何を送るか | 例 |
| :--- | :--- | :--- |
| **データのみ** | \`data\` (任意の calldata) | 汎用クロスチェーン呼び出し |
| **トークン** | \`destTokenAmounts\` | Asset 転送 |
| **プログラマブル** | 両方 | クロスチェーン swap、settle-and-call |

Soltempo のユースケース: **トークン + データ** — Ethereum から Tempo に USDC を送りつつ、merchant 決済を識別するメタデータを併せて運ぶ。

## 3. トークンプールモデル

2021 年にクロスチェーン DEX を触った人なら、wrapped token のカオスを覚えているはずだ: Avalanche の USDC.e、Fantom の anyUSDC、「wrapped USDC」が 3 種類あってどれも *本物の* USDC ではない、という状況。CCIP はこれを根本的に回避する。Wrapping の代わりに **トークンプール** を使う — canonical asset を保持 (または mint) する、各 chain のプールコントラクトだ:

- 各 chain の **プールコントラクト** が asset を保持する
- Bridge する際、source プールが asset を lock し、destination プールがそれを release する
- **Burn-mint** モデル: source プールが burn し、destination プールが同じ total supply から mint する

Tempo の Ethereum 上の USDC は CCIP を介して burn-mint される。source 側で USDC が burn され、destination 側で USDC が mint される。「USDC.e」は存在しない — 別 chain 上にある同じ USDC があるだけだ。**Wrapped token よりも単純で安全**。

> 🔍 **リポで探す。** [\`smartcontractkit/ccip\`](https://github.com/smartcontractkit/ccip) — CCIP コントラクト群。\`TokenPool.sol\` を探す。**継承構造はどうなっているか?** Contract は異なるトークンタイプ向けに複数のバリアントを持つ。

## 4. レーンモデル

CCIP は **レーン** をサポートする — 向きを持つ chain ペアのことだ。Ethereum→Tempo のレーンと Tempo→Ethereum のレーンは別物。各レーンには次のものがある:

- 独自の DON committee 設定
- 独自のリスクパラメータ (最大スループット、手数料)
- 独自のトークンマッピング

レーンは **chain ペアごとに立ち上げる**。CCIP は現在 30+ chain をサポートし、~900 レーンが構成可能。各レーンには固有のデプロイコストがかかる。

Tempo について: Tempo↔Ethereum と Tempo↔Solana のレーンが存在し、双方向で、いずれもトークン + データをサポートしている。

## 5. 手数料モデル

CCIP の課金通貨は次のいずれか:

- Source chain の **ネイティブガストークン** (Ethereum なら ETH、など)
- **LINK** (Chainlink トークン、~20% 割引)

手数料でカバーされる項目:
- Source-chain のガス、メッセージ発行
- Destination-chain のガス、メッセージ実行
- DON の運用コスト
- リスクプレミアム

Soltempo の場合: 各決済の CCIP 手数料は ~$0.50-$2 (chain ペアに依存)。$100 を超える支払いには十分許容できる水準だ。

## 6. CCIP vs 代替手段

Merchant 規模の支払い (Tempo のユースケース) で比較する:

| Bridge | Trust モデル | メッセージあたり手数料 | レイテンシ | Tempo にとって |
| :--- | :--- | :--- | :--- | :--- |
| **CCIP** | PoS DON + RMN | $0.50-$2 | ~10 分 | 本番準備済、Solana サポートあり |
| **LayerZero** | DVN モデル | $0.30-$1 | ~5 分 | Solana サポートあり、柔軟性が高い |
| **Wormhole** | 19-of-N guardian multisig | $0.20-$1 | ~2 分 | 最安だが multisig リスクあり |
| **OP Standard** | Rollup コンセンサス | ~$0.10 + L1 ガス | 7 日 | L2 専用、Tempo 用途には合わない |

CCIP が Tempo で勝つのは **trust + 規制** の軸 — Chainlink は最も確立されたクロスチェーンインフラで、保険もあり、機関統合の実績もある。merchant 関係を伴う決済レールでは、ここが効いてくる。

## 7. 統合パターン

自分のコントラクト (例: Tempo 上の soltempo 決済コントラクト) が CCIP メッセージを受信するには:

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

これがアプリケーション側のインタフェースだ — 継承して 1 つの関数を override し、sender を検証してメッセージを処理する、それだけ。

Tempo↔Solana では destination chain が非 EVM なので、receiver は **Anchor (Rust)** で書く:

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

構造は同じ、言語が違うだけだ。**これが soltempo が実際に運用する統合**。

## 8. mppsol アーキテクチャ

(戦略文書から思い出すと): mppsol は Reth/REVM↔Solana の決済層であり、レールは CCIP。

\`\`\`
Merchant 支払い ──[CCIP]── Solana DeFi ──[CCIP]── Tempo merchant 残高
       ↑                       ↓                          ↑
  Ethereum USDC            Yield earn                オンデマンド引出し
\`\`\`

アーキテクチャ全体が **CCIP を介したクロス VM のメッセージパッシング** で構成される。Tempo の merchant オペレーション向けの bridge 層 = CCIP。このスケールでは他に選択肢が成立しなかった。

> 🛑 **予測。** Merchant が $1M を soltempo 経由の CCIP で決済し、手数料は $0.50 とする。**この手数料モデルは成立するか?** 1000 merchant が同時決済したらどうか — CCIP はスケールできるか?

決済規模で見ると: $1M に対する $0.50 は 0.005% の手数料。十分成立する。スループット面では、CCIP は現在レーンあたり ~10-100 msg/sec をサポートしており、1000 同時決済はキューに積まれる。即時性が問われないフローでは許容できるが、merchant がリアルタイム UX を要求するなら問題になる。

## 9. 読み物

- [CCIP whitepaper](https://chain.link/whitepaper)
- [CCIP コントラクト](https://github.com/smartcontractkit/ccip)
- [CCIP 開発者ドキュメント](https://docs.chain.link/ccip) — 統合ガイド

## 10. 練習

1. CCIP コントラクトリポを眺める
2. \`Router.sol\` を見つける — ユーザのエントリポイント
3. メッセージを source 側の \`ccipSend\` から destination 側の \`ccipReceive\` まで追う
4. 3 つの trust 境界 (committing DON、executing DON、RMN) を特定する

> 最終チェック: 一文で、CCIP が Tempo↔Solana で **最も trust 最小化な選択肢ではない** にもかかわらず **運用上の選択になる** 理由を答える。**答えに「Solana サポート + 規制上の安心感 + 本番成熟度」が出てこなければ §6 を再読**。`,
                },
                {
                  title: 'Wormhole と IBC — マルチチェーンメッセージプロトコル',
                  slug: 'bridges-wormhole-ibc-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 14,
                  xpReward: 40,
                  content: `# Wormhole と IBC — マルチチェーンメッセージプロトコル

CCIP が規制環境下の Tempo merchant が使う bridge だとすれば、**Wormhole は 2022 年に Solana DeFi プロトコルが軒並み Ethereum に届くために使った bridge** — 速くて安価で、19 鍵の multisig (過去に一度ハックされている) で支えられている。**IBC は 2019 年以降、Cosmos chain がずっと使い続けてきたもの** — 遅く、より安全で、構造的に Cosmos エコシステムから出にくい。2 つの本番プロトコル、ユーザ層は大きく異なる。両方とも理解しておく価値がある — CCIP が真ん中に位置する trust スペクトラムの両端を画す存在だからだ。

> 🛑 **スクロール前に予測。** Wormhole は 30+ chain をつなぐ。IBC は Cosmos chain しかつながない。**なぜ IBC は Ethereum サポートを追加して支配的な bridge になれないのか?**

## 1. Wormhole — スケールする multisig

[\`wormhole-foundation/wormhole\`](https://github.com/wormhole-foundation/wormhole) は guardian ベースの bridge。アーキテクチャは:

- **19 個の Guardian ノード**、それぞれが validator を運用する
- Guardian は source-chain のイベントを観測する
- 各 guardian が attestation に署名する: 「chain Y でイベント X を見た」
- **13-of-19** の guardian 署名でメッセージが valid と判定される
- Destination chain がその署名集約を検証する

Wormhole は Solana、Ethereum、Sui、Aptos、Bitcoin (wrapping 経由) を含む 30+ chain をサポートする。**唯一の trust 仮定は 13-of-19 multisig**。

### 1.1 Wormhole の攻撃史

2022 年 2 月、攻撃者が Wormhole-bridged ETH を **$325M** 分持ち去った。バグは **鍵盗難ではなく** — guardian 署名を検証する Solana program のチェック漏れだった。攻撃者は、実際には署名者を検証していないコントラクトに対して、妥当に見える署名を偽造した。

**教訓**: Multisig bridge は鍵だけでなく **検証ロジック** からも同じ頻度で破られる。Guardian が 19 人いても、チェック側のコントラクトにバグがあれば意味がない。

> 🛑 **理解度チェック。** Wormhole は guardian 19 人。**f はいくつか?** なぜ「guardian が多い = より安全」という見方が multisig の捉え方として間違っているのか?

f = ⌊(19-1)/3⌋ = 6 の Byzantine 耐性。しかし実際の故障モードは Byzantine 共謀ではなく、**運用侵害** (鍵盗難) か **検証バグ** (Wormhole 2022) のいずれかだ。Guardian を増やしてもコントラクトにバグがあれば救いにならない。

### 1.2 Tempo にとっての Wormhole

Tempo は Wormhole を使えるか? 技術的には yes。ただし:
- Wormhole のリスクプロファイル (multisig + 攻撃履歴) は **規制された支払い** には受け入れられにくい
- Solana サポートは CCIP のほうが質が高い
- Wormhole の開発者フォーカスは Solana-Ethereum で、新興 L1 は手薄

Tempo の merchant 決済では CCIP が優先。Wormhole は CCIP が使えなくなった場合のフォールバックであって、primary ではない。

## 2. IBC — Cosmos 向けの gold standard

[\`cosmos/ibc-go\`](https://github.com/cosmos/ibc-go) は Inter-Blockchain Communication プロトコル。Cosmos chain 間 (Osmosis、Juno など) のあらゆる bridge を支えている。

### 2.1 IBC の動作

\`\`\`mermaid
flowchart LR
    A["Cosmos Hub<br/>(source)"] -->|1. Packet 送信| AClient["IBC client<br/>on source"]
    AClient -->|2. Commit + sign| Relayer["IBC Relayer<br/>(off-chain)"]
    Relayer -->|3. Headers + proof 中継| BClient["IBC client<br/>on destination"]
    BClient -->|4. Header に対し検証| B["Osmosis<br/>(destination)"]
\`\`\`

各 chain が **相手 chain の light client** を動かす。relayer (誰でもよい — permissionless) が以下を提出する:
- Source chain のヘッダー (destination 側の light client に対して検証される)
- Source-chain の state 変更の proof (検証済みヘッダーに対して検証される)

Proof が valid であれば、destination chain がクロスチェーンアクションを実行する。**純粋に暗号**、multisig は介在しない。

### 2.2 なぜ IBC は Cosmos に閉じてしまうのか

chain X の IBC light client を chain Y で動かすには、**chain Y が chain X のコンセンサスルールを検証できる** 必要がある。Cosmos chain はどれも Tendermint を使うので、同じ light client コードがそのまま動く。

Ethereum で動かすには、Tendermint 検証を実装した Solidity contract が必要になる — 高価で複雑だ。Solana では同等の Anchor program が必要になる。**クロスエコシステムの IBC は理論的には可能だが、実用例は乏しい** — 実装コストが理由だ。

進展もある: [Polymer](https://www.polymerlabs.org/) は rollup を介して Cosmos を Ethereum に接続する IBC ハブを構築中。**Tempo (Reth ベースの EVM chain) にとって、IBC は自然な選択ではない** — CosmWasm 上の Tempo light client と、Tempo 上の Tendermint light client (Solidity) の両方を作る必要があるからだ。可能ではあるが、得られる利点に対してコストが高い。

## 3. Wormhole + IBC + CCIP: それぞれがいつ勝つか

| ユースケース | 最適 | 理由 |
| :--- | :--- | :--- |
| Solana ↔ Ethereum | CCIP または Wormhole | どちらも Solana サポートが成熟 |
| Cosmos chain 同士 (例: Osmosis ↔ Juno) | IBC | Trustless、他に選択肢なし |
| EVM L1 ↔ EVM L1 (例: Tempo ↔ Polygon) | CCIP、LayerZero | どちらも汎用 EVM-EVM 向け |
| L2 ↔ L1 (OP Stack 内) | OP Standard Bridge | Trustless |
| Bitcoin ↔ EVM | Wormhole (wrapping 経由) | 代替手段が少ない |
| Permissionless に任意 chain を結ぶ | Wormhole | エコシステムの到達範囲が最大 |

**Tempo のニーズ (merchant 決済) では**: 答えは CCIP。エコシステム拡張 (例: 将来の Cosmos chain への接続) を見据えるなら、Polymer のようなアダプタが Tempo↔IBC を橋渡しできる。

## 4. Trust スペクトラム再訪

Lesson 1 で見た trust スペクトラム:

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

**Trust モデルが改善するほど、複雑さとコストは増す**。IBC は destination 上に source chain のフル light client を必要とする。ZK light client は zkVM 内でコンセンサスを証明する必要がある。

## 5. 自分のプロジェクトでの選択

### mppsol (Reth/REVM ↔ Solana)

- 現時点: プライマリは **CCIP**、代替は Wormhole
- 将来: **ZK light client** — EVM↔非 EVM の zk インフラが成熟したら

### soltempo (Tempo→Solana 経由の merchant 決済)

- 現時点: **CCIP 専用**
- 理由: CCIP は on-chain のリスク管理を持ち (RMN による pause が可能)、規制面でも扱いやすい

### Telos (Tempo↔HL intent matching)

- Tempo↔HL の bridge はまだ公開されたものが存在しない
- 考えられる選択肢: HyperLiquid bridge (カスタム multisig)、または将来の共有 sequencer / ZK proof
- これが現状の **bridge ギャップ** だ — Wormhole、CCIP、IBC のいずれも、今のところ Tempo↔HL をフル機能セットで橋渡ししていない

## 6. 読み物

- [Wormhole core](https://github.com/wormhole-foundation/wormhole) — multisig bridge
- [Wormhole 攻撃 post-mortem](https://web3isgoinggreat.com/?id=wormhole-bridge) — 2022 ハックの詳細
- [IBC 仕様](https://github.com/cosmos/ibc) — IBC の正式仕様
- [Polymer](https://github.com/polymerdao) — IBC-on-EVM の rollup ハブ

## 7. 練習

1. Wormhole の Solana program を眺める — 署名集約ロジックを見つける
2. \`ibc-go\` を眺める — light client インタフェースを見つける
3. 比較: 各システムで「クロスチェーンメッセージ検証」に該当する部分はそれぞれ何行か?

> 最終チェック: 一文で、なぜ Wormhole と IBC が **競合ではなく相補的** なのかを答える。**答えに「trust への許容度が異なる、別々のエコシステム」が出てこなければ §3 を再読**。`,
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

理論は読んだ。本番コードも読んだ。**次は最小の trust 最小化 bridge を実際に組む** — Tempo が Ethereum light client を動かし、source-chain イベントの inclusion proof を検証する Ethereum→Tempo フローだ。multisig なし、guardian なし、fast-withdrawal LP なし。流れはこれだけ: source chain がイベントを発火し、light client が「そのイベントは finalize 済み Ethereum block 内に含まれている」と告げ、destination chain が mint する。コントラクト 3 本、relayer 1 つ、trust 仮定 1 つ。

> 🛑 **スクロール前に予測。** Bridge は 3 コンポーネントから成る: Ethereum 上のコントラクト、relayer、Tempo 上のコントラクト。**それぞれが何をして、何を信頼するか?**

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
| L1 Contract | 自身 | 何も信頼しない — それ自体が source of truth |
| Relayer | Permissionless | 誰でも relayer になれる; 信頼は不要 |
| L2 Contract | Light client | light client を介して、Ethereum のコンセンサスだけを信頼 |
| Light client | Ethereum コンセンサス | sync committee の署名のみ信頼 |

**システム全体が trustless** — 信頼するのは Ethereum の PoS が正直に動くことだけで、それ以外は何も信頼しない。

## 2. L1 コントラクト

L1 コントラクトはもっとも単純な部分 — イベントを発火するだけだ:

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

これだけだ。**Relayer に依存しない; イベントは on-chain にある**。誰でもイベントを観測し、proof を添えて Tempo 側でクレームを試みることができる。

## 3. Relayer

Relayer の仕事:

1. Ethereum で \`Locked\` イベントを監視する
2. Inclusion proof を生成する: 「このイベントは block N にあり、Merkle path はこうだ」
3. Tempo の bridge コントラクトに proof を提出する

Rust で書く relayer:

\`\`\`rust
use alloy_provider::{Provider, ProviderBuilder};
use alloy_primitives::Address;

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let l1_provider = ProviderBuilder::new()
        .on_http("https://ethereum-rpc.url".parse()?);
    let l2_provider = ProviderBuilder::new()
        .on_http("https://tempo-rpc.url".parse()?);

    // レッスン1の latest finalized block 取得
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

        // L2に提出
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

Relayer は **stateless** — 誰でも動かせる。Ethereum を観測して proof を提出するだけ。落ちたら別の誰かが引き継げばよい。

## 4. Tempo 上の light client

Tempo の bridge コントラクトは「このイベントは Ethereum の block N で起きた」ことを検証する必要がある。そのためには **Tempo 上で最新の検証済み Ethereum block** を知っていなければならない。

Light client コントラクトがそれを保持する:

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

あとは Tempo の bridge コントラクトがこれを使うだけ:

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

これで bridge 全体だ。**コントラクト 3 本**、**relayer サービス 1 つ**、**信頼するのは Ethereum のコンセンサスのみ**。

## 5. コスト内訳

Bridge transaction あたり:

| 操作 | Chain 上のコスト | いつ発生するか |
| :--- | :--- | :--- |
| L1 \`lock\` | ~80k gas (~$2) | User tx ごと |
| Light client \`updateSyncCommittee\` | ~50k gas (~$1.50) | 27 時間ごと (sync committee 1 期間) |
| Light client \`addHeader\` | ~20k gas (~$0.60) | Ethereum block ごと (~12s) |
| L2 \`claim\` | ~150k gas (~$4.50) | User tx ごと |

Light client の更新は継続的に走る (誰でも更新コストを払える; 市場が維持する)。**ユーザにかかるコスト**: bridge tx あたり ~$6-7 で、ガス価格に依存する。

ZK light client 版なら、\`addHeader\` を epoch あたり 1 件の定数コスト proof 検証に置き換えられ、総コストは ~10 分の 1 になる。

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

**Trust 仮定**: Ethereum の PoS が正しく動くこと。それ以外には何もない。

これが、**OP Standard Bridge が optimistic 遅延なしで実現していること**、**ZK rollup が本番化したときにやろうとしていること**、**Espresso などの共有 sequencer が今日やっていること** に相当する。

## 7. 難しい部分 (詳細)

このスケッチは実際の複雑さをいくつか省略している:

### 7.1 Light client の trusted setup

Tempo の light client には初期の信頼 checkpoint が必要だ。どう得るか? 選択肢は 2 つ:

- ローンチ時に **Tempo チームを信頼する** (launch 時点では許容できる)
- **DAO ガバナンス** が初期 checkpoint を更新する (IBC が新 client で採用している方式)

どちらも本番運用として妥当だ。Trust 仮定は **setup 時のみ** に発生し、継続的ではない。

### 7.2 Replay 防止

各クレームは固有の source イベントを参照する必要がある。同じ event hash で同じ USDC を 2 回 bridge しようとしたら、L2 コントラクトはそれを reject すべきだ。

標準パターン: クレーム済みの event hash を mapping で追跡する:

\`\`\`solidity
mapping(bytes32 => bool) public claimed;
require(!claimed[eventHash], "already claimed");
claimed[eventHash] = true;
\`\`\`

### 7.3 Withdrawal 方向 (Tempo → Ethereum)

上のシステムは **deposit のみ** をカバーしている。Withdrawal は逆向きの構成になる:
- Tempo bridge が Withdrawn イベントを発火
- Ethereum 上で Tempo の light client を動かす (こちらが難しい方)
- L1 bridge が Tempo の light client に対する proof を受け入れる

Tempo (Reth ベースの BFT) の場合、Ethereum 上の light client は **Ethereum のそれよりずっと単純** だ — validator セットが有界で、BFT 署名で済む。BLS 集約込みで validator ~30 なら、header あたり ~5k gas。

## 8. 練習

1. EthereumLightClient コントラクトをもう少し完全にスケッチしてみる
2. 推定: block time 12 秒で、L1→Tempo の light client はどの頻度で更新が必要か?
3. Relayer が invalid な proof を提出してきたら? Bridge はどう振る舞うか?
4. このシステムは Ethereum の reorg (finality 前/後) をどう扱うか?

## 9. 読み物

- [Helios source](https://github.com/a16z/helios) — Rust Ethereum light client (relayer のリファレンス)
- [LayerZero V2](https://docs.layerzero.network) — モジュラー bridge アーキテクチャ
- [Espresso shared sequencer](https://docs.espressosys.com/sequencer) — 本番の共有 bridge

> 最終チェック: 一文で、light-client 検証 bridge の **唯一の trust 仮定** と、それが **gold standard** とされる理由を答える。**答えに「source chain のコンセンサスのみ、それ以外は何も信頼しない」が出てこなければ §1 を再読**。`,
                },
                {
                  title: 'ファイナルクイズ: クロスチェーン bridge',
                  slug: 'bridges-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 1,
                  duration: 12,
                  xpReward: 50,
                  content: `# ファイナルクイズ: クロスチェーン bridge

クロスチェーンの最終チェック。Tempo、Hyperliquid、あるいは任意の Reth ベース レッスン1に触れる bridge を設計するために必要な内容だ。`,
                  quizQuestions: [
                    {
                      question: 'なぜ **最大級の bridge ハック** は資産コントラクトのバグではなく、鍵 / 運用侵害やクロスチェーン trust ロジックのバグから出続けるのか?',
                      options: [
                        'スマートコントラクトは形式検証されているのでバグは稀だから。',
                        'Multisig bridge はセキュリティを鍵保持者に依存する; 鍵の十分なサブセット (phishing、malware、内部者) が侵害されれば、コントラクトのコードは無関係になる — 署名は正しく検証されてしまう。運用セキュリティが最弱リンクであり、それ以外で発生するバグも、トークン本体ではなく bridge のクロスチェーン trust 機構側に出る。',
                        'ハッカーは取引所のような容易なターゲットを好むから。',
                        'スマートコントラクトハックは bridge ハックに分類されないから。',
                      ],
                      correctIndex: 1,
                      explanation: 'Ronin ($625M) と Orbit ($80M) は純粋な鍵侵害 — bridge のコードは本来やるべきこと (署名検証) を正しく行い、攻撃が成功したのは鍵そのものが盗まれたから。残る大規模損失 (Wormhole、Nomad、Poly Network) は、資産トークンのコントラクトではなく bridge のクロスチェーン trust / 検証ロジック側のバグ — 署名チェック、初期化、ストレージレイアウト仮定。いずれにせよ、systemic な攻撃面は multisig と trust 機構の複雑さであって、トークン層ではない。',
                    },
                    {
                      question: "**bridge トリレンマ** とは何か、Chainlink CCIP はそのうちどの 2 つを選んでいるか?",
                      options: [
                        '速度、コスト、セキュリティ。CCIP は速度とセキュリティを選んでいる。',
                        'Trustlessness、generality、extensibility。どの 2 つは満たせるが 3 つ全部は満たせない。CCIP は **general** (多 chain) + **extensible** (chain 追加が容易) を取り **trustless** を犠牲にしている — 純粋暗号ではなく PoS DON + RMN に依存する。',
                        'レイテンシ、スループット、コスト。CCIP はスループットとコストを選んでいる。',
                        'L1、L2、サイドチェーン。CCIP は レッスン1と レッスン2をサポートする。',
                      ],
                      correctIndex: 1,
                      explanation: 'トリレンマはアーキテクチャ上の制約: trustless + general + extensible のうち 2 つしか取れない。CCIP は general + extensible (マルチチェーン、追加容易)。IBC は trustless + general (Cosmos chain)。OP Standard は trustless + extensible (OP Stack 内のみ)。3 つすべてを満たすシステムは存在しない。',
                    },
                    {
                      question: 'OP Standard Bridge では、なぜ **withdrawal は 7 日** かかるのに **deposit は 2 分** で済むのか?',
                      options: [
                        'L2 が L1 より遅いから。',
                        'Deposit は強制 inclusion で、rollup コンセンサスが「L2 はこれを処理しなければならない」と強制する; withdrawal には **7 日のチャレンジ期間** が必要 — sequencer が L2 state について嘘をついた場合、誰でも fraud proof を提出できるようにするためだ。この非対称性は optimistic セキュリティモデルに由来する。',
                        'エンジニアが適当に数字を選んだから。',
                        'Withdrawal が deposit より多くのガスを使うから。',
                      ],
                      correctIndex: 1,
                      explanation: 'Deposit: L1 イベントは rollup が必ず処理しなければならない (プロトコルに組み込まれている)。Withdrawal: L2 state の正直さに依存するため、チャレンジ期間の経過を待つ必要がある。7 日は、悪意ある sequencer に対する fraud proof の検出と提出に必要な時間として置かれている。',
                    },
                    {
                      question: 'なぜ **chain Y 上で動く chain X の light client** は **trust 最小化** とみなされ、**13-of-19 multisig** はそうみなされないのか?',
                      options: [
                        'Light client のほうが multisig より validator が多いから。',
                        "Light client は chain X のコンセンサスルールを直接検証する — これを騙すには chain X 自身を騙さねばならない。Multisig は鍵を侵害するだけで済み、source chain を腐敗させる必要はない。Light client の trust 仮定 = source chain のセキュリティ。multisig の trust 仮定はそれより遥かに弱い。",
                        'Multisig は一部の司法管轄区で違法だから。',
                        'Light client は Rust、multisig は Solidity で書かれているから。',
                      ],
                      correctIndex: 1,
                      explanation: 'Trust 最小化が問うのは *bridge を攻撃するために何を侵害する必要があるか* だ。Light client では source chain のコンセンサスを破る必要がある ($billions の stake がリスクに晒される)。Multisig では ~13 鍵を侵害すれば足りる (遥かに安く、ソーシャルエンジニアリングも可能)。Bridge のセキュリティを決めるのは validator 数ではなく trust 要件だ。',
                    },
                    {
                      question: 'Tempo は merchant 決済層に **Chainlink CCIP** を使っている。**なぜ Wormhole、IBC、OP Standard ではなく CCIP なのか?**',
                      options: [
                        'CCIP が最安の選択肢だから。',
                        'CCIP は次の 3 点で勝る: (1) 本番品質の Solana サポート (Tempo は ETH ↔ Tempo ↔ Solana のフローが必要); (2) pause/veto 権限を持つ Risk Management Network; (3) Chainlink の確立された地位による機関 / 規制面での扱いやすさ。Wormhole は multisig リスクを抱え、Tempo が扱うのは規制された支払いだ。IBC は EVM↔Solana をカバーしない。OP Standard は OP Stack 内でしか動かない。',
                        'Solana 互換性のために CCIP が必須だから。',
                        'CCIP が唯一の EVM 互換 bridge だから。',
                      ],
                      correctIndex: 1,
                      explanation: '規制された merchant フローを扱う支払いレールでは、CCIP のポジショニングのほうが絶対的な手数料よりも重要になる。RMN は Tempo に対する安全ブレーキとして働く (悪意あるメッセージを pause できる)。Chainlink の機関採用はコンプライアンス上の議論を単純化する。Trust モデルは「最良」ではないが「本番の支払いには十分」 — Wormhole は規制フローには向かない。',
                    },
                    {
                      question: 'Light-client 検証 bridge は、destination chain が **source chain のコンセンサスルールを検証** することを要求する。**なぜこれが Cosmos の IBC では高価だが、OP Standard Bridge では安価なのか?**',
                      options: [
                        'OP Standard が ZK proof を使うから。',
                        "Cosmos IBC は source chain の Tendermint コンセンサスを実際に検証する (フルな BFT 署名検証、header あたり ~5000 gas)。OP Standard Bridge は optimistic セキュリティを採用する: destination chain は on-chain での fraud proof 提出を 7 日待ち、その後で state root を信頼する。セキュリティモデルが違えば検証コストも違う、ということだ。",
                        'OP Standard は layer-2 なので安価だから。',
                        'IBC はカスタムハードウェアを必要とし、OP Standard は汎用ノードで動くから。',
                      ],
                      correctIndex: 1,
                      explanation: "IBC は本物の light client 検証 — 高価だが trustless。OP Standard は optimistic で、検証を遅延させる (オンデマンドの fraud proof で対応する) ため安価。7 日の window が trust の代替として働く。両者とも trust 最小化だが、その実現方法が異なる。",
                    },
                    {
                      question: '最小 trust 最小化 bridge の構築には 3 つのコンポーネントが必要: L1 contract、relayer、L2 contract。**Relayer は何を信頼するか、そしてそれがなぜ重要なのか?**',
                      options: [
                        'Relayer は レッスン1と レッスン2の sequencer を信頼する。',
                        'Relayer は **permissionless で、何も信頼しない**。誰でも relayer を動かせる。L1 イベントを観測し、Merkle proof を構築し、L2に提出する。L2 コントラクト内の light client がその proof を検証すれば、アクションが実行される。Relayer の正直さは関係ない — 重要なのは暗号 proof だけだ。',
                        'Relayer はユーザを信頼し、KYC を要求する。',
                        'Relayer は Chainlink が運用しており、その oracle ネットワークを信頼する。',
                      ],
                      correctIndex: 1,
                      explanation: 'Relayer が permissionless であることがすべての要点だ。Bridge は特定の relayer の正直さには依存しない — relayer が少なくとも 1 つ存在することにだけ依存する。これが検閲耐性を生む; CCIP ノードが全部 offline になっても、誰でも中継に入れる。',
                    },
                    {
                      question: 'Soltempo の **Tempo↔Solana** において、ZK light client が trust 最小化の endgame であるにもかかわらず、**なぜ今日それを動かせない** のか?',
                      options: [
                        'Solana がスマートコントラクトをサポートしないから。',
                        'EVM↔非 EVM の ZK light client では、source chain のコンセンサス (Solana の Tower BFT) を zkVM 内で証明し、その後 Solana 上で検証する必要がある。暗号が特殊で、成熟した本番実装はまだ存在しない (2026 時点)。CCIP が DON+RMN の multisig モデルでこのギャップを埋めている。',
                        'Solana がクロスチェーン bridge を許可しないから。',
                        'ZK proof の生成コストが高すぎるから。',
                      ],
                      correctIndex: 1,
                      explanation: 'EVM↔EVM の ZK light client は既に存在する (例: Polyhedra、SP1)。EVM↔非 EVM はより難しい — source chain のコンセンサス構造が zkVM 内で効率的に表現でき、かつ destination chain 側に ZK proof 検証機構がある、という両方の条件が必要だからだ。Solana はそこに非 EVM 暗号という難しさを上乗せする。成熟した本番ケースが 2026 から現れ始めているが、まだ table-stakes ではない。',
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
