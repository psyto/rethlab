// AUTO-GENERATED from drafts/openhl_adl_*_ja.md by .github/scripts/build-openhl-adl-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlAdlJA(prisma: PrismaClient) {
  const tags = ["reth","evm","liquidation","adl","perpetual","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-adl-ja",
      title: "OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3",
      description:
        "保険基金が損失を吸収しきれなかった際の発火回路、最終防衛線「Auto-deleveraging (ADL)」を実装するDIY Perpシリーズ第6弾。\n\n利益の出ているカウンターポジションをランキングし、オーダーブックをバイパスした「帳簿の直接書き換え（Bookkeeping mutation）」による強制クローズとヘアカットを実装します。さらに、破綻を防ぐ「Feedback-loop crash」のメカニズム解説や、システムの決定性を証明する4つの不変条件（Invariant）プロパティテストも網羅。全5レッスンを通じ、Stage 10dに対応するByte-for-byteの一致を達成します。",
      difficulty: "EXPERT",
      duration: 50,
      xpReward: 110,
      track: "diy-perp",
      tags,
      isPublished: true,
      sortOrder: 1010,
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
                  title: "OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3",
                  slug: "openhl-adl-orientation-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 15,
                  xpReward: 50,
                  content: `# OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3

## このコースで作るもの

前のコース (\`building-openhl-liquidation\`) で multi-account scanner — Liquidatable / Underwater なアカウントを 1 つの \`ScanReport\` にまとめる orchestration loop — を出荷した。L13 の最後に、\`ScanReport.unfilled_deficit > 0\` こそが「insurance fund が absorb しきれなかった」を意味する *唯一の* signal であり、Stage 10d (本コース) がそれを consume する、と書いた。

本コースがその consumer を実装する。完走後にはこうなる:

- **新規ソースファイル 1 つ / 約 530 LOC** が \`crates/liquidation/src/adl.rs\` に。
- **21 個のテストが pass する** (SHA \`d66b44a\` 時点): score / no-candidate / single-winner / multi-winner / tiebreaker をカバーする 12 個の unit test + 4 個の invariant proptest + 5 個の score helper test。crate 全体のテスト数は **69 → 90** に。
- **新規 3 型** (\`AdlScore\`, \`AdlRecord\`, \`AdlReport\`) と **新規 2 関数** (\`adl_score\`, \`execute_adl\`) — scanner と比べて clean で small なモジュール。
- **完成した 4 層の safety cascade**: 証拠金維持 (Layer 0) → 強制 close fee (Layer 1) → insurance fund (Layer 2) → **ADL (Layer 3)** → **socialized loss / プロトコル破綻 (Layer 4)**。Layer 4 こそが Layer 0-3 によって到達不能にすべき領域だ。本コース L4 終了時点で \`AdlReport.deficit_remaining > 0\` なら、チェーンは正式に Layer 4 に入っている — 全 depositor が haircut を受けるか、プロトコルが halt する。

掴むこと:

- **ADL が orderbook を完全にバイパスする理由** — 最適化のためではなく、cascade 中に profitable position に対して market order を流すと feedback loop が走ってチェーンが crash するため。Bookkeeping layer での mutation こそが唯一安全な path。
- **Hyperliquid の score convention**: \`(pnl_pct × leverage)\` が「最も lucky な winner」をランキングする — 最も大きい相対利益を出し、*かつ* 最もレバレッジを取ったトレーダー。彼らが先に haircut を受ける。
- **Haircut の仕組み**: ADL 対象 winner の unrealized PnL が \`P\` だったとき、通常 close なら \`P\` 全額を受け取る。ADL では \`P - haircut\` を受け取り、\`haircut = min(remaining_deficit, P)\`。差額がシステムによって absorbed deficit に充当される。
- **決定的なランキング**: score 降順の stable-sort、\`AccountId\` 昇順で tiebreak — 同じ score の 2 人の winner が、全 validator で byte-identical な順序を生む。
- **第 4 層への exit**: candidate pool が deficit を absorb しきる前に尽きたとき、\`AdlReport.deficit_remaining > 0\` となり、プロトコルは打つ手がなくなる。この値が non-zero になる瞬間こそ、チェーンが「破綻している」と自認する瞬間だ。

## ADL が orderbook をバイパスする理由 (feedback loop の話)

本コースで最も重要な概念的飛躍はここだ。コードに入る前に立ち止まる価値がある。

Stage 10c の scanner は close order を **CLOB** (matching engine) に submit する。Liquidatable なアカウントのポジションは、既存の bid/ask stack を consume する market order で unwind される。市場が落ち着いていて liquidation が数件なら、これで問題ない。

だが ADL が設計された対象ケースを考える: **violent な値動きで多数の underwater close が発生し、insurance fund が drain した状態**。ADL でも同じメカニズム — profitable counter-position に対して market order を matching engine 経由で出す — を使うとどうなるか。

板の深さは有限だ。追加の market sell が出るたびに bid stack を punch through し、mark がさらに下がる。Mark が下がるとさらに多くのアカウントが underwater になる。それらの新しい underwater アカウントも ADL を必要とする。Matching engine にさらに aggressive な売りが入る。Mark がさらに下がる。サイクルが暴走する。

これは **まさに** Mt. Gox をスローモーションで殺した failure mode であり、GameStop の時に Robinhood をほぼ殺し、過去 5 年のすべての主要 perp DEX 停止事件を引き起こしたパターンだ。修正は構造的: **ADL は orderbook に触れてはならない**。

代わりに具体的にやること:

- ADL は winner を score で順位付けする — pure Rust、全 validator で独立に。
- 「Force-close」は bookkeeping mutation: trader の collateral に \`pnl - haircut\` を credit、ポジションサイズを 0 に、open-positions テーブルから除去。
- Matching engine は ADL close を一切見ない。Bid/ask stack は無事。Mark が動くのは *他の誰か* が取引したときだけ。

各 \`AdlRecord\` で依然 emit する \`CloseOrderSpec\` は純粋に telemetry 目的 — Stage 10a の他の close path との shape parity と、後段の auditing のために残す。**Bridge** (openhl の integration 層。\`LiquidationScanner::scan\` と、本コース以降の \`execute_adl\` をブロックごとに呼ぶコンポーネント — Liquidation コースの L10 以降で繰り返し登場している同じ component) **がこれを account-state mutation として apply する、CLOB submission としてではない。**

## Stage 10c → 10d の handoff を 1 枚で

\`\`\`
   ┌──────────────────────────────────────────────────────────────┐
   │  Stage 10c scanner（直前のブロック）                            │
   ├──────────────────────────────────────────────────────────────┤
   │  ScanReport {                                                  │
   │      records:          Vec<LiquidationRecord>,                 │
   │      fund_deposits:    i64,                                    │
   │      fund_withdrawals: i64,                                    │
   │      unfilled_deficit: i64,   ←─── > 0 なら ADL 発火             │
   │  }                                                             │
   └──────────────────────────────────────────────────────────────┘
                            │
                            ▼ unfilled_deficit > 0 のとき
   ┌──────────────────────────────────────────────────────────────┐
   │  Stage 10d execute_adl                                         │
   ├──────────────────────────────────────────────────────────────┤
   │  入力: candidates  &[AccountSnapshot]   ← 全 open ポジション     │
   │        mark         MarkPrice                                  │
   │        deficit      i64    (= scanner の unfilled_deficit)      │
   │                                                                │
   │  本体: 1. 各 candidate を score (winner でなければ None)         │
   │        2. Score 降順、account_id 昇順で stable-sort             │
   │        3. 降順に iterate、deficit が absorb されるまで           │
   │           各 winner を haircut                                  │
   │                                                                │
   │  出力: AdlReport {                                              │
   │            records:           Vec<AdlRecord>,                  │
   │            deficit_absorbed:  i64,                             │
   │            deficit_remaining: i64,  ←─ > 0 ならチェーン破綻      │
   │        }                                                       │
   └──────────────────────────────────────────────────────────────┘
\`\`\`

契約は **i64 1 個 in, i64 1 個 out**。Bridge の wiring:
- L13 が \`unfilled_deficit > 0 ⇒ fund_balance == 0\` を証明した (proptest #2)。
- 本 L0 が、L13 のその契約こそが \`execute_adl\` を trigger する条件だと教える。

## Score: 「最も lucky な winner が haircut を受ける」

L1 で実装する。今のところ要点だけ:

$$\\text{pnl\\_pct\\_bps} = \\frac{\\text{pnl} \\times \\text{MARGIN\\_SCALE}}{\\text{collateral}}$$

$$\\text{leverage\\_bps} = \\frac{\\text{notional} \\times \\text{MARGIN\\_SCALE}}{\\text{equity}}$$

$$\\text{score} = \\frac{\\text{pnl\\_pct\\_bps} \\times \\text{leverage\\_bps}}{\\text{MARGIN\\_SCALE}}$$

（Stage 10a のおさらい: \`equity = collateral + unrealized_pnl\`、\`notional = |position_size| × mark\`。つまり \`collateral\` は預けた元本、\`equity\` はそのポジションの現在価値、\`notional\` は総エクスポージャ。）

両方の factor は bps 単位 (10000 = 100%)。積は一度 renormalize される。10× ポジションで +50% のトレーダーは、1× ポジションで +100% のトレーダーより **高い** score になる — Hyperliquid の選択だ。高 leverage の winner はより「構造的に lucky」とみなされる (最大のリスクを取って最大の勝ちを得た)。

これは Hyperliquid の実際の convention。他の venue は別の score を使う (raw \`pnl_pct\` を使うもの、絶対 \`pnl\` を使うもの)。Score の選択は fairness に影響するが、*メカニズム* は同じ。本コースは HL に従う。

## 保存則 (load-bearing な不変条件)

L9 / L10 / L13 と同じ規律:

$$\\text{deficit\\_absorbed} + \\text{deficit\\_remaining} = \\text{入力\\_deficit}$$

\`execute_adl\` は deficit を全額 absorb する (\`deficit_remaining = 0\`) か、できる限り absorb して残りを surface する。**ADL 自身は deficit を生成も消滅もさせない。** L4 の proptest が、ランダムな \`(candidates, mark, deficit)\` triple 全体でこの不変条件を lock する。

これで cascade 数学が閉じる — 4 つの層、4 つの保存恒等式:

$$\\text{L9 (per fund call):} \\quad \\text{amount} + \\text{unfilled} = \\text{shortfall}$$

$$\\text{L10 (per position close):} \\quad \\text{fee\\_to\\_fund} + \\text{residual\\_to\\_account} = \\text{post\\_close\\_equity}$$

$$\\text{L13 (per scan batch):} \\quad \\text{balance\\_before} + \\sum \\text{deposits} - \\sum \\text{withdrawals} = \\text{balance\\_after}$$

$$\\text{L4 (per ADL pass):} \\quad \\text{deficit\\_absorbed} + \\text{deficit\\_remaining} = \\text{入力\\_deficit}$$

4 つの層、4 つの恒等式。本コース完走後、openhl-liquidation crate の数学は **あらゆる操作の下で閉じる**。

## 5 つのレッスン

### Module 0 — Orientation
- **L0** (本レッスン) — なぜ ADL、なぜ orderbook bypass、Stage 10c → 10d handoff、score preview、保存則 preview。

### Module 1 — ADL implementation
- **L1** — \`AdlScore\` newtype + \`AdlRecord\` + \`AdlReport\` 型 + \`adl_score(snapshot, mark) -> Option<AdlScore>\` 関数。Flat / 損失 / collateral 0 ケースでの \`None\` を含む pure-compute scoring。5 個の score テスト。
- **L2** — \`execute_adl(candidates, mark, deficit) -> AdlReport\` — orchestration: \`Option<AdlScore>\` で filter、\`AccountId\` tiebreaker で stable-sort 降順、haircut loop。50 行の本体をフェーズごとに walk + 5 個の simple unit test (zero / no-candidate / no-profitable / single-winner-full / single-winner-partial)。
- **L3** — Nuanced な absorption テスト: score 順の multi-winner、drain-first-then-partial、\`AccountId\` 昇順の tiebreaker、「loser / flat に触れない」防御。6 個の unit test。
- **L4** — 4 個の invariant proptest + Stage 10 quartet retrospective。Per-pass から per-block への保存則、end-to-end で閉じた 4 層 cascade。

## 本コース後に何があるか

Stage 10 cascade は完成する。openhl ロードマップは続く:

- **Stage 11 — Oracle** (\`6495ffd\`、openhl では shipped 済み): median-aggregating な index-price feed と signed observation verify。Rethlab の将来コース。
- **Stage 12 — Vault** (\`1e63e0b\`、shipped 済み): share-based な collateral pooling primitive。将来コース。
- **Stages 13a-13k — bin/openhl** (複数 SHA、shipped 済み): 実際に走る single-validator node。将来コース。

本コースの L4 を完走後、あなたは publish 済みカリキュラムより 1 コース先行し、openhl の Stage 10 終端に到達する。そこから先は openhl が build の reference になる。

## License / SHA discipline

L0–L4 は Stage 10d の SHA \`d66b44a\` を引用する。Single-file の diff は \`crates/liquidation/src/adl.rs\` にある。Stage 10c (\`0a8464e\`) と Stage 10d (\`d66b44a\`) の間で他の crate ファイルは変わらない — ADL は pure additive なモジュールだ。
`,
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
                  title: "レッスン 1 — AdlScore, AdlRecord, AdlReport + adl_score — ranking 関数",
                  slug: "openhl-adl-score-ja",
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 60,
                  content: `# レッスン 1 — \`AdlScore\`, \`AdlRecord\`, \`AdlReport\` + \`adl_score\` — ranking 関数

## ゴール

このレッスンで掴む概念:

- **\`AdlScore\` が newtype なのは、score の *意味* が ordering であって arithmetic ではないから。** \`i64\` を tuple struct (\`pub struct AdlScore(pub i64)\`) で wrap する。これで \`PartialOrd + Ord\` が derive でき、type-level で totally-ordered な型として扱える。素の \`i64\` だと、誤って 2 つの score を *足す*、*掛ける*、balance が期待される場所で *使う* — どれも意味を持たない操作 — を許してしまう。**Newtype は欲しい操作だけを encode し、欲しくないものを禁止する。**
- **\`Option<AdlScore>\` で 4 つの「not a candidate」ケースを表現する。** Flat ポジション、loss を出しているポジション、equity ゼロのポジション、collateral ゼロのポジション — すべて「不適格」。Sentinel score (\`AdlScore(0)\` や \`AdlScore(-1)\`) を返して caller にチェックさせるのではなく、\`adl_score\` は \`None\` を返す。L2 の orchestration はそれを受けて \`candidates.iter().filter_map(...)\` を書ける。不適格は filter-out として encode される。**\`Option\` は「この入力からはこの型の値が出ない」を type level で言う方法だ。**
- **Score は \`pnl_pct × leverage\`、\`MARGIN_SCALE\` で normalize して i64 に収める。** 両 factor は basis points (10000 = 100%)。積は bps² となり病的入力で i64 を overflow する。対策は 4 段: (a) i128 で計算、(b) saturate-multiply、(c) \`MARGIN_SCALE\` で割って bps に戻す renormalize、(d) 最後の i128 → i64 変換も saturating。Stage 10a の \`notional_value\` / \`unrealized_pnl\`、Stage 10b の \`liquidation_fee\` と同じ規律。
- **「同じ pnl_pct でより高い leverage → より高い score」axiom が Hyperliquid 慣例を lock するテスト。** L1 の \`score_higher_for_higher_leverage_winner\` テストは、同一の \`pnl_pct\` を持ち leverage が異なる winner 2 人を構築し、score の ordering を assert する。将来の refactor で score formula を「lower-leverage winner を favor する」方向に flip すれば（一部の venue はそうしている）、この 1 つのテストが落ちる。**1 つのテストが慣例を固定する。Cascade の残りはそれに乗れる。**

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 74 テストが pass する（Liquidation コース由来の 69 + 新規 ADL score テスト 5）。L4 までに合計 90 に到達する（L1/L2/L3 で 5 + 6 + 5 unit test、L4 で 4 proptest）。

具体的な変更:

- **\`src/adl.rs\`。** 新規モジュールファイル。Module-level doc、imports、\`AdlScore\` newtype、\`AdlRecord\` 構造体、\`AdlReport\` 構造体、\`adl_score()\` 関数、テストモジュール 5 個（4 個の None ケース + 1 個の ordering テスト）を追加。
- **\`src/lib.rs\`。** \`pub mod adl;\` と新規 4 名の public 名（\`AdlScore\`, \`AdlRecord\`, \`AdlReport\`, \`adl_score\`）を再 export。

L1 で型語彙 + pure な scoring 関数を出荷する。L2 が両方を consume する orchestration、\`execute_adl\` を実装する。

## おさらい

前のコース（\`building-openhl-liquidation\` の L13）の後:
- \`crates/liquidation/src/\` に source ファイルが 4 つ: \`compute.rs\`, \`insurance.rs\`, \`scanner.rs\`, \`types.rs\` + \`lib.rs\`。
- 69 テスト pass（compute 34 + insurance 21 + scanner 14）。
- Scanner が \`ScanReport.unfilled_deficit: i64\` を生む — ADL の trigger だ。
- \`0a8464e\` 以降、\`crates/liquidation/src/\` の他ファイルは変更なし。

L1 で ADL モジュールが始まる。Crate の Stage 10d に対する diff は、新規ファイル 1 つ（\`adl.rs\`）と \`lib.rs\` の 4 行編集だけ。

## 計画

編集は 3 つ:

1. **\`crates/liquidation/src/adl.rs\` を新規作成。** Doc preamble（L0 の「ADL が orderbook を bypass する理由」framing を引用）、imports、\`AdlScore\` newtype、\`AdlRecord\` 構造体、\`AdlReport\` 構造体、\`adl_score\` 関数を含む。\`execute_adl\` はまだなし（L2 で着地）。
2. **\`adl_score\` の unit test を 5 個追加** — \`adl.rs\` の末尾に \`#[cfg(test)] mod tests { ... }\` で。4 個の None ケース（flat / losing / zero collateral / short-at-entry）+ 1 個の leverage-ordering テスト。
3. **\`pub mod adl;\` と再 export を \`crates/liquidation/src/lib.rs\` に追加。**

> 🛑 **予測。** 続きを読む前に: この 4 人のトレーダーを ADL score 順 (highest = 最初に haircut) でランク付けせよ。全員 long 1 BTC、全員 profitable。Hyperliquid の \`pnl_pct × leverage\` 慣例を使う。
> 
> - **A**: collateral $200、entry $100k、mark $200k (gain $200 = equity の 100%、leverage 1×)
> - **B**: collateral $20、entry $100k、mark $200k (同 notional、leverage 10×、gain は collateral の 100%)
> - **C**: collateral $200、entry $100k、mark $150k (gain 50%、leverage 1×)
> - **D**: collateral $200、entry $100k、mark $250k (collateral 比で 75% gain、post-PnL leverage は 0.8×)

（答え: **B → A → D → C。** B は 10× leverage × 500% pnl_pct で highest-leverage な profitable winner。A は 50% pnl_pct × 1× leverage。D は 75% × ~0.8× で A より低い。C は 50% × ~0.6× leverage で最下位。正確な数字は equity-vs-collateral の framing 次第。だが key intuition は **leverage が PnL ranking 上の multiplier である** こと — これこそ Hyperliquid が product 慣例を使う理由だ。）

## Score formula を 1 枚で

\`\`\`
   ┌─────────────────────────────────────────────────────────────┐
   │  adl_score(snapshot, mark) → Option<AdlScore>                │
   ├─────────────────────────────────────────────────────────────┤
   │                                                             │
   │  Eligibility (どれか 1 つでも該当すれば None):                │
   │  ─────────────                                              │
   │    position_size == 0      ←─── flat                         │
   │    pnl ≤ 0                  ←─── losing or at entry           │
   │    collateral ≤ 0          ←─── degenerate (divide by zero)  │
   │    equity ≤ 0              ←─── degenerate (divide by zero)  │
   │                                                             │
   │  Computation (i128 中間値、saturating、renormalize):          │
   │  ─────────────                                              │
   │    pnl_pct  = pnl × MARGIN_SCALE / collateral      (bps)     │
   │    leverage = notional × MARGIN_SCALE / equity      (bps)    │
   │    raw      = pnl_pct × leverage / MARGIN_SCALE     (bps×bps→bps²/10000) │
   │    score    = saturate_i128_to_i64(raw)                      │
   │                                                             │
   │  Returns: Some(AdlScore(score))                              │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
\`\`\`

押さえる点が 3 つ:

1. **4 つの eligibility predicate は early-return 順、安いものから先。** \`position_size == 0\` は瞬時の rejection（i64 比較 1 回）。PnL / collateral / equity チェックはそれぞれ関数呼び出しを要するので、最も安い predicate が pass してから発火する。**Filter のカスケードは安いテストから評価する。高いテストは後。**
2. **\`pnl_pct\` と \`leverage\` は両方とも bps**、それを掛けて（= bps²）、\`MARGIN_SCALE\` で 1 度割って bps に戻して renormalize。Renormalization が最終 score を sane な input で i64 にきれいに収まる range に保つ。これなしだと、10000-bps × 10000-bps = \`100,000,000\` は i64 には収まるが、leverage = 50_000 bps（5×）と組み合わさると爆発する。**Bps × bps × renormalize はパーセント × パーセントの consensus-arithmetic イディオム。**
3. **最後の \`saturate_i128_to_i64\` は *病的* な入力のためであって、通常入力のためではない。** 100× leveraged winner が 1000% pnl_pct を出しても \`1000_0000 × 100_0000 / 10000 = 1_000_000_000\` — \`10^9\` bps で i64 内に余裕。Saturation が発火するのは、upstream で根本的に何かが壊れたときだけ。**Saturating な変換は、捕まえそこねた upstream bug への belt-and-suspenders だ。**

## 手を動かす walk-through

### Step 1: \`src/adl.rs\` を新規作成 — doc preamble + imports

\`crates/liquidation/src/adl.rs\` を新規作成する。Module doc preamble は L0 で扱った最も重要な概念的コンテンツ（「ADL が orderbook を bypass する理由」framing）を運ぶ — \`cargo doc\` 読者が最初に見る:

\`\`\`rust
//! Auto-deleveraging (ADL) — Layer 3 of the safety-net cascade (Stage 10d).
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
//! [\`CloseOrderSpec\`] for parity with Stage 10a's other paths, but the
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

このプリアンブルで押さえる点が 5 つ:

1. **最初の 1 文が *trigger* と *response* を名指す。** "When \`ScanReport::unfilled_deficit > 0\`, the insurance fund couldn't absorb everything. ADL is the last-resort mechanism." 最初の 1 文だけ読んだ読者でも、ADL が cascade のどこに座るか分かる。**モジュール doc は実装詳細ではなく cascade position から始める。**
2. **\`Why ADL bypasses the orderbook\` セクションが** L0 の load-bearing 概念をモジュール doc 内で繰り返す。L0 を経ずにここに到達した読者は、feedback-loop の理由が必要だ。そうでないと「なぜ market order を submit しないのか」と疑問に思う。**モジュール doc はコースレベル orientation の本質的概念を duplicate する。読者が context を chase する必要はない。**
3. **Score formula が \`rust\` ではなく \`text\` code block 内にある。** Formula は Rust ではなく algebra だからだ。\`text\` という指定は「monospace、no syntax highlighting、math 記法」のレンダースタイルを signal する。**Math には \`text\`、コードには \`rust\`。\`cargo doc\` HTML での区別が効く。**
4. **\`Determinism\` セクションが 3 つの negative を名指す**: float arithmetic なし、\`HashMap\` iteration なし、clock read なし。**モジュールが *何をしないか* を documented にすることが、コンセンサス決定性が要求するものを signal する。** 将来 \`chrono::Utc::now()\` を呼ぼうとする contributor は、これを見て思いとどまる。
5. **\`close_order_spec\` を import している** — L1 では使わないにもかかわらず（L2 の \`execute_adl\` が使う）。L11 の \`account_equity\` import と同じ staging 規律。**ファイルの完全なコードセットが使う import を入れる、現在のレッスンのコードが使うものではなく。** Unused-import 警告が L1 で出て、L2 で消える。

### Step 2: \`AdlScore\` を追加

Imports の下に score newtype を追加:

\`\`\`rust
/// ADL ranking score. Higher means earlier force-close.
///
/// Computed as \`pnl_pct × leverage\`, both expressed in \`MARGIN_SCALE\`
/// units; the product is renormalized once. Saturates at \`i64::MAX\`
/// for pathological inputs.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct AdlScore(pub i64);
\`\`\`

押さえる点が 6 つ:

1. **\`pub struct AdlScore(pub i64)\`** — tuple struct、public inner。Inner の \`pub\` は caller が \`AdlScore(42)\` と \`score.0\` を直接書けることを意味する。Inner を private にして \`pub fn new(v: i64) -> Self\` と \`pub fn value(&self) -> i64\` を加えることも *できる*。だが L1 の primary user は L2 \`execute_adl\` とテストモジュール — どちらも直接アクセスを望む。**Public-inner な tuple struct は、consumer が in-crate でかつ型が純粋に「label」wrapper のときに正しい。**
2. **\`PartialOrd + Ord\` を derive する** — これこそが *newtype の存在理由*。\`i64\` 上の \`Ord\` は任意の caller が任意の i64 を別の i64 と order できる。\`AdlScore\` 上の \`Ord\` は score 同士を order するだけ。Stage 10c の \`LiquidationRecord\` は *unrelated* な \`i64\` の struct だった。意味的に order できないので \`Ord\` を derive しなかった。ここでは、score を order することこそが目的の操作だ。**比較が型の目的のときだけ \`Ord\` を derive する、単に i64 形状だからではない。**
3. **\`Hash\` も derive している** — 将来 ADL 拡張が \`BTreeMap<AdlScore, _>\` や \`HashMap<AdlScore, _>\` を必要としたとき、両方とも動くようにするため。\`Hash\` の derive は安く、コストはゼロ。**Consumer が key として使うかもしれない value 型には \`Hash\` を defensively derive する。**
4. **\`Default\` を derive している** — \`AdlScore::default()\` は \`AdlScore(0)\` を返す。これは意味がある。ゼロは「何も勝っていない、何も負けていない」sentinel value だ。L2 record の initialization はこの default に乗れる。**Newtype の \`Default\` は wrap された型の default に従う — ゼロが意味のある sentinel のとき。**
5. **\`Add\` / \`Mul\` / \`Sub\` の derive なし。** Score は合計可能でも差分可能でもない — 「score A プラス score B」の domain meaning は存在しない。Newtype はこれらを実装しないことで *禁止する*。素の \`i64\` は silently \`score_a + score_b\` を許容するが、newtype はそのような試みを compile しない。**Newtype は subtractive: 操作を table から外す、新しい操作を追加するのではない。**
6. **Doc コメントが saturation 挙動を名指す** — saturation 自体は \`adl_score\` の body にあるにもかかわらず。\`AdlScore\` の consumer は doc を読む。関数は読まない。Value range を型レベルで document することで bug を防ぐ。**型の invariant は型自身に document する、コンストラクタだけではなく。**

### Step 3: \`AdlRecord\` を追加

\`AdlScore\` の下に:

\`\`\`rust
/// Per-account record of one ADL force-close.
///
/// The bridge applies these as bookkeeping mutations: credit the
/// trader's collateral by \`pnl_paid\`, set their position size to zero,
/// remove the account from the open-positions table. \`close_order\`
/// carries the spec for parity with Stage 10a's other paths and for
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

押さえる点が 5 つ:

1. **6 フィールド、すべて \`pub\`** — Stage 10c の \`LiquidationRecord\` と同じ data-carrier パターン。Bridge が全フィールドを直接読む。Accessor は不要。**All-public な record 型は、consumer が in-crate または downstream auditor のときに正しい。Accessor は何の invariant も protect せずに friction だけを増やす。**
2. **\`pnl_paid = pnl_gross - haircut\` は 1 record の保存則 invariant。** 3 フィールドが同じ情報を 2 回 encode する（gross、haircut、paid）。冗長性は *意図的*。読者は trader が何を得たか算術せずに分かる。**Audit-trail record では、冗長フィールドは minimal フィールドより明快だ。**
3. **\`close_order\` が存在する — CLOB に submit しないにもかかわらず。** これを運ぶことで \`AdlRecord\` の shape が \`LiquidationRecord\` と互換になる。将来「すべての close を 1 つの log に」merge する場合、close_order_spec の計算を再実行せずに 2 つの型を union できる。**関連 record 間の shape consistency は downstream の merge コードで pay off する。**
4. **\`score: AdlScore\`（\`i64\` ではない）。** Record は *score 型* を運ぶ、raw 数字ではない。Record の consumer は score を他の score と比較する。Newtype が score を balance や deficit と比較することを禁じる。**Record は値を domain 型で保持する、primitive 型ではない。**
5. **\`notional\` も \`mark\` フィールドもない。** Record は *1 アカウントの 1 瞬間における ADL の outcome* を表す。Bridge は既に mark を知っている（\`execute_adl(_, mark, _)\` を呼んだ）し、必要なら snapshot から notional を計算できる。**Caller が既知の context を record に duplicate しない。Result を保存する、input ではなく。**

### Step 4: \`AdlReport\` を追加

\`AdlRecord\` の下に:

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

押さえる点が 4 つ:

1. **3 フィールド: vec + 2 つの i64 aggregate。** \`ScanReport\`（vec + 3 つの i64 aggregate）と同じ shape。パターンが確立: orchestration の出力は audit trail と aggregate の両方を運ぶ。**同じ crate 内の先行モジュールの report shape に合わせる。予測可能性が美徳だ。**
2. **\`Default\` derive は意味がある** — 空の \`Vec<AdlRecord>\`、ゼロの deficit_absorbed、ゼロの deficit_remaining。L2 orchestration の「deficit 入力ゼロ」early-return が \`AdlReport::default()\` を使う。**Default-derived な report 型は、happy-path の early return を 1 行で書ける。**
3. **\`Clone + Debug + PartialEq + Eq + Default\` セット、ただし \`Copy\` は NOT。** \`ScanReport\` と同じ理由 — \`Vec\` は heap-allocated。**Vec-containing な report は \`Clone\`、Vec-free な report は \`Copy\`。**
4. **\`deficit_remaining > 0\` は chain-insolvent signal。** Doc がそう言う。L4 retrospective でこれを「fourth layer」exit として名指す。**Edge value の operational meaning を型と並べて document する。**

### Step 5: \`adl_score\` を追加

\`AdlReport\` の下に:

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

押さえる点が 8 つ:

1. **4 つの early-return guard、コスト昇順。** Flat チェック（比較 1 回）→ pnl（関数呼び出し、比較 1 回）→ collateral（read 1 回、比較 1 回）→ equity（関数呼び出し、比較 1 回）。安い predicate が最初、高いものが後。**L12 scanner の exit-fast-on-rejection パターンが再登場する。**
2. **\`unrealized_pnl\` と \`account_equity\` は *別々に* 呼ばれる**、1 つの snapshot-derive helper に collapse されていない。それぞれ \`(snapshot, mark)\` を取って 1 つの \`i64\` を返す。別々に呼ぶことで、関数が algebra として top-to-bottom で読める。**読者が math を辿る必要があるとき、直列の関数呼び出しが one-shot bundle に勝つ。**
3. **\`pnl <= 0\` は losing AND at-entry ポジションの両方を reject する。** Entry で \`pnl == 0\` → winner ではない → ADL candidate ではない。Unified なチェックが両方をカバーする。**「non-positive」predicate が「winner」セマンティクスの正しい境界だ、「strictly negative」predicate ではない。**
4. **\`collateral <= 0\` と \`equity <= 0\` は *defensive*** — divide-by-zero（および divide-by-negative、score の符号を nonsensically flip する）から protect する。Stage 10b の \`liquidation_fee\` にはこれらの guard がない — collateral や equity で割らないからだ。**Division は pre-check が要る。Multiplication は要らない。**
5. **全 arithmetic で i128 中間値を使う。** \`pnl × MARGIN_SCALE\` は大きな pnl で i64 を overflow しうる（\`MARGIN_SCALE = 10000\` なので）。Product が i128 になり、collateral での divide が i128 に保ち、次の multiplication が i128 に保ち、最後の renormalize が i128 に保ち、\`saturate_i128_to_i64\` で narrow するのは最後だけ。**i128 中間値は、overflow しうる multiplication の consensus-arithmetic イディオム。**
6. **i128 product にも \`saturating_mul\` — i128 が 128 bit あるにもかかわらず。** Belt-and-suspenders。「sane の境界」入力（例: 1000% pnl × 1000× leverage at $1B notional）では、product が i128 の range に近づく。各 multiplication step で 1 度 saturate するコストはゼロ。**全 multiplication を saturate する。コストはゼロで、bug class を 1 つまるごと消せる。**
7. **素の \`/\` division、\`saturating_div\` ではない。** 2 つの正の i128 値の integer division は overflow しえない（\`i128::MIN / -1\` だけが overflow できるが、ここの値はすべて正）。**Saturating 演算は overflow しうる arithmetic のためのもの。正-正な division はしえない。**
8. **最後の \`saturate_i128_to_i64\` こそが情報を失う *可能性* のある cast。** Raw i128 score が \`2^70\` なら、narrow するときに bit を失う。Saturating な変換が wrap ではなく \`i64::MAX\` に clamp する。**Width-narrowing な変換は consensus コードで明示的な saturation を要する。**

> 🛑 **やりがちな勘違い。** 「なぜ \`adl_score\` は Stage 10b の \`liquidation_fee\` のように \`LiquidationParams\` を取らないのか?」 ADL に tunable knob がないからだ。Stage 10b の \`liquidation_fee_bps\` は governance が変えられる network parameter。Score formula は固定の慣例（Hyperliquid の）。将来のプロトコルアップグレードが governance に score weight を tune させれば、その時 parameter が入る。**未使用の parameter を pre-add しない。型 signature は API surface、param 追加は breaking change だ。**

### Step 6: 5 個の unit test を追加

\`#[cfg(test)] mod tests\` ブロック (これは \`adl.rs\` の末尾に標準スキャフォールディングで新規作成する) 内に追加:

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

押さえる点が 7 つ:

1. **テストモジュールが \`snapshot\` helper パターンを再利用する** — Liquidation コースの L4/L8/L11 から — 同じシグネチャ \`(account, size, entry, collateral)\`、同じ返り型。1 度学んだ読者は crate を跨いで認識する。**Test helper は crate 全体で同じ見た目にする。**
2. **4 つの None テスト + 1 つの ordering テスト。** None テストが eligibility filter の各 branch を exercise する。Ordering テストが score の *唯一の* 意味のある性質（relative magnitude）を exercise する。一緒に \`adl_score\` の約束をカバーする。**\`Option<T>\` を返す pure 関数では、各 None branch + 1 つの happy-path 性質をテストする。**
3. **Ordering テストが \`assert!(sb > sa, "…")\` を使う、\`assert_eq!\` ではない。** 正確な score 値は fragile（固定小数点 rounding に sensitive）だが、relative ordering こそが load-bearing 性質だからだ。**Property-style な assertion（\`>\`, \`<\`, \`>=\`）は、ordering を意図とするテストで value-style な assertion（\`==\`）に勝つ。**
4. **Ordering テストのコメントが math を歩く。** 読者は \`pnl_pct_bps = 100 × 10_000 / 50 = 20_000\` を見て再導出できる。L13 のテストコメントと同じ \`math-walk in comments\` 規律。**テスト内の math コメントが test を worked example に変える。**
5. **\`score_none_for_short_at_entry\` が最も subtle な None ケース。** Entry の short ポジションは \`pnl = 0\`（negative ではなく、entry にちょうど一致）。テストは \`pnl <= 0\` predicate が単に negative だけでなく 0 も正しく catch することを確認する。**Signed predicate の境界テストが missing-equals bug を catch する。**
6. **\`score_none_for_zero_collateral\` は mark 120（profitable!）で実行。** テスト setup は *意図的に* 誤解を招く — ポジションは勝っている。だが divide-by-zero 防御が catch する。**Defensive な guard は、それ以外なら成功する入力でテストする。**
7. **\`proptest::prelude::*;\` が import されている、ただし L1 に proptest はない。** L4（proptest レッスン）用に staged。**Forward-staged な import が L4 を純粋に additive なレッスンに保つ。**

### Step 7: \`lib.rs\` を配線

\`crates/liquidation/src/lib.rs\` を開く。3 つの編集:

まず、既存の \`pub mod ...;\` ブロックに \`pub mod adl;\` を追加。Alphabetical に挿入:

\`\`\`rust
pub mod adl;
pub mod compute;
pub mod insurance;
pub mod scanner;
pub mod types;
\`\`\`

次に、既存のモジュール再 export と並べて \`adl\` 再 export 行を追加:

\`\`\`rust
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

新規 public 名 4 つを 1 行で: \`adl_score, AdlRecord, AdlReport, AdlScore\` — \`{ }\` 内 alphabetical。

3 つ目、\`lib.rs\` 冒頭の roadmap コメントを Stage 10d in-progress に更新（任意）。具体的な更新内容は今の \`lib.rs\` preamble 次第。答え合わせは Stage 10d をこのコミットで in-progress、L4 capstone で complete とマークする。

### Step 8: テストを走らせる

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

期待される出力（短縮版）:

\`\`\`
running 74 tests
test adl::tests::score_higher_for_higher_leverage_winner ... ok
test adl::tests::score_none_for_flat_position ... ok
test adl::tests::score_none_for_losing_long ... ok
test adl::tests::score_none_for_short_at_entry ... ok
test adl::tests::score_none_for_zero_collateral ... ok
... (Liquidation コース由来の 69 テスト)

test result: ok. 74 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
\`\`\`

**74 テスト pass。** ADL モジュールが型語彙と scoring 関数とともに存在する。L2 が \`execute_adl\`（orchestration verb）と 5 個の unit test を追加し、合計を 79 に持っていく。

エラー時にありがちなパターン:

- **\`cannot find function \\\`account_equity\\\` in this scope\`** — \`use crate::compute::{ ... }\` import から 6 つの名前のうち 1 つが欠けている。Import block を再確認: \`account_equity, close_order_spec, notional_value, saturate_i128_to_i64, unrealized_pnl\`。
- **\`type \\\`Option<AdlScore>\\\` does not implement \\\`PartialEq\\\`** — テスト失敗が derive を忘れたと言う。\`AdlScore\` に \`#[derive(PartialEq, Eq)]\` を追加する。\`Option<T>: PartialEq\` の blanket impl は \`T: PartialEq\` を必要とする。
- **\`score_higher_for_higher_leverage_winner\` が \`score_a >= score_b\` で失敗** — \`adl_score\` の division 順序が間違っている。Formula を読み直す: \`pnl_pct = pnl × MARGIN_SCALE / collateral\`（numerator が先、その後 divide）。\`pnl × (MARGIN_SCALE / collateral)\` と書くと、integer truncation が精度を殺し、一部の入力で relative ordering が flip する。
- **\`score_none_for_short_at_entry\` が失敗（\`None\` ではなく \`Some(...)\` を返す）** — \`pnl <= 0\` を \`pnl < 0\`（strict）で書いている。Strict version では 0 は profitable とみなされる。L1 が指定するのは unified な \`<= 0\`。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **\`AdlScore\` が newtype なのは ordering を *enable する* ためかつ arithmetic を *forbid する* ため。** 素の \`i64\` だと、2 つの score を足す（semantic meaning なし）、引く（同様に meaning なし）、balance と比較する（real な bug class）を許してしまう。Newtype は domain がサポートする *正確な* 操作 — 比較、等価 — を encode し、それ以外は何も encode しない。**Newtype は subtractive: 操作を table から外す。**

2. **不適格には \`Option<AdlScore>\`、sentinel value ではない。** 「不適格」に \`AdlScore(0)\` を返すと、全 caller が値をチェックして「0 = 不適格」か「0 = 適格だが unlucky」を判断させられる。\`Option\` を使えば L2 orchestration は \`filter_map\` を使って不適格ケースを一切見ない。**\`Option<T>\` は「不適格」の type-level encoding。Sentinel value は全 caller に predicate を re-implement させる。**

3. **4 つの eligibility predicate すべてが \`<=\` を使う、\`<\` ではない。** ゼロは *not* candidate state — flat ポジション、ゼロ PnL、ゼロ collateral、ゼロ equity すべて edge ケースで score を生むべきではない。Unified な \`<=\` 境界が追加の \`== 0\` チェックなしでゼロケースを catch する。**Signed value 上の境界 predicate は通常 \`<=\` / \`>=\` が欲しい。Strict-less-than 形はゼロを取り逃す。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d66b44a
diff -u ~/code/my-openhl/crates/liquidation/src/adl.rs ./crates/liquidation/src/adl.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

L1 の後:
- **adl.rs** が Stage 10d の \`adl.rs\` の **\`score_higher_for_higher_leverage_winner\` テストまで** 一致。\`execute_adl\` 関数と残りの 16 テスト + 4 proptest は L2 / L3 / L4 で着地。
- **lib.rs** が Stage 10d の \`lib.rs\` と **byte-for-byte 一致** — \`pub mod adl;\` 行と \`pub use adl::{...}\` 再 export について。

## よくある質問

**Q1: \`AdlScore\` が tuple struct (\`AdlScore(i64)\`) で record struct (\`AdlScore { value: i64 }\`) ではないのはなぜか?**

Tuple struct が正しいのは、wrap することだけが目的だからだ。これは *単一値 wrapper* の Rust イディオム。Record struct は型が *名前付き* state を運ぶときに正しい。\`AdlScore\` は wrapper であって state container ではない。**Single-field newtype は tuple struct、multi-field 型は record struct。**

**Q2: \`AdlRecord\` がなぜ \`pnl_gross\` と \`pnl_paid\` と \`haircut\` を全部保存するのか?**

冗長性が readability の勝ちだからだ。保存則: \`pnl_gross - haircut = pnl_paid\` が全 record で成立する。3 つを全部運べば、bridge は「X を支払い、Y を fund に保持」と算術なしで log できる。**Audit-trail record は冗長フィールドを運ぶ、minimal record は caller に math を強いる。**

**Q3: \`adl_score\` がなぜ \`pnl_gross < some_minimum\` で reject しないのか（例: gain が小さすぎて haircut が operational cost に見合わないポジション）?**

プロトコルに「operational cost」がないからだ — どの ADL も bookkeeping mutation で、orderbook に触れず、fee も課金されない。小さな gain を skip するのは fairness 判断（tiny winner と huge winner のどちらに haircut するか）であって cost optimization ではない。Hyperliquid はこれをしない。慣例に従う。**「operational cost」のための threshold を加えるなら、まずそのコストが存在することを verify する。**

**Q4: Score を \`unrealized_pnl × position_size\`（\`pnl_pct × leverage\` ではなく）で使えるか?**

Yes — それが Drift が insurance fund draw 用に使う score だ（別名で）。Collateral 相対の leverage ではなく raw position size を penalize する。Hyperliquid が leverage-based 形を選んだのは、それが *position-size-independent* だからだ — 100% pnl_pct の $1M ポジションは、同じ leverage で 100% pnl_pct の $100 ポジションと同じ score になる。Intuition: 単に *big winner* ではなく、*risk-taking lucky winner* を penalize する。**Score 慣例はプロトコルの fairness モデルを encode する。**

**Q5: \`Cargo.toml\` がこのレッスンに登場しないのはなぜか?**

新規 dependency が要らないからだ。\`adl.rs\` は \`crate::compute\`、\`crate::types\`、\`openhl_clob\`、\`openhl_funding\` だけを使う。すべて liquidation crate が既に依存している。**新規モジュールファイルが \`Cargo.toml\` 変更を要求するのは、新規外部 dependency を導入するときだけ。**

**Q6: \`adl_score\` を closure \`score_fn: F\` で parameterize して、将来のプロトコルが慣例を swap できるようにできるか?**

できるが、コストは real だ。全 call site が closure を渡す必要があり、L2 orchestration が generic parameter を全 signature に運ぶ。1 つの production score（\`pnl_pct × leverage\`）があるなら、concrete 関数のほうがクリーン。将来の governance 機能が validator に score weight を tune させるなら、そのとき parameterization が来る — *そしてそれは \`LiquidationParams\` 風 struct で、closure ではない*。**Closure は関数を parameterize する、struct はプロトコルを parameterize する。実際に configurable なものに合うほうを選ぶ。**

## 次のレッスン (L2) — \`execute_adl\` — orchestration の心臓

L2 が \`execute_adl(candidates, mark, deficit) -> AdlReport\` を実装する。5 テスト validated な \`adl_score\` を取り、candidate スライスに apply し、結果を sort し、deficit が absorb されるか candidate が exhaust されるまで haircut loop を走らせる関数だ。

フェーズ構造（5 フェーズ）: 非正 deficit で early-return → score と filter → tiebreaker 付き stable-sort → iterate して haircut → report を構築。さらに 5 個の simple unit test: zero deficit、negative deficit、no candidates、no profitable candidates、single winner full absorb。

L2 の後、scanner が *ADL に対して runnable* になる — 79 テスト pass（L1 から 74 + L2 で 5 新規）。L3 で 6 個の nuanced absorption テスト、L4 で 4 個の invariant proptest と Stage 10 quartet retrospective が追加される。
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
