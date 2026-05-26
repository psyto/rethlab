# Building OpenHL Liquidation — L2 draft (JA) — build-along

> openhl SHA `22eedf9` (Stage 10a — liquidation margin math) に対するドラフト。

## L2 — `openhl-liquidation-margin-types-ja`

**Stage**: Stage 10a — `22eedf9`

**Title**: レッスン 2 — `MarginRatio` + `MarginHealth` — エンジンが返す分類型

**Duration**: 25 分 · **XP**: 50

---

````markdown
# レッスン 2 — `MarginRatio` + `MarginHealth` — エンジンが返す分類型

## ゴール

このレッスンで掴む概念:

- **`MarginRatio` を `type` alias ではなく newtype にする理由。** newtype なら「bps スケールの ratio を期待しているところに生の i64 を渡した」というバグをコンパイル時に捕まえられる。Funding の `MarkPrice(pub u64)` vs `u64` と同じ規律だ。
- **`MarginHealth` がちょうど 4 variants である理由。** `Safe`、`AtRisk`、`Liquidatable`、`Underwater` の 4 つは、それぞれ異なるエンジン動作を許可する。どれを潰しても、エンジンの他の部分が必要とする情報が失われる。
- **各 variant がエンジンの残り部分に対して何を許可するか** — 頭に収まる小さな decision matrix として整理する。
- **enum に `PartialOrd` / `Ord` を *derive しない* 理由。** variants は自然に worsening order を成すのだが、`health > Safe` のような順序比較は、明示的な `matches!` パターンと比べてコード臭がする。

確認:

```bash
cargo build -p openhl-liquidation
```

…がコンパイルされる。

具体的な変更:

- **`src/types.rs`** — 既存の `MARGIN_SCALE` 定数と `LiquidationParams` 構造体の下に、`MARGIN_SCALE` スケールの `MarginRatio` newtype と `MarginHealth` enum を加える。L1 で書いた部分には触らない。
- **`src/lib.rs`** — 既存の `pub use types::{...}` 再エクスポートに `MarginRatio` と `MarginHealth` を足す。

L2 にもテストはない。`MarginRatio` と `MarginHealth` はどちらも受動的なデータ型だからだ。L3 で `AccountSnapshot` と `CloseOrderSpec` を加え、types モジュールを閉じる流れになる（こちらもテストなし）。最初の挙動テストは L4 の `notional_value` でようやく登場する。

## おさらい

L1 の後:
- クレートには `MARGIN_SCALE`（10⁴）と、`hyperliquid_default()` を備えた `LiquidationParams` がある。
- `lib.rs` は両方を `types` から再エクスポートしている。
- `cargo build -p openhl-liquidation` が pass する。`MarginHealth` への rustdoc warning が 1 つ残っているはずだ（この時点ではまだ未解決）。

L2 ではエンジンの残り部分が言葉として使う 2 つの分類型を追加する。L4 以降、`margin_ratio` は `MarginRatio` を返し、`margin_health` は `MarginHealth` を返す形になる。

## 計画

編集は 2 つ、どちらも小さい:

1. **`crates/liquidation/src/types.rs` の末尾に追記。** `MARGIN_SCALE` を基準にした doc を伴う `MarginRatio(pub i64)` newtype と、4 variants + 各 variant の authorization の意味を説明する doc コメントを持つ `MarginHealth` enum を加える。
2. **`crates/liquidation/src/lib.rs` を更新。** `pub use types::{...}` 行を、新しい 2 つの名前を含む形に拡張する。

> 🛑 **予測。** スクロール前に: `MarginHealth` は enum として実装する予定だ。variants はいくつ必要か? ヒント: エンジンは各アカウントについて 3 つの判断を下さなければならない。(a) アカウントは新しいリスクを取れるか? (b) エンジンはポジションを force-close すべきか? (c) close だけで不足分をカバーできるか、それとも insurance fund が介入する必要があるか?

