# OpenHL CLOB を作る — L8 draft (JA) — build-along

> openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L8 — `openhl-clob-proptests-ja`

- **モジュール:** 3 (テスト), モジュール内 sortOrder 1
- **コース全体 sortOrder:** 7 (12 レッスン中 8 番目)
- **所要時間:** 40 分
- **XP:** 80
- **type:** CONTENT

### Content

````markdown
# レッスン 8 — proptest invariant 3 個: 768 ランダムシナリオ

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-clob
```

…が **12 個のテスト** (unit 9 + proptest invariant 3) に合格し、各 proptest が **256 case** ずつ走る = **768 ランダムシナリオ**。書くもの:

- **新規 dev-dep 1 個** — `crates/clob/Cargo.toml` に `proptest = { workspace = true }`。
- **新規 `#[cfg(test)] mod prop_tests` block** を `book.rs` の末尾に:
  - `Action` enum — property generator 用の simplified action 表現。
  - 3 個の generator strategy — `arb_side`、`arb_action`、`arb_actions` — random で valid な action sequence を produce する。
  - 3 個の `proptest!` block — `qty_conservation`、`no_crossed_book`、`determinism`。

L8 後、matching engine は **多くの random ordering** にわたって invariant が成立する **property-level 証明** を持つ — L7 の 9 個の hand-trace シナリオだけではない。

## おさらい

L7 完了時点:

- 9 個の hand-trace unit test が pass。
- 各テストが specific シナリオの specific invariant をテスト。

**L7 がテストしないもの**: random sequence。例えば 17 limit を submit、3 個を cancel、Market を submit したときだけ trigger するバグなら、L7 の 9 個では多分見逃す。そのシナリオを自分で思いつくか (難しい — バグはテストしようと思わない場所に隠れる)、または **多数のシナリオ** を自動でテストする必要がある。L8 が後者。

## 計画

3 つ:

1. **`proptest` を dev-dep として `crates/clob/Cargo.toml` に追加**。`proptest` は既に workspace dep (既存 rethlab L1 Architect 階層の `consensus` での proposer-election test で使用); 使うことを宣言するだけ。
2. **新規 `mod prop_tests` block** を `book.rs` の既存 `mod tests` の下に追加。新規モジュール内:
   - `Action` enum (property test が exercise する操作の subset — 今は SubmitLimit + SubmitMarket のみ; cancel は follow-up)。
   - Random `Action` sequence の generator strategy。
   - Invariant ごとに 1 つの `proptest!` block — 3 個。
3. **`cargo test -p openhl-clob`** — 12 個 pass (unit 9 + prop 3)。

3 つの invariant:

- **`qty_conservation`**: book に入る合計 quantity = 合計 filled + 合計 resting (「お金の計算が保存される」property)。
- **`no_crossed_book`**: `best_bid < best_ask` が常に成立 — test 9 が hand-trace した safety property を今ランダムテスト。
- **`determinism`**: 同じ action sequence が同じ fills + 同じ book state を毎回 produce する。**これが chain の safety が依存する replayability property。**

Proptest がどれかで反例を見つけたら、失敗 input を最小に **自動 shrink** する。それが example より property の load-bearing な利点。

> 🛑 **考えてみよう。** スクロールする前に: `submit_limit::Buy` が時々 (例えば 1%) ask を best-first ではなく **random** 順に walk するバグがあったら。3 invariant のどれが最速に catch する? どれが最も informative に catch する?

(答え: `qty_conservation` は間接的に catch する — 十分なケースで間違った walk 順が、hand math が期待する price と異なる matched price を produce する。`no_crossed_book` は直接 catch: 最安 ask を先に取らない buy は cheaper ask を book に残し、次にその ask より上の bid が来ると cross する。`determinism` は **毎回** catch する、各 run が異なる「random」walk 順を選ぶので、同じ input の 2 run が異なる fill を produce する。**`determinism` が consensus chain の load-bearing property** — これなしでは validator が合意しない。)

## 手順

### Step 1: `proptest` を `crates/clob/Cargo.toml` に追加

`crates/clob/Cargo.toml` を開く。現状:

```toml
[package]
name         = "openhl-clob"
# ... shared package fields ...

[dependencies]

[lints]
workspace = true
```

