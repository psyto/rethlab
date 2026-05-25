# Building OpenHL ADL — L4 draft (JA) — build-along

> openhl SHA `d66b44a` (Stage 10d — auto-deleveraging)。Capstone — ADL コースと Stage 10 四部作の両方を閉じる。

## L4 — `openhl-adl-capstone-ja`

**Stage**: Stage 10d — `d66b44a`

**Title**: レッスン 4 — Capstone — 5 つの invariant proptest + Stage 10 四部作のレトロスペクティブ

**Duration**: 45 分 · **XP**: 90

---

````markdown
# レッスン 4 — Capstone — 5 つの invariant proptest + Stage 10 四部作のレトロスペクティブ

## ゴール

このレッスンで掴む概念:

- **L4 は 2 つを同時に閉じる。ADL コースと Stage 10 四部作だ。** Stage 10a（margin classification、pure compute）+ 10b（insurance fund、stateful absorption）+ 10c（scanner、orchestration）+ 10d（ADL、off-orderbook fallback）が full なセーフティネット・カスケード（Safety-net cascade）を構成する。L4 後、ストレス下の任意のアカウント状態遷移を指差して、(a) どの layer が扱ったか、(b) どの保存則が preserve したか、(c) どの proptest が普遍的に証明するか、を名指せるようになる。**4 つの stage、4 つの layer、1 つの規律。**
- **5 つの invariant proptest が、L2+L3 が特定入力で証明したことを普遍化する。** L2 の 5 degenerate-path テストと L3 の 6 nuanced-absorption テストは、hand-picked 入力で `execute_adl` を証明した。L4 の 5 proptest は同じ properties を *ランダム* 入力で証明する。(1) `conservation_absorbed_plus_remaining_equals_deficit` — load-bearing な保存則。(2) `each_record_balances_pnl` — per-record decomposition。(3) `total_haircut_equals_deficit_absorbed` — per-record と aggregate accounting の consistency。(4) `execute_adl_is_deterministic` — 同じ入力 → 同じ出力、常に。(5) `records_in_rank_order` — 任意の入力に対してソート規律が成立する。**Specific tests が関数の shape を証明する。Proptest が関数の普遍性を証明する。**
- **Proptest の input strategy が「何が valid 入力か」の spec だ。** `collaterals in proptest::collection::vec(1_i64..1_000_000, 0..15)` は「0 から 15 の候補アカウント、各 collateral は 1 から 1,000,000」と言う。`mark in 1_u64..1_000` は「mark 価格は 1 から 1000 の範囲」。`deficit in 0_i64..1_000_000` は「deficit は 0 から 1M」。これらの range が *意味ある operating regime* を定義する。それ以外で proptest が入力を生成することはない（overflow/underflow edge case は L2 で導入した saturating ops が扱う。proptest の責任ではない）。**Input strategy は単なる「任意の入力」ではない。「operating regime 内の任意の入力」だ。**
- **Stage 10 レトロスペクティブはコース全体を跨ぐ thesis statement だ。** 4 つの stage が単一の per-block orchestration に compose する。scanner が classify し、insurance fund が absorb し、ADL が fallback し、各層の failure mode が *機械的に証明された構造的 invariant で bound されている*。これが rethlab thesis を 1 つの production cascade に適用したものだ。規律は layer 境界を超えて転写される。保存則が layer 境界を気にしないからだ。**保存則は付け加えるプロパティではない。Layer 1 から Layer 3 まで preserve する規律だ。**

確認:

```bash
cargo test -p openhl-liquidation adl::tests
```

…で **21 テスト pass** する（L1: 5 score-eligibility/ordering + L2: 5 degenerate + L3: 6 nuanced + L4: 5 proptest）。Full な ADL surface（score eligibility、pipeline correctness、保存則、decomposition、決定論性、ordering）が specific 入力と random 入力の両方に対して証明される。

具体的な変更:

- **`crates/liquidation/src/adl.rs`** — `#[cfg(test)] mod tests` モジュールの末尾に、5 つの invariant を含む `proptest! { ... }` ブロックを append。

