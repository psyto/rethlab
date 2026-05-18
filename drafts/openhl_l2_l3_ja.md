# Building OpenHL — L2 + L3 draft (JA)

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。レッスン 2 は Module 1 を閉じる (レッスン 1 = contract と pair); レッスン 3 は Module 2 を開く (レッスン 4 と レッスン 5 と pair)。両者は「なぜこのアーキテクチャか」と「ではそれを与えてくれるライブラリを見ていこう」の境目に位置する。
> EN ミラー: `drafts/openhl_l2_l3_en.md`。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。

---

## L2 — `openhl-consensus-convergence-ja`

- **Module:** 1 (execution/consensus split)、module 内 sortOrder 1
- **Course-level sortOrder:** 1 (13 レッスン中の 2 番目)
- **Duration:** 15 分
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# Hyperliquid、Tempo、CometBFT 系チェーンがすべて converge する場所

Production の BFT L1 をどれか 1 つ取って、consensus 側のアーキテクチャを読め。**3 つの異なる会社の 3 つのチームが、3 つの異なる go-to-market のために最適化していて、全員が同じ設計に converge する。** Hyperliquid (closed source、HotStuff 派生)。Tempo (CometBFT 派生)。Cosmos エコシステムのすべてのチェーン (CometBFT)。openhl が使う Malachite は同じアイデアの clean-room 実装だ。

これは偶然ではない。Forcing function が存在する。本レッスンの終わりまでにそれが何か分かるようになる — そしてなぜ major な BFT L1 が optimistic execution を採用しないかも。

> 🛑 **スクロール前に予測。** 1 つ選べ: BFT chain において execution はブロックが finalize される *前* (optimistic)、finalization の *最中* (mid-flight)、finalization の *後* (decide-first-then-execute) のどれで起こるか? 選んだ後、他の 2 パターンが犠牲にする 3 つの性質を挙げよ。

## 1. Convergence — 観察

| Chain | Consensus family | execution はいつ起こる? |
| :--- | :--- | :--- |
| Bitcoin (PoW) | Nakamoto / longest-chain | **During** (miner は candidate を build しながら tx を実行する; chain は PoW が landing したとき進む) |
| Ethereum 1.0 (PoW) | Nakamoto | **During** (Bitcoin と同様) |
| Ethereum 2.0 (PoS) | Casper FFG + LMD-GHOST | **Optimistic、その後 finalized** (fork-choice の下で execute し、~13 分後に finalize) |
| Cosmos chains (CometBFT) | Tendermint BFT | **Decide の後** (consensus が commit に到達してから ABCI app が execute) |
| **Hyperliquid (HyperBFT)** | HotStuff 系 BFT | **Decide の後** (同じパターン、違う名前) |
| **Tempo (CometBFT 派生)** | Tendermint-shape | **Decide の後** |
| **openhl (Malachite)** | Tendermint BFT (clean-room) | **Decide の後** |

最後の列の BFT L1 はすべて同じ row に landing する: **決定が先、execution が後。** 3 つの独立したチームがこの設計に converge した — お互いに話して決めたのではなく、BFT の safety 性質がそれを強制するからだ。

## 2. なぜ decide-first-execute-after — safety 議論

BFT の promise は **safety** だ: 2 人の honest validator が同じ height について異なる値で decide することはない。これには corollary がある: **一度 decide されたら reorg は無い。** やり直しは無い。

これが成り立つには、execution が *decided block に対して* deterministic でなければならない。Decided block を適用したすべての validator が同じ post-state に到達する必要がある。そうでなければ、ブロックの中身には同意したが効果には同意していない 2 validator が事実上 fork する — 同じブロック、異なる state — chain の safety 性質が誰にも気づかれないまま破られることになる。

Optimistic execution はこれを subtle な形で undermine する。パターン:

1. Validator が candidate block を受け取る (まだ decide されていない)
2. Validator が投機的に block を execute して state を compute する
3. Validator は compute した state に基づいて投票
4. 他の validator も同じことをする
5. 投票を集約; 2/3+ なら decide

