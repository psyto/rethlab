# Building OpenHL — L4 + L5 draft (JA)

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。Module 2 (ライブラリとしての Malachite) を閉じる。L4 は残るレッスンの中で最も重い — 10 個の Context sub-type それぞれを詳しく walk する。L5 は Malachite の protocol state machine を実行可能エンジンに変える actor model を導入する。
> EN ミラー: `drafts/openhl_l4_l5_en.md`。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。

---

## L4 — `openhl-malachite-impl-ja`

- **Module:** 2 (ライブラリとしての Malachite)、module 内 sortOrder 1
- **Course-level sortOrder:** 3 (13 レッスン中の 4 番目)
- **Duration:** 20 分
- **XP reward:** 60
- **Type:** CONTENT
- コース内で最も重いレッスン (L9 の 20/60 と並ぶ)。

### Content

````markdown
# 実装するもの — proposal、validator、vote、signing

L3 は 10 個の type に名前を付けた。次にそれらを書く。**40 行の trait impl で chain にアイデンティティが生まれる。** 練習はほぼ機械的だ — 各 sub-trait の surface は小さい — がその 40 行に encode された選択は、後続レッスンすべてが参照するものだ。

> 🛑 **スクロール前に予測。** SHA `0844d58` で `crates/consensus/src/types/` を開け。ファイルを読まずに、10 個の Context sub-type それぞれに対して期待する *trait bound* を sketch せよ。ヒント: Malachite が必要とする operation を考えよ (sort のための address 比較、VoteKeeper lookup のための value hash、ログ用の height display)。

## 1. Trait-bound ツアー

各 Context associated type は自分の sub-trait を持つ。Bound が Malachite の期待する API surface だ:

| Sub-trait | 必要な bound | なぜ |
| :--- | :--- | :--- |
| `Address` | `Clone + Debug + Display + Eq + Ord + Send + Sync` | validator set でソート、ログで表示 |
| `Height` | `Copy + Clone + Default + Debug + Display + Eq + Ord + Send + Sync` + `ZERO`、`INITIAL`、`increment_by`、`decrement_by`、`as_u64` | 単調 counter math |
| `Value` | `Clone + Debug + Eq + Ord + Send + Sync` + `type Id: Clone + Debug + Display + Eq + Ord + Send + Sync` と `fn id() -> Self::Id` | コンパクトな identifier (vote payload) を持つ |
| `Validator<Ctx>` | `Clone + Debug + Eq + Send + Sync` + `address()`、`public_key()`、`voting_power()` | weight 付きの参加者を identify |
| `ValidatorSet<Ctx>` | `Clone + Debug + Eq + Send + Sync` + `count()`、`total_voting_power()`、`get_by_address()`、`get_by_index()` | 反復可能、ソート可能、lookup 可能なコレクション |
| `Proposal<Ctx>` | `Clone + Debug + Eq + Send + Sync + 'static` + 6 accessor | value + round metadata を carry |
| `Vote<Ctx>` | `Clone + Debug + Eq + Ord + Send + Sync + 'static` + 9 accessor | prevote または precommit |
| `ProposalPart<Ctx>` | `Clone + Debug + Eq + Send + Sync + 'static` + `is_first`、`is_last` | `PartsOnly` mode で stream 可能 |
| `Extension` | `Clone + Debug + Eq + Send + Sync + 'static` + `size_bytes()` | optional な precommit attachment |
| `SigningScheme` | `Clone + Debug + Eq` + `type Signature`、`type PublicKey`、`type PrivateKey`、encode/decode | wire-format 暗号 |

**全 type が `Send + Sync` も必要だ — Malachite が actor 境界をまたいで動くからだ。** その単一要件で thread-unsafe な選択 (例: 生の `Rc<_>` フィールド) は除外される。コンパイラが強制する。

## 2. 自明な 3 つ — `Address`、`Height`、`Value`

これらは最も単純だ。3 struct、それぞれ ~20 行。`crates/consensus/src/types/address.rs:7@0844d58` を開け:

```rust
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

3 つのこと:
1. **`#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]`** がほとんどの trait bound を無料で与える。`[u8; 20]` フィールドがこれらを自然に derive する。
2. **`fmt::Display` impl** は address を hex エンコードする。`Address` super-trait が要求する; ログとエラーメッセージで使う。
3. **`impl Address for OpenHlAddress {}`** — 空 impl。Trait は bound が要求するものを超える独自メソッドを持たない。

`Height` と `Value` は同じ形に従う。`Height` は `crates/consensus/src/types/height.rs@0844d58` で `INITIAL = 1`、`ZERO = 0`、飽和算術 `increment_by`/`decrement_by` を加える。`Value` は `crates/consensus/src/types/value.rs` で `BlockHash` をラップし、`Value::id() -> Self::Id = BlockHash` を impl する (value が自分自身の id である — block hash がすでに 32 byte だからだ。下の予測を参照)。

> 🛑 **予測。** 我々の `Value::Id` は `Value` 自体と同じ type だ (両方 `BlockHash`)。Cosmos chain では `Value` が full block を carry し、`Value::Id` がそのブロックの hash だ。**なぜ openhl はそうしないか — なぜ `Value` は単なる hash なのか?**

なぜなら、まだ consensus 上で transaction を ship していないからだ。Bridge がブロックを produce し、ブロックの hash が投票対象になり、EL がブロック内容の source of truth になる。Full block を consensus 経由で carry すると、libp2p gossipsub 上で transaction を serialize することになる — 無駄だ、すべての validator がすでに EL state を持っていて hash からブロックを reconstruct できるからだ。**Module 2 (CLOB) でこの計算は変わるかもしれない** — consensus value が EVM mempool に無い CLOB fills を含むようになったとき、`Value` が hash 以上を carry する必要が生じるかもしれない。

## 3. `Validator` と `ValidatorSet` — sort order が load-bearing

`crates/consensus/src/types/validator.rs:21@0844d58` を開け:

```rust
impl Validator<OpenHlContext> for OpenHlValidator {
    fn address(&self) -> &OpenHlAddress { &self.address }
    fn public_key(&self) -> &PublicKey { &self.public_key }
    fn voting_power(&self) -> VotingPower { self.voting_power }
}
```

3 accessor。Trait が期待するもの; struct が格納するもの。自明だ。

興味深いのは `OpenHlValidatorSet` の `new`、`crates/consensus/src/types/validator.rs:42@0844d58`:

```rust
pub fn new(mut validators: Vec<OpenHlValidator>) -> Self {
    validators.sort_by(|a, b| {
        b.voting_power
            .cmp(&a.voting_power)
            .then_with(|| a.address.cmp(&b.address))
    });
    Self(validators)
}
```

`(voting_power desc, address asc)` でソート。**このソート順は determinism にとって load-bearing だ。**

理由: `OpenHlContext::select_proposer` は `validator_set.get_by_index((height + round) % count)` で proposer を選ぶ (L11 領域)。同じ validator set に対して 2 validator がソート順が違うと、同じ round で異なる proposer を選び、chain が fork する。

CometBFT convention (openhl が継承) は `voting_power desc, address asc` だ。このソート + modulo 回転を使う chain は、address space が totally ordered である限り deterministic な proposer election を得る — それが `Address: Ord` が hard bound (§1) である理由だ。

> 🛑 **反流暢性。** 「ソート順は実装詳細だ。」 **consensus では違う。** consensus においては、ソート順 *が* protocol だ。異なるソートをする 2 実装は、type signature がどう見えようと、異なる consensus protocol を動かしている。CometBFT のソート convention は de-facto BFT family standard の一部だ。

## 4. `Proposal` と `Vote` — メッセージコンストラクタ

`Proposal` は `crates/consensus/src/types/proposal.rs@0844d58` で 5 フィールド struct に対する 6 accessor だ:

```rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpenHlProposal {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value: OpenHlValue,
    pub pol_round: Round,    // "Proof-of-lock round" — Tendermint nuance
    pub address: OpenHlAddress,
}
```

`pol_round` は提案された値がロックされた round だ — Tendermint が「自分は以前の round でこの値に prevote したが、その round がタイムアウトした; いま再度それを propose している」というケースを扱うのに使う。First-round の proposal では `pol_round = Round::Nil`。

`Vote` は `crates/consensus/src/types/vote.rs:10@0844d58`:

```rust
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OpenHlVote {
    pub height: OpenHlHeight,
    pub round: Round,
    pub value_id: NilOrVal<BlockHash>,    // NilOrVal: 値に対する vote、または nil
    pub vote_type: VoteType,              // Prevote | Precommit
    pub address: OpenHlAddress,
}
```

`value_id: NilOrVal<BlockHash>` が実際の仕事をしている。Vote は:
- `NilOrVal::Val(hash)` — 「この id を持つ値に vote する」
- `NilOrVal::Nil` — 「この round の任意の値に反対する」(タイムアウト、proposal が来なかった)

Nil 投票は Tendermint が proposal の欠落や invalid を扱う方法だ; round はそれでも終了しなければならない。

両 type とも単純な accessor 関数で各々の sub-trait を impl する — それぞれ 20 行。我々が書くのは *protocol* (Malachite が所有する) ではなく、*protocol がやり取りする type* だ。

## 5. `ProposalPart` — 使わない streaming type

`ProposalPart` は `crates/consensus/src/types/proposal_part.rs@0844d58` で codebase 中もっとも退屈なファイルだ:

```rust
pub struct OpenHlProposalPart;

impl ProposalPart<OpenHlContext> for OpenHlProposalPart {
    fn is_first(&self) -> bool { true }
    fn is_last(&self) -> bool { true }
}
```

Unit struct。`is_first = is_last = true` (単一 part が唯一の part)。

なぜこの type が存在するのか? Malachite は 3 つの `ValuePayload` mode をサポートする (L5 §6 領域):
- `ProposalOnly` — 全 value が `Proposal` メッセージにある。**openhl はこれを使う。**
- `PartsOnly` — value は chunk で stream される; `Proposal` がそれらを参照する。
- `ProposalAndParts` — 両方。

他の 2 mode は単一 gossip メッセージに収まらない大きな値を propose する chain (multi-MB ブロック) のために存在する。`ProposalPart` が streaming chunk だ。**openhl は 32-byte block hash を propose するので、streaming は不要だ。** しかし Context trait は associated type を要求するので、bound を満たすが実際には wire を流れない unit struct を提供する。

## 6. Signing — Ed25519 を 0 行で

我々の `SigningScheme` は `Ed25519` で、`informalsystems-malachitebft-signing-ed25519` で Malachite が ship する。**我々はそれに対して 0 行書く。** `crates/consensus/src/context.rs:29@0844d58` から:

```rust
type SigningScheme = Ed25519;
```

それだけだ。Malachite が signature encoding/decoding、`Signature` / `PublicKey` / `PrivateKey` type、全部を handle する。

BLS aggregation (より小さな commit certificate) が欲しければ、異なる `SigningScheme` impl にスワップする — Malachite の設計はスキームに対して parametric だ。我々はしない; Ed25519 はより単純で、Tempo/HL の両方が使う。

> 🛑 **予測。** Ed25519 から BLS への切り替えは `OpenHlContext` の 1 行変更だ。**openhl で他に何を変える必要があるか?** ヒント: validator-set storage と wire に乗るものについて考えよ。

答え: ほとんどは変わらない。Validator-set storage は `PublicKey` を格納する; `PublicKey` の concrete type は `SigningScheme` から来る。スキーム切り替えで type は変わるが、storage コード (単なる `Vec<_>`) は気にしない。Vote / commit certificate の wire 形式は変わる (BLS は aggregable signature を与える) ので、`OpenHlCodec` impl は更新が必要かもしれない。しかしコードの大半 — type、runner、engine_app — はスキーム選択に対して invariant だ。

