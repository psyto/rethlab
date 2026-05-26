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

- **liquidation が `funding::Position` を再利用せず、独自の `AccountSnapshot` を定義する理由。** `Position` は `(account, size)` を運ぶが、liquidation は `(account, size, avg_entry, collateral)` を要求する。2 つの crate、2 つの snapshot 型、cross-coupling なし。Bridge レイヤーがそれぞれを自分の台帳から組み立てる。
- **funding と共有する「snapshot」の規律。** エンジンは呼び出し側が組み立てた snapshot を consume する。エンジン自身は可変なアカウント state を所有しない。proptest が determinism のバグを捕まえられるのは、この I/O-free な純粋さがあるからだ。
- **`CloseOrderSpec` に price フィールドを持たせない理由。** Liquidation は常に market で close する。エンジンは価格を選ばない。Bridge がこれを `clob::Action::SubmitMarket` に変換し、板が次に利用可能な価格で約定する。
- **`Side` と `Qty` を liquidation-local の新型ではなく `openhl_clob` から借りる理由。** matching engine が話すのと同じ概念だ。2 つの crate に並行する `Side` enum を 2 つ置けば、いずれ drift する翻訳サーフェスが生まれてしまう。

確認:

```bash
cargo build -p openhl-liquidation
```

…がコンパイルされる。本レッスン後、`types` モジュールは完成する。

具体的な変更:

- **`src/types.rs`** — 既存の `MarginHealth` enum の下に `AccountSnapshot` と `CloseOrderSpec` を追記する。L1 や L2 で書いた部分には触らない。
- **`src/lib.rs`** — `pub use types::{...}` 再エクスポートに `AccountSnapshot` と `CloseOrderSpec` を加える。

L3 にもテストはない。どちらの新しい構造体も受動的なデータコンテナだからだ。L4 で `compute` モジュールに着手し、そこで最初の挙動テスト（`notional_value`）が登場する。

## おさらい

L2 の後:
- `types.rs` には `MARGIN_SCALE` と `LiquidationParams`（L1）に加え、`MarginRatio` と `MarginHealth`（L2）が並んでいる。
- `lib.rs` は 4 つの名前 — `LiquidationParams`、`MarginHealth`、`MarginRatio`、`MARGIN_SCALE` — を再エクスポートしている。
- `cargo build -p openhl-liquidation` が warning ゼロで pass する。

L3 では 2 つの **I/O 型**を加える。あらゆる margin 関数が consume する入力 `AccountSnapshot` と、エンジンが bridge に渡す出力 `CloseOrderSpec` だ。L3 を終えると types モジュールが完成し、Course 10 の Module 1 が閉じる。

## 計画

編集は 2 ファイル分、いずれも追記のみ:

1. **`crates/liquidation/src/types.rs` に `AccountSnapshot` を追記。** 4 フィールド、`Copy`-friendly。約定が積み重なる中で `avg_entry` を保つ責務が呼び出し側にあることを、doc コメントで明示する。
2. **`CloseOrderSpec` をその下に追記。** 3 フィールド、price フィールドなし。doc コメントで bridge を消費者として指名する。
3. **`crates/liquidation/src/lib.rs` を更新。** `pub use types::{...}` 行を拡張する。

> 🛑 **予測。** スクロール前に: liquidation はアカウントごとに unrealized PnL を計算する必要がある。式は `(mark - entry) * size` だ。**`funding::Position` から得られない入力は何か、そしてなぜ funding ではそれが要らなかったのか?** ヒント: funding の式は `size * mark * rate`。ここから何が抜けているかを比べる。

（答え: **`avg_entry`（PnL の項を計算するため）と `collateral`（equity を計算するため）の 2 つだ。** Funding の式に `entry` 係数は出てこない — ポジションがどこで開かれたかに関係なく、現在の mark に rate を掛けてスケールするだけだ。Funding はまた collateral を読まない。Funding が emit する settlement delta は bridge レイヤーで balance に適用され、balance 台帳の管理は bridge 側に閉じている。Liquidation の仕事は、`collateral + unrealized PnL` がしきい値を下回ったかを *測る* ことなので、両方の値が手元に揃っている必要がある。仕事が違えば snapshot も違う。）

L3 で完成する `types` モジュールが、エンジン全体に対して **どんな入力を受け、どんな出力を返すか**を 1 枚で見ると、Module 1 (型) から Module 2 (純粋計算) へ向かう接続点がはっきりする:

```
                    [ 上流: bridge / clearing レイヤー (台帳の所有者) ]
                              │
                              │ tick ごとに各アカウントの
                              │ 台帳から snapshot を構築
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ 入力: AccountSnapshot { account, position_size, avg_entry,          │
   │                         collateral }                                │
   │   ※ 不変・read-only・Copy。L3 で確定。                                │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ ★ liquidation エンジン (Module 2-4 で実装するすべて)                 │
   │                                                                     │
   │   L4: notional_value / unrealized_pnl  (純粋計算)                    │
   │   L5: account_equity / margin_ratio   (純粋計算)                    │
   │   L6: margin_health                    (分類: 4 状態 enum)           │
   │   L7: close_order_spec                 (Liquidatable/Underwater 用)  │
   │   ↑↑ L1-L2 の定数・型 (MARGIN_SCALE, LiquidationParams,             │
   │                       MarginRatio, MarginHealth) も全レイヤーで参照 │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ 出力: CloseOrderSpec { account, side, qty }                         │
   │   ※ price なし (market order) / Liquidatable・Underwater アカウントに  │
   │      対してのみ emit。L3 で確定。                                    │
   │   さらに Module 3-4 で InsuranceFundDelta も並行して emit する        │
   └────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [ 下流: bridge → matching engine (CLOB) ]
                              ・close order を SubmitMarket に変換して submit
                              ・Underwater 分は insurance fund を credit/debit
```

ポイントは 2 つ: (a) **L3 で完成する 2 つの型 (`AccountSnapshot` 入力 / `CloseOrderSpec` 出力) が、エンジンと外界の唯一の接触面になる** — エンジン本体は L4 以降で書くが、その関数たちは型シグネチャの上ではすべて「AccountSnapshot を受けて何かを返す」「最終的に CloseOrderSpec を emit する」という形に揃う。(b) **入力 (snapshot) は不変、出力 (spec) も不変** — エンジンは台帳を更新しない、台帳の所有権は完全に bridge 側に残る。これが L0 で予告した「**リスク計算専用の不変な snapshot 型を分離して依存関係をクリーンに保つ**」の具体形だ。

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

この 10 行で気づきたい点が 5 つ:

1. **4 フィールド、すべて `Copy` に乗る。** `AccountId`（`u64`）、`PositionSize`（`i64`）、`MarkPrice`（`u64`）、`Notional`（`i64`）。スタックサイズ合計で 32 バイトだ。エンジンはほとんどの呼び出しで snapshot を参照渡し（`&AccountSnapshot`）するが、`Copy` を derive してあるおかげで、呼び出し側が誤って `&` を落としても borrow checker と戦わずに済む。

2. **`avg_entry` は `MarkPrice` 型で持つ。新しい `EntryPrice` 型は作らない。** ポジションが開かれた価格と、現在ポジションを測っている mark price は、同じ unit-of-account に住む。別途 `EntryPrice` newtype を作ると、すべての PnL 計算サイトで変換が必要になり、意味的な利益は何もない。**2 つのフィールドが同じ物理量を測るなら、型を共有する。**

3. **`collateral: Notional` は signed にしている。** Collateral は *預け入れ* 資金として慣例的に非負だが、`Notional`（signed）に揃えるのは `account_equity = collateral + unrealized_pnl` を signed sum のまま流したいからだ。`collateral` を unsigned にすると、すべての equity 計算で `as i64` キャストが入り込む。**境界で変換し、計算は 1 つの signed 型で揃える。これにより、キャスト漏れや signed / unsigned の混在に伴う静かなランタイムバグ (アンダーフロー、`as` キャストでの最上位ビット化け、減算で負になるはずの値が大きな正の数に化けるなど) を、コンパイル時の型不一致として根絶できる**。L4 の符号トリック (`(mark − entry) × size` を 4 象限すべて branchless で正しく計算する) は、まさにこの「計算経路をすべて signed で統一する」前提の上に成り立つ。

4. **`pub` フィールド、コンストラクタ関数なし。** L1 の `LiquidationParams` と同じ慣例だ。透明な構造体で、カプセル化不変量はない。Bridge レイヤーは `AccountSnapshot { account: …, position_size: …, … }` を直接組み立てる。`AccountSnapshot::new()` を置かないのは、コンストラクタが強制すべき不変量がないからだ。

5. **Doc コメントが呼び出し側の契約を明示する。** "*The owning layer (vault / clearing) is responsible for maintaining this across fills.*" この 1 文に `avg_entry` 不変量がまとまっている — liquidation は fill を track しないし、entry を再計算しないし、partial close を reconcile もしない。それらの責務は 1 つ上のレイヤーが負う。**Crate doc は *この* crate が保証することを書く。呼び出し側に要求することは、型の doc コメントに書く。**

