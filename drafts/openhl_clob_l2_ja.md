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

このレッスンで掴む概念:

- **自己完結した message は module 境界を綺麗に越える** — `Fill` は `maker_order_id` と `maker_account` の両方を持つ。一方が他方から導出できても、この冗長性で Fill 消費者 (precompile、payload 組み立て) を engine 内部 index から切り離す。
- **「fill 群」と「残り」を分けるのは型レベルの判断** — `FillResult { fills, remaining_qty }` は submit の 2 つの異なる出力を明示する。`Vec<Fill>` に「残り」を擬似 entry として埋め込むより明瞭。
- **派生値はキャッシュせず算出する** — `total_filled()` は method、field ではない。キャッシュすると fill 群を変更するたびに counter 同期が必要になるが、都度計算すれば `FillResult` は pure data record のまま。
- **`Copy` は便利さではなく意味論を反映する** — `Order` (5 小 field、約 48 バイト) は `Copy`。`FillResult` は `Vec<Fill>` を所有するので非 `Copy`。`Copy` は `=` が 1 回の bit-blit で済む型のみ。

検証:

```bash
cargo check -p openhl-clob
```

上記の実行結果が引き続きコンパイルする。

具体的な変更:

`crates/clob/src/types.rs` に L1 の newtype から build した **record 型 3 個** が入る:

- **`Order`** — matching engine への入力 (id、account、side、qty、order_type)。
- **`Fill`** — maker と taker の間で発生した 1 match の出力 (maker_order_id、taker_order_id、maker_account、taker_account、price、qty)。
- **`FillResult`** — submit の return ラッパー: `fills: Vec<Fill>` + `remaining_qty: Qty` + `total_filled()` ヘルパー。

これで **型の語彙** が完成する。L3 以降はこれらの型を使って matching state machine を build していく。

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

約 65 行。`cargo check -p openhl-clob` が pass する。**足りないもの**: これらを組み合わせる型 — order がどう見えるか、fill がどう見えるか、engine が submit 後に何を返すか。L2 でちょうどそのギャップを埋める。

## 計画

同じ `types.rs` に record を 3 個追加する:

1. **`Order`** — 5 field、すべて L1 の型を使う。Matching engine が 1 つの `Order` を取り、1 つの `FillResult` を返す。
2. **`Fill`** — 6 field、maker と taker を明示的に名付ける。maker_order_id と maker_account の **両方** を保存するのは、chain 統合 (course 8) が account を credit/debit するため。
3. **`FillResult`** — fill 群と、マッチも rest もしなかった残りを集める。`total_filled()` ヘルパー付きで、caller が iterate せずに「いくらマッチしたか?」を尋ねられる。

新規依存なし。`types.rs` の外でのコード変更なし。コード ~35 行。

> 🛑 **考えてみよう。** スクロールする前に: `Fill` は `maker_order_id` と `maker_account` の **両方** を運ぶ。なぜ重複させるのか? Maker の `OrderId` で account を lookup できれば十分なのでは? ヒント: `Fill` を consume する側は誰か。Chain の `clob_place_order` precompile (course 8) は balance を credit する — account が直接必要。`OrderId → AccountId` の lookup を許すと、precompile が order book の内部 index への参照を保持しなければならない。**両方を Fill 自体に持たせることで consumer が engine の内部 state から decouple される。** Message passing と shared state の発想の違い。

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

5 field。**全部 `Copy`** — Order は 8 (OrderId) + 8 (AccountId) + 1 (Side) + 8 (Qty) + 16 (OrderType — discriminant + Price) = 41 バイト。padding 込みで約 48 バイト。値渡しで自由に渡せる小ささだ。通常コードで `Box<Order>` や `&Order` を使う必要はない。

field 順序には意味がある:
- **`id` を最初に** — 最も使われる field (lookup、equality、debug)。
- **`account`** — 誰が発注したか。
- **`side`** — Buy か Sell か。
- **`qty`** — いくら。
- **`order_type` を最後に** — 最も複雑な field (enum) で、dispatch を制御する field (Limit と Market が L4-L5 で別の matching ロジックを起動する)。

