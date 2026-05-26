# Building OpenHL Liquidation — L13 draft (JA) — build-along

> openhl SHA `0a8464e`（Stage 10c — multi-account liquidation scanner）に対するドラフト。

## L13 — `openhl-liquidation-scanner-capstone-ja`

**Stage**: Stage 10c — `0a8464e`

**Title**: レッスン 13 — Scanner capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Stage 10 retrospective

**Duration**: 40 分 · **XP**: 80

---

````markdown
# レッスン 13 — Scanner capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Stage 10 retrospective

## ゴール

このレッスンで掴む概念:

- **6 個の nuanced unit test は 4×2 行列を成す。** 4 つの outcome（solvent-close、fully-covered-underwater、partial-drain-underwater、depleted-underwater）× 2 つの batch shape（single-account-batch、multi-account-batch）。Mixed-batch test が明示的な 4-state 証明、FIFO test が multi-underwater の fairness 証明。**両者を合わせれば、L6 分類・L10 close-outcome・L8/L9 fund 操作の間で reachable なすべての相互作用が exercise される。**
- **4 個の proptest は型システムが encode できない不変条件を encode する。** Fund 会計が閉じる（`before + deposits − withdrawals = after`）。Unfilled deficit が存在すれば fund は空（`unfilled > 0 ⇒ balance == 0`）。Record 数は input 数で bound される（`|records| ≤ |accounts|`）。決定性が成立する（`scan(同じ入力) ≡ scan(同じ入力)`）。**いずれも scanner が、あらゆる scan・あらゆる block・あらゆる validator で守らねばならない契約だ。**
- **保存則は crate を縦に compose する。** 3 つの層、3 つの恒等式、1 つの数学的物語:

  ```
  L9  (single fund call):       amount + unfilled                    = shortfall
  L10 (single position close):  fee_to_fund + residual_to_account    = post_close_equity
  L13 (per-block scan batch):   balance_before + Σ deposits − Σ withdrawals = balance_after
  ```

  **各層の保存則が次の層の invariant に consume される。Crate の数学が閉じる。**
- **Stage 10 は *3 つの* stage と *1 つの* trilogy だ。** Stage 10a（margin math）は pure-compute な分類器を構築した。Stage 10b（insurance fund + close-outcome 分解）は state と credit/debit 分解を導入した。Stage 10c（multi-account scanner）が両者を 1 つの orchestration loop で結ぶ。**L13 が trilogy を閉じる。69 テスト、4 modules、`0a8464e` と byte-for-byte 一致。**

確認:

```bash
cargo test -p openhl-liquidation
```

…で 69 テストが pass する（compute 34 + insurance 21 + scanner 14 = 10 unit + 4 proptest）。Liquidation crate が Stage 10c 答え合わせに対して *完成* する。

> **テスト数についての注記:** L11 と L12 の次レッスン preview で「68 件」と書いたが、off-by-one だった。実際の L13 は 6 個の nuanced unit test を加える（5 個ではない）。FIFO-fairness test が mixed-batch test とは別の独立した test だからだ。正しい合計は 69 件。（カスケード数学の推論には影響しない。）

具体的な変更:

- **`src/scanner.rs`。** L12 の 4 個の simple test の後ろに 6 個の nuanced unit test、test モジュールの末尾に 4 個の invariant proptest を含む `proptest!` ブロックを追加。

L13 後、Liquidation コースは完成する。Stage 10d（ADL）は openhl の次のロードマップ項目だが、別コースになる。

## おさらい

L12 の後:
- `scanner.rs` には型語彙（L11）、`scan` メソッド（L12）、skip path を扱う 4 個の simple unit test が揃う。
- `cargo test` は 59 テストを走らせ、すべて green。
- Scanner は *動く* — iterate し、classify し、dispatch し、mutate し、aggregate し、return する。だがこれまでのテストがカバーするのは「skip」ケースだけ。4 つの「work」outcome — solvent、fully-covered、partial-drain、depleted — には per-scan の assertion がまだない。

L13 でそのギャップを埋め、不変条件を proptest で lock し、Stage 10 retrospective で一歩引いて全体を眺める。

## 計画

編集は 3 つ:

1. **既存の `#[cfg(test)] mod tests` ブロックに 6 個の nuanced unit test を追記する。**
2. **Test モジュールの末尾に `proptest!` ブロックを追記する。** 4 つの invariant プロパティ。
3. **`cargo test` で verify する。** このコミット後、Liquidation crate は `0a8464e` と byte-for-byte 一致する。

> 🛑 **予測。** 続きを読む前に考えてほしい。1 件の liquidation が引き起こす「fund state の遷移」を 4 つ挙げ、それぞれを駆動する `WithdrawOutcome` variant または `deposit` 呼び出しとペアにする。次に: それらのうち *どれが* `Solvent` 入力（`Liquidatable && post_close_equity ≥ fee`）では起こり得ないか?

