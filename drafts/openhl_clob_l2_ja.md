# OpenHL CLOB を作る — L2 draft (JA) — build-along

> openhl SHA `55a9dff` (Stage 8a — CLOB pure state machine) 基準。
> コース: `building-openhl-clob-ja` (track: `reth-l1-architect`)。

---

## L2 — `openhl-clob-types-records-ja`

- **モジュール:** 1 (CLOB 型), モジュール内 sortOrder 1
- **コース全体 sortOrder:** 1 (12 レッスン中 2 番目)
- **所要時間:** 20 分
- **XP:** 50
- **type:** CONTENT

### Content

````markdown
# レッスン 2 — `Order`、`Fill`、`FillResult`

## ゴール

このレッスンの終わりに:

```bash
cargo check -p openhl-clob
```

…依然コンパイルする。`crates/clob/src/types.rs` に L1 の newtype から build した **record 型 3 個** が入る:

- **`Order`** — matching engine への入力 (id、account、side、qty、order_type)。
- **`Fill`** — maker と taker の間の 1 match の出力 (maker_order_id、taker_order_id、maker_account、taker_account、price、qty)。
- **`FillResult`** — submit の return ラッパー: `fills: Vec<Fill>` + `remaining_qty: Qty` + `total_filled()` ヘルパー。

これで **型の語彙** が完成する。L3 以降はこれらの型を使って matching state machine を build する。

## おさらい

L1 完了時点で `crates/clob/src/types.rs` には:

```rust
// L1 — field-level 型
pub struct AccountId(pub u64);
pub struct OrderId(pub u64);
pub struct Price(pub u64);
pub struct Qty(pub u64);
pub enum Side { Buy, Sell }
pub enum OrderType { Limit { price: Price }, Market }
// + OrderId, Price, Qty への Display impl
```

約 65 行。`cargo check -p openhl-clob` が pass。**足りないもの**: これらを組み合わせる型 — order がどう見えるか、fill がどう見えるか、engine が submit 後に何を返すか。L2 がちょうどそのギャップを埋める。

## 計画

同じ `types.rs` に record を 3 個追加:

1. **`Order`** — 5 field、すべて L1 の型から。Matching engine が 1 つの `Order` を取り、1 つの `FillResult` を返す。
2. **`Fill`** — 6 field、maker + taker を明示的に名付ける。**両方** maker_order_id と maker_account を保存するのは、chain 統合 (course 8) が account を credit/debit するから。
3. **`FillResult`** — fill 群 + マッチも rest もしなかった残りを集める。`total_filled()` ヘルパー付きで、caller が iterate せずに「いくらマッチしたか?」を尋ねられる。

新規依存なし。`types.rs` の外でのコード変更なし。コード ~35 行。

> 🛑 **考えてみよう。** スクロールする前に: `Fill` は **両方** `maker_order_id` と `maker_account` を運ぶ。なぜ重複? Maker の `OrderId` で account を lookup できれば十分なのでは? ヒント: `Fill` を consume する側は誰か。Chain の `clob_place_order` precompile (course 8) は balance を credit する — account が直接必要。`OrderId → AccountId` の lookup は precompile に order book の内部 index への参照を持たせる必要がある。**両方を Fill 自体に持たせると consumer が engine の内部 state から decouple される。** Message passing vs. shared state の発想。

## 手順

### Step 1: `OrderType` の下に `Order` を追加

`crates/clob/src/types.rs` を開く。`OrderType` enum の後、`Display` impl の前に追加:

```rust
/// A new order entering the book or arriving as a taker.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Order {
    pub id: OrderId,
    pub account: AccountId,
    pub side: Side,
    pub qty: Qty,
    pub order_type: OrderType,
}
```

5 field。**全部 `Copy`** — Order は 8 (OrderId) + 8 (AccountId) + 1 (Side) + 8 (Qty) + 16 (OrderType — discriminant + Price) = 41 バイト。padding 込みで約 48 バイト。値渡しで自由に渡せる小ささ。通常コードで `Box<Order>` や `&Order` は不要。

field 順序には意味がある:
- **`id` 最初** — 最も使われる field (lookup、equality、debug)。
- **`account`** — 誰が発注したか。
- **`side`** — Buy か Sell か。
- **`qty`** — いくら。
- **`order_type` 最後** — 最も複雑な field (enum)、dispatch を制御する field (Limit vs Market が L4-L5 で別の matching ロジックを起こす)。

> 🛑 **やりがちな勘違い。** 「`order_type` は冗長 — `OrderType::Limit { price }` が price を運ぶなら、`price: Price` を直接 `Order` に置けばいいのでは?」 **Market order に price がないから。** `price: Price` を Order に置くと、すべての Market order に意味のない placeholder price を運ばせる羽目になり、それを至るところで ignore しなければならない。enum は「price があるか、ないか」をちょうど 1 回 encode する。**`Option<Price>` でも動くが「Market」タグを失う** — `OrderType` が正しい形なのは、区別に **名前** があるから (presence/absence ではない)。

