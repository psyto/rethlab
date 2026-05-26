# Building OpenHL Liquidation — L9 draft (JA) — build-along

> openhl SHA `260883b`（Stage 10b — insurance fund state machine + close-outcome decomposition）に対するドラフト。

## L9 — `openhl-liquidation-withdraw-shortfall-ja`

**Stage**: Stage 10b — `260883b`

**Title**: レッスン 9 — `withdraw_shortfall` — Layer 2 → Layer 3 境界をコードで表現する

**Duration**: 30 分 · **XP**: 60

---

````markdown
# レッスン 9 — `withdraw_shortfall` — Layer 2 → Layer 3 境界をコードで表現する

## ゴール

このレッスンで掴む概念:

- **3-variant の outcome enum はカスケード境界を型で表現したもの。** `WithdrawOutcome::Covered` は「Layer 2 が完全に吸収した」。`PartiallyDrained` は「Layer 2 が吸収できた分だけ吸収し、残りはエスカレートする」。`Depleted` は「Layer 2 には何もなく、すべてがエスカレートする」。Stage 10d の ADL ルーチンはこの enum で pattern-match して、自分が何をすべきかを決める。**複数ステージにまたがるアーキテクチャの継ぎ目は、複数の呼び出し地点にまたがる enum variant になる。**
- **全域関数 (total function) のための early-return はしご (ladder)。** `withdraw_shortfall` は 4 つの異なるケース（非正な shortfall、空 fund、十分な balance、部分 drain）を扱う。ネストした `match` ではなく、4 つの guarded early return で並べる。はしごは上から「これは *この* ケースか? Yes なら return、No なら次へ」と読める。**各ケースが独立しているとき、early return は条件構造を平坦化する。**
- **保存則を proptest で encode する。** 型システムは「この enum は 3 variant ある」までは表現できる。だが「どの variant が発火しても `amount + unfilled = 元の shortfall`」までは表現できない。`(initial_balance, requested_shortfall)` のペアに対する proptest が、何千ものランダム入力で保存則を証明してくれる。**Proptest は、コンパイラが enforce できない不変条件をテストスイートが *enforce する* 形に格上げする道具だ。**
- **新しい state ではなく *outcome* を返す `&mut self` メソッド。** `deposit`（新しい balance を返す）と違い、`withdraw_shortfall` はパスごとに *質的に異なる shape* を返す。3 variant × 異なる payload = 同じメソッドに対する「いま何が起きたか」の 3 種類の応答。**Mutation が質的に異なる成功モードを持つときは、その違いを型で返せ。**

確認:

```bash
cargo test -p openhl-liquidation
```

…で 45 テストが pass する（compute 24 + insurance 21: L8 の 9 + 新規 unit test 8 + 新規 proptest 4）。L9 の後、`insurance.rs` は `260883b` と byte-for-byte 一致する。

具体的な変更:

- **`src/insurance.rs`。** `impl InsuranceFund` ブロックに `withdraw_shortfall` を追加し、3 variant と negative・zero エッジケースをカバーする 7 個の unit test、deposit + withdraw を組み合わせた 1 個の sequencing test、4 個の proptest を追加。
- **`lib.rs` に変更なし。** `WithdrawOutcome` は L8 で再 export 済み。

L9 で insurance fund モジュールを閉じる。本レッスンの後、`260883b` に対する答え合わせ diff は `insurance.rs` で完全にクリーンになる。

## おさらい

L8 の後:
- `insurance.rs` が存在する。`InsuranceFund` 構造体、`WithdrawOutcome` enum（宣言済みだが未使用）、3 種類のコンストラクタ、`balance()` アクセサ、`deposit()` 変更子が揃っている。
- `lib.rs` は `InsuranceFund` と `WithdrawOutcome` の両方を re-export 済み。
- `cargo test` は 33 テストを走らせ、すべて green。
- Fund は deposit を **蓄積する**（`balance ≥ 0` の不変条件は public メソッドすべてで守られている）。まだ **drain しない**。

L9 で drain path を配線する。L8 で読者が出会った enum が、ついに variant を返すメソッドを得る。

## 計画

編集は 2 つ:

1. **`crates/liquidation/src/insurance.rs` の `impl InsuranceFund` ブロックに `withdraw_shortfall` を追加。** メソッドは doc コメントを含めて約 20 行。実装は 4 つの入力ケースを扱う early-return はしごだ。
2. **既存の `#[cfg(test)] mod tests` ブロックに 8 個の unit test と 4 個の proptest を追加。** Proptest にはモジュール冒頭にちょっとした変更が必要だ — `use proptest::prelude::*;` を加え、`proptest! { ... }` ブロックでプロパティ assertion を包む。

> 🛑 **予測。** 続きを読む前に考えてほしい。Balance 300 の fund に `withdraw_shortfall(500)` が来た。新しい balance は? メソッドが返すべき `WithdrawOutcome` の variant は? payload の値も含めて答える。次に、同じ fund に対する次の呼び出し `withdraw_shortfall(100)` を想像する。同じ問いに答える。

（答え: **1 回目:** balance は 0 になり、outcome は `PartiallyDrained { amount: 300, unfilled: 200 }`。Fund は持っていた 300 すべてを cover し、200 を ADL にエスカレートする必要がある。**2 回目:** balance は 0 のまま、outcome は `Depleted { unfilled: 100 }`。この呼び出しが始まる前から fund は空だったので、`PartiallyDrained { amount: 0, unfilled: 100 }` ではなく `Depleted` を返す。区別は重要だ。`PartiallyDrained` は「何かは支払った」、`Depleted` は「何も支払っていない」。Stage 10c の scanner はこの 2 つを別々にログに残す — オペレーション上、片方は「fund が drain しつつある」状態を表し、もう片方は「fund がすでに枯渇した」状態を表すからだ。）

3 つの variant のメンタルモデル:

```
   初期 state                呼び出し                       Outcome variant
   ─────────                ────────                       ────────────────
   balance = 1000        withdraw_shortfall(300)        Covered { amount: 300 }
   balance = 1000        withdraw_shortfall(1000)       Covered { amount: 1000 }     ← ぴったり drain
   balance =  300        withdraw_shortfall(500)        PartiallyDrained {            ← 部分のみ
                                                          amount: 300,
                                                          unfilled: 200
                                                        }
   balance =    0        withdraw_shortfall(500)        Depleted { unfilled: 500 }    ← 渡すものがない
   balance = 1000        withdraw_shortfall(0)          Covered { amount: 0 }         ← no-op
   balance = 1000        withdraw_shortfall(-100)       Covered { amount: 0 }         ← defensive

   ── 各呼び出し後 ─────────────────────────────────────────────────────────
   新しい balance         payout の `amount` 累計          常に ≥ 0
   `unfilled` payload      ADL（Stage 10d）にエスカレート   Layer 3 の入力を運ぶ
```

Variant の割り当てで押さえる点が 3 つ:

1. **`Covered` は「ぴったり一致」と「no-op」の両方を扱う。** Balance と完全に等しい shortfall は `Covered { amount: balance }`。Shortfall ゼロも `Covered { amount: 0 }`。Variant は「fund は求められたものを持っていた」を意味し、payload はそれがいくらだったかを示す。**Variant の payload は magnitude を運び、variant それ自体は意味を運ぶ。**
2. **`PartiallyDrained` は正の balance *かつ* 不十分・非ゼロの deficit が同時に揃わないと発火しない。** `balance == 0` なら `Depleted` に、`shortfall ≤ balance` なら `Covered` に分岐する。残った `PartiallyDrained` の eligibility window はかなり狭い — この狭さこそが呼び出し地点での情報価値を生む。**各 variant は、他のどの variant も発火しない条件下でのみ発火する。**
3. **`Depleted` は state を変えない。** Balance はすでに 0、メソッドは unfilled を surface する以外何もしない。Variant は *観測されるため* に存在し、アクションを記録するためではない。**「状態変更を伴わない」variant を持つ outcome enum は、アーキテクチャ設計における正解のサインだ。副作用の有無ではなく、cascade のどの位置にいるかに基づいて呼び出し側を正しくルーティングできる。**

## 手を動かす walk-through

### Step 1: `impl InsuranceFund` ブロックに `withdraw_shortfall` を追加

`crates/liquidation/src/insurance.rs` を開く。既存の `impl InsuranceFund { ... }` ブロックを見つける。`deposit` の後に `withdraw_shortfall` を追記:

```rust
    /// Attempt to absorb `shortfall` from the fund.
    ///
    /// Three outcomes:
    ///   - `shortfall ≤ balance` → [`WithdrawOutcome::Covered`], balance
    ///     decreases by `shortfall`.
    ///   - `0 < balance < shortfall` → [`WithdrawOutcome::PartiallyDrained`],
    ///     balance drops to 0, unfilled = `shortfall − prior_balance`.
    ///   - `balance == 0` → [`WithdrawOutcome::Depleted`], no state change,
    ///     unfilled = `shortfall`.
    ///
    /// Non-positive `shortfall` is treated as a successful no-op
    /// (`Covered { amount: 0 }`): no balance change, no escalation.
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
```

この 20 行のメソッドで押さえる点が 6 つ:

1. **Early-return はしごが 4 ケースを評価順で扱う。** 非正な shortfall が最初（defensive）。空 fund が 2 番目（balance を動かせない）。十分な balance が 3 番目（happy path）。部分 drain が 4 番目（fallthrough）。**各 guard は独立している — どれもカスケードしない。** Guarded early-return はしごがここでネスト `match` に勝つのは、ケースが構造を共有しないからだ。それぞれの入力 shape が異なる（`shortfall <= 0` vs `balance == 0` vs `balance >= shortfall` vs それ以外）。
2. **`shortfall <= 0` で負とゼロを 1 分岐で扱う。** ゼロ shortfall は意味のある呼び出し（「fee はゼロだった、fund から引くものがない」）、負の shortfall は呼び出し側の bug。両方とも同じ `Covered { amount: 0 }` を返す — caller-facing なセマンティクスが同一だからだ。何も引かれず、何もエスカレートしない。**入力ケース（の分類）は、呼び出し側の「意図 (intent)」ではなく、最終的な「結果 (outcome)」を基準にグループ化しろ。**
3. **`self.balance -= shortfall` は `saturating_sub` ではなく素の `-`。** 直前の guard（`self.balance >= shortfall`）が、`i64` のアンダーフローが構造的に発生しえないことを **全 validator に対して決定論的に証明** しているからだ。L8 の「コンセンサス state では panic が絶対悪」原則と矛盾しているように見えるが、矛盾していない: 静的な条件分岐で panic 確率が 0% だと保証されている文脈に限り、冗長な saturating 演算を外して素の減算を使える。**減算の前提条件で型不変条件が成立しているなら、saturating 演算は冗長になる。** これは `deposit` の `saturating_add` の逆パターン: あちらでは前提条件を証明できなかったので saturate した。こちらでは証明できた（`if` がその証明）ので素の subtraction を使う。
4. **`PartiallyDrained` の構築では、`prior` を最初に局所変数に保存し、その後 `balance = 0` を実行し、最後に variant を構築する。** 順序が重要だ。`WithdrawOutcome::PartiallyDrained { amount: self.balance, unfilled: shortfall - self.balance }` と書いてから `self.balance = 0` を実行しても、構築は問題なく動く（`self.balance` は mutation 前にキャプチャされる）。だが struct 構築の後に代入を置くと、後付けっぽく読める。`prior` を先に保存すれば、時間的順序が明白になる。read → mutate → construct。**State-machine の遷移では、mutation 後に参照する prior state を明示的に名前付けする。**
5. **`Covered { amount: shortfall }` は subtraction 前の `self.balance` ではなく `shortfall` を直接使う。** これで OK な理由は、すでに `self.balance >= shortfall` をチェックしているので、`shortfall` がまさに支払った額だからだ。**両者が等しいとき、payload には *available* な額ではなく *requested* な額を載せる — そのほうが呼び出し側のメンタルモデルに合う。**
6. **メソッドは `&mut self` を取り、値を返す。** Reference なし、lifetime なし、`Result` なし。Variant *それ自体* が成功の shape だ。Borrow checker はこのメソッドを `deposit` の `-> i64` と同じに扱う。**値返しの outcome enum は呼び出し地点での `match` と滑らかに compose する。Caller に borrow 管理を強制しない。**

