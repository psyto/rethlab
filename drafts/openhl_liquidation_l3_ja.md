# Building OpenHL Liquidation — L3 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

## L3 — `openhl-liquidation-snapshot-spec-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 3 — `AccountSnapshot` + `CloseOrderSpec` — エンジンの入出力型

**Duration**: 25 分 · **XP**: 50

---

````markdown
# レッスン 3 — `AccountSnapshot` + `CloseOrderSpec` — エンジンの入出力型

## ゴール

このレッスンで掴む概念:

- **なぜ liquidation は `funding::Position` を再利用せず独自の `AccountSnapshot` を定義するか** — `Position` は `(account, size)` を運ぶ。Liquidation は `(account, size, avg_entry, collateral)` を要求する。2 つの crate、2 つの snapshot 型、cross-coupling なし。Bridge レイヤーがそれぞれを自分の台帳から組み立てる。
- **Funding と共有する「snapshot」の規律** — エンジンは呼び出し側が build した snapshot を consume する。エンジン自身は可変なアカウント state を所有しない。Proptest が determinism のバグを捕まえられる I/O-free な純粋さがそれを支える。
- **なぜ `CloseOrderSpec` は price フィールドを持たないか** — Liquidation は常に market で close する。エンジンは価格を選ばない。Bridge がこれを `clob::Action::SubmitMarket` に変換し、板は次に利用可能な価格で約定する。
- **なぜ `Side` と `Qty` は新しい liquidation-local 型ではなく `openhl_clob` から来るか** — matching engine が話すのと同じ概念。2 つの crate に並行する `Side` enum を 2 つ置くと、drift を待つ翻訳サーフェスができる。

確認:

```bash
cargo build -p openhl-liquidation
```

…がコンパイルされる。本レッスン後、`types` モジュールは完成する。

具体的な変更:

- **`src/types.rs`** — 既存の `MarginHealth` enum の下に `AccountSnapshot` と `CloseOrderSpec` 構造体を追記する。L1 や L2 で書いたものは触らない。
- **`src/lib.rs`** — `pub use types::{...}` re-export に `AccountSnapshot` と `CloseOrderSpec` を追加する。

L3 にもテストはない — 両方の新しい構造体は受動的なデータコンテナだ。L4 で `compute` モジュールを始め、最初の挙動テスト（`notional_value`）が来る。

## おさらい

L2 の後:
- `types.rs` には `MARGIN_SCALE` + `LiquidationParams`（L1）+ `MarginRatio` + `MarginHealth`（L2）がある。
- `lib.rs` は 4 つの名前を re-export している: `LiquidationParams`、`MarginHealth`、`MarginRatio`、`MARGIN_SCALE`。
- `cargo build -p openhl-liquidation` が warning ゼロで pass する。

L3 では 2 つの **I/O 型**を追加する: あらゆる margin 関数が consume する入力（`AccountSnapshot`）と、エンジンが bridge に渡す出力（`CloseOrderSpec`）。L3 の後、types モジュールは完成する — Course 10 の Module 1 が閉じる。

## 計画

2 つの編集、どちらも追記のみ:

1. **`crates/liquidation/src/types.rs` に `AccountSnapshot` を追記** — 4 フィールド、`Copy`-friendly、約定の積み重ねを通じて `avg_entry` を保つ呼び出し側の責務を doc コメントで明示。
2. **`CloseOrderSpec` をその下に追記** — 3 フィールド、price なし、消費者として bridge を doc コメントで指名。
3. **`crates/liquidation/src/lib.rs` を更新** — `pub use types::{...}` 行を拡張する。

> 🛑 **予測。** スクロール前に: liquidation はアカウントごとに unrealized PnL を計算する必要がある。その式は `(mark - entry) * size`。**`funding::Position` がくれない入力は何か、そしてなぜ funding はそれを必要としなかったのか?** ヒント: funding の式は `size * mark * rate` だ — 何が抜けているか見てみる。

（答え: **`avg_entry`（PnL の項を計算するため）と `collateral`（equity を計算するため）。** Funding の式に `entry` 係数はない — ポジションが開かれた場所に関係なく、現在の mark に rate を掛けてスケールするだけ。Funding はまた collateral を読まない。Funding が emit する settlement delta は bridge レイヤーで balance に適用され、bridge が自身の balance 台帳を持っている。Liquidation の仕事は collateral + unrealized PnL がしきい値を下回ったかを *測る* ことなので、両方を必要とする。違う仕事、違う snapshot。）

## 手を動かす walk-through

### Step 1: `src/types.rs` に `AccountSnapshot` を追記

