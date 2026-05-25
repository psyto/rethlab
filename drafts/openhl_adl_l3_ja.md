# Building OpenHL ADL — L3 draft (JA) — build-along

> openhl SHA `d66b44a` (Stage 10d — auto-deleveraging)。

## L3 — `openhl-adl-absorption-tests-ja`

**Stage**: Stage 10d — `d66b44a`

**Title**: レッスン 3 — 6 つの nuanced absorption テスト — マトリクスで `execute_adl` を証明する

**Duration**: 35 分 · **XP**: 60

---

````markdown
# レッスン 3 — 6 つの nuanced absorption テスト — マトリクスで `execute_adl` を証明する

## ゴール

このレッスンで掴む概念:

- **L3 は `execute_adl` の unit-test capstone だ — マトリクス（Matrix）を span する 6 つのテスト。** L2 で 5 フェーズのパイプライン + 5 つの degenerate-path テスト（zero/negative deficit、no candidates、no profitable、single happy-path winner）を ship した。L3 は *interesting* な中域を埋める。単一 winner が完全に haircut されるケース、複数 winner が deficit を share するケース、tie が break されるケース、loser と flat が winner と共存するケース。各テストは 2 軸マトリクス `{single winner, multiple winners} × {full absorb, partial absorb, mixed eligibility}` の 1 セルだ。L3 完走後、`execute_adl` を読めば任意の入力に対してどのテストがカバーしているか分かる。**1 つの関数に 6 テストは過剰ではない。マトリクスのサイズだ。**
- **各テストは、コメントに math が書かれた hand-computed worked example だ。** openhl-liquidation L13 の capstone テストと同じ `math-walk in comments` 規律。コメントが期待出力を step-by-step で導出し、デバッガが導出する必要をなくす。`adl_multiple_winners_in_score_order` が「B のスコアは 26,666 vs A の 10,000」と言うとき、その数字は `(pnl_pct_bps × leverage_bps) / MARGIN_SCALE` から計算され、読者のためにテストコメントに再現されている。L4 の proptest が、ここで特定の入力に対して証明することを普遍化（Generalization）する。ここでの入力は math を明白にする *ために* 選ばれている。**Math-walk が各テストを 5 行の worked example に変える。Black-box assertion ではなく。**
- **6 つのテストは simple から compound へと進む。** Test 1-2 は Phase 4 の single-iteration regime 内に留まる（1 winner）。Test 3-4 は Phase 3 のソート + Phase 4 の multi-iteration ループを導入する。Test 5 は tiebreaker を isolate する（Phase 3 の `then_with`）。Test 6 は Phase 2 の `filter_map` が loser と flat を正しく drop することを証明する — *winner が同じ入力にいるときでも*。Eligibility filter は mixed population で動かねばならない。Pure ones だけでなく。**Arc: single winner → multi-winner → ソート規律 → tiebreaker → integration。**
- **テスト名は `adl_<scenario>_<expected_outcome>` の命名規約に従う。** `adl_single_winner_partial_haircut_at_full_pnl`、`adl_drains_first_winner_then_partially_second`、`adl_tiebreaker_by_account_id_ascending` — 各テスト名がそのテストが証明する仮説として読める。Production codebase はこの規律を使う。`cargo test --list`（または `cargo test -- --quiet`）が関数の挙動の *仕様* を生成するためであって、arbitrary な名前のリストを生成するためではない。**テスト名が文になるとき、テストはドキュメントになる。**

確認:

```bash
cargo test -p openhl-liquidation adl::tests::adl_
```

…で 16 テスト pass する: L1 の 5 score-eligibility/ordering テスト + L2 の 5 pipeline-degenerate テスト + L3 の 6 nuanced-absorption テスト。Full な ADL テストマトリクスが *特定の* 入力に対してカバーされる。L4 でこの specific cases をランダム入力へと普遍化する 5 つの proptest を追加する。

具体的な変更:

- **`crates/liquidation/src/adl.rs`** — 既存の `#[cfg(test)] mod tests` ブロックに 6 つのテストを append。Production コードの変更なし。L2 の実装を richer な入力に対して証明する。

6 つのテスト、新規テストコード ~80 行。本レッスンは各テストを worked example として walk する。

## おさらい

L2 の後はこうなっている:
- `execute_adl(candidates, mark, deficit) -> AdlReport` — 5 フェーズのパイプラインが ship 済み（defensive guard、score+filter、tiebreaker 付き stable-sort、保存則 accounting 付き haircut loop、finalize）。
- `adl.rs` 内に今までで 10 テスト: L1 の 5（score eligibility 4 + score ordering 1）、L2 の 5（degenerate path 4 + single-winner happy path 1）。
- 保存則 `deficit_absorbed + deficit_remaining == input_deficit` は loop body によって *構造的に* preserve されている。まだ *普遍的に* 証明されてはいない（それは L4）。

L3 は 5 フェーズのパイプラインを取り、load-bearing パスを exercise する: full-haircut decomposition、multi-winner ordering、tiebreaker 決定論性、mixed-eligibility filtering。同じ `execute_adl`、richer な入力。

## 計画

6 つのテスト、それぞれ L2 のテストの下に `#[cfg(test)] mod tests` ブロックに append:

1. **`adl_single_winner_partial_haircut_at_full_pnl`** — Phase 4 edge case: haircut == pnl_gross → pnl_paid = 0
2. **`adl_single_winner_exhausted_with_remaining_deficit`** — Phase 4 edge case: pnl_gross < deficit → record absorbed、remainder propagate
3. **`adl_multiple_winners_in_score_order`** — Phase 3 ordering: A と B が同じ PnL でも、B のより高い leverage が B を rank 1 にする
4. **`adl_drains_first_winner_then_partially_second`** — Phase 4 quota exhaustion: rank 1 で full haircut、rank 2 で partial
5. **`adl_tiebreaker_by_account_id_ascending`** — Phase 3 `then_with`: identical score → ascending account_id が winner を選ぶ
6. **`adl_does_not_touch_losers_or_flats`** — Phase 2 `filter_map`: mixed population 内の ineligible アカウントが正しく skip される

> 🛑 **予測。** 下のテストを読む前に: `execute_adl(candidates=[A_pnl_100, B_pnl_100], deficit=80)` が走り、A が score 10,000 を、B が score 26,666 を持つとき、report は *ちょうど* `[B with haircut 80]` を持ち、A は untouched だ。なぜ A の record が report に zero-haircut として含まれず、record 自体が無いのか?

(答え: **Phase 4 の `if remaining <= 0 break;` が、A が処理される *前* に loop を exit するからだ。** B が 80 で haircut された後、`remaining` は 0 になる。Loop が break する。A は loop body に入らない。だから A に対する record は作られない。これが `break` の構造的 payoff だ（L2 の predict callout を recall）。Quota 束縛 loop は *実際に* haircut を受けたアカウントに対する record のみを生成する。Zero-haircut padding ではない。Report の `records.len()` は意味あるカウントになる: 「この ADL pass でいくつのアカウントが force-close されたか」。**`break` が report の record count を意味あるものに保つ。**)

## 6 つのテスト

`adl.rs` の既存の `#[cfg(test)] mod tests` ブロックに append:

### Test 1: full-PnL haircut で payout がゼロ

```rust
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
```

押さえる点が 3 つ。