## 7. `SigningProvider` — signing が実際に起こる場所

`SigningScheme` は signature が *どう見えるか* を定義する。`SigningProvider` は誰が *作る* かを定義する。2 つは別 trait だ; 分離は意図的だ。

`OpenHlSigningProvider` は `crates/consensus/src/signing_provider.rs:18@0844d58`:

```rust
pub struct OpenHlSigningProvider {
    private_key: PrivateKey,
}
```

1 フィールド。Validator の private key を持つ。

```rust
impl SigningProvider<OpenHlContext> for OpenHlSigningProvider {
    fn sign_vote(&self, vote: OpenHlVote) -> SignedMessage<OpenHlContext, OpenHlVote> {
        sign_vote_with(vote, &self.private_key)
    }
    fn verify_signed_vote(&self, vote: &OpenHlVote,
                          signature: &Signature, public_key: &PublicKey) -> bool {
        public_key.verify(&vote_signing_bytes(vote), signature).is_ok()
    }
    // ... sign/verify pair for proposal、proposal_part、vote_extension
}
```

全部で 8 メソッド — 4 つの signable メッセージ type (vote、proposal、proposal_part、vote_extension) に対する sign/verify pair。Signing 関数は `crates/consensus/src/signing.rs` の canonical-encoding ヘルパーに delegate する; verification は直接の `public_key.verify(...)`。

**なぜ `SigningProvider` を別 trait にしたのか — `OpenHlContext` のメソッドではなく?** なぜなら `Context` は純粋に *type-level* (type を選ぶが、state を持たない) だが、`SigningProvider` は private key — runtime state を持つからだ。Private key を `Context` に置くと、すべての Context インスタンスが key を持つことになり、それは間違いだ (key を持つのは validator のみ; observer は持たない)。

> 🛑 **反流暢性。** 「Context trait が validator を configure する場所だ。」 **違う。** Context は type を選ぶ; SigningProvider は key を持つ; validator set は identity を carry する。**3 つの別々の関心事、3 つの別々の trait。** これらを混ぜると、テストが難しく swap 不可能な単一 godclass になる。

## 8. 40 行の主張、検証

L4 の hook が「40 行の trait impl で chain にアイデンティティが生まれる」と主張した。足し算しよう:

| ファイル | 行数 | 何を impl したか |
| :--- | :--- | :--- |
| `address.rs` | 19 | `Address` + `Display` |
| `height.rs` | ~20 | `Height` + `Display` |
| `value.rs` | ~15 | `Value` |
| `validator.rs` | 73 | `Validator` + `ValidatorSet` + constructor |
| `proposal.rs` | ~35 | `Proposal` (6 accessor) |
| `vote.rs` | 54 | `Vote` (9 accessor) |
| `proposal_part.rs` | ~10 | `ProposalPart` (unit struct) |
| `context.rs` | ~90 | `Context` (10 type def + 4 method body) |

Type 約 230 LOC + Context impl 90 LOC = Module 2 deliverable 全体で ~320 LOC。「40 行」の主張は trait impl 限定だった (struct そのものではない); より広い codebase はその ~8 倍に landing する。

しかし load-bearing な決定の数は小さい: **どこにでも propagate する 2 つの設計選択。**

1. **CometBFT のソート convention** (`voting_power desc, address asc`) — すべての validator-set 構築に順序の合意を強制する
2. **20-byte Ethereum address フォーマット** — chain genesis で固定; 後続のすべてがそれを仮定する

どちらかを変えると consensus 実装全体が見直しを要する。残りの 318 行は確立した Rust convention に従う機械的な type 定義だ。

## 9. 練習

