# Building OpenHL — L6 draft (JA) — C2 build-along rewrite

> openhl SHA `784785b` (Stage 6 prep: Implement Malachite Context for OpenHlContext) に対してドラフト。本レッスンは **コースで最大のレッスン** — 8 つの新規ファイルで Malachite の 10 個の Context sub-trait と中央 Context binding を実装する。
> EN ミラー: `drafts/openhl_l6_en.md`。
> Course: `building-openhl-consensus-ja` (track: `reth-l1-architect`, course #6 of 10)。

---

## L6 — `openhl-malachite-context-ja`

- **Module:** 4 (CL types)、module 内 sortOrder 0
- **Course-level sortOrder:** 5 (15 レッスン中の 6 番目)
- **Duration:** 50 分
- **XP reward:** 90
- **Type:** CONTENT

### Content

````markdown
# レッスン 6 — `OpenHlContext` と Malachite の 10 sub-type

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-consensus
```

…が **5 テスト** で pass する: validator-set のソート順、決定的な proposer 選択、proposal のフィールド round-trip、vote-type の区別 (prevote vs precommit)、height の算術。Chain が Malachite の `Context` trait を満たす状態になる — Malachite がブロック上で consensus を駆動するために必要な型レベル API surface。

**L3 は自分が所有する trait** (`ConsensusBridge`、consensus から呼ばれ、execution が実装) だった。**L6 は Malachite が所有する trait** — 自分が impl して Malachite の `Driver` から call される。両者を合わせて consensus crate の bidirectional な surface が完成する。

これは **コースで最も長いレッスン** — 8 新規ファイル、~330 行。各ファイルは小さいが数が多い。必要なら 2 回に分ける前提で。

## おさらい

L5 を終えた時点で workspace に両方の `ConsensusBridge` impl があるが、consensus crate 自体には L3 の trait しかない。Malachite 統合はまだない:

```
crates/consensus/src/lib.rs:
  pub mod bridge;
crates/consensus/Cargo.toml:
  [dependencies]
  openhl-types, async-trait, thiserror, eyre
```

ここに Malachite を配線していく。

## 計画

(以下の順で) build する:

1. **Cargo.toml の更新** — Malachite の依存 2 つ (`-core-types` (trait 用)、`-signing-ed25519` (暗号用))、dev-dep として `rand 0.8` (テストでの keypair 生成用)。
2. **`crates/consensus/src/types/` ディレクトリ** に `mod.rs` (module index) と 7 つの type ファイル:
   - `address.rs` — `OpenHlAddress([u8; 20])`
   - `height.rs` — `OpenHlHeight(u64)` 単調増加の算術付き
   - `value.rs` — `OpenHlValue(BlockHash)` — consensus が合意する対象
   - `validator.rs` — `OpenHlValidator` + `OpenHlValidatorSet` (**canonical なソート順** 付き)
   - `proposal.rs` — `OpenHlProposal` — ブロック提案メッセージ
   - `proposal_part.rs` — `OpenHlProposalPart` (unit struct — stream しない)
   - `vote.rs` — `OpenHlVote` — prevote または precommit
3. **`crates/consensus/src/context.rs`** — `OpenHlContext` impl、10 の type association + **proposer-election アルゴリズム** を含む 4 つの factory method。
4. **`crates/consensus/src/lib.rs`** — `pub mod types; pub mod context; pub use context::OpenHlContext;` で配線。
5. **5 つの unit test** を `context.rs` 内に。
6. **`cargo test -p openhl-consensus` を実行** — 5 つすべて pass。

これらの型の shape が **すべての後続レッスンに伝播する**。L7 (SigningProvider) が `OpenHlVote` と `OpenHlProposal` に署名。L8 (Codec) がそれらを encode。L9 (run_engine_app) が `OpenHlContext` で parameterize された AppMsg を処理。**ここで encode する設計判断は後 8 つのレッスンに伝播する。**

> 🛑 **予測してみよう。** 上の型リストを見る。10 個の型のうち 2 つは特別に注目すべき — load-bearing な決定を encode しているから:
> - `OpenHlValidatorSet` の **specific なソート順** — 全 validator が同じソートに合意する必要がある
> - `OpenHlContext::select_proposer` の **specific なアルゴリズム**
>
> **なぜこの 2 つが validator 間で一致しなければならないのか?** ヒント: 同じ (height, round) で validator が違う proposer を選んだら chain がどうなるか?

## 手を動かす walk-through

### Step 1: `crates/consensus/Cargo.toml` を更新

`[dependencies]` に追加:

```toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand"] }

[dev-dependencies]
rand = "0.8"
```

新しい依存:

- **`informalsystems-malachitebft-core-types`** — `Context` trait と 10 個の sub-trait (`Address`、`Height`、`Value`、`Validator`、`ValidatorSet`、`Proposal`、`ProposalPart`、`Vote`、`Extension`、`SigningScheme`) を定義する。今から impl する API surface。
- **`informalsystems-malachitebft-signing-ed25519`** に `features = ["rand"]` — Malachite の Ed25519 実装。`rand` feature を有効にすると `PrivateKey::generate(OsRng)` がテストで使える (そうしないと事前構築の keypair を供給する必要がある)。
- **`rand 0.8` (dev-dep)** — test code 内の `OsRng` 用。

依存解決を確認:

```bash
cargo check -p openhl-consensus
```

この更新後の初回 check で Malachite が fetch される — 数分かかる。

### Step 2: `types/` ディレクトリと `mod.rs` を作成

```bash
mkdir crates/consensus/src/types
```

`crates/consensus/src/types/mod.rs` を作成:

```rust
//! Concrete implementations of Malachite's `Context` sub-traits.

pub mod address;
pub mod height;
pub mod proposal;
pub mod proposal_part;
pub mod validator;
pub mod value;
pub mod vote;

pub use address::OpenHlAddress;
pub use height::OpenHlHeight;
pub use proposal::OpenHlProposal;
pub use proposal_part::OpenHlProposalPart;
pub use validator::{OpenHlValidator, OpenHlValidatorSet};
pub use value::OpenHlValue;
pub use vote::OpenHlVote;
```

module index。`pub mod X;` 行がサブモジュール (ファイル `types/X.rs`) を宣言。`pub use` で主要な型を re-export して、呼び出し側が `crate::types::OpenHlAddress` (not `crate::types::address::OpenHlAddress`) と書ける。

**なぜ 1 つの大きな `types.rs` ではなく型 1 つにつき 1 ファイル?** 各型の impl は短い (10-40 行) だが、設計判断は型ごとに distinct だ。型ごとにファイルを分けると、レッスン (本レッスン) が 1 型ずつ walk でき、code review も 1 型の変更に集中できる (関連しないコードをスクロールする必要なし)。

### Step 3: 3 つの「シンプル」型を書く — `address.rs`、`height.rs`、`value.rs`

各 ~20 行。順に walk する。

**`crates/consensus/src/types/address.rs`:**

```rust
use core::fmt;

use informalsystems_malachitebft_core_types::Address;

/// A 20-byte validator address, Ethereum convention.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlAddress(pub [u8; 20]);

impl fmt::Display for OpenHlAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("0x")?;
        for b in &self.0 {
            write!(f, "{b:02x}")?;
        }
        Ok(())
    }
}