（答え: **4 つの遷移**は (a) `+fee` のみ（solvent close — `deposit`、withdraw なし）、(b) `+fee_partial − shortfall_full`（positive equity を持つ underwater — `deposit` + `Covered` を返す `withdraw_shortfall`）、(c) `0 − shortfall_partial`（既に underwater で fund が partial drain — `PartiallyDrained` を返す `withdraw_shortfall`）、(d) `0 − 0_with_unfilled`（fund が空の underwater — `Depleted` を返す `withdraw_shortfall`）。**遷移 b、c、d は Solvent 入力では起こり得ない。** L10 の `debug_assert!` が発火する。Solvent 入力は遷移 (a) だけを駆動する。**4 つの nuanced unit test が遷移 a、b、c、d を exercise する。5 つ目（mixed batch）と 6 つ目（FIFO）が、orchestration loop が multi-account batch を正しく処理するかを verify する。**）

Scan-coverage 行列:

```
   ┌─────────────────────────────────────────────────────────────┐
   │  Test coverage 行列 — Stage 10c                                │
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
```

行列で押さえる点が 2 つ:

1. **Single-account 列が 4 つの outcome すべてを cover し、multi-account 列は *interesting な複合ケース*（混在 health state + FIFO fairness）だけを cover する。** 「multi-account Solvent」test は要らない。Per-account の挙動は両列で同じだからだ。Orchestration loop は iteration 2 でも iteration 1 と同じ動きをする。**多重性が導入されたときの *新しい* 振る舞いをテストする。すでに証明されたものを繰り返さない。**
2. **4 個の proptest は *cross-cutting* — すべての outcome、すべての batch shape に適用される。** だから行列に入らない。直交している。**Unit test は特定の点を verify する。Proptest は全点の *形* を verify する。**

## 手を動かす walk-through

### Step 1: 6 個の nuanced unit test を追加

既存の `#[cfg(test)] mod tests` ブロック内、L12 の 4 個の simple test の後に 6 個の nuanced ケースを追記する。テストは single-vs-multi-account と outcome でグルーピングしてある。

#### Test 1: Solvent close が fee を deposit

```rust
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
```

押さえる点が 5 つ:

1. **コメントブロックが数学をプリミティブから step-by-step で walk する。** notional → fee → pnl → equity → ratio → 分類 → routing 判断 → 出力。失敗したテストを debug する読者は、このコメントを読んで snapshot の 4 入力から期待値を再導出できる。**数学を walk するコメントは、1 つの test を Stage 10a + 10b パイプライン全体の worked example にする。**（バインド名についての細かい注記: テストは `let mut s = LiquidationScanner::...` を導入し、*さらに* `match` arm 内で `CloseOutcomeKind::Solvent(s)` を使って `s` を shadow している。Arm 内では `s` は `SolventClose` payload を指す。Arm が閉じた瞬間、外側の scanner `s` が再び scope に戻る — だからこそ 2 行後の `s.fund_balance()` が動く。これは意図的な Rust イディオムだ — match arm 内の shadowing は scope-bounded だ — が、新しい読者は二重 binding を正体として認識すべきだ。）
2. **選ばれた数字 — entry=1_000、collateral=20、mark=999 — は ratio（190 bps）が maintenance（200 bps）のすぐ下に着地する *境界ケース*。** 不等号を flip させた bug（`>` の代わりに `>=` など）が 190 を間違ったバケットに落とす。**境界の入力は、分類 predicate での off-by-one を捕える test を作る。**
3. **`outcome` への `match` は別 variant に `panic!("expected Solvent")` を使う。** 失敗メッセージは *期待する* variant を名指す。失敗ログを読む将来の読者には、どちらの分岐を狙ったかが即座に分かる。**Panic メッセージは「想定外の variant」ではなく「期待した variant」を名指す。**
4. **`ScanReport` の 4 フィールドすべて + `fund_balance()` を assert する。** Per-record の `outcome` がすでに含意していても、aggregate フィールドもチェックする。なぜか。L11 の設計契約が aggregate を first-class と宣言した以上、集計の数学を破る regression は、per-record の分解を破るものとは別の bug クラスだからだ。**Aggregate フィールドと per-record フィールドは別々の assertion を得る。別々の invariant だからだ。**
5. **`s.fund_balance() == 14` で fund が実際に mutate したことを証明する** — report が claim しただけではない。Fund は *state* であり、derivation ではない。別途読み直すことで「report が嘘をついていない」を確認する。**State 変更は call 後の別 read を要する。それを describe する report は独自の assertion を要する。**

#### Test 2: Underwater、fund が完全 cover

```rust
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
```

押さえる点が 4 つ:

