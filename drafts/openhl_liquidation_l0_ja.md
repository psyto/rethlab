# Building OpenHL Liquidation — L0 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) 以降に対するドラフト。
> 本コースは **DIY Perp シリーズの 10 番目のコース**、consensus / clob / precompiles / funding に続く 5 つ目の build-along。

## L0 — `openhl-liquidation-orientation-ja`

**Stage**: Stage 10a (margin math、pure compute) — `22eedf9`

**Title**: OpenHL Liquidation を作る — 永久先物ポジション liquidation エンジン

**Duration**: 15 分 · **XP**: 50

---

````markdown
# OpenHL Liquidation を作る — 永久先物ポジション liquidation エンジン

## 何を作るか

前のコース（`building-openhl-funding`）で funding-rate state machine を追加した — 永久先物はこれで mark を index に anchor する仕組みを持った。本コースでは次の openhl primitive を作る: アカウントの損失が預け入れ collateral を超えたときにポジションを force-close する **liquidation エンジン**だ。

本コースを終えると、以下を完成させている:

- 新しい `openhl-liquidation` crate に **3 ソースファイル / ~600 LOC**。
- Stage 10a マイルストーンで **24+ tests passing**、capstone までにさらに増える: 各 compute 関数の hand-traced unit test + margin-ratio の単調性と determinism の proptest + insurance fund の保存則 invariant。
- **3 つの building block**: fixed-point types モジュール、純粋な compute モジュール（margin math）、そして state machine（insurance fund、Stage 10b）と multi-account scanner（Stage 10c）。
- 全 validator が同じ結果を出す **4 状態の margin classification**（`Safe` / `AtRisk` / `Liquidatable` / `Underwater`）。

こうしたことが理解できるようになる:

- なぜ perp DEX は liquidation をオフチェーンプロセスに外注できないのか — それでは consensus solvency を主張できなくなる。
- Hyperliquid 型 margin model: cross-margin、mark-vs-entry、initial-vs-maintenance。
- Margin health の 4 状態、それぞれが engine に何を許可するか。
- `margin_ratio` の **非単調エッジケース** — collateral が notional を支配するとき、ratio が mark の方向と逆に動くケースがあり、それがなぜ liquidation を壊さないのか。
- なぜ insurance fund を残高エントリではなく state machine として作るのか。
- Auto-deleveraging (ADL) がこの設計の端でどう位置づけられるか — そしてなぜ Stage 10 では扱わないのか。

## なぜ liquidation が重要か（perp 1 段落）

永久先物はレバレッジの効いたポジションだ。トレーダーは `collateral` (USDC) を預け、`entry` 価格で `size` のポジション（符号付き: 正 = ロング、負 = ショート）を開く。ポジションの *unrealized PnL* は mark 価格とともに動く: ロングは mark > entry で利益、mark < entry で損失。損失が collateral を食って `equity / notional` が **maintenance margin** 要件を下回ると、アカウントはもう損失をカバーできなくなる — engine は market でポジションを force-close し（反対 side、フルサイズ）、**liquidation fee** を collateral から差し引いて insurance fund に積み立て、（equity がまだ正なら）残りをアカウントに返す。Close 前に equity が *負* になった場合 —「underwater」ケース — insurance fund が不足分を吸収する。これがメカニズムのすべて。

## なぜ L1 perp DEX は consensus 内で liquidation を実行するのか

ある種のデリバティブ venue は liquidation をオフチェーンの liquidator プロセスに外注する — アカウント状態を scan して `liquidate(account)` endpoint を呼ぶ bot だ。これは低頻度の settlement system（クレジットデフォルトスワップなど）では機能するが、perp のスピードでは破綻する: 50× のレバレッジを賭けた HYPE position は、ニュースの cascade で数秒のうちに healthy から underwater に反転しうる。検知と close の間の RPC ラウンドトリップによる遅延は、すべて chain が吸収する損失になる。

Hyperliquid は liquidation を **consensus 内** で実行する。すべての validator が、すべての block で、どのアカウントが maintenance を下回っているかを — 独立に、同じデータから、同じコードで — 計算する。Engine の出力（close orders + insurance-fund movements）は block の一部になる。**敵対的な市場の動きでも chain が支払い能力を保てる唯一の方法がこれだ。**

この保証の代償が determinism の規律: float 演算は禁止、すべての classification は validator 間で byte-identical でなければならず、すべての overflow は panic ではなく saturate しなければならない。Funding コース（`openhl-funding`）はこの規律との最初の本格的な遭遇だった。本コースは 2 回目だ。

