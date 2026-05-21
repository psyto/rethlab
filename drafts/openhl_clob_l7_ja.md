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

このレッスンで掴む概念:

- **網羅は本数ではなく invariant 単位** — 9 個のテストは「9 個の任意のシナリオ」ではない。それぞれが別個の invariant に対応する (empty-book、resting、walks-levels、respects-limit、FIFO time priority、partial-market、cancel-found、cancel-not-found、no-cross)。Invariant の一覧が短く明確だからこそ、9 という数が正当化できる。
- **Hand-trace された unit test が proptest (L8) の oracle になる** — proptest が乱数 25-action sequence で fail したら、invariant を 1 つだけ切り出した hand-trace テストでデバッグする。Proptest は増幅器、unit test は土台。
- **Builder pattern より helper 関数** — 位置引数の `limit(...)` / `market(...)` は重複を取り除く最安の抽象。Builder pattern は ~5 行で済むテストには儀式的すぎる。
- **ソース順序が優先度を表す** — `book_does_not_cross_after_match` を最後に置くのは、maintainer に対して「これが load-bearing な safety property」というシグナル。テスト実行はアルファベット順、ソース順序は人間向け。
- **`assert!(a == b)` より `assert_eq!`** — `assert_eq!` は失敗時に両辺を出す。実際の値が見えるかどうかがデバッグ速度を決める。

検証:

```bash
cargo test -p openhl-clob
```

上記の実行結果が **テスト 9 個** に合格する。

具体的な変更:

`book.rs` の末尾に新規 `#[cfg(test)] mod tests` block を置く:

- **ヘルパー関数 2 個** — `limit(...)` と `market(...)`。テスト本体で 5 field の struct リテラルを繰り返さずに済むよう、適切なデフォルトで `Order` を構築する。
- **hand-trace されたシナリオ 9 個** — それぞれ matching engine が維持すべき特定の invariant をテストする。

9 個のテストは **regression safety net**。誰か (あるいは自分) が `submit_limit`、`submit_market`、`cancel` にバグを入れた瞬間、少なくとも 1 つのテストが catch する。合わせて、L4-L6 で書いた matching ロジックが **実際に動く** ことの load-bearing な証明になる。

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

`cargo check -p openhl-clob` がクリーン。**ただし engine が正しいことの証明はない。** すべてのマッチがサイレントに間違っているかもしれない — 今は compile が通ること以上に何も assert していない。L7 でそこを直す。

## 計画

`crates/clob/src/book.rs` の末尾、`fn match_at_level` の後、`impl Book` の **外** に block を 1 つ追加する:

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

それだけ。新規型もなし、`Book` の新規 method もなし。テスト 9 個 + ヘルパー 2 個。

9 個のテストは **複雑さ順** に並べる: 最もシンプルな invariant (空 book に price なし) で始まり、最も強い invariant (マッチ後に book が cross しない — 整形 orderbook をゴミから区別する **safety property**) で終わる。

> 🛑 **考えてみよう。** スクロールする前に: 9 個のうちどれが、`submit_limit::Buy` が ask を **降順** (最高値先) に辿るバグで失敗するか? ヒント: 「best ask 先」を明示的に assert しているテストを考える。

(答え: `buy_market_takes_best_ask`。`r.fills[0].price == Price(100)` と `r.fills[1].price == Price(105)` で best-first を assert している。降順に辿るバグだと `[105, 100]` を生成してしまう。**Directional バグは randomized テストでも catch できるが、hand-trace テストならより安く catch できる。**)

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

ヘルパー関数 2 個。これがないと、各テスト本体で次のように書くことになる:

```rust
let order = Order {
    id: OrderId(1),
    account: AccountId(100),
    side: Side::Sell,
    qty: Qty(5),
    order_type: OrderType::Limit { price: Price(100) },
};
```

…order ごとに 5 行の boilerplate になる。`limit(1, 100, Side::Sell, 100, 5)` なら 1 行で済む。ヘルパーは raw `u64` を取り適切な newtype でラップするだけ。

