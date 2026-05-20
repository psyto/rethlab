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

このレッスンで掴む概念:

- **同じ形、別の役割 = 別の型** — `FundingRate` と `Premium` はどちらも `RATE_SCALE` スケールの `i64` だが、premium が「生の dislocation」、rate が「divisor + clamp 後の出力」だ。別型にすることで pipeline を型レベルで強制できる — `compute_rate` を通っていない premium を `apply_funding` に渡せない。
- **方向 + 大きさを 1 つの符号付き整数で表す** — `PositionSize(i64)` で long / short / flat を 1 フィールドに収め、enum + magnitude ペアにしない。サイズも小さく、演算も速く、シンプル。符号規約は doc コメントに置く。
- **スナップショット型 vs stateful なエンティティ** — `Position` は `(account, size)` だけを持ち、entry price も PnL も履歴も意図的に持たない。owning layer が幅広い state を持ち、funding crate は狭いスナップショットを処理するだけ。doc コメントが ownership 契約を明示する。
- **Parameter-object パターン** — `interval_secs` / `rate_cap` / `divisor` を `FundingParams` にまとめると、config が拡張されても呼び出し箇所が安定する。positional 引数だと新パラメータごとに全呼び出し箇所が壊れる。struct ならフィールドを足すだけでシグネチャが変わらない。
- **HL デフォルトの算術を解きほぐす** — `divisor: 8` は「tick ごとに premium / 8」を意味する。24 hourly interval と 4% cap のもとでは、最悪日次支払いを縛るのは divisor ではなく cap。Cap は oracle dislocation に対する保険ポリシーだ。

検証：

```bash
cargo build -p openhl-funding
```

上記の実行結果が引き続きコンパイルを通り、rustdoc warning もゼロになる。

具体的な変更:

`types.rs` が**完成**する — Stage 8b の roster 9 型すべてが揃う：

- **`FundingRate(pub i64)`** — divisor と cap を適用した後の per-interval rate。`Premium` と同じスケール。
- **`PositionSize(pub i64)`** — 符号付き：正 = long、負 = short、ゼロ = flat。
- **`Position { account, size }`** — アカウントごとのスナップショット。ここで `openhl_clob::AccountId` 依存が初めて発火する。
- **`Settlement { account, delta }`** — `apply_funding` の出力：誰がいくら支払うか / 受け取るか。
- **`FundingParams { interval_secs, rate_cap, divisor }`** と `hyperliquid_default()` — HL シェイプのデフォルトを伴うネットワークレベル設定。

これで **Module 1** が閉じる。L3 後の状態：
- すべての型が定義済み、挙動はまだない。
- Rustdoc のクロス参照が解決済み（「unresolved link」warning なし）。
- Crate は純粋な data-types ライブラリ — ドキュメントとしては有用だが、まだ数学は何もしない。

**Module 2 (L4-L7) では純粋な compute を始める** — `compute_premium`、`compute_rate`、`apply_funding`。最初のテストもそこで登場する。

このレッスンの教育的な要点は、**parameter-object パターン**と HL デフォルトの根拠だ。なぜ 3 つのパラメータを `FundingParams` 構造体にまとめるのか、なぜ positional 引数で渡さないのか。そしてなぜ 1 時間間隔、なぜ 4% cap、なぜ divisor 8 なのか。

## おさらい

L2 後の状態：
- 4 つの money newtype（`MarkPrice`、`IndexPrice`、`Premium`、`Notional`）が定義済み。
- `types.rs` には module doc、`RATE_SCALE`、4 型が入っている。
- `lib.rs` が 5 つの名前を re-export している（定数 + 4 型）。
- rustdoc warning が 2 つ残っている（`FundingRate`、`FundingClock`）。

L3 では 5 型を追加して型 roster を閉じ、`openhl_clob::AccountId` の import も入れる。

## プラン

編集は 3 つ：