1. **Perp Primer L3 シナリオが本コース 4 度目の再登場**: $100k entry、$10k collateral、$80,500 close、$19,500 PnL、$9,500 負 equity。数字は L10 の `fee_basic`、L10 の `underwater_close_already_underwater_pre_fee`、そしていま L13 の scanner-level test を貫く。**Curriculum reinforcement は複利化する。L13 までに読者は数字を再導出せずに認識する。**
2. **`fee_to_fund == 0`** — scanner レベルで確認する。L10 の契約は「fee 前に負の equity → fee は徴収されない」と言った。L13 では、契約が orchestration 層を通過しても保たれているかを verify する。**Cross-layer の契約テストは、orchestration が下位層の保証を *壊さない* かを verify する。**
3. **`fund_deposits == 0` AND `fund_withdrawals == 10_707`** — aggregate フィールドは *deposit ゼロ*（`fee_to_fund == 0` だから）と *full withdrawal*（fund が十分にあったから）を示す。2 つの aggregate が揃って完全な balance-flow の物語を描く。**Aggregate フィールドは bridge の read-once な telemetry。正確であるべき。**
4. **`s.fund_balance() == 20_000 - 10_707`** — scan 後の fund balance は input から計算し、リテラルとしては assert しない。こうすると test が self-documenting になる。読者は `20_000 - 10_707` を見て、各数字がどこから来たか分かる。**Assertion 内の算術式は、hardcoded リテラルよりもテスト自身を説明する。**

#### Test 3: Underwater、fund が partial drain

```rust
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
```

押さえる点が 3 つ:

1. **Test 2 と同じ snapshot を再利用する。** 違うのは fund balance だけ — $20k vs $5k。読者は Test 2 と Test 3 を背中合わせに読み、fund サイズが何を *正確に* 変えるか見られる。**同じ入力をテスト間で再利用すれば、影響する入力軸が isolate される。**
2. **Test 2 より少ない assertion。** 最も変わる 3 つの値（`fund_withdrawals`、`unfilled_deficit`、`fund_balance`）だけを assert する。Classification、per-record outcome、account ID — Test 2 ですでに証明されたもの — は再 assert しない。**先行する test と setup を共有する test は、差分だけを assert する。**
3. **`unfilled_deficit == 10_707 - 5_000`** — また算術式。読者は `shortfall − available = unfilled` を見て、保存則 `paid + unfilled = shortfall` を即座に掴む。**Assertion 内の代数的表現は、assertion 自体と並行して invariant を教える。**

#### Test 4: Underwater、fund が既に depleted

```rust
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
```

押さえる点が 3 つ:

1. **`new(0)` ではなく `with_empty_fund`** — call site の named constructor が「empty fund」と語る。「balance 0 の fund」ではない。テストを読めば意図が即座に見える。**テスト call site での named constructor は documentation だ。**
2. **`fund_withdrawals == 0`** — *full shortfall ではない*。L8 の `Depleted` variant は `(0, unfilled)` を返す。Fund は *0* を支払い（何もなかったから）、*full* shortfall を escalate する。Aggregate フィールドはこの区別を preserve する。**`Depleted` と `Covered { amount: 0 }` は別の outcome。Aggregate は異なる数を見せねばならない。**
3. **テストは Test 2 と Test 3 より短い。** Assertion が少なく、setup がシンプル、narrative がクリーン。Depleted state はカスケードの「崖の端」 — Stage 10d（ADL）が発火する境界だ。**Edge-case test は terse であるべき。*その存在自体* が価値の大半。**

#### Test 5: Mixed batch が unhealthy アカウントのみを処理

```rust
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
```

押さえる点が 6 つ:

1. **1 つのスライスに 4 アカウント — それぞれが異なる `MarginHealth` state に着地するよう calibrate してある。** Account 1 → Safe、2 → AtRisk、3 → Liquidatable、4 → Underwater。スライスは L6 分類カスケードの *すべての* arm を 1 回の呼び出しで exercise する。**Mixed-batch test は分類カスケードの完全性を verify する最も安い方法。**
2. **`report.records.len() == 2`** — *4 ではない*。Safe と AtRisk は record を生まない。Liquidatable と Underwater だけが生む。Test は AtRisk を liquidation trigger に誤分類する future bug を捕える。**Filter された出力での length assertion は orchestration レベルの「wrong filter」bug を捕える。**
3. **`report.records[0].account == AccountId(3)` と `[1].account == AccountId(4)`** — record は *input 順序* を preserve する。Account 3 が account 4 より先にスライスに現れ、record も同じ順序で並ぶ。L11 のモジュール doc が定めた FIFO 順序ポリシーだ。**Ordered iteration → ordered records。Policy は test が enforce する。**
4. **数学コメントは *per-account*。Per-test ではない。** 各アカウントが自分の分類数学を inline で得る。**Mixed-batch test では、数学コメントはそれが描くアカウントの隣に住む。**
5. **`InsuranceFund::new(1_000)` — 非空 fund。** $1,000 の fund はこの batch の任意の solvent fee と任意の小さい underwater shortfall を cover する。Fund-state の mutation は validate されるが、test の primary point ではない。Primary point は *分類 + filtering* の挙動だ。**1 つのテスト、1 つの primary point。Fund state はここでは incidental。**
6. **`fund_deposits` / `fund_withdrawals` / `unfilled_deficit` への assertion なし。** これらは per-account outcome（record が運ぶ）から derive される。Assert すれば test #1-#4 のカバレッジと重複する。Mixed-batch test は *新しい* 振る舞い — multi-account orchestration — に focus すべきだ。**新しい振る舞いを assert する。すでにカバー済みのものは再 assert しない。**

