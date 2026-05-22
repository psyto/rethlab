# OpenHL CLOB を作る — L4 draft (JA) — build-along

> openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L4 — `openhl-clob-submit-limit-ja`

- **モジュール:** 2 (Matching engine), モジュール内 sortOrder 1
- **コース全体 sortOrder:** 3 (12 レッスン中 4 番目)
- **所要時間:** 45 分
- **XP:** 80
- **type:** CONTENT

### Content

````markdown
# レッスン 4 — Limit order 用 `submit` + `match_at_level`

## ゴール

このレッスンで掴む概念:

- **Buy と Sell は構造的なミラーであり、generic 抽象ではない** — Buy 分岐は ask を昇順に辿り、Sell 分岐は bid を降順に辿る。ほぼ同形の関数 2 本のほうが、boolean フラグでパズル化した generic helper より読みやすい。
- **「クロスする限り辿る」が matching engine の core loop** — `while remaining > 0 && 反対側の best 価格が limit をクロス { match_at_level; level を進める / 外す }`。この形が見えれば、L5 の market order は「同じ loop から price check を抜いただけ」だと分かる。
- **空 queue 不変条件は変更のたびに維持する** — 各 match の後で `if queue.is_empty() { remove(price) }`。空 queue を map に残すと `best_bid()` が嘘をつき、no-crossed-book 不変条件が壊れる。
- **戻り値は「呼び出しで何が起きたか」、book 状態は「今どうあるか」を表す** — Limit の `FillResult::remaining_qty` は常に `Qty(0)` (約定しなかった分は rest した)。rest した残量を知りたければ `best_bid` / `depth_bid` を別途問い合わせる。2 つの契約を混ぜない。
- **`match_at_level` は free function として scope を名指す** — `self` を取らない。caller が既に取り出したデータ (queue + remaining) を操作する。関数 signature がドキュメントを兼ねる。

検証:

```bash
cargo check -p openhl-clob
```

上記の実行結果が引き続きコンパイルする。

具体的な変更:

`Book` が **Limit order** (Buy + Sell) を受け付け、実際の `Fill` を生成できるようになる。Market order はまだ `todo!()` のまま — それは L5 で扱う。

書くもの:

- **`submit()`** — `order.order_type` に基づいて `submit_limit` または `submit_market` にルーティングする dispatch メソッド。
- **`submit_limit()`** — 本体: book の反対側を順に辿り、limit price に対して at-or-better でマッチさせ、約定しなかった残りを book に rest させる。
- **`match_at_level()`** — `submit_limit` (および L5 の `submit_market`) から呼ばれる private ヘルパー。単一 price level で実際の約定を行い、maker queue と taker の remaining quantity の両方を mutate する。

L4 後、`book.rs` は **~150 行** になる。Buy + Sell の Limit order がどちらも動く。Market はまだ `todo!` で panic する。

## おさらい

L3 完了時点で `book.rs` は:

```rust
pub struct Book {
    bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>,
    asks: BTreeMap<Price, VecDeque<RestingOrder>>,
}

struct RestingOrder { id: OrderId, account: AccountId, qty: Qty }

impl Book {
    pub fn new() -> Self { ... }
    pub fn best_bid(&self) -> Option<Price> { ... }
    pub fn best_ask(&self) -> Option<Price> { ... }
    pub fn depth_bid(&self) -> usize { ... }
    pub fn depth_ask(&self) -> usize { ... }
}
```

**order を入れる方法がない。** L4 でそこを直す。

## 計画

すべて `crates/clob/src/book.rs` に追加する 3 つ:

1. **`submit()` dispatcher** — `OrderType` に対する 1 つの `match`。Limit → `submit_limit`、Market → 今は `todo!()`。
2. **`submit_limit()` 本体** — 約 60 行。Buy は ask を昇順に辿り、`ask_price <= limit` の間マッチする。Sell は bid を降順に辿り、`bid_price >= limit` の間マッチする。約定しなかった残りは book に rest させる (`RestingOrder` として entry)。
3. **`match_at_level()` ヘルパー** — 約 25 行。Queue 先頭の maker を pop または shrink し、1 つの `Fill` を返し、taker の `remaining` を mutate する。

これが **matching engine の大部分**。L5 で Market を追加する (Market は `submit_limit` から price check と resting step を除いたもの)。L6 で cancel を追加する。**Matching engine の core が本レッスンの中身。**