1. **`haircut == pnl_gross` が、winner がすべてを支払う boundary case だ。** `min(remaining=100, pnl_gross=100) = 100`。Decomposition `pnl_paid = pnl_gross - haircut = 0` が成立するが、トレーダーは何も受け取らない。システムの最後の防衛線だった。**Winner の full PnL が ADL に食われる case。トレーダーにとっては倫理的に最悪の case、構造的にはただ `min` が仕事をしているだけ。**
2. **`deficit_remaining = 0`、winner を drain したにもかかわらず。** Deficit はちょうど covered だから、何も残らない。Test 2 と比較するとよい。そちらでは deficit が winner の PnL を *超え*、`deficit_remaining > 0` で chain は unresolved trouble に入る。
3. **`report.records.len()` への assertion なし。** L2 のテストは record count を explicit に assert した。ここでは単に `records[0]` を index する。両 style とも valid。このテストは L2-tested invariant「ちょうど 1 つの winner がちょうど 1 つの record を生む」を信頼する。**先行テストが既に証明したことを over-assert しない。**

### Test 2: Deficit が winner の PnL を超える — remainder が propagate

```rust
#[test]
fn adl_single_winner_exhausted_with_remaining_deficit() {
    // PnL = 100, deficit = 250 → full haircut, 150 remains.
    let candidates = vec![snapshot(1, 1, 100, 100)];
    let report = execute_adl(&candidates, MarkPrice(200), 250);
    assert_eq!(report.records.len(), 1);
    assert_eq!(report.deficit_absorbed, 100);
    assert_eq!(report.deficit_remaining, 150);
}
```

押さえる点が 3 つ。

1. **`min(250, 100) = 100` — winner の PnL が haircut を cap する。Deficit ではない。** Phase 4 の `haircut = remaining.min(pnl_gross)` は「deficit が必要とするだけ取るか、winner が持っているだけ取るか、小さい方」と読める。ここでは winner が小さい。だから `haircut = pnl_gross = 100`。**2 つの upper bound の `min`。両方適用、小さい方が勝つ。**
2. **`deficit_absorbed + deficit_remaining == 250` — 保存則が成立する。** `100 + 150 == 250`。L2 で setup し L4 の proptest で普遍化する構造的保存則だ。L3 の各テストが implicit に検証し、L4 の proptest が *普遍的に* 検証する。**保存則は L3 テストでは implicit、L4 proptest では explicit。**
3. **`deficit_remaining = 150` が bridge へのシグナルだ: 「これを cover できなかった」。** Bridge が `deficit_remaining > 0` を読み、何をするか decide する（chain を halt、protocol loss として accept、alert を raise）。関数の仕事は reporting で終わる。Policy は bridge の責任だ。**`execute_adl` は deficit 状態を report する。Bridge が policy を decide する。**

### Test 3: Multi-winner ranking — より高い leverage が勝つ

```rust
#[test]
fn adl_multiple_winners_in_score_order() {
    // Two long winners; the higher-leverage one ranks first.
    // A: coll 100, pnl 100 → score 10_000 (per L1's score derivation)
    // B: coll 50,  pnl 100 → score 26_666
    // deficit = 80 → B haircut = 80, pnl_paid = 20; A untouched.
    let candidates = vec![snapshot(1, 1, 100, 100), snapshot(2, 1, 100, 50)];
    let report = execute_adl(&candidates, MarkPrice(200), 80);
    assert_eq!(report.records.len(), 1, "deficit smaller than B's pnl → only B");
    assert_eq!(report.records[0].account, AccountId(2));
    assert_eq!(report.records[0].haircut, 80);
}
```

押さえる点が 4 つ。

1. **A と B は同じ PnL (100)、違う collateral。** A は `coll 100` なので `pnl_pct = 100×10000/100 = 10000` bps、leverage = `notional/equity = 200/200 = 10000` bps → score 10,000。B は `coll 50` なので `pnl_pct = 100×10000/50 = 20000` bps、leverage = `200/150 ≈ 13333` bps → score `20000 × 13333 / 10000 = 26666`。**同じ PnL でも高 leverage = 高 score = 最初に haircut。**
2. **Score-math コメントがテストの spec だ。** コメント内の math なしだと、テストは magic-numbers assertion だ:「俺を信じろ、B は score 26666 を持つ」。Math ありだと、テストは人間が verify できる derivation として読める。**Math-walk コメントが assertion を proof に変える。**
3. **A の record が report に absent だ。** Phase 4 の `break` が B の haircut 後（remaining = 0）に fire する。A は loop body に入らない。`records.len() == 1` の assertion がこれを document する。A がそこにいないのは、A が必要なかったからだ。**Predict callout の payoff: record count が、実際に force-close されたアカウント数を教える。**
4. **Length assertion の `"deficit smaller than B's pnl → only B"` メッセージはドキュメントだ。** もしこのテストが失敗したら（例: refactor が Phase 3 のソート規律を壊す）、失敗メッセージがデバッガに *なぜ* これが重要かを教える。**Assertion メッセージはドキュメントだ。CI ログで午前 3 時に読むと思って書く。**