#### Test 6: Multi-underwater partial drain での FIFO fairness

```rust
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
```

押さえる点が 5 つ:

1. **2 つの *同一* underwater アカウント。** 同じ entry、同じ collateral、同じ close mark。違うのは iteration position だけだ。同一にしておけば、テストは *fairness policy* — FIFO — を outcome の差を決める唯一の要素として isolate できる。**Iteration をまたぐ同一入力は policy 変数を isolate する。**
2. **Fund balance（$12,000）が *ちょうど* `1 つ目の shortfall + 2 つ目への partial payment`** — $10,707 + $1,293 = $12,000。読者には、fund が *正確に* 1 つ目の underwater アカウントで底をつき、部分残額が 2 つ目に渡るのが見える。**慎重に選んだ fund balance が fairness policy を assertion で可視化する。**
3. **`fund_withdrawals == 12_000`** — 両アカウントを跨いだ *合計* 引き出し。Aggregate フィールドは「1 つ目が 10,707、2 つ目が 1,293」を区別しない。合計だけを見せる。**Aggregate フィールドは要約する。Per-record フィールドが区別する。**
4. **コメントが算術を explicit に含む** — `10_707 + 1_293`。失敗を debug する読者は unfilled-deficit の数値から FIFO ルールにたどり着ける。**FIFO 算術を見せる test コメントは、policy を監査可能に保つ。**
5. **`unfilled_deficit == 10_707 − 1_293` の assertion は、Stage 10d が consume する *唯一の* シグナルだ。** 次の stage（ADL）は、この `9_414` shortfall を cover するに足るだけの profitable counter-position を force-close する。L13 の test が、Stage 10d が read する契約を固定する。**Per-stage handoff の test は、次の stage が consume する契約を固定する。**

### Step 2: 4 個の invariant proptest を追加

6 個の unit test の後に `proptest!` ブロックを追記する。ブロックはランダムな `(collaterals × mark × initial_fund)` triple で 4 つの cross-cutting invariant を exercise する。

```rust
    // ─── proptest: invariants ──────────────────────────────────────

    proptest! {
        /// The scanner's `fund_balance` after a scan equals the prior
        /// balance plus `fund_deposits` minus `fund_withdrawals`.
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

        /// `unfilled_deficit > 0` implies the fund was insufficient at
        /// some point during the scan, which implies `fund_balance == 0`
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
```

4 つの proptest が揃って *orchestration 層の invariant* を encode する。それぞれが契約だ。

#### Proptest #1: `fund_balance_delta_matches_report`

**Fund の保存則。** `before + ∑deposits − ∑withdrawals = after`。L8 の invariant（`balance ≥ 0`）は per-call の主張だった。L13 でこれを scan 全体に拡張する。Report が claim する deposit はすべて fund balance に現れねばならない。Withdrawal も同じ。**この proptest が pass すれば、report と fund は何が起きたかについて agree している。**

押さえる点が 3 つ:

1. **算術は `saturating_add` と `saturating_sub`** で、scanner 自身の算術と一致する。Saturation なしだと、proptest は input をもっと厳しく bound するか「property は成立しない」を accept するしかない。**Proptest の算術は production コードの算術と一致しなければならない。**
2. **入力範囲（`1..1_000_000`）は `i64::MAX` のはるか下に bound してある** — property が *素直に表現できる* ようにだ。Operating range では saturation が実際に発火することはない。Proptest は依然として `saturating_add` 相手に動く。範囲内では saturation が no-op だからだ。**Proptest input は、property が最もシンプルな形で成立する範囲に bound する。Saturated 形ではない。**
3. **`mark in 50..150`** — entry 価格を $100 と仮定した周辺の 50-150% 範囲で、Safe / Liquidatable / Underwater 条件の両方を sweep する。**Mark 範囲は分類が気にする境界をまたいで sweep すべき。**

#### Proptest #2: `unfilled_implies_empty_fund`

**Fund-exhaustion 契約。** Report に `unfilled_deficit > 0` が現れたら、fund は終了時に *必ず* 空でなければならない。これで「unfilled は存在するが fund はまだ money を持っている」という矛盾型の bug が捕まる。契約が成立するのは、L9 の `withdraw_shortfall` が unfilled deficit を report する前に fund を 0 まで drain するからだ。**L9 の per-call 契約が per-scan の invariant に scale する。**

