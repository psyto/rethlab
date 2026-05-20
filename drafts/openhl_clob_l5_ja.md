# OpenHL CLOB を作る — L5 draft (JA) — build-along

> openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L5 — `openhl-clob-submit-market-ja`

- **モジュール:** 2 (Matching engine), モジュール内 sortOrder 2
- **コース全体 sortOrder:** 4 (12 レッスン中 5 番目)
- **所要時間:** 25 分
- **XP:** 60
- **type:** CONTENT

### Content

````markdown
# レッスン 5 — `submit_market` — 任意の価格を取る order

## ゴール

このレッスンの終わりに:

```bash
cargo check -p openhl-clob
```

上記の実行結果が引き続きコンパイルし、`submit()` dispatcher が Market order で panic しないようになる。書くもの:

- **`submit_market()`** — Market order の matcher。L4 の `submit_limit` と構造的に同じだが、**鍵となる差が 2 つ**:
  1. **Price check なし** — Market order は任意の価格で取る。
  2. **rest-the-remainder なし** — Market order はマッチしなかった quantity を破棄する。残りは `FillResult::remaining_qty` で返す。
- **`submit()` dispatcher を更新する** — L4 の `todo!("Market orders land in L5")` を `self.submit_market(order)` に置き換える。

L5 後、matching engine は **完成** する。Limit と Market の両方が real fill を produce するようになる。L6 で `cancel` を追加し、L7-L8 で engine の invariant が成り立つことを証明するテストスイートを追加する。

## おさらい

L4 完了時点で `book.rs` は:

```rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => todo!("Market orders land in L5"),
    }
}

fn submit_limit(&mut self, order: Order, limit_price: Price) -> FillResult {
    // ~60 行: 反対側を walk、at-or-better でマッチ、remainder を rest
}

fn match_at_level(taker: &Order, price: Price, ...) -> Fill { ... }
```

`book.submit(market_order)` を呼ぶと `todo!` で panic する。L5 でそれを直す。

## 計画

`crates/clob/src/book.rs` への変更 2 つ:

1. **`submit_market()` を追加する** — `submit_limit()` の下に書く。Buy/Sell の 2 ブランチで、それぞれ `submit_limit` のループとほぼ同じだが limit-price 比較が **ない**。
2. **`submit()` を編集する** — panic ではなく `submit_market` に dispatch するように変える。

新規型なし、新規ヘルパーなし。L4 の `match_at_level` をそのまま再利用する。

レッスンが短いのは、**L4 の大部分の作業を終えた後に L5 として残ったもの** だから。構造パターンは同じで、違うのは「market order」と「limit order」の意味的な差分。

> 🛑 **考えてみよう。** スクロールする前に: ask が `{ Price(100): [O_a (30 units)] }` で、50 unit の Market buy が arrive したとする。Fill はどうなり、`FillResult::remaining_qty` には何が入るか? 対比: 同じ開始 book で price 100、50 unit の Limit buy が来た場合は? **残り 20 unit は各ケースでどこに行くか?**

(答え: Market ケース → fill `[30 @ 100]`、`remaining_qty = 20` (fill しなかった部分は破棄され、caller には見えるが book には乗らない)。Limit ケース → fill `[30 @ 100]`、`remaining_qty = 0` (20 unit が price 100 の新規 bid として book に rest する)。**同じ fill、だが leftover の運命が違う。**)

## 手順

### Step 1: `submit_market()` を `impl Book` に追加

`crates/clob/src/book.rs` で、既存の `impl Book { ... }` ブロック内 (`submit_limit` の直後) に追加:

```rust
    fn submit_market(&mut self, order: Order) -> FillResult {
        let mut remaining = order.qty;
        let mut fills = Vec::new();

        match order.side {
            Side::Buy => loop {
                if remaining.0 == 0 {
                    break;
                }
                let Some(best_price) = self.asks.keys().next().copied() else {
                    break;
                };
                let queue = self
                    .asks
                    .get_mut(&best_price)
                    .expect("price level exists by construction");
                fills.push(match_at_level(&order, best_price, queue, &mut remaining));
                if queue.is_empty() {
                    self.asks.remove(&best_price);
                }
            },
            Side::Sell => loop {
                if remaining.0 == 0 {
                    break;
                }
                let Some(best_rev) = self.bids.keys().next().copied() else {
                    break;
                };
                let queue = self
                    .bids
                    .get_mut(&best_rev)
                    .expect("price level exists by construction");
                fills.push(match_at_level(&order, best_rev.0, queue, &mut remaining));
                if queue.is_empty() {
                    self.bids.remove(&best_rev);
                }
            },
        }

        FillResult {
            fills,
            remaining_qty: remaining,
        }
    }
```

`submit_limit` と side-by-side で比較する。差分:

| 項目 | `submit_limit` | `submit_market` |
| - | - | - |
| Loop 内の price check | `if best_price > limit_price { break }` (Buy) | **なし** — 任意の価格で取る |
| Loop 内の price check | `if best_price < limit_price { break }` (Sell) | **なし** — 任意の価格で取る |
| Loop 後の rest-the-remainder | `if remaining.0 > 0 { ... push_back(resting) ... }` | **なし** — leftover は破棄 |
| Return の `remaining_qty` | 常に `Qty(0)` (rested または完全 fill) | `remaining` (matching 後に残ったもの) |

差分はこれで全部。**Loop の形は同じで、check を 2 個削り、return 値を 1 個変えるだけ。**

> 🛑 **やりがちな勘違い。** 「Market Buy に `limit_price = Price(u64::MAX)`、Market Sell に `Price(0)` を渡して `submit_limit` を呼べばよいのでは?」 **price-check elimination には効くが、rest-the-remainder ロジックを排除しない。** `u64::MAX` limit の Market order は、fill しなかった qty を `u64::MAX` で rest しようとする — つまり最高可能価格で phantom resting bid を作ってしまう。挙動が間違う: 完全 fill しなかった Market buy が `u64::MAX` 価格の bid を book に置き、それが入ってきた sell を即座にマッチしてしまう。**2 つの関数、2 つの意味論、別々に保つ。**

### Step 2: `submit()` dispatcher を更新

L4 で書いた dispatcher を見つける:

```rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => todo!("Market orders land in L5"),
    }
}
```

`todo!` を real call に置き換える:

```rust
pub fn submit(&mut self, order: Order) -> FillResult {
    match order.order_type {
        OrderType::Limit { price } => self.submit_limit(order, price),
        OrderType::Market => self.submit_market(order),
    }
}
```

1 行変更。Dispatcher の役割は広がっていない — 依然「型駆動のルーティング、arm ごとに 1 行」のまま。実装は専用 method に置く。

## テスト

```bash
cargo check -p openhl-clob
```

Clean。Unused function の warning も出ない (`book.rs` で宣言された全関数に少なくとも 1 つの caller がいる — `submit_market` は `submit` から呼ばれ、private な `submit_*` methods は `Book` 内から呼ばれ、`match_at_level` は両 submit から呼ばれる)。

Smoke test (L4 と同じく、後で削除):

```rust
#[cfg(test)]
mod smoke {
    use super::*;

    #[test]
    fn market_buy_takes_what_it_can_then_discards() {
        let mut book = Book::new();
        // Place a single resting sell at 100 for 30 units.
        book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        // Market buy for 50 — should match 30 at 100, leave 20 unfilled.
        let result = book.submit(Order {
            id: OrderId(2),
            account: AccountId(2),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Market,
        });
        assert_eq!(result.fills.len(), 1);
        assert_eq!(result.fills[0].qty, Qty(30));
        assert_eq!(result.fills[0].price, Price(100));
        // The 20 unfilled units are DISCARDED, not rested.
        assert_eq!(result.remaining_qty, Qty(20));
        assert_eq!(book.best_bid(), None); // no resting bid created
        assert_eq!(book.best_ask(), None); // ask was consumed
    }

    #[test]
    fn market_buy_against_empty_book_returns_full_remainder() {
        let mut book = Book::new();
        let result = book.submit(Order {
            id: OrderId(1),
            account: AccountId(1),
            side: Side::Buy,
            qty: Qty(50),
            order_type: OrderType::Market,
        });
        assert_eq!(result.fills.len(), 0);
        assert_eq!(result.remaining_qty, Qty(50));
        assert_eq!(book.best_bid(), None);
        assert_eq!(book.best_ask(), None);
    }
}
```

`cargo test -p openhl-clob smoke` で走らせる。両方 pass するはず。**そのあと smoke module は削除する** — real なテストスイートは L7-L8 で作る。

2 つの smoke test の対比は L5 のレッスン本質の要約 (ミニ版) になっている: **matching 後に残ったものは fill が produce されたかどうかに関わらず破棄される**。Market order 後の book 状態は、消費された liquidity を引いた book 状態そのもの — resting order は追加されない。

よくあるエラーと対処:

- **Smoke test が `Qty(20)` でなく `result.remaining_qty == Qty(0)` を報告** — `submit_market` の final `FillResult` が `remaining_qty: Qty(0)` (`submit_limit` から copy-paste した可能性)。`remaining_qty: remaining` — 実際の leftover quantity であるべき。
- **Market Buy 後に `book.best_bid()` が `Some(price)` を返す** — `submit_market` が `submit_limit` の rest-the-remainder ブランチに当たっている。Loop が共有コードに fall through した。`submit_market` が自分の final `FillResult` を持つ自分の関数であることを確認 — 共有「rest」ロジックなし。
- **`error: cannot find function 'submit_market' in '&mut Book'`** — `submit()` dispatcher の typo。Method は `self` に対して `self.submit_market(order)`。
- **間違ったパスでの `warning: unused variable: remaining`** — `FillResult` で `remaining: remaining,` ではなく `let remaining_qty = ...` と書いた可能性。Field 名が `remaining_qty`、local 変数が `remaining` (`FillResult { fills, remaining_qty: remaining }`)。

