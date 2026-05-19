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

…依然コンパイルし、`submit()` dispatcher が Market order で panic しない。書くもの:

- **`submit_market()`** — Market order の matcher。L4 の `submit_limit` と構造的に同じだが、**2 つの key な差**:
  1. **Price check なし** — Market order は任意の価格で取る。
  2. **rest-the-remainder なし** — Market order はマッチしなかった quantity を破棄; 残りは `FillResult::remaining_qty` で返る。
- **`submit()` dispatcher を更新** — L4 の `todo!("Market orders land in L5")` を `self.submit_market(order)` に置き換える。

L5 後、matching engine は **完成**。Limit と Market の両方が real fill を produce する。L6 で `cancel` を追加; L7-L8 で engine の invariant が成り立つことを証明するテストスイートを追加。

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

`book.submit(market_order)` を呼ぶと `todo!` で panic する。L5 がそれを直す。

## 計画

`crates/clob/src/book.rs` への 2 つの変更:

1. **`submit_market()` を追加** — `submit_limit()` の下に。Buy/Sell の 2 ブランチ、それぞれ `submit_limit` のループとほぼ同じだが limit-price 比較 **なし**。
2. **`submit()` を編集** — panic ではなく `submit_market` に dispatch する。

新規型なし、新規ヘルパーなし。L4 の `match_at_level` をそのまま再利用。

レッスンが短いのは **L5 が L4 の大部分の作業の後に残ったもの** だから。構造パターンは同じ; 違うのは「market order」と「limit order」の意味的な差分。

> 🛑 **考えてみよう。** スクロールする前に: ask が `{ Price(100): [O_a (30 units)] }` で、50 unit の Market buy が arrive したとする。Fill は何で、`FillResult::remaining_qty` には何が入る? 対比: 同じ開始 book、ただし price 100 で 50 unit の Limit buy。**残り 20 unit は各ケースでどこに行く?**

(答え: Market ケース → fill `[30 @ 100]`、`remaining_qty = 20` (fill しなかった部分は破棄 — caller には見えるが book に乗らない)。Limit ケース → fill `[30 @ 100]`、`remaining_qty = 0` (20 unit が price 100 の新規 bid として book に rest)。**同じ fill、leftover の運命が違う。**)

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

| 何 | `submit_limit` | `submit_market` |
| - | - | - |
| Loop 内の price check | `if best_price > limit_price { break }` (Buy) | **なし** — 任意の価格で取る |
| Loop 内の price check | `if best_price < limit_price { break }` (Sell) | **なし** — 任意の価格で取る |
| Loop 後の rest-the-remainder | `if remaining.0 > 0 { ... push_back(resting) ... }` | **なし** — leftover は破棄 |
| Return の `remaining_qty` | 常に `Qty(0)` (rested または完全 fill) | `remaining` (matching 後に残ったもの) |

差分の全部。**Loop の形は同じ、check 2 個削除、return 値 1 個変更。**

> 🛑 **やりがちな勘違い。** 「Market Buy に `limit_price = Price(u64::MAX)`、Market Sell に `Price(0)` で `submit_limit` を呼べば?」 **price-check elimination には効くが、rest-the-remainder ロジックを排除しない。** `u64::MAX` limit の Market order は依然として fill しなかった qty を `u64::MAX` で rest しようとする — 最高可能価格で phantom resting bid を作る。挙動が間違う: 完全 fill しなかった Market buy が `u64::MAX` 価格の bid を book に置き、それが入ってくる sell を即座にマッチする。**2 つの関数、2 つの意味論、別々に保つ。**

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

1 行変更。Dispatcher の役割は広がっていない — 依然「型駆動のルーティング、arm ごとに 1 行」。実装は専用 method に住む。

## テスト

```bash
cargo check -p openhl-clob
```

Clean。Unused function の warning なし (`book.rs` で宣言された全関数に少なくとも 1 caller がいる — `submit_market` は `submit` から呼ばれ、private `submit_*` methods は `Book` 内から呼ばれ、`match_at_level` は両 submit から呼ばれる)。

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

`cargo test -p openhl-clob smoke` で走らせる。両方 pass するはず。**それから smoke module を削除する** — L7-L8 に real なテストスイート。

2 つの smoke test の対比は L5 のレッスン本質の要約 (ミニ版): **matching 後に残ったものは fill が produce されたかどうかに関わらず破棄される**。Market order 後の book 状態は、消費された liquidity を引いた book 状態そのもの — resting order が追加されない。

