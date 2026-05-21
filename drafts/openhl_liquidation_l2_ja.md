# Building OpenHL Liquidation — L2 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

````markdown
## L2 — `openhl-liquidation-margin-types-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 2 — `MarginRatio` + `MarginHealth` — エンジンが返す分類型

**Duration**: 25 分 · **XP**: 50

---

# レッスン 2 — `MarginRatio` + `MarginHealth` — エンジンが返す分類型

## ゴール

このレッスンで掴む概念:

- **なぜ `MarginRatio` は `type` alias ではなく newtype か** — newtype は「bps スケールの ratio を期待しているところに生の i64 を渡した」というバグをコンパイル時に捕まえる。Funding の `MarkPrice(pub u64)` vs `u64` と同じ規律。
- **なぜ `MarginHealth` がちょうど 4 variants か** — `Safe`、`AtRisk`、`Liquidatable`、`Underwater`。それぞれが異なるエンジン動作を許可する。どれを潰してもエンジンの他の部分が必要とする情報が失われる。
- **各 variant がエンジンの残りに対して何を許可するか** — 頭に入れておける小さな decision matrix。
- **なぜ enum に `PartialOrd` / `Ord` を *derive しない* か** — variants は自然に worsening order を成すが、`health > Safe` のような順序比較は明示的な `matches!` パターンに比べてコード臭がする。

確認:

```bash
cargo build -p openhl-liquidation
```

…がコンパイルされる。

具体的な変更:

- **`src/types.rs`** — 既存の `MARGIN_SCALE` 定数 + `LiquidationParams` 構造体の下に、`MARGIN_SCALE` スケールの `MarginRatio` newtype と `MarginHealth` enum を追加する。L1 で書いたものは触らない。
- **`src/lib.rs`** — 既存の `pub use types::{...}` re-export に `MarginRatio` と `MarginHealth` を追加する。

L2 にもテストはない — `MarginRatio` と `MarginHealth` は受動的なデータ型だ。L3 で `AccountSnapshot` + `CloseOrderSpec` を追加して types モジュールを閉じる（こちらもテストなし）。最初の挙動テストは L4 の `notional_value` で来る。

## おさらい

L1 の後:
- クレートには `MARGIN_SCALE`（10⁴）と `hyperliquid_default()` を持つ `LiquidationParams` がある。
- `lib.rs` は両方を `types` から re-export している。
- `cargo build -p openhl-liquidation` が pass する。`MarginHealth` への rustdoc warning が 1 つ残っている（この時点ではまだ未解決）。

L2 ではエンジンの残り部分が話す 2 つの分類型を追加する。L4 以降、`margin_ratio` は `MarginRatio` を返し、`margin_health` は `MarginHealth` を返す。

## 計画

2 つの編集、両方とも小さい:

1. **`crates/liquidation/src/types.rs` の末尾に追記** — `MARGIN_SCALE` 基準の docs を伴う `MarginRatio(pub i64)` newtype と、4 variants + variant ごとの authorization 意味を説明する doc コメントを持つ `MarginHealth` enum。
2. **`crates/liquidation/src/lib.rs` を更新** — `pub use types::{...}` 行を 2 つの新しい名前を含むよう拡張する。

> 🛑 **予測。** スクロール前に: `MarginHealth` は enum になる予定。何個の variants が必要か? ヒント: エンジンは各アカウントについて 3 つの判断を下さなければならない — (a) アカウントは新しいリスクを取れるか? (b) エンジンはポジションを force-close すべきか? (c) close するだけで不足分をカバーできるか、それとも insurance fund が介入する必要があるか?

（答え: **3 つの問い → 4 variants。** `Safe` = (a) yes。`AtRisk` = (a) no、(b) no。`Liquidatable` = (a) no、(b) yes、(c) yes（close だけで足りる）。`Underwater` = (a) no、(b) yes、(c) no（insurance fund が不足分を吸収）。3-variant enum（Safe/AtRisk/Liquidatable）は Liquidatable と Underwater を潰してしまい、「insurance fund が関与するか?」の信号を失う。エンジンはそれを再計算しなくてよい — variant にすでに反映されているから。）

