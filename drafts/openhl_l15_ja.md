# OpenHL を作る — L15 draft (JA) — C2 build-along 書き直し

> openhl SHA は cite しない — このレッスンは recap と roadmap であって新規コードではない。
> コース: `building-openhl-consensus-ja` (track: `reth-l1-architect`, 10 コース中 6 番目)。
> コース最終レッスン。

---

## L15 — `openhl-capstone-ja`

- **モジュール:** 7 (Capstone — 最終レッスン用の新規モジュール)
- **モジュール sortOrder:** 7
- **コース全体 sortOrder:** 14 (コース上で見えるレッスンの 15 個目; Module 4 がレッスン 4 つで、L8/L9 をコース途中で split したので番号は 15)
- **所要時間:** 25 分
- **XP:** 60
- **type:** CONTENT

### Content

````markdown
# レッスン 15 — 作ったもの、まだ stub のもの、次に行く先

## 作ったシステム

14 レッスンを通じて、空ディレクトリの `cargo init` から、実際の Reth EL を通じて実際の block を ~0.02 秒で確定させる single-validator BFT chain までたどり着いた。Workspace は今こう見える:

```
~/code/my-openhl/
├── Cargo.toml                          ← reth-* 16 個、malachite 8 個、すべて SHA pin
├── bin/openhl/                         ← (stub バイナリ — production 接続は将来コース)
├── crates/
│   ├── types/                          L2:  CL↔EL 共通 contract 型
│   │   └── src/lib.rs                  BlockHash, PayloadId, PayloadAttrs,
│   │                                   ExecutedBlock, PayloadStatus
│   ├── evm/                            EL 側 (test double → live Reth)
│   │   ├── src/bridges/
│   │   │   ├── in_memory.rs            L4:  InMemoryEvmBridge (HashMap state)
│   │   │   └── reth.rs                 L5:  RethEvmBridge (alloy 型, real hash_slow)
│   │   ├── src/reth_node.rs            L11: bootstrap 証明 (test-only)
│   │   └── src/live_node.rs            L12-L14: LiveRethEvmBridge<P>
│   │                                   - L12: BlockNumReader 経由の parent lookup
│   │                                   - L13: EthBeaconConsensus validate
│   │                                   - L14: ConsensusEngineHandle forkchoice
│   └── consensus/                      CL 側 (フル BFT engine)
│       ├── src/bridge.rs               L3:  ConsensusBridge trait
│       ├── src/types/                  L6:  10 個の Malachite Context sub-type
│       ├── src/context.rs              L6:  Context<OpenHlContext> impl
│       ├── src/signing.rs              L7:  vote/proposal の canonical encoding
│       ├── src/signing_provider.rs     L7:  SigningProvider<OpenHlContext>
│       ├── src/codec.rs                L8:  OpenHlCodec (real 1 個 + stub 7 個 Codec impl)
│       ├── src/node.rs                 L9:  OpenHlNode + start_engine
│       └── src/engine_app.rs           L10: run_engine_app (AppMsg ルーティング)
```

合計で **40-50 個のソースファイル**。Workspace テスト: 38 個合格。

このコース全体で開通させた **CL ↔ EL 結合の全体像** を 1 枚に落とすと、自分の手で繋ぎ切った境界線がどこを走っているかが一望できる:

```
   [ CL: openhl-consensus ]                          [ EL: openhl-evm ]
  ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
  │  Malachite BFT Engine (actor system)      │    │   LiveRethEvmBridge<P>                    │
  │                                            │    │                                            │
  │   ├── OpenHlContext                         │    │    ├── provider: P (BlockNumReader        │
  │   │   (10 associated types — L6)            │    │    │             + HeaderProvider)         │
  │   ├── OpenHlSigningProvider                 │    │    ├── chain_spec: Arc<ChainSpec>          │
  │   │   (Ed25519 + canonical encoding — L7)   │    │    │   (共有 source of truth — L13)         │
  │   ├── OpenHlCodec                           │    │    ├── validator:                          │
  │   │   (1 Real + 7 Stub — L8)                │    │    │   EthBeaconConsensus<ChainSpec> (L13) │
  │   ├── OpenHlNode / OpenHlNodeHandle (L9)    │    │    ├── engine_handle:                      │
  │   └── run_engine_app loop                   │    │    │   Option<ConsensusEngineHandle> (L14) │
  │       (12 AppMsg arms — L10)                │    │    └── state: Mutex<{ pending, chain,      │
  │                                              │    │                       head, … }>          │
  └──────────────────┬──────────────────────────┘    └──────────────────┬──────────────────────┘
                     │                                                  ▲
                     │ ── 4 つの ConsensusBridge メソッド契約越しに対話 ─┘
                     │   (L3 で定義した trait surface)
                     │
                     ├── ① build_payload(parent, attrs)
                     │     CL ──► EL : 「次の block を組み立てろ」
                     │     EL ──► CL : PayloadId (即返却、Reth が裏で構築)
                     │     裏側: provider から parent_header 取得 →
                     │           ChainSpec::next_block_base_fee + gas_limit copy
                     │           + timestamp 単調化 → header 合成 → pending に格納
                     │
                     ├── ② payload_ready(id)
                     │     CL ──► EL : 「さっきの PayloadId、ブロック寄越せ」
                     │     EL ──► CL : ExecutedBlock (pending から回収)
                     │     ※ 4 method の中で唯一データが EL → CL 方向の seam
                     │
                     ├── ③ validate_payload(&block)
                     │     CL ──► EL : 「peer から来た proposal、検証してくれ」
                     │     EL ──► CL : PayloadStatus { Valid / Invalid / Syncing }
                     │     裏側: EthBeaconConsensus::validate_header_against_parent
                     │           (4 sub-check: number / timestamp / gas-limit / EIP-1559)
                     │
                     └── ④ commit(hash)
                           CL ──► EL : 「2/3+ で合意成立、確定させろ」
                           EL ──► CL : Ok(())
                           裏側 Phase 1 (絶対成功): state.chain.insert + head 更新
                           裏側 Phase 2 (best-effort): ConsensusEngineHandle::
                               fork_choice_updated → Reth の in-process Engine API
                               (現状 body 無しなので SYNCING 応答、レスポンスは破棄)
```

ポイントは 3 つ: (a) **左右の世界は L3 で定義した `ConsensusBridge` trait の 4 メソッドだけで会話する** — 巨大なインフラ 2 つを繋ぐ唯一の接着面がここに収まっている。(b) **`run_engine_app` (L10) が `B: ConsensusBridge` ジェネリックなので、StubBridge / InMemoryEvmBridge / RethEvmBridge / LiveRethEvmBridge の 4 種類の bridge が同じ loop で走る** — 多態性の payoff。(c) **`LiveRethEvmBridge` 内部の `chain_spec: Arc<ChainSpec>` が build_payload と validate_payload の両方で参照される共有 source of truth** で、ここが分かれた瞬間に self-fork が発生する。L1 アーキテクトとしての設計判断はすべて、この 1 枚の図のどこかに焼き込まれている。

## 4 つの `ConsensusBridge` メソッド — 全部 live

各行はコース後のメソッドの最終状態:

| メソッド | 最初の impl | Live impl | 今到達する real Reth コード |
| - | - | - | - |
| `build_payload` | L4 (in-memory) | L13 | `HeaderProvider::sealed_header_by_hash`, `ChainSpec::next_block_base_fee` (validator と同じヘルパー) |
| `payload_ready` | L4 (in-memory) | L13 | (Reth call なし — 設計上 bridge の pending map) |
| `validate_payload` | L4 (stub Valid) | L13 | `EthBeaconConsensus::validate_header_against_parent` (4 sub-check: number / timestamp / gas-limit / EIP-1559 base fee) |
| `commit` | L4 (HashMap insert) | L14 | `ConsensusEngineHandle::fork_choice_updated` via in-process Engine API |