`[dev-dependencies]` セクションを追加:

```toml
[package]
name         = "openhl-clob"
# ... shared package fields ...

[dependencies]

[dev-dependencies]
proptest = { workspace = true }

[lints]
workspace = true
```

`proptest` は workspace `Cargo.toml` で既に宣言されている (workspace に追加する必要はない — L1 Architect の最初のコースから workspace dep)。`[dev-dependencies]` block で test build 時のみ利用可能、production build には含まれない。

> 🛑 **やりがちな勘違い。** 「`[dependencies]` に入れて non-test コードでも使えるようにする?」 **そうすると `openhl-clob` のすべての consumer が `proptest` を runtime dependency として持つ。** スマートコントラクト、validator、indexer — どれも matching engine を **使う** のに property test インフラを必要としない。`[dev-dependencies]` が規律: テストインフラは必要なところにしか住まない。

### Step 2: `Action` enum で `mod prop_tests` をセットアップ

`crates/clob/src/book.rs` で、既存 `mod tests { ... }` block の **後** に (module scope のまま) 追加:

```rust
#[cfg(test)]
mod prop_tests {
    use super::*;
    use proptest::prelude::*;

    /// A simplified action enum for property-based testing.
    #[derive(Clone, Debug)]
    enum Action {
        SubmitLimit {
            id: u64,
            account: u64,
            side: Side,
            price: u64,
            qty: u64,
        },
        SubmitMarket {
            id: u64,
            account: u64,
            side: Side,
            qty: u64,
        },
    }
```

`Action` enum は **proptest が random に generate するものを simplified に表現したもの**。各 variant が、real な `Book::submit` 呼び出しが必要とする raw `u64` を持つ (後で newtype でラップ)。今は variant 2 個 — Limit と Market submit。Cancel action はまだなし; openhl の follow-up stage で追加。

**なぜ action を enum でモデル化?** Property test が action の **sequence** を generate する必要があり、各 action は N 種類のどれかになりうるから。Enum がその variability を捉える。Proptest の strategy combinator (`prop_oneof!`、`prop::collection::vec` 等) は enum とよく動く。

### Step 3: Strategy を書く

`mod prop_tests` 内で続けて:

```rust
    fn arb_side() -> impl Strategy<Value = Side> {
        prop_oneof![Just(Side::Buy), Just(Side::Sell)]
    }

    fn arb_action(id: u64) -> impl Strategy<Value = Action> {
        let limit_action = (1u64..=200, 1u64..=20, arb_side(), 50u64..=150)
            .prop_map(move |(account, qty, side, price)| Action::SubmitLimit {
                id,
                account,
                side,
                price,
                qty,
            });
        let market_action = (1u64..=200, 1u64..=20, arb_side()).prop_map(
            move |(account, qty, side)| Action::SubmitMarket {
                id,
                account,
                side,
                qty,
            },
        );
        prop_oneof![3 => limit_action, 1 => market_action]
    }

    fn arb_actions() -> impl Strategy<Value = Vec<Action>> {
        prop::collection::vec(0u64..1000, 1..30)
            .prop_flat_map(|ids| {
                ids.into_iter()
                    .enumerate()
                    .map(|(i, _)| arb_action(i as u64 + 1))
                    .collect::<Vec<_>>()
            })
    }
```

3 つの strategy、build up していく:

- **`arb_side()`** — uniform に Buy または Sell を選ぶ。`prop_oneof![Just(...), Just(...)]` が proptest の「これらリテラルの 1 つ」combinator。
- **`arb_action(id)`** — 固定 `id` で random `Action` を生成。Limit 分岐は `(account, qty, side, price)` を range で生成; Market 分岐は `(account, qty, side)`。重み: `3 => limit_action, 1 => market_action` — Limit action が Market の 3 倍頻繁、realistic な order-book usage を反映。
- **`arb_actions()`** — 長さ 1..30 の random `Vec<Action>` を生成。`.prop_flat_map` パターンが少し奇妙: まず u64 vec を生成して **長さを決め**、それから各 position を `arb_action(i+1)` にマップして order ID を increment する。コツは `arb_actions` が strictly-increasing な order ID で sequence を produce すること (book での collision を回避)。

