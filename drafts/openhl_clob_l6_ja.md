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

このレッスンで掴む概念:

- **`BTreeMap::retain` が「mutate + 空 entry を drop」を 1 closure でこなす** — 同じ callback が queue から該当 order を削除し、かつ level を残すかどうかも返す。1 pass で済み、`submit` 由来の空 level 不変条件が自動で維持される。
- **O(n) 線形 scan は v0 で正しい選択** — O(1) cancel のために `HashMap<OrderId, (Side, Price)>` を持つと、`BTreeMap` と同期させる第 2 のデータ構造、追加メモリ、追加 cache 圧が発生する。プロファイルで見えていないものを最適化しない。Scan が見えてきたら index を入れる。
- **`bool` 戻り値が「最小の正直な形」** — `Option<RestingOrder>` は L3 で private にした `RestingOrder` を漏らす。`Result<(), CancelError>` は「見つからない」をエラー扱いに強制するが、cancel の冪等性 (2 回呼んでも安全) はバグではなく機能。
- **空 level 掃除が `best_bid` の正直さを保つ** — もし `retain` が price 100 に空 queue を残せば、流動性がゼロなのに `best_bid()` は 100 を返し、次の sell は幻の価格でマッチしてしまう。`submit` が守るのと同じ不変条件を `cancel` も守らねばならない。

検証:

```bash
cargo check -p openhl-clob
```

上記の実行結果が引き続きコンパイルする。

具体的な変更:

`Book` に新規メソッド 1 個:

- **`cancel(&mut self, order_id: OrderId) -> bool`** — bid と ask の両 side で指定 id の order を検索し、見つかれば削除し、cancellation で level が空になれば level を drop する。削除したら `true`、見つからなければ `false` を返す。

約 25 LOC。L6 後、matching engine は **機能的に完成** する。Submit (Limit + Market) + cancel が v0 のフル表面となる。L7 でテストスイートに入る。

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

足りないのは resting order を **削除** する手段。ユーザーが Limit Buy at 100 を submit して book に rest している状態でも、今のところそれを取り外す方法がない。L6 でこれを追加する。

## 計画

method 1 個、file 1 個。`crates/clob/src/book.rs` で、既存の `impl Book` block に `cancel` を追加する:

1. **bid から検索する** — `BTreeMap::retain` の closure が queue から該当 order を削除し、queue が空でないか報告する。
2. **bid で見つかれば** 即座に `true` を返す。
3. **そうでなければ ask を同じ方法で検索する**。
4. **`found` を返す** (ask で見つかれば true、どこにも見つからなければ false)。

トリックは `retain`。同じ closure で **2 つの仕事** をする:

- **Queue を mutate する** (id が一致する order を削除する)。
- **BTreeMap entry を drop するかどうかを signal する** (`!queue.is_empty()` を返す)。

`retain` は各 (key, value) pair で closure を呼び、closure が `false` を返した pair を削除する。Queue-mutation と空 check return を組み合わせることで、「削除 + 空 level cleanup」の invariant が無料で得られる。

> 🛑 **考えてみよう。** スクロールする前に: ユーザーが price 100 で 50 unit の Limit Buy を submit し (完全 rest し)、それからその order id で Cancel を submit するとする。Cancel 後、**`best_bid()` は何を返すべきか?** ヒント: cancellation 後にその price level が map にまだ残っているかを考える。