よくあるエラーと対処:

- **Smoke test が `Qty(20)` でなく `result.remaining_qty == Qty(0)` を報告** — `submit_market` の final `FillResult` が `remaining_qty: Qty(0)` (`submit_limit` から copy-paste した可能性)。`remaining_qty: remaining` — 実際の leftover quantity であるべき。
- **Market Buy 後に `book.best_bid()` が `Some(price)` を返す** — `submit_market` が `submit_limit` の rest-the-remainder ブランチに当たっている。Loop が共有コードに fall through した。`submit_market` が自分の final `FillResult` を持つ自分の関数であることを確認 — 共有「rest」ロジックなし。
- **`error: cannot find function 'submit_market' in '&mut Book'`** — `submit()` dispatcher の typo。Method は `self` に対して `self.submit_market(order)`。
- **間違ったパスでの `warning: unused variable: remaining`** — `FillResult` で `remaining: remaining,` ではなく `let remaining_qty = ...` と書いた可能性。Field 名が `remaining_qty`、local 変数が `remaining` (`FillResult { fills, remaining_qty: remaining }`)。

## 設計の振り返り

3 つの load-bearing な決定:

1. **`submit_limit` と `submit_market` は別々の関数、parameterize しない。** Loop が 80% 同一でも、semantic な差 (leftover が rest するか破棄されるか?) は **欠けている** コードにある、そこにある コードではない。Parameterize すると `rest_remainder: bool` や `enforce_price: bool` のような boolean flag が必要 — 関数本体が branchy なパズルになる。**明確な分離が 2 つの意味論を独立に読みやすくする。**

2. **`FillResult::remaining_qty` は order type で意味が違う。** Limit には常に `Qty(0)` (rested または完全 match)。Market には実際の unfilled 残り。**型は同じ、契約は違う。** これが OK なのは `FillResult` の field doc (L2) が両方の解釈を明示的に named するから。

3. **空 book の Market order はエラーではなく clean に返る。** 空 asks book に対する Market buy は `FillResult { fills: vec![], remaining_qty: order.qty }` を返す。エラーなし。これが正しいデフォルト: caller がマッチを依頼、できるだけ (0) マッチ、leftover を報告。**「何も起きなかった」は valid な結果であるべき、エラーではなく。**

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
本番 matching engine ではよくある: thin な market が open し、fill 間で orderbook が一時的に空になり、Market order が arrive する。正しい挙動は「0 fill を produce、full remainder を報告、caller が何をするか決める」。Caller が後で retry、Limit に切り替え、ユーザーにエラーを surface — だが matching engine 自体は決めない。

**Q: Market に自分の price がないのに、なぜ maker の resting price を使う?**
Fill 価格は常に **resting** order の価格 (maker の)。Market order は price を supply しない; book がオファーするものを受け入れる。**「価格発見」が market を market にする** — buyer が price を決めるのではなく、best bid と best ask のスプレッドが決める。

**Q: Market order がゼロ quantity の Fill を produce できる?**
できない。`match_at_level` は `fill_qty = min(maker.qty, remaining)` を計算する。これがゼロになるには、`maker.qty` か `remaining` のどちらかがゼロでなければならない。両方の invariant が維持される: `submit_market` は `remaining == 0` の瞬間 loop を抜ける、maker queue は zero-qty resting order を持たない (matching コードが qty を縮め、ゼロに当たったら maker を pop する)。なので `match_at_level` は両方がゼロで呼ばれない。

**Q: 複数 price level に対する partial fill は?**
Market order はこれを自然に扱う。Ask `{99: [30 units], 100: [30 units], 101: [50 units]}` に対する 100-unit Market buy は 3 つの fill を produce する (30 @ 99、30 @ 100、40 @ 101)。Loop の各 iteration が next-best level の front に対して `match_at_level` を呼ぶ; `remaining == 0` または book が枯渇するまで loop が続く。**multiple-level を walk する挙動は crossing Limit order と同じ。**

## 次のレッスン (L6)

Matching engine は **submit** を扱う。まだ **cancel** を扱えない — fill される前に自分の resting order を削除したいユーザーが何もできない。L6 で `cancel(order_id) -> bool` を追加する:

- bids と asks の両方を linear scan して order を見つける。
- 今は O(n)、n は総 resting order 数。O(1) index 追加の議論は openhl の later stage で。
- 重要: cancel が level を空にしたら drop する (`submit` が `if queue.is_empty() { self.asks.remove(...) }` で維持する同じ invariant)。
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
