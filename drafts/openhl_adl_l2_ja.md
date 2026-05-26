# Building OpenHL ADL — L2 draft (JA) — build-along

> openhl SHA `d66b44a` (Stage 10d — auto-deleveraging)。

## L2 — `openhl-adl-execute-ja`

**Stage**: Stage 10d — `d66b44a`

**Title**: レッスン 2 — `execute_adl` — 5 フェーズのオーケストレーション中枢

**Duration**: 40 分 · **XP**: 70

---

````markdown
# レッスン 2 — `execute_adl` — 5 フェーズのオーケストレーション中枢

## ゴール

このレッスンで掴む概念:

- **`execute_adl` は、scanner の `unfilled_deficit > 0` のとき bridge が呼ぶ関数だ。** Layer 1 (margin compute) はすでにアカウントを分類済み。Layer 2 (insurance fund) は吸収できる分を吸収済み。Scanner が `ScanReport { unfilled_deficit > 0, .. }` を返した時点で、カスケード（Cascade）は 3 つ目で最後の層に到達している。Bridge が `execute_adl(remaining_accounts, mark, unfilled_deficit) -> AdlReport` を呼ぶ — この 1 つの関数が Layer 3 の契約全体を担う。利益の出ている counter-position をランク付けし、順番に haircut し、「どれだけの deficit を吸収したか」「どれだけ残ったか」を 2 つのフィールドで bridge に正確に伝える report を返す。**セーフティネット・カスケードの 3 層、各層に 1 つの関数。**
- **この関数は単一ロジックの塊ではなく、5 フェーズのパイプラインだ。** Phase 1: 非正の deficit に対する早期リターン（防御的契約（Defensive contract））。Phase 2: `adl_score`（L1 の関数）で各候補をスコア化し、ineligible (`None`) を filter out、PnL とともに collect。Phase 3: `(score 降順、account_id 昇順)` で stable-sort — tiebreaker が決定論性（Determinism）の鍵だ。Phase 4: ランク順に iterate し、`haircut = min(remaining_deficit, pnl_gross)` を適用してアカウントごとの record を蓄積。Phase 5: ループ最終状態から `deficit_remaining` を assign し、report を return。各フェーズに固有の正しさ義務がある。本レッスンは 1 つずつ歩く。**5 フェーズ、5 つの検証可能な不変条件。**
- **保存則（Conservation law） `deficit_absorbed + deficit_remaining == input_deficit` は本レッスンでセットアップし、L4 で証明する。** Phase 4 の各 iteration で `haircut + new_remaining == old_remaining` が成立する。ループの終端状態は `deficit_remaining = remaining` かつ `deficit_absorbed = sum_of_haircuts`。構造上、この 2 つのフィールドの和は入力に等しい — コードから直接読み取れる保存則だ。L4 の proptest `conservation_absorbed_plus_remaining_equals_deficit` がランダム入力に対してこれを検証する。L2 ではループ自体から構造的議論を読む。**保存則は後で検証する付け足しではない。ループ本体が明白にする性質だ。**
- **すべての算術は saturating op を使い、Phase 4 をビザンチン障害耐性にする。** absorbed accumulator に `haircut.saturating_add`、ループ変数に `remaining.saturating_sub`、record ごとの payout に `pnl_gross.saturating_sub(haircut)`。実際には overflow しない（入力は i64 で、マグニチュードは i64::MAX に対して小さい）。それでも `saturating_*` はコードの契約を明示する。**「もし何かが wrap したら、panic より clamp を選ぶ」**。L1 の debug_assert! 規律と対になる規律だ — test では debug_assert!、prod では saturating_*、目的はどちらも同じで、未定義動作を観測可能な失敗に変えること。**openhl-liquidation L8 の InsuranceFund と同じ規律 — prod では saturating、test では debug_assert。**

確認:

```bash
cargo test -p openhl-liquidation adl::tests::adl_
```

…で本レッスンで追加する 5 つの新 unit test (`adl_zero_deficit_is_noop`、`adl_negative_deficit_clamps_remaining_to_zero`、`adl_no_candidates_keeps_full_deficit`、`adl_no_profitable_keeps_full_deficit`、`adl_single_winner_fully_absorbs_small_deficit`) が走る。本レッスン完走後、scanner は *ADL に対して runnable* になる — 79 テスト pass (L1 から 74 + L2 で新規 5)。L3 で 6 つの nuanced absorption テストを execute_adl に対して追加。L4 で 4 つの invariant proptest と Stage 10 四部作のレトロスペクティブを追加する。

