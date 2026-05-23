# Building OpenHL ADL — L0 draft (JA) — build-along

> openhl SHA `d66b44a`（Stage 10d — auto-deleveraging）に対するドラフト。
> 本コースは **DIY Perp シリーズの第 11 コース**、build-along としては 6 つ目
> (Consensus, CLOB, Precompiles, Funding, Liquidation の後)。**Stage 10 quartet**
> (margin math + insurance fund + scanner + ADL) を閉じ、4 層の safety-net cascade
> を完成させる。

## L0 — `openhl-adl-orientation-ja`

**Stage**: Stage 10d（auto-deleveraging — cascade 最後の防衛線）— `d66b44a`

**Title**: OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3

**Duration**: 15 分 · **XP**: 50

---

````markdown
# OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3

## このコースで作るもの

前のコース (`building-openhl-liquidation`) で multi-account scanner — Liquidatable / Underwater なアカウントを 1 つの `ScanReport` にまとめる orchestration loop — を出荷した。L13 の最後に、`ScanReport.unfilled_deficit > 0` こそが「insurance fund が absorb しきれなかった」を意味する *唯一の* signal であり、Stage 10d (本コース) がそれを consume する、と書いた。

本コースがその consumer を実装する。完走後にはこうなる:

- **新規ソースファイル 1 つ / 約 530 LOC** が `crates/liquidation/src/adl.rs` に。
- **21 個のテストが pass する** (SHA `d66b44a` 時点): score / no-candidate / single-winner / multi-winner / tiebreaker をカバーする 12 個の unit test + 4 個の invariant proptest + 5 個の score helper test。crate 全体のテスト数は **69 → 90** に。
- **新規 3 型** (`AdlScore`, `AdlRecord`, `AdlReport`) と **新規 2 関数** (`adl_score`, `execute_adl`) — scanner と比べて clean で small なモジュール。
- **完成した 4 層の safety cascade**: 証拠金維持 (Layer 0) → 強制 close fee (Layer 1) → insurance fund (Layer 2) → **ADL (Layer 3)** → **socialized loss / プロトコル破綻 (Layer 4)**。Layer 4 こそが Layer 0-3 によって到達不能にすべき領域だ。本コース L4 終了時点で `AdlReport.deficit_remaining > 0` なら、チェーンは正式に Layer 4 に入っている — 全 depositor が haircut を受けるか、プロトコルが halt する。

掴むこと:

- **ADL が orderbook を完全にバイパスする理由** — 最適化のためではなく、cascade 中に profitable position に対して market order を流すと feedback loop が走ってチェーンが crash するため。Bookkeeping layer での mutation こそが唯一安全な path。
- **Hyperliquid の score convention**: `(pnl_pct × leverage)` が「最も lucky な winner」をランキングする — 最も大きい相対利益を出し、*かつ* 最もレバレッジを取ったトレーダー。彼らが先に haircut を受ける。
- **Haircut の仕組み**: ADL 対象 winner の unrealized PnL が `P` だったとき、通常 close なら `P` 全額を受け取る。ADL では `P - haircut` を受け取り、`haircut = min(remaining_deficit, P)`。差額がシステムによって absorbed deficit に充当される。
- **決定的なランキング**: score 降順の stable-sort、`AccountId` 昇順で tiebreak — 同じ score の 2 人の winner が、全 validator で byte-identical な順序を生む。
- **第 4 層への exit**: candidate pool が deficit を absorb しきる前に尽きたとき、`AdlReport.deficit_remaining > 0` となり、プロトコルは打つ手がなくなる。この値が non-zero になる瞬間こそ、チェーンが「破綻している」と自認する瞬間だ。

## ADL が orderbook をバイパスする理由 (feedback loop の話)

本コースで最も重要な概念的飛躍はここだ。コードに入る前に立ち止まる価値がある。

Stage 10c の scanner は close order を **CLOB** (matching engine) に submit する。Liquidatable なアカウントのポジションは、既存の bid/ask stack を consume する market order で unwind される。市場が落ち着いていて liquidation が数件なら、これで問題ない。

だが ADL が設計された対象ケースを考える: **violent な値動きで多数の underwater close が発生し、insurance fund が drain した状態**。ADL でも同じメカニズム — profitable counter-position に対して market order を matching engine 経由で出す — を使うとどうなるか。

板の深さは有限だ。追加の market sell が出るたびに bid stack を punch through し、mark がさらに下がる。Mark が下がるとさらに多くのアカウントが underwater になる。それらの新しい underwater アカウントも ADL を必要とする。Matching engine にさらに aggressive な売りが入る。Mark がさらに下がる。サイクルが暴走する。

