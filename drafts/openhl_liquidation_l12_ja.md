# Building OpenHL Liquidation — L12 draft (JA) — build-along

> openhl SHA `0a8464e`（Stage 10c — multi-account liquidation scanner）に対するドラフト。

## L12 — `openhl-liquidation-scan-method-ja`

**Stage**: Stage 10c — `0a8464e`

**Title**: レッスン 12 — `scan` — safety cascade のオーケストレーションの心臓

**Duration**: 35 分 · **XP**: 70

---

````markdown
# レッスン 12 — `scan` — safety cascade のオーケストレーションの心臓

## ゴール

このレッスンで掴む概念:

- **`scan` メソッドは orchestration 層で *唯一の動詞*。他はすべて名詞だ。** L11 は状態を記述する型 4 つを宣言した。L12 は入力から状態を生む 1 つのメソッドを実装する。メソッドは `(accounts, mark)` を取り、`ScanReport` を返す。本体内では、L4-L10 にわたって構築した Stage 10a + 10b プリミティブのすべてが、liquidate 対象アカウント 1 件あたりちょうど 1 度ずつ呼ばれる。**Composition がアーキテクチャ。1 つの動詞が 10 個の名詞を consume する。**
- **`MarginHealth` に対する `match` + `continue`-guard は「liquidate 対象でないアカウントは skip」の最もきれいな pattern。** 代替案 — `if !matches!(c, MarginHealth::Liquidatable | MarginHealth::Underwater) { continue; }` — のほうが短いが、exhaustiveness を失う。`match` 形は compiler に「*すべての* `MarginHealth` variant が考慮されたか」を enforce させる — それが将来 5 つ目の variant が追加されたときに bug を捕まえる規律だ。**Enum が将来成長しうるとき、exhaustive `match` が predicate-with-`!` に勝つ。**
- **Loop 内の solvent vs underwater dispatch は L10 の `debug_assert!` ペアを直接 mirror する。** `if post_close_equity >= fee_desired` が `solvent_close_outcome` に route、`else` が `underwater_close_outcome` に route。L10 の debug-assert が「呼び出し側がやってくれる」と言った routing を、scanner がまさに実行している。**Caller の runtime predicate は callee の compile-time 契約と同一だ。**
- **Underwater 分岐の `WithdrawOutcome` pattern-match は L9 の enum を `(paid, unfilled)` タプルに分解する — loop 内で L9 の 3-variant enum が 1 行以上の handling を必要とする *唯一の場所* だ。** Solvent close は `withdraw_shortfall` を一度も触らない。`deposit` だけ。Underwater close は `withdraw_shortfall` を呼んで結果に pattern-match する。`ScanReport` の i64 フィールドへの集計は record 1 件あたり `saturating_add` だ。**Orchestration 層は L9 の variant と L11 の i64 aggregate の間を、ちょうど 1 つの pattern-match で翻訳する。**

確認:

```bash
cargo test -p openhl-liquidation
```

…で 59 テストが pass する（compute 34 + insurance 21 + 新規 scanner test 4）。次の 5 個の unit test と 4 個の proptest は L13 で着地する。L13 後は 68 件。

具体的な変更:

- **`src/scanner.rs`。** 既存の `impl LiquidationScanner` ブロックに `scan` メソッドを追加する。L11 の imports がついに consumer を得て、unused-import 警告が消える。`#[cfg(test)] mod tests` の足場（ヘルパー + `use` ブロック + 最初のセクション区切り）と最もシンプルな unit test 4 個も追加する。

L12 で scanner が *runnable* になる。L13 で stress test に入る。

## おさらい

L11 の後:
- `scanner.rs` に型語彙（`CloseOutcomeKind`、`LiquidationRecord`、`ScanReport`、`LiquidationScanner`）と 5 個の accessor（`new`、`with_empty_fund`、`fund_balance`、`fund`、`into_fund`）が揃う。
- `lib.rs` は scanner 型 4 つを re-export 済み。
- `cargo check` はクリーンに compile する — ただし `account_equity`、`close_order_spec`、`liquidation_fee`、`margin_health`、`notional_value`、`solvent_close_outcome`、`underwater_close_outcome`、`WithdrawOutcome` に unused-import 警告が出る。すべて *L12 用に staged* されている。
- `cargo test` は依然 L0-L10 の 55 テストを走らせ、すべて green。

L12 がそれらの staged import をすべて引き換える。

## 計画

編集は 2 つ:

1. **`crates/liquidation/src/scanner.rs` の `impl LiquidationScanner` ブロックに `scan` メソッドを追加する。** メソッド本体は約 50 行 — Stage 10a の margin 分類、Stage 10b の close-outcome 分解、InsuranceFund state machine を 1 つの batch 操作に結ぶ orchestration loop。
2. **`#[cfg(test)] mod tests` ブロックを追加する。** ヘルパー 3 つの import、`snapshot` factory、`default_params` ヘルパー、そして 4 個の最もシンプルな unit test。

> 🛑 **予測。** 続きを読む前に考えてほしい。スライス内のアカウントごとに、liquidate するか（fund がどちらかに動く）skip するかを決める単一関数を書いている。関数本体に必要な *6 つ* の異なる分岐をリストアップする — 2 つの skip ケース（Safe/AtRisk continue、flat-position continue）と 4 つの work ケース（solvent → fund deposit、underwater positive equity → partial fee + withdraw、underwater zero equity → no fee + full withdraw、underwater negative equity → no fee + extra-large withdraw）を含めて。

（答えは本文で: 関数の分岐は厳密に 2 つの `continue` 分岐と 2 つの routing 分岐（solvent vs underwater）だ。Underwater 分岐は positive/zero/negative equity の 3 つのサブケースを 1 回の `underwater_close_outcome` 呼び出しの下に統合する — 呼び出しは内部で分岐するが、1 つの return type を提示する。Scanner レベルでは: **2 つの skip + 1 つの solvent + 1 つの underwater = 4 つの分岐**。予測した「6 つ」は 4 つに収束する。L10 の `underwater_close_outcome` がすでにサブケースの統合を済ませているからだ。**Callee 内でサブケースを encapsulate すれば、caller の分岐数が縮む。**）

`scan` メソッドの shape:

```
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
```

Shape で押さえる点が 3 つ:

1. **外側の iteration は `for snapshot in accounts` — シンプルな順序つき loop だ。** `iter().filter().map().collect()` chain ではない。理由: 各 iteration が *side effects* を持つからだ（fund の mutation、report の mutation）。Iterator chain は pure な transformation を compose するときに映える。Stateful な per-iteration の仕事には、素朴な `for` のほうが読みやすく debug もしやすい。**`for` loop は、本体が closure の外側の state を mutate するとき iterator chain に勝つ。**
2. **2 つの `continue` 分岐は loop body の *先頭* にある。** どんな仕事も commit する前に入力を reject する — 分類が最初、flat-skip が 2 番目。「Happy path」コード（skip の後）は同じ indent level に inline で並ぶ。`if` の中にネストされていない。**Loop の先頭での rejection は skip 条件で最もきれいなパターン。ネストは仕事を必要以上に深く押し込む。**
3. **`ScanReport` フィールドへの集計は最終的な `.iter().sum()` ではなく、per-iteration の `saturating_add` を使う。** L11 の設計選択（record vector の隣の aggregate フィールド）が per-iteration accumulation を要求する。コストは record 1 件あたり scalar 1 つにつき `saturating_add` 1 回 — 実行中の仕事に比べてマイクロ秒オーダーだ。**Single-pass accumulation は L11 の設計契約と一致する。**

## 手を動かす walk-through

### Step 1: `scan` メソッドを追加

`crates/liquidation/src/scanner.rs` を開く。既存の `impl LiquidationScanner { ... }` ブロック（現在は `into_fund` accessor で終わる）を見つける。`into_fund` の後に `scan` メソッドを追記:

```rust
    /// Scan every account and produce a [`ScanReport`] of the resulting
    /// liquidations.
    ///
    /// All accounts are classified at the given `mark`. Liquidatable and
    /// Underwater accounts are converted to close orders + outcomes,
    /// with the insurance fund mutated in place. `Safe` and `AtRisk`
    /// accounts produce no record and no fund mutation.
    ///
    /// Flat positions (`position_size == 0`) that misclassify as
    /// Liquidatable are also skipped — `close_order_spec` would emit a
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
```

本体をフェーズごとに walk する。

#### フェーズ 1: 分類（loop 内冒頭 5 行）

```rust
let classification = margin_health(snapshot, mark, &self.params);
match classification {
    MarginHealth::Safe | MarginHealth::AtRisk => continue,
    MarginHealth::Liquidatable | MarginHealth::Underwater => {}
}
```

押さえる点が 3 つ:

1. **`match` は exhaustive で、compiler が enforce する。** L6 の `MarginHealth` は variant がちょうど 4 つ。2 つの arm が 4 つすべてを cover する。明日誰かが 5 つ目の variant（例: `LiquidatableButOnHold`）を追加すると、この `match` は compile に失敗する。Build break が「どちら側に入れるか判断しろ」と促してくれる。**Non-exhaustive な代替案 — `if !matches!(c, Liquidatable | Underwater) { continue; }` — は新しい variant を黙って skip 扱いし、設計上の判断を隠してしまう。**
2. **Work-path の arm は `{}`、body がない。** Arm は exhaustiveness を成立させる *ためだけに* 存在する。実際の仕事は `match` の後に起きる。これが「filter して関数の残りに fall through」の Rust イディオムだ。**`match` 内の空 arm が exhaustiveness check 後の fall-through の書き方だ。**
3. **Or-pattern（`Safe | AtRisk`）が 2 つの skip ケースを 1 つの arm に統合する。** L9 の proptest が使ったのと同じトリック（`Covered { amount } | PartiallyDrained { amount, .. }`）が variant grouping のためにここで再登場する。**Or-pattern は Rust の exhaustive-match コードの rhythm だ。**

フェーズ 2 に進む前に、フェーズ 1 の `match` とフェーズ 2 の flat-check が一緒に作る rejection-ladder の構造を一度立ち止まって眺める。どちらの guard も loop body の先頭に住み、発火すれば *iteration から exit する*。Happy path はその下を、`if` にネストされることなく、guard と同じ indent level で走る:

```
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
```

2 つの rejection 分岐は iteration の *外へ* 分かれていく。Happy path のコードは indent level 1 つで平らに留まる。**パターンは「先頭で filter、その下で仕事、間にネストなし」だ。**

#### フェーズ 2: Defensive な flat-skip（7-13 行）

```rust
if snapshot.position_size.0 == 0 {
    continue;
}
```

これは *理論上は不可能な* 状態に対する defensive guard だ。flat position がここに到達する唯一の道は、`margin_health` が `Liquidatable` または `Underwater` に misclassify することだ — L6 の分類ルールはそれを禁じている（flat → ratio MAX → `Safe`）。だが bridge は sanitize されていない snapshot を submit しうる。そして L7 の `close_order_spec` は zero-qty な `CloseOrderSpec` を生み、CLOB が reject する。**Skip は安価な defensive coding — *enforce で消せない上流のバグから downstream consumer を守る*。**

#### フェーズ 3: Close order の生成（15 行）

```rust
let close_order = close_order_spec(snapshot);
```

1 行。L7 の pure 関数がすべての仕事をする。**Stage 10a 関数への 1 行呼び出しは、orchestration 層の「プリミティブを使う」の見かけだ。**

#### フェーズ 4: Routing 判断（17-24 行）

```rust
let notional = notional_value(snapshot, mark);
let fee_desired = liquidation_fee(notional, &self.params);
let post_close_equity = account_equity(snapshot, mark);

let outcome = if post_close_equity >= fee_desired {
    // ... solvent 分岐
} else {
    // ... underwater 分岐
};
```

押さえる点が 5 つ:

1. **Predicate は L10 の `underwater_close_outcome` `debug_assert!`（`equity < fee`）の正反対。** L10 の assertion は「underwater は equity < fee」と言った。ここでは `>=` で solvent に当たる。Scanner の runtime check が L10 の compile-time 契約と揃う。**Scanner は L10 が document していない数学を *何もしていない*。**
2. **Predicate の前に 3 つのローカル変数（`notional`、`fee_desired`、`post_close_equity`）。** どれも名前付き、どれも 1 行、どれも既存の関数呼び出し。読者は local-variable cascade を下って predicate に到達する頃には、両側に何があるか正確に把握している。**ローカルに名前付けした中間値は、最も安い readability の勝利。**
3. **`solvent_close_outcome` と `underwater_close_outcome` は各分岐で *別々* に呼ばれる — 1 つの routed call に統合されない。** 統合した形（`let outcome = if is_solvent { solvent_close_outcome(...) } else { underwater_close_outcome(...) }`）は、*もう一方* の分岐で precondition 違反で呼び出されることになり、L10 の `debug_assert!` を発火させる。別々の分岐に置けば、各 callee は自分の precondition と一貫した状態で呼ばれる。**Dispatch を call から分離する。各 callee が precondition を clean に満たした状態で呼ばれる。**
4. **ローカル変数 `outcome` は `if`/`else` 内で代入され、その後で使われる。** `let outcome = if ... { ... } else { ... };` パターン。Rust の if-as-expression が値を返すので、これは idiomatic だ。**`let x = if y { a } else { b };` が、Rust で値を条件付き計算する書き方だ。**
5. **両分岐とも `CloseOutcomeKind` variant を返す。** 2 variant は同じ parent type を共有する。`if`/`else` の型がきれいに揃う。**同じ enum の 2 variant を返す `if`/`else` は、variant routing で最も安全なパターン。**

#### フェーズ 5a: Solvent 分岐（3 行）

