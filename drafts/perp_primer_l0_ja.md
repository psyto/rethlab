# Building Perp DEX Primer — L0 draft (JA) — concept course

> DIY Perp track の prerequisite。コード書かない、openhl reference SHA も使わない概念コース。

## L0 — `perp-primer-what-is-a-perp-ja`

**Title**: 永久先物とは何か — そしてなぜ期限がないのか

**Duration**: 30 分 · **XP**: 50

---

````markdown
# 永久先物とは何か — そしてなぜ期限がないのか

## ゴール

このレッスンで掴む概念:

- **永久先物（perpetual future）の正体。** 期限がない、決済イベントもない、満期で spot 価格に収束する仕組みも持たない、そういう派生商品だ。本 primer の残り 3 レッスンの形状は、この 1 つの設計選択から導かれる。
- **「期限なし」が実際に解くべきエンジニアリング課題だった理由。** その課題を解くために新しい経済メカニズム（L1 で扱う）を発明する必要があった。
- **perp、spot、伝統的 futures の違い。** 3 つの市場、3 つの価格動態、3 つのトレーダーインセンティブ。
- **なぜ本コースで Hyperliquid を例に取るのか。** 現状は closed-source。rethlab DIY Perp track は、その open 版を作ることを教える。

このレッスンを終えると、以下に答えられる:

- 「BTC を spot で買うのと、BTC perp を long するのは何が違う?」
- 「perp に期限がないのに、なぜ価格が原資産から離れずに済むのか?」
- 「Hyperliquid とは何で、Rust EVM エンジニアにとってなぜ重要なのか?」

## なぜこの primer が存在するか

rethlab の DIY Perp track は、openhl という open-source の Hyperliquid 実装をゼロから組み上げるコース群だ。Consensus substrate、CLOB matching engine、EVM precompile、funding state machine、liquidation engine — すべて openhl 本体と byte 単位で一致するように書かれている。

**ただしコードは、perp が何かを分かっていて初めて意味を持つ。** Funding コースが「premium = (mark − index) / index、divisor 8、cap ±4%」と書く瞬間、15 文字の中に perp 用語が 6 つ詰まる。Rust の infra 仕事から流れてきたエンジニアなら、「数式が難しいパートだろう」と思っても無理はない。**実は数式は易しい。難しいのはメカニズムのほうだ。**

この primer は、DIY Perp track が暗黙のうちに前提にしていた概念レイヤーを 4 レッスンで明示化する。コードなし、openhl reference なし — その後の Rust コードを読み解くために必要な perp の仕組みだけを扱う。

## 3 つの市場、3 つの契約

BTC の価格に対してポジションを取る方法は 3 種類ある:

| 市場 | 保有するもの | 決済 | 例 |
| :--- | :--- | :--- | :--- |
| **Spot**（現物） | 実物の BTC そのもの | 即時 — 所有する | Coinbase で 0.1 BTC を買う。手元に 0.1 BTC が残る。 |
| **伝統的 futures**（先物） | 将来の特定日付に BTC を固定価格で買う/売る契約 | 満期に — 差金（現金）または現物で決済 | CME 2026 年 12 月 BTC future。12 月 31 日に $100k で買う約束。 |
| **永久先物（perp）** | BTC 価格に連動する契約。期限なし | なし — ポジションを閉じるまで継続（差金決済） | Hyperliquid の BTC-USD perp。10× long を取り、margin が足りているかぎり開いたまま。 |

Spot は最もシンプル。資産を保有しているので、価格の動きがそのまま自分の損益になる。

伝統的 futures はそこに **leverage**（notional 全額を前払いしなくていい）と **expiry**（契約は固定日に終了し、その時点で arbitrage によって価格が spot に収束する）を加える。1800 年代から商品市場で使われてきた、数百年かけて洗練された設計だ。

永久先物は、伝統的 futures から leverage はそのまま取り、**expiry を外す**。一見地味な変更に聞こえる。実際には、現代のデリバティブで最も重大な設計選択だ。

## 期限がないことが本物の課題だった

伝統的 futures には収束メカニズムが組み込まれている。満期では契約価格は必ず spot 価格に等しくなる。等しくなければ arbitrage で差が削られる。**満期そのものが anchor の役目を果たす。**

その満期を外すと、anchor が消える。Perp の価格は、その venue の orderbook の需給だけで決まる。契約自体に spot を追わせる力は何もない。

結果として、perp は乖離する。それも大幅に。

- 投機的熱狂: long が short より多い → mark price が index より 5%、10% 上に走る
- パニック: short が long より多い → mark が index より下に走る
- 偏った建玉: retail の long が大半を占める venue（bull market など）では、premium が長期間プラス側に張り付く

補正メカニズムがなければ、perp は「ステップが余計に多い futures」になる。しかもその余計なステップはすべて誤った方向に作用する。BTC を追うはずの契約の価格が、BTC を追わない。

**解決策が funding payment。** これが L1 のテーマだ。30 秒版で言うと: mark が index より上に離れたとき、long は short に少額の周期的な手数料を gap に比例して支払う。この手数料が mark を引き戻す経済インセンティブになる。Mark が index より下に離れたときは、対称的に short が long に支払う。

Funding が perp に対して果たす役割は、expiry が伝統的 futures に対して果たす役割と同じだ。収束させる力。違いは、1 点ではなく連続的に作用する点。**それが innovation のすべてだ。**

