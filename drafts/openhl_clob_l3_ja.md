# OpenHL CLOB を作る — L3 draft (JA) — build-along

> openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L3 — `openhl-clob-book-struct-ja`

- **モジュール:** 2 (Matching engine), モジュール内 sortOrder 0
- **コース全体 sortOrder:** 2 (12 レッスン中 3 番目)
- **所要時間:** 30 分
- **XP:** 60
- **type:** CONTENT

### Content

````markdown
# レッスン 3 — `Book` struct と `Reverse<Price>` トリック

## ゴール

このレッスンの終わりに:

```bash
cargo check -p openhl-clob
```

…依然コンパイルする。新規ファイル `crates/clob/src/book.rs` に以下が入る:

- **`Book` struct** — 2 つの `BTreeMap` (bids + asks)、それぞれ price level を resting order の `VecDeque` にマップ。
- **`RestingOrder` struct** — book に rest している order の形 (`Order` から trim)。
- **`new()` コンストラクタ** + read-only accessor 4 個 (`best_bid`, `best_ask`, `depth_bid`, `depth_ask`)。

**まだ matching ロジックなし** — `submit` は L4 + L5、`cancel` は L6。本レッスンは、後続の matching ロジックが少ない行数で済むようにデータ構造を正しく build することが目的。

唯一の load-bearing なアイデア: **`Reverse<Price>` を `BTreeMap` の key にする** ことで natural-order iterator が bid を highest-first で walk する。これが見えれば、残りの matching コードは自明になる。

## おさらい

L2 完了時点で `crates/clob/src/types.rs` は完成 (~109 行): newtype 4 個、`Side`、`OrderType`、`Order`、`Fill`、`FillResult`、`Display` impl。

`crates/clob/src/lib.rs` は `pub use types::*` でそれらすべてを re-export している。**`book` モジュールはまだない** — 本レッスンで作る。

## 計画

5 つやる:

1. **`crates/clob/src/book.rs` を作成。**
2. **`Book` struct を書く** — `bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>` と `asks: BTreeMap<Price, VecDeque<RestingOrder>>`。
3. **`RestingOrder` struct を書く** — `Order` から trim (side なし、order_type なし、qty は縮む)。
4. **`Book::new()`** + accessor メソッド 4 個を追加。
5. **`pub mod book;`** を `lib.rs` に配線。

Accessor は `Option<Price>` または `usize` を返す — BTreeMap の形に対する純粋な read 操作。興味深い設計判断は **map key 型** と `RestingOrder` が `Order` から何を残し何を落とすか。

> 🛑 **考えてみよう。** スクロールする前に: `BTreeMap` は key を **natural order** (小さい順) で iterate する。**ask** (最安価格を最初に欲しい) には `BTreeMap<Price, _>` が完璧 — natural order がそのまま最安先に walk する。**bid** には **最高価格を最初に** 欲しい — だが natural order は最安先に walk する。**カスタム comparator を書かずに BTreeMap を最高先に walk させる最も安価な方法は?** ヒント: 「u64 の ordering を反転する」を型として考える。

## 手順

### Step 1: モジュール doc と import で `book.rs` を作成

`touch crates/clob/src/book.rs` (またはエディタで作成)。ファイル先頭:

```rust
//! Price-time priority orderbook + matching engine.
//!
//! Bids are stored with a `Reverse<Price>` key so `BTreeMap` natural-order
//! iteration walks them best-first (highest price first). Asks are stored
//! with `Price` directly so they also walk best-first (lowest price first).
//! Within each price level, orders are queued FIFO — that's the "time
//! priority" half of price-time priority.

use core::cmp::Reverse;
use std::collections::{BTreeMap, VecDeque};

use crate::types::{
    AccountId, Fill, FillResult, Order, OrderId, OrderType, Price, Qty, Side,
};
```

注目するべき点:

- **`core::cmp::Reverse`** — 任意の `Ord` 型の ordering を反転する wrapper。`Reverse(Price(100))` は `Reverse(Price(200))` **より大きい** と比較される (Reverse が underlying な比較を反転するため)。
- **`BTreeMap`** — sorted map。Iteration は key を昇順 (= **natural order** = `Ord::cmp` が「小さい順」と言う順) で walk する。Insert/remove/lookup はすべて O(log n)。
- **`VecDeque`** — 両端 queue。価格 level 内の「time priority」に使う: 新規 order は `push_back` (列の最後尾)、マッチした order は `pop_front` (列の先頭から fill)。
- **L1 + L2 のすべての型** — 本レッスンで直接使わないもの (`Fill`、`FillResult`、`Side` 等) も含む。最終的な import リストに合わせて今 import する; L4-L6 の matching コードで全部使う。