問題は step 2 だ: 各 validator は自分の state で block を execute している。Pre-state が分岐していたら (以前の nondeterminism バグ、network partition 等で)、異なる post-state を compute して異なる投票をする。**Fork は投票中に起こる、後ではない。** そして BFT の safety promise はそれを catch できない — 投票は同じ block_hash で quorum に到達するかもしれないが、結果の state は食い違ったままになる。

Decide-first パターンはこれを sidestep する:

1. Validator が candidate block (ただの bytes; execution なし) に同意する
2. Bytes に投票する
3. 一度 2/3+ commit すれば、決定は final
4. *それから* 各 validator は bytes を state に適用する
5. State が分岐したら、それは consensus バグではなく determinism バグ — chain は黙って fork するのではなく、state-root mismatch という目に見える形で halt する

> 🛑 **反流暢性。** 「Optimistic execution は BFT のパフォーマンス最適化に過ぎない。」 **違う。** Rollback machinery (投票が逆方向に行ったときの speculative execution を undo する) を要する *異なるパラダイム* であり、safety story を変える。**Major な BFT L1 で v1 から optimistic execution を採用しているものは無い。** 上位バージョン用に提案しているものはある (HotShot、Solana 系); ship したものは無い。

## 3. Nakamoto counterexample — なぜ Bitcoin は違う必要があったか

Bitcoin が decide-first を使えないのは **decision event が存在しない** からだ。Nakamoto consensus では「決定」とは chain weight (累積 PoW) であり、確率的なものだ。Validator 全員が「このブロックは final」と同意する瞬間は無い — あるのは「このブロックは N 個のさらなる confirmation の下に埋まっており、reorg の確率は exponentially に小さい」だけだ。

その世界では optimistic execution が唯一の選択肢になる。Miner は candidate block を *必ず* execute する (valid なものを見つける方法だからだ)、そして chain の safety story は algorithmic finality ではなく economic finality に依存する。

Bitcoin はこれの代償を払う:
- 平均 ~10 分の block time (BFT のサブ秒に対して)
- 高額取引には ~6 ブロック confirmation depth (BFT の instant に対して ~1 時間)
- Slashing なし (miner を不正行為で罰せない — miner は pseudonymous だからだ)

引き換えに得るもの:
- Permissionless 参加 (ハッシュパワーがあれば誰でも mine できる)
- Bounded validator set なし (3f+1 制約なし)
- Partition 下での liveness (両側が mining を続け、再結合時に reconcile する)

これが レッスン 2 テーブルの最初の 2 row が払う trade だ。**BFT より良いとか悪いとかではない — 違う問題のためのものだ。** Sub-second finality を最適化する chain (HL、Tempo、openhl) には BFT が勝つ; permissionless miner を最適化する chain (Bitcoin) には Nakamoto が勝つ。

## 4. ETH 2.0 のハイブリッド — microcosm における forcing function

Ethereum の post-merge アーキテクチャは興味深い中間ケースだ: head で LMD-GHOST (Nakamoto 形式の fork-choice) を、finality で Casper FFG (BFT 形式) を動かす。EL は optimistic に execute する; CL の Casper は ~13 分後にブロックを finalize する。

これが機能するのは EL/CL split (レッスン 1 §6 が convergence point として名指したもの) が各層に fit する consensus family を使わせるからだ:

- CL は BFT 形式の finality を得る (chain が fork から復帰できるように)
- EL は Nakamoto 形式の柔軟性を保つ (optimistic state を produce し続けられるように)

しかしハイブリッドはタダではない。EL は **head での reorg** をサポートしなければならない (Casper が異なる fork を finalize したら数ブロック revert する)。これが Reth の深い `BlockExecutor` の複雑さの源だ — append-only ではなく reorg-safe である必要がある。

