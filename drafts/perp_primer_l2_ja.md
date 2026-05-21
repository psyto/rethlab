# Building Perp DEX Primer — L2 draft (JA) — concept course

> DIY Perp track の prerequisite。概念のみ、コードなし。

## L2 — `perp-primer-margin-model-ja`

**Title**: Margin model — collateral、leverage、equity、4 状態

**Duration**: 40 分 · **XP**: 70

---

````markdown
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

L0 で perp とは何かを立て、L1 で funding が mark を index に anchor する仕組みを見た。どちらも「ポジションを持っているトレーダー」を抽象的に扱った。

L2 ではその抽象に踏み込む。「ポジション」が具体的にドルと比率で何なのか。Venue はどんなときに force-close できるのか。これが margin model だ。

## 5 つの量

Perp position は 5 つの数値で完全に記述できる:

| 量 | 式 | 意味 |
| :--- | :--- | :--- |
| `collateral` | （トレーダーが入金）| ポジションを裏付ける USDC |
| `position_size` | （符号付き: + long、− short）| BTC を何 unit long / short しているか |
| `notional` | `\|position_size\| × mark` | mark 価格での現在のドル exposure |
| `unrealized_pnl` | `(mark − entry) × position_size` | mark で閉じたときの損益。*まだ確定していない* |
| `equity` | `collateral + unrealized_pnl` | venue 上でのトレーダーの実質的な純資産 |

トレーダーが直接操作するのは `collateral`（入出金）と `position_size`（取引）の 2 つ。残り 3 つは venue が block ごとに mark から計算する。

具体例:

```
collateral     = $10,000
position_size  = +0.5 BTC   (long)
entry          = $100,000
mark           = $100,000
notional       = 0.5 × 100,000 = $50,000
unrealized_pnl = (100,000 − 100,000) × 0.5 = $0
equity         = 10,000 + 0 = $10,000
```

PnL がゼロなので、ポジションを開いた直後は equity = collateral。Mark が動けば equity もそれに合わせて動く。

## Leverage

**Leverage** は collateral と notional の間の倍率だ:

```
leverage = notional / collateral
```

例: `leverage = 50,000 / 10,000 = 5×`。Collateral $1 ごとに BTC への 5× の exposure を持っている。

Leverage は informational だ。エンジンは「leverage 上限」を直接強制しない — *margin ratio* のしきい値（次節）を強制する。実効 leverage の上限はそこから出てくる、もっと柔軟な形で。

## 2 つのしきい値: initial vs maintenance margin

**Initial margin** はトレーダーが position を *開く / 増やす* ときに必要な ratio。Hyperliquid は ~10%。開く時点での最大 leverage はおおよそ 10× になる。

**Maintenance margin** はトレーダーが position を *持ち続ける* ときに必要な ratio。これを下回ると engine が force-close する。Hyperliquid は ~2%（tier によって変わる — 大きな position ほど maintenance も高い）。

2 つのしきい値が異なるのは意図的だ:

- Initial > maintenance: initial を辛うじてクリアして開いたトレーダーには、liquidation に達する前に少し adverse な mark の動きを耐える余裕がある
- ギャップがなければ、ぎりぎりで開いた position は不利な tick が来た瞬間に必ず liquidate する
- ギャップは venue がトレーダーに与える *バッファ*。Liquidation に至る前に意思決定する（collateral を足す、partial close する、など）時間を確保する

**Margin ratio** が中心的な量:

```
margin_ratio = equity / notional
```

例: `margin_ratio = 10,000 / 50,000 = 20% = 2,000 bps`。

20% は Hyperliquid の initial 10% と maintenance 2% の両方を大幅に超えている。Position は **Safe**。

## 4 状態

エンジンは非 flat な各 position を margin ratio に基づき 4 状態に分類する:

| 状態 | 条件 | エンジンの動作 |
| :--- | :--- | :--- |
| **Safe** | `ratio ≥ initial_margin_bps`（≥ 10%）| トレーダーは新規 / 追加できる |
| **AtRisk** | `ratio ∈ [maintenance, initial)`（2% ≤ x < 10%）| 保持は可、新規リスクは禁止 |
| **Liquidatable** | `ratio < maintenance, equity ≥ 0`（< 2% だが underwater ではない）| Market で force-close、残額をトレーダーに返す |
| **Underwater** | `equity < 0`（損失が collateral を超えた）| Force-close + insurance fund が不足を吸収（L3 のトピック）|

Liquidatable と Underwater の区別は、*残余を誰が負担するか* を決めるので重要だ。Liquidatable ではトレーダーの残 collateral が close + fee をカバーする。Underwater でも close は実行されるが、トレーダーが払いきれない分は venue の insurance fund が負担する。

これが Build OpenHL — Liquidation コースが `MarginHealth` enum として実装する 4 状態分類だ。同じ 4 状態、同じ境界条件。

## 計算例 — 同じ position、5 つの mark 価格

トレーダー: $10k collateral、0.5 BTC long、entry $100,000。Hyperliquid params（initial 10%、maintenance 2%）。

