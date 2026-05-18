# Building OpenHL — L11 draft (JA)

> openhl SHA `0844d58` (Stage 7c) に対してドラフト。L9 (trait の設計) と L10 (Decided handler) と並んで Module 4 を閉じる。
> EN ミラー: `drafts/openhl_l11_en.md`。
> Course: `building-openhl-consensus-en` (track: `reth-l1-architect`, course #6 of 10)。
> 元の outline は `crates/consensus/src/proposer.rs` を cite していた — そのファイルは結局 land せず、proposer ロジックは `crates/consensus/src/engine_app.rs:65@0844d58` (`AppMsg::GetValue` arm) に置かれている。レッスンを実コードに合わせて更新済み。

---

## L11 — `openhl-proposer-ja`

- **Module:** 4 (配線 — consensus crate)、module 内 sortOrder 2
- **Course-level sortOrder:** 10 (13 レッスン中の 11 番目)
- **Duration:** 15 分
- **XP reward:** 40
- **Type:** CONTENT

### Content

````markdown
# ブロックを produce する — Malachite proposer → Reth payload → broadcast

午前 3 時。Malachite の leader election 関数が今しがた、このノードを height 47、round 0 の proposer に選んだ。残り時間は **400 ミリ秒** — ブロックを produce し、peer に broadcast し、prevote 収集を開始するまで。時計はすでに動いている。

そのミリ秒はどこに消えるのか? 予算のうち 200µs はアプリ側のコード、50ms は Reth、100ms はネットワーク伝播 (proposer がどんなに頑張っても縮められない) — どれがどれか? 本レッスンは openhl の実コード経由で proposer hot path を trace し、重要な瞬間に名前を付ける。

> 🛑 **スクロール前に予測。** 自分は height N の proposer だとせよ。コードがこれを知る瞬間から proposal を broadcast するまでに、起こる必要があるアクションをすべて順番に名指せ。ヒント: 少なくとも 5 つあり、そのうち 1 つは「synchronously に起こる必要がない」だ。

## 1. Hot path、名指し

openhl の `run_engine_app` ループが consensus engine から `AppMsg::GetValue` を見るとき、エンジンが言っているのは: 「いま自分の番だ。Propose するブロックを build せよ。」

bridge より上から trace する:

| Step | Owner | 何が走るか | 典型予算 |
| :--- | :--- | :--- | :--- |
| 1 | Malachite Consensus actor | Round-robin が我々を proposer に選ぶ | <1µs |
| 2 | Malachite Engine actor | `AppMsg::GetValue { height, round, timeout, reply }` を送る | <5µs |
| 3 | **openhl `run_engine_app`** | `bridge.build_payload(parent, attrs)` を call | varies — §3 参照 |
| 4 | **openhl `run_engine_app`** | `bridge.payload_ready(id)` を call | varies |
| 5 | **openhl `run_engine_app`** | `LocallyProposedValue` でラップ、`reply` 経由で送信 | <10µs |
| 6 | Malachite Consensus actor | 値を受信、`OpenHlContext::new_proposal` を call | <100µs (signing) |
| 7 | Malachite Network actor | libp2p 経由で proposal を gossip | network-bound |

Step 3-5 が我々のもの。Step 1-2 と 6-7 は Malachite。**我々がコントロールする proposer hot path 全体は 16 行のコードだ。**

## 2. ミリ秒はどこに消えるか

`AppMsg::GetValue` payload は `timeout: Duration` を含む — Malachite が我々にどれだけ時間があるかを伝えている。我々のコードは現在それを無視している (`timeout: _`)、テストモード (bridge call が synchronous) では問題ない。**Production では問題だ** — `build_payload` が timeout より時間がかかると、Malachite は待つのをやめ、round は proposal なしで timeout する。

Malachite のデフォルト `ConsensusConfig` の timeout は **propose timeout** で、安全のため典型的に 1-3 秒だが、HL や Tempo のようにサブ秒 slot を狙う chain では 300-500ms までチューニング可能だ。

| 予算消費者 | テストモード (今日) | Production モード |
| :--- | :--- | :--- |
| `bridge.build_payload` body | microsecond (in-memory) | 100-400ms (real Reth payload assembly) |
| `bridge.payload_ready` body | microsecond | <5ms (cached result) |
| `reply.send(...)` channel 書き込み | nanosecond | nanosecond |
| `OpenHlContext::new_proposal` + sign | microsecond | microsecond |
| Network gossip 伝播 | n/a (single validator) | 50-200ms (peer-count 依存) |

Production で expensive な行は **mempool から実際の payload を assemble する** ことだ — Reth の payload builder が transaction を pick、execute、state を compute する。そこに 100-400ms が住む。それ以外はオーバーヘッドだ。

> 🛑 **反流暢性。** 「自分の番のときに同期的に payload を build すればいい — それが最も単純な設計だ。」 **production では違う。** 同期 build は propose 予算のほとんどを、もっと早くできた仕事に費やしてしまう。4 メソッド `ConsensusBridge` trait (L9) はまさにこの async 最適化を可能にするために存在する。§5 でどうやるか見る。

## 3. Proposer のコード、walked

`crates/consensus/src/engine_app.rs:65@0844d58` を開け:

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
    let lpv = informalsystems_malachitebft_app_channel::app::types
        ::LocallyProposedValue::new(height, round, value);
    if reply.send(lpv).is_err() {
        tracing::warn!("{APP_REPLY_WAIT_LOG} (GetValue)");
    }
}
```

16 行。5 つの論理ステップ:

1. **Payload attributes を build。** `default_attrs()` は `PayloadAttrs { timestamp: 0, fee_recipient: [0u8; 20], prev_randao: [0u8; 32] }` を返す。Production ではどこかから来る — chain config、validator settings、前のブロックの randao reveal。v0 ではこれらは定数だ、chain logic のどの部分もまだ依存していないからだ。

2. **Payload build を start。** `bridge.build_payload(current_parent, attrs).await` — テストモードでは即座に `PayloadId` を返す (sync impl) か、production では async job を start する (`LiveRethEvmBridge` で、Reth の payload-builder service に dispatch する)。

3. **ブロックを待つ。** `bridge.payload_ready(id).await` — assemble された `ExecutedBlock` を返す。テストモードでは即座に返る; production では payload-builder service が ready をシグナルするまで block する (または propose timeout が fire し、round を失う — §5 で回避方法を見る)。

4. **`LocallyProposedValue` でラップ。** Malachite の app-channel はこの type を local に build された proposal の contract handoff として使う。`(height, round, value)` の struct だ。`Proposal` を直接構築するのではない — それは consensus actor の仕事だ。

5. **Reply oneshot 経由で送信。** `reply.send(lpv)` は `tokio::sync::oneshot` channel だ。Engine actor は oneshot の反対側で block して待っている。**送らないと Malachite が stall する** (L10 の `Decided` reply と同じ halt パターン)。`is_err()` で warning を送る — `send` が失敗する唯一の方法は receiver がすでに drop されていることだからだ — engine が timeout して先に進んだ意味だ。

> 🛑 **予測。** Step 5 の `reply.send(...)` が engine の propose timeout 発火 *後* に起こるとどうなる?

`send` は `Err(_)` を返す、engine がすでに oneshot を諦めたからだ。Warning をログして続行する。**Malachite は我々の proposal なしに次の round に進む** — round が timeout し、prevote は nil に行き、次の proposer (round-robin) が番をもらう。Chain は halt しない; ただ round を 1 つ失うだけだ。

これは correct な挙動だ: 遅い proposer は chain を永久に block すべきではない。1/3+ byzantine fault assumption がこれから保護する — 1 round あたり 1 validator が遅くても、chain は average validator のスピードで進む。

## 4. `LocallyProposedValue` — consensus が実際に受け取るもの

我々は Malachite `Proposal` を直接構築しない。`LocallyProposedValue::new(height, round, value)` を構築する。Malachite の Consensus actor が我々の値を取り、`OpenHlContext::new_proposal` (L4 領域) 経由で `Proposal` を build、`SigningProvider` (Stage 6a) 経由で sign、署名済み Proposal を Network actor に gossip 用に渡す。

我々はそれら 4 操作のどれもしない。Trait split は意図的だ: 我々は *値選択* (どのブロックを propose するか) を所有し、Malachite は *proposal 構築* (wire 形式)、*signing*、*broadcast* を所有する。

| Operation | Owner | なぜこの owner か |
| :--- | :--- | :--- |
| 値を pick | **openhl app loop** | Application-specific — chain が何をブロックと見なすかを決める |
| `Proposal` struct でラップ | Malachite | Consensus-protocol concern — on-wire 形式は BFT spec で固定 |
| Sign | `OpenHlSigningProvider` (Stage 6a) | Validator-key-specific — 我々だけが key を持つ |
| Broadcast | Malachite Network actor | Network-layer concern — gossipsub topic 管理 |

これが L1 §5 が 4 メッセージ contract で名指した同じ separation-of-concerns だ: bridge は「EVM が何をするか」を所有; Malachite は「consensus が何をするか」を所有; SigningProvider は「我々の validator の key が何をするか」を所有。各部分は隔離してデバッグできる程度に小さい。

## 5. 我々がまだ使っていない async trick

§3 の step 2 と 3 をもう一度見よ。`build_payload` と `payload_ready` は *別 call* — 偶然ではない。Split は production で次を可能にする:

```
Time:  t=0       t=200ms        t=400ms                   t=propose
       │           │               │                          │
       ▼           ▼               ▼                          ▼
       │       round N-1            │            our slot starts (round N)
       │   voting in progress       │
       │           │               │                          │
       └─ build_payload(...)─async─┴─ payload_ready(id) ─────┘
          (round N-1 がまだ          (すでに built された
           voting 中に kick off)        block を fetch するだけ)
