# OpenHL を作る — L8 draft (JA) — C2 build-along 書き直し

> openhl SHA `4229502` (Stage 6b — WalCodec/ConsensusCodec/SyncCodec を満たす OpenHlCodec) 基準。
> コース: `building-openhl-consensus-ja` (track: `reth-l1-architect`, 10 コース中 6 番目)。
> 注: これは Stage 6 (engine spawn) を完成させる 2 レッスンの 1 つ目。L9 で Node trait + `start_engine` smoke test を仕上げる。

---

## L8 — `openhl-codec-ja`

- **モジュール:** 4 (CL types), モジュール内 sortOrder 2
- **コース全体 sortOrder:** 7 (16 レッスン中 8 番目 — Codec/Node 分割で 15 → 16)
- **所要時間:** 35 分
- **XP:** 70
- **type:** CONTENT

### Content

````markdown
# レッスン 8 — `OpenHlCodec` — エンジンが要求する codec スロット

## ゴール

このレッスンの終わりに:

```bash
cargo test -p openhl-consensus
```

上記の実行結果が **16 個のテストすべてに合格する** (L7 から 14 個 + codec の新規 2 個)。新規ファイルは 1 つ:

- **`crates/consensus/src/codec.rs`** — `OpenHlCodec` 構造体と 8 個の `Codec<T>` impl。1 個は本物 (`ProposalPart` 用)、7 個は呼ばれたら明確なエラーを返す *stub* だ。

ここでもうひとつ unblock されるものがある: `informalsystems-malachitebft-app` が libp2p、ractor、その他エンジン表面のすべてを引き込んでくる。これ以降の初回コンパイルは ~38 秒かかる。投資の見返りは L9 で spawn する actor system だ。

新規テストは 2 個: `OpenHlCodec` が 3 つの super-trait (`WalCodec`、`ConsensusCodec`、`SyncCodec`) を満たすことを示すコンパイル時アサーション、および `ProposalPart` の runtime ラウンドトリップテスト。

## おさらい

L7 完了時点で `openhl-consensus` crate には以下がある:

```
crates/consensus/src/lib.rs   — pub mod bridge, context, signing, signing_provider, types
crates/consensus/src/signing.rs            — canonical encoding + 低レベル sign/verify
crates/consensus/src/signing_provider.rs   — OpenHlSigningProvider が SigningProvider<OpenHlContext> を impl
crates/consensus/src/types/                — 7 つの型ファイル + mod.rs
crates/consensus/src/context.rs            — OpenHlContext + Context impl
```

`cargo test -p openhl-consensus` でテスト 14 個が合格する。**エンジンはまだコンパイルできない** — `start_engine` は codec に対してジェネリックだが、まだ codec を提供していないからだ。

## 計画

5 つやる:

1. **`crates/consensus/Cargo.toml` に `informalsystems-malachitebft-app` を追加する。** これが重量級だ — libp2p、ractor、フルな app 表面を推移的に引き込んでくる。これ以降の初回コンパイルは ~38 秒。
2. **`crates/consensus/src/codec.rs` を作成する** — `OpenHlCodec` unit struct、`CodecStub` エラー、8 個の `Codec<T>` impl。
3. **`pub mod codec;`** を `lib.rs` に配線する。
4. **実行** — `cargo test -p openhl-consensus` で 16 個合格する。
5. **観察** — コンパイル時アサーションがコンパイルを通る。これがエンジンの codec trait bound を満たしたシグナルだ。

このレッスンが教えるのは、**個別の impl の詳細を超えて効いてくる 1 つのパターン** だ: **明確な失敗モードを持たせて trait メソッドを stub する**。大きな trait bound を満たす必要があるが、対象メソッドが hot path にない場合、stub にしてしまえる。stub のエラーメッセージには「何が呼ばれたか」を載せ、読み手が次に何を実装すべきか分かるようにする。これが **型レベルのインクリメンタル開発** だ — codec を全部一度に実装する必要はない。コンパイルが通るだけのものを提供しておき、実際に呼ばれたところで大きな声でエラーを返す。