**なぜ range (`1..=200` for account、`50..=150` for price) を使う?** Proptest を **plausible** なシナリオに biased するため。`0..=u64::MAX` range なら proptest はほぼ extreme outlier (account_id = 18_446_744_073_709_551_614) を generate する。Realistic range が real trading に見えるシナリオを produce する: account 1-200、price 50-150、quantity 1-20。Matching engine のバグは normal-looking sequence に最も隠れやすい。

> 🛑 **やりがちな勘違い。** 「広い range = 多いカバレッジ = 良い」。 **広い range = 役に立たないテストが多い。** 99.99% の確率で `qty = u64::MAX - 1` の order を generate するのは normal matching ロジックを exercise しない; overflow 境界ケースを exercise する。両方とも興味深いが、**簡単なバグを安く先に見つけたい**。Range を plausible 値に絞ると、proptest が予算を real production traffic が exercise する matching path に使う。

### Step 4: 1 つ目の invariant — `qty_conservation`

Strategy の下に append:

```rust
    proptest! {
        #![proptest_config(ProptestConfig {
            cases: 256,
            ..ProptestConfig::default()
        })]

        /// Quantity is conserved: every fill_qty came from a resting maker;
        /// total qty in/out balances.
        #[test]
        fn qty_conservation(actions in arb_actions()) {
            let mut book = Book::new();
            let mut total_in = 0u64;
            let mut total_filled = 0u64;
            let mut total_market_unfilled = 0u64;

            for action in actions {
                match action {
                    Action::SubmitLimit { id, account, side, price, qty } => {
                        total_in += qty;
                        let r = book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Limit { price: Price(price) },
                        });
                        total_filled += r.total_filled().0;
                    }
                    Action::SubmitMarket { id, account, side, qty } => {
                        total_in += qty;
                        let r = book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Market,
                        });
                        total_filled += r.total_filled().0;
                        total_market_unfilled += r.remaining_qty.0;
                    }
                }
            }

            // Resting quantity = total_in - 2*total_filled - total_market_unfilled.
            // (Each fill consumes one unit from a maker AND one unit from a taker,
            // so total_filled counts qty, but the qty appeared in total_in twice
            // — once when the maker was submitted, once when the taker arrived.)
            let resting: u64 = book.bids.values()
                .flat_map(|q| q.iter())
                .chain(book.asks.values().flat_map(|q| q.iter()))
                .map(|o| o.qty.0)
                .sum();
            prop_assert_eq!(total_in, 2 * total_filled + total_market_unfilled + resting);
        }
```

これが「quantity is conserved」invariant。Body に counter 3 個:

- **`total_in`**: 提出された全 order の `qty` 値の合計。
- **`total_filled`**: 生成された全 `Fill` の `fill_qty` の合計。
- **`total_market_unfilled`**: Market order の `remaining_qty` の合計 (破棄された leftover)。

Invariant: `total_in = 2 * total_filled + total_market_unfilled + resting_qty`。

なぜ `2 *`? **fill は maker から 1 unit AND taker から 1 unit を消費するので、fill_qty の 1 unit が `total_in` に 2 回現れる** — maker が submit されたとき 1 回、taker が arrive したとき 1 回。計算:

| Action | `total_in` | 最後に残るもの |
| - | - | - |
| Limit 10 unit を submit、完全 rest | +10 | 10 unit resting |
| Market 10 unit を submit、liquidity なし | +10 | 10 unit 破棄 (fill なし) |
| Limit 10 unit を submit、5 unit ask とマッチ | +10 | 5 unit fill (各 side から 1 つ)、5 unit が rest として残る |

5 unit fill する場合、つまり: maker が 5 をオファー (既に `total_in`)、taker が 5 を取る (これも `total_in`)。Fill した 5 unit が `total_in` に 10 として現れる — 各 side から 1 回。**だから `2 * total_filled`。**

**`#![proptest_config(ProptestConfig { cases: 256, .. })]` 行が `proptest!` block の冒頭** にあり、各テストを 256 回走らせる。Invariant 3 個 × 256 case = 768 ランダムシナリオ。

