# OpenHL を作る — L10 draft (JA) — C2 build-along 書き直し

> openhl SHA `708472c` (Stage 6d — engine actor pipeline 経由の最初のブロック) 基準。
> コース: `building-openhl-consensus-ja` (track: `reth-l1-architect`, 10 コース中 6 番目)。
> 注: L10 は **real block を produce する** マイルストーン — ここで openhl build arc の Module 1 が閉じる。本レッスン後、single-validator chain は actor system 経由で約 0.02 秒で real block を decide する。L11-L15 で in-memory bridge から live Reth EthereumNode に移行する。

---

## L10 — `openhl-engine-app-ja`

- **モジュール:** 5 (Engine integration — 新規モジュールの最初のレッスン)
- **モジュール sortOrder:** 5 (CL types の後)
- **コース全体 sortOrder:** 9 (16 レッスン中 10 番目)
- **所要時間:** 55 分
- **XP:** 100
- **type:** CONTENT

### Content

````markdown
# レッスン 10 — `run_engine_app` と actor pipeline 経由の最初のブロック

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-consensus
```

上記の実行結果が **21 個のテストすべてに合格する** (L9 から 20 個 + 新規 integration test 1 個)。新規テスト:

```
test engine_app::tests::first_block_via_engine_actors ... ok
```

上記の実行結果が Malachite actor system を spawn し、そこに real な consensus round を駆動し、engine が decide した hash を bridge が正確に commit したことを assert する。**Wall-clock: 0.02 秒。** これが「engine が boot する」から「engine が block を produce する」へ移るマイルストーンだ。

新規ファイルは 1 つ:

- **`crates/consensus/src/engine_app.rs`** — app loop。`Channels<OpenHlContext>::consensus` から `AppMsg<OpenHlContext>` を読み、各 variant をルーティングする: bridge 経由で payload を build し、`GetValue` に `LocallyProposedValue` で reply し、bridge 経由で decided value を commit し、decided hash のリストを返す。

## おさらい

L9 完了時点で `openhl-consensus` crate には以下がある:

```
crates/consensus/src/lib.rs               — pub mod bridge, codec, context, node, signing, signing_provider, types
crates/consensus/src/node.rs              — OpenHlNode + start_engine works (smoke test 合格)
crates/consensus/src/codec.rs             — OpenHlCodec
crates/consensus/src/signing_provider.rs  — SigningProvider impl
crates/consensus/src/context.rs           — Context impl
crates/consensus/src/types/               — 型ファイル 7 個
crates/consensus/src/bridge.rs            — ConsensusBridge trait + InMemoryEvmBridge
```

`cargo test -p openhl-consensus` でテスト 20 個が合格する。Engine は起動も終了もするが、**silent だ。** `start_engine` が返ると同時に engine の actor は `AppMsg::ConsensusReady` を送り、reply を待つ。誰も reply しない。Actor は parked になる。**L10 がそこを修正する。**

## 計画

5 つやる:

1. **`crates/consensus/Cargo.toml` に `tracing` を追加する** — loop の「channel-closed」パスで `tracing::warn!` を使う。
2. **`crates/consensus/src/engine_app.rs` を作成する** — `B: ConsensusBridge` に対してジェネリックな async 関数 `run_engine_app<B>` と `default_attrs()` ヘルパー。ルーティングロジックは約 130 行。
3. **`pub mod engine_app;`** を `lib.rs` に配線する。
4. **integration test `first_block_via_engine_actors`** と `StubBridge` test fixture (`ConsensusBridge` を同期的にインメモリで impl したもの) を追加する。
5. **実行** — `cargo test -p openhl-consensus first_block_via_engine_actors` が約 0.02 秒で合格する。**じっくり見届けよう。**

このレッスンが教えるのは **actor-message-loop パターン** だ。ほとんどの consensus engine (CometBFT、Hotstuff、Aura) は **何らかの** 「application interface」を持つが、形は様々だ: callback、gRPC service、FFI バインディングなど。Malachite のアプローチは型付きメッセージの `tokio::mpsc` チャネル — 強型、async-native、チャネルごとに single-threaded だ。`run_engine_app` はそれらメッセージの **consumer**、engine actor は **producer** になる。**このパターンを理解すれば、どの chain フレームワークの「application interface」もそのバリアントに帰着する。**

> 🛑 **考えてみよう。** スクロールする前に: engine が `AppMsg::GetValue` (「次の block を propose しろ」) を送ってきたとき、app はなぜ `BlockHash` だけでなく `LocallyProposedValue(height, round, value)` で reply するのか? ヒント: engine が rest-of-consensus を通じて wire する value は、commit する value だ。hash だけ送ったら、engine は他の validator に proposal の内容を gossip したり certificate に含めたりする手段がない。**ラップすることで value が BFT machine 内で first-class になる。** (こちらの single-validator devnet では他の validator が gossip を受け取らないが、engine は自分が solo で走っていることを **知らない**。)

## 手順

### Step 1: Cargo.toml に `tracing` を追加

`crates/consensus/Cargo.toml` を開く。L9 後、`[dependencies]` セクションは次で終わっている:

```toml
sha2                                          = "0.10"
serde                                         = { workspace = true }
tokio                                         = { workspace = true }
```

1 行追加:

```toml
tracing                                       = { workspace = true }
```

`tracing` は workspace 標準の logging crate だ。ここでは `tracing::warn!` を 1 ケースだけ使う: reply channel が、engine が会話途中で終了したために閉じている場合だ。`tokio::mpsc::oneshot` の closed reply channel はこちらのコードのバグではない — 上流が諦めたサインだ。ログするが伝播はしない。

### Step 2: `crates/consensus/src/engine_app.rs` を作成 — import と signature

モジュール doc + import から:

```rust
//! Engine app loop — consumes `AppMsg` from the Malachite engine and routes
//! every consensus-relevant event through a [`ConsensusBridge`].
//!
//! This is the missing half of L9: with `OpenHlNode::start()` spinning
//! up the actor system, this loop is what makes those actors do useful work.
//! Once a `Decided` arrives we commit through the bridge, increment height,
//! and (optionally) stop after N decisions for tests.