> 🛑 **やりがちな勘違い。** 「`Result<i64, FundError>` にして、`FundError::PartiallyDrained(amount, unfilled)` と `FundError::Depleted(unfilled)` を error にすれば?」 問題が 3 つ。(1) `PartiallyDrained` と `Depleted` は *エラーではない* — エスカレート作業を caller に surface する成功 outcome だ。これを error にタグ付けすると、「メソッドが失敗した」と「メソッドが caveat 付きで成功した」の境界がぼやける。(2) `Result` に対する `?` 演算子は caller を short-circuit させる。だがここでは short-circuit を *望まない* — caller には pattern-match して route してほしい。(3) `WithdrawOutcome` は後の signed-outcome wrapper（Stage 10c）からも返される。`Result` にすると、すべての consumer がヘルパーを `Result` propagation で包まされる。**`Result` は「巻き戻すべきか?」のためのもの。Enum は「いまどんな成功をしたか?」のためのもの。**

### Step 2: 8 個の unit test を追加

`insurance.rs` の既存 `#[cfg(test)] mod tests { ... }` ブロックの中、L8 の deposit テストの後に 3 つのテストセクションを追加:

```rust
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
```

テストのグループ化で押さえる点が 6 つ:

1. **3 つのセクション区切り — Covered、PartiallyDrained、Depleted — が variant 名と完全に一致する。** 特定の `WithdrawOutcome` variant のテストを探して file を grep する読者は、セクションヘッダで一発に当たる。**Enum の variant を exercise するテストは variant でグループ化する。**
2. **`withdraw_covered_exact_balance` は `balance >= shortfall` 分岐の境界ケース。** `balance == shortfall` のとき `>=` 述語は true になり、`Covered` パスが発火する。テストは将来の off-by-one リファクタリング（`>` への変更）を捕える。**不等号述語の境界テストは、よくあるリファクタミスを最も多く捕える。**
3. **`withdraw_partial_drains_to_zero` は `PartiallyDrained` の *唯一の* テスト。** 1 個で十分なのは、variant のパスがユニークだからだ。`0 < balance < shortfall` のときに発火し、計算（`amount = balance`、`unfilled = shortfall - balance`）は struct 構築の直接読み出しに過ぎない。**Single-path コードは single-path カバレッジで足りる。下の proptest が全パス横断の保存則を担当する。**
4. **`withdraw_after_full_drain_is_depleted` は variant だけでなく state 遷移をテストする。** Setup なしの素朴なテスト（empty fund に withdraw）は `withdraw_depleted_no_change` でカバー済み。この 2 つ目の `Depleted` テストは別クラスの bug を捕える。Mutation 前の balance をキャッシュしてしまい、*2 回目* の呼び出しが *1 回目* の drain 前 balance を見るような future リファクタリングだ。**1 つの variant に対する複数テストは、それぞれ *違うクラスの regression* を捕えるべき。**
5. **`deposit_after_drain_recovers` が唯一の sequencing テスト。** 4 つの操作（`new`、`withdraw_shortfall`、`deposit`、`withdraw_shortfall`）をチェーンし、最終 balance と outcome を assert する。Per-operation テストは各メソッドを単体で検証するが、現実の liquidation event 系列はまさにこのタイプの多段チェーンだ。**Unit test はメソッドを検証する。Sequencing test はメソッド境界を跨ぐ state-machine 遷移を検証する。**
6. **Negative-shortfall テストには `// Defensive` のマーカーコメントがある。** L8 の `deposit_negative_is_noop` と同じパターン。「我々は負を渡さない、このテストは dead code」と判断しようとする将来のメンテナーが、この 1 ワードコメントで足を止める。**マーカーコメントは、リファクタリング除去から defensive code を守るためのテストの方法だ。**

### Step 3: 4 個の proptest を追加

Proptest は `insurance.rs` の保存則だ。特定の input → output の関係をテストするのではない。*すべての* valid 入力ペアが、型システムでは表現できないプロパティを満たすことをテストする。

まず、proptest の import を `#[cfg(test)] mod tests` ブロックの冒頭（`use super::*;` と最初の `#[test]` の間）に追加:

```rust
    use proptest::prelude::*;
```

その後、unit test の下に proptest ブロックを追加:

```rust
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

        /// `deposit(x).deposit(y)` accumulates: balance after two deposits
        /// equals the sum of the two (modulo saturation at i64::MAX).
        #[test]
        fn deposit_is_additive(a in 0_i64..1_000_000, b in 0_i64..1_000_000) {
            let mut f = InsuranceFund::empty();
            f.deposit(a);
            f.deposit(b);
            prop_assert_eq!(f.balance(), a + b);
        }

        /// After a withdraw, the change in balance equals the `amount`
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

        /// Conservation: `amount + unfilled` across all outcome shapes
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
```