**`prop_assert_eq!` (`assert_eq!` ではない) が重要** — proptest が「テスト失敗」を「システムエラーで panic」と区別する必要がある。`prop_assert_eq!` が failure を proptest の shrinking 機構に報告し、それが最小反例を見つけようとする。

> 🛑 **やりがちな勘違い。** 「`total_in = 2 * total_filled + ...` がおかしい — なぜ double-count?」 **marketplace では fill が **2 つの unit** を伴う — buyer の意図 1 個と seller の意図 1 個。** Maker が 5 オファーし taker が 5 取ると、engine は 10 unit の「マッチング需要」を見ている: 各 side から 5 個。2 つが size 5 の Fill にまとまったが、entered したときは 10 個の個別な taker-or-maker-unit だった。**Invariant は **個別の taker/maker 意図** を数える、unique unit ではなく。**

### Step 5: 2 つ目の invariant — `no_crossed_book`

最初の proptest の下、同じ `proptest! { ... }` block 内に:

```rust
        /// Book invariant: best bid is strictly less than best ask. The book
        /// should never be crossed after submit() completes.
        #[test]
        fn no_crossed_book(actions in arb_actions()) {
            let mut book = Book::new();
            for action in actions {
                match action {
                    Action::SubmitLimit { id, account, side, price, qty } => {
                        book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Limit { price: Price(price) },
                        });
                    }
                    Action::SubmitMarket { id, account, side, qty } => {
                        book.submit(Order {
                            id: OrderId(id),
                            account: AccountId(account),
                            side,
                            qty: Qty(qty),
                            order_type: OrderType::Market,
                        });
                    }
                }
                if let (Some(b), Some(a)) = (book.best_bid(), book.best_ask()) {
                    prop_assert!(b < a, "book crossed: bid={} ask={}", b.0, a.0);
                }
            }
        }
```

Body:

1. **各 action ごと** に order を submit。
2. **各 submit 後** に `book.best_bid() < book.best_ask()` (両方存在するなら) を check。
3. **どこかで `best_bid >= best_ask`** になったらテスト失敗 — book が cross。

これは **L7 の `book_does_not_cross_after_match` と同じ invariant** だが random sequence に対してテスト。L7 が **1 つ** のシナリオで invariant が成立することを証明; L8 が **256 randomized** シナリオで成立することを証明。

`prop_assert!(b < a, "...")` macro が format string を含む — proptest 失敗時、cross した実際の bid/ask 値がエラーメッセージに表示される。プレーンな `assert!(b < a)` より informative。

> 🛑 **やりがちな勘違い。** 「Property test が hand-trace test が見逃した failure を見つけたら?」 **それがまさに point。** Hand-trace test は specific シナリオを verify; proptest が general invariant を verify。Proptest がバグを見つけたら、shrinking phase が最小 failing case を produce する — それを **永久的な regression test として hand-trace suite に追加する**。**Proptest がバグを見つけ、hand-trace test がそれが戻ってこないようにする。**

### Step 6: 3 つ目の invariant — `determinism`

最重要:

```rust
        /// Determinism: applying the same action sequence produces the same
        /// book + fill history every time. (The "replayability" property
        /// from the architecture doc — required for consensus determinism.)
        #[test]
        fn determinism(actions in arb_actions()) {
            let run = |actions: &[Action]| {
                let mut book = Book::new();
                let mut all_fills: Vec<Fill> = Vec::new();
                for action in actions {
                    let order = match action {
                        Action::SubmitLimit { id, account, side, price, qty } => Order {
                            id: OrderId(*id),
                            account: AccountId(*account),
                            side: *side,
                            qty: Qty(*qty),
                            order_type: OrderType::Limit { price: Price(*price) },
                        },
                        Action::SubmitMarket { id, account, side, qty } => Order {
                            id: OrderId(*id),
                            account: AccountId(*account),
                            side: *side,
                            qty: Qty(*qty),
                            order_type: OrderType::Market,
                        },
                    };
                    all_fills.extend(book.submit(order).fills);
                }
                (book.best_bid(), book.best_ask(), book.depth_bid(), book.depth_ask(), all_fills)
            };
            prop_assert_eq!(run(&actions), run(&actions));
        }
    }
}
```

