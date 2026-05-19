# Building OpenHL — L5 draft (JA) — C2 build-along rewrite

> openhl SHA `c938321` (Stage 5b: RethEvmBridge — Reth/alloy 型に対する ConsensusBridge 実装) に対してドラフト。本レッスンで初めて alloy を workspace dep として使い、実コードから呼ぶ。
> EN ミラー: `drafts/openhl_l5_en.md`。
> Course: `building-openhl-consensus-ja` (track: `reth-l1-architect`, course #6 of 10)。

---

## L5 — `openhl-reth-bridge-ja`

- **Module:** 3 (EL test double)、module 内 sortOrder 1
- **Course-level sortOrder:** 4 (15 レッスン中の 5 番目)
- **Duration:** 40 分
- **XP reward:** 70
- **Type:** CONTENT

### Content

````markdown
# レッスン 5 — real alloy 型を使う `RethEvmBridge`

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-evm
```

…が **9 テスト** (L4 の `InMemoryEvmBridge` の 5 つ + 新規 4 つ) で pass する。新 bridge は L4 と構造的には同じだが、合成した block ではなく `alloy_consensus::Header` (Ethereum の real な header struct) を保存し、block hash を `Header::hash_slow()` (本物の RLP encoding + Keccak-256) で計算する — fabricate した byte ではなく。

**自分のコードが alloy / Reth 型に初めて触れるレッスン**だ。「テスト用は合成、production-shape は real 型」というパターンはコースを通して繰り返される; ここできれいに学ぶと L11+ で時間を節約できる。

## おさらい

L4 を終えた時点:

```
crates/evm/src/in_memory.rs — InMemoryEvmBridge (合成 block、5 テスト pass)
crates/evm/src/lib.rs       — pub mod in_memory; pub use InMemoryEvmBridge;
crates/evm/Cargo.toml       — 3 deps (openhl-consensus、openhl-types、async-trait)、tokio dev-dep
```

`cargo test -p openhl-evm` が 5/5 pass。

## 計画

6 つのことをする:

1. **`crates/evm/Cargo.toml` に alloy 依存を 2 つ追加**: `alloy-primitives` (`B256`、`Address` 用) と `alloy-consensus` (`Header` 用)。L1 で workspace deps にすでに pin 済み。
2. **`crates/evm/src/engine.rs` を作成** — `RethEvmBridge` struct、private な `State` struct (合成 `ExecutedBlock` ではなく `Header` を保存)、`impl ConsensusBridge for RethEvmBridge` block。
3. **型変換ヘルパー 3 つ** (`to_b256`、`from_b256`、`to_executed_block`) — trait の `BlockHash` と内部の `B256` + `Header` の橋渡し。
4. **Unit test 4 つ** — そのうち 1 つは「real hashing が動く」を証明 (header のフィールドを変えると hash が変わる)。
5. **`engine` を crate に組み込む** — `lib.rs` に `pub mod engine;` + re-export を追加。
6. **`cargo test -p openhl-evm` を実行** — 9 テストすべて pass する。

key step は #2 — **内部 state の形が変わる**。L4 は `ExecutedBlock` を直接保存していた。L5 は `(B256, Header)` を保存する: alloy-native な型で、`ExecutedBlock` への変換は trait boundary でだけ行う。**alloy 型が source of truth、`ExecutedBlock` は contract の serialization に過ぎない。** この分離が L11+ で拡張される — `LiveRethEvmBridge` は同じ「内部 vs 境界」split を保ったまま、その後ろに real Reth provider を追加する。

> 🛑 **予測してみよう。** L4 の `InMemoryEvmBridge` は hash を `(id, number)` から合成した。L5 の `RethEvmBridge` は `header.hash_slow()` を呼ぶ — real RLP encoding + Keccak-256。**この違いで testable になる挙動は何か?** ヒント: header の 1 フィールドを変えたとき hash がどうなるかを考えよ。

## 手を動かす walk-through

### Step 1: `crates/evm/Cargo.toml` に alloy 依存を追加

`crates/evm/Cargo.toml` を開く。L4 時点の `[dependencies]`:

```toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }
```

2 行追加する:

```toml
[dependencies]
openhl-consensus = { workspace = true }
openhl-types     = { workspace = true }
async-trait      = { workspace = true }
alloy-primitives = { workspace = true }
alloy-consensus  = { workspace = true }
```

両方とも `workspace.dependencies` から継承する (L1 でセットアップ済み)。`alloy-primitives` が `B256` (32-byte hash の newtype) と `Address` (20-byte address の newtype) を提供。`alloy-consensus` が `Header` (Ethereum block header struct、全フィールド入り) を提供。

実行:

```bash
cargo check -p openhl-evm
```

pass するはず — 依存は available、まだ何も使っていない。

### Step 2: `crates/evm/src/engine.rs` を作成

```bash
touch crates/evm/src/engine.rs
```

module doc と imports から始める:

```rust
//! Reth-backed `ConsensusBridge` — uses alloy / Reth types throughout.
//!
//! At v0 this maintains state in-process for the parts that would normally
//! require a running Reth node (`PayloadBuilder` service, `BlockchainProvider`).
//! The live-node bootstrap lands in later lessons (L10-L13); the type
//! conversions and state-machine shape here are the contract that bootstrap
//! will satisfy.