### Step 2: `Fill` を追加

`Order` の下:

```rust
/// A fill between a maker (resting order) and a taker (incoming order).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Fill {
    pub maker_order_id: OrderId,
    pub taker_order_id: OrderId,
    pub maker_account: AccountId,
    pub taker_account: AccountId,
    pub price: Price,
    pub qty: Qty,
}
```

6 field。Maker-vs-taker の区別が matching engine コードで最重要の概念:

- **Maker** = 既に book に rest していた order。流動性を「作った (made)」側; 経済的により良い deal を得る (real exchange では通常 rebate)。
- **Taker** = 流動性を消費して入ってきた order。Spread を払う; real exchange では fee を払う。

各 `Fill` は 1 つの match ペアを表す。1 つの taker order が **複数の Fill** を produce することがある (例: market buy が ask 側を上に walk して resting ask を順に食べる)。

**`price` は maker の価格** — taker が book を hit するとき、taker の limit ではなく maker の resting 価格でマッチする。$101 の limit-buyer が $100 の resting limit-seller とマッチすると $100 で fill する (maker の価格); buyer が勝つ。これが「price-time priority」の動作。

> 🛑 **やりがちな勘違い。** 「account ID を両方保存するのは冗長に見える — 各 `Fill` は consumer 時に `OrderId` から account を lookup できる」。 **ダメ — そのためには consumer が book の `HashMap<OrderId, RestingOrder>` への参照を保持し、book が先に進んだ後も生かさなければならない。** Fill は match 時に emit され非同期に consume される (我々の場合、後で commit される payload に drain される)。Book がその間に maker order を cancel していたら、`OrderId → AccountId` lookup は `None` を返し、consumer は詰む。**Self-contained な Fill ならその問題はない。**

### Step 3: `FillResult` + `total_filled()` ヘルパー

`Fill` の下:

```rust
/// Result of submitting a taker order.
///
/// `fills` is the list of matched fills, in order of execution. `remaining_qty`
/// is the leftover taker quantity that was *not* rested on the book (Market
/// orders discard their remainder; fully-filled Limit orders return zero).
/// A partially-filled Limit order that rested on the book also returns zero
/// here — the remainder is in the book, not in the return value.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FillResult {
    pub fills: Vec<Fill>,
    pub remaining_qty: Qty,
}

impl FillResult {
    /// Total quantity matched across all fills.
    #[must_use]
    pub fn total_filled(&self) -> Qty {
        Qty(self.fills.iter().map(|f| f.qty.0).sum())
    }
}
```

**`FillResult` は `Copy` でない** — heap 割り当て される `Vec<Fill>` を所有する。test とデバッグパスのために `Clone`、engine は値で return する (happy path で clone 不要)。

doc コメント中の 3 つ、L3+ のコードが依存する:

1. **`fills` は execution 順序**。Market buy が ask level を 3 個 walk すると、fills[0] が最安マッチ、fills[1] が次、fills[2] が最高。Replay determinism にこの順序が重要 (L8 の proptest が assert する)。
2. **`remaining_qty` は rest しなかった taker quantity のみ**。Market order の remainder 100 = 100 unit がどの価格でもマッチできなかった (book が流動性切れ) を意味する。Limit order の remainder 0 でも fill しなかった残りがあり得る — だがその残りは **今 book にある** (resting order として)、return 値の中ではない。
3. **`total_filled` はヘルパー、stored field ではない**。fill に対する O(N) sum。cache しないのは、(a) caller が「fill したか?」を聞くだけなら通常 `Vec::len()` が必要、(b) 実際の quantity total は test/inspection コードでしか必要なく、そこでは O(N) は問題にならないから。

> 🛑 **やりがちな勘違い。** 「`remaining_qty` を別 field ではなく per-fill data の一部にしたら?」 **submit ごとに remainder は最大 1 個で、どの fill にも紐付かない** — それは **fill されなかった** 部分。`Fill` に入れると、すべての fill に無意味な 0 を運ばせるか、それを保持するためだけの「phantom fill」エントリが必要になる。`FillResult` に別 field として置くのが正しい形。

### Step 4: `lib.rs` がまだすべて re-export していることを確認

L1 の `lib.rs` で `pub use types::*;` と書いた。その `*` が今追加した 3 つの新規型を自動的に拾う — edit 不要。簡単に確認:

```rust
// crates/clob/src/lib.rs (変更不要)
pub mod types;
pub use types::*;
```

もし `lib.rs` が `pub use types::{AccountId, OrderId, ...};` のような個別 re-export なら、新規 3 個を追加する必要がある。**だが `*` を L1 で setup したので不要。**

## テスト

```bash
cargo check -p openhl-clob
```

