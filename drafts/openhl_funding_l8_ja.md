# Building OpenHL Funding — L8 draft (JA) — build-along

> openhl SHA `cd94137`（Stage 8b — funding state machine）に対するドラフト。
> コース: `building-openhl-funding-ja`（track: `reth-l1-architect`）。

---

## L8 — `openhl-funding-clock-scaffold-ja`

- **Module:** 3 (Clock state machine), sortOrder 0
- **Course-level sortOrder:** 8 (lesson 9 of 12)
- **Duration:** 35 min
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# レッスン 8 — `FundingClock` — discrete event loop

## ゴール

このレッスンが終わると：

```bash
cargo test -p openhl-funding
```

…が 18 テストを通る（L4-L7 から 15 + 新規 3）。Crate が**3 つ目で最後のモジュール**を得る：

- **`crates/funding/src/clock.rs`** — 新ファイル、module doc + 2 構造体 + 1 impl ブロック：
  - **`FundingClock`** — `params: FundingParams` と `last_settled_at: u64` を所有。Funding tick 間の state。
  - **`FundingTick`** — `settled_at`、`premium`、`rate`、`settlements` を運ぶ出力型。`tick()` が成功時に返す。
  - **`impl FundingClock`** — `new`、`params`、`last_settled_at` accessor、`tick(...)` 関数。
- **3 サニティテスト**：
  - `first_tick_before_interval_returns_none`
  - `first_tick_at_exact_interval_fires`
  - `empty_positions_yield_empty_settlements_but_still_advance_clock`
- **`crates/funding/src/lib.rs`** — `pub mod clock;` 宣言、`FundingClock` + `FundingTick` を re-export。**最後の rustdoc warning が解決。**

L8 が**モジュール opener**。この clock を微妙にする不変条件 — *interval ごとに最多 1 settlement*、*長ギャップ後の no catch-up* — は独自の dedicated レッスン（L9 と L10）を得る。このレッスンは構造を確立する。

教育の焦点は **discrete event loop を持つ state machine**：pure 関数（数学）が stateful object（clock）で gate される、determinism を失わずに。

## おさらい

L7 後：
- 3 pure 関数（`compute_premium`、`compute_rate`、`apply_funding`）全 green。
- 15 テスト pass、proptest 2 含む。
- `compute.rs` が Stage 8b と byte-identical。
- Crate は funding *数学*を計算する、まだ*いつ*適用するかを知らない。

L8 で「いつ」を配線。Clock は数学を正しい時に呼ぶ薄い layer — そして決定的に、*間違った*時には呼ば*ない*。

## プラン

3 ファイル編集：

1. **`crates/funding/src/clock.rs` を作成** — module doc + imports + `FundingClock` + `FundingTick` + `impl FundingClock { new, params, last_settled_at, tick }`。
2. **`#[cfg(test)] mod tests` を `clock.rs` に追加**、3 サニティテスト付き。
3. **`crates/funding/src/lib.rs` を更新** — `pub mod clock;` + `FundingClock`、`FundingTick` を re-export。

> 🛑 **考えてみよう。** スクロール前に — `tick()` は `Option<FundingTick>` を返す — settlement があれば `Some`、なければ `None`。**なぜ `Option` を返す、常に `FundingTick`（settlement なしのとき空 `settlements` 付き）を返さない？** ヒント：呼び出し側が結果で何をするかを考える。

（答え：**`None` が「state 変化なし」を、呼び出し側が結果を inspect するまでもなく信号する。** Funding tick をブロック生産ループに配線する呼び出し側は、`FundingApplied` event を発火するか、settlement を log するか等を安価に知りたい。`Option` なら `if let Some(tick) = clock.tick(...)` が自然な形。常に return すると呼び出し側に `if !tick.settlements.is_empty()` 等のチェックを強要 — それは正しい意味すら捕まえない（空 settlement リストは「tick fired だが position なし」*かもしれない*、「tick fired していない」*かもしれない*）。**`Option` が二分を型レベルで明示。**）

## 手順

### Step 1: `clock.rs` を作成

`crates/funding/src/clock.rs` を作成。初期内容（ファイル先頭）：