5 つの proptest、新規テストコード ~60 行。加えて Stage 10 四部作レトロスペクティブが cascade アーキテクチャを walk する。コードなし、コースを閉じる architectural framing だけだ。

## おさらい

L3 の後はこうなっている。
- `execute_adl(candidates, mark, deficit) -> AdlReport` は ship 済み（L2）、16 specific 入力に対して tested（L1 の 5 + L2 の 5 + L3 の 6 = 16 unit test）。
- 5 フェーズのパイプライン（early-return + filter_map + sort_by + haircut loop + finalize）は hand-picked 入力すべてに対して構造的に正しい。
- 保存則 `deficit_absorbed + deficit_remaining == input_deficit` は L3 各テストで *implicit* に検証されている（per-input）。だがまだ *普遍的* ではない（for-all-inputs ではない）。

L4 は同じ `execute_adl` を取り、同じプロパティを普遍的に証明する。同じ関数、同じ定理、無限に多くの入力。

## 計画

2 つの artifact がある。

1. **5 proptest** を `adl.rs` の `#[cfg(test)] mod tests` ブロックに、`proptest! { ... }` macro invocation 内へ append。各 proptest が `(collaterals, mark, deficit)` の input strategy を取り、5 つの invariant のうち 1 つを証明する。

2. **Stage 10 四部作レトロスペクティブ** — コードなし。10a + 10b + 10c + 10d が safety-net cascade に compose する architectural walkthrough。各 stage の保存則を名指す。

> 🛑 **予測。** 下の proptest を読む前に: openhl-liquidation L13 の capstone は 4 proptest を持っていた。L4 はここでは 5 つだ。L13 が必要としなかった追加の proptest は何か? ヒント: ADL は *return value*（report）を持ち、L13 の scanner も似た return value を持つ。

(答え: **`records_in_rank_order`**。ADL の *ソート規律* を普遍化する。L13 の scanner はその record をソートしない（挿入順で処理する）。ADL の record は `(score 降順、account_id 昇順)` の順でなければならない。この proptest が任意の入力に対してそれを証明する。他の 4 proptest（保存則、decomposition、accounting consistency、決定論性）は L13 に直接 analogue がある。5 番目だけが、ADL が scanner より強い ordering 契約を持つから存在する。**出力に構造が多いほど、preserve するための invariant も多くなる。**)

## 5 つの proptest

L3 unit test の後、同じ `#[cfg(test)] mod tests` ブロック内に append する。

```rust
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

    /// Every record has `pnl_paid == pnl_gross - haircut`, with
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

    /// Total haircuts equal `deficit_absorbed`.
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
```

## ウォークスルー — 各 proptest が何を普遍化するか

### Proptest 1: Conservation

```rust
prop_assert_eq!(report.deficit_absorbed + report.deficit_remaining, deficit);
```

押さえる点が 3 つ。

1. **これが L2 の Phase 5 + Phase 4 loop body から来る load-bearing な保存則だ。** 各 iteration の `haircut + new_remaining == old_remaining` が蓄積し、最終的に `deficit_absorbed + deficit_remaining == initial_deficit` になる。Proptest がこれを、operating regime 内の *任意の* `(collaterals, mark, deficit)` タプルに対して verify する。
2. **`deficit in 0_i64..1_000_000` がゼロを含む。** これが Phase 1 の `deficit <= 0` 早期リターンを catch する。`deficit = 0` なら `deficit_absorbed = 0`、`deficit_remaining = 0` が produce され、`0 + 0 == 0` が成立する。**入力 range は boundary を含む。保存則は boundary で成立する。**
3. **L3 Test 2（`single_winner_exhausted_with_remaining_deficit`）と Test 4（`drains_first_winner_then_partially_second`）** はそれぞれ 1 つの特定入力で保存則を verify した。この proptest はデフォルト 256 ランダム入力で verify する（CI では 100,000+ に設定可能）。**2 つの unit test が 2 入力で assert することを、1 proptest が 256 入力で assert する。**

### Proptest 2: Per-record decomposition