具体的な変更:

- **`crates/liquidation/src/adl.rs`** — L1 の type 定義と `adl_score` の下に `execute_adl` 関数 (~50 行) を append。既存の `#[cfg(test)] mod tests` ブロックに 5 つの unit test を append。

それだけ。Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5、そして 5 つの degenerate パスを exercise するテストだ。

## おさらい

L1 の後はこうなっている:
- `AdlScore(i64)` — i64 ranking を wrap する newtype。sort 用に Ord derive、ゼロ用に Default derive、dedup 用に Hash derive。
- `AdlRecord` — アカウントごとの row: `{account, close_order, pnl_gross, haircut, pnl_paid, score}`。Telemetry-shaped。Bridge は *帳簿変更（Bookkeeping mutation）* として適用する。CLOB 注文としてではない。
- `AdlReport` — `{records, deficit_absorbed, deficit_remaining}`。Bridge は `deficit_remaining` を読み、chain が解決不能な状態に達したかを判定する。
- `adl_score(snapshot, mark) -> Option<AdlScore>` — ranking 関数。4 つの ineligibility ケース（flat position、non-profitable、zero collateral、zero/negative equity）には `None`、valid な winner には `Some(score)`。

L2 はこれらのプリミティブを取り、オーケストレーションする。`adl_score` が Phase 2 の filter 述語、`AdlReport` が Phase 4 で埋めて Phase 5 で finalize する accumulator になる。

## 計画

1 つの関数、5 フェーズ、5 つのテスト。

1. **`execute_adl` を `adl_score` の下に append**。5 フェーズをコメントで pre-declare し、コードを書く前に構造を見せる。
2. **Phase 1**: `deficit <= 0` のとき早期リターン（Early-return）。空 `records`、`deficit_absorbed = 0`、`deficit_remaining = deficit.max(0)` (`.max(0)` が負の入力を clamp する)。
3. **Phase 2**: `candidates.iter().filter_map(|s| { let score = adl_score(s, mark)?; let pnl = unrealized_pnl(s, mark); Some((*s, score, pnl)) }).collect::<Vec<_>>()`。
4. **Phase 3**: `ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)))` — score 降順、account_id 昇順 tiebreaker。
5. **Phase 4**: `for (snapshot, score, pnl_gross) in ranked { if remaining <= 0 break; let haircut = remaining.min(pnl_gross); ... records.push(...); deficit_absorbed = ... .saturating_add(haircut); remaining = remaining.saturating_sub(haircut); }`。
6. **Phase 5**: `report.deficit_remaining = remaining; report`。

その後、`tests` モジュールの末尾に 5 つの unit test を append。

> 🛑 **予測。** 下のコードを読む前に: openhl-liquidation L13 の `scan` も似た shape を持っていた — accumulator を空で初期化、候補ごとのループ、最終 assignment。`scan` と `execute_adl` の間の構造的な違いを 1 つ予想せよ。ヒントは、ADL は *quota*（deficit）を持ち、scanner は *quota なし*（すべてのアカウントを処理）だという点だ。

(答え: **`execute_adl` は `remaining <= 0` のときループに `break` を持つ。`scan` は持たない。** Scanner は入力のすべてのアカウントを処理する (quota なし — 清算が必要な分をすべて測定する役目だ)。ADL は *deficit が覆われるまで* アカウントを処理し、覆われたら停止する (quota 束縛)。`break` が quota 束縛ループの構造的サインだ。Performance にも効く。最初の winner が十分な PnL を持てば、ADL は 100 候補のうち 1 人だけ haircut すれば済む。`break` なしならループは 100 全部を歩く。**Quota 束縛ループは `break` を持つ。Quota フリーは持たない。**)

## `execute_adl` のソース全体

```rust
/// Execute one ADL pass over the candidate set.
///
/// Pipeline:
///   1. Filter to ADL-eligible accounts (see [`adl_score`]).
///   2. Stable-sort by score descending; ties break by `AccountId`
///      ascending so two equally-ranked accounts produce a
///      deterministic order.
///   3. Iterate, applying `haircut = min(remaining_deficit, pnl_gross)`
///      to each in rank order. Stop when `remaining_deficit == 0` or
///      candidates are exhausted.
///
/// Returns an [`AdlReport`] whose `deficit_absorbed + deficit_remaining`
/// equals the input `deficit` (modulo saturating arithmetic).
///
/// A non-positive `deficit` is treated as "nothing to do" — returns an
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
```