impl Address for OpenHlAddress {}
```

パターンに注目: `[u8; 20]` の newtype、標準的な derive 一通り、ログ用の hex Display、それから **空の `impl Address`**。`Address` trait はメソッドを持たない — 必要な derive を *要求する* だけ。我々が `Clone + Copy + Debug + Display + PartialEq + Eq + PartialOrd + Ord + Hash` を満たすことで impl が成立する。

**`crates/consensus/src/types/height.rs`:**

```rust
use core::fmt;

use informalsystems_malachitebft_core_types::Height;

/// Block height — a monotonic u64 counter.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlHeight(pub u64);

impl fmt::Display for OpenHlHeight {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Height for OpenHlHeight {
    const ZERO: Self = OpenHlHeight(0);
    const INITIAL: Self = OpenHlHeight(1);

    fn increment_by(&self, n: u64) -> Self {
        OpenHlHeight(self.0.saturating_add(n))
    }

    fn decrement_by(&self, n: u64) -> Option<Self> {
        self.0.checked_sub(n).map(OpenHlHeight)
    }

    fn as_u64(&self) -> u64 {
        self.0
    }
}
```

定数 3 つ + メソッド 3 つ。`ZERO` は絶対的なゼロ; `INITIAL` は最初の有効な block height (1、0 ではない — genesis は block 0 だが consensus が "produce" するものではないので、consensus round は 1 から始まる)。`increment_by` は overflow panic を避けるため `saturating_add` を使う。`decrement_by` は 0 を下回ることが invalid なので `Option` を返す; `checked_sub` は panic ではなく `None` を返す。

**`crates/consensus/src/types/value.rs`:**

```rust
use informalsystems_malachitebft_core_types::Value;
use openhl_types::BlockHash;

/// The value consensus agrees on: an EVM block, identified by its block hash.
///
/// For v0 we store only the hash since the EVM bridge is the source of truth
/// for block contents. Module 2 will extend this to carry the full block once
/// the CLOB starts producing fills that need to be ordered alongside EVM txs.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct OpenHlValue(pub BlockHash);

impl Value for OpenHlValue {
    type Id = BlockHash;

