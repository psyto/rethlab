# Building OpenHL Liquidation — L8 draft (JA) — build-along

> openhl SHA `260883b`（Stage 10b — insurance fund state machine + close-outcome decomposition）に対するドラフト。

## L8 — `openhl-liquidation-insurance-fund-intro-ja`

**Stage**: Stage 10b — `260883b`

**Title**: レッスン 8 — `InsuranceFund` — クレートが純粋でなくなる地点

**Duration**: 25 分 · **XP**: 50

---

````markdown
# レッスン 8 — `InsuranceFund` — クレートが純粋でなくなる地点

## ゴール

このレッスンで掴む概念:

- **Pure → stateful の境界。** Stage 10a の `compute.rs` は pure だった。どの関数も引数からの決定的な投影でしかなく、いつでも再計算できた。Stage 10b で liquidation crate に初めて state が登場する — insurance fund の蓄積される balance だ。なぜか。Fund は単一のスナップショットに閉じた事実ではなく、そこに至る **履歴そのもの** の事実だからだ。**State がコードに現れるのは、入力から再導出できなくなる地点だけ。**
- **`balance ≥ 0` という型不変条件。** すべての public 操作がこれを保つ。フィールドの型は `i64`（crate の他のところと算術の型を揃えるため）だが、**不変条件はコードで守られる — 型システムが守るのではない**。`new(-500)` は 0 にクランプする。`deposit(-50)` は no-op になる。`withdraw_shortfall(...)` は 0 で飽和して、不足分は `WithdrawOutcome`（L9 で）として表面化する。規律はこうだ: **すべての public メソッドを「不変条件を保つ遷移」として書く。**
- **境界の防御 vs 関数の防御。** `compute` モジュールは入力を信用する。`insurance` モジュールは信用しない。違いはこうだ。`compute` は pure な投影 — 呼び出し側が valid な `AccountSnapshot` をすでに組み立てている。`InsuranceFund` は *境界そのもの* — bridge、scanner、（後の）ADL ルーチンがそれぞれ異なるレイヤーから呼んでくる。どれか 1 つに bug が混入しうる。**多くの呼び出し側を集約する境界でこそ、defensive coding が意味を持つ。**
- **コンセンサス state における saturating 演算。** `deposit` は `+` ではなく `saturating_add` を使う。理由は「dev で panic を避けるため」だけではない。Rust の `+` 演算子はビルドプロファイルで *2 つの* failure mode を持つ。**Debug ビルドでは overflow に panic する** (1 つの validator がクラッシュ、他は走り続け → fork)、**release ビルドではサイレントに wrap する** (2 の補数の剰余演算で、validator ごとに異なる `i64` を生む → fork)。Release の wrap こそが厄介だ — クラッシュなし、エラーなし、ただ state の不一致が起きる。`saturating_add` は `i64::MAX` (または `MIN`) にあらゆるビルドプロファイルで clamp する。全 validator が同じ値を見る、コンパイラフラグが何であれ。**Saturation はコンセンサス安全な算術規律だ。**

確認:

```bash
cargo test -p openhl-liquidation
```

…で 33 テストが pass する（L0-L7 の 24 + 構築 + deposit の新規テスト 9）。残りの withdraw・proptest 系 22 ケースは L9 で着地する。

具体的な変更:

- **`src/insurance.rs`。** 新規モジュールファイル。`InsuranceFund` 構造体、3 種類のコンストラクタ（`new` / `empty` / `Default::default`）、`balance()` アクセサ、`deposit()` 変更子、9 個の unit test を追加。
- **`src/lib.rs`。** `pub mod insurance;` と `InsuranceFund` の re-export を追加。

L8 で `insurance.rs` のおおよそ半分を着地させる。Withdraw path —`WithdrawOutcome` enum を含む — は L9 で閉じ、insurance fund モジュールの capstone になる。

## おさらい

L7 の後:
- `compute.rs` は Stage 10a で完成: 6 関数（`notional_value`、`unrealized_pnl`、`account_equity`、`margin_ratio`、`margin_health`、`close_order_spec`）と `saturate_i128_to_i64` ヘルパー。
- `lib.rs` は compute 関数 6 個と Stage 10a の型をすべて re-export 済み。
- `cargo test` は 24 テストを走らせ、すべて green。
- クレートは **純粋関数的**だった: `&mut self` なし、モジュール level state なし、すべての関数が引数だけから返り値を導く。

L8 で Stage 10b が始まる。最初の変化は、クレートが純粋関数的でなくなることだ。

## 計画

編集は 3 つ:

1. **`crates/liquidation/src/insurance.rs` を新規作成。** `InsuranceFund` 構造体、コンストラクタ 2 種類、`balance()` アクセサ、`deposit()` 変更子、`WithdrawOutcome` enum scaffold（L9 で使う）、9 個の unit test（構築 + deposit）。
2. **`crates/liquidation/src/lib.rs` に `pub mod insurance;` と re-export を追加。**
3. **`lib.rs` 冒頭の roadmap コメントを更新。** Stage 10b が進行中であることをマーク。

