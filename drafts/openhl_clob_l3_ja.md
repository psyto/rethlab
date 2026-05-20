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

上記の実行結果が引き続きコンパイルする。新規ファイル `crates/clob/src/book.rs` に以下が入る:

- **`Book` struct** — `BTreeMap` 2 個 (bids + asks)。それぞれ price level を resting order の `VecDeque` にマップする。
- **`RestingOrder` struct** — book に rest している order の形 (`Order` から trim したもの)。
- **`new()` コンストラクタ** と read-only accessor 4 個 (`best_bid`, `best_ask`, `depth_bid`, `depth_ask`)。

**matching ロジックはまだ書かない** — `submit` は L4 + L5、`cancel` は L6 で扱う。本レッスンの目的は、後続の matching ロジックが少ない行数で済むようにデータ構造を正しく組むこと。

唯一の load-bearing なアイデア: **`Reverse<Price>` を `BTreeMap` の key にする** ことで、natural-order iterator が bid を highest-first で walk するようにする。これが見えれば、残りの matching コードは自明になる。

## おさらい

L2 完了時点で `crates/clob/src/types.rs` は完成している (~109 行): newtype 4 個、`Side`、`OrderType`、`Order`、`Fill`、`FillResult`、`Display` impl。

`crates/clob/src/lib.rs` は `pub use types::*` でそれらすべてを re-export している。**`book` モジュールはまだ存在しない** — 本レッスンで作る。

## 計画

5 つやる:

1. **`crates/clob/src/book.rs` を作成。**
2. **`Book` struct を書く** — `bids: BTreeMap<Reverse<Price>, VecDeque<RestingOrder>>` と `asks: BTreeMap<Price, VecDeque<RestingOrder>>`。
3. **`RestingOrder` struct を書く** — `Order` から trim したもの (side なし、order_type なし、qty は縮む)。
4. **`Book::new()`** と accessor メソッド 4 個を追加。
5. **`pub mod book;`** を `lib.rs` に配線。

Accessor は `Option<Price>` または `usize` を返す — BTreeMap の形に対する純粋な read 操作。興味深い設計判断は **map key 型** と、`RestingOrder` が `Order` から何を残し何を落とすか、の 2 点。

> 🛑 **考えてみよう。** スクロールする前に: `BTreeMap` は key を **natural order** (小さい順) で iterate する。**ask** (最安価格を最初に欲しい) には `BTreeMap<Price, _>` が完璧 — natural order がそのまま最安先に walk する。**bid** は **最高価格を最初に** 欲しいが、natural order は最安先に walk する。**カスタム comparator を書かずに BTreeMap を最高先に walk させる最も安価な方法は?** ヒント: 「u64 の ordering を反転する」を型として考える。

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

注目すべき点:

- **`core::cmp::Reverse`** — 任意の `Ord` 型の ordering を反転する wrapper。`Reverse(Price(100))` は `Reverse(Price(200))` **より大きい** と比較される (Reverse が underlying な比較を反転するため)。
- **`BTreeMap`** — sorted map。Iteration は key を昇順 (= **natural order** = `Ord::cmp` が「小さい順」と言う順) で walk する。Insert/remove/lookup はすべて O(log n)。
- **`VecDeque`** — 両端 queue。価格 level 内の「time priority」に使う: 新規 order は `push_back` (列の末尾) し、マッチした order は `pop_front` (列の先頭から fill) する。
- **L1 + L2 のすべての型** — 本レッスンで直接使わないもの (`Fill`、`FillResult`、`Side` 等) も含む。最終的な import リストに合わせて今のうちに import しておく。L4-L6 の matching コードですべて使う。