> 🛑 **やりがちな勘違い。** 「`BTreeMap` ではなく `HashMap` を使えばいい? Hash lookup は O(1) で BTreeMap の O(log n) より速い」。 **lookup だけでなく、価格順に iterate する。** 「best bid」を見つける = 「最高価格の bid」。HashMap には「次のソート済み key」概念がない; 全 key を scan (O(n)) して最大を見つける必要がある。BTreeMap の sorted iteration は best を O(1) lookup (`keys().next()`) でくれる — それが matching を安くする。

### Step 2: `Book` struct を書く

続けて:

```rust
#[derive(Debug, Default)]
pub struct Book {
    /// Bids: `Reverse<Price>` key gives best-first iteration (highest first).
    bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>,
    /// Asks: `Price` key gives best-first iteration (lowest first).
    asks: BTreeMap<Price, VecDeque<RestingOrder>>,
}
```

Matching engine の状態全体が **2 つの BTreeMap**。それだけ。Order-id index なし、別の「best price」cache なし (BTreeMap が既に best を O(1) でくれる)、tick-size table なし。

Bids と asks の非対称性 — `Reverse<Price>` vs. `Price` — は奇妙に見えるが、これが load-bearing なトリック:

- **Asks: `BTreeMap<Price, _>`。** Natural-order key で iteration が `Price(99)`, `Price(100)`, `Price(101)`, ... と進む。最安 ask を欲しい buy-taker は `asks.keys().next()` → `Price(99)` を読む。Best-first。
- **Bids: `BTreeMap<Reverse<Price>, _>`。** `Reverse<Price>(p)` の natural order は **p の降順**: `Reverse(Price(101))` が `Reverse(Price(100))` より前、`Reverse(Price(100))` が `Reverse(Price(99))` より前。最高 bid を欲しい sell-taker は `bids.keys().next()` → `Reverse(Price(101))` を読む。Best-first。

**両側ともに `keys().next()` で best price を取る。** これが型非対称性を正当化する API 対称性。`Reverse` なしだと bid lookup が `keys().next_back()` (BTreeMap iterator の逆方向) になり、matching コードが side 間で非対称になる — 混乱しやすく、間違えやすい。

`#[derive(Default)]` は `Book::new()` (次のステップ) が単に `Self::default()` で済むため — コンストラクタで `BTreeMap::new()` を 4 回書く必要なし。`BTreeMap` の Default は空 map; `Book` 全体の `Default` も同様。

### Step 3: `RestingOrder` struct を書く

`Book` の下:

```rust
/// An order resting on the book. Trimmed from `Order` — side and `order_type`
/// are implicit from which side of the book it's resting on, and `qty` shrinks
/// as fills consume it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct RestingOrder {
    id: OrderId,
    account: AccountId,
    qty: Qty,
}
```

field 3 個、**pub ではない** (内部型 — caller が `RestingOrder` を直接触らない)。

`Order` から落としたもの:

- **`side`** — 削除。RestingOrder の側はどちらの map に入っているか (bids vs. asks) で分かる。2 回保存するのは冗長で error-prone。
- **`order_type`** — 削除。Resting order は定義上常に Limit order (Market order は決して rest しない — 取れる分だけ取って残りは破棄)。`order_type` を保存すると `OrderType::Market` の `RestingOrder` を作れてしまうが、それは無意味。
- **`qty` は残る** — だが **時間と共に縮む**、部分 fill される度に。L4 の submit コードが、maker が taker の qty の 100% 未満を食ったときに `RestingOrder.qty` を直接 mutate する。

> 🛑 **やりがちな勘違い。** 「Original の `Order` を book に保存して `qty` を modify すればいい?」 **`Order` は `Copy` (field 5 個、すべて stack-safe) で、Copy field を mutate するのは注意深い reviewer にバグに見える。** 具体的には、`Order` が queue 内に保存されていると、matching コードが `*order_in_queue.qty.0 -= fill_qty.0` のように書く — だがこれは `Copy` で安く clone できるはずのデータを mutate している。`RestingOrder` を別型にすることで「これが mutate される」という性質を明示する: caller は `RestingOrder.qty` が縮むことを知っている、`RestingOrder` がそのために **ある** から。

### Step 4: `new()` と accessor 4 個を追加

`book.rs` に append:

```rust
impl Book {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    #[must_use]
    pub fn best_bid(&self) -> Option<Price> {
        self.bids.keys().next().map(|rp| rp.0)
    }

    #[must_use]
    pub fn best_ask(&self) -> Option<Price> {
        self.asks.keys().next().copied()
    }

    #[must_use]
    pub fn depth_bid(&self) -> usize {
        self.bids.values().map(VecDeque::len).sum()
    }

    #[must_use]
    pub fn depth_ask(&self) -> usize {
        self.asks.values().map(VecDeque::len).sum()
    }
}
```

