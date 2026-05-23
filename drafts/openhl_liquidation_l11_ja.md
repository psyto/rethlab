# Building OpenHL Liquidation — L11 draft (JA) — build-along

> openhl SHA `0a8464e`（Stage 10c — multi-account liquidation scanner）に対するドラフト。

## L11 — `openhl-liquidation-scanner-types-ja`

**Stage**: Stage 10c — `0a8464e`

**Title**: レッスン 11 — Scanner 型の語彙 — `CloseOutcomeKind`、`LiquidationRecord`、`ScanReport`、`LiquidationScanner`

**Duration**: 25 分 · **XP**: 50

---

````markdown
# レッスン 11 — Scanner 型の語彙 — `CloseOutcomeKind`、`LiquidationRecord`、`ScanReport`、`LiquidationScanner`

## ゴール

このレッスンで掴む概念:

- **Orchestration 層には compute や insurance とは別の型語彙が必要だ。** Stage 10a は `MarginHealth`（per-account 分類）を生んだ。Stage 10b は `SolventClose` / `UnderwaterClose`（per-close 分解）と `WithdrawOutcome`（per-fund-call outcome）を生んだ。Stage 10c は *batch-level* の型を導入する。`CloseOutcomeKind`（このアカウントの close はどの kind だったか）、`LiquidationRecord`（liquidate されたアカウント 1 件あたりの row）、`ScanReport`（1 回の scan で起きたすべて）。**アーキテクチャの各層は異なる問いに答える。だから各層が独自の型語彙を持つ。**
- **`CloseOutcomeKind` は `SolventClose` と `UnderwaterClose` の discriminated union — L9 の `WithdrawOutcome` と同じ shape、別の語彙。** Variant が 2 つ。それぞれが対応する Stage 10b 関数の生んだ struct を運ぶ。Scanner はこの enum を pattern-match して post-close の仕事（fund deposit、fund withdraw、escalation 集計）を dispatch する。**上位層が下位層の 2 つの出力を route するとき、各出力を運ぶ variant が最もきれいな機械的橋渡しになる。**
- **`ScanReport` は per-account record の vector AND aggregate な fund-flow 合計の両方を含む。** Records vector は *audit trail*（liquidation 1 件あたり 1 行、iteration 順）。3 つの aggregate `i64`（`fund_deposits`、`fund_withdrawals`、`unfilled_deficit`）は *telemetry summary* — bridge が records を iterate せずに読める合計値だ。Scan loop 内で事前計算するのはコスト 0、bridge は両方ともほしい。**Record vector の隣にある aggregate フィールドは、caller が fold をする手間を省く。冗長ではなく、便利だ。**
- **`LiquidationScanner` は `InsuranceFund` を直接所有する。`Arc<Mutex<...>>` 経由ではない。** Scanner は per-bridge コンポーネントだ。共有リソースではない。Bridge が scanner を持ち、scanner が fund を持ち、fund が balance を持つ。Mutation は ownership tree をロック競合なしに下に流れる。**ブロックごとにちょうど 1 回 mutate される state machine は、同期プリミティブを必要としない。**

確認:

```bash
cargo check -p openhl-liquidation
```

…がクリーンに compile する。L11 では新規 test を追加しない。型語彙にはまだ testable な behavior がないからだ。L12 で `scan` メソッドと最初の 4 個の simple test、L13 で nuanced ケース + 4 proptest を追加する。L13 後で test 数は 68 になる。

具体的な変更:

- **`src/scanner.rs`。** 新規モジュールファイル。Module-level doc、`CloseOutcomeKind` enum、`LiquidationRecord` 構造体、`ScanReport` 構造体、`LiquidationScanner` 構造体、5 個の accessor（`new`、`with_empty_fund`、`fund_balance`、`fund`、`into_fund`）を追加。`scan` メソッドはまだない。
- **`src/lib.rs`。** `pub mod scanner;` と scanner 型 4 つの re-export を追加。

L11 で型語彙を整え、L12 で `scan` を実装する。

## おさらい

L10 の後:
- `compute.rs`、`insurance.rs`、`types.rs`、`lib.rs` が Stage 10b の `260883b` と byte-for-byte 一致。
- `cargo test` は 55 テストを走らせ、すべて green。
- Multi-account orchestration loop の *すべての部品* が揃った: margin 分類（`margin_health`）、close-order 生成（`close_order_spec`）、fee math（`liquidation_fee`）、close-outcome 分解（`solvent_close_outcome` / `underwater_close_outcome`）、insurance fund state machine（`InsuranceFund::deposit` / `::withdraw_shortfall`）。
- だが bridge はこれらの部品を毎ブロック自分で hand-wire しなければならない。

Stage 10c でそれらを再利用可能なコンポーネントに 1 回だけ組み立てる。Bridge がそれを所有する。Orchestration loop が `scan`（L12）、その契約 — `scan` が何を取って何を返すか — が L11 だ。

## 計画

編集は 3 つ:

1. **`crates/liquidation/src/scanner.rs` を新規作成。** `CloseOutcomeKind`、`LiquidationRecord`、`ScanReport`、`LiquidationScanner` を含む新規モジュール + 5 個の accessor。`scan` メソッドはなし（L12 で着地）。
2. **`crates/liquidation/src/lib.rs` に `pub mod scanner;` と re-export を追加。** 型 4 つが crate の public surface に加わる。
3. **`lib.rs` 冒頭の roadmap コメントを更新。** Stage 10c が進行中であることをマーク。