> 🛑 **やりがちな勘違い。** 「`AccountSnapshot` を `openhl-funding` 側に置いて、両 crate が同じ型を使えるようにしたほうがよいのでは?」 **そうではない。funding は `avg_entry` も `collateral` も必要としない。** これらを `funding::Position` に足せば funding snapshot が無駄に膨らみ、bridge は funding が無視するフィールドにまで値を入れる羽目になる。2 つの crate、2 つの snapshot 型 — これが正しい形だ。Bridge が正典の account ledger を保持し、tick ごとに 2 つの異なる snapshot view を生成するコストは安い。

### Step 2: `src/types.rs` に `CloseOrderSpec` を追記

引き続き `src/types.rs` の中で、`AccountSnapshot` を閉じる `}` の後に追記する:

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

気づきたい点が 3 つ:

1. **`price` フィールドはない。** Liquidation は価格を選ばない。エンジンは market order の仕様を組み立てるところまでで、あとは matching engine が板に存在する深さで約定する。Stage 10c で `AccountSnapshot` のスライスを順に辿り、`Liquidatable` か `Underwater` のアカウントごとに `CloseOrderSpec` を 1 つずつ emit する流れになる。どれも limit を持たない。

2. **`side: Side` は `openhl_clob::Side` を再利用する。** Matching engine は `Side::{Buy, Sell}` で話す。`liquidation::Side` を別に定義して bridge で変換するようにすると、**将来的に型の乖離 (drift) を引き起こす原因となる、不要な翻訳レイヤー (`impl From` などの変換ロジック) を導入してしまう** — たとえば片方の crate に 3 番目の side variant (`Closing` など) を足したのにもう片方に足し忘れる、`Buy ↔ Sell` のマッピングを 1 箇所でうっかり反転させる、といった事故が静かに発生する。**1 つの enum、1 つの真実の源泉。** 境界を跨ぐメッセージの語彙 (`Side` / `Qty`) は crate 境界に関係なく共通化して、永続的な型変換処理のコスト (調整税) を払い続ける羽目にならないようにする。

3. **`qty: Qty` は `openhl_clob::Qty(u64)` を再利用する。** Doc コメントが言うとおり「position size の絶対値」だ。`PositionSize` は `i64`（signed）だが、close する数量は常に正の値になる。変換（`Qty(position_size.0.unsigned_abs())`）は L7 の `compute::close_order_spec` で行う。ここでは *出力型* が unsigned であることに commit するだけにとどめる。

> 🛑 **予測。** スクロール前に: `CloseOrderSpec` は、close が起きた *理由*（Liquidatable か Underwater か）を表す `Reason` フィールドを持っていない。これは持たせるべきか? ヒント: spec を consume するのは誰で、その消費者がどんな情報を必要とするかを考える。

（答え: **持たせない。** Bridge は spec を consume して 2 つのことをする — close order を submit すること、そして Underwater アカウントに対しては insurance fund を credit することだ。エンジンはどちらも signal する。Stage 10c の scanner は `CloseOrderSpec` を emit するのと同時に、Underwater だったアカウントに対して `InsuranceFundDelta` も emit する。`CloseOrderSpec` に `Reason` フィールドを足すと、spec と insurance-fund delta のあいだで signal が二重化され、将来のリファクタリングが両者を乖離させうる。**同じ事実を 2 箇所に書かない。上流の出力を真実の源泉として、下流の consumer は必要なものだけを運ぶ。**）

### Step 3: `src/lib.rs` を更新

`crates/liquidation/src/lib.rs` を開き、`pub use types::{...}` 行を拡張する。元:

```rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
```

更新後:

```rust
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

新しい名前が 2 つ加わった — `AccountSnapshot` と `CloseOrderSpec` だ。アルファベット順なので `AccountSnapshot` が先頭に来て、その次に `CloseOrderSpec`、残りはこれまでと同じ並びになる。項目数が 5 を超えたあたりから行が縦に展開し、次回保存時に rustfmt が 1 行 1 名前のブロックへ整形する（追記を続ければ、の話だ）。

### Step 4: コンパイル

```bash
cargo build -p openhl-liquidation
```

期待される出力:

```
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

Warning も error もゼロ。Liquidation crate の `types` モジュールはここで完成だ。

エラーが出た場合に多い原因:

- **`error[E0432]: unresolved import 'openhl_clob::Qty'`** — `types.rs` 冒頭の import 行はすでに `Qty` を名指しているはずだ（L1 の types.rs scaffold で加えてある）。発火するのは import を削ってしまった場合に限る。出たときは、L1 時点の冒頭行が依然として `use openhl_clob::{AccountId, Qty, Side};` と `use openhl_funding::{MarkPrice, Notional, PositionSize};` のままになっているか確認する — この import が L2 / L3 の両方をカバーする。
- **`error: cannot find type 'Notional'`** — 根本原因は同じだ。`use openhl_funding::{…}` 行に `Notional` が含まれているかを確認する。