use std::sync::Arc;

use eyre::eyre;
use informalsystems_malachitebft_app::engine::host::Next;
use informalsystems_malachitebft_app_channel::{AppMsg, Channels};
use informalsystems_malachitebft_core_types::Height as _;
use openhl_types::{BlockHash, PayloadAttrs};

use crate::bridge::ConsensusBridge;
use crate::context::OpenHlContext;
use crate::types::{OpenHlHeight, OpenHlValidatorSet, OpenHlValue};

const APP_REPLY_WAIT_LOG: &str = "engine_app: peer replied unsuccessfully (channel closed)";
```

注目すべき import:

- **`AppMsg, Channels`** (`app_channel` から) — メッセージ enum と channel-bundle 型。`Channels::consensus` が `AppMsg<Ctx>` の mpsc receiver だ。
- **`Next`** (`app::engine::host` から) — `Decided` の reply で engine に「次は何か?」を伝える enum (次の height を start、停止、など)。
- **`Height as _`** — trait `Height` を import するが (`.increment()` メソッドを使うため)、名前を scope に入れない (自前の `OpenHlHeight` newtype を使うため)。
- **`Arc`** — `run_engine_app` は bridge を `Arc<B>` で取り、long-running task に参照を clone できるようにする。

次に関数 signature:

```rust
/// Drive the engine app loop until `stop_after_decisions` decisions have been
/// committed through the bridge, or the consensus channel closes.
///
/// Returns the `BlockHash`es that were decided, in order. Single-validator mode
/// uses this with `stop_after_decisions = 1` to exit after the first block.
#[allow(clippy::too_many_lines)] // 12 AppMsg arms — laid out flat for lesson L11's match-by-match walk
pub async fn run_engine_app<B>(
    bridge: Arc<B>,
    mut channels: Channels<OpenHlContext>,
    validator_set: OpenHlValidatorSet,
    stop_after_decisions: usize,
) -> eyre::Result<Vec<BlockHash>>
where
    B: ConsensusBridge + 'static,
{
    let mut decided: Vec<BlockHash> = Vec::new();
    let mut current_parent = BlockHash([0u8; 32]);
    let mut current_height = OpenHlHeight::INITIAL;

    while let Some(msg) = channels.consensus.recv().await {
        match msg {
            // ... 12 arms come here ...
        }
    }

    Err(eyre!(
        "consensus channel closed after {n} decisions (wanted {stop_after_decisions})",
        n = decided.len()
    ))
}
```

5 個のパラメータ/状態:

- **`bridge: Arc<B>`** — `build_payload`、`payload_ready`、`commit` で app loop が呼ぶ `ConsensusBridge` 実装だ。後で share したいので `Arc` にしている。`B` がジェネリックなので、同じ loop が `InMemoryEvmBridge`、`RethEvmBridge`、`LiveRethEvmBridge` (L12) で動く。
- **`channels: Channels<OpenHlContext>`** — value で取る (そのあと `mut` にして `recv` を呼ぶ)。呼び出し側で `take_channels()` した後の channels を所有する。
- **`validator_set: OpenHlValidatorSet`** — `ConsensusReady` と `GetValidatorSet` で echo back する single-validator set だ。
- **`stop_after_decisions: usize`** — test 用エルゴノミクス。Single-validator devnet では `1`、multi-validator デプロイでは `usize::MAX` を渡す。

3 個の loop 状態:

- **`decided: Vec<BlockHash>`** — アキュムレータ。終了時に返す。
- **`current_parent: BlockHash`** — **次の** block が積み上がる先。全ゼロ (genesis) から始まり、commit ごとに just-decided hash になる。
- **`current_height: OpenHlHeight`** — engine が今いる height。`INITIAL` から始まり、`StartedRound` と `Decided` で bump される。

`while let Some(msg) = channels.consensus.recv().await` loop が actor-message app の心臓だ: message を receive、variant で dispatch、(該当するなら) reply、continue。`recv()` が `None` を返したら channel が閉じている — それが error path だ。

### Step 3: `ConsensusReady` と `StartedRound` の arm

`match` 内に追加:

```rust
            AppMsg::ConsensusReady { reply, .. } => {
                if reply
                    .send((current_height, validator_set.clone()))
                    .is_err()
                {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ConsensusReady)");
                }
            }

            AppMsg::StartedRound {
                height,
                round: _,
                reply_value,
                ..
            } => {
                current_height = height;
                if reply_value.send(Vec::new()).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (StartedRound)");
                }
            }
