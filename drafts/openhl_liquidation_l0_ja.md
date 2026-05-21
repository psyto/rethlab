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

前のコース（`building-openhl-funding`）で追加した funding-rate state machine によって、永久先物の mark と index の乖離を funding payment で抑える仕組みが手に入った。本コースで作るのは次の openhl primitive、すなわちアカウントの損失が預け入れ collateral を超えたときにポジションを force-close する **liquidation エンジン**だ。

本コースを終えると、以下を完成させている:

- 新しい `openhl-liquidation` crate に **3 ソースファイル / ~600 LOC**。
- Stage 10a マイルストーン時点で **24+ tests passing**、capstone までにさらに増える。各 compute 関数の hand-traced unit test、margin-ratio の単調性と determinism を狙う proptest、insurance fund の保存則 invariant が並ぶ。
- **3 つの building block**。fixed-point types モジュール、純粋な compute モジュール（margin math）、そして state machine（insurance fund、Stage 10b）と multi-account scanner（Stage 10c）。
- 全 validator が同じ結果に到達する **4 状態の margin classification**（`Safe` / `AtRisk` / `Liquidatable` / `Underwater`）。

理解できるようになることは:

- perp DEX が liquidation をオフチェーンプロセスに外注できない理由。外注した時点で consensus 上で支払い能力を主張できなくなる。
- Hyperliquid 型 margin model: cross-margin、mark-vs-entry、initial-vs-maintenance。
- Margin health の 4 状態と、それぞれが engine に何を許可するか。
- `margin_ratio` の **非単調エッジケース**。collateral が notional を支配するとき、ratio が mark の方向と逆に動くケースが生じる。それでもなお liquidation が壊れない理由。
- insurance fund を残高エントリではなく state machine として作る理由。
- Auto-deleveraging (ADL) がこの設計の端でどう位置づけられるか。そして Stage 10 では扱わない理由。

## なぜ liquidation が重要か（perp 1 段落）

永久先物はレバレッジの効いたポジションだ。トレーダーは `collateral` (USDC) を預け、`entry` 価格で `size` のポジション（符号付き: 正 = ロング、負 = ショート）を開く。ポジションの *unrealized PnL* は mark 価格とともに動く。ロングは mark > entry で利益、mark < entry で損失だ。損失が collateral を食って `equity / notional` が **maintenance margin** 要件を下回ると、アカウントはもう損失をカバーしきれない。ここで engine が動く — market でポジションを force-close し（反対 side、フルサイズ）、**liquidation fee** を collateral から差し引いて insurance fund に積み立て、equity がまだ正なら残りをアカウントに返す。Close する前に equity が *負* になっていたら — いわゆる「underwater」ケース — 不足分は insurance fund が吸収する。これがメカニズムのすべてだ。

## なぜ L1 perp DEX は consensus 内で liquidation を実行するのか

ある種のデリバティブ venue は liquidation をオフチェーンの liquidator プロセスに外注する。アカウント状態を scan して `liquidate(account)` endpoint を呼ぶ bot だ。低頻度の settlement system（クレジットデフォルトスワップなど）ならこれで機能するが、perp のスピードでは破綻する。50× のレバレッジを賭けた HYPE position は、ニュースの cascade で数秒のうちに healthy から underwater に反転しうる。検知から close までの RPC ラウンドトリップの遅延は、丸ごと chain 側の損失として残る。

Hyperliquid は liquidation を **consensus 内** で実行する。すべての validator が、すべての block で、どのアカウントが maintenance を下回っているかを独立に計算する — 同じデータから、同じコードで。Engine の出力である close orders と insurance-fund movements は block の一部になる。**敵対的な市場の動きのもとで chain が支払い能力を保つ手段は、これ以外にない。**

この保証の代償が determinism の規律だ。float 演算は禁止。すべての classification は validator 間で byte-identical でなければならない。すべての overflow は panic ではなく saturate しなければならない。Funding コース（`openhl-funding`）でこの規律との最初の本格的な遭遇があった。本コースは 2 回目になる。

## なぜ liquidation に float を使えないのか

Funding と同じ答え: consensus determinism のためだ。あるアカウントを `Liquidatable` と分類する validator と、同じアカウントを `AtRisk` と分類する validator がいると、生成される block が違ってくる — close orders も違えば、fees も違い、insurance-fund deltas も違う。Block proposal が分岐し、chain が fork する。

直し方は決まっている。符号付き整数を使い、saturating 演算を通し、i64 でオーバーフローしうる乗算には i128 の中間値を経由させる。`MarginRatio` の固定小数点単位には `MARGIN_SCALE = 10_000`（basis points）を採用する。Bps は TradFi *でも* crypto perp venue でも margin の慣例単位だ — Hyperliquid、Binance、Drift はいずれも margin 要件を bps で表現する。`MarginRatio(1_000)` はちょうど 10%、`MarginRatio(MARGIN_SCALE)` はちょうど 100%。

（Funding は parts-per-billion の精度が必要だったので `RATE_SCALE = 1_000_000_000` を選んだ。Liquidation はそこまでの精度を要求しないが、規律自体は同じだ。）

## 12 レッスン

### Module 0 — Orientation
- **L0**（本レッスン）— なぜ liquidation か、なぜ margin model か、3 サブステージの roadmap。

