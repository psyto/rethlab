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

このレッスンで掴む概念:

- **Determinism は consensus chain の load-bearing property** — 正しいが非決定的な matching engine は consensus を壊す (validator が同じ action を replay しても異なる約定を見て合意できない)。決定的だが間違っている engine は修正可能、非決定的な engine は修復不能。`determinism` invariant が chain の安全性を守る。
- **Property test は自分が思いつかなかったシナリオのバグを見つける** — 9 個の hand-trace は予想できる範囲を覆う。256 case × 3 property = 768 個の random sequence が裾野 (例:「limit を 17 個 submit してから空 side に market」) を覆う。shrink によって、fail した 25-action sequence が最小反例まで自動で縮む。
- **Conservation、safety、replayability の直交する 3 不変条件** — `qty_conservation` (量が生まれず消えない)、`no_crossed_book` (常に best_bid < best_ask)、`determinism` (同じ入力 → 同じ出力)。どんな matching engine も満たすべき普遍的な CLOB 不変条件。
- **`proptest` は `[dev-dependencies]` であって `[dependencies]` ではない** — property test は `cargo test` 時にのみ走り、production では使わない。`[dependencies]` に入れると、`openhl-clob` のすべての consumer に proptest のコンパイルを強制してしまう。
- **`Action` enum は generator 用の simplified intermediate** — proptest combinator は primitive 型で最も書きやすい。Strategy は生の `u64` を吐き、テスト本体が `submit` を呼ぶ前に newtype で wrap する。Newtype の規律は API 境界で効かせ、generator 内部には持ち込まない。

検証:

```bash
cargo test -p openhl-clob
```

上記の実行結果が **12 個のテスト** (unit 9 + proptest invariant 3) に合格し、各 proptest が **256 case** ずつ走る = **768 ランダムシナリオ**。

具体的な変更:

- **新規 dev-dep 1 個** — `crates/clob/Cargo.toml` に `proptest = { workspace = true }`。
- **新規 `#[cfg(test)] mod prop_tests` block** を `book.rs` の末尾に:
  - `Action` enum — property generator 用の simplified action 表現。
  - 3 個の generator strategy — `arb_side`、`arb_action`、`arb_actions` — random で valid な action sequence を生成する。
  - 3 個の `proptest!` block — `qty_conservation`、`no_crossed_book`、`determinism`。

L8 後、matching engine は **多くの random ordering** にわたって invariant が成立するという **property-level の証明** を手にする — L7 の 9 個の hand-trace シナリオだけではなく。

## おさらい

L7 完了時点:

- hand-trace unit test 9 個が pass。
- 各テストが specific なシナリオで specific な invariant をテストしている。

**L7 がテストしないもの**: random sequence。たとえば 17 個の limit を submit して 3 個を cancel し、さらに Market を submit したときだけ trigger するバグは、L7 の 9 個ではほぼ確実に見逃す。そのシナリオを自分で思いつくか (難しい — バグはテストしようと思わない場所に隠れる)、それとも **多数のシナリオ** を自動でテストするか。L8 では後者をやる。

## 計画

3 つやる:

1. **`proptest` を dev-dep として `crates/clob/Cargo.toml` に追加する**。`proptest` は既に workspace dep として宣言されている (既存 rethlab L1 Architect 階層の `consensus` の proposer-election test で使用済み) ので、使うことを宣言するだけでよい。
2. **`book.rs` の既存 `mod tests` の下に新規 `mod prop_tests` block を追加する**。新規モジュール内には次を入れる:
   - `Action` enum (property test が exercise する操作のサブセット — 今は SubmitLimit + SubmitMarket のみ。cancel は follow-up で扱う)。
   - random な `Action` sequence の generator strategy。
   - invariant ごとに 1 つの `proptest!` block — 計 3 個。
3. **`cargo test -p openhl-clob`** — 12 個 pass (unit 9 + prop 3)。

3 つの invariant:

- **`qty_conservation`**: book に入る合計 quantity = 合計 filled + 合計 resting (「お金の計算が保存される」property)。
- **`no_crossed_book`**: `best_bid < best_ask` が常に成立する — test 9 で hand-trace した safety property を、今度はランダムテストする。
- **`determinism`**: 同じ action sequence が毎回同じ約定列と同じ book state を生成する。**これが chain の safety が依存する replayability property。**