```rust
let solvent = solvent_close_outcome(snapshot, mark, &self.params);
self.fund.deposit(solvent.fee_to_fund);
report.fund_deposits = report.fund_deposits.saturating_add(solvent.fee_to_fund);
CloseOutcomeKind::Solvent(solvent)
```

押さえる点が 3 つ:

1. **`fee_to_fund` は 3 回読まれる: `deposit` に 1 回、aggregate に 1 回、`CloseOutcomeKind::Solvent` に move された `solvent` の一部として 1 回。** `SolventClose` が `Copy` なので、これは無料 — clone なし、borrow なし。**`Copy` 派生型は、フィールドを複数 write にまたがって広げる際に ownership の儀式を不要にする。**
2. **`fee_to_fund == 0` 条件がない。** Solvent close は常に positive な `fee_to_fund` を持つ（L10 の契約より — precondition が `equity >= fee` で、fee は positive）。ここに `if solvent.fee_to_fund > 0 { ... }` を書くと、保証された false-or-impossible 条件をチェックすることになる。**型契約がすでに排除した条件には defend しない。**
3. **`withdraw_shortfall` の呼び出しがない。** Solvent close は fund に credit して trader に residual を返す。Fund から *引かれることはない*。Trader balance の credit は bridge の仕事だ（`solvent.residual_to_account` を使う）。Scanner のスコープ外。**Scanner は fund だけを mutate する。Trader balance は bridge の仕事。**

#### フェーズ 5b: Underwater 分岐（8 行）

```rust
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
```

押さえる点が 6 つ:

1. **`if underwater.fee_to_fund > 0` guard を入れている理由は、L10 の `underwater_close_outcome` が `fee_to_fund == 0` を返しうるからだ**（「already underwater pre-fee」サブケース）。`deposit(0)` は L8 より no-op だが、guard が `saturating_add` と関数呼び出しのオーバーヘッドを省く。**「何もしない」アクションを gate する predicate は安価な正しさ。**
2. **`WithdrawOutcome` への pattern-match が `(paid, unfilled)` に分解する。** 3 variant すべてが 1 つのタプル shape に collapse する:

   - `WithdrawOutcome::Covered { amount }` → `(amount, 0)`: 要求された shortfall が全額支払われた。escalate なし。
   - `WithdrawOutcome::PartiallyDrained { amount, unfilled }` → `(amount, unfilled)`: fund は持っていた全額を支払い、残りはプロトコルレベルの unfilled deficit として記録される。
   - `WithdrawOutcome::Depleted { unfilled }` → `(0, unfilled)`: fund はすでに空。支払いはゼロ、要求の全額が escalate する。

   保存則 `amount + unfilled = requested_shortfall` は 3 行すべてで成立する（L9 の proptest が証明した）。L13 でこの法則が per-call レベルから per-scan レベルに `report_unfilled_equals_sum_of_unfilled_shortfalls` で持ち上がる。**タプルは L9 variant payload の *正規化形* — 3 つの異なる shape が 1 つの `(i64, i64)` に collapse し、保存則が引き継がれる。**
3. **Match の arm は間接的に *or-pattern destructuring* を使う。** 厳密には 3 つの別個の arm だが、各 arm が同じタプル shape `(paid, unfilled)` を計算する。視覚的な symmetry がコードの scan を楽にする。**統一された出力型を計算する pattern-match arm は視覚的に並列だ — 揃えて並べる。**
4. **`paid` と `unfilled` は即座に `saturating_add` で report に consume される。** Variant ごとの集計が 2 行で起きる。Match → タプル → aggregate のカスケードが、crate を貫く標準の「enum-to-scalar」パターンだ。**L9 の `WithdrawOutcome` は *情報* を返す。Scanner はそれを *数字* に変換する。**
5. **`fund_withdrawals` と `unfilled_deficit` の両方に `saturating_add`。** Running total は両方とも現実的なプロトコル規模（最大 ~$10^15）で bound されているとはいえ、saturation は一貫した規律だ。**全所で saturating な算術はコスト 0、決定性の契約を一貫して尊重する。**
6. **最後の行 — `CloseOutcomeKind::Underwater(underwater)` — `underwater` を enum に move する。** `underwater` がフィールド読み出し後に consume される唯一の場所だ。`UnderwaterClose` は `Copy` なので、move はただの value-copy。**`Copy` 型なら「フィールドを read してから enum に move」は実質コスト 0 だ。**

#### フェーズ 6: Record を push（26-30 行）

```rust
report.records.push(LiquidationRecord {
    account: snapshot.account,
    close_order,
    classification,
    outcome,
});
```

