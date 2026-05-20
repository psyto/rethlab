# Building OpenHL Funding — L3 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L3 — `openhl-funding-position-types-ja`

- **Module:** 1 (Determinism + 型), sortOrder 2
- **Course-level sortOrder:** 3 (lesson 4 of 12)
- **Duration:** 35 min
- **XP reward:** 70
- **Type:** CONTENT
- **Milestone:** Module 1 完了 — 型の roster が完全配置

### Content

````markdown
# レッスン 3 — Position 型 — roster 完成 + HL デフォルト

## ゴール

このレッスンが終わると：

```bash
cargo build -p openhl-funding
```

…が引き続きコンパイル、rustdoc warning ゼロ。`types.rs` が**完成** — Stage 8b の roster 9 型すべてが配置：

- **`FundingRate(pub i64)`** — divisor + cap 後の per-interval rate。`Premium` と同じスケール。
- **`PositionSize(pub i64)`** — 符号付き：正 = long、負 = short、ゼロ = flat。
- **`Position { account, size }`** — アカウントごとのスナップショット。`openhl_clob::AccountId` 依存を発火。
- **`Settlement { account, delta }`** — `apply_funding` の出力：誰が支払う/受け取る、いくら。
- **`FundingParams { interval_secs, rate_cap, divisor }`** + `hyperliquid_default()` — HL シェイプのデフォルト付きネットワークレベル設定。

これで **Module 1** が閉じる。L3 後：
- 全型定義済み、まだ挙動なし。
- Rustdoc クロス参照が解決（「unresolved link」warning なし）。
- Crate は純粋な data-types ライブラリ — ドキュメントとして有用、まだ数学はしない。

**Module 2 (L4-L7) で純粋な compute を開始** — `compute_premium`、`compute_rate`、`apply_funding`。最初のテストもそこに来る。

このレッスンの教育要点は **parameter-object パターン**と HL デフォルトの根拠。なぜ 3 つのパラメータを `FundingParams` 構造体にまとめる、positional 引数で渡さないか？ なぜ 1 時間間隔、なぜ 4% cap、なぜ divisor 8？

## おさらい

L2 後：
- 4 つの money newtype（`MarkPrice`、`IndexPrice`、`Premium`、`Notional`）が定義済み。
- `types.rs` が module doc + `RATE_SCALE` + 4 型。
- `lib.rs` が 5 つの名前を re-export（定数 + 4 型）。
- 未解決 rustdoc warning が 2 つ残る（`FundingRate`、`FundingClock`）。

L3 で 5 型を追加（型 roster を閉じる）+ `openhl_clob::AccountId` import。

## プラン

3 つの編集：

1. **`crates/funding/src/types.rs`** — 先頭に `openhl_clob::AccountId` import を追加、5 つの型定義（`FundingRate`、`PositionSize`、`Position`、`Settlement`、`FundingParams` + `hyperliquid_default`）を append。
2. **`crates/funding/src/lib.rs`** — re-export を 9 名前全部を含むよう拡張。
3. **検証**：`cargo build -p openhl-funding` が **warning ゼロ**でコンパイル。

> 🛑 **考えてみよう。** スクロール前に — 今から `FundingParams { interval_secs: u64, rate_cap: FundingRate, divisor: u32 }` を定義する、`compute_rate(premium, interval_secs, rate_cap, divisor)` でなく。**なぜこの 3 値を struct にまとめる？** ヒント：`compute_rate` の call site がいくつあり、後で 4 つ目のパラメータを追加したら何が起きるかを考える。

（答え：**Parameter-object パターンが call site の安定性を config 進化を跨いで保つ。** `compute_rate(premium, params)` は positional 引数 1 + struct 1。後で `min_settlement_threshold` を funding config に追加するとき、関数シグネチャは `compute_rate(premium, params)` のまま — `FundingParams` 構造体だけが成長。Positional 版 `compute_rate(premium, interval, cap, divisor)` だと新パラメータごとに全 call site が壊れる。今 < 5 call site（clock + テスト）なら cost は控えめ、成熟したコードベースの 50+ なら parameter object が必須。**安定したグループの値を一緒にバンドルする、グループ自体がドメイン概念のとき** — 「funding 設定」がそういう概念の 1 つ。）

## 手順

### Step 1: `AccountId` import を追加

`crates/funding/src/types.rs` の先頭、module doc の後、`pub const RATE_SCALE` の前に：

```rust
use openhl_clob::AccountId;
```