> 🛑 **やりがちな勘違い。** 「`order_type` は冗長では — `OrderType::Limit { price }` が price を運ぶなら、`price: Price` を直接 `Order` に置けばいいのでは?」 **Market order には price がないから。** `price: Price` を Order に置くと、すべての Market order に意味のない placeholder price を持たせる羽目になり、それを至るところで ignore しなければならない。enum なら「price があるか、ないか」をちょうど 1 回 encode できる。**`Option<Price>` でも動くが「Market」というタグを失う** — `OrderType` が正しい形なのは、区別に **名前** がある (presence/absence ではない) から。

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

6 field。Maker-vs-taker の区別は matching engine コードで最も重要な概念:

- **Maker** = 既に book に rest していた order。流動性を「作った (made)」側で、経済的に良い deal を得る (real exchange では通常 rebate)。
- **Taker** = 流動性を消費して入ってきた order。Spread を払う側で、real exchange では fee を払う。

各 `Fill` は 1 つの match ペアを表す。1 つの taker order が **複数の Fill** を produce することもある (例: market buy が ask 側を上に walk して resting ask を順に食べる)。

**`price` は maker の価格** — taker が book を hit するとき、taker の limit ではなく maker の resting 価格でマッチする。$101 の limit-buyer が $100 の resting limit-seller とマッチすると $100 で fill する (maker の価格)。buyer が勝つわけだ。これが「price-time priority」の挙動。

> 🛑 **やりがちな勘違い。** 「両方の account ID を保存するのは冗長に見える — 各 `Fill` は consume 時に `OrderId` から account を lookup できる」。 **ダメ — そのためには consumer が book の `HashMap<OrderId, RestingOrder>` への参照を保持し、book が先に進んだ後も生かしておかなければならない。** Fill は match 時に emit され非同期に consume される (本コースでは後で commit される payload に drain される)。Book がその間に maker order を cancel していたら、`OrderId → AccountId` lookup は `None` を返し、consumer は詰む。**Self-contained な Fill ならその問題は起きない。**

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

**`FillResult` は `Copy` ではない** — heap 割り当てされる `Vec<Fill>` を所有するから。test とデバッグパスのために `Clone` を付け、engine は値で return する (happy path で clone は不要)。

doc コメント中の 3 点に L3+ のコードが依存する:

1. **`fills` は execution 順序**。Market buy が ask level を 3 個 walk すると、fills[0] が最安マッチ、fills[1] が次、fills[2] が最高となる。Replay determinism にこの順序が重要 (L8 の proptest で assert する)。
2. **`remaining_qty` は rest しなかった taker quantity のみ**。Market order の remainder 100 は「100 unit がどの価格でもマッチできなかった (book が流動性切れ)」を意味する。Limit order でも remainder が 0 だが fill しなかった残りがあり得る — ただしその残りは **今 book にある** (resting order として) のであって、return 値の中にあるわけではない。
3. **`total_filled` はヘルパーであって stored field ではない**。fill 全体に対する O(N) 合計。cache しない理由は、(a) caller が「fill したか?」を聞くだけなら通常 `Vec::len()` で済む、(b) 実際の quantity total は test/inspection コードでしか必要にならず、そこでは O(N) が問題にならない、から。

> 🛑 **やりがちな勘違い。** 「`remaining_qty` を別 field ではなく per-fill data の一部にしたら?」 **submit ごとに remainder は最大 1 つで、どの fill にも紐付かない** — **fill されなかった** 部分そのものだから。`Fill` に入れると、すべての fill に無意味な 0 を運ばせるか、保持するためだけの「phantom fill」エントリを作る羽目になる。`FillResult` に別 field として置くのが正しい形。

### Step 4: `lib.rs` がまだすべて re-export していることを確認

L1 の `lib.rs` で `pub use types::*;` と書いた。その `*` が今追加した 3 つの新規型を自動的に拾う — edit は不要。一応確認しておく:

```rust
// crates/clob/src/lib.rs (変更不要)
pub mod types;
pub use types::*;
```

もし `lib.rs` が `pub use types::{AccountId, OrderId, ...};` のような個別 re-export であれば、新規 3 個を追加する必要がある。**だが L1 で `*` を setup したので不要。**

## テスト

```bash
cargo check -p openhl-clob
```

引き続きコンパイルが通る。出力は L1 と同じ (新規 warning も error もなく、check されるコードが少し増えただけ)。