`crates/liquidation/src/types.rs` を開く。`MarginHealth` enum を閉じる `}` の後に追記:

```rust
/// Snapshot of one account's perpetual-market state, assembled by the
/// bridge layer before invoking the liquidation engine. Same "snapshot"
/// model as `openhl_funding::Position`: the engine treats this as a
/// per-tick read-only view, never mutates it.
///
/// `avg_entry` is the volume-weighted average price at which the account
/// opened its current net position. The owning layer (vault / clearing)
/// is responsible for maintaining this across fills.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AccountSnapshot {
    pub account: AccountId,
    pub position_size: PositionSize,
    pub avg_entry: MarkPrice,
    pub collateral: Notional,
}
```

この 10 行で気づくべき 5 点:

1. **4 フィールド、すべて `Copy`。** `AccountId`（`u64`）、`PositionSize`（`i64`）、`MarkPrice`（`u64`）、`Notional`（`i64`）。スタックサイズ合計 32 バイト。エンジンはほとんどの呼び出しで snapshot を参照渡し（`&AccountSnapshot`）するが、`Copy` derive のおかげで、呼び出し側が誤って `&` 参照を落としても borrow checker と戦わずに済む。

2. **`avg_entry: MarkPrice`、新しい `EntryPrice` 型ではない。** ポジションが開かれた価格は、現在ポジションが測られている mark price と同じ unit-of-account に住む。別の `EntryPrice` newtype を定義すると、すべての PnL 計算サイトで変換が必要になり、意味的な利益は何もない。**2 つのフィールドが同じ物理量を測るなら、型を共有する。**

3. **`collateral: Notional` — signed。** Collateral は *預け入れ* 資金で慣例的に非負だが、`Notional`（signed）にしているのは `account_equity = collateral + unrealized_pnl` を signed sum として流す必要があるから。`collateral` を unsigned にすると、すべての equity 計算で `as i64` キャストが必要になる。**境界で変換し、計算は 1 つの signed 型で。**

4. **`pub` フィールド、コンストラクタ関数なし。** L1 の `LiquidationParams` と同じ慣例: 透明な構造体、カプセル化不変量なし。Bridge レイヤーは `AccountSnapshot { account: …, position_size: …, … }` を直接 build する。`AccountSnapshot::new()` がない理由は、コンストラクタが強制すべきものがないから。

5. **Doc コメントが呼び出し側の契約を明示する。** "*The owning layer (vault / clearing) is responsible for maintaining this across fills.*" この 1 文が `avg_entry` 不変量のすべて: liquidation は fill を track しない、entry を再計算しない、partial close を reconcile しない。それらの責務は 1 つ上のレイヤーに住む。**Crate doc は *この* crate が保証することを言う。呼び出し側に要求することは、型の doc コメントに書く。**

> 🛑 **やりがちな勘違い。** 「`AccountSnapshot` を `openhl-funding` に置いて、両 crate が同じ型を使えるようにしたほうがよいのでは?」 **funding は `avg_entry` も `collateral` も必要としないから — それを `funding::Position` に追加すれば funding snapshot が無駄に膨らみ、bridge が funding が無視するフィールドを populate しなければならなくなる。** 2 つの crate、2 つの snapshot 型が正しい形。Bridge が正典の account ledger を保持し、tick ごとに 2 つの異なる snapshot view を生成するのは安価。

### Step 2: `src/types.rs` に `CloseOrderSpec` を追記

`src/types.rs` の中で続けて。`AccountSnapshot` を閉じる `}` の後に追記:

```rust
/// Specification for a single liquidation close order, generated by the
/// engine and consumed by the bridge layer. The bridge encodes this as
/// `openhl_clob::Action::SubmitMarket` and routes it through the matching
/// engine.
///
/// Always a market order — liquidation accepts any available price.
/// Always the opposite side of the position: a long position closes via
/// `Side::Sell`, a short via `Side::Buy`. Quantity is the absolute value
/// of the position size.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CloseOrderSpec {
    pub account: AccountId,
    pub side: Side,
    pub qty: Qty,
}
```

気づくべき 3 点:

1. **`price` フィールドなし。** Liquidation は価格を選ばない。エンジンは market order の仕様を生成し、matching engine が板に存在する深さで約定する。Stage 10c で `AccountSnapshot` のスライスを走査し、`Liquidatable` または `Underwater` のアカウントごとに `CloseOrderSpec` を 1 つ emit する。どれも limit を持たない。

2. **`side: Side` は `openhl_clob::Side` を再利用する。** Matching engine は `Side::{Buy, Sell}` で話す。新しい `liquidation::Side` enum を定義して bridge で変換すると、drift しうる翻訳サーフェスを導入してしまう（一方の crate で 3 番目の side variant を足したが他方には足さなかった、など）。**1 つの enum、1 つの真実の源泉。**

