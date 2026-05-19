# OpenHL CLOB を作る — L7 draft (JA) — build-along

> openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L7 — `openhl-clob-unit-tests-ja`

- **モジュール:** 3 (Testing), モジュール内 sortOrder 0
- **コース全体 sortOrder:** 6 (12 レッスン中 7 番目)
- **所要時間:** 35 分
- **XP:** 70
- **type:** CONTENT

### Content

````markdown
# レッスン 7 — hand-trace された unit test 9 個

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-clob
```

…が **テスト 9 個** に合格する。`book.rs` の末尾に新規 `#[cfg(test)] mod tests` block:

- **ヘルパー関数 2 個** — `limit(...)` と `market(...)` — テスト本体で 5 field の struct リテラルを繰り返さないよう、適切なデフォルトで `Order` を構築する。
- **hand-trace されたシナリオ 9 個** — それぞれ matching engine が維持すべき特定の invariant をテストする。

9 個のテストは **regression safety net**。誰か (またはあなた) が `submit_limit`、`submit_market`、`cancel` にバグを入れたら、少なくとも 1 つのテストが catch する。合わせて、L4-L6 で書いた matching ロジックが **実際に動く** ことの load-bearing な証明。

## おさらい

L6 完了時点で、matching engine は機能的に完成:

```rust
// book.rs (~190 行)
pub struct Book { bids, asks }
impl Book {
    pub fn new() -> Self
    pub fn submit(&mut self, order: Order) -> FillResult
    pub fn cancel(&mut self, order_id: OrderId) -> bool
    pub fn best_bid(&self) -> Option<Price>
    pub fn best_ask(&self) -> Option<Price>
    pub fn depth_bid(&self) -> usize
    pub fn depth_ask(&self) -> usize
}
```

`cargo check -p openhl-clob` がクリーン。**だが engine が正しいことの証明がない。** すべてのマッチがサイレントに間違っているかもしれない; コンパイル以上の何も assert していない。L7 がそれを直す。

## 計画

`crates/clob/src/book.rs` の末尾、`fn match_at_level` の後、`impl Book` の **外** に追加する 1 つの block:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn limit(...) -> Order { ... }
    fn market(...) -> Order { ... }

    #[test] fn empty_book_has_no_best_prices() { ... }
    #[test] fn resting_limit_creates_bid_or_ask() { ... }
    #[test] fn buy_market_takes_best_ask() { ... }
    #[test] fn limit_buy_walks_asks_within_price() { ... }
    #[test] fn price_time_priority_within_level() { ... }
    #[test] fn market_with_insufficient_liquidity_returns_remaining() { ... }
    #[test] fn cancel_removes_resting_order() { ... }
    #[test] fn cancel_unknown_returns_false() { ... }
    #[test] fn book_does_not_cross_after_match() { ... }
}
```

それだけ。新規型なし、`Book` の新規 method なし。テスト 9 個 + ヘルパー 2 個。

9 個のテストは **複雑さ順** に並ぶ: 最もシンプルな invariant (空 book に price なし) で始まり、最も強い invariant (マッチ後に book が cross しない — 整形 orderbook をゴミから区別する **safety property**) で終わる。

> 🛑 **考えてみよう。** スクロールする前に: 9 個のうちどれが、`submit_limit::Buy` が ask を **降順** (最高値先) に walk するバグで失敗する? ヒント: 「best ask 先」を specifically assert するテストを考える。

(答え: `buy_market_takes_best_ask`。`r.fills[0].price == Price(100)` と `r.fills[1].price == Price(105)` — best-first を assert する。降順 walk なら `[105, 100]` を produce する。**Directional バグは randomized テストでも catch できるが、hand-trace テストならより安く catch できる。**)

## 手順

### Step 1: テストモジュールを設定

`crates/clob/src/book.rs` の `impl Book` block の **外**、`fn match_at_level` の **後** に追加:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn limit(id: u64, account: u64, side: Side, price: u64, qty: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side,
            qty: Qty(qty),
            order_type: OrderType::Limit {
                price: Price(price),
            },
        }
    }

    fn market(id: u64, account: u64, side: Side, qty: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side,
            qty: Qty(qty),
            order_type: OrderType::Market,
        }
    }

    // テスト続く...
}
```

ヘルパー関数 2 個。なしでは各テスト本体で次のように:

```rust
let order = Order {
    id: OrderId(1),
    account: AccountId(100),
    side: Side::Sell,
    qty: Qty(5),
    order_type: OrderType::Limit { price: Price(100) },
};
```