1. **Bound を覗き見せずに trace せよ。** 10 個の Context associated type それぞれについて、Malachite が要求する trait bound をリストせよ (sketch した後で §1 のテーブルを使え)。予測と比較せよ。
2. **Solana-address 実験。** `OpenHlAddress` が `[u8; 20]` ではなく `[u8; 32]` だと仮定せよ。`crates/consensus/src/` 配下 (SHA `0844d58`) のどのファイルが compile-error するか? (ヒント: discipline を保てば 1 つだけ — `address.rs` 自身。propagation は他のファイルには見えないはずだ。)
3. **Signing-scheme スワップ。** `type SigningScheme = Ed25519` を仮想的な `Bls12_381` impl に切り替える diff を sketch せよ。どの行が変わるか? どの行が残るか? (ヒント: 変わる行より残る行のほうが多い。)
4. **Validator-set ソート順 leak。** `crates/consensus/src/context.rs:32@0844d58` の `OpenHlContext::select_proposer` を読め。**2 validator が異なるソート順で validator set を持つと何が壊れるか?** Chain divergence シナリオを sketch せよ。

> **最終チェック。** 1 文で、なぜ `Context`、`SigningProvider`、`ValidatorSet` は別々の trait なのか (1 つの巨大 trait に collapse されていない)? 答えに「type-level vs runtime-state vs identity-set が 3 つの異なる関心事」が含まれていなければ、§7 を再読。
````

---

## L5 — `openhl-malachite-engine-ja`

- **Module:** 2 (ライブラリとしての Malachite)、module 内 sortOrder 2
- **Course-level sortOrder:** 4 (13 レッスン中の 5 番目)
- **Duration:** 15 分
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# `malachitebft-engine` の actor model

L3 は Malachite を「I/O を抜いた抽象 Tendermint アルゴリズム」と言った。本レッスンは I/O を *戻す* ものについてだ。**Consensus は時間を無視する state machine; engine がそれに時計を与える。**

Malachite の protocol ロジックは synchronous な `Driver` struct に住む — pure state machine、timer なし、network なし、thread なし。`malachitebft-engine` crate がそれを actor system (`ractor` 経由) でラップし、real consensus が必要とする runtime context — timeout、network socket、WAL write、mempool access — を提供する。

L4 の type は Malachite に *何が* この chain かを伝える。本レッスンは Malachite が *どう* それらの type を running node に変えるかについてだ。

> 🛑 **スクロール前に予測。** Consensus protocol は timeout (round-change、propose) のスケジューリング、network メッセージの受信、WAL への書き込み、application への decision 通知が必要だ。これらの tokio ベースアーキテクチャを sketch せよ。§2 で Malachite が実際にやっていることと比較する。

## 1. なぜ actor framework か

誘惑: `tokio::spawn` と channel を使えばいい。なぜ Malachite は ractor を使うのか?

3 つの理由:

| 必要なもの | tokio | ractor |
| :--- | :--- | :--- |
| 長時間並行 task を spawn | `tokio::spawn(future)` | `Actor::spawn(name, args)` |
| 特定の task にメッセージ送信 | `tx.send(msg)` (channel を自分で wire) | `actor_ref.cast(msg)` (組込) |
| 送信者に reply (request/response) | `oneshot::channel` でラップ | `actor_ref.call(msg)` (組込) |
| クラッシュした task の restart | DIY (catch_unwind、respawn) | supervision (組込) |
| Actor の pause/resume | DIY | `actor_ref.stop()` / `start()` |
| Pre-stop hook (クリーンシャットダウン) | DIY | trait method `pre_stop` |

これらすべてを tokio の上に build できる — しかし書き終えた抽象は正確に ractor になる。**複雑な multi-actor system (Consensus、Network、Wal、Sync、Host が連携) では boilerplate が積み上がる。** Malachite は ractor を選んだ; openhl はその選択を継承する。

> 🛑 **反流暢性。** 「ractor は `tokio::spawn` への単なる indirection だ。」 ほぼ違う。ractor は supervision、message ordering 保証、named actor lookup を提供する — さもなくば手書きすることになる。**5-actor system では load-bearing infrastructure であり syntactic sugar ではない。**