4 つのプロパティで押さえる点が 8 つ:

1. **`balance_never_negative` は L8 の型不変条件 *そのもの* のテストだ。** `balance ≥ 0` の規律が任意の系列上で成立することを証明する proptest。入力 — 長さ 0 から 20 までの `(is_deposit, amount)` ペアのベクター — は、state-machine の到達可能トラジェクトリのほぼすべてを 1000 ケース未満でカバーする。**型不変条件の proptest は、defensive coding が機能することを示す最強の言明だ。**
2. **`deposit_is_additive` は `i64::MIN..i64::MAX` ではなく bounded な範囲（`0..1_000_000`）を使う。** なぜか。範囲が広いと、プロパティに saturation 挙動を encode させる必要が出てくる。Bounded 範囲なら `a + b ≤ 2_000_000` で `i64::MAX` には届かない。Saturation は発火せず、厳密等価を使える。**Proptest の入力範囲は、プロパティが素直に表現できる operating range に合わせる。境界ケースは unit test に任せる。** （L8 の `deposit_saturates_at_max` unit test が saturation 境界を担当する。Proptest は算術恒等性を担当する。）
3. **`withdraw_amount_matches_balance_delta` は Rust のパターンマッチの強力な機能である or-pattern を使う: `Covered { amount } | PartiallyDrained { amount, .. }`。** 異なる variant でも同名・同型のフィールド（ここでは `amount: i64`）であれば `|` で束縛を統合できる（Rust 1.53+ でネストパターンも含めて強化されている）。両 variant とも `amount` フィールドを持ち、プロパティは両者で同じ（「delta は報告された `amount` に等しい」）。`..` は `PartiallyDrained` の `unfilled` フィールドを — ここで必要ないので — スキップする。**Or-pattern は、別 variant 同士が payload フィールドを共有するとき、条件ロジックを平坦化する。**
4. **Proptest は *どの* variant が発火するかを予測しない。** `initial=300, shortfall=500` のとき「これは `PartiallyDrained` のはず」を計算したりはしない。メソッドに決めさせて、その後プロパティを assert する。**Proptest はプロパティを assert する、パスを assert するのではない。** テスト対象のメソッドを再実装してその出力を予測する「テスト」は、テストではなく鏡だ。
5. **`withdraw_amount_plus_unfilled_equals_shortfall` は `shortfall in 1..1_000_000`（正のみ）。** ゼロ境界は `Covered { amount: 0 }` で、保存則は `0 + 0 = 0` として trivially 成立する。だがプロパティは「実際に shortfall がある regime」で最も情報価値がある。範囲制限がテストを意味のある領域に置く。**入力範囲は、プロパティが *何かを語る* 領域に絞る。**
6. **「deposit に続いて withdraw」をカバーする proptest はない。** Sequenced ケースは `deposit_after_drain_recovers` unit test が手動でカバーする。なぜプロパティ化しないか。プロパティ化すると `(deposit_amount, balance_before_withdraw)` を assertion にスレッドする必要があり、読みにくく書きにくくなる。系列が短いので unit test のほうが illustrative だ。**Arbitrary 入力上のプロパティには proptest、sequenced narrative には unit test を使う。**
7. **4 つの proptest はすべて `prop_assert!` / `prop_assert_eq!` を使う。`assert!` ではない。** `prop_*` マクロは失敗時に shrinkage 情報を emit する — proptest が反例を見つけたとき、*最小の* 失敗入力を報告できる。**`proptest!` ブロック内では proptest 専用マクロを使う。素の `assert!` は shrinkage を無効にする。**
8. **Proptest ブロックはテストモジュールの *末尾* に置く。** Unit test は速く落ちて正確なメッセージをくれる。Proptest は挙動の *分布* をくれる。Proptest を unit test の後に置けば、何か壊れたときの失敗ストリームは、最も診断価値の高い情報から先に並ぶ。**ファイル内のテスト順序は「signal-to-noise が高いものから先」。**

### Step 4: テストを走らせる

```bash
cargo test -p openhl-liquidation
```

期待される出力（短縮版。先頭に compute の 24 テスト、その後に insurance）:

```
running 45 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
... (compute テストがさらに 22 個)
test insurance::tests::balance_never_negative ... ok
test insurance::tests::default_is_empty ... ok
test insurance::tests::deposit_accumulates ... ok
test insurance::tests::deposit_after_drain_recovers ... ok
test insurance::tests::deposit_is_additive ... ok
test insurance::tests::deposit_negative_is_noop ... ok
test insurance::tests::deposit_saturates_at_max ... ok
test insurance::tests::deposit_zero_is_noop ... ok
test insurance::tests::empty_is_zero ... ok
test insurance::tests::new_with_negative_clamps_to_zero ... ok
test insurance::tests::new_with_positive_balance ... ok
test insurance::tests::new_with_zero_is_empty ... ok
test insurance::tests::withdraw_after_full_drain_is_depleted ... ok
test insurance::tests::withdraw_amount_matches_balance_delta ... ok
test insurance::tests::withdraw_amount_plus_unfilled_equals_shortfall ... ok
test insurance::tests::withdraw_covered_exact_balance ... ok
test insurance::tests::withdraw_covered_typical ... ok
test insurance::tests::withdraw_depleted_no_change ... ok
test insurance::tests::withdraw_negative_is_covered_noop ... ok
test insurance::tests::withdraw_partial_drains_to_zero ... ok
test insurance::tests::withdraw_zero_is_covered_noop ... ok

test result: ok. 45 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**45 テスト pass。Insurance fund モジュールは `260883b` と byte-for-byte 一致。** Stage 10b の stateful core が完成した。残るは close-outcome decomposition（`liquidation_fee`、`solvent_close_outcome`、`underwater_close_outcome`）で、L10 で着地する。

エラー時にありがちなパターン:

- **`balance_never_negative` が `[(false, -100)]` のような shrunken な反例で失敗。** あなたの `withdraw_shortfall` は負の `shortfall` を deposit のように扱っている（負を引く = 足す）。Defensive ガード `if shortfall <= 0 { return ... }` は最初のガードでなければならない — state mutation の前に。
- **`withdraw_amount_plus_unfilled_equals_shortfall` が `initial=300, shortfall=500` で `total=300` を吐いて失敗。** あなたの `PartiallyDrained` は `amount` しか運んでおらず、`unfilled` が抜けている。Struct 構築を読み直す。両フィールドが populate され、その合計が `shortfall` に等しくなければならない。
- **`withdraw_amount_matches_balance_delta` が Depleted ケースで `delta=-N` を吐いて失敗。** あなたの `withdraw_shortfall` は Depleted 分岐で `self.balance` を mutate している — してはならない。分岐は state に触れずに即 return する。
- **`withdraw_covered_exact_balance` は pass するのに `withdraw_partial_drains_to_zero` が `balance=300, expected 0` で失敗。** `if self.balance >= shortfall` 分岐は正しいが、`else` 分岐で `self.balance = 0` を忘れている。部分 drain パスは常に balance をゼロにする。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **`Option` でも `Result` でもなく、3-variant の outcome enum。** `Option<i64>` は「N を支払ったか、何も支払わなかったか」を表現できるが、「持っていた全額を支払った」と「持っていなかった」の区別が消える。`Result<i64, FundError>` は両方を運べるが、partial-drain を *失敗* としてタグ付けする — 失敗ではないのに。**正しい shape は、caller の実際の決定木にマッチする enum**。Caller（Stage 10c の scanner）には 3 つの異なる routing 判断がある。完全 absorb をログ、部分 absorb + escalate をログ、depletion + escalate をログ。

2. **4 ケースの early-return はしご。** ケースは「これは自明に答えか?」順でチェックされる。負 shortfall（defensive）、空 fund（仕事ができない）、十分 balance（happy path）、部分 drain（fallthrough）。順序は operational に意味がある。*コスト順* の系列だ — 最も安いチェックが先、構造的 mutation は最後。**State-machine メソッドの guard はコスト順で評価する。**

3. **Proptest suite が型システムでは表現できない不変条件を encode する。** `balance_never_negative` は L8 の型不変条件の proptest。`withdraw_amount_plus_unfilled_equals_shortfall` はカスケード数学の保存則。`deposit_is_additive` は deposit の abelian-group 構造を証明する。`withdraw_amount_matches_balance_delta` は variant payload と観測される state 変化を結ぶ。**4 つのプロパティを合わせれば、すべての public メソッドの契約は、テストスイートが *probe* するものではなく *prove* できるものになる。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
```

