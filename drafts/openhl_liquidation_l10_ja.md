# Building OpenHL Liquidation — L10 draft (JA) — build-along

> openhl SHA `260883b`（Stage 10b — insurance fund state machine + close-outcome decomposition）に対するドラフト。

## L10 — `openhl-liquidation-close-outcome-decomposition-ja`

**Stage**: Stage 10b — `260883b`

**Title**: レッスン 10 — `liquidation_fee` + close-outcome decomposition — `compute` と `insurance` をつなぐ橋

**Duration**: 35 分 · **XP**: 70

---

````markdown
# レッスン 10 — `liquidation_fee` + close-outcome decomposition — `compute` と `insurance` をつなぐ橋

## ゴール

このレッスンで掴む概念:

- **すべての liquidation event は `(fund movement, account residual)` のペアに分解できる。** Solvent な close は fund に credit し、正の residual を trader に返す。Underwater な close は fund に debit し、場合によっては partial fee を回収する。本レッスンの 2 つの関数がこの分解を一度コード化すれば、Stage 10c の scanner は数学が生成した *正確な* 数字に対して `InsuranceFund::deposit` と `InsuranceFund::withdraw_shortfall` を呼べる。**Pure compute は credit/debit を生み、state machine がそれを蓄積する。**
- **`debug_assert!` を routing contract として使う。** `solvent_close_outcome` と `underwater_close_outcome` は *非重複* (non-overlapping) だ。それぞれが「*もう一方* の呼び出しではなかった」ことを debug-assert で表明する。このペアは「caller が routing 義務を負う discriminated dispatch」であり、関数は前提条件のウィンドウ内でのみ total になる。**`debug_assert!` は、型システムが encode できない契約を文書化する。**
- **`fee.saturating_sub(post_close_equity)` が `post_close_equity` 負値のとき何をするか。** レッスン中で最もきれいな算術だ: `i64 − (負の i64) = i64 + |負の i64|`。「already-underwater」サブケースが「partial fee」サブケースと同じ式を再利用できるのは、負値の減算が magnitude の加算になるからだ。**`if` の分岐が signed なオペランドの場合、1 つの式で両方の分岐をカバーできる。**
- **`Result` でも 1 つの enum でもなく、2 つの異なる戻り型。** `SolventClose { fee_to_fund, residual_to_account }` と `UnderwaterClose { fee_to_fund, shortfall_to_fund }` は `fee_to_fund` フィールドを共有するが、もう一方のフィールドは完全に異なる意味を持つ。意味の差が重い — residual は trader へ *出ていく*、shortfall は fund から *入ってくる*。`Option<i64>` で 1 スロットに押し込むと dispatch がぼやける。**2 つのパスが質的に異なるフィールド意味を生むとき、2 つの struct 型が 1 つの enum に勝つ。**

確認:

```bash
cargo test -p openhl-liquidation
```

…で 55 テストが pass する（compute 34 + insurance 21）。L10 後、Stage 10b の crate 全体が `260883b` と byte-for-byte 一致する。

具体的な変更:

- **`src/types.rs`。** `SolventClose` 構造体と `UnderwaterClose` 構造体を doc コメント付きで追加。
- **`src/compute.rs`。** `liquidation_fee`、`solvent_close_outcome`、`underwater_close_outcome` を追加。新規 unit test 10 個（fee 4 + solvent 3 + underwater 3）。
- **`src/lib.rs`。** compute の re-export に 3 関数、types の re-export に `SolventClose` + `UnderwaterClose` を追加。

L10 で Stage 10b を閉じる。本レッスンの後、`260883b` に対する答え合わせ diff は liquidation crate の全ファイルで完全にクリーンになる。

## おさらい

L9 の後:
- `insurance.rs` は `260883b` と byte-for-byte 一致 — `InsuranceFund` state machine + `WithdrawOutcome` enum + 12 unit test + 4 proptest が揃う。
- `lib.rs` は `InsuranceFund` と `WithdrawOutcome` を re-export 済み。
- `cargo test` は 45 テストを走らせ、すべて green。
- Fund は deposit を受け取り、drain を surface できる。**だが、特定の close に対して「いくら deposit するか / drain するか」を計算するものはまだ存在しない。**

L10 がそのギャップを埋める。新しい compute 関数 3 つが、Stage 10c の scanner が state machine に流し込む「数値の出どころ (source of truth)」になる。

## 計画

編集は 4 つ:

1. **`crates/liquidation/src/types.rs` に `SolventClose` + `UnderwaterClose` 構造体を追加。** どちらも 2 フィールドのシンプルな構造体、`#[derive(Clone, Copy, Debug, PartialEq, Eq)]` で揃える。
2. **`crates/liquidation/src/compute.rs` に 3 つの関数を追加**:
   - `liquidation_fee(closed_notional, params)` — i128 中間値を使った pure な fee math。
   - `solvent_close_outcome(snapshot, mark, params)` — post-close equity が fee を cover できるアカウント用の `SolventClose`。
   - `underwater_close_outcome(snapshot, mark, params)` — cover できないアカウント用の `UnderwaterClose`。
3. **既存の `#[cfg(test)] mod tests` に 10 個の unit test を追加。**
4. **`crates/liquidation/src/lib.rs` を拡張** — 新規 3 関数と 2 型を re-export。