押さえる点が 3 つ:

1. **Proptest body 内の `if report.unfilled_deficit > 0 { ... }` filter。** Unfilled が存在するケースだけが assertion を発火させる。Fund がすべてを cover できたケースは valid な「assertion が発火しないケース」だ。**Proptest 内の条件付き assertion は「X が true なら Y も成立する」の表現方法。**
2. **入力範囲が *adverse* — `mark in 50..70`。** Entry $100 の long position は mark $50-70 で深刻な損失に直面し、underwater outcome が起こりやすくなる。これで test は `unfilled > 0` 分岐をトリガする方向に bias する。**Proptest input は *interesting な* 条件をトリガする方向に bias すべき。さもないと、ほとんどのケースが assertion を静かに skip する。** これが *proptest の密度（density）問題* だ: `mark in 50..150` のような広い範囲だと、ランダム入力の大多数が Safe か Solvent に着地し、条件付き assertion は一度も発火しない。Proptest のデフォルト 100-250 iteration を通じて *プロパティは実際にテストされないまま pass する* — 見えない dead-code test だ。Assertion が実際に発火する regime に向けて入力を bias する。さもないと、プロパティテストは何もテストしていない。
3. **`initial_fund in 0..5_000` — 下の範囲で cap してある。** Fund は予想される aggregate shortfall（underwater account 数で scale する）に対して不十分にサイズされる。**予想される shortfall より下に fund をサイズすれば、unfilled deficit の可能性が最大化される。**
4. **L13 では `prop_assume!` 多用よりも Strategy 側の事前バイアスを優先する。** このプロパティの目的は `unfilled > 0` 分岐を高密度で発火させることなので、生成器を最初から adverse 領域へ寄せるほうが効率が良い。こうすると reject 数が抑えられ、`TooManyAssumptions` のリスクも下がる。**数理前提を明示したいときは L5 のように `prop_assume!`、発火密度を作りたいときは L13 のように Strategy で先に寄せる**、という使い分けが本コースの規律だ。

#### Proptest #3: `records_count_bounded_by_accounts`

**Cardinality bound。** Scanner は input account 数を超える record を生めない。Safe と AtRisk は record をゼロ寄与する。Liquidatable と Underwater はそれぞれちょうど 1 record を寄与する。**Orchestration loop は record を無から *生む* ことも、アカウントごとに *増幅する* こともできない。**

押さえる点が 2 つ:

1. **Assertion は `<=`、strict な `<` ではない。** すべての account が unhealthy なら、record 数 *は* account 数と等しい。Bound は non-strict だ。Zero-skipped-account も valid なケースだからだ。**Cardinality bound は通常 `<=`。Strict `<` は全 unhealthy ケースを誤って reject する。**
2. **Proptest は scan あたり最大 20 account をカバー** (`vec(..., 0..20)`)。他の proptest より大きい。Cardinality bound は scale で違反しやすく、test するのが最も安いからだ。**Invariant が linearly scale する場所では、proptest でより大きい collection を使う。**

#### Proptest #4: `scan_is_deterministic`

**Validator-consensus 契約。** 同一 state と同一 input を持つ 2 つの scanner は byte-identical な出力を生まねばならない。この proptest が落ちたら、scanner には非決定性がある。そしてコンセンサスチェーンで非決定性は fork を意味する。**このコース全体で最も load-bearing な test だ。**

押さえる点が 4 つ:

1. **Proptest は 1 つではなく *2 つ* の scanner を構築し、同じ input を両方に通す。** 同じ scanner が 2 回 scan すると、2 回目の state が 1 回目から何かを inherit して非決定性を mask しうる。Fresh な scanner 2 つなら、`InsuranceFund::new(initial_fund)` reset を生き延びる state を catch できる。**決定性テストは毎 run で independent state を使わねばならない。**
2. **Assertion は *両方* `report == report` AND `fund_balance == fund_balance` に対して行う。** 決定的な report を生むが非決定的な fund-balance 変化を持つ scanner は、report-only test を pass する。だが本当の bug だ。Two-way assertion なら両方 catch できる。**決定性テストはあらゆる observable な side effect に対して assert する。**
3. **`ScanReport` の `PartialEq` が *このテストを可能にする*。** L11 の derive `#[derive(Clone, Debug, PartialEq, Eq, Default)]` が `prop_assert_eq!(r1, r2)` の compile を可能にする。`PartialEq` なしでは、この proptest は書けない。**標準 derive trait が標準 test pattern を unlock する。Eagerly derive する。**
4. **`Hash` derive は不要。** 決定性テストは `==` で比較するだけで hashing しない。`Hash` はこのテスト（とほとんどの test）には冗長だ。**Test が実際に要求するものを derive する。Defensively に `Hash` を derive する誘惑には抵抗する。**