> 🛑 **考えてみよう。** スクロールする前に: なぜ Malachite は、single-validator devnet では送るネットワークが無いのに、エンジンがネットワーク・メッセージのエンコード方法を知っていることを強制するのか? ヒント: trait bound は **型** に関するもので、**runtime 挙動** に関するものではないからだ。エンジンが自分の codec に対してジェネリックなのは、devnet では gossip しない validator も multi-validator デプロイでは gossip するからだ。Codec スロットが要求されるのは、エンジンがピアの有無を知らないからだ。impl が完全である必要がないのは、テストでは gossip のコードパスがそもそも実行されないからだ。

## 手順

### Step 1: app 依存を Cargo.toml に追加

`crates/consensus/Cargo.toml` を開く。`[dependencies]` セクションに 1 行追加:

```toml
informalsystems-malachitebft-app             = { workspace = true }
```

他の malachite 依存の隣に配置する。`app` crate はメタ crate で、エンジンの各所から型を re-export している — `Codec`、`ConsensusCodec`、`SyncCodec`、`WalCodec`、`SignedConsensusMsg`、`StreamMessage`、`ProposedValue`、`sync::{Status, Request, Response}` はすべてここに集まる。

簡易サニティチェック:

```bash
cargo check -p openhl-consensus 2>&1 | tail -5
```

初回ビルドは遅い (libp2p + ractor と依存が初めてコンパイルされる、~38 秒)。以降はキャッシュが効く。

### Step 2: `crates/consensus/src/codec.rs` を作成

ファイル冒頭:

```rust
//! Stub `Codec<T>` impls so `OpenHlCodec` satisfies `WalCodec`, `ConsensusCodec`,
//! and `SyncCodec` via Malachite's blanket impls.
//!
//! In single-validator mode none of these codecs fire — they're for network
//! gossip (Consensus), peer sync (Sync), and crash-recovery WAL writes. The
//! engine requires them to exist by trait bound, but the methods are not
//! invoked on the happy path.
//!
//! When L9 spins up actors and one of these stubs IS hit, the error
//! message names the type that needs a real impl — that's the cue to swap
//! the stub for a Protobuf/JSON implementation.

use bytes::Bytes;
use informalsystems_malachitebft_app::types::codec::Codec;
use informalsystems_malachitebft_app::types::streaming::StreamMessage;
use informalsystems_malachitebft_app::types::sync::{Request, Response, Status};
use informalsystems_malachitebft_app::types::{ProposedValue, SignedConsensusMsg};
use informalsystems_malachitebft_core_consensus::LivenessMsg;
use thiserror::Error;

use crate::context::OpenHlContext;
use crate::types::OpenHlProposalPart;

#[derive(Copy, Clone, Debug, Default)]
pub struct OpenHlCodec;

#[derive(Debug, Error)]
#[error("codec for {0} is a Stage 6b stub; implement before this path can fire")]
pub struct CodecStub(pub &'static str);
```

`OpenHlCodec` は unit struct で、状態は持たない。Malachite の codec は純粋関数で、レシーバが存在するのは trait dispatch のためだけだ。`CodecStub` は 8 個の Codec impl で共有するエラー型。`&'static str` フィールドは、codec が未実装の型の名前を保持する。未実装パスが **実際に** fire したとき、エラーメッセージが何を書くべきかを教えてくれる。

> 🛑 **やりがちな勘違い。** 「なぜ `CodecStub` は enum (stub ごとに variant) ではなく、`&'static str` を持つ struct なのか?」 **新しい stub を追加するたびに 2 箇所 (enum 定義と各呼び出し側) を編集する必要が出るからだ。** `&'static str` 引数なら拡張可能で、新しい `Codec<T>` impl の stub も型名リテラルを渡すだけで作れる。enum 変更は不要だ。トレードオフは、型安全性が下がる (任意の文字列を渡せる) ことだが、`T` 自体は trait 表面が縛っているので、文字列は人間向けラベル扱いで十分だ。

### Step 3: 唯一の本物 impl — `ProposalPart`

次:

```rust
// ---- ProposalPart ---------------------------------------------------------
// ProposalPart is a unit struct in OpenHL (ValuePayload::ProposalOnly), so its
// encoding is genuinely empty — this one is real, not a stub.

impl Codec<OpenHlProposalPart> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<OpenHlProposalPart, Self::Error> {
        Ok(OpenHlProposalPart)
    }

    fn encode(&self, _msg: &OpenHlProposalPart) -> Result<Bytes, Self::Error> {
        Ok(Bytes::new())
    }
}
```

これは **本物** だ。`OpenHlProposalPart` は unit struct (フィールド 0 個) なので:

- **Encode** は空の `Bytes` を返す — unit struct の wire 表現は空文字列だ。
- **Decode** は入力バイトを無視し、`OpenHlProposalPart` を返す — その型の唯一の取りうる値だからだ。誰かがゴミバイトを渡しても、unit 型へのデコードは失敗しようがない。

これは **stub ではない** — 完全で正しい実装で、たまたま自明なだけだ。Unit 型は退化的な wire format を持つ。この空バイト encoding は、`signing_provider.rs` の `proposal_part_round_trips` をはじめ「`ProposalPart` を encode/decode して」と尋ねる箇所で exercise される。

### Step 4: 7 個の stub impl

次は本物ではない 7 個の impl:

```rust
// ---- Consensus messages (gossip) -----------------------------------------

impl Codec<SignedConsensusMsg<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<SignedConsensusMsg<OpenHlContext>, Self::Error> {
        Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))
    }

    fn encode(&self, _msg: &SignedConsensusMsg<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("SignedConsensusMsg<OpenHlContext>"))
    }
}

impl Codec<LivenessMsg<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<LivenessMsg<OpenHlContext>, Self::Error> {
        Err(CodecStub("LivenessMsg<OpenHlContext>"))
    }

    fn encode(&self, _msg: &LivenessMsg<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("LivenessMsg<OpenHlContext>"))
    }
}

impl Codec<StreamMessage<OpenHlProposalPart>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<StreamMessage<OpenHlProposalPart>, Self::Error> {
        Err(CodecStub("StreamMessage<OpenHlProposalPart>"))
    }

    fn encode(&self, _msg: &StreamMessage<OpenHlProposalPart>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("StreamMessage<OpenHlProposalPart>"))
    }
}

// ---- WAL (crash recovery) -------------------------------------------------

impl Codec<ProposedValue<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<ProposedValue<OpenHlContext>, Self::Error> {
        Err(CodecStub("ProposedValue<OpenHlContext>"))
    }

    fn encode(&self, _msg: &ProposedValue<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("ProposedValue<OpenHlContext>"))
    }
}

// ---- Sync (peer catch-up) -------------------------------------------------

impl Codec<Status<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Status<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Status<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Status<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Status<OpenHlContext>"))
    }
}

impl Codec<Request<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Request<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Request<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Request<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Request<OpenHlContext>"))
    }
}

impl Codec<Response<OpenHlContext>> for OpenHlCodec {
    type Error = CodecStub;

    fn decode(&self, _bytes: Bytes) -> Result<Response<OpenHlContext>, Self::Error> {
        Err(CodecStub("sync::Response<OpenHlContext>"))
    }

    fn encode(&self, _msg: &Response<OpenHlContext>) -> Result<Bytes, Self::Error> {
        Err(CodecStub("sync::Response<OpenHlContext>"))
    }
}
```

7 個の Codec impl、すべて同じパターン: `decode` も `encode` も `Err(CodecStub(...))` を返す。型名はリテラルで渡すので、stub error が自分自身の名前を名乗る。

3 つのカテゴリ:

- **Consensus メッセージ (gossip)** — `SignedConsensusMsg`、`LivenessMsg`、`StreamMessage`。Validator 間で libp2p 越しに流れる。Single-validator devnet には peer がいないので、これらは呼ばれない。
- **WAL (crash recovery)** — `ProposedValue`。エンジンは proposal を crash recovery のためにディスクに書く。こちらはインプロセステストで動かすので fire しない。
- **Sync (peer catch-up)** — `Status`、`Request`、`Response`。Validator が遅れたとき、peer に過去 block を送ってもらうために尋ねる。Peer がいなければ遅れることもなく、sync することもない。