(答え: `None`。order が price 100 で唯一のものだったので、cancel すると queue が空になり、`retain` が level を map から drop し、`bids.keys().next()` が `None` を返し、`best_bid()` が `None` を返す。**空 level cleanup によって `best_bid` が「実際に liquidity が存在するか」について正直であり続ける。**)

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
2. **`self.bids.retain(|_, queue| { ... })`** — `retain` がすべての (`Reverse<Price>`, `VecDeque<RestingOrder>`) pair を walk する。Closure が `queue` を mutate して `bool` を返す: `false` なら entry を drop し、`true` なら保持する。
3. **`if !found && let Some(pos) = queue.iter().position(|o| o.id == order_id)`** — まだ見つけていない場合のみ検索する。`iter().position()` は `Option<usize>` を返す — 述語に一致する最初の要素の index。`if let` と組み合わせるのが「index が存在すれば何かする」の Rust 慣用イディオム。
4. **`queue.remove(pos)`** — `VecDeque::remove(index)` がその index の要素を取り出す。返り値の `Option<T>` (削除された要素) はここでは無視する。**`VecDeque::remove` は O(n)** — 後続要素を 1 slot 左にシフトする。数百 order の queue ならマイクロ秒オーダー。
5. **`found = true`** — flag を立てて以降の level がスキャンされないようにする。**これが load-bearing な最適化** — order が見つかった後も残りの level を walk する (以前の cancellation で残った空 queue を check するため) が、残り各 queue 内の linear scan はスキップする。
6. **`!queue.is_empty()`** — return 値。Queue が空 (最後の order を削除したばかり、または別の理由で空) なら `false` を返して `retain` に entry を drop させる。そうでなければ `true` を返して保持させる。
7. **`if found { return true }`** — short-circuit。bid で既に見つけて削除したなら、ask を検索する必要はない。
8. **`self.asks.retain(...)`** — ask に対する同じロジック。Closure 本体は同一 (key の違いはない — 両 map とも value は `VecDeque<RestingOrder>`)。
9. **`found`** — 最終 return。bid で見つかった場合は既に `true` を return 済み。ask で見つかれば `found` が `true` になりそれを返す。どちらでもなければ `found` は `false` のまま。

> 🛑 **やりがちな勘違い。** 「BTreeMap を iterate して entry を見つけて order を削除し、もう一度 iterate して空 level を drop すればよい」。 **2 pass は無駄。さらに悪いことに、invariant が 2 箇所に分散する。** `retain` なら「order 削除」と「空 level drop」の判断が両方 1 closure に encode される。「order を削除した」と「level が空かを check した」の間に、データ構造が inconsistent な状態になる窓がない。**1 closure、2 つの仕事、1 つの invariant。**

### Step 2: 新規 method が両 branch を通ることを verify

`cargo check -p openhl-clob` がクリーンにコンパイルするはず。警告なし。

以前のレッスンからの unused-import warning もすべて消えるはず — `cancel` は新規 import を導入せず、使うもの (`OrderId`、`VecDeque::remove`、BTreeMap の表面) はすべて既に scope 内にあるから。

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

挙動は同じ。2 行増えるが `let && let` chain は使わない。

## テスト

```bash
cargo check -p openhl-clob
```

Clean。Matching engine がここで機能的に完成 — `book.rs` には `new`、accessor 4 個、`submit` (Limit と Market 両 path)、`cancel` が入る。`todo!()` は残っていない。

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

`cargo test -p openhl-clob smoke` で走らせる。3 つすべて pass するはず。**そのあと smoke module は削除する** — real なテストスイートは L7 で入れる。

よくあるエラーと対処:

- **`error: 'retain' has no method named 'retain' on BTreeMap<...>`** — typo か Rust バージョンが古い。`BTreeMap::retain` は Rust 1.53 以降で stable。`rustc --version` を確認。
- **`error: 'position' has no method named 'position'`** — `iter().position()` は `Iterator` trait のメソッドで、`std` の default scope に入っている。`queue.position(|o| ...)` (`iter()` なし) と書くと compile しない。`queue.iter().position(...)` を使う。
- **Cancel が true を返すのに `best_bid()` がまだ cancel された order の price を見せる** — `retain` closure が `!queue.is_empty()` を正しく返していない。おそらく `true` を無条件で返している。Closure 本体の最後の式を確認。
- **`cancel` が間違った order を削除する** — `position` 述語が間違った field を check している。比較は `o.id == order_id` (OrderId でマッチ) であるべきで、`o.account == order_id` などではない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **「削除 + cleanup」を `retain` で組み合わせる。** 2 つの別操作を 1 closure pass で済ませる: queue を mutate し、entry を drop するか決める。これがまさに `retain` のユースケース。代替 (iterate-then-cleanup や、`BTreeMap::iter_mut` + 手動で空 key 収集) は invariant をより多くのコードに分散させてしまう。**自分の操作にぴったり合うメソッドがあるなら、それを使う。**