依然コンパイル。出力は L1 と同じ (新規 warning や error なし、check されるコードが少し増えただけ)。

将来 `crates/evm/Cargo.toml` の視点で型が visible であることを軽くサニティテストできる。まだ dep 追加はしない (それは L9)、だが型が public であることは証明できる:

```bash
cargo doc -p openhl-clob --no-deps --open
```

レンダリングされた doc を browse する。"Structs" の下に `AccountId`/`OrderId`/`Price`/`Qty` と並んで `Order`、`Fill`、`FillResult` が見えるはず。`total_filled` は `FillResult` のメソッドの下に。

よくあるエラーと対処:

- **`error[E0277]: 'FillResult' doesn't implement 'Copy'`** — `FillResult` に `#[derive(Copy)]` をつけた。**Copy にできない** のは内部の `Vec<Fill>` のため。derive から `Copy` を外し、`Clone` だけ残す。
- **`error[E0599]: no method named 'total_filled' for ...`** — ヘルパーを `impl FillResult { ... }` の外に書いた。関数は impl ブロック内が必要。
- **`warning: field 'X' is never read`** — field を書いたが test/usage が参照していない。**今は無視** — L3+ が全部使う。Matching engine にまだ consumer がない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **`Fill` は self-contained。** Order book の内部 index があれば片方からもう片方を導出できるのに、maker_order_id と maker_account を両方保存する。これが Fill の consumer (precompile、payload assembly、chain 統合) を engine の内部データ構造から decouple する。**self-contained メッセージは live state への参照より module 境界を越えやすい。**

2. **`FillResult` は「fills」と「remainder」を分ける。** Submit は 0 個以上の fill と 0 か 1 個の remainder を produce する。1 つの `Vec<Fill>` でモデルすると、remainder のために「phantom fill」が必要になるか、それを検出する特殊ケースロジックが必要になる。2-field record が型に仕事をさせる。

3. **`total_filled()` は computed、cached ではない。** Cache するとすべての fill-list 変更がカウンタを update する羽目になる — error-prone。On-demand 計算で `FillResult` を derived state のない純粋データ record に保つ。O(N) コストは N が通常 1-3 (single fill が最頻、market order が 10 level 食べるのは稀) なので無視可能。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 55a9dff
diff -u ~/code/my-openhl/crates/clob/src/types.rs ./crates/clob/src/types.rs
```

L2 後、自分の types.rs は参照の ~109 行に近づくはず。diff は doc コメントの言い回し / 空白だけになるべき。**L1 + L2 で types.rs 完成**。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: なぜ `Order` は `Copy` だが `FillResult` は違う?**
`Order` は 5 field、全部 `Copy` (`u64` の newtype + 小さい enum)。合計 ~48 バイト — memcpy が安価。`FillResult` は heap 割り当て される `Vec<Fill>` を所有; コピーには allocator 呼び出しが必要。`Copy` は `=` が single bit-blit な型のみ。Trait が意味を反映する。

**Q: なぜ `Fill` に `qty: Qty` で、ただの `u64` ではない?**
Engine の残りとの一貫性。すべての quantity は `Qty` 型; ここで `u64` を混ぜると境界で変換が強制される (そして忘れるリスク)。Newtype の規律は engine 単位、struct 単位ではない。

**Q: `FillResult` で `Box<[Fill]>` を使ったら?**
できる、「これ以上 push しない」ケースではメモリ効率が少し良い。だが `Vec<Fill>` は `submit_order` がインクリメンタルに build するもの (match ごとに push); 最後に `Box<[Fill]>` に変換すると 1 個余分な allocation。Profile で重要と分かるまで `Vec` がシンプルな選択。

**Q: Fill の `qty` が 0 だったら? それは valid Fill か?**
違う — L4-L5 の matching engine は zero-qty Fill を決して produce しない (「0 unit マッチした」= 「マッチしなかった」と同じ意味になる)。型システムはこれを強制しない; engine の invariant が強制する。L7-L8 の test が regression を catch する。

## 次のレッスン (L3)

型の語彙が完成した。L3 では **matching state machine** を導入する — resting bid/ask order を保持する `Book` 構造体、book を inspect するヘルパーメソッド (`best_bid`、`best_ask`、accessor)。`submit` ロジックはまだなし (L4)、データ構造と bid を最高値から walk するための `Reverse<Price>` トリックのみ。
````

---

## Seed ファイルスロット

L2 は Module 1 (CLOB 型) sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 2 — Order、Fill、FillResult',
  slug: 'openhl-clob-types-records-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 20,
  xpReward: 50,
  content: `# レッスン 2 — \`Order\`、\`Fill\`、\`FillResult\`\n\n...`
},
```

## SHA pinning 規律

L1 と同じ — `55a9dff` (Stage 8a)。L2 後、reader の `types.rs` がこの SHA の参照とほぼ等価になる。