L9 の後:
- **insurance.rs** は Stage 10b の `insurance.rs` と **byte-for-byte 一致**。State machine 全体 — struct、enum、3 コンストラクタ、accessor、deposit、withdraw_shortfall、Default impl、12 unit test、4 proptest — がファイルに揃う。
- **lib.rs** は L8 以降すでに byte-for-byte 一致している。

L8 で `lib.rs` の `mod` 順序や re-export スタイルを微妙に変えてしまった場合、ここで答え合わせと揃える。答え合わせは `pub mod compute; pub mod insurance; pub mod types;` と `pub use insurance::{InsuranceFund, WithdrawOutcome};` を 1 行で書く。空白の差は無害だ。

## よくある質問

**Q1: `withdraw_shortfall` を `&mut self` + `Result<i64, WithdrawOutcome>`（成功ケースが新 balance、「エラー」ケースがエスカレート情報を運ぶ）にしないのはなぜか?**

カスケードパターンは caller に *常に* pattern-match を要求するからだ。`Result` を使うと典型的な Rust イディオムは `let new_balance = f.withdraw_shortfall(s)?;` になる。だが `?` は最初の partial drain で scanner のループを short-circuit する — *まさに望まない* 挙動だ（scanning を続けて、後のイベントから deposit を吸収したい）。値返しの variant を返せば、caller は各 outcome を明示的に考えざるを得ない。**`?` 演算子は「caveat 付き成功」セマンティクスに向かない。**

**Q2: `Covered` の `amount` フィールドは `shortfall`（要求）であるべきか、previous balance マイナス new balance（delta）であるべきか?**

`Covered` の eligibility window（`shortfall ≤ balance`）では両者は同一だ。だから両方とも正しい。`shortfall` を選ぶ理由は *caller のメンタルモデル* にマッチするから — X を要求して X を受け取った。`withdraw_amount_matches_balance_delta` proptest がこの整合性を verify する。**2 つの表現が数学的に等しいとき、caller のフレーミングに合うほうを選ぶ。**

**Q3: Proptest の入力範囲が `i64::MIN..i64::MAX` ではなく `0..1_000_000` なのはなぜか?**

理由が 2 つ。(1) 興味のあるプロパティは *operating* range で成立する。境界 saturation ケースは別途 unit test 化されている（L8 の `deposit_saturates_at_max`）。(2) より広い範囲だと、プロパティの assertion 内に saturation ロジックを encode しなければならず、読みにくくなる。**Proptest の範囲は、プロパティが素直に表現できる regime に合わせる — 境界ケースは unit test に属する。**

**Q4: 「balance > 0 のとき、次の withdraw は決して Depleted を返さない」の proptest がないのはなぜか?**

そのプロパティはコードの構造から *自明に* 帰結するからだ。`if self.balance == 0` の guard は balance がゼロのときだけ発火し、balance がゼロになり得るのは covering または partial-draining な withdraw の後だけ。これのプロパティテストは、guard の *結果* ではなく guard の *存在* をテストする。**Proptest は実装の *構造* ではなく *結果* をテストすべきだ。**

**Q5: `WithdrawOutcome` を `WithdrawResult`、`Covered` を `Ok` variant、他 2 つを `Err` にできないか?**

書けるが、*成功のカテゴリー* と *失敗* を混同する。カスケード数学が言うのは、3 variant すべて「それぞれのレイヤーで成功している」ことだ — Covered は Layer 2 で absorb する、他 2 つは Layer 3 に正しく委譲する。これらを「エラー」と呼ぶと、Stage 10b の内部 regime が Stage 10c の語彙に漏れる。**命名はアーキテクチャ上の役割を反映すべきだ。エラー vs 成功は 1 ビットの区別で、この 3 ビットの決定木には収まらない。**

**Q6: `balance_never_negative` の proptest が `proptest::collection::vec(..., 0..20)` を使う。なぜ 20 で、100 ではないのか?**

理由が 2 つ。(1) 20 操作で state-machine の到達可能遷移を複数回 exercise できる — 長い系列はカバレッジを増やさない。(2) Proptest の shrinker は 20 操作の失敗を妥当な時間で最小サブ系列に shrink できる。100 操作の失敗を shrink するには秒単位かかり、結果も読みにくくなる。**Proptest のサイズは「多いほど良い」ではなく shrinkage コストで選ぶ。**