> 🛑 **予測。** 続きを読む前に考えてほしい。「balance フィールド 1 つの state machine」で、複数の呼び出し側にまたがって `balance ≥ 0` を保つために必要な最小限の防御面はどこか? 具体的には: **`new(initial: i64)`、`deposit(fee: i64)`、`withdraw(amount: i64)`** — この 3 つのうち、どこで何を防御する必要があるか?

（答え: **3 つすべて。** `new` は負の初期値を防ぐ — 0 にクランプする。`deposit` は負の fee を防ぐ — no-op にする（負の fee を素通ししたら fund がこっそり drain される）。`withdraw` は (a) 負の shortfall を防ぐ — amount = 0 の Covered として扱う、(b) balance を超える amount を防ぐ — 0 まで drain して残りを surface する。それぞれの防御が必要なのは、public API が複数のレイヤーから呼ばれるからだ。**bad な呼び出しが 1 つ来ただけで、型不変条件を破ってはならない。** L8 は `new` と `deposit` をカバーする。L9 が `withdraw` を扱う。）

なぜ state がここに現れるのか — アーキテクチャ図で押さえておく:

```
   ┌────────────────────────────────────────────────────────────────┐
   │ Stage 10a — pure compute (compute.rs)                          │
   │                                                                │
   │  margin_health(snapshot, mark, params) → MarginHealth          │
   │  margin_ratio(snapshot, mark)          → MarginRatio           │
   │  close_order_spec(snapshot)            → CloseOrderSpec        │
   │                                                                │
   │  すべての結果は入力からの投影。永遠に再計算可能。              │
   └────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ Stage 10b — state machine (insurance.rs)                       │
   │                                                                │
   │  InsuranceFund { balance: i64 }   ← fund が蓄積する             │
   │      .deposit(fee)                ← fee が fund に CREDIT       │
   │      .withdraw_shortfall(amount)  ← 不足が fund から DEBIT      │
   │      .balance()                   ← 現在の蓄積値                │
   │                                                                │
   │  Balance は *履歴* の事実であって、入力 1 個の事実ではない。    │
   │  (deposit, withdraw) の 2 系列が異なれば balance も異なる —     │
   │  最終呼び出しの引数が同一でも、結果は変わる。                    │
   └────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
   ┌────────────────────────────────────────────────────────────────┐
   │ Stage 10c — scanner (scanner.rs, L11–L12)                      │
   │                                                                │
   │  InsuranceFund を所有し、liquidation event ごとに                │
   │  .deposit / .withdraw_shortfall を呼ぶ。結果を ScanReport に     │
   │  集約する。                                                       │
   └────────────────────────────────────────────────────────────────┘
```

ポイントは「**pure compute は返す。Stateful なモジュールは蓄積する。**」 Stage 10a はエンジンに「各アカウントについて世界がどう見えるか」を教えた。Stage 10b はエンジンに「アカウント間・ブロック間で何が起きたかを記憶する」能力を与える。両者を orchestrate するのが scanner（L11-L12）だ。

## 手を動かす walk-through

### Step 1: `src/insurance.rs` を新規作成

`crates/liquidation/src/insurance.rs` を新規作成する。まずモジュール全体の doc コメントから。このプリアンブルはモジュール内で最も読まれる散文だ — doc generator も `cargo doc` の読者も、すべての関数より先にここを見る。

```rust
//! Insurance fund state machine (Stage 10b).
//!
//! The insurance fund is the venue's pooled buffer that absorbs the
//! deficit when a Liquidatable account's close turns underwater, or when
//! an Underwater account is liquidated outright. It accumulates the
//! liquidation fees that solvent closes pay in. Stage 10c's scanner will
//! own an [`InsuranceFund`] and call its deposit / withdraw operations
//! from the per-account liquidation loop.
//!
//! ### Why stateful here when the rest of the crate is pure
//!
//! Margin classification, fee math, and close-outcome computation
//! ([`crate::compute`]) are pure functions over per-account snapshots —
//! they can be re-evaluated lossless at any time. The insurance fund's
//! balance, in contrast, accumulates effects from many liquidation events
//! across many blocks; it is genuinely state. The shape mirrors
//! `openhl_funding::clock` — a small state machine, owned by the bridge,
//! mutated only on well-defined boundary events.
//!
//! ### Sign discipline
//!
//! The balance is `i64` internally for arithmetic uniformity with
//! [`crate::compute`], but the type invariant is **`balance ≥ 0`** —
//! every public operation preserves it. Withdrawals that exceed the
//! balance saturate at 0 and surface the unfilled portion via
//! [`WithdrawOutcome`]. Stage 10c's scanner reads the unfilled portion
//! as the trigger to escalate to ADL (Stage 10d).
//!
//! ### Deposit semantics
//!
//! `deposit` accepts a non-negative fee amount. Negative deposits are
//! treated as zero (saturating semantics, no panic) — defensive coding
//! against accidental misuse from the caller. Saturating-add caps at
//! `i64::MAX` for network-pathological accumulated balances.
```