3. **`qty: Qty` は `openhl_clob::Qty(u64)` を再利用する。** Doc コメントは「position size の絶対値」と言っている — `PositionSize` は `i64`（signed）だが、close する数量は常に正。変換（`Qty(position_size.0.unsigned_abs())`）は L7 の `compute::close_order_spec` で起きる。ここでは *出力型* が unsigned であることに commit するだけだ。

> 🛑 **予測。** スクロール前に: `CloseOrderSpec` は close が起きた *理由*（Liquidatable vs Underwater）を表す `Reason` フィールドを持たない。持つべきか? ヒント: 誰が spec を consume し、どんな情報を必要とするかを考える。

（答え: **No。** Bridge は spec を consume して 2 つのことをする: close order を submit し、（Underwater アカウントに対しては）insurance fund を credit する。エンジンは両方を signal する — Stage 10c の scanner は `CloseOrderSpec` を emit する *と同時に* Underwater だったアカウントに対して `InsuranceFundDelta` を emit する。Close spec に `Reason` フィールドを追加すると、spec と insurance-fund delta の間で signal が重複し、将来のリファクタリングが両者を乖離させうる。**同じ事実を 2 箇所に表現しない — 上流の出力を真実の源泉にし、下流の consumer は必要なものだけを運ぶ。**）

### Step 3: `src/lib.rs` を更新

`crates/liquidation/src/lib.rs` を開く。`pub use types::{...}` 行を拡張する。元:

```rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
```

更新後:

```rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

新しい名前が 2 つ追加された — `AccountSnapshot` と `CloseOrderSpec` — アルファベット順に挿入されている（だから `AccountSnapshot` が最初、その後 `CloseOrderSpec`、残りは同じ順序）。リストが ~5 項目を超えると行が複数行にわたる。次回保存時 rustfmt が 1 行 1 名前のブロックに整形する（追記を続ければ）。

### Step 4: コンパイル

```bash
cargo build -p openhl-liquidation
```

期待される出力:

```
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

Warning ゼロ、エラーゼロ。Liquidation crate の `types` モジュールが完成した。

エラーが出た場合に多い原因:

- **`error[E0432]: unresolved import 'openhl_clob::Qty'`** — `types.rs` の冒頭の import 行はすでに `Qty` を名指ししている（L1 の types.rs scaffold で追加済み）ので、これが fire するのは import を削った場合のみ。もし出たら、L1 時代の冒頭行は依然として `use openhl_clob::{AccountId, Qty, Side};` と `use openhl_funding::{MarkPrice, Notional, PositionSize};` であるはず — 同じ import が L2 と L3 の両方をカバーする。
- **`error: cannot find type 'Notional'`** — 同じ根本原因。`use openhl_funding::{…}` 行に `Notional` が含まれているか確認する。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **`AccountSnapshot` は liquidation-local、`openhl-funding` の共有型ではない。** 2 つの crate は仕事が違う — funding は連続的な rate 駆動のデルタを settle する、liquidation は離散的な margin イベントを classify する — snapshot 型を強制的に共有させると、両側で bridge のデータ配管が結合する。**関連はあるが必要なものが違う 2 つの crate は、2 つの snapshot 型に値する。**

2. **`CloseOrderSpec` は price を運ばない。** エンジンの責任は close するか *否か* を決めることであって、*いくらで* かではない。Bridge レイヤーが spec を market order に翻訳し、matching engine が存在する深さで約定する。**価格を選ぶメカニズムは、アクションを決める policy レイヤーの下に住む。**

3. **`Side` と `Qty` は `openhl_clob` から来る、並行する liquidation-local 型ではない。** 2 つの crate がメッセージを交換するとき、同じ語彙の型で話すべき。2 つの `Side` enum は境界で 2 つの `impl From` ブロックを意味し、永久に調整税がかかる。**境界の型は共有し、内部の型は特殊化する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L3 の後:
- **types.rs** は **Stage 10a の types.rs と byte-for-byte 完全一致**。Course 10 の Module 1 はこの types モジュールをそのまま ship する。
- **lib.rs** はまだ `pub mod compute;` と compute の re-export が欠けている。それらは L4–L7 で来る。

## よくある質問

**Q1: `AccountSnapshot` を position-type trait に対する generic にして、funding と liquidation が抽象的な snapshot を共有できないか?**

