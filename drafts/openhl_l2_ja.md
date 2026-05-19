# Building OpenHL — L2 draft (JA) — C2 build-along rewrite

> openhl SHA `13113db` (Stage 4: ConsensusBridge trait + CL/EL contract types) に対してドラフト。このレッスンは type 部分を扱う; L3 が trait 部分を扱う。
> EN ミラー: `drafts/openhl_l2_en.md`。
> Course: `building-openhl-consensus-ja` (track: `reth-l1-architect`, course #6 of 10)。

---

## L2 — `openhl-contract-types-ja`

- **Module:** 2 (Contract types)、module 内 sortOrder 0
- **Course-level sortOrder:** 1 (15 レッスン中の 2 番目)
- **Duration:** 30 分
- **XP reward:** 60
- **Type:** CONTENT

### Content

````markdown
# レッスン 2 — `openhl-types` の共通 contract type

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-types
```

…が 5 つの contract primitive をカバーする 4 テストで pass する。`openhl-types` crate が consensus と EVM の両方が依存する **共通語彙** になる — これらの type のために両側が import する唯一の crate だ。アプリケーションロジックはまだない; L3 で contract trait が参照するデータ定義を整える段階。

## おさらい

L1 が終わって、workspace は次の状態にある:

```
~/code/my-openhl/
├── Cargo.toml          # Reth と Malachite を pin した workspace root
├── Cargo.lock          # full lock file (Reth/Malachite 解決済み)
├── rust-toolchain.toml # rustc 1.95.0
├── bin/openhl/         # "openhl v0.1.0" を print する binary
├── crates/
│   ├── types/          # 空 — `//! Shared primitives...` の doc comment のみ
│   ├── codec/
│   ├── clob/
│   ├── consensus/      # 空
│   ├── evm/            # 空
│   ... (6 個の空 crate がもう) ...
└── target/             # キャッシュされたコンパイル結果
```

`cargo check --workspace` が通る。`cargo test -p openhl-types` は 0 テストを実行して成功する。

## 計画

`crates/types/src/lib.rs` に 5 つの contract type を追加する:

| Type | 形 | contract での役割 |
| - | - | - |
| `BlockHash` | `pub struct BlockHash(pub [u8; 32])` | 32-byte hash、Ethereum convention。ブロックを参照するあらゆる場所で使う。 |
| `PayloadId` | `pub struct PayloadId(pub u64)` | `build_payload` が返し、`payload_ready` に渡す。 |
| `PayloadAttrs` | `pub struct PayloadAttrs { timestamp, fee_recipient, prev_randao }` | payload build job の入力。 |
| `PayloadStatus` | `pub enum PayloadStatus { Valid, Invalid, Syncing }` | `validate_payload` の verdict。 |
| `ExecutedBlock` | `pub struct ExecutedBlock { hash, parent_hash, number, state_root }` | consensus round が commit する対象。 |

加えて `BlockHash` に `Display` impl を 1 つ (ログが `BlockHash([171, 18, ...])` ではなく `0xab12...` を print するように)。

加えて 4 つの unit test: BlockHash の hex display、PayloadStatus の equality、ExecutedBlock の cloneability、BlockHash の serde round-trip。

この 5 つの type が CL↔EL contract の **共通語彙** だ。consensus crate と evm crate の両方がこれらを import する。3 番目の crate `openhl-types` に置く — `openhl-consensus` でも `openhl-evm` でもない場所に — 理由は §設計を振り返る で説明する。

> 🛑 **予測してみよう。** 上の表の 5 type を見る。**なぜ `PayloadStatus` が enum (3 variant) であって `bool` ではないのか?** ヒント: EL が各 answer を返したとき consensus node は何をすべきかを考える。3 つの違う action があり、2 つではない。

## 手を動かす walk-through

### Step 1: `crates/types/src/lib.rs` を開く

現在の内容 (L1 から):

```rust
//! Shared primitives and CL/EL contract types.
```

このコメントの下に type 定義を足していく。

### Step 2: `Cargo.toml` に `serde` があることを確認

L1 で `crates/types/Cargo.toml` を次のように設定済みのはず:

```toml
[dependencies]
serde = { workspace = true }
```

これでよい; `#[derive(Serialize, Deserialize)]` 行で使う。編集不要。

### Step 3: import を足す

`crates/types/src/lib.rs` を編集する。doc comment の後に:

```rust
//! Shared primitives and CL/EL contract types.

use std::fmt;

use serde::{Deserialize, Serialize};
```

`std::fmt` は `BlockHash` の `Display` impl 用。`serde::{Deserialize, Serialize}` は全 type の derive 用 — どの contract type も最終的に wire format で round-trip する必要があるので。

### Step 4: `BlockHash` を追加

```rust
/// 32-byte block hash, Ethereum convention.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct BlockHash(pub [u8; 32]);

impl fmt::Display for BlockHash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("0x")?;
        for b in &self.0 {
            write!(f, "{b:02x}")?;
        }
        Ok(())
    }
}
```

**Newtype パターン。** `BlockHash` は `[u8; 32]` のラッパーで、type alias ではない。これが重要: ラッパーなら compiler は `let h: BlockHash = [0u8; 32];` を reject する (明示的にラップが必要)。Type alias (`type BlockHash = [u8; 32];`) ならどちらでも通り、`BlockHash` が期待される場所に無関係な `[u8; 32]` を渡してもエラーにならない。**Newtype は「これは特定的に block hash である、ただの 32 bytes ではない」と Rust の型システムにチェックさせる方法だ。**

**32 bytes なのになぜ `Copy`?** Copy semantics で `BlockHash` を `.clone()` なしに value で渡せる。コストは小さい (32 bytes の memcpy)、得るものは大きい — block hash を頻繁にやり取りするので。代替 (`Clone` のみ) では call site すべてで `.clone()` が必要で、ノイズになる。

**なぜ 10 個も trait derive するのか?** `Debug` は `{:?}` フォーマット用; `Clone, Copy` で value semantics; `PartialEq, Eq` で equality test; `PartialOrd, Ord` でソート (validator が block を sort する場面が出てくる); `Hash` で `HashMap` の key に; `Serialize, Deserialize` で wire format。Contract type はどれも大体この同じセットを必要とする。

**なぜ custom `Display` impl?** デフォルトの `Debug` は `BlockHash([171, 18, 240, ...])` を print し、ログが読めない。Custom `Display` は `0xab12f0...` を print し、Ethereum convention に合わせる。ログは debugger の primary tool だ; 人間に読める形にすることは optional ではない。

`cargo check -p openhl-types` を走らせる。pass するはず。

### Step 5: `PayloadId` を追加

```rust
/// Identifier returned by `build_payload`; used to retrieve the assembled block via `payload_ready`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PayloadId(pub u64);
```

同じ newtype パターン、より小さな backing type。`Display` impl は不要 — `Debug` (`PayloadId(42)`) でログには十分。

ここに `PartialOrd, Ord` は無い。Block hash は順序付けが必要 (ソート用); payload ID は不要 (`build_payload` と `payload_ready` の間で受け渡す不透明 token に過ぎない)。

> 🛑 **やりがちな勘違い。** 「なぜ `u64` をそのまま使わないのか? PayloadId はただの数字だ。」 **Newtype が footgun を防ぐから。** `u64` を直接使うと `build_payload(..., some_random_u64)` と書けてしまい、Cargo は捕捉しない。`PayloadId(u64)` なら compiler が `PayloadId(some_random_u64)` と明示的に書くことを強制し、意図が見えるようになる。コストは construction ごとに余分な `(...)` 1 個; 利益はコード中のすべての payload ID が「証明可能に payload ID である」状態になること、誰かのタイプミスの integer が紛れ込まない。

### Step 6: `PayloadAttrs` を追加

```rust
/// Inputs to a payload-build job.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayloadAttrs {
    pub timestamp: u64,
    pub fee_recipient: [u8; 20],
    pub prev_randao: [u8; 32],
}
```

Newtype ではない real struct — 複数フィールド。3 つの中身:

- `timestamp` — Unix 秒、proposer が選ぶ
- `fee_recipient` — 20-byte Ethereum address、gas fee の送り先
- `prev_randao` — 32-byte beacon-chain randomness (前ブロックから)

この 3 つが Reth が payload を assemble するのに **最小限** 必要なものだ。Ethereum Engine API 仕様にはもっとフィールドがある (`suggestedFeeRecipient`、`parentBeaconBlockRoot`、`withdrawals` 等)。v0 では省略する — openhl は single-validator で、withdrawal flow を持たないので。

ここでは `Copy` は derive しない — 60 bytes は Copy の comfortable な閾値を超える。Caller が渡すときに明示的に `clone()` する。

### Step 7: `PayloadStatus` を追加

```rust
/// Verdict from `validate_payload`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PayloadStatus {
    Valid,
    Invalid,
    Syncing,
}
```

3 つの variant、それぞれ specific な consensus 側応答に対応する:

- **`Valid`** — EL が block を適用し、期待された state を得た。投票する。
- **`Invalid`** — EL が block を適用したが結果が間違っていた (state-root mismatch、gas-limit 違反等)。Nil 投票; この proposer を faulty として扱う。
- **`Syncing`** — EL がまだ答えるための state を持っていない (chain が遅れている)。まだ投票しない; 待つか timeout に falling する。

**3 variant は互換ではない**。`Syncing` を `Invalid` のように扱うと、答えられたはずの peer から永久に fork する。`Invalid` を `Syncing` のように扱うと、bad proposal が通ってしまう。L3 (trait のレッスン) でこの話を深掘りする; 今は 3 つの区別された verdict を encode したという状態。

### Step 8: `ExecutedBlock` を追加

```rust
/// An executed block — the artifact a consensus round commits to. Minimal v0 shape; txs and receipts land per Module 2.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutedBlock {
    pub hash: BlockHash,
    pub parent_hash: BlockHash,
    pub number: u64,
    pub state_root: [u8; 32],
}
```

フィールド:

- `hash` — このブロックの hash
- `parent_hash` — 前ブロックの hash、chain を構成する
- `number` — block height (parent.number + 1、単調)
- `state_root` — execution 後の state の Merkle root (32 bytes)

ここに **無い** もの (意図的):

- transaction list — Module 2 (CLOB) で transaction が landing する; v0 は空ブロックを produce する
- receipts list — 同様
- logs bloom — 同様
- difficulty / mix hash — post-merge のデフォルト

これが consensus round が閉じるのに必要な最小形だ。Module 2-5 が landing するにつれて `ExecutedBlock` にフィールドが増えていく。いま最小形にしておけば、Module 2 を設計する前に Module 2 の design を encode してしまう事態を避けられる。

`cargo check -p openhl-types` を走らせる — 引き続き pass するはず。

### Step 9: Unit test を追加

`crates/types/src/lib.rs` の末尾に追加:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn block_hash_display_is_hex() {
        let h = BlockHash([0xab; 32]);
        let s = format!("{h}");
        assert!(s.starts_with("0x"));
        assert_eq!(s.len(), 2 + 64); // "0x" + 64 hex chars
        assert!(s.ends_with("ab"));
    }

    #[test]
    fn payload_status_equality() {
        assert_eq!(PayloadStatus::Valid, PayloadStatus::Valid);
        assert_ne!(PayloadStatus::Valid, PayloadStatus::Invalid);
        assert_ne!(PayloadStatus::Syncing, PayloadStatus::Valid);
    }

    #[test]
    fn executed_block_is_cloneable() {
        let original = ExecutedBlock {
            hash: BlockHash([1u8; 32]),
            parent_hash: BlockHash([0u8; 32]),
            number: 1,
            state_root: [2u8; 32],
        };
        let cloned = original.clone();
        assert_eq!(cloned.number, original.number);
        assert_eq!(cloned.hash, original.hash);
    }

    #[test]
    fn block_hash_serde_round_trips() {
        let original = BlockHash([0x42; 32]);
        let json = serde_json::to_string(&original).unwrap();
        let round_tripped: BlockHash = serde_json::from_str(&json).unwrap();
        assert_eq!(original, round_tripped);
    }
}
```

最後のテストには dev-dependency として `serde_json` が必要。`crates/types/Cargo.toml` に追加:

```toml
[dev-dependencies]
serde_json = { workspace = true }
```

## テスト

```bash
cargo test -p openhl-types
```

期待値:

```
running 4 tests
test tests::block_hash_display_is_hex ... ok
test tests::executed_block_is_cloneable ... ok
test tests::payload_status_equality ... ok
test tests::block_hash_serde_round_trips ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