    fn id(&self) -> Self::Id {
        self.0
    }
}
```

`OpenHlValue` は `BlockHash` (L2 から) をラップ。`Value::Id` associated type は vote に乗るもの — consensus は full value に投票せず、value の *identifier* (hash) に投票する。ここでは `Id = BlockHash` なので、value と ID が同じデータになっている。

> 🛑 **やりがちな勘違い。** 「`Value` を直接 `BlockHash` にすればいいのでは — なぜラップ?」 **`Value` trait に独自の bound があるから**。Specifically `Value: Clone + Debug + Eq + Ord + Send + Sync` + `Value::Id` associated type の bound。`OpenHlValue` をラッパーにすることで、`BlockHash` を変えずに「value とは何か」を独立に進化させられる。Module 2 (CLOB) で `BlockHash` に無いフィールド (例: off-EVM fills のリスト) を足す可能性が高い。

3 つ書いたら `cargo check -p openhl-consensus` を走らせる。pass するはず。

### Step 4: `validator.rs` を書く — canonical なソート順

最も長い type ファイル。~75 行。

```rust
use informalsystems_malachitebft_core_types::{Validator, ValidatorSet, VotingPower};
use informalsystems_malachitebft_signing_ed25519::PublicKey;

use crate::context::OpenHlContext;
use crate::types::OpenHlAddress;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlValidator {
    pub address: OpenHlAddress,
    pub public_key: PublicKey,
    pub voting_power: VotingPower,
}

impl OpenHlValidator {
    #[must_use]
    pub const fn new(address: OpenHlAddress, public_key: PublicKey, voting_power: VotingPower) -> Self {
        Self { address, public_key, voting_power }
    }
}

impl Validator<OpenHlContext> for OpenHlValidator {
    fn address(&self) -> &OpenHlAddress {
        &self.address
    }

    fn public_key(&self) -> &PublicKey {
        &self.public_key
    }

    fn voting_power(&self) -> VotingPower {
        self.voting_power
    }
}

/// A validator set, kept sorted by (`voting_power` desc, address asc).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlValidatorSet(Vec<OpenHlValidator>);

impl OpenHlValidatorSet {
    /// Construct a validator set and enforce the canonical sort order.
    #[must_use]
    pub fn new(mut validators: Vec<OpenHlValidator>) -> Self {
        validators.sort_by(|a, b| {
            b.voting_power
                .cmp(&a.voting_power)
                .then_with(|| a.address.cmp(&b.address))
        });
        Self(validators)
    }

    #[must_use]
    pub fn validators(&self) -> &[OpenHlValidator] {
        &self.0
    }
}

impl ValidatorSet<OpenHlContext> for OpenHlValidatorSet {
    fn count(&self) -> usize {
        self.0.len()
    }

    fn total_voting_power(&self) -> VotingPower {
        self.0.iter().map(|v| v.voting_power).sum()
    }

    fn get_by_address(&self, address: &OpenHlAddress) -> Option<&OpenHlValidator> {
        self.0.iter().find(|v| &v.address == address)
    }

    fn get_by_index(&self, index: usize) -> Option<&OpenHlValidator> {
        self.0.get(index)
    }
}
```

**このレッスンで最も load-bearing なファイル。**

`OpenHlValidator` は素直: address + public_key + voting_power、`Validator` trait の 3 accessor で expose。興味深い仕事は `OpenHlValidatorSet::new` にある:

```rust
validators.sort_by(|a, b| {
    b.voting_power.cmp(&a.voting_power)         // 主: power 降順
        .then_with(|| a.address.cmp(&b.address)) // tiebreak: address 昇順
});
```

これが **canonical な CometBFT validator-set ソート順**: voting power 降順、tiebreaker は address 昇順。**全 validator がこの同じソートを同じ入力 set に適用する必要がある**。なぜか?

`OpenHlContext::select_proposer` (Step 6 で書く) が `validator_set.get_by_index((height + round) % count)` するから。Validator A がある順にソートし、validator B が違う順にソートすると、同じ `(height, round)` に対して別の proposer を選ぶ。**最初の round で chain が fork する。** ソート順 *が* proposer-election protocol だ。

他の BFT chain (CometBFT、すべての Cosmos chain) も全く同じソートを使う。convention に従うのは便利のためだけでなく — chain を BFT canon と同じ入力 set に対して *同一に挙動* させるためだ。

> 🛑 **やりがちな勘違い。** 「power 降順 + address 昇順、なぜ両方昇順ではダメ?」 **stake が高い validator は proportionally に多く propose すべきだから** — `(height + round) % count` は index 全体で uniform なので、power が高い validator が低い index に来て多く proposer-elect されるのはソートの性質だ。Tiebreaker (address 昇順) は安定 deterministic な選択; 任意の total ordering でよいが、CometBFT が address 昇順を選んだので合わせる。

### Step 5: メッセージ型を書く — `proposal.rs`、`proposal_part.rs`、`vote.rs`

3 ファイル、各々 1 つのメッセージ型 trait を impl する。

**`crates/consensus/src/types/proposal.rs`:**

```rust
use informalsystems_malachitebft_core_types::{Proposal, Round};

use crate::context::OpenHlContext;
use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValue};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlProposal {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value: OpenHlValue,
    pub pol_round: Round,
    pub address: OpenHlAddress,
}