（答え: **3 つの問い → 4 variants。** `Safe` は (a) yes。`AtRisk` は (a) no, (b) no。`Liquidatable` は (a) no, (b) yes, (c) yes（close だけで足りる）。`Underwater` は (a) no, (b) yes, (c) no（insurance fund が不足分を吸収する）。3-variant enum にして Safe / AtRisk / Liquidatable だけにすると、Liquidatable と Underwater が潰れて「insurance fund は関与するのか?」という信号が消えてしまう。エンジンがそれを再計算する必要はない — variant にすでに反映済みだ。）

4 つの variant が、それぞれアカウントに対して**どの action を authorize するか**を 1 枚のマトリクスに落とすと、なぜ 4 つ必要なのか、そして各 variant がどう「下流の意思決定」を型レベルで運ぶのかが一目で見える:

```
                    │ (a) 新規ポジション │ (b) Force-close   │ (c) Close だけで    │
                    │     を開ける?       │   実行する?       │   不足カバー可能?    │
   ─────────────────┼────────────────────┼───────────────────┼─────────────────────┤
   Safe              │ ✅ yes              │ ❌ no              │ N/A (close 不要)    │
   AtRisk            │ ❌ no               │ ❌ no              │ N/A (close 不要)    │
   Liquidatable      │ ❌ no               │ ✅ yes             │ ✅ yes (equity 残あり)│
   Underwater        │ ❌ no               │ ✅ yes             │ ❌ no → insurance    │
                    │                    │                   │   fund が吸収        │
   ─────────────────┴────────────────────┴───────────────────┴─────────────────────┘

下流のエンジン挙動 (L7 / Module 3 で実装):
   Safe         ─► trader はそのまま運用継続
   AtRisk       ─► UI で警告、新規ポジは拒否、close は trader 自身に任せる
   Liquidatable ─► 自動 close order を発行、fee を差し引き、残 equity を返却
   Underwater   ─► 自動 close order を発行、不足分は insurance fund から補填
```

ポイント: **各 variant がそのまま「許可される action のセット」を表す**。`Liquidatable` と `Underwater` を 1 つに潰すと「insurance fund を呼ぶべきか」の信号が型から消え、エンジンが equity を再計算してから判断し直すコストが発生する。逆に variant を増やしてもどの行も新しい列は引き出せない (= action set として一意に区別される最小単位がこの 4 つ)。**「state machine の variants は、自分がトリガーする下流 action の数だけ存在する」** が、この設計が体現している原則だ。

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

この 25 行で気づきたい点が 5 つ:

1. **`MarginRatio(pub i64)` は newtype。** `type MarginRatio = i64` の alias ではない。Newtype は型チェッカーに足場を与える — `MarginRatio` を取る関数を、balance や account ID、`MarkPrice` のつもりで渡した生の `i64` 値では呼べなくなる。`pub i64` フィールドにしてあるので、呼び出し側は `MarginRatio(1000)` で組み立てて `ratio.0` で読み出せる。**内部に不正な状態を持ち得ない (= どんな `i64` 値が入っても型として不正にならない、つまり守るべきカプセル化不変量がない) ため、無駄にゲッター/セッターで隠蔽せず、透明なデータコンテナとしてシンプルに保っている。**「`Vec` を `MyVec` の private フィールドにラップして `len()` を再公開する」ような防壁は、不変量を守るためのコストであって不変量がないところに払うべきではない。

2. **`MarginRatio` は `Default`、`PartialOrd`、`Ord`、`Hash` まで広めに derive している。** これらが engine 側から要求されているわけではないが、下流のコード（telemetry、Stage 10c の worst-health 順 scanner、ダッシュボード）が `MarginRatio` を他の比較可能な値型と同じように扱えるようにしておく狙いがある。`MarginRatio::default()` は `MarginRatio(0)` で、意味としては「ratio 未計算」または「ゼロ初期化済み」だ。Engine 自身は `default()` を読むことはなく、必ず snapshot から計算する。

3. **`MarginHealth` は `PartialOrd` / `Ord` を derive *していない*。** variants は自然に順序を成す（Safe < AtRisk < Liquidatable < Underwater が worsening 方向）が、enum に順序比較を入れるのはコード臭だ。`if health > MarginHealth::AtRisk` よりも、`if matches!(health, MarginHealth::Liquidatable | MarginHealth::Underwater)` のほうが意図がはっきり読める。コンパイラに明示的なパターンを書かせれば、将来の保守者は分岐がどの variants をカバーしているかを過不足なく確認できる。**安易な enum の順序比較はバグの温床 (コード臭) になりがち — まずは `matches!` による明示的なパターンマッチに手を伸ばす規律を持とう。** 順序比較が真に欲しい場面 (severity 順のテレメトリソート等) では、明示的な `severity_rank()` メソッドを生やすほうが意図が見える。

