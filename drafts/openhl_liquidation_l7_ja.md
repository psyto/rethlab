# Building OpenHL Liquidation — L7 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

````markdown
## L7 — `openhl-liquidation-close-order-spec-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 7 — `close_order_spec` — Stage 10a の最後の関数

**Duration**: 20 分 · **XP**: 40

---

# レッスン 7 — `close_order_spec` — Stage 10a の最後の関数

## ゴール

このレッスンで掴む概念:

- **ポジションを close する基本ルール** — long は *売る* ことで close、short は *買う* ことで close。Side は常にポジション方向の反対 — エンジンは side を決めるのではなく、反転させる。
- **Public 境界での `unsigned_abs`** — L4 の規律（`i64` には `abs` ではなく `unsigned_abs`）が bridge と話す関数で現れる。出力 `Qty(u64)` は CLOB matching engine が期待する型 — エンジンは符号変換を自分の境界に押し付ける。
- **なぜ `close_order_spec` は flat ポジションをフィルタしないか** — flat ポジションは `qty == 0` の spec を生成する。Bridge が submit 前にフィルタする。`close_order_spec` を total かつ side-effect-free に保つことで、Stage 10c の multi-account scanner と compose しやすくする。
- **単一責任のスコープ** — `close_order_spec` は `MarkPrice` を受け取らない（market order は price を持たない）し、`LiquidationParams` も受け取らない（liquidate するかの決定は `margin_health`）。Snapshot 1 つ入、spec 1 つ出。

確認:

```bash
cargo test -p openhl-liquidation
```

…が 24 テスト pass する（L4-L6 から 21 + 3 つの close-side ケースのための新規テスト 3）。**Stage 10a が `22eedf9` に対して byte-for-byte 完成。**

具体的な変更:

- **`src/compute.rs`** — `margin_health` の後に `close_order_spec` を追記 + 既存のテストモジュールに unit test 3 個。
- **`src/lib.rs`** — compute の re-export を `close_order_spec` で拡張。

L7 は Stage 10a で最短のレッスン。関数自体は 11 行 — レッスンが存在する理由は、side-inversion ルールをロックし、pure-compute モジュールの完成をマークするため。

## おさらい

L6 の後:
- `compute.rs` には `notional_value`、`unrealized_pnl`、`account_equity`、`margin_ratio`、`margin_health` + `saturate_i128_to_i64` ヘルパー + 18 unit test + 3 proptest がある。
- `lib.rs` は compute 関数 6 個中 5 個を re-export している（`close_order_spec` 以外すべて）。
- `cargo test` が 21 テスト走らせ、すべて green。

L7 で Stage 10a を閉じる。本レッスン後、`22eedf9` に対する答え合わせ diff は `compute.rs` と `lib.rs` の両方で完全にクリーンになる。

## 計画

3 つの編集:

1. **`crates/liquidation/src/compute.rs` に `close_order_spec` を追記** — 11 行 + doc コメント。
2. **既存のテストモジュールに unit test 3 個追加** — long-closes-with-Sell、short-closes-with-Buy、flat-position-has-zero-qty。
3. **`crates/liquidation/src/lib.rs` を更新** — compute の re-export を拡張。

> 🛑 **予測。** スクロール前に: `position_size = 10` の long ポジションを force-close する必要がある。**エンジンはどの `Side` と `Qty` を emit するか?** 次に: `position_size = −10` の short — 同じ問い。

（答え: **Long: `Side::Sell`、`Qty(10)`。Short: `Side::Buy`、`Qty(10)`。** Long は売って close する: トレーダーは 10 ユニットを long として保有しているので、10 売って flat にする必要がある。Short は買って close する: トレーダーは 10 ユニットを short として持っているので、10 買って flat にする必要がある。Quantity は常にポジションの magnitude。符号は side にあって、qty にはない。**`Qty` が `u64` なのはまさに magnitude が符号を持たないから。**）

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

この 11 行の関数で気づくべき 5 点:

1. **Side は *常にポジション方向の反対*。** トレーダーは `size` ユニットを保有する（正 = long、負 = short）。Close するために、エンジンは反対 side の order を submit する: long は売って unwind、short は買って unwind。**Matching engine は close の *意図* を気にしない。Side の order が見えるだけ。「反対 side」ルールが、ポジション方向と order side の間の橋の全部。**

2. **`unsigned_abs()` が magnitude を `u64` として返す。** L4 と同じ規律が public 境界に適用される。`Qty` は `u64` をラップするので、magnitude が `Qty(abs_size)` に直接流れる、中間の `as u64` キャストなしで。**関数は符号変換を、ちょうど 1 度、符号付き position-size と符号なし order-quantity が出会う境界で行う。**