```rust
//! Funding clock — the gating state machine that decides *when* to settle.
//!
//! The rate math lives in [`crate::compute`]; this module is the discrete
//! event loop that calls it on the right cadence. Two invariants:
//!
//!   1. **At most one settlement per interval.** Two ticks at the same
//!      timestamp produce one settlement, not two.
//!   2. **No catch-up.** If `now` jumps forward by 10 intervals (validator
//!      reboot, chain pause), we settle *once*. Compounding 10 ticks of
//!      retroactive funding from a single stale snapshot would over-pay
//!      whichever side has been losing without giving the loser a chance
//!      to close. Production deployments that need catch-up logic should
//!      build it on top of repeated ticks with fresh snapshots, not here.

use crate::compute::{apply_funding, compute_premium, compute_rate};
use crate::types::{
    FundingParams, FundingRate, IndexPrice, MarkPrice, Position, Premium, Settlement,
};
```

2 部分に注目：

**Module doc が両不変条件を先頭で名指す。** 実際の強制は `tick()`（interval guard）と L9 / L10 のテストにある。だが*契約*はここ、最上部にある — モジュールを読む誰もがコードの前に両不変条件を見る。**契約を約束する、下のコードとテストで守る。**

**Imports が我々が必要なすべてを引っ張る。** `apply_funding`、`compute_premium`、`compute_rate`（Module 2）。`FundingParams`、`FundingRate`、`IndexPrice`、`MarkPrice`、`Position`、`Premium`、`Settlement`（Module 1）。**L4 の compute.rs imports と同じロジック：boilerplate を早期に安定化。**

### Step 2: `FundingClock` 構造体を追加

Imports の後に：

```rust
/// State that persists across funding ticks. The clock is initialized with
/// the timestamp of its last settlement (often the chain's genesis time, or
/// the previous validator-set's last tick).
#[derive(Clone, Debug)]
pub struct FundingClock {
    params: FundingParams,
    last_settled_at: u64,
}
```

2 フィールド、両方*private*：

1. **`params: FundingParams`** — per-network config（interval_secs、rate_cap、divisor）。Construction で set、`params()` 経由で読めるが mutate できない。**Post-construction で immutable — production deployment は funding params を mid-run で変えない。**

2. **`last_settled_at: u64`** — 最新の成功 tick のタイムスタンプ。成功 tick ごとに更新。**唯一の可変 state。**

`#[derive(Clone, Debug)]` のみ。**`Copy` なし** — `Clone` は十分安価で、clock を duplicate しやすくして誰かがどのコピーが advance したか忘れることを避けたい。**`Eq`/`Hash`/`PartialOrd` なし** — clock は意味ある等価比較ができない、運用 state machine。

> 🛑 **やりがちな勘違い。** 「並行 tick をサポートするため `last_settled_at` に `AtomicU64` を使うべきでは？」 **No — funding crate は契約で single-threaded。** 並行 funding tick は `last_settled_at` *かつ* `CLOB_STATE` *かつ* bridge が下流で使う balance store で race する。正しい答えは「呼び出し側が tick を serialize する」、「clock が並行を扱う」ではない。**並行性をデータ構造に push すると、存在すべきでない問題に複雑さを加える。**

### Step 3: `FundingTick` を追加

`FundingClock` の後に：

```rust
/// The output of a successful tick. Returned by [`FundingClock::tick`] when
/// at least `params.interval_secs` have elapsed since the last settlement.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FundingTick {
    pub settled_at: u64,
    pub premium: Premium,
    pub rate: FundingRate,
    pub settlements: Vec<Settlement>,
}
```

4 フィールド、すべて `pub`。**出力構造体は典型的に全 public フィールドを持つ** — 呼び出し側が直接消費する、plain data、encapsulated state ではない。

各フィールドが運ぶもの：

- **`settled_at: u64`** — tick が適用されたタイムスタンプ（= `tick()` への `now` 引数）。
- **`premium: Premium`** — この tick で計算した premium（telemetry / event emission 用）。
- **`rate: FundingRate`** — divisor + cap 後の per-interval rate（同じく telemetry 用）。
- **`settlements: Vec<Settlement>`** — `apply_funding` が生んだもの。実際に適用する delta。