この import は L1 の Cargo.toml で設定済み（`openhl-clob = { path = "../clob" }` dep）。`Position` と `Settlement` が `AccountId` を struct field type として参照するのでここで発火。

> 🛑 **やりがちな勘違い。** 「呼び出し側が `openhl-clob` から import せずに済むよう、`openhl-funding` から `AccountId` を re-export すべき？」 **No — それは我々のものではない。** `AccountId` は `openhl-clob` の型で、呼び出し側は定義場所から import すべき。`openhl-funding` 経由で re-export すると同じ物に 2 つの import path（`openhl_clob::AccountId` vs `openhl_funding::AccountId`）ができ、依存関係を obscure する。**自分の型は re-export する、呼び出し側が依存物の型は直接 import させる。**

### Step 2: `Premium` の後ろに `FundingRate` を append

既存の `Premium` 定義の後ろに：

```rust
/// Per-interval funding rate. Same scale as [`Premium`]; positive means
/// longs pay shorts. A rate of `RATE_SCALE / 100` = 1% per interval.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct FundingRate(pub i64);
```

`FundingRate` は構造的に `Premium` と同一 — 同じ `i64`、同じ derive。**型エイリアスでなく別の型である理由は、funding pipeline で異なる概念を表すから。** Premium は*生*の mark/index dislocation、rate は divisor + clamp 後に positions に*適用*される。Premium を消費するコード（`compute_rate`）は rate（post-processed）を受け入れるべきでない、rate を消費するコード（`apply_funding`）は premium（まだ clamp されていない）を受け入れるべきでない。

**同じ形、違う役割、別の型。** これが newtype パターンが `MarkPrice` vs `IndexPrice` でやっていることそのもの。

### Step 3: `PositionSize` を append

`FundingRate` の後ろに：

```rust
/// Signed position size in base units. Positive = long, negative = short,
/// zero = flat. Accounts with zero size aren't included in settlement
/// snapshots — see [`Position`].
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PositionSize(pub i64);
```

1 つの符号付き整数が 3 状態を運ぶ：long（`> 0`）、short（`< 0`）、flat（`== 0`）。2 フィールド表現と比較：

```rust
// 冗長な代替 — 我々が使うものではない：
pub struct PositionSize {
    pub direction: Direction,  // Long, Short, Flat
    pub magnitude: u64,
}
```

符号付き整数表現は**より小さく**（8 バイト vs ~16+）、**より速く**（hot path で enum dispatch なし）、**数学レイヤーで単純**（`size.0` で乗算するだけ、符号が自然に伝播）。トレードオフ：内部値の符号が implicit。Doc コメントが明示：*「正 = long、負 = short、ゼロ = flat」*。

**「Accounts with zero size aren't included in settlement snapshots」というノートは load-bearing。** `apply_funding` がゼロサイズ position をフィルタする — 経済的エクスポージャがないので、settle してもゼロ delta が noise を増やすだけ。L7 でそのフィルタを見る。

### Step 4: `Position` を append

```rust
/// A single account's net position on the market. The funding state machine
/// treats positions as a per-tick *snapshot* — it never owns or mutates
/// them. The owning layer (vault / clearing) is responsible for tracking
/// `Position` over time and producing snapshots at each tick.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Position {
    pub account: AccountId,
    pub size: PositionSize,
}
```

2 つのフィールド、両方 public。`account` で settlement 出力がどのバランスをクレジット/デビットすべきか分かる。`size` で rate-application 数学が delta を計算できる。

**重要：`entry_price` なし、`realized_pnl` なし、`unrealized_pnl` なし。** Funding state machine は position がどう open されたか、PnL がどうかを知る必要はない — *現在のサイズ*を*現在の rate* に対して掛けるだけ。**スナップショットが単純なほど、上流でスナップショットを作るのが楽。**

> 🛑 **やりがちな勘違い。** 「先物の損益計算のため `Position` は entry price も持つべきでは？」 **No — それは owning layer の仕事。** Vault や clearing layer が entry price を追跡、unrealized PnL を計算、等。Funding crate はそれの下流：*現在*の position のスナップショットを受け、*現在*の funding を適用する。**スナップショット型は narrow に保つ、owning layer がすべてを含む wider な型を持てばよい。**

Doc コメントが ownership 境界を明示：*「never owns or mutates them. The owning layer is responsible...」* — これが funding crate と呼び出し側の契約。