use alloy_consensus::Header;
use alloy_primitives::{Address, B256};
use async_trait::async_trait;
use openhl_consensus::bridge::{BridgeError, ConsensusBridge};
use openhl_types::{BlockHash, ExecutedBlock, PayloadAttrs, PayloadId, PayloadStatus};
use std::collections::HashMap;
use std::sync::Mutex;
```

L4 と比べて新しい import:

- `alloy_consensus::Header` — Ethereum の canonical な block header struct (~20 フィールド: parent_hash、number、timestamp、beneficiary、gas_limit、base_fee、state_root 等)
- `alloy_primitives::{Address, B256}` — address 型 (20 byte) と hash 型 (32 byte)。両方とも byte 配列の newtype で L2 の `BlockHash` と同じ形 — だが alloy 側から来ていて、Ethereum Rust エコシステム全体の convention になっている。

### Step 3: struct を追加

```rust
#[derive(Debug, Default)]
pub struct RethEvmBridge {
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    next_payload_id: u64,
    pending: HashMap<u64, (B256, Header)>,
    chain: HashMap<B256, Header>,
    head: Option<B256>,
}

impl RethEvmBridge {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}
```

L4 の `InMemoryEvmBridge` と同じ shape だが、**`State` 内の型が違う**:

| フィールド | L4 (InMemory) | L5 (Reth) |
| - | - | - |
| `pending` | `HashMap<u64, ExecutedBlock>` | `HashMap<u64, (B256, Header)>` |
| `chain` | `HashMap<[u8; 32], ExecutedBlock>` | `HashMap<B256, Header>` |
| `head` | `Option<BlockHash>` | `Option<B256>` |

**なぜ `Header` 単体ではなく `(B256, Header)` を保存するのか?** `Header::hash_slow()` が expensive だから — header 全体を RLP encode して Keccak-256 を走らせる。Insert 時に 1 度 hash を計算してタプルに cache すれば、`pending.get(id)` は再 hashing なしで両方返せる。Hash は `chain` の lookup key (および `commit` の lookup criterion) になるので、用意しておきたい。

**なぜ `chain` の key と `head` に `[u8; 32]` ではなく `B256` を使うのか?** alloy-native な空間にいるから — `Header` を持つ時点で自然な hash 型は `B256`。`[u8; 32]` を使うとあちこちで `.0` accessor が必要になる。`BlockHash` への変換は trait boundary を越えるときだけ、ヘルパー関数で行う (Step 6)。

### Step 4: `build_payload` を impl — 初めての real hashing

```rust
#[async_trait]
impl ConsensusBridge for RethEvmBridge {
    async fn build_payload(
        &self,
        parent: BlockHash,
        attrs: PayloadAttrs,
    ) -> Result<PayloadId, BridgeError> {
        let parent_hash = to_b256(parent);
        let mut s = self.state.lock().expect("state mutex poisoned");

        let parent_number = s.chain.get(&parent_hash).map_or(0, |h| h.number);
        let id = s.next_payload_id;
        s.next_payload_id += 1;

        let header = Header {
            parent_hash,
            number: parent_number + 1,
            timestamp: attrs.timestamp,
            beneficiary: Address::from(attrs.fee_recipient),
            mix_hash: B256::from(attrs.prev_randao),
            ..Default::default()
        };
        let hash = header.hash_slow();
        s.pending.insert(id, (hash, header));
        Ok(PayloadId(id))
    }
    // ...続く
```

順を追って:

1. **`to_b256(parent)`** — trait の `BlockHash` を alloy の `B256` に変換 (どちらも 32 byte、byte 単位の reinterpretation のみ)。ヘルパーは Step 6。
2. **Parent number を `chain` から lookup** — key は今や `B256`、`[u8; 32]` ではない。Map の lookup 型は `B256`; `&parent_hash` (a `&B256`) をそのまま渡す、unwrap 不要。
3. **Payload ID 割り当て** — L4 と同じ。
4. **`Header` を build** — フィールドのうち設定するもの以外はデフォルト:
   - `parent_hash` — trait input の alloy `B256`
   - `number` — parent + 1
   - `timestamp` — `PayloadAttrs` から
   - `beneficiary: Address::from(attrs.fee_recipient)` — `[u8; 20]` を alloy の `Address` newtype に変換
   - `mix_hash: B256::from(attrs.prev_randao)` — `[u8; 32]` を `B256` に変換
   - `..Default::default()` — 残りの全フィールドを zero/default で埋める (state_root、gas_limit 等)
5. **`header.hash_slow()`** — **本物の hash 計算**。`Header` 全体 (defaulted フィールド込み ~20 個) を RLP encode し、Keccak-256 を走らせて `B256` を produce する。"slow" は convention の名前 — `hash_fast` は header struct に hash が pre-cache されている場合に存在するが、今は該当しない。
6. **`(hash, header)` を pending に insert** (payload ID を key に)。ID を return。

**この block hash は real だ。** header のどのフィールドが call 間で 1 byte でも変われば、結果の hash が異なる。L4 の合成 hash にはこの性質がなかった; L5 の hash にはある。Step 9 のテストがこれを証明する。

> 🛑 **流暢さ警告。** 「`hash` を `header` とは別に保存した方がきれい — タプルじゃなくて。」 **やろうと思えばできる、`State` にフィールドが 1 つ増えるだけ。だがタプルは関係を捉える — この hash は、ちょうどこの header の hash だ、と。** 別々に持つと、header を変更したのに hash の recompute を忘れるバグを招く。タプルにすることで両者が不可分になる。

### Step 5: `payload_ready`、`validate_payload`、`commit` を impl

```rust
    async fn payload_ready(&self, id: PayloadId) -> Result<ExecutedBlock, BridgeError> {
        let s = self.state.lock().expect("state mutex poisoned");
        let n = id.0;
        let (hash, header) = s
            .pending
            .get(&n)
            .cloned()
            .ok_or_else(|| BridgeError::Rejected(format!("unknown payload id {n}")))?;
        Ok(to_executed_block(hash, &header))
    }