> 🛑 **予測。** 続きを読む前に考えてほしい。L12 で実装する `scan` メソッドは、毎ブロック `ScanReport` を返す。Report にどんなフィールドが入るべきか、思いつくだけ挙げてみる。次に、report 内部の *per-account record* にどんなフィールドが入るべきか?

（答え: **Scan report:** (a) liquidate されたアカウントごとの record 1 件、(b) fund に deposit した fee の合計、(c) fund が実際に支払った金額の合計、(d) fund が cover できなかった unfilled deficit の合計。**Per-account record:** (a) account ID、(b) bridge が submit する close-order spec、(c) pre-close 分類（traceability のため）、(d) post-close outcome 分解（solvent or underwater）。Scanner は同じデータの 2 つの view を bridge に渡す。CLOB submit ステップ用の per-account records と、telemetry / ADL escalation を O(1) で読める aggregate 合計だ。）

L11 の型レイヤリング画:

```
   ┌────────────────────────────────────────────────────────────┐
   │  L11 — orchestration 層の型                                  │
   ├────────────────────────────────────────────────────────────┤
   │                                                            │
   │  Per-account（classification 後）:                          │
   │  ─────────────────────────────                             │
   │  enum CloseOutcomeKind {                                   │
   │      Solvent(SolventClose),       ──→ Fund deposit + 返金   │
   │      Underwater(UnderwaterClose), ──→ Fund shortfall パス   │
   │  }                                                         │
   │                                                            │
   │  struct LiquidationRecord {                                │
   │      account, close_order, classification, outcome         │
   │  }                                                         │
   │                                                            │
   │  Per-batch:                                                │
   │  ──────────                                                │
   │  struct ScanReport {                                       │
   │      records: Vec<LiquidationRecord>,                      │
   │      fund_deposits:     i64,    ← Σ over records           │
   │      fund_withdrawals:  i64,    ← Σ over records           │
   │      unfilled_deficit:  i64,    ← Σ → ADL trigger          │
   │  }                                                         │
   │                                                            │
   │  Owner:                                                    │
   │  ──────                                                    │
   │  struct LiquidationScanner {                               │
   │      params: LiquidationParams,                            │
   │      fund:   InsuranceFund,    ← 所有、共有ではない          │
   │  }                                                         │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
```

レイヤリングで押さえる点が 3 つ:

1. **`CloseOutcomeKind` は Stage 10c で *唯一* の新しい enum だ。** 他はすべて struct。なぜか。Routing 判断（solvent vs underwater）は `compute` の `debug_assert!` ペア（L10）ですでに行われている。Enum は judgment を *carry through* するために存在する。*再判定する* ためではない。**Enum は還元不能な dispatch を encode する。Struct フィールドは並列なデータを encode する。**
2. **`LiquidationRecord` は `classification`（pre-close の `MarginHealth`）を運ぶ — bridge が derive できるにもかかわらず。** Close order を submit する bridge には実は要らない。必要としているのは *telemetry consumer* — 「Liquidatable と Underwater の close が時間別に何件か」をチャートにしたいダッシュボードだ。Record 内に保持すれば audit trail が self-contained になる。**Record フィールドは即時の caller ではなく downstream consumer のためにある。**
3. **`ScanReport` の 3 つの aggregate `i64` フィールドは別の fold ではなく scan loop 中で計算される。** Loop に足すコストは record 1 件あたり 3 回の `saturating_add` — 実質無料だ（scanner は record 1 件あたり既に 1 回触っているので）。**Single-pass loop 内で aggregate を事前計算するのは無料。Second pass で計算するのは無駄。**

## 手を動かす walk-through

### Step 1: `src/scanner.rs` を新規作成

`crates/liquidation/src/scanner.rs` を新規作成する。最初にモジュール全体の doc コメント — 決定性の契約と FIFO-fairness ポリシーを説明するアーキテクチャ概観だ:

```rust
//! Multi-account liquidation scanner (Stage 10c).
//!
//! The scanner is the orchestration layer that ties Stage 10a (margin
//! classification + close-order generation) and Stage 10b (insurance
//! fund + close-outcome decomposition) together. The bridge owns a
//! [`LiquidationScanner`], calls [`LiquidationScanner::scan`] once per
//! block (or per market-event tick) with the current accounts and mark,
//! and consumes the returned [`ScanReport`] to (a) submit the close
//! orders to the CLOB and (b) escalate any unfilled deficit.
//!
//! ### Determinism
//!
//! Every validator must produce byte-identical [`ScanReport`]s from the
//! same `(accounts, mark, params, fund_state)`. The scanner only uses
//! `Vec`'s ordered iteration and the fully-deterministic Stage 10a/10b
//! primitives, so determinism follows from caller-side ordering of the
//! accounts slice — **the bridge is responsible for handing accounts in
//! a deterministic order** (typically `account_id`-sorted).
//!
//! ### Fairness when the fund is partially drained
//!
//! When the insurance fund cannot cover every underwater shortfall in
//! one scan, the v0 policy is **first-come-first-served** in iteration
//! order. Earlier-iterated underwater accounts get covered; later ones
//! contribute to [`ScanReport::unfilled_deficit`]. This is the simplest
//! deterministic choice; production fairness designs (pro-rata draw,
//! priority by account leverage) can be layered on later without
//! changing the public type shape.
//!
//! ### ADL handoff (Stage 10d)
//!
//! [`ScanReport::unfilled_deficit`] is the load-bearing signal that the
//! fund couldn't absorb everything. Stage 10c records it; a future
//! Stage 10d would consume it to drive ADL ranking and force-close
//! profitable counter-positions. Until Stage 10d ships, the bridge can
//! either panic on `unfilled_deficit > 0` (conservative — halt the
//! chain) or log and continue (permissive — accept the deficit as a
//! protocol loss).
```