## ウォークスルー — 5 フェーズ

### Phase 1: 非正の deficit に対する防御的早期リターン

```rust
if deficit <= 0 {
    return AdlReport {
        records: Vec::new(),
        deficit_absorbed: 0,
        deficit_remaining: deficit.max(0),
    };
}
```

押さえる点が 3 つ。

1. **`deficit <= 0` がゼロと負の両方をカバーする。** Bridge は `deficit > 0` だけを渡すはずだ (`unfilled_deficit > 0` で gate している)。それでも防御的契約が上流のバグから守る。**モジュール境界での防御的ガードこそ、カスケードが失敗を隔離する仕組みだ。**
2. **`deficit.max(0)` が負のケースを clamp する。** 何らかの理由で `deficit = -50` が arrive したら、`deficit_remaining` は -50 ではなく 0 になる。負の remainder を下流に伝播させれば、bridge の `if report.deficit_remaining > 0` check で arithmetic 混乱を引き起こす。**境界で clamp するほうが、下流のコンシューマーを全部直すより安い。**
3. **`Vec::new()` を `vec![]` の代わりに使うのは意図的だ。** どちらも同じアロケーションフリーな空 vector にコンパイルされるが、`Vec::new()` が openhl-liquidation crate の他の場所で使われている convention だ (個人の好みより一貫性)。**機能的差異がないなら convention が好みに勝つ。**

### Phase 2: score + filter + collect

```rust
let mut ranked: Vec<(AccountSnapshot, AdlScore, i64)> = candidates
    .iter()
    .filter_map(|s| {
        let score = adl_score(s, mark)?;
        let pnl = unrealized_pnl(s, mark);
        Some((*s, score, pnl))
    })
    .collect();
```

押さえる点が 5 つ。

1. **`filter_map` がここでの正しい combinator だ。** `adl_score(s, mark)` は `Option<AdlScore>` を返す (L1 の設計)。`filter_map` は `Some` ケースを残し `None` を drop する。`filter` + `map` を別々に使うと `adl_score` を 2 回評価する (filter 用に 1 回、map 用に 1 回)。`filter_map` は 1 パスで両方をやり、`Some` を unwrap する。**`filter_map` は「filter して unwrap、1 パスで」。`T -> Option<U>` の関数があるときはいつでも使う。**
2. **クロージャ内部の `?` 演算子がエレガントな部分だ。** `adl_score(s, mark)?` は `adl_score` が `None` を返した時点で**その要素を処理中のクロージャ本体だけ**を short-circuit し、`filter_map` へ `None` を返す。`filter_map` 自体はそれを「この要素は drop」として扱い、次の要素の反復へ進む。`?` なしだと explicit な `match` か `let Some(score) = ... else { return None }` が必要だ。**`?` はイテレータ全体を `break` しない。現在のクロージャから `None` を返して次要素へ進めるための短絡規則だ。**
3. **`unrealized_pnl` を filter pass の *後* で計算する。** 順序が重要だ。`unrealized_pnl` は cheap だが、expensive なら eligibility filter を pass したアカウントだけ計算したい。**先に filter、後で derive。捨てるかもしれない量は決して decide しない。**
4. **`(snapshot, score, pnl)` のタプルがループの 3 つのニーズをパックする。** Phase 3 はソート用に `score`、tiebreaker 用に `account_id` (`snapshot` 経由) が要る。Phase 4 は `AdlRecord` を build するために `snapshot`、`score`、`pnl_gross` が要る。3 つすべてを 1 つのタプルにパッケージすれば、Phase 4 で何も re-derive する必要がない。**タプルは pre-computed 値をループ間で再導出なしに carry する方法だ。**
5. **`*s` が `&AccountSnapshot` を `AccountSnapshot` (copy) に deref する。** `AccountSnapshot` は `Copy` (小さな flat struct) なので `*s` は cheap な memcpy だ。`*s` なしだとタプルは `(&AccountSnapshot, ...)` を持つ — 元の slice の drop を妨げる参照だ。**`Copy` 型は ownership を cheap に move させる。値が欲しいときに `*s` を使う。参照ではない。**