**Bridge が必要なのは `settlements` なのに、なぜ `premium` と `rate` を含む？** Telemetry が必要だから。「tick 12345 の funding rate は 0.125% だった」と log したい observer は `tick.rate` を直接読む。これらのフィールドなしだと telemetry が rate を再計算する必要 — 重複作業、重複が実際の rate と disagree しうる（どちらかの変更で）。**下流 consumer が欲しいなら中間値を出力構造体で surface する。**

`PartialEq, Eq` derive はテスト可能性のため — テストが `assert_eq!(tick, expected)` できる。**安価で有用。**

### Step 4: Impl ブロックを追加

`FundingTick` の後に：

```rust
impl FundingClock {
    /// Construct a clock that thinks its last settlement happened at
    /// `genesis_time`. The first tick after `genesis_time + interval_secs`
    /// will fire.
    #[must_use]
    pub const fn new(params: FundingParams, genesis_time: u64) -> Self {
        Self {
            params,
            last_settled_at: genesis_time,
        }
    }

    #[must_use]
    pub const fn params(&self) -> FundingParams {
        self.params
    }

    #[must_use]
    pub const fn last_settled_at(&self) -> u64 {
        self.last_settled_at
    }

    /// Attempt a settlement. Returns `Some` only if at least one full
    /// `interval_secs` has elapsed since `last_settled_at`.
    ///
    /// On success, the clock advances to `now` (NOT to
    /// `last_settled_at + interval`) — see the "no catch-up" invariant in
    /// the module docs. Production callers wanting strict interval alignment
    /// can advance externally, but openhl's default is "settle on the first
    /// block ≥ interval boundary, then reset the deadline".
    pub fn tick(
        &mut self,
        now: u64,
        mark: MarkPrice,
        index: IndexPrice,
        positions: &[Position],
    ) -> Option<FundingTick> {
        if now < self.last_settled_at.saturating_add(self.params.interval_secs) {
            return None;
        }

        let premium = compute_premium(mark, index);
        let rate = compute_rate(premium, self.params);
        let settlements = apply_funding(positions, mark, rate);

        self.last_settled_at = now;

        Some(FundingTick {
            settled_at: now,
            premium,
            rate,
            settlements,
        })
    }
}
```

4 メソッド：

#### `new(params, genesis_time)`

Clock を construct。**`const fn`** なので `static DEFAULT_CLOCK: FundingClock = FundingClock::new(...)` がコンパイル時に可能。**`#[must_use]`** で clock を construct して discard するのは常にバグ。

Doc がタイミングセマンティクスを説明：「`genesis_time + interval_secs` 以降の最初の tick が fire する」。`genesis_time = 1_000_000`、`interval_secs = 3600` を set した呼び出し側は最初の tick が `1_003_600` 以降に fire することを知る。**驚きなし。**

#### `params()` と `last_settled_at()` accessor

Private フィールドへの read-only アクセス。**`const fn`** + **`#[must_use]`** 両方とも。値返し（`&FundingParams` でなく）、なぜなら `FundingParams: Copy`。**Copy で安価、呼び出し側に lifetime 体操なし。**

#### `tick(&mut self, now, mark, index, positions)`

Clock の核心。3 論理 phase：

1. **Guard**：`if now < self.last_settled_at.saturating_add(self.params.interval_secs) { return None; }`。`saturating_add` が `last_settled_at` が `u64::MAX` 近くのとき `u64` overflow を防ぐ（pathological、だが defense は無料）。

2. **Compute**：3 つの Module 2 関数をチェーン。`compute_premium(mark, index)` → `compute_rate(premium, params)` → `apply_funding(positions, mark, rate)`。**Clock がそれらを compose、reimplement しない。**

3. **State 更新 + return**：`last_settled_at` を `now` に進める、`Some(FundingTick { ... })` を返す。

**決定的に、clock は `now` に advance、`last_settled_at + interval_secs` ではない。** これが「no catch-up」不変条件の実装 — tick が遅れて fire したとき、deadline を後ろにリセットする catch-up でなく。L10 のレッスンがこれが重要な理由を説明する。

> 🛑 **考えてみよう。** `last_settled_at = 1_000_000`、`interval_secs = 3600`、`now = 1_010_000`（= +10000s、~2.8 interval）で `tick()` の後の `last_settled_at` は？

