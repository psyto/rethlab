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

このレッスンの終わりに:

```bash
cargo check -p openhl-clob
```

…依然コンパイルする。`Book` が **Limit order** (Buy + Sell) を受け付け、real `Fill` を produce できる。Market order はまだ `todo!()` — L5。

書くもの:

- **`submit()`** — `order.order_type` に基づいて `submit_limit` または `submit_market` にルーティングする dispatch メソッド。
- **`submit_limit()`** — 本体: book の反対側を walk し、limit price に対して at-or-better でマッチし、fill しなかった残りを book に rest させる。
- **`match_at_level()`** — `submit_limit` (および L5 の `submit_market`) から呼ばれる private ヘルパー。単一 price level で実際の fill を行い、maker queue と taker の remaining quantity の両方を mutate する。

L4 後、`book.rs` は **~150 行**。Buy + Sell の Limit order が両方動く; Market はまだ `todo!` で panic する。

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

**order を入れる方法がない。** L4 がそこを直す。

## 計画

すべて `crates/clob/src/book.rs` に追加する 3 つ:

1. **`submit()` dispatcher** — `OrderType` に対する 1 つの `match`。Limit → `submit_limit`; Market → 今は `todo!()`。
2. **`submit_limit()` 本体** — 約 60 行。Buy は ask を昇順 walk、`ask_price <= limit` の間マッチ。Sell は bid を降順 walk、`bid_price >= limit` の間マッチ。Fill しなかった残りが book に rest する (`RestingOrder` として entry)。
3. **`match_at_level()` ヘルパー** — 約 25 行。Queue 先頭の maker を pop または shrink、1 つの `Fill` を返す、taker の `remaining` を mutate する。

これが **matching engine の大部分**。L5 で Market を追加する (Market は `submit_limit` から price check を除き、resting step を除いたもの)。L6 で cancel を追加。**Matching engine の core が本レッスン。**

> 🛑 **考えてみよう。** スクロールする前に: price 100 の Limit Buy order が ask を最安から walk する。Ask が `{ Price(98): [O_a], Price(99): [O_b, O_c], Price(101): [O_d] }` のようなとき。Buyer は 50 unit 買いたく、各 resting order は 30 unit。**Fill はどの順序で発生する? Trade 後の book の最終状態は?** ヒント: `keys().next()` から ask を walk し、満たされるか next level が limit を超えるまで各 level でマッチする。

(答え: fill は `[Fill@98 で 30、Fill@99 で 20]`。Trade 後、`O_a` は消える、`O_b` は 10 unit 残る、`O_c` は 30 unit のまま、`O_d` は 30 unit のまま。Buyer は limit より少なく払った (98 + 99 vs 100) — それが「at-or-better」ルール。)

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

本体 3 行。Dispatcher は意図的に小さい — matching ロジックはすべて `submit_limit` と (将来) `submit_market` に住む。**Dispatcher の唯一の仕事は型駆動のルーティング**、matching ではない。

`todo!()` がここでは正しい placeholder: Market order が submit されたら runtime で clear なメッセージで panic するが、コンパイルは clean。L5 で real な `self.submit_market(order)` 呼び出しに置き換える。

> 🛑 **やりがちな勘違い。** 「Submit() を 1 つの大きな match に matching ロジックを各 arm に入れてインラインで書けばいい?」 **そうすると `submit_limit` と `submit_market` が dispatcher の match arm の中に隠れる。** 2 つの効果: (1) public method `submit` が 100+ 行になり一目で読みづらい; (2) 各パスのテストが難しくなる (test は `Book::submit` を import するが、特定パスを exercise するために `order_type` を正しく設定した `Order` を construct する必要)。`submit_limit` / `submit_market` を named function として外に出すと addressable で testable になる。

### Step 2: `submit_limit` 本体を書き始める

`submit()` の下、依然 `impl Book` 内:

```rust
    fn submit_limit(&mut self, order: Order, limit_price: Price) -> FillResult {
        let mut remaining = order.qty;
        let mut fills = Vec::new();

        match order.side {
            Side::Buy => {
                // Buy walks asks from cheapest; matches while ask <= limit.
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
                // Sell walks bids from highest; matches while bid >= limit.
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

1. **無限ループ、条件で break。** Exit は 3 つ: (a) taker が完全に fill、(b) この side で book が空、(c) 最安 ask が limit より高い。
2. **`self.asks.keys().next().copied()`** — 最安 ask 価格。`&Price` ではなく `Price` 値が欲しいので `.copied()`。
3. **`if best_price > limit_price { break }`** — at-or-better ルール。Ask に `limit_price` 以上は払わない。
4. **`self.asks.get_mut(&best_price).expect(...)`** — その価格の queue。**`.expect` は安全** — `best_price` を `keys().next()` から取ったばかりで、level は確実に存在する。Expect message が invariant を文書化する。
5. **`match_at_level(&order, best_price, queue, &mut remaining)`** — 実際のマッチを行う。次にこのヘルパーを書く; 今は `Fill` を返し、`queue` (maker が完全 fill なら pop) と `remaining` (fill 数量を引く) の両方を mutate することを知っておく。
6. **`if queue.is_empty() { self.asks.remove(&best_price) }`** — `match_at_level` が queue を空にしたなら、level を drop して `best_ask()` が `depth_ask()` と整合性を保つ。(空 queue を map に残すと、`best_ask()` がその level の価格を返すが order はそこにない。)

Sell ブランチは **構造的に同一** だが反転:
- `asks` ではなく `bids` を walk。
- key が `Reverse<Price>` なので `best_rev.0` で unwrap。
- 比較は `best_price < limit_price` (sell at-or-better = limit 以上で sell)。

**「構造的同一性」が load-bearing な観察。** Buy と Sell は互いの mirror image。両者とも反対側を best-first で walk; 両者とも price が limit をクリアする間マッチ; 両者とも空になった level を pop。違いは触る BTreeMap と比較の方向だけ。Buy ブランチが分かれば Sell ブランチも分かる。

> 🛑 **やりがちな勘違い。** 「Buy/Sell を parameterize して 1 度だけループを書けないか?」 **できる — だがコストに見合わない。** 完全 generic 版は BTreeMap (`Reverse<Price>` vs `Price`)、比較演算子 (`>` vs `<`)、key (`bids` vs `asks`) を抽象化する必要がある。節約は ~30 行の duplication、コストは Rust で最も敵対的な generic-bound パズルの 1 つ。**Duplication は安く、abstraction-budget は貴重。実際に勝つところに使う。**

### Step 3: rest-the-remainder ロジックを追加

上の matching loop は `FillResult { fills, remaining_qty: Qty(0) }` で終わる — これは placeholder。real な「remainder を rest させる」ロジックに置き換える:

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

1. **`if remaining.0 > 0`** — taker にまだ fill されていない quantity がある。Limit order ではその quantity が book に乗る (Market order は L5 で代わりに破棄する)。
2. **`RestingOrder` を construct** — side と order_type は落とす (どの map に push するかで encode される)、id + account + remaining qty を残す。
3. **`self.bids.entry(Reverse(limit_price)).or_default().push_back(resting)`** — Buy order の fill しなかった残り。`entry` + `or_default` は BTreeMap の「なければ insert、いずれにせよ mutable ref を取る」イディオム。`Reverse(limit_price)` が L3 で bids に選んだ key の形。
4. **`self.asks.entry(limit_price).or_default().push_back(resting)`** — Sell の対称形。
5. **`FillResult { fills, remaining_qty: Qty(0) }`** — caller にゼロ `remaining_qty` を返す。**これが L2 の `FillResult` doc が約束した load-bearing な意味論**: rest する Limit order は **ゼロ remaining と言う**。Remainder は book にあり、return 値の中ではない。
6. **両方のブランチ** (`if` と `else`) が `Qty(0)` remaining を返す。`else` ブランチは完全 fill ケース (taker が 100% マッチ; rest なし、remaining なし)。2 つのブランチは異なる理由で同じ return 値を produce する。

> 🛑 **やりがちな勘違い。** 「rest する Limit order がなぜ resting amount ではなく `remaining_qty: Qty(0)` を返す? Caller は book にいくら乗ったか知りたいかも」。 **`FillResult` は **matching** の結果で、book の状態ではないから。** Resting amount を知りたい caller は call 後に `best_bid()` や `depth_bid()` を query できる。「book が新しい resting liquidity をこれだけ受け取った」と「matcher が place できなかった taker quantity がこれだけ残った」を混同すると意味論が曖昧になる。**Return は何が起きたかを描く、book 状態は何があるかを描く。Separate concerns。**

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

これが **実際のマッチ** — real work を行う最小の関数。読む:

1. **`queue.front_mut().expect(...)`** — queue 先頭の maker。Time priority は最初に置かれた order が最初にマッチすることを意味する。`submit_limit` が level の存在を確認した後にしか `match_at_level` を呼ばないので `expect` は安全。
2. **`fill_qty = min(maker.qty, remaining)`** — 2 つの小さい方をマッチ。Maker が 30 unit で taker がまだ 50 必要なら fill は 30 (maker は完全消費)。Maker が 30 で taker が 10 だけ必要なら fill は 10 (maker は 20 残る)。
3. **`Fill` を build** — order ID 両方と account ID 両方を保存 (L2 の設計判断: self-contained Fills)。
4. **`maker.qty.0 -= fill_qty.0`** — maker を縮める。**これは RestingOrder 内なら安全だが Order 内ではおかしい mutation** (L3 の anti-fluency callout — RestingOrder はちょうどこの種の mutation を明示するために存在する)。
5. **`remaining.0 -= fill_qty.0`** — taker の outstanding quantity を縮める。Caller (`submit_limit`) が `&mut Qty` 引数経由でこれを見る。
6. **`if maker.qty.0 == 0 { queue.pop_front() }`** — maker が完全消費されたら pop する。`submit_limit` の outer loop の次の iteration がこの queue を再度 check する — 今空なら level 自体が drop される。

**なぜ Book のメソッドではなく free function?** `self` へのアクセスが不要だから。単一 queue (`submit_limit` が既に mutable ref を持っている) と単一 `remaining` counter にしか触らない。Free function にすることでその scope を反映: `Book` 全体は関与しない。

> 🛑 **やりがちな勘違い。** 「`expect("empty queue")` panic はリスキーに見える。Queue が **実際に** 空だったら?」 **関数は空 queue で呼ばれないはず — それが `submit_limit` の invariant。** 具体的には、`submit_limit` は `keys().next()` が `Some(price)` を返した後にしか `match_at_level` を呼ばない、それが level (そして queue) に少なくとも 1 要素あることを保証する。空 queue で `match_at_level` が呼ばれたなら、それは `submit_limit` のバグ、`match_at_level` のバグではない — そして `expect` がバグを clear なメッセージ付きの panic として surface する、`Option::None` のサイレント伝播ではなく。**内部 invariant を信頼する; `expect` で assert する。**

## テスト

```bash
cargo check -p openhl-clob
```

クリーンにコンパイルするはず。L3 の unused-import warning (`Fill`、`FillResult`、`Order`、`OrderType`、`Qty`、`Side`) は今消えるはず — `submit_limit` と `match_at_level` がすべてを使う。

Matching ロジックをサニティチェックするためのテストはまだない (L7-L8)、`src/lib.rs` に一時的に書ける:

```rust
#[cfg(test)]
mod smoke {
    use super::*;

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

`cargo test -p openhl-clob buy_crosses_resting_ask` で走らせる。Pass すれば Limit Buy + Limit Sell ロジックは正しい。

**L5 に進む前にこの smoke test を削除する** — real なテストスイートは L7-L8 で proper な hand-trace シナリオ + proptest と共に来る。上の smoke test は L4 がコンパイルして **走る** ことを verify するためだけ。L5 のために `src/lib.rs` を clean に保つ。

よくあるエラーと対処:

- **`error: 'Buy' branch panics with 'todo!()' but I selected Limit not Market`** — `submit` dispatcher の `OrderType::Limit` arm に draft 状態の `todo!()` が残っている。Step 1 を再確認; Limit arm は `self.submit_limit(order, price)` を呼ぶべき。
- **`error[E0596]: cannot borrow 'maker' as mutable... requires Copy`** — `front_mut()` は `Option<&mut T>` を返す、`Option<T>` ではない。`let maker = queue.front_mut().expect(...).clone()` と書くと、maker の `Copy` で作業して mutation が persist しない。参照を直接使う: `let maker = queue.front_mut().expect(...)`。
- **`error: cannot find value 'asks' in scope`** in match_at_level — `match_at_level` は free function で Book メソッドではない。`self` がない。代わりにパラメータ (`queue`、`remaining`) を使う。
- **Smoke test が `depth_bid: 0` を報告** — rest-the-remainder ロジックが bids に push しなかった。Step 3 を再確認、特に `Reverse(limit_price)` key wrap (`Reverse` を忘れると unwrapped-Price entry に push され、`best_bid` の `Reverse`-keyed lookup で見つからない)。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Buy と Sell は構造的 mirror。** Buy ブランチは ask を昇順 walk; Sell ブランチは bid を降順 walk。Generics で abstract しようとしなかった — duplication が abstraction tax より安かった。**構造的に同一な 2 関数は 1 つの完全 generic 関数より読みやすい。**

2. **`match_at_level` は free function、method ではない。** `self` 不要。Free function にすることで、book 全体ではなく caller が既に extract したデータ (queue + remaining) に対して動作することを文書化する。**関数 signature が文書: scope を name する。**

3. **Resting Limit order の `remaining_qty: Qty(0)` は意図的。** Caller は「これだけマッチした; 私には残りなし」と見る。Resting remainder について知りたければ `best_bid` / `depth_bid` で book に query する — book-state メソッド。**Return 値は call で起きたことを描く; book 状態は何があるかを描く。混ぜない。**

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

**Q: なぜ `match_at_level` の `taker` は `&Order` 参照だが `queue` は `&mut VecDeque<RestingOrder>`?**
`match_at_level` は `taker` から read する (`Fill` に field を copy するだけ) が `queue` に write する (先頭要素を pop または shrink) から。関数 signature が使用法を反映: read-only に `&`、mutating に `&mut`。Compiler が強制する — 参照型が許さないので `taker` を偶発的に mutate できない。

**Q: 価格 level が存在するが queue が空だったらどうなる?**
それはバグ。Invariant は「map の各 key は非空 queue に対応する」。`submit_limit` がこれを各 match 後に `if queue.is_empty() { self.asks.remove(&best_price) }` で強制する — なので空 queue が残ることはない。空 queue を見たら、queue を mutate した後で空 check しなかった場所を探す。

**Q: `BTreeMap::pop_first()` を使って best level を 1 回の呼び出しで取得 + 削除しないのは?**
2 つの理由。(1) `pop_first` は無条件で level を削除するが、いつもそうしたいわけではない — マッチ後に level に order が残ることがある (maker が部分 fill、他が後ろに並ぶ)。(2) `pop_first` は Rust 1.66 で stabilize されたが、`get_mut` + 条件付き `remove` のマッチパターンが「いくらか消費、もしかしたら level drop」のフローには自然に読める。

**Q: 「taker が maker をぴったりマッチ」のための fast path はある?**
ない、必要もない。General path (`min(maker.qty, remaining)` + shrink-or-pop) が「exact match」を general の特殊ケースとして扱う。Special-case branch を追加すると test 対象のコードパスが増え、性能向上は marginal; 性能が重要なら profile が先。

## 次のレッスン (L5)

Limit order が動く。**Market order はまだ `todo!()`。** L5 で matching engine を完成させる:
- `submit()` 内の `todo!()` を `self.submit_market(order)` に置き換え
- `submit_market()` を書く — `submit_limit` から **price check なし** (Market は任意の価格を取る) かつ **remainder を rest させない** (Market は残りを破棄)。

L5 は L4 より短い、大部分の作業 (`match_at_level`、dispatcher) が済んでいる。L5 終了時に両方の order type で動く完全な matching engine がある。
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