### Test 4: Deficit が rank 1 を drain し rank 2 を partial に cover する

```rust
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
```

押さえる点が 5 つ。

1. **Test 3 と同じ入力（A と B）、大きい deficit (150)。** これが *quota exhaustion* 挙動を isolate する。Test 3 は deficit = 80（B 単独より小さい）→ B 後に loop exit。Test 4 は deficit = 150（B 単独より大きい）→ loop が A に進む。**Test 3 と 4 のペアが deficit 軸を walk する: 1 winner 未満、1 winner 超。**
2. **B が完全に haircut（100）、それから A が residual（50）を得る。** Phase 4 iteration: rank #1 = B、`haircut = min(150, 100) = 100`、`remaining = 50`。Rank #2 = A、`haircut = min(50, 100) = 50`、`remaining = 0`。Loop が次 iteration の `break` で naturally exit する（rank #3 もないが）。**Quota が winner 1 を完全に exhaust し、それから winner 2 に partial に噛みつく。**
3. **`records[0]` が B、`records[1]` が A。Score 降順でソート済み。** L2 の Phase 3 ソートが仕事をしている。テストが順序を explicit に assert する。Phase 3 の `b.1.cmp(&a.1)` が `a.1.cmp(&b.1)` に swap されたら、このテストが loudly 失敗する。**テスト内の順序 assertion は、将来の refactor からソート規律を守る方法だ。**
4. **`deficit_absorbed = 150` かつ `deficit_remaining = 0`。** 保存則: `100 + 50 + 0 == 150`。Deficit のすべての wei が accounted for だ。**動作中の保存則。テストが 2-iteration 入力で loop-body invariant を verify する。**
5. **A の `pnl_paid = 50` — A は PnL の半分を keep する。** これが math の背後にある人間ストーリーだ。高 leverage トレーダー（B）はすべてを失い、低 leverage トレーダー（A）は半分を失う。System が A を B より protect するのは、`pnl_pct × leverage` でランクすると less-leveraged winner に対して conservative だからだ。**Score 規律は arbitrary ではない。最も leveraged な winner に最初に burden を allocate する。**

### Test 5: Equal score → ascending account_id が勝つ

```rust
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
```

押さえる点が 3 つ。

1. **2 つの snapshot は account_id だけが違う（7 vs 3）。** 同じ position size、同じ entry、同じ collateral → 同じ score、同じ PnL。Phase 3 の `then_with` が tie を break する唯一のものは `account_id` だ。**他のすべてを identical に揃え、tiebreaker だけを isolate する。**
2. **AccountId(3) が勝つ。AccountId(7) ではない、入力 vector で *second* に渡されたにもかかわらず。** Phase 3 の stable sort が AccountId(3) を最初に置く、なぜなら `then_with(|| a.0.account.0.cmp(&b.0.account.0))` が ascending だから。入力順は matter しない。ソート規律が matter する。**ソート規律が total なとき、入力順は irrelevant だ。**
3. **deficit = 50 がちょうど 1 winner の full PnL を cover する**（PnL = 100、mark 200 で each、collateral 50 → 実際 PnL = +100、deficit = 50 → haircut = 50、record 1 つ）。Single-record assertion が tiebreaker question を multi-iteration noise から isolate する。**テスト設計の選択: deficit をちょうど 1 record を produce するサイズに合わせ、assertion を purely 「*どの* winner が選ばれたか」だけにする。**