**openhl はこの複雑さを skip する。** Pure BFT は reorg がまったく無いことを意味する — Casper 形式の「これは finalized、あれは違った」は不要だ、なぜなら *すべてが* finalized だからだ。HL と Tempo を decide-first chain にさせた同じ性質が、我々にもより単純な EL contract を買ってくれた。

## 5. openhl が継承するもの

Decide-first パターンは openhl の設計を 3 つの方法で形作る:

1. **`commit` は fire-and-forget** (レッスン 1 §4)。撤回するものが無いから「本当にいいのか?」round-trip も無い。EL が知る頃には決定はすでに permanent だ。

2. **`validate_payload` が存在する** (レッスン 1 §3、レッスン 7 §3)。Validator は peer から proposal を受け取り、投票 *前に* EL に executability を check させる。これが decide-first chain における optimistic-execution-equivalent だ: post-state を speculate しないが、proposal が commit に値する程度に well-formed かを check は *する*。

3. **Reorg machinery なし** (本レッスン)。EL は committed block を undo する必要が一度もない。State 成長は monotonic; canonical chain は append-only だ。Reth の reorg サポートは未使用のまま残る。

それぞれが同じ forcing function — BFT safety 性質 — からの意図的な継承だ。

> 🛑 **予測。** スタートアップが「optimistic execution を持つ BFT chain」を提案 — decide-first に対して 2x スループットを主張する。**§1 のテーブルが露出しなかったアーキテクチャ commitment は何か?**

答え: rollback 可能な EL を作ることに commit している — 投機的に execute されたブロックに対して consensus が反対投票したときに state を revert できる execution layer のことだ。Decide-first chain の EL より桁違いに複雑になる。**2x スループットの主張は本当だが、その請求書はエンジニアリング側 (具体的には EL) に回ってくる。** これを試みるほとんどのチームは ship する前に EL を 2 回書き直すことになる。

## 6. 練習

1. **コードで convergence を見つけよ。** CometBFT 系チェーンのリポを開け (例: `cometbft/cometbft` 自体、または Osmosis 等の downstream)。Consensus が「decide する」場所と application が「execute する」場所を locate せよ。openhl の `crates/consensus/src/engine_app.rs:119@0844d58` (レッスン 10 で walk する `AppMsg::Decided` arm) と比較せよ。
2. **Trade を名指せ。** Bitcoin は optimistic execution を使う。**なぜこれが Bitcoin にとって safe か?** ヒント: Bitcoin における「decision」が何を意味するか — それはいつ不可逆になるかを考えよ。
3. **ハイブリッドケース。** Ethereum 2.0 の LMD-GHOST + Casper ハイブリッドは EL に reorg サポートを要求する。これが現れる場所を Reth で 1 箇所見つけよ (`reth-provider` で `block_indices`、`reorg`、`revert_state` を検索)。

> **最終チェック。** 1 文で、なぜ decide-first-execute-after パターンが 4 メッセージ contract (レッスン 1 §4) に `validate_payload` と `commit` を *別* メソッドとして持たせることを *強制* するか? 答えに「validation は speculative; commit は final; これらは異なる protocol moment で起こる」が含まれていなければ、§2 を再読。
````

---

## L3 — `openhl-malachite-context-ja`

- **Module:** 2 (ライブラリとしての Malachite)、module 内 sortOrder 0
- **Course-level sortOrder:** 2 (13 レッスン中の 3 番目)
- **Duration:** 15 分
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# Malachite が与えてくれるもの — `Context` trait

> **現在地。** サブモジュール 2/5: *ライブラリとしての Malachite。* サブモジュール 1 で 4 メッセージの contract に名前を付けた。consensus 側と execution 側がその contract 越しに話すという構造が頭に入った状態だ。本サブモジュールは consensus 側を扱う。レッスン 3 (本レッスン) で Malachite の `Context` trait — ライブラリが要求してくる型レベルの API surface — を導入する。レッスン 4 は実装すべき 10 個の sub-type を walk する。レッスン 5 は、そのアルゴリズムを実稼働可能な engine に変える actor system を説明する。