この invariant は、action sequence を fresh `Book` に適用し end state の 5-tuple を返す helper closure `run` を定義する: `(best_bid, best_ask, depth_bid, depth_ask, all_fills_in_order)`。

それから: `prop_assert_eq!(run(&actions), run(&actions))`。

**同じ input の 2 run が同じ output を produce しなければならない。** Matching engine に何らかの non-determinism — randomness、HashMap iteration 順、スレッディング race — があれば、このテストが catch する。

**なぜこれが最重要 property**: consensus chain は、すべての validator が同じ input から同じ fill を計算することに依存する。1 validator の matching engine が別の validator と異なる fill を produce すると、validator は block について合意できず、chain が fork する。**Determinism が load-bearing property** — `no_crossed_book` は correctness だが、determinism は **agreement** について。Correct だが non-deterministic な engine が consensus を壊す; deterministic だが incorrect な engine は少なくとも修復可能。

**`Action::SubmitLimit { id, account, side, price, qty }` の destructuring で `*id`、`*account` 等を使う** のは、`actions` が `&[Action]` として borrow され、各 field が borrowed `&u64` だから。`*` で deref して value を得る。

> 🛑 **やりがちな勘違い。** 「Determinism は trivial に true に見える — ただの関数適用」。 **trivial に見えるが、小さなミスがそれを壊す。** このテストが **失敗する** non-determinism のソース:
> - `bids`/`asks` に `BTreeMap` の代わりに `HashMap` を使う (HashMap iteration がランダム化される)。
> - Telemetry 用に `submit` 内で `std::time::Instant::now()` 呼び出しを追加。
> - Sync barrier なしで order を非同期処理する `tokio::task` を spawn。
> - `f64` field を保存し、その bit に依存。
>
> どれもコンパイルが通り、`no_crossed_book` を pass し、未来の contributor が導入したときだけ失敗する — `determinism` がここで catch する。**これが 6 ヶ月後の自分から自分を守るテスト。**

## テスト

```bash
cargo test -p openhl-clob
```

期待 (12 個のテスト):

```
running 12 tests
test prop_tests::determinism ... ok
test prop_tests::no_crossed_book ... ok
test prop_tests::qty_conservation ... ok
test tests::book_does_not_cross_after_match ... ok
test tests::buy_market_takes_best_ask ... ok
test tests::cancel_removes_resting_order ... ok
test tests::cancel_unknown_returns_false ... ok
test tests::empty_book_has_no_best_prices ... ok
test tests::limit_buy_walks_asks_within_price ... ok
test tests::market_with_insufficient_liquidity_returns_remaining ... ok
test tests::price_time_priority_within_level ... ok
test tests::resting_limit_creates_bid_or_ask ... ok

test result: ok. 12 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

総実行時間: **数秒**。Proptest がテストごとに 256 case 走らせ、各 case が小さい in-memory matching simulation、合計コストが 10 秒未満。

どれかの prop test が失敗すれば:

```
proptest: Saving this and future failures in /Users/.../proptest-regressions/...
proptest: If this test was expected to be flaky, ...
```

Proptest が **失敗 input を file にキャッシュ** する (`proptest-regressions/` 配下)。以降の run は最初にキャッシュ input を再テストするので、バグを見つけて修正したら毎回同じ最小反例で verify される。Regressions file を git に add する (小さい)。

よくあるエラーと対処:

- **`error: cannot find macro 'proptest' in this scope`** — `mod prop_tests` で `use proptest::prelude::*;` が抜けている。Step 2 を再確認。
- **`error: trait 'Strategy' not satisfied`** — generator 関数の return type が `impl Strategy<Value = T>` ではない。`prop_oneof![Just(...)]` が `Just` 内の型に対して `impl Strategy<Value = T>` を返す; `.prop_map(...)` を chain すると value type が変わるかも。生成する値と `Strategy<Value = ...>` 型が一致することを確認。
- **`prop_assert_eq` で合計が一致せず失敗** — `total_in` accumulator が間違っている。各 submit で order の `qty` を `total_in` に追加、fill quantity ではない。Step 4 を再確認 — submit 時にのみ sum、fill 時にはしない。
- **Determinism 失敗** — どこかに HashMap、`time::Instant`、何らかの non-deterministic primitive を導入した可能性。L1-L7 のコードに対する最近の diff を check; バグは non-deterministic primitive が追加された箇所。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Proptest は dev-dep、runtime dep ではない。** Property test は `cargo test` で走る、production では走らない。`[dependencies]` に置くと `openhl-clob` のすべての consumer が proptest をコンパイル + link する羽目になる。`[dev-dependencies]` 規律が production dependency graph をクリーンに保つ。

2. **Action enum は simplified な中間表現。** 各 variant が raw `u64` を持つ、`OrderId(u64)` / `AccountId(u64)` newtype-wrap 版ではない。**Proptest strategy が raw 値を generate し、test body が `submit` を呼ぶ前に newtype でラップする。** 意図的 — proptest の combinator が primitive 型で最も easily に動き、`as u64` ergonomics が boilerplate を節約する。Newtype 強制は test generator 内ではなく API 境界 (`submit` 呼び出し) で起こる。

3. **`determinism` が consensus の load-bearing property。** Correct だが non-deterministic な matching engine が consensus を壊す; deterministic だが incorrect な engine は修復可能。Non-determinism を catch するテストが chain の safety を守る。**Property を「何をテストするか」ではなく「何を守るか」で命名・優先順位付けする規律。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/clob/Cargo.toml ./crates/clob/Cargo.toml
```