```rust
for rec in &report.records {
    prop_assert!(rec.haircut >= 0);
    prop_assert!(rec.haircut <= rec.pnl_gross);
    prop_assert!(rec.pnl_paid >= 0);
    prop_assert_eq!(rec.pnl_paid, rec.pnl_gross - rec.haircut);
}
```

押さえる点が 3 つ。

1. **Record ごとに 4 つの sub-assertion がある。** non-negative haircut、pnl_gross で bounded された haircut、non-negative pnl_paid、decomposition equation。各々が別の `prop_assert!` だ。Failure が起きたとき、どの sub-property が壊れたかを正確に教える。**Granular な assertion が proptest failure を debuggable にする。**
2. **`for rec in &report.records` が *実際に* produce された record を iterate する。** Report に 0 record（degenerate 入力ケース）なら、loop は no-op、proptest は vacuously に pass する。**No record の proptest は vacuous proof だ。それで fine。interesting case ではないからだ。**
3. **L3 Test 1, 2, 4 がそれぞれ特定入力で 1 record の decomposition を verify した。この proptest がランダム入力ですべての record を verify する。** Phase 4 の `pnl_gross.saturating_sub(haircut)` から来る算術 identity `pnl_paid = pnl_gross - haircut` が、ここで普遍的になる。**Saturating subtraction はここでは matter しない。`haircut <= pnl_gross` が Phase 4 の `.min` で enforce されているから、subtraction で underflow が発生することは構造上あり得ない。**

### Proptest 3: Aggregate accounting consistency

```rust
let total: i64 = report.records.iter().map(|r| r.haircut).sum();
prop_assert_eq!(total, report.deficit_absorbed);
```

押さえる点が 3 つ。

1. **これが per-record と aggregate accounting 間の cross-check を証明する。** Phase 4 が `deficit_absorbed = deficit_absorbed.saturating_add(haircut)` を `records.push(... haircut ...)` と lockstep で accumulate する。だからすべての `record.haircut` の sum は *必ず* `deficit_absorbed` と等しい。Accumulator が record から drift したら（例えば refactor が haircut を追加したが record を push し忘れた場合）、この proptest が catch する。
2. **`total: i64 = ... .sum()` が原理的には overflow し得る。** 実際にはそうならない。各 `haircut <= deficit` で `deficit <= 1_000_000`（入力 range）、最大 15 候補。total ≤ 15,000,000 で i64 bound 内に十分収まる。**Input strategy の upper bound が implicit に sum の upper bound を bound する。**
3. **この invariant は inspection で verify するのが最も hard で、proptest で verify するのが最も easy だ。** `execute_adl` を読む reader は records-vs-accumulator drift が不可能だと convince *できる*。だが proptest は速く、より certain だ。**Inspection で verify 可能な invariant がある。Proptest で verify 可能な invariant がある。正しいツールを使う。**

### Proptest 4: Determinism

```rust
let r1 = execute_adl(&candidates, MarkPrice(mark), deficit);
let r2 = execute_adl(&candidates, MarkPrice(mark), deficit);
prop_assert_eq!(r1, r2);
```

押さえる点が 3 つ。

1. **同じ関数、同じ入力、2 回。full report の equality を assert する。** これが *任意の* 隠れた non-determinism を catch する。順序をランダム化する `HashMap` iteration、異なる値を返す clock read、tie を異なる方法で break する `sort_unstable_by` — どれも。これらは `execute_adl` には存在しない。だが将来の refactor が誤って導入したら、この proptest が catch する。
2. **`AdlReport` は `PartialEq` を derive している（L1 の設計経由）。** それが `prop_assert_eq!(r1, r2)` を動作させる。equality がすべての field（records、deficit_absorbed、deficit_remaining）を byte-identical match で比較する。**Report 型すべてに `PartialEq` derive を付けるのは consensus code で non-optional。なしでは決定論性 proptest が存在し得ない。**
3. **`0..10` candidate count（他の proptest の `0..15` より小さい）が高速さを保つ。** 決定論性のテストはより expensive だ（各 iteration が `execute_adl` を 2 回呼ぶ）。小さい input range はパフォーマンスの trade-off だ。Property は任意のサイズで成立するから、range を小さくしても proof は弱まらない。**Performance budget が proptest の input-range 選択を shape する。**