> 🛑 **考えてみよう。** スクロールする前に: price 100 の Limit Buy order が ask を最安から順に辿るとする。Ask が `{ Price(98): [O_a], Price(99): [O_b, O_c], Price(101): [O_d] }` のような状態で、buyer は 50 unit 買いたく、各 resting order は 30 unit。**約定はどの順序で発生するか? Trade 後の book の最終状態は?** ヒント: `keys().next()` から ask を順に辿り、満たされるか next level が limit を超えるまで各 level でマッチする。

(答え: 約定は `[Fill@98 で 30、Fill@99 で 20]`。Trade 後、`O_a` は消え、`O_b` は 10 unit 残り、`O_c` は 30 unit のまま、`O_d` も 30 unit のまま。Buyer は limit より少なく払った (98 + 99 vs 100) — これが「at-or-better」ルール。)

このシナリオを board の状態変化として並べると:

```
BEFORE — submit Limit Buy @ 100, qty 50:

  asks (lowest first):                bids: (empty)
    98  → [O_a(30)]
    99  → [O_b(30), O_c(30)]
    101 → [O_d(30)]

  walk asks while ask_price ≤ 100 and remaining > 0:
    98  ≤ 100 → eat O_a fully      → Fill(O_a, taker, 98, 30); remaining = 20
    99  ≤ 100 → eat O_b partial    → Fill(O_b, taker, 99, 20); remaining = 0
    101 > 100 → STOP                 (price exceeds limit / taker filled)

AFTER:

  asks:                                bids: (empty — taker fully filled,
    99  → [O_b(10), O_c(30)]                    nothing remains to rest)
    101 → [O_d(30)]

  returned: FillResult { fills: [F1, F2], remaining_qty: Qty(0) }
```

これが matching engine の hot path の動的な姿だ — taker が ask 側の流動性を上方向に *walk* して食らい、残量がゼロになれば終わり、ゼロでなければその時点で reverse して bid 側に rest する（Step 3 で実装する partial-fill ケース）。

## 手順

### Step 1: `submit()` dispatcher を追加

`crates/clob/src/book.rs` で、既存の `impl Book { ... }` ブロック内 (`new()` の直後) に追加:

```rust
    /// Submit a taker order. Limit orders rest any unfilled remainder on the
    /// book; Market orders discard it (returned via `remaining_qty`).
    pub fn submit(&mut self, order: Order) -> FillResult {
        match order.order_type {
            OrderType::Limit { price } => self.submit_limit(order, price),
            OrderType::Market => todo!("Market orders land in L5"),
        }
    }
```

本体 3 行。Dispatcher は意図的に小さくしてある — matching ロジックはすべて `submit_limit` と (将来の) `submit_market` に置く。**Dispatcher の唯一の仕事は型駆動のルーティング**であって、matching そのものではない。

`todo!()` はここでは正しい placeholder。Market order が submit されると runtime で clear なメッセージで panic するが、コンパイルは clean に通る。L5 で実際の `self.submit_market(order)` 呼び出しに置き換える。

> 🛑 **やりがちな勘違い。** 「Submit() を 1 つの大きな match にして、matching ロジックを各 arm にインラインで書けばいいのでは?」 **そうすると `submit_limit` と `submit_market` が dispatcher の match arm の中に隠れる。** 効果は 2 つ: (1) public method `submit` が 100+ 行になり一目で読みづらい、(2) 各 path のテストが難しくなる (test は `Book::submit` を import するが、特定 path を exercise するために `order_type` を正しく設定した `Order` を construct する必要がある)。`submit_limit` / `submit_market` を named function として外に出すと、addressable で testable になる。

### Step 2: `submit_limit` 本体を書き始める

`submit()` の下、依然 `impl Book` 内:

```rust
    fn submit_limit(&mut self, order: Order, limit_price: Price) -> FillResult {
        let mut remaining = order.qty;
        let mut fills = Vec::new();

        match order.side {
            Side::Buy => {
                // Buy は ask を最安から順に辿り、ask <= limit の間マッチする。
                loop {
                    if remaining.0 == 0 {
                        break;
                    }
                    let Some(best_price) = self.asks.keys().next().copied() else {
                        break;
                    };
                    if best_price > limit_price {
                        break;
                    }
                    let queue = self
                        .asks
                        .get_mut(&best_price)
                        .expect("price level exists by construction");
                    fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                    if queue.is_empty() {
                        self.asks.remove(&best_price);
                    }
                }
            }
            Side::Sell => {
                // Sell は bid を最高値から順に辿り、bid >= limit の間マッチする。
                loop {
                    if remaining.0 == 0 {
                        break;
                    }
                    let Some(best_rev) = self.bids.keys().next().copied() else {
                        break;
                    };
                    let best_price = best_rev.0;
                    if best_price < limit_price {
                        break;
                    }
                    let queue = self
                        .bids
                        .get_mut(&best_rev)
                        .expect("price level exists by construction");
                    fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                    if queue.is_empty() {
                        self.bids.remove(&best_rev);
                    }
                }
            }
        }

        // (rest-the-remainder ロジックは次)
        FillResult { fills, remaining_qty: Qty(0) }
    }
```

これが matching loop。注意深く読む。Buy ブランチ:

1. **無限ループを条件付き break で抜ける。** Exit は 3 つ: (a) taker が完全に約定した、(b) この side で book が空、(c) 最安 ask が limit より高い。
2. **`self.asks.keys().next().copied()`** — 最安 ask 価格。`&Price` ではなく `Price` 値が欲しいので `.copied()` する。
3. **`if best_price > limit_price { break }`** — at-or-better ルール。Ask に `limit_price` 以上は払わない。
4. **`self.asks.get_mut(&best_price).expect(...)`** — その価格の queue。**`.expect` は安全** — `best_price` を `keys().next()` から取ったばかりなので、level は確実に存在する。Expect message が invariant を文書化する。
5. **`match_at_level(&order, best_price, queue, &mut remaining)`** — 実際のマッチを行う。このヘルパーは次に書く。今のところは、`Fill` を返し、`queue` (maker が完全に約定すれば pop する) と `remaining` (約定数量を引く) の両方を mutate することを覚えておけばよい。
6. **`if queue.is_empty() { self.asks.remove(&best_price) }`** — `match_at_level` が queue を空にしたなら、level を drop して `best_ask()` を `depth_ask()` と整合させる。(空 queue を map に残すと、`best_ask()` がその level の価格を返すが、order はそこにない。)

Sell ブランチは **構造的に同一** だが反転している:
- `asks` ではなく `bids` を辿る。
- key が `Reverse<Price>` なので `best_rev.0` で unwrap する。
- 比較は `best_price < limit_price` (sell の at-or-better は limit 以上で売る)。

**「構造的同一性」が load-bearing な観察。** Buy と Sell は互いの mirror image。どちらも反対側を best-first で辿り、どちらも price が limit をクリアする間マッチし、どちらも空になった level を pop する。違いは触る BTreeMap と比較の方向だけ。Buy ブランチが分かれば Sell ブランチも分かる。

> 🛑 **やりがちな勘違い。** 「Buy/Sell を parameterize して、ループを 1 度だけ書けないか?」 **できる — だがコストに見合わない。** 完全 generic 版は BTreeMap (`Reverse<Price>` vs `Price`)、比較演算子 (`>` vs `<`)、key (`bids` vs `asks`) を抽象化する必要がある。節約できるのは ~30 行の duplication、払うコストは Rust で最も手強い generic-bound パズルの 1 つ。**Duplication は安く、abstraction の予算は貴重。実際に効くところに使う。**

### Step 3: rest-the-remainder ロジックを追加

上の matching loop は `FillResult { fills, remaining_qty: Qty(0) }` で終わる — これは placeholder。実際の「remainder を rest させる」ロジックに置き換える:

```rust
        // Any unfilled limit qty rests on the book.
        if remaining.0 > 0 {
            let resting = RestingOrder {
                id: order.id,
                account: order.account,
                qty: remaining,
            };
            match order.side {
                Side::Buy => self
                    .bids
                    .entry(Reverse(limit_price))
                    .or_default()
                    .push_back(resting),
                Side::Sell => self.asks.entry(limit_price).or_default().push_back(resting),
            }
            // Limit orders that rest report zero remaining to the caller —
            // the remainder isn't in the return value, it's in the book.
            FillResult {
                fills,
                remaining_qty: Qty(0),
            }
        } else {
            FillResult {
                fills,
                remaining_qty: Qty(0),
            }
        }
    }
```

注意深く読む:

1. **`if remaining.0 > 0`** — taker にまだ約定していない quantity がある。Limit order ではその quantity が book に乗る (Market order は L5 で代わりに破棄する)。
2. **`RestingOrder` を construct する** — side と order_type は落とす (どの map に push するかで encode される) — id + account + remaining qty だけを残す。
3. **`self.bids.entry(Reverse(limit_price)).or_default().push_back(resting)`** — Buy order の約定しなかった残り。`entry` + `or_default` は BTreeMap の「なければ insert、いずれにせよ mutable ref を取る」イディオム。`Reverse(limit_price)` は L3 で bids に選んだ key の形。
4. **`self.asks.entry(limit_price).or_default().push_back(resting)`** — Sell の対称形。
5. **`FillResult { fills, remaining_qty: Qty(0) }`** — caller にゼロ `remaining_qty` を返す。**これが L2 の `FillResult` doc が約束した load-bearing な意味論**: rest する Limit order は **ゼロ remaining と申告する**。Remainder は book にあって、return 値の中にはない。
6. **両方のブランチ** (`if` と `else`) が `Qty(0)` remaining を返す。`else` ブランチは完全に約定したケース (taker が 100% マッチし、rest も remaining もない)。2 つのブランチは異なる理由で同じ return 値を生成する。

> 🛑 **やりがちな勘違い。** 「rest する Limit order が、resting amount ではなく `remaining_qty: Qty(0)` を返すのはなぜか? Caller は book にいくら乗ったか知りたいかも」。 **`FillResult` は **matching** の結果であって、book の状態ではないから。** Resting amount を知りたい caller は call 後に `best_bid()` や `depth_bid()` を query すればよい。「book が新しい resting liquidity をこれだけ受け取った」と「matcher が place できなかった taker quantity がこれだけ残った」を混ぜると意味論が曖昧になる。**Return value は何が起きたかを表し、book 状態は何があるかを表す。関心事を分離する。**

### Step 4: `match_at_level()` ヘルパーを書く

`impl Book { ... }` ブロックの下 (impl 内ではなく module scope) に追加:

```rust
/// Match a taker against the front of a single price level.
/// Mutates `queue` (pops the maker if fully filled) and `remaining`.
fn match_at_level(
    taker: &Order,
    price: Price,
    queue: &mut VecDeque<RestingOrder>,
    remaining: &mut Qty,
) -> Fill {
    let maker = queue
        .front_mut()
        .expect("match_at_level called with empty queue");
    let fill_qty = Qty(maker.qty.0.min(remaining.0));

    let fill = Fill {
        maker_order_id: maker.id,
        taker_order_id: taker.id,
        maker_account: maker.account,
        taker_account: taker.account,
        price,
        qty: fill_qty,
    };

    maker.qty.0 -= fill_qty.0;
    remaining.0 -= fill_qty.0;

    if maker.qty.0 == 0 {
        queue.pop_front();
    }

    fill
}
```

これが **実際のマッチ** — 本来の仕事を行う最小の関数。順に読む:

1. **`queue.front_mut().expect(...)`** — queue 先頭の maker。Time priority とは「最初に置かれた order が最初にマッチする」ことなので、これでよい。`submit_limit` は level の存在を確認した後にしか `match_at_level` を呼ばないので `expect` は安全。
2. **`fill_qty = min(maker.qty, remaining)`** — 2 つの小さい方をマッチさせる。Maker が 30 unit で taker がまだ 50 必要なら約定は 30 (maker は完全消費)。Maker が 30 で taker が 10 だけ必要なら約定は 10 (maker は 20 残る)。
3. **`Fill` を build** — order ID 両方と account ID 両方を保存する (L2 の設計判断: self-contained Fills)。
4. **`maker.qty.0 -= fill_qty.0`** — maker を縮める。**これは RestingOrder 内なら安全だが、Order 内では違和感のある mutation** (L3 の anti-fluency callout — RestingOrder はちょうどこの種の mutation を明示するために存在する)。
5. **`remaining.0 -= fill_qty.0`** — taker の outstanding quantity を縮める。Caller (`submit_limit`) が `&mut Qty` 引数経由でこれを観測する。
6. **`if maker.qty.0 == 0 { queue.pop_front() }`** — maker が完全消費されたら pop する。`submit_limit` の outer loop の次の iteration でこの queue を再度 check し、空になっていれば level 自体が drop される。

**なぜ Book のメソッドではなく free function なのか?** `self` へのアクセスが不要だから。単一 queue (`submit_limit` が既に mutable ref を持っている) と単一 `remaining` カウンタにしか触らない。Free function にすることで scope の狭さを反映している: `Book` 全体は関与しない。