## なぜ liquidation に float を使えないのか

Funding と同じ答え: consensus determinism だ。あるアカウントを `Liquidatable` と分類する validator と、同じアカウントを `AtRisk` と分類する他の validator は、異なる block を生成する — 異なる close orders、異なる fees、異なる insurance-fund deltas。Block proposal が分岐し、chain が fork する。

直し方: 符号付き整数 + saturating 演算 + i64 でオーバーフローしうる乗算には i128 の中間値を使う。`MarginRatio` の固定小数点単位として `MARGIN_SCALE = 10_000`（basis points）を使う。Bps は TradFi *でも* crypto perp venue でも margin の慣例単位 — Hyperliquid、Binance、Drift はすべて margin 要件を bps で表現する。`MarginRatio(1_000)` はちょうど 10%、`MarginRatio(MARGIN_SCALE)` はちょうど 100%。

（Funding は parts-per-billion の精度が必要だったので `RATE_SCALE = 1_000_000_000` を使った。Liquidation は精度はそれより低くて済むが、規律は同じ。）

## 12 レッスン

### Module 0 — Orientation
- **L0**（本レッスン）— なぜ liquidation か、なぜ margin model か、3 サブステージの roadmap。

### Module 1 — 型（L1-L3）
- **L1** — `MARGIN_SCALE = 1e4`（bps）+ `LiquidationParams` + `hyperliquid_default()`（10% / 2% / 1.5%）。なぜ bps か、なぜこのデフォルトか。
- **L2** — `MarginRatio` newtype + `MarginHealth` enum（`Safe` / `AtRisk` / `Liquidatable` / `Underwater`）。なぜ 4 状態か、それぞれが何を許可するか。
- **L3** — `AccountSnapshot` + `CloseOrderSpec`。なぜ新しい snapshot 型（`funding::Position` ではなく）か、bridge レイヤーがどう assemble するか。

### Module 2 — 純粋な compute（L4-L7）— Stage 10a
- **L4** — `notional_value` + `unrealized_pnl`。ロング・ショート両方で符号を正しく扱う signed-multiplication のトリック。
- **L5** — `account_equity` + `margin_ratio`。Collateral が notional を支配するときに発見される **非単調エッジケース** の proptest と、なぜ `prop_assume!` が正しい修正か。
- **L6** — `margin_health` 分類。すべての境界で strict less-than を使うこと、それが何を保証するか。
- **L7** — `close_order_spec`。Market order の規律: liquidation は利用可能な任意の価格を取る。Stage 10a 完了。

### Module 3 — Insurance fund（L8-L10）— Stage 10b
- **L8** — `InsuranceFund` 構造体 + `deposit` / `withdraw`。Single-balance な state machine。
- **L9** — `absorb_deficit`: Underwater liquidation が fund をどう drain するか。
- **L10** — `credit_fee`: liquidation fee が collateral から fund へ流れる。Composition test: 1 回の liquidation が deeply underwater ならば fee を credit *かつ* deficit を absorb する複合ケース。

### Module 4 — Scanner + Capstone（L11-L12）— Stage 10c
- **L11** — `LiquidationScanner`: `&[AccountSnapshot]` を順に走査し、各アカウントを分類し、`Liquidatable` と `Underwater` には close order を emit し、insurance-fund delta を返す。Composition layer。
- **L12** — Capstone。総合、bridge integration の preview、市場構造コンテキスト: on-chain CLOB liquidation が CEX liquidation や ADL とどう違うか。

## モジュールごとの SHA pinning

各レッスンは build に使う openhl commit を引用する。本コースは Stage 10a → 10c の 3 commit にまたがる:

| Module | レッスン | openhl SHA |
|---|---|---|
| 0 | L0 | `22eedf9` (Stage 10a) |
| 1 | L1-L3 | `22eedf9` (Stage 10a) |
| 2 | L4-L7 | `22eedf9` (Stage 10a) |
| 3 | L8-L10 | *Stage 10b — TBD* |
| 4 | L11-L12 | *Stage 10c — TBD* |

TBD の行は Stage 10b と 10c が ship した時点で更新される。それまでは Module 3、4 はスケルトン — Module 1-2 のコンテンツ（pure-compute 側のすべて）は `22eedf9` に対して完全に作られていて、Stage 10a を end-to-end で進める準備が整っている。

