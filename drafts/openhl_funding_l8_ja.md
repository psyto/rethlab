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

このレッスンで掴む概念:

- **Pure 関数の上に discrete event loop を載せる** — Clock の仕事は「正しいタイミングで数学を呼ぶ」「間違ったタイミングでは呼ばない」の 2 つだけだ。Module 2 の数学はそのまま、Clock は*いつ*を足すレイヤーであって*何を*計算するかは変えない。
- **常に返すより `Option<FundingTick>`** — `None` が「state 変化なし」を安く伝える。呼び出し側は `if let Some(tick) = clock.tick(...)` と書けばよい。常に何かを返す形にすると `if !tick.settlements.is_empty()` のような曖昧なチェックを書く羽目になる（settlements が空でも「fire したが position がなかった」のか「そもそも fire していない」のか区別できない）。
- **レイヤード composition、再実装しない** — `tick()` は `compute_premium → compute_rate → apply_funding` を順に呼ぶだけで、それぞれの中身は知らない。「数学が計算する、clock が gate する」という責任分離をファイルレベルで実現している。
- **テレメトリのために中間値を露出する** — `FundingTick` には `settlements` だけでなく `premium` と `rate` も載せる。「tick 12345 の rate は 0.125% でした」とログしたい observer はこれを直接読める。再計算は乖離の温床。
- **Module doc で契約を約束し、コードとテストでそれを守る** — `clock.rs` の冒頭で 2 つの不変条件（at-most-one-per-interval、no-catch-up）をコードより先に宣言する。L8 が構造を作り、L9 と L10 がテスト側で不変条件を強制する。理由を確認できる場所は doc、コード、テストの 3 箇所。
- **契約上シングルスレッド** — 並行性は呼び出し側の責任、データ構造の責任ではない。`last_settled_at` を `AtomicU64` にしても、このレイヤーで存在しない直列化問題のために複雑性を足すだけだ。

検証：

```bash
cargo test -p openhl-funding
```

上記の実行結果が 18 テストを通る（L4-L7 で書いた 15 + 新規 3）。

具体的な変更:

Crate には**3 つ目で最後のモジュール**が加わる：

- **`crates/funding/src/clock.rs`** — 新規ファイル。module doc、構造体 2 つ、impl ブロック 1 つを置く：
  - **`FundingClock`** — `params: FundingParams` と `last_settled_at: u64` を保持する。funding tick の間で持ち越す state だ。
  - **`FundingTick`** — `settled_at`、`premium`、`rate`、`settlements` を運ぶ出力型。`tick()` が成功したときに返す。
  - **`impl FundingClock`** — `new`、`params` / `last_settled_at` の accessor、`tick(...)` 関数。
- **サニティテスト 3 つ**：
  - `first_tick_before_interval_returns_none`
  - `first_tick_at_exact_interval_fires`
  - `empty_positions_yield_empty_settlements_but_still_advance_clock`
- **`crates/funding/src/lib.rs`** — `pub mod clock;` の宣言と、`FundingClock` / `FundingTick` の re-export を追加する。**これで最後の rustdoc warning も解消する。**

L8 は**モジュールのオープナー**だ。この clock を微妙にしている不変条件 — *interval ごとに settlement は最多 1 回*、*長いギャップ後の no catch-up* — は、それぞれ専用のレッスン（L9 と L10）で扱う。L8 では、その土台となる構造を確立する。

教育上の焦点は **discrete event loop を伴う state machine** だ：pure な関数（数学）を、stateful なオブジェクト（clock）でゲートしつつ、determinism を失わないようにする、というやり方だ。

## おさらい

L7 後の状態：
- 3 つの pure 関数（`compute_premium`、`compute_rate`、`apply_funding`）がすべて green。
- 15 テスト pass、proptest を 2 つ含む。
- `compute.rs` が Stage 8b と byte-identical。
- Crate は funding の*数学*を計算できるが、まだ*いつ*それを適用するかは知らない。