> 🛑 **予測。** 続きを読む前に考えてほしい。Trader が 1 BTC を long で保有。Entry $100k、collateral $10k。$80,500 で force-close される（$19,500 の損失）。Hyperliquid デフォルトの `liquidation_fee_bps` は 150（1.5%）。問: **このクローズで insurance fund は credit するか debit するか、そして金額はいくらか?**

（答え: **Fund は debit する — $10,707 の shortfall を吸収しなければならない。** 流れを追う。Close 時の notional は $80,500。Fee = $80,500 × 150 / 10,000 = $1,207.50、整数演算で $1,207 に切り捨て。Trader の realized PnL は −$19,500、post-close equity = $10,000 collateral + (−$19,500 PnL) = −$9,500 — *fee を引く前* にすでに underwater。Fee は徴収できない（負の残高に課金はできない）。Fund は「望ましかった fee」と「負の equity」の両方を cover する必要がある: $1,207 + $9,500 = $10,707。これが `underwater_close_outcome` の「already underwater」サブケースであり、Perp Primer L3 で扱ったシナリオと同一の数字だ。概念で学んだ計算がコードで再登場する。）

L10 の decomposition picture:

```
   ┌────────────────────────────────────────────────────────────┐
   │  Stage 10b compute が生成する per-close 分解               │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  SOLVENT パス                                              │
   │  ────────────                                              │
   │  post_close_equity ≥ fee  →  SolventClose {                │
   │                                fee_to_fund:           +X   │  ──→ Fund へ入金
   │                                residual_to_account:   +Y   │  ←── Trader へ返金
   │                              }                             │
   │                                                            │
   │  Stage 10c scanner はこう使う:                             │
   │    fund.deposit(fee_to_fund)                ← Layer 2 成長  │
   │    trader_balance += residual_to_account    ← 払い戻し      │
   │                                                            │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  UNDERWATER パス（2 サブケースを 1 つの shape で扱う）     │
   │  ─────────────────                                         │
   │  0 < post_close_equity < fee  →  UnderwaterClose {         │
   │      (partial fee)                 fee_to_fund:       +X   │  ──→ Fund へ入金
   │                                    shortfall_to_fund: +Y   │  ←── Fund から引き出し
   │                                  }                         │
   │                                                            │
   │  post_close_equity ≤ 0       →  UnderwaterClose {          │
   │      (already underwater)          fee_to_fund:        0   │
   │                                    shortfall_to_fund: +Z   │  ←── Fund から引き出し
   │                                  }                         │
   │                                                            │
   │  Stage 10c scanner はこう使う:                             │
   │    fund.deposit(fee_to_fund)            ← 0 のこともある    │
   │    fund.withdraw_shortfall(shortfall_to_fund)               │
   │      ↑ WithdrawOutcome を返す (L9)                          │
   │      ↑ Depleted/PartiallyDrained は ADL へエスカレート       │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
```

図で押さえる点が 3 つ:

1. **`SolventClose` の出力はシステムから *出ていく*。`UnderwaterClose` の出力はシステムへ *入ってくる*。** Residual は trader に返る（account への正のフロー）。Shortfall は fund から引かれる（close への正のフロー）。Magnitude の shape は同じ（`i64 ≥ 0`）。逆なのは方向だけ。**お金の *方向* は符号ではなくフィールド名に住む。**
2. **`UnderwaterClose` は 2 つのサブケースを 1 つの shape にコンパイルする。** `i64` フィールド 2 つの単一構造体が「partial fee, partial shortfall」と「zero fee, full shortfall」の両方をカバーする。`kind` 判別子は要らない — `fee_to_fund` の *値* (zero or positive) が区別を運ぶ。**フィールド値ですでに分かることに、サブケースのタグを付けない。**
3. **この分解こそが Stage 10c を可能にする。** Scanner は close が solvent か underwater か、*なぜそうなのか* を知る必要がない。名前付き semantics を持つ 2 つの i64 が返ってくれば十分。**数学と state の間にクリーンな分解があれば、state-machine 層は dumb なままでいられる。**

## 手を動かす walk-through

### Step 1: `src/types.rs` に `SolventClose` + `UnderwaterClose` を追加

`crates/liquidation/src/types.rs` を開く。既存の `CloseOrderSpec` 定義の後に追記:

```rust
/// Solvent-close outcome (Stage 10b).
///
/// Produced by [`crate::compute::solvent_close_outcome`] for a Liquidatable
/// account whose post-close equity covers the liquidation fee in full.
/// Both fields are non-negative.
///
/// `fee_to_fund` is credited to the insurance fund; `residual_to_account`
/// is returned to the trader's collateral balance.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SolventClose {
    /// Fee deducted from collateral and credited to the insurance fund.
    pub fee_to_fund: i64,
    /// What's returned to the trader's collateral after the close + fee.
    pub residual_to_account: i64,
}

/// Underwater-close outcome (Stage 10b).
///
/// Produced by [`crate::compute::underwater_close_outcome`] when the
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
/// Both fields are non-negative; `fee_to_fund` may be `0` in the
/// negative-equity case.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct UnderwaterClose {
    /// Partial fee collected from any positive post-close equity, credited
    /// to the insurance fund. May be `0`.
    pub fee_to_fund: i64,
    /// What the insurance fund must absorb so the close completes. The
    /// caller hands this to [`crate::insurance::InsuranceFund::withdraw_shortfall`].
    pub shortfall_to_fund: i64,
}
```

型について押さえる点が 4 つ:

1. **両方の struct の両フィールドが `i64`、`u64` ではない。** L8 の `InsuranceFund::balance` と同じ型統一性の理由だ。Crate 全体が `i64` で計算する。非負性は型ではなく doc コメントで document する。**Crate 内の型統一性は時間とともに複利で効く。フィールド単位の符号なしは局所的な便利さに過ぎず、境界ごとにキャストを発生させる。**
2. **どちらの struct も同じ derive 集合: `Clone + Copy + Debug + PartialEq + Eq`** — `WithdrawOutcome` と `InsuranceFund` と同じ集合だ。これらは 16 バイトの POD 型。値渡しが reference より安い。**この crate の pure-value 型は一貫した derive リストを使う。予測可能性そのものが美徳だ。**
3. **Doc コメントはフィールドの *行き先* を名指す。*出どころ* ではない。** `fee_to_fund` は「ここに行く（insurance fund）」と言い、「ここから来た（trader の collateral）」とは言わない。`shortfall_to_fund` は「行き先（fund からクローズへ）」を言い、それを生んだ負 equity の算術は言わない。**フィールド名は caller がそれを *どう使うか* で名付け、producer が *どう計算したか* では名付けない。**
4. **`UnderwaterClose` はサブケースに関わらず `shortfall_to_fund` を常に運ぶ。** どちらのサブケースが発火しても、構造体の shape は変わらない。Caller は struct shape ではなく *値* に対してパターンマッチする（`if shortfall_to_fund > 0 { fund.withdraw_shortfall(...) }`）。**Total field presence > サブケース固有 shape。Caller はゼロに対して 1 度マッチするだけで済む。**

### Step 2: `src/compute.rs` に `liquidation_fee` を追加

`crates/liquidation/src/compute.rs` を開く。`saturate_i128_to_i64` ヘルパーの後（ヘルパーセクションの末尾、テストブロックの前）に追記:

```rust
/// Liquidation fee on a closed notional, in quote units.
///
/// `fee = notional × fee_bps / MARGIN_SCALE`, saturating on overflow.
/// Pure math — the caller (Stage 10c scanner / bridge) supplies the
/// actual fill notional from the matching engine.
///
/// Returns `0` for a zero notional (flat positions; should never reach
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
```

押さえる点が 5 つ:

1. **`closed_notional: u64`（入力）、`-> i64`（出力）。** Notional は常に非負 — magnitude だ（price × |size|）。出力が signed なのは crate 内の他の算術が signed だからだ。Fee は trader の equity から `i64` 減算で引かれ、call site で `u64 → i64` キャストを強制すると scanner が散らかる。**入力境界での unsigned はドメインの事実を捉え、出力での signed は周囲の算術に揃える。**
2. **`closed_notional == 0` の fast-path return。** Flat ポジション（close path にはほぼ来ない）に対する 3 回の `i128` 変換と saturating multiply をスキップする。Scanner が defensive にこれを呼ぶこともある。**支配的なゼロケースを扱う安価な述語は、その存在を正当化する。**
3. **`as i128` ではなく `i128::from(...)`。** `From` は構造的に無敗 — `u64 → i128` も `u32 → i128` も widening 変換で、データを失わない。`From` を使うと意図が明示され、後で narrowing 位置に `as` がこっそり入り込むのを防げる。**コンセンサス算術と話すコードでは、widening のデフォルトは `From`。`as` は narrowing でビット幅を制御できるところに限定する。**
4. **i128 積に `saturating_mul`。** `u64::MAX × u32::MAX` の病理ケース（`fee_saturates_on_pathological_input` テストが発火）でも `i128` がオーバーフローする可能性がある。Saturating-mul は `i128::MAX` で頭打ち、その後 helper が `i64::MAX` に再 saturate する。**直列の二段 saturation は問題ない — それぞれが次を防御する。**
5. **`saturating_div` は使わない。** i128 上の整数除算はオーバーフローしない（`i128::MIN / -1` を除く。だがここでは分子・分母とも非負なので unreachable）。素の `/` で正しい。代替は単なる儀式だ。**Saturating 演算は overflow *しうる* 算術のためのもの。両オペランドが非負な除算では不要。**

### Step 3: `src/compute.rs` に `solvent_close_outcome` を追加

`liquidation_fee` の下に追記:

```rust
/// Solvent-close outcome — the trader's collateral plus realized `PnL`
/// covers the liquidation fee in full, with positive residual returning
/// to the account.
///
/// **Precondition** (debug-asserted): the account is Liquidatable AND the
/// post-close equity (= collateral + realized `PnL` at `close_price`)
/// covers the desired fee. If the precondition is violated, the result
/// has `residual_to_account ≤ 0` — caller should have routed to
/// [`underwater_close_outcome`] instead.
///
/// Stage 10b never mutates state — this is pure compute that produces
/// the credit/debit pair for the caller (Stage 10c scanner) to apply
/// against [`crate::insurance::InsuranceFund`] and the trader's balance.
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
        "solvent_close_outcome called with post_close_equity={post_close_equity} < fee={fee}; \
         caller should route to underwater_close_outcome instead",
    );
    SolventClose {
        fee_to_fund: fee,
        residual_to_account: post_close_equity.saturating_sub(fee),
    }
}
```

押さえる点が 6 つ:

1. **関数は Stage 10a の関数 *3 つを compose* する。** `notional_value`、`liquidation_fee`（Step 2 で追加）、`account_equity` がすべて inline で呼ばれる。新しい数学はない。3 つの既存プリミティブからパッケージ化された outcome を生む *routing 関数* だ。**High-level な outcome 関数は low-level な数学を compose すべきだ。複製してはいけない。**
2. **`debug_assert!` が契約そのもの。** 前提条件（`post_close_equity >= fee`）は caller がすでに行った *routing 判断*「これは solvent な close だ」と等価だ。Underwater な close で `solvent_close_outcome` を呼ぶのは *caller の bug* であり、ランタイム分岐ではない。`debug_assert!` は debug ビルドで発火し、release ではコンパイルアウトされる。**ランタイム挙動は変わらない。開発時に caller の bug を捕まえ、本番では消える。**
3. **`debug_assert!` のエラーメッセージは *名前付き値* を含む。** このアサートを発火させた開発者は、行番号ではなく `post_close_equity=-500 < fee=1207` を見る。Format-string capture（`{post_close_equity}`）を使えば、成功パスでの文字列アロケーションコストはゼロ。**Assertion メッセージでの format-string capture は、assertion が pass する限りゼロコスト。失敗したときに大きく払い戻す。**
4. **`debug_assert!` が `equity ≥ fee` を保証するのに `post_close_equity.saturating_sub(fee)`。** なぜか。Release ビルドでは `debug_assert!` は発火しない。Caller の bug がリリースで assertion をスキップしても、素の `-` はサブトラクションを完了させる。だが他所の bug — たとえば上流のオーバーフローで `equity` が `i64::MIN` になる — が `equity - fee` を underflow させうる。Saturation はどんなケースでも clamp された i64 を返す。**Saturating 算術は `debug_assert!` のベルト＆サスペンダー的補完だ。両者で dev と prod 両方をカバーする。**
5. **`params: &LiquidationParams` を reference で取る、値ではなく。** `LiquidationParams` は `Copy + 12 バイト`。値渡しは微妙に安いが、crate 内の他のすべての compute 関数が reference で取るので一貫性を取る。**Sibling 関数の呼び出し慣例に揃える。**
6. **タプル返しではない。** `(i64, i64)` を返して caller に「どっちがどっちか」を委ねる手もある。`SolventClose` を名前付きフィールドで返すと、call site での dispatch が self-documenting になり、フィールド順を交換する future の mistake を防げる。**名前付きフィールドの struct は、call site が「2 つ目は何だっけ?」と思い出す必要があるたびにタプルに勝つ。**

### Step 4: `src/compute.rs` に `underwater_close_outcome` を追加

`solvent_close_outcome` の下に追記:

```rust
/// Underwater-close outcome — the account's post-close equity cannot
/// cover the liquidation fee, so the insurance fund must absorb the
/// shortfall.
///
/// Handles both sub-cases under one shape:
///   - Positive but insufficient post-close equity (Liquidatable account
///     whose close + fee turned underwater): the equity is paid as a
///     partial fee, the rest becomes the shortfall.
///   - Negative post-close equity (Underwater account before fee): no
///     fee is collected, the entire fee plus `|equity|` becomes the
///     shortfall.
///
/// **Precondition** (debug-asserted): `post_close_equity < fee_desired` —
/// otherwise the close is solvent and the caller should have routed to
/// [`solvent_close_outcome`].
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
        "underwater_close_outcome called with post_close_equity={post_close_equity} ≥ fee={fee}; \
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
        // the full fee plus the negative equity. `fee - negative_equity`
        // is `fee + |equity|` via saturating_sub semantics.
        UnderwaterClose {
            fee_to_fund: 0,
            shortfall_to_fund: fee.saturating_sub(post_close_equity),
        }
    }
}
```

押さえる点が 7 つ:

1. **2 つのサブケース分岐が同じ `shortfall_to_fund` 式を共有する: `fee.saturating_sub(post_close_equity)`。** Partial-fee ケースでは `equity` が正で、サブトラクションが未徴収部分を生む。Already-underwater ケースでは `equity` が負またはゼロで、サブトラクションは `fee - negative = fee + |equity|` になる。具体的には、`fee = 1207`、`post_close_equity = -9500` のとき:

   ```
   1207 - (-9500) = 1207 + 9500 = 10707
   ```

   — `.abs()` も明示的な `+` も「符号で分岐」も書かずに、コードがこの答えに到達する。**1 つの式が両方の分岐をカバーするのは、整数の「負値の減算」が「magnitude の加算」と等価だからだ。** レッスン中で最もきれいな算術だ。ジュニアな読者はこれを 2 度見て *bug だと思う*。シニアな読者はこれを見て関数が動く理由を理解する。（Step 4 のコードコメント内の `negative_equity` は、負値を取ったときの `post_close_equity` を指す *概念名* であって、別の変数ではない。）