これは **まさに** Mt. Gox をスローモーションで殺した failure mode であり、GameStop の時に Robinhood をほぼ殺し、過去 5 年のすべての主要 perp DEX 停止事件を引き起こしたパターンだ。修正は構造的: **ADL は orderbook に触れてはならない**。

代わりに具体的にやること:

- ADL は winner を score で順位付けする — pure Rust、全 validator で独立に。
- 「Force-close」は bookkeeping mutation: trader の collateral に `pnl - haircut` を credit、ポジションサイズを 0 に、open-positions テーブルから除去。
- Matching engine は ADL close を一切見ない。Bid/ask stack は無事。Mark が動くのは *他の誰か* が取引したときだけ。

各 `AdlRecord` で依然 emit する `CloseOrderSpec` は純粋に telemetry 目的 — Stage 10a の他の close path との shape parity と、後段の auditing のために残す。**Bridge** (openhl の integration 層。`LiquidationScanner::scan` と、本コース以降の `execute_adl` をブロックごとに呼ぶコンポーネント — Liquidation コースの L10 以降で繰り返し登場している同じ component) **がこれを account-state mutation として apply する、CLOB submission としてではない。**

## Stage 10c → 10d の handoff を 1 枚で

```
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
```

契約は **i64 1 個 in, i64 1 個 out**。Bridge の wiring:
- L13 が `unfilled_deficit > 0 ⇒ fund_balance == 0` を証明した (proptest #2)。
- 本 L0 が、L13 のその契約こそが `execute_adl` を trigger する条件だと教える。

## Score: 「最も lucky な winner が haircut を受ける」

L1 で実装する。今のところ要点だけ:

$$\text{pnl\_pct\_bps} = \frac{\text{pnl} \times \text{MARGIN\_SCALE}}{\text{collateral}}$$

$$\text{leverage\_bps} = \frac{\text{notional} \times \text{MARGIN\_SCALE}}{\text{equity}}$$

$$\text{score} = \frac{\text{pnl\_pct\_bps} \times \text{leverage\_bps}}{\text{MARGIN\_SCALE}}$$

（Stage 10a のおさらい: `equity = collateral + unrealized_pnl`、`notional = |position_size| × mark`。つまり `collateral` は預けた元本、`equity` はそのポジションの現在価値、`notional` は総エクスポージャ。）

両方の factor は bps 単位 (10000 = 100%)。積は一度 renormalize される。10× ポジションで +50% のトレーダーは、1× ポジションで +100% のトレーダーより **高い** score になる — Hyperliquid の選択だ。高 leverage の winner はより「構造的に lucky」とみなされる (最大のリスクを取って最大の勝ちを得た)。

これは Hyperliquid の実際の convention。他の venue は別の score を使う (raw `pnl_pct` を使うもの、絶対 `pnl` を使うもの)。Score の選択は fairness に影響するが、*メカニズム* は同じ。本コースは HL に従う。

## 保存則 (load-bearing な不変条件)

L9 / L10 / L13 と同じ規律:

$$\text{deficit\_absorbed} + \text{deficit\_remaining} = \text{入力\_deficit}$$

`execute_adl` は deficit を全額 absorb する (`deficit_remaining = 0`) か、できる限り absorb して残りを surface する。**ADL 自身は deficit を生成も消滅もさせない。** L4 の proptest が、ランダムな `(candidates, mark, deficit)` triple 全体でこの不変条件を lock する。

これで cascade 数学が閉じる — 4 つの層、4 つの保存恒等式:

$$\text{L9 (per fund call):} \quad \text{amount} + \text{unfilled} = \text{shortfall}$$

$$\text{L10 (per position close):} \quad \text{fee\_to\_fund} + \text{residual\_to\_account} = \text{post\_close\_equity}$$

$$\text{L13 (per scan batch):} \quad \text{balance\_before} + \sum \text{deposits} - \sum \text{withdrawals} = \text{balance\_after}$$

$$\text{L4 (per ADL pass):} \quad \text{deficit\_absorbed} + \text{deficit\_remaining} = \text{入力\_deficit}$$

4 つの層、4 つの恒等式。本コース完走後、openhl-liquidation crate の数学は **あらゆる操作の下で閉じる**。

## 5 つのレッスン

### Module 0 — Orientation
- **L0** (本レッスン) — なぜ ADL、なぜ orderbook bypass、Stage 10c → 10d handoff、score preview、保存則 preview。

### Module 1 — ADL implementation
- **L1** — `AdlScore` newtype + `AdlRecord` + `AdlReport` 型 + `adl_score(snapshot, mark) -> Option<AdlScore>` 関数。Flat / 損失 / collateral 0 ケースでの `None` を含む pure-compute scoring。5 個の score テスト。
- **L2** — `execute_adl(candidates, mark, deficit) -> AdlReport` — orchestration: `Option<AdlScore>` で filter、`AccountId` tiebreaker で stable-sort 降順、haircut loop。50 行の本体をフェーズごとに walk + 5 個の simple unit test (zero / no-candidate / no-profitable / single-winner-full / single-winner-partial)。
- **L3** — Nuanced な absorption テスト: score 順の multi-winner、drain-first-then-partial、`AccountId` 昇順の tiebreaker、「loser / flat に触れない」防御。6 個の unit test。
- **L4** — 4 個の invariant proptest + Stage 10 quartet retrospective。Per-pass から per-block への保存則、end-to-end で閉じた 4 層 cascade。

## 本コース後に何があるか

Stage 10 cascade は完成する。openhl ロードマップは続く:

- **Stage 11 — Oracle** (`6495ffd`、openhl では shipped 済み): median-aggregating な index-price feed と signed observation verify。Rethlab の将来コース。
- **Stage 12 — Vault** (`1e63e0b`、shipped 済み): share-based な collateral pooling primitive。将来コース。
- **Stages 13a-13k — bin/openhl** (複数 SHA、shipped 済み): 実際に走る single-validator node。将来コース。

本コースの L4 を完走後、あなたは publish 済みカリキュラムより 1 コース先行し、openhl の Stage 10 終端に到達する。そこから先は openhl が build の reference になる。

## License / SHA discipline

L0–L4 は Stage 10d の SHA `d66b44a` を引用する。Single-file の diff は `crates/liquidation/src/adl.rs` にある。Stage 10c (`0a8464e`) と Stage 10d (`d66b44a`) の間で他の crate ファイルは変わらない — ADL は pure additive なモジュールだ。

````

---

## Seed-file slot

L0 は新規コースの最初のレッスン、module 0 / sortOrder 0:

```typescript
{
  title: 'OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3',
  slug: 'openhl-adl-orientation-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 15,
  xpReward: 50,
  content: `# OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3\n\n...`
},
```

コースレベルのメタデータ (新規):

```typescript
{
  slug: 'building-openhl-adl-ja',
  title: 'OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3',
  description: '...',
  difficulty: 'EXPERT',
  duration: 160,
  xpReward: 245,
  tags: ['reth', 'evm', 'liquidation', 'adl', 'perpetual', 'l1', 'openhl', 'expert'],
  sortOrder: 1010,
  track: 'diy-perp',
  isPublished: true,
},
```

## SHA pinning discipline

L0 は `d66b44a` (Stage 10d) を引用する。L4 後、答え合わせ diff は `d66b44a` と byte-for-byte 一致。ADL は pure additive モジュール — Stage 10c と Stage 10d の間で他の crate ファイルは変わらない。

## 翻訳セルフレビュー（paste 前）

- **L0 はコース内で最短のレッスン** (15 分)。正当化される — orientation レッスンは verb レッスンの context を整える役割。ここでメカニズムを教えると、読者が必要な cascade-level の framing が薄れる。
- **「Feedback loop が orderbook を bypass する理由」のフレーミング** が L0 で最も pedagogically valuable な部分。Mt. Gox、Robinhood/GME、「過去 5 年の主要 perp DEX 停止事件」を名指すことで、規律を理論ではなく実際のエンジニアリング教訓として読者の手に渡す。歴史的失敗を実名で呼ぶこのパターンは rethlab corpus 内で新規。
- **Stage 10c → 10d handoff の ASCII 図** が L13 → L0 の遷移を具体化する。読者の前回レッスン (L13) は `unfilled_deficit` を signal として終わった。L0 はその signal が新しい関数の入力になる場所を明示する。
- **Score preview は意図的に部分的** — 数式と直感は与えるが、コードは出さない。「なぜこの式で、他の選択肢ではないのか」の議論は L1 に取っておく。
- **4 層の保存則の図** が cascade-math closer だ。L0 後、読者は L9 / L10 / L13 / L4 の 4 つのレッスンが *別スケールでの同じ定理* だと見える。これは openhl-liquidation crate に固有の構造的な美しさで、ADL コースの L0 でこれを可視化することが最も leverage の高い pedagogical move。
- **5 レッスン構造** は Liquidation コースの 14 レッスンより tight。ADL が trilogy ではなく単一の openhl stage であることを反映する。

### JA 特有のスタイル決定

- **専門用語は英語のまま** (`orderbook`, `feedback loop`, `bookkeeping`, `haircut`, `tiebreaker`, `stable-sort`, `score`, `load-bearing` など)。Liquidation コースの慣例に従う。
- **歴史的失敗事例の名指し** (Mt. Gox / Robinhood / GameStop) はそのまま英語で残す — 専門用語と同じ扱い。
- **「最も lucky な winner」** は意訳しない — Hyperliquid の convention をそのまま伝える表現として「lucky」が最も近い。
