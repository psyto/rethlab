import { PrismaClient } from '@prisma/client';

export async function seedRethConsensusEngineeringJA(prisma: PrismaClient) {
  const tags = ['reth', 'consensus', 'bft', 'pos', 'hotstuff', 'hyperbft', 'l1', 'advanced'];

  await prisma.course.create({
    data: {
      slug: 'reth-consensus-engineering-ja',
      title: 'Consensus Engineering — Reth で L1 のコンセンサスを作る',
      description:
        '「reth を読める」から「L1 chain を出荷できる」までの最大のギャップを埋めるコース。コンセンサスは Rust EVM スタックの残りの層 — DB、VM、ネットワーク、並行性 — を **ひとつのチェーンとして束ねる** 層。コンセンサス理論を一から (BFT、safety/liveness、FLP)、Rust 製コンセンサスエンジンの実コード (reth の Consensus trait、Malachite、bera-reth の Proof-of-Liquidity) を読み、Reth ベース chain にカスタムコンセンサスを配線する。HyperBFT を読んで Tempo クラスの L1 chain を出荷する準備ができる。',
      difficulty: 'ADVANCED',
      duration: 193,
      xpReward: 650,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 1300,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'コンセンサスの基礎',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'レッスン0 — BFT 問題をゼロから',
                  slug: 'consensus-bft-problem-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# レッスン0 — BFT 問題をゼロから

## 問い

午前 3 時。30 ノードの chain で、1 バリデータが矛盾する 2 つのブロックに同時に署名した。他のバリデータは両方に投票している。Chain は split-brain。**まず何を見にいくか？** なぜこれが起こりうるのか — コンセンサスがそもそもどんな故障を生き延びるための仕組みなのか — のメンタルモデルがなければ、次の 8 時間を当てずっぽうで過ごすことになる。

> 注: このコースのコードブロックは「実行可能な最小例」と「概念説明の抜粋」が混在する。\`...\` や \`todo!()\` を含むブロックは概念スニペット（コンパイル不要）。

## 原理（最小モデル）

- **3 つの性質は条件なしには同時に満たせない。** Safety（split-brain にならない）、Validity（誰も提案していない値を勝手に決めない）、Liveness（いつかは決定する）。特に「完全非同期 + 故障あり」では 3 つを同時に得ることはできない（FLP）。コンセンサス研究の分野全体が、どのユースケースに対してどのトレードオフなら許容できるかを見極めることに費やされてきた。
- **故障モードは crash / omission / partition / Byzantine の 4 つ。** Byzantine が最難（嘘をつくノード、A と ¬A 両方に署名）。Crash + omission は相対的に扱いやすい。
- **3f+1 ルール。** f 個の Byzantine を許容するには常に 3f+1 ノードが必要。数学的に厳密な結果（Lamport-Pease-Shostak 1982）であって設計選択ではない。
- **FLP 不可能性（1985）。** 完全非同期 + 1 crash で、決定論的プロトコルは safety と liveness を同時に保証できない。実プロトコルは「タイムアウト」「ランダム性」「view change」のいずれかで脱出する。

## 具体例

\`\`\`
n=4, f=1  →  3f+1=4 を満たす（境界）
n=7, f=2  →  3f+1=7 を満たす（境界）
n=10, f=3 →  3f+1=10 を満たす（境界）
\`\`\`

quorum 算術: quorum サイズ q、ノード総数 n。2 quorum は 2q−n ノードで重なる。重なりに 1 つの正直ノードが必要 → 2q − n > f → q > 2f → q ≥ 2f+1。代入で 2(2f+1) − n > f → n > 3f → **n ≥ 3f+1**。

各プロトコルが選ぶ妥協:

| プロトコル系統 | 分断時に犠牲にするもの |
| :--- | :--- |
| 古典 BFT（Tendermint、HotStuff、HyperBFT） | **Liveness**：分断中は停止、絶対に分岐しない |
| Nakamoto（Bitcoin、ETH 1.0 PoW） | **Safety**：生成を続ける、一時的に分岐しうる |
| Ethereum PoS（Casper FFG + LMD-GHOST） | **ハイブリッド**：tip は liveness、古いブロックは finality |

## 失敗例（誤解）

「Bitcoin は絶対に停止しない」「Bitcoin は BFT である」— **両方とも技術的には間違い** だが、間違い方が違う。Bitcoin は **safety を確率的にしか保証しない**（reorg がいつでも起こりうる）。BFT は safety を絶対保証する代わりに liveness を諦める。「Bitcoin は最高、何も犠牲にしない」は典型的な混乱。

> 🛑 **予測。** 3 ノード A、B、C が単一の値に合意しなければならない。どこで何がうまくいかなくなり得るか？ 異なる故障モードを 4 つ列挙。（「ネットワークが遅い」だけではない。答え: ① crash → ノードが落ちる、② omission → メッセージが選択的に落ちる、③ partition → ネットワークが分断、④ Byzantine → ノードが嘘をつく / 矛盾する票に署名。）

## ステップで組み立てる

### Step 1: Safety / Validity / Liveness を 1 文ずつ言える

- Safety: A が x を決め、B が y を決めたら、x = y
- Validity: 「42」について誰も話していないのに、勝手に「42」で合意できない
- Liveness: 有限時間内に決定がなされる

### Step 2: 4 故障モードを 1 例で覚える

- Crash → 電源リセット
- Omission → パケットロス、検閲
- Partition → 海底ケーブル切断
- Byzantine → 鍵侵害、バグ

### Step 3: 3f+1 の代数を紙にスケッチ

quorum 重なり > f → q ≥ 2f+1 → n ≥ 3f+1。**3f では不可** の理由まで言えるようにする。

### Step 4: FLP 脱出経路を 3 つ言える

- タイムアウト（同期仮定）
- ランダム性（確率的 finality）
- View change（一時的に liveness を諦める）

実プロトコルはどれも少なくとも 1 つの脱出経路を使っている。Tendermint = タイムアウト + view change。Bitcoin = ランダム性。Ethereum PoS = **両方**。

## 答え合わせ

- **3 ノード A/B/C の故障モード**: crash / omission / partition / Byzantine の 4 つ列挙できれば OK。
- **f = ? @ Ethereum**: ~100 万バリデータなら f < 333,333。「Byzantine」 = 「報酬で買収された / 侵害された / その両方によってプロトコルに反する動きをするバリデータ」。
- **Bitcoin が犠牲にしているもの**: safety（確率的 finality）。chain weight ベースなので最長 chain ルールが勝ち、reorg が起きうる。これが 3f+1 ルールの反例にならないのは、Bitcoin が **そもそも BFT を主張していない** から。

## 合格基準

- 4 故障モードを即答できる（crash / omission / partition / Byzantine）。
- 3f+1 ルールの代数（quorum 重なり > f）を 1 分で紙に書ける。
- FLP の意味と 3 脱出経路を言える。
- 「Ethereum は両方使う」「Bitcoin はランダム性のみ」「Tendermint はタイムアウト + view change」の対応が頭に入っている。

## まとめ（3行）

- Safety / Validity / Liveness は同時に満たせない — 必ずトレードオフ。
- 3f+1 は数学的結果（Lamport-Pease-Shostak 1982）。f Byzantine を許容するには quorum 重なり > f が必要。
- FLP 不可能性は実プロトコルでは「タイムアウト / ランダム性 / view change」のいずれかで回避する。
`,
                },
                {
                  title: 'レッスン1 — 3 つのコンセンサス系統（PoW / 純粋 BFT / ハイブリッド PoS）',
                  slug: 'consensus-three-families-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# レッスン1 — 3 つのコンセンサス系統（PoW / 純粋 BFT / ハイブリッド PoS）

## 問い

Bitcoin、Ethereum、Hyperliquid はすべてコンセンサスを走らせている。誰一人として同じ系統を選んでいない。それぞれが L0 の 4 軸の不可能性に対して違うトレードオフを取った — そしてその 1 つの選択が chain のすべてを決めた。スループット、レイテンシ、バリデータ数、slashing の意味論、誰がバリデータになれるかまで。**どの系統がどんな決済要件に合うか？**

## 原理（最小モデル）

- **3 系統 × 1 軸の勝ち負け。** 各系統は 1 つの軸で勝ち、他の軸で負ける。ただ飯はない。
- **Nakamoto / PoW**: パーミッションレス + 分断下の liveness ↔ 確率的 finality + 高エネルギー + 低スループット。
- **古典 BFT**: 即時 finality + slashing + 高スループット ↔ 有界 validator set（~100-200） + 分断時 liveness 停止。
- **ハイブリッド PoS**: 100 万バリデータ規模 + finality ↔ 複雑さ + 13 分 finality + reorg と最終確定の区別が必要。

## 具体例

| 系統 | 例 | Finality | スループット | Validator set | 犠牲にするもの |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Nakamoto / PoW | Bitcoin、ETH 1.0 | 確率的（~6 ブロック） | ~7 tps (BTC) | パーミッションレス maker | エネルギー、finality 時間 |
| 純粋 BFT | Tendermint、HotStuff、HyperBFT | 即時（1-2 RTT） | 高（>1000 tps） | 有界（~20-150） | Validator set 制約、分断時 liveness |
| ハイブリッド PoS | Ethereum 2.0 | 最終的（~13 分） | 中 | 大（~100 万） | 複雑さ、ガジェットのオーバーヘッド |

実 chain の選択:

- **Hyperliquid**: ~20 バリデータ、即時 finality、パーミッションド → **HotStuff 系**（実際は HyperBFT）
- **Tempo**: <100 バリデータ、即時 finality、パーミッションド → 純粋 BFT（おそらく Tendermint 系）
- **Ethereum**: 100 万バリデータ、eventual finality で可 → **ハイブリッド PoS**
- **Cosmos Hub**: ~150 バリデータ、即時 finality → Tendermint
- **Solana**: 単一リーダー + Tower BFT + PoH（別系統）

## 失敗例（誤解）

「Bitcoin は過半数によるコンセンサス」— **間違い**。Bitcoin は chain weight（累積仕事量）によるコンセンサス。3f+1 ルールの代わりに「攻撃者は >50% のハッシュパワーが必要」という前提で成立している。longest-chain は heaviest-chain であって most-voted-chain ではない。

## ステップで組み立てる

### Step 1: 系統を 1 文で言える

- PoW = エネルギー × 確率的 finality × パーミッションレス
- 古典 BFT = 有界委員会 × 即時 finality × slashing
- ハイブリッド PoS = 大委員会 × 確率的 head + BFT finality gadget × 大規模分散化

### Step 2: 「光速 → BFT 地域性」を計算する

光速で地球を一周すると約 140 ms。2 ラウンドの投票で最小 ~300 ms。**実 BFT chain はバリデータを低レイテンシな地域に集めてサブ秒に収める** — これが BFT を本質的に地域的にする理由。

### Step 3: 決定フレームワーク

\`\`\`
                            コンセンサス選択
                                  │
        ┌─────────────────────────┼────────────────────────────┐
        │                         │                            │
Validator 数?              Finality?                 パーミッションド?
        │                         │                            │
┌───┴───┐               ┌────┴──────┐                   ┌────┴────┐
│       │               │           │                   │         │
<200   >200      即時必要        遅延 OK             Yes        No
│       │               │           │                   │         │
BFT    ハイブリッドPoS   BFT      BFT or PoW         BFT 系     PoW or
                                                      委員会      PoS
\`\`\`

## 答え合わせ

- **Tempo は決済レール、サブ秒 finality、~100 バリデータ** → 純粋 BFT（PoW は確率的 finality で即脱落、ハイブリッドは過剰スケール）。
- **新 L1 が「高 TPS のため AlephBFT + finality gadget」** → 純粋 BFT 系統（AlephBFT はランダム化 BFT、gadget は確率的 finality 上に絶対 finality を載せる）。
- **Tempo がハイブリッド PoS を選ばない理由** → バリデータ数が <200 なので Casper FFG の分離コストがメリットを上回らない。即時 finality 要件には純粋 BFT が直接効く。

## 合格基準

- 3 系統の「勝つ軸 / 負ける軸」を即答できる。
- 5 大陸 100 バリデータの BFT finality 下限を「光速 → 140ms 一周 → 2 RTT で 300ms」と計算できる。
- 任意の chain について系統を 1 つ特定できる（Solana / Cosmos Hub / Avalanche / Berachain / Hyperliquid）。

## まとめ（3行）

- 3 系統 = PoW（確率的 finality） / 純粋 BFT（有界委員会の即時 finality） / ハイブリッド PoS（大委員会 × 確率的 head + BFT gadget）。
- 選択はビジネス要件（バリデータ数、finality 要件、パーミッション設定）から決まる — コードを書く前にトレードオフを整理する。
- 2026 年の新 L1 のデフォルトは純粋 BFT（Hyperliquid、Tempo、ほとんどの app-chain）。
`,
                },
                {
                  title: 'レッスン2 — Ethereum の PoS（Casper FFG + LMD-GHOST）',
                  slug: 'consensus-ethereum-pos-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 45,
                  content: `# レッスン2 — Ethereum の PoS（Casper FFG + LMD-GHOST）

## 問い

Ethereum は *1 つの* コンセンサスプロトコルを走らせているわけではない。**2 つを重ねて** 走らせている。なぜ 2 つなのか？ 100 万バリデータでネットワークを溶かさずに BFT 系の即時 finality を得るのは不可能 — かといって「何も最終に確定しない」chain も出荷できない。ハイブリッドはその妥協点。**両者の境界はどこか？**

## 原理（最小モデル）

- **2 プロトコルの役割分担。** LMD-GHOST = fork choice（毎 slot、確率的 head）、Casper FFG = finality gadget（毎 epoch、確定 checkpoint）。
- **LMD-GHOST = Latest Message Driven, Greedy Heaviest Observed Sub-Tree.** 各バリデータの **最新の** attestation だけを stake 加重で数え、最大重量の subtree を選ぶ。直系の子ではなく subtree 全体を数える（GHOST 部分）。
- **Casper FFG = 2 epoch 連続 justify で finalize.** 32 slot ごとに checkpoint。stake の 2/3+ が justify、次の checkpoint も justified になった時点で finalize。最短 2 epoch = 12.8 分。
- **Slashing = 暗号的に検出可能.** Double vote / surround vote の 2 違反。署名 2 つあれば誰でも proof を提出できる。最低 1 ETH、相関 slashing で最大 full stake（32 ETH）。
- **Engine API が EL と CL を繋ぐ.** \`engine_forkchoiceUpdated\` / \`engine_getPayload\` / \`engine_newPayload\` の 3 メソッド。

## 具体例

CL ↔ EL のハンドシェイク:

\`\`\`mermaid
sequenceDiagram
    participant CL as Consensus Client (Lighthouse)
    participant EL as Execution Client (Reth)

    Note over CL: Slot N — 自分が proposer
    CL->>EL: engine_forkchoiceUpdated(head, finalized, safe)
    CL->>EL: engine_getPayloadV4(payloadId)
    EL-->>CL: ExecutionPayload (構築済ブロック)
    Note over CL: ブロックに署名 + ブロードキャスト
    CL->>EL: engine_newPayloadV4(payload)
    EL-->>CL: PayloadStatus { VALID }
\`\`\`

Fork choice の例:

\`\`\`
Block A (slot N で提案)
├── Block B (slot N+1)        ← subtree で attestation 60%
│   └── Block D (slot N+2)
└── Block C (slot N+1、対立 fork)    ← attestation 40%
\`\`\`

LMD-GHOST は B を canonical として選ぶ。C は orphan。

## 失敗例（誤解）

「LMD-GHOST は要するに longest-chain」— **間違い**。LMD-GHOST は stake 加重の heaviest-subtree。**heaviest-subtree が防ぐ攻撃**: selfish mining。longest-chain では 30% のハッシュパワーを持つマイナーが秘密裏に chain を作って後から公開し、他者を orphan にできる。heaviest-subtree は stake 加重の attestation を強制し、これをずっと困難にする。

「Ethereum は BFT」— **半分正しく、半分間違い**。Ethereum は **finalized** ブロックには BFT だが **unfinalized** ブロックには Nakamoto 風。この区別は consensus-critical。

> 🛑 **予測。** Ethereum の slot time 12 秒、epoch 32 slot。finality は最短 ~2 epoch。実時間を計算する。なぜ毎 slot finalize しないのか？（答え: 12s × 32 × 2 = 12.8 分。毎 slot finalize すると 100 万バリデータが毎 12 秒に全員投票することになり、ネットワーク帯域とコンセンサスメッセージ量が爆発する。epoch 単位に集約することでスケールと finality を両立。）

## ステップで組み立てる

### Step 1: 2 プロトコルの周期と出力を覚える

| プロトコル | 役割 | 周期 | 出力 |
| :--- | :--- | :--- | :--- |
| LMD-GHOST | Fork choice | 毎 slot（12s） | 確率的 head |
| Casper FFG | Finality gadget | 毎 epoch（~6.4 分） | 確定 checkpoint |

### Step 2: Slashing 2 違反を 1 文で

- Double voting: 同じ epoch で異なる checkpoint に 2 票署名
- Surround voting: 票 A の後に A を surround する票 B を署名

どちらも暗号的に証明可能 = oracle 不要 = パーミッションレス検出。

### Step 3: Engine API の 3 メソッドを役割で覚える

- \`engine_forkchoiceUpdated\` → 「chain head は X、X の上にブロックを準備せよ」
- \`engine_getPayload\` → 「準備したブロックを渡せ」
- \`engine_newPayload\` → 「他の proposer から受け取ったブロックを検証せよ」

### Step 4: 自分の L1 への含意

- **おそらく** Ethereum の CL は走らせない（独自 validator set、異なる slot time）
- **おそらく** Reth 互換の Engine API は使う（別の CL を差し替えられる）
- **絶対に** slashing の意味論は必要（validator set サイズに合わせてカスタマイズ）

## 答え合わせ

- **Double vote のスラッシング額**: 最低 1 ETH（単独）、最大 full 32 ETH（相関、攻撃時）。「相関 slashing」が同時 slash されたバリデータ数に比例して罰則を上げる。
- **finality 13 分のトレードオフ**: スケールでのバリデータ分散化（100 万バリデータ規模）を 1 秒 BFT finality と引き換えに得ている。
- **Solana の別系統との対比**: Tower BFT + PoH は検証可能クロックにアンカーされた投票で ~400ms finality を達成、代わりにバリデータハードウェア要求が高い + 単一リーダー（スロットごとの委員会なし）。Gasper はスケールのために、Tower BFT はサブ秒 finality のためにそれぞれ別の犠牲を払う。

## 合格基準

- LMD-GHOST と Casper FFG の周期・出力を即答できる。
- Engine API 3 メソッドを役割で言える。
- 「Ethereum の finality 13 分はバグではなく分散化トレードオフ」を 2 文で説明できる。
- slashing 2 違反を絵で書ける。

## まとめ（3行）

- Ethereum = LMD-GHOST（毎 slot fork choice）+ Casper FFG（毎 epoch finality）の 2 層構造。
- Slashing 2 違反（double vote / surround vote）は暗号的に検出可能、相関罰則で協調攻撃を経済的に潰す。
- Engine API（forkchoiceUpdated / getPayload / newPayload）が EL ↔ CL の唯一の接続点 — Reth は EL 側を実装する。
`,
                },
                {
                  title: 'レッスン3 — HotStuff と HyperBFT（単一リーダー BFT 系統）',
                  slug: 'consensus-hotstuff-hyperbft-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 17,
                  xpReward: 45,
                  content: `# レッスン3 — HotStuff と HyperBFT（単一リーダー BFT 系統）

## 問い

Hyperliquid は秒間約 20 万件の perp 取引をサブ秒 finality で処理する。その下のコンセンサスが **HyperBFT** — そして HyperBFT は奇抜な新設計ではない。HotStuff の variant である。HotStuff（2018）はさらに PBFT（1999）の派生で、この系統全体が、即時 finality を要する現代のほぼすべての非Ethereum L1の選択肢になっている。**PBFT から HotStuff への跳躍は何によって可能になったか？**

## 原理（最小モデル）

- **PBFT は O(n²)、HotStuff は O(n).** n = 100 で約 100 倍のメッセージ削減。可能にしたのは ① 閾値署名（BLS）と ② pipelined commit。
- **閾値署名で n² → n.** 2f+1 バリデータの部分署名を **サイズ O(1) の 1 つの集約署名** にまとめる。リーダーは集約だけをブロードキャスト、バリデータ同士の直接交信は不要。
- **Pipelined commit.** Block N、N+1、N+2 が異なるフェーズで同時並行に進む。スループットは 3 ブロック時間に 1 commit → 1 ブロック時間に 1 commit。
- **3 つの不変条件.** Quorum Certificate（2f+1 投票の集約署名証明）/ View 番号（リーダー切り替え単位）/ Lock（view change 中の safety 違反防止）。

## 具体例

PBFT の 3 ラウンド:

\`\`\`
Round 1 (Pre-prepare): リーダー → 全バリデータ:「ブロック B」
Round 2 (Prepare):     全 → 全:「B に投票した」          ← all-to-all = O(n²)
Round 3 (Commit):      全 → 全:「B を commit する準備ができた」 ← all-to-all = O(n²)
\`\`\`

HotStuff の pipelined commit:

\`\`\`
Block N:   Propose → Vote → Commit
Block N+1:           Propose → Vote → Commit
Block N+2:                     Propose → Vote → Commit
\`\`\`

HotStuff の派生:

| Variant | 年 | 主な変更 |
| :--- | :--- | :--- |
| Basic HotStuff | 2018 | 原典 — 3 フェーズ、pipelined |
| Event-driven HotStuff | 2019 | フェーズ間が非同期 |
| DiemBFT | 2020 | Diem（現在は廃止）で使用 |
| HyperBFT | 2023 | Hyperliquid で使用 |
| Aptos BFT | 2022 | Aptos で使用 |

## 失敗例（誤解）

「Lock は fork を防ぐ」— **部分的に正しい**。Lock が防ぐのは **矛盾する commit** であって、fork そのものではない。Byzantine リーダーは矛盾するブロックを **提案** できるが、lock はそのうち 1 つだけが **commit** されることを保証する。

「HyperBFT は HotStuff そのまま」— **間違い**。HyperBFT は HotStuff 派生だが、Hyperliquid は実装をオープンソース化していない。orderbook 取引のホットパスに合わせた低レイテンシ最適化（pipelining 深さ、リーダーローテーション、ネットワークトランスポート）が入っていると推測される。

> 🛑 **予測。** PBFT は O(n²)、HotStuff は O(n)。n = 100 で約 100 倍のメッセージ削減を可能にした変更は何か？（ヒント: 暗号。答え: 閾値署名（BLS）。2f+1 バリデータの部分署名を 1 つの集約署名にまとめてサイズ O(1) に圧縮、all-to-all 通信が不要になる。）

## ステップで組み立てる

### Step 1: PBFT → HotStuff の 2 発明を言える

1. **閾値署名（BLS）**: 部分署名を集約 → all-to-all 不要 → O(n)
2. **Pipelined commit**: フェーズを重ねる → 単位時間あたり commit 数が 3 倍

### Step 2: 3 不変条件を 1 文で

- **QC（Quorum Certificate）**: 「2f+1 が B に投票した」の集約署名証明
- **View 番号**: リーダー切り替え単位
- **Lock**: 2f+1 が phase 2 で投票した後、次のリーダーは同じブロックを含めるか、含められない証明（より高い QC）を出す

### Step 3: Byzantine リーダー検知のタイミング

**Propose フェーズの後**、2f+1 が yes 投票しなければ次のリーダーが view change で引き継ぐ。不正な提案は破棄。Liveness は 1 ラウンド余計に使うだけで回復。

## 答え合わせ

- **HotStuff が Hyperliquid に適合する理由**: 有界委員会で低レイテンシ + QC 検証コスト低（orderbook コードが包含検証を高速にできる）+ pipelining でスループット。
- **HyperBFT が非公開だが推測できる範囲**: HotStuff 派生 + ~20-25 バリデータ + サブ秒 finality + HyperEVM が orderbook と並列で同じコンセンサスで commit。非公開: pipelining 深さ、リーダーローテーション、view change 詳細、ネットワーク最適化。
- **Tempo の系統**: ホワイトペーパー未公開だが、ほぼ確実に HotStuff か Tendermint 系（親戚）。

## 合格基準

- PBFT O(n²) → HotStuff O(n) を可能にした 2 発明（閾値署名 + pipelining）を即答できる。
- QC / View / Lock の役割を 1 文で言える。
- HotStuff 派生 5 つ（Basic / Event-driven / DiemBFT / HyperBFT / Aptos BFT）の系譜を辿れる。

## まとめ（3行）

- HotStuff = PBFT × 閾値署名（O(n²) → O(n)）+ pipelined commit。
- 3 不変条件 = QC（2f+1 集約署名）/ View（リーダー切り替え単位）/ Lock（safety 違反防止）。
- HyperBFT は HotStuff 派生で実装非公開、しかし系統と性能特性は公開仕様から推測できる。
`,
                },
              ],
            },
          },
          {
            title: '実コンセンサスコードを読む',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: 'レッスン4 — Reth の Consensus trait を読む',
                  slug: 'consensus-reth-trait-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# レッスン4 — Reth の Consensus trait を読む

## 問い

Reth のソースを開く。「PoS」で検索する。ほとんど何も出てこない — なぜなら **Reth は PoS も BFT もまったく実装していないから**。その仕事は consensus client（Lighthouse、Prysm、自前エンジン）側にある。では「Hyperliquid は Reth で動く」「Berachain は PoL のために Reth を fork した」と言うとき、**実際に触っているコンセンサスの接合面は何か？**

## 原理（最小モデル）

- **役割分担: head 選択（CL） vs ブロック検証（EL = Reth）.** Reth の \`Consensus\` trait は chain head を選ばない。受け取ったブロックを **検証する** だけ。
- **3 フェーズの検証.** \`validate_block_pre_execution\`（安いチェック、EVM 不要）→ \`validate_body_against_header\`（暗号的整合性）→ \`validate_block_post_execution\`（state root、ガス、receipt — コンセンサスクリティカル）。
- **HeaderValidator が親 trait.** Header の検証は body の検証から分離されている — header は先に到着、body なしで検証可能、ライトクライアントは header だけでよい。
- **BFT 固有のチェックは HeaderValidator に入る.** 「この proposer はこの slot の選出リーダーか？」「proposer 署名は valid か？」など。

## 具体例

[\`crates/consensus/consensus/src/lib.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/consensus/consensus/src/lib.rs) の中核 trait:

\`\`\`rust
#[auto_impl::auto_impl(&, Arc)]
pub trait Consensus<B: Block>: HeaderValidator<B::Header> {
    type Error;

    fn validate_body_against_header(
        &self,
        body: &B::Body,
        header: &SealedHeader<B::Header>,
    ) -> Result<(), Self::Error>;

    fn validate_block_pre_execution(
        &self,
        block: &SealedBlock<B>,
    ) -> Result<(), Self::Error>;
}

pub trait FullConsensus<N: NodePrimitives>: Consensus<N::Block> {
    fn validate_block_post_execution(
        &self,
        block: &RecoveredBlock<N::Block>,
        result: &BlockExecutionResult<N::Receipt>,
    ) -> Result<(), ConsensusError>;
}
\`\`\`

HeaderValidator:

\`\`\`rust
pub trait HeaderValidator<H>: Send + Sync + Debug {
    fn validate_header(&self, header: &SealedHeader<H>) -> Result<(), ConsensusError>;

    fn validate_header_against_parent(
        &self,
        header: &SealedHeader<H>,
        parent: &SealedHeader<H>,
    ) -> Result<(), ConsensusError>;

    fn validate_header_with_total_difficulty(
        &self,
        header: &H,
        total_difficulty: U256,
    ) -> Result<(), ConsensusError>;
}
\`\`\`

3 フェーズ × 各フェーズで見るもの:

| フェーズ | チェック内容 | コスト |
| :--- | :--- | :--- |
| pre_execution | tx root / receipt root / block hash / size / timestamp | <1ms |
| body_against_header | transactions root == merkle(tx)、withdrawals root | 暗号的、明確 |
| post_execution | gas used / state root / receipts root / logs bloom | コンセンサスクリティカル |

## 失敗例（誤解）

「Reth は PoS を実装している」— **間違い**。Reth は EL（execution layer）。PoS（投票、attestation、proposer 選出）は CL（consensus client）の仕事。Reth は受け取ったブロックを検証するだけで、誰が head かを選ばない。

「state root チェックは pre-execution で十分」— **間違い**。post-execution が知っている = pre-execution が知らない = 「実際に EVM を回した結果の post-state」。state root は post-execution でしか検証できない。

> 🛑 **予測。** Reth はコンセンサスレイヤから来るブロックを検証する必要がある。EVM が tx を実行する前に、どんなチェックが走るべきか？ 4 つ列挙。（答え: ① 暗号的 = tx root / receipt root が header と一致、② 構造的 = block hash が well-formed、③ 時間的 = timestamp が未来に行き過ぎていない、④ コンセンサス固有 = proposer がアクティブな validator set にいるか、署名は有効か、round 番号は正しいか。）

## ステップで組み立てる

### Step 1: 3 フェーズを実行順で覚える

pre_execution → body_against_header → post_execution。**trait の宣言順ではなく** ランタイムで走る順序。

### Step 2: デフォルト実装 EthBeaconConsensus を読む

\`crates/ethereum/consensus\` を開く。チェック内容:
- ブロックが正しい形であること
- 実行後の state root が一致すること
- Gas limit が parent の ±1/1024 以内（EIP-1559 弾性境界）
- BaseFee が EIP-1559 公式に従うこと
- Timestamp が単調増加すること

**PoS の検証はしない** — それは CL の仕事。

### Step 3: BFT 用のカスタム override 箇所

| Override 箇所 | 理由 |
| :--- | :--- |
| HeaderValidator | proposer 署名、validator set 包含、view/round 番号 |
| validate_block_post_execution | コンセンサス固有 post-state（HyperEVM の orderbook 状態など） |
| Slashing 関連フィールド | header に slashing 証拠が含まれる場合の暗号検証 |

**trait を書き直すわけではない** — 異なる実装を提供して NodeBuilder に配線する。

### Step 4: リポで実物を読む

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
\`\`\`

1. \`crates/consensus/consensus/src/lib.rs\` を開いて \`Consensus\` trait の全体を読む
2. \`crates/ethereum/consensus/src/lib.rs\` を開いて実装を見つける
3. 数える: \`EthBeaconConsensus\` は何個のメソッドを override し、いくつをデフォルトのまま使っているか？
4. \`validate_block_post_execution\` が呼び出される唯一の場所を見つける（メソッド名で検索）

## 答え合わせ

- **head 選択 vs ブロック検証の境界**: head 選択 = consensus client（Lighthouse / Prysm / 自前）、ブロック検証 = Reth の \`Consensus\` 実装。
- **state root を post に置く理由**: state root は EVM 実行の結果。pre には実行結果がない（post になって初めて分かる）。
- **BFT カスタム L1 で override すべき 3 箇所**: HeaderValidator（proposer 署名 + validator set）、validate_block_post_execution（コンセンサス固有 post-state）、slashing 関連フィールドの暗号検証。

## 合格基準

- 3 検証フェーズを実行順で言える。
- 「Reth は head を選ばない」「CL が head を選ぶ」を即答できる。
- HeaderValidator がなぜ Consensus trait の親なのか言える。
- リポを clone して \`Consensus\` と \`EthBeaconConsensus\` の関係を辿れる。

## まとめ（3行）

- Reth の \`Consensus\` trait は **ブロック検証** のみを担う — head 選択は consensus client の仕事。
- 検証は 3 フェーズ（pre / body↔header / post）、post-execution が state root / gas / receipt のコンセンサスクリティカルチェック。
- BFT カスタム L1 は trait を書き直さず HeaderValidator + validate_block_post_execution に **異なる実装を提供** して NodeBuilder に配線する。
`,
                },
                {
                  title: 'レッスン5 — Malachite を読む（Informal Systems の Rust-native BFT）',
                  slug: 'consensus-malachite-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 45,
                  content: `# レッスン5 — Malachite を読む（Informal Systems の Rust-native BFT）

## 問い

Reth ベース L1 が Tendermint 系 BFT を必要とするとき、選択肢は 3 つ。① 自前で書く（数か月 + セキュリティリスク） ② CometBFT（Go）にクロスプロセスで委譲（醜い糊コード） ③ [\`informalsystems/malachite\`](https://github.com/informalsystems/malachite) を使う（CometBFT を作ったのと同じチームによる **Tendermint の Rust 書き直し**）。**選択肢 3 のアーキテクチャはどうなっているか？**

## 原理（最小モデル）

- **3 つの差し替え可能なレイヤ.** Driver（オーケストレータ）+ Vote Keeper（quorum ロジック）+ Round State Machine（Tendermint ルール）。
- **3 ラウンドの投票.** Propose → Prevote → Precommit。2 ラウンド目（Precommit）が「2f+1 が同じブロックに合意」を保証 — 1 ラウンドだけだと Byzantine リーダーが split-vote を仕掛けて commit を混乱させられる。
- **Application は Context trait で接続.** 自分のブロック型 / validator set / 署名方式を提供すれば、Malachite Driver がプロトコルすべてを処理する。
- **本番事例 = Astria.** Reth ベース共有 sequencer + CometBFT、Malachite に置き換え可能。

## 具体例

3 レイヤのアーキテクチャ:

\`\`\`mermaid
flowchart TB
    App["Application<br/>(自分の chain)"] -->|propose/validate| Driver["Driver<br/>(オーケストレータ)"]
    Driver -->|Vote keeper| VK["Vote Keeper<br/>(quorum ロジック)"]
    Driver -->|Round state machine| RSM["Round State Machine<br/>(Tendermint ルール)"]
    VK -->|2f+1 達成?| Driver
    RSM -->|次ステップ| Driver
\`\`\`

Round State Machine:

\`\`\`rust
pub enum Step {
    NewRound,
    Propose,
    Prevote,
    Precommit,
    Commit,
}
\`\`\`

各ラウンドの遷移:

1. **NewRound** → ラウンドに入り、自分が proposer かを判定
2. **Propose** → proposer ならブロックをブロードキャスト、違うなら待つ
3. **Prevote** → 提案ブロックに「yes」または「nil」を投票。同じブロックへの 2f+1 prevote = *polka*
4. **Precommit** → polka を見たら precommit をブロードキャスト。2f+1 precommit で **commit**
5. **Commit** → 確定、次の height へ

Vote Keeper:

\`\`\`rust
pub struct VoteKeeper<Ctx: Context> {
    height: Ctx::Height,
    threshold: ThresholdParam,
    rounds: BTreeMap<Round, RoundVotes<Ctx>>,
}

impl<Ctx: Context> VoteKeeper<Ctx> {
    pub fn add_vote(&mut self, vote: Ctx::Vote, weight: Weight) -> VoteKeeperOutput<Ctx::Value>;
    pub fn get_polka(&self, round: Round) -> Option<Ctx::Value>;
    pub fn get_commit(&self, round: Round) -> Option<Ctx::Value>;
}
\`\`\`

操作は 3 つ — 票の追加、polka 確認、commit 確認。**それだけ**。Tendermint の quorum ロジックが 1 つの struct に収まる。

Driver の I/O:

\`\`\`rust
pub enum Input<Ctx: Context> {
    NewHeight(Ctx::Height, ValidatorSet),
    Propose(Ctx::Proposal),
    Vote(Ctx::Vote),
    TimeoutElapsed(Timeout),
}

pub enum Output<Ctx: Context> {
    Propose(Ctx::Value),
    Vote(Ctx::Vote),
    Decide(Ctx::Height, Round, Ctx::Value),
    ScheduleTimeout(Timeout),
}
\`\`\`

Context trait（application 側が実装）:

\`\`\`rust
pub trait Context {
    type Address;
    type Height;
    type Vote: Vote<Self>;
    type Proposal;
    type Value;  // = 自分のブロック型
    type ValidatorSet;
    type SigningScheme;
    // ...
}
\`\`\`

Tempo クラスの統合例:

> 以下は概念スニペット（associated type と配線の形を示すための抜粋）。

\`\`\`rust
struct TempoContext;
impl Context for TempoContext {
    type Address = ValidatorAddress;
    type Height = BlockNumber;
    type Vote = TempoVote;
    type Proposal = TempoBlock;      // Reth 互換 Block
    type Value = BlockHash;
    type ValidatorSet = TempoValidatorSet;
    type SigningScheme = Ed25519;
}

// メインループ
let mut driver = Driver::<TempoContext>::new(/* params */);
loop {
    let input = network.next_message().await;
    let outputs = driver.process(input);
    for output in outputs {
        handle(output).await;
    }
}
\`\`\`

## 失敗例（誤解）

「投票が 1 ラウンドで十分」— **間違い**。1 ラウンドだけだと Byzantine リーダーが split-vote を仕掛けられる（異なるバリデータに異なるブロックを送り、各バリデータが違うブロックに投票し、後の commit が混乱）。2 ラウンド目（Precommit）が「2f+1 が同じブロックに合意した」ことを確認 — これが safety を保証する。

「Malachite は CometBFT より速い」— 比較できない。同じプロトコル（Tendermint）の Rust 実装で、Astria のような Rust chain に組み込みやすいのが利点。性能比較ではなく **言語適合性** の選択。

> 🛑 **予測。** Tendermint はブロックあたり 3 つの投票ラウンド（Propose / Prevote / Precommit）を持つ。各ラウンドで、バリデータは何を決定するのか？ 各ラウンドの入力と出力を列挙。（答え: ① Propose: 入力 = リーダーの提案、出力 = 「これに賛成 / 反対」の準備、② Prevote: 入力 = 全バリデータの prevote、出力 = polka（同じブロックへの 2f+1 prevote）の検知、③ Precommit: 入力 = polka 観測 + 全バリデータの precommit、出力 = commit 決定（2f+1 precommit）。）

## ステップで組み立てる

### Step 1: 3 レイヤを言える

- Driver = オーケストレータ（メッセージ受け取り → ディスパッチ → output 発火）
- Vote Keeper = quorum 集計（add_vote / get_polka / get_commit）
- Round State Machine = Tendermint プロトコル（5 状態の遷移）

### Step 2: 投票 2 ラウンドの必要性を 1 文で

「2 ラウンド目（Precommit）は **2f+1 が同じブロックに合意した** ことを確認するため。1 ラウンドだけだと Byzantine リーダーの split-vote を許す。」

### Step 3: Application 側の Context 実装

自分の chain で実装するのは Context trait の associated types のみ:
- ブロック型（Reth の \`Block\`）
- Validator set（カスタム struct）
- 署名方式（ECDSA / BLS / Ed25519）

あとは Driver がすべて処理する。

### Step 4: リポで確認

[\`code/crates/vote/src/lib.rs\`](https://github.com/informalsystems/malachite/blob/main/code/crates/core-votekeeper/src/lib.rs) を開いて \`add_vote\` を追う。**何が何で加重されているか？** 2f+1 の閾値はどこから来ているか？

## 答え合わせ

- **Astria の現状**: Reth ベース共有 sequencer + CometBFT（Go 版 Tendermint）で本番運用中。Malachite に置き換え可能 = 同プロトコルの Rust 実装。
- **Malachite が解放してくれるもの**: Driver / Vote Keeper / RSM のすべて。Tendermint プロトコルを自分で書かずに済む。Application は primitives（block 型、validator set、署名）だけ提供すればよい。
- **本番までの距離**: Astria を見ながら Reth ↔ Malachite の Engine API 配線をなぞれば、Tempo クラスの L1 chain が組み立てられる。

## 合格基準

- 3 レイヤ（Driver / Vote Keeper / RSM）の役割を即答できる。
- 5 状態（NewRound → Propose → Prevote → Precommit → Commit）の遷移を辿れる。
- Context trait に最低限必要な 5 つの associated type を言える。
- polka と commit の違いを 1 文で言える（polka = 2f+1 prevote、commit = 2f+1 precommit）。

## まとめ（3行）

- Malachite = Tendermint の Rust 書き直し（CometBFT の元チームによる）、Reth ベース chain への組み込みが最もクリーンな選択肢。
- 3 レイヤ（Driver / Vote Keeper / RSM）+ Context trait で application が接続。Driver がプロトコルすべてを処理する。
- 3 投票ラウンド（Propose / Prevote / Precommit）の 2 ラウンド目が「2f+1 が同じブロックに合意」を保証 — split-vote 攻撃を潰す。
`,
                },
                {
                  title: 'レッスン6 — bera-reth を読む（PoL をコンセンサスカスタマイズとして）',
                  slug: 'consensus-bera-reth-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 40,
                  content: `# レッスン6 — bera-reth を読む（PoL をコンセンサスカスタマイズとして）

## 問い

「うちは違うコンセンサスを使っている」というピッチの大半は、結局トークン名を変えただけの PoS に落ち着く。Berachain の **Proof-of-Liquidity**（PoL）は珍しい例外で、誰が検証できるか、報酬がどこに流れるかを実際に変えている。そして実装 — [\`berachain/bera-reth\`](https://github.com/berachain/bera-reth) — は本番で動いており、Reth 上にあって、**差分は半日あれば読み切れる**。

## 原理（最小モデル）

- **PoL は PoS の派生.** Validator set / Slashing / BFT finality / 経済モデルの骨格は PoS と同じ。変わるのは ① バリデータ適格性（LP ベース）、② 報酬の流れ（LP に戻る）、③ ブロック時間（~2s）。
- **bera-reth のカスタマイズは 4 ディレクトリ.** \`consensus/\`（trait 実装）+ \`evm/\`（PoL precompile）+ \`chainspec/\`（fork heights、genesis）+ \`node/\`（NodeBuilder 配線）。
- **完全カスタム L1 = ~2000 行のカスタマイズ.** Tendermint 系コンセンサスエンジンが揃っていれば、仕事の大半はプロトコル再実装ではなく **統合**。
- **同じパターンが Tempo にも効く.** \`tempoxyz/tempo\` は公開済み、\`tempoxyz/reth\` は upstream に対して 0 commits ahead — fork せず合成。

## 具体例

bera-reth のディレクトリ構造:

\`\`\`
bera-reth/
├── consensus/          ← カスタムコンセンサス impl
├── chainspec/          ← Berachain mainnet/testnet 仕様
├── evm/                ← カスタム EVM config + precompile
├── node/               ← NodeBuilder 配線
└── rpc/                ← bera_* RPC namespace
\`\`\`

各ディレクトリの責務:

| ディレクトリ | 何を書くか | 規模 |
| :--- | :--- | :--- |
| consensus/ | \`Consensus\` 実装、proposer 検証、署名方式 | ~500 行 |
| evm/ | 報酬分配 precompile、Validator registry precompile | ~600 行 |
| chainspec/ | fork heights、genesis、precompile アドレス、base fee | ~300 行 |
| node/ | 上 3 つを NodeBuilder に配線 | ~200 行 |
| rpc/ | bera_* namespace（pol_*、validator_*） | ~400 行 |

PoS vs PoL の差分:

| 機能 | PoS | PoL | 同じ？ |
| :--- | :--- | :--- | :--- |
| 有界 validator set | あり（~100 万） | あり（~100） | 構造同じ |
| Double-sign に対する slashing | あり | あり | 同じ |
| Finality gadget | Casper FFG | CometBFT 系 | 違うエンジン |
| ブロック時間 | 12s | ~2s | 違う |
| トークンモデル | 単一（ETH） | 二重（BGT + Bera） | 違う |

## 失敗例（誤解）

「PoL は新コンセンサス系統」— **間違い**。PoL は **PoS にひねりを加えたもの**。BFT finality + slashing + validator set のコア構造は同じ。変わるのは経済層と適格性ゲート。

「Reth を fork する必要がある」— **間違い**。\`tempoxyz/reth\` は upstream に 0 commits ahead = **fork せず合成**。bera-reth はカスタム実装を別 crate に置いて NodeBuilder で配線する設計。

> 🛑 **予測。** Ethereum PoS では 32 ETH をステークすることでバリデータになる。Berachain の PoL ではそれに相当するステップは何か？（ヒント: 「BGT をステーク」ではない。）（答え: ① BEX に流動性を提供 → BGT を獲得、② BGT をステーク → バリデータ特権。BGT は譲渡不能なガバナンス資産で、唯一の入手経路が LP。バリデータ経済が DEX 流動性に整合する設計。）

## ステップで組み立てる

### Step 1: 4 ディレクトリの責務を即答できる

consensus / evm / chainspec / node + rpc。各 ~200-600 行。

### Step 2: PoL ↔ PoS の差分 3 つを言える

- バリデータになれる人（LP ベースのゲート）
- 報酬の流れ（ステークだけでなく LP に戻る）
- ブロック時間（~2s）

### Step 3: 自分の L1 への落とし込み

| bera-reth の部品 | 自分の L1 で書き換えるもの |
| :--- | :--- |
| TempoConsensus impl | 自分の validator set ルールに置き換え |
| Executor pre-execution hook | PoL hook → 自分のビジネスロジック |
| NodeBuilder 配線 | 自分のコンポーネントに |
| chainspec | 自分の genesis / fork / precompile |

骨格は bera-reth テンプレート。

### Step 4: リポで読む順序

1. \`bera-reth/consensus/src/lib.rs\` — \`Consensus\` 実装
2. \`bera-reth/node/src/lib.rs\` — NodeBuilder への配線
3. \`bera-reth/chainspec/src/lib.rs\` — どのプロトコルパラメータに依存するか
4. \`bera-reth/evm/src/lib.rs\` — このコンセンサスの下で走る executor hook

各ファイル <500 行。

## 答え合わせ

- **bera-reth が vanilla Reth より持っているもの**: コンセンサス固有のコードパス（PoL バリデータ適格性、報酬分配 precompile、BLS 集約署名検証、~2s ブロック向け base fee パラメータ）。「ただの config 差分」ではない。
- **Tempo / Hyperliquid 出荷の道筋**: bera-reth テンプレート → 自分の validator set ルール + executor hook + NodeBuilder 配線 + chainspec。~2000 行のカスタム実装で完走可能（Tendermint 系エンジンは Malachite を使う前提）。
- **fork せず合成の意味**: tempoxyz/reth = upstream に 0 commits ahead = upstream の進化を自動で取り込める。カスタム L1 = カスタム crate の集合 + 配線。

## 合格基準

- bera-reth の 4 ディレクトリの責務を即答できる。
- PoL ↔ PoS の差分 3 つを 1 文で言える。
- 「カスタム L1 ≒ Reth へのカスタマイズ ~2000 行」を 1 文で説明できる。
- リポを開いて consensus → node → chainspec → evm の順で読める。

## まとめ（3行）

- PoL = PoS にバリデータ適格性ゲート + 報酬流の変更 + 高速ブロック時間を加えた派生（コア構造は同じ）。
- bera-reth の 4 ディレクトリ（consensus / evm / chainspec / node）が「Reth 上のカスタム L1 」のテンプレート、~2000 行。
- fork せず合成（upstream に 0 commits ahead）+ カスタム crate の集合 + NodeBuilder 配線 = 自分の L1 chain。
`,
                },
                {
                  title: 'クイズ — コンセンサス内部を読む',
                  slug: 'consensus-reading-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# クイズ — コンセンサス内部を読む

本モジュールで読んだ内容の短いテスト。**雰囲気で答えない** — 各設問は具体的なソースファイルか設計選択に対応する。

レッスン4（Reth Consensus trait）/ レッスン5（Malachite）/ レッスン6（bera-reth）の構造的事実を確認する。
`,
                  quizQuestions: [
                    {
                      "question": "Reth の `Consensus` trait と Lighthouse のような consensus client の **構造的な違い** は?",
                      "options": [
                        "同じもの — Reth は内部にコンセンサスエンジンを含む。",
                        "Reth の `Consensus` trait はブロックを chain ルールに対して **検証** する。Lighthouse のような consensus client は fork choice を通じてどのブロックを head にするかを **選択** する。EL/CL 境界で交差する 2 つの異なる仕事。",
                        "Reth の `Consensus` はネットワーク層で動き、consensus client はアプリケーション層で動く。",
                        "Reth は RocksDB を使い、consensus client は MDBX を使う。"
                      ],
                      "correctIndex": 1,
                      "explanation": "EL/CL 分離が基本。Reth (EL) はブロックを検証する — このブロックはルールに従っているか? Lighthouse (CL) は決める — 次にどの有効ブロックの上に積むべきか? カスタム レッスン1では **CL** (例えば Malachite) **と Reth の Consensus 実装** の両方を差し替える。"
                    },
                    {
                      "question": "Tendermint で、投票が **2 ラウンド** (Prevote、その後 Precommit) になっていて、1 ラウンドでないのはなぜか?",
                      "options": [
                        "性能 — 2 ラウンドは 1 ラウンドより並列化しやすい。",
                        "最初のラウンド (Prevote) はバリデータがブロックを見たことを確認する。2 ラウンド目 (Precommit) は 2f+1 が **同じ** ブロックを見たことを確認する — Byzantine リーダーが異なるブロックを異なるバリデータに送る攻撃を防ぐためだ。",
                        "PBFT (1999) からの伝統で、HotStuff など現代の variant は 1 ラウンドで動く。",
                        "2 ラウンド目で uncle ブロックを参照できるようにするため。"
                      ],
                      "correctIndex": 1,
                      "explanation": "2 ラウンドが split-brain に対する safety を担う。Byzantine リーダーは異なるブロックを異なる部分集合に送れる。2 ラウンド目なしでは、矛盾する 2 ブロックを commit させられる。Prevote は「何かを見た」、Precommit は「2f+1 で同じものを見た」を確認する。"
                    },
                    {
                      "question": "PBFT (1999) と HotStuff (2018) の **見出し級の構造的な違い** は?",
                      "options": [
                        "PBFT は純粋 Rust で走り、HotStuff は Solidity コントラクトで動く。",
                        "HotStuff は **閾値署名** によって PBFT の O(n²) all-to-all 通信を O(n) のリーダー fan-out に圧縮し、連続するブロックをパイプライン化してスループットを上げる。",
                        "PBFT は finality gadget で、HotStuff は fork choice ルール。",
                        "PBFT はパーミッションレスで、HotStuff は validator set を必要とする。"
                      ],
                      "correctIndex": 1,
                      "explanation": "暗号 (閾値署名) によって 1 つの集約署名が n 個の個別署名を置き換える。これが n² → n の圧縮。pipelining が 2 つ目の発明で、ブロックを異なるフェーズで同時並行に進められるようになる結果、スループットが「3 ブロック時間に 1 commit」から「1 ブロック時間に 1 commit」になる。"
                    },
                    {
                      "question": "**Ethereum PoS の finality 周期** は何か、その構造的な理由は?",
                      "options": [
                        "毎 slot (12s) — スループットを最大化するため。",
                        "最短 2 epoch (~13 分)。**100 万を超えるバリデータ** では BFT 系の即時 finality は不可能なので、stake 加重 2/3+ 票による epoch checkpoint で finalize する (Casper FFG)。",
                        "確率的 — Ethereum PoS は Bitcoin 系の longest-chain を使う。",
                        "設定可能で、オペレータが 1 slot と 1 epoch から選ぶ。"
                      ],
                      "correctIndex": 1,
                      "explanation": "ハイブリッド PoS: 高速な head 選択 (LMD-GHOST、毎 slot) + 遅い finality (Casper FFG、2 epoch ごと)。13 分は 100 万バリデータの分散化に対するコスト。Tempo クラスの chain は小さな validator set + 即時 finality を選ぶ。"
                    },
                    {
                      "question": "Berachain はなぜ標準 Reth + カスタムバリデータではなく **bera-reth** を必要とするのか?",
                      "options": [
                        "revm ではなく別の EVM 実装を使うため。",
                        "標準 Reth はバリデータには十分だが **コンセンサス固有のコードパス** を欠いている。PoL を認識するブロック検証、流動性報酬の流れ向けのカスタム executor hook、BGT 対応の chainspec、validator set を LP 状態と結合させる precompile が必要になる。",
                        "ライセンス上の理由 — Reth は GPL だから。",
                        "Berachain は別の L1で動いており、bera-reth は L2 専用だから。"
                      ],
                      "correctIndex": 1,
                      "explanation": "PoL がバリデータ経済の関係を根本から変える。Consensus 実装、executor hook、chainspec のすべてがそれを知っている必要がある。vanilla Reth の上に約 2000 行のカスタマイズ。op-stack-on-reth と同じパターン: 最小だがコンセンサスクリティカルなカスタマイズ。"
                    },
                    {
                      "question": "Reth の `Consensus` trait で、どのメソッドが **state root を検証** するか?",
                      "options": [
                        "`validate_header` — state root を含む header の全フィールドをチェックする。",
                        "`validate_body_against_header` — body と header の構造的整合性をチェックする。",
                        "`validate_block_post_execution` — EVM が tx を実行した後に走り、計算済みの post-state root を header の値と比較できる。",
                        "なし — state root は別の prover によって外部で検証される。"
                      ],
                      "correctIndex": 2,
                      "explanation": "State root は実行 *後* にしか存在しない。tx 全部を revm に流し、状態変更を適用し、結果状態を merkle 化して計算する。pre-execution のチェック (header 構造、gas limit の数式) が先に来て、post-execution のチェックに state root の比較が含まれる。"
                    },
                    {
                      "question": "BFT コンセンサスで **3f+1** は何を意味し、なぜそれが tight なのか?",
                      "options": [
                        "ブロックサイズ上限 — 3 tx と 1 coinbase。",
                        "f 個の Byzantine を許容するために必要な最小の総バリデータ数。tight である理由は、2 つの quorum が少なくとも 1 つの正直なバリデータで交わらなければならないから (Lamport 1982 の数学的証明)。",
                        "投票ラウンド数 — 3 フェーズ + 1 commit。",
                        "コンセンサス税率 — stake の 3% + 1% の手数料。"
                      ],
                      "correctIndex": 1,
                      "explanation": "数学的には、n=3f+1 ノードのネットワークでサイズ 2f+1 の 2 quorum は 2(2f+1)-n = f+1 ノードで重なり、少なくとも 1 つは正直。基礎的な quorum 交差の議論。PBFT から HyperBFT まで、すべての BFT システムが 3f+1 を前提にしている。"
                    },
                    {
                      "question": "Reth ベース レッスン1に Malachite を組み込む際、**Malachite の Driver / VoteKeeper / RoundStateMachine の分離** が重要な理由は?",
                      "options": [
                        "プロトコルを非同期にできる。",
                        "明確に分離されているおかげで、**application 側は `Context` trait (ブロック型、validator set、署名方式) を実装するだけ** で済み、プロトコルロジックはすべて Malachite が処理する。Tendermint を書き直すのではなく、配線する。",
                        "コンセンサスのゼロ知識証明を可能にする。",
                        "on-chain コンセンサスのガスコストを下げる。"
                      ],
                      "correctIndex": 1,
                      "explanation": "アーキテクチャ上の価値は API の接合面にある。Reth ベース chain がブロック型と validator set で `Context` を実装し、Malachite の Driver が BFT プロトコルの詳細 (投票ラウンド、view change、タイムアウト、2f+1 検知) を処理する。revm の `Database` trait と同じパターン — コンセンサスにとっての Malachite は、実行にとっての revm に当たる。"
                    }
                  ],
                },
              ],
            },
          },
          {
            title: 'Reth でコンセンサスを作る',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'レッスン7 — NodeBuilder コンセンサススロット（カスタムコンセンサスを配線）',
                  slug: 'consensus-nodebuilder-slot-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 45,
                  content: `# レッスン7 — NodeBuilder コンセンサススロット（カスタムコンセンサスを配線）

## 問い

カスタム \`Consensus\` 実装がある（前モジュールで書いた）。Malachite か自前エンジンが票を駆動する。**この 2 つはどうやって動くノードになるのか？** 答え: NodeBuilder 上で 1 つのビルダー、1 つの実装、1 つのチェーンメソッド呼び出しだけ — カスタム mempool やカスタム EVM を差し込むのと完全に同じ形。

## 原理（最小モデル）

- **ConsensusBuilder は 6 コンポーネントの 1 つ.** pool / network / executor / **consensus** / payload / add_ons の中の 1 スロット。すべて同じビルダーパターン。
- **「票は Reth で検証しない」.** Reth の Consensus trait は **合意後** のブロックを検証する。投票は CL（Malachite / 自作エンジン）側で行われ、Engine API で結果が EL に渡る。
- **EL → CL の境界 = Engine API.** \`engine_newPayload\`（CL → EL: 検証して）/ \`engine_forkchoiceUpdated\`（CL → EL: head はこれ、finalized はこれ）。
- **検証エラーが view change をトリガー.** \`validate_block_pre_execution\` がエラー → Reth が \`PayloadStatus::Invalid\` を返す → CL が別 proposer を選ぶ。検証は **決定論的** でなければならない（split-brain 防止）。

## 具体例

データ経路を 1 枚で:

\`\`\`mermaid
sequenceDiagram
    participant Network as P2P Network
    participant CL as Tempo Consensus<br/>(Malachite)
    participant Driver as Malachite Driver
    participant EL as Reth<br/>(EL, TempoConsensus)

    Network->>CL: バリデータ票 / 提案
    CL->>Driver: Input 処理
    Driver->>Driver: Vote keeper / RSM
    Driver->>CL: Decide(block)
    CL->>EL: engine_newPayloadV4(block)
    EL->>EL: TempoConsensus::validate_block_pre_execution
    EL->>EL: revm 経由で実行
    EL->>EL: TempoConsensus::validate_block_post_execution
    EL->>CL: PayloadStatus(VALID)
    CL->>EL: engine_forkchoiceUpdatedV4(finalized)
    Network->>CL: confirmation をブロードキャスト
\`\`\`

ConsensusBuilder trait:

\`\`\`rust
pub trait ConsensusBuilder<Node: FullNodeTypes>: Send {
    type Consensus: FullConsensus<Node::Primitives>;

    fn build_consensus(
        self,
        ctx: &BuilderContext<Node>,
    ) -> impl Future<Output = eyre::Result<Self::Consensus>> + Send;
}
\`\`\`

カスタム Consensus impl + ビルダー + NodeBuilder 配線:

> 以下は概念スニペット（配線ポイント説明のための抜粋。実行時は不足型・実装を補う）。

\`\`\`rust
use reth_node_builder::{NodeBuilder, NodeHandle};
use reth_chainspec::ChainSpec;

pub struct TempoConsensus {
    validator_set: TempoValidatorSet,
    chain_spec: Arc<ChainSpec>,
}

impl<B: Block> Consensus<B> for TempoConsensus {
    type Error = ConsensusError;

    fn validate_block_pre_execution(&self, block: &SealedBlock<B>) -> Result<(), Self::Error> {
        // Tempo 固有 pre-execution チェック:
        // - proposer が validator set に含まれているか?
        // - 署名は有効か?
        // - round 番号は正しいか?
        todo!()
    }
    // ... 他メソッド
}

pub struct TempoConsensusBuilder {
    validator_set: TempoValidatorSet,
}

impl<Node: FullNodeTypes> ConsensusBuilder<Node> for TempoConsensusBuilder
where
    Node::Primitives: NodePrimitives,
{
    type Consensus = TempoConsensus;

    async fn build_consensus(
        self,
        ctx: &BuilderContext<Node>,
    ) -> eyre::Result<Self::Consensus> {
        Ok(TempoConsensus {
            validator_set: self.validator_set,
            chain_spec: ctx.chain_spec(),
        })
    }
}

async fn main() -> eyre::Result<()> {
    let validator_set = TempoValidatorSet::load_from_chainspec(&chain_spec)?;
    let consensus_builder = TempoConsensusBuilder { validator_set };

    let handle = NodeBuilder::new(config)
        .with_types::<TempoNode>()
        .with_components(
            TempoComponents::default()
                .consensus(consensus_builder)
        )
        .launch()
        .await?;

    handle.wait_for_shutdown().await?;
    Ok(())
}
\`\`\`

CL 側の Engine API 呼び出し:

\`\`\`rust
async fn on_decide(block: TempoBlock, engine_api: EngineApiClient) -> Result<()> {
    let payload_status = engine_api
        .new_payload_v4(block.to_execution_payload())
        .await?;

    if payload_status.status == PayloadStatus::Valid {
        engine_api
            .fork_choice_updated_v4(ForkchoiceState {
                head_block_hash: block.hash(),
                safe_block_hash: block.hash(),
                finalized_block_hash: block.hash(),
            }, None)
            .await?;
    }
    Ok(())
}
\`\`\`

## 失敗例（誤解）

「2f+1 quorum チェックは \`TempoConsensus\` に入る」— **間違い**。Reth の Consensus trait は *ブロック* を検証するもので、票を検証するものではない。投票は **consensus client**（Malachite / CometBFT / 自作）側で起こる。Reth の Consensus trait は合意 *後* のブロックを検証する。

「検証エラーが返ったら chain が止まる」— **間違い**。検証エラー → Reth が \`PayloadStatus::Invalid\` → CL に「無効」と伝える → CL は view change で別 proposer を選ぶ。**検証エラーが liveness 回復をトリガーする**。

> 🛑 **予測。** Reth の NodeBuilder にカスタムコンセンサスを配線する。ビルダーに渡すべき 4 つは何か？ ヒント: trait 実装、validator set、署名方式、もう 1 つ。（答え: ① Consensus trait の実装、② validator set、③ 署名方式の選択 / 公開鍵、④ chain spec（fork heights、genesis、precompile アドレス）。これらが ConsensusBuilder のフィールド + BuilderContext から組み立てられる。）

## ステップで組み立てる

### Step 1: 6 コンポーネントスロットを言える

pool / network / executor / consensus / payload / add_ons。

### Step 2: ConsensusBuilder の 1 メソッドを覚える

\`build_consensus(self, ctx) -> Consensus\` — それだけ。BuilderContext から chain spec、db、network、precompile などを取り出して Consensus 実装に渡す。

### Step 3: EL ↔ CL の境界

| 場所 | 責務 |
| :--- | :--- |
| CL（Malachite）| 投票、quorum 検知、view change、リーダー選出 |
| EL（Reth + Consensus impl） | ブロック検証、EVM 実行、state 永続化 |
| Engine API | 両者を繋ぐ JSON-RPC（newPayload / forkchoiceUpdated / getPayload） |

### Step 4: 検証の決定論性を保つ

\`Consensus\` 実装はホットパスで走る + **決定論的でなければならない**:

- ブロックごとミリ秒単位
- アロケーションは慎重に（ヒープを荒らさない）
- Validator set 参照はキャッシュ
- バリデータごとの素朴な ECDSA ではなく BLS や閾値署名で検証
- 入力が同じなら出力が同じ（毎回同じ答え）

### Step 5: スケッチ

実装スケッチ（コンパイル不要）:

1. \`TempoValidatorSet\` — 必要フィールドは？（アドレス / 投票ウェイト / BLS 公開鍵）
2. \`TempoConsensus::validate_header\` — 必須チェック 3 つは？
3. 起動シーケンス — \`TempoNode\` は chainspec からどう validator set をロードするか？

## 答え合わせ

- **2f+1 quorum 検知の場所**: consensus client（Malachite / CometBFT / 自作）。Reth は **合意後** のブロックを検証する。
- **検証エラーで起きること**: \`PayloadStatus::Invalid\` を返す → CL に伝わる → CL が view change → 別 proposer。**view change が liveness 回復**。
- **検証決定論性が重要な理由**: 非決定論的だと別バリデータと意見が分かれて split-brain 発生 = safety 違反。「キャッシュ参照 / BLS 検証 / 慎重アロケーション」全部この前提のため。

## 合格基準

- 6 コンポーネントスロットを即答できる。
- ConsensusBuilder の 1 メソッド名（\`build_consensus\`）を言える。
- 「票は CL、ブロック検証は EL」を境界として言える。
- 検証エラー → view change の連鎖を辿れる。

## まとめ（3行）

- ConsensusBuilder は NodeBuilder の 6 スロットの 1 つ、他コンポーネントと同形（pool / network / executor / payload / add_ons の仲間）。
- 票は CL（Malachite）で検知、ブロック検証は EL（Reth + Consensus impl）。Engine API（newPayload / forkchoiceUpdated）が両者を繋ぐ。
- 検証は **決定論的** でなければならない（同入力で同出力）— split-brain を防ぐコア前提。
`,
                },
                {
                  title: 'レッスン8 — 最小の単一リーダー BFT を Rust で作る',
                  slug: 'consensus-minimal-bft-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 20,
                  xpReward: 50,
                  content: `# レッスン8 — 最小の単一リーダー BFT を Rust で作る

## 問い

OP Stack のドキュメントを開く。Arbitrum のドキュメントを開く。Hyperliquid の launch 時のブログを開く。どれも「sequencer を時間をかけて分散化する」のバリエーションを言っている。翻訳すれば: **launch 時には、毎ブロックを生成する 1 台のマシンがあり、特定の鍵による署名だけが唯一のコンセンサス**。それだけ。**これは Reth の上に Rust 約 100 行で出荷できる。** その約 100 行は何か？

## 原理（最小モデル）

- **単一 sequencer = launch 時のコンセンサス.** 全ブロックの proposer 役を独占 + 署名 + 緊急停止権限。Liveness は単一障害点だが view change 不要。速度 = 1 RTT。
- **3 つの仕事.** 構築（tx 順序 + timestamp）+ 署名（ECDSA で authority 証明）+ ブロードキャスト（Engine API → Reth EL + P2P）。
- **検証は「sequencer 署名か？」の 3 行.** ECDSA 復元 → expected と比較 → 違えば拒否。あとは標準 Ethereum 検証。
- **段階的分散化が標準パターン.** 単一 → 2-of-3 multisig → リーダーローテーション → 本物の BFT（Tendermint / HotStuff）。

## 具体例

CentralizedSequencer 実装（~100 行）:

> 以下は概念スニペット（流れを示すための抜粋。実行時は不足型・実装を補う）。

\`\`\`rust
use alloy_primitives::{Address, B256};
use alloy_signer::Signer;
use alloy_signer_local::PrivateKeySigner;
use reth_engine_primitives::ForkchoiceState;
use reth_rpc_engine_api::EngineApiClient;

pub struct CentralizedSequencer {
    signer: PrivateKeySigner,
    sequencer_address: Address,
    engine_api: EngineApiClient,
    block_period: Duration,  // e.g., 2 秒
}

impl CentralizedSequencer {
    pub async fn run(&self) -> eyre::Result<()> {
        let mut ticker = tokio::time::interval(self.block_period);
        loop {
            ticker.tick().await;
            self.produce_one_block().await?;
        }
    }

    async fn produce_one_block(&self) -> eyre::Result<()> {
        // 1. 現 head 上に payload を構築するよう Reth に依頼
        let payload_attrs = PayloadAttributes {
            timestamp: now_seconds(),
            prev_randao: B256::random(),
            suggested_fee_recipient: self.sequencer_address,
            // ...
        };

        let forkchoice_state = self.current_forkchoice().await?;
        let response = self.engine_api
            .fork_choice_updated_v4(forkchoice_state, Some(payload_attrs))
            .await?;
        let payload_id = response.payload_id.expect("must have payload id");

        // 2. Reth が payload を構築する時間を少し待つ
        tokio::time::sleep(Duration::from_millis(500)).await;

        // 3. 構築済みの payload を取得
        let payload = self.engine_api.get_payload_v4(payload_id).await?;

        // 4. Payload hash に署名する (authority の証明)
        let payload_hash = payload.execution_payload.block_hash();
        let signature = self.signer.sign_hash(&payload_hash).await?;

        // 5. 署名済 payload を Reth に投入 (peer にもブロードキャスト)
        let signed_block = SignedPayload {
            payload: payload.execution_payload,
            sequencer_signature: signature,
        };

        self.engine_api
            .new_payload_v4(signed_block.payload.clone())
            .await?;

        // 6. Finalize マーク (単一 sequencer = 即時 finality)
        let new_head = signed_block.payload.block_hash();
        let new_forkchoice = ForkchoiceState {
            head_block_hash: new_head,
            safe_block_hash: new_head,
            finalized_block_hash: new_head,
        };
        self.engine_api
            .fork_choice_updated_v4(new_forkchoice, None)
            .await?;

        // 7. peer にブロードキャスト
        self.broadcast(signed_block).await?;

        Ok(())
    }
}
\`\`\`

検証側（カスタム Consensus 実装、3 行のみ）:

\`\`\`rust
impl<B: Block> Consensus<B> for CentralizedConsensus {
    fn validate_block_pre_execution(
        &self,
        block: &SealedBlock<B>,
    ) -> Result<(), ConsensusError> {
        // 唯一の「コンセンサス」チェック: sequencer の署名か?
        let signature = block.sequencer_signature()?;
        let signer = signature.recover_address(&block.hash())?;

        if signer != self.expected_sequencer {
            return Err(ConsensusError::InvalidSequencer);
        }

        // 標準的な Ethereum 系のチェック
        self.validate_basic_block(block)?;

        Ok(())
    }
}
\`\`\`

2-of-3 multisig への進化:

\`\`\`rust
pub struct MultisigSequencer {
    signers: Vec<PrivateKeySigner>,
    threshold: usize,                 // = 2
    engine_api: EngineApiClient,
}

impl MultisigSequencer {
    async fn produce_block(&self) -> eyre::Result<SignedPayload> {
        let payload = self.build_payload().await?;

        let mut signatures = Vec::new();
        for signer in &self.signers {
            if let Some(sig) = self.try_sign(signer, &payload).await {
                signatures.push(sig);
                if signatures.len() >= self.threshold {
                    break;
                }
            }
        }

        if signatures.len() < self.threshold {
            return Err(eyre!("not enough signers available"));
        }

        Ok(SignedPayload {
            payload: payload.execution_payload,
            sequencer_signatures: signatures,
        })
    }
}
\`\`\`

L1 launch のシーケンス:

| ステージ | コンセンサス | 分散化の度合い | TVL safety |
| :--- | :--- | :--- | :--- |
| Day 0 | 単一 sequencer | なし | チームを信頼 |
| Month 3 | 2-of-3 multisig | 3 オペレータ | 2-of-3 セットを信頼 |
| Month 12 | ローテーション proposer | ~10 バリデータ | 1 つでも生きていれば liveness |
| Year 2 | 本物の BFT（Tendermint/HotStuff） | 30 以上のバリデータ | 2/3+ Byzantine 耐性 |

## 失敗例（誤解）

「これはコンセンサスではない、ただの信頼権威」— **部分的に正しい**。これも *コンセンサス* ではある — 1 つの決定（次のブロック）への合意。**意思決定者が 1 人** いるだけ。トレードオフは **信頼仮定**（sequencer 1 人が正直）を **liveness**（view change 不要）と引き換えに。launch 時点なら許容できる仮定。

「最初から本物 BFT を入れるべき」— **間違い**。Slashing ロジックのバグは壊滅的 + 検証に時間がかかる。**よくあるパターン = 有効化するが上限を低く設定して launch**、信頼が積み上がるにつれて上限を上げる。

> 🛑 **予測。** Hyperliquid、Tempo、すべての OP Stack chain、Arbitrum — launch 時にすべてが走らせているコンセンサスは何か？ HotStuff ではない。Tendermint でもない。（ヒント: そのどちらよりも単純。）（答え: 単一 sequencer。1 つの鍵が全ブロックに署名、view change なし、quorum なし、validator set なし。100 行の Rust で実装可能。）

## ステップで組み立てる

### Step 1: 3 つの仕事を言える

構築 + 署名 + ブロードキャスト。

### Step 2: \`produce_one_block\` の 7 ステップ

1. forkchoice_updated で payload 構築リクエスト
2. 500ms 待つ
3. get_payload で取得
4. payload_hash に署名
5. new_payload で Reth に投入
6. forkchoice_updated で finalize マーク
7. P2P ブロードキャスト

### Step 3: 検証の 3 行を覚える

\`\`\`rust
let signer = signature.recover_address(&block.hash())?;
if signer != self.expected_sequencer { return Err(...); }
self.validate_basic_block(block)?;
\`\`\`

### Step 4: 段階的分散化を辿れる

Day 0（単一）→ Month 3（2-of-3）→ Month 12（ローテーション + slot 適格性）→ Year 2（本物の BFT、Malachite で）。

### Step 5: スケッチ

実装スケッチ（コンパイル不要）:

1. \`SignedPayload\` struct（sequencer 署名付きカスタムブロックエンベロープ）
2. \`CentralizedConsensus::validate_block_pre_execution\`（ECDSA 復元と比較を完備）
3. \`current_forkchoice\` のスケッチ（現 head をローカルでどう追跡？）
4. Mempool の置き場所（ヒント: sequencer ではない、別コンポーネント）

## 答え合わせ

- **「単一リーダーコンセンサス」がコンセンサスと呼べる理由**: 1 つの値（次のブロック）への合意がコンセンサスの定義。意思決定者が 1 人なら値はその意思決定者の言う通りになる。
- **信頼仮定 → liveness の交換**: launch 時には許容できる。低 TVL + ロードマップ上の項目 + 速く出荷できる、で正当化される。
- **2-of-3 multisig が現実的な launch パターン**: Optimism / Arbitrum / Base はこの形で launch、鍵はチーム + 監査人 + ノードオペレータ。HA 向上 + 1 鍵ダウンでも継続。

## 合格基準

- \`produce_one_block\` の 7 ステップを順に言える。
- カスタム Consensus の 3 行検証を書ける。
- 段階的分散化 4 ステージを辿れる。
- 「launch 時の信頼仮定は liveness の代償」を 1 文で説明できる。

## まとめ（3行）

- 単一 sequencer = Reth + ~100 行の Rust + 3 行の Consensus 検証で出荷できる「コンセンサス」。
- Day 0（単一）→ Month 3（2-of-3）→ Month 12（ローテーション）→ Year 2（本物の BFT）が L1 分散化の標準シーケンス。
- 速く出荷して段階的に分散化する — それが Hyperliquid / Optimism / Arbitrum がやった道。
`,
                },
                {
                  title: 'レッスン9 — バリデータ経済（slashing、報酬、攻撃ベクター）',
                  slug: 'consensus-validator-economics-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 17,
                  xpReward: 45,
                  content: `# レッスン9 — バリデータ経済（slashing、報酬、攻撃ベクター）

## 問い

暗号だけでは PoS chain を守れない。バリデータが double-sign したことを *証明* することはできる — だが、バリデータがそれに対して何の代償も払わないなら、その証明は無価値だ。**不正のコストが不正によって引き出せる現金を上回って初めてプロトコルは安全になる**。これがなければ、優雅な 3f+1 quorum の数学は「double-sign しないでください、お願いします」へと崩れ落ちる。

## 原理（最小モデル）

- **セキュリティ条件 = 必要 stake > 抽出可能価値.** 攻撃コスト > 攻撃利益。Ethereum 例: 約 330 億ドルの stake 必要 + slashing で全額焼失 → 経済的に非合理。
- **2 違反 = double-signing + surround voting.** どちらも **暗号的に証明可能**（署名 2 つあれば proof）。oracle 不要、パーミッションレス検出。
- **相関 slashing.** 同じ window 内で何人が slash されたかに比例して罰則を上げる。1 人だけなら 1 ETH、33% 協調攻撃なら full stake = 壊滅的。
- **Inactivity leak が 1/3+ 攻撃を救う.** stake の 35% が投票拒否 → finality 停止 + ~13 日後に非参加 stake が徐々に焼かれる → 参加 stake が 2/3+ に戻る → finality 再開。

## 具体例

Double-signing（equivocation）:

\`\`\`
バリデータ V が Vote(block_A, round_5) に署名
バリデータ V が Vote(block_B, round_5) に署名
\`\`\`

両方とも同じラウンドで V によって署名。**暗号的に証明可能** — 2 つの署名を持つ者なら誰でも slashing proof を構築できる。

Surround voting:

\`\`\`
バリデータ V が Vote(source: epoch_3, target: epoch_5) に署名
バリデータ V が Vote(source: epoch_4, target: epoch_6) に署名
\`\`\`

2 つ目の票が 1 つ目を **surround している**（より後ろの source、より後ろの target）。Casper FFG では特に safety 違反。

Slashing proof 提出フロー:

\`\`\`mermaid
sequenceDiagram
    participant Watcher as Slashing Watcher
    participant Chain as Reth EL
    participant State as State

    Watcher->>Watcher: V からの 2 つの署名済み票を観測
    Watcher->>Watcher: 両方の署名を検証
    Watcher->>Chain: SlashTransaction(vote_a, vote_b)
    Chain->>State: on-chain で proof を検証
    State->>State: V の stake を slash
    State->>Watcher: 内部告発者報酬を支払う (小さな割合)
\`\`\`

相関 slashing 公式:

\`\`\`
slash_amount = (slashed_stake / total_stake) * stake * multiplier
\`\`\`

\`slashed_stake\` は直近 window 内で slash された全バリデータの stake。1 バリデータ単独 → 罰則小。バリデータの 33% が同時に slash → **壊滅的**（全 stake）。

攻撃ベクター:

| 攻撃 | 効果 | 防御 |
| :--- | :--- | :--- |
| Double-sign | 同じ高さで 2 ブロックに署名し fork choice を混乱 | Slashing |
| Surround vote | 矛盾する 2 つの checkpoint を finalize に投票 | Slashing |
| Long-range attack | 古い期間のバリデータを買収して履歴を書き換え | 弱い主観性（クライアントは最近の状態を信頼） |
| 2/3 finality attack | stake の 2/3+ を握り全部で署名 | ETH 換算で >330 億ドル、不可能 |
| Liveness attack | stake の 1/3+ で投票拒否 | chain 停止、safety は維持 |

## 失敗例（誤解）

「Slashing は懲罰」— **間違い**。Slashing は **経済的セキュリティ**。攻撃者は stake を取得（数百万 ETH）→ それを失う必要 → 攻撃コスト > 抽出可能価値 → 経済的に非合理。Stake がセキュリティの担保。

「Long-range attack は slashing で防げる」— **間違い**。古いバリデータは引退済み = stake はすでに取り戻せる場所にある。Slashing で防げない。代わりに **弱い主観性**（new client は信頼できる checkpoint から同期、古い chain は無視）で防ぐ。

> 🛑 **予測。** Ethereum mainnet には約 500 億ドル以上がステークされている。finality に対する 2/3 攻撃を試みる際の、ドル単位のコストは？（答え: stake の 2/3+ が必要 = ~330 億ドル分の ETH を取得。slashing で **最大で全損級の損失** が発生しうる（条件依存）。これが PoS のセキュリティ議論。経済的に非合理 → 攻撃者が存在しにくい。）

## ステップで組み立てる

### Step 1: セキュリティ条件を 1 行で

**必要 stake > 抽出可能価値**。

### Step 2: 2 違反 + slashing 公式

- Double-sign: 同 epoch で 2 checkpoint に署名
- Surround vote: 1 つ目を「囲む」票を 2 つ目に署名

\`slash = (slashed/total) × stake × multiplier\` の相関設計が協調攻撃を経済的に潰す。

### Step 3: 3 つの提出条件

1. **検出はパーミッションレス** — 監視している人なら誰でも proof 提出可能
2. **検証は暗号的** — chain が 2 つの署名を検証、oracle 不要
3. **報酬は小さい** — 監視のインセンティブには十分だが、虚偽報告を誘発するほどは大きくない

### Step 4: 5 攻撃ベクターと防御

double-sign / surround → slashing
long-range → 弱い主観性
51% finality → 経済コスト >330 億ドル
liveness（1/3+） → inactivity leak で復元

### Step 5: 自分の L1 向け slashing 設計

| 設計パラメータ | 考慮 |
| :--- | :--- |
| Validator set サイズ | 小さいほど協調容易 → より厳しい slashing |
| Slash 額 | 理論的最大抽出可能価値を上回るべき |
| 内部告発者報酬 | 1-5% が標準 |
| Inactivity 罰則 | 検閲耐性が欲しいなら必要 |

### Step 6: 計算演習

仮想 L1:
- Validator set: 50
- Stake/バリデータ: 1000 万ドル
- 総 stake: 5 億ドル
- 最大抽出可能価値: 2 億ドル

**必要 slash 割合**: ? （抽出可能価値を上回る必要 → 50% 以上の stake を slash する設計が必要）。

抽出可能価値が 4 億ドル（大規模取引決済）に急騰したら？ → 単一攻撃で stake の 80% を要求する必要 = 設計を見直す（より厳しい slashing or より大きな validator stake 要求）。

## 答え合わせ

- **35% liveness attack の結末**: Ethereum は finalization 停止 + LMD-GHOST は動き続ける（tip 生成） + ~13 日後 **inactivity leak** で非参加 stake が徐々に焼かれる + 参加 stake が 2/3+ に戻ったら finality 再開。1/3+ 攻撃でも **一時停止に留まる**、永続破壊ではない。
- **Surround vote の構造的違い**: 2 つ目の票が 1 つ目を時間的に包含 = fork なしで両方有効にできない。連続する epoch の通常投票は包含関係がない（独立）→ slash 不可。
- **slashing が経済的基盤である理由**: 暗号証明だけでは攻撃を止められない、コストを上げて初めて止まる。攻撃コスト > 利益 = 経済合理的攻撃者は存在しない。

## 合格基準

- セキュリティ条件「必要 stake > 抽出可能価値」を即答できる。
- 2 違反（double-sign / surround vote）の図を書ける。
- 相関 slashing 公式が協調攻撃を潰す理由を 1 文で言える。
- 5 攻撃ベクター（double / surround / long-range / 51% / liveness）と防御を表で言える。
- 仮想 L1 の必要 slash 割合を計算できる。

## まとめ（3行）

- セキュリティ条件 = 必要 stake > 抽出可能価値。暗号だけでは不十分、経済層が荷重を担う。
- 2 違反（double-sign / surround vote）は暗号的に検出可能 + 相関 slashing で協調攻撃を経済的に潰す。
- 1/3+ liveness attack は inactivity leak で復元、51% finality attack は経済コストで阻止 — 設計の美しさが両方を救う。
`,
                },
                {
                  title: 'ファイナルクイズ — L1 コンセンサスを作る',
                  slug: 'consensus-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 50,
                  content: `# ファイナルクイズ — L1 コンセンサスを作る

最終的なコンセンサスのチェック。Tempo クラスの L1 chain を出荷するために必要。

レッスン7（NodeBuilder 配線）/ レッスン8（単一リーダー BFT）/ レッスン9（バリデータ経済）の総合確認。
`,
                  quizQuestions: [
                    {
                      "question": "新規の決済特化 L1 (Tempo クラス) のコンセンサスを設計しているとする。バリデータ数: 30。Finality 目標: サブ秒。**どのコンセンサス系統** を選び、**その理由は**?",
                      "options": [
                        "Nakamoto PoW — 実戦検証済みで分散化されている。",
                        "Ethereum 系のハイブリッド PoS — ベストプラクティスで、大規模 validator にも対応する。",
                        "純粋 BFT 系 (Tendermint または HotStuff) — 30 バリデータは sweet spot、BFT が即時 finality を与え、決済ユースケースは決定論的な決済を求めるため。",
                        "単一 sequencer — 最速、最もシンプル。"
                      ],
                      "correctIndex": 2,
                      "explanation": "ハイブリッド PoS (選択肢 2) は 30 バリデータには過剰 — 直接 BFT が使えて finality gadget は不要。PoW (選択肢 1) は finality を犠牲にする。単一 sequencer (選択肢 4) は launch 時には機能するが「コンセンサス設計」ではない。30 バリデータでの純粋 BFT は教科書通りの選択 — Hyperliquid は約 20 でこれを採用、Tempo も類似のはず。"
                    },
                    {
                      "question": "Reth の `Consensus` trait の **目的** と、明示的に行わないことは?",
                      "options": [
                        "投票プロトコルを走らせる — Reth は内部に BFT を持っている。",
                        "ブロックを chain ルールに照らして検証する (pre-execution の構造、post-execution の state root、gas の数式)。Head 選択 / fork choice は行わない — それは consensus client の仕事 (Ethereum なら Lighthouse、Tendermint chain なら Malachite、自前 L1 ならカスタム)。",
                        "バリデータの代理でブロックに署名する。",
                        "Validator set を管理する。"
                      ],
                      "correctIndex": 1,
                      "explanation": "EL/CL の分離: Reth (EL) はブロックを検証する。CL はどのブロックの上に積むかを決め (fork choice)、投票を走らせる。標準 Ethereum (Reth + Lighthouse) でもカスタム L1 (Consensus 実装 + Malachite/CometBFT 等) でも同じ分離になる。"
                    },
                    {
                      "question": "中央集権 sequencer の レッスン1をできるだけ速く出荷したい。Sequencer コードがブロックごとに行う 3 つは?",
                      "options": [
                        "2f+1 の票を集め、その後で署名し、その後でブロードキャストする。",
                        "Payload を構築し (tx 選択 + 順序付け)、得られたブロック hash に署名し (authority の証明)、Engine API 経由で Reth に、P2P 経由で他ノードにブロードキャストする。",
                        "バリデータ票を待ち、署名を集約し、その後 commit する。",
                        "価格 oracle に問い合わせ、margin を決済し、その後ブロックを作る。"
                      ],
                      "correctIndex": 1,
                      "explanation": "単一リーダー BFT = 投票なし。3 つの仕事 — 構築 (Engine API forkchoiceUpdated + PayloadAttributes 経由)、署名 (ブロック hash を ECDSA 署名者に渡す)、ブロードキャスト (Engine API + P2P)。Lesson 10 §3 の Rust 約 100 行。"
                    },
                    {
                      "question": "Tendermint/HotStuff では validator set が有界 (約 20〜100)。**この上限を決めている構造的な制約** は何か?",
                      "options": [
                        "ディスク容量 — 各バリデータが chain の状態を保存するため。",
                        "通信複雑度: PBFT はブロックあたり O(n²) メッセージ、閾値署名付きの HotStuff でもラウンドあたり O(n)。ネットワーク帯域とレイテンシによって、実用上 n は約 100〜200 が上限になる。",
                        "トークン供給 — バリデータを増やすためのトークンが足りない。",
                        "法的制約 — 1 つのプロトコルに 100 を超えるエンティティは関われない。"
                      ],
                      "correctIndex": 1,
                      "explanation": "ネットワークがボトルネックになる。PBFT の n² メッセージは、n = 100 で 1 万、n = 1,000 で 100 万メッセージ。HotStuff の O(n) で楽にはなるが、帯域とレイテンシのせいで実用上の最大値は依然上限がある。Ethereum 系のハイブリッド PoS は、fork choice (毎 slot、サンプリングベース) と finality (毎 epoch、フル参加) を分けることでこれを解決している。"
                    },
                    {
                      "question": "なぜ **slashing** が BFT の経済的セキュリティの荷重を担う基盤になるのか?",
                      "options": [
                        "Slashing がインフラを走らせるバリデータに報酬を支払うから。",
                        "不正行為のコスト (失う stake) が攻撃の利益 (抽出可能価値) を上回るため、攻撃が経済的に非合理になるから。Slashing がなければ、バリデータはコストなしで矛盾するメッセージに投票でき、プロトコルの safety 保証は蒸発する。",
                        "Slashing がブロック生成を速くするから。",
                        "Slashing は EVM の機能であり、コンセンサスではないから。"
                      ],
                      "correctIndex": 1,
                      "explanation": "暗号が不正を証明し、slashing がそれをコストの高い行為に変える。Slashing がなければ、Byzantine バリデータは無コストで double-sign でき、プロトコルの 3f+1 という境界は無意味になる。Slashing が「double-sign すべきでない」を「double-sign を経済的に賄えない」に変える。"
                    },
                    {
                      "question": "Malachite は Driver / VoteKeeper / RoundStateMachine を分離している。**Reth ベース レッスン1に Malachite を組み込むときに何ができるようになるか**?",
                      "options": [
                        "Reth と異なるマシンで Malachite を動かせる。",
                        "`Context` trait (ブロック型、validator set、署名方式) を実装するだけでよくなる — Malachite が Tendermint プロトコルのロジック (投票、quorum、view change、タイムアウト) をすべて処理する。Tendermint を書き直すのではなく、配線する。これは revm の `Database` trait と同じパターン: 基盤側を自分が提供し、エンジンがプロトコルを処理する。",
                        "Rust のコードを書かずに Malachite を使える。",
                        "2f+1 の quorum チェックをスキップできる。"
                      ],
                      "correctIndex": 1,
                      "explanation": "Malachite がプロトコルを提供し、自分の `Context` 実装が chain 固有の型を提供する。完全な BFT で守られた L1 への統合コードは約 100 行 — Tendermint を自分で書いたら約 1 万行になることと比べると桁違い。これが「Rust BFT エンジンを使う」のアーキテクチャ的な勝ち筋。"
                    },
                    {
                      "question": "Berachain はカスタマイズ済みの Reth ディストリビューション **bera-reth** を出荷している。**vanilla Reth に対して実際に変更しているのは何 % か?**",
                      "options": [
                        "約 95% — Proof-of-Liquidity はまったく別の chain だから。",
                        "約 10% — Reth の大半はそのまま再利用される。カスタマイズは約 2000 行で、カスタム Consensus 実装、流動性報酬用のカスタム executor hook、カスタム chainspec、BLS 対応の validator set 追跡が含まれる。",
                        "約 50% — Reth の EVM を PoL 用に書き直す必要があるから。",
                        "0% — bera-reth はただの config ファイルだから。"
                      ],
                      "correctIndex": 1,
                      "explanation": "Expert Module 3 の見出しの通り、Reth ベース chain は *拡張* で作られるのであって fork ではない。bera-reth の vanilla Reth に対する差分は小さいがコンセンサスクリティカル。公開されている `tempoxyz/tempo` も同じパターン (彼らの `tempoxyz/reth` は upstream に対して 0 commits ahead)。"
                    },
                    {
                      "question": "レッスン1を launch する。Day 0 のコンセンサス: 単一 sequencer。**最初の 2 年における現実的な分散化の軌跡** は?",
                      "options": [
                        "無期限に単一 sequencer のまま。",
                        "単一 sequencer (Day 0) → 2-of-3 multisig sequencer (Month 3) → 約 10 バリデータでのローテーション proposer (Month 12) → 30+ バリデータと slashing による完全 BFT (Year 2)。各ステップで liveness を保ちつつ、段階的に Byzantine 耐性を加えていく。",
                        "Day 1 でいきなり 1000 バリデータの PoS に飛ぶ。",
                        "分散化はマーケティング上の関心事であって技術の話ではない。"
                      ],
                      "correctIndex": 1,
                      "explanation": "実 L1 はこの軌跡をたどる。信頼を担保にして速く出荷し、TVL と運用が成熟するにつれて段階的に信頼仮定を緩める。Hyperliquid、Tempo、すべての OP-Stack chain — 全部このバージョンだ。プロトコル設計上、その場での upgrade は可能だが、コンセンサス設計は最初から軌跡を受け入れる形にしておかなければならない (例えば、header フォーマットには、1 署名者から始まる場合でも「validator set 証明」を含めるべき)。"
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