将来 `crates/evm/Cargo.toml` の視点で型が見えていることを軽くサニティテストできる。まだ dep は追加しない (それは L9 で行う) が、型が public であることは確認できる:

```bash
cargo doc -p openhl-clob --no-deps --open
```

レンダリングされた doc を browse する。"Structs" の下に `AccountId`/`OrderId`/`Price`/`Qty` と並んで `Order`、`Fill`、`FillResult` が見えるはず。`total_filled` は `FillResult` のメソッドの下に出てくる。

よくあるエラーと対処:

- **`error[E0277]: 'FillResult' doesn't implement 'Copy'`** — `FillResult` に `#[derive(Copy)]` をつけた。**Copy にできない** のは内部の `Vec<Fill>` のため。derive から `Copy` を外し、`Clone` だけ残す。
- **`error[E0599]: no method named 'total_filled' for ...`** — ヘルパーを `impl FillResult { ... }` の外に書いた。関数は impl ブロック内が必要。
- **`warning: field 'X' is never read`** — field を書いたが test/usage が参照していない。**今は無視** — L3+ が全部使う。Matching engine にまだ consumer がない。

## 設計の振り返り

3 つの load-bearing な決定:

1. **`Fill` は self-contained。** Order book の内部 index があれば片方からもう片方を導出できるのに、maker_order_id と maker_account を両方保存している。これにより Fill の consumer (precompile、payload assembly、chain 統合) が engine の内部データ構造から decouple される。**self-contained なメッセージは、live state への参照よりも module 境界を越えやすい。**

2. **`FillResult` は「fills」と「remainder」を分ける。** Submit は 0 個以上の fill と 0 か 1 個の remainder を produce する。1 つの `Vec<Fill>` でモデル化すると、remainder のために「phantom fill」を作るか、それを検出する特殊ケースロジックが必要になる。2-field record にすることで型に仕事をさせている。

3. **`total_filled()` は computed であって cached ではない。** Cache するとすべての fill-list 変更でカウンタを update する羽目になり、error-prone になる。On-demand 計算なら `FillResult` を derived state のない純粋データ record に保てる。O(N) コストは N が通常 1-3 (single fill が最頻で、market order が 10 level 食べるのは稀) なので無視できる。

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

**Q: なぜ `Order` は `Copy` で `FillResult` はそうでないのか?**
`Order` は 5 field すべてが `Copy` (`u64` の newtype + 小さい enum)。合計 ~48 バイトで memcpy が安価。`FillResult` は heap 割り当てされる `Vec<Fill>` を所有するので、コピーには allocator 呼び出しが必要。`Copy` は `=` が single bit-blit になる型にのみ付ける。Trait が意味を反映するわけだ。

**Q: なぜ `Fill` の `qty` は `Qty` で、ただの `u64` ではないのか?**
Engine の他の部分と一貫させるため。すべての quantity は `Qty` 型なので、ここで `u64` を混ぜると境界で変換が強制される (そして忘れるリスクが出る)。Newtype の規律は engine 単位で適用するもので、struct 単位ではない。

**Q: `FillResult` で `Box<[Fill]>` を使ったらどうか?**
できる。「これ以上 push しない」ケースでは少しメモリ効率が良い。ただし `Vec<Fill>` は `submit_order` がインクリメンタルに build するもの (match ごとに push) なので、最後に `Box<[Fill]>` に変換すると余分な allocation が 1 つ増える。Profile で問題と分かるまでは `Vec` がシンプルな選択。

**Q: Fill の `qty` が 0 だったら? それは valid Fill か?**
valid ではない — L4-L5 の matching engine は zero-qty Fill を決して produce しない (「0 unit マッチした」=「マッチしなかった」と意味的に同じ)。型システムはこれを強制しないが、engine の invariant が強制する。L7-L8 のテストが regression を catch する。

## 次のレッスン (L3)

型の語彙が完成した。L3 では **matching state machine** を導入する — resting bid/ask order を保持する `Book` 構造体と、book を inspect するヘルパーメソッド (`best_bid`、`best_ask`、accessor)。`submit` ロジックはまだ書かない (L4 で扱う)。データ構造と、bid を最高値から walk するための `Reverse<Price>` トリックだけを導入する。
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