## 手を動かす walk-through

### Step 1: `src/types.rs` に追記

`crates/liquidation/src/types.rs` を開く。`LiquidationParams` の impl ブロックを閉じる `}` の後に追記:

```rust
/// Account margin ratio = `equity / notional`, scaled by [`MARGIN_SCALE`].
///
/// Sign: usually non-negative; can be negative when the account is
/// "underwater" — accumulated losses have driven equity below zero, and
/// liquidating the position alone cannot cover the deficit. The insurance
/// fund absorbs that shortfall (Stage 10b).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct MarginRatio(pub i64);

/// Margin health classification given the account's current margin ratio
/// and the network's params. Four states, in decreasing health order.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum MarginHealth {
    /// Margin ratio ≥ initial margin requirement. Healthy: the account
    /// can open new positions or increase existing ones.
    Safe,
    /// Margin ratio ∈ [maintenance, initial). Allowed to hold existing
    /// positions but not to add risk. Production UIs typically warn the
    /// user.
    AtRisk,
    /// Margin ratio < maintenance, equity still ≥ 0. The engine should
    /// liquidate the position at market; the account's remaining equity
    /// (after the liquidation fee) returns to the account.
    Liquidatable,
    /// Margin ratio < 0 (equity is negative). Closing the position at
    /// any price won't fully cover losses. The insurance fund absorbs
    /// the shortfall — handled in Stage 10b.
    Underwater,
}
```

この 25 行で気づくべき 5 点:

1. **`MarginRatio(pub i64)` は newtype。** `type MarginRatio = i64` の alias ではない。Newtype は型チェッカーに足場を与える: `MarginRatio` を取る関数を、balance や account ID、`MarkPrice` を意図した生の `i64` 値で呼び出すことができなくなる。`pub i64` フィールドは、呼び出し側が `MarginRatio(1000)` で構築し、`ratio.0` で読めることを意味する — 守るべきカプセル化不変量はない。

2. **`MarginRatio` は多くの trait を derive している — `Default`、`PartialOrd`、`Ord`、`Hash`。** これらの default は engine が要求しているわけではないが、下流のコード（telemetry、Stage 10c の worst-health 順 scanner、ダッシュボード）が `MarginRatio` を他の比較可能な値型と同じように扱えるようにする。`MarginRatio::default()` は `MarginRatio(0)` で、意味的には「ratio 未計算」または「ゼロ初期化済み」。Engine 自身は `default()` を読まない。常に snapshot から計算する。

3. **`MarginHealth` は `PartialOrd` / `Ord` を derive *していない*。** variants は自然に順序付けされる（Safe < AtRisk < Liquidatable < Underwater が worsening 方向）が、enum での順序比較はコード臭がする。`if health > MarginHealth::AtRisk` より `if matches!(health, MarginHealth::Liquidatable | MarginHealth::Underwater)` のほうが明確。コンパイラが明示的なパターンを強制し、将来の保守者は分岐がどの variants をカバーするかを正確に見られる。

4. **Variant ごとの doc コメントは *authorization* を説明する、数学ではなく。** 「Margin ratio < maintenance」は variant が発火するタイミングを示すが、コメントはエンジンが応答してすることも書いている（「ポジションを market で liquidate すべき」）。ここの doc コメントは「Liquidatable がシステムの残り部分にとって何を意味するか」の正式な参照になる。

5. **Variant の順序は worsening health に対応している。** ソースでの並びは Safe → AtRisk → Liquidatable → Underwater の順。これはコンパイラにとって load-bearing ではない — Rust の enum は derive したもの以外に固有の順序を持たない — が、網羅的な `match` を読むときに自然な順序（最良ケース最初、最悪ケース最後）と一致する。

> 🛑 **やりがちな勘違い。** 「`MarginHealth` は `bool` でよいのでは — liquidatable か否か?」 **だめ、エンジンは 1 つではなく 3 つの下流判断を要求するから。** `bool` は (a)「新しいポジションを開けるか?」と (c)「insurance fund が関与するか?」を 1 ビットに潰す。後でこれを直すコストは、`bool` を返していたすべての呼び出しサイトを巡って型を変えること — 今正しくするコストは余計な variants 2 つだけ。