1. **`crates/funding/src/types.rs`** — 先頭に `openhl_clob::AccountId` の import を追加し、5 つの型定義（`FundingRate`、`PositionSize`、`Position`、`Settlement`、`FundingParams` と `hyperliquid_default`）を追加する。
2. **`crates/funding/src/lib.rs`** — re-export を 9 つの名前すべてを含むよう拡張する。
3. **検証**：`cargo build -p openhl-funding` が **warning ゼロ**でコンパイルを通る。

> 🛑 **考えてみよう。** スクロール前に — これから `FundingParams { interval_secs: u64, rate_cap: FundingRate, divisor: u32 }` を定義する。`compute_rate(premium, interval_secs, rate_cap, divisor)` ではない。**なぜこの 3 値を struct にまとめるのか？** ヒント：`compute_rate` の呼び出し箇所がいくつあるか、そして後から 4 つ目のパラメータを追加したらどうなるかを考えよ。

（答え：**Parameter-object パターンが、config の進化をまたいで呼び出し箇所の安定性を保つからだ。** `compute_rate(premium, params)` は positional 引数 1 つ + struct 1 つの形になる。後から `min_settlement_threshold` を funding config に追加するときも、関数シグネチャは `compute_rate(premium, params)` のままだ — 成長するのは `FundingParams` 構造体だけ。一方 positional 版の `compute_rate(premium, interval, cap, divisor)` だと、新しいパラメータを追加するたびにすべての呼び出し箇所が壊れる。呼び出し箇所が 5 未満（clock とテスト）なら今のコストは控えめだが、成熟したコードベースで 50 を超えるようになると parameter object は必須だ。**安定したグループ値はまとめてバンドルする — そのグループ自体がドメイン概念のときに**。「funding 設定」はまさにそういう概念の一つだ。）

## 手順

### Step 1: `AccountId` import を追加

`crates/funding/src/types.rs` の先頭、module doc の後、`pub const RATE_SCALE` の前に：

```rust
use openhl_clob::AccountId;
```

この import は L1 で Cargo.toml に dep（`openhl-clob = { path = "../clob" }`）を設定した時点で準備済みだ。`Position` と `Settlement` が `AccountId` を struct のフィールド型として参照するので、ここで初めて使われる。

> 🛑 **やりがちな勘違い。** 「呼び出し側が `openhl-clob` から import せずに済むよう、`openhl-funding` から `AccountId` を re-export すべきでは？」 **だめだ — `AccountId` は我々の型ではない。** `AccountId` は `openhl-clob` 側の型なので、呼び出し側は定義元から import すべきだ。`openhl-funding` 経由で re-export してしまうと、同じ型に対して 2 つの import path（`openhl_clob::AccountId` と `openhl_funding::AccountId`）ができてしまい、依存関係が不透明になる。**自前の型は re-export する、依存先の型は呼び出し側に直接 import させる。**

### Step 2: `Premium` の後ろに `FundingRate` を append

既存の `Premium` 定義の後ろに：

```rust
/// Per-interval funding rate. Same scale as [`Premium`]; positive means
/// longs pay shorts. A rate of `RATE_SCALE / 100` = 1% per interval.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct FundingRate(pub i64);
```

`FundingRate` は構造的には `Premium` と同一だ — 同じ `i64`、同じ derive。**型エイリアスではなく別の型にしているのは、funding pipeline 上で異なる概念を表すからだ。** Premium は*生*の mark/index dislocation、rate は divisor と clamp を適用した後に position へ*適用される*もの。Premium を消費するコード（`compute_rate`）は rate（post-processed なもの）を受け取るべきではないし、rate を消費するコード（`apply_funding`）は premium（まだ clamp されていないもの）を受け取るべきではない。

**同じ形、違う役割、別の型。** newtype パターンが `MarkPrice` と `IndexPrice` でやっているのと、まったく同じ話だ。

### Step 3: `PositionSize` を append

`FundingRate` の後ろに：

```rust
/// Signed position size in base units. Positive = long, negative = short,
/// zero = flat. Accounts with zero size aren't included in settlement
/// snapshots — see [`Position`].
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PositionSize(pub i64);
```