> 🛑 **やりがちな勘違い。** 「`BTreeMap` ではなく `HashMap` を使えばいいのでは? Hash lookup は O(1) で BTreeMap の O(log n) より速い」。 **lookup だけでなく、価格順に iterate する必要がある。** 「best bid」を見つけるとは「最高価格の bid」を見つけること。HashMap には「次のソート済み key」という概念がなく、全 key を scan (O(n)) して最大を見つけるしかない。BTreeMap の sorted iteration なら best を O(1) lookup (`keys().next()`) で得られる — これが matching を安くしている。

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

Matching engine の状態全体が **BTreeMap 2 個** に収まる。それだけだ。Order-id index も、別の「best price」cache も (BTreeMap が既に best を O(1) で返してくれる)、tick-size table もない。

Bids と asks の非対称性 — `Reverse<Price>` vs. `Price` — は奇妙に見えるが、これこそが load-bearing なトリック:

- **Asks: `BTreeMap<Price, _>`。** Natural-order key で iteration が `Price(99)`, `Price(100)`, `Price(101)`, ... と進む。最安 ask が欲しい buy-taker は `asks.keys().next()` → `Price(99)` を読む。Best-first。
- **Bids: `BTreeMap<Reverse<Price>, _>`。** `Reverse<Price>(p)` の natural order は **p の降順** になる: `Reverse(Price(101))` が `Reverse(Price(100))` より前、`Reverse(Price(100))` が `Reverse(Price(99))` より前。最高 bid が欲しい sell-taker は `bids.keys().next()` → `Reverse(Price(101))` を読む。Best-first。

**どちらの side も `keys().next()` で best price を取れる。** これが型の非対称性を正当化する API の対称性だ。`Reverse` なしだと bid lookup が `keys().next_back()` (BTreeMap iterator の逆方向) になり、matching コードが side 間で非対称になる — 混乱しやすく、間違えやすい。

`#[derive(Default)]` を付けるのは `Book::new()` (次のステップ) を `Self::default()` だけで済ませるため。コンストラクタで `BTreeMap::new()` を 4 回書かなくてよい。`BTreeMap` の Default は空 map なので、`Book` 全体の `Default` も同様になる。

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

field 3 個、**pub ではない** (内部型なので、caller が `RestingOrder` を直接触らない)。

`Order` から落としたもの:

- **`side`** — 削除。RestingOrder の side はどちらの map に入っているか (bids か asks か) で分かる。2 回保存するのは冗長で error-prone。
- **`order_type`** — 削除。Resting order は定義上常に Limit order になる (Market order は決して rest しない — 取れる分だけ取って残りは破棄するから)。`order_type` を保存すると `OrderType::Market` の `RestingOrder` を作れてしまうが、それは無意味。
- **`qty` は残す** — ただし **部分 fill される度に時間と共に縮む**。L4 の submit コードは、maker が taker の qty の 100% 未満しか食わなかったときに `RestingOrder.qty` を直接 mutate する。

> 🛑 **やりがちな勘違い。** 「元の `Order` を book に保存して `qty` を modify すればよいのでは?」 **`Order` は `Copy` (field 5 個、すべて stack-safe) であり、Copy field を mutate するのは注意深い reviewer の目にバグとして映る。** 具体的には、`Order` が queue 内に保存されていると、matching コードが `*order_in_queue.qty.0 -= fill_qty.0` のように書くことになる — だがこれは `Copy` で安く clone できるはずのデータを mutate していることになる。`RestingOrder` を別型にすることで「これは mutate される」という性質を明示する: `RestingOrder` がそのために **ある** 以上、caller は `RestingOrder.qty` が縮むことを当然と思う。

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

- **`new()`** — `Self::default()`。`Book { bids: BTreeMap::new(), asks: BTreeMap::new() }` と書いてもいいが、`#[derive(Default)]` が均一に処理してくれる。
- **`best_bid()`** — `keys().next()` が natural-order の最小 key を返す。Bids は `Reverse<Price>` を使うので、その key は最高 price を wrap する。`.map(|rp| rp.0)` で unwrap する — `rp.0` が `Reverse` wrapper を剥がす。
- **`best_ask()`** — 同じパターン。ただし key が `Price` そのもの。`keys().next()` が最小 `Price` を返し、`.copied()` で値として取り出す (これがないと `Option<&Price>` になる)。
- **`depth_bid()` / `depth_ask()`** — 全 price level にわたる queue 長の合計。Inspection 用で、テストとデバッグで使う。