## 2. Actor topology

`OpenHlNode::start()` が `start_engine` を call するとき (openhl の Stage 6c → 6d)、engine は 5 つの actor を spawn する:

| Actor | どこに住むか | 何を所有 |
| :--- | :--- | :--- |
| **Consensus** | `malachitebft-engine::consensus` | `Driver` (state machine)、proposer-timeout タイマー、vote tallying |
| **Network** | `malachitebft-engine::network` | libp2p socket、gossipsub topic 購読、peer discovery |
| **Wal** | `malachitebft-engine::wal` | ディスク上 consensus メッセージの append-only log (`get_home_dir()/wal`) |
| **Host** (connector) | `malachitebft-app-channel::connector` | エンジンと **アプリ側の** app loop の bridge (`AppMsg` イベント送信) |
| **Sync** | `malachitebft-engine::sync` | Peer catch-up — 遅れているとき欠けたブロックを fetch |

加えて我々自身の runtime concern:

| Component | どこに住むか | 何を所有 |
| :--- | :--- | :--- |
| **`run_engine_app` loop** | `crates/consensus/src/engine_app.rs:29@0844d58` | `AppMsg` を受信、`ConsensusBridge` メソッドを call、reply |

これは actor ではない — 我々自身が spawn する async task だ。しかし Host actor の application 側 counterpart である: engine が `AppMsg` 経由で我々に質問し、loop が `oneshot::Reply` channel 経由で答える。

## 3. `AppMsg` channel — 何が入り、何が出るか

app-channel の `Channels<Ctx>` struct:

```rust
pub struct Channels<Ctx: Context> {
    pub consensus: mpsc::Receiver<AppMsg<Ctx>>,    // engine → us
    pub network: mpsc::Sender<NetworkMsg<Ctx>>,    // us → network actor
    pub events: TxEvent<Ctx>,                      // observer subscribe 用
}
```

3 channel:

1. **`consensus`** — engine が我々に何かを聞いてくる。`AppMsg::GetValue`、`AppMsg::Decided`、その他すべて (L11 / L13 で walk した)。
2. **`network`** — 我々が network actor に何かを伝える。主な使い道は 2 つ: `PublishProposalPart` (streaming proposal 用; openhl は使わない) と `BroadcastConsensusMsg` (vote 転送用)。
3. **`events`** — 外部 observer (metrics、ログ、downstream consumer) 向けの read-only イベントストリーム。

我々の `run_engine_app` は `consensus` からしか consume しない。`network` には publish しない — Malachite は Consensus actor 経由で内部的に vote broadcast を handle する。**Network channel は application 層の network injection が必要な chain 用** (例: consensus と並行して commitment を送る DA layer); openhl は不要だ。

## 4. Consensus actor の役割

`malachitebft-engine::consensus::Consensus` の Consensus actor が Malachite の protocol Driver が実際に動く場所だ。仕事:

1. Network actor から consensus メッセージ受信 (peer proposal、peer vote)
2. それらを `Driver::Input` として protocol state machine に feed
3. `Driver::Output` 処理 — timeout のスケジュール、Network 経由の vote broadcast、Host への `Decide` 通知
4. Round 遷移、timeout、view change の管理

openhl ではこのコードを見ない。**我々のコードは Driver を直接 invoke できない** — それが意図的だ。Driver は actor の後ろに shield されている; input を送る唯一の方法は Consensus actor にメッセージを送ること、output を読む唯一の方法は Host connector から `AppMsg` を受信することだ。**我々の `run_engine_app` loop はその会話の application 側だ。**

`crates/consensus/src/runner.rs:34@0844d58` の `run_single_validator` と比較せよ — Driver を actor ラッパーなしで直接使う。あれは Stage 5 (pedagogical) だった; Stage 6 が actor でラップした。**両方とも同じ chain 挙動を produce する**; actor 版が production-shape のものだ。

## 5. Network + WAL actor

Network actor は libp2p をラップする:

- Consensus メッセージ用の gossipsub topic 管理
- `ConsensusCodec` 経由で outgoing vote/proposal を encode (Stage 6b → 現在 stub impl; openhl `crates/consensus/src/codec.rs` のソースで stub set を参照)
- Incoming メッセージを decode して Consensus に forward
- Peer discovery を handle

Single-validator mode (peer なし) では、Network actor は依然として spawn する — libp2p が `/ip4/127.0.0.1/tcp/0` で listen し始める — が、inbound メッセージは無く、誰にも broadcast しない。**Single-validator mode では no-op になる**、これが `OpenHlCodec` の gossip stub (Stage 6b) が error を返してもうまくいく理由だ: 何もそれらを encode していない。

WAL actor は crash recovery のために consensus メッセージをディスクに書く:

- 署名したすべての `Vote` と `Proposal` は broadcast 前に persist される
- すべての `Decided` 値は bridge が commit する前に persist される
- Restart 時に WAL は engine が consensus を再開する前に replay される

Single-validator mode では WAL write は起こるが replay されない (テストは cleanup される tempfile home_dir を使う)。**Production では、WAL が validator restart にまたがって chain を durable にするものだ。**

> 🛑 **予測。** Round の途中で openhl を再起動するとどうなるか (vote 投じ後、round 決定前)?

WAL なし: 再起動時、engine は前の vote を覚えていない。Peer が「このノードは値 X に投票した」と覚えているのに、再起動後 Y に投票したら、equivocate したことになる — production BFT chain では slashable な offense だ。WAL あり: 再起動時、engine は前の vote を replay し、X に投票した事実を見つけて Y への投票を拒否する。**WAL が single-machine consensus において restart にまたがる self-equivocation を回避する仕組みだ。**

## 6. Malachite gotcha 1 つ — proposal-part streaming

Malachite は 3 つの `ValuePayload` mode をサポートする (L4 §5 で最後に登場):
- `ProposalOnly` — 値が 1 つの `Proposal` メッセージに収まる。openhl はこれを使う。
- `PartsOnly` — 値が chunk で stream される。
- `ProposalAndParts` — 両方。

`PartsOnly` または `ProposalAndParts` を使うと、network actor は per-proposer per-round の *stream* を維持する。Host actor は part が到着するたびに reassemble し、「full proposal 到着」を `AppMsg::ReceivedProposalPart` の `reply: Option<ProposedValue>` 経由でシグナルする。我々の `run_engine_app` loop は全 part が到着するまで `None` で reply; その後 `Some(full_value)`。

**openhl はこれを完全に skip する** (`ProposalOnly`)、そのため `AppMsg::ReceivedProposalPart` は我々には絶対に fire しない。しかし大きな proposal を持つ chain 用に openhl を fork するなら (例: 10MB の pending fill を value が carry する CLOB chain)、stream-reassembly path を実装する必要がある。

注意すべき gotcha: **part-streaming コードは `malachitebft-engine::util::streaming` に住む**、app loop ではない。`ConsensusConfig::value_payload` で configure する; engine が残りを handle する。**書くのは streaming コードではない; value-reassembly ロジックだ。**

## 7. 練習

1. **Actor をマップせよ。** 何も見ずに、engine が spawn する 5 actor をリストせよ。各々について、所有する関数 1 つと produce する channel/message 1 つを名指せ。
2. **Actor seam を見つけよ。** `crates/consensus/src/node.rs::OpenHlNode::start@0844d58` を読め。Engine actor system が start される行を identify せよ (ヒント: `malachitebft_app_channel::start_engine(...)` call)。openhl が engine に何を与え、何を受け取るか?
3. **Actor-vs-Driver 比較。** `crates/consensus/src/runner.rs:34@0844d58` の `run_single_validator` (Driver 直接、sync loop) と `crates/consensus/src/engine_app.rs:29@0844d58` の `run_engine_app` (AppMsg loop、async) を比較せよ。Driver が produce する `Output<Ctx>` variant それぞれに対して、相当する AppMsg variant を identify せよ。Mapping は 1:1 か?
4. **Single-validator no-op。** openhl が single-validator で動くとき、Network actor は start するが絶対にメッセージを受信しない。**なぜ consensus は peer vote を待って halt しないのか?** ヒント: proposer 自身の vote が何を寄与するかを考えよ。