    async fn validate_payload(
        &self,
        _block: &ExecutedBlock,
    ) -> Result<PayloadStatus, BridgeError> {
        // Real validation requires a live Reth provider + EVM (lessons L11+).
        // For now, defer to the CL's voting layer for actual block validity
        // and accept structurally.
        Ok(PayloadStatus::Valid)
    }

    async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
        let hash = to_b256(block_hash);
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _)| *h == hash)
            .map(|(_, header)| header.clone())
            .ok_or_else(|| BridgeError::Rejected(format!("commit for unknown hash {hash}")))?;
        s.chain.insert(hash, header);
        s.head = Some(hash);
        Ok(())
    }
}
```

**`payload_ready`** はタプルを pending から clone して取り出し、`to_executed_block` (Step 6) を呼んで trait の return type を内部の `(B256, Header)` から materialize する。

**`validate_payload`** はまだ stub。Live Reth provider に対する real validation は L12 で land する; いまは structural に accept。

**`commit`** は L4 と同じ流れだが型置換:
- `to_b256(block_hash)` で trait の `BlockHash` を `B256` に変換
- `pending.values()` の中で hash が一致するタプルを探す
- header を `chain` に insert (key は `B256`)
- `head` を更新

closure パターン `find(|(h, _)| *h == hash)` に注目 — タプルを destructure して 1 番目の要素を比較する。`*h` は `&B256` を deref して `B256` にし、`hash` (こちらも `B256`) と比較できるようにする。

### Step 6: 変換ヘルパーを追加

`impl ConsensusBridge` block の後に:

```rust
fn to_b256(h: BlockHash) -> B256 {
    B256::from(h.0)
}

fn from_b256(b: B256) -> BlockHash {
    BlockHash(b.0)
}

