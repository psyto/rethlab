# OpenHL を作る — L9 draft (JA) — C2 build-along 書き直し

> openhl SHA `d59d6cf` (Stage 6c — Node trait を実装、初の start_engine 呼び出しが動く) 基準。
> コース: `building-openhl-consensus-ja` (track: `reth-l1-architect`, 10 コース中 6 番目)。
> 注: L9 は「エンジンが起動する」マイルストーン。本レッスン後、`start_engine` が actor system を spawn し、クリーンに tear down する。L10-L15 で app loop、live Reth bridge、validate/commit パスを組み上げる。

---

## L9 — `openhl-node-ja`

- **モジュール:** 4 (CL types), モジュール内 sortOrder 3
- **コース全体 sortOrder:** 8 (16 レッスン中 9 番目)
- **所要時間:** 55 分
- **XP:** 100
- **type:** CONTENT

### Content

````markdown
# レッスン 9 — `OpenHlNode` と初の `start_engine` 呼び出し

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-consensus
```

…が **20 個のテストすべてに合格する** (L8 から 16 個 + Node impl の新規 4 個)。Capstone テスト:

```
test node::tests::start_engine_smoke_spawns_and_kills ... ok
```

…が、自分のコードに対してフル Malachite actor system を spawn し、チャンネルハンドルが 1 回だけ利用可能であることを assert し、actor system をクリーンに tear down する — **約 0.02 秒で**。本レッスン後、エンジンは起動する。残るは `Channels<OpenHlContext>` から消費して bridge を駆動する application loop のみ。

新規テスト 4 個がカバーするもの: private key file の往復、config が `ProposalOnly` payload + エフェメラルな listen address を produce すること、address 導出が L6 の runner と一致すること、`start_engine` を呼ぶ smoke test。

## おさらい

L8 完了時点で `openhl-consensus` crate には以下がある:

```
crates/consensus/src/lib.rs               — pub mod bridge, codec, context, signing, signing_provider, types
crates/consensus/src/codec.rs             — OpenHlCodec (1 個本物 + 7 個 stub Codec impl, テスト 2 個)
crates/consensus/src/signing_provider.rs  — SigningProvider<OpenHlContext>
crates/consensus/src/context.rs           — Context<OpenHlContext>
crates/consensus/src/types/               — 型ファイル 7 個
```

`cargo test -p openhl-consensus` でテスト 16 個が合格。`start_engine` が要求する trait bound は **型レベルでは** すべて満たしているが、まだ呼べない — `Node` impl も、config も、genesis も、private key file も、node handle もない。

## 計画

6 つやる:

1. **`crates/consensus/Cargo.toml` に 5 個の依存を追加** — `informalsystems-malachitebft-app-channel`、`informalsystems-malachitebft-config`、signing-ed25519 に `serde` feature を有効化、`serde` と `tokio` をランタイム dep (dev だけでなく) に追加、`tempfile` を dev-dep に追加。
2. **`crates/consensus/src/node.rs` を作成** — `OpenHlConfig` (impl `NodeConfig`)、`OpenHlGenesis` (unit struct)、`OpenHlPrivateKeyFile` (wire wrapper)、`OpenHlNodeHandle` (`start()` の戻り値)、`OpenHlNode` (メイン struct)、5 個の関連型と 12 個のメソッドを持つ `impl Node for OpenHlNode`。
3. **`pub mod node;`** を `lib.rs` に配線。
4. **ユニットテスト 4 個** を `node.rs` に追加。
5. **実行** — `cargo test -p openhl-consensus` で 20 個合格。
6. **凝視** — `start_engine_smoke_spawns_and_kills` が 0.02 秒で合格するのを。**自分のコードが動く BFT エンジンになる瞬間。**

このレッスンが教えるのは **自分のコードと Malachite を結ぶブリッジパターン**。エンジンは他人が書いたもので、`Context` と `Codec` に対してジェネリック。spawn するには 5 つが必要: context インスタンス、node インスタンス (config、署名、address 導出を取るため)、config 値、codec 値、初期 height、validator set。`Node` trait は、Malachite が自分のコードからそれらを統一的に取れるようにする **handshake インターフェース**。一度 impl すれば、同じハンドシェイクに従う任意の chain で `start_engine` は動く。

> 🛑 **予測してみよう。** スクロールする前に: なぜ Malachite は `OpenHlNode` 自身に config フィールドを持たせず、別の `OpenHlConfig` を要求するのか? ヒント: config の **所有者** と、いつ変わりうるかを考える。Node はプロセス起動時に 1 回作成されるが、設定 (listen address、value payload mode、value sync 設定) はシグナルでディスクから再ロードされうる。`OpenHlConfig` を `OpenHlNode` から分離することで、config は `Node::load_config()` 経由でロードできる — 再呼び出し可能で毎回新しい値を返す — node を再インスタンス化することなく。

## 手順

### Step 1: `crates/consensus/Cargo.toml` を更新

`crates/consensus/Cargo.toml` を開く。L8 後の `[dependencies]` セクションは:

```toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-core-driver     = { workspace = true }
informalsystems-malachitebft-core-consensus  = { workspace = true }
informalsystems-malachitebft-app             = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand"] }
bytes                                         = "1"
rand                                          = "0.8"
sha2                                          = "0.10"