（答え：**`1_010_000`。** `1_003_600`（genesis から 1 interval 後）でも `1_007_200`（genesis から 2 interval 後）でもない。Clock は `now` に advance する — `tick()` の doc コメントを見る。次の tick は `now ≥ 1_010_000 + 3600 = 1_013_600` まで fire しない。**これが設計選択、L10 が理由を説明。**）

### Step 5: 3 サニティテストを追加

`impl FundingClock` ブロックの後に：

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Notional, PositionSize};
    use openhl_clob::AccountId;

    fn pos(account: u64, size: i64) -> Position {
        Position {
            account: AccountId(account),
            size: PositionSize(size),
        }
    }

    fn balanced_book() -> Vec<Position> {
        vec![pos(1, 100), pos(2, -100)]
    }

    #[test]
    fn first_tick_before_interval_returns_none() {
        let params = FundingParams::hyperliquid_default(); // 3600s interval
        let mut clock = FundingClock::new(params, 1_000_000);

        // 3599 seconds later — not enough.
        let out = clock.tick(1_003_599, MarkPrice(100), IndexPrice(100), &balanced_book());
        assert!(out.is_none());
        // Clock didn't advance.
        assert_eq!(clock.last_settled_at(), 1_000_000);
    }

    #[test]
    fn first_tick_at_exact_interval_fires() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let out = clock
            .tick(1_003_600, MarkPrice(100), IndexPrice(100), &balanced_book())
            .expect("tick should fire at exact interval boundary");
        assert_eq!(out.settled_at, 1_003_600);
        // mark == index → zero rate → empty settlements
        assert_eq!(out.rate, FundingRate(0));
        assert!(out.settlements.is_empty());
        assert_eq!(clock.last_settled_at(), 1_003_600);
    }

    #[test]
    fn empty_positions_yield_empty_settlements_but_still_advance_clock() {
        let params = FundingParams::hyperliquid_default();
        let mut clock = FundingClock::new(params, 1_000_000);

        let out = clock
            .tick(1_003_600, MarkPrice(101), IndexPrice(100), &[])
            .expect("tick fires regardless of position count");
        assert!(out.settlements.is_empty());
        // But the rate was still computed — useful for telemetry.
        assert_eq!(out.rate, FundingRate(1_250_000));
        assert_eq!(clock.last_settled_at(), 1_003_600);
    }
}
```

テスト setup について 3 つ注目：

**テストモジュールが `Notional` と `PositionSize` を import** — このファイルで使うのは `PositionSize` だけだが（`Notional` は L9 で使う）。L5 のテストモジュールと同じ boilerplate-安定化パターン。

**2 つの helper：`pos(account, size)` と `balanced_book()`。** 最初は L5 helper をエコー。2 つ目は L8/L9 テストが繰り返し使う標準的な 2-position book を生む。**Helper は 3+ テストで使うとき価値を生む** — 両方とも該当。

**3 テスト、3 関心事：**

1. **`first_tick_before_interval_returns_none`** — guard が動く。Interval 経過前に tick を呼ぶ → `None`。Clock state 変化なし。**Catches：「guard を忘れた」または「常に Some を返した」。**

2. **`first_tick_at_exact_interval_fires`** — 境界 inclusive。`genesis + interval_secs` ちょうどで tick が fire。Guard 条件の off-by-one（`<` vs `<=`）を捕まえる。Body が数学 composition を verify：`mark == index` → `Premium(0)` → `FundingRate(0)` → 空 settlement。

3. **`empty_positions_yield_empty_settlements_but_still_advance_clock`** — Zero position でも composition が動く。`apply_funding(&[])` が empty を返す、clock はまだ advance。**Catches：「tick() を position があることに gate した」**または空入力を mishandle する shortcut。

> 🛑 **やりがちな勘違い。** 「`mark` か `index` がゼロのときをテストすべき？」 **L4 の premium テストで既にカバー。** Clock は入力を `compute_premium` に通すだけ。`compute_premium` を信頼しないなら `compute.rs` に追加テストを書く、ここで重複しない。**同じ挙動を 2 つの抽象レベルでテストしない。**

### Step 6: `lib.rs` を更新

現状：

```rust
//! ...

pub mod compute;
pub mod types;

pub use compute::{apply_funding, compute_premium, compute_rate};
pub use types::{ ... };
```

Clock モジュールを追加：

```rust
//! ...

pub mod clock;
pub mod compute;
pub mod types;