Bridge は Reth のストレージ層 (`HeaderProvider`)、Reth の chain config (`ChainSpec`)、Reth の consensus validator (`EthBeaconConsensus`)、Reth の engine actor (`ConsensusEngineHandle`) と会話する。これは CL クライアントが触る Reth の public surface のほとんどに相当する。

## まだ placeholder のもの

このコースは **動く single-validator chain** を ship した。まだないものを正直に call out しておく。以下の各項目は意図的な scope cut であって、偶然ではない:

### 1. Engine `newPayload` 統合

**ステータス**: 欠落。

`commit` は `ForkchoiceUpdated` を送るが、Reth の engine はマッチする block body が無いので `SYNCING` で応答する。`VALID` まで進めるには:

- `build_payload` の出力を、実際の `ExecutionPayload` として (トランザクションリスト付きで、空でも) encode する。
- `fork_choice_updated` 呼び出しの **前に**、`handle.new_payload(payload).await` 経由で送る。
- レスポンスチェーンを合わせる: `newPayload → VALID` → `forkchoice → VALID` → canonical head が advance する。

ブロッカーは、payload に入れる EVM-executable なトランザクションをまだ持っていないことだ。OpenHL の matching engine (CLOB) が生成するのは **約定 (fill)** であって、ユーザーが ECDSA で署名する通常の EVM トランザクションではない。仮にユーザー署名トランザクションとして mempool 経由で流す形にすると、ガスコストと mempool レイテンシが price-time-priority CLOB のパフォーマンスを殺してしまう (HL 系チェーンの存在意義そのものが消える)。代わりに本物の Hyperliquid 型チェーンは、**コンセンサスが合意した約定データを `build_payload` / `newPayload` のタイミングで「protocol-initiated なシステムトランザクション」あるいは「専用 precompile への直接ステートインジェクション」として、ユーザー署名なしで `ExecutionPayload` に差し込む** — `Vec<Fill>` を EVM ステートに反映させるルートをコンセンサス側から開通させる、というアプローチを採る。この「約定 → 特権的な system tx / precompile injection としての payload 編入」を組むのが、本コースの次の大きな作業になる — おそらく openhl build arc の Module 2 全体に相当する作業だ。

### 2. Real `Codec` impl

**ステータス**: real 1 個 (`OpenHlProposalPart` — 空バイト)、stub 7 個 (`CodecStub` error を返す)。

Single-validator モードでは、gossip メッセージ (`SignedConsensusMsg`、`LivenessMsg`、`StreamMessage`)、WAL writes (`ProposedValue`)、peer sync (`Status`、`Request`、`Response`) の codec は **決して fire しない**。2 番目の validator を追加した瞬間、すべての cross-validator メッセージがこれらの stub のいずれかに当たる。

拡張するには、wire format (protobuf、borsh、JSON) を選び、各型の encode/decode を書く。Malachite の `code/crates/test/src/codec/` にある ~400 行の手書き protobuf が canonical な reference になる。

### 3. Multi-validator gossip

**ステータス**: 一度も exercise していない。

`OpenHlNode` はすでに libp2p (`/ip4/127.0.0.1/tcp/0`) を configure している。未テストなのは:
- 2 個の `OpenHlNode` instance が互いを discover すること。
- ネットワーク partition 下での vote propagation。
- Vote-extension exchange。
- 遅れた validator の sync。