Proptest がどれかで反例を見つけたら、失敗 input を最小に **自動 shrink** してくれる。これが example よりも property の load-bearing な利点。

> 🛑 **考えてみよう。** スクロールする前に: `submit_limit::Buy` が時折 (たとえば 1% の確率で) ask を best-first ではなく **random** 順に辿ってしまうバグがあったとする。3 invariant のうち、どれが最も速く catch するか? どれが最も informative に catch するか?

(答え: `qty_conservation` は間接的に catch する — 十分なケースで、間違った走査順が hand math の期待と異なる matched price を生成する。`no_crossed_book` は直接 catch する: 最安 ask を先に取らない buy は cheaper ask を book に残してしまい、次にその ask より上の bid が来た瞬間に cross する。`determinism` は **毎回** catch する — 各 run が異なる「random」走査順を選ぶので、同じ input の 2 run が異なる約定を生成する。**`determinism` こそが consensus chain の load-bearing property** — これがなければ validator が合意できない。)

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

`proptest` は workspace `Cargo.toml` で既に宣言されている (workspace に追加する必要はない — L1 Architect の最初のコースから workspace dep として入っている)。`[dev-dependencies]` block に置けば test build 時のみ利用可能になり、production build には含まれない。

> 🛑 **やりがちな勘違い。** 「`[dependencies]` に入れて non-test コードでも使えるようにすればよいのでは?」 **そうすると `openhl-clob` のすべての consumer が `proptest` を runtime dependency として抱えることになる。** スマートコントラクト、validator、indexer — どれも matching engine を **使う** のに property test インフラを必要としない。`[dev-dependencies]` の規律で、テストインフラは必要なところにしか入れないようにする。

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

`Action` enum は **proptest が random に generate するものを simplified に表現したもの**。各 variant は、実際の `Book::submit` 呼び出しが必要とする raw `u64` を保持する (後で newtype でラップする)。今のところ variant は 2 個 — Limit と Market submit。Cancel action はまだ追加しない。openhl の follow-up stage で追加する。

**なぜ action を enum でモデル化するのか?** Property test は action の **sequence** を generate する必要があり、各 action は N 種類のどれかになり得るから。Enum がその variability を捉えてくれる。Proptest の strategy combinator (`prop_oneof!`、`prop::collection::vec` 等) は enum とよくなじむ。

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

3 つの strategy を build up していく:

- **`arb_side()`** — uniform に Buy または Sell を選ぶ。`prop_oneof![Just(...), Just(...)]` が proptest の「これらリテラルのどれか 1 つ」combinator。
- **`arb_action(id)`** — 固定 `id` で random な `Action` を生成する。Limit 分岐は `(account, qty, side, price)` を range で生成し、Market 分岐は `(account, qty, side)` を生成する。重みは `3 => limit_action, 1 => market_action` — Limit action を Market の 3 倍の頻度にして、現実的な order-book usage を反映している。
- **`arb_actions()`** — 長さ 1..30 の random `Vec<Action>` を生成する。`.prop_flat_map` パターンは少し奇妙だ: まず `prop::collection::vec(0u64..1000, 1..30)` で「長さ 1..30 の、値が 0..1000 の u64 vec」を生成する。**ただし中身の u64 値はダミーで、`.prop_flat_map` の中の `.enumerate()` が直後に index で上書きしてしまう** — `0u64..1000` の range は「ベクタの長さ」を決めるためだけのもので、生成される値そのものは使われない。それから各 position を `arb_action(i+1)` にマップして order ID を確定させる。ポイントは、`arb_actions` が strictly-increasing な order ID を持つ sequence を生成すること (book での collision を避けるため)。

**range (`1..=200` for account、`50..=150` for price) を使う理由は?** Proptest を **plausible** なシナリオへバイアスするため。`0..=u64::MAX` の range にすると、proptest はほとんどの場合 extreme outlier (account_id = 18_446_744_073_709_551_614 等) を生成する。現実的な range にすれば、実際のトレーディングに見えるシナリオが生成される: account 1-200、price 50-150、quantity 1-20。Matching engine のバグは、normal-looking な sequence に最も隠れやすい。