```

**`ConsensusReady`** は engine からの「consensus を start していいか? どの height でどの validator set で?」という問いだ。Reply は tuple `(current_height, validator_set.clone())`。各 `reply` は `oneshot::Sender<...>` で、`send()` はそれを consume して `Result<(), T>` を返す (`T` は送ろうとしたもので、エラー時に返却される)。Closed reply channel からは回復しない — 単にログするだけだ。

**`StartedRound`** は engine からの「ある height で new round が始まった」という通知だ。`current_height` を更新し、空の `Vec` で reply する (この height で格納済みの proposed value のリスト。何も cache していない)。`round: _` で round 値を unbind しているのは、single-validator mode では不要だからだ — peer がない場合、engine は round 間で value を gossip-restream しない。

### Step 4: `GetValue` arm — proposal を build

これが load-bearing な arm だ。追加する:

```rust
            AppMsg::GetValue {
                height,
                round,
                timeout: _,
                reply,
            } => {
                let attrs = default_attrs();
                let id = bridge.build_payload(current_parent, attrs).await?;
                let block = bridge.payload_ready(id).await?;
                let value = OpenHlValue(block.hash);
                let lpv =
                    informalsystems_malachitebft_app_channel::app::types::LocallyProposedValue::new(
                        height, round, value,
                    );
                if reply.send(lpv).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValue)");
                }
            }