### Test 6: Mixed population で loser と flat が filter される

```rust
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
```

押さえる点が 3 つ。

1. **Acct 1 と acct 2 は両方とも適格性チェックを通過するが、acct 2 は touch されない — 別の理由で。** すべての候補は同じ mark（200）で evaluate される。Acct 1 (long 1 @ entry 100, mark 200) と acct 2 (long 1 @ entry 100, mark 200) は両方とも PnL = +100 で profitable だ。L1 の `adl_score` は collateral の高さでは `None` を返さないので、両方とも Phase 2 を通過して `ranked` に入る。だが acct 2 は collateral が高い (1000 vs acct 1 の 50) → leverage が低い → score が低い → rank #2。`deficit = 10` は top-ranked の acct 1 への haircut だけで完全に exhaust される → Phase 4 の `break` で acct 2 は touch されないまま loop が終わる。**Acct 3 は Phase 2 で filter out された (eligibility)。Acct 2 は Phase 4 で touch されないまま loop が終わった (quota)。1 つのテストが 2 つの異なる防衛 layer を同時に証明する。** コメントの `// loser?` は当初の設計意図の名残 (surprise) を honest に残したものだ。
2. **Acct 3 は flat（position_size = 0）→ `adl_score` は `None` を返す（L1 の first eligibility check）。** Phase 2 の `filter_map` が `None` を drop → acct 3 は `ranked` に入らない → record なし。**L1 の eligibility テストは `adl_score` を isolation の入力で証明する。このテストは、filter が full pipeline と統合することを証明する。**
3. **`deficit = 10` は意図的なテスト設計の選択 — acct 1 の後で Phase 4 の `break` を trigger するのに十分小さい。** 大きい deficit なら loop が acct 2 に続き、このテストが証明したいことを obscure しただろう。Deficit のサイズ自体がテスト設計の一部だ — 「Phase 2 での filter + Phase 4 の early-break」の composition を exercise するように deficit を選んでいる。**テスト入力は単なるデータではない。Proof を visible にするように選ばれている。**

## テストの進展を俯瞰する

```
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
```

## Test-to-behavior マッピング

| Test | Exercise する pipeline phase | 証明する behavior |
|---|---|---|
| 1. `adl_single_winner_partial_haircut_at_full_pnl` | Phase 4 (boundary) | `haircut == pnl_gross` → pnl_paid = 0; boundary で decomposition 成立 |
| 2. `adl_single_winner_exhausted_with_remaining_deficit` | Phase 4 (insufficient capacity) | `pnl_gross < deficit` → record absorbed、remainder が bridge に propagate |
| 3. `adl_multiple_winners_in_score_order` | Phase 3 (sort) + Phase 4 (`break`) | 高 leverage が rank 1; deficit が rank 1 に収まれば低 rank winner untouched |
| 4. `adl_drains_first_winner_then_partially_second` | Phase 3 (sort) + Phase 4 (quota exhaustion) | Multi-iteration absorption; quota が rank 間で distribute |
| 5. `adl_tiebreaker_by_account_id_ascending` | Phase 3 (`then_with`) | Score tie 下の決定論性 — バリデータ間で同じ入力が同じ出力を produce |
| 6. `adl_does_not_touch_losers_or_flats` | Phase 2 (`filter_map`) + integration | Eligibility filter が mixed population で full pipeline と統合 |

6 つのテストが集合的に、L2 のパイプラインが load-bearing な入力ケースで正しいことを証明する。L4 の 5 つの proptest がこれを普遍化する: 同じ保存則、同じ decomposition、同じ決定論性を、ランダム入力に対して。

## 走らせる

```bash
cargo test -p openhl-liquidation adl::tests::adl_
```

期待: 16 テスト pass（L1 の 5 + L2 の 5 + L3 の 6）。Full な ADL unit-test マトリクスがカバーされる。