Struct construction は直接的: 4 フィールドそれぞれが scope 内のローカル。**毎 iteration の終わりに 1 push。** これが `scan` が record ごとにする唯一の allocation だ（`Vec` が grow することはあるが、push 自体は tail allocation）。**Per-iteration allocation は record 数で bound される。Scratch allocation なし。**

> 🛑 **やりがちな勘違い。** 「なぜ for-loop が index や `iter()` を使うのか? `iter().filter_map(...).collect()` のほうが idiomatic ではないか?」 問題が 2 つ。(1) `self.fund` を mutate する closure に対する `filter_map` は、iterator chain 全体で `self` を排他 borrow し、closure capture と衝突する。Rust の borrow checker は major refactor なしにこれを reject する（interior mutability か、fund を切り出すか）。(2) compile が通っても、iterator chain は per-iteration の side effects（deposit、withdraw、aggregate-add）を `map` closure 内に隠す。「この iteration が fund を mutate した」を読者は簡単に見られない。**`&mut self` を capture する for loop は、本体が enclosing self を mutate するとき iterator chain に勝つ。**

### Step 2: Test モジュールの足場を追加

`scanner.rs` の末尾に test モジュールを追記する。足場は 3 つの部分: imports、helpers、最初のセクション区切り。

```rust
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
```

押さえる点が 3 つ:

1. **L12 に proptest がないのに `use proptest::prelude::*;` を import する。** L13 用に staged。L11 の `account_equity` import と同じ staging 規律だ。**本コースのテストは *forward-compatibly* に書かれている — L12 の `use` ブロックは L13 の `use` ブロックだ。**
2. **`snapshot` ヘルパーが 4 フィールドを `AccountSnapshot` 構造体全体に packaging する。** L4 の `compute::tests::snapshot` ヘルパーを mirror（同じ名前、同じ return type）。これで各テストの最初の行が読みやすく保たれる: `let s = snapshot(1, 1, 100_000, 50_000);` は「account 1、long 1 BTC、entry $100k、collateral $50k」と読める。**Test ヘルパーは無関係な構築ノイズを隠す価値がある。代替案は test 1 件あたり 8 行になる。**
3. **セクション区切り `// ─── empty / non-liquidatable input ───` が L8/L9 で確立したスタイルに合う。** Liquidation コースのテストファイルは罫線文字区切りを一貫して使う。**モジュール間で一貫したテストファイル構造は、小さいが累積する readability の勝利だ。**

### Step 3: 4 つの simple unit test を追加

Test モジュール内に追記:

```rust
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
```

テスト設計で押さえる点が 8 つ:

1. **`scan_empty_accounts_returns_empty_report` は `ScanReport` *4 フィールドすべて* を assert する。** Records empty、3 つの aggregate が 0。4 つの assertion が「`ScanReport::default()` が全 0 でなくなる」future bug を捕える — logic bug よりさらに小さい regression だ。**Default-state テストは default のすべてのフィールドを assert する。**
2. **`scan_all_safe_accounts_does_nothing` はアカウントを *2 件* 使う、1 件ではない。** なぜ 2 件か。1 件のテストは「loop は最初の iteration を走らせたが 2 回目を skip した」bug を mask しうる。2 件あれば loop は 2 回 iterate を強制され、両方とも何も生まない。**Multi-account skip テストは single-account skip テストよりも loop-control bug を捕まえる。**
3. **`scan_all_safe_accounts_does_nothing` の算術コメントが期待される分類を document する。** 「50% ratio = Safe」と書いておけば、読者は L1-L6 のロジックを再導出せず頭の中で追える。**分類パスを名指す test コメントが、本コースの curriculum reinforcement の起き方だ。**
4. **`scan_atrisk_does_not_liquidate` は 4 つのうち *最も pedagogical に重要*。** 「AtRisk は *warning state* であって *trigger state* ではない」を確立する。将来の maintainer が AtRisk を liquidation trigger に「promote」したら（match arm に追加して）、このテストが即座に落ちる。**安定したアーキテクチャ境界に対するテストは、本コースの設計選択が refactoring を生き延びる方法だ。**
5. **`scan_atrisk_does_not_liquidate` の 5% 境界は maintenance margin（2%）と initial margin（10%）に *意図的に* 近い。** 1%（< maintenance）なら Liquidatable、15%（> initial）なら Safe。5% は *中間* で、AtRisk 境界の両側がここからテストできる。**境界テストは分類の *エッジ* だけでなく *内部* を exercise する値を選ぶ。**
6. **`scan_skips_flat_positions` は `snapshot(1, 0, 100_000, 1_000)` を使う。** `size = 0` に注目 — flat ケース。L6 の `margin_ratio` が flat ポジションに MAX を返す（Safe と分類されてフェーズ 1 `continue` で skip）にもかかわらず、テストはフェーズ 2 の defensive guard を exercise する。将来の変更が flat を Liquidatable に promote する *場合に備えて* だ。**Defense-in-depth テストは、第 1 層から独立して第 2 層の防御を verify する。**
7. **4 つのテストすべてが `LiquidationScanner::with_empty_fund(default_params())` を使う。** Starting fund balance なし、Hyperliquid のデフォルト params。一貫性が読者に「4 つすべてを通して読み、*差分* だけを吸収する」を許す（accounts、mark）。**Per-test の isolation が test 間の diff を一目で読ませる。**
8. **テスト名が 4 ステップの narrative を成す:** empty → all-Safe → all-AtRisk → flat。「scan が何を skip するか」を学ぶ読者は順番に walk して完全な mental model を構築する。**Test ordering は教育的な progression を encode できる。**