impl Proposal<OpenHlContext> for OpenHlProposal {
    fn height(&self) -> OpenHlHeight {
        self.height
    }

    fn round(&self) -> Round {
        self.round
    }

    fn value(&self) -> &OpenHlValue {
        &self.value
    }

    fn take_value(self) -> OpenHlValue {
        self.value
    }

    fn pol_round(&self) -> Round {
        self.pol_round
    }

    fn validator_address(&self) -> &OpenHlAddress {
        &self.address
    }
}
```

`OpenHlProposal` は型付きメッセージ: 「validator X が (height, round) で proof-of-lock-on-round Z で value Y を propose する」。`Proposal` trait は 6 個のアクセサで、`self` のフィールドを読むだけで満たす。

`pol_round` (Proof of Lock Round) は Tendermint の概念: round Z でこの value に lock したからこの value を propose する場合、それが `pol_round`。初回の proposal では `Round::Nil`。

**`crates/consensus/src/types/proposal_part.rs`:**

```rust
use informalsystems_malachitebft_core_types::ProposalPart;

use crate::context::OpenHlContext;

/// Unit proposal part — `OpenHL` runs in `ValuePayload::ProposalOnly` mode, so
/// the entire value ships in the `Proposal` message and parts are unused.
/// The type is required by the `Context` trait surface anyway.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OpenHlProposalPart;

impl ProposalPart<OpenHlContext> for OpenHlProposalPart {
    fn is_first(&self) -> bool {
        true
    }

    fn is_last(&self) -> bool {
        true
    }
}
```

unit struct — 最小の型。**なぜ?** Malachite には大きな value を propose するモードが 2 つある:

- **`ValuePayload::ProposalOnly`** (我々が使う) — value 全体が `Proposal` メッセージに乗る
- **`ValuePayload::ProposalAndParts`** — proposal が part を参照、part が別個に送られる

ProposalOnly を使う理由: `OpenHlValue` がただの `BlockHash` (32 byte) だから。Streaming 不要。だが `Context` trait はそれでも `ProposalPart` 型の関連付けを要求する — 我々は実体化しない unit struct で満たす。`is_first` と `is_last` を両方 `true` にして、もし check するコードが走っても一貫した結果を返す。

**`crates/consensus/src/types/vote.rs`:**

```rust
use informalsystems_malachitebft_core_types::{
    NilOrVal, Round, SignedExtension, VoteType, Vote as VoteTrait,
};
use openhl_types::BlockHash;

use crate::context::OpenHlContext;
use crate::types::{OpenHlAddress, OpenHlHeight};

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OpenHlVote {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value_id: NilOrVal<BlockHash>,
    pub vote_type: VoteType,
    pub address: OpenHlAddress,
}

impl VoteTrait<OpenHlContext> for OpenHlVote {
    fn height(&self) -> OpenHlHeight {
        self.height
    }

    fn round(&self) -> Round {
        self.round
    }

    fn value(&self) -> &NilOrVal<BlockHash> {
        &self.value_id
    }

    fn take_value(self) -> NilOrVal<BlockHash> {
        self.value_id
    }

    fn vote_type(&self) -> VoteType {
        self.vote_type
    }

    fn validator_address(&self) -> &OpenHlAddress {
        &self.address
    }

    fn extension(&self) -> Option<&SignedExtension<OpenHlContext>> {
        None
    }

    fn take_extension(&mut self) -> Option<SignedExtension<OpenHlContext>> {
        None
    }