```

Engine からの問いは「height H、round R で value を propose しろ、timeout T」だ。こちらは:

1. **payload attrs を build する** — 今のところデフォルト値だ (`timestamp: 0`、`fee_recipient: zero`、`prev_randao: zero`)。L12 ではこれらが engine の時刻概念や validator の address から来るようになる。
2. **`bridge.build_payload(current_parent, attrs).await`** — EL を蹴る: 「`current_parent` の上に、これらの attrs で block を build しろ」。`PayloadId` を返す — in-flight build を track するために EL が使うハンドルだ。
3. **`bridge.payload_ready(id).await`** — 完了した block を fetch する。L4-L5 の in-memory bridge は即座に produce する。live Reth (L12+) では 10-50ms かかるかもしれない。
4. **`block.hash` を `OpenHlValue` でラップし、さらに `LocallyProposedValue::new(height, round, value)` でラップする。**
5. **engine に `LocallyProposedValue` で reply する。**

`build_payload` と `payload_ready` の `?` 演算子は `BridgeError` を `eyre::Result` に伝播する。EL が build 途中で crash したら、app loop はエラーを返し、テストは大きな声で失敗する。

> 🛑 **やりがちな勘違い。** 「`GetValue` はなぜ `OpenHlValue` だけでなく `LocallyProposedValue` で reply するのか?」 **Engine がこちらの propose したものを、ローカルで使うだけでなく **gossip** する必要があるからだ。** `LocallyProposedValue` は「この value を **こちらが** height H round R で propose した」と言う型付きラッパーだ。Multi-validator モードでは engine がこれを `Proposal` として peer に送る。Single-validator モードでは peer はいないが、API は分岐しないので、ラッパーを honor する。

### Step 5: `Decided` arm — block が final になる瞬間

もう一つの load-bearing な arm だ。追加する:

```rust
            AppMsg::Decided {
                certificate, reply, ..
            } => {
                let hash = certificate.value_id;
                bridge.commit(hash).await?;
                decided.push(hash);
                current_parent = hash;

                if decided.len() >= stop_after_decisions {
                    // Send a reply so consensus doesn't hang waiting on us before
                    // we drop the channel.
                    let next_height = certificate.height.increment();
                    let _ = reply.send(Next::Start(next_height, validator_set.clone()));
                    return Ok(decided);
                }

                let next_height = certificate.height.increment();
                current_height = next_height;
                if reply
                    .send(Next::Start(next_height, validator_set.clone()))
                    .is_err()
                {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (Decided)");
                }
            }
```

Engine は「height H で value が decide された — certificate はこれだ」と告げる。こちらは:

1. **`certificate.value_id` から** decided hash を抽出する。
2. **`bridge.commit(hash).await`** — この block を EL でカノニカルチェインの head として durably mark する。In-memory bridge では単に記録し、live Reth では forkchoice update を実行する。
3. **`decided` に append し**、`current_parent` を更新する。これで **次の** `GetValue` がこの hash の上に build するようになる。
4. **exit 条件をチェック** — `stop_after_decisions` に達したら `Next::Start(next_height, ...)` で reply してから (engine が hang しないように) return する。**これによってテストが 0.02 秒でクリーンに exit する。**
5. **そうでなければ**、`Next::Start(next_height, validator_set)` で reply して — 「はい、次の height で続けてください、validator set はこれです」 — loop する。

> 🛑 **考えてみよう。** exit path なのになぜ reply を送るのか? **`oneshot::Sender::send` が、reply を待っている engine actor を unblock する唯一の方法だからだ。** 単に `return Ok(decided)` すると、engine actor は drop された sender を `await` し続けて stuck になり、tear-down が遅くなる (やがて `kill_and_wait` がクリーンアップする)。先に reply しておけば engine actor は自然に終了し、`handle.kill(None)` は inevitable を確認するだけになる。

### Step 6: その他 7 arm — stub と no-op

残りの arm は短い。追加する:

```rust
            AppMsg::ExtendVote { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ExtendVote)");
                }
            }

            AppMsg::VerifyVoteExtension { reply, .. } => {
                if reply.send(Ok(())).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (VerifyVoteExtension)");
                }
            }

            AppMsg::RestreamProposal { .. } => {
                // Single-validator mode never re-streams.
            }

            AppMsg::GetHistoryMinHeight { reply } => {
                if reply.send(OpenHlHeight::INITIAL).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetHistoryMinHeight)");
                }
            }

            AppMsg::ReceivedProposalPart { reply, .. } => {
                // ProposalOnly value-payload mode — proposal parts never arrive.
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ReceivedProposalPart)");
                }
            }

            AppMsg::GetValidatorSet { reply, .. } => {
                if reply.send(Some(validator_set.clone())).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValidatorSet)");
                }
            }

            AppMsg::GetDecidedValue { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (GetDecidedValue)");
                }
            }

            AppMsg::ProcessSyncedValue { reply, .. } => {
                if reply.send(None).is_err() {
                    tracing::warn!("{APP_REPLY_WAIT_LOG} (ProcessSyncedValue)");
                }
            }