L8 ではその「いつ」を配線する。Clock は数学を正しいタイミングで呼ぶ薄いレイヤーだ — そして決定的に重要なのは、*間違った*タイミングでは呼ば*ない*ことだ。

## プラン

ファイル編集は 3 つ：

1. **`crates/funding/src/clock.rs` を作成**する — module doc、imports、`FundingClock`、`FundingTick`、`impl FundingClock { new, params, last_settled_at, tick }` を入れる。
2. **`clock.rs` に `#[cfg(test)] mod tests` を追加**し、サニティテストを 3 つ入れる。
3. **`crates/funding/src/lib.rs` を更新**する — `pub mod clock;` の追加と、`FundingClock` / `FundingTick` の re-export を行う。

> 🛑 **考えてみよう。** スクロール前に — `tick()` は `Option<FundingTick>` を返す（settlement があれば `Some`、なければ `None`）。**なぜ `Option` を返すのか。`FundingTick` を常に返す（settlement がないときは空の `settlements` を持つ形）形にしないのはなぜか？** ヒント：呼び出し側が結果をどう扱うかを考えよ。

（答え：**`None` だけで「state 変化なし」を通知でき、呼び出し側が結果を inspect するまでもないからだ。** Funding tick をブロック生成ループに繋ぐ呼び出し側は、`FundingApplied` イベントを発火するか、settlement をログするか、といった判断を安く済ませたい。`Option` なら `if let Some(tick) = clock.tick(...)` という自然な形が書ける。常に何かを返す形にすると、呼び出し側に `if !tick.settlements.is_empty()` のようなチェックを書かせることになる — それは正しい意味すら表せない（空の settlement リストは「tick が fire したが position がなかった」かもしれないし、「そもそも tick が fire していない」かもしれない）。**`Option` は、この二分を型レベルで明示してくれる。**）

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

注目点は 2 つ：

**Module doc が両方の不変条件を冒頭で明示している。** 実際に強制するのは `tick()`（interval guard）と L9 / L10 のテストだが、*契約*はここ、ファイル最上部に置いてある — モジュールを読む人は、コードを見る前に両不変条件を見ることになる。**契約を約束し、下のコードとテストで守る。**

**Imports は必要なものを一通り引っ張ってくる。** `apply_funding`、`compute_premium`、`compute_rate`（Module 2）、`FundingParams`、`FundingRate`、`IndexPrice`、`MarkPrice`、`Position`、`Premium`、`Settlement`（Module 1）。**L4 の compute.rs の import と同じ理屈で、boilerplate を早めに安定化させる。**

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

フィールドは 2 つで、いずれも*private*：

1. **`params: FundingParams`** — ネットワーク単位の config（interval_secs、rate_cap、divisor）。construction で set し、`params()` 経由で読めるが mutate はできない。**construction 後は immutable だ — production の deployment が動作中に funding params を変えることはない。**

2. **`last_settled_at: u64`** — 直近の成功した tick のタイムスタンプ。成功 tick のたびに更新する。**可変 state はこれだけだ。**

derive するのは `#[derive(Clone, Debug)]` のみ。**`Copy` は付けない** — `Clone` で十分に安価だし、clock を気軽に複製できてしまうと「どのコピーが advance しているのか」を見失う事故が起きやすい。**`Eq` / `Hash` / `PartialOrd` も付けない** — clock は意味のある等価比較ができない、運用上の state machine だからだ。

> 🛑 **やりがちな勘違い。** 「並行 tick をサポートするために `last_settled_at` を `AtomicU64` にすべきでは？」 **だめだ — funding crate は契約として single-threaded だ。** 並行に funding tick が走ると、`last_settled_at` だけでなく、`CLOB_STATE` や bridge が下流で使う balance store でも race が起きる。正解は「呼び出し側で tick を直列化する」であって、「clock 側で並行性を扱う」ではない。**並行性をデータ構造側に押し込むと、本来存在すべきでない問題に複雑さを足してしまう。**

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