[dev-dependencies]
tokio = { workspace = true }
```

これを次に置き換える:

```toml
[dependencies]
openhl-types = { workspace = true }
async-trait  = { workspace = true }
thiserror    = { workspace = true }
eyre         = { workspace = true }

informalsystems-malachitebft-core-types      = { workspace = true }
informalsystems-malachitebft-core-driver     = { workspace = true }
informalsystems-malachitebft-core-consensus  = { workspace = true }
informalsystems-malachitebft-app             = { workspace = true }
informalsystems-malachitebft-app-channel     = { workspace = true }
informalsystems-malachitebft-config          = { workspace = true }
informalsystems-malachitebft-signing-ed25519 = { workspace = true, features = ["rand", "serde"] }
bytes                                         = "1"
rand                                          = "0.8"
sha2                                          = "0.10"
serde                                         = { workspace = true }
tokio                                         = { workspace = true }

[dev-dependencies]
tokio    = { workspace = true }
tempfile = "3"

[lints]
workspace = true
```

各新規依存の用途:

- **`informalsystems-malachitebft-app-channel`** — 次に呼ぶ `start_engine()` 関数と、エンジン通信用に返される `Channels<Ctx>` 型を提供。
- **`informalsystems-malachitebft-config`** — `OpenHlConfig` に埋め込む `ConsensusConfig`, `ValueSyncConfig`, `ValuePayload` 型。
- **`signing-ed25519` の `serde` feature** — `OpenHlPrivateKeyFile` に `Serialize`/`Deserialize` を derive できるようにする (`PrivateKey` newtype が serializable である必要がある)。
- **`serde`** (runtime dep) — `OpenHlConfig`, `OpenHlGenesis`, `OpenHlPrivateKeyFile` の `#[derive(Serialize, Deserialize)]` で使用。
- **`tokio`** を dev-dep から dep へ移動 — `OpenHlNodeHandle` が `tokio::sync::Mutex` を持つ。
- **`tempfile`** dev-dep — smoke test が node の home dir 用に temp ディレクトリを作る。

これが 2 回目の重コンパイル。初回 `app-channel` + `config` 取得はさらに ~20 秒。

### Step 2: `crates/consensus/src/node.rs` を作成 — import と `OpenHlConfig`

Import から:

```rust
//! `Node` trait implementation — describes our chain to Malachite's engine
//! and provides the [`OpenHlNode::start`] entry point that calls
//! `malachitebft_app_channel::start_engine` to spawn the actor system.

use std::path::PathBuf;

use async_trait::async_trait;
use eyre::eyre;
use informalsystems_malachitebft_app::node::{EngineHandle, Node, NodeConfig, NodeHandle};
use informalsystems_malachitebft_app::types::Keypair;
use informalsystems_malachitebft_app_channel::Channels;
use informalsystems_malachitebft_config::{ConsensusConfig, ValueSyncConfig, ValuePayload};
use informalsystems_malachitebft_core_types::Height as _;
use informalsystems_malachitebft_signing_ed25519::{PrivateKey, PublicKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;

use crate::codec::OpenHlCodec;
use crate::context::OpenHlContext;
use crate::signing_provider::OpenHlSigningProvider;
use crate::types::{OpenHlAddress, OpenHlHeight, OpenHlValidatorSet};
```

このファイルが必要とする全表面。一度眺める価値: `Node`, `NodeConfig`, `NodeHandle` がこれから impl する 3 つの Malachite trait。`EngineHandle` + `Channels` が `start_engine` の戻り値。`ConsensusConfig` + `ValueSyncConfig` + `ValuePayload` が `OpenHlConfig` に埋め込む config 型。`Keypair` は libp2p の keypair 型。`PrivateKey`/`PublicKey` は L7 以来使っている Ed25519 型。`Sha256` は address 導出用。