fn to_executed_block(hash: B256, header: &Header) -> ExecutedBlock {
    ExecutedBlock {
        hash: from_b256(hash),
        parent_hash: from_b256(header.parent_hash),
        number: header.number,
        state_root: header.state_root.0,
    }
}
```

小さなヘルパー 3 つ:

- **`to_b256`** — `BlockHash → B256`。`.0` で内側の `[u8; 32]` を取り出し、`B256::from` に渡す。
- **`from_b256`** — `B256 → BlockHash`。内側の bytes を newtype で wrap する。
- **`to_executed_block`** — trait の `ExecutedBlock` を内部の `(B256, Header)` から materialize。header からフィールドを引いて (`parent_hash`、`number`)、cache した hash を使う。

**なぜ 1 つの大きな変換関数ではなく 3 つに分けるのか?** 各々が 1 つのことをするから。`to_b256` と `from_b256` は pure な型変換 (ロジックなし)。`to_executed_block` は `Header` のどのフィールドが `ExecutedBlock` のどのフィールドに mapping するかを知っている。分けることで各ヘルパーが明らかに正しい形になる。

> 🛑 **流暢さ警告。** 「`B256` も `BlockHash` も `[u8; 32]` を wrap している。`transmute` で変換できないか?」 **やめてくれ。** Byte layout は同一だが、型は型システム上は別物 — それが point だ。変換関数が境界の場所を document する。将来 `BlockHash` が追加の metadata (例: checksum) を持つようになったら、`transmute` はバグになる; `to_b256` は更新すべき場所になる。

### Step 7: `engine` を crate に組み込む

`crates/evm/src/lib.rs` を開く。現状:

```rust
//! EVM execution layer — Reth integration.

pub mod in_memory;

pub use in_memory::InMemoryEvmBridge;
```

2 行追加:

```rust
//! EVM execution layer — Reth integration.

pub mod engine;
pub mod in_memory;

pub use engine::RethEvmBridge;
pub use in_memory::InMemoryEvmBridge;
```

`pub mod engine;` で module を expose。`pub use engine::RethEvmBridge;` で型を crate root に re-export。

### Step 8: コンパイル確認

```bash
cargo check -p openhl-evm
```

pass するはず。エラーが出た場合:

- **`use of undeclared crate or module 'alloy_consensus'`** — `[dependencies]` に `alloy-consensus = { workspace = true }` が抜けている。Step 1 を再確認。
- **`cannot find type 'B256' in this scope`** — import block の `use alloy_primitives::B256;` が抜けている。
- **`method 'hash_slow' not found on Header`** — alloy version の mismatch (古い alloy になっている可能性)。`cargo update` で workspace pin を refresh。

### Step 9: Unit test を追加

`crates/evm/src/engine.rs` の末尾に:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn attrs() -> PayloadAttrs {
        PayloadAttrs {
            timestamp: 42,
            fee_recipient: [0xaa; 20],
            prev_randao: [0xbb; 32],
        }
    }

    #[tokio::test]
    async fn build_then_ready_returns_alloy_hashed_block() {
        let bridge = RethEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        assert_eq!(block.parent_hash, parent);
        assert_eq!(block.number, 1);
        // Hash is computed by alloy_consensus::Header::hash_slow, not synthesized:
        // it changes if any header field changes.
        let mut alt_attrs = attrs();
        alt_attrs.timestamp += 1;
        let id2 = bridge.build_payload(parent, alt_attrs).await.unwrap();
        let block2 = bridge.payload_ready(id2).await.unwrap();
        assert_ne!(block.hash, block2.hash);
    }

    #[tokio::test]
    async fn commit_advances_head() {
        let bridge = RethEvmBridge::new();
        let parent = BlockHash([1u8; 32]);
        let id = bridge.build_payload(parent, attrs()).await.unwrap();
        let block = bridge.payload_ready(id).await.unwrap();
        bridge.commit(block.hash).await.unwrap();
        let s = bridge.state.lock().unwrap();
        assert_eq!(s.head, Some(to_b256(block.hash)));
    }

    #[tokio::test]
    async fn build_on_committed_parent_increments_number() {
        let bridge = RethEvmBridge::new();
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
        let bridge = RethEvmBridge::new();
        let err = bridge.commit(BlockHash([9u8; 32])).await.unwrap_err();
        assert!(matches!(err, BridgeError::Rejected(_)));
    }
}
```

各 test が何をカバーするか:

| テスト | 何を証明するか |
| - | - |
| `build_then_ready_returns_alloy_hashed_block` | Real hashing — 同じ `parent` でも `timestamp` を変えると `hash` が変わる。L4 が書けなかったテスト (合成 hash は timestamp を区別しなかった)。 |
| `commit_advances_head` | Commit 後、head が新ブロック (内部表現で `B256`) を指す。 |
| `build_on_committed_parent_increments_number` | Number 単調性、L4 と同じ。 |
| `commit_unknown_hash_errors` | 未知 hash の commit は `BridgeError::Rejected` を返す。 |

**key となる新テストは最初のもの**。`Header` の 1 フィールド (`timestamp`) を変えて、結果の hash が異なることを assert する。これが hashing が real であることを証明する — alloy が実際に RLP encode + Keccak-256 する。L4 の `(id, number)` ベースの合成 hash はこのテストに落ちた (same parent + same number → same synthesized hash regardless of timestamp)。

## テスト

```bash
cargo test -p openhl-evm
```

期待値:

```
running 9 tests
test engine::tests::build_on_committed_parent_increments_number ... ok
test engine::tests::build_then_ready_returns_alloy_hashed_block ... ok
test engine::tests::commit_advances_head ... ok
test engine::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::build_on_committed_parent_increments_number ... ok
test in_memory::tests::build_then_ready_returns_same_block ... ok
test in_memory::tests::commit_advances_head_and_records_block ... ok
test in_memory::tests::commit_unknown_hash_errors ... ok
test in_memory::tests::validate_returns_valid ... ok

test result: ok. 9 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

L5 の 4 テストが L4 の 5 テストと並んで pass する — **両 impl が同じ trait を満たしている**。L8/L9 で書く同じ `ConsensusBridge` consumer コードがどちらに対しても動く。

よくあるエラーと修正:

- **`Header::hash_slow()` の return type 違い** — `let hash: BlockHash = header.hash_slow();` と書くと落ちる。`hash_slow()` は `B256` を返す; `from_b256` で変換する。
- **`assert_ne!(block.hash, block2.hash)` が落ちる** — `..Default::default()` まわりの問題かもしれない。`Header` を `..Default::default()` で終えているか? それが無いと all-zeros + same-timestamp で hash が等しくなる可能性。
- **`B256::from(attrs.fee_recipient)` がエラー** — `fee_recipient` は `[u8; 20]`、`B256` は `[u8; 32]`。正しい変換は `Address::from(attrs.fee_recipient)`。

## 設計を振り返る

このレッスンで encode した本質的な決定が 3 つ:

1. **内部型は alloy-native、trait 型は contract の serialization。** State は `(B256, Header)` を保存。Trait は `ExecutedBlock` を返す。変換はちょうど trait boundary でだけ起こる (`to_executed_block`)。これにより alloy が型を進化させても trait を壊さず — 変換ヘルパーだけが更新される。**production-shape の内部型を contract から decouple することが、L11+ で `LiveRethEvmBridge` に同じ trait を再利用させる。**

2. **`(B256, Header)` のタプルで、別フィールドではなく。** hash は *ちょうどこの header の hash* だ。別々に保存すると header の変更が cache hash と desync するバグを招く。タプルが両者を bind する。

3. **小さな変換ヘルパー 3 つ、1 つの大きな関数ではなく。** `to_b256` と `from_b256` は pure な型橋渡し; `to_executed_block` がフィールド mapping を知る。分けることで各ヘルパーが明らかに正しく、将来の変更も局所化する。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout c938321
diff -u ~/code/my-openhl/crates/evm/src/engine.rs ./crates/evm/src/engine.rs
diff -u ~/code/my-openhl/crates/evm/src/lib.rs ./crates/evm/src/lib.rs
diff -u ~/code/my-openhl/crates/evm/Cargo.toml ./crates/evm/Cargo.toml
```

doc comment や error message の variation は OK。struct 型、helper signature、4 method impl の logic は近く一致するはず。

リファレンスの `c938321` 時点の Cargo.toml には `reth-ethereum-primitives` も列挙されている (`engine.rs` 内では使われない)。後のレッスンのための forward-declared dep; L5 では省略する。両方とも正しい。

main に戻す:

```bash
git checkout main
```

## よくある質問