3. **`if snapshot.position_size.0 > 0` — strict greater-than。** Flat ポジション（`size == 0`）は `else` 分岐に落ちて `Side::Buy` を得る。Qty も 0 になるので無害 — spec は存在するが意味を持たない。**関数の中で flat path を special-case しない**。Bridge が submit 前に `qty == 0` の spec をフィルタする。

4. **`mark` なし、`params` なし。** `close_order_spec` は snapshot だけが要る。「Close する決定」は `margin_health` に住み、price discovery は matching engine で起きる。**各関数がちょうど 1 つの関心事を所有する。Bridge がそれらを compose する: スキャン → 分類 → close spec 生成 → submit。**

5. **`Option<CloseOrderSpec>` ではなく `CloseOrderSpec` を値で返す。** 関数は total — flat ポジション（`qty == 0`）でも常に spec を返す。代替案 — `Option` — はスキャン内のすべての flat アカウントに対して呼び出し側に `None` を扱わせる。close ステップに到達する頃にはそれらのアカウントはすでに事前にフィルタされているのに。**Total な関数は compose しやすい。Optional な関数はすべての呼び出し側に空ケースを扱わせる。**

> 🛑 **やりがちな勘違い。** 「`if size >= 0 { Sell } else { Buy }` ではダメか — そうすれば flat が Sell として扱われ、一部のテスト取引所がやっていることと同じになる」 **3 つの問題。** (1) Flat-as-Sell は挙動の選択で、pure compute ではなく bridge に属する。(2) 現在の `> 0` は flat ポジションが long でも short でもないことを正しく反映している。(3) `qty == 0 + Side::Sell` の本番セマンティクスは matching engine では未定義。Bridge はいずれにせよフィルタしなければならない。**呼び出し側に最もクリーンな契約を生む慣例を選ぶ — エッジケースを隠す慣例ではなく。**

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

気づくべき点:

1. **`close_long_with_sell` が 3 つの出力フィールドすべてを assert する。** Side、qty、account — すべての出力フィールドがロックされる。Bridge は 3 つすべてに依存する。3 つすべてをテストすることで、1 つを直して他を壊す部分的なリファクタリングから守られる。**出力型のテストでは、呼び出し側が読むすべてのフィールドを assert する。**

2. **`close_short_with_buy` は account の assert をスキップする。** Account フィールドは `close_long_with_sell` と同じ入力ソースから来る — long で動いたなら short でも動く。**直交する軸を 1 度カバーする — 以前のテストがすでにロックしたものを繰り返さない。**

3. **`close_flat_has_zero_qty` は、関数が flat ケースをフィルタしない *にもかかわらず* 存在する。** テストが契約を文書化する: 「flat ポジションは zero-qty spec を生むと約束する。呼び出し側はフィルタしなければならない。」将来のリファクタリングが誤って `close_order_spec` の中にフィルタを加えたら（`Default::default()` を返すか、flat で panic するか）、このテストが失敗する。**テストは文書化された契約を保つ — 「これは我々がしない、呼び出し側がする」と言うものを含む。**

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

新規 1 名 — `close_order_spec` — がアルファベット順に `account_equity` の後に挿入される。すべての 6 つの compute 関数が re-export された。

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

**24 tests passing。Stage 10a content 完成。** Liquidation crate の pure-compute モジュール — margin math + 分類 + close-order 生成 — があなたの workspace に入り、`22eedf9` に対する答え合わせ diff は完全にクリーン。

エラーが出た場合に多い原因:

- **`close_short_with_buy` が `Side::Sell` で失敗** — 誤って `if snapshot.position_size.0 >= 0` と書いた。Flat ポジションはここでは関係ないが、`>=` を使うと size = 0 の short（存在しない）が Sell に flip する — そして size = −10 のテストは `size > 0` を false と見るので失敗する。方向を再確認。
- **`close_flat_has_zero_qty` が関数の panic で失敗** — `unsigned_abs()` ではなく `.abs()` を追加した可能性。`i64(0).abs()` は OK だが、`i64(-10).abs() as u64` を書くと L4 の i64::MIN footgun のリスクがある。`unsigned_abs` で通す。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **Side はポジション方向の反対 — 他のケースなし。** Long → Sell、Short → Buy。関数は「曖昧」のための 3 番目のケースも「不明」のためのフォールバックも要らない。ポジションは符号を持つか flat。Spec は符号を反転するか、ゼロを運ぶ。**基本反転が「このポジションを close する」の正しい形。**