## 設計の振り返り

3 つの load-bearing な決定:

1. **`submit_limit` と `submit_market` は別々の関数として書き、parameterize しない。** Loop が 80% 同一でも、semantic な差 (leftover を rest させるか破棄するか) は **欠けている** コードにあるのであって、そこにあるコードにあるのではない。Parameterize すると `rest_remainder: bool` や `enforce_price: bool` のような boolean flag が必要になり、関数本体が branchy なパズルになる。**明確な分離があってこそ、2 つの意味論を独立に読みやすくなる。**

2. **`FillResult::remaining_qty` は order type で意味が変わる。** Limit では常に `Qty(0)` (rested か完全 match)。Market では実際の unfilled 残り。**型は同じ、契約は違う。** これが許されるのは、`FillResult` の field doc (L2) が両方の解釈を明示的に named しているから。

3. **空 book の Market order はエラーではなく clean に返る。** 空 asks book に対する Market buy は `FillResult { fills: vec![], remaining_qty: order.qty }` を返す。エラーなし。これが正しいデフォルト: caller がマッチを依頼し、できるだけ (0 個でも) マッチさせ、leftover を報告する。**「何も起きなかった」はエラーではなく valid な結果であるべき。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
```

L5 後、`book.rs` は参照の **最初の ~190 行**。残り ~25 行は `cancel()` (L6) と module export。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: 空 book の Market order が clean に返るユースケースは?**
本番 matching engine ではよくある: thin な market が open し、fill の合間に orderbook が一時的に空になり、そこに Market order が arrive する。正しい挙動は「0 fill を produce、full remainder を報告、何をするかは caller が決める」だ。Caller は後で retry したり、Limit に切り替えたり、ユーザーにエラーを surface したりする — だが matching engine 自体はそれを決めない。

**Q: Market は自分の価格を持たないのに、なぜ maker の resting price を使うのか?**
Fill 価格は常に **resting** order の価格 (maker の) になる。Market order は価格を supply せず、book がオファーするものを受け入れる。**「価格発見」こそが market を market たらしめる** — buyer が価格を決めるのではなく、best bid と best ask のスプレッドが決める。

**Q: Market order がゼロ quantity の Fill を produce することはあるか?**
ない。`match_at_level` は `fill_qty = min(maker.qty, remaining)` を計算する。これがゼロになるには `maker.qty` か `remaining` のどちらかがゼロでなければならない。invariant が両方を維持してくれる: `submit_market` は `remaining == 0` になった瞬間 loop を抜けるし、maker queue に zero-qty resting order が残ることもない (matching コードが qty を縮めてゼロに当たったら maker を pop するため)。そのため `match_at_level` が両方ゼロで呼ばれることはない。

**Q: 複数 price level にまたがる partial fill は?**
Market order はこれを自然に扱える。Ask `{99: [30 units], 100: [30 units], 101: [50 units]}` に対する 100-unit Market buy は 3 つの fill を produce する (30 @ 99、30 @ 100、40 @ 101)。Loop の各 iteration が next-best level の front に対して `match_at_level` を呼び、`remaining == 0` になるか book が枯渇するまで loop が続く。**多 level を walk する挙動は crossing Limit order と同じ。**

## 次のレッスン (L6)

Matching engine は **submit** を扱えるようになった。だが **cancel** はまだできない — fill される前に自分の resting order を削除したいユーザーが何もできない。L6 で `cancel(order_id) -> bool` を追加する:

- bids と asks の両方を linear scan して order を見つける。
- 今は O(n) (n は総 resting order 数)。O(1) index 追加の議論は openhl の後段の stage で扱う。
- 重要: cancel が level を空にしたら drop すること (`submit` が `if queue.is_empty() { self.asks.remove(...) }` で維持しているのと同じ invariant)。
````

---

## Seed ファイルスロット

L5 は Module 2 (Matching engine) sortOrder 2 に入る:

```typescript
{
  title: 'レッスン 5 — submit_market — 任意の価格を取る order',
  slug: 'openhl-clob-submit-market-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 25,
  xpReward: 60,
  content: `# レッスン 5 — \`submit_market\` — 任意の価格を取る order\n\n...`
},
```

## SHA pinning 規律

L1-L4 と同じ — `55a9dff` (Stage 8a)。L5 後、reader の `book.rs` は参照の最初の ~190 行 (matching engine 完成、L6 のための `cancel()` だけ残る)。