フィールドは 4 つで、すべて `pub` だ。**出力 struct は典型的に全フィールドを public にする** — 呼び出し側がそのまま消費する plain なデータであって、encapsulate された state ではないからだ。

各フィールドが運ぶ意味：

- **`settled_at: u64`** — tick が適用されたタイムスタンプ（= `tick()` への `now` 引数）。
- **`premium: Premium`** — この tick で計算した premium（telemetry / event emission 用）。
- **`rate: FundingRate`** — divisor と cap を適用した後の per-interval rate（同じく telemetry 用）。
- **`settlements: Vec<Settlement>`** — `apply_funding` が生んだもの。実際に適用される delta だ。

**Bridge が必要としているのは `settlements` だけなのに、なぜ `premium` と `rate` も含めるのか？** Telemetry のためだ。「tick 12345 の funding rate は 0.125% だった」とログに残したい observer は、`tick.rate` を直接読みたい。これらのフィールドがないと telemetry は rate を再計算する羽目になる — 二重の作業になるし、どちらかが変わったときに実際の rate と食い違うリスクが生まれる。**下流の consumer が欲しがる中間値は、出力 struct で素直に surface する — 再計算は乖離を呼び込む。**

`PartialEq, Eq` を derive しているのはテスト容易性のためだ — テストで `assert_eq!(tick, expected)` と書ける。**安価で有用な選択だ。**

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

メソッドは 4 つ：

#### `new(params, genesis_time)`

Clock を construct する。**`const fn`** なので、コンパイル時に `static DEFAULT_CLOCK: FundingClock = FundingClock::new(...)` と書ける。**`#[must_use]`** を付けてあるのは、clock を構築してそのまま捨てるのは常にバグだからだ。

Doc にはタイミングの semantics も書いてある：「`genesis_time + interval_secs` 以降の最初の tick で fire する」。`genesis_time = 1_000_000`、`interval_secs = 3600` を渡した呼び出し側は、最初の tick が `1_003_600` 以降で fire することを把握できる。**驚きはない。**

#### `params()` と `last_settled_at()` アクセサ

Private フィールドへの read-only アクセスだ。両方とも **`const fn`** + **`#[must_use]`** にしている。`&FundingParams` ではなく値で返す — `FundingParams: Copy` だからだ。**Copy なら安価で、呼び出し側にライフタイムの面倒も持ち込まない。**

#### `tick(&mut self, now, mark, index, positions)`

Clock の核心となるメソッド。論理的には 3 つの phase だ：

1. **Guard**：`if now < self.last_settled_at.saturating_add(self.params.interval_secs) { return None; }`。`saturating_add` のおかげで、`last_settled_at` が `u64::MAX` 近くのときに `u64` の overflow を防げる（pathological なケースだが、defense は無料だ）。

2. **Compute**：Module 2 の関数を 3 つ繋ぐ。`compute_premium(mark, index)` → `compute_rate(premium, params)` → `apply_funding(positions, mark, rate)`。**Clock はそれらを compose するだけで、再実装はしない。**

3. **state 更新 + return**：`last_settled_at` を `now` に進め、`Some(FundingTick { ... })` を返す。

**決定的に重要なのは、clock を `now` に進めること** — `last_settled_at + interval_secs` ではない、という点だ。これが「no catch-up」不変条件の実装で、tick が遅れて fire したときに deadline を後ろにリセットする catch-up にはしない、ということだ。なぜそれが重要なのかは L10 のレッスンで説明する。

> 🛑 **考えてみよう。** `last_settled_at = 1_000_000`、`interval_secs = 3600`、`now = 1_010_000`（= +10000 秒、~2.8 interval）で `tick()` を呼んだ後の `last_settled_at` はいくらになるか。

（答え：**`1_010_000` になる。** `1_003_600`（genesis から 1 interval 後）でも `1_007_200`（genesis から 2 interval 後）でもない。Clock は `now` に進む — `tick()` の doc コメントを見直すこと。次の tick は `now ≥ 1_010_000 + 3600 = 1_013_600` になるまで fire しない。**これが設計判断であり、その理由は L10 で説明する。**）

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