…order ごとに 5 行の boilerplate。`limit(1, 100, Side::Sell, 100, 5)` なら 1 行。ヘルパーは raw `u64` を取り適切な newtype でラップする; それだけ。

**引数順序が重要**: `limit` で `(id, account, side, price, qty)`、`market` で `(id, account, side, qty)`。1 回覚える; どのテストでも同じ慣習を使う。`id` を先にすると、テストが時間順に読める (`limit(1, ...)` が最初の order、`limit(2, ...)` が 2 番目)。

> 🛑 **やりがちな勘違い。** 「Builder パターンを使う — `OrderBuilder::new().id(1).account(100).side(Buy).qty(10).limit_price(100).build()`」。 **5-field struct リテラルより冗長で、本末転倒。** Builder が活きるのは field が optional または widely varying なとき; ここでは全 order が全 5 field を持ち全部必須。positional 引数の 5-arg 関数は書くのが速く、call site で読むのが速く、reader に Order が何を必要とするか即座に伝える。

### Step 2: Test 1 — `empty_book_has_no_best_prices`

`tests` モジュール内、ヘルパーの後:

```rust
    #[test]
    fn empty_book_has_no_best_prices() {
        let book = Book::new();
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
        assert_eq!(book.depth_bid(), 0);
        assert_eq!(book.depth_ask(), 0);
    }
```

最もシンプルなテスト: 新しく構築された `Book` は price なし、depth ゼロ。**これが失敗するなら `Book::new()` か accessor ロジックに何か壊れている。** 以降の全テストがこれに依存する — `new()` がゴミ状態を返すなら他は何も意味をなさない。

`assert_eq!(book.best_bid(), None)` は trivial に見えるが価値のあるテスト。Accessor が `Some(Price(0))` を返した可能性 (default-construction バグ)。`None` が明示的な「liquidity が存在しない」signal。

### Step 3: Test 2 — `resting_limit_creates_bid_or_ask`

```rust
    #[test]
    fn resting_limit_creates_bid_or_ask() {
        let mut book = Book::new();
        let r = book.submit(limit(1, 100, Side::Buy, 90, 10));
        assert!(r.fills.is_empty());
        assert_eq!(book.best_bid(), Some(Price(90)));
        assert_eq!(book.best_ask(), None);

        let r = book.submit(limit(2, 101, Side::Sell, 100, 5));
        assert!(r.fills.is_empty());
        assert_eq!(book.best_ask(), Some(Price(100)));
    }
```

空 book に Buy Limit @ 90 が入る → fill なし、bid として rest。Sell Limit @ 100 が入る → fill なし (bid 90、ask 欲しいのは 100、cross なし)、ask として rest。

各 submit ごとの 2 つの assertion がキー:
- **`r.fills.is_empty()`** — マッチなし、反対側に何もなかったから。
- **`book.best_bid() == Some(Price(90))`** — resting order が accessor で観察可能。

これが L4 の「rest-the-remainder」パスの実証。

### Step 4: Test 3 — `buy_market_takes_best_ask`

```rust
    #[test]
    fn buy_market_takes_best_ask() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Sell, 105, 5));

        let r = book.submit(market(99, 200, Side::Buy, 8));
        assert_eq!(r.fills.len(), 2);
        assert_eq!(r.fills[0].price, Price(100)); // best ask first
        assert_eq!(r.fills[0].qty, Qty(5));
        assert_eq!(r.fills[1].price, Price(105));
        assert_eq!(r.fills[1].qty, Qty(3));
        assert_eq!(r.remaining_qty, Qty(0));
        assert_eq!(book.depth_ask(), 1); // ask @ 105 has 2 left
    }
```

セットアップ: resting ask 2 個、価格 100 (5 unit) と 105 (5 unit)。8 unit の Market buy が arrive。期待マッチング:
- Price 100 (最安) から 5 取る、残り 3 unit。
- Price 105 (次最安) から 3 取る。
- 合計 fill: 8。Remaining: 0。

Assert がこれを encode: best-first 順序で 2 fill、`remaining_qty == 0` (Market 完全 fill)、ask @ 105 は依然 2 unit depth。

**このテストが catch するもの** ask walk の directional バグ ("best first" を test) + 「空 level drop」invariant (100 価格 level が完全消費後に消える、105 level は depth 減って残る)。

### Step 5: Test 4 — `limit_buy_walks_asks_within_price`