`Position` に `Default` なし — `AccountId::default()` は `AccountId(0)` で、ほとんどのアカウントシステムで reserved/sentinel。**Entity-identity-bearing 構造体の偶発的なデフォルト構築を許してはいけない。**

### Step 5: `Settlement` を append

```rust
/// Output of applying a funding rate to one position. The bridge layer
/// translates these into balance updates against each account's quote
/// balance.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Settlement {
    pub account: AccountId,
    pub delta: Notional,
}
```

`Settlement` は `apply_funding` の出力型：非 flat position あたり 1 つ。アカウント ID を運ぶ（bridge が誰か知るため）、delta を運ぶ（bridge がいくらか知るため）。

**なぜ `Settlement` が position 順インデックスでなく `account` を再度運ぶ？** `apply_funding` がゼロサイズ position をフィルタするので、入力 position リストと出力 settlement リストの*長さが異なる*。Position 順インデックスは呼び出し側がどの position が非ゼロだったか覚えるよう要求する、出力でアカウント ID を運ぶことで分離できる。

**これが parallel-array vs struct-array トレードオフ** — Stage 8b は struct-array を選んだ。コストは settlement あたり冗長な `AccountId` 1 つ、メリットは呼び出し側がインデックス対応を維持する必要がない。

### Step 6: `FundingParams` + `hyperliquid_default` を append

```rust
/// Network parameters that govern funding cadence and magnitude.
///
/// `divisor` represents "settlements per day": HL settles 8 times per day,
/// so `premium / 8` is the per-interval rate. Higher divisor → smaller rate
/// per tick (and inverse: lower divisor concentrates the same daily target
/// rate into fewer payments).
///
/// `rate_cap` is the absolute maximum |rate| per interval. Production
/// networks set this to bound the worst-case payment an extreme oracle
/// dislocation can produce. Zero `rate_cap` disables funding entirely.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FundingParams {
    pub interval_secs: u64,
    pub rate_cap: FundingRate,
    pub divisor: u32,
}

impl FundingParams {
    /// Hyperliquid-style defaults: 1-hour interval, ±4%/hour cap, 8× divisor.
    /// 8× divisor with a 1-hour interval means the *target* daily premium
    /// would be applied across 24 hours' worth of ticks at 1/8 of the premium
    /// each — i.e., 24/8 = 3× the premium per day. That asymmetry is
    /// intentional: HL caps more aggressively than the divisor alone implies.
    #[must_use]
    pub const fn hyperliquid_default() -> Self {
        Self {
            interval_secs: 3600,
            // 4% per interval = 40_000_000 ppb (since 0.04 × 1e9 = 4e7).
            rate_cap: FundingRate(40_000_000),
            divisor: 8,
        }
    }
}
```

3 フィールド、すべて `pub` — newtype と同じ理由（`compute_rate` がすべて直接必要）。

#### 各 HL デフォルトの理由

- **`interval_secs: 3600`** — 1 時間。HL は毎時 settle、Binance Futures は 8 時間ごと。1 時間 cadence は basis dislocate のときトレーダーが funding 圧力を素早く感じる程度に短く、block time noise が支配しない程度に長い。
- **`rate_cap: FundingRate(40_000_000)`** — 4%/interval。1 日 24 interval で最悪 `±96%/day`、下の divisor で実効最悪はずっと低い。Cap は oracle 騒動への*保険ポリシー*：indexを 50% 一時的に動かせる攻撃者は 1 tick で longs から 50% 抜けない。
- **`divisor: 8`** — 1 日 8 settlement（HL の spec）、だが **24** 個の 1 時間 interval にまたがって適用。Doc コメントの算術が load-bearing nuance：`(premium / 8) × 24 hours = 3 × premium/day`。**HL の cap は divisor 単体が意味するより厳しい** — divisor が cadence を設定、cap が最悪ケースの支払いを bind。

> 🛑 **考えてみよう。** HL デフォルトでの実効最悪日次支払いは？ ヒント：`rate_cap = 4%/hour`、1 日の interval = 24、だが divisor は 8。