テストの setup で注目しておきたい点が 3 つ：

**テストモジュールで `Notional` と `PositionSize` を import している** — このファイルで実際に使うのは `PositionSize` だけだ（`Notional` は L9 で使う）。L5 のテストモジュールと同じ「boilerplate を先に安定化させる」パターンだ。

**helper を 2 つ用意する：`pos(account, size)` と `balanced_book()`。** 最初は L5 の helper のエコー。2 つ目は L8 / L9 のテストが繰り返し使う、標準的な 2-position book を生む。**Helper が価値を生むのはテストが 3 つ以上で使うとき** — どちらもその条件を満たしている。

**テスト 3 つ、関心事 3 つ：**

1. **`first_tick_before_interval_returns_none`** — guard が機能していること。Interval 経過前に tick を呼ぶ → `None`、clock の state にも変化なし。**「guard を書き忘れた」「常に Some を返してしまった」というバグを捕まえる。**

2. **`first_tick_at_exact_interval_fires`** — 境界を inclusive にしていること。`genesis + interval_secs` ちょうどで tick が fire する。Guard 条件の off-by-one（`<` と `<=` の取り違え）を捕まえる。Body 側では数学の composition も検証する：`mark == index` → `Premium(0)` → `FundingRate(0)` → 空の settlement、という連鎖だ。

3. **`empty_positions_yield_empty_settlements_but_still_advance_clock`** — position が 0 個でも composition が機能すること。`apply_funding(&[])` が empty を返し、それでも clock は advance する。**「`tick()` を position の有無で gate してしまった」あるいは空入力を mishandle するショートカットを捕まえる。**

> 🛑 **やりがちな勘違い。** 「`mark` や `index` がゼロのケースもテストすべきでは？」 **L4 の premium テストですでにカバー済みだ。** Clock は入力を `compute_premium` に通すだけだ。`compute_premium` を信頼しないなら、追加テストは `compute.rs` 側に書くべきで、ここで重複させない。**同じ挙動を 2 つの抽象レベルで二重にテストしない。**

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

モジュール宣言はアルファベット順だ（`clock` が `compute` の前、`compute` が `types` の前）。Re-export も同じ並び。**L8 時点の lib.rs が最終形だ** — L9 と L10 では新しいモジュールレベルの名前は追加しない。

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

**18 テストすべて green、rustdoc warning も無し。** Crate のドキュメンテーションが完成した。

よくあるエラー：

- **`now == last_settled_at + interval - 1` で `tick` が fire してしまう** — guard で `<` のところを `<=` にしてしまった、もしくは反転形で `>` ではなく `>=` にしてしまった場合だ。意図する semantics は「`now >= last_settled_at + interval` のとき fire」で、guard 側に否定するなら `if now < last_settled_at + interval { return None; }` になる。
- **`tick` の後で `last_settled_at` が進まない** — `Some(FundingTick { ... })` の手前にある `self.last_settled_at = now;` の行を書き忘れた場合だ。次の tick が即座に再 fire してしまう。
- **`empty_positions...` テストで `out.settlements` が non-empty** — `apply_funding(&[])` は empty を返すべきだ。トレースしてみる：`rate.0 == 0` の早期 return も empty vec を返すし、空の positions スライスはループを完全にスキップする。どちらのパスからも empty が出る。
- **`clock.tick(...).expect(...)` の直後の `clock.last_settled_at()` で borrow checker エラー** — `tick` は `&mut self` を取り、その借用は式が終わるまで続く。結果を変数に束縛してその束縛を drop する前に `clock.last_settled_at()` を呼ぶと、借用がまだ生きている状態になる。対処は `let out = clock.tick(...); assert_eq!(clock.last_settled_at(), ...);` の形に分けること — `let` の末尾で借用が終わる。

## 設計の振り返り

このレッスンに焼き込んだ決定は 5 つ：