## 設計の振り返り

このレッスンの load-bearing な決定は 3 つ:

1. **`AccountSnapshot` は liquidation-local に閉じる。`openhl-funding` と共有型にはしない。** 2 つの crate は仕事が違う — funding は連続的な rate 駆動のデルタを settle し、liquidation は離散的な margin イベントを classify する。snapshot 型を強制的に共有させると、両側で bridge のデータ配管まで結合してしまう。**関連はあるが必要なものが違う 2 つの crate は、2 つの snapshot 型に値する。**

2. **`CloseOrderSpec` は price を運ばない。** エンジンの責任は close するか *否か* を決めることに尽きる。*いくらで* close するかはエンジンの仕事ではない。Bridge レイヤーが spec を market order に翻訳し、matching engine が存在する深さで約定する。**価格を選ぶメカニズムは、アクションを決める policy レイヤーの下のレイヤーに住む。**

3. **`Side` と `Qty` は `openhl_clob` から借りる。並行する liquidation-local 型は作らない。** 2 つの crate がメッセージを交換するなら、語彙となる型は同じものを共有すべきだ。`Side` enum を 2 つ持つということは、境界で `impl From` ブロックを 2 つ抱えるということで、永続的に調整税を払い続ける羽目になる。**境界の型は共有し、内部の型だけを特殊化する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L3 の後:
- **types.rs** は **Stage 10a の types.rs と byte-for-byte で完全一致する**。Course 10 の Module 1 はこの types モジュールをそのまま ship する。
- **lib.rs** はまだ `pub mod compute;` と、compute まわりの再エクスポートが揃っていない。これらは L4-L7 で順に加える。

## よくある質問

**Q1: `AccountSnapshot` を position-type trait に対する generic にして、funding と liquidation が抽象的な snapshot を共有できないか?**

できる、ただし時期尚早だ。両 crate ともに、必要なフィールドが 1 ページに収まる規模に留まっている。抽象的な `Snapshot<P: PositionLike>` trait を導入すると、bridge が操作する必要のない型機構が増えてしまう。**crate ごとに具体型を持ち、bridge が翻訳するほうが、読むのも refactor するのも安く済む。**

**Q2: なぜ `avg_entry` は専用の `EntryPrice` newtype ではなく `MarkPrice` を使うのか?**

ポジションが開かれた価格と、現在ポジションを測っている価格は、同じ単位だからだ。スケールも、真実の源泉も同じ（慣例上、matching engine の last fill price）。`MarkPrice(u64)` と並行して `EntryPrice(u64)` を立てると、すべての PnL サイトで変換が要る。**2 つの値が単位を共有するなら、型も共有する。**

**Q3: `collateral` は負になり得るか?**

エンジンの目線では、ならない — *預けられた* collateral は常に非負だ。`Notional` を signed にしている理由は別にある。第 1 に、funding が settlement delta にこの型を使い、デルタは *負になり得る* こと。第 2 に、中間 equity 計算 `collateral + unrealized_pnl` の結果が signed になること。`collateral` 自体を unsigned にすると、すべての equity サイトでキャストが入ってくる。**上流は signed のまま演算し、範囲チェックは境界で行う。**

**Q4: `CloseOrderSpec` に上流の文脈用として `bridge_metadata: Bytes` フィールドを持たせるべきか?**

いいえ。Stage 10c は `CloseOrderSpec` をエンベロープなしでそのまま bridge に渡す。Close を trigger と関連付けたい局面（監査ログ、telemetry）でも、bridge は spec の外側で `(snapshot.account, current_block_height)` を使えば足りる。**下流の機能のために上流の型を膨らませない。**

**Q5: なぜ両構造体が `Copy` なのか?**

安価で便利だからだ。`AccountSnapshot` は 32 バイト、`CloseOrderSpec` は 24 バイトで、このサイズなら Copy は実質タダ。Copy が乗っていないと、2 つ目の参照が欲しいたびに呼び出し側で clone する。**小さな Plain-Old-Data 型は `Copy` にする。`Clone` に手を伸ばすのは、所有権セマンティクスが本当に意味を持つときだけだ。**

## 次のレッスン (L4)

L4 で `compute` モジュールが始まる。最初の 2 関数 — `notional_value` と `unrealized_pnl` — が、liquidation crate にとって最初の挙動テストを呼び込む。同じコードパスがロング・ショートいずれのポジションに対しても正しい符号を生み出す signed-multiplication のトリックを見ていく。さらに、network-pathological な入力に対して乗算を i64 オーバーフローから守るために i128 中間値を経由させる規律も改めて確認する。

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