> 🛑 **やりがちな勘違い。** 「広い range = カバレッジが多い = 良い」。 **広い range = 役に立たないテストが多い。** 99.99% の確率で `qty = u64::MAX - 1` の order を generate しても、normal な matching ロジックは exercise されず、overflow 境界ケースばかり exercise されてしまう。両方とも興味深いが、**簡単なバグを安く先に見つけたい**。Range を plausible な値に絞れば、proptest が予算を実際の production traffic が exercise する matching path に使ってくれる。

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

不変条件（invariant）は以下の保存則:

```
total_in = 2 × total_filled + total_market_unfilled + resting_qty
```

`2 ×` が付くのはなぜか? **約定は maker から 1 unit と taker から 1 unit を消費するので、fill_qty の 1 unit が `total_in` に 2 回現れる** — maker が submit されたとき 1 回、taker が arrive したとき 1 回。計算:

| Action | `total_in` | 最後に残るもの |
| - | - | - |
| Limit 10 unit を submit し、完全に rest | +10 | 10 unit resting |
| Market 10 unit を submit、liquidity なし | +10 | 10 unit 破棄 (約定なし) |
| Limit 10 unit を submit、5 unit の ask とマッチ | +10 | 5 unit 約定 (各 side から 1 つずつ)、5 unit が rest として残る |

5 unit 約定する場合を考える: maker が 5 をオファーし (既に `total_in` に計上済み)、taker が 5 を取る (これも `total_in` に計上される)。約定した 5 unit が `total_in` に 10 として現れる — 各 side から 1 回ずつ。**だから `2 * total_filled` になる。**

タイムラインで見る具体例（3 行目のケース）:

```
[t=0]  Sell Limit(qty=5) が入る → 全て rest
         total_in += 5         → total_in = 5
         (約定なし、resting に積まれる)
         検算: total_in(5) = 2×total_filled(0) + market_unfilled(0) + resting(5) ✓

[t=1]  Buy Limit(qty=10) が入る → 5 unit が maker と約定、残 5 unit が rest
         total_in += 10        → total_in = 15
         total_filled += 5     → total_filled = 5
         resting = 5 (taker の残り、maker の 5 unit は消費済み)
         検算: total_in(15) = 2×total_filled(10) + market_unfilled(0) + resting(5) ✓
```

`total_in` は「submit された全 order の qty を時系列で足し続けるだけ」のシンプルなカウンタだ。複雑に見える `2 *` は、「約定 1 件が `total_in` に 2 回（maker submit 時 + taker submit 時）寄与する」という会計上の事実を保存則に組み込んだもの。

**`proptest!` block の冒頭にある `#![proptest_config(ProptestConfig { cases: 256, .. })]` 行** が各テストを 256 回走らせる。Invariant 3 個 × 256 case = 768 ランダムシナリオ。

**`prop_assert_eq!` (`assert_eq!` ではない) が重要** — proptest が「テスト失敗」と「システムエラーで panic」を区別する必要があるから。`prop_assert_eq!` なら failure を proptest の shrinking 機構に報告し、最小反例を見つけようとしてくれる。

> 🛑 **やりがちな勘違い。** 「`total_in = 2 * total_filled + ...` はおかしい — なぜ double-count するのか?」 **marketplace では約定が **2 つの unit** を伴う — buyer の意図 1 個と seller の意図 1 個。** Maker が 5 オファーし taker が 5 取ると、engine は 10 unit の「マッチング需要」を見ている: 各 side から 5 個。2 つが size 5 の Fill 1 つにまとまったが、entered したときには 10 個の個別の taker-or-maker-unit だった。**この invariant が数えるのは個別の taker/maker 意図であって、unique な unit ではない。**

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

Body の流れ:

1. **各 action ごと** に order を submit する。
2. **各 submit 後** に `book.best_bid() < book.best_ask()` (両方存在する場合) を check する。
3. **どこかで `best_bid >= best_ask`** になればテスト失敗 — book が cross したことになる。