1. **常に値を返すのではなく `Option<FundingTick>` を返す。** `None` だけで「state は変化していない」を安価に通知できる。呼び出し側は `FundingTick` を中身まで見にいく必要がない。**「fire したか否か」の二分を型システムで encode する。**

2. **Clock は `last_settled + interval` ではなく `now` に advance する。** これが「完全に周期的」な動作からの最初の大きな逸脱だ — 何秒経過していようと、fire するたびに deadline がリセットされる。**この理由は L10 で defend する。ここでは事実として記録するだけだ。**

3. **Module 2 の関数を再実装せずに compose する。** `tick()` は `compute_premium`、`compute_rate`、`apply_funding` を順に呼ぶだけだ。Clock はどれの動作も知らず、知っているのは順序だけだ。**層を分けている：数学が計算を、clock が gating を担う。**

4. **`FundingTick` は telemetry のために中間値を expose する。** Premium と rate を、最終的な settlement だけでなく出力に surface する。下流の observer が再計算しなくて済む。**有用な中間値は surface する — 再計算は divergence を呼び込む。**

5. **Module doc で両不変条件を先頭に明示する。** 実際に強制するコードは段階的に積み上がる（L8 で guard、L9 で境界テスト、L10 で advancement の選択）が、*契約*そのものはコードに先立って documentation してある。**ドキュメンテーションが設計意図の保管庫になる。**

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

**Q: `tick` が `&mut self` を取って、`self` を消費する形で `(Self, Option<FundingTick>)` を返さないのはなぜか？**
実用主義による選択だ。`&mut self` は in-place な変更を表す Rust の標準パターンだ。消費して返す形にすると、呼び出し側に `clock = clock.tick(...)` のような再代入を強いることになる — semantic な利得もなく、ただ verbose になるだけだ。**state machine が mutate するなら `&mut self`、本当に変換するなら consuming にする。** Funding clock は前者にあたる。

**Q: `FundingClock` は tick の*回数*も追跡すべきでは（telemetry 用に）？**
`ticks_fired: u64` のカウンタを足すこともできる。Stage 8b ではやらない — 呼び出し側が気にするなら外部でカウントすればよい。**具体的な consumer がいないうちは、最小限の struct に state を足さない。** 後から足すのは struct のフィールドを 1 つ変更するだけで済むが、未使用な state を削除するのは breaking な API 変更になる。

**Q: `tick` が `mark`、`index`、`positions` を引数で取り、clock に持たせないのはなぜか？**
これらは tick ごとに変わるからだ。`mark` と `index` は tick 時点の oracle / orderbook の read から来るし、`positions` は fresh なスナップショットだ。これらを clock に保存すると、`tick` を呼ぶ前に呼び出し側がそれらを更新する必要が生まれる — やることは同じなのに手順が増える。**呼び出しごとに変わる入力は引数に、永続化したい入力は receiver に持たせる。**

**Q: Clock の proptest がないのはなぜか？**
Clock の property はほぼすべて*interval semantics*（interval ごとに 1 settlement、no catch-up）に関するもので、手書きトレースのテストで表現しやすいからだ。Module 2 の antisymmetry や zero-sum のような代数的な property は存在しない。**Clock は event loop であり、event loop は代数ではなくシナリオでテストする。**

## 次のレッスン（L9）

L9 では `clock.rs` にテストを 3 つ追加し、**interval-gating 不変条件**を段階的に深掘りしていく：

- `premium_drives_settlement_signs` — mark > index のとき、settlement が long → short の方向に流れる（数学の composition を full に検証するテスト）。
- `second_tick_requires_another_full_interval` — 成功した tick の後、次の tick には別途 `interval_secs` 分の経過が必要だ。interval のチェックは 1 度きりではない。
- `capped_rate_when_premium_extreme` — saturate するほど大きな premium のときに、rate が cap で clamp される。`compute_rate` の cap 挙動が clock 経由でも正しく surface することを確認する。

レッスンの中身はほぼすべて、*テスト*と *interval-gating* 不変条件についてのものになる。**L10 では Module 3 を no-catch-up 不変条件で閉じる。**
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