次に `OpenHlConfig`:

```rust
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OpenHlConfig {
    pub moniker: String,
    #[serde(flatten)]
    pub consensus: ConsensusConfig,
    pub value_sync: ValueSyncConfig,
}

impl OpenHlConfig {
    #[must_use]
    pub fn new(moniker: impl Into<String>) -> Self {
        // OpenHL runs ProposalOnly (no streaming proposal parts) — must match
        // our `Context::ProposalPart` shape.
        let consensus = ConsensusConfig {
            value_payload: ValuePayload::ProposalOnly,
            ..ConsensusConfig::default()
        };
        Self {
            moniker: moniker.into(),
            consensus,
            value_sync: ValueSyncConfig::default(),
        }
    }
}

impl NodeConfig for OpenHlConfig {
    fn moniker(&self) -> &str {
        &self.moniker
    }
    fn consensus(&self) -> &ConsensusConfig {
        &self.consensus
    }
    fn value_sync(&self) -> &ValueSyncConfig {
        &self.value_sync
    }
}
```

3 つのピース:

- struct は `ConsensusConfig` + `ValueSyncConfig` をラップし、`moniker` (ログ用 validator のニックネーム) を追加。`consensus` の `#[serde(flatten)]` は consensus フィールドを親に inline する — ディスクへシリアライズ時、ユーザーには `[consensus]` セクションのキーが top level に見え、`consensus.` の下にネストされない。
- `new()` は重要な選択を 1 つ強制する: `value_payload: ValuePayload::ProposalOnly`。これは **必ず** `Context::ProposalPart = OpenHlProposalPart` (unit struct) と合致しなければならない。誤って `ValuePayload::PartsOnly` を設定すると、エンジンはストリームされる proposal parts を期待し、unit-struct な `ProposalPart` はエンジンが送るものを満たせない。これは構築時に強制する方が後でデバッグするより簡単なタイプの不変条件。
- `NodeConfig` impl は 3 個の自明な accessor。trait は、Malachite が親のレイアウトを知らずに sub-config を取り出せるようにあるだけ。

### Step 3: `OpenHlGenesis` と `OpenHlPrivateKeyFile`

次:

```rust
/// Genesis is a unit struct at v0 — the validator set is passed directly to
/// `start_engine` rather than read from disk. When `OpenHL` grows a real
/// on-disk genesis format this becomes the `load_genesis()` return.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct OpenHlGenesis;

/// Wire-friendly wrapper around the raw 32-byte Ed25519 private key.
#[derive(Clone, Serialize, Deserialize)]
pub struct OpenHlPrivateKeyFile {
    pub bytes: [u8; 32],
}

impl OpenHlPrivateKeyFile {
    #[must_use]
    pub fn from_private_key(sk: &PrivateKey) -> Self {
        Self {
            bytes: sk.inner().to_bytes(),
        }
    }

    #[must_use]
    pub fn into_private_key(self) -> PrivateKey {
        PrivateKey::from(self.bytes)
    }
}

impl std::fmt::Debug for OpenHlPrivateKeyFile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpenHlPrivateKeyFile")
            .field("bytes", &"[redacted]")
            .finish()
    }
}
```

2 つの型:

- **`OpenHlGenesis`** — unit struct。v0 では genesis content がない (allocation なし、ブート時の precompile 登録なし — それらは Module 6 で)。Validator set は genesis ではなく `start_engine` 経由で直接渡す。OpenHL が real genesis format を持つようになったら、これが `load_genesis()` がデシリアライズする型になる。
- **`OpenHlPrivateKeyFile`** — 32 バイトの private key の wire-friendly wrapper。`PrivateKey` 自体 (from `malachitebft_signing_ed25519`) はデフォルトで `Serialize`/`Deserialize` を impl していない; wrapper が impl し、`from_private_key` / `into_private_key` の変換は明示的。**手書き `Debug` impl** はバイトを redact する — `{:?}` で実 private key をログに出力するのは重大なセキュリティバグ。`[redacted]` トークンが慣習。

> 🛑 **流暢さ警告。** 「なぜ `#[derive(Debug)]` ではダメ?」 **デフォルト derive される `Debug` は `[u8; 32]` の 32 バイト全部を print するから。** 誰かが `OpenHlPrivateKeyFile` を別の `Debug`-derive 構造体でラップしてログに出すと、key が stderr / log file / Sentry にリークする。`[redacted]` 付き手書き `Debug` なら、意図的に変更しない限りこれは起こりえない。**Private key はパスワードと同等に扱う — 絶対に print させない。**

