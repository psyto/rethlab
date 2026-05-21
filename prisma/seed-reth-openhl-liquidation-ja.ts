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

前のコース（\`building-openhl-funding\`）で funding-rate state machine を追加した — 永久先物はこれで mark を index に anchor する仕組みを持った。本コースでは次の openhl primitive を作る: アカウントの損失が預け入れ collateral を超えたときにポジションを force-close する **liquidation エンジン**だ。

本コースを終えると、以下を完成させている:

- 新しい \`openhl-liquidation\` crate に **3 ソースファイル / ~600 LOC**。
- Stage 10a マイルストーンで **24+ tests passing**、capstone までにさらに増える: 各 compute 関数の hand-traced unit test + margin-ratio の単調性と determinism の proptest + insurance fund の保存則 invariant。
- **3 つの building block**: fixed-point types モジュール、純粋な compute モジュール（margin math）、そして state machine（insurance fund、Stage 10b）と multi-account scanner（Stage 10c）。
- 全 validator が同じ結果を出す **4 状態の margin classification**（\`Safe\` / \`AtRisk\` / \`Liquidatable\` / \`Underwater\`）。

こうしたことが理解できるようになる:

- なぜ perp DEX は liquidation をオフチェーンプロセスに外注できないのか — それでは consensus solvency を主張できなくなる。
- Hyperliquid 型 margin model: cross-margin、mark-vs-entry、initial-vs-maintenance。
- Margin health の 4 状態、それぞれが engine に何を許可するか。
- \`margin_ratio\` の **非単調エッジケース** — collateral が notional を支配するとき、ratio が mark の方向と逆に動くケースがあり、それがなぜ liquidation を壊さないのか。
- なぜ insurance fund を残高エントリではなく state machine として作るのか。
- Auto-deleveraging (ADL) がこの設計の端でどう位置づけられるか — そしてなぜ Stage 10 では扱わないのか。

## なぜ liquidation が重要か（perp 1 段落）

永久先物はレバレッジの効いたポジションだ。トレーダーは \`collateral\` (USDC) を預け、\`entry\` 価格で \`size\` のポジション（符号付き: 正 = ロング、負 = ショート）を開く。ポジションの *unrealized PnL* は mark 価格とともに動く: ロングは mark > entry で利益、mark < entry で損失。損失が collateral を食って \`equity / notional\` が **maintenance margin** 要件を下回ると、アカウントはもう損失をカバーできなくなる — engine は market でポジションを force-close し（反対 side、フルサイズ）、**liquidation fee** を collateral から差し引いて insurance fund に積み立て、（equity がまだ正なら）残りをアカウントに返す。Close 前に equity が *負* になった場合 —「underwater」ケース — insurance fund が不足分を吸収する。これがメカニズムのすべて。

## なぜ L1 perp DEX は consensus 内で liquidation を実行するのか

ある種のデリバティブ venue は liquidation をオフチェーンの liquidator プロセスに外注する — アカウント状態を scan して \`liquidate(account)\` endpoint を呼ぶ bot だ。これは低頻度の settlement system（クレジットデフォルトスワップなど）では機能するが、perp のスピードでは破綻する: 50× のレバレッジを賭けた HYPE position は、ニュースの cascade で数秒のうちに healthy から underwater に反転しうる。検知と close の間の RPC ラウンドトリップによる遅延は、すべて chain が吸収する損失になる。

Hyperliquid は liquidation を **consensus 内** で実行する。すべての validator が、すべての block で、どのアカウントが maintenance を下回っているかを — 独立に、同じデータから、同じコードで — 計算する。Engine の出力（close orders + insurance-fund movements）は block の一部になる。**敵対的な市場の動きでも chain が支払い能力を保てる唯一の方法がこれだ。**

この保証の代償が determinism の規律: float 演算は禁止、すべての classification は validator 間で byte-identical でなければならず、すべての overflow は panic ではなく saturate しなければならない。Funding コース（\`openhl-funding\`）はこの規律との最初の本格的な遭遇だった。本コースは 2 回目だ。

## なぜ liquidation に float を使えないのか

Funding と同じ答え: consensus determinism だ。あるアカウントを \`Liquidatable\` と分類する validator と、同じアカウントを \`AtRisk\` と分類する他の validator は、異なる block を生成する — 異なる close orders、異なる fees、異なる insurance-fund deltas。Block proposal が分岐し、chain が fork する。

直し方: 符号付き整数 + saturating 演算 + i64 でオーバーフローしうる乗算には i128 の中間値を使う。\`MarginRatio\` の固定小数点単位として \`MARGIN_SCALE = 10_000\`（basis points）を使う。Bps は TradFi *でも* crypto perp venue でも margin の慣例単位 — Hyperliquid、Binance、Drift はすべて margin 要件を bps で表現する。\`MarginRatio(1_000)\` はちょうど 10%、\`MarginRatio(MARGIN_SCALE)\` はちょうど 100%。

（Funding は parts-per-billion の精度が必要だったので \`RATE_SCALE = 1_000_000_000\` を使った。Liquidation は精度はそれより低くて済むが、規律は同じ。）

## 12 レッスン

### Module 0 — Orientation
- **L0**（本レッスン）— なぜ liquidation か、なぜ margin model か、3 サブステージの roadmap。

### Module 1 — 型（L1-L3）
- **L1** — \`MARGIN_SCALE = 1e4\`（bps）+ \`LiquidationParams\` + \`hyperliquid_default()\`（10% / 2% / 1.5%）。なぜ bps か、なぜこのデフォルトか。
- **L2** — \`MarginRatio\` newtype + \`MarginHealth\` enum（\`Safe\` / \`AtRisk\` / \`Liquidatable\` / \`Underwater\`）。なぜ 4 状態か、それぞれが何を許可するか。
- **L3** — \`AccountSnapshot\` + \`CloseOrderSpec\`。なぜ新しい snapshot 型（\`funding::Position\` ではなく）か、bridge レイヤーがどう assemble するか。

### Module 2 — 純粋な compute（L4-L7）— Stage 10a
- **L4** — \`notional_value\` + \`unrealized_pnl\`。ロング・ショート両方で符号を正しく扱う signed-multiplication のトリック。
- **L5** — \`account_equity\` + \`margin_ratio\`。Collateral が notional を支配するときに発見される **非単調エッジケース** の proptest と、なぜ \`prop_assume!\` が正しい修正か。
- **L6** — \`margin_health\` 分類。すべての境界で strict less-than を使うこと、それが何を保証するか。
- **L7** — \`close_order_spec\`。Market order の規律: liquidation は利用可能な任意の価格を取る。Stage 10a 完了。

### Module 3 — Insurance fund（L8-L10）— Stage 10b
- **L8** — \`InsuranceFund\` 構造体 + \`deposit\` / \`withdraw\`。Single-balance な state machine。
- **L9** — \`absorb_deficit\`: Underwater liquidation が fund をどう drain するか。
- **L10** — \`credit_fee\`: liquidation fee が collateral から fund へ流れる。Composition test: 1 回の liquidation が deeply underwater ならば fee を credit *かつ* deficit を absorb する複合ケース。

### Module 4 — Scanner + Capstone（L11-L12）— Stage 10c
- **L11** — \`LiquidationScanner\`: \`&[AccountSnapshot]\` を順に走査し、各アカウントを分類し、\`Liquidatable\` と \`Underwater\` には close order を emit し、insurance-fund delta を返す。Composition layer。
- **L12** — Capstone。総合、bridge integration の preview、市場構造コンテキスト: on-chain CLOB liquidation が CEX liquidation や ADL とどう違うか。

## モジュールごとの SHA pinning

各レッスンは build に使う openhl commit を引用する。本コースは Stage 10a → 10c の 3 commit にまたがる:

| Module | レッスン | openhl SHA |
|---|---|---|
| 0 | L0 | \`22eedf9\` (Stage 10a) |
| 1 | L1-L3 | \`22eedf9\` (Stage 10a) |
| 2 | L4-L7 | \`22eedf9\` (Stage 10a) |
| 3 | L8-L10 | *Stage 10b — TBD* |
| 4 | L11-L12 | *Stage 10c — TBD* |

TBD の行は Stage 10b と 10c が ship した時点で更新される。それまでは Module 3、4 はスケルトン — Module 1-2 のコンテンツ（pure-compute 側のすべて）は \`22eedf9\` に対して完全に作られていて、Stage 10a を end-to-end で進める準備が整っている。

## 前提

本コースを最大限活用するには、以下があるとよい:

- **Course 9（openhl-funding）** が頭の中にあること。全レッスンを覚えている必要はないが、funding の fixed-point / saturating 演算 / pure state machine パターンは本コースでも同じパターン。Funding が難しかったなら本コースも難しい。
- **Course 7（openhl-clob）**、\`AccountId\`、\`Side\`、\`Qty\` のため。これらを直接再利用する。Matching engine の内部までは不要。
- **基本レベルの margin math への親しみ**。「initial margin = 10%、maintenance = 2%」を見て混乱しないなら準備完了。そうでなければ、上の perp recap と Hyperliquid の help center で十分。
- **EVM、precompile の知識は不要**。Liquidation は funding と同じく pure な state-machine math。

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
- **ゴール** — 終了時点で何が pass するか、何が build されているか。
- **おさらい** — 前のレッスンがどこで終わったか。
- **計画** — 具体的な編集、番号付き。
- **予測**コールアウト（🛑「スクロール前に...」付き）— 答えの前に問い。
- **反流暢性**コールアウト（🛑 で「やりがちな勘違い」を明示）—「〜と書けばいいのでは?」反射を先回りで叩く。
- **手を動かす walk-through** — 段階的なコード編集と各変更の説明。
- **テスト** — \`cargo test\` コマンドと期待出力。
- **設計の振り返り** — 本レッスンのコードに反映された 3-5 個の load-bearing な決定。
- **答え合わせ** — openhl reference SHA に対する \`git diff\`。
- **よくある質問** — 3-5 個の根拠を伴う回答。

Module 2（pure compute）はコース 7 の matching engine と比較して proof-heavy で code-light だ。**エッジケースでは速度を落とすこと** — L5 の levered-regime 非単調性は、ほとんどの読者の最初のメンタルモデルが壊れる場所。そこを再構築する。

## 準備完了

L1 に進む。\`MARGIN_SCALE\` をセットアップし、ネットワークのリスクパラメータが住む \`LiquidationParams\` 構造体を作る。
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

- **なぜ margin の固定小数点単位として basis points が正しいか** — bps は 4 decimal digits の精度を与え、それは実際の取引所（HL、Binance、Drift）が margin 要件を表現する解像度そのもの。\`RATE_SCALE\` と同じ i64-saturating の規律、スケールだけが異なる。
- **なぜ margin と rate は異なる scale を必要とするか** — Funding rate は 1 区間で notional の \`0.0001\` から \`0.04\` を動かすので parts-per-billion が必要。Margin 要件は notional の \`0.02\` から \`0.10\` を動かす。2 桁の違い → スケールも 2 桁の違い。
- **\`LiquidationParams\` はユーザー状態ではなくネットワーク状態** — 10% / 2% / 1.5% のデフォルトは *consensus パラメータ*であり、ネットワーク genesis 時に 1 回だけ設定され、governance によってのみ変更される。構造体の役割は、\`compute.rs\` に散らばる magic constant ではなく、パラメータを first-class かつ明示的にすること。
- **\`hyperliquid_default()\` という const constructor** — \`const fn\` なのでデフォルト値は \`static\` コンテキスト、test fixture、コンパイル時 assertion でも使える。**\`#[must_use]\` で構築後の暗黙の破棄を禁じる。**

確認:

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

…がコンパイルされる。

具体的な変更:

- **Cargo.toml** に \`openhl-clob\` と \`openhl-funding\` の依存を追加（\`AccountId\`、\`Side\`、\`Qty\` は clob から、\`MarkPrice\`、\`PositionSize\`、\`Notional\` は funding から — どちらも production の型シグネチャの一部であって test 専用ではない）。
- **\`src/types.rs\`** — 新規作成、モジュール docs + \`MARGIN_SCALE\` 定数 + \`LiquidationParams\` 構造体 + impl ブロック（デフォルトと accessor）。
- **\`src/lib.rs\`** — 空だったものに、クレート docs + \`pub mod types;\` + \`MARGIN_SCALE\` と \`LiquidationParams\` のクレートルートからの re-export を追加。

L1 にテストはない — \`MARGIN_SCALE\` は値であり、\`LiquidationParams\` は受動的な構造体だ。L2 の最初の挙動を持つ型（\`MarginHealth\` enum）が最初の unit test を稼ぐ。

## おさらい

L0 の後:
- perp DEX がなぜ liquidation をオフチェーンではなく consensus 内で実行するかを理解している。
- なぜ float が chain-fork hazard かを理解している（funding と同じ）。
- Liquidation クレートのスキャフォールド（Cargo.toml + 空の \`src/lib.rs\`）は Stage 10a 前から workspace にある — funding crate がそうだったのと同じ。

L1 では、この空の crate を、1 つの publicly-visible な scale + エンジン全体を支配するパラメータを持つ real な crate に変える。

## 計画

3 つの編集。Funding L1 と同じ形状だが依存が 1 つではなく 2 つ:

1. **\`crates/liquidation/Cargo.toml\`** — \`[dependencies]\` に \`openhl-clob = { path = "../clob" }\` と \`openhl-funding = { path = "../funding" }\` を追加。L5 / L6 で使う \`proptest\` を入れた \`[dev-dependencies]\` ブロックも追加。
2. **\`crates/liquidation/src/types.rs\` を作成** — bps の根拠を説明するモジュール docs + \`MARGIN_SCALE\` 定数 + \`LiquidationParams\` 構造体 + impl ブロック。
3. **\`crates/liquidation/src/lib.rs\`** — 空だったものに、クレート docs + \`pub mod types;\` + \`pub use types::{LiquidationParams, MARGIN_SCALE};\`。

> 🛑 **予測。** スクロール前に: funding は \`RATE_SCALE = 1_000_000_000\`（parts-per-billion、9 decimal digits の精度）を使う。なぜ liquidation は \`MARGIN_SCALE = 10_000\`（basis points、4 decimal digits）を使うのか? ヒント: 表現すべきマグニチュードを考える — funding rate は 1 区間で \`0.0001\` から \`0.04\`、margin 要件は notional の \`0.02\` から \`0.10\`。

（答え: **必要な解像度は意味のある最小ステップに従う。** 1 区間 \`0.0001%\` の funding rate は高ボリュームトレーダーにとって意味のある差 — ppb が正しい解像度。Maintenance margin が \`0.02%\` か \`0.05%\` かは engine 層では意味のある差では **ない** — 本番のデプロイは bps の整数（\`200 bps\`、\`500 bps\`）で maintenance を設定する。Bps は慣例単位。ppb を使えば、システムが実際に使えない精度を買うことになる。**実際のレンジをカバーする最小のスケールを使う。**）

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

1. **\`openhl-clob = { path = "../clob" }\`** — \`AccountId\`、\`Side\`、\`Qty\` のため（bridge レイヤーが liquidation order でこれらを再利用し、\`AccountSnapshot\` が \`AccountId\` を運ぶ）。
2. **\`openhl-funding = { path = "../funding" }\`** — \`MarkPrice\`、\`PositionSize\`、\`Notional\` のため。これらの型は funding と liquidation の接点 — どちらの crate も同じ通貨を喋る。
3. **\`[dev-dependencies]\` ブロック** に \`proptest\`。L5（margin-ratio の単調性テスト）と L6（margin-health の determinism テスト）で使う。いま宣言、あとで使用。

> 🛑 **やりがちな勘違い。** 「L5 / L6 がテストなんだから、両方とも dev-dep にすればよいのでは?」 **production コードが \`MarkPrice\`、\`AccountId\` を \`compute.rs\` の関数シグネチャで使う、テストだけではない。** Funding も L1 で同じ判断をした。ルール: 任意の \`pub fn\` シグネチャに現れる型は dev-only ではなく通常の dep でなければならない。

### Step 2: \`src/types.rs\` を作成

\`crates/liquidation/src/types.rs\` を作成。このファイルはまだ存在しない — このレッスンで新規作成。初期内容:

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

このファイルで気づくべき 5 点:

1. **\`MARGIN_SCALE: i64 = 10_000\`** — \`u32\` でも \`i32\` でもなく \`i64\`。スケールそのものは i32 に収まるが、margin ratio を出す乗算はすべて i128 中間値を経由して i64 に saturate して戻る — \`MARGIN_SCALE\` を i64 にしておけば、各演算サイトで余計な \`as i64\` キャストが発生しない。

2. **\`#[derive(Clone, Copy, Debug, PartialEq, Eq)]\` を \`LiquidationParams\` に。** 3 フィールドはすべて \`u32\`、構造体は 12 byte、自明に \`Copy\`。Engine は \`LiquidationParams\` を参照渡し（\`&LiquidationParams\`）で \`margin_health\` に渡すが、型が \`Copy\` なので呼び出し側が誤って値渡ししても怒られない。

3. **\`pub\` フィールド *かつ* \`const fn\` ゲッター。** フィールドが public なのは \`MarkPrice.0\` と同じ理由 — これらは透明な newtype / params で、カプセル化の境界ではない。\`const fn\` ゲッターが public フィールドと並存するのは、定数コンテキスト（例: \`maintenance_bps < initial_bps\` のコンパイル時 assertion）で有用だから。両スタイル、両方 OK。

4. **\`hyperliquid_default()\` は \`const fn\`。** これによりデフォルト値は \`static\` アイテムに乗せられる: \`static PARAMS: LiquidationParams = LiquidationParams::hyperliquid_default();\` が任意のコンテキスト（テスト、fixture、protobuf encoded genesis state への埋め込み等）で機能する。**\`const fn\` constructor は「欲しい値」と「どこでも宣言できる値」を橋渡しする。**

5. **\`#[must_use]\` を constructor とゲッターに。** 構築されてから破棄される \`LiquidationParams\` はほぼ確実にバグ — デフォルト値を計算しておいて捨てている。Accessor も同じ論理: \`initial_margin_bps()\` を読んで結果を無視するのはほぼ常に間違い。\`#[must_use]\` がコンパイラに読者へ確認を求めさせる。

> 🛑 **やりがちな勘違い。** 「3 つの独立した \`u32\` フィールドではなく、\`(u32, u32, u32)\` タプルをラップする \`LiquidationParams\` newtype ではダメか?」 **3 つの値は意味が違う。** タプルの順序は位置依存で壊れやすい — \`initial\` と \`maintenance\` を入れ替えるリファクタリングが静かに意味のバグを生む。名前付きフィールドは呼び出し側を明示的にさせる: \`LiquidationParams { initial_margin_bps: 1000, ... }\`。**名前は実行時コストがゼロ、位置タプルは実行時利益がゼロ。**

### Step 3: \`src/lib.rs\` を更新

\`crates/liquidation/src/lib.rs\` を開く。現状空。次に置き換え:

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

L11 終了時バージョンと比較して欠けているもの: \`pub mod compute\`、\`MarginHealth\`、\`MarginRatio\`、\`AccountSnapshot\`、\`CloseOrderSpec\` の \`pub use types::{...}\` re-export。これらは L2-L7 で型と compute 関数を追加するときに来る。**L1 の lib.rs はコンパイルが通る最小限。**

クロスリファレンスの \`[\`MarginHealth\`]\` は L2 で enum が追加されるまで壊れている。Rustdoc は warning を吐くが許容する（funding L1 と同じ扱い）。

> 🛑 **予測。** 明示的な 2-name 再エクスポートではなく \`pub use types::*;\` を書いたら何が起きるか? ヒント: L1 後と L7 後で \`types.rs\` にどんな型が存在するか、どの API surface に commit しようとしているかを考える。

（答え: **\`pub use types::*\` は将来 \`types.rs\` に住むすべて、誤って \`pub\` を付けた helper や private support type まで再エクスポートしてしまう。** 明示的 \`pub use types::{LiquidationParams, MARGIN_SCALE}\` はクレートの public surface を意図的な決定にする — \`types.rs\` に public 型を追加するたびに lib.rs の re-export にも追加することになり、「これは public API の一部か?」という瞬間を強制する。Glob re-export は保守のハザード: 将来 \`pub(crate)\` の代わりに \`pub\` で helper を追加すると、知らない間に public API の一部になる。**明示的 re-export は public API surface のチェックリスト。**）

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

\`MarginHealth\` への未解決リンクの rustdoc warning が 1 つ（L2 で追加される）。**抑制しないこと** — まだ何が欠けているかを build が教えてくれている。

エラーが出た場合に多い原因:

- **\`error[E0463]: can't find crate for 'openhl_clob'\` または \`'openhl_funding'\`** — Cargo.toml のどちらかの \`path = "..."\` dep を入れ忘れた。L1 のコードはまだ使っていないが、L3 の import を先取りしていれば fire する。
- **\`error[E0583]: file not found for module 'compute'\`** — lib.rs に \`pub mod compute;\` を先取りして書いた。削除する。L4 で戻ってくる。
- **\`error: failed to parse manifest\`** — Cargo.toml の syntax。よくあるミス: \`[dev-dependences]\` の typo。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **\`MARGIN_SCALE = 10_000\`、\`1_000_000_000\` ではない。** Funding の \`RATE_SCALE\` より 2 桁細かいのは間違い — 本番の margin パラメータは ppb で設定されない。2 桁粗い（\`100\`、percent）と意味のある解像度を失う。**Bps は世界が margin に対して落ち着いた単位。我々もそれに合わせる。**

2. **Default constructor は \`const fn\`、\`Default\` impl ではない。** なぜ両スタイルが正しくないか: \`Default::default()\` は多くの型で「妥当な zero っぽい」デフォルトを返す。\`LiquidationParams::default()\` は「margin ゼロ、fee ゼロ」を示唆してしまい **危険** — \`default()\` 値で動くネットワークは liquidation がまったく起きない。**\`hyperliquid_default()\` は名前付き、意図的なデフォルト** — 呼び出し側は名前で要求しなければならず、安全性が重要な性質が見える状態に保たれる。

3. **3 つの独立した \`u32\` フィールド、ネスト型 \`LiquidationConfig\` 構造体ではない。** Tiered maintenance margin（HL 流: 大きな position に対して高い maintenance %）への将来の移行は \`Vec<MaintenanceTier>\` フィールドを欲しがるかもしれない。今は追加しない — 先取りした一般化。**Stage 10a は flat margin を使う。Stage 10c+ で tiered が必要なら再検討。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/Cargo.toml ./crates/liquidation/Cargo.toml
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L1 の後:
- **Cargo.toml** は Stage 10a と完全一致。
- **types.rs** は Stage 10a の types.rs の *最初の ~50 行* と一致 — モジュール doc + \`MARGIN_SCALE\` + \`LiquidationParams\` + impl。残り（\`MarginRatio\`、\`MarginHealth\`、\`AccountSnapshot\`、\`CloseOrderSpec\`）は L2/L3。
- **lib.rs** は Stage 10a の lib.rs の *最初の ~25 行* と一致 — クレート doc + \`pub mod types;\` + 2 つの再エクスポート。他の再エクスポートはその型を追加したときに来る。

## よくある質問

**Q1: \`MARGIN_SCALE\` をクレート doc と一緒に \`lib.rs\` に置かないのはなぜ?**

\`MARGIN_SCALE\` がスケールする対象の型システムと同じ場所にあるべき。\`types.rs\` は unit-of-account（margin ratio、bps、分類しきい値）に関するすべてが住む場所。lib.rs は public-API surface — \`MARGIN_SCALE\` を types.rs からクレートルートに re-export するのは、source of truth を分けるよりクリーン。

**Q2: \`LiquidationParams\` の constructor で \`maintenance ≤ initial\` を検証すべきか?**

Stage 10a では no — 構造体は任意の組み合わせを受け入れる。Stage 10c で \`validated()\` constructor を追加し、genesis を読み込む側のコードから呼ばれたときに \`Result<Self, ParamsError>\` を返すようにする。検証なしの constructor は test と proptest generator が *病的な* 入力を食わせたい場合のために残す。

**Q3: なぜ \`hyperliquid_default()\` が 10% / 2% / 1.5% で、他の値ではないのか?**

HL の実際の maintenance margin tier は position size に応じて 1.25% から 6.67% の範囲。代表的な中間値として 2% を選んだ。Initial が maintenance の 10 倍 — よくある形。Fee の 1.5% は ETH/BTC の公開 HL 値。軽い資産はもっと低い。**どれも貴重ではない — あなたのネットワークが自分で設定する。**

**Q4: Margin ratio の計算で実際の i64 overflow リスクは?**

\`margin_ratio = equity * MARGIN_SCALE / notional\`。\`MARGIN_SCALE = 10_000\` と、\`equity\` と \`notional\` が \`i64::MAX\` で bounded されたとき、積 \`equity * MARGIN_SCALE\` は \`equity > i64::MAX / 10_000 ≈ 9.2e14\` で i64 を overflow しうる。現実的な取引所スケールでこれは 920 兆ドルの equity — 妥当な入力よりはるか上だが、L5 では依然として乗算を \`i128\` で行い、i64 に saturate して戻す。**反射は funding と同じ: i64 を超えうる積は、敵対的な入力で必ず超える。**

**Q5: \`MARGIN_SCALE\` と bps に \`u32\` を使って、i64 への変換ノイズを避けられないか?**

避けられる — そして \`i64::from(...)\` の呼び出しが数回減る。コスト: あらゆる margin-ratio 計算が \`equity\`（signed）と \`notional\`（unsigned）を含み、演算で signed/unsigned を混ぜると各サイトで明示的キャストが要る。境界で 1 回 i64 にアップキャスト（\`i64::from(params.initial_margin_bps)\`）して、その後の演算は signed で通すほうがよい。**境界で変換し、計算は 1 つの型で。**

## 次のレッスン (L2)

L2 では \`MarginRatio\` newtype + \`MarginHealth\` enum を追加する。\`MarginHealth\` は load-bearing な分類型で、次の 5 レッスンはすべてこれを return または consume する。なぜ \`bool\` でも \`u8\` でもなく 4-variant enum にしたかを見ていく。
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

- **なぜ \`MarginRatio\` は \`type\` alias ではなく newtype か** — newtype は「bps スケールの ratio を期待しているところに生の i64 を渡した」というバグをコンパイル時に捕まえる。Funding の \`MarkPrice(pub u64)\` vs \`u64\` と同じ規律。
- **なぜ \`MarginHealth\` がちょうど 4 variants か** — \`Safe\`、\`AtRisk\`、\`Liquidatable\`、\`Underwater\`。それぞれが異なるエンジン動作を許可する。どれを潰してもエンジンの他の部分が必要とする情報が失われる。
- **各 variant がエンジンの残りに対して何を許可するか** — 頭に入れておける小さな decision matrix。
- **なぜ enum に \`PartialOrd\` / \`Ord\` を *derive しない* か** — variants は自然に worsening order を成すが、\`health > Safe\` のような順序比較は明示的な \`matches!\` パターンに比べてコード臭がする。

確認:

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

…がコンパイルされる。

具体的な変更:

- **\`src/types.rs\`** — 既存の \`MARGIN_SCALE\` 定数 + \`LiquidationParams\` 構造体の下に、\`MARGIN_SCALE\` スケールの \`MarginRatio\` newtype と \`MarginHealth\` enum を追加する。L1 で書いたものは触らない。
- **\`src/lib.rs\`** — 既存の \`pub use types::{...}\` re-export に \`MarginRatio\` と \`MarginHealth\` を追加する。

L2 にもテストはない — \`MarginRatio\` と \`MarginHealth\` は受動的なデータ型だ。L3 で \`AccountSnapshot\` + \`CloseOrderSpec\` を追加して types モジュールを閉じる（こちらもテストなし）。最初の挙動テストは L4 の \`notional_value\` で来る。

## おさらい

L1 の後:
- クレートには \`MARGIN_SCALE\`（10⁴）と \`hyperliquid_default()\` を持つ \`LiquidationParams\` がある。
- \`lib.rs\` は両方を \`types\` から re-export している。
- \`cargo build -p openhl-liquidation\` が pass する。\`MarginHealth\` への rustdoc warning が 1 つ残っている（この時点ではまだ未解決）。

L2 ではエンジンの残り部分が話す 2 つの分類型を追加する。L4 以降、\`margin_ratio\` は \`MarginRatio\` を返し、\`margin_health\` は \`MarginHealth\` を返す。

## 計画

2 つの編集、両方とも小さい:

1. **\`crates/liquidation/src/types.rs\` の末尾に追記** — \`MARGIN_SCALE\` 基準の docs を伴う \`MarginRatio(pub i64)\` newtype と、4 variants + variant ごとの authorization 意味を説明する doc コメントを持つ \`MarginHealth\` enum。
2. **\`crates/liquidation/src/lib.rs\` を更新** — \`pub use types::{...}\` 行を 2 つの新しい名前を含むよう拡張する。

> 🛑 **予測。** スクロール前に: \`MarginHealth\` は enum になる予定。何個の variants が必要か? ヒント: エンジンは各アカウントについて 3 つの判断を下さなければならない — (a) アカウントは新しいリスクを取れるか? (b) エンジンはポジションを force-close すべきか? (c) close するだけで不足分をカバーできるか、それとも insurance fund が介入する必要があるか?

（答え: **3 つの問い → 4 variants。** \`Safe\` = (a) yes。\`AtRisk\` = (a) no、(b) no。\`Liquidatable\` = (a) no、(b) yes、(c) yes（close だけで足りる）。\`Underwater\` = (a) no、(b) yes、(c) no（insurance fund が不足分を吸収）。3-variant enum（Safe/AtRisk/Liquidatable）は Liquidatable と Underwater を潰してしまい、「insurance fund が関与するか?」の信号を失う。エンジンはそれを再計算しなくてよい — variant にすでに反映されているから。）

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

この 25 行で気づくべき 5 点:

1. **\`MarginRatio(pub i64)\` は newtype。** \`type MarginRatio = i64\` の alias ではない。Newtype は型チェッカーに足場を与える: \`MarginRatio\` を取る関数を、balance や account ID、\`MarkPrice\` を意図した生の \`i64\` 値で呼び出すことができなくなる。\`pub i64\` フィールドは、呼び出し側が \`MarginRatio(1000)\` で構築し、\`ratio.0\` で読めることを意味する — 守るべきカプセル化不変量はない。

2. **\`MarginRatio\` は多くの trait を derive している — \`Default\`、\`PartialOrd\`、\`Ord\`、\`Hash\`。** これらの default は engine が要求しているわけではないが、下流のコード（telemetry、Stage 10c の worst-health 順 scanner、ダッシュボード）が \`MarginRatio\` を他の比較可能な値型と同じように扱えるようにする。\`MarginRatio::default()\` は \`MarginRatio(0)\` で、意味的には「ratio 未計算」または「ゼロ初期化済み」。Engine 自身は \`default()\` を読まない。常に snapshot から計算する。

3. **\`MarginHealth\` は \`PartialOrd\` / \`Ord\` を derive *していない*。** variants は自然に順序付けされる（Safe < AtRisk < Liquidatable < Underwater が worsening 方向）が、enum での順序比較はコード臭がする。\`if health > MarginHealth::AtRisk\` より \`if matches!(health, MarginHealth::Liquidatable | MarginHealth::Underwater)\` のほうが明確。コンパイラが明示的なパターンを強制し、将来の保守者は分岐がどの variants をカバーするかを正確に見られる。

4. **Variant ごとの doc コメントは *authorization* を説明する、数学ではなく。** 「Margin ratio < maintenance」は variant が発火するタイミングを示すが、コメントはエンジンが応答してすることも書いている（「ポジションを market で liquidate すべき」）。ここの doc コメントは「Liquidatable がシステムの残り部分にとって何を意味するか」の正式な参照になる。

5. **Variant の順序は worsening health に対応している。** ソースでの並びは Safe → AtRisk → Liquidatable → Underwater の順。これはコンパイラにとって load-bearing ではない — Rust の enum は derive したもの以外に固有の順序を持たない — が、網羅的な \`match\` を読むときに自然な順序（最良ケース最初、最悪ケース最後）と一致する。

> 🛑 **やりがちな勘違い。** 「\`MarginHealth\` は \`bool\` でよいのでは — liquidatable か否か?」 **だめ、エンジンは 1 つではなく 3 つの下流判断を要求するから。** \`bool\` は (a)「新しいポジションを開けるか?」と (c)「insurance fund が関与するか?」を 1 ビットに潰す。後でこれを直すコストは、\`bool\` を返していたすべての呼び出しサイトを巡って型を変えること — 今正しくするコストは余計な variants 2 つだけ。

### Step 2: \`src/lib.rs\` を更新

\`crates/liquidation/src/lib.rs\` を開く。\`pub use types::{...}\` 行を拡張する。元:

\`\`\`rust
pub use types::{LiquidationParams, MARGIN_SCALE};
\`\`\`

更新後:

\`\`\`rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
\`\`\`

これが \`lib.rs\` の全変更 — クレートルートで public になる新しい名前が 3 つ、アルファベット順。定数は慣例的に末尾なので \`MARGIN_SCALE\` は最後のまま。

L1 で出ていた \`[\`MarginHealth\`]\` の rustdoc warning がここで解決する — 型が存在するようになったから。

### Step 3: コンパイル

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

Warning ゼロ。L1 の \`MarginHealth\` への rustdoc warning も消える。

エラーが出た場合に多い原因:

- **\`error[E0432]: unresolved import 'crate::types::MarginRatio'\`** — \`pub use\` 行の typo（例: \`MarignRatio\`）。型名を一字一句一致させる。
- **\`error: ambiguous re-export\`** — 既存の \`pub use\` を拡張せずに、誤って下に 2 行目を足した。re-export はすべて 1 つの \`pub use types::{...}\` ブロックに収める。Formatter もこの形を期待する。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **\`MarginRatio(pub i64)\` newtype、\`type MarginRatio = i64\` ではない。** Alias はゼロコストだがゼロセーフティ: コンパイラは同じ型として扱う。Newtype はランタイム上もゼロコスト（単一フィールド構造体はフィールドと同じレイアウト）だが、コンパイラが強制する本物の区別を生む。**値が「このビットパターンの整数」を超えた意味を運ぶときは、必ず newtype を使う。**

2. **\`MarginHealth\` が 4 variants なのは、エンジンが下流で 3 つの判断をするから。** 各 variant がそれら 3 つの判断のユニークな組み合わせにきれいに対応する。5 番目の variant（「ImminentlyLiquidatable」?「RecentlyClosed」?）は 4 番目の判断を必要とする。それが現れるまで、4 が正しい数。**Enum のカーディナリティを、それが許可する action のカーディナリティに合わせる。**

3. **\`MarginHealth\` に \`PartialOrd\` なし。** Variants は自然に順序付けされるが、enum での順序比較は具体性を失う（\`health > AtRisk\` は *どの* 「AtRisk より悪い」か言わない — \`Liquidatable\` か \`Underwater\` か?）。明示的な \`matches!\` パターンはすべての分岐に対象 variants を綴ることを強制し、\`rustc -W non_exhaustive_omitted_patterns\` が忘れたケースを捕まえる。**比較可能な enum は通常コード臭。まず \`matches!\` に手を伸ばす。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L2 の後:
- **types.rs** は Stage 10a の types.rs の 1 行目から \`MarginHealth::Underwater\` までと一致する — L1 で書いた \`MARGIN_SCALE\` + \`LiquidationParams\` に新しい \`MarginRatio\` + \`MarginHealth\` を加えたもの。次の 2 型（\`AccountSnapshot\`、\`CloseOrderSpec\`）は L3。
- **lib.rs** は Stage 10a の lib.rs から \`compute\` モジュールと 6 つの追加 re-export を除いたものと一致する — それらは L4–L7 で来る。

## よくある質問

**Q1: なぜ \`MarginRatio\` は \`Display\` を実装しないのか?**

実装してもよい。値はただ bps 単位の i64 だから。実装しない理由は、production のコードパスのどこも \`MarginRatio\` をエンドユーザー向け表示用に直接フォーマットしないから — bridge レイヤーが \`.0\` を取り出し、既知のスケールで render する（\`"{}%"\`、\`ratio.0 / 100\`）。\`Display\` を追加すると、呼び出し側が \`MarginRatio\` を生の整数としてログに出すよう誘ってしまい、bps スケールが見えなくなる。**Trait は必要とするレイヤーで実装する。**

**Q2: \`MarginHealth\` を \`u8\` にしてメモリを節約できないか?**

Payload なしの 4 variants に対する Rust の enum レイアウトはすでに \`u8\` に収まる — \`size_of::<MarginHealth>() == 1\`。コンパイラが最小の discriminant を選ぶ。生の \`u8\` に切り替えると、名前付き variants と \`match\` の exhaustiveness check を失い、何も得られない。

**Q3: Variant に payload を持たせるべきか（例: \`AtRisk { headroom_bps: u32 }\`）?**

魅力的だが時期尚早。下流の consumer（Stage 10c scanner、ダッシュボード）は必要なものを背後の margin_ratio から再導出する。Variant payload は構築のオーバーヘッドを増やし、\`match\` の使い勝手を複雑にする。**すべての consumer が payload から利益を得るのでない限り、enum は payload なしに保つ。**

**Q4: \`Liquidatable\` が「close + 場合によって deficit absorb」を含意できるなら、なぜ \`Underwater\` を別 variant にするのか?**

bridge が両ケースで *別の挙動* をする必要があるから。\`Liquidatable\` のアカウントは close order を 1 つ生成し、engine は fee と残額を通常通り settle する。\`Underwater\` のアカウントは close order に加えて、bridge が atomic に適用しなければならない credit-to-insurance-fund エントリを生成する。Variants を分離することで、ケースの違いを型レベルに押し上げ、網羅的な \`match\` がそれを捕まえる。マージすると、ケース判別が bridge 内のランタイム分岐に押し下げられ、見落としやすくなる。**State machine は、それが trigger する action を反映する variants から利益を得る。**

**Q5: \`margin_health\` は flat なポジションに対して \`Option<MarginHealth>\` を返すべきか?**

No — flat なポジションは \`MarginHealth::Safe\` を返す（notional がなく、満たすべき margin 要件もない）。\`Option\` はすべての呼び出し側に \`None\` を明示的に処理させてしまう。「flat = safe」は曖昧でないにもかかわらず。**型システムがすでに扱える状態を表現するために \`Option\` を足さない。**

## 次のレッスン (L3)

L3 では \`AccountSnapshot\`（すべての margin 関数の入力）と \`CloseOrderSpec\`（エンジンが bridge に渡す出力）で types モジュールを閉じる。L3 の後、types モジュールは完成する。L4 で compute モジュールを \`notional_value\` から始める。
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

- **なぜ liquidation は \`funding::Position\` を再利用せず独自の \`AccountSnapshot\` を定義するか** — \`Position\` は \`(account, size)\` を運ぶ。Liquidation は \`(account, size, avg_entry, collateral)\` を要求する。2 つの crate、2 つの snapshot 型、cross-coupling なし。Bridge レイヤーがそれぞれを自分の台帳から組み立てる。
- **Funding と共有する「snapshot」の規律** — エンジンは呼び出し側が build した snapshot を consume する。エンジン自身は可変なアカウント state を所有しない。Proptest が determinism のバグを捕まえられる I/O-free な純粋さがそれを支える。
- **なぜ \`CloseOrderSpec\` は price フィールドを持たないか** — Liquidation は常に market で close する。エンジンは価格を選ばない。Bridge がこれを \`clob::Action::SubmitMarket\` に変換し、板は次に利用可能な価格で約定する。
- **なぜ \`Side\` と \`Qty\` は新しい liquidation-local 型ではなく \`openhl_clob\` から来るか** — matching engine が話すのと同じ概念。2 つの crate に並行する \`Side\` enum を 2 つ置くと、drift を待つ翻訳サーフェスができる。

確認:

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

…がコンパイルされる。本レッスン後、\`types\` モジュールは完成する。

具体的な変更:

- **\`src/types.rs\`** — 既存の \`MarginHealth\` enum の下に \`AccountSnapshot\` と \`CloseOrderSpec\` 構造体を追記する。L1 や L2 で書いたものは触らない。
- **\`src/lib.rs\`** — \`pub use types::{...}\` re-export に \`AccountSnapshot\` と \`CloseOrderSpec\` を追加する。

L3 にもテストはない — 両方の新しい構造体は受動的なデータコンテナだ。L4 で \`compute\` モジュールを始め、最初の挙動テスト（\`notional_value\`）が来る。

## おさらい

L2 の後:
- \`types.rs\` には \`MARGIN_SCALE\` + \`LiquidationParams\`（L1）+ \`MarginRatio\` + \`MarginHealth\`（L2）がある。
- \`lib.rs\` は 4 つの名前を re-export している: \`LiquidationParams\`、\`MarginHealth\`、\`MarginRatio\`、\`MARGIN_SCALE\`。
- \`cargo build -p openhl-liquidation\` が warning ゼロで pass する。

L3 では 2 つの **I/O 型**を追加する: あらゆる margin 関数が consume する入力（\`AccountSnapshot\`）と、エンジンが bridge に渡す出力（\`CloseOrderSpec\`）。L3 の後、types モジュールは完成する — Course 10 の Module 1 が閉じる。

## 計画

2 つの編集、どちらも追記のみ:

1. **\`crates/liquidation/src/types.rs\` に \`AccountSnapshot\` を追記** — 4 フィールド、\`Copy\`-friendly、約定の積み重ねを通じて \`avg_entry\` を保つ呼び出し側の責務を doc コメントで明示。
2. **\`CloseOrderSpec\` をその下に追記** — 3 フィールド、price なし、消費者として bridge を doc コメントで指名。
3. **\`crates/liquidation/src/lib.rs\` を更新** — \`pub use types::{...}\` 行を拡張する。

> 🛑 **予測。** スクロール前に: liquidation はアカウントごとに unrealized PnL を計算する必要がある。その式は \`(mark - entry) * size\`。**\`funding::Position\` がくれない入力は何か、そしてなぜ funding はそれを必要としなかったのか?** ヒント: funding の式は \`size * mark * rate\` だ — 何が抜けているか見てみる。

（答え: **\`avg_entry\`（PnL の項を計算するため）と \`collateral\`（equity を計算するため）。** Funding の式に \`entry\` 係数はない — ポジションが開かれた場所に関係なく、現在の mark に rate を掛けてスケールするだけ。Funding はまた collateral を読まない。Funding が emit する settlement delta は bridge レイヤーで balance に適用され、bridge が自身の balance 台帳を持っている。Liquidation の仕事は collateral + unrealized PnL がしきい値を下回ったかを *測る* ことなので、両方を必要とする。違う仕事、違う snapshot。）

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

この 10 行で気づくべき 5 点:

1. **4 フィールド、すべて \`Copy\`。** \`AccountId\`（\`u64\`）、\`PositionSize\`（\`i64\`）、\`MarkPrice\`（\`u64\`）、\`Notional\`（\`i64\`）。スタックサイズ合計 32 バイト。エンジンはほとんどの呼び出しで snapshot を参照渡し（\`&AccountSnapshot\`）するが、\`Copy\` derive のおかげで、呼び出し側が誤って \`&\` 参照を落としても borrow checker と戦わずに済む。

2. **\`avg_entry: MarkPrice\`、新しい \`EntryPrice\` 型ではない。** ポジションが開かれた価格は、現在ポジションが測られている mark price と同じ unit-of-account に住む。別の \`EntryPrice\` newtype を定義すると、すべての PnL 計算サイトで変換が必要になり、意味的な利益は何もない。**2 つのフィールドが同じ物理量を測るなら、型を共有する。**

3. **\`collateral: Notional\` — signed。** Collateral は *預け入れ* 資金で慣例的に非負だが、\`Notional\`（signed）にしているのは \`account_equity = collateral + unrealized_pnl\` を signed sum として流す必要があるから。\`collateral\` を unsigned にすると、すべての equity 計算で \`as i64\` キャストが必要になる。**境界で変換し、計算は 1 つの signed 型で。**

4. **\`pub\` フィールド、コンストラクタ関数なし。** L1 の \`LiquidationParams\` と同じ慣例: 透明な構造体、カプセル化不変量なし。Bridge レイヤーは \`AccountSnapshot { account: …, position_size: …, … }\` を直接 build する。\`AccountSnapshot::new()\` がない理由は、コンストラクタが強制すべきものがないから。

5. **Doc コメントが呼び出し側の契約を明示する。** "*The owning layer (vault / clearing) is responsible for maintaining this across fills.*" この 1 文が \`avg_entry\` 不変量のすべて: liquidation は fill を track しない、entry を再計算しない、partial close を reconcile しない。それらの責務は 1 つ上のレイヤーに住む。**Crate doc は *この* crate が保証することを言う。呼び出し側に要求することは、型の doc コメントに書く。**

> 🛑 **やりがちな勘違い。** 「\`AccountSnapshot\` を \`openhl-funding\` に置いて、両 crate が同じ型を使えるようにしたほうがよいのでは?」 **funding は \`avg_entry\` も \`collateral\` も必要としないから — それを \`funding::Position\` に追加すれば funding snapshot が無駄に膨らみ、bridge が funding が無視するフィールドを populate しなければならなくなる。** 2 つの crate、2 つの snapshot 型が正しい形。Bridge が正典の account ledger を保持し、tick ごとに 2 つの異なる snapshot view を生成するのは安価。

### Step 2: \`src/types.rs\` に \`CloseOrderSpec\` を追記

\`src/types.rs\` の中で続けて。\`AccountSnapshot\` を閉じる \`}\` の後に追記:

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

気づくべき 3 点:

1. **\`price\` フィールドなし。** Liquidation は価格を選ばない。エンジンは market order の仕様を生成し、matching engine が板に存在する深さで約定する。Stage 10c で \`AccountSnapshot\` のスライスを走査し、\`Liquidatable\` または \`Underwater\` のアカウントごとに \`CloseOrderSpec\` を 1 つ emit する。どれも limit を持たない。

2. **\`side: Side\` は \`openhl_clob::Side\` を再利用する。** Matching engine は \`Side::{Buy, Sell}\` で話す。新しい \`liquidation::Side\` enum を定義して bridge で変換すると、drift しうる翻訳サーフェスを導入してしまう（一方の crate で 3 番目の side variant を足したが他方には足さなかった、など）。**1 つの enum、1 つの真実の源泉。**

3. **\`qty: Qty\` は \`openhl_clob::Qty(u64)\` を再利用する。** Doc コメントは「position size の絶対値」と言っている — \`PositionSize\` は \`i64\`（signed）だが、close する数量は常に正。変換（\`Qty(position_size.0.unsigned_abs())\`）は L7 の \`compute::close_order_spec\` で起きる。ここでは *出力型* が unsigned であることに commit するだけだ。

> 🛑 **予測。** スクロール前に: \`CloseOrderSpec\` は close が起きた *理由*（Liquidatable vs Underwater）を表す \`Reason\` フィールドを持たない。持つべきか? ヒント: 誰が spec を consume し、どんな情報を必要とするかを考える。

（答え: **No。** Bridge は spec を consume して 2 つのことをする: close order を submit し、（Underwater アカウントに対しては）insurance fund を credit する。エンジンは両方を signal する — Stage 10c の scanner は \`CloseOrderSpec\` を emit する *と同時に* Underwater だったアカウントに対して \`InsuranceFundDelta\` を emit する。Close spec に \`Reason\` フィールドを追加すると、spec と insurance-fund delta の間で signal が重複し、将来のリファクタリングが両者を乖離させうる。**同じ事実を 2 箇所に表現しない — 上流の出力を真実の源泉にし、下流の consumer は必要なものだけを運ぶ。**）

### Step 3: \`src/lib.rs\` を更新

\`crates/liquidation/src/lib.rs\` を開く。\`pub use types::{...}\` 行を拡張する。元:

\`\`\`rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
\`\`\`

更新後:

\`\`\`rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

新しい名前が 2 つ追加された — \`AccountSnapshot\` と \`CloseOrderSpec\` — アルファベット順に挿入されている（だから \`AccountSnapshot\` が最初、その後 \`CloseOrderSpec\`、残りは同じ順序）。リストが ~5 項目を超えると行が複数行にわたる。次回保存時 rustfmt が 1 行 1 名前のブロックに整形する（追記を続ければ）。

### Step 4: コンパイル

\`\`\`bash
cargo build -p openhl-liquidation
\`\`\`

期待される出力:

\`\`\`
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished \`dev\` profile [unoptimized + debuginfo] in 0.4s
\`\`\`

Warning ゼロ、エラーゼロ。Liquidation crate の \`types\` モジュールが完成した。

エラーが出た場合に多い原因:

- **\`error[E0432]: unresolved import 'openhl_clob::Qty'\`** — \`types.rs\` の冒頭の import 行はすでに \`Qty\` を名指ししている（L1 の types.rs scaffold で追加済み）ので、これが fire するのは import を削った場合のみ。もし出たら、L1 時代の冒頭行は依然として \`use openhl_clob::{AccountId, Qty, Side};\` と \`use openhl_funding::{MarkPrice, Notional, PositionSize};\` であるはず — 同じ import が L2 と L3 の両方をカバーする。
- **\`error: cannot find type 'Notional'\`** — 同じ根本原因。\`use openhl_funding::{…}\` 行に \`Notional\` が含まれているか確認する。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **\`AccountSnapshot\` は liquidation-local、\`openhl-funding\` の共有型ではない。** 2 つの crate は仕事が違う — funding は連続的な rate 駆動のデルタを settle する、liquidation は離散的な margin イベントを classify する — snapshot 型を強制的に共有させると、両側で bridge のデータ配管が結合する。**関連はあるが必要なものが違う 2 つの crate は、2 つの snapshot 型に値する。**

2. **\`CloseOrderSpec\` は price を運ばない。** エンジンの責任は close するか *否か* を決めることであって、*いくらで* かではない。Bridge レイヤーが spec を market order に翻訳し、matching engine が存在する深さで約定する。**価格を選ぶメカニズムは、アクションを決める policy レイヤーの下に住む。**

3. **\`Side\` と \`Qty\` は \`openhl_clob\` から来る、並行する liquidation-local 型ではない。** 2 つの crate がメッセージを交換するとき、同じ語彙の型で話すべき。2 つの \`Side\` enum は境界で 2 つの \`impl From\` ブロックを意味し、永久に調整税がかかる。**境界の型は共有し、内部の型は特殊化する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L3 の後:
- **types.rs** は **Stage 10a の types.rs と byte-for-byte 完全一致**。Course 10 の Module 1 はこの types モジュールをそのまま ship する。
- **lib.rs** はまだ \`pub mod compute;\` と compute の re-export が欠けている。それらは L4–L7 で来る。

## よくある質問

**Q1: \`AccountSnapshot\` を position-type trait に対する generic にして、funding と liquidation が抽象的な snapshot を共有できないか?**

できるが時期尚早。両 crate はそれぞれ必要なフィールドが 1 ページに収まる。抽象的な \`Snapshot<P: PositionLike>\` trait を導入すると、bridge が操作する必要のない型機構が増える。**crate ごとに具体型を持ち、bridge が翻訳するほうが、読むのも refactor するのも安い。**

**Q2: なぜ \`avg_entry\` は専用の \`EntryPrice\` newtype ではなく \`MarkPrice\` を使うのか?**

ポジションが開かれた価格と、ポジションが現在測られている価格は、同じ単位だから — 同じスケール、同じ真実の源泉（慣例上、matching engine の last fill price）。\`MarkPrice(u64)\` と並行して \`EntryPrice(u64)\` を定義すると、すべての PnL サイトで変換が必要になる。**2 つの値が単位を共有するなら、型も共有する。**

**Q3: \`collateral\` は負になり得るか?**

エンジンの目線では: いいえ、*預けられた* collateral は常に非負。ただし \`Notional\` は signed なのは、(a) funding が settlement delta に使う型で、デルタは *負になり得る* から、(b) 中間 equity 計算 \`collateral + unrealized_pnl\` は signed 結果を生むから。\`collateral\` 自体を unsigned にすると、すべての equity サイトでキャストが必要になる。**上流は signed 演算、境界で範囲チェック。**

**Q4: \`CloseOrderSpec\` に上流の文脈用に \`bridge_metadata: Bytes\` フィールドを持たせるべきか?**

No — Stage 10c は \`CloseOrderSpec\` をエンベロープなしで直接 bridge に渡す。Close を trigger と関連付ける必要があるなら（監査ログ、telemetry）、bridge は spec の外側で \`(snapshot.account, current_block_height)\` を使ってそれをできる。**下流の機能のために上流の型を膨らませない。**

**Q5: なぜ両構造体が \`Copy\` なのか?**

安価で便利だから。\`AccountSnapshot\` は 32 バイト、\`CloseOrderSpec\` は 24 バイト — このサイズでは Copy は本質的にタダ。Copy がないと、2 つ目の参照が欲しいたびに呼び出し側が clone する必要がある。**小さな Plain-Old-Data 型は \`Copy\` にする。\`Clone\` に手を伸ばすのは所有権セマンティクスが本当に意味を持つときだけ。**

## 次のレッスン (L4)

L4 で \`compute\` モジュールが始まる。最初の 2 関数 — \`notional_value\` と \`unrealized_pnl\` — が liquidation crate の最初の挙動テストを稼ぐ。同じコードパスがロングとショート両方のポジションに対して正しい符号を生み出す signed-multiplication のトリックと、network-pathological な入力で i64 オーバーフローから乗算を守る i128 中間値の規律を見ていく。
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

- **なぜ \`notional_value\` は \`u64\` を返し、\`unrealized_pnl\` は \`i64\` を返すか** — notional exposure は常に非負（\`|size| × mark\`）。PnL は signed（\`mark − entry\` は両側に振れる）。それぞれを return type で示すことで、呼び出しサイトでの sign-confusion バグをコンパイラが捕まえられる。
- **\`i64\` には \`abs()\` ではなく \`unsigned_abs()\`** — \`i64::MIN.abs()\` はオーバーフローする（正の \`i64::MIN\` は存在しない）。\`unsigned_abs()\` は \`u64\` を返し、panic しない。signed integer の magnitude が欲しいときは常にこれを使う。
- **分岐なしでロングとショートを処理する signed-multiplication のトリック** — \`(mark − entry) × size\`、\`size\` は signed。4 つの符号の組み合わせがすべて自然に正しい PnL に解決する。\`if side == Long\` はどこにもいらない。
- **i128 中間値の規律** — sign-preserving な減算（\`i128::from(mark.0) − i128::from(entry.0)\`）の後、overflow-safe な積、最後に \`i64\` に saturate して戻す。Funding の \`compute_premium\` と同じ形状。
- **\`saturate_i128_to_i64\` が load-bearing ヘルパー** — network-pathological な入力で \`i64::MAX\` を *超えうる* 積は、いつかは超える。Saturate であって panic ではない。

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…が 8 つのテストを pass する（\`notional_value\` 用 3 つ + \`unrealized_pnl\` 用 5 つ）。

具体的な変更:

- **\`crates/liquidation/src/compute.rs\` を作成** — このファイルはまだ存在しない。モジュール docs + imports + 2 つの公開関数 + 1 つの private ヘルパー + 8 つの unit test を入れた \`#[cfg(test)]\` ブロック。
- **\`src/lib.rs\`** — \`pub mod compute;\` を追加し、re-export に \`notional_value\` と \`unrealized_pnl\` を加える。

L4 はテストが走る最初のレッスンだ。ここから各レッスンが L8（\`close_order_spec\`、Stage 10a 挙動の最後）までテストを追加していく。

## おさらい

L3 の後:
- Types モジュールは Stage 10a に対して byte-for-byte 完成 — \`MARGIN_SCALE\`、\`LiquidationParams\`、\`MarginRatio\`、\`MarginHealth\`、\`AccountSnapshot\`、\`CloseOrderSpec\`。
- Compute モジュールはまだ存在しない。
- \`cargo build\` は pass する。\`cargo test\` はゼロ件走る。

L4 で compute モジュールを作成する。最初の 2 関数が「このアカウントは *現在* どう見えるか?」 — その notional exposure と unrealized PnL — に答える。L5 ではその上に equity と margin ratio を build する。

## 計画

2 つの編集:

1. **\`crates/liquidation/src/compute.rs\` を作成** — モジュール docs + L1-L3 から \`AccountSnapshot\`、\`MarkPrice\` を import する \`use\` 文 + \`notional_value\` + \`unrealized_pnl\` + private な \`saturate_i128_to_i64\` ヘルパー + \`#[cfg(test)]\` テストブロック（notional 3 個 + PnL 5 個）。
2. **\`src/lib.rs\` を更新** — \`pub mod compute;\` を追加し、公開 re-export を 2 つの新関数名で拡張する。

> 🛑 **予測。** スクロール前に: \`unrealized_pnl\` は long が profit のときも short が profit のときも *正* を返す必要がある。素朴な形は:
>
> \`\`\`rust
> if size > 0 {  // long
>     (mark - entry) * size.abs()
> } else {       // short
>     (entry - mark) * size.abs()
> }
> \`\`\`
>
> これは動くが分岐する。**4 つの符号の組み合わせをすべて \`if\` なしで正しく扱う single-expression の式がある。** 何か? ヒント: \`(mark - entry) * size\` という式で、\`size\` 自体が long/short の符号を運んでいたら何が起きるか考える。

（答え: **\`(mark − entry) × size\`、\`size\` は signed \`i64\`。** 4 ケースを辿る:
- Long（\`size = +10\`）、mark > entry: 正 × 正 = 正の profit ✓
- Long（\`size = +10\`）、mark < entry: 負 × 正 = 負の loss ✓
- Short（\`size = −10\`）、mark > entry: 正 × 負 = 負の loss ✓
- Short（\`size = −10\`）、mark < entry: 負 × 負 = 正の profit ✓

すべてのケースで符号が正しく着地する。**分岐なし、2 つのコードパスを別々にテストする必要なし、誰かが片方の分岐だけ「直して」もう片方を放置するリスクなし。** これが \`PositionSize\` を signed にした load-bearing な理由 — 型が long/short の区別を運ぶので、演算が運ぶ必要がない。）

## 手を動かす walk-through

### Step 1: \`src/compute.rs\` を作成

\`crates/liquidation/src/compute.rs\` を作成する。このファイルはまだ存在しない。初期内容:

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

モジュール doc には 6 つの関数を挙げているが、L4 で着地するのはその 2 つだけ。次の 4 つ（\`account_equity\`、\`margin_ratio\`、\`margin_health\`、\`close_order_spec\`）は L5–L7 で来る。6 つすべてを前もって挙げておけば、レッスンごとにモジュール doc を編集し直さずに済む。文脈なしでここに辿り着いた読者にとってのロードマップにもなる。

> 🛑 **やりがちな勘違い。** 「L4 は \`AccountSnapshot\` と \`MarkPrice\` しか使わないのに、なぜ \`CloseOrderSpec\`、\`Side\`、\`Qty\`、\`LiquidationParams\`、\`MarginHealth\`、\`MarginRatio\` を import するのか?」 **次のすべてのレッスンが使うから — まとめて L4 で import を追加しておけば、各レッスンの diff が追加される関数だけにフォーカスされる。** Rust は L5+ まで unused import warning を出す。Funding L1 が後から来る型の rustdoc warning を許容したのと同じ要領でそれを許容する。代替案 — \`use\` 行を L4–L7 で 6 回編集する — は busywork で、各レッスンが実際に何を加えているのかを曖昧にする。

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

この 7 行の関数で気づくべき 3 点:

1. **Return type は \`u64\`、\`i64\` ではない。** Notional は exposure の *magnitude* — 常に非負。\`u64\` を返すことで「呼び出し側が abs を取り忘れた?」を不可能にする: 型システムがそれを強制する。Notional を signed な計算（L5 の \`margin_ratio\` の割り算など）に流したい呼び出し側は、呼び出しサイトで明示的な \`i64::from(notional_value(...))\` を行う。**変換は 1 行。それで防げるのは production まで生き残る silent な sign error の一群。**

2. **\`snapshot.position_size.0.unsigned_abs()\`、\`.abs()\` ではない。** \`i64::abs\` は \`i64\` を返す — そして \`i64::MIN.abs()\` は safe Rust で未定義（debug で panic、release で wrap）。\`unsigned_abs\` は \`u64\` を返し、\`i64::MIN\` を含むあらゆる入力に対して定義されている（\`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808\`）。**Signed integer の magnitude が必要なら常に \`unsigned_abs\` を使う。\`abs\` は値が \`MIN\` になりえないと確信できるときだけにする。**

3. **\`u64::saturating_mul\`、\`u64::checked_mul\` ではない。** 両方ともオーバーフローを検出する。\`saturating_mul\` はオーバーフロー時に \`u64::MAX\` を返し、\`checked_mul\` は \`None\` を返す。\`Option<u64>\` を返すと、L5 の margin_ratio 等のすべての呼び出し側に *network-pathological な入力でのみ* 起きる \`None\` を処理させてしまう。Saturating は、極端な入力で数学的に間違ってはいるが使える値を返す — そしてその極端な入力では margin engine はどのみちそのアカウントを \`Liquidatable\` と分類する。**「間違っているが bounded」が「Option を処理しなければならない」を上回るときの正しい failure mode は saturation。**

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

気づくべき 4 点:

1. **\`i128::from(mark.0) − i128::from(snapshot.avg_entry.0)\`、\`(mark.0 as i64) − (snapshot.avg_entry.0 as i64)\` ではない。** \`mark\` も \`entry\` も \`u64\`。Rust で \`u64 − u64\` の結果が負になると panic する。先に \`i64\` にキャストすると、どちらかが \`i64::MAX\` を超えていればトップビットが失われる。先に \`i128\` にアップキャストすれば full range が保たれ、サプライズなしに負になりうる signed 結果が得られる。**必要だと思うより広くアップキャストする — コストはゼロ、安全性は莫大。**

2. **\`saturating_mul\` は \`i128\` 上。** \`diff\` が \`u64::MAX\`（≈ 2⁶⁴）に近く、\`position_size\` が \`i64::MAX\`（≈ 2⁶³）に近いと積は ≈ 2¹²⁷ — \`i128\` の \`±2¹²⁷\` 範囲内だが、極端な入力での \`saturating_mul\` は安価な防御。Funding と同じパターン。

3. **末尾の \`saturate_i128_to_i64(pnl)\`。** 積の後は PnL は i128 領域にあるかもしれないが、下流のエンジンは \`i64\` を使う。変換失敗時に panic ではなく saturate するヘルパー — 同じ規律。（ヘルパー定義は Step 4。）

4. **Sign convention が doc に書かれている。** 4 ケース列挙（「Long は mark > entry のとき profit」）は、レビュアーが「待って、これは short でも動くの?」と聞いたときの正典的参照。数学が construction で正しいが、doc が *なぜ* かを言う — 読者がそのたびにメンタルウォークする必要がない。

> 🛑 **やりがちな勘違い。** 「\`(mark.0 as i64 − entry.0 as i64) × size\` を直接やってはダメか?」 **3 つの問題。** (1) \`mark\` か \`entry\` が \`i64::MAX\` を超えると、キャストが静かに wrap する — トップビットが符号ビットになる。(2) 両方が i64 に収まっても、片方が \`i64::MIN\` 近くで他方が正だと、i64 での減算がオーバーフローしうる。(3) 各オペランドが収まっていても、積 \`(mark − entry) × size\` が i64 を超えうる — \`i64::MAX\` サイズのポジションに対する 1% の値動きで overflow する。**\`as\` キャストは本レッスンが武装解除する Rust の footgun。**

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

この 3 行のヘルパーで気づくべき 3 点:

1. **\`pub\` なし。** これは \`compute.rs\` の実装上の選択。公開 API はモジュール doc に挙げた 6 関数。ヘルパーは本体をクリーンに保つために存在する。**他のモジュールの呼び出し側が本当に必要としない限り、ヘルパーは private に保つ。**

2. **\`i64::try_from(v).unwrap_or(...)\`。** \`try_from\` は値が収まらないときちょうど \`Err\` を返す。\`unwrap_or\` の分岐が saturation target を符号で選ぶ。\`v > 0\` なら値が大きすぎた（\`i64::MAX\` に saturate）。\`v ≤ 0\` なら小さすぎた（\`i64::MIN\` に saturate）。**3 行の演算、1 つの decision、typo 不可能。**

3. **ヘルパー自体のテストはない。** その挙動は \`unrealized_pnl\` のテストケース（happy-path と range の境界の両方を exercise する）を通じて網羅的にテストされる。ヘルパー専用のテストを足すのは冗長になる。

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

テストブロックで気づくべき 4 点:

1. **冒頭の \`snapshot()\` ヘルパー。** 3 つの整数引数（\`size\`、\`entry\`、\`collateral\`）— \`account\` は \`AccountId(42)\` にハードコード。8+ テストにわたってタイプ量を節約し、各テストの *意味のある* 入力（size の符号、entry と mark の関係）を見えるように保つ。**Test fixture は変動するものを露出し、定数を隠す。**

2. **4 つの PnL ケースが予測コールアウトの 4 つの符号の組み合わせと対応する。** \`pnl_long_profit\`、\`pnl_long_loss\`、\`pnl_short_profit\`、\`pnl_short_loss\`。加えて、size がゼロのパスを止める \`pnl_flat_is_zero\`。到達可能なすべての符号の組み合わせがテストされる。**符号の組み合わせの coverage が load-bearing — 1 つを見落とすと、将来のリファクタリングで side を静かに反転させてしまえる。**

3. **L4 に proptest はまだないのに \`use proptest::prelude::*;\`。** L5/L8 で proptest が追加されたとき、ここに既に import がある。\`compute.rs\` 本体の bulk imports と同じ推論 — 境界で 1 度書き、次の数レッスンで unused-import warning を許容する。

4. **テスト名は文。** \`pnl_long_profit\` は「PnL when long is in profit」と読める。テストが失敗したとき、失敗出力のテスト名が最初に目に入るもの — 本体を読まなくても何が壊れたか分かるくらい説明的にする。**\`fn test_1\`、\`fn test_2\` は CI noise。文断片の名前は CI signal。**

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

2 つの変更:

1. **\`pub mod compute;\`** を \`pub mod types;\` の上に — アルファベット順、既存の慣例と同じ。
2. **\`pub use compute::{notional_value, unrealized_pnl};\`** — 新しい re-export 行で、\`types\` の re-export とは別。各モジュールが独自の行を持つ。L5–L7 でさらに関数が来たら compute リストを拡張する。

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

**この 8 つのテストが、signed-multiplication のトリックが各符号の組み合わせで動くことの証明だ。** あなた（あるいは将来の貢献者）が \`unrealized_pnl\` を refactor したとき、これらのテストが sign convention を honest に保つ。

エラーが出た場合に多い原因:

- **\`warning: unused import: ...\`** — まとめて追加した import について。期待通り、L7 までに消える。
- **\`error[E0599]: no method named 'unsigned_abs' found for type 'i64'\`** — Rust のバージョンが古すぎる。\`unsigned_abs\` は Rust 1.51（2021）で安定化された。プロジェクトの \`rust-toolchain.toml\` が十分新しいバージョンを pin しているはず。
- **\`attempt to multiply with overflow\` でテストが失敗する** — debug ビルドで \`saturating_mul\` ではなく \`*\` を書いた。置き換える。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **\`notional_value: u64\`、\`unrealized_pnl: i64\`。** Return type は不変量を signal する。Notional は決して負にならない。PnL は両側にいきうる。両者を混ぜたい呼び出し側コードは明示的な変換をする（\`i64::from(notional)\`）。**呼び出しサイトでの変換 1 行が、production まで生き残る silent な sign バグの一群に勝つ。**

2. **分岐ではなく signed-multiplication symmetry。** \`(mark − entry) × size\` は \`size\` が long/short の符号を運ぶので、4 つの符号の組み合わせすべてを正しく解決する。分岐する代替案（\`if size > 0 { ... } else { ... }\`）はコードパスを 2 つに分け、テスト予算を倍にし、将来のリファクタリングで「long branch を直すのを忘れて short branch を放置する」バグのリスクを生む。**演算が自然に扱うケースは、型システムに運ばせる。**

3. **\`i64\` には \`abs\` より \`unsigned_abs\`。** \`i64::MIN.abs()\` は Rust の正典的 footgun だ: debug で panic、release で silently wrap。\`unsigned_abs\` は \`u64\` を返し、すべての \`i64\` 入力に対して定義されている。**Panic path を持たない方の演算を選ぶ。代替案は debug でしか出ないクラッシュで、release ビルドが喜んで隠す。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L4 の後:
- **compute.rs** は Stage 10a の \`compute.rs\` の最初の ~80 行と一致する — モジュール doc + imports + \`notional_value\` + \`unrealized_pnl\` + ヘルパー + 最初の 8 テスト。下の部分（次の 4 関数とそのテスト、3 つの proptest）は L5–L7 で着地する。
- **lib.rs** は compute 側の 4 つの追加 re-export（\`account_equity\`、\`margin_ratio\`、\`margin_health\`、\`close_order_spec\`）がまだ欠けている。それらが順次到着する。

## よくある質問

**Q1: \`notional_value\` は \`u64\`、\`mark\` も \`u64\` — 積が \`u64\` を overflow しないか?**

しうる、network-pathological な入力で（\`|size| × mark > 2⁶⁴\` になるほど大きなポジション）。それを \`saturating_mul\` が防ぐ。現実的なマーケットではこれは起こらない — 取引所のポジションサイズ制限が notional を \`u64::MAX\` よりはるかに下に保つ。Saturation は第二の防衛線。第一は上流の sanity check。

**Q2: なぜ \`saturate_i128_to_i64\` ヘルパーは private で、\`notional_value\` と \`unrealized_pnl\` は public なのか?**

ヘルパーは実装上の選択（saturating cast）。2 つの public 関数はエンジンの契約の一部 — margin を計算するすべてのコールサイトが必要とする。**Public は「呼び出し側がこれに依存する」。Private は「これがたまたまそれを内部でどうやっているか」を意味する。** 将来のリファクタリングが \`saturate_i128_to_i64\` を \`checked_mul\` + \`Option\` 伝播に置き換えても、呼び出し側は壊れない。

**Q3: Signed-multiplication のトリックは整数の極端値で誤った符号を出すか?**

数学的にはノー — 4 つの符号の組み合わせは初等代数から来る。だが算術的にはイエス: i64 を（さらに i128 も）overflow する積は、真の結果の符号の情報を失う。だからすべての中間値の積は \`i128::saturating_mul\` を使い、最後のキャストは i128 値の符号によって \`i64::MAX\` / \`i64::MIN\` に saturate する。**Saturation は magnitude を失うが、答えの *符号* は保つ。**

**Q4: \`unrealized_pnl\` は \`mark == 0\` のとき panic すべきか?**

No — \`mark = 0\` は奇妙だが未定義ではない。式 \`(0 − entry) × size = −entry × size\` は数学的に well-defined（そしてポジションを deeply underwater と分類するが、それは正しい挙動）。Production のデプロイはゼロ mark を *公開* するのを拒否する。もしすり抜けてきたら、エンジンはそれを graceful に扱う。**純粋関数は policy を決めない — 与えられた入力で計算する。**

**Q5: なぜ \`notional_value\` は \`&MarkPrice\` ではなく \`MarkPrice\` を受け取るのか?**

\`MarkPrice\` は \`Copy\` で 8 byte（\`u64\`）。このサイズの \`Copy\` 型なら、値渡しのほうが参照渡しより安価 — ポインタ間接参照なし、aliasing の懸念なし。**型が大きくてコピーが高価な場合、OR 所有権セマンティクスが意味を持つ場合に \`&\` に手を伸ばす。プリミティブをラップした \`Copy\` newtype については、値渡しが正しいデフォルト。**

## 次のレッスン (L5)

L5 では \`account_equity\` と \`margin_ratio\` を追加する — そして **Stage 10a で最も教育的に load-bearing な発見**: \`margin_ratio\` の levered-regime での非単調性。読者は先に proptest を書く（「long に対して mark が上がれば margin_ratio も上がるはず」）。小さな入力群でそれが失敗するのを見る。失敗が *なぜ* 本物か（バグではない）を辿る。\`prop_assume!\` で実際の不変量を表現するように proptest を refine する。これは学習者の margin math の最初のメンタルモデルが壊されて再構築されるレッスン。
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

- **なぜ \`account_equity\` は \`i64\` を返し、負になりうるか** — equity は \`collateral + unrealized_pnl\`。PnL の項は預けた collateral を突き抜けて不足を生みうる。エンジンはその不足を *測れる* 必要がある — そうしないと liquidation は正しいレバーを引けない。
- **なぜ \`margin_ratio\` は \`notional == 0\` を \`MarginRatio(i64::MAX)\` でガードするか** — flat なポジションは exposure ゼロ → margin 要件なし。表現可能な最大の ratio を返すことは「無限に safe」を signal し、下流のすべての分類器がそれを自然に short-circuit できる。
- **\`equity × MARGIN_SCALE / notional\` の i128 スケーリング規律** — 演算順序が重要: 先に i128 で乗算しておくと、高精度の numerator が割り算を生き残る。\`i64\` で先に割り算すると、小さい ratio で精度が落ちる。
- **\`margin_ratio\` の levered-regime での非単調性** — 最初の直感（「long に対して mark が上がれば margin_ratio も上がる」）は、\`collateral > entry × size\` の cash-heavy regime では **間違い**。Proptest がこれを捕まえる — そして直しは「関数を patch する」ではなく「不変量の表現を refine する」。
- **\`prop_assume!\` が条件付き不変量を表現する正しい方法** — 不変量が入力空間のサブセットでのみ成り立つとき、\`prop_assume!\` は assertion を弱めるのではなく、proptest の入力をそのサブセットにフィルタする。
- **Short vs long の monotonicity 非対称** — short ポジションは mark に対して *無条件に* monotonic。Long は levered condition の下でのみ。数学の微分がなぜかを説明する。

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…が 16 テストを pass する（L4 から 8 + 新規 unit test 5 + proptest 3、それぞれデフォルトの 256 ケース）。

具体的な変更:

- **\`src/compute.rs\`** — L4 の内容の下に \`account_equity\`、\`margin_ratio\`、unit test 5 個、proptest 3 個を追記。
- **\`src/lib.rs\`** — \`pub use compute::{...}\` re-export に \`account_equity\` と \`margin_ratio\` を拡張。

L5 は Stage 10a の教育的中心。急がない。Proptest の discovery ループ — 書く、失敗する、トレースする、refine する — がレッスンが教えるために存在する load-bearing なスキル。

## おさらい

L4 の後:
- Compute モジュールが存在し、\`notional_value\` と \`unrealized_pnl\` + private な \`saturate_i128_to_i64\` ヘルパーがある。
- 8 つの unit test が PnL の 4 つの符号の組み合わせと notional の 3 ケース（long、short、flat）をカバーする。
- \`cargo test\` が 8 テスト全部 green。

L5 では次のレイヤーを build する: PnL を account equity に変換（collateral を足す）、それから equity を notional で割って margin ratio を得る。それから最初の proptest を書き、本ステージを定義するサプライズに出会う。

## 計画

3 つのフェーズ:

1. **\`account_equity\` を追記** — 1 行関数、happy-path の unit test 1 個、「equity が負になる」unit test 1 個。
2. **\`margin_ratio\` を追記** — i128 スケールの除算 + flat-position ガード、unit test 3 個（flat は max を返す、ちょうど 10% の ratio、ratio が負になりうる）。
3. **Proptest ブロックを追加** — long-monotonicity proptest を素朴な形で書く、特定の入力で失敗するのを見る、なぜかをトレースする、\`prop_assume!\` で refine する、それから short-monotonicity（前提条件なし）と determinism の proptest を追加する。最終状態: 3 proptest、すべて green。

最後に \`lib.rs\` を更新。

> 🛑 **予測。** スクロール前に: long ポジションで \`collateral = 100\`、\`size = 1\`、\`entry = 100\` は mark = 100 で \`notional = 100\`、\`equity = 100\`（PnL ゼロ）。**mark = 100 での margin_ratio はいくらか?** そして mark = 110、mark = 50 では? 続きを読む前に、\`equity × MARGIN_SCALE / notional\` の式を各ケースについて辿る。

（ウォークスルー:
- **mark = 100**: notional = 1 × 100 = 100、pnl = (100 − 100) × 1 = 0、equity = 100 + 0 = 100、ratio = 100 × 10_000 / 100 = **10_000 bps = 100%**。
- **mark = 110**: notional = 110、pnl = 10、equity = 110、ratio = 110 × 10_000 / 110 = **10_000 bps = 100%**。
- **mark = 50**: notional = 50、pnl = −50、equity = 50、ratio = 50 × 10_000 / 50 = **10_000 bps = 100%**。

**Margin ratio が動かない!** Collateral がちょうど notional_at_entry に等しいので、どの mark でも PnL の動きを collateral が相殺する。このポジションは unlevered — exposure $1 ごとに collateral $1 を持っている。**ここが素朴な monotonicity の直感が壊れる regime** — \`collateral ≥ notional_at_entry\` の「cash-funded」ポジションは、mark が動くと margin ratio はどちらの方向にも動きうる。これを proptest でこの後すぐ目にする。）

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

この 6 行の関数で気づくべき 3 点:

1. **\`i64\` を返す、\`u64\` ではない。** Doc が「negative になりうる」と言い、型がそれを本物にする。これを下流で margin 計算に流す呼び出し側は、サプライズなしに signed 演算が使える。**値の実際の範囲に型を合わせる。**

2. **\`saturating_add\`、\`+\` や \`checked_add\` ではない。** 2 つの \`i64\` 値の足し算は極端で overflow しうる。\`saturating_add\` は overflow 時に \`i64::MAX\` か \`i64::MIN\` を返す。エンジンはどちらも明確な health state として分類でき、\`Option\` を扱う必要がない。\`i128 → i64\` の saturation と同じパターン。

3. **テストはまだなし — Step 2 の後に来る。** これで関数の定義群を視覚的に連続させたまま、テストブロックを別途に置ける。多くのレッスンが交互配置するが、我々はしない。

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

気づくべき 5 点:

1. **\`notional == 0\` の early return で \`i64::MAX\`。** Flat ポジションは exposure ゼロ → 下回るべき margin 要件もない。表現可能な最大の ratio を返すことで「無限に safe」を signal し、下流の \`margin_health\` の比較すべてを自然に short-circuit させる（\`margin_health\` 側に special-case 不要）。代替案 — \`Option<MarginRatio>\` または \`Result<MarginRatio>\` — は呼び出し側すべてに flat ケースを明示的に扱わせてしまう。**「制約なし」のケースを、最も safe な値として表現する。**

2. **乗算が除算より *先* に来る。** \`equity × MARGIN_SCALE / notional\` を i128 でやると、小さい ratio（例えば 1% margin = 100 bps）が割り算を生き残る。先に除算する（\`equity / notional × MARGIN_SCALE\` を i64 で）と、スケーリングの前に整数パーセントに切り捨てられ、精度が失われる。**整数除算が混ざるとき、演算順序が重要。**

3. **Scaled product のために i128。** \`equity\` は i64、\`MARGIN_SCALE\` は 10⁴。i64 での積は \`|equity| > i64::MAX / 10_000 ≈ 9.2e14\` で overflow しうる。現実的な取引所スケールではこれは $920 兆 — 妥当な範囲をはるかに超えるが、i128 乗算は第二の防衛線。\`unrealized_pnl\` と同じ規律。

4. **割り算用の \`i128::from(notional)\` キャスト。** \`scaled\` が i128 になった後、i128 で割り続けると結果も i128 のまま。\`notional\`（u64）の i128 へのキャストは無償。i128 と u64 を割り算で直接混ぜることはできない。**チェーン全体を 1 つの広い型で通し、境界で 1 度だけキャストする。**

5. **末尾の \`saturate_i128_to_i64(ratio)\`。** 割り算後でも極端な i128 値は i64 範囲を超えうる（例: 巨大な equity と小さな notional）。Saturation は答えの符号を保ちつつ magnitude を clip する。

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

気づくべき点:

1. **各 ratio テストがコメントで厳密な算術を名指しする。** "\`ratio = 100 × 10_000 / 1_000 = 1_000 bps = 10%\`" — 読者（およびリグレッションをデバッグする将来の自分）は、計算を再実行しなくてもテストの expected 値を検証できる。**テストは説明もするコード。**

2. **\`ratio_can_be_negative\` は \`assert_eq!(r, MarginRatio(-8000))\` ではなく \`assert!(r.0 < 0)\` を使う。** 厳密な ratio 値は割り算の i64 rounding に依存する。bps を厳密に固定すると、唯一正典的な答えのない演算をロックインしてしまう（rounding mode が違えば LSB が違う）。*符号* だけを assert することで、equity-negative-implies-ratio-negative という load-bearing な性質をテストし、rounding artifact をテストしない。**Property をテスト、artifact ではない。**

3. **\`ratio_flat_returns_max\` は \`MarginRatio(i64::MAX)\` を直接使う。** Sentinel 値は契約の一部で、L6 の \`margin_health\` がそれに依存する。

### Step 4: Proptest を書く — 素朴な初版

Unit test の下（依然 \`mod tests\` の中）に \`proptest!\` ブロックを開く。\`prop_assume!\` *なしで* long-position の monotonicity 不変量から書き始める:

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

minimal counterexample で **失敗** する:

\`\`\`
thread 'compute::tests::long_ratio_monotonic_in_mark' panicked:
Test failed: long ratio not monotonic: mark_a=1 → r=40000; mark_b=2 → r=25000
minimal failing input: size = 1, entry = 100, collateral = 103, mark_a = 1, mark_b = 2
\`\`\`

**ここで止まる。関数を直さない。失敗を手でトレースする。**

### Step 5: 失敗をトレースする

minimal failing input を \`margin_ratio\` に段階的に通す:

**mark = 1 で:**
- \`notional = |1| × 1 = 1\`
- \`pnl = (1 − 100) × 1 = −99\`
- \`equity = 103 + (−99) = 4\`
- \`ratio = 4 × 10_000 / 1 = 40_000 bps\`（= 400%）

**mark = 2 で:**
- \`notional = |1| × 2 = 2\`
- \`pnl = (2 − 100) × 1 = −98\`
- \`equity = 103 + (−98) = 5\`
- \`ratio = 5 × 10_000 / 2 = 25_000 bps\`（= 250%）

mark が上がると margin ratio は 400% から 250% に下がった。Equity は上がった（4 → 5）が、notional *も* 上がった（1 → 2）。Notional のほうが equity の回復より速く成長した。

一般式:

> \`margin_ratio = (collateral + (mark − entry) × size) × MARGIN_SCALE / (|size| × mark)\`
>
> = \`MARGIN_SCALE × (collateral/notional + (1 − entry/mark))\`

mark に関して微分する（long について、size、entry、collateral を固定）:

> \`d(margin_ratio)/d(mark) = MARGIN_SCALE × (entry / mark² − collateral / (size × mark²))\`
>
> = \`MARGIN_SCALE / mark² × (entry − collateral / size)\`

この微分の符号は \`entry − collateral / size\` の符号と同じ。だから:

- \`entry × size > collateral\` なら: 微分は正 → ratio は mark とともに **増加**（levered regime、素朴な直感が正しい場所）。
- \`entry × size < collateral\` なら: 微分は負 → ratio は mark とともに **減少**（cash-heavy regime、素朴な直感が間違いの場所）。
- \`entry × size = collateral\` なら: 微分はゼロ → ratio は mark に対して定数（「ちょうど資金化された」境界）。

失敗した入力は \`entry × size = 100 × 1 = 100\`、\`collateral = 103\`。\`collateral > entry × size\` なので、mark が上がると ratio が下がる cash-heavy regime にいる。

**これは \`margin_ratio\` のバグではない。関数は正しい。バグは proptest の不変量の表現の中にある — monotonicity が成り立たない regime で monotonicity を主張している。**

### Step 6: \`prop_assume!\` で proptest を refine する

Long-monotonicity proptest を、monotonicity が実際に成り立つ regime の内側だけで主張するバージョンに置き換える:

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

refine について気づくべき 3 点:

1. **テスト名が \`_when_levered\` で終わるようになった。** 名前が前提条件を運ぶ。このテストの失敗に飛び込んだ将来の読者は、本体を読まずに前提条件を知る。

2. **Doc コメントが前提条件 *なぜ* が重要かを名指しする。** "*That regime is uninteresting for liquidation*" — 読者はこれが見落としではなく、意図的なスコープ選択だと分かる。

3. **入力レンジを制限するのではなく \`prop_assume!\`。** \`collateral\` を \`0..(entry × size)\` で生成して leverage 条件を構造的に強制することも *できる*。しかし proptest の input strategy は inter-parameter 制約を組むのが難しく、\`prop_assume!\` は「この前提条件に違反するケースをスキップ」と自然に読める。Proptest のカウンター（\`successes: 8, rejects: ~\`）が何ケースフィルタされたかを教えてくれる — rejects が successes の ~10 倍を超えるなら、*そのとき* strategy を refine する。

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

気づくべき 2 点:

1. **Leverage 条件のための \`prop_assume!\` なし。** Short monotonicity は *無条件に* 成り立つ。微分を辿る: \`size < 0\` の場合、式は \`margin_ratio = MARGIN_SCALE × (collateral / notional + entry / mark − 1)\` になる。微分: \`d/d(mark) = MARGIN_SCALE / mark² × (−collateral / |size| − entry)\`。パレンの内側の両項とも非正（collateral と entry は非負、\`|size|\` は正）。微分は一様に負またはゼロ。**非対称性は本物の数学的事実であって、表記の選択ではない。**

2. **Snapshot 構築での \`-size\`。** strategy generator には正の \`size\` を渡し（> 0 のままにし）、snapshot 構築前に negate する。これで \`size = 0\` の生成を避ける（\`ratio_flat_returns_max\` がカバーする flat ケース）。

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

気づくべき点:

1. **Pure 関数にとって assertion は自明。** 同じ入力での 2 つの呼び出しは同じ出力を返さなければならない。**このテストは *将来* のリグレッションを捕まえる** — 将来のリファクタリングが margin 計算に \`HashMap\` iteration 順、\`SystemTime::now\`、float 演算を誤って導入したら、production で chain を fork させる前にこの proptest が失敗する。

2. **広い入力レンジには負とゼロが含まれる。** 他の 2 proptest は特定の regime を切り出した。Determinism は *どこでも* 成り立つので、strategy は寛大。値の特定の性質をテストしているのではなく、*関数の性質*（決定論的 dispatch）をテストしている。

3. **これは維持コストが最も低く、違反の発見コストも最も低い不変量。** エンジン内のすべての pure 関数は determinism proptest を持つべき。**5 行の proptest が、consensus-fork バグの一群を防ぐガード。**

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

**16 テストすべて pass。** 3 つの proptest はデフォルトでそれぞれ 256 ケース走る — 合計 ~768 のランダムに生成された入力の組み合わせがチェックされる。

エラーが出た場合に多い原因 / サプライズ:

- **proptest 出力での \`successes: 220, rejects: 36\`** — 完全に問題なし。\`prop_assume!\` フィルタが一部ケースを捨てた。Successes がケースの大半を占めている限り、proptest は本当の仕事をしている。
- **Proptest が予想より時間がかかる** — \`cargo test\` フラグで timeout を増やすか、辛抱する。3 proptest × 256 ケース × pure な算術の速度は実用上速い。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **Flat ポジションに \`MarginRatio(i64::MAX)\`、\`Option\` でも \`Result\` でもなく。** 「制約なし」のケースは *最も safe な* state。表現可能な最大の ratio に対応させることで、下流のすべての分類器が special-case 分岐なしに自然に short-circuit できる。**「情報なし」を最も safe な値として表現する、情報の欠如としてではなく。**

2. **Proptest の失敗がレッスンそのもの。** Proptest が最初の試みで pass していたら、読者は「margin_ratio は mark に対して monotonic」を学んだだろう。失敗とトレースのステップを通じて、読者は「**margin_ratio は mark に対して *levered regime で* monotonic、境界は collateral が notional-at-entry に等しい場所**」を学ぶ。読者自身が微分を歩いたから、深い事実が生き残る。

3. **条件付き不変量のための \`prop_assume!\`。** 不変量が入力のサブセット上でしか成り立たないとき、正しい道具は \`prop_assume!\` — より強い関数の事後条件でも、より弱い assertion でも、手で制限した strategy でもない。**不変量とは *どの条件下で* 真なのか。両方を表現する。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L5 の後:
- **compute.rs** は Stage 10a を \`margin_ratio\` + 最初の 13 unit test + 3 proptest すべてまで一致する。次の 2 関数（L6 の \`margin_health\`、L7 の \`close_order_spec\`）とそのテストはまだ pending。
- **lib.rs** は compute の re-export を 6 個中 4 個持つ — \`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`。残りの 2 つは L6/L7 で来る。

