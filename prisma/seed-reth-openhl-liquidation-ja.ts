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
      sortOrder: 1014,
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
                  title: "レッスン0 — OpenHL Liquidation を作る（永久先物ポジション liquidation エンジン）",
                  slug: "openhl-liquidation-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# レッスン0 — OpenHL Liquidation を作る（永久先物ポジション liquidation エンジン）

## 問い

前コース（Funding）で mark と index の乖離を funding payment で抑える仕組みは手に入った。だがトレーダーの損失が預け入れ collateral を超えたら？ その時ポジションを **consensus 内で** force-close し、不足分を吸収するエンジンを、float なしの決定論で作るには？

> 注: OpenHL コースのコードブロックは原則として手元で実行可能な形で示す。ただし \`<file>\` などのプレースホルダや答え合わせ用コマンドは、各レッスンの指示に従って置換してから実行すること。

## 原理（最小モデル）

- **perp はレバレッジ position。損失が collateral を食い \`equity / notional\` が maintenance margin を下回ると force-close。** 反対 side・フルサイズで close、liquidation fee を collateral から引いて insurance fund へ、equity が正なら残りをアカウントに返す。equity が負（underwater）なら不足分を insurance fund が吸収。
- **liquidation は consensus 内で実行する。** 全 validator が全 block で、同じデータ・同じコードで maintenance 割れを独立計算する。オフチェーン bot に外注すると、検知〜close の RPC ラウンドトリップ遅延がそのまま chain の損失になる（50× の position は数秒で healthy→underwater に反転しうる）。
- **float 禁止 — consensus が壊れる。** あるアカウントを \`Liquidatable\` と分類する validator と \`AtRisk\` と分類する validator がいると、close orders / fees / insurance-fund deltas が食い違い block が分岐して fork する。固定小数点 \`MARGIN_SCALE = 10_000\`（bps）+ saturating + i64 overflow しうる乗算に i128 中間値。
- **4 状態の margin classification。** \`Safe\` / \`AtRisk\` / \`Liquidatable\` / \`Underwater\` — 各状態が engine に何を許可するかを決める。
- **insurance fund は単なる \`u64\` 残高でなく pure state machine。** 独自の遷移ルール（\`deposit\` / \`withdraw\` / \`absorb_deficit\` の不変条件）を持つ。

## 具体例

トレーダーは \`collateral\`(USDC) を預け、\`entry\` 価格で \`size\`（符号付き: 正=long、負=short）の position を開く:

\`\`\`
unrealized PnL  = size とともに mark で動く（long は mark>entry で利益）
equity          = collateral + unrealized_pnl
margin_ratio    = equity / notional  （notional = |size| × mark）
  margin_ratio < maintenance(2%) → Liquidatable → force-close + fee → insurance fund
  close 前に equity < 0 → Underwater → 不足分を insurance fund が absorb
\`\`\`

bps が margin の慣例単位（HL/Binance/Drift とも）。\`MarginRatio(1_000)\` = 10%、\`MarginRatio(MARGIN_SCALE)\` = 100%。

## 失敗例（誤解）

「liquidation はオフチェーンの liquidator bot（アカウントを scan して \`liquidate(account)\` を呼ぶ）に外注すればいい」は誤り — perp のスピードでは破綻する。低頻度 settlement（CDS 等）なら機能するが、50× レバレッジの position はニュース cascade で数秒のうちに healthy から underwater に反転する。検知から close までの RPC ラウンドトリップの遅延は丸ごと chain 側の損失として残る。**敵対的な市場の動きのもとで chain が支払い能力を保つ手段は、consensus 内 liquidation 以外にない。**

---

ここまでで「なぜ consensus 内 liquidation」「なぜ float 不可」は着地した。ここから先はスコープ・前提・14 レッスンのロードマップに入る。L1 以降は実際に Rust を書く。

> 🛑 **予測。** 2 つの validator が同じアカウントの margin health を分類する。片方が \`f64\` の \`equity / notional\` を計算したら、もう片方と bit-exact に一致するか？（答え: 保証されない。float は compiler/CPU/演算順で最下位ビットが食い違いうる。分類が 1 段でもズレると（\`AtRisk\` vs \`Liquidatable\`）、生成される block が変わり fork する。だから bps スケールの符号付き整数で分類する — 整数演算は全プラットフォームで byte-identical。）

## 終了時に手にするもの

新規 \`crates/liquidation/\` crate、3 ソースファイル / ~600 LOC:
- **固定小数点 types モジュール** — \`MARGIN_SCALE\`、\`LiquidationParams\`、\`MarginRatio\`、\`MarginHealth\` enum、\`AccountSnapshot\`、\`CloseOrderSpec\`。
- **純粋な compute モジュール（margin math）** — \`notional_value\` / \`unrealized_pnl\` / \`account_equity\` / \`margin_ratio\` / \`margin_health\` / \`close_order_spec\`。
- **state machine（insurance fund）+ multi-account scanner** — \`InsuranceFund\`（\`deposit\`/\`withdraw\`/\`absorb_deficit\`/\`credit_fee\`）と \`LiquidationScanner\`（\`scan\`）。
- **24+ tests**（compute マイルストーン時点、capstone までに増える）: hand-traced unit test、margin-ratio の単調性・determinism proptest、insurance fund の保存則 invariant。

## 終了時にも手にしないもの（意図的な scope cut）

- **Auto-deleveraging（ADL）** — この設計の端に位置づくが、本コースでは扱わない（別コース \`building-openhl-adl\`）。
- **Oracle**（mark/index の供給元） — liquidation は mark を *入力* として受け取るだけ。
- **Bridge 統合** — liquidation engine は純粋な state machine として完結。\`LiveRethEvmBridge\` への plug-in は capstone でプレビューし、実装は下流。

## 前提

- **Step 4（Funding）** が頭にあること — fixed-point / saturating 演算 / pure state machine のパターンが再登場する（funding が難しかったなら本コースも難しい）。
- **Step 2（CLOB）** の \`AccountId\` / \`Side\` / \`Qty\` を直接再利用する（matching engine の内部までは不要）。
- 基本レベルの margin math（「initial margin 10% / maintenance 2%」で混乱しない程度）。
- **EVM / precompile の知識は不要**（liquidation は純粋な state-machine 数学）。

不要: 動作中の openhl ノード（zero I/O）/ 取引所リスクエンジン経験 / 定量金融バックグラウンド。

## セットアップ（今やる）

\`\`\`bash
cd ~/code/my-openhl
git checkout main
cargo build --workspace  # baseline — L1 前に通るべき

cd ~/code/openhl-reference  # answer-key 用の別チェックアウト
git checkout 22eedf9
\`\`\`

## 14 レッスンのロードマップ

| # | build するもの | 終了時テスト |
| - | - | - |
| 0 | Orientation（本レッスン） | セットアップ確認 |
| 1 | \`MARGIN_SCALE = 1e4\`（bps）+ \`LiquidationParams\` + \`hyperliquid_default()\` | \`cargo check -p openhl-liquidation\` |
| 2 | \`MarginRatio\` newtype + \`MarginHealth\` enum（4 状態） | 型がコンパイル |
| 3 | \`AccountSnapshot\` + \`CloseOrderSpec\` | roster 完成 |
| 4 | \`notional_value\` + \`unrealized_pnl\`（signed-multiplication） | 符号テスト pass |
| 5 | \`account_equity\` + \`margin_ratio\` + **非単調性 proptest** | proptest pass（\`prop_assume!\`） |
| 6 | \`margin_health\` 分類カスケード（strict less-than） | 分類テスト pass |
| 7 | \`close_order_spec\`（market order の規律） | compute 完成 |
| 8 | \`InsuranceFund\` + \`deposit\`/\`withdraw\` | single-balance state machine |
| 9 | \`absorb_deficit\`（underwater が fund を drain） | 保存則 test pass |
| 10 | \`credit_fee\`（fee が collateral→fund）+ close-outcome decomposition | composition test pass |
| 11 | Scanner 型語彙（\`CloseOutcomeKind\`/\`LiquidationRecord\`/\`ScanReport\`/\`LiquidationScanner\`） | 型がコンパイル |
| 12 | \`scan\`（safety cascade の orchestration） | scan test pass |
| 13 | Capstone — 6 unit test + 4 invariant proptest | **全 tests pass** |

**マイルストーンは レッスン13** — 全 tests が通り、4 状態分類 → insurance fund → multi-account scanner が 1 つの orchestration ループに結合する。レッスン13 で「まだ何が足りないか（oracle / bridge / ADL）」を名指す。

## 答え合わせの規律

本コースは Liquidation 参照実装の 3 パートにまたがる:

| Module | レッスン | openhl SHA |
| - | - | - |
| 型 + 純粋な compute | L1〜7 | \`22eedf9\`（計算パート） |
| Insurance fund | L8〜10 | \`260883b\`（保険基金パート） |
| Scanner + Capstone | L11〜13 | \`0a8464e\`（スキャナパート） |

\`\`\`bash
# レッスン範囲に応じて checkout:
# 22eedf9 (計算), 260883b (保険基金), 0a8464e (スキャナ)
cd ~/code/openhl-reference && git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

## 合格基準

- \`cargo test -p openhl-liquidation --release\` を全 tests 通せる（コース完走時）。
- なぜ liquidation を consensus 内で実行するか（オフチェーンだと支払い能力を主張できない）を 1 文で言える。
- 4 状態分類（Safe/AtRisk/Liquidatable/Underwater）と、それぞれが engine に何を許可するかを説明できる。

## まとめ（3行）

- liquidation は、損失が collateral を食って \`equity/notional\` が maintenance を下回った position を **consensus 内で** force-close するエンジン。fee を insurance fund へ、underwater なら不足分を fund が absorb。
- float は分類のズレ（\`AtRisk\` vs \`Liquidatable\`）で block 分岐 → fork を招くので使わず、bps スケール（\`MARGIN_SCALE = 10_000\`）の符号付き整数 + saturating で分類する。
- 3 building block（固定小数点 types → margin math → insurance fund + scanner）。最大の山は レッスン5 の levered-regime 非単調性。ADL は scope 外（別コース）。

## 次のレッスン（レッスン1）

\`MARGIN_SCALE = 1e4\`（bps）と、ネットワークのリスクパラメータを収める \`LiquidationParams\` 構造体 + \`hyperliquid_default()\`（initial 10% / maintenance 2% / fee 1.5%）を作る。`,
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
                  title: "レッスン1 — MARGIN_SCALE + LiquidationParams — リスクエンジンのダイヤル",
                  slug: "openhl-liquidation-margin-scale-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン1 — \`MARGIN_SCALE\` + \`LiquidationParams\` — リスクエンジンのダイヤル

## 問い