このプリアンブルで押さえる点が 4 つ:

1. **冒頭は *型* ではなく *役割* から始まる。** 「The insurance fund is the venue's pooled buffer that absorbs the deficit…」 — 最初の 1 文だけ読んだ読者でも、このモジュールが safety-net cascade のどこに座っているかが分かる。**モジュール doc は「続きを読むかどうか」を決める人が読む。役割から始めろ。**
2. **Stage 10c と Stage 10d を名指しで引用している。** 読者のチェックアウトにはまだ存在しないステージだが、doc は先回りして引用する。読者は「このモジュールは計画された arc の一部だ — 単発の追加ではない」と分かる。**Doc の forward reference は未来との契約だ:「これはどこかへ向かっている」と言っている。**
3. **Sign-discipline セクションは Rust の型システムの話 *ではない*。** 型が *enforce しない* 不変条件についての話だ。**コンパイラがチェックできない不変条件を doc に書け。チェックできるものはコンパイラがすでに doc 化している。**
4. **`openhl_funding::clock`** はクロスモジュール引用で、読者がすでに見たパターン — 小さい state machine、bridge が所有、境界イベントだけで mutation — を指している。新しいモジュールを既知のモジュールに錨で結べば、学習曲線が短くなる。**新しいパターンを導入するときは、コードベース内の同じパターンの先例を指せ。**

### Step 2: `InsuranceFund` 構造体とコンストラクタを追加

Doc コメントの下に、構造体定義と 3 種類のコンストラクタを追加する:

```rust
/// The insurance fund's accumulating balance.
///
/// Owned by the bridge (Stage 10c+), exposed via deposit / withdraw
/// operations that maintain the `balance ≥ 0` invariant.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InsuranceFund {
    balance: i64,
}
```

構造体の形について 2 点:

1. **フィールドは private（`balance: i64`、`pub` なし）。** これが `balance ≥ 0` を enforce する仕組みのすべてだ。もし `balance` が public だったら、呼び出し側はいつでも `fund.balance = -1` と書けて、契約を sneaky に破れる。**Private フィールドは Rust 流の「この不変条件があります — 公開メソッド経由で変更してください」の表現方法だ。**
2. **`Clone + Copy + Debug + PartialEq + Eq`。** `i64` フィールド 1 つの構造体でコンパイラが自動 derive できるトレイトを、すべて derive する。値渡しが安く、テストで assert しやすく、proptest で比較しやすい。**Pure-value 型に対しては、標準の 4 つ（または `Hash` を含めて 5 つ）を躊躇なく derive する。**

次にコンストラクタ:

```rust
impl InsuranceFund {
    /// Create a fund with the given initial balance.
    ///
    /// Negative initial balances are clamped to zero — defensive against
    /// accidental misuse. A negative initial balance can't represent any
    /// physical state of the fund and would violate the type invariant.
    #[must_use]
    pub const fn new(initial_balance: i64) -> Self {
        Self {
            balance: if initial_balance > 0 {
                initial_balance
            } else {
                0
            },
        }
    }

    /// An empty fund; equivalent to [`InsuranceFund::new(0)`].
    #[must_use]
    pub const fn empty() -> Self {
        Self { balance: 0 }
    }

    /// Current balance of the fund. Always `≥ 0`.
    #[must_use]
    pub const fn balance(&self) -> i64 {
        self.balance
    }
}

impl Default for InsuranceFund {
    fn default() -> Self {
        Self::empty()
    }
}
```

押さえておく点が 5 つ:

1. **`new` は負の値を黙って 0 にクランプする。** `Result<Self, ...>` でも panic でもない。なぜか。負の初期 balance の *物理的意味* が未定義だからだ — 借金を持つ fund は fund ではない。**Bad な入力に対して妥当な解釈が「最も近い valid な入力にする」しかない場合、儀式抜きでそうする。** ここで `Result` を返すと、すべての呼び出し側が「起きないはずのエラー」をハンドルさせられる。Panic にすると debug-vs-release で挙動が割れる。クランプが最も安価で正しい答えだ。
2. **`new(0)` と同じことをするのに `empty()` が存在する。** 理由は 2 つ。第一に、呼び出し地点で `InsuranceFund::empty()` のほうが `InsuranceFund::new(0)` より意図が読める — 数字でなく意図を運ぶ。第二に、`empty` は `Default::default()` が呼ぶ先でもあり、2 つの異なる名前 (インターフェース) が同じ構築ロジックを指すことになる。**Canonical な zero value 用に名付けたコンストラクタを置くと、ちょっとした明快さの利息が複利で効いてくる。**
3. **フィールドに触れるすべてのメソッドが `const fn`。** 構造体は `i64` フィールド 1 つだけ。state を mutation しない処理は trivially const-evaluable だ。将来のコードは `InsuranceFund` を const 文脈（config struct のデフォルトなど）で使える。読者にも「このメソッドは fancy なことをしません」と伝わる。**`const fn` は能力であると同時にドキュメントだ。**
4. **`new` と `empty` に `#[must_use]`。** Fund を作って捨てるのはほぼ常に bug だ — 大抵リファクタリングの残骸。`#[must_use]` でコンパイラに警告させる。**「明らかに間違っているが見落としやすい」ケースをマーカー属性が拾う。**
5. **`Default::default()` は手動 impl で、derive ではない。** Derive した `Default` は `balance: i64` から `balance: 0` を生む — 結果は同じだ。だが、手動 impl で `Self::empty()` を呼べば *意図* が明示される: 「デフォルト fund は empty fund だ — 設計でそうしている、偶然そうなったのではない」。**Default 値が「ゼロ初期化」を超える semantic な意味を持つときは、手動 impl の価値がある。**