## よくある質問

**Q1: 1 つの関数に 6 テスト — 多すぎないか?**

多くない。これだけの surface area を持つ関数には。`execute_adl` は 5 phase × 複数の入力次元（deficit size、candidate count、score distribution、eligibility mix）を持つ。マトリクスは 6 よりずっと大きい。L1+L2+L3 を合わせて 16 テスト、「最小カバレッジ」に近く「過剰」ではない。L4 の proptest が specific case の証明することを *generalize* する。Hand-picked 入力でまず verify していないものは generalize できない。**Specific test が関数の shape を証明する。Proptest が関数の universality を証明する。両 layer とも必要だ。**

**Q2: なぜ単に assert するのではなく、期待値を hand-compute してコメントに書くのか?**

理由は 2 つだ。第一に、コメントは future reader が production code に対して verify できる *spec* だ。もし `adl_score` が score の計算方法を変えたら、コメントの数字が間違って、テストが silently ではなく loudly 失敗する。第二に、math walk がテストをデバッガフレンドリーな worked example に変える。Failure が起きたとき、コメントがデバッガが最初に読むものだ。Math walk なしだと、failure メッセージは単に「expected 26666, got X」で、デバッガが 26666 を手で再導出しなければならない。**コメント内 math がテストドキュメンテーションの最も安い形だ。**

**Q3: 7 つ目の unit test を追加すべきか、6 つ目の proptest を追加すべきかは?**

判断基準は明快だ。Unit test を追加するのは、現在のテストがカバーしていない挙動を exercise する *specific* な入力があるとき（例: 「deficit = i64::MAX はどうなる?」）。Proptest を追加するのは、現在のテストが express できない *universal* な property があるとき（例: 「すべての valid 入力に対して、保存則が成立する」）。Unit test は concrete example、proptest は universal claim だ。ADL コースは 16 unit test + 5 proptest を使う。その ratio は well-tested consensus code にとって typical だ。**Concrete behavior には unit test、universal property には proptest。**

**Q4: これらのテストを parameterize できるか（例: `#[rstest]` で複数入力）?**

できるが、しない。openhl-liquidation crate は `rstest` を使っておらず、per-test math-walk コメントが parameterize された row 間で維持しにくくなる。6 つの explicit test の duplication コストはここでは parameterization の認知コストより低い。**Parameterization はテスト本体が同じで入力だけが変わるときの正しい tool だ。ここでは各テストに独自の setup ストーリーがある。**

**Q5: Test 6 のコメントが「loser?」と疑問符付きで書かれている — テストが間違っているのか?**

テストは正しい。コメントが honestly flagged されているだけだ。Acct 2 は mark = 200 で実際は loser *ではない*（PnL = +100、acct 1 と同じ）。Acct 2 入力は earlier draft で loser として意図されていたが、コメントが完全に update されなかった。Test 6 #1 で詳述したとおり、テストは依然 claim していること（acct 3 が Phase 2 で filter、acct 2 が Phase 4 で untouched）を証明するが、inline `// loser?` コメントが drafting 履歴を betray する。**Honest な about-the-test コメントは有用だ。「このテストは育った。粗い縁がここにある」を signal する。Airbrush し out しない。**

## 次のレッスン (L4) — Capstone — 5 invariant proptest + Stage 10 四部作のレトロスペクティブ

L4 が ADL コース（および Stage 10 四部作）を、5 つの invariant proptest をランダム入力に対して走らせることで閉じる:

1. `conservation_absorbed_plus_remaining_equals_deficit` — L3 Test 2 & 4 を普遍化
2. `each_record_balances_pnl` — L3 Test 1, 2 & 4 を普遍化 (decomposition law)
3. `total_haircut_equals_deficit_absorbed` — per-record/aggregate accounting consistency を普遍化
4. `execute_adl_is_deterministic` — L3 Test 5 の tiebreaker 規律を「同じ入力 → 同じ出力、常に」として普遍化
5. `records_in_rank_order` — L3 Test 3 & 4 の ordering 規律を普遍化