```

8 個の arm、4 カテゴリ:

- **Vote extension** (`ExtendVote`、`VerifyVoteExtension`) — `None` / `Ok(())` で reply する。Vote extension は v0 では未使用だ (`OpenHlSigningProvider::sign_vote_extension` が空バイトに署名するのと対応する)。
- **No-op** (`RestreamProposal`) — single-validator では proposal を re-stream しないので、何もしない。Reply は期待されない。
- **History/sync** (`GetHistoryMinHeight`、`GetValidatorSet`、`GetDecidedValue`、`ProcessSyncedValue`) — peer catch-up 中に使う。デフォルトで reply する: `INITIAL` height (history なし)、現在の validator set、「過去 block をくれ」には `None`。Peer がなければ catch-up は exercise されないが、engine は問い合わせてくる。
- **ProposalOnly モード** (`ReceivedProposalPart`) — `OpenHlConfig` が `ValuePayload::ProposalOnly` を設定しているので、proposal part は来ない。それでも variant は handle する必要があり、`None` で reply する。

### Step 7: `default_attrs` ヘルパー

関数の下に:

```rust
fn default_attrs() -> PayloadAttrs {
    PayloadAttrs {
        timestamp: 0,
        fee_recipient: [0u8; 20],
        prev_randao: [0u8; 32],
    }
}
```

3 フィールドすべてゼロでも、bridge は受け入れる。L12 ではこれらが real になる:
- `timestamp` は engine から来る (テストでは wall clock から)。
- `fee_recipient` は validator が configure した payout address から来る。
- `prev_randao` は前 block の hash から BLS 経由で導出される。

今は全部ゼロでも、テストは気にしないし、in-memory bridge も検証しない。

### Step 8: `engine_app.rs` を `lib.rs` に配線

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod engine_app;
pub mod node;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
```

### Step 9: integration test + `StubBridge` を追加

