# OpenHL CLOB を作る — L6 draft (JA) — build-along

> openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L6 — `openhl-clob-cancel-ja`

- **モジュール:** 2 (Matching engine), モジュール内 sortOrder 3
- **コース全体 sortOrder:** 5 (12 レッスン中 6 番目)
- **所要時間:** 20 分
- **XP:** 50
- **type:** CONTENT

### Content

````markdown
# レッスン 6 — `cancel` — order を book から引き抜く

## ゴール

このレッスンの終わりに:

```bash
cargo check -p openhl-clob
```

…依然コンパイルする。`Book` に新規メソッド 1 個:

- **`cancel(&mut self, order_id: OrderId) -> bool`** — bid と ask の両側で指定 id の order を検索、見つかれば削除、cancellation で level が空になれば level を drop。削除したら `true`、見つからなければ `false` を返す。

約 25 LOC。興味深いイディオムは **`BTreeMap::retain`** — map の全 queue を 1 回 traverse し、条件付きで mutate し、closure が `false` を返した entry を drop する単一呼び出し。「order 削除」と「空 level drop」の両ステップを 1 pass で扱う。

L6 後、matching engine は **機能的に完成**。Submit (Limit + Market) + cancel = v0 のフル表面。L7 がテストスイートを開始する。

## おさらい

L5 完了時点で `Book` には:

```rust
impl Book {
    pub fn new() -> Self { ... }                          // L3
    pub fn best_bid(&self) -> Option<Price> { ... }       // L3
    pub fn best_ask(&self) -> Option<Price> { ... }       // L3
    pub fn depth_bid(&self) -> usize { ... }              // L3
    pub fn depth_ask(&self) -> usize { ... }              // L3
    pub fn submit(&mut self, order: Order) -> FillResult { ... }  // L4 + L5
    // submit_limit, submit_market (private)
}
```

足りないもの: resting order を **削除** する方法。ユーザーが Limit Buy at 100 を submit して book に rest した場合、今のところそれを取り外す方法がない。L6 でそれを追加する。

## 計画

1 method、1 file。`crates/clob/src/book.rs` で、既存の `impl Book` block に `cancel` を追加:

1. **bid から検索** — `BTreeMap::retain` の closure が queue から該当 order を削除し、queue が空でないか報告。
2. **bid で見つかれば** 即座に `true` を返す。
3. **そうでなければ ask を同じ方法で検索**。
4. **`found` を返す** (ask で見つかれば true、どこにも見つからなければ false)。

トリックは `retain`。同じ closure で **2 つの仕事** をする:

- **Queue を mutate** (id が一致する order を削除)。
- **BTreeMap entry を drop するか signal** (`!queue.is_empty()` を返す)。

`retain` は各 (key, value) pair で closure を呼び、closure が `false` を返したら pair を削除する。Queue-mutation と空 check return を組み合わせることで、「削除 + 空 level cleanup」invariant が無料で得られる。

> 🛑 **考えてみよう。** スクロールする前に: ユーザーが price 100 で 50 unit の Limit Buy を submit (完全 rest)、それからその order id で Cancel を submit。Cancel 後、**`best_bid()` は何を返すべきか?** ヒント: cancellation 後にその price level が map にまだ存在するかを考える。

(答え: `None`。order が price 100 の唯一だったので、cancel すると queue が空になり、`retain` が level を map から drop し、`bids.keys().next()` が `None` を返し、`best_bid()` が `None` を返す。**空 level cleanup が `best_bid` を「実際に liquidity が存在するか」について正直に保つ。**)

## 手順

### Step 1: `cancel` を impl block に追加

`crates/clob/src/book.rs` の `impl Book { ... }` 内 (`submit_market` の後) に追加:

```rust
    /// Cancel a resting order by id. O(n) linear scan; fine for v0 book sizes.
    /// Returns true if the order was found and removed. Empty price levels
    /// left behind by cancellation are also dropped, so `best_bid`/`best_ask`
    /// stay consistent with `depth_bid`/`depth_ask`.
    pub fn cancel(&mut self, order_id: OrderId) -> bool {
        let mut found = false;
        self.bids.retain(|_, queue| {
            if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id) {
                queue.remove(pos);
                found = true;
            }
            !queue.is_empty()
        });
        if found {
            return true;
        }
        self.asks.retain(|_, queue| {
            if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id) {
                queue.remove(pos);
                found = true;
            }
            !queue.is_empty()
        });
        found
    }
```

注意深く読む:

1. **`let mut found = false`** — local flag。Order を見つけて削除した瞬間 `true` になる。
2. **`self.bids.retain(|_, queue| { ... })`** — `retain` がすべての (`Reverse<Price>`, `VecDeque<RestingOrder>`) pair を walk する。Closure が `queue` を mutate して `bool` を返す: `false` なら entry を drop、`true` なら保持。
3. **`if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id)`** — まだ見つけていない場合のみ検索。`iter().position()` は `Option<usize>` を返す — 述語に一致する最初の要素の index。`if let` と組み合わせるのが「index が存在すれば何かする」の Rust 慣用イディオム。
4. **`queue.remove(pos)`** — `VecDeque::remove(index)` がその index の要素を取り出す。`Option<T>` (削除された要素) を返すが、ここでは無視。**`VecDeque::remove` は O(n)** — 後続要素を 1 slot 左にシフトする。数百 order の queue ならマイクロ秒オーダー。
5. **`found = true`** — flag を立てて以降の level がスキャンされないようにする。**これが load-bearing な最適化** — order が見つかった後も、残りの level を walk する (以前の cancellation で残った空 queue を check するため) が、残りの各 queue 内の linear scan はスキップ。
6. **`!queue.is_empty()`** — return 値。Queue が今空 (最後の order を削除したばかり、または他の理由で空) なら `false` を返して `retain` に entry を drop させる。そうでなければ `true` を返して保持。
7. **`if found { return true }`** — short-circuit。bid で既に見つけて削除したら、ask を検索する必要なし。
8. **`self.asks.retain(...)`** — ask に対する同じロジック。Closure 本体は同一 (key の違いなし — 両 map とも `VecDeque<RestingOrder>` を value にする)。
9. **`found`** — 最終 return。bid で見つかれば既に `true` を return 済み、ask で見つかれば `found` が `true` になりそれを返す、どちらでもなければ `found` は `false` のまま。

> 🛑 **やりがちな勘違い。** 「BTreeMap を iterate して entry を見つけて order を削除、それからもう一度 iterate して空 level を drop すればいい」。 **2 pass は無駄、さらに悪いことに invariant が 2 箇所に分かれる。** `retain` なら「order 削除」と「空 level drop」の決定が両方 1 closure に encode される。「order を削除した」と「level が空かを check した」の間にデータ構造が inconsistent な状態の窓がない。**1 closure、2 仕事、1 invariant。**

### Step 2: 新規 method が両 branch を通ることを verify

`cargo check -p openhl-clob` がクリーンにコンパイルするはず。警告なし。

以前のレッスンからの unused-import warning は全部消えるはず — `cancel` は新規 import を導入しない (使うもの全部、`OrderId` + `VecDeque::remove` + BTreeMap 表面、既に scope 内)。

`if let && pattern` 構文が Rust バージョンで OK か verify したい場合 (1.65+ で stable):

```bash
rustc --version
# コース前提から 1.95.x 以降を報告するはず。
```

古い Rust で詰まったら、let-chains なし版:

```rust
if !found {
    if let Some(pos) = queue.iter().position(|o| o.id == order_id) {
        queue.remove(pos);
        found = true;
    }
}
```

同じ挙動、2 行余分、`let && let` chain なし。

## テスト

```bash
cargo check -p openhl-clob
```

Clean。Matching engine が機能的に完成 — `book.rs` に `new`、4 つの accessor、`submit` (Limit と Market 両 path)、`cancel`。`todo!()` が残らない。

Smoke test (L4/L5 と同じく、後で削除):

```rust
#[cfg(test)]
mod smoke {
    use super::*;

    fn limit_buy(id: u64, account: u64, qty: u64, price: u64) -> Order {
        Order {
            id: OrderId(id),
            account: AccountId(account),
            side: Side::Buy,
            qty: Qty(qty),
            order_type: OrderType::Limit { price: Price(price) },
        }
    }

    #[test]
    fn cancel_removes_resting_order() {
        let mut book = Book::new();
        // Rest a buy at 100, then a buy at 99 (different price levels).
        book.submit(limit_buy(1, 1, 30, 100));
        book.submit(limit_buy(2, 2, 30, 99));
        assert_eq!(book.best_bid(), Some(Price(100)));
        assert_eq!(book.depth_bid(), 2);

        // Cancel order 1 — the 100-price level should be gone.
        assert!(book.cancel(OrderId(1)));
        assert_eq!(book.best_bid(), Some(Price(99))); // 99 is now the best
        assert_eq!(book.depth_bid(), 1);

        // Cancel again — already removed, should return false.
        assert!(!book.cancel(OrderId(1)));
    }

    #[test]
    fn cancel_searches_both_sides() {
        let mut book = Book::new();
        // Resting Sell at 100, no bids.
        book.submit(Order {
            id: OrderId(7),
            account: AccountId(1),
            side: Side::Sell,
            qty: Qty(30),
            order_type: OrderType::Limit { price: Price(100) },
        });
        assert!(book.cancel(OrderId(7)));
        assert_eq!(book.best_ask(), None);
    }

    #[test]
    fn cancel_nonexistent_returns_false() {
        let mut book = Book::new();
        book.submit(limit_buy(1, 1, 30, 100));
        assert!(!book.cancel(OrderId(99))); // not in the book
        assert_eq!(book.depth_bid(), 1); // resting order untouched
    }
}
```

`cargo test -p openhl-clob smoke`。3 つすべて pass するはず。**それから smoke module を削除する** — L7 が real なテストスイートを持つ。

よくあるエラーと対処:

- **`error: 'retain' has no method named 'retain' on BTreeMap<...>`** — typo か wrong version。`BTreeMap::retain` は Rust 1.53 から stable。`rustc --version` を check。
- **`error: 'position' has no method named 'position'`** — `iter().position()` は `Iterator` trait のメソッド、`std` で default scope 内。`queue.position(|o| ...)` (`iter()` なし) と書いたなら compile しない。`queue.iter().position(...)` を使う。
- **Cancel が true を返すが `best_bid()` がまだ cancel された order の price を見せる** — `retain` closure が `!queue.is_empty()` を正しく返していない。多分 `true` を無条件で返している。Closure 本体の最後の式を check。
- **`cancel` が間違った order を削除** — `position` 述語が間違った field を check している。比較は `o.id == order_id` (OrderId でマッチ) であるべき、`o.account == order_id` などではない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **「削除 + cleanup」を `retain` で組み合わせる。** 2 つの別操作が 1 closure pass で完了: queue を mutate し、entry を drop するか決める。これが `retain` の正確なユースケース。代替 (iterate-then-cleanup、または `BTreeMap::iter_mut` + 手動で空 key 収集) は invariant をより多くのコードに分散させる。**自分の操作に正確に一致するメソッドが存在すれば、それを使う。**

2. **O(n) linear scan は v0 で fine。** 本番取引所は何千、何万の resting order を持つ。v0 openhl で数百なら scan はマイクロ秒。`HashMap<OrderId, (Side, Price)>` index を追加すれば cancel は O(1) になるが、加わるもの: BTreeMap と同期を保つ second data structure、追加メモリ、追加 cache pressure。**Profile に出てこないものは最適化しない。** openhl が v0 scale を超えたら index を追加; それまでは scan が正しい形。

3. **Cancel は `bool` を返す、`Option<RestingOrder>` や `Result<(), CancelError>` ではない。** 削除した order を返すと `RestingOrder` を expose する (L3 で意図的に private 型にした)。`Result` を返すと caller に「見つからない」ケースを error として handle させる — が cancellation の冪等性は機能でありバグではない (cancel を 2 回呼ぶのは安全であるべき)。`bool` が「仕事をしたかしなかったか」をクリーンに言う、内部を漏らさず error-handling を強制せず。**何が起きたかについて正直な最小の return 形を選ぶ。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
```

L6 後、`book.rs` は `55a9dff` の参照と **機能的に同一**。残る違いは doc コメント / 空白と末尾のテストモジュール — L7-L8 で参照が持つ 9 unit test + 3 proptest invariant を追加する。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: `retain` で空 level を cleanup しないコストは?**
最終的に `best_bid()` が、その level に order が存在しないのに価格を返す。それから「best」をわずかに下回る Sell limit が phantom 価格でマッチし、ゼロ quantity に対して fill し (`match_at_level` が奇妙に handle する)、engine の invariant が drift する。空 level cleanup は `submit` が既に維持している invariant; `cancel` も維持する必要がある。

**Q: closure 内の `if !found &&` ガードが必要なのはなぜ?**
これがないと、`retain` が見つけて以前の level から削除した後も全 level をスキャンする。マッチは最大 1 回 (order は `OrderId` で unique)、なので `found` flag は correctness fix というより最適化。だが: 最初のマッチで `found = true` を設定すると、以降の level が `iter().position()` 呼び出しをスキップ、それが各 level の O(k) 仕事。**Early-out による最適化。**

**Q: 2 つの異なる order が同じ `OrderId` を持っていたら?**
`cancel` は最初に見つけた方を削除する (probably bid から、先に scan されるから)。Matching engine は book 内で `OrderId` が unique と仮定する — caller の責任。L1 の newtype + `pub u64` field 設計が caller の仕事にしている: caller が ID を構築し、unique 性を owns する。

**Q: 各 VecDeque で `position` を使い、`(Reverse<Price>, position)` を得て、`retain` の外で削除すれば?**
Position を見つけるために BTreeMap を immutably borrow し、削除するために mutably borrow する必要がある。Rust の borrow checker は position の `clone()` なしでそれを拒否する。`retain` アプローチが mutable borrow を全期間保持する — シンプル。

## 次のレッスン (L7)

Matching engine がコンパイルする。**できないこと**: 動くことを証明する。L7 がテストモジュールを開始する — 期待するシナリオをカバーする hand-trace された unit test 9 個: 空 book マッチング、price level 内の FIFO time priority、market order の liquidity 枯渇、複数 price level にわたる partial fill、cancel + 再 submit、マッチ後の no-crossed-book invariant。各 test が engine の 1 つの specific path を walk する; 合わせて、これまで build した matching ロジックの regression suite になる。
````

---

## Seed ファイルスロット

L6 は Module 2 (Matching engine) sortOrder 3 に入る:

```typescript
{
  title: 'レッスン 6 — cancel — order を book から引き抜く',
  slug: 'openhl-clob-cancel-ja',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 20,
  xpReward: 50,
  content: `# レッスン 6 — \`cancel\` — order を book から引き抜く\n\n...`
},
```

## SHA pinning 規律

L1-L5 と同じ — `55a9dff` (Stage 8a)。L6 後、reader の `book.rs` は参照と機能的に同一。L7-L8 が末尾にテストモジュールを追加する。