### Step 4: `OpenHlNodeHandle` — `start()` が返すもの

```rust
/// Handle returned by [`OpenHlNode::start`]. Owns the engine actor system
/// and the channel handles for the (yet-to-be-implemented) app loop.
pub struct OpenHlNodeHandle {
    engine: EngineHandle,
    channels: Mutex<Option<Channels<OpenHlContext>>>,
}

impl std::fmt::Debug for OpenHlNodeHandle {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OpenHlNodeHandle")
            .field("engine", &"<EngineHandle>")
            .field("channels", &"<Channels>")
            .finish()
    }
}

impl OpenHlNodeHandle {
    /// Take ownership of the engine→app message channels. Returns None on
    /// the second call. L10 will consume from this to drive the bridge.
    pub async fn take_channels(&self) -> Option<Channels<OpenHlContext>> {
        self.channels.lock().await.take()
    }
}

#[async_trait]
impl NodeHandle<OpenHlContext> for OpenHlNodeHandle {
    fn subscribe(&self) -> informalsystems_malachitebft_app::events::RxEvent<OpenHlContext> {
        // No event subscription in Stage 6c — caller can't yet observe engine
        // events. L10 wires the TxEvent from the engine to here.
        informalsystems_malachitebft_app::events::TxEvent::new().subscribe()
    }

    async fn kill(&self, _reason: Option<String>) -> eyre::Result<()> {
        self.engine.actor.kill_and_wait(None).await?;
        self.engine.handle.abort();
        Ok(())
    }
}
```

ハンドルは 2 つを所有する:

- **`engine: EngineHandle`** — spawn された actor system に対する Malachite のハンドル。`actor` (ractor の `ActorCell`) と `handle` (tokio task handle) を持つ。`kill()` は両方をクリーンに tear down する。
- **`channels: Mutex<Option<Channels<OpenHlContext>>>`** — アプリケーション側のエンドポイント。エンジンが `AppMsg<OpenHlContext>` を我々に送り、我々が `AppReply<OpenHlContext>` を返す。`Mutex<Option<...>>` なのは、`take_channels()` が app loop に 1 回だけ渡せるようにするため — 2 回目の呼び出しは `None` を返し「もう消費済み」と知らせる。

**なぜ `tokio::sync::Mutex` で `std::sync::Mutex` ではない?** `take_channels()` が `async` で、ロックが `.await` 境界を跨いで保持されるから。`std::sync::Mutex` は executor スレッド全体をブロックしてしまう; `tokio::sync::Mutex` は協調的に yield する。

`NodeHandle` impl はこの段階ではほぼ placeholder:
- `subscribe()` は **新規** `TxEvent::subscribe()` を返す — producer が attach されていない空のイベントストリーム。L10 で本物を配線する。
- `kill()` は本物 — actor cell を kill し tokio task を abort する。これが `start_engine_smoke_spawns_and_kills` で exercise されるもの。

### Step 5: `OpenHlNode` struct + `Node` impl