### Phase 3: tiebreaker 付きの stable sort

```rust
ranked.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.account.0.cmp(&b.0.account.0)));
```

押さえる点が 4 つ。

1. **`b.1.cmp(&a.1)` が順序を反転 — score *降順*。** 高 score が最初に force-close される (Hyperliquid convention: 最もラッキーな winner が最初に支払う)。`a.cmp(&b)` ではなく `b.cmp(&a)` と書くのが Rust で idiomatic な「降順」パターンだ。`.reverse()` を呼ぶ必要はない。**`b.cmp(&a)` が降順、`a.cmp(&b)` が昇順。パターンを暗記する。**
2. **`.then_with(|| ...)` は遅延評価（Lazy evaluation）。** 内部のクロージャは `b.1.cmp(&a.1) == Ordering::Equal` (score の tie) のときだけ走る。Score がユニークな common case では work を節約する。**`.then` は eager 評価、`.then_with` がクロージャ版。tiebreaker が non-trivial なら `.then_with` を選ぶ。**
3. **Tiebreaker は `account_id ascending` — `a.0.account.0.cmp(&b.0.account.0)`。** 昇順のため `a` が `b` の前に来る。「昇順」の選択は原理的には arbitrary だが、*deterministic* でなければならない。異なるバリデータ上の equally-lucky な winner 2 人が、誰が先に行くかについて agree する必要があるからだ。Ascending account_id が最もシンプルな deterministic な選択だ。**Tiebreaker はバリデータ間で order を reproducible にするために存在する。「fair」のためではない。fair は deterministic と偶然一致するだけだ。**
4. **`sort_by` は stable (equal-key 挿入順を保持する)。** これは 2 つの record が equal score *かつ* equal account_id を持つケースで効いてくる (account_id がユニークなら不可能だが、型 signature はユニーク性を強制しない)。Stable sort なら equal-equal ケースは Phase 2 の iteration order を保つ。実装上は最悪計算量 `O(N log N)` を保証する代わりに、ソート中に一時バッファ（概ね `O(N)`）を使う。一方 `sort_unstable_by` は in-place で追加メモリが小さい。**このコースの候補数（最大 15）では追加メモリコストは実質ゼロで、決定論性の利得が圧倒的に勝つ。**

### Phase 4: iterate と haircut

```rust
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
```

押さえる点が 6 つ。

1. **`AdlReport::default()` で空 records、0 absorbed、0 remaining が得られる。** Report struct に `Default` を derive している (L1 の設計) おかげで、`AdlReport { records: Vec::new(), deficit_absorbed: 0, deficit_remaining: 0 }` を手書きする必要がない。**Accumulator 型には `Default` を derive する。常にゼロで初期化される。**
2. **`if remaining <= 0 break;` が quota guard だ。** 十分な deficit が absorb されたら、もう winner は haircut されない。これが quota 束縛ループの構造的サインだ。openhl の各 quota 束縛ループがこのパターンを持つ。**Quota 束縛ループは early break、quota フリーループはすべてを処理する。**
3. **`haircut = remaining.min(pnl_gross)` が absorption の formula だ。** Deficit が必要とするだけ PnL を取るか、winner が持っているだけ取るか、どちらか小さい方。これが Phase 4 を構造上 conservative にする。すべての haircut が `remaining` と `pnl_gross` の両方で bounded されているため、`deficit_absorbed` は入力 deficit やすべての PnL の合計を決して超えない。**`min` は 2 つの upper bound が同時に効くときの conservative な選択だ。**
4. **`pnl_paid = pnl_gross.saturating_sub(haircut)` が record ごとの decomposition。** Decomposition 則: `pnl_paid + haircut == pnl_gross` (L4 の `each_record_balances_pnl` proptest で検証)。ここの `saturating_sub` は belt-and-suspenders だ。`haircut <= pnl_gross` が構造上保証されている (数行前の `.min` の適用から) ので、subtraction は実際には underflow しない。**正しさがすでに overflow なしを保証していても、defensive な習慣として saturating ops を使う。**
5. **`deficit_absorbed.saturating_add(haircut)` が累積する。** これが haircut の running sum で、Phase 5 までに total absorbed と等しくなる。`saturating_add` は同じ defensive な習慣だ。ここで overflow は不可能だが (haircut は deficit で bounded、deficit は i64)、`+` ではなく `saturating_add` と書くのは、関数内で唯一の `+` になってしまうからだ。**1 つの関数内での saturating ops の一貫性が、規律を読者に明白にする。**
6. **`remaining.saturating_sub(haircut)` がループ変数を decrement する。** Conservation invariant: 各 iteration 境界で `(initial_deficit) == deficit_absorbed + remaining + sum_of_unprocessed_pnls_we_haven't_reached_yet`。最後の iteration (または `break`) の後、3 番目の項はゼロになり、`initial_deficit == deficit_absorbed + remaining` だけが残る。**ループ本体が 2 つの accumulator を慎重に扱う副作用として、保存則の不変条件を保つ。**

