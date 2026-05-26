# Building OpenHL — L4 draft (JA) — C2 build-along rewrite

> openhl SHA `3b43586` (Stage 5a: InMemoryEvmBridge — ConsensusBridge の最初の impl) に対してドラフト。これがコースで **最初の ConsensusBridge impl** だ。
> EN ミラー: `drafts/openhl_l4_en.md`。
> Course: `building-openhl-consensus-ja` (track: `reth-l1-architect`, course #6 of 10)。

---

## L4 — `openhl-in-memory-bridge-ja`

- **Module:** 3 (EL test double)、module 内 sortOrder 0
- **Course-level sortOrder:** 3 (15 レッスン中の 4 番目)
- **Duration:** 40 分
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# レッスン 4 — `InMemoryEvmBridge` — trait の最初の impl

## ゴール

このレッスンで掴む概念:

- **テストダブル先行の実装戦略。** Reth に触れる前に fake EVM を書く理由。trait を end-to-end で exercise するのに 600 個の transitive dep を待つ必要がなく、下流の consensus test (L9/L10) を 2.7s ではなく 0.02s で回せる。
- **内部可変性のための `Mutex<State>`。** L3 で要求された `Send + Sync` bound を満たすため、private `State` struct を単一の `Mutex` で包む。method ごとに 1 回 lock するパターンはテストコードでは十分で、L12 以降の `LiveRethEvmBridge` にも構造的に伝播する。
- **`pending` と `chain` map の分離。** 投機的な build と canonical な commit はライフサイクルが異なる。ここで分離を encode しておくと、以降の impl すべてが同じデータフローを尊重する (build は投機、commit は確定)。
- **`async_trait` の impl ergonomics。** `#[async_trait]` を `impl` block に付けたとき何が要求されるか (lifetime、`Self: Send + Sync`)、stable Rust で trait の `async fn` がいまだに macro 経由で desugar される理由。

検証:

```bash
cargo test -p openhl-evm
```

上記の実行結果が in-memory bridge の build → ready → commit フローをカバーする 5 つのテストで pass する。L3 の `ConsensusBridge` の **最初の具象 implementation** が手元にある状態になる — EVM のふりをして fake block を保存し、Reth を立ち上げずに trait を exercise する test double だ。

具体的な変更:

- `crates/evm/Cargo.toml` に 3 dependency + 1 dev-dependency 追加: `openhl-consensus`、`openhl-types`、`async-trait`、`tokio` (dev)。
- `crates/evm/src/in_memory.rs` — 新規ファイル、`InMemoryEvmBridge` struct、private `State`、`Mutex<State>`、4 method の `impl ConsensusBridge`、`hex_short` helper、5 unit test を含む。
- `crates/evm/src/lib.rs` — `pub mod in_memory; pub use InMemoryEvmBridge;` を組み込む。

## おさらい

L3 を終えた時点:

```
crates/types/src/lib.rs        — 5 type + Display + 4 test pass
crates/consensus/src/bridge.rs — ConsensusBridge trait + BridgeError
crates/consensus/src/lib.rs    — pub mod bridge;
crates/evm/src/lib.rs          — //! EVM execution layer の doc のみ、コードなし
crates/evm/Cargo.toml          — 空 [dependencies]
```

`cargo check --workspace` が pass; `cargo test -p openhl-evm` は 0 テスト実行。

## 計画

4 つのことをする:

1. **`crates/evm/Cargo.toml` に依存を 3 つと dev-dependency を 1 つ追加する**: `openhl-consensus` (trait と error type 用)、`openhl-types` (contract type 用)、`async-trait` (`#[async_trait]` macro 用)、dev-dep に `tokio` (テスト関数を `#[tokio::test]` にするため)。
2. **`crates/evm/src/in_memory.rs` を作成する** — `InMemoryEvmBridge` struct、`Mutex` に持たせる private な `State` struct、4 つの async method すべてを提供する `impl ConsensusBridge for InMemoryEvmBridge` block、`hex_short` ヘルパー、`#[cfg(test)] mod tests` (5 テスト)。
3. **`in_memory` を crate に組み込む** — `crates/evm/src/lib.rs` に `pub mod in_memory; pub use in_memory::InMemoryEvmBridge;` を追加。
4. **`cargo test -p openhl-evm` を実行** — 5 つのテストが pass するのを見届ける。

これが Rust の impl を初めて書く場面だ。ここで encode するパターンは繰り返される: L5 の `RethEvmBridge` も同じスケルトンを使い、L11+ の `LiveRethEvmBridge` も同様だ。**State 管理パターン (Mutex<State> + pending vs chain map) もそれらの impl に伝播する。**

> 🛑 **考えてみよう。** スクロールする前に: test double の `build_payload` が **fake する** ものは何で、**実際にできる** ものは何か? ヒント: EVM は走らせられないが、できることはある — `PayloadId` を割り当てる、block number をインクリメントする、hash を synthesize する、pending block を覚える。Fake vs real の区別は L5 と L11 で意味を持つ。

## 手を動かす walk-through

### Step 1: `crates/evm/Cargo.toml` に依存を追加

`crates/evm/Cargo.toml` を開く。空の `[dependencies]` を置き換える:

```toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }

[dev-dependencies]
tokio = { workspace = true }
```

4 つ:

- **`openhl-consensus`** — impl から `bridge::{ConsensusBridge, BridgeError}` を参照するため
- **`openhl-types`** — `BlockHash`、`PayloadId` などを使うため
- **`async-trait`** — impl block の `#[async_trait]` attribute 用
- **`tokio` (dev)** — async test 関数の `#[tokio::test]` 用

`cargo check -p openhl-evm` は引き続き pass する — まだ使っていない依存を宣言しただけだからだ。

### Step 2: ファイルを作成

```bash
touch crates/evm/src/in_memory.rs
```

module-level doc を追加:

```rust
//! In-memory `ConsensusBridge` — a test double for the EL side.
//!
//! Useful for unit-testing the consensus crate without spinning up Reth. The
//! real Reth-backed implementation lives in `engine.rs` (lands in L5).
```

### Step 3: imports と struct を追加

```rust
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use std::collections::HashMap;
use std::fmt::Write as _;
use std::sync::Mutex;

#[derive(Debug, Default)]
pub struct InMemoryEvmBridge {
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, ExecutedBlock>,
    chain: HashMap<[u8; 32], ExecutedBlock>,
    head: Option<BlockHash>,
}

impl InMemoryEvmBridge {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}
```

各フィールドの役割を順に見ていく:

**`InMemoryEvmBridge`** — public struct。フィールドは 1 つ: `state: Mutex<State>`。Mutex が type を `Send + Sync` にし (thread 間で safely 共有可能)、これは trait が要求する性質だ。Mutable なものはすべて mutex の内側に置く。

**`State`** (private) — 3 つの bookkeeping:

- `next_payload_id: u64` — 単調カウンタ。`build_payload` のたびにインクリメントし、その前の値を返り値の `PayloadId` に使う。
- `pending: HashMap<u64, ExecutedBlock>` — `build_payload` が 生成したが `commit` がまだ accept していない block。`PayloadId` を key にする。
- `chain: HashMap<[u8; 32], ExecutedBlock>` — commit 済み block。生の 32-byte hash を key にする (`BlockHash` newtype ではなく — lookup 時に `.0` accessor を省ける)。
- `head: Option<BlockHash>` — 最も最近 commit された hash。何も commit していなければ `None`。

`pending` と `chain` を分けるのが重要だ: `commit(hash)` が呼ばれた時点で、その block は (前の `build_payload` から) すでに `pending` にある。`commit` は pending → chain に移し、`head` を更新する。real EL が in-flight payload buffer と finalized chain の両方を持つ構造と同じだ。

`State` の 4 フィールド (`next_payload_id` / `pending` / `chain` / `head`) を、`build_payload` → `payload_ready` → `commit` のライフサイクルに沿ってどう動くかを 1 枚で見ると、L5 や L11+ の本物の bridge でも同じ形が再利用されることが直感で押さえられる:

```
【 InMemoryEvmBridge 内のブロックライフサイクル 】

1. build_payload(parent, attrs)
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ chain.get(&parent.0) で parent の number を引く              │
   │ next_payload_id を 1 増やして PayloadId を発行               │
   │ 新しい ExecutedBlock を合成 (number = parent + 1、hash 等)   │
   │ pending.insert(PayloadId, ExecutedBlock)  ◄── 投機的に格納   │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (CL に PayloadId だけ返す)

2. payload_ready(id)
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ pending.get(&id).cloned()  ◄── 未確定ブロックを CL に貸し出す │
   │ (pending には残しておく — まだ commit されていない)            │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (ExecutedBlock を返す)

3. commit(hash)                  ※ CL が 2/3+ Quorum 達成後に呼ぶ
                       │
                       ▼
   ┌────────────────────────────────────────────────────────────┐
   │ pending から該当ブロックを検索 → remove                       │
   │ chain.insert(hash.0, ExecutedBlock)  ◄── canonical 領域へ移す │
   │ head = Some(hash)                    ◄── new head を更新     │
   └────────────────────────────────────────────────────────────┘
                       │
                       ▼  (Ok(()) を返す、ブロックは finalized)
```

ポイントは「**pending = 投機的 (未確定) / chain = 確定済み**」という 2 つの寿命がマップレベルで分離していることだ。`build_payload` は楽観的に積み上げ、`commit` だけが「pending から chain へ昇格させる」唯一の権限を持つ。これは本物の Reth EL でも `pending blocks` と `canonical chain` という名前で同じ形が存在しており、L5 / L11+ で本物の bridge に差し替えても**データの流れ方は L4 と同じ**になる。

**`impl InMemoryEvmBridge::new`** — constructor。`#[must_use]` は clippy へのヒント: caller が `InMemoryEvmBridge::new();` を bind せずに書いたら、ほぼ間違いなくバグだ。

### Step 4: `ConsensusBridge` を impl — `build_payload`

```rust
#[async_trait]
impl ConsensusBridge for InMemoryEvmBridge {
    async fn build_payload(
        &self,
        parent: BlockHash,
        _attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let mut s = self.state.lock().expect("state mutex poisoned");
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let parent_number = s.chain.get(&parent.0).map_or(0, |b| b.number);
        let number = parent_number + 1;

        let mut hash_bytes = [0u8; 32];
        hash_bytes[..8].copy_from_slice(&id.to_le_bytes());
        hash_bytes[8..16].copy_from_slice(&number.to_le_bytes());

        let block = ExecutedBlock {
            hash: BlockHash(hash_bytes),
            parent_hash: parent,
            number,
            state_root: [0u8; 32],
        };
        s.pending.insert(id, block);
        Ok(PayloadId(id))
    }
    // ...続く
```

順を追って見ていく:

1. **`self.state.lock().expect("state mutex poisoned")`** — mutex を取得する。`.expect` は `PoisonError` ケースをカバーする: 前の holder が lock を持ったまま panic し、state が indeterminate なまま残っている状態だ。正しい動作は自分も panic すること (poisoned な state machine から続けるのは unsafe)。文字列は debug 出力で lock を識別するためのもの。
2. **`id = s.next_payload_id; s.next_payload_id += 1;`** — fresh な payload ID を割り当てる。単調で、再利用はしない。DB の sequence と同じだ。
3. **`s.chain.get(&parent.0).map_or(0, |b| b.number)`** — parent block の number を見つける。その parent を commit したことがなければ (例: テストの genesis hash)、デフォルトで 0 を返す (子は block 1 になる)。`.0` は `BlockHash` newtype を unwrap して内側の `[u8; 32]` を取り出す。
4. **`(id, number)` から hash を synthesize** — 最初の 8 byte が `id.to_le_bytes()`、次の 8 byte が `number.to_le_bytes()`、残りはゼロ。なぜ real hashing でないのか? test double だからだ。hash は build ごとに unique でありさえすればよい。`(id, number)` は構造上 unique なので、synthesize された hash もそうなる。
5. **`ExecutedBlock` を build して** `pending` に stash する。block は parent_hash、number、hash、そしてゼロの state_root を持つ (EVM を走らせていないため)。
6. **`Ok(PayloadId(id))` を返す。**

> 🛑 **やりがちな勘違い。** 「`BlockHash` に real cryptographic hash を使うべきでは。」 **違う** — これは test double だ。Real hashing は EVM を走らせて post-state root を compute する必要があり、それを避けるために test double を使っている。Synthesize した hash は `BlockHash` の *uniqueness* 要求を満たすが、*cryptographic-commitment* 要求は満たさない — unit test としてはそれでよい。Module 1 L11+ (LiveRethEvmBridge) では real hashing をするが、それは Reth が仕事をするからだ。

### Step 5: `payload_ready` を impl

同じ `impl` block を続ける:

```rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        s.pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))
    }
```

`pending` を ID で lookup する。見つかれば clone する (caller は ownership を欲しがるが、block がまだ commit されていなくて caller が再度問い合わせる場合に備えて、pending には copy を残しておく)。見つからなければ、descriptive な message とともに `Rejected` error を返す。

注意: `payload_ready` は impl 内で唯一の read-only メソッドだ (mutation なし)。`let s = self.state.lock()` に `mut` は要らない — `.get()` を呼ぶだけで、insert も remove もしないからだ。

### Step 6: `validate_payload` を impl

```rust
    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        Ok(PayloadStatus::Valid)
    }
```

この impl の中で一番単純なもの。test double なので、どんな block も valid と assert する。Real validation (L12) では `EthBeaconConsensus::validate_header_against_parent` を actual parent に対して走らせる。今は `Valid` を返すことで consensus tests を動かせる。

**重要: `_block` (leading underscore)。** compiler に「この引数を意図的に使わない」と伝える。Underscore 無しだと `unused_variables` warning が出る。付けると抑制される。

### Step 7: `commit` を impl

```rust
    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let mut s = self.state.lock().expect("state mutex poisoned");
        let block = s
            .pending
            .values()
            .find(|b| b.hash == block_hash)
            .cloned()
            .ok_or_else(|| {
                let hex = hex_short(&block_hash.0);
                BridgeError::Rejected(format!("commit for unknown hash {hex}"))
            })?;
        s.chain.insert(block_hash.0, block);
        s.head = Some(block_hash);
        Ok(())
    }
}
```

流れ:

1. State を write 用に lock する。
2. `pending.values()` の中から `block_hash` に一致する block を探す。value 経由で iterate する理由: `pending` は `PayloadId` を key にしているので、hash で block を探すには scan が必要だからだ。(real impl で O(1) の hash→block lookup が欲しければ、2 番目の index を持つ。test double では O(n) scan で OK。)
3. 見つからなければ short hex hash 付きで `Rejected` error を返す。
4. 見つかれば `chain` (key は hash bytes) に insert して `head` を更新する。

`pending` から remove しない点に注意 — commit 後、block は両方の map に残り続ける。Real impl は `pending.remove(&id)` するかもしれないが、test では関係ない。

`hex_short` ヘルパーは次のセクション:

> 📍 **配置のナビゲーション。** `hex_short` は `impl ConsensusBridge for InMemoryEvmBridge { ... }` ブロックの**外側**に、ファイル末尾の独立した非公開関数として置く (`&self` を取らず、struct 状態にも依存しない単なる byte → string 変換ユーティリティだから)。`impl` ブロック内に書いてしまうと「method の追加」になり、trait 定義側 (`ConsensusBridge`) にもこの形が必要だと誤解させてしまう。

```rust
fn hex_short(bytes: &[u8; 32]) -> String {
    let mut s = String::with_capacity(18);
    s.push_str("0x");
    for b in &bytes[..8] {
        write!(&mut s, "{b:02x}").expect("write to String never fails");
    }
    s
}
```

最初の 8 byte を 0x prefix 付きの hex 文字列にする — ログ 1 行に収まる短さだ。`write!(&mut s, ...)` 呼び出しには file 先頭の `use std::fmt::Write as _;` が必要 (Step 3 で追加済み)。`as _` rename は trait を *method 用に* import しつつ、`Write` という名前で namespace を汚染しない。

### Step 8: `in_memory` を crate に組み込む

`crates/evm/src/lib.rs` を開く。現状:

```rust
//! EVM execution layer — Reth integration.
```

置き換える:

```rust
//! EVM execution layer — Reth integration.

pub mod in_memory;

pub use in_memory::InMemoryEvmBridge;
```

`pub mod in_memory;` で module を expose する。`pub use in_memory::InMemoryEvmBridge;` で struct を crate root に re-export し、downstream crate が `use openhl_evm::InMemoryEvmBridge;` と書けるようにする (`use openhl_evm::in_memory::InMemoryEvmBridge;` ではなく)。

### Step 9: Unit test を追加

`crates/evm/src/in_memory.rs` の末尾に追加:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn attrs() -> PayloadAttrs {
        PayloadAttrs {
            timestamp: 0,
            fee_recipient: [0u8; 20],
            prev_randao: [0u8; 32],
        }
    }

    #[tokio::test]
    async fn build_then_ready_returns_same_block() {
        let bridge = InMemoryEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        assert_eq!(block.parent_hash, parent);
        assert_eq!(block.number, 1);
    }

    #[tokio::test]
    async fn validate_returns_valid() {
        let bridge = InMemoryEvmBridge::new();
        let block = ExecutedBlock {
            hash: BlockHash([2u8; 32]),
            parent_hash: BlockHash([1u8; 32]),
            number: 1,
            state_root: [0u8; 32],
        };
        let status = bridge.validate_payload(&block).await.unwrap();
        assert_eq!(status, PayloadStatus::Valid);
    }

    #[tokio::test]
    async fn commit_advances_head_and_records_block() {
        let bridge = InMemoryEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        bridge.commit(block.hash).await.unwrap();
        let s = bridge.state.lock().unwrap();
        assert_eq!(s.head, Some(block.hash));
        assert!(s.chain.contains_key(&block.hash.0));
    }

    #[tokio::test]
    async fn build_on_committed_parent_increments_number() {
        let bridge = InMemoryEvmBridge::new();
        let genesis = BlockHash([1u8; 32]);
        let id1 = bridge.build_payload(genesis, attrs()).await.unwrap();
        let block1 = bridge.payload_ready(id1).await.unwrap();
        bridge.commit(block1.hash).await.unwrap();

        let id2 = bridge.build_payload(block1.hash, attrs()).await.unwrap();
        let block2 = bridge.payload_ready(id2).await.unwrap();
        assert_eq!(block2.number, 2);
        assert_eq!(block2.parent_hash, block1.hash);
    }

    #[tokio::test]
    async fn commit_unknown_hash_errors() {
        let bridge = InMemoryEvmBridge::new();
        let err = bridge.commit(BlockHash([9u8; 32])).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
```

各 test が何を証明するか:

| テスト | 何を証明するか |
| - | - |
| `build_then_ready_returns_same_block` | `build_payload` + `payload_ready` の round-trip が動く。fake genesis の上で number = 1。 |
| `validate_returns_valid` | `validate_payload` が常に `Valid` を返す (test double の挙動)。 |
| `commit_advances_head_and_records_block` | Commit 後、head が新ブロックを指し、chain map にも含まれる。 |
| `build_on_committed_parent_increments_number` | Number の単調性: parent block 1 の上に build → block 2。 |
| `commit_unknown_hash_errors` | Pending に無い hash の commit は `BridgeError::Rejected` を返す。 |

`#[tokio::test]` は `#[test]` の async 対応版だ。test 用に tokio runtime をセットアップし、async 本体を await する。

## テスト

```bash
cargo test -p openhl-evm
```

期待値:

```
running 5 tests
test in_memory::tests::build_on_committed_parent_increments_number ... ok
test in_memory::tests::build_then_ready_returns_same_block ... ok
test in_memory::tests::commit_advances_head_and_records_block ... ok
test in_memory::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::validate_returns_valid ... ok

test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

よくあるエラーと対処:

- **`Mutex<HashMap<u64, ExecutedBlock>>` が `Default` を auto-derive しない。** 実際にはする — `Mutex<T>` も `HashMap<K, V>` も `Default` を derive する。これが出るなら、別の Default なしの type (例えば `BTreeMap` 以外) を書いたかもしれない。`HashMap` に戻す。
- **`use std::fmt::Write as _;` が実際は使われていない、と clippy が warning する。** `Write` trait は `hex_short` 内で `write!` macro 経由で使われている。warning は macro 展開が import を見ていない可能性を示す。`use` が module 先頭 (関数内ではない) にあるか確認する。
- **`#[tokio::test]` not found** — `tokio` が `[dev-dependencies]` に無い。Step 1 を再確認。
- **`block.number == 1` を assert するテストで `0` が返る。** `let number = parent_number + 1;` の `+ 1` を書き忘れている。

## 設計を振り返る

このレッスンで encode した本質的な決定が 2 つ:

1. **State は `Mutex<State>` の裏に置く。** これが `InMemoryEvmBridge` を thread-safe にし、`Send + Sync` を満たさせる。代替 (lock-free、atomic-only mutation) は test double としては遥かに複雑だ。Lock は contention が低い (test code) か critical section が短い (real code) なら問題ない。このパターンは L11+ の `LiveRethEvmBridge` にも伝播する — 同じ `Mutex<State>` の形をしている。

2. **`pending` と `chain` を別の map にする。** Real EL でも同じ split がある — 現在 build 中の payload と、canonical chain に commit された block。Test double にこれを encode することで、**データフローの形** が production impl に carry over する。1 つの combined map にすると「build = commit」を含意してしまうが、これは違う。Build は speculative、commit が final だ。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 3b43586
diff -u ~/code/my-openhl/crates/evm/src/in_memory.rs ./crates/evm/src/in_memory.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
```

テスト順、doc-comment の言い回し、exact な debug message format は違っていて OK。struct の形、`Mutex<State>` パターン、4 つの method impl のロジックはほぼ一致するはず。

main に戻す:

```bash
git checkout main
```

## よくある質問

**Q: `commit_advances_head_and_records_block` が "mutex poisoned" で panic する。**
まず最初の panic 行を確認する。  
このコースのテストは `InMemoryEvmBridge::new()` を各テストで作るため、テスト間で `Mutex<State>` を共有しない。原因の多くは「同じテスト内で lock 保持中に先に panic し、その後もう一度 lock を取りに行く」パターンだ。

確認手順:
1. `cargo test` 出力の先頭にある最初の `thread 'tests::...' panicked at ...` を特定する。  
2. その panic を直してから poison エラーの再現を確認する。  
3. 並列実行の切り分けが必要なときだけ `cargo test -p openhl-evm -- --test-threads=1` を使う。  

**Q: `pending` を `HashMap<u64, _>` ではなく `HashMap<PayloadId, _>` にすべき?**
どちらでも動く。openhl の convention は、storage layer で内側の type (`u64`) を使い、lookup 内での wrap/unwrap を避けることだ。Public API では依然 `PayloadId` を使う。trade-off は次のとおり: `HashMap<PayloadId, _>` で type safety を得る代わりに、lookup ごとに `.0` accessor が必要になる。`HashMap<u64, _>` なら storage layer の type safety は諦めるが、noise は避けられる。好みの問題で、こちらは `u64` を選んだ。

**Q: `hex_short` はなぜ最初の 8 byte だけで、全部ではないのか?**
ログを短く保つ必要があるからだ。Full 32-byte hex は 64 文字 — ログ行を食う。最初の 8 byte (16 hex 文字 + "0x") で、dev/test シナリオでは block を identify するのに十分。Production ログでは full hash を使えばよい。ヘルパーを差し替える。

**Q: テストは pass するが `unused_imports` で clippy warning が出る。**
import が実際にコード中で使われているか確認する。Boilerplate に `std::fmt::Write as _` がある — `hex_short` 内でだけ使われる。`hex_short` を書いていなければ unused になる。ヘルパーを追加するか、import を消す。

## 次のレッスン (L5)

動作する `ConsensusBridge` impl は手元にあるが、Reth はまだ一切使っていない。L5 で次の impl を書く: `RethEvmBridge`。同じ trait だが、`ExecutedBlock` は 実際の `alloy_consensus::Header` から build され (合成ではなく)、`BlockHash` は Reth の `Header::hash_slow` で hash された 実際の `B256` になる。State はまだ in-memory (live Reth provider なし) だが、**型は real だ。** これが toy 型 (L4) と live 統合 (L11+) を橋渡しする。
````

---

## Seed-file slot

L4 は Module 3 (EL test double) の sortOrder 0 に landing する:

```typescript
{
  title: 'レッスン 4 — InMemoryEvmBridge — trait の最初の impl',
  slug: 'openhl-in-memory-bridge-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 40,
  xpReward: 70,
  content: `# レッスン 4 — \`InMemoryEvmBridge\` — trait の最初の impl\n\n...`
},
```

## SHA pinning discipline

L4 が引用する openhl commit (§答え合わせ で参照):
- `3b43586` (Stage 5a: InMemoryEvmBridge — ConsensusBridge の最初の impl)

## Style review notes (self-critique before paste)

- **L4 は 40 分** — 最初に reader が意味のある impl (~120 行) を書く。9 step に分けて各々消化しやすくする。
- **§Step 4 で `build_payload` を 6 sub-point で walk する。** これがレッスンの pedagogical core — reader が idiomatic Rust で Mutex 取得、単調 ID 割り当て、parent lookup、hash synthesize の姿を学ぶ。**圧縮しない**。
- **Step 4 のやりがちな勘違い callout** (「real cryptographic hash を使うべき」) は over-engineering の trap を name で指摘する。Test double に何時間も無駄にする。
- **5 テストが right thing をテストする**: round-trip、validation、commit、monotonicity、error path。この impl にとって「正しい数」のテスト — 少なすぎるとバグを見逃し、多すぎると busywork。
- **§設計を振り返る の「データフローの形が伝播」 point** が最も重要な meta-lesson。Reader は test double を書いているが、パターンは production impl に survive する — trait の polymorphism payoff。
- **翻訳 policy は L1/L2/L3 JA と同一**:
  - Rust の syntax (impl、trait、Mutex、HashMap、async fn 等) は英語のまま
  - `#[async_trait]`、`#[must_use]`、`#[tokio::test]` 等の attribute は英語のまま
  - コード、ファイルパス、コマンド、Cargo.toml syntax は英語のまま
  - 🛑 callout: 考えてみよう (Predict)、やりがちな勘違い (Anti-fluency)
  - 「poison する」「synthesize する」「lookup する」「clone する」は英語動詞の JA 化で OK