> 🛑 **やりがちな勘違い。** 「`pub fn new(initial_balance: u64) -> Self` ではダメか — `u64` なら不変条件は型で defended されて、コードで守る必要がない、と思える」 問題が 3 つある。(1) クレート他箇所は `i64` を fungible amount（`pnl`、`equity`、`collateral`）に使っている。1 つの境界だけ型を変えれば、すべての呼び出し地点でキャストを書かされる。(2) 演算で i64 を使う validator 側のコードは、fee 計算で `u64::try_from` の checked を要求される — saturation で足りるところに panic を植える。(3) `balance ≥ 0` の不変条件はどのみちコードで enforce されるので、型レベルの安全性は屋上屋を架すだけになる。**周辺の型規律に合わせろ — そして crate の他箇所がやっているのと同じ場所で不変条件を防御しろ。**

### Step 3: `WithdrawOutcome` enum scaffold を追加

L8 は `withdraw_shortfall` を実装しないが、L9 の変更が `impl InsuranceFund` への純粋な追加 (enum 導入による churn なし) で済むよう、`WithdrawOutcome` を今宣言しておく。**`impl InsuranceFund` ブロックの上**に追加:

```rust
/// Outcome of attempting to absorb a shortfall via
/// [`InsuranceFund::withdraw_shortfall`].
///
/// The three variants are exactly the three transitions across the
/// "Layer 2 → Layer 3" boundary in the safety-net cascade:
///   - [`WithdrawOutcome::Covered`] — the fund had enough; Layer 2
///     fully absorbed the deficit.
///   - [`WithdrawOutcome::PartiallyDrained`] — the fund drained to
///     zero and covered part of the shortfall; the remainder must
///     escalate to Layer 3 (ADL).
///   - [`WithdrawOutcome::Depleted`] — the fund was already empty
///     before the call; nothing covered, full shortfall escalates.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WithdrawOutcome {
    /// Fund had enough balance to cover the request in full.
    Covered {
        /// Amount paid out of the fund (= requested shortfall).
        amount: i64,
    },
    /// Fund partially covered the shortfall before draining to zero.
    PartiallyDrained {
        /// Amount actually paid out (= fund's prior balance).
        amount: i64,
        /// Remaining shortfall that the caller must escalate to ADL.
        unfilled: i64,
    },
    /// Fund was already empty; nothing was paid out.
    Depleted {
        /// Full shortfall that must escalate to ADL.
        unfilled: i64,
    },
}
```

この enum は **L8 で宣言し、L9 で使う**。L8 で導入する理由:

1. **Enum の存在自体が public surface の物語の一部だ。** L8 後に `insurance.rs` を眺める読者は、メソッドが後回しでも、モジュールの型語彙を一目で見られる必要がある。**メカニズムの前に語彙を見せる。**
2. **各 variant が自分の payload を運ぶ。** `Covered` と `PartiallyDrained` はどちらも `amount`（実際に支払われた額）を運び、`PartiallyDrained` と `Depleted` はどちらも `unfilled`（scanner がエスカレートすべき額）を運ぶ。L9 の proptest `withdraw_amount_plus_unfilled_equals_shortfall` は両者を結ぶ保存則だ — だが variant の payload の形を見るだけで、保存則の輪郭はすでに読める。**Self-describing な variant は、コンパイラが enforce する文書だ。**
3. **doc コメントの `Layer 2 → Layer 3 boundary` がカスケード・アーキテクチャを明示する**: margin（Layer 1、Stage 10a） → fund（Layer 2、Stage 10b） → ADL（Layer 3、Stage 10d）。読者はこの enum を見るたびに地図を手に入れる。**アーキテクチャの継ぎ目に座る型には、doc でその役割を書け。**

### Step 4: `deposit` メソッドを追加

既存の `impl InsuranceFund` ブロックに `deposit` を追加:

```rust
    /// Credit the fund with a fee. Returns the new balance.
    ///
    /// Negative inputs are treated as a no-op (defensive against the
    /// caller passing a signed value where the contract expects a credit).
    /// Saturates at `i64::MAX` for network-pathological accumulated
    /// balances.
    pub fn deposit(&mut self, fee: i64) -> i64 {
        if fee > 0 {
            self.balance = self.balance.saturating_add(fee);
        }
        self.balance
    }
```

押さえる点が 5 つ:

1. **`fee > 0`（strict）。** Fee = 0 も no-op なので、`>` と `>=` の挙動はゼロでは同じだ。Strict 形だと、分岐は「実際に仕事があるとき」だけ発火する。**Side effect を gate する述語では、ゼロが no-op のとき `> 0`（「これは意味があるか?」テスト）を `>= 0`（「これは非負か?」テスト）より優先する。**
2. **負の入力は黙って無視される。Panic も Error も出さない。** なぜか。代替案がコンセンサスにとって致命的だからだ。Panic-on-negative にすると、bridge bug で負の fee が 1 度来た瞬間、1 つの validator は halt し、他は走り続ける — Rust の panic セマンティクスはここで特に酷い（debug vs release、hook の差、etc.）。`Result<i64, ...>` を返せば、scanner のすべての呼び出し側に `unwrap`（panic を別名で）かエラー型のスレッディング（うまく扱える場所がない）を強要する。**Saturating-no-op がコンセンサスの決定性を無料でくれる。**
3. **`saturating_add` であって `+` ではない。** `+` を使うと 2 つの failure mode が出る。Debug ビルドでは `100i64 + i64::MAX` がオーバーフロー panic する (1 つの validator が halt、他は走り続け → fork)。Release ビルドではサイレントに負の値に wrap する — *これは `balance ≥ 0` の不変条件を破ると同時に、同じ演算を扱った peer ごとに異なる `i64` を生む → fork*。`saturating_add` はあらゆるビルドプロファイルで `i64::MAX` に頭打ちにする。全 validator が同じ数を見る。ネットワークが `9.2 × 10^18` を超える fee を蓄積することはどのみち起きないし、cap は病理的でない state では不可視だ。**`saturating_*` ファミリはコンセンサス安全な算術ファミリ。**
4. **新しい balance を返す。** 呼び出し側はそれを log したいケースがよくある（「fee credited: 150、fund balance now: 2,400,150」）。`let _ = f.deposit(150); let new_balance = f.balance();` の二段書きより、チェーンしたほうがきれい。`&mut self`-and-returns は標準ライブラリにもあるパターン（`HashMap::insert` が古い値を返すなど）。**有用な state を返す `&mut self` メソッドは、追加の `balance()` 呼び出しを省ける。**
5. **doc 文字列が「non-negative fee amount」と言い、実装は負も扱う。** 矛盾ではなく defensive ドキュメントだ。Doc は「こう渡してください」を言い、実装は「でも garbage が来てもクラッシュしません」を言う。**意図する契約を doc に書き、慈悲深い失敗モードを実装する。**

### Step 5: `lib.rs` にモジュールを配線

`crates/liquidation/src/lib.rs` を開く。2 つの変更を入れる。

まず、モジュール宣言。既存の `pub mod compute;` と `pub mod types;` のブロックの間に `insurance` を挿入:

```rust
pub mod compute;
pub mod insurance;
pub mod types;
```

次に、`InsuranceFund` re-export を追加。既存の `pub use compute::{ ... };` ブロックの後に `insurance` re-export を加える:

```rust
pub use compute::{
    account_equity, close_order_spec, margin_health, margin_ratio, notional_value, unrealized_pnl,
};
pub use insurance::{InsuranceFund, WithdrawOutcome};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, MARGIN_SCALE,
};
```

型と enum、両方を一度に re-export する。なぜ両方を今? **クレートの利用者は呼ぶものを import するから**だ。L9 の `withdraw_shortfall` を呼ぶ path はすぐに `WithdrawOutcome` でパターンマッチする。L8 で enum を re-export しておけば、L9 では `lib.rs` に触れる必要がない。**Public surface はモジュール単位で一度だけ re-export する。メソッド単位ではない。**

### Step 6: 9 個の unit test を追加

