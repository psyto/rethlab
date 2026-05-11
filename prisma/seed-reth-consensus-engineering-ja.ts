import { PrismaClient } from '@prisma/client';

export async function seedRethConsensusEngineeringJA(prisma: PrismaClient) {
  const tags = ['reth', 'consensus', 'bft', 'pos', 'hotstuff', 'hyperbft', 'l1', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-consensus-engineering-ja',
      title: 'Consensus Engineering — Reth で L1 のコンセンサスを作る',
      description:
        '「reth を読める」から「L1 を出荷できる」までの最大のギャップを埋めるコース。コンセンサス理論を一から (BFT、safety/liveness、FLP)、Rust 製コンセンサスエンジンの実コード (reth の Consensus trait、Malachite、bera-reth の Proof-of-Liquidity) を読み、Reth ベース chain にカスタムコンセンサスを配線する。HyperBFT を読んで Tempo クラスの L1 を出荷する準備ができる。',
      difficulty: 'ADVANCED',
      duration: 220,
      xpReward: 650,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 300,
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
                  title: 'BFT 問題をゼロから',
                  slug: 'consensus-bft-problem-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 40,
                  content: `# BFT 問題をゼロから

コンセンサスを 1 行も書く前に、**そもそも何を解決しようとしているのか** を理解する必要があります。多くのエンジニアがこれをスキップして、Byzantine バグを 3am にメンタルモデル無しでデバッグする羽目になる。本レッスンで土台を作ります: 故障モード、safety/liveness の分割、なぜ FLP が「完璧な」コンセンサスを不可能にするか。

> 🛑 **スクロール前に予測。** 3 ノード A、B、C が単一の値に合意しなければならない。**何が間違いうるか?** 4 つの異なる故障モードを列挙。(ヒント: 「ネットワークが遅い」だけではない。)

## 1. 問題定義

複数ノード、1 つの決定。全員が決めなければならない:

- **同じ値** — A が「yes」、B が「no」と決めたらシステムは split-brain
- **提案された値** — 誰も「42」について聞いていないのに、勝手に「42」で合意できない
- **いつかは** — 「気が向いたら」ではなく、ある時点で

この 3 つは順に **safety**、**validity**、**liveness**。これらは無料ではない。コンセンサス研究の全分野は、どのトレードオフが許容可能かを決めることに費やされている。

## 2. 想定すべき故障モード

| 故障 | 意味 | 例 |
| :--- | :--- | :--- |
| **Crash** | ノードが応答停止する。それだけ。 | バリデータマシンの電源リセット |
| **Omission** | ノードが選択的にメッセージを落とす | パケットロス、意図的検閲 |
| **Network partition** | ノードの一部が他のノード集合に到達できない | 海底ケーブル切断、AWS リージョン障害 |
| **Byzantine** | ノードが嘘をつく。矛盾するメッセージを送る。A と ¬A の両方に署名する | バリデータ鍵の侵害、バグ |

古典文献ではすべてを「fault」と呼びます。**Byzantine** ケースが最も難しい — 故障ノードが **積極的に敵対的** だから。Crash + omission は相対的に楽。

> 🛑 **予測。** 4 ノードがある。1 つが Byzantine。**コンセンサスを保ちつつ許容できる Byzantine の最大数 f は?** (下に答えがあるが、まず予測してください。有名な結果です。)

答えは **f < n/3**。4 ノードで 1 Byzantine。7 ノードで 2 Byzantine。**f 個の Byzantine を許容するには常に 3f+1 ノード必要**。これは数学的に厳密な結果で、設計選択ではない。Lamport、Pease、Shostak が 1982 年に証明済み。

## 3. Safety vs liveness

コンセンサスプロトコルが約束する 2 つの性質:

- **Safety**: 「絶対に意見が割れない」。A が x を決め、B が y を決めたら、x = y。**正しさ** のこと。
- **Liveness**: 「いつかは決定する」。有限時間内に valid な決定がなされる。**進捗** のこと。

**非同期ネットワークかつ Byzantine 故障下で、両方を無条件に持つことはできない**。これが FLP 不可能性定理 (1985) の核心です。

各プロトコルが選ぶ妥協:

| プロトコル系統 | 分断時に犠牲にするもの |
| :--- | :--- |
| **古典 BFT** (Tendermint、HotStuff、HyperBFT) | **Liveness**: 分断中は停止、絶対に分岐しない |
| **Nakamoto** (Bitcoin、ETH 1.0 PoW) | **Safety**: 生成を続ける、一時的に分岐しうる |
| **Ethereum PoS** (Casper FFG + LMD-GHOST) | **ハイブリッド**: tip は liveness、古いブロックは finality |

safety、liveness、fault tolerance、同期仮定なし — この 4 つすべてを得るプロトコルは存在しない。**いずれか 1 つを犠牲にする必要がある**。

> 🛑 **理解度チェック。** Bitcoin は「絶対に停止しない」。Bitcoin は「BFT である」。**両方とも技術的には間違い** だが、間違い方が違う。**Bitcoin が実際に犠牲にしているのはどの性質で、いつか?** 「何も、Bitcoin は最高」と答えたなら、§2 に戻る。

## 4. FLP 不可能性 — 創始的結果

**Fischer、Lynch、Paterson (1985)**: 完全非同期ネットワークで少なくとも 1 つの crash 故障があるとき、**どんな決定論的プロトコルもすべての実行で safety と liveness の両方を保証することはできない**。

この結果について 3 点注意:

1. **非同期** — メッセージ遅延に上限なし。現実のネットワークは完全非同期ではない; 時には eventually-bounded delay を仮定できる。
2. **1 crash** — Byzantine ですらない。crash-only 故障でも FLP は適用される。
3. **決定論的** — ランダム化プロトコルは FLP を確率的に回避できる。

実プロトコルが FLP を抜け出す方法:

- **タイムアウト** (同期仮定): メッセージが T 秒以内に届かなければ送信者は crash したと仮定。これで同期的フォールバックを持つ。
- **ランダム性** (確率的 finality): Bitcoin の proof-of-work はランダム性でリーダーを選出; finality は確率的、絶対ではない。
- **View change** (一時的に liveness を諦める): BFT プロトコルはリーダー故障時に進捗を一時停止、その後再開。

すべての実プロトコルは少なくとも 1 つの脱出経路を使う。

> 🛑 **予測。** Tendermint はタイムアウトと view change を使う。Bitcoin はランダム性を使う。Ethereum PoS は **両方**。**なぜ両方? 各々が他方にできないことを Ethereum に何を与える?**

## 5. 3f+1 ルール、直感的に

なぜ正確に **3f+1** か? 3 方向の直感:

投票を求めるとします。**f ノードは嘘をつくかもしれない**。次のような quorum が必要:

- f Byzantine が quorum 内で過半数を形成できない大きさ
- 2 つの quorum が **少なくとも 1 つの正直なノード** で交わる (そうでなければ x と ¬x の両方を決定可能)

quorum サイズを q、ノード総数を n とすると:

- 2 quorum は **2q - n** ノードで重なる
- 重なりは少なくとも 1 つの正直なノードを含む: **2q - n > f**
- 重なりの正直なノード (q - f) が Byzantine を上回らねばならない: **q - f > f**、よって q > 2f、よって q ≥ 2f+1
- 代入すると: **2(2f+1) - n > f**、よって **n > 3f**、よって **n ≥ 3f+1**

これがあらゆる BFT システムの裏にある代数。**Cometbft、HotStuff、HyperBFT、Casper FFG** — すべて 3f+1 を仮定し、下回ると壊れる。

> 🛑 **理解度チェック。** Ethereum には ~100 万のバリデータがいる。**f は何? このスケールで「Byzantine」とは何を意味する?** 答えに「報酬で買収された / hack された / 両方によりプロトコルに反して動くバリデータ」が含まれていないなら、脅威モデルがまだ頭に入っていない。

## 6. 自分の L1 への含意

Tempo を作る。コンセンサスを選ぶ。すぐに 4 つの質問に直面する:

| 質問 | 答えのドライバ |
| :--- | :--- |
| **バリデータ何人?** | 分散化目標 vs レイテンシ予算 |
| **Sync か async か?** | 1 秒未満 finality は同期タイムアウト仮定を要する |
| **分断時に何を犠牲にする?** | 決済 → 停止 (BFT)。Mainnet ETH → 分岐 (Nakamoto 風)。|
| **Slashing か純粋経済か?** | Slashing は分岐検知を要する; 純粋経済 = staking のみ |

Tempo (おそらく): ~30 バリデータ、同期、BFT (分断時停止)、slashing。Hyperliquid: ~20 バリデータ、同期、HotStuff 系、slashing。

**プロトコル選択はビジネスモデルから流れる**。コードを書く前にトレードオフを整理する。

## 7. 練習

1. [Lamport の原典](https://lamport.azurewebsites.net/pubs/byz.pdf) (1982) を読む — §1 と §2 のみ、それ以外は密度が高い
2. なぜ 3f+1 が tight (3f では不可) かを紙にスケッチ
3. Ethereum PoS で FLP 脱出が使われている 3 箇所を挙げる

> 最終チェック: 一文で、なぜ「Bitcoin は 3f+1 を必要としない」が 3f+1 ルールの反例ではないのか? **Bitcoin が chain weight で投票を代替できるために犠牲にしているものは何か?** 答えに「確率的 finality」が出てこなければ §3 を再読。`,
                },
                {
                  title: '3 つのコンセンサス系統 — PoW、PoS、古典 BFT',
                  slug: 'consensus-three-families-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# 3 つのコンセンサス系統 — PoW、PoS、古典 BFT

BFT 問題が分かれば、解の系統は自明になります。各系統は前レッスン §3 から違う妥協を選んでいる。**選んだプロトコルが、作れる chain を決める** — スループット、レイテンシ、分散化、validator set サイズ、slashing semantics — すべてはこの 1 つの選択から流れる。

> 🛑 **スクロール前に予測。** 決済レール (Tempo) を作る。100 万バリデータより 1 秒未満 finality が重要。**どの系統を選ぶ? なぜ Bitcoin の系統は即座に負けるか?**

## 1. 3 系統一望

| 系統 | 例 | Finality | スループット | Validator set | 犠牲にするもの |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nakamoto / PoW** | Bitcoin、ETH 1.0 | 確率的 (~6 ブロック) | ~7 tps (BTC) | パーミッションレス maker | エネルギー、finality 時間 |
| **純粋 BFT** | Tendermint、HotStuff、HyperBFT | 即時 (1-2 RTT) | 高 (>1000 tps) | 有界 (~20-150) | Validator set 制約、分断時 liveness |
| **ハイブリッド PoS** | Ethereum 2.0 | 最終的 (~13 分) | 中 | 大 (~100 万) | 複雑さ、ガジェットのオーバーヘッド |

各系統は 1 つの軸で勝ち、他の軸で負ける。**無料の昼食はない**。仕事は、どの損失が chain で許容できるかを決めること。

## 2. Nakamoto / PoW — 原点

**機構**: マイナーがハッシュパズルを競合解決。最初に解いた者が次のブロックを提案。他のマイナーはその上に積むことで「投票」。最長の chain が勝つ。

これが買うもの:

- **パーミッションレス**: ハードウェアがあれば誰でも採掘可能
- **Validator set 不要**: 鍵管理なし、slashing 基盤なし
- **確率的 finality**: k ブロック後、reorg の確率は指数的に低下
- **分断下の liveness**: 各分断はブロックを作り続け、再結合時に reconcile

これが要するコスト:

- **エネルギー**: ハッシュパズルは電力を燃やす
- **即時 finality なし**: ~10 分 × 6 confirmation = 1 時間 (高額 tx)
- **Slashing なし**: 悪意あるマイナーはハッシュパワーを失うだけ、経済的処罰なし
- **低スループット**: 10 分に 1 ブロック × 小ブロック = 7 tps

> 🛑 **理解度チェック。** 「Bitcoin は過半数によるコンセンサス」**間違い**。Bitcoin は chain weight (累積仕事量) によるコンセンサス。なぜこの違いが重要? articulate できないなら longest-chain ルールを理解していない。

**評定**: PoW は耐検閲性とパーミッションレス性が finality 時間より重要な chain 向け。**2026 年の新規 L1 はほぼ PoW を選ばない**。Tempo は選ばない。Hyperliquid は選ばない。あなたも選ばない。

## 3. 古典 BFT — L1 アーキテクトのデフォルト

**機構**: 有界バリデータ委員会。リーダーがブロックを提案。委員会が投票。2/3+ が yes なら、ブロックは即座に確定。

古典的参照:

- **PBFT** (Castro & Liskov、1999) — 基礎論文。3 ラウンドプロトコル (pre-prepare、prepare、commit)。ブロックあたり O(n²) メッセージ。
- **Tendermint** (Buchman、2014) — view change を加え、実用化。Cosmos、CometBFT で使用。
- **HotStuff** (Yin et al.、2018) — 閾値署名で O(n) メッセージに圧縮。Diem (旧 Libra)、HyperBFT で使用。

鍵となる革新: **2/3+ 過半数** と **3f+1 バリデータ** が、メッセージがタイムアウト内に届く十分な同期下で safety と即時 finality の両方を与える。

これが買うもの:

- **即時 finality**: 1-2 round trip = 秒
- **Slashing**: バリデータが署名 → double-sign を暗号的に証明 → stake を slash
- **高スループット**: 並列バリデータ、決定論的スケジュール
- **予測可能なレイテンシ**: 良好条件下で 1 秒未満

これが要するコスト:

- **有界 validator set**: ブロックあたり O(n²) か O(n) メッセージは実用上 n を ~100-200 に上限
- **分断時 liveness 停止**: 2/3+ 票が取れないと chain は停止
- **中央集権リスク**: 有界 validator set は (実用上) パーミッションド

> 🛑 **予測。** 5 大陸に 100 BFT バリデータ。**finality レイテンシの下限は?** (ヒント: 光速、メッセージラウンド。) これが BFT 本質的に地域的になる理由は?

光速は世界 1 周 ~140 ms。2 ラウンドの投票で ~300 ms 最小。実 BFT chain は低レイテンシ地域にバリデータを集めて 1 秒以下にする。

**評定**: 古典 BFT は、finality > validator 数 となる新規 L1 のデフォルト。**Hyperliquid (HotStuff 派生)、Tempo (おそらく Tendermint or HotStuff 系)、ほとんどの app-chain**。

## 4. ハイブリッド PoS — Ethereum の道

**機構**: 2 つのプロトコルを重ねる。

- **Fork choice** (LMD-GHOST): 各ブロックでバリデータが head に attest。stake 加重で attestation が多い chain が勝つ。これは Nakamoto 風 — 確率的、finality なし。
- **Finality gadget** (Casper FFG): 32 スロット (1 epoch) ごとに stake の 2/3+ が checkpoint を finalize する投票。これは BFT — checkpoint に即時 finality。

なぜハイブリッド? Ethereum は **~100 万バリデータ**。純粋 BFT は 100 万まで scale しない (O(n) メッセージ = ブロックあたり 100 万署名)。ハイブリッドが得るもの:

- 大 validator set (大委員会 = 分散化)
- 確率的 head 追跡 (高速だが最終ではない)
- ~13 分ごとの eventual finality (古いブロックに BFT 風保証)

これが買うもの:

- **最大の分散化**: どの L1 よりも大きな 100 万 validator set
- **両者の良いとこ取り**: 高速 tip + finality
- **スケールでの経済的セキュリティ**: $50B+ staked、slashing 適用

これが要するコスト:

- **複雑さ**: 仕様が膨大
- **遅い finality**: 13 分最小 (2 epoch)
- **Slot レベルの liveness ≠ finality**: ブロックが head になっても finality 前に reorg されうる

> 🛑 **理解度チェック。** 「Ethereum は BFT」**半分正しく、半分間違い**。いつ? Ethereum は **finalized** ブロックには BFT だが **unfinalized** ブロックには Nakamoto 風。この区別は consensus-critical。なぜ Ethereum は両方必要か?

**評定**: ハイブリッド PoS は、100 万以上のバリデータ AND finality の両方が必要な場合の選択肢。**Ethereum 以外はほぼ必要としない**。大抵の L1 は純粋 BFT を選ぶ。

## 5. 決定フレームワーク — chain にどの系統?

\`\`\`
                                    コンセンサス選択
                                          │
                ┌─────────────────────────┼────────────────────────────┐
                │                         │                            │
        Validator 数?                  Finality?                 パーミッションド?
                │                         │                            │
        ┌───┴───┐               ┌────┴──────┐                   ┌────┴────┐
        │       │               │           │                   │         │
        <200   >200      即時必要        遅延 OK             Yes        No
        │       │               │           │                   │         │
        BFT    ハイブリッドPoS   BFT      BFT or PoW         BFT 系     PoW or
                                                              委員会      PoS
\`\`\`

Tempo: <100 バリデータ、即時 finality、パーミッションド (銀行 / Paradigm 認可)。→ **純粋 BFT** (おそらく Tendermint 系)。

Hyperliquid: ~20 バリデータ、即時 finality、パーミッションド。→ **HotStuff 系** (実際にこれ — HyperBFT)。

Ethereum: 100 万バリデータ、eventual finality OK。→ **ハイブリッド PoS** (実際にこれ)。

> 🛑 **予測。** 新 L1 が「高 TPS のため AlephBFT、その上に finality gadget」と言う。**どの系統? gadget は何のため?** 「AlephBFT」にピンと来ないなら調べる — Aleph Zero などで使われるランダム化 BFT。

## 6. rethlab が与えるもの

Reth の \`consensus\` コンポーネントスロットで、ノードとして **どの系統も** 出荷できる:

| 系統 | Reth 統合 |
| :--- | :--- |
| PoW | \`EthBeaconConsensus\` with PoW config (legacy) |
| PoS (ハイブリッド) | \`EthBeaconConsensus\` — 標準 Ethereum |
| BFT | カスタム \`Consensus\` impl + カスタム block producer |

Lesson 5 で実 \`Consensus\` trait を読み、Lesson 7 で Berachain がどう差し替えるかを歩きます。

## 7. 練習

各 chain について、系統と 1 つの具体的なトレードオフを特定:

1. Solana
2. Cosmos Hub
3. Avalanche (subnet)
4. Berachain
5. Hyperliquid

(答えは様々; 重要なのは、公開設計からトレードオフを特定する筋肉。)

> 最終チェック: 一文で、なぜ Tempo は Ethereum 風ハイブリッド PoS をほぼ確実に選ばないか? **Tempo の何が、ハイブリッドを間違った選択にする?** 「validator 数」「決済 finality 要件」が答えに出なければ §5 を再読。`,
                },
                {
                  title: 'Ethereum の PoS — Casper FFG + LMD-GHOST',
                  slug: 'consensus-ethereum-pos-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 45,
                  content: `# Ethereum の PoS — Casper FFG + LMD-GHOST

Ethereum のコンセンサスは、本番で最も研究されており最も staked されている PoS プロトコル。前レッスンで見たハイブリッド — **2 つのプロトコルを重ねた** — でもあります。本レッスンでハイブリッドを分解し、実仕様を読めて各部の存在理由が分かるようにします。

> 🛑 **スクロール前に予測。** Ethereum slot time は 12 秒、epoch は 32 slot。**finality は最短 ~2 epoch**。実時間を計算。なぜもっと速くないのか — なぜ毎 slot finalize しないのか?

12 秒 × 32 slot × 2 epoch = **12.8 分**。次の 4 セクションがこの数字を説明する。

## 1. 2 つのプロトコル

| プロトコル | 役割 | 周期 | 出力 |
| :--- | :--- | :--- | :--- |
| **LMD-GHOST** | Fork choice — 「head は何?」 | 毎 slot (12s) | 確率的 head |
| **Casper FFG** | Finality gadget — 「何が最終?」 | 毎 epoch (~6.4 分) | 確定 checkpoint |

LMD-GHOST が継続的に動き、tip を選ぶ。Casper FFG が epoch 境界で動き、古いブロックを finalize する。両方とも同じ validator set — ~100 万 ETH staker — に依拠する。

## 2. LMD-GHOST を 60 秒で

**Latest Message Driven, Greedy Heaviest Observed Sub-Tree**。

各 slot でバリデータは 2 つする:
1. **Propose** (自分の slot なら) — ブロックをブロードキャスト
2. **Attest** — どのブロックが head と思うか投票

Fork choice 規則: **各ブロックについて、その subtree 内の attestation を (stake 加重で) 数える。最大重量の subtree を選ぶ**。

\`\`\`
Block A (slot N で提案)
├── Block B (slot N+1)        ← subtree で attestation 60%
│   └── Block D (slot N+2)
└── Block C (slot N+1、対立 fork)    ← attestation 40%
\`\`\`

chain は B を canonical として選ぶ。C は orphan。

鍵となる性質:

- **「Latest Message」**: 各バリデータの **最新の** attestation だけ数える (古い票を使った長期賄賂を防ぐ)
- **「Heaviest Sub-Tree」**: 直系の子ではなく subtree 全体の重量を数える (GHOST 部分 — uncle 確認に重量を与える)

> 🛑 **理解度チェック。** 「LMD-GHOST は単に longest-chain」**間違い**。LMD-GHOST は stake 加重 heaviest-subtree。なぜこの区別が重要? heaviest-subtree が防ぐ攻撃で longest-chain が防げないものは?

防ぐもの: **selfish mining**。Longest-chain は 30% ハッシュパワーのマイナーが密かに chain を作って公開して他者を orphan するのを許す。Heaviest-subtree は stake 加重 attestation を強制し、これをずっと困難にする。

## 3. Casper FFG を 60 秒で

**Friendly Finality Gadget**。

32 slot (1 epoch ~ 6.4 分) ごとに、プロトコルは epoch の先頭を **checkpoint** として選ぶ。バリデータはどの checkpoint を justify するか投票。

規則:
1. **Justification**: stake の 2/3+ が checkpoint を justify するために投票
2. **Finalization**: justified な checkpoint は、**次** の checkpoint も justified になった時に finalize される

つまり finality は 2 epoch 最小。Finalize 後:
- **Reorg できない** — finalized ブロックは永続
- **Slashing で取り消せない** — Byzantine バリデータも finality を undo できない

これがハイブリッドの BFT 半分。2/3+ ルールはまさに Lesson 1 の 3f+1 quorum。

> 🛑 **予測。** バリデータが double vote (同 epoch 内で 2 つの異なる checkpoint に投票)。**この slashing 条件は?** 何分の 1 の stake が slash される?

これは **surround voting** か **double voting** — 両方とも slash 可能。罰則は correlated slashing (同 window 内で他にどれだけのバリデータが slash されたか) に依存。最低: 1 ETH。最大: 多数のバリデータが一緒に slash された場合は full stake (32 ETH)。

## 4. Slashing 条件

2 つの slash 可能違反:

| 違反 | 形状 | なぜ悪いか |
| :--- | :--- | :--- |
| **Double voting** | 同じ epoch で違う checkpoint に 2 票を署名 | 矛盾する 2 つの checkpoint を split-finalize できてしまう |
| **Surround voting** | 票 A、その後で A を「surround」する票 B を署名 | fork なしで両方 valid にできない |

数学的に: **バリデータが double-vote も surround-vote もしないなら safety を証明できる**。だから slashing は攻撃を経済的に非合理にする — 試み = 確実な stake 損失。

Slashing は **暗号的に検出可能**。誰でも slashing proof を chain に提出可能; バリデータの stake は自動で焼かれる。信頼 oracle 不要。

> 🛑 **理解度チェック。** Slashing は懲罰ではない — **経済的セキュリティ**。security 議論を言い直す: なぜ slashing の存在が、理論上可能な攻撃を実用上不可能にするか?

なぜなら攻撃者は stake を取得 (数百万 ETH) し、それを **失う** 必要があるから。攻撃コスト > 抽出可能価値。Stake はセキュリティの担保。

## 5. Engine API — コンセンサスが実行に話す場所

Ethereum は **consensus client** (CL — Lighthouse、Prysm、etc.) と **execution client** (EL — Reth、Geth、etc.) を分離する。両者は **Engine API**、JSON-RPC インタフェース、で通信する。

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

3 つのメソッドが仕事をする:

- **\`engine_forkchoiceUpdated\`** — CL が EL に「chain head は X、finalized は Y、X の上にブロック準備」
- **\`engine_getPayload\`** — CL が EL に「準備したブロックを渡せ」
- **\`engine_newPayload\`** — CL が EL に「他の proposer から受け取ったブロックを validate」

**Reth はこの EL 側を実装する**。ここがコンセンサス統合の場所。

> 🔍 **リポで探す。** [reth の engine crate](https://github.com/paradigmxyz/reth/tree/main/crates/engine) を開いて \`engine_newPayload\` ハンドラを見つける。**VALID を返す前に EL がディスクに commit するものは何か?** 追跡。

## 6. 自分の L1 への含意

Tempo クラスの L1 を作るなら:

- **おそらく** Ethereum の CL は走らせない — 独自の validator set、違う slot time、違う finality 周期
- **おそらく** Reth 互換 Engine API は使う — 違う consensus client を差し替え可能に
- **絶対に** slashing semantics は必要 — ただし自分の validator set サイズ向けにカスタマイズ

Ethereum ハイブリッドの 2 半分 (LMD-GHOST + Casper FFG) は新規 PoS chain の **メンタルモデル**。おそらく単純化する (100 万バリデータでないので gadget split 不要) が、**slashing + 2/3+ quorum** 構造は直接 port できる。

## 7. 読み物

- [Ethereum consensus spec](https://github.com/ethereum/consensus-specs) — \`specs/phase0/beacon-chain.md\`
- [Vitalik の Casper FFG 論文](https://arxiv.org/abs/1710.09437) — 2017 原典
- [Engine API 仕様](https://github.com/ethereum/execution-apis/blob/main/src/engine/specification.md) — JSON-RPC インタフェース

## 8. 練習

紙にスケッチ:

1. 競合する 2 checkpoint — gadget はいつ片方を finalize するか?
2. Slashing proof — 何のデータが入っている? なぜそのデータで十分か?
3. ネットワークから新ブロックが来る時の CL→EL ハンドシェイク

> 最終チェック: 二文で、「Ethereum finality は 13 分」がバグではない理由 — 13 分が 1 秒 BFT finality にない何を買うか? **答えに「スケールでの validator 分散化」がなければ、本レッスン §1 と前レッスン §3 を再読**。`,
                },
                {
                  title: 'HotStuff と HyperBFT — 単一リーダー BFT 系統',
                  slug: 'consensus-hotstuff-hyperbft-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 17,
                  xpReward: 45,
                  content: `# HotStuff と HyperBFT — 単一リーダー BFT 系統

HyperBFT は Hyperliquid のコンセンサスエンジン。**HotStuff** (2018) の派生で、HotStuff はさらに **PBFT** (1999) の派生。この系統は、即時 finality が必要な現代の非 Ethereum L1 の多数が選ぶ。HotStuff を読むことが、HyperBFT 理解への最も近いオープンソース参照になります。

> 🛑 **スクロール前に予測。** PBFT (1999) はブロックあたり O(n²) メッセージ。HotStuff (2018) は O(n)。**n=100 バリデータでこの 10000x メッセージ削減を可能にした変更は?** (ヒント: 暗号。)

## 1. PBFT — 親

Castro & Liskov (1999)。皆が学んだプロトコル。3 ラウンド:

\`\`\`
Round 1 (Pre-prepare): リーダー → 全バリデータ: 「ブロック B」
Round 2 (Prepare):     全 → 全: 「B に投票した」
Round 3 (Commit):      全 → 全: 「B を commit する準備完了」
\`\`\`

Round 3 後、バリデータは commit。3 round-trip × n² メッセージ (round 2 と 3 が all-to-all) = **総 n²**。

n=100 で 10,000 メッセージ/ブロック。n=1000 で 100 万/ブロック。Scale しない。

> 🛑 **理解度チェック。** 全員がリーダーに送り、リーダーが aggregate するだけではダメ? **どんな攻撃が開く?** 「Byzantine リーダーが誰がどう投票したか嘘をつける」が答えに含まれなければ Lesson 1 §3 を再読。

## 2. HotStuff — ブレークスルー

Yin、Malkhi、Reiter、Gueta、Abraham (VMware、2018)。2 つの革新。

### 2.1 閾値署名

各バリデータが全員に署名を送る代わりに、**閾値暗号** を使う:

- 2f+1 バリデータが部分署名
- 部分署名は **サイズ O(1) の 1 つの集約署名** に結合可能
- リーダーは集約のみブロードキャスト、n 個別署名ではない

これが n²→n の通信を圧縮する。リーダーが 1 集約署名を fan-out、バリデータは互いに話す必要なし。

### 2.2 Pipelined commit

「Prepare」と「Commit」を 1 つのパイプラインに統合。新ブロックがフェーズを通過するが、複数のブロックが異なるフェーズで同時進行:

\`\`\`
Block N:   Propose → Vote → Commit
Block N+1:           Propose → Vote → Commit
Block N+2:                     Propose → Vote → Commit
\`\`\`

スループットは 3 ブロック時間に 1 commit ではなく、1 ブロック時間に 1 commit になる。

> 🛑 **予測。** Byzantine リーダーが悪いブロックを提案する。**HotStuff でいつプロトコルが検知してリーダーを切り替える?** スクロール前に 3 フェーズを頭の中で追跡。

**Propose** フェーズの後、2f+1 バリデータが yes 投票しないなら、次のリーダーが **view change** で引き継ぐ。悪い提案は drop される。Liveness は 1 ラウンド余分で回復。

## 3. HotStuff の変種

系統は進化してきた:

| Variant | 年 | 鍵となる変更 |
| :--- | :--- | :--- |
| **Basic HotStuff** | 2018 | 原典 — 3 フェーズ、pipelined |
| **Event-driven HotStuff** | 2019 | フェーズ間非同期 |
| **DiemBFT** | 2020 | Diem (現在は廃止) で使用 |
| **HyperBFT** | 2023 | Hyperliquid で使用 |
| **Aptos BFT** | 2022 | Aptos で使用 |

パターン: 各 variant は特定のデプロイ向けに最適化。**HyperBFT** は低レイテンシ単一地域バリデータクラスタ向け、orderbook 取引のホットパス最適化、と推測される。

> 🔍 **研究で探す。** arXiv で「HotStuff」を検索し 2020+ variant を見る。各々が特定の最適化を加えている。**各々は何を最適化している?** これが設計空間の地図。

## 4. HyperBFT — 公開情報

Hyperliquid のホワイトペーパーと技術ブログから:

- **HotStuff 派生**: 明示的に言及
- **~20-25 バリデータ**: 有界委員会
- **1 秒未満 finality**: 実用上 1 round-trip
- **EVM 統合**: HyperEVM が orderbook と並列実行、両者が同じコンセンサスで commit

公開 **されていない** (推測必要) もの:
- 正確な pipelining 深さ
- リーダーローテーション方針 (round-robin、stake 加重、ランダム化?)
- View change 詳細
- ネットワーク最適化 (custom transport? batching?)

Tempo (Paradigm) はまだホワイトペーパーがないが、系統はほぼ確実に同じ (HotStuff or Tendermint 系 — どちらも親戚)。

## 5. 必ず理解すべき HotStuff 不変条件

3 つの性質が HotStuff を動かす:

### 5.1 Quorum certificate (QC)

**QC** = 「2f+1 バリデータがブロック B に投票したという証明」。1 つの集約署名。検証コスト低。

すべての commit は **QC に裏付け** される。有効な QC 付きブロックが見えれば、2f+1 が合意したと分かる。

### 5.2 View 番号

プロトコルは **view** 単位で動く。View k は指定リーダーを持つ。リーダーが Byzantine または到達不能なら、view が k+1 に変わる (新リーダー)。各 view は独自の QC chain。

### 5.3 Lock

2f+1 バリデータがブロックに「lock」した (phase 2 で投票) 後、次のリーダーはそのブロックを含めるか — 含められない証明 (より高い QC 経由) を出さねばならない。これが **view change 中の safety 違反を防ぐ**。

> 🛑 **理解度チェック。** 「Lock は fork を防ぐ」**部分的に正しい**。Lock は **矛盾する commit** を防ぎ、fork そのものではない。Byzantine リーダーは矛盾するブロックを提案できる; lock はその 1 つだけが commit されることを保証する。この区別を言い直す。

## 6. Hyperliquid コンテキスト — なぜ HotStuff 特に

Hyperliquid は **perp DEX**。コンセンサス設計は次に資する:

- **高 orderbook 更新率**: バリデータが orderbook 状態に合意、毎ブロック変わる
- **低レイテンシ**: トレーダーは <1 秒の confirmation を欲しがる
- **有界 validator set**: 高スループットには少数の高速バリデータが必要
- **EVM 共存**: HyperEVM が並列で走り、同じ finality 保証

HotStuff が合う理由:
- 有界委員会で低レイテンシ
- QC が検証コスト低 (orderbook コードが包含を高速検証可能)
- Pipelining = 高スループット

Tendermint と比較: Tendermint はよりシンプルだが pipelining が積極的でない。HotStuff がスループットで勝つ。

## 7. 練習

各 chain についてコンセンサス系統と 1 つの設計選択を特定:

1. Hyperliquid (HotStuff 派生) — レイテンシのための有界 validator set
2. Aptos (Aptos-BFT、HotStuff 派生) — スループットのための DAG ベース mempool
3. Sui (Bullshark + Narwhal、DAG ベース) — ordering と実行を分離
4. Cosmos Hub (Tendermint) — HotStuff より単純、スループット低
5. Solana (PoH + Tower BFT) — clock ベース、シーケンス駆動 (別系統)

## 8. 読み物

- [HotStuff 論文](https://arxiv.org/abs/1803.05069) — 2018 原典
- [Hyperliquid ホワイトペーパー](https://hyperliquid.gitbook.io/hyperliquid-docs/about-hyperliquid/consensus) — 公開情報
- [DiemBFT 仕様](https://developers.diem.com/docs/technical-papers/the-diem-blockchain-paper/) — 本番 HotStuff variant (廃止プロジェクトだが公開文書あり)

> 最終チェック: 一文で、Hyperliquid のような chain で HotStuff が PBFT より優れている理由は? **「速い」だけなら掘り下げる — 具体的な構造変更を名前で挙げる**。必要なら §2 を参照。`,
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
                  title: "Reth の Consensus trait を読む",
                  slug: 'consensus-reth-trait-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# Reth の Consensus trait を読む

Reth は **execution-only**。PoS や BFT を実装していない。では「コンセンサス」は Reth のどこに住んでいるのか? 答えは **\`Consensus\` trait** — 任意のコンセンサスエンジンが Reth の実行パイプラインに接続する統合点。これが Hyperliquid のノード、Tempo のノード、すべての Reth ベース chain が実装する trait。

> 🛑 **スクロール前に予測。** Reth はコンセンサスレイヤから来るブロックを validate する必要がある。**EVM が tx を実行する前に、どんなチェックが走るべき?** 4 つ列挙。(ヒント: 暗号的、構造的、時間的、コンセンサス固有の 1 つ。)

## 1. Reth のどこにコンセンサスが住むか

Reth のアーキテクチャは関心事を分割:

| レイヤ | 責務 | コンポーネント |
| :--- | :--- | :--- |
| **実行** | tx を走らせ、post-state を生成 | revm + executor |
| **ストレージ** | ブロック、状態、receipt を永続化 | MDBX |
| **ネットワーク** | peer からブロックを受信 | devp2p |
| **コンセンサス** | chain ルール上のブロック正当性を validate | \`Consensus\` trait |

注意: **Reth の \`Consensus\` trait は chain head を選ばない**。それは consensus client の仕事 (Lighthouse、Prysm、またはカスタム)。Reth の仕事は受け取ったブロックを **validate** する — ルール通りに作られたか?

分割: head 選択 (CL) vs ブロック validation (Reth as EL)。

## 2. Trait — 実コード

[\`crates/consensus/consensus/src/lib.rs\`](https://github.com/paradigmxyz/reth/blob/main/crates/consensus/consensus/src/lib.rs):

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

3 メソッド、validation の 3 フェーズ。**順番に読む**:

### \`validate_block_pre_execution\` — tx 実行前

EVM 実行不要の安価なチェック:

- Transaction root が header と一致
- Receipt root が header と一致 (receipt 適用後)
- Block hash が well-formed
- Block サイズが上限内
- Timestamp が未来すぎない

高速。1 ミリ秒未満。明らかに壊れたブロックを EVM サイクル前に reject。

### \`validate_body_against_header\` — 構造的整合性

Body と header が互いに一致しなければならない:

- Header の transactions root == merkle 化された tx リスト
- Withdrawals root == merkle 化された withdrawal リスト
- Ommers hash == uncle リストの hash (legacy)

これは **暗号的紐付け**。Body と header が一致しないなら、ブロックは malformed — 署名後に誰かが改竄した。

### \`validate_block_post_execution\` — EVM 実行後

ガス使用量、post-state、receipt が分かった状態。チェック:

- Header の gas used == 実行中計算された gas
- Header の state root == 計算された post-state root
- Receipts root == merkle 化された receipt
- Logs bloom == 集約された bloom

これが **コンセンサス critical なチェック**。Fork が state root を誤計算したなら、ここで mainnet から分岐する。

> 🛑 **理解度チェック。** State root validation がなぜ pre-execution ではなく post-execution か? **Pre-execution が知らない、post-execution は知っているものは?** 答えられなければ本レッスン §2 を再読。

## 3. HeaderValidator trait — 親

\`Consensus\` は \`HeaderValidator\` を継承。Header validator は次を処理:

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

Header validation は **body validation から分離** されている:
- Header が先に到着 (fast sync 中)
- Header は body なしで validate 可能
- Light client は header だけ要

Tempo or Hyperliquid 向け: 自分の \`HeaderValidator\` impl が「この proposer はこの slot の選出リーダーか?」をチェックする場所。それが BFT 固有のチェック。

## 4. デフォルト impl — Ethereum の

Ethereum mainnet 向けに、Reth は \`EthBeaconConsensus\` を提供 (\`crates/ethereum/consensus\`)。Engine API 契約を validate する:

- ブロックが正しい形
- 実行後の state root が一致
- Gas limit が parent の ±1/1024 以内 (EIP-1559 elastic bound)
- BaseFee が EIP-1559 公式に従う
- Timestamp が増加

**PoS validation はしない** — それは CL の仕事。Reth は CL が既に proposer signature、slot eligibility、attestation などを validate 済みと信頼。

> 🔍 **リポで探す。** \`crates/ethereum/consensus/src/lib.rs\` を開き \`EthBeaconConsensus::validate_block_post_execution\` を見つける。**何を具体的にチェックしているか?** スクロール前に自分のリストを作る。

## 5. Tempo / Hyperliquid 向け — 何が変わるか

BFT コンセンサス付きカスタム L1 は次を override:

- **\`HeaderValidator\`**: proposer signature 検証、validator set 包含、view/round 番号
- **\`validate_block_post_execution\`**: コンセンサス固有 post-state チェックを含む (e.g., HyperEVM の orderbook 状態)
- **Slashing 関連フィールド**: header が slashing 証拠を含む場合、暗号的に validate

構造は変わらない。**Trait を書き直さない** — 違う impl を提供して Reth の NodeBuilder に配線する。

## 6. NodeBuilder スロット

Inside Reth から (見たはず):

\`\`\`rust
let node = NodeBuilder::new()
    .with_types::<CustomNode>()
    .with_components(
        CustomComponents::default()
            .consensus(MyCustomConsensus::new(validator_set))
    )
    .launch()
    .await?;
\`\`\`

\`MyCustomConsensus\` は \`Consensus<N::Block>\` を実装。NodeBuilder がブロック validation に配線。完了。

これは custom payload builder、custom EVM config などと同じパターン — **コンセンサスは 6 コンポーネントの 1 つ**。

## 7. 練習

新ターミナルで:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
\`\`\`

それから:

1. \`crates/consensus/consensus/src/lib.rs\` を開いて full \`Consensus\` trait を読む
2. \`crates/ethereum/consensus/src/lib.rs\` を開いて impl を見つける
3. 数える: \`EthBeaconConsensus\` は何メソッドを override し、何をデフォルト使用?
4. \`validate_block_post_execution\` が呼ばれる唯一の場所を見つける (メソッド名で検索)

> 最終チェック: 一文で、Reth の仕事 (\`Consensus\` impl) と consensus client の仕事の境界は? **答えに「head 選択 vs ブロック validation」が出なければ §1 を再読**。`,
                },
                {
                  title: 'Malachite を読む — Informal Systems の Rust-native BFT',
                  slug: 'consensus-malachite-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 45,
                  content: `# Malachite を読む — Informal Systems の Rust-native BFT

[\`informalsystems/malachite\`](https://github.com/informalsystems/malachite) は **Tendermint の Rust 書き直し**、CometBFT (Go 参照実装) を作った同じチームによる。学べる最も近い Rust-native BFT エンジン。Reth 上に Tendermint 系 chain を出荷したいなら、これが参照実装。

> 🛑 **スクロール前に予測。** Tendermint はブロックあたり **3 投票ラウンド**: Propose、Prevote、Precommit。**各ラウンドで、バリデータは何を決定する?** 各ラウンドの入力と出力を列挙。

## 1. なぜ Malachite が存在するか

Informal Systems は CometBFT (Go) を作った。何年も Tendermint 派生 chain が出荷されるのを見てきた。彼らの結論:

- **Rust-native** コンセンサスが今や標準 (Reth、Lighthouse-as-rewrite など)
- Go 参照は Rust chain に embed しにくい
- **新しい高品質 Rust BFT エンジン** はパブリックグッドになる

Malachite はその結果。Tendermint にアーキテクチャ的に忠実、エルゴノミクス的に Rust。

リポ: [\`code/\`](https://github.com/informalsystems/malachite/tree/main/code) がメイン実装。

## 2. コアアーキテクチャ

3 つの可換レイヤ:

\`\`\`mermaid
flowchart TB
    App["Application<br/>(自分の chain)"] -->|propose/validate| Driver["Driver<br/>(オーケストレータ)"]
    Driver -->|Vote keeper| VK["Vote Keeper<br/>(quorum ロジック)"]
    Driver -->|Round state machine| RSM["Round State Machine<br/>(Tendermint ルール)"]
    VK -->|2f+1 達成?| Driver
    RSM -->|次ステップ| Driver
\`\`\`

3 コンポーネント、クリーン分離:

| コンポーネント | 責務 |
| :--- | :--- |
| **Driver** | オーケストレータ。メッセージを受け取り、vote keeper + RSM にディスパッチ。 |
| **Vote Keeper** | 票をカウント。2f+1 到達を判断。 |
| **Round State Machine** | 実 Tendermint プロトコル — 状態遷移、view change。 |

Application は上部で接続 — Malachite が「このブロックを提案」「このブロックを validate」のためにコールバック。

## 3. Round State Machine — Tendermint ルール

Tendermint の心臓、コードに捕捉:

\`\`\`rust
pub enum Step {
    NewRound,
    Propose,
    Prevote,
    Precommit,
    Commit,
}
\`\`\`

各ブロックラウンドで、バリデータは次を遷移:

1. **NewRound** → ラウンドに入る、自分が proposer かを決める
2. **Propose** → proposer ならブロックをブロードキャスト。違うなら待つ。
3. **Prevote** → 提案ブロックに「yes」か「nil」を投票 (2f+1 prevote で *polka* 達成)
4. **Precommit** → polka を見たら precommit をブロードキャスト。2f+1 precommit で、**ブロック commit**。
5. **Commit** → 確定、次の height へ

**バリデータの 2/3 が各ラウンドで投票** することが progress に必要。投票しないなら view change。

> 🛑 **理解度チェック。** なぜ **2 ラウンド** の投票 (Prevote + Precommit)、1 ラウンドではないのか? **2 ラウンド目が防ぐ攻撃は?** ヒント: Byzantine proposer が違うブロックを違うバリデータに送ったら何が起きる?

2 ラウンド目は **2f+1 のバリデータが同じブロックに合意した** ことを確認する、ただ投票したことではなく。1 ラウンドだけだと Byzantine リーダーが split-vote して downstream commit を混乱させられる。2 ラウンド構造が **safety 保証**。

## 4. Vote Keeper — quorum ロジック

\`\`\`rust
pub struct VoteKeeper<Ctx: Context> {
    height: Ctx::Height,
    threshold: ThresholdParam,
    rounds: BTreeMap<Round, RoundVotes<Ctx>>,
}
\`\`\`

Vote Keeper はラウンドごとの票をカウントし追跡:

- **ラウンドごと**: 各候補ブロックへの prevote、各候補ブロックへの precommit
- **Polka**: ブロックに 2f+1 prevote が蓄積した時
- **Commit**: ブロックに 2f+1 precommit が蓄積した時

公開:

\`\`\`rust
impl<Ctx: Context> VoteKeeper<Ctx> {
    pub fn add_vote(&mut self, vote: Ctx::Vote, weight: Weight) -> VoteKeeperOutput<Ctx::Value>;
    pub fn get_polka(&self, round: Round) -> Option<Ctx::Value>;
    pub fn get_commit(&self, round: Round) -> Option<Ctx::Value>;
}
\`\`\`

3 操作: 票を追加、polka チェック、commit チェック。**それだけ**。Tendermint の quorum ロジックすべてがこの struct に。

> 🔍 **リポで探す。** [\`code/crates/vote/src/lib.rs\`](https://github.com/informalsystems/malachite/blob/main/code/crates/vote/src/lib.rs) を開いて \`add_vote\` を追跡。**何が何で加重されるか?** 2f+1 閾値はどこから来るか?

## 5. Driver — オーケストレータ

Driver はメッセージ (proposal、vote) を受け取り、Vote Keeper と RSM に流し、**output** (application が取るアクション) を発火:

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

これがプロトコルエンジンと application の **全インタフェース**:

- ネットワークメッセージが来たら app が \`Driver.process(Input)\` を呼ぶ
- Driver が \`Output\` アクションを返す: 「これを提案」「あれに投票」「決定した、このブロックを commit」

クリーンなイベントループパターン。App がホットループでこれを呼ぶ。

## 6. Application インタフェース — 実装するもの

Malachite を Reth に配線するには:

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

**自分のブロック型** (Reth の \`Block\`)、**自分の validator set** (カスタム struct)、**自分の署名方式** (ECDSA、BLS、etc.) で \`Context\` を実装する。

そして Malachite の Driver がすべてを処理: ラウンド、投票、タイムアウト、view change。**Application は primitives だけ提供**。

## 7. Astria — Reth 上の実 Malachite consumer

[\`astriaorg/astria\`](https://github.com/astriaorg/astria) は Reth ベースロールアップの共有 sequencer を出荷、コンセンサスに **CometBFT** (Go Tendermint) を使用。Malachite に切り替え可能 — 同じプロトコル、別言語実装。

これがデプロイ形状:

\`\`\`
Application (Reth ベースロールアップ) ←→ Sequencer (CometBFT/Malachite) ←→ Validator set
\`\`\`

Astria は本番で「Reth + BFT コンセンサス」のオープンソース最良例。読む価値あり。

## 8. Tempo 系 L1 向け

Malachite で Tempo クラスの L1 を出荷するなら:

\`\`\`rust
// 自分の context
struct TempoContext;
impl Context for TempoContext {
    type Address = ValidatorAddress;
    type Height = BlockNumber;
    type Vote = TempoVote;       // typed vote struct
    type Proposal = TempoBlock;   // reth 互換 Block
    type Value = BlockHash;
    type ValidatorSet = TempoValidatorSet;
    type SigningScheme = Ed25519;
    // ...
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

アーキテクチャレベルではそれだけ。Malachite がプロトコルを処理; 前レッスンの consensus trait 経由で Reth 統合を処理する。

## 9. 練習

1. \`informalsystems/malachite\` を clone
2. \`code/crates/driver/src/driver.rs\` を開き main \`process\` メソッドを見つける
3. 1 つの票を追跡: 到着 → Vote Keeper → polka 検知 → RSM ステップ → output
4. 2f+1 が正確にチェックされる場所を特定 (1 つの特定の関数 — 見つける)

> 最終チェック: 一文で、Malachite が自分で書かずに済ませてくれるものは? **articulate できなければ、embed-ready な Rust BFT エンジンを持つ価値を内面化していない**。`,
                },
                {
                  title: 'bera-reth を読む — Proof-of-Liquidity をコンセンサスカスタマイズとして',
                  slug: 'consensus-bera-reth-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 40,
                  content: `# bera-reth を読む — Proof-of-Liquidity をコンセンサスカスタマイズとして

[\`berachain/bera-reth\`](https://github.com/berachain/bera-reth) は「**Reth + 根本的に違うコンセンサス**」の本番例。Berachain の Proof-of-Liquidity (PoL) は **単に PoS の renaming ではない** — バリデータになれる人と報酬の流れを変える。bera-reth を読むことで「コンセンサスを差し替える」の実用表面が見える。

> 🛑 **スクロール前に予測。** Ethereum PoS では **32 ETH を staking** してバリデータになる。Berachain の PoL では類似ステップは何? (ヒント: 「BGT を staking」ではない。) **Berachain がバリデータに要求する、Ethereum が要求しないものは?**

## 1. Proof-of-Liquidity が変えるもの

Berachain のピッチ:

- **PoS では**: バリデータはネイティブトークンを stake する。トークンの唯一の効用は staking。
- **PoL では**: バリデータは **BGT** (ガバナンストークン) を stake するが、BGT は **BEX (彼らの DEX) に流動性を提供** することで earn する。

カスケード:
1. ユーザが BEX に流動性を提供 → BGT を earn
2. BGT を stake 可能 → バリデータ特権を earn
3. バリデータが手数料を earn → LP に報酬として戻る

これが **バリデータ経済を DEX 流動性に整合** させる。chain の最も活発なユーザ (LP) が最も報酬整合的なバリデータでもある。

## 2. Ethereum PoS と同じままなもの

たくさん。PoL は **PoS にひねりを加えたもの** で、新系統ではない:

| 機能 | PoS | PoL | 同じ? |
| :--- | :--- | :--- | :--- |
| 有界 validator set | あり (~100万) | あり (より小、e.g., ~100) | 同じ構造 |
| Double-sign の slashing | あり | あり | 同じ |
| Finality gadget | Casper FFG | CometBFT 系 | 違うエンジン |
| Block time | 12s | ~2s | 違う |
| トークンモデル | 単一 (ETH) | 二重 (BGT + Bera) | 違う |

根本的なコンセンサスモデル (BFT 系 finality、slashing) は **同じ**。変わるもの:
- バリデータになれる人 (LP ベースのゲート)
- 報酬の流れ (LP に戻る、stake だけでなく)
- Block time (より速い、~2s)

## 3. Reth 側の変更

bera-reth のアーキテクチャを読む:

\`\`\`
bera-reth/
├── consensus/          ← カスタムコンセンサス impl
├── chainspec/          ← Berachain mainnet/testnet 仕様
├── evm/                ← カスタム EVM config + precompile
├── node/               ← NodeBuilder 配線
└── rpc/                ← bera_* RPC namespace
\`\`\`

カスタマイズ点 (Tempo or 任意の Reth ベース L1 と同じパターン):

### 3.1 \`consensus/\`

\`Consensus\` trait impl が Berachain 固有のブロック性質を validate:

- **Proposer がアクティブ validator set にいる** (LP ゲート)
- **Block timestamp が delta 内** (高速 2s ブロックはタイムスタンプ境界が厳しい)
- **バリデータ署名方式**: BLS 集約署名、ECDSA でなく

### 3.2 \`evm/\`

PoL 経済用のカスタム precompile:

- **報酬分配 precompile**: ブロック commit 時、ネイティブ報酬が LP に比例配分
- **Validator registry precompile**: アクティブ validator set を on-chain で追跡

両方とも executor の **pre-execution hook** — tx 前に走り、chain 状態を自動更新。

> 🔍 **リポで探す。** bera-reth の \`evm/\` crate を開き executor impl を見つける。**各ブロックの最初の tx 前にどんな hook が走るか?** これが PoL 報酬の流れ。

## 4. Chain spec — chain を「違う」にするもの

bera-reth の \`chainspec\` が仕様レベルで何が変わるかを示す:

- **カスタム fork 高**: アップグレード用の独自 activation table
- **カスタム genesis**: BGT pre-mint、バリデータ初期配分
- **カスタム precompile アドレス**: 予約アドレスでの PoL hook
- **カスタム base fee params**: 2s ブロック向けに調整

これは **構造的に Ethereum chainspec と同一** だが **意味的に違う**。自分のカスタム L1 は独自バージョンを持つ。

## 5. コンセンサス統合を読む

この順で読む:

1. \`bera-reth/consensus/src/lib.rs\` — \`Consensus\` impl
2. \`bera-reth/node/src/lib.rs\` — NodeBuilder への配線
3. \`bera-reth/chainspec/src/lib.rs\` — どんなプロトコルパラメータに依存するか
4. \`bera-reth/evm/src/lib.rs\` — このコンセンサスで走る executor hook

各ファイルは小さい (<500 行)。全 **bera-reth-as-consensus-customization** は標準 Reth の上に ~2000 行。

これが headline: **完全カスタム L1 は Reth カスタマイズ ~2000 行** — Tendermint 系コンセンサスエンジンが ready なら。仕事のほとんどはプロトコル再実装ではなく統合。

> 🛑 **理解度チェック。** なぜ Berachain は標準 Reth + カスタムバリデータでなく bera-reth が必要? **bera-reth に vanilla Reth が持たないものは?** 答えが「config」なら掘り下げる。コンセンサス固有のコードパスがある。

## 6. 自分の L1 への教訓

bera-reth を参照として学ぶ:

- 自分のカスタム chain crate ~= bera-reth の crate 構造
- 自分の \`Consensus\` impl ~= bera-reth の、自分の validator set ルール付き
- 自分の executor hook ~= bera-reth の PoL hook、自分のビジネスロジック付き
- 自分の NodeBuilder 配線 ~= bera-reth の、自分のコンポーネントを呼ぶ

**bera-reth がテンプレート**。Tempo の node crate が公開された時、構造的に同一に見える — ビジネスロジック違い、骨格同じ。

## 7. 練習

1. bera-reth を clone (or GitHub でブラウズ)
2. Expert Module 3 の reth 自身の \`crates/optimism/\` のディレクトリ構造と比較
3. PoL に最も特化した 3 ファイルを特定 (違う L1 用に最もカスタマイズが必要な部分)
4. 推定: bera-reth を fork して Tempo 系 L1 を作るなら、何を変えて何を残すか?

> 最終チェック: 一文で、「Reth 上にカスタム L1 をどう出荷するか?」の構造的答えは? **「Consensus trait 実装 + カスタム executor hook + NodeBuilder 配線」以上なら過剰**。`,
                },
                {
                  title: 'クイズ: コンセンサス内部を読む',
                  slug: 'consensus-reading-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# クイズ: コンセンサス内部を読む

本モジュールで読んだ内容の短いテスト。**雰囲気で答えず** — 各設問は具体的なソースファイルか設計選択にマップする。`,
                  quizQuestions: [
                    {
                      question: "Reth の `Consensus` trait と Lighthouse のような consensus client の **構造的違い** は?",
                      options: [
                        '同じもの — Reth は内部にコンセンサスエンジンを含む。',
                        "Reth の `Consensus` trait はブロックを chain ルールに対して **validate** する; Lighthouse のような consensus client は fork choice 経由でどのブロックを head とするか **selection** する。EL/CL 境界での 2 つの違う仕事。",
                        "Reth の `Consensus` はネットワーク層で動く; consensus client はアプリケーション層で動く。",
                        'Reth は RocksDB を使う; consensus client は MDBX を使う。',
                      ],
                      correctIndex: 1,
                      explanation: 'EL/CL 分離が基本。Reth (EL) はブロックを validate — このブロックはルールに従うか? Lighthouse (CL) は決定 — 次にどの valid ブロックの上に積むべきか? カスタム L1 は **CL も** (e.g., Malachite) **Reth の Consensus impl も** 両方差し替える。',
                    },
                    {
                      question: 'Tendermint で、なぜ **2 投票ラウンド** (Prevote、その後 Precommit) で 1 ラウンドではないのか?',
                      options: [
                        '性能 — 2 ラウンドは 1 ラウンドより並列化が良い。',
                        '最初のラウンド (Prevote) はバリデータがブロックを見たことを確認。2 ラウンド目 (Precommit) は 2f+1 が **同じ** ブロックを見たことを確認 — Byzantine リーダーが違うブロックを違うバリデータに送る攻撃を防ぐ。',
                        'PBFT (1999) からの伝統; HotStuff など現代の variant は 1 ラウンド使用。',
                        '2 ラウンド目で uncle ブロックを参照可能にする。',
                      ],
                      correctIndex: 1,
                      explanation: '2 ラウンド = split-brain への safety。Byzantine リーダーは違うブロックを違うサブセットに送れる。2 ラウンド目なしで、矛盾する 2 ブロックを commit してしまえる。Prevote は「何かを見た」、Precommit は「2f+1 で同じものを見た」を確認。',
                    },
                    {
                      question: "PBFT (1999) と HotStuff (2018) の **headline 構造的違い** は?",
                      options: [
                        'PBFT は純粋 Rust で走る; HotStuff は Solidity contract。',
                        'HotStuff は **閾値署名** で PBFT の O(n²) all-to-all 通信を O(n) leader-fanout に圧縮し、連続するブロックをパイプライン化してスループットを上げる。',
                        'PBFT は finality gadget; HotStuff は fork choice ルール。',
                        'PBFT はパーミッションレス; HotStuff は validator set 必要。',
                      ],
                      correctIndex: 1,
                      explanation: '暗号 (閾値署名) で 1 集約署名が n 個別署名を置き換える。これが n² → n の圧縮。Pipelining が 2 つ目の革新 — ブロックが異なるフェーズで同時並行可能、スループットが 3 ブロック時間に 1 commit から 1 ブロック時間に 1 commit になる。',
                    },
                    {
                      question: "**Ethereum PoS の finality 周期** は何か、その構造的理由は?",
                      options: [
                        '毎 slot (12s) — スループット最大化のため。',
                        '2 epoch (~13 分) 最小 — **100 万 +バリデータ** で BFT 系即時 finality は不可能、stake 加重 2/3+ 票による epoch checkpoint で finalize (Casper FFG)。',
                        '確率的 — Ethereum PoS は Bitcoin 系 longest-chain 使用。',
                        '設定可能 — オペレータが 1 slot と 1 epoch から選ぶ。',
                      ],
                      correctIndex: 1,
                      explanation: 'ハイブリッド PoS: 高速 head 選択 (LMD-GHOST 毎 slot) + 遅い finality (Casper FFG 毎 2 epoch)。13 分は 100 万バリデータ分散化のコスト。Tempo クラス chain は小さな validator set + 即時 finality を選ぶ。',
                    },
                    {
                      question: 'Berachain はなぜ標準 Reth + カスタムバリデータでなく **bera-reth** が必要か?',
                      options: [
                        '違う EVM 実装を使うため、revm でなく。',
                        '標準 Reth はバリデータには十分だが **コンセンサス固有コードパス** を欠く: PoL 認識ブロック validation、流動性報酬の流れ用カスタム executor hook、BGT 認識 chainspec、validator-set-coupled-to-LP-state な precompile。',
                        'ライセンス理由 — Reth は GPL。',
                        'Berachain は別 L1 で動く; bera-reth は L2 用のみ。',
                      ],
                      correctIndex: 1,
                      explanation: 'PoL がバリデータ経済関係を根本変更。Consensus impl、executor hook、chainspec すべてが知る必要がある。vanilla Reth の上に ~2000 行のカスタマイズ。op-stack-on-reth と同じパターン: 最小だがコンセンサス critical なカスタマイズ。',
                    },
                    {
                      question: "Reth の `Consensus` trait で、どのメソッドが **state root を validate** するか?",
                      options: [
                        '`validate_header` — state root を含む全 header フィールドをチェック。',
                        '`validate_body_against_header` — body と header の構造整合性をチェック。',
                        '`validate_block_post_execution` — EVM が tx を実行した後に走る、計算済 post-state root を header 値と比較可能。',
                        'なし — state root は別 prover で外部 validate。',
                      ],
                      correctIndex: 2,
                      explanation: 'State root は実行 *後* にのみ存在。tx 全部を revm に流し、状態変更を適用、結果状態を merkle 化して計算。Pre-execution チェック (header 構造、gas limit 数学) が先; post-execution チェックに state root 比較含む。',
                    },
                    {
                      question: 'BFT コンセンサスで **3f+1** は何を意味し、なぜ tight か?',
                      options: [
                        'ブロックサイズ上限 — 3 tx と 1 coinbase。',
                        'f Byzantine を許容するために必要な最小総バリデータ数。Tight なのは、2 quorum は少なくとも 1 つの正直なバリデータで交わらなければならないため (Lamport 1982 の数学的証明)。',
                        '投票ラウンド数 — 3 phase + 1 commit。',
                        'コンセンサス税率 — stake の 3% + 1% 手数料。',
                      ],
                      correctIndex: 1,
                      explanation: '数学: n=3f+1 ノードのネットワークで、サイズ 2f+1 の 2 quorum は 2(2f+1)-n = f+1 ノードで重なる、少なくとも 1 が正直。基礎的 quorum-intersection 議論。PBFT から HyperBFT まで全 BFT システムが 3f+1 を仮定。',
                    },
                    {
                      question: "Reth ベース L1 への Malachite 埋め込みで、**Malachite の Driver / VoteKeeper / RoundStateMachine 分離** が重要な理由は?",
                      options: [
                        'プロトコルを非同期にする。',
                        "クリーン分離で **application は `Context` trait (ブロック型、validator set、署名方式) だけ実装** すればよく、Malachite が全プロトコルロジックを処理。Tendermint を書き直さず、配線する。",
                        'コンセンサスのゼロ知識証明を可能にする。',
                        "on-chain コンセンサスのガスコストを減らす。",
                      ],
                      correctIndex: 1,
                      explanation: 'アーキテクチャ的価値は API surface: Reth ベース chain がブロック型と validator set で `Context` を実装、Malachite の Driver が BFT プロトコル詳細を処理 (voting round、view change、timeout、2f+1 検知)。revm の `Database` trait と同じパターン — Malachite はコンセンサスにとって revm が実行にとってのもの。',
                    },
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
                  title: 'NodeBuilder コンセンサススロット — カスタムコンセンサスを配線',
                  slug: 'consensus-nodebuilder-slot-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 45,
                  content: `# NodeBuilder コンセンサススロット — カスタムコンセンサスを配線

Trait を読んだ。Malachite と bera-reth を見た。次は **配線する**。本レッスンでは、コンセンサスが Reth ベース chain に接続する実 NodeBuilder API 呼び出し箇所を歩く。終わりには新 L1 の統合をスケッチできるべき。

> 🛑 **スクロール前に予測。** Reth の NodeBuilder にカスタムコンセンサスを配線する。**ビルダーに渡す 4 つは?** (ヒント: trait impl、validator set、署名方式、もう 1 つ。)

## 1. Reth コンポーネントモデルでのコンセンサスコンポーネント

Inside Reth から — 6 つの NodeBuilder コンポーネント:

| コンポーネント | Trait | デフォルト |
| :--- | :--- | :--- |
| pool | \`PoolBuilder\` | Ethereum pool |
| network | \`NetworkBuilder\` | devp2p |
| executor | \`ExecutorBuilder\` | Ethereum executor |
| **consensus** | **\`ConsensusBuilder\`** | **\`EthBeaconConsensus\`** |
| payload | \`PayloadBuilder\` | Ethereum payload builder |
| add_ons | \`AddOns\` | None |

\`ConsensusBuilder\` スロットがカスタムブロック validation を差し込む場所。\`FullConsensus\` impl を生成、NodeBuilder がブロック処理中に呼ぶ。

## 2. Trait

\`\`\`rust
pub trait ConsensusBuilder<Node: FullNodeTypes>: Send {
    type Consensus: FullConsensus<Node::Primitives>;

    fn build_consensus(
        self,
        ctx: &BuilderContext<Node>,
    ) -> impl Future<Output = eyre::Result<Self::Consensus>> + Send;
}
\`\`\`

1 メソッド: \`build_consensus\`。ビルダーコンテキスト (chainspec、db、etc.) を受け取り、コンセンサス impl を返す。

これは \`PoolBuilder\`、\`PayloadBuilder\` などと **完全に同じ形**。パターンはフラクタル: 各コンポーネントが Builder trait を持ち、\`launch()\` 中にコンポーネントを生成。

## 3. 配線コード

\`\`\`rust
use reth_node_builder::{NodeBuilder, NodeHandle};
use reth_chainspec::ChainSpec;

// カスタムコンセンサス impl
pub struct TempoConsensus {
    validator_set: TempoValidatorSet,
    chain_spec: Arc<ChainSpec>,
}

impl<B: Block> Consensus<B> for TempoConsensus {
    type Error = ConsensusError;

    fn validate_block_pre_execution(&self, block: &SealedBlock<B>) -> Result<(), Self::Error> {
        // Tempo 固有の pre-execution チェック:
        // - proposer が validator set にいるか?
        // - 署名は valid か?
        // - round 番号は正しいか?
        todo!()
    }
    // ... 他メソッド
}

// カスタムビルダー
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

// ノードに配線
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

それだけ。**コンセンサスカスタマイズは 1 ビルダー、1 impl、1 配線呼び出し**。Reth SDK の他すべてと同じ形。

> 🛑 **理解度チェック。** このコードのどこで **2f+1 quorum チェック** が実際に起きているか? **追跡**。「TempoConsensus」なら不正解。Reth の Consensus trait は *ブロック* を validate するもので、票ではない。投票は別の場所。どこ?

投票は **consensus client** (Malachite、CometBFT、またはカスタムエンジン) で起こる。Reth の \`Consensus\` trait は **合意後** のブロックを validate — 投票は走らせない。2f+1 チェックは Reth の上流。

## 4. Consensus client 側 — Engine API 呼び出し

Reth (EL) が Engine API を公開。Consensus client (CL) が呼ぶ:

\`\`\`rust
// Consensus client 内 (Malachite 駆動、カスタム、その他)
// Malachite Driver がブロックを決定した後:

async fn on_decide(block: TempoBlock, engine_api: EngineApiClient) -> Result<()> {
    // Reth に「これが新 head、validate して」と伝える
    let payload_status = engine_api
        .new_payload_v4(block.to_execution_payload())
        .await?;

    if payload_status.status == PayloadStatus::Valid {
        // Reth に「これは finalized、ここまで prune 可能」と伝える
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

CL が Engine API 経由で Reth を駆動。Reth は \`TempoConsensus\` impl でローカル validate。**両者は JSON-RPC で通信**、標準 Ethereum の Lighthouse ↔ Reth と全く同じ。

## 5. 全体像

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

2 プロセス、1 chain。Reth が実行 + ストレージ + EVM を処理。Malachite が投票 + ordering を処理。Engine API が両者を接続。

> 🔍 **リポで探す。** Reth の [\`crates/rpc/rpc-engine-api\`](https://github.com/paradigmxyz/reth/tree/main/crates/rpc/rpc-engine-api) を開き \`engine_newPayloadV4\` を見つける。Payload 受信時の動作を追跡。**操作の順序は?**

## 6. エラーパス — validation 失敗時

\`TempoConsensus::validate_block_pre_execution\` がエラーを返すなら、Reth は:

- ブロックを reject (\`PayloadStatus::Invalid\` を返す)
- CL にブロックが invalid と伝える
- CL は view-change し、別の proposer を見つける必要がある

**ブロック validation エラーがコンセンサス liveness 回復をトリガー**。critical — validation は決定論的 (毎回同じ答え) でなければ違うバリデータが意見を異にして split-brain になる。

## 7. 本番考慮事項

\`Consensus\` impl がホットパスで走る:

- ブロックは毎回ミリ秒で validate しなければならない
- 慎重にアロケート (ブロックごとに heap を churn しない)
- Validator set のルックアップをキャッシュ
- BLS or 閾値署名検証、バリデータごとに naive ECDSA でなく

Tempo ~30 バリデータで BLS 検証 ~5ms。Hyperliquid ~20 でさらに高速。Headroom が重要。

## 8. 練習

スケッチ (コンパイル不要):

1. \`TempoValidatorSet\` — どんなフィールドが必要? (start with: アドレス、voting weight、BLS pub key)
2. \`TempoConsensus::validate_header\` — 必須 3 チェックは?
3. 起動シーケンス — \`TempoNode\` は chainspec からどう validator set をロードする?

> 最終チェック: 一文で、**票** (2f+1 検知) を validate するのは — Reth、consensus client、両方? **答えに EL/CL 線が明確でないなら §3 を再読**。`,
                },
                {
                  title: '最小の単一リーダー BFT を Rust で作る',
                  slug: 'consensus-minimal-bft-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 20,
                  xpReward: 50,
                  content: `# 最小の単一リーダー BFT を Rust で作る

Trait は見た。Malachite は読んだ。次は **実 L1 を出荷できる最小のコンセンサス** を作る。本レッスンは近道: **すべての L2 sequencer と Tempo クラス L1 が launch 時に実際にやっていること** — 中央集権リーダー、その後で漸進的に分散化。

> 🛑 **スクロール前に予測。** Hyperliquid、Tempo、全 OP Stack chain、Arbitrum — **launch 時に全部が走らせているコンセンサスは?** HotStuff ではない。Tendermint でもない。(ヒント: 両者より単純。)

## 1. 単一リーダー / 中央集権 sequencer パターン

ほぼすべての新 chain が **1 つの信頼された sequencer** で launch:

- 全ブロックの proposer 役を所有
- ブロードキャスト前にブロックを validate
- 緊急停止権限を持つ
- 「後で」分散化する計画

これがなぜ動くか:

- **Liveness**: 単一障害点だが view change 不要
- **速度**: 1 round trip = ブロック確定
- **シンプル**: validator set 管理なし、slashing 基盤なし、2f+1 ロジックなし

なぜ初期受け入れ可能か:
- Chain にまだ攻撃価値がない (低 TVL)
- 分散化はロードマップで launch 要件ではない
- より速く出荷

Hyperliquid はこの方式で launch。Tempo もほぼ確実にこの方式で launch。**自分も同じ**。

## 2. アーキテクチャ

\`\`\`
[Mempool] → [Sequencer]  → [Reth EL] → [Network broadcast]
              │  │ │
              │  │ └─ ECDSA でブロック署名
              │  └─ Tx 順序選択
              └─ ブロック構築
\`\`\`

Sequencer の 3 仕事:
1. **構築**: tx 選択、順序付け、timestamp 設定
2. **署名**: 「sequencer から来た」の暗号証明
3. **ブロードキャスト**: Engine API 経由で Reth EL に送る + P2P 経由で他ノードに送る

それだけ。投票なし。Quorum なし。

## 3. 最小 Rust impl

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
        // 1. 現 head 上に payload 構築を Reth に依頼
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

        // 3. 構築済 payload を取得
        let payload = self.engine_api.get_payload_v4(payload_id).await?;

        // 4. Payload hash に署名 (authority 証明)
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

        // 7. Peer にブロードキャスト (P2P、図示なし)
        self.broadcast(signed_block).await?;

        Ok(())
    }

    async fn current_forkchoice(&self) -> eyre::Result<ForkchoiceState> {
        // 現 head をローカルで追跡 or EL クエリ
        todo!()
    }

    async fn broadcast(&self, signed: SignedPayload) -> eyre::Result<()> {
        // P2P ブロードキャスト (libp2p、devp2p、カスタム — 選択)
        todo!()
    }
}
\`\`\`

合計 ~100 行。**これが動く sequencer**。\`block_period\` ごとにブロックを生成、ECDSA で署名、ブロードキャスト。

## 4. コンセンサス側 (受信側の validation)

他ノードは署名済ブロックを受け取り、カスタム \`Consensus\` impl で validate:

\`\`\`rust
impl<B: Block> Consensus<B> for CentralizedConsensus {
    fn validate_block_pre_execution(
        &self,
        block: &SealedBlock<B>,
    ) -> Result<(), ConsensusError> {
        // 唯一の「コンセンサス」チェック: sequencer 署名か?
        let signature = block.sequencer_signature()?;
        let signer = signature.recover_address(&block.hash())?;

        if signer != self.expected_sequencer {
            return Err(ConsensusError::InvalidSequencer);
        }

        // 標準 Ethereum 系チェック
        self.validate_basic_block(block)?;

        Ok(())
    }
    // ...
}
\`\`\`

**コンセンサスロジック 3 行**: signer 復元、期待値と比較、間違ったら reject。残りは標準 EVM validation。

> 🛑 **理解度チェック。** 「でもこれはただの信頼権威 — コンセンサスではない」**部分的に正しい**。これは IS コンセンサス — 単一決定 (次ブロック) への合意。ただ **単一決定者** がいる。自分の言葉で言い直す。なぜ「単一リーダーコンセンサス」もコンセンサスか?

なぜならコンセンサスは「単一の値への合意」だから。1 決定者なら、値は決定者が言うもの。トレードオフは **信頼仮定** (1 正直 sequencer) を **liveness** (view change 不要) と引き換え。Launch には受け入れ可能; 分散化進行で漸進的に緩める。

## 5. 分散化のステップ 1: 2-of-3 multisig sequencer

単一署名者から multisig へ:

\`\`\`rust
pub struct MultisigSequencer {
    signers: Vec<PrivateKeySigner>,  // 3 署名者
    threshold: usize,                 // = 2
    engine_api: EngineApiClient,
}

impl MultisigSequencer {
    async fn produce_block(&self) -> eyre::Result<SignedPayload> {
        // 1. リード署名者 (rotate) が payload 構築
        let payload = self.build_payload().await?;

        // 2. 2-of-3 署名者から署名を集める
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

Validation は **2-of-3 署名** をチェック。これが:

- HA を追加: 3 のうち任意の 2 がブロック生成可能
- Liveness モードを追加: 1 が down でも他 2 が生成し続ける
- まだ Byzantine 耐性なし (署名者が正直と仮定)

経済シフト: 2-of-3 multisig は **大抵の本番 L2 の launch パターン**。Optimism、Arbitrum、Base — 全部こんな感じで launch、multisig 鍵はチーム + 監査人 + ノードオペレータが持つ。

## 6. 分散化のステップ 2: 適格性付きリーダーローテーション

**Proposer ローテーション** を追加:

\`\`\`rust
fn current_proposer(slot: u64, validator_set: &[Address]) -> Address {
    validator_set[(slot as usize) % validator_set.len()]
}
\`\`\`

各 slot で違うリーダー、決定論的に選ばれる。リーダーが slot を逃したら (timeout 内にブロックなし)、**次のリーダーが引き継ぐ**。

これが **ローテーションリーダー付き single-slot finality** — ほぼ real BFT だが実際の 2f+1 票なし。

完全 BFT への跳躍に欠ける piece: リーダーを accountable に保つ実票。それが Tendermint/HotStuff への跳躍 (Malachite が与える)。

## 7. 現実的な L1 launch シーケンス

大抵の L1 はこのステージを通る:

| ステージ | コンセンサス | 分散化 | TVL safety |
| :--- | :--- | :--- | :--- |
| **Day 0** | 単一 sequencer | なし | チームを信頼 |
| **Month 3** | 2-of-3 multisig | 3 オペレータ | 2-of-3 セットを信頼 |
| **Month 12** | ローテーション proposer | ~10 バリデータ | 1 つでも up なら liveness |
| **Year 2** | 実 BFT (Tendermint/HotStuff) | 30+ バリデータ | 2/3+ Byzantine 耐性 |

**Day 0 で L1 を出荷可能** — その後で漸進的に分散化。Tempo と Hyperliquid はおそらく今日 stage 2-3、stage 4 を年単位で計画中。

## 8. 練習

コード追跡 (実行不要):

1. \`SignedPayload\` struct を書く (sequencer 署名付きカスタムブロックエンベロープ)
2. \`CentralizedConsensus::validate_block_pre_execution\` を書く — 完全 ECDSA 署名復元 + 比較
3. \`current_forkchoice\` をスケッチ — ローカルで現 head をどう追跡?
4. 考える: Mempool はどこに住む? (ヒント: sequencer ではない — 別コンポーネント。)

> 最終チェック: 一文で、「単一リーダーコンセンサス」が L1 launch に正当かつ十分な理由は? **答えが「信頼仮定を明示 + 漸進的に緩める」でないなら §4 と §7 を再読**。`,
                },
                {
                  title: 'バリデータ経済 — slashing、報酬、攻撃ベクター',
                  slug: 'consensus-validator-economics-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 17,
                  xpReward: 45,
                  content: `# バリデータ経済 — slashing、報酬、攻撃ベクター

コンセンサスプロトコルは半分が暗号、半分が経済。暗号は「証拠を残さずに矛盾するメッセージに署名できない」と言う。**経済** は「不正の証拠コストが不正から得られる利益を上回る」と言う。本レッスンは経済層。

> 🛑 **スクロール前に予測。** Ethereum mainnet は ~$50B+ staked。**finality に 51% 攻撃を試みるドル単位コストは?** (正確な数字不要 — 計算をスケッチ。) なぜこれが PoS の **security 議論** か?

## 1. 経済的セキュリティ議論

BFT システム向け:

- 攻撃はバリデータ stake の **> 1/3** (liveness 停止) または **> 2/3** (safety 違反) を必要
- Stake は double-sign or surround-vote 検出時に **slash** される
- 攻撃コスト = **検出時の失う stake**
- 攻撃利益 = 抽出可能価値

**Security**: 必要 stake > 抽出可能価値。

Ethereum で $50B staked、finality 攻撃は ~$33B の stake が必要。Slashing 罰則は **full $33B**。経済合理的な攻撃者はいない; 失う額が獲得可能額を超える。

これが **経済的セキュリティ**: 攻撃が非合理だからプロトコルは安全。

## 2. 2 つの slash 可能違反

Slashing をサポートする任意の BFT システムで:

### 2.1 Double-signing (equivocation)

\`\`\`
バリデータ V が Vote(block_A, round_5) に署名
バリデータ V が Vote(block_B, round_5) に署名
\`\`\`

両方が同じラウンドで V によって署名。**暗号的に証明可能** — 2 署名を持つ誰でも slashing proof を構築可能。

罰則: バリデータが stake の **一部または全部** を失う。

### 2.2 Surround voting

\`\`\`
バリデータ V が Vote(source: epoch_3, target: epoch_5) に署名
バリデータ V が Vote(source: epoch_4, target: epoch_6) に署名
\`\`\`

2 つ目の票が 1 つ目を **surround** する (後 source、後 target)。これは特に Casper FFG で safety 違反。暗号的に証明可能。

罰則: double-signing と類似。

> 🛑 **理解度チェック。** なぜ surround voting は slash 可能で、連続 epoch での通常投票はそうでないか? **構造的違いは?** Lesson 3 §3 を必要なら再読。

## 3. Slashing proof

Slashing proof は **2 つの矛盾する署名済メッセージ**。それだけ。提出フロー:

\`\`\`mermaid
sequenceDiagram
    participant Watcher as Slashing Watcher
    participant Chain as Reth EL
    participant State as State

    Watcher->>Watcher: V から 2 つの署名済票を観測
    Watcher->>Watcher: 両署名を検証
    Watcher->>Chain: SlashTransaction(vote_a, vote_b)
    Chain->>State: On-chain で proof を検証
    State->>State: V の stake を slash
    State->>Watcher: Whistleblower 報酬を支払い (小%)
\`\`\`

3 性質がこれを動かす:
1. **検出はパーミッションレス**: ネットワーク監視中の誰でも proof を提出可能
2. **検証は暗号的**: chain が 2 署名を検証、oracle 不要
3. **報酬は小**: 監視 incentive に十分、false report (検証失敗) incentive には不十分

## 4. Slashing 数学 — どれだけ slash?

2 設計:

### 4.1 フラット slash

文脈に関わらず stake の固定% を slash。シンプル。Ethereum の最小 slash は単一違反で **1 ETH**。

推論が楽。多数バリデータが一緒に slash する (協調攻撃) 場合は不十分。

### 4.2 相関 slashing

**同 window 内で何バリデータが slash したか** に比例して slash。Ethereum がこれ:

\`\`\`
slash_amount = (slashed_stake / total_stake) * stake * multiplier
\`\`\`

\`slashed_stake\` は最近 window 内全 slash バリデータの stake。1 バリデータが単独 slash なら罰則小。バリデータの 33% が一緒に slash (協調攻撃) なら罰則 **壊滅的** — full stake。

**これが協調攻撃に対する経済的 moat**。小さな偶発 slash は小コスト; 実攻撃は全コスト。

> 🔍 **リポで探す。** [Ethereum consensus spec](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md)、「slashing」または「process_slashing」検索。正確な公式がそこに。**Multiplier は?**

## 5. 報酬 — 他半分

バリデータは earn する:

- **ブロックごと報酬**: 小定数
- **Attestation 報酬**: head に正しく投票
- **Finality 報酬**: finality 投票に参加

正常動作バリデータの年率: Ethereum mainnet で ~3-5%。Slashing リスクと比較:

- 偶発 slash の確率: 保守的に走らせば非常に低
- 偶発 slash のコスト: ~1 ETH 最小
- 32 ETH で年間 earnings: ~1 ETH

つまり 1 つの偶発 slash で 1 年分の earnings が消える。**経済 incentive は慎重であること**、攻撃ではない。

## 6. 攻撃ベクター

悪意あるバリデータが試みうるもの:

| 攻撃 | 効果 | 防御 |
| :--- | :--- | :--- |
| **Double-sign** | 同 height で 2 ブロックに署名し fork choice を混乱 | Slashing |
| **Surround vote** | 2 矛盾 checkpoint を finalize に投票 | Slashing |
| **Long-range attack** | 古い期間のバリデータを買収して履歴書き換え | Weak subjectivity (client は最近の状態を信頼) |
| **51% finality attack** | Stake の 2/3+ 取得、全部に署名 | ETH で経済コスト > $33B; TVL で不可能 |
| **Liveness attack** | Stake の 1/3+ 取得、投票拒否 | Chain 停止; safety 妥協なし |

最初の 3 つは **slash 可能** = 経済的に非合理。最後 2 つは **過半数資本** 要 = 経済的に極端。

最現実的な攻撃: **liveness 停止** with 1/3+。正直 staking からの収入を失うが、stake は失わない。一部攻撃者は政治的理由 (e.g., 国家強制) で合理的に行うかも。

> 🛑 **予測。** 国家が ETH stake の 35% を取得し投票拒否。**Ethereum に何が起こる?** 追跡: liveness、finality、最終ユーザ応答。

Ethereum は finalization 停止。Tip は生成し続ける (LMD-GHOST は動く)。~13 日後、プロトコルの **inactivity leak** が発動 — 非参加バリデータが stake を徐々に失う、参加 stake が 2/3+ に戻るまで。Chain は finalize 再開、非参加バリデータは大量罰則。

美しい設計: 1/3+ 攻撃でも **一時停止のみ**、chain を永続破壊しない。

## 7. 自分のカスタム L1 向け

Tempo or Hyperliquid 向け slashing 設計:

- **Validator set サイズ**: 小 = 攻撃協調が容易、より厳しい slashing 必要
- **Slash 額**: 攻撃から理論的に抽出可能な最大値を超えるべき
- **Whistleblower 報酬**: 1-5% が標準
- **Inactivity 罰則**: 検閲耐性が欲しいなら必要

Hyperliquid ~20 バリデータでバリデータごとの非常に高 stake 要件 + 重 slashing。Tempo ~30-50 で類似パターン。

## 8. Launch 問題 — Day 1 で slashing?

L1 を slashing 有効で launch すべき?

**有効論**: Day 1 から経済的セキュリティ、「我々を信頼」期間なし
**反対論**: Slashing ロジックのバグは壊滅的、validate に時間が必要

**よくあるパターン**: **有効化するが上限低く** launch。正直バリデータを破産させずに実バグを catch。信頼蓄積で上限を上げる。

Hyperliquid は slashing 付き launch。OP-Stack chain は notoriously slashing なし (まだ分散化バリデータ set なし)。Tempo はおそらく少なくとも soft な slashing で launch。

## 9. 練習

仮想 L1 で計算:

1. Validator set サイズ: 50
2. バリデータごとの stake: $10M
3. 総 stake: $500M
4. 攻撃あたり最大抽出可能価値 (推定): $200M
5. **必要 slash %**: ? (抽出可能価値を超えねばならない)

抽出可能価値が $400M (大規模取引決済) に急騰したら? Slashing がカバーする?

> 最終チェック: 一文で、なぜ **slashing** が BFT コンセンサスの経済基盤か? **答えに「攻撃コスト > 攻撃利益」がなければ §1 を再読**。`,
                },
                {
                  title: 'ファイナルクイズ: L1 コンセンサスを作る',
                  slug: 'consensus-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 50,
                  content: `# ファイナルクイズ: L1 コンセンサスを作る

最終コンセンサスチェック。Tempo クラスの L1 を出荷するのに必要。`,
                  quizQuestions: [
                    {
                      question: '新規決済特化 L1 (Tempo クラス) のコンセンサスを設計中。バリデータ数: 30。Finality 目標: 1 秒未満。**どのコンセンサス系統** と **なぜ**?',
                      options: [
                        'Nakamoto PoW — 実戦検証済、分散化。',
                        'Ethereum 系ハイブリッド PoS — ベストプラクティス、大 validator サポート。',
                        '純粋 BFT 系 (Tendermint or HotStuff) — 30 バリデータは sweet spot、BFT が即時 finality を与え、決済ユースケースは決定論的決済を要求。',
                        '単一 sequencer — 最速、最シンプル。',
                      ],
                      correctIndex: 2,
                      explanation: 'ハイブリッド PoS (選択肢 2) は 30 バリデータには過剰 — 直接 BFT 可能で finality gadget は不要。PoW (選択肢 1) は finality 犠牲。単一 sequencer (選択肢 4) は launch には動くが「コンセンサス設計」ではない。30 バリデータでの純粋 BFT は教科書通り — Hyperliquid は ~20 でこれ、Tempo も類似のはず。',
                    },
                    {
                      question: "Reth の `Consensus` trait の **目的** と、明示的にしないことは?",
                      options: [
                        '投票プロトコルを走らせる — Reth は内部 BFT を持つ。',
                        'ブロックを chain ルールに対し validate (pre-execution 構造、post-execution state root、gas 数学)。Head 選択 / fork choice はしない — それは consensus client の仕事 (Ethereum なら Lighthouse、Tendermint chain なら Malachite、L1 ならカスタム)。',
                        'バリデータに代わってブロックに署名する。',
                        'Validator set を管理する。',
                      ],
                      correctIndex: 1,
                      explanation: 'EL/CL 分離: Reth (EL) がブロックを validate; CL がどのブロック上に積むか決定 (fork choice) し投票走らせる。これは標準 Ethereum (Reth + Lighthouse) もカスタム L1 (Consensus impl + Malachite/CometBFT/etc.) も同じ分離。',
                    },
                    {
                      question: '中央集権 sequencer L1 を最速で出荷したい。Sequencer コードがブロックごとに行う 3 つは?',
                      options: [
                        '2f+1 投票収集、その後署名、その後ブロードキャスト。',
                        'Payload 構築 (tx 選択 + 順序付け)、結果ブロック hash に署名 (authority 証明)、Engine API 経由で Reth + P2P 経由で他ノードにブロードキャスト。',
                        'バリデータ票を待つ、署名を集約、その後 commit。',
                        '価格 oracle にクエリ、margin 決済、その後ブロック作成。',
                      ],
                      correctIndex: 1,
                      explanation: '単一リーダー BFT = 投票なし。3 仕事: 構築 (Engine API forkchoiceUpdated + PayloadAttributes 経由)、署名 (ブロック hash を ECDSA signer)、ブロードキャスト (Engine API + P2P)。Lesson 10 §3 で Rust ~100 行。',
                    },
                    {
                      question: 'Tendermint/HotStuff で validator set は有界 (~20-100)。**どの構造的制約** がこの上限を駆動?',
                      options: [
                        'ディスク容量 — 各バリデータが chain 状態を保存。',
                        '通信複雑度: PBFT はブロックあたり O(n²) メッセージ; 閾値署名付き HotStuff でもラウンドあたり O(n)。ネットワーク帯域 + レイテンシで n が実用上 ~100-200 に上限。',
                        'トークン供給 — より多くのバリデータ用のトークンが足りない。',
                        '法的 — 1 プロトコルに 100 エンティティ超過は不可。',
                      ],
                      correctIndex: 1,
                      explanation: 'ネットワークがボトルネック。PBFT n² メッセージ = n=100 で 10k メッセージ、n=1000 で 1M。HotStuff O(n) で助かるが帯域 + レイテンシで実用最大は依然上限。Ethereum 系ハイブリッド PoS は fork choice (毎 slot、サンプリングベース) と finality (毎 epoch、フル参加) を分離してこれを解決。',
                    },
                    {
                      question: 'なぜ **slashing** が BFT 経済的セキュリティの荷重を担う基盤か?',
                      options: [
                        'Slashing はインフラを走らせるバリデータに報酬を支払う。',
                        '不正行為のコスト (失う stake) が攻撃の利益 (抽出可能価値) を超えるため、攻撃が経済的に非合理になる。Slashing なしではバリデータは無代償で矛盾するメッセージに投票可能 — プロトコルの safety 保証が蒸発する。',
                        'Slashing がブロック生成を速くする。',
                        'Slashing は EVM の機能、コンセンサスではない。',
                      ],
                      correctIndex: 1,
                      explanation: '暗号が不正を証明; slashing がそれを costly にする。Slashing なしでは Byzantine バリデータが double-sign に無代償 — プロトコルの 3f+1 境界が無意味になる。Slashing が「double-sign すべきでない」を「double-sign を経済的に賄えない」に変える。',
                    },
                    {
                      question: "Malachite が Driver / VoteKeeper / RoundStateMachine を分離。**Reth ベース L1 に Malachite を embed する時に何ができる**?",
                      options: [
                        'Reth と違うマシンで Malachite を走らせる。',
                        '`Context` trait (ブロック型、validator set、署名方式) だけ実装 — Malachite が全 Tendermint プロトコルロジック (投票、quorum、view change、timeout) を処理。Tendermint を書き直さず、配線する。これは revm の `Database` trait と同じパターン: あなたが substrate を提供、エンジンがプロトコルを処理。',
                        'Rust コードを書かずに Malachite を使う。',
                        '2f+1 quorum チェックをスキップ。',
                      ],
                      correctIndex: 1,
                      explanation: 'Malachite がプロトコル提供; あなたの `Context` impl が chain 固有型提供。完全 BFT 保護 L1 への統合コード ~100 行、Tendermint を自分で書いたら ~10000 行と比較。これが「Rust BFT エンジンを使う」アーキテクチャ的勝ち。',
                    },
                    {
                      question: 'Berachain はカスタマイズ済 Reth ディストリビューション **bera-reth** を出荷。**vanilla Reth の何 % を実際に変更**?',
                      options: [
                        '~95% — Proof-of-Liquidity は完全に違う chain。',
                        '~10% — Reth の大半は再利用。カスタマイズは ~2000 行: カスタム Consensus impl、流動性報酬用カスタム executor hook、カスタム chainspec、BLS 認識 validator set 追跡。',
                        "~50% — Reth の EVM が PoL 用に書き直しを要する。",
                        '0% — bera-reth はただの config file。',
                      ],
                      correctIndex: 1,
                      explanation: 'Expert Module 3 の headline でも: Reth ベース chain は *拡張* で作られ、fork ではない。bera-reth の vanilla Reth に対する diff は小さいが consensus-critical。Tempo の node crate 出荷時に同じパターン。',
                    },
                    {
                      question: 'L1 を launch する。Day 0 コンセンサス: 単一 sequencer。**最初の 2 年で現実的な分散化軌跡** は?',
                      options: [
                        '無期限に単一 sequencer。',
                        '単一 sequencer (Day 0) → 2-of-3 multisig sequencer (Month 3) → ローテーション proposer with ~10 バリデータ (Month 12) → full BFT with 30+ バリデータ and slashing (Year 2)。各ステップが liveness を保ちつつ漸進的に Byzantine 耐性を追加。',
                        '直接 Day 1 で 1000 バリデータ PoS に跳ぶ。',
                        '分散化はマーケティング懸念、技術ではない。',
                      ],
                      correctIndex: 1,
                      explanation: '実 L1 はこの軌跡を follow: 信頼で速く出荷、TVL と運用が成熟したら漸進的に信頼仮定を緩める。Hyperliquid、Tempo、全 OP-Stack chain — 全部このバージョン。プロトコル設計は in-place upgrade を許すが、コンセンサス設計は最初から軌跡を accommodate しなければならない (e.g., header フォーマットに「validator set 証明」を 1 signer 起点でも含めるべき)。',
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