### Step 4: テストを走らせる

```bash
cargo test -p openhl-liquidation
```

期待される出力（短縮版）:

```
running 59 tests
test compute::tests::close_flat_has_zero_qty ... ok
... (L0-L10 由来の compute テストがさらに 33 個)
test insurance::tests::balance_never_negative ... ok
... (L8-L9 由来の insurance テストがさらに 20 個)
test scanner::tests::scan_all_safe_accounts_does_nothing ... ok
test scanner::tests::scan_atrisk_does_not_liquidate ... ok
test scanner::tests::scan_empty_accounts_returns_empty_report ... ok
test scanner::tests::scan_skips_flat_positions ... ok

test result: ok. 59 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**59 テスト pass。Scanner が *runnable* になった。** L13 で 5 個の nuanced unit test（solvent fee deposit、underwater fully/partially/depleted、mixed batch、FIFO fairness）と 4 個の proptest（scan 全体にわたる保存則）が stress テストを担う。L13 後は 68 件。

エラー時にありがちなパターン:

- **Compile エラー: `cannot find function \`account_equity\` in this scope`** — L11 の imports は compute 関数 6 つを staged にした。どれか 1 つでも忘れた（または unused-import 警告を消そうとして実際必要な import を削った）と、`scan` は compile しない。`scanner.rs` 冒頭の `use crate::compute::{...}` 行から欠けた関数を再追加する。
- **テスト失敗: `assertion failed: report.records.is_empty()` on `scan_all_safe_accounts_does_nothing`** — あなたの `margin_health` が 50% ratio を mis-classify している。L6 は 50% > 10% initial = Safe と言った。`match` arm が `MarginHealth::Safe | MarginHealth::Liquidatable`（typo）と書かれていると、Safe が liquidate される。`match` の arm 1 を読み直す。
- **テスト失敗: `report.fund_deposits != 0` on `scan_empty_accounts_returns_empty_report`** — `ScanReport::default()` の derivation が間違っている。`derive(Default)` on `ScanReport` がこのテストを green にする。`impl Default` を手動で非 0 のデフォルトと書くと契約が壊れる。
- **Compile エラー: `the trait bound \`SomeType: Copy\` is not satisfied`** — `outcome = if ... { ... }` の分岐のどこかに、compiler が non-`Copy` だと考える型がある。`SolventClose` と `UnderwaterClose` の両方が `#[derive(Clone, Copy, Debug, PartialEq, Eq)]` を持つか確認する（L10 から持っているはず） — もし持っていなければ、これらの variant を返す `if`/`else` がそれを要求する。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **`scan` メソッドは *thin orchestrator* であって、*fat coordinator* ではない。** `scan` のすべての行は、Stage 10a/10b プリミティブを呼ぶか、`ScanReport` フィールドへの `saturating_add` を apply するかのどちらかだ。新しい数学なし、新しいポリシーなし、新しいデータ shape なし。**Orchestration 層はプリミティブを呼ぶべきだ。複製してはいけない。**

2. **Exhaustive `match` が predicate-with-`!` に勝つ。** フェーズ 1 の `MarginHealth` `match` こそが、将来の enum-variant 追加を捕まえる規律だ。`if !matches!(c, Liquidatable | Underwater) { continue; }` と書いたら、明日 5 つ目の variant が追加されたとき、それを黙って skip 扱いしてしまう。**Exhaustive `match` が、enum とその consumer を refactor 越しに同期させる方法だ。**