`insurance.rs` の末尾にテストモジュールを追加:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // ─── construction ──────────────────────────────────────────────

    #[test]
    fn new_with_positive_balance() {
        let f = InsuranceFund::new(1_000);
        assert_eq!(f.balance(), 1_000);
    }

    #[test]
    fn new_with_zero_is_empty() {
        let f = InsuranceFund::new(0);
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn new_with_negative_clamps_to_zero() {
        let f = InsuranceFund::new(-500);
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn empty_is_zero() {
        let f = InsuranceFund::empty();
        assert_eq!(f.balance(), 0);
    }

    #[test]
    fn default_is_empty() {
        let f = InsuranceFund::default();
        assert_eq!(f.balance(), 0);
    }

    // ─── deposit ───────────────────────────────────────────────────

    #[test]
    fn deposit_accumulates() {
        let mut f = InsuranceFund::empty();
        assert_eq!(f.deposit(100), 100);
        assert_eq!(f.deposit(250), 350);
        assert_eq!(f.balance(), 350);
    }

    #[test]
    fn deposit_zero_is_noop() {
        let mut f = InsuranceFund::new(100);
        assert_eq!(f.deposit(0), 100);
    }

    #[test]
    fn deposit_negative_is_noop() {
        // Defensive: negative deposits must not silently drain the fund.
        let mut f = InsuranceFund::new(100);
        assert_eq!(f.deposit(-50), 100);
        assert_eq!(f.balance(), 100);
    }

    #[test]
    fn deposit_saturates_at_max() {
        let mut f = InsuranceFund::new(i64::MAX - 10);
        assert_eq!(f.deposit(1_000), i64::MAX);
    }
}
```

このテストモジュールの形について 6 点:

1. **`// ─── construction ───` のセクション見出し。** 罫線文字のコメントで 4 つの論理グループ（construction · deposit · L9 で: withdraw-covered · withdraw-partial · withdraw-depleted · sequencing · proptest）をマークする。最終的にこのモジュールは ~22 テスト持つ — セクション名で走査するほうが行番号でスクロールするより速い。**テストファイルが ~10 を超えるなら、グループ化する。**
2. **`new_with_zero_is_empty` は `new` のソースから自明に導けるのに、それでも存在する。** 冗長ではない — 挙動を lock するためのものだ。将来 `> 0` を `>= 0` に書き換えた場合（0 は両方の述語を正しく通すので）このテストでは捕れないが、typo を伴う書き換え（例: `if initial_balance < 0` への flip）は exactly このケースで落ちる。**小さい述語に対する境界テストは、大きいテストが取り逃す typo を捕える。**
3. **`new_with_negative_clamps_to_zero` は防御 surface を直接テストする。** *関数が動くこと* を検証するためのテストではない — *不変条件が保たれること* を検証するためのテストだ。将来のリファクタリングが `new` 内の見かけ上のデッドコード（クランプ）を「クリーンアップ」したら、このテストが捕える。**Defensive code のテストは defensive code を守る。**
4. **`default_is_empty` は 1 行で `Default` impl が `Self::empty()` を指していることを証明する** — derive されてないこと（derive でも `balance: 0` にはなるが、意図が違う）を locks。**テストは結果だけでなく、*どの経路がその結果を生むか* も lock できる。**
5. **`deposit_negative_is_noop` には `// Defensive` コメントがついている。** テストが守る failure mode を名前で呼ぶ:「負の deposit は fund を sneaky に drain してはならない」。将来このテストを削除しようとする読者がコメントを見て一旦考え直す。**簡潔なテストレベルのコメントは、テストを「不要」と思う将来のメンテナーへの足場だ。**
6. **`deposit_saturates_at_max` は初期 balance に `i64::MAX - 10` を使う。** なぜ `i64::MAX` ではないか。Max-balance fund への deposit はどのみち max で飽和する — テストは `saturating_add` を *`wrapping_add` に置換しても* 通る可能性がある。Wrap の挙動は `i64::MAX + anything ≥ 0` が負の値に wrap するが、`+1000` だと wrap して捕まる。Max の近くから始めれば、テストが saturation ロジックを *実際に発火* させる余地ができる。**Saturating 演算の境界テストは、境界が発火するためのバッファを取る。**

### Step 7: テストを走らせる

```bash
cargo test -p openhl-liquidation
```

期待される出力:

```
running 33 tests
test compute::tests::close_flat_has_zero_qty ... ok
test compute::tests::close_long_with_sell ... ok
test compute::tests::close_short_with_buy ... ok
test compute::tests::equity_can_go_negative ... ok
... (Stage 10a のテスト 21 個)
test insurance::tests::default_is_empty ... ok
test insurance::tests::deposit_accumulates ... ok
test insurance::tests::deposit_negative_is_noop ... ok
test insurance::tests::deposit_saturates_at_max ... ok
test insurance::tests::deposit_zero_is_noop ... ok
test insurance::tests::empty_is_zero ... ok
test insurance::tests::new_with_negative_clamps_to_zero ... ok
test insurance::tests::new_with_positive_balance ... ok
test insurance::tests::new_with_zero_is_empty ... ok

test result: ok. 33 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

**33 テスト pass。** Insurance fund モジュールが存在し、不変条件は enforce され、deposit のセマンティクスは locked。Withdraw（と `WithdrawOutcome` payload のセマンティクス）は L9 で着地する。

エラー時にありがちなパターン:

- **`new_with_negative_clamps_to_zero` が `assertion failed: f.balance() == 0 — left: -500, right: 0` で失敗。** `if initial_balance >= 0 { initial_balance } else { 0 }` と書いてしまっている — 負の値はクランプするが、`-500` を通してしまうケースだ。あるいはクランプを忘れて `Self { balance: initial_balance }` を書いている。`if` 条件を `> 0` で再確認する。
- **`deposit_saturates_at_max` がオーバーフロー panic で失敗。** `self.balance.saturating_add(fee)` ではなく `self.balance += fee` と書いている。Debug ビルドは overflow で panic する。Release ビルドは silently wrap する。`saturating_*` はコンセンサス安全な唯一の選択。
- **`deposit_negative_is_noop` が `left: 50, right: 100` で失敗。** `if fee > 0` ガードを忘れて `saturating_add(-50)` を走らせてしまっている — balance が 50 までデクリメントされる。Saturating add だけでは不変条件は守れない。述語が load-bearing だ。
- **`new_with_zero_is_empty` が `left: 1, right: 0` で失敗。** `if initial_balance > 0 { initial_balance } else { 1 }` のような else 分岐の typo。Else 分岐のリテラルを `0` で再確認。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **State は履歴が effective なレイヤーに現れる。** Fund の balance は「fund に対してこれまで起きたすべての deposit と withdraw」の事実だ。Snapshot 型はそれを表現できない — snapshot は「1 アカウント、1 瞬間」の事実だから。**入力からの再導出が不可能になる境界で初めて、コードに state が現れる。** Stage 10a は一方向の境界、Stage 10b は意図して反対側を踏み出した境界。

2. **`balance ≥ 0` の不変条件はコードで enforce、型システムでは enforce しない。** `balance: u64` にしてコンパイラに守らせることもできた。しなかった理由は、クレート他箇所が `i64` で計算しているからだ — u64 フィールドにすればすべての交差点でキャストを書かされる。判断は **型規律のトレードオフ**: クレート内部コードが最もきれいになる表現を選び、外部から untyped 入力を受け取るメソッドで不変条件を防御する。**クロスクレートの一様性が、フィールド単位の型安全性に勝つ — 不変条件が 1 行コードで済むなら。**

3. **Defensive code は境界に集中させ、コードベースに散らさない。** `compute.rs` はすべての入力を信用する。`insurance.rs` はすべての入力をチェックする。違いはこうだ。`compute.rs` は in-crate コードから呼ばれ、入力はすでに正しく構築されている。`insurance.rs` は境界 — bridge、scanner、ADL、（将来の）governance がすべて集まる点 — に座る。**1 つのモジュールが防御コストを払い、他は速く走る。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 260883b
diff -u ~/code/my-openhl/crates/liquidation/src/insurance.rs ./crates/liquidation/src/insurance.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L8 の後:
- **insurance.rs** は Stage 10b の `insurance.rs` の **118 行目まで一致**（`withdraw_shortfall`、proptest セクション、sequencing テストは L9 で着地）。具体的には: doc コメント + 構造体 + `WithdrawOutcome` enum + `deposit` で終わる `impl` ブロック + `impl Default` + `deposit_saturates_at_max` までのテスト。
- **lib.rs** は Stage 10b の `lib.rs` の `pub mod` 行と `InsuranceFund / WithdrawOutcome` re-export について **byte-for-byte 一致**。（`lib.rs` 冒頭の roadmap コメントも更新する — このレッスンでは optional な cosmetic edit だ。L9 で答え合わせと完全一致に持っていく。）

## よくある質問

**Q1: なぜ `Option<NonZeroI64>` などで不変条件を型レベルの事実にしないのか?**

そうすると、`compute.rs` のすべての利用者が算術のために option を unwrap させられる。`compute.rs` の関数群はゼロを正しく処理できることがすでに validate されている。`Option` 境界を通しても、保護できないものを保護しようとして dead 分岐が増えるだけだ。**型レベル不変条件は、多くの呼び出し側が値を *構造的に読む* ときには素晴らしい。多くの呼び出し側が値で *計算したい* だけのときには、相対的にメリットが薄い。**

**Q2: `deposit` は新しい balance ではなく `Result<i64, FundError>` を返すべきではないか?**

返さない。呼び出し地点で区別する価値のある failure mode が存在しないからだ。Saturation は silent でいい（正しい挙動だから — fund は実際に `i64::MAX` で頭打ちになる）。負の fee も silent でいい（呼び出し側の bug だから — `Result` を返せば scanner のすべての呼び出し地点でエラーハンドリングをスレッドさせられる、しかも結局そのエラーは無視するだけ）。**`Result` は呼び出し側に意味のあるアクションが取れるときに使え。ここではない。**

**Q3: `withdraw_shortfall` が L9 なのに、なぜ `WithdrawOutcome` を L8 で宣言するのか?**

理由が 3 つ。(1) Re-export 観点 — L8 で `lib.rs` が enum を export しておけば、L9 は `lib.rs` に触らない。(2) Public-surface の語彙観点 — L8 後に `insurance.rs` を眺める読者は、メソッドが後回しでも、モジュールの型語彙を一目で見られる必要がある。(3) Variant 群が safety-cascade アーキテクチャを文書化する — *形* が Layer 2 → 3 遷移のどこに fund が座るかを読者に教える。**型はコンパイルされるドキュメント。語れるときに宣言する、呼ぶときではなく。**

**Q4: `InsuranceFund` を独立した `i64` 値 + モジュールレベルの mutation 関数（global state っぽい形）にできるか?**

技術的にはイエス、メカニズム的にはノー。Stage 10c の scanner は fund を `LiquidationScanner` のフィールドとして所有する。Bridge が scanner を所有する。Fund を呼び出しスタックでスレッディングすれば（global state に手を伸ばす代わりに）、scanner が単体テスト可能になる。**コンセンサスに触れる state は既知のコンポーネントに所有させなければならない。「スタック位置による所有」が、複数の scanner を干渉なく共存させる規律になる。**

**Q5: なぜ `new` は `const fn` で `deposit` は違うのか?**

`new` は引数と `Self` コンストラクタしか読まない — `&mut self` 経由の mutation を含む処理がない。`deposit` は `self.balance` を mutate する — Rust は現状、非自明な const 型に対する `const fn` での mutation を許していない。`new` が const なら `static FUND: InsuranceFund = InsuranceFund::new(0);` がコンパイルできる — これがテストや（後の）default-config 定数に役立つ。**`const fn` にできるものは `const fn` にする — 境界は通常「関数が state を mutate するかどうか」。**

## 次のレッスン (L9) — `withdraw_shortfall`

L9 は withdraw path で `insurance.rs` を閉じる。L8 で宣言した `WithdrawOutcome` enum がついに使われる: `withdraw_shortfall(amount)` は fund に十分な balance があれば `Covered { amount }` を、0 まで drain したら `PartiallyDrained { amount, unfilled }` を、すでに空だったら `Depleted { unfilled }` を返す。

おもしろい点が 2 つ。(1) 3-variant の outcome は、safety-net cascade の Layer 2 → Layer 3 境界の **3 つの遷移そのもの** だ。(2) 4 つの proptest が保存則を enforce する — `balance_never_negative`、`deposit_is_additive`、`withdraw_amount_matches_balance_delta`、`withdraw_amount_plus_unfilled_equals_shortfall`。Proptest こそが、カスケード数学を「型システムでは表現しきれないが、プロパティとして検証可能」な形に押し上げる場所だ。

````

---

## Seed-file slot

L8 は新規 Module 3 の sortOrder 0 に入る:

```typescript
{
  title: 'レッスン 8 — InsuranceFund — クレートが純粋でなくなる地点',
  slug: 'openhl-liquidation-insurance-fund-intro-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 25,
  xpReward: 50,
  content: `# レッスン 8 — InsuranceFund — クレートが純粋でなくなる地点\n\n...`
},
```

Module 3 のメタデータ（新規）:

```typescript
3: { title: 'Insurance fund', sortOrder: 3 },
```

## SHA pinning discipline

L8 は `260883b`（Stage 10b）を引用する。L8 後、`insurance.rs` は答え合わせの `deposit_saturates_at_max` テスト境界まで一致。`withdraw_shortfall` + proptest + sequencing テストは L9 で着地する。L8 の lib.rs re-export — `InsuranceFund` と `WithdrawOutcome` の両方 — は Stage 10b の答え合わせと byte-for-byte 一致。

## 翻訳セルフレビュー（paste 前）

- **L8 は Liquidation コースで今のところ最長のレッスン**（25 分）。Crate 初の stateful モジュールを導入するという、概念的に大きな転換点を扱うので、長さは正当化される。後続の insurance レッスン（L9 + L10）は規律がすでに confirmed されている分、もう少し short にできる。
- **「Stage 10b begins」のフレーミング** が二重に load-bearing: 読者にマイルストーン通過を告げると同時に、章が pure compute から state-management 規律へと移行していることを警告する（注意深く読むべき場所だと知らせる）。
- **`WithdrawOutcome` を使わずに宣言する**のは意図的な教授デバイスだ — 語彙先、メカニズム後。読者は enum と出会い、3-variant の形を見て、Layer 2 → 3 境界を名指す doc コメントを読む。L9 で `withdraw_shortfall` が実装されるころには enum はすでに馴染みのものになっている。これは L0 で「safety-net cascade」の概観を、どのレイヤーも実装される前に与えるのと同じ手法。
- **「Things to notice」リストが 6 個** 登場する — 重要なコード追加ごとに 1 個。各リストは 4-6 項目で、異なる軸（正しさ・性能・スタイル・defensive・composability）に触れる。パターンは一貫しているので、後続の L9-L15 レッスンを scan する読者は「内面化すべきもの」を探す場所を知っている。
- **「コンセンサス決定性」フレーミング**を Step 4 の deposit メモで初めて explicit に名指す: コンセンサス state の算術はアプリ算術と違う、ということ。このフレーミングはコース後半で繰り返し現れる。Saturation が初めて重要になる場所で導入することで、scanner（L11-L12）が batch 処理でこの規律をスレッディングし始める前に、読者に正しいメンタルモデルを与える。

### JA 特有のスタイル決定

- **専門用語は英語のまま** (`balance`、`state machine`、`saturating_add`、`Liquidatable` など)。本シリーズの先行レッスンの慣例に従う。L0-L7 の用語選びと一貫させる。
- **Code コメントは英語のまま** (`// Defensive: ...`、`// ─── construction ───`)。答え合わせと byte-for-byte 一致させるため。
- **`load-bearing` は意訳せず英語のまま使用。** 本シリーズで定着した表現。「決定的な」「核心となる」より rhetoric の鋭さが残る。
- **「defensive coding」「pure compute」「state machine」もカタカナ化せず英語のまま** — 「防御的コーディング」と「pure compute」では精度が違うため。読者は L0 から両者を使い分けてきている。