これは **L7 の `book_does_not_cross_after_match` と同じ invariant** だが、random sequence に対してテストする。L7 では **1 つ** のシナリオで invariant が成立することを証明したが、L8 では **256 個の randomized** シナリオで成立することを証明する。

`prop_assert!(b < a, "...")` macro は format string を取れる — proptest 失敗時、cross した実際の bid/ask 値がエラーメッセージに表示される。プレーンな `assert!(b < a)` よりも informative。

> 🛑 **やりがちな勘違い。** 「Property test が hand-trace test の見逃した failure を見つけたらどうする?」 **まさにそれが狙い。** Hand-trace test は specific なシナリオを verify し、proptest が general な invariant を verify する。Proptest がバグを見つけたら、shrinking phase が最小 failing case を生成してくれる — それを **永続的な regression test として hand-trace suite に追加する**。**Proptest がバグを見つけ、hand-trace test がそれを二度と戻らせない。**

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

そして: `prop_assert_eq!(run(&actions), run(&actions))`。

**同じ input の 2 run が同じ output を生成しなければならない。** Matching engine に何らかの non-determinism — randomness、HashMap iteration 順、スレッディング race — が紛れ込んでいれば、このテストが catch する。

**これが最重要 property である理由**: consensus chain は、すべての validator が同じ input から同じ約定を計算することに依存している。1 人の validator の matching engine が別の validator と異なる約定を生成すれば、validator は block について合意できず、chain が fork する。**Determinism こそが load-bearing property** — `no_crossed_book` は correctness の話だが、determinism は **agreement** の話。正しいが non-deterministic な engine は consensus を壊すのに対し、deterministic だが incorrect な engine は少なくとも修復可能。

**`Action::SubmitLimit { id, account, side, price, qty }` の destructuring で `*id`、`*account` 等を使う** のは、`actions` が `&[Action]` として borrow されていて、各 field が borrowed `&u64` だから。`*` で deref して value を取り出す。

> 🛑 **やりがちな勘違い。** 「Determinism は trivial に true に見える — ただの関数適用ではないか」。 **trivial に見えるが、小さなミスがそれを壊す。** このテストが **失敗する** non-determinism の発生源としては:
> - `bids`/`asks` に `BTreeMap` の代わりに `HashMap` を使う (HashMap iteration がランダム化される)。
> - Telemetry 用に `submit` 内で `std::time::Instant::now()` 呼び出しを追加する。
> - Sync barrier なしで order を非同期処理する `tokio::task` を spawn する。
> - `f64` field を保存し、その bit 表現に依存する。
>
> どれもコンパイルが通り、`no_crossed_book` を pass してしまい、未来の contributor が導入したときに初めて失敗する — それを `determinism` がここで catch する。**6 ヶ月後の自分から今の自分を守るテスト。**

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

総実行時間は **数秒**。Proptest がテストごとに 256 case 走らせるが、各 case は小さな in-memory matching simulation なので、合計コストは 10 秒未満で済む。

どれかの prop test が失敗すると、次のように出る:

```
proptest: Saving this and future failures in /Users/.../proptest-regressions/...
proptest: If this test was expected to be flaky, ...
```

Proptest は **失敗 input を file にキャッシュ** する (`proptest-regressions/` 配下)。以降の run は最初にキャッシュ input を再テストするので、バグを見つけて修正したら毎回同じ最小反例で verify される。Regressions file は git に add しておく (小さい)。

よくあるエラーと対処:

- **`error: cannot find macro 'proptest' in this scope`** — `mod prop_tests` で `use proptest::prelude::*;` が抜けている。Step 2 を再確認。
- **`error: trait 'Strategy' not satisfied`** — generator 関数の return type が `impl Strategy<Value = T>` になっていない。`prop_oneof![Just(...)]` は `Just` 内の型に対して `impl Strategy<Value = T>` を返すが、`.prop_map(...)` を chain すると value type が変わることがある。生成する値と `Strategy<Value = ...>` 型が一致しているか確認。
- **`prop_assert_eq` で合計が一致せず失敗** — `total_in` accumulator が間違っている。各 submit で order の `qty` を `total_in` に加える (約定 quantity ではなく)。Step 4 を再確認 — sum は submit 時のみで、約定発生時には行わない。
- **Determinism 失敗** — どこかに HashMap、`time::Instant`、何らかの non-deterministic primitive を導入した可能性がある。L1-L7 のコードに対する最近の diff を確認 — バグは non-deterministic primitive が追加された場所にある。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Proptest は dev-dep であって runtime dep ではない。** Property test は `cargo test` で走り、production では走らない。`[dependencies]` に置くと `openhl-clob` のすべての consumer が proptest をコンパイル + link する羽目になる。`[dev-dependencies]` の規律で production dependency graph をクリーンに保つ。