### Step 2: `src/lib.rs` を更新

`crates/liquidation/src/lib.rs` を開く。`pub use types::{...}` 行を拡張する。元:

```rust
pub use types::{LiquidationParams, MARGIN_SCALE};
```

更新後:

```rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
```

これが `lib.rs` の全変更 — クレートルートで public になる新しい名前が 3 つ、アルファベット順。定数は慣例的に末尾なので `MARGIN_SCALE` は最後のまま。

L1 で出ていた `[`MarginHealth`]` の rustdoc warning がここで解決する — 型が存在するようになったから。

### Step 3: コンパイル

```bash
cargo build -p openhl-liquidation
```

期待される出力:

```
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

Warning ゼロ。L1 の `MarginHealth` への rustdoc warning も消える。

エラーが出た場合に多い原因:

- **`error[E0432]: unresolved import 'crate::types::MarginRatio'`** — `pub use` 行の typo（例: `MarignRatio`）。型名を一字一句一致させる。
- **`error: ambiguous re-export`** — 既存の `pub use` を拡張せずに、誤って下に 2 行目を足した。re-export はすべて 1 つの `pub use types::{...}` ブロックに収める。Formatter もこの形を期待する。

## 設計の振り返り

このレッスンの load-bearing な決定が 3 つ:

1. **`MarginRatio(pub i64)` newtype、`type MarginRatio = i64` ではない。** Alias はゼロコストだがゼロセーフティ: コンパイラは同じ型として扱う。Newtype はランタイム上もゼロコスト（単一フィールド構造体はフィールドと同じレイアウト）だが、コンパイラが強制する本物の区別を生む。**値が「このビットパターンの整数」を超えた意味を運ぶときは、必ず newtype を使う。**

2. **`MarginHealth` が 4 variants なのは、エンジンが下流で 3 つの判断をするから。** 各 variant がそれら 3 つの判断のユニークな組み合わせにきれいに対応する。5 番目の variant（「ImminentlyLiquidatable」?「RecentlyClosed」?）は 4 番目の判断を必要とする。それが現れるまで、4 が正しい数。**Enum のカーディナリティを、それが許可する action のカーディナリティに合わせる。**

3. **`MarginHealth` に `PartialOrd` なし。** Variants は自然に順序付けされるが、enum での順序比較は具体性を失う（`health > AtRisk` は *どの* 「AtRisk より悪い」か言わない — `Liquidatable` か `Underwater` か?）。明示的な `matches!` パターンはすべての分岐に対象 variants を綴ることを強制し、`rustc -W non_exhaustive_omitted_patterns` が忘れたケースを捕まえる。**比較可能な enum は通常コード臭。まず `matches!` に手を伸ばす。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L2 の後:
- **types.rs** は Stage 10a の types.rs の 1 行目から `MarginHealth::Underwater` までと一致する — L1 で書いた `MARGIN_SCALE` + `LiquidationParams` に新しい `MarginRatio` + `MarginHealth` を加えたもの。次の 2 型（`AccountSnapshot`、`CloseOrderSpec`）は L3。
- **lib.rs** は Stage 10a の lib.rs から `compute` モジュールと 6 つの追加 re-export を除いたものと一致する — それらは L4–L7 で来る。

## よくある質問

**Q1: なぜ `MarginRatio` は `Display` を実装しないのか?**

実装してもよい。値はただ bps 単位の i64 だから。実装しない理由は、production のコードパスのどこも `MarginRatio` をエンドユーザー向け表示用に直接フォーマットしないから — bridge レイヤーが `.0` を取り出し、既知のスケールで render する（`"{}%"`、`ratio.0 / 100`）。`Display` を追加すると、呼び出し側が `MarginRatio` を生の整数としてログに出すよう誘ってしまい、bps スケールが見えなくなる。**Trait は必要とするレイヤーで実装する。**

**Q2: `MarginHealth` を `u8` にしてメモリを節約できないか?**

Payload なしの 4 variants に対する Rust の enum レイアウトはすでに `u8` に収まる — `size_of::<MarginHealth>() == 1`。コンパイラが最小の discriminant を選ぶ。生の `u8` に切り替えると、名前付き variants と `match` の exhaustiveness check を失い、何も得られない。

**Q3: Variant に payload を持たせるべきか（例: `AtRisk { headroom_bps: u32 }`）?**

魅力的だが時期尚早。下流の consumer（Stage 10c scanner、ダッシュボード）は必要なものを背後の margin_ratio から再導出する。Variant payload は構築のオーバーヘッドを増やし、`match` の使い勝手を複雑にする。**すべての consumer が payload から利益を得るのでない限り、enum は payload なしに保つ。**

**Q4: `Liquidatable` が「close + 場合によって deficit absorb」を含意できるなら、なぜ `Underwater` を別 variant にするのか?**

bridge が両ケースで *別の挙動* をする必要があるから。`Liquidatable` のアカウントは close order を 1 つ生成し、engine は fee と残額を通常通り settle する。`Underwater` のアカウントは close order に加えて、bridge が atomic に適用しなければならない credit-to-insurance-fund エントリを生成する。Variants を分離することで、ケースの違いを型レベルに押し上げ、網羅的な `match` がそれを捕まえる。マージすると、ケース判別が bridge 内のランタイム分岐に押し下げられ、見落としやすくなる。**State machine は、それが trigger する action を反映する variants から利益を得る。**

**Q5: `margin_health` は flat なポジションに対して `Option<MarginHealth>` を返すべきか?**

No — flat なポジションは `MarginHealth::Safe` を返す（notional がなく、満たすべき margin 要件もない）。`Option` はすべての呼び出し側に `None` を明示的に処理させてしまう。「flat = safe」は曖昧でないにもかかわらず。**型システムがすでに扱える状態を表現するために `Option` を足さない。**

## 次のレッスン (L3)

L3 では `AccountSnapshot`（すべての margin 関数の入力）と `CloseOrderSpec`（エンジンが bridge に渡す出力）で types モジュールを閉じる。L3 の後、types モジュールは完成する。L4 で compute モジュールを `notional_value` から始める。

````

---

## Seed-file slot

L2 は Module 1 の sortOrder 1 に入る:

```typescript
{
  title: 'レッスン 2 — MarginRatio + MarginHealth — エンジンが返す分類型',
  slug: 'openhl-liquidation-margin-types-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 25,
  xpReward: 50,
  content: `# レッスン 2 — MarginRatio + MarginHealth — エンジンが返す分類型\n\n...`
},
```

## SHA pinning discipline

L2 は `22eedf9`（Stage 10a）を引用する。答え合わせ diff は、types.rs に追記したブロックが Stage 10a の対応バイトと一致することを確認する。

## 翻訳セルフレビュー（paste 前）

- **「3 つの問い → 4 variants」予測コールアウト** が教育的なアンカー。これがないと読者は 4 variants の決定を信仰で受け入れる。あると、決定は導出可能になる — そして将来のステージで 5 番目の判断が現れたら、読者は既存の variant を overload するのではなく 5 番目を足すべきだと知る。
- **Q4 の `Underwater` を別 variant とする説明** は実際の PR コメントを先回りしている:「Underwater は Liquidatable + 追加帳簿ではないのか?」 「variants は action を反映する」というフレーミングが原則的な答え。
- **`PartialOrd` なしが L2 の design hill** — L1 の design hill は `hyperliquid_default()`（名前付きコンストラクタ、`Default` impl ではない）だった。両レッスンとも「自明な Rust 慣用句が常に正しいわけではない」という振り返りで終わる。累積的な効果として、読者が規律を内面化する。
- **L2 は意図的に L1 より軽い。** 型を 2 つ追加するのは、定数 + 構造体 + impl ブロックを追加するより少ないコード。読者は 2 つの難しいレッスン（L1 の `hyperliquid_default()` と L3 の `AccountSnapshot`）の間で小さな勝利を得る。
