// AUTO-GENERATED from drafts/openhl_adl_*_ja.md by .github/scripts/build-openhl-adl-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlAdlJA(prisma: PrismaClient) {
  const tags = ["reth","evm","liquidation","adl","perpetual","l1","openhl","expert"];

  await prisma.course.create({
    data: {
      slug: "building-openhl-adl-ja",
      title: "Step 6. ADL：auto-deleveraging、safety-net cascade の Layer 3",
      description:
        "保険基金が損失を吸収しきれなかった際の発火回路、最終防衛線「Auto-deleveraging (ADL)」を実装するDIY Perpシリーズ第6弾。\n\n利益の出ているカウンターポジションをランキングし、オーダーブックをバイパスした「帳簿の直接書き換え（Bookkeeping mutation）」による強制クローズとヘアカットを実装する。さらに、破綻を防ぐ「Feedback-loop crash」のメカニズム解説や、システムの決定性を証明する4つの不変条件（Invariant）プロパティテストも網羅する。全5レッスンを通じ、ADL参照実装パートに対応するByte-for-byteの一致を達成する。",
      difficulty: "EXPERT",
      duration: 170,
      xpReward: 330,
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

前のコース (\`building-openhl-liquidation\`) で multi-account scanner — Liquidatable / Underwater なアカウントを 1 つの \`ScanReport\` にまとめる orchestration loop — を出荷した。直前コースの最終レッスンで、\`ScanReport.unfilled_deficit > 0\` こそが「insurance fund が absorb しきれなかった」を意味する *唯一の* signal であり、本コース（ADL参照実装パート）がそれを consume する、と整理した。

本コースがその consumer を実装する。完走後にはこうなる:

- **新規ソースファイル 1 つ / 約 530 LOC** が \`crates/liquidation/src/adl.rs\` に。
- **21 個のテストが pass する** (SHA \`d66b44a\` 時点): score / no-candidate / single-winner / multi-winner / tiebreaker / nuanced-absorption をカバーする 16 個の unit test + 5 個の invariant proptest。crate 全体のテスト数は **69 → 90** に。
- **新規 3 型** (\`AdlScore\`, \`AdlRecord\`, \`AdlReport\`) と **新規 2 関数** (\`adl_score\`, \`execute_adl\`) — scanner と比べて clean で small なモジュール。
- **完成した 4 層の safety cascade**: 証拠金維持 (Layer 0) → 強制 close fee (Layer 1) → insurance fund (Layer 2) → **ADL (Layer 3)** → **socialized loss / プロトコル破綻 (Layer 4)**。Layer 4 こそが Layer 0-3 によって到達不能にすべき領域だ。本コース レッスン4 終了時点で \`AdlReport.deficit_remaining > 0\` なら、チェーンは正式に Layer 4 に入っている — 全 depositor が haircut を受けるか、プロトコルが halt する。

掴むこと:

- **ADL が orderbook を完全にバイパスする理由** — 最適化のためではなく、cascade 中に profitable position に対して market order を流すと feedback loop が走ってチェーンが crash するため。Bookkeeping layer での mutation こそが唯一安全な path。
- **Hyperliquid の score convention**: \`(pnl_pct × leverage)\` が「最も lucky な winner」をランキングする — 最も大きい相対利益を出し、*かつ* 最もレバレッジを取ったトレーダー。彼らが先に haircut を受ける。
- **Haircut の仕組み**: ADL 対象 winner の unrealized PnL が \`P\` だったとき、通常 close なら \`P\` 全額を受け取る。ADL では \`P - haircut\` を受け取り、\`haircut = min(remaining_deficit, P)\`。差額がシステムによって absorbed deficit に充当される。
- **決定的なランキング**: score 降順の stable-sort、\`AccountId\` 昇順で tiebreak — 同じ score の 2 人の winner が、全 validator で byte-identical な順序を生む。
- **第 4 層への exit**: candidate pool が deficit を absorb しきる前に尽きたとき、\`AdlReport.deficit_remaining > 0\` となり、プロトコルは打つ手がなくなる。この値が non-zero になる瞬間こそ、チェーンが「破綻している」と自認する瞬間だ。

## ADL が orderbook をバイパスする理由 (feedback loop の話)

本コースで最も重要な概念的飛躍はここだ。コードに入る前に立ち止まる価値がある。

Liquidation参照実装（スキャナパート） の scanner は close order を **CLOB** (matching engine) に submit する。Liquidatable なアカウントのポジションは、既存の bid/ask stack を consume する market order で unwind される。市場が落ち着いていて liquidation が数件なら、これで問題ない。

だが ADL が設計された対象ケースを考える: **violent な値動きで多数の underwater close が発生し、insurance fund が drain した状態**。ADL でも同じメカニズム — profitable counter-position に対して market order を matching engine 経由で出す — を使うとどうなるか。

板の深さは有限だ。追加の market sell が出るたびに bid stack を punch through し、mark がさらに下がる。Mark が下がるとさらに多くのアカウントが underwater になる。それらの新しい underwater アカウントも ADL を必要とする。Matching engine にさらに aggressive な売りが入る。Mark がさらに下がる。サイクルが暴走する。

これは **まさに** Mt. Gox をスローモーションで殺した failure mode であり、GameStop の時に Robinhood をほぼ殺し、過去 5 年のすべての主要 perp DEX 停止事件を引き起こしたパターンだ。修正は構造的: **ADL は orderbook に触れてはならない**。

代わりに具体的にやること:

- ADL は winner を score で順位付けする — pure Rust、全 validator で独立に。
- 「Force-close」は bookkeeping mutation: trader の collateral に \`pnl - haircut\` を credit、ポジションサイズを 0 に、open-positions テーブルから除去。
- Matching engine は ADL close を一切見ない。Bid/ask stack は無事。Mark が動くのは *他の誰か* が取引したときだけ。

各 \`AdlRecord\` で依然 emit する \`CloseOrderSpec\` は純粋に telemetry 目的 — Liquidation参照実装（計算パート） の他の close path との shape parity と、後段の auditing のために残す。**Bridge** (openhl の integration 層。\`LiquidationScanner::scan\` と、本コース以降の \`execute_adl\` をブロックごとに呼ぶコンポーネント — Liquidation コースの レッスン10 以降で繰り返し登場している同じ component) **がこれを account-state mutation として apply する、CLOB submission としてではない。**

## Liquidation参照実装（スキャナパート） → ADL の handoff を 1 枚で

\`\`\`
   ┌──────────────────────────────────────────────────────────────┐
   │  Liquidation参照実装（スキャナパート） scanner（直前のブロック）                            │
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
   │  ADL参照実装パート execute_adl                                         │
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
- レッスン13 が \`unfilled_deficit > 0 ⇒ fund_balance == 0\` を証明した (proptest #2)。
- 本 L0 が、レッスン13 のその契約こそが \`execute_adl\` を trigger する条件だと教える。

## Score: 「最も lucky な winner が haircut を受ける」

レッスン1 で実装する。今のところ要点だけ:

$$\\text{pnl\\_pct\\_bps} = \\frac{\\text{pnl} \\times \\text{MARGIN\\_SCALE}}{\\text{collateral}}$$

$$\\text{leverage\\_bps} = \\frac{\\text{notional} \\times \\text{MARGIN\\_SCALE}}{\\text{equity}}$$

$$\\text{score} = \\frac{\\text{pnl\\_pct\\_bps} \\times \\text{leverage\\_bps}}{\\text{MARGIN\\_SCALE}}$$

（Liquidation参照実装（計算パート） のおさらい: \`equity = collateral + unrealized_pnl\`、\`notional = |position_size| × mark\`。つまり \`collateral\` は預けた元本、\`equity\` はそのポジションの現在価値、\`notional\` は総エクスポージャ。）

両方の factor は bps 単位 (10000 = 100%)。積は一度 renormalize される。10× ポジションで +50% のトレーダーは、1× ポジションで +100% のトレーダーより **高い** score になる — Hyperliquid の選択だ。高 leverage の winner はより「構造的に lucky」とみなされる (最大のリスクを取って最大の勝ちを得た)。

これは Hyperliquid の実際の convention。他の venue は別の score を使う (raw \`pnl_pct\` を使うもの、絶対 \`pnl\` を使うもの)。Score の選択は fairness に影響するが、*メカニズム* は同じ。本コースは HL に従う。

## 保存則 (load-bearing な不変条件)

レッスン9 / レッスン10 / レッスン13 と同じ規律:

$$\\text{deficit\\_absorbed} + \\text{deficit\\_remaining} = \\text{入力\\_deficit}$$

\`execute_adl\` は deficit を全額 absorb する (\`deficit_remaining = 0\`) か、できる限り absorb して残りを surface する。**ADL 自身は deficit を生成も消滅もさせない。** レッスン4 の proptest が、ランダムな \`(candidates, mark, deficit)\` triple 全体でこの不変条件を lock する。

これで cascade 数学が閉じる — 4 つの層、4 つの保存恒等式:

$$\\text{レッスン9 (per fund call):} \\quad \\text{amount} + \\text{unfilled} = \\text{shortfall}$$

$$\\text{レッスン10 (per position close):} \\quad \\text{fee\\_to\\_fund} + \\text{residual\\_to\\_account} = \\text{post\\_close\\_equity}$$

$$\\text{レッスン13 (per scan batch):} \\quad \\text{balance\\_before} + \\sum \\text{deposits} - \\sum \\text{withdrawals} = \\text{balance\\_after}$$

$$\\text{レッスン4 (per ADL pass):} \\quad \\text{deficit\\_absorbed} + \\text{deficit\\_remaining} = \\text{入力\\_deficit}$$

4 つの層、4 つの恒等式。本コース完走後、openhl-liquidation crate の数学は **あらゆる操作の下で閉じる**。

## 5 つのレッスン

### セクション0 — Orientation
- **L0** (本レッスン) — なぜ ADL、なぜ orderbook bypass、Liquidation参照実装（スキャナパート）→ ADL handoff、score preview、保存則 preview。

### セクション1 — ADL implementation
- **レッスン1** — \`AdlScore\` newtype + \`AdlRecord\` + \`AdlReport\` 型 + \`adl_score(snapshot, mark) -> Option<AdlScore>\` 関数。Flat / 損失 / collateral 0 ケースでの \`None\` を含む pure-compute scoring。5 個の score テスト。
- **レッスン2** — \`execute_adl(candidates, mark, deficit) -> AdlReport\` — orchestration: \`Option<AdlScore>\` で filter、\`AccountId\` tiebreaker で stable-sort 降順、haircut loop。50 行の本体をフェーズごとに walk + 5 個の simple unit test (zero / no-candidate / no-profitable / single-winner-full / single-winner-partial)。
- **レッスン3** — Nuanced な absorption テスト: score 順の multi-winner、drain-first-then-partial、\`AccountId\` 昇順の tiebreaker、「loser / flat に触れない」防御。6 個の unit test。
- **レッスン4** — 5 個の invariant proptest + Liquidation〜ADL四部作の振り返り。Per-pass から per-block への保存則、end-to-end で閉じた 4 層 cascade。

## 本コース後に何があるか

Liquidation〜ADLカスケード は完成する。openhl ロードマップは続く:

- **次の実装パート — Oracle** (\`6495ffd\`、openhl では shipped 済み): median-aggregating な index-price feed と signed observation verify。Rethlab の将来コース。
- **次の実装パート — Vault** (\`1e63e0b\`、shipped 済み): share-based な collateral pooling primitive。将来コース。
- **その次の実装群 — bin/openhl** (複数 SHA、shipped 済み): 実際に走る single-validator node。将来コース。

本コースの レッスン4 を完走後、あなたは publish 済みカリキュラムより 1 コース先行し、openhl の Liquidation〜ADLパート終端に到達する。そこから先は openhl が 参照実装 になる。

## License / SHA discipline

L0–レッスン4 は ADL参照実装パート の SHA \`d66b44a\` を引用する。Single-file の diff は \`crates/liquidation/src/adl.rs\` にある。Liquidation参照実装（スキャナパート） (\`0a8464e\`) と ADL参照実装パート (\`d66b44a\`) の間で他の crate ファイルは変わらない — ADL は pure additive なモジュールだ。
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
- **\`Option<AdlScore>\` で 4 つの「not a candidate」ケースを表現する。** Flat ポジション、loss を出しているポジション、equity ゼロのポジション、collateral ゼロのポジション — すべて「不適格」。Sentinel score (\`AdlScore(0)\` や \`AdlScore(-1)\`) を返して caller にチェックさせるのではなく、\`adl_score\` は \`None\` を返す。レッスン2 の orchestration はそれを受けて \`candidates.iter().filter_map(...)\` を書ける。不適格は filter-out として encode される。**\`Option\` は「この入力からはこの型の値が出ない」を type level で言う方法だ。**
- **Score は \`pnl_pct × leverage\`、\`MARGIN_SCALE\` で normalize して i64 に収める。** 両 factor は basis points (10000 = 100%)。積は bps² となり病的入力で i64 を overflow する。対策は 4 段: (a) i128 で計算、(b) saturate-multiply、(c) \`MARGIN_SCALE\` で割って bps に戻す renormalize、(d) 最後の i128 → i64 変換も saturating。Liquidation参照実装（計算パート） の \`notional_value\` / \`unrealized_pnl\`、Liquidation参照実装（保険基金パート） の \`liquidation_fee\` と同じ規律。
- **「同じ pnl_pct でより高い leverage → より高い score」axiom が Hyperliquid 慣例を lock するテスト。** レッスン1 の \`score_higher_for_higher_leverage_winner\` テストは、同一の \`pnl_pct\` を持ち leverage が異なる winner 2 人を構築し、score の ordering を assert する。将来の refactor で score formula を「lower-leverage winner を favor する」方向に flip すれば（一部の venue はそうしている）、この 1 つのテストが落ちる。**1 つのテストが慣例を固定する。Cascade の残りはそれに乗れる。**

確認:

\`\`\`bash
cargo test -p openhl-liquidation
\`\`\`

…で 74 テストが pass する（Liquidation コース由来の 69 + 新規 ADL score テスト 5）。レッスン4 までに合計 90 に到達する（レッスン1/レッスン2/レッスン3 で 5 + 6 + 5 unit test、レッスン4 で 5 proptest）。

具体的な変更:

- **\`src/adl.rs\`。** 新規モジュールファイル。Module-level doc、imports、\`AdlScore\` newtype、\`AdlRecord\` 構造体、\`AdlReport\` 構造体、\`adl_score()\` 関数、テストモジュール 5 個（4 個の None ケース + 1 個の ordering テスト）を追加。
- **\`src/lib.rs\`。** \`pub mod adl;\` と新規 4 名の public 名（\`AdlScore\`, \`AdlRecord\`, \`AdlReport\`, \`adl_score\`）を再 export。

レッスン1 で型語彙 + pure な scoring 関数を出荷する。レッスン2 が両方を consume する orchestration、\`execute_adl\` を実装する。

## おさらい

前のコース（\`building-openhl-liquidation\` の レッスン13）の後:
- \`crates/liquidation/src/\` に source ファイルが 4 つ: \`compute.rs\`, \`insurance.rs\`, \`scanner.rs\`, \`types.rs\` + \`lib.rs\`。
- 69 テスト pass（compute 34 + insurance 21 + scanner 14）。
- Scanner が \`ScanReport.unfilled_deficit: i64\` を生む — ADL の trigger だ。
- \`0a8464e\` 以降、\`crates/liquidation/src/\` の他ファイルは変更なし。

レッスン1 で ADL モジュールが始まる。Crate の ADL参照実装パート に対する diff は、新規ファイル 1 つ（\`adl.rs\`）と \`lib.rs\` の 4 行編集だけ。

## 計画

編集は 3 つ:

1. **\`crates/liquidation/src/adl.rs\` を新規作成。** Doc preamble（レッスン0の「ADL が orderbook を bypass する理由」framing を引用）、imports、\`AdlScore\` newtype、\`AdlRecord\` 構造体、\`AdlReport\` 構造体、\`adl_score\` 関数を含む。\`execute_adl\` はまだなし（レッスン2 で着地）。
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

\`crates/liquidation/src/adl.rs\` を新規作成する。Module doc preamble は レッスン0で扱った最も重要な概念的コンテンツ（「ADL が orderbook を bypass する理由」framing）を運ぶ — \`cargo doc\` 読者が最初に見る:

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

このプリアンブルで押さえる点が 5 つ:

1. **最初の 1 文が *trigger* と *response* を名指す。** "When \`ScanReport::unfilled_deficit > 0\`, the insurance fund couldn't absorb everything. ADL is the last-resort mechanism." 最初の 1 文だけ読んだ読者でも、ADL が cascade のどこに座るか分かる。**モジュール doc は実装詳細ではなく cascade position から始める。**
2. **\`Why ADL bypasses the orderbook\` セクションが** レッスン0の load-bearing 概念をモジュール doc 内で繰り返す。レッスン0を経ずにここに到達した読者は、feedback-loop の理由が必要だ。そうでないと「なぜ market order を submit しないのか」と疑問に思う。**モジュール doc はコースレベル orientation の本質的概念を duplicate する。読者が context を chase する必要はない。**
3. **Score formula が \`rust\` ではなく \`text\` code block 内にある。** Formula は Rust ではなく algebra だからだ。\`text\` という指定は「monospace、no syntax highlighting、math 記法」のレンダースタイルを signal する。**Math には \`text\`、コードには \`rust\`。\`cargo doc\` HTML での区別が効く。**
4. **\`Determinism\` セクションが 3 つの negative を名指す**: float arithmetic なし、\`HashMap\` iteration なし、clock read なし。**モジュールが *何をしないか* を documented にすることが、コンセンサス決定性が要求するものを signal する。** 将来 \`chrono::Utc::now()\` を呼ぼうとする contributor は、これを見て思いとどまる。
5. **\`close_order_spec\` を import している** — レッスン1 では使わないにもかかわらず（レッスン2 の \`execute_adl\` が使う）。レッスン11 の \`account_equity\` import と同じ staging 規律。**ファイルの完全なコードセットが使う import を入れる、現在のレッスンのコードが使うものではなく。** Unused-import 警告が レッスン1 で出て、レッスン2 で消える。

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

1. **\`pub struct AdlScore(pub i64)\`** — tuple struct、public inner。Inner の \`pub\` は caller が \`AdlScore(42)\` と \`score.0\` を直接書けることを意味する。Inner を private にして \`pub fn new(v: i64) -> Self\` と \`pub fn value(&self) -> i64\` を加えることも *できる*。だが レッスン1 の primary user は レッスン2 \`execute_adl\` とテストモジュール — どちらも直接アクセスを望む。**Public-inner な tuple struct は、consumer が in-crate でかつ型が純粋に「label」wrapper のときに正しい。**
2. **\`PartialOrd + Ord\` を derive する** — これこそが *newtype の存在理由*。\`i64\` 上の \`Ord\` は任意の caller が任意の i64 を別の i64 と order できる。\`AdlScore\` 上の \`Ord\` は score 同士を order するだけ。Liquidation参照実装（スキャナパート） の \`LiquidationRecord\` は *unrelated* な \`i64\` の struct だった。意味的に order できないので \`Ord\` を derive しなかった。ここでは、score を order することこそが目的の操作だ。**比較が型の目的のときだけ \`Ord\` を derive する、単に i64 形状だからではない。**
3. **\`Hash\` も derive している** — 将来 ADL 拡張が \`BTreeMap<AdlScore, _>\` や \`HashMap<AdlScore, _>\` を必要としたとき、両方とも動くようにするため。\`Hash\` の derive は安く、コストはゼロ。**Consumer が key として使うかもしれない value 型には \`Hash\` を defensively derive する。**
4. **\`Default\` を derive している** — \`AdlScore::default()\` は \`AdlScore(0)\` を返す。これは意味がある。ゼロは「何も勝っていない、何も負けていない」sentinel value だ。レッスン2 record の initialization はこの default に乗れる。**Newtype の \`Default\` は wrap された型の default に従う — ゼロが意味のある sentinel のとき。**
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

押さえる点が 5 つ:

1. **6 フィールド、すべて \`pub\`** — Liquidation参照実装（スキャナパート） の \`LiquidationRecord\` と同じ data-carrier パターン。Bridge が全フィールドを直接読む。Accessor は不要。**All-public な record 型は、consumer が in-crate または downstream auditor のときに正しい。Accessor は何の invariant も protect せずに friction だけを増やす。**
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
2. **\`Default\` derive は意味がある** — 空の \`Vec<AdlRecord>\`、ゼロの deficit_absorbed、ゼロの deficit_remaining。レッスン2 orchestration の「deficit 入力ゼロ」early-return が \`AdlReport::default()\` を使う。**Default-derived な report 型は、happy-path の early return を 1 行で書ける。**
3. **\`Clone + Debug + PartialEq + Eq + Default\` セット、ただし \`Copy\` は NOT。** \`ScanReport\` と同じ理由 — \`Vec\` は heap-allocated。**Vec-containing な report は \`Clone\`、Vec-free な report は \`Copy\`。**
4. **\`deficit_remaining > 0\` は chain-insolvent signal。** Doc がそう言う。レッスン4 retrospective でこれを「fourth layer」exit として名指す。**Edge value の operational meaning を型と並べて document する。**

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

1. **4 つの early-return guard、コスト昇順。** Flat チェック（比較 1 回）→ pnl（関数呼び出し、比較 1 回）→ collateral（read 1 回、比較 1 回）→ equity（関数呼び出し、比較 1 回）。安い predicate が最初、高いものが後。**レッスン12 scanner の exit-fast-on-rejection パターンが再登場する。**
2. **\`unrealized_pnl\` と \`account_equity\` は *別々に* 呼ばれる**、1 つの snapshot-derive helper に collapse されていない。それぞれ \`(snapshot, mark)\` を取って 1 つの \`i64\` を返す。別々に呼ぶことで、関数が algebra として top-to-bottom で読める。**読者が math を辿る必要があるとき、直列の関数呼び出しが one-shot bundle に勝つ。**
3. **\`pnl <= 0\` は losing AND at-entry ポジションの両方を reject する。** Entry で \`pnl == 0\` → winner ではない → ADL candidate ではない。Unified なチェックが両方をカバーする。**「non-positive」predicate が「winner」セマンティクスの正しい境界だ、「strictly negative」predicate ではない。**
4. **\`collateral <= 0\` と \`equity <= 0\` は *defensive*** — divide-by-zero（および divide-by-negative、score の符号を nonsensically flip する）から protect する。Liquidation参照実装（保険基金パート） の \`liquidation_fee\` にはこれらの guard がない — collateral や equity で割らないからだ。**Division は pre-check が要る。Multiplication は要らない。**
5. **全 arithmetic で i128 中間値を使う。** \`pnl × MARGIN_SCALE\` は大きな pnl で i64 を overflow しうる（\`MARGIN_SCALE = 10000\` なので）。Product が i128 になり、collateral での divide が i128 に保ち、次の multiplication が i128 に保ち、最後の renormalize が i128 に保ち、\`saturate_i128_to_i64\` で narrow するのは最後だけ。**i128 中間値は、overflow しうる multiplication の consensus-arithmetic イディオム。**
6. **i128 product にも \`saturating_mul\` — i128 が 128 bit あるにもかかわらず。** Belt-and-suspenders。「sane の境界」入力（例: 1000% pnl × 1000× leverage at $1B notional）では、product が i128 の range に近づく。各 multiplication step で 1 度 saturate するコストはゼロ。**全 multiplication を saturate する。コストはゼロで、bug class を 1 つまるごと消せる。**
7. **素の \`/\` division、\`saturating_div\` ではない。** 2 つの正の i128 値の integer division は overflow しえない（\`i128::MIN / -1\` だけが overflow できるが、ここの値はすべて正）。**Saturating 演算は overflow しうる arithmetic のためのもの。正-正な division はしえない。**
8. **最後の \`saturate_i128_to_i64\` こそが情報を失う *可能性* のある cast。** Raw i128 score が \`2^70\` なら、narrow するときに bit を失う。Saturating な変換が wrap ではなく \`i64::MAX\` に clamp する。**Width-narrowing な変換は consensus コードで明示的な saturation を要する。**

> 🛑 **やりがちな勘違い。** 「なぜ \`adl_score\` は Liquidation参照実装（保険基金パート） の \`liquidation_fee\` のように \`LiquidationParams\` を取らないのか?」 ADL に tunable knob がないからだ。Liquidation参照実装（保険基金パート） の \`liquidation_fee_bps\` は governance が変えられる network parameter。Score formula は固定の慣例（Hyperliquid の）。将来のプロトコルアップグレードが governance に score weight を tune させれば、その時 parameter が入る。**未使用の parameter を pre-add しない。型 signature は API surface、param 追加は breaking change だ。**

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

1. **テストモジュールが \`snapshot\` helper パターンを再利用する** — Liquidation コースの レッスン4/レッスン8/レッスン11 から — 同じシグネチャ \`(account, size, entry, collateral)\`、同じ返り型。1 度学んだ読者は crate を跨いで認識する。**Test helper は crate 全体で同じ見た目にする。**
2. **4 つの None テスト + 1 つの ordering テスト。** None テストが eligibility filter の各 branch を exercise する。Ordering テストが score の *唯一の* 意味のある性質（relative magnitude）を exercise する。一緒に \`adl_score\` の約束をカバーする。**\`Option<T>\` を返す pure 関数では、各 None branch + 1 つの happy-path 性質をテストする。**
3. **Ordering テストが \`assert!(sb > sa, "…")\` を使う、\`assert_eq!\` ではない。** 正確な score 値は fragile（固定小数点 rounding に sensitive）だが、relative ordering こそが load-bearing 性質だからだ。**Property-style な assertion（\`>\`, \`<\`, \`>=\`）は、ordering を意図とするテストで value-style な assertion（\`==\`）に勝つ。**
4. **Ordering テストのコメントが math を歩く。** 読者は \`pnl_pct_bps = 100 × 10_000 / 50 = 20_000\` を見て再導出できる。レッスン13 のテストコメントと同じ \`math-walk in comments\` 規律。**テスト内の math コメントが test を worked example に変える。**
5. **\`score_none_for_short_at_entry\` が最も subtle な None ケース。** Entry の short ポジションは \`pnl = 0\`（negative ではなく、entry にちょうど一致）。テストは \`pnl <= 0\` predicate が単に negative だけでなく 0 も正しく catch することを確認する。**Signed predicate の境界テストが missing-equals bug を catch する。**
6. **\`score_none_for_zero_collateral\` は mark 120（profitable!）で実行。** テスト setup は *意図的に* 誤解を招く — ポジションは勝っている。だが divide-by-zero 防御が catch する。**Defensive な guard は、それ以外なら成功する入力でテストする。**
7. **\`proptest::prelude::*;\` が import されている、ただし レッスン1 に proptest はない。** レッスン4（proptest レッスン）用に staged。**Forward-staged な import が レッスン4 を純粋に additive なレッスンに保つ。**

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

3 つ目、\`lib.rs\` 冒頭の roadmap コメントを ADL参照実装パート in-progress に更新（任意）。具体的な更新内容は今の \`lib.rs\` preamble 次第。答え合わせは ADL参照実装パート をこのコミットで in-progress、レッスン4 capstone で complete とマークする。

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

**74 テスト pass。** ADL モジュールが型語彙と scoring 関数とともに存在する。レッスン2 が \`execute_adl\`（orchestration verb）と 5 個の unit test を追加し、合計を 79 に持っていく。

エラー時にありがちなパターン:

- **\`cannot find function \\\`account_equity\\\` in this scope\`** — \`use crate::compute::{ ... }\` import から 6 つの名前のうち 1 つが欠けている。Import block を再確認: \`account_equity, close_order_spec, notional_value, saturate_i128_to_i64, unrealized_pnl\`。
- **\`type \\\`Option<AdlScore>\\\` does not implement \\\`PartialEq\\\`** — テスト失敗が derive を忘れたと言う。\`AdlScore\` に \`#[derive(PartialEq, Eq)]\` を追加する。\`Option<T>: PartialEq\` の blanket impl は \`T: PartialEq\` を必要とする。
- **\`score_higher_for_higher_leverage_winner\` が \`score_a >= score_b\` で失敗** — \`adl_score\` の division 順序が間違っている。Formula を読み直す: \`pnl_pct = pnl × MARGIN_SCALE / collateral\`（numerator が先、その後 divide）。\`pnl × (MARGIN_SCALE / collateral)\` と書くと、integer truncation が精度を殺し、一部の入力で relative ordering が flip する。
- **\`score_none_for_short_at_entry\` が失敗（\`None\` ではなく \`Some(...)\` を返す）** — \`pnl <= 0\` を \`pnl < 0\`（strict）で書いている。Strict version では 0 は profitable とみなされる。レッスン1 が指定するのは unified な \`<= 0\`。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **\`AdlScore\` が newtype なのは ordering を *enable する* ためかつ arithmetic を *forbid する* ため。** 素の \`i64\` だと、2 つの score を足す（semantic meaning なし）、引く（同様に meaning なし）、balance と比較する（real な bug class）を許してしまう。Newtype は domain がサポートする *正確な* 操作 — 比較、等価 — を encode し、それ以外は何も encode しない。**Newtype は subtractive: 操作を table から外す。**

2. **不適格には \`Option<AdlScore>\`、sentinel value ではない。** 「不適格」に \`AdlScore(0)\` を返すと、全 caller が値をチェックして「0 = 不適格」か「0 = 適格だが unlucky」を判断させられる。\`Option\` を使えば レッスン2 orchestration は \`filter_map\` を使って不適格ケースを一切見ない。**\`Option<T>\` は「不適格」の type-level encoding。Sentinel value は全 caller に predicate を re-implement させる。**

3. **4 つの eligibility predicate すべてが \`<=\` を使う、\`<\` ではない。** ゼロは *not* candidate state — flat ポジション、ゼロ PnL、ゼロ collateral、ゼロ equity すべて edge ケースで score を生むべきではない。Unified な \`<=\` 境界が追加の \`== 0\` チェックなしでゼロケースを catch する。**Signed value 上の境界 predicate は通常 \`<=\` / \`>=\` が欲しい。Strict-less-than 形はゼロを取り逃す。**

## 答え合わせ

\`\`\`bash
cd ~/code/openhl-reference
git checkout d66b44a
diff -u ~/code/my-openhl/crates/liquidation/src/adl.rs ./crates/liquidation/src/adl.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
\`\`\`

レッスン1 の後:
- **adl.rs** が ADL参照実装パート の \`adl.rs\` の **\`score_higher_for_higher_leverage_winner\` テストまで** 一致。\`execute_adl\` 関数と残りの 16 テスト + 5 proptest は レッスン2 / レッスン3 / レッスン4 で着地。
- **lib.rs** が ADL参照実装パート の \`lib.rs\` と **バイト単位で 一致** — \`pub mod adl;\` 行と \`pub use adl::{...}\` 再 export について。

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

できるが、コストは real だ。全 call site が closure を渡す必要があり、レッスン2 orchestration が generic parameter を全 signature に運ぶ。1 つの production score（\`pnl_pct × leverage\`）があるなら、concrete 関数のほうがクリーン。将来の governance 機能が validator に score weight を tune させるなら、そのとき parameterization が来る — *そしてそれは \`LiquidationParams\` 風 struct で、closure ではない*。**Closure は関数を parameterize する、struct はプロトコルを parameterize する。実際に configurable なものに合うほうを選ぶ。**

## 次のレッスン (レッスン2) — \`execute_adl\` — orchestration の心臓

レッスン2 が \`execute_adl(candidates, mark, deficit) -> AdlReport\` を実装する。5 テスト validated な \`adl_score\` を取り、candidate スライスに apply し、結果を sort し、deficit が absorb されるか candidate が exhaust されるまで haircut loop を走らせる関数だ。

フェーズ構造（5 フェーズ）: 非正 deficit で early-return → score と filter → tiebreaker 付き stable-sort → iterate して haircut → report を構築。さらに 5 個の simple unit test: zero deficit、negative deficit、no candidates、no profitable candidates、single winner full absorb。

レッスン2 の後、scanner が *ADL に対して runnable* になる — 79 テスト pass（レッスン1 から 74 + レッスン2 で 5 新規）。レッスン3 で 6 個の nuanced absorption テスト、レッスン4 で 5 個の invariant proptest と Liquidation〜ADL四部作の振り返り が追加される。
`,
                },
                {
                  title: "レッスン 2 — execute_adl — 5 フェーズのオーケストレーション中枢",
                  slug: "openhl-adl-execute-ja",
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 40,
                  xpReward: 70,
                  content: `# レッスン 2 — \`execute_adl\` — 5 フェーズのオーケストレーション中枢

## ゴール

このレッスンで掴む概念:

- **\`execute_adl\` は、scanner の \`unfilled_deficit > 0\` のとき bridge が呼ぶ関数だ。** Layer 1 (margin compute) はすでにアカウントを分類済み。Layer 2 (insurance fund) は吸収できる分を吸収済み。Scanner が \`ScanReport { unfilled_deficit > 0, .. }\` を返した時点で、カスケード（Cascade）は 3 つ目で最後の層に到達している。Bridge が \`execute_adl(remaining_accounts, mark, unfilled_deficit) -> AdlReport\` を呼ぶ — この 1 つの関数が Layer 3 の契約全体を担う。利益の出ている counter-position をランク付けし、順番に haircut し、「どれだけの deficit を吸収したか」「どれだけ残ったか」を 2 つのフィールドで bridge に正確に伝える report を返す。**セーフティネット・カスケードの 3 層、各層に 1 つの関数。**
- **この関数は単一ロジックの塊ではなく、5 フェーズのパイプラインだ。** Phase 1: 非正の deficit に対する早期リターン（防御的契約（Defensive contract））。Phase 2: \`adl_score\`（レッスン1 の関数）で各候補をスコア化し、ineligible (\`None\`) を filter out、PnL とともに collect。Phase 3: \`(score 降順、account_id 昇順)\` で stable-sort — tiebreaker が決定論性（Determinism）の鍵だ。Phase 4: ランク順に iterate し、\`haircut = min(remaining_deficit, pnl_gross)\` を適用してアカウントごとの record を蓄積。Phase 5: ループ最終状態から \`deficit_remaining\` を assign し、report を return。各フェーズに固有の正しさ義務がある。本レッスンは 1 つずつ歩く。**5 フェーズ、5 つの検証可能な不変条件。**
- **保存則（Conservation law） \`deficit_absorbed + deficit_remaining == input_deficit\` は本レッスンでセットアップし、レッスン4 で証明する。** Phase 4 の各 iteration で \`haircut + new_remaining == old_remaining\` が成立する。ループの終端状態は \`deficit_remaining = remaining\` かつ \`deficit_absorbed = sum_of_haircuts\`。構造上、この 2 つのフィールドの和は入力に等しい — コードから直接読み取れる保存則だ。レッスン4 の proptest \`conservation_absorbed_plus_remaining_equals_deficit\` がランダム入力に対してこれを検証する。レッスン2 ではループ自体から構造的議論を読む。**保存則は後で検証する付け足しではない。ループ本体が明白にする性質だ。**
- **すべての算術は saturating op を使い、Phase 4 をビザンチン障害耐性にする。** absorbed accumulator に \`haircut.saturating_add\`、ループ変数に \`remaining.saturating_sub\`、record ごとの payout に \`pnl_gross.saturating_sub(haircut)\`。実際には overflow しない（入力は i64 で、マグニチュードは i64::MAX に対して小さい）。それでも \`saturating_*\` はコードの契約を明示する。**「もし何かが wrap したら、panic より clamp を選ぶ」**。レッスン1 の debug_assert! 規律と対になる規律だ — test では debug_assert!、prod では saturating_*、目的はどちらも同じで、未定義動作を観測可能な失敗に変えること。**openhl-liquidation レッスン8 の InsuranceFund と同じ規律 — prod では saturating、test では debug_assert。**

確認:

\`\`\`bash
cargo test -p openhl-liquidation adl::tests::adl_
\`\`\`

…で本レッスンで追加する 5 つの新 unit test (\`adl_zero_deficit_is_noop\`、\`adl_negative_deficit_clamps_remaining_to_zero\`、\`adl_no_candidates_keeps_full_deficit\`、\`adl_no_profitable_keeps_full_deficit\`、\`adl_single_winner_fully_absorbs_small_deficit\`) が走る。本レッスン完走後、scanner は *ADL に対して runnable* になる — 79 テスト pass (レッスン1 から 74 + レッスン2 で新規 5)。レッスン3 で 6 つの nuanced absorption テストを execute_adl に対して追加。レッスン4 で 5 つの invariant proptest と Liquidation〜ADL四部作の振り返りを追加する。

具体的な変更:

- **\`crates/liquidation/src/adl.rs\`** — レッスン1 の type 定義と \`adl_score\` の下に \`execute_adl\` 関数 (~50 行) を append。既存の \`#[cfg(test)] mod tests\` ブロックに 5 つの unit test を append。

それだけ。Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5、そして 5 つの degenerate パスを exercise するテストだ。

## おさらい

レッスン1 の後はこうなっている:
- \`AdlScore(i64)\` — i64 ranking を wrap する newtype。sort 用に Ord derive、ゼロ用に Default derive、dedup 用に Hash derive。
- \`AdlRecord\` — アカウントごとの row: \`{account, close_order, pnl_gross, haircut, pnl_paid, score}\`。Telemetry-shaped。Bridge は *帳簿変更（Bookkeeping mutation）* として適用する。CLOB 注文としてではない。
- \`AdlReport\` — \`{records, deficit_absorbed, deficit_remaining}\`。Bridge は \`deficit_remaining\` を読み、chain が解決不能な状態に達したかを判定する。
- \`adl_score(snapshot, mark) -> Option<AdlScore>\` — ranking 関数。4 つの ineligibility ケース（flat position、non-profitable、zero collateral、zero/negative equity）には \`None\`、valid な winner には \`Some(score)\`。

レッスン2 はこれらのプリミティブを取り、オーケストレーションする。\`adl_score\` が Phase 2 の filter 述語、\`AdlReport\` が Phase 4 で埋めて Phase 5 で finalize する accumulator になる。

## 計画

1 つの関数、5 フェーズ、5 つのテスト。

1. **\`execute_adl\` を \`adl_score\` の下に append**。5 フェーズをコメントで pre-declare し、コードを書く前に構造を見せる。
2. **Phase 1**: \`deficit <= 0\` のとき早期リターン（Early-return）。空 \`records\`、\`deficit_absorbed = 0\`、\`deficit_remaining = deficit.max(0)\` (\`.max(0)\` が負の入力を clamp する)。
3. **Phase 2**: \`candidates.iter().filter_map(|s| { let score = adl_score(s, mark)?; let pnl = unrealized_pnl(s, mark); Some((*s, score, pnl)) }).collect::<Vec<_>>()\`。
4. **Phase 3**: \`ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)))\` — score 降順、account_id 昇順 tiebreaker。
5. **Phase 4**: \`for (snapshot, score, pnl_gross) in ranked { if remaining <= 0 break; let haircut = remaining.min(pnl_gross); ... records.push(...); deficit_absorbed = ... .saturating_add(haircut); remaining = remaining.saturating_sub(haircut); }\`。
6. **Phase 5**: \`report.deficit_remaining = remaining; report\`。

その後、\`tests\` モジュールの末尾に 5 つの unit test を append。

> 🛑 **予測。** 下のコードを読む前に: openhl-liquidation レッスン13 の \`scan\` も似た shape を持っていた — accumulator を空で初期化、候補ごとのループ、最終 assignment。\`scan\` と \`execute_adl\` の間の構造的な違いを 1 つ予想せよ。ヒントは、ADL は *quota*（deficit）を持ち、scanner は *quota なし*（すべてのアカウントを処理）だという点だ。

(答え: **\`execute_adl\` は \`remaining <= 0\` のときループに \`break\` を持つ。\`scan\` は持たない。** Scanner は入力のすべてのアカウントを処理する (quota なし — 清算が必要な分をすべて測定する役目だ)。ADL は *deficit が覆われるまで* アカウントを処理し、覆われたら停止する (quota 束縛)。\`break\` が quota 束縛ループの構造的サインだ。Performance にも効く。最初の winner が十分な PnL を持てば、ADL は 100 候補のうち 1 人だけ haircut すれば済む。\`break\` なしならループは 100 全部を歩く。**Quota 束縛ループは \`break\` を持つ。Quota フリーは持たない。**)

## \`execute_adl\` のソース全体

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

## ウォークスルー — 5 フェーズ

### Phase 1: 非正の deficit に対する防御的早期リターン

\`\`\`rust
if deficit <= 0 {
    return AdlReport {
        records: Vec::new(),
        deficit_absorbed: 0,
        deficit_remaining: deficit.max(0),
    };
}
\`\`\`

押さえる点が 3 つ。

1. **\`deficit <= 0\` がゼロと負の両方をカバーする。** Bridge は \`deficit > 0\` だけを渡すはずだ (\`unfilled_deficit > 0\` で gate している)。それでも防御的契約が上流のバグから守る。**モジュール境界での防御的ガードこそ、カスケードが失敗を隔離する仕組みだ。**
2. **\`deficit.max(0)\` が負のケースを clamp する。** 何らかの理由で \`deficit = -50\` が arrive したら、\`deficit_remaining\` は -50 ではなく 0 になる。負の remainder を下流に伝播させれば、bridge の \`if report.deficit_remaining > 0\` check で arithmetic 混乱を引き起こす。**境界で clamp するほうが、下流のコンシューマーを全部直すより安い。**
3. **\`Vec::new()\` を \`vec![]\` の代わりに使うのは意図的だ。** どちらも同じアロケーションフリーな空 vector にコンパイルされるが、\`Vec::new()\` が openhl-liquidation crate の他の場所で使われている convention だ (個人の好みより一貫性)。**機能的差異がないなら convention が好みに勝つ。**

### Phase 2: score + filter + collect

\`\`\`rust
let mut ranked: Vec<(AccountSnapshot, AdlScore, i64)> = candidates
    .iter()
    .filter_map(|s| {
        let score = adl_score(s, mark)?;
        let pnl = unrealized_pnl(s, mark);
        Some((*s, score, pnl))
    })
    .collect();
\`\`\`

押さえる点が 5 つ。

1. **\`filter_map\` がここでの正しい combinator だ。** \`adl_score(s, mark)\` は \`Option<AdlScore>\` を返す (レッスン1 の設計)。\`filter_map\` は \`Some\` ケースを残し \`None\` を drop する。\`filter\` + \`map\` を別々に使うと \`adl_score\` を 2 回評価する (filter 用に 1 回、map 用に 1 回)。\`filter_map\` は 1 パスで両方をやり、\`Some\` を unwrap する。**\`filter_map\` は「filter して unwrap、1 パスで」。\`T -> Option<U>\` の関数があるときはいつでも使う。**
2. **クロージャ内部の \`?\` 演算子がエレガントな部分だ。** \`adl_score(s, mark)?\` は \`adl_score\` が \`None\` を返した時点で**その要素を処理中のクロージャ本体だけ**を short-circuit し、\`filter_map\` へ \`None\` を返す。\`filter_map\` 自体はそれを「この要素は drop」として扱い、次の要素の反復へ進む。\`?\` なしだと explicit な \`match\` か \`let Some(score) = ... else { return None }\` が必要だ。**\`?\` はイテレータ全体を \`break\` しない。現在のクロージャから \`None\` を返して次要素へ進めるための短絡規則だ。**
3. **\`unrealized_pnl\` を filter pass の *後* で計算する。** 順序が重要だ。\`unrealized_pnl\` は cheap だが、expensive なら eligibility filter を pass したアカウントだけ計算したい。**先に filter、後で derive。捨てるかもしれない量は決して decide しない。**
4. **\`(snapshot, score, pnl)\` のタプルがループの 3 つのニーズをパックする。** Phase 3 はソート用に \`score\`、tiebreaker 用に \`account_id\` (\`snapshot\` 経由) が要る。Phase 4 は \`AdlRecord\` を build するために \`snapshot\`、\`score\`、\`pnl_gross\` が要る。3 つすべてを 1 つのタプルにパッケージすれば、Phase 4 で何も re-derive する必要がない。**タプルは pre-computed 値をループ間で再導出なしに carry する方法だ。**
5. **\`*s\` が \`&AccountSnapshot\` を \`AccountSnapshot\` (copy) に deref する。** \`AccountSnapshot\` は \`Copy\` (小さな flat struct) なので \`*s\` は cheap な memcpy だ。\`*s\` なしだとタプルは \`(&AccountSnapshot, ...)\` を持つ — 元の slice の drop を妨げる参照だ。**\`Copy\` 型は ownership を cheap に move させる。値が欲しいときに \`*s\` を使う。参照ではない。**

### Phase 3: tiebreaker 付きの stable sort

\`\`\`rust
ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)));
\`\`\`

押さえる点が 4 つ。

1. **\`b.1.cmp(&a.1)\` が順序を反転 — score *降順*。** 高 score が最初に force-close される (Hyperliquid convention: 最もラッキーな winner が最初に支払う)。\`a.cmp(&b)\` ではなく \`b.cmp(&a)\` と書くのが Rust で idiomatic な「降順」パターンだ。\`.reverse()\` を呼ぶ必要はない。**\`b.cmp(&a)\` が降順、\`a.cmp(&b)\` が昇順。パターンを暗記する。**
2. **\`.then_with(|| ...)\` は遅延評価（Lazy evaluation）。** 内部のクロージャは \`b.1.cmp(&a.1) == Ordering::Equal\` (score の tie) のときだけ走る。Score がユニークな common case では work を節約する。**\`.then\` は eager 評価、\`.then_with\` がクロージャ版。tiebreaker が non-trivial なら \`.then_with\` を選ぶ。**
3. **Tiebreaker は \`account_id ascending\` — \`a.0.account.0.cmp(&b.0.account.0)\`。** 昇順のため \`a\` が \`b\` の前に来る。「昇順」の選択は原理的には arbitrary だが、*deterministic* でなければならない。異なるバリデータ上の equally-lucky な winner 2 人が、誰が先に行くかについて agree する必要があるからだ。Ascending account_id が最もシンプルな deterministic な選択だ。**Tiebreaker はバリデータ間で order を reproducible にするために存在する。「fair」のためではない。fair は deterministic と偶然一致するだけだ。**
4. **\`sort_by\` は stable (equal-key 挿入順を保持する)。** これは 2 つの record が equal score *かつ* equal account_id を持つケースで効いてくる (account_id がユニークなら不可能だが、型 signature はユニーク性を強制しない)。Stable sort なら equal-equal ケースは Phase 2 の iteration order を保つ。実装上は最悪計算量 \`O(N log N)\` を保証する代わりに、ソート中に一時バッファ（概ね \`O(N)\`）を使う。一方 \`sort_unstable_by\` は in-place で追加メモリが小さい。**このコースの候補数（最大 15）では追加メモリコストは実質ゼロで、決定論性の利得が圧倒的に勝つ。**

### Phase 4: iterate と haircut

\`\`\`rust
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
\`\`\`

押さえる点が 6 つ。

1. **\`AdlReport::default()\` で空 records、0 absorbed、0 remaining が得られる。** Report struct に \`Default\` を derive している (レッスン1 の設計) おかげで、\`AdlReport { records: Vec::new(), deficit_absorbed: 0, deficit_remaining: 0 }\` を手書きする必要がない。**Accumulator 型には \`Default\` を derive する。常にゼロで初期化される。**
2. **\`if remaining <= 0 break;\` が quota guard だ。** 十分な deficit が absorb されたら、もう winner は haircut されない。これが quota 束縛ループの構造的サインだ。openhl の各 quota 束縛ループがこのパターンを持つ。**Quota 束縛ループは early break、quota フリーループはすべてを処理する。**
3. **\`haircut = remaining.min(pnl_gross)\` が absorption の formula だ。** Deficit が必要とするだけ PnL を取るか、winner が持っているだけ取るか、どちらか小さい方。これが Phase 4 を構造上 conservative にする。すべての haircut が \`remaining\` と \`pnl_gross\` の両方で bounded されているため、\`deficit_absorbed\` は入力 deficit やすべての PnL の合計を決して超えない。**\`min\` は 2 つの upper bound が同時に効くときの conservative な選択だ。**
4. **\`pnl_paid = pnl_gross.saturating_sub(haircut)\` が record ごとの decomposition。** Decomposition 則: \`pnl_paid + haircut == pnl_gross\` (レッスン4 の \`each_record_balances_pnl\` proptest で検証)。ここの \`saturating_sub\` は belt-and-suspenders だ。\`haircut <= pnl_gross\` が構造上保証されている (数行前の \`.min\` の適用から) ので、subtraction は実際には underflow しない。**正しさがすでに overflow なしを保証していても、defensive な習慣として saturating ops を使う。**
5. **\`deficit_absorbed.saturating_add(haircut)\` が累積する。** これが haircut の running sum で、Phase 5 までに total absorbed と等しくなる。\`saturating_add\` は同じ defensive な習慣だ。ここで overflow は不可能だが (haircut は deficit で bounded、deficit は i64)、\`+\` ではなく \`saturating_add\` と書くのは、関数内で唯一の \`+\` になってしまうからだ。**1 つの関数内での saturating ops の一貫性が、規律を読者に明白にする。**
6. **\`remaining.saturating_sub(haircut)\` がループ変数を decrement する。** Conservation invariant: 各 iteration 境界で \`(initial_deficit) == deficit_absorbed + remaining + sum_of_unprocessed_pnls_we_haven't_reached_yet\`。最後の iteration (または \`break\`) の後、3 番目の項はゼロになり、\`initial_deficit == deficit_absorbed + remaining\` だけが残る。**ループ本体が 2 つの accumulator を慎重に扱う副作用として、保存則の不変条件を保つ。**

### Phase 5: finalize と return

\`\`\`rust
report.deficit_remaining = remaining;
report
\`\`\`

押さえる点が 3 つ。

1. **\`deficit_remaining\` はループの *後* で set される。ループ内ではない。** ループ中、\`remaining\` はローカル mutable だ。ループが exit した時点で final 値を report に転送する。ループ内で set すれば冗長な work になる (毎 iteration で上書き)。後で set するのが正しい、1 回限りの assignment だ。**Accumulator はループ内、assignment はループ外。**
2. **\`report\` は名前で return される** (explicit な \`return\` キーワードなし、\`report\` の後にセミコロンなし)。Rust の expression-based return だ。関数本体の最後の expression が return 値になる。**Idiomatic な Rust: trailing expression として置く。\`return\` ではない。**
3. **関数は \`#[must_use]\`** (signature 上で宣言)。Caller (bridge) は \`AdlReport\` で何かをしなければならない。典型的には各 record を帳簿変更として apply し、\`deficit_remaining\` をゼロに対して check する。\`#[must_use]\` があれば、bridge が誤って report を drop したときコンパイラが警告する。**Report を返す関数に \`#[must_use]\` を付けるのが、「これを見なければならない」をコンパイル時契約にする方法だ。**

## 5 つの unit test

\`adl.rs\` の既存の \`#[cfg(test)] mod tests\` ブロックに append:

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

各テストが phase か境界条件に 1:1 で map する:

| テスト | exercise する Phase | 何を証明するか |
|---|---|---|
| \`adl_zero_deficit_is_noop\` | Phase 1 (early-return) | ゼロ入力 → 空 report、候補に触れない |
| \`adl_negative_deficit_clamps_remaining_to_zero\` | Phase 1 (negative clamp) | \`deficit.max(0)\` が負のリークを防ぐ |
| \`adl_no_candidates_keeps_full_deficit\` | Phase 2 (空入力) | 空候補 → \`filter_map\` が空 vec を生成 → ループはゼロ回 → \`remaining\` 変わらず |
| \`adl_no_profitable_keeps_full_deficit\` | Phase 2 (全 filter) | すべての候補が \`None\` を返す → ranked が空 → ループはゼロ回 → \`remaining\` 変わらず |
| \`adl_single_winner_fully_absorbs_small_deficit\` | Phase 4 (happy path) | 単一 iteration、haircut = min、decomposition 成立 |

走らせる:

\`\`\`bash
cargo test -p openhl-liquidation adl::tests::adl_
\`\`\`

期待: 5 つの新テストが pass。レッスン1 の 4 つの score-eligibility テスト + 1 つの score-ordering テストと合わせて、\`adl.rs\` 内には合計 10 テスト。残りの 4 つの nuanced-absorption テストは レッスン3 で、5 つの invariant proptest は レッスン4 で追加する。

## クロスリファレンス

この \`execute_adl\` オーケストレーションは **openhl-liquidation レッスン13 の \`scan\`** と構造的 shape を共有する。両者とも「各候補に対して何をするか decide し、結果を report に蓄積する」パイプラインだ。名指すべき違いは以下。

| | \`scan\` (openhl-liquidation レッスン13) | \`execute_adl\` (本レッスン レッスン2) |
|---|---|---|
| Trigger | 毎ブロック (常に走る) | 条件付き (\`unfilled_deficit > 0\` のときだけ) |
| Quota | なし (すべてのアカウントを処理) | \`deficit\` で bounded (early break) |
| Filter | Margin classification (\`MarginPhase\`) | \`adl_score\` 経由の eligibility |
| Sort | なし (挿入順) | \`(score desc, account_id asc)\` で |
| アカウントごとの仕事 | \`LiquidationRecord\` を build | haircut decomposition 付き \`AdlRecord\` を build |
| 「fully resolve できなかった」の出力フィールド | \`unfilled_deficit\` (ここで consume) | \`deficit_remaining\` (bridge で consume) |
| 保存則 | \`sum(closed_pnls) - sum(deposits) = ...\` (レッスン13 の per-scan) | \`deficit_absorbed + deficit_remaining == input_deficit\` (レッスン4 proptest) |

この 2 つの関数は構造的に sibling だ。同じ「各候補に対して decide、accumulate」パイプラインで、filter 述語、sort 規律、quota semantics だけが違う。**レッスン13 を 1 度読めば レッスン2 の構造がクリックする。レッスン2 を読めば レッスン13 の \`scan\` が「同じ shape、違う filter」として読める。**

## よくある質問

**Q1: なぜ unstable-sort (\`sort_unstable_by\`) ではなく stable-sort (\`sort_by\`) を使うのか?**

決定論性のためだ。\`sort_unstable_by\` は速く、追加メモリもほぼ使わないが、*equal 要素の order が unspecified* になる。単一バリデータプロセス内では fine。異なるマシン上のバリデータ間では、同じ入力でも、score が等しい場合にランタイム順が異なれば異なる \`AdlReport\` を生成し得る。\`sort_by\` は stable で、equal-scored record の相対順を保持する（加えてこの実装は最悪 \`O(N log N)\`・一時 \`O(N)\` メモリを使う）。**候補数 0..15 の設計ではこのメモリコストは無視できるので、コンセンサスコードでは決定論性を優先して \`sort_by\` を選ぶ。**

**Q2: 十分な候補を collect したら Phase 2 (\`filter_map\`) を short-circuit できる?**

できない。原理的には yes だが、\`collect::<Vec<_>>()\` はとにかく iterator 全体を consume する。そしてソート前 (Phase 3) には「十分」が分からない。低 score 候補が、入力順に評価したら高 score 候補より rank が高くなる可能性があるからだ。だから Phase 2 に short-circuit オプションはない。\`break\` を持つのは Phase 4 だけだ。**Short-circuit は quota を持つ phase に住む。Phase 2 は持たない。**

**Q3: haircut の蓄積で \`deficit_absorbed\` が i64 overflow したらどうなる?**

実際には起こらない。\`deficit_absorbed\` は入力 \`deficit\` で上から bound されている (すべての haircut が \`≤ remaining\`、\`remaining\` は \`deficit\` で開始)。\`deficit\` は i64 で、\`remaining.saturating_sub(haircut)\` は単調減少（Monotonic decreasing）。よって \`deficit_absorbed\` は \`i64::MAX\` で bounded だ。\`saturating_add\` は defensive な保険にすぎない。上流のバグが bound を violate したとき、saturation が \`i64::MAX\` で clamp する。panic ではなく。**まだ見つかっていない上流のバグに対する hedge としての saturating ops。**

**Q4: なぜ tiebreaker が \`account_id descending\` ではなく \`ascending\` か?**

純粋に convention だ。Ascending がほとんどの言語で default のソート方向。だから「ascending account_id」は「null」tiebreaker として読める — 強い理由がないときに reach するものだ。Hyperliquid のドキュメントは指定していない。OpenHL は ascending を選んだ。同じ入力でこのコードを走らせる 2 つのバリデータは agree する。契約はそれだけだ。**Tiebreaker 方向は arbitrary。存在と決定論性だけが重要だ。**

**Q5: Report 内の 2 つの record が equal な \`pnl_gross\` を持つことはありうるか?**

ありうる。2 つの winner が同一 PnL を持ちつつ score は異なるケースがある (例: 同じ PnL だが違う leverage)。Decomposition \`pnl_paid + haircut == pnl_gross\` は依然 per-record で成立し、すべての haircut の合計は依然 \`deficit_absorbed\` に等しい。Record の \`pnl_gross\` 値はユニークである必要はない。**Record は dedup されない。Account_id がユニークキーで、pnl_gross ではない。**

**Q6: Bridge は実際に各 \`AdlRecord\` で何を *する* のか?**

3 つの帳簿変更だ。各 record について、(a) \`pnl_paid\` (haircut 調整済み payout) でトレーダーの collateral を credit、(b) ポジションサイズをゼロに set (force-close)、(c) アクティブポジション集合からアカウントを remove。Record 上の \`close_order\` フィールドは CLOB に submit *されない*。telemetry と、\`LiquidationRecord\` との shape parity のために (bridge が両層に同じ record 処理コードを使えるように) 存在するだけだ。**ADL は帳簿変更であって、オーダーブック執行ではない。\`close_order\` はコメントであって、コマンドではない。**

## 次のレッスン (レッスン3) — 6 つの nuanced absorption テスト

レッスン3 は \`execute_adl\` が取り得る nuanced absorption パスを exercise する 6 つの unit test を追加する:
- \`adl_single_winner_partial_haircut_at_full_pnl\` — haircut == pnl_gross → pnl_paid = 0
- \`adl_single_winner_exhausted_with_remaining_deficit\` — pnl_gross < deficit、単一 haircut、remainder propagate
- \`adl_multiple_winners_in_score_order\` — 複数入力に対して rank order を証明
- \`adl_drains_first_winner_then_partially_second\` — quota が winner 1 を完全に exhaust、winner 2 で partial
- \`adl_tiebreaker_by_account_id_ascending\` — equal score が account_id で deterministic に resolve
- \`adl_does_not_touch_losers_or_flats\` — eligibility filter が mixed population でも honor される

レッスン3 の後、unit-test マトリクスは完成する (レッスン1+レッスン2+レッスン3 で 16 テスト)。レッスン4 で 5 つの proptest invariant と Liquidation〜ADL四部作の振り返りを追加し、コースを 5 レッスン / 4 モジュール / SHA pin \`d66b44a\` で閉じる。
`,
                },
                {
                  title: "レッスン 3 — 6 つの nuanced absorption テスト — マトリクスで execute_adl を証明する",
                  slug: "openhl-adl-absorption-tests-ja",
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 35,
                  xpReward: 60,
                  content: `# レッスン 3 — 6 つの nuanced absorption テスト — マトリクスで \`execute_adl\` を証明する

## ゴール

このレッスンで掴む概念:

- **レッスン3 は \`execute_adl\` の unit-test capstone だ — マトリクス（Matrix）を span する 6 つのテスト。** レッスン2 で 5 フェーズのパイプライン + 5 つの degenerate-path テスト（zero/negative deficit、no candidates、no profitable、single happy-path winner）を ship した。レッスン3 は *interesting* な中域を埋める。単一 winner が完全に haircut されるケース、複数 winner が deficit を share するケース、tie が break されるケース、loser と flat が winner と共存するケース。各テストは 2 軸マトリクス \`{single winner, multiple winners} × {full absorb, partial absorb, mixed eligibility}\` の 1 セルだ。レッスン3 完走後、\`execute_adl\` を読めば任意の入力に対してどのテストがカバーしているか分かる。**1 つの関数に 6 テストは過剰ではない。マトリクスのサイズだ。**
- **各テストは、コメントに math が書かれた hand-computed worked example だ。** openhl-liquidation レッスン13 の capstone テストと同じ \`math-walk in comments\` 規律。コメントが期待出力を step-by-step で導出し、デバッガが導出する必要をなくす。\`adl_multiple_winners_in_score_order\` が「B のスコアは 26,666 vs A の 10,000」と言うとき、その数字は \`(pnl_pct_bps × leverage_bps) / MARGIN_SCALE\` から計算され、読者のためにテストコメントに再現されている。レッスン4 の proptest が、ここで特定の入力に対して証明することを普遍化（Generalization）する。ここでの入力は math を明白にする *ために* 選ばれている。**Math-walk が各テストを 5 行の worked example に変える。Black-box assertion ではなく。**
- **6 つのテストは simple から compound へと進む。** Test 1-2 は Phase 4 の single-iteration regime 内に留まる（1 winner）。Test 3-4 は Phase 3 のソート + Phase 4 の multi-iteration ループを導入する。Test 5 は tiebreaker を isolate する（Phase 3 の \`then_with\`）。Test 6 は Phase 2 の \`filter_map\` が loser と flat を正しく drop することを証明する — *winner が同じ入力にいるときでも*。Eligibility filter は mixed population で動かねばならない。Pure ones だけでなく。**Arc: single winner → multi-winner → ソート規律 → tiebreaker → integration。**
- **テスト名は \`adl_<scenario>_<expected_outcome>\` の命名規約に従う。** \`adl_single_winner_partial_haircut_at_full_pnl\`、\`adl_drains_first_winner_then_partially_second\`、\`adl_tiebreaker_by_account_id_ascending\` — 各テスト名がそのテストが証明する仮説として読める。Production codebase はこの規律を使う。\`cargo test --list\`（または \`cargo test -- --quiet\`）が関数の挙動の *仕様* を生成するためであって、arbitrary な名前のリストを生成するためではない。**テスト名が文になるとき、テストはドキュメントになる。**

確認:

\`\`\`bash
cargo test -p openhl-liquidation adl::tests::adl_
\`\`\`

…で 16 テスト pass する: レッスン1 の 5 score-eligibility/ordering テスト + レッスン2 の 5 pipeline-degenerate テスト + レッスン3 の 6 nuanced-absorption テスト。Full な ADL テストマトリクスが *特定の* 入力に対してカバーされる。レッスン4 でこの specific cases をランダム入力へと普遍化する 5 つの proptest を追加する。

具体的な変更:

- **\`crates/liquidation/src/adl.rs\`** — 既存の \`#[cfg(test)] mod tests\` ブロックに 6 つのテストを append。Production コードの変更なし。レッスン2 の実装を richer な入力に対して証明する。

6 つのテスト、新規テストコード ~80 行。本レッスンは各テストを worked example として walk する。

## おさらい

レッスン2 の後はこうなっている:
- \`execute_adl(candidates, mark, deficit) -> AdlReport\` — 5 フェーズのパイプラインが ship 済み（defensive guard、score+filter、tiebreaker 付き stable-sort、保存則 accounting 付き haircut loop、finalize）。
- \`adl.rs\` 内に今までで 10 テスト: レッスン1 の 5（score eligibility 4 + score ordering 1）、レッスン2 の 5（degenerate path 4 + single-winner happy path 1）。
- 保存則 \`deficit_absorbed + deficit_remaining == input_deficit\` は loop body によって *構造的に* preserve されている。まだ *普遍的に* 証明されてはいない（それは レッスン4）。

レッスン3 は 5 フェーズのパイプラインを取り、load-bearing パスを exercise する: full-haircut decomposition、multi-winner ordering、tiebreaker 決定論性、mixed-eligibility filtering。同じ \`execute_adl\`、richer な入力。

## 計画

6 つのテスト、それぞれ レッスン2 のテストの下に \`#[cfg(test)] mod tests\` ブロックに append:

1. **\`adl_single_winner_partial_haircut_at_full_pnl\`** — Phase 4 edge case: haircut == pnl_gross → pnl_paid = 0
2. **\`adl_single_winner_exhausted_with_remaining_deficit\`** — Phase 4 edge case: pnl_gross < deficit → record absorbed、remainder propagate
3. **\`adl_multiple_winners_in_score_order\`** — Phase 3 ordering: A と B が同じ PnL でも、B のより高い leverage が B を rank 1 にする
4. **\`adl_drains_first_winner_then_partially_second\`** — Phase 4 quota exhaustion: rank 1 で full haircut、rank 2 で partial
5. **\`adl_tiebreaker_by_account_id_ascending\`** — Phase 3 \`then_with\`: identical score → ascending account_id が winner を選ぶ
6. **\`adl_does_not_touch_losers_or_flats\`** — Phase 2 \`filter_map\`: mixed population 内の ineligible アカウントが正しく skip される

> 🛑 **予測。** 下のテストを読む前に: \`execute_adl(candidates=[A_pnl_100, B_pnl_100], deficit=80)\` が走り、A が score 10,000 を、B が score 26,666 を持つとき、report は *ちょうど* \`[B with haircut 80]\` を持ち、A は untouched だ。なぜ A の record が report に zero-haircut として含まれず、record 自体が無いのか?

(答え: **Phase 4 の \`if remaining <= 0 break;\` が、A が処理される *前* に loop を exit するからだ。** B が 80 で haircut された後、\`remaining\` は 0 になる。Loop が break する。A は loop body に入らない。だから A に対する record は作られない。これが \`break\` の構造的 payoff だ（レッスン2 の predict callout を recall）。Quota 束縛 loop は *実際に* haircut を受けたアカウントに対する record のみを生成する。Zero-haircut padding ではない。Report の \`records.len()\` は意味あるカウントになる: 「この ADL pass でいくつのアカウントが force-close されたか」。**\`break\` が report の record count を意味あるものに保つ。**)

## 6 つのテスト

\`adl.rs\` の既存の \`#[cfg(test)] mod tests\` ブロックに append:

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

押さえる点が 3 つ。

1. **\`haircut == pnl_gross\` が、winner がすべてを支払う boundary case だ。** \`min(remaining=100, pnl_gross=100) = 100\`。Decomposition \`pnl_paid = pnl_gross - haircut = 0\` が成立するが、トレーダーは何も受け取らない。システムの最後の防衛線だった。**Winner の full PnL が ADL に食われる case。トレーダーにとっては倫理的に最悪の case、構造的にはただ \`min\` が仕事をしているだけ。**
2. **\`deficit_remaining = 0\`、winner を drain したにもかかわらず。** Deficit はちょうど covered だから、何も残らない。Test 2 と比較するとよい。そちらでは deficit が winner の PnL を *超え*、\`deficit_remaining > 0\` で chain は unresolved trouble に入る。
3. **\`report.records.len()\` への assertion なし。** レッスン2 のテストは record count を explicit に assert した。ここでは単に \`records[0]\` を index する。両 style とも valid。このテストは レッスン2-tested invariant「ちょうど 1 つの winner がちょうど 1 つの record を生む」を信頼する。**先行テストが既に証明したことを over-assert しない。**

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

押さえる点が 3 つ。

1. **\`min(250, 100) = 100\` — winner の PnL が haircut を cap する。Deficit ではない。** Phase 4 の \`haircut = remaining.min(pnl_gross)\` は「deficit が必要とするだけ取るか、winner が持っているだけ取るか、小さい方」と読める。ここでは winner が小さい。だから \`haircut = pnl_gross = 100\`。**2 つの upper bound の \`min\`。両方適用、小さい方が勝つ。**
2. **\`deficit_absorbed + deficit_remaining == 250\` — 保存則が成立する。** \`100 + 150 == 250\`。レッスン2 で setup し レッスン4 の proptest で普遍化する構造的保存則だ。レッスン3 の各テストが implicit に検証し、レッスン4 の proptest が *普遍的に* 検証する。**保存則は レッスン3 テストでは implicit、レッスン4 proptest では explicit。**
3. **\`deficit_remaining = 150\` が bridge へのシグナルだ: 「これを cover できなかった」。** Bridge が \`deficit_remaining > 0\` を読み、何をするか decide する（chain を halt、protocol loss として accept、alert を raise）。関数の仕事は reporting で終わる。Policy は bridge の責任だ。**\`execute_adl\` は deficit 状態を report する。Bridge が policy を decide する。**

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

押さえる点が 4 つ。

1. **A と B は同じ PnL (100)、違う collateral。** A は \`coll 100\` なので \`pnl_pct = 100×10000/100 = 10000\` bps、leverage = \`notional/equity = 200/200 = 10000\` bps → score 10,000。B は \`coll 50\` なので \`pnl_pct = 100×10000/50 = 20000\` bps、leverage = \`200/150 ≈ 13333\` bps → score \`20000 × 13333 / 10000 = 26666\`。**同じ PnL でも高 leverage = 高 score = 最初に haircut。**
2. **Score-math コメントがテストの spec だ。** コメント内の math なしだと、テストは magic-numbers assertion だ:「俺を信じろ、B は score 26666 を持つ」。Math ありだと、テストは人間が verify できる derivation として読める。**Math-walk コメントが assertion を proof に変える。**
3. **A の record が report に absent だ。** Phase 4 の \`break\` が B の haircut 後（remaining = 0）に fire する。A は loop body に入らない。\`records.len() == 1\` の assertion がこれを document する。A がそこにいないのは、A が必要なかったからだ。**Predict callout の payoff: record count が、実際に force-close されたアカウント数を教える。**
4. **Length assertion の \`"deficit smaller than B's pnl → only B"\` メッセージはドキュメントだ。** もしこのテストが失敗したら（例: refactor が Phase 3 のソート規律を壊す）、失敗メッセージがデバッガに *なぜ* これが重要かを教える。**Assertion メッセージはドキュメントだ。CI ログで午前 3 時に読むと思って書く。**

### Test 4: Deficit が rank 1 を drain し rank 2 を partial に cover する

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

押さえる点が 5 つ。

1. **Test 3 と同じ入力（A と B）、大きい deficit (150)。** これが *quota exhaustion* 挙動を isolate する。Test 3 は deficit = 80（B 単独より小さい）→ B 後に loop exit。Test 4 は deficit = 150（B 単独より大きい）→ loop が A に進む。**Test 3 と 4 のペアが deficit 軸を walk する: 1 winner 未満、1 winner 超。**
2. **B が完全に haircut（100）、それから A が residual（50）を得る。** Phase 4 iteration: rank #1 = B、\`haircut = min(150, 100) = 100\`、\`remaining = 50\`。Rank #2 = A、\`haircut = min(50, 100) = 50\`、\`remaining = 0\`。Loop が次 iteration の \`break\` で naturally exit する（rank #3 もないが）。**Quota が winner 1 を完全に exhaust し、それから winner 2 に partial に噛みつく。**
3. **\`records[0]\` が B、\`records[1]\` が A。Score 降順でソート済み。** レッスン2 の Phase 3 ソートが仕事をしている。テストが順序を explicit に assert する。Phase 3 の \`b.1.cmp(&a.1)\` が \`a.1.cmp(&b.1)\` に swap されたら、このテストが loudly 失敗する。**テスト内の順序 assertion は、将来の refactor からソート規律を守る方法だ。**
4. **\`deficit_absorbed = 150\` かつ \`deficit_remaining = 0\`。** 保存則: \`100 + 50 + 0 == 150\`。Deficit のすべての wei が accounted for だ。**動作中の保存則。テストが 2-iteration 入力で loop-body invariant を verify する。**
5. **A の \`pnl_paid = 50\` — A は PnL の半分を keep する。** これが math の背後にある人間ストーリーだ。高 leverage トレーダー（B）はすべてを失い、低 leverage トレーダー（A）は半分を失う。System が A を B より protect するのは、\`pnl_pct × leverage\` でランクすると less-leveraged winner に対して conservative だからだ。**Score 規律は arbitrary ではない。最も leveraged な winner に最初に burden を allocate する。**

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

押さえる点が 3 つ。

1. **2 つの snapshot は account_id だけが違う（7 vs 3）。** 同じ position size、同じ entry、同じ collateral → 同じ score、同じ PnL。Phase 3 の \`then_with\` が tie を break する唯一のものは \`account_id\` だ。**他のすべてを identical に揃え、tiebreaker だけを isolate する。**
2. **AccountId(3) が勝つ。AccountId(7) ではない、入力 vector で *second* に渡されたにもかかわらず。** Phase 3 の stable sort が AccountId(3) を最初に置く、なぜなら \`then_with(|| a.0.account.0.cmp(&b.0.account.0))\` が ascending だから。入力順は matter しない。ソート規律が matter する。**ソート規律が total なとき、入力順は irrelevant だ。**
3. **deficit = 50 がちょうど 1 winner の full PnL を cover する**（PnL = 100、mark 200 で each、collateral 50 → 実際 PnL = +100、deficit = 50 → haircut = 50、record 1 つ）。Single-record assertion が tiebreaker question を multi-iteration noise から isolate する。**テスト設計の選択: deficit をちょうど 1 record を produce するサイズに合わせ、assertion を purely 「*どの* winner が選ばれたか」だけにする。**

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

押さえる点が 3 つ。

1. **Acct 1 と acct 2 は両方とも適格性チェックを通過するが、acct 2 は touch されない — 別の理由で。** すべての候補は同じ mark（200）で evaluate される。Acct 1 (long 1 @ entry 100, mark 200) と acct 2 (long 1 @ entry 100, mark 200) は両方とも PnL = +100 で profitable だ。レッスン1 の \`adl_score\` は collateral の高さでは \`None\` を返さないので、両方とも Phase 2 を通過して \`ranked\` に入る。だが acct 2 は collateral が高い (1000 vs acct 1 の 50) → leverage が低い → score が低い → rank #2。\`deficit = 10\` は top-ranked の acct 1 への haircut だけで完全に exhaust される → Phase 4 の \`break\` で acct 2 は touch されないまま loop が終わる。**Acct 3 は Phase 2 で filter out された (eligibility)。Acct 2 は Phase 4 で touch されないまま loop が終わった (quota)。1 つのテストが 2 つの異なる防衛 layer を同時に証明する。** コメントの \`// loser?\` は当初の設計意図の名残 (surprise) を honest に残したものだ。
2. **Acct 3 は flat（position_size = 0）→ \`adl_score\` は \`None\` を返す（レッスン1 の first eligibility check）。** Phase 2 の \`filter_map\` が \`None\` を drop → acct 3 は \`ranked\` に入らない → record なし。**レッスン1 の eligibility テストは \`adl_score\` を isolation の入力で証明する。このテストは、filter が full pipeline と統合することを証明する。**
3. **\`deficit = 10\` は意図的なテスト設計の選択 — acct 1 の後で Phase 4 の \`break\` を trigger するのに十分小さい。** 大きい deficit なら loop が acct 2 に続き、このテストが証明したいことを obscure しただろう。Deficit のサイズ自体がテスト設計の一部だ — 「Phase 2 での filter + Phase 4 の early-break」の composition を exercise するように deficit を選んでいる。**テスト入力は単なるデータではない。Proof を visible にするように選ばれている。**

## テストの進展を俯瞰する

\`\`\`
   simple ────────────────────────────────────────────────────► compound

   Test 1 ─┐
           ├── single winner edge cases ────────────────── Phase 4 (boundary)
   Test 2 ─┘

   Test 3 ─┐
           ├── multi-winner ordering ──────── Phase 3 (sort) + Phase 4 (break)
   Test 4 ─┘

   Test 5 ───── tiebreaker isolation ──────── Phase 3 (then_with、決定論性)

   Test 6 ───── mixed-population integration ──── Phase 2 + Phase 4 composition
                                                          ↓
                                              2 つの防衛 layer の capstone
\`\`\`

## Test-to-behavior マッピング

| Test | Exercise する pipeline phase | 証明する behavior |
|---|---|---|
| 1. \`adl_single_winner_partial_haircut_at_full_pnl\` | Phase 4 (boundary) | \`haircut == pnl_gross\` → pnl_paid = 0; boundary で decomposition 成立 |
| 2. \`adl_single_winner_exhausted_with_remaining_deficit\` | Phase 4 (insufficient capacity) | \`pnl_gross < deficit\` → record absorbed、remainder が bridge に propagate |
| 3. \`adl_multiple_winners_in_score_order\` | Phase 3 (sort) + Phase 4 (\`break\`) | 高 leverage が rank 1; deficit が rank 1 に収まれば低 rank winner untouched |
| 4. \`adl_drains_first_winner_then_partially_second\` | Phase 3 (sort) + Phase 4 (quota exhaustion) | Multi-iteration absorption; quota が rank 間で distribute |
| 5. \`adl_tiebreaker_by_account_id_ascending\` | Phase 3 (\`then_with\`) | Score tie 下の決定論性 — バリデータ間で同じ入力が同じ出力を produce |
| 6. \`adl_does_not_touch_losers_or_flats\` | Phase 2 (\`filter_map\`) + integration | Eligibility filter が mixed population で full pipeline と統合 |

6 つのテストが集合的に、レッスン2 のパイプラインが load-bearing な入力ケースで正しいことを証明する。レッスン4 の 5 つの proptest がこれを普遍化する: 同じ保存則、同じ decomposition、同じ決定論性を、ランダム入力に対して。

## 走らせる

\`\`\`bash
cargo test -p openhl-liquidation adl::tests::adl_
\`\`\`

期待: 16 テスト pass（レッスン1 の 5 + レッスン2 の 5 + レッスン3 の 6）。Full な ADL unit-test マトリクスがカバーされる。

## よくある質問

**Q1: 1 つの関数に 6 テスト — 多すぎないか?**

多くない。これだけの surface area を持つ関数には。\`execute_adl\` は 5 phase × 複数の入力次元（deficit size、candidate count、score distribution、eligibility mix）を持つ。マトリクスは 6 よりずっと大きい。レッスン1+レッスン2+レッスン3 を合わせて 16 テスト、「最小カバレッジ」に近く「過剰」ではない。レッスン4 の proptest が specific case の証明することを *generalize* する。Hand-picked 入力でまず verify していないものは generalize できない。**Specific test が関数の shape を証明する。Proptest が関数の universality を証明する。両 layer とも必要だ。**

**Q2: なぜ単に assert するのではなく、期待値を hand-compute してコメントに書くのか?**

理由は 2 つだ。第一に、コメントは future reader が production code に対して verify できる *spec* だ。もし \`adl_score\` が score の計算方法を変えたら、コメントの数字が間違って、テストが silently ではなく loudly 失敗する。第二に、math walk がテストをデバッガフレンドリーな worked example に変える。Failure が起きたとき、コメントがデバッガが最初に読むものだ。Math walk なしだと、failure メッセージは単に「expected 26666, got X」で、デバッガが 26666 を手で再導出しなければならない。**コメント内 math がテストドキュメンテーションの最も安い形だ。**

**Q3: 7 つ目の unit test を追加すべきか、6 つ目の proptest を追加すべきかは?**

判断基準は明快だ。Unit test を追加するのは、現在のテストがカバーしていない挙動を exercise する *specific* な入力があるとき（例: 「deficit = i64::MAX はどうなる?」）。Proptest を追加するのは、現在のテストが express できない *universal* な property があるとき（例: 「すべての valid 入力に対して、保存則が成立する」）。Unit test は concrete example、proptest は universal claim だ。ADL コースは 16 unit test + 5 proptest を使う。その ratio は well-tested consensus code にとって typical だ。**Concrete behavior には unit test、universal property には proptest。**

**Q4: これらのテストを parameterize できるか（例: \`#[rstest]\` で複数入力）?**

できるが、しない。openhl-liquidation crate は \`rstest\` を使っておらず、per-test math-walk コメントが parameterize された row 間で維持しにくくなる。6 つの explicit test の duplication コストはここでは parameterization の認知コストより低い。**Parameterization はテスト本体が同じで入力だけが変わるときの正しい tool だ。ここでは各テストに独自の setup ストーリーがある。**

**Q5: Test 6 のコメントが「loser?」と疑問符付きで書かれている — テストが間違っているのか?**

テストは正しい。コメントが honestly flagged されているだけだ。Acct 2 は mark = 200 で実際は loser *ではない*（PnL = +100、acct 1 と同じ）。Acct 2 入力は earlier draft で loser として意図されていたが、コメントが完全に update されなかった。Test 6 #1 で詳述したとおり、テストは依然 claim していること（acct 3 が Phase 2 で filter、acct 2 が Phase 4 で untouched）を証明するが、inline \`// loser?\` コメントが drafting 履歴を betray する。**Honest な about-the-test コメントは有用だ。「このテストは育った。粗い縁がここにある」を signal する。Airbrush し out しない。**

## 次のレッスン (レッスン4) — Capstone — 5 invariant proptest + Liquidation〜ADL四部作の振り返り

レッスン4 が ADL コース（および Liquidation〜ADL四部作）を、5 つの invariant proptest をランダム入力に対して走らせることで閉じる:

1. \`conservation_absorbed_plus_remaining_equals_deficit\` — レッスン3 Test 2 & 4 を普遍化
2. \`each_record_balances_pnl\` — レッスン3 Test 1, 2 & 4 を普遍化 (decomposition law)
3. \`total_haircut_equals_deficit_absorbed\` — per-record/aggregate accounting consistency を普遍化
4. \`execute_adl_is_deterministic\` — レッスン3 Test 5 の tiebreaker 規律を「同じ入力 → 同じ出力、常に」として普遍化
5. \`records_in_rank_order\` — レッスン3 Test 3 & 4 の ordering 規律を普遍化

加えて Liquidation〜ADL のレトロスペクティブ: Liquidation参照実装（計算パート）（margin classification） + 保険基金パート + スキャナパート + ADLパートが Layer 1 → Layer 2 → Layer 3 のセーフティネット・カスケードに compose する仕組み。4 stage、4 layer の bookkeeping、1 つの バイト単位で-reproducible なシステム。

レッスン4 後、ADL コースは complete: 5 レッスン 2 モジュール、16 unit test + 5 proptest、openhl ADL参照実装パート \`d66b44a\` に対して バイト単位で。DIY Perp シリーズが第 6 弾を閉じる。
`,
                },
                {
                  title: "レッスン 4 — Capstone — 5 つの invariant proptest + Liquidation〜ADL四部作の振り返り",
                  slug: "openhl-adl-capstone-ja",
                  type: 'CONTENT',
                  sortOrder: 3,
                  duration: 45,
                  xpReward: 90,
                  content: `# レッスン 4 — Capstone — 5 つの invariant proptest + Liquidation〜ADL四部作の振り返り

## ゴール

このレッスンで掴む概念:

- **レッスン4 は 2 つを同時に閉じる。ADL コースと Liquidation〜ADL四部作だ。** Liquidation参照実装（計算パート）（margin classification、pure compute） + 保険基金パート（stateful absorption） + スキャナパート（orchestration） + ADLパート（off-orderbook fallback）が full なセーフティネット・カスケード（Safety-net cascade）を構成する。レッスン4 後、ストレス下の任意のアカウント状態遷移を指差して、(a) どの layer が扱ったか、(b) どの保存則が preserve したか、(c) どの proptest が普遍的に証明するか、を名指せるようになる。**4 つの stage、4 つの layer、1 つの規律。**
- **5 つの invariant proptest が、レッスン2+レッスン3 が特定入力で証明したことを普遍化する。** レッスン2 の 5 degenerate-path テストと レッスン3 の 6 nuanced-absorption テストは、hand-picked 入力で \`execute_adl\` を証明した。レッスン4 の 5 proptest は同じ properties を *ランダム* 入力で証明する。(1) \`conservation_absorbed_plus_remaining_equals_deficit\` — load-bearing な保存則。(2) \`each_record_balances_pnl\` — per-record decomposition。(3) \`total_haircut_equals_deficit_absorbed\` — per-record と aggregate accounting の consistency。(4) \`execute_adl_is_deterministic\` — 同じ入力 → 同じ出力、常に。(5) \`records_in_rank_order\` — 任意の入力に対してソート規律が成立する。**Specific tests が関数の shape を証明する。Proptest が関数の普遍性を証明する。**
- **Proptest の input strategy が「何が valid 入力か」の spec だ。** \`collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15)\` は「0 から 15 の候補アカウント、各 collateral は 1 から 1,000,000」と言う。\`mark in 1_u64..1_000\` は「mark 価格は 1 から 1000 の範囲」。\`deficit in 0_i64..1_000_000\` は「deficit は 0 から 1M」。これらの range が *意味ある operating regime* を定義する。それ以外で proptest が入力を生成することはない（overflow/underflow edge case は レッスン2 で導入した saturating ops が扱う。proptest の責任ではない）。**Input strategy は単なる「任意の入力」ではない。「operating regime 内の任意の入力」だ。**
- **レッスン4 は レッスン5 型の \`prop_assume!\` 事後リジェクトより、Strategy 側の事前絞り込みを優先する。** このレッスンの 5 つの property は「分岐に十分な密度で当てる」ことが目的なので、生成器レンジを最初から適切に寄せるほうが reject を減らし、\`TooManyAssumptions\` リスクを構造的に避けられる。**数理前提を明示したいときは \`prop_assume!\`、発火密度を作りたいときは Strategy 設計で先に寄せる。**
- **Liquidation〜ADLの振り返りはコース全体を跨ぐ thesis statement だ。** 4 つの stage が単一の per-block orchestration に compose する。scanner が classify し、insurance fund が absorb し、ADL が fallback し、各層の failure mode が *機械的に証明された構造的 invariant で bound されている*。これが rethlab thesis を 1 つの production cascade に適用したものだ。規律は layer 境界を超えて転写される。保存則が layer 境界を気にしないからだ。**保存則は付け加えるプロパティではない。Layer 1 から Layer 3 まで preserve する規律だ。**

確認:

\`\`\`bash
cargo test -p openhl-liquidation adl::tests
\`\`\`

…で **21 テスト pass** する（レッスン1: 5 score-eligibility/ordering + レッスン2: 5 degenerate + レッスン3: 6 nuanced + レッスン4: 5 proptest）。Full な ADL surface（score eligibility、pipeline correctness、保存則、decomposition、決定論性、ordering）が specific 入力と random 入力の両方に対して証明される。

具体的な変更:

- **\`crates/liquidation/src/adl.rs\`** — \`#[cfg(test)] mod tests\` モジュールの末尾に、5 つの invariant を含む \`proptest! { ... }\` ブロックを append。

5 つの proptest、新規テストコード ~60 行。加えて Liquidation〜ADL四部作レトロスペクティブが cascade アーキテクチャを walk する。コードなし、コースを閉じる architectural framing だけだ。

## おさらい

レッスン3 の後はこうなっている。
- \`execute_adl(candidates, mark, deficit) -> AdlReport\` は ship 済み（レッスン2）、16 specific 入力に対して tested（レッスン1 の 5 + レッスン2 の 5 + レッスン3 の 6 = 16 unit test）。
- 5 フェーズのパイプライン（early-return + filter_map + sort_by + haircut loop + finalize）は hand-picked 入力すべてに対して構造的に正しい。
- 保存則 \`deficit_absorbed + deficit_remaining == input_deficit\` は レッスン3 各テストで *implicit* に検証されている（per-input）。だがまだ *普遍的* ではない（for-all-inputs ではない）。

レッスン4 は同じ \`execute_adl\` を取り、同じプロパティを普遍的に証明する。同じ関数、同じ定理、無限に多くの入力。

## 計画

2 つの artifact がある。

1. **5 proptest** を \`adl.rs\` の \`#[cfg(test)] mod tests\` ブロックに、\`proptest! { ... }\` macro invocation 内へ append。各 proptest が \`(collaterals, mark, deficit)\` の input strategy を取り、5 つの invariant のうち 1 つを証明する。

2. **Liquidation〜ADL四部作レトロスペクティブ** — コードなし。Liquidation 3パート（計算・保険基金・スキャナ）  + ADLパート が safety-net cascade に compose する architectural walkthrough。各 stage の保存則を名指す。

> 🛑 **予測。** 下の proptest を読む前に: openhl-liquidation レッスン13 の capstone は 4 proptest を持っていた。レッスン4 はここでは 5 つだ。レッスン13 が必要としなかった追加の proptest は何か? ヒント: ADL は *return value*（report）を持ち、レッスン13 の scanner も似た return value を持つ。

(答え: **\`records_in_rank_order\`**。ADL の *ソート規律* を普遍化する。レッスン13 の scanner はその record をソートしない（挿入順で処理する）。ADL の record は \`(score 降順、account_id 昇順)\` の順でなければならない。この proptest が任意の入力に対してそれを証明する。他の 4 proptest（保存則、decomposition、accounting consistency、決定論性）は レッスン13 に直接 analogue がある。5 番目だけが、ADL が scanner より強い ordering 契約を持つから存在する。**出力に構造が多いほど、preserve するための invariant も多くなる。**)

## 5 つの proptest

レッスン3 unit test の後、同じ \`#[cfg(test)] mod tests\` ブロック内に append する。

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

## ウォークスルー — 各 proptest が何を普遍化するか

### Proptest 1: Conservation

\`\`\`rust
prop_assert_eq!(report.deficit_absorbed + report.deficit_remaining, deficit);
\`\`\`

押さえる点が 3 つ。

1. **これが レッスン2 の Phase 5 + Phase 4 loop body から来る load-bearing な保存則だ。** 各 iteration の \`haircut + new_remaining == old_remaining\` が蓄積し、最終的に \`deficit_absorbed + deficit_remaining == initial_deficit\` になる。Proptest がこれを、operating regime 内の *任意の* \`(collaterals, mark, deficit)\` タプルに対して verify する。
2. **\`deficit in 0_i64..1_000_000\` がゼロを含む。** これが Phase 1 の \`deficit <= 0\` 早期リターンを catch する。\`deficit = 0\` なら \`deficit_absorbed = 0\`、\`deficit_remaining = 0\` が produce され、\`0 + 0 == 0\` が成立する。**入力 range は boundary を含む。保存則は boundary で成立する。**
3. **レッスン3 Test 2（\`single_winner_exhausted_with_remaining_deficit\`）と Test 4（\`drains_first_winner_then_partially_second\`）** はそれぞれ 1 つの特定入力で保存則を verify した。この proptest はデフォルト 256 ランダム入力で verify する（CI では 100,000+ に設定可能）。**2 つの unit test が 2 入力で assert することを、1 proptest が 256 入力で assert する。**

### Proptest 2: Per-record decomposition

\`\`\`rust
for rec in &report.records {
    prop_assert!(rec.haircut >= 0);
    prop_assert!(rec.haircut <= rec.pnl_gross);
    prop_assert!(rec.pnl_paid >= 0);
    prop_assert_eq!(rec.pnl_paid, rec.pnl_gross - rec.haircut);
}
\`\`\`

押さえる点が 3 つ。

1. **Record ごとに 4 つの sub-assertion がある。** non-negative haircut、pnl_gross で bounded された haircut、non-negative pnl_paid、decomposition equation。各々が別の \`prop_assert!\` だ。Failure が起きたとき、どの sub-property が壊れたかを正確に教える。**Granular な assertion が proptest failure を debuggable にする。**
2. **\`for rec in &report.records\` が *実際に* produce された record を iterate する。** Report に 0 record（degenerate 入力ケース）なら、loop は no-op、proptest は vacuously に pass する。**No record の proptest は vacuous proof だ。それで fine。interesting case ではないからだ。**
3. **レッスン3 Test 1, 2, 4 がそれぞれ特定入力で 1 record の decomposition を verify した。この proptest がランダム入力ですべての record を verify する。** Phase 4 の \`pnl_gross.saturating_sub(haircut)\` から来る算術 identity \`pnl_paid = pnl_gross - haircut\` が、ここで普遍的になる。**Saturating subtraction はここでは matter しない。\`haircut <= pnl_gross\` が Phase 4 の \`.min\` で enforce されているから、subtraction で underflow が発生することは構造上あり得ない。**

### Proptest 3: Aggregate accounting consistency

\`\`\`rust
let total: i64 = report.records.iter().map(|r| r.haircut).sum();
prop_assert_eq!(total, report.deficit_absorbed);
\`\`\`

押さえる点が 3 つ。

1. **これが per-record と aggregate accounting 間の cross-check を証明する。** Phase 4 が \`deficit_absorbed = deficit_absorbed.saturating_add(haircut)\` を \`records.push(... haircut ...)\` と lockstep で accumulate する。だからすべての \`record.haircut\` の sum は *必ず* \`deficit_absorbed\` と等しい。Accumulator が record から drift したら（例えば refactor が haircut を追加したが record を push し忘れた場合）、この proptest が catch する。
2. **\`total: i64 = ... .sum()\` が原理的には overflow し得る。** 実際にはそうならない。各 \`haircut <= deficit\` で \`deficit <= 1_000_000\`（入力 range）、最大 15 候補。total ≤ 15,000,000 で i64 bound 内に十分収まる。**Input strategy の upper bound が implicit に sum の upper bound を bound する。**
3. **この invariant は inspection で verify するのが最も hard で、proptest で verify するのが最も easy だ。** \`execute_adl\` を読む reader は records-vs-accumulator drift が不可能だと convince *できる*。だが proptest は速く、より certain だ。**Inspection で verify 可能な invariant がある。Proptest で verify 可能な invariant がある。正しいツールを使う。**

### Proptest 4: Determinism

\`\`\`rust
let r1 = execute_adl(&candidates, MarkPrice(mark), deficit);
let r2 = execute_adl(&candidates, MarkPrice(mark), deficit);
prop_assert_eq!(r1, r2);
\`\`\`

押さえる点が 3 つ。

1. **同じ関数、同じ入力、2 回。full report の equality を assert する。** これが *任意の* 隠れた non-determinism を catch する。順序をランダム化する \`HashMap\` iteration、異なる値を返す clock read、tie を異なる方法で break する \`sort_unstable_by\` — どれも。これらは \`execute_adl\` には存在しない。だが将来の refactor が誤って導入したら、この proptest が catch する。
2. **\`AdlReport\` は \`PartialEq\` を derive している（レッスン1 の設計経由）。** それが \`prop_assert_eq!(r1, r2)\` を動作させる。equality がすべての field（records、deficit_absorbed、deficit_remaining）を byte-identical match で比較する。**Report 型すべてに \`PartialEq\` derive を付けるのは consensus code で non-optional。なしでは決定論性 proptest が存在し得ない。**
3. **\`0..10\` candidate count（他の proptest の \`0..15\` より小さい）が高速さを保つ。** 決定論性のテストはより expensive だ（各 iteration が \`execute_adl\` を 2 回呼ぶ）。小さい input range はパフォーマンスの trade-off だ。Property は任意のサイズで成立するから、range を小さくしても proof は弱まらない。**Performance budget が proptest の input-range 選択を shape する。**

### Proptest 5: Rank order

\`\`\`rust
for w in report.records.windows(2) {
    let (a, b) = (&w[0], &w[1]);
    let ok = a.score > b.score
        || (a.score == b.score && a.account.0 < b.account.0);
    prop_assert!(ok, "rank order broken between {:?} and {:?}", a, b);
}
\`\`\`

押さえる点が 4 つ。

1. **\`.windows(2)\` が adjacent record をペアにする。** 各 adjacent pair（rank N と rank N+1）に対して、test がソート規律を verify する。厳密降順 score、または equal score with 厳密昇順 account_id。**\`.windows(2)\` が Rust で pairwise invariant を verify する idiomatic な方法だ。**
2. **\`||\`（or）が Phase 3 の \`b.cmp(&a).then_with(|| a.cmp(&b))\` の exact 逆だ。** Phase 3 が score-desc-then-id-asc が成立するようにソートする。この proptest が exact にその ordering を出力で assert する。Phase 3 のソートが silently に壊れたら（例えば refactor が comparator を swap した場合）、この proptest が catch する。
3. **\`deficit in 1_000_000_i64..10_000_000\` が他の proptest よりずっと大きい。なぜか。** 小さい deficit は少ない record を produce する（しばしば 1 つだけ）。「rank order」を単一 record で satisfy するのは trivial だ。出力に *多くの* record があってこそ ordering 規律が exercise される。**Input range が property を non-vacuously testable にするよう calibrate されている。**
4. **Failure message \`"rank order broken between {:?} and {:?}"\` が両 record を format する。** Proptest が失敗すると、message が CI ログに入る。実際の record を含めることで debugger に即座の context を与える。**Failure message は壊れたときに走るドキュメントだ。**

## すべてを走らせる

\`\`\`bash
cargo test -p openhl-liquidation adl::tests
\`\`\`

期待される出力。

\`\`\`
test adl::tests::adl_does_not_touch_losers_or_flats ... ok
test adl::tests::adl_drains_first_winner_then_partially_second ... ok
test adl::tests::adl_multiple_winners_in_score_order ... ok
...
test adl::tests::adl_tiebreaker_by_account_id_ascending ... ok
test adl::tests::conservation_absorbed_plus_remaining_equals_deficit ... ok
test adl::tests::each_record_balances_pnl ... ok
test adl::tests::execute_adl_is_deterministic ... ok
test adl::tests::records_in_rank_order ... ok
test adl::tests::total_haircut_equals_deficit_absorbed ... ok

test result: ok. 21 passed; 0 failed
\`\`\`

**21 テスト、16 specific 入力 + 5 universal property、すべて緑。** ADL 実装は機械的に verify されている。

Heavy な proof には proptest の \`PROPTEST_CASES\` env var を bump する。

\`\`\`bash
PROPTEST_CASES=10000 cargo test -p openhl-liquidation adl::tests
\`\`\`

これが各 proptest をデフォルト 256 ではなく 10,000 回走らせる。モダンハードウェアで ~10-30 秒。Production CI は nightly で \`PROPTEST_CASES=100000\` を走らせ、full proof-of-the-day にする。

## Liquidation〜ADL四部作レトロスペクティブ — セーフティネット・カスケード

4 つの stage が単一の per-block orchestration に compose する。各 layer は独自の保存則を持ち、failure は bounded かつ observable な方法で下流の layer へ cascade する。

### カスケードを俯瞰する — capacity が layer ごとに drop する

\`\`\`
   ┌─────────────────────────────────────────────────────────────┐
   │  Detectors  (Layer 1 + 1.5)                                 │
   │    margin classify + scanner orchestration                  │
   │    → produces ScanReport { unfilled_deficit: D }            │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼ D > 0 なら
   ┌─────────────────────────────────────────────────────────────┐
   │  Buffer     (Layer 2, capacity = fund balance)              │
   │    insurance fund absorbs min(D, fund_balance)              │
   │    → remaining D' = D − absorbed                            │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼ D' > 0 なら
   ┌─────────────────────────────────────────────────────────────┐
   │  Fallback   (Layer 3, capacity = ∑ winners' PnL)            │
   │    ADL absorbs min(D', ∑PnL_winners)                        │
   │    → remaining D'' = D' − absorbed                          │
   └─────────────────────────────────────────────────────────────┘
                              │
                              ▼ D'' > 0 なら
   ┌─────────────────────────────────────────────────────────────┐
   │  Last resort (Layer 4, no in-system capacity)               │
   │    protocol policy: halt the chain · accept residual        │
   └─────────────────────────────────────────────────────────────┘

   Deficit は単調に shrink する: D ≥ D' ≥ D'' ≥ 0
   各 layer の residual が次 layer の入力になる。
\`\`\`

下の詳細なオーケストレーションビューが、各 layer の input / output / 保存則を名指す:

\`\`\`
   ╔══════════════════════════════════════════════════════════════════╗
   ║  Per-block orchestration loop (the bridge calls this each block) ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║                                                                  ║
   ║  ┌─ Layer 1 — Liquidation参照実装（計算パート）: Margin classification (pure compute) ─┐ ║
   ║  │  Inputs:  account snapshots × mark price                    │ ║
   ║  │  Output:  MarginPhase per account (Safe/AtRisk/             │ ║
   ║  │           Liquidatable/Underwater)                          │ ║
   ║  │  Law:     Phase boundaries deterministic per (snapshot,     │ ║
   ║  │           mark, params)                                     │ ║
   ║  └─────────────────────────────────────────────────────────────┘ ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 1.5 — Liquidation参照実装（スキャナパート）: Scanner (orchestrator) ────────────┐  ║
   ║  │  Inputs:  classified accounts × mark price                 │  ║
   ║  │  Output:  ScanReport { closes, unfilled_deficit }          │  ║
   ║  │  Law:     before_balance + ∑deposits − ∑withdrawals =      │  ║
   ║  │           after_balance (per-scan conservation)            │  ║
   ║  └────────────────────────────────────────────────────────────┘  ║
   ║                              ↓                                   ║
   ║                if scan.unfilled_deficit > 0:                     ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 2 — Liquidation参照実装（保険基金パート）: InsuranceFund (stateful absorption) ─┐  ║
   ║  │  Inputs:  ScanReport closes, fund state                    │  ║
   ║  │  Output:  WithdrawOutcome (Covered/PartiallyDrained/       │  ║
   ║  │           Depleted)                                        │  ║
   ║  │  Law:     fee + residual = equity (per-close balance)      │  ║
   ║  └────────────────────────────────────────────────────────────┘  ║
   ║                              ↓                                   ║
   ║              if WithdrawOutcome != Covered:                      ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 3 — ADL参照実装パート: ADL (off-orderbook fallback) ───────┐   ║
   ║  │  Inputs:  remaining accounts × mark × unfilled_deficit    │   ║
   ║  │  Output:  AdlReport { records, deficit_absorbed,          │   ║
   ║  │           deficit_remaining }                             │   ║
   ║  │  Law:     deficit_absorbed + deficit_remaining = input    │   ║
   ║  │           deficit (this lesson, proptest 1)               │   ║
   ║  └───────────────────────────────────────────────────────────┘   ║
   ║                              ↓                                   ║
   ║              if AdlReport.deficit_remaining > 0:                 ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 4 — Protocol policy (out of scope) ─────────────┐      ║
   ║  │  Options: halt the chain · accept as protocol loss ·   │      ║
   ║  │           page operators                               │      ║
   ║  └────────────────────────────────────────────────────────┘      ║
   ║                                                                  ║
   ╚══════════════════════════════════════════════════════════════════╝
\`\`\`

構造的な takeaway が 3 つ。

1. **各 layer の出力が次の layer の入力になる。** Scanner の \`unfilled_deficit\` が InsuranceFund の入力になる。InsuranceFund の \`WithdrawOutcome\` が ADL の起動を gate する。ADL の \`deficit_remaining\` が protocol policy の起動を gate する。**情報フローは downstream-only。どの layer も上の layer を読まない。**
2. **各 layer の failure mode は構造的に bounded だ。** Margin classification は valid 入力で crash しない（pure compute、allocation なし）。InsuranceFund は drain し得る。だが \`WithdrawOutcome\` enum が exact な failure shape を名指す。ADL は \`deficit_remaining > 0\` を持ち得る。だが保存則がそれの上限を bound する。Protocol policy だけが in-system bound を持たない layer だ。By design — そこが deployment policy が enter する場所だからだ。**Failure semantics は最後まで typed されている。**
3. **各 layer に保存則があり、対応するコースで proptest によって証明される。** レッスン13 の per-scan conservation（Liquidation参照実装（スキャナパート））、Liquidation参照実装（保険基金パート） の fee/residual decomposition、ADL の \`deficit_absorbed + deficit_remaining = deficit\`（本レッスン）。Liquidation〜ADL四部作は 4 つの別個 feature ではない。同じ規律を異なる layer で 4 回証明したものだ。**1 つの規律、4 つの layer、バイト単位で reproducible end-to-end。**

## よくある質問

**Q1: なぜデフォルトが 256 proptest iteration で 10,000 ではないのか?**

Inner-loop dev cycle のスピードだ。\`cargo test\` は開発中に秒で終わるべきだ。256 iteration × 5 proptest × 各 ~1ms = proptest ブロック合計 ~1.3 秒。10,000 iteration なら ~50 秒。毎 \`cargo test\` invocation が遅くなる。妥協はこうだ。デフォルト 256（明白なバグを秒で catch）、CI で 10,000+（稀な random 入力が必要な subtle bug を catch）。**スピードのためのデフォルト、proof のための override。**

**Q2: Proptest が失敗したらどう debug するか?**

\`proptest!\` が自動で失敗入力を minimal counterexample に shrink して print する。Shrinker が iterative に入力を reduce する（より小さい collaterals vector、より小さい mark、より小さい deficit）。failure を reproduce し続けたまま、bug を trigger する最小入力に達するまでだ。それから exact 入力を通常の \`#[test]\` にコピーして、IDE/デバッガで deterministic に reproduce する。**Proptest は property checker、shrinker は debugger だ。**

**Q3: Proptest が偶然 pass する — 実際のバグに hit しない — ことはあり得るか?**

原理的には yes（256 iteration がすべての edge case を hit する保証はない）。実際にはほぼない。Input strategy が operating regime を密に hit するように calibrate されている。疑う specific failure mode があれば レッスン1〜3 で unit test として追加できる。レッスン4 ship 後でもだ。**Proptest は necessary だが sufficient ではない。unit test を補完するもので、置き換えるものではない。**

**Q4: なぜ \`records_in_rank_order\` proptest の \`deficit\` が他よりずっと大きいのか?**

出力に多くの record を force するためだ。小さい deficit は first ranked winner で absorb され、1 record（または 0）が残る。1 record では \`.windows(2)\` がゼロペアを produce し、テストが vacuously に pass する。\`deficit\` を \`1_000_000..10_000_000\` に、候補を \`0..15\` に crank すると、ほとんどの run が 5-15 record を produce し、pairwise ordering を実際に exercise する。**Property を non-vacuously testable にするよう input range を calibrate する。**

**Q5: \`proptest!\` は \`quickcheck\` より速いか?**

Typical workload には comparable だ。\`proptest!\` は 2026 Rust エコシステムで better-maintained なオプションで、openhl コードベース全体で使われている。複雑な入力（struct の vector など）に対する shrinker behavior も better だ。2026 の新しい Rust プロジェクトには \`proptest!\` がデフォルト。\`quickcheck\` は legacy オプションだ。**openhl では \`proptest!\` が convention。それを使う。**

**Q6: これは \`forge invariant\`（Foundry）とどう比較されるか?**

同じ定理、違うメカニクスだ。\`forge invariant\` は Handler に対してランダムな *メソッド call 系列* を生成し、各 call 後に invariant を check する。ここの \`proptest!\` はランダム *parameter set* を生成し、入力 1 つにつき関数を 1 回走らせる。両方が「すべての valid 入力に対して、このプロパティが成立する」を証明する。\`forge invariant\` は multi-call、ここの \`proptest!\` は single-call だ（別 \`proptest-state-machine\` crate が Rust で stateful プロパティを扱う）。**同じ規律、違う surface。Rust は single-call に \`proptest!\`、multi-call に state-machine を使う。Solidity は両方に \`forge invariant\` を使う。** *Mastering Foundry* の レッスン6 capstone が本レッスンの Solidity 側 sibling だ — openhl-liquidation Liquidation参照実装（保険基金パート） の \`InsuranceFund\` を Solidity に port し、4 invariant を \`forge invariant\` で証明する。本 レッスン4 capstone と並べて読むと、規律が両言語方向に転写することが実感できる。

## コース総括 — DIY Perp シリーズ第 6 弾完結

これが *Building OpenHL ADL* の最終レッスンだ。5 レッスンを経て、こうなった。

- L0: ADL の役割を safety-net cascade の Layer 3 として理解した
- レッスン1: \`AdlScore\`、\`AdlRecord\`、\`AdlReport\` + \`adl_score\` — ranking 関数を定義した
- レッスン2: \`execute_adl\` を 5 フェーズパイプライン + 5 degenerate テストとして実装した
- レッスン3: 6 つの nuanced absorption テストでパイプラインを証明した
- レッスン4: 5 つの invariant proptest で proof を普遍化し、AND Liquidation〜ADL四部作を閉じた

コースは openhl ADL参照実装パート の \`d66b44a\` に対して バイト単位で だ。Liquidation〜ADL四部作（Liquidation 3パート（計算・保険基金・スキャナ）  + ADLパート）が complete。margin classification → insurance fund → scanner → ADL → bounded protocol policy。ADL だけで 16 unit test + 5 proptest。openhl-liquidation コースの Liquidation三部作 のテストと合わせて、full な quartet には 60+ unit test と 9+ invariant proptest があり、cascade を機械的に証明する。

次にどこへ行くか。

- **次の実装パート（Oracle）と 次の実装パート（Vault）** が openhl に landed したら、同じ build-along パターンで同じ保存則規律を新 layer に適用する。
- **openhl-liquidation レッスン13 の capstone を ADL の目で読み直す。** レッスン13 の per-scan conservation law が今や「Layer 1.5 の cascade への貢献」として visible になる。2 つの capstone（レッスン13 と本 レッスン4）は sibling artifact だ。
- **規律を他で適用する。** \`before/after/delta\` state 遷移を持つ任意のシステム（トークン vesting、fee accumulation、prediction-market settlement）が、この exact なパターンを admit する。Per-step conservation を定義し、それを exercise する Handler-equivalent を書き、invariant を証明する。

Liquidation〜ADL四部作は単なる 4 feature ではない。同じ規律を異なる layer で 4 回証明したものだ。書いたのは Rust、走らせたのは \`cargo test\`、証明したのは 1 つの保存則規律が cascade を 4 段通して preserve するという事実。Layer は 4 つ、定理は 1 つ。これがコース全体が指していた一点だ。

**1 つの規律。4 つの layer。Byte-for-byte reproducible end-to-end。**
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