pub use clock::{FundingClock, FundingTick};
pub use compute::{apply_funding, compute_premium, compute_rate};
pub use types::{ ... };
```

モジュール宣言はアルファベット順（`clock` が `compute` の前、`compute` が `types` の前）。Re-export も同様。**L8 の lib.rs が最終形** — L9 と L10 が新しいモジュールレベル名前を追加しない。

### Step 7: テストを実行

```bash
cargo test -p openhl-funding
```

期待：

```
   Compiling openhl-funding v0.1.0 (/Users/.../my-openhl/crates/funding)
    Finished `test` profile [unoptimized + debuginfo] in 0.6s

running 18 tests
test clock::tests::empty_positions_yield_empty_settlements_but_still_advance_clock ... ok
test clock::tests::first_tick_at_exact_interval_fires ... ok
test clock::tests::first_tick_before_interval_returns_none ... ok
test compute::tests::... (L4-L7 から 15 つ全て)

test result: ok. 18 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**18 テスト、rustdoc warning なし。** Crate のドキュメンテーションが完成。

よくあるエラー：

- **`now == last_settled_at + interval - 1` で `tick` が fire** — guard で `<` でなく `<=` を使った、もしくは inverted 形で `>` でなく `>=`。意図セマンティクス：「`now >= last_settled_at + interval` で fire」、guard 用に negate すると `if now < last_settled_at + interval { return None; }`。
- **`tick` が `last_settled_at` を advance しない** — `Some(FundingTick { ... })` の前の `self.last_settled_at = now;` 行を忘れた。次の tick が即座に再 fire する。
- **`empty_positions...` テストで `out.settlements` が non-empty** — `apply_funding(&[])` は empty を返すべき。Trace：`rate.0 == 0` の早期 return が empty vec を返す、*かつ*空 positions slice がループを完全にスキップする。どちらのパスも empty を生む。
- **`clock.tick(...).expect(...)` の後の `clock.last_settled_at()` で borrow checker エラー** — `tick` が `&mut self` を取る、borrow は expression 完了時に終わる。結果を変数に代入してからその結果を drop する前に `clock.last_settled_at()` を呼ぶと borrow が live。解決：`let out = clock.tick(...); assert_eq!(clock.last_settled_at(), ...);` — `let` が call 末尾で borrow を終わらせる。

## 設計の振り返り

このレッスンに焼き込まれた決定 5 つ：

1. **常時 return でなく `Option<FundingTick>`。** `None` が「state 変化なし」を安価に信号。呼び出し側が `FundingTick` を inspect する必要なし。**型システムで「fire したか？」二分を encode。**

2. **Clock は `now` に advance、`last_settled + interval` ではない。** 「完全に periodic」からの最初の大きな違い — clock の deadline が毎 fire でリセット、どれだけ経過したかに関わらず。**L10 がこれを defend する、ここでは記録するだけ。**

3. **Module 2 関数を reimplementation なしで compose。** `tick()` が `compute_premium`、`compute_rate`、`apply_funding` をチェーン。Clock はどれの動作も知らない — 順序だけ。**層化：数学が計算、clock が gate。**

4. **`FundingTick` が telemetry のため中間値を expose。** Premium と rate を出力で surface、最終 settlement だけでなく。下流 observer が再計算する必要なし。**有用な中間を surface、再計算は divergence を招く。**