L8 後、`book.rs` が `55a9dff` の参照を mirror する (doc コメント以外)。`Cargo.toml` に `[dev-dependencies] proptest` 行。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ `cases: 256`、`1024` や `100` ではなく?**
バランス。256 case × 3 property × ~10ms per case ≈ 8 秒 — `cargo test` で毎回走らせるのに十分速い。1024 case なら 30+ 秒、dev iteration の摩擦になる。100 case なら稀なバグを見逃すリスク。**Cheap に走れるが common バグを catch するのに十分な case count を選ぶ。**

**Q: なぜ proptest action に `cancel` がない?**
Cancel action が determinism + conservation property を複雑にする: cancel 後、どの order ID が生きているか track する必要がある。「submit-only sequence」simplification で 3 invariant が tractable になる。Cancel-aware property の追加は follow-up; 既存 3 invariant が最高価値、先に正しく get する。

**Q: Proptest が失敗 input を見つけたら何が起きる?**
**Shrinking phase** に入る。失敗 input から開始し、proptest が依然失敗する最小の subset / 最小値を見つけようとする。我々のテストケース generator (`Vec<Action>` を produce) では、shrinking が 25-action sequence を 3-action sequence に reduce してまだバグを再現するかもしれない。最小 sequence がデバッグ対象 — original input よりずっと簡単。

**Q: `arb_actions` を Limit order のみに produce させられる?**
できる — `arb_action` の `prop_oneof![3 => limit_action, 1 => market_action]` を `prop_oneof![1 => limit_action]` に変更 (または `prop_oneof` なしで `limit_action` を直接 return)。我々が持つ invariant では Market order が **有用** (discard-remainder path を exercise) だが、Limit-only flow に focus したければできる。**Proptest strategy は composable。**

## 次のレッスン (L9)

Matching engine が完全にテストされた。**まだ consensus と統合されていない。** L9 が Module 4 (Bridge integration) を開始: `LiveRethEvmBridge` に `Book` + `pending_fills` field を追加、order を CLOB にルーティングし結果 Fill を buffer に蓄積する `submit_order` method を追加。L9 後、bridge が matching engine を所有する; L10 が `build_payload` で buffer を drain する。
````

---

## Seed ファイルスロット

L8 は Module 3 (テスト) sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 8 — proptest invariant 3 個: 768 ランダムシナリオ',
  slug: 'openhl-clob-proptests-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 80,
  content: `# レッスン 8 — proptest invariant 3 個: 768 ランダムシナリオ\n\n...`
},
```

## SHA pinning 規律

L1-L7 と同じ — `55a9dff` (Stage 8a)。L8 後、`book.rs` の prop_tests モジュールが参照を mirror し、`Cargo.toml` に dev-dep 追加。