2. **`if post_close_equity > 0` の分岐は *厳密な大なり*。** Post-close equity がちょうどゼロのケースは `else`（already-underwater）に落ち、`fee_to_fund = 0` になる。セマンティクスに合っている: collateral が消尽していれば、徴収するものが *ない*。**境界述語での strict greater-than は、ゼロを「仕事なし」の分岐に route する。**
3. **`fee_to_fund` は分岐で異なる。`shortfall_to_fund` は変わらない。** 非対称性は意図的だ。*fee の徴収* は equity が正かどうかに依存するが、*shortfall* は常に `fee - equity`（負の equity は shortfall を増やす方向に効く）。**2 つの分岐が作業の一部を共有するとき、共有式を factor out するのは、節約が可読性のコストを上回るときだけにする。** ここで早めに `let shortfall = fee.saturating_sub(post_close_equity);` を入れると、12 文字の節約と引き換えに inline な視覚的対称性を失う。重複のままにする。
4. **`else` 分岐は equity = 0 と equity < 0 を別々に `match` しない。** どちらのケースも同じ出力（`fee_to_fund = 0, shortfall = fee - equity`）を生むので、分岐を共有する。**出力が 1 つの式に collapse するコードパスは 1 つの分岐を共有する。**
5. **doc コメントは *user-facing なサマリー* として** どちらのサブケースがいつ発火するかを語る。Walk-through を終えた読者は、後で別の場所でこの関数を使うときに doc コメントに戻ってくる。Doc は本体なしで自立しなければならない。**Doc コメントは、あなたの関数本体が開いていない *consumer* に読まれる。**
6. **`debug_assert!` の述語が `solvent_close_outcome` から反転する。** 意図的だ: 2 つの assertion は入力空間の *非重複カバー* を成す。`solvent ⇔ equity ≥ fee` と `underwater ⇔ equity < fee` が入力空間を網羅的に partition する。ペアは discriminated dispatch であり、assertion がそれを証明する。**反対前提条件を持つ 2 つの pure 関数のペアは、慣例による discriminated dispatch だ — 型システムが助けてくれないが、assert のペアがその役を果たす。**
7. **`post_close_equity == 0` への early return はない。** 「ちょうどゼロ」が common な境界だから fast path を加えるべきと思う読者もいるかもしれない。加えない。`else` 分岐がすでに正しい答えを生み、分岐評価コストは比較 1 回。**境界 fast-path を加えるのは、境界で数学が *実際に* 違うときだけ。**

> 🛑 **やりがちな勘違い。** 「`solvent_close_outcome` と `underwater_close_outcome` を 1 つの関数にまとめて `Result<SolventClose, UnderwaterClose>` を返せばいいのでは?」 問題が 3 つ。(1) どちらの outcome もエラーではない。両方とも *成功* した close で、別々の state-machine 操作に route される。(2) Stage 10c の scanner はマージン健康度チェックを *すでに* 行って *適切なほう* を呼ぶ。Dispatch を `Result` 経由でやると、scanner がすでにやった仕事を繰り返す。(3) `debug_assert!` のペアは 2 つの別関数のほうが意味を持つ。各関数が自分の契約を表明する。Tagged union を返す 1 関数では「partition のこちら側はここでだけ正しい」が表現できない。**反対前提条件の 2 つの関数は、tagged union を返す 1 つの関数より discriminated dispatch を上手く表現する。**

### Step 5: 10 個の unit test を compute.rs に追加

既存の `#[cfg(test)] mod tests` ブロック内、L7 の close-order-spec テストの後に 3 つのテストセクションを追加:

```rust
    // ─── Stage 10b: liquidation_fee ────────────────────────────────

    #[test]
    fn fee_basic() {
        // 1.5% of $80,400 = $1,206 — matches the Perp Primer L3 example.
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

    // ─── Stage 10b: solvent_close_outcome ──────────────────────────

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
        // Construct: size=1, entry=10_000, collateral=10, mark=10_000.
        //   notional = 10_000; fee = 150
        //   pnl = 0; post_close_equity = 10 (collateral only)
        // For fee == equity exactly: need fee = collateral when pnl = 0.
        //   fee = notional × 150 / 10_000 = notional × 0.015
        //   notional = collateral / 0.015
        // Pick collateral=150, then notional must be 10_000.
        let s = snapshot(1, 10_000, 150);
        let params = LiquidationParams::hyperliquid_default();
        let outcome = solvent_close_outcome(&s, MarkPrice(10_000), &params);
        assert_eq!(outcome.fee_to_fund, 150);
        assert_eq!(outcome.residual_to_account, 0);
    }

    // ─── Stage 10b: underwater_close_outcome ────────────────────────

    #[test]
    fn underwater_close_already_underwater_pre_fee() {
        // Perp Primer L3 scenario: 1 BTC long, entry $100k, $10k collateral,
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
        // Liquidatable account whose close + fee just barely turns underwater.
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
```

テスト設計で押さえる点が 7 つ:

1. **セクション区切りが関数名と一致する** — `liquidation_fee`、`solvent_close_outcome`、`underwater_close_outcome`。L9 と同じ grep-friendly なグルーピングだ。**テストは exercise する関数でグループ化する。ファイル構造に API を documented させる。**
2. **`fee_basic` は Perp Primer L3 の数字を使う。** $80,400 × 1.5% = $1,206 は Perp Primer L3 で概念的に walk-through した計算と同じだ。同じ数字を具体的なコードで見ること自体が **curriculum-to-implementation の reinforcement** になる。Primer 経由で来た読者は、抽象が実際の算術に着地する瞬間を感じる。
3. **`fee_zero_bps` は `LiquidationParams` を inline で構築する** — `hyperliquid_default()` を使わずに。なぜか。デフォルトは `liquidation_fee_bps = 150` で、このテストは `bps = 0` が必要。**テストするパラメータがデフォルトから divergence するとき、デフォルトを mutate するのではなく inline で構築する。** テストの意図がトップで可視化される。
4. **`fee_saturates_on_pathological_input` は `u64::MAX` と `u32::MAX` の両方を使う。** これが i128 saturation path を exercise する *唯一の* テストだ。算術: `u64::MAX × u32::MAX ≈ 2^96`。i128 には収まるが、`i64` には壊滅的に overflow する。Saturating-mul は `i128::MAX` で頭打ちにし、最後の saturate-to-i64 で `i64::MAX` を生む。**Pathological input テストは、このコードパスが *唯一* 実行される場所。これがないと saturation は dead-code 同然になる。**
5. **`solvent_close_short_profit` は long-loss の補完として存在する。** Long → loss → solvent close が想定シナリオ。Short → profit → solvent close（「favorable」liquidation）は trader が投入分より *多く* 戻ってくるケース。両方とも同じ shape の `SolventClose` を生むが、residual の数字は大きく異なる（3,575 vs 18,650）。**符号付き入力関数のテストは両方の符号をカバーしなければならない。**
6. **`solvent_close_fee_consumes_all_residual` には *構築を説明するコメント* がある。** `post_close_equity == fee` となる入力を求めるには、`fee = notional × 150 / 10_000` を解く必要がある。テスト内のコメントが読者を構築過程に通す。**値が magic に見えるテストには、なぜその値なのかを説明するコメントを書く。**
7. **`underwater_close_already_underwater_pre_fee` は Perp Primer L3 の数字を再利用する。** 同じ $100k entry、$10k collateral、$80,500 でクローズ、同じ $19,500 の PnL — Primer の概念シナリオがいまや `UnderwaterClose { fee_to_fund: 0, shortfall_to_fund: 10_707 }` を生成し、答え合わせコードに対して検証される。**Curriculum reinforcement はコース全体で複利化する。Primer の数字を L10 で再利用することでループが閉じる。**

### Step 6: `src/lib.rs` を更新

既存の re-export を拡張。`pub use compute::{ ... };` ブロックを見つけて拡張する。L7 後はこうだった:

```rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
```

更新後:

```rust
pub use compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, margin_ratio,
    notional_value, solvent_close_outcome, underwater_close_outcome, unrealized_pnl,
};
```

次に `pub use types::{ ... };` ブロックを拡張。元:

```rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

更新後:

```rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, SolventClose,
    UnderwaterClose, MARGIN_SCALE,
};
```

新規関数名 3 つ（`liquidation_fee`、`solvent_close_outcome`、`underwater_close_outcome`）と新規型名 2 つ（`SolventClose`、`UnderwaterClose`）、すべて alphabetical に挿入。L10 後、crate の public surface は compute 関数 9 個 + types 8 個になる。

### Step 7: テストを走らせる

```bash
cargo test -p openhl-liquidation
```

期待される出力（短縮版）:

```
running 55 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
... (Stage 10a の 8 テスト)
test compute::tests::fee_basic ... ok
test compute::tests::fee_saturates_on_pathological_input ... ok
test compute::tests::fee_zero_bps ... ok
test compute::tests::fee_zero_notional ... ok
... (さらに compute テスト)
test compute::tests::solvent_close_fee_consumes_all_residual ... ok
test compute::tests::solvent_close_short_profit ... ok
test compute::tests::solvent_close_typical_liquidatable ... ok
test compute::tests::underwater_close_already_underwater_pre_fee ... ok
test compute::tests::underwater_close_partial_fee_collection ... ok
test compute::tests::underwater_close_zero_equity_at_fee ... ok
... (L8 + L9 の insurance テスト)

test result: ok. 55 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**55 テスト pass。Stage 10b 完成。** Crate 全体 — `compute.rs`、`insurance.rs`、`types.rs`、`lib.rs` — が `260883b` と byte-for-byte 一致。Pure math、stateful な fund、decomposition outcomes が並んで揃った。

エラー時にありがちなパターン:

- **`underwater_close_already_underwater_pre_fee` が `shortfall_to_fund: 1_207 - 9_500`（つまり負）で失敗。** 素の `i64 - i64` で `fee - post_close_equity` を書いた。算術的には動くが、サブトラクションの符号を取り違えている。正しくは `fee.saturating_sub(post_close_equity)` = `1_207 - (-9_500)` = `+10_707`。`fee.saturating_sub(post_close_equity)` の doc コメントを読み直す。トリックは「負値の減算は magnitude の加算になる」だ。
- **`underwater_close_partial_fee_collection` が `fee_to_fund: 0, shortfall_to_fund: 1_357` で失敗。** `if` 分岐を `>` ではなく `>=` と書いた。`>=` だと equity = 0 が partial-fee 分岐に route される（数学的には正しい: `fee_to_fund = 0, shortfall = fee - 0 = fee`）が、意図が違う。Doc は「positive but insufficient」と言う。厳密に positive だ。
- **`solvent_close_typical_liquidatable` が `debug_assert!` メッセージで panic。** L4/L5 の `account_equity` か `notional_value` が誤った符号を返している。期待される `post_close_equity` は +$5,000。それ以外が返るなら、Stage 10a の算術を walk-through して上流の関数をまず修正する。
- **`fee_saturates_on_pathological_input` が overflow panic で失敗。** `n.saturating_mul(bps)` ではなく素の `n * bps` を書いた。i128 上のオーバーフロー乗算も debug でまだ panic する。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **`(fund movement, account outcome)` の分解こそが cascade を composable にする。** Stage 10c の scanner は本質的にループだ。各 Liquidatable アカウントについて solvent/underwater を判定し、適切な outcome 関数を呼び、credit/debit を fund と trader にルーティングする。このループが trivial になるのは、L10 が数学を「名前付きフィールドの出力を持つ 2 関数」にパッケージ化したからだ。**数学と state の間にクリーンな分解があれば、state-machine 層は dumb なままでいられる。**