2. **Action enum は simplified な中間表現。** 各 variant は raw `u64` を保持し、`OrderId(u64)` / `AccountId(u64)` 風に newtype でラップしない。**Proptest strategy が raw 値を generate し、test body が `submit` を呼ぶ前に newtype でラップする。** 意図的 — proptest の combinator は primitive 型と最もスムーズに動くし、`as u64` の ergonomics で boilerplate を節約できる。Newtype の強制は test generator 内ではなく API 境界 (`submit` 呼び出し) で行う。

3. **`determinism` が consensus の load-bearing property。** 正しいが non-deterministic な matching engine は consensus を壊すのに対し、deterministic だが incorrect な engine は修復可能。Non-determinism を catch するテストが chain の safety を守る。**Property は「何をテストするか」ではなく「何を守るか」で命名・優先順位付けする — その規律が肝。**

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

**Q: なぜ `cases: 256` なのか? `1024` や `100` ではダメか?**
バランスの問題。256 case × 3 property × ~10ms per case ≈ 8 秒 — `cargo test` で毎回走らせるのに十分速い。1024 case なら 30 秒超になり、dev iteration の摩擦になる。100 case では稀なバグを見逃すリスクがある。**安く走らせられて、common なバグを catch できる程度の case count を選ぶ。**

**Q: なぜ proptest action に `cancel` を入れていないのか?**
Cancel action は determinism と conservation property を複雑にする。まず保存則は単純に `total_in = 2 * total_filled + total_market_unfilled + resting_qty + total_canceled_qty` と項を 1 つ足すだけで済みそうに見える。だが本当に難しいのはその先で、generator 側が「すでに約定または cancel 済みの order ID への二重 cancel」を generate しないように、**生きている order ID を stateful に track する必要が出てくる**（L7 の Test 8 `cancel_unknown_returns_false` で扱った境界が、proptest では generator の責任として返ってくる）。Stateful な strategy は proptest の純粋な combinator パターンから外れるので、generator のコード量が一気に増える。「submit-only sequence」に simplify することで、3 つの invariant が tractable になる。Cancel-aware property は follow-up で追加すればよい — まずは基礎を綺麗に固めるのが正しい設計ステップ。既存の 3 invariant が最も価値の高いところ。

**Q: Proptest が失敗 input を見つけたらどうなるか?**
**Shrinking phase** に入る。失敗 input から始めて、proptest がまだ失敗する最小の subset / 最小値を探す。本コースのテストケース generator (`Vec<Action>` を生成) では、shrinking で 25-action sequence が 3-action sequence まで縮んでバグを再現することもある。デバッグ対象はその最小 sequence — original input よりはるかに扱いやすい。

**Q: `arb_actions` に Limit order だけを生成させられるか?**
できる — `arb_action` の `prop_oneof![3 => limit_action, 1 => market_action]` を `prop_oneof![1 => limit_action]` に変える (あるいは `prop_oneof` を外して `limit_action` を直接 return する)。今ある invariant では Market order が **有用** (discard-remainder path を exercise する) だが、Limit-only flow に focus したければ可能。**Proptest strategy は composable。**

## 次のレッスン (L9)

Matching engine の徹底的なテストが完了した。**まだ consensus とは統合されていない。** L9 から Module 4 (Bridge integration) に入る: `LiveRethEvmBridge` に `Book` + `pending_fills` field を追加し、order を CLOB にルーティングして結果の Fill を buffer に蓄積する `submit_order` method を追加する。L9 後、bridge が matching engine を所有するようになる。L10 では `build_payload` で buffer を drain する。
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