```rust
#[derive(Clone, Debug)]
pub struct OpenHlNode {
    pub private_key: PrivateKey,
    pub validator_set: OpenHlValidatorSet,
    pub home_dir: PathBuf,
    pub moniker: String,
}

impl OpenHlNode {
    #[must_use]
    pub fn new(
        private_key: PrivateKey,
        validator_set: OpenHlValidatorSet,
        home_dir: PathBuf,
        moniker: impl Into<String>,
    ) -> Self {
        Self {
            private_key,
            validator_set,
            home_dir,
            moniker: moniker.into(),
        }
    }
}

#[async_trait]
impl Node for OpenHlNode {
    type Context = OpenHlContext;
    type Config = OpenHlConfig;
    type Genesis = OpenHlGenesis;
    type PrivateKeyFile = OpenHlPrivateKeyFile;
    type SigningProvider = OpenHlSigningProvider;
    type NodeHandle = OpenHlNodeHandle;

    fn get_home_dir(&self) -> PathBuf {
        self.home_dir.clone()
    }

    fn load_config(&self) -> eyre::Result<Self::Config> {
        let mut cfg = OpenHlConfig::new(&self.moniker);
        // Bind to an ephemeral port on localhost so tests and devnets don't
        // step on each other. Real deployments override this in their config.
        cfg.consensus.p2p.listen_addr = "/ip4/127.0.0.1/tcp/0"
            .parse()
            .map_err(|e| eyre!("invalid listen_addr: {e}"))?;
        Ok(cfg)
    }

    fn get_address(&self, pk: &PublicKey) -> OpenHlAddress {
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr = [0u8; 20];
        addr.copy_from_slice(&digest[12..32]);
        OpenHlAddress(addr)
    }

    fn get_public_key(&self, pk: &PrivateKey) -> PublicKey {
        pk.public_key()
    }

    fn get_keypair(&self, pk: PrivateKey) -> Keypair {
        Keypair::ed25519_from_bytes(pk.inner().to_bytes())
            .expect("ed25519 private key is always 32 bytes")
    }

    fn load_private_key(&self, file: Self::PrivateKeyFile) -> PrivateKey {
        file.into_private_key()
    }

    fn load_private_key_file(&self) -> eyre::Result<Self::PrivateKeyFile> {
        Ok(OpenHlPrivateKeyFile::from_private_key(&self.private_key))
    }

    fn load_genesis(&self) -> eyre::Result<Self::Genesis> {
        // Validator set is passed directly to start_engine; genesis carries
        // nothing else at v0.
        Ok(OpenHlGenesis)
    }

    fn get_signing_provider(&self, private_key: PrivateKey) -> Self::SigningProvider {
        OpenHlSigningProvider::new(private_key)
    }

    async fn start(&self) -> eyre::Result<Self::NodeHandle> {
        let cfg = self.load_config()?;
        let validator_set = self.validator_set.clone();

        let (channels, engine) = informalsystems_malachitebft_app_channel::start_engine(
            OpenHlContext,
            self.clone(),
            cfg,
            OpenHlCodec, // WAL
            OpenHlCodec, // Network
            Some(OpenHlHeight::INITIAL),
            validator_set,
        )
        .await?;

        Ok(OpenHlNodeHandle {
            engine,
            channels: Mutex::new(Some(channels)),
        })
    }

    async fn run(self) -> eyre::Result<()> {
        // L10 will consume from channels here and run the app loop.
        Err(eyre!("OpenHlNode::run is not yet implemented (L10)"))
    }
}
```

これが load-bearing なブロック。walk-through:

**struct** は 4 つを持つ: private key、validator set、home dir、moniker。これらは config-reload では変わらない長命なフィールド。

**6 個の関連型** は各ハンドシェイクスロットの具象型を宣言する:
- `Context = OpenHlContext` — Malachite が他をすべて typecheck するのに使う
- `Config = OpenHlConfig` — `load_config()` の戻り値
- `Genesis = OpenHlGenesis` — `load_genesis()` の戻り値
- `PrivateKeyFile = OpenHlPrivateKeyFile` — `load_private_key_file()` の戻り値
- `SigningProvider = OpenHlSigningProvider` — `get_signing_provider()` の戻り値
- `NodeHandle = OpenHlNodeHandle` — `start()` の戻り値

**12 個のメソッド**:

| メソッド | 目的 | 本体 |
| - | - | - |
| `get_home_dir` | Node がデータを保存する場所 | 構築時に渡された path を返す |
| `load_config` | Config を作る (再呼出可) | `OpenHlConfig` を構築し、listen address をエフェメラル local にオーバーライド |
| `get_address` | SHA-256 ハッシュ → 20 バイト address | 32 バイト digest の最後の 20 バイト |
| `get_public_key` | SK から PK | `sk.public_key()` |
| `get_keypair` | Ed25519 から libp2p Keypair | `ed25519_from_bytes` 経由で変換 |
| `load_private_key` | File フォーマットを unwrap | `file.into_private_key()` |
| `load_private_key_file` | PK を file フォーマットへ | `OpenHlPrivateKeyFile::from_private_key(...)` |
| `load_genesis` | Genesis を読む | `OpenHlGenesis` を返す (unit struct、読むものなし) |
| `get_signing_provider` | SigningProvider を構築 | `OpenHlSigningProvider::new(pk)` |
| `start` | エンジン spawn | `start_engine` を 7 引数で呼び、戻り値を `OpenHlNodeHandle` にラップ |
| `run` | App loop を回す | **L9 では未実装** — L10 を指すエラーを返す |

**`start()` メソッドがハイライト。** `start_engine` を以下で呼ぶ:
- context (`OpenHlContext` — unit struct)
- node 自身 (`self.clone()`)
- config (`cfg`)
- 2 個の codec 値 (WAL 用と Network 用 — 両方 `OpenHlCodec`)
- 初期 height (`Some(OpenHlHeight::INITIAL)`)
- validator set (`validator_set`)