2. **`debug_assert!` は契約、`saturating_sub` はシートベルト。** Assertion は前提条件を文書化し、開発時に caller の bug を捕まえる。Saturation は本番（assertion がコンパイルアウトされる場所）で同じ bug を捕まえて sane な値に clamp する。**どちらも単独では十分でない** — そしてそれがペアリングの本質だ。`debug_assert!` 単独では、release で上流バグ（オラクル異常値、壊れた snapshot など）が来たときに underflow して silently wrap する。`saturating_sub` 単独では、caller の *routing バグ*（本来 underwater なのに solvent パスに迷い込んだ呼び出し）を黙って吸収し、症状を隠したまま原因が debug されないまま残る。二段構え、二つの failure mode: **開発時には bug が住むその場所で爆発させて修正させる (assert)、本番では bug が mainnet にすり抜けたとしても chain を fork させない (saturate)。** **Pure compute での defensive coding は dev-time assertion + prod-time saturation のペアを使う。**

3. **反対前提条件を持つ 2 関数 > tagged union を返す 1 関数。** `solvent_close_outcome` と `underwater_close_outcome` は *慣例による* discriminated dispatch だ。Caller が margin-health チェックで route を決め、関数の debug-assert がその routing 判断を enforce する。代替案 — `enum CloseOutcome { Solvent(SolventClose), Underwater(UnderwaterClose) }` を返す 1 関数 — は routing 仕事を関数内で *繰り返す*。**Caller がすでに routing 判断をしているとき、正しいインターフェースは 2 関数で、tagged-union を返す 1 関数ではない。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L10 の後:
- **compute.rs** は Stage 10b の `compute.rs` と **byte-for-byte 一致**。
- **types.rs** は Stage 10b の `types.rs` と **byte-for-byte 一致**。
- **lib.rs** は Stage 10b の `lib.rs` と **byte-for-byte 一致**。
- **insurance.rs** は L9 以来 byte-for-byte 一致している。

**Stage 10b 完成。** `openhl-liquidation` crate 全体（コミット `260883b`）が workspace に揃った。rethlab Liquidation コースの Module 3（insurance fund）はここで完結する。

## よくある質問

**Q1: `liquidation_fee` がなぜ「四捨五入」ではなく「切り捨て（整数除算）」なのか?**

コンセンサス決定性が全 validator に同じ数を計算させるから、そして Rust の整数 `/` 演算子が **ゼロ方向への切り捨て (truncation toward zero)** だからだ — あらゆる言語 ABI で曖昧さのないデフォルト。Rounding semantics は言語間（banker's rounding vs half-away-from-zero）でもプロセッサーファミリ間でも違う。Truncation は *唯一* portably に同じ挙動の演算だ。同じ規律が、*crate 全体で* `f64` 算術を拒否する理由でもある: IEEE 754 の rounding mode は FPU 別、コンパイラフラグ別、演算順序別で結果が変わりうる — どれもチェーン fork のリスクだ。Integer + saturation + truncation だけが、全 validator に byte-identical な state 遷移を与える唯一の道だ。**コンセンサス算術では、決定性の物語が最もシンプルな演算を選ぶ — bps 数分の手数料精度を犠牲にしてでも。**

**Q2: `solvent_close_outcome` と `underwater_close_outcome` を `AccountSnapshot` のメソッドにすべきか?**

しない。L7 Q3 の `close_order_spec` と同じ答えだ。両関数は `compute.rs` に住む。他の margin math 関数と隣り合うのがアーキテクチャ上の家だからだ。`AccountSnapshot` はデータ運搬役で `types.rs` に住む。Compute は `compute.rs` に住む。**Receiver ではなく概念で co-locate する。**

**Q3: `underwater_close_outcome` の「ほぼ underwater でない」境界（equity がちょうど fee と等しい）で `shortfall_to_fund` がゼロにならないのはなぜか?**

`debug_assert!` の前提条件が `equity < fee`（strict）だからだ。Caller が `equity == fee` で `underwater_close_outcome` を呼ぶと、assertion は debug で発火する。Release では走り続けて `fee_to_fund = post_close_equity = fee, shortfall_to_fund = 0` を生む — *実際には正しい*（close はちょうど solvent）。だが、caller の routing ミスを fix するのは関数の仕事ではない。**`debug_assert!` で契約を enforce し、saturation で enforce されなかったケースでも sane な答えが返るようにする。**

**Q4: `fee_saturates_on_pathological_input` テストは `liquidation_fee_bps = u32::MAX` を設定する。これは `4,294,967,295` — 4200 *万* パーセント以上だ。このテストは現実的か?**

現実的ではない。それがポイントだ。このテストは saturation path が *正しく発火する* ことを唯一の入力 regime で verify するために存在する。現実的なテストなら 50 から 500 bps の fee を扱う。このテストは *コンセンサス決定性ガード* — 悪意的に作られた `LiquidationParams` でも決定的・非 panic な出力を生むことを証明する。**Saturation テストは operating range ではなく境界に住む。**

**Q5: `solvent_close_outcome` を `Option<SolventClose>` を返す形にし、`None` が「実はこれは underwater で、もう一方の関数で retry してくれ」を意味する設計にできないか?**

