# Building OpenHL — L10 draft (JA)

> openhl SHA `0cac571` (Stage 7d — `commit` が Reth の in-process Engine API に対して forkchoice を駆動する) に対してドラフト。
> EN ミラー: `drafts/openhl_l7_l10_en.md` の L10 セクション。
> rethlab の chapter format に準拠 (3am hook → 🛑 予測/反流暢性 callout → 番号付きセクション → 練習 + 最終チェック)。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。

---

## L10 — `openhl-decided-to-fcu-ja`

- **Module:** 4 (配線 — consensus crate)、module 内 sortOrder 1
- **Course-level sortOrder:** 9 (13 レッスン中の 10 番目)
- **Duration:** 15 分
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# Malachite の `Decided` から Reth の `forkchoice_updated` へ

午前 3 時。バリデータが今しがた block 17 の決定的 precommit に署名した。Malachite が `Decided` を emit する。EL はその瞬間、待ち状態のまま結果を受け取ろうとしている。**チェーンが block 18 に進むまでに、どんな順番で、何が起こる必要があるか?**

「`bridge.commit(hash)` を呼ぶだけ」と答えたなら、読み進めてほしい。**呼び出すこと自体より、順番のほうが重要だ。**

> 🛑 **スクロール前に予測。** Malachite が `Decided` と言ってから、次のラウンドが始まるまでの間に起こるべき状態変化を順番にリストアップせよ。ヒント: 3 つ以上ある。どれか 1 つを飛ばすとチェーンが停止する。

## 1. BFT における `Decided` の意味

Malachite が高さ H の値 V について `Decided` を emit するとき、3 つのことが同時に真である:

1. **投票権の 2/3+1 以上** が H における V に対して precommit を署名した。
2. **高さ H で他の値が決定されることはもうあり得ない** — 署名は記録されており、バリデータによる equivocation は slashable な証拠になる。
3. **H における reorg は不可能** — block H はチェーンの不可逆な事実になった。

これが BFT の約束である。Nakamoto 形式のチェーン (PoW、ETH 1.0 longest-chain) では「決定された」は確率的だ — k confirmations を待って、fork が追いついてこないことを祈る。BFT では、**決定されたものは決定されている。永遠に。**

この単一の性質が、EL の応答方法を変える。Ethereum では、EL は fork-choice の下でブロックを適用し、どれが finalized になったかは Casper FFG 経由で *あとから* (~13 分後) 通知される。BFT では、head と finalized block は同じブロックで、同じ操作で決定される。

## 2. `forkchoice_updated` が我々に求めるもの

Engine API のコールの形:

```
forkchoiceUpdated(ForkchoiceState {
    headBlockHash:      B256,
    safeBlockHash:      B256,
    finalizedBlockHash: B256,
}, payload_attrs: None)
```

3 つの hash。Reth (および準拠した EL) は内部ポインタを更新し、指名されたブロックを直ちに canonical として扱い始める。

Ethereum では、これらは潜在的に異なる 3 つのブロックである:
- `head`: バリデータが現在その上に build しているブロック (まだ reorg され得る)
- `safe`: justified、1/3+ の悪意あるステークがない限り reorg されない
- `finalized`: 不可逆的に commit、archive 可能

BFT では、**これらは collapse する**。Malachite の Decision の後:
- `head = decided block`
- `safe = decided block`
- `finalized = decided block`

> 🛑 **反流暢性。** 「BFT と PoS の finality は同じものだ。」 完全には正しくない。Ethereum の Casper FFG は Nakamoto chain の上に重ねられた BFT *gadget* であり、head の後ろにあるブロックを finalize することができる。Pure BFT (Tendermint、HyperBFT、openhl) にはこのギャップは存在しない — head がすべてのステップで finalized であるからだ。

## 3. Collapse、具体的に

この collapse は Decided ハンドラを単純化する。3 つの別々の forkchoice ポインタを追跡する必要はない — 常に同一だからだ。Forkchoice update は次のように退化する:

```
forkchoiceUpdated(ForkchoiceState {
    headBlockHash:      decided_hash,
    safeBlockHash:      decided_hash,
    finalizedBlockHash: decided_hash,
}, None)
```

これが Reth 側。openhl の in-process variant では、レッスン 7 でマッピングした trait の `bridge.commit(decided_hash)` ただそれだけだ。

## 4. Decided ハンドラ、歩く

openhl のアプリループの実際の Decided arm、`crates/consensus/src/engine_app.rs:119@0cac571` から:

```rust
AppMsg::Decided {
    certificate, reply, ..
} => {
    let hash = certificate.value_id;
    bridge.commit(hash).await?;
    decided.push(hash);
    current_parent = hash;

    if decided.len() >= stop_after_decisions {
        let next_height = certificate.height.increment();
        let _ = reply.send(Next::Start(next_height, validator_set.clone()));
        return Ok(decided);
    }

    let next_height = certificate.height.increment();
    current_height = next_height;
    if reply.send(Next::Start(next_height, validator_set.clone())).is_err() {
        tracing::warn!("{APP_REPLY_WAIT_LOG} (Decided)");
    }
}
```

5 ステップ。順番に:

1. **決定された hash を取り出す。** `certificate.value_id` は BFT が今しがた不可逆的に commit した `BlockHash` である。決定に対して我々は何もしていない — すでに決まっている。

2. **bridge 経由で commit する。** `bridge.commit(hash).await?` が決定を EL に伝播する。Stage 7d (commit `0cac571`) の時点で、これは Reth の in-process Engine API に対する実際の `forkchoiceUpdated` コールを発火する — body は §6 を参照。**もしこれが error を返すなら、我々はそれを propagate する — チェーンが停止する。** これが正しい挙動だ。我々は今しがた決定を行い、EL が適用を拒否した。**サイレントに fork するより停止するほうがマシだ。**

3. **追跡を更新する。** 呼び出し元のビューのために `decided.push(hash)`、次の `build_payload` が何の上に build するかを知るために `current_parent = hash`。

4. **consensus に次が何かを伝える。** `reply.send(Next::Start(...))` で Malachite に次の高さを開始するよう指示する。代わりに `Next::Restart` を送ると、Malachite は現在の高さをやり直す。

5. **(テスト専用) 早期終了。** `stop_after_decisions` に到達したら return し、テストがクリーンに終了できるようにする。

> 🛑 **予測。** ステップ 4 を飛ばす — どんな reply も送らない — とどうなる?

Malachite が停止する。Consensus actor は我々の応答を待ってブロックし、次の高さに進まなくなる。チェーンが凍結する。**これは設計通りだ** — Malachite は明示的なアプリケーション確認なしに進むことを拒否する。これは EL が CL を先回りさせないようにする方法である。

## 5. `Next::Start` vs `Next::Restart`

| Variant | 使用場面 |
| :--- | :--- |
| `Next::Start(height+1, validator_set)` | Commit 成功; 次の高さに進む。 |
| `Next::Restart(current_height, validator_set)` | Commit 失敗; 現在の高さをやり直す (異なる proposer rotation が役立つかもしれない)。 |

openhl の現在の実装では `Next::Start` のみを使用する。`bridge.commit` が失敗すると、error を stack 上に propagate する — `Restart` を検討する頃にはチェーンはすでに停止している。**自動 restart ループは存在しない。** これは意図的だ: 失敗した commit は我々の状態が破損しているか EL が壊れていることを意味し、静かにリトライすると問題を悪化させる。

Production 形の `Restart` 使用は infrastructure 層の recovery (state 復元、WAL replay) と組み合わせて再試行することになる。Stage 7d の commit パスにおける WAL 統合は、そのパターンが landed する場所だ。

## 6. Stage 7d — `commit` が Reth に届く (現時点の honest な範囲で)

Stage 7c は動作する `commit` の stub を与えてくれた: ブリッジ自身の `HashMap` に header を書き、`head` を進め、`Ok` を返す。Stage 7d はその stub を Reth の in-process Engine API に対する実際の `forkchoiceUpdated` に変える — 望まない caller を一切壊さずに。

実際の `commit` body、`crates/evm/src/live_node.rs:301@0cac571`:

```rust
async fn commit(&self, block_hash: BlockHash) -> Result<(), BridgeError> {
    let hash = B256::from(block_hash.0);
    let header = {
        let mut s = self.state.lock().expect("state mutex poisoned");
        let header = s
            .pending
            .values()
            .find(|(h, _, _)| *h == hash)
            .map(|(_, h, _)| h.clone())
            .ok_or_else(|| {
                BridgeError::Rejected(format!("commit for unknown hash {hash}"))
            })?;
        s.chain.insert(hash, header.clone());
        s.head = Some(hash);
        header
    };

    if let Some(handle) = &self.engine_handle {
        let state = ForkchoiceState {
            head_block_hash: hash,
            safe_block_hash: hash,
            finalized_block_hash: hash,
        };
        let _ = handle.fork_choice_updated(state, None).await;
    }

    Ok(())
}
```

