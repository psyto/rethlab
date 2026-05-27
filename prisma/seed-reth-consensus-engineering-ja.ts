import { PrismaClient } from '@prisma/client';

export async function seedRethConsensusEngineeringJA(prisma: PrismaClient) {
  const tags = ['reth', 'consensus', 'bft', 'pos', 'hotstuff', 'hyperbft', 'l1', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-consensus-engineering-ja',
      title: 'Consensus Engineering — Reth で L1 のコンセンサスを作る',
      description:
        '「reth を読める」から「L1 を出荷できる」までの最大のギャップを埋めるコース。コンセンサスは Rust EVM スタックの残りの層 — DB、VM、ネットワーク、並行性 — を **ひとつのチェーンとして束ねる** 層。コンセンサス理論を一から (BFT、safety/liveness、FLP)、Rust 製コンセンサスエンジンの実コード (reth の Consensus trait、Malachite、bera-reth の Proof-of-Liquidity) を読み、Reth ベース chain にカスタムコンセンサスを配線する。HyperBFT を読んで Tempo クラスの L1 を出荷する準備ができる。',
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

午前 3 時。30 ノードの chain で、1 バリデータが矛盾する 2 つのブロックに同時に署名した。他のバリデータは両方に投票している。Chain は split-brain。**まず何を見にいくか?** なぜこれが起こりうるのか — コンセンサスがそもそもどんな故障を生き延びるための仕組みなのか — のメンタルモデルがなければ、次の 8 時間を当てずっぽうで過ごすことになる。

本レッスンでそのモデルを作る。故障モード、safety/liveness の分割、そして FLP (1985 年の不可能性定理) がなぜ「完璧な」コンセンサスを数学的に不可能にするか。

> 🛑 **スクロール前に予測。** 3 ノード A、B、C が単一の値に合意しなければならない。**どこで何がうまくいかなくなり得るか?** 異なる故障モードを 4 つ列挙。(ヒント: 「ネットワークが遅い」だけではない。)

## 1. 問題定義

複数ノード、1 つの決定。全員が決めなければならない:

- **同じ値** — A が「yes」、B が「no」と決めたらシステムは split-brain
- **提案された値** — 誰も「42」について話していないのに、勝手に「42」で合意できない
- **いつかは** — 「気が向いたら」ではなく、ある有限時間内に

この 3 つが順に **safety**、**validity**、**liveness**。これらはタダでは手に入らない — 任意のネットワーク条件下で 3 つすべてを同時に得ることはできない。コンセンサス研究の分野全体が、どのユースケースに対してどのトレードオフなら許容できるかを見極めることに費やされてきた。

## 2. 想定すべき故障モード

| 故障 | 意味 | 例 |
| :--- | :--- | :--- |
| **Crash** | ノードが応答停止する。それだけ。 | バリデータマシンの電源リセット |
| **Omission** | ノードが選択的にメッセージを落とす | パケットロス、意図的検閲 |
| **Network partition** | ノードの一部が他のノード集合に到達できない | 海底ケーブル切断、AWS リージョン障害 |
| **Byzantine** | ノードが嘘をつく。矛盾するメッセージを送る。A と ¬A の両方に署名する | バリデータ鍵の侵害、バグ |

古典文献ではこれらをまとめて「fault」と呼ぶ。**Byzantine** ケース (Byzantine 将軍問題から命名 — 嘘も含めて任意に振る舞うノード) が最も難しい。故障ノードが **積極的に敵対的** だからだ。Crash + omission は相対的に扱いやすい。

> 🛑 **予測。** 4 ノードがある。1 つが Byzantine。**コンセンサスを保ったまま許容できる Byzantine の最大数 f は?** (下に答えがあるが、まず予測すること。有名な結果。)

答えは **f < n/3**。4 ノードなら 1 Byzantine。7 ノードなら 2 Byzantine。**f 個の Byzantine を許容するには常に 3f+1 ノードが必要**。これは数学的に厳密な結果であり、設計選択ではない。Lamport、Pease、Shostak が 1982 年に証明している。

## 3. Safety vs liveness

コンセンサスプロトコルが約束する 2 つの性質:

- **Safety**: 「絶対に意見が割れない」。A が x を決め、B が y を決めたら、x = y。**正しさ** のこと。
- **Liveness**: 「いつかは決定する」。有限時間内に valid な決定がなされる。**進捗** のこと。

**非同期ネットワークかつ Byzantine 故障下で、両方を無条件に確保することはできない**。これが FLP 不可能性定理 (1985) の核心。

各プロトコルが選ぶ妥協:

| プロトコル系統 | 分断時に犠牲にするもの |
| :--- | :--- |
| **古典 BFT** (Tendermint、HotStuff、HyperBFT) | **Liveness**: 分断中は停止、絶対に分岐しない |
| **Nakamoto** (Bitcoin、ETH 1.0 PoW) | **Safety**: 生成を続ける、一時的に分岐しうる |
| **Ethereum PoS** (Casper FFG + LMD-GHOST) | **ハイブリッド**: tip は liveness、古いブロックは finality |

safety、liveness、fault tolerance、同期仮定なし — この 4 つすべてを兼ね備えるプロトコルは存在しない。**いずれか 1 つを必ず犠牲にする**。

> 🛑 **理解度チェック。** 「Bitcoin は絶対に停止しない」。「Bitcoin は BFT である」。**両方とも技術的には間違い** だが、間違い方が違う。**Bitcoin が実際に犠牲にしているのはどの性質で、それはいつか?** 「何も犠牲にしていない、Bitcoin は最高」と答えたなら §2 に戻る。

## 4. FLP 不可能性 — 創始的結果

**Fischer、Lynch、Paterson (1985)**: 完全非同期ネットワークで少なくとも 1 つの crash 故障がある場合、**どんな決定論的プロトコルもすべての実行で safety と liveness の両方を保証することはできない**。

この結果について 3 点注意:

1. **非同期** — メッセージ遅延に上限なし。現実のネットワークは完全非同期ではなく、しばしば eventually-bounded な遅延を仮定できる。
2. **1 crash** — Byzantine ですらない。crash-only な故障でも FLP は適用される。
3. **決定論的** — ランダム化プロトコルは FLP を確率的に回避できる。

実プロトコルが FLP を抜け出す手段:

- **タイムアウト** (同期仮定): メッセージが T 秒以内に届かなければ送信者は crash したとみなす。これで同期的フォールバックが成立する。
- **ランダム性** (確率的 finality): Bitcoin の proof-of-work はランダム性でリーダーを選出する。finality は確率的であり、絶対ではない。
- **View change** (一時的に liveness を諦める): BFT プロトコルはリーダー故障時に進捗を一時停止し、その後再開する。

実プロトコルはどれも少なくとも 1 つの脱出経路を使っている。

> 🛑 **予測。** Tendermint はタイムアウトと view change を使う。Bitcoin はランダム性を使う。Ethereum PoS は **両方** 使う。**なぜ両方必要なのか? それぞれが他方では実現できない何を Ethereum にもたらすのか?**

## 5. 3f+1 ルール、直感的に

なぜ正確に **3f+1** か。代数の前に直感を押さえる。

投票を行うとする。**f ノードは嘘をつくかもしれない**。次の条件を満たす quorum (「合意とみなす」票数) が必要:

- quorum 内で f Byzantine が過半数を形成できない大きさ
- 2 つの quorum が **少なくとも 1 つの正直なノード** で交わる (そうでなければ x と ¬x の両方を決定可能になる)

quorum サイズを q、ノード総数を n とすると:

- 2 quorum は **2q - n** ノードで重なる
- 重なりは少なくとも 1 つの正直なノードを含む: **2q - n > f**
- 重なり内の正直なノード (q - f) が Byzantine を上回らねばならない: **q - f > f**、よって q > 2f、よって q ≥ 2f+1
- 代入すると **2(2f+1) - n > f**、よって **n > 3f**、よって **n ≥ 3f+1**

これがあらゆる BFT システムの土台にある代数。**CometBFT、HotStuff、HyperBFT、Casper FFG** — すべて 3f+1 を前提とし、これを下回ると壊れる。

> 🛑 **理解度チェック。** Ethereum には約 100 万のバリデータがいる。**f はいくつか? このスケールでの「Byzantine」とは何を意味するのか?** 答えに「報酬で買収された/侵害された/その両方によってプロトコルに反する動きをするバリデータ」が含まれていなければ、脅威モデルがまだ身についていない。

## 6. 自分の L1 への含意

Tempo を作る。コンセンサスを選ぶ。すぐに 4 つの問いにぶつかる:

| 問い | 答えを決める要因 |
| :--- | :--- |
| **バリデータは何人にするか?** | 分散化目標 vs レイテンシ予算 |
| **同期か非同期か?** | サブ秒 finality は同期タイムアウト仮定を必要とする |
| **分断時に何を犠牲にするか?** | 決済 → 停止 (BFT)。Mainnet ETH → 分岐 (Nakamoto 風)。|
| **Slashing か純粋経済か?** | Slashing は分岐検知を必要とする。純粋経済は staking のみ。 |

Tempo (おそらく): ~30 バリデータ、同期、BFT (分断時停止)、slashing。Hyperliquid: ~20 バリデータ、同期、HotStuff 系、slashing。

**プロトコル選択はビジネスモデルから導かれる**。コードを書く前にトレードオフを整理しておく。

## 7. 練習

1. [Lamport の原典](https://lamport.azurewebsites.net/pubs/byz.pdf) (1982) を読む — §1 と §2 のみで十分、それ以外は密度が高い
2. なぜ 3f+1 が tight (3f では不可) なのかを紙にスケッチする
3. Ethereum PoS で FLP 脱出が使われている箇所を 3 つ挙げる

> 最終チェック: 一文で、「Bitcoin は 3f+1 を必要としない」がなぜ 3f+1 ルールの反例にならないか? **Bitcoin が chain weight で投票を代替できるようにするために犠牲にしているものは何か?** 答えに「確率的 finality」が出てこなければ §3 を再読。`,
                },
                {
                  title: '3 つのコンセンサス系統 — PoW、PoS、古典 BFT',
                  slug: 'consensus-three-families-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# 3 つのコンセンサス系統 — PoW、PoS、古典 BFT

Bitcoin、Ethereum、Hyperliquid はすべてコンセンサスを走らせている。誰一人として同じ系統を選んでいない。それぞれが前レッスンの 4 軸の不可能性 (safety / liveness / 故障耐性 / 同期仮定なし) に対して違うトレードオフを取った — そしてその 1 つの選択が chain のすべてを決めた。スループット、レイテンシ、バリデータ数、slashing の意味論、さらには誰がバリデータになれるかまで。

本レッスンでは 3 系統の地図と、それぞれが要するコストを示す。

> 🛑 **スクロール前に予測。** 決済レール (Tempo) を作る。100 万バリデータよりサブ秒 finality のほうが重要。**どの系統を選ぶか? なぜ Bitcoin の系統は即座に脱落するのか?**

## 1. 3 系統を一望

| 系統 | 例 | Finality | スループット | Validator set | 犠牲にするもの |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nakamoto / PoW** | Bitcoin、ETH 1.0 | 確率的 (~6 ブロック) | ~7 tps (BTC) | パーミッションレス maker | エネルギー、finality 時間 |
| **純粋 BFT** | Tendermint、HotStuff、HyperBFT | 即時 (1-2 RTT) | 高 (>1000 tps) | 有界 (~20-150) | Validator set 制約、分断時 liveness |
| **ハイブリッド PoS** | Ethereum 2.0 | 最終的 (~13 分) | 中 | 大 (~100 万) | 複雑さ、ガジェットのオーバーヘッド |

各系統は 1 つの軸で勝ち、他の軸で負ける。**ただ飯はない**。仕事は、どの損失が自分の chain で許容できるかを見極めること。

## 2. Nakamoto / PoW — 原点

**仕組み**: マイナーがハッシュパズルを競って解く (ブロックの SHA-256 ハッシュが先頭 N ビットゼロになる nonce を探す)。最初に解いた者が次のブロックを提案する。他のマイナーはその上に積むことで「投票」する。最長の chain が勝つ。

これで得られるもの:

- **パーミッションレス**: ハードウェアがあれば誰でも採掘可能
- **Validator set 不要**: 鍵管理なし、slashing 基盤なし
- **確率的 finality**: k ブロック後、reorg の確率は指数的に低下
- **分断下の liveness**: 各分断はブロックを作り続け、再結合時に整合させる

これが要求するコスト:

- **エネルギー**: ハッシュパズルが電力を燃やす
- **即時 finality なし**: ~10 分 × 6 confirmation = 1 時間 (高額 tx の場合)
- **Slashing なし**: 悪意あるマイナーはハッシュパワーを失うだけで、経済的な処罰はない
- **低スループット**: 10 分に 1 ブロック × 小ブロック = 7 tps

> 🛑 **理解度チェック。** 「Bitcoin は過半数によるコンセンサス」 — **間違い**。Bitcoin は chain weight (累積仕事量) によるコンセンサス。この違いがなぜ重要か? 言葉にできないなら longest-chain ルールを理解できていない。

**評定**: PoW は、耐検閲性とパーミッションレス性が finality 時間より重要な chain 向け。**2026 年の新規 L1 はまず PoW を選ばない**。Tempo は選ばない。Hyperliquid は選ばない。あなたも選ばない。

## 3. 古典 BFT — L1 アーキテクトのデフォルト

**仕組み**: 有界バリデータ委員会 (典型的には 20–150、ID は事前に既知)。リーダーがブロックを提案する。委員会が投票する。2/3+ が yes なら、ブロックは即座に確定する — confirmation を待つ必要はない。

古典的な参照:

- **PBFT** (Castro & Liskov、1999) — 基礎論文。3 ラウンドのプロトコル (pre-prepare、prepare、commit)。ブロックあたり O(n²) メッセージ。
- **Tendermint** (Buchman、2014) — view change を加えて実用化。Cosmos、CometBFT で使用。
- **HotStuff** (Yin et al.、2018) — 閾値署名で O(n) メッセージに圧縮。Diem (旧 Libra)、HyperBFT で使用。

鍵となる発明: **2/3+ 過半数** と **3f+1 バリデータ** が、メッセージがタイムアウト内に届く十分な同期の下で safety と即時 finality の両方を与える。

これで得られるもの:

- **即時 finality**: 1〜2 ラウンドトリップ = 数秒
- **Slashing**: バリデータが署名 → double-sign を暗号的に証明 → stake を slash
- **高スループット**: 並列バリデータ、決定論的スケジュール
- **予測可能なレイテンシ**: 良好な条件下でサブ秒

これが要求するコスト:

- **有界 validator set**: ブロックあたり O(n²) または O(n) メッセージという制約から、実用上 n は ~100-200 が上限
- **分断時の liveness 停止**: 2/3+ の票が集まらないと chain は停止する
- **中央集権リスク**: 有界 validator set は (実質的に) パーミッションド

> 🛑 **予測。** 5 大陸に 100 BFT バリデータ。**finality レイテンシの下限は?** (ヒント: 光速、メッセージラウンド。) これが BFT を本質的に地域的にする理由は?

光速で地球を一周すると約 140 ms。2 ラウンドの投票で最小 ~300 ms。実 BFT chain はバリデータを低レイテンシな地域に集めてサブ秒に収める。

**評定**: 古典 BFT は、finality > バリデータ数となる新規 L1 のデフォルト。**Hyperliquid (HotStuff 派生)、Tempo (おそらく Tendermint か HotStuff 系)、ほとんどの app-chain**。

## 4. ハイブリッド PoS — Ethereum の道

**仕組み**: 2 つのプロトコルを重ねる。

- **Fork choice** (LMD-GHOST): 各ブロックでバリデータが head に attestation を出す。stake 加重で attestation が多い chain が勝つ。これは Nakamoto 風 — 確率的、finality なし。
- **Finality gadget** (Casper FFG): 32 スロット (1 epoch) ごとに、stake の 2/3+ が checkpoint を finalize する投票を行う。これは BFT — checkpoint に即時 finality がつく。

なぜハイブリッドなのか? Ethereum は **~100 万バリデータ** を抱える。純粋 BFT は 100 万にはスケールしない (O(n) メッセージ = ブロックあたり 100 万署名)。ハイブリッドで得られるもの:

- 大きな validator set (大委員会 = 分散化)
- 確率的な head 追跡 (高速だが最終ではない)
- ~13 分ごとの eventual finality (古いブロックに BFT 風の保証)

これで得られるもの:

- **最大級の分散化**: どの L1 よりも大きな 100 万バリデータ規模
- **両者の良いとこ取り**: 高速な tip + finality
- **スケールでの経済的セキュリティ**: $50B+ がステークされ、slashing が効く

これが要求するコスト:

- **複雑さ**: 仕様が膨大
- **遅い finality**: 最小 13 分 (2 epoch)
- **スロット単位の liveness ≠ finality**: ブロックが head になっても finality 前に reorg されうる

> 🛑 **理解度チェック。** 「Ethereum は BFT」 — **半分正しく、半分間違い**。どこが? Ethereum は **finalized** ブロックには BFT だが **unfinalized** ブロックには Nakamoto 風。この区別は consensus-critical。なぜ Ethereum は両方を必要とするのか?

**評定**: ハイブリッド PoS は、100 万以上のバリデータと finality の両方が必要なときの選択肢。**Ethereum 以外でこれを必要とする chain はほとんどない**。大抵の L1 は純粋 BFT を選ぶ。

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

Tempo: 100 バリデータ未満、即時 finality、パーミッションド (銀行/Paradigm 認可)。→ **純粋 BFT** (おそらく Tendermint 系)。

Hyperliquid: ~20 バリデータ、即時 finality、パーミッションド。→ **HotStuff 系** (実際にこれ — HyperBFT)。

Ethereum: 100 万バリデータ、eventual finality で可。→ **ハイブリッド PoS** (実際にこれ)。

> 🛑 **予測。** ある新 L1 が「高 TPS のため AlephBFT、その上に finality gadget」と言う。**どの系統? gadget は何のためか?** 「AlephBFT」にピンと来なければ調べる — Aleph Zero などで使われるランダム化 BFT。

## 6. rethlab が与えるもの

Reth の \`consensus\` コンポーネントスロットで、ノードとして **どの系統でも** 出荷できる:

| 系統 | Reth 統合 |
| :--- | :--- |
| PoW | \`EthBeaconConsensus\` (PoW config 付き、legacy) |
| PoS (ハイブリッド) | \`EthBeaconConsensus\` — 標準 Ethereum |
| BFT | カスタム \`Consensus\` impl + カスタム block producer |

Lesson 5 で実物の \`Consensus\` trait を読み、Lesson 7 で Berachain がどう差し替えているかを辿る。

## 7. 練習

各 chain について、系統と具体的なトレードオフを 1 つ特定する:

1. Solana
2. Cosmos Hub
3. Avalanche (subnet)
4. Berachain
5. Hyperliquid

(答えは色々あってよい。重要なのは、公開された設計からトレードオフを読み取る筋肉。)

> 最終チェック: 一文で、Tempo がほぼ確実に Ethereum 風ハイブリッド PoS を選ばない理由は? **Tempo の何が、ハイブリッドを間違った選択にしているのか?** 「バリデータ数」「決済 finality 要件」が答えに出てこなければ §5 を再読。`,
                },
                {
                  title: 'Ethereum の PoS — Casper FFG + LMD-GHOST',
                  slug: 'consensus-ethereum-pos-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 18,
                  xpReward: 45,
                  content: `# Ethereum の PoS — Casper FFG + LMD-GHOST

Ethereum は *1 つの* コンセンサスプロトコルを走らせているわけではない。**2 つを重ねて** 走らせている。**LMD-GHOST** が「今 head はどのブロックか」を決め、**Casper FFG** が「何が実際に最終で reorg されないか」を決める。なぜ 2 つなのか? 100 万バリデータでネットワークを溶かさずに BFT 系の即時 finality を得るのは不可能 — かといって「何も最終に確定しない」chain も出荷できない。ハイブリッドはその妥協点。

本レッスンではハイブリッドを分解し、仕様を読んで各半分が何をしているか分かるようにする。

> 🛑 **スクロール前に予測。** Ethereum の slot time は 12 秒、epoch は 32 slot。**finality は最短 ~2 epoch**。実時間を計算してみる。なぜもっと速くしないのか — なぜ毎 slot finalize しないのか?

12 秒 × 32 slot × 2 epoch = **12.8 分**。次の 4 セクションでこの数字を説明する。

## 1. 2 つのプロトコル

| プロトコル | 役割 | 周期 | 出力 |
| :--- | :--- | :--- | :--- |
| **LMD-GHOST** | Fork choice — 「head は何?」 | 毎 slot (12s) | 確率的 head |
| **Casper FFG** | Finality gadget — 「何が最終?」 | 毎 epoch (~6.4 分) | 確定 checkpoint |

LMD-GHOST が継続的に動き、tip を選ぶ。Casper FFG は epoch 境界で動き、古いブロックを finalize する。両方とも同じ validator set — 約 100 万 ETH ステーカー — に依拠している。

## 2. LMD-GHOST を 60 秒で

**Latest Message Driven, Greedy Heaviest Observed Sub-Tree**。(長い名前は以下で分解する。)

各 slot でバリデータは 2 つのことをする:
1. **Propose** (自分の slot なら) — ブロックをブロードキャスト
2. **Attest** — どのブロックが head と思うか投票 (*attestation* はブロック名を含む署名済みメッセージ)

Fork choice 規則: **各ブロックについて、その subtree 内の attestation を (stake 加重で) 数える。最大重量の subtree を選ぶ**。

\`\`\`
Block A (slot N で提案)
├── Block B (slot N+1)        ← subtree で attestation 60%
│   └── Block D (slot N+2)
└── Block C (slot N+1、対立 fork)    ← attestation 40%
\`\`\`

chain は B を canonical として選ぶ。C は orphan。

鍵となる性質:

- **「Latest Message」**: 各バリデータの **最新の** attestation だけを数える (古い票を使った長期にわたる賄賂を防ぐため)
- **「Heaviest Sub-Tree」**: 直系の子ではなく subtree 全体の重量を数える (GHOST 部分 — uncle の認知にも重量を与える)

> 🛑 **理解度チェック。** 「LMD-GHOST は要するに longest-chain」 — **間違い**。LMD-GHOST は stake 加重の heaviest-subtree。この区別がなぜ重要か? heaviest-subtree が防ぐ攻撃で、longest-chain では防げないものは何か?

防ぐもの: **selfish mining**。Longest-chain では、30% のハッシュパワーを持つマイナーが秘密裏に chain を作って後から公開し、他者を orphan にできる。Heaviest-subtree は stake 加重の attestation を強制し、これをずっと困難にする。

## 3. Casper FFG を 60 秒で

**Friendly Finality Gadget**。

32 slot (1 epoch ≈ 6.4 分) ごとに、プロトコルは epoch の先頭を **checkpoint** として選ぶ。バリデータはどの checkpoint を justify するか投票する。

規則:
1. **Justification**: stake の 2/3+ が checkpoint を justify するために投票する
2. **Finalization**: justified な checkpoint は、**次の** checkpoint も justified になった時点で finalize される

つまり finality は最短 2 epoch。Finalize 後は:
- **Reorg できない** — finalized ブロックは永続的
- **Slashing でも取り消せない** — Byzantine バリデータも finality を undo できない

これがハイブリッドの BFT 半分。2/3+ ルールはまさに Lesson 1 の 3f+1 quorum。

> 🛑 **予測。** あるバリデータが double vote (同じ epoch 内で 2 つの異なる checkpoint に投票) を行う。**該当する slashing 条件は何か?** stake の何分の 1 が slash されるか?

これは **surround voting** または **double voting** — どちらも slash 可能。罰則は相関 slashing (同じ window 内で他にどれだけのバリデータが slash されたか) に依存する。最低: 1 ETH。最大: 多数のバリデータが同時に slash された場合は full stake (32 ETH)。

## 4. Slashing 条件

2 つの slash 可能な違反:

| 違反 | かたち | なぜ悪いか |
| :--- | :--- | :--- |
| **Double voting** | 同じ epoch で異なる checkpoint に 2 票を署名 | 矛盾する 2 checkpoint を split-finalize できてしまう |
| **Surround voting** | 票 A の後に、A を「surround」する票 B を署名 | fork なしで両方を有効にはできない |

数学的に言えば: **バリデータが double-vote も surround-vote もしないなら safety が証明できる**。だから slashing は攻撃を経済的に非合理にする — 試みること = 確実な stake 損失。

Slashing は **暗号的に検出可能**。slashing proof は誰でも chain に提出でき、対象バリデータの stake は自動的に焼かれる。信頼できる oracle は不要。

> 🛑 **理解度チェック。** Slashing は懲罰ではない — **経済的セキュリティ**だ。security の議論を自分の言葉で言い直してみる: なぜ slashing の存在が、理論上可能な攻撃を実用上不可能にするのか?

理由: 攻撃者は stake を取得 (数百万 ETH) し、それを **失う** 必要があるから。攻撃コスト > 抽出可能価値。Stake がセキュリティの担保になる。

## 5. Engine API — コンセンサスが実行に話す場所

Ethereum はノードを 2 プロセスに分割する: 投票プロトコルを走らせる **consensus client** (CL — Lighthouse、Prysm、etc.) と、EVM を走らせ状態を保存する **execution client** (EL — Reth、Geth、etc.)。両者は **Engine API** — Ethereum 仕様で定義され、同マシン上の 2 プロセス間でローカルに話される JSON-RPC インタフェース — で通信する。

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

3 つのメソッドが仕事を担う:

- **\`engine_forkchoiceUpdated\`** — CL から EL へ「chain head は X、finalized は Y、X の上にブロックを準備せよ」
- **\`engine_getPayload\`** — CL から EL へ「準備したブロックを渡せ」
- **\`engine_newPayload\`** — CL から EL へ「他の proposer から受け取ったブロックを検証せよ」

**Reth はこの EL 側を実装する**。ここがコンセンサス統合の接続点。

> 🔍 **リポで探す。** [reth の engine crate](https://github.com/paradigmxyz/reth/tree/main/crates/engine) を開き、\`engine_newPayload\` ハンドラを見つける。**VALID を返す前に EL がディスクにコミットするものは何か?** 追跡する。

## 6. 自分の L1 への含意

Tempo クラスの L1 を作るなら:

- **おそらく** Ethereum の CL は走らせない — 独自の validator set、異なる slot time、異なる finality 周期になる
- **おそらく** Reth 互換の Engine API は使う — 別の consensus client を差し替えられるように
- **絶対に** slashing の意味論は必要 — ただし自分の validator set サイズに合わせてカスタマイズする

Ethereum ハイブリッドの 2 つの半分 (LMD-GHOST + Casper FFG) は、新規 PoS chain の **メンタルモデル** になる。おそらく単純化する (100 万バリデータではないので gadget の分離は不要) が、**slashing + 2/3+ quorum** という構造はそのまま移植できる。

## 7. 読み物

- [Ethereum consensus spec](https://github.com/ethereum/consensus-specs) — \`specs/phase0/beacon-chain.md\`
- [Vitalik の Casper FFG 論文](https://arxiv.org/abs/1710.09437) — 2017 の原典
- [Engine API 仕様](https://github.com/ethereum/execution-apis/blob/main/src/engine/specification.md) — JSON-RPC インタフェース

## 8. 練習

紙にスケッチする:

1. 競合する 2 つの checkpoint — gadget はいつ片方を finalize するか?
2. Slashing proof — どんなデータが入っているか? なぜそのデータで十分なのか?
3. ネットワークから新ブロックが来たときの CL→EL ハンドシェイク

> 最終チェック: 二文で、「Ethereum の finality は 13 分」がバグではない理由 — 13 分が 1 秒の BFT finality にない何を引き換えに得ているか? **答えに「スケールでのバリデータ分散化」が出なければ、本レッスン §1 と前レッスン §3 を再読**。

> 🛣️ **もう一つの道 (Solana):** Solana のコンセンサスは **Tower BFT + Proof-of-History (PoH)** — Gasper とは根本的に違う賭けに出ている。Tower BFT は PBFT の変種で、バリデータの投票が *検証可能なクロック* (PoH — SHA256 のハッシュチェーンで構成された決定論的なタイムライン) にアンカーされる。バリデータは「先に時間に合意してから投票する」のではない; PoH そのものが時間であり、投票はその上の点を参照する。結果: ファイナリティ ~400ms (Ethereum の ~13 分に対して)、ただしバリデータのハードウェア要求がずっと高く、スロットごとに単一リーダーモデルになる (スロットごとの委員会なし、約 100 万バリデータプールなし)。Gasper はスケールでの permissionless なバリデータ参加のためにレイテンシを犠牲にする; Tower BFT はバリデータプールのサイズをエンドユーザのレイテンシのために犠牲にする。どちらも有効な BFT の答えで、選択はチェーンが何を最適化するか — 開かれた参加 vs サブ秒ファイナリティ — に従う。`,
                },
                {
                  title: 'HotStuff と HyperBFT — 単一リーダー BFT 系統',
                  slug: 'consensus-hotstuff-hyperbft-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 17,
                  xpReward: 45,
                  content: `# HotStuff と HyperBFT — 単一リーダー BFT 系統

Hyperliquid は秒間約 20 万件の perp 取引をサブ秒 finality で処理する。その下のコンセンサスが **HyperBFT** — そして HyperBFT は奇抜な新設計ではない。HotStuff の variant である。HotStuff (2018) はさらに PBFT (1999) の派生で、この系統全体が、即時 finality を要する現代のほぼすべての非 Ethereum L1 の選択肢になっている。

Hyperliquid は HyperBFT をオープンソース化していない。しかし HotStuff は公開されており、それを読むことが HYPE の下で実際に走っているものに最も近い参照になる。

> 🛑 **スクロール前に予測。** PBFT (1999) はブロックあたり O(n²) メッセージ。HotStuff (2018) は O(n)。**n = 100 バリデータでこの 10000 倍のメッセージ削減を可能にした変更は何か?** (ヒント: 暗号。)

## 1. PBFT — 親

Castro & Liskov (1999)。誰もが最初に学ぶプロトコル。3 ラウンドからなる:

\`\`\`
Round 1 (Pre-prepare): リーダー → 全バリデータ:「ブロック B」
Round 2 (Prepare):     全 → 全:「B に投票した」
Round 3 (Commit):      全 → 全:「B を commit する準備ができた」
\`\`\`

Round 3 の後、バリデータは commit する。3 ラウンドトリップ × n² メッセージ (round 2 と 3 が all-to-all) = **合計 n²**。

n = 100 で 1 ブロックあたり 10,000 メッセージ。n = 1,000 で 100 万。スケールしない。

> 🛑 **理解度チェック。** 全員がリーダーに送り、リーダーが集約するだけではなぜダメか? **どんな攻撃が開いてしまうか?** 「Byzantine リーダーが誰がどう投票したか嘘をつける」が答えに含まれなければ Lesson 1 §3 を再読。

## 2. HotStuff — ブレークスルー

Yin、Malkhi、Reiter、Gueta、Abraham (VMware、2018)。2 つの発明がある。

### 2.1 閾値署名

各バリデータが全員に署名を送る代わりに、**閾値暗号** (典型的には BLS — k 人の異なる署名者からの部分署名を「k 人が署名した」として検証できる 1 つの短い署名に数学的に結合できる署名方式) を使う:

- 2f+1 バリデータがそれぞれ部分署名を生成
- 部分署名は **サイズ O(1) の 1 つの集約署名** にまとめられる — 4 署名者を表しても 400 署名者を表しても同じバイト数
- リーダーは集約だけをブロードキャストする、n 個の個別署名ではない

これで n² → n に通信が圧縮される。リーダーが集約署名 1 つを配り、バリデータ同士が直接やり取りする必要はない。

### 2.2 Pipelined commit

「Prepare」と「Commit」を 1 つのパイプラインに統合する。新ブロックがフェーズを通過しながら、複数のブロックが異なるフェーズで同時並行に進む:

\`\`\`
Block N:   Propose → Vote → Commit
Block N+1:           Propose → Vote → Commit
Block N+2:                     Propose → Vote → Commit
\`\`\`

スループットは 3 ブロック時間に 1 commit ではなく、1 ブロック時間に 1 commit になる。

> 🛑 **予測。** Byzantine リーダーが不正なブロックを提案する。**HotStuff では、プロトコルがいつそれを検知してリーダーを切り替えるか?** スクロールする前に 3 つのフェーズを頭の中で追ってみる。

**Propose** フェーズの後、2f+1 のバリデータが yes 投票しなければ、次のリーダーが **view change** によって引き継ぐ。不正な提案は破棄される。Liveness は 1 ラウンド余計に使うだけで回復する。

## 3. HotStuff の派生

系統は進化してきた:

| Variant | 年 | 主な変更 |
| :--- | :--- | :--- |
| **Basic HotStuff** | 2018 | 原典 — 3 フェーズ、pipelined |
| **Event-driven HotStuff** | 2019 | フェーズ間が非同期 |
| **DiemBFT** | 2020 | Diem (現在は廃止) で使用 |
| **HyperBFT** | 2023 | Hyperliquid で使用 |
| **Aptos BFT** | 2022 | Aptos で使用 |

パターン: 各 variant は特定のデプロイに向けて最適化されている。**HyperBFT** は低レイテンシな単一地域のバリデータクラスタ向けに、orderbook 取引のホットパスを最適化したものと推測される。

> 🔍 **研究で探す。** arXiv で「HotStuff」を検索し、2020 年以降の variant を見る。それぞれが特定の最適化を加えている。**それぞれが何を最適化しているのか?** これが設計空間の地図になる。

## 4. HyperBFT — 公開情報

Hyperliquid のホワイトペーパーと技術ブログから分かること:

- **HotStuff 派生**: 明示的に言及されている
- **約 20〜25 バリデータ**: 有界委員会
- **サブ秒 finality**: 実用上 1 ラウンドトリップ
- **EVM 統合**: HyperEVM が orderbook と並列で実行され、両者が同じコンセンサスで commit される

公開 **されていない** (推測するしかない) もの:
- 正確な pipelining の深さ
- リーダーローテーション方針 (ラウンドロビン? stake 加重? ランダム化?)
- View change の詳細
- ネットワーク最適化 (カスタムトランスポート? バッチング?)

Tempo (Paradigm) はまだホワイトペーパーが出ていないが、系統はほぼ確実に同じ (HotStuff か Tendermint 系 — どちらも親戚)。

## 5. 必ず押さえるべき HotStuff の不変条件

3 つの性質が HotStuff を駆動する:

### 5.1 Quorum certificate (QC)

**QC** = 「2f+1 バリデータがブロック B に投票したことの証明」。1 つの集約署名。検証コストは低い。

すべての commit は **QC に裏付けられている**。有効な QC 付きのブロックが見えれば、2f+1 が合意したと分かる。

### 5.2 View 番号

プロトコルは **view** 単位で動く。View k には指定リーダーがいる。リーダーが Byzantine または到達不能なら、view が k+1 に切り替わる (新しいリーダー)。各 view は独自の QC chain を持つ。

### 5.3 Lock

2f+1 バリデータがブロックに「lock」した (phase 2 で投票した) 後、次のリーダーはそのブロックを含めるか、含められないことの証明 (より高い QC 経由) を出すかのいずれかでなければならない。これが **view change 中の safety 違反を防ぐ**。

> 🛑 **理解度チェック。** 「Lock は fork を防ぐ」 — **部分的に正しい**。Lock が防ぐのは **矛盾する commit** であって、fork そのものではない。Byzantine リーダーは矛盾するブロックを提案できるが、lock はそのうち 1 つだけが commit されることを保証する。この区別を自分の言葉で言い直す。

## 6. Hyperliquid の文脈 — なぜ特に HotStuff か

Hyperliquid は **perp DEX**。コンセンサス設計は次のことに資する必要がある:

- **高い orderbook 更新率**: バリデータが orderbook 状態に合意し、それが毎ブロック変わる
- **低レイテンシ**: トレーダーは 1 秒未満の confirmation を求める
- **有界 validator set**: 高スループットには少数の高速バリデータが必要
- **EVM 共存**: HyperEVM が並列で走り、同じ finality 保証を受ける

HotStuff が適合する理由:
- 有界委員会で低レイテンシを実現
- QC の検証コストが低い (orderbook コードが包含を高速に検証できる)
- Pipelining = 高スループット

Tendermint との比較: Tendermint のほうが単純だが pipelining は積極的でない。スループットでは HotStuff が勝つ。

## 7. 練習

各 chain について、コンセンサス系統と設計選択を 1 つ特定する:

1. Hyperliquid (HotStuff 派生) — レイテンシのための有界 validator set
2. Aptos (Aptos-BFT、HotStuff 派生) — スループットのための DAG ベース mempool
3. Sui (Bullshark + Narwhal、DAG ベース) — 順序付けと実行を分離
4. Cosmos Hub (Tendermint) — HotStuff より単純、スループットは低め
5. Solana (PoH + Tower BFT) — clock ベース、シーケンス駆動 (別系統)

## 8. 読み物

- [HotStuff 論文](https://arxiv.org/abs/1803.05069) — 2018 の原典
- [Hyperliquid ホワイトペーパー](https://hyperliquid.gitbook.io/hyperliquid-docs/about-hyperliquid) — 公開情報
- [DiemBFT 仕様](https://developers.diem.com/docs/technical-papers/the-diem-blockchain-paper/) — 本番 HotStuff variant (廃止プロジェクトだが公開文書あり)

> 最終チェック: 一文で、Hyperliquid のような chain で HotStuff が PBFT より優れている理由は? **「速い」だけなら掘り下げる — 具体的な構造的変更を名指しで挙げる**。必要なら §2 を参照。`,
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

Reth のソースを開く。「PoS」で検索する。ほとんど何も出てこない — なぜなら **Reth は PoS も BFT もまったく実装していないから**。その仕事は consensus client (Lighthouse、Prysm、自前エンジン) 側にある。では「Hyperliquid は Reth で動く」「Berachain は PoL のために Reth を fork した」と言うとき、実際に触っているコンセンサスの接合面は何か?

答えは 1 つの trait — **\`Consensus\`**。任意のコンセンサスエンジンが Reth の実行パイプラインに接続するための統合点。Hyperliquid のノードも、Tempo のノードも、すべての Reth ベース chain がこの trait を実装する。

> 🛑 **スクロール前に予測。** Reth はコンセンサスレイヤから来るブロックを検証する必要がある。**EVM が tx を実行する前に、どんなチェックが走るべきか?** 4 つ列挙。(ヒント: 暗号的、構造的、時間的、そしてコンセンサス固有のもの 1 つ。)

## 1. Reth のどこにコンセンサスが住むか

Reth のアーキテクチャは関心事を分割している:

| レイヤ | 責務 | コンポーネント |
| :--- | :--- | :--- |
| **実行** | tx を走らせ、post-state を生成 | revm + executor |
| **ストレージ** | ブロック、状態、receipt を永続化 | MDBX (Reth に組み込まれたキー値ストア) |
| **ネットワーク** | peer からブロックを受信 | devp2p (Ethereum の P2P トランスポート) |
| **コンセンサス** | chain ルールに照らしたブロックの正当性を検証 | \`Consensus\` trait |

注意: **Reth の \`Consensus\` trait は chain head を選ばない**。それは consensus client の仕事 (Lighthouse、Prysm、またはカスタム)。Reth の仕事は受け取ったブロックを **検証する** こと — ルール通りに作られているか?

役割分担: head 選択 (CL) vs ブロック検証 (EL としての Reth)。

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

3 メソッド、検証の 3 フェーズ。**実行される順序で読む**(上の trait 定義の宣言順ではなく、ランタイムで走る pre → 構造 → post の順序):

### \`validate_block_pre_execution\` — tx 実行前

EVM 実行が不要な、安価なチェック:

- Transaction root が header と一致するか
- Receipt root が header と一致するか (receipt 適用後)
- Block hash が well-formed か
- Block サイズが上限内か
- Timestamp が未来に行き過ぎていないか

高速。1 ミリ秒未満。明らかに壊れたブロックを EVM サイクルに入る前に弾く。

### \`validate_body_against_header\` — 構造的整合性

Body と header が互いに一致していなければならない:

- Header の transactions root == merkle 化された tx リスト
- Withdrawals root == merkle 化された withdrawal リスト
- Ommers hash == uncle リストの hash (legacy)

これは **暗号的な紐付け**。Body と header が一致しなければブロックは malformed — 署名後に誰かが改竄したということ。

### \`validate_block_post_execution\` — EVM 実行後

ガス使用量、post-state、receipt が分かった状態でチェックする:

- Header の gas used == 実行中に計算された gas
- Header の state root == 計算された post-state root
- Receipts root == merkle 化された receipt
- Logs bloom == 集約された bloom

これが **コンセンサスクリティカルなチェック**。fork が state root を誤って計算していたら、ここで mainnet から分岐することになる。

> 🛑 **理解度チェック。** なぜ state root の検証は pre-execution ではなく post-execution なのか? **pre-execution が知らず、post-execution が知っているものは何か?** 答えられなければ本レッスン §2 を再読。

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

Header の検証は **body の検証から分離** されている:
- Header は先に到着する (fast sync 中)
- Header は body なしで検証可能
- ライトクライアントは header だけあればよい

Tempo や Hyperliquid 向け: 自分の \`HeaderValidator\` 実装が「この proposer はこの slot の選出リーダーか?」をチェックする場所になる。これが BFT 固有のチェック。

## 4. デフォルト実装 — Ethereum 用

Ethereum mainnet 向けに、Reth は \`EthBeaconConsensus\` を提供する (\`crates/ethereum/consensus\`)。Engine API の契約を検証する:

- ブロックが正しい形であること
- 実行後の state root が一致すること
- Gas limit が parent の ±1/1024 以内 (EIP-1559 の弾性境界)
- BaseFee が EIP-1559 の公式に従っていること
- Timestamp が単調増加していること

**PoS の検証はしない** — それは CL の仕事。Reth は、CL が proposer 署名、slot の適格性、attestation などをすでに検証済みであると信頼する。

> 🔍 **リポで探す。** \`crates/ethereum/consensus/src/lib.rs\` を開き、\`EthBeaconConsensus::validate_block_post_execution\` を見つける。**具体的に何をチェックしているか?** スクロール前に自分のリストを作ってみる。

## 5. Tempo / Hyperliquid 向け — 何が変わるか

BFT コンセンサス付きのカスタム L1 では次を override する:

- **\`HeaderValidator\`**: proposer 署名の検証、validator set への包含、view/round 番号
- **\`validate_block_post_execution\`**: コンセンサス固有の post-state チェックを含める (例: HyperEVM の orderbook 状態)
- **Slashing 関連フィールド**: header が slashing 証拠を含む場合は暗号的に検証

構造は変わらない。**trait を書き直すわけではない** — 異なる実装を提供して Reth の NodeBuilder に配線する。

## 6. NodeBuilder スロット

Inside Reth から (既に見たはず):

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

\`MyCustomConsensus\` が \`Consensus<N::Block>\` を実装する。NodeBuilder がそれをブロック検証に配線する。これで完了。

これはカスタム payload builder、カスタム EVM config などと同じパターン — **コンセンサスは 6 つあるコンポーネントの 1 つ**。

## 7. 練習

新しいターミナルで:

\`\`\`bash
git clone https://github.com/paradigmxyz/reth
cd reth
\`\`\`

そして:

1. \`crates/consensus/consensus/src/lib.rs\` を開いて \`Consensus\` trait の全体を読む
2. \`crates/ethereum/consensus/src/lib.rs\` を開いて実装を見つける
3. 数える: \`EthBeaconConsensus\` は何個のメソッドを override し、いくつをデフォルトのまま使っているか?
4. \`validate_block_post_execution\` が呼び出される唯一の場所を見つける (メソッド名で検索)

> 最終チェック: 一文で、Reth の仕事 (\`Consensus\` 実装) と consensus client の仕事の境界はどこか? **答えに「head 選択 vs ブロック検証」が出なければ §1 を再読**。`,
                },
                {
                  title: 'Malachite を読む — Informal Systems の Rust-native BFT',
                  slug: 'consensus-malachite-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 18,
                  xpReward: 45,
                  content: `# Malachite を読む — Informal Systems の Rust-native BFT

Reth ベース L1 が Tendermint 系 BFT コンセンサスを必要とするとき、選択肢は 3 つ。(1) 自前で書く — 数か月の作業 + セキュリティリスク。(2) CometBFT (Go) にプロセス越しで委譲する — 醜いクロスプロセスの糊コード。(3) [\`informalsystems/malachite\`](https://github.com/informalsystems/malachite) を使う。CometBFT を作ったのと同じチームによる **Tendermint の Rust 書き直し** だ。本レッスンが存在するのは選択肢 3 のため。

Malachite は今学べる最も近い Rust-native な BFT エンジンであり、組み込みも最もクリーンな部類に入る。

> 🛑 **スクロール前に予測。** Tendermint はブロックあたり **3 つの投票ラウンド** を持つ: Propose、Prevote、Precommit。**各ラウンドで、バリデータは何を決定するのか?** 各ラウンドの入力と出力を列挙。

## 1. なぜ Malachite が存在するか

Informal Systems は CometBFT (Go) を作った。何年も Tendermint 派生 chain が出荷されるのを見てきた。彼らの結論はこうだ:

- **Rust ネイティブ** なコンセンサスが今や標準になっている (Reth、Lighthouse の再実装など)
- Go の参照実装は Rust chain に組み込みにくい
- **新しい高品質な Rust BFT エンジン** は公共財になる

Malachite はその結果。Tendermint にアーキテクチャ的に忠実で、エルゴノミクス的には Rust らしい。

リポ: [\`code/\`](https://github.com/informalsystems/malachite/tree/main/code) がメイン実装。

## 2. コアアーキテクチャ

3 つの差し替え可能なレイヤから成る:

\`\`\`mermaid
flowchart TB
    App["Application<br/>(自分の chain)"] -->|propose/validate| Driver["Driver<br/>(オーケストレータ)"]
    Driver -->|Vote keeper| VK["Vote Keeper<br/>(quorum ロジック)"]
    Driver -->|Round state machine| RSM["Round State Machine<br/>(Tendermint ルール)"]
    VK -->|2f+1 達成?| Driver
    RSM -->|次ステップ| Driver
\`\`\`

3 つのコンポーネントが明確に分離されている:

| コンポーネント | 責務 |
| :--- | :--- |
| **Driver** | オーケストレータ。メッセージを受け取り、vote keeper と RSM にディスパッチする。 |
| **Vote Keeper** | 票を集計する。2f+1 に到達したかを判定する。 |
| **Round State Machine** | Tendermint プロトコルそのもの — 状態遷移、view change。 |

Application は上から接続する。Malachite は「このブロックを提案せよ」「このブロックを検証せよ」のためにコールバックを呼ぶ。

## 3. Round State Machine — Tendermint のルール

Tendermint の心臓部をコードに落とし込んだもの:

\`\`\`rust
pub enum Step {
    NewRound,
    Propose,
    Prevote,
    Precommit,
    Commit,
}
\`\`\`

各ブロックラウンドで、バリデータは次のように遷移する:

1. **NewRound** → ラウンドに入り、自分が proposer かを判定する
2. **Propose** → proposer ならブロックをブロードキャストする。違うなら待つ。
3. **Prevote** → 提案ブロックに「yes」または「nil」を投票する。同じブロックへの 2f+1 prevote を *polka* と呼ぶ (Tendermint 用語で「次へ進むのに十分な第 1 ラウンドの支持」)。
4. **Precommit** → polka を見たら precommit をブロードキャストする。2f+1 precommit が揃った時点で **ブロックを commit**。
5. **Commit** → 確定、次の height へ

進行のためには **バリデータの 2/3 が各ラウンドで投票する必要がある**。投票が集まらなければ view change。

> 🛑 **理解度チェック。** なぜ投票が **2 ラウンド** (Prevote + Precommit) なのか、1 ラウンドではないのか? **2 ラウンド目が防いでいる攻撃は何か?** ヒント: Byzantine proposer が異なるブロックを異なるバリデータに送ったら何が起きるか?

2 ラウンド目は、**2f+1 のバリデータが同じブロックに合意した** ことを確認するためのものであって、単に投票したことを確認するためではない。1 ラウンドだけだと Byzantine リーダーが split-vote を仕掛けて、その後の commit を混乱させられる。2 ラウンド構造が **safety を保証** する。

## 4. Vote Keeper — quorum ロジック

\`\`\`rust
pub struct VoteKeeper<Ctx: Context> {
    height: Ctx::Height,
    threshold: ThresholdParam,
    rounds: BTreeMap<Round, RoundVotes<Ctx>>,
}
\`\`\`

Vote Keeper はラウンドごとに票を集計して追跡する:

- **ラウンドごと**: 候補ブロック別の prevote、候補ブロック別の precommit
- **Polka**: あるブロックに 2f+1 の prevote が集まった瞬間
- **Commit**: あるブロックに 2f+1 の precommit が集まった瞬間

公開 API:

\`\`\`rust
impl<Ctx: Context> VoteKeeper<Ctx> {
    pub fn add_vote(&mut self, vote: Ctx::Vote, weight: Weight) -> VoteKeeperOutput<Ctx::Value>;
    pub fn get_polka(&self, round: Round) -> Option<Ctx::Value>;
    pub fn get_commit(&self, round: Round) -> Option<Ctx::Value>;
}
\`\`\`

操作は 3 つ — 票の追加、polka の確認、commit の確認。**それだけ**。Tendermint の quorum ロジックがすべてこの struct に収まっている。

> 🔍 **リポで探す。** [\`code/crates/vote/src/lib.rs\`](https://github.com/informalsystems/malachite/blob/main/code/crates/vote/src/lib.rs) を開いて \`add_vote\` を追う。**何が何で加重されているか?** 2f+1 の閾値はどこから来ているか?

## 5. Driver — オーケストレータ

Driver はメッセージ (proposal、vote) を受け取り、Vote Keeper と RSM に流し、**output** (application が取るべきアクション) を発火する:

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

- ネットワークメッセージが来たら、app が \`Driver.process(Input)\` を呼ぶ
- Driver が \`Output\` アクションを返す:「これを提案せよ」「これに投票せよ」「決定が出た、このブロックを commit せよ」

クリーンなイベントループのパターン。app はホットループからこれを呼ぶ。

## 6. Application 側のインタフェース — 自分で実装するもの

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

**自分のブロック型** (Reth の \`Block\`)、**自分の validator set** (カスタム struct)、**自分の署名方式** (ECDSA、BLS など) で \`Context\` を実装する。

あとは Malachite の Driver がすべて処理する。ラウンド、投票、タイムアウト、view change。**Application 側は primitives を提供するだけ**。

## 7. Astria — Reth 上の実 Malachite 利用者

[\`astriaorg/astria\`](https://github.com/astriaorg/astria) は Reth ベースロールアップ向けの共有 sequencer を出荷しており、コンセンサスに **CometBFT** (Go 版 Tendermint) を使っている。Malachite に置き換え可能 — 同じプロトコルの別言語実装だ。

デプロイの形はこうなる:

\`\`\`
Application (Reth ベースロールアップ) ←→ Sequencer (CometBFT/Malachite) ←→ Validator set
\`\`\`

Astria は本番環境での「Reth + BFT コンセンサス」のオープンソース最良例。読む価値がある。

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

アーキテクチャ的にはそれだけ。Malachite がプロトコルを処理し、Reth との統合は前レッスンの consensus trait 経由で処理する。

## 9. 練習

1. \`informalsystems/malachite\` を clone する
2. \`code/crates/driver/src/driver.rs\` を開き、メインの \`process\` メソッドを見つける
3. 1 つの票を追跡する: 到着 → Vote Keeper → polka 検知 → RSM ステップ → output
4. 2f+1 が正確にチェックされる場所を特定する (具体的な関数が 1 つある — 見つける)

> 最終チェック: 一文で、Malachite が自分で書かずに済ませてくれるものは何か? **言葉にできなければ、組み込み準備の整った Rust BFT エンジンを持つ価値をまだ腹落ちさせていない**。`,
                },
                {
                  title: 'bera-reth を読む — Proof-of-Liquidity をコンセンサスのカスタマイズとして',
                  slug: 'consensus-bera-reth-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 15,
                  xpReward: 40,
                  content: `# bera-reth を読む — Proof-of-Liquidity をコンセンサスカスタマイズとして

「うちは違うコンセンサスを使っている」というピッチの大半は、結局トークン名を変えただけの PoS に落ち着く。Berachain の **Proof-of-Liquidity** (PoL) は珍しい例外で、誰が検証できるか、報酬がどこに流れるかを実際に変えている。そして実装 — [\`berachain/bera-reth\`](https://github.com/berachain/bera-reth) — は本番で動いており、Reth 上にあって、その差分は半日あれば読み切れる程度に小さい。

これが「コンセンサスを差し替える」の実用的な接合面。Reth 上の実カスタム L1 がどんな見た目になるかを知りたいなら、ここを学ぶべき。

> 🛑 **スクロール前に予測。** Ethereum PoS では **32 ETH をステークする** ことでバリデータになる。Berachain の PoL ではそれに相当するステップは何か? (ヒント: 「BGT をステークする」ではない。) **Berachain がバリデータに要求していて、Ethereum が要求していないものは何か?**

## 1. Proof-of-Liquidity が変えるもの

Berachain のピッチはこうだ:

- **PoS では**: バリデータはネイティブトークンをステークする。トークンの唯一の効用がステーキング。
- **PoL では**: バリデータは **BGT** (Bera Governance Token — Berachain の譲渡不能なガバナンス資産) をステークするが、BGT は **BEX (BeraSwap、Berachain ネイティブの AMM/DEX) に流動性を提供** することで得る。

連鎖はこうなる:
1. ユーザが BEX に流動性を提供 → BGT を得る
2. BGT をステーク可能 → バリデータ特権を得る
3. バリデータが手数料を得る → LP に報酬として戻る

これが **バリデータ経済を DEX 流動性に整合させる**。chain の最も活発なユーザ (LP) が、最も報酬的にも整合したバリデータでもあるという構造になる。

## 2. Ethereum PoS と同じままのもの

数多い。PoL は **PoS にひねりを加えたもの** であって、新しい系統ではない:

| 機能 | PoS | PoL | 同じ? |
| :--- | :--- | :--- | :--- |
| 有界 validator set | あり (~100 万) | あり (より小、例えば ~100) | 同じ構造 |
| Double-sign に対する slashing | あり | あり | 同じ |
| Finality gadget | Casper FFG | CometBFT 系 | 違うエンジン |
| ブロック時間 | 12s | ~2s | 違う |
| トークンモデル | 単一 (ETH) | 二重 (BGT + Bera) | 違う |

根本的なコンセンサスモデル (BFT 系 finality、slashing) は **同じ**。変わるのは:
- バリデータになれる人 (LP ベースのゲート)
- 報酬の流れ (ステークだけでなく LP にも戻る)
- ブロック時間 (より速い、~2s)

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

カスタマイズの要点 (Tempo や任意の Reth ベース L1 でも同じパターン):

### 3.1 \`consensus/\`

\`Consensus\` trait 実装が Berachain 固有のブロック性質を検証する:

- **proposer がアクティブな validator set にいるか** (LP ゲート)
- **ブロック timestamp が delta の範囲内か** (高速な 2s ブロックでは timestamp の境界が厳しい)
- **バリデータの署名方式**: ECDSA ではなく BLS 集約署名

### 3.2 \`evm/\`

PoL の経済用にカスタム precompile を用意する:

- **報酬分配 precompile**: ブロック commit 時に、ネイティブ報酬を LP に比例配分する
- **Validator registry precompile**: アクティブな validator set を on-chain で追跡する

どちらも executor の **pre-execution hook** — tx の前に走り、chain の状態を自動更新する。

> 🔍 **リポで探す。** bera-reth の \`evm/\` crate を開き、executor 実装を見つける。**各ブロックで最初の tx の前にどんな hook が走るか?** これが PoL 報酬の流れになる。

## 4. Chain spec — chain を「違うもの」にするもの

bera-reth の \`chainspec\` を見ると、仕様レベルで何が変わるかが分かる:

- **カスタム fork 高さ**: アップグレード用の独自 activation table
- **カスタム genesis**: BGT の事前 mint、バリデータの初期配分
- **カスタム precompile アドレス**: 予約アドレスでの PoL hook
- **カスタム base fee パラメータ**: 2s ブロック向けに調整

これは **構造的には Ethereum chainspec と同一** だが、**意味は違う**。自分のカスタム L1 も独自のバージョンを持つことになる。

## 5. コンセンサス統合を読む

次の順で読む:

1. \`bera-reth/consensus/src/lib.rs\` — \`Consensus\` 実装
2. \`bera-reth/node/src/lib.rs\` — NodeBuilder への配線
3. \`bera-reth/chainspec/src/lib.rs\` — どのプロトコルパラメータに依存するか
4. \`bera-reth/evm/src/lib.rs\` — このコンセンサスの下で走る executor hook

各ファイルは小さい (500 行未満)。**bera-reth をコンセンサスカスタマイズとして見たとき** の全体は、標準 Reth の上に約 2000 行。

これが見出し: **完全カスタム L1 は Reth へのカスタマイズ ~2000 行で済む** — Tendermint 系のコンセンサスエンジンさえ揃っていれば。仕事の大半はプロトコルの再実装ではなく統合だ。

> 🛑 **理解度チェック。** なぜ Berachain は標準 Reth + カスタムバリデータでなく bera-reth を必要とするのか? **bera-reth が持っていて、vanilla な Reth が持っていないものは?** 答えが「config」なら掘り下げる。コンセンサス固有のコードパスがある。

## 6. 自分の L1 への教訓

bera-reth を参照として学ぶ:

- 自分のカスタム chain crate ≒ bera-reth の crate 構造
- 自分の \`Consensus\` 実装 ≒ bera-reth のそれを自分の validator set ルールに置き換えたもの
- 自分の executor hook ≒ bera-reth の PoL hook を自分のビジネスロジックに置き換えたもの
- 自分の NodeBuilder 配線 ≒ bera-reth のそれを自分のコンポーネントに置き換えたもの

**bera-reth がテンプレートになる**。Tempo の node crate ([\`tempoxyz/tempo\`](https://github.com/tempoxyz/tempo)) は公開されており、同じ形を直接検証できる — ビジネスロジックは違う (PoL ではなく payments-priority) が骨格は同じだ。同じ「fork せず合成する」パターン: \`tempoxyz/reth\` は upstream に対して 0 commits ahead。

## 7. 練習

1. bera-reth を clone する (または GitHub 上で閲覧する)
2. Expert Module 3 で見た reth 本体の \`crates/optimism/\` のディレクトリ構造と比較する
3. PoL に最も特化したファイルを 3 つ特定する (別の L1 向けに最もカスタマイズが必要になる箇所)
4. 推定する: bera-reth を fork して Tempo 系 L1 を作るなら、何を変えて何を残すか?

> 最終チェック: 一文で、「Reth 上にカスタム L1 をどう出荷するか?」の構造的な答えは? **「Consensus trait の実装 + カスタム executor hook + NodeBuilder への配線」以上のものを答えていたら過剰**。`,
                },
                {
                  title: 'クイズ: コンセンサス内部を読む',
                  slug: 'consensus-reading-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# クイズ: コンセンサス内部を読む

本モジュールで読んだ内容の短いテスト。**雰囲気で答えない** — 各設問は具体的なソースファイルか設計選択に対応する。`,
                  quizQuestions: [
                    {
                      question: "Reth の `Consensus` trait と Lighthouse のような consensus client の **構造的な違い** は?",
                      options: [
                        '同じもの — Reth は内部にコンセンサスエンジンを含む。',
                        "Reth の `Consensus` trait はブロックを chain ルールに対して **検証** する。Lighthouse のような consensus client は fork choice を通じてどのブロックを head にするかを **選択** する。EL/CL 境界で交差する 2 つの異なる仕事。",
                        "Reth の `Consensus` はネットワーク層で動き、consensus client はアプリケーション層で動く。",
                        'Reth は RocksDB を使い、consensus client は MDBX を使う。',
                      ],
                      correctIndex: 1,
                      explanation: 'EL/CL 分離が基本。Reth (EL) はブロックを検証する — このブロックはルールに従っているか? Lighthouse (CL) は決める — 次にどの有効ブロックの上に積むべきか? カスタム L1 では **CL** (例えば Malachite) **と Reth の Consensus 実装** の両方を差し替える。',
                    },
                    {
                      question: 'Tendermint で、投票が **2 ラウンド** (Prevote、その後 Precommit) になっていて、1 ラウンドでないのはなぜか?',
                      options: [
                        '性能 — 2 ラウンドは 1 ラウンドより並列化しやすい。',
                        '最初のラウンド (Prevote) はバリデータがブロックを見たことを確認する。2 ラウンド目 (Precommit) は 2f+1 が **同じ** ブロックを見たことを確認する — Byzantine リーダーが異なるブロックを異なるバリデータに送る攻撃を防ぐためだ。',
                        'PBFT (1999) からの伝統で、HotStuff など現代の variant は 1 ラウンドで動く。',
                        '2 ラウンド目で uncle ブロックを参照できるようにするため。',
                      ],
                      correctIndex: 1,
                      explanation: '2 ラウンドが split-brain に対する safety を担う。Byzantine リーダーは異なるブロックを異なる部分集合に送れる。2 ラウンド目なしでは、矛盾する 2 ブロックを commit させられる。Prevote は「何かを見た」、Precommit は「2f+1 で同じものを見た」を確認する。',
                    },
                    {
                      question: "PBFT (1999) と HotStuff (2018) の **見出し級の構造的な違い** は?",
                      options: [
                        'PBFT は純粋 Rust で走り、HotStuff は Solidity コントラクトで動く。',
                        'HotStuff は **閾値署名** によって PBFT の O(n²) all-to-all 通信を O(n) のリーダー fan-out に圧縮し、連続するブロックをパイプライン化してスループットを上げる。',
                        'PBFT は finality gadget で、HotStuff は fork choice ルール。',
                        'PBFT はパーミッションレスで、HotStuff は validator set を必要とする。',
                      ],
                      correctIndex: 1,
                      explanation: '暗号 (閾値署名) によって 1 つの集約署名が n 個の個別署名を置き換える。これが n² → n の圧縮。pipelining が 2 つ目の発明で、ブロックを異なるフェーズで同時並行に進められるようになる結果、スループットが「3 ブロック時間に 1 commit」から「1 ブロック時間に 1 commit」になる。',
                    },
                    {
                      question: "**Ethereum PoS の finality 周期** は何か、その構造的な理由は?",
                      options: [
                        '毎 slot (12s) — スループットを最大化するため。',
                        '最短 2 epoch (~13 分)。**100 万を超えるバリデータ** では BFT 系の即時 finality は不可能なので、stake 加重 2/3+ 票による epoch checkpoint で finalize する (Casper FFG)。',
                        '確率的 — Ethereum PoS は Bitcoin 系の longest-chain を使う。',
                        '設定可能で、オペレータが 1 slot と 1 epoch から選ぶ。',
                      ],
                      correctIndex: 1,
                      explanation: 'ハイブリッド PoS: 高速な head 選択 (LMD-GHOST、毎 slot) + 遅い finality (Casper FFG、2 epoch ごと)。13 分は 100 万バリデータの分散化に対するコスト。Tempo クラスの chain は小さな validator set + 即時 finality を選ぶ。',
                    },
                    {
                      question: 'Berachain はなぜ標準 Reth + カスタムバリデータではなく **bera-reth** を必要とするのか?',
                      options: [
                        'revm ではなく別の EVM 実装を使うため。',
                        '標準 Reth はバリデータには十分だが **コンセンサス固有のコードパス** を欠いている。PoL を認識するブロック検証、流動性報酬の流れ向けのカスタム executor hook、BGT 対応の chainspec、validator set を LP 状態と結合させる precompile が必要になる。',
                        'ライセンス上の理由 — Reth は GPL だから。',
                        'Berachain は別の L1 で動いており、bera-reth は L2 専用だから。',
                      ],
                      correctIndex: 1,
                      explanation: 'PoL がバリデータ経済の関係を根本から変える。Consensus 実装、executor hook、chainspec のすべてがそれを知っている必要がある。vanilla Reth の上に約 2000 行のカスタマイズ。op-stack-on-reth と同じパターン: 最小だがコンセンサスクリティカルなカスタマイズ。',
                    },
                    {
                      question: "Reth の `Consensus` trait で、どのメソッドが **state root を検証** するか?",
                      options: [
                        '`validate_header` — state root を含む header の全フィールドをチェックする。',
                        '`validate_body_against_header` — body と header の構造的整合性をチェックする。',
                        '`validate_block_post_execution` — EVM が tx を実行した後に走り、計算済みの post-state root を header の値と比較できる。',
                        'なし — state root は別の prover によって外部で検証される。',
                      ],
                      correctIndex: 2,
                      explanation: 'State root は実行 *後* にしか存在しない。tx 全部を revm に流し、状態変更を適用し、結果状態を merkle 化して計算する。pre-execution のチェック (header 構造、gas limit の数式) が先に来て、post-execution のチェックに state root の比較が含まれる。',
                    },
                    {
                      question: 'BFT コンセンサスで **3f+1** は何を意味し、なぜそれが tight なのか?',
                      options: [
                        'ブロックサイズ上限 — 3 tx と 1 coinbase。',
                        'f 個の Byzantine を許容するために必要な最小の総バリデータ数。tight である理由は、2 つの quorum が少なくとも 1 つの正直なバリデータで交わらなければならないから (Lamport 1982 の数学的証明)。',
                        '投票ラウンド数 — 3 フェーズ + 1 commit。',
                        'コンセンサス税率 — stake の 3% + 1% の手数料。',
                      ],
                      correctIndex: 1,
                      explanation: '数学的には、n=3f+1 ノードのネットワークでサイズ 2f+1 の 2 quorum は 2(2f+1)-n = f+1 ノードで重なり、少なくとも 1 つは正直。基礎的な quorum 交差の議論。PBFT から HyperBFT まで、すべての BFT システムが 3f+1 を前提にしている。',
                    },
                    {
                      question: "Reth ベース L1 に Malachite を組み込む際、**Malachite の Driver / VoteKeeper / RoundStateMachine の分離** が重要な理由は?",
                      options: [
                        'プロトコルを非同期にできる。',
                        "明確に分離されているおかげで、**application 側は `Context` trait (ブロック型、validator set、署名方式) を実装するだけ** で済み、プロトコルロジックはすべて Malachite が処理する。Tendermint を書き直すのではなく、配線する。",
                        'コンセンサスのゼロ知識証明を可能にする。',
                        "on-chain コンセンサスのガスコストを下げる。",
                      ],
                      correctIndex: 1,
                      explanation: 'アーキテクチャ上の価値は API の接合面にある。Reth ベース chain がブロック型と validator set で `Context` を実装し、Malachite の Driver が BFT プロトコルの詳細 (投票ラウンド、view change、タイムアウト、2f+1 検知) を処理する。revm の `Database` trait と同じパターン — コンセンサスにとっての Malachite は、実行にとっての revm に当たる。',
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
                  title: 'NodeBuilder のコンセンサススロット — カスタムコンセンサスを配線',
                  slug: 'consensus-nodebuilder-slot-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 16,
                  xpReward: 45,
                  content: `# NodeBuilder コンセンサススロット — カスタムコンセンサスを配線

カスタム \`Consensus\` 実装がある (前レッスンで書いた)。Malachite か自前エンジンが票を駆動する。**この 2 つはどうやって動くノードになるのか?** 答え: NodeBuilder 上で 1 つのビルダー、1 つの実装、1 つのチェーンメソッド呼び出しだけ — カスタム mempool やカスタム EVM を差し込むのと完全に同じ形だ。

本レッスンではその呼び出し箇所を一つずつ辿る。読み終わる頃には、新 L1 の配線をホワイトボードでスケッチできるようになっているはず。

> 🛑 **スクロール前に予測。** Reth の NodeBuilder にカスタムコンセンサスを配線する。**ビルダーに渡すべき 4 つは何か?** (ヒント: trait 実装、validator set、署名方式、もう 1 つ。)

## 1. Reth コンポーネントモデルにおけるコンセンサスコンポーネント

Inside Reth から — NodeBuilder のコンポーネントは 6 つ:

| コンポーネント | Trait | デフォルト |
| :--- | :--- | :--- |
| pool | \`PoolBuilder\` | Ethereum pool |
| network | \`NetworkBuilder\` | devp2p |
| executor | \`ExecutorBuilder\` | Ethereum executor |
| **consensus** | **\`ConsensusBuilder\`** | **\`EthBeaconConsensus\`** |
| payload | \`PayloadBuilder\` | Ethereum payload builder |
| add_ons | \`AddOns\` | None |

\`ConsensusBuilder\` スロットがカスタムなブロック検証を差し込む場所。\`FullConsensus\` 実装を生成し、NodeBuilder がブロック処理中にそれを呼ぶ。

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

メソッドは 1 つ — \`build_consensus\`。ビルダーコンテキスト (chainspec、db など) を受け取り、コンセンサス実装を返す。

これは \`PoolBuilder\`、\`PayloadBuilder\` などと **完全に同じ形**。パターンはフラクタル — 各コンポーネントが Builder trait を持ち、\`launch()\` の中でコンポーネントを生成する。

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
        // - proposer が validator set に含まれているか?
        // - 署名は有効か?
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

これだけ。**コンセンサスのカスタマイズは、1 つのビルダー、1 つの実装、1 つの配線呼び出し**。Reth SDK の他のすべてと同じ形。

> 🛑 **理解度チェック。** このコードのどこで **2f+1 quorum のチェック** が実際に行われているか? **追跡してみる**。答えが「TempoConsensus」なら不正解。Reth の Consensus trait は *ブロック* を検証するものであって、票を検証するものではない。投票は別の場所で行われる。どこか?

投票は **consensus client** (Malachite、CometBFT、または自作エンジン) 側で起こる。Reth の \`Consensus\` trait は **合意後** のブロックを検証するもので、投票そのものは走らせない。2f+1 のチェックは Reth より上流にある。

## 4. Consensus client 側 — Engine API の呼び出し

Reth (EL) が Engine API を公開し、consensus client (CL) がそれを呼ぶ:

\`\`\`rust
// Consensus client 内 (Malachite 駆動、自作、その他)
// Malachite Driver がブロックを決定した後:

async fn on_decide(block: TempoBlock, engine_api: EngineApiClient) -> Result<()> {
    // Reth に「これが新しい head、検証してくれ」と伝える
    let payload_status = engine_api
        .new_payload_v4(block.to_execution_payload())
        .await?;

    if payload_status.status == PayloadStatus::Valid {
        // Reth に「これは finalized、ここまで剪定して構わない」と伝える
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

CL が Engine API 経由で Reth を駆動する。Reth は \`TempoConsensus\` 実装でローカルに検証する。**両者は JSON-RPC で通信** する — 標準 Ethereum での Lighthouse ↔ Reth とまったく同じ。

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

2 プロセス、1 chain。Reth が実行 + ストレージ + EVM を担い、Malachite が投票 + 順序付けを担う。Engine API が両者を接続する。

> 🔍 **リポで探す。** Reth の [\`crates/rpc/rpc-engine-api\`](https://github.com/paradigmxyz/reth/tree/main/crates/rpc/rpc-engine-api) を開き、\`engine_newPayloadV4\` を見つける。payload を受信したときの動作を辿る。**操作の順序は?**

## 6. エラーパス — 検証に失敗したとき

\`TempoConsensus::validate_block_pre_execution\` がエラーを返すと、Reth は:

- ブロックを拒否する (\`PayloadStatus::Invalid\` を返す)
- CL にブロックが無効だと伝える
- CL は view change を行い、別の proposer を見つける必要がある

**ブロック検証のエラーがコンセンサスの liveness 回復をトリガーする**。クリティカル — 検証は決定論的 (毎回同じ答え) でなければならない。そうでないと別のバリデータと意見が分かれて split-brain になる。

## 7. 本番運用の考慮事項

\`Consensus\` 実装はホットパスで走る:

- ブロックは毎回ミリ秒単位で検証されなければならない
- アロケーションは慎重に (ブロックごとにヒープを荒らさない)
- Validator set の参照はキャッシュする
- バリデータごとの素朴な ECDSA ではなく、BLS や閾値署名による検証を使う

Tempo の ~30 バリデータ規模で BLS 検証は ~5ms。Hyperliquid の ~20 ではさらに速い。ヘッドルームが効いてくる。

## 8. 練習

スケッチする (コンパイルしなくてよい):

1. \`TempoValidatorSet\` — どんなフィールドが必要か? (出発点: アドレス、投票ウェイト、BLS 公開鍵)
2. \`TempoConsensus::validate_header\` — 必須のチェック 3 つは?
3. 起動シーケンス — \`TempoNode\` は chainspec からどう validator set をロードするか?

> 最終チェック: 一文で、**票** (2f+1 の検知) を検証するのは Reth か、consensus client か、両方か? **答えで EL/CL の線がはっきりしないなら §3 を再読**。`,
                },
                {
                  title: '最小の単一リーダー BFT を Rust で作る',
                  slug: 'consensus-minimal-bft-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 20,
                  xpReward: 50,
                  content: `# 最小の単一リーダー BFT を Rust で作る

OP Stack のドキュメントを開く。Arbitrum のドキュメントを開く。Hyperliquid の launch 時のブログを開く。どれも「sequencer を時間をかけて分散化する」のバリエーションを言っている。翻訳すれば: **launch 時には、毎ブロックを生成する 1 台のマシンがあり、特定の鍵による署名だけが唯一のコンセンサス**。それだけだ。

これは Reth の上に Rust 約 100 行で出荷できる。本レッスンがその約 100 行 — そして「後で」がやってきたときに何を足していくかの軌跡。

> 🛑 **スクロール前に予測。** Hyperliquid、Tempo、すべての OP Stack chain、Arbitrum — **launch 時にすべてが走らせているコンセンサスは何か?** HotStuff ではない。Tendermint でもない。(ヒント: そのどちらよりも単純。)

## 1. 単一リーダー / 中央集権 sequencer のパターン

ほぼすべての新規 chain は、**1 つの信頼された sequencer** で launch する:

- 全ブロックの proposer 役を独占する
- ブロードキャスト前にブロックを検証する
- 緊急停止の権限を持つ
- 「あとで」分散化する計画を立てる

なぜこれが動くか:

- **Liveness**: 単一障害点だが view change が要らない
- **速度**: 1 ラウンドトリップ = ブロック確定
- **シンプル**: validator set 管理なし、slashing 基盤なし、2f+1 ロジックなし

なぜ初期にはこれが許容できるか:
- chain にまだ攻撃する価値が乏しい (低 TVL)
- 分散化はロードマップ上の項目であって launch 要件ではない
- そのぶん速く出荷できる

Hyperliquid はこの方式で launch した。Tempo もほぼ確実にこの方式で launch する。**自分の chain も同じ**。

## 2. アーキテクチャ

\`\`\`
[Mempool] → [Sequencer]  → [Reth EL] → [Network broadcast]
              │  │ │
              │  │ └─ ECDSA でブロックに署名
              │  └─ Tx の順序を選択
              └─ ブロックを構築
\`\`\`

Sequencer の 3 つの仕事:
1. **構築**: tx の選択、順序付け、timestamp 設定
2. **署名**: 「sequencer から来た」ことの暗号的証明
3. **ブロードキャスト**: Engine API 経由で Reth EL に送り、P2P 経由で他ノードにも送る

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

        // 7. peer にブロードキャスト (P2P、図示は省略)
        self.broadcast(signed_block).await?;

        Ok(())
    }

    async fn current_forkchoice(&self) -> eyre::Result<ForkchoiceState> {
        // 現 head をローカルで追跡するか、EL に問い合わせる
        todo!()
    }

    async fn broadcast(&self, signed: SignedPayload) -> eyre::Result<()> {
        // P2P ブロードキャスト (libp2p、devp2p、カスタムから選ぶ)
        todo!()
    }
}
\`\`\`

合計で約 100 行。**これで動く sequencer になる**。\`block_period\` ごとにブロックを生成し、ECDSA で署名し、ブロードキャストする。

## 4. コンセンサス側 (受信側の検証)

他ノードは署名済みブロックを受け取り、カスタムの \`Consensus\` 実装で検証する:

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
    // ...
}
\`\`\`

**コンセンサスのロジックは 3 行** — 署名者を復元し、期待値と比較し、合わなければ拒否する。あとは標準的な EVM の検証。

> 🛑 **理解度チェック。** 「でもこれはただの信頼権威であって、コンセンサスではない」 — **部分的に正しい**。これも *コンセンサス* ではある — 1 つの決定 (次のブロック) への合意だ。ただ **意思決定者が 1 人** いるだけ。自分の言葉で言い直してみる。なぜ「単一リーダーコンセンサス」もコンセンサスと呼べるのか?

理由: コンセンサスとは「1 つの値への合意」のことだから。意思決定者が 1 人なら、値は意思決定者の言う通りになる。トレードオフは、**信頼仮定** (sequencer 1 人が正直であること) を **liveness** (view change 不要) と引き換えにすること。launch 時点なら許容できる仮定であり、分散化を進めるにつれて段階的に緩めていく。

## 5. 分散化のステップ 1: 2-of-3 multisig sequencer

単一署名者から **multisig** へ — ブロックの有効性が 1 つの鍵ではなく、指定した 3 鍵のうち 2 鍵の署名を必要とするようになる:

\`\`\`rust
pub struct MultisigSequencer {
    signers: Vec<PrivateKeySigner>,  // 3 署名者
    threshold: usize,                 // = 2
    engine_api: EngineApiClient,
}

impl MultisigSequencer {
    async fn produce_block(&self) -> eyre::Result<SignedPayload> {
        // 1. リード署名者 (ローテートする) が payload を構築
        let payload = self.build_payload().await?;

        // 2. 2-of-3 で署名者から署名を集める
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

検証は **2-of-3 の署名** をチェックする。これで得られるもの:

- 可用性 (HA) の向上: 3 鍵のうちどの 2 つでもブロックを生成できる
- liveness モードの追加: 1 鍵がダウンしても他の 2 鍵で生成を続けられる
- Byzantine 耐性はまだない (署名者が正直であることを前提にしている)

経済的な転換点: 2-of-3 multisig は **多くの本番 L2 の launch 時のパターン**。Optimism、Arbitrum、Base — どれもこの形で launch しており、multisig の鍵はチーム + 監査人 + ノードオペレータが持つ。

## 6. 分散化のステップ 2: 適格性付きのリーダーローテーション

**Proposer のローテーション** を追加する:

\`\`\`rust
fn current_proposer(slot: u64, validator_set: &[Address]) -> Address {
    validator_set[(slot as usize) % validator_set.len()]
}
\`\`\`

slot ごとに別のリーダーが、決定論的に選ばれる。リーダーが slot を逃した (タイムアウト内にブロックがなかった) 場合は、**次のリーダーが引き継ぐ**。

これが **ローテーション付きリーダーによる single-slot finality** — 実際の BFT にかなり近いが、本物の 2f+1 票はまだない。

完全な BFT に到達するためにまだ欠けているのは、リーダーを説明責任の下に置く本物の票。それが Tendermint / HotStuff への跳躍であり、Malachite がそこを与えてくれる。

## 7. 現実的な L1 launch のシーケンス

多くの L1 はこのステージを順に経る:

| ステージ | コンセンサス | 分散化の度合い | TVL safety |
| :--- | :--- | :--- | :--- |
| **Day 0** | 単一 sequencer | なし | チームを信頼 |
| **Month 3** | 2-of-3 multisig | 3 オペレータ | 2-of-3 セットを信頼 |
| **Month 12** | ローテーション proposer | ~10 バリデータ | 1 つでも生きていれば liveness |
| **Year 2** | 本物の BFT (Tendermint/HotStuff) | 30 以上のバリデータ | 2/3+ Byzantine 耐性 |

**Day 0 で L1 を出荷できる** — その後、段階的に分散化していく。Tempo や Hyperliquid は今日おそらく stage 2〜3 にいて、stage 4 を年単位の計画として進めているところ。

## 8. 練習

コードを追う (実行不要):

1. \`SignedPayload\` struct を書く (sequencer 署名付きのカスタムブロックエンベロープ)
2. \`CentralizedConsensus::validate_block_pre_execution\` を書く — ECDSA 署名の復元と比較を完備する
3. \`current_forkchoice\` をスケッチする — 現 head をローカルでどう追跡するか?
4. 考える: Mempool はどこに置く? (ヒント: sequencer ではない — 別コンポーネント。)

> 最終チェック: 一文で、「単一リーダーコンセンサス」が L1 launch に妥当かつ十分である理由は? **答えが「信頼仮定を明示しつつ段階的に緩める」でないなら §4 と §7 を再読**。`,
                },
                {
                  title: 'バリデータ経済 — slashing、報酬、攻撃ベクター',
                  slug: 'consensus-validator-economics-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 17,
                  xpReward: 45,
                  content: `# バリデータ経済 — slashing、報酬、攻撃ベクター

暗号だけでは PoS chain を守れない。バリデータが double-sign したことを *証明* することはできる — だが、バリデータがそれに対して何の代償も払わないなら、その証明は無価値だ。**不正のコストが不正によって引き出せる現金を上回って初めてプロトコルは安全になる**。それが経済層であり、ここが荷重を担う。これがなければ、優雅な 3f+1 quorum の数学は「double-sign しないでください、お願いします」へと崩れ落ちる。

本レッスンではその経済層を扱う。slashing の仕組み、攻撃ベクターの値付け、自分の L1 向けに slashing をどう設計するか。

> 🛑 **スクロール前に予測。** Ethereum mainnet には約 500 億ドル以上がステークされている。**finality に対する 51% 攻撃を試みる際の、ドル単位のコストは?** (正確な数字でなくてよい — 計算をスケッチ。) これがなぜ PoS の **セキュリティ議論** になるのか?

## 1. 経済的セキュリティの議論

BFT システムの場合:

- 攻撃にはバリデータ stake の **1/3 超** (liveness 停止) または **2/3 超** (safety 違反) が必要
- Stake は double-sign や surround-vote が検出されたときに **slash** される
- 攻撃コスト = **検出時に失う stake**
- 攻撃利益 = 抽出可能価値

**セキュリティ条件**: 必要 stake > 抽出可能価値。

Ethereum では 500 億ドルがステークされており、finality 攻撃には約 330 億ドル相当の stake が必要。Slashing の罰則は **330 億ドルすべて**。経済合理的な攻撃者は存在しない — 失う額が得られる額を上回るからだ。

これが **経済的セキュリティ**。攻撃が非合理だからこそ、プロトコルが安全に保たれる。

## 2. 2 つの slash 可能な違反

Slashing をサポートする BFT システムなら共通で:

### 2.1 Double-signing (equivocation — 同じ slot で矛盾する 2 つのメッセージに署名すること)

\`\`\`
バリデータ V が Vote(block_A, round_5) に署名
バリデータ V が Vote(block_B, round_5) に署名
\`\`\`

両方とも同じラウンドで V によって署名されている。**暗号的に証明可能** — 2 つの署名を持つ者なら誰でも slashing proof を構築できる。

罰則: バリデータは stake の **一部または全部** を失う。

### 2.2 Surround voting

\`\`\`
バリデータ V が Vote(source: epoch_3, target: epoch_5) に署名
バリデータ V が Vote(source: epoch_4, target: epoch_6) に署名
\`\`\`

2 つ目の票が 1 つ目を **surround している** (より後ろの source、より後ろの target)。これは Casper FFG では特に safety 違反になる。暗号的に証明可能。

罰則: double-signing と同様。

> 🛑 **理解度チェック。** なぜ surround voting は slash 可能で、連続する epoch での通常の投票はそうではないのか? **構造的な違いは何か?** 必要なら Lesson 3 §3 を再読。

## 3. Slashing proof

Slashing proof は **矛盾する署名済みメッセージ 2 つ** — それだけ。提出フロー:

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

これを成立させているのは 3 つの性質:
1. **検出はパーミッションレス**: ネットワークを監視している人なら誰でも proof を提出できる
2. **検証は暗号的**: chain が 2 つの署名を検証し、oracle は不要
3. **報酬は小さい**: 監視のインセンティブには十分だが、虚偽報告 (検証失敗) を誘発するほど大きくはない

## 4. Slashing の数学 — どれだけ slash するか

設計は 2 通り:

### 4.1 フラット slash

文脈によらず stake の固定割合を slash する。シンプル。Ethereum の最小 slash は単一違反で **1 ETH**。

直感的に分かりやすい。多数のバリデータが同時に slash される (協調攻撃) ケースには弱い。

### 4.2 相関 slashing

**同じ window 内で何人のバリデータが slash されたか** に比例して slash する。Ethereum はこの方式:

\`\`\`
slash_amount = (slashed_stake / total_stake) * stake * multiplier
\`\`\`

\`slashed_stake\` は直近 window 内で slash された全バリデータの stake。1 バリデータが単独で slash された場合は罰則が小さい。バリデータの 33% が同時に slash された (協調攻撃) なら、罰則は **壊滅的** — 全 stake。

**これが協調攻撃に対する経済的な堀になる**。偶発的な小規模 slash はコストが小さく、本物の攻撃はフルコストを払うことになる。

> 🔍 **リポで探す。** [Ethereum consensus spec](https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md) を開き、「slashing」または「process_slashing」を検索する。正確な公式がそこにある。**Multiplier はいくつか?**

## 5. 報酬 — もう半分

バリデータが受け取るもの:

- **ブロックごとの報酬**: 小さな定数
- **Attestation 報酬**: head に正しく投票したとき
- **Finality 報酬**: finality 投票に参加したとき

正常動作するバリデータの年利は、Ethereum mainnet で約 3〜5%。これを slashing リスクと比較する:

- 偶発 slash の確率: 慎重に運用すれば非常に低い
- 偶発 slash のコスト: 最小で約 1 ETH
- 32 ETH の年間収益: 約 1 ETH

つまり、偶発 slash 1 回で 1 年分の収益が吹き飛ぶ。**経済的インセンティブは慎重に運用する方向に働き**、攻撃に向かわせない。

## 6. 攻撃ベクター

悪意あるバリデータが試みうる行動:

| 攻撃 | 効果 | 防御 |
| :--- | :--- | :--- |
| **Double-sign** | 同じ高さで 2 ブロックに署名し fork choice を混乱させる | Slashing |
| **Surround vote** | 矛盾する 2 つの checkpoint を finalize に投票する | Slashing |
| **Long-range attack** | 古い期間のバリデータを買収して履歴を書き換える | 弱い主観性 (クライアントは最近の状態を信頼する) |
| **51% finality attack** | stake の 2/3+ を握り、その全部で署名する | ETH 換算の経済コスト > 330 億ドル。TVL 的に不可能。 |
| **Liveness attack** | stake の 1/3+ を握り、投票を拒否する | chain は停止するが、safety は妥協しない |

最初の 2 つは **slash 可能** = 経済的に非合理。3 つ目 (long-range) は slashing ではなく **弱い主観性** で防がれる。最後の 2 つは **過半数の資本** が必要 = 経済的に極端。

最も現実的な攻撃は、**1/3+ による liveness 停止**。正直にステーキングしたときの収入は失うが、stake 自体は失わない。一部の攻撃者は政治的理由 (例えば国家強制) によって合理的にこれを実行しうる。

> 🛑 **予測。** ある国家が ETH stake の 35% を握り、投票を拒否したとする。**Ethereum に何が起きるか?** 追う: liveness、finality、最終的なユーザの応答。

Ethereum は finalization を止める。tip は生成され続ける (LMD-GHOST は動き続ける)。約 13 日後、プロトコルの **inactivity leak** が発動する — 非参加バリデータの stake が徐々に失われていき、参加 stake が 2/3+ に戻るまで続く。chain は finalize を再開し、非参加バリデータは大きな罰則を被る。

美しい設計だ。1/3+ の攻撃でも **一時停止に留まり**、chain を永続的に破壊することはない。

## 7. 自分のカスタム L1 向け

Tempo や Hyperliquid 向けの slashing 設計:

- **Validator set サイズ**: 小さいほど攻撃の協調が容易なので、より厳しい slashing が必要
- **Slash 額**: 攻撃から理論的に抽出可能な最大値を上回るべき
- **内部告発者報酬**: 1〜5% が標準
- **Inactivity 罰則**: 検閲耐性が欲しいなら必要

Hyperliquid の約 20 バリデータは、バリデータあたり非常に高い stake 要件 + 重い slashing。Tempo の 約 30〜50 バリデータでも似たパターンになる。

## 8. Launch 時の問題 — Day 1 から slashing を入れるか?

L1 を slashing 有効で launch すべきか?

**賛成論**: Day 1 から経済的セキュリティが効き、「我々を信頼してほしい」期間がなくなる
**反対論**: Slashing ロジックのバグは壊滅的で、検証に時間がかかる

**よくあるパターン**: **有効化するが上限を低く設定** して launch する。正直なバリデータを破産させずに、実際のバグを捕まえられる。信頼が積み上がるにつれて上限を上げる。

Hyperliquid は slashing 付きで launch した。OP-Stack chain は知られている通り slashing なし (まだ分散化された validator set を持っていない)。Tempo はおそらく少なくともソフトな slashing 付きで launch する。

## 9. 練習

仮想の L1 で計算してみる:

1. Validator set サイズ: 50
2. バリデータあたりの stake: 1000 万ドル
3. 総 stake: 5 億ドル
4. 1 攻撃あたりの最大抽出可能価値 (見積もり): 2 億ドル
5. **必要な slash 割合**: ? (抽出可能価値を上回る必要がある)

もし抽出可能価値が 4 億ドル (大規模な取引決済) に急騰したら? Slashing でカバーできるか?

> 最終チェック: 一文で、なぜ **slashing** が BFT コンセンサスの経済的基盤なのか? **答えに「攻撃コスト > 攻撃利益」がなければ §1 を再読**。`,
                },
                {
                  title: 'ファイナルクイズ: L1 コンセンサスを作る',
                  slug: 'consensus-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 12,
                  xpReward: 50,
                  content: `# ファイナルクイズ: L1 コンセンサスを作る

最終的なコンセンサスのチェック。Tempo クラスの L1 を出荷するために必要。`,
                  quizQuestions: [
                    {
                      question: '新規の決済特化 L1 (Tempo クラス) のコンセンサスを設計しているとする。バリデータ数: 30。Finality 目標: サブ秒。**どのコンセンサス系統** を選び、**その理由は**?',
                      options: [
                        'Nakamoto PoW — 実戦検証済みで分散化されている。',
                        'Ethereum 系のハイブリッド PoS — ベストプラクティスで、大規模 validator にも対応する。',
                        '純粋 BFT 系 (Tendermint または HotStuff) — 30 バリデータは sweet spot、BFT が即時 finality を与え、決済ユースケースは決定論的な決済を求めるため。',
                        '単一 sequencer — 最速、最もシンプル。',
                      ],
                      correctIndex: 2,
                      explanation: 'ハイブリッド PoS (選択肢 2) は 30 バリデータには過剰 — 直接 BFT が使えて finality gadget は不要。PoW (選択肢 1) は finality を犠牲にする。単一 sequencer (選択肢 4) は launch 時には機能するが「コンセンサス設計」ではない。30 バリデータでの純粋 BFT は教科書通りの選択 — Hyperliquid は約 20 でこれを採用、Tempo も類似のはず。',
                    },
                    {
                      question: "Reth の `Consensus` trait の **目的** と、明示的に行わないことは?",
                      options: [
                        '投票プロトコルを走らせる — Reth は内部に BFT を持っている。',
                        'ブロックを chain ルールに照らして検証する (pre-execution の構造、post-execution の state root、gas の数式)。Head 選択 / fork choice は行わない — それは consensus client の仕事 (Ethereum なら Lighthouse、Tendermint chain なら Malachite、自前 L1 ならカスタム)。',
                        'バリデータの代理でブロックに署名する。',
                        'Validator set を管理する。',
                      ],
                      correctIndex: 1,
                      explanation: 'EL/CL の分離: Reth (EL) はブロックを検証する。CL はどのブロックの上に積むかを決め (fork choice)、投票を走らせる。標準 Ethereum (Reth + Lighthouse) でもカスタム L1 (Consensus 実装 + Malachite/CometBFT 等) でも同じ分離になる。',
                    },
                    {
                      question: '中央集権 sequencer の L1 をできるだけ速く出荷したい。Sequencer コードがブロックごとに行う 3 つは?',
                      options: [
                        '2f+1 の票を集め、その後で署名し、その後でブロードキャストする。',
                        'Payload を構築し (tx 選択 + 順序付け)、得られたブロック hash に署名し (authority の証明)、Engine API 経由で Reth に、P2P 経由で他ノードにブロードキャストする。',
                        'バリデータ票を待ち、署名を集約し、その後 commit する。',
                        '価格 oracle に問い合わせ、margin を決済し、その後ブロックを作る。',
                      ],
                      correctIndex: 1,
                      explanation: '単一リーダー BFT = 投票なし。3 つの仕事 — 構築 (Engine API forkchoiceUpdated + PayloadAttributes 経由)、署名 (ブロック hash を ECDSA 署名者に渡す)、ブロードキャスト (Engine API + P2P)。Lesson 10 §3 の Rust 約 100 行。',
                    },
                    {
                      question: 'Tendermint/HotStuff では validator set が有界 (約 20〜100)。**この上限を決めている構造的な制約** は何か?',
                      options: [
                        'ディスク容量 — 各バリデータが chain の状態を保存するため。',
                        '通信複雑度: PBFT はブロックあたり O(n²) メッセージ、閾値署名付きの HotStuff でもラウンドあたり O(n)。ネットワーク帯域とレイテンシによって、実用上 n は約 100〜200 が上限になる。',
                        'トークン供給 — バリデータを増やすためのトークンが足りない。',
                        '法的制約 — 1 つのプロトコルに 100 を超えるエンティティは関われない。',
                      ],
                      correctIndex: 1,
                      explanation: 'ネットワークがボトルネックになる。PBFT の n² メッセージは、n = 100 で 1 万、n = 1,000 で 100 万メッセージ。HotStuff の O(n) で楽にはなるが、帯域とレイテンシのせいで実用上の最大値は依然上限がある。Ethereum 系のハイブリッド PoS は、fork choice (毎 slot、サンプリングベース) と finality (毎 epoch、フル参加) を分けることでこれを解決している。',
                    },
                    {
                      question: 'なぜ **slashing** が BFT の経済的セキュリティの荷重を担う基盤になるのか?',
                      options: [
                        'Slashing がインフラを走らせるバリデータに報酬を支払うから。',
                        '不正行為のコスト (失う stake) が攻撃の利益 (抽出可能価値) を上回るため、攻撃が経済的に非合理になるから。Slashing がなければ、バリデータはコストなしで矛盾するメッセージに投票でき、プロトコルの safety 保証は蒸発する。',
                        'Slashing がブロック生成を速くするから。',
                        'Slashing は EVM の機能であり、コンセンサスではないから。',
                      ],
                      correctIndex: 1,
                      explanation: '暗号が不正を証明し、slashing がそれをコストの高い行為に変える。Slashing がなければ、Byzantine バリデータは無コストで double-sign でき、プロトコルの 3f+1 という境界は無意味になる。Slashing が「double-sign すべきでない」を「double-sign を経済的に賄えない」に変える。',
                    },
                    {
                      question: "Malachite は Driver / VoteKeeper / RoundStateMachine を分離している。**Reth ベース L1 に Malachite を組み込むときに何ができるようになるか**?",
                      options: [
                        'Reth と異なるマシンで Malachite を動かせる。',
                        '`Context` trait (ブロック型、validator set、署名方式) を実装するだけでよくなる — Malachite が Tendermint プロトコルのロジック (投票、quorum、view change、タイムアウト) をすべて処理する。Tendermint を書き直すのではなく、配線する。これは revm の `Database` trait と同じパターン: 基盤側を自分が提供し、エンジンがプロトコルを処理する。',
                        'Rust のコードを書かずに Malachite を使える。',
                        '2f+1 の quorum チェックをスキップできる。',
                      ],
                      correctIndex: 1,
                      explanation: 'Malachite がプロトコルを提供し、自分の `Context` 実装が chain 固有の型を提供する。完全な BFT で守られた L1 への統合コードは約 100 行 — Tendermint を自分で書いたら約 1 万行になることと比べると桁違い。これが「Rust BFT エンジンを使う」のアーキテクチャ的な勝ち筋。',
                    },
                    {
                      question: 'Berachain はカスタマイズ済みの Reth ディストリビューション **bera-reth** を出荷している。**vanilla Reth に対して実際に変更しているのは何 % か?**',
                      options: [
                        '約 95% — Proof-of-Liquidity はまったく別の chain だから。',
                        '約 10% — Reth の大半はそのまま再利用される。カスタマイズは約 2000 行で、カスタム Consensus 実装、流動性報酬用のカスタム executor hook、カスタム chainspec、BLS 対応の validator set 追跡が含まれる。',
                        "約 50% — Reth の EVM を PoL 用に書き直す必要があるから。",
                        '0% — bera-reth はただの config ファイルだから。',
                      ],
                      correctIndex: 1,
                      explanation: 'Expert Module 3 の見出しの通り、Reth ベース chain は *拡張* で作られるのであって fork ではない。bera-reth の vanilla Reth に対する差分は小さいがコンセンサスクリティカル。公開されている `tempoxyz/tempo` も同じパターン (彼らの `tempoxyz/reth` は upstream に対して 0 commits ahead)。',
                    },
                    {
                      question: 'L1 を launch する。Day 0 のコンセンサス: 単一 sequencer。**最初の 2 年における現実的な分散化の軌跡** は?',
                      options: [
                        '無期限に単一 sequencer のまま。',
                        '単一 sequencer (Day 0) → 2-of-3 multisig sequencer (Month 3) → 約 10 バリデータでのローテーション proposer (Month 12) → 30+ バリデータと slashing による完全 BFT (Year 2)。各ステップで liveness を保ちつつ、段階的に Byzantine 耐性を加えていく。',
                        'Day 1 でいきなり 1000 バリデータの PoS に飛ぶ。',
                        '分散化はマーケティング上の関心事であって技術の話ではない。',
                      ],
                      correctIndex: 1,
                      explanation: '実 L1 はこの軌跡をたどる。信頼を担保にして速く出荷し、TVL と運用が成熟するにつれて段階的に信頼仮定を緩める。Hyperliquid、Tempo、すべての OP-Stack chain — 全部このバージョンだ。プロトコル設計上、その場での upgrade は可能だが、コンセンサス設計は最初から軌跡を受け入れる形にしておかなければならない (例えば、header フォーマットには、1 署名者から始まる場合でも「validator set 証明」を含めるべき)。',
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