`engine_app.rs` の末尾:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::bridge::BridgeError;
    use crate::node::OpenHlNode;
    use crate::types::{OpenHlAddress, OpenHlValidator};
    use async_trait::async_trait;
    use informalsystems_malachitebft_app::node::{Node as _, NodeHandle as _};
    use informalsystems_malachitebft_signing_ed25519::PrivateKey;
    use openhl_types::{ExecutedBlock, PayloadId, PayloadStatus};
    use rand::rngs::OsRng;
    use sha2::{Digest, Sha256};
    use std::sync::Mutex;
    use std::time::Duration;

    #[derive(Debug, Default)]
    struct StubBridge {
        last_built: Mutex<Option<BlockHash>>,
        committed: Mutex<Vec<BlockHash>>,
    }

    #[async_trait]
    impl ConsensusBridge for StubBridge {
        async fn build_payload(
            &self,
            _parent: BlockHash,
            _attrs: PayloadAttrs,
        ) -> Result<PayloadId, BridgeError> {
            let hash = BlockHash([0x42u8; 32]);
            *self.last_built.lock().expect("poisoned") = Some(hash);
            Ok(PayloadId(1))
        }

        async fn payload_ready(
            &self,
            _id: PayloadId,
        ) -> Result<ExecutedBlock, BridgeError> {
            Ok(ExecutedBlock {
                hash: BlockHash([0x42u8; 32]),
                parent_hash: BlockHash([0u8; 32]),
                number: 1,
                state_root: [0u8; 32],
            })
        }

        async fn validate_payload(
            &self,
            _block: &ExecutedBlock,
        ) -> Result<PayloadStatus, BridgeError> {
            Ok(PayloadStatus::Valid)
        }

        async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
            self.committed.lock().expect("poisoned").push(block_hash);
            Ok(())
        }
    }

    fn make_test_node(home_dir: std::path::PathBuf) -> OpenHlNode {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr_bytes = [0u8; 20];
        addr_bytes.copy_from_slice(&digest[12..32]);
        let address = OpenHlAddress(addr_bytes);
        let validator_set = OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
        OpenHlNode::new(sk, validator_set, home_dir, "openhl-engine-test")
    }

    /// End-to-end: spawn the engine actor system, drive one block through the
    /// `AppMsg` loop, assert the bridge built+committed exactly the hash the
    /// engine decided on.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn first_block_via_engine_actors() {
        let tmp = tempfile::tempdir().unwrap();
        let node = make_test_node(tmp.path().to_path_buf());
        let validator_set = node.validator_set.clone();

        let handle = node.start().await.expect("start_engine failed");
        let channels = handle
            .take_channels()
            .await
            .expect("channels available exactly once");

        let bridge = Arc::new(StubBridge::default());
        let bridge_for_check = bridge.clone();

        let app_task = tokio::spawn(run_engine_app(bridge, channels, validator_set, 1));

        let decisions = tokio::time::timeout(Duration::from_secs(15), app_task)
            .await
            .expect("app loop timed out")
            .expect("app task panicked")
            .expect("app loop returned error");

        assert_eq!(decisions.len(), 1, "expected exactly one decided block");
        let decided_hash = decisions[0];

        let committed = bridge_for_check.committed.lock().unwrap().clone();
        assert_eq!(committed, vec![decided_hash], "bridge must commit decided hash");
        assert_eq!(
            *bridge_for_check.last_built.lock().unwrap(),
            Some(decided_hash),
            "decided hash must match what we built",
        );

        handle.kill(None).await.unwrap();
    }
}
```

3 つのピース:

- **`StubBridge`** — すべてに `BlockHash([0x42; 32])` を返す `ConsensusBridge` だ。Production-grade な test fixture のパターン: インメモリ状態 (`Mutex<Option<...>>` と `Mutex<Vec<...>>`)、Arc-able、async-friendly。Loop が走った後、テストは `last_built` と `committed` を読んで bridge が何を見たかチェックできる。
- **`make_test_node`** — L9 と同じ single-validator 構築 (`OpenHlNode::new` を 1 validator で呼ぶ) だ。
- **`first_block_via_engine_actors`** — integration test。手順:
  1. `node.start().await` で engine を spawn する。
  2. `handle.take_channels().await` で channels を取る。
  3. `tokio::spawn` task として、app loop を bridge + channels + validator set + `stop_after_decisions = 1` で spawn する。
  4. `tokio::time::timeout(Duration::from_secs(15), app_task)` でテスト時間に bound をかける — 何かが hang したら 15 秒で fail させる (永久ではない)。
  5. ネストした `Result` を unwrap する。3 段の `.expect(...)` で剥がす: timeout → panic → loop error。
  6. **3 つを assert する**: decisions がちょうど 1 個、bridge がその hash を commit している、bridge がその hash を build している。これらが揃って完全なパイプライン (engine → app → bridge → engine → app) を証明する。
  7. クリーンアップに `handle.kill(None)` を呼ぶ。

> 🛑 **やりがちな勘違い。** 「L9 の smoke test は 2 だったのに、ここで `worker_threads = 4` なのはなぜか?」 **Integration test の方がより多くの actor を並行に回すからだ。** Smoke test は spawn + kill だけで、メッセージを produce しなかった。Integration test は `run_engine_app` task (consume + reply) + bridge の async fn 呼び出し + 複数の内部 engine actor を走らせる。4 スレッドあれば全員に余裕がある。少ないと contention (遅い) や deadlock (hang) が起きる。4 で十分余裕がある。

## テスト

```bash
cargo test -p openhl-consensus first_block_via_engine_actors
```

~5 秒後 (コンパイル + 初回 run):

```
running 1 test
test engine_app::tests::first_block_via_engine_actors ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Test 本体は ~0.02 秒で走る。5 秒は `cargo test` のオーバーヘッドだ。

