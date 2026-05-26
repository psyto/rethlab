# Building Perp DEX Primer — L1 draft (JA) — concept course

> DIY Perp track の prerequisite。概念のみ、コードなし。

## L1 — `perp-primer-mark-index-funding-ja`

**Title**: Mark、index、funding — 期限なしで perp が anchor を保つ仕組み

**Duration**: 35 分 · **XP**: 60

---

````markdown
# Mark、index、funding — 期限なしで perp が anchor を保つ仕組み

## ゴール

このレッスンで掴む概念:

- **Mark と index** — 同じ原資産について、別の方法で計算され、別の用途で使われる 2 つの価格。Funding メカニズム全体の出発点となる。
- **Premium の式** `(mark − index) / index` — perp が anchor からどれだけ離れたかを符号付きで表す分数。
- **Premium から funding rate へ** — `divisor` で割る理由（小さい rate を頻繁に支払う）と `cap` を当てる理由（最悪ケースの支払いを bound する）。
- **誰が誰に支払うか、なぜか** — rate の符号が方向を決め、本当に mark を index に引き戻すのは *経済インセンティブ* の方。
- **Hyperliquid の実パラメータ** — interval 1 時間、divisor 8、cap ±4%。これらの値での計算例。

このレッスンを終えると、以下に答えられる:

- 「Mark が index より上のとき、なぜ自分の long position は funding を支払うのか?」
- 「Mark と index がちょうど一致したら funding はどうなるのか?」
- 「Premium が 1% のとき、Hyperliquid での per-hour funding rate はいくつか?」

## おさらい

L0 で問題を整理した。Perp には期限がないので、伝統的 futures に組み込まれている収束力は使えない。Perp 価格を原資産に追従させるには、別の何かが必要だ。

L1 ではその「別の何か」を導入する。

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

```
premium = (mark − index) / index
```

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

```
rate_per_interval = clamp(premium / divisor, ±rate_cap)
```

- **`divisor`** は収束力を複数 interval に分散する。Hyperliquid は **8** を使う。1% の premium なら、毎時の rate は 0.125%。24 時間で 3% の圧力を、1 度の大きな支払いではなく細かい増分で当てる。
- **`rate_cap`** は最悪ケースの手数料を bound する。Hyperliquid は **±4% / interval** に設定。Cap なしだと、100% の premium（mark が index の倍 — pathological）が 12.5%/hr の rate を意味してしまう。Cap が 4% に clip する。
- **`interval`** は支払いの頻度だ。Hyperliquid は **1 時間**。CEX の perp は様々（Binance は 8 時間ごと、dYdX は毎時）。

この 3 つから、interval ごとの実 rate が決まる。Hyperliquid のパラメータ、premium 1% なら: `rate = clamp(0.01 / 8, ±0.04) = 0.00125 = 0.125%`。

## 誰が誰に支払うか

符号規約: **rate がプラス → long が short に支払う**。マイナス → short が long に支払う。

直観: 不均衡を作っている側が、それを相殺している側に支払う。Long が mark を index より上に押し上げた → long が支払う。Short が mark を下に押し下げた → short が支払う。支払いがあると、不均衡側のポジションを持ち続けるのが少し損になり、退場（または反対側を取る）動機が生まれる。これが mark を index に引き戻す経済インセンティブだ。

支払いは venue が受け取るのではない。Trader 間で直接やりとりされる — long 全体が short 全体に、各 position の notional に比例して移動する。Venue レベルではゼロサム。Hyperliquid は帳簿係でしかない。

> 💡 **エンジニア向けの視点 — 符号付き size による 1 式実装:**
> 実装時、ポジションの方向を符号付きで管理する (Long = `+size`、Short = `-size`)。すると、すべてのトレーダーの残高更新は分岐なしの 1 式に圧縮できる:
>
> ```
> collateral -= size_with_sign × mark × rate
> ```
>
> - `rate > 0` かつ `size > 0` (Long) → `collateral` が減る = long が支払う ✓
> - `rate > 0` かつ `size < 0` (Short) → 二重マイナスで `collateral` が増える = short が受け取る ✓
> - `rate < 0` の場合も対称的に 1 式で正しく配線される
>
> マッチングエンジンが long/short の position を 1 つの `i64`/`i128` size として持っておけば、funding tick は分岐なしの線形スキャンになる。**Rust の型システムと符号規約を組み合わせることで、状態遷移が「絶対に対称」になる** — Consensus determinism を担保する上でこの種の「分岐の排除」は load-bearing だ。

## 計算例 — Hyperliquid のパラメータ

トレーダーが Hyperliquid で **10 BTC long** を持っている。現状:

- Mark price: $100,000
- Index price: $99,000
- Premium: (100,000 − 99,000) / 99,000 = +1.01%

この interval の funding rate:
```
rate = clamp(0.0101 / 8, ±0.04) = 0.00126 = 0.126% / hour
```

トレーダーの notional exposure:
```
notional = |size| × mark = 10 × $100,000 = $1,000,000
```

この 1 時間の funding 支払い（long が支払う）:
```
funding = notional × rate = $1,000,000 × 0.00126 = $1,260
```

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

```
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
```

**3 者の役割を 1 行で要約:**

- **index** = 真の参照価格 (anchor の目標)
- **mark** = orderbook の需給で動く市場価格 (anchor したい対象)
- **funding** = 両者の乖離を「インセンティブ経由で」引き戻す制御信号

「funding が mark を直接動かす」のではなく、「funding がトレーダーの残高を動かし、トレーダーが orderbook を動かし、orderbook が mark を動かす」という **3 段間接** が anchor の正体だ。Expiry 型の futures が「特定日に強制収束させる」のに対し、perp は「毎 interval で少しずつ引き戻す」— 連続的な制御信号で離散的な収束を置き換えている。

## Hyperliquid 固有の点

- **Index の構成**: 複数 CEX spot feed の加重平均。1 つの feed が他から離れすぎたら index を一時停止する deviation circuit breaker が入っている — single-venue な spot 操作に対する保護。
- **Tick での settlement**: 各 funding interval で、エンジンが非 flat な position を順に走査し、トレーダーの collateral balance を `position_size × mark × rate` で調整する。一括支払いではない — 各 position が個別に決済される。
- **Saturating な算術**: Funding 計算は `RATE_SCALE = 1e9`（parts per billion）スケールの符号付き整数を使う。すべての乗算は `i128` 中間値で行い、overflow 時は wrap せずに saturate する。Consensus determinism の規律 — すべての validator が同じ入力から同じ rate を計算する必要がある。
- **Tick 間で funding は累積しない (スナップショット方式)**: Interval の中で開いて閉じた position には funding がかからない。Hyperliquid の支払いイベントは、**毎時 00 分などの interval boundary の瞬間** にポジションを保有しているかどうかだけで判定される — その瞬間の position snapshot を取り、`size × mark × rate` を一括計算する。dYdX のような連続 funding (時間積分型) を経験してきた読者は要注意: ここは離散イベント方式のステートマシンであり、「保有時間に対する課金」ではなく「snapshot 時刻に保有していたかどうか」が支配的だ。**バグのない state machine を設計するときは、この境界条件を最初に固める。**
- **アーキテクチャ上のトレードオフ (Boundary Gaming)**: この方式は実装がシンプルで deterministic だが、副作用として「59 分に建てて 00 分を跨いで 01 分に閉じる」ような短時間保有でも 1 interval 分の funding を受払する。つまりトレーダーには boundary 直前直後でポジションを急開閉するインセンティブが生まれ、正時付近の板で一時的な流動性の歪み（スプレッド拡大）が発生しうる。**時間積分の複雑さを捨てる代わりに、境界ゲーミングの市場構造リスクを受け入れる**のが、この設計選択だ。

## よくある誤解

**「Funding は取引所に支払われる」。** 違う — funding は trader 間を直接移動する。Hyperliquid は funding payment から利益を得ない（取引手数料と builder code 手数料が別途あり、そちらが収益源）。

**「Funding rate が高いと perp は持つのが高い」。** 半分正しい。*不均衡側* を持つのが高い。相殺側を持つと逆に *もらえる*。「Funding を受け取る側に戦略的に乗る」取引は crypto で 1 つの yield 戦略カテゴリを成している。

**「Funding は常に mark を index に引き戻す」。** 結局は引き戻す。しかし持続的な不均衡（retail long が支配する数ヶ月の bull market など）では、funding がプラスのまま長期間続き、long から short に富を移転しながら mark が index 上に留まることがありうる。メカニズムが生み出すのは *圧力* であって、即時の補正ではない。

## 次のレッスン (L2)

L2 — **Margin model**。Mark と funding を立てたので、次は「$10k の collateral で 10 BTC long を持つ」の意味を解きほぐす。誰がどれだけのポジションをどれだけ持てるかを決める leverage と margin の数学だ。Initial vs maintenance margin、cross vs isolated を見て、ある具体的 position が mark の動きで「Safe」から「AtRisk」を経て「Liquidatable」に至るまでを順に辿る。

L2 を終えると、Build OpenHL — Liquidation コースの L1「`MARGIN_SCALE` + `LiquidationParams`」が「すでに理解しているパラメータの実装」として読めるようになる。

````