できる。だが 2 つの問いを混同する: 「関数は complete したか?」と「caller は正しく route したか?」。現設計はこれらを分離する。関数は常に complete し（assertion が発火するケースでも値を返す）、開発時には assertion が routing エラーを捕まえる。**Completion semantics と routing semantics を混ぜるのは設計の臭い。別々のメカニズムに分ける。**

**Q6: `SolventClose` と `UnderwaterClose` でセマンティクスが異なるのに、なぜ `UnderwaterClose` の `fee_to_fund` が `SolventClose` と同じ名前なのか?**

セマンティクスは *同じ* だ。両フィールドが「この close の fee のうちこれだけが insurance fund に流れた」を意味する。`SolventClose` では full fee（正の collateral residual から徴収）。`UnderwaterClose` では partial fee（正だが不十分な equity から徴収）またはゼロ（負の equity から徴収）。*金額* は違うが、*行き先* は同じ。**フィールド名は行き先で名付ける。それを生んだ算術で名付けない。**

## 次のレッスン (L11) — `LiquidationScanner` 導入 (Stage 10c)

L11 で Stage 10c — multi-account scanner — が始まる。Scanner は L4-L10 が生んだものすべての state-machine consumer だ。`&[AccountSnapshot]` のスライスを取り、それぞれを L6 の `margin_health` で分類（Liquidatable、Underwater、Safe、At-Risk）し、Liquidatable アカウントごとに `solvent_close_outcome` か `underwater_close_outcome` を呼び、credit/debit を所有する `InsuranceFund` にスレッディングし、`ScanReport` を返す — どのアカウントが close されたか、どの ADL trigger amount が surface したか、scan 後に fund がどこに立っているか、をまとめたバッチサマリだ。

L11 の後、cascade は最初の *runnable* なレイヤーを得る: 数学 + state ではなく、数学 + state + orchestration loop。SHA pin は `260883b` から `0a8464e`（Stage 10c）に進む。

````

---

## Seed-file slot

L10 は Module 3 の sortOrder 2 に入る:

```typescript
{
  title: 'レッスン 10 — liquidation_fee + close-outcome decomposition — compute と insurance をつなぐ橋',
  slug: 'openhl-liquidation-close-outcome-decomposition-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 35,
  xpReward: 70,
  content: `# レッスン 10 — liquidation_fee + close-outcome decomposition — compute と insurance をつなぐ橋\n\n...`
},
```

## SHA pinning discipline

L10 は `260883b`（Stage 10b）を引用する。L10 後、liquidation crate の全ファイル — `compute.rs`、`insurance.rs`、`types.rs` と `lib.rs` — が答え合わせと byte-for-byte 一致。Stage 10b は閉じる。L11 で SHA pin が `0a8464e`（Stage 10c、scanner）に進む。

## 翻訳セルフレビュー（paste 前）

- **L10 は Liquidation コース最長のレッスン**（35 分 / 70 XP）。それは *Stage 10b の capstone* — `compute` と `insurance` を結ぶ関数 — であり、関数 3 つ + 新規型 2 つ + テスト 10 個を一度に walk-through する自然な場所だ。L10 を読み終えた読者は完全に動く Stage 10b crate を手にする。
- **「慣例による discriminated dispatch」フレーミング** が load-bearing な教授ポイントだ。ゴール、設計の振り返り、anti-fluency callout で再登場する。読者は `solvent_close_outcome + underwater_close_outcome` のペアがなぜ正しい設計か内面化する必要があり、後の contribution で 1 関数に refactor しないように、だ。
- **負 equity に対する `fee.saturating_sub(post_close_equity)`** は Stage 10b で最も clever な算術だ。Step 4 の「押さえる点」#1 は 2 文をこれに使う — 内面化した読者は crate 全体の signed 算術トリックのフレーミングを手にする。
- **Perp Primer の数字が再登場する**: `fee_basic`、`underwater_close_already_underwater_pre_fee`、`solvent_close_typical_liquidatable` の中で。Primer 経由で来た読者は、概念上の数学が integer assertion に固化するのを感じる。Curriculum reinforcement は long-game の道具で、L10 が払い戻すタイミングだ。
- **次のレッスン preview で Stage 10c、scanner を名指しする。** Honest scoping: L11 で SHA pin が `0a8464e` に進む — L8 以来初めて。読者は orchestration ループが次に登る山であることを知る。
- **`debug_assert!` 規律を明示的に名指す** のは本コース初。前のレッスンは「flat ポジションはこの関数に到達するが qty 0 を生む」のような implicit な前提条件 narrative を使った。L10 はこれを load-bearing な概念に格上げする（「型システムが enforce できない契約、dev で捕まえて prod で saturate する」）。このフレーミングは Stage 11 oracle と Stage 12 vault crate で再登場する。

### JA 特有のスタイル決定

- **専門用語は英語のまま** (`decomposition`、`discriminated dispatch`、`debug_assert!`、`outcome`、`tagged union`、`partition`、`saturating_*` など)。L0-L9 の慣例に従う。
- **Code コメントは英語のまま**（`// Partial fee: equity covers some but not all of the desired fee.`、`// ─── Stage 10b: ... ───` など）。答え合わせと byte-for-byte 一致させるため。
- **`load-bearing` は英語のまま使用。** L8-L9 と同じ。
- **「慣例による discriminated dispatch」のような長い英語フレーズ** は そのまま使用 — 「ディスクリミネイテッド・ディスパッチ」とカタカナ化すると逆に読みにくく、英語のままのほうが Rust/型理論に馴染んだ読者には素直に通る。