| Mark | Notional | PnL | Equity | Ratio | 状態 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$100,000** | $50,000 | $0 | $10,000 | **20%** | Safe |
| **$95,000** | $47,500 | −$2,500 | $7,500 | **15.8%** | Safe |
| **$85,000** | $42,500 | −$7,500 | $2,500 | **5.9%** | AtRisk |
| **$82,000** | $41,000 | −$9,000 | $1,000 | **2.4%** | AtRisk (ぎりぎり) |
| **$81,500** | $40,750 | −$9,250 | $750 | **1.8%** | **Liquidatable** |
| **$80,000** | $40,000 | −$10,000 | $0 | **0%** | Liquidatable |
| **$78,000** | $39,000 | −$11,000 | −$1,000 | **−2.6%** | **Underwater** |

境界を越える瞬間が 2 つある:

1. **Mark $87,500 → $82,000（Safe → AtRisk）**: トレーダーは保持はできるが、position を追加することも新規 position を取ることもできなくなる。UI が警告を出すのも通常この時点。
2. **Mark $82,000 → $81,500（AtRisk → Liquidatable）**: エンジンが force-close を発動する。Maintenance を下回ると、collateral がもう取引と liquidation fee を払いきれない。

この例では、Liquidatable に到達するのに必要な mark 下落は entry から **18.5%** だけ。これは leverage の逆数に近い: 5× leverage で adverse 18.5%（≈ 1/5 × maintenance ギャップ）の動きで吹き飛ぶ。10× で ~9%、50× だと ~1.8%（日中ふつうに見る幅）。

**エンジン上では leverage は risk 対称的**: 高 leverage = 有利な動きで大きな upside、*ただし小さな adverse な動きで liquidate する*。数学はどちらの方向にも肩を持たない。Position を開いた時点でトレーダーが risk profile を選んだだけだ。

## Cross-margin vs isolated margin

ここまでは「トレーダーが 1 ポジション持っている」前提で話した。実際には、トレーダーは同時に複数（BTC、ETH、HYPE、SOL、...）持てる。Venue が複数 position の collateral を共有させる方法が 2 つある:

**Cross-margin**（Hyperliquid のデフォルト）: すべての position が 1 つの collateral pool を共有する。Margin ratio は notional の *合計* に対して *合計* equity で計算する。利益が出ている BTC long が、損失中の ETH short のバッファになる。トレーダーにとっても engine にとっても単純。

**Isolated margin**（Hyperliquid では asset 単位で opt-in）: 各 position が専用の collateral subset を持つ。1 つの position が liquidate しても他の position に影響しない。「他の損失で連鎖されたくない確信あるポジション」に使う。

数学は同じ — `margin_ratio = equity / notional` — 違うのは *スコープ* だけ。Cross は合計、isolated は per-position。

Hyperliquid はバッファ効果を望むトレーダーが大半なので cross をデフォルトにしている。Isolated は opt-in。

## Hyperliquid 固有の点

- **Initial margin の tier**: Hyperliquid は実際には tiered initial margin を使う。「~10%」は小さい position に対するベースライン。Position size が asset ごとのしきい値を超えると、initial margin 要件が上がる（大口 BTC position だと 20% / 30% を要求されうる）。単独トレーダーへの systemic exposure に上限を当てる仕組み。
- **Maintenance margin の tier**: 同じく — 大きい position ほど maintenance も高い。DIY Perp track では教育目的で flat なしきい値に単純化しているが、本番デプロイは tiered。
- **Cross-margin がデフォルト**: トレーダーは USDC を 1 度 deposit して、どの market でも取引できる。
- **Margin 計算は consensus 内**: すべての validator が同じ snapshot から同じ margin ratio を計算する。これが Build OpenHL — Liquidation コースの L1 が教える determinism property の根拠。

## よくある誤解

**「Liquidation は position がゼロになったとき起きる」。** 違う — liquidation は maintenance しきい値で起きる。ゼロ equity の *上* だ。Maintenance とゼロの間のバッファ（notional の ~2%）が liquidation fee と close order の slippage を吸収する。ゼロまで待ったら、トレーダーの残額はもう fee を払えない。

**「Leverage が高い = profit が高い」。** Leverage が高い = collateral 単位あたりの *position size* が大きい。Collateral に対する % リターンは、gain でも loss でも大きくなる。Expected value は leverage で変わらない — 変わるのは variance だけ。

**「Cross-margin は isolated より常に良い」。** 違う。Cross が良いのは、すべての position が好意的に相関しているとき（long だけの portfolio など）。Cross が *悪い* のは、1 つの position が不釣り合いに吹き飛んだとき — portfolio 全体を liquidate しうる。Isolated はその risk を隔離する。Cross vs isolated は本物の risk management の判断であって、ただのデフォルトではない。

## 次のレッスン (L3)

L3 — **Liquidation、insurance fund、ADL**。状態を分類した。次は position が Liquidatable や Underwater に渡ったとき *何が起きるか* を順に辿る。エンジンが close order を出す、matching engine が約定させる、fee が insurance fund に流れる、不足が fund を drain する、稀に insurance fund が枯渇すると ADL が発動する。

L3 を終えると、perp の機構の完全なモデルが手に入る。そして Build OpenHL — Liquidation コースの L4-L7（margin math + 分類 + close order 生成）が「すでに理解している内容の Rust 実装」として読めるようになる。

````