できるが時期尚早。両 crate はそれぞれ必要なフィールドが 1 ページに収まる。抽象的な `Snapshot<P: PositionLike>` trait を導入すると、bridge が操作する必要のない型機構が増える。**crate ごとに具体型を持ち、bridge が翻訳するほうが、読むのも refactor するのも安い。**

**Q2: なぜ `avg_entry` は専用の `EntryPrice` newtype ではなく `MarkPrice` を使うのか?**

ポジションが開かれた価格と、ポジションが現在測られている価格は、同じ単位だから — 同じスケール、同じ真実の源泉（慣例上、matching engine の last fill price）。`MarkPrice(u64)` と並行して `EntryPrice(u64)` を定義すると、すべての PnL サイトで変換が必要になる。**2 つの値が単位を共有するなら、型も共有する。**

**Q3: `collateral` は負になり得るか?**

エンジンの目線では: いいえ、*預けられた* collateral は常に非負。ただし `Notional` は signed なのは、(a) funding が settlement delta に使う型で、デルタは *負になり得る* から、(b) 中間 equity 計算 `collateral + unrealized_pnl` は signed 結果を生むから。`collateral` 自体を unsigned にすると、すべての equity サイトでキャストが必要になる。**上流は signed 演算、境界で範囲チェック。**

**Q4: `CloseOrderSpec` に上流の文脈用に `bridge_metadata: Bytes` フィールドを持たせるべきか?**

No — Stage 10c は `CloseOrderSpec` をエンベロープなしで直接 bridge に渡す。Close を trigger と関連付ける必要があるなら（監査ログ、telemetry）、bridge は spec の外側で `(snapshot.account, current_block_height)` を使ってそれをできる。**下流の機能のために上流の型を膨らませない。**

**Q5: なぜ両構造体が `Copy` なのか?**

安価で便利だから。`AccountSnapshot` は 32 バイト、`CloseOrderSpec` は 24 バイト — このサイズでは Copy は本質的にタダ。Copy がないと、2 つ目の参照が欲しいたびに呼び出し側が clone する必要がある。**小さな Plain-Old-Data 型は `Copy` にする。`Clone` に手を伸ばすのは所有権セマンティクスが本当に意味を持つときだけ。**

## 次のレッスン (L4)

L4 で `compute` モジュールが始まる。最初の 2 関数 — `notional_value` と `unrealized_pnl` — が liquidation crate の最初の挙動テストを稼ぐ。同じコードパスがロングとショート両方のポジションに対して正しい符号を生み出す signed-multiplication のトリックと、network-pathological な入力で i64 オーバーフローから乗算を守る i128 中間値の規律を見ていく。

````

---

## Seed-file slot

L3 は Module 1 の sortOrder 2 に入る:

```typescript
{
  title: 'レッスン 3 — AccountSnapshot + CloseOrderSpec — エンジンの入出力型',
  slug: 'openhl-liquidation-snapshot-spec-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 25,
  xpReward: 50,
  content: `# レッスン 3 — AccountSnapshot + CloseOrderSpec — エンジンの入出力型\n\n...`
},
```

## SHA pinning discipline

L3 は `22eedf9`（Stage 10a）を引用する。L3 の後、types.rs の答え合わせ diff は完全にクリーン — Stage 10a の types モジュールは L1+L2+L3 で生成されたものとちょうど同じ。

## 翻訳セルフレビュー（paste 前）

- **「avg_entry と collateral は `funding::Position` にない」予測コールアウト** がレッスンの教育的アンカー。これがないと読者は 4 フィールド形状を信仰で受け入れる。あると、その形状は funding の仕事（rate × notional を settle）と liquidation の仕事（equity / notional を classify）の違いから導出される。
- **「Reason フィールドなし」予測コールアウト** は実際の PR コメントを先回りしている。エンジニアは反射的に下流が context を欲しがるかもと考えてフィールドを足したがる。レッスンは逆を教える — 上流の出力構造でケース判別を表現し（Underwater アカウントには `InsuranceFundDelta`）、close-order spec は痩せたままにする。
- **L3 は types モジュールを閉じるレッスン。** 読者はエンジンが話すすべての型を見た。L4 以降はそれらの型に対する計算 — 概念的な負荷が「どんな形状か」から「どんな挙動か」に移る。L3/L4 の境目で読者に移行を感じてもらえるよう、その点を明示する価値がある。
- **L1、L2、L3 を通じて 3 つの design hill。** L1: `hyperliquid_default()` を `Default` impl より優先。L2: `MarginHealth` に `PartialOrd` なし。L3: 独自の snapshot 型、funding との共有なし。各レッスンが「自明な Rust 慣用句が常に正しいわけではない」という振り返りで終わる。