**引数順序が重要**: `limit` は `(id, account, side, price, qty)`、`market` は `(id, account, side, qty)`。一度覚えれば、どのテストでも同じ慣習で書ける。`id` を先頭に置くと、テストが時間順に読める (`limit(1, ...)` が最初の order、`limit(2, ...)` が 2 番目)。

> 🛑 **やりがちな勘違い。** 「Builder パターンを使う — `OrderBuilder::new().id(1).account(100).side(Buy).qty(10).limit_price(100).build()`」。 **5-field struct リテラルより冗長で、本末転倒。** Builder が活きるのは field が optional だったり広く変動したりするとき。ここでは全 order が全 5 field を持ち、すべて必須。positional 引数の 5-arg 関数なら書くのも読むのも速いし、Order が何を必要とするかを reader に即座に伝えられる。

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

最もシンプルなテスト: 新しく構築された `Book` は price がなく、depth がゼロ。**これが失敗するなら `Book::new()` か accessor ロジックのどこかが壊れている。** 以降の全テストがこれに依存する — `new()` がゴミ状態を返すなら他のどれも意味をなさない。

`assert_eq!(book.best_bid(), None)` は trivial に見えるが価値のあるテスト。Accessor が `Some(Price(0))` を返してしまう可能性 (default-construction バグ) があるからだ。`None` が「liquidity が存在しない」を明示的に signal する。

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

空 book に Buy Limit @ 90 が入る → 約定なし、bid として rest する。Sell Limit @ 100 が入る → 約定なし (bid 90、ask が欲しいのは 100 なので cross しない)、ask として rest する。

submit ごとに鍵となる assertion が 2 つ:
- **`r.fills.is_empty()`** — 反対側に何もなかったのでマッチなし。
- **`book.best_bid() == Some(Price(90))`** — resting order が accessor で観察可能。

これが L4 の「rest-the-remainder」パスの実証になる。

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

セットアップ: resting ask 2 個、価格 100 (5 unit) と 105 (5 unit)。8 unit の Market buy が arrive する。期待マッチング:
- Price 100 (最安) から 5 取り、残り 3 unit。
- Price 105 (次に安い) から 3 取る。
- 合計 fill: 8。Remaining: 0。

Assert がこれを encode する: best-first 順で約定 2 つ、`remaining_qty == 0` (Market が完全に約定)、ask @ 105 は依然 2 unit depth が残る。

**このテストが catch するもの**: ask 走査の directional バグ ("best first" をテスト) と、「空 level drop」invariant (価格 100 の level が完全消費後に消え、105 level は depth が減って残る)。

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

Test 3 と同じ開始 book (ask が 100 と 105)。ただし今度は incoming order が 10 unit の **Limit Buy @ 103**。

期待:
- 価格 100 の ask は at-or-better (100 ≤ 103) — 5 unit マッチ。
- 価格 105 の ask は at-or-better **ではない** (105 > 103) — マッチ停止。
- 残り 5 unit が 103 で新しい bid として rest する。

Test 3 との違いは、**limit price check** が走査を早く止める点。Test 3 の Market buy は 100 を辿り続けた (Market は任意の価格を取る) が、test 4 の Limit buy は 103 で止まる。

この 2 つのテストを合わせると、L4 の price-check ロジックが両方向で動くことを証明できる: Market (check なし、全部辿る) と Limit (check あり、limit で止まる)。

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

**同じ price** (100) に resting Sell が 2 個、提出順は order 1、その後 order 2。7 unit の Market buy が arrive する。

期待:
- Order 1 (最初に place された方) が最初に約定 — 5 unit。
- Order 2 (2 番目に place された方) が次に約定 — 2 unit。

これが「price-time priority」のうち **time priority** の半分。Price level 内では order が FIFO で並び、first in が first out になる。L3 で選んだ `VecDeque<RestingOrder>` がこれを `push_back` (新規 order を末尾に) と `pop_front` (マッチした order を先頭から) で自然に実装している。