    fn extend(self, _extension: SignedExtension<OpenHlContext>) -> Self {
        self
    }
}
```

`OpenHlVote` は **prevote** と **precommit** の両方を表すメッセージ型。`vote_type` フィールドがどちらかを区別する; それ以外は構造同一。フィールドセットも同じ: validator address、投票対象の height と round、value (または "この round の任意の value に反対" を意味する `Nil`)。

3 つの extension メソッドは `None` / no-op。**Vote extensions** は Malachite の機能: validator が precommit に extra data (例: light-client state) を attach できる。v0 では使わない — Context impl で `Extension = ()` (Step 6)、このメソッドは stub。

**なぜ `Option<BlockHash>` ではなく `NilOrVal<BlockHash>`?** どちらも本質的に「value があるかもしれない」を表す。だが `NilOrVal` は Malachite の BFT 固有概念: `Nil` は「この round の任意の value に反対する」を意味する (「意見が無い」とは異なる)。`Option` だとそのニュアンスを失う。

### Step 6: `context.rs` を書く — 結束

このファイルが 10 個の型を `Context` impl に結びつける。最も長いファイル (テスト含めて ~185 行)。区切って見る。

`crates/consensus/src/context.rs` の冒頭:

```rust
//! `OpenHlContext` — the central abstraction Malachite uses to know about our chain.
//!
//! Once this trait is implemented, the entire `malachitebft-core-consensus` and
//! `malachitebft-engine` machinery can drive consensus over our types.

use informalsystems_malachitebft_core_types::{
    Context, NilOrVal, Round, ValidatorSet as _, ValueId, VoteType,
};
use informalsystems_malachitebft_signing_ed25519::Ed25519;

use crate::types::{
    OpenHlAddress, OpenHlHeight, OpenHlProposal, OpenHlProposalPart, OpenHlValidator,
    OpenHlValidatorSet, OpenHlValue, OpenHlVote,
};

#[derive(Clone, Debug, Default)]
pub struct OpenHlContext;
```

`OpenHlContext` は **unit struct** — フィールドなし。state を持たず、型の関連付けを保持するだけのマーカーだ。多くの BFT chain の Context 型も stateless。

続いて `impl Context for OpenHlContext`。10 個の型関連付け:

```rust
impl Context for OpenHlContext {
    type Address = OpenHlAddress;
    type Height = OpenHlHeight;
    type ProposalPart = OpenHlProposalPart;
    type Proposal = OpenHlProposal;
    type Validator = OpenHlValidator;
    type ValidatorSet = OpenHlValidatorSet;
    type Value = OpenHlValue;
    type Vote = OpenHlVote;
    type Extension = ();
    type SigningScheme = Ed25519;
    // ...続く
```

10 個の型 binding — `Context` の sub-trait 1 つにつき 1 つ。今書いた 8 つ + 以下:

- **`Extension = ()`** — vote extension 無し。unit 型が trait の bound を満たし、real な extension 型を書く必要がない。
- **`SigningScheme = Ed25519`** — Malachite の Ed25519 実装を直接使う。多くの BFT chain は Ed25519、BLS (署名集約のため) を使う chain もある。Malachite が実装を ship していて簡潔なので Ed25519 を選ぶ。

それから 4 つの factory method。**`select_proposer`** が最重要:

```rust
    fn select_proposer<'a>(
        &self,
        validator_set: &'a Self::ValidatorSet,
        height: Self::Height,
        round: Round,
    ) -> &'a Self::Validator {
        let count = validator_set.count();
        assert!(count > 0, "validator set is empty");
        let round_u64 = u64::try_from(round.as_i64().max(0)).unwrap_or(0);
        let index_u64 = height.0.wrapping_add(round_u64);
        let index = usize::try_from(index_u64).unwrap_or(usize::MAX) % count;
        validator_set
            .get_by_index(index)
            .expect("index < count by construction")
    }