## 次のレッスン (L10) — `liquidation_fee` + close-outcome decomposition

L10 は `compute.rs` に戻り、`compute` と `insurance` の橋渡しをする Stage 10b の 3 つの pure-compute 関数を加える: `liquidation_fee(notional, params)`、`solvent_close_outcome(snapshot, mark, params)`、`underwater_close_outcome(snapshot, mark, params)`。3 つを合わせると、liquidation event を `(fund credit, trader への残額)` あるいは `(fund debit, 部分的に取れた fee)` のタプルに分解する — まさに Stage 10c の scanner が close ごとに `InsuranceFund::deposit` / `InsuranceFund::withdraw_shortfall` を呼ぶために必要な shape だ。

L10 の後、`compute` モジュールと `insurance` モジュールはカスケード数学を介して会話するようになる。Pure 関数が credit/debit の数字を生み、state machine がそれらを蓄積する。L11 はこのループを `LiquidationScanner` で包み、safety-net cascade が runnable な scanner を持つ。

````

---

## Seed-file slot

L9 は Module 3 の sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 9 — withdraw_shortfall — Layer 2 → Layer 3 境界をコードで表現する',
  slug: 'openhl-liquidation-withdraw-shortfall-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 9 — withdraw_shortfall — Layer 2 → Layer 3 境界をコードで表現する\n\n...`
},
```

## SHA pinning discipline

L9 は `260883b`（Stage 10b）を引用する。L9 後、`insurance.rs` は答え合わせと byte-for-byte 一致。State machine 全体が揃った。次に SHA がピン留めし直されるのは L11 で、Stage 10c（`scanner.rs`）の導入時。L10 は `compute.rs` に戻るので `260883b` のまま据え置き。

## 翻訳セルフレビュー（paste 前）

- **L9 は Liquidation コースで今のところ最長**（30 分、L8 の 25 分から少し伸びる）。Proptest 素材が長さを正当化する — proptest は unit-test 推論には現れない不変条件を encode するので、独立した扱いが要る。読者は L8 で state machine を学んだばかり。L9 の仕事は、それが正しく動くことを *証明する* 方法を教えることだ。
- **「3-variant outcome enum」フレーミングが L8 から繰り返される。** 意図的だ。L8 で enum が宣言だけされて未使用だったのを読者は見た。L9 で variant に呼び出し地点を与え、enum を生かす。繰り返しは「これが payoff」のシグナルであって、冗長ではない。
- **4 つの proptest プロパティがレッスン中で最も深い素材だ。** 一番多くの「押さえる点」アイテム（8 個）と、設計の振り返りでの明示的な動機付けを与えた。Proptest をスキップした読者でもコードは ship できる。Proptest を内面化した読者は、crate 内の任意の将来の proptest を自信を持って読める。**L9 は、コースが「コードを ship するためになぞる」から「このコードがなぜ正しいかを理解する」へと遷移する地点だ。**
- **次のレッスン preview で L10 + Stage 10c context を名指しする。** Honest scoping: L10 はまだ `260883b`（Stage 10b 完了済み）、L11 で Stage 10c にジャンプする。読者は SHA pinning がもう 1 レッスンは安定することを知る。
- **L9 で `lib.rs` に新規変更はない。** 意図的だ — L8 ですでに `WithdrawOutcome` を re-export 済み。L9 の読者は 1 ファイル（`insurance.rs`）だけ編集して、答え合わせ diff が閉じる。レッスンごとの self-contained なスコープが規律だ。

### JA 特有のスタイル決定

- **専門用語は英語のまま** (`outcome enum`、`saturating_sub`、`shrinkage`、`abelian-group structure`、`Layer 2/3` など)。L0-L8 の慣例に従う。
- **Code コメントは英語のまま** (`// Defensive: ...`、`// ─── proptest: type invariants ───`)。答え合わせと byte-for-byte 一致させるため。
- **`load-bearing` は英語のまま使用。** L8 と同じ。「決定的な」「核心となる」より rhetoric の鋭さが残る。
- **「pattern-match して route」**などの動詞句は、カタカナ動詞化（パターンマッチする）よりも自然に「pattern-match する」を使った — 読者が英語の Rust 用語に馴染んでいる前提。