このプリアンブルで押さえる点が 5 つ:

1. **冒頭の 1 文で *誰が何を呼ぶか* を定義している。** 「The bridge owns a `LiquidationScanner`, calls `LiquidationScanner::scan` once per block, and consumes the returned `ScanReport`.」 最初の 1 文だけ読んだ読者でも、所有関係と呼び出しパターンが分かる。**Orchestration モジュールの doc は、最初の 1 文を呼び出しパターンに使う。**
2. **`Determinism` セクションが *誰が何の責任を持つか* を名指す。** Scanner は決定的だ — *accounts の決定的な順序が与えられれば*。順序の責任は *bridge* にある。決定性の契約をこう分けて書くのは誠実だ。Scanner は自分が所有しないものを enforce できない。**Caller が提供する不変条件に依存するモジュールは、その不変条件を名指し、caller を credit する。**
3. **`Fairness when the fund is partially drained` セクションが v0 ポリシー AND その後継を名指す。** First-come-first-served は最も simple な決定的選択。Pro-rata draw と leverage-priority は将来の設計。両方を名指すことで、ポリシーは public-type shape を変えずに *replaceable* になる。**ポリシーを選ぶときは、public type が余地を残す代替案を名指せ。**
4. **`ADL handoff` セクションが、まだ存在しない stage との統合方法を説明している。** Stage 10d は openhl roadmap の次の stage。L11 の scanner はすでに Stage 10d が必要とする signal（`unfilled_deficit`）を生んでいる。**Doc の forward reference は speculation ではない。次の stage が果たす integration contract だ。**
5. **Escalation の代替案（「panic vs log and continue」）** が Stage 10d shipping までのトレードオフを明示的に名指す。Early-stage chain をデプロイする読者は自分の選択肢を知る。**Deployer が直面する operational decision を doc に書く。API だけではなく。**

Doc の下に、scanner が使う import を追加:

```rust
use crate::compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, notional_value,
    solvent_close_outcome, underwater_close_outcome,
};
use crate::insurance::{InsuranceFund, WithdrawOutcome};
use crate::types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, SolventClose, UnderwaterClose,
};
use openhl_clob::AccountId;
use openhl_funding::MarkPrice;
```

Import ブロックがやけに広いのは、scanner が *すべてを compose する* からだ。Compute 関数 6 つ、insurance 型 2 つ、type-module 型 5 つ、cross-crate 型 2 つ。広さは意図的だ。「Stage 10c とは 10a + 10b のすべてが組み合わさったもの」という bill of materials になっている。**Import ブロックは、それが依存関係のインベントリであるとき、ドキュメントとして機能する。**

### Step 2: `CloseOutcomeKind` を追加

Imports の下に discriminated outcome enum を追加:

```rust
/// Discriminated outcome for a single liquidated account in a scan.
///
/// `Solvent` carries the [`SolventClose`] decomposition (full fee
/// collectable, residual returns to account). `Underwater` carries the
/// [`UnderwaterClose`] decomposition (partial or zero fee, shortfall the
/// fund must absorb).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CloseOutcomeKind {
    Solvent(SolventClose),
    Underwater(UnderwaterClose),
}
```

押さえる点が 4 つ:

1. **Enum は *tuple variant* enum だ。struct-variant enum ではない。** 各 variant が 1 つの positional payload を運ぶ。代替案の `Solvent { close: SolventClose }` は named-field destructuring（`CloseOutcomeKind::Solvent { close } => ...`）を要求する。Tuple variant なら `CloseOutcomeKind::Solvent(close) => ...` とクリーンに書ける。**Variant がちょうど 1 つの payload type を運ぶとき、tuple variant が struct variant に勝つ。**
2. **Enum は `Copy`** — `SolventClose` と `UnderwaterClose` がどちらも `Copy`（各々 i64 フィールド 2 つ）だからだ。値渡し、値での pattern-match、borrow 管理なし。**`Copy` 型を compose すると、エンジニアリングコスト 0 で `Copy` enum が生まれる。**
3. **Doc コメントが *2 つの payload* を明示的に名指す** — full-fee solvent vs partial-or-zero underwater。Enum signature を doc なしで見た読者は、`Underwater` に「zero fee, full shortfall」ケースが含まれることを知らない（L10 の doc は明らかにしたが）。ここでの cross-reference が読者の手間を省く。**上位層 enum が下位層 struct を運び、その下位 struct に subtle な internal ケースがあるとき、上位層の doc でそれらを名指す。**
4. **`match` 網羅性ヘルパー variant なし。** `_ => unreachable!()` 風の catch-all は要らない。Enum は variant がちょうど 2 つで、L10 で確立した discriminated-dispatch 空間を網羅する。**2-variant enum は最小の discriminated dispatch。拾うものがない。**

### Step 3: `LiquidationRecord` を追加

`CloseOutcomeKind` の下に per-account record 構造体を追加:

```rust
/// Per-account record produced by the scanner when an account is
/// liquidated. The bridge submits `close_order` to the CLOB; `outcome`
/// records the credit/debit decomposition the scanner already applied
/// against the [`InsuranceFund`].
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LiquidationRecord {
    pub account: AccountId,
    pub close_order: CloseOrderSpec,
    /// Pre-close classification from [`margin_health`]. `Liquidatable`
    /// or `Underwater`; `Safe`/`AtRisk` accounts never appear in a
    /// record.
    pub classification: MarginHealth,
    /// Decomposition of what happened in the close. Note that a
    /// `Liquidatable`-classified account can still produce an
    /// `Underwater` outcome when the fee tips post-close equity
    /// negative.
    pub outcome: CloseOutcomeKind,
}
```

押さえる点が 6 つ:

1. **フィールド 4 つ、うち 3 つが既存モジュールの `Copy` 型。** `AccountId`（`openhl-clob` から）、`CloseOrderSpec`（Stage 10a）、`MarginHealth`（Stage 10a）、`CloseOutcomeKind`（このモジュール）。既存の型を record に compose するのは無料だ。**新規フィールドを導入しない record 構造体は、純粋な語彙拡張 — 名前を付けて前に進む。**
2. **`classification` は `MarginHealth`、4 variant enum を運ぶ**（`Safe`、`AtRisk`、`Liquidatable`、`Underwater`）。Doc は record に現れるのは 2 つだけだと言う — 他の 2 つは `LiquidationRecord` に決して入らない（scanner が skip するからだ）。型は 4 値を *許す*; 契約は 2 値に narrow する。**型が実際に API が生む以上のケースを運ぶことはある。契約の narrowing は doc に書く、別の sub-enum ではなく。**
3. **`Liquidatable`-classified → `Underwater`-outcome のノートが key となる教授点だ。** フィールド名だけ読んだ読者は `classification == outcome` が常に成り立つと仮定するだろう。だが *classification* は pre-close equity を、*outcome* は post-close equity（fee が減らした）を使う。Stage 10a の `margin_health` と Stage 10b の `solvent_close_outcome` / `underwater_close_outcome` は、アカウントが fee-threshold のどちら側に着地するかで disagree しうる。具体例は L10 の `underwater_close_partial_fee_collection` テストだ: pre-close は `Liquidatable`（maintenance margin より上の正の equity を持つ）だが、close + fee で post-close equity が「ほしかった fee」を下回る — そのため *classification* は `Liquidatable` でも、*outcome* は `Underwater` 分岐に着地する。**関連する 2 つのフィールドが disagree しうるケースは document する。読者はそれ以外は常に agree すると仮定する。**
4. **構造体は `Copy`** — 4 フィールドすべてが `Copy` だからだ。`LiquidationRecord` は `Vec` に push される（`Vec` は `Copy` を要求しない）が、`Copy` のままにしておくと L12 の `scan` メソッドの per-iteration loop body が ergonomic になる — `.clone()` なし、borrow 管理なし。**フィールドが許すなら record 型を `Copy` にする。コストは 0、ergonomics は複利化する。**
5. **4 フィールドすべて `pub`。** `LiquidationRecord` は *value type* — bridge はフィールドを直接読む。Accessor で隠すと `record.account()` を強制し、`record.account` より得るものは何もない（守るべき invariant がない）。**データを運ぶためだけに存在する record では、public フィールドがメソッドに勝つ。**
6. **`Default` derive なし。** Default record は何を意味する? 空の `AccountId`、qty 0 の `CloseOrderSpec`、`Safe` classification、`Solvent(SolventClose::default())` outcome? どれも意味がない。**意味が「何か特定のことが起きた」である record では、`Default` を derive しない — encode すべき中立 state がない。**

### Step 4: `ScanReport` を追加

`LiquidationRecord` の下に batch-level の summary を追加:

```rust
/// Summary of a single scan pass. Includes per-account records plus
/// aggregate fund-flow totals for telemetry / escalation.
#[derive(Clone, Debug, PartialEq, Eq, Default)]
pub struct ScanReport {
    /// One record per liquidated account, in scan-iteration order. The
    /// bridge submits each record's `close_order` to the CLOB.
    pub records: Vec<LiquidationRecord>,
    /// Total fees credited to the insurance fund during this scan.
    pub fund_deposits: i64,
    /// Total amount the insurance fund actually paid out (sum of the
    /// `amount` field across `Covered` and `PartiallyDrained`
    /// withdrawals).
    pub fund_withdrawals: i64,
    /// Total shortfall the fund could NOT cover (sum across
    /// `PartiallyDrained.unfilled` and `Depleted.unfilled`). Stage 10d
    /// consumes this as the ADL trigger.
    pub unfilled_deficit: i64,
}
```

押さえる点が 6 つ:

1. **`ScanReport` は `Clone + Default` だが、`Copy` ではない。** `Vec` を含むからだ — heap-allocated でビット単位のコピーができない。Compiler がこれを enforce する: `Vec`-containing struct に `Copy` を派生させることはできない。**`Vec` の存在は compiler-enforced な「私は heap allocation を持つ」シグナルだ。**
2. **`Default` が derive されている — そして意味がある。** Empty scan（liquidatable アカウントなし）は `ScanReport { records: vec![], fund_deposits: 0, fund_withdrawals: 0, unfilled_deficit: 0 }` を生む。それはちょうど `Default::default()` がくれるもの、L12 の `scan` メソッドが initialize するものだ。**Default 値が実際の domain state を表すとき、`Default` は意味がある — ここでは「scan は何も返さなかった」。**
3. **`Vec` の隣に 3 つの `i64` aggregate** — `fund_deposits`、`fund_withdrawals`、`unfilled_deficit`。代替案 — `report.records.iter().map(|r| r.outcome.fee()).sum()` で計算する — は bridge が読むたびに records を iterate することを要求する。Scan loop 内で事前計算するのは record 1 件あたり O(1) extra で、bridge の O(n) fold を省ける。**Record vector の隣にある aggregate フィールドは caller が fold をする手間を省く。冗長ではない。**
4. **`fund_withdrawals` は `amount` の合計であって、`shortfall` の合計ではない。** 二度読む。Bridge が知りたいのは「fund が実際にいくら支払ったか?」、「いくら要求されたか?」ではない。2 つは fund が partial drain したときに違ってくる（`amount < shortfall`）。フィールド名は *支払われた* ものを反映し、*要求された* ものではない。**Aggregate フィールドは *起きたこと* を測る。*要求されたこと* ではない。**
5. **`unfilled_deficit` は 2 つの `WithdrawOutcome` variant にわたる合計だ。** 具体的には `PartiallyDrained.unfilled` AND `Depleted.unfilled`。Doc コメントが両方を名指す。`PartiallyDrained` しか頭にない読者は `Depleted` ケース（fund が呼び出し前から空だった）を見落とす。**Aggregate が enum variant にわたって合計されるとき、寄与する variant すべてを名指す。**
6. **`unfilled_deficit` は Stage 10d への *signal そのもの*。** Doc コメントがそう名指す。L11 の契約はこのフィールドが存在し正しく計算されること。Stage 10d の契約はこのフィールドを consume して ADL を駆動すること。**2 つの stage 間の handoff は、明確な名前と document された consumer を持つ i64 フィールドだ。**

### Step 5: `LiquidationScanner` 構造体 + accessors を追加

`ScanReport` の下に scanner struct と accessor を追加:

```rust
/// Multi-account liquidation scanner.
///
/// Owns an [`InsuranceFund`] and a set of [`LiquidationParams`]. The
/// bridge calls [`Self::scan`] once per block; the scanner classifies
/// every account, generates close orders for the Liquidatable/Underwater
/// ones, mutates the fund accordingly, and returns the resulting
/// [`ScanReport`].
#[derive(Clone, Debug)]
pub struct LiquidationScanner {
    params: LiquidationParams,
    fund: InsuranceFund,
}

impl LiquidationScanner {
    /// Construct a scanner with the given params and a starting fund
    /// balance.
    #[must_use]
    pub const fn new(params: LiquidationParams, fund: InsuranceFund) -> Self {
        Self { params, fund }
    }

    /// Construct a scanner with the given params and an empty insurance
    /// fund. Convenience for tests and fresh-chain bootstrap.
    #[must_use]
    pub const fn with_empty_fund(params: LiquidationParams) -> Self {
        Self {
            params,
            fund: InsuranceFund::empty(),
        }
    }

    /// Current insurance fund balance.
    #[must_use]
    pub const fn fund_balance(&self) -> i64 {
        self.fund.balance()
    }

    /// Borrow the underlying insurance fund (read-only).
    #[must_use]
    pub const fn fund(&self) -> &InsuranceFund {
        &self.fund
    }

    /// Consume the scanner and return its fund — useful for handoff to
    /// snapshot/persistence layers at chain shutdown.
    #[must_use]
    pub fn into_fund(self) -> InsuranceFund {
        self.fund
    }
}
```

押さえる点が 7 つ:

1. **構造体は *private* フィールド 2 つ、public は 0 だ。** `LiquidationRecord`（all-public、data carrier）や `ScanReport`（all-public、value type）と違い、`LiquidationScanner` は *state machine* だ。Mutable state（fund）を所有し、bridge はメソッドを介してそれと交流するべきだ。Private フィールドがその契約を enforce する。**State machine はフィールドを隠す。Data carrier はフィールドを公開する。**
2. **構造体は `Clone` だが `Copy` ではない**（fund は技術的にはここでは `Copy` だが、`#[derive(Clone, Debug)]` ブロック内に compose しておけば将来の進化を許せる）。Clone はテストや safe な snapshot パターンのためのもので、production コードが scanner を clone することはほぼない。**現在の caller が誰も使っていなくても `Clone` を defensively derive する。コストは 0、将来のテストパターンを unblock する。**
3. **5 個の accessor メソッド、Builder pattern *ではなく*。** Builder なら `LiquidationScanner::builder().with_params(p).with_fund(f).build()` と書ける。使わない理由: scanner はフィールドがちょうど 2 つで、construction site が小さいからだ。**Builder は 5+ optional フィールドがあるとき意味がある。2 フィールドなら、2 つのコンストラクタ（`new`、`with_empty_fund`）が builder に勝つ。**
4. **`fund_balance` は `i64` を直接返し、`fund` は `&InsuranceFund` を返す。** 2 つの access パターン、2 つのメソッド。Bridge は balance をよく log する（`fund_balance` は i64 1 つ — 速い）。Bridge はたまに fund 全体を inspect する（`fund` は borrow を返す — `Copy` でも動くが borrow のほうが explicit）。**Hot-path scalar と cold-path full reference の両方を提供する。Caller に選ばせる。**
5. **`into_fund` は *consume-and-extract* パターン。** Chain shutdown（openhl では Stage 13+）で、bridge は `scanner.into_fund()` を呼んで fund state を snapshot/persistence のために抽出する。メソッドは `self` を値で取る（`&self` ではない）。Scanner は呼び出し後に drop され、fund は caller の手に渡る。**`self` を値で取る `into_*` メソッドは「one-shot、オリジナルは消える」というシグナルだ。**
6. **5 つの accessor のうち 4 つが `const fn`。** `into_fund` 以外すべて compile time に評価できる — `self` からデータを move out しないからだ。`into_fund` の consume-pattern は const にできない。非 `Copy` 型である `self` を消費・解体して所有フィールドを move out する挙動は、現在の `const` コンテキストでは禁じられている（compile-time 評価では非 `Copy` の引数・ローカルに対する破壊的 move が制限される）。**`const fn` にできるものは `const fn` にする。境界は通常、関数がデータを move するかどうか。**
7. **`set_*` メソッドなし。** Bridge は（将来の）`scan` メソッド経由で fund state を mutate する。`self.fund` への直接代入ではない。`set_fund(&mut self, f: InsuranceFund)` accessor は bridge が scan loop を bypass できる surface を作ってしまう。まさに防ぎたい abstraction-breaking の正体だ。**State machine は state-machine 遷移を実装するメソッドのみで mutation を公開する。フィールド setter ではなく。**