## 前提

本コースを最大限活用するには、以下があるとよい:

- **Course 9（openhl-funding）** が頭の中にあること。全レッスンを覚えている必要はないが、funding の fixed-point / saturating 演算 / pure state machine パターンは本コースでも同じパターン。Funding が難しかったなら本コースも難しい。
- **Course 7（openhl-clob）**、`AccountId`、`Side`、`Qty` のため。これらを直接再利用する。Matching engine の内部までは不要。
- **基本レベルの margin math への親しみ**。「initial margin = 10%、maintenance = 2%」を見て混乱しないなら準備完了。そうでなければ、上の perp recap と Hyperliquid の help center で十分。
- **EVM、precompile の知識は不要**。Liquidation は funding と同じく pure な state-machine math。

以下は不要:
- 動く openhl node — 本 crate は zero I/O。
- 取引所のリスクエンジンの経験 — ここのモデルは小さい。
- 定量金融の背景 — 基本的な代数で足りる。

## セットアップ

```bash
# openhl workspace root で:
cd ~/code/my-openhl
git checkout main
cargo build --workspace  # ベースライン — L1 前にこれが通ること
```

リファレンスチェックアウト（各レッスン末の答え合わせ diff 用）:

```bash
cd ~/code/openhl-reference  # 自分の作業ツリーとは別のチェックアウト
git checkout 22eedf9
```

（または同じ workspace を使い、参照のときに `git stash` する。どちらでもよい。）

## コーススタイル

各レッスンはコース 6-9 で確立した build-along フォーマットに従う:
- **ゴール** — 終了時点で何が pass するか、何が build されているか。
- **おさらい** — 前のレッスンがどこで終わったか。
- **計画** — 具体的な編集、番号付き。
- **予測**コールアウト（🛑「スクロール前に...」付き）— 答えの前に問い。
- **反流暢性**コールアウト（🛑 で「やりがちな勘違い」を明示）—「〜と書けばいいのでは?」反射を先回りで叩く。
- **手を動かす walk-through** — 段階的なコード編集と各変更の説明。
- **テスト** — `cargo test` コマンドと期待出力。
- **設計の振り返り** — 本レッスンのコードに反映された 3-5 個の load-bearing な決定。
- **答え合わせ** — openhl reference SHA に対する `git diff`。
- **よくある質問** — 3-5 個の根拠を伴う回答。

Module 2（pure compute）はコース 7 の matching engine と比較して proof-heavy で code-light だ。**エッジケースでは速度を落とすこと** — L5 の levered-regime 非単調性は、ほとんどの読者の最初のメンタルモデルが壊れる場所。そこを再構築する。

## 準備完了

L1 に進む。`MARGIN_SCALE` をセットアップし、ネットワークのリスクパラメータが住む `LiquidationParams` 構造体を作る。

````

---

## Seed-file slot

L0 は Module 0（Orientation）の sortOrder 0 に入る:

```typescript
{
  title: 'OpenHL Liquidation を作る — 永久先物ポジション liquidation エンジン',
  slug: 'openhl-liquidation-orientation-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# OpenHL Liquidation を作る — 永久先物ポジション liquidation エンジン\n\n...`
},
```

## SHA pinning discipline

L0 は `22eedf9`（Stage 10a）を引用する。コースタイトルと orientation は 10b、10c が ship したときに更新するが、L0 レッスン本体は orientation がサブステージ間で安定なので再 pin しない。

## 翻訳セルフレビュー（paste 前）

- **「consensus 内で liquidation」セクション** は load-bearing な動機段落。「なぜこのコースが存在するか」を build-along とは別に説明している。これがないと本コースは「funding の後のもう一つの pure-compute 演習」に読めてしまう — これがあると、読者は stakes（敵対的な市場の動きにおける chain solvency）を知る。
- **非単調エッジケース** を §「何を作るか」 *と* Module 2 のレッスン map の両方でちらつかせている。これは意図的 — このエッジケースが Stage 10a で最も教育的価値の高い驚きで、L5 で出会うまでに L0 で読者を準備しておくべき。
- **SHA テーブルの TBD 行** は honest scoping。読者は、まだ全部書かれていないコースを始めることを知るべき — 隠す代替は、consensus + clob コースが立ち上げた honest scoping の規律に反する。
- **Funding の recap** は意図的に短い — Course 9 を取った読者は長い recap が要らない、スキップした読者は戻るべきと言われる必要がある。