テストが失敗する場合、典型的なミス:

- **`#[derive(Clone)]` や `#[derive(PartialEq)]` を type に書き忘れた。** Compiler error が欠けている trait 名を教えてくれる。
- **`BlockHash` に `Display` impl が無い**。`format!("{h}")` は `Display` を要求する、`Debug` ではない。
- **`[dev-dependencies]` に `serde_json` を追加し忘れた**。`serde_json::to_string` が解決しない。

## 設計を振り返る

このレッスンで encode した本質的な決定が 2 つ:

1. **Contract type は別 crate (`openhl-types`) に置く。** `openhl-consensus` でも `openhl-evm` でもない。理由は Rust の crate-graph の制約: もし `BlockHash` を `openhl-consensus` に置くと、`openhl-evm` はその type を使うために `openhl-consensus` に依存する必要がある。でも `openhl-consensus` も `openhl-evm` が impl するメソッドを call する必要がある — `openhl-consensus` が `openhl-evm` に依存することになる。**A→B と B→A は循環依存で、Rust は許可しない。** Fix は **shared vocabulary crate**: `openhl-consensus` と `openhl-evm` の両方が `openhl-types` に依存し、両者は type 定義のために互いに依存しない。これは CL↔EL split を持つあらゆる Rust workspace の standard なパターン — Reth も同じ目的で `alloy-primitives` と `reth-primitives-traits` を使っている。