### Phase 5: finalize と return

```rust
report.deficit_remaining = remaining;
report
```

押さえる点が 3 つ。

1. **`deficit_remaining` はループの *後* で set される。ループ内ではない。** ループ中、`remaining` はローカル mutable だ。ループが exit した時点で final 値を report に転送する。ループ内で set すれば冗長な work になる (毎 iteration で上書き)。後で set するのが正しい、1 回限りの assignment だ。**Accumulator はループ内、assignment はループ外。**
2. **`report` は名前で return される** (explicit な `return` キーワードなし、`report` の後にセミコロンなし)。Rust の expression-based return だ。関数本体の最後の expression が return 値になる。**Idiomatic な Rust: trailing expression として置く。`return` ではない。**
3. **関数は `#[must_use]`** (signature 上で宣言)。Caller (bridge) は `AdlReport` で何かをしなければならない。典型的には各 record を帳簿変更として apply し、`deficit_remaining` をゼロに対して check する。`#[must_use]` があれば、bridge が誤って report を drop したときコンパイラが警告する。**Report を返す関数に `#[must_use]` を付けるのが、「これを見なければならない」をコンパイル時契約にする方法だ。**

## 5 つの unit test

`adl.rs` の既存の `#[cfg(test)] mod tests` ブロックに append:

```rust
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
```

各テストが phase か境界条件に 1:1 で map する:

| テスト | exercise する Phase | 何を証明するか |
|---|---|---|
| `adl_zero_deficit_is_noop` | Phase 1 (early-return) | ゼロ入力 → 空 report、候補に触れない |
| `adl_negative_deficit_clamps_remaining_to_zero` | Phase 1 (negative clamp) | `deficit.max(0)` が負のリークを防ぐ |
| `adl_no_candidates_keeps_full_deficit` | Phase 2 (空入力) | 空候補 → `filter_map` が空 vec を生成 → ループはゼロ回 → `remaining` 変わらず |
| `adl_no_profitable_keeps_full_deficit` | Phase 2 (全 filter) | すべての候補が `None` を返す → ranked が空 → ループはゼロ回 → `remaining` 変わらず |
| `adl_single_winner_fully_absorbs_small_deficit` | Phase 4 (happy path) | 単一 iteration、haircut = min、decomposition 成立 |

走らせる:

```bash
cargo test -p openhl-liquidation adl::tests::adl_
```

期待: 5 つの新テストが pass。L1 の 4 つの score-eligibility テスト + 1 つの score-ordering テストと合わせて、`adl.rs` 内には合計 10 テスト。残りの 4 つの nuanced-absorption テストは L3 で、5 つの invariant proptest は L4 で追加する。

## クロスリファレンス

この `execute_adl` オーケストレーションは **openhl-liquidation L13 の `scan`** と構造的 shape を共有する。両者とも「各候補に対して何をするか decide し、結果を report に蓄積する」パイプラインだ。名指すべき違いは以下。

| | `scan` (openhl-liquidation L13) | `execute_adl` (本レッスン L2) |
|---|---|---|
| Trigger | 毎ブロック (常に走る) | 条件付き (`unfilled_deficit > 0` のときだけ) |
| Quota | なし (すべてのアカウントを処理) | `deficit` で bounded (early break) |
| Filter | Margin classification (`MarginPhase`) | `adl_score` 経由の eligibility |
| Sort | なし (挿入順) | `(score desc, account_id asc)` で |
| アカウントごとの仕事 | `LiquidationRecord` を build | haircut decomposition 付き `AdlRecord` を build |
| 「fully resolve できなかった」の出力フィールド | `unfilled_deficit` (ここで consume) | `deficit_remaining` (bridge で consume) |
| 保存則 | `sum(closed_pnls) - sum(deposits) = ...` (L13 の per-scan) | `deficit_absorbed + deficit_remaining == input_deficit` (L4 proptest) |