3. **`WithdrawOutcome → (paid, unfilled)` タプル分解は、L9 の enum が orchestration handling で 1 行を超える *唯一の場所*だ。** 3 variant が 1 つの `(i64, i64)` に collapse する。集計契約が統一されているからだ。**L9 の `WithdrawOutcome` は情報を返す。Scanner はそれを数字に変換する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
```

L12 の後:
- **scanner.rs** は Stage 10c の `scanner.rs` の **test モジュール内 `scan_skips_flat_positions` テストまで一致**。具体的には: doc + imports + `CloseOutcomeKind` + `LiquidationRecord` + `ScanReport` + `LiquidationScanner` 構造体 + 5 個の accessor + `scan` メソッド + test モジュール足場 + 4 個の simple unit test。L13 で 5 個の nuanced unit test と 4 個の proptest が着地する。

## よくある質問

**Q1: なぜ `scan` は `&mut [AccountSnapshot]` ではなく `&[AccountSnapshot]` を取るのか? Scanner は snapshot に書く必要がないが。**

Scanner は snapshot に書く必要が *ない* — まさにそれが理由だ。`&[T]`（immutable slice）は「私は read-only でこのスライスを consume する」と告げる。`&mut [T]`（mutable slice）は「scanner は snapshot を mutate しうる」と暗示してしまう。実際にはしないし、するべきでもない。**呼び出し側の便宜ではなく、関数のニーズに合う borrow を選ぶ。** Caller（bridge）は他所で `accounts` を mutable に所有していても、`&accounts[..]` で渡せる。

**Q2: なぜ `scan` は `MarkPrice` を値で取るのに、内部で `&self.params` は reference で渡すのか?**

`MarkPrice` は 1 フィールドの `Copy` 構造体 — 値渡しが無料だ。`LiquidationParams` は 3 フィールドの `Copy` 構造体で、scanner がすでに所有している。`&self.params` を渡せば struct コピーが避けられる。要はコピーコストの話だ。小さい `Copy` 型は値で、大きめの `Copy` 型は reference で渡す。**`Copy` 型は小さいなら値、大きいなら reference で渡す。**

**Q3: `for snapshot in accounts` loop を `accounts.iter().enumerate().for_each(|(i, snap)| ...)` で置き換えて iteration index を track できないか?**

できる、ただし index は要らない。`LiquidationRecord` は snapshot から `account: AccountId` を運ぶ。これが downstream consumer にとっての *durable* な identifier だ。Iteration index は synthetic ID（スライス内の positional）で、下流には何も意味しない。**Identifier はドメインで意味を持つべきで、iteration の positional であってはならない。**

**Q4: `scan` は loop body の後に「fund が完全に depleted」状態に達したら early-return しないのか?**

しない。L11 の設計契約が aggregate フィールドに「scan 中に起きたすべて」を capture すると言っているからだ。depletion 後の underwater close も含む。Early return は audit trail を切る。Iteration position 50 にいる Liquidatable アカウントが `LiquidationRecord` を生まなくなり、bridge はそれを見落とす。**Scan は fund が空になっても batch を完了する。Aggregate な `unfilled_deficit` が、より aggressive なポリシー（ADL）が必要だと bridge に告げる signal だ。**

**Q5: スライス内の 2 つの snapshot が同じ `AccountId` を持っていたら?**

Scanner は iteration 順に処理する。1 つ目の `LiquidationRecord` と fund-mutation が先に着地、2 つ目が後に着地。Deduplication なし。これは *設計上* そうだ。scanner は bridge が決定的で dedup された slice を渡してくれると信頼する。Duplicate-account の挙動は bridge bug であって scanner bug ではない。**Caller が制御する invariant は caller に任せる。**

**Q6: 本体は `report.fund_deposits = report.fund_deposits.saturating_add(...)` を使う。`report.fund_deposits += ...` ではダメか?**

`+=` 演算子の挙動はビルドプロファイルで変わる: **debug ビルドでは overflow に panic、release ビルドではサイレントに *wrap*（2 の補数の剰余演算）する**。Release-build の wrap こそが本当のコンセンサス上の危険だ — クラッシュしないので、1 つの validator で overflow した加算が静かに他と異なる `i64` を生む。結果は state の不一致 → チェーンフォーク。Debug の panic は分かりやすい failure mode、release の silent wrap は *騙される* failure mode だ。`saturating_add` はどんなビルドプロファイルでも `i64::MAX`（または `i64::MIN`）に clamp する。全 validator が同じ値を見る — どんなコンパイラフラグでビルドされていても。**`+=` は非コンセンサスの算術なら OK。`saturating_add` は validator が byte-for-byte で agree しなければならない state の標準だ。**

## 次のレッスン (L13) — Module 4 capstone: 5 個の nuanced unit test + 4 個の proptest

L13 が Module 4 を閉じる — そして Stage 10c を閉じる — そして openhl の Module 10 全体を閉じる。5 個の nuanced unit test は:
- `scan_liquidatable_solvent_deposits_fee` — happy path: trader の collateral がすべてを cover する。
- `scan_underwater_fully_covered_drains_fund_partially` — fund が drain するが cover する。
- `scan_underwater_partial_drain_surfaces_unfilled` — fund が partial drain、shortfall の一部が escalate。
- `scan_underwater_depleted_fund_escalates_full_shortfall` — fund が既に空。
- `scan_first_underwater_gets_paid_then_second_unfilled` — 複数の underwater アカウントでの FIFO fairness。

そして `scan_mixed_batch_processes_only_unhealthy` で loop が heterogeneous な batch を扱えるか verify する。

4 個の proptest は scan 全体にわたる保存則を verify する:
- `fund_balance_never_negative_across_scans` — L8 の不変条件が multi-account scan に拡張する。
- `report_unfilled_equals_sum_of_unfilled_shortfalls` — `unfilled_deficit` が per-account unfilled 量と一致する。
- `fund_deposits_minus_withdrawals_equals_balance_change` — fund 会計が閉じる。
- `scan_preserves_account_order_in_records` — 決定性: records が input 順に現れる。

L13 後、Liquidation crate は *完成* する — 68 テスト、`0a8464e` と byte-for-byte 一致。読者は pure-compute + state-machine + orchestration cascade をまるごと 13 レッスンで構築したことになる。

````

---

## Seed-file slot

L12 は Module 4 の sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 12 — scan — safety cascade のオーケストレーションの心臓',
  slug: 'openhl-liquidation-scan-method-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 35,
  xpReward: 70,
  content: `# レッスン 12 — scan — safety cascade のオーケストレーションの心臓\n\n...`
},
```

## SHA pinning discipline

L12 は `0a8464e`（Stage 10c）のまま据え置き。L12 後、`scanner.rs` は `scan_skips_flat_positions` テストまで答え合わせと一致。L13 も `0a8464e` のままで、残りのテストと proptest を追加して crate を byte-for-byte に閉じる。

## 翻訳セルフレビュー（paste 前）

- **L12 は Module 4 で 2 番目に長いレッスン**（35 分）。Justification: `scan` 本体が orchestration 層で唯一の動詞であり、フェーズごとに walk-through する（6 フェーズ）のが、読者にカスケードがどう compose されるかを内面化させる方法だ。
- **フェーズごとの walk-through 構造（フェーズ 1 から フェーズ 6 まで）** が本レッスンで初登場。前のレッスンは読者が行う *編集* に「Step 1 から Step N まで」を使った。本レッスンは 1 つのメソッドの *parts* に「フェーズ 1 から フェーズ 6 まで」を使う — 同じ番号付けパターン、別の単位。フェーズ構造は本体の自然な分解を mirror する: classify → flat-skip → close-order → routing → solvent/underwater work → record-push。L12 を完了した読者は 6 フェーズを暗唱できる。
- **「やりがちな勘違い」コールアウトが `iter()` vs `for` 議論を explicit に扱う。** Stateful な iteration の Rust イディオムは `for`。Chained-iterator のアプローチは魅力的だが borrow-checker の理由で失敗する。これを document することで「これは fold ではないか?」というレビューコメントを preempt する。
- **テスト pedagogy が通常より重い。** 4 個のテストに対する「押さえる点」が 8 個（前のレッスンの 5-6 個 vs）— テストこそが verification だからだ。読者はそれらを走らせて pass を見て、scanner が動くと知る。「押さえる点」リストが、4 つの simple test から最大限の signal を抽出することで価値を生む。
- **次のレッスン preview が L13 のテストと proptest を実際の identifier で名指す。** Honest scoping: 読者は何が来るか正確に知る。L13 はコース内で最長の単一レッスンになる（40 分）。Module 4 の capstone であると同時に Liquidation コースの capstone であり、*なおかつ* openhl の Module 10 の capstone でもあるからだ。

### JA 特有のスタイル決定

- **専門用語は英語のまま**（`orchestration`、`exhaustive match`、`iterator chain`、`pattern-match`、`borrow checker`、`closure capture`、`interior mutability`、`forward-compatibly`、`defense-in-depth` など）。L0-L11 の慣例に従う。
- **Code コメントは英語のまま**（`// Skip flat positions defensively...`、`// Decide solvent vs underwater path...` など）。答え合わせと byte-for-byte 一致させるため。
- **`load-bearing` は英語のまま使用。** L8-L11 と同じ。
- **「フェーズ」は片仮名表記。** 「相」「段階」「ステージ」よりも、`scan` 本体の構造的な部分を指す技術的な意味で「フェーズ」が最も馴染む。