5. **Module doc が両不変条件を先頭で名指す。** 実際に強制するコードは順番に来る（L8 guard、L9 境界テスト、L10 advancement 選択）。だが*契約*はコードの前に documented。**ドキュメンテーション as 設計意図。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout cd94137
diff -u ~/code/my-openhl/crates/funding/src/clock.rs ./crates/funding/src/clock.rs
diff -u ~/code/my-openhl/crates/funding/src/lib.rs ./crates/funding/src/lib.rs
```

L8 後：
- **clock.rs** が Stage 8b の `FundingClock` + `FundingTick` + `impl FundingClock { ... }` + 7 テスト中 3 つまで一致。残り 4 テストは L9（interval-gating + premium-driving の 3 テスト）と L10（no-catch-up の 1 マイルストーンテスト）に分かれる。
- **lib.rs** が Stage 8b と**完全**一致。最終形。

戻す：

```bash
git checkout main
```

## よくある質問

**Q: `tick` が `&mut self` で `self` を消費して `(Self, Option<FundingTick>)` を返さない理由は？**
実用主義。`&mut self` が in-place 変更の標準 Rust パターン。消費して return すると呼び出し側に re-assign を強要：`clock = clock.tick(...)`。Semantic 利得なしで verbose。**State machine が mutate するなら `&mut self`、真に変換するなら consuming。** Funding clock は前者。

**Q: `FundingClock` は tick の*数*を追跡すべき（例：telemetry 用）？**
`ticks_fired: u64` カウンタを追加できる。Stage 8b はしない — 呼び出し側が気にすれば外部でカウントできる。**具体的な consumer なしで minimal struct に state を追加しない。** 後で追加するのは struct field 変更 1 つ、unused state を削除するのは breaking API 変更。

**Q: `tick` が `mark`、`index`、`positions` を引数として取る、clock に持たせない理由は？**
毎 tick で変わるから。`mark` と `index` は tick 時の oracle/orderbook read から、`positions` は fresh snapshot。Clock に保存すると呼び出し側に `tick` 呼び出し前に更新を要求 — 同じ形でステップ多い。**毎呼び出しで変わる入力は call に、persist する入力は receiver に。**

**Q: Clock の proptest がない理由は？**
Clock の property はほぼ*interval セマンティクス*（interval ごとに 1 settlement、no catch-up）で、手書きトレーステストとして表現しやすい。Module 2 の antisymmetry や zero-sum のような代数的 property がない。**Clock は event loop、event loop は代数でなく scenario でテスト。**

## 次のレッスン（L9）

L9 で `clock.rs` に 3 テストを追加、**interval-gating 不変条件**を増加する深さで exercise：

- `premium_drives_settlement_signs` — mark > index のとき settlement が long→short に流れる（full 数学 composition テスト）。
- `second_tick_requires_another_full_interval` — 成功 tick の後、次は別の `interval_secs` が要る。Interval は 1 度だけのチェックではない。
- `capped_rate_when_premium_extreme` — saturation premium で rate が cap に clamp。`compute_rate` の cap 挙動が clock 経由で正しく surface することを確認。

レッスンはほぼ*テスト*と*interval-gating* 不変条件について。**L10 で Module 3 を no-catch-up 不変条件で閉じる。**
````

---

## Seed-file slot

L8 は Module 3 (Clock state machine) の sortOrder 0 に入る：

```typescript
{
  title: 'レッスン 8 — FundingClock — discrete event loop',
  slug: 'openhl-funding-clock-scaffold-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 35,
  xpReward: 70,
  content: `# レッスン 8 — \`FundingClock\` — discrete event loop\n\n...`
},
```

## SHA pinning discipline

L8 は `cd94137`（Stage 8b）を引用。L8 後、clock.rs が Stage 8b の structures + impl + 7 テスト中 3 つまで一致、残り 4 が L9（3 テスト）と L10（1 マイルストーンテスト）に分かれる。lib.rs が Stage 8b と完全一致。

## Style review notes (self-critique before paste)

- **§ゴールが L8 を Module 3 opener** + 最後の rustdoc warning 解決としてフレーミング。
- **§考えてみよう（`Option` vs 常時 return）**が設計選択を正当化。
- **§Step 1 の「契約を約束、下のコードで守る」**が module doc の pedagogical フレーム。
- **§やりがちな勘違い（AtomicU64）**が「並行性は？」反射を先回り。
- **§Step 3 の「なぜ premium と rate を出力に含む」**が telemetry 理由を説明。
- **§Step 4 が 4 メソッドに 4 名前付きサブセクション**。
- **§Predict on clock advancement** が L10 設計選択を理由なしで preview。
- **§Step 5 が各テストが何を捕まえるかを説明**。
- **§やりがちな勘違い（`mark == 0` テスト）**が cross-layer 重複反射を先回り。
- **§設計の振り返り 1-5** が distinct パターンを名指す（option-for-fire、advance-to-now、layered-composition、telemetry-intermediates、doc-as-design）。
- **§よくある質問**が `&mut self` vs consuming、tick count、引数配置、proptest 不在を扱う。
- **L9 プレビュー**が具体的：3 テスト、interval-gating 不変条件 focus。