全件確認:

```bash
cargo test -p openhl-consensus
```

…21 個合格するはず。

よくあるエラーと対処:

- **テストが 15 秒以上 hang する** — `tokio::time::timeout` が発火している。最有力原因は `Decided` の exit path で reply を忘れていて、engine actor が待ち続けていることだ。Step 5 を再確認 — `if decided.len() >= stop_after_decisions` 分岐は return 前に **必ず** reply する。
- **`error[E0277]: ConsensusBridge is not Send`** — bridge に `+ Send + Sync` bound が必要だ。または impl で `std::sync::Mutex` を使っている (Send) のに trait の `Send` 注釈を忘れている。`bridge.rs` を確認する。
- **`bridge.committed.lock().expect("poisoned")` panic** — task が mutex 保持中に panic したときだけ起きる。普通は bridge impl 側の panic が原因だ。bridge の `build_payload` / `commit` の panic を確認する。
- **`assert_eq!(decisions.len(), 1)` が落ちる** — `decisions` が空だ。Loop が `Decided` に到達していない。最有力原因は `GetValue` の handle を忘れていることだ (engine は `LocallyProposedValue` reply を待ち、reply なしでは進まない)。Step 4 を再確認。

## 設計の振り返り

3 つの load-bearing な決定:

1. **`run_engine_app` は `B: ConsensusBridge + 'static` に対してジェネリックだ。** 同じ loop が `StubBridge` (test)、`InMemoryEvmBridge` (L4)、`RethEvmBridge` (L5)、`LiveRethEvmBridge` (L12) で動く。Bridge の責任は **実行**、app loop の責任は **ルーティング** だ。**1 つの実装で 4 つの bridge variant を扱える。**

2. **`stop_after_decisions` は test エルゴノミクスで、production 機能ではない。** Real validator は `usize::MAX` を使い、テストは `1` を使う。このパラメータが存在することが、関数が **テスト可能に設計されている** シグナルになる — 既知の finite state まで駆動し、graceful shutdown のインフラなしで assert できる。**Test エルゴノミクスは API 表面に値する。**

3. **Closed reply channel はログし、伝播しない。** Closed `oneshot::Sender` は engine が reply 前に諦めたことを意味する — 通常は actor が外部から kill されたケースだ。これをエラーとして伝播すると、本物の問題がノイズで隠れてしまう。`tracing::warn!` 経由のログなら、頻発時に operator が調査でき、loop は壊れない。**正しいエラーハンドリング方針は、呼び出し側がその失敗で何かできるかどうかに依存する。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 708472c
diff -u ~/code/my-openhl/crates/consensus/src/engine_app.rs ./crates/consensus/src/engine_app.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

`708472c` の参照には 282 行の `engine_app.rs` が含まれる。12 個の `AppMsg` arm (substantive 5 + trivial 7)、`StubBridge` test fixture、integration test は厳密に一致するべき。Doc コメントの言い回しは個人差可。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: engine の `recv()` channel と `subscribe()` event stream の違いは?**
`recv()` channel (`channels.consensus`) は reply が要求される **命令的** メッセージ用だ: 「value を build しろ」「これを validate しろ」「H で decided」。`subscribe()` event stream は reply 不要の **broadcast** 通知用だ: 「round が始まった」「peer がダイヤルインした」。2 つは異なる方向に flow する: channel が engine→app (問い)、events が engine→all-subscribers (告知) だ。L9 の `OpenHlNodeHandle::subscribe` は placeholder で、L12 まで event を実際には消費しない。