Codec stub (#2) が real になり、N=2 の node が共有 chain spec に対して立ち上がれば、multi-validator integration test が次の自然なステップになる。

### 4. 永続 WAL

**ステータス**: エフェメラル tempdir。

すべてのテストが `tempfile::tempdir()` を使うので、MDBX state は各 run の後に消えてしまう。Production には、再起動を生き残る configurable な `home_dir` が必要だ。追加は機械的だが (path を `OpenHlNode::new` 経由で route するだけ)、**crash recovery** の検証 (commit 途中で node を kill し、再起動し、chain head が正しいことを assert する) には、実際の WAL codec impl と、特に chaos-engineering 形式の Test Plan が必要になる。

### 5. Slashing + double-sign detection

**ステータス**: なし。

Production BFT chain は、validator の不正挙動 (同じ高さで異なる block 2 個を sign、同じ round で 2 回 vote) を track する。Malachite は `LivenessMsg` にそのためのフックを持っているが、OpenHL では接続していない。**Slashing 無しの multi-validator chain は testnet には問題ないが、value を扱うネットワークには危険だ。**

### 6. Custom な Hyperliquid 型挙動

**ステータス**: vanilla Ethereum。

「Hyperliquid 型」chain の要点は、Hyperliquid を generic な EVM と区別する precompile と、CLOB 駆動の payload assembly にある。Stage 8 (CLOB matching engine、約定を payload に取り込む処理) と Stage 9 (custom precompile、`clob_place_order` write path) は `psyto/openhl` に住んでいるが、ここではカバーしない。将来コースの自然な Module 2 だ。

## Production-readiness チェックリスト

「テストが pass する」から「real value を任せていい」までの作業:

- [ ] 7 個の Codec stub すべてを real protobuf/borsh/JSON impl で置き換え。
- [ ] `engine_newPayload` 統合で engine が bridge の canonical chain view にマッチするように。
- [ ] N=2+ node 共有 chainspec に対する multi-validator integration test が合格。
- [ ] WAL crash-recovery test (commit 途中で kill、再起動、chain head 検証)。
- [ ] Production デプロイ用に永続 `home_dir` (tempdir ではない) を configure。
- [ ] Engine `SYNCING`/`VALID`/`INVALID` レスポンスを `tracing::warn` / structured field でログ、discard しない。
- [ ] Slashing/double-sign フックを接続して unit test を書く。
- [ ] Key rotation 手順 (chain restart 時の Ed25519 key swap、runtime ではなく)。
- [ ] 運用テレメトリ: round duration、payload build latency、validate failure の Prometheus metric。
- [ ] パフォーマンスベースライン: 連続負荷下の blocks-per-second (smoke test だけではなく)。
- [ ] Canonical encoding format の独立セキュリティレビュー (L7 のバイトレイアウトは **wire spec の一部**)。
- [ ] 部分的ネットワーク partition 下の proposer manipulation の脅威モデル。

このコースのコードを production chain に fork するなら、このリストを long-pole 作業として扱うこと — ほとんどはコース自体より難しい作業だ。

## 14 レッスン前にはできなかった、今できること

- **実際の EL に対してフルな Rust BFT engine を bootstrap できる。** 「mocked EL で」でも「Go への FFI で」でもなく、同じ Rust workspace で `EthereumNode` を実際に走らせられる。
- **producer/validator の自己整合性について推論できる。** 同じ artifact の builder と validator があるときは、source of truth を共有しなければならない。`chain_spec.next_block_base_fee` が `build_payload` と `validate_payload` の両方を駆動するパターンを見た。
- **incremental-stub パターンを適用できる。** Trait bound が surface area を強制してくる。一度に全部埋められないなら、明確な failure mode で stub する。L8 の `CodecStub("SignedConsensusMsg<OpenHlContext>")` がそのモデルだ。
- **2 つの汎用インフラを接続できる。** Reth と Malachite は別のチームが別の sensibility で書いている。Handshake interface (`Node` trait、`ConsensusBridge` trait) がそれらを composable にした。将来コースは別のインフラで同じパターンを使う。
- **プロトコルエラーと運用エラーを区別できる。** `BridgeError::Rejected` と `BridgeError::Internal`、`PayloadStatus::Invalid` と伝播。会話レベルが重要だ。
- **live read が起きたことを証明するテストを書ける。** L12 の `assert_eq!(block.number, 1)` が load-bearing なチェックだった — 他のものだと in-memory fallback がすり抜けてしまう。

## 次に行く先

rethlab 内:
- **Reth Expert** (track `reth-l1-architect`、course 7+) — `BlockExecutor`、state-root verification、MDBX 内部の deep dive。`validate_payload` に実際にトランザクションを実行させたくなったら自然に次に来るコースだ。
- **Reth Consensus Engineering** — slashing、vote extension、fault tolerance を深くカバーする。Multi-validator gossip が動くようになった後に行く場所だ。

rethlab 外:
- **`psyto/openhl` Stages 8-9** — CLOB と custom precompile。Source code は public repo にあるが、walkthrough コースはまだ無い。
- **Malachite spec docs** (`informalsystems/malachite`) — `core-types` crate の doc を読み通す。半分はすでに馴染みがあり、残り半分が multi-validator に必要なものになる。
- **Real Reth full node** — `paradigmxyz/reth` を clone し、`cargo run --bin reth -- node --chain dev` を走らせる。L11 の `EthereumNode::default()` と同じものから consensus 層を引いた形だ。Surface を比較してみる。

## クロージングノート

Consensus と EVM crate を合わせて約 1,400 行の Rust、それに加えて ~250 行の integration test を書いた。そのコードは **動く single-validator な Hyperliquid 型 L1** だ。Production-ready ではないが、そうである必要もない。**手にあるのは、scope について正直で、すべての load-bearing な決定が visible で、次の capability への extensible なインターフェースが 1 つ離れたところにある基盤だ。**

L1 の最も難しい部分は engine を書くことではない — Malachite がほとんどやってくれて、こちらは接続しただけだ。最も難しい部分は、自分のコードに何ができて何ができないかについて正直であること、そして「できる」側を証明するテストを書くことだ。本コースのすべてのレッスンが happy-path の assertion と negative-path の assertion を持っていた。「テストが pass する」から「システムが動く」への鍛錬は、そこにある。

これを使って、何か作りに行こう。
````

---

## Seed ファイルスロット

L15 は新規 Module 7 (Capstone) sortOrder 7 に開く:

```typescript
modules: {
  0: { title: 'Orientation', sortOrder: 0 },
  1: { title: 'Foundations', sortOrder: 1 },
  2: { title: 'Contract types', sortOrder: 2 },
  3: { title: 'EL test double', sortOrder: 3 },
  4: { title: 'CL types', sortOrder: 4 },
  5: { title: 'Engine integration', sortOrder: 5 },
  6: { title: 'Live Reth', sortOrder: 6 },
  7: { title: 'Capstone', sortOrder: 7 },  // 新規
},
```

```typescript
{
  title: 'レッスン 15 — 作ったもの、まだ stub のもの、次に行く先',
  slug: 'openhl-capstone-ja',
  type: 'CONTENT',
  sortOrder: 0,
  duration: 25,
  xpReward: 60,
  content: `# レッスン 15 — 作ったもの、まだ stub のもの、次に行く先\n\n...`
},
```

## SHA pinning 規律

L15 は特定の openhl SHA を cite しない — L1 (`75be9de`) から L14 (`0cac571`) までの旅を要約する。レッスンの主要 artifact は概念的 (system map、production checklist、roadmap) でコードではない。

## 翻訳セルフレビュー (paste 前)

- **「load-bearing」「source of truth」「surface area」** は専門語そのまま。
- **「incremental-stub」「side-effect-after-success」** はそのまま。
- **「victory lap」は意訳せず削除**、代わりに「クロージングノート」だけにした (日本語で violence lap は意味通らないし不要)。
- **「punch list」「long-pole」** は「作業」「long-pole 作業」 — 専門語をカタカナ + 説明で。
- **「chaos engineering」** はそのまま (Netflix 由来の慣用語)。
- **「Hyperliquid-shape」** は英語のまま (Hyperliquid 自体が固有名詞)。
- **タイトル/コードコメントは英語のまま** (OSS 実装にコピーされる前提)。
- **§Closing note の口調** — warm だが overly motivational ではない、技術職人に届くトーンを意識。