3 つ気付くべきこと:

**ローカル先、engine 後。** bridge 自身の `HashMap` は短い critical section の *内側で* 更新される。lock を release してから、ようやく engine 側を呼びに行く。この順番が肝心だ: もし engine call が panic したり hang したりしても、bridge 自身のチェーンビューはその時点ですでに consistent になっている。handle を install していないテストはこの後半を一切通らないので、何も壊れずに従来どおり動く — `engine_handle: None` の場合に後半が short-circuit するからだ。

**3 つの hash、1 つの値。** §3 の collapse の具体化: `head = safe = finalized = hash`。BFT には justification ステップがないので justification と finality の間に drift は存在しない — 決定が finalization そのものだからだ。Casper-FFG client ではこれら 3 つが通常異なるブロックになる、対比される。

**`let _ = ... .await`。** engine の応答は意図的に捨てている。なぜか?

> 🛑 **予測。** openhl が `newPayload` 経由で見たことのない `hash` について `forkchoiceUpdated(hash)` を送ったとき、Reth の engine は何を返すか? 3 つの選択肢: `VALID`、`INVALID`、`SYNCING`。どれで、なぜか?

答えは `SYNCING` である。Reth は database にそのブロックを持っていない — openhl は bridge 内で header を built したが、Reth に実行を依頼せず、`engine_newPayload` のための `ExecutionPayload` を生成していない。Reth は正しく応答する: 「私はこのチェーンの上にいない; 何の話か分からない; 私が syncing 中だと仮定してくれ。」

これが Stage 7d の **honest-scoping flag** だ。配線は接続されている — コールは engine に到達し、engine は応答し、我々は deadlock せず panic しない。しかし engine の応答はまだ *有用* ではない、なぜなら validate する実際の payload がないからだ。次の staging chunk (Module 3 以降、CLOB の fills が EVM transactions として encode されたあと) では `commit` を先行する `newPayload(payload)` と pair させ、forkchoice が到着する頃には engine がすでにブロックを知っている状態にする。

handle install のパスは `crates/evm/src/live_node.rs:118@0cac571` に存在する:

```rust
#[must_use]
pub fn with_engine_handle(
    mut self,
    handle: ConsensusEngineHandle<EthEngineTypes>,
) -> Self {
    self.engine_handle = Some(handle);
    self
}
```

Builder スタイルなのは、bridge が Reth node の launch 完了前に構築されるからだ — `new()` に handle を渡せない。`crates/evm/src/live_node.rs:691@0cac571` の integration test が実際の hand-off を示す:

```rust
let handle = NodeBuilder::new(node_config)
    .testing_node(runtime)
    .with_types::<EthereumNode>()
    .with_components(EthereumNode::components().executor(OpenHlExecutorBuilder))
    .with_add_ons(EthereumAddOns::default())
    .launch()
    .await?;

let engine_handle = handle.node.add_ons_handle.beacon_engine_handle.clone();

let bridge = LiveRethEvmBridge::new(handle.node.provider.clone(), chain_spec)
    .with_engine_handle(engine_handle);
```

Handle は launched node の `add_ons_handle.beacon_engine_handle` から pluck される。このフィールドが存在するのは `EthereumAddOns::default()` で compose したからだ; これがなければフィールドは存在せず、`with_engine_handle` に install するものがない。

> 🛑 **反流暢性。** 「Decided と committed は同じものだ。」 **違う。** *Decided* は BFT による 2/3+1 のバリデータが合意したという主張。*Committed* は EL がブロックを実際に適用したという確認。チェーンが進むには両方が起こる必要がある。これらを 1 つの概念に collapse すると、bridge 呼び出しを完全に skip してしまい、EL が適用を拒否するブロックについて consensus が決定する状態に陥る。

> 🛑 **反流暢性。** 「engine が SYNCING を返すなら Stage 7d は壊れている。」 **違う。** SYNCING は engine がブロックを持っていないという意味だ — そして我々はそもそも送っていないのだから *正しい* 応答である。バグになるのは SYNCING が我々を驚かせる場合だ; 代わりに我々はそれを期待し、文書化し、次のステージの `newPayload` 統合の後ろに gate している。

## 7. 練習