### Module 1 — 型（L1-L3）
- **L1** — `MARGIN_SCALE = 1e4`（bps）+ `LiquidationParams` + `hyperliquid_default()`（10% / 2% / 1.5%）。bps を選ぶ理由、このデフォルト値の根拠。
- **L2** — `MarginRatio` newtype + `MarginHealth` enum（`Safe` / `AtRisk` / `Liquidatable` / `Underwater`）。4 状態にする理由と、各状態が許可する挙動。
- **L3** — `AccountSnapshot` + `CloseOrderSpec`。`funding::Position` を流用せず新しい snapshot 型を起こす理由と、bridge レイヤーがどう組み立てるか。

### Module 2 — 純粋な compute（L4-L7）— Stage 10a
- **L4** — `notional_value` + `unrealized_pnl`。ロング・ショートいずれでも符号が正しく揃う signed-multiplication のトリック。
- **L5** — `account_equity` + `margin_ratio`。Collateral が notional を支配するときに姿を現す **非単調エッジケース** を proptest で検出し、`prop_assume!` がなぜ正しい修正なのかを見る。
- **L6** — `margin_health` 分類。境界条件にすべて strict less-than を採用する理由と、それが何を保証するか。
- **L7** — `close_order_spec`。Market order の規律 — liquidation は利用可能な任意の価格を取る。ここで Stage 10a が完成する。

### Module 3 — Insurance fund（L8-L10）— Stage 10b
- **L8** — `InsuranceFund` 構造体 + `deposit` / `withdraw`。Single-balance な state machine。
- **L9** — `absorb_deficit`。Underwater liquidation が fund をどう drain するか。
- **L10** — `credit_fee`。liquidation fee が collateral から fund へ流れる。Composition test として、1 回の liquidation が deeply underwater な場合に fee を credit し *かつ* deficit を absorb する複合ケースを扱う。

### Module 4 — Scanner + Capstone（L11-L12）— Stage 10c
- **L11** — `LiquidationScanner`。`&[AccountSnapshot]` を順に辿り、各アカウントを分類し、`Liquidatable` と `Underwater` には close order を emit し、insurance-fund delta を返す。Composition layer の本体。
- **L12** — Capstone。総合、bridge integration の preview、そして市場構造コンテキスト — on-chain CLOB liquidation が CEX の liquidation や ADL とどう違うか。

## モジュールごとの SHA pinning

各レッスンは build に使う openhl commit を引用する。本コースは Stage 10a → 10c の 3 commit にまたがる:

| Module | レッスン | openhl SHA |
|---|---|---|
| 0 | L0 | `22eedf9` (Stage 10a) |
| 1 | L1-L3 | `22eedf9` (Stage 10a) |
| 2 | L4-L7 | `22eedf9` (Stage 10a) |
| 3 | L8-L10 | *Stage 10b — TBD* |
| 4 | L11-L12 | *Stage 10c — TBD* |

TBD の行は Stage 10b と 10c が ship した時点で更新する。それまで Module 3、4 はスケルトン状態だ。一方で Module 1-2 のコンテンツ（pure-compute 側のすべて）は `22eedf9` に対して完全に書き起こしてあり、Stage 10a を end-to-end で進められる状態になっている。

## 前提

本コースを最大限活用するには、以下があるとよい:

- **Course 9（openhl-funding）** が頭の中にあること。全レッスンを覚えている必要はないが、funding で使った fixed-point / saturating 演算 / pure state machine というパターンは本コースでもそのまま再登場する。Funding が難しかったなら本コースも難しい。
- **Course 7（openhl-clob）** の `AccountId`、`Side`、`Qty`。これらを直接再利用するため。Matching engine の内部まで遡る必要はない。
- **基本レベルの margin math への親しみ**。「initial margin = 10%、maintenance = 2%」を見て混乱しないなら準備完了。そうでなければ、上の perp recap と Hyperliquid の help center で十分だ。
- **EVM や precompile の知識は不要**。Liquidation は funding と同じく純粋な state-machine math に閉じている。

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
- **ゴール** — 終了時点で何が pass し、何が build されているか。
- **おさらい** — 前のレッスンがどこで終わったか。
- **計画** — 番号付きで具体的な編集。
- **予測**コールアウト（🛑「スクロール前に...」付き）。答えの前に問いを立てる。
- **反流暢性**コールアウト（🛑「やりがちな勘違い」）。「〜と書けばよいのでは?」という反射を先回りして叩く。
- **手を動かす walk-through** — 段階的なコード編集と、各変更の意図。
- **テスト** — `cargo test` コマンドと期待出力。
- **設計の振り返り** — このレッスンのコードに反映された 3-5 個の load-bearing な決定。
- **答え合わせ** — openhl reference SHA に対する `git diff`。
- **よくある質問** — 3-5 問、それぞれ根拠まで添えた回答。

Module 2（pure compute）はコース 7 の matching engine と比べて proof-heavy で code-light な作りだ。**エッジケースの前ではペースを落とすこと。** L5 の levered-regime 非単調性は、ほとんどの読者にとって最初のメンタルモデルが壊れる場所だ。そこを丁寧に再構築する。

## 準備完了

L1 に進む。`MARGIN_SCALE` を整え、ネットワークのリスクパラメータを収める `LiquidationParams` 構造体を作る。

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