## よくある質問

**Q1: なぜ flat ポジションが \`MarginRatio(i64::MAX)\` を返し、\`MarginRatio(0)\` や \`Option::None\` ではないのか?**

\`MarginRatio(0)\` は flat アカウントを *最悪* の margin state に分類してしまい、margin_ratio の各 consumer に「これは本当にゼロか、それとも flat か?」の special-case を強制する。\`Option::None\` は honest だが、special case を呼び出しサイトすべてに押し出す。\`MarginRatio(i64::MAX)\` は flat ケースを「無限に safe」と同一に見せ — liquidation の目的にとってそれは *実際そう* — margin_health が special-case 分岐なしに \`Safe\` に分類できる。**3 つの選択肢、その 1 つが自然に compose する。**

**Q2: なぜ \`collateral\` が margin_ratio を 100% 超に押し上げて良いのか?**

Margin ratio は \`equity / notional\` のスケール。数学的に 100% の上限はない — $1,000 の collateral と $100 の notional を持つポジションは 1,000% margin ratio。実際の取引所はこれを「10× collateralized」と報告する。エンジンは initial-margin しきい値を超える ratio の値を気にしない。上はすべて \`Safe\`。**上限は UI の関心事、エンジンの関心事ではない。**

**Q3: Flat ガードなしで \`margin_ratio\` を常に i128 で計算して単純化できないか?**

Rust では整数のゼロ除算は debug でも release でも panic する。Flat ガードはその panic を防ぐ。削除するなら \`try_div\`（i128 は built-in を持たない）か、branchless なアプローチ（rounding ノイズを足して除算前に notional を定数で乗算する）が必要。2 行のガードが最もクリーン。**条件分岐 1 つは branchless な dance より安価。**

**Q4: 入力 strategy を \`collateral in 1..(entry × size)\` に制限するのではなく、なぜ \`prop_assume!\` なのか?**

2 つの理由。(1) Proptest strategy はパラメータごとに独立。Inter-parameter 制約を表現するには \`(entry, size, collateral).prop_filter(...)\` または \`flat_map\` で組み立てる必要があり、どちらも \`prop_assume!\` より noisy。(2) \`prop_assume!\` は前提条件をテスト本体内に inline で見えるようにする — 読者は assertion のすぐ隣で「collateral ≥ notional-at-entry のケースをスキップする」を見られる。入力 strategy に埋もれない。**前提条件は assertion がある場所で表現する、データ生成器の中ではなく。**

**Q5: Long monotonicity 不変量が成り立たないのはいつか、それは問題なのか?**

\`collateral ≥ entry × size\` のとき — cash-heavy regime で、ポジションが over-collateralized すぎて liquidation できない場所。その regime では mark の動きが margin ratio を上下させるが、maintenance を下回ることは決してない。エンジンは行動する必要がない。**Monotonicity が破れるケースは、ちょうどエンジンが気にしないケース — だから \`prop_assume!\` で除外するのが workaround ではなく正しい動き。**

## 次のレッスン (L6)

L6 では \`margin_health\` を追加する — params に対して \`MarginRatio\` を比較して 4 つの \`MarginHealth\` variants の 1 つに変換する関数だ。境界での unit test 5 個（Safe / AtRisk / Liquidatable / Underwater / ちょうど maintenance の端）と、なぜ各しきい値で strict-less-than を使うかの議論。L5 より短い — L6 までに規律は内面化される。L6 は応用。
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

- **なぜ分類カスケードは \`Underwater\` を最初に check するか** — 負の margin ratio は maintenance より *も* 小さいので、順序を反転すると underwater アカウントが静かに Liquidatable に reclassify され、insurance-fund signal が失われる。最も極端な state を最初に check する — カスケードは内側に narrow する。
- **すべての境界で strict-less-than** — \`ratio < maintenance_bps\`、\`≤\` ではない。ratio が *ちょうど* maintenance のアカウントは \`AtRisk\` であって \`Liquidatable\` ではない。境界線そのものは *より良い* state に属する。strict に下回って初めて悪い state に落ちる。
- **Params 比較のための型 widening** — \`i64::from(params.initial_margin_bps)\` が境界で u32 を i64 に upcast し、その後 2 つの i64 値を比較する。各比較サイトでの暗黙キャストを避ける。
- **Flat-as-Safe は無償、code しない** — \`margin_ratio\` は flat ポジションに対して \`MarginRatio(i64::MAX)\` を返し、その値は妥当な \`initial_margin_bps\` のどれよりも大きいので、\`margin_health\` は special-case 分岐なしに \`Safe\` を返す。Composition が処理する。

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…が 21 テスト pass する（L4-L5 から 16 + 新規境界テスト 5）。

具体的な変更:

- **\`src/compute.rs\`** — \`margin_ratio\` の後に \`margin_health\` を追記 + 既存のテストモジュール内に unit test 5 個。
- **\`src/lib.rs\`** — compute の re-export を \`margin_health\` で拡張。

L6 は応用: ここまでに i128 / saturate / proptest の規律は内面化されている。分類カスケードは短い — だが design hill（カスケード順 + strict-less-than）が、不注意な実装でほとんどのバグが潜む場所。

## おさらい

L5 の後:
- \`compute.rs\` には \`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`、\`saturate_i128_to_i64\` ヘルパー、加えて 13 unit test と 3 proptest がある。
- 非単調エッジケースは \`long_ratio_monotonic_in_mark_when_levered\` に \`prop_assume!\` で表現済み。
- \`cargo test\` が 16 テストを走らせ、すべて green。

L6 では \`MarginRatio\` 値を \`MarginHealth\` variants にマップする。関数は短い。決定は短くない。

## 計画

3 つの編集:

1. **\`crates/liquidation/src/compute.rs\` に \`margin_health\` を追記** — 13 行 + doc コメント。\`margin_ratio\` の下に置き、それを使う。
2. **既存のテストモジュールに unit test 5 個追加** — \`MarginHealth\` variant ごとに 1 つ（4 テスト）+ ちょうど maintenance しきい値での境界テスト 1 つ。
3. **\`crates/liquidation/src/lib.rs\` を更新** — \`pub use compute::{...}\` 行を拡張。

> 🛑 **予測。** スクロール前に: カスケードは 4 状態（\`Underwater\`、\`Liquidatable\`、\`AtRisk\`、\`Safe\`）を check する必要がある。条件は: \`ratio < 0\`、\`ratio < maintenance_bps\`、\`ratio < initial_bps\`、それ以外。**カスケードを \`Liquidatable → Underwater → AtRisk → Safe\` の順に書く（Liquidatable を最初に check）と何が起きるか?**

（答え: **Underwater アカウントが Liquidatable に分類される。** Ratio \`−5_000\` は \`< maintenance_bps\`（= 200）でもあるので、Liquidatable 分岐が最初に発火し、カスケードは Underwater check に到達しない。結果: bridge が insurance-fund-needed signal を受け取らず、underwater な不足が静かに通常の liquidation path を通り、数学が「不足を解消できなかった」と言っているのに帳簿上はポジションが solvent に close される。**カスケード順は load-bearing — 最も極端な state を最初に check する。内側に進む各ステップが残りの範囲を narrow する。**）

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

この 18 行の関数で気づくべき 5 点:

1. **カスケード順が \`Underwater\` を最初に check する。** 負の ratio も \`< maintenance_bps\` を満たすので、Liquidatable を最初に check すると、すべての Underwater アカウントが Liquidatable に誤分類される。**不変量: 各分岐の条件は、前の分岐が捕まえたものすべてを排除する。** Underwater（\`< 0\`）が最も厳しく、Liquidatable（\`< maintenance\`）、AtRisk（\`< initial\`）、そして最後に Safe（残り）へと内側に narrow する。

2. **すべてのしきい値で \`<\`、\`≤\` ではない。** Ratio が \`maintenance_bps\` に等しいアカウントは *まだ* Liquidatable ではない — AtRisk。慣例的な読み方: maintenance margin は *上に* とどまるべき線。strict に超えてから liquidation 対象になる。Doc がこれを明示し、Step 2 のテストが強制する。**Strict inequality はしきい値そのものがより良い health state に属することを意味する。**

3. **\`i64::from(params.initial_margin_bps)\` が u32 → i64 を widen する。** フィールドは \`u32\`（メモリ節約、bps 値は ~40 億まで十分な範囲）。Ratio は \`i64\`（\`margin_ratio\` の signed 除算によって強制された型）。Rust では異なる integer 型の比較はコンパイルエラー。境界で widening することで比較がクリーンに保たれる。**Params ごとに 1 回キャスト。カスケード本体は純粋な i64 < i64 として読める。**

4. **Flat ポジション用の special case なし。** \`margin_ratio\` は flat アカウントに対して \`MarginRatio(i64::MAX)\` を返す。\`i64::MAX\` は妥当な \`initial_margin_bps\` のどれよりはるかに大きいので、カスケードは \`Safe\` に fall through する。**Flat-as-Safe の性質は \`margin_ratio\` の flat-position ガードに反映されている — \`margin_health\` はそれを知る必要がない。** Flat-position セマンティクスへの将来の微調整は *1 箇所* （\`margin_ratio\`）で起きる、2 つの同期した分岐ではなく。

5. **関数は \`&LiquidationParams\` を受け取る、値の \`LiquidationParams\` ではない。** \`LiquidationParams\` は \`Copy\`（12 byte）だが、参照シグネチャは「これは読むだけで consume しない」を signal する。Bridge は同じ \`params\` をスキャン全体のあらゆる \`margin_health\` 呼び出しに渡す。参照は呼び出しごとの（技術的には無償の）move を回避する。

> 🛑 **やりがちな勘違い。** 「3 つの \`if\` 分岐ではなく \`match (ratio.0, maintenance_bps, initial_bps) { ... }\` ではダメか?」 **条件は不等式であってパターンマッチではないから。** Match パターンは値の structural な相等性のためのもので、range check のためではない。Guard 句（\`x if x < 0 => ...\`）付きの match に書き換えると、可読性を失うだけで何も得られない — 明示的なカスケードはちょうど決定をそう考える通りに読める。

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

気づくべき 4 点:

1. **各テストがテストの \`MarginHealth\` を生み出す算術を名指しする。** "*Ratio 1_500 bps (= 15%)*" が読者（および失敗を読み返す将来の自分）に、テストがどの range を exercise するかを正確に伝える。コメントが正しくセットアップが間違ったテストは、assertion だけのテストより気づきやすい。

2. **4 variant 用に 4 テスト、境界用に 1 テスト。** 各カスケード分岐が positive テストを得る。\`health_boundary_at_maintenance\` が strict-less-than の慣例を証明する。この 5 番目のテストがないと、\`<\` を \`≤\` に flip した将来のリファクタリングが他の 4 つを pass しつつ、ちょうどしきい値での挙動を静かに変えてしまう — 本番ポジションの最も一般的な margin level がそこ（アカウントは maintenance に *到達してから* 下回る）。

3. **\`health_boundary_at_maintenance\` は \`hyperliquid_default()\` ではなく独自の params を構築する。** Hyperliquid default は \`liquidation_fee_bps = 150\` を持つが、このテストには無関係。明示的な struct 構築は、テストが *実際* どのフィールドに依存するかを文書化する。他のテストは fee フィールドが load-bearing でないので default を使う。

4. **\`MarginHealth::Underwater\` は L5 の underwater ケース** で exercise される（薄い collateral を持つ long ポジションに対する \`mark = 50\`）。L5 の \`ratio_can_be_negative\` と同じセットアップ — 負の ratio テストが数学を証明し、variant テストが分類を証明する。

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

新規 1 名 — \`margin_health\` — がアルファベット順に \`account_equity\` と \`margin_ratio\` の間に挿入される。リストが ~5 項目を超えるとここで行が wrap する。

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

エラーが出た場合に多い原因:

- **\`health_boundary_at_maintenance\` が \`AtRisk\` の代わりに \`Liquidatable\` で失敗** — カスケード内のどこかで \`<\` を \`≤\` に間違って書いた。境界テストはまさにこれを捕まえるために存在する。
- **\`health_underwater\` が \`Liquidatable\` で失敗** — \`Underwater\` check を \`Liquidatable\` check の *後* に置いた。並び替える。最も極端な state が最初。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **カスケード順: 最も極端な state を最初に check する。** \`Underwater\` → \`Liquidatable\` → \`AtRisk\` → \`Safe\`。Narrowing の方向は、各分岐の条件が前の分岐が捕まえたものすべてを排除することを意味する。順序を反転すると、深刻なケースが静かに緩いケースを通る。**カスケード条件が重なるとき、最も厳しいものから最も緩いものへ sort する。**

2. **しきい値での strict-less-than: 線はより良い state に属する。** Maintenance ちょうどのアカウントは \`AtRisk\`、\`Liquidatable\` ではない。これは慣例の選択 — 本番の取引所では異なる — だが、システム *内* の一貫性が、しきい値がどちら側に属するかより重要。**慣例を選び、doc で名指しし、境界テストで強制する。**

3. **\`margin_health\` 内に flat ポジションの special case なし。** \`margin_ratio\`（flat に対して \`i64::MAX\` を返す）との composition で、性質が無料で fall out する。\`if snapshot.position_size.0 == 0 { return Safe; }\` を追加すれば、flat-position の挙動を 2 箇所に複製してしまい、片方が変わった瞬間にずれる。**不変量を 1 箇所に表現し、下流の関数が composition で継承するに任せる。**

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

**Q1: なぜ misconfigured な params（maintenance ≥ initial）のようなケースのために \`Result<MarginHealth, ...>\` を返さないのか?**

関数は total — どの入力も定義された出力を生む。Misconfigured な params（maintenance == initial、または maintenance > initial）でも、すべてのアカウントを 4 variants のどれかに分類する、間違ったセマンティクスで。\`Result\` を返すと、すべての呼び出しサイトに *params を妥当に構築した bridge からは決して起きない* \`MisconfiguredParams\` エラーを処理させる。**Total function は compose しやすい。Params は loading 境界で validate し、下流ではすべて信頼する。**

**Q2: \`margin_health\` を sorted thresholds 配列と binary search でもっと「データ駆動」にできないか?**

4 状態なら、明示的なカスケードのほうがクリアで速い。Binary search は threshold の数が ~10 を超えると勝つ — その時点でリファクタリングする。先取りした一般化は、エンジンが必要としない仕組みを足す。**持っている cardinality に最適化する、いつか持つかもしれない cardinality ではなく。**

**Q3: \`maintenance_bps > initial_bps\`（misconfigured）のとき何が起きるか?**

カスケードは依然として定義された分類を生む: \`ratio >= maintenance_bps\` で、次の分岐は \`ratio < initial_bps\`（maintenance > initial なら ratio も ≥ initial なので false）、\`Safe\` に fall through する。\`ratio ∈ [0, maintenance_bps)\` で \`Liquidatable\` に着地する。AtRisk は到達不能になる。**Misconfigured params は一貫性のあるが意図しない分類スキームを生む。Validation は param 構築側の責任で、分類器の責任ではない。**

**Q4: なぜ \`margin_health\` は params の i64 変換をキャッシュしないのか?**

呼び出し側は通常、block ごとのスイープで \`margin_health\` をアカウント当たり 1 回呼ぶ。Bridge は同じ \`&LiquidationParams\` をすべての呼び出しに渡す。2 つの \`i64::from(u32)\` キャストはゼロコスト — コンパイラは最大でも \`mov\` 命令を 1 つ emit するだけ。**コストを測ってからキャッシュする。反射でキャッシュに手を伸ばさない。**

**Q5: カスケードを \`match\` の range pattern（\`0..maintenance_bps => Liquidatable\`）で書けるか?**

Rust の \`match\` は exclusive-range pattern をサポートする（1.26 から）ので、構文的にはイエス。しかしパターンは \`i64::MIN..0\`、\`0..maintenance_bps\`、\`maintenance_bps..initial_bps\`、\`initial_bps..=i64::MAX\` になる。*名前付きの* 境界（リテラルではなく変数を参照）が必要なので、各パターンに guard 句がいずれにせよ必要になる。If/else カスケードのほうがここではクリーンに読める。**Structural なケースには \`match\`、同じ値での不等式カスケードには \`if/else\`。**

## 次のレッスン (L7)

L7 で Stage 10a を \`close_order_spec\` で閉じる — snapshot を bridge が consume する \`CloseOrderSpec\` に変換する関数だ。3 unit test: long-closes-with-Sell、short-closes-with-Buy、flat-position エッジケース（qty = 0）。L6 より短い — L7 までに compute モジュール全体が背後にあり、レッスンの大半は L4 の \`unsigned_abs\` 規律とエンジンの外向きインターフェース間の橋渡し。
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

- **ポジションを close する基本ルール** — long は *売る* ことで close、short は *買う* ことで close。Side は常にポジション方向の反対 — エンジンは side を決めるのではなく、反転させる。
- **Public 境界での \`unsigned_abs\`** — L4 の規律（\`i64\` には \`abs\` ではなく \`unsigned_abs\`）が bridge と話す関数で現れる。出力 \`Qty(u64)\` は CLOB matching engine が期待する型 — エンジンは符号変換を自分の境界に押し付ける。
- **なぜ \`close_order_spec\` は flat ポジションをフィルタしないか** — flat ポジションは \`qty == 0\` の spec を生成する。Bridge が submit 前にフィルタする。\`close_order_spec\` を total かつ side-effect-free に保つことで、Stage 10c の multi-account scanner と compose しやすくする。
- **単一責任のスコープ** — \`close_order_spec\` は \`MarkPrice\` を受け取らない（market order は price を持たない）し、\`LiquidationParams\` も受け取らない（liquidate するかの決定は \`margin_health\`）。Snapshot 1 つ入、spec 1 つ出。

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…が 24 テスト pass する（L4-L6 から 21 + 3 つの close-side ケースのための新規テスト 3）。**Stage 10a が \`22eedf9\` に対して byte-for-byte 完成。**

具体的な変更:

- **\`src/compute.rs\`** — \`margin_health\` の後に \`close_order_spec\` を追記 + 既存のテストモジュールに unit test 3 個。
- **\`src/lib.rs\`** — compute の re-export を \`close_order_spec\` で拡張。

L7 は Stage 10a で最短のレッスン。関数自体は 11 行 — レッスンが存在する理由は、side-inversion ルールをロックし、pure-compute モジュールの完成をマークするため。

## おさらい

L6 の後:
- \`compute.rs\` には \`notional_value\`、\`unrealized_pnl\`、\`account_equity\`、\`margin_ratio\`、\`margin_health\` + \`saturate_i128_to_i64\` ヘルパー + 18 unit test + 3 proptest がある。
- \`lib.rs\` は compute 関数 6 個中 5 個を re-export している（\`close_order_spec\` 以外すべて）。
- \`cargo test\` が 21 テスト走らせ、すべて green。

L7 で Stage 10a を閉じる。本レッスン後、\`22eedf9\` に対する答え合わせ diff は \`compute.rs\` と \`lib.rs\` の両方で完全にクリーンになる。

## 計画

3 つの編集:

1. **\`crates/liquidation/src/compute.rs\` に \`close_order_spec\` を追記** — 11 行 + doc コメント。
2. **既存のテストモジュールに unit test 3 個追加** — long-closes-with-Sell、short-closes-with-Buy、flat-position-has-zero-qty。
3. **\`crates/liquidation/src/lib.rs\` を更新** — compute の re-export を拡張。

> 🛑 **予測。** スクロール前に: \`position_size = 10\` の long ポジションを force-close する必要がある。**エンジンはどの \`Side\` と \`Qty\` を emit するか?** 次に: \`position_size = −10\` の short — 同じ問い。

（答え: **Long: \`Side::Sell\`、\`Qty(10)\`。Short: \`Side::Buy\`、\`Qty(10)\`。** Long は売って close する: トレーダーは 10 ユニットを long として保有しているので、10 売って flat にする必要がある。Short は買って close する: トレーダーは 10 ユニットを short として持っているので、10 買って flat にする必要がある。Quantity は常にポジションの magnitude。符号は side にあって、qty にはない。**\`Qty\` が \`u64\` なのはまさに magnitude が符号を持たないから。**）

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

この 11 行の関数で気づくべき 5 点:

1. **Side は *常にポジション方向の反対*。** トレーダーは \`size\` ユニットを保有する（正 = long、負 = short）。Close するために、エンジンは反対 side の order を submit する: long は売って unwind、short は買って unwind。**Matching engine は close の *意図* を気にしない。Side の order が見えるだけ。「反対 side」ルールが、ポジション方向と order side の間の橋の全部。**

2. **\`unsigned_abs()\` が magnitude を \`u64\` として返す。** L4 と同じ規律が public 境界に適用される。\`Qty\` は \`u64\` をラップするので、magnitude が \`Qty(abs_size)\` に直接流れる、中間の \`as u64\` キャストなしで。**関数は符号変換を、ちょうど 1 度、符号付き position-size と符号なし order-quantity が出会う境界で行う。**

3. **\`if snapshot.position_size.0 > 0\` — strict greater-than。** Flat ポジション（\`size == 0\`）は \`else\` 分岐に落ちて \`Side::Buy\` を得る。Qty も 0 になるので無害 — spec は存在するが意味を持たない。**関数の中で flat path を special-case しない**。Bridge が submit 前に \`qty == 0\` の spec をフィルタする。

4. **\`mark\` なし、\`params\` なし。** \`close_order_spec\` は snapshot だけが要る。「Close する決定」は \`margin_health\` に住み、price discovery は matching engine で起きる。**各関数がちょうど 1 つの関心事を所有する。Bridge がそれらを compose する: スキャン → 分類 → close spec 生成 → submit。**

5. **\`Option<CloseOrderSpec>\` ではなく \`CloseOrderSpec\` を値で返す。** 関数は total — flat ポジション（\`qty == 0\`）でも常に spec を返す。代替案 — \`Option\` — はスキャン内のすべての flat アカウントに対して呼び出し側に \`None\` を扱わせる。close ステップに到達する頃にはそれらのアカウントはすでに事前にフィルタされているのに。**Total な関数は compose しやすい。Optional な関数はすべての呼び出し側に空ケースを扱わせる。**

> 🛑 **やりがちな勘違い。** 「\`if size >= 0 { Sell } else { Buy }\` ではダメか — そうすれば flat が Sell として扱われ、一部のテスト取引所がやっていることと同じになる」 **3 つの問題。** (1) Flat-as-Sell は挙動の選択で、pure compute ではなく bridge に属する。(2) 現在の \`> 0\` は flat ポジションが long でも short でもないことを正しく反映している。(3) \`qty == 0 + Side::Sell\` の本番セマンティクスは matching engine では未定義。Bridge はいずれにせよフィルタしなければならない。**呼び出し側に最もクリーンな契約を生む慣例を選ぶ — エッジケースを隠す慣例ではなく。**

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

気づくべき点:

1. **\`close_long_with_sell\` が 3 つの出力フィールドすべてを assert する。** Side、qty、account — すべての出力フィールドがロックされる。Bridge は 3 つすべてに依存する。3 つすべてをテストすることで、1 つを直して他を壊す部分的なリファクタリングから守られる。**出力型のテストでは、呼び出し側が読むすべてのフィールドを assert する。**

2. **\`close_short_with_buy\` は account の assert をスキップする。** Account フィールドは \`close_long_with_sell\` と同じ入力ソースから来る — long で動いたなら short でも動く。**直交する軸を 1 度カバーする — 以前のテストがすでにロックしたものを繰り返さない。**

3. **\`close_flat_has_zero_qty\` は、関数が flat ケースをフィルタしない *にもかかわらず* 存在する。** テストが契約を文書化する: 「flat ポジションは zero-qty spec を生むと約束する。呼び出し側はフィルタしなければならない。」将来のリファクタリングが誤って \`close_order_spec\` の中にフィルタを加えたら（\`Default::default()\` を返すか、flat で panic するか）、このテストが失敗する。**テストは文書化された契約を保つ — 「これは我々がしない、呼び出し側がする」と言うものを含む。**

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

新規 1 名 — \`close_order_spec\` — がアルファベット順に \`account_equity\` の後に挿入される。すべての 6 つの compute 関数が re-export された。

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

**24 tests passing。Stage 10a content 完成。** Liquidation crate の pure-compute モジュール — margin math + 分類 + close-order 生成 — があなたの workspace に入り、\`22eedf9\` に対する答え合わせ diff は完全にクリーン。

エラーが出た場合に多い原因:

- **\`close_short_with_buy\` が \`Side::Sell\` で失敗** — 誤って \`if snapshot.position_size.0 >= 0\` と書いた。Flat ポジションはここでは関係ないが、\`>=\` を使うと size = 0 の short（存在しない）が Sell に flip する — そして size = −10 のテストは \`size > 0\` を false と見るので失敗する。方向を再確認。
- **\`close_flat_has_zero_qty\` が関数の panic で失敗** — \`unsigned_abs()\` ではなく \`.abs()\` を追加した可能性。\`i64(0).abs()\` は OK だが、\`i64(-10).abs() as u64\` を書くと L4 の i64::MIN footgun のリスクがある。\`unsigned_abs\` で通す。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **Side はポジション方向の反対 — 他のケースなし。** Long → Sell、Short → Buy。関数は「曖昧」のための 3 番目のケースも「不明」のためのフォールバックも要らない。ポジションは符号を持つか flat。Spec は符号を反転するか、ゼロを運ぶ。**基本反転が「このポジションを close する」の正しい形。**

2. **\`close_order_spec\` は flat ポジションでも side-effect-free。** 関数の中でフィルタするのではなく zero-qty spec を返すことで、\`close_order_spec\` を total かつ compose しやすく保つ。Stage 10c の scanner は分岐なしに \`for snapshot in snapshots { specs.push(close_order_spec(snapshot)); }\` できる。Bridge が submit 時にフィルタする。**Pure 関数は返す。Impure な境界レイヤーがフィルタする。**

3. **関数は \`mark\` も \`params\` も受け取らない。** 各 compute 関数がちょうど 1 つの関心事を所有する: \`margin_health\` は close するか *否か* を決め、\`close_order_spec\` は *どう* するかを決める。混ぜると — 例: \`params\` を取って liquidation fee を qty に適用すると — 2 つの責任が結合する。Fee は Stage 10b（insurance fund）に属する、collateral と fee の数学が一緒に住む場所。**単一責任が bridge の composition path を明白にする。**

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

Stage 10a クレート全体があなたの workspace に入った。

## よくある質問

**Q1: \`close_order_spec\` は flat ポジションに対して \`Option<CloseOrderSpec>\` を返すべきか?**

返してもいいが摩擦を増やす。Flat ケースを気にしないすべての呼び出し側（ほとんど）が \`.expect("non-flat position")\` または \`if let Some(spec) = ...\` する必要が出る。Total な \`CloseOrderSpec\` を \`qty == 0\` で返し、フィルタを bridge に押し付けるのが common case には安価。**\`Option\` の規律は、空ケースが *最も一般的* で呼び出し側に処理を強制したいときに最適。ここでは空ケースが希少で、強制処理はオーバーヘッド。**

**Q2: なぜ \`Side::Sell\` 分岐で \`size > 0\`（strict）であって \`size >= 0\`（non-strict）ではないのか?**

Flat（\`size == 0\`）は long *でもなければ* short *でもない* — long/short の二分法の外側。「flat は long」または「flat は short」の慣例はどちらも arbitrary。我々は flat が \`else\` 分岐に静かに落ち、qty もどのみち 0 になる慣例を選んだ。どちらの選択も働く。規律は **一貫性を保ち、選択を文書化すること**。Doc は「flat → qty 0、呼び出し側がフィルタ」と言い、それは読者がコードに対して検証できる内容。

**Q3: \`close_order_spec\` を \`AccountSnapshot\` のメソッド（\`snapshot.close_order_spec()\`）にできないか?**

構文的にはイエス — \`impl AccountSnapshot { pub fn close_order_spec(&self) -> CloseOrderSpec { ... } }\`。そうしない理由は、\`close_order_spec\` 関数が他の margin-math 関数と一緒に \`compute.rs\` に住むから。関連コードとの co-location が receiver 型との co-location に勝つ。**\`AccountSnapshot\` はデータ運搬役（\`types.rs\` に住む）。Compute は \`compute.rs\` に住む。Free-function 形式がその分離を保つ。**

**Q4: \`position_size = i64::MIN\` の場合、\`unsigned_abs\` はそれを処理するか?**

イエス、設計通り。\`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808u64\`（\`u64::MAX / 2 + 1\`）。Signed の \`i64::MIN.abs()\` は overflow する（i64 には正の対応物がない）。\`unsigned_abs\` は magnitude を \`u64\` で返し、常に余裕がある。**これがちょうど L4 の規律: magnitude には \`unsigned_abs\`、値が \`MIN\` ではないと確信しているときだけ \`abs\`。**

**Q5: テスト fixture の \`snapshot\` 関数が \`(size, entry, mark, collateral)\` ではなく \`(size, entry, collateral)\` を取るのはなぜか — テスト対象の関数は snapshot を取り、通常 mark も必要なのに?**

\`close_order_spec\` は snapshot だけを取る — mark なし。L4 から共有される \`snapshot\` fixture は snapshot の 3 つの意味のあるフィールド（account はハードコード）を取り、mark を運ばない。Mark はテスト対象の関数に別の \`MarkPrice(...)\` 引数として渡される。**Fixture は *型* が必要とするものを構築する。テストは *呼び出し* が必要とするものを供給する。**

## 次のレッスン (L8) — Stage 10b が始まる

L8 で Stage 10b — insurance fund — が始まる。L7 で完成した pure-compute モジュールは *何が起きるべきか* のレイヤー。Stage 10b は *何が起きたかを記録する帳簿* を加える — fund の balance を track し、underwater liquidation からの不足を吸収し、solvent な close から liquidation fee を credit する \`InsuranceFund\` state machine。Stage 10b の後、エンジンは「このアカウントは Liquidatable」だけでなく「この close は fund に 1.5% を credit した」または「この close は fund から $400 を drain した」を知る。

**本レッスンドラフト時点で Stage 10b はまだ openhl に ship されていない** — L8 は openhl 側の実装が来たときに rethlab に着地する。
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