（答え：**毎 interval が cap に当たる場合 `±96%/day`。** Cap の 4%/*interval* は divisor に関わらず適用される。Divisor は clamp の*前*の per-interval rate にだけ影響する。だから premium が大きすぎて post-divisor rate が 4% を超えると、毎時 4% に clamp、時給 24 回 × 4% = 1 日 96%。実際には、持続的に 4%/interval を clamp させる premium は pathological — HL は歴史的に oracle outage 中にのみそれを見た。**Cap は保険コストの floor、典型的な funding 規模ではない。**）

#### `hyperliquid_default` に `const fn` の理由

`const fn` で `static DEFAULT: FundingParams = FundingParams::hyperliquid_default();` を書ける、compile-time 定数が欲しいなら。コストはゼロ（定数の no-arg constructor）、メリットはオプションを保持。

#### `#[must_use]` の理由

`#[must_use]` は呼び出し側が `hyperliquid_default()` を呼んで結果を捨てたら warning を出す。**目的が値を生むこと自体である関数で、結果を捨てるのは常にバグ** — warning が「assign し忘れた」ミスのクラスを捕まえる。

### Step 7: `lib.rs` re-export を更新

現在の re-export：

```rust
pub use types::{IndexPrice, MarkPrice, Notional, Premium, RATE_SCALE};
```

完全リストに置換：

```rust
pub use types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Notional, Position, PositionSize,
    Premium, Settlement, RATE_SCALE,
};
```

アルファベット順維持。合計 10 名前（9 型 + `RATE_SCALE`）。呼び出し側は `use openhl_funding::{FundingParams, Position};` 等と `types` モジュール経由せずに書ける。

### Step 8: コンパイル

```bash
cargo build -p openhl-funding
```

期待出力：

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
warning: unresolved link to `FundingClock`
    Finished `dev` profile [unoptimized + debuginfo] in 0.4s
```

**Rustdoc warning が 1 つ残る**（L0 で 3、L1 でも 3、L2 で 2、L3 で 1）。最後の未解決リンクは `FundingClock` — L8 で解決。

実際 — rustdoc の link 解決挙動次第で、各 doc コメントの `[FundingRate]` と `[Premium]` クロス参照は今すべて解決するかも（それらの型は今存在する）。`cargo doc -p openhl-funding --no-deps` で確認。正確な warning 数は異なるかも。

よくあるエラー：

- **`error[E0432]: unresolved import 'openhl_clob::AccountId'`** — Cargo.toml の dep がない。L1 の `[dependencies]` ブロックに `openhl-clob = { path = "../clob" }` があるか再確認。
- **`Settlement` での `error: cannot find type 'Notional' in this scope`** — ローカル型を import していない。`Notional` は同じモジュール内、`use` 不要、だが型名は正確に綴る必要がある。
- **`hyperliquid_default` での `error: function calls are not allowed in const fn`** — `FundingRate::from(40_000_000)` 等を書いた。Tuple-struct リテラル `FundingRate(40_000_000)` を直接使う。

## 設計の振り返り

このレッスンに焼き込まれた決定 4 つ：

1. **`FundingRate` は `Premium` と同一の形でも別の型。** Newtype パターンが pipeline ステージを強制 — premium が `compute_rate` を通らずに positions に適用されることはありえない。**同じ形だが違う役割が newtype の canonical なユースケース。**

2. **`PositionSize` は単一の符号付き整数、direction + magnitude ではない。** より小さく、より速く、数学が単純 — そして doc コメントが符号規約の契約。**数学がどうせ使う最も dense な表現を選ぶ。**

3. **`Position` はスナップショット型、stateful entity ではない。** Entry price なし、PnL なし、history なし — `(account, size)` のみ。Owning layer が state を追跡、funding crate がスナップショットを処理。**下流型は narrow、上流型は wide。**

4. **`FundingParams` が単位で変わる config をバンドル。** 常に一緒に旅する 3 値、後でバンドルを拡張しても call site は壊れない。**グループ自体がドメイン概念のとき parameter object。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L3 後：
- **types.rs** が Stage 8b と**完全**一致 — 9 型すべて + `RATE_SCALE` + `hyperliquid_default`。
- **lib.rs** が完全な型 re-export 持つ、`compute` / `clock` re-export だけが欠ける。

**Module 1 完了。** L4 から `compute.rs` へシフト — これらの型の上の純粋関数、テスト付き。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: なぜ `FundingParams::divisor` は `u64` でなく `u32`？**
HL の divisor は 8。他の設定は 24（毎時を divisor として 1 度）や 1（1 日 1 度の settlement）に行くかも。Pathological 値でも `u32::MAX`（~40 億）から十分下。**`u32` で「十分すぎ」、`u64` の半分のビットコスト** — そして `compute_rate` がどうせ除算で `i64` に widen する。小さな最適化、だが `Copy` 型は得をする。

**Q: `FundingParams` はコンストラクタでフィールド検証すべき？**
誘惑的 — `interval_secs == 0` を拒否（division-by-zero か permanent gating の原因）？ `divisor == 0` を拒否？ Stage 8b は選ばなかった：コンストラクタでの検証は呼び出し側の input handling とは*別の*検証ポイントを意味し、2 つの間の divergence がバグ源になる。**Input 検証の単一情報源：呼び出し側。** とはいえ `compute_rate` は `divisor == 0` を「funding 無効化」として扱う — defensive default、validation ではない。

**Q: `Position` が `Eq` を derive するが `Default` を derive しないのは？**
`Eq` はテストで position を比較するため（possibly 上流の dedup ロジックでも）。`Default` だと `Position { account: AccountId(0), size: PositionSize(0) }` で意味不明（`AccountId(0)` は典型的に sentinel）。**Default は sensible な値を生むべき、できないなら derive を省く。**

**Q: `Position` と `Settlement` は冗長では — 両方 `account` + value field を持つ？**
似て見えるが、ライフサイクルの異なるステージにある。`Position` は `apply_funding` の*入力*、`Settlement` はその*出力*。Owning layer が `Position` を渡して `Settlement` を受け取る。**Type レベルでの区別が settlement を position として偶発再適用するのを防ぐ。**

## Module 1 マイルストーン — 築いたもの

L3 後：
- 9 newtype + 1 struct-with-method（`FundingParams`）。
- Stage 8b と完全一致の `types.rs` ~110 行。
- Funding について語る完全な vocabulary — 数学 pipeline の全値（premium、rate、settlement、position）が型を持つ。
- まだ挙動ゼロ。**Modules 2-3 が挙動を追加。**

## 次のレッスン（L4）

L4 で `compute.rs` を開始。ファイルを作成、module doc + `compute_premium` 関数 — crate 最初の数学。関数は 8 行だが 3 つの設計決定を encode：(a) `index == 0` を error でなく `Premium(0)` を返して扱う；(b) 引き算 × scale で overflow を避けるため `i128` 中間値を使う；(c) wrap でなく `i64` に saturate して戻す。レッスンは最初の unit test 4 つも追加 — premium-zero-when-equal、premium-positive/negative ケース、`index == 0` saturation テスト。**Crate 最初のテスト。**
````

---

## Seed-file slot

L3 は Module 1 の sortOrder 2（モジュールを閉じる）に入る：

```typescript
{
  title: 'レッスン 3 — Position 型 — roster 完成 + HL デフォルト',
  slug: 'openhl-funding-position-types-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 35,
  xpReward: 70,
  content: `# レッスン 3 — Position 型 — roster 完成 + HL デフォルト\n\n...`
},
```

## SHA pinning discipline

L3 は `cd94137`（Stage 8b）を引用。L3 後、`types.rs` は Stage 8b と byte-identical。`lib.rs` は完全な型 re-export だがまだ `compute` / `clock` re-export なし（L4 / L8 で来る）。

## Style review notes (self-critique before paste)

- **§ゴールが L3 を Module 1 マイルストーンとしてフレーミング** — 完全な型 roster、挙動ゼロ、次は compute へ遷移。
- **§考えてみよう（parameter-object パターン）**が選択を正当化 — positional 引数がデフォルトの読者が call-site stability 論を見る。
- **§Step 1 やりがちな勘違い（`AccountId` re-export）**が便利 import 誘惑を先回り。
- **§Step 4 やりがちな勘違い（entry_price）**が「Position はもっと運ぶべきでは？」反射を先回り。
- **§Step 5 の「なぜ account を再度」説明**が parallel-array vs struct-array 選択を解く。
- **§Step 6 が各 HL デフォルトに名前付きサブセクション** — 値ごとの理由付けを値の近くに保つ。
- **§Step 6 考えてみよう（最悪ケース日次）**が cap セマンティクスの直感を築く有用な算術エクササイズ。
- **§設計の振り返り 1-4** がそれぞれ別の一般化可能パターンを名指す（pipeline-ステージ別型、dense 表現、snapshot vs stateful、parameter-object）。
- **§よくある質問**が「検証すべきでは？」反射を single-point-of-truth 論で扱う。
- **§Module 1 マイルストーンまとめ**が完全な型 roster を celebrate。
- **L4 プレビュー**が具体的：8 行関数、3 つの設計決定、最初の 4 unit test。