```rust
    #[test]
    fn limit_buy_walks_asks_within_price() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Sell, 105, 5));

        // Buy limit @ 103 — should only fill the 100-priced level.
        let r = book.submit(limit(99, 200, Side::Buy, 103, 10));
        assert_eq!(r.fills.len(), 1);
        assert_eq!(r.fills[0].price, Price(100));
        assert_eq!(r.fills[0].qty, Qty(5));
        // Remainder rests as a bid @ 103.
        assert_eq!(book.best_bid(), Some(Price(103)));
        assert_eq!(book.depth_bid(), 1);
    }
```

Test 3 と同じ開始 book (ask が 100 と 105)。だが今度は incoming order が 10 unit の **Limit Buy @ 103**。

期待:
- 100 価格 ask は at-or-better (100 ≤ 103) — 5 unit マッチ。
- 105 価格 ask は at-or-better **でない** (105 > 103) — マッチ停止。
- 残り 5 unit が 103 で新しい bid として rest。

Test 3 との違いは **limit price check** が walk を早く止めること。Test 3 の Market buy は 100 を walk し続けた (Market は任意の価格を取る); test 4 の Limit buy は 103 で止まる。

これら 2 つのテストが合わせて、L4 の price-check ロジックが両方向で動くことを証明: Market (check なし、全部 walk) と Limit (check あり、limit で止まる)。

### Step 6: Test 5 — `price_time_priority_within_level`

```rust
    #[test]
    fn price_time_priority_within_level() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5)); // first
        book.submit(limit(2, 101, Side::Sell, 100, 5)); // same price, later

        let r = book.submit(market(99, 200, Side::Buy, 7));
        assert_eq!(r.fills.len(), 2);
        assert_eq!(r.fills[0].maker_order_id, OrderId(1)); // first in, first out
        assert_eq!(r.fills[0].qty, Qty(5));
        assert_eq!(r.fills[1].maker_order_id, OrderId(2));
        assert_eq!(r.fills[1].qty, Qty(2));
    }
```

**同じ price** (100) で 2 個の resting Sell、提出順に: order 1、それから order 2。7 unit の Market buy が arrive。

期待:
- Order 1 (最初に place) が最初に fill — 5 unit。
- Order 2 (2 番目に place) が次に fill — 2 unit。

これが「price-time priority」の **time priority** の半分。Price level 内では order が FIFO — first in が first out。L3 で選んだ `VecDeque<RestingOrder>` がこれを `push_back` (新規 order が後尾) + `pop_front` (マッチした order が先頭から) で自然に実装する。

**このテストが失敗する** のは、誤って `Vec<RestingOrder>` を使い `Vec::remove(0)` した場合 (まだ正しいが queue を shift する — マッチごとに O(n))、または `push_back` の代わりに `VecDeque::push_front` を使った場合 (newest-first、price-anti-time-priority になる)。

### Step 7: Test 6, 7, 8 — Market with leftover, cancel, cancel-unknown

```rust
    #[test]
    fn market_with_insufficient_liquidity_returns_remaining() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 3));

        let r = book.submit(market(99, 200, Side::Buy, 10));
        assert_eq!(r.fills.len(), 1);
        assert_eq!(r.fills[0].qty, Qty(3));
        assert_eq!(r.remaining_qty, Qty(7)); // market discards remainder
        assert_eq!(book.depth_ask(), 0);
    }

    #[test]
    fn cancel_removes_resting_order() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Buy, 90, 10));
        assert_eq!(book.depth_bid(), 1);

        assert!(book.cancel(OrderId(1)));
        assert_eq!(book.depth_bid(), 0);
        assert_eq!(book.best_bid(), None);
    }

    #[test]
    fn cancel_unknown_returns_false() {
        let mut book = Book::new();
        assert!(!book.cancel(OrderId(999)));
    }
```

短いので 3 テストを 1 step に:

- **Test 6 (`market_with_insufficient_liquidity_returns_remaining`)**: 3 unit の単一 ask、10 unit の Market buy — L5 の「Market が remainder を破棄」意味論を exercise。`remaining_qty == 7` (unfilled 部分)。Book は後で空。
- **Test 7 (`cancel_removes_resting_order`)**: resting bid、それから cancel。`cancel` が `true` を返し、depth が 0 になり、`best_bid()` が `None` を返す (L6 の空 level cleanup) を verify。
- **Test 8 (`cancel_unknown_returns_false`)**: 一度も submit していない OrderId を cancel。`false` を返し、book は不変 (空 book には何もないから当然)。