**なぜ best を `Option<Price>` にするのか?** Book が空のとき、best price は存在しないから。`Option::None` が正しい答え。`Price(0)` や `Price(u64::MAX)` を返すと、caller が誤って real price として扱う恐れがある。型が空ケースのハンドリングを強制してくれる。

> 🛑 **やりがちな勘違い。** 「`depth_bid` は O(n) — 遅い」。 **テストと inspection でしか呼ばないので、そこでは O(n) は問題にならない。** Matching engine 本体は `depth_bid` を決して呼ばない — `keys().next()` と `front()` を O(1)/O(log n) で walk するだけだ。`depth_bid` が hot path にあるなら counter を追加して push/pop ごとに bump するが、そうではないのでやらない。

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

新規モジュールに **1 行**、public な `Book` 型に **re-export 1 個** を追加:

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

順序は意図的: `book` がアルファベット順で先、`types` が次。Rust crate の import は、通常 crate-level module をアルファベット順に並べると読みやすい。

**`Book` のみ re-export し、`RestingOrder` はしない。** `RestingOrder` は内部 queue 要素であり、matching engine の外から誰も construct したり read したりすべきではない。`book.rs` 内で `pub struct` ではなく `struct` のままにしておけば、その意図が明示される。Compiler が「このモジュールの外で誰も RestingOrder を触らない」を強制してくれる。

## テスト

```bash
cargo check -p openhl-clob
```

期待: clean compile、warning なし。

**unused import** の warning が出るかもしれない — L3 では `book.rs` が `Fill`, `FillResult`, `Order`, `OrderType`, `Qty`, `Side` を import するが、まだ使っていないため:

```
warning: unused import: `Fill, FillResult, Order, OrderType, Qty, Side`
 --> crates/clob/src/book.rs:11:5
```

**対処の選択肢が 2 つ:**

1. **今は warning を抑制する** — use 文の上に `#[allow(unused_imports)]` を追加。L4 ですべて使い始めたら削除。
2. **今は未使用 import をコメントアウトする** — L4-L6 で必要に応じて uncomment。

SHA `55a9dff` の参照は import をすべて残している (ファイルがその SHA で完成しているため)。Build-along では選択 1 のほうが参照に近いが、warning が気になるなら選択 2 のほうが綺麗。どちらでも問題ない。

構造がコンパイルできることをクイックにサニティチェックする:

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

走らせる必要はない。型がコンパイルできさえすればよい。`cargo check -p openhl-clob` が clean なら OK。

よくあるエラーと対処:

- **`error[E0277]: 'BTreeMap<Reverse<Price>, ...>' is not 'Default'`** — `BTreeMap<K, V>` は `K: Ord` を要求し、`Reverse<T>` は `T: Ord` を要求する。L1 で `Price: Ord` derive 済みなので動く。L1 で `Price` に `Ord` を derive し忘れていれば derive chain がここで壊れる。
- **`error[E0599]: no method named 'len' for `VecDeque<RestingOrder>`** — `depth_bid`/`depth_ask` の typo。メソッドは `VecDeque::len`、`.len()` 直接または `VecDeque::len(deque_ref)` でアクセス。
- **`error[E0382]: borrow of moved value: `rp`** in `best_bid` — `&Reverse<Price>` 参照に対する `.map(|rp| rp.0)` で、closure が `rp: &Reverse<Price>` を受け取り、`rp.0` は `Price` を値で返す (`Reverse<Price>: Copy` だから — それは `Price: Copy` だから)。これが error なら `Price` が `Copy` ではない — L1 の derive リストを確認。
- **`error: cannot find type 'RestingOrder' in module 'book'`** 外側から — `RestingOrder` は private。意図的。