> 🛑 **やりがちな勘違い。** 「`LiquidationScanner` が `InsuranceFund` を値で所有するのはなぜか? reference (`fund: &'a mut InsuranceFund`) や shared (`fund: Arc<Mutex<InsuranceFund>>`) ではないのか?」 代替案の問題が 3 つ。(1) `&'a mut` は lifetime parameter を導入し、それが scanner の現れるすべての型を伝播する。Call site がうるさくなり、`LiquidationScanner<'a>` が scanner を保持するすべての struct に現れる。(2) `Arc<Mutex<...>>` は shared mutable state のためのものだ。Scanner は shared ではなく、bridge が所有する。競合のない同期は runtime overhead でしかない。(3) 値で所有するなら、scanner の lifetime *が* fund の lifetime だ。`into_fund` メソッドが shutdown 時の caller にクリーンな handoff を与える。**Ownership semantics は lifecycle に合わせる: per-bridge コンポーネント、single mutator、shutdown 時に persist。**

### Step 6: `lib.rs` にモジュールを配線

`crates/liquidation/src/lib.rs` を開く。変更は 3 つ:

まず、モジュール宣言を加える。`insurance` の後に `scanner` を挿入:

```rust
pub mod compute;
pub mod insurance;
pub mod scanner;
pub mod types;
```

次に、`insurance` re-export の下に新しい行として scanner re-export を加える:

```rust
pub use compute::{
    account_equity, close_order_spec, liquidation_fee, margin_health, margin_ratio,
    notional_value, solvent_close_outcome, underwater_close_outcome, unrealized_pnl,
};
pub use insurance::{InsuranceFund, WithdrawOutcome};
pub use scanner::{CloseOutcomeKind, LiquidationRecord, LiquidationScanner, ScanReport};
pub use types::{
    AccountSnapshot, CloseOrderSpec, LiquidationParams, MarginHealth, MarginRatio, SolventClose,
    UnderwaterClose, MARGIN_SCALE,
};
```

Scanner 型 4 つ（enum + struct 3 つ）を 1 行で re-export、`{ }` 内は alphabetical。

3 つ目、`lib.rs` 冒頭の roadmap コメントを Stage 10c 進行中に更新する。具体的な変更は今の `lib.rs` preamble の内容次第だが、答え合わせは「scanner shipping in this commit」とマークしている。そこに揃える。

### Step 7: `cargo check` を走らせる

```bash
cargo check -p openhl-liquidation
```

期待される出力:

```
    Checking openhl-liquidation v0.1.0 (/path/to/openhl/crates/liquidation)
    Finished `dev` profile [optimized + debuginfo] target(s) in 1.2s
```

**Clean compile。** テストは走らない — `scan` メソッドがまだないので、testable なものがない。L10 の 55 既存テストは依然 pass する（`cargo test -p openhl-liquidation` で確認）が、L11 はそれらの追加・修正をしない。

エラー時にありがちなパターン:

- **`unresolved import \`openhl_clob::AccountId\`** — scanner は `openhl-clob` と `openhl-funding` に `AccountId` と `MarkPrice` で依存する。`crates/liquidation/Cargo.toml` の `[dependencies]` に両方をリストしているか確認する。答え合わせ crate には既に両方がある（L0 のレッスンで設定済み）。
- **`unused import: \`account_equity\`** — clippy / rustc が「L11 に `scan` メソッドがないので import がいくつか使われていない」と警告するかもしれない。**これらの警告は L11 では意図されたものだ** — import は L12 用に *staged* されており、L12 がそのすべてを consume する。「警告 0 件」規律で進めたい読者は、L11 だけ `scanner.rs` 冒頭に `#[allow(unused_imports)]` を入れ、L12 着地時に attribute を削除する。それ以外は警告をそのままにする — L12 の `scan` 本体が compile した瞬間に消える。答え合わせは L11 と L12 を一緒に ship するので `allow` しない。**L11 で警告が 0 件だったら逆にどこかおかしい。ここで出る unused-import 警告はすべて想定内だ。**
- **`pub mod scanner;` の配置** — `pub mod types;` の後に置くと alphabetical な順序が壊れる。答え合わせは `lib.rs` 内で alphabetical な順序に揃えている。それに合わせる。