4. **Variant ごとの doc コメントは数学ではなく *authorization* を語る。** 「Margin ratio < maintenance」は variant が発火する条件を示すが、コメントはエンジンが応答として何をすべきか（「ポジションを market で liquidate すべき」）まで書いている。この doc コメントが、「Liquidatable がシステムの残り部分にとって何を意味するか」を引く際の正式な参照になる。

5. **Variant の順序は worsening health に対応している。** ソース上は Safe → AtRisk → Liquidatable → Underwater の順だ。Rust の enum は derive したもの以外に固有の順序を持たないので、これはコンパイラにとっては load-bearing ではない。しかし網羅的な `match` を読むときに、自然な順序（最良ケースから最悪ケースへ）と並びが一致してくれる。

> 🛑 **やりがちな勘違い。** 「`MarginHealth` は `bool` でよいのでは — liquidatable か否か?」 **いいえ。エンジンは 1 つではなく 3 つの下流判断を要求するからだ。** `bool` だと (a)「新しいポジションを開けるか?」と (c)「insurance fund が関与するか?」を 1 ビットに潰してしまう。あとからこれを直すコストは、`bool` を返していた呼び出しサイトを総当たりして型を入れ替えることだ — 今のうちに正しく作るコストは、variants を 2 つ余計に書くだけで済む。

### Step 2: `src/lib.rs` を更新

`crates/liquidation/src/lib.rs` を開き、`pub use types::{...}` 行を拡張する。元:

```rust
pub use types::{LiquidationParams, MARGIN_SCALE};
```

更新後:

```rust
pub use types::{LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE};
```

`lib.rs` への変更はこれだけだ。クレートルートに public で並ぶ名前は 3 つで、アルファベット順に並ぶ。定数は慣例的に末尾なので、`MARGIN_SCALE` は最後のままに置いておく。

L1 で出ていた `[`MarginHealth`]` への rustdoc warning は、型が実体を得たことでここで解消する。

### Step 3: コンパイル

```bash
cargo build -p openhl-liquidation
```

期待される出力:

```
   Compiling openhl-liquidation v0.1.0 (/Users/.../my-openhl/crates/liquidation)
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

Warning はゼロ。L1 で残っていた `MarginHealth` の rustdoc warning も消える。

エラーが出た場合に多い原因:

- **`error[E0432]: unresolved import 'crate::types::MarginRatio'`** — `pub use` 行の typo（例: `MarignRatio`）が原因。型名を一字一句揃える。
- **`error: ambiguous re-export`** — 既存の `pub use` を拡張するつもりが、誤って下にもう 1 行足してしまった形だ。再エクスポートはすべて 1 つの `pub use types::{...}` ブロックに収める。Formatter もこの形を期待している。

## 設計の振り返り

このレッスンの load-bearing な決定は 3 つ:

1. **`MarginRatio(pub i64)` を newtype にする。`type MarginRatio = i64` ではない。** Alias はゼロコストだがゼロセーフティ — コンパイラから見れば同じ型だ。Newtype はランタイム上もゼロコスト（単一フィールド構造体はフィールドと同じレイアウト）でありながら、コンパイラが強制する本物の区別を生む。**値が「このビットパターンの整数」を超えた意味を運ぶときは、迷わず newtype を使う。**

2. **`MarginHealth` が 4 variants なのは、エンジンが下流で 3 つの判断をするからだ。** 各 variant が、その 3 つの判断の組み合わせにきれいに対応する。5 番目の variant（「ImminentlyLiquidatable」?「RecentlyClosed」?）が必要になるのは 4 番目の判断が現れたときで、それまでは 4 が正しい数になる。**Enum のカーディナリティは、それが許可する action のカーディナリティに揃える。**

3. **`MarginHealth` に `PartialOrd` を入れない。** Variants は自然に順序を成すが、enum で順序比較を許すと具体性を失う（`health > AtRisk` は *どの* 「AtRisk より悪い」か言わない — `Liquidatable` なのか `Underwater` なのか?）。明示的な `matches!` パターンならすべての分岐に対象 variants を綴ることになり、`rustc -W non_exhaustive_omitted_patterns` が忘れたケースを拾ってくれる。**比較可能な enum はたいていコード臭。まず `matches!` に手を伸ばす。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 22eedf9
diff -u ~/code/my-openhl/crates/liquidation/src/types.rs ./crates/liquidation/src/types.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L2 の後:
- **types.rs** は Stage 10a の types.rs の 1 行目から `MarginHealth::Underwater` までと一致する。L1 で書いた `MARGIN_SCALE` + `LiquidationParams` に、新たに `MarginRatio` と `MarginHealth` を載せた形だ。次に来る 2 型（`AccountSnapshot`、`CloseOrderSpec`）は L3 で扱う。
- **lib.rs** は Stage 10a の lib.rs から `compute` モジュールと追加 6 件の再エクスポートを除いた状態と一致する。これらは L4-L7 で揃える。

## よくある質問

**Q1: なぜ `MarginRatio` は `Display` を実装しないのか?**

実装してもよい — 値は単に bps 単位の i64 だ。実装していない理由は、production のコードパスのどこも `MarginRatio` をエンドユーザー向け表示として直接フォーマットしないからだ。bridge レイヤーが `.0` を取り出し、既知のスケールに合わせて render する（`"{}%"`、`ratio.0 / 100`）。ここで `Display` を加えると、呼び出し側が `MarginRatio` を生の整数のままログに出す癖を呼び込み、bps スケールが見えなくなる。**Trait は必要とするレイヤーで実装する。**

**Q2: `MarginHealth` を `u8` にしてメモリを節約できないか?**

Payload を持たない 4 variants の場合、Rust の enum レイアウトはすでに `u8` に収まっている — `size_of::<MarginHealth>() == 1`。コンパイラが最小の discriminant を選ぶ。生の `u8` に切り替えれば、名前付き variants と `match` の exhaustiveness check を失うだけで、得るものは何もない。

**Q3: Variant に payload を持たせるべきか（例: `AtRisk { headroom_bps: u32 }`）?**

魅力的に見えるが時期尚早だ。下流の consumer（Stage 10c scanner、ダッシュボード）は、必要な情報を背後の margin_ratio から再導出する。Variant payload を持たせると構築コストが乗り、`match` の使い勝手も複雑になる。**すべての consumer が payload から利益を得るのでない限り、enum は payload なしに保つ。**

**Q4: `Liquidatable` が「close + 場合によって deficit absorb」を含意できるなら、なぜ `Underwater` を別 variant にするのか?**

bridge が両ケースで *別の挙動* を取らねばならないからだ。`Liquidatable` のアカウントは close order を 1 つ生成し、engine は fee と残額を通常通り settle する。`Underwater` のアカウントは close order に加えて、bridge が atomic に適用しなければならない credit-to-insurance-fund エントリも生成する。Variants を分けておけば、ケースの違いを型レベルまで押し上げられ、網羅的な `match` がそれを拾ってくれる。マージすると、判別が bridge 内のランタイム分岐に押し下げられ、見落としやすくなる。**State machine は、自分が trigger する action を反映した variants から利益を得る。**

**Q5: `margin_health` は flat なポジションに対して `Option<MarginHealth>` を返すべきか?**

いいえ。flat なポジションは `MarginHealth::Safe` を返す（notional がなく、満たすべき margin 要件もないため）。`Option` で包んでしまうと、すべての呼び出し側に `None` を明示処理させる— 「flat = safe」は曖昧さがないのに、だ。**型システムですでに扱える状態をわざわざ `Option` で表現しない。**

## 次のレッスン (L3)

L3 では、すべての margin 関数の入力となる `AccountSnapshot` と、エンジンが bridge へ渡す出力となる `CloseOrderSpec` を加え、types モジュールを閉じる。L3 を終えれば types モジュールは完成だ。L4 からは compute モジュールに移り、`notional_value` から書き始める。

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
