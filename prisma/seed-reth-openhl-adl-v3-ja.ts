// hand-written (NOT auto-generated): building-openhl-adl の概念ファースト版コース。
// 散文（WHY）は圧縮し、学習者が copy-paste して走らせる実行物（型定義・関数本体・全テスト）は完全に保つ。

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlAdlV3JA(prisma: PrismaClient) {
  const tags = ["reth", "evm", "liquidation", "adl", "perpetual", "l1", "openhl", "expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-adl-v3-ja",
      title: "Step 6. ADL — auto-deleveraging、safety-net cascade の Layer 3",
      description:
        "保険基金が損失を吸収しきれなかった際の発火回路、最終防衛線「Auto-deleveraging (ADL)」を実装するDIY Perpシリーズ第6弾。\n\n利益の出ているカウンターポジションをランキングし、オーダーブックをバイパスした「帳簿の直接書き換え（Bookkeeping mutation）」による強制クローズとヘアカットを実装する。さらに、破綻を防ぐ「Feedback-loop crash」のメカニズム解説や、システムの決定性を証明する5つの不変条件（Invariant）プロパティテストも網羅する。全5レッスンを通じ、ADL参照実装パートに対応するByte-for-byteの一致を達成する。",
      difficulty: "EXPERT",
      duration: 170,
      xpReward: 330,
      track: "diy-perp",
      tags,
      isPublished: true,
      sortOrder: 1011,
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
                  title: "レッスン0 — ADL は safety-net cascade の Layer 3",
                  slug: "openhl-adl-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 30,
                  content: `# レッスン0 — ADL は safety-net cascade の Layer 3

## 問い

清算スキャナが「保険基金でも吸収しきれない赤字」を残したとき、システムは最後に何をするのか？ なぜそれを **オーダーブック経由ではなく、帳簿の直接書き換えで** やるのか？

## 原理（最小モデル）

ADL（auto-deleveraging）は safety-net cascade の **最後の層（Layer 3）** だ。3 つだけ掴めばいい。

- **トリガーは 1 つ。** スキャナが \`ScanReport { unfilled_deficit > 0 }\` を返したとき、保険基金は吸収しきれなかった。bridge が \`execute_adl(残りのアカウント, mark, unfilled_deficit)\` を呼ぶ。
- **ランキングは Hyperliquid 慣例。** score = \`pnl_pct × leverage\`。最も relative gain が高く、最もレバレッジを効かせて勝った winner が、最初に haircut される。
- **保存則が全体を bound する。** \`deficit_absorbed + deficit_remaining == input_deficit\`。吸収できた分と残った分の和は、必ず入力の赤字に等しい。

## 具体例

scanner → \`unfilled_deficit = 250\` → ADL が profitable winner をランク順に haircut → 100 吸収できたら \`AdlReport { deficit_absorbed: 100, deficit_remaining: 150 }\`。\`deficit_remaining > 0\` は「chain が解決不能な状態に達した」シグナルで、bridge が halt / protocol loss として処理する。

## 失敗例（誤解）

「利益ポジションに market order を出して閉じればいい」は誤り。matching engine 経由だと、各 order が bid/ask スタックを突き破って mark をさらに crash させ、**より多くのポジションが水面下に落ちる feedback loop** が暴走する。ADL が帳簿層で直接クローズするのは、この feedback-loop crash を断つためだ。

---

ここまでで「ADL が cascade のどこに座り、なぜ orderbook を避けるか」は着地した。ここから先は、その cascade の **全体構造** と 5 レッスンのロードマップに入る。L1 以降は実際に Rust を書く。

> 🛑 **予測。** 続きを読む前に、この 4 人をランク付けせよ（highest = 最初に haircut）。全員 long 1 BTC、全員 profitable、Hyperliquid の \`pnl_pct × leverage\` 慣例。
> - **A**: collateral $200、entry $100k、mark $200k
> - **B**: collateral $20、entry $100k、mark $200k
> - **C**: collateral $200、entry $100k、mark $150k
> - **D**: collateral $200、entry $100k、mark $250k

（答え: **B → A → D → C**。B は 10× leverage の profitable winner で最高。key intuition は **leverage が PnL ランキング上の multiplier である** こと — これこそ Hyperliquid が product 慣例として採る理由だ。正確な順序は L1 で score を実装して検算する。）

## 深掘り — capacity が layer ごとに落ちる cascade

\`\`\`
   ┌─ Layer 1 + 1.5: Detectors ────────────────────────────────┐
   │   margin classify + scanner → ScanReport { unfilled_deficit: D } │
   └────────────────────────────────────────────────────────────┘
                          │ D > 0 なら
                          ▼
   ┌─ Layer 2: Buffer (capacity = fund balance) ───────────────┐
   │   insurance fund が min(D, fund_balance) を吸収 → D'        │
   └────────────────────────────────────────────────────────────┘
                          │ D' > 0 なら
                          ▼
   ┌─ Layer 3: Fallback (capacity = ∑ winners' PnL) ───────────┐
   │   ADL が min(D', ∑PnL) を吸収 → D''   ← 本コース            │
   └────────────────────────────────────────────────────────────┘
                          │ D'' > 0 なら
                          ▼
   ┌─ Layer 4: Last resort (in-system capacity なし) ──────────┐
   │   protocol policy: chain を halt · residual を accept      │
   └────────────────────────────────────────────────────────────┘

   Deficit は単調に shrink する: D ≥ D' ≥ D'' ≥ 0
\`\`\`

各 layer の residual が次 layer の入力になる。情報フローは downstream-only — どの layer も上を読まない。

## 5レッスンのロードマップ

- **レッスン1**: \`AdlScore\` / \`AdlRecord\` / \`AdlReport\` + \`adl_score\` — 型語彙と pure な ranking 関数。
- **レッスン2**: \`execute_adl\` — 5 フェーズの orchestration 中枢。
- **レッスン3**: 6 つの nuanced absorption テスト — マトリクスで証明。
- **レッスン4**: 5 つの invariant proptest + Liquidation〜ADL四部作の振り返り。

最終的に openhl ADL参照実装パート \`d66b44a\` に対して **バイト単位で** 一致する。

## 合格基準

- ADL のトリガー（\`unfilled_deficit > 0\`）と cascade 上の位置（Layer 3）を言える。
- score 慣例（\`pnl_pct × leverage\`、高 leverage が先に haircut）を説明できる。
- なぜ orderbook を避けるか（feedback-loop crash）を 1 文で言える。

## まとめ（3行）

- ADL は cascade の Layer 3。保険基金が吸収しきれなかった赤字の最終防衛線。
- profitable winner を \`pnl_pct × leverage\` でランクし、帳簿を直接書き換えて haircut する。
- 全体は保存則 \`deficit_absorbed + deficit_remaining == input_deficit\` で bound される。`,
                },
              ],
            },
          },
          {
            title: "ADL implementation",
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: "レッスン1 — AdlScore / AdlRecord / AdlReport + adl_score",
                  slug: "openhl-adl-score-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 60,
                  content: `# レッスン1 — \`AdlScore\` / \`AdlRecord\` / \`AdlReport\` + \`adl_score\`

## 問い

ADL 候補を「どれだけラッキーに勝ったか」で **どうランク付け** し、「そもそも候補ではない」を **どう型で表す** か？

## 原理（最小モデル）

3 つの設計判断がこのレッスンの核だ。

- **score は newtype \`AdlScore(i64)\`。** newtype にするのは、score の意味が *ordering* であって *arithmetic* ではないから。\`PartialOrd + Ord\` を derive して「比較できる」だけを許し、\`Add\`/\`Mul\` を derive しないことで「2 つの score を足す/掛ける」という無意味な操作を *禁止* する。**Newtype は subtractive — 操作を table から外す。**
- **「候補でない」は \`Option<AdlScore>\` で表す。** flat / losing / zero collateral / zero equity の 4 ケースは \`None\`。sentinel（\`AdlScore(0)\`）を返して caller にチェックさせるのではなく、L2 の orchestration が \`filter_map\` で不適格を一掃できる。**\`Option\` は「この入力からは値が出ない」を型レベルで言う方法。**
- **score = \`pnl_pct × leverage\`、i128 中間値で計算して i64 に saturate。** 両 factor は bps（10000 = 100%）。積は bps² になり病的入力で i64 を overflow するので、i128 で計算 → \`MARGIN_SCALE\` で renormalize → 最後だけ saturating cast。

## 具体例

winner A: collateral 100、long 1 @ entry 100、mark 200（pnl = 100）。

\`\`\`text
pnl_pct_bps  = 100 × 10_000 / 100 = 10_000
leverage_bps = 200 × 10_000 / 200 = 10_000
score        = 10_000 × 10_000 / 10_000 = 10_000
\`\`\`

collateral だけを 50 に下げた winner B は leverage が上がり、score = 26_666 になる。**同じ PnL でも高 leverage = 高 score = 先に haircut。**

## 失敗例（誤解）

「不適格には \`AdlScore(0)\` を返せばいい」は誤り。全 caller が「0 = 不適格」か「0 = 適格だが unlucky」を毎回判定させられる。素の \`i64\` を score に使うのも誤り — \`score_a + score_b\` のような無意味な操作が silently compile してしまう。**不適格は \`Option\` の \`None\`、score 型は newtype。**

---

ここまでで「なぜ newtype + Option + bps² renormalize か」は着地した。ここから先は、その 3 判断を **実際の \`adl.rs\` に組み立てる** 深掘りに入る。コードは copy-paste で通る完全形。

> 🛑 **予測。** 下の \`adl_score\` を読む前に、レッスン0 の 4 トレーダー（A/B/C/D）を score 降順に並べよ。\`pnl_pct × leverage\` 慣例で。（答えは末尾の答え合わせで検算する。）

## ステップで組み立てる

### 前提

\`crates/liquidation/\` は Liquidation コース（レッスン13）の後の状態。\`compute.rs\` / \`insurance.rs\` / \`scanner.rs\` / \`types.rs\` + \`lib.rs\` があり 69 テスト pass。本レッスンの diff は **新規ファイル 1 つ（\`adl.rs\`）+ \`lib.rs\` の 4 行編集** だけ。

### Step 1: \`crates/liquidation/src/adl.rs\` を新規作成 — module doc + imports

module doc preamble は \`cargo doc\` 読者が最初に見る load-bearing な概念（「ADL が orderbook を bypass する理由」）を運ぶ:

\`\`\`rust
//! Auto-deleveraging (ADL) — Layer 3 of the safety-net cascade (ADL参照実装パート).
//!
//! When [\`crate::scanner::LiquidationScanner\`] finishes a scan with
//! \`ScanReport::unfilled_deficit > 0\`, the insurance fund couldn't
//! absorb everything. ADL is the last-resort mechanism: rank the
//! profitable counter-positions in the market by a "how much did they
//! win" score, force-close them in descending order, and haircut their
//! unrealized \`PnL\` until the deficit is absorbed.
//!
//! ### Why ADL bypasses the orderbook
//!
//! If we kept submitting market orders against profitable positions
//! through the matching engine, every order would punch through the
//! bid/ask stack and crash the mark further — which would push more
//! positions underwater. The feedback loop runs away. ADL is designed
//! to **close positions directly in the bookkeeping layer**, never
//! touching the orderbook. The records this module produces carry the
//! [\`CloseOrderSpec\`] for parity with Liquidation参照実装（計算パート）'s other paths, but the
//! bridge is expected to apply them as account-state mutations rather
//! than CLOB orders.
//!
//! ### How the haircut works
//!
//! Each ADL'd winner had unrealized \`PnL\` of \`P\` at the current mark.
//! In a normal close they'd receive \`P\` in full. With ADL they receive
//! \`P - haircut\`, where \`haircut = min(remaining_deficit, P)\`. The
//! system absorbs the \`haircut\` amount toward the unfilled deficit.
//! Winners with the highest score get the first cut; if the cumulative
//! haircuts reach the deficit before the candidate pool is exhausted,
//! later winners are untouched. If the candidate pool runs out first,
//! \`AdlReport::deficit_remaining > 0\` and the chain is in genuine
//! unresolved trouble.
//!
//! ### Score
//!
//! Following the Hyperliquid convention, score is
//! \`unrealized_pnl_pct × leverage\`, expressed in bps²/\`MARGIN_SCALE\`:
//!
//! \`\`\`text
//!   pnl_pct_bps  = pnl × MARGIN_SCALE / collateral
//!   leverage_bps = notional × MARGIN_SCALE / equity
//!   score        = pnl_pct_bps × leverage_bps / MARGIN_SCALE
//! \`\`\`
//!
//! The intuition: the "luckiest" winners are those who both made the
//! highest relative gain AND took the most leveraged risk to get
//! there. They take the haircut first. Stable-sort ties break by
//! \`AccountId\` ascending so two equally-lucky winners produce a
//! deterministic order across validators.
//!
//! ### Determinism
//!
//! - All arithmetic uses i128 intermediates with saturating-to-i64
//!   conversions.
//! - The ranking is a stable sort with a fully-defined tiebreaker.
//! - No clock reads, no \`HashMap\` iteration.
//!
//! Given the same \`(candidates, mark, deficit)\`, every validator
//! produces a byte-identical [\`AdlReport\`].

use crate::compute::{
    account_equity, close_order_spec, notional_value, saturate_i128_to_i64, unrealized_pnl,
};
use crate::types::{AccountSnapshot, CloseOrderSpec, MARGIN_SCALE};
use openhl_clob::AccountId;
use openhl_funding::MarkPrice;
\`\`\`

要点: module doc は **実装詳細ではなく cascade position から始める**。\`Determinism\` セクションが 3 つの negative（float なし / HashMap iteration なし / clock read なし）を名指し、将来 \`Utc::now()\` を呼ぼうとする contributor を思いとどまらせる。\`close_order_spec\` を import しているのは L2 の \`execute_adl\` が使うから（L1 では unused 警告が出て L2 で消える）。

### Step 2: \`AdlScore\` を追加

\`\`\`rust
/// ADL ranking score. Higher means earlier force-close.
///
/// Computed as \`pnl_pct × leverage\`, both expressed in \`MARGIN_SCALE\`
/// units; the product is renormalized once. Saturates at \`i64::MAX\`
/// for pathological inputs.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct AdlScore(pub i64);
\`\`\`

要点: \`PartialOrd + Ord\` の derive こそ newtype の存在理由（比較が型の目的のときだけ derive する）。\`Add\`/\`Mul\`/\`Sub\` は derive しない — score の足し算に domain meaning はない。\`Default\` は \`AdlScore(0)\` =「何も勝っていない」sentinel として意味を持つ。

### Step 3: \`AdlRecord\` を追加

\`\`\`rust
/// Per-account record of one ADL force-close.
///
/// The bridge applies these as bookkeeping mutations: credit the
/// trader's collateral by \`pnl_paid\`, set their position size to zero,
/// remove the account from the open-positions table. \`close_order\`
/// carries the spec for parity with Liquidation参照実装（計算パート）'s other paths and for
/// telemetry; the matching engine is **not** consulted.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AdlRecord {
    pub account: AccountId,
    /// The (notional) close-order spec; emitted for telemetry and shape
    /// consistency with [\`crate::scanner::LiquidationRecord\`]. The
    /// bridge does NOT submit this to the CLOB.
    pub close_order: CloseOrderSpec,
    /// Unrealized \`PnL\` at the current mark — what the trader would
    /// have received in a normal close.
    pub pnl_gross: i64,
    /// Amount the system kept toward absorbing the deficit
    /// (\`min(remaining_deficit, pnl_gross)\` at the time this record
    /// was generated).
    pub haircut: i64,
    /// What the trader actually receives. Always \`pnl_gross - haircut\`,
    /// always \`≥ 0\`.
    pub pnl_paid: i64,
    /// The ranking score at the moment of selection.
    pub score: AdlScore,
}
\`\`\`

要点: \`pnl_paid = pnl_gross - haircut\` は 1 record の保存則 invariant。3 フィールドが同じ情報を 2 回 encode するのは **意図的な冗長性** — audit-trail record は読者に算術を強いない。\`score: AdlScore\`（i64 ではない）で「score を balance と比較する」を型が禁じる。

### Step 4: \`AdlReport\` を追加

\`\`\`rust
/// Summary of one ADL pass.
#[derive(Clone, Debug, PartialEq, Eq, Default)]
pub struct AdlReport {
    /// One record per ADL'd account, in execution (rank) order.
    pub records: Vec<AdlRecord>,
    /// Total haircuts applied — how much of the input deficit was
    /// absorbed.
    pub deficit_absorbed: i64,
    /// What the candidate pool couldn't cover. If \`> 0\`, the chain
    /// must halt or the operator must accept the residual as protocol
    /// loss.
    pub deficit_remaining: i64,
}
\`\`\`

要点: \`ScanReport\` と同じ shape（vec + i64 aggregate）。\`Default\` derive で L2 の「deficit ゼロ」early-return が \`AdlReport::default()\` 1 行で書ける。\`Vec\` を持つので \`Copy\` は付けない。

### Step 5: \`adl_score\` を追加

\`\`\`rust
/// Compute the ADL score for one account at \`mark\`.
///
/// Returns \`None\` for accounts that are not eligible for ADL:
///   - Non-profitable positions (\`unrealized_pnl ≤ 0\`).
///   - Flat positions (\`position_size == 0\`).
///   - Accounts whose collateral or equity is zero (degenerate;
///     score's divisor would be zero or negative).
#[must_use]
pub fn adl_score(snapshot: &AccountSnapshot, mark: MarkPrice) -> Option<AdlScore> {
    if snapshot.position_size.0 == 0 {
        return None;
    }
    let pnl = unrealized_pnl(snapshot, mark);
    if pnl <= 0 {
        return None;
    }
    let collateral = snapshot.collateral.0;
    if collateral <= 0 {
        return None;
    }
    let equity = account_equity(snapshot, mark);
    if equity <= 0 {
        return None;
    }
    let notional = notional_value(snapshot, mark);

    // pnl_pct_bps = pnl × MARGIN_SCALE / collateral
    let pnl_pct = i128::from(pnl).saturating_mul(i128::from(MARGIN_SCALE))
        / i128::from(collateral);
    // leverage_bps = notional × MARGIN_SCALE / equity
    let leverage = i128::from(notional).saturating_mul(i128::from(MARGIN_SCALE))
        / i128::from(equity);
    // score = pnl_pct × leverage / MARGIN_SCALE (renormalize)
    let raw = pnl_pct.saturating_mul(leverage) / i128::from(MARGIN_SCALE);
    Some(AdlScore(saturate_i128_to_i64(raw)))
}
\`\`\`

要点: **4 つの early-return guard はコスト昇順**（flat 比較 → pnl → collateral → equity）。すべて \`<= 0\`（\`< 0\` ではない）— ゼロは候補状態ではない。**全 arithmetic で i128 中間値 + saturating**、最後の \`saturate_i128_to_i64\` だけが width-narrowing で情報を失いうる。division は正-正なので素の \`/\`（overflow しえない）。tunable knob がないので \`LiquidationParams\` は取らない（未使用 parameter を pre-add しない）。

### Step 6: 5 個の unit test を追加（\`adl.rs\` 末尾に \`#[cfg(test)] mod tests\`）

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

    // ─── adl_score: None cases ─────────────────────────────────────

    #[test]
    fn score_none_for_flat_position() {
        let s = snapshot(1, 0, 100, 1_000);
        assert_eq!(adl_score(&s, MarkPrice(100)), None);
    }

    #[test]
    fn score_none_for_losing_long() {
        // Long 1 @ 100, mark 80 → pnl = -20 → not eligible
        let s = snapshot(1, 1, 100, 1_000);
        assert_eq!(adl_score(&s, MarkPrice(80)), None);
    }

    #[test]
    fn score_none_for_short_at_entry() {
        // pnl = 0, not profitable.
        let s = snapshot(1, -1, 100, 1_000);
        assert_eq!(adl_score(&s, MarkPrice(100)), None);
    }

    #[test]
    fn score_none_for_zero_collateral() {
        let s = snapshot(1, 1, 100, 0);
        // Even if profitable at mark 120, collateral = 0 makes pnl_pct
        // undefined (divide by zero) → ineligible.
        assert_eq!(adl_score(&s, MarkPrice(120)), None);
    }

    // ─── adl_score: ordering ───────────────────────────────────────

    #[test]
    fn score_higher_for_higher_leverage_winner() {
        // Two profitable longs with the same pnl_pct but different
        // leverage. Higher leverage → higher score.
        // Long 1 @ entry 100, mark 200 → pnl = 100.
        // A: collateral 100, equity = 100 + 100 = 200, notional = 200, leverage = 1×
        //    pnl_pct_bps = 100 × 10_000 / 100 = 10_000
        //    leverage_bps = 200 × 10_000 / 200 = 10_000
        //    score = 10_000 × 10_000 / 10_000 = 10_000
        // B: collateral 50, equity = 50 + 100 = 150, notional = 200, leverage = ~1.33×
        //    pnl_pct_bps = 100 × 10_000 / 50 = 20_000
        //    leverage_bps = 200 × 10_000 / 150 = 13_333
        //    score = 20_000 × 13_333 / 10_000 = 26_666
        let a = snapshot(1, 1, 100, 100);
        let b = snapshot(2, 1, 100, 50);
        let sa = adl_score(&a, MarkPrice(200)).unwrap();
        let sb = adl_score(&b, MarkPrice(200)).unwrap();
        assert!(sb > sa, "higher leverage winner should rank above lower");
    }
}
\`\`\`

要点: 4 つの None テストが eligibility filter の各 branch を、ordering テストが score の唯一の load-bearing 性質（relative magnitude）を exercise する。ordering は \`assert!(sb > sa)\`（\`assert_eq!\` ではない）— 正確な値は rounding に fragile だが ordering は不変。コメントの math-walk が各テストを worked example に変える。\`proptest::prelude::*\` はレッスン4 用に forward-staged。

### Step 7: \`lib.rs\` を配線（3 編集）

\`pub mod adl;\` を alphabetical に挿入し、再 export を 1 行追加:

\`\`\`rust
pub mod adl;
pub mod compute;
pub mod insurance;
pub mod scanner;
pub mod types;

pub use adl::{adl_score, AdlRecord, AdlReport, AdlScore};
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

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout d66b44a
diff -u ~/code/my-openhl/crates/liquidation/src/adl.rs ./crates/liquidation/src/adl.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

レッスン1 後、\`adl.rs\` は参照実装の \`score_higher_for_higher_leverage_winner\` テストまで一致（\`execute_adl\` と残り 16 テストは L2/L3/L4）。\`lib.rs\` は \`pub mod adl;\` + 再 export についてバイト単位で一致。

予測の検算: 4 トレーダーの正確な順は **B → A → D → C**（B が最高 leverage の profitable winner）。

## 合格基準

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

→ **74 テスト pass**（Liquidation 由来 69 + 新規 ADL score 5）。

落ちる主因: import から 5 名のいずれか欠落 / \`pnl <= 0\` を \`pnl < 0\` と書いて \`score_none_for_short_at_entry\` が落ちる / division 順を \`pnl × (MARGIN_SCALE / collateral)\` と書いて truncation で ordering が flip。

## まとめ（3行）

- score は newtype \`AdlScore(i64)\` — ordering を enable し arithmetic を forbid する。
- 不適格は \`Option\` の \`None\`（sentinel ではない）で、L2 が \`filter_map\` で一掃できる。
- score = \`pnl_pct × leverage\`、i128 中間値で計算し最後だけ i64 に saturate。`,
                },
                {
                  title: "レッスン2 — execute_adl — 5 フェーズの orchestration 中枢",
                  slug: "openhl-adl-execute-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 70,
                  content: `# レッスン2 — \`execute_adl\` — 5 フェーズの orchestration 中枢

## 問い

scanner が赤字を残したとき、利益 winner たちを **誰から、どの順で、どれだけ** haircut するのか？ それを 1 つの決定論的な関数にどう畳むか？

## 原理（最小モデル）

\`execute_adl(candidates, mark, deficit) -> AdlReport\` は 5 フェーズのパイプラインだ。

- **Phase 1**: 非正の deficit に early-return（防御的契約）。
- **Phase 2**: \`adl_score\` で各候補を scoring、ineligible(\`None\`) を \`filter_map\` で drop、\`(snapshot, score, pnl)\` を collect。
- **Phase 3**: \`(score 降順, account_id 昇順)\` で stable-sort。tiebreaker が決定論性の鍵。
- **Phase 4**: rank 順に iterate し \`haircut = min(remaining, pnl_gross)\` を適用、\`remaining <= 0\` で **break**。
- **Phase 5**: \`deficit_remaining = remaining\` を finalize して return。

核心の性質は 2 つ。**保存則** \`deficit_absorbed + deficit_remaining == input_deficit\` はループ本体が構造的に保つ（L4 で証明）。**quota-bound loop は \`break\` を持つ** — deficit が覆われたら止まる。

## 具体例

単一 winner（pnl_gross = 100）、deficit = 30:

\`\`\`text
haircut  = min(30, 100) = 30
pnl_paid = 100 - 30      = 70
report   = { records: [1件], deficit_absorbed: 30, deficit_remaining: 0 }
\`\`\`

## 失敗例（誤解）

「scanner の \`scan\` と同じく全候補を処理すればいい」は誤り。scanner は quota なし（全アカウントを measure する）。ADL は **quota-bound** — deficit が覆われたら \`break\` する。break がないと 100 候補のうち 1 人で足りる場面でも 100 全部を歩き、report の \`records.len()\` が「実際に force-close された数」を意味しなくなる。

---

ここまでで「5 フェーズと quota-bound break」は着地した。ここから先は実際の \`execute_adl\` を組み立てる。コードは完全形。

> 🛑 **予測。** 下を読む前に: scanner の \`scan\`（Liquidation レッスン13）と \`execute_adl\` の **構造的な違いを 1 つ** 予想せよ。ヒント: ADL は quota（deficit）を持ち、scanner は持たない。

（答え: **\`execute_adl\` は \`remaining <= 0\` で \`break\` を持つ。\`scan\` は持たない。** quota-bound loop は break を持ち、quota-free loop は全件処理する。break は performance にも効く — 最初の winner で足りれば 1 人だけ haircut すれば済む。）

## ステップで組み立てる

### \`execute_adl\` のソース全体（\`adl_score\` の下に append）

\`\`\`rust
/// Execute one ADL pass over the candidate set.
///
/// Pipeline:
///   1. Filter to ADL-eligible accounts (see [\`adl_score\`]).
///   2. Stable-sort by score descending; ties break by \`AccountId\`
///      ascending so two equally-ranked accounts produce a
///      deterministic order.
///   3. Iterate, applying \`haircut = min(remaining_deficit, pnl_gross)\`
///      to each in rank order. Stop when \`remaining_deficit == 0\` or
///      candidates are exhausted.
///
/// Returns an [\`AdlReport\`] whose \`deficit_absorbed + deficit_remaining\`
/// equals the input \`deficit\` (modulo saturating arithmetic).
///
/// A non-positive \`deficit\` is treated as "nothing to do" — returns an
/// empty report.
#[must_use]
pub fn execute_adl(
    candidates: &[AccountSnapshot],
    mark: MarkPrice,
    deficit: i64,
) -> AdlReport {
    // Phase 1: defensive early-return for non-positive deficit.
    if deficit <= 0 {
        return AdlReport {
            records: Vec::new(),
            deficit_absorbed: 0,
            deficit_remaining: deficit.max(0),
        };
    }

    // Phase 2: score every candidate, drop the ineligible, keep (snapshot, score, pnl).
    let mut ranked: Vec<(AccountSnapshot, AdlScore, i64)> = candidates
        .iter()
        .filter_map(|s| {
            let score = adl_score(s, mark)?;
            let pnl = unrealized_pnl(s, mark);
            Some((*s, score, pnl))
        })
        .collect();

    // Phase 3: stable sort by (score desc, account_id asc).
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)));

    // Phase 4: iterate and haircut until deficit absorbed or candidates exhausted.
    let mut report = AdlReport::default();
    let mut remaining = deficit;
    for (snapshot, score, pnl_gross) in ranked {
        if remaining <= 0 {
            break;
        }
        let haircut = remaining.min(pnl_gross);
        let pnl_paid = pnl_gross.saturating_sub(haircut);
        report.records.push(AdlRecord {
            account: snapshot.account,
            close_order: close_order_spec(&snapshot),
            pnl_gross,
            haircut,
            pnl_paid,
            score,
        });
        report.deficit_absorbed = report.deficit_absorbed.saturating_add(haircut);
        remaining = remaining.saturating_sub(haircut);
    }

    // Phase 5: finalize deficit_remaining and return.
    report.deficit_remaining = remaining;
    report
}
\`\`\`

### フェーズ別の要点

- **Phase 1**: \`deficit <= 0\` が zero と negative の両方をカバー。\`deficit.max(0)\` が負の remainder の下流伝播を防ぐ（境界で clamp するほうが下流全部を直すより安い）。
- **Phase 2**: \`filter_map\` は「filter して unwrap、1 パス」。クロージャ内の \`adl_score(s, mark)?\` は **その要素だけ** を short-circuit して \`None\`（drop）を返す — iterator 全体を break しない。\`unrealized_pnl\` は filter pass の *後* で計算（捨てるかもしれない量を先に decide しない）。\`*s\` は \`Copy\` な \`AccountSnapshot\` を deref して値で持つ。
- **Phase 3**: \`b.1.cmp(&a.1)\` が降順（暗記パターン）。\`.then_with\` は lazy — score tie のときだけ tiebreaker クロージャが走る。tiebreaker(account_id 昇順) は「fair」ではなく **validator 間で reproducible** にするため。\`sort_by\`(stable) を選ぶのは決定論性のため（候補数 0..15 では一時メモリコストは無視できる）。
- **Phase 4**: \`if remaining <= 0 break;\` が quota guard。\`haircut = remaining.min(pnl_gross)\` は「deficit が要る分か winner が持つ分の小さい方」。全 \`+\`/\`-\` を \`saturating_*\` で書く（overflow は構造上不可能だが、1 関数内で規律を一貫させ読者に明白にする）。
- **Phase 5**: \`deficit_remaining\` はループ *後* に 1 回だけ set。\`report\` は trailing expression で return（\`return\` キーワードなし）。関数は \`#[must_use]\` — bridge が report を drop したらコンパイラが警告。

### 5 個の unit test（既存 \`mod tests\` に append）

\`\`\`rust
#[test]
fn adl_zero_deficit_is_noop() {
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 0);
    assert!(report.records.is_empty());
    assert_eq!(report.deficit_absorbed, 0);
    assert_eq!(report.deficit_remaining, 0);
}

#[test]
fn adl_negative_deficit_clamps_remaining_to_zero() {
    // Defensive: a negative deficit can't be "absorbed" but also
    // shouldn't propagate as a negative remainder.
    let report = execute_adl(&[], MarkPrice(100), -50);
    assert_eq!(report.deficit_remaining, 0);
}

#[test]
fn adl_no_candidates_keeps_full_deficit() {
    let report = execute_adl(&[], MarkPrice(100), 5_000);
    assert!(report.records.is_empty());
    assert_eq!(report.deficit_absorbed, 0);
    assert_eq!(report.deficit_remaining, 5_000);
}

#[test]
fn adl_no_profitable_keeps_full_deficit() {
    // All candidates are losers (long entered at 100, mark 80).
    let candidates = vec![snapshot(1, 1, 100, 1_000), snapshot(2, 1, 100, 1_000)];
    let report = execute_adl(&candidates, MarkPrice(80), 500);
    assert!(report.records.is_empty());
    assert_eq!(report.deficit_remaining, 500);
}

#[test]
fn adl_single_winner_fully_absorbs_small_deficit() {
    // One profitable long with PnL = 100, deficit = 30.
    // haircut = min(30, 100) = 30; payout = 70.
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 30);
    assert_eq!(report.records.len(), 1);
    let rec = &report.records[0];
    assert_eq!(rec.pnl_gross, 100);
    assert_eq!(rec.haircut, 30);
    assert_eq!(rec.pnl_paid, 70);
    assert_eq!(report.deficit_absorbed, 30);
    assert_eq!(report.deficit_remaining, 0);
}
\`\`\`

各テストが phase / 境界に 1:1 で map する:

| テスト | Phase | 証明 |
|---|---|---|
| \`adl_zero_deficit_is_noop\` | 1 (early-return) | ゼロ入力 → 空 report、候補に触れない |
| \`adl_negative_deficit_clamps_remaining_to_zero\` | 1 (negative clamp) | \`deficit.max(0)\` が負のリークを防ぐ |
| \`adl_no_candidates_keeps_full_deficit\` | 2 (空入力) | 空候補 → ループ 0 回 → remaining 不変 |
| \`adl_no_profitable_keeps_full_deficit\` | 2 (全 filter) | 全候補 \`None\` → ranked 空 → remaining 不変 |
| \`adl_single_winner_fully_absorbs_small_deficit\` | 4 (happy path) | 単一 iteration、haircut = min、decomposition 成立 |

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout d66b44a
diff -u ~/code/my-openhl/crates/liquidation/src/adl.rs ./crates/liquidation/src/adl.rs
\`\`\`

\`execute_adl\` 関数本体 + 5 unit test まで参照実装と一致するはず（残り 6 nuanced テストと 5 proptest は L3/L4）。

## 合格基準

\`\`\`bash
cargo test -p openhl-liquidation adl::tests::adl_
\`\`\`

→ **79 テスト pass**（L1 の 74 + L2 の 5）。これで scanner が *ADL に対して runnable* になる。

## まとめ（3行）

- \`execute_adl\` は 5 フェーズ: early-return → score+filter → sort → haircut loop → finalize。
- quota-bound loop なので \`remaining <= 0\` で \`break\` する（scanner の \`scan\` との構造的差）。
- 保存則 \`deficit_absorbed + deficit_remaining == deficit\` はループ本体が構造的に保つ。`,
                },
                {
                  title: "レッスン3 — 6 つの nuanced absorption テスト",
                  slug: "openhl-adl-absorption-tests-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 60,
                  content: `# レッスン3 — 6 つの nuanced absorption テスト

## 問い

L2 で 5 つの degenerate-path テストを ship した。では \`execute_adl\` の **interesting な中域**（複数 winner が deficit を分け合う、tie が break される、loser と flat が winner と共存する）を、どんな入力で証明すればいいのか？

## 原理（最小モデル）

6 テストは 2 軸マトリクス \`{single winner, multiple winners} × {full absorb, partial absorb, mixed eligibility}\` の各セルだ。

- 各テストは **コメントに math を書いた hand-computed worked example**（black-box assertion ではない）。
- テスト名は \`adl_<scenario>_<expected_outcome>\` 規約 — \`cargo test --list\` が関数の *仕様* になる。
- 進展は simple → compound: single-winner edge → multi-winner ordering → tiebreaker → mixed-eligibility integration。

## 具体例

A（coll 100、score 10_000）と B（coll 50、score 26_666）、deficit = 80:

\`\`\`text
sort → [B, A]   (B のほうが高 score)
B haircut = min(80, 100) = 80 → remaining = 0 → break
A は loop body に入らない → record なし
report.records.len() == 1   (B のみ)
\`\`\`

## 失敗例（誤解）

「1 関数に 6 テストは過剰」は誤り。\`execute_adl\` は 5 phase × 複数の入力次元（deficit size / candidate count / score 分布 / eligibility mix）を持つ。マトリクスは 6 よりずっと大きく、16 unit test は「最小カバレッジ」に近い。

---

ここまでで「マトリクスのどのセルを埋めるか」は着地した。ここから 6 テストを worked example として組み立てる。

> 🛑 **予測。** \`execute_adl([A_score_10000, B_score_26666], deficit=80)\` で A の record が *zero-haircut として含まれず、record 自体が無い* のはなぜか？

（答え: Phase 4 の \`if remaining <= 0 break;\` が、A が処理される *前* に loop を exit するから。B が 80 で haircut された後 \`remaining = 0\` → break → A は loop body に入らない。**break が report の record count を「実際に force-close された数」として意味あるものに保つ。**）

## ステップで組み立てる（既存 \`mod tests\` に 6 テスト append）

### Test 1: full-PnL haircut で payout がゼロ

\`\`\`rust
#[test]
fn adl_single_winner_partial_haircut_at_full_pnl() {
    // PnL = 100, deficit = 100 → full haircut, payout = 0.
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 100);
    let rec = &report.records[0];
    assert_eq!(rec.haircut, 100);
    assert_eq!(rec.pnl_paid, 0);
    assert_eq!(report.deficit_remaining, 0);
}
\`\`\`

\`haircut == pnl_gross\` の boundary。winner がすべてを支払い payout = 0、だが deficit はちょうど covered で remaining = 0。

### Test 2: Deficit が winner の PnL を超える — remainder が propagate

\`\`\`rust
#[test]
fn adl_single_winner_exhausted_with_remaining_deficit() {
    // PnL = 100, deficit = 250 → full haircut, 150 remains.
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 250);
    assert_eq!(report.records.len(), 1);
    assert_eq!(report.deficit_absorbed, 100);
    assert_eq!(report.deficit_remaining, 150);
}
\`\`\`

\`min(250, 100) = 100\` — winner の PnL が haircut を cap する。保存則 \`100 + 150 == 250\`。\`deficit_remaining = 150\` が bridge への「cover できなかった」シグナル（policy は bridge の責任）。

### Test 3: Multi-winner ranking — より高い leverage が勝つ

\`\`\`rust
#[test]
fn adl_multiple_winners_in_score_order() {
    // Two long winners; the higher-leverage one ranks first.
    // A: coll 100, pnl 100 → score 10_000 (per レッスン1's score derivation)
    // B: coll 50,  pnl 100 → score 26_666
    // deficit = 80 → B haircut = 80, pnl_paid = 20; A untouched.
    let candidates = vec![snapshot(1, 1, 100, 100), snapshot(2, 1, 100, 50)];
    let report = execute_adl(&candidates, MarkPrice(200), 80);
    assert_eq!(report.records.len(), 1, "deficit smaller than B's pnl → only B");
    assert_eq!(report.records[0].account, AccountId(2));
    assert_eq!(report.records[0].haircut, 80);
}
\`\`\`

同じ PnL でも B の高 leverage が score を押し上げ rank 1 に。score-math コメントがテストの spec。A の record が absent なのは予測 callout の payoff。

### Test 4: Deficit が rank 1 を drain し rank 2 を partial に cover

\`\`\`rust
#[test]
fn adl_drains_first_winner_then_partially_second() {
    // Both winners contribute to a large deficit.
    // A: coll 100, pnl 100 → score 10_000, rank #2
    // B: coll 50,  pnl 100 → score 26_666, rank #1
    // deficit = 150 → B haircut = 100 (full), A haircut = 50 (partial)
    let candidates = vec![snapshot(1, 1, 100, 100), snapshot(2, 1, 100, 50)];
    let report = execute_adl(&candidates, MarkPrice(200), 150);
    assert_eq!(report.records.len(), 2);
    assert_eq!(report.records[0].account, AccountId(2)); // B first
    assert_eq!(report.records[0].haircut, 100);
    assert_eq!(report.records[0].pnl_paid, 0);
    assert_eq!(report.records[1].account, AccountId(1)); // A second
    assert_eq!(report.records[1].haircut, 50);
    assert_eq!(report.records[1].pnl_paid, 50);
    assert_eq!(report.deficit_absorbed, 150);
    assert_eq!(report.deficit_remaining, 0);
}
\`\`\`

Test 3 と同じ入力、大きい deficit(150)で quota exhaustion を isolate。B 完全 haircut(100) → A residual(50)。保存則 \`100 + 50 + 0 == 150\`。順序 assertion がソート規律を将来の refactor から守る。

### Test 5: Equal score → ascending account_id が勝つ

\`\`\`rust
#[test]
fn adl_tiebreaker_by_account_id_ascending() {
    // Two structurally identical winners. Tiebreaker is account_id
    // ascending → smaller account_id is force-closed first.
    let candidates = vec![
        snapshot(7, 1, 100, 50),  // identical except account
        snapshot(3, 1, 100, 50),
    ];
    let report = execute_adl(&candidates, MarkPrice(200), 50);
    assert_eq!(report.records.len(), 1);
    assert_eq!(report.records[0].account, AccountId(3));
}
\`\`\`

account_id 以外を identical に揃え tiebreaker だけを isolate。入力 vector で 2 番目に渡した AccountId(3) が勝つ — 入力順ではなくソート規律(\`then_with\` ascending)が matter する。

### Test 6: Mixed population で loser と flat が filter される

\`\`\`rust
#[test]
fn adl_does_not_touch_losers_or_flats() {
    let candidates = vec![
        snapshot(1, 1, 100, 50),     // winner @ mark 200
        snapshot(2, 1, 100, 1_000),  // loser? — same mark applies, see below
        snapshot(3, 0, 100, 1_000),  // flat
    ];
    // All evaluated at mark = 200 → only acct 1 is profitable.
    let report = execute_adl(&candidates, MarkPrice(200), 10);
    assert_eq!(report.records.len(), 1);
    assert_eq!(report.records[0].account, AccountId(1));
}
\`\`\`

acct 3 は flat → Phase 2 で \`filter_map\` が drop。acct 2 は profitable だが collateral が高く低 score → \`deficit = 10\` が acct 1 で exhaust され Phase 4 の break で touch されない。**1 テストが 2 つの防衛 layer（eligibility filter + quota break）を同時に証明する。** コメントの \`// loser?\` は drafting 履歴を honest に残したもの。

### テストの進展を俯瞰

\`\`\`
   simple ─────────────────────────────────────────► compound
   Test 1,2 ── single winner edge ──── Phase 4 (boundary)
   Test 3,4 ── multi-winner ordering ─ Phase 3 (sort) + Phase 4 (break)
   Test 5   ── tiebreaker isolation ── Phase 3 (then_with, 決定論性)
   Test 6   ── mixed integration ───── Phase 2 + Phase 4 composition
\`\`\`

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference && git checkout d66b44a
diff -u ~/code/my-openhl/crates/liquidation/src/adl.rs ./crates/liquidation/src/adl.rs
\`\`\`

6 nuanced テストまで参照実装と一致するはず（残り 5 proptest は L4）。

## 合格基準

\`\`\`bash
cargo test -p openhl-liquidation adl::tests::adl_
\`\`\`

→ **16 テスト pass**（L1 の 5 + L2 の 5 + L3 の 6）。Full な ADL unit-test マトリクスが特定入力に対してカバーされる。

## まとめ（3行）

- 6 テストは 2 軸マトリクスのセル — single/multi winner × full/partial/mixed。
- 期待値はコメントに math-walk で hand-compute（assertion を proof に変える）。
- Test 6 が eligibility filter と quota break の 2 層を 1 つの mixed 入力で証明する。`,
                },
                {
                  title: "レッスン4 — Capstone — 5 invariant proptest + 四部作の振り返り",
                  slug: "openhl-adl-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 45,
                  xpReward: 90,
                  content: `# レッスン4 — Capstone — 5 invariant proptest + Liquidation〜ADL四部作の振り返り

## 問い

L2・L3 は hand-picked 入力で \`execute_adl\` を証明した。これを **「すべての valid 入力に対して成立する」** へどう一般化するか？ そして 4 つのコース（計算・保険基金・スキャナ・ADL）はどう 1 つの cascade に compose するのか？

## 原理（最小モデル）

- **proptest が specific test を普遍化する。** unit test は concrete example、proptest は universal claim。両方とも必要 — 「specific が shape を、proptest が universality を証明する」。
- **input strategy が「何が valid 入力か」の spec。** \`vec(1_i64..1_000_000, 0..15)\` は「0..15 候補、各 collateral 1..1M」。range は *operating regime* を定義する（overflow edge は L2 の saturating ops が扱う、proptest の責任ではない）。
- **5 invariant**: (1) 保存則、(2) per-record decomposition、(3) aggregate accounting consistency、(4) 決定論性、(5) rank order。

## 具体例

保存則 proptest の核は 1 行:

\`\`\`rust
prop_assert_eq!(report.deficit_absorbed + report.deficit_remaining, deficit);
\`\`\`

L3 の Test 2・4 が 2 つの特定入力で verify したことを、デフォルト 256 ランダム入力（CI では 100,000+）で verify する。

## 失敗例（誤解）

「proptest があれば unit test は不要」は誤り。proptest は necessary だが sufficient ではない — 256 iteration が全 edge を hit する保証はない。疑う failure mode は L1〜3 の unit test として残す。**proptest は unit test を補完するもので、置き換えるものではない。**

---

ここまでで「proptest が何をどう普遍化するか」は着地した。ここから 5 proptest を組み立て、最後に四部作の cascade を振り返る。

> 🛑 **予測。** Liquidation レッスン13 の capstone は 4 proptest だった。ここは 5 つ。scanner が必要としなかった 5 つ目は何か？ ヒント: ADL は record を *ソート* する。

（答え: **\`records_in_rank_order\`**。ADL のソート規律を普遍化する。scanner は record をソートしない（挿入順）。**出力に構造が多いほど、preserve する invariant も多い。**）

## ステップで組み立てる（\`mod tests\` 末尾に \`proptest!\` ブロックを append）

\`\`\`rust
proptest! {
    /// Conservation: absorbed + remaining = input deficit (for
    /// non-negative inputs).
    #[test]
    fn conservation_absorbed_plus_remaining_equals_deficit(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15),
        mark in 1_u64..1_000,
        deficit in 0_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        prop_assert_eq!(report.deficit_absorbed + report.deficit_remaining, deficit);
    }

    /// Every record has \`pnl_paid == pnl_gross - haircut\`, with
    /// both haircut and pnl_paid non-negative.
    #[test]
    fn each_record_balances_pnl(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15),
        mark in 1_u64..1_000,
        deficit in 1_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        for rec in &report.records {
            prop_assert!(rec.haircut >= 0);
            prop_assert!(rec.haircut <= rec.pnl_gross);
            prop_assert!(rec.pnl_paid >= 0);
            prop_assert_eq!(rec.pnl_paid, rec.pnl_gross - rec.haircut);
        }
    }

    /// Total haircuts equal \`deficit_absorbed\`.
    #[test]
    fn total_haircut_equals_deficit_absorbed(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15),
        mark in 1_u64..1_000,
        deficit in 1_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        let total: i64 = report.records.iter().map(|r| r.haircut).sum();
        prop_assert_eq!(total, report.deficit_absorbed);
    }

    /// Determinism: same input twice → same report.
    #[test]
    fn execute_adl_is_deterministic(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 0..10),
        mark in 1_u64..1_000,
        deficit in 0_i64..1_000_000,
    ) {
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let r1 = execute_adl(&candidates, MarkPrice(mark), deficit);
        let r2 = execute_adl(&candidates, MarkPrice(mark), deficit);
        prop_assert_eq!(r1, r2);
    }

    /// Records are in non-increasing score order (or equal score
    /// with strictly ascending account_id).
    #[test]
    fn records_in_rank_order(
        collaterals in proptest::collection::vec(1_i64..1_000_000, 2..15),
        mark in 100_u64..500,
        deficit in 1_000_000_i64..10_000_000,
    ) {
        // Big deficit ensures we get many records.
        let entry = 100u64;
        let candidates: Vec<_> = collaterals
            .iter()
            .enumerate()
            .map(|(i, c)| snapshot(i as u64, 1, entry, *c))
            .collect();
        let report = execute_adl(&candidates, MarkPrice(mark), deficit);
        for w in report.records.windows(2) {
            let (a, b) = (&w[0], &w[1]);
            // Either strict score decrease, OR same score with smaller account_id first.
            let ok = a.score > b.score
                || (a.score == b.score && a.account.0 < b.account.0);
            prop_assert!(ok, "rank order broken between {:?} and {:?}", a, b);
        }
    }
}
\`\`\`

### 各 proptest が何を普遍化するか

- **1. Conservation**: ループ本体の \`haircut + new_remaining == old_remaining\` が蓄積し \`absorbed + remaining == deficit\` に。\`deficit in 0..\` が boundary(ゼロ)を含む。
- **2. Per-record decomposition**: record ごと 4 sub-assertion（granular な assertion が failure を debuggable に）。0 record なら vacuously pass。\`haircut <= pnl_gross\` が Phase 4 の \`.min\` で保証され underflow しえない。
- **3. Aggregate accounting**: \`∑ record.haircut == deficit_absorbed\`。Phase 4 が record.push と accumulator を lockstep で進める保証の cross-check（inspection より proptest が速く certain）。
- **4. Determinism**: 同じ入力 2 回で full report equality。隠れた \`HashMap\` iteration / clock read / unstable sort を catch。\`AdlReport: PartialEq\`（L1 設計）が \`prop_assert_eq!\` を可能にする。
- **5. Rank order**: \`.windows(2)\` で adjacent pair の ordering を verify。\`||\` が Phase 3 の comparator の exact 逆。**deficit を 1M..10M に crank** するのは、多くの record を produce して ordering を non-vacuously test するため。

## 答え合わせ + heavy proof

\`\`\`bash
cd ~/code/openhl-reference && git checkout d66b44a
diff -u ~/code/my-openhl/crates/liquidation/src/adl.rs ./crates/liquidation/src/adl.rs

# 稀な subtle bug を炙る（CI は nightly で 100000）
PROPTEST_CASES=10000 cargo test -p openhl-liquidation adl::tests
\`\`\`

proptest が失敗すると \`proptest!\` が自動で minimal counterexample に shrink して print する。それを通常の \`#[test]\` にコピーして deterministic に reproduce する。

## Liquidation〜ADL四部作レトロスペクティブ — safety-net cascade

\`\`\`
   ╔══════════════════════════════════════════════════════════════════╗
   ║  Per-block orchestration loop (the bridge calls this each block)  ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║  Layer 1   — Liquidation参照実装（計算パート）: margin classify (pure compute)  ║
   ║              Law: phase boundaries deterministic per (snap,mark)  ║
   ║                              ↓                                    ║
   ║  Layer 1.5 — Liquidation参照実装（スキャナパート）: scanner (orchestrator)        ║
   ║              → ScanReport { closes, unfilled_deficit }            ║
   ║              Law: before + ∑dep − ∑wd = after (per-scan)          ║
   ║                              ↓ unfilled_deficit > 0               ║
   ║  Layer 2   — Liquidation参照実装（保険基金パート）: InsuranceFund (stateful)      ║
   ║              → WithdrawOutcome (Covered/PartiallyDrained/Depleted)║
   ║              Law: fee + residual = equity (per-close)             ║
   ║                              ↓ != Covered                         ║
   ║  Layer 3   — ADL参照実装パート: ADL (off-orderbook fallback)  ← 本コース  ║
   ║              → AdlReport { records, absorbed, remaining }         ║
   ║              Law: deficit_absorbed + deficit_remaining = deficit  ║
   ║                              ↓ deficit_remaining > 0              ║
   ║  Layer 4   — Protocol policy (out of scope)                       ║
   ║              halt the chain · accept residual · page operators    ║
   ╚══════════════════════════════════════════════════════════════════╝

   Deficit は単調に shrink: D ≥ D' ≥ D'' ≥ 0。各 layer の residual が次の入力。
\`\`\`

構造的 takeaway が 3 つ。

1. **情報フローは downstream-only** — どの layer も上を読まない。各 layer の出力が次の入力を gate する。
2. **failure mode は最後まで typed** — margin は crash しない、InsuranceFund は \`WithdrawOutcome\` enum で failure shape を名指す、ADL は保存則が \`deficit_remaining\` を bound する。in-system bound を持たないのは Layer 4(protocol policy)だけ — by design。
3. **各 layer に保存則があり対応コースで proptest 証明される** — per-scan conservation / fee-residual decomposition / \`absorbed + remaining = deficit\`。**四部作は 4 つの別 feature ではない。同じ規律を 4 つの layer で 4 回証明したものだ。**

## 合格基準

\`\`\`bash
cargo test -p openhl-liquidation adl::tests
\`\`\`

→ **21 テスト pass**（L1 の 5 + L2 の 5 + L3 の 6 + L4 の 5 proptest）。score eligibility・pipeline correctness・保存則・decomposition・決定論性・ordering が specific 入力と random 入力の両方で証明される。コースは openhl ADL参照実装パート \`d66b44a\` に対してバイト単位で一致。DIY Perp シリーズ第 6 弾完結。

## まとめ（3行）

- 5 proptest が L2/L3 の specific test を「すべての valid 入力」へ普遍化する（unit test を置き換えない）。
- input strategy の range が operating regime の spec。\`records_in_rank_order\` だけが ADL のソート構造ゆえに存在する。
- 四部作は 1 つの保存則規律を 4 layer で 4 回証明したもの — byte-for-byte reproducible end-to-end。`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