> 🛑 **やりがちな勘違い。** 「`#[derive(Serialize, Deserialize)]` を付けて bincode で済ませばよいのでは?」 **一部はそうできる。** だが、これらの型の多くはジェネリック、`Box<dyn Trait>` フィールド、あるいは serde が簡単には扱えない要素を含む。Malachite の `test` crate のリファレンス実装は、~400 行の手書き Protobuf encoding でこれらを全部捌いている。Stub アプローチは、その作業を今は省くためのものだ。実ネットワークや永続 WAL が必要になったときに、ここで protobuf や borsh 実装に 1 メソッドずつ差し替えていく。

### Step 5: テストモジュールを追加

`codec.rs` の末尾:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use informalsystems_malachitebft_app::types::codec::{
        ConsensusCodec, SyncCodec, WalCodec,
    };

    // Compile-time assertions: by implementing the constituent Codec<T>
    // traits, OpenHlCodec automatically satisfies all three super-traits.
    fn assert_wal_codec<C: WalCodec<OpenHlContext>>() {}
    fn assert_consensus_codec<C: ConsensusCodec<OpenHlContext>>() {}
    fn assert_sync_codec<C: SyncCodec<OpenHlContext>>() {}

    #[test]
    fn openhl_codec_satisfies_all_three_super_traits() {
        assert_wal_codec::<OpenHlCodec>();
        assert_consensus_codec::<OpenHlCodec>();
        assert_sync_codec::<OpenHlCodec>();
    }

    #[test]
    fn proposal_part_round_trips() {
        let codec = OpenHlCodec;
        let part = OpenHlProposalPart;
        let bytes = codec.encode(&part).unwrap();
        let decoded = codec.decode(bytes).unwrap();
        assert_eq!(part, decoded);
    }
}
```

テスト 2 つ:

- **`openhl_codec_satisfies_all_three_super_traits`** — テストの体裁をした **コンパイル時** アサーションだ。`WalCodec<Ctx>`、`ConsensusCodec<Ctx>`、`SyncCodec<Ctx>` は Malachite の super-trait で、適切な `Codec<T>` 構成 impl をすべて持っていれば自動的に満たされる。3 つの `assert_*` 関数は、bound を強制的にコンパイラにチェックさせるためだけに存在する。1 個でも `Codec<T>` impl が抜けていれば **コンパイルが通らず**、runtime ではなくコンパイル時に失敗する。Runtime のテスト本体は no-op。検証は型チェック時に発生する。
- **`proposal_part_round_trips`** — 1 つだけの **本物** の codec impl を exercise する。空の `ProposalPart` を encode し、結果バイトを decode して、等価性を assert する。これで本物 impl が動くことを証明する。7 個の stub を runtime でテストしないのは、誰かが呼んだらエラーを返して panic-via-error する設計だからだ。

> 🛑 **やりがちな勘違い。** 「なぜテストは空なのに pass するのか?」 **アサーションが型チェッカー側にあり、runtime にはないからだ。** `assert_wal_codec::<OpenHlCodec>()` と書くと、Rust はコンパイル時に `OpenHlCodec: WalCodec<OpenHlContext>` をチェックしなければならない。Bound が失敗すればファイルがコンパイルできず、`cargo test` はテスト失敗ではなく **コンパイルエラー** を報告する。これは Rust の一般的なパターンだ: 検証したい bound を持つ関数を呼ぶことで、runtime チェックをコンパイルチェックに変換する。

### Step 6: codec を `lib.rs` に配線

`crates/consensus/src/lib.rs` を開く。現在:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
```

1 行追加:

```rust
//! Consensus layer — Malachite BFT.

pub mod bridge;
pub mod codec;
pub mod context;
pub mod signing;
pub mod signing_provider;
pub mod types;

pub use context::OpenHlContext;
```

## テスト

初回コンパイルは遅い — libp2p、ractor、~200 の transitive 依存を初取得:

```bash
cargo test -p openhl-consensus
```

約 30-40 秒後:

```
running 16 tests
test bridge::tests::... ... ok            # (consensus に L3 由来の bridge テストがある場合 — workspace 構成による)
test codec::tests::openhl_codec_satisfies_all_three_super_traits ... ok
test codec::tests::proposal_part_round_trips ... ok
test context::tests::... (5 tests) ... ok
test signing::tests::... (2 tests) ... ok
test signing_provider::tests::... (7 tests) ... ok

test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

よくあるエラーと対処:

- **`error[E0277]: the trait bound 'OpenHlCodec: WalCodec<OpenHlContext>' is not satisfied`** — 8 個の `Codec<T>` impl のうちどれかが抜けている。Step 3 と Step 4 を再確認 — 8 つの構成型すべてに `impl Codec<T> for OpenHlCodec` が必要だ。
- **`error[E0282]: type annotations needed for 'CodecStub'`** — `&'static str` フィールドを忘れている。`pub &'static str` の単一フィールドに `CodecStub("...")` で渡す形だ。
- **`error[E0432]: unresolved import 'informalsystems_malachitebft_app::types::codec::ConsensusCodec'`** — Cargo.toml に `informalsystems-malachitebft-app` を追加し忘れている。Step 1 を再確認。
- **再ビルドでも 60 秒以上かかる** — `cargo build` (`--release` なし) を試す。それでも遅ければ原因は libp2p なので、そのままにしておく。

## 設計の振り返り

3 つの load-bearing な決定:

1. **明確な失敗名を持つ stub は、まだ必要のない完全な impl に勝る。** **本物** の `SignedConsensusMsg` codec は protobuf encoding 約 50 行になる。必要ないから書かない。代わりに 4 行の stub を書き、もし fire したら何が未実装かを名乗らせる。**型レベルのインクリメンタル開発。**

2. **blanket impl のおかげで、1 つの trait impl で複数の super-trait を満たせる。** `WalCodec<Ctx>` は自動的に `impl<C> WalCodec<Ctx> for C where C: Codec<ProposedValue<Ctx>>` で満たされる (Consensus/Sync も同様)。適切な **構成要素** `Codec<T>` impl を提供すれば、`impl WalCodec` は書かなくていい — Malachite が blanket impl を無料でくれる。コンパイル時アサーションテストが、これが本物であることを検証する。

3. **codec は `types/` ではなく `consensus/` に置く。** Codec はエンジン側の「何が wire 上を流れるか」という概念 (`SignedConsensusMsg`、`ProposedValue`、`sync::Status`) に依存する。これは consensus 層の関心事で、base 型の関心事ではない。Codec を `types/` に置くと、`types/` が `informalsystems-malachitebft-app` に依存することになり、エンジンを必要としない下流 crate にとって `openhl-types` が重い依存になってしまう。

## 答え合わせ

```bash
cd ~/code/openhl-reference
git checkout 4229502
diff -u ~/code/my-openhl/crates/consensus/src/codec.rs ./crates/consensus/src/codec.rs
diff -u ~/code/my-openhl/crates/consensus/Cargo.toml ./crates/consensus/Cargo.toml
diff -u ~/code/my-openhl/crates/consensus/src/lib.rs ./crates/consensus/src/lib.rs
```

`4229502` の参照には Cargo.lock 変更 (libp2p ツリー) と 166 行の `codec.rs` が含まれる。実装パターン (1 つの stub を繰り返す) は厳密に一致するべき。Doc コメントの文言は個人差可。

戻る:

```bash
git checkout main
```

## よくある質問

**Q: `_msg` や `_bytes` のアンダースコア接頭辞はなぜ必要なのか?**
Rust は未使用引数に `_` 接頭辞を要求する (unused-variable 警告を抑制するため)。`&self` は trait dispatch のために必要だが読まない。`_msg` / `_bytes` も同様に無視する。一部 stub では実際に **使う** こともあるが (ここでは使わない)、アンダースコアは「存在するのは認識しているが、使わない」を表す慣用句だ。

**Q: `WalCodec`、`ConsensusCodec`、`SyncCodec` の違いは?**
関連する codec impl をグループ化する sub-trait だ。`WalCodec` は `ProposedValue` の encoding を要求する。`ConsensusCodec` は `SignedConsensusMsg` + `LivenessMsg` + `StreamMessage<ProposalPart>` + `ProposalPart` を要求する。`SyncCodec` は `Status` + `Request` + `Response` を要求する。個別の `Codec<T>` trait を impl すれば、3 つの super-trait すべてが無料で手に入る。

**Q: stub が fire しないなら、そもそもなぜ存在するのか?**
Rust の trait システムは、runtime 構成に応じて impl を条件付きで含めたり除外したりできないからだ。エンジンの `start_engine` には `C: ConsensusCodec<Ctx> + WalCodec<Ctx> + SyncCodec<Ctx>` という trait bound があり、これは codec メソッドが実行されるかどうかに関係なくコンパイル時にチェックされる。**stub は型システムを満たすために存在するのであって、runtime を満たすためではない。**

**Q: stub を本物の impl に置き換えるのはいつか?**
エンジンが実際に呼んだときだ。L9 の smoke test は actor system を spawn していくつかのパスを exercise する。Stub が fire すれば、エラーメッセージがどれかを教えてくれる。最初に呼ばれる可能性が高いのは `Codec<ProposedValue<OpenHlContext>>` (WAL) だ — エンジンは peer gossip の前に、最初の proposal を crash recovery のためにディスクに書くからだ。そこを protobuf-backed encoder に差し替えることになる。

## 次のレッスン (L9)

Codec trait bound を満たした — `start_engine` の signature を満たせる状態になった。だが、codec の **値**、node config、validator set のいずれも、`start_engine` が要求する形ではまだ持っていない。L9 では `OpenHlNode` に `Node` trait を実装する: `OpenHlConfig` (NodeConfig impl)、`OpenHlGenesis`、`OpenHlPrivateKeyFile`、`OpenHlNodeHandle`、そして 5 つの関連型と 12 メソッドを持つ `Node` impl 本体、合計 ~300 行だ。L9 の capstone は `start_engine_smoke_spawns_and_kills` — `start_engine` を呼び、actor system が ~0.02 秒で spawn / tear down することを証明するテストだ。L9 完了でエンジンは boot する。L10-L15 では AppMsg loop と Live Reth 統合を配線していく。
````

---

## Seed ファイルスロット

L8 は Module 4 (CL types) の sortOrder 2 に入る (L6 が 0、L7 が 1 の後):

```typescript
{
  title: 'レッスン 8 — OpenHlCodec — エンジンが要求する codec スロット',
  slug: 'openhl-codec-ja',
  type: 'CONTENT',
  sortOrder: 2,
  duration: 35,
  xpReward: 70,
  content: `# レッスン 8 — \`OpenHlCodec\` — エンジンが要求する codec スロット\n\n...`
},
```

## SHA pinning 規律

L8 が参照する openhl コミット (§答え合わせ):
- `4229502` (Stage 6b — WalCodec/ConsensusCodec/SyncCodec を満たす OpenHlCodec)

元の計画は codec + Node + start_engine を 1 レッスンに統合するつもりだったが、draft してみると分割が望ましいことが判明 — L8 (codec、35 分) + L9 (Node + start_engine、55 分) で消化しやすい単位に。コース全体は 15 → 16 レッスン。

## 翻訳セルフレビュー (paste 前)

- **「load-bearing」「trait bound」「super-trait」「blanket impl」** は専門語として英語のまま保持。
- **「stub」「stub する」** はそのまま (動詞化して許容)。
- **「fire する」「fire しない」** はそのまま (呼ばれる/トリガーされるの意味で技術コミュニティで定着)。
- **「hot path」** は専門用語としてそのまま。
- **「考えてみよう」「やりがちな勘違い」** は L4-L7 で確立した訳語と統一。
- **「codec スロット」** — slot は「枠」とも訳せるが、エンジンが要求する型パラメータの場所という意味で「スロット」のままが分かりやすい。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