**このテストが失敗する** のは、誤って `Vec<RestingOrder>` を使って `Vec::remove(0)` した場合 (結果は正しいが queue を shift するためマッチごとに O(n) になる) や、`push_back` の代わりに `VecDeque::push_front` を使った場合 (newest-first になり、price-anti-time-priority になる)。

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

短いので 3 テストを 1 step にまとめる:

- **Test 6 (`market_with_insufficient_liquidity_returns_remaining`)**: 3 unit の単一 ask、10 unit の Market buy — L5 の「Market が remainder を破棄する」意味論を exercise する。`remaining_qty == 7` (unfilled 部分)。Book は後で空になる。
- **Test 7 (`cancel_removes_resting_order`)**: resting bid を作り、それを cancel する。`cancel` が `true` を返すこと、depth が 0 になること、`best_bid()` が `None` を返すこと (L6 の空 level cleanup) を verify する。
- **Test 8 (`cancel_unknown_returns_false`)**: 一度も submit していない OrderId を cancel する。`false` を返し、book は不変であることを verify (空 book には何もないので当然)。

Test 7 と 8 のペアは `cancel` のバグの一群を catch する: `cancel` が `true` を無差別に返したら test 8 が catch し、有効な cancel に `false` を返したら test 7 が catch する。**成功 path と失敗 path をセットで check するテスト** は、片方だけよりも robust。

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

**no-crossed-book invariant**: 常に `best_bid < best_ask` が成り立つ (またはどちらか side が空)。Crossed book — `best_bid >= best_ask` — はマッチすべき buy と sell が共存している状態のこと。**Soundness 違反**: matching engine が何らかの形で衝突すべき 2 つの order を book に共存させてしまったということ。

このテストのセットアップ:
1. Sell @ 100、Buy @ 95 → spread = (95, 100)、cross なし。`bid < ask` を assert する。
2. Incoming Buy @ 100 → 価格 100 の ask とちょうどマッチ (5 unit ↔ 5 unit)、rest する leftover はない。
3. 最終状態: ask は消失 (消費)、bid は依然 95 (order 2 は untouched)。

最終 assert:
- `best_bid() == Some(Price(95))` — order 2 はまだ resting。
- `best_ask() == None` — order 1 の ask は完全に消費されている。

**これが最強のテストである理由**: no-crossed-book invariant こそが orderbook を **正しい** ものにしている。Cross する book は、起こるべきトレードが起こっていない取引所を見せていることになる — matching engine としての根本的失敗。これが pass すれば、engine が safety property を維持しているという **証拠** が得られる (証明ではない — それは L8 の proptest で行う)。

> 🛑 **やりがちな勘違い。** 「9 個ではなく 100 個の unit test を書けばよい? カバレッジは多い方がよい」。 **多くのテストでも同じ path を exercise しているなら、カバレッジが増えたことにはならない。** この 9 個は **異なる invariant** を exercise するように選んである: empty-book、resting、market-walks-levels、limit-respects-price、time-priority、partial-market、cancel-found、cancel-not-found、no-cross。それぞれが他 8 個ではテストできない property をテストする。**「buy crosses ask」をひたすら exercise する 100 個のテストは、99 個が冗長。**

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

テストはアルファベット順で走る (Rust のデフォルト)。9 個すべて pass する。

よくあるエラーと対処:

- **test 内で `error: cannot find function 'limit' in this scope`** — `fn limit(...)` が `mod tests` block の外にある。`use super::*;` 行の後、block 内に移動する。
- **`assertion failed: r.fills[0].price == Price(100)`** で失敗 — `Price(105)` を得た。バグは `submit_market` か `submit_limit` で、間違った方向に辿っている。`keys().next()` 呼び出しを確認: ask は最安先、bid (`Reverse<Price>` 付き) は最高先が欲しい (key が `Reverse<Price>` なら `keys().next()` がそれを返してくれる)。
- **`price_time_priority_within_level` で `assertion failed: r.fills[0].maker_order_id == OrderId(1)`** — `OrderId(2)` が来た。つまり後で submit した order が先にマッチしている = Queue が LIFO になっている。`submit_limit` の rest path を確認: `push_back` (FIFO) すべきで、`push_front` (LIFO) ではない。
- **`market_with_insufficient_liquidity_returns_remaining` で `assertion failed: book.depth_ask() == 0`** — ask が cleanup されていない。`submit_market` の loop で `if queue.is_empty() { self.asks.remove(&best_price) }` step (または Sell ケースの bid 等価) が抜けている。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Builder パターンや struct リテラルよりヘルパー関数を選んだ。** `limit(...)` と `market(...)` は 5 引数 / 4 引数の関数で positional 引数。書くのも読むのも速く、ドキュメント不要 (関数名と引数位置で self-explanatory)。**正しい抽象量は「繰り返しを取り除く分だけ」。**

2. **9 個のテストは有限で defensible なセット。** 各テストが特定の invariant に対応する: empty-book、resting、walks-levels、respects-limit、FIFO、partial-market、cancel-found、cancel-not-found、no-cross。100 個書く必要はない。**Invariant のリストは短く明確であるべきで、カバレッジは invariant 単位で測るもの。テスト数ではない。**

3. **`book_does_not_cross_after_match` を最後に配置している。** テストはアルファベット順で走るので、このテストの **ソース順序** での位置は実行順に影響しない。だが **読む** 順序 (上から下に file を scan するメンテナの視線) では、最重要テストが最も目立つ位置に来る。**ソース上のレイアウト自体が「何が最重要か」の優先度シグナルを encode する。**

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

**Q: ヘルパーが `pub limit` / `pub market` ではなく `limit` / `market` なのはなぜか?**
`mod tests` block に private なものだから。他のモジュールがテスト用の Order を construct する必要はない。Private に保っておくのが正しい encapsulation: テストは自由に使えるが、test ヘルパーが `openhl-clob` の public API に漏れることはない。

**Q: テストをパラメータ化して、たとえば「任意の incoming order に対して book invariant が成り立つ」という property test にすべきか?**
L8 でまさにそれをやる — 768 ランダムシナリオを exercise する proptest invariant 3 個。ただし proptest は hand-trace テストを oracle として依存する。proptest が失敗したときに、それを isolate できる小さな hand-trace テストが欲しいから。**Hand-trace unit test が基礎、proptest がそれを amplify する役。**

**Q: Sell-side limit order のテストは?**
良い質問。9 個のテストが buy-side シナリオに focus しているのは、trace するのが直感的だから (「ask を最安先で辿る」は「bid を最高先で辿る」よりイメージしやすい)。Sell-side テストは correctness 上必須ではない — **もし** `submit_limit::Sell` が `submit_limit::Buy` の構造的 mirror なら (L4 で確立済み)。心配なら sell-side テストをいくつか追加すればよい — このセットの test 3、4、5 を mirror すればよい。

**Q: なぜ `assert!` ではなく `assert_eq!` を使うのか?**
`assert_eq!(a, b)` は失敗時に両方の値を print してくれるが、`assert!(a == b)` は値なしの「left == right」だけを print する。Test デバッグでは、engine が生成した実際の値を知ることが重要。比較が equality なら `assert_eq!` が厳密に優れている。

## 次のレッスン (L8)

Hand-trace されたテスト 9 個。**思いついた specific シナリオをカバーするものだ。** L8 で **proptest invariant 3 個** を追加する — 任意の submit+cancel action sequence に対して成立する property:

- **`qty_conservation`**: book に入る合計 quantity = 合計 filled + 合計 resting。
- **`no_crossed_book`**: `best_bid < best_ask` が常に成立する (test 9 で hand-trace した safety property を今度はランダムテストする)。
- **`determinism`**: 同じ action sequence が同じ約定列と同じ book state を生成する。

256 ランダムケース × 3 invariant = 768 ランダムシナリオ。どれか 1 個でも invariant に違反すれば、proptest が **失敗 sequence を最小反例に自動的に shrink する**。それが example よりも property の load-bearing な利点。
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
