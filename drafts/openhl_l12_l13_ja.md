# Building OpenHL — L12 + L13 draft (JA)

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。コースを narrative に閉じる — Module 5 (single-validator devnet) の最後の 2 レッスン。
> EN ミラー: `drafts/openhl_l12_l13_en.md`。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。
> **Honest scoping note:** 元の outline は `bin/openhl/src/main.rs` と `crates/node/src/genesis.rs` を cite していた。前者は placeholder (`fn main() { println!("openhl v{}", ...) }`)、後者はまだ存在しない。**Integration test `first_block_via_engine_actors` が v0 における devnet そのものだ** — 両レッスンともこのテストを runnable artifact として扱い、将来の作業として「`bin/openhl run` への productionizing」を明示する。

---

## L12 — `openhl-devnet-bootstrap-ja`

- **Module:** 5 (Single-validator devnet)、module 内 sortOrder 0
- **Course-level sortOrder:** 11 (13 レッスン中の 12 番目)
- **Duration:** 10 分
- **XP reward:** 30
- **Type:** CONTENT

### Content

````markdown
# Bootstrap — genesis、key、single-node config

module 1-4 のすべての概念はインストール済みだ。Contract (L1) を読み、Engine API (L7) を trace し、bridge (L9) を設計し、decided block (L10) を commit し、proposer として 1 つ produce (L11) できる。**さあ bootstrap する。** 最小の runnable openhl はどう見えるか — 1 validator、1 node、peer なし? そしてなぜその「toy」が実際にこれまで build してきたものすべての real test なのか?

> 🛑 **スクロール前に予測。** 1 validator devnet を動かしたい。構築する必要のある artifact をリストせよ (まだコードを書かず — 列挙のみ)。ヒント: 正確に 4 つあり、SHA `0844d58` ですでに 3 つが存在する。

## 1. 4 つの artifact

Single-validator openhl devnet を bootstrap するには:

| Artifact | 何を carry するか | openhl のどこ |
| :--- | :--- | :--- |
| **Ed25519 keypair** | 署名用 validator identity | `PrivateKey::generate(OsRng)` で生成 |
| **Validator set** | 「誰が propose / vote できるか」 — 我々だけ、`voting_power = 1` で | `crates/consensus/src/types/validator.rs:42@0844d58` の `OpenHlValidatorSet::new(vec![...])` |
| **ChainSpec** | Genesis state、hardfork timestamp、chain ID | `reth_chainspec::ChainSpec`、`Genesis` JSON から構築 |
| **Home directory** | WAL の書き込み先、key を persist できる場所 | テストでは `tempfile::tempdir()`; production では real path |

加えて `OpenHlConfig` (NodeConfig + ConsensusConfig + ValueSyncConfig) — がほとんどデフォルト。上記 4 つが chain-defining 入力だ。

## 2. `OpenHlNode` コンストラクタ

すべてが 1 つの struct に bundle される。`crates/consensus/src/node.rs:144@0844d58`:

```rust
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
```

4 フィールド、驚きなし。`moniker` は単なる人間可読 identifier だ — ログと metrics に出る。他の 3 つは §1 の chain-defining 入力 (ChainSpec は `load_config()` 経由で plumbed され、ここには格納されない — §5 参照)。

テストヘルパー `single_validator_node` (`crates/consensus/src/node.rs:249@0844d58`) が end-to-end 構築を walk する:

```rust
fn single_validator_node(home_dir: PathBuf) -> OpenHlNode {
    let sk = PrivateKey::generate(OsRng);
    let pk = sk.public_key();
    let digest = Sha256::digest(pk.as_bytes());
    let mut addr_bytes = [0u8; 20];
    addr_bytes.copy_from_slice(&digest[12..32]);
    let address = OpenHlAddress(addr_bytes);
    let validator_set =
        OpenHlValidatorSet::new(vec![OpenHlValidator::new(address, pk, 1)]);
    OpenHlNode::new(sk, validator_set, home_dir, "openhl-test")
}
```