メソッド 5 個、すべて `#[must_use]`:

- **`new()`** — `Self::default()`。`Book { bids: BTreeMap::new(), asks: BTreeMap::new() }` と書けるが、`#[derive(Default)]` が均一に処理する。
- **`best_bid()`** — `keys().next()` が natural-order の最小 key を返す。Bids は `Reverse<Price>` を使うので、その key は最高 price を wrap する。`.map(|rp| rp.0)` で unwrap — `rp.0` が `Reverse` wrapper を剥がす。
- **`best_ask()`** — 同じパターン、ただし key が `Price` 直接。`keys().next()` が最小 `Price` を返し、`.copied()` で値として取り出す (なしだと `Option<&Price>` になる)。
- **`depth_bid()` / `depth_ask()`** — 全 price level にわたる queue 長の合計。Inspection 用、テストとデバッグで使う。

**なぜ best が `Option<Price>`?** Book が空のとき、best price は存在しない。`Option::None` が正しい答え; `Price(0)` や `Price(u64::MAX)` を返すと caller が偶発的に real price として扱う可能性がある。型が空ケースのハンドリングを強制する。

> 🛑 **やりがちな勘違い。** 「`depth_bid` は O(n) — 遅い」。 **テストと inspection でしか呼ばれず、そこでは O(n) は問題ない。** Matching engine 本体は `depth_bid` を決して呼ばない — `keys().next()` と `front()` を O(1)/O(log n) で walk する。`depth_bid` が hot path にあるなら counter を追加して push/pop ごとに bump するだろう; だがそうではないので、しない。

### Step 5: `lib.rs` に配線

`crates/clob/src/lib.rs` を開く。L1 + L2 の内容:

```rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [`book::Book`] for the matching state machine (L3+).

pub mod types;

pub use types::*;
```

新規モジュールに **1 行**、public な `Book` 型に **1 re-export** を追加:

```rust
//! Pure-Rust CLOB (central limit order book) matching engine for openhl.
//!
//! No I/O. No allocation beyond fill output. Deterministic by construction.
//! See [`book::Book`] for the matching state machine.

pub mod book;
pub mod types;

pub use book::Book;
pub use types::*;
```

順序は意図的: `book` がアルファベット順で先、`types` が次。Rust crate の import は通常 crate-level module をアルファベット順にすると読みやすい。

**`Book` のみ re-export、`RestingOrder` はしない。** `RestingOrder` は内部 queue 要素; matching engine の外から誰も construct したり read したりすべきでない。`book.rs` 内で `pub struct` でなく `struct` のまま保つことでそれを明示する。Compiler が「このモジュールの外で誰も RestingOrder を触らない」を強制する。

## テスト

```bash
cargo check -p openhl-clob
```

期待: clean compile、warning なし。

**unused import** の warning が出るかもしれない — L3 では `book.rs` が `Fill`, `FillResult`, `Order`, `OrderType`, `Qty`, `Side` を import するがまだ使わないから:

```
warning: unused import: `Fill, FillResult, Order, OrderType, Qty, Side`
 --> crates/clob/src/book.rs:11:5
```

**ハンドリングの 2 つの選択肢:**

1. **今は warning を抑制** — use 文の上に `#[allow(unused_imports)]` を追加。L4 が全部使い始めたら削除。
2. **今は未使用 import をコメントアウト** — L4-L6 で必要に応じて uncomment。

SHA `55a9dff` の参照は import を全部保つ (ファイルがその SHA で完成しているから)。Build-along では選択 1 が参照に近い; 選択 2 は warning が気になるなら綺麗。どちらでも fine。

構造がコンパイルできることのクイックサニティテスト:

```bash
cat > /tmp/book_test.rs <<'EOF'
use openhl_clob::Book;
use openhl_clob::Price;

fn main() {
    let b = Book::new();
    assert_eq!(b.best_bid(), None);
    assert_eq!(b.best_ask(), None);
    assert_eq!(b.depth_bid(), 0);
    assert_eq!(b.depth_ask(), 0);
    let _: Option<Price> = b.best_bid();
}
EOF
```

走らせる必要はない; 型がコンパイルできるだけでよい。`cargo check -p openhl-clob` が clean なら OK。

よくあるエラーと対処:

- **`error[E0277]: 'BTreeMap<Reverse<Price>, ...>' is not 'Default'`** — `BTreeMap<K, V>` は `K: Ord` を要求し、`Reverse<T>` は `T: Ord` を要求する。L1 で `Price: Ord` derive 済みなので動く。L1 で `Price` に `Ord` を derive し忘れていれば derive chain がここで壊れる。
- **`error[E0599]: no method named 'len' for `VecDeque<RestingOrder>`** — `depth_bid`/`depth_ask` の typo。メソッドは `VecDeque::len`、`.len()` 直接または `VecDeque::len(deque_ref)` でアクセス。
- **`error[E0382]: borrow of moved value: `rp`** in `best_bid` — `&Reverse<Price>` 参照に対する `.map(|rp| rp.0)` で、closure が `rp: &Reverse<Price>` を受け取り、`rp.0` は `Price` を値で返す (`Reverse<Price>: Copy` のため、`Price: Copy` だから)。これが error なら `Price` が `Copy` ではない — L1 の derive リストを確認。
- **`error: cannot find type 'RestingOrder' in module 'book'`** 外側から — `RestingOrder` は private。意図的。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Matching engine の状態は 2 つの BTreeMap。** Order-id index なし、best-price cache なし、side ごとの counter なし。他はすべてその 2 map から導出される。将来の最適化 (例: O(1) cancel のための `HashMap<OrderId, (Side, Price)>`) は core data model を変えずに追加できる。**操作をサポートする最も単純な表現で始め、profile が要求したら最適化する。**

2. **Bids に `Reverse<Price>` を使うのは、matching コードの複雑さを節約する型レベルトリック。** これなしだと、book を walk するすべての場所で分岐が必要: 「ask なら `next`、bid なら `next_back`」。Bids に `Reverse<Price>` を使うことで、両側が `next` で uniform。**呼び出し側で 1 つの対称 API は、データ定義の 1 つの型非対称性に値する。**

3. **`RestingOrder` を `Order` から trim することで invariant を encode する。** Resting order は side を持たない (どの map にあるかで分かる) し `order_type` を持たない (Market order は決して rest しない)。これらの field を `RestingOrder` から取り除くと、不可能な状態が表現不可能になる。**型設計 = 制約エンジニアリング。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/clob/src/lib.rs ./crates/clob/src/lib.rs
```

L3 後、自分の `book.rs` は参照の **最初の ~45 行** (struct 定義 + `new()` + accessor 4 個)。この SHA の参照には `submit` (~100 LOC、L4 + L5)、`cancel` (~25 LOC、L6)、`match_at_level` ヘルパー (~30 LOC、L4) もある。これらは後続レッスンで追加。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ `Vec` ではなく `VecDeque`?**
高速な push-back **と** 高速な pop-front の両方が必要だから。`Vec::remove(0)` は全要素を左にシフト — O(n)。`VecDeque::pop_front()` は O(1)。FIFO queue は常に `VecDeque` (または real ringbuffer) を使う — `Vec` を front から shift しない。

**Q: `Reverse` は内部で実際何をしている?**
`Ord::cmp` の方向を反転する。`Reverse(a).cmp(&Reverse(b)) == b.cmp(&a)`。それだけ。`BTreeMap` は sort 時に key の `Ord` impl を query する; key を `Reverse` でラップすると、`BTreeMap` は `Reverse(higher)` を `Reverse(lower)` より「小さい」と思い、それに従って walk する。

**Q: `RestingOrder` を単に `Order` にしたら?**
できる — だが `side` と `order_type` を無駄に運ぶ (side は既に map で分かる、resting Market order は矛盾)。Trim は小さいが、「resting Market order を construct できない」という **型レベル保証** が無料で手に入る。

**Q: なぜ BTreeMap field が private?**
caller が map を直接 modify すべきでなく、`submit` / `cancel` (L4+ / L6) を通すべきだから — それらが「空 queue を map に残さない」のような invariant を維持する。`book.asks.insert(price, VecDeque::new())` を呼べてしまうと、`best_ask()` が返す phantom な空 price level が作れる。Encapsulation がそれを防ぐ。

## 次のレッスン (L4)

データ構造が揃った。L4 はその上に最初の matching ロジックを乗せる — Limit Buy order の `submit`。Reader は ask を最安から walk し、limit 以下で match し、fill しなかった残りを rest する `Buy` ブランチを書く。Body ~60 LOC + L4-L5 両方で使う `match_at_level` ヘルパー。L4 後、最も一般的なシナリオ (limit buy が resting ask を cross する) で matching engine が real `Fill` を produce する。
````

---

## Seed ファイルスロット

L3 は Module 2 (Matching engine) sortOrder 0 に入る:

```typescript
{
  title: 'レッスン 3 — Book struct と Reverse<Price> トリック',
  slug: 'openhl-clob-book-struct-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 3 — \`Book\` struct と \`Reverse<Price>\` トリック\n\n...`
},
```

## SHA pinning 規律

L1/L2 と同じ — `55a9dff` (Stage 8a)。L3 後、reader の `book.rs` は参照の最初の ~45 行 (struct + `new()` + accessor のみ)。