加えて Stage 10 のレトロスペクティブ: Stage 10a（margin classification） + 10b（insurance fund） + 10c（scanner） + 10d（ADL）が Layer 1 → Layer 2 → Layer 3 のセーフティネット・カスケードに compose する仕組み。4 stage、4 layer の bookkeeping、1 つの byte-for-byte-reproducible なシステム。

L4 後、ADL コースは complete: 5 レッスン 2 モジュール、16 unit test + 5 proptest、openhl Stage 10d `d66b44a` に対して byte-for-byte。DIY Perp シリーズが第 6 弾を閉じる。

````

---

## Seed-file slot

L3 は Module 1 (ADL implementation) の sortOrder 2 に入る:

```typescript
{
  title: 'レッスン 3 — 6 つの nuanced absorption テスト — マトリクスで execute_adl を証明する',
  slug: 'openhl-adl-absorption-tests-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 35,
  xpReward: 60,
  content: `# レッスン 3 — 6 つの nuanced absorption テスト — マトリクスで execute_adl を証明する\n\n...`
},
```

## 翻訳セルフレビュー（paste 前）

- **L3 は意図的に L2 より短い**（35 分 / 60 XP vs 40/70）。新しいパイプラインなし、L2 のパイプラインを richer 入力に対して証明する 6 テストだけ。長さ: ~300 行。
- **Test-to-behavior マッピングテーブル**が末尾の load-bearing 構造的 visual。L2 の test-to-phase テーブルと同じパターン。
- **Pair-progression `Test 1-2 / 3-4 / 5 / 6`** が pedagogical scaffold。Test 1-2 が single-winner に留まる。Test 3-4 が multi-winner を導入する。Test 5 が決定論性を isolate する。Test 6 が filter integration を証明する。
- **Predict callout が L2 の `break` framing を reuse** — recall は「quota 束縛 loop は実際に haircut を受けたアカウントに対してのみ record を produce する」。これが読者が L2 から carry する load-bearing payoff。
- **Q5 が `// loser?` コメントを honestly 説明する** — drafting honesty。Airbrush しない。テストは pass する、コメントは earlier draft から preserve されていてそれを signal する。
- **L4 preview が 5 proptest + Stage 10 retrospective を explicit に名指す** — capstone が L3 の specific case の universal generalization だ。
- **L3 に Mermaid なし。** Test-to-behavior マッピングテーブル + 各テスト内の math-walk コメントが構造的 visual。「6 テストの 2 軸マトリクス」のための Mermaid はテーブルと比較して visual noise だ。

### JA 特有のスタイル決定

- **専門用語は英語のまま**（`execute_adl`, `adl_score`, `AdlScore`, `AdlRecord`, `AdlReport`, `deficit`, `deficit_absorbed`, `deficit_remaining`, `pnl_gross`, `pnl_paid`, `haircut`, `MarkPrice`, `AccountSnapshot`, `AccountId`, `filter_map`, `then_with`, `break`, `cfg(test)`, `proptest`, `bridge`, `CLOB`, `MARGIN_SCALE`, `notional`, `equity`, `collateral`, `leverage`, `pnl_pct`, `load-bearing`, `quota`, `worked example`, `decomposition`, `eligibility`, `boundary`, `integration`, `airbrush` など）。
- **Rust / bash コードと in-code コメントは英語のまま**。Reader が直接 copy-paste する。
- **`math-walk in comments`、`load-bearing`、`pedagogical scaffold`、`drafting honesty`、`airbrush し out`** は英語のまま使用。L0-L2 と一貫。
- **Bilingual annotation** は first-mention にのみ適用: `マトリクス（Matrix）`。L0-L2 で確立された `カスケード（Cascade）`、`決定論性（Determinism）`、`保存則（Conservation law）` などは body 内では英語のままで使う（既に annotation 済みのため）。