**Q: 個別の AppMsg arm をテストせず、integration test だけにするのはなぜか?**
Arm が独立していないからだ。Engine は特定の順序で送ってくる: `ConsensusReady` → `GetValidatorSet` → `StartedRound` → `GetValue` → `Decided`。これを孤立してテストするには、その順序で送るフェイク engine を build する必要があるが、real engine を 1 block 回す方が簡単だ。**Integration test の方が書くコストが低く、証明できることが多い。** L11 で multi-validator のテストを追加するときには、個別 arm テスト (peer sync、vote extension) が意味を持つ。

**Q: なぜ `validator_set: OpenHlValidatorSet` を `Arc<...>` ではなく value で取るのか?**
`OpenHlValidatorSet` が小さく (v0 で 1 validator)、かつ `Clone` だからだ。Clone コストは struct 分のバイト数で、set 分のバイト数ではない。Validator set が 100 件以上に育ったら、`Arc` への移行を考える価値が出てくる。

**Q: `bridge.commit(hash)` が fail するとどうなるのか?**
`?` 演算子が `BridgeError` を `eyre::Result::Err(...)` として上に伝播する。テストの `app_task` は `Err(...)` を受け取り、3 段 unwrap の内側の expect で失敗して、テストは bridge エラーで panic する。**これが意図された挙動だ — commit 失敗は回復不能だ。** Production コードなら、transient なら retry、persistent なら shut down + alert する。

## 次のレッスン (L11)

Stage 6 はこれで完了だ。Stage 7 開始: `InMemoryEvmBridge` を real な Reth EthereumNode に置き換える。L11 では **dev node bootstrap** をカバーする — consensus actor と同じ tokio runtime 上で Reth を tokio task として spawn する。L12 では `LiveRethEvmBridge` (L5 の `RethEvmBridge` の live 版) を配線する。L12 完了後には、書いた `run_engine_app` が処理する **同じ** `AppMsg` loop を回す Reth-backed devnet ができあがる — `run_engine_app` は同じまま、trait impl を 1 つ差し替えるだけで、real な EVM execution layer が手に入る。
````

---

## Seed ファイルスロット

L10 は新規 Module 5 (Engine integration) の sortOrder 0 に入る:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'Foundations', sortOrder: 1 },
  2: { title: 'Contract types', sortOrder: 2 },
  3: { title: 'EL test double', sortOrder: 3 },
  4: { title: 'CL types', sortOrder: 4 },
  5: { title: 'Engine integration', sortOrder: 5 },  // 新規
},
```

```typescript
{
  title: 'レッスン 10 — run_engine_app と actor pipeline 経由の最初のブロック',
  slug: 'openhl-engine-app-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 55,
  xpReward: 100,
  content: `# レッスン 10 — \`run_engine_app\` と actor pipeline 経由の最初のブロック\n\n...`
},
```

## SHA pinning 規律

L10 が参照する openhl コミット (§答え合わせ):
- `708472c` (Stage 6d — engine actor pipeline 経由の最初のブロック)

これが Stage-6-completes / Module-1-of-openhl-completes マイルストーン。本レッスン後、single-validator chain は actor system 経由で real block を produce する。

## 翻訳セルフレビュー (paste 前)

- **「load-bearing」「actor」「mpsc」「oneshot」「reply path」** は専門語として英語のまま保持。
- **「app loop」「engine」「bridge」** はそのまま (専門語)。
- **「routing」「ルーティング」** は混在 — 文脈で読みやすい方を選択。
- **「value-payload mode」「ProposalOnly モード」** はそのまま (Malachite の用語)。
- **「考えてみよう」「やりがちな勘違い」** は L4-L9 で確立した訳語と統一。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