Malachite は 10 個の associated type と 4 個のメソッドを持つ 1 つの trait だ。**10 個の type に名前を付けたら、自分の chain に名前を付けたことになる。** これは比喩ではない — consensus エンジンはそれらの type に対して parametric であり、各メソッドのシグネチャはそれらから derive される。正しい type を選べば Malachite はそれらの上で consensus を駆動する。

> 🛑 **スクロール前に予測。** BFT consensus プロトコルは address、height、value、vote、validator、signature について知る必要がある。それぞれについて associated type を持つ Rust trait を sketch せよ。§1 で Malachite の `Context` と比較し、`crates/consensus/src/context.rs:19@0844d58` の openhl の concrete impl を見る。

## 1. `Context` trait、名指し

`informalsystems_malachitebft_core_types::Context` から:

```rust
pub trait Context
where
    Self: Sized + Clone + Send + Sync + 'static,
{
    type Address: Address;
    type Height: Height;
    type ProposalPart: ProposalPart<Self>;
    type Proposal: Proposal<Self>;
    type Validator: Validator<Self>;
    type ValidatorSet: ValidatorSet<Self>;
    type Value: Value;
    type Vote: Vote<Self>;
    type Extension: Extension;
    type SigningScheme: SigningScheme;

    fn select_proposer(&self, validator_set: &Self::ValidatorSet,
                       height: Self::Height, round: Round)
        -> &Self::Validator;
    fn new_proposal(&self, height: Self::Height, round: Round,
                    value: Self::Value, pol_round: Round,
                    address: Self::Address) -> Self::Proposal;
    fn new_prevote(&self, height: Self::Height, round: Round,
                   value_id: NilOrVal<ValueId<Self>>,
                   address: Self::Address) -> Self::Vote;
    fn new_precommit(&self, height: Self::Height, round: Round,
                     value_id: NilOrVal<ValueId<Self>>,
                     address: Self::Address) -> Self::Vote;
}
```

10 type、4 method。Doc comment 込みで全体は約 90 行。**この trait を読むことは、Malachite から見た自分の chain の姿を読むことそのものだ。**

各 type への制約に注目: それぞれが自分の sub-trait (`Address`、`Height`、`Proposal<Self>` 等) を持ち、Malachite が期待する operation を定義している。§2 でこれらを inventory する。

## 2. 10 type、それぞれ

| Associated type | 何か | openhl の選択 |
| :--- | :--- | :--- |
| `Address` | Validator identity (小さく、比較可能) | `OpenHlAddress([u8; 20])` — Ethereum 20-byte convention |
| `Height` | Block height; 単調 counter | `OpenHlHeight(u64)` |
| `Value` | Consensus が decide する対象 | `OpenHlValue(BlockHash)` — 32-byte hash をラップ |
| `Validator` | 単一 validator (addr + key + power) | `OpenHlValidator { address, public_key, voting_power }` |
| `ValidatorSet` | Validator のコレクション | `OpenHlValidatorSet(Vec<OpenHlValidator>)` ソート済み (power desc、addr asc) |
| `Proposal` | 提案された値 + round metadata | `OpenHlProposal { height, round, value, pol_round, address }` |
| `Vote` | Prevote または precommit | `OpenHlVote { height, round, value_id, vote_type, address }` |
| `ProposalPart` | ストリームされる proposal piece (大きな value 用) | `OpenHlProposalPart` (unit struct; ProposalOnly mode) |
| `Extension` | Precommit に付随するアプリケーションデータ | `()` (v0 では extension なし) |
| `SigningScheme` | 署名の形 (sign / verify / encode の取り決め) | `malachitebft-signing-ed25519` の `Ed25519` |

各 row は `crates/consensus/src/types/` のファイルに対応する — それが構造だ: **1 概念につき 1 type、7 ファイル** (Address と Validator は `validator.rs` で共有; `Extension` は `()` なのでファイル不要; `SigningScheme` は Malachite が ship)。