`start_engine` が返すもの: `(Channels<OpenHlContext>, EngineHandle)`。これらを `OpenHlNodeHandle` にラップして返す。

**なぜ `run()` は未実装?** Malachite の `Node::run` は `start()` と app loop を 1 個の async future にまとめる想定だから。App loop は L10 まで存在しないので、L10 を指すエラーを返す。L10 完了後、`run()` は: `start()` を呼び、channels を取り、app loop を回し、終了を await、という形になる。

> 🛑 **流暢さ警告。** 「なぜ `start()` は codec を 2 回取る?」 **エンジンが WAL 用と Network gossip 用に別々の codec スロットを持つから。** 別の型でもよい — 例えば WAL は bincode、Network は protobuf。我々のケースでは両方 `OpenHlCodec` だが、API は同じだと仮定しない。別々に渡すことで一方だけを swap できる。

### Step 6: `node.rs` を `lib.rs` に配線

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod node;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
```

### Step 7: ユニットテストを 4 個追加

`node.rs` の末尾:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::OpenHlValidator;
    use rand::rngs::OsRng;

    fn single_validator_node(home_dir: PathBuf) -> OpenHlNode {
        let sk = PrivateKey::generate(OsRng);
        let pk = sk.public_key();
        let digest = Sha256::digest(pk.as_bytes());
        let mut addr_bytes = [0u8; 20];
        addr_bytes.copy_from_slice(&digest[12..32]);
        let address = OpenHlAddress(addr_bytes);
        let validator_set = OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
        OpenHlNode::new(sk, validator_set, home_dir, "openhl-test")
    }

    #[test]
    fn private_key_file_round_trips() {
        let sk = PrivateKey::generate(OsRng);
        let file = OpenHlPrivateKeyFile::from_private_key(&sk);
        let restored = file.into_private_key();
        assert_eq!(restored.inner().to_bytes(), sk.inner().to_bytes());
    }

    #[test]
    fn load_config_sets_proposal_only_payload_and_ephemeral_listen_addr() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let cfg = node.load_config().unwrap();
        assert_eq!(cfg.consensus.value_payload, ValuePayload::ProposalOnly);
        // listen_addr should be /ip4/127.0.0.1/tcp/0 (ephemeral)
        let listen_str = cfg.consensus.p2p.listen_addr.to_string();
        assert!(
            listen_str.starts_with("/ip4/127.0.0.1/tcp/0"),
            "unexpected listen_addr: {listen_str}"
        );
    }

    #[test]
    fn get_address_matches_runner_derivation() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let pk = node.private_key.public_key();
        let addr1 = node.get_address(&pk);
        // Same derivation as runner.rs (last 20 bytes of SHA-256(pubkey)).
        let digest = Sha256::digest(pk.as_bytes());
        let mut expected = [0u8; 20];
        expected.copy_from_slice(&digest[12..32]);
        assert_eq!(addr1, OpenHlAddress(expected));
    }

    /// Smoke test: spin up the actor system, get a handle back, kill cleanly.
    /// Does NOT drive consensus — that's L10.
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn start_engine_smoke_spawns_and_kills() {
        let tmp = tempfile::tempdir().unwrap();
        let node = single_validator_node(tmp.path().to_path_buf());
        let handle = match node.start().await {
            Ok(h) => h,
            Err(e) => panic!("start_engine failed: {e:?}"),
        };
        // Sanity-poke the channels handle is available exactly once.
        assert!(handle.take_channels().await.is_some());
        assert!(handle.take_channels().await.is_none());
        handle.kill(None).await.unwrap();
    }
}
```

テスト 4 個:

1. **`private_key_file_round_trips`** — key を generate し、`OpenHlPrivateKeyFile` にラップ、unwrap、byte 等価を assert。Wire format が lossless であることを証明。
2. **`load_config_sets_proposal_only_payload_and_ephemeral_listen_addr`** — node を構築し、`load_config()` を呼び、2 つを検証: `value_payload == ProposalOnly` (構築時に強制する不変条件) と `listen_addr` がエフェメラル local socket であること。Config drift を catch する。
3. **`get_address_matches_runner_derivation`** — 同じ address を 2 通りで導出する (1 度は trait method 経由、1 度は SHA-256 ロジックを inline)。一致を assert。誰かが片方だけ変えたら検知する。
4. **`start_engine_smoke_spawns_and_kills`** — capstone。`#[tokio::test(flavor = "multi_thread", worker_threads = 2)]` を使うのはエンジンが multi-threaded runtime を必要とするから (複数 actor を spawn)。手順: single-validator node を構築、`node.start().await` を呼ぶ、channels handle を poke (1 度目 `Some`、2 度目 `None`)、`kill()` を呼ぶ。**これが pass すれば、自分のコードが動く BFT エンジンになっている。**