2. **PayloadStatus は enum、bool ではない。** L0 / 上の予測で flag した話。3 状態は互換ではない: EL が *どの* not-Valid 状態にいるかで consensus 側応答が変わる。`bool { is_valid }` に collapse すると chain の liveness にとって load-bearing な情報を失う — Syncing node を Invalid として扱うと、助けてくれたはずの peer から永久に fork する。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 13113db
diff -u ~/code/my-openhl/crates/types/src/lib.rs ./crates/types/src/lib.rs
```

自分のコードは実質的に同一になっているはず、空白とテスト名以外は。重要な一致ポイント: type 定義 (各フィールド、各 derive)、`BlockHash::Display` impl のロジック、`PayloadStatus` enum の variant 順序。

main に戻す:

```bash
git checkout main
```

## よくある質問

**Q: `BlockHash::Display` のテストが失敗する — 「2+64 文字期待、X 文字」。**
おそらく `write!(f, "{b:x}")` (single hex digit) を書いた、`write!(f, "{b:02x}")` (2 hex digits、zero-padded) ではなく。Byte value 0x05 の場合、`{b:x}` は `"5"` を produce するが `{b:02x}` は `"05"` を produce する。テストは 1 byte あたり 2 文字を期待している。

**Q: `ExecutedBlock` を `Copy` にできるか?**
今の形式ではできない — production では `Vec<...>` (transaction list) を含み、`Vec` は `Copy` ではない。v0 では fixed-size フィールドだけなので *理論的には* Copy にできるが、後で外す手間を避けるために意図的に derive しない。フィールドが byte 列だけだとクローンも安いので、必要な call site で明示的に `.clone()` すればよい。

**Q: なぜ `prev_randao` が 32 bytes? 「ランダム性」なのに?**
前ブロックの RANDAO mix の hash (Ethereum の beacon-chain randomness beacon) だ。32 bytes = SHA-256 output。実際のエントロピー source は beacon chain だが、我々は hash として受け取る、したがって type は `[u8; 32]`。

**Q: `BlockHash` に `Default` を derive すべき?**
できる (`[u8; 32]` の `Default` は all-zeros) が、**ここでは derive しない** — openhl convention は「block hash は real data から compute されるもの」。Default-construct された `BlockHash([0u8; 32])` は code smell。Sentinel が必要な test code は `BlockHash([0u8; 32])` を明示的に書く。

## 次のレッスン (L3)

`openhl-types` には 5 つの contract type が揃った。L3 は `ConsensusBridge` trait — consensus が call する 4 メソッド API surface。Trait は今書いた type を参照する: `build_payload(BlockHash, PayloadAttrs) -> PayloadId`、`payload_ready(PayloadId) -> ExecutedBlock` 等。L3 を終えると contract が type レベルで完全に specified された状態になる; L4 でその impl を始める。
````

---

## Seed-file slot

L2 は Module 2 (Contract types) の sortOrder 0 に landing する:

```typescript
{
  title: 'レッスン 2 — openhl-types の共通 contract type',
  slug: 'openhl-contract-types-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 30,
  xpReward: 60,
  content: `# レッスン 2 — \`openhl-types\` の共通 contract type\n\n...`
},
```

## SHA pinning discipline

L2 が引用する openhl commit (§答え合わせ で参照):
- `13113db` (Stage 4: ConsensusBridge trait + CL/EL contract types — 1 commit で追加された; L2 は type 部分、L3 が trait 部分)

## Style review notes (self-critique before paste)

- **L2 は 30 分で L1 (45 分) より短い**。TOML/Cargo まわりの作業が減り、Rust の type 設計と derive の理解に集中する。XP 60 はその反映。
- **Step 4 の「なぜ 10 個も trait derive するのか」サブ説明** が最も leverage が高い段落。新人 Rust 開発者は over-derive (または under-derive) するが理由を知らない。Derive を 1 つずつ walk すると、その後のパターンが見える。
- **Step 5 のやりがちな勘違い callout** (「なぜ `u64` をそのまま使わないのか?」) は newtype パターンの教えを具体化したもの。Junior Rust 開発者は plain `u64` に reach しがちで、この callout がコストを名指す。
- **Unit test は 4 ケースの簡単なもの**で、網羅的でない。読者に *何か pass するもの* を渡すのが目的で、type 定義の網羅的検証 (それは proptest の領域) が目的ではない。テストはまた `Display`/`Clone`/`PartialEq`/`Serialize` が実際に動くことを示すのにも有用。
- **Step 9 の `serde_json` dev-dep 追加** は読者がはまる小さな footgun — テストを書いて走らせると "serde_json not found" になる。Q&A エントリで対応しているが、Step 9 で先に言及するのもありかもしれない。
- **翻訳 policy**:
  - Rust の syntax 用語 (newtype、type alias、derive、trait、struct、enum、Copy、Clone、Hash、Display、Debug、Serialize、Deserialize 等) は英語のまま
  - Cargo の用語 (`[dependencies]`、`[dev-dependencies]`、`workspace`、`crate`) は英語のまま
  - コードブロック、ファイルパス、command は英語のまま
  - 🛑 callout: 予測してみよう (Predict)、やりがちな勘違い (Anti-fluency)
  - 「fork する」「stall する」「commit する」「derive する」は英語動詞の JA 化で OK (tech-JA で確立済み)