Test 7 + 8 のペアは `cancel` のバグのクラスを catch する: `cancel` が `true` を無差別に返したら test 8 が catch、有効な cancel に `false` を返したら test 7 が catch。**成功 path + 失敗 path を一緒に check するテスト** は片方だけより robust。

### Step 8: Test 9 — `book_does_not_cross_after_match`

最重要テスト、最後:

```rust
    #[test]
    fn book_does_not_cross_after_match() {
        let mut book = Book::new();
        book.submit(limit(1, 100, Side::Sell, 100, 5));
        book.submit(limit(2, 101, Side::Buy, 95, 5));
        // Spread: bid 95, ask 100. No cross.
        let bid = book.best_bid().unwrap();
        let ask = book.best_ask().unwrap();
        assert!(bid < ask);

        // Now a buy @ 100 — fully fills, no resting.
        book.submit(limit(3, 102, Side::Buy, 100, 5));
        // Best bid is still 95 (from order 2). Ask is gone.
        assert_eq!(book.best_bid(), Some(Price(95)));
        assert_eq!(book.best_ask(), None);
    }
```

**no-crossed-book invariant**: 常に `best_bid < best_ask` (またはどちらか side が空)。Crossed book — `best_bid >= best_ask` — はマッチすべき buy と sell が共存していることを意味する。**Soundness 違反**: matching engine が何らかの方法で衝突すべき 2 つの order を book に共存させた。

このテストのセットアップ:
1. Sell @ 100、Buy @ 95 → spread = (95, 100)、cross なし。`bid < ask` を assert。
2. Incoming Buy @ 100 → 100 価格 ask とちょうどマッチ (5 unit → 5 unit)、rest する leftover なし。
3. 最終状態: ask は消失 (消費)、bid は依然 95 (order 2 は untouched)。

最終 assert:
- `best_bid() == Some(Price(95))` — order 2 はまだ resting。
- `best_ask() == None` — order 1 の ask は完全消費。

**これが最強テストである理由**: no-crossed-book invariant が orderbook を **正しい** ものにする。Cross する book は起こるべきトレードが起こっていない取引を見せる — matching engine の根本的失敗。これが pass すれば、engine が safety property を維持する **証拠** (証明ではない — それは L8 の proptest) を持つ。

> 🛑 **やりがちな勘違い。** 「9 個ではなく 100 個の unit test を書けばいい? カバレッジが多い方が良い」。 **多いテストは、同じ path を exercise するならカバレッジが多いことにならない。** 9 個は **異なる invariant** を exercise するように選ばれた: empty-book、resting、market-walks-levels、limit-respects-price、time-priority、partial-market、cancel-found、cancel-not-found、no-cross。それぞれが他 8 個がテストしない property をテストする。**「buy crosses ask」を全部 exercise する 100 個のテストは、99 個の冗長テスト。**

## テスト

```bash
cargo test -p openhl-clob
```

期待:

```
running 9 tests
test tests::book_does_not_cross_after_match ... ok
test tests::buy_market_takes_best_ask ... ok
test tests::cancel_removes_resting_order ... ok
test tests::cancel_unknown_returns_false ... ok
test tests::empty_book_has_no_best_prices ... ok
test tests::limit_buy_walks_asks_within_price ... ok
test tests::market_with_insufficient_liquidity_returns_remaining ... ok
test tests::price_time_priority_within_level ... ok
test tests::resting_limit_creates_bid_or_ask ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

テストはアルファベット順で走る (Rust のデフォルト)。9 個すべて pass。

よくあるエラーと対処:

- **`error: cannot find function 'limit' in this scope`** test 内 — `fn limit(...)` が `mod tests` block の外にある。`use super::*;` 行の後、内側に移動する。
- **`assertion failed: r.fills[0].price == Price(100)`** で失敗 — `Price(105)` を得た。バグは `submit_market` か `submit_limit` — 間違った方向に walk している。`keys().next()` 呼び出しを check: ask には最安先が欲しい; bid (`Reverse<Price>` 付き) には最高先が欲しい (key が `Reverse<Price>` なら `keys().next()` が与える)。
- **`assertion failed: r.fills[0].maker_order_id == OrderId(1)`** in `price_time_priority_within_level` — `OrderId(2)` を得た、つまり後で submit した order が先にマッチした。Queue が LIFO で動いている。`submit_limit` の rest path を check: `push_back` (FIFO) するべき、`push_front` (LIFO) ではない。
- **`assertion failed: book.depth_ask() == 0`** in `market_with_insufficient_liquidity_returns_remaining` — ask が cleanup されていない。`submit_market` の loop が `if queue.is_empty() { self.asks.remove(&best_price) }` step (または Sell ケースの bid 等価) を欠いている。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Builder パターンや struct リテラルよりヘルパー関数。** `limit(...)` と `market(...)` は 5 引数 / 4 引数の関数で positional 引数。書くのが速く、読むのが速く、ドキュメント不要 (関数名 + 引数位置で self-explanatory)。**正しい抽象量は「繰り返しを除く分だけ」。**

2. **9 個のテストは有限で defensible なセット。** 各テストが特定の invariant に対応: empty-book、resting、walks-levels、respects-limit、FIFO、partial-market、cancel-found、cancel-not-found、no-cross。100 個書かない。**Invariant のリストは短く明確; カバレッジは invariant ごと、テスト数ごとではない。**

3. **`book_does_not_cross_after_match` が最後に配置されている。** テストはアルファベット順で走るので、このテストの **ソース順序** での配置は実行順に影響しない。だが **読む** 順序 (上から下に file を scan するメンテナ) では、最重要テストが最も目立つ。**ソース上のレイアウト自体が「何が最重要か」の優先度シグナルを encode する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
```