符号付き整数 1 つで 3 状態を運ぶ：long（`> 0`）、short（`< 0`）、flat（`== 0`）。2 フィールド表現と比べてみよう：

```rust
// 採用しない冗長な代替案：
pub struct PositionSize {
    pub direction: Direction,  // Long, Short, Flat
    pub magnitude: u64,
}
```

符号付き整数表現のほうが**小さく**（8 バイト対 ~16 バイト以上）、**速く**（hot path で enum dispatch が要らない）、**数学レイヤーが単純**になる（`size.0` を乗算に使うだけで符号が自然に伝播する）。トレードオフは、内部値の符号が implicit になることだ。それは doc コメントで明示する：*「正 = long、負 = short、ゼロ = flat」*。

**「Accounts with zero size aren't included in settlement snapshots」のノートは load-bearing だ。** `apply_funding` はゼロサイズの position をフィルタする — 経済的エクスポージャがないので、settle してもゼロ delta が出力にノイズを増やすだけだ。このフィルタは L7 で実物を見る。

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

フィールドは 2 つ、両方とも public。`account` のおかげで settlement 出力がどの balance を credit / debit すべきかが分かる。`size` のおかげで rate を適用する数学が delta を計算できる。

**重要なのは、`entry_price` も `realized_pnl` も `unrealized_pnl` も持たないこと。** Funding state machine は position がどう open されたか、PnL がどうなっているかを知る必要がない — *現在のサイズ*に*現在の rate* を掛けるだけだからだ。**スナップショットがシンプルなほど、上流でスナップショットを作るのも楽になる。**

> 🛑 **やりがちな勘違い。** 「先物の損益計算のため `Position` も entry price を持つべきでは？」 **だめだ — それは owning layer の仕事だ。** Vault や clearing layer が entry price を追跡し、unrealized PnL を計算する。Funding crate はその下流にいる：*現在*の position のスナップショットを受け取って、*現在*の funding を適用する。**スナップショット型は narrow に保てばよい。owning layer が全部を含む wider な型を持っていればそれでいい。**

Doc コメントで ownership 境界も明示している：*「never owns or mutates them. The owning layer is responsible...」* — これが funding crate と呼び出し側の契約だ。

`Position` に `Default` は付けない — `AccountId::default()` は `AccountId(0)` になるが、これは多くのアカウントシステムで reserved / sentinel として使われる。**entity の identity を担う struct には、偶発的なデフォルト構築を許してはいけない。**

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

`Settlement` は `apply_funding` の出力型で、非 flat な position 1 つにつき 1 つ生成する。アカウント ID（bridge が誰の分かを知るため）と delta（bridge がいくらかを知るため）を運ぶ。

**`Settlement` が position の順序インデックスではなく `account` を再度持つのはなぜか？** `apply_funding` がゼロサイズの position をフィルタするため、入力 position リストと出力 settlement リストでは*長さが異なる*からだ。位置インデックスを使うと、どの position が非ゼロだったかを呼び出し側が覚えておかねばならなくなる。出力にアカウント ID を持たせれば、その依存を切り離せる。

**これは parallel-array と struct-array のトレードオフ**で、Stage 8b では struct-array を選んだ。コストは settlement あたり冗長な `AccountId` が 1 つ増えること、メリットは呼び出し側がインデックスの対応関係を管理せずに済むことだ。

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

フィールドは 3 つ、すべて `pub` — newtype と同じ理由だ（`compute_rate` がすべて直接必要とする）。

#### 各 HL デフォルトの理由

- **`interval_secs: 3600`** — 1 時間。HL は毎時 settle、Binance Futures は 8 時間ごとだ。1 時間という cadence は、basis が dislocate したときにトレーダーが funding 圧力をすばやく感じ取れる程度に短く、block time noise に支配されない程度に長い。
- **`rate_cap: FundingRate(40_000_000)`** — 4%/interval。1 日 24 interval なので最悪 `±96%/day`、ただし下にある divisor の効果で実効最悪値はずっと低くなる。Cap は oracle 異常への*保険*として効く：index を一時的に 50% 動かせる攻撃者でも、1 tick で longs から 50% を抜くことはできない。
- **`divisor: 8`** — 1 日 8 settlement（HL の spec）、ただし **24** 個の 1 時間 interval にまたがって適用される。Doc コメントの算術に load-bearing な含意がある：`(premium / 8) × 24 hours = 3 × premium/day`。**HL の cap は divisor 単体から導かれる値より厳しい** — divisor が cadence を、cap が最悪ケースの支払いを bind する。

