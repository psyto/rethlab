import { PrismaClient } from '@prisma/client';

export async function seedRethValidatorOpsV3JA(prisma: PrismaClient) {
  const tags = ['reth', 'validator', 'hsm', 'mpc', 'slashing', 'hot-upgrade', 'ops', 'l1', 'advanced'];

  await prisma.course.create({
    data: {
      slug: 'reth-validator-ops-v3-ja',
      title: 'Validator 運用 — 鍵、slashing、協調アップグレード',
      description:
        'コンセンサスのコードを書くことと、本番でコンセンサスを動かし続けることの間にある運用層を扱う。Validator の鍵管理 (hot 鍵、HSM、MPC、閾値署名)、slashing 検知と double-signing の防止、協調 hardfork アップグレードまで。動くコンセンサス実装を、オペレータが stake を失わずに済む本番 L1 に変えるためのスキル。',
      difficulty: 'ADVANCED',
      duration: 110,
      xpReward: 350,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 1340,
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
                  title: 'レッスン0 — Validator 鍵管理（hot 鍵、HSM、MPC、閾値署名）',
                  slug: 'validator-keys-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 18,
                  xpReward: 45,
                  content: `# レッスン0 — Validator 鍵管理（hot 鍵、HSM、MPC、閾値署名）

## 問い

ステーキングオペレータが午前 3 時にページを受け取る。スタンバイ機で 2 つ目の validator プロセスが誤って起動 — 同じ鍵、両方オンライン、両方が同じ height で attestation 署名。ネットワークは同一アイデンティティから 2 つの valid な署名を観測 — **equivocation** = $2M ペナルティ。**Validator の署名鍵 = 経済的アイデンティティ、本番チームはどう守るか？**

## 原理（最小モデル）

- **5 要件は単一解で満たせない.** 署名できる + 同 height/round で絶対に 2 署名しない + 公開インターネット非露出 + オペレータ離職を乗り越える + 災害（HW 障害 / DC 喪失）を乗り越える。
- **4 つの解（洗練度順）.** 設定ファイル hot 鍵（開発のみ）→ HSM（耐タンパー HW + 鍵が外に出ない）→ MPC（N-of-M デバイスで分割）→ 閾値署名（BLS、暗号的に share、再構築不要）。
- **MPC ≠ 閾値署名.** MPC = 汎用プロトコル（任意関数を秘密 share で計算）/ 閾値署名 = 特定の暗号プリミティブ（署名 scheme 自体が secret-sharing をネイティブ対応）。
- **「2 鍵」パターン.** Withdrawal 鍵（cold、stake 資金支配）+ 署名鍵（hot、投票 / 提案 / slashable）。**漏洩時の被害有界化**：署名鍵漏洩でも資金は盗まれない（slashable のみ）。
- **Slashing 防止 4 ルール.** アイデンティティごと署名者 1 つだけ + slashing-protection DB + 不確実なら fail-closed + ネットワーク分断耐性。
- **リモート signer パターン.** Validator ノードは鍵なし → remote signer に署名要求 → HSM で署名 + slashing-protection 強制。Web3Signer / Eth-Signer / Tetuna が本番例。
- **マルチリージョン active-passive.** DC1 active + DC2 standby + DC3 cold backup。**遷移は手動 + コンセンサス経由のみ**（両方同時署名で slash 防止）。

## 具体例

5 要件:

- リーダ / voter のときに署名できる
- 同 height/round で絶対に 2 署名しない（slashing）
- 公開インターネット非露出
- オペレータ離職を乗り越える（複数 ops 担当）
- 災害を乗り越える（HW 障害、DC 喪失）

4 つの解:

**1. 設定ファイル hot 鍵** — 危険な例:

\`\`\`bash
# これは危険
echo "0xabc123..." > /var/lib/validator/key.txt
\`\`\`

開発 OK、価値のある本番では使わない（FS アクセス = 鍵掌握、バックアップ = クローン）。

**2. HSM（Hardware Security Module）** — 耐タンパー HW、鍵が外に出ない:
- Validator が HSM 内で鍵生成
- 公開鍵だけ外に出る、秘密鍵はデバイスから出ない
- 署名は validator software が hash を送る → HSM が署名を返す
- Validator software 侵害でも鍵そのものは盗めない（任意メッセージへの valid 署名は作らせられる）
- **Pros**: 鍵がディスク・メモリにない / **Cons**: 物理喪失で鍵消失、バックアップ難
- AWS CloudHSM / YubiHSM / Thales、ETH ステーキングプロ向け

**3. MPC（Multi-Party Computation）** — 鍵を複数デバイスに分割、N-of-M 協力で署名:
- 例: 3 DC × 3 デバイス、署名に 2/3 協力必要
- 1 デバイス侵害でも鍵の 1/3 のみ取得 → 攻撃 2 施設侵害必要
- **Pros**: どのデバイスも単独で鍵を持たない / **Cons**: 署名にレイテンシ、プロトコル複雑
- Fireblocks / Coinbase Cloud などの極大規模ステーキング

**4. 閾値署名（MPC の暗号版）** — BLS 閾値署名:
- 各 validator が集約署名鍵の share
- 部分署名を 1 つの最終署名に集約
- Verifier 側からは通常の BLS 署名と区別不能
- **Pros**: 暗号的にクリーン、再構築ステップなし / **Cons**: セットアップ複雑、鍵生成 ceremony 必要
- Ethereum beacon chain / Aleo / Filecoin

「2 鍵」パターン:

| 鍵 | モデル | 役割 |
| :--- | :--- | :--- |
| Withdrawal 鍵 | cold（オフライン保管） | staked 資金支配、紙 / HW wallet |
| 署名鍵 | hot（オンライン） | 投票 / 提案、slashable |

**署名鍵漏洩 → slash されるが資金は盗まれない**（withdrawal 鍵が cold）。Ethereum: Withdrawal credentials (0x01...) cold + BLS validator 鍵 attestation 用 online。

Slashing 防止 4 ルール:

1. **アイデンティティごとに署名者 1 つだけ** — 同鍵で 2 プロセス絶対動かさない
2. **Slashing-protection データベース** — 全署名済みメッセージを記録、slashing 起こす署名を拒否
3. **不確実なら fail-closed** — 直近履歴を検証できないなら署名しない
4. **ネットワーク分断耐性** — 分断の向こうで sync を失っているなら署名しない（fork 上の可能性）

リモート signer パターン:

\`\`\`
[Validator ノード] --API 経由ブロック署名-->  [HSM 付きリモート signer]
                                                  |
                                                  +--署名メッセージを追跡
                                                  +--危険な署名は拒否
                                                  +--HSM 内に鍵を保持
\`\`\`

本番実装:
- **Web3Signer**（Ethereum、Java）
- **Eth-Signer**（Rust 代替）
- **Tetuna**（slashing-protection データベース）

マルチリージョン構成:
- DC1 active（ブロック署名）
- DC2 standby（引き継ぎ準備）
- DC3 cold backup（DR）

遷移は **自動化禁止**（両方同時署名リスク）→ 手動オペレータ確認 + コンセンサスプロトコル経由のみ。
1. Active が block N に署名
2. Active が伝播 + finalized 確認
3. 手動オペレータが shutdown 確認
4. Standby が署名権限引き取り
5. Standby が block N+1 に署名

BFT chain なら 1 slot miss、Nakamoto 系なら更に影響小。

## 失敗例（誤解）

「バックアップ用に複数マシンに鍵をコピー」— **間違い**。**バックアップ = 鍵のクローン = 並行プロセスのリスク**。両マシン同時起動で双方が同 height 署名 → equivocation → slash。バックアップは **withdrawal 鍵のみ**（cold）、署名鍵はマルチ active-passive で手動遷移。

「MPC と閾値署名は同じ」— **間違い**。**MPC は汎用プロトコル**（秘密 share 上で任意関数計算、署名も含む）/ **閾値署名は特定暗号プリミティブ**（署名 scheme 自体が secret-sharing をネイティブ対応）。閾値署名がクリーン、MPC が柔軟。

「冗長化のため 2 マシンで重複プロセス」— **致命的**。両マシンで同鍵 → 両方が同 epoch attestation 署名 → 一方 canonical、もう一方 double-signing → slashed。冗長化のつもりが slashing 違反 → **active-passive 厳格 failover**（常に 1 ノードのみ署名権限、コンセンサス経由遷移）。

> 🛑 **予測。** ある validator が 100 ノードを稼働。署名鍵のコピーは何個存在するか？「1 + 100」と思ったなら、その状態が許す攻撃は何か？（答え: 「1 + 100」= **危険な実装**。各 100 ノード上の鍵コピーは ① ファイルシステム侵害で 1 ノード分の鍵取得可能、② どこか 1 ノードでも誤動作で同 height 2 署名 → 全 100 が equivocation で slashed、③ 鍵ローテーション時に全 100 を一斉更新が必要 = 同期失敗で部分的に古鍵残る → 攻撃面拡大。**正しい設計** = ① HSM で鍵が物理デバイスから出ない（1 個のみ）+ ② リモート signer サービスを共有（100 ノードが 1 signer に署名要求）+ ③ active-passive で 1 時点 1 ノードのみ署名権限。「鍵コピー」は本番運用の anti-pattern。）

## ステップで組み立てる

### Step 1: 5 要件を即答

署名可能 + 同 height/round で 2 署名しない + 公開非露出 + 離職耐性 + 災害耐性。

### Step 2: 4 解の洗練度順

設定ファイル（開発のみ）→ HSM（鍵が外に出ない）→ MPC（分割）→ 閾値署名（BLS、暗号的）。

### Step 3: MPC vs 閾値署名

MPC = 汎用プロトコル / 閾値署名 = 特定暗号プリミティブ。

### Step 4: 2 鍵パターン

Withdrawal（cold、資金）+ 署名（hot、slashable）。漏洩時の被害有界化。

### Step 5: Slashing 防止 4 ルール

1 アイデンティティ 1 署名者 + slashing-protection DB + fail-closed + 分断耐性。

### Step 6: リモート signer + マルチリージョン

Validator は鍵なし、remote signer に API 経由要求 + HSM 保管 + slashing-protection 強制。Active-passive で手動 + コンセンサス遷移。

### Step 7: 自分の chain への適用

Tempo / Hyperliquid validator のローンチ運用チェックリスト:
- 署名鍵 HSM
- 3 リージョン active-passive
- slashing-protection DB 統合
- Withdrawal 鍵は専用 HW wallet オフライン

## 答え合わせ

- **「鍵コピー」が anti-pattern の理由**: ① 攻撃面 N 倍化（各コピー = 侵害ターゲット）、② 並行プロセスで equivocation リスク（1 個誤動作で全コピー slashed）、③ ローテーション困難（同期失敗で旧鍵残る）。**正解 = HSM 1 物理 + リモート signer + active-passive**（1 時点 1 ノードのみ署名権限）。
- **MPC と閾値署名の本質的違い**: **MPC** = 「汎用プロトコル」、秘密 share 上で任意関数を露出させず計算（署名も含む）→ 任意の署名 scheme に適用可能。**閾値署名** = 「特定の暗号プリミティブ」、署名 scheme 自体が secret-sharing をネイティブサポート → 部分署名を集約しても通常の BLS 署名と区別不能。閾値署名がクリーン（再構築なし）、MPC が柔軟（既存署名 scheme に適用）。
- **「冗長化のための 2 マシン重複」の slashing**: 両マシン同鍵 → 両方が同 epoch attestation 署名 → 一方 canonical、もう一方 double-signing として見える → slashed。**冗長化が slashing 違反に化ける**。修正 = active-passive 厳格 failover（1 時点 1 ノードのみ署名権限、遷移はコンセンサス経由のみ）。

## 合格基準

- 5 要件と 4 解（洗練度順）を即答できる。
- MPC ≠ 閾値署名の違いを 1 文で説明できる。
- 2 鍵パターン（Withdrawal cold + 署名 hot）と漏洩時被害有界化を言える。
- Slashing 防止 4 ルールを暗唱できる。
- リモート signer + active-passive 構成を絵で書ける。

## まとめ（3行）

- Validator 署名鍵 = 経済的アイデンティティ、5 要件は単一解で満たせない、4 解（設定ファイル → HSM → MPC → 閾値署名）を洗練度順に選ぶ。
- 「2 鍵」パターン（Withdrawal cold + 署名 hot）で漏洩時被害有界化、Slashing 防止 4 ルール（1 署名者 + DB + fail-closed + 分断耐性）。
- リモート signer + HSM + マルチリージョン active-passive（手動 + コンセンサス遷移）= 本番 validator の標準解、「鍵コピー」は anti-pattern。
`,
                },
                {
                  title: 'レッスン1 — Slashing 検知とオフライン validator',
                  slug: 'validator-slashing-detection-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# レッスン1 — Slashing 検知とオフライン validator

## 問い

Validator が stake を失う方法は厳密に 2 通り。高くつくほう: **矛盾する 2 メッセージに署名**（slashing、1 回で stake の大部分消失）。じわじわ来るほう: **ネットワークが必要とするときにオフライン**（inactivity ペナルティ、数日で少しずつ削られる）。**運用判断はこの 2 損失の小さい方を選ぶことに帰着 — どの判断軸か？**

## 原理（最小モデル）

- **Stake を失う 2 経路.** 能動的（slashing、暗号的に証明可能、壊滅的）+ 受動的（inactivity、緩やか、時間と共に少額）。
- **3 種の slashable 違反.** Double voting（同 height で別ブロック）+ Surround voting（Casper FFG、後の票が前の票を包含）+ BFT equivocation（同 height/round で別 pre-commit）。
- **Slashing-protection DB が標準.** 署名前に (H, R) で異なる署名済みメッセージをチェック → 存在すれば拒否 → 存在しなければ署名 + 記録。
- **DB は永続化 + 再起動耐性 + ソフト更新耐性 + バックアップ要.**
- **DB と署名は atomic 操作.** ネットワーク越しリモート DB は atomicity が崩れる窓を作る → 同マシン上必須。
- **リモート signer + DB で defense in depth.** Validator ノード bug でも remote signer DB が最後の砦。
- **Whistleblower 報酬.** Ethereum で slashed の ~1/512、$1M slashing で ~$2k = watcher を経済的に動機づけ。
- **Inactivity leak.** >1/3 オフラインで finality 問題発生 → 1 epoch ごとオフライン stake を削る → chain が >2/3 オンラインに自己回復。
- **ネットワーク分断時は fail-closed が正解.** 続けて slashing リスク vs 停止して小さな inactivity → 停止が常に正解。

## 具体例

Stake を失う 2 経路:

| 経路 | 何が起きるか | なぜ |
| :--- | :--- | :--- |
| 能動的（slashing） | 矛盾する 2 メッセージに署名 | 暗号的に証明可能、主要ペナルティ |
| 受動的（inactivity） | まったく署名しない | 分断中にじわじわ削られる |

Ethereum 2026 概算:
- Slashing: 最小 ~1 ETH、correlated slashing で増加
- Inactivity leak: 非参加 1 日 ~0.1% / stake

3 種の slashable 違反:

**Double voting**:

\`\`\`
Vote1: { height: 1000, block: 0xA..., signature: SigA }
Vote2: { height: 1000, block: 0xB..., signature: SigB }
\`\`\`

両 valid + V 署名 → V slashable。両署名を持つ者なら誰でも slashing proof 構築可能。

**Surround voting**（Casper FFG）:
- Vote1: source A → target B
- Vote2: source C → target D
- C < A AND D > B → 2 つ目が 1 つ目を「surround」→ slashable

**BFT equivocation**（Tendermint、HotStuff）:
- 同 height/round で別ブロックに 2 つの pre-commit
- Logic は double voting と同、slashing-protection DB で捕捉

Slashing-protection DB ロジック:

\`\`\`
Height H、round R でメッセージ M に署名する前に:
  (H, R) で内容の異なる署名済みメッセージが既に存在するなら:
    署名を拒否する  → slashing イベントを起こさない
  そうでなければ:
    M に署名する
    M をデータベースに記録する
\`\`\`

DB 要件:
- 再起動を跨いで永続化
- ソフトウェア更新を生き延びる
- バックアップを取る（新規 DB だと現実に追いつかない）

代表実装:
- **EIP-3076 フォーマット**（Ethereum 標準）
- **CometBFT priv_validator_state.json**（Cosmos）
- **カスタムファイル**（chain 固有）

リモート signer + DB:

\`\`\`
[Validator ノード]  --署名要求-->  [Remote Signer]
                                            |
                                            +- Slashing-protection DB をチェック
                                            +- 安全なら: 署名して記録
                                            +- 危険なら: 拒否
\`\`\`

**Defense in depth**: Validator ノードが double-sign を試みても remote signer DB が拒否。

Whistleblower watcher:

- ブロックチェーン走査 → attestation 収集
- (validator, height, round) でインデックス
- 衝突検知 → slashing tx 提出
- 報酬獲得（Ethereum で ~1/512）

Inactivity leak の動作:

- 通常運用中: 報酬取り逃し（日次小損失）
- Finality 問題（>1/3 オフライン）: inactivity leak 発動
- epoch ごとオフライン validator が stake 失う、finality 遅延長いほど率上昇
- Chain は自己回復: 最終的にオンライン >2/3 回復 → finality 再開 → オフライン validator が削減後で残る

ネットワーク分断シナリオ:

1. 分断で validator set が二分
2. 各分断が自分を majority と誤認の可能性
3. 各々が別 fork で署名継続
4. 分断解消で fork 跨ぐ大規模 slashing

緩和策:
- **Liveness watchdog**: 分断検知（peer から最近ブロックなし）→ 署名停止
- **ネットワーク heartbeat**: 署名前に他 validator 接続性確認
- **強制 sync**: ネットワーク追いつくまで署名拒否

## 失敗例（誤解）

「リモート DB（ネットワーク経由）で slashing-protection」— **間違い**。DB 書き込みと署名は **atomic 操作**。ネットワーク失敗 → 署名だけ記録なしで残る → 再試行で同 height に再署名 → slashed。**同マシン上必須**。

「冗長化バックアップ DB のメリット」— **半分間違い**。バックアップは持つべきだが **アクティブ DB はそのまま使う**（新規 DB だと現実に追いつかない、過去署名を知らない）。バックアップは復旧時の **最後の手段**。

「Slashing は技術的問題、経済層は別」— **間違い**。Slashing 自体が **経済的セキュリティ**。検知メカニズムは暗号、執行は経済。Whistleblower 報酬で検知の経済的インセンティブも組み込まれる。

> 🛑 **予測。** Validator が DC1 にある。DC1 がインターネット接続を 30 分失った。署名を続けるべきか？ 続けた場合と止めた場合の失敗モードは？（答え: **止めるべき**。続けた場合 = 自分が分断側にいて、ネットワークの残りが目にしないブロックを生成しうる → 回復時に自 chain が間違いと判明 → double-sign 等価で slashed → 数百万 ETH 損失。止めた場合 = 30 分の inactivity ペナルティ（小さい）+ 接続戻ったら sync 再開可能。**slashing > inactivity** が常に成立、「不確実なら fail-closed」が validator の正しいデフォルト。Validator software は自動で検知して停止すべき。）

## ステップで組み立てる

### Step 1: Stake を失う 2 経路

能動的（slashing、壊滅的）+ 受動的（inactivity、緩やか）。

### Step 2: 3 種 slashable 違反

Double voting / Surround voting（Casper FFG）/ BFT equivocation。

### Step 3: Slashing-protection DB の擬似コード

(H, R) で既存メッセージチェック → 同 height/round で異なるなら拒否、なければ署名 + 記録。

### Step 4: DB の atomicity 要件

DB 書き込みと署名は単一 atomic 操作 → 同マシン上必須、リモート不可。

### Step 5: リモート signer + DB の defense in depth

Validator ノード bug でも remote signer DB が最後の砦。

### Step 6: Whistleblower 報酬の経済設計

slashed の ~1/512 → watcher を経済的に動機づけ、市場が形成。

### Step 7: ネットワーク分断時の fail-closed

「不確実なら署名停止」= slashing > inactivity が常に成立。

## 答え合わせ

- **DB と署名の atomicity 必要性**: 署名してから記録の順なら → ネットワーク失敗で記録なし → 再試行で同 height に再署名 → slashing。「両方成功するか両方失敗するか」しかない atomic 操作必要。ネットワーク越しの DB は atomicity 窓を作る → 同マシン上必須。
- **Inactivity leak の自己回復メカニズム**: >1/3 オフラインで finality 問題 → epoch ごとオフライン stake を削る（finality 遅延長いほど率上昇）→ 最終的にオンライン >2/3 回復（オフラインが削られて active 比率上昇 / オフラインが復旧）→ finality 再開 → オフライン validator が stake 削減後で残る。**chain は永久 halt せず緩やかに回復**。
- **「不確実なら停止」が正しい理由**: slashing ペナルティ（壊滅的、~1 ETH 最小～数 ETH）vs inactivity ペナルティ（日 0.1% / stake、30 分なら ~0.002%）→ **オーダー桁違い**。続けて slashing リスク vs 停止して inactivity → 期待値で停止が圧倒的。Validator software は自動 fail-closed すべき。

## 合格基準

- Stake を失う 2 経路を即答できる。
- 3 種 slashable 違反を例で言える。
- Slashing-protection DB の擬似コードを書ける。
- DB と署名の atomicity 必要性を 1 文で説明できる。
- Inactivity leak の自己回復を 4 段で辿れる。

## まとめ（3行）

- Stake を失う 2 経路（slashing 壊滅的 / inactivity 緩やか）、3 種 slashable 違反（double voting / surround voting / BFT equivocation）、slashing-protection DB が標準防御。
- DB と署名は atomic 操作（同マシン上必須）、リモート signer + DB で defense in depth、whistleblower 報酬（~1/512）で検知市場形成。
- Inactivity leak が >1/3 オフラインから chain を自己回復、ネットワーク分断時は fail-closed が正解（slashing > inactivity が常に成立）。
`,
                },
                {
                  title: 'レッスン2 — Hot upgrade と協調 chain アップグレード',
                  slug: 'validator-hot-upgrades-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 16,
                  xpReward: 45,
                  content: `# レッスン2 — Hot upgrade と協調 chain アップグレード

## 問い

メインネット hardfork 当日。新バイナリがコンセンサスルールを書き換える。何万もの validator が散らばって稼働、マスタースイッチなし、メンテナンス窓なし、chain は止められない。**それでも 14:13 UTC に canonical chain に残る全 validator が一斉に新ルールでブロック生成 — どうやって？**

## 原理（最小モデル）

- **協調メカニズムは「全員同時アップグレード」ではない.** **バイナリそのものが切り替えタイミングを知っている** = height-gate ルール。
- **Activation 4 方式.** Block height（決定論的、PoW/PoS 両対応）+ Timestamp（壁時計、精度低い）+ Difficulty（PoW 歴史的）+ Total difficulty（Ethereum Merge 1 回限り）。
- **Activation 前にアップグレード済めば OK.** Activation 後、アップグレード済 validator は新ルール適用、未アップグレードは古ルールで stale fork → ネットワークから脱落。
- **アップグレード 5 ステップ.** アナウンス受領 → 新バイナリ DL + 検証 → activation 前デプロイ → デプロイ検証 → activation 待ち。
- **アップグレードされているのは chain spec.** \`activation_block_number\` テーブルがバイナリに同梱。
- **Pre-fork dry run.** Testnet で 2-3 週間先に同 fork → 問題発見で mainnet 遅延。Pectra は 2 回遅延。
- **Hot fork ≠ Hot software 更新.** Hot fork = コンセンサスルール / Hot software 更新 = 再起動なし。短い再起動は許容（slashing-protection DB が再起動越え）。
- **緊急対応 4 段階.** Stale ブロック（自己回復）/ 不正 state（協調 rollback）/ 資金窃取（緊急 hardfork）/ コンセンサス halt（協調リセット、稀）。
- **BFT chain は halt-and-recover.** >1/3 オフライン → halt → オペレータ復旧 → 再開。**halt は許容**（fork せず safety 維持）。

## 具体例

Height-gate ルールの動作:

\`\`\`
Block 999: 全 validator (旧コード + 新コード) がこのブロックを受け入れる
Block 1000: Activation 地点
Block 1001: 旧コードの validator はこれを reject する (新ルールに従っていない)
           新コードの validator は受け入れる
\`\`\`

Activation 以降、chain は新ルール。旧コードは **明示的に invalid**。

4 方式:

| タイプ | ユースケース | リスク |
| :--- | :--- | :--- |
| Block height | 決定論的 activation | 扱いやすい、PoW/PoS 両対応 |
| Timestamp | 壁時計ベース | 精度低、プロトコル drift しうる |
| Difficulty（PoW） | 歴史的 Ethereum | 時代遅れ |
| Total difficulty | Ethereum Merge 遷移 | 1 回限り |

現代 PoS = 人間可読のため timestamp、精度のため block height。Casper FFG = epoch 境界。

5 ステップ:

1. アップグレードアナウンス受領（Github issue、Discord）
2. 新バイナリ DL + 検証
3. activation 前に全 validator ノードデプロイ
4. デプロイ正常か検証
5. Activation block 待ち（新ルール自動適用）

ステップ 3 を逃すと activation 瞬間に chain から脱落。アップグレード + sync で再合流。

Reth ベース chain spec パターン（Course 1 Consensus Engineering Lesson 5 より）:

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

新バイナリバージョンに更新済 chain spec 同梱 → 新 activation テーブル → activation block で新ルール発動。

**「アップグレードされているのは chain spec」**。

Pre-fork dry run:
- Mainnet activation の 2-3 週間前
- 同 fork を testnet で走らせる
- 全動作検証
- 問題発見で mainnet 遅延
- **Pectra は 2 回遅延**

Hot fork ≠ Hot software 更新:

| | Hot fork | Hot software 更新 |
| :--- | :--- | :--- |
| 何が | コンセンサスルール変更 | バイナリ再起動 |
| 影響 | プロトコルレベル | 運用レベルのみ |
| ダウンタイム | なし（協調活性化） | 再起動分の inactivity |
| Slashing リスク | activation 跨ぎで誤動作なら | DB が再起動越えなら安全 |

緊急対応:

| 重大度 | 対応 |
| :--- | :--- |
| Stale ブロック | 待つ — peer 戻れば chain 自己回復 |
| 不正 state 生成バグ | 協調 rollback（validator が chain セグメント破棄合意） |
| 資金窃取バグ | 機能を無効化する緊急 hardfork |
| コンセンサス halt | 協調リセット（稀、大事件） |

歴史例:
- **2016 DAO**: 盗まれた資金取り戻す協調 hardfork
- **2024 Polkadot**: validator 不正動作で協調 rollback
- **応答サイクル**: 24 時間程度

BFT chain の halt-and-recover:
- 1/3 超オフラインで chain halt（>2/3 quorum 要件直接帰結）
- オペレータが validator オンライン復帰
- Chain 再開

**halt は許容**（chain fork せず、safety 失わず、ただ止まる）。Ethereum の inactivity leak とは異なる回復モデル。

## 失敗例（誤解）

「全 validator が正確に同瞬間にアップグレード必要」— **間違い**。**バイナリそのものが切り替えタイミングを知っている**。Activation block 前にアップグレード済めば OK、validator 間の協調は不要。アップグレード時刻はずれてもよい、activation block の瞬間に同時 fork。

「Hot software 更新 = Hot fork」— **間違い**。Hot software 更新 = 再起動なし運用変更（slashing-protection DB が再起動越えるので安全）/ Hot fork = コンセンサスルール変更（chain spec の activation テーブル更新）。**別物**。

「Stale fork（アップグレードしなかった 1%）は slashing リスク」— **間違い**。Stale fork は canonical chain 上で double-sign したわけではない（別 fork 上にいただけ）→ slashing なし。負担は **inactivity ペナルティのみ**。アップグレード + sync で復帰可能。

> 🛑 **予測。** Ethereum は主要 outage なしで 10 以上の hardfork 実行。これを成立させているプロトコル機構は？「全員同瞬間アップグレード」ではない。（答え: **Height-gate ルール + chain spec activation テーブル**。バイナリそのものが「block N で新ルール」と知っている → validator は activation block 前にアップグレード済めばよい（協調は不要、アップグレード時刻はずれてもよい）→ activation block で全アップグレード済 validator が一斉に新ルール適用 → 未アップグレード validator は stale fork で脱落（slashing なし、復帰可能）。**chain spec が「いつ」を所有、validator が「どう」を実行**。Pectra など 10+ fork が outage なしで成立した理由。）

## ステップで組み立てる

### Step 1: 協調の本質を理解

「全員同時アップグレード」ではなく **height-gate + chain spec**。

### Step 2: 4 activation 方式

Block height / Timestamp / Difficulty / Total difficulty。現代 PoS = timestamp or epoch 境界。

### Step 3: 5 アップグレードステップ

アナウンス → DL+検証 → デプロイ → 検証 → activation 待ち。

### Step 4: chain spec の役割

\`activation_block_number\` テーブルがバイナリに同梱 → 新バージョンで新ルール起点。

### Step 5: Pre-fork dry run

Testnet で 2-3 週間先 → 問題発見で mainnet 遅延 → Pectra は 2 回遅延。

### Step 6: Hot fork ≠ Hot software 更新

ルール変更 vs 再起動運用。slashing-protection DB が再起動越えなので software 更新は安全。

### Step 7: 緊急対応 4 段階

Stale（自己回復）/ 不正 state（rollback）/ 窃取（緊急 hardfork）/ halt（リセット）。

### Step 8: BFT chain の halt-and-recover

halt 許容（fork せず）vs Ethereum inactivity leak で削減。**BFT は outage を設計選択にできる**。

## 答え合わせ

- **協調メカニズムの本質**: 「全員同時アップグレード」は協調できない（人間の同期不可能）→ **バイナリそのものが切り替えタイミングを知っている** = height-gate ルール + chain spec の activation テーブル。validator は activation block 前にアップグレード済めばよい、アップグレード時刻はずれてよい → activation block で全アップグレード済が一斉新ルール適用。**chain spec が「いつ」を所有、validator が「どう」を実行**。
- **1% 未アップグレードの結末と回復**: 1% は旧ルールで stale fork 生成、99% は新ルール canonical chain。99% 側から見ると 1% はオフラインに見える（生成ブロック reject）。回復 = ① 「自分が rejected ブロック生成」気づく → ② バイナリアップグレード → ③ canonical chain に sync → ④ canonical 上で署名再開。**slashing リスクなし**（別 fork 上にいただけ、canonical で double-sign したわけではない）、負担は inactivity ペナルティのみ。
- **BFT chain が halt-and-recover を許容する理由**: 1/3 超オフラインで chain halt（>2/3 quorum 要件直接帰結）→ オペレータ復帰 → 再開。**halt = chain fork せず、safety 失わず、ただ止まる** = 大規模 incident で fork するくらいなら halt が望ましい設計選択。Ethereum の inactivity leak（chain 動き続けるが非参加 stake 削る）とは別モデル、BFT は単純 halt を選べる。

## 合格基準

- 協調メカニズムが「全員同時」ではなく「height-gate + chain spec」と理解している。
- 4 activation 方式と現代 PoS の選択を即答できる。
- 5 アップグレードステップを順に言える。
- chain spec の \`activation_block_number\` テーブルを書ける。
- Hot fork と Hot software 更新の違いを言える。
- 緊急対応 4 段階を重大度順に言える。

## まとめ（3行）

- 協調 hardfork の本質 = height-gate ルール + chain spec の activation テーブル（バイナリが「いつ」を所有）、validator は activation block 前にアップグレード済めば OK、時刻ずれてよい。
- 4 activation 方式（height / timestamp / difficulty / total difficulty）、5 ステップ、pre-fork dry run（Pectra は 2 回遅延）、Hot fork ≠ Hot software 更新。
- 緊急対応 4 段階（自己回復 → rollback → 緊急 hardfork → halt）、BFT chain は halt-and-recover を許容（fork せず、safety 維持）= 設計選択肢。
`,
                },
                {
                  title: 'ファイナルクイズ — Validator 運用',
                  slug: 'validator-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# ファイナルクイズ — Validator 運用

Validator 運用の最終チェック。本番 L1 で validator を担うときに必要。

レッスン0-2 を通じて: 鍵管理（5 要件 / 4 解 = 設定ファイル → HSM → MPC → 閾値署名 / 2 鍵パターン / リモート signer / マルチリージョン active-passive）/ Slashing 検知（2 経路 = 能動 / 受動 / 3 種違反 = double / surround / equivocation / slashing-protection DB の atomicity / whistleblower 報酬 / inactivity leak / 分断時 fail-closed）/ 協調アップグレード（height-gate ルール / chain spec / 5 ステップ / pre-fork dry run / 緊急対応 4 段階 / BFT halt-and-recover）の構造的事実を確認する。
`,
                },
              ],
            },
          },
        ],
      },
    },
  });
}