```

`build_payload` は早めに call される — 前 round の decided block が分かった瞬間に — そのため EL は round の投票時間を、次のブロックを並行して assembly する時間に充てられる。`payload_ready` が call される頃には、ブロックはすでに組み上がって待機している状態だ。Propose 時の critical path は「準備済みの payload を fetch して reply を送る」だけに縮む — マイクロ秒のオーダーであって、ミリ秒ではない。

これが L7 §4 の **build-during-voting** 最適化だ。**今日の openhl コードはこれをしない** — `AppMsg::GetValue` arm は同じハンドラ内で `build_payload` と `payload_ready` を連続で call する。テストモードでは問題ない (どれもマイクロ秒だ)。Production では「`build_payload` を round-decided 時に kick off、`payload_ready` を propose 時に await」に変える必要がある。

Trait surface はすでにこれを支えるように設計されている — 4 メソッドの split がその API だ。Async 最適化のための実装作業は bridge の外側にある: AppMsg loop の側が、`GetValue` が来るより前に `build_payload` を call できるように書き直される必要がある。

> 🛑 **反流暢性。** 「`build_payload` と `payload_ready` は今日常に一緒に call されるから 1 つのメソッドに collapse できる。」 **違う。** 今日一緒に call される事実が我々が最終的に直すバグだ — trait は fix を *可能にする* よう形作られている。メソッドを collapse すると同期設計を永久に lock-in する。

## 6. Reply の後 — Malachite が何をするか

`reply.send(lpv)` が return すると、我々のコードは終わりだ。Malachite の Consensus actor が値を受信し、残りをする:

1. `OpenHlContext::select_proposer` で (height, round) の proposer の address を lookup (我々であることを verify)
2. `OpenHlContext::new_proposal(height, round, value, pol_round, address)` を call して `Proposal` を構築
3. Proposal を `OpenHlSigningProvider::sign_proposal` に渡して Ed25519 署名
4. `SignedProposal` でラップして Network actor に渡す
5. Network actor が libp2p gossipsub 経由で broadcast
6. 各 peer が proposal を受信、署名を validate、*自分の* Consensus actor に external input として渡す

そのリストの step 1 で我々は終わりだ。Proposer から見れば、下流の pipeline 全体は opaque だ — actor フレームワークが handle する。

これが L11 のレッスンを具体化したものだ: **proposer のコードが小さいのは contract が well-designed だからだ。** Malachite が consensus protocol を handle; 我々が application-specific な「どの値を propose するか」を handle; bridge が EL-specific な「どう build するか」を handle する。

## 7. 練習

1. **予算を trace せよ。** Production の openhl デプロイメントが 1 秒の propose timeout を使う。Reth の payload builder は典型的に 200ms かかる。Peer へのネットワーク伝播は ~80ms。**1 秒の予算の残りはどれだけか?** Proposer はそのバッファを何に使うか? (ヒント: peer からの prevote 収集は proposal broadcast と並列に起こるが、proposer は precommit 前に 2/3+ prevote を待つ。)

2. **Timeout 無視行を見つけよ。** `engine_app.rs:65@0844d58` で、`AppMsg::GetValue` destructure は `timeout: _` を持つ。`timeout` や別フィールドを `_` で破棄する他のすべての AppMsg variant を見つけよ。それらは load-bearing か? (ヒント: ほとんどは fine — 全フィールドが必要なわけではない — が、1-2 個は production gap かもしれない。)

3. **Async 最適化を sketch せよ。** 今日の `AppMsg::GetValue` ハンドラは sync (build + ready 連続)。代わりに毎 `AppMsg::Decided` 直後に `build_payload` を call、結果の `PayloadId` を `(next_height, round=0)` で keyed して保存するよう diff を sketch せよ。それから `GetValue` は単に `payload_ready` + `reply.send` になる。これは L10 §5 の `Next::Restart` とどう interact するか?

> **最終チェック。** 1 文で、なぜ openhl の proposer コードは `Proposal` を直接構築せず、`LocallyProposedValue` を返して Malachite に `Proposal` を build させるのか? 答えに「separation of concerns: application は値選択を所有、consensus は proposal 構築を所有」または「on-wire `Proposal` 形式は application ではなく consensus protocol で固定」が含まれていなければ、§4 を再読。
````

---

## Seed-file slot

L11 は `prisma/seed-reth-openhl-consensus-ja.ts` (course `building-openhl-consensus-ja`) に Module 4 の 3 番目のレッスン (すでに drafted の L9 と L10 の後) として landing する:

```typescript
// Course.modules.create array:
{
  title: '配線 — consensus crate',
  sortOrder: 3,
  lessons: { create: [
    // L9 (drafted)
    // L10 (drafted)
    {
      title: 'ブロックを produce する — Malachite proposer → Reth payload → broadcast',
      slug: 'openhl-proposer-ja',
      type: 'CONTENT',
      sortOrder: 2,
      duration: 15,
      xpReward: 40,
      content: `# ブロックを produce する — Malachite proposer → Reth payload → broadcast\n\n...`  // L11 markdown
    },
  ]}
}
```

**Module 4 は drafts directory で完成:** L9 + L10 + L11 = 3 of 3 lessons drafted。~50 分の teaching、~140 XP。

## SHA pinning discipline

すべての cite は SHA `0844d58` を pin する。L11 は line-anchored cite が L9 より少ない — レッスンは 12 行のコードブロック (`engine_app.rs:65-82@0844d58`) に focus するからだ; レッスンのほとんどはそのブロックの *予算* と *separation of concerns* についてで、他のコードについてではない。

注意が必要な 1 cite: `engine_app.rs:65@0844d58` (GetValue arm)。§5 の async 最適化が landing するとき (おそらく Module 5 または Stage 8 変更)、このレッスンの §3 と §5 は両方更新が必要 — §3 を新しい構造に反映、§5 から「まだ使っていない」を削除。

## Style review notes (self-critique before paste)

- **§5 はレッスンの最強の pedagogical move だ。** 学習者に、現在のコードが trait が支えるよう設計されたとおりに *意図的に* 不完全であることを示す。**繰り返す価値のある教えのテクニック: 将来のために設計し、より単純なものを ship し、gap を読者に visible にせよ。**
- **§2 の予算テーブル** は典型 mainnet の数字を持つ (Reth payload assembly 100-400ms)。これらは公開 Reth ベンチマークからの estimate; レッスンが公開される前に sanity check すべき。
- **Exercise 3 が `Next::Restart` を参照** — これは L10 §5 への forward reference。L10 が Restart の扱いを変えるならこの exercise も並列に更新が必要。
- **翻訳 policy は他の JA レッスンと同一**:
  - `LocallyProposedValue`、`AppMsg::GetValue`、`OpenHlContext` 等の Malachite/openhl API type は英語のまま。
  - `oneshot`、`tokio::sync`、ractor 関連の concurrency 用語は英語のまま。
  - 「hot path」「budget」「critical path」「kick off」「async trick」等のパフォーマンス用語は英語のまま。
  - 🛑 callout: Predict → 予測、Anti-fluency → 反流暢性。
- **未公開**: `course.isPublished: false` のまま。L12/L13 JA 翻訳が揃ってから一斉公開予定。