### Step 3: テストを走らせる

```bash
cargo test -p openhl-liquidation
```

期待される出力（短縮版）:

```
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
```

**69 テスト pass。Liquidation crate は `0a8464e` と byte-for-byte 一致。** Stage 10c が完成し、Stage 10 — margin math + insurance fund + scanner の trilogy — が *閉じた*。

エラー時にありがちなパターン:

- **`scan_is_deterministic` が時々 flake する** — scanner に隠された非決定性がある。最も一般的な原因: `HashMap` の iterate（順序が変わる）。Stage 10c は `HashMap` を使わない。導入したなら `BTreeMap` か `Vec` に切り替える。**隠れた非決定性は chain-fork リスク。Proptest が mainnet 前に catch する。**
- **`fund_balance_delta_matches_report` が `5000 vs 4999` で失敗** — `saturating_add` の順序での off-by-one。Production コードを再確認: `before + deposits − withdrawals`、この順序。`before − withdrawals + deposits` への反転は算術的には同一に見えるが、実は違う: 中間値の `before − withdrawals` は *一部の呼び出し* で負になりうる。*saturation を欠いた release ビルドでは*、これがサイレントに巨大な正値に *wrap* する — validator ごとに異なる `i64` が生まれ、validator 間の決定性が破壊され、chain が fork する。L12 の順序での saturating arithmetic が安価な防御だ。Proptest こそが、順序を逆にしたときにそれを catch する道具だ。
- **`unfilled_implies_empty_fund` が `unfilled=500, balance=1000` で失敗** — fund が depletes すると scan が early-exit してしまう（後続の underwater アカウントを skip）。L11 設計契約は scan を続けるべきと言う。スライス内の *すべての* underwater アカウントで aggregate すべきだ。L12 の fan-out ロジックを読み直す。
- **`records_count_bounded_by_accounts` が `records=21, accounts=20` で失敗** — どこかで loop が double-push している。最も可能性の高い原因: `report.records.push(...)` を `if`/`else` 分岐 *内部* AND もう一度外で書いている。Loop body を再確認 — push は最後にちょうど 1 回でなければならない。

## 設計の振り返り — Stage 10 trilogy

13 レッスンを通して Stage 10 を形作った load-bearing な決定が 3 つ:

1. **層を成す保存則。** L9 の `amount + unfilled = shortfall`（per call）、L10 の `fee_to_fund + residual_to_account = post_close_equity`（per close）、L13 の `before + ∑deposits − ∑withdrawals = after`（per scan）。各層の法則が次の層の invariant に consume される。Crate の数学が最小単位（1 回の `withdraw_shortfall` 呼び出し）から最大単位（1 回の `scan` batch）まで閉じる。**層を成す保存則こそが、コンセンサス state machine を composition の下で *証明可能に* 正しく保つ方法だ。**

2. **`debug_assert!` ペア + saturating arithmetic を、どこにでも。** Crate 内のすべての関数が両方かどちらかを使う。L10 の dispatch（`solvent_close_outcome` / `underwater_close_outcome`）は debug-assert pair。L8 deposit と L9 withdraw は saturating arithmetic を使う。L12 scan は両方を組み合わせる — routing predicate 経由の debug-assert、report aggregation 経由の saturation。**Dev-assertion + prod-saturation 規律は 1 つの関数から 1 つの crate まで scale する。**