```
crates/consensus/src/types/
├── address.rs        ← OpenHlAddress
├── height.rs         ← OpenHlHeight
├── value.rs          ← OpenHlValue (openhl_types::BlockHash をラップ)
├── validator.rs      ← OpenHlValidator + OpenHlValidatorSet
├── proposal.rs       ← OpenHlProposal
├── vote.rs           ← OpenHlVote
└── proposal_part.rs  ← OpenHlProposalPart
```

(Address と key は `validator.rs` に同居; `Extension` は `()` なのでファイル不要; `SigningScheme` は Malachite が ship するので impl 不要。)

レッスン 4 が各ファイルを詳しく walk する。今のところ: **これら 10 type が存在することを知っていることが、Malachite が何かを知ることの半分だ。** もう半分は 4 メソッド (§3)。

> 🛑 **反流暢性。** 「Malachite は Tendermint だ。」 **ほぼ違う。** Malachite は *抽象* Tendermint アルゴリズム — state machine、proposal-vote-precommit の dance、3f+1 quorum math — で、I/O を抜いたものだ。実際の CometBFT 実装は I/O (libp2p、ABCI、mempool、ネットワーク) を所有する; Malachite はアルゴリズムだけを所有する。**この分離が openhl に CometBFT の runtime 全部を継承せず Malachite を使わせる。**

## 3. 4 メソッド

メソッドは protocol のメッセージを構築する。重い処理が type 側にあるので、シグネチャは minimal に見える。

```rust
fn select_proposer(&self, validator_set: &Self::ValidatorSet,
                   height: Self::Height, round: Round)
    -> &Self::Validator;
```

Validator set + (height, round) を与えると、誰の番かを返す。openhl は sort 済み validator に対する round-robin を使う; `crates/consensus/src/context.rs:32@0844d58`。**関数は deterministic でなければならない** — すべての honest validator が同じ (height, round) に対して同じ proposer を compute する。ここでの nondeterminism は chain を fork させる。

```rust
fn new_proposal(&self, height: Self::Height, round: Round,
                value: Self::Value, pol_round: Round,
                address: Self::Address) -> Self::Proposal;
fn new_prevote(...) -> Self::Vote;
fn new_precommit(...) -> Self::Vote;
```

3 つのメッセージコンストラクタ — consensus message type それぞれに 1 つずつ。**なぜ直接の struct 構築ではなく factory 関数か?** *Protocol* (Malachite の `Driver`) がこれらのメッセージを作る必要があるが、*chain* がそれらの見た目を定義するからだ。Factory パターンは protocol ロジックとメッセージ形を decouple する。

`Proposal` type が (height, round, value, pol_round, address) を超える追加フィールドを持つなら、`new_proposal` impl に含められる。Malachite はそれらを見ない — chain 固有だ。

## 4. 実装側に残されたもの

Malachite が protocol を与える。**与えない:**

| 関心事 | 誰が所有するか |
| :--- | :--- |
| Address の選択 | 実装側 (chain の identity スキーム) |
| Validator set の構築 | 実装側 (genesis + slashing ロジック) |
| Propose する値の選択 | 実装側 (bridge 経由の `build_payload`) |
| 値の validation | 実装側 (bridge 経由の `validate_payload`) |
| メッセージの signing | 実装側 (`SigningProvider` impl — レッスン 4 §7) |
| Network gossip | エンジン actor system (libp2p) |
| 永続化 (WAL) | エンジン actor system |
| Decided block の storage | 実装側 (EL state) |
| Mempool | 実装側 (EL transaction pool) |

Split は意図的だ。**Malachite が小さい** のは consensus アルゴリズムだけを所有するからだ。Chain 固有のすべて — address、signing、payload assembly、storage — はすべて実装側に残される。

> 🛑 **予測。** チームが openhl を fork して新しい chain を作る。違う address フォーマット (Ethereum 形式の 20-byte ではなく Solana 形式の 32-byte address) が欲しい。**何ファイル触るか?**