```

proposer-election アルゴリズム。**`(height + round) % count`** がソート済み validator set の index を選ぶ。理由:

1. Validator set は `OpenHlValidatorSet::new` (Step 4) で canonical にソート済み、全 validator が同じ indexing を持つ。
2. 同じ `(height, round)` を与えれば、全 validator が同じ `index` を計算する。
3. したがって全 validator が同じ proposer を選ぶ。

算術が注意深い: `u64` での `wrapping_add` が overflow を回避; `% count` で valid な index になる。`.expect` は証明可能: `... % count` で計算したから `index < count` が成り立つ。

続いて `new_proposal`、`new_prevote`、`new_precommit` — 型付きメッセージを構築する 3 つの factory method:

```rust
    fn new_proposal(
        &self,
        height: Self::Height,
        round: Round,
        value: Self::Value,
        pol_round: Round,
        address: Self::Address,
    ) -> Self::Proposal {
        OpenHlProposal { height, round, value, pol_round, address }
    }

    fn new_prevote(
        &self,
        height: Self::Height,
        round: Round,
        value_id: NilOrVal<ValueId<Self>>,
        address: Self::Address,
    ) -> Self::Vote {
        OpenHlVote {
            height,
            round,
            value_id,
            vote_type: VoteType::Prevote,
            address,
        }
    }

    fn new_precommit(
        &self,
        height: Self::Height,
        round: Round,
        value_id: NilOrVal<ValueId<Self>>,
        address: Self::Address,
    ) -> Self::Vote {
        OpenHlVote {
            height,
            round,
            value_id,
            vote_type: VoteType::Precommit,
            address,
        }
    }
}
```

これらは短い、全部フィールド代入だから。興味深いのは `new_prevote` と `new_precommit` が同じ struct (`OpenHlVote`) を作るが `vote_type` 値が違うこと — 型システムが construction の時点で区別を強制する。

### Step 7: `lib.rs` に配線

`crates/consensus/src/lib.rs` を開く。現状:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
```

次に変更:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod types;

pub use context::OpenHlContext;
```

`pub mod` 宣言で module を expose。`pub use context::OpenHlContext;` で中央型を re-export し、downstream crate は `use openhl_consensus::OpenHlContext;` と書ける (`use openhl_consensus::context::OpenHlContext;` よりきれい)。

### Step 8: 5 つの unit test を追加

`crates/consensus/src/context.rs` の末尾に:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use informalsystems_malachitebft_core_types::{
        Height as HeightTrait, Proposal as ProposalTrait, Validator, ValidatorSet,
        Vote as VoteTrait,
    };
    use informalsystems_malachitebft_signing_ed25519::PrivateKey;
    use openhl_types::BlockHash;
    use rand::rngs::OsRng;

    fn validator(addr_byte: u8, power: u64) -> OpenHlValidator {
        let private = PrivateKey::generate(OsRng);
        let public = private.public_key();
        OpenHlValidator::new(OpenHlAddress([addr_byte; 20]), public, power)
    }

    #[test]
    fn validator_set_is_sorted_by_power_then_address() {
        let set = OpenHlValidatorSet::new(vec![
            validator(0x01, 100),
            validator(0x02, 300),
            validator(0x03, 200),
        ]);
        let powers: Vec<u64> = set
            .validators()
            .iter()
            .map(Validator::voting_power)
            .collect();
        assert_eq!(powers, vec![300, 200, 100]);
        assert_eq!(set.total_voting_power(), 600);
        assert_eq!(set.count(), 3);
    }

    #[test]
    fn select_proposer_round_robins_deterministically() {
        let ctx = OpenHlContext;
        let set = OpenHlValidatorSet::new(vec![
            validator(0x01, 100),
            validator(0x02, 100),
            validator(0x03, 100),
        ]);
        let h = OpenHlHeight(7);
        let p1 = ctx.select_proposer(&set, h, Round::new(0)).address;
        let p2 = ctx.select_proposer(&set, h, Round::new(0)).address;
        assert_eq!(p1, p2);

        let p3 = ctx.select_proposer(&set, h.increment(), Round::new(0)).address;
        assert_ne!(p1, p3);
    }

    #[test]
    fn new_proposal_round_trips_fields() {
        let ctx = OpenHlContext;
        let addr = OpenHlAddress([0xaa; 20]);
        let value = OpenHlValue(BlockHash([0xbb; 32]));
        let proposal = ctx.new_proposal(
            OpenHlHeight(5),
            Round::new(1),
            value,
            Round::Nil,
            addr,
        );
        assert_eq!(ProposalTrait::height(&proposal), OpenHlHeight(5));
        assert_eq!(*ProposalTrait::value(&proposal), value);
        assert_eq!(*ProposalTrait::validator_address(&proposal), addr);
    }

    #[test]
    fn new_prevote_and_precommit_have_distinct_types() {
        let ctx = OpenHlContext;
        let addr = OpenHlAddress([0xaa; 20]);
        let vid: NilOrVal<BlockHash> = NilOrVal::Val(BlockHash([0xbb; 32]));
        let prevote = ctx.new_prevote(OpenHlHeight(5), Round::new(0), vid, addr);
        let precommit = ctx.new_precommit(OpenHlHeight(5), Round::new(0), vid, addr);
        assert_eq!(VoteTrait::vote_type(&prevote), VoteType::Prevote);
        assert_eq!(VoteTrait::vote_type(&precommit), VoteType::Precommit);
    }

    #[test]
    fn height_increment_and_decrement() {
        let h = OpenHlHeight::INITIAL;
        assert_eq!(h.as_u64(), 1);
        assert_eq!(h.increment().as_u64(), 2);
        assert_eq!(OpenHlHeight::ZERO.decrement(), None);
        assert_eq!(OpenHlHeight(5).decrement().unwrap().as_u64(), 4);
    }
}
```