Smoke test の wall-clock はおおよそ **0.02 秒**。大部分は libp2p がローカル listener を立ち上げる時間 — tcp/0 のエフェメラルポートでも、libp2p のネゴシエーションには固定コストがある。

> 🛑 **流暢さ警告。** 「なぜ `flavor = 'multi_thread'`?」 **エンジンが複数 actor をそれぞれの task で spawn するから。** Single-threaded runtime は全部 1 スレッドで回せる — が、エンジン内部に single-thread だと deadlock する `block_on` パターンがある。Multi-thread runtime で回避。**API レベルでは見えないが、テスト失敗レベルでは致命的な詳細。**

## テスト

```bash
cargo test -p openhl-consensus
```

~20 秒後 (dep 変更後の初回コンパイル):

```
running 20 tests
test codec::tests::openhl_codec_satisfies_all_three_super_traits ... ok
test codec::tests::proposal_part_round_trips ... ok
test context::tests::height_increment_and_decrement ... ok
test context::tests::new_prevote_and_precommit_have_distinct_types ... ok
test context::tests::new_proposal_round_trips_fields ... ok
test context::tests::select_proposer_round_robins_deterministically ... ok
test context::tests::validator_set_is_sorted_by_power_then_address ... ok
test node::tests::get_address_matches_runner_derivation ... ok
test node::tests::load_config_sets_proposal_only_payload_and_ephemeral_listen_addr ... ok
test node::tests::private_key_file_round_trips ... ok
test signing::tests::vote_signature_is_field_sensitive ... ok
test signing::tests::vote_signature_round_trips ... ok
test signing_provider::tests::proposal_part_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_sign_verify_round_trips ... ok
test signing_provider::tests::proposal_tamper_detected ... ok
test signing_provider::tests::signature_from_one_provider_does_not_verify_under_another ... ok
test signing_provider::tests::vote_extension_sign_verify_round_trips ... ok
test signing_provider::tests::vote_sign_verify_round_trips ... ok
test signing_provider::tests::vote_tamper_detected ... ok
test node::tests::start_engine_smoke_spawns_and_kills ... ok

test result: ok. 20 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Smoke test は multi-thread runtime のセットアップで最後に走る。

よくあるエラーと対処:

- **`error[E0432]: unresolved import 'informalsystems_malachitebft_app_channel'`** — Cargo.toml に `app-channel` がない。Step 1 を再確認。
- **`error[E0277]: PrivateKey: Deserialize is not satisfied`** — `signing-ed25519` の `serde` feature が抜けている。Step 1 (`features = ["rand", "serde"]`) を再確認。
- **smoke test が永久にハングする** — 普通は `flavor = "current_thread"` (`#[tokio::test]` のデフォルト) が原因。Step 7 を再確認: 属性は `#[tokio::test(flavor = "multi_thread", worker_threads = 2)]` でなければならない。
- **`error: Keypair::ed25519_from_bytes expected mutable bytes`** — バージョン不一致。libp2p の `Keypair::ed25519_from_bytes` のシグネチャはバージョンによって変わる; workspace pin は `informalsystems-malachitebft-app` の re-export と揃える必要がある。
- **`Address derivation does not match`** — `get_address` がテストの helper と一致しない。両方とも `SHA-256(pubkey)` の最後の 20 バイト — slice `[12..32]` — を使う必要がある。

## 設計の振り返り

3 つの load-bearing な決定:

1. **`OpenHlNode` はハンドシェイクインターフェースであり、ランタイムではない。** Struct は長命なフィールド (key、validator set、home dir、moniker) を持つ。chain を **走らせ** ない。ランタイムは `OpenHlNodeHandle` (engine + channels) にあり、`start()` から返る。**構築と実行は別のライフサイクルステージ** なので、別の型に住む。

2. **Address 導出は `get_address` に集約。** L6 のセットアップコードの runner で `SHA-256(pubkey)[12..32]` を使ったとき、**同じ導出** だった。テスト `get_address_matches_runner_derivation` がそれらが同一であることを assert するので、将来のリファクタで一方だけがサイレントに drift できない。**集約 + 検証テスト は重複に毎回勝つ。**