## 設計の振り返り

このレッスンに焼き込んだ load-bearing な決定は 3 つ:

1. **語彙先、メカニズム後 — もう一度。** L8（`WithdrawOutcome` が L8 で宣言、L9 で使用）、L10（`SolventClose` / `UnderwaterClose` が宣言と同時に使用）と同じパターン。L11 は orchestration 層の型を宣言し、L12 の `scan` メソッドが return value を置く場所を作る。**L11 後にファイルを開く読者は、完全な型 API surface を見る。L12 が動詞を埋める。**

2. **Scanner は insurance fund を値で所有する。** `&'a mut` でも、`Arc<Mutex<...>>` でも、`Rc<RefCell<...>>` でもない。Ownership 判断こそが scanner を lifetime gymnastics や runtime overhead なしに使える状態にする。**Single mutator と明確な shutdown point を持つ state-machine コンポーネントは、自分の state を値で所有すべき。**

3. **Record vector の隣の aggregate フィールドは caller が fold する手間を省く。** `ScanReport.fund_deposits` は数学的には `report.records.iter().map(|r| ...)` の合計と等しい。だが scan loop 内で計算すれば 3 回の `saturating_add` で済み、bridge から iteration を 1 つ省ける。**Single-pass loop 内で aggregate を事前計算する。コストは無料、API 契約はきれいになる。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 0a8464e
diff -u ~/code/my-openhl/crates/liquidation/src/scanner.rs ./crates/liquidation/src/scanner.rs
diff -u ~/code/my-openhl/crates/liquidation/src/lib.rs ./crates/liquidation/src/lib.rs
```

L11 の後:
- **scanner.rs** は Stage 10c の `scanner.rs` の **`impl LiquidationScanner` ブロック内 accessor まで一致**（`scan` メソッドとテストは L12 + L13 で着地）。具体的には: doc + imports + `CloseOutcomeKind` + `LiquidationRecord` + `ScanReport` + `LiquidationScanner` struct + `new` / `with_empty_fund` / `fund_balance` / `fund` / `into_fund`。
- **lib.rs** は Stage 10c の `lib.rs` の `pub mod scanner;` 行と `pub use scanner::{...}` re-export について **byte-for-byte 一致**。

## よくある質問

**Q1: なぜ `CloseOutcomeKind` は `Kind` サフィックス付きで命名されているのか? 単に `CloseOutcome` ではダメか?**

`CloseOutcome` だと `SolventClose` と `UnderwaterClose` 内の *outcome* フィールドと頭の中で衝突する。`Kind` サフィックスは「この enum は *どの kind* の outcome が起きたかについてのもの」と明示し、enum が *dispatcher* であって outcome データそのものではないことを明らかにする。**Suffix-naming（Kind、Type、Variant）は「これは discriminator であって、データではない」の Rust イディオムだ。**

**Q2: なぜ `LiquidationRecord` は post-close の trader balance を運ばないのか? Bridge は trader に credit するためにそれを必要とする。**

balance は trader のアカウント上に住んでいて、liquidation engine の中にはない。Scanner は `SolventClose { fee_to_fund, residual_to_account }` を生み、`residual_to_account` こそが bridge が trader balance に加える額だ。Scanner は trader の pre-liquidation balance を *知らない*。Bridge が知っている。**Compute コンポーネントは delta を生む。Balance 所有者がそれを apply する。他所に住むデータを保存しない。**

**Q3: `ScanReport` は `Vec<LiquidationRecord>` を持つ — scan ごとに allocate しないか?**

する。それで OK だ。Vec はせいぜいスライス内の Liquidatable アカウント 1 件あたり 1 エントリ。Healthy chain の定常状態では、ほとんどのブロックで liquidation 件数は 0、vec は empty のまま（empty vec は allocate しない）。多数の liquidation が起きる stressed chain では、allocation は実際の liquidation の値段に比べてマイクロ秒オーダーだ。後で profiling で hot だと分かれば、bridge が `ScanReport` インスタンスを pool できる。**伴う仕事に圧倒される allocation を pre-optimize しない。**

**Q4: `LiquidationScanner` を fund 型に対して generic にできないか? `LiquidationScanner<F: Fund>`?**

できる。だが `Fund` の唯一の既存実装は `InsuranceFund` だ。Generic を加えると type parameter がすべての caller に伝播する。**Generic は *交換可能な* 実装のためのもの。実装が 1 つなら、concrete 型が generic に勝つ。** 将来「冗長な fund」（二層 insurance）を swap する必要が出たら、それが trait を導入するタイミング。その前ではない。

**Q5: `into_fund` は scanner を consume する。Fund snapshot を取りつつ scanner 操作を続けたい場合は?**

`fund()`（`&InsuranceFund` を返す）を使って borrow 経由で `.balance()` や他のフィールドを読む。`into_fund` は *chain shutdown 時の handoff* 専用だ。Bridge が scanner を使い終わったときに呼ぶ。Mid-chain の inspection には borrow が正しいパターン。**`into_*` は terminal state 用。`fn x(&self) -> &T` は inspection 用。**

**Q6: なぜ `LiquidationRecord` は `classification`（pre-close の `MarginHealth`）を運ぶのか? Bridge は snapshot からいつでも re-derive できるのに。**

Bridge *は* re-derive できる。ただし pre-close snapshot を保持していた場合に限る。だが通常は保持しない。Scanner はそれらを既に持っている（iterate したのだから）。Classification を record に store するのは record 1 件あたり O(1) extra space で、bridge が独自の snapshot history を持つ手間を省く。**以前なされた derivation を capture する record は、caller が upstream の仕事をやり直す手間を省く。**

## 次のレッスン (L12) — `scan` メソッド + 最初の 4 unit test

L12 で orchestration の心臓 — `scan` メソッド — を実装する。メソッドは `&[AccountSnapshot]` と `MarkPrice` を取り、L6 の `margin_health` で各アカウントを分類、Liquidatable/Underwater アカウントを L10 の `solvent_close_outcome` / `underwater_close_outcome` に dispatch、L9 の `InsuranceFund::deposit` と `::withdraw_shortfall` で fund を in-place mutate、そして道中で `ScanReport` を構築する。

L12 は 4 つの最もシンプルな unit test も加える:
- `scan_empty_accounts_returns_empty_report` — sanity check。
- `scan_all_safe_accounts_does_nothing` — liquidation がないなら record もない。
- `scan_atrisk_does_not_liquidate` — AtRisk は *警告* であって、トリガではない。
- `scan_skips_flat_positions` — 誤分類された flat への defensive guard。

L12 後、scanner は *runnable* になる。59 テスト pass（34 compute + 21 insurance + 4 件の新規 scanner test）。L13 がさらに 5 個の nuanced unit test と 4 個の conservation-law proptest で stress テストし、最終的に 68 件まで持っていく。

````

---

## Seed-file slot

L11 は新規 Module 4 の sortOrder 0 に入る:

```typescript
{
  title: 'レッスン 11 — Scanner 型の語彙 — CloseOutcomeKind、LiquidationRecord、ScanReport、LiquidationScanner',
  slug: 'openhl-liquidation-scanner-types-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 25,
  xpReward: 50,
  content: `# レッスン 11 — Scanner 型の語彙 — CloseOutcomeKind、LiquidationRecord、ScanReport、LiquidationScanner\n\n...`
},
```

Module 4 のメタデータ（新規）:

```typescript
4: { title: 'Scanner & capstone', sortOrder: 4 },
```

## SHA pinning discipline

L11 は SHA pin を `0a8464e`（Stage 10c — multi-account liquidation scanner）に進める。L11 後、`scanner.rs` は types + accessors セクション（`scan` メソッドの前まですべて）について答え合わせと一致。L12 は `0a8464e` のまま据え置き; L13 も `0a8464e` のままで proptest を追加する。Stage 10 は L13 で閉じる。

## 翻訳セルフレビュー（paste 前）

- **L11 は Module 4 で最も短いレッスン**（25 分）。Justification: 型語彙は読者を *即座に* オリエントするのに役立つ — L12 がこれらの型を consume する動詞を実装する。Pacing（types-only → verb → stress test）は insurance モジュールの L8 → L9 → L10 に対応する。
- **「メカニズムの前に型語彙」フレーミング** はコース内で 3 度目の登場。L8 が `WithdrawOutcome` をメソッドなしで宣言。L10 が `SolventClose` / `UnderwaterClose` を宣言してすぐ使用。L11 が scanner 型 4 つを宣言してどれも使わない。繰り返しは読者にこれが *規律ある選択* であって偶然ではないと教える。
- **「fund を値で所有」** が L11 の最も深い設計フレーミングだ。Goal、Step 5 「押さえる点」#5、anti-fluency callout、設計の振り返り #2 で再登場する。読者がこれを内面化すると、後で「shared を意識して」`Arc<Mutex<...>>` に refactor することを思いとどまる。Hyperliquid の scanner は single-mutator; Solana の vault もそう。パターンは generalize する。
- **`unfilled_deficit` フィールドは Stage 10d cross-reference を明示的に得る。** Stage 10c は Stage 10d が consume する signal を生むよう engineer されている。L11（そして `ScanReport` doc）でこれを名指すことで staging が可視化される — 読者は *次の* openhl stage が ADL を加えて cascade を閉じることを理解する。
- **L11 では新規 test なし。** 意図的な選択だ — types-only レッスンには test すべき behavior がなく、test を強制すると logic ではなく compilation をテストすることになる。読者は `cargo check` でファイルが parse することを確認し、`cargo test` で L0-L10 の 55 テストが依然 pass することを確認する。**L11 はコース内で新規 test がない唯一のレッスン; 次のレッスン preview がそれを名指す。**

### JA 特有のスタイル決定

- **専門用語は英語のまま**（`orchestration`、`discriminated union`、`tuple variant`、`builder pattern`、`consume-and-extract`、`bill of materials`、`hot-path scalar`、`cold-path full reference` など）。L0-L10 の慣例に従う。
- **Code コメントは英語のまま**（`/// Construct a scanner...`、`/// Borrow the underlying...` など）。答え合わせと byte-for-byte 一致させるため。
- **`load-bearing` は英語のまま使用。** L8-L10 と同じ。
- **「per-bridge コンポーネント、single mutator、shutdown 時 persist」のような英語フレーズ列** はそのまま使用 — Rust 用語の集合体は意訳すると逆に読みにくい。