## 設計の振り返り

3 つの load-bearing な決定:

1. **Matching engine の状態は BTreeMap 2 個。** Order-id index も、best-price cache も、side ごとの counter もない。他のものはすべてその 2 map から導出される。将来の最適化 (例: O(1) cancel のための `HashMap<OrderId, (Side, Price)>`) は core data model を変えずに追加できる。**操作をサポートする最も単純な表現から始め、profile が要求したら最適化する。**

2. **Bids に `Reverse<Price>` を使うのは、matching コードの複雑さを節約する型レベルトリック。** これがないと、book を walk するすべての場所で「ask なら `next`、bid なら `next_back`」という分岐が必要になる。Bids に `Reverse<Price>` を使うことで、両 side とも `next` で uniform に walk できる。**呼び出し側で 1 つの対称的な API を得られるなら、データ定義の 1 つの型の非対称性は十分払う価値がある。**

3. **`RestingOrder` を `Order` から trim することで invariant を encode する。** Resting order は side を持たないし (どの map にあるかで分かる)、`order_type` も持たない (Market order は決して rest しないから)。これらの field を `RestingOrder` から取り除けば、不可能な状態が表現不可能になる。**型設計とは制約エンジニアリングのこと。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/book.rs ./crates/clob/src/book.rs
diff -u ~/code/my-openhl/crates/clob/src/lib.rs ./crates/clob/src/lib.rs
```

L3 後、自分の `book.rs` は参照の **最初の ~45 行** (struct 定義 + `new()` + accessor 4 個) に相当する。この SHA の参照には `submit` (~100 LOC、L4 + L5)、`cancel` (~25 LOC、L6)、`match_at_level` ヘルパー (~30 LOC、L4) もあるが、これらは後続レッスンで追加する。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ `Vec` ではなく `VecDeque`?**
高速な push-back **と** 高速な pop-front の両方が必要だから。`Vec::remove(0)` は全要素を左にシフトするので O(n) だが、`VecDeque::pop_front()` は O(1)。FIFO queue には常に `VecDeque` (または真の ringbuffer) を使う — `Vec` を front から shift してはいけない。

**Q: `Reverse` は内部で実際に何をしている?**
`Ord::cmp` の方向を反転する。`Reverse(a).cmp(&Reverse(b)) == b.cmp(&a)`。それだけだ。`BTreeMap` は sort 時に key の `Ord` impl を query する。key を `Reverse` でラップすると、`BTreeMap` は `Reverse(higher)` を `Reverse(lower)` より「小さい」と判断し、それに従って walk する。

**Q: `RestingOrder` をただの `Order` にしたらどうか?**
できる — ただし `side` と `order_type` を無駄に運ぶことになる (side は map で既に分かるし、resting Market order は矛盾)。Trim は小さいが、「resting Market order を construct できない」という **型レベル保証** が無料で手に入る。

**Q: なぜ BTreeMap field を private にするのか?**
caller が map を直接 modify すべきではなく、必ず `submit` / `cancel` (L4+ / L6) を通すべきだから。それらが「空 queue を map に残さない」といった invariant を維持する。`book.asks.insert(price, VecDeque::new())` を呼べてしまうと、空の price level (phantom) が作れてしまい、`best_ask()` がそれを返してしまう。Encapsulation でこれを防ぐ。

## 次のレッスン (L4)

データ構造が揃った。L4 ではその上に最初の matching ロジックを乗せる — Limit Buy order の `submit` を書く。Reader は ask を最安から walk し、limit 以下で match し、fill しなかった残りを rest させる `Buy` ブランチを書くことになる。本体 ~60 LOC と、L4-L5 の両方で使う `match_at_level` ヘルパー。L4 後、最も一般的なシナリオ (limit buy が resting ask を cross する) で matching engine が real `Fill` を produce するようになる。
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