### Proptest 5: Rank order

```rust
for w in report.records.windows(2) {
    let (a, b) = (&w[0], &w[1]);
    let ok = a.score > b.score
        || (a.score == b.score && a.account.0 < b.account.0);
    prop_assert!(ok, "rank order broken between {:?} and {:?}", a, b);
}
```

押さえる点が 4 つ。

1. **`.windows(2)` が adjacent record をペアにする。** 各 adjacent pair（rank N と rank N+1）に対して、test がソート規律を verify する。厳密降順 score、または equal score with 厳密昇順 account_id。**`.windows(2)` が Rust で pairwise invariant を verify する idiomatic な方法だ。**
2. **`||`（or）が Phase 3 の `b.cmp(&a).then_with(|| a.cmp(&b))` の exact 逆だ。** Phase 3 が score-desc-then-id-asc が成立するようにソートする。この proptest が exact にその ordering を出力で assert する。Phase 3 のソートが silently に壊れたら（例えば refactor が comparator を swap した場合）、この proptest が catch する。
3. **`deficit in 1_000_000_i64..10_000_000` が他の proptest よりずっと大きい。なぜか。** 小さい deficit は少ない record を produce する（しばしば 1 つだけ）。「rank order」を単一 record で satisfy するのは trivial だ。出力に *多くの* record があってこそ ordering 規律が exercise される。**Input range が property を non-vacuously testable にするよう calibrate されている。**
4. **Failure message `"rank order broken between {:?} and {:?}"` が両 record を format する。** Proptest が失敗すると、message が CI ログに入る。実際の record を含めることで debugger に即座の context を与える。**Failure message は壊れたときに走るドキュメントだ。**

## すべてを走らせる

```bash
cargo test -p openhl-liquidation adl::tests
```

期待される出力。

```
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
```

**21 テスト、16 specific 入力 + 5 universal property、すべて緑。** ADL 実装は機械的に verify されている。

Heavy な proof には proptest の `PROPTEST_CASES` env var を bump する。

```bash
PROPTEST_CASES=10000 cargo test -p openhl-liquidation adl::tests
```

これが各 proptest をデフォルト 256 ではなく 10,000 回走らせる。モダンハードウェアで ~10-30 秒。Production CI は nightly で `PROPTEST_CASES=100000` を走らせ、full proof-of-the-day にする。

## Stage 10 四部作レトロスペクティブ — セーフティネット・カスケード

4 つの stage が単一の per-block orchestration に compose する。各 layer は独自の保存則を持ち、failure は bounded かつ observable な方法で下流の layer へ cascade する。

### カスケードを俯瞰する — capacity が layer ごとに drop する

```
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
```

下の詳細なオーケストレーションビューが、各 layer の input / output / 保存則を名指す:

```
   ╔══════════════════════════════════════════════════════════════════╗
   ║  Per-block orchestration loop (the bridge calls this each block) ║
   ╠══════════════════════════════════════════════════════════════════╣
   ║                                                                  ║
   ║  ┌─ Layer 1 — Stage 10a: Margin classification (pure compute) ─┐ ║
   ║  │  Inputs:  account snapshots × mark price                    │ ║
   ║  │  Output:  MarginPhase per account (Safe/AtRisk/             │ ║
   ║  │           Liquidatable/Underwater)                          │ ║
   ║  │  Law:     Phase boundaries deterministic per (snapshot,     │ ║
   ║  │           mark, params)                                     │ ║
   ║  └─────────────────────────────────────────────────────────────┘ ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 1.5 — Stage 10c: Scanner (orchestrator) ────────────┐  ║
   ║  │  Inputs:  classified accounts × mark price                 │  ║
   ║  │  Output:  ScanReport { closes, unfilled_deficit }          │  ║
   ║  │  Law:     before_balance + ∑deposits − ∑withdrawals =      │  ║
   ║  │           after_balance (per-scan conservation)            │  ║
   ║  └────────────────────────────────────────────────────────────┘  ║
   ║                              ↓                                   ║
   ║                if scan.unfilled_deficit > 0:                     ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 2 — Stage 10b: InsuranceFund (stateful absorption) ─┐  ║
   ║  │  Inputs:  ScanReport closes, fund state                    │  ║
   ║  │  Output:  WithdrawOutcome (Covered/PartiallyDrained/       │  ║
   ║  │           Depleted)                                        │  ║
   ║  │  Law:     fee + residual = equity (per-close balance)      │  ║
   ║  └────────────────────────────────────────────────────────────┘  ║
   ║                              ↓                                   ║
   ║              if WithdrawOutcome != Covered:                      ║
   ║                              ↓                                   ║
   ║  ┌─ Layer 3 — Stage 10d: ADL (off-orderbook fallback) ───────┐   ║
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
```