この 2 つの関数は構造的に sibling だ。同じ「各候補に対して decide、accumulate」パイプラインで、filter 述語、sort 規律、quota semantics だけが違う。**L13 を 1 度読めば L2 の構造がクリックする。L2 を読めば L13 の `scan` が「同じ shape、違う filter」として読める。**

## よくある質問

**Q1: なぜ unstable-sort (`sort_unstable_by`) ではなく stable-sort (`sort_by`) を使うのか?**

決定論性のためだ。`sort_unstable_by` は速く、追加メモリもほぼ使わないが、*equal 要素の order が unspecified* になる。単一バリデータプロセス内では fine。異なるマシン上のバリデータ間では、同じ入力でも、score が等しい場合にランタイム順が異なれば異なる `AdlReport` を生成し得る。`sort_by` は stable で、equal-scored record の相対順を保持する（加えてこの実装は最悪 `O(N log N)`・一時 `O(N)` メモリを使う）。**候補数 0..15 の設計ではこのメモリコストは無視できるので、コンセンサスコードでは決定論性を優先して `sort_by` を選ぶ。**

**Q2: 十分な候補を collect したら Phase 2 (`filter_map`) を short-circuit できる?**

できない。原理的には yes だが、`collect::<Vec<_>>()` はとにかく iterator 全体を consume する。そしてソート前 (Phase 3) には「十分」が分からない。低 score 候補が、入力順に評価したら高 score 候補より rank が高くなる可能性があるからだ。だから Phase 2 に short-circuit オプションはない。`break` を持つのは Phase 4 だけだ。**Short-circuit は quota を持つ phase に住む。Phase 2 は持たない。**

**Q3: haircut の蓄積で `deficit_absorbed` が i64 overflow したらどうなる?**

実際には起こらない。`deficit_absorbed` は入力 `deficit` で上から bound されている (すべての haircut が `≤ remaining`、`remaining` は `deficit` で開始)。`deficit` は i64 で、`remaining.saturating_sub(haircut)` は単調減少（Monotonic decreasing）。よって `deficit_absorbed` は `i64::MAX` で bounded だ。`saturating_add` は defensive な保険にすぎない。上流のバグが bound を violate したとき、saturation が `i64::MAX` で clamp する。panic ではなく。**まだ見つかっていない上流のバグに対する hedge としての saturating ops。**

**Q4: なぜ tiebreaker が `account_id descending` ではなく `ascending` か?**

純粋に convention だ。Ascending がほとんどの言語で default のソート方向。だから「ascending account_id」は「null」tiebreaker として読める — 強い理由がないときに reach するものだ。Hyperliquid のドキュメントは指定していない。OpenHL は ascending を選んだ。同じ入力でこのコードを走らせる 2 つのバリデータは agree する。契約はそれだけだ。**Tiebreaker 方向は arbitrary。存在と決定論性だけが重要だ。**

**Q5: Report 内の 2 つの record が equal な `pnl_gross` を持つことはありうるか?**

ありうる。2 つの winner が同一 PnL を持ちつつ score は異なるケースがある (例: 同じ PnL だが違う leverage)。Decomposition `pnl_paid + haircut == pnl_gross` は依然 per-record で成立し、すべての haircut の合計は依然 `deficit_absorbed` に等しい。Record の `pnl_gross` 値はユニークである必要はない。**Record は dedup されない。Account_id がユニークキーで、pnl_gross ではない。**

**Q6: Bridge は実際に各 `AdlRecord` で何を *する* のか?**

3 つの帳簿変更だ。各 record について、(a) `pnl_paid` (haircut 調整済み payout) でトレーダーの collateral を credit、(b) ポジションサイズをゼロに set (force-close)、(c) アクティブポジション集合からアカウントを remove。Record 上の `close_order` フィールドは CLOB に submit *されない*。telemetry と、`LiquidationRecord` との shape parity のために (bridge が両層に同じ record 処理コードを使えるように) 存在するだけだ。**ADL は帳簿変更であって、オーダーブック執行ではない。`close_order` はコメントであって、コマンドではない。**

## 次のレッスン (L3) — 6 つの nuanced absorption テスト