2. **O(n) linear scan は v0 では fine。** 本番取引所は何千、何万の resting order を持つ。v0 の openhl で数百なら scan はマイクロ秒で済む。`HashMap<OrderId, (Side, Price)>` index を追加すれば cancel は O(1) になるが、その代わりに BTreeMap と同期を保つ second data structure、追加メモリ、追加 cache pressure を抱えることになる。**Profile に出てこないものは最適化しない。** openhl が v0 scale を超えたら index を追加すればよい — それまでは scan が正しい形。

3. **Cancel は `bool` を返す。`Option<RestingOrder>` や `Result<(), CancelError>` ではない。** 削除した order を返すと `RestingOrder` を expose することになる (L3 で意図的に private 型にした)。`Result` を返すと caller に「見つからない」ケースを error として handle させることになるが、cancellation の冪等性は機能でありバグではない (cancel を 2 回呼べることが安全であるべき)。`bool` なら「仕事をしたかしなかったか」をクリーンに伝えられる — 内部を漏らさず、error-handling を強制せずに済む。**何が起きたかを正直に表す、最小の return 形を選ぶ。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
```

L6 後、`book.rs` は `55a9dff` の参照と **機能的に同一** になる。残る違いは doc コメントや空白、それと末尾のテストモジュールだけ — L7-L8 で参照が持つ unit test 9 個 + proptest invariant 3 個を追加していく。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: `retain` で空 level を cleanup しないとどんなコストがあるか?**
最終的に `best_bid()` が、その level に order が存在しないのに価格を返してしまう。すると「best」をわずかに下回る Sell limit が phantom 価格でマッチし、ゼロ quantity に対して fill が起き (`match_at_level` が奇妙な扱いをする)、engine の invariant が drift する。空 level cleanup は `submit` が既に維持している invariant なので、`cancel` も維持する必要がある。

**Q: closure 内の `if !found &&` ガードはなぜ必要か?**
これがないと、`retain` が見つけて以前の level から削除した後も全 level をスキャンしてしまう。マッチは最大 1 回 (`OrderId` で unique なので) なので、`found` flag は correctness fix というより最適化に近い。ただし、最初のマッチで `found = true` を設定すれば、以降の level で `iter().position()` 呼び出し (各 level の O(k) 仕事) をスキップできる。**Early-out のための最適化。**

**Q: 2 つの異なる order が同じ `OrderId` を持っていたらどうなるか?**
`cancel` は最初に見つけた方を削除する (おそらく bid 側 — 先に scan されるため)。Matching engine は book 内で `OrderId` が unique であることを仮定する — それを保証するのは caller の責任。L1 の newtype + `pub u64` field 設計がこれを caller の仕事にしている: caller が ID を構築し、unique 性を所有する。

**Q: 各 VecDeque で `position` を使って `(Reverse<Price>, position)` を得て、`retain` の外で削除するのはどうか?**
position を見つけるために BTreeMap を immutably borrow し、削除するために mutably borrow する必要があり、Rust の borrow checker は position を `clone()` しないとそれを拒否する。`retain` アプローチなら mutable borrow を全期間保持できる — シンプル。

## 次のレッスン (L7)

Matching engine がコンパイルできる。**できていないこと**: 動くことを証明する。L7 でテストモジュールを始める — 期待するシナリオをカバーする hand-trace 済み unit test 9 個: 空 book マッチング、price level 内の FIFO time priority、market order の liquidity 枯渇、複数 price level にわたる partial fill、cancel と再 submit、マッチ後の no-crossed-book invariant。各 test が engine の specific な 1 path を walk し、合わせるとここまで build した matching ロジックの regression suite になる。
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
