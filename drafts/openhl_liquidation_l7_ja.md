# Building OpenHL Liquidation — L7 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

## L7 — `openhl-liquidation-close-order-spec-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 7 — `close_order_spec` — Stage 10a の最後の関数

**Duration**: 20 分 · **XP**: 40

---

````markdown
# レッスン 7 — `close_order_spec` — Stage 10a の最後の関数

## ゴール

このレッスンで掴む概念:

- **ポジションを close する基本ルール。** Long は *売って* close、short は *買って* close。Side は常にポジション方向の反対 — エンジンは side を決めるのではなく、ただ反転させるだけだ。
- **Public 境界での `unsigned_abs`。** L4 の規律（`i64` には `abs` ではなく `unsigned_abs`）が、bridge と会話する関数で表に出てくる。出力の `Qty(u64)` は CLOB matching engine が期待する型 — エンジンは符号変換を自分の境界に押し付ける。
- **`close_order_spec` が flat ポジションをフィルタしない理由。** Flat ポジションは `qty == 0` の spec を生成する。Bridge が submit 前にフィルタする。`close_order_spec` を total かつ side-effect-free に保つことで、Stage 10c の multi-account scanner と compose しやすくなる。
- **単一責任のスコープ。** `close_order_spec` は `MarkPrice` を受け取らない（market order は price を持たない）し、`LiquidationParams` も受け取らない（liquidate するか否かの判断は `margin_health` の仕事だ）。Snapshot を 1 つ入れて、spec を 1 つ出す。

確認:

```bash
cargo test -p openhl-liquidation
```

…で 24 テストが pass する（L4-L6 の 21 + close-side の 3 ケース用の新規テスト 3）。**Stage 10a が `22eedf9` に対して byte-for-byte で完成する。**

具体的な変更:

- **`src/compute.rs`。** `margin_health` の後に `close_order_spec` を追記し、既存のテストモジュールに unit test 3 個を加える。
- **`src/lib.rs`。** Compute の re-export を `close_order_spec` で拡張する。

L7 は Stage 10a で最短のレッスンだ。関数自体は 11 行 — このレッスンの存在理由は、side-inversion ルールをロックし、pure-compute モジュールの完成をマークすることにある。

## おさらい

L6 の後:
- `compute.rs` には `notional_value`、`unrealized_pnl`、`account_equity`、`margin_ratio`、`margin_health` + `saturate_i128_to_i64` ヘルパー + 18 unit test + 3 proptest が揃っている。
- `lib.rs` は compute 関数 6 個中 5 個を re-export 済み（`close_order_spec` だけが残っている）。
- `cargo test` は 21 テストを走らせ、すべて green。

L7 で Stage 10a を閉じる。本レッスンの後、`22eedf9` に対する答え合わせ diff は `compute.rs` と `lib.rs` の両方で完全にクリーンになる。

## 計画

編集は 3 つ:

1. **`crates/liquidation/src/compute.rs` に `close_order_spec` を追記。** 11 行 + doc コメント。
2. **既存のテストモジュールに unit test 3 個を追加。** long-closes-with-Sell、short-closes-with-Buy、flat-position-has-zero-qty。
3. **`crates/liquidation/src/lib.rs` を更新。** Compute の re-export を拡張する。

> 🛑 **予測。** スクロール前に考えてほしい。`position_size = 10` の long ポジションを force-close する必要がある。**エンジンはどんな `Side` と `Qty` を emit するか?** 次に `position_size = −10` の short について、同じ問いを考える。

（答え: **Long なら `Side::Sell`、`Qty(10)`。Short なら `Side::Buy`、`Qty(10)`。** Long は売って close する。トレーダーは 10 ユニットを long で保有しているので、10 売って flat にする必要がある。Short は買って close する。トレーダーは 10 ユニットを short で保有しているので、10 買って flat にする必要がある。Quantity は常にポジションの magnitude だ。符号は side のほうが運んでいて、qty には乗らない。**`Qty` が `u64` なのは、まさに magnitude が符号を持たないからだ。**）