8 行。Keypair を generate、Ethereum 形式 address を derive (`SHA-256(pubkey)` の最後の 20 byte — L4 §1 参照)、`voting_power = 1` の 1 要素 validator set にラップ、node を instantiate。

これが **最小 chain だ。** Module 1-4 のすべて — Context impl、bridge、engine actor、Reth 統合 — がこの単一 struct に対して動く。

## 3. Single-validator のエスケープハッチ

Bona-fide な BFT chain は `f` byzantine fault を許容するには `n ≥ 3f + 1` validator が必要だ。最小の非自明 set は `n = 4, f = 1`。なぜ single-validator (`n = 1, f = 0`) で動くのか?

動くのは **quorum 閾値が vacuously に easy になる** からだ: 2/3 の 1 validator はまあ 1 validator だ。我々が唯一の voter だから常に quorum を持つ。Byzantine fault が attack する対象がない — 反対する他の validator がいない。

`OpenHlContext::select_proposer` の round-robin (L4 §3 領域) は single-validator では定数関数になる: 我々が常に proposer だ。すべての prevote、precommit、commit certificate は正確に 1 つの署名を持つ — 我々のものだ。

> 🛑 **反流暢性。** 「Single-validator は偽 consensus、何も証明しない。」 **違う。** Single-validator は *real* consensus を degenerate validator set に対して走らせている。すべての piece が exercise される:
> - `OpenHlContext` trait surface (proposer election、proposal 構築、vote signing)
> - `ConsensusBridge` contract (全 4 メソッド)
> - エンジン actor system (libp2p start、ractor actor spawn、WAL write)
> - Reth 統合 (`LiveRethEvmBridge` path が `EthBeaconConsensus` に対して validate)
>
> Exercise しないもの: multi-peer ネットワーク gossip、sync protocol、byzantine handling。それは `run_multi_validator` 領域 (codebase の Stage 5)。しかし「byzantine handling なし」は **「consensus なし」ではない** — 「全 consensus 機構、trivial topology 上」だ。

## 4. ChainSpec

方程式の Reth 側。`Genesis` JSON から構築 — v0 では `crates/evm/src/reth_node.rs:35@0844d58` の minimal post-merge dev spec を使う:

```rust
fn dev_chain_spec() -> Arc<ChainSpec> {
    let custom_genesis = r#"{
        "nonce": "0x42",
        "timestamp": "0x0",
        "extraData": "0x5343",
        "gasLimit": "0x5208",
        "difficulty": "0x400000000",
        "alloc": {},
        "number": "0x0",
        "parentHash": "0x00...",
        "config": {
            "ethash": {},
            "chainId": 2600,
            "homesteadBlock": 0,
            // ... London、Paris、Shanghai すべて 0 で
            "terminalTotalDifficulty": 0,
            "shanghaiTime": 0
        }
    }"#;
    let genesis: Genesis = serde_json::from_str(custom_genesis).expect("...");
    Arc::new(genesis.into())
}
```

Chain ID 2600 は Reth 自身の `custom-dev-node` 例を mirror するので、chain はその reference に対して observable-compatible だ。すべての hardfork は block 0 から有効 (post-merge dev mode); PoW phase なし、chain lifetime 中の fork 遷移なし。

ChainSpec は 2 つの consumer に feed する:
- **Reth 側**: `NodeBuilder::new(NodeConfig::test().dev().with_chain(chain_spec.clone()))` (§5)
- **OpenHL bridge**: `LiveRethEvmBridge::new(provider, chain_spec)` (Stage 7c) — この chain の hardfork に対して走る `EthBeaconConsensus` validator を構築

同じ `Arc<ChainSpec>` が両者に流れる。**両者は同意しなければならない** — bridge の validator と Reth の executor が有効ブロックについて disagree すると、chain は最初の hardfork-sensitive 操作で fork する。

## 5. `load_config` 内のエスケープハッチ

`crates/consensus/src/node.rs:34@0844d58` の `OpenHlConfig::new(moniker)` が consensus config を build する:

```rust
pub fn new(moniker: impl Into<String>) -> Self {
    let consensus = ConsensusConfig {
        value_payload: ValuePayload::ProposalOnly,  // ← 我々の ProposalPart が要求
        ..ConsensusConfig::default()
    };
    Self { moniker: moniker.into(), consensus, value_sync: ValueSyncConfig::default() }
}
```

加えて `load_config()` の listen-address override:

```rust
cfg.consensus.p2p.listen_addr = "/ip4/127.0.0.1/tcp/0"  // OS が port を選ぶ
    .parse()
    .map_err(|e| eyre!("invalid listen_addr: {e}"))?;
```

Port 0 は「OS が ephemeral port を選ぶ」を意味する — テストには重要 (衝突なし)、production では無害 (real config file で override する)。

## 6. 練習

1. **4 つの artifact を再導出せよ。** 何も見ずに、bootstrap で `OpenHlNode::new` が必要とするもの (または `start_engine` に流れるもの) 4 つをリストせよ。各々を `node.rs` の introduce 行と match させよ。
2. **Voting-power-1 質問。** `single_validator_node` では validator が `voting_power = 1` で作られる。`voting_power = 100` を使ったら何か変わるか? (ヒント: single-validator mode では 100 power の 100% は 1 power の 100% と同じ — しかしロギング、metrics、仮想 second validator が overcome すべきものについて考えよ。)
3. **bin/openhl gap。** `bin/openhl/src/main.rs@0844d58` を開け。実際に何をしているか? Real `openhl run` コマンドになるには何が必要か? 関数 body を sketch せよ。(ヒント: 大体 `start_engine_smoke_spawns_and_kills` の body から smoke-test assertion を除いたもの。)

> **最終チェック。** 1 文で、なぜ trivial quorum でも single-validator mode が「全 consensus 機構」をテストするのか? 答えに「trait surface、actor system、Reth 統合」または「multi-peer gossip と byzantine handling を除くすべて」が含まれていなければ、§3 を再読。
````

---

## L13 — `openhl-devnet-first-block-ja`

- **Module:** 5 (Single-validator devnet)、module 内 sortOrder 1
- **Course-level sortOrder:** 12 (13 レッスン中の 13 番目)
- **Duration:** 10 分
- **XP reward:** 30
- **Type:** CONTENT
- **コースの最終レッスン。**

### Content

````markdown
# 最初のブロック — openhl を走らせ、tick するのを見る

テスト出力に `decided_hash = BlockHash([0x42; 32])` が見えたら、**本コースのすべての概念が正しく compose されたのだ**。これから wire でそれがどう見えるかを読む。

これがコースの最終レッスンだ。前の 12 が piece を build した — contract (L1)、Context (L3-L5)、Reth 統合 (L6-L8)、bridge 配線 (L9-L11)、bootstrap (L12)。L13 はそれらを一緒に走らせ trace を読む。

> 🛑 **スクロール前に予測。** `first_block_via_engine_actors` を走らせて assertion failure を得たとイメージせよ: `decided[0]` が build したものと違う。コードを見ずに、何が悪かった可能性のあること 5 つを *最も可能性が高い順に* リストせよ。Sketch を実際のフローに対して trace する。

## 1. v0 における runnable artifact

今日の「openhl devnet」は `crates/consensus/src/engine_app.rs:246@0844d58` の integration test だ:

```rust
#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn first_block_via_engine_actors() {
    let tmp = tempfile::tempdir().unwrap();
    let node = make_test_node(tmp.path().to_path_buf());
    let validator_set = node.validator_set.clone();

    let handle = node.start().await.expect("start_engine failed");
    let channels = handle.take_channels().await.expect("...");

    let bridge = Arc::new(StubBridge::default());
    let bridge_for_check = bridge.clone();

    let app_task = tokio::spawn(run_engine_app(bridge, channels, validator_set, 1));

    let decisions = tokio::time::timeout(Duration::from_secs(15), app_task)
        .await.expect("timed out").expect("panicked").expect("returned err");

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
```

走らせるには:

```bash
cargo test -p openhl-consensus first_block_via_engine_actors
```

実行時間: 実際の consensus round は ~0.02 秒 (libp2p + ractor 起動が ~2.5s で wall clock を支配)。

## 2. AppMsg トレース、順番に

テストが走るとき、engine は次の順で `run_engine_app` ループに AppMsg イベントを emit する:

| # | AppMsg | 我々のハンドラがすること |
| :--- | :--- | :--- |
| 1 | `ConsensusReady` | `(INITIAL height, validator_set)` で reply |
| 2 | `StartedRound { height=1, round=0, proposer=us, role=Proposer }` | `Vec::new()` で reply (cached proposal なし) |
| 3 | `GetValue { height=1, round=0, timeout }` | `bridge.build_payload` + `payload_ready` を call、`LocallyProposedValue` で reply |
| 4 | (Malachite が内部 handle: proposal を sign、"broadcast" — peer なしだが動作する) | — |
| 5 | (Malachite が内部 handle: prevote、polka、precommit) | — |
| 6 | `Decided { certificate }` | `bridge.commit(hash)` を call、`decided` vec に push、`Next::Start(height=2)` で reply |

6 つの AppMsg イベント。我々のコードから 3 つの reply。**1 つの decided block。** これがコース全体を 1 トレースに収めたものだ。

> 🛑 **予測。** Step 4 と 5 は完全に Malachite 内部だ — 我々の `GetValue` への reply (step 3) と `Decided` の到着 (step 6) の間で起こる。Single-validator chain では、step 4-5 で実際にどんな consensus protocol activity が起こるか?

答え: **同じ protocol が走る**、ただすべての vote が我々からだ。Malachite の Consensus actor は (1) 我々の値を `Proposal` でラップして sign (Stage 6a の `OpenHlSigningProvider`); (2) `OpenHlContext::new_prevote` を call、sign、"broadcast"; (3) VoteKeeper が prevote を受信して tally — 1/1 vote で我々の値、2/3 閾値を超える; polka 到達; (4) `new_precommit`、sign、"broadcast"; (5) 1/1 precommit が閾値超え; (6) Decided event 発火。Protocol 全体が trivial validator set に対して execute する。

## 3. Assertion が証明するもの

テストは 3 つを assert する:

```rust
assert_eq!(decisions.len(), 1, "expected exactly one decided block");
let decided_hash = decisions[0];

let committed = bridge_for_check.committed.lock().unwrap().clone();
assert_eq!(committed, vec![decided_hash], "bridge must commit decided hash");
assert_eq!(
    *bridge_for_check.last_built.lock().unwrap(),
    Some(decided_hash),
    "decided hash must match what we built",
);
```

平易な日本語で:
1. **正確に 1 つの decision が出た** — ゼロではなく (chain halt せず)、2 でもなく (`stop_after_decisions = 1` の early-return が正しく動いた)。
2. **Consensus が合意した hash を bridge が commit した** — L10 の commit path が実際に発火したことを証明。
3. **Decided hash は `build_payload` が produce したものと一致する** — L11 の propose path が produce した値が、Malachite の signing + broadcast + voting を経由して Decided として戻ってくるまで原型を保ったまま round-trip したことを証明。

これが本コースの **end-to-end check** だ。3 つすべてが pass すれば、L1 から L12 までのすべてのレッスンが順番に execute したことになる。

## 4. Trace 出力を読む

`RUST_LOG=info` で走らせる:

```bash
RUST_LOG=informalsystems_malachitebft=info,openhl=info \
  cargo test -p openhl-consensus first_block_via_engine_actors -- --nocapture
```

(おおよそ) 次が見える:

```
INFO  consensus: starting consensus engine
INFO  network: libp2p listening on /ip4/127.0.0.1/tcp/<port>
INFO  wal: opened wal at /tmp/.tmpXXX/wal
INFO  consensus: ConsensusReady — height=1, validators=1
INFO  consensus: starting height=1
INFO  consensus: proposer for height=1 round=0 is <our address>
INFO  consensus: building payload (parent=<genesis> attrs=...)
INFO  consensus: payload ready (id=PayloadId(1))
INFO  consensus: proposing height=1 round=0 value=<hash>
INFO  consensus: prevote (h=1 r=0 v=<hash>) from <our address>
INFO  consensus: polka reached at height=1 round=0
INFO  consensus: precommit (h=1 r=0 v=<hash>) from <our address>
INFO  consensus: decided at height=1 round=0 value=<hash>
INFO  consensus: committed via bridge: <hash>
INFO  consensus: starting height=2
```

各行は本コースの 1 文にマップする。**このトレースを 1 度読め。** これまでに学んだ各層について「chain が実際に何をするか」の答えだ。

## 5. 次に壊すもの

走らせる価値のある pedagogical 実験 3 つ:

1. **Propose-timeout を 1ms までクランクダウンせよ。** `OpenHlConfig::new` を編集して `consensus.timeouts.timeout_propose = Duration::from_millis(1)` に set。テストを再実行。何が起こるか? (ヒント: テストモードの bridge call は十分速いのでまだ動く。しかし production-mode で real payload builder では round を失う。)

2. **Second validator を追加せよ。** `single_validator_node` を変更して 2 keypair を生成し両方を validator set に入れる、ただし 1 node だけを走らせる。テストは何をするか? (ヒント: 2 番目の validator は node を持たない、vote が決して到着しない。単一稼動 node は 1/2 voting power = 50% を持ち、2/3 閾値を下回る。Chain は stall する。**これが正しい挙動** — BFT は validator が存在することではなく、voting power の少なくとも 2/3 から実際の vote を要求する。)

3. **Bridge を壊せ。** `StubBridge::commit` が `BridgeError::Internal(eyre!("oops"))` を返すよう作れ。再実行。何が起こるか? (ヒント: `run_engine_app` がエラーを propagate、spawned task が `Err` を返す、テストは propagation chain で panic する。**L9 §4 の halt-the-chain 挙動 in action。**)

> 🛑 **反流暢性。** 「テストが pass すれば production で chain が動く。」 **完全には正しくない。** テストは 4 メッセージ contract の *correctness*、actor 配線、trait impl を exercise する。Exercise *しない*: ネットワーク遅延下の liveness、byzantine validator、partial state からの sync、負荷下の gossip 伝播、real Reth payload assembly with mempool。それらは別 scale の integration test だ。**First-block テストは passing necessary condition だが、production readiness の sufficient condition ではない。**

## 6. 次に何が来るか — Module 2 の preview

本コース (openhl の Module 1) は consensus substrate を build する。Module 2-5 はその上に build する:

- **Module 2 — CLOB matching engine** — real transaction を追加: マッチされた fill を produce する deterministic orderbook。`LiveRethEvmBridge::validate_payload` が実際に block body を execute する初の時 (今日のテストは空ブロックを validate)。
- **Module 3 — Core↔EVM precompile** — EVM に CLOB state を読ませるカスタム REVM precompile。Orderbook (off-EVM) と EVM を bridge する。
- **Module 4 — Funding、oracle、liquidation** — settlement loop。Chain が perp DEX に見える場所。
- **Module 5 — Vault primitive** — first-class on-chain object、Kodiak 系の strategy が app contract ではなく protocol-native になる。

本コースの trait surface は Module 2-5 で変わらない。**4 メッセージは 4 メッセージのままだ。** 変わるのは EL crate が `build_payload` (real transaction) と `validate_payload` (state に対する real execution) の内部ですることだ。

## 7. 練習

1. **自分の run を trace せよ。** `RUST_LOG=info` と `--nocapture` でテストを走らせ。各ログ行を本コースのセクションにマップせよ。マップしない行: issue を立てよ。(数行あるかもしれない — production logging は curriculum coverage を outpace することがある。)
2. **Failure mode を予測せよ。** 走らせずに、Decided arm の `reply.send(Next::Start(...))` 行を削除したら `cargo test first_block_via_engine_actors` が何をするか予測せよ。それから走らせて confirm せよ。
3. **2-validator stall。** §5 の実験 2 を実装せよ。Chain は stall する — stall するときトレースがどう見えるか観察せよ。Silence 前の最後のログ行は何か?