> 🛑 **考えてみよう。** HL デフォルトでの実効最悪日次支払いはいくらか。ヒント：`rate_cap = 4%/hour`、1 日の interval = 24、ただし divisor は 8 だ。

（答え：**毎 interval が cap に当たる場合 `±96%/day` になる。** 4%/*interval* の cap は divisor に依らず適用される。Divisor が影響するのは clamp の*前*の per-interval rate だけだ。だから premium が大きすぎて post-divisor rate が 4% を超えるときは毎時 4% に clamp され、24 回 × 4% = 1 日 96% となる。実際には、4%/interval で持続的に clamp し続けるほどの premium は pathological だ — HL の歴史でも oracle outage の最中にしか観測されていない。**Cap は保険コストの floor を定めるもので、典型的な funding 規模を示すものではない。**）

#### `hyperliquid_default` に `const fn` を使う理由

`const fn` にしておけば、コンパイル時定数が欲しい場面で `static DEFAULT: FundingParams = FundingParams::hyperliquid_default();` と書ける。コストはゼロ（引数なしの定数コンストラクタ）、メリットは選択肢を残せること。

#### `#[must_use]` を付ける理由

`#[must_use]` を付けておけば、呼び出し側が `hyperliquid_default()` を呼んで結果を捨てたときに warning が出る。**そもそも値を生むこと自体が目的の関数で、結果を捨てるのは常にバグだ** — この warning が「代入し忘れ」クラスのミスを捕まえてくれる。

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

アルファベット順を維持する。合計 10 名前（9 型と `RATE_SCALE`）。呼び出し側は `use openhl_funding::{FundingParams, Position};` のように、`types` モジュールを経由せずに書ける。

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

**Rustdoc warning は 1 つに減る**（L0 で 3、L1 でも 3、L2 で 2、L3 で 1）。残る未解決リンクは `FundingClock` だけだ — L8 で解決する。

実際のところ、rustdoc のリンク解決挙動次第では、各 doc コメントの `[FundingRate]` や `[Premium]` クロス参照は今すべて解決するかもしれない（これらの型は今存在するからだ）。`cargo doc -p openhl-funding --no-deps` で確認できる。正確な warning 数は環境によって異なる場合がある。

よくあるエラー：

- **`error[E0432]: unresolved import 'openhl_clob::AccountId'`** — Cargo.toml に dep が入っていない場合。L1 の `[dependencies]` ブロックに `openhl-clob = { path = "../clob" }` があるか再確認すること。
- **`Settlement` で `error: cannot find type 'Notional' in this scope`** — ローカル型の名前を間違えた場合。`Notional` は同じモジュール内なので `use` は不要だが、型名を正確に綴る必要がある。
- **`hyperliquid_default` で `error: function calls are not allowed in const fn`** — `FundingRate::from(40_000_000)` のような書き方をした場合。tuple-struct リテラル `FundingRate(40_000_000)` をそのまま使うこと。

## 設計の振り返り

このレッスンに焼き込んだ決定は 4 つ：

1. **`FundingRate` は `Premium` と形が同じでも別の型にする。** Newtype パターンが pipeline のステージを強制してくれる — premium が `compute_rate` を通らずに position に適用されることはありえない。**「形は同じだが役割が違う」は newtype の canonical なユースケースだ。**

2. **`PositionSize` は direction + magnitude ではなく、符号付き整数 1 つにする。** より小さく、より速く、数学が単純になる — そして符号規約の契約は doc コメントが担う。**どうせ数学が使うことになる、最も dense な表現を選べばよい。**

3. **`Position` はスナップショット型であり、stateful entity ではない。** Entry price も PnL も history もない — `(account, size)` だけだ。State を追跡するのは owning layer、スナップショットを処理するのが funding crate だ。**下流の型は narrow に、上流の型は wide に。**

4. **`FundingParams` は単位として変化する config をまとめてバンドルする。** 常に一緒に動く 3 値であり、後でバンドルを拡張しても呼び出し箇所は壊れない。**グループ自体がドメイン概念であるときに parameter object を使う。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/types.rs ./crates/funding/src/types.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L3 後の状態：
- **types.rs** が Stage 8b と**完全に**一致する — 9 型すべてと `RATE_SCALE`、`hyperliquid_default` まで。
- **lib.rs** には完全な型の re-export が入る。欠けているのは `compute` / `clock` の re-export だけだ。

**Module 1 完了。** L4 からは `compute.rs` へとシフトする — これらの型の上に乗る純粋関数とそのテストだ。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: `FundingParams::divisor` がなぜ `u64` でなく `u32` なのか？**
HL の divisor は 8 だ。他の設定でも 24（毎時 settle で divisor として 1 回扱う）や 1（1 日 1 回の settlement）あたりに収まる。pathological な値でも `u32::MAX`（~40 億）よりずっと下にある。**`u32` で「十二分」、しかも `u64` の半分のビットコストで済む** — そもそも `compute_rate` の除算ではどうせ `i64` に widen する。小さな最適化ではあるが、`Copy` 型では効いてくる。

**Q: `FundingParams` のコンストラクタでフィールド検証をすべきか？**
誘惑にかられる — `interval_secs == 0`（ゼロ除算や permanent gating の原因）を拒否するか？ `divisor == 0` も拒否するか？ Stage 8b ではどちらも採らなかった：コンストラクタでの検証は、呼び出し側の input 検証とは*別の*検証ポイントを作ることになり、両者の食い違いがバグの温床になる。**入力検証の単一情報源は呼び出し側に置く。** ただし `compute_rate` は `divisor == 0` を「funding 無効化」として扱う — これは defensive default であって、validation ではない。

**Q: `Position` が `Eq` を derive するのに `Default` を derive しないのはなぜか？**
`Eq` はテストで position を比較するため（場合によっては上流の dedup ロジックでも）必要だ。一方 `Default` を付けると `Position { account: AccountId(0), size: PositionSize(0) }` という意味不明な値が生まれる（`AccountId(0)` は典型的に sentinel として使われる）。**Default は意味のある値を生むべきで、それができないなら derive しない。**

**Q: `Position` と `Settlement` は冗長では — 両方とも `account` + 値フィールドを持っている？**
似て見えるが、ライフサイクル上のステージが違う。`Position` は `apply_funding` の*入力*、`Settlement` はその*出力*だ。Owning layer が `Position` を渡し、`Settlement` を受け取る。**型レベルで区別しておくことで、settlement を position として誤って再適用してしまう事故を防げる。**

## Module 1 マイルストーン — 築き上げたもの

L3 後の状態：
- 9 newtype と、メソッド付き struct が 1 つ（`FundingParams`）。
- Stage 8b と完全一致する `types.rs`、~110 行。
- Funding を語るための完全な語彙 — 数学 pipeline 上のすべての値（premium、rate、settlement、position）に型が付いた。
- 挙動はまだゼロ。**Modules 2-3 で挙動を追加していく。**

## 次のレッスン（L4）

L4 では `compute.rs` を始める。ファイルを作って、module doc と `compute_premium` 関数を入れる — crate 最初の数学だ。関数は 8 行だが、設計判断を 3 つ encode する：(a) `index == 0` をエラーにせず `Premium(0)` を返す形で扱う、(b) 引き算 × scale の overflow を避けるため `i128` 中間値を使う、(c) wrap させずに `i64` へ saturate して戻す。最初の unit test も 4 つ追加する — premium-zero-when-equal、premium-positive / negative ケース、`index == 0` での saturation テスト。**Crate 最初のテストだ。**
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