答え: **1 ファイル — `crates/consensus/src/types/address.rs`。** `OpenHlAddress` を `[u8; 20]` から `[u8; 32]` に変更し、`Address: Clone + Debug + Display + Eq + Ord + Send + Sync` を依然として満たすことを保証すれば、それで終わりだ。Malachite は byte 幅を気にしない; trait bound が満たされていることだけを気にする。Chain の残り — proposer election、vote tallying、network gossip — はそのまま動く。

それが parametricity の payoff だ。正しく仕上げるコストは 10 type すべてを最初に実装すること; 報酬は単一 type を swap しても他に何も変わらないことだ。

## 5. Malachite の `Driver` を読む

`malachitebft-core-driver` の `Driver` (openhl の `run_single_validator` が `crates/consensus/src/runner.rs:34@0844d58` で使う) は protocol state machine だ。Expose するのは:

```rust
fn process(&mut self, input: Input<Ctx>) -> Result<Vec<Output<Ctx>>, Error<Ctx>>
```

`Input<Ctx>` と `Output<Ctx>` enum は `Context` で parameterize される。Variant が自分の type を carry する:

- `Input::Proposal(SignedProposal<Ctx>, Validity)` — proposal が到着した。`SignedProposal` は `Ctx::Proposal` に対して generic。
- `Output::Vote(Ctx::Vote)` — この vote を broadcast せよ。`OpenHlVote` が戻ってくる。
- `Output::Decide(Round, Ctx::Proposal)` — consensus がこの proposal で decide した。

**`Driver` 自体は自分の type が存在しないかのように読める。** 流通するのは `Ctx::Address`、`Ctx::Vote`、`Ctx::Proposal` — `OpenHlAddress`、`OpenHlVote`、`OpenHlProposal` に触れることは一度もない。Protocol 全体が type-parametric だ。

なぜこれが重要か? **Tendermint protocol 全体が 1 つのコードであり、それを使うすべての chain にまたがって一度 debug される。** Cosmos chain、openhl、Tempo、その他が Malachite (または概念的等価物) を使うとき、全員がアルゴリズム自体への bug fix の恩恵を受ける。BFT を re-implement する必要のある chain は無い。

> 🛑 **反流暢性。** 「各 BFT chain が自分の consensus を実装する。」 **違う。** 各 chain は自分の *type* と *I/O* を実装する。アルゴリズムは family にまたがって共有される — 時には文字通り (同じライブラリを使う chain)、時には概念的に (HotStuff variant は同じ state machine に converge する)。**レッスン 1 architect の仕事は type と I/O であり、アルゴリズムではない。**

## 6. 練習

1. **Type を inventory せよ。** コードを見ずに、`Context` の 10 個の associated type と各々が chain で何を表すかをリストせよ。それから `crates/consensus/src/context.rs:19@0844d58` を開いてリストを check せよ。
2. **Solana-address 実験。** `OpenHlAddress` が `[u8; 20]` ではなく `[u8; 32]` だったら何が変わるかを sketch せよ。変わるファイル (ヒント: 1 つだけ) と変わらないファイル (ヒント: ほとんど) を identify せよ。
3. **Driver を見つけよ。** `crates/consensus/src/runner.rs:34-83@0844d58` (`run_single_validator` の始まり) を読め。自分の `OpenHlContext` type が現れる場所と Malachite 内部 type が現れる場所を identify せよ。Seam はどこか?

> **最終チェック。** 1 文で、なぜ Malachite の `Context` は単なる generic parameter (`Driver<Address, Height, Value, ...>`) ではなく *associated type* を使うのか? 答えに「associated type は chain あたり 1 セットの type を lock-in する — generic だと caller が mix-and-match できてしまい、determinism invariant を破る」が含まれていなければ、§3 を再読。
````

---

## Seed-file slot

レッスン 2 は Module 1 の 2 番目のレッスンとして (レッスン 1 の直後に) landing する; レッスン 3 は Module 2 を開く:

```typescript
// Course.modules.create array:

{
  title: 'Execution/consensus split',
  sortOrder: 0,
  lessons: { create: [
    // L1 (already drafted)
    {
      title: 'Hyperliquid、Tempo、CometBFT 系チェーンが converge する場所',
      slug: 'openhl-consensus-convergence-ja',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# Hyperliquid、Tempo、CometBFT 系チェーンがすべて converge する場所\n\n...`  // L2 markdown
    },
  ]}
},
{
  title: 'ライブラリとしての Malachite',
  sortOrder: 1,
  lessons: { create: [
    {
      title: 'Malachite が与えてくれるもの — Context trait',
      slug: 'openhl-malachite-context-ja',
      type: 'CONTENT',
      sortOrder: 0,
      duration: 15,
      xpReward: 40,
      content: `# Malachite が与えてくれるもの — \`Context\` trait\n\n...`  // L3 markdown
    },
    // L4 (TBD)
    // L5 (TBD)
  ]}
}
```

## SHA pinning discipline

すべての cite は SHA `0844d58` を pin する。レッスン 2 はコード cite が軽い (conceptual/comparative なレッスン) が、要所では pin している:
- `crates/consensus/src/engine_app.rs:119` — レッスン 10 が walk する Decided arm (レッスン 2 Practice exercise 1 から参照)

レッスン 3 は cite-dense (trait 導入レッスン):
- `crates/consensus/src/context.rs:19` — `OpenHlContext` impl
- `crates/consensus/src/context.rs:32` — `select_proposer` の round-robin
- `crates/consensus/src/types/*.rs` — type ごとのモジュール (個別の line number ではなくパターンとして参照)
- `crates/consensus/src/runner.rs:34` — `run_single_validator` Driver setup

レッスン 4 (per-type walk) が landing するときは `crates/consensus/src/types/*.rs` の各ファイル内の specific な line number を cite すべき。レッスン 3 はディレクトリ構造のみで十分。

## Style review notes (self-critique before paste)

- **レッスン 2 は珍しく comparative lesson として frame されている。** コースの大部分は「これが我々のコード」だ。レッスン 2 は「なぜすべての chain が我々のコードのように見えるか」。異なる論調 — Module 1 の残りの「自分のコード、歩く」よりも consensus-engineering コースのトーンに近い。Reviewer がこれを jarring と感じたら、§5 (「openhl が継承するもの」) に openhl 固有の cite を増やすことで soften する; 現在は主に forward-reference になっている。
- **レッスン 2 §1 のテーブル** が load-bearing artifact。Reviewer が拡張/縮小を望むなら、column 数が parameter — 現在の 3 列形式 (chain、family、いつ実行) が minimum。Bloat なしで 4 列目 (犠牲) を追加可能。
- **レッスン 3 §2 の「10 type、1 type 1 ファイル」フレーミング** は レッスン 4 への critical setup。レッスン 4 は読者がファイル構造を知っていると仮定する; レッスン 3 がそれを導入する。レッスン 4 が再構成するなら (例: validator と validator_set を 1 type にマージ)、レッスン 3 も parallel に更新が必要。
- **レッスン 3 §5 の「Driver は自分の type が存在しないかのように読める」** は本レッスンで最も深い洞察。Review で削るな — parametricity-as-design-discipline が landing する瞬間だ。
- **翻訳 policy は レッスン 1/7/レッスン 10 JA と同一**:
  - 「associated type」「parametric」「factory」「state machine」「runtime」等は英語のまま (Rust trait/型理論の technical 用語)。
  - 「fire-and-forget」「optimistic」「decide-first」「reorg」「forcing function」等のパターン名・概念名は英語のまま。
  - 🛑 callout: Predict → 予測、Anti-fluency → 反流暢性。
- **レッスン 3 §3 のメソッド名「factory 関数」** は英語混在だが、JA でも「ファクトリ関数」より「factory 関数」のほうが Rust エンジニアには直感的。
- **未公開**: `course.isPublished: false` のまま。レッスン 11/12/レッスン 13 JA 翻訳が揃ってから一斉公開予定。