1. **3 つのポインタを trace する。** openhl で block 5 が decided されたあと、openhl が Reth に送る 3 つの Forkchoice hash は何か? もし Ethereum mainnet で block 5 が head だが block 3 が最新 finalized だった場合に送る内容と比較せよ。
2. **停止条件を見つける。** `bridge.commit` のどの error がステップ 4 の実行を妨げるか? `crates/evm/src/live_node.rs:301@0cac571` で、どの分岐が `Ok(())` を返し、どの分岐が `Err` を返すか identify せよ。(ヒント: `Err` を返す分岐は 1 つだけ — Stage 7c と同じものだ。)
3. **なぜ engine の応答を捨てるか?** §6 の `commit` は `let _ = handle.fork_choice_updated(...)` と書いている。次のステージが CLOB の fills を EVM transactions として encode し、この `forkchoiceUpdated` の前に `newPayload` コールを追加することを想像してみよ。Body を以下のように書き直せ: (a) まず `newPayload(payload)` を呼ぶ、(b) 返された `PayloadStatus` を check する、(c) `PayloadStatus::Valid` の場合にのみ forkchoice-update する。`Invalid` の場合にどんな `BridgeError` を生成するか? `Syncing` の場合は?
4. **Restart 使用をスケッチする。** もし `bridge.commit` が「proposer の値はクリーンに適用できないが、次の試行はうまくいくはず」を意味する error を返したら、Decided ハンドラはどう変わるか? `Next::Restart` に切り替える diff をスケッチせよ。

> **最終チェック。** 1 文で、なぜ openhl は `Decided` 上で即座に進む代わりに、次の高さに進む前にアプリケーションの reply (ステップ 4) を待つのか? もし答えに「EL が拒否するかも」または「CL が先回りするのを防ぐ」が含まれていなければ、§4 ステップ 2 を再読。
````

---

## Seed-file slot

EN seed `prisma/seed-reth-openhl-consensus-en.ts` と並んで、JA バージョンは `prisma/seed-reth-openhl-consensus-ja.ts` に landing する (まだ未作成 — translation 完了後に generator スクリプトで作る)。Module 構造は EN と同一:

```typescript
{
  title: '配線 — consensus crate',
  sortOrder: 3,
  lessons: { create: [
    // L9 (JA, TBD)
    {
      title: 'Malachite の Decided から Reth の forkchoice_updated へ',
      slug: 'openhl-decided-to-fcu-ja',
      type: 'CONTENT',
      sortOrder: 1,
      duration: 15,
      xpReward: 40,
      content: `# Malachite の \`Decided\` から Reth の \`forkchoice_updated\` へ ...`
    },
    // L11 (JA, TBD)
  ]}
}
```

## SHA pinning discipline

EN ミラーと同じ SHA `0cac571` を pin する。`file:line@SHA` cite は EN/JA で identical: 同じ openhl のコードを参照する。CI link-check workflow (`.github/workflows/openhl-cite-check.yml`) は drafts/ 配下の `.md` ファイルを *言語に関わらず* 全部スキャンするので、JA ドラフトを追加することで cite-check の coverage を倍増させる方向ではなく、同一 cite を共有する形になる。EN 側で SHA bump が起きたら JA も同時に bump する必要がある (lockstep)。

## Style review notes (self-critique before paste)

- **登録 (register) は EN ミラーと一致**: 体言止め + である調を基本に、技術用語 (file paths、function names、code) は英語のまま。consensus-engineering JA コースの体感と一致させた。
- **「Decided」「committed」「forkchoice」「engine」をカタカナにしていない理由**: これらはすべて Engine API の正式な用語であり、英語表記のほうが Ethereum/Reth のソースコードやドキュメントを後で読むときに認識が直結する。逆に「合意」「決定済み」と訳すと、英語の元用語に戻すための余計な認知ステップが入る。
- **🛑 callout 翻訳**:
  - 「Predict」→「予測」
  - 「Anti-fluency」→「反流暢性」(consensus-engineering JA で確立した訳)
- **§6 は EN と同様に最長セクション** (≈700 字 + コード)。15 分予算の上限近いが、Stage 7d 全体の "なぜ SYNCING で OK か" のロジックが分離できないので bundled のままにする。
- **L7 の JA mirror は別タスク**: L7 は Stage 7c の validator-forcing moment に anchor されており、SHA `0844d58` で固定された歴史的コンテキストを持つ。L10 とは独立に翻訳できるので、別ファイル (`openhl_l7_ja.md`) として後で出す。
- **未公開**: レッスン 10 EN ミラーが `course.isPublished: false` のままなので、JA seed エントリ追加時もデフォルトで非公開にする。レッスン 11/12/レッスン 13 の JA 翻訳が揃ってから一斉公開するのがクリーン。