> **最終チェック。** 1 文で、*「テストが pass した」* と *「production で chain が動く」* の違いは何か? 答えに「adversarial condition 下の liveness」または「テストは passing-necessary であり sufficient ではない」が含まれていなければ、§5 の反流暢性 callout を再読。

---

**おめでとう** — これで *Building OpenHL — Consensus Substrate* を完了した。L1 Architect tier の次のコースは Module 2 (CLOB matching engine) から始まる、real transaction が初めて system に入る場所だ。
````

---

## Seed-file slot

L12 と L13 は `prisma/seed-reth-openhl-consensus-ja.ts` (course `building-openhl-consensus-ja`) に Module 5 として landing する:

```typescript
// Course.modules.create array:
{
  title: 'Single-validator devnet',
  sortOrder: 4,  // ← コースの最終モジュール
  lessons: { create: [
    {
      title: 'Bootstrap — genesis、key、single-node config',
      slug: 'openhl-devnet-bootstrap-ja',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 10,
      xpReward: 30,
      content: `# Bootstrap — genesis、key、single-node config\n\n...`  // L12 markdown
    },
    {
      title: '最初のブロック — openhl を走らせ、tick するのを見る',
      slug: 'openhl-devnet-first-block-ja',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 10,
      xpReward: 30,
      content: `# 最初のブロック — openhl を走らせ、tick するのを見る\n\n...`  // L13 markdown
    },
  ]}
}
```

## SHA pinning discipline

すべての cite は SHA `0844d58` を pin する。L12+L13 は特に cite-dense — 「すべてを結ぶ」レッスンだからだ — ほぼすべての prior lesson のコードを参照する:

- L12 cite: `node.rs:34, 144, 249`、`validator.rs:42`、`reth_node.rs:35`
- L13 cite: `engine_app.rs:246` (テスト)、加えて loop の各 AppMsg arm への暗黙参照

`bin/openhl` placeholder が real entry point になったら (Module 1 実装作業の後)、L12 §6 Practice exercise 3 と L13 §1 は両方更新が必要。§5 の "next to break" 実験は regardless で valid のまま。

## Style review notes (self-critique before paste)

- **L13 §4 のトレース出力は approximate だ。** `RUST_LOG=info` が何を示すかを sketch した; 実際の出力は Malachite のロギング構造に依存し違うかもしれない。レッスンを finalize する前に `--nocapture` でテストを走らせ、*real* トレースを capture して bullet を実ログ行に match させる価値がある。
- **L13 の締めの「おめでとう」行** はこれをコースの最終レッスンとして扱う。
- **L12 §3 の反流暢性 callout** (「single-validator は偽 consensus」) は L12 で最も leverage が高い段落だ。コース全体を earned に感じさせる reframing — すべてのレッスンが real な機構を trivial topology 上で exercise する。**Review でこの段落をカットしない。**
- **L13 §5 の実験** は pedagogically rich だ。各々が異なる側面を教える (timeout、voting power 閾値、halt-the-chain)。
- **翻訳 policy は他の JA レッスンと同一**:
  - `OpenHlNode`、`OpenHlConfig`、`ValuePayload::ProposalOnly` 等の API type は英語のまま。
  - `tempfile::tempdir()`、`PathBuf`、Rust import path は英語のまま。
  - 「single-validator」「devnet」「genesis」「moniker」「runnable artifact」等は英語のまま。
  - 🛑 callout: Predict → 予測、Anti-fluency → 反流暢性。
  - Log 出力サンプル (§4) は英語のまま — 実際のログが英語だからだ; commentary だけが日本語化される。
- **未公開** から **公開準備完了** に移行: これらが drafted することで、コース全 13 レッスンが JA で揃う。Seed-file generator がこの後 build され、JA コースが complete unit として publish 可能になる。
