import { PrismaClient } from '@prisma/client';

export async function seedRethValidatorOpsJA(prisma: PrismaClient) {
  const tags = ['reth', 'validator', 'hsm', 'mpc', 'slashing', 'hot-upgrade', 'ops', 'l1', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-validator-ops-ja',
      title: 'Validator 運用 — 鍵、slashing、協調アップグレード',
      description:
        'コンセンサスコードを書くことと本番でコンセンサスを走らせることの間の運用層。Validator 鍵管理 (hot 鍵、HSM、MPC、閾値署名)、slashing 検知と double-signing 防止、協調 hardfork アップグレード。動くコンセンサス実装を、オペレータの stake を失わない本番 L1 に変えるスキル。',
      difficulty: 'ADVANCED',
      duration: 110,
      xpReward: 350,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 340,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Validator 運用',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Validator 鍵管理 — hot 鍵、HSM、MPC、閾値署名',
                  slug: 'validator-keys-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# Validator 鍵管理 — hot 鍵、HSM、MPC、閾値署名

Validator の署名鍵は **経済的アイデンティティ**。鍵を失う → stake を失う。鍵を漏らす → 攻撃者が double-sign 可能 → slashing → stake を失う。鍵を再利用 → 同じ。本レッスンが validator 運用の実現実: 本番チームがどう鍵を安全に保つか、失敗すると何が壊れるか、validator set スケーリングを可能にする暗号プリミティブ。

> 🛑 **スクロール前に予測。** Validator が 100 ノード走らせる。**署名鍵のコピーは何個存在?** 最初の直感が「1 (オリジナル) + 100 (走行中)」なら、それが許す攻撃は?

## 1. Validator 鍵脅威モデル

Validator 鍵が必要:
- リーダ/voter の時にブロック/attestation **署名**
- 同じ height/round で 2 つの違うメッセージに **絶対に署名しない** (slashing)
- 公開インターネットに **絶対に公開しない**
- オペレータ離職を **生き残る** (ops 人複数いる)
- 災害を **生き残る** (ハードウェア障害、データセンタ喪失)

各々が別セキュリティチャレンジ。**単一解決策が全部解かない**。

## 2. 洗練度順 4 解決策

### 2.1 設定ファイルの hot 鍵

\`\`\`bash
# これは危険
echo "0xabc123..." > /var/lib/validator/key.txt
\`\`\`

Pros: シンプル、動く。
Cons: ファイルシステムアクセスある誰でも鍵保持。バックアップ = 鍵のクローン。

**開発で使用、価値ある validator の本番では使用しない**。

### 2.2 HSM (Hardware Security Module)

HSM は **秘密鍵保持し、露出せずに署名する物理デバイス**。AWS CloudHSM、YubiHSM、Thales のような vendor の専用ボックス。

ワークフロー:
1. Validator が HSM 内で鍵生成
2. 公開鍵は露出; 秘密鍵は絶対露出しない
3. 署名するには: validator software が HSM に hash 送る; HSM が署名返す
4. Validator software 侵害されたら、攻撃者は何でも **valid** に署名できるが鍵盗めない

Pros: 鍵がディスクに存在しない、validator プロセスのメモリにも存在しない。
Cons: 単一デバイス; 物理喪失 = 鍵喪失。バックアップが難。

**ETH ステーキングプール向けのプロ validator (Ledger Enterprise、Fireblocks 等) が使用**。

### 2.3 MPC (Multi-Party Computation)

鍵が **複数デバイスに分割**。署名は N-of-M 協力必要。単一デバイスがフル鍵持つことなし。

例: 3 データセンタの 3 デバイス。署名するには、3 中 2 が協力。1 デバイス侵害されても、攻撃者は鍵の 1/3 — 役立たず。2/3 取得には、2 別施設侵害必要。

Pros: 単一デバイスが鍵保持しない。
Cons: 協力要求 = 各署名にレイテンシ。複雑なプロトコル。

**非常に大きなステーキング運用 (Fireblocks、Coinbase Cloud 等) が使用**。

### 2.4 閾値署名 (MPC の暗号バージョン)

MPC と同じ idea だが **閾値署名暗号** 使用。各デバイスが鍵の「share」保持。署名がフル鍵再構築せずに通常見える署名生成。

BLS 閾値署名が Ethereum 系 PoS の標準:
- 各 validator が集約署名鍵の share 持つ
- ブロック署名が部分署名を 1 最終署名に集約
- Verifier は閾値署名と知らない — 標準 BLS sig として見える

Pros: 暗号的にクリーン。「再構築」ステップなし。
Cons: 複雑なセットアップ、鍵生成 ceremony 必要。

**マルチノードセットアップの Ethereum beacon chain validator、Aleo、Filecoin などの chain が使用**。

> 🛑 **理解度チェック。** 「MPC は閾値署名と同じ」**間違い**。違う。違いを述べる。(ヒント: 1 つは任意の署名上のプロトコル、もう 1 つは暗号性質。)

MPC は **汎用プロトコル**、秘密 share 上の関数を露出せず計算 — 任意の関数で動く、署名含む。閾値署名は **特定の暗号プリミティブ**、署名 scheme が secret-sharing をネイティブサポート。閾値 sig はクリーン; MPC はより flexible。

## 3. 「2 鍵」パターン

大半の本番 validator が分離:

- **Withdrawal 鍵** (cold): staked 資金制御。オフライン保持 (紙、ハードウェアウォレット)
- **署名鍵** (hot): 投票/proposing 制御。オンライン保持、slashable

パターン: 署名鍵が侵害されたら、攻撃者は validator を **slash** 可能 (コスト: hot stake) だが **資金は盗めない** (withdrawal 鍵が cold)。損失は有界。

Ethereum 向け:
- Withdrawal credentials (0x01...): cold storage
- Validator 鍵 (BLS): attestation + proposal 用にオンライン

Hyperliquid 向け:
- Validator 署名鍵: オンライン
- 報酬/withdrawal 鍵: cold

## 4. Slashing 防止チェックリスト

保証必要:
1. **アイデンティティごと単一署名者** — 同じ鍵で 2 プロセス絶対走らせない
2. **Slashing-protection データベース** — 各署名メッセージ追跡、slashing 引き起こす何にも署名拒否
3. **不確実時 fail-closed** — 最近履歴検証できないなら署名しない
4. **ネットワーク分断耐性** — 分断後ろで sync 喪失したら署名しない (fork 上の可能性)

reth の \`crates/ethereum/blockchain-tree\` が Ethereum PoS 向け slashing-protection ロジック持つ。カスタム L1 は独自必要 (Cosmos は CometBFT の; Solana は gulp 系 ledger replay)。

> 🛑 **予測。** Validator が redundancy 用に 2 マシンで重複プロセス走らせる。**待っている slashable 違反は?** 失敗シナリオ追跡。

両方のマシンが同じ鍵。両方が同じ epoch の attestation 署名。1 つが canonical。他が **double-signing イベント** としてネットワークに見える。Slashed。Redundancy 試みが slashing 違反になる。

修正: **active-passive** で厳密 failover (1 ノードのみ署名権限、コンセンサスプロトコル経由遷移)。

## 5. リモート signer パターン

本番 validator はしばしば **リモート signer** 使用:

\`\`\`
[Validator ノード] --API 経由ブロック署名-->  [HSM 付きリモート signer]
                                                  |
                                                  +--署名メッセージ追跡
                                                  +--危険な署名拒否
                                                  +--HSM 内の鍵保持
\`\`\`

Validator ノードは絶対鍵持たない。実際の署名する remote signer サービスに接続。Remote signer が slashing-protection 強制 (矛盾する 2 メッセージ署名拒否)。

本番実装:
- **Web3Signer** (Ethereum) — Java ベース remote signer
- **Eth-Signer** — Rust 代替
- **Tetuna** — slashing-protection データベース

Tempo or Hyperliquid 向け: 類似パターン。Validator がコンセンサスノード + remote signer 走らせる; 鍵が HSM 内。

## 6. マルチリージョンデプロイ

データセンタ喪失を生き残る:
- **DC1 のアクティブ validator** (ブロック署名)
- **DC2 のスタンバイ** (引き継ぎ準備)
- **DC3 のコールドバックアップ** (DR)

アクティブとスタンバイの遷移が最も難しい部分。**自動化不可** — 両方同時署名のリスク。通常:

1. アクティブが block N 署名
2. アクティブが block N 伝播 + finalized 確認
3. 手動オペレータが shutdown 確認
4. スタンバイが署名権限取る
5. スタンバイが block N+1 署名

View change 付き BFT chain 向け、コストは miss slot 1 つ。Nakamoto 系 chain 向け、さらに少ない影響。

## 7. Hiro のプロジェクト向け

### Tempo validator 運用

Tempo が分散化して validator になる場合:
- 署名鍵 HSM
- 3 リージョン active-passive セットアップ
- コンセンサスクライアントと統合 slashing-protection データベース
- Withdrawal 鍵を専用ハードウェアウォレット、オフライン

これが任意 L1 validator 役の **launch 運用チェックリスト**。

### Soltempo / mppsol relayer 運用

CCIP、soltempo、mppsol の relayer は独自鍵使用。同じ原則適用:
- コードに鍵公開しない
- 本番に HSM or 類似使用
- 定期的に鍵 rotate
- バックアップ持つ

## 8. 練習

1. 計算: 3 ノードが t=2 で BLS 閾値署名使う、何 compromised ノードまで署名可能? 何で合意なし署名可能になる?
2. [Web3Signer docs](https://docs.web3signer.consensys.net/) — slashing-protection セクション読む
3. 特定: 運用中に新 HSM 移行する slashing リスクは?

## 9. 読み物

- [EIP-2335 (BLS keystore)](https://eips.ethereum.org/EIPS/eip-2335)
- [Web3Signer](https://github.com/Consensys/web3signer)
- [Cosmos validator security](https://hub.cosmos.network/main/validators/security.html)

> 最終チェック: 一文で、なぜ「署名鍵のバックアップ持つ」が機能でなく slashing 脆弱性か? **答えに「重複署名者が slashable equivocation 生成可能」がなければ §4 を再読**。`,
                },
                {
                  title: 'Slashing 検知とオフライン validator',
                  slug: 'validator-slashing-detection-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Slashing 検知とオフライン validator

Validator の最も高価な間違いは **2 矛盾メッセージに署名** — slashable 違反で stake コスト。次に高価なのは **高参加中にオフライン** — inactivity ペナルティ。本レッスンが両方の検知 + 防止について、watcher が slashable 証拠見つけて whistleblower 報酬 earn する方法。

> 🛑 **スクロール前に予測。** Validator が 2 日オフライン。**いくら失う?** 分断中で 1/3 の validator 連れて行かれたら?

## 1. Stake 失う 2 方法

| 方法 | 何 | なぜ |
| :--- | :--- | :--- |
| **積極的不正動作 (slashing)** | 2 矛盾メッセージ署名 | 暗号的に証明可能; 主要ペナルティ |
| **受動的不正動作 (inactivity)** | 全く署名しない | 分断中の侵食的ペナルティ |

両方ともプロトコル強制。両方とも stake 削減。鍵となる違い: slashing は **壊滅的** (1 イベントで stake の大部分/全部失う)、inactivity は **遅い** (時間経過で小額失う)。

Ethereum mainnet 向け (2026 パラメータ概算):
- Slashing: 最小 ~1 ETH、correlated slashing で上昇
- Inactivity leak: finality 問題中 non-participation 日あたり stake の ~0.1%

## 2. Slashable 違反、詳細

### 2.1 Double voting

同じ height で違うブロックの 2 票:

\`\`\`
Vote1: { height: 1000, block: 0xA..., signature: SigA }
Vote2: { height: 1000, block: 0xB..., signature: SigB }
\`\`\`

両方の票が valid で両方が validator V 署名なら、V は slashable。**両署名持つ誰でも slashing proof 構築可能**。

修正: Validator software が **必ず** すべての署名票追跡、同じ height の 2 番目票署名拒否。これが **slashing-protection データベース**。

### 2.2 Surround voting (Casper FFG 特有)

Vote1: source A → target B
Vote2: source C → target D

C > A かつ B > D (2 番目が 1 番目を「surround」) なら slashable。修正: 各 voted source/target ペア追跡; 先 vote surround する票拒否。

### 2.3 BFT (Tendermint、HotStuff) の equivocation

同じ height/round で違うブロックの 2 pre-commit。Double voting と同じロジック; slashing-protection データベースが catch 必要。

## 3. Slashing-protection データベース

すべての本番 validator が走らせる。仕事:

\`\`\`
Height H、round R でメッセージ M 署名前:
  (H, R) で違う内容の先署名メッセージ存在するなら:
    署名拒否  → slashing イベントなし
  そうでなければ:
    M 署名
    M をデータベースに記録
\`\`\`

データベース必要:
- 再起動跨ぎで persist
- ソフトウェア更新生き残る
- バックアップ (fresh データベースが現実遅れない)

一般実装:
- **EIP-3076 フォーマット** — Ethereum 標準
- **CometBFT priv_validator_state.json** — Cosmos chain
- **カスタムファイル** — chain 固有フォーマット

## 4. リモート signer 統合

大半の本番 validator が **slashing-protection も強制** する remote signer 走らせる:

\`\`\`
[Validator ノード]  --署名要求-->  [Remote Signer]
                                            |
                                            +- Slashing-protection DB チェック
                                            +- 安全なら: 署名 + 記録
                                            +- 危険なら: 拒否
\`\`\`

これが **defense in depth** 与える。Validator ノードにバグあっても、remote signer のデータベースが最終チェック。**Validator ノードが double-sign 試みても、remote signer 拒否**。

Web3Signer (Ethereum) がこれ実装。CometBFT validator が独自 variant 持つ。

> 🛑 **理解度チェック。** なぜ slashing-protection DB が **署名者と同じマシン上** 必要か? リモート (ネットワーク呼び出し) でいい? 答えに「atomicity」or「署名中ネットワーク失敗」がなければ §3-4 を再読。

DB と signer は **1 atomic 操作** でコミット必要。署名してから記録試みるがネットワーク失敗したら、記録なしで署名した — 再試行で再度署名可能。Atomicity = 両方成功 or どちらも失敗。ネットワークリモート DB が atomicity 壊す window 加える。

## 5. Whistleblower watcher

Slashing は **暗号的に証明可能** — 2 矛盾署名持つ誰でも slashing transaction 提出可能。大半 chain が slash stake の小数を **whistleblower 報酬** として submitter に支払う。

Ethereum 向け: slashed 額の ~1/512 が proof 提出者に。$1M の主要 slashing で ~$2k — watcher incentivize に十分。

Watcher 実装:
- ブロックチェーンを attestation 用に scan
- (validator、height、round) で index
- 衝突検知
- Slashing tx 提出

Watcher 構築するなら: オープンソース領域、MEV searcher 似だがプロトコルレベル違反向け。

## 6. オフライン validator — inactivity ペナルティ

Validator がオフラインなら:
- 通常運用中: 報酬逃す (日次小損失)
- Finality 問題中 (>1/3 オフライン): **inactivity leak** kicks in

Inactivity leak: 各 epoch、オフライン validator が stake 失う。Finality 遅延長くなるほど率増加。**Chain が self-heal** — 最終的にオンライン validator >2/3、finality 再開、オフライン validator は stake 削減で残る。

これが **BFT 系 chain の大量オフラインイベント応答**。永久 halt せずに、プロトコルがゆっくりオフライン validator を quorum 達成可能まで削除。

## 7. Network 分断リスク

古典的災害:
1. ネットワーク分断が validator set 分裂
2. 各分断が自分は majority と思う可能性
3. 各々が違う fork で署名続行可能
4. 分断 heal 時: 大量クロス fork slashing

Mitigation:
- **Liveness watchdog**: 分断検知 (peer から最近ブロックなし); 署名停止
- **ネットワーク heartbeat**: 署名前に他 validator への接続確認
- **強制 sync**: ネットワーク追いつくまで署名拒否

良く構築された validator が複数チェック持つ。侵害された validator software (これらチェック無効化) は実リスク。

> 🛑 **予測。** Validator が DC1 にいる。DC1 が 30 分インターネット失う。**Validator は署名続行すべきか?** 続けたら失敗モード? 続けなかったら?

続けたら: 分断上にいてネットワークの残りが見ないブロック生成の可能性。ネットワーク最終的に heal、validator の chain が間違ったもの、double-sign 等価 → slashed。

止めたら: 30 分 inactivity (小ペナルティ)。接続復元したら、sync up + 再開。

**停止が正しい**。Slashing リスクより小さい inactivity ペナルティ失う。Validator software が自動で検知 + fail-closed すべき。

## 8. Hiro のプロジェクト向け

### Tempo validator 運用するなら

- 各 validator ノード + remote signer に slashing-protection DB
- 30 分 heartbeat チェック; 接続喪失したら署名拒否
- 2 リージョン active-passive (遷移はコンセンサスプロトコル経由のみ)
- バージョニング付き S3 に日次 DB バックアップ

### Watcher 機会

Tempo に slashing watcher のマーケット可能性 (launch で slashing 仮定)。Watcher 構築は ~数百行 Rust + indexing — 小収入流可能。

## 9. 練習

1. 計算: stake 1000 ETH の validator。Double-vote 経由で 5% slashed。いくら失う?
2. 特定: Validator A が 95% 参加でオンライン、validator B がオフライン。1 ヶ月後、どちらが多 stake?
3. Slashing-protection ロジックの擬似コード書く
4. [Web3Signer slashing protection](https://docs.web3signer.consensys.net/concepts/slashing-protection) 読む

## 10. 読み物

- [EIP-3076 (slashing protection フォーマット)](https://eips.ethereum.org/EIPS/eip-3076)
- [Web3Signer](https://github.com/Consensys/web3signer)
- [Inactivity leak 設計](https://eth2book.info/altair/part2/incentives/inactivity)

> 最終チェック: 一文で、なぜ「不確実なら署名停止」が validator の正しいデフォルトか? **答えに「slashing > inactivity ペナルティ」がなければ §7 を再読**。`,
                },
                {
                  title: 'Hot upgrade と協調 chain アップグレード',
                  slug: 'validator-hot-upgrades-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 16,
                  xpReward: 45,
                  content: `# Hot upgrade と協調 chain アップグレード

固定 validator set 付き L1 が **in place アップグレード** 必要 — コンセンサスルール切替、パラメータ変更、バグ修正 — halt せずに。これが **ブロックチェーンで最も難しい運用問題**、validator が正確に協調必要 — 一部がアップグレードして他がしないなら fork。本レッスンが hot upgrade を動かすプロトコル機構と運用 drill カバー。

> 🛑 **スクロール前に予測。** Ethereum が主要 outage なしで 10+ hardfork 実行。**これを動かすプロトコル機構は?** 「全員が同時にアップグレード」ではない — それは協調不可。何かもっと強いもの。

## 1. コア機構 — height-gate ルール

Hardfork が定義される:
- 新ルールが activate する **block height (or timestamp)**
- **新ルールのセット** (コンセンサス、EVM、gas、等)

Validator は全員同時にアップグレードしない。Activation height **前に** アップグレード。Activation block で、すべてのアップグレード済 validator が新ルール適用。アップグレードしてない validator は古いルールで続行 — **脱落**、ネットワークの残りが reject するブロック生成。

\`\`\`
Block 999: 全 validator (旧 + 新コード) がこのブロック受け入れ
Block 1000: Activation 点
Block 1001: 旧コード validator がこれ reject (新ルール従う);
           新コード validator が受け入れ
\`\`\`

Activation 後、chain が新ルール follow。旧コードは **明示的に invalid**。

## 2. Activation 条件

Activation 典型的に:

| タイプ | ユースケース | リスク |
| :--- | :--- | :--- |
| **Block height** | 決定論的 activation | 容易; PoW + PoS で動く |
| **Timestamp** | 壁時計 activation | 精度低; プロトコルが drift |
| **Difficulty** (PoW) | 歴史的 Ethereum | 時代遅れ |
| **Total difficulty** | Ethereum Merge 遷移 | 1 回限り使用 |

現代 PoS chain は human-readability に **timestamp**、精度に **block height** 使用。Casper FFG は **epoch 境界** 使用。

Tempo or Hyperliquid 向け: timestamp ベース activation。「Unix timestamp X で、fork Y に切替」。

## 3. アップグレード協調プロトコル

オペレータ必要:
1. **アップグレード発表受け取る** (Github issue、Discord、等)
2. **新バイナリダウンロード + 検証**
3. **全 validator ノードに deploy** activation 前
4. **deploy 正しいか検証**
5. **Activation block 待つ** — 新ルール自動適用

任意の validator がステップ 3 逃したら、activation で **chain から脱落**。アップグレードして sync back することで再 join 可能。

Ethereum 向け: これがまさに Merge、Shanghai、Cancun、Pectra activation の動作。Validator はアップグレード 1-2 週警告。

> 🛑 **理解度チェック。** 「99% の validator がアップグレード、1% がしない、chain fork」**Yes だが…** 1% に何が起こる? 戻る? 回復シナリオ追跡。

1% が旧ルールで「stale fork」生成。99% が新ルール canonical chain follow。99% 視点では、1% は単純にオフライン (彼らのブロック reject)。回復:
1. オペレータが「validator が rejected ブロック生成」と気づく
2. バイナリアップグレード
3. Validator が canonical chain に sync (peer からブロック取得)
4. Canonical chain で署名再開

Slashing リスクなし (canonical 上で double-sign せず別 fork 上にいた)。Inactivity ペナルティだけ。

## 4. アップグレードは chain spec に

Reth ベース chain 向け、アップグレードは **chain spec** にエンコード。Course 1 (Consensus Engineering) の Lesson 5 から:

\`\`\`rust
pub enum CustomHardfork {
    Bedrock,
    Canyon,
    Ecotone,
    // ...
}

impl CustomHardfork {
    pub fn activation_block_number(&self, chain: &CustomChain) -> Option<u64> {
        match (self, chain) {
            (Self::Bedrock, CustomChain::Mainnet) => Some(105_235_063),
            (Self::Canyon, CustomChain::Mainnet) => Some(125_000_000),
            // ...
        }
    }
}
\`\`\`

Chain spec が新バイナリバージョンに ship される時、そのバージョンにアップグレードする validator が新 activation テーブル取得。Activation block で、新ルール kicks in。

**Chain spec がアップグレード**。

## 5. Pre-fork dry run

本番 chain は **testnet 先に** アップグレード走らせる:
- Mainnet activation を 2-3 週後に hold
- Testnet で同じ fork 走らせる
- 全部動くか検証
- 問題見つかれば、mainnet 遅延

これが致命的になるバグ catch。Ethereum の Pectra fork 遅延 (2 回) は dry run 中に catch された testnet 問題のため。

Tempo 向け: まさにこれ用に Tempo Moderato (testnet) likely。Fork シーケンスが Moderato → Mainnet、間に週単位。

## 6. Hot software 更新 (vs hot fork)

2 つの違うもの:

- **Hot fork** = コンセンサスルールアップグレード。これがこれまで議論。
- **Hot software 更新** = 再起動なしで validator ソフトウェアアップグレード。これは運用的。

Hot software 更新向け:
- Validator software が新バージョンで再起動
- 再起動中はオフライン (小 inactivity ペナルティ)
- 新バージョンが先 chain 状態から続行

大半 chain が **短い再起動は OK** 受け入れ。Slashing-protection データベースが再起動生き残る、double-sign リスクなし。

一部高度セットアップは:
- **Active-passive failover** — passive ノード先に再起動、署名権限遷移、active ノード再起動
- **Live コードパッチ** — 極稀; downtime 許容できない性能修正のみ

## 7. 緊急対応プレイブック

バグが **deploy 後** 発見されたら?

| 重大度 | 応答 |
| :--- | :--- |
| **Stale ブロック** | 待つ — peer 戻ったら chain self-heal |
| **不正 state 生成バグ** | 協調 rollback (validator が chain セグメント abandon 合意) |
| **資金盗バグ** | 機能無効化緊急 hardfork |
| **コンセンサス halt** | 協調リセット (稀; 主要イベント) |

2016 DAO incident が盗まれた資金回復のための協調 hardfork。2024 Polkadot incident (validator 不正動作) が協調 rollback。各々 ~24 時間応答サイクル。

Tempo 向け: 最終的に incident 出る。Validator set + ガバナンスが launch 前に文書化プレイブック持つ必要。

## 8. 「Halt と recover」パターン

純粋 BFT chain 向け (Tempo、Hyperliquid):
- >1/3 validator オフラインなら、chain halt (BFT 性質)
- オペレータが validator オンライン戻す
- Chain がブロック生成再開

Ethereum と比較 (inactivity leak で回復): BFT chain がクリーン halt-and-recover。**Halt は許容可能** chain が fork しない、safety 失わない、停止するだけだから。

Tempo 向け: 大 incident 中の **outage は design**。Fork より halt の方が良い。

## 9. 練習

1. [Ethereum の Pectra アップグレード発表](https://eips.ethereum.org/EIPS/eip-7600) 読む
2. 特定: EIP に activation ロジックの何?
3. スケッチ: L1 アップグレード用 validator セットアップ。Deploy シーケンス?
4. 特定: どんな状況で fork activation 遅延?

## 10. 読み物

- [Ethereum hardfork リスト](https://ethereum.org/en/history/) — fork がどう協調されたか
- [Ethereum execution-apis EngineAPI](https://github.com/ethereum/execution-apis) — EL/CL が fork activation どう協調
- [Cosmos chain upgrade docs](https://docs.cosmos.network/v0.50/learn/advanced/upgrade)

> 最終チェック: 一文で、なぜ「全 validator が正確に同時アップグレード」が hardfork の間違ったメンタルモデルか? **答えに「chain spec の height-gate ルール」がなければ §1-2 を再読**。`,
                },
                {
                  title: 'ファイナルクイズ: Validator 運用',
                  slug: 'validator-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# ファイナルクイズ: Validator 運用

Validator ops 最終チェック。任意 validator 運用、L1 経済設計、本番 chain 失敗理由理解に必要。`,
                  quizQuestions: [
                    {
                      question: 'なぜ validator 鍵向け **MPC (Multi-Party Computation)** が **N ホスト跨ぎで鍵分散** と構造的に違うか?',
                      options: [
                        "MPC のほうが速い。",
                        "MPC は **単一デバイスが絶対フル鍵持たない** 保証 — 各々が share 保持、署名は N-of-M 協力必要、1 デバイス攻撃は攻撃者に役立たず fraction 与える。N ホスト跨ぎ鍵分散は N ホスト各々がフル鍵持つ (or 再構築可能 piece) — 1 つ攻撃が壊滅的。",
                        'MPC は EIP-2335 で要求。',
                        "MPC がストレージ少消費。",
                      ],
                      correctIndex: 1,
                      explanation: "MPC が暗号的に署名中に鍵再構築しない保証。分散鍵 (粗悪設計) は複数ホストにフル鍵漏らす。MPC が単一信頼点なしに genuinely validator 鍵セキュリティスケールする数少ない方法の 1 つ。",
                    },
                    {
                      question: 'なぜ **2 マシンで重複 validator** 走らせると typically redundancy ではなく **slashing** になるか?',
                      options: [
                        'Slashing は validator セットアップ無関係。',
                        '両マシンが同じ鍵。両方が同じ height/round で attestation 署名。両署名が valid。ネットワークが同じアイデンティティから 2 矛盾署名見る — **slashable equivocation**。Redundancy 試みが slashing 違反になる。',
                        '2 マシンセットアップは Ethereum spec で禁止。',
                        "重複 validator が帯域消費しすぎ。",
                      ],
                      correctIndex: 1,
                      explanation: 'これが古典的「慎重にやろうとして slashed」結果。修正は厳密 failover 付き active-passive (1 ノードのみ常に署名権限、コンセンサスプロトコル経由遷移)。さらに良い: 鍵保有者がプロトコルレベルで single-signing 強制する remote signer アーキテクチャ。',
                    },
                    {
                      question: 'なぜ **slashing-protection データベース** が **署名者と同じマシン** 上必要?',
                      options: [
                        'レイテンシ理由のみ。',
                        "DB write と署名操作が **atomic** でなければならない — 両方成功 or 両方失敗。ネットワークリモート DB が window 導入、署名後 DB 更新失敗 (e.g., ネットワーク不調)、再試行で再度署名可能。Atomicity が再試行時 double-sign 防ぐのに必要。",
                        '特に EIP-3076 で要求。',
                        "ネットワーク呼び出しが遅すぎ。",
                      ],
                      correctIndex: 1,
                      explanation: 'Atomic 操作要件。1 プロセスのローカル DB + signer = atomic。リモート DB = レースコンディション。「atomic」保証が slashing-protection 全セキュリティモデル。',
                    },
                    {
                      question: 'Validator がネットワーク分断中オフライン。**分断 heal 時に署名続行すべきか?**',
                      options: [
                        'Yes、即座に署名再開。',
                        "**No、分断中署名停止**。続行したら、fork 上の可能性、ネットワークの残りが見ないブロック生成。ネットワーク heal 時、validator の chain が間違い → canonical chain と equivocate → slashed。Inactivity ペナルティ (小) 失う方が slashing ペナルティ (大) より良い。",
                        "オペレータが言ったら署名停止のみ。",
                        '分断中署名不可能。',
                      ],
                      correctIndex: 1,
                      explanation: 'Stop-signing が正しいデフォルト。Inactivity ペナルティ tiny; slashing ペナルティ大。Validator が「分断上にいる可能性」検知して >2/3 の peer 接続検証できるまで署名拒否。これが「不確実時 fail-closed」 — コア safety 性質。',
                    },
                    {
                      question: '協調 hardfork で、**なぜ validator 全員同時にアップグレードしない**? 正しい瞬間に新ルール切替保証するものは?',
                      options: [
                        'Hardfork はチャットルーム経由手動協調必要。',
                        'Chain spec が **activation block height (or timestamp)** エンコード: そのブロックで新ルール適用。Validator は activation *前* にアップグレード — 早 or 遅可能。Activation block で、新ルールがコンセンサス強制。アップグレードしてない validator が旧ルール続行で fork 脱落; アップグレード + sync で再 join 可能。',
                        'Fork は runtime に過半数投票でトリガー。',
                        'Ethereum のみ hardfork サポート。',
                      ],
                      correctIndex: 1,
                      explanation: 'Height-gate ルールが魔法。オペレータが個別にアップグレードするのに数週間。Activation block で、全員が同じルール — してない者が脱落。回復が直接 (アップグレード + sync)。これがすべての主要 chain がアップグレード協調する方法。',
                    },
                    {
                      question: 'なぜ **withdrawal 鍵** が cold で **署名鍵** がオンラインか?',
                      options: [
                        "全鍵に cold storage 必須。",
                        "関心事の分離。署名鍵は attestation/proposal にオンライン必要 (漏洩で slashable → 最悪 hot stake 失う)。Withdrawal 鍵が実 staked 資金制御 — cold 保持で署名鍵侵害されても、攻撃者が資金動かせない。",
                        'Withdrawal 鍵が EIP-2335 で cold 必須。',
                        "Hot 鍵が withdrawal に使用不可。",
                      ],
                      correctIndex: 1,
                      explanation: 'Defense in depth。署名鍵漏洩最悪ケース: validator が slashed。Withdrawal credential が cold なので full staked balance は安全。これが真剣な validator セットアップの標準; なしだと鍵漏洩は壊滅的。',
                    },
                    {
                      question: 'PoS chain の **whistleblower 報酬** は何で、何を可能にするか?',
                      options: [
                        "全 validator への固定日次支払い。",
                        "誰かが slashing proof (2 矛盾署名) 提出する時、slashed stake の小数 (typically ~1/512) もらう。これが **独立 watcher** が chain monitor + slashing proof 提出する経済的 incentive 作る — 全員する必要なくプロトコル強制。Permissionless 強制。",
                        '完璧 uptime 維持 validator にボーナス支払い。',
                        '遅 attestation のペナルティ。',
                      ],
                      correctIndex: 1,
                      explanation: 'Whistleblower 報酬が slashing 検知を経済ゲームに変える。Double-sign 見つけて誰でも利益。プロトコル integrity が中央当事者依存しない — watch する誰でも強制可能。Permissionless 分散化に critical。',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  });
}