`close_order_spec` 関数は本質的に「**ポジションの side をひっくり返すだけ**」という極めて単純なメカニズムを持つ。CLOB (matching engine) と liquidation engine の間の橋を 1 枚で見ると、なぜこの関数が 11 行で済むのか、なぜ side 決定や価格決定の責務を一切持たないのかが直感で見える:

```
   ┌─────────────────────────────┐                  ┌─────────────────────────────┐
   │ アカウントが保有中のポジション │                  │ close_order_spec が emit する  │
   │ (Account state)              │                  │ 反対方向の市場注文 (CloseOrder) │
   ├─────────────────────────────┤                  ├─────────────────────────────┤
   │  Long  size = +10             │   ──[反転]──►   │  Side::Sell    qty = 10        │
   │  (10 ユニットを保有中)        │                  │  → CLOB に「10 売り」を submit  │
   │                              │                  │  → 板の bid を順に食って fill   │
   │                              │                  │  → ポジションが flat に          │
   ├─────────────────────────────┤                  ├─────────────────────────────┤
   │  Short size = −10             │   ──[反転]──►   │  Side::Buy     qty = 10        │
   │  (10 ユニットを売り持ち中)    │                  │  → CLOB に「10 買い」を submit  │
   │                              │                  │  → 板の ask を順に食って fill   │
   │                              │                  │  → ポジションが flat に          │
   ├─────────────────────────────┤                  ├─────────────────────────────┤
   │  Flat  size =   0             │   ──[反転]──►   │  Side::Buy     qty =  0        │
   │  (保有なし、本来は呼ばれない) │                  │  → bridge がフィルタして submit せず │
   └─────────────────────────────┘                  └─────────────────────────────┘

   ※ `close_order_spec` が決めるのは「方向を反転」「magnitude を `unsigned_abs` で取り出す」の 2 つだけ。
     ・「liquidate するかどうか」の意思決定は L6 `margin_health` が完了させている。
     ・「いくらで close するか」の価格決定は matching engine (CLOB) の板が決める。
     ・「flat の spec を出さない」のフィルタは Bridge が submit 前に行う。
   各レイヤーがちょうど 1 つの関心事を持ち、それらが直列に compose されている。
```

ポイントは「**この関数の本質は side のインバージョン (反転) しかない**」こと。Long ↔ Sell、Short ↔ Buy という対応は CLOB の板を介して「相殺取引」を発行するための最も単純な変換であり、ここに `MarkPrice` や `LiquidationParams` を持ち込むと、価格発見や閾値判断の責務が混入してしまう。**「ポジションを close する」という行為そのものを、最も小さい形で表現する関数** — それが `close_order_spec` だ。

## 手を動かす walk-through

### Step 1: `src/compute.rs` に `close_order_spec` を追記

`crates/liquidation/src/compute.rs` を開く。`margin_health` の後、`#[cfg(test)]` ブロックの前に追記:

```rust
/// Generate the close-order spec for a liquidatable position.
///
/// Side is the opposite of the position direction (long → SELL, short →
/// BUY), quantity is the absolute position size. Always a market order
/// at the bridge layer — liquidation accepts any available price.
///
/// Flat positions produce a spec with `qty == 0`; callers should filter
/// these out before submitting, since the CLOB will reject a zero-qty
/// order. We don't filter here because liquidation engines typically scan
/// many accounts and a side-effect-free `close_order_spec` is easier to
/// compose.
#[must_use]
pub fn close_order_spec(snapshot: &AccountSnapshot) -> CloseOrderSpec {
    let abs_size = snapshot.position_size.0.unsigned_abs();
    let side = if snapshot.position_size.0 > 0 {
        Side::Sell
    } else {
        Side::Buy
    };
    CloseOrderSpec {
        account: snapshot.account,
        side,
        qty: Qty(abs_size),
    }
}
```

この 11 行の関数で押さえておく点が 5 つ:

1. **Side は *常にポジション方向の反対*。** トレーダーは `size` ユニットを保有している（正 = long、負 = short）。Close するために、エンジンは反対 side の order を submit する: long は売って unwind、short は買って unwind。**Matching engine は close の *意図* を気にしない。Side が乗った order が来た、と見えるだけだ。「反対 side」ルールが、ポジション方向と order side との間の橋を成立させている全部だ。**

2. **`unsigned_abs()` が magnitude を `u64` として返す。** L4 と同じ規律が public 境界に現れている。`Qty` は `u64` をラップしているので、magnitude は `Qty(abs_size)` にそのまま流れ込む。中間の `as u64` キャストはいらない。**関数は符号変換を、ちょうど 1 度、符号付き position-size と符号なし order-quantity が出会う境界で行う。**

3. **`if snapshot.position_size.0 > 0` — strict greater-than。** Flat ポジション（`size == 0`）は `else` 分岐に落ちて `Side::Buy` を受け取る。Qty も 0 になるので無害だ — spec は存在するものの、意味は持たない。**関数の中で flat path を special-case しない。** Bridge が submit 前に `qty == 0` の spec をフィルタする。

4. **`mark` なし、`params` なし。** `close_order_spec` に必要なのは snapshot だけだ。「Close するか否か」の判断は `margin_health` に住み、price discovery は matching engine で起きる。**各関数がちょうど 1 つの関心事を所有する。Bridge がそれらを compose する: スキャン → 分類 → close spec 生成 → submit、という流れになる。**

5. **`Option<CloseOrderSpec>` ではなく `CloseOrderSpec` を値で返す。** 関数は total（全域関数）だ — flat ポジション（`qty == 0`）でも常に spec を返す。代替案として `Option` を返すと、スキャン内のすべての flat アカウントに対して呼び出し側に `None` を扱わせる— close ステップに到達する頃にはそれらのアカウントはすでに前段でフィルタされているのに、だ。**Total な関数は圧倒的に compose（結合）しやすい。Optional な関数は、すべての呼び出し側に空ケースの処理（ボイラープレート）を強用する。** 具体的に効いてくるのは Stage 10c で実装する `LiquidationScanner` だ: 全アカウントのスナップショットを `filter_map` や `Option` chaining なしに**単なる `map` や平坦な `for` ループで均質に処理**できる。`close_order_spec` が total だからこそ、scanner は「`Liquidatable` か `Underwater` か」の分類フィルタを 1 箇所で書けば済み、close-spec 生成側で再度フィルタする必要がない。**エッジケース (flat → qty 0 の spec は submit しない) のフィルタリングは、入出力の最外殻である bridge レイヤーにのみ集約する** — これが crate を貫く規律になっている。

> 🛑 **やりがちな勘違い。** 「`if size >= 0 { Sell } else { Buy }` ではダメか — そうすれば flat が Sell として扱われ、一部のテスト取引所と挙動が揃う」 **問題が 3 つある。** (1) Flat-as-Sell は挙動の選択であり、pure compute ではなく bridge に属する判断だ。(2) 現在の `> 0` は「flat ポジションは long でも short でもない」という事実を正しく反映している。(3) `qty == 0 + Side::Sell` の本番セマンティクスは matching engine では未定義。Bridge はどのみちフィルタしなければならない。**呼び出し側に最もクリーンな契約を提供する慣例を選ぶ — エッジケースを隠す慣例ではなく。**

### Step 2: 3 つの unit test を追加

既存の `#[cfg(test)] mod tests { ... }` の中、`margin_health` テストの後に追加:

```rust
    // ─── close_order_spec ──────────────────────────────────────────

    #[test]
    fn close_long_with_sell() {
        let s = snapshot(10, 100, 0);
        let order = close_order_spec(&s);
        assert_eq!(order.side, Side::Sell);
        assert_eq!(order.qty, Qty(10));
        assert_eq!(order.account, AccountId(42));
    }

    #[test]
    fn close_short_with_buy() {
        let s = snapshot(-10, 100, 0);
        let order = close_order_spec(&s);
        assert_eq!(order.side, Side::Buy);
        assert_eq!(order.qty, Qty(10));
    }

    #[test]
    fn close_flat_has_zero_qty() {
        // Flat position generates a zero-qty spec; callers must filter.
        let s = snapshot(0, 100, 1_000);
        let order = close_order_spec(&s);
        assert_eq!(order.qty, Qty(0));
    }
```