margin ratio を float なしで全 validator が byte-identical に分類したい。何を基準単位に選ぶ？ funding は ppb（\`RATE_SCALE = 1e9\`）だったが liquidation も同じ精度が要るか？ そしてネットワークのリスクパラメータ（initial / maintenance / fee）をどう持つ？

## 原理（最小モデル）

- **margin の固定小数点単位は basis points（bps）。** bps = 4 桁精度 = 実際の取引所（HL / Binance / Drift）が margin を表現する解像度。\`RATE_SCALE\` と同じ i64-saturating 規律で、違うのはスケールだけ。
- **margin と rate で scale が違う。** funding rate は 0.0001〜0.04（ppb 必要）、margin 要件は 0.02〜0.10（bps で十分）。マグニチュード差 2 桁 → スケールも 2 桁ずらす。実際のレンジをカバーする最小スケールを選ぶ（使わない精度を買わない）。
- **\`LiquidationParams\` はネットワーク状態であってユーザー状態でない。** 10% / 2% / 1.5% は consensus パラメータ（genesis で 1 回設定、governance を経て変更）。構造体にまとめて magic constant を \`compute.rs\` に散らさない。
- **\`hyperliquid_default()\` は \`const fn\`。** static / fixture / コンパイル時 assertion で使える。\`#[must_use]\` で構築して捨てる事故を禁じる（コンパイラを静的解析として駆動する）。
- **3 つの独立した \`u32\` フィールド、タプルでない。** 名前付きフィールドが \`initial\`/\`maintenance\` 取り違えを防ぐ（位置タプルは安全性を失うだけで実行時利益ゼロ）。

## 具体例

\`RATE_SCALE\` と \`MARGIN_SCALE\` の解像度差:

\`\`\`
                       Step 4（Funding）              Step 5（Liquidation）
スケール定数             RATE_SCALE = 1_000_000_000      MARGIN_SCALE = 10_000
                       (parts-per-billion, 10⁹)        (basis points, 10⁴)
精度                    9 decimal digits                4 decimal digits
扱う典型レンジ           0.0001% — 4% / interval         2% — 10% (maintenance) / 10% — 50% (initial)
本番で意味ある最小ステップ  0.0001% (= 10 ppb)               1 bp = 0.01%
1.0 を表す raw 値        1_000_000_000                   10_000
\`\`\`

解像度はドメインの慣例単位に合わせる。funding は per-billion でしか表せない差を扱うので ppb、margin は本番設定が bps 整数（200 / 500 bps）で来るので bps。揃えると使わない精度のため i64 ヘッドルームを浪費する。

## 失敗例（誤解）

「レッスン5/6 で使うなら \`openhl-clob\`/\`openhl-funding\` も dev-dep でいい」は誤り — production の \`compute.rs\` 関数シグネチャが \`MarkPrice\`/\`AccountId\` を使う（test 専用でない）。\`pub fn\` シグネチャに現れる型は dev-only でなく通常 dep。

---

ここまでで「なぜ bps」は着地した。ここから空 crate を「公開された scale 定数 + エンジンを支配するパラメータ」を持つ実 crate に育てる（テストなし — 値であって挙動でない。最初のテストはレッスン4）。コードは完全形。

> 🛑 **予測。** funding は \`RATE_SCALE = 1e9\`（ppb、9 桁）なのに liquidation は \`MARGIN_SCALE = 10_000\`（bps、4 桁）— なぜ？（答え: 必要な解像度は意味のある最小ステップに従う。funding rate の 0.0001% は高ボリュームトレーダーに意味がある差なので ppb が正しい。maintenance margin が 0.02% か 0.05% かは engine 層で意味のある差にならない（本番は bps 整数で設定）。実際のレンジをカバーする最小スケールを選ぶ。）

## ステップで組み立てる

### Step 1: Cargo.toml を更新

\`\`\`toml
[dependencies]
openhl-clob    = { path = "../clob" }
openhl-funding = { path = "../funding" }

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
\`\`\`

\`openhl-clob\`（\`AccountId\`/\`Side\`/\`Qty\`）+ \`openhl-funding\`（\`MarkPrice\`/\`PositionSize\`/\`Notional\`）— 両方 production の型シグネチャに乗る（dev-dep でない）。\`proptest\` はレッスン5/6 で使うので今宣言。

### Step 2: src/types.rs を作成

\`\`\`rust
//! Core types for the liquidation engine.
//!
//! Pure data — no I/O, no allocation. Every type is \`Copy\`-friendly so the
//! engine can be invoked on snapshots taken at the bridge layer without
//! lifetime gymnastics. The convention follows \`openhl-funding\`: the
//! liquidation crate never owns mutable state in compute; it computes
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
/// out of the account's collateral, and credited to the insurance fund.
/// A typical HL-style value is 1–2% (100–200 bps).
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
    /// for larger position sizes) — out of scope for compute.
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

\`MARGIN_SCALE: i64\`（margin ratio の乗算は i128 中間→i64 saturate なので、最初から i64 にして各サイトの \`as i64\` キャストを散らさない）。pub フィールド + \`const fn\` ゲッター（透明な params、カプセル化境界なし）。\`hyperliquid_default()\` は \`const fn\`（static に乗る）+ \`#[must_use]\`。

### Step 3: src/lib.rs を更新

\`\`\`rust
//! \`openhl-liquidation\` — perpetual-position liquidation engine.
//!
//! Pure compute: no I/O, no async, no networking. Liquidation
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

\`pub use types::*\` でなく explicit（public API のチェックリスト）。\`[\`MarginHealth\`]\` クロス参照はレッスン2 まで warning（funding と同じ扱い、抑制しない）。

### Step 4: コンパイル

\`cargo build -p openhl-liquidation\` が通り、rustdoc warning 1 つ（\`MarginHealth\` 未解決、レッスン2 で解消）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/Cargo.toml ./crates/liquidation/Cargo.toml
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
git checkout main
\`\`\`

Cargo.toml は完全一致、types.rs は最初の ~50 行（module doc + \`MARGIN_SCALE\` + \`LiquidationParams\`）、lib.rs は最初の ~25 行（crate doc + \`pub mod types;\` + 2 re-export）。

## 合格基準

\`cargo build -p openhl-liquidation\` が warning 1（\`MarginHealth\`）。よくあるエラー: \`E0463\`（\`openhl-clob\`/\`openhl-funding\` dep 忘れ）/ \`E0583\`（\`pub mod compute\` を先取り）/ manifest parse（\`[dev-dependencies]\` typo）。

## まとめ（3行）

- margin の固定小数点単位は \`MARGIN_SCALE = 10_000\`（bps）— 取引所が margin を表現する慣例解像度。funding の ppb と違うのはマグニチュード差 2 桁ぶんスケールをずらすから（使わない精度を買わない）。
- \`LiquidationParams\`（initial/maintenance/fee bps）はネットワーク状態。\`hyperliquid_default()\`（10%/2%/1.5%）は \`const fn\`+\`#[must_use]\`、3 つの名前付き \`u32\` フィールド（タプルでない）。
- 依存は \`openhl-clob\`（\`AccountId\`/\`Side\`/\`Qty\`）+ \`openhl-funding\`（\`MarkPrice\`/\`PositionSize\`/\`Notional\`）の通常 dep。テストなし（値であって挙動でない）。

## 次のレッスン（レッスン2）

\`MarginRatio\` newtype と \`MarginHealth\` enum（\`Safe\`/\`AtRisk\`/\`Liquidatable\`/\`Underwater\`）を追加。これ以降の 5 レッスンはどれもこの型を return/consume する。\`bool\` でも \`u8\` でもなく 4-variant enum を選ぶ理由を見る。`,
                },
                {
                  title: "レッスン2 — MarginRatio + MarginHealth — エンジンが返す分類型",
                  slug: "openhl-liquidation-margin-types-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン2 — \`MarginRatio\` + \`MarginHealth\` — エンジンが返す分類型

## 問い

margin_health を表す型は何にすべきか？ \`bool\`（liquidatable か否か）で足りるか？ エンジンはアカウントごとに「新規リスクを取れるか / force-close すべきか / close だけで不足カバーできるか」の判断をする。これを 1 つの型でどう表すか？

## 原理（最小モデル）

- **\`MarginRatio\` は \`type\` alias でなく newtype。** newtype なら「bps スケールの ratio を期待する所に生の i64 を渡した」をコンパイル時に捕まえる（funding の \`MarkPrice(pub u64)\` vs \`u64\` と同じ規律）。
- **\`MarginHealth\` はちょうど 4 variants。** \`Safe\`/\`AtRisk\`/\`Liquidatable\`/\`Underwater\`、それぞれ異なるエンジン動作を許可する。どれを潰しても他の部分が必要とする情報が失われる。
- **enum のカーディナリティ = それが許可する action のカーディナリティ。** エンジンが下流で 3 判断（新規可否 / force-close 可否 / close だけで足りるか）するから 4 variant。
- **\`MarginHealth\` に \`PartialOrd\`/\`Ord\` を derive しない。** variants は worsening order を成すが、\`health > Safe\` の順序比較はコード臭。\`matches!(health, Liquidatable | Underwater)\` のほうが意図が明示的で exhaustiveness check も効く。

## 具体例

4 variant が許可する action のマトリクス:

\`\`\`
                    │ (a) 新規ポジ開ける? │ (b) Force-close?  │ (c) close だけで不足カバー? │
   Safe              │ ✅ yes              │ ❌ no              │ N/A (close 不要)           │
   AtRisk            │ ❌ no               │ ❌ no              │ N/A (close 不要)           │
   Liquidatable      │ ❌ no               │ ✅ yes             │ ✅ yes (equity 残あり)      │
   Underwater        │ ❌ no               │ ✅ yes             │ ❌ no → insurance fund 吸収 │

下流挙動: Safe→運用継続 / AtRisk→警告・新規拒否 / Liquidatable→close+fee+残返却 / Underwater→close+不足を fund 補填
\`\`\`

各 variant がそのまま「許可される action のセット」を表す。state machine の variants は、自分がトリガーする下流 action の数だけ存在する。

## 失敗例（誤解）

「\`MarginHealth\` は \`bool\`（liquidatable か否か）でいい」は誤り — エンジンは 1 でなく 3 つの下流判断を要求する。\`bool\` だと (a)「新規ポジを開けるか」と (c)「insurance fund が関与するか」を 1 ビットに潰す。\`Liquidatable\` と \`Underwater\` をマージすると「insurance fund を呼ぶべきか」の信号が型から消え、エンジンが equity を再計算する羽目に。

---

ここまでで「4 variant = 3 判断 + 1」は着地した。ここから 2 つの分類型を足す（受動的データ型なのでテストなし、最初の挙動テストはレッスン4）。コードは完全形。

> 🛑 **予測。** \`MarginHealth\` は何 variants 必要か？（ヒント: エンジンは各アカウントで 3 判断 — (a) 新規リスクを取れる? (b) force-close すべき? (c) close だけで不足カバーできる?）（答え: 3 問 → 4 variants。\`Safe\`=(a)yes、\`AtRisk\`=(a)no/(b)no、\`Liquidatable\`=(a)no/(b)yes/(c)yes、\`Underwater\`=(a)no/(b)yes/(c)no。3-variant に潰すと \`Liquidatable\`/\`Underwater\` がマージされ「insurance fund が関与するか」の信号が消える。）

## ステップで組み立てる

### Step 1: src/types.rs に追記

\`LiquidationParams\` の impl の後に:

\`\`\`rust
/// Account margin ratio = \`equity / notional\`, scaled by [\`MARGIN_SCALE\`].
///
/// Sign: usually non-negative; can be negative when the account is
/// "underwater" — accumulated losses have driven equity below zero, and
/// liquidating the position alone cannot cover the deficit. The insurance
/// fund absorbs that shortfall.
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
    /// the shortfall.
    Underwater,
}
\`\`\`

\`MarginRatio(pub i64)\` は newtype（守るべき不変量がないので透明な pub フィールド、ゲッターで隠さない）。\`MarginHealth\` は **\`PartialOrd\`/\`Ord\` を derive しない**（worsening order を成すが順序比較はコード臭 — \`matches!\` で明示的に書く）。variant doc は条件でなく *authorization*（エンジンが何をすべきか）を語る。

### Step 2: src/lib.rs を更新

\`\`\`rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
\`\`\`

レッスン1 の \`MarginHealth\` rustdoc warning がここで解消する。

### Step 3: コンパイル

\`cargo build -p openhl-liquidation\` が **warning ゼロ**。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
git checkout main
\`\`\`

types.rs は \`MarginHealth::Underwater\` まで一致（次の \`AccountSnapshot\`/\`CloseOrderSpec\` はレッスン3）。lib.rs は \`compute\` モジュールと追加 re-export を除いて一致。

## 合格基準

\`cargo build -p openhl-liquidation\` が warning ゼロ。よくあるエラー: \`E0432\`（re-export 行の typo）/ ambiguous re-export（既存を拡張せず別行を追加 — すべて 1 つの \`pub use types::{...}\` に収める）。

## まとめ（3行）

- \`MarginRatio(pub i64)\` は newtype（alias でない）— ゼロコストで本物の型区別を生む。値が「整数」を超えた意味を運ぶときは newtype。
- \`MarginHealth\` は 4 variants = エンジンの 3 下流判断（新規/force-close/insurance 関与）に対応。enum のカーディナリティは許可する action のカーディナリティに揃える。
- \`PartialOrd\`/\`Ord\` を derive しない（\`health > AtRisk\` はどの worse か言わない）— \`matches!\` で明示的に書き、exhaustiveness check を効かせる。比較可能 enum はたいていコード臭。

## 次のレッスン（レッスン3）

\`AccountSnapshot\`（全 margin 関数の入力）と \`CloseOrderSpec\`（エンジンが bridge へ渡す出力）を追加し types モジュールを閉じる。\`funding::Position\` を再利用せず独自 snapshot を起こす理由を見る。`,
                },
                {
                  title: "レッスン3 — AccountSnapshot + CloseOrderSpec — エンジンの入出力型",
                  slug: "openhl-liquidation-snapshot-spec-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン3 — \`AccountSnapshot\` + \`CloseOrderSpec\` — エンジンの入出力型

## 問い

liquidation はアカウントごとに unrealized PnL（\`(mark - entry) * size\`）と equity（\`collateral + pnl\`）を計算する。だが \`funding::Position\` は \`(account, size)\` しか持たない。エンジンの入力型はどう設計し、出力（close order）には何を持たせるべきか？

## 原理（最小モデル）

- **liquidation は \`funding::Position\` を再利用せず独自 \`AccountSnapshot\` を定義する。** \`Position\` は \`(account, size)\`、liquidation は \`(account, size, avg_entry, collateral)\` が要る。2 crate・2 snapshot 型・cross-coupling なし。bridge がそれぞれを自分の台帳から組み立てる。
- **funding と共有する「snapshot」の規律。** エンジンは呼び出し側が組み立てた snapshot を consume、可変 state を所有しない。proptest が determinism バグを捕まえられるのはこの I/O-free な純粋さゆえ。
- **\`CloseOrderSpec\` に price フィールドを持たせない。** liquidation は常に market で close（エンジンは価格を選ばない）。bridge が \`clob::Action::SubmitMarket\` に変換し、板の次の価格で約定。
- **\`Side\`/\`Qty\` を liquidation-local の新型でなく \`openhl_clob\` から借りる。** matching engine が話すのと同じ概念。並行する \`Side\` enum を 2 つ置くと drift する翻訳サーフェスが生まれる。

## 具体例

types モジュールが確定する入出力 = エンジンと外界の唯一の接触面:

\`\`\`
   [上流: bridge/clearing (台帳の所有者)] ─tick ごとに snapshot 構築─►
   入力: AccountSnapshot { account, position_size, avg_entry, collateral }   (不変・read-only・Copy)
              │
   ★ liquidation エンジン (L4 notional/pnl → L5 equity/ratio → L6 health → L7 close_order_spec)
              │
   出力: CloseOrderSpec { account, side, qty }   (price なし=market、Liquidatable/Underwater のみ emit)
              │                                   + セクション3-4 で InsuranceFundDelta も並行 emit
   [下流: bridge → matching engine (CLOB)]
\`\`\`

(a) 2 つの型がエンジンと外界の唯一の接触面、(b) 入力 snapshot も出力 spec も不変 — エンジンは台帳を更新しない（所有権は bridge に残る）。レッスン0の「リスク計算専用の不変 snapshot 型を分離して依存をクリーンに保つ」の具体形。

## 失敗例（誤解）

「\`AccountSnapshot\` を \`openhl-funding\` 側に置いて両 crate で共有」は誤り — funding は \`avg_entry\` も \`collateral\` も必要としない。\`funding::Position\` に足すと funding snapshot が無駄に膨らみ、bridge は funding が無視するフィールドにまで値を入れる羽目に。2 crate・2 snapshot 型が正しい（bridge が正典台帳を持ち、tick ごとに 2 つの view を生成するコストは安い）。

---

ここまでで「2 crate・2 snapshot 型」は着地した。ここから 2 つの I/O 型を足して types モジュールを閉じる（受動的データ型、テストはレッスン4）。コードは完全形。

> 🛑 **予測。** unrealized PnL の式 \`(mark - entry) * size\` で、\`funding::Position\` から得られない入力は何か、なぜ funding では不要だったか？（答え: \`avg_entry\`（PnL 項）と \`collateral\`（equity）。funding の式 \`size * mark * rate\` に entry 係数はなく、collateral も読まない（funding の settlement delta は bridge で balance に適用、台帳管理は bridge に閉じる）。liquidation の仕事は \`collateral + pnl\` がしきい値を下回ったかを *測る* ことなので両方が要る。仕事が違えば snapshot も違う。）

## ステップで組み立てる

### Step 1: AccountSnapshot を追記

\`MarginHealth\` の後に:

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

\`avg_entry\` は \`MarkPrice\` 型で持つ（entry 価格と mark は同じ unit-of-account、別 \`EntryPrice\` 型は全 PnL サイトで変換を要して利益ゼロ）。\`collateral: Notional\` は signed（\`account_equity = collateral + unrealized_pnl\` を signed sum のまま流す — unsigned だと全 equity サイトで \`as i64\` キャスト。レッスン4 の符号トリックはこの「計算経路を全部 signed で統一」前提の上に成り立つ）。doc コメントが呼び出し側の契約（owning layer が avg_entry を維持）を明示。

### Step 2: CloseOrderSpec を追記

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

\`price\` フィールドなし（liquidation は価格を選ばず market、matching engine が板の深さで約定）。\`side: Side\` / \`qty: Qty\` は \`openhl_clob\` を再利用（並行 \`Side\` enum を 2 つ置くと変換レイヤーが drift の温床に — 1 enum・1 真実）。\`PositionSize\`(i64)→\`Qty\`(u64) の変換（\`unsigned_abs()\`）はレッスン7 で行う。

### Step 3: src/lib.rs を更新

\`\`\`rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

### Step 4: コンパイル

\`cargo build -p openhl-liquidation\` が warning も error もゼロ。**types モジュール完成。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
git checkout main
\`\`\`

types.rs は \`22eedf9\` と **byte-for-byte 完全一致**（セクション1 完了）。lib.rs はまだ \`pub mod compute;\` と compute 系 re-export が揃わない（レッスン4〜7）。

## 合格基準

\`cargo build -p openhl-liquidation\` が warning ゼロ。よくあるエラー: \`E0432\`（\`Qty\` import 欠け — types.rs 冒頭が \`use openhl_clob::{AccountId, Qty, Side};\` + \`use openhl_funding::{MarkPrice, Notional, PositionSize};\` のままか確認）/ \`Notional\` 未解決（同 import 行）。

## まとめ（3行）

- \`AccountSnapshot { account, position_size, avg_entry, collateral }\` は liquidation-local（funding と共有しない — 仕事が違えば snapshot も違う）。不変・read-only・Copy で、エンジンは台帳を所有しない。
- \`CloseOrderSpec { account, side, qty }\` は price なし（liquidation は market、価格選択は bridge 下のレイヤー）。\`Side\`/\`Qty\` は \`openhl_clob\` を借りる（境界の語彙は共有、内部型だけ特殊化）。
- \`collateral\` を signed \`Notional\` にして計算経路を全部 signed で統一（境界で変換、キャスト漏れの静かなバグを型不一致として根絶）。types モジュールは \`22eedf9\` と完全一致。

## 次のレッスン（レッスン4）

\`compute\` モジュール開始。\`notional_value\` + \`unrealized_pnl\` が crate 最初の挙動テストを呼び込む。long/short どちらでも符号が正しく揃う signed-multiplication のトリックと、i64 overflow を i128 中間値で防ぐ規律を見る。`,
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
                  title: "レッスン4 — notional_value + unrealized_pnl — signed-multiplication のトリック",
                  slug: "openhl-liquidation-notional-pnl-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 45,
                  xpReward: 80,
                  content: `# レッスン4 — \`notional_value\` + \`unrealized_pnl\` — signed-multiplication のトリック

## 問い

unrealized PnL は long が利益でも short が利益でも *正* の値を返したい。素朴には \`if size > 0 { (mark-entry)*|size| } else { (entry-mark)*|size| }\` と分岐する。だが long/short の 4 通りの符号を \`if\` なしで正しく捌く単一の式はあるか？ そして u64 の引き算 underflow / i64 overflow をどう防ぐ？

## 原理（最小モデル）

- **\`notional_value\` は \`u64\`、\`unrealized_pnl\` は \`i64\`。** notional exposure = \`|size| × mark\`（常に非負）、PnL = \`mark - entry\` が両側に振れる（signed）。返り型で符号を取り違えるバグをコンパイラが捕まえる。
- **\`i64\` の magnitude には \`abs()\` でなく \`unsigned_abs()\`。** \`i64::MIN.abs()\` は overflow（正の \`i64::MIN\` は表現できない）。\`unsigned_abs()\` は \`u64\` を返し panic しない。
- **分岐なしで long/short を捌く signed-multiplication。** \`(mark - entry) × size\`（\`size\` は signed）で 4 通りの符号が自然に着地する。\`if side == Long\` を一度も書かない。
- **i128 中間値の規律。** 符号を保ったまま減算（\`i128::from(mark.0) - i128::from(entry.0)\`）→ overflow しない積 → \`i64\` へ saturate。funding の \`compute_premium\` と同じ形。

## 具体例

\`(mark - entry) × size\` の 4 象限:

\`\`\`
                          mark > entry (diff = +)       mark < entry (diff = −)
   Long  (size = +)       (+)×(+) = + profit ✓          (−)×(+) = − loss ✓
                          (110−100)×+10 = +100          (90−100)×+10 = −100
   Short (size = −)       (+)×(−) = − loss ✓            (−)×(−) = + profit ✓
                          (110−100)×−10 = −100          (90−100)×−10 = +100
\`\`\`

\`size\` の符号が long/short の方向を、\`(mark - entry)\` の符号が値動きの方向を運び、積を取った瞬間に正しい profit/loss の符号が機械的に出る。\`if\` 分岐版は開発者が両 case を頭で再構築するため片側だけバグが残りやすい — signed multiplication はその再構築を型 + 算術ルールに外注する。

## 失敗例（誤解）

「\`(mark.0 as i64 - entry.0 as i64) × size\` を直接書けばいい」は誤り、問題 3 つ: (1) \`mark\`/\`entry\` が \`i64::MAX\` 超で as キャストが silent に wrap（最上位ビットが符号ビットに化ける）。(2) 両方が i64 に収まっても片方が \`i64::MIN\` 近く+他方が正で i64 減算が overflow。(3) 各オペランドが収まっても積 \`(mark-entry)×size\` が i64 を超えうる（\`i64::MAX\` サイズの position なら 1% の値動きで overflow）。\`as\` キャストは Rust 屈指の footgun。

---

ここまでで「signed-multiplication + i128 中間値」は着地した。ここから crate 初の挙動テストが走る（これ以降コード変更でアカウント間に wealth が動きうる）。コードは完全形。

> 🛑 **予測。** \`(mark - entry) × size\` を \`if\` なしで 4 符号すべて正しく捌けるのはなぜか？（ヒント: \`size\` 自身が long/short の符号を運んでいたら計算がどう転ぶか）（答え: \`size\` を signed i64 のまま掛ければ、Long+/Long−/Short+/Short− の 4 ケースで符号が正しく着地する。分岐がなく、コードパスが 2 本に分かれず、片方だけ「直して」他方を放置するリスクもない。\`PositionSize\` を signed にしたのはこのため — 型が long/short を運べば演算側が運ばなくて済む。）

## ステップで組み立てる

### Step 1: src/compute.rs を作成

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

module doc が 6 関数をプレビュー（レッスン4 は 2 つ着地、残りは L5-7）。\`use\` block は後のレッスンが使う型も今 import（レッスン7 まで unused warning が出るが許容 — \`use\` を 6 回いじる busywork より各レッスンの diff を絞る）。

### Step 2: notional_value を追加

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

返り型 \`u64\`（notional は magnitude、常に非負 — 呼び出し側の abs 取り忘れを型で潰す）。\`unsigned_abs()\`（\`.abs()\` でない — \`i64::MIN.abs()\` は UB）。\`saturating_mul\`（\`checked_mul\` でない — \`Option\` を全呼び出し側に伝播させない、極端入力でも使える値を返す）。

### Step 3: unrealized_pnl を追加

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

\`i128::from(...) - i128::from(...)\`（\`u64 - u64\` は負で panic、as i64 は最上位ビットが落ちる — 一段広く upcast、コストゼロ）。\`saturating_mul\` を i128 上で。末尾 \`saturate_i128_to_i64\`。符号ルールを doc に明文化（レビュアーの「short でも動く?」への正典参照）。

### Step 4: saturate_i128_to_i64 ヘルパー

\`\`\`rust
/// Saturating cast from \`i128\` to \`i64\`. Used wherever an intermediate
/// product can exceed \`i64::MAX\` at network-pathological inputs.
/// Saturation, not wrapping — see the module-doc note on why panicking
/// would be a worse failure mode.
fn saturate_i128_to_i64(v: i128) -> i64 {
    i64::try_from(v).unwrap_or(if v > 0 { i64::MAX } else { i64::MIN })
}
\`\`\`

private（\`pub\` なし、内部実装の選択）。\`try_from\` が収まらなければ \`Err\`、\`unwrap_or\` が符号で行き先を選ぶ（\`v == 0\` は \`try_from\` が \`Ok(0)\` を返すので \`else\` は実質「v<0 の負方向 saturation」だけ拾う）。ヘルパー単体テストは置かない（\`unrealized_pnl\` のテストでカバー）。

### Step 5: テストを追加

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

\`snapshot()\` helper（変化する 3 値を表に、\`account\` をハードコード）。PnL 4 ケースが予測の 4 符号と一対一 + flat。\`use proptest::prelude::*\` は今書く（L5/L8 で使う、unused warning 許容）。テスト名は文として読める（CI のシグナル）。

### Step 6: src/lib.rs を更新

\`\`\`rust
pub mod compute;
pub mod types;

pub use compute::{notional_value, unrealized_pnl};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

### Step 7: テスト実行

\`cargo test -p openhl-liquidation\` が 8 pass（notional 3 + pnl 5）。crate 初の green run。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
git checkout main
\`\`\`

compute.rs は最初の ~80 行（module doc + import + \`notional_value\` + \`unrealized_pnl\` + helper + 8 テスト）まで一致。残り 4 関数 + proptest は L5-7。

## 合格基準

\`cargo test -p openhl-liquidation\` が 8 pass。よくあるエラー: unused import warning（まとめ import、L7 までに消える、想定どおり）/ \`unsigned_abs\` 未解決（Rust が古い、1.51+ で安定）/ \`*\` で overflow panic（\`saturating_mul\` に置換）。

## まとめ（3行）

- \`notional_value: u64\`（magnitude、非負）/ \`unrealized_pnl: i64\`（両側に振れる）— 返り型が不変量を表現。混ぜたい呼び出し側は明示変換（1 行 < silent な符号バグ群）。
- \`(mark - entry) × size\`（signed）が 4 符号を分岐なしで捌く — 演算が自然に扱えるケースは型システムに運ばせる。
- magnitude には \`unsigned_abs\`（\`abs\` は \`i64::MIN\` で UB）、中間値は i128（\`u64-u64\` panic / as キャスト wrap を回避）、overflow は saturate。

## 次のレッスン（レッスン5）

\`account_equity\` + \`margin_ratio\` を追加し、**compute で最も load-bearing な発見** — levered regime での \`margin_ratio\` の非単調性 — に出会う。proptest を書き、失敗を見て、トレースし、\`prop_assume!\` で refine する。最初のメンタルモデルが壊れて再構築されるレッスン。`,
                },
                {
                  title: "レッスン5 — account_equity + margin_ratio — そして最初のメンタルモデルを壊す proptest",
                  slug: "openhl-liquidation-equity-ratio-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 60,
                  xpReward: 100,
                  content: `# レッスン5 — \`account_equity\` + \`margin_ratio\` — そして最初のメンタルモデルを壊す proptest

## 問い

「long ポジションで mark が上がれば margin_ratio も上がる」— これは直感的に正しそうだ。proptest でこの不変量を主張したら、通るか？ もし小さな入力で失敗したら、それは関数のバグか、それとも不変量の書き方のバグか？

## 原理（最小モデル）

- **\`account_equity\` は \`i64\`、負にもなりうる。** \`collateral + unrealized_pnl\` で PnL が collateral を突き抜けて不足を生む。エンジンは不足を *測れる* 必要がある（でないと正しいレバーを引けない）。
- **\`margin_ratio\` は \`notional == 0\` を \`MarginRatio(i64::MAX)\` でガード。** flat は exposure ゼロ → margin 要件なし。最大 ratio = 「無限に safe」で、下流分類器が special-case なしに short-circuit できる。
- **\`equity × MARGIN_SCALE / notional\` の演算順。** 先に i128 で掛ければ小さい ratio も割り算を生き残る。先に i64 で割ると精度が落ちる。
- **levered regime での非単調性。** 「mark↑ → ratio↑」は \`collateral > entry × size\` の cash-heavy regime では **成り立たない**。proptest が捕まえる。対処は関数のパッチでなく、不変量の表現の refine。
- **\`prop_assume!\` が条件付き不変量を書く道具。** 不変量が入力空間の一部でしか成り立たないとき、assertion を弱めず入力をそのサブセットにフィルタする。
- **short と long で monotonicity の対称性が崩れる。** short は mark に対して *無条件に* monotonic、long はレバレッジが効く条件下でのみ。微分が理由を説明する。

## 具体例

long で \`collateral = 103\`、\`size = 1\`、\`entry = 100\` のとき:

\`\`\`
mark = 1:  notional=1,  pnl=(1−100)×1=−99, equity=103−99=4, ratio=4×10_000/1   = 40_000 bps (400%)
mark = 2:  notional=2,  pnl=(2−100)×1=−98, equity=103−98=5, ratio=5×10_000/2   = 25_000 bps (250%)
\`\`\`

mark が上がったのに ratio は 400%→250% に **下がった**。equity も上がった（4→5）が notional も上がり（1→2）、notional のほうが速く成長した。\`collateral > entry × size\` の cash-heavy regime では、mark が動くと ratio はどちらにも動きうる。

## 失敗例（誤解）

「long-monotonicity proptest が失敗したら \`margin_ratio\` にバグがあるので関数を直す」は誤り — 関数は正しい。バグは proptest の不変量の書き方にある（monotonicity が成り立たない regime に対しても主張している）。微分 \`d(ratio)/d(mark) = MARGIN_SCALE/mark² × (entry − collateral/size)\` の符号は \`entry × size\` と \`collateral\` の大小で決まる。対処は \`prop_assume!\` で levered regime に絞ること。

---

ここまでで「ratio は levered regime でのみ mark に monotonic」は着地した。ここから「書く→失敗→トレース→refine」の proptest discovery loop を実演する（これが本レッスンの load-bearing なスキル、急がない）。コードは完全形。

> 🛑 **予測。** long で \`collateral=100, size=1, entry=100\` のとき、mark=100/110/50 での margin_ratio は？（答え: 全部 **10_000 bps = 100%**。collateral がちょうど notional_at_entry に等しく、どの mark でも PnL の動きを collateral が相殺する。unlevered（exposure $1 に collateral $1）。ここが素朴な monotonicity の直感が壊れる regime — \`collateral ≥ notional_at_entry\` の cash-funded position では mark が動くと ratio はどちらにも動く。）

## ステップで組み立てる

### Step 1: account_equity を追記

\`\`\`rust
/// Account equity = \`collateral + unrealized_pnl\`. Can be negative.
///
/// A negative equity means losses have exceeded deposited collateral —
/// the account is underwater. The liquidation engine still attempts to
/// close the position; any residual deficit falls to the insurance fund.
#[must_use]
pub fn account_equity(snapshot: &AccountSnapshot, mark: MarkPrice) -> i64 {
    snapshot
        .collateral
        .0
        .saturating_add(unrealized_pnl(snapshot, mark))
}
\`\`\`

返り型 \`i64\`（doc が「負になりうる」、型がそれを本物に）。\`saturating_add\`（\`+\` でも \`checked_add\` でもない — 極端値で \`i64::MAX/MIN\` を返し、どちらも明確な health state として分類できる）。

### Step 2: margin_ratio を追記

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

\`notional == 0\` で \`i64::MAX\`（flat = 無限に safe、下流の \`if ratio >= initial_bps { Safe }\` が特例分岐なしに通る magic boundary）。乗算を除算より先に（小さい ratio も割り算を生き残る）。scaled product を i128 で受ける。整数のゼロ除算は panic するのでガード必須。

### Step 3: unit test を 5 個追加

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

各 ratio テストがコメントで厳密な算術を名指し。\`ratio_can_be_negative\` は \`assert!(r.0 < 0)\`（厳密値でなく符号 — rounding artifact をロックしない、property をテスト）。

### Step 4: Proptest を書く — 素朴な初版（prop_assume! なし）

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

\`cargo test\` すると最小 counterexample で **失敗**: \`mark_a=1 → r=40000; mark_b=2 → r=25000\`（minimal: \`size=1, entry=100, collateral=103\`）。**ここで止まる。関数を直さない。失敗を手でトレースする。**

### Step 5: 失敗を手で辿る

mark=1: \`notional=1, pnl=−99, equity=4, ratio=40_000 bps\`。mark=2: \`notional=2, pnl=−98, equity=5, ratio=25_000 bps\`。mark が上がると ratio が下がった（equity も上がったが notional がより速く成長）。一般式 \`ratio = MARGIN_SCALE × (collateral/notional + (1 − entry/mark))\` を mark で微分:

\`\`\`
d(margin_ratio)/d(mark) = MARGIN_SCALE / mark² × (entry − collateral / size)
\`\`\`

符号は \`entry − collateral/size\` の符号と一致:

\`\`\`
                         margin_ratio (Long、collateral と size を固定して mark を動かす)
   🔴 Cash-heavy (collateral > entry × size): ratio は mark↑ で ↘ 減少 ← 素朴な直感が破綻
   ◆ 境界 (collateral = entry × size, ちょうど 1x): ratio は mark に水平 (微分 = 0)
   🟢 Levered  (collateral < entry × size): ratio は mark↑ で ↗ 増加 ← 直感どおり、現実の 99%
\`\`\`

境界の位置は \`collateral\` と \`entry × size\` の大小だけで決まる（mark に依存しない）。失敗入力は \`entry×size=100, collateral=103\` で \`collateral > entry×size\` の cash-heavy regime。**これは \`margin_ratio\` のバグではない。関数は正しい。バグは proptest が monotonicity の成り立たない regime にも monotonicity を主張していること。**

### Step 6: prop_assume! で refine

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

テスト名末尾が \`_when_levered\`（名前が前提条件を運ぶ）。doc が前提条件の *なぜ* を名指し（意図的 scope 選択であって見落としでない）。入力レンジを制限せず \`prop_assume!\` を使う（inter-parameter 制約は strategy で組みにくい、assume なら assertion の隣で読める）。

### Step 7: Short-monotonicity proptest を追加（前提条件なし）

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

leverage 条件の \`prop_assume!\` がない（short monotonicity は無条件 — \`size<0\` で微分 \`= MARGIN_SCALE/mark² × (−collateral/|size| − entry)\` の両項が非正、一様に負）。この非対称性は本物の数学的事実。snapshot 構築時に \`-size\` を渡す（generator には正の size、\`size=0\` の flat を避ける）。

### Step 8: Determinism proptest を追加

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

pure 関数には自明だが *将来* のリグレッション（HashMap iteration / SystemTime / float の誤混入）を chain fork 前に捕まえる。広い入力レンジ（determinism はどこでも成り立つ）。維持コスト最小・違反発見コスト最小。

### Step 9: lib.rs を更新

\`\`\`rust
pub use compute::{account_equity, margin_ratio, notional_value, unrealized_pnl};
\`\`\`

### Step 10: テスト実行

\`cargo test -p openhl-liquidation\` が 16 pass（unit 13 + proptest 3、各 256 ケース ≈ 768 入力）。\`successes: 220, rejects: 36\` のような出力は問題なし（\`prop_assume!\` フィルタ）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
git checkout main
\`\`\`

compute.rs は \`margin_ratio\` + 最初の 13 unit test + 3 proptest まで一致（\`margin_health\`/\`close_order_spec\` は L6/L7）。lib.rs は compute re-export 6 個中 4 個。

## 合格基準

\`cargo test -p openhl-liquidation\` が 16 pass。サプライズ: \`successes: 220, rejects: 36\` は正常（assume フィルタ）/ proptest が想定より時間かかる場合も pure 算術なので実用上十分速い。

## まとめ（3行）

- \`account_equity: i64\`（負になりうる、underwater を測れる）/ \`margin_ratio\` は flat を \`MarginRatio(i64::MAX)\` でガード（「制約なし」を「最も safe な値」で表現、下流が special-case なしに short-circuit）。
- **proptest の失敗そのものがレッスン** — 素朴な long-monotonicity が cash-heavy regime（\`collateral > entry×size\`）で破れる。微分を自分で歩いて「ratio は levered regime でのみ monotonic」に到達。
- 条件付き不変量には \`prop_assume!\`（関数を強めず assertion を弱めず strategy を手で制限せず）。short は無条件 monotonic、long は levered のみ — この非対称は本物の数学的事実。

## 次のレッスン（レッスン6）

\`margin_health\` を追加（\`MarginRatio\` を params と比較し 4 variant にマップ）。境界 unit test 5 個と、各しきい値で strict-less-than を使う理由、最も極端な state を最初に check する cascade 順を見る。`,
                },
                {
                  title: "レッスン6 — margin_health — 分類カスケードと境界セマンティクス",
                  slug: "openhl-liquidation-margin-health-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン6 — \`margin_health\` — 分類カスケードと境界セマンティクス

## 問い

\`MarginRatio\` を 4 つの \`MarginHealth\` variant にマップする。条件は \`ratio < 0\`、\`ratio < maintenance\`、\`ratio < initial\`、それ以外。だが負の ratio は maintenance より *も* 小さい。cascade をどの順で書く？ 境界（ratio がちょうど maintenance）はどちらの state に属する？

## 原理（最小モデル）

- **cascade は \`Underwater\` を最初に check する。** 負の ratio は maintenance より *も* 小さいので、順序を逆にすると underwater が静かに Liquidatable に再分類され、insurance-fund シグナルが失われる。最も極端な state から先に check し、内側に narrow する。
- **すべての境界で strict-less-than。** \`ratio < maintenance_bps\`（\`≤\` でない）。ちょうど maintenance のアカウントは \`AtRisk\`（\`Liquidatable\` でない）。境界線そのものは *より良い* state に属する。
- **params 比較のための型 widening。** \`i64::from(params.initial_margin_bps)\` で u32→i64、その後 i64 同士の比較。各サイトの暗黙キャストを避ける。
- **Flat-as-Safe は無償、明示的に書かない。** \`margin_ratio\` が flat に \`i64::MAX\` を返し、それは妥当な initial_bps より大きいので、cascade は special-case なしに \`Safe\` に fall through。composition が片付ける。

## 具体例

4 状態の判定 cascade を margin ratio の数直線上に:

\`\`\`
   margin ratio:  ── −∞ ── 0 ─── maintenance_bps(200) ─── initial_bps(1000) ─── i64::MAX ──
                  🔴 Underwater    🟠 Liquidatable          🟡 AtRisk            🟢 Safe
                  (ratio < 0)      (0 ≤ ratio < maint)      (maint ≤ ratio       (initial ≤ ratio、
                                                            < initial)            flat の i64::MAX もここ)

   🟢 正しい cascade (内側に narrow):
      ① ratio < 0          → Underwater   ② ratio < maintenance → Liquidatable
      ③ ratio < initial    → AtRisk        ④ else                → Safe
   🔴 逆順 (広い領域を先に check):
      ① ratio < maintenance → Liquidatable  ← ratio = −5_000 (Underwater) も < 200 で「吸い込まれる」
      → insurance-fund シグナルが消え、Underwater の不足が通常 close path で silent に流れる
\`\`\`

cascade を「最も極端な領域から narrowing」として書くと、各分岐の条件は自然に上の分岐の補集合の中だけで成立する。

## 失敗例（誤解）

「cascade を \`Liquidatable → Underwater → ...\` の順（Liquidatable を先に）に書く」は誤り — ratio \`−5_000\` は \`< maintenance(200)\` も満たすので Liquidatable 分岐が先に発火し、Underwater check に到達しない。bridge は insurance-fund-needed シグナルを受け取らず、underwater な不足が通常の liquidation path を silent に通る（数学は「不足を解消できない」と言っているのに帳簿上は solvent に close）。

---

ここまでで「cascade 順 = 極端から先」は着地した。ここから分類関数を足す（規律は内面化済み、これは応用編）。コードは完全形。

> 🛑 **予測。** cascade を \`Liquidatable\`（\`ratio < maintenance\`）を最初に check する順で書いたら何が起きる？（答え: Underwater アカウントが Liquidatable に分類される。ratio \`−5_000\` は \`< maintenance(200)\` でもあるので Liquidatable 分岐が先に発火し、Underwater check に到達しない。bridge は insurance-fund シグナルを受け取らず、不足が silent に通常 path を通る。cascade 順は load-bearing — 最も極端な state から先に check し、各ステップが残りの範囲を narrow する。）

## ステップで組み立てる

### Step 1: margin_health を追記

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

cascade 順は Underwater 最初（各分岐の条件は前の分岐が捕まえたものを排除）。しきい値は全て \`<\`（境界線はより良い state に属する）。\`i64::from(...)\` で u32→i64 widening（params ごと 1 回、本体は i64<i64 として読める）。flat の special case なし（\`margin_ratio\` の \`i64::MAX\` で composition により無償に \`Safe\` に — 不変量を 1 箇所に閉じ込め下流は信頼する）。\`&LiquidationParams\`（読むだけ、consume しない）。

### Step 2: 境界テストを 5 個追加

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

variant ごと 4 + 境界 1。\`health_boundary_at_maintenance\` がないと \`<\`→\`≤\` リファクタが他 4 テストを pass したまま通る（本番ポジションの margin level はちょうどこの辺に集まる）。境界テストは独自 params を組み立てる（依存フィールドを文書化）。

### Step 3: lib.rs を更新

\`\`\`rust
pub use compute::{
    account_equity, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
\`\`\`

### Step 4: テスト実行

\`cargo test -p openhl-liquidation\` が 21 pass（L4-5 の 16 + 境界 5）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
git checkout main
\`\`\`

compute.rs は \`margin_health\` + 18 unit test + 3 proptest まで一致（\`close_order_spec\` は L7）。lib.rs は compute re-export 6 個中 5 個。

## 合格基準

\`cargo test -p openhl-liquidation\` が 21 pass。よくあるエラー: \`health_boundary_at_maintenance\` が \`Liquidatable\` で失敗（どこかで \`<\`→\`≤\`）/ \`health_underwater\` が \`Liquidatable\` で失敗（Underwater check が Liquidatable の後 — 並び替え）。

## まとめ（3行）

- cascade 順は最も極端な state を先に（\`Underwater → Liquidatable → AtRisk → Safe\`）— narrowing 方向に並べ、各分岐が前の分岐を排除。逆順だと深刻なケースが緩いケースの分岐を通り抜ける。
- しきい値で strict-less-than（境界線はより良い state に属する）— 慣例を選び doc で名指し境界テストで強制。
- flat の special case を書かない — \`margin_ratio\`（flat に \`i64::MAX\`）との composition で無償に \`Safe\`。不変量は 1 箇所で表現し下流が継承する。

## 次のレッスン（レッスン7）

\`close_order_spec\` で compute を閉じる（snapshot を bridge が consume する \`CloseOrderSpec\` に変換）。long→Sell / short→Buy / flat→qty 0 の 3 テスト。side-inversion ルールをロックし、pure-compute モジュールの完成をマークする。`,
                },
                {
                  title: "レッスン7 — close_order_spec — 純粋な compute の最後の関数",
                  slug: "openhl-liquidation-close-order-spec-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 20,
                  xpReward: 40,
                  content: `# レッスン7 — \`close_order_spec\` — 純粋な compute の最後の関数

## 問い

\`Liquidatable\` なポジションを force-close する。\`size = +10\` の long にはどんな \`Side\` と \`Qty\` を emit する？ \`size = −10\` の short は？ そしてこの関数は \`mark\` や \`params\` を受け取るべきか？

## 原理（最小モデル）

- **ポジションを close する基本ルール: side は常に反対。** long は売って close、short は買って close。エンジンは side を *決めず* 反転させるだけ。
- **public 境界での \`unsigned_abs\`。** レッスン4 の規律が bridge と会話する関数で表に出る。出力 \`Qty(u64)\` は CLOB が期待する型 — エンジンは符号変換を自分の境界で行う。
- **flat ポジションをフィルタしない。** flat は \`qty == 0\` の spec を生成、bridge が submit 前にフィルタ。\`close_order_spec\` を total かつ side-effect-free に保つと scanner と compose しやすい。
- **単一責任のスコープ。** \`close_order_spec\` は \`MarkPrice\` を取らない（market order に price なし）し \`LiquidationParams\` も取らない（liquidate するか否かは \`margin_health\` の仕事）。snapshot 1 つ入れて spec 1 つ出す。

## 具体例

CLOB と liquidation engine の橋:

\`\`\`
   保有ポジション              close_order_spec が emit する反対方向の市場注文
   Long  size = +10   ──[反転]──►  Side::Sell  qty = 10  → CLOB に「10 売り」、板の bid を食って flat
   Short size = −10   ──[反転]──►  Side::Buy   qty = 10  → CLOB に「10 買い」、板の ask を食って flat
   Flat  size =   0   ──[反転]──►  Side::Buy   qty =  0  → bridge がフィルタして submit せず

   この関数が決めるのは「方向反転」「magnitude を unsigned_abs で取り出す」の 2 つだけ:
   ・liquidate するかは レッスン6 margin_health が決定済み / いくらで close は CLOB の板が決定
   ・flat の spec を出さないフィルタは Bridge が行う — 各レイヤーがちょうど 1 つの関心事
\`\`\`

本質は side のインバージョンしかない。\`MarkPrice\` や \`LiquidationParams\` を持ち込むと価格発見や閾値判断の責務が混入する。

## 失敗例（誤解）

「\`if size >= 0 { Sell } else { Buy }\`（flat を Sell に）でいい」は誤り、問題 3 つ: (1) flat-as-Sell は挙動の選択で、pure compute でなく bridge に属する。(2) 現在の \`> 0\` は「flat は long でも short でもない」を正しく反映。(3) \`qty == 0 + Side::Sell\` の本番セマンティクスは matching engine で未定義（bridge がどのみちフィルタ）。エッジケースを隠す慣例でなく、最もクリーンな契約を提供する慣例を選ぶ。

---

ここまでで「side 反転 + unsigned_abs」は着地した。ここで compute を閉じる（関数は 11 行、存在理由は side-inversion ルールのロックと pure-compute 完成のマーク）。コードは完全形。

> 🛑 **予測。** \`size = 10\` の long を force-close する。どんな \`Side\` と \`Qty\`？ \`size = −10\` の short は？（答え: long → \`Side::Sell\`, \`Qty(10)\`、short → \`Side::Buy\`, \`Qty(10)\`。long は売って close（10 long 保有 → 10 売って flat）、short は買って close。quantity は常に position の magnitude、符号は side が運び qty には乗らない。\`Qty\` が \`u64\` なのは magnitude が符号を持たないから。）

## ステップで組み立てる

### Step 1: close_order_spec を追記

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

side は常に反対（long→Sell, short→Buy — matching engine は close の *意図* を知らず side が乗った order と見えるだけ）。\`unsigned_abs()\` が magnitude を \`u64\` で（符号変換を境界で 1 度）。\`> 0\` strict（flat は \`else\` で \`Side::Buy\`、qty 0 で無害）。\`mark\` も \`params\` も取らない（各関数が 1 つの関心事）。\`Option\` でなく値を返す（total — flat でも spec を返す、scanner が \`filter_map\` なしに均質に処理できる）。

### Step 2: 3 つの unit test を追加

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

\`close_long_with_sell\` は 3 出力フィールド全て assert（bridge が 3 つに依存）。\`close_short_with_buy\` は account をスキップ（同じ入力経路、long で動けば short でも）。\`close_flat_has_zero_qty\` は関数がフィルタ *しない* 契約を文書化（将来フィルタを足したら失敗する）。

### Step 3: lib.rs を更新

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
\`\`\`

6 つの compute 関数すべて re-export 完了。

### Step 4: テスト実行

\`cargo test -p openhl-liquidation\` が **24 pass**（L4-6 の 21 + close 3）。**compute（計算パート）が \`22eedf9\` に byte-for-byte 完成。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
git checkout main
\`\`\`

compute.rs / lib.rs ともに \`22eedf9\` と **byte-for-byte 一致**。Cargo.toml もレッスン1 以来一致。計算パートのすべてが揃った。

## 合格基準

\`cargo test -p openhl-liquidation\` が 24 pass。よくあるエラー: \`close_short_with_buy\` が \`Side::Sell\` で失敗（\`>= 0\` と書いた）/ \`close_flat_has_zero_qty\` が panic（\`.abs()\` を使った — \`unsigned_abs\` で通す）。

## まとめ（3行）

- side はポジション方向の反対（long→Sell, short→Buy）— 「曖昧」「不明」の分岐もフォールバックもない。ポジション方向の単純な反転が「close する」を最もシンプルに表現する。
- flat に対しても side-effect-free（zero-qty spec を返す、bridge がフィルタ）— total で compose しやすい。\`mark\` も \`params\` も取らない（単一責任が bridge の composition path を明白にする）。
- public 境界の \`unsigned_abs\` が符号変換を 1 度だけ行う。24 tests で計算パートが \`22eedf9\` に完成。

## 次のレッスン（レッスン8）— Insurance fund（保険基金パート）が始まる

\`InsuranceFund\` state machine が入る。計算パートが *何が起きるべきか* なら、保険基金パートは *何が起きたかを記録する帳簿*。fund の balance を track し、underwater liquidation の不足を吸収し、solvent な close から fee を credit する。SHA は \`260883b\` に切り替わる。`,
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
                  title: "レッスン8 — InsuranceFund — クレートが純粋でなくなる地点",
                  slug: "openhl-liquidation-insurance-fund-intro-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン8 — \`InsuranceFund\` — クレートが純粋でなくなる地点

## 問い

計算パートの \`compute.rs\` は pure だった（どの関数も引数からの決定的投影で、いつでも再計算できた）。だが insurance fund の balance は *履歴* の事実（deposit/withdraw の系列で変わる）— snapshot 1 つでは表現できない。crate に初めて state を導入し、複数の呼び出し側にまたがって \`balance ≥ 0\` を保つには？

## 原理（最小モデル）

- **state はコードに現れるのは入力から再導出できなくなる地点だけ。** fund の balance は「これまで起きた全 deposit/withdraw」の事実 — snapshot（1 アカウント 1 瞬間）では表現できない、genuinely state。
- **\`balance ≥ 0\` は型不変条件。** フィールドは \`i64\`（crate 全体と算術型を揃える）だが、**不変条件はコードで守る — 型システムでない**。\`new(-500)\`→0 にクランプ、\`deposit(-50)\`→no-op、\`withdraw\`→0 で飽和。すべての public メソッドを「不変条件を保つ遷移」として書く。
- **境界の防御 vs 関数の防御。** \`compute\` は入力を信用（in-crate コードから、入力は構築済み）。\`InsuranceFund\` は *境界そのもの*（bridge/scanner/ADL が異なるレイヤーから呼ぶ）— 多くの呼び出し側を集約する境界でこそ defensive coding が意味を持つ。
- **consensus state では saturating 演算。** \`deposit\` は \`+\` でなく \`saturating_add\`。\`+\` は debug で overflow panic（1 validator crash → fork）、release で silent wrap（validator ごとに異なる i64 → fork）。\`saturating_add\` は全ビルドで \`i64::MAX\` に clamp（全 validator が同じ値）。

## 具体例

なぜ state がここに現れるか:

\`\`\`
   計算パート — pure compute (compute.rs)
     margin_health/margin_ratio/close_order_spec — すべて入力からの投影、永遠に再計算可能
                          │
   保険基金パート — state machine (insurance.rs)
     InsuranceFund { balance: i64 }  ← fund が蓄積
       .deposit(fee) / .withdraw_shortfall(amount) / .balance()
     balance は *履歴* の事実。(deposit, withdraw) の系列が違えば balance も違う（最終呼び出しの引数が同一でも）
                          │
   スキャナパート — scanner (scanner.rs, L11-12)
     InsuranceFund を所有し liquidation event ごとに deposit/withdraw_shortfall を呼ぶ
\`\`\`

pure compute は返す。stateful なモジュールは蓄積する。

## 失敗例（誤解）

「\`pub fn new(initial: u64)\` にすれば不変条件は型で守られコードで守る必要がない」は誤り、問題 3 つ: (1) crate 他箇所は \`i64\` を fungible amount に使う（1 境界だけ型を変えると全呼び出し地点でキャスト）。(2) i64 を使う validator コードが fee 計算で \`u64::try_from\` の checked を要求される（saturation で足りる所に panic を植える）。(3) \`balance ≥ 0\` はどのみちコードで enforce されるので型レベル安全性は屋上屋。周辺の型規律に合わせ、crate 他箇所と同じ場所で不変条件を防御する。

---

ここまでで「state は履歴が effective なレイヤーに現れる」は着地した。ここから \`insurance.rs\` の半分（construction + deposit）を着地させる（withdraw は レッスン9）。コードは完全形。

> 🛑 **予測。** balance 1 つの state machine で複数の呼び出し側にまたがり \`balance ≥ 0\` を保つには、\`new(initial)\`/\`deposit(fee)\`/\`withdraw(amount)\` のどこで何を防御する？（答え: 3 つすべて。\`new\` は負の初期値を 0 にクランプ。\`deposit\` は負の fee を no-op（素通しすると fund がこっそり drain）。\`withdraw\` は負の shortfall を amount=0 の Covered 扱い + balance 超を 0 まで drain して残りを surface。public API が複数レイヤーから呼ばれるので、bad な呼び出し 1 つで型不変条件を破ってはならない。L8 は new/deposit、L9 が withdraw。）

## ステップで組み立てる

### Step 1: src/insurance.rs を作成（module doc）

\`\`\`rust
//! Insurance fund state machine (保険基金パート).
//!
//! The insurance fund is the venue's pooled buffer that absorbs the
//! deficit when a Liquidatable account's close turns underwater, or when
//! an Underwater account is liquidated outright. It accumulates the
//! liquidation fees that solvent closes pay in. The scanner (スキャナパート) will
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
//! [\`WithdrawOutcome\`].
//!
//! ### Deposit semantics
//!
//! \`deposit\` accepts a non-negative fee amount. Negative deposits are
//! treated as zero (saturating semantics, no panic) — defensive coding
//! against accidental misuse from the caller. Saturating-add caps at
//! \`i64::MAX\` for network-pathological accumulated balances.
\`\`\`

冒頭は型でなく *役割* から（最初の 1 文で safety-net cascade のどこに座るか分かる）。スキャナパート/ADL を先回り引用（計画された arc の一部）。Sign-discipline は型が *enforce しない* 不変条件の話。\`openhl_funding::clock\` を錨に（既知パターンを指す）。

### Step 2: InsuranceFund 構造体とコンストラクタ

\`\`\`rust
/// The insurance fund's accumulating balance.
///
/// Owned by the bridge (スキャナパート+), exposed via deposit / withdraw
/// operations that maintain the \`balance ≥ 0\` invariant.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InsuranceFund {
    balance: i64,
}

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

フィールドは private（\`balance ≥ 0\` を enforce する仕組みのすべて — public だと \`fund.balance = -1\` で契約を破れる）。\`new\` は負を 0 にクランプ（\`Result\` でも panic でもない — 借金を持つ fund は fund でない、最も近い valid へ）。\`empty()\`（意図が読める + \`Default\` が呼ぶ先）。全メソッド \`const fn\`（mutation しない処理は const-evaluable）+ \`#[must_use]\`。\`Default\` は手動 impl で \`Self::empty()\`（意図を明示）。

### Step 3: WithdrawOutcome enum scaffold

レッスン9 の変更を \`impl\` への純粋追加で済むよう、enum を今宣言する（\`impl\` の上に）:

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

enum の存在自体が public surface の物語（メカニズムの前に語彙を見せる）。各 variant が自分の payload を運ぶ（\`amount\`/\`unfilled\`）。doc の Layer 2 → Layer 3 boundary が cascade アーキを明示（margin=Layer1 / fund=Layer2 / ADL=Layer3）。

### Step 4: deposit メソッド

\`impl InsuranceFund\` に追加:

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

\`fee > 0\` strict（ゼロは no-op、「意味があるか」テスト）。負は silent に無視（panic は consensus に致命的、\`Result\` は全呼び出し側に unwrap/threading を強要）。\`saturating_add\`（\`+\` でない — debug panic / release wrap はどちらも fork）。新 balance を返す（log しやすい、\`HashMap::insert\` 形）。

### Step 5: lib.rs に配線

\`\`\`rust
pub mod compute;
pub mod insurance;
pub mod types;

pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
pub use insurance::{InsuranceFund, WithdrawOutcome};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
\`\`\`

型と enum を一度に re-export（利用者は呼ぶものを import、レッスン9 で \`lib.rs\` に触らない）。

### Step 6: 9 個の unit test

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

セクション区切りでグループ化。\`new_with_negative_clamps_to_zero\` は防御 surface を直接テスト（リファクタが「デッドコード」を消したら捕まえる）。\`deposit_negative_is_noop\` に \`// Defensive\` マーカー。\`deposit_saturates_at_max\` は \`i64::MAX - 10\` から（saturation が実際に発火する余地）。

### Step 7: テスト実行

\`cargo test -p openhl-liquidation\` が 33 pass（compute 24 + insurance 9）。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
git checkout main
\`\`\`

insurance.rs は \`260883b\` の 118 行目まで一致（\`withdraw_shortfall\`/proptest は レッスン9）。lib.rs は \`pub mod\` + \`InsuranceFund\`/\`WithdrawOutcome\` re-export について byte-for-byte 一致。

## 合格基準

\`cargo test -p openhl-liquidation\` が 33 pass。よくあるエラー: \`new_with_negative_clamps_to_zero\` が \`-500\`（\`if >= 0\` typo or クランプ忘れ — \`> 0\` を確認）/ \`deposit_saturates_at_max\` が overflow panic（\`+=\` を \`saturating_add\` に）/ \`deposit_negative_is_noop\` が \`50\`（\`if fee > 0\` ガード忘れ — saturating add だけでは不変条件を守れない）。

## まとめ（3行）

- state は履歴が effective なレイヤーに現れる — fund の balance は deposit/withdraw 系列の事実で snapshot では表現できない。計算パートは一方向の境界、保険基金パートが反対側を踏み出す。
- \`balance ≥ 0\` はコードで enforce（型でない）— crate 内の \`i64\` 型統一性がフィールド単位の符号なしに勝つ（不変条件が 1 行コードで済むなら）。
- defensive code は境界（bridge/scanner/ADL が集まる点）に集中。\`new\` は負をクランプ、\`deposit\` は \`saturating_add\` + 負を no-op（panic も wrap も fork を招く）。

## 次のレッスン（レッスン9）

\`withdraw_shortfall\` で insurance fund モジュールの drain path を閉じる。レッスン8 で宣言した \`WithdrawOutcome\` が variant を返すメソッドを得る（Covered / PartiallyDrained / Depleted = Layer2→Layer3 境界の 3 遷移）。4 つの proptest が保存則を enforce する。`,
                },
                {
                  title: "レッスン9 — withdraw_shortfall — Layer 2 → Layer 3 境界をコードで表現する",
                  slug: "openhl-liquidation-withdraw-shortfall-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 30,
                  xpReward: 60,
                  content: `# レッスン9 — \`withdraw_shortfall\` — Layer 2 → Layer 3 境界をコードで表現する

## 問い

fund から不足を引き出す \`withdraw_shortfall\` は、(a) balance が十分、(b) 部分的に drain して残りが出る、(c) すでに空、の 3 ケースを区別したい。戻り型は \`Option<i64>\`？ \`Result\`？ そして「型システムでは表現できない保存則（どの variant でも \`amount + unfilled = shortfall\`）」をどうテストする？

## 原理（最小モデル）

- **3-variant の outcome enum はカスケード境界を型で表現したもの。** \`Covered\`=「Layer 2 が完全吸収」、\`PartiallyDrained\`=「吸収できた分だけ + 残りをエスカレート」、\`Depleted\`=「Layer 2 には何もなく全部エスカレート」。ADL ルーチンがこの enum で match して何をすべきか決める。
- **全域関数のための early-return はしご。** 4 ケース（非正 shortfall / 空 fund / 十分 balance / 部分 drain）をネスト \`match\` でなく 4 つの guarded early return で。「これは *この* ケースか? Yes なら return、No なら次へ」と読める。
- **保存則を proptest で encode する。** 型は「3 variant ある」までは表現できるが「どの variant でも \`amount + unfilled = shortfall\`」までは表現できない。proptest がコンパイラの enforce できない不変条件をテストスイートが *enforce する* 形に格上げ。
- **新 state でなく *outcome* を返す \`&mut self\`。** \`deposit\`（新 balance を返す）と違い、\`withdraw_shortfall\` はパスごとに質的に異なる shape を返す。mutation が質的に異なる成功モードを持つときは違いを型で返す。

## 具体例

3 つの variant のメンタルモデル:

\`\`\`
   balance = 1000   withdraw_shortfall(300)    Covered { amount: 300 }
   balance = 1000   withdraw_shortfall(1000)   Covered { amount: 1000 }     ← ぴったり drain
   balance =  300   withdraw_shortfall(500)    PartiallyDrained { amount: 300, unfilled: 200 }
   balance =    0   withdraw_shortfall(500)    Depleted { unfilled: 500 }   ← 渡すものがない
   balance = 1000   withdraw_shortfall(0)      Covered { amount: 0 }        ← no-op
   balance = 1000   withdraw_shortfall(-100)   Covered { amount: 0 }        ← defensive
\`\`\`

\`Covered\` は「ぴったり一致」と「no-op」両方を扱う（variant が意味、payload が magnitude）。\`Depleted\` は state を変えない（観測されるために存在、アクション記録のためでない）。

## 失敗例（誤解）

「\`Result<i64, FundError>\` にして \`PartiallyDrained\`/\`Depleted\` を error に」は誤り、問題 3 つ: (1) これらは *エラーでない* — エスカレート作業を surface する成功 outcome。error タグは「失敗」と「caveat 付き成功」をぼやかす。(2) \`?\` 演算子が caller を short-circuit する（だがここでは scanning を続けたい）。(3) \`Result\` にすると全 consumer がヘルパーを \`Result\` propagation で包む。\`Result\` は「巻き戻すべきか?」、enum は「いまどんな成功をしたか?」。

---

ここまでで「3-variant = cascade 境界の 3 遷移」は着地した。ここから drain path を配線して insurance fund モジュールを閉じる。コードは完全形。

> 🛑 **予測。** balance 300 に \`withdraw_shortfall(500)\` → 新 balance と outcome は？ 続けて同じ fund に \`withdraw_shortfall(100)\` → ？（答え: 1 回目 balance 0、\`PartiallyDrained { amount: 300, unfilled: 200 }\`（300 を cover、200 を ADL へ）。2 回目 balance 0 のまま、\`Depleted { unfilled: 100 }\`（呼び出し前から空なので \`PartiallyDrained { amount: 0, ... }\` でなく \`Depleted\`）。区別は重要 — \`PartiallyDrained\`=「何か支払った」、\`Depleted\`=「何も支払っていない」、scanner は別々にログする（片方は drain しつつある、片方は枯渇した）。）

## ステップで組み立てる

### Step 1: withdraw_shortfall を追加

\`impl InsuranceFund\` の \`deposit\` の後に:

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

early-return はしごが 4 ケースを評価順で（非正→空→十分→部分 drain、各 guard は独立、ネスト \`match\` でなくはしご）。\`shortfall <= 0\` で負とゼロを 1 分岐（caller-facing なセマンティクスが同一）。\`self.balance -= shortfall\` は素の \`-\`（直前の guard \`balance >= shortfall\` がアンダーフロー不可を全 validator に決定論的に証明 — レッスン8 の saturating とは逆パターン、前提条件を証明できたので冗長な saturate を外す）。\`prior\` を先に保存（read→mutate→construct の時間順を明示）。\`&mut self\` + 値返し（variant 自体が成功の shape）。

### Step 2: 8 個の unit test

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

3 セクションが variant 名と一致（grep-friendly）。\`withdraw_covered_exact_balance\` は \`>=\` の境界（\`>\` への off-by-one を捕まえる）。\`withdraw_after_full_drain_is_depleted\` は state 遷移をテスト（mutation 前 balance をキャッシュする future bug を捕まえる）。\`deposit_after_drain_recovers\` は sequencing（メソッド境界を跨ぐ state-machine 遷移）。

### Step 3: 4 個の proptest

\`mod tests\` 冒頭に \`use proptest::prelude::*;\`、unit test の後に:

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

\`balance_never_negative\` はレッスン8 の型不変条件そのものの proptest（任意系列で成立）。\`deposit_is_additive\` は bounded 範囲（saturation を発火させず厳密等価、境界は unit test に）。or-pattern \`Covered { amount } | PartiallyDrained { amount, .. }\`（別 variant が payload フィールドを共有）。proptest は *どの* variant かを予測せず property を assert（パスを assert でない）。\`withdraw_amount_plus_unfilled_equals_shortfall\` は保存則（正の shortfall のみ）。全て \`prop_assert!\`/\`prop_assert_eq!\`（shrinkage 情報）。

### Step 4: テスト実行

\`cargo test -p openhl-liquidation\` が 45 pass（compute 24 + insurance 21）。**insurance.rs が \`260883b\` の withdraw まで一致。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
git checkout main
\`\`\`

insurance.rs は \`260883b\` の \`insurance.rs\` と一致（struct/enum/3 コンストラクタ/accessor/deposit/withdraw_shortfall/Default/12 unit test/4 proptest）。lib.rs はレッスン8 以降一致。

## 合格基準

\`cargo test -p openhl-liquidation\` が 45 pass。よくあるエラー: \`balance_never_negative\` が \`[(false, -100)]\` で失敗（負 shortfall を deposit のように扱う — \`if shortfall <= 0\` が最初のガード）/ \`withdraw_amount_plus_unfilled_equals_shortfall\` が \`total=300\`（\`PartiallyDrained\` が \`unfilled\` を運んでいない）/ \`withdraw_amount_matches_balance_delta\` が Depleted で \`delta=-N\`（Depleted 分岐で \`balance\` を mutate している — 触れずに return）。

## まとめ（3行）

- \`Option\`/\`Result\` でなく 3-variant outcome enum — caller の決定木にマッチ（完全 absorb をログ / 部分 + escalate / depletion + escalate の 3 routing 判断）。\`Result\` は partial-drain を失敗とタグ付けしてしまう。
- 4 ケースの early-return はしご（コスト順 — 安いチェック先、構造的 mutation 最後）。\`balance >= shortfall\` の guard を証明できたので素の \`-\`（saturate は冗長）。
- proptest が型で表現できない不変条件を encode（\`balance_never_negative\` = 型不変条件、\`amount + unfilled = shortfall\` = 保存則）。public メソッドの契約を *probe* でなく *prove* する。

## 次のレッスン（レッスン10）

\`compute.rs\` に戻り、compute と insurance の橋渡しをする 3 つの pure 関数（\`liquidation_fee\` / \`solvent_close_outcome\` / \`underwater_close_outcome\`）を追加。liquidation event を \`(fund credit, trader 残額)\` or \`(fund debit, partial fee)\` に分解する — scanner が \`deposit\`/\`withdraw_shortfall\` を呼ぶのに必要な shape。`,
                },
                {
                  title: "レッスン10 — liquidation_fee + close-outcome decomposition — compute と insurance をつなぐ橋",
                  slug: "openhl-liquidation-close-outcome-decomposition-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン10 — \`liquidation_fee\` + close-outcome decomposition — \`compute\` と \`insurance\` をつなぐ橋

## 問い

特定の close に対して insurance fund に「いくら deposit / drain するか」を計算するものがまだない。liquidation event を fund movement とアカウント残額に分解し、scanner が \`deposit\`/\`withdraw_shortfall\` に流せる数字を生むには？ そして solvent と underwater の 2 パスをどう分ける？

## 原理（最小モデル）

- **すべての liquidation event は \`(fund movement, account residual)\` のペアに分解できる。** solvent close は fund に credit + 正の residual を trader に。underwater close は fund に debit + 場合により partial fee。pure compute が credit/debit を生み、state machine が蓄積する。
- **\`debug_assert!\` を routing contract として使う。** \`solvent_close_outcome\` と \`underwater_close_outcome\` は非重複。それぞれが「*もう一方* の呼び出しでなかった」を debug-assert で表明。caller が routing 義務を負う discriminated dispatch、関数は前提条件のウィンドウ内でのみ total。
- **\`fee.saturating_sub(post_close_equity)\` が負値で magnitude 加算になる。** \`i64 − (負の i64) = i64 + |負|\`。「already-underwater」が「partial fee」と同じ式を再利用できる（負値の減算が magnitude の加算だから）。\`if\` の分岐が signed なら 1 式で両分岐をカバー。
- **\`Result\` でも 1 enum でもなく、2 つの異なる戻り型。** \`SolventClose { fee_to_fund, residual_to_account }\` と \`UnderwaterClose { fee_to_fund, shortfall_to_fund }\` は \`fee_to_fund\` を共有するが、もう一方が完全に異なる意味（residual は trader へ *出る*、shortfall は fund から *入る*）。2 struct が 1 enum に勝つ。

## 具体例

per-close 分解:

\`\`\`
   SOLVENT: post_close_equity ≥ fee → SolventClose { fee_to_fund: +X, residual_to_account: +Y }
     scanner: fund.deposit(fee_to_fund) / trader_balance += residual_to_account

   UNDERWATER (2 サブケースを 1 shape で):
     0 < post_close_equity < fee → UnderwaterClose { fee_to_fund: +X (partial), shortfall_to_fund: +Y }
     post_close_equity ≤ 0       → UnderwaterClose { fee_to_fund: 0,           shortfall_to_fund: +Z }
     scanner: fund.deposit(fee_to_fund) (0 のことも) / fund.withdraw_shortfall(shortfall_to_fund) → WithdrawOutcome
\`\`\`

\`SolventClose\` の出力はシステムから *出る*（trader へ）、\`UnderwaterClose\` の出力はシステムへ *入る*（fund から）— magnitude の shape は同じ、方向だけ逆。お金の *方向* は符号でなくフィールド名に住む。この分解が scanner を dumb なままにする。

## 失敗例（誤解）

「\`solvent_close_outcome\` と \`underwater_close_outcome\` を 1 関数にまとめて \`Result<SolventClose, UnderwaterClose>\` を返す」は誤り、問題 3 つ: (1) どちらの outcome もエラーでない（両方成功、別 state-machine 操作に route）。(2) scanner は margin health を *すでに* チェックして適切なほうを呼ぶ（\`Result\` dispatch は仕事を繰り返す）。(3) \`debug_assert!\` のペアは 2 関数のほうが意味を持つ（各関数が自分の契約を表明）。反対前提条件の 2 関数 > tagged union を返す 1 関数。

---

ここまでで「\`(fund movement, account residual)\` 分解」は着地した。ここで保険基金パートを閉じる（compute と insurance がカスケード数学を介して会話する）。コードは完全形。

> 🛑 **予測。** 1 BTC long、entry $100k、collateral $10k、$80,500 で force-close（損失 $19,500）。HL の \`liquidation_fee_bps\`=150。fund は credit か debit か、金額は？（答え: **debit、$10,707 を吸収**。notional $80,500、fee = 80,500×150/10,000 = $1,207。realized PnL −$19,500、post_close_equity = 10,000 + (−19,500) = −$9,500 — *fee 前に* すでに underwater。fee を徴収できず、fund は「望ましかった fee」+「負 equity」を cover: $1,207 + $9,500 = $10,707。これが「already underwater」サブケース。）

## ステップで組み立てる

### Step 1: types.rs に SolventClose + UnderwaterClose

\`CloseOrderSpec\` の後に:

\`\`\`rust
/// Solvent-close outcome (保険基金パート).
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

/// Underwater-close outcome (保険基金パート).
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

両フィールド \`i64\`（crate 型統一性）。doc はフィールドの *行き先* を名指す（*出どころ* でない — caller がどう使うかで名付ける）。\`UnderwaterClose\` はサブケースに関わらず \`shortfall_to_fund\` を常に運ぶ（caller は struct shape でなく *値* に match）。

### Step 2: compute.rs に liquidation_fee

\`saturate_i128_to_i64\` の後に:

\`\`\`rust
/// Liquidation fee on a closed notional, in quote units.
///
/// \`fee = notional × fee_bps / MARGIN_SCALE\`, saturating on overflow.
/// Pure math — the caller (スキャナパート scanner / bridge) supplies the
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

\`closed_notional: u64\`（入力、magnitude）→ \`i64\`（出力、crate 算術に揃える）。\`closed_notional == 0\` fast-path。\`i128::from\`（\`as\` でない、widening は無敗）。\`saturating_mul\`（\`u64::MAX × u32::MAX ≈ 2^96\` が i128 を超えうる）。除算は素の \`/\`（両オペランド非負、overflow しない）。

### Step 3: compute.rs に solvent_close_outcome

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
/// Pure compute that produces the credit/debit pair for the caller
/// (スキャナパート scanner) to apply against [\`crate::insurance::InsuranceFund\`]
/// and the trader's balance.
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

計算パートの 3 関数を compose（\`notional_value\`/\`liquidation_fee\`/\`account_equity\`、新しい数学なし）。\`debug_assert!\` が契約そのもの（caller の routing 判断と等価、debug で発火・release でコンパイルアウト）。format-string capture（pass する限りゼロコスト）。\`saturating_sub\`（debug_assert のベルト＆サスペンダー的補完 — release で上流バグが来ても clamp）。

### Step 4: compute.rs に underwater_close_outcome

\`\`\`rust
/// Underwater-close outcome — the account's post-close equity cannot
/// cover the liquidation fee, so the insurance fund must absorb the
/// shortfall.
///
/// Handles both sub-cases under one shape:
///   - Positive but insufficient post-close equity (Liquidatable account
///     whose close + fee turned underwater): the equity is paid as a
///     partial fee, the rest becomes the shortfall.
///   - Negative post-close equity (Underwater account): no fee is
///     collected, the entire fee plus \`|equity|\` becomes the shortfall.
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

2 つのサブケース分岐が同じ \`shortfall_to_fund\` 式を共有（\`fee.saturating_sub(post_close_equity)\`、\`fee=1207, equity=-9500\` → \`1207-(-9500)=10707\`、\`.abs()\` も明示的 \`+\` も「符号で分岐」も書かずに到達 — 整数の「負値の減算」が「magnitude の加算」と等価）。\`if post_close_equity > 0\` strict（equity=0 は else に落ち \`fee_to_fund=0\`）。\`debug_assert!\` の述語が \`solvent\` から反転（2 つの assertion が入力空間の非重複カバー、discriminated dispatch を証明）。

### Step 5: 10 個の unit test

\`\`\`rust
    // ─── 保険基金パート: liquidation_fee ────────────────────────────────

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

    // ─── 保険基金パート: solvent_close_outcome ──────────────────────────

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
        // size=1, entry=10_000, collateral=150, mark=10_000.
        //   notional = 10_000; fee = 150; pnl = 0; post_close_equity = 150
        let s = snapshot(1, 10_000, 150);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(10_000), &params);
        assert_eq!(outcome.fee_to_fund, 150);
        assert_eq!(outcome.residual_to_account, 0);
    }

    // ─── 保険基金パート: underwater_close_outcome ────────────────────────

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

\`fee_basic\` は Perp Primer レッスン3 の数字（curriculum-to-implementation reinforcement）。\`fee_saturates_on_pathological_input\` が i128 saturation path を exercise する唯一のテスト。\`solvent_close_short_profit\` が long-loss の補完（符号付き入力は両符号をカバー）。\`underwater_close_already_underwater_pre_fee\` が Primer レッスン3 の数字を再利用（$10,707）。

### Step 6: lib.rs を更新

\`\`\`rust
pub use compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, margin_ratio,
    notional_value, solvent_close_outcome, underwater_close_outcome, unrealized_pnl,
};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, SolventClose,
    UnderwaterClose, MARGIN_SCALE,
};
\`\`\`

### Step 7: テスト実行

\`cargo test -p openhl-liquidation\` が **55 pass**（compute 34 + insurance 21）。**保険基金パート完成、crate 全体が \`260883b\` に byte-for-byte 一致。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
git checkout main
\`\`\`

compute.rs / types.rs / lib.rs ともに \`260883b\` と **byte-for-byte 一致**、insurance.rs はレッスン9 以来一致。**保険基金パート完成。**

## 合格基準

\`cargo test -p openhl-liquidation\` が 55 pass。よくあるエラー: \`underwater_close_already_underwater_pre_fee\` が負の shortfall（\`fee - post_close_equity\` の符号取り違え — \`fee.saturating_sub(post_close_equity)\` = \`1207-(-9500)=+10707\`）/ \`underwater_close_partial_fee_collection\` が \`fee_to_fund: 0\`（\`>\` でなく \`>=\` と書いた）/ \`solvent_close_typical_liquidatable\` が \`debug_assert!\` panic（L4/L5 の \`account_equity\`/\`notional_value\` が誤符号 — 上流を先に修正）/ \`fee_saturates_*\` が overflow panic（\`n * bps\` を \`n.saturating_mul(bps)\` に）。

## まとめ（3行）

- \`(fund movement, account outcome)\` 分解が cascade を composable に — scanner は solvent/underwater を判定して適切な outcome 関数を呼び credit/debit を route するだけ（数学と state のクリーンな分解で state-machine 層は dumb のまま）。
- \`debug_assert!\` は契約（dev で caller の routing bug を捕まえる）、\`saturating_sub\` はシートベルト（release で上流バグを clamp）— 二段構えで dev と prod 両方をカバー。
- 反対前提条件の 2 関数 > tagged union の 1 関数（caller が routing 判断済みなら）。\`fee.saturating_sub(負の equity)\` が magnitude 加算になり 1 式で 2 サブケースを捌く。crate 全体が \`260883b\` に一致。

## 次のレッスン（レッスン11）— LiquidationScanner 導入（スキャナパート）

multi-account scanner が始まる。\`&[AccountSnapshot]\` を取り、各アカウントを \`margin_health\` で分類し、Liquidatable/Underwater に \`solvent_close_outcome\`/\`underwater_close_outcome\` を呼び、credit/debit を所有する \`InsuranceFund\` にスレッディングし、\`ScanReport\` を返す。SHA pin は \`260883b\` から \`0a8464e\`（スキャナパート）に進む。`,
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
                  title: "レッスン11 — Scanner 型の語彙 — CloseOutcomeKind / LiquidationRecord / ScanReport / LiquidationScanner",
                  slug: "openhl-liquidation-scanner-types-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 25,
                  xpReward: 50,
                  content: `# レッスン11 — Scanner 型の語彙 — \`CloseOutcomeKind\` / \`LiquidationRecord\` / \`ScanReport\` / \`LiquidationScanner\`

## 問い

計算パートは \`MarginHealth\`（per-account 分類）を、保険基金パートは \`SolventClose\`/\`UnderwaterClose\`（per-close 分解）と \`WithdrawOutcome\`（per-fund-call outcome）を生んだ。multi-account scanner が毎ブロック返す *batch-level* の結果は、どんな型語彙で表す？ そして scanner は insurance fund をどう所有する？

## 原理（最小モデル）

- **orchestration 層には別の型語彙が必要。** スキャナパートは batch-level の型を導入: \`CloseOutcomeKind\`（close の kind）/ \`LiquidationRecord\`（liquidate 1 件の row）/ \`ScanReport\`（1 scan で起きたすべて）。各層が異なる問いに答えるので各層が独自の語彙を持つ。
- **\`CloseOutcomeKind\` は \`SolventClose\`/\`UnderwaterClose\` の discriminated union。** variant 2 つ、各々が対応する保険基金パート関数の生んだ struct を運ぶ。scanner が match して post-close 仕事を dispatch。上位層が下位層の 2 出力を route するとき、各出力を運ぶ variant が最もきれいな橋渡し。
- **\`ScanReport\` は per-account record の vector AND aggregate 合計の両方。** records = audit trail（iteration 順）、3 つの aggregate i64（\`fund_deposits\`/\`fund_withdrawals\`/\`unfilled_deficit\`）= telemetry summary（bridge が records を iterate せず読める）。scan loop 内で事前計算するのはコスト 0。
- **\`LiquidationScanner\` は \`InsuranceFund\` を直接所有（\`Arc<Mutex<...>>\` でない）。** per-bridge コンポーネント、共有リソースでない。ブロックごとにちょうど 1 回 mutate される state machine は同期プリミティブを必要としない。

## 具体例

型レイヤリング:

\`\`\`
   enum CloseOutcomeKind { Solvent(SolventClose), Underwater(UnderwaterClose) }   ← 唯一の新 enum
   struct LiquidationRecord { account, close_order, classification, outcome }     ← per-account
   struct ScanReport { records: Vec<LiquidationRecord>, fund_deposits, fund_withdrawals, unfilled_deficit }  ← per-batch
   struct LiquidationScanner { params, fund: InsuranceFund }   ← 所有、共有でない
\`\`\`

\`CloseOutcomeKind\` が唯一の新 enum（routing 判断は計算パートの \`debug_assert!\` ペアで済んでいる、enum は judgment を *carry through* するため）。aggregate i64 は scan loop 中に \`saturating_add\` で計算（second pass は無駄）。

## 失敗例（誤解）

「scanner は \`InsuranceFund\` を \`Arc<Mutex<...>>\` か \`&'a mut\` で持つべき」は誤り、問題 3 つ: (1) \`&'a mut\` は lifetime parameter を導入し scanner を保持する全型に伝播する。(2) \`Arc<Mutex<...>>\` は shared mutable state 用だが scanner は shared でなく bridge が所有（競合のない同期は overhead でしかない）。(3) 値所有なら scanner の lifetime が fund の lifetime、\`into_fund\` が shutdown 時のクリーンな handoff を与える。ownership は lifecycle に合わせる（per-bridge、single mutator、shutdown 時 persist）。

---

ここまでで「orchestration 層は独自の語彙を持つ」は着地した。ここから型語彙を整える（\`scan\` メソッドは レッスン12、テストもまだ — 型語彙に testable behavior がない）。コードは完全形。

> 🛑 **予測。** \`scan\` が返す \`ScanReport\` にどんなフィールドが入るべきか？ report 内の per-account record には？（答え: scan report = liquidate 1 件あたり record + fund deposit 合計 + fund 支払い合計 + unfilled deficit 合計。per-account record = account ID + close-order spec + pre-close 分類（traceability）+ post-close outcome 分解。scanner は同じデータの 2 view（CLOB submit 用 records + telemetry/ADL を O(1) で読める aggregate）を bridge に渡す。）

## ステップで組み立てる

### Step 1: src/scanner.rs を作成（module doc + imports）

\`\`\`rust
//! Multi-account liquidation scanner (スキャナパート).
//!
//! The scanner is the orchestration layer that ties 計算パート (margin
//! classification + close-order generation) and 保険基金パート (insurance
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
//! \`Vec\`'s ordered iteration and the fully-deterministic 計算パート／保険基金パート
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
//! ### ADL handoff
//!
//! [\`ScanReport::unfilled_deficit\`] is the load-bearing signal that the
//! fund couldn't absorb everything. The scanner records it; a future ADL
//! stage would consume it to drive ADL ranking and force-close
//! profitable counter-positions. Until then, the bridge can either panic
//! on \`unfilled_deficit > 0\` (conservative — halt the chain) or log and
//! continue (permissive — accept the deficit as a protocol loss).

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

冒頭 1 文で *誰が何を呼ぶか*（bridge が所有・毎ブロック \`scan\` を呼び \`ScanReport\` を consume）。Determinism セクションが責任を名指す（scanner は決定的、accounts の決定的順序は bridge の責任）。Fairness が v0 ポリシー（FIFO）+ 後継を名指す。import ブロックの広さは意図的（スキャナパート = 計算パート + 保険基金パートのすべて、bill of materials）。

### Step 2: CloseOutcomeKind

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

tuple variant（各 variant が 1 payload — \`Solvent(close)\` が \`Solvent { close }\` よりクリーン）。\`Copy\`（両 payload が Copy）。doc が 2 payload を名指す（\`Underwater\` の「zero fee, full shortfall」サブケースは signature から見えない）。catch-all なし（2-variant = 最小の discriminated dispatch）。

### Step 3: LiquidationRecord

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

4 フィールド、3 つは既存 \`Copy\` 型（新規フィールドなし = 純粋な語彙拡張）。\`classification\` は \`MarginHealth\`（4 variant を許すが、契約は record に現れるのは 2 つに narrow — doc に書く、別 sub-enum でない）。**\`Liquidatable\`-classified → \`Underwater\`-outcome のノートが key の教授点**（classification は pre-close equity、outcome は post-close equity で fee が減らした — レッスン10 の \`underwater_close_partial_fee_collection\` がその具体例）。\`Copy\`（loop body が ergonomic）。\`Default\` なし（中立 state がない）。

### Step 4: ScanReport

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
    /// \`PartiallyDrained.unfilled\` and \`Depleted.unfilled\`). A future
    /// ADL stage consumes this as the ADL trigger.
    pub unfilled_deficit: i64,
}
\`\`\`

\`Clone + Default\` だが \`Copy\` でない（\`Vec\` は heap、compiler が enforce）。\`Default\` が意味を持つ（empty scan = 全 0、\`scan\` が initialize するもの）。\`Vec\` の隣の 3 aggregate（bridge の O(n) fold を省く）。\`fund_withdrawals\` は \`amount\` の合計（*支払われた* もの、*要求された* ものでない — partial drain で違う）。\`unfilled_deficit\` は \`PartiallyDrained.unfilled\` AND \`Depleted.unfilled\` の合計（= ADL への signal）。

### Step 5: LiquidationScanner + accessors

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

private フィールド 2 つ・public 0（state machine はフィールドを隠す、data carrier は公開する）。Builder でなく 2 コンストラクタ（2 フィールドなら builder に勝つ）。\`fund_balance\`（hot-path scalar）+ \`fund\`（cold-path full reference）。\`into_fund\` は consume-and-extract（shutdown 時の handoff、\`self\` を値で取る）。\`into_fund\` 以外 \`const fn\`。\`set_*\` なし（mutation は \`scan\` 経由のみ、フィールド setter は abstraction-breaking surface）。

### Step 6: lib.rs に配線

\`\`\`rust
pub mod compute;
pub mod insurance;
pub mod scanner;
pub mod types;

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

### Step 7: cargo check

\`cargo check -p openhl-liquidation\` が clean compile（テストはなし — \`scan\` がまだないので testable なものがない）。レッスン10 の 55 テストは依然 pass。

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
git checkout main
\`\`\`

scanner.rs は \`0a8464e\` の accessor まで一致（\`scan\` メソッドとテストは レッスン12/13）。lib.rs は \`pub mod scanner;\` + \`pub use scanner::{...}\` について byte-for-byte 一致。

## 合格基準

\`cargo check -p openhl-liquidation\` が通る。\`account_equity\` 等への unused-import 警告は **想定どおり**（レッスン12 用に staged、\`scan\` 本体が compile した瞬間に消える）— レッスン11 で警告 0 件なら逆におかしい。\`#[allow(unused_imports)]\` で抑えてもいいが、答え合わせは L11/L12 を一緒に ship するので抑えない。

## まとめ（3行）

- orchestration 層は独自の型語彙を持つ: \`CloseOutcomeKind\`（唯一の新 enum、下位層 2 出力を route）/ \`LiquidationRecord\`（per-account row）/ \`ScanReport\`（records vector + aggregate i64）。
- \`ScanReport\` の aggregate（\`fund_deposits\`/\`fund_withdrawals\`/\`unfilled_deficit\`）は scan loop 中に事前計算（bridge の fold を省く、コスト 0）。\`unfilled_deficit\` が ADL への signal。
- \`LiquidationScanner\` は \`InsuranceFund\` を値で所有（\`Arc<Mutex>\` も \`&mut\` も不要）— single mutator + 明確な shutdown point の state machine は自分の state を値で所有する。

## 次のレッスン（レッスン12）

orchestration の心臓 — \`scan\` メソッド — を実装。\`&[AccountSnapshot]\` + \`MarkPrice\` を取り、各アカウントを分類し、Liquidatable/Underwater を solvent/underwater outcome に dispatch、fund を in-place mutate、\`ScanReport\` を構築。最もシンプルな 4 つの unit test（empty / all-safe / atrisk / flat-skip）も。`,
                },
                {
                  title: "レッスン12 — scan — safety cascade のオーケストレーションの心臓",
                  slug: "openhl-liquidation-scan-method-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 35,
                  xpReward: 70,
                  content: `# レッスン12 — \`scan\` — safety cascade のオーケストレーションの心臓

## 問い

レッスン11 で状態を記述する型 4 つを宣言した。今度はそれらを生む 1 つのメソッド \`scan\` を書く。\`&[AccountSnapshot]\` を順に辿り、分類し、Liquidatable/Underwater に dispatch し、fund を mutate し、\`ScanReport\` を返す。「liquidate 対象でないアカウントを skip」と「solvent vs underwater の dispatch」を最もきれいに書くには？

## 原理（最小モデル）

- **\`scan\` は orchestration 層で *唯一の動詞*、他はすべて名詞。** \`(accounts, mark)\` を取り \`ScanReport\` を返す。本体内で 計算パート + 保険基金パート プリミティブが liquidate 対象 1 件あたりちょうど 1 度ずつ呼ばれる。composition がアーキテクチャ。
- **\`MarginHealth\` の \`match\` + \`continue\`-guard が「skip」の最もきれいなパターン。** \`if !matches!(c, Liquidatable | Underwater) { continue; }\` のほうが短いが exhaustiveness を失う。\`match\` 形は compiler に「全 variant が考慮されたか」を enforce させる（将来 5 つ目の variant が追加されたときに bug を捕まえる）。
- **solvent vs underwater dispatch は レッスン10 の \`debug_assert!\` ペアを直接 mirror。** \`if post_close_equity >= fee_desired\` が \`solvent_close_outcome\` に route、\`else\` が \`underwater_close_outcome\`。caller の runtime predicate が callee の compile-time 契約と同一。
- **underwater 分岐の \`WithdrawOutcome\` match が レッスン9 enum を \`(paid, unfilled)\` タプルに分解する。** solvent close は \`deposit\` だけ（\`withdraw_shortfall\` を触らない）。orchestration 層が レッスン9 variant と レッスン11 i64 aggregate の間を 1 つの match で翻訳。

## 具体例

\`scan\` の shape:

\`\`\`
   scan(accounts, mark) → ScanReport
     let mut report = ScanReport::default();
     for snapshot in accounts {
         match margin_health(...) {
             Safe | AtRisk => continue,          ← skip 1
             Liquidatable | Underwater => {}      ← work
         }
         if position_size == 0 { continue; }      ← skip 2 (defensive)
         let close_order = close_order_spec(snapshot);
         let outcome = if post_close_equity >= fee_desired {
             solvent_close_outcome → fund.deposit → report.fund_deposits += / Solvent(s)
         } else {
             underwater_close_outcome → (deposit if fee>0) → withdraw_shortfall
             → match WithdrawOutcome → (paid, unfilled) → aggregate / Underwater(u)
         };
         report.records.push(LiquidationRecord { ... });
     }
     report
\`\`\`

外側は \`for\`（各 iteration が side effects を持つので iterator chain でない）。2 つの \`continue\` は loop body の先頭（happy path は同じ indent level に inline、ネストしない）。aggregate は per-iteration の \`saturating_add\`（レッスン11 の設計契約）。

## 失敗例（誤解）

「\`scan\` を \`iter().filter_map(...).collect()\` で書くべき」は誤り、問題 2 つ: (1) \`self.fund\` を mutate する closure への \`filter_map\` は iterator chain 全体で \`self\` を排他 borrow し、closure capture と衝突（borrow checker が reject）。(2) compile が通っても per-iteration の side effects（deposit/withdraw/aggregate-add）を \`map\` closure 内に隠す。\`&mut self\` を capture する for loop は、本体が enclosing self を mutate するとき iterator chain に勝つ。

---

ここまでで「\`scan\` は thin orchestrator」は着地した。ここで scanner が *runnable* になる（レッスン11 の staged import がついに consumer を得て unused-import 警告が消える）。コードは完全形。

> 🛑 **予測。** スライス内のアカウントごとに liquidate するか skip するかを決める関数で、必要な分岐をリストアップする。skip は何個、work は何個？（答え: 厳密に 2 つの \`continue\`（Safe/AtRisk、flat-position）と 2 つの routing（solvent vs underwater）= **4 分岐**。underwater 分岐は positive/zero/negative equity の 3 サブケースを 1 回の \`underwater_close_outcome\` 呼び出しに統合する（レッスン10 が済ませた）。callee 内でサブケースを encapsulate すれば caller の分岐数が縮む。）

## ステップで組み立てる

### Step 1: scan メソッドを追加

\`impl LiquidationScanner\` の \`into_fund\` の後に:

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

フェーズ別: **① 分類**（\`match\` は exhaustive、compiler が enforce — 5 つ目の variant 追加で compile 失敗、work-path arm は \`{}\` で fall-through、or-pattern で skip 2 ケースを統合）。**② defensive flat-skip**（理論上不可能だが bridge が sanitize されない snapshot を submit しうる、zero-qty spec を CLOB が reject）。**③ close order 生成**（1 行、レッスン7 の pure 関数）。**④ routing**（predicate は レッスン10 の \`debug_assert!\` の正反対、3 ローカル変数で predicate に到達、各 callee を別分岐で呼ぶ — 統合すると precondition 違反で \`debug_assert!\` 発火）。**⑤a solvent**（\`fee_to_fund\` を 3 回読む — \`Copy\` で無料、\`fee_to_fund==0\` チェックなし — 型契約が排除）。**⑤b underwater**（\`if fee_to_fund > 0\` guard — レッスン10 が 0 を返しうる、\`WithdrawOutcome\` match で \`(paid, unfilled)\` に分解 — 3 variant が 1 タプルに collapse、保存則 \`amount + unfilled = shortfall\` が引き継がれる）。**⑥ push**（毎 iteration 終わりに 1 push）。

### Step 2: テストモジュールの足場

\`scanner.rs\` 末尾に:

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

\`use proptest::prelude::*\` は レッスン13 用に staged。\`snapshot\` ヘルパー（レッスン4 の compute::tests を mirror）。

### Step 3: 4 つの simple unit test

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

\`scan_empty_accounts_returns_empty_report\` は 4 フィールドすべて assert。\`scan_all_safe_accounts_does_nothing\` は *2 件* 使う（loop が 2 回 iterate を強制 — single-account は loop-control bug を mask）。\`scan_atrisk_does_not_liquidate\` が最も pedagogical に重要（AtRisk は warning state、trigger でない — promote するリファクタが即失敗）。\`scan_skips_flat_positions\` がフェーズ 2 の defensive guard を exercise（defense-in-depth テスト）。

### Step 4: テスト実行

\`cargo test -p openhl-liquidation\` が 59 pass（compute 34 + insurance 21 + scanner 4）。**scanner が runnable に。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
git checkout main
\`\`\`

scanner.rs は \`scan_skips_flat_positions\` まで一致（nuanced test + proptest は レッスン13）。

## 合格基準

\`cargo test -p openhl-liquidation\` が 59 pass。よくあるエラー: \`cannot find function account_equity\`（レッスン11 の staged import を消した — 再追加）/ \`scan_all_safe_accounts_does_nothing\` 失敗（\`match\` arm が \`Safe | Liquidatable\` の typo）/ \`report.fund_deposits != 0\`（\`ScanReport::default()\` の derivation が間違い）/ \`Copy\` trait bound 不満（\`SolventClose\`/\`UnderwaterClose\` が \`Copy\` か確認）。

## まとめ（3行）

- \`scan\` は thin orchestrator（全行が 計算パート/保険基金パート プリミティブを呼ぶか \`saturating_add\` を apply するだけ、新しい数学・ポリシー・データ shape なし）。
- exhaustive \`match\` が predicate-with-\`!\` に勝つ（フェーズ 1 の \`MarginHealth\` match が将来の variant 追加を捕まえる — enum と consumer を refactor 越しに同期）。
- \`WithdrawOutcome → (paid, unfilled)\` タプル分解が レッスン9 enum を orchestration handling に翻訳する唯一の場所（3 variant が 1 \`(i64,i64)\` に collapse、保存則を引き継ぐ）。\`&mut self\` を capture する for loop が iterator chain に勝つ。

## 次のレッスン（レッスン13）

セクション4 capstone — そして スキャナパート、そして openhl の Liquidation 実装全体 — を閉じる。6 個の nuanced unit test（4 outcome の single-account + mixed-batch + FIFO fairness）と 4 個の cross-cutting proptest（fund 会計の閉鎖 / unfilled⇒empty / record 数 bound / 決定性）で stress テストし、69 tests で \`0a8464e\` に byte-for-byte 一致させる。`,
                },
                {
                  title: "レッスン13 — Scanner capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Liquidation三部作の振り返り",
                  slug: "openhl-liquidation-scanner-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 40,
                  xpReward: 80,
                  content: `# レッスン13 — Scanner capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Liquidation三部作の振り返り

## 問い

これまでのテストは「skip」ケース（empty / safe / atrisk / flat）だけをカバーした。4 つの「work」outcome（solvent / fully-covered / partial-drain / depleted）と multi-account の相互作用には per-scan の assertion がまだない。型システムが encode できない不変条件（fund 会計が閉じる / unfilled⇒empty / 決定性）をどうテストし、Liquidation三部作を閉じるか？

## 原理（最小モデル）

- **6 個の nuanced unit test は 4×2 行列。** 4 outcome（solvent / fully-covered-uw / partial-drain-uw / depleted-uw）× 2 batch shape（single / multi）。mixed-batch が 4-state 証明、FIFO が multi-underwater fairness 証明。
- **4 個の proptest が型システムで encode できない不変条件を encode。** fund 会計が閉じる（\`before + deposits − withdrawals = after\`）/ unfilled⇒空 fund（\`unfilled > 0 ⇒ balance == 0\`）/ record 数が input 数で bound / 決定性（\`scan(同じ入力) ≡ scan(同じ入力)\`）。
- **保存則が crate を縦に compose する。** 3 層・3 恒等式・1 つの数学的物語:

\`\`\`
レッスン9  (single fund call):       amount + unfilled                          = shortfall
レッスン10 (single position close):  fee_to_fund + residual_to_account          = post_close_equity
レッスン13 (per-block scan batch):   balance_before + Σdeposits − Σwithdrawals  = balance_after
\`\`\`

  各層の保存則が次の層の invariant に consume される。crate の数学が閉じる。
- **Liquidation は「計算パート・保険基金パート・スキャナパート」の 3 段構成。** 計算パート（margin math）が pure-compute な分類器、保険基金パート（fund + decomposition）が state と credit/debit、スキャナパート（scanner）が両者を 1 orchestration loop で結ぶ。レッスン13 が trilogy を閉じる（**69 tests、4 modules、\`0a8464e\` に byte-for-byte 一致**）。

## 具体例

Scan-coverage 行列:

\`\`\`
                  single account     multi-account
   Solvent         #1 ✓               (mixed でカバー)
   Covered uw      #2 ✓
   Partial uw      #3 ✓               #6 ✓ (FIFO fairness)
   Depleted uw     #4 ✓
   Mixed-batch     —                  #5 ✓ (4 health states)
   Proptest（cross-cutting）: #1 fund_balance_delta / #2 unfilled⇒empty / #3 records bound / #4 deterministic
\`\`\`

single-account 列が 4 outcome すべてを cover、multi-account 列は *interesting な複合ケース* だけ（per-account 挙動は両列で同じ）。proptest は cross-cutting（全 outcome・全 batch shape に適用、直交するので行列に入らない）。

## 失敗例（誤解）

「4 個の proptest を 1 つの mega-property（\`A && B && C && D\`）に統合すべき」は誤り — 各 property は独立に意味を持つ。別々に証明すれば失敗メッセージが *どの* invariant が壊れたかを教える。mega-property の \`prop_assert!(A && B && C && D)\` は「mega-property が落ちた」とだけ言う。property レベルの粒度が失敗時の診断粒度を与える。

---

ここまでで「coverage 行列 + 縦に compose する保存則」は着地した。ここで Liquidation三部作を閉じる（6 unit test + 4 proptest、production コード変更なし）。コードは完全形。

> 🛑 **予測。** 1 件の liquidation が引き起こす fund state 遷移を 4 つ挙げ、どれが \`Solvent\` 入力では起こり得ないか？（答え: (a) \`+fee\` のみ（solvent — deposit、withdraw なし）/ (b) \`+fee_partial − shortfall\`（positive equity の underwater）/ (c) \`0 − shortfall_partial\`（既に underwater で fund partial drain）/ (d) \`0 − 0_with_unfilled\`（fund 空の underwater）。b/c/d は Solvent 入力では起こり得ない（レッスン10 の \`debug_assert!\` が発火）。Solvent は (a) だけ。4 つの nuanced test が a/b/c/d を、5 つ目（mixed）と 6 つ目（FIFO）が multi-account orchestration を exercise。）

## ステップで組み立てる

### Step 1: 6 個の nuanced unit test

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

各テストの数学コメントがプリミティブから step-by-step（worked example）。#1 の境界数字（190 bps が maintenance 200 のすぐ下）が off-by-one を捕まえる。#1 の \`match\` arm 内の \`s\` は \`SolventClose\` を shadow（scope-bounded、arm 後に scanner \`s\` が戻る — だから \`s.fund_balance()\` が動く）。Perp Primer レッスン3 の数字（$10,707）が #2 で 4 度目の再登場。#3 は #2 と同じ snapshot を再利用（fund サイズだけ変える、差分を isolate）。#5 mixed が 4 state を 1 呼び出しで exercise + input 順を preserve。#6 FIFO は 2 つの *同一* underwater で fairness policy を isolate、fund $12,000 = \`10,707 + 1,293\` ちょうど。

### Step 2: 4 個の invariant proptest

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

**#1 fund の保存則**（\`before + Σdeposits − Σwithdrawals = after\`、レッスン8 の per-call invariant を scan 全体に拡張、算術は production と一致する \`saturating_add\`/\`saturating_sub\`）。**#2 fund-exhaustion 契約**（\`unfilled > 0 ⇒ 終了時 balance == 0\`、入力を *adverse* に bias（\`mark 50..70\`、\`initial_fund 0..5_000\`）して \`unfilled > 0\` 分岐を高密度で発火 — **proptest の密度問題**: 広い範囲だと大多数が Safe/Solvent に着地し条件付き assertion が一度も発火せず「見えない dead-code test」になる。発火する regime に bias する）。**#3 cardinality bound**（\`<=\`、strict でない — 全 unhealthy なら等しい、最大 20 account）。**#4 validator-consensus 契約**（最も load-bearing — 同一 state の 2 scanner が byte-identical 出力、*2 つ* の fresh scanner、report AND fund_balance 両方を assert、\`ScanReport\` の \`PartialEq\` derive が可能にする）。

### Step 3: テスト実行

\`cargo test -p openhl-liquidation\` が **69 pass**（compute 34 + insurance 21 + scanner 14 = 10 unit + 4 proptest）。**Liquidation crate が \`0a8464e\` に byte-for-byte 一致、trilogy が閉じる。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
git checkout main
\`\`\`

scanner.rs は \`0a8464e\` の \`scanner.rs\` と **byte-for-byte 一致**（doc + imports + 4 types + 5 accessor + \`scan\` + 10 unit test + 4 proptest）。他ファイルは レッスン10 以降安定。**Liquidation コース完成**（5 modules / 14 レッスン）。

## 合格基準

\`cargo test -p openhl-liquidation\` が 69 pass。よくあるエラー: \`scan_is_deterministic\` が flake（隠れた非決定性 — \`HashMap\` iterate を \`BTreeMap\`/\`Vec\` に）/ \`fund_balance_delta_matches_report\` が off-by-one（\`before + deposits − withdrawals\` の順序 — \`before − withdrawals\` への反転は中間値が負で wrap し fork）/ \`unfilled_implies_empty_fund\` が \`unfilled=500, balance=1000\`（fund depletes で early-exit している — scan を続けるべき）/ \`records_count_bounded_by_accounts\` が \`21 > 20\`（double-push）。

## 設計の振り返り — Liquidation三部作

14 レッスンを通した load-bearing な決定 3 つ:

1. **層を成す保存則。** レッスン9 \`amount + unfilled = shortfall\`（per call）/ レッスン10 \`fee_to_fund + residual = post_close_equity\`（per close）/ レッスン13 \`before + Σdeposits − Σwithdrawals = after\`（per scan）。各層の法則が次の層の invariant に consume される。最小単位から最大単位まで crate の数学が閉じる — consensus state machine を composition の下で *証明可能に* 正しく保つ方法。
2. **\`debug_assert!\` ペア + saturating arithmetic を、どこにでも。** レッスン10 dispatch は debug-assert pair、レッスン8/9 は saturating arithmetic、レッスン12 scan は両方を組み合わせる。dev-assertion + prod-saturation 規律は 1 関数から 1 crate まで scale する。
3. **メカニズムの前に語彙、4 回連続。** レッスン1-3（types）/ レッスン8（\`InsuranceFund\`/\`WithdrawOutcome\`）/ レッスン10（\`SolventClose\`/\`UnderwaterClose\`）/ レッスン11（scanner types）。語彙が契約を定義しメカニズムがそれを実装する。

## まとめ（3行）

- 6 nuanced unit test（4 outcome の single-account + mixed-batch で 4-state + FIFO で multi-underwater fairness）+ 4 cross-cutting proptest（fund 会計 / unfilled⇒empty / record bound / 決定性）で scanner を stress テスト。69 tests で \`0a8464e\` に一致。
- 縦に compose する保存則（per-call → per-close → per-scan）が crate の数学を閉じる。\`scan_is_deterministic\` が最も load-bearing（consensus で非決定性 = fork）。
- Liquidation = 計算パート（pure-compute 分類器）+ 保険基金パート（state + credit/debit 分解）+ スキャナパート（orchestration loop）の 3 段構成。ADL（Layer 3）は \`ScanReport.unfilled_deficit\` を唯一の入力に consume する別コース。

## このコースの位置 / 次に来るもの

Liquidation コースは 14 レッスン・5 modules で完成（Orientation / Types / Pure compute / Insurance fund / Scanner + capstone）。safety-net cascade の Layer 1（margin 分類）+ Layer 2（insurance fund）を構築し、ADL の手前まで bridge が毎ブロック駆動できる multi-account orchestration 層を ship した。

cascade の Layer 3 — ADL（auto-deleveraging）— は別の専用コース（\`building-openhl-adl\`、openhl コミット \`d66b44a\`）。handoff は: scanner が \`unfilled_deficit > 0\` を生む（レッスン13 proptest #2 がこれが *唯一* の signal であることを保証）→ ADL がこのフィールドを read → profitable counter-position を決定的順序で walk・force-close → insolvent ポジションに margin を credit back。レッスン13 proptest が、ADL が read する契約を固定した。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