3. **`run()` は次のレッスンを指すエラーを返す。** `unimplemented!()` (panic) や `todo!()` (これも panic) ではなく、`eyre::Result::Err("not yet implemented (L10)")` は **型安全な placeholder**。`run()` を呼ぶコードは「どこを見るべきか」を指すメッセージ付きで graceful に失敗する。**これはプルリク、コードレビュー、古いタブを越えて生き残るタイプのクラム。**

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout d59d6cf
diff -u ~/code/my-openhl/crates/consensus/src/node.rs ./crates/consensus/src/node.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

`d59d6cf` の参照には 310 行の `node.rs` が含まれる。`Node` impl のメソッド (合計 12)、struct レイアウト、smoke test は厳密に一致するべき。Doc コメントと細かい言い回しは個人差可。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: validator set が node の中にあるのに、なぜ `start_engine` は node と validator set の両方を要求する?**
エンジンが node の内部に手を伸ばさないから。Node は多くのフィールド (path、moniker、key 等) を持つが、validator-set election には関係ない。`start_engine` が validator set を明示的に受け取るので、エンジンは自分の node の具体的なフィールドレイアウトを知らなくてもよい。`Node::load_config()` と同じ関心の分離の原則。

**Q: コンパイル時アサーションが証明しないものを smoke test は何を証明する?**
L8 のコンパイル時アサーションは `OpenHlCodec: WalCodec + ConsensusCodec + SyncCodec` を証明した。Smoke test は **runtime** パス — actor spawning、channel allocation、libp2p binding、kill propagation — が end-to-end で実際に動くことを証明する。型安全性は必要条件だが十分条件ではない; テストは「spawn deadlock」「最初のメッセージでエンジンが panic する」など型では catch できないことを catch する。

**Q: `EngineHandle` と `NodeHandle` の違いは?**
`EngineHandle` (Malachite から) は spawn された actor system への低レベルハンドル — actor cell、tokio task handle。`NodeHandle` (自分の trait) は Malachite が「これはまだ生きているか? イベントを subscribe してくれ。kill しろ。」と尋ねるための高レベル抽象。自分の `OpenHlNodeHandle` は `NodeHandle<OpenHlContext>` を impl し、内部に `EngineHandle` を持つ。2 層あり、扱うのは 1 つだけ。

**Q: なぜ `take_channels` は単に channels を削除せず `Option<Channels<...>>` を使う?**
`take_channels` は **外側から** 呼ばれるから — app loop が消費したい。完全に削除するには mutable 参照かハンドル自体の move が必要。`Mutex<Option<...>>` なら app loop は共有参照 (`&self`) 経由で呼べ、channels を 1 度取得し、以降の呼び出しは `None` を見る — 「もう取った」というクリーンなシグナル。

## 次のレッスン (L10)

エンジンが動く状態になった。だが — 致命的に — **エンジンが我々にメッセージを送っているのに我々は無視している**。Actor system は parked 状態で、app loop が `Channels<OpenHlContext>` から消費して `AppMsg::ProposeValue`, `AppMsg::Decided` などに応答するのを待っている。L10 で app loop を実装する: channel に対する `tokio::select` + state struct + エンジンメッセージを `InMemoryEvmBridge` にルートするハンドラ。L10 完了で `cargo test first_block_via_engine_actors` が full engine pipeline 経由で実 block を produce する。
````

---

## Seed ファイルスロット

L9 は Module 4 (CL types) の sortOrder 3 に入る (L6, L7, L8 の後):

```typescript
{
  title: 'レッスン 9 — OpenHlNode と初の start_engine 呼び出し',
  slug: 'openhl-node-ja',
  type: 'CONTENT',
  sortOrder: 3,
  duration: 55,
  xpReward: 100,
  content: `# レッスン 9 — \`OpenHlNode\` と初の \`start_engine\` 呼び出し\n\n...`
},
```

## SHA pinning 規律

L9 が参照する openhl コミット (§答え合わせ):
- `d59d6cf` (Stage 6c — Node trait を実装、初の start_engine 呼び出しが動く)

これがエンジン起動マイルストーン。L8 で trait bound を満たし、L9 で値を提供して `start_engine` が動くことを証明する。

## 翻訳セルフレビュー (paste 前)

- **「handshake」「ハンドシェイク」** はそのまま (専門語)。
- **「multi-thread runtime」「actor system」「smoke test」** はそのまま。
- **「load-bearing」「placeholder」「クラム (crumb)」** はそのまま (英語のニュアンスを保持)。
- **「予測してみよう」「流暢さ警告」** は L4-L8 で確立した訳語と統一。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
- **長い表は EN と同じ列構成**。