> 🛑 **やりがちな勘違い。** 「`expect("empty queue")` の panic はリスキーに見える。Queue が **実際に** 空だったら?」 **この関数は空 queue で呼ばれないことが `submit_limit` の invariant。** 具体的には、`submit_limit` は `keys().next()` が `Some(price)` を返した後にしか `match_at_level` を呼ばず、空 queue を即削除する規律をループ内で守っている — だから `match_at_level` の入口に到達する時点で「level に少なくとも 1 要素ある」ことが構造的に保証される。**この `expect` は手抜きではなく、上位レイヤの invariant をコンパイル時に表明する明示的な防衛境界（assertion）だ。** 空 queue で `match_at_level` が呼ばれたとしたら、それは `submit_limit` のバグであって `match_at_level` のバグではない — そして `expect` が `Option::None` のサイレント伝播ではなく、clear なメッセージ付きの panic としてバグを surface する。**内部 invariant は信頼し、`expect` で明示的に assert する。** これは production 品質の Rust の規律の一つだ。

## テスト

```bash
cargo check -p openhl-clob
```

クリーンにコンパイルするはず。L3 の unused-import warning (`Fill`、`FillResult`、`Order`、`OrderType`、`Qty`、`Side`) はここで消えるはず — `submit_limit` と `match_at_level` がすべてを使うから。

Matching ロジックをサニティチェックするためのテストはまだない (それは L7-L8)。仮の動作確認として、**`crates/clob/src/book.rs` の最末尾**（`match_at_level` 関数の下）に以下の一時的な smoke テストを貼り付ける。`book.rs` 末尾なら `Book`、`OrderId`、`AccountId`、`Side`、`Qty`、`OrderType`、`Price` がすべて crate 内 path から見えるので `use super::*;` と `use crate::types::*;` だけで足りる:

```rust
#[cfg(test)]
mod smoke {
    use super::*;
    use crate::types::{AccountId, OrderId, OrderType, Price, Qty, Side};

    #[test]
    fn buy_crosses_resting_ask() {
        let mut book = Book::new();
        // Place a resting sell at 100 for 30 units.
        book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        // Cross with a buy at 100 for 50 units.
        let result = book.submit(Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Limit { price: Price(100) },
        });
        assert_eq!(result.fills.len(), 1);
        assert_eq!(result.fills[0].qty, Qty(30));
        assert_eq!(result.fills[0].price, Price(100));
        assert_eq!(result.fills[0].maker_order_id, OrderId(1));
        assert_eq!(result.fills[0].taker_order_id, OrderId(2));
        // 50 - 30 = 20 unfilled, rests as a new bid at 100.
        assert_eq!(result.remaining_qty, Qty(0)); // rested, not returned
        assert_eq!(book.best_bid(), Some(Price(100)));
        assert_eq!(book.depth_bid(), 1);
        assert_eq!(book.depth_ask(), 0); // ask was fully consumed
    }
}
```

`cargo test -p openhl-clob smoke::buy_crosses_resting_ask` で走らせる。Pass すれば Limit Buy + Limit Sell ロジックは正しい。

**L5 に進む前にこの `mod smoke` ブロックは `book.rs` から削除する** — 本格的なテストスイートは L7-L8 で proper な hand-trace シナリオと proptest を伴って入る。上の smoke test は L4 がコンパイルして **走る** ことを verify するためだけのもの。L5 開始時点で `book.rs` をクリーンに戻しておく。

よくあるエラーと対処:

- **`error: 'Buy' branch panics with 'todo!()' but I selected Limit not Market`** — `submit` dispatcher の `OrderType::Limit` arm に draft 状態の `todo!()` が残っている。Step 1 を再確認; Limit arm は `self.submit_limit(order, price)` を呼ぶべき。
- **`error[E0596]: cannot borrow 'maker' as mutable... requires Copy`** — `front_mut()` は `Option<&mut T>` を返す、`Option<T>` ではない。`let maker = queue.front_mut().expect(...).clone()` と書くと、maker の `Copy` で作業して mutation が persist しない。参照を直接使う: `let maker = queue.front_mut().expect(...)`。
- **`error: cannot find value 'asks' in scope`** in match_at_level — `match_at_level` は free function で Book メソッドではない。`self` がない。代わりにパラメータ (`queue`、`remaining`) を使う。
- **Smoke test が `depth_bid: 0` を報告** — rest-the-remainder ロジックが bids に push しなかった。Step 3 を再確認、特に `Reverse(limit_price)` key wrap (`Reverse` を忘れると unwrapped-Price entry に push され、`best_bid` の `Reverse`-keyed lookup で見つからない)。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Buy と Sell は構造的に mirror。** Buy ブランチは ask を昇順に辿り、Sell ブランチは bid を降順に辿る。Generics で abstract する選択はしなかった — duplication のほうが abstraction tax より安いから。**構造的に同一な関数 2 つのほうが、完全 generic な 1 関数より読みやすい。**