押さえておく点:

1. **`close_long_with_sell` は 3 つの出力フィールドすべてを assert する。** Side、qty、account — すべての出力フィールドをロックする。Bridge は 3 つすべてに依存しているからだ。3 つをまとめてテストすることで、「1 つを直したつもりで他を壊した」という部分的なリファクタリングから守られる。**出力型のテストでは、呼び出し側が読むすべてのフィールドを assert する。**

2. **`close_short_with_buy` は account の assert をスキップする。** Account フィールドは `close_long_with_sell` と同じ入力経路で来る — long で動いたなら short でも動く。**直交する軸を 1 度だけカバーし、以前のテストがすでにロックしたものを繰り返さない。**

3. **`close_flat_has_zero_qty` は、関数が flat ケースをフィルタしない *にもかかわらず* 存在する。** これは契約を文書化するためのテストだ: 「flat ポジションは zero-qty spec を生むと約束する。呼び出し側はそれをフィルタしなければならない」。将来のリファクタリングが誤って `close_order_spec` 内にフィルタを足したら（`Default::default()` を返したり、flat で panic したり）、このテストが失敗する。**テストは文書化された契約を保つ。「これは我々ではやらず、呼び出し側にやらせる」という契約も含めて。**

### Step 3: `src/lib.rs` を更新

`crates/liquidation/src/lib.rs` を開く。Compute の re-export を拡張する。元:

```rust
pub use compute::{
    account_equity, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
```

更新後:

```rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
```

新規 1 名 — `close_order_spec` — を、アルファベット順で `account_equity` の直後に挿入する。これで 6 つの compute 関数すべてが re-export された。

### Step 4: テストを走らせる

```bash
cargo test -p openhl-liquidation
```

期待される出力:

```
running 24 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
test compute::tests::close_short_with_buy ... ok
test compute::tests::equity_can_go_negative ... ok
test compute::tests::equity_collateral_plus_pnl ... ok
test compute::tests::health_at_risk ... ok
test compute::tests::health_boundary_at_maintenance ... ok
test compute::tests::health_liquidatable ... ok
test compute::tests::health_safe ... ok
test compute::tests::health_underwater ... ok
test compute::tests::notional_flat_is_zero ... ok
test compute::tests::notional_long ... ok
test compute::tests::notional_short_uses_abs ... ok
test compute::tests::pnl_flat_is_zero ... ok
test compute::tests::pnl_long_loss ... ok
test compute::tests::pnl_long_profit ... ok
test compute::tests::pnl_short_loss ... ok
test compute::tests::pnl_short_profit ... ok
test compute::tests::ratio_can_be_negative ... ok
test compute::tests::ratio_exactly_ten_percent ... ok
test compute::tests::ratio_flat_returns_max ... ok
test compute::tests::long_ratio_monotonic_in_mark_when_levered ... ok
test compute::tests::margin_ratio_deterministic ... ok
test compute::tests::short_ratio_monotonic_in_mark ... ok

test result: ok. 24 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**24 テスト pass、Stage 10a の内容が完成。** Liquidation crate の pure-compute モジュール — margin math + 分類 + close-order 生成 — があなたの workspace に揃い、`22eedf9` に対する答え合わせ diff は完全にクリーンになる。

エラー時にありがちなパターン:

- **`close_short_with_buy` が `Side::Sell` で失敗。** 誤って `if snapshot.position_size.0 >= 0` と書いてしまっている。Flat ポジションはこのテストには関係ないが、`>=` だと size = 0 の short（存在しない概念）が Sell に flip してしまう — そして size = −10 のテストは `size > 0` が false なので失敗する。方向を再確認する。
- **`close_flat_has_zero_qty` が関数の panic で失敗。** `unsigned_abs()` ではなく `.abs()` を入れてしまっている可能性がある。`i64(0).abs()` は OK だが、`i64(-10).abs() as u64` のパターンは L4 で挙げた `i64::MIN` footgun のリスクを抱える。`unsigned_abs` で通す。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **Side はポジション方向の反対 — それ以外のケースはない。** Long → Sell、Short → Buy。関数は「曖昧なケース」のための 3 つ目の分岐も、「不明なケース」のためのフォールバックも要らない。ポジションは符号を持つか、さもなくば flat。Spec は符号を反転するか、ゼロを運ぶ。**ポジション方向の単純な反転 (インバージョン) こそが、「ポジションをクローズ (清算) する」という行為を最もシンプルかつ正確に表現したコードである。**

2. **`close_order_spec` は flat ポジションに対しても side-effect-free。** 関数内でフィルタする代わりに zero-qty spec を返すことで、`close_order_spec` を total に、かつ compose しやすく保てる。Stage 10c の scanner は分岐なしで `for snapshot in snapshots { specs.push(close_order_spec(snapshot)); }` と書ける。Bridge が submit 時にフィルタする。**Pure 関数は返す。Impure な境界レイヤーがフィルタする。**

3. **関数は `mark` も `params` も受け取らない。** 各 compute 関数がちょうど 1 つの関心事を所有する: `margin_health` は close するか *否か* を決め、`close_order_spec` は *どう* close するかを決める。これらを混ぜると — 例えば `params` を取って liquidation fee を qty に適用すると — 2 つの責任が結合してしまう。Fee は Stage 10b（insurance fund）に属する — collateral と fee の数学が一緒に住む場所だ。**単一責任が、bridge の composition path を明白にする。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/compute.rs ./crates/liquidation/src/compute.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L7 の後:
- **compute.rs** は Stage 10a の `compute.rs` と **byte-for-byte 一致**。
- **lib.rs** は Stage 10a の `lib.rs` と **byte-for-byte 一致**。
- **Cargo.toml** は L1 以来一致している。

Stage 10a クレートのすべてがあなたの workspace に揃った。

## よくある質問

**Q1: `close_order_spec` は flat ポジションに対して `Option<CloseOrderSpec>` を返すべきか?**

返してもいいが、摩擦が増える。Flat ケースを気にしない呼び出し側（実際にはほとんどがそう）は、いちいち `.expect("non-flat position")` や `if let Some(spec) = ...` を書くハメになる。Total な `CloseOrderSpec` を `qty == 0` で返し、フィルタを bridge に押し付けるほうが、common case には安く済む。**`Option` の規律は、空ケースが *最も一般的* で、呼び出し側に処理を強要したいときに最適だ。ここでは空ケースが希少で、強要は単なるオーバーヘッドにしかならない。**

**Q2: なぜ `Side::Sell` 分岐で `size > 0`（strict）であって `size >= 0`（non-strict）ではないのか?**

Flat（`size == 0`）は long *でもなく* short *でもない* — long/short の二分法の外側にある。「flat は long」も「flat は short」も、どちらも**恣意的な (好みの分かれる) 慣例にすぎない**。ここでは flat が `else` 分岐に静かに落ち、qty もどのみち 0 になる、という慣例を選んだ。どちらの選択も動く。規律は **一貫性を保ち、選択を文書化すること** だ。Doc には「flat → qty 0、呼び出し側がフィルタ」と書いてあり、読者はそれをコードに対して検証できる。

**Q3: `close_order_spec` を `AccountSnapshot` のメソッド（`snapshot.close_order_spec()`）にできないか?**

構文的にはイエスだ — `impl AccountSnapshot { pub fn close_order_spec(&self) -> CloseOrderSpec { ... } }` で書ける。そうしない理由は、`close_order_spec` 関数を他の margin-math 関数と並べて `compute.rs` に住まわせたいからだ。「関連コードとの co-location」が「receiver 型との co-location」に勝つ、という判断。**`AccountSnapshot` はデータ運搬役（`types.rs` に住む）、compute は `compute.rs` に住む。Free-function 形式が、この分離を保ってくれる。**

**Q4: `position_size = i64::MIN` の場合、`unsigned_abs` はそれを処理するか?**

イエス、設計どおりだ。`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808u64`（`u64::MAX / 2 + 1`）になる。Signed の `i64::MIN.abs()` はオーバーフローする（i64 には正の対応物が表現できない）。`unsigned_abs` は magnitude を `u64` で返すので、常に余裕がある。**これがそのまま L4 の規律だ: magnitude には `unsigned_abs`、`abs` を使ってよいのは値が `MIN` ではないと確信できるときだけ。**

**Q5: テスト fixture の `snapshot` 関数が `(size, entry, mark, collateral)` ではなく `(size, entry, collateral)` を取るのはなぜか — テスト対象の関数は snapshot を取り、通常 mark も必要なのに?**

`close_order_spec` は snapshot しか取らない — mark を要求しない。L4 から共有してきた `snapshot` fixture は、snapshot のうち意味のある 3 フィールド（account はハードコード）だけを取り、mark は運ばない。Mark は、テスト対象の関数へ別途 `MarkPrice(...)` 引数として渡される。**Fixture は *型* が要求するものを構築する。テストは *呼び出し* が要求するものを供給する。**

## 次のレッスン (L8) — Stage 10b が始まる

L8 で Stage 10b — insurance fund — が始まる。L7 で完成した pure-compute モジュールが *何が起きるべきか* のレイヤーだとすると、Stage 10b は *何が起きたかを記録する帳簿* を足すレイヤーだ。Fund の balance を track し、underwater liquidation からの不足を吸収し、solvent な close から liquidation fee を credit する `InsuranceFund` state machine が入る。Stage 10b の後、エンジンは「このアカウントは Liquidatable」だけでなく「この close は fund に 1.5% を credit した」あるいは「この close は fund から $400 を drain した」も知る。

**本レッスンのドラフト時点で、Stage 10b はまだ openhl に ship されていない。** L8 は、openhl 側の実装が来たタイミングで rethlab に着地する。

````

---

## Seed-file slot

L7 は Module 2 の sortOrder 3 に入る:

```typescript
{
  title: 'レッスン 7 — close_order_spec — Stage 10a の最後の関数',
  slug: 'openhl-liquidation-close-order-spec-ja',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 20,
  xpReward: 40,
  content: `# レッスン 7 — close_order_spec — Stage 10a の最後の関数\n\n...`
},
```

## SHA pinning discipline

L7 は `22eedf9`（Stage 10a）を引用する。L7 後、`22eedf9` に対する答え合わせ diff は `crates/liquidation/src/` の両ファイルで完全にクリーン。

## 翻訳セルフレビュー（paste 前）

- **L7 は意図的に短い。** L7 までに読者は規律を内面化している（i128 中間値、saturating 演算、unsigned_abs、proptest、prop_assume、単一責任の composition）。関数は小さい。レッスンが存在するのは、L4 の `unsigned_abs` を public 境界に適用し、モジュールを閉じるため。
- **Step 4 末尾の「Stage 10a が完成」のマーカー** が load-bearing。読者はマイルストーンに到達したことを知る必要がある — 満足感のためでも、後続レッスン（L8+）が ship されていない openhl 側のサブステージに依存することのためでも。コースは「完成したものを完成させ、次の openhl ステージのために一時停止する」状態にある。
- **L7 の Q5 fixture 形状について** は、単独では細かい UX 詳細に読めるが累積する: それに気づく読者は、他の場所での類似 fixture 判断のフレーミングを持つ。
- **「次のレッスン」preview が L8 がまだ存在しないことを名指しする。** Honest scoping — L0 の「最終的に持たないもの」と同じ規律。読者はコースの形状を見て、次のバッチを期待するタイミングを知る。