3. **メカニズムの前に語彙、4 回連続で。** L1-L3 が `LiquidationParams`、`MarginRatio`、`MarginHealth`、`AccountSnapshot`、`CloseOrderSpec` を `margin_health` 実装前に宣言した。L8 が `InsuranceFund`、`WithdrawOutcome` を `withdraw_shortfall` 前に宣言した。L10 が `SolventClose`、`UnderwaterClose` を実装中に宣言した。L11 が `CloseOutcomeKind`、`LiquidationRecord`、`ScanReport`、`LiquidationScanner` を `scan` 前に宣言した。パターンがコース全体で一貫しているのは、*語彙が契約を定義し、メカニズムがそれを実装する* からだ。**語彙が先、メカニズムが後。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
```

L13 の後:
- **scanner.rs** は Stage 10c の `scanner.rs` と **byte-for-byte 一致**。ファイル全体 — module-level doc + imports + 4 types + 5 accessor + `scan` メソッド + 10 unit test + 4 proptest — が workspace に揃う。
- **`crates/liquidation/src/` の他のファイル** は L10 以降 byte-for-byte 安定。

**Liquidation コース完成。** Module 0（Orientation、L0） + Module 1（Types、L1-L3） + Module 2（Pure compute、L4-L7） + Module 3（Insurance fund、L8-L10） + Module 4（Scanner + capstone、L11-L13） = 5 modules を跨ぐ 13 レッスンだ。

## よくある質問

**Q1: L13 がなぜ 6 個の unit test で、4 個や 8 個ではないのか?**

Coverage math から落ちる数字だ。Test coverage 行列が 4 outcome × 2 batch shape で、multi-account 列が 4 つの outcome のうち 3 つを mixed-batch test に collapse する。残る 4 つの single-account outcome（Solvent、FullyCovered、PartialDrain、Depleted）にはそれぞれ自分の test が必要。Multi-account 列には mixed-batch test と FIFO-fairness test が必要（identical-account-iteration-order が 2 つの underwater iteration を区別する *唯一の* ものだから）。4 + 1（mixed） + 1（FIFO） = 6。**任意の数ではなく、coverage math。**

**Q2: なぜ L13 は「scanner が batch 中で fund が depleted した後も走る」test を加えないのか?**

すでにカバー済みだからだ。Proptest #2 `unfilled_implies_empty_fund` が scan 中に fund が depletes したときちょうど発火し、unit test #6 `scan_first_underwater_gets_paid_then_second_unfilled` が決定的バージョンを構築する。「mid-batch depletion」専用 test を追加すれば両者と重複する。**6 unit test + 4 proptest がすでにケースをカバーする。冗長 test はノイズだ。**

**Q3: 4 個の proptest を 1 つの mega-property に統合できないか?**

*できる*（`fund_balance_delta_matches_report ∧ unfilled_implies_empty_fund ∧ records_count_bounded_by_accounts ∧ scan_is_deterministic`）。だが各 property は独立に意味を持つ。別々に証明すれば、test 失敗メッセージが *どの* invariant が壊れたかを教えてくれる。Mega-property の `prop_assert!(A && B && C && D)` は「mega-property が落ちた」とだけ言い、どのサブ property かは教えない。**Property レベルの粒度が、失敗時の診断粒度を与える。**

**Q4: なぜ `scan_is_deterministic` は 2 回しか iteration を走らせないのか? Many ではなく?**

2 回で非決定性は catch できる。2 run が違えば、*どれだけ多い* run でも違う。3 run でも同じ bug を catch する。4 run も同じだ。「Many runs」防御は flaky テスト用 — bug が確率的に起きる場合だが、scanner 決定性ではそうはならない（構造上決定的だからだ）。**Property を minimum-multiplicity でテストする。それを超える multiplicity は無駄な iteration。**

**Q5: L13 の test + proptest がテストしないものは何か?**

意図的に外したものがいくつかある。**スコープ外:** (a) `ScanReport` の precise なバイトレイアウト（Stage 10c では in-process のみで使われ、ディスクに serialize されない）、(b) スレッド安全性（`LiquidationScanner` は `Send + Sync`-test されない。Stage 10c は設計上シングルスレッド）、(c) panic-safety（bridge が higher level で panic を扱う）。**スコープ内:** fund state に影響する分類 → routing → 集計のあらゆる path。**L13 の test はコンセンサスが実際に必要とするものを cover する。**

**Q6: Stage 10d（ADL）は L13 scanner から何を consume するのか?**

正確に `ScanReport.unfilled_deficit` — 「これだけの quote 単位の shortfall を fund が absorb できなかった」を意味する i64 だ。Stage 10d は (a) 各 block の scan 後にこのフィールドを read、(b) ゼロでなければ *profitable* な counter-position を決定的な順序で walk、(c) deficit を cover するのに十分な数を force-close する。L13 proptest `unfilled_implies_empty_fund` が、bridge が見るべき *唯一の場所* がこのフィールドであることを *保証* する。他に隠れた escalation signal はない。**Stage 10d は 1 つの数字を得る。それで何をすべきか知っている。**

## Module 4 + Stage 10 retrospective

Liquidation コースの 13 レッスン、表 1 つで:

| # | Module | Lessons | Stage | 何を構築したか |
|---|---|---|---|---|
| M0 | Orientation | L0 | — | コース概観、openhl context |
| M1 | Types | L1, L2, L3 | 10a | `LiquidationParams`、`MarginRatio`、`MarginHealth`、`AccountSnapshot`、`CloseOrderSpec` |
| M2 | Pure compute | L4, L5, L6, L7 | 10a | `notional_value`、`unrealized_pnl`、`account_equity`、`margin_ratio`、`margin_health`、`close_order_spec` |
| M3 | Insurance fund | L8, L9, L10 | 10b | `InsuranceFund` state machine、`WithdrawOutcome` 3-variant enum、`liquidation_fee`、`solvent_close_outcome`、`underwater_close_outcome`、`SolventClose`、`UnderwaterClose` |
| M4 | Scanner + capstone | **L11, L12, L13** | 10c | `CloseOutcomeKind`、`LiquidationRecord`、`ScanReport`、`LiquidationScanner`、`scan` メソッド、10 unit test + 4 proptest |

**69 テスト。4 modules。13 レッスン。openhl コミット SHA 3 つ。** Liquidation crate はいまや完全で決定的で defensively-coded な multi-account orchestration 層であり、openhl bridge が block ごとに 1 回呼んで safety-net cascade を ADL の手前まで駆動できる。

openhl カリキュラムの次のコース — Stage 10d、ADL — は `ScanReport.unfilled_deficit` を唯一の入力として consume し、profitable counter-position を walk し、fund が absorb できなかった分を force-close する。Stage 10d が read する契約こそ、L13 proptest が固定したものだ。

## 次のコース — Stage 10d、ADL（別コース）

L13 は Liquidation コースの *最後の* レッスンだ。Cascade の Layer 3 — ADL（auto-deleveraging） — は別の専用 future コースになる。Handoff は:

1. **Scanner が `unfilled_deficit > 0` を生む。** Fund がすべての underwater shortfall を absorb できなかったときだ（L13 proptest #2 が、これが *唯一の* signal であることを保証する）。
2. **Stage 10d の ADL routine** はこのフィールドを各 block の scan 後に read する。
3. **ADL routine** は *profitable* な counter-position を決定的順序で walk（おそらく `(pnl_pct × leverage)` 降順、`account_id` を tiebreaker として）、順番に force-close、insolvent ポジションに margin を credit back する。
4. **ADL outcome** は別の `AdlReport` 型で、独自の保存則と独自の proptest を持つ。

Stage 10d は openhl のコミット `d66b44a` で実装されている。Rethlab の ADL コースは、レッスンが draft されたら着地する。

````

---

## Seed-file slot

L13 は Module 4 の sortOrder 2 に入る:

```typescript
{
  title: 'レッスン 13 — Scanner capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Stage 10 retrospective',
  slug: 'openhl-liquidation-scanner-capstone-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 13 — Scanner capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Stage 10 retrospective\n\n...`
},
```

## SHA pinning discipline

L13 は `0a8464e`（Stage 10c）のまま据え置き。L13 後、`scanner.rs` は答え合わせと **byte-for-byte 一致**。Liquidation crate は Stage 10c の終わりで *完成*。Stage 10d（ADL、`d66b44a`）は別コース。

## 翻訳セルフレビュー（paste 前）

- **L13 はコース内で最長のレッスン**（40 分）。Capstone status が長さを justify する — 6 個の nuanced test + 4 proptest + Stage 10 trilogy retrospective + Module 4 retrospective。L13 を完了した読者は完全で決定的で defensively-coded な multi-account liquidation orchestration 層を構築した。レッスンはその達成を comprehensive な walkthrough で honor する。
- **確認ブロックの「off-by-one note」**（68 → 69 訂正）は honest scoping。L11 と L12 が誤った合計を projected した。L13 が訂正し、出処を認める。コース内の訂正は読者の信頼を築く — 著者が自分を訂正するのを見る読者は、コンテンツの残りを信頼する可能性が高い。
- **冒頭の「Test coverage matrix」図** が、読者がテストを 1 つずつ walk する *前に* 6+4 の構造を可視化する。L11 と同じ vocabulary-first パターン。テストレベルでも同様にうまく働く。
- **Q6 の ADL handoff** はコース全体で最長の forward-reference（Stage 10d がどのように `unfilled_deficit` を consume するかを 4 文で説明）。長さを justify する: 次のコース（ADL）がまだ存在しないので、ここが読者が handoff の説明を見る唯一の場所だ。
- **「Trilogy retrospective」フレーミング**が Stage 10 を 3 stage に渡る *単一のアーキテクチャ的決定* として扱う — pure compute、state、orchestration。最後の 5-module コース表はその framing への visual companion。
- **L13 で新規 `lib.rs` 変更なし。** L9 と L12 と同じ — scanner 型語彙が re-export 済み（L11）、scan メソッドが実装済み（L12）。L13 の唯一のファイル編集は test モジュール。**Crate の public surface は固定。L13 はそのテストされた挙動を lock するだけ。**

### JA 特有のスタイル決定

- **専門用語は英語のまま**（`orchestration`、`cardinality bound`、`saturating arithmetic`、`debug_assert!`、`forward-compatibly`、`mega-property`、`property-level granularity`、`load-bearing`、`single-mutator` など）。L0-L12 の慣例に従う。
- **Code コメントは英語のまま**（`// pnl = -1; post_close_equity = 19`、`// drained to 0`、`// adverse to long positions` など）。答え合わせと byte-for-byte 一致させるため。
- **`load-bearing` は英語のまま使用。** L8-L12 と同じ。
- **「Test coverage 行列」は「行列」を使用** — マトリックスのカタカナ化より日本語の数学用語の方が自然。
- **「保存則」も日本語の数学用語** — Conservation law の自然な訳。
