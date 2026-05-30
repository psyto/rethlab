import { PrismaClient } from '@prisma/client';

export async function seedRethPerpPrimerJA(prisma: PrismaClient) {
  const tags = ['perp', 'hyperliquid', 'derivatives', 'funding', 'liquidation'];

  await prisma.course.create({
    data: {
      slug: 'perp-primer-ja',
      title: 'Perp DEX Primer — DIY Perp track の前提となる永久先物の仕組み',
      description:
        'DIY Perp track（Build OpenHL コース群）の実装レッスンが暗黙のうちに前提にしていた perp（永久先物）の概念レイヤーを 4 レッスンで明示化する。コードなし、openhl reference なし — その後の Rust コードを読み解くために必要な perp メカニズムだけを扱う。Spot / 伝統的 futures / perp の違い、funding が anchor を保つ仕組み、margin model の 4 状態、liquidation + insurance fund + ADL の 3 段セーフティネット。Funding / Liquidation コース実装は本 primer の式の Rust 化として読める状態に到達する。',
      difficulty: 'INTERMEDIATE',
      duration: 140,
      xpReward: 240,
      track: 'diy-perp',
      tags,
      isPublished: true,
      sortOrder: 500,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Perp Primer',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'レッスン0 — 永久先物とは何か、そしてなぜ期限がないのか',
                  slug: 'perp-primer-what-is-a-perp-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 50,
                  content: `# レッスン0 — 永久先物とは何か、そしてなぜ期限がないのか

## 問い

DIY Perp track の実装レッスンは「premium = (mark − index) / index、divisor 8、cap ±4%」のように 15 文字に perp 用語 6 つを詰め込む。Rust infra から来たエンジニアには「数式が難しいパート」に見えるが、**実は数式は易しい。難しいのはメカニズムのほうだ。** Perp とは何か、なぜ期限がないのに価格が anchor され続けるのか？

## 原理（最小モデル）

- **3 つの市場、3 つの契約.** Spot（現物保有、即時決済）/ 伝統的 futures（期限あり、満期で spot に収束）/ Perp（期限なし、収束メカニズムは内蔵されない）。
- **「期限なし」が本物のエンジニアリング課題.** 伝統的 futures の収束力は「満期そのものが anchor」、Perp はその anchor を外す = 価格は orderbook 需給だけで決まる → 投機的熱狂で 5-10% 乖離、パニックで反対側に走る、bull market で premium 持続。
- **解決策 = funding payment（L1 で詳述）.** Mark が index より上に離れたとき long → short に gap 比例の周期的手数料、下に離れたとき short → long、収束させる経済インセンティブ。**Funding が perp に対して果たす役割は expiry が伝統的 futures に対して果たす役割と同じ**、違いは 1 点でなく連続的に作用する点。
- **Perp が存在する場所.** CEX（Binance / OKX / Bybit / BitMEX — BitMEX が 2016 年に現代型 perp 発明）/ 既存 L1 上の DEX（dYdX / Drift / Aevo）/ **専用 L1 上の DEX（Hyperliquid 最大、出来高 $300B+ /year）**。
- **なぜ Hyperliquid を例に取るか.** 専用 L1 = perp UX に必要な全層（latency / gas / orderbook 深さ）を perp 向けにチューニング可能、現状 closed-source（HyperBFT / HyperCore / HyperEVM）、\`psyto/openhl\` がオープンリファレンス、rethlab DIY Perp track はそれを作ることを教える。
- **Hyperliquid 固有のパラメータ（残りレッスンで繰り返し登場）.** Funding interval 1 時間 / divisor 8 / cap ±4% / interval / Initial margin ~10% / Maintenance margin ~2% / Liquidation fee ~1.5% notional / Cross-margin デフォルト / Insurance fund + ADL。
- **よくある 3 誤解.** ① 「perp = 自動 roll futures」（違う、roll は basis cost が乗る、perp は funding が代替）、② 「perp は spot より危険」（leverage 使わなければ 1× perp ≈ spot、funding コストだけ違う）、③ 「Hyperliquid は Ethereum スマコン」（違う、独立 L1）。

## 具体例 + ステップで組み立てる

# 永久先物とは何か — そしてなぜ期限がないのか

## 30秒要約

- 対象: Rust 実装に入る前に、perp の仕組みを先に理解したい人。
- 得られるもの: spot / futures / perp の違いと、funding が必要な理由。
- このあと: Step 1 以降の実装レッスンで出る用語が読めるようになる。

## 完了条件

- 「なぜ perp には funding が必要か」を 2-3 文で説明できる。
- 「spot と perp の違い」を 1 つ以上具体例で説明できる。

## ゴール

このレッスンで掴む概念:

- **永久先物（perpetual future）の正体。** 期限がない、決済イベントもない、満期で spot 価格に収束する仕組みも持たない、そういう派生商品だ。本 primer の残り 3 レッスンの形状は、この 1 つの設計選択から導かれる。
- **「期限なし」が実際に解くべきエンジニアリング課題だった理由。** その課題を解くために新しい経済メカニズム（レッスン1 で扱う）を発明する必要があった。
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

**解決策が funding payment。** これが レッスン1 のテーマだ。30 秒版で言うと: mark が index より上に離れたとき、long は short に少額の周期的な手数料を gap に比例して支払う。この手数料が mark を引き戻す経済インセンティブになる。Mark が index より下に離れたときは、対称的に short が long に支払う。

Funding が perp に対して果たす役割は、expiry が伝統的 futures に対して果たす役割と同じだ。収束させる力。違いは、1 点ではなく連続的に作用する点。**それが innovation のすべてだ。**

## Perp が存在する場所

| Venue タイプ | 例 | 補足 |
| :--- | :--- | :--- |
| **CEX**（中央集権）| Binance、OKX、Bybit、BitMEX | BitMEX が 2016 年に現代型 perp を発明。Binance は世界最大の出来高。 |
| **既存L1上の DEX** | dYdX（Cosmos）、Drift（Solana）、Aevo（Optimism rollup） | Composable で on-chain だが、ホストチェーンの latency と gas を継承する。 |
| **専用L1上の DEX** | **Hyperliquid**、Aevo、Vertex | Perp UX に最適化した purpose-built L1。Hyperliquid は出来高で最大。 |

「専用L1上の DEX」カテゴリが、Rust エンジニア視点で最も興味深い。Perp DEX を Ethereum L1上のアプリとして作ると遅くて高い。Rollup として作ると速度のために集権性を引き換える。**Perp 専用L1として作れば、UX に必要なすべての層を perp 向けにチューニングできる。** これが Hyperliquid のやったことで、DIY Perp track が教えることだ。

## なぜ Hyperliquid を例に取るのか

Hyperliquid は出来高で最大の perpetual DEX、**2025 年に $300B+** を捌いた。スタックは完全 closed-source: HyperBFT consensus、HyperCore matching engine、HyperEVM execution。L1 の中身を読みたいエンジニア向けに公開された Rust リファレンスは存在しない。

\`psyto/openhl\` がその open-source リファレンス実装だ。rethlab の DIY Perp track は、それを作ることを教える。本 primer を終えた読者は、コードを読むのに必要な perp の知識を持っている状態になる。

primer の残りで何度も出てくる Hyperliquid 固有の数値を、ここでまとめて挙げる:

- **Funding interval**: 1 時間（レッスン1）
- **Funding rate divisor**: 8（レッスン1）
- **Funding rate cap**: ±4% / interval（レッスン1）
- **Initial margin**: ~10%（レッスン2）
- **Maintenance margin**: ~2%（レッスン2; tier で変わる）
- **Liquidation fee**: notional の ~1.5%（レッスン3）
- **Cross-margin がデフォルト**（レッスン2）
- **Insurance fund** あり、最後の手段として **ADL**（レッスン3）

レッスン1 / レッスン2 / レッスン3 の計算例ではこれらの数値が繰り返し登場する。DIY Perp track のコード例も同じ数値を使う。

## よくある誤解

**「perp は自動でロールする futures だろう」。** 近いが違う。自動ロール futures にも expiry はある。サイクルごとに新しい契約に乗り換えるだけだ。各ロールには basis spread のコストがかかる。Perp にはロール自体がない — funding payment がロールコストの代わりを果たす。

**「perp は spot より危険だ」。** 比較の方向が誤っている。Perp が追加するのは **leverage の risk**（underwater になれば預けた collateral 以上を失いうる。ただし regulated な venue では insurance fund が通常それを吸収する）。Leverage を使わなければ、1× の perp position は spot とほぼ同じ risk しか持たない。差し引きの funding コストだけ違う。

**「Hyperliquid は Ethereum 上のスマートコントラクトだ」。** 違う — Hyperliquid は **独立したL1** だ。DIY Perp track を作る理由は、汎用L1上のスマートコントラクトより、perp UX（sub-second の latency、gas なし、深い orderbook）に最適化した app-chain のほうが勝るから、というのが核心。

## 次のレッスン（レッスン1）

レッスン1 — **Mark、index、funding**。期限がない中で mark price が index に anchor され続ける仕組みを組み立てていく。Premium の式 \`(mark − index) / index\`、それを per-interval rate に変換する divisor、最悪ケースを抑える cap、Hyperliquid の実パラメータでの計算例 — それぞれを順に見る。

レッスン1 を終えると、Build OpenHL — Funding コースの レッスン4「\`compute_premium\`」が「premium とは何か?」ではなく「すでに理解している式の実装」として読めるようになる。

## 合格基準

- 3 市場（spot / futures / perp）の決済の違いを即答できる。
- 「期限なし」が解くべき課題（anchor 不在 → 乖離持続）を 1 文で説明できる。
- Funding payment が解決策である理由（連続的な収束インセンティブ）を 1 文で説明できる。
- Perp が存在する 3 venue タイプ（CEX / 既存 L1 DEX / 専用 L1 DEX）を即答できる。
- Hyperliquid を例に取る理由（出来高最大 + closed-source + openhl オープン化）を即答できる。
- Hyperliquid 固有 8 パラメータ（interval / divisor / cap / margin 2 種 / fee / cross-margin / insurance + ADL）を即答できる。
- 3 誤解（自動 roll / 危険度 / Ethereum スマコン）を即答 + 各々の正解を言える。

## まとめ（3行）

- Perp = 期限なし leverage 付き futures、現代デリバティブ最重要の設計選択、anchor 不在 → 乖離持続 → funding payment が連続的に補正（expiry が伝統 futures に対して果たす役割を 1 点でなく連続で）。
- 3 venue タイプ（CEX / 既存 L1 DEX / 専用 L1 DEX）、Hyperliquid が出来高最大（$300B+ /year）の専用 L1 perp DEX、closed-source、\`psyto/openhl\` がオープンリファレンス。
- 次レッスン以降の前提パラメータ（interval 1h / divisor 8 / cap ±4% / margin 10%-2% / liquidation fee 1.5% / cross-margin / insurance + ADL）を内面化、L1 で funding 詳細、L2 で margin model、L3 で liquidation + insurance + ADL。
`,
                },
                {
                  title: 'レッスン1 — Mark、index、funding — 期限なしで perp が anchor を保つ仕組み',
                  slug: 'perp-primer-mark-index-funding-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 35,
                  xpReward: 60,
                  content: `# レッスン1 — Mark、index、funding — 期限なしで perp が anchor を保つ仕組み

## 問い

L0 で「期限なし → anchor 不在 → 乖離持続 → funding が解決」を立てた。**L1 は funding の中身を組み立てる**。Mark と index の役割分担、premium 式 \`(mark − index) / index\`、divisor で 1 時間レートに変換、cap で最悪ケース抑制 — Hyperliquid の実パラメータ（interval 1h / divisor 8 / cap ±4%）で計算例を回しながら。

## 原理（最小モデル）

- **Mark price と index price は別物.** Mark = perp venue 自体の orderbook 需給（fill / mid / smoothing）、Index = 原資産 spot 市場の加重平均（Binance / Coinbase / Kraken + outlier フィルタ）。Spot 出来高 ≫ perp、index は perp orderbook に対してゆっくり動く。
- **Premium 式.** \`premium = (mark − index) / index\` = perp が anchor からどれだけ符号付き分数で離れたか、+ なら mark > index、− なら mark < index、0 で完全 anchor。
- **Premium → Funding rate.** 1 interval（Hyperliquid = 1 時間）あたり \`funding_rate = clamp(premium / divisor, -cap, +cap)\`、divisor で小さい rate を頻繁に支払う + cap で最悪ケース支払いを bound。
- **Hyperliquid 実パラメータ.** Interval = 1 時間 / divisor = 8 / cap = ±4% per interval、premium 1% → rate = 1% / 8 = 0.125% per hour。
- **支払い方向と量.** \`payment = funding_rate × notional\`、rate > 0（mark > index）→ long → short、rate < 0（mark < index）→ short → long、絶対値は notional × |rate|。**プロトコルが手数料を取るのではない、トレーダー間の付け替え。**
- **経済インセンティブで mark が引き戻される.** Long が funding 支払い続けるなら long を解消するか short を立てる動機、orderbook bid が消え ask が増える → mark 下がる、逆も対称 = **funding 自体が price を動かすのでなく、トレーダーの行動を変えることで mark を anchor に戻す**。
- **Cap が当たるケース.** Premium > 32%（cap × divisor = 4% × 8）で rate が cap 張り付き、premium がさらに広がっても rate は ±4% で頭打ち、最悪ケース支払いを 1 時間あたり notional の 4% に bound。
- **Funding interval が 1 時間である理由.** 短すぎ（5 分）= 計算オーバーヘッド + 統計ノイズ、長すぎ（24 時間）= anchor 力弱い、1 時間が「経済シグナル + 実装コスト」の trade-off。

## 具体例 + ステップで組み立てる

# Mark、index、funding — 期限なしで perp が anchor を保つ仕組み

## ゴール

このレッスンで掴む概念:

- **Mark と index** — 同じ原資産について、別の方法で計算され、別の用途で使われる 2 つの価格。Funding メカニズム全体の出発点となる。
- **Premium の式** \`(mark − index) / index\` — perp が anchor からどれだけ離れたかを符号付きで表す分数。
- **Premium から funding rate へ** — \`divisor\` で割る理由（小さい rate を頻繁に支払う）と \`cap\` を当てる理由（最悪ケースの支払いを bound する）。
- **誰が誰に支払うか、なぜか** — rate の符号が方向を決め、本当に mark を index に引き戻すのは *経済インセンティブ* の方。
- **Hyperliquid の実パラメータ** — interval 1 時間、divisor 8、cap ±4%。これらの値での計算例。

このレッスンを終えると、以下に答えられる:

- 「Mark が index より上のとき、なぜ自分の long position は funding を支払うのか?」
- 「Mark と index がちょうど一致したら funding はどうなるのか?」
- 「Premium が 1% のとき、Hyperliquid での per-hour funding rate はいくつか?」

## おさらい

レッスン0 で問題を整理した。Perp には期限がないので、伝統的 futures に組み込まれている収束力は使えない。Perp 価格を原資産に追従させるには、別の何かが必要だ。

レッスン1 ではその「別の何か」を導入する。

## 2 つの価格、2 つの市場

**Mark price** は、その perp venue 自体で BTC がいくらと言っているかの価格だ。Venue によって計算式は違うが、共通点は perp の orderbook の需給で決まること — 直近の fill、bid/ask の mid、最近の fill の smoothing average のいずれか。誰かが perp の orderbook で bid を hit したり ask を lift したりすれば、mark は動く。

**Index price** は、原資産の spot 市場で BTC がいくらかを示す価格だ。複数取引所の spot 価格の加重平均（Binance、Coinbase、Kraken など）で構成され、outlier フィルタが入る。Spot の出来高は perp より圧倒的に大きいので、index は perp の orderbook に対してゆっくり動く。

平時には mark と index は近く追従する — 数 bp の乖離程度。Stress 下では離れる:

- **Squeeze**: short が買い戻しに追い込まれる → mark が瞬間的に index より 5%、10% 上に飛ぶ
- **Crash**: long が売りに追い込まれる → mark が index より下に落ちる
- **持続的なバイアス**: retail 中心の venue で bull market のとき、mark が何時間も index より上に張り付く

補正力がなければ、これらの乖離は持続してしまう。Funding がその補正力だ。

## Premium

**Premium** は mark が index からどれだけ離れたかを符号付きの分数で表す:

\`\`\`
premium = (mark − index) / index
\`\`\`

BTC ≈ $100k での具体例:

| Mark | Index | Premium | 読み方 |
| :--- | :--- | :--- | :--- |
| $100,000 | $100,000 | 0% | 乖離なし — funding はゼロ |
| $100,500 | $100,000 | +0.5% | Mark がやや上 — long が支払う |
| $99,500 | $100,000 | −0.5% | Mark がやや下 — short が支払う |
| $105,000 | $100,000 | +5% | 大きな squeeze; funding は cap に当たる |

符号が重要だ。プラスは mark が index より上（long が「払いすぎ」）、マイナスは mark が下（short が「払いすぎ」）。Funding はその不均衡の反対方向に流れる。

## Premium から funding rate へ

Premium は *乖離* そのものだ。Funding rate は、その乖離を実際の支払いに変換するときの *interval ごとの手数料* だ。3 つのつまみがある:

\`\`\`
rate_per_interval = clamp(premium / divisor, ±rate_cap)
\`\`\`

- **\`divisor\`** は収束力を複数 interval に分散する。Hyperliquid は **8** を使う。1% の premium なら、毎時の rate は 0.125%。24 時間で 3% の圧力を、1 度の大きな支払いではなく細かい増分で当てる。
- **\`rate_cap\`** は最悪ケースの手数料を bound する。Hyperliquid は **±4% / interval** に設定。Cap なしだと、100% の premium（mark が index の倍 — pathological）が 12.5%/hr の rate を意味してしまう。Cap が 4% に clip する。
- **\`interval\`** は支払いの頻度だ。Hyperliquid は **1 時間**。CEX の perp は様々（Binance は 8 時間ごと、dYdX は毎時）。

この 3 つから、interval ごとの実 rate が決まる。Hyperliquid のパラメータ、premium 1% なら: \`rate = clamp(0.01 / 8, ±0.04) = 0.00125 = 0.125%\`。

## 誰が誰に支払うか

符号規約: **rate がプラス → long が short に支払う**。マイナス → short が long に支払う。

直観: 不均衡を作っている側が、それを相殺している側に支払う。Long が mark を index より上に押し上げた → long が支払う。Short が mark を下に押し下げた → short が支払う。支払いがあると、不均衡側のポジションを持ち続けるのが少し損になり、退場（または反対側を取る）動機が生まれる。これが mark を index に引き戻す経済インセンティブだ。

支払いは venue が受け取るのではない。Trader 間で直接やりとりされる — long 全体が short 全体に、各 position の notional に比例して移動する。Venue レベルではゼロサム。Hyperliquid は帳簿係でしかない。

> 💡 **エンジニア向けの視点 — 符号付き size による 1 式実装:**
> 実装時、ポジションの方向を符号付きで管理する (Long = \`+size\`、Short = \`-size\`)。すると、すべてのトレーダーの残高更新は分岐なしの 1 式に圧縮できる:
>
> \`\`\`
> collateral -= size_with_sign × mark × rate
> \`\`\`
>
> - \`rate > 0\` かつ \`size > 0\` (Long) → \`collateral\` が減る = long が支払う ✓
> - \`rate > 0\` かつ \`size < 0\` (Short) → 二重マイナスで \`collateral\` が増える = short が受け取る ✓
> - \`rate < 0\` の場合も対称的に 1 式で正しく配線される
>
> マッチングエンジンが long/short の position を 1 つの \`i64\`/\`i128\` size として持っておけば、funding tick は分岐なしの線形スキャンになる。**Rust の型システムと符号規約を組み合わせることで、状態遷移が「絶対に対称」になる** — Consensus determinism を担保する上でこの種の「分岐の排除」は load-bearing だ。

## 計算例 — Hyperliquid のパラメータ

トレーダーが Hyperliquid で **10 BTC long** を持っている。現状:

- Mark price: $100,000
- Index price: $99,000
- Premium: (100,000 − 99,000) / 99,000 = +1.01%

この interval の funding rate:
\`\`\`
rate = clamp(0.0101 / 8, ±0.04) = 0.00126 = 0.126% / hour
\`\`\`

トレーダーの notional exposure:
\`\`\`
notional = |size| × mark = 10 × $100,000 = $1,000,000
\`\`\`

この 1 時間の funding 支払い（long が支払う）:
\`\`\`
funding = notional × rate = $1,000,000 × 0.00126 = $1,260
\`\`\`

24 時間、同じ premium が持続したら、long は同じ 10 BTC の exposure を持ったまま **$30,240 の funding を支払う**。Mark が index より上に張り付き続けている状態で long を持ち続けるコストだ。Funding は実質的に、不均衡な exposure に対する「家賃」になる。

対称的に、venue の各 short は $1,260（×時間）の取り分を、それぞれの notional に比例して受け取る。

## なぜこれが mark を index に anchor するのか

Funding payment は mark を直接動かさない。動かすのは *トレーダーの残高* だ。Anchoring は間接的、インセンティブ経由で起きる:

1. Mark が index より上 → long は毎時 funding を short に渡して血を流す
2. Long のトレーダーがコストを見て、position size を減らすか退場する
3. 売りが mark を orderbook 上で押し下げる
4. Mark が index に近づくと premium が縮む → funding が縮む → 圧力が緩む
5. 均衡: Mark は index 近傍に留まり、小さな振動と小さな funding 支払いが続く

これが funding が *連続的*（各 interval で少額）であって *終端的*（特定日に 1 度の大きな支払い）でない理由でもある。トレーダーは継続的なコストに対して行動を調整する。将来のイベントを予期して動くのではない。

### Mark / Index / Funding の引き戻しループ

3 者の関係を 1 周のフィードバックループに圧縮するとこうなる:

\`\`\`
       ┌────────────────────────────────────────────┐
       │  index price (CEX spot 加重平均)            │ ← 真の参照価格 (外生)
       └────────────────────┬───────────────────────┘
                            │
                            │ (mark − index) / index
                            ▼
       ┌────────────────────────────────────────────┐
       │  premium                                   │ ← どれだけ離れているか
       │    ÷ 8 (divisor) → clamp(±4%) (cap)         │
       └────────────────────┬───────────────────────┘
                            │ = funding rate (per interval)
                            ▼
       ┌────────────────────────────────────────────┐
       │  funding payment (毎 interval boundary)     │ ← rate > 0 なら long → short
       │    = size_with_sign × mark × rate           │   rate < 0 なら short → long
       └────────────────────┬───────────────────────┘
                            │ 不均衡側のトレーダーが「家賃」を払う
                            ▼
       ┌────────────────────────────────────────────┐
       │  不均衡側がポジションを縮小／反対側を取る   │ ← 経済インセンティブ
       └────────────────────┬───────────────────────┘
                            │ orderbook 上で売り (or 買い) が発生
                            ▼
       ┌────────────────────────────────────────────┐
       │  mark price が index 方向に動く             │ ← 引き戻し圧力 (内生)
       └────────────────────┬───────────────────────┘
                            │
                            └──► premium 縮小 → funding 縮小 → ループが緩む
                                 (均衡: mark ≈ index、小さな振動と小さな funding)
\`\`\`

**3 者の役割を 1 行で要約:**

- **index** = 真の参照価格 (anchor の目標)
- **mark** = orderbook の需給で動く市場価格 (anchor したい対象)
- **funding** = 両者の乖離を「インセンティブ経由で」引き戻す制御信号

「funding が mark を直接動かす」のではなく、「funding がトレーダーの残高を動かし、トレーダーが orderbook を動かし、orderbook が mark を動かす」という **3 段間接** が anchor の正体だ。Expiry 型の futures が「特定日に強制収束させる」のに対し、perp は「毎 interval で少しずつ引き戻す」— 連続的な制御信号で離散的な収束を置き換えている。

## Hyperliquid 固有の点

- **Index の構成**: 複数 CEX spot feed の加重平均。1 つの feed が他から離れすぎたら index を一時停止する deviation circuit breaker が入っている — single-venue な spot 操作に対する保護。
- **Tick での settlement**: 各 funding interval で、エンジンが非 flat な position を順に走査し、トレーダーの collateral balance を \`position_size × mark × rate\` で調整する。一括支払いではない — 各 position が個別に決済される。
- **Saturating な算術**: Funding 計算は \`RATE_SCALE = 1e9\`（parts per billion）スケールの符号付き整数を使う。すべての乗算は \`i128\` 中間値で行い、overflow 時は wrap せずに saturate する。Consensus determinism の規律 — すべての validator が同じ入力から同じ rate を計算する必要がある。
- **Tick 間で funding は累積しない (スナップショット方式)**: Interval の中で開いて閉じた position には funding がかからない。Hyperliquid の支払いイベントは、**毎時 00 分などの interval boundary の瞬間** にポジションを保有しているかどうかだけで判定される — その瞬間の position snapshot を取り、\`size × mark × rate\` を一括計算する。dYdX のような連続 funding (時間積分型) を経験してきた読者は要注意: ここは離散イベント方式のステートマシンであり、「保有時間に対する課金」ではなく「snapshot 時刻に保有していたかどうか」が支配的だ。**バグのない state machine を設計するときは、この境界条件を最初に固める。**
- **アーキテクチャ上のトレードオフ (Boundary Gaming)**: この方式は実装がシンプルで deterministic だが、副作用として「59 分に建てて 00 分を跨いで 01 分に閉じる」ような短時間保有でも 1 interval 分の funding を受払する。つまりトレーダーには boundary 直前直後でポジションを急開閉するインセンティブが生まれ、正時付近の板で一時的な流動性の歪み（スプレッド拡大）が発生しうる。**時間積分の複雑さを捨てる代わりに、境界ゲーミングの市場構造リスクを受け入れる**のが、この設計選択だ。

## よくある誤解

**「Funding は取引所に支払われる」。** 違う — funding は trader 間を直接移動する。Hyperliquid は funding payment から利益を得ない（取引手数料と builder code 手数料が別途あり、そちらが収益源）。

**「Funding rate が高いと perp は持つのが高い」。** 半分正しい。*不均衡側* を持つのが高い。相殺側を持つと逆に *もらえる*。「Funding を受け取る側に戦略的に乗る」取引は crypto で 1 つの yield 戦略カテゴリを成している。

**「Funding は常に mark を index に引き戻す」。** 結局は引き戻す。しかし持続的な不均衡（retail long が支配する数ヶ月の bull market など）では、funding がプラスのまま長期間続き、long から short に富を移転しながら mark が index 上に留まることがありうる。メカニズムが生み出すのは *圧力* であって、即時の補正ではない。

## 次のレッスン（レッスン2）

レッスン2 — **Margin model**。Mark と funding を立てたので、次は「$10k の collateral で 10 BTC long を持つ」の意味を解きほぐす。誰がどれだけのポジションをどれだけ持てるかを決める leverage と margin の数学だ。Initial vs maintenance margin、cross vs isolated を見て、ある具体的 position が mark の動きで「Safe」から「AtRisk」を経て「Liquidatable」に至るまでを順に辿る。

レッスン2 を終えると、Build OpenHL — Liquidation コースの レッスン1「\`MARGIN_SCALE\` + \`LiquidationParams\`」が「すでに理解しているパラメータの実装」として読めるようになる。

## 合格基準

- Mark と index の違い（perp orderbook 需給 vs spot 加重平均）を即答できる。
- Premium 式 \`(mark − index) / index\` と意味（符号付き乖離分数）を即答できる。
- Premium → funding rate の 2 ステップ（divisor で割る + cap で clamp）を即答できる。
- Hyperliquid のパラメータ（interval 1h / divisor 8 / cap ±4%）と計算例を即答できる。
- 支払い方向（rate > 0 で long → short、rate < 0 で short → long）と量（notional × |rate|）を即答できる。
- 「funding が price でなくトレーダー行動を変えることで anchor」のメカニズムを 1 文で説明できる。
- Cap が当たる premium 閾値（divisor × cap = 32%）と最悪ケース支払い率を即答できる。

## まとめ（3行）

- Funding 機構 = Mark - Index 観測 → premium 計算 → divisor で 1 時間レート化 → cap で最悪ケース抑制 → notional × rate で支払い、Hyperliquid は interval 1h / divisor 8 / cap ±4%。
- 支払いはトレーダー間付け替え（プロトコル手数料でない）、rate > 0 で long → short、経済インセンティブが orderbook 行動を変えることで mark を index に anchor、price そのものを直接動かすのでない。
- 次レッスンで margin model（collateral / position_size / notional / unrealized_pnl / equity の 5 量 + 4 状態）に踏み込み、funding を支払う「ポジション」が具体的に何かを定義、Funding コース実装は本式の Rust 化。
`,
                },
                {
                  title: 'レッスン2 — Margin model — collateral、leverage、equity、4 状態',
                  slug: 'perp-primer-margin-model-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 40,
                  xpReward: 70,
                  content: `# レッスン2 — Margin model — collateral、leverage、equity、4 状態

## 問い

L0 で perp、L1 で funding を立てた。どちらも「ポジションを持っているトレーダー」を抽象的に扱った。**L2 はその抽象に踏み込む** — 「ポジション」が具体的にドルと比率で何か、venue はどんなときに force-close できるか、それが margin model。

## 原理（最小モデル）

- **Position を記述する 5 量.** \`collateral\`（入金 USDC）/ \`position_size\`（符号付き、+ long / − short BTC unit）/ \`notional\`（\\|position_size\\| × mark = 現在ドル exposure）/ \`unrealized_pnl\`（(mark − entry) × position_size = mark で閉じたときの未確定損益）/ \`equity\`（collateral + unrealized_pnl = venue 上での実質純資産）。
- **トレーダー直接操作は 2 量のみ.** \`collateral\`（入出金）+ \`position_size\`（取引）。残り 3 量（notional / unrealized_pnl / equity）は venue が block ごとに mark から計算。
- **Initial margin と maintenance margin.** Initial = ポジション開設時に必要な collateral ratio（Hyperliquid ~10%、leverage 10× 相当）/ Maintenance = ポジション保持時の最低ライン（Hyperliquid ~2%、tier で変動）= 開設後、損失で margin ratio が initial 以下に落ちても open のまま、maintenance を下回ると force-close。
- **4 状態.** Safe（margin ratio ≥ initial）/ AtRisk（initial > ratio ≥ maintenance、追加取引禁止 / ポジション増額禁止 / 縮小と入金は OK）/ Liquidatable（ratio < maintenance かつ equity ≥ 0、venue が force-close）/ Underwater（equity < 0、損失が collateral を超えた、insurance fund 出動）。
- **4 状態 → engine 動作対応.** Safe = 全操作 OK、AtRisk = 新規取引拒否、Liquidatable = engine が force-close 発火（L3 で詳述）、Underwater = force-close + 不足分を insurance fund 補填。
- **Cross-margin vs isolated margin.** Cross = アカウント全 collateral が全ポジションの裏付け（1 つの含み益が別の含み損を相殺）、Isolated = ポジションごとに collateral 分離（1 つ liquidate されても他は無傷）。Hyperliquid デフォルト cross（積極的資金効率、洗練ユーザー向け）、isolated はオプション。
- **Funding が equity に効く経路.** 各 interval で \`equity += -funding_payment\`（支払えば減、受け取れば増）→ margin ratio 変化 → 状態境界を越えうる、Funding が単に「コスト」でなく **liquidation を早める力** にもなる。
- **1 ポジションを 5 mark で追う「経路」.** entry $100k → mark $90k（含み損、AtRisk 寸前）→ $80k（Liquidatable、force-close 発火）→ $70k（Underwater、insurance fund 出動）の段階を 4 状態で追える。

## 具体例 + ステップで組み立てる

# Margin model — collateral、leverage、equity、4 状態

## ゴール

このレッスンで掴む概念:

- **Perp position を記述する 5 つの量**: collateral、position size、notional、unrealized PnL、equity。それぞれの計算式、意味、venue が実際に track するもの。
- **Initial vs maintenance margin** — venue が使う 2 つのしきい値、それぞれがトレーダーに何を許可するか。
- **Margin health の 4 状態** — Safe、AtRisk、Liquidatable、Underwater。それぞれが engine の許可/強制動作に対応する。
- **Cross-margin vs isolated margin** — 同じ数学、違うスコープ。Hyperliquid が cross をデフォルトにする理由。
- **同じ position を 5 つの mark で追う** — 1 つの position が状態境界を渡る様子を順に見る。

このレッスンを終えると、以下に答えられる:

- 「$10k を deposit して BTC に 5× leverage を取ったら、notional はいくらか?」
- 「AtRisk と Liquidatable は何が違うのか?」
- 「なぜ Hyperliquid は 10% initial / 2% maintenance を使うのか?」

## おさらい

レッスン0 で perp とは何かを立て、レッスン1 で funding が mark を index に anchor する仕組みを見た。どちらも「ポジションを持っているトレーダー」を抽象的に扱った。

レッスン2 ではその抽象に踏み込む。「ポジション」が具体的にドルと比率で何なのか。Venue はどんなときに force-close できるのか。これが margin model だ。

## 5 つの量

Perp position は 5 つの数値で完全に記述できる:

| 量 | 式 | 意味 |
| :--- | :--- | :--- |
| \`collateral\` | （トレーダーが入金）| ポジションを裏付ける USDC |
| \`position_size\` | （符号付き: + long、− short）| BTC を何 unit long / short しているか |
| \`notional\` | \`\\|position_size\\| × mark\` | mark 価格での現在のドル exposure |
| \`unrealized_pnl\` | \`(mark − entry) × position_size\` | mark で閉じたときの損益。*まだ確定していない* |
| \`equity\` | \`collateral + unrealized_pnl\` | venue 上でのトレーダーの実質的な純資産 |

トレーダーが直接操作するのは \`collateral\`（入出金）と \`position_size\`（取引）の 2 つ。残り 3 つは venue が block ごとに mark から計算する。

具体例:

\`\`\`
collateral     = $10,000
position_size  = +0.5 BTC   (long)
entry          = $100,000
mark           = $100,000
notional       = 0.5 × 100,000 = $50,000
unrealized_pnl = (100,000 − 100,000) × 0.5 = $0
equity         = 10,000 + 0 = $10,000
\`\`\`

PnL がゼロなので、ポジションを開いた直後は equity = collateral。Mark が動けば equity もそれに合わせて動く。

## Leverage

**Leverage** は collateral と notional の間の倍率だ:

\`\`\`
leverage = notional / collateral
\`\`\`

例: \`leverage = 50,000 / 10,000 = 5×\`。Collateral $1 ごとに BTC への 5× の exposure を持っている。

Leverage は informational だ。エンジンは「leverage 上限」を直接強制しない — *margin ratio* のしきい値（次節）を強制する。実効 leverage の上限はそこから出てくる、もっと柔軟な形で。

## 2 つのしきい値: initial vs maintenance margin

**Initial margin** はトレーダーが position を *開く / 増やす* ときに必要な ratio。Hyperliquid は ~10%。開く時点での最大 leverage はおおよそ 10× になる。

**Maintenance margin** はトレーダーが position を *持ち続ける* ときに必要な ratio。これを下回ると engine が force-close する。Hyperliquid は ~2%（tier によって変わる — 大きな position ほど maintenance も高い）。

2 つのしきい値が異なるのは意図的だ:

- Initial > maintenance: initial を辛うじてクリアして開いたトレーダーには、liquidation に達する前に少し adverse な mark の動きを耐える余裕がある
- ギャップがなければ、ぎりぎりで開いた position は不利な tick が来た瞬間に必ず liquidate する
- ギャップは venue がトレーダーに与える *バッファ*。Liquidation に至る前に意思決定する（collateral を足す、partial close する、など）時間を確保する
- **同時に、これはシステム側の防衛ラインでもある。** Maintenance を割った瞬間に「即破綻」ではなく、清算エンジンが force-close 注文を市場に流し込んで約定するまでの **スリッページ + 起動レイテンシの吸収余地** を、このギャップが用意している。レッスン3 で見る force-close 注文は、この余地を予算として使って執行される — 余地が薄ければ薄いほど、insurance fund が負担する不足分が膨らむ。
- **反例で見る必然性 (Initial = Maintenance が危険な理由)**: もし initial と maintenance が同じ 2% なら、2.01% で開いたポジションは 1 tick の微小逆行だけで即 Liquidatable になる。急変時は、清算注文が板に入り約定するまでの短い遅延中に ratio が 0% を割って Underwater へ突き抜ける確率が高い。**Initial と Maintenance のギャップは、トレーダー保護だけでなく、システム全体のソルベンシーを守る「スリッページ・クッション」** そのものだ。

**Margin ratio** が中心的な量:

\`\`\`
margin_ratio = equity / notional
\`\`\`

例: \`margin_ratio = 10,000 / 50,000 = 20% = 2,000 bps\`。

20% は Hyperliquid の initial 10% と maintenance 2% の両方を大幅に超えている。Position は **Safe**。

## 4 状態

エンジンは非 flat な各 position を margin ratio に基づき 4 状態に分類する:

| 状態 | 条件 | エンジンの動作 |
| :--- | :--- | :--- |
| **Safe** | \`ratio ≥ initial_margin_bps\`（≥ 10%）| トレーダーは新規 / 追加できる |
| **AtRisk** | \`ratio ∈ [maintenance, initial)\`（2% ≤ x < 10%）| 保持は可、新規リスクは禁止 |
| **Liquidatable** | \`ratio < maintenance, equity ≥ 0\`（< 2% だが underwater ではない）| Market で force-close、残額をトレーダーに返す |
| **Underwater** | \`equity < 0\`（損失が collateral を超えた）| Force-close + insurance fund が不足を吸収（レッスン3 のトピック）|

Liquidatable と Underwater の区別は、*残余を誰が負担するか* を決めるので重要だ。Liquidatable ではトレーダーの残 collateral が close + fee をカバーする。Underwater でも close は実行されるが、トレーダーが払いきれない分は venue の insurance fund が負担する。

これが Build OpenHL — Liquidation コースが \`MarginHealth\` enum として実装する 4 状態分類だ。同じ 4 状態、同じ境界条件。

### 4 状態の遷移を 1 本の軸で見る

\`margin_ratio\` を高 → 低の 1 本の数直線として眺めると、4 状態は隣接する 4 区間に対応する:

\`\`\`
   高 ◄────────────── margin_ratio = equity / notional ──────────────► 低 / 負
       20%             10%                   2%                0%
   ─────┼──────────────┼─────────────────────┼─────────────────┼─────────►
        │              │                     │                 │
        │  ┌────────┐  │   ┌──────────┐      │ ┌────────────┐  │ ┌──────────┐
        │  │  Safe  │  │   │  AtRisk  │      │ │Liquidatable│  │ │Underwater│
        │  │        │  │   │          │      │ │            │  │ │          │
        │  │ 新規 / │  │   │ 保持のみ │      │ │ engine が  │  │ │ engine が│
        │  │  追加  │  │   │ 可、新規 │      │ │ force-close│  │ │ close +  │
        │  │  可    │  │   │  禁止    │      │ │            │  │ │ insurance│
        │  └────────┘  │   └──────────┘      │ └────────────┘  │ │   fund   │
        │              ▲                     ▲                 ▲ └──────────┘
        │     initial margin (10%)   maintenance margin (2%)  equity = 0
        │              │                     │                 │
        │   ratio ≥    │  maintenance ≤      │  0 ≤ ratio <    │  equity < 0
        │   initial    │  ratio < initial    │  maintenance    │  (notional は正)
        │              │                     │                 │
        │  条件分岐:   │  分岐:              │  分岐:          │  分岐:
        │  if ratio    │  else if ratio      │  else if equity │  else
        │   ≥ initial  │   ≥ maintenance     │   ≥ 0           │   { Underwater }
        │   {Safe}     │   {AtRisk}          │   {Liquidatable}│
        │                                                      │
        └─────── 上記の数値例 ($10k coll、0.5 BTC long、entry $100k) ────────────┐
                                                                                  │
              Safe → AtRisk      の境界: mark = $88,889  (entry から −11.1%)      │
              AtRisk → Liquidatable の境界: mark = $81,633  (entry から −18.4%)   │
              Liquidatable → Underwater の境界: mark = $80,000  (entry から −20.0%) │
                                                                                  │
        ───────────────────────────────────────────────────────────────────────────┘
\`\`\`

この図のとおり、\`MarginHealth\` enum の判定は **margin_ratio (および equity の符号) という単一スカラーに対する 4 区間分類** に還元できる。レッスン3 ではこの 4 区間それぞれで「engine が実際に何をするか」を順に辿る — \`Safe\` と \`AtRisk\` は何もしない (=トレーダー側の自由)、\`Liquidatable\` は force-close 注文を market に流す、\`Underwater\` は force-close + insurance fund 引き出し。**コードの分岐は数直線の区間に 1 対 1 で対応する** — これが Rust の \`match MarginHealth { Safe => …, AtRisk => …, Liquidatable => …, Underwater => … }\` で綺麗に書ける理由だ。

## 計算例 — 同じ position、5 つの mark 価格

トレーダー: $10k collateral、0.5 BTC long、entry $100,000。Hyperliquid params（initial 10%、maintenance 2%）。

| Mark | Notional | PnL | Equity | Ratio | 状態 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$100,000** | $50,000 | $0 | $10,000 | **20.0%** | Safe (初期状態) |
| **$95,000** | $47,500 | −$2,500 | $7,500 | **15.8%** | Safe |
| **$88,889** | $44,444 | −$5,556 | $4,444 | **10.0%** | **Safe ↔ AtRisk 境界 (理論値)** |
| **$85,000** | $42,500 | −$7,500 | $2,500 | **5.9%** | AtRisk |
| **$82,000** | $41,000 | −$9,000 | $1,000 | **2.4%** | AtRisk (ぎりぎり) |
| **$81,633** | $40,816 | −$9,184 | $816 | **2.0%** | **AtRisk ↔ Liquidatable 境界 (理論値)** |
| **$81,500** | $40,750 | −$9,250 | $750 | **1.8%** | Liquidatable |
| **$80,000** | $40,000 | −$10,000 | $0 | **0.0%** | Liquidatable (残余ゼロ — 次 tick で Underwater 化リスク) |
| **$78,000** | $39,000 | −$11,000 | −$1,000 | **−2.6%** | **Underwater** |

境界を越える瞬間が 2 つある:

1. **Safe → AtRisk (mark $88,889 が境界、entry から −11.1%)**: 表の $95,000 → $85,000 の間。$88,889 を下回ると、トレーダーは保持はできるが、position を追加することも新規 position を取ることもできなくなる。UI が警告を出すのも通常この時点。
2. **AtRisk → Liquidatable (mark $81,633 が境界、entry から −18.4%)**: 表の $82,000 → $81,500 の間。$81,633 を下回ると、エンジンが force-close を発動する。Maintenance を下回ると、collateral がもう取引と liquidation fee を払いきれない。

この例では、Liquidatable に到達するのに必要な mark 下落は entry から **約 18.4%** だけ ($81,633 / $100,000)。これは leverage の逆数に近い: 5× leverage (notional/equity = $50k/$10k) で adverse 18.4%（≈ 1/5 × maintenance ギャップ）の動きで吹き飛ぶ。10× で ~9%、50× だと ~1.8%（日中ふつうに見る幅）。

**エンジン上では leverage は risk 対称的**: 高 leverage = 有利な動きで大きな upside、*ただし小さな adverse な動きで liquidate する*。数学はどちらの方向にも肩を持たない。Position を開いた時点でトレーダーが risk profile を選んだだけだ。

## Cross-margin vs isolated margin

ここまでは「トレーダーが 1 ポジション持っている」前提で話した。実際には、トレーダーは同時に複数（BTC、ETH、HYPE、SOL、...）持てる。Venue が複数 position の collateral を共有させる方法が 2 つある:

**Cross-margin**（Hyperliquid のデフォルト）: すべての position が 1 つの collateral pool を共有する。Margin ratio は notional の *合計* に対して *合計* equity で計算する。利益が出ている BTC long が、損失中の ETH short のバッファになる。トレーダーにとっても engine にとっても単純。

**Isolated margin**（Hyperliquid では asset 単位で opt-in）: 各 position が専用の collateral subset を持つ。1 つの position が liquidate しても他の position に影響しない。「他の損失で連鎖されたくない確信あるポジション」に使う。

数学は同じ — \`margin_ratio = equity / notional\` — 違うのは *スコープ* だけ。Cross は合計、isolated は per-position。

Hyperliquid はバッファ効果を望むトレーダーが大半なので cross をデフォルトにしている。Isolated は opt-in。

## Hyperliquid 固有の点

- **Initial margin の tier**: Hyperliquid は実際には tiered initial margin を使う。「~10%」は小さい position に対するベースライン。Position size が asset ごとのしきい値を超えると、initial margin 要件が上がる（大口 BTC position だと 20% / 30% を要求されうる）。単独トレーダーへの systemic exposure に上限を当てる仕組み。
- **Maintenance margin の tier**: 同じく — 大きい position ほど maintenance も高い。DIY Perp track では教育目的で flat なしきい値に単純化しているが、本番デプロイは tiered。
- **Cross-margin がデフォルト**: トレーダーは USDC を 1 度 deposit して、どの market でも取引できる。
- **Margin 計算は consensus 内**: すべての validator が同じ snapshot から同じ margin ratio を計算する。これが Build OpenHL — Liquidation コースの レッスン1 が教える determinism property の根拠。

## よくある誤解

**「Liquidation は position がゼロになったとき起きる」。** 違う — liquidation は maintenance しきい値で起きる。ゼロ equity の *上* だ。Maintenance とゼロの間のバッファ（notional の ~2%）が liquidation fee と close order の slippage を吸収する。ゼロまで待ったら、トレーダーの残額はもう fee を払えない。

**「Leverage が高い = profit が高い」。** Leverage が高い = collateral 単位あたりの *position size* が大きい。Collateral に対する % リターンは、gain でも loss でも大きくなる。Expected value は leverage で変わらない — 変わるのは variance だけ。

**「Cross-margin は isolated より常に良い」。** 違う。Cross が良いのは、すべての position が好意的に相関しているとき（long だけの portfolio など）。Cross が *悪い* のは、1 つの position が不釣り合いに吹き飛んだとき — portfolio 全体を liquidate しうる。Isolated はその risk を隔離する。Cross vs isolated は本物の risk management の判断であって、ただのデフォルトではない。

## 次のレッスン（レッスン3）

レッスン3 — **Liquidation、insurance fund、ADL**。状態を分類した。次は position が Liquidatable や Underwater に渡ったとき *何が起きるか* を順に辿る。エンジンが close order を出す、matching engine が約定させる、fee が insurance fund に流れる、不足が fund を drain する、稀に insurance fund が枯渇すると ADL が発動する。

レッスン3 を終えると、perp の機構の完全なモデルが手に入る。そして Build OpenHL — Liquidation コースの レッスン4〜7（margin math + 分類 + close order 生成）が「すでに理解している内容の Rust 実装」として読めるようになる。

## 合格基準

- 5 量（collateral / position_size / notional / unrealized_pnl / equity）の計算式と意味を即答できる。
- トレーダー直接操作の 2 量と venue 計算の 3 量を区別できる。
- Initial vs maintenance margin の意味（開設しきい値 vs 保持しきい値）を即答できる。
- 4 状態（Safe / AtRisk / Liquidatable / Underwater）と各々の engine 動作を即答できる。
- Cross-margin vs isolated margin の trade-off と Hyperliquid のデフォルト選択を即答できる。
- Funding が equity に効く経路と状態境界を越えうる仕組みを 1 文で説明できる。
- 1 ポジションを mark を下げながら 4 状態で追う「経路」を順に説明できる。

## まとめ（3行）

- Margin model = 5 量（collateral / position_size / notional / unrealized_pnl / equity）+ 2 しきい値（initial ~10% / maintenance ~2%）+ 4 状態（Safe / AtRisk / Liquidatable / Underwater）。
- Cross-margin デフォルト（Hyperliquid）= アカウント全 collateral が全ポジションを裏付け、isolated はオプション、funding が equity に効くことで状態境界を越えうる。
- 次レッスン L3 で AtRisk → Liquidatable → Underwater 境界での実動作（force-close + insurance fund 補填 + 最終手段 ADL）を辿り、Liquidation コース実装はこの 4 状態を Rust 状態機械として表現したもの。
`,
                },
                {
                  title: 'レッスン3 — Liquidation、insurance fund、ADL — セーフティネットの仕組み',
                  slug: 'perp-primer-liquidation-insurance-adl-ja',
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 35,
                  xpReward: 60,
                  content: `# レッスン3 — Liquidation、insurance fund、ADL — セーフティネットの仕組み

## 問い

L2 で 4 状態（Safe / AtRisk / Liquidatable / Underwater）を立てた。**L3 はその境界で実際に何が起きるか辿る** — AtRisk から Liquidatable への遷移で何が発火するか、equity が collateral を超えたとき insurance fund がどう吸収するか、それも枯渇したら最終手段 ADL がどう発動するか、なぜ ADL は controversial か。

## 原理（最小モデル）

- **トリガー.** Engine が block ごと全非 flat アカウントの margin ratio を評価、\`margin_ratio < maintenance_margin_bps\` かつ \`equity ≥ 0\` で **Liquidatable**、\`equity < 0\` で **Underwater**、人間介在なし、second chance なし、全 validator 同じデータで同じ判定。
- **Force-close の仕組み.** Engine が 3 フィールド close order spec 生成（\`side\` = position 方向の反対、\`qty\` = \`|size|\` フルサイズ、\`type\` = MARKET）→ 通常 orderbook に流す → 反対側の trader が約定。
- **Liquidation fee.** Close notional の 1.5%（Hyperliquid）が **insurance fund に流れる**、プロトコル取り分でなく「リスクを負ってもらっている家賃」。
- **Solvent close vs underwater close.** Solvent（equity ≥ close cost + fee）= 残額がトレーダーに返る / Underwater（equity < close cost + fee）= 不足分を **insurance fund が吸収**、トレーダー責任は 0 までで止まる（規制ある venue では更に保護）。
- **Insurance fund の正体.** Solvent close から fee で積み上がり、underwater close で目減りする、プロトコル所有のバッファ、loss を chain 全体に転嫁しないための緩衝材。
- **ADL (Auto-Deleveraging) — 最終手段.** Insurance fund 枯渇かつ underwater 発生 → engine が **reverse side で最も儲かっているトレーダー** から強制的に position を奪い、underwater 側を相殺、儲かったトレーダーは利益を「失う」（自分のせいでもない）= controversial、回避は insurance fund を厚く保つこと。
- **ADL が controversial な 3 理由.** ① 無関係なトレーダーが利益を失う（counterparty risk が分散される）、② 予測不可能（誰が ADL されるか事前に分からない）、③ winning trade の「上限」になる（無限の利益が ADL で頭打ち）。
- **3 段セーフティネット.** Liquidation fee → insurance fund（通常の損失吸収）→ ADL（極端な market 崩壊時の最終手段）。Insurance fund を厚く保てば ADL は出動しない、これが「liquidation fee = 家賃」の根拠。

## 具体例 + ステップで組み立てる

# Liquidation、insurance fund、ADL — セーフティネットの仕組み

## ゴール

このレッスンで掴む概念:

- **「Force-close」が実際にすること** — エンジンが position の反対 side、フルサイズの market order を生成し、通常の取引と同じ orderbook に流す。
- **Liquidation fee の行き先** — close notional の数 % が insurance fund に流れる。プロトコルが負ってくれている risk への「家賃」。
- **Solvent close と underwater close** — トレーダーの equity が close をカバーできる場合（Liquidatable）は残額が返る。カバーできない場合（Underwater）は不足を insurance fund が吸収する。
- **Insurance fund がなぜ存在するか** — solvent close から積み上がり、underwater close で目減りする。
- **ADL（Auto-Deleveraging）** — insurance fund が枯渇したときの最終手段、そしてなぜ controversial か。

このレッスンを終えると、以下に答えられる:

- 「Liquidate されたとき、残った collateral はどこに行くのか?」
- 「Insurance fund とは何で、誰が積み立てるのか?」
- 「Insurance fund が空になったら、underwater な position はどうなるのか?」

## おさらい

レッスン0 で perp を立て、レッスン1 で funding が mark を anchor する仕組みを示し、レッスン2 で position を 4 状態に分類した。レッスン3 では、AtRisk と Liquidatable の境界、Liquidatable と Underwater の境界で *実際に何が起きるか* を辿る。

ここで perp のモデルが chain 全体にとって load-bearing になる。他のトレーダーの安全は、liquidation が正しく動くことに依存する。

## トリガー

レッスン2 のおさらい: \`margin_ratio < maintenance_margin_bps\` かつ \`equity ≥ 0\` なら **Liquidatable**。\`equity < 0\`（PnL が collateral を超えた）なら **Underwater**。

エンジンは block ごとに、すべての非 flat なアカウントの margin ratio を評価する。Maintenance しきい値を下回った瞬間、そのアカウントの liquidation パイプラインを当該 block で発火させる。人間が間に入ることもなく、待つこともなく、second chance もない。すべての validator、すべての block、同じデータで。

## Force-close の仕組み

エンジンが liquidation を決めると、**close order spec** を 3 フィールドで生成する:

| フィールド | 値 |
| :--- | :--- |
| \`side\` | Position 方向の反対（long → SELL、short → BUY）|
| \`qty\` | Position size の絶対値 \`\\|size\\|\`、フルサイズ |
| \`account\` | Liquidate されたトレーダーの account ID |

価格はない — 常に **market order**。エンジンは価格を選ばない。Orderbook が今提示している価格で受ける。Matching engine が他のトレーダーの resting limit orders に対して close を約定させる。

機械的には通常の取引と同じだ。トレーダーの position が閉じる。Counterparty（resting order が約定した相手）が position を開くか増やす。Mark は new top-of-book を反映して動く。

> 💡 **コラム: トレーダーが置くストップロス (逆指値) との違い**
>
> 表面的な挙動 — トリガー条件を満たすと市場価格で売る — は似ているが、システム境界の位置がまったく違う:
>
> | | ストップロス (逆指値成行) | Force-close (清算) |
> | :--- | :--- | :--- |
> | 発注主体 | トレーダー本人 (クライアント) | バリデータ全員が合意したステートマシン本体 |
> | 注文の経路 | RPC → mempool → block → matching engine | block 実行中にエンジン内部から直接 orderbook に inject |
> | 失敗モード | 署名エラー / nonce 衝突 / ガス不足 / RPC ダウン等で失敗しうる | 失敗が構造的にあり得ない (注文を流す主体がコンセンサス自身) |
> | キャンセル可 | トレーダーが取り消せる | 取り消し不能 (state machine が「発射」と決めたら必ず約定する) |
>
> 一般のトレーダー向け解説では「マージン不足になるとストップロスが自動発火する」と表現されることがあるが、エンジン視点では別物だ。**清算は『特権注文 (privileged order)』** — \`block_execute\` の中でエンジンが自ら orderbook に書き込む、外部からは到達不可能な経路の注文 — として実装される。レッスン2 で見た \`MarginHealth\` enum の \`Liquidatable\` 分岐が、まさにこの特権注文の発火元になる。

具体例:

\`\`\`
Liquidation 前のトレーダーの position:
  side:           LONG
  size:           1 BTC
  entry:          $100,000
  collateral:     $10,000
  close 時の mark: $80,500  ($81,000 から落ちて maintenance を割った直後)

エンジンの生成する spec:
  side:           SELL    (LONG の反対)
  qty:            1 BTC   (フルサイズ)
  type:           MARKET

Matching engine が $80,400 で約定（market sell が bid stack を打って小さい slippage）。

実現 PnL: (80,400 − 100,000) × 1 = −$19,600
\`\`\`

トレーダーは $10k の collateral で出発したが、close で $19.6k 失った。Fee 前で既に $9.6k underwater だ。Fee を足してみる。

## Liquidation fee

Hyperliquid は **close notional の ~1.5%** を liquidation fee として取る。Fee はトレーダーの collateral から引かれ、insurance fund に積まれる。

例:
\`\`\`
fee = closed_notional × 0.015
    = $80,400 × 0.015
    = $1,206
\`\`\`

実現 PnL に足すと、トレーダーの total loss = $19,600 + $1,206 = $20,806。

$10k の collateral に対して、liquidation 後のトレーダーの *正味* ポジションは:
\`\`\`
collateral_remaining = 10,000 − 20,806 = −$10,806
\`\`\`

マイナスだ。**Close が完了する前から既に Underwater だった。**

その $10,806 の不足はどうなるのか? Insurance fund が吸収する。

## Solvent close と underwater close — 2 つの道

区別を具体的にするため、underwater 例の隣にもう少し穏やかなシナリオを置く:

**シナリオ A: Solvent close（Liquidatable）**

\`\`\`
Liquidatable ケース:
  collateral:    $10,000
  size:          0.5 BTC long、entry $100,000
  close 時の mark: $82,000
  notional:      $41,000
  equity:        10,000 + (82,000 - 100,000) × 0.5 = 10,000 - 9,000 = $1,000
  ratio:         $1,000 / $41,000 = 2.4% — ぎりぎり AtRisk
  
  Mark が $81,500 に落ちる — ratio が 1.8% になり、Liquidatable
  
エンジンが $81,400 で close:
  実現 PnL = (81,400 - 100,000) × 0.5 = -$9,300
  fee = 81,400 × 0.5 × 0.015 = $611  (notional × fee_rate)
  total loss = 9,300 + 611 = $9,911
  collateral_remaining = 10,000 - 9,911 = +$89 がトレーダーに返る
  insurance_fund_credit = +$611 (fee)
\`\`\`

**Solvent close: トレーダーに $89 が返り、insurance fund に $611 が積まれる。**

次に underwater ケース（より急な価格下落、バッファが間に合わなかった場合）:

\`\`\`
Underwater ケース:
  同じ初期 position だが、mark が 1 block で $82,000 から $76,000 に gap した（$81,500 で発火する機会がなかった）。
  
  実現 PnL = (76,000 - 100,000) × 0.5 = -$12,000
  fee = 76,000 × 0.5 × 0.015 = $570
  total loss = $12,570
  collateral_remaining = 10,000 - 12,570 = -$2,570 (insurance fund が補填)
  insurance_fund_credit = +$570 (fee) - $2,570 (不足) = -$2,000 (純減)
\`\`\`

**Underwater close: トレーダーは $10k の collateral を全部失い、insurance fund は $2,000 の純減（fee で $570 受け取り、$2,570 を支払い出した）。**

Insurance fund の残高は、入る fee（solvent close から）と出ていく不足支払い（underwater close から）の差になる。平時には fee が支配的で、fund は増えていく。Market crash で underwater が多発すると drain する。

## Insurance fund

Insurance fund は venue が単一の balance として管理するもので、次の役割を持つ:

- **受け取る**: すべての liquidation（solvent でも underwater でも）から liquidation fee を受け取る
- **支払う**: Underwater なアカウントが自分の損失をカバーできないときに不足を支払う
- **Venue 全体の支払い能力を提供する** — すべてのトレーダーの position は、暗黙のうちに venue の collateral プール全体に裏付けられている

Hyperliquid（および大半の CEX）では venue の insurance fund 残高は公開されている。Stress 下で fund が縮んでいくのを観察するのは、market panic を読み取る最も clean な指標の 1 つだ。

ここが重要 — **insurance fund は無限ではない。** 枯渇したら venue は窮地に立つ。Fallback メカニズムが ADL だ。

## ADL — Auto-Deleveraging

Insurance fund が空でさらに別のアカウントが Underwater になったら、誰かが損失を吸収しなければならない。Hyperliquid（および多くの CEX）は最終手段として **Auto-Deleveraging (ADL)** を実装している:

1. Venue が利益が出ている反対 side の position の **ranking** を計算する（例: 同じ下落で利益を上げている short）。
2. Ranking 上位（最も利益が出ている + 高 leverage）から、その position を **force-close** して不足を吸収させる。
3. Close された position の実現 PnL がトレーダーに渡る — 利益は「支払われる」が、position は失う。

> 💡 **なぜ ADL は orderbook を通さないのか?**
>
> 「不足が出たなら、underwater の position を市場でガンガン force-close すればいい」と思うかもしれない。だが、その瞬間に orderbook には逆方向の巨大な market order が連射される— bid stack を突き抜けて mark を更にクラッシュさせ、その下落で別の position が Underwater 化する。**フィードバックループが暴走する。**
>
> ADL はこのループを断ち切るために、**orderbook を一切経由しない**設計になっている:
>
> - 1 つの破綻 position と 1 つの勝ち position を、エンジン内部の帳簿上で **直接相殺 (match & cancel)** する
> - 相殺された 2 つの position は、両方とも venue の books から消える
> - Orderbook の bid / ask には 1 satoshi も触れない → 価格に追加のクラッシュ圧をかけない
>
> つまり ADL は「市場での清算」ではなく **「帳簿上の名寄せ・netting」** — システム内部で勝者と敗者を直接マッチさせて、両者の position を同時に消去するオフチェーン (正確には off-orderbook) な相殺処理だ。Stage 10c (multi-account scanner) の実装でも、ADL パスは \`book.submit()\` を呼ばず、\`Position\` レコードを直接 mutate して削除する。**「市場を汚さずに、帳簿の上だけで損失を勝者に転送する」** — これは liquidation の連鎖が板をさらに壊して次の清算を呼ぶ **デス・スパイラル (death spiral)** を遮断するための、最後のファイアウォールである。

ADL は **非常に不評** だ。マーケットの crash を正しく予測して short で勝っているトレーダーは、勝ち分をもっと伸ばしたいので force-close されたくない。ただし insurance fund がカバーできない以上、*誰かが loss を引き受けなければならない* — 現金は保存則に従う。ADL はその loss を、その move から最も「勝った」側に分配する仕組み。

Hyperliquid の設計は ADL を **極めて稀** にすることを狙っている:

- 高めの liquidation fee で、平時に insurance fund を厚く capitalize しておく
- Cross-margin（デフォルト）で多くのアカウントを resilient にする — 1 つの position の損失を他で buffer できる
- DIY Perp track の Stage 10c（multi-account scanner）が ADL を fallback path として実装する。それが最後のレッスンになっているのは、ここまで到達しないこと自体が目標だから。

## セーフティネットの階層構造

レッスン2 のマージン要件から ADL まで、損失を吸収する 4 層が下にカスケードしている。**上の層で止まれば止まるほど、トレーダーにも venue にもダメージが小さい:**

\`\`\`
   ┌─────────────────────────────────────────────────────────────────┐
   │ Layer 0: Margin requirement (レッスン2 で見た)                          │
   │   Initial 10% / Maintenance 2% でリスク量を上限規制              │
   │   → 「トレーダー自身の collateral で損失をカバーできる範囲」      │
   │   止まる条件: ratio ≥ maintenance のまま市場が反発する            │
   └────────────────────────────────┬───────────────────────────────┘
                                    │ 失敗: ratio < maintenance に陥落
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ Layer 1: Force-close at maintenance (Solvent close)              │
   │   エンジンが市場で position を閉じる、collateral から fee を徴収  │
   │   → 大多数のケースはここで止まる (insurance fund は積み増しに回る) │
   │   止まる条件: close 実現 PnL + fee ≤ collateral                  │
   └────────────────────────────────┬───────────────────────────────┘
                                    │ 失敗: close 後も equity < 0 (Underwater)
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ Layer 2: Insurance fund                                          │
   │   過去の solvent close で積み上げた fee 残高から不足を補填        │
   │   → 単一の Underwater 口座を吸収できる                            │
   │   止まる条件: insurance_fund_balance ≥ shortfall                 │
   └────────────────────────────────┬───────────────────────────────┘
                                    │ 失敗: insurance fund が枯渇 (残高 = 0)
                                    ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ Layer 3: ADL (Auto-Deleveraging) — 最終手段                       │
   │   勝者側の position を帳簿上で強制相殺、orderbook には触れない    │
   │   → ここに到達するのは大規模 crash のときだけ                     │
   │   止まる条件: 必ず止まる (損失を勝者に分配することで保存則を維持)  │
   └─────────────────────────────────────────────────────────────────┘
\`\`\`

**この階層の読み方:**

- **下の層に落ちるほど痛みが拡散する**: Layer 1 ではトレーダー本人だけが損する。Layer 2 では venue が venue 全体の資金から払う。Layer 3 では関係のない (勝っている) 別トレーダーまで巻き込む。
- **各層が「次の層に渡す前に absorb する」量を最大化する設計**: Initial と Maintenance の差 (レッスン2 で見た 8% のギャップ) は Layer 1 が吸収できる余地、liquidation fee の 1.5% は Layer 2 の補充ペース、cross-margin (1 口座内の利益で他の損失を相殺) は Layer 1 の到達を遅らせる、といった具合。**venue 設計とは、上の層が下の層に「仕事を渡さない」ための数値選択そのもの。**
- **コード分岐との対応**: Stage 10c の \`MarginHealth\` enum 分岐は、この階層の Layer 1-3 への遷移ロジックそのもの。\`Safe\` / \`AtRisk\` = Layer 0、\`Liquidatable\` = Layer 1、\`Underwater\` + insurance fund 残高あり = Layer 2、\`Underwater\` + insurance fund 枯渇 = Layer 3。**4 状態の enum と 4 層の防御は 1 対 1 で対応する。**

## Hyperliquid 固有の点

- **Liquidation fee**: ETH/BTC で ~1.5%、より liquid な資産では低め。Closed notional に対して課金。
- **Insurance fund の可視性**: 残高は on-chain で照会可能。
- **ADL ranking**: PnL % と leverage を組み合わせる — 高 leverage で利益が大きい position から順に hit される。
- **ADL の予防**: Hyperliquid の市場設計（cross-margin デフォルト、tiered margin、高めの fee）は ADL を稀に保つために組まれている。2024 年の crypto crash でも、HL の ADL は競合 venue より 1 桁少なかった。

## よくある誤解

**「Liquidation は venue が自分の金を『取る』こと」。** 違う — liquidation は venue が *market で position を閉じる* こと。Market が逆方向に動いたから金が減るのであって、venue が抜き取っているわけではない。Fee は実現 loss に比べれば小さい（~1.5%）。Venue が liquidation から「儲ける」のは insurance fund が増える意味だけで、トレーダーの資金に他の請求権はない。

**「閉じなければ liquidation は避けられる」。** 正確には *collateral を足す限り* だ。閉じずに collateral も足さなければ、mark が十分に動けば必ず liquidate する。AtRisk のときのトレーダーの仕事は、Liquidatable になる前に collateral を足すか、partial close すること。

**「Insurance fund があるから Hyperliquid は risk-free」。** 違う。Insurance fund が吸収するのは **個別トレーダーの不足分**、つまり 1 つの position が自分で損失をカバーできない場合だ。*Systemic* な失敗（orderbook 全体の gap、matching engine の故障、smart contract のバグ）はカバーしない。さらに枯渇したら ADL が loss を他のトレーダーに分配する。Insurance fund は安全レイヤーであって保証ではない。

## Primer の終わり

これで以下を理解した: 

- **Perp とは何か**（レッスン0）
- **Funding が mark を index に anchor する仕組み**（レッスン1）
- **Margin と 4 状態の動作**（レッスン2）
- **Liquidation、insurance fund、ADL が最悪ケースを扱う仕組み**（レッスン3）

DIY Perp track が前提にしているモデルの全体だ。\`compute_premium\` の各式、\`MarginHealth\` の各 variant、\`close_order_spec\` の各行 — すべてが本 primer のどこかをコードで実装している。

**DIY Perp track に進む準備ができた。** 出発点は:

→ **Build OpenHL — Consensus Substrate**（基盤編: BFT + Reth を接続する）

すでに consensus と orderbook を経験済みで、perp 固有レイヤーから入りたい場合:

→ **Build OpenHL — Funding**（レッスン1 で見た内容を実装する）

→ **Build OpenHL — Liquidation**（レッスン2 + レッスン3 で見た内容を実装する）

## 合格基準

- \`margin_ratio < maintenance\` と \`equity < 0\` の境界 2 判定（Liquidatable と Underwater）を即答できる。
- Force-close の 3 フィールド close order spec（side / qty / type）を即答できる。
- Liquidation fee の行き先（insurance fund）と「家賃」のメタファーを即答できる。
- Solvent close と underwater close の差（残額返却 vs insurance fund 吸収）を即答できる。
- Insurance fund の収支（fee で積上、underwater で目減り）を 1 文で説明できる。
- ADL の発動条件（insurance fund 枯渇 + underwater）と仕組み（reverse side の儲け頭から強制）を即答できる。
- ADL が controversial な 3 理由（無関係者損失 / 予測不可 / 利益上限）を即答できる。
- 3 段セーフティネット（fee → insurance → ADL）を即答できる。

## まとめ（3行）

- Liquidation engine = block ごと margin ratio 監視、\`< maintenance\` で force-close（3 フィールド close order spec → 通常 orderbook）、fee 1.5% notional が insurance fund に。
- Insurance fund = solvent close fee で積上 + underwater close で目減り、プロトコル所有バッファ = loss を chain 全体に転嫁しないための緩衝材、トレーダー責任は 0 までで止まる。
- ADL = insurance fund 枯渇 + underwater 同時発生時の最終手段、reverse side の儲け頭から強制 deleverage = controversial（無関係者損失 / 予測不可 / 利益上限）、回避は insurance fund を厚く保つこと、これで perp primer 完走、DIY Perp track コードが「すでに理解した式の実装」として読める状態に到達。
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