L7 後、`book.rs` には末尾にテストモジュール (9 tests + 2 helper) が入る。参照の `55a9dff` は doc-comment の言い回し以外同一。参照には `mod prop_tests` block もある — それは L8 の範囲。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: ヘルパーが `pub limit` `pub market` ではなく `limit` `market` なのは?**
`mod tests` block に private だから。他のモジュールがテスト Order を construct する必要がない。Private に保つのが正しい encapsulation: テストは自由に使えるが、test ヘルパーが `openhl-clob` の public API に漏れない。

**Q: テストをパラメータ化して、例えば「任意の incoming order に対して book invariant が成り立つ」property test にすべき?**
L8 がそれを exactly やる — 768 ランダムシナリオを exercise する 3 個の proptest invariant。だが proptest は hand-trace テストを oracle に依存する: proptest が失敗したとき、isolate できる小さい hand-trace テストが欲しい。**Hand-trace unit test が基礎、proptest が amplifier。**

**Q: Sell-side limit order のテストは?**
良い質問。9 個のテストは buy-side シナリオに focus しているのは、trace するのが直感的だから (「ask を最安先 walk」は「bid を最高先 walk」より visualizable)。Sell-side テストは correctness に必須ではない、**もし** `submit_limit::Sell` が `submit_limit::Buy` の構造的 mirror なら (L4 で確立)。Paranoid ならいくつか sell-side テストを追加 — このセットの test 3、4、5 を mirror する。

**Q: なぜ `assert!` ではなく `assert_eq!`?**
`assert_eq!(a, b)` は失敗時に両方の値を print、`assert!(a == b)` は値なしの「left == right」だけを print。Test デバッグでは、engine が produce した実際の値を知ることが重要。比較が equality なら `assert_eq!` が厳密に良い。

## 次のレッスン (L8)

Hand-trace されたテスト 9 個。**思いついた specific シナリオをカバーする。** L8 が **proptest invariant 3 個** を追加する — 任意の submit+cancel action sequence に対して成立する property:

- **`qty_conservation`**: book に入る合計 quantity = 合計 filled + 合計 resting。
- **`no_crossed_book`**: `best_bid < best_ask` が常に成立 (test 9 が hand-trace した safety property を今ランダムテスト)。
- **`determinism`**: 同じ action sequence が同じ fills + 同じ book state を produce する。

256 ランダムケース × 3 invariant = 768 ランダムシナリオ。どれか 1 個でも invariant に違反すると、proptest が **失敗 sequence を最小反例に自動的に shrink する**。それが example より property の load-bearing な利点。
````

---

## Seed ファイルスロット

L7 は **新規 Module 3 (テスト)** sortOrder 0 に入る:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'CLOB 型', sortOrder: 1 },
  2: { title: 'Matching engine', sortOrder: 2 },
  3: { title: 'テスト', sortOrder: 3 },  // M3 開始
},
```

```typescript
{
  title: 'レッスン 7 — hand-trace された unit test 9 個',
  slug: 'openhl-clob-unit-tests-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 35,
  xpReward: 70,
  content: `# レッスン 7 — hand-trace された unit test 9 個\n\n...`
},
```

## SHA pinning 規律

L1-L6 と同じ — `55a9dff` (Stage 8a)。L7 後、`book.rs` のテストモジュールが参照の最初の 9 unit test を mirror する; L8 で `mod prop_tests` block を追加。
