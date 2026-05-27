// AUTO-GENERATED from drafts/openhl_liquidation_*_ja.md by .github/scripts/build-openhl-liquidation-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlLiquidationJA(prisma: PrismaClient) {
  const tags = ["reth","evm","liquidation","perpetual","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-liquidation-ja",
      title: "Step 5. Liquidation：レバレッジ環境における非単調性の発見と清算エンジンの構築",
      description:
        "永久先物（Perpetual Futures）の清算エンジン中核をEnd-to-Endで実装する、DIY Perpシリーズ第5弾。\n\nアカウントの4フェーズ分類（pure compute）、保険基金（Insurance Fund）のステートマシン、そしてマルチアカウント・スキャナーを1つのオーケストレーション・ループへ結合する。さらに、レバレッジ環境特有の「非単調性」を proptest で炙り出す手法や、debug_assert! による契約検証まで網羅する。Liquidation三部作に対応する全13レッスンを通じ、バイト単位（Byte-for-byte）で一致する堅牢な実装を構築する。",
      difficulty: "EXPERT",
      duration: 440,
      xpReward: 870,
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
- Liquidation参照実装（計算パート） マイルストーン時点で **24+ tests passing**、capstone までにさらに増える。各 compute 関数の hand-traced unit test、margin-ratio の単調性と determinism を狙う proptest、insurance fund の保存則 invariant が並ぶ。
- **3 つの building block**。fixed-point types モジュール、純粋な compute モジュール（margin math）、そして state machine（insurance fund、Liquidation参照実装（保険基金パート））と multi-account scanner（Liquidation参照実装（スキャナパート））。
- 全 validator が同じ結果に到達する **4 状態の margin classification**（\`Safe\` / \`AtRisk\` / \`Liquidatable\` / \`Underwater\`）。

理解できるようになることは:

- perp DEX が liquidation をオフチェーンプロセスに外注できない理由。外注した時点で consensus 上で支払い能力を主張できなくなる。
- Hyperliquid 型 margin model: cross-margin、mark-vs-entry、initial-vs-maintenance。
- Margin health の 4 状態と、それぞれが engine に何を許可するか。
- \`margin_ratio\` の **非単調エッジケース**。collateral が notional を支配するとき、ratio が mark の方向と逆に動くケースが生じる。それでもなお liquidation が壊れない理由。
- insurance fund を**単なる \`u64\` の残高変数 (balance entry) ではなく、独自の遷移ルール (\`deposit\` / \`withdraw\` / \`absorb_deficit\` の不変条件) を持つ pure state machine** として作る理由。
- Auto-deleveraging (ADL) がこの設計の端でどう位置づけられるか。そして Liquidationコースでは扱わない理由。

## なぜ liquidation が重要か（perp 1 段落）

永久先物はレバレッジの効いたポジションだ。トレーダーは \`collateral\` (USDC) を預け、\`entry\` 価格で \`size\` のポジション（符号付き: 正 = ロング、負 = ショート）を開く。ポジションの *unrealized PnL* は mark 価格とともに動く。ロングは mark > entry で利益、mark < entry で損失だ。損失が collateral を食って \`equity / notional\` が **maintenance margin** 要件を下回ると、アカウントはもう損失をカバーしきれない。ここで engine が動く — market でポジションを force-close し（反対 side、フルサイズ）、**liquidation fee** を collateral から差し引いて insurance fund に積み立て、equity がまだ正なら残りをアカウントに返す。Close する前に equity が *負* になっていたら — いわゆる「underwater」ケース — 不足分は insurance fund が吸収する。これがメカニズムのすべてだ。

## なぜ レッスン1 perp DEX は consensus 内で liquidation を実行するのか

ある種のデリバティブ venue は liquidation をオフチェーンの liquidator プロセスに外注する。アカウント状態を scan して \`liquidate(account)\` endpoint を呼ぶ bot だ。低頻度の settlement system（クレジットデフォルトスワップなど）ならこれで機能するが、perp のスピードでは破綻する。50× のレバレッジを賭けた HYPE position は、ニュースの cascade で数秒のうちに healthy から underwater に反転しうる。検知から close までの RPC ラウンドトリップの遅延は、丸ごと chain 側の損失として残る。

Hyperliquid は liquidation を **consensus 内** で実行する。すべての validator が、すべての block で、どのアカウントが maintenance を下回っているかを独立に計算する — 同じデータから、同じコードで。Engine の出力である close orders と insurance-fund movements は block の一部になる。**敵対的な市場の動きのもとで chain が支払い能力を保つ手段は、これ以外にない。**

この保証の代償が determinism の規律だ。float 演算は禁止。すべての classification は validator 間で byte-identical でなければならない。すべての overflow は panic ではなく saturate しなければならない。Funding コース（\`openhl-funding\`）でこの規律との最初の本格的な遭遇があった。本コースは 2 回目になる。

## なぜ liquidation に float を使えないのか

Funding と同じ答え: consensus determinism のためだ。あるアカウントを \`Liquidatable\` と分類する validator と、同じアカウントを \`AtRisk\` と分類する validator がいると、生成される block が違ってくる — close orders も違えば、fees も違い、insurance-fund deltas も違う。Block proposal が分岐し、chain が fork する。

直し方は決まっている。符号付き整数を使い、**飽和演算 (saturating arithmetic — オーバーフロー時に panic も wrap もせず型境界値 \`i64::MAX\` / \`i64::MIN\` に張り付かせる演算、Rust では \`saturating_add\` / \`saturating_mul\` 等)** を通し、i64 でオーバーフローしうる乗算には i128 の中間値を経由させる。\`MarginRatio\` の固定小数点単位には \`MARGIN_SCALE = 10_000\`（basis points）を採用する。Bps は TradFi *でも* crypto perp venue でも margin の慣例単位だ — Hyperliquid、Binance、Drift はいずれも margin 要件を bps で表現する。\`MarginRatio(1_000)\` はちょうど 10%、\`MarginRatio(MARGIN_SCALE)\` はちょうど 100%。

（Funding は parts-per-billion の精度が必要だったので \`RATE_SCALE = 1_000_000_000\` を選んだ。Liquidation はそこまでの精度を要求しないが、規律自体は同じだ。）

## 14 レッスン

### セクション0 — Orientation
- **L0**（本レッスン）— なぜ liquidation か、なぜ margin model か、3 サブステージの roadmap。

### セクション1 — 型（レッスン1〜3）
- **レッスン1** — \`MARGIN_SCALE = 1e4\`（bps）+ \`LiquidationParams\` + \`hyperliquid_default()\`（10% / 2% / 1.5%）。bps を選ぶ理由、このデフォルト値の根拠。
- **レッスン2** — \`MarginRatio\` newtype + \`MarginHealth\` enum（\`Safe\` / \`AtRisk\` / \`Liquidatable\` / \`Underwater\`）。4 状態にする理由と、各状態が許可する挙動。
- **レッスン3** — \`AccountSnapshot\` + \`CloseOrderSpec\`。\`funding::Position\` を流用せず新しい snapshot 型を起こす理由 (**read-only な不変 snapshot 型に分離して、リスク計算のコアロジックを上流レイヤー (bridge / clearing) のミュータブルな state shape から疎結合に保つ**)、そして bridge レイヤーがどう組み立てるか。

### セクション2 — 純粋な compute（レッスン4〜7）— Liquidation参照実装（計算パート）
- **レッスン4** — \`notional_value\` + \`unrealized_pnl\`。ロング・ショートいずれでも符号が正しく揃う signed-multiplication のトリック。
- **レッスン5** — \`account_equity\` + \`margin_ratio\`。Collateral が notional を支配するときに姿を現す **非単調エッジケース (= 価格が好転しているように見えるのに、特定の条件下ではマージン比率が逆に悪化して見える現象)** を proptest で検出し、\`prop_assume!\` がなぜ正しい修正なのかを見る。
- **レッスン6** — \`margin_health\` 分類。境界条件にすべて strict less-than を採用する理由と、それが何を保証するか。
- **レッスン7** — \`close_order_spec\`。Market order の規律 — liquidation は利用可能な任意の価格を取る。ここで Liquidation参照実装（計算パート） が完成する。

### セクション3 — Insurance fund（レッスン8〜10）— Liquidation参照実装（保険基金パート）
- **レッスン8** — \`InsuranceFund\` 構造体 + \`deposit\` / \`withdraw\`。Single-balance な state machine。
- **レッスン9** — \`absorb_deficit\`。Underwater liquidation が fund をどう drain するか。
- **レッスン10** — \`credit_fee\`。liquidation fee が collateral から fund へ流れる。Composition test として、1 回の liquidation が deeply underwater な場合に fee を credit し *かつ* deficit を absorb する複合ケースを扱う。

### セクション4 — Scanner + Capstone（レッスン11〜13）— Liquidation参照実装（スキャナパート）
- **レッスン11** — Scanner の型語彙: \`CloseOutcomeKind\`、\`LiquidationRecord\`、\`ScanReport\`、\`LiquidationScanner\`。Scan loop が後で組み合わせる scaffolding 型と builder API。
- **レッスン12** — \`scan\` — セーフティ・カスケードの orchestration の心臓: \`&[AccountSnapshot]\` を順に辿り、各アカウントを分類し、\`Liquidatable\` と \`Underwater\` には close order を emit し、insurance-fund delta を返す。Composition layer の本体。
- **レッスン13** — Capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Liquidation三部作の振り返り。総合、bridge integration の preview、市場構造コンテキスト — on-chain CLOB liquidation が CEX の liquidation や ADL とどう違うか。

## モジュールごとの SHA pinning

各レッスンは build に使う openhl commit を引用する。本コースは Liquidation参照実装の3パート（計算・保険基金・スキャナ）にまたがる:

| Module | レッスン | openhl SHA |
|---|---|---|
| 0 | L0 | \`22eedf9\` (Liquidation参照実装（計算パート）) |
| 1 | レッスン1〜3 | \`22eedf9\` (Liquidation参照実装（計算パート）) |
| 2 | レッスン4〜7 | \`22eedf9\` (Liquidation参照実装（計算パート）) |
| 3 | レッスン8〜10 | *Liquidation参照実装（保険基金パート） — TBD* |
| 4 | レッスン11〜13 | *Liquidation参照実装（スキャナパート） — TBD* |

TBD の行は Liquidation参照実装（保険基金パート） と Liquidation参照実装（スキャナパート） が ship した時点で更新する。それまで セクション3、4 はスケルトン状態だ。一方で セクション1-2 のコンテンツ（pure-compute 側のすべて）は \`22eedf9\` に対して完全に書き起こしてあり、Liquidation参照実装（計算パート） を end-to-end で進められる状態になっている。

## 前提

本コースを最大限活用するには、以下があるとよい:

- **Step 4 (Funding)（openhl-funding）** が頭の中にあること。全レッスンを覚えている必要はないが、funding で使った fixed-point / saturating 演算 / pure state machine というパターンは本コースでもそのまま再登場する。Funding が難しかったなら本コースも難しい。
- **Step 2 (CLOB)（openhl-clob）** の \`AccountId\`、\`Side\`、\`Qty\`。これらを直接再利用するため。Matching engine の内部まで遡る必要はない。
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
cargo build --workspace  # ベースライン — レッスン1 前にこれが通ること
\`\`\`

リファレンスチェックアウト（各レッスン末の答え合わせ diff 用）:

\`\`\`bash
cd ~/code/openhl-reference  # 自分の作業ツリーとは別のチェックアウト
git checkout 22eedf9
\`\`\`

（または同じ workspace を使い、参照のときに \`git stash\` する。どちらでもよい。）

## コーススタイル

各レッスンは Step 1（Consensus）〜 Step 4（Funding）で確立した build-along フォーマットに従う:
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

セクション2（pure compute）はStep 2（CLOB） の matching engine と比べて proof-heavy で code-light な作りだ。**エッジケースの前ではペースを落とすこと。** レッスン5 の levered-regime 非単調性は、ほとんどの読者にとって最初のメンタルモデルが壊れる場所だ。そこを丁寧に再構築する。

## 準備完了

レッスン1 に進む。\`MARGIN_SCALE\` を整え、ネットワークのリスクパラメータを収める \`LiquidationParams\` 構造体を作る。
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

レッスン1 にテストはない。\`MARGIN_SCALE\` は値、\`LiquidationParams\` は受動的な構造体だからだ。レッスン2 で初めて挙動を持つ型（\`MarginHealth\` enum）が登場し、最初の unit test もそこで生まれる。

## おさらい

レッスン0の後:
- perp DEX が liquidation をオフチェーンではなく consensus 内で実行する理由を理解している。
- float が chain-fork hazard になる理由を理解している（funding と同じ論理）。
- Liquidation クレートのスキャフォールド（Cargo.toml + 空の \`src/lib.rs\`）は Liquidation参照実装（計算パート） 前から workspace に置かれている — funding crate のときと同じ流儀だ。

レッスン1 では、この空の crate を、公開された scale 定数 1 つと、エンジン全体を支配するパラメータを持つ実体ある crate に育てていく。

## 計画

編集は 3 つ。Funding レッスン1 と同じ形だが、依存が 1 つではなく 2 つになる:

1. **\`crates/liquidation/Cargo.toml\`** — \`[dependencies]\` に \`openhl-clob = { path = "../clob" }\` と \`openhl-funding = { path = "../funding" }\` を追加する。レッスン5 / レッスン6 で使う \`proptest\` を含めた \`[dev-dependencies]\` ブロックも併せて足す。
2. **\`crates/liquidation/src/types.rs\` を作成。** bps の根拠を説明するモジュール docs、\`MARGIN_SCALE\` 定数、\`LiquidationParams\` 構造体、impl ブロックを置く。
3. **\`crates/liquidation/src/lib.rs\`** を空のままから書き起こし、クレート docs、\`pub mod types;\`、\`pub use types::{LiquidationParams, MARGIN_SCALE};\` を加える。

> 🛑 **予測。** スクロール前に: funding は \`RATE_SCALE = 1_000_000_000\`（parts-per-billion、9 decimal digits の精度）を使う。それなのに liquidation は \`MARGIN_SCALE = 10_000\`（basis points、4 decimal digits）にする — なぜか? ヒント: 表現すべきマグニチュードを思い出す。funding rate は 1 区間で \`0.0001\` から \`0.04\`、margin 要件は notional の \`0.02\` から \`0.10\`。

（答え: **必要な解像度は、意味のある最小ステップに従って決める。** 1 区間 \`0.0001%\` の funding rate は高ボリュームトレーダーにとって意味のある差だから、ppb が正しい解像度になる。一方で maintenance margin が \`0.02%\` か \`0.05%\` かは engine 層で意味のある差には **ならない** — 本番のデプロイは bps の整数（\`200 bps\`、\`500 bps\`）で maintenance を設定する。Bps は慣例単位だ。ppb を採用してしまうと、システムが実際には使わない精度を買い込む。**実際のレンジをカバーする最小のスケールを選ぶ。**）

\`RATE_SCALE\` と \`MARGIN_SCALE\` の解像度差を 1 枚で並べると、なぜそれぞれが「自分のドメインに対して必要十分」なのかが直感で見える:

\`\`\`
                       Step 4（Funding）              Step 5（Liquidation）
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
3. **\`[dev-dependencies]\` ブロック** に \`proptest\` を入れる。レッスン5（margin-ratio の単調性テスト）と レッスン6（margin-health の determinism テスト）で使うので、宣言だけ先に済ませておく。

> 🛑 **やりがちな勘違い。** 「レッスン5 / レッスン6 で使うならテスト用、両方 dev-dep でよいのでは?」 **そうではない。production コードのほうも \`MarkPrice\` や \`AccountId\` を \`compute.rs\` の関数シグネチャで使う — テスト専用ではない。** Funding でも レッスン1 で同じ判断をした。ルールは単純で、\`pub fn\` シグネチャに現れる型は dev-only ではなく通常の dep に置く必要がある。

### Step 2: \`src/types.rs\` を作成

\`crates/liquidation/src/types.rs\` を作る。このファイルはまだ存在しないので、このレッスンで新規作成する。初期内容は以下:

\`\`\`rust
//! Core types for the liquidation engine.
//!
//! Pure data — no I/O, no allocation. Every type is \`Copy\`-friendly so the
//! engine can be invoked on snapshots taken at the bridge layer without
//! lifetime gymnastics. The convention follows \`openhl-funding\`: the
//! liquidation crate never owns mutable state in Liquidation参照実装（計算パート）; it computes
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
/// (Liquidation参照実装（保険基金パート）). A typical HL-style value is 1–2% (100–200 bps).
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
    /// for larger position sizes) — out of scope for Liquidation参照実装（計算パート）.
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
//! Pure compute in Liquidation参照実装（計算パート）: no I/O, no async, no networking. Liquidation
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

レッスン11 終了時のバージョンと比べて欠けているものは、\`pub mod compute\`、それから \`MarginHealth\`、\`MarginRatio\`、\`AccountSnapshot\`、\`CloseOrderSpec\` の \`pub use types::{...}\` 再エクスポートだ。これらは レッスン2-レッスン7 で型と compute 関数を加える流れで揃ってくる。**レッスン1 の lib.rs はコンパイルが通る最小構成にとどめる。**

クロスリファレンスの \`[\`MarginHealth\`]\` は レッスン2 で enum が登場するまで未解決のままだ。Rustdoc は warning を出すが、これは受け入れる（funding レッスン1 と同じ扱い）。

> 🛑 **予測。** 名前を明示した 2-name の再エクスポートではなく、\`pub use types::*;\` と書いたら何が起きるか? ヒント: レッスン1 後と レッスン7 後の \`types.rs\` にどんな型が住むか、そしてどの API surface に commit したいのかを考える。

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

\`MarginHealth\` への未解決リンクが残るので rustdoc warning が 1 つ出る（レッスン2 で型が追加されれば消える）。**ここで抑制しないこと。** 何が欠けているかを build が教えてくれている合図だ。

エラーが出た場合に多い原因:

- **\`error[E0463]: can't find crate for 'openhl_clob'\` または \`'openhl_funding'\`** — Cargo.toml の \`path = "..."\` 依存を片方入れ忘れている。レッスン1 のコード本体ではまだ使っていないが、レッスン3 の import を先取りして書いていると発火する。
- **\`error[E0583]: file not found for module 'compute'\`** — lib.rs に \`pub mod compute;\` を先取りして書いてしまった。削除すれば直る。レッスン4 で改めて戻ってくる。
- **\`error: failed to parse manifest\`** — Cargo.toml の syntax エラー。よくあるのは \`[dev-dependences]\` のような typo。

## 設計の振り返り

このレッスンの load-bearing な決定は 3 つ:

1. **\`MARGIN_SCALE = 10_000\` にする。\`1_000_000_000\` ではない。** Funding の \`RATE_SCALE\` より 2 桁細かくしてもズレるだけだ — 本番の margin パラメータが ppb で設定されることはない。逆に 2 桁粗くする（\`100\`、percent）と意味のある解像度を失う。**Bps は margin に対して世界が落ち着いた単位だ。我々もそれに合わせる。**

2. **Default constructor は \`const fn\` で書き、\`Default\` impl は使わない。** 両方とも正しくない理由を整理しよう。\`Default::default()\` は多くの型で「妥当な zero っぽい」デフォルトを返すが、\`LiquidationParams::default()\` が「margin ゼロ、fee ゼロ」を示唆するのは **危険** だ — その値で動かしたネットワークでは liquidation がそもそも起きない。**\`hyperliquid_default()\` は名前付きで意図的なデフォルトとして立てる。** 呼び出し側に名前で要求させることで、安全性に関わる性質を視界に残し続けられる。

3. **3 つの独立した \`u32\` フィールドにする。ネスト型 \`LiquidationConfig\` 構造体は作らない。** 将来 tiered maintenance margin（HL 流の「大きな position には高い maintenance %」）に移行する局面では \`Vec<MaintenanceTier>\` フィールドが欲しくなるかもしれない。だが今は加えない — 先取りした一般化になってしまう。**Liquidation参照実装（計算パート） は flat margin で進める。Liquidation参照実装（スキャナパート）+ で tiered が必要になったら、そのときに再検討する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/Cargo.toml ./crates/liquidation/Cargo.toml
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

レッスン1 の後:
- **Cargo.toml** は Liquidation参照実装（計算パート） と完全一致する。
- **types.rs** は Liquidation参照実装（計算パート） の types.rs の *最初の ~50 行* と一致する。モジュール doc、\`MARGIN_SCALE\`、\`LiquidationParams\`、impl までだ。残り（\`MarginRatio\`、\`MarginHealth\`、\`AccountSnapshot\`、\`CloseOrderSpec\`）は レッスン2 / レッスン3 で追加する。
- **lib.rs** は Liquidation参照実装（計算パート） の lib.rs の *最初の ~25 行* と一致する。クレート doc、\`pub mod types;\`、2 つの再エクスポートまで。残りの再エクスポートはそれぞれの型を加えるタイミングで揃えていく。

## よくある質問

**Q1: \`MARGIN_SCALE\` をクレート doc と一緒に \`lib.rs\` に置かないのはなぜ?**

スケールする対象の型システムと同じ場所に置くのが筋だからだ。\`types.rs\` は unit-of-account（margin ratio、bps、分類しきい値）に関するものがすべて住む場所。lib.rs は public-API surface だ。\`MARGIN_SCALE\` を types.rs に置いてクレートルートに re-export するほうが、source of truth を分散させるよりクリーンになる。

**Q2: \`LiquidationParams\` の constructor で \`maintenance ≤ initial\` を検証すべきか?**

Liquidation参照実装（計算パート） では検証しない。構造体は任意の組み合わせを受け入れる。Liquidation参照実装（スキャナパート） で \`validated()\` constructor を別途追加し、genesis を読み込む側のコードから呼ばれたときに \`Result<Self, ParamsError>\` を返す形にする。検証なしの素の constructor は、test や proptest generator が *病的な* 入力を食わせたい場合のためにそのまま残す。

**Q3: なぜ \`hyperliquid_default()\` が 10% / 2% / 1.5% で、他の値ではないのか?**

HL の実際の maintenance margin tier は position size に応じて 1.25% から 6.67% の範囲に分布する。代表的な中間値として 2% を選んだ。Initial が maintenance の 10 倍というのもよく見る配分だ。Fee の 1.5% は ETH/BTC の公開 HL 値で、軽い資産ではもっと低くなる。**どの数字も特権ではない。あなたのネットワークが自分で設定すればよい。**

**Q4: Margin ratio の計算で実際の i64 overflow リスクは?**

\`margin_ratio = equity * MARGIN_SCALE / notional\`。\`MARGIN_SCALE = 10_000\` のもと、\`equity\` と \`notional\` が \`i64::MAX\` で bound されているとすると、積 \`equity * MARGIN_SCALE\` は \`equity > i64::MAX / 10_000 ≈ 9.2e14\` で i64 を overflow しうる。現実的な取引所スケールに直すと 920 兆ドルの equity だ — 妥当な入力からははるか上にある。ただし レッスン5 では依然として乗算を \`i128\` で行い、i64 に saturate して戻す。**設計の規律としては funding と同じ — i64 を超えうる積は、敵対的な入力では必ず超えるものと想定する。**

**Q5: \`MARGIN_SCALE\` と bps に \`u32\` を使って、i64 への変換ノイズを避けられないか?**

避けられる。\`i64::from(...)\` の呼び出しが数回減るのも事実だ。代償として、あらゆる margin-ratio 計算が \`equity\`（signed）と \`notional\`（unsigned）を含むので、演算で signed と unsigned を混ぜるたびに各サイトで明示的キャストが必要になる。境界で 1 回 i64 にアップキャスト（\`i64::from(params.initial_margin_bps)\`）してしまい、その後の演算は signed で通すほうが綺麗だ。**境界で変換し、計算は 1 つの型で揃える。**

## 次のレッスン (レッスン2)

レッスン2 では \`MarginRatio\` newtype と \`MarginHealth\` enum を追加する。\`MarginHealth\` は load-bearing な分類型で、これ以降の 5 レッスンはどれもこの型を return するか consume するかのいずれかだ。\`bool\` でも \`u8\` でもなく 4-variant enum を選んだ理由を見ていく。
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

- **\`src/types.rs\`** — 既存の \`MARGIN_SCALE\` 定数と \`LiquidationParams\` 構造体の下に、\`MARGIN_SCALE\` スケールの \`MarginRatio\` newtype と \`MarginHealth\` enum を加える。レッスン1 で書いた部分には触らない。
- **\`src/lib.rs\`** — 既存の \`pub use types::{...}\` 再エクスポートに \`MarginRatio\` と \`MarginHealth\` を足す。

レッスン2 にもテストはない。\`MarginRatio\` と \`MarginHealth\` はどちらも受動的なデータ型だからだ。レッスン3 で \`AccountSnapshot\` と \`CloseOrderSpec\` を加え、types モジュールを閉じる流れになる（こちらもテストなし）。最初の挙動テストは レッスン4 の \`notional_value\` でようやく登場する。

## おさらい

レッスン1 の後:
- クレートには \`MARGIN_SCALE\`（10⁴）と、\`hyperliquid_default()\` を備えた \`LiquidationParams\` がある。
- \`lib.rs\` は両方を \`types\` から再エクスポートしている。
- \`cargo build -p openhl-liquidation\` が pass する。\`MarginHealth\` への rustdoc warning が 1 つ残っているはずだ（この時点ではまだ未解決）。

レッスン2 ではエンジンの残り部分が言葉として使う 2 つの分類型を追加する。レッスン4 以降、\`margin_ratio\` は \`MarginRatio\` を返し、\`margin_health\` は \`MarginHealth\` を返す形になる。

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

下流のエンジン挙動 (レッスン7 / セクション3 で実装):
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
/// fund absorbs that shortfall (Liquidation参照実装（保険基金パート）).
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
    /// the shortfall — handled in Liquidation参照実装（保険基金パート）.
    Underwater,
}
\`\`\`

この 25 行で気づきたい点が 5 つ:

1. **\`MarginRatio(pub i64)\` は newtype。** \`type MarginRatio = i64\` の alias ではない。Newtype は型チェッカーに足場を与える — \`MarginRatio\` を取る関数を、balance や account ID、\`MarkPrice\` のつもりで渡した生の \`i64\` 値では呼べなくなる。\`pub i64\` フィールドにしてあるので、呼び出し側は \`MarginRatio(1000)\` で組み立てて \`ratio.0\` で読み出せる。**内部に不正な状態を持ち得ない (= どんな \`i64\` 値が入っても型として不正にならない、つまり守るべきカプセル化不変量がない) ため、無駄にゲッター/セッターで隠蔽せず、透明なデータコンテナとしてシンプルに保っている。**「\`Vec\` を \`MyVec\` の private フィールドにラップして \`len()\` を再公開する」ような防壁は、不変量を守るためのコストであって不変量がないところに払うべきではない。

2. **\`MarginRatio\` は \`Default\`、\`PartialOrd\`、\`Ord\`、\`Hash\` まで広めに derive している。** これらが engine 側から要求されているわけではないが、下流のコード（telemetry、Liquidation参照実装（スキャナパート） の worst-health 順 scanner、ダッシュボード）が \`MarginRatio\` を他の比較可能な値型と同じように扱えるようにしておく狙いがある。\`MarginRatio::default()\` は \`MarginRatio(0)\` で、意味としては「ratio 未計算」または「ゼロ初期化済み」だ。Engine 自身は \`default()\` を読むことはなく、必ず snapshot から計算する。

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

レッスン1 で出ていた \`[\`MarginHealth\`]\` への rustdoc warning は、型が実体を得たことでここで解消する。

### Step 3: コンパイル

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

Warning はゼロ。レッスン1 で残っていた \`MarginHealth\` の rustdoc warning も消える。

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

レッスン2 の後:
- **types.rs** は Liquidation参照実装（計算パート） の types.rs の 1 行目から \`MarginHealth::Underwater\` までと一致する。レッスン1 で書いた \`MARGIN_SCALE\` + \`LiquidationParams\` に、新たに \`MarginRatio\` と \`MarginHealth\` を載せた形だ。次に来る 2 型（\`AccountSnapshot\`、\`CloseOrderSpec\`）は レッスン3 で扱う。
- **lib.rs** は Liquidation参照実装（計算パート） の lib.rs から \`compute\` モジュールと追加 6 件の再エクスポートを除いた状態と一致する。これらは レッスン4〜7 で揃える。

## よくある質問

**Q1: なぜ \`MarginRatio\` は \`Display\` を実装しないのか?**

実装してもよい — 値は単に bps 単位の i64 だ。実装していない理由は、production のコードパスのどこも \`MarginRatio\` をエンドユーザー向け表示として直接フォーマットしないからだ。bridge レイヤーが \`.0\` を取り出し、既知のスケールに合わせて render する（\`"{}%"\`、\`ratio.0 / 100\`）。ここで \`Display\` を加えると、呼び出し側が \`MarginRatio\` を生の整数のままログに出す癖を呼び込み、bps スケールが見えなくなる。**Trait は必要とするレイヤーで実装する。**

**Q2: \`MarginHealth\` を \`u8\` にしてメモリを節約できないか?**

Payload を持たない 4 variants の場合、Rust の enum レイアウトはすでに \`u8\` に収まっている — \`size_of::<MarginHealth>() == 1\`。コンパイラが最小の discriminant を選ぶ。生の \`u8\` に切り替えれば、名前付き variants と \`match\` の exhaustiveness check を失うだけで、得るものは何もない。

**Q3: Variant に payload を持たせるべきか（例: \`AtRisk { headroom_bps: u32 }\`）?**

魅力的に見えるが時期尚早だ。下流の consumer（Liquidation参照実装（スキャナパート） scanner、ダッシュボード）は、必要な情報を背後の margin_ratio から再導出する。Variant payload を持たせると構築コストが乗り、\`match\` の使い勝手も複雑になる。**すべての consumer が payload から利益を得るのでない限り、enum は payload なしに保つ。**

**Q4: \`Liquidatable\` が「close + 場合によって deficit absorb」を含意できるなら、なぜ \`Underwater\` を別 variant にするのか?**

bridge が両ケースで *別の挙動* を取らねばならないからだ。\`Liquidatable\` のアカウントは close order を 1 つ生成し、engine は fee と残額を通常通り settle する。\`Underwater\` のアカウントは close order に加えて、bridge が atomic に適用しなければならない credit-to-insurance-fund エントリも生成する。Variants を分けておけば、ケースの違いを型レベルまで押し上げられ、網羅的な \`match\` がそれを拾ってくれる。マージすると、判別が bridge 内のランタイム分岐に押し下げられ、見落としやすくなる。**State machine は、自分が trigger する action を反映した variants から利益を得る。**

**Q5: \`margin_health\` は flat なポジションに対して \`Option<MarginHealth>\` を返すべきか?**

いいえ。flat なポジションは \`MarginHealth::Safe\` を返す（notional がなく、満たすべき margin 要件もないため）。\`Option\` で包んでしまうと、すべての呼び出し側に \`None\` を明示処理させる— 「flat = safe」は曖昧さがないのに、だ。**型システムですでに扱える状態をわざわざ \`Option\` で表現しない。**

## 次のレッスン (レッスン3)

レッスン3 では、すべての margin 関数の入力となる \`AccountSnapshot\` と、エンジンが bridge へ渡す出力となる \`CloseOrderSpec\` を加え、types モジュールを閉じる。レッスン3 を終えれば types モジュールは完成だ。レッスン4 からは compute モジュールに移り、\`notional_value\` から書き始める。
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

- **\`src/types.rs\`** — 既存の \`MarginHealth\` enum の下に \`AccountSnapshot\` と \`CloseOrderSpec\` を追記する。レッスン1 や レッスン2 で書いた部分には触らない。
- **\`src/lib.rs\`** — \`pub use types::{...}\` 再エクスポートに \`AccountSnapshot\` と \`CloseOrderSpec\` を加える。

レッスン3 にもテストはない。どちらの新しい構造体も受動的なデータコンテナだからだ。レッスン4 で \`compute\` モジュールに着手し、そこで最初の挙動テスト（\`notional_value\`）が登場する。

## おさらい

レッスン2 の後:
- \`types.rs\` には \`MARGIN_SCALE\` と \`LiquidationParams\`（レッスン1）に加え、\`MarginRatio\` と \`MarginHealth\`（レッスン2）が並んでいる。
- \`lib.rs\` は 4 つの名前 — \`LiquidationParams\`、\`MarginHealth\`、\`MarginRatio\`、\`MARGIN_SCALE\` — を再エクスポートしている。
- \`cargo build -p openhl-liquidation\` が warning ゼロで pass する。

レッスン3 では 2 つの **I/O 型**を加える。あらゆる margin 関数が consume する入力 \`AccountSnapshot\` と、エンジンが bridge に渡す出力 \`CloseOrderSpec\` だ。レッスン3 を終えると types モジュールが完成し、Step 5 (Liquidation) の セクション1 が閉じる。

## 計画

編集は 2 ファイル分、いずれも追記のみ:

1. **\`crates/liquidation/src/types.rs\` に \`AccountSnapshot\` を追記。** 4 フィールド、\`Copy\`-friendly。約定が積み重なる中で \`avg_entry\` を保つ責務が呼び出し側にあることを、doc コメントで明示する。
2. **\`CloseOrderSpec\` をその下に追記。** 3 フィールド、price フィールドなし。doc コメントで bridge を消費者として指名する。
3. **\`crates/liquidation/src/lib.rs\` を更新。** \`pub use types::{...}\` 行を拡張する。

> 🛑 **予測。** スクロール前に: liquidation はアカウントごとに unrealized PnL を計算する必要がある。式は \`(mark - entry) * size\` だ。**\`funding::Position\` から得られない入力は何か、そしてなぜ funding ではそれが要らなかったのか?** ヒント: funding の式は \`size * mark * rate\`。ここから何が抜けているかを比べる。

（答え: **\`avg_entry\`（PnL の項を計算するため）と \`collateral\`（equity を計算するため）の 2 つだ。** Funding の式に \`entry\` 係数は出てこない — ポジションがどこで開かれたかに関係なく、現在の mark に rate を掛けてスケールするだけだ。Funding はまた collateral を読まない。Funding が emit する settlement delta は bridge レイヤーで balance に適用され、balance 台帳の管理は bridge 側に閉じている。Liquidation の仕事は、\`collateral + unrealized PnL\` がしきい値を下回ったかを *測る* ことなので、両方の値が手元に揃っている必要がある。仕事が違えば snapshot も違う。）

レッスン3 で完成する \`types\` モジュールが、エンジン全体に対して **どんな入力を受け、どんな出力を返すか**を 1 枚で見ると、セクション1 (型) から セクション2 (純粋計算) へ向かう接続点がはっきりする:

\`\`\`
                    [ 上流: bridge / clearing レイヤー (台帳の所有者) ]
                              │
                              │ tick ごとに各アカウントの
                              │ 台帳から snapshot を構築
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ 入力: AccountSnapshot { account, position_size, avg_entry,          │
   │                         collateral }                                │
   │   ※ 不変・read-only・Copy。レッスン3 で確定。                                │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ ★ liquidation エンジン (セクション2-4 で実装するすべて)                 │
   │                                                                     │
   │   レッスン4: notional_value / unrealized_pnl  (純粋計算)                    │
   │   レッスン5: account_equity / margin_ratio   (純粋計算)                    │
   │   レッスン6: margin_health                    (分類: 4 状態 enum)           │
   │   レッスン7: close_order_spec                 (Liquidatable/Underwater 用)  │
   │   ↑↑ レッスン1〜2 の定数・型 (MARGIN_SCALE, LiquidationParams,             │
   │                       MarginRatio, MarginHealth) も全レイヤーで参照 │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ 出力: CloseOrderSpec { account, side, qty }                         │
   │   ※ price なし (market order) / Liquidatable・Underwater アカウントに  │
   │      対してのみ emit。レッスン3 で確定。                                    │
   │   さらに セクション3-4 で InsuranceFundDelta も並行して emit する        │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [ 下流: bridge → matching engine (CLOB) ]
                              ・close order を SubmitMarket に変換して submit
                              ・Underwater 分は insurance fund を credit/debit
\`\`\`

ポイントは 2 つ: (a) **レッスン3 で完成する 2 つの型 (\`AccountSnapshot\` 入力 / \`CloseOrderSpec\` 出力) が、エンジンと外界の唯一の接触面になる** — エンジン本体は レッスン4 以降で書くが、その関数たちは型シグネチャの上ではすべて「AccountSnapshot を受けて何かを返す」「最終的に CloseOrderSpec を emit する」という形に揃う。(b) **入力 (snapshot) は不変、出力 (spec) も不変** — エンジンは台帳を更新しない、台帳の所有権は完全に bridge 側に残る。これが レッスン0で予告した「**リスク計算専用の不変な snapshot 型を分離して依存関係をクリーンに保つ**」の具体形だ。

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

3. **\`collateral: Notional\` は signed にしている。** Collateral は *預け入れ* 資金として慣例的に非負だが、\`Notional\`（signed）に揃えるのは \`account_equity = collateral + unrealized_pnl\` を signed sum のまま流したいからだ。\`collateral\` を unsigned にすると、すべての equity 計算で \`as i64\` キャストが入り込む。**境界で変換し、計算は 1 つの signed 型で揃える。これにより、キャスト漏れや signed / unsigned の混在に伴う静かなランタイムバグ (アンダーフロー、\`as\` キャストでの最上位ビット化け、減算で負になるはずの値が大きな正の数に化けるなど) を、コンパイル時の型不一致として根絶できる**。レッスン4 の符号トリック (\`(mark − entry) × size\` を 4 象限すべて branchless で正しく計算する) は、まさにこの「計算経路をすべて signed で統一する」前提の上に成り立つ。

4. **\`pub\` フィールド、コンストラクタ関数なし。** レッスン1 の \`LiquidationParams\` と同じ慣例だ。透明な構造体で、カプセル化不変量はない。Bridge レイヤーは \`AccountSnapshot { account: …, position_size: …, … }\` を直接組み立てる。\`AccountSnapshot::new()\` を置かないのは、コンストラクタが強制すべき不変量がないからだ。

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

1. **\`price\` フィールドはない。** Liquidation は価格を選ばない。エンジンは market order の仕様を組み立てるところまでで、あとは matching engine が板に存在する深さで約定する。Liquidation参照実装（スキャナパート） で \`AccountSnapshot\` のスライスを順に辿り、\`Liquidatable\` か \`Underwater\` のアカウントごとに \`CloseOrderSpec\` を 1 つずつ emit する流れになる。どれも limit を持たない。

2. **\`side: Side\` は \`openhl_clob::Side\` を再利用する。** Matching engine は \`Side::{Buy, Sell}\` で話す。\`liquidation::Side\` を別に定義して bridge で変換するようにすると、**将来的に型の乖離 (drift) を引き起こす原因となる、不要な翻訳レイヤー (\`impl From\` などの変換ロジック) を導入してしまう** — たとえば片方の crate に 3 番目の side variant (\`Closing\` など) を足したのにもう片方に足し忘れる、\`Buy ↔ Sell\` のマッピングを 1 箇所でうっかり反転させる、といった事故が静かに発生する。**1 つの enum、1 つの真実の源泉。** 境界を跨ぐメッセージの語彙 (\`Side\` / \`Qty\`) は crate 境界に関係なく共通化して、永続的な型変換処理のコスト (調整税) を払い続ける羽目にならないようにする。

3. **\`qty: Qty\` は \`openhl_clob::Qty(u64)\` を再利用する。** Doc コメントが言うとおり「position size の絶対値」だ。\`PositionSize\` は \`i64\`（signed）だが、close する数量は常に正の値になる。変換（\`Qty(position_size.0.unsigned_abs())\`）は レッスン7 の \`compute::close_order_spec\` で行う。ここでは *出力型* が unsigned であることに commit するだけにとどめる。

> 🛑 **予測。** スクロール前に: \`CloseOrderSpec\` は、close が起きた *理由*（Liquidatable か Underwater か）を表す \`Reason\` フィールドを持っていない。これは持たせるべきか? ヒント: spec を consume するのは誰で、その消費者がどんな情報を必要とするかを考える。

（答え: **持たせない。** Bridge は spec を consume して 2 つのことをする — close order を submit すること、そして Underwater アカウントに対しては insurance fund を credit することだ。エンジンはどちらも signal する。Liquidation参照実装（スキャナパート） の scanner は \`CloseOrderSpec\` を emit するのと同時に、Underwater だったアカウントに対して \`InsuranceFundDelta\` も emit する。\`CloseOrderSpec\` に \`Reason\` フィールドを足すと、spec と insurance-fund delta のあいだで signal が二重化され、将来のリファクタリングが両者を乖離させうる。**同じ事実を 2 箇所に書かない。上流の出力を真実の源泉として、下流の consumer は必要なものだけを運ぶ。**）

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

- **\`error[E0432]: unresolved import 'openhl_clob::Qty'\`** — \`types.rs\` 冒頭の import 行はすでに \`Qty\` を名指しているはずだ（レッスン1 の types.rs scaffold で加えてある）。発火するのは import を削ってしまった場合に限る。出たときは、レッスン1 時点の冒頭行が依然として \`use openhl_clob::{AccountId, Qty, Side};\` と \`use openhl_funding::{MarkPrice, Notional, PositionSize};\` のままになっているか確認する — この import が レッスン2 / レッスン3 の両方をカバーする。
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

レッスン3 の後:
- **types.rs** は **Liquidation参照実装（計算パート） の types.rs と byte-for-byte で完全一致する**。Step 5 (Liquidation) の セクション1 はこの types モジュールをそのまま ship する。
- **lib.rs** はまだ \`pub mod compute;\` と、compute まわりの再エクスポートが揃っていない。これらは レッスン4〜7 で順に加える。

## よくある質問

**Q1: \`AccountSnapshot\` を position-type trait に対する generic にして、funding と liquidation が抽象的な snapshot を共有できないか?**

できる、ただし時期尚早だ。両 crate ともに、必要なフィールドが 1 ページに収まる規模に留まっている。抽象的な \`Snapshot<P: PositionLike>\` trait を導入すると、bridge が操作する必要のない型機構が増えてしまう。**crate ごとに具体型を持ち、bridge が翻訳するほうが、読むのも refactor するのも安く済む。**

**Q2: なぜ \`avg_entry\` は専用の \`EntryPrice\` newtype ではなく \`MarkPrice\` を使うのか?**

ポジションが開かれた価格と、現在ポジションを測っている価格は、同じ単位だからだ。スケールも、真実の源泉も同じ（慣例上、matching engine の last fill price）。\`MarkPrice(u64)\` と並行して \`EntryPrice(u64)\` を立てると、すべての PnL サイトで変換が要る。**2 つの値が単位を共有するなら、型も共有する。**

**Q3: \`collateral\` は負になり得るか?**

エンジンの目線では、ならない — *預けられた* collateral は常に非負だ。\`Notional\` を signed にしている理由は別にある。第 1 に、funding が settlement delta にこの型を使い、デルタは *負になり得る* こと。第 2 に、中間 equity 計算 \`collateral + unrealized_pnl\` の結果が signed になること。\`collateral\` 自体を unsigned にすると、すべての equity サイトでキャストが入ってくる。**上流は signed のまま演算し、範囲チェックは境界で行う。**

**Q4: \`CloseOrderSpec\` に上流の文脈用として \`bridge_metadata: Bytes\` フィールドを持たせるべきか?**

いいえ。Liquidation参照実装（スキャナパート） は \`CloseOrderSpec\` をエンベロープなしでそのまま bridge に渡す。Close を trigger と関連付けたい局面（監査ログ、telemetry）でも、bridge は spec の外側で \`(snapshot.account, current_block_height)\` を使えば足りる。**下流の機能のために上流の型を膨らませない。**

**Q5: なぜ両構造体が \`Copy\` なのか?**

安価で便利だからだ。\`AccountSnapshot\` は 32 バイト、\`CloseOrderSpec\` は 24 バイトで、このサイズなら Copy は実質タダ。Copy が乗っていないと、2 つ目の参照が欲しいたびに呼び出し側で clone する。**小さな Plain-Old-Data 型は \`Copy\` にする。\`Clone\` に手を伸ばすのは、所有権セマンティクスが本当に意味を持つときだけだ。**

## 次のレッスン (レッスン4)

レッスン4 で \`compute\` モジュールが始まる。最初の 2 関数 — \`notional_value\` と \`unrealized_pnl\` — が、liquidation crate にとって最初の挙動テストを呼び込む。同じコードパスがロング・ショートいずれのポジションに対しても正しい符号を生み出す signed-multiplication のトリックを見ていく。さらに、network-pathological な入力に対して乗算を i64 オーバーフローから守るために i128 中間値を経由させる規律も改めて確認する。
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

レッスン4 は本クレートで初めてテストが走るレッスンだ。ここから レッスン8（\`close_order_spec\`、Liquidation参照実装（計算パート） の挙動の最後）まで、各レッスンがテストを積み増していく。

## おさらい

レッスン3 の後:
- Types モジュールは Liquidation参照実装（計算パート） に対して byte-for-byte 完成している — \`MARGIN_SCALE\`、\`LiquidationParams\`、\`MarginRatio\`、\`MarginHealth\`、\`AccountSnapshot\`、\`CloseOrderSpec\`。
- Compute モジュールはまだ存在しない。
- \`cargo build\` は通る。\`cargo test\` は走るテストがゼロ件だ。

レッスン4 で compute モジュールを作る。最初の 2 関数が答えるのは「このアカウントは *いま* どう見えるか」 — notional exposure と unrealized PnL の 2 つだ。レッスン5 ではその上に equity と margin ratio を積み上げる。

## 計画

編集は 2 つ:

1. **\`crates/liquidation/src/compute.rs\` を新規作成。** モジュール doc、レッスン1〜3 から \`AccountSnapshot\` と \`MarkPrice\` を import する \`use\` 文、\`notional_value\`、\`unrealized_pnl\`、private な \`saturate_i128_to_i64\` ヘルパー、\`#[cfg(test)]\` テストブロック（notional 3 個 + PnL 5 個）まで。
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

モジュール doc に挙げているのは 6 関数だが、レッスン4 で着地するのはそのうちの 2 つ。残り 4 つ（\`account_equity\`、\`margin_ratio\`、\`margin_health\`、\`close_order_spec\`）は レッスン5–レッスン7 で順に追加していく。6 つ全部をいま列挙しておけば、レッスンごとにモジュール doc を編集し直さなくて済む。文脈なしでここに辿り着いた読者にとっても、ロードマップとして機能する。

> 🛑 **やりがちな勘違い。** 「レッスン4 で使うのは \`AccountSnapshot\` と \`MarkPrice\` だけだ。なぜ \`CloseOrderSpec\`、\`Side\`、\`Qty\`、\`LiquidationParams\`、\`MarginHealth\`、\`MarginRatio\` まで import するのか?」 **後のレッスンが全部使うからだ。** レッスン4 でまとめて import を入れておけば、各レッスンの diff は「今回追加する関数」だけに絞れる。レッスン5 以降に到達するまで Rust は unused import の warning を出し続けるが、Funding レッスン1 で後から来る型の rustdoc warning を許容したのと同じ理屈で、ここでも許容する。代わりに \`use\` 行を レッスン4–レッスン7 で 6 回いじる選択肢は busywork でしかなく、各レッスンが実際に追加している部分を見えにくくしてしまう。

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

1. **返り型は \`u64\`、\`i64\` ではない。** Notional は exposure の *magnitude* なので、常に非負だ。\`u64\` を返せば、呼び出し側が abs を取り忘れる可能性を型レベルで潰せる。Notional を signed な計算に流したい呼び出し側（レッスン5 の \`margin_ratio\` の割り算など）は、呼び出しサイトで明示的に \`i64::from(notional_value(...))\` を書く。**変換は 1 行で済む。代わりに防げるのは、production まで生き残る silent な符号バグの群れだ。**

2. **\`snapshot.position_size.0.unsigned_abs()\` を使う。\`.abs()\` ではない。** \`i64::abs\` は \`i64\` を返すが、\`i64::MIN.abs()\` は safe Rust では未定義動作だ（debug では panic、release では wrap）。一方 \`unsigned_abs\` は \`u64\` を返し、\`i64::MIN\` を含むあらゆる入力に対してきちんと定義されている（\`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808\`）。**Signed integer の magnitude が必要なら、迷わず \`unsigned_abs\`。\`abs\` を使ってよいのは、値が \`MIN\` を取り得ないと確信できるときに限る。**

3. **\`u64::saturating_mul\` であって、\`u64::checked_mul\` ではない。** どちらもオーバーフローを検知するが、\`saturating_mul\` はオーバーフロー時に \`u64::MAX\` を返し、\`checked_mul\` は \`None\` を返す。\`Option<u64>\` を返してしまうと、レッスン5 の \`margin_ratio\` を含むすべての呼び出し側が、*network-pathological な入力でしか起きない* \`None\` を扱うハメになる。Saturating なら、極端な入力に対しても — 数学的には間違っていても — 使える値を返す。どのみちその極端な入力では margin engine はそのアカウントを \`Liquidatable\` と分類するので、上流的な意味でも整合が取れる。**「値は極端だが境界内に収まっている」という保証が、「すべての呼び出しサイトに \`Option\` 型の伝播とボイラープレート (\`?\` / \`unwrap_or\` / 早期 return) を強いるコスト」を上回るとき、正しい failure mode は saturation だ。**

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

3. **レッスン4 ではまだ proptest を使わないのに \`use proptest::prelude::*;\` を書いておく。** レッスン5 / レッスン8 で proptest を足すとき、import はすでにここにある状態になる。\`compute.rs\` 本体の bulk import と同じ理屈で、境界で一度だけ書き、それまでの数レッスンは unused import の warning を許容する。

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
2. **\`pub use compute::{notional_value, unrealized_pnl};\`** — 新しい re-export 行で、\`types\` の re-export とは別の行に分ける。モジュールごとに自分の行を持たせる方針だ。レッスン5–レッスン7 で関数が増えたら、この compute 側のリストを伸ばしていく。

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

- **\`warning: unused import: ...\`** — まとめて入れた import に対する warning だ。想定どおりで、レッスン7 までには消える。
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

レッスン4 の後:
- **compute.rs** は Liquidation参照実装（計算パート） の \`compute.rs\` の最初の ~80 行と一致する — モジュール doc、import、\`notional_value\`、\`unrealized_pnl\`、ヘルパー、最初の 8 テストまで。それ以降（残り 4 関数とそのテスト、proptest 3 つ）は レッスン5–レッスン7 で着地する。
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

## 次のレッスン (レッスン5)

レッスン5 では \`account_equity\` と \`margin_ratio\` を追加する。そこで **Liquidation参照実装（計算パート） で最も教育的に load-bearing な発見**に出会う: levered regime での \`margin_ratio\` の非単調性だ。読者はまず proptest を書く（「long に対して mark が上がれば margin_ratio も上がるはず」）。それが小さな入力群で失敗するのを目にする。なぜそれが「バグではなく本物の失敗」なのかを辿り、\`prop_assume!\` を使って実際に成り立つ不変量を表現するように proptest を refine する。学習者が margin math について最初に持っていたメンタルモデルが、いったん壊されてから再構築されるレッスンだ。
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

…で 16 テストが pass する（レッスン4 の 8 + 新規 unit test 5 + proptest 3、proptest は各デフォルトの 256 ケース）。

具体的な変更:

- **\`src/compute.rs\`。** レッスン4 の内容の下に、\`account_equity\`、\`margin_ratio\`、unit test 5 個、proptest 3 個を追記する。
- **\`src/lib.rs\`。** \`pub use compute::{...}\` の re-export に \`account_equity\` と \`margin_ratio\` を足す。

レッスン5 は Liquidation参照実装（計算パート） の教育的な中心だ。急がないこと。「書く → 失敗する → トレースする → refine する」という proptest の discovery loop こそ、本レッスンが教えるために存在する load-bearing なスキルだ。

## おさらい

レッスン4 の後:
- Compute モジュールが存在し、\`notional_value\`、\`unrealized_pnl\`、private な \`saturate_i128_to_i64\` ヘルパーがある。
- 8 個の unit test が、PnL の 4 つの符号の組み合わせと notional の 3 ケース（long、short、flat）をカバーする。
- \`cargo test\` が 8 テスト全部 green。

レッスン5 では次のレイヤーを積む: PnL を account equity に変換し（collateral を足す）、その equity を notional で割って margin ratio を得る。それから最初の proptest を書き、本ステージを定義するサプライズに出会う。

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
/// (Liquidation参照実装（保険基金パート）).
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

1. **\`notional == 0\` の early return で \`i64::MAX\` を返す。** Flat ポジションは exposure ゼロ → 下回るべき margin 要件もない。表現可能な最大の ratio を返すことが「無限に safe」のシグナルになり、下流の \`margin_health\` の比較すべてを自然に short-circuit させる（\`margin_health\` 側に special-case はいらない）。**具体的には、次レッスン (レッスン6) で実装する \`if ratio >= params.initial_margin_bps { Safe } else { ... }\` という一方向の比較式が、flat なアカウントに対しても追加の特例分岐なしでそのまま機能し、\`i64::MAX >= initial_margin_bps\` が常に真なので自動的に \`Safe\` と判定される**。つまり \`i64::MAX\` は **「下流の比較演算が短絡的に通り抜けるための magic boundary」** として効いている。代替案 — \`Option<MarginRatio>\` や \`Result<MarginRatio>\` — はすべての呼び出し側に flat ケースを明示的に扱わせる。**「制約なし」のケースを、システム上最も safe な上限値で表現する設計規律だ。**

2. **乗算を除算より *先* に置く。** \`equity × MARGIN_SCALE / notional\` を i128 で計算すれば、小さい ratio（例えば 1% margin = 100 bps）も割り算を生き残る。先に除算する（\`equity / notional × MARGIN_SCALE\` を i64 で）と、スケーリングの前に整数パーセントに切り捨てられ、精度が失われる。**整数除算が混じるとき、演算順序が効く。**

3. **Scaled product を i128 で受ける。** \`equity\` は i64、\`MARGIN_SCALE\` は 10⁴。i64 での積は \`|equity| > i64::MAX / 10_000 ≈ 9.2e14\` でオーバーフローしうる。現実的な取引所スケールに直すと $920 兆 — 妥当な範囲を遥かに超えるが、i128 乗算は第二の防衛線として置いておく。\`unrealized_pnl\` と同じ規律だ。

4. **割り算用の \`i128::from(notional)\` キャスト。** \`scaled\` が i128 になった後、i128 で割り続ければ結果も i128 のまま。\`notional\`（u64）の i128 へのキャストは無償だ。i128 と u64 を割り算で直接混ぜることはできない。**チェーン全体を 1 つの広い型で通し、境界で 1 度だけキャストする。**

5. **末尾の \`saturate_i128_to_i64(ratio)\`。** 割り算後でも、極端な i128 値は i64 範囲を超えうる（例: 巨大な equity と小さな notional の組み合わせ）。Saturation は答えの符号を保ちつつ、magnitude を clip する。

### Step 3: unit test を 5 個追加

既存の \`#[cfg(test)] mod tests { ... }\` ブロックの中、レッスン4 の PnL テストの後に追加:

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

3. **\`ratio_flat_returns_max\` は \`MarginRatio(i64::MAX)\` を直接使う。** Sentinel 値は契約の一部で、レッスン6 の \`margin_health\` がそれに依存する。

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

この図は レッスン6 / レッスン7 で classifier やリクイデーション規律を書くときにも参照する: 健康な trader はほぼ levered 領域に居るが、極端に over-collateralize した「擬似ロング」のアカウントが cash-heavy 領域に紛れ込む可能性は常にあるので、エンジンは両 regime で正しく動かなければならない。

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

**16 テストすべて pass。** 3 つの proptest はデフォルトでそれぞれ 256 ケースを走らせる — 合計で ~768 のランダム入力の組み合わせがチェックされた。

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

レッスン5 の後:
- **compute.rs** は Liquidation参照実装（計算パート） を \`margin_ratio\` + 最初の 13 unit test + 3 proptest すべてまで一致する。残る 2 関数（レッスン6 の \`margin_health\`、レッスン7 の \`close_order_spec\`）とそのテストは pending。
- **lib.rs** は compute の re-export を 6 個中 4 個持つ — \`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`。残り 2 つは レッスン6 / レッスン7 で着地する。

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

## 次のレッスン (レッスン6)

レッスン6 では \`margin_health\` を追加する — \`MarginRatio\` を params と比較して、4 つの \`MarginHealth\` variant のどれか 1 つにマップする関数だ。境界の unit test 5 個（Safe / AtRisk / Liquidatable / Underwater / ちょうど maintenance の端）と、各しきい値で strict-less-than を使う理由の議論を載せる。レッスン5 より短い — レッスン6 までに規律は内面化されている。レッスン6 は応用編だ。
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

…で 21 テストが pass する（レッスン4-レッスン5 の 16 + 新規境界テスト 5）。

具体的な変更:

- **\`src/compute.rs\`。** \`margin_ratio\` の後に \`margin_health\` を追記し、既存のテストモジュールに unit test 5 個を加える。
- **\`src/lib.rs\`。** Compute の re-export を \`margin_health\` で拡張する。

レッスン6 は応用編だ。ここまでに i128 / saturate / proptest の規律は内面化されている。分類カスケードは短い — だが design hill（カスケード順 + strict-less-than）こそが、不注意な実装でバグが潜みやすい場所だ。

## おさらい

レッスン5 の後:
- \`compute.rs\` には \`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`、\`saturate_i128_to_i64\` ヘルパー、加えて 13 unit test と 3 proptest が揃っている。
- 非単調エッジケースは \`long_ratio_monotonic_in_mark_when_levered\` の \`prop_assume!\` で表現済み。
- \`cargo test\` は 16 テストを走らせ、すべて green。

レッスン6 では \`MarginRatio\` の値を \`MarginHealth\` の variant にマップする。関数は短い。決定は短くない。

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

ポイント: **カスケードを「最も極端な領域から先に切り出していく narrowing」として書くと、各分岐の条件は自然に上の分岐の補集合の中だけで成立する**。逆に「広い領域から先に check」にすると、より極端な領域 (Underwater) が広い領域 (Liquidatable) に吸収されてしまい、本来 4 つあるはずの分類が 3 つに退化する。レッスン7 で \`close_order_spec\` がこの 4 状態を見て発火するかどうかを決めるので、この narrowing が崩れると下流の挙動全体が壊れる。

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

2. **しきい値はすべて \`<\`、\`≤\` ではない。** Ratio が \`maintenance_bps\` に等しいアカウントは *まだ* Liquidatable ではなく、AtRisk だ。慣例的な読み方は「maintenance margin は *上にとどまる* べき線で、strict に超えてから liquidation 対象になる」。Doc がこれを明示し、Step 2 のテストが強制する。**Strict inequality は、しきい値そのものがより良い health state に属する、を意味している。**

3. **\`i64::from(params.initial_margin_bps)\` が u32 → i64 を widen する。** フィールドは \`u32\`（メモリ節約。bps 値は ~40 億まで十分な範囲だ）。Ratio は \`i64\`（\`margin_ratio\` の signed 除算によって型がそうなっている）。Rust では異なる integer 型同士の比較はコンパイルエラーになる。境界で widening しておけば、本体の比較はクリーンに保てる。**Params ごとに 1 回キャストする。カスケード本体は純粋な i64 < i64 として読める。**

4. **Flat ポジション用の special case がない。** \`margin_ratio\` は flat アカウントに対して \`MarginRatio(i64::MAX)\` を返す。\`i64::MAX\` は妥当な \`initial_margin_bps\` のどれよりも遥かに大きいので、カスケードはそのまま \`Safe\` まで fall through する。**Flat-as-Safe の性質は \`margin_ratio\` の flat-position ガードに既に反映されている。\`margin_health\` はそれを知らなくてよい。** これは **関数の合成 (function composition) によって、上流が確立した不変量を下流が自然に継承する** という設計の実例だ — \`margin_ratio\` 側で「flat なら i64::MAX」を 1 箇所だけ決めれば、それを呼ぶすべての下流関数 (この \`margin_health\` も、レッスン7 の \`close_order_spec\` も) が「flat = 必ず Safe に着地する」を**追加コードゼロで**手にする。「関数内で何でもフラグ分岐を足す」癖を持つ開発者は、ここでパラダイムを切り替える価値がある: **不変量の責務を 1 箇所に閉じ込め、下流は信頼するだけ**。Flat-position セマンティクスを将来微調整したくなったとき、変更は *1 箇所*（\`margin_ratio\`）で済む — 2 つの同期した分岐を抱えずに済む。

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

4. **\`MarginHealth::Underwater\` は レッスン5 の underwater ケース**（薄い collateral の long ポジションに対する \`mark = 50\`）で exercise する。レッスン5 の \`ratio_can_be_negative\` と同じセットアップだ — 負の ratio テストが数学を保証し、variant テストが分類を保証する、という形になる。

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

レッスン6 の後:
- **compute.rs** は Liquidation参照実装（計算パート） を \`margin_health\` + 18 unit test + 3 proptest まで一致する。最後の関数（\`close_order_spec\`）とその 3 テストは レッスン7。
- **lib.rs** は compute の re-export を 6 個中 5 個持つ。最後の 1 つ（\`close_order_spec\`）は レッスン7 で着地する。

## よくある質問

**Q1: なぜ misconfigured な params（maintenance ≥ initial）のケースに備えて \`Result<MarginHealth, ...>\` を返さないのか?**

関数は total（全域関数）だ — どんな入力にも、定義された出力が対応する。Misconfigured な params（maintenance == initial、あるいは maintenance > initial）でも、すべてのアカウントは 4 variant のどれかに分類される。意味的に間違った結果ではあるが、定義された結果ではある。\`Result\` を返してしまうと、*params を妥当に組み立てる bridge からは決して起きない* \`MisconfiguredParams\` エラーを、すべての呼び出しサイトに処理させる。**Total function は圧倒的に compose しやすい。パラメータの妥当性はシステムへの入力境界 (ロード時 / config パース時) で検証を完了させ、下流のドメイン計算層 (\`margin_health\` などの分類器) では不変量が維持されているものとして 100% 信頼する** — これは "Parse, don't validate" として知られる規律で、検証ロジックを境界に集中させ、ドメイン層を total function で構成する設計パターンだ。

**Q2: \`margin_health\` を sorted thresholds 配列と binary search で、もっと「データ駆動」にできないか?**

4 状態しかないなら、明示的なカスケードのほうがクリアで速い。Binary search が勝つのは threshold の数が ~10 を超えたあたりからだ — その時点でリファクタリングすればよい。先取りの一般化は、エンジンが必要としない仕組みを足してしまう。**今もっている cardinality に最適化する。いつか持つかもしれない cardinality に最適化しない。**

**Q3: \`maintenance_bps > initial_bps\`（misconfigured）のとき、何が起きるか?**

カスケードは依然として定義された分類を生む。\`ratio >= maintenance_bps\` の領域では、次の分岐 \`ratio < initial_bps\` が false になり（maintenance > initial なら ratio も ≥ initial だ）、そのまま \`Safe\` に fall through する。\`ratio ∈ [0, maintenance_bps)\` の領域は \`Liquidatable\` に着地する。結果として AtRisk が到達不能になる。**Misconfigured params は一貫性はあるが意図しない分類スキームを生む。Validation は param 構築側の責任で、分類器の責任ではない。**

**Q4: なぜ \`margin_health\` は params の i64 変換をキャッシュしないのか?**

呼び出し側は通常、block ごとのスイープで \`margin_health\` をアカウント 1 件あたり 1 回しか呼ばない。Bridge は同じ \`&LiquidationParams\` をすべての呼び出しに渡す。2 つの \`i64::from(u32)\` キャストはゼロコスト — コンパイラはせいぜい \`mov\` 命令を 1 つ emit するだけだ。**コストを測ってからキャッシュする。反射でキャッシュに手を伸ばさない。**

**Q5: カスケードを \`match\` の range pattern（\`0..maintenance_bps => Liquidatable\`）で書けるか?**

Rust の \`match\` は exclusive-range pattern をサポートする（1.26 から）ので、構文的にはイエス。だがパターンは \`i64::MIN..0\`、\`0..maintenance_bps\`、\`maintenance_bps..initial_bps\`、\`initial_bps..=i64::MAX\` になる。*名前付き* の境界（リテラルではなく変数）を参照する必要があるので、各パターンに結局 guard 句が必要だ。If/else カスケードのほうがここではクリーンに読める。**Structural なケースには \`match\`、同じ値に対する不等式カスケードには \`if/else\`。**

## 次のレッスン (レッスン7)

レッスン7 では \`close_order_spec\` で Liquidation参照実装（計算パート） を閉じる — snapshot を bridge が consume する \`CloseOrderSpec\` に変換する関数だ。Unit test は 3 つ: long-closes-with-Sell、short-closes-with-Buy、flat-position エッジケース（qty = 0）。レッスン6 より短い — レッスン7 の時点で compute モジュール全体は背後に揃っていて、レッスンの大半は レッスン4 の \`unsigned_abs\` 規律と、エンジンの外向きインターフェースとの間を橋渡しすることに費やされる。
`,
                },
                {
                  title: "レッスン 7 — close_order_spec — Liquidation参照実装（計算パート） の最後の関数",
                  slug: "openhl-liquidation-close-order-spec-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 20,
                  xpReward: 40,
                  content: `# レッスン 7 — \`close_order_spec\` — Liquidation参照実装（計算パート） の最後の関数

## ゴール

このレッスンで掴む概念:

- **ポジションを close する基本ルール。** Long は *売って* close、short は *買って* close。Side は常にポジション方向の反対 — エンジンは side を決めるのではなく、ただ反転させるだけだ。
- **Public 境界での \`unsigned_abs\`。** レッスン4 の規律（\`i64\` には \`abs\` ではなく \`unsigned_abs\`）が、bridge と会話する関数で表に出てくる。出力の \`Qty(u64)\` は CLOB matching engine が期待する型 — エンジンは符号変換を自分の境界に押し付ける。
- **\`close_order_spec\` が flat ポジションをフィルタしない理由。** Flat ポジションは \`qty == 0\` の spec を生成する。Bridge が submit 前にフィルタする。\`close_order_spec\` を total かつ side-effect-free に保つことで、Liquidation参照実装（スキャナパート） の multi-account scanner と compose しやすくなる。
- **単一責任のスコープ。** \`close_order_spec\` は \`MarkPrice\` を受け取らない（market order は price を持たない）し、\`LiquidationParams\` も受け取らない（liquidate するか否かの判断は \`margin_health\` の仕事だ）。Snapshot を 1 つ入れて、spec を 1 つ出す。

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 24 テストが pass する（レッスン4-レッスン6 の 21 + close-side の 3 ケース用の新規テスト 3）。**Liquidation参照実装（計算パート） が \`22eedf9\` に対して byte-for-byte で完成する。**

具体的な変更:

- **\`src/compute.rs\`。** \`margin_health\` の後に \`close_order_spec\` を追記し、既存のテストモジュールに unit test 3 個を加える。
- **\`src/lib.rs\`。** Compute の re-export を \`close_order_spec\` で拡張する。

レッスン7 は Liquidation参照実装（計算パート） で最短のレッスンだ。関数自体は 11 行 — このレッスンの存在理由は、side-inversion ルールをロックし、pure-compute モジュールの完成をマークすることにある。

## おさらい

レッスン6 の後:
- \`compute.rs\` には \`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`、\`margin_health\` + \`saturate_i128_to_i64\` ヘルパー + 18 unit test + 3 proptest が揃っている。
- \`lib.rs\` は compute 関数 6 個中 5 個を re-export 済み（\`close_order_spec\` だけが残っている）。
- \`cargo test\` は 21 テストを走らせ、すべて green。

レッスン7 で Liquidation参照実装（計算パート） を閉じる。本レッスンの後、\`22eedf9\` に対する答え合わせ diff は \`compute.rs\` と \`lib.rs\` の両方で完全にクリーンになる。

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
     ・「liquidate するかどうか」の意思決定は レッスン6 \`margin_health\` が完了させている。
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

2. **\`unsigned_abs()\` が magnitude を \`u64\` として返す。** レッスン4 と同じ規律が public 境界に現れている。\`Qty\` は \`u64\` をラップしているので、magnitude は \`Qty(abs_size)\` にそのまま流れ込む。中間の \`as u64\` キャストはいらない。**関数は符号変換を、ちょうど 1 度、符号付き position-size と符号なし order-quantity が出会う境界で行う。**

3. **\`if snapshot.position_size.0 > 0\` — strict greater-than。** Flat ポジション（\`size == 0\`）は \`else\` 分岐に落ちて \`Side::Buy\` を受け取る。Qty も 0 になるので無害だ — spec は存在するものの、意味は持たない。**関数の中で flat path を special-case しない。** Bridge が submit 前に \`qty == 0\` の spec をフィルタする。

4. **\`mark\` なし、\`params\` なし。** \`close_order_spec\` に必要なのは snapshot だけだ。「Close するか否か」の判断は \`margin_health\` に住み、price discovery は matching engine で起きる。**各関数がちょうど 1 つの関心事を所有する。Bridge がそれらを compose する: スキャン → 分類 → close spec 生成 → submit、という流れになる。**

5. **\`Option<CloseOrderSpec>\` ではなく \`CloseOrderSpec\` を値で返す。** 関数は total（全域関数）だ — flat ポジション（\`qty == 0\`）でも常に spec を返す。代替案として \`Option\` を返すと、スキャン内のすべての flat アカウントに対して呼び出し側に \`None\` を扱わせる— close ステップに到達する頃にはそれらのアカウントはすでに前段でフィルタされているのに、だ。**Total な関数は圧倒的に compose（結合）しやすい。Optional な関数は、すべての呼び出し側に空ケースの処理（ボイラープレート）を強用する。** 具体的に効いてくるのは Liquidation参照実装（スキャナパート） で実装する \`LiquidationScanner\` だ: 全アカウントのスナップショットを \`filter_map\` や \`Option\` chaining なしに**単なる \`map\` や平坦な \`for\` ループで均質に処理**できる。\`close_order_spec\` が total だからこそ、scanner は「\`Liquidatable\` か \`Underwater\` か」の分類フィルタを 1 箇所で書けば済み、close-spec 生成側で再度フィルタする必要がない。**エッジケース (flat → qty 0 の spec は submit しない) のフィルタリングは、入出力の最外殻である bridge レイヤーにのみ集約する** — これが crate を貫く規律になっている。

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

**24 テスト pass、Liquidation参照実装（計算パート） の内容が完成。** Liquidation crate の pure-compute モジュール — margin math + 分類 + close-order 生成 — があなたの workspace に揃い、\`22eedf9\` に対する答え合わせ diff は完全にクリーンになる。

エラー時にありがちなパターン:

- **\`close_short_with_buy\` が \`Side::Sell\` で失敗。** 誤って \`if snapshot.position_size.0 >= 0\` と書いてしまっている。Flat ポジションはこのテストには関係ないが、\`>=\` だと size = 0 の short（存在しない概念）が Sell に flip してしまう — そして size = −10 のテストは \`size > 0\` が false なので失敗する。方向を再確認する。
- **\`close_flat_has_zero_qty\` が関数の panic で失敗。** \`unsigned_abs()\` ではなく \`.abs()\` を入れてしまっている可能性がある。\`i64(0).abs()\` は OK だが、\`i64(-10).abs() as u64\` のパターンは レッスン4 で挙げた \`i64::MIN\` footgun のリスクを抱える。\`unsigned_abs\` で通す。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **Side はポジション方向の反対 — それ以外のケースはない。** Long → Sell、Short → Buy。関数は「曖昧なケース」のための 3 つ目の分岐も、「不明なケース」のためのフォールバックも要らない。ポジションは符号を持つか、さもなくば flat。Spec は符号を反転するか、ゼロを運ぶ。**ポジション方向の単純な反転 (インバージョン) こそが、「ポジションをクローズ (清算) する」という行為を最もシンプルかつ正確に表現したコードである。**

2. **\`close_order_spec\` は flat ポジションに対しても side-effect-free。** 関数内でフィルタする代わりに zero-qty spec を返すことで、\`close_order_spec\` を total に、かつ compose しやすく保てる。Liquidation参照実装（スキャナパート） の scanner は分岐なしで \`for snapshot in snapshots { specs.push(close_order_spec(snapshot)); }\` と書ける。Bridge が submit 時にフィルタする。**Pure 関数は返す。Impure な境界レイヤーがフィルタする。**

3. **関数は \`mark\` も \`params\` も受け取らない。** 各 compute 関数がちょうど 1 つの関心事を所有する: \`margin_health\` は close するか *否か* を決め、\`close_order_spec\` は *どう* close するかを決める。これらを混ぜると — 例えば \`params\` を取って liquidation fee を qty に適用すると — 2 つの責任が結合してしまう。Fee は Liquidation参照実装（保険基金パート）（insurance fund）に属する — collateral と fee の数学が一緒に住む場所だ。**単一責任が、bridge の composition path を明白にする。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

レッスン7 の後:
- **compute.rs** は Liquidation参照実装（計算パート） の \`compute.rs\` と **byte-for-byte 一致**。
- **lib.rs** は Liquidation参照実装（計算パート） の \`lib.rs\` と **byte-for-byte 一致**。
- **Cargo.toml** は レッスン1 以来一致している。

Liquidation参照実装（計算パート） クレートのすべてがあなたの workspace に揃った。

## よくある質問

**Q1: \`close_order_spec\` は flat ポジションに対して \`Option<CloseOrderSpec>\` を返すべきか?**

返してもいいが、摩擦が増える。Flat ケースを気にしない呼び出し側（実際にはほとんどがそう）は、いちいち \`.expect("non-flat position")\` や \`if let Some(spec) = ...\` を書くハメになる。Total な \`CloseOrderSpec\` を \`qty == 0\` で返し、フィルタを bridge に押し付けるほうが、common case には安く済む。**\`Option\` の規律は、空ケースが *最も一般的* で、呼び出し側に処理を強要したいときに最適だ。ここでは空ケースが希少で、強要は単なるオーバーヘッドにしかならない。**

**Q2: なぜ \`Side::Sell\` 分岐で \`size > 0\`（strict）であって \`size >= 0\`（non-strict）ではないのか?**

Flat（\`size == 0\`）は long *でもなく* short *でもない* — long/short の二分法の外側にある。「flat は long」も「flat は short」も、どちらも**恣意的な (好みの分かれる) 慣例にすぎない**。ここでは flat が \`else\` 分岐に静かに落ち、qty もどのみち 0 になる、という慣例を選んだ。どちらの選択も動く。規律は **一貫性を保ち、選択を文書化すること** だ。Doc には「flat → qty 0、呼び出し側がフィルタ」と書いてあり、読者はそれをコードに対して検証できる。

**Q3: \`close_order_spec\` を \`AccountSnapshot\` のメソッド（\`snapshot.close_order_spec()\`）にできないか?**

構文的にはイエスだ — \`impl AccountSnapshot { pub fn close_order_spec(&self) -> CloseOrderSpec { ... } }\` で書ける。そうしない理由は、\`close_order_spec\` 関数を他の margin-math 関数と並べて \`compute.rs\` に住まわせたいからだ。「関連コードとの co-location」が「receiver 型との co-location」に勝つ、という判断。**\`AccountSnapshot\` はデータ運搬役（\`types.rs\` に住む）、compute は \`compute.rs\` に住む。Free-function 形式が、この分離を保ってくれる。**

**Q4: \`position_size = i64::MIN\` の場合、\`unsigned_abs\` はそれを処理するか?**

イエス、設計どおりだ。\`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808u64\`（\`u64::MAX / 2 + 1\`）になる。Signed の \`i64::MIN.abs()\` はオーバーフローする（i64 には正の対応物が表現できない）。\`unsigned_abs\` は magnitude を \`u64\` で返すので、常に余裕がある。**これがそのまま レッスン4 の規律だ: magnitude には \`unsigned_abs\`、\`abs\` を使ってよいのは値が \`MIN\` ではないと確信できるときだけ。**

**Q5: テスト fixture の \`snapshot\` 関数が \`(size, entry, mark, collateral)\` ではなく \`(size, entry, collateral)\` を取るのはなぜか — テスト対象の関数は snapshot を取り、通常 mark も必要なのに?**

\`close_order_spec\` は snapshot しか取らない — mark を要求しない。レッスン4 から共有してきた \`snapshot\` fixture は、snapshot のうち意味のある 3 フィールド（account はハードコード）だけを取り、mark は運ばない。Mark は、テスト対象の関数へ別途 \`MarkPrice(...)\` 引数として渡される。**Fixture は *型* が要求するものを構築する。テストは *呼び出し* が要求するものを供給する。**

## 次のレッスン (レッスン8) — Liquidation参照実装（保険基金パート） が始まる

レッスン8 で Liquidation参照実装（保険基金パート） — insurance fund — が始まる。レッスン7 で完成した pure-compute モジュールが *何が起きるべきか* のレイヤーだとすると、Liquidation参照実装（保険基金パート） は *何が起きたかを記録する帳簿* を足すレイヤーだ。Fund の balance を track し、underwater liquidation からの不足を吸収し、solvent な close から liquidation fee を credit する \`InsuranceFund\` state machine が入る。Liquidation参照実装（保険基金パート） の後、エンジンは「このアカウントは Liquidatable」だけでなく「この close は fund に 1.5% を credit した」あるいは「この close は fund から $400 を drain した」も知る。

**本レッスンのドラフト時点で、Liquidation参照実装（保険基金パート） はまだ openhl に ship されていない。** レッスン8 は、openhl 側の実装が来たタイミングで rethlab に着地する。
`,
                },
              ],
            },
          },
          {
            title: "保険基金",
            sortOrder: 3,
            lessons: {
              create: [
                {
                  title: "レッスン 8 — InsuranceFund — クレートが純粋でなくなる地点",
                  slug: "openhl-liquidation-insurance-fund-intro-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン 8 — \`InsuranceFund\` — クレートが純粋でなくなる地点

## ゴール

このレッスンで掴む概念:

- **Pure → stateful の境界。** Liquidation参照実装（計算パート） の \`compute.rs\` は pure だった。どの関数も引数からの決定的な投影でしかなく、いつでも再計算できた。Liquidation参照実装（保険基金パート） で liquidation crate に初めて state が登場する — insurance fund の蓄積される balance だ。なぜか。Fund は単一のスナップショットに閉じた事実ではなく、そこに至る **履歴そのもの** の事実だからだ。**State がコードに現れるのは、入力から再導出できなくなる地点だけ。**
- **\`balance ≥ 0\` という型不変条件。** すべての public 操作がこれを保つ。フィールドの型は \`i64\`（crate の他のところと算術の型を揃えるため）だが、**不変条件はコードで守られる — 型システムが守るのではない**。\`new(-500)\` は 0 にクランプする。\`deposit(-50)\` は no-op になる。\`withdraw_shortfall(...)\` は 0 で飽和して、不足分は \`WithdrawOutcome\`（レッスン9 で）として表面化する。規律はこうだ: **すべての public メソッドを「不変条件を保つ遷移」として書く。**
- **境界の防御 vs 関数の防御。** \`compute\` モジュールは入力を信用する。\`insurance\` モジュールは信用しない。違いはこうだ。\`compute\` は pure な投影 — 呼び出し側が valid な \`AccountSnapshot\` をすでに組み立てている。\`InsuranceFund\` は *境界そのもの* — bridge、scanner、（後の）ADL ルーチンがそれぞれ異なるレイヤーから呼んでくる。どれか 1 つに bug が混入しうる。**多くの呼び出し側を集約する境界でこそ、defensive coding が意味を持つ。**
- **コンセンサス state における saturating 演算。** \`deposit\` は \`+\` ではなく \`saturating_add\` を使う。理由は「dev で panic を避けるため」だけではない。Rust の \`+\` 演算子はビルドプロファイルで *2 つの* failure mode を持つ。**Debug ビルドでは overflow に panic する** (1 つの validator がクラッシュ、他は走り続け → fork)、**release ビルドではサイレントに wrap する** (2 の補数の剰余演算で、validator ごとに異なる \`i64\` を生む → fork)。Release の wrap こそが厄介だ — クラッシュなし、エラーなし、ただ state の不一致が起きる。\`saturating_add\` は \`i64::MAX\` (または \`MIN\`) にあらゆるビルドプロファイルで clamp する。全 validator が同じ値を見る、コンパイラフラグが何であれ。**Saturation はコンセンサス安全な算術規律だ。**

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 33 テストが pass する（L0-レッスン7 の 24 + 構築 + deposit の新規テスト 9）。残りの withdraw・proptest 系 22 ケースは レッスン9 で着地する。

具体的な変更:

- **\`src/insurance.rs\`。** 新規モジュールファイル。\`InsuranceFund\` 構造体、3 種類のコンストラクタ（\`new\` / \`empty\` / \`Default::default\`）、\`balance()\` アクセサ、\`deposit()\` 変更子、9 個の unit test を追加。
- **\`src/lib.rs\`。** \`pub mod insurance;\` と \`InsuranceFund\` の re-export を追加。

レッスン8 で \`insurance.rs\` のおおよそ半分を着地させる。Withdraw path —\`WithdrawOutcome\` enum を含む — は レッスン9 で閉じ、insurance fund モジュールの capstone になる。

## おさらい

レッスン7 の後:
- \`compute.rs\` は Liquidation参照実装（計算パート） で完成: 6 関数（\`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`、\`margin_health\`、\`close_order_spec\`）と \`saturate_i128_to_i64\` ヘルパー。
- \`lib.rs\` は compute 関数 6 個と Liquidation参照実装（計算パート） の型をすべて re-export 済み。
- \`cargo test\` は 24 テストを走らせ、すべて green。
- クレートは **純粋関数的**だった: \`&mut self\` なし、モジュール level state なし、すべての関数が引数だけから返り値を導く。

レッスン8 で Liquidation参照実装（保険基金パート） が始まる。最初の変化は、クレートが純粋関数的でなくなることだ。

## 計画

編集は 3 つ:

1. **\`crates/liquidation/src/insurance.rs\` を新規作成。** \`InsuranceFund\` 構造体、コンストラクタ 2 種類、\`balance()\` アクセサ、\`deposit()\` 変更子、\`WithdrawOutcome\` enum scaffold（レッスン9 で使う）、9 個の unit test（構築 + deposit）。
2. **\`crates/liquidation/src/lib.rs\` に \`pub mod insurance;\` と re-export を追加。**
3. **\`lib.rs\` 冒頭の roadmap コメントを更新。** Liquidation参照実装（保険基金パート） が進行中であることをマーク。

> 🛑 **予測。** 続きを読む前に考えてほしい。「balance フィールド 1 つの state machine」で、複数の呼び出し側にまたがって \`balance ≥ 0\` を保つために必要な最小限の防御面はどこか? 具体的には: **\`new(initial: i64)\`、\`deposit(fee: i64)\`、\`withdraw(amount: i64)\`** — この 3 つのうち、どこで何を防御する必要があるか?

（答え: **3 つすべて。** \`new\` は負の初期値を防ぐ — 0 にクランプする。\`deposit\` は負の fee を防ぐ — no-op にする（負の fee を素通ししたら fund がこっそり drain される）。\`withdraw\` は (a) 負の shortfall を防ぐ — amount = 0 の Covered として扱う、(b) balance を超える amount を防ぐ — 0 まで drain して残りを surface する。それぞれの防御が必要なのは、public API が複数のレイヤーから呼ばれるからだ。**bad な呼び出しが 1 つ来ただけで、型不変条件を破ってはならない。** レッスン8 は \`new\` と \`deposit\` をカバーする。レッスン9 が \`withdraw\` を扱う。）

なぜ state がここに現れるのか — アーキテクチャ図で押さえておく:

\`\`\`
   ┌────────────────────────────────────────────────────────────────┐
   │ Liquidation参照実装（計算パート） — pure compute (compute.rs)                          │
   │                                                                │
   │  margin_health(snapshot, mark, params) → MarginHealth          │
   │  margin_ratio(snapshot, mark)          → MarginRatio           │
   │  close_order_spec(snapshot)            → CloseOrderSpec        │
   │                                                                │
   │  すべての結果は入力からの投影。永遠に再計算可能。              │
   └────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ Liquidation参照実装（保険基金パート） — state machine (insurance.rs)                       │
   │                                                                │
   │  InsuranceFund { balance: i64 }   ← fund が蓄積する             │
   │      .deposit(fee)                ← fee が fund に CREDIT       │
   │      .withdraw_shortfall(amount)  ← 不足が fund から DEBIT      │
   │      .balance()                   ← 現在の蓄積値                │
   │                                                                │
   │  Balance は *履歴* の事実であって、入力 1 個の事実ではない。    │
   │  (deposit, withdraw) の 2 系列が異なれば balance も異なる —     │
   │  最終呼び出しの引数が同一でも、結果は変わる。                    │
   └────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ Liquidation参照実装（スキャナパート） — scanner (scanner.rs, レッスン11–レッスン12)                      │
   │                                                                │
   │  InsuranceFund を所有し、liquidation event ごとに                │
   │  .deposit / .withdraw_shortfall を呼ぶ。結果を ScanReport に     │
   │  集約する。                                                       │
   └────────────────────────────────────────────────────────────────┘
\`\`\`

ポイントは「**pure compute は返す。Stateful なモジュールは蓄積する。**」 Liquidation参照実装（計算パート） はエンジンに「各アカウントについて世界がどう見えるか」を教えた。Liquidation参照実装（保険基金パート） はエンジンに「アカウント間・ブロック間で何が起きたかを記憶する」能力を与える。両者を orchestrate するのが scanner（レッスン11〜13）だ。

## 手を動かす walk-through

### Step 1: \`src/insurance.rs\` を新規作成

\`crates/liquidation/src/insurance.rs\` を新規作成する。まずモジュール全体の doc コメントから。このプリアンブルはモジュール内で最も読まれる散文だ — doc generator も \`cargo doc\` の読者も、すべての関数より先にここを見る。

\`\`\`rust
//! Insurance fund state machine (Liquidation参照実装（保険基金パート）).
//!
//! The insurance fund is the venue's pooled buffer that absorbs the
//! deficit when a Liquidatable account's close turns underwater, or when
//! an Underwater account is liquidated outright. It accumulates the
//! liquidation fees that solvent closes pay in. Liquidation参照実装（スキャナパート）'s scanner will
//! own an [\`InsuranceFund\`] and call its deposit / withdraw operations
//! from the per-account liquidation loop.
//!
//! ### Why stateful here when the rest of the crate is pure
//!
//! Margin classification, fee math, and close-outcome computation
//! ([\`crate::compute\`]) are pure functions over per-account snapshots —
//! they can be re-evaluated lossless at any time. The insurance fund's
//! balance, in contrast, accumulates effects from many liquidation events
//! across many blocks; it is genuinely state. The shape mirrors
//! \`openhl_funding::clock\` — a small state machine, owned by the bridge,
//! mutated only on well-defined boundary events.
//!
//! ### Sign discipline
//!
//! The balance is \`i64\` internally for arithmetic uniformity with
//! [\`crate::compute\`], but the type invariant is **\`balance ≥ 0\`** —
//! every public operation preserves it. Withdrawals that exceed the
//! balance saturate at 0 and surface the unfilled portion via
//! [\`WithdrawOutcome\`]. Liquidation参照実装（スキャナパート）'s scanner reads the unfilled portion
//! as the trigger to escalate to ADL (ADL参照実装パート).
//!
//! ### Deposit semantics
//!
//! \`deposit\` accepts a non-negative fee amount. Negative deposits are
//! treated as zero (saturating semantics, no panic) — defensive coding
//! against accidental misuse from the caller. Saturating-add caps at
//! \`i64::MAX\` for network-pathological accumulated balances.
\`\`\`

このプリアンブルで押さえる点が 4 つ:

1. **冒頭は *型* ではなく *役割* から始まる。** 「The insurance fund is the venue's pooled buffer that absorbs the deficit…」 — 最初の 1 文だけ読んだ読者でも、このモジュールが safety-net cascade のどこに座っているかが分かる。**モジュール doc は「続きを読むかどうか」を決める人が読む。役割から始めろ。**
2. **Liquidation参照実装（スキャナパート） と ADL参照実装パート を名指しで引用している。** 読者のチェックアウトにはまだ存在しないステージだが、doc は先回りして引用する。読者は「このモジュールは計画された arc の一部だ — 単発の追加ではない」と分かる。**Doc の forward reference は未来との契約だ:「これはどこかへ向かっている」と言っている。**
3. **Sign-discipline セクションは Rust の型システムの話 *ではない*。** 型が *enforce しない* 不変条件についての話だ。**コンパイラがチェックできない不変条件を doc に書け。チェックできるものはコンパイラがすでに doc 化している。**
4. **\`openhl_funding::clock\`** はクロスモジュール引用で、読者がすでに見たパターン — 小さい state machine、bridge が所有、境界イベントだけで mutation — を指している。新しいモジュールを既知のモジュールに錨で結べば、学習曲線が短くなる。**新しいパターンを導入するときは、コードベース内の同じパターンの先例を指せ。**

### Step 2: \`InsuranceFund\` 構造体とコンストラクタを追加

Doc コメントの下に、構造体定義と 3 種類のコンストラクタを追加する:

\`\`\`rust
/// The insurance fund's accumulating balance.
///
/// Owned by the bridge (Liquidation参照実装（スキャナパート）+), exposed via deposit / withdraw
/// operations that maintain the \`balance ≥ 0\` invariant.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InsuranceFund {
    balance: i64,
}
\`\`\`

構造体の形について 2 点:

1. **フィールドは private（\`balance: i64\`、\`pub\` なし）。** これが \`balance ≥ 0\` を enforce する仕組みのすべてだ。もし \`balance\` が public だったら、呼び出し側はいつでも \`fund.balance = -1\` と書けて、契約を sneaky に破れる。**Private フィールドは Rust 流の「この不変条件がある — 公開メソッド経由で変更してほしい」の表現方法だ。**
2. **\`Clone + Copy + Debug + PartialEq + Eq\`。** \`i64\` フィールド 1 つの構造体でコンパイラが自動 derive できるトレイトを、すべて derive する。値渡しが安く、テストで assert しやすく、proptest で比較しやすい。**Pure-value 型に対しては、標準の 4 つ（または \`Hash\` を含めて 5 つ）を躊躇なく derive する。**

次にコンストラクタ:

\`\`\`rust
impl InsuranceFund {
    /// Create a fund with the given initial balance.
    ///
    /// Negative initial balances are clamped to zero — defensive against
    /// accidental misuse. A negative initial balance can't represent any
    /// physical state of the fund and would violate the type invariant.
    #[must_use]
    pub const fn new(initial_balance: i64) -> Self {
        Self {
            balance: if initial_balance > 0 {
                initial_balance
            } else {
                0
            },
        }
    }

    /// An empty fund; equivalent to [\`InsuranceFund::new(0)\`].
    #[must_use]
    pub const fn empty() -> Self {
        Self { balance: 0 }
    }

    /// Current balance of the fund. Always \`≥ 0\`.
    #[must_use]
    pub const fn balance(&self) -> i64 {
        self.balance
    }
}

impl Default for InsuranceFund {
    fn default() -> Self {
        Self::empty()
    }
}
\`\`\`

押さえておく点が 5 つ:

1. **\`new\` は負の値を黙って 0 にクランプする。** \`Result<Self, ...>\` でも panic でもない。なぜか。負の初期 balance の *物理的意味* が未定義だからだ — 借金を持つ fund は fund ではない。**Bad な入力に対して妥当な解釈が「最も近い valid な入力にする」しかない場合、儀式抜きでそうする。** ここで \`Result\` を返すと、すべての呼び出し側が「起きないはずのエラー」をハンドルさせられる。Panic にすると debug-vs-release で挙動が割れる。クランプが最も安価で正しい答えだ。
2. **\`new(0)\` と同じことをするのに \`empty()\` が存在する。** 理由は 2 つ。第一に、呼び出し地点で \`InsuranceFund::empty()\` のほうが \`InsuranceFund::new(0)\` より意図が読める — 数字でなく意図を運ぶ。第二に、\`empty\` は \`Default::default()\` が呼ぶ先でもあり、2 つの異なる名前 (インターフェース) が同じ構築ロジックを指す。**Canonical な zero value 用に名付けたコンストラクタを置くと、ちょっとした明快さの利息が複利で効いてくる。**
3. **フィールドに触れるすべてのメソッドが \`const fn\`。** 構造体は \`i64\` フィールド 1 つだけ。state を mutation しない処理は trivially const-evaluable だ。将来のコードは \`InsuranceFund\` を const 文脈（config struct のデフォルトなど）で使える。読者にも「このメソッドは fancy なことをしません」と伝わる。**\`const fn\` は能力であると同時にドキュメントだ。**
4. **\`new\` と \`empty\` に \`#[must_use]\`。** Fund を作って捨てるのはほぼ常に bug だ — 大抵リファクタリングの残骸。\`#[must_use]\` でコンパイラに警告させる。**「明らかに間違っているが見落としやすい」ケースをマーカー属性が拾う。**
5. **\`Default::default()\` は手動 impl で、derive ではない。** Derive した \`Default\` は \`balance: i64\` から \`balance: 0\` を生む — 結果は同じだ。だが、手動 impl で \`Self::empty()\` を呼べば *意図* が明示される: 「デフォルト fund は empty fund だ — 設計でそうしている、偶然そうなったのではない」。**Default 値が「ゼロ初期化」を超える semantic な意味を持つときは、手動 impl の価値がある。**

> 🛑 **やりがちな勘違い。** 「\`pub fn new(initial_balance: u64) -> Self\` ではダメか — \`u64\` なら不変条件は型で defended されて、コードで守る必要がない、と思える」 問題が 3 つある。(1) クレート他箇所は \`i64\` を fungible amount（\`pnl\`、\`equity\`、\`collateral\`）に使っている。1 つの境界だけ型を変えれば、すべての呼び出し地点でキャストを書かされる。(2) 演算で i64 を使う validator 側のコードは、fee 計算で \`u64::try_from\` の checked を要求される — saturation で足りるところに panic を植える。(3) \`balance ≥ 0\` の不変条件はどのみちコードで enforce されるので、型レベルの安全性は屋上屋を架すだけになる。**周辺の型規律に合わせろ — そして crate の他箇所がやっているのと同じ場所で不変条件を防御しろ。**

### Step 3: \`WithdrawOutcome\` enum scaffold を追加

レッスン8 は \`withdraw_shortfall\` を実装しないが、レッスン9 の変更が \`impl InsuranceFund\` への純粋な追加 (enum 導入による churn なし) で済むよう、\`WithdrawOutcome\` を今宣言しておく。**\`impl InsuranceFund\` ブロックの上**に追加:

\`\`\`rust
/// Outcome of attempting to absorb a shortfall via
/// [\`InsuranceFund::withdraw_shortfall\`].
///
/// The three variants are exactly the three transitions across the
/// "Layer 2 → Layer 3" boundary in the safety-net cascade:
///   - [\`WithdrawOutcome::Covered\`] — the fund had enough; Layer 2
///     fully absorbed the deficit.
///   - [\`WithdrawOutcome::PartiallyDrained\`] — the fund drained to
///     zero and covered part of the shortfall; the remainder must
///     escalate to Layer 3 (ADL).
///   - [\`WithdrawOutcome::Depleted\`] — the fund was already empty
///     before the call; nothing covered, full shortfall escalates.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WithdrawOutcome {
    /// Fund had enough balance to cover the request in full.
    Covered {
        /// Amount paid out of the fund (= requested shortfall).
        amount: i64,
    },
    /// Fund partially covered the shortfall before draining to zero.
    PartiallyDrained {
        /// Amount actually paid out (= fund's prior balance).
        amount: i64,
        /// Remaining shortfall that the caller must escalate to ADL.
        unfilled: i64,
    },
    /// Fund was already empty; nothing was paid out.
    Depleted {
        /// Full shortfall that must escalate to ADL.
        unfilled: i64,
    },
}
\`\`\`

この enum は **レッスン8 で宣言し、レッスン9 で使う**。レッスン8 で導入する理由:

1. **Enum の存在自体が public surface の物語の一部だ。** レッスン8 後に \`insurance.rs\` を眺める読者は、メソッドが後回しでも、モジュールの型語彙を一目で見られる必要がある。**メカニズムの前に語彙を見せる。**
2. **各 variant が自分の payload を運ぶ。** \`Covered\` と \`PartiallyDrained\` はどちらも \`amount\`（実際に支払われた額）を運び、\`PartiallyDrained\` と \`Depleted\` はどちらも \`unfilled\`（scanner がエスカレートすべき額）を運ぶ。レッスン9 の proptest \`withdraw_amount_plus_unfilled_equals_shortfall\` は両者を結ぶ保存則だ — だが variant の payload の形を見るだけで、保存則の輪郭はすでに読める。**Self-describing な variant は、コンパイラが enforce する文書だ。**
3. **doc コメントの \`Layer 2 → Layer 3 boundary\` がカスケード・アーキテクチャを明示する**: margin（Layer 1、Liquidation参照実装（計算パート）） → fund（Layer 2、Liquidation参照実装（保険基金パート）） → ADL（Layer 3、ADL参照実装パート）。読者はこの enum を見るたびに地図を手に入れる。**アーキテクチャの継ぎ目に座る型には、doc でその役割を書け。**

### Step 4: \`deposit\` メソッドを追加

既存の \`impl InsuranceFund\` ブロックに \`deposit\` を追加:

\`\`\`rust
    /// Credit the fund with a fee. Returns the new balance.
    ///
    /// Negative inputs are treated as a no-op (defensive against the
    /// caller passing a signed value where the contract expects a credit).
    /// Saturates at \`i64::MAX\` for network-pathological accumulated
    /// balances.
    pub fn deposit(&mut self, fee: i64) -> i64 {
        if fee > 0 {
            self.balance = self.balance.saturating_add(fee);
        }
        self.balance
    }
\`\`\`

押さえる点が 5 つ:

1. **\`fee > 0\`（strict）。** Fee = 0 も no-op なので、\`>\` と \`>=\` の挙動はゼロでは同じだ。Strict 形だと、分岐は「実際に仕事があるとき」だけ発火する。**Side effect を gate する述語では、ゼロが no-op のとき \`> 0\`（「これは意味があるか?」テスト）を \`>= 0\`（「これは非負か?」テスト）より優先する。**
2. **負の入力は黙って無視される。Panic も Error も出さない。** なぜか。代替案がコンセンサスにとって致命的だからだ。Panic-on-negative にすると、bridge bug で負の fee が 1 度来た瞬間、1 つの validator は halt し、他は走り続ける — Rust の panic セマンティクスはここで特に酷い（debug vs release、hook の差、etc.）。\`Result<i64, ...>\` を返せば、scanner のすべての呼び出し側に \`unwrap\`（panic を別名で）かエラー型のスレッディング（うまく扱える場所がない）を強要する。**Saturating-no-op がコンセンサスの決定性を無料でくれる。**
3. **\`saturating_add\` であって \`+\` ではない。** \`+\` を使うと 2 つの failure mode が出る。Debug ビルドでは \`100i64 + i64::MAX\` がオーバーフロー panic する (1 つの validator が halt、他は走り続け → fork)。Release ビルドではサイレントに負の値に wrap する — *これは \`balance ≥ 0\` の不変条件を破ると同時に、同じ演算を扱った peer ごとに異なる \`i64\` を生む → fork*。\`saturating_add\` はあらゆるビルドプロファイルで \`i64::MAX\` に頭打ちにする。全 validator が同じ数を見る。ネットワークが \`9.2 × 10^18\` を超える fee を蓄積することはどのみち起きないし、cap は病理的でない state では不可視だ。**\`saturating_*\` ファミリはコンセンサス安全な算術ファミリ。**
4. **新しい balance を返す。** 呼び出し側はそれを log したいケースがよくある（「fee credited: 150、fund balance now: 2,400,150」）。\`let _ = f.deposit(150); let new_balance = f.balance();\` の二段書きより、チェーンしたほうがきれい。\`&mut self\`-and-returns は標準ライブラリにもあるパターン（\`HashMap::insert\` が古い値を返すなど）。**有用な state を返す \`&mut self\` メソッドは、追加の \`balance()\` 呼び出しを省ける。**
5. **doc 文字列が「non-negative fee amount」と言い、実装は負も扱う。** 矛盾ではなく defensive ドキュメントだ。Doc は「こう渡してほしい」を言い、実装は「でも garbage が来てもクラッシュしない」を言う。**意図する契約を doc に書き、慈悲深い失敗モードを実装する。**

### Step 5: \`lib.rs\` にモジュールを配線

\`crates/liquidation/src/lib.rs\` を開く。2 つの変更を入れる。

まず、モジュール宣言。既存の \`pub mod compute;\` と \`pub mod types;\` のブロックの間に \`insurance\` を挿入:

\`\`\`rust
pub mod compute;
pub mod insurance;
pub mod types;
\`\`\`

次に、\`InsuranceFund\` re-export を追加。既存の \`pub use compute::{ ... };\` ブロックの後に \`insurance\` re-export を加える:

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
pub use insurance::{InsuranceFund, WithdrawOutcome};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

型と enum、両方を一度に re-export する。なぜ両方を今? **クレートの利用者は呼ぶものを import するから**だ。レッスン9 の \`withdraw_shortfall\` を呼ぶ path はすぐに \`WithdrawOutcome\` でパターンマッチする。レッスン8 で enum を re-export しておけば、レッスン9 では \`lib.rs\` に触れる必要がない。**Public surface はモジュール単位で一度だけ re-export する。メソッド単位ではない。**

### Step 6: 9 個の unit test を追加

\`insurance.rs\` の末尾にテストモジュールを追加:

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;

    // ─── construction ──────────────────────────────────────────────

    #[test]
    fn new_with_positive_balance() {
        let f = InsuranceFund::new(1_000);
        assert_eq!(f.balance(), 1_000);
    }

    #[test]
    fn new_with_zero_is_empty() {
        let f = InsuranceFund::new(0);
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn new_with_negative_clamps_to_zero() {
        let f = InsuranceFund::new(-500);
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn empty_is_zero() {
        let f = InsuranceFund::empty();
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn default_is_empty() {
        let f = InsuranceFund::default();
        assert_eq!(f.balance(), 0);
    }

    // ─── deposit ───────────────────────────────────────────────────

    #[test]
    fn deposit_accumulates() {
        let mut f = InsuranceFund::empty();
        assert_eq!(f.deposit(100), 100);
        assert_eq!(f.deposit(250), 350);
        assert_eq!(f.balance(), 350);
    }

    #[test]
    fn deposit_zero_is_noop() {
        let mut f = InsuranceFund::new(100);
        assert_eq!(f.deposit(0), 100);
    }

    #[test]
    fn deposit_negative_is_noop() {
        // Defensive: negative deposits must not silently drain the fund.
        let mut f = InsuranceFund::new(100);
        assert_eq!(f.deposit(-50), 100);
        assert_eq!(f.balance(), 100);
    }

    #[test]
    fn deposit_saturates_at_max() {
        let mut f = InsuranceFund::new(i64::MAX - 10);
        assert_eq!(f.deposit(1_000), i64::MAX);
    }
}
\`\`\`

このテストモジュールの形について 6 点:

1. **\`// ─── construction ───\` のセクション見出し。** 罫線文字のコメントで 4 つの論理グループ（construction · deposit · レッスン9 で: withdraw-covered · withdraw-partial · withdraw-depleted · sequencing · proptest）をマークする。最終的にこのモジュールは ~22 テスト持つ — セクション名で走査するほうが行番号でスクロールするより速い。**テストファイルが ~10 を超えるなら、グループ化する。**
2. **\`new_with_zero_is_empty\` は \`new\` のソースから自明に導けるのに、それでも存在する。** 冗長ではない — 挙動を lock するためのものだ。将来 \`> 0\` を \`>= 0\` に書き換えた場合（0 は両方の述語を正しく通すので）このテストでは捕れないが、typo を伴う書き換え（例: \`if initial_balance < 0\` への flip）は exactly このケースで落ちる。**小さい述語に対する境界テストは、大きいテストが取り逃す typo を捕える。**
3. **\`new_with_negative_clamps_to_zero\` は防御 surface を直接テストする。** *関数が動くこと* を検証するためのテストではない — *不変条件が保たれること* を検証するためのテストだ。将来のリファクタリングが \`new\` 内の見かけ上のデッドコード（クランプ）を「クリーンアップ」したら、このテストが捕える。**Defensive code のテストは defensive code を守る。**
4. **\`default_is_empty\` は 1 行で \`Default\` impl が \`Self::empty()\` を指していることを証明する** — derive されてないこと（derive でも \`balance: 0\` にはなるが、意図が違う）を locks。**テストは結果だけでなく、*どの経路がその結果を生むか* も lock できる。**
5. **\`deposit_negative_is_noop\` には \`// Defensive\` コメントがついている。** テストが守る failure mode を名前で呼ぶ:「負の deposit は fund を sneaky に drain してはならない」。将来このテストを削除しようとする読者がコメントを見て一旦考え直す。**簡潔なテストレベルのコメントは、テストを「不要」と思う将来のメンテナーへの足場だ。**
6. **\`deposit_saturates_at_max\` は初期 balance に \`i64::MAX - 10\` を使う。** なぜ \`i64::MAX\` ではないか。Max-balance fund への deposit はどのみち max で飽和する — テストは \`saturating_add\` を *\`wrapping_add\` に置換しても* 通る可能性がある。Wrap の挙動は \`i64::MAX + anything ≥ 0\` が負の値に wrap するが、\`+1000\` だと wrap して捕まる。Max の近くから始めれば、テストが saturation ロジックを *実際に発火* させる余地ができる。**Saturating 演算の境界テストは、境界が発火するためのバッファを取る。**

### Step 7: テストを走らせる

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
running 33 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
test compute::tests::close_short_with_buy ... ok
test compute::tests::equity_can_go_negative ... ok
... (Liquidation参照実装（計算パート） のテスト 21 個)
test insurance::tests::default_is_empty ... ok
test insurance::tests::deposit_accumulates ... ok
test insurance::tests::deposit_negative_is_noop ... ok
test insurance::tests::deposit_saturates_at_max ... ok
test insurance::tests::deposit_zero_is_noop ... ok
test insurance::tests::empty_is_zero ... ok
test insurance::tests::new_with_negative_clamps_to_zero ... ok
test insurance::tests::new_with_positive_balance ... ok
test insurance::tests::new_with_zero_is_empty ... ok

test result: ok. 33 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**33 テスト pass。** Insurance fund モジュールが存在し、不変条件は enforce され、deposit のセマンティクスは locked。Withdraw（と \`WithdrawOutcome\` payload のセマンティクス）は レッスン9 で着地する。

エラー時にありがちなパターン:

- **\`new_with_negative_clamps_to_zero\` が \`assertion failed: f.balance() == 0 — left: -500, right: 0\` で失敗。** \`if initial_balance >= 0 { initial_balance } else { 0 }\` と書いてしまっている — 負の値はクランプするが、\`-500\` を通してしまうケースだ。あるいはクランプを忘れて \`Self { balance: initial_balance }\` を書いている。\`if\` 条件を \`> 0\` で再確認する。
- **\`deposit_saturates_at_max\` がオーバーフロー panic で失敗。** \`self.balance.saturating_add(fee)\` ではなく \`self.balance += fee\` と書いている。Debug ビルドは overflow で panic する。Release ビルドは silently wrap する。\`saturating_*\` はコンセンサス安全な唯一の選択。
- **\`deposit_negative_is_noop\` が \`left: 50, right: 100\` で失敗。** \`if fee > 0\` ガードを忘れて \`saturating_add(-50)\` を走らせてしまっている — balance が 50 までデクリメントされる。Saturating add だけでは不変条件は守れない。述語が load-bearing だ。
- **\`new_with_zero_is_empty\` が \`left: 1, right: 0\` で失敗。** \`if initial_balance > 0 { initial_balance } else { 1 }\` のような else 分岐の typo。Else 分岐のリテラルを \`0\` で再確認。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **State は履歴が effective なレイヤーに現れる。** Fund の balance は「fund に対してこれまで起きたすべての deposit と withdraw」の事実だ。Snapshot 型はそれを表現できない — snapshot は「1 アカウント、1 瞬間」の事実だから。**入力からの再導出が不可能になる境界で初めて、コードに state が現れる。** Liquidation参照実装（計算パート） は一方向の境界、Liquidation参照実装（保険基金パート） は意図して反対側を踏み出した境界。

2. **\`balance ≥ 0\` の不変条件はコードで enforce、型システムでは enforce しない。** \`balance: u64\` にしてコンパイラに守らせることもできた。しなかった理由は、クレート他箇所が \`i64\` で計算しているからだ — u64 フィールドにすればすべての交差点でキャストを書かされる。判断は **型規律のトレードオフ**: クレート内部コードが最もきれいになる表現を選び、外部から untyped 入力を受け取るメソッドで不変条件を防御する。**クロスクレートの一様性が、フィールド単位の型安全性に勝つ — 不変条件が 1 行コードで済むなら。**

3. **Defensive code は境界に集中させ、コードベースに散らさない。** \`compute.rs\` はすべての入力を信用する。\`insurance.rs\` はすべての入力をチェックする。違いはこうだ。\`compute.rs\` は in-crate コードから呼ばれ、入力はすでに正しく構築されている。\`insurance.rs\` は境界 — bridge、scanner、ADL、（将来の）governance がすべて集まる点 — に座る。**1 つのモジュールが防御コストを払い、他は速く走る。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

レッスン8 の後:
- **insurance.rs** は Liquidation参照実装（保険基金パート） の \`insurance.rs\` の **118 行目まで一致**（\`withdraw_shortfall\`、proptest セクション、sequencing テストは レッスン9 で着地）。具体的には: doc コメント + 構造体 + \`WithdrawOutcome\` enum + \`deposit\` で終わる \`impl\` ブロック + \`impl Default\` + \`deposit_saturates_at_max\` までのテスト。
- **lib.rs** は Liquidation参照実装（保険基金パート） の \`lib.rs\` の \`pub mod\` 行と \`InsuranceFund / WithdrawOutcome\` re-export について **byte-for-byte 一致**。（\`lib.rs\` 冒頭の roadmap コメントも更新する — このレッスンでは optional な cosmetic edit だ。レッスン9 で答え合わせと完全一致に持っていく。）

## よくある質問

**Q1: なぜ \`Option<NonZeroI64>\` などで不変条件を型レベルの事実にしないのか?**

そうすると、\`compute.rs\` のすべての利用者が算術のために option を unwrap させられる。\`compute.rs\` の関数群はゼロを正しく処理できることがすでに validate されている。\`Option\` 境界を通しても、保護できないものを保護しようとして dead 分岐が増えるだけだ。**型レベル不変条件は、多くの呼び出し側が値を *構造的に読む* ときには素晴らしい。多くの呼び出し側が値で *計算したい* だけのときには、相対的にメリットが薄い。**

**Q2: \`deposit\` は新しい balance ではなく \`Result<i64, FundError>\` を返すべきではないか?**

返さない。呼び出し地点で区別する価値のある failure mode が存在しないからだ。Saturation は silent でいい（正しい挙動だから — fund は実際に \`i64::MAX\` で頭打ちになる）。負の fee も silent でいい（呼び出し側の bug だから — \`Result\` を返せば scanner のすべての呼び出し地点でエラーハンドリングをスレッドさせられる、しかも結局そのエラーは無視するだけ）。**\`Result\` は呼び出し側に意味のあるアクションが取れるときに使え。ここではない。**

**Q3: \`withdraw_shortfall\` が レッスン9 なのに、なぜ \`WithdrawOutcome\` を レッスン8 で宣言するのか?**

理由が 3 つ。(1) Re-export 観点 — レッスン8 で \`lib.rs\` が enum を export しておけば、レッスン9 は \`lib.rs\` に触らない。(2) Public-surface の語彙観点 — レッスン8 後に \`insurance.rs\` を眺める読者は、メソッドが後回しでも、モジュールの型語彙を一目で見られる必要がある。(3) Variant 群が safety-cascade アーキテクチャを文書化する — *形* が Layer 2 → 3 遷移のどこに fund が座るかを読者に教える。**型はコンパイルされるドキュメント。語れるときに宣言する、呼ぶときではなく。**

**Q4: \`InsuranceFund\` を独立した \`i64\` 値 + モジュールレベルの mutation 関数（global state っぽい形）にできるか?**

技術的にはイエス、メカニズム的にはノー。Liquidation参照実装（スキャナパート） の scanner は fund を \`LiquidationScanner\` のフィールドとして所有する。Bridge が scanner を所有する。Fund を呼び出しスタックでスレッディングすれば（global state に手を伸ばす代わりに）、scanner が単体テスト可能になる。**コンセンサスに触れる state は既知のコンポーネントに所有させなければならない。「スタック位置による所有」が、複数の scanner を干渉なく共存させる規律になる。**

**Q5: なぜ \`new\` は \`const fn\` で \`deposit\` は違うのか?**

\`new\` は引数と \`Self\` コンストラクタしか読まない — \`&mut self\` 経由の mutation を含む処理がない。\`deposit\` は \`self.balance\` を mutate する — Rust は現状、非自明な const 型に対する \`const fn\` での mutation を許していない。\`new\` が const なら \`static FUND: InsuranceFund = InsuranceFund::new(0);\` がコンパイルできる — これがテストや（後の）default-config 定数に役立つ。**\`const fn\` にできるものは \`const fn\` にする — 境界は通常「関数が state を mutate するかどうか」。**

## 次のレッスン (レッスン9) — \`withdraw_shortfall\`

レッスン9 は withdraw path で \`insurance.rs\` を閉じる。レッスン8 で宣言した \`WithdrawOutcome\` enum がついに使われる: \`withdraw_shortfall(amount)\` は fund に十分な balance があれば \`Covered { amount }\` を、0 まで drain したら \`PartiallyDrained { amount, unfilled }\` を、すでに空だったら \`Depleted { unfilled }\` を返す。

おもしろい点が 2 つ。(1) 3-variant の outcome は、safety-net cascade の Layer 2 → Layer 3 境界の **3 つの遷移そのもの** だ。(2) 4 つの proptest が保存則を enforce する — \`balance_never_negative\`、\`deposit_is_additive\`、\`withdraw_amount_matches_balance_delta\`、\`withdraw_amount_plus_unfilled_equals_shortfall\`。Proptest こそが、カスケード数学を「型システムでは表現しきれないが、プロパティとして検証可能」な形に押し上げる場所だ。
`,
                },
                {
                  title: "レッスン 9 — withdraw_shortfall — Layer 2 → Layer 3 境界をコードで表現する",
                  slug: "openhl-liquidation-withdraw-shortfall-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン 9 — \`withdraw_shortfall\` — Layer 2 → Layer 3 境界をコードで表現する

## ゴール

このレッスンで掴む概念:

- **3-variant の outcome enum はカスケード境界を型で表現したもの。** \`WithdrawOutcome::Covered\` は「Layer 2 が完全に吸収した」。\`PartiallyDrained\` は「Layer 2 が吸収できた分だけ吸収し、残りはエスカレートする」。\`Depleted\` は「Layer 2 には何もなく、すべてがエスカレートする」。ADL参照実装パート の ADL ルーチンはこの enum で pattern-match して、自分が何をすべきかを決める。**複数ステージにまたがるアーキテクチャの継ぎ目は、複数の呼び出し地点にまたがる enum variant になる。**
- **全域関数 (total function) のための early-return はしご (ladder)。** \`withdraw_shortfall\` は 4 つの異なるケース（非正な shortfall、空 fund、十分な balance、部分 drain）を扱う。ネストした \`match\` ではなく、4 つの guarded early return で並べる。はしごは上から「これは *この* ケースか? Yes なら return、No なら次へ」と読める。**各ケースが独立しているとき、early return は条件構造を平坦化する。**
- **保存則を proptest で encode する。** 型システムは「この enum は 3 variant ある」までは表現できる。だが「どの variant が発火しても \`amount + unfilled = 元の shortfall\`」までは表現できない。\`(initial_balance, requested_shortfall)\` のペアに対する proptest が、何千ものランダム入力で保存則を証明してくれる。**Proptest は、コンパイラが enforce できない不変条件をテストスイートが *enforce する* 形に格上げする道具だ。**
- **新しい state ではなく *outcome* を返す \`&mut self\` メソッド。** \`deposit\`（新しい balance を返す）と違い、\`withdraw_shortfall\` はパスごとに *質的に異なる shape* を返す。3 variant × 異なる payload = 同じメソッドに対する「いま何が起きたか」の 3 種類の応答。**Mutation が質的に異なる成功モードを持つときは、その違いを型で返せ。**

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 45 テストが pass する（compute 24 + insurance 21: レッスン8 の 9 + 新規 unit test 8 + 新規 proptest 4）。レッスン9 の後、\`insurance.rs\` は \`260883b\` と byte-for-byte 一致する。

具体的な変更:

- **\`src/insurance.rs\`。** \`impl InsuranceFund\` ブロックに \`withdraw_shortfall\` を追加し、3 variant と negative・zero エッジケースをカバーする 7 個の unit test、deposit + withdraw を組み合わせた 1 個の sequencing test、4 個の proptest を追加。
- **\`lib.rs\` に変更なし。** \`WithdrawOutcome\` は レッスン8 で再 export 済み。

レッスン9 で insurance fund モジュールを閉じる。本レッスンの後、\`260883b\` に対する答え合わせ diff は \`insurance.rs\` で完全にクリーンになる。

## おさらい

レッスン8 の後:
- \`insurance.rs\` が存在する。\`InsuranceFund\` 構造体、\`WithdrawOutcome\` enum（宣言済みだが未使用）、3 種類のコンストラクタ、\`balance()\` アクセサ、\`deposit()\` 変更子が揃っている。
- \`lib.rs\` は \`InsuranceFund\` と \`WithdrawOutcome\` の両方を re-export 済み。
- \`cargo test\` は 33 テストを走らせ、すべて green。
- Fund は deposit を **蓄積する**（\`balance ≥ 0\` の不変条件は public メソッドすべてで守られている）。まだ **drain しない**。

レッスン9 で drain path を配線する。レッスン8 で読者が出会った enum が、ついに variant を返すメソッドを得る。

## 計画

編集は 2 つ:

1. **\`crates/liquidation/src/insurance.rs\` の \`impl InsuranceFund\` ブロックに \`withdraw_shortfall\` を追加。** メソッドは doc コメントを含めて約 20 行。実装は 4 つの入力ケースを扱う early-return はしごだ。
2. **既存の \`#[cfg(test)] mod tests\` ブロックに 8 個の unit test と 4 個の proptest を追加。** Proptest にはモジュール冒頭にちょっとした変更が必要だ — \`use proptest::prelude::*;\` を加え、\`proptest! { ... }\` ブロックでプロパティ assertion を包む。

> 🛑 **予測。** 続きを読む前に考えてほしい。Balance 300 の fund に \`withdraw_shortfall(500)\` が来た。新しい balance は? メソッドが返すべき \`WithdrawOutcome\` の variant は? payload の値も含めて答える。次に、同じ fund に対する次の呼び出し \`withdraw_shortfall(100)\` を想像する。同じ問いに答える。

（答え: **1 回目:** balance は 0 になり、outcome は \`PartiallyDrained { amount: 300, unfilled: 200 }\`。Fund は持っていた 300 すべてを cover し、200 を ADL にエスカレートする必要がある。**2 回目:** balance は 0 のまま、outcome は \`Depleted { unfilled: 100 }\`。この呼び出しが始まる前から fund は空だったので、\`PartiallyDrained { amount: 0, unfilled: 100 }\` ではなく \`Depleted\` を返す。区別は重要だ。\`PartiallyDrained\` は「何かは支払った」、\`Depleted\` は「何も支払っていない」。Liquidation参照実装（スキャナパート） の scanner はこの 2 つを別々にログに残す — オペレーション上、片方は「fund が drain しつつある」状態を表し、もう片方は「fund がすでに枯渇した」状態を表すからだ。）

3 つの variant のメンタルモデル:

\`\`\`
   初期 state                呼び出し                       Outcome variant
   ─────────                ────────                       ────────────────
   balance = 1000        withdraw_shortfall(300)        Covered { amount: 300 }
   balance = 1000        withdraw_shortfall(1000)       Covered { amount: 1000 }     ← ぴったり drain
   balance =  300        withdraw_shortfall(500)        PartiallyDrained {            ← 部分のみ
                                                          amount: 300,
                                                          unfilled: 200
                                                        }
   balance =    0        withdraw_shortfall(500)        Depleted { unfilled: 500 }    ← 渡すものがない
   balance = 1000        withdraw_shortfall(0)          Covered { amount: 0 }         ← no-op
   balance = 1000        withdraw_shortfall(-100)       Covered { amount: 0 }         ← defensive

   ── 各呼び出し後 ─────────────────────────────────────────────────────────
   新しい balance         payout の \`amount\` 累計          常に ≥ 0
   \`unfilled\` payload      ADL（ADL参照実装パート）にエスカレート   Layer 3 の入力を運ぶ
\`\`\`

Variant の割り当てで押さえる点が 3 つ:

1. **\`Covered\` は「ぴったり一致」と「no-op」の両方を扱う。** Balance と完全に等しい shortfall は \`Covered { amount: balance }\`。Shortfall ゼロも \`Covered { amount: 0 }\`。Variant は「fund は求められたものを持っていた」を意味し、payload はそれがいくらだったかを示す。**Variant の payload は magnitude を運び、variant それ自体は意味を運ぶ。**
2. **\`PartiallyDrained\` は正の balance *かつ* 不十分・非ゼロの deficit が同時に揃わないと発火しない。** \`balance == 0\` なら \`Depleted\` に、\`shortfall ≤ balance\` なら \`Covered\` に分岐する。残った \`PartiallyDrained\` の eligibility window はかなり狭い — この狭さこそが呼び出し地点での情報価値を生む。**各 variant は、他のどの variant も発火しない条件下でのみ発火する。**
3. **\`Depleted\` は state を変えない。** Balance はすでに 0、メソッドは unfilled を surface する以外何もしない。Variant は *観測されるため* に存在し、アクションを記録するためではない。**「状態変更を伴わない」variant を持つ outcome enum は、アーキテクチャ設計における正解のサインだ。副作用の有無ではなく、cascade のどの位置にいるかに基づいて呼び出し側を正しくルーティングできる。**

## 手を動かす walk-through

### Step 1: \`impl InsuranceFund\` ブロックに \`withdraw_shortfall\` を追加

\`crates/liquidation/src/insurance.rs\` を開く。既存の \`impl InsuranceFund { ... }\` ブロックを見つける。\`deposit\` の後に \`withdraw_shortfall\` を追記:

\`\`\`rust
    /// Attempt to absorb \`shortfall\` from the fund.
    ///
    /// Three outcomes:
    ///   - \`shortfall ≤ balance\` → [\`WithdrawOutcome::Covered\`], balance
    ///     decreases by \`shortfall\`.
    ///   - \`0 < balance < shortfall\` → [\`WithdrawOutcome::PartiallyDrained\`],
    ///     balance drops to 0, unfilled = \`shortfall − prior_balance\`.
    ///   - \`balance == 0\` → [\`WithdrawOutcome::Depleted\`], no state change,
    ///     unfilled = \`shortfall\`.
    ///
    /// Non-positive \`shortfall\` is treated as a successful no-op
    /// (\`Covered { amount: 0 }\`): no balance change, no escalation.
    pub fn withdraw_shortfall(&mut self, shortfall: i64) -> WithdrawOutcome {
        if shortfall <= 0 {
            return WithdrawOutcome::Covered { amount: 0 };
        }
        if self.balance == 0 {
            return WithdrawOutcome::Depleted {
                unfilled: shortfall,
            };
        }
        if self.balance >= shortfall {
            self.balance -= shortfall;
            WithdrawOutcome::Covered { amount: shortfall }
        } else {
            let prior = self.balance;
            self.balance = 0;
            WithdrawOutcome::PartiallyDrained {
                amount: prior,
                unfilled: shortfall - prior,
            }
        }
    }
\`\`\`

この 20 行のメソッドで押さえる点が 6 つ:

1. **Early-return はしごが 4 ケースを評価順で扱う。** 非正な shortfall が最初（defensive）。空 fund が 2 番目（balance を動かせない）。十分な balance が 3 番目（happy path）。部分 drain が 4 番目（fallthrough）。**各 guard は独立している — どれもカスケードしない。** Guarded early-return はしごがここでネスト \`match\` に勝つのは、ケースが構造を共有しないからだ。それぞれの入力 shape が異なる（\`shortfall <= 0\` vs \`balance == 0\` vs \`balance >= shortfall\` vs それ以外）。
2. **\`shortfall <= 0\` で負とゼロを 1 分岐で扱う。** ゼロ shortfall は意味のある呼び出し（「fee はゼロだった、fund から引くものがない」）、負の shortfall は呼び出し側の bug。両方とも同じ \`Covered { amount: 0 }\` を返す — caller-facing なセマンティクスが同一だからだ。何も引かれず、何もエスカレートしない。**入力ケース（の分類）は、呼び出し側の「意図 (intent)」ではなく、最終的な「結果 (outcome)」を基準にグループ化しろ。**
3. **\`self.balance -= shortfall\` は \`saturating_sub\` ではなく素の \`-\`。** 直前の guard（\`self.balance >= shortfall\`）が、\`i64\` のアンダーフローが構造的に発生しえないことを **全 validator に対して決定論的に証明** しているからだ。レッスン8 の「コンセンサス state では panic が絶対悪」原則と矛盾しているように見えるが、矛盾していない: 静的な条件分岐で panic 確率が 0% だと保証されている文脈に限り、冗長な saturating 演算を外して素の減算を使える。**減算の前提条件で型不変条件が成立しているなら、saturating 演算は冗長になる。** これは \`deposit\` の \`saturating_add\` の逆パターン: あちらでは前提条件を証明できなかったので saturate した。こちらでは証明できた（\`if\` がその証明）ので素の subtraction を使う。
4. **\`PartiallyDrained\` の構築では、\`prior\` を最初に局所変数に保存し、その後 \`balance = 0\` を実行し、最後に variant を構築する。** 順序が重要だ。\`WithdrawOutcome::PartiallyDrained { amount: self.balance, unfilled: shortfall - self.balance }\` と書いてから \`self.balance = 0\` を実行しても、構築は問題なく動く（\`self.balance\` は mutation 前にキャプチャされる）。だが struct 構築の後に代入を置くと、後付けっぽく読める。\`prior\` を先に保存すれば、時間的順序が明白になる。read → mutate → construct。**State-machine の遷移では、mutation 後に参照する prior state を明示的に名前付けする。**
5. **\`Covered { amount: shortfall }\` は subtraction 前の \`self.balance\` ではなく \`shortfall\` を直接使う。** これで OK な理由は、すでに \`self.balance >= shortfall\` をチェックしているので、\`shortfall\` がまさに支払った額だからだ。**両者が等しいとき、payload には *available* な額ではなく *requested* な額を載せる — そのほうが呼び出し側のメンタルモデルに合う。**
6. **メソッドは \`&mut self\` を取り、値を返す。** Reference なし、lifetime なし、\`Result\` なし。Variant *それ自体* が成功の shape だ。Borrow checker はこのメソッドを \`deposit\` の \`-> i64\` と同じに扱う。**値返しの outcome enum は呼び出し地点での \`match\` と滑らかに compose する。Caller に borrow 管理を強制しない。**

> 🛑 **やりがちな勘違い。** 「\`Result<i64, FundError>\` にして、\`FundError::PartiallyDrained(amount, unfilled)\` と \`FundError::Depleted(unfilled)\` を error にすれば?」 問題が 3 つ。(1) \`PartiallyDrained\` と \`Depleted\` は *エラーではない* — エスカレート作業を caller に surface する成功 outcome だ。これを error にタグ付けすると、「メソッドが失敗した」と「メソッドが caveat 付きで成功した」の境界がぼやける。(2) \`Result\` に対する \`?\` 演算子は caller を short-circuit させる。だがここでは short-circuit を *望まない* — caller には pattern-match して route してほしい。(3) \`WithdrawOutcome\` は後の signed-outcome wrapper（Liquidation参照実装（スキャナパート））からも返される。\`Result\` にすると、すべての consumer がヘルパーを \`Result\` propagation で包まされる。**\`Result\` は「巻き戻すべきか?」のためのもの。Enum は「いまどんな成功をしたか?」のためのもの。**

### Step 2: 8 個の unit test を追加

\`insurance.rs\` の既存 \`#[cfg(test)] mod tests { ... }\` ブロックの中、レッスン8 の deposit テストの後に 3 つのテストセクションを追加:

\`\`\`rust
    // ─── withdraw_shortfall: Covered ───────────────────────────────

    #[test]
    fn withdraw_covered_typical() {
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(300);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 300 });
        assert_eq!(f.balance(), 700);
    }

    #[test]
    fn withdraw_covered_exact_balance() {
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(1_000);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 1_000 });
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn withdraw_zero_is_covered_noop() {
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(0);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 0 });
        assert_eq!(f.balance(), 1_000);
    }

    #[test]
    fn withdraw_negative_is_covered_noop() {
        // Defensive: a negative shortfall is a caller bug, not a deposit.
        let mut f = InsuranceFund::new(1_000);
        let out = f.withdraw_shortfall(-100);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 0 });
        assert_eq!(f.balance(), 1_000);
    }

    // ─── withdraw_shortfall: PartiallyDrained ──────────────────────

    #[test]
    fn withdraw_partial_drains_to_zero() {
        let mut f = InsuranceFund::new(300);
        let out = f.withdraw_shortfall(500);
        assert_eq!(
            out,
            WithdrawOutcome::PartiallyDrained {
                amount: 300,
                unfilled: 200
            }
        );
        assert_eq!(f.balance(), 0);
    }

    // ─── withdraw_shortfall: Depleted ──────────────────────────────

    #[test]
    fn withdraw_depleted_no_change() {
        let mut f = InsuranceFund::empty();
        let out = f.withdraw_shortfall(500);
        assert_eq!(out, WithdrawOutcome::Depleted { unfilled: 500 });
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn withdraw_after_full_drain_is_depleted() {
        let mut f = InsuranceFund::new(100);
        let _ = f.withdraw_shortfall(100); // Covered, drains to 0
        let out = f.withdraw_shortfall(50);
        assert_eq!(out, WithdrawOutcome::Depleted { unfilled: 50 });
    }

    // ─── deposit + withdraw sequencing ─────────────────────────────

    #[test]
    fn deposit_after_drain_recovers() {
        let mut f = InsuranceFund::new(100);
        let _ = f.withdraw_shortfall(100); // drains
        f.deposit(50);
        let out = f.withdraw_shortfall(30);
        assert_eq!(out, WithdrawOutcome::Covered { amount: 30 });
        assert_eq!(f.balance(), 20);
    }
\`\`\`

テストのグループ化で押さえる点が 6 つ:

1. **3 つのセクション区切り — Covered、PartiallyDrained、Depleted — が variant 名と完全に一致する。** 特定の \`WithdrawOutcome\` variant のテストを探して file を grep する読者は、セクションヘッダで一発に当たる。**Enum の variant を exercise するテストは variant でグループ化する。**
2. **\`withdraw_covered_exact_balance\` は \`balance >= shortfall\` 分岐の境界ケース。** \`balance == shortfall\` のとき \`>=\` 述語は true になり、\`Covered\` パスが発火する。テストは将来の off-by-one リファクタリング（\`>\` への変更）を捕える。**不等号述語の境界テストは、よくあるリファクタミスを最も多く捕える。**
3. **\`withdraw_partial_drains_to_zero\` は \`PartiallyDrained\` の *唯一の* テスト。** 1 個で十分なのは、variant のパスがユニークだからだ。\`0 < balance < shortfall\` のときに発火し、計算（\`amount = balance\`、\`unfilled = shortfall - balance\`）は struct 構築の直接読み出しに過ぎない。**Single-path コードは single-path カバレッジで足りる。下の proptest が全パス横断の保存則を担当する。**
4. **\`withdraw_after_full_drain_is_depleted\` は variant だけでなく state 遷移をテストする。** Setup なしの素朴なテスト（empty fund に withdraw）は \`withdraw_depleted_no_change\` でカバー済み。この 2 つ目の \`Depleted\` テストは別クラスの bug を捕える。Mutation 前の balance をキャッシュしてしまい、*2 回目* の呼び出しが *1 回目* の drain 前 balance を見るような future リファクタリングだ。**1 つの variant に対する複数テストは、それぞれ *違うクラスの regression* を捕えるべき。**
5. **\`deposit_after_drain_recovers\` が唯一の sequencing テスト。** 4 つの操作（\`new\`、\`withdraw_shortfall\`、\`deposit\`、\`withdraw_shortfall\`）をチェーンし、最終 balance と outcome を assert する。Per-operation テストは各メソッドを単体で検証するが、現実の liquidation event 系列はまさにこのタイプの多段チェーンだ。**Unit test はメソッドを検証する。Sequencing test はメソッド境界を跨ぐ state-machine 遷移を検証する。**
6. **Negative-shortfall テストには \`// Defensive\` のマーカーコメントがある。** レッスン8 の \`deposit_negative_is_noop\` と同じパターン。「我々は負を渡さない、このテストは dead code」と判断しようとする将来のメンテナーが、この 1 ワードコメントで足を止める。**マーカーコメントは、リファクタリング除去から defensive code を守るためのテストの方法だ。**

### Step 3: 4 個の proptest を追加

Proptest は \`insurance.rs\` の保存則だ。特定の input → output の関係をテストするのではない。*すべての* valid 入力ペアが、型システムでは表現できないプロパティを満たすことをテストする。

まず、proptest の import を \`#[cfg(test)] mod tests\` ブロックの冒頭（\`use super::*;\` と最初の \`#[test]\` の間）に追加:

\`\`\`rust
    use proptest::prelude::*;
\`\`\`

その後、unit test の下に proptest ブロックを追加:

\`\`\`rust
    // ─── proptest: type invariants ─────────────────────────────────

    proptest! {
        /// The fund's balance is never negative after any sequence of
        /// deposits and withdraws.
        #[test]
        fn balance_never_negative(
            ops in proptest::collection::vec(
                proptest::prelude::any::<(bool, i64)>(),
                0..20,
            ),
        ) {
            let mut f = InsuranceFund::empty();
            for (is_deposit, amount) in ops {
                if is_deposit {
                    f.deposit(amount);
                } else {
                    f.withdraw_shortfall(amount);
                }
                prop_assert!(f.balance() >= 0);
            }
        }

        /// \`deposit(x).deposit(y)\` accumulates: balance after two deposits
        /// equals the sum of the two (modulo saturation at i64::MAX).
        #[test]
        fn deposit_is_additive(a in 0_i64..1_000_000, b in 0_i64..1_000_000) {
            let mut f = InsuranceFund::empty();
            f.deposit(a);
            f.deposit(b);
            prop_assert_eq!(f.balance(), a + b);
        }

        /// After a withdraw, the change in balance equals the \`amount\`
        /// reported in the outcome — regardless of which variant fired.
        #[test]
        fn withdraw_amount_matches_balance_delta(
            initial in 0_i64..1_000_000,
            shortfall in 0_i64..1_000_000,
        ) {
            let mut f = InsuranceFund::new(initial);
            let before = f.balance();
            let out = f.withdraw_shortfall(shortfall);
            let after = f.balance();
            let delta = before - after;
            match out {
                WithdrawOutcome::Covered { amount }
                | WithdrawOutcome::PartiallyDrained { amount, .. } => {
                    prop_assert_eq!(delta, amount);
                }
                WithdrawOutcome::Depleted { .. } => {
                    prop_assert_eq!(delta, 0);
                }
            }
        }

        /// Conservation: \`amount + unfilled\` across all outcome shapes
        /// always equals the original (positive) shortfall.
        #[test]
        fn withdraw_amount_plus_unfilled_equals_shortfall(
            initial in 0_i64..1_000_000,
            shortfall in 1_i64..1_000_000,
        ) {
            let mut f = InsuranceFund::new(initial);
            let out = f.withdraw_shortfall(shortfall);
            let total = match out {
                WithdrawOutcome::Covered { amount } => amount,
                WithdrawOutcome::PartiallyDrained { amount, unfilled } => amount + unfilled,
                WithdrawOutcome::Depleted { unfilled } => unfilled,
            };
            prop_assert_eq!(total, shortfall);
        }
    }
\`\`\`

4 つのプロパティで押さえる点が 8 つ:

1. **\`balance_never_negative\` は レッスン8 の型不変条件 *そのもの* のテストだ。** \`balance ≥ 0\` の規律が任意の系列上で成立することを証明する proptest。入力 — 長さ 0 から 20 までの \`(is_deposit, amount)\` ペアのベクター — は、state-machine の到達可能トラジェクトリのほぼすべてを 1000 ケース未満でカバーする。**型不変条件の proptest は、defensive coding が機能することを示す最強の言明だ。**
2. **\`deposit_is_additive\` は \`i64::MIN..i64::MAX\` ではなく bounded な範囲（\`0..1_000_000\`）を使う。** なぜか。範囲が広いと、プロパティに saturation 挙動を encode させる必要が出てくる。Bounded 範囲なら \`a + b ≤ 2_000_000\` で \`i64::MAX\` には届かない。Saturation は発火せず、厳密等価を使える。**Proptest の入力範囲は、プロパティが素直に表現できる operating range に合わせる。境界ケースは unit test に任せる。** （レッスン8 の \`deposit_saturates_at_max\` unit test が saturation 境界を担当する。Proptest は算術恒等性を担当する。）
3. **\`withdraw_amount_matches_balance_delta\` は Rust のパターンマッチの強力な機能である or-pattern を使う: \`Covered { amount } | PartiallyDrained { amount, .. }\`。** 異なる variant でも同名・同型のフィールド（ここでは \`amount: i64\`）であれば \`|\` で束縛を統合できる（Rust 1.53+ でネストパターンも含めて強化されている）。両 variant とも \`amount\` フィールドを持ち、プロパティは両者で同じ（「delta は報告された \`amount\` に等しい」）。\`..\` は \`PartiallyDrained\` の \`unfilled\` フィールドを — ここで必要ないので — スキップする。**Or-pattern は、別 variant 同士が payload フィールドを共有するとき、条件ロジックを平坦化する。**
4. **Proptest は *どの* variant が発火するかを予測しない。** \`initial=300, shortfall=500\` のとき「これは \`PartiallyDrained\` のはず」を計算したりはしない。メソッドに決めさせて、その後プロパティを assert する。**Proptest はプロパティを assert する、パスを assert するのではない。** テスト対象のメソッドを再実装してその出力を予測する「テスト」は、テストではなく鏡だ。
5. **\`withdraw_amount_plus_unfilled_equals_shortfall\` は \`shortfall in 1..1_000_000\`（正のみ）。** ゼロ境界は \`Covered { amount: 0 }\` で、保存則は \`0 + 0 = 0\` として trivially 成立する。だがプロパティは「実際に shortfall がある regime」で最も情報価値がある。範囲制限がテストを意味のある領域に置く。**入力範囲は、プロパティが *何かを語る* 領域に絞る。**
6. **「deposit に続いて withdraw」をカバーする proptest はない。** Sequenced ケースは \`deposit_after_drain_recovers\` unit test が手動でカバーする。なぜプロパティ化しないか。プロパティ化すると \`(deposit_amount, balance_before_withdraw)\` を assertion にスレッドする必要があり、読みにくく書きにくくなる。系列が短いので unit test のほうが illustrative だ。**Arbitrary 入力上のプロパティには proptest、sequenced narrative には unit test を使う。**
7. **4 つの proptest はすべて \`prop_assert!\` / \`prop_assert_eq!\` を使う。\`assert!\` ではない。** \`prop_*\` マクロは失敗時に shrinkage 情報を emit する — proptest が反例を見つけたとき、*最小の* 失敗入力を報告できる。**\`proptest!\` ブロック内では proptest 専用マクロを使う。素の \`assert!\` は shrinkage を無効にする。**
8. **Proptest ブロックはテストモジュールの *末尾* に置く。** Unit test は速く落ちて正確なメッセージをくれる。Proptest は挙動の *分布* をくれる。Proptest を unit test の後に置けば、何か壊れたときの失敗ストリームは、最も診断価値の高い情報から先に並ぶ。**ファイル内のテスト順序は「signal-to-noise が高いものから先」。**

### Step 4: テストを走らせる

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

期待される出力（短縮版。先頭に compute の 24 テスト、その後に insurance）:

\`\`\`
running 45 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
... (compute テストがさらに 22 個)
test insurance::tests::balance_never_negative ... ok
test insurance::tests::default_is_empty ... ok
test insurance::tests::deposit_accumulates ... ok
test insurance::tests::deposit_after_drain_recovers ... ok
test insurance::tests::deposit_is_additive ... ok
test insurance::tests::deposit_negative_is_noop ... ok
test insurance::tests::deposit_saturates_at_max ... ok
test insurance::tests::deposit_zero_is_noop ... ok
test insurance::tests::empty_is_zero ... ok
test insurance::tests::new_with_negative_clamps_to_zero ... ok
test insurance::tests::new_with_positive_balance ... ok
test insurance::tests::new_with_zero_is_empty ... ok
test insurance::tests::withdraw_after_full_drain_is_depleted ... ok
test insurance::tests::withdraw_amount_matches_balance_delta ... ok
test insurance::tests::withdraw_amount_plus_unfilled_equals_shortfall ... ok
test insurance::tests::withdraw_covered_exact_balance ... ok
test insurance::tests::withdraw_covered_typical ... ok
test insurance::tests::withdraw_depleted_no_change ... ok
test insurance::tests::withdraw_negative_is_covered_noop ... ok
test insurance::tests::withdraw_partial_drains_to_zero ... ok
test insurance::tests::withdraw_zero_is_covered_noop ... ok

test result: ok. 45 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**45 テスト pass。Insurance fund モジュールは \`260883b\` と byte-for-byte 一致。** Liquidation参照実装（保険基金パート） の stateful core が完成した。残るは close-outcome decomposition（\`liquidation_fee\`、\`solvent_close_outcome\`、\`underwater_close_outcome\`）で、レッスン10 で着地する。

エラー時にありがちなパターン:

- **\`balance_never_negative\` が \`[(false, -100)]\` のような shrunken な反例で失敗。** あなたの \`withdraw_shortfall\` は負の \`shortfall\` を deposit のように扱っている（負を引く = 足す）。Defensive ガード \`if shortfall <= 0 { return ... }\` は最初のガードでなければならない — state mutation の前に。
- **\`withdraw_amount_plus_unfilled_equals_shortfall\` が \`initial=300, shortfall=500\` で \`total=300\` を吐いて失敗。** あなたの \`PartiallyDrained\` は \`amount\` しか運んでおらず、\`unfilled\` が抜けている。Struct 構築を読み直す。両フィールドが populate され、その合計が \`shortfall\` に等しくなければならない。
- **\`withdraw_amount_matches_balance_delta\` が Depleted ケースで \`delta=-N\` を吐いて失敗。** あなたの \`withdraw_shortfall\` は Depleted 分岐で \`self.balance\` を mutate している — してはならない。分岐は state に触れずに即 return する。
- **\`withdraw_covered_exact_balance\` は pass するのに \`withdraw_partial_drains_to_zero\` が \`balance=300, expected 0\` で失敗。** \`if self.balance >= shortfall\` 分岐は正しいが、\`else\` 分岐で \`self.balance = 0\` を忘れている。部分 drain パスは常に balance をゼロにする。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **\`Option\` でも \`Result\` でもなく、3-variant の outcome enum。** \`Option<i64>\` は「N を支払ったか、何も支払わなかったか」を表現できるが、「持っていた全額を支払った」と「持っていなかった」の区別が消える。\`Result<i64, FundError>\` は両方を運べるが、partial-drain を *失敗* としてタグ付けする — 失敗ではないのに。**正しい shape は、caller の実際の決定木にマッチする enum**。Caller（Liquidation参照実装（スキャナパート） の scanner）には 3 つの異なる routing 判断がある。完全 absorb をログ、部分 absorb + escalate をログ、depletion + escalate をログ。

2. **4 ケースの early-return はしご。** ケースは「これは自明に答えか?」順でチェックされる。負 shortfall（defensive）、空 fund（仕事ができない）、十分 balance（happy path）、部分 drain（fallthrough）。順序は operational に意味がある。*コスト順* の系列だ — 最も安いチェックが先、構造的 mutation は最後。**State-machine メソッドの guard はコスト順で評価する。**

3. **Proptest suite が型システムでは表現できない不変条件を encode する。** \`balance_never_negative\` は レッスン8 の型不変条件の proptest。\`withdraw_amount_plus_unfilled_equals_shortfall\` はカスケード数学の保存則。\`deposit_is_additive\` は deposit の abelian-group 構造を証明する。\`withdraw_amount_matches_balance_delta\` は variant payload と観測される state 変化を結ぶ。**4 つのプロパティを合わせれば、すべての public メソッドの契約は、テストスイートが *probe* するものではなく *prove* できるものになる。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
\`\`\`

レッスン9 の後:
- **insurance.rs** は Liquidation参照実装（保険基金パート） の \`insurance.rs\` と **byte-for-byte 一致**。State machine 全体 — struct、enum、3 コンストラクタ、accessor、deposit、withdraw_shortfall、Default impl、12 unit test、4 proptest — がファイルに揃う。
- **lib.rs** は レッスン8 以降すでに byte-for-byte 一致している。

レッスン8 で \`lib.rs\` の \`mod\` 順序や re-export スタイルを微妙に変えてしまった場合、ここで答え合わせと揃える。答え合わせは \`pub mod compute; pub mod insurance; pub mod types;\` と \`pub use insurance::{InsuranceFund, WithdrawOutcome};\` を 1 行で書く。空白の差は無害だ。

## よくある質問

**Q1: \`withdraw_shortfall\` を \`&mut self\` + \`Result<i64, WithdrawOutcome>\`（成功ケースが新 balance、「エラー」ケースがエスカレート情報を運ぶ）にしないのはなぜか?**

カスケードパターンは caller に *常に* pattern-match を要求するからだ。\`Result\` を使うと典型的な Rust イディオムは \`let new_balance = f.withdraw_shortfall(s)?;\` になる。だが \`?\` は最初の partial drain で scanner のループを short-circuit する — *まさに望まない* 挙動だ（scanning を続けて、後のイベントから deposit を吸収したい）。値返しの variant を返せば、caller は各 outcome を明示的に考えざるを得ない。**\`?\` 演算子は「caveat 付き成功」セマンティクスに向かない。**

**Q2: \`Covered\` の \`amount\` フィールドは \`shortfall\`（要求）であるべきか、previous balance マイナス new balance（delta）であるべきか?**

\`Covered\` の eligibility window（\`shortfall ≤ balance\`）では両者は同一だ。だから両方とも正しい。\`shortfall\` を選ぶ理由は *caller のメンタルモデル* にマッチするから — X を要求して X を受け取った。\`withdraw_amount_matches_balance_delta\` proptest がこの整合性を verify する。**2 つの表現が数学的に等しいとき、caller のフレーミングに合うほうを選ぶ。**

**Q3: Proptest の入力範囲が \`i64::MIN..i64::MAX\` ではなく \`0..1_000_000\` なのはなぜか?**

理由が 2 つ。(1) 興味のあるプロパティは *operating* range で成立する。境界 saturation ケースは別途 unit test 化されている（レッスン8 の \`deposit_saturates_at_max\`）。(2) より広い範囲だと、プロパティの assertion 内に saturation ロジックを encode しなければならず、読みにくくなる。**Proptest の範囲は、プロパティが素直に表現できる regime に合わせる — 境界ケースは unit test に属する。**

**Q4: 「balance > 0 のとき、次の withdraw は決して Depleted を返さない」の proptest がないのはなぜか?**

そのプロパティはコードの構造から *自明に* 帰結するからだ。\`if self.balance == 0\` の guard は balance がゼロのときだけ発火し、balance がゼロになり得るのは covering または partial-draining な withdraw の後だけ。これのプロパティテストは、guard の *結果* ではなく guard の *存在* をテストする。**Proptest は実装の *構造* ではなく *結果* をテストすべきだ。**

**Q5: \`WithdrawOutcome\` を \`WithdrawResult\`、\`Covered\` を \`Ok\` variant、他 2 つを \`Err\` にできないか?**

書けるが、*成功のカテゴリー* と *失敗* を混同する。カスケード数学が言うのは、3 variant すべて「それぞれのレイヤーで成功している」ことだ — Covered は Layer 2 で absorb する、他 2 つは Layer 3 に正しく委譲する。これらを「エラー」と呼ぶと、Liquidation参照実装（保険基金パート） の内部 regime が Liquidation参照実装（スキャナパート） の語彙に漏れる。**命名はアーキテクチャ上の役割を反映すべきだ。エラー vs 成功は 1 ビットの区別で、この 3 ビットの決定木には収まらない。**

**Q6: \`balance_never_negative\` の proptest が \`proptest::collection::vec(..., 0..20)\` を使う。なぜ 20 で、100 ではないのか?**

理由が 2 つ。(1) 20 操作で state-machine の到達可能遷移を複数回 exercise できる — 長い系列はカバレッジを増やさない。(2) Proptest の shrinker は 20 操作の失敗を妥当な時間で最小サブ系列に shrink できる。100 操作の失敗を shrink するには秒単位かかり、結果も読みにくくなる。**Proptest のサイズは「多いほど良い」ではなく shrinkage コストで選ぶ。**

## 次のレッスン (レッスン10) — \`liquidation_fee\` + close-outcome decomposition

レッスン10 は \`compute.rs\` に戻り、\`compute\` と \`insurance\` の橋渡しをする Liquidation参照実装（保険基金パート） の 3 つの pure-compute 関数を加える: \`liquidation_fee(notional, params)\`、\`solvent_close_outcome(snapshot, mark, params)\`、\`underwater_close_outcome(snapshot, mark, params)\`。3 つを合わせると、liquidation event を \`(fund credit, trader への残額)\` あるいは \`(fund debit, 部分的に取れた fee)\` のタプルに分解する — まさに Liquidation参照実装（スキャナパート） の scanner が close ごとに \`InsuranceFund::deposit\` / \`InsuranceFund::withdraw_shortfall\` を呼ぶために必要な shape だ。

レッスン10 の後、\`compute\` モジュールと \`insurance\` モジュールはカスケード数学を介して会話するようになる。Pure 関数が credit/debit の数字を生み、state machine がそれらを蓄積する。レッスン11 はこのループを \`LiquidationScanner\` で包み、safety-net cascade が runnable な scanner を持つ。
`,
                },
                {
                  title: "レッスン 10 — liquidation_fee + close-outcome decomposition — compute と insurance をつなぐ橋",
                  slug: "openhl-liquidation-close-outcome-decomposition-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン 10 — \`liquidation_fee\` + close-outcome decomposition — \`compute\` と \`insurance\` をつなぐ橋

## ゴール

このレッスンで掴む概念:

- **すべての liquidation event は \`(fund movement, account residual)\` のペアに分解できる。** Solvent な close は fund に credit し、正の residual を trader に返す。Underwater な close は fund に debit し、場合によっては partial fee を回収する。本レッスンの 2 つの関数がこの分解を一度コード化すれば、Liquidation参照実装（スキャナパート） の scanner は数学が生成した *正確な* 数字に対して \`InsuranceFund::deposit\` と \`InsuranceFund::withdraw_shortfall\` を呼べる。**Pure compute は credit/debit を生み、state machine がそれを蓄積する。**
- **\`debug_assert!\` を routing contract として使う。** \`solvent_close_outcome\` と \`underwater_close_outcome\` は *非重複* (non-overlapping) だ。それぞれが「*もう一方* の呼び出しではなかった」ことを debug-assert で表明する。このペアは「caller が routing 義務を負う discriminated dispatch」であり、関数は前提条件のウィンドウ内でのみ total になる。**\`debug_assert!\` は、型システムが encode できない契約を文書化する。**
- **\`fee.saturating_sub(post_close_equity)\` が \`post_close_equity\` 負値のとき何をするか。** レッスン中で最もきれいな算術だ: \`i64 − (負の i64) = i64 + |負の i64|\`。「already-underwater」サブケースが「partial fee」サブケースと同じ式を再利用できるのは、負値の減算が magnitude の加算になるからだ。**\`if\` の分岐が signed なオペランドの場合、1 つの式で両方の分岐をカバーできる。**
- **\`Result\` でも 1 つの enum でもなく、2 つの異なる戻り型。** \`SolventClose { fee_to_fund, residual_to_account }\` と \`UnderwaterClose { fee_to_fund, shortfall_to_fund }\` は \`fee_to_fund\` フィールドを共有するが、もう一方のフィールドは完全に異なる意味を持つ。意味の差が重い — residual は trader へ *出ていく*、shortfall は fund から *入ってくる*。\`Option<i64>\` で 1 スロットに押し込むと dispatch がぼやける。**2 つのパスが質的に異なるフィールド意味を生むとき、2 つの struct 型が 1 つの enum に勝つ。**

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 55 テストが pass する（compute 34 + insurance 21）。レッスン10 後、Liquidation参照実装（保険基金パート） の crate 全体が \`260883b\` と byte-for-byte 一致する。

具体的な変更:

- **\`src/types.rs\`。** \`SolventClose\` 構造体と \`UnderwaterClose\` 構造体を doc コメント付きで追加。
- **\`src/compute.rs\`。** \`liquidation_fee\`、\`solvent_close_outcome\`、\`underwater_close_outcome\` を追加。新規 unit test 10 個（fee 4 + solvent 3 + underwater 3）。
- **\`src/lib.rs\`。** compute の re-export に 3 関数、types の re-export に \`SolventClose\` + \`UnderwaterClose\` を追加。

レッスン10 で Liquidation参照実装（保険基金パート） を閉じる。本レッスンの後、\`260883b\` に対する答え合わせ diff は liquidation crate の全ファイルで完全にクリーンになる。

## おさらい

レッスン9 の後:
- \`insurance.rs\` は \`260883b\` と byte-for-byte 一致 — \`InsuranceFund\` state machine + \`WithdrawOutcome\` enum + 12 unit test + 4 proptest が揃う。
- \`lib.rs\` は \`InsuranceFund\` と \`WithdrawOutcome\` を re-export 済み。
- \`cargo test\` は 45 テストを走らせ、すべて green。
- Fund は deposit を受け取り、drain を surface できる。**だが、特定の close に対して「いくら deposit するか / drain するか」を計算するものはまだ存在しない。**

レッスン10 がそのギャップを埋める。新しい compute 関数 3 つが、Liquidation参照実装（スキャナパート） の scanner が state machine に流し込む「数値の出どころ (source of truth)」になる。

## 計画

編集は 4 つ:

1. **\`crates/liquidation/src/types.rs\` に \`SolventClose\` + \`UnderwaterClose\` 構造体を追加。** どちらも 2 フィールドのシンプルな構造体、\`#[derive(Clone, Copy, Debug, PartialEq, Eq)]\` で揃える。
2. **\`crates/liquidation/src/compute.rs\` に 3 つの関数を追加**:
   - \`liquidation_fee(closed_notional, params)\` — i128 中間値を使った pure な fee math。
   - \`solvent_close_outcome(snapshot, mark, params)\` — post-close equity が fee を cover できるアカウント用の \`SolventClose\`。
   - \`underwater_close_outcome(snapshot, mark, params)\` — cover できないアカウント用の \`UnderwaterClose\`。
3. **既存の \`#[cfg(test)] mod tests\` に 10 個の unit test を追加。**
4. **\`crates/liquidation/src/lib.rs\` を拡張** — 新規 3 関数と 2 型を re-export。

> 🛑 **予測。** 続きを読む前に考えてほしい。Trader が 1 BTC を long で保有。Entry $100k、collateral $10k。$80,500 で force-close される（$19,500 の損失）。Hyperliquid デフォルトの \`liquidation_fee_bps\` は 150（1.5%）。問: **このクローズで insurance fund は credit するか debit するか、そして金額はいくらか?**

（答え: **Fund は debit する — $10,707 の shortfall を吸収しなければならない。** 流れを追う。Close 時の notional は $80,500。Fee = $80,500 × 150 / 10,000 = $1,207.50、整数演算で $1,207 に切り捨て。Trader の realized PnL は −$19,500、post-close equity = $10,000 collateral + (−$19,500 PnL) = −$9,500 — *fee を引く前* にすでに underwater。Fee は徴収できない（負の残高に課金はできない）。Fund は「望ましかった fee」と「負の equity」の両方を cover する必要がある: $1,207 + $9,500 = $10,707。これが \`underwater_close_outcome\` の「already underwater」サブケースであり、Perp Primer レッスン3 で扱ったシナリオと同一の数字だ。概念で学んだ計算がコードで再登場する。）

レッスン10 の decomposition picture:

\`\`\`
   ┌────────────────────────────────────────────────────────────┐
   │  Liquidation参照実装（保険基金パート） compute が生成する per-close 分解               │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  SOLVENT パス                                              │
   │  ────────────                                              │
   │  post_close_equity ≥ fee  →  SolventClose {                │
   │                                fee_to_fund:           +X   │  ──→ Fund へ入金
   │                                residual_to_account:   +Y   │  ←── Trader へ返金
   │                              }                             │
   │                                                            │
   │  Liquidation参照実装（スキャナパート） scanner はこう使う:                             │
   │    fund.deposit(fee_to_fund)                ← Layer 2 成長  │
   │    trader_balance += residual_to_account    ← 払い戻し      │
   │                                                            │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  UNDERWATER パス（2 サブケースを 1 つの shape で扱う）     │
   │  ─────────────────                                         │
   │  0 < post_close_equity < fee  →  UnderwaterClose {         │
   │      (partial fee)                 fee_to_fund:       +X   │  ──→ Fund へ入金
   │                                    shortfall_to_fund: +Y   │  ←── Fund から引き出し
   │                                  }                         │
   │                                                            │
   │  post_close_equity ≤ 0       →  UnderwaterClose {          │
   │      (already underwater)          fee_to_fund:        0   │
   │                                    shortfall_to_fund: +Z   │  ←── Fund から引き出し
   │                                  }                         │
   │                                                            │
   │  Liquidation参照実装（スキャナパート） scanner はこう使う:                             │
   │    fund.deposit(fee_to_fund)            ← 0 のこともある    │
   │    fund.withdraw_shortfall(shortfall_to_fund)               │
   │      ↑ WithdrawOutcome を返す (レッスン9)                          │
   │      ↑ Depleted/PartiallyDrained は ADL へエスカレート       │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
\`\`\`

図で押さえる点が 3 つ:

1. **\`SolventClose\` の出力はシステムから *出ていく*。\`UnderwaterClose\` の出力はシステムへ *入ってくる*。** Residual は trader に返る（account への正のフロー）。Shortfall は fund から引かれる（close への正のフロー）。Magnitude の shape は同じ（\`i64 ≥ 0\`）。逆なのは方向だけ。**お金の *方向* は符号ではなくフィールド名に住む。**
2. **\`UnderwaterClose\` は 2 つのサブケースを 1 つの shape にコンパイルする。** \`i64\` フィールド 2 つの単一構造体が「partial fee, partial shortfall」と「zero fee, full shortfall」の両方をカバーする。\`kind\` 判別子は要らない — \`fee_to_fund\` の *値* (zero or positive) が区別を運ぶ。**フィールド値ですでに分かることに、サブケースのタグを付けない。**
3. **この分解こそが Liquidation参照実装（スキャナパート） を可能にする。** Scanner は close が solvent か underwater か、*なぜそうなのか* を知る必要がない。名前付き semantics を持つ 2 つの i64 が返ってくれば十分。**数学と state の間にクリーンな分解があれば、state-machine 層は dumb なままでいられる。**

## 手を動かす walk-through

### Step 1: \`src/types.rs\` に \`SolventClose\` + \`UnderwaterClose\` を追加

\`crates/liquidation/src/types.rs\` を開く。既存の \`CloseOrderSpec\` 定義の後に追記:

\`\`\`rust
/// Solvent-close outcome (Liquidation参照実装（保険基金パート）).
///
/// Produced by [\`crate::compute::solvent_close_outcome\`] for a Liquidatable
/// account whose post-close equity covers the liquidation fee in full.
/// Both fields are non-negative.
///
/// \`fee_to_fund\` is credited to the insurance fund; \`residual_to_account\`
/// is returned to the trader's collateral balance.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SolventClose {
    /// Fee deducted from collateral and credited to the insurance fund.
    pub fee_to_fund: i64,
    /// What's returned to the trader's collateral after the close + fee.
    pub residual_to_account: i64,
}

/// Underwater-close outcome (Liquidation参照実装（保険基金パート）).
///
/// Produced by [\`crate::compute::underwater_close_outcome\`] when the
/// account's post-close equity cannot cover the full liquidation fee.
///
/// Covers two sub-cases under one shape:
///   - Post-close equity is positive but smaller than the desired fee
///     (Liquidatable account whose close + fee turned underwater): the
///     remaining equity is paid as a partial fee, the uncollected portion
///     becomes the shortfall.
///   - Post-close equity is already negative (Underwater account): no fee
///     is collected, the full desired fee plus the negative equity becomes
///     the shortfall.
///
/// Both fields are non-negative; \`fee_to_fund\` may be \`0\` in the
/// negative-equity case.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct UnderwaterClose {
    /// Partial fee collected from any positive post-close equity, credited
    /// to the insurance fund. May be \`0\`.
    pub fee_to_fund: i64,
    /// What the insurance fund must absorb so the close completes. The
    /// caller hands this to [\`crate::insurance::InsuranceFund::withdraw_shortfall\`].
    pub shortfall_to_fund: i64,
}
\`\`\`

型について押さえる点が 4 つ:

1. **両方の struct の両フィールドが \`i64\`、\`u64\` ではない。** レッスン8 の \`InsuranceFund::balance\` と同じ型統一性の理由だ。Crate 全体が \`i64\` で計算する。非負性は型ではなく doc コメントで document する。**Crate 内の型統一性は時間とともに複利で効く。フィールド単位の符号なしは局所的な便利さに過ぎず、境界ごとにキャストを発生させる。**
2. **どちらの struct も同じ derive 集合: \`Clone + Copy + Debug + PartialEq + Eq\`** — \`WithdrawOutcome\` と \`InsuranceFund\` と同じ集合だ。これらは 16 バイトの POD 型。値渡しが reference より安い。**この crate の pure-value 型は一貫した derive リストを使う。予測可能性そのものが美徳だ。**
3. **Doc コメントはフィールドの *行き先* を名指す。*出どころ* ではない。** \`fee_to_fund\` は「ここに行く（insurance fund）」と言い、「ここから来た（trader の collateral）」とは言わない。\`shortfall_to_fund\` は「行き先（fund からクローズへ）」を言い、それを生んだ負 equity の算術は言わない。**フィールド名は caller がそれを *どう使うか* で名付け、producer が *どう計算したか* では名付けない。**
4. **\`UnderwaterClose\` はサブケースに関わらず \`shortfall_to_fund\` を常に運ぶ。** どちらのサブケースが発火しても、構造体の shape は変わらない。Caller は struct shape ではなく *値* に対してパターンマッチする（\`if shortfall_to_fund > 0 { fund.withdraw_shortfall(...) }\`）。**Total field presence > サブケース固有 shape。Caller はゼロに対して 1 度マッチするだけで済む。**

### Step 2: \`src/compute.rs\` に \`liquidation_fee\` を追加

\`crates/liquidation/src/compute.rs\` を開く。\`saturate_i128_to_i64\` ヘルパーの後（ヘルパーセクションの末尾、テストブロックの前）に追記:

\`\`\`rust
/// Liquidation fee on a closed notional, in quote units.
///
/// \`fee = notional × fee_bps / MARGIN_SCALE\`, saturating on overflow.
/// Pure math — the caller (Liquidation参照実装（スキャナパート） scanner / bridge) supplies the
/// actual fill notional from the matching engine.
///
/// Returns \`0\` for a zero notional (flat positions; should never reach
/// the engine but symbol-completeness pays off in proptest).
#[must_use]
pub fn liquidation_fee(closed_notional: u64, params: &LiquidationParams) -> i64 {
    if closed_notional == 0 {
        return 0;
    }
    let bps = i128::from(params.liquidation_fee_bps);
    let n = i128::from(closed_notional);
    let scaled = n.saturating_mul(bps);
    let fee = scaled / i128::from(MARGIN_SCALE);
    saturate_i128_to_i64(fee)
}
\`\`\`

押さえる点が 5 つ:

1. **\`closed_notional: u64\`（入力）、\`-> i64\`（出力）。** Notional は常に非負 — magnitude だ（price × |size|）。出力が signed なのは crate 内の他の算術が signed だからだ。Fee は trader の equity から \`i64\` 減算で引かれ、call site で \`u64 → i64\` キャストを強制すると scanner が散らかる。**入力境界での unsigned はドメインの事実を捉え、出力での signed は周囲の算術に揃える。**
2. **\`closed_notional == 0\` の fast-path return。** Flat ポジション（close path にはほぼ来ない）に対する 3 回の \`i128\` 変換と saturating multiply をスキップする。Scanner が defensive にこれを呼ぶこともある。**支配的なゼロケースを扱う安価な述語は、その存在を正当化する。**
3. **\`as i128\` ではなく \`i128::from(...)\`。** \`From\` は構造的に無敗 — \`u64 → i128\` も \`u32 → i128\` も widening 変換で、データを失わない。\`From\` を使うと意図が明示され、後で narrowing 位置に \`as\` がこっそり入り込むのを防げる。**コンセンサス算術と話すコードでは、widening のデフォルトは \`From\`。\`as\` は narrowing でビット幅を制御できるところに限定する。**
4. **i128 積に \`saturating_mul\`。** \`u64::MAX × u32::MAX\` の病理ケース（\`fee_saturates_on_pathological_input\` テストが発火）でも \`i128\` がオーバーフローする可能性がある。Saturating-mul は \`i128::MAX\` で頭打ち、その後 helper が \`i64::MAX\` に再 saturate する。**直列の二段 saturation は問題ない — それぞれが次を防御する。**
5. **\`saturating_div\` は使わない。** i128 上の整数除算はオーバーフローしない（\`i128::MIN / -1\` を除く。だがここでは分子・分母とも非負なので unreachable）。素の \`/\` で正しい。代替は単なる儀式だ。**Saturating 演算は overflow *しうる* 算術のためのもの。両オペランドが非負な除算では不要。**

### Step 3: \`src/compute.rs\` に \`solvent_close_outcome\` を追加

\`liquidation_fee\` の下に追記:

\`\`\`rust
/// Solvent-close outcome — the trader's collateral plus realized \`PnL\`
/// covers the liquidation fee in full, with positive residual returning
/// to the account.
///
/// **Precondition** (debug-asserted): the account is Liquidatable AND the
/// post-close equity (= collateral + realized \`PnL\` at \`close_price\`)
/// covers the desired fee. If the precondition is violated, the result
/// has \`residual_to_account ≤ 0\` — caller should have routed to
/// [\`underwater_close_outcome\`] instead.
///
/// Liquidation参照実装（保険基金パート） never mutates state — this is pure compute that produces
/// the credit/debit pair for the caller (Liquidation参照実装（スキャナパート） scanner) to apply
/// against [\`crate::insurance::InsuranceFund\`] and the trader's balance.
#[must_use]
pub fn solvent_close_outcome(
    snapshot: &AccountSnapshot,
    close_price: MarkPrice,
    params: &LiquidationParams,
) -> SolventClose {
    let notional = notional_value(snapshot, close_price);
    let fee = liquidation_fee(notional, params);
    let post_close_equity = account_equity(snapshot, close_price);
    debug_assert!(
        post_close_equity >= fee,
        "solvent_close_outcome called with post_close_equity={post_close_equity} < fee={fee}; \\
         caller should route to underwater_close_outcome instead",
    );
    SolventClose {
        fee_to_fund: fee,
        residual_to_account: post_close_equity.saturating_sub(fee),
    }
}
\`\`\`

押さえる点が 6 つ:

1. **関数は Liquidation参照実装（計算パート） の関数 *3 つを compose* する。** \`notional_value\`、\`liquidation_fee\`（Step 2 で追加）、\`account_equity\` がすべて inline で呼ばれる。新しい数学はない。3 つの既存プリミティブからパッケージ化された outcome を生む *routing 関数* だ。**High-level な outcome 関数は low-level な数学を compose すべきだ。複製してはいけない。**
2. **\`debug_assert!\` が契約そのもの。** 前提条件（\`post_close_equity >= fee\`）は caller がすでに行った *routing 判断*「これは solvent な close だ」と等価だ。Underwater な close で \`solvent_close_outcome\` を呼ぶのは *caller の bug* であり、ランタイム分岐ではない。\`debug_assert!\` は debug ビルドで発火し、release ではコンパイルアウトされる。**ランタイム挙動は変わらない。開発時に caller の bug を捕まえ、本番では消える。**
3. **\`debug_assert!\` のエラーメッセージは *名前付き値* を含む。** このアサートを発火させた開発者は、行番号ではなく \`post_close_equity=-500 < fee=1207\` を見る。Format-string capture（\`{post_close_equity}\`）を使えば、成功パスでの文字列アロケーションコストはゼロ。**Assertion メッセージでの format-string capture は、assertion が pass する限りゼロコスト。失敗したときに大きく払い戻す。**
4. **\`debug_assert!\` が \`equity ≥ fee\` を保証するのに \`post_close_equity.saturating_sub(fee)\`。** なぜか。Release ビルドでは \`debug_assert!\` は発火しない。Caller の bug がリリースで assertion をスキップしても、素の \`-\` はサブトラクションを完了させる。だが他所の bug — たとえば上流のオーバーフローで \`equity\` が \`i64::MIN\` になる — が \`equity - fee\` を underflow させうる。Saturation はどんなケースでも clamp された i64 を返す。**Saturating 算術は \`debug_assert!\` のベルト＆サスペンダー的補完だ。両者で dev と prod 両方をカバーする。**
5. **\`params: &LiquidationParams\` を reference で取る、値ではなく。** \`LiquidationParams\` は \`Copy + 12 バイト\`。値渡しは微妙に安いが、crate 内の他のすべての compute 関数が reference で取るので一貫性を取る。**Sibling 関数の呼び出し慣例に揃える。**
6. **タプル返しではない。** \`(i64, i64)\` を返して caller に「どっちがどっちか」を委ねる手もある。\`SolventClose\` を名前付きフィールドで返すと、call site での dispatch が self-documenting になり、フィールド順を交換する future の mistake を防げる。**名前付きフィールドの struct は、call site が「2 つ目は何だっけ?」と思い出す必要があるたびにタプルに勝つ。**

### Step 4: \`src/compute.rs\` に \`underwater_close_outcome\` を追加

\`solvent_close_outcome\` の下に追記:

\`\`\`rust
/// Underwater-close outcome — the account's post-close equity cannot
/// cover the liquidation fee, so the insurance fund must absorb the
/// shortfall.
///
/// Handles both sub-cases under one shape:
///   - Positive but insufficient post-close equity (Liquidatable account
///     whose close + fee turned underwater): the equity is paid as a
///     partial fee, the rest becomes the shortfall.
///   - Negative post-close equity (Underwater account before fee): no
///     fee is collected, the entire fee plus \`|equity|\` becomes the
///     shortfall.
///
/// **Precondition** (debug-asserted): \`post_close_equity < fee_desired\` —
/// otherwise the close is solvent and the caller should have routed to
/// [\`solvent_close_outcome\`].
#[must_use]
pub fn underwater_close_outcome(
    snapshot: &AccountSnapshot,
    close_price: MarkPrice,
    params: &LiquidationParams,
) -> UnderwaterClose {
    let notional = notional_value(snapshot, close_price);
    let fee = liquidation_fee(notional, params);
    let post_close_equity = account_equity(snapshot, close_price);
    debug_assert!(
        post_close_equity < fee,
        "underwater_close_outcome called with post_close_equity={post_close_equity} ≥ fee={fee}; \\
         caller should route to solvent_close_outcome instead",
    );

    if post_close_equity > 0 {
        // Partial fee: equity covers some but not all of the desired fee.
        UnderwaterClose {
            fee_to_fund: post_close_equity,
            shortfall_to_fund: fee.saturating_sub(post_close_equity),
        }
    } else {
        // Already underwater (equity ≤ 0). No fee collected; fund covers
        // the full fee plus the negative equity. \`fee - negative_equity\`
        // is \`fee + |equity|\` via saturating_sub semantics.
        UnderwaterClose {
            fee_to_fund: 0,
            shortfall_to_fund: fee.saturating_sub(post_close_equity),
        }
    }
}
\`\`\`

押さえる点が 7 つ:

1. **2 つのサブケース分岐が同じ \`shortfall_to_fund\` 式を共有する: \`fee.saturating_sub(post_close_equity)\`。** Partial-fee ケースでは \`equity\` が正で、サブトラクションが未徴収部分を生む。Already-underwater ケースでは \`equity\` が負またはゼロで、サブトラクションは \`fee - negative = fee + |equity|\` になる。具体的には、\`fee = 1207\`、\`post_close_equity = -9500\` のとき:

   \`\`\`
   1207 - (-9500) = 1207 + 9500 = 10707
   \`\`\`

   — \`.abs()\` も明示的な \`+\` も「符号で分岐」も書かずに、コードがこの答えに到達する。**1 つの式が両方の分岐をカバーするのは、整数の「負値の減算」が「magnitude の加算」と等価だからだ。** レッスン中で最もきれいな算術だ。ジュニアな読者はこれを 2 度見て *bug だと思う*。シニアな読者はこれを見て関数が動く理由を理解する。（Step 4 のコードコメント内の \`negative_equity\` は、負値を取ったときの \`post_close_equity\` を指す *概念名* であって、別の変数ではない。）
2. **\`if post_close_equity > 0\` の分岐は *厳密な大なり*。** Post-close equity がちょうどゼロのケースは \`else\`（already-underwater）に落ち、\`fee_to_fund = 0\` になる。セマンティクスに合っている: collateral が消尽していれば、徴収するものが *ない*。**境界述語での strict greater-than は、ゼロを「仕事なし」の分岐に route する。**
3. **\`fee_to_fund\` は分岐で異なる。\`shortfall_to_fund\` は変わらない。** 非対称性は意図的だ。*fee の徴収* は equity が正かどうかに依存するが、*shortfall* は常に \`fee - equity\`（負の equity は shortfall を増やす方向に効く）。**2 つの分岐が作業の一部を共有するとき、共有式を factor out するのは、節約が可読性のコストを上回るときだけにする。** ここで早めに \`let shortfall = fee.saturating_sub(post_close_equity);\` を入れると、12 文字の節約と引き換えに inline な視覚的対称性を失う。重複のままにする。
4. **\`else\` 分岐は equity = 0 と equity < 0 を別々に \`match\` しない。** どちらのケースも同じ出力（\`fee_to_fund = 0, shortfall = fee - equity\`）を生むので、分岐を共有する。**出力が 1 つの式に collapse するコードパスは 1 つの分岐を共有する。**
5. **doc コメントは *user-facing なサマリー* として** どちらのサブケースがいつ発火するかを語る。Walk-through を終えた読者は、後で別の場所でこの関数を使うときに doc コメントに戻ってくる。Doc は本体なしで自立しなければならない。**Doc コメントは、あなたの関数本体が開いていない *consumer* に読まれる。**
6. **\`debug_assert!\` の述語が \`solvent_close_outcome\` から反転する。** 意図的だ: 2 つの assertion は入力空間の *非重複カバー* を成す。\`solvent ⇔ equity ≥ fee\` と \`underwater ⇔ equity < fee\` が入力空間を網羅的に partition する。ペアは discriminated dispatch であり、assertion がそれを証明する。**反対前提条件を持つ 2 つの pure 関数のペアは、慣例による discriminated dispatch だ — 型システムが助けてくれないが、assert のペアがその役を果たす。**
7. **\`post_close_equity == 0\` への early return はない。** 「ちょうどゼロ」が common な境界だから fast path を加えるべきと思う読者もいるかもしれない。加えない。\`else\` 分岐がすでに正しい答えを生み、分岐評価コストは比較 1 回。**境界 fast-path を加えるのは、境界で数学が *実際に* 違うときだけ。**

> 🛑 **やりがちな勘違い。** 「\`solvent_close_outcome\` と \`underwater_close_outcome\` を 1 つの関数にまとめて \`Result<SolventClose, UnderwaterClose>\` を返せばいいのでは?」 問題が 3 つ。(1) どちらの outcome もエラーではない。両方とも *成功* した close で、別々の state-machine 操作に route される。(2) Liquidation参照実装（スキャナパート） の scanner はマージン健康度チェックを *すでに* 行って *適切なほう* を呼ぶ。Dispatch を \`Result\` 経由でやると、scanner がすでにやった仕事を繰り返す。(3) \`debug_assert!\` のペアは 2 つの別関数のほうが意味を持つ。各関数が自分の契約を表明する。Tagged union を返す 1 関数では「partition のこちら側はここでだけ正しい」が表現できない。**反対前提条件の 2 つの関数は、tagged union を返す 1 つの関数より discriminated dispatch を上手く表現する。**

### Step 5: 10 個の unit test を compute.rs に追加

既存の \`#[cfg(test)] mod tests\` ブロック内、レッスン7 の close-order-spec テストの後に 3 つのテストセクションを追加:

\`\`\`rust
    // ─── Liquidation参照実装（保険基金パート）: liquidation_fee ────────────────────────────────

    #[test]
    fn fee_basic() {
        // 1.5% of $80,400 = $1,206 — matches the Perp Primer レッスン3 example.
        let params = LiquidationParams::hyperliquid_default();
        assert_eq!(liquidation_fee(80_400, &params), 1_206);
    }

    #[test]
    fn fee_zero_notional() {
        let params = LiquidationParams::hyperliquid_default();
        assert_eq!(liquidation_fee(0, &params), 0);
    }

    #[test]
    fn fee_zero_bps() {
        // No fee if the network params zero it out.
        let params = LiquidationParams {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: 0,
        };
        assert_eq!(liquidation_fee(1_000_000, &params), 0);
    }

    #[test]
    fn fee_saturates_on_pathological_input() {
        // notional × bps would overflow i64 but saturates inside i128.
        let params = LiquidationParams {
            initial_margin_bps: 1_000,
            maintenance_margin_bps: 200,
            liquidation_fee_bps: u32::MAX,
        };
        let fee = liquidation_fee(u64::MAX, &params);
        assert_eq!(fee, i64::MAX);
    }

    // ─── Liquidation参照実装（保険基金パート）: solvent_close_outcome ──────────────────────────

    #[test]
    fn solvent_close_typical_liquidatable() {
        // 1 BTC long, entry $100k, $10k collateral, close at $95k.
        //   notional = 95_000; fee = 95_000 × 150 / 10_000 = 1_425
        //   realized_pnl = (95_000 − 100_000) × 1 = −5_000
        //   post_close_equity = 10_000 − 5_000 = 5_000
        //   residual = 5_000 − 1_425 = 3_575
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(95_000), &params);
        assert_eq!(outcome.fee_to_fund, 1_425);
        assert_eq!(outcome.residual_to_account, 3_575);
    }

    #[test]
    fn solvent_close_short_profit() {
        // Short −1, entry $100k, $10k collateral, close at $90k (favorable!).
        //   notional = 1 × 90_000 = 90_000; fee = 1_350
        //   realized_pnl = (90_000 − 100_000) × (−1) = +10_000
        //   post_close_equity = 10_000 + 10_000 = 20_000
        //   residual = 20_000 − 1_350 = 18_650
        let s = snapshot(-1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(90_000), &params);
        assert_eq!(outcome.fee_to_fund, 1_350);
        assert_eq!(outcome.residual_to_account, 18_650);
    }

    #[test]
    fn solvent_close_fee_consumes_all_residual() {
        // Edge: post_close_equity exactly equals fee. residual = 0.
        // Construct: size=1, entry=10_000, collateral=10, mark=10_000.
        //   notional = 10_000; fee = 150
        //   pnl = 0; post_close_equity = 10 (collateral only)
        // For fee == equity exactly: need fee = collateral when pnl = 0.
        //   fee = notional × 150 / 10_000 = notional × 0.015
        //   notional = collateral / 0.015
        // Pick collateral=150, then notional must be 10_000.
        let s = snapshot(1, 10_000, 150);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(10_000), &params);
        assert_eq!(outcome.fee_to_fund, 150);
        assert_eq!(outcome.residual_to_account, 0);
    }

    // ─── Liquidation参照実装（保険基金パート）: underwater_close_outcome ────────────────────────

    #[test]
    fn underwater_close_already_underwater_pre_fee() {
        // Perp Primer レッスン3 scenario: 1 BTC long, entry $100k, $10k collateral,
        // close at $80,500. Realized PnL = −$19,500, post_close_equity = −$9,500.
        // Notional = $80,500; fee = 1_207 (80_500 × 150 / 10_000)
        // shortfall = fee − post_close_equity = 1_207 − (−9_500) = $10,707
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = underwater_close_outcome(&s, MarkPrice(80_500), &params);
        assert_eq!(outcome.fee_to_fund, 0);
        assert_eq!(outcome.shortfall_to_fund, 1_207 + 9_500);
    }

    #[test]
    fn underwater_close_partial_fee_collection() {
        // Liquidatable account whose close + fee just barely turns underwater.
        // 1 BTC long, entry $100k, $10k collateral, close at $90,500.
        //   notional = $90,500; fee = 1_357 (90_500 × 150 / 10_000)
        //   realized_pnl = −$9,500; post_close_equity = $500
        //   post_close_equity (500) < fee (1357) → underwater branch
        //   fee_to_fund = 500 (partial fee from positive equity)
        //   shortfall = 1_357 − 500 = 857
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = underwater_close_outcome(&s, MarkPrice(90_500), &params);
        assert_eq!(outcome.fee_to_fund, 500);
        assert_eq!(outcome.shortfall_to_fund, 1_357 - 500);
    }

    #[test]
    fn underwater_close_zero_equity_at_fee() {
        // Edge: post_close_equity exactly 0 (collateral fully eaten by losses).
        // 1 BTC long, entry $100k, $10k collateral, close at $90k → pnl = −10k,
        // equity = 0. fee = 1_350. shortfall = full fee.
        let s = snapshot(1, 100_000, 10_000);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = underwater_close_outcome(&s, MarkPrice(90_000), &params);
        assert_eq!(outcome.fee_to_fund, 0);
        assert_eq!(outcome.shortfall_to_fund, 1_350);
    }
\`\`\`

テスト設計で押さえる点が 7 つ:

1. **セクション区切りが関数名と一致する** — \`liquidation_fee\`、\`solvent_close_outcome\`、\`underwater_close_outcome\`。レッスン9 と同じ grep-friendly なグルーピングだ。**テストは exercise する関数でグループ化する。ファイル構造に API を documented させる。**
2. **\`fee_basic\` は Perp Primer レッスン3 の数字を使う。** $80,400 × 1.5% = $1,206 は Perp Primer レッスン3 で概念的に walk-through した計算と同じだ。同じ数字を具体的なコードで見ること自体が **curriculum-to-implementation の reinforcement** になる。Primer 経由で来た読者は、抽象が実際の算術に着地する瞬間を感じる。
3. **\`fee_zero_bps\` は \`LiquidationParams\` を inline で構築する** — \`hyperliquid_default()\` を使わずに。なぜか。デフォルトは \`liquidation_fee_bps = 150\` で、このテストは \`bps = 0\` が必要。**テストするパラメータがデフォルトから divergence するとき、デフォルトを mutate するのではなく inline で構築する。** テストの意図がトップで可視化される。
4. **\`fee_saturates_on_pathological_input\` は \`u64::MAX\` と \`u32::MAX\` の両方を使う。** これが i128 saturation path を exercise する *唯一の* テストだ。算術: \`u64::MAX × u32::MAX ≈ 2^96\`。i128 には収まるが、\`i64\` には壊滅的に overflow する。Saturating-mul は \`i128::MAX\` で頭打ちにし、最後の saturate-to-i64 で \`i64::MAX\` を生む。**Pathological input テストは、このコードパスが *唯一* 実行される場所。これがないと saturation は dead-code 同然になる。**
5. **\`solvent_close_short_profit\` は long-loss の補完として存在する。** Long → loss → solvent close が想定シナリオ。Short → profit → solvent close（「favorable」liquidation）は trader が投入分より *多く* 戻ってくるケース。両方とも同じ shape の \`SolventClose\` を生むが、residual の数字は大きく異なる（3,575 vs 18,650）。**符号付き入力関数のテストは両方の符号をカバーしなければならない。**
6. **\`solvent_close_fee_consumes_all_residual\` には *構築を説明するコメント* がある。** \`post_close_equity == fee\` となる入力を求めるには、\`fee = notional × 150 / 10_000\` を解く必要がある。テスト内のコメントが読者を構築過程に通す。**値が magic に見えるテストには、なぜその値なのかを説明するコメントを書く。**
7. **\`underwater_close_already_underwater_pre_fee\` は Perp Primer レッスン3 の数字を再利用する。** 同じ $100k entry、$10k collateral、$80,500 でクローズ、同じ $19,500 の PnL — Primer の概念シナリオがいまや \`UnderwaterClose { fee_to_fund: 0, shortfall_to_fund: 10_707 }\` を生成し、答え合わせコードに対して検証される。**Curriculum reinforcement はコース全体で複利化する。Primer の数字を レッスン10 で再利用することでループが閉じる。**

### Step 6: \`src/lib.rs\` を更新

既存の re-export を拡張。\`pub use compute::{ ... };\` ブロックを見つけて拡張する。レッスン7 後はこうだった:

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
\`\`\`

更新後:

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, margin_ratio,
    notional_value, solvent_close_outcome, underwater_close_outcome, unrealized_pnl,
};
\`\`\`

次に \`pub use types::{ ... };\` ブロックを拡張。元:

\`\`\`rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

更新後:

\`\`\`rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, SolventClose,
    UnderwaterClose, MARGIN_SCALE,
};
\`\`\`

新規関数名 3 つ（\`liquidation_fee\`、\`solvent_close_outcome\`、\`underwater_close_outcome\`）と新規型名 2 つ（\`SolventClose\`、\`UnderwaterClose\`）、すべて alphabetical に挿入。レッスン10 後、crate の public surface は compute 関数 9 個 + types 8 個になる。

### Step 7: テストを走らせる

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

期待される出力（短縮版）:

\`\`\`
running 55 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
... (Liquidation参照実装（計算パート） の 8 テスト)
test compute::tests::fee_basic ... ok
test compute::tests::fee_saturates_on_pathological_input ... ok
test compute::tests::fee_zero_bps ... ok
test compute::tests::fee_zero_notional ... ok
... (さらに compute テスト)
test compute::tests::solvent_close_fee_consumes_all_residual ... ok
test compute::tests::solvent_close_short_profit ... ok
test compute::tests::solvent_close_typical_liquidatable ... ok
test compute::tests::underwater_close_already_underwater_pre_fee ... ok
test compute::tests::underwater_close_partial_fee_collection ... ok
test compute::tests::underwater_close_zero_equity_at_fee ... ok
... (レッスン8 + レッスン9 の insurance テスト)

test result: ok. 55 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**55 テスト pass。Liquidation参照実装（保険基金パート） 完成。** Crate 全体 — \`compute.rs\`、\`insurance.rs\`、\`types.rs\`、\`lib.rs\` — が \`260883b\` と byte-for-byte 一致。Pure math、stateful な fund、decomposition outcomes が並んで揃った。

エラー時にありがちなパターン:

- **\`underwater_close_already_underwater_pre_fee\` が \`shortfall_to_fund: 1_207 - 9_500\`（つまり負）で失敗。** 素の \`i64 - i64\` で \`fee - post_close_equity\` を書いた。算術的には動くが、サブトラクションの符号を取り違えている。正しくは \`fee.saturating_sub(post_close_equity)\` = \`1_207 - (-9_500)\` = \`+10_707\`。\`fee.saturating_sub(post_close_equity)\` の doc コメントを読み直す。トリックは「負値の減算は magnitude の加算になる」だ。
- **\`underwater_close_partial_fee_collection\` が \`fee_to_fund: 0, shortfall_to_fund: 1_357\` で失敗。** \`if\` 分岐を \`>\` ではなく \`>=\` と書いた。\`>=\` だと equity = 0 が partial-fee 分岐に route される（数学的には正しい: \`fee_to_fund = 0, shortfall = fee - 0 = fee\`）が、意図が違う。Doc は「positive but insufficient」と言う。厳密に positive だ。
- **\`solvent_close_typical_liquidatable\` が \`debug_assert!\` メッセージで panic。** レッスン4/レッスン5 の \`account_equity\` か \`notional_value\` が誤った符号を返している。期待される \`post_close_equity\` は +$5,000。それ以外が返るなら、Liquidation参照実装（計算パート） の算術を walk-through して上流の関数をまず修正する。
- **\`fee_saturates_on_pathological_input\` が overflow panic で失敗。** \`n.saturating_mul(bps)\` ではなく素の \`n * bps\` を書いた。i128 上のオーバーフロー乗算も debug でまだ panic する。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **\`(fund movement, account outcome)\` の分解こそが cascade を composable にする。** Liquidation参照実装（スキャナパート） の scanner は本質的にループだ。各 Liquidatable アカウントについて solvent/underwater を判定し、適切な outcome 関数を呼び、credit/debit を fund と trader にルーティングする。このループが trivial になるのは、レッスン10 が数学を「名前付きフィールドの出力を持つ 2 関数」にパッケージ化したからだ。**数学と state の間にクリーンな分解があれば、state-machine 層は dumb なままでいられる。**

2. **\`debug_assert!\` は契約、\`saturating_sub\` はシートベルト。** Assertion は前提条件を文書化し、開発時に caller の bug を捕まえる。Saturation は本番（assertion がコンパイルアウトされる場所）で同じ bug を捕まえて sane な値に clamp する。**どちらも単独では十分でない** — そしてそれがペアリングの本質だ。\`debug_assert!\` 単独では、release で上流バグ（オラクル異常値、壊れた snapshot など）が来たときに underflow して silently wrap する。\`saturating_sub\` 単独では、caller の *routing バグ*（本来 underwater なのに solvent パスに迷い込んだ呼び出し）を黙って吸収し、症状を隠したまま原因が debug されないまま残る。二段構え、二つの failure mode: **開発時には bug が住むその場所で爆発させて修正させる (assert)、本番では bug が mainnet にすり抜けたとしても chain を fork させない (saturate)。** **Pure compute での defensive coding は dev-time assertion + prod-time saturation のペアを使う。**

3. **反対前提条件を持つ 2 関数 > tagged union を返す 1 関数。** \`solvent_close_outcome\` と \`underwater_close_outcome\` は *慣例による* discriminated dispatch だ。Caller が margin-health チェックで route を決め、関数の debug-assert がその routing 判断を enforce する。代替案 — \`enum CloseOutcome { Solvent(SolventClose), Underwater(UnderwaterClose) }\` を返す 1 関数 — は routing 仕事を関数内で *繰り返す*。**Caller がすでに routing 判断をしているとき、正しいインターフェースは 2 関数で、tagged-union を返す 1 関数ではない。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

レッスン10 の後:
- **compute.rs** は Liquidation参照実装（保険基金パート） の \`compute.rs\` と **byte-for-byte 一致**。
- **types.rs** は Liquidation参照実装（保険基金パート） の \`types.rs\` と **byte-for-byte 一致**。
- **lib.rs** は Liquidation参照実装（保険基金パート） の \`lib.rs\` と **byte-for-byte 一致**。
- **insurance.rs** は レッスン9 以来 byte-for-byte 一致している。

**Liquidation参照実装（保険基金パート） 完成。** \`openhl-liquidation\` crate 全体（コミット \`260883b\`）が workspace に揃った。rethlab Liquidation コースの セクション3（insurance fund）はここで完結する。

## よくある質問

**Q1: \`liquidation_fee\` がなぜ「四捨五入」ではなく「切り捨て（整数除算）」なのか?**

コンセンサス決定性が全 validator に同じ数を計算させるから、そして Rust の整数 \`/\` 演算子が **ゼロ方向への切り捨て (truncation toward zero)** だからだ — あらゆる言語 ABI で曖昧さのないデフォルト。Rounding semantics は言語間（banker's rounding vs half-away-from-zero）でもプロセッサーファミリ間でも違う。Truncation は *唯一* portably に同じ挙動の演算だ。同じ規律が、*crate 全体で* \`f64\` 算術を拒否する理由でもある: IEEE 754 の rounding mode は FPU 別、コンパイラフラグ別、演算順序別で結果が変わりうる — どれもチェーン fork のリスクだ。Integer + saturation + truncation だけが、全 validator に byte-identical な state 遷移を与える唯一の道だ。**コンセンサス算術では、決定性の物語が最もシンプルな演算を選ぶ — bps 数分の手数料精度を犠牲にしてでも。**

**Q2: \`solvent_close_outcome\` と \`underwater_close_outcome\` を \`AccountSnapshot\` のメソッドにすべきか?**

しない。レッスン7 Q3 の \`close_order_spec\` と同じ答えだ。両関数は \`compute.rs\` に住む。他の margin math 関数と隣り合うのがアーキテクチャ上の家だからだ。\`AccountSnapshot\` はデータ運搬役で \`types.rs\` に住む。Compute は \`compute.rs\` に住む。**Receiver ではなく概念で co-locate する。**

**Q3: \`underwater_close_outcome\` の「ほぼ underwater でない」境界（equity がちょうど fee と等しい）で \`shortfall_to_fund\` がゼロにならないのはなぜか?**

\`debug_assert!\` の前提条件が \`equity < fee\`（strict）だからだ。Caller が \`equity == fee\` で \`underwater_close_outcome\` を呼ぶと、assertion は debug で発火する。Release では走り続けて \`fee_to_fund = post_close_equity = fee, shortfall_to_fund = 0\` を生む — *実際には正しい*（close はちょうど solvent）。だが、caller の routing ミスを fix するのは関数の仕事ではない。**\`debug_assert!\` で契約を enforce し、saturation で enforce されなかったケースでも sane な答えが返るようにする。**

**Q4: \`fee_saturates_on_pathological_input\` テストは \`liquidation_fee_bps = u32::MAX\` を設定する。これは \`4,294,967,295\` — 4200 *万* パーセント以上だ。このテストは現実的か?**

現実的ではない。それがポイントだ。このテストは saturation path が *正しく発火する* ことを唯一の入力 regime で verify するために存在する。現実的なテストなら 50 から 500 bps の fee を扱う。このテストは *コンセンサス決定性ガード* — 悪意的に作られた \`LiquidationParams\` でも決定的・非 panic な出力を生むことを証明する。**Saturation テストは operating range ではなく境界に住む。**

**Q5: \`solvent_close_outcome\` を \`Option<SolventClose>\` を返す形にし、\`None\` が「実はこれは underwater で、もう一方の関数で retry してくれ」を意味する設計にできないか?**

できる。だが 2 つの問いを混同する: 「関数は complete したか?」と「caller は正しく route したか?」。現設計はこれらを分離する。関数は常に complete し（assertion が発火するケースでも値を返す）、開発時には assertion が routing エラーを捕まえる。**Completion semantics と routing semantics を混ぜるのは設計の臭い。別々のメカニズムに分ける。**

**Q6: \`SolventClose\` と \`UnderwaterClose\` でセマンティクスが異なるのに、なぜ \`UnderwaterClose\` の \`fee_to_fund\` が \`SolventClose\` と同じ名前なのか?**

セマンティクスは *同じ* だ。両フィールドが「この close の fee のうちこれだけが insurance fund に流れた」を意味する。\`SolventClose\` では full fee（正の collateral residual から徴収）。\`UnderwaterClose\` では partial fee（正だが不十分な equity から徴収）またはゼロ（負の equity から徴収）。*金額* は違うが、*行き先* は同じ。**フィールド名は行き先で名付ける。それを生んだ算術で名付けない。**

## 次のレッスン (レッスン11) — \`LiquidationScanner\` 導入 (Liquidation参照実装（スキャナパート）)

レッスン11 で Liquidation参照実装（スキャナパート） — multi-account scanner — が始まる。Scanner は レッスン4-レッスン10 が生んだものすべての state-machine consumer だ。\`&[AccountSnapshot]\` のスライスを取り、それぞれを レッスン6 の \`margin_health\` で分類（Liquidatable、Underwater、Safe、At-Risk）し、Liquidatable アカウントごとに \`solvent_close_outcome\` か \`underwater_close_outcome\` を呼び、credit/debit を所有する \`InsuranceFund\` にスレッディングし、\`ScanReport\` を返す — どのアカウントが close されたか、どの ADL trigger amount が surface したか、scan 後に fund がどこに立っているか、をまとめたバッチサマリだ。

レッスン11 の後、cascade は最初の *runnable* なレイヤーを得る: 数学 + state ではなく、数学 + state + orchestration loop。SHA pin は \`260883b\` から \`0a8464e\`（Liquidation参照実装（スキャナパート））に進む。
`,
                },
              ],
            },
          },
          {
            title: "Scanner & capstone",
            sortOrder: 4,
            lessons: {
              create: [
                {
                  title: "レッスン 11 — Scanner 型の語彙 — CloseOutcomeKind、LiquidationRecord、ScanReport、LiquidationScanner",
                  slug: "openhl-liquidation-scanner-types-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン 11 — Scanner 型の語彙 — \`CloseOutcomeKind\`、\`LiquidationRecord\`、\`ScanReport\`、\`LiquidationScanner\`

## ゴール

このレッスンで掴む概念:

- **Orchestration 層には compute や insurance とは別の型語彙が必要だ。** Liquidation参照実装（計算パート） は \`MarginHealth\`（per-account 分類）を生んだ。Liquidation参照実装（保険基金パート） は \`SolventClose\` / \`UnderwaterClose\`（per-close 分解）と \`WithdrawOutcome\`（per-fund-call outcome）を生んだ。Liquidation参照実装（スキャナパート） は *batch-level* の型を導入する。\`CloseOutcomeKind\`（このアカウントの close はどの kind だったか）、\`LiquidationRecord\`（liquidate されたアカウント 1 件あたりの row）、\`ScanReport\`（1 回の scan で起きたすべて）。**アーキテクチャの各層は異なる問いに答える。だから各層が独自の型語彙を持つ。**
- **\`CloseOutcomeKind\` は \`SolventClose\` と \`UnderwaterClose\` の discriminated union — レッスン9 の \`WithdrawOutcome\` と同じ shape、別の語彙。** Variant が 2 つ。それぞれが対応する Liquidation参照実装（保険基金パート） 関数の生んだ struct を運ぶ。Scanner はこの enum を pattern-match して post-close の仕事（fund deposit、fund withdraw、escalation 集計）を dispatch する。**上位層が下位層の 2 つの出力を route するとき、各出力を運ぶ variant が最もきれいな機械的橋渡しになる。**
- **\`ScanReport\` は per-account record の vector AND aggregate な fund-flow 合計の両方を含む。** Records vector は *audit trail*（liquidation 1 件あたり 1 行、iteration 順）。3 つの aggregate \`i64\`（\`fund_deposits\`、\`fund_withdrawals\`、\`unfilled_deficit\`）は *telemetry summary* — bridge が records を iterate せずに読める合計値だ。Scan loop 内で事前計算するのはコスト 0、bridge は両方ともほしい。**Record vector の隣にある aggregate フィールドは、caller が fold をする手間を省く。冗長ではなく、便利だ。**
- **\`LiquidationScanner\` は \`InsuranceFund\` を直接所有する。\`Arc<Mutex<...>>\` 経由ではない。** Scanner は per-bridge コンポーネントだ。共有リソースではない。Bridge が scanner を持ち、scanner が fund を持ち、fund が balance を持つ。Mutation は ownership tree をロック競合なしに下に流れる。**ブロックごとにちょうど 1 回 mutate される state machine は、同期プリミティブを必要としない。**

確認:

\`\`\`bash
cargo check -p openhl-liquidation
\`\`\`

…がクリーンに compile する。レッスン11 では新規 test を追加しない。型語彙にはまだ testable な behavior がないからだ。レッスン12 で \`scan\` メソッドと最初の 4 個の simple test、レッスン13 で nuanced ケース + 4 proptest を追加する。レッスン13 後で test 数は 68 になる。

具体的な変更:

- **\`src/scanner.rs\`。** 新規モジュールファイル。Module-level doc、\`CloseOutcomeKind\` enum、\`LiquidationRecord\` 構造体、\`ScanReport\` 構造体、\`LiquidationScanner\` 構造体、5 個の accessor（\`new\`、\`with_empty_fund\`、\`fund_balance\`、\`fund\`、\`into_fund\`）を追加。\`scan\` メソッドはまだない。
- **\`src/lib.rs\`。** \`pub mod scanner;\` と scanner 型 4 つの re-export を追加。

レッスン11 で型語彙を整え、レッスン12 で \`scan\` を実装する。

## おさらい

レッスン10 の後:
- \`compute.rs\`、\`insurance.rs\`、\`types.rs\`、\`lib.rs\` が Liquidation参照実装（保険基金パート） の \`260883b\` と byte-for-byte 一致。
- \`cargo test\` は 55 テストを走らせ、すべて green。
- Multi-account orchestration loop の *すべての部品* が揃った: margin 分類（\`margin_health\`）、close-order 生成（\`close_order_spec\`）、fee math（\`liquidation_fee\`）、close-outcome 分解（\`solvent_close_outcome\` / \`underwater_close_outcome\`）、insurance fund state machine（\`InsuranceFund::deposit\` / \`::withdraw_shortfall\`）。
- だが bridge はこれらの部品を毎ブロック自分で hand-wire しなければならない。

Liquidation参照実装（スキャナパート） でそれらを再利用可能なコンポーネントに 1 回だけ組み立てる。Bridge がそれを所有する。Orchestration loop が \`scan\`（レッスン12）、その契約 — \`scan\` が何を取って何を返すか — が レッスン11 だ。

## 計画

編集は 3 つ:

1. **\`crates/liquidation/src/scanner.rs\` を新規作成。** \`CloseOutcomeKind\`、\`LiquidationRecord\`、\`ScanReport\`、\`LiquidationScanner\` を含む新規モジュール + 5 個の accessor。\`scan\` メソッドはなし（レッスン12 で着地）。
2. **\`crates/liquidation/src/lib.rs\` に \`pub mod scanner;\` と re-export を追加。** 型 4 つが crate の public surface に加わる。
3. **\`lib.rs\` 冒頭の roadmap コメントを更新。** Liquidation参照実装（スキャナパート） が進行中であることをマーク。

> 🛑 **予測。** 続きを読む前に考えてほしい。レッスン12 で実装する \`scan\` メソッドは、毎ブロック \`ScanReport\` を返す。Report にどんなフィールドが入るべきか、思いつくだけ挙げてみる。次に、report 内部の *per-account record* にどんなフィールドが入るべきか?

（答え: **Scan report:** (a) liquidate されたアカウントごとの record 1 件、(b) fund に deposit した fee の合計、(c) fund が実際に支払った金額の合計、(d) fund が cover できなかった unfilled deficit の合計。**Per-account record:** (a) account ID、(b) bridge が submit する close-order spec、(c) pre-close 分類（traceability のため）、(d) post-close outcome 分解（solvent or underwater）。Scanner は同じデータの 2 つの view を bridge に渡す。CLOB submit ステップ用の per-account records と、telemetry / ADL escalation を O(1) で読める aggregate 合計だ。）

レッスン11 の型レイヤリング画:

\`\`\`
   ┌────────────────────────────────────────────────────────────┐
   │  レッスン11 — orchestration 層の型                                  │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  Per-account（classification 後）:                          │
   │  ─────────────────────────────                             │
   │  enum CloseOutcomeKind {                                   │
   │      Solvent(SolventClose),       ──→ Fund deposit + 返金   │
   │      Underwater(UnderwaterClose), ──→ Fund shortfall パス   │
   │  }                                                         │
   │                                                            │
   │  struct LiquidationRecord {                                │
   │      account, close_order, classification, outcome         │
   │  }                                                         │
   │                                                            │
   │  Per-batch:                                                │
   │  ──────────                                                │
   │  struct ScanReport {                                       │
   │      records: Vec<LiquidationRecord>,                      │
   │      fund_deposits:     i64,    ← Σ over records           │
   │      fund_withdrawals:  i64,    ← Σ over records           │
   │      unfilled_deficit:  i64,    ← Σ → ADL trigger          │
   │  }                                                         │
   │                                                            │
   │  Owner:                                                    │
   │  ──────                                                    │
   │  struct LiquidationScanner {                               │
   │      params: LiquidationParams,                            │
   │      fund:   InsuranceFund,    ← 所有、共有ではない          │
   │  }                                                         │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
\`\`\`

レイヤリングで押さえる点が 3 つ:

1. **\`CloseOutcomeKind\` は Liquidation参照実装（スキャナパート） で *唯一* の新しい enum だ。** 他はすべて struct。なぜか。Routing 判断（solvent vs underwater）は \`compute\` の \`debug_assert!\` ペア（レッスン10）ですでに行われている。Enum は judgment を *carry through* するために存在する。*再判定する* ためではない。**Enum は還元不能な dispatch を encode する。Struct フィールドは並列なデータを encode する。**
2. **\`LiquidationRecord\` は \`classification\`（pre-close の \`MarginHealth\`）を運ぶ — bridge が derive できるにもかかわらず。** Close order を submit する bridge には実は要らない。必要としているのは *telemetry consumer* — 「Liquidatable と Underwater の close が時間別に何件か」をチャートにしたいダッシュボードだ。Record 内に保持すれば audit trail が 自己完結 になる。**Record フィールドは即時の caller ではなく downstream consumer のためにある。**
3. **\`ScanReport\` の 3 つの aggregate \`i64\` フィールドは別の fold ではなく scan loop 中で計算される。** Loop に足すコストは record 1 件あたり 3 回の \`saturating_add\` — 実質無料だ（scanner は record 1 件あたり既に 1 回触っているので）。**Single-pass loop 内で aggregate を事前計算するのは無料。Second pass で計算するのは無駄。**

## 手を動かす walk-through

### Step 1: \`src/scanner.rs\` を新規作成

\`crates/liquidation/src/scanner.rs\` を新規作成する。最初にモジュール全体の doc コメント — 決定性の契約と FIFO-fairness ポリシーを説明するアーキテクチャ概観だ:

\`\`\`rust
//! Multi-account liquidation scanner (Liquidation参照実装（スキャナパート）).
//!
//! The scanner is the orchestration layer that ties Liquidation参照実装（計算パート） (margin
//! classification + close-order generation) and Liquidation参照実装（保険基金パート） (insurance
//! fund + close-outcome decomposition) together. The bridge owns a
//! [\`LiquidationScanner\`], calls [\`LiquidationScanner::scan\`] once per
//! block (or per market-event tick) with the current accounts and mark,
//! and consumes the returned [\`ScanReport\`] to (a) submit the close
//! orders to the CLOB and (b) escalate any unfilled deficit.
//!
//! ### Determinism
//!
//! Every validator must produce byte-identical [\`ScanReport\`]s from the
//! same \`(accounts, mark, params, fund_state)\`. The scanner only uses
//! \`Vec\`'s ordered iteration and the fully-deterministic Liquidation参照実装（計算パート）／Liquidation参照実装（保険基金パート）
//! primitives, so determinism follows from caller-side ordering of the
//! accounts slice — **the bridge is responsible for handing accounts in
//! a deterministic order** (typically \`account_id\`-sorted).
//!
//! ### Fairness when the fund is partially drained
//!
//! When the insurance fund cannot cover every underwater shortfall in
//! one scan, the v0 policy is **first-come-first-served** in iteration
//! order. Earlier-iterated underwater accounts get covered; later ones
//! contribute to [\`ScanReport::unfilled_deficit\`]. This is the simplest
//! deterministic choice; production fairness designs (pro-rata draw,
//! priority by account leverage) can be layered on later without
//! changing the public type shape.
//!
//! ### ADL handoff (ADL参照実装パート)
//!
//! [\`ScanReport::unfilled_deficit\`] is the load-bearing signal that the
//! fund couldn't absorb everything. Liquidation参照実装（スキャナパート） records it; a future
//! ADL参照実装パート would consume it to drive ADL ranking and force-close
//! profitable counter-positions. Until ADL参照実装パート ships, the bridge can
//! either panic on \`unfilled_deficit > 0\` (conservative — halt the
//! chain) or log and continue (permissive — accept the deficit as a
//! protocol loss).
\`\`\`

このプリアンブルで押さえる点が 5 つ:

1. **冒頭の 1 文で *誰が何を呼ぶか* を定義している。** 「The bridge owns a \`LiquidationScanner\`, calls \`LiquidationScanner::scan\` once per block, and consumes the returned \`ScanReport\`.」 最初の 1 文だけ読んだ読者でも、所有関係と呼び出しパターンが分かる。**Orchestration モジュールの doc は、最初の 1 文を呼び出しパターンに使う。**
2. **\`Determinism\` セクションが *誰が何の責任を持つか* を名指す。** Scanner は決定的だ — *accounts の決定的な順序が与えられれば*。順序の責任は *bridge* にある。決定性の契約をこう分けて書くのは誠実だ。Scanner は自分が所有しないものを enforce できない。**Caller が提供する不変条件に依存するモジュールは、その不変条件を名指し、caller を credit する。**
3. **\`Fairness when the fund is partially drained\` セクションが v0 ポリシー AND その後継を名指す。** First-come-first-served は最も simple な決定的選択。Pro-rata draw と leverage-priority は将来の設計。両方を名指すことで、ポリシーは public-type shape を変えずに *replaceable* になる。**ポリシーを選ぶときは、public type が余地を残す代替案を名指せ。**
4. **\`ADL handoff\` セクションが、まだ存在しない stage との統合方法を説明している。** ADL参照実装パート は openhl roadmap の次の stage。レッスン11 の scanner はすでに ADL参照実装パート が必要とする signal（\`unfilled_deficit\`）を生んでいる。**Doc の forward reference は speculation ではない。次の stage が果たす integration contract だ。**
5. **Escalation の代替案（「panic vs log and continue」）** が ADL参照実装パート shipping までのトレードオフを明示的に名指す。Early-stage chain をデプロイする読者は自分の選択肢を知る。**Deployer が直面する operational decision を doc に書く。API だけではなく。**

Doc の下に、scanner が使う import を追加:

\`\`\`rust
use crate::compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, notional_value,
    solvent_close_outcome, underwater_close_outcome,
};
use crate::insurance::{InsuranceFund, WithdrawOutcome};
use crate::types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, SolventClose, UnderwaterClose,
};
use openhl_clob::AccountId;
use openhl_funding::MarkPrice;
\`\`\`

Import ブロックがやけに広いのは、scanner が *すべてを compose する* からだ。Compute 関数 6 つ、insurance 型 2 つ、type-module 型 5 つ、cross-crate 型 2 つ。広さは意図的だ。「Liquidation参照実装（スキャナパート） とは Liquidation参照実装（計算パート）+ Liquidation参照実装（保険基金パート） のすべてが組み合わさったもの」という bill of materials になっている。**Import ブロックは、それが依存関係のインベントリであるとき、ドキュメントとして機能する。**

### Step 2: \`CloseOutcomeKind\` を追加

Imports の下に discriminated outcome enum を追加:

\`\`\`rust
/// Discriminated outcome for a single liquidated account in a scan.
///
/// \`Solvent\` carries the [\`SolventClose\`] decomposition (full fee
/// collectable, residual returns to account). \`Underwater\` carries the
/// [\`UnderwaterClose\`] decomposition (partial or zero fee, shortfall the
/// fund must absorb).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CloseOutcomeKind {
    Solvent(SolventClose),
    Underwater(UnderwaterClose),
}
\`\`\`

押さえる点が 4 つ:

1. **Enum は *tuple variant* enum だ。struct-variant enum ではない。** 各 variant が 1 つの positional payload を運ぶ。代替案の \`Solvent { close: SolventClose }\` は named-field destructuring（\`CloseOutcomeKind::Solvent { close } => ...\`）を要求する。Tuple variant なら \`CloseOutcomeKind::Solvent(close) => ...\` とクリーンに書ける。**Variant がちょうど 1 つの payload type を運ぶとき、tuple variant が struct variant に勝つ。**
2. **Enum は \`Copy\`** — \`SolventClose\` と \`UnderwaterClose\` がどちらも \`Copy\`（各々 i64 フィールド 2 つ）だからだ。値渡し、値での pattern-match、borrow 管理なし。**\`Copy\` 型を compose すると、エンジニアリングコスト 0 で \`Copy\` enum が生まれる。**
3. **Doc コメントが *2 つの payload* を明示的に名指す** — full-fee solvent vs partial-or-zero underwater。Enum signature を doc なしで見た読者は、\`Underwater\` に「zero fee, full shortfall」ケースが含まれることを知らない（レッスン10 の doc は明らかにしたが）。ここでの cross-reference が読者の手間を省く。**上位層 enum が下位層 struct を運び、その下位 struct に subtle な internal ケースがあるとき、上位層の doc でそれらを名指す。**
4. **\`match\` 網羅性ヘルパー variant なし。** \`_ => unreachable!()\` 風の catch-all は要らない。Enum は variant がちょうど 2 つで、レッスン10 で確立した discriminated-dispatch 空間を網羅する。**2-variant enum は最小の discriminated dispatch。拾うものがない。**

### Step 3: \`LiquidationRecord\` を追加

\`CloseOutcomeKind\` の下に per-account record 構造体を追加:

\`\`\`rust
/// Per-account record produced by the scanner when an account is
/// liquidated. The bridge submits \`close_order\` to the CLOB; \`outcome\`
/// records the credit/debit decomposition the scanner already applied
/// against the [\`InsuranceFund\`].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LiquidationRecord {
    pub account: AccountId,
    pub close_order: CloseOrderSpec,
    /// Pre-close classification from [\`margin_health\`]. \`Liquidatable\`
    /// or \`Underwater\`; \`Safe\`/\`AtRisk\` accounts never appear in a
    /// record.
    pub classification: MarginHealth,
    /// Decomposition of what happened in the close. Note that a
    /// \`Liquidatable\`-classified account can still produce an
    /// \`Underwater\` outcome when the fee tips post-close equity
    /// negative.
    pub outcome: CloseOutcomeKind,
}
\`\`\`

押さえる点が 6 つ:

1. **フィールド 4 つ、うち 3 つが既存モジュールの \`Copy\` 型。** \`AccountId\`（\`openhl-clob\` から）、\`CloseOrderSpec\`（Liquidation参照実装（計算パート））、\`MarginHealth\`（Liquidation参照実装（計算パート））、\`CloseOutcomeKind\`（このモジュール）。既存の型を record に compose するのは無料だ。**新規フィールドを導入しない record 構造体は、純粋な語彙拡張 — 名前を付けて前に進む。**
2. **\`classification\` は \`MarginHealth\`、4 variant enum を運ぶ**（\`Safe\`、\`AtRisk\`、\`Liquidatable\`、\`Underwater\`）。Doc は record に現れるのは 2 つだけだと言う — 他の 2 つは \`LiquidationRecord\` に決して入らない（scanner が skip するからだ）。型は 4 値を *許す*; 契約は 2 値に narrow する。**型が実際に API が生む以上のケースを運ぶことはある。契約の narrowing は doc に書く、別の sub-enum ではなく。**
3. **\`Liquidatable\`-classified → \`Underwater\`-outcome のノートが key となる教授点だ。** フィールド名だけ読んだ読者は \`classification == outcome\` が常に成り立つと仮定するだろう。だが *classification* は pre-close equity を、*outcome* は post-close equity（fee が減らした）を使う。Liquidation参照実装（計算パート） の \`margin_health\` と Liquidation参照実装（保険基金パート） の \`solvent_close_outcome\` / \`underwater_close_outcome\` は、アカウントが fee-threshold のどちら側に着地するかで disagree しうる。具体例は レッスン10 の \`underwater_close_partial_fee_collection\` テストだ: pre-close は \`Liquidatable\`（maintenance margin より上の正の equity を持つ）だが、close + fee で post-close equity が「ほしかった fee」を下回る — そのため *classification* は \`Liquidatable\` でも、*outcome* は \`Underwater\` 分岐に着地する。**関連する 2 つのフィールドが disagree しうるケースは document する。読者はそれ以外は常に agree すると仮定する。**
4. **構造体は \`Copy\`** — 4 フィールドすべてが \`Copy\` だからだ。\`LiquidationRecord\` は \`Vec\` に push される（\`Vec\` は \`Copy\` を要求しない）が、\`Copy\` のままにしておくと レッスン12 の \`scan\` メソッドの per-iteration loop body が ergonomic になる — \`.clone()\` なし、borrow 管理なし。**フィールドが許すなら record 型を \`Copy\` にする。コストは 0、ergonomics は複利化する。**
5. **4 フィールドすべて \`pub\`。** \`LiquidationRecord\` は *value type* — bridge はフィールドを直接読む。Accessor で隠すと \`record.account()\` を強制し、\`record.account\` より得るものは何もない（守るべき invariant がない）。**データを運ぶためだけに存在する record では、public フィールドがメソッドに勝つ。**
6. **\`Default\` derive なし。** Default record は何を意味する? 空の \`AccountId\`、qty 0 の \`CloseOrderSpec\`、\`Safe\` classification、\`Solvent(SolventClose::default())\` outcome? どれも意味がない。**意味が「何か特定のことが起きた」である record では、\`Default\` を derive しない — encode すべき中立 state がない。**

### Step 4: \`ScanReport\` を追加

\`LiquidationRecord\` の下に batch-level の summary を追加:

\`\`\`rust
/// Summary of a single scan pass. Includes per-account records plus
/// aggregate fund-flow totals for telemetry / escalation.
#[derive(Clone, Debug, PartialEq, Eq, Default)]
pub struct ScanReport {
    /// One record per liquidated account, in scan-iteration order. The
    /// bridge submits each record's \`close_order\` to the CLOB.
    pub records: Vec<LiquidationRecord>,
    /// Total fees credited to the insurance fund during this scan.
    pub fund_deposits: i64,
    /// Total amount the insurance fund actually paid out (sum of the
    /// \`amount\` field across \`Covered\` and \`PartiallyDrained\`
    /// withdrawals).
    pub fund_withdrawals: i64,
    /// Total shortfall the fund could NOT cover (sum across
    /// \`PartiallyDrained.unfilled\` and \`Depleted.unfilled\`). ADL参照実装パート
    /// consumes this as the ADL trigger.
    pub unfilled_deficit: i64,
}
\`\`\`

押さえる点が 6 つ:

1. **\`ScanReport\` は \`Clone + Default\` だが、\`Copy\` ではない。** \`Vec\` を含むからだ — heap-allocated でビット単位のコピーができない。Compiler がこれを enforce する: \`Vec\`-containing struct に \`Copy\` を派生させることはできない。**\`Vec\` の存在は compiler-enforced な「私は heap allocation を持つ」シグナルだ。**
2. **\`Default\` が derive されている — そして意味がある。** Empty scan（liquidatable アカウントなし）は \`ScanReport { records: vec![], fund_deposits: 0, fund_withdrawals: 0, unfilled_deficit: 0 }\` を生む。それはちょうど \`Default::default()\` がくれるもの、レッスン12 の \`scan\` メソッドが initialize するものだ。**Default 値が実際の domain state を表すとき、\`Default\` は意味がある — ここでは「scan は何も返さなかった」。**
3. **\`Vec\` の隣に 3 つの \`i64\` aggregate** — \`fund_deposits\`、\`fund_withdrawals\`、\`unfilled_deficit\`。代替案 — \`report.records.iter().map(|r| r.outcome.fee()).sum()\` で計算する — は bridge が読むたびに records を iterate することを要求する。Scan loop 内で事前計算するのは record 1 件あたり O(1) extra で、bridge の O(n) fold を省ける。**Record vector の隣にある aggregate フィールドは caller が fold をする手間を省く。冗長ではない。**
4. **\`fund_withdrawals\` は \`amount\` の合計であって、\`shortfall\` の合計ではない。** 二度読む。Bridge が知りたいのは「fund が実際にいくら支払ったか?」、「いくら要求されたか?」ではない。2 つは fund が partial drain したときに違ってくる（\`amount < shortfall\`）。フィールド名は *支払われた* ものを反映し、*要求された* ものではない。**Aggregate フィールドは *起きたこと* を測る。*要求されたこと* ではない。**
5. **\`unfilled_deficit\` は 2 つの \`WithdrawOutcome\` variant にわたる合計だ。** 具体的には \`PartiallyDrained.unfilled\` AND \`Depleted.unfilled\`。Doc コメントが両方を名指す。\`PartiallyDrained\` しか頭にない読者は \`Depleted\` ケース（fund が呼び出し前から空だった）を見落とす。**Aggregate が enum variant にわたって合計されるとき、寄与する variant すべてを名指す。**
6. **\`unfilled_deficit\` は ADL参照実装パート への *signal そのもの*。** Doc コメントがそう名指す。レッスン11 の契約はこのフィールドが存在し正しく計算されること。ADL参照実装パート の契約はこのフィールドを consume して ADL を駆動すること。**2 つの stage 間の handoff は、明確な名前と document された consumer を持つ i64 フィールドだ。**

### Step 5: \`LiquidationScanner\` 構造体 + accessors を追加

\`ScanReport\` の下に scanner struct と accessor を追加:

\`\`\`rust
/// Multi-account liquidation scanner.
///
/// Owns an [\`InsuranceFund\`] and a set of [\`LiquidationParams\`]. The
/// bridge calls [\`Self::scan\`] once per block; the scanner classifies
/// every account, generates close orders for the Liquidatable/Underwater
/// ones, mutates the fund accordingly, and returns the resulting
/// [\`ScanReport\`].
#[derive(Clone, Debug)]
pub struct LiquidationScanner {
    params: LiquidationParams,
    fund: InsuranceFund,
}

impl LiquidationScanner {
    /// Construct a scanner with the given params and a starting fund
    /// balance.
    #[must_use]
    pub const fn new(params: LiquidationParams, fund: InsuranceFund) -> Self {
        Self { params, fund }
    }

    /// Construct a scanner with the given params and an empty insurance
    /// fund. Convenience for tests and fresh-chain bootstrap.
    #[must_use]
    pub const fn with_empty_fund(params: LiquidationParams) -> Self {
        Self {
            params,
            fund: InsuranceFund::empty(),
        }
    }

    /// Current insurance fund balance.
    #[must_use]
    pub const fn fund_balance(&self) -> i64 {
        self.fund.balance()
    }

    /// Borrow the underlying insurance fund (read-only).
    #[must_use]
    pub const fn fund(&self) -> &InsuranceFund {
        &self.fund
    }

    /// Consume the scanner and return its fund — useful for handoff to
    /// snapshot/persistence layers at chain shutdown.
    #[must_use]
    pub fn into_fund(self) -> InsuranceFund {
        self.fund
    }
}
\`\`\`

押さえる点が 7 つ:

1. **構造体は *private* フィールド 2 つ、public は 0 だ。** \`LiquidationRecord\`（all-public、data carrier）や \`ScanReport\`（all-public、value type）と違い、\`LiquidationScanner\` は *state machine* だ。Mutable state（fund）を所有し、bridge はメソッドを介してそれと交流するべきだ。Private フィールドがその契約を enforce する。**State machine はフィールドを隠す。Data carrier はフィールドを公開する。**
2. **構造体は \`Clone\` だが \`Copy\` ではない**（fund は技術的にはここでは \`Copy\` だが、\`#[derive(Clone, Debug)]\` ブロック内に compose しておけば将来の進化を許せる）。Clone はテストや safe な snapshot パターンのためのもので、production コードが scanner を clone することはほぼない。**現在の caller が誰も使っていなくても \`Clone\` を defensively derive する。コストは 0、将来のテストパターンを unblock する。**
3. **5 個の accessor メソッド、Builder pattern *ではなく*。** Builder なら \`LiquidationScanner::builder().with_params(p).with_fund(f).build()\` と書ける。使わない理由: scanner はフィールドがちょうど 2 つで、construction site が小さいからだ。**Builder は 5+ optional フィールドがあるとき意味がある。2 フィールドなら、2 つのコンストラクタ（\`new\`、\`with_empty_fund\`）が builder に勝つ。**
4. **\`fund_balance\` は \`i64\` を直接返し、\`fund\` は \`&InsuranceFund\` を返す。** 2 つの access パターン、2 つのメソッド。Bridge は balance をよく log する（\`fund_balance\` は i64 1 つ — 速い）。Bridge はたまに fund 全体を inspect する（\`fund\` は borrow を返す — \`Copy\` でも動くが borrow のほうが explicit）。**Hot-path scalar と cold-path full reference の両方を提供する。Caller に選ばせる。**
5. **\`into_fund\` は *consume-and-extract* パターン。** Chain shutdown（openhl では Stage 13+）で、bridge は \`scanner.into_fund()\` を呼んで fund state を snapshot/persistence のために抽出する。メソッドは \`self\` を値で取る（\`&self\` ではない）。Scanner は呼び出し後に drop され、fund は caller の手に渡る。**\`self\` を値で取る \`into_*\` メソッドは「one-shot、オリジナルは消える」というシグナルだ。**
6. **5 つの accessor のうち 4 つが \`const fn\`。** \`into_fund\` 以外すべて compile time に評価できる — \`self\` からデータを move out しないからだ。\`into_fund\` の consume-pattern は const にできない。非 \`Copy\` 型である \`self\` を消費・解体して所有フィールドを move out する挙動は、現在の \`const\` コンテキストでは禁じられている（compile-time 評価では非 \`Copy\` の引数・ローカルに対する破壊的 move が制限される）。**\`const fn\` にできるものは \`const fn\` にする。境界は通常、関数がデータを move するかどうか。**
7. **\`set_*\` メソッドなし。** Bridge は（将来の）\`scan\` メソッド経由で fund state を mutate する。\`self.fund\` への直接代入ではない。\`set_fund(&mut self, f: InsuranceFund)\` accessor は bridge が scan loop を bypass できる surface を作ってしまう。まさに防ぎたい abstraction-breaking の正体だ。**State machine は state-machine 遷移を実装するメソッドのみで mutation を公開する。フィールド setter ではなく。**

> 🛑 **やりがちな勘違い。** 「\`LiquidationScanner\` が \`InsuranceFund\` を値で所有するのはなぜか? reference (\`fund: &'a mut InsuranceFund\`) や shared (\`fund: Arc<Mutex<InsuranceFund>>\`) ではないのか?」 代替案の問題が 3 つ。(1) \`&'a mut\` は lifetime parameter を導入し、それが scanner の現れるすべての型を伝播する。Call site がうるさくなり、\`LiquidationScanner<'a>\` が scanner を保持するすべての struct に現れる。(2) \`Arc<Mutex<...>>\` は shared mutable state のためのものだ。Scanner は shared ではなく、bridge が所有する。競合のない同期は runtime overhead でしかない。(3) 値で所有するなら、scanner の lifetime *が* fund の lifetime だ。\`into_fund\` メソッドが shutdown 時の caller にクリーンな handoff を与える。**Ownership semantics は lifecycle に合わせる: per-bridge コンポーネント、single mutator、shutdown 時に persist。**

### Step 6: \`lib.rs\` にモジュールを配線

\`crates/liquidation/src/lib.rs\` を開く。変更は 3 つ:

まず、モジュール宣言を加える。\`insurance\` の後に \`scanner\` を挿入:

\`\`\`rust
pub mod compute;
pub mod insurance;
pub mod scanner;
pub mod types;
\`\`\`

次に、\`insurance\` re-export の下に新しい行として scanner re-export を加える:

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, margin_ratio,
    notional_value, solvent_close_outcome, underwater_close_outcome, unrealized_pnl,
};
pub use insurance::{InsuranceFund, WithdrawOutcome};
pub use scanner::{CloseOutcomeKind, LiquidationRecord, LiquidationScanner, ScanReport};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, SolventClose,
    UnderwaterClose, MARGIN_SCALE,
};
\`\`\`

Scanner 型 4 つ（enum + struct 3 つ）を 1 行で re-export、\`{ }\` 内は alphabetical。

3 つ目、\`lib.rs\` 冒頭の roadmap コメントを Liquidation参照実装（スキャナパート） 進行中に更新する。具体的な変更は今の \`lib.rs\` preamble の内容次第だが、答え合わせは「scanner shipping in this commit」とマークしている。そこに揃える。

### Step 7: \`cargo check\` を走らせる

\`\`\`bash
cargo check -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
    Checking openhl-liquidation v0.1.0 (/path/to/openhl/crates/liquidation)
    Finished \`dev\` profile [optimized + debuginfo] target(s) in 1.2s
\`\`\`

**Clean compile。** テストは走らない — \`scan\` メソッドがまだないので、testable なものがない。レッスン10 の 55 既存テストは依然 pass する（\`cargo test -p openhl-liquidation\` で確認）が、レッスン11 はそれらの追加・修正をしない。

エラー時にありがちなパターン:

- **\`unresolved import \\\`openhl_clob::AccountId\\\`** — scanner は \`openhl-clob\` と \`openhl-funding\` に \`AccountId\` と \`MarkPrice\` で依存する。\`crates/liquidation/Cargo.toml\` の \`[dependencies]\` に両方をリストしているか確認する。答え合わせ crate には既に両方がある（レッスン0のレッスンで設定済み）。
- **\`unused import: \\\`account_equity\\\`** — clippy / rustc が「レッスン11 に \`scan\` メソッドがないので import がいくつか使われていない」と警告するかもしれない。**これらの警告は レッスン11 では意図されたものだ** — import は レッスン12 用に *staged* されており、レッスン12 がそのすべてを consume する。「警告 0 件」規律で進めたい読者は、レッスン11 だけ \`scanner.rs\` 冒頭に \`#[allow(unused_imports)]\` を入れ、レッスン12 着地時に attribute を削除する。それ以外は警告をそのままにする — レッスン12 の \`scan\` 本体が compile した瞬間に消える。答え合わせは レッスン11 と レッスン12 を一緒に ship するので \`allow\` しない。**レッスン11 で警告が 0 件だったら逆にどこかおかしい。ここで出る unused-import 警告はすべて想定内だ。**
- **\`pub mod scanner;\` の配置** — \`pub mod types;\` の後に置くと alphabetical な順序が壊れる。答え合わせは \`lib.rs\` 内で alphabetical な順序に揃えている。それに合わせる。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **語彙先、メカニズム後 — もう一度。** レッスン8（\`WithdrawOutcome\` が レッスン8 で宣言、レッスン9 で使用）、レッスン10（\`SolventClose\` / \`UnderwaterClose\` が宣言と同時に使用）と同じパターン。レッスン11 は orchestration 層の型を宣言し、レッスン12 の \`scan\` メソッドが return value を置く場所を作る。**レッスン11 後にファイルを開く読者は、完全な型 API surface を見る。レッスン12 が動詞を埋める。**

2. **Scanner は insurance fund を値で所有する。** \`&'a mut\` でも、\`Arc<Mutex<...>>\` でも、\`Rc<RefCell<...>>\` でもない。Ownership 判断こそが scanner を lifetime gymnastics や runtime overhead なしに使える状態にする。**Single mutator と明確な shutdown point を持つ state-machine コンポーネントは、自分の state を値で所有すべき。**

3. **Record vector の隣の aggregate フィールドは caller が fold する手間を省く。** \`ScanReport.fund_deposits\` は数学的には \`report.records.iter().map(|r| ...)\` の合計と等しい。だが scan loop 内で計算すれば 3 回の \`saturating_add\` で済み、bridge から iteration を 1 つ省ける。**Single-pass loop 内で aggregate を事前計算する。コストは無料、API 契約はきれいになる。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

レッスン11 の後:
- **scanner.rs** は Liquidation参照実装（スキャナパート） の \`scanner.rs\` の **\`impl LiquidationScanner\` ブロック内 accessor まで一致**（\`scan\` メソッドとテストは レッスン12 + レッスン13 で着地）。具体的には: doc + imports + \`CloseOutcomeKind\` + \`LiquidationRecord\` + \`ScanReport\` + \`LiquidationScanner\` struct + \`new\` / \`with_empty_fund\` / \`fund_balance\` / \`fund\` / \`into_fund\`。
- **lib.rs** は Liquidation参照実装（スキャナパート） の \`lib.rs\` の \`pub mod scanner;\` 行と \`pub use scanner::{...}\` re-export について **byte-for-byte 一致**。

## よくある質問

**Q1: なぜ \`CloseOutcomeKind\` は \`Kind\` サフィックス付きで命名されているのか? 単に \`CloseOutcome\` ではダメか?**

\`CloseOutcome\` だと \`SolventClose\` と \`UnderwaterClose\` 内の *outcome* フィールドと頭の中で衝突する。\`Kind\` サフィックスは「この enum は *どの kind* の outcome が起きたかについてのもの」と明示し、enum が *dispatcher* であって outcome データそのものではないことを明らかにする。**Suffix-naming（Kind、Type、Variant）は「これは discriminator であって、データではない」の Rust イディオムだ。**

**Q2: なぜ \`LiquidationRecord\` は post-close の trader balance を運ばないのか? Bridge は trader に credit するためにそれを必要とする。**

balance は trader のアカウント上に住んでいて、liquidation engine の中にはない。Scanner は \`SolventClose { fee_to_fund, residual_to_account }\` を生み、\`residual_to_account\` こそが bridge が trader balance に加える額だ。Scanner は trader の pre-liquidation balance を *知らない*。Bridge が知っている。**Compute コンポーネントは delta を生む。Balance 所有者がそれを apply する。他所に住むデータを保存しない。**

**Q3: \`ScanReport\` は \`Vec<LiquidationRecord>\` を持つ — scan ごとに allocate しないか?**

する。それで OK だ。Vec はせいぜいスライス内の Liquidatable アカウント 1 件あたり 1 エントリ。Healthy chain の定常状態では、ほとんどのブロックで liquidation 件数は 0、vec は empty のまま（empty vec は allocate しない）。多数の liquidation が起きる stressed chain では、allocation は実際の liquidation の値段に比べてマイクロ秒オーダーだ。後で profiling で hot だと分かれば、bridge が \`ScanReport\` インスタンスを pool できる。**伴う仕事に圧倒される allocation を pre-optimize しない。**

**Q4: \`LiquidationScanner\` を fund 型に対して generic にできないか? \`LiquidationScanner<F: Fund>\`?**

できる。だが \`Fund\` の唯一の既存実装は \`InsuranceFund\` だ。Generic を加えると type parameter がすべての caller に伝播する。**Generic は *交換可能な* 実装のためのもの。実装が 1 つなら、concrete 型が generic に勝つ。** 将来「冗長な fund」（二層 insurance）を swap する必要が出たら、それが trait を導入するタイミング。その前ではない。

**Q5: \`into_fund\` は scanner を consume する。Fund snapshot を取りつつ scanner 操作を続けたい場合は?**

\`fund()\`（\`&InsuranceFund\` を返す）を使って borrow 経由で \`.balance()\` や他のフィールドを読む。\`into_fund\` は *chain shutdown 時の handoff* 専用だ。Bridge が scanner を使い終わったときに呼ぶ。Mid-chain の inspection には borrow が正しいパターン。**\`into_*\` は terminal state 用。\`fn x(&self) -> &T\` は inspection 用。**

**Q6: なぜ \`LiquidationRecord\` は \`classification\`（pre-close の \`MarginHealth\`）を運ぶのか? Bridge は snapshot からいつでも re-derive できるのに。**

Bridge *は* re-derive できる。ただし pre-close snapshot を保持していた場合に限る。だが通常は保持しない。Scanner はそれらを既に持っている（iterate したのだから）。Classification を record に store するのは record 1 件あたり O(1) extra space で、bridge が独自の snapshot history を持つ手間を省く。**以前なされた derivation を capture する record は、caller が upstream の仕事をやり直す手間を省く。**

## 次のレッスン (レッスン12) — \`scan\` メソッド + 最初の 4 unit test

レッスン12 で orchestration の心臓 — \`scan\` メソッド — を実装する。メソッドは \`&[AccountSnapshot]\` と \`MarkPrice\` を取り、レッスン6 の \`margin_health\` で各アカウントを分類、Liquidatable/Underwater アカウントを レッスン10 の \`solvent_close_outcome\` / \`underwater_close_outcome\` に dispatch、レッスン9 の \`InsuranceFund::deposit\` と \`::withdraw_shortfall\` で fund を in-place mutate、そして道中で \`ScanReport\` を構築する。

レッスン12 は 4 つの最もシンプルな unit test も加える:
- \`scan_empty_accounts_returns_empty_report\` — sanity check。
- \`scan_all_safe_accounts_does_nothing\` — liquidation がないなら record もない。
- \`scan_atrisk_does_not_liquidate\` — AtRisk は *警告* であって、トリガではない。
- \`scan_skips_flat_positions\` — 誤分類された flat への defensive guard。

レッスン12 後、scanner は *runnable* になる。59 テスト pass（34 compute + 21 insurance + 4 件の新規 scanner test）。レッスン13 がさらに 5 個の nuanced unit test と 4 個の conservation-law proptest で stress テストし、最終的に 68 件まで持っていく。
`,
                },
                {
                  title: "レッスン 12 — scan — safety cascade のオーケストレーションの心臓",
                  slug: "openhl-liquidation-scan-method-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン 12 — \`scan\` — safety cascade のオーケストレーションの心臓

## ゴール

このレッスンで掴む概念:

- **\`scan\` メソッドは orchestration 層で *唯一の動詞*。他はすべて名詞だ。** レッスン11 は状態を記述する型 4 つを宣言した。レッスン12 は入力から状態を生む 1 つのメソッドを実装する。メソッドは \`(accounts, mark)\` を取り、\`ScanReport\` を返す。本体内では、レッスン4-レッスン10 にわたって構築した Liquidation参照実装（計算パート） + Liquidation参照実装（保険基金パート） プリミティブのすべてが、liquidate 対象アカウント 1 件あたりちょうど 1 度ずつ呼ばれる。**Composition がアーキテクチャ。1 つの動詞が 10 個の名詞を consume する。**
- **\`MarginHealth\` に対する \`match\` + \`continue\`-guard は「liquidate 対象でないアカウントは skip」の最もきれいな pattern。** 代替案 — \`if !matches!(c, MarginHealth::Liquidatable | MarginHealth::Underwater) { continue; }\` — のほうが短いが、exhaustiveness を失う。\`match\` 形は compiler に「*すべての* \`MarginHealth\` variant が考慮されたか」を enforce させる — それが将来 5 つ目の variant が追加されたときに bug を捕まえる規律だ。**Enum が将来成長しうるとき、exhaustive \`match\` が predicate-with-\`!\` に勝つ。**
- **Loop 内の solvent vs underwater dispatch は レッスン10 の \`debug_assert!\` ペアを直接 mirror する。** \`if post_close_equity >= fee_desired\` が \`solvent_close_outcome\` に route、\`else\` が \`underwater_close_outcome\` に route。レッスン10 の debug-assert が「呼び出し側がやってくれる」と言った routing を、scanner がまさに実行している。**Caller の runtime predicate は callee の compile-time 契約と同一だ。**
- **Underwater 分岐の \`WithdrawOutcome\` pattern-match は レッスン9 の enum を \`(paid, unfilled)\` タプルに分解する — loop 内で レッスン9 の 3-variant enum が 1 行以上の handling を必要とする *唯一の場所* だ。** Solvent close は \`withdraw_shortfall\` を一度も触らない。\`deposit\` だけ。Underwater close は \`withdraw_shortfall\` を呼んで結果に pattern-match する。\`ScanReport\` の i64 フィールドへの集計は record 1 件あたり \`saturating_add\` だ。**Orchestration 層は レッスン9 の variant と レッスン11 の i64 aggregate の間を、ちょうど 1 つの pattern-match で翻訳する。**

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 59 テストが pass する（compute 34 + insurance 21 + 新規 scanner test 4）。次の 5 個の unit test と 4 個の proptest は レッスン13 で着地する。レッスン13 後は 68 件。

具体的な変更:

- **\`src/scanner.rs\`。** 既存の \`impl LiquidationScanner\` ブロックに \`scan\` メソッドを追加する。レッスン11 の imports がついに consumer を得て、unused-import 警告が消える。\`#[cfg(test)] mod tests\` の足場（ヘルパー + \`use\` ブロック + 最初のセクション区切り）と最もシンプルな unit test 4 個も追加する。

レッスン12 で scanner が *runnable* になる。レッスン13 で stress test に入る。

## おさらい

レッスン11 の後:
- \`scanner.rs\` に型語彙（\`CloseOutcomeKind\`、\`LiquidationRecord\`、\`ScanReport\`、\`LiquidationScanner\`）と 5 個の accessor（\`new\`、\`with_empty_fund\`、\`fund_balance\`、\`fund\`、\`into_fund\`）が揃う。
- \`lib.rs\` は scanner 型 4 つを re-export 済み。
- \`cargo check\` はクリーンに compile する — ただし \`account_equity\`、\`close_order_spec\`、\`liquidation_fee\`、\`margin_health\`、\`notional_value\`、\`solvent_close_outcome\`、\`underwater_close_outcome\`、\`WithdrawOutcome\` に unused-import 警告が出る。すべて *レッスン12 用に staged* されている。
- \`cargo test\` は依然 L0-レッスン10 の 55 テストを走らせ、すべて green。

レッスン12 がそれらの staged import をすべて引き換える。

## 計画

編集は 2 つ:

1. **\`crates/liquidation/src/scanner.rs\` の \`impl LiquidationScanner\` ブロックに \`scan\` メソッドを追加する。** メソッド本体は約 50 行 — Liquidation参照実装（計算パート） の margin 分類、Liquidation参照実装（保険基金パート） の close-outcome 分解、InsuranceFund state machine を 1 つの batch 操作に結ぶ orchestration loop。
2. **\`#[cfg(test)] mod tests\` ブロックを追加する。** ヘルパー 3 つの import、\`snapshot\` factory、\`default_params\` ヘルパー、そして 4 個の最もシンプルな unit test。

> 🛑 **予測。** 続きを読む前に考えてほしい。スライス内のアカウントごとに、liquidate するか（fund がどちらかに動く）skip するかを決める単一関数を書いている。関数本体に必要な *6 つ* の異なる分岐をリストアップする — 2 つの skip ケース（Safe/AtRisk continue、flat-position continue）と 4 つの work ケース（solvent → fund deposit、underwater positive equity → partial fee + withdraw、underwater zero equity → no fee + full withdraw、underwater negative equity → no fee + extra-large withdraw）を含めて。

（答えは本文で: 関数の分岐は厳密に 2 つの \`continue\` 分岐と 2 つの routing 分岐（solvent vs underwater）だ。Underwater 分岐は positive/zero/negative equity の 3 つのサブケースを 1 回の \`underwater_close_outcome\` 呼び出しの下に統合する — 呼び出しは内部で分岐するが、1 つの return type を提示する。Scanner レベルでは: **2 つの skip + 1 つの solvent + 1 つの underwater = 4 つの分岐**。予測した「6 つ」は 4 つに収束する。レッスン10 の \`underwater_close_outcome\` がすでにサブケースの統合を済ませているからだ。**Callee 内でサブケースを encapsulate すれば、caller の分岐数が縮む。**）

\`scan\` メソッドの shape:

\`\`\`
   ┌────────────────────────────────────────────────────────────┐
   │  scan(accounts, mark) → ScanReport                         │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  let mut report = ScanReport::default();                   │
   │  for snapshot in accounts {                                │
   │                                                            │
   │      let classification = margin_health(...);              │
   │      match classification {                                │
   │          Safe | AtRisk => continue,    ←─ skip path 1       │
   │          Liquidatable | Underwater => {} ← work path        │
   │      }                                                     │
   │                                                            │
   │      if snapshot.position_size.0 == 0 { continue; } ← skip 2│
   │                                                            │
   │      let close_order = close_order_spec(snapshot);         │
   │                                                            │
   │      let outcome = if post_close_equity >= fee_desired {   │
   │          // Solvent 分岐                                    │
   │          let s = solvent_close_outcome(...);               │
   │          self.fund.deposit(s.fee_to_fund);                 │
   │          report.fund_deposits += s.fee_to_fund;            │
   │          CloseOutcomeKind::Solvent(s)                      │
   │      } else {                                              │
   │          // Underwater 分岐                                 │
   │          let u = underwater_close_outcome(...);            │
   │          if u.fee_to_fund > 0 { self.fund.deposit(u.f_t_f);│
   │                                  report.fund_deposits +=  }│
   │          let w = self.fund.withdraw_shortfall(u.shortfall);│
   │          // WithdrawOutcome を pattern-match → (paid, unfilled)│
   │          report.fund_withdrawals += paid;                  │
   │          report.unfilled_deficit  += unfilled;             │
   │          CloseOutcomeKind::Underwater(u)                   │
   │      };                                                    │
   │                                                            │
   │      report.records.push(LiquidationRecord { ... });       │
   │  }                                                         │
   │                                                            │
   │  report                                                    │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
\`\`\`

Shape で押さえる点が 3 つ:

1. **外側の iteration は \`for snapshot in accounts\` — シンプルな順序つき loop だ。** \`iter().filter().map().collect()\` chain ではない。理由: 各 iteration が *side effects* を持つからだ（fund の mutation、report の mutation）。Iterator chain は pure な transformation を compose するときに映える。Stateful な per-iteration の仕事には、素朴な \`for\` のほうが読みやすく debug もしやすい。**\`for\` loop は、本体が closure の外側の state を mutate するとき iterator chain に勝つ。**
2. **2 つの \`continue\` 分岐は loop body の *先頭* にある。** どんな仕事も commit する前に入力を reject する — 分類が最初、flat-skip が 2 番目。「Happy path」コード（skip の後）は同じ indent level に inline で並ぶ。\`if\` の中にネストされていない。**Loop の先頭での rejection は skip 条件で最もきれいなパターン。ネストは仕事を必要以上に深く押し込む。**
3. **\`ScanReport\` フィールドへの集計は最終的な \`.iter().sum()\` ではなく、per-iteration の \`saturating_add\` を使う。** レッスン11 の設計選択（record vector の隣の aggregate フィールド）が per-iteration accumulation を要求する。コストは record 1 件あたり scalar 1 つにつき \`saturating_add\` 1 回 — 実行中の仕事に比べてマイクロ秒オーダーだ。**Single-pass accumulation は レッスン11 の設計契約と一致する。**

## 手を動かす walk-through

### Step 1: \`scan\` メソッドを追加

\`crates/liquidation/src/scanner.rs\` を開く。既存の \`impl LiquidationScanner { ... }\` ブロック（現在は \`into_fund\` accessor で終わる）を見つける。\`into_fund\` の後に \`scan\` メソッドを追記:

\`\`\`rust
    /// Scan every account and produce a [\`ScanReport\`] of the resulting
    /// liquidations.
    ///
    /// All accounts are classified at the given \`mark\`. Liquidatable and
    /// Underwater accounts are converted to close orders + outcomes,
    /// with the insurance fund mutated in place. \`Safe\` and \`AtRisk\`
    /// accounts produce no record and no fund mutation.
    ///
    /// Flat positions (\`position_size == 0\`) that misclassify as
    /// Liquidatable are also skipped — \`close_order_spec\` would emit a
    /// zero-qty spec which the CLOB rejects.
    pub fn scan(
        &mut self,
        accounts: &[AccountSnapshot],
        mark: MarkPrice,
    ) -> ScanReport {
        let mut report = ScanReport::default();

        for snapshot in accounts {
            let classification = margin_health(snapshot, mark, &self.params);
            match classification {
                MarginHealth::Safe | MarginHealth::AtRisk => continue,
                MarginHealth::Liquidatable | MarginHealth::Underwater => {}
            }

            // Skip flat positions defensively — the upstream
            // classification should never put them here, but the math
            // for a zero-size position produces a zero-qty close order
            // which the CLOB rejects.
            if snapshot.position_size.0 == 0 {
                continue;
            }

            let close_order = close_order_spec(snapshot);

            // Decide solvent vs underwater path on post-close-equity vs
            // desired fee, exactly mirroring the compute module's
            // contract.
            let notional = notional_value(snapshot, mark);
            let fee_desired = liquidation_fee(notional, &self.params);
            let post_close_equity = account_equity(snapshot, mark);

            let outcome = if post_close_equity >= fee_desired {
                let solvent = solvent_close_outcome(snapshot, mark, &self.params);
                self.fund.deposit(solvent.fee_to_fund);
                report.fund_deposits =
                    report.fund_deposits.saturating_add(solvent.fee_to_fund);
                CloseOutcomeKind::Solvent(solvent)
            } else {
                let underwater = underwater_close_outcome(snapshot, mark, &self.params);
                if underwater.fee_to_fund > 0 {
                    self.fund.deposit(underwater.fee_to_fund);
                    report.fund_deposits = report
                        .fund_deposits
                        .saturating_add(underwater.fee_to_fund);
                }
                let withdraw = self.fund.withdraw_shortfall(underwater.shortfall_to_fund);
                let (paid, unfilled) = match withdraw {
                    WithdrawOutcome::Covered { amount } => (amount, 0),
                    WithdrawOutcome::PartiallyDrained { amount, unfilled } => {
                        (amount, unfilled)
                    }
                    WithdrawOutcome::Depleted { unfilled } => (0, unfilled),
                };
                report.fund_withdrawals = report.fund_withdrawals.saturating_add(paid);
                report.unfilled_deficit = report.unfilled_deficit.saturating_add(unfilled);
                CloseOutcomeKind::Underwater(underwater)
            };

            report.records.push(LiquidationRecord {
                account: snapshot.account,
                close_order,
                classification,
                outcome,
            });
        }

        report
    }
\`\`\`

本体をフェーズごとに walk する。

#### フェーズ 1: 分類（loop 内冒頭 5 行）

\`\`\`rust
let classification = margin_health(snapshot, mark, &self.params);
match classification {
    MarginHealth::Safe | MarginHealth::AtRisk => continue,
    MarginHealth::Liquidatable | MarginHealth::Underwater => {}
}
\`\`\`

押さえる点が 3 つ:

1. **\`match\` は exhaustive で、compiler が enforce する。** レッスン6 の \`MarginHealth\` は variant がちょうど 4 つ。2 つの arm が 4 つすべてを cover する。明日誰かが 5 つ目の variant（例: \`LiquidatableButOnHold\`）を追加すると、この \`match\` は compile に失敗する。Build break が「どちら側に入れるか判断しろ」と促してくれる。**Non-exhaustive な代替案 — \`if !matches!(c, Liquidatable | Underwater) { continue; }\` — は新しい variant を黙って skip 扱いし、設計上の判断を隠してしまう。**
2. **Work-path の arm は \`{}\`、body がない。** Arm は exhaustiveness を成立させる *ためだけに* 存在する。実際の仕事は \`match\` の後に起きる。これが「filter して関数の残りに fall through」の Rust イディオムだ。**\`match\` 内の空 arm が exhaustiveness check 後の fall-through の書き方だ。**
3. **Or-pattern（\`Safe | AtRisk\`）が 2 つの skip ケースを 1 つの arm に統合する。** レッスン9 の proptest が使ったのと同じトリック（\`Covered { amount } | PartiallyDrained { amount, .. }\`）が variant grouping のためにここで再登場する。**Or-pattern は Rust の exhaustive-match コードの rhythm だ。**

フェーズ 2 に進む前に、フェーズ 1 の \`match\` とフェーズ 2 の flat-check が一緒に作る rejection-ladder の構造を一度立ち止まって眺める。どちらの guard も loop body の先頭に住み、発火すれば *iteration から exit する*。Happy path はその下を、\`if\` にネストされることなく、guard と同じ indent level で走る:

\`\`\`
   アカウントスライス ─┐
                       │
                       ▼
             [フェーズ 1: margin_health]
                       │
                       ├─ Safe / AtRisk ──────→ continue（次の iteration へ）
                       │
                       ▼ Liquidatable / Underwater
             [フェーズ 2: defensive な flat-check]
                       │
                       ├─ size == 0 ──────────→ continue（次の iteration へ）
                       │
                       ▼ size != 0
             ── happy path（ネストなし） ──
             フェーズ 3-6: close order、routing、fund mutation、record の push
\`\`\`

2 つの rejection 分岐は iteration の *外へ* 分かれていく。Happy path のコードは indent level 1 つで平らに留まる。**パターンは「先頭で filter、その下で仕事、間にネストなし」だ。**

#### フェーズ 2: Defensive な flat-skip（7-13 行）

\`\`\`rust
if snapshot.position_size.0 == 0 {
    continue;
}
\`\`\`

これは *理論上は不可能な* 状態に対する defensive guard だ。flat position がここに到達する唯一の道は、\`margin_health\` が \`Liquidatable\` または \`Underwater\` に misclassify することだ — レッスン6 の分類ルールはそれを禁じている（flat → ratio MAX → \`Safe\`）。だが bridge は sanitize されていない snapshot を submit しうる。そして レッスン7 の \`close_order_spec\` は zero-qty な \`CloseOrderSpec\` を生み、CLOB が reject する。**Skip は安価な defensive coding — *enforce で消せない上流のバグから downstream consumer を守る*。**

#### フェーズ 3: Close order の生成（15 行）

\`\`\`rust
let close_order = close_order_spec(snapshot);
\`\`\`

1 行。レッスン7 の pure 関数がすべての仕事をする。**Liquidation参照実装（計算パート） 関数への 1 行呼び出しは、orchestration 層の「プリミティブを使う」の見かけだ。**

#### フェーズ 4: Routing 判断（17-24 行）

\`\`\`rust
let notional = notional_value(snapshot, mark);
let fee_desired = liquidation_fee(notional, &self.params);
let post_close_equity = account_equity(snapshot, mark);

let outcome = if post_close_equity >= fee_desired {
    // ... solvent 分岐
} else {
    // ... underwater 分岐
};
\`\`\`

押さえる点が 5 つ:

1. **Predicate は レッスン10 の \`underwater_close_outcome\` \`debug_assert!\`（\`equity < fee\`）の正反対。** レッスン10 の assertion は「underwater は equity < fee」と言った。ここでは \`>=\` で solvent に当たる。Scanner の runtime check が レッスン10 の compile-time 契約と揃う。**Scanner は レッスン10 が document していない数学を *何もしていない*。**
2. **Predicate の前に 3 つのローカル変数（\`notional\`、\`fee_desired\`、\`post_close_equity\`）。** どれも名前付き、どれも 1 行、どれも既存の関数呼び出し。読者は local-variable cascade を下って predicate に到達する頃には、両側に何があるか正確に把握している。**ローカルに名前付けした中間値は、最も安い readability の勝利。**
3. **\`solvent_close_outcome\` と \`underwater_close_outcome\` は各分岐で *別々* に呼ばれる — 1 つの routed call に統合されない。** 統合した形（\`let outcome = if is_solvent { solvent_close_outcome(...) } else { underwater_close_outcome(...) }\`）は、*もう一方* の分岐で precondition 違反で呼び出されることになり、レッスン10 の \`debug_assert!\` を発火させる。別々の分岐に置けば、各 callee は自分の precondition と一貫した状態で呼ばれる。**Dispatch を call から分離する。各 callee が precondition を clean に満たした状態で呼ばれる。**
4. **ローカル変数 \`outcome\` は \`if\`/\`else\` 内で代入され、その後で使われる。** \`let outcome = if ... { ... } else { ... };\` パターン。Rust の if-as-expression が値を返すので、これは idiomatic だ。**\`let x = if y { a } else { b };\` が、Rust で値を条件付き計算する書き方だ。**
5. **両分岐とも \`CloseOutcomeKind\` variant を返す。** 2 variant は同じ parent type を共有する。\`if\`/\`else\` の型がきれいに揃う。**同じ enum の 2 variant を返す \`if\`/\`else\` は、variant routing で最も安全なパターン。**

#### フェーズ 5a: Solvent 分岐（3 行）

\`\`\`rust
let solvent = solvent_close_outcome(snapshot, mark, &self.params);
self.fund.deposit(solvent.fee_to_fund);
report.fund_deposits = report.fund_deposits.saturating_add(solvent.fee_to_fund);
CloseOutcomeKind::Solvent(solvent)
\`\`\`

押さえる点が 3 つ:

1. **\`fee_to_fund\` は 3 回読まれる: \`deposit\` に 1 回、aggregate に 1 回、\`CloseOutcomeKind::Solvent\` に move された \`solvent\` の一部として 1 回。** \`SolventClose\` が \`Copy\` なので、これは無料 — clone なし、borrow なし。**\`Copy\` 派生型は、フィールドを複数 write にまたがって広げる際に ownership の儀式を不要にする。**
2. **\`fee_to_fund == 0\` 条件がない。** Solvent close は常に positive な \`fee_to_fund\` を持つ（レッスン10 の契約より — precondition が \`equity >= fee\` で、fee は positive）。ここに \`if solvent.fee_to_fund > 0 { ... }\` を書くと、保証された false-or-impossible 条件をチェックする。**型契約がすでに排除した条件には defend しない。**
3. **\`withdraw_shortfall\` の呼び出しがない。** Solvent close は fund に credit して trader に residual を返す。Fund から *引かれることはない*。Trader balance の credit は bridge の仕事だ（\`solvent.residual_to_account\` を使う）。Scanner のスコープ外。**Scanner は fund だけを mutate する。Trader balance は bridge の仕事。**

#### フェーズ 5b: Underwater 分岐（8 行）

\`\`\`rust
let underwater = underwater_close_outcome(snapshot, mark, &self.params);
if underwater.fee_to_fund > 0 {
    self.fund.deposit(underwater.fee_to_fund);
    report.fund_deposits = report
        .fund_deposits
        .saturating_add(underwater.fee_to_fund);
}
let withdraw = self.fund.withdraw_shortfall(underwater.shortfall_to_fund);
let (paid, unfilled) = match withdraw {
    WithdrawOutcome::Covered { amount } => (amount, 0),
    WithdrawOutcome::PartiallyDrained { amount, unfilled } => (amount, unfilled),
    WithdrawOutcome::Depleted { unfilled } => (0, unfilled),
};
report.fund_withdrawals = report.fund_withdrawals.saturating_add(paid);
report.unfilled_deficit = report.unfilled_deficit.saturating_add(unfilled);
CloseOutcomeKind::Underwater(underwater)
\`\`\`

押さえる点が 6 つ:

1. **\`if underwater.fee_to_fund > 0\` guard を入れている理由は、レッスン10 の \`underwater_close_outcome\` が \`fee_to_fund == 0\` を返しうるからだ**（「already underwater pre-fee」サブケース）。\`deposit(0)\` は レッスン8 より no-op だが、guard が \`saturating_add\` と関数呼び出しのオーバーヘッドを省く。**「何もしない」アクションを gate する predicate は安価な正しさ。**
2. **\`WithdrawOutcome\` への pattern-match が \`(paid, unfilled)\` に分解する。** 3 variant すべてが 1 つのタプル shape に collapse する:

   - \`WithdrawOutcome::Covered { amount }\` → \`(amount, 0)\`: 要求された shortfall が全額支払われた。escalate なし。
   - \`WithdrawOutcome::PartiallyDrained { amount, unfilled }\` → \`(amount, unfilled)\`: fund は持っていた全額を支払い、残りはプロトコルレベルの unfilled deficit として記録される。
   - \`WithdrawOutcome::Depleted { unfilled }\` → \`(0, unfilled)\`: fund はすでに空。支払いはゼロ、要求の全額が escalate する。

   保存則 \`amount + unfilled = requested_shortfall\` は 3 行すべてで成立する（レッスン9 の proptest が証明した）。レッスン13 でこの法則が per-call レベルから per-scan レベルに \`report_unfilled_equals_sum_of_unfilled_shortfalls\` で持ち上がる。**タプルは レッスン9 variant payload の *正規化形* — 3 つの異なる shape が 1 つの \`(i64, i64)\` に collapse し、保存則が引き継がれる。**
3. **Match の arm は間接的に *or-pattern destructuring* を使う。** 厳密には 3 つの別個の arm だが、各 arm が同じタプル shape \`(paid, unfilled)\` を計算する。視覚的な symmetry がコードの scan を楽にする。**統一された出力型を計算する pattern-match arm は視覚的に並列だ — 揃えて並べる。**
4. **\`paid\` と \`unfilled\` は即座に \`saturating_add\` で report に consume される。** Variant ごとの集計が 2 行で起きる。Match → タプル → aggregate のカスケードが、crate を貫く標準の「enum-to-scalar」パターンだ。**レッスン9 の \`WithdrawOutcome\` は *情報* を返す。Scanner はそれを *数字* に変換する。**
5. **\`fund_withdrawals\` と \`unfilled_deficit\` の両方に \`saturating_add\`。** Running total は両方とも現実的なプロトコル規模（最大 ~$10^15）で bound されているとはいえ、saturation は一貫した規律だ。**全所で saturating な算術はコスト 0、決定性の契約を一貫して尊重する。**
6. **最後の行 — \`CloseOutcomeKind::Underwater(underwater)\` — \`underwater\` を enum に move する。** \`underwater\` がフィールド読み出し後に consume される唯一の場所だ。\`UnderwaterClose\` は \`Copy\` なので、move はただの value-copy。**\`Copy\` 型なら「フィールドを read してから enum に move」は実質コスト 0 だ。**

#### フェーズ 6: Record を push（26-30 行）

\`\`\`rust
report.records.push(LiquidationRecord {
    account: snapshot.account,
    close_order,
    classification,
    outcome,
});
\`\`\`

Struct construction は直接的: 4 フィールドそれぞれが scope 内のローカル。**毎 iteration の終わりに 1 push。** これが \`scan\` が record ごとにする唯一の allocation だ（\`Vec\` が grow することはあるが、push 自体は tail allocation）。**Per-iteration allocation は record 数で bound される。Scratch allocation なし。**

> 🛑 **やりがちな勘違い。** 「なぜ for-loop が index や \`iter()\` を使うのか? \`iter().filter_map(...).collect()\` のほうが idiomatic ではないか?」 問題が 2 つ。(1) \`self.fund\` を mutate する closure に対する \`filter_map\` は、iterator chain 全体で \`self\` を排他 borrow し、closure capture と衝突する。Rust の borrow checker は major refactor なしにこれを reject する（interior mutability か、fund を切り出すか）。(2) compile が通っても、iterator chain は per-iteration の side effects（deposit、withdraw、aggregate-add）を \`map\` closure 内に隠す。「この iteration が fund を mutate した」を読者は簡単に見られない。**\`&mut self\` を capture する for loop は、本体が enclosing self を mutate するとき iterator chain に勝つ。**

### Step 2: Test モジュールの足場を追加

\`scanner.rs\` の末尾に test モジュールを追記する。足場は 3 つの部分: imports、helpers、最初のセクション区切り。

\`\`\`rust
#[cfg(test)]
mod tests {
    use super::*;
    use openhl_funding::{Notional, PositionSize};
    use proptest::prelude::*;

    fn snapshot(account: u64, size: i64, entry: u64, collateral: i64) -> AccountSnapshot {
        AccountSnapshot {
            account: AccountId(account),
            position_size: PositionSize(size),
            avg_entry: MarkPrice(entry),
            collateral: Notional(collateral),
        }
    }

    fn default_params() -> LiquidationParams {
        LiquidationParams::hyperliquid_default()
    }

    // ─── empty / non-liquidatable input ────────────────────────────
\`\`\`

押さえる点が 3 つ:

1. **レッスン12 に proptest がないのに \`use proptest::prelude::*;\` を import する。** レッスン13 用に staged。レッスン11 の \`account_equity\` import と同じ staging 規律だ。**本コースのテストは *forward-compatibly* に書かれている — レッスン12 の \`use\` ブロックは レッスン13 の \`use\` ブロックだ。**
2. **\`snapshot\` ヘルパーが 4 フィールドを \`AccountSnapshot\` 構造体全体に packaging する。** レッスン4 の \`compute::tests::snapshot\` ヘルパーを mirror（同じ名前、同じ return type）。これで各テストの最初の行が読みやすく保たれる: \`let s = snapshot(1, 1, 100_000, 50_000);\` は「account 1、long 1 BTC、entry $100k、collateral $50k」と読める。**Test ヘルパーは無関係な構築ノイズを隠す価値がある。代替案は test 1 件あたり 8 行になる。**
3. **セクション区切り \`// ─── empty / non-liquidatable input ───\` が レッスン8/レッスン9 で確立したスタイルに合う。** Liquidation コースのテストファイルは罫線文字区切りを一貫して使う。**モジュール間で一貫したテストファイル構造は、小さいが累積する readability の勝利だ。**

### Step 3: 4 つの simple unit test を追加

Test モジュール内に追記:

\`\`\`rust
    #[test]
    fn scan_empty_accounts_returns_empty_report() {
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&[], MarkPrice(100));
        assert!(report.records.is_empty());
        assert_eq!(report.fund_deposits, 0);
        assert_eq!(report.fund_withdrawals, 0);
        assert_eq!(report.unfilled_deficit, 0);
    }

    #[test]
    fn scan_all_safe_accounts_does_nothing() {
        // Long 1 @ $100k, $50k collateral, mark $100k → 50% ratio = Safe.
        let accts = vec![
            snapshot(1, 1, 100_000, 50_000),
            snapshot(2, 1, 100_000, 50_000),
        ];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(100_000));
        assert!(report.records.is_empty());
    }

    #[test]
    fn scan_atrisk_does_not_liquidate() {
        // Long 1 @ $100k, $5k collateral, mark $100k → 5% ratio
        // 5% > 2% maintenance, < 10% initial → AtRisk; no liquidation.
        let accts = vec![snapshot(1, 1, 100_000, 5_000)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(100_000));
        assert!(report.records.is_empty());
    }

    #[test]
    fn scan_skips_flat_positions() {
        // Flat (size 0) accounts misclassified somewhere upstream get
        // silently skipped. Default ratio for flat positions is MAX
        // (Safe), so this is also defensive against future
        // classification changes.
        let accts = vec![snapshot(1, 0, 100_000, 1_000)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(100_000));
        assert!(report.records.is_empty());
    }
\`\`\`

テスト設計で押さえる点が 8 つ:

1. **\`scan_empty_accounts_returns_empty_report\` は \`ScanReport\` *4 フィールドすべて* を assert する。** Records empty、3 つの aggregate が 0。4 つの assertion が「\`ScanReport::default()\` が全 0 でなくなる」future bug を捕える — logic bug よりさらに小さい regression だ。**Default-state テストは default のすべてのフィールドを assert する。**
2. **\`scan_all_safe_accounts_does_nothing\` はアカウントを *2 件* 使う、1 件ではない。** なぜ 2 件か。1 件のテストは「loop は最初の iteration を走らせたが 2 回目を skip した」bug を mask しうる。2 件あれば loop は 2 回 iterate を強制され、両方とも何も生まない。**Multi-account skip テストは single-account skip テストよりも loop-control bug を捕まえる。**
3. **\`scan_all_safe_accounts_does_nothing\` の算術コメントが期待される分類を document する。** 「50% ratio = Safe」と書いておけば、読者は レッスン1-レッスン6 のロジックを再導出せず頭の中で追える。**分類パスを名指す test コメントが、本コースの curriculum reinforcement の起き方だ。**
4. **\`scan_atrisk_does_not_liquidate\` は 4 つのうち *最も pedagogical に重要*。** 「AtRisk は *warning state* であって *trigger state* ではない」を確立する。将来の maintainer が AtRisk を liquidation trigger に「promote」したら（match arm に追加して）、このテストが即座に落ちる。**安定したアーキテクチャ境界に対するテストは、本コースの設計選択が refactoring を生き延びる方法だ。**
5. **\`scan_atrisk_does_not_liquidate\` の 5% 境界は maintenance margin（2%）と initial margin（10%）に *意図的に* 近い。** 1%（< maintenance）なら Liquidatable、15%（> initial）なら Safe。5% は *中間* で、AtRisk 境界の両側がここからテストできる。**境界テストは分類の *エッジ* だけでなく *内部* を exercise する値を選ぶ。**
6. **\`scan_skips_flat_positions\` は \`snapshot(1, 0, 100_000, 1_000)\` を使う。** \`size = 0\` に注目 — flat ケース。レッスン6 の \`margin_ratio\` が flat ポジションに MAX を返す（Safe と分類されてフェーズ 1 \`continue\` で skip）にもかかわらず、テストはフェーズ 2 の defensive guard を exercise する。将来の変更が flat を Liquidatable に promote する *場合に備えて* だ。**Defense-in-depth テストは、第 1 層から独立して第 2 層の防御を verify する。**
7. **4 つのテストすべてが \`LiquidationScanner::with_empty_fund(default_params())\` を使う。** Starting fund balance なし、Hyperliquid のデフォルト params。一貫性が読者に「4 つすべてを通して読み、*差分* だけを吸収する」を許す（accounts、mark）。**Per-test の isolation が test 間の diff を一目で読ませる。**
8. **テスト名が 4 ステップの narrative を成す:** empty → all-Safe → all-AtRisk → flat。「scan が何を skip するか」を学ぶ読者は順番に walk して完全な mental model を構築する。**Test ordering は教育的な progression を encode できる。**

### Step 4: テストを走らせる

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

期待される出力（短縮版）:

\`\`\`
running 59 tests
test compute::tests::close_flat_has_zero_qty ... ok
... (L0-レッスン10 由来の compute テストがさらに 33 個)
test insurance::tests::balance_never_negative ... ok
... (レッスン8-レッスン9 由来の insurance テストがさらに 20 個)
test scanner::tests::scan_all_safe_accounts_does_nothing ... ok
test scanner::tests::scan_atrisk_does_not_liquidate ... ok
test scanner::tests::scan_empty_accounts_returns_empty_report ... ok
test scanner::tests::scan_skips_flat_positions ... ok

test result: ok. 59 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**59 テスト pass。Scanner が *runnable* になった。** レッスン13 で 5 個の nuanced unit test（solvent fee deposit、underwater fully/partially/depleted、mixed batch、FIFO fairness）と 4 個の proptest（scan 全体にわたる保存則）が stress テストを担う。レッスン13 後は 68 件。

エラー時にありがちなパターン:

- **Compile エラー: \`cannot find function \\\`account_equity\\\` in this scope\`** — レッスン11 の imports は compute 関数 6 つを staged にした。どれか 1 つでも忘れた（または unused-import 警告を消そうとして実際必要な import を削った）と、\`scan\` は compile しない。\`scanner.rs\` 冒頭の \`use crate::compute::{...}\` 行から欠けた関数を再追加する。
- **テスト失敗: \`assertion failed: report.records.is_empty()\` on \`scan_all_safe_accounts_does_nothing\`** — あなたの \`margin_health\` が 50% ratio を mis-classify している。レッスン6 は 50% > 10% initial = Safe と言った。\`match\` arm が \`MarginHealth::Safe | MarginHealth::Liquidatable\`（typo）と書かれていると、Safe が liquidate される。\`match\` の arm 1 を読み直す。
- **テスト失敗: \`report.fund_deposits != 0\` on \`scan_empty_accounts_returns_empty_report\`** — \`ScanReport::default()\` の derivation が間違っている。\`derive(Default)\` on \`ScanReport\` がこのテストを green にする。\`impl Default\` を手動で非 0 のデフォルトと書くと契約が壊れる。
- **Compile エラー: \`the trait bound \\\`SomeType: Copy\\\` is not satisfied\`** — \`outcome = if ... { ... }\` の分岐のどこかに、compiler が non-\`Copy\` だと考える型がある。\`SolventClose\` と \`UnderwaterClose\` の両方が \`#[derive(Clone, Copy, Debug, PartialEq, Eq)]\` を持つか確認する（レッスン10 から持っているはず） — もし持っていなければ、これらの variant を返す \`if\`/\`else\` がそれを要求する。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **\`scan\` メソッドは *thin orchestrator* であって、*fat coordinator* ではない。** \`scan\` のすべての行は、Liquidation参照実装（計算パート）／Liquidation参照実装（保険基金パート） プリミティブを呼ぶか、\`ScanReport\` フィールドへの \`saturating_add\` を apply するかのどちらかだ。新しい数学なし、新しいポリシーなし、新しいデータ shape なし。**Orchestration 層はプリミティブを呼ぶべきだ。複製してはいけない。**

2. **Exhaustive \`match\` が predicate-with-\`!\` に勝つ。** フェーズ 1 の \`MarginHealth\` \`match\` こそが、将来の enum-variant 追加を捕まえる規律だ。\`if !matches!(c, Liquidatable | Underwater) { continue; }\` と書いたら、明日 5 つ目の variant が追加されたとき、それを黙って skip 扱いしてしまう。**Exhaustive \`match\` が、enum とその consumer を refactor 越しに同期させる方法だ。**

3. **\`WithdrawOutcome → (paid, unfilled)\` タプル分解は、レッスン9 の enum が orchestration handling で 1 行を超える *唯一の場所*だ。** 3 variant が 1 つの \`(i64, i64)\` に collapse する。集計契約が統一されているからだ。**レッスン9 の \`WithdrawOutcome\` は情報を返す。Scanner はそれを数字に変換する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
\`\`\`

レッスン12 の後:
- **scanner.rs** は Liquidation参照実装（スキャナパート） の \`scanner.rs\` の **test モジュール内 \`scan_skips_flat_positions\` テストまで一致**。具体的には: doc + imports + \`CloseOutcomeKind\` + \`LiquidationRecord\` + \`ScanReport\` + \`LiquidationScanner\` 構造体 + 5 個の accessor + \`scan\` メソッド + test モジュール足場 + 4 個の simple unit test。レッスン13 で 5 個の nuanced unit test と 4 個の proptest が着地する。

## よくある質問

**Q1: なぜ \`scan\` は \`&mut [AccountSnapshot]\` ではなく \`&[AccountSnapshot]\` を取るのか? Scanner は snapshot に書く必要がないが。**

Scanner は snapshot に書く必要が *ない* — まさにそれが理由だ。\`&[T]\`（immutable slice）は「私は read-only でこのスライスを consume する」と告げる。\`&mut [T]\`（mutable slice）は「scanner は snapshot を mutate しうる」と暗示してしまう。実際にはしないし、するべきでもない。**呼び出し側の便宜ではなく、関数のニーズに合う borrow を選ぶ。** Caller（bridge）は他所で \`accounts\` を mutable に所有していても、\`&accounts[..]\` で渡せる。

**Q2: なぜ \`scan\` は \`MarkPrice\` を値で取るのに、内部で \`&self.params\` は reference で渡すのか?**

\`MarkPrice\` は 1 フィールドの \`Copy\` 構造体 — 値渡しが無料だ。\`LiquidationParams\` は 3 フィールドの \`Copy\` 構造体で、scanner がすでに所有している。\`&self.params\` を渡せば struct コピーが避けられる。要はコピーコストの話だ。小さい \`Copy\` 型は値で、大きめの \`Copy\` 型は reference で渡す。**\`Copy\` 型は小さいなら値、大きいなら reference で渡す。**

**Q3: \`for snapshot in accounts\` loop を \`accounts.iter().enumerate().for_each(|(i, snap)| ...)\` で置き換えて iteration index を track できないか?**

できる、ただし index は要らない。\`LiquidationRecord\` は snapshot から \`account: AccountId\` を運ぶ。これが downstream consumer にとっての *durable* な identifier だ。Iteration index は synthetic ID（スライス内の positional）で、下流には何も意味しない。**Identifier はドメインで意味を持つべきで、iteration の positional であってはならない。**

**Q4: \`scan\` は loop body の後に「fund が完全に depleted」状態に達したら early-return しないのか?**

しない。レッスン11 の設計契約が aggregate フィールドに「scan 中に起きたすべて」を capture すると言っているからだ。depletion 後の underwater close も含む。Early return は audit trail を切る。Iteration position 50 にいる Liquidatable アカウントが \`LiquidationRecord\` を生まなくなり、bridge はそれを見落とす。**Scan は fund が空になっても batch を完了する。Aggregate な \`unfilled_deficit\` が、より aggressive なポリシー（ADL）が必要だと bridge に告げる signal だ。**

**Q5: スライス内の 2 つの snapshot が同じ \`AccountId\` を持っていたら?**

Scanner は iteration 順に処理する。1 つ目の \`LiquidationRecord\` と fund-mutation が先に着地、2 つ目が後に着地。Deduplication なし。これは *設計上* そうだ。scanner は bridge が決定的で dedup された slice を渡してくれると信頼する。Duplicate-account の挙動は bridge bug であって scanner bug ではない。**Caller が制御する invariant は caller に任せる。**

**Q6: 本体は \`report.fund_deposits = report.fund_deposits.saturating_add(...)\` を使う。\`report.fund_deposits += ...\` ではダメか?**

\`+=\` 演算子の挙動はビルドプロファイルで変わる: **debug ビルドでは overflow に panic、release ビルドではサイレントに *wrap*（2 の補数の剰余演算）する**。Release-build の wrap こそが本当のコンセンサス上の危険だ — クラッシュしないので、1 つの validator で overflow した加算が静かに他と異なる \`i64\` を生む。結果は state の不一致 → チェーンフォーク。Debug の panic は分かりやすい failure mode、release の silent wrap は *騙される* failure mode だ。\`saturating_add\` はどんなビルドプロファイルでも \`i64::MAX\`（または \`i64::MIN\`）に clamp する。全 validator が同じ値を見る — どんなコンパイラフラグでビルドされていても。**\`+=\` は非コンセンサスの算術なら OK。\`saturating_add\` は validator が byte-for-byte で agree しなければならない state の標準だ。**

## 次のレッスン (レッスン13) — セクション4 capstone: 5 個の nuanced unit test + 4 個の proptest

レッスン13 が セクション4 を閉じる — そして Liquidation参照実装（スキャナパート） を閉じる — そして openhl の Liquidation 実装 全体を閉じる。5 個の nuanced unit test は:
- \`scan_liquidatable_solvent_deposits_fee\` — happy path: trader の collateral がすべてを cover する。
- \`scan_underwater_fully_covered_drains_fund_partially\` — fund が drain するが cover する。
- \`scan_underwater_partial_drain_surfaces_unfilled\` — fund が partial drain、shortfall の一部が escalate。
- \`scan_underwater_depleted_fund_escalates_full_shortfall\` — fund が既に空。
- \`scan_first_underwater_gets_paid_then_second_unfilled\` — 複数の underwater アカウントでの FIFO fairness。

そして \`scan_mixed_batch_processes_only_unhealthy\` で loop が heterogeneous な batch を扱えるか verify する。

4 個の proptest は scan 全体にわたる保存則を verify する:
- \`fund_balance_never_negative_across_scans\` — レッスン8 の不変条件が multi-account scan に拡張する。
- \`report_unfilled_equals_sum_of_unfilled_shortfalls\` — \`unfilled_deficit\` が per-account unfilled 量と一致する。
- \`fund_deposits_minus_withdrawals_equals_balance_change\` — fund 会計が閉じる。
- \`scan_preserves_account_order_in_records\` — 決定性: records が input 順に現れる。

レッスン13 後、Liquidation crate は *完成* する — 68 テスト、\`0a8464e\` と byte-for-byte 一致。読者は pure-compute + state-machine + orchestration cascade をまるごと 13 レッスンで構築した。
`,
                },
                {
                  title: "レッスン 13 — Scanner capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Liquidation三部作の振り返り",
                  slug: "openhl-liquidation-scanner-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン 13 — Scanner capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Liquidation三部作の振り返り

## ゴール

このレッスンで掴む概念:

- **6 個の nuanced unit test は 4×2 行列を成す。** 4 つの outcome（solvent-close、fully-covered-underwater、partial-drain-underwater、depleted-underwater）× 2 つの batch shape（single-account-batch、multi-account-batch）。Mixed-batch test が明示的な 4-state 証明、FIFO test が multi-underwater の fairness 証明。**両者を合わせれば、レッスン6 分類・レッスン10 close-outcome・レッスン8/レッスン9 fund 操作の間で reachable なすべての相互作用が exercise される。**
- **4 個の proptest は型システムが encode できない不変条件を encode する。** Fund 会計が閉じる（\`before + deposits − withdrawals = after\`）。Unfilled deficit が存在すれば fund は空（\`unfilled > 0 ⇒ balance == 0\`）。Record 数は input 数で bound される（\`|records| ≤ |accounts|\`）。決定性が成立する（\`scan(同じ入力) ≡ scan(同じ入力)\`）。**いずれも scanner が、あらゆる scan・あらゆる block・あらゆる validator で守らねばならない契約だ。**
- **保存則は crate を縦に compose する。** 3 つの層、3 つの恒等式、1 つの数学的物語:

  \`\`\`
  レッスン9  (single fund call):       amount + unfilled                    = shortfall
  レッスン10 (single position close):  fee_to_fund + residual_to_account    = post_close_equity
  レッスン13 (per-block scan batch):   balance_before + Σ deposits − Σ withdrawals = balance_after
  \`\`\`

  **各層の保存則が次の層の invariant に consume される。Crate の数学が閉じる。**
- **Liquidation実装は「計算パート・保険基金パート・スキャナパート」の3段構成だ。** Liquidation参照実装（計算パート）（margin math）は pure-compute な分類器を構築した。Liquidation参照実装（保険基金パート）（insurance fund + close-outcome 分解）は state と credit/debit 分解を導入した。Liquidation参照実装（スキャナパート）（multi-account scanner）が両者を 1 つの orchestration loop で結ぶ。**レッスン13 が trilogy を閉じる。69 テスト、4 modules、\`0a8464e\` と byte-for-byte 一致。**

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 69 テストが pass する（compute 34 + insurance 21 + scanner 14 = 10 unit + 4 proptest）。Liquidation crate が Liquidation参照実装（スキャナパート） 答え合わせに対して *完成* する。

> **テスト数についての注記:** レッスン11 と レッスン12 の次レッスン preview で「68 件」と書いたが、off-by-one だった。実際の レッスン13 は 6 個の nuanced unit test を加える（5 個ではない）。FIFO-fairness test が mixed-batch test とは別の独立した test だからだ。正しい合計は 69 件。（カスケード数学の推論には影響しない。）

具体的な変更:

- **\`src/scanner.rs\`。** レッスン12 の 4 個の simple test の後ろに 6 個の nuanced unit test、test モジュールの末尾に 4 個の invariant proptest を含む \`proptest!\` ブロックを追加。

レッスン13 後、Liquidation コースは完成する。ADL参照実装パート（ADL）は openhl の次のロードマップ項目だが、別コースになる。

## おさらい

レッスン12 の後:
- \`scanner.rs\` には型語彙（レッスン11）、\`scan\` メソッド（レッスン12）、skip path を扱う 4 個の simple unit test が揃う。
- \`cargo test\` は 59 テストを走らせ、すべて green。
- Scanner は *動く* — iterate し、classify し、dispatch し、mutate し、aggregate し、return する。だがこれまでのテストがカバーするのは「skip」ケースだけ。4 つの「work」outcome — solvent、fully-covered、partial-drain、depleted — には per-scan の assertion がまだない。

レッスン13 でそのギャップを埋め、不変条件を proptest で lock し、Liquidation三部作の振り返り で一歩引いて全体を眺める。

## 計画

編集は 3 つ:

1. **既存の \`#[cfg(test)] mod tests\` ブロックに 6 個の nuanced unit test を追記する。**
2. **Test モジュールの末尾に \`proptest!\` ブロックを追記する。** 4 つの invariant プロパティ。
3. **\`cargo test\` で verify する。** このコミット後、Liquidation crate は \`0a8464e\` と byte-for-byte 一致する。

> 🛑 **予測。** 続きを読む前に考えてほしい。1 件の liquidation が引き起こす「fund state の遷移」を 4 つ挙げ、それぞれを駆動する \`WithdrawOutcome\` variant または \`deposit\` 呼び出しとペアにする。次に: それらのうち *どれが* \`Solvent\` 入力（\`Liquidatable && post_close_equity ≥ fee\`）では起こり得ないか?

（答え: **4 つの遷移**は (a) \`+fee\` のみ（solvent close — \`deposit\`、withdraw なし）、(b) \`+fee_partial − shortfall_full\`（positive equity を持つ underwater — \`deposit\` + \`Covered\` を返す \`withdraw_shortfall\`）、(c) \`0 − shortfall_partial\`（既に underwater で fund が partial drain — \`PartiallyDrained\` を返す \`withdraw_shortfall\`）、(d) \`0 − 0_with_unfilled\`（fund が空の underwater — \`Depleted\` を返す \`withdraw_shortfall\`）。**遷移 b、c、d は Solvent 入力では起こり得ない。** レッスン10 の \`debug_assert!\` が発火する。Solvent 入力は遷移 (a) だけを駆動する。**4 つの nuanced unit test が遷移 a、b、c、d を exercise する。5 つ目（mixed batch）と 6 つ目（FIFO）が、orchestration loop が multi-account batch を正しく処理するかを verify する。**）

Scan-coverage 行列:

\`\`\`
   ┌─────────────────────────────────────────────────────────────┐
   │  Test coverage 行列 — Liquidation参照実装（スキャナパート）                                │
   ├─────────────────────────────────────────────────────────────┤
   │                                                              │
   │  4 outcome × 2 batch shape:                                  │
   │                                                              │
   │                  single account     multi-account            │
   │                  ──────────────     ──────────────           │
   │  Solvent         #1 ✓                (mixed でカバー)         │
   │  Covered uw      #2 ✓                                        │
   │  Partial uw      #3 ✓                #6 ✓ (FIFO fairness)    │
   │  Depleted uw     #4 ✓                                        │
   │                                                              │
   │  Mixed-batch     —                   #5 ✓ (4 health states)  │
   │                                                              │
   │  Proptest（cross-cutting）:                                  │
   │  ────────────────────────                                    │
   │  #1 fund_balance_delta_matches_report                        │
   │  #2 unfilled_implies_empty_fund                              │
   │  #3 records_count_bounded_by_accounts                        │
   │  #4 scan_is_deterministic                                    │
   │                                                              │
   └─────────────────────────────────────────────────────────────┘
\`\`\`

行列で押さえる点が 2 つ:

1. **Single-account 列が 4 つの outcome すべてを cover し、multi-account 列は *interesting な複合ケース*（混在 health state + FIFO fairness）だけを cover する。** 「multi-account Solvent」test は要らない。Per-account の挙動は両列で同じだからだ。Orchestration loop は iteration 2 でも iteration 1 と同じ動きをする。**多重性が導入されたときの *新しい* 振る舞いをテストする。すでに証明されたものを繰り返さない。**
2. **4 個の proptest は *cross-cutting* — すべての outcome、すべての batch shape に適用される。** だから行列に入らない。直交している。**Unit test は特定の点を verify する。Proptest は全点の *形* を verify する。**

## 手を動かす walk-through

### Step 1: 6 個の nuanced unit test を追加

既存の \`#[cfg(test)] mod tests\` ブロック内、レッスン12 の 4 個の simple test の後に 6 個の nuanced ケースを追記する。テストは single-vs-multi-account と outcome でグルーピングしてある。

#### Test 1: Solvent close が fee を deposit

\`\`\`rust
    // ─── single Liquidatable: solvent close ────────────────────────

    #[test]
    fn scan_liquidatable_solvent_deposits_fee() {
        // size=1, entry=1_000, collateral=20, mark=999.
        //   notional=999; fee = 999 × 150 / 10_000 = 14
        //   pnl = -1; post_close_equity = 19
        //   ratio = 19 / 999 × 10_000 = 190 bps < 200 maint → Liquidatable
        //   post_close_equity (19) ≥ fee (14) → solvent close
        //   residual_to_account = 19 - 14 = 5
        let accts = vec![snapshot(7, 1, 1_000, 20)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(999));

        assert_eq!(report.records.len(), 1);
        let rec = &report.records[0];
        assert_eq!(rec.account, AccountId(7));
        assert_eq!(rec.classification, MarginHealth::Liquidatable);
        match rec.outcome {
            CloseOutcomeKind::Solvent(s) => {
                assert_eq!(s.fee_to_fund, 14);
                assert_eq!(s.residual_to_account, 5);
            }
            CloseOutcomeKind::Underwater(_) => panic!("expected Solvent"),
        }
        assert_eq!(report.fund_deposits, 14);
        assert_eq!(report.fund_withdrawals, 0);
        assert_eq!(report.unfilled_deficit, 0);
        assert_eq!(s.fund_balance(), 14);
    }
\`\`\`

押さえる点が 5 つ:

1. **コメントブロックが数学をプリミティブから step-by-step で walk する。** notional → fee → pnl → equity → ratio → 分類 → routing 判断 → 出力。失敗したテストを debug する読者は、このコメントを読んで snapshot の 4 入力から期待値を再導出できる。**数学を walk するコメントは、1 つの test を Liquidation参照実装（計算パート） + Liquidation参照実装（保険基金パート） パイプライン全体の worked example にする。**（バインド名についての細かい注記: テストは \`let mut s = LiquidationScanner::...\` を導入し、*さらに* \`match\` arm 内で \`CloseOutcomeKind::Solvent(s)\` を使って \`s\` を shadow している。Arm 内では \`s\` は \`SolventClose\` payload を指す。Arm が閉じた瞬間、外側の scanner \`s\` が再び scope に戻る — だからこそ 2 行後の \`s.fund_balance()\` が動く。これは意図的な Rust イディオムだ — match arm 内の shadowing は scope-bounded だ — が、新しい読者は二重 binding を正体として認識すべきだ。）
2. **選ばれた数字 — entry=1_000、collateral=20、mark=999 — は ratio（190 bps）が maintenance（200 bps）のすぐ下に着地する *境界ケース*。** 不等号を flip させた bug（\`>\` の代わりに \`>=\` など）が 190 を間違ったバケットに落とす。**境界の入力は、分類 predicate での off-by-one を捕える test を作る。**
3. **\`outcome\` への \`match\` は別 variant に \`panic!("expected Solvent")\` を使う。** 失敗メッセージは *期待する* variant を名指す。失敗ログを読む将来の読者には、どちらの分岐を狙ったかが即座に分かる。**Panic メッセージは「想定外の variant」ではなく「期待した variant」を名指す。**
4. **\`ScanReport\` の 4 フィールドすべて + \`fund_balance()\` を assert する。** Per-record の \`outcome\` がすでに含意していても、aggregate フィールドもチェックする。なぜか。レッスン11 の設計契約が aggregate を first-class と宣言した以上、集計の数学を破る regression は、per-record の分解を破るものとは別の bug クラスだからだ。**Aggregate フィールドと per-record フィールドは別々の assertion を得る。別々の invariant だからだ。**
5. **\`s.fund_balance() == 14\` で fund が実際に mutate したことを証明する** — report が claim しただけではない。Fund は *state* であり、derivation ではない。別途読み直すことで「report が嘘をついていない」を確認する。**State 変更は call 後の別 read を要する。それを describe する report は独自の assertion を要する。**

#### Test 2: Underwater、fund が完全 cover

\`\`\`rust
    // ─── single Underwater: fully covered by fund ──────────────────

    #[test]
    fn scan_underwater_fully_covered_drains_fund_partially() {
        // 1 BTC long, entry $100k, $10k collateral, mark $80,500 →
        // pnl = −19_500, equity = −9_500 → Underwater.
        // notional = 80_500, fee = 1_207, shortfall = 1_207 + 9_500 = 10_707.
        // Start fund with $20k — covers in full.
        let accts = vec![snapshot(1, 1, 100_000, 10_000)];
        let fund = InsuranceFund::new(20_000);
        let mut s = LiquidationScanner::new(default_params(), fund);
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.records.len(), 1);
        match report.records[0].outcome {
            CloseOutcomeKind::Underwater(u) => {
                assert_eq!(u.fee_to_fund, 0); // already underwater pre-fee
                assert_eq!(u.shortfall_to_fund, 10_707);
            }
            CloseOutcomeKind::Solvent(_) => panic!("expected Underwater"),
        }
        assert_eq!(report.fund_deposits, 0);
        assert_eq!(report.fund_withdrawals, 10_707);
        assert_eq!(report.unfilled_deficit, 0);
        assert_eq!(s.fund_balance(), 20_000 - 10_707);
    }
\`\`\`

押さえる点が 4 つ:

1. **Perp Primer レッスン3 シナリオが本コース 4 度目の再登場**: $100k entry、$10k collateral、$80,500 close、$19,500 PnL、$9,500 負 equity。数字は レッスン10 の \`fee_basic\`、レッスン10 の \`underwater_close_already_underwater_pre_fee\`、そしていま レッスン13 の scanner-level test を貫く。**Curriculum reinforcement は複利化する。レッスン13 までに読者は数字を再導出せずに認識する。**
2. **\`fee_to_fund == 0\`** — scanner レベルで確認する。レッスン10 の契約は「fee 前に負の equity → fee は徴収されない」と言った。レッスン13 では、契約が orchestration 層を通過しても保たれているかを verify する。**Cross-layer の契約テストは、orchestration が下位層の保証を *壊さない* かを verify する。**
3. **\`fund_deposits == 0\` AND \`fund_withdrawals == 10_707\`** — aggregate フィールドは *deposit ゼロ*（\`fee_to_fund == 0\` だから）と *full withdrawal*（fund が十分にあったから）を示す。2 つの aggregate が揃って完全な balance-flow の物語を描く。**Aggregate フィールドは bridge の read-once な telemetry。正確であるべき。**
4. **\`s.fund_balance() == 20_000 - 10_707\`** — scan 後の fund balance は input から計算し、リテラルとしては assert しない。こうすると test が self-documenting になる。読者は \`20_000 - 10_707\` を見て、各数字がどこから来たか分かる。**Assertion 内の算術式は、hardcoded リテラルよりもテスト自身を説明する。**

#### Test 3: Underwater、fund が partial drain

\`\`\`rust
    // ─── single Underwater: fund partially drained, deficit escalates ─

    #[test]
    fn scan_underwater_partial_drain_surfaces_unfilled() {
        // Same underwater account, but fund only has $5k — can't cover.
        let accts = vec![snapshot(1, 1, 100_000, 10_000)];
        let fund = InsuranceFund::new(5_000);
        let mut s = LiquidationScanner::new(default_params(), fund);
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.fund_withdrawals, 5_000); // drained to 0
        assert_eq!(report.unfilled_deficit, 10_707 - 5_000);
        assert_eq!(s.fund_balance(), 0);
    }
\`\`\`

押さえる点が 3 つ:

1. **Test 2 と同じ snapshot を再利用する。** 違うのは fund balance だけ — $20k vs $5k。読者は Test 2 と Test 3 を背中合わせに読み、fund サイズが何を *正確に* 変えるか見られる。**同じ入力をテスト間で再利用すれば、影響する入力軸が isolate される。**
2. **Test 2 より少ない assertion。** 最も変わる 3 つの値（\`fund_withdrawals\`、\`unfilled_deficit\`、\`fund_balance\`）だけを assert する。Classification、per-record outcome、account ID — Test 2 ですでに証明されたもの — は再 assert しない。**先行する test と setup を共有する test は、差分だけを assert する。**
3. **\`unfilled_deficit == 10_707 - 5_000\`** — また算術式。読者は \`shortfall − available = unfilled\` を見て、保存則 \`paid + unfilled = shortfall\` を即座に掴む。**Assertion 内の代数的表現は、assertion 自体と並行して invariant を教える。**

#### Test 4: Underwater、fund が既に depleted

\`\`\`rust
    #[test]
    fn scan_underwater_depleted_fund_escalates_full_shortfall() {
        // Fund empty from the start.
        let accts = vec![snapshot(1, 1, 100_000, 10_000)];
        let mut s = LiquidationScanner::with_empty_fund(default_params());
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.fund_withdrawals, 0);
        assert_eq!(report.unfilled_deficit, 10_707);
        assert_eq!(s.fund_balance(), 0);
    }
\`\`\`

押さえる点が 3 つ:

1. **\`new(0)\` ではなく \`with_empty_fund\`** — call site の named constructor が「empty fund」と語る。「balance 0 の fund」ではない。テストを読めば意図が即座に見える。**テスト call site での named constructor は documentation だ。**
2. **\`fund_withdrawals == 0\`** — *full shortfall ではない*。レッスン8 の \`Depleted\` variant は \`(0, unfilled)\` を返す。Fund は *0* を支払い（何もなかったから）、*full* shortfall を escalate する。Aggregate フィールドはこの区別を preserve する。**\`Depleted\` と \`Covered { amount: 0 }\` は別の outcome。Aggregate は異なる数を見せねばならない。**
3. **テストは Test 2 と Test 3 より短い。** Assertion が少なく、setup がシンプル、narrative がクリーン。Depleted state はカスケードの「崖の端」 — ADL参照実装パート（ADL）が発火する境界だ。**Edge-case test は terse であるべき。*その存在自体* が価値の大半。**

#### Test 5: Mixed batch が unhealthy アカウントのみを処理

\`\`\`rust
    // ─── mixed batch ───────────────────────────────────────────────

    #[test]
    fn scan_mixed_batch_processes_only_unhealthy() {
        // 4 accounts, all 1 long @ entry $100, mark $80 (−20% adverse).
        // Vary collateral to span the 4 states:
        //   coll 50 → equity 30, ratio 30/80 = 37.5% → Safe
        //   coll 25 → equity 5,  ratio  5/80 = 6.25% → AtRisk
        //   coll 21 → equity 1,  ratio  1/80 = 1.25% → Liquidatable (solvent close)
        //   coll 10 → equity −10 → Underwater
        let accts = vec![
            snapshot(1, 1, 100, 50),
            snapshot(2, 1, 100, 25),
            snapshot(3, 1, 100, 21),
            snapshot(4, 1, 100, 10),
        ];
        let mut s = LiquidationScanner::new(default_params(), InsuranceFund::new(1_000));
        let report = s.scan(&accts, MarkPrice(80));

        assert_eq!(report.records.len(), 2);
        assert_eq!(report.records[0].account, AccountId(3));
        assert_eq!(report.records[1].account, AccountId(4));
        assert_eq!(report.records[0].classification, MarginHealth::Liquidatable);
        assert_eq!(report.records[1].classification, MarginHealth::Underwater);
    }
\`\`\`

押さえる点が 6 つ:

1. **1 つのスライスに 4 アカウント — それぞれが異なる \`MarginHealth\` state に着地するよう calibrate してある。** Account 1 → Safe、2 → AtRisk、3 → Liquidatable、4 → Underwater。スライスは レッスン6 分類カスケードの *すべての* arm を 1 回の呼び出しで exercise する。**Mixed-batch test は分類カスケードの完全性を verify する最も安い方法。**
2. **\`report.records.len() == 2\`** — *4 ではない*。Safe と AtRisk は record を生まない。Liquidatable と Underwater だけが生む。Test は AtRisk を liquidation trigger に誤分類する future bug を捕える。**Filter された出力での length assertion は orchestration レベルの「wrong filter」bug を捕える。**
3. **\`report.records[0].account == AccountId(3)\` と \`[1].account == AccountId(4)\`** — record は *input 順序* を preserve する。Account 3 が account 4 より先にスライスに現れ、record も同じ順序で並ぶ。レッスン11 のモジュール doc が定めた FIFO 順序ポリシーだ。**Ordered iteration → ordered records。Policy は test が enforce する。**
4. **数学コメントは *per-account*。Per-test ではない。** 各アカウントが自分の分類数学を inline で得る。**Mixed-batch test では、数学コメントはそれが描くアカウントの隣に住む。**
5. **\`InsuranceFund::new(1_000)\` — 非空 fund。** $1,000 の fund はこの batch の任意の solvent fee と任意の小さい underwater shortfall を cover する。Fund-state の mutation は validate されるが、test の primary point ではない。Primary point は *分類 + filtering* の挙動だ。**1 つのテスト、1 つの primary point。Fund state はここでは incidental。**
6. **\`fund_deposits\` / \`fund_withdrawals\` / \`unfilled_deficit\` への assertion なし。** これらは per-account outcome（record が運ぶ）から derive される。Assert すれば test #1-#4 のカバレッジと重複する。Mixed-batch test は *新しい* 振る舞い — multi-account orchestration — に focus すべきだ。**新しい振る舞いを assert する。すでにカバー済みのものは再 assert しない。**

#### Test 6: Multi-underwater partial drain での FIFO fairness

\`\`\`rust
    // ─── FIFO fairness when fund partially drains ──────────────────

    #[test]
    fn scan_first_underwater_gets_paid_then_second_unfilled() {
        // Two underwater accounts, fund has enough for the first only.
        // Underwater shortfall per account: notional 80_500, fee 1_207,
        // equity -9_500 → shortfall 10_707.
        // Fund starts at 12_000: covers first (10_707), leaves 1_293;
        // second needs 10_707 → partial 1_293 + unfilled 9_414.
        let accts = vec![
            snapshot(1, 1, 100_000, 10_000),
            snapshot(2, 1, 100_000, 10_000),
        ];
        let mut s = LiquidationScanner::new(default_params(), InsuranceFund::new(12_000));
        let report = s.scan(&accts, MarkPrice(80_500));

        assert_eq!(report.records.len(), 2);
        assert_eq!(report.fund_withdrawals, 12_000); // 10_707 + 1_293
        assert_eq!(report.unfilled_deficit, 10_707 - 1_293);
        assert_eq!(s.fund_balance(), 0);
    }
\`\`\`

押さえる点が 5 つ:

1. **2 つの *同一* underwater アカウント。** 同じ entry、同じ collateral、同じ close mark。違うのは iteration position だけだ。同一にしておけば、テストは *fairness policy* — FIFO — を outcome の差を決める唯一の要素として isolate できる。**Iteration をまたぐ同一入力は policy 変数を isolate する。**
2. **Fund balance（$12,000）が *ちょうど* \`1 つ目の shortfall + 2 つ目への partial payment\`** — $10,707 + $1,293 = $12,000。読者には、fund が *正確に* 1 つ目の underwater アカウントで底をつき、部分残額が 2 つ目に渡るのが見える。**慎重に選んだ fund balance が fairness policy を assertion で可視化する。**
3. **\`fund_withdrawals == 12_000\`** — 両アカウントを跨いだ *合計* 引き出し。Aggregate フィールドは「1 つ目が 10,707、2 つ目が 1,293」を区別しない。合計だけを見せる。**Aggregate フィールドは要約する。Per-record フィールドが区別する。**
4. **コメントが算術を explicit に含む** — \`10_707 + 1_293\`。失敗を debug する読者は unfilled-deficit の数値から FIFO ルールにたどり着ける。**FIFO 算術を見せる test コメントは、policy を監査可能に保つ。**
5. **\`unfilled_deficit == 10_707 − 1_293\` の assertion は、ADL参照実装パート が consume する *唯一の* シグナルだ。** 次の stage（ADL）は、この \`9_414\` shortfall を cover するに足るだけの profitable counter-position を force-close する。レッスン13 の test が、ADL参照実装パート が read する契約を固定する。**Per-stage handoff の test は、次の stage が consume する契約を固定する。**

### Step 2: 4 個の invariant proptest を追加

6 個の unit test の後に \`proptest!\` ブロックを追記する。ブロックはランダムな \`(collaterals × mark × initial_fund)\` triple で 4 つの cross-cutting invariant を exercise する。

\`\`\`rust
    // ─── proptest: invariants ──────────────────────────────────────

    proptest! {
        /// The scanner's \`fund_balance\` after a scan equals the prior
        /// balance plus \`fund_deposits\` minus \`fund_withdrawals\`.
        #[test]
        fn fund_balance_delta_matches_report(
            collaterals in proptest::collection::vec(1_i64..1_000_000, 0..10),
            mark in 50_u64..150,
            initial_fund in 0_i64..10_000_000,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();
            let mut s = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let before = s.fund_balance();
            let report = s.scan(&accts, MarkPrice(mark));
            let after = s.fund_balance();
            // before + deposits - withdrawals = after
            prop_assert_eq!(
                before.saturating_add(report.fund_deposits).saturating_sub(report.fund_withdrawals),
                after,
            );
        }

        /// \`unfilled_deficit > 0\` implies the fund was insufficient at
        /// some point during the scan, which implies \`fund_balance == 0\`
        /// at the end of the scan.
        #[test]
        fn unfilled_implies_empty_fund(
            collaterals in proptest::collection::vec(1_i64..1_000, 1..10),
            mark in 50_u64..70,    // adverse to long positions
            initial_fund in 0_i64..5_000,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();
            let mut s = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let report = s.scan(&accts, MarkPrice(mark));
            if report.unfilled_deficit > 0 {
                prop_assert_eq!(s.fund_balance(), 0);
            }
        }

        /// Number of records ≤ number of input accounts. Safe and AtRisk
        /// accounts never produce records; the inequality is strict
        /// when at least one input is healthy.
        #[test]
        fn records_count_bounded_by_accounts(
            collaterals in proptest::collection::vec(1_i64..1_000_000, 0..20),
            mark in 50_u64..150,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();
            let mut s = LiquidationScanner::with_empty_fund(default_params());
            let report = s.scan(&accts, MarkPrice(mark));
            prop_assert!(report.records.len() <= accts.len());
        }

        /// Determinism: scanning the same input twice produces the same
        /// report (fresh fund + fresh scanner each time).
        #[test]
        fn scan_is_deterministic(
            collaterals in proptest::collection::vec(1_i64..1_000_000, 0..10),
            mark in 50_u64..150,
            initial_fund in 0_i64..1_000_000,
        ) {
            let accts: Vec<_> = collaterals
                .iter()
                .enumerate()
                .map(|(i, c)| snapshot(i as u64, 1, 100, *c))
                .collect();

            let mut s1 = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let mut s2 = LiquidationScanner::new(
                default_params(),
                InsuranceFund::new(initial_fund),
            );
            let r1 = s1.scan(&accts, MarkPrice(mark));
            let r2 = s2.scan(&accts, MarkPrice(mark));
            prop_assert_eq!(r1, r2);
            prop_assert_eq!(s1.fund_balance(), s2.fund_balance());
        }
    }
\`\`\`

4 つの proptest が揃って *orchestration 層の invariant* を encode する。それぞれが契約だ。

#### Proptest #1: \`fund_balance_delta_matches_report\`

**Fund の保存則。** \`before + ∑deposits − ∑withdrawals = after\`。レッスン8 の invariant（\`balance ≥ 0\`）は per-call の主張だった。レッスン13 でこれを scan 全体に拡張する。Report が claim する deposit はすべて fund balance に現れねばならない。Withdrawal も同じ。**この proptest が pass すれば、report と fund は何が起きたかについて agree している。**

押さえる点が 3 つ:

1. **算術は \`saturating_add\` と \`saturating_sub\`** で、scanner 自身の算術と一致する。Saturation なしだと、proptest は input をもっと厳しく bound するか「property は成立しない」を accept するしかない。**Proptest の算術は production コードの算術と一致しなければならない。**
2. **入力範囲（\`1..1_000_000\`）は \`i64::MAX\` のはるか下に bound してある** — property が *素直に表現できる* ようにだ。Operating range では saturation が実際に発火することはない。Proptest は依然として \`saturating_add\` 相手に動く。範囲内では saturation が no-op だからだ。**Proptest input は、property が最もシンプルな形で成立する範囲に bound する。Saturated 形ではない。**
3. **\`mark in 50..150\`** — entry 価格を $100 と仮定した周辺の 50-150% 範囲で、Safe / Liquidatable / Underwater 条件の両方を sweep する。**Mark 範囲は分類が気にする境界をまたいで sweep すべき。**

#### Proptest #2: \`unfilled_implies_empty_fund\`

**Fund-exhaustion 契約。** Report に \`unfilled_deficit > 0\` が現れたら、fund は終了時に *必ず* 空でなければならない。これで「unfilled は存在するが fund はまだ money を持っている」という矛盾型の bug が捕まる。契約が成立するのは、レッスン9 の \`withdraw_shortfall\` が unfilled deficit を report する前に fund を 0 まで drain するからだ。**レッスン9 の per-call 契約が per-scan の invariant に scale する。**

押さえる点が 3 つ:

1. **Proptest body 内の \`if report.unfilled_deficit > 0 { ... }\` filter。** Unfilled が存在するケースだけが assertion を発火させる。Fund がすべてを cover できたケースは valid な「assertion が発火しないケース」だ。**Proptest 内の条件付き assertion は「X が true なら Y も成立する」の表現方法。**
2. **入力範囲が *adverse* — \`mark in 50..70\`。** Entry $100 の long position は mark $50-70 で深刻な損失に直面し、underwater outcome が起こりやすくなる。これで test は \`unfilled > 0\` 分岐をトリガする方向に bias する。**Proptest input は *interesting な* 条件をトリガする方向に bias すべき。さもないと、ほとんどのケースが assertion を静かに skip する。** これが *proptest の密度（density）問題* だ: \`mark in 50..150\` のような広い範囲だと、ランダム入力の大多数が Safe か Solvent に着地し、条件付き assertion は一度も発火しない。Proptest のデフォルト 100-250 iteration を通じて *プロパティは実際にテストされないまま pass する* — 見えない dead-code test だ。Assertion が実際に発火する regime に向けて入力を bias する。さもないと、プロパティテストは何もテストしていない。
3. **\`initial_fund in 0..5_000\` — 下の範囲で cap してある。** Fund は予想される aggregate shortfall（underwater account 数で scale する）に対して不十分にサイズされる。**予想される shortfall より下に fund をサイズすれば、unfilled deficit の可能性が最大化される。**
4. **レッスン13 では \`prop_assume!\` 多用よりも Strategy 側の事前バイアスを優先する。** このプロパティの目的は \`unfilled > 0\` 分岐を高密度で発火させることなので、生成器を最初から adverse 領域へ寄せるほうが効率が良い。こうすると reject 数が抑えられ、\`TooManyAssumptions\` のリスクも下がる。**数理前提を明示したいときは レッスン5 のように \`prop_assume!\`、発火密度を作りたいときは レッスン13 のように Strategy で先に寄せる**、という使い分けが本コースの規律だ。

#### Proptest #3: \`records_count_bounded_by_accounts\`

**Cardinality bound。** Scanner は input account 数を超える record を生めない。Safe と AtRisk は record をゼロ寄与する。Liquidatable と Underwater はそれぞれちょうど 1 record を寄与する。**Orchestration loop は record を無から *生む* ことも、アカウントごとに *増幅する* こともできない。**

押さえる点が 2 つ:

1. **Assertion は \`<=\`、strict な \`<\` ではない。** すべての account が unhealthy なら、record 数 *は* account 数と等しい。Bound は non-strict だ。Zero-skipped-account も valid なケースだからだ。**Cardinality bound は通常 \`<=\`。Strict \`<\` は全 unhealthy ケースを誤って reject する。**
2. **Proptest は scan あたり最大 20 account をカバー** (\`vec(..., 0..20)\`)。他の proptest より大きい。Cardinality bound は scale で違反しやすく、test するのが最も安いからだ。**Invariant が linearly scale する場所では、proptest でより大きい collection を使う。**

#### Proptest #4: \`scan_is_deterministic\`

**Validator-consensus 契約。** 同一 state と同一 input を持つ 2 つの scanner は byte-identical な出力を生まねばならない。この proptest が落ちたら、scanner には非決定性がある。そしてコンセンサスチェーンで非決定性は fork を意味する。**このコース全体で最も load-bearing な test だ。**

押さえる点が 4 つ:

1. **Proptest は 1 つではなく *2 つ* の scanner を構築し、同じ input を両方に通す。** 同じ scanner が 2 回 scan すると、2 回目の state が 1 回目から何かを inherit して非決定性を mask しうる。Fresh な scanner 2 つなら、\`InsuranceFund::new(initial_fund)\` reset を生き延びる state を catch できる。**決定性テストは毎 run で independent state を使わねばならない。**
2. **Assertion は *両方* \`report == report\` AND \`fund_balance == fund_balance\` に対して行う。** 決定的な report を生むが非決定的な fund-balance 変化を持つ scanner は、report-only test を pass する。だが本当の bug だ。Two-way assertion なら両方 catch できる。**決定性テストはあらゆる observable な side effect に対して assert する。**
3. **\`ScanReport\` の \`PartialEq\` が *このテストを可能にする*。** レッスン11 の derive \`#[derive(Clone, Debug, PartialEq, Eq, Default)]\` が \`prop_assert_eq!(r1, r2)\` の compile を可能にする。\`PartialEq\` なしでは、この proptest は書けない。**標準 derive trait が標準 test pattern を unlock する。Eagerly derive する。**
4. **\`Hash\` derive は不要。** 決定性テストは \`==\` で比較するだけで hashing しない。\`Hash\` はこのテスト（とほとんどの test）には冗長だ。**Test が実際に要求するものを derive する。Defensively に \`Hash\` を derive する誘惑には抵抗する。**

### Step 3: テストを走らせる

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

期待される出力（短縮版）:

\`\`\`
running 69 tests
test compute::tests::close_flat_has_zero_qty ... ok
... (compute テストがさらに 33 個)
test insurance::tests::balance_never_negative ... ok
... (insurance テストがさらに 20 個)
test scanner::tests::fund_balance_delta_matches_report ... ok
test scanner::tests::records_count_bounded_by_accounts ... ok
test scanner::tests::scan_all_safe_accounts_does_nothing ... ok
test scanner::tests::scan_atrisk_does_not_liquidate ... ok
test scanner::tests::scan_empty_accounts_returns_empty_report ... ok
test scanner::tests::scan_first_underwater_gets_paid_then_second_unfilled ... ok
test scanner::tests::scan_is_deterministic ... ok
test scanner::tests::scan_liquidatable_solvent_deposits_fee ... ok
test scanner::tests::scan_mixed_batch_processes_only_unhealthy ... ok
test scanner::tests::scan_skips_flat_positions ... ok
test scanner::tests::scan_underwater_depleted_fund_escalates_full_shortfall ... ok
test scanner::tests::scan_underwater_fully_covered_drains_fund_partially ... ok
test scanner::tests::scan_underwater_partial_drain_surfaces_unfilled ... ok
test scanner::tests::unfilled_implies_empty_fund ... ok

test result: ok. 69 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**69 テスト pass。Liquidation crate は \`0a8464e\` と byte-for-byte 一致。** Liquidation参照実装（スキャナパート） が完成し、Liquidation三部作（計算・保険基金・スキャナ） — が *閉じた*。

エラー時にありがちなパターン:

- **\`scan_is_deterministic\` が時々 flake する** — scanner に隠された非決定性がある。最も一般的な原因: \`HashMap\` の iterate（順序が変わる）。Liquidation参照実装（スキャナパート） は \`HashMap\` を使わない。導入したなら \`BTreeMap\` か \`Vec\` に切り替える。**隠れた非決定性は chain-fork リスク。Proptest が mainnet 前に catch する。**
- **\`fund_balance_delta_matches_report\` が \`5000 vs 4999\` で失敗** — \`saturating_add\` の順序での off-by-one。Production コードを再確認: \`before + deposits − withdrawals\`、この順序。\`before − withdrawals + deposits\` への反転は算術的には同一に見えるが、実は違う: 中間値の \`before − withdrawals\` は *一部の呼び出し* で負になりうる。*saturation を欠いた release ビルドでは*、これがサイレントに巨大な正値に *wrap* する — validator ごとに異なる \`i64\` が生まれ、validator 間の決定性が破壊され、chain が fork する。レッスン12 の順序での saturating arithmetic が安価な防御だ。Proptest こそが、順序を逆にしたときにそれを catch する道具だ。
- **\`unfilled_implies_empty_fund\` が \`unfilled=500, balance=1000\` で失敗** — fund が depletes すると scan が early-exit してしまう（後続の underwater アカウントを skip）。レッスン11 設計契約は scan を続けるべきと言う。スライス内の *すべての* underwater アカウントで aggregate すべきだ。レッスン12 の fan-out ロジックを読み直す。
- **\`records_count_bounded_by_accounts\` が \`records=21, accounts=20\` で失敗** — どこかで loop が double-push している。最も可能性の高い原因: \`report.records.push(...)\` を \`if\`/\`else\` 分岐 *内部* AND もう一度外で書いている。Loop body を再確認 — push は最後にちょうど 1 回でなければならない。

## 設計の振り返り — Liquidation三部作

13 レッスンを通して Liquidation三部作を形作った load-bearing な決定が 3 つ:

1. **層を成す保存則。** レッスン9 の \`amount + unfilled = shortfall\`（per call）、レッスン10 の \`fee_to_fund + residual_to_account = post_close_equity\`（per close）、レッスン13 の \`before + ∑deposits − ∑withdrawals = after\`（per scan）。各層の法則が次の層の invariant に consume される。Crate の数学が最小単位（1 回の \`withdraw_shortfall\` 呼び出し）から最大単位（1 回の \`scan\` batch）まで閉じる。**層を成す保存則こそが、コンセンサス state machine を composition の下で *証明可能に* 正しく保つ方法だ。**

2. **\`debug_assert!\` ペア + saturating arithmetic を、どこにでも。** Crate 内のすべての関数が両方かどちらかを使う。レッスン10 の dispatch（\`solvent_close_outcome\` / \`underwater_close_outcome\`）は debug-assert pair。レッスン8 deposit と レッスン9 withdraw は saturating arithmetic を使う。レッスン12 scan は両方を組み合わせる — routing predicate 経由の debug-assert、report aggregation 経由の saturation。**Dev-assertion + prod-saturation 規律は 1 つの関数から 1 つの crate まで scale する。**

3. **メカニズムの前に語彙、4 回連続で。** レッスン1〜3 が \`LiquidationParams\`、\`MarginRatio\`、\`MarginHealth\`、\`AccountSnapshot\`、\`CloseOrderSpec\` を \`margin_health\` 実装前に宣言した。レッスン8 が \`InsuranceFund\`、\`WithdrawOutcome\` を \`withdraw_shortfall\` 前に宣言した。レッスン10 が \`SolventClose\`、\`UnderwaterClose\` を実装中に宣言した。レッスン11 が \`CloseOutcomeKind\`、\`LiquidationRecord\`、\`ScanReport\`、\`LiquidationScanner\` を \`scan\` 前に宣言した。パターンがコース全体で一貫しているのは、*語彙が契約を定義し、メカニズムがそれを実装する* からだ。**語彙が先、メカニズムが後。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
\`\`\`

レッスン13 の後:
- **scanner.rs** は Liquidation参照実装（スキャナパート） の \`scanner.rs\` と **byte-for-byte 一致**。ファイル全体 — module-level doc + imports + 4 types + 5 accessor + \`scan\` メソッド + 10 unit test + 4 proptest — が workspace に揃う。
- **\`crates/liquidation/src/\` の他のファイル** は レッスン10 以降 byte-for-byte 安定。

**Liquidation コース完成。** セクション0（Orientation、L0） + セクション1（Types、レッスン1〜3） + セクション2（Pure compute、レッスン4〜7） + セクション3（Insurance fund、レッスン8〜10） + セクション4（Scanner + capstone、レッスン11〜13） = 5 modules を跨ぐ 13 レッスンだ。

## よくある質問

**Q1: レッスン13 がなぜ 6 個の unit test で、4 個や 8 個ではないのか?**

Coverage math から落ちる数字だ。Test coverage 行列が 4 outcome × 2 batch shape で、multi-account 列が 4 つの outcome のうち 3 つを mixed-batch test に collapse する。残る 4 つの single-account outcome（Solvent、FullyCovered、PartialDrain、Depleted）にはそれぞれ自分の test が必要。Multi-account 列には mixed-batch test と FIFO-fairness test が必要（identical-account-iteration-order が 2 つの underwater iteration を区別する *唯一の* ものだから）。4 + 1（mixed） + 1（FIFO） = 6。**任意の数ではなく、coverage math。**

**Q2: なぜ レッスン13 は「scanner が batch 中で fund が depleted した後も走る」test を加えないのか?**

すでにカバー済みだからだ。Proptest #2 \`unfilled_implies_empty_fund\` が scan 中に fund が depletes したときちょうど発火し、unit test #6 \`scan_first_underwater_gets_paid_then_second_unfilled\` が決定的バージョンを構築する。「mid-batch depletion」専用 test を追加すれば両者と重複する。**6 unit test + 4 proptest がすでにケースをカバーする。冗長 test はノイズだ。**

**Q3: 4 個の proptest を 1 つの mega-property に統合できないか?**

*できる*（\`fund_balance_delta_matches_report ∧ unfilled_implies_empty_fund ∧ records_count_bounded_by_accounts ∧ scan_is_deterministic\`）。だが各 property は独立に意味を持つ。別々に証明すれば、test 失敗メッセージが *どの* invariant が壊れたかを教えてくれる。Mega-property の \`prop_assert!(A && B && C && D)\` は「mega-property が落ちた」とだけ言い、どのサブ property かは教えない。**Property レベルの粒度が、失敗時の診断粒度を与える。**

**Q4: なぜ \`scan_is_deterministic\` は 2 回しか iteration を走らせないのか? Many ではなく?**

2 回で非決定性は catch できる。2 run が違えば、*どれだけ多い* run でも違う。3 run でも同じ bug を catch する。4 run も同じだ。「Many runs」防御は flaky テスト用 — bug が確率的に起きる場合だが、scanner 決定性ではそうはならない（構造上決定的だからだ）。**Property を minimum-multiplicity でテストする。それを超える multiplicity は無駄な iteration。**

**Q5: レッスン13 の test + proptest がテストしないものは何か?**

意図的に外したものがいくつかある。**スコープ外:** (a) \`ScanReport\` の precise なバイトレイアウト（Liquidation参照実装（スキャナパート） では in-process のみで使われ、ディスクに serialize されない）、(b) スレッド安全性（\`LiquidationScanner\` は \`Send + Sync\`-test されない。Liquidation参照実装（スキャナパート） は設計上シングルスレッド）、(c) panic-safety（bridge が higher level で panic を扱う）。**スコープ内:** fund state に影響する分類 → routing → 集計のあらゆる path。**レッスン13 の test はコンセンサスが実際に必要とするものを cover する。**

**Q6: ADL参照実装パート（ADL）は レッスン13 scanner から何を consume するのか?**

正確に \`ScanReport.unfilled_deficit\` — 「これだけの quote 単位の shortfall を fund が absorb できなかった」を意味する i64 だ。ADL参照実装パート は (a) 各 block の scan 後にこのフィールドを read、(b) ゼロでなければ *profitable* な counter-position を決定的な順序で walk、(c) deficit を cover するのに十分な数を force-close する。レッスン13 proptest \`unfilled_implies_empty_fund\` が、bridge が見るべき *唯一の場所* がこのフィールドであることを *保証* する。他に隠れた escalation signal はない。**ADL参照実装パート は 1 つの数字を得る。それで何をすべきか知っている。**

## セクション4 + Liquidation三部作の振り返り

Liquidation コースの 13 レッスン、表 1 つで:

| # | セクション | レッスン | 対応パート | 何を構築したか |
|---|---|---|---|---|
| M0 | Orientation | L0 | — | コース概観、openhl context |
| M1 | Types | レッスン1, レッスン2, レッスン3 | 計算パート | \`LiquidationParams\`、\`MarginRatio\`、\`MarginHealth\`、\`AccountSnapshot\`、\`CloseOrderSpec\` |
| M2 | Pure compute | レッスン4, レッスン5, レッスン6, レッスン7 | 計算パート | \`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`、\`margin_health\`、\`close_order_spec\` |
| M3 | Insurance fund | レッスン8, レッスン9, レッスン10 | 保険基金パート | \`InsuranceFund\` state machine、\`WithdrawOutcome\` 3-variant enum、\`liquidation_fee\`、\`solvent_close_outcome\`、\`underwater_close_outcome\`、\`SolventClose\`、\`UnderwaterClose\` |
| M4 | Scanner + capstone | **レッスン11, レッスン12, レッスン13** | スキャナパート | \`CloseOutcomeKind\`、\`LiquidationRecord\`、\`ScanReport\`、\`LiquidationScanner\`、\`scan\` メソッド、10 unit test + 4 proptest |

**69 テスト。4 modules。13 レッスン。openhl コミット SHA 3 つ。** Liquidation crate はいまや完全で決定的で defensively-coded な multi-account orchestration 層であり、openhl bridge が block ごとに 1 回呼んで safety-net cascade を ADL の手前まで駆動できる。

openhl カリキュラムの次のコース — ADL参照実装パート、ADL — は \`ScanReport.unfilled_deficit\` を唯一の入力として consume し、profitable counter-position を walk し、fund が absorb できなかった分を force-close する。ADL参照実装パート が read する契約こそ、レッスン13 proptest が固定したものだ。

## 次のコース — ADL参照実装パート、ADL（別コース）

レッスン13 は Liquidation コースの *最後の* レッスンだ。Cascade の Layer 3 — ADL（auto-deleveraging） — は別の専用 future コースになる。Handoff は:

1. **Scanner が \`unfilled_deficit > 0\` を生む。** Fund がすべての underwater shortfall を absorb できなかったときだ（レッスン13 proptest #2 が、これが *唯一の* signal であることを保証する）。
2. **ADL参照実装パート の ADL routine** はこのフィールドを各 block の scan 後に read する。
3. **ADL routine** は *profitable* な counter-position を決定的順序で walk（おそらく \`(pnl_pct × leverage)\` 降順、\`account_id\` を tiebreaker として）、順番に force-close、insolvent ポジションに margin を credit back する。
4. **ADL outcome** は別の \`AdlReport\` 型で、独自の保存則と独自の proptest を持つ。

ADL参照実装パート は openhl のコミット \`d66b44a\` で実装されている。Rethlab の ADL コースは、レッスンが draft されたら着地する。
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