L3 は `execute_adl` が取り得る nuanced absorption パスを exercise する 6 つの unit test を追加する:
- `adl_single_winner_partial_haircut_at_full_pnl` — haircut == pnl_gross → pnl_paid = 0
- `adl_single_winner_exhausted_with_remaining_deficit` — pnl_gross < deficit、単一 haircut、remainder propagate
- `adl_multiple_winners_in_score_order` — 複数入力に対して rank order を証明
- `adl_drains_first_winner_then_partially_second` — quota が winner 1 を完全に exhaust、winner 2 で partial
- `adl_tiebreaker_by_account_id_ascending` — equal score が account_id で deterministic に resolve
- `adl_does_not_touch_losers_or_flats` — eligibility filter が mixed population でも honor される

L3 の後、unit-test マトリクスは完成する (L1+L2+L3 で 16 テスト)。L4 で 5 つの proptest invariant と Stage 10 四部作のレトロスペクティブを追加し、コースを 5 レッスン / 4 モジュール / SHA pin `d66b44a` で閉じる。

````

---

## Seed-file slot

L2 は Module 1 (ADL implementation) の sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 2 — execute_adl — 5 フェーズのオーケストレーション中枢',
  slug: 'openhl-adl-execute-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 70,
  content: `# レッスン 2 — execute_adl — 5 フェーズのオーケストレーション中枢\n\n...`
},
```

## 翻訳セルフレビュー（paste 前）

- **L2 は load-bearing な実装レッスン** (40 分 / 70 XP — L1 の 35/60 より大きい、なぜなら 5 フェーズ × ~5 things-to-notice ずつのパイプライン全体を walk する必要があるから)。5 つの unit test が「走らせて動くのを見られる」payoff だ。
- **5 フェーズ構造が pedagogical scaffolding。** 各フェーズに固有のコードブロック + things-to-notice list がある。読者は phase で skim できる。Phase 1 (defensive) と Phase 5 (finalize) は短い。Phase 2 (filter_map)、Phase 3 (sort_by)、Phase 4 (haircut loop) が meat だ。
- **Predict callout が L13 の `scan` との構造比較を setup する。** 「quota 束縛ループは `break` を持つ」が takeaway。レッスン後半の cross-reference テーブルへの prime。
- **L13 の `scan` への cross-reference テーブル**が load-bearing pedagogical move だ。同じ shape、違う filter/sort/quota。openhl-liquidation L13 を完了した読者は `execute_adl` を「1 つの構造的 twist を持つ sibling 関数」として見る。
- **Q1 (stable vs unstable sort) が consensus-code レッスン。** Q3 (overflow) が「hedge としての saturating ops」framing。Q6 (bridge は CLOB ではなく帳簿変更として apply) は L0 callback — 「ADL は orderbook を bypass」アーキテクチャ決定を operational な用語で restate。
- **L2 に Mermaid なし。** L13 への cross-reference テーブル + test-to-phase マッピングテーブルが構造的な visual。Mermaid flow は 5-phase heading がすでに伝えることを duplicate する。
- **Length: ~410 行** — L1 (~574 expected) より小さく、L2 の役割に reasonable。

### JA 特有のスタイル決定

- **専門用語は英語のまま** (`execute_adl`, `adl_score`, `AdlScore`, `AdlRecord`, `AdlReport`, `unfilled_deficit`, `deficit_absorbed`, `deficit_remaining`, `unrealized_pnl`, `close_order_spec`, `MarkPrice`, `AccountSnapshot`, `AccountId`, `filter_map`, `sort_by`, `sort_unstable_by`, `then_with`, `saturating_add`, `saturating_sub`, `Default`, `must_use`, `Option`, `Some`, `None`, `Ord`, `Hash`, `Copy`, `Vec`, `i64`, `MARGIN_SCALE`, `MarginPhase`, `LiquidationRecord`, `scan`, `ScanReport`, `CLOB`, `Bridge`, `proptest`, `cfg(test)`, `debug_assert!`, `load-bearing`, `quota` など)。
- **Rust / bash コードと in-code コメントは英語のまま**。Reader が直接 copy-paste する。
- **`load-bearing`、`belt-and-suspenders`、`pedagogical move`、`null tiebreaker`** は英語のまま使用。L0/L1 と一貫。
- **Bilingual annotation** は first-mention にのみ適用: `カスケード（Cascade）`、`決定論性（Determinism）`、`保存則（Conservation law）`、`帳簿変更（Bookkeeping mutation）`。