## Perp が存在する場所

| Venue タイプ | 例 | 補足 |
| :--- | :--- | :--- |
| **CEX**（中央集権）| Binance、OKX、Bybit、BitMEX | BitMEX が 2016 年に現代型 perp を発明。Binance は世界最大の出来高。 |
| **既存 L1 上の DEX** | dYdX（Cosmos）、Drift（Solana）、Aevo（Optimism rollup） | Composable で on-chain だが、ホストチェーンの latency と gas を継承する。 |
| **専用 L1 上の DEX** | **Hyperliquid**、Aevo、Vertex | Perp UX に最適化した purpose-built L1。Hyperliquid は出来高で最大。 |

「専用 L1 上の DEX」カテゴリが、Rust エンジニア視点で最も興味深い。Perp DEX を Ethereum L1 上のアプリとして作ると遅くて高い。Rollup として作ると速度のために集権性を引き換える。**Perp 専用 L1 として作れば、UX に必要なすべての層を perp 向けにチューニングできる。** これが Hyperliquid のやったことで、DIY Perp track が教えることだ。

## なぜ Hyperliquid を例に取るのか

Hyperliquid は出来高で最大の perpetual DEX、**2025 年に $300B+** を捌いた。スタックは完全 closed-source: HyperBFT consensus、HyperCore matching engine、HyperEVM execution。L1 の中身を読みたいエンジニア向けに公開された Rust リファレンスは存在しない。

`psyto/openhl` がその open-source リファレンス実装だ。rethlab の DIY Perp track は、それを作ることを教える。本 primer を終えた読者は、コードを読むのに必要な perp の知識を持っている状態になる。

primer の残りで何度も出てくる Hyperliquid 固有の数値を、ここでまとめて挙げる:

- **Funding interval**: 1 時間（L1）
- **Funding rate divisor**: 8（L1）
- **Funding rate cap**: ±4% / interval（L1）
- **Initial margin**: ~10%（L2）
- **Maintenance margin**: ~2%（L2; tier で変わる）
- **Liquidation fee**: notional の ~1.5%（L3）
- **Cross-margin がデフォルト**（L2）
- **Insurance fund** あり、最後の手段として **ADL**（L3）

L1 / L2 / L3 の計算例ではこれらの数値が繰り返し登場する。DIY Perp track のコード例も同じ数値を使う。

## よくある誤解

**「perp は自動でロールする futures だろう」。** 近いが違う。自動ロール futures にも expiry はある。サイクルごとに新しい契約に乗り換えるだけだ。各ロールには basis spread のコストがかかる。Perp にはロール自体がない — funding payment がロールコストの代わりを果たす。

**「perp は spot より危険だ」。** 比較の方向が誤っている。Perp が追加するのは **leverage の risk**（underwater になれば預けた collateral 以上を失いうる。ただし regulated な venue では insurance fund が通常それを吸収する）。Leverage を使わなければ、1× の perp position は spot とほぼ同じ risk しか持たない。差し引きの funding コストだけ違う。

**「Hyperliquid は Ethereum 上のスマートコントラクトだ」。** 違う — Hyperliquid は **独立した L1** だ。DIY Perp track を作る理由は、汎用 L1 上のスマートコントラクトより、perp UX（sub-second の latency、gas なし、深い orderbook）に最適化した app-chain のほうが勝るから、というのが核心。

## 次のレッスン (L1)

L1 — **Mark、index、funding**。期限がない中で mark price が index に anchor され続ける仕組みを組み立てていく。Premium の式 `(mark − index) / index`、それを per-interval rate に変換する divisor、最悪ケースを抑える cap、Hyperliquid の実パラメータでの計算例 — それぞれを順に見る。

L1 を終えると、Build OpenHL — Funding コースの L4「`compute_premium`」が「premium とは何か?」ではなく「すでに理解している式の実装」として読めるようになる。

````

---

## Seed-file slot

L0 は Module 0 (Foundations) の sortOrder 0 に入る:

```typescript
{
  title: '永久先物とは何か — そしてなぜ期限がないのか',
  slug: 'perp-primer-what-is-a-perp-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 30,
  xpReward: 50,
  content: `# 永久先物とは何か — そしてなぜ期限がないのか\n\n...`
},
```

## 翻訳セルフレビュー（paste 前）

- **「このレッスンを終えると、以下に答えられる」ブロック** が、build-along の `cargo test` 検証に相当する役割。レッスンが答えるべき問いを冒頭で明示する。
- **「なぜこの primer が存在するか」セクション** はコースカタログから landing したときの value proposition。これがないと「なぜ DIY Perp の前に primer を置くのか」が暗黙のままになる。
- **HL 数値テーブル** の役割は 2 つ。(1) primer 全体で使う数値の一覧を冒頭で読者に渡す。(2) L1/L2/L3 でその数値の意味が明らかになっていくので、戻ってこられる前方参照のインデックスになる。
- **このレッスンにはコードブロックがない** のは意図的。Concept course と build-along を区別する基準が「Rust ソースの有無」。Rust が見たい読者には DIY Perp track を案内する。
- **Surface polish 適用済み** (`real な`、`encode する`、`cross する`、`配線`、`peer validator`、`user 状態` などのパターンは入れていない)。Prose polish も draft 時に適用 — Q&A の「Could/Should but」直訳を避け、bullet を結論先出しにし、長文に英技術句が embed されている場所は短文に分けてある。