**Q: なぜ bridge impl が *2 つ* — InMemoryEvmBridge と RethEvmBridge — 同じロジックなのに?**
ロジックは同じだが **型が違う**。`InMemoryEvmBridge` は合成型 (高速 unit test 用)。`RethEvmBridge` は alloy 型 (alloy interop を validate するテスト用)。後で `LiveRethEvmBridge` は alloy 型 AND live Reth provider を使う。Step ごとに production fidelity が上がりつつ、trait surface は安定。

**Q: `Header` が ~20 フィールドあるのに、なぜ 4 つしか set しないのか?**
未設定フィールドは `Default::default()` で埋まる: `state_root = B256::ZERO`、`gas_limit = 0`、`base_fee_per_gas = None` 等。v0 では EVM が走っていないので real な `state_root` は計算できない; zero を受け入れる。Production コード (L11+) はこれらを live Reth provider から計算する。

**Q: alloy の `hash_slow` と `hash_fast` の違いは?**
`Header` に `hash_fast` メソッドは無い。命名 convention: 値を再計算するメソッドは "slow"、pre-cache された値を返すメソッドは "fast"。`Header` には pre-cache された hash が無いので `hash_slow` のみ。alloy の一部の型 (例: `SealedHeader`) は hash を持ち、`.hash()` を "fast" 版として offer する。

**Q: `cargo update` で最新の alloy を取るべき?**
不要 — workspace が alloy を specific バージョンに pin している (`alloy-primitives = "1.5"`、`alloy-consensus = "2.0"`)。`cargo update` は単にそれらが解決可能か verify するだけ; bump はしない。alloy を bump するには: root `Cargo.toml` の `workspace.dependencies` を編集し、それから `cargo update` で lock file を refresh。

## 次のレッスン (L6)

`ConsensusBridge` impl を 2 つ書いた — 合成版と real alloy 型版。両方とも consensus 側 test コードから使える (L8 から書き始める)。だがその前に L6 で consensus 側に進む: Malachite の `Context` trait — Malachite を使う任意の chain に Malachite が要求する型レベル API surface — を実装する。Associated type 10 個、factory method 4 個。L6 を終えると、自分の chain が「`Address` 型は何、`Height` 型は何、`Value` 型は何」を Malachite に答えられるようになる。これが contract の **もう半分**: L3 が自分の所有する trait だったのに対し、L6 は Malachite が所有する trait。
````

---

## Seed-file slot

L5 は Module 3 (EL test double) の sortOrder 1 に landing する:

```typescript
{
  title: 'レッスン 5 — real alloy 型を使う RethEvmBridge',
  slug: 'openhl-reth-bridge-ja',
  type: 'CONTENT',
  sortOrder: 1,
  duration: 40,
  xpReward: 70,
  content: `# レッスン 5 — real alloy 型を使う \`RethEvmBridge\`\n\n...`
},
```

## SHA pinning discipline

L5 が引用する openhl commit (§答え合わせ で参照):
- `c938321` (Stage 5b: RethEvmBridge — Reth/alloy 型に対する ConsensusBridge 実装)

## Style review notes (self-critique before paste)

- **L5 は 40 分** — コード量は L4 と同程度だが、alloy 型概念を学ぶ。
- **§計画 の「内部 vs trait-boundary」split の説明** が最重要 meta lesson。L11+ で拡張されるパターン。圧縮しない。
- **Step 4 の walk-through は密** — `hash_slow()`、`Default::default()`、alloy newtype 変換、`find` 内 closure パターン。読者が alloy idiom に初めて出会うレッスンなのでペーシングが重要。
- **Hash divergence test** がレッスンの pedagogical hook — 読者が L4 の予想を裏切る「real hashing」を目撃する。
- **§設計を振り返る の「タプルが両者を bind」point** は小さいが重要。新人 Rust 開発者は関連する値を別フィールドに置いて一方の update を忘れがち。
- **答え合わせの `reth-ethereum-primitives` 注記** — psyto/openhl は宣言するが engine.rs では使わない。レッスンを honest に保つため省略; 後のレッスンで使われるときに追加する。
- **翻訳 policy は L1-L4 JA と同一**:
  - alloy/Reth 型名 (`Header`、`B256`、`Address`、`SealedHeader` 等) は英語のまま
  - `hash_slow`、`Default::default()`、`#[async_trait]` 等は英語のまま
  - 「source of truth」「production-shape」「materialize する」等は英語のまま
  - 🛑 callout: 予測してみよう (Predict)、流暢さ警告 (Anti-fluency)