> **最終チェック。** 1 文で、`Driver::process` を直接 call する (`run_single_validator` がするように) と得られないものを、actor system が与えてくれるのは何か? 答えに「timer、network、persistence、supervision」が含まれていなければ、§1 + §2 を再読。
````

---

## Seed-file slot

L4 と L5 が Module 2 を閉じる (L3 はすでに drafted 済み):

```typescript
// Course.modules.create array:
{
  title: 'ライブラリとしての Malachite',
  sortOrder: 1,
  lessons: { create: [
    // L3: Malachite が与えてくれるもの (openhl_l2_l3_ja.md ですでに drafted)
    {
      title: '実装するもの — proposal、validator、vote、signing',
      slug: 'openhl-malachite-impl-ja',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 20,    // ← L9 の 20 分と並ぶ (arc 内で最重)
      xpReward: 60,    // ← L9 の 60 XP と並ぶ
      content: `# 実装するもの — proposal、validator、vote、signing\n\n...`  // L4 markdown
    },
    {
      title: 'malachitebft-engine の actor model',
      slug: 'openhl-malachite-engine-ja',
      type: 'CONTENT',
      sortOrder: 2,
      duration: 15,
      xpReward: 40,
      content: `# \`malachitebft-engine\` の actor model\n\n...`  // L5 markdown
    },
  ]}
}
```

## SHA pinning discipline

すべての cite は SHA `0844d58` を pin する。L4 は cite-dense (per-type walk):

- `crates/consensus/src/types/address.rs:7` — `OpenHlAddress` struct と impl
- `crates/consensus/src/types/validator.rs:21,42` — `Validator` impl、`ValidatorSet::new` のソート
- `crates/consensus/src/types/vote.rs:10` — `OpenHlVote` struct
- `crates/consensus/src/signing_provider.rs:18` — `OpenHlSigningProvider` struct
- `crates/consensus/src/context.rs:29,32` — `type SigningScheme = Ed25519`、`select_proposer`

L5 は構造的に cite が軽い (actor topology はより conceptual):

- `crates/consensus/src/engine_app.rs:29` — `run_engine_app`
- `crates/consensus/src/runner.rs:34` — `run_single_validator`

## Style review notes (self-critique before paste)

- **L4 は 20 分/60 XP** — L9 と同じ weight class。L9 と並んでコース内の 2 つの「実際に build するために必要なすべてを深いコード walk と共に教える」レッスンだ。
- **L4 §3 の「ソート順は load-bearing」反流暢性** はコース全体で最も leverage が高い段落の 1 つだ。**カットしない。**
- **L5 §6 (proposal-part streaming gotcha)** はレッスンが長くなるなら cut 可能 — openhl が使わない機能についてだ。しかし openhl を異なる chain 用に fork する人には pedagogically valuable だ。
- **翻訳 policy は L1/L2/L3/L7/L10 JA と同一**:
  - Trait 名、Rust の型理論用語、Malachite API は英語のまま。
  - 🛑 callout: Predict → 予測、Anti-fluency → 反流暢性。
  - File paths、function names、types は英語のまま。
- **「actor」のカタカナ化を避けた理由**: ractor、ABCI 等の technical 文脈で「actor」は OS/concurrency 系の固有概念名であり、英語のままのほうが Erlang/Akka/ractor の参照先と直結する。
- **「godclass」「seam」「gotcha」「parametric」** などは英語のまま — Rust/OO エンジニアにとってその表記が直感的。
- **未公開**: `course.isPublished: false` のまま。L11/L12/L13 JA 翻訳が揃ってから一斉公開予定。
