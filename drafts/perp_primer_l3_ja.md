# Building Perp DEX Primer — L3 draft (JA) — concept course

> DIY Perp track の prerequisite。概念のみ、コードなし。

## L3 — `perp-primer-liquidation-insurance-adl-ja`

**Title**: Liquidation、insurance fund、ADL — セーフティネットの仕組み

**Duration**: 35 分 · **XP**: 60

---

````markdown
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

L0 で perp を立て、L1 で funding が mark を anchor する仕組みを示し、L2 で position を 4 状態に分類した。L3 では、AtRisk と Liquidatable の境界、Liquidatable と Underwater の境界で *実際に何が起きるか* を辿る。

ここで perp のモデルが chain 全体にとって load-bearing になる。他のトレーダーの安全は、liquidation が正しく動くことに依存する。

## トリガー

L2 のおさらい: `margin_ratio < maintenance_margin_bps` かつ `equity ≥ 0` なら **Liquidatable**。`equity < 0`（PnL が collateral を超えた）なら **Underwater**。

エンジンは block ごとに、すべての非 flat なアカウントの margin ratio を評価する。Maintenance しきい値を下回った瞬間、そのアカウントの liquidation パイプラインを当該 block で発火させる。人間が間に入ることもなく、待つこともなく、second chance もない。すべての validator、すべての block、同じデータで。

## Force-close の仕組み

エンジンが liquidation を決めると、**close order spec** を 3 フィールドで生成する:

| フィールド | 値 |
| :--- | :--- |
| `side` | Position 方向の反対（long → SELL、short → BUY）|
| `qty` | Position size の絶対値 `\|size\|`、フルサイズ |
| `account` | Liquidate されたトレーダーの account ID |

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
> 一般のトレーダー向け解説では「マージン不足になるとストップロスが自動発火する」と表現されることがあるが、エンジン視点では別物だ。**清算は『特権注文 (privileged order)』** — `block_execute` の中でエンジンが自ら orderbook に書き込む、外部からは到達不可能な経路の注文 — として実装される。L2 で見た `MarginHealth` enum の `Liquidatable` 分岐が、まさにこの特権注文の発火元になる。

具体例:

```
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
```

トレーダーは $10k の collateral で出発したが、close で $19.6k 失った。Fee 前で既に $9.6k underwater だ。Fee を足してみる。

## Liquidation fee

Hyperliquid は **close notional の ~1.5%** を liquidation fee として取る。Fee はトレーダーの collateral から引かれ、insurance fund に積まれる。

例:
```
fee = closed_notional × 0.015
    = $80,400 × 0.015
    = $1,206
```

実現 PnL に足すと、トレーダーの total loss = $19,600 + $1,206 = $20,806。

$10k の collateral に対して、liquidation 後のトレーダーの *正味* ポジションは:
```
collateral_remaining = 10,000 − 20,806 = −$10,806
```

マイナスだ。**Close が完了する前から既に Underwater だった。**

その $10,806 の不足はどうなるのか? Insurance fund が吸収する。

## Solvent close と underwater close — 2 つの道

区別を具体的にするため、underwater 例の隣にもう少し穏やかなシナリオを置く:

**シナリオ A: Solvent close（Liquidatable）**

```
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
```

**Solvent close: トレーダーに $89 が返り、insurance fund に $611 が積まれる。**

次に underwater ケース（より急な価格下落、バッファが間に合わなかった場合）:

```
Underwater ケース:
  同じ初期 position だが、mark が 1 block で $82,000 から $76,000 に gap した（$81,500 で発火する機会がなかった）。
  
  実現 PnL = (76,000 - 100,000) × 0.5 = -$12,000
  fee = 76,000 × 0.5 × 0.015 = $570
  total loss = $12,570
  collateral_remaining = 10,000 - 12,570 = -$2,570 (insurance fund が補填)
  insurance_fund_credit = +$570 (fee) - $2,570 (不足) = -$2,000 (純減)
```

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
> 「不足が出たなら、underwater の position を市場でガンガン force-close すればいい」と思うかもしれない。だが、その瞬間に orderbook には逆方向の巨大な market order が連射されることになる — bid stack を突き抜けて mark を更にクラッシュさせ、その下落で別の position が Underwater 化する。**フィードバックループが暴走する。**
>
> ADL はこのループを断ち切るために、**orderbook を一切経由しない**設計になっている:
>
> - 1 つの破綻 position と 1 つの勝ち position を、エンジン内部の帳簿上で **直接相殺 (match & cancel)** する
> - 相殺された 2 つの position は、両方とも venue の books から消える
> - Orderbook の bid / ask には 1 satoshi も触れない → 価格に追加のクラッシュ圧をかけない
>
> つまり ADL は「市場での清算」ではなく **「帳簿上の名寄せ・netting」** — システム内部で勝者と敗者を直接マッチさせて、両者の position を同時に消去するオフチェーン (正確には off-orderbook) な相殺処理だ。Stage 10c (multi-account scanner) の実装でも、ADL パスは `book.submit()` を呼ばず、`Position` レコードを直接 mutate して削除する。**「市場を汚さずに、帳簿の上だけで損失を勝者に転送する」** — これが ADL の本質であり、極めて稀にしか発動しないように設計されている理由でもある。

ADL は **非常に不評** だ。マーケットの crash を正しく予測して short で勝っているトレーダーは、勝ち分をもっと伸ばしたいので force-close されたくない。ただし insurance fund がカバーできない以上、*誰かが loss を引き受けなければならない* — 現金は保存則に従う。ADL はその loss を、その move から最も「勝った」側に分配する仕組み。

Hyperliquid の設計は ADL を **極めて稀** にすることを狙っている:

- 高めの liquidation fee で、平時に insurance fund を厚く capitalize しておく
- Cross-margin（デフォルト）で多くのアカウントを resilient にする — 1 つの position の損失を他で buffer できる
- DIY Perp track の Stage 10c（multi-account scanner）が ADL を fallback path として実装する。それが最後のレッスンになっているのは、ここまで到達しないこと自体が目標だから。

## セーフティネットの階層構造

L2 のマージン要件から ADL まで、損失を吸収する 4 層が下にカスケードしている。**上の層で止まれば止まるほど、トレーダーにも venue にもダメージが小さい:**

```
   ┌─────────────────────────────────────────────────────────────────┐
   │ Layer 0: Margin requirement (L2 で見た)                          │
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
```

**この階層の読み方:**

- **下の層に落ちるほど痛みが拡散する**: Layer 1 ではトレーダー本人だけが損する。Layer 2 では venue が venue 全体の資金から払う。Layer 3 では関係のない (勝っている) 別トレーダーまで巻き込む。
- **各層が「次の層に渡す前に absorb する」量を最大化する設計**: Initial と Maintenance の差 (L2 で見た 8% のギャップ) は Layer 1 が吸収できる余地、liquidation fee の 1.5% は Layer 2 の補充ペース、cross-margin (1 口座内の利益で他の損失を相殺) は Layer 1 の到達を遅らせる、といった具合。**venue 設計とは、上の層が下の層に「仕事を渡さない」ための数値選択そのもの。**
- **コード分岐との対応**: Stage 10c の `MarginHealth` enum 分岐は、この階層の Layer 1-3 への遷移ロジックそのもの。`Safe` / `AtRisk` = Layer 0、`Liquidatable` = Layer 1、`Underwater` + insurance fund 残高あり = Layer 2、`Underwater` + insurance fund 枯渇 = Layer 3。**4 状態の enum と 4 層の防御は 1 対 1 で対応する。**

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

これで以下を理解したことになる:

- **Perp とは何か**（L0）
- **Funding が mark を index に anchor する仕組み**（L1）
- **Margin と 4 状態の動作**（L2）
- **Liquidation、insurance fund、ADL が最悪ケースを扱う仕組み**（L3）

DIY Perp track が前提にしているモデルの全体だ。`compute_premium` の各式、`MarginHealth` の各 variant、`close_order_spec` の各行 — すべてが本 primer のどこかをコードで実装している。

**DIY Perp track に進む準備ができた。** 出発点は:

→ **Build OpenHL — Consensus Substrate**（Module 1: BFT + Reth substrate を作る）

すでに consensus と orderbook を経験済みで、perp 固有レイヤーから入りたい場合:

→ **Build OpenHL — Funding**（L1 で見た内容を実装する）

→ **Build OpenHL — Liquidation**（L2 + L3 で見た内容を実装する）

````