構造的な takeaway が 3 つ。

1. **各 layer の出力が次の layer の入力になる。** Scanner の `unfilled_deficit` が InsuranceFund の入力になる。InsuranceFund の `WithdrawOutcome` が ADL の起動を gate する。ADL の `deficit_remaining` が protocol policy の起動を gate する。**情報フローは downstream-only。どの layer も上の layer を読まない。**
2. **各 layer の failure mode は構造的に bounded だ。** Margin classification は valid 入力で crash しない（pure compute、allocation なし）。InsuranceFund は drain し得る。だが `WithdrawOutcome` enum が exact な failure shape を名指す。ADL は `deficit_remaining > 0` を持ち得る。だが保存則がそれの上限を bound する。Protocol policy だけが in-system bound を持たない layer だ。By design — そこが deployment policy が enter する場所だからだ。**Failure semantics は最後まで typed されている。**
3. **各 layer に保存則があり、対応するコースで proptest によって証明される。** L13 の per-scan conservation（Stage 10c）、Stage 10b の fee/residual decomposition、ADL の `deficit_absorbed + deficit_remaining = deficit`（本レッスン）。Stage 10 四部作は 4 つの別個 feature ではない。同じ規律を異なる layer で 4 回証明したものだ。**1 つの規律、4 つの layer、byte-for-byte reproducible end-to-end。**

## よくある質問

**Q1: なぜデフォルトが 256 proptest iteration で 10,000 ではないのか?**

Inner-loop dev cycle のスピードだ。`cargo test` は開発中に秒で終わるべきだ。256 iteration × 5 proptest × 各 ~1ms = proptest ブロック合計 ~1.3 秒。10,000 iteration なら ~50 秒。毎 `cargo test` invocation が遅くなる。妥協はこうだ。デフォルト 256（明白なバグを秒で catch）、CI で 10,000+（稀な random 入力が必要な subtle bug を catch）。**スピードのためのデフォルト、proof のための override。**

**Q2: Proptest が失敗したらどう debug するか?**

`proptest!` が自動で失敗入力を minimal counterexample に shrink して print する。Shrinker が iterative に入力を reduce する（より小さい collaterals vector、より小さい mark、より小さい deficit）。failure を reproduce し続けたまま、bug を trigger する最小入力に達するまでだ。それから exact 入力を通常の `#[test]` にコピーして、IDE/デバッガで deterministic に reproduce する。**Proptest は property checker、shrinker は debugger だ。**

**Q3: Proptest が偶然 pass する — 実際のバグに hit しない — ことはあり得るか?**

原理的には yes（256 iteration がすべての edge case を hit する保証はない）。実際にはほぼない。Input strategy が operating regime を密に hit するように calibrate されている。疑う specific failure mode があれば L1-L3 で unit test として追加できる。L4 ship 後でもだ。**Proptest は necessary だが sufficient ではない。unit test を補完するもので、置き換えるものではない。**

**Q4: なぜ `records_in_rank_order` proptest の `deficit` が他よりずっと大きいのか?**

出力に多くの record を force するためだ。小さい deficit は first ranked winner で absorb され、1 record（または 0）が残る。1 record では `.windows(2)` がゼロペアを produce し、テストが vacuously に pass する。`deficit` を `1_000_000..10_000_000` に、候補を `0..15` に crank すると、ほとんどの run が 5-15 record を produce し、pairwise ordering を実際に exercise する。**Property を non-vacuously testable にするよう input range を calibrate する。**