2. **`close_order_spec` は flat ポジションでも side-effect-free。** 関数の中でフィルタするのではなく zero-qty spec を返すことで、`close_order_spec` を total かつ compose しやすく保つ。Stage 10c の scanner は分岐なしに `for snapshot in snapshots { specs.push(close_order_spec(snapshot)); }` できる。Bridge が submit 時にフィルタする。**Pure 関数は返す。Impure な境界レイヤーがフィルタする。**

3. **関数は `mark` も `params` も受け取らない。** 各 compute 関数がちょうど 1 つの関心事を所有する: `margin_health` は close するか *否か* を決め、`close_order_spec` は *どう* するかを決める。混ぜると — 例: `params` を取って liquidation fee を qty に適用すると — 2 つの責任が結合する。Fee は Stage 10b（insurance fund）に属する、collateral と fee の数学が一緒に住む場所。**単一責任が bridge の composition path を明白にする。**

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

Stage 10a クレート全体があなたの workspace に入った。

## よくある質問

**Q1: `close_order_spec` は flat ポジションに対して `Option<CloseOrderSpec>` を返すべきか?**

返してもいいが摩擦を増やす。Flat ケースを気にしないすべての呼び出し側（ほとんど）が `.expect("non-flat position")` または `if let Some(spec) = ...` する必要が出る。Total な `CloseOrderSpec` を `qty == 0` で返し、フィルタを bridge に押し付けるのが common case には安価。**`Option` の規律は、空ケースが *最も一般的* で呼び出し側に処理を強制したいときに最適。ここでは空ケースが希少で、強制処理はオーバーヘッド。**

**Q2: なぜ `Side::Sell` 分岐で `size > 0`（strict）であって `size >= 0`（non-strict）ではないのか?**

Flat（`size == 0`）は long *でもなければ* short *でもない* — long/short の二分法の外側。「flat は long」または「flat は short」の慣例はどちらも arbitrary。我々は flat が `else` 分岐に静かに落ち、qty もどのみち 0 になる慣例を選んだ。どちらの選択も働く。規律は **一貫性を保ち、選択を文書化すること**。Doc は「flat → qty 0、呼び出し側がフィルタ」と言い、それは読者がコードに対して検証できる内容。

**Q3: `close_order_spec` を `AccountSnapshot` のメソッド（`snapshot.close_order_spec()`）にできないか?**

構文的にはイエス — `impl AccountSnapshot { pub fn close_order_spec(&self) -> CloseOrderSpec { ... } }`。そうしない理由は、`close_order_spec` 関数が他の margin-math 関数と一緒に `compute.rs` に住むから。関連コードとの co-location が receiver 型との co-location に勝つ。**`AccountSnapshot` はデータ運搬役（`types.rs` に住む）。Compute は `compute.rs` に住む。Free-function 形式がその分離を保つ。**

**Q4: `position_size = i64::MIN` の場合、`unsigned_abs` はそれを処理するか?**

イエス、設計通り。`i64::MIN.unsigned_abs() == 9_223_372_036_854_775_808u64`（`u64::MAX / 2 + 1`）。Signed の `i64::MIN.abs()` は overflow する（i64 には正の対応物がない）。`unsigned_abs` は magnitude を `u64` で返し、常に余裕がある。**これがちょうど L4 の規律: magnitude には `unsigned_abs`、値が `MIN` ではないと確信しているときだけ `abs`。**

**Q5: テスト fixture の `snapshot` 関数が `(size, entry, mark, collateral)` ではなく `(size, entry, collateral)` を取るのはなぜか — テスト対象の関数は snapshot を取り、通常 mark も必要なのに?**

`close_order_spec` は snapshot だけを取る — mark なし。L4 から共有される `snapshot` fixture は snapshot の 3 つの意味のあるフィールド（account はハードコード）を取り、mark を運ばない。Mark はテスト対象の関数に別の `MarkPrice(...)` 引数として渡される。**Fixture は *型* が必要とするものを構築する。テストは *呼び出し* が必要とするものを供給する。**

## 次のレッスン (L8) — Stage 10b が始まる

L8 で Stage 10b — insurance fund — が始まる。L7 で完成した pure-compute モジュールは *何が起きるべきか* のレイヤー。Stage 10b は *何が起きたかを記録する帳簿* を加える — fund の balance を track し、underwater liquidation からの不足を吸収し、solvent な close から liquidation fee を credit する `InsuranceFund` state machine。Stage 10b の後、エンジンは「このアカウントは Liquidatable」だけでなく「この close は fund に 1.5% を credit した」または「この close は fund から $400 を drain した」を知る。

**本レッスンドラフト時点で Stage 10b はまだ openhl に ship されていない** — L8 は openhl 側の実装が来たときに rethlab に着地する。

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