5 つのテスト:

1. **`validator_set_is_sorted_by_power_then_address`** — Power がシャッフルされた 3-validator set (100, 300, 200) を作り、出力が [300, 200, 100] であることを verify。Step 4 の canonical なソート順が動くことを証明。
2. **`select_proposer_round_robins_deterministically`** — 同じ height + round → 同じ proposer (determinism)。違う height → 違う proposer (rotation)。
3. **`new_proposal_round_trips_fields`** — `new_proposal` で構築、`Proposal` trait メソッドで読み返す。factory ↔ accessor のペアを verify。
4. **`new_prevote_and_precommit_have_distinct_types`** — 同じ引数、だが `new_prevote` は `VoteType::Prevote`、`new_precommit` は `VoteType::Precommit` を produce。factory が仕事をすることを証明。
5. **`height_increment_and_decrement`** — `INITIAL.increment() == 2`、`ZERO.decrement() == None`、`5.decrement() == Some(4)`。算術メソッドを verify。

Note: `h.increment()` (not `h.increment_by(1)`) — `increment` は `Height` trait のデフォルトメソッドで `increment_by(1)` を呼ぶ。`decrement` も同様。

## テスト

```bash
cargo test -p openhl-consensus
```

期待値:

```
running 5 tests
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

よくあるエラーと修正:

- **`cannot find trait 'Address' in scope`** — `address.rs` に `use informalsystems_malachitebft_core_types::Address;` が抜けている。
- **`expected struct 'OpenHlContext', found ...`** — 型ファイルに `crate::context::OpenHlContext` を import しているが、`context.rs` がまだ存在しない。`context.rs` を先に書くか、型ファイルを `crate::OpenHlContext` (placeholder) で書いて後で `context.rs` を埋める。
- **`method 'increment' not found`** — Malachite の `Height` trait は `increment()` をデフォルトメソッド (`increment_by(1)` を呼ぶ) として提供する。`increment_by` を impl していることを確認 (`increment` ではなく)。
- **`first_validator_set sort produces a different order`** — sort comparator は `b.voting_power.cmp(&a.voting_power)` (note: `b` が先で降順)、`a.voting_power.cmp(&b.voting_power)` ではない。

## 設計を振り返る

このレッスンで encode した本質的な決定が 3 つ:

1. **Context sub-type 1 つにつき 1 ファイル。** 大きな `context.rs` に 10 個の型をインラインで定義することもできた。分けることで、(本レッスンや、後で個別の型を引用するレッスンの) walk-through が focused になる。代わりに 1 ファイルで済むものが 8 ファイルになる。分割を選んだ理由: **trait surface が独立に load-bearing** だから — `Validator` の決定は `Vote` の決定と違うし、code review は変更が localized されているほうが容易。

2. **`OpenHlValidatorSet` が `new()` でソートする、別 `sort()` メソッドではなく。** unsorted な set を construct できない、ということを意味する。型システムが「この set は常にソートされている」を encode する — unsorted な set を produce する API path が存在しない。これが伝播する: set の全メソッドがソート済み順序を仮定し、それが今や compiler が enforce する不変量になる。

3. **`select_proposer = (height + round) % count`** — 最も単純なアルゴリズム。Malachite はもっと洗練された proposer selection (stake で weighted、同一 validator が連続しない rotation 等) をサポートする。最も単純なのを選ぶ理由:
   - 決定的
   - 全 validator が verify 可能
   - 「公平な stake-weighted rotation」の複雑さは `OpenHlValidatorSet::new` のソートに住み、`select_proposer` 自体には住まない
   - Stake が高い validator が低 index に来て modulo で自然に多く proposer に選ばれる
   
   これは CometBFT と同じアプローチ。洗練された rotation (例: random beacon ベースの proposer selection) が必要なら、このメソッド body が変わる — だが trait surface は変わらない。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 784785b
diff -ur ~/code/my-openhl/crates/consensus/src/types ./crates/consensus/src/types
diff -u ~/code/my-openhl/crates/consensus/src/context.rs ./crates/consensus/src/context.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

Doc comment やテスト順序の variation は OK。各型の shape、`OpenHlValidatorSet::new` の sort comparator、`select_proposer` body は近く一致するはず。

main に戻す:

```bash
git checkout main
```

## よくある質問

**Q: validator set のソートが (100, 200, 300) になり、(300, 200, 100) にならない。何が間違いか?**
`a.voting_power.cmp(&b.voting_power)` (昇順) と書いた。正しい comparator は `b.voting_power.cmp(&a.voting_power)` (降順) — `b.cmp(&a)` であって `a.cmp(&b)` ではない。Stake が高い validator が *早い* index (低い index) にソートされるべき。

**Q: `select_proposer` が "validator set is empty." で panic する。なぜ?**
テストが空の `OpenHlValidatorSet` を作った。Real chain は最低 1 validator (single-validator devnet) か 4+ (multi-validator with byzantine tolerance) を持つ。assert が malformed config ケースを modulo-by-zero になる前に catch する。Unit test で出るなら test setup が間違い; production で出るなら config loader が間違い。

**Q: `OpenHlContext` に state (例: chain config) を持たせられるか?**
Yes — `pub struct OpenHlContext;` を `pub struct OpenHlContext { chain_id: u64 }` などに変える。Context trait は state を禁止しない。だが多くの BFT chain の Context 型は stateless 、context の仕事は *型を関連付ける* ことであって *runtime config を保持する* ことではないから。Runtime config は `OpenHlConfig` (L8 で扱う) に住む。

**Q: なぜ `Extension` が `()` でメソッドが `None` にスタブ化されているか?**
openhl v0 が vote extension を使わないから。Production BFT chain は precommit に light-client snapshot 等を attach するために使う。実装は: 何のデータを attach するか選ぶ、それをどう serialize するか、もう一方の端でどう verify するか、を決める必要がある。具体的なユースケースが出るまで意図的に scope 外。

## 次のレッスン (L7)

10 個の Context sub-type と 4 つの factory method が揃った。Malachite が chain の address、height、value、validator、message を知っている状態だ。だが **まだ何も署名されていない**。L7 で `OpenHlSigningProvider` — `OpenHlVote` と `OpenHlProposal` メッセージに対して Ed25519 署名を produce する trait — を impl する。これが Context surface の **もう半分** だ — Context が「これが私の型」と言い、SigningProvider が「これがそれらに署名する方法」と言う。
````

---

## Seed-file slot

L6 は Module 4 (CL types) の sortOrder 0 に landing する:

```typescript
{
  title: 'レッスン 6 — OpenHlContext と Malachite の 10 sub-type',
  slug: 'openhl-malachite-context-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 50,
  xpReward: 90,
  content: `# レッスン 6 — \`OpenHlContext\` と Malachite の 10 sub-type\n\n...`
},
```

## SHA pinning discipline

L6 が引用する openhl commit (§答え合わせ で参照):
- `784785b` (Stage 6 prep: Implement Malachite Context for OpenHlContext)

## Style review notes (self-critique before paste)

- **L6 は 50 分 — コース最長のレッスン。** 8 新規ファイル、~330 行。各ファイル個別には小さいが、数が duration を生む。
- **§計画 の予測してみよう callout** で readers がコードに会う前に 2 つの load-bearing 決定 (ValidatorSet sort + select_proposer algorithm) に focus させる。この 2 つの divergence だけが chain を fork させる。
- **Step 4 の「単一で最も load-bearing なファイル」フレーミング** がレッスンの最重要 framing。これが無いと readers が sort comparator を boilerplate として skim する。
- **Step 3 のやりがちな勘違い (なぜ OpenHlValue が BlockHash を wrap するか)** は L4/L5 の test-double-vs-real-type パターンの別形 — ラッパーが進化を独立に起こせる。
- **walk-through が多くの sub-file に分かれる** (simple 3 + complex 1 + message 3 + context 1)。意図的: 各ファイルが独自の設計根拠を持ち、複雑性で group することで自然な breath を提供する。
- **5 テストは minimum だが load-bearing 決定をカバーする**: sort 順、決定的 proposer 選択、message round-trip、vote-type 区別、height 算術。各テストが 1 つの設計判断の regression guard。
- **翻訳 policy は L1-L5 JA と同一**:
  - Malachite trait 名 (`Context`、`Address`、`Height`、`Value`、`Validator` 等) は英語のまま
  - Rust の syntax (impl、trait、struct、newtype、derive、async、Send、Sync) は英語のまま
  - 数学/CS 用語 (`load-bearing`、`canonical`、`monotonic`、`deterministic`、`round-trip`、`tiebreaker`) は英語のまま
  - 🛑 callout: 予測してみよう (Predict)、やりがちな勘違い (Anti-fluency)