2. **`match_at_level` は free function であって method ではない。** `self` は要らない。Free function にすることで、book 全体ではなく caller が既に extract したデータ (queue + remaining) に対して動作することを文書化している。**関数 signature が文書として scope を名指す。**

3. **Resting Limit order の `remaining_qty: Qty(0)` は意図的。** Caller には「これだけマッチした、こちらに残りはない」と見える。Resting remainder を知りたければ `best_bid` / `depth_bid` で book に query すればよい — そちらは book-state メソッド。**Return 値は call で起きたことを描き、book 状態は何があるかを描く。混ぜない。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
```

L4 後、自分の `book.rs` は参照の **最初の ~145 行** (L3 の struct + accessor + submit dispatcher + submit_limit + match_at_level)。参照には `submit_market` (~40 LOC、L5) と `cancel` (~25 LOC、L6) もあるが、まだ書いていない。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ `match_at_level` の `taker` は `&Order` 参照で、`queue` は `&mut VecDeque<RestingOrder>` なのか?**
`match_at_level` は `taker` から read するだけ (`Fill` に field を copy する) だが、`queue` に write する (先頭要素を pop または shrink する) から。関数 signature が使い方を反映する: read-only には `&`、mutating には `&mut`。Compiler が強制してくれる — 参照型が許さないので `taker` を偶発的に mutate することはできない。

**Q: 価格 level が存在するのに queue が空だったらどうなる?**
それはバグ。「map の各 key は非空 queue に対応する」が invariant。`submit_limit` が各 match 後に `if queue.is_empty() { self.asks.remove(&best_price) }` でこれを強制するので、空 queue が残ることはない。もし空 queue を見たら、queue を mutate した後に空チェックしなかった場所を探す。

**Q: `BTreeMap::pop_first()` で best level を 1 回の呼び出しで取得+削除しないのはなぜか?**
理由は 2 つ。(1) `pop_first` は無条件で level を削除するが、必ずしもそうしたいわけではない — マッチ後に level に order が残ることがある (maker が部分的に約定し、後ろに他の order が並んでいる場合)。(2) `pop_first` は Rust 1.66 で stabilize したが、「いくらか消費し、必要なら level を drop する」というフローには `get_mut` + 条件付き `remove` のマッチパターンが自然に読める。

**Q: 「taker が maker をぴったりマッチ」のための fast path はあるか?**
ない、必要もない。General path (`min(maker.qty, remaining)` + shrink-or-pop) が「exact match」を general の特殊ケースとして扱ってくれる。Special-case branch を追加すると test 対象のコードパスが増え、性能向上は marginal。性能が重要なら profile が先。

## 次のレッスン (L5)

Limit order が動くようになった。**Market order はまだ `todo!()` のまま。** L5 で matching engine を完成させる:
- `submit()` 内の `todo!()` を `self.submit_market(order)` に置き換える。
- `submit_market()` を書く — `submit_limit` から **price check を抜き** (Market は任意の価格を取る)、**remainder を rest させない** (Market は残りを破棄する) 形のもの。

L5 は L4 より短い。大部分の作業 (`match_at_level`、dispatcher) は済んでいるから。L5 終了時には両方の order type で動く完全な matching engine が手に入る。
````

---

## Seed ファイルスロット

L4 は Module 2 (Matching engine) sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 4 — Limit order 用 submit + match_at_level',
  slug: 'openhl-clob-submit-limit-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 45,
  xpReward: 80,
  content: `# レッスン 4 — Limit order 用 \`submit\` + \`match_at_level\`\n\n...`
},
```

## SHA pinning 規律

L1-L3 と同じ — `55a9dff` (Stage 8a)。L4 後、reader の `book.rs` は参照の最初の ~145 行 (`submit_market` (L5) と `cancel` (L6) を除く全部)。