**Q5: `proptest!` は `quickcheck` より速いか?**

Typical workload には comparable だ。`proptest!` は 2026 Rust エコシステムで better-maintained なオプションで、openhl コードベース全体で使われている。複雑な入力（struct の vector など）に対する shrinker behavior も better だ。2026 の新しい Rust プロジェクトには `proptest!` がデフォルト。`quickcheck` は legacy オプションだ。**openhl では `proptest!` が convention。それを使う。**

**Q6: これは `forge invariant`（Foundry）とどう比較されるか?**

同じ定理、違うメカニクスだ。`forge invariant` は Handler に対してランダムな *メソッド call 系列* を生成し、各 call 後に invariant を check する。ここの `proptest!` はランダム *parameter set* を生成し、入力 1 つにつき関数を 1 回走らせる。両方が「すべての valid 入力に対して、このプロパティが成立する」を証明する。`forge invariant` は multi-call、ここの `proptest!` は single-call だ（別 `proptest-state-machine` crate が Rust で stateful プロパティを扱う）。**同じ規律、違う surface。Rust は single-call に `proptest!`、multi-call に state-machine を使う。Solidity は両方に `forge invariant` を使う。** *Mastering Foundry* の L6 capstone が本レッスンの Solidity 側 sibling だ — openhl-liquidation Stage 10b の `InsuranceFund` を Solidity に port し、4 invariant を `forge invariant` で証明する。本 L4 capstone と並べて読むと、規律が両言語方向に転写することが実感できる。

## コース総括 — DIY Perp シリーズ第 6 弾完結

これが *Building OpenHL ADL* の最終レッスンだ。5 レッスンを経て、こうなった。

- L0: ADL の役割を safety-net cascade の Layer 3 として理解した
- L1: `AdlScore`、`AdlRecord`、`AdlReport` + `adl_score` — ranking 関数を定義した
- L2: `execute_adl` を 5 フェーズパイプライン + 5 degenerate テストとして実装した
- L3: 6 つの nuanced absorption テストでパイプラインを証明した
- L4: 5 つの invariant proptest で proof を普遍化し、AND Stage 10 四部作を閉じた

コースは openhl Stage 10d の `d66b44a` に対して byte-for-byte だ。Stage 10 四部作（10a + 10b + 10c + 10d）が complete。margin classification → insurance fund → scanner → ADL → bounded protocol policy。ADL だけで 16 unit test + 5 proptest。openhl-liquidation コースの 10a/b/c のテストと合わせて、full な quartet には 60+ unit test と 9+ invariant proptest があり、cascade を機械的に証明する。

次にどこへ行くか。

- **Stage 11（oracle）と Stage 12（vault）** が openhl に landed したら、同じ build-along パターンで同じ保存則規律を新 layer に適用する。
- **openhl-liquidation L13 の capstone を ADL の目で読み直す。** L13 の per-scan conservation law が今や「Layer 1.5 の cascade への貢献」として visible になる。2 つの capstone（L13 と本 L4）は sibling artifact だ。
- **規律を他で適用する。** `before/after/delta` state 遷移を持つ任意のシステム（トークン vesting、fee accumulation、prediction-market settlement）が、この exact なパターンを admit する。Per-step conservation を定義し、それを exercise する Handler-equivalent を書き、invariant を証明する。

Stage 10 四部作は単なる 4 feature ではない。同じ規律を異なる layer で 4 回証明したものだ。書いたのは Rust、走らせたのは `cargo test`、証明したのは 1 つの保存則規律が cascade を 4 段通して preserve するという事実。Layer は 4 つ、定理は 1 つ。これがコース全体が指していた一点だ。

**1 つの規律。4 つの layer。Byte-for-byte reproducible end-to-end。**

````

---

## Seed-file slot

L4 は Module 1 (ADL implementation) の sortOrder 3 (capstone) に入る:

```typescript
{
  title: 'レッスン 4 — Capstone — 5 つの invariant proptest + Stage 10 四部作のレトロスペクティブ',
  slug: 'openhl-adl-capstone-ja',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 45,
  xpReward: 90,
  content: `# レッスン 4 — Capstone — 5 つの invariant proptest + Stage 10 四部作のレトロスペクティブ\n\n...`
},
```

## 翻訳セルフレビュー（paste 前）

- **L4 は ADL コース AND Stage 10 四部作の両方を閉じる capstone** (45 分 / 90 XP — L3 の 35/60 より大きく、Foundry L6 の 60/110 より小さい、proptest コードが Foundry capstone の Solidity port より短いから)。
- **Stage 10 cascade ASCII 図が load-bearing visual だ。** Layer 1 → 1.5 → 2 → 3 → 4 を、各 layer の input/output/保存則を名指して見せる。図は dense だがその density が point だ — reader が full cascade を 1 view で見られる。
- **5 つの proptest walkthrough が L2 の 5 phase walkthrough 構造を mirror する。** 各 proptest がコードブロック + 3-4 things-to-notice を得る。このパターンは今や L2+L3+L4 で familiar だ。
- **Predict callout が「なぜ 5 proptest 対 L13 の 4 か?」を問う。** 答え（ADL がソート規律を持つ、scanner は持たない）は L13 capstone が教える必要がなかった構造的洞察だ。
- **Q6 が Foundry L6 の `forge invariant` を explicit に cross-reference する** — cross-course ループを閉じる。Foundry コースを完了した reader は ADL L4 + Foundry L6 を同じ規律に異なるツールを使う sibling capstone として見るだろう。
- **コース総括が thesis で閉じる: 「1 つの規律。4 つの layer。Byte-for-byte reproducible end-to-end。」** Foundry L6 の「Foundry は道具だ。規律こそがプロダクトだ。」のパンチに mirror するが claim は違う — Foundry はツーリングについて、ADL は cascade composition について。
- **長さ: ~430 行** — capstone に appropriate、L2 (398) と Foundry L6 (594) の間。Stage 10 retrospective 単体で ASCII ~30 行 + 構造的 takeaway ~30 行。残りが proptest + Q&A。

### JA 特有のスタイル決定

- **専門用語は英語のまま** (`proptest!`, `prop_assert_eq!`, `prop_assert!`, `execute_adl`, `AdlScore`, `AdlRecord`, `AdlReport`, `MarginPhase`, `ScanReport`, `WithdrawOutcome`, `Covered`, `PartiallyDrained`, `Depleted`, `deficit_absorbed`, `deficit_remaining`, `pnl_gross`, `pnl_paid`, `haircut`, `MarkPrice`, `AccountSnapshot`, `AccountId`, `PROPTEST_CASES`, `PartialEq`, `windows(2)`, `then_with`, `saturating_add`, `saturating_sub`, `saturating_*`, `filter_map`, `sort_by`, `HashMap`, `quickcheck`, `proptest-state-machine`, `forge invariant`, `cfg(test)`, `Vec`, `i64`, `u64`, `bridge`, `CLOB`, `load-bearing`, など)。
- **Rust / bash コードと in-code コメントは英語のまま**。Reader が直接 copy-paste する。
- **Stage 10 cascade ASCII 図は完全に英語のまま**。Cell content の翻訳は混乱を増やすだけ — 図は production code identifier の network。
- **`load-bearing`、`vacuously`、`vacuous proof`、`granular assertion`、`pedagogical anchor`、`cross-reference`、`single-call`、`multi-call`、`per-block`、`per-record`、`per-scan`、`per-close`、`per-step`、`for-all-inputs`、`one discipline, four layers`** は英語のまま。L0-L3 と一貫。
- **Bilingual annotation** は first-mention にのみ適用: `セーフティネット・カスケード（Safety-net cascade）`。L0-L3 で確立された `カスケード（Cascade）`、`決定論性（Determinism）`、`保存則（Conservation law）`、`普遍化（Generalization）` などは body 内では英語のままで使う（既に annotation 済みのため）。
- **コース総括の最終行「1 つの規律。4 つの layer。Byte-for-byte reproducible end-to-end。」** は意図的に簡潔に翻訳。Punch を保つ。Foundry L6 の「Foundry は道具だ。規律こそがプロダクトだ。」と同じトーンで、コースを「決まり台詞」で閉じる。

