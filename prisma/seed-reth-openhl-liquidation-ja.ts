// AUTO-GENERATED from drafts/openhl_liquidation_*_ja.md by .github/scripts/build-openhl-liquidation-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlLiquidationJA(prisma: PrismaClient) {
  const tags = ["reth","evm","liquidation","perpetual","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-liquidation-ja",
      title: "OpenHL Liquidation を作る — 永久先物ポジション liquidation エンジン",
      description:
        "永久先物ポジションの liquidation engine を構築する — margin ratio からアカウントを分類し（Safe / AtRisk / Liquidatable / Underwater）、close order の spec を生成する pure compute レイヤー。Levered-regime での非単調性の発見も含む: proptest を書く、失敗を見る、原因をトレースする、prop_assume! で refine する。DIY Perp シリーズの 5 つ目のコース。Stage 10a（margin math）shipped 済み。Insurance fund（Stage 10b）と multi-account scanner（Stage 10c）は pending。",
      difficulty: "EXPERT",
      duration: 250,
      xpReward: 490,
      track: "diy-perp",
      tags,
      isPublished: true,
      sortOrder: 1000,
      locale: "ja",
      instructorName: "RethLab",
      modules: {
        create: [
          {
            title: "Orientation",
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: "OpenHL Liquidation を作る — 永久先物ポジション liquidation エンジン",
                  slug: "openhl-liquidation-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# OpenHL Liquidation を作る — 永久先物ポジション liquidation エンジン

## 何を作るか

前のコース（\`building-openhl-funding\`）で追加した funding-rate state machine によって、永久先物の mark と index の乖離を funding payment で抑える仕組みが手に入った。本コースで作るのは次の openhl primitive、すなわちアカウントの損失が預け入れ collateral を超えたときにポジションを force-close する **liquidation エンジン**だ。

本コースを終えると、以下を完成させている:

- 新しい \`openhl-liquidation\` crate に **3 ソースファイル / ~600 LOC**。
- Stage 10a マイルストーン時点で **24+ tests passing**、capstone までにさらに増える。各 compute 関数の hand-traced unit test、margin-ratio の単調性と determinism を狙う proptest、insurance fund の保存則 invariant が並ぶ。
- **3 つの building block**。fixed-point types モジュール、純粋な compute モジュール（margin math）、そして state machine（insurance fund、Stage 10b）と multi-account scanner（Stage 10c）。
- 全 validator が同じ結果に到達する **4 状態の margin classification**（\`Safe\` / \`AtRisk\` / \`Liquidatable\` / \`Underwater\`）。

理解できるようになることは:

- perp DEX が liquidation をオフチェーンプロセスに外注できない理由。外注した時点で consensus 上で支払い能力を主張できなくなる。
- Hyperliquid 型 margin model: cross-margin、mark-vs-entry、initial-vs-maintenance。
- Margin health の 4 状態と、それぞれが engine に何を許可するか。
- \`margin_ratio\` の **非単調エッジケース**。collateral が notional を支配するとき、ratio が mark の方向と逆に動くケースが生じる。それでもなお liquidation が壊れない理由。
- insurance fund を**単なる \`u64\` の残高変数 (balance entry) ではなく、独自の遷移ルール (\`deposit\` / \`withdraw\` / \`absorb_deficit\` の不変条件) を持つ pure state machine** として作る理由。
- Auto-deleveraging (ADL) がこの設計の端でどう位置づけられるか。そして Stage 10 では扱わない理由。

## なぜ liquidation が重要か（perp 1 段落）

永久先物はレバレッジの効いたポジションだ。トレーダーは \`collateral\` (USDC) を預け、\`entry\` 価格で \`size\` のポジション（符号付き: 正 = ロング、負 = ショート）を開く。ポジションの *unrealized PnL* は mark 価格とともに動く。ロングは mark > entry で利益、mark < entry で損失だ。損失が collateral を食って \`equity / notional\` が **maintenance margin** 要件を下回ると、アカウントはもう損失をカバーしきれない。ここで engine が動く — market でポジションを force-close し（反対 side、フルサイズ）、**liquidation fee** を collateral から差し引いて insurance fund に積み立て、equity がまだ正なら残りをアカウントに返す。Close する前に equity が *負* になっていたら — いわゆる「underwater」ケース — 不足分は insurance fund が吸収する。これがメカニズムのすべてだ。

## なぜ L1 perp DEX は consensus 内で liquidation を実行するのか

ある種のデリバティブ venue は liquidation をオフチェーンの liquidator プロセスに外注する。アカウント状態を scan して \`liquidate(account)\` endpoint を呼ぶ bot だ。低頻度の settlement system（クレジットデフォルトスワップなど）ならこれで機能するが、perp のスピードでは破綻する。50× のレバレッジを賭けた HYPE position は、ニュースの cascade で数秒のうちに healthy から underwater に反転しうる。検知から close までの RPC ラウンドトリップの遅延は、丸ごと chain 側の損失として残る。

Hyperliquid は liquidation を **consensus 内** で実行する。すべての validator が、すべての block で、どのアカウントが maintenance を下回っているかを独立に計算する — 同じデータから、同じコードで。Engine の出力である close orders と insurance-fund movements は block の一部になる。**敵対的な市場の動きのもとで chain が支払い能力を保つ手段は、これ以外にない。**

この保証の代償が determinism の規律だ。float 演算は禁止。すべての classification は validator 間で byte-identical でなければならない。すべての overflow は panic ではなく saturate しなければならない。Funding コース（\`openhl-funding\`）でこの規律との最初の本格的な遭遇があった。本コースは 2 回目になる。

## なぜ liquidation に float を使えないのか

Funding と同じ答え: consensus determinism のためだ。あるアカウントを \`Liquidatable\` と分類する validator と、同じアカウントを \`AtRisk\` と分類する validator がいると、生成される block が違ってくる — close orders も違えば、fees も違い、insurance-fund deltas も違う。Block proposal が分岐し、chain が fork する。

直し方は決まっている。符号付き整数を使い、**飽和演算 (saturating arithmetic — オーバーフロー時に panic も wrap もせず型境界値 \`i64::MAX\` / \`i64::MIN\` に張り付かせる演算、Rust では \`saturating_add\` / \`saturating_mul\` 等)** を通し、i64 でオーバーフローしうる乗算には i128 の中間値を経由させる。\`MarginRatio\` の固定小数点単位には \`MARGIN_SCALE = 10_000\`（basis points）を採用する。Bps は TradFi *でも* crypto perp venue でも margin の慣例単位だ — Hyperliquid、Binance、Drift はいずれも margin 要件を bps で表現する。\`MarginRatio(1_000)\` はちょうど 10%、\`MarginRatio(MARGIN_SCALE)\` はちょうど 100%。

（Funding は parts-per-billion の精度が必要だったので \`RATE_SCALE = 1_000_000_000\` を選んだ。Liquidation はそこまでの精度を要求しないが、規律自体は同じだ。）

## 12 レッスン

### Module 0 — Orientation
- **L0**（本レッスン）— なぜ liquidation か、なぜ margin model か、3 サブステージの roadmap。

### Module 1 — 型（L1-L3）
- **L1** — \`MARGIN_SCALE = 1e4\`（bps）+ \`LiquidationParams\` + \`hyperliquid_default()\`（10% / 2% / 1.5%）。bps を選ぶ理由、このデフォルト値の根拠。
- **L2** — \`MarginRatio\` newtype + \`MarginHealth\` enum（\`Safe\` / \`AtRisk\` / \`Liquidatable\` / \`Underwater\`）。4 状態にする理由と、各状態が許可する挙動。
- **L3** — \`AccountSnapshot\` + \`CloseOrderSpec\`。\`funding::Position\` を流用せず新しい snapshot 型を起こす理由 (**read-only な不変 snapshot 型に分離して、リスク計算のコアロジックを上流レイヤー (bridge / clearing) のミュータブルな state shape から疎結合に保つ**)、そして bridge レイヤーがどう組み立てるか。

### Module 2 — 純粋な compute（L4-L7）— Stage 10a
- **L4** — \`notional_value\` + \`unrealized_pnl\`。ロング・ショートいずれでも符号が正しく揃う signed-multiplication のトリック。
- **L5** — \`account_equity\` + \`margin_ratio\`。Collateral が notional を支配するときに姿を現す **非単調エッジケース (= 価格が好転しているように見えるのに、特定の条件下ではマージン比率が逆に悪化して見える現象)** を proptest で検出し、\`prop_assume!\` がなぜ正しい修正なのかを見る。
- **L6** — \`margin_health\` 分類。境界条件にすべて strict less-than を採用する理由と、それが何を保証するか。
- **L7** — \`close_order_spec\`。Market order の規律 — liquidation は利用可能な任意の価格を取る。ここで Stage 10a が完成する。

### Module 3 — Insurance fund（L8-L10）— Stage 10b
- **L8** — \`InsuranceFund\` 構造体 + \`deposit\` / \`withdraw\`。Single-balance な state machine。
- **L9** — \`absorb_deficit\`。Underwater liquidation が fund をどう drain するか。
- **L10** — \`credit_fee\`。liquidation fee が collateral から fund へ流れる。Composition test として、1 回の liquidation が deeply underwater な場合に fee を credit し *かつ* deficit を absorb する複合ケースを扱う。

### Module 4 — Scanner + Capstone（L11-L12）— Stage 10c
- **L11** — \`LiquidationScanner\`。\`&[AccountSnapshot]\` を順に辿り、各アカウントを分類し、\`Liquidatable\` と \`Underwater\` には close order を emit し、insurance-fund delta を返す。Composition layer の本体。
- **L12** — Capstone。総合、bridge integration の preview、そして市場構造コンテキスト — on-chain CLOB liquidation が CEX の liquidation や ADL とどう違うか。

## モジュールごとの SHA pinning

各レッスンは build に使う openhl commit を引用する。本コースは Stage 10a → 10c の 3 commit にまたがる:

| Module | レッスン | openhl SHA |
|---|---|---|
| 0 | L0 | \`22eedf9\` (Stage 10a) |
| 1 | L1-L3 | \`22eedf9\` (Stage 10a) |
| 2 | L4-L7 | \`22eedf9\` (Stage 10a) |
| 3 | L8-L10 | *Stage 10b — TBD* |
| 4 | L11-L12 | *Stage 10c — TBD* |

TBD の行は Stage 10b と 10c が ship した時点で更新する。それまで Module 3、4 はスケルトン状態だ。一方で Module 1-2 のコンテンツ（pure-compute 側のすべて）は \`22eedf9\` に対して完全に書き起こしてあり、Stage 10a を end-to-end で進められる状態になっている。

## 前提

本コースを最大限活用するには、以下があるとよい:

- **Course 9（openhl-funding）** が頭の中にあること。全レッスンを覚えている必要はないが、funding で使った fixed-point / saturating 演算 / pure state machine というパターンは本コースでもそのまま再登場する。Funding が難しかったなら本コースも難しい。
- **Course 7（openhl-clob）** の \`AccountId\`、\`Side\`、\`Qty\`。これらを直接再利用するため。Matching engine の内部まで遡る必要はない。
- **基本レベルの margin math への親しみ**。「initial margin = 10%、maintenance = 2%」を見て混乱しないなら準備完了。そうでなければ、上の perp recap と Hyperliquid の help center で十分だ。
- **EVM や precompile の知識は不要**。Liquidation は funding と同じく純粋な state-machine math に閉じている。

以下は不要:
- 動く openhl node — 本 crate は zero I/O。
- 取引所のリスクエンジンの経験 — ここのモデルは小さい。
- 定量金融の背景 — 基本的な代数で足りる。

## セットアップ

\`\`\`bash
# openhl workspace root で:
cd ~/code/my-openhl
git checkout main
cargo build --workspace  # ベースライン — L1 前にこれが通ること
\`\`\`

リファレンスチェックアウト（各レッスン末の答え合わせ diff 用）:

\`\`\`bash
cd ~/code/openhl-reference  # 自分の作業ツリーとは別のチェックアウト
git checkout 22eedf9
\`\`\`

（または同じ workspace を使い、参照のときに \`git stash\` する。どちらでもよい。）

## コーススタイル

各レッスンはコース 6-9 で確立した build-along フォーマットに従う:
- **ゴール** — 終了時点で何が pass し、何が build されているか。
- **おさらい** — 前のレッスンがどこで終わったか。
- **計画** — 番号付きで具体的な編集。
- **予測**コールアウト（🛑「スクロール前に...」付き）。答えの前に問いを立てる。
- **反流暢性**コールアウト（🛑「やりがちな勘違い」）。「〜と書けばよいのでは?」という反射を先回りして叩く。
- **手を動かす walk-through** — 段階的なコード編集と、各変更の意図。
- **テスト** — \`cargo test\` コマンドと期待出力。
- **設計の振り返り** — このレッスンのコードに反映された 3-5 個の load-bearing な決定。
- **答え合わせ** — openhl reference SHA に対する \`git diff\`。
- **よくある質問** — 3-5 問、それぞれ根拠まで添えた回答。

Module 2（pure compute）はコース 7 の matching engine と比べて proof-heavy で code-light な作りだ。**エッジケースの前ではペースを落とすこと。** L5 の levered-regime 非単調性は、ほとんどの読者にとって最初のメンタルモデルが壊れる場所だ。そこを丁寧に再構築する。

## 準備完了

L1 に進む。\`MARGIN_SCALE\` を整え、ネットワークのリスクパラメータを収める \`LiquidationParams\` 構造体を作る。
`,
                },
              ],
            },
          },
          {
            title: "型",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "レッスン 1 — MARGIN_SCALE + LiquidationParams — リスクエンジンのダイヤル",
                  slug: "openhl-liquidation-margin-scale-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 1 — \`MARGIN_SCALE\` + \`LiquidationParams\` — リスクエンジンのダイヤル

## ゴール

このレッスンで掴む概念:

- **margin の固定小数点単位として basis points が正しい理由。** bps は 4 decimal digits の精度を与える — それはちょうど、実際の取引所（HL、Binance、Drift）が margin 要件を表現するときの解像度だ。\`RATE_SCALE\` と同じ i64-saturating の規律で、違うのはスケールだけ。
- **margin と rate に異なる scale が必要な理由。** Funding rate は 1 区間で notional の \`0.0001\` から \`0.04\` までを動かすので parts-per-billion が必要だった。一方 margin 要件は notional の \`0.02\` から \`0.10\` を動かす。マグニチュードの差が 2 桁あれば、スケールも 2 桁ずらす。
- **\`LiquidationParams\` はユーザー状態ではなく、ネットワーク状態である。** 10% / 2% / 1.5% のデフォルトは *consensus パラメータ*であり、ネットワーク genesis 時に 1 回だけ設定され、governance を経なければ変更されない。構造体としてまとめる狙いは、\`compute.rs\` に magic constant を散らすかわりに、パラメータを first-class かつ明示的な存在に格上げすることにある。
- **\`hyperliquid_default()\` という const constructor。** \`const fn\` なので、デフォルト値は \`static\` コンテキスト、テスト fixture、コンパイル時 assertion でも素直に使える。**\`#[must_use]\` を添えて、構築したまま捨てる事故を禁じる。**

確認:

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

…がコンパイルされる。

具体的な変更:

- **Cargo.toml** に \`openhl-clob\` と \`openhl-funding\` の依存を追加する（\`AccountId\`、\`Side\`、\`Qty\` は clob から、\`MarkPrice\`、\`PositionSize\`、\`Notional\` は funding から借りる — いずれも production の型シグネチャに乗る型で、test 専用ではない）。
- **\`src/types.rs\`** を新規作成。モジュール docs、\`MARGIN_SCALE\` 定数、\`LiquidationParams\` 構造体、デフォルトと accessor を載せた impl ブロックを置く。
- **\`src/lib.rs\`** を空のままから書き起こす。クレート docs、\`pub mod types;\`、そして \`MARGIN_SCALE\` と \`LiquidationParams\` をクレートルートに re-export する行を加える。

L1 にテストはない。\`MARGIN_SCALE\` は値、\`LiquidationParams\` は受動的な構造体だからだ。L2 で初めて挙動を持つ型（\`MarginHealth\` enum）が登場し、最初の unit test もそこで生まれる。

## おさらい

L0 の後:
- perp DEX が liquidation をオフチェーンではなく consensus 内で実行する理由を理解している。
- float が chain-fork hazard になる理由を理解している（funding と同じ論理）。
- Liquidation クレートのスキャフォールド（Cargo.toml + 空の \`src/lib.rs\`）は Stage 10a 前から workspace に置かれている — funding crate のときと同じ流儀だ。

L1 では、この空の crate を、公開された scale 定数 1 つと、エンジン全体を支配するパラメータを持つ実体ある crate に育てていく。

## 計画

編集は 3 つ。Funding L1 と同じ形だが、依存が 1 つではなく 2 つになる:

1. **\`crates/liquidation/Cargo.toml\`** — \`[dependencies]\` に \`openhl-clob = { path = "../clob" }\` と \`openhl-funding = { path = "../funding" }\` を追加する。L5 / L6 で使う \`proptest\` を含めた \`[dev-dependencies]\` ブロックも併せて足す。
2. **\`crates/liquidation/src/types.rs\` を作成。** bps の根拠を説明するモジュール docs、\`MARGIN_SCALE\` 定数、\`LiquidationParams\` 構造体、impl ブロックを置く。
3. **\`crates/liquidation/src/lib.rs\`** を空のままから書き起こし、クレート docs、\`pub mod types;\`、\`pub use types::{LiquidationParams, MARGIN_SCALE};\` を加える。

> 🛑 **予測。** スクロール前に: funding は \`RATE_SCALE = 1_000_000_000\`（parts-per-billion、9 decimal digits の精度）を使う。それなのに liquidation は \`MARGIN_SCALE = 10_000\`（basis points、4 decimal digits）にする — なぜか? ヒント: 表現すべきマグニチュードを思い出す。funding rate は 1 区間で \`0.0001\` から \`0.04\`、margin 要件は notional の \`0.02\` から \`0.10\`。

（答え: **必要な解像度は、意味のある最小ステップに従って決める。** 1 区間 \`0.0001%\` の funding rate は高ボリュームトレーダーにとって意味のある差だから、ppb が正しい解像度になる。一方で maintenance margin が \`0.02%\` か \`0.05%\` かは engine 層で意味のある差には **ならない** — 本番のデプロイは bps の整数（\`200 bps\`、\`500 bps\`）で maintenance を設定する。Bps は慣例単位だ。ppb を採用してしまうと、システムが実際には使わない精度を買い込むことになる。**実際のレンジをカバーする最小のスケールを選ぶ。**）

\`RATE_SCALE\` と \`MARGIN_SCALE\` の解像度差を 1 枚で並べると、なぜそれぞれが「自分のドメインに対して必要十分」なのかが直感で見える:

\`\`\`
                       Course 9 (funding)              Course 10 (liquidation)
                       ─────────────────────           ────────────────────────
スケール定数             RATE_SCALE = 1_000_000_000      MARGIN_SCALE = 10_000
                       (parts-per-billion, 10⁹)        (basis points, 10⁴)
精度                    9 decimal digits                4 decimal digits
扱う典型レンジ           0.0001% — 4% / interval         2% — 10% (maintenance)
                                                       10% — 50% (initial)
本番で意味のある最小ステップ  0.0001% (= 10 ppb)               1 bp = 0.01%
1.0 を表す raw 値        1_000_000_000                   10_000
4% を表す raw 値        40_000_000                      400
                       ↑ ppb は 1 step = 0.0000001%      ↑ bps は 1 step = 0.01%
                       「ベイシスポイント以下の精度を     「ベイシスポイント単位の境界を
                        トレーダーが感じ取る」世界用       オペレータが運用する」世界用
\`\`\`

ポイントは「**解像度はドメインの慣例単位に合わせる**」だ。funding は per-billion でしか表せない差を扱うので \`ppb\`、margin はそもそも本番設定が bps の整数で来るので \`bps\`。スケールを揃えなくていい理由は両者がドメインとして独立しているからで、揃えてしまうと使われない精度のために i64 のヘッドルームを浪費する。

## 手を動かす walk-through

### Step 1: Cargo.toml を更新

\`crates/liquidation/Cargo.toml\` を開く。現状:

\`\`\`toml
[package]
name         = "openhl-liquidation"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]

[lints]
workspace = true
\`\`\`

次のように更新:

\`\`\`toml
[package]
name         = "openhl-liquidation"
version      = { workspace = true }
edition      = { workspace = true }
rust-version = { workspace = true }
license      = { workspace = true }
repository   = { workspace = true }
authors      = { workspace = true }

[dependencies]
openhl-clob    = { path = "../clob" }
openhl-funding = { path = "../funding" }

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
\`\`\`

3 つの変更:

1. **\`openhl-clob = { path = "../clob" }\`** — \`AccountId\`、\`Side\`、\`Qty\` を取り込むため。bridge レイヤーは liquidation order でこれらを再利用するし、\`AccountSnapshot\` は \`AccountId\` を持ち回る。
2. **\`openhl-funding = { path = "../funding" }\`** — \`MarkPrice\`、\`PositionSize\`、\`Notional\` を取り込むため。これらは funding と liquidation の接点に立つ型で、両方の crate が同じ通貨で会話するための語彙だ。
3. **\`[dev-dependencies]\` ブロック** に \`proptest\` を入れる。L5（margin-ratio の単調性テスト）と L6（margin-health の determinism テスト）で使うので、宣言だけ先に済ませておく。

> 🛑 **やりがちな勘違い。** 「L5 / L6 で使うならテスト用、両方 dev-dep でよいのでは?」 **そうではない。production コードのほうも \`MarkPrice\` や \`AccountId\` を \`compute.rs\` の関数シグネチャで使う — テスト専用ではない。** Funding でも L1 で同じ判断をした。ルールは単純で、\`pub fn\` シグネチャに現れる型は dev-only ではなく通常の dep に置く必要がある。

### Step 2: \`src/types.rs\` を作成

\`crates/liquidation/src/types.rs\` を作る。このファイルはまだ存在しないので、このレッスンで新規作成する。初期内容は以下:

\`\`\`rust
//! Core types for the liquidation engine.
//!
//! Pure data — no I/O, no allocation. Every type is \`Copy\`-friendly so the
//! engine can be invoked on snapshots taken at the bridge layer without
//! lifetime gymnastics. The convention follows \`openhl-funding\`: the
//! liquidation crate never owns mutable state in Stage 10a; it computes
//! over snapshots that the caller assembled.
//!
//! ### Why fixed-point integers, not floats
//!
//! Same answer as \`openhl-funding\`: consensus determinism. Every validator
//! must reach the same \`MarginHealth\` from the same inputs, and float
//! arithmetic varies bit-for-bit across compilers and CPUs. We use signed
//! integers scaled by [\`MARGIN_SCALE\`] (basis points, 10⁴) for margin
//! ratios.

/// Scale factor for \`MarginRatio\` — basis points (1 bp = 0.01%).
///
/// A raw value of \`MARGIN_SCALE\` represents \`100%\`; \`MARGIN_SCALE / 10\`
/// (= 1_000) represents \`10%\`. Bps is the conventional unit for margin
/// in TradFi and in crypto perp venues (Hyperliquid, Binance, Drift all
/// express margin requirements in bps).
pub const MARGIN_SCALE: i64 = 10_000;

/// Network parameters governing the margin model.
///
/// Bps convention: \`initial_margin_bps = 1000\` means a 10% initial margin
/// requirement. Maintenance must be ≤ initial; if a misconfigured network
/// sets them equal, every position at exactly that threshold classifies as
/// \`Liquidatable\` (the conservative default).
///
/// \`liquidation_fee_bps\` is charged on the notional being closed, paid
/// out of the account's collateral, and credited to the insurance fund
/// (Stage 10b). A typical HL-style value is 1–2% (100–200 bps).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LiquidationParams {
    /// Initial margin requirement in bps (e.g., 1000 = 10%).
    pub initial_margin_bps: u32,
    /// Maintenance margin requirement in bps (e.g., 200 = 2%).
    pub maintenance_margin_bps: u32,
    /// Liquidation fee in bps, charged on closed notional.
    pub liquidation_fee_bps: u32,
}

impl LiquidationParams {
    /// Hyperliquid-style defaults: 10% initial, 2% maintenance, 1.5% fee.
    /// Real production deployments use tiered maintenance (higher margin
    /// for larger position sizes) — out of scope for Stage 10a.
    #[must_use]
    pub const fn hyperliquid_default() -> Self {
        Self {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 150,
        }
    }

    #[must_use]
    pub const fn initial_margin_bps(&self) -> u32 {
        self.initial_margin_bps
    }

    #[must_use]
    pub const fn maintenance_margin_bps(&self) -> u32 {
        self.maintenance_margin_bps
    }

    #[must_use]
    pub const fn liquidation_fee_bps(&self) -> u32 {
        self.liquidation_fee_bps
    }
}
\`\`\`

このファイルで気づきたい点が 5 つある:

1. **\`MARGIN_SCALE: i64 = 10_000\`。** \`u32\` でも \`i32\` でもなく \`i64\` にしている。スケールの値自体は i32 に収まるのだが、margin ratio を出す乗算はすべて i128 中間値を経由してから i64 に saturate して戻ってくる。最初から \`MARGIN_SCALE\` を i64 にしておけば、各演算サイトで \`as i64\` キャストを散らかさずに済む。

2. **\`LiquidationParams\` に \`#[derive(Clone, Copy, Debug, PartialEq, Eq)]\`。** 3 フィールドはすべて \`u32\`、構造体サイズは 12 byte、自明に \`Copy\` に乗る。Engine は \`LiquidationParams\` を \`margin_health\` へ参照渡し（\`&LiquidationParams\`）するのが基本だが、型が \`Copy\` なので呼び出し側が誤って値渡ししても borrow checker に怒られない。

3. **\`pub\` フィールド *かつ* \`const fn\` ゲッター。** フィールドを public にしたのは \`MarkPrice.0\` と同じ理由で、これらは透明な newtype / params にすぎず、カプセル化の境界はない。\`const fn\` ゲッターが public フィールドと並んでいるのは、定数コンテキスト（例えば \`maintenance_bps < initial_bps\` のコンパイル時 assertion）で便利になるから。両スタイルが並存していて構わない。

4. **\`hyperliquid_default()\` を \`const fn\` にする。** これでデフォルト値を \`static\` アイテムに乗せられる: \`static PARAMS: LiquidationParams = LiquidationParams::hyperliquid_default();\` のような書き方が、テスト、fixture、protobuf encoded genesis state への埋め込みなど、あらゆるコンテキストで通る。**\`const fn\` constructor は、「欲しい値」と「どこでも宣言できる値」を橋渡しする道具だ。**

5. **constructor とゲッターに \`#[must_use]\`。** \`LiquidationParams\` を組み立ててから捨てる動作はほぼ間違いなくバグだ — デフォルト値を計算しておいて捨てている。Accessor も同じで、\`initial_margin_bps()\` を読んだ結果を無視するのはたいてい誤り。\`#[must_use]\` を付けておけば、コンパイラが読者に「本当にそれでいいのか」と問い返してくれる。**これは単なる気休めではなく、人間のレビューで見落とされがちな論理バグ (戻り値の捨て忘れ) を、**コンパイラ警告 (あるいは \`#![deny(unused_must_use)]\` で**コンパイルエラー**) に昇格させる防衛的プログラミングのテクニックだ。**「コンパイラを静的解析ツールとして最大限に駆動して、レビューコストをゼロに近づける」**という、Rust ならではの開発規律になっている。

> 🛑 **やりがちな勘違い。** 「3 つの独立した \`u32\` フィールドではなく、\`(u32, u32, u32)\` タプルをラップする \`LiquidationParams\` newtype ではダメか?」 **ダメだ。3 つの値は意味が違う。** タプルの順序は位置依存で壊れやすく、\`initial\` と \`maintenance\` を入れ替えるリファクタリングが静かに意味のバグを呼び込む。名前付きフィールドなら、呼び出し側を明示的に書かせられる: \`LiquidationParams { initial_margin_bps: 1000, ... }\`。**名前付きフィールドは実行時コストゼロで圧倒的な安全性を買い、位置タプルは安全性を失うだけで実行時の利益はゼロだ。**

### Step 3: \`src/lib.rs\` を更新

\`crates/liquidation/src/lib.rs\` を開く。現状は空のはずだ。中身を次に置き換える:

\`\`\`rust
//! \`openhl-liquidation\` — perpetual-position liquidation engine.
//!
//! Pure compute in Stage 10a: no I/O, no async, no networking. Liquidation
//! decisions are deterministic functions over \`(account_snapshot, mark,
//! params)\`. Every validator on the chain must reach the same
//! [\`MarginHealth\`] from the same inputs; if two validators classify the
//! same account differently, the chain forks.
//!
//! ### Hyperliquid-shape liquidation, in one paragraph
//!
//! Perpetual contracts are levered positions backed by deposited
//! collateral. As the mark price moves against an open position,
//! unrealized PnL eats into the account's equity. When \`equity / notional\`
//! drops below the network's maintenance-margin requirement, the engine
//! force-closes the position at market — opposite side, full size, no
//! limit price. The liquidation fee is debited from collateral and
//! credited to the insurance fund. Any residual collateral, after fee
//! and PnL settlement, stays with the account. If equity went negative
//! before the close (the account is "underwater"), the insurance fund
//! absorbs the deficit instead of the position closing solvently.

pub mod types;

pub use types::{LiquidationParams, MARGIN_SCALE};
\`\`\`

L11 終了時のバージョンと比べて欠けているものは、\`pub mod compute\`、それから \`MarginHealth\`、\`MarginRatio\`、\`AccountSnapshot\`、\`CloseOrderSpec\` の \`pub use types::{...}\` 再エクスポートだ。これらは L2-L7 で型と compute 関数を加える流れで揃ってくる。**L1 の lib.rs はコンパイルが通る最小構成にとどめる。**

クロスリファレンスの \`[\`MarginHealth\`]\` は L2 で enum が登場するまで未解決のままだ。Rustdoc は warning を出すが、これは受け入れる（funding L1 と同じ扱い）。

> 🛑 **予測。** 名前を明示した 2-name の再エクスポートではなく、\`pub use types::*;\` と書いたら何が起きるか? ヒント: L1 後と L7 後の \`types.rs\` にどんな型が住むか、そしてどの API surface に commit したいのかを考える。

（答え: **\`pub use types::*\` は将来 \`types.rs\` に住むものを丸ごと、つまり誤って \`pub\` を付けた helper や private support 型まで含めて再エクスポートしてしまう。** 一方、明示的に \`pub use types::{LiquidationParams, MARGIN_SCALE}\` と書けば、クレートの public surface は意図的な決定の集合になる。\`types.rs\` に public 型を増やすたびに lib.rs の re-export 行を直す必要が生じ、「これは本当に public API の一部か?」と立ち止まる瞬間が強制的に生まれる。Glob re-export は保守の落とし穴で、将来 \`pub(crate)\` の代わりに \`pub\` で helper を生やすと、本人の知らない間に public API の一部になっている。**明示的 re-export は public API surface のチェックリストとして働く。**）

### Step 4: コンパイル

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
warning: unresolved link to \`MarginHealth\`
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

\`MarginHealth\` への未解決リンクが残るので rustdoc warning が 1 つ出る（L2 で型が追加されれば消える）。**ここで抑制しないこと。** 何が欠けているかを build が教えてくれている合図だ。

エラーが出た場合に多い原因:

- **\`error[E0463]: can't find crate for 'openhl_clob'\` または \`'openhl_funding'\`** — Cargo.toml の \`path = "..."\` 依存を片方入れ忘れている。L1 のコード本体ではまだ使っていないが、L3 の import を先取りして書いていると発火する。
- **\`error[E0583]: file not found for module 'compute'\`** — lib.rs に \`pub mod compute;\` を先取りして書いてしまった。削除すれば直る。L4 で改めて戻ってくる。
- **\`error: failed to parse manifest\`** — Cargo.toml の syntax エラー。よくあるのは \`[dev-dependences]\` のような typo。

## 設計の振り返り

このレッスンの load-bearing な決定は 3 つ:

1. **\`MARGIN_SCALE = 10_000\` にする。\`1_000_000_000\` ではない。** Funding の \`RATE_SCALE\` より 2 桁細かくしてもズレるだけだ — 本番の margin パラメータが ppb で設定されることはない。逆に 2 桁粗くする（\`100\`、percent）と意味のある解像度を失う。**Bps は margin に対して世界が落ち着いた単位だ。我々もそれに合わせる。**

2. **Default constructor は \`const fn\` で書き、\`Default\` impl は使わない。** 両方とも正しくない理由を整理しよう。\`Default::default()\` は多くの型で「妥当な zero っぽい」デフォルトを返すが、\`LiquidationParams::default()\` が「margin ゼロ、fee ゼロ」を示唆するのは **危険** だ — その値で動かしたネットワークでは liquidation がそもそも起きない。**\`hyperliquid_default()\` は名前付きで意図的なデフォルトとして立てる。** 呼び出し側に名前で要求させることで、安全性に関わる性質を視界に残し続けられる。

3. **3 つの独立した \`u32\` フィールドにする。ネスト型 \`LiquidationConfig\` 構造体は作らない。** 将来 tiered maintenance margin（HL 流の「大きな position には高い maintenance %」）に移行する局面では \`Vec<MaintenanceTier>\` フィールドが欲しくなるかもしれない。だが今は加えない — 先取りした一般化になってしまう。**Stage 10a は flat margin で進める。Stage 10c+ で tiered が必要になったら、そのときに再検討する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/Cargo.toml ./crates/liquidation/Cargo.toml
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L1 の後:
- **Cargo.toml** は Stage 10a と完全一致する。
- **types.rs** は Stage 10a の types.rs の *最初の ~50 行* と一致する。モジュール doc、\`MARGIN_SCALE\`、\`LiquidationParams\`、impl までだ。残り（\`MarginRatio\`、\`MarginHealth\`、\`AccountSnapshot\`、\`CloseOrderSpec\`）は L2 / L3 で追加する。
- **lib.rs** は Stage 10a の lib.rs の *最初の ~25 行* と一致する。クレート doc、\`pub mod types;\`、2 つの再エクスポートまで。残りの再エクスポートはそれぞれの型を加えるタイミングで揃えていく。

## よくある質問

**Q1: \`MARGIN_SCALE\` をクレート doc と一緒に \`lib.rs\` に置かないのはなぜ?**

スケールする対象の型システムと同じ場所に置くのが筋だからだ。\`types.rs\` は unit-of-account（margin ratio、bps、分類しきい値）に関するものがすべて住む場所。lib.rs は public-API surface だ。\`MARGIN_SCALE\` を types.rs に置いてクレートルートに re-export するほうが、source of truth を分散させるよりクリーンになる。

**Q2: \`LiquidationParams\` の constructor で \`maintenance ≤ initial\` を検証すべきか?**

Stage 10a では検証しない。構造体は任意の組み合わせを受け入れる。Stage 10c で \`validated()\` constructor を別途追加し、genesis を読み込む側のコードから呼ばれたときに \`Result<Self, ParamsError>\` を返す形にする。検証なしの素の constructor は、test や proptest generator が *病的な* 入力を食わせたい場合のためにそのまま残す。

**Q3: なぜ \`hyperliquid_default()\` が 10% / 2% / 1.5% で、他の値ではないのか?**

HL の実際の maintenance margin tier は position size に応じて 1.25% から 6.67% の範囲に分布する。代表的な中間値として 2% を選んだ。Initial が maintenance の 10 倍というのもよく見る配分だ。Fee の 1.5% は ETH/BTC の公開 HL 値で、軽い資産ではもっと低くなる。**どの数字も特権ではない。あなたのネットワークが自分で設定すればよい。**

**Q4: Margin ratio の計算で実際の i64 overflow リスクは?**

\`margin_ratio = equity * MARGIN_SCALE / notional\`。\`MARGIN_SCALE = 10_000\` のもと、\`equity\` と \`notional\` が \`i64::MAX\` で bound されているとすると、積 \`equity * MARGIN_SCALE\` は \`equity > i64::MAX / 10_000 ≈ 9.2e14\` で i64 を overflow しうる。現実的な取引所スケールに直すと 920 兆ドルの equity だ — 妥当な入力からははるか上にある。ただし L5 では依然として乗算を \`i128\` で行い、i64 に saturate して戻す。**設計の規律としては funding と同じ — i64 を超えうる積は、敵対的な入力では必ず超えるものと想定する。**

**Q5: \`MARGIN_SCALE\` と bps に \`u32\` を使って、i64 への変換ノイズを避けられないか?**

避けられる。\`i64::from(...)\` の呼び出しが数回減るのも事実だ。代償として、あらゆる margin-ratio 計算が \`equity\`（signed）と \`notional\`（unsigned）を含むので、演算で signed と unsigned を混ぜるたびに各サイトで明示的キャストが必要になる。境界で 1 回 i64 にアップキャスト（\`i64::from(params.initial_margin_bps)\`）してしまい、その後の演算は signed で通すほうが綺麗だ。**境界で変換し、計算は 1 つの型で揃える。**

## 次のレッスン (L2)

L2 では \`MarginRatio\` newtype と \`MarginHealth\` enum を追加する。\`MarginHealth\` は load-bearing な分類型で、これ以降の 5 レッスンはどれもこの型を return するか consume するかのいずれかだ。\`bool\` でも \`u8\` でもなく 4-variant enum を選んだ理由を見ていく。
`,
                },
                {
                  title: "レッスン 2 — MarginRatio + MarginHealth — エンジンが返す分類型",
                  slug: "openhl-liquidation-margin-types-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン 2 — \`MarginRatio\` + \`MarginHealth\` — エンジンが返す分類型

## ゴール

このレッスンで掴む概念:

- **\`MarginRatio\` を \`type\` alias ではなく newtype にする理由。** newtype なら「bps スケールの ratio を期待しているところに生の i64 を渡した」というバグをコンパイル時に捕まえられる。Funding の \`MarkPrice(pub u64)\` vs \`u64\` と同じ規律だ。
- **\`MarginHealth\` がちょうど 4 variants である理由。** \`Safe\`、\`AtRisk\`、\`Liquidatable\`、\`Underwater\` の 4 つは、それぞれ異なるエンジン動作を許可する。どれを潰しても、エンジンの他の部分が必要とする情報が失われる。
- **各 variant がエンジンの残り部分に対して何を許可するか** — 頭に収まる小さな decision matrix として整理する。
- **enum に \`PartialOrd\` / \`Ord\` を *derive しない* 理由。** variants は自然に worsening order を成すのだが、\`health > Safe\` のような順序比較は、明示的な \`matches!\` パターンと比べてコード臭がする。

確認:

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

…がコンパイルされる。

具体的な変更:

- **\`src/types.rs\`** — 既存の \`MARGIN_SCALE\` 定数と \`LiquidationParams\` 構造体の下に、\`MARGIN_SCALE\` スケールの \`MarginRatio\` newtype と \`MarginHealth\` enum を加える。L1 で書いた部分には触らない。
- **\`src/lib.rs\`** — 既存の \`pub use types::{...}\` 再エクスポートに \`MarginRatio\` と \`MarginHealth\` を足す。

L2 にもテストはない。\`MarginRatio\` と \`MarginHealth\` はどちらも受動的なデータ型だからだ。L3 で \`AccountSnapshot\` と \`CloseOrderSpec\` を加え、types モジュールを閉じる流れになる（こちらもテストなし）。最初の挙動テストは L4 の \`notional_value\` でようやく登場する。

## おさらい

L1 の後:
- クレートには \`MARGIN_SCALE\`（10⁴）と、\`hyperliquid_default()\` を備えた \`LiquidationParams\` がある。
- \`lib.rs\` は両方を \`types\` から再エクスポートしている。
- \`cargo build -p openhl-liquidation\` が pass する。\`MarginHealth\` への rustdoc warning が 1 つ残っているはずだ（この時点ではまだ未解決）。

L2 ではエンジンの残り部分が言葉として使う 2 つの分類型を追加する。L4 以降、\`margin_ratio\` は \`MarginRatio\` を返し、\`margin_health\` は \`MarginHealth\` を返す形になる。

## 計画

編集は 2 つ、どちらも小さい:

1. **\`crates/liquidation/src/types.rs\` の末尾に追記。** \`MARGIN_SCALE\` を基準にした doc を伴う \`MarginRatio(pub i64)\` newtype と、4 variants + 各 variant の authorization の意味を説明する doc コメントを持つ \`MarginHealth\` enum を加える。
2. **\`crates/liquidation/src/lib.rs\` を更新。** \`pub use types::{...}\` 行を、新しい 2 つの名前を含む形に拡張する。

> 🛑 **予測。** スクロール前に: \`MarginHealth\` は enum として実装する予定だ。variants はいくつ必要か? ヒント: エンジンは各アカウントについて 3 つの判断を下さなければならない。(a) アカウントは新しいリスクを取れるか? (b) エンジンはポジションを force-close すべきか? (c) close だけで不足分をカバーできるか、それとも insurance fund が介入する必要があるか?

（答え: **3 つの問い → 4 variants。** \`Safe\` は (a) yes。\`AtRisk\` は (a) no, (b) no。\`Liquidatable\` は (a) no, (b) yes, (c) yes（close だけで足りる）。\`Underwater\` は (a) no, (b) yes, (c) no（insurance fund が不足分を吸収する）。3-variant enum にして Safe / AtRisk / Liquidatable だけにすると、Liquidatable と Underwater が潰れて「insurance fund は関与するのか?」という信号が消えてしまう。エンジンがそれを再計算する必要はない — variant にすでに反映済みだ。）

4 つの variant が、それぞれアカウントに対して**どの action を authorize するか**を 1 枚のマトリクスに落とすと、なぜ 4 つ必要なのか、そして各 variant がどう「下流の意思決定」を型レベルで運ぶのかが一目で見える:

\`\`\`
                    │ (a) 新規ポジション │ (b) Force-close   │ (c) Close だけで    │
                    │     を開ける?       │   実行する?       │   不足カバー可能?    │
   ─────────────────┼────────────────────┼───────────────────┼─────────────────────┤
   Safe              │ ✅ yes              │ ❌ no              │ N/A (close 不要)    │
   AtRisk            │ ❌ no               │ ❌ no              │ N/A (close 不要)    │
   Liquidatable      │ ❌ no               │ ✅ yes             │ ✅ yes (equity 残あり)│
   Underwater        │ ❌ no               │ ✅ yes             │ ❌ no → insurance    │
                    │                    │                   │   fund が吸収        │
   ─────────────────┴────────────────────┴───────────────────┴─────────────────────┘

下流のエンジン挙動 (L7 / Module 3 で実装):
   Safe         ─► trader はそのまま運用継続
   AtRisk       ─► UI で警告、新規ポジは拒否、close は trader 自身に任せる
   Liquidatable ─► 自動 close order を発行、fee を差し引き、残 equity を返却
   Underwater   ─► 自動 close order を発行、不足分は insurance fund から補填
\`\`\`

ポイント: **各 variant がそのまま「許可される action のセット」を表す**。\`Liquidatable\` と \`Underwater\` を 1 つに潰すと「insurance fund を呼ぶべきか」の信号が型から消え、エンジンが equity を再計算してから判断し直すコストが発生する。逆に variant を増やしてもどの行も新しい列は引き出せない (= action set として一意に区別される最小単位がこの 4 つ)。**「state machine の variants は、自分がトリガーする下流 action の数だけ存在する」** が、この設計が体現している原則だ。

## 手を動かす walk-through

### Step 1: \`src/types.rs\` に追記

\`crates/liquidation/src/types.rs\` を開く。\`LiquidationParams\` の impl ブロックを閉じる \`}\` の後に追記:

\`\`\`rust
/// Account margin ratio = \`equity / notional\`, scaled by [\`MARGIN_SCALE\`].
///
/// Sign: usually non-negative; can be negative when the account is
/// "underwater" — accumulated losses have driven equity below zero, and
/// liquidating the position alone cannot cover the deficit. The insurance
/// fund absorbs that shortfall (Stage 10b).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MarginRatio(pub i64);

/// Margin health classification given the account's current margin ratio
/// and the network's params. Four states, in decreasing health order.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum MarginHealth {
    /// Margin ratio ≥ initial margin requirement. Healthy: the account
    /// can open new positions or increase existing ones.
    Safe,
    /// Margin ratio ∈ [maintenance, initial). Allowed to hold existing
    /// positions but not to add risk. Production UIs typically warn the
    /// user.
    AtRisk,
    /// Margin ratio < maintenance, equity still ≥ 0. The engine should
    /// liquidate the position at market; the account's remaining equity
    /// (after the liquidation fee) returns to the account.
    Liquidatable,
    /// Margin ratio < 0 (equity is negative). Closing the position at
    /// any price won't fully cover losses. The insurance fund absorbs
    /// the shortfall — handled in Stage 10b.
    Underwater,
}
\`\`\`

この 25 行で気づきたい点が 5 つ:

1. **\`MarginRatio(pub i64)\` は newtype。** \`type MarginRatio = i64\` の alias ではない。Newtype は型チェッカーに足場を与える — \`MarginRatio\` を取る関数を、balance や account ID、\`MarkPrice\` のつもりで渡した生の \`i64\` 値では呼べなくなる。\`pub i64\` フィールドにしてあるので、呼び出し側は \`MarginRatio(1000)\` で組み立てて \`ratio.0\` で読み出せる。**内部に不正な状態を持ち得ない (= どんな \`i64\` 値が入っても型として不正にならない、つまり守るべきカプセル化不変量がない) ため、無駄にゲッター/セッターで隠蔽せず、透明なデータコンテナとしてシンプルに保っている。**「\`Vec\` を \`MyVec\` の private フィールドにラップして \`len()\` を再公開する」ような防壁は、不変量を守るためのコストであって不変量がないところに払うべきではない。

2. **\`MarginRatio\` は \`Default\`、\`PartialOrd\`、\`Ord\`、\`Hash\` まで広めに derive している。** これらが engine 側から要求されているわけではないが、下流のコード（telemetry、Stage 10c の worst-health 順 scanner、ダッシュボード）が \`MarginRatio\` を他の比較可能な値型と同じように扱えるようにしておく狙いがある。\`MarginRatio::default()\` は \`MarginRatio(0)\` で、意味としては「ratio 未計算」または「ゼロ初期化済み」だ。Engine 自身は \`default()\` を読むことはなく、必ず snapshot から計算する。

3. **\`MarginHealth\` は \`PartialOrd\` / \`Ord\` を derive *していない*。** variants は自然に順序を成す（Safe < AtRisk < Liquidatable < Underwater が worsening 方向）が、enum に順序比較を入れるのはコード臭だ。\`if health > MarginHealth::AtRisk\` よりも、\`if matches!(health, MarginHealth::Liquidatable | MarginHealth::Underwater)\` のほうが意図がはっきり読める。コンパイラに明示的なパターンを書かせれば、将来の保守者は分岐がどの variants をカバーしているかを過不足なく確認できる。**安易な enum の順序比較はバグの温床 (コード臭) になりがち — まずは \`matches!\` による明示的なパターンマッチに手を伸ばす規律を持とう。** 順序比較が真に欲しい場面 (severity 順のテレメトリソート等) では、明示的な \`severity_rank()\` メソッドを生やすほうが意図が見える。

4. **Variant ごとの doc コメントは数学ではなく *authorization* を語る。** 「Margin ratio < maintenance」は variant が発火する条件を示すが、コメントはエンジンが応答として何をすべきか（「ポジションを market で liquidate すべき」）まで書いている。この doc コメントが、「Liquidatable がシステムの残り部分にとって何を意味するか」を引く際の正式な参照になる。

5. **Variant の順序は worsening health に対応している。** ソース上は Safe → AtRisk → Liquidatable → Underwater の順だ。Rust の enum は derive したもの以外に固有の順序を持たないので、これはコンパイラにとっては load-bearing ではない。しかし網羅的な \`match\` を読むときに、自然な順序（最良ケースから最悪ケースへ）と並びが一致してくれる。

> 🛑 **やりがちな勘違い。** 「\`MarginHealth\` は \`bool\` でよいのでは — liquidatable か否か?」 **いいえ。エンジンは 1 つではなく 3 つの下流判断を要求するからだ。** \`bool\` だと (a)「新しいポジションを開けるか?」と (c)「insurance fund が関与するか?」を 1 ビットに潰してしまう。あとからこれを直すコストは、\`bool\` を返していた呼び出しサイトを総当たりして型を入れ替えることだ — 今のうちに正しく作るコストは、variants を 2 つ余計に書くだけで済む。

### Step 2: \`src/lib.rs\` を更新

\`crates/liquidation/src/lib.rs\` を開き、\`pub use types::{...}\` 行を拡張する。元:

\`\`\`rust
pub use types::{LiquidationParams, MARGIN_SCALE};
\`\`\`

更新後:

\`\`\`rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
\`\`\`

\`lib.rs\` への変更はこれだけだ。クレートルートに public で並ぶ名前は 3 つで、アルファベット順に並ぶ。定数は慣例的に末尾なので、\`MARGIN_SCALE\` は最後のままに置いておく。

L1 で出ていた \`[\`MarginHealth\`]\` への rustdoc warning は、型が実体を得たことでここで解消する。

### Step 3: コンパイル

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

Warning はゼロ。L1 で残っていた \`MarginHealth\` の rustdoc warning も消える。

エラーが出た場合に多い原因:

- **\`error[E0432]: unresolved import 'crate::types::MarginRatio'\`** — \`pub use\` 行の typo（例: \`MarignRatio\`）が原因。型名を一字一句揃える。
- **\`error: ambiguous re-export\`** — 既存の \`pub use\` を拡張するつもりが、誤って下にもう 1 行足してしまった形だ。再エクスポートはすべて 1 つの \`pub use types::{...}\` ブロックに収める。Formatter もこの形を期待している。

## 設計の振り返り

このレッスンの load-bearing な決定は 3 つ:

1. **\`MarginRatio(pub i64)\` を newtype にする。\`type MarginRatio = i64\` ではない。** Alias はゼロコストだがゼロセーフティ — コンパイラから見れば同じ型だ。Newtype はランタイム上もゼロコスト（単一フィールド構造体はフィールドと同じレイアウト）でありながら、コンパイラが強制する本物の区別を生む。**値が「このビットパターンの整数」を超えた意味を運ぶときは、迷わず newtype を使う。**

2. **\`MarginHealth\` が 4 variants なのは、エンジンが下流で 3 つの判断をするからだ。** 各 variant が、その 3 つの判断の組み合わせにきれいに対応する。5 番目の variant（「ImminentlyLiquidatable」?「RecentlyClosed」?）が必要になるのは 4 番目の判断が現れたときで、それまでは 4 が正しい数になる。**Enum のカーディナリティは、それが許可する action のカーディナリティに揃える。**

3. **\`MarginHealth\` に \`PartialOrd\` を入れない。** Variants は自然に順序を成すが、enum で順序比較を許すと具体性を失う（\`health > AtRisk\` は *どの* 「AtRisk より悪い」か言わない — \`Liquidatable\` なのか \`Underwater\` なのか?）。明示的な \`matches!\` パターンならすべての分岐に対象 variants を綴ることになり、\`rustc -W non_exhaustive_omitted_patterns\` が忘れたケースを拾ってくれる。**比較可能な enum はたいていコード臭。まず \`matches!\` に手を伸ばす。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L2 の後:
- **types.rs** は Stage 10a の types.rs の 1 行目から \`MarginHealth::Underwater\` までと一致する。L1 で書いた \`MARGIN_SCALE\` + \`LiquidationParams\` に、新たに \`MarginRatio\` と \`MarginHealth\` を載せた形だ。次に来る 2 型（\`AccountSnapshot\`、\`CloseOrderSpec\`）は L3 で扱う。
- **lib.rs** は Stage 10a の lib.rs から \`compute\` モジュールと追加 6 件の再エクスポートを除いた状態と一致する。これらは L4-L7 で揃える。

## よくある質問

**Q1: なぜ \`MarginRatio\` は \`Display\` を実装しないのか?**

実装してもよい — 値は単に bps 単位の i64 だ。実装していない理由は、production のコードパスのどこも \`MarginRatio\` をエンドユーザー向け表示として直接フォーマットしないからだ。bridge レイヤーが \`.0\` を取り出し、既知のスケールに合わせて render する（\`"{}%"\`、\`ratio.0 / 100\`）。ここで \`Display\` を加えると、呼び出し側が \`MarginRatio\` を生の整数のままログに出す癖を呼び込み、bps スケールが見えなくなる。**Trait は必要とするレイヤーで実装する。**

**Q2: \`MarginHealth\` を \`u8\` にしてメモリを節約できないか?**

Payload を持たない 4 variants の場合、Rust の enum レイアウトはすでに \`u8\` に収まっている — \`size_of::<MarginHealth>() == 1\`。コンパイラが最小の discriminant を選ぶ。生の \`u8\` に切り替えれば、名前付き variants と \`match\` の exhaustiveness check を失うだけで、得るものは何もない。

**Q3: Variant に payload を持たせるべきか（例: \`AtRisk { headroom_bps: u32 }\`）?**

魅力的に見えるが時期尚早だ。下流の consumer（Stage 10c scanner、ダッシュボード）は、必要な情報を背後の margin_ratio から再導出する。Variant payload を持たせると構築コストが乗り、\`match\` の使い勝手も複雑になる。**すべての consumer が payload から利益を得るのでない限り、enum は payload なしに保つ。**

**Q4: \`Liquidatable\` が「close + 場合によって deficit absorb」を含意できるなら、なぜ \`Underwater\` を別 variant にするのか?**

bridge が両ケースで *別の挙動* を取らねばならないからだ。\`Liquidatable\` のアカウントは close order を 1 つ生成し、engine は fee と残額を通常通り settle する。\`Underwater\` のアカウントは close order に加えて、bridge が atomic に適用しなければならない credit-to-insurance-fund エントリも生成する。Variants を分けておけば、ケースの違いを型レベルまで押し上げられ、網羅的な \`match\` がそれを拾ってくれる。マージすると、判別が bridge 内のランタイム分岐に押し下げられ、見落としやすくなる。**State machine は、自分が trigger する action を反映した variants から利益を得る。**

**Q5: \`margin_health\` は flat なポジションに対して \`Option<MarginHealth>\` を返すべきか?**

いいえ。flat なポジションは \`MarginHealth::Safe\` を返す（notional がなく、満たすべき margin 要件もないため）。\`Option\` で包んでしまうと、すべての呼び出し側に \`None\` を明示処理させることになる — 「flat = safe」は曖昧さがないのに、だ。**型システムですでに扱える状態をわざわざ \`Option\` で表現しない。**

## 次のレッスン (L3)

L3 では、すべての margin 関数の入力となる \`AccountSnapshot\` と、エンジンが bridge へ渡す出力となる \`CloseOrderSpec\` を加え、types モジュールを閉じる。L3 を終えれば types モジュールは完成だ。L4 からは compute モジュールに移り、\`notional_value\` から書き始める。
`,
                },
                {
                  title: "レッスン 3 — AccountSnapshot + CloseOrderSpec — エンジンの入出力型",
                  slug: "openhl-liquidation-snapshot-spec-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン 3 — \`AccountSnapshot\` + \`CloseOrderSpec\` — エンジンの入出力型

## ゴール

このレッスンで掴む概念:

- **liquidation が \`funding::Position\` を再利用せず、独自の \`AccountSnapshot\` を定義する理由。** \`Position\` は \`(account, size)\` を運ぶが、liquidation は \`(account, size, avg_entry, collateral)\` を要求する。2 つの crate、2 つの snapshot 型、cross-coupling なし。Bridge レイヤーがそれぞれを自分の台帳から組み立てる。
- **funding と共有する「snapshot」の規律。** エンジンは呼び出し側が組み立てた snapshot を consume する。エンジン自身は可変なアカウント state を所有しない。proptest が determinism のバグを捕まえられるのは、この I/O-free な純粋さがあるからだ。
- **\`CloseOrderSpec\` に price フィールドを持たせない理由。** Liquidation は常に market で close する。エンジンは価格を選ばない。Bridge がこれを \`clob::Action::SubmitMarket\` に変換し、板が次に利用可能な価格で約定する。
- **\`Side\` と \`Qty\` を liquidation-local の新型ではなく \`openhl_clob\` から借りる理由。** matching engine が話すのと同じ概念だ。2 つの crate に並行する \`Side\` enum を 2 つ置けば、いずれ drift する翻訳サーフェスが生まれてしまう。

確認:

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

…がコンパイルされる。本レッスン後、\`types\` モジュールは完成する。

具体的な変更:

- **\`src/types.rs\`** — 既存の \`MarginHealth\` enum の下に \`AccountSnapshot\` と \`CloseOrderSpec\` を追記する。L1 や L2 で書いた部分には触らない。
- **\`src/lib.rs\`** — \`pub use types::{...}\` 再エクスポートに \`AccountSnapshot\` と \`CloseOrderSpec\` を加える。

L3 にもテストはない。どちらの新しい構造体も受動的なデータコンテナだからだ。L4 で \`compute\` モジュールに着手し、そこで最初の挙動テスト（\`notional_value\`）が登場する。

## おさらい

L2 の後:
- \`types.rs\` には \`MARGIN_SCALE\` と \`LiquidationParams\`（L1）に加え、\`MarginRatio\` と \`MarginHealth\`（L2）が並んでいる。
- \`lib.rs\` は 4 つの名前 — \`LiquidationParams\`、\`MarginHealth\`、\`MarginRatio\`、\`MARGIN_SCALE\` — を再エクスポートしている。
- \`cargo build -p openhl-liquidation\` が warning ゼロで pass する。

L3 では 2 つの **I/O 型**を加える。あらゆる margin 関数が consume する入力 \`AccountSnapshot\` と、エンジンが bridge に渡す出力 \`CloseOrderSpec\` だ。L3 を終えると types モジュールが完成し、Course 10 の Module 1 が閉じる。

## 計画

編集は 2 ファイル分、いずれも追記のみ:

1. **\`crates/liquidation/src/types.rs\` に \`AccountSnapshot\` を追記。** 4 フィールド、\`Copy\`-friendly。約定が積み重なる中で \`avg_entry\` を保つ責務が呼び出し側にあることを、doc コメントで明示する。
2. **\`CloseOrderSpec\` をその下に追記。** 3 フィールド、price フィールドなし。doc コメントで bridge を消費者として指名する。
3. **\`crates/liquidation/src/lib.rs\` を更新。** \`pub use types::{...}\` 行を拡張する。

> 🛑 **予測。** スクロール前に: liquidation はアカウントごとに unrealized PnL を計算する必要がある。式は \`(mark - entry) * size\` だ。**\`funding::Position\` から得られない入力は何か、そしてなぜ funding ではそれが要らなかったのか?** ヒント: funding の式は \`size * mark * rate\`。ここから何が抜けているかを比べる。

（答え: **\`avg_entry\`（PnL の項を計算するため）と \`collateral\`（equity を計算するため）の 2 つだ。** Funding の式に \`entry\` 係数は出てこない — ポジションがどこで開かれたかに関係なく、現在の mark に rate を掛けてスケールするだけだ。Funding はまた collateral を読まない。Funding が emit する settlement delta は bridge レイヤーで balance に適用され、balance 台帳の管理は bridge 側に閉じている。Liquidation の仕事は、\`collateral + unrealized PnL\` がしきい値を下回ったかを *測る* ことなので、両方の値が手元に揃っている必要がある。仕事が違えば snapshot も違う、ということだ。）

L3 で完成する \`types\` モジュールが、エンジン全体に対して **どんな入力を受け、どんな出力を返すか**を 1 枚で見ると、Module 1 (型) から Module 2 (純粋計算) へ向かう接続点がはっきりする:

\`\`\`
                    [ 上流: bridge / clearing レイヤー (台帳の所有者) ]
                              │
                              │ tick ごとに各アカウントの
                              │ 台帳から snapshot を構築
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ 入力: AccountSnapshot { account, position_size, avg_entry,          │
   │                         collateral }                                │
   │   ※ 不変・read-only・Copy。L3 で確定。                                │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ ★ liquidation エンジン (Module 2-4 で実装するすべて)                 │
   │                                                                     │
   │   L4: notional_value / unrealized_pnl  (純粋計算)                    │
   │   L5: account_equity / margin_ratio   (純粋計算)                    │
   │   L6: margin_health                    (分類: 4 状態 enum)           │
   │   L7: close_order_spec                 (Liquidatable/Underwater 用)  │
   │   ↑↑ L1-L2 の定数・型 (MARGIN_SCALE, LiquidationParams,             │
   │                       MarginRatio, MarginHealth) も全レイヤーで参照 │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ 出力: CloseOrderSpec { account, side, qty }                         │
   │   ※ price なし (market order) / Liquidatable・Underwater アカウントに  │
   │      対してのみ emit。L3 で確定。                                    │
   │   さらに Module 3-4 で InsuranceFundDelta も並行して emit する        │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [ 下流: bridge → matching engine (CLOB) ]
                              ・close order を SubmitMarket に変換して submit
                              ・Underwater 分は insurance fund を credit/debit
\`\`\`

ポイントは 2 つ: (a) **L3 で完成する 2 つの型 (\`AccountSnapshot\` 入力 / \`CloseOrderSpec\` 出力) が、エンジンと外界の唯一の接触面になる** — エンジン本体は L4 以降で書くが、その関数たちは型シグネチャの上ではすべて「AccountSnapshot を受けて何かを返す」「最終的に CloseOrderSpec を emit する」という形に揃う。(b) **入力 (snapshot) は不変、出力 (spec) も不変** — エンジンは台帳を更新しない、台帳の所有権は完全に bridge 側に残る。これが L0 で予告した「**リスク計算専用の不変な snapshot 型を分離して依存関係をクリーンに保つ**」の具体形だ。

## 手を動かす walk-through

### Step 1: \`src/types.rs\` に \`AccountSnapshot\` を追記

\`crates/liquidation/src/types.rs\` を開く。\`MarginHealth\` enum を閉じる \`}\` の後に追記:

\`\`\`rust
/// Snapshot of one account's perpetual-market state, assembled by the
/// bridge layer before invoking the liquidation engine. Same "snapshot"
/// model as \`openhl_funding::Position\`: the engine treats this as a
/// per-tick read-only view, never mutates it.
///
/// \`avg_entry\` is the volume-weighted average price at which the account
/// opened its current net position. The owning layer (vault / clearing)
/// is responsible for maintaining this across fills.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AccountSnapshot {
    pub account: AccountId,
    pub position_size: PositionSize,
    pub avg_entry: MarkPrice,
    pub collateral: Notional,
}
\`\`\`

この 10 行で気づきたい点が 5 つ:

1. **4 フィールド、すべて \`Copy\` に乗る。** \`AccountId\`（\`u64\`）、\`PositionSize\`（\`i64\`）、\`MarkPrice\`（\`u64\`）、\`Notional\`（\`i64\`）。スタックサイズ合計で 32 バイトだ。エンジンはほとんどの呼び出しで snapshot を参照渡し（\`&AccountSnapshot\`）するが、\`Copy\` を derive してあるおかげで、呼び出し側が誤って \`&\` を落としても borrow checker と戦わずに済む。

2. **\`avg_entry\` は \`MarkPrice\` 型で持つ。新しい \`EntryPrice\` 型は作らない。** ポジションが開かれた価格と、現在ポジションを測っている mark price は、同じ unit-of-account に住む。別途 \`EntryPrice\` newtype を作ると、すべての PnL 計算サイトで変換が必要になり、意味的な利益は何もない。**2 つのフィールドが同じ物理量を測るなら、型を共有する。**

3. **\`collateral: Notional\` は signed にしている。** Collateral は *預け入れ* 資金として慣例的に非負だが、\`Notional\`（signed）に揃えるのは \`account_equity = collateral + unrealized_pnl\` を signed sum のまま流したいからだ。\`collateral\` を unsigned にすると、すべての equity 計算で \`as i64\` キャストが入り込む。**境界で変換し、計算は 1 つの signed 型で揃える。これにより、キャスト漏れや signed / unsigned の混在に伴う静かなランタイムバグ (アンダーフロー、\`as\` キャストでの最上位ビット化け、減算で負になるはずの値が大きな正の数に化けるなど) を、コンパイル時の型不一致として根絶できる**。L4 の符号トリック (\`(mark − entry) × size\` を 4 象限すべて branchless で正しく計算する) は、まさにこの「計算経路をすべて signed で統一する」前提の上に成り立つ。

4. **\`pub\` フィールド、コンストラクタ関数なし。** L1 の \`LiquidationParams\` と同じ慣例だ。透明な構造体で、カプセル化不変量はない。Bridge レイヤーは \`AccountSnapshot { account: …, position_size: …, … }\` を直接組み立てる。\`AccountSnapshot::new()\` を置かないのは、コンストラクタが強制すべき不変量がないからだ。

5. **Doc コメントが呼び出し側の契約を明示する。** "*The owning layer (vault / clearing) is responsible for maintaining this across fills.*" この 1 文に \`avg_entry\` 不変量がまとまっている — liquidation は fill を track しないし、entry を再計算しないし、partial close を reconcile もしない。それらの責務は 1 つ上のレイヤーが負う。**Crate doc は *この* crate が保証することを書く。呼び出し側に要求することは、型の doc コメントに書く。**

> 🛑 **やりがちな勘違い。** 「\`AccountSnapshot\` を \`openhl-funding\` 側に置いて、両 crate が同じ型を使えるようにしたほうがよいのでは?」 **そうではない。funding は \`avg_entry\` も \`collateral\` も必要としない。** これらを \`funding::Position\` に足せば funding snapshot が無駄に膨らみ、bridge は funding が無視するフィールドにまで値を入れる羽目になる。2 つの crate、2 つの snapshot 型 — これが正しい形だ。Bridge が正典の account ledger を保持し、tick ごとに 2 つの異なる snapshot view を生成するコストは安い。

### Step 2: \`src/types.rs\` に \`CloseOrderSpec\` を追記

引き続き \`src/types.rs\` の中で、\`AccountSnapshot\` を閉じる \`}\` の後に追記する:

\`\`\`rust
/// Specification for a single liquidation close order, generated by the
/// engine and consumed by the bridge layer. The bridge encodes this as
/// \`openhl_clob::Action::SubmitMarket\` and routes it through the matching
/// engine.
///
/// Always a market order — liquidation accepts any available price.
/// Always the opposite side of the position: a long position closes via
/// \`Side::Sell\`, a short via \`Side::Buy\`. Quantity is the absolute value
/// of the position size.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CloseOrderSpec {
    pub account: AccountId,
    pub side: Side,
    pub qty: Qty,
}
\`\`\`

気づきたい点が 3 つ:

1. **\`price\` フィールドはない。** Liquidation は価格を選ばない。エンジンは market order の仕様を組み立てるところまでで、あとは matching engine が板に存在する深さで約定する。Stage 10c で \`AccountSnapshot\` のスライスを順に辿り、\`Liquidatable\` か \`Underwater\` のアカウントごとに \`CloseOrderSpec\` を 1 つずつ emit する流れになる。どれも limit を持たない。

2. **\`side: Side\` は \`openhl_clob::Side\` を再利用する。** Matching engine は \`Side::{Buy, Sell}\` で話す。\`liquidation::Side\` を別に定義して bridge で変換するようにすると、**将来的に型の乖離 (drift) を引き起こす原因となる、不要な翻訳レイヤー (\`impl From\` などの変換ロジック) を導入してしまう** — たとえば片方の crate に 3 番目の side variant (\`Closing\` など) を足したのにもう片方に足し忘れる、\`Buy ↔ Sell\` のマッピングを 1 箇所でうっかり反転させる、といった事故が静かに発生する。**1 つの enum、1 つの真実の源泉。** 境界を跨ぐメッセージの語彙 (\`Side\` / \`Qty\`) は crate 境界に関係なく共通化して、永続的な型変換処理のコスト (調整税) を払い続ける羽目にならないようにする。

3. **\`qty: Qty\` は \`openhl_clob::Qty(u64)\` を再利用する。** Doc コメントが言うとおり「position size の絶対値」だ。\`PositionSize\` は \`i64\`（signed）だが、close する数量は常に正の値になる。変換（\`Qty(position_size.0.unsigned_abs())\`）は L7 の \`compute::close_order_spec\` で行う。ここでは *出力型* が unsigned であることに commit するだけにとどめる。

> 🛑 **予測。** スクロール前に: \`CloseOrderSpec\` は、close が起きた *理由*（Liquidatable か Underwater か）を表す \`Reason\` フィールドを持っていない。これは持たせるべきか? ヒント: spec を consume するのは誰で、その消費者がどんな情報を必要とするかを考える。

（答え: **持たせない。** Bridge は spec を consume して 2 つのことをする — close order を submit すること、そして Underwater アカウントに対しては insurance fund を credit することだ。エンジンはどちらも signal する。Stage 10c の scanner は \`CloseOrderSpec\` を emit するのと同時に、Underwater だったアカウントに対して \`InsuranceFundDelta\` も emit する。\`CloseOrderSpec\` に \`Reason\` フィールドを足すと、spec と insurance-fund delta のあいだで signal が二重化され、将来のリファクタリングが両者を乖離させうる。**同じ事実を 2 箇所に書かない。上流の出力を真実の源泉として、下流の consumer は必要なものだけを運ぶ。**）

### Step 3: \`src/lib.rs\` を更新

\`crates/liquidation/src/lib.rs\` を開き、\`pub use types::{...}\` 行を拡張する。元:

\`\`\`rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
\`\`\`

更新後:

\`\`\`rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

新しい名前が 2 つ加わった — \`AccountSnapshot\` と \`CloseOrderSpec\` だ。アルファベット順なので \`AccountSnapshot\` が先頭に来て、その次に \`CloseOrderSpec\`、残りはこれまでと同じ並びになる。項目数が 5 を超えたあたりから行が縦に展開し、次回保存時に rustfmt が 1 行 1 名前のブロックへ整形する（追記を続ければ、の話だ）。

### Step 4: コンパイル

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

Warning も error もゼロ。Liquidation crate の \`types\` モジュールはここで完成だ。

エラーが出た場合に多い原因:

- **\`error[E0432]: unresolved import 'openhl_clob::Qty'\`** — \`types.rs\` 冒頭の import 行はすでに \`Qty\` を名指しているはずだ（L1 の types.rs scaffold で加えてある）。発火するのは import を削ってしまった場合に限る。出たときは、L1 時点の冒頭行が依然として \`use openhl_clob::{AccountId, Qty, Side};\` と \`use openhl_funding::{MarkPrice, Notional, PositionSize};\` のままになっているか確認する — この import が L2 / L3 の両方をカバーする。
- **\`error: cannot find type 'Notional'\`** — 根本原因は同じだ。\`use openhl_funding::{…}\` 行に \`Notional\` が含まれているかを確認する。

## 設計の振り返り

このレッスンの load-bearing な決定は 3 つ:

1. **\`AccountSnapshot\` は liquidation-local に閉じる。\`openhl-funding\` と共有型にはしない。** 2 つの crate は仕事が違う — funding は連続的な rate 駆動のデルタを settle し、liquidation は離散的な margin イベントを classify する。snapshot 型を強制的に共有させると、両側で bridge のデータ配管まで結合してしまう。**関連はあるが必要なものが違う 2 つの crate は、2 つの snapshot 型に値する。**

2. **\`CloseOrderSpec\` は price を運ばない。** エンジンの責任は close するか *否か* を決めることに尽きる。*いくらで* close するかはエンジンの仕事ではない。Bridge レイヤーが spec を market order に翻訳し、matching engine が存在する深さで約定する。**価格を選ぶメカニズムは、アクションを決める policy レイヤーの下のレイヤーに住む。**

3. **\`Side\` と \`Qty\` は \`openhl_clob\` から借りる。並行する liquidation-local 型は作らない。** 2 つの crate がメッセージを交換するなら、語彙となる型は同じものを共有すべきだ。\`Side\` enum を 2 つ持つということは、境界で \`impl From\` ブロックを 2 つ抱えるということで、永続的に調整税を払い続ける羽目になる。**境界の型は共有し、内部の型だけを特殊化する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L3 の後:
- **types.rs** は **Stage 10a の types.rs と byte-for-byte で完全一致する**。Course 10 の Module 1 はこの types モジュールをそのまま ship する。
- **lib.rs** はまだ \`pub mod compute;\` と、compute まわりの再エクスポートが揃っていない。これらは L4-L7 で順に加える。

## よくある質問

**Q1: \`AccountSnapshot\` を position-type trait に対する generic にして、funding と liquidation が抽象的な snapshot を共有できないか?**

できる、ただし時期尚早だ。両 crate ともに、必要なフィールドが 1 ページに収まる規模に留まっている。抽象的な \`Snapshot<P: PositionLike>\` trait を導入すると、bridge が操作する必要のない型機構が増えてしまう。**crate ごとに具体型を持ち、bridge が翻訳するほうが、読むのも refactor するのも安く済む。**

**Q2: なぜ \`avg_entry\` は専用の \`EntryPrice\` newtype ではなく \`MarkPrice\` を使うのか?**

ポジションが開かれた価格と、現在ポジションを測っている価格は、同じ単位だからだ。スケールも、真実の源泉も同じ（慣例上、matching engine の last fill price）。\`MarkPrice(u64)\` と並行して \`EntryPrice(u64)\` を立てると、すべての PnL サイトで変換が要る。**2 つの値が単位を共有するなら、型も共有する。**

**Q3: \`collateral\` は負になり得るか?**

エンジンの目線では、ならない — *預けられた* collateral は常に非負だ。\`Notional\` を signed にしている理由は別にある。第 1 に、funding が settlement delta にこの型を使い、デルタは *負になり得る* こと。第 2 に、中間 equity 計算 \`collateral + unrealized_pnl\` の結果が signed になること。\`collateral\` 自体を unsigned にすると、すべての equity サイトでキャストが入ってくる。**上流は signed のまま演算し、範囲チェックは境界で行う。**

**Q4: \`CloseOrderSpec\` に上流の文脈用として \`bridge_metadata: Bytes\` フィールドを持たせるべきか?**

いいえ。Stage 10c は \`CloseOrderSpec\` をエンベロープなしでそのまま bridge に渡す。Close を trigger と関連付けたい局面（監査ログ、telemetry）でも、bridge は spec の外側で \`(snapshot.account, current_block_height)\` を使えば足りる。**下流の機能のために上流の型を膨らませない。**

**Q5: なぜ両構造体が \`Copy\` なのか?**

安価で便利だからだ。\`AccountSnapshot\` は 32 バイト、\`CloseOrderSpec\` は 24 バイトで、このサイズなら Copy は実質タダ。Copy が乗っていないと、2 つ目の参照が欲しいたびに呼び出し側で clone することになる。**小さな Plain-Old-Data 型は \`Copy\` にする。\`Clone\` に手を伸ばすのは、所有権セマンティクスが本当に意味を持つときだけだ。**

## 次のレッスン (L4)

L4 で \`compute\` モジュールが始まる。最初の 2 関数 — \`notional_value\` と \`unrealized_pnl\` — が、liquidation crate にとって最初の挙動テストを呼び込む。同じコードパスがロング・ショートいずれのポジションに対しても正しい符号を生み出す signed-multiplication のトリックを見ていく。さらに、network-pathological な入力に対して乗算を i64 オーバーフローから守るために i128 中間値を経由させる規律も改めて確認する。
`,
                },
              ],
            },
          },
          {
            title: "純粋な compute",
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: "レッスン 4 — notional_value + unrealized_pnl — signed-multiplication のトリック",
                  slug: "openhl-liquidation-notional-pnl-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン 4 — \`notional_value\` + \`unrealized_pnl\` — signed-multiplication のトリック

## ゴール

このレッスンで掴む概念:

- **\`notional_value\` は \`u64\`、\`unrealized_pnl\` は \`i64\`。** Notional exposure は \`|size| × mark\` で、常に非負。PnL は \`mark − entry\` が両側に振れるので signed。この差を返り型で示しておけば、呼び出し側で符号を取り違えるバグはコンパイラが捕まえてくれる。
- **\`i64\` から magnitude が欲しいなら \`abs()\` ではなく \`unsigned_abs()\` を使う。** \`i64::MIN.abs()\` はオーバーフローする（正の \`i64::MIN\` は表現できないため）。\`unsigned_abs()\` は \`u64\` を返すので panic しない。Signed integer から magnitude を取り出すときは、迷わずこちらを選ぶ。
- **分岐なしで long / short 両方を捌く signed-multiplication のトリック。** \`size\` を signed のまま保ち \`(mark − entry) × size\` を計算すれば、4 通りの符号の組み合わせがすべて正しい PnL に自然に着地する。\`if side == Long\` は一度も書かない。
- **i128 中間値の規律。** まず符号を保ったまま減算（\`i128::from(mark.0) − i128::from(entry.0)\`）、次にオーバーフローしない積、最後に \`i64\` へ saturate して戻す。Funding の \`compute_premium\` と同じ形だ。
- **\`saturate_i128_to_i64\` という load-bearing なヘルパー。** Network-pathological な入力で積が \`i64::MAX\` を超えうる場面は、いつか必ず訪れる。そのとき panic ではなく saturate する、という選択がここで効いてくる。

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 8 テストが pass する（\`notional_value\` 用 3 つ + \`unrealized_pnl\` 用 5 つ）。

具体的な変更:

- **\`crates/liquidation/src/compute.rs\` を新規作成。** このファイルはまだ存在しない。モジュール doc、import、公開関数 2 つ、private ヘルパー 1 つ、unit test 8 個を載せた \`#[cfg(test)]\` ブロックを、一気に流し込む。
- **\`src/lib.rs\` を更新。** \`pub mod compute;\` を追加し、re-export に \`notional_value\` と \`unrealized_pnl\` を足す。

L4 は本クレートで初めてテストが走るレッスンだ。ここから L8（\`close_order_spec\`、Stage 10a の挙動の最後）まで、各レッスンがテストを積み増していく。

## おさらい

L3 の後:
- Types モジュールは Stage 10a に対して byte-for-byte 完成している — \`MARGIN_SCALE\`、\`LiquidationParams\`、\`MarginRatio\`、\`MarginHealth\`、\`AccountSnapshot\`、\`CloseOrderSpec\`。
- Compute モジュールはまだ存在しない。
- \`cargo build\` は通る。\`cargo test\` は走るテストがゼロ件だ。

L4 で compute モジュールを作る。最初の 2 関数が答えるのは「このアカウントは *いま* どう見えるか」 — notional exposure と unrealized PnL の 2 つだ。L5 ではその上に equity と margin ratio を積み上げる。

## 計画

編集は 2 つ:

1. **\`crates/liquidation/src/compute.rs\` を新規作成。** モジュール doc、L1-L3 から \`AccountSnapshot\` と \`MarkPrice\` を import する \`use\` 文、\`notional_value\`、\`unrealized_pnl\`、private な \`saturate_i128_to_i64\` ヘルパー、\`#[cfg(test)]\` テストブロック（notional 3 個 + PnL 5 個）まで。
2. **\`src/lib.rs\` を更新。** \`pub mod compute;\` を追加し、公開 re-export に新関数 2 つを足す。

> 🛑 **予測。** スクロール前に考えてほしい。\`unrealized_pnl\` は long が利益を出しているときも short が利益を出しているときも *正* の値を返してほしい。素朴に書くとこうなる:
>
> \`\`\`rust
> if size > 0 {  // long
>     (mark - entry) * size.abs()
> } else {       // short
>     (entry - mark) * size.abs()
> }
> \`\`\`
>
> これでも動くが、分岐がある。**実は、4 通りの符号の組み合わせをすべて \`if\` なしで正しく捌く単一の式がある。** 何か。ヒント: \`(mark - entry) * size\` の中で \`size\` 自身が long/short の符号を運んでいたら、計算がどう転ぶか考えてみる。

（答え: **\`(mark − entry) × size\`、ただし \`size\` は signed の \`i64\`。** 4 ケースを順に追ってみる:
- Long（\`size = +10\`）、mark > entry: 正 × 正 = 正の profit ✓
- Long（\`size = +10\`）、mark < entry: 負 × 正 = 負の loss ✓
- Short（\`size = −10\`）、mark > entry: 正 × 負 = 負の loss ✓
- Short（\`size = −10\`）、mark < entry: 負 × 負 = 正の profit ✓

どのケースでも符号が正しく着地する。**分岐がない。コードパスが 2 本に分かれて別々にテストを要求することもない。片方の分岐だけ「直して」もう一方を放置するリスクもない。** \`PositionSize\` を signed にしたのは、まさにこのためだ — 型が long/short の区別を運んでくれれば、演算側がそれを運ぶ必要はなくなる。）

\`(mark − entry) × size\` の 4 象限を 1 枚のマトリクスに落とすと、なぜこの 1 行が \`if\` 分岐 4 本ぶんの仕事を吸収しているのかが視覚で見える:

\`\`\`
                          mark > entry              mark < entry
                       (上昇 → diff = 正値)        (下落 → diff = 負値)
                       ────────────────────       ────────────────────
   Long  (size = +)     (+) × (+) = +              (−) × (+) = −
                       ◤ profit ✓                  ◤ loss ✓
                       例: (110−100) × +10 = +100  例: (90−100) × +10 = −100
   ─────────────────────────────────────────────────────────────────────
   Short (size = −)     (+) × (−) = −              (−) × (−) = +
                       ◤ loss ✓                    ◤ profit ✓
                       例: (110−100) × −10 = −100  例: (90−100) × −10 = +100
\`\`\`

ポイントは「**\`size\` の符号が long/short の方向情報を運び、\`(mark − entry)\` の符号が値動きの方向情報を運ぶ → 積を取った瞬間に 2 つの方向情報が掛け合わさり、正しい profit/loss の符号が機械的に出てくる**」こと。\`if size > 0 { ... } else { ... }\` の分岐版では、開発者が両方の case を頭の中で再構築しながら書くため、片側だけバグが残るパターンが頻発する。signed multiplication は **その再構築を型システム + 算術ルールに完全に外注している**。

## 手を動かす walk-through

### Step 1: \`src/compute.rs\` を作成

\`crates/liquidation/src/compute.rs\` を新規作成する。初期内容:

\`\`\`rust
//! Pure liquidation math.
//!
//! Six building blocks, all stateless:
//!   - [\`notional_value\`] — \`|size| × mark\`, the exposure in quote units
//!   - [\`unrealized_pnl\`] — \`(mark − avg_entry) × size\`, signed
//!   - [\`account_equity\`] — \`collateral + unrealized_pnl\`, can be negative
//!   - [\`margin_ratio\`] — \`equity / notional\`, scaled by [\`MARGIN_SCALE\`]
//!   - [\`margin_health\`] — classify the account against the params
//!   - [\`close_order_spec\`] — generate the close order for a liquidatable
//!     account
//!
//! Each function is deterministic and saturates on overflow rather than
//! wrapping or panicking. Validators that disagree about a margin
//! classification fork the chain, so the failure mode at network-
//! pathological inputs has to be bounded behavior.

use crate::types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
use openhl_clob::{Qty, Side};
use openhl_funding::MarkPrice;
\`\`\`

モジュール doc に挙げているのは 6 関数だが、L4 で着地するのはそのうちの 2 つ。残り 4 つ（\`account_equity\`、\`margin_ratio\`、\`margin_health\`、\`close_order_spec\`）は L5–L7 で順に追加していく。6 つ全部をいま列挙しておけば、レッスンごとにモジュール doc を編集し直さなくて済む。文脈なしでここに辿り着いた読者にとっても、ロードマップとして機能する。

> 🛑 **やりがちな勘違い。** 「L4 で使うのは \`AccountSnapshot\` と \`MarkPrice\` だけだ。なぜ \`CloseOrderSpec\`、\`Side\`、\`Qty\`、\`LiquidationParams\`、\`MarginHealth\`、\`MarginRatio\` まで import するのか?」 **後のレッスンが全部使うからだ。** L4 でまとめて import を入れておけば、各レッスンの diff は「今回追加する関数」だけに絞れる。L5 以降に到達するまで Rust は unused import の warning を出し続けるが、Funding L1 で後から来る型の rustdoc warning を許容したのと同じ理屈で、ここでも許容する。代わりに \`use\` 行を L4–L7 で 6 回いじる選択肢は busywork でしかなく、各レッスンが実際に追加している部分を見えにくくしてしまう。

### Step 2: \`notional_value\` を追加

import の下に追加:

\`\`\`rust
/// Notional exposure of the account = \`|position_size| × mark\`, in quote
/// units. Returns \`0\` for a flat position (no exposure regardless of mark).
///
/// \`u64::saturating_mul\` clips at \`u64::MAX\` for network-pathological
/// \`position_size × mark\` products. Real deployments are bounded by upstream
/// position-size limits; the saturation here is the second line of defense.
#[must_use]
pub fn notional_value(snapshot: &AccountSnapshot, mark: MarkPrice) -> u64 {
    let abs_size = snapshot.position_size.0.unsigned_abs();
    abs_size.saturating_mul(mark.0)
}
\`\`\`

この 7 行の関数で押さえておく点が 3 つ:

1. **返り型は \`u64\`、\`i64\` ではない。** Notional は exposure の *magnitude* なので、常に非負だ。\`u64\` を返せば、呼び出し側が abs を取り忘れる可能性を型レベルで潰せる。Notional を signed な計算に流したい呼び出し側（L5 の \`margin_ratio\` の割り算など）は、呼び出しサイトで明示的に \`i64::from(notional_value(...))\` を書く。**変換は 1 行で済む。代わりに防げるのは、production まで生き残る silent な符号バグの群れだ。**

2. **\`snapshot.position_size.0.unsigned_abs()\` を使う。\`.abs()\` ではない。** \`i64::abs\` は \`i64\` を返すが、\`i64::MIN.abs()\` は safe Rust では未定義動作だ（debug では panic、release では wrap）。一方 \`unsigned_abs\` は \`u64\` を返し、\`i64::MIN\` を含むあらゆる入力に対してきちんと定義されている（\`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808\`）。**Signed integer の magnitude が必要なら、迷わず \`unsigned_abs\`。\`abs\` を使ってよいのは、値が \`MIN\` を取り得ないと確信できるときに限る。**

3. **\`u64::saturating_mul\` であって、\`u64::checked_mul\` ではない。** どちらもオーバーフローを検知するが、\`saturating_mul\` はオーバーフロー時に \`u64::MAX\` を返し、\`checked_mul\` は \`None\` を返す。\`Option<u64>\` を返してしまうと、L5 の \`margin_ratio\` を含むすべての呼び出し側が、*network-pathological な入力でしか起きない* \`None\` を扱うハメになる。Saturating なら、極端な入力に対しても — 数学的には間違っていても — 使える値を返す。どのみちその極端な入力では margin engine はそのアカウントを \`Liquidatable\` と分類するので、上流的な意味でも整合が取れる。**「値は極端だが境界内に収まっている」という保証が、「すべての呼び出しサイトに \`Option\` 型の伝播とボイラープレート (\`?\` / \`unwrap_or\` / 早期 return) を強いるコスト」を上回るとき、正しい failure mode は saturation だ。**

### Step 3: \`unrealized_pnl\` を追加

\`notional_value\` の下に追加:

\`\`\`rust
/// Unrealized PnL = \`(mark − avg_entry) × position_size\`, in quote units.
/// Positive = profit, negative = loss.
///
/// Sign convention follows the natural signed multiplication:
///   - Long position (size > 0) profits when \`mark > entry\` → positive
///   - Long position loses when \`mark < entry\` → negative
///   - Short position (size < 0) profits when \`mark < entry\` → negative
///     times negative is positive
///   - Flat position (size = 0) → 0
#[must_use]
pub fn unrealized_pnl(snapshot: &AccountSnapshot, mark: MarkPrice) -> i64 {
    // diff = mark − entry, in i128 to preserve sign on subtraction.
    let diff = i128::from(mark.0) - i128::from(snapshot.avg_entry.0);
    // pnl = diff × size, in i128 to absorb the product's full range.
    let pnl = diff.saturating_mul(i128::from(snapshot.position_size.0));
    saturate_i128_to_i64(pnl)
}
\`\`\`

押さえておく点が 4 つ:

1. **\`i128::from(mark.0) − i128::from(snapshot.avg_entry.0)\` を使う。\`(mark.0 as i64) − (snapshot.avg_entry.0 as i64)\` ではない。** \`mark\` も \`entry\` も \`u64\` だ。Rust では \`u64 − u64\` の結果が負になると panic する。先に \`i64\` にキャストしても、どちらかが \`i64::MAX\` を超えていれば最上位ビットが落ちてしまう。先に \`i128\` までアップキャストしてしまえば、フルレンジが保たれ、サプライズなしに signed の結果が得られる（負にもなれる）。**必要だと思うより一段広くアップキャストする — コストはゼロ、得られる安全性は大きい。**

2. **\`saturating_mul\` は \`i128\` 上で行う。** \`diff\` が \`u64::MAX\`（≈ 2⁶⁴）に近く、\`position_size\` が \`i64::MAX\`（≈ 2⁶³）に近ければ、積は ≈ 2¹²⁷ になる。これは \`i128\` の \`±2¹²⁷\` 範囲内には収まるが、極端な入力に対して \`saturating_mul\` を使うのは安価な保険だ。Funding と同じパターン。

3. **末尾で \`saturate_i128_to_i64(pnl)\` を呼ぶ。** 積を取った直後の PnL は i128 領域に居る可能性があるが、下流のエンジンは \`i64\` を使う。変換が失敗したとき panic ではなく saturate するためのヘルパーだ — funding と同じ規律。（ヘルパー定義は Step 4 で書く。）

4. **符号ルールを doc に明文化してある。** 4 ケースの列挙（「Long は mark > entry のとき profit」）は、レビュアーから「待って、これ short でも動くの?」と聞かれたときの正典的な参照になる。コードは construction で正しいが、doc は *なぜ* 正しいかを書く — 読者が毎回頭の中で辿り直さなくて済むように。

> 🛑 **やりがちな勘違い。** 「いっそ \`(mark.0 as i64 − entry.0 as i64) × size\` を直接書けばよいのでは?」 **問題が 3 つある。** (1) \`mark\` か \`entry\` が \`i64::MAX\` を超えると、キャストが silent に wrap する — 最上位ビットが符号ビットに化けてしまう。(2) 両方が i64 に収まっていても、片方が \`i64::MIN\` 近く、他方が正なら、i64 での減算がオーバーフローする。(3) 各オペランドが収まっていても、積 \`(mark − entry) × size\` が i64 を超えうる — \`i64::MAX\` サイズのポジションなら、わずか 1% の値動きでオーバーフローする。**\`as\` による暗黙的な型キャストは、Rust において最も代表的なバグの温床 (footgun) の 1 つであり、本レッスンが武装解除しに行く対象でもある。**

### Step 4: \`saturate_i128_to_i64\` ヘルパーを追加

\`unrealized_pnl\` の後に、private ヘルパーを追加:

\`\`\`rust
/// Saturating cast from \`i128\` to \`i64\`. Used wherever an intermediate
/// product can exceed \`i64::MAX\` at network-pathological inputs.
/// Saturation, not wrapping — see the module-doc note on why panicking
/// would be a worse failure mode.
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
\`\`\`

この 3 行のヘルパーで押さえておく点が 3 つ:

1. **\`pub\` を付けない。** これは \`compute.rs\` 内部の実装上の選択だ。公開 API はモジュール doc に挙げた 6 関数で、ヘルパーは本体をクリーンに保つために置いてある。**他モジュールの呼び出し側が本当に必要としない限り、ヘルパーは private のままにする。**

2. **\`i64::try_from(v).unwrap_or(...)\` の形。** \`try_from\` は値が収まらなければ \`Err\` を返す。\`unwrap_or\` の分岐が、符号によって saturation の行き先を選ぶ。\`v > 0\` なら大きすぎたので \`i64::MAX\` へ、\`v ≤ 0\` なら小さすぎたので \`i64::MIN\` へ。**演算は 3 行、判断は 1 つ、typo の余地もない。** **(※ \`v == 0\` のときは \`try_from\` が必ず \`Ok(0)\` を返すため、\`unwrap_or\` の \`else\` 分岐 (\`i64::MIN\`) は実行されない — つまりこの \`else\` は実質的に「\`v < 0\` かつ収まらなかったときの負方向 saturation」だけを拾っている。コードを読む人が \`v == 0 → i64::MIN\` の経路を一瞬気にしないよう、明示的に書いておく。)**

3. **ヘルパー自体には専用のテストを置かない。** その挙動は \`unrealized_pnl\` のテスト群（happy-path と境界の両方を突く）を通じて十分カバーされる。ヘルパー単体のテストを足してもただの重複になる。

### Step 5: テストを追加

ヘルパーの下に \`#[cfg(test)]\` ブロックを追加:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use openhl_clob::AccountId;
    use openhl_funding::{Notional, PositionSize};
    use proptest::prelude::*;

    fn snapshot(size: i64, entry: u64, collateral: i64) -> AccountSnapshot {
        AccountSnapshot {
            account: AccountId(42),
            position_size: PositionSize(size),
            avg_entry: MarkPrice(entry),
            collateral: Notional(collateral),
        }
    }

    // ─── notional_value ───────────────────────────────────────────

    #[test]
    fn notional_long() {
        let s = snapshot(10, 100, 0);
        assert_eq!(notional_value(&s, MarkPrice(120)), 10 * 120);
    }

    #[test]
    fn notional_short_uses_abs() {
        let s = snapshot(-10, 100, 0);
        assert_eq!(notional_value(&s, MarkPrice(120)), 10 * 120);
    }

    #[test]
    fn notional_flat_is_zero() {
        let s = snapshot(0, 100, 1_000);
        assert_eq!(notional_value(&s, MarkPrice(120)), 0);
    }

    // ─── unrealized_pnl ───────────────────────────────────────────

    #[test]
    fn pnl_long_profit() {
        // Long 10 @ entry 100; mark 120 → +200
        let s = snapshot(10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(120)), 200);
    }

    #[test]
    fn pnl_long_loss() {
        // Long 10 @ entry 100; mark 80 → −200
        let s = snapshot(10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(80)), -200);
    }

    #[test]
    fn pnl_short_profit() {
        // Short −10 @ entry 100; mark 80 → +200 (price down is good for short)
        let s = snapshot(-10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(80)), 200);
    }

    #[test]
    fn pnl_short_loss() {
        // Short −10 @ entry 100; mark 120 → −200
        let s = snapshot(-10, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(120)), -200);
    }

    #[test]
    fn pnl_flat_is_zero() {
        let s = snapshot(0, 100, 0);
        assert_eq!(unrealized_pnl(&s, MarkPrice(200)), 0);
    }
}
\`\`\`

テストブロックで押さえておく点が 4 つ:

1. **冒頭の \`snapshot()\` ヘルパー。** 整数引数を 3 つ取る（\`size\`、\`entry\`、\`collateral\`） — \`account\` は \`AccountId(42)\` にハードコード。8 個以上のテストにまたがって記述量を節約しつつ、各テストの *意味のある* 入力（size の符号、entry と mark の関係）は読み手の目に晒したまま保てる。**テスト fixture では、変化するものを表に出し、定数は隠す。**

2. **PnL 4 ケースが、予測コールアウトの 4 通りの符号の組み合わせと一対一に対応している。** \`pnl_long_profit\`、\`pnl_long_loss\`、\`pnl_short_profit\`、\`pnl_short_loss\`。加えて size がゼロのパスをカバーする \`pnl_flat_is_zero\`。これで到達可能な符号の組み合わせはすべてテスト下に入る。**符号の組み合わせの網羅性が load-bearing で、1 つでも漏らすと、将来のリファクタリングで side が silent に反転する余地が残る。**

3. **L4 ではまだ proptest を使わないのに \`use proptest::prelude::*;\` を書いておく。** L5 / L8 で proptest を足すとき、import はすでにここにある状態になる。\`compute.rs\` 本体の bulk import と同じ理屈で、境界で一度だけ書き、それまでの数レッスンは unused import の warning を許容する。

4. **テスト名は文として読める形にする。** \`pnl_long_profit\` は「PnL when long is in profit」と読める。テストが失敗したとき、出力で最初に目に入るのはテスト名だ — 本体を読まなくても何が壊れたか分かる程度には説明的にしておく。**\`fn test_1\` / \`fn test_2\` は CI のノイズだが、文の断片で名付けるなら CI のシグナルになる。**

### Step 6: \`src/lib.rs\` を更新

\`crates/liquidation/src/lib.rs\` を開く。\`pub mod compute;\` を追加し、re-export を拡張する。元:

\`\`\`rust
pub mod types;

pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

更新後:

\`\`\`rust
pub mod compute;
pub mod types;

pub use compute::{notional_value, unrealized_pnl};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

変更は 2 箇所:

1. **\`pub mod compute;\`** を \`pub mod types;\` の上に置く — アルファベット順、既存の慣例どおり。
2. **\`pub use compute::{notional_value, unrealized_pnl};\`** — 新しい re-export 行で、\`types\` の re-export とは別の行に分ける。モジュールごとに自分の行を持たせる方針だ。L5–L7 で関数が増えたら、この compute 側のリストを伸ばしていく。

### Step 7: テストを走らせる

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
running 8 tests
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok

test result: ok. 8 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**この 8 テストが、signed-multiplication のトリックが各符号の組み合わせで実際に動くことの証拠になる。** 将来あなた（あるいは別の貢献者）が \`unrealized_pnl\` をリファクタするとき、ここのテストが符号ルールを正直に保ってくれる。

よくあるエラー:

- **\`warning: unused import: ...\`** — まとめて入れた import に対する warning だ。想定どおりで、L7 までには消える。
- **\`error[E0599]: no method named 'unsigned_abs' found for type 'i64'\`** — Rust のバージョンが古い。\`unsigned_abs\` は Rust 1.51（2021）で安定化された。プロジェクトの \`rust-toolchain.toml\` で十分新しいバージョンが pin されているはずだ。
- **テストが \`attempt to multiply with overflow\` で落ちる。** debug ビルドで \`saturating_mul\` の代わりに \`*\` を書いてしまっている。置き換える。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **\`notional_value: u64\`、\`unrealized_pnl: i64\`。** 返り型が不変量を表現している。Notional は決して負にならない、PnL は両側に振れる。両者を混ぜたい呼び出し側のコードは、明示的に変換する（\`i64::from(notional)\`）。**呼び出しサイトでの 1 行の変換は、production まで生き残る silent な符号バグの群れより、はるかに安い。**

2. **分岐ではなく signed-multiplication の対称性で書く。** \`(mark − entry) × size\` は \`size\` が long/short の符号を運んでくれるので、4 通りの符号の組み合わせすべてが自然に解決する。分岐版（\`if size > 0 { ... } else { ... }\`）はコードパスを 2 本に分け、テスト予算を倍に増やし、「long 側を直して short 側を直し忘れる」というリファクタ時のバグリスクを残す。**演算が自然に扱えるケースは、型システムに運ばせる。**

3. **\`i64\` の magnitude には \`abs\` ではなく \`unsigned_abs\`。** \`i64::MIN.abs()\` は Rust の代表的な footgun だ — debug で panic、release で silently wrap する。\`unsigned_abs\` は \`u64\` を返し、すべての \`i64\` 入力に対して定義されている。**panic パスを持たないほうの演算を選ぶ。逆を選ぶと、debug でしか顕在化しない crash になり、release ビルドがそれを喜んで隠してしまう。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L4 の後:
- **compute.rs** は Stage 10a の \`compute.rs\` の最初の ~80 行と一致する — モジュール doc、import、\`notional_value\`、\`unrealized_pnl\`、ヘルパー、最初の 8 テストまで。それ以降（残り 4 関数とそのテスト、proptest 3 つ）は L5–L7 で着地する。
- **lib.rs** はまだ compute 側の追加 re-export 4 つ（\`account_equity\`、\`margin_ratio\`、\`margin_health\`、\`close_order_spec\`）を持たない。これらは順次到着する。

## よくある質問

**Q1: \`notional_value\` は \`u64\` を返し、\`mark\` も \`u64\` だ。積が \`u64\` をオーバーフローすることはないのか?**

ありうる。Network-pathological な入力（\`|size| × mark > 2⁶⁴\` になるような巨大ポジション）でだ。それを防ぐのが \`saturating_mul\`。現実的な市場ではまず起こらない — 取引所側のポジションサイズ制限が、notional を \`u64::MAX\` のはるか手前に抑えてくれる。Saturation は第二の防衛線で、第一の防衛線は上流の sanity check だ。

**Q2: なぜ \`saturate_i128_to_i64\` ヘルパーは private で、\`notional_value\` と \`unrealized_pnl\` は public なのか?**

ヘルパーは実装上の選択（saturating cast）にすぎない。公開関数 2 つはエンジンの契約の一部 — margin を計算するすべての呼び出しサイトが必要とする。**Public は「呼び出し側がこれに依存している」、Private は「内部でたまたまこういう形でやっている」という意味だ。** 将来のリファクタリングが \`saturate_i128_to_i64\` を \`checked_mul\` + \`Option\` 伝播に置き換えたとしても、呼び出し側は壊れない。

**Q3: signed-multiplication のトリックは、整数の極端値で誤った符号を出すことはないのか?**

数学的にはノー — 4 通りの符号の組み合わせは初等代数から導かれる。算術的にはイエス: i64 を（さらには i128 さえも）オーバーフローするような積は、真の結果の符号情報を失う。だからすべての中間積で \`i128::saturating_mul\` を使い、最後のキャストでも i128 値の符号に応じて \`i64::MAX\` か \`i64::MIN\` へ saturate する。**Saturation は magnitude を失うが、答えの *符号* は保つ。**

**Q4: \`unrealized_pnl\` は \`mark == 0\` のとき panic すべきではないか?**

ノー。\`mark = 0\` は不自然ではあるが未定義ではない。式 \`(0 − entry) × size = −entry × size\` は数学的にきちんと定義されているし、その結果ポジションが deeply underwater に分類されるのも正しい挙動だ。本番環境では、そもそも mark = 0 を *公開* しないようゼロ mark が reject される。万が一漏れてきても、エンジンは graceful に処理する。**Pure 関数は方針を決めない — 与えられた入力に対して計算するだけだ。**

**Q5: なぜ \`notional_value\` は \`&MarkPrice\` ではなく \`MarkPrice\` を値で受け取るのか?**

\`MarkPrice\` は \`Copy\` で、サイズは 8 byte（\`u64\`）だ。このサイズの \`Copy\` 型なら、値渡しのほうが参照渡しより安い — ポインタ間接参照もなく、aliasing の懸念もない。**型のサイズが大きくコピーが高価なとき、あるいは所有権セマンティクスに意味があるときに \`&\` へ手を伸ばす。プリミティブをラップした \`Copy\` newtype については、値渡しが正しいデフォルトだ。**

## 次のレッスン (L5)

L5 では \`account_equity\` と \`margin_ratio\` を追加する。そこで **Stage 10a で最も教育的に load-bearing な発見**に出会う: levered regime での \`margin_ratio\` の非単調性だ。読者はまず proptest を書く（「long に対して mark が上がれば margin_ratio も上がるはず」）。それが小さな入力群で失敗するのを目にする。なぜそれが「バグではなく本物の失敗」なのかを辿り、\`prop_assume!\` を使って実際に成り立つ不変量を表現するように proptest を refine する。学習者が margin math について最初に持っていたメンタルモデルが、いったん壊されてから再構築されるレッスンだ。
`,
                },
                {
                  title: "レッスン 5 — account_equity + margin_ratio — そして最初のメンタルモデルを壊す proptest",
                  slug: "openhl-liquidation-equity-ratio-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 60,
                  xpReward: 100,
                  content: `# レッスン 5 — \`account_equity\` + \`margin_ratio\` — そして最初のメンタルモデルを壊す proptest

## ゴール

このレッスンで掴む概念:

- **\`account_equity\` が \`i64\` を返し、負にもなりうる理由。** Equity は \`collateral + unrealized_pnl\` だ。PnL の項は、預けた collateral を突き抜けて不足を生みうる。エンジンはその不足を *測れる* 必要がある — そうでなければ、liquidation は正しいレバーを引けない。
- **\`margin_ratio\` が \`notional == 0\` を \`MarginRatio(i64::MAX)\` でガードする理由。** Flat ポジションは exposure ゼロなので、margin 要件もない。表現可能な最大の ratio を返すことが「無限に safe」を意味し、下流のあらゆる分類器がそれを自然に short-circuit できるようになる。
- **\`equity × MARGIN_SCALE / notional\` の i128 スケーリング規律。** 演算順序が効く。先に i128 で掛けておけば、高精度の分子のまま割り算を通過できる。\`i64\` で先に割ってしまうと、小さい ratio で精度が落ちる。
- **levered regime での \`margin_ratio\` の非単調性。** 最初の直感 — 「long に対して mark が上がれば margin_ratio も上がる」 — は \`collateral > entry × size\` の cash-heavy regime では **成り立たない**。Proptest がこれを捕まえる。対処は「関数をパッチする」ことではなく「不変量の表現を refine する」ことだ。
- **条件付き不変量を正しく書くための道具としての \`prop_assume!\`。** 不変量が入力空間の一部でしか成り立たないとき、\`prop_assume!\` は assertion を弱めるのではなく、proptest の入力をそのサブセットへフィルタする。
- **short と long で monotonicity の対称性が崩れる。** Short ポジションは mark に対して *無条件に* monotonic だが、long のほうはレバレッジが効いている条件下でしか monotonic にならない。微分の計算がその理由を説明してくれる。

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 16 テストが pass する（L4 の 8 + 新規 unit test 5 + proptest 3、proptest は各デフォルトの 256 ケース）。

具体的な変更:

- **\`src/compute.rs\`。** L4 の内容の下に、\`account_equity\`、\`margin_ratio\`、unit test 5 個、proptest 3 個を追記する。
- **\`src/lib.rs\`。** \`pub use compute::{...}\` の re-export に \`account_equity\` と \`margin_ratio\` を足す。

L5 は Stage 10a の教育的な中心だ。急がないこと。「書く → 失敗する → トレースする → refine する」という proptest の discovery loop こそ、本レッスンが教えるために存在する load-bearing なスキルだ。

## おさらい

L4 の後:
- Compute モジュールが存在し、\`notional_value\`、\`unrealized_pnl\`、private な \`saturate_i128_to_i64\` ヘルパーがある。
- 8 個の unit test が、PnL の 4 つの符号の組み合わせと notional の 3 ケース（long、short、flat）をカバーする。
- \`cargo test\` が 8 テスト全部 green。

L5 では次のレイヤーを積む: PnL を account equity に変換し（collateral を足す）、その equity を notional で割って margin ratio を得る。それから最初の proptest を書き、本ステージを定義するサプライズに出会う。

## 計画

3 フェーズで進める:

1. **\`account_equity\` を追記。** 1 行の関数、happy-path 用の unit test 1 個、「equity が負になる」unit test 1 個。
2. **\`margin_ratio\` を追記。** i128 スケールの除算 + flat-position ガード、unit test 3 個（flat は max を返す / ちょうど 10% の ratio / ratio が負になりうる）。
3. **Proptest ブロックを追加。** Long-monotonicity proptest を素朴な形で書き、特定の入力で失敗するのを見て、その理由をトレースし、\`prop_assume!\` で refine する。続いて short-monotonicity（前提条件なし）と determinism の proptest を足す。最終状態: 3 proptest、すべて green。

最後に \`lib.rs\` を更新。

> 🛑 **予測。** スクロール前に考えてほしい。Long ポジションで \`collateral = 100\`、\`size = 1\`、\`entry = 100\` の状態は、mark = 100 のとき \`notional = 100\`、\`equity = 100\`（PnL ゼロ）になる。**mark = 100 での margin_ratio はいくつか?** mark = 110 では? mark = 50 では? 続きを読む前に、\`equity × MARGIN_SCALE / notional\` の式を各ケースについて手で辿ってみる。

（ウォークスルー:
- **mark = 100**: notional = 1 × 100 = 100、pnl = (100 − 100) × 1 = 0、equity = 100 + 0 = 100、ratio = 100 × 10_000 / 100 = **10_000 bps = 100%**。
- **mark = 110**: notional = 110、pnl = 10、equity = 110、ratio = 110 × 10_000 / 110 = **10_000 bps = 100%**。
- **mark = 50**: notional = 50、pnl = −50、equity = 50、ratio = 50 × 10_000 / 50 = **10_000 bps = 100%**。

**Margin ratio がまったく動かない。** Collateral がちょうど notional_at_entry に等しいので、どの mark でも PnL の動きを collateral が相殺してしまう。このポジションは unlevered だ — exposure $1 に対して collateral $1 を持っている。**ここが素朴な monotonicity の直感が壊れる regime だ。** \`collateral ≥ notional_at_entry\` の「cash-funded」ポジションでは、mark が動いたとき margin ratio はどちらの方向にも動きうる。これを proptest でこの後すぐ目にする。）

## 手を動かす walk-through

### Step 1: \`account_equity\` を追記

\`crates/liquidation/src/compute.rs\` を開く。\`saturate_i128_to_i64\` ヘルパーの後（\`#[cfg(test)]\` ブロックの上）に追加:

\`\`\`rust
/// Account equity = \`collateral + unrealized_pnl\`. Can be negative.
///
/// A negative equity means losses have exceeded deposited collateral —
/// the account is underwater. The liquidation engine still attempts to
/// close the position; any residual deficit falls to the insurance fund
/// (Stage 10b).
#[must_use]
pub fn account_equity(snapshot: &AccountSnapshot, mark: MarkPrice) -> i64 {
    snapshot
        .collateral
        .0
        .saturating_add(unrealized_pnl(snapshot, mark))
}
\`\`\`

この 6 行の関数で押さえておく点が 3 つ:

1. **返り型は \`i64\`、\`u64\` ではない。** Doc が「負になりうる」と書き、型がそれを本物にする。これを下流で margin 計算に流す呼び出し側は、サプライズなしに signed 演算を使える。**値の実際の範囲に型を合わせる。**

2. **\`saturating_add\` を使う。\`+\` でも \`checked_add\` でもない。** 2 つの \`i64\` 値の足し算は極端な値でオーバーフローしうる。\`saturating_add\` はオーバーフロー時に \`i64::MAX\` か \`i64::MIN\` を返す。エンジンはどちらも明確な health state として分類でき、\`Option\` を扱う必要がない。\`i128 → i64\` の saturation と同じパターンだ。

3. **テストはまだ書かない — Step 2 の後にまとめて置く。** こうすれば関数定義群を視覚的に連続させたまま、テストブロックを別途まとまった形で置ける。多くのレッスンが関数とテストを交互に配置するが、ここではそうしない。

### Step 2: \`margin_ratio\` を追記

\`account_equity\` の後に追記:

\`\`\`rust
/// Margin ratio = \`equity / notional\`, scaled by [\`MARGIN_SCALE\`].
///
/// Returns \`MarginRatio(i64::MAX)\` for a flat position — no notional
/// exposure means the margin requirement is irrelevant, and we report the
/// healthiest possible ratio.
///
/// Returns a negative ratio when equity < 0 (the underwater case).
#[must_use]
pub fn margin_ratio(snapshot: &AccountSnapshot, mark: MarkPrice) -> MarginRatio {
    let notional = notional_value(snapshot, mark);
    if notional == 0 {
        return MarginRatio(i64::MAX);
    }
    let equity = account_equity(snapshot, mark);
    // ratio = equity × MARGIN_SCALE / notional, in i128 to avoid overflow
    // before the divide.
    let scaled = i128::from(equity).saturating_mul(i128::from(MARGIN_SCALE));
    let ratio = scaled / i128::from(notional);
    MarginRatio(saturate_i128_to_i64(ratio))
}
\`\`\`

この関数で押さえておく点が 5 つ:

1. **\`notional == 0\` の early return で \`i64::MAX\` を返す。** Flat ポジションは exposure ゼロ → 下回るべき margin 要件もない。表現可能な最大の ratio を返すことが「無限に safe」のシグナルになり、下流の \`margin_health\` の比較すべてを自然に short-circuit させる（\`margin_health\` 側に special-case はいらない）。**具体的には、次レッスン (L6) で実装する \`if ratio >= params.initial_margin_bps { Safe } else { ... }\` という一方向の比較式が、flat なアカウントに対しても追加の特例分岐なしでそのまま機能し、\`i64::MAX >= initial_margin_bps\` が常に真なので自動的に \`Safe\` と判定される**。つまり \`i64::MAX\` は **「下流の比較演算が短絡的に通り抜けるための magic boundary」** として効いている。代替案 — \`Option<MarginRatio>\` や \`Result<MarginRatio>\` — はすべての呼び出し側に flat ケースを明示的に扱わせることになる。**「制約なし」のケースを、システム上最も safe な上限値で表現する設計規律だ。**

2. **乗算を除算より *先* に置く。** \`equity × MARGIN_SCALE / notional\` を i128 で計算すれば、小さい ratio（例えば 1% margin = 100 bps）も割り算を生き残る。先に除算する（\`equity / notional × MARGIN_SCALE\` を i64 で）と、スケーリングの前に整数パーセントに切り捨てられ、精度が失われる。**整数除算が混じるとき、演算順序が効く。**

3. **Scaled product を i128 で受ける。** \`equity\` は i64、\`MARGIN_SCALE\` は 10⁴。i64 での積は \`|equity| > i64::MAX / 10_000 ≈ 9.2e14\` でオーバーフローしうる。現実的な取引所スケールに直すと $920 兆 — 妥当な範囲を遥かに超えるが、i128 乗算は第二の防衛線として置いておく。\`unrealized_pnl\` と同じ規律だ。

4. **割り算用の \`i128::from(notional)\` キャスト。** \`scaled\` が i128 になった後、i128 で割り続ければ結果も i128 のまま。\`notional\`（u64）の i128 へのキャストは無償だ。i128 と u64 を割り算で直接混ぜることはできない。**チェーン全体を 1 つの広い型で通し、境界で 1 度だけキャストする。**

5. **末尾の \`saturate_i128_to_i64(ratio)\`。** 割り算後でも、極端な i128 値は i64 範囲を超えうる（例: 巨大な equity と小さな notional の組み合わせ）。Saturation は答えの符号を保ちつつ、magnitude を clip する。

### Step 3: unit test を 5 個追加

既存の \`#[cfg(test)] mod tests { ... }\` ブロックの中、L4 の PnL テストの後に追加:

\`\`\`rust
    // ─── account_equity ────────────────────────────────────────────

    #[test]
    fn equity_collateral_plus_pnl() {
        // Long 10 @ 100, collateral 1_000, mark 120 → equity = 1_000 + 200 = 1_200
        let s = snapshot(10, 100, 1_000);
        assert_eq!(account_equity(&s, MarkPrice(120)), 1_200);
    }

    #[test]
    fn equity_can_go_negative() {
        // Long 10 @ 100, collateral 100, mark 50 → pnl = −500, equity = −400
        let s = snapshot(10, 100, 100);
        assert_eq!(account_equity(&s, MarkPrice(50)), -400);
    }

    // ─── margin_ratio ──────────────────────────────────────────────

    #[test]
    fn ratio_flat_returns_max() {
        let s = snapshot(0, 100, 1_000);
        assert_eq!(margin_ratio(&s, MarkPrice(100)), MarginRatio(i64::MAX));
    }

    #[test]
    fn ratio_exactly_ten_percent() {
        // Notional = 10 × 100 = 1_000; equity = 100 (collateral only, pnl = 0).
        // ratio = 100 × 10_000 / 1_000 = 1_000 bps = 10%.
        let s = snapshot(10, 100, 100);
        assert_eq!(margin_ratio(&s, MarkPrice(100)), MarginRatio(1_000));
    }

    #[test]
    fn ratio_can_be_negative() {
        // Underwater: equity = −400, notional = 500 → ratio = −8_000 bps
        let s = snapshot(10, 100, 100);
        let r = margin_ratio(&s, MarkPrice(50));
        assert!(r.0 < 0, "expected negative ratio, got {:?}", r);
    }
\`\`\`

押さえておく点:

1. **各 ratio テストが、コメントで厳密な算術を名指ししている。** "\`ratio = 100 × 10_000 / 1_000 = 1_000 bps = 10%\`" — 読者（およびリグレッションをデバッグする未来の自分）は、計算をやり直さなくてもテストの期待値を検証できる。**テストは説明もするコードだ。**

2. **\`ratio_can_be_negative\` は \`assert_eq!(r, MarginRatio(-8000))\` ではなく \`assert!(r.0 < 0)\` を使う。** 厳密な ratio 値は割り算の i64 rounding に依存する。bps を厳密に固定すると、唯一正典的な答えのない演算をロックインしてしまう（rounding mode が違えば LSB が変わる）。*符号* だけを assert することで、「equity が負なら ratio も負」という load-bearing な性質をテストし、rounding artifact はテストしない形になる。**Property をテストする、artifact をテストしない。**

3. **\`ratio_flat_returns_max\` は \`MarginRatio(i64::MAX)\` を直接使う。** Sentinel 値は契約の一部で、L6 の \`margin_health\` がそれに依存する。

### Step 4: Proptest を書く — 素朴な初版

Unit test の下（まだ \`mod tests\` の中）に \`proptest!\` ブロックを開く。\`prop_assume!\` *なしで*、long ポジションの monotonicity 不変量から書き始める:

\`\`\`rust
    proptest! {
        /// For a long position, as mark increases (price moves in the
        /// long's favor), margin_ratio should monotonically increase.
        /// If it ever moved the other way, an account could pass from
        /// "safe" to "liquidatable" without a single adverse price move,
        /// which would be a soundness bug.
        #[test]
        fn long_ratio_monotonic_in_mark(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            let s = snapshot(size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 <= r_high.0,
                "long ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
    }
\`\`\`

テストを走らせる:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

最小の counterexample で **失敗** する:

\`\`\`
thread 'compute::tests::long_ratio_monotonic_in_mark' panicked:
Test failed: long ratio not monotonic: mark_a=1 → r=40000; mark_b=2 → r=25000
minimal failing input: size = 1, entry = 100, collateral = 103, mark_a = 1, mark_b = 2
\`\`\`

**ここで一度止まる。関数を直さない。失敗を手でトレースする。**

### Step 5: 失敗を手で辿る

最小の失敗入力を \`margin_ratio\` に段階的に流してみる:

**mark = 1 のとき:**
- \`notional = |1| × 1 = 1\`
- \`pnl = (1 − 100) × 1 = −99\`
- \`equity = 103 + (−99) = 4\`
- \`ratio = 4 × 10_000 / 1 = 40_000 bps\`（= 400%）

**mark = 2 のとき:**
- \`notional = |1| × 2 = 2\`
- \`pnl = (2 − 100) × 1 = −98\`
- \`equity = 103 + (−98) = 5\`
- \`ratio = 5 × 10_000 / 2 = 25_000 bps\`（= 250%）

mark が上がるにつれて margin ratio は 400% から 250% に下がった。Equity も上がっている（4 → 5）が、notional *も* 上がっている（1 → 2）。Notional のほうが equity の回復より速く成長したのだ。

一般式で書き直すとこうなる:

> \`margin_ratio = (collateral + (mark − entry) × size) × MARGIN_SCALE / (|size| × mark)\`
>
> = \`MARGIN_SCALE × (collateral/notional + (1 − entry/mark))\`

これを mark で微分する（long、つまり size、entry、collateral を固定して考える）:

> \`d(margin_ratio)/d(mark) = MARGIN_SCALE × (entry / mark² − collateral / (size × mark²))\`
>
> = \`MARGIN_SCALE / mark² × (entry − collateral / size)\`

この微分の符号は \`entry − collateral / size\` の符号と一致する。つまり:

- \`entry × size > collateral\` のとき: 微分は正 → ratio は mark とともに **増加** する（levered regime、素朴な直感が正しい領域）。
- \`entry × size < collateral\` のとき: 微分は負 → ratio は mark とともに **減少** する（cash-heavy regime、素朴な直感が外れる領域）。
- \`entry × size = collateral\` のとき: 微分はゼロ → ratio は mark に対して一定（「ちょうど資金化された」境界）。

3 つの regime と margin_ratio の挙動を 1 枚に並べると、なぜ素朴な直感が破綻するのか、どこに「特異な境界」が走っているのかが視覚で見える:

\`\`\`
                         margin_ratio (Long ポジション、collateral と size を固定したまま mark を動かす)
                         ▲
                         │     🔴 Cash-heavy regime
                         │        (collateral > entry × size)
                         │        ratio は mark の上昇とともに ↘ 減少
                         │        ※ 素朴な直感「mark が上がれば ratio も上がる」が破綻するゾーン
                         │     ──────────────────────────────────
                         │
                         │     ◆ 特異な境界: collateral = entry × size
                         │        (= ちょうど 1x レバレッジ、cash-funded ぎりぎり)
                         │        ratio は mark に対して水平 (微分 = 0)
                         │     ──────────────────────────────────
                         │
                         │     🟢 Levered regime
                         │        (collateral < entry × size)
                         │        ratio は mark の上昇とともに ↗ 増加
                         │        ※ 素朴な直感どおりに動く、現実の perp で 99% のケース
                         │
                         └─────────────────────────────────────►  mark

  ポイント:
    - 境界の位置は **collateral と entry × size の大小関係** だけで決まる (mark には依存しない)。
    - 預け入れ担保 (collateral) がエントリー時の想定元本 (notional at entry = entry × size) を
      超える瞬間、margin_ratio の傾きが反転する。
    - 現実の取引所では trader はほぼ常に levered regime にいるので、この反転は本番では稀な
      コーナーケース。だが proptest はランダム入力なので、容赦なくこのコーナーを踏み抜く。
    - 「素朴な monotonicity の直感」は本質的には間違っていない — **「levered regime に居る」
      という暗黙の前提**の下では正しい。proptest はその前提を可視化させる装置だ。
\`\`\`

この図は L6 / L7 で classifier やリクイデーション規律を書くときにも参照する: 健康な trader はほぼ levered 領域に居るが、極端に over-collateralize した「擬似ロング」のアカウントが cash-heavy 領域に紛れ込む可能性は常にあるので、エンジンは両 regime で正しく動かなければならない。

失敗した入力では \`entry × size = 100 × 1 = 100\`、\`collateral = 103\`。\`collateral > entry × size\` なので、mark が上がると ratio が下がる cash-heavy regime に居る。

**これは \`margin_ratio\` のバグではない。関数は正しい。バグは proptest の不変量の書き方にある — monotonicity が成り立たない regime に対しても monotonicity を主張してしまっているのだ。**

### Step 6: \`prop_assume!\` で proptest を refine する

Long-monotonicity proptest を、monotonicity が実際に成り立つ regime の内側だけで主張するバージョンへ置き換える:

\`\`\`rust
    proptest! {
        /// For a *levered* long position (entry × size > collateral), as
        /// mark increases, margin_ratio monotonically increases.
        ///
        /// The leverage condition is load-bearing: when collateral exceeds
        /// position notional at entry (effectively cash + tiny exposure),
        /// the ratio is dominated by \`collateral / notional\`, which
        /// *decreases* as mark grows — so monotonicity fails. That
        /// regime is uninteresting for liquidation (the account can
        /// never be liquidated), so we exclude it via \`prop_assume!\`.
        #[test]
        fn long_ratio_monotonic_in_mark_when_levered(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            // Levered regime: notional at entry strictly exceeds collateral.
            prop_assume!(
                i128::from(entry) * i128::from(size) > i128::from(collateral)
            );
            let s = snapshot(size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 <= r_high.0,
                "long ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
\`\`\`

refine 後のテストで押さえておく点が 3 つ:

1. **テスト名の末尾が \`_when_levered\` になった。** 名前が前提条件を運ぶ。失敗時にこのテストへ飛び込んだ将来の読者は、本体を読まずに前提条件を把握できる。

2. **Doc コメントが、前提条件が *なぜ* 重要かを名指ししている。** "*That regime is uninteresting for liquidation*" — これが見落としではなく意図的なスコープ選択だと、読者にちゃんと伝わる。

3. **入力レンジを制限せず、\`prop_assume!\` を使う。** \`collateral\` を \`0..(entry × size)\` で生成して leverage 条件を構造的に強制することも *できる*。だが proptest の input strategy は inter-parameter 制約を組むのが難しい。一方 \`prop_assume!\` は「この前提条件に違反するケースはスキップする」と自然に読める。Proptest のカウンター（\`successes: 8, rejects: ~\`）が、何ケースがフィルタされたかを教えてくれる。\`rejects\` が \`successes\` の ~10 倍を超えるようなら、*そのとき* に strategy を refine すればよい。

### Step 7: Short-monotonicity proptest を追加（前提条件なし）

同じ \`proptest!\` ブロック内に追加:

\`\`\`rust
        /// Symmetric invariant for shorts: as mark increases, the short's
        /// margin_ratio always decreases. Unlike the long case, this holds
        /// for *any* collateral level — the math derivative is uniformly
        /// negative in mark (every term either decreases or stays flat).
        #[test]
        fn short_ratio_monotonic_in_mark(
            size in 1_i64..1_000,
            entry in 100_u64..10_000,
            collateral in 1_i64..1_000_000,
            mark_a in 1_u64..50_000,
            mark_b in 1_u64..50_000,
        ) {
            prop_assume!(mark_a < mark_b);
            let s = snapshot(-size, entry, collateral);
            let r_low  = margin_ratio(&s, MarkPrice(mark_a));
            let r_high = margin_ratio(&s, MarkPrice(mark_b));
            prop_assert!(
                r_low.0 >= r_high.0,
                "short ratio not monotonic: mark_a={} → r={}; mark_b={} → r={}",
                mark_a, r_low.0, mark_b, r_high.0
            );
        }
\`\`\`

押さえておく点が 2 つ:

1. **Leverage 条件のための \`prop_assume!\` がない。** Short monotonicity は *無条件に* 成り立つ。微分を辿るとこうなる。\`size < 0\` の場合、式は \`margin_ratio = MARGIN_SCALE × (collateral / notional + entry / mark − 1)\` の形になる。これを mark で微分すると \`d/d(mark) = MARGIN_SCALE / mark² × (−collateral / |size| − entry)\`。括弧の内側の両項はいずれも非正だ（collateral と entry は非負、\`|size|\` は正）。よって微分は一様に負（またはゼロ）。**この非対称性は本物の数学的事実であって、表記の好みの問題ではない。**

2. **Snapshot 構築時に \`-size\` を渡している。** Strategy generator には正の \`size\` を渡し（\`> 0\` の範囲に保ち）、snapshot を組み立てる直前に符号を反転する。こうすれば \`size = 0\` の生成を避けられる（\`size = 0\` は flat ケースで、\`ratio_flat_returns_max\` がカバー済み）。

### Step 8: Determinism proptest を追加

同じ \`proptest!\` ブロック内に追加:

\`\`\`rust
        /// Determinism: the same inputs always produce the same MarginRatio.
        /// Trivially true for pure functions, but the proptest catches
        /// accidental non-determinism (e.g., if a future refactor introduces
        /// HashMap iteration or float arithmetic).
        #[test]
        fn margin_ratio_deterministic(
            size in -1_000_i64..1_000,
            entry in 1_u64..10_000,
            collateral in -1_000_000_i64..1_000_000,
            mark in 1_u64..50_000,
        ) {
            let s = snapshot(size, entry, collateral);
            let r1 = margin_ratio(&s, MarkPrice(mark));
            let r2 = margin_ratio(&s, MarkPrice(mark));
            prop_assert_eq!(r1, r2);
        }
    }
\`\`\`

押さえておく点:

1. **Pure 関数にとって、この assertion は自明だ。** 同じ入力での 2 つの呼び出しは、同じ出力を返さなければならない。**このテストは *将来* のリグレッションを捕まえる。** 将来のリファクタリングが margin 計算に \`HashMap\` の iteration 順、\`SystemTime::now\`、float 演算などを誤って持ち込んでしまったとき、production で chain を fork させる前にこの proptest が失敗する。

2. **広い入力レンジには負やゼロも含まれる。** 他の 2 proptest は特定の regime を切り出していた。Determinism は *どこでも* 成り立つので、strategy は寛大にしておく。ここでテストしているのは値の特定の性質ではなく、*関数の性質*（決定論的な dispatch）だ。

3. **維持コストが最も低く、違反の発見コストも最も低い不変量。** エンジン内のすべての pure 関数は determinism proptest を持つべきだ。**5 行の proptest が、consensus-fork バグの一群を防ぐガードになる。**

### Step 9: \`lib.rs\` を更新

\`crates/liquidation/src/lib.rs\` を開く。Compute の re-export を拡張する。元:

\`\`\`rust
pub use compute::{notional_value, unrealized_pnl};
\`\`\`

更新後:

\`\`\`rust
pub use compute::{account_equity, margin_ratio, notional_value, unrealized_pnl};
\`\`\`

新規 2 名、アルファベット順に挿入。

### Step 10: テストを走らせる

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
running 16 tests
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok
test compute::tests::ratio_can_be_negative ... ok
test compute::tests::ratio_exactly_ten_percent ... ok
test compute::tests::ratio_flat_returns_max ... ok
test compute::tests::long_ratio_monotonic_in_mark_when_levered ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok
test compute::tests::margin_ratio_deterministic ... ok

test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**16 テストすべて pass。** 3 つの proptest はデフォルトでそれぞれ 256 ケースを走らせる — 合計で ~768 のランダム入力の組み合わせがチェックされたことになる。

エラー時にありがちなパターン / サプライズ:

- **proptest 出力に \`successes: 220, rejects: 36\`。** まったく問題ない。\`prop_assume!\` フィルタが一部のケースを捨てただけだ。Successes がケースの大半を占めている限り、proptest はちゃんと仕事をしている。
- **Proptest が想定より時間がかかる。** \`cargo test\` のフラグで timeout を増やすか、素直に待つ。3 proptest × 256 ケース × pure な算術の速度は、実用上は十分に速い。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **Flat ポジションに \`MarginRatio(i64::MAX)\` を返す — \`Option\` でも \`Result\` でもなく。** 「制約なし」のケースは *最も safe な* state。これを表現可能な最大の ratio にマップしておけば、下流のすべての分類器が special-case 分岐なしに自然に short-circuit できる。**「情報なし」を「情報の欠如」としてではなく、「最も safe な値」として表現する。**

2. **Proptest の失敗そのものがレッスンだ。** Proptest が最初の試みで pass してしまっていたら、読者は「margin_ratio は mark に対して monotonic」とだけ学んで終わっていただろう。失敗とトレースのステップを経ることで、読者は「**margin_ratio は mark に対して *levered regime でのみ* monotonic であり、その特異な境界は、預け入れ担保 (collateral) がエントリー時の想定元本 (notional at entry = entry × size) とちょうど等しくなる点である**」という、より深いドメインの事実に到達する。自分で微分を歩いたからこそ、そのシステムに対する理解は揺るぎないものになる。

3. **条件付き不変量には \`prop_assume!\`。** 不変量が入力のサブセット上でしか成り立たないとき、正しい道具は \`prop_assume!\` だ。関数の事後条件を強めることでもなく、assertion を弱めることでもなく、手で strategy を制限することでもない。**不変量とは「どの条件下で真なのか」を含めて初めて意味を持つ。両方を表現する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L5 の後:
- **compute.rs** は Stage 10a を \`margin_ratio\` + 最初の 13 unit test + 3 proptest すべてまで一致する。残る 2 関数（L6 の \`margin_health\`、L7 の \`close_order_spec\`）とそのテストは pending。
- **lib.rs** は compute の re-export を 6 個中 4 個持つ — \`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`。残り 2 つは L6 / L7 で着地する。

## よくある質問

**Q1: なぜ flat ポジションは \`MarginRatio(i64::MAX)\` を返し、\`MarginRatio(0)\` や \`Option::None\` ではないのか?**

\`MarginRatio(0)\` は flat アカウントを *最悪* の margin state に分類してしまい、margin_ratio の各 consumer に「これは本当にゼロか、それとも flat か?」の special-case を強制する。\`Option::None\` は honest だが、その special case を呼び出しサイト全部に押し出す。\`MarginRatio(i64::MAX)\` は flat ケースを「無限に safe」と同義にしてくれる — liquidation の目的にとって、それは *実際そう* なのだ。これで margin_health は special-case 分岐なしに \`Safe\` に分類できる。**3 つの選択肢のうち、自然に compose するのは 1 つだけ。**

**Q2: なぜ collateral が margin_ratio を 100% 超に押し上げてもいいのか?**

Margin ratio は \`equity / notional\` のスケールにすぎない。数学的に 100% の上限はない — $1,000 の collateral と $100 の notional のポジションは 1,000% margin ratio になる。実際の取引所はこれを「10× collateralized」と報告する。エンジンは initial-margin しきい値を超えた ratio の具体値を気にしない。上方向はすべて \`Safe\` だ。**上限は UI の関心事であって、エンジンの関心事ではない。**

**Q3: Flat ガードなしで \`margin_ratio\` を常に i128 で計算して単純化できないか?**

できない。Rust では整数のゼロ除算は debug でも release でも panic する。Flat ガードはその panic を防いでいる。削除するなら \`try_div\`（i128 は built-in を持たない）や、branchless なアプローチ（rounding noise を足して除算前に notional を定数で乗算する）が必要になる。2 行のガードが一番クリーンだ。**条件分岐 1 つで明示的に書くほうが、トリッキーな branchless (分岐なし) の実装に逃げるよりも、コードの可読性と保守性の観点から遥かに安上がりだ。**

**Q4: 入力 strategy を \`collateral in 1..(entry × size)\` に制限するのではなく、なぜ \`prop_assume!\` なのか?**

理由は 2 つある。(1) Proptest の strategy はパラメータごとに独立しているため、inter-parameter 制約を表現するには \`(entry, size, collateral).prop_filter(...)\` や \`flat_map\` を組まなければならず、どちらも \`prop_assume!\` より noisy になる。(2) \`prop_assume!\` は前提条件をテスト本体の中に inline で見える形に置く — 読者は assertion のすぐ隣で「collateral ≥ notional-at-entry のケースはスキップ」を読み取れる。データ生成器の奥に埋もれない。**前提条件は assertion のある場所で表現する。データ生成器の中で表現するのではない。**

**Q5: Long monotonicity 不変量が成り立たないのはいつで、それは問題なのか?**

\`collateral ≥ entry × size\` のとき。cash-heavy regime で、ポジションが over-collateralized すぎて liquidation できない領域だ。その regime では mark が動くと margin ratio は上下するが、maintenance を下回ることはない。エンジンは何もする必要がない。**Monotonicity が破れるケースは、ちょうどエンジンが気にしないケースに重なる — だから \`prop_assume!\` で除外するのは workaround ではなく、正しい動きだ。**

## 次のレッスン (L6)

L6 では \`margin_health\` を追加する — \`MarginRatio\` を params と比較して、4 つの \`MarginHealth\` variant のどれか 1 つにマップする関数だ。境界の unit test 5 個（Safe / AtRisk / Liquidatable / Underwater / ちょうど maintenance の端）と、各しきい値で strict-less-than を使う理由の議論を載せる。L5 より短い — L6 までに規律は内面化されている。L6 は応用編だ。
`,
                },
                {
                  title: "レッスン 6 — margin_health — 分類カスケードと境界セマンティクス",
                  slug: "openhl-liquidation-margin-health-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 6 — \`margin_health\` — 分類カスケードと境界セマンティクス

## ゴール

このレッスンで掴む概念:

- **分類カスケードが \`Underwater\` を最初に check する理由。** 負の margin ratio は maintenance より *も* 小さいので、順序を逆にすると underwater アカウントが静かに Liquidatable に再分類されてしまい、insurance-fund 向けのシグナルが失われる。最も極端な state から先に check する — カスケードは内側に narrow していく。
- **すべての境界で strict-less-than を使う。** \`ratio < maintenance_bps\` であって、\`≤\` ではない。Ratio が *ちょうど* maintenance のアカウントは \`AtRisk\` であって \`Liquidatable\` ではない。境界線そのものは *より良い* state に属する。Strict に下回って初めて、悪い state に落ちる。
- **Params 比較のための型 widening。** \`i64::from(params.initial_margin_bps)\` が境界で u32 を i64 にアップキャストし、その後は 2 つの i64 値の比較になる。各比較サイトでの暗黙キャストを避けるための一手だ。
- **Flat-as-Safe は無償、明示的に書かない。** \`margin_ratio\` は flat ポジションに対して \`MarginRatio(i64::MAX)\` を返し、その値は妥当な \`initial_margin_bps\` のどれよりも大きい。したがって \`margin_health\` は special-case 分岐なしに自然と \`Safe\` を返す。Composition が片付けてくれる。

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 21 テストが pass する（L4-L5 の 16 + 新規境界テスト 5）。

具体的な変更:

- **\`src/compute.rs\`。** \`margin_ratio\` の後に \`margin_health\` を追記し、既存のテストモジュールに unit test 5 個を加える。
- **\`src/lib.rs\`。** Compute の re-export を \`margin_health\` で拡張する。

L6 は応用編だ。ここまでに i128 / saturate / proptest の規律は内面化されている。分類カスケードは短い — だが design hill（カスケード順 + strict-less-than）こそが、不注意な実装でバグが潜みやすい場所だ。

## おさらい

L5 の後:
- \`compute.rs\` には \`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`、\`saturate_i128_to_i64\` ヘルパー、加えて 13 unit test と 3 proptest が揃っている。
- 非単調エッジケースは \`long_ratio_monotonic_in_mark_when_levered\` の \`prop_assume!\` で表現済み。
- \`cargo test\` は 16 テストを走らせ、すべて green。

L6 では \`MarginRatio\` の値を \`MarginHealth\` の variant にマップする。関数は短い。決定は短くない。

## 計画

編集は 3 つ:

1. **\`crates/liquidation/src/compute.rs\` に \`margin_health\` を追記。** 13 行 + doc コメント。\`margin_ratio\` の直下に置き、それを利用する。
2. **既存のテストモジュールに unit test 5 個を追加。** \`MarginHealth\` variant ごとに 1 つ（4 テスト）+ ちょうど maintenance しきい値での境界テスト 1 つ。
3. **\`crates/liquidation/src/lib.rs\` を更新。** \`pub use compute::{...}\` 行を拡張する。

> 🛑 **予測。** スクロール前に考えてほしい。カスケードは 4 状態（\`Underwater\`、\`Liquidatable\`、\`AtRisk\`、\`Safe\`）を見分ける必要がある。条件は \`ratio < 0\`、\`ratio < maintenance_bps\`、\`ratio < initial_bps\`、それ以外。**カスケードを \`Liquidatable → Underwater → AtRisk → Safe\` の順（Liquidatable を最初に check）に書いたら、何が起きるか?**

（答え: **Underwater アカウントが Liquidatable に分類されてしまう。** Ratio \`−5_000\` は \`< maintenance_bps\`（= 200）でもあるので、Liquidatable 分岐が先に発火し、カスケードは Underwater check に到達しない。結果として、bridge は insurance-fund-needed のシグナルを受け取らず、underwater な不足が静かに通常の liquidation path を通る。数学が「不足を解消できなかった」と言っているのに、帳簿の上ではポジションが solvent に close されてしまう。**カスケード順は load-bearing だ — 最も極端な state から先に check する。内側に進む各ステップが、残りの範囲を narrow させる。**）

4 状態の判定カスケードを margin ratio の数直線上に並べると、なぜこの順序でしか正しく動かないのか、そしてなぜ逆順だと Underwater が Liquidatable に「吸い込まれる」のかが視覚で見える:

\`\`\`
                       (悪化方向 ◄────────────────── 値の大きさ ──────────────────► 改善方向)

   margin ratio:   ── −∞ ── 0 ─────── maintenance_bps ─────── initial_bps ─────── i64::MAX ──
                       ↑    ↑                    ↑                      ↑                    ↑
                       │    │ (例: 200)          │ (例: 1000)            │                    │
                       │    │                    │                      │                    │
                       └────┴──┐  ┌──────────────┴──┐  ┌─────────────────┴──┐  ┌──────────────┘
                              ▼  ▼                 ▼  ▼                    ▼  ▼
                          🔴 Underwater       🟠 Liquidatable          🟡 AtRisk            🟢 Safe
                          (ratio < 0)         (0 ≤ ratio                (maint ≤ ratio       (initial ≤ ratio、
                                              < maintenance)            < initial)            flat なら i64::MAX も
                                                                                              ここに着地)


   🟢 正しいカスケード順 (内側に narrow していく):
      ① if ratio < 0                ──► Underwater     (最も極端な領域を最初に切り出す)
      ② else if ratio < maintenance ──► Liquidatable   (Underwater は ① で除外済み)
      ③ else if ratio < initial     ──► AtRisk         (Liquidatable は ② で除外済み)
      ④ else                        ──► Safe           (残りの全域)
      ※ 各分岐の条件は「前の分岐が拾ったすべての値を排除した残り」を相手にする。

   🔴 逆順 (広い領域から先に check) にすると:
      ① if ratio < maintenance     ──► Liquidatable   ← ratio = -5_000 (Underwater) も
                                                         < 200 を満たすので Liquidatable に
                                                         「吸い込まれる」
      ② if ratio < 0               ──► Underwater     ← ここに来ることはない (到達不能)
      ③ ...
      結果: insurance-fund シグナルが消え、Underwater アカウントの不足が通常の close path で
            silent に流される。数学が解けていない不足を、帳簿は solvent な close として記録する。
\`\`\`

ポイント: **カスケードを「最も極端な領域から先に切り出していく narrowing」として書くと、各分岐の条件は自然に上の分岐の補集合の中だけで成立する**。逆に「広い領域から先に check」にすると、より極端な領域 (Underwater) が広い領域 (Liquidatable) に吸収されてしまい、本来 4 つあるはずの分類が 3 つに退化する。L7 で \`close_order_spec\` がこの 4 状態を見て発火するかどうかを決めるので、この narrowing が崩れると下流の挙動全体が壊れる。

## 手を動かす walk-through

### Step 1: \`src/compute.rs\` に \`margin_health\` を追記

\`crates/liquidation/src/compute.rs\` を開く。\`margin_ratio\` の後、\`#[cfg(test)]\` ブロックの前に追記:

\`\`\`rust
/// Classify margin health against the given params.
///
/// Returns one of four states in decreasing health order:
/// \`Safe → AtRisk → Liquidatable → Underwater\`. The boundaries use strict
/// inequality below the threshold (\`<\`), so an account at exactly the
/// maintenance ratio is \`AtRisk\`, not \`Liquidatable\`. This matches the
/// conventional "you start liquidating when you fall below the line"
/// reading.
#[must_use]
pub fn margin_health(
    snapshot: &AccountSnapshot,
    mark: MarkPrice,
    params: &LiquidationParams,
) -> MarginHealth {
    let ratio = margin_ratio(snapshot, mark);
    let initial_bps = i64::from(params.initial_margin_bps);
    let maintenance_bps = i64::from(params.maintenance_margin_bps);

    if ratio.0 < 0 {
        MarginHealth::Underwater
    } else if ratio.0 < maintenance_bps {
        MarginHealth::Liquidatable
    } else if ratio.0 < initial_bps {
        MarginHealth::AtRisk
    } else {
        MarginHealth::Safe
    }
}
\`\`\`

この 18 行の関数で押さえておく点が 5 つ:

1. **カスケード順が \`Underwater\` を最初に check する。** 負の ratio は \`< maintenance_bps\` も満たすので、Liquidatable を最初に check すると、すべての Underwater アカウントが Liquidatable に誤分類されてしまう。**不変量: 各分岐の条件は、前の分岐が捕まえたものをすべて排除している。** Underwater（\`< 0\`）が最も厳しく、そこから Liquidatable（\`< maintenance\`）、AtRisk（\`< initial\`）、最後に Safe（残り）へと内側に narrow していく。

2. **しきい値はすべて \`<\`、\`≤\` ではない。** Ratio が \`maintenance_bps\` に等しいアカウントは *まだ* Liquidatable ではなく、AtRisk だ。慣例的な読み方は「maintenance margin は *上にとどまる* べき線で、strict に超えてから liquidation 対象になる」。Doc がこれを明示し、Step 2 のテストが強制する。**Strict inequality は、しきい値そのものがより良い health state に属する、ということを意味している。**

3. **\`i64::from(params.initial_margin_bps)\` が u32 → i64 を widen する。** フィールドは \`u32\`（メモリ節約。bps 値は ~40 億まで十分な範囲だ）。Ratio は \`i64\`（\`margin_ratio\` の signed 除算によって型がそうなっている）。Rust では異なる integer 型同士の比較はコンパイルエラーになる。境界で widening しておけば、本体の比較はクリーンに保てる。**Params ごとに 1 回キャストする。カスケード本体は純粋な i64 < i64 として読める。**

4. **Flat ポジション用の special case がない。** \`margin_ratio\` は flat アカウントに対して \`MarginRatio(i64::MAX)\` を返す。\`i64::MAX\` は妥当な \`initial_margin_bps\` のどれよりも遥かに大きいので、カスケードはそのまま \`Safe\` まで fall through する。**Flat-as-Safe の性質は \`margin_ratio\` の flat-position ガードに既に反映されている。\`margin_health\` はそれを知らなくてよい。** これは **関数の合成 (function composition) によって、上流が確立した不変量を下流が自然に継承する** という設計の実例だ — \`margin_ratio\` 側で「flat なら i64::MAX」を 1 箇所だけ決めれば、それを呼ぶすべての下流関数 (この \`margin_health\` も、L7 の \`close_order_spec\` も) が「flat = 必ず Safe に着地する」を**追加コードゼロで**手にする。「関数内で何でもフラグ分岐を足す」癖を持つ開発者は、ここでパラダイムを切り替える価値がある: **不変量の責務を 1 箇所に閉じ込め、下流は信頼するだけ**。Flat-position セマンティクスを将来微調整したくなったとき、変更は *1 箇所*（\`margin_ratio\`）で済む — 2 つの同期した分岐を抱えずに済む。

5. **関数は \`&LiquidationParams\` を受け取る。値の \`LiquidationParams\` ではない。** \`LiquidationParams\` は \`Copy\`（12 byte）だが、参照シグネチャは「これは読むだけで consume しない」と読み手にシグナルする。Bridge は同じ \`params\` を、スキャン中のすべての \`margin_health\` 呼び出しに渡す。参照渡しなら、呼び出しごとの（技術的には無償の）move を避けられる。

> 🛑 **やりがちな勘違い。** 「3 つの \`if\` 分岐ではなく \`match (ratio.0, maintenance_bps, initial_bps) { ... }\` ではダメか?」 **条件は不等式であって、パターンマッチではないからだ。** Match パターンは値の structural な相等性のためのもので、range check のためではない。Guard 句（\`x if x < 0 => ...\`）付きの match に書き換えると、可読性を失うだけで得るものがない — 明示的なカスケードは、決定をそう考える通りにそのまま読める。

### Step 2: 境界テストを 5 個追加

既存の \`#[cfg(test)] mod tests { ... }\` の中、\`margin_ratio\` の unit test の後（そして \`proptest!\` ブロックの前）に追加:

\`\`\`rust
    // ─── margin_health ─────────────────────────────────────────────

    #[test]
    fn health_safe() {
        // Ratio 1_500 bps (= 15%) with params (initial = 1_000, maintenance = 200) → Safe
        let s = snapshot(10, 100, 150);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::Safe);
    }

    #[test]
    fn health_at_risk() {
        // Ratio 500 bps with params (initial = 1_000, maintenance = 200) → AtRisk
        let s = snapshot(10, 100, 50);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::AtRisk);
    }

    #[test]
    fn health_liquidatable() {
        // Ratio 100 bps (= 1%) with params (maintenance = 200) → Liquidatable
        let s = snapshot(10, 100, 10);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(
            margin_health(&s, MarkPrice(100), &p),
            MarginHealth::Liquidatable
        );
    }

    #[test]
    fn health_underwater() {
        // Equity goes negative (mark moved hard against long): Underwater
        let s = snapshot(10, 100, 100);
        let p = LiquidationParams::hyperliquid_default();
        assert_eq!(margin_health(&s, MarkPrice(50), &p), MarginHealth::Underwater);
    }

    #[test]
    fn health_boundary_at_maintenance() {
        // Ratio exactly == maintenance_bps → AtRisk (strict \`<\` for Liquidatable)
        let p = LiquidationParams {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 0,
        };
        // notional = 1_000, equity = 20 → ratio = 200 bps exactly
        let s = snapshot(10, 100, 20);
        assert_eq!(margin_health(&s, MarkPrice(100), &p), MarginHealth::AtRisk);
    }
\`\`\`

押さえておく点が 4 つ:

1. **各テストが、結果の \`MarginHealth\` を生む算術をコメントで名指ししている。** "*Ratio 1_500 bps (= 15%)*" のように書くと、読者（および失敗を読み返す将来の自分）にどの range を突いているかが正確に伝わる。コメントは正しいのにセットアップだけ間違っているテストは、assertion だけのテストより、ずっと気づきやすい。

2. **Variant 用に 4 テスト、境界用に 1 テスト。** 各カスケード分岐が positive テストを 1 つずつ持ち、\`health_boundary_at_maintenance\` が strict-less-than の慣例を裏付ける。この 5 番目のテストがないと、\`<\` を \`≤\` に flip するリファクタリングが他の 4 テストを pass したまま通ってしまい、ちょうどしきい値での挙動を静かに変えてしまう — そして本番ポジションの最も一般的な margin level は、ちょうどその辺りに集まる（アカウントは maintenance に *到達してから* 下回るからだ）。

3. **\`health_boundary_at_maintenance\` は \`hyperliquid_default()\` ではなく、独自に params を組み立てる。** Hyperliquid default は \`liquidation_fee_bps = 150\` を持つが、このテストには無関係だ。明示的に struct を構築することで、「このテストが *実際に* どのフィールドに依存するか」が文書化される。他のテストは fee フィールドが load-bearing でないので default を使う。

4. **\`MarginHealth::Underwater\` は L5 の underwater ケース**（薄い collateral の long ポジションに対する \`mark = 50\`）で exercise する。L5 の \`ratio_can_be_negative\` と同じセットアップだ — 負の ratio テストが数学を保証し、variant テストが分類を保証する、という形になる。

### Step 3: \`src/lib.rs\` を更新

\`crates/liquidation/src/lib.rs\` を開く。Compute の re-export を拡張する。元:

\`\`\`rust
pub use compute::{account_equity, margin_ratio, notional_value, unrealized_pnl};
\`\`\`

更新後:

\`\`\`rust
pub use compute::{
    account_equity, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
\`\`\`

新規 1 名 — \`margin_health\` — を、アルファベット順で \`account_equity\` と \`margin_ratio\` の間に挿入する。リストが ~5 項目を超えたあたりで、ここの行が wrap し始める。

### Step 4: テストを走らせる

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
running 21 tests
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::health_at_risk ... ok
test compute::tests::health_boundary_at_maintenance ... ok
test compute::tests::health_liquidatable ... ok
test compute::tests::health_safe ... ok
test compute::tests::health_underwater ... ok
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok
test compute::tests::ratio_can_be_negative ... ok
test compute::tests::ratio_exactly_ten_percent ... ok
test compute::tests::ratio_flat_returns_max ... ok
test compute::tests::long_ratio_monotonic_in_mark_when_levered ... ok
test compute::tests::margin_ratio_deterministic ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok

test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

エラー時にありがちなパターン:

- **\`health_boundary_at_maintenance\` が \`AtRisk\` の代わりに \`Liquidatable\` で失敗。** カスケード内のどこかで \`<\` を \`≤\` と書いてしまっている。境界テストはまさにこれを捕まえるために存在する。
- **\`health_underwater\` が \`Liquidatable\` で失敗。** \`Underwater\` の check を \`Liquidatable\` の check より *後* に置いてしまっている。並び替える — 最も極端な state を最初に。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **カスケード順: 最も極端な state を最初に check する。** \`Underwater\` → \`Liquidatable\` → \`AtRisk\` → \`Safe\`。Narrowing の方向に並んでいるので、各分岐の条件は前の分岐が捕まえたものを必ず排除している。順序を逆にすると、深刻なケースが静かに緩いケースの分岐を通り抜けてしまう。**カスケードの条件が重なり合うときは、厳しいものから緩いものへ sort する。**

2. **しきい値での strict-less-than: 境界線はより良い state に属する。** Maintenance ちょうどのアカウントは \`AtRisk\` であって \`Liquidatable\` ではない。これは慣例の選択 — 本番の取引所では別の慣例を採るところもある — だが、システム *内* で一貫していることのほうが、しきい値がどちら側に属するかより重要だ。**慣例を選び、doc で名指しし、境界テストで強制する。**

3. **\`margin_health\` 内に flat ポジションの special case を置かない。** \`margin_ratio\`（flat に対して \`i64::MAX\` を返す）との composition のおかげで、その性質が無料で落ちてくる。\`if snapshot.position_size.0 == 0 { return Safe; }\` を追加してしまうと、flat-position の挙動を 2 箇所に複製することになり、片方が変わった瞬間にずれが生まれる。**不変量は 1 箇所で表現し、下流の関数が composition でそれを継承するに任せる。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L6 の後:
- **compute.rs** は Stage 10a を \`margin_health\` + 18 unit test + 3 proptest まで一致する。最後の関数（\`close_order_spec\`）とその 3 テストは L7。
- **lib.rs** は compute の re-export を 6 個中 5 個持つ。最後の 1 つ（\`close_order_spec\`）は L7 で着地する。

## よくある質問

**Q1: なぜ misconfigured な params（maintenance ≥ initial）のケースに備えて \`Result<MarginHealth, ...>\` を返さないのか?**

関数は total（全域関数）だ — どんな入力にも、定義された出力が対応する。Misconfigured な params（maintenance == initial、あるいは maintenance > initial）でも、すべてのアカウントは 4 variant のどれかに分類される。意味的に間違った結果ではあるが、定義された結果ではある。\`Result\` を返してしまうと、*params を妥当に組み立てる bridge からは決して起きない* \`MisconfiguredParams\` エラーを、すべての呼び出しサイトに処理させることになる。**Total function は圧倒的に compose しやすい。パラメータの妥当性はシステムへの入力境界 (ロード時 / config パース時) で検証を完了させ、下流のドメイン計算層 (\`margin_health\` などの分類器) では不変量が維持されているものとして 100% 信頼する** — これは "Parse, don't validate" として知られる規律で、検証ロジックを境界に集中させ、ドメイン層を total function で構成する設計パターンだ。

**Q2: \`margin_health\` を sorted thresholds 配列と binary search で、もっと「データ駆動」にできないか?**

4 状態しかないなら、明示的なカスケードのほうがクリアで速い。Binary search が勝つのは threshold の数が ~10 を超えたあたりからだ — その時点でリファクタリングすればよい。先取りの一般化は、エンジンが必要としない仕組みを足してしまう。**今もっている cardinality に最適化する。いつか持つかもしれない cardinality に最適化しない。**

**Q3: \`maintenance_bps > initial_bps\`（misconfigured）のとき、何が起きるか?**

カスケードは依然として定義された分類を生む。\`ratio >= maintenance_bps\` の領域では、次の分岐 \`ratio < initial_bps\` が false になり（maintenance > initial なら ratio も ≥ initial だ）、そのまま \`Safe\` に fall through する。\`ratio ∈ [0, maintenance_bps)\` の領域は \`Liquidatable\` に着地する。結果として AtRisk が到達不能になる。**Misconfigured params は一貫性はあるが意図しない分類スキームを生む。Validation は param 構築側の責任で、分類器の責任ではない。**

**Q4: なぜ \`margin_health\` は params の i64 変換をキャッシュしないのか?**

呼び出し側は通常、block ごとのスイープで \`margin_health\` をアカウント 1 件あたり 1 回しか呼ばない。Bridge は同じ \`&LiquidationParams\` をすべての呼び出しに渡す。2 つの \`i64::from(u32)\` キャストはゼロコスト — コンパイラはせいぜい \`mov\` 命令を 1 つ emit するだけだ。**コストを測ってからキャッシュする。反射でキャッシュに手を伸ばさない。**

**Q5: カスケードを \`match\` の range pattern（\`0..maintenance_bps => Liquidatable\`）で書けるか?**

Rust の \`match\` は exclusive-range pattern をサポートする（1.26 から）ので、構文的にはイエス。だがパターンは \`i64::MIN..0\`、\`0..maintenance_bps\`、\`maintenance_bps..initial_bps\`、\`initial_bps..=i64::MAX\` になる。*名前付き* の境界（リテラルではなく変数）を参照する必要があるので、各パターンに結局 guard 句が必要だ。If/else カスケードのほうがここではクリーンに読める。**Structural なケースには \`match\`、同じ値に対する不等式カスケードには \`if/else\`。**

## 次のレッスン (L7)

L7 では \`close_order_spec\` で Stage 10a を閉じる — snapshot を bridge が consume する \`CloseOrderSpec\` に変換する関数だ。Unit test は 3 つ: long-closes-with-Sell、short-closes-with-Buy、flat-position エッジケース（qty = 0）。L6 より短い — L7 の時点で compute モジュール全体は背後に揃っていて、レッスンの大半は L4 の \`unsigned_abs\` 規律と、エンジンの外向きインターフェースとの間を橋渡しすることに費やされる。
`,
                },
                {
                  title: "レッスン 7 — close_order_spec — Stage 10a の最後の関数",
                  slug: "openhl-liquidation-close-order-spec-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 20,
                  xpReward: 40,
                  content: `# レッスン 7 — \`close_order_spec\` — Stage 10a の最後の関数

## ゴール

このレッスンで掴む概念:

- **ポジションを close する基本ルール。** Long は *売って* close、short は *買って* close。Side は常にポジション方向の反対 — エンジンは side を決めるのではなく、ただ反転させるだけだ。
- **Public 境界での \`unsigned_abs\`。** L4 の規律（\`i64\` には \`abs\` ではなく \`unsigned_abs\`）が、bridge と会話する関数で表に出てくる。出力の \`Qty(u64)\` は CLOB matching engine が期待する型 — エンジンは符号変換を自分の境界に押し付ける。
- **\`close_order_spec\` が flat ポジションをフィルタしない理由。** Flat ポジションは \`qty == 0\` の spec を生成する。Bridge が submit 前にフィルタする。\`close_order_spec\` を total かつ side-effect-free に保つことで、Stage 10c の multi-account scanner と compose しやすくなる。
- **単一責任のスコープ。** \`close_order_spec\` は \`MarkPrice\` を受け取らない（market order は price を持たない）し、\`LiquidationParams\` も受け取らない（liquidate するか否かの判断は \`margin_health\` の仕事だ）。Snapshot を 1 つ入れて、spec を 1 つ出す。

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 24 テストが pass する（L4-L6 の 21 + close-side の 3 ケース用の新規テスト 3）。**Stage 10a が \`22eedf9\` に対して byte-for-byte で完成する。**

具体的な変更:

- **\`src/compute.rs\`。** \`margin_health\` の後に \`close_order_spec\` を追記し、既存のテストモジュールに unit test 3 個を加える。
- **\`src/lib.rs\`。** Compute の re-export を \`close_order_spec\` で拡張する。

L7 は Stage 10a で最短のレッスンだ。関数自体は 11 行 — このレッスンの存在理由は、side-inversion ルールをロックし、pure-compute モジュールの完成をマークすることにある。

## おさらい

L6 の後:
- \`compute.rs\` には \`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`、\`margin_health\` + \`saturate_i128_to_i64\` ヘルパー + 18 unit test + 3 proptest が揃っている。
- \`lib.rs\` は compute 関数 6 個中 5 個を re-export 済み（\`close_order_spec\` だけが残っている）。
- \`cargo test\` は 21 テストを走らせ、すべて green。

L7 で Stage 10a を閉じる。本レッスンの後、\`22eedf9\` に対する答え合わせ diff は \`compute.rs\` と \`lib.rs\` の両方で完全にクリーンになる。

## 計画

編集は 3 つ:

1. **\`crates/liquidation/src/compute.rs\` に \`close_order_spec\` を追記。** 11 行 + doc コメント。
2. **既存のテストモジュールに unit test 3 個を追加。** long-closes-with-Sell、short-closes-with-Buy、flat-position-has-zero-qty。
3. **\`crates/liquidation/src/lib.rs\` を更新。** Compute の re-export を拡張する。

> 🛑 **予測。** スクロール前に考えてほしい。\`position_size = 10\` の long ポジションを force-close する必要がある。**エンジンはどんな \`Side\` と \`Qty\` を emit するか?** 次に \`position_size = −10\` の short について、同じ問いを考える。

（答え: **Long なら \`Side::Sell\`、\`Qty(10)\`。Short なら \`Side::Buy\`、\`Qty(10)\`。** Long は売って close する。トレーダーは 10 ユニットを long で保有しているので、10 売って flat にする必要がある。Short は買って close する。トレーダーは 10 ユニットを short で保有しているので、10 買って flat にする必要がある。Quantity は常にポジションの magnitude だ。符号は side のほうが運んでいて、qty には乗らない。**\`Qty\` が \`u64\` なのは、まさに magnitude が符号を持たないからだ。**）

\`close_order_spec\` 関数は本質的に「**ポジションの side をひっくり返すだけ**」という極めて単純なメカニズムを持つ。CLOB (matching engine) と liquidation engine の間の橋を 1 枚で見ると、なぜこの関数が 11 行で済むのか、なぜ side 決定や価格決定の責務を一切持たないのかが直感で見える:

\`\`\`
   ┌─────────────────────────────┐                  ┌─────────────────────────────┐
   │ アカウントが保有中のポジション │                  │ close_order_spec が emit する  │
   │ (Account state)              │                  │ 反対方向の市場注文 (CloseOrder) │
   ├─────────────────────────────┤                  ├─────────────────────────────┤
   │  Long  size = +10             │   ──[反転]──►   │  Side::Sell    qty = 10        │
   │  (10 ユニットを保有中)        │                  │  → CLOB に「10 売り」を submit  │
   │                              │                  │  → 板の bid を順に食って fill   │
   │                              │                  │  → ポジションが flat に          │
   ├─────────────────────────────┤                  ├─────────────────────────────┤
   │  Short size = −10             │   ──[反転]──►   │  Side::Buy     qty = 10        │
   │  (10 ユニットを売り持ち中)    │                  │  → CLOB に「10 買い」を submit  │
   │                              │                  │  → 板の ask を順に食って fill   │
   │                              │                  │  → ポジションが flat に          │
   ├─────────────────────────────┤                  ├─────────────────────────────┤
   │  Flat  size =   0             │   ──[反転]──►   │  Side::Buy     qty =  0        │
   │  (保有なし、本来は呼ばれない) │                  │  → bridge がフィルタして submit せず │
   └─────────────────────────────┘                  └─────────────────────────────┘

   ※ \`close_order_spec\` が決めるのは「方向を反転」「magnitude を \`unsigned_abs\` で取り出す」の 2 つだけ。
     ・「liquidate するかどうか」の意思決定は L6 \`margin_health\` が完了させている。
     ・「いくらで close するか」の価格決定は matching engine (CLOB) の板が決める。
     ・「flat の spec を出さない」のフィルタは Bridge が submit 前に行う。
   各レイヤーがちょうど 1 つの関心事を持ち、それらが直列に compose されている。
\`\`\`

ポイントは「**この関数の本質は side のインバージョン (反転) しかない**」こと。Long ↔ Sell、Short ↔ Buy という対応は CLOB の板を介して「相殺取引」を発行するための最も単純な変換であり、ここに \`MarkPrice\` や \`LiquidationParams\` を持ち込むと、価格発見や閾値判断の責務が混入してしまう。**「ポジションを close する」という行為そのものを、最も小さい形で表現する関数** — それが \`close_order_spec\` だ。

## 手を動かす walk-through

### Step 1: \`src/compute.rs\` に \`close_order_spec\` を追記

\`crates/liquidation/src/compute.rs\` を開く。\`margin_health\` の後、\`#[cfg(test)]\` ブロックの前に追記:

\`\`\`rust
/// Generate the close-order spec for a liquidatable position.
///
/// Side is the opposite of the position direction (long → SELL, short →
/// BUY), quantity is the absolute position size. Always a market order
/// at the bridge layer — liquidation accepts any available price.
///
/// Flat positions produce a spec with \`qty == 0\`; callers should filter
/// these out before submitting, since the CLOB will reject a zero-qty
/// order. We don't filter here because liquidation engines typically scan
/// many accounts and a side-effect-free \`close_order_spec\` is easier to
/// compose.
#[must_use]
pub fn close_order_spec(snapshot: &AccountSnapshot) -> CloseOrderSpec {
    let abs_size = snapshot.position_size.0.unsigned_abs();
    let side = if snapshot.position_size.0 > 0 {
        Side::Sell
    } else {
        Side::Buy
    };
    CloseOrderSpec {
        account: snapshot.account,
        side,
        qty: Qty(abs_size),
    }
}
\`\`\`

この 11 行の関数で押さえておく点が 5 つ:

1. **Side は *常にポジション方向の反対*。** トレーダーは \`size\` ユニットを保有している（正 = long、負 = short）。Close するために、エンジンは反対 side の order を submit する: long は売って unwind、short は買って unwind。**Matching engine は close の *意図* を気にしない。Side が乗った order が来た、と見えるだけだ。「反対 side」ルールが、ポジション方向と order side との間の橋を成立させている全部だ。**

2. **\`unsigned_abs()\` が magnitude を \`u64\` として返す。** L4 と同じ規律が public 境界に現れている。\`Qty\` は \`u64\` をラップしているので、magnitude は \`Qty(abs_size)\` にそのまま流れ込む。中間の \`as u64\` キャストはいらない。**関数は符号変換を、ちょうど 1 度、符号付き position-size と符号なし order-quantity が出会う境界で行う。**

3. **\`if snapshot.position_size.0 > 0\` — strict greater-than。** Flat ポジション（\`size == 0\`）は \`else\` 分岐に落ちて \`Side::Buy\` を受け取る。Qty も 0 になるので無害だ — spec は存在するものの、意味は持たない。**関数の中で flat path を special-case しない。** Bridge が submit 前に \`qty == 0\` の spec をフィルタする。

4. **\`mark\` なし、\`params\` なし。** \`close_order_spec\` に必要なのは snapshot だけだ。「Close するか否か」の判断は \`margin_health\` に住み、price discovery は matching engine で起きる。**各関数がちょうど 1 つの関心事を所有する。Bridge がそれらを compose する: スキャン → 分類 → close spec 生成 → submit、という流れになる。**

5. **\`Option<CloseOrderSpec>\` ではなく \`CloseOrderSpec\` を値で返す。** 関数は total（全域関数）だ — flat ポジション（\`qty == 0\`）でも常に spec を返す。代替案として \`Option\` を返すと、スキャン内のすべての flat アカウントに対して呼び出し側に \`None\` を扱わせることになる — close ステップに到達する頃にはそれらのアカウントはすでに前段でフィルタされているのに、だ。**Total な関数は圧倒的に compose（結合）しやすい。Optional な関数は、すべての呼び出し側に空ケースの処理（ボイラープレート）を強用する。** 具体的に効いてくるのは Stage 10c で実装する \`LiquidationScanner\` だ: 全アカウントのスナップショットを \`filter_map\` や \`Option\` chaining なしに**単なる \`map\` や平坦な \`for\` ループで均質に処理**できる。\`close_order_spec\` が total だからこそ、scanner は「\`Liquidatable\` か \`Underwater\` か」の分類フィルタを 1 箇所で書けば済み、close-spec 生成側で再度フィルタする必要がない。**エッジケース (flat → qty 0 の spec は submit しない) のフィルタリングは、入出力の最外殻である bridge レイヤーにのみ集約する** — これが crate を貫く規律になっている。

> 🛑 **やりがちな勘違い。** 「\`if size >= 0 { Sell } else { Buy }\` ではダメか — そうすれば flat が Sell として扱われ、一部のテスト取引所と挙動が揃う」 **問題が 3 つある。** (1) Flat-as-Sell は挙動の選択であり、pure compute ではなく bridge に属する判断だ。(2) 現在の \`> 0\` は「flat ポジションは long でも short でもない」という事実を正しく反映している。(3) \`qty == 0 + Side::Sell\` の本番セマンティクスは matching engine では未定義。Bridge はどのみちフィルタしなければならない。**呼び出し側に最もクリーンな契約を提供する慣例を選ぶ — エッジケースを隠す慣例ではなく。**

### Step 2: 3 つの unit test を追加

既存の \`#[cfg(test)] mod tests { ... }\` の中、\`margin_health\` テストの後に追加:

\`\`\`rust
    // ─── close_order_spec ──────────────────────────────────────────

    #[test]
    fn close_long_with_sell() {
        let s = snapshot(10, 100, 0);
        let order = close_order_spec(&s);
        assert_eq!(order.side, Side::Sell);
        assert_eq!(order.qty, Qty(10));
        assert_eq!(order.account, AccountId(42));
    }

    #[test]
    fn close_short_with_buy() {
        let s = snapshot(-10, 100, 0);
        let order = close_order_spec(&s);
        assert_eq!(order.side, Side::Buy);
        assert_eq!(order.qty, Qty(10));
    }

    #[test]
    fn close_flat_has_zero_qty() {
        // Flat position generates a zero-qty spec; callers must filter.
        let s = snapshot(0, 100, 1_000);
        let order = close_order_spec(&s);
        assert_eq!(order.qty, Qty(0));
    }
\`\`\`

押さえておく点:

1. **\`close_long_with_sell\` は 3 つの出力フィールドすべてを assert する。** Side、qty、account — すべての出力フィールドをロックする。Bridge は 3 つすべてに依存しているからだ。3 つをまとめてテストすることで、「1 つを直したつもりで他を壊した」という部分的なリファクタリングから守られる。**出力型のテストでは、呼び出し側が読むすべてのフィールドを assert する。**

2. **\`close_short_with_buy\` は account の assert をスキップする。** Account フィールドは \`close_long_with_sell\` と同じ入力経路で来る — long で動いたなら short でも動く。**直交する軸を 1 度だけカバーし、以前のテストがすでにロックしたものを繰り返さない。**

3. **\`close_flat_has_zero_qty\` は、関数が flat ケースをフィルタしない *にもかかわらず* 存在する。** これは契約を文書化するためのテストだ: 「flat ポジションは zero-qty spec を生むと約束する。呼び出し側はそれをフィルタしなければならない」。将来のリファクタリングが誤って \`close_order_spec\` 内にフィルタを足したら（\`Default::default()\` を返したり、flat で panic したり）、このテストが失敗する。**テストは文書化された契約を保つ。「これは我々ではやらず、呼び出し側にやらせる」という契約も含めて。**

### Step 3: \`src/lib.rs\` を更新

\`crates/liquidation/src/lib.rs\` を開く。Compute の re-export を拡張する。元:

\`\`\`rust
pub use compute::{
    account_equity, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
\`\`\`

更新後:

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
\`\`\`

新規 1 名 — \`close_order_spec\` — を、アルファベット順で \`account_equity\` の直後に挿入する。これで 6 つの compute 関数すべてが re-export された。

### Step 4: テストを走らせる

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
running 24 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
test compute::tests::close_short_with_buy ... ok
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::health_at_risk ... ok
test compute::tests::health_boundary_at_maintenance ... ok
test compute::tests::health_liquidatable ... ok
test compute::tests::health_safe ... ok
test compute::tests::health_underwater ... ok
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok
test compute::tests::ratio_can_be_negative ... ok
test compute::tests::ratio_exactly_ten_percent ... ok
test compute::tests::ratio_flat_returns_max ... ok
test compute::tests::long_ratio_monotonic_in_mark_when_levered ... ok
test compute::tests::margin_ratio_deterministic ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok

test result: ok. 24 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**24 テスト pass、Stage 10a の内容が完成。** Liquidation crate の pure-compute モジュール — margin math + 分類 + close-order 生成 — があなたの workspace に揃い、\`22eedf9\` に対する答え合わせ diff は完全にクリーンになる。

エラー時にありがちなパターン:

- **\`close_short_with_buy\` が \`Side::Sell\` で失敗。** 誤って \`if snapshot.position_size.0 >= 0\` と書いてしまっている。Flat ポジションはこのテストには関係ないが、\`>=\` だと size = 0 の short（存在しない概念）が Sell に flip してしまう — そして size = −10 のテストは \`size > 0\` が false なので失敗する。方向を再確認する。
- **\`close_flat_has_zero_qty\` が関数の panic で失敗。** \`unsigned_abs()\` ではなく \`.abs()\` を入れてしまっている可能性がある。\`i64(0).abs()\` は OK だが、\`i64(-10).abs() as u64\` のパターンは L4 で挙げた \`i64::MIN\` footgun のリスクを抱える。\`unsigned_abs\` で通す。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **Side はポジション方向の反対 — それ以外のケースはない。** Long → Sell、Short → Buy。関数は「曖昧なケース」のための 3 つ目の分岐も、「不明なケース」のためのフォールバックも要らない。ポジションは符号を持つか、さもなくば flat。Spec は符号を反転するか、ゼロを運ぶ。**ポジション方向の単純な反転 (インバージョン) こそが、「ポジションをクローズ (清算) する」という行為を最もシンプルかつ正確に表現したコードである。**

2. **\`close_order_spec\` は flat ポジションに対しても side-effect-free。** 関数内でフィルタする代わりに zero-qty spec を返すことで、\`close_order_spec\` を total に、かつ compose しやすく保てる。Stage 10c の scanner は分岐なしで \`for snapshot in snapshots { specs.push(close_order_spec(snapshot)); }\` と書ける。Bridge が submit 時にフィルタする。**Pure 関数は返す。Impure な境界レイヤーがフィルタする。**

3. **関数は \`mark\` も \`params\` も受け取らない。** 各 compute 関数がちょうど 1 つの関心事を所有する: \`margin_health\` は close するか *否か* を決め、\`close_order_spec\` は *どう* close するかを決める。これらを混ぜると — 例えば \`params\` を取って liquidation fee を qty に適用すると — 2 つの責任が結合してしまう。Fee は Stage 10b（insurance fund）に属する — collateral と fee の数学が一緒に住む場所だ。**単一責任が、bridge の composition path を明白にする。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L7 の後:
- **compute.rs** は Stage 10a の \`compute.rs\` と **byte-for-byte 一致**。
- **lib.rs** は Stage 10a の \`lib.rs\` と **byte-for-byte 一致**。
- **Cargo.toml** は L1 以来一致している。

Stage 10a クレートのすべてがあなたの workspace に揃った。

## よくある質問

**Q1: \`close_order_spec\` は flat ポジションに対して \`Option<CloseOrderSpec>\` を返すべきか?**

返してもいいが、摩擦が増える。Flat ケースを気にしない呼び出し側（実際にはほとんどがそう）は、いちいち \`.expect("non-flat position")\` や \`if let Some(spec) = ...\` を書くハメになる。Total な \`CloseOrderSpec\` を \`qty == 0\` で返し、フィルタを bridge に押し付けるほうが、common case には安く済む。**\`Option\` の規律は、空ケースが *最も一般的* で、呼び出し側に処理を強要したいときに最適だ。ここでは空ケースが希少で、強要は単なるオーバーヘッドにしかならない。**

**Q2: なぜ \`Side::Sell\` 分岐で \`size > 0\`（strict）であって \`size >= 0\`（non-strict）ではないのか?**

Flat（\`size == 0\`）は long *でもなく* short *でもない* — long/short の二分法の外側にある。「flat は long」も「flat は short」も、どちらも**恣意的な (好みの分かれる) 慣例にすぎない**。ここでは flat が \`else\` 分岐に静かに落ち、qty もどのみち 0 になる、という慣例を選んだ。どちらの選択も動く。規律は **一貫性を保ち、選択を文書化すること** だ。Doc には「flat → qty 0、呼び出し側がフィルタ」と書いてあり、読者はそれをコードに対して検証できる。

**Q3: \`close_order_spec\` を \`AccountSnapshot\` のメソッド（\`snapshot.close_order_spec()\`）にできないか?**

構文的にはイエスだ — \`impl AccountSnapshot { pub fn close_order_spec(&self) -> CloseOrderSpec { ... } }\` で書ける。そうしない理由は、\`close_order_spec\` 関数を他の margin-math 関数と並べて \`compute.rs\` に住まわせたいからだ。「関連コードとの co-location」が「receiver 型との co-location」に勝つ、という判断。**\`AccountSnapshot\` はデータ運搬役（\`types.rs\` に住む）、compute は \`compute.rs\` に住む。Free-function 形式が、この分離を保ってくれる。**

**Q4: \`position_size = i64::MIN\` の場合、\`unsigned_abs\` はそれを処理するか?**

イエス、設計どおりだ。\`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808u64\`（\`u64::MAX / 2 + 1\`）になる。Signed の \`i64::MIN.abs()\` はオーバーフローする（i64 には正の対応物が表現できない）。\`unsigned_abs\` は magnitude を \`u64\` で返すので、常に余裕がある。**これがそのまま L4 の規律だ: magnitude には \`unsigned_abs\`、\`abs\` を使ってよいのは値が \`MIN\` ではないと確信できるときだけ。**

**Q5: テスト fixture の \`snapshot\` 関数が \`(size, entry, mark, collateral)\` ではなく \`(size, entry, collateral)\` を取るのはなぜか — テスト対象の関数は snapshot を取り、通常 mark も必要なのに?**

\`close_order_spec\` は snapshot しか取らない — mark を要求しない。L4 から共有してきた \`snapshot\` fixture は、snapshot のうち意味のある 3 フィールド（account はハードコード）だけを取り、mark は運ばない。Mark は、テスト対象の関数へ別途 \`MarkPrice(...)\` 引数として渡される。**Fixture は *型* が要求するものを構築する。テストは *呼び出し* が要求するものを供給する。**

## 次のレッスン (L8) — Stage 10b が始まる

L8 で Stage 10b — insurance fund — が始まる。L7 で完成した pure-compute モジュールが *何が起きるべきか* のレイヤーだとすると、Stage 10b は *何が起きたかを記録する帳簿* を足すレイヤーだ。Fund の balance を track し、underwater liquidation からの不足を吸収し、solvent な close から liquidation fee を credit する \`InsuranceFund\` state machine が入る。Stage 10b の後、エンジンは「このアカウントは Liquidatable」だけでなく「この close は fund に 1.5% を credit した」あるいは「この close は fund から $400 を drain した」も知ることになる。

**本レッスンのドラフト時点で、Stage 10b はまだ openhl に ship されていない。** L8 は、openhl 側の実装が来たタイミングで rethlab に着地する。
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
