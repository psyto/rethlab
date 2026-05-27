import { PrismaClient } from '@prisma/client';

export async function seedRethValidatorOpsJA(prisma: PrismaClient) {
  const tags = ['reth', 'validator', 'hsm', 'mpc', 'slashing', 'hot-upgrade', 'ops', 'l1', 'expert'];

  await prisma.course.create({
    data: {
      slug: 'reth-validator-ops-ja',
      title: 'Validator 運用 — 鍵、slashing、協調アップグレード',
      description:
        'コンセンサスのコードを書くことと、本番でコンセンサスを動かし続けることの間にある運用層を扱う。Validator の鍵管理 (hot 鍵、HSM、MPC、閾値署名)、slashing 検知と double-signing の防止、協調 hardfork アップグレードまで。動くコンセンサス実装を、オペレータが stake を失わずに済む本番 レッスン1に変えるためのスキル。',
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

ステーキングオペレータが午前 3 時にページを受け取る。スタンバイ機で 2 つ目の validator プロセスが誤って起動してしまった — 同じ鍵、両方オンライン、両方が height 9,801,442 で attestation に署名。気づいたときには、ネットワークはすでに同一アイデンティティから 2 つの valid な署名を観測している。これが **equivocation** (同じ slot で 2 つの矛盾するメッセージに署名することを指すコンセンサス用語) であり、プロトコルはこれを slashing する。重複プロセスを動かしたツケとして、$2M のペナルティとともに朝を迎える。

Validator の署名鍵はそのまま **経済的アイデンティティ** である。失えば stake を失う。漏らせば攻撃者に double-sign され、slashing され、stake を失う。使い回せば同じ結末。本レッスンで扱うのは運用の現実だ: 本番チームがどう鍵を安全に保っているか、失敗するとどこから壊れるか、validator set をスケールさせるための暗号プリミティブとは何か。

> 🛑 **スクロール前に予測。** ある validator が 100 ノードを稼働させている。**署名鍵のコピーは何個存在するか?** 最初に「1 (オリジナル) + 100 (稼働中)」と思ったなら、その状態が許してしまう攻撃は何か?

## 1. Validator 鍵の脅威モデル

Validator 鍵に求められる要件:
- リーダ/voter のときにブロック/attestation に **署名できる** こと
- 同じ height/round で 2 つの異なるメッセージに **絶対に署名しない** こと (slashing)
- 公開インターネットに **絶対に露出させない** こと
- オペレータの離職を **乗り越えられる** こと (ops 担当が複数いる)
- 災害を **乗り越えられる** こと (ハードウェア障害、データセンタ喪失)

それぞれが別々のセキュリティ課題であり、**ひとつの解決策ですべてを満たすことはできない**。

## 2. 洗練度順に並べた 4 つの解決策

### 2.1 設定ファイルに置く hot 鍵

\`\`\`bash
# これは危険
echo "0xabc123..." > /var/lib/validator/key.txt
\`\`\`

Pros: シンプルで、そのまま機能する。
Cons: ファイルシステムにアクセスできる者が全員鍵を握ることになる。バックアップ = 鍵のクローン。

**開発では使ってよいが、価値のある validator を本番で動かすときには使わない**。

### 2.2 HSM (Hardware Security Module)

HSM とは **耐タンパー性を備えた物理デバイスで、秘密鍵を内部に保持したまま露出させずに署名するもの** である。AWS CloudHSM、YubiHSM、Thales といったベンダーが提供する専用ハードウェア。

ワークフロー:
1. Validator が HSM 内部で鍵を生成する
2. 公開鍵は外に出るが、秘密鍵はデバイスから決して出ない
3. 署名のときは、validator software が HSM に hash を送り、HSM が署名を返す
4. Validator software が侵害されたとしても、攻撃者は任意のメッセージに **valid な** 署名を作らせることはできるが、鍵そのものは盗めない

Pros: 鍵がディスク上にも、validator プロセスのメモリ上にも存在しない。
Cons: 単一デバイスであるため、物理的に失えば鍵を失う。バックアップが難しい。

**ETH ステーキングプール向けのプロフェッショナル validator (Ledger Enterprise、Fireblocks など) が採用している**。

### 2.3 MPC (Multi-Party Computation)

鍵を **複数デバイスに分割** し、署名には N-of-M の協力を必要とする。どのデバイスも単独では完全な鍵を持たない。

例: 3 データセンタにまたがる 3 デバイス。署名には 3 つのうち 2 つが協力する必要がある。1 デバイスが侵害されても、攻撃者が手にするのは鍵の 1/3 でしかなく、それだけでは何もできない。2/3 を得るには、別々の施設を 2 つ侵害しなければならない。

Pros: どのデバイスも単独では鍵を保持しない。
Cons: 協力を要求するため、署名のたびにレイテンシが発生する。プロトコルも複雑。

**極めて大規模なステーキング運用 (Fireblocks、Coinbase Cloud など) で使われている**。

### 2.4 閾値署名 (MPC の暗号版)

MPC と発想は同じだが、**閾値署名暗号** (N-of-M の share 保有者が、鍵を再構築することなく署名を生成できるよう設計された署名 scheme) を用いる。各デバイスは鍵の「share」を保持し、署名はフル鍵を再構築することなく、通常の署名と見分けがつかない形で生成される。

BLS 閾値署名 (BLS = ペアリングベースの署名 scheme で、署名の集約がクリーンに行える) が Ethereum 系 PoS の標準である:
- 各 validator が集約署名鍵の share を持つ
- ブロックへの署名は、部分署名を 1 つの最終署名に集約する形で行う
- Verifier 側からは閾値署名であることはわからず、ただの BLS 署名として見える

Pros: 暗号的にクリーン。「再構築」ステップが存在しない。
Cons: セットアップが複雑で、鍵生成 ceremony を要する。

**マルチノード構成の Ethereum beacon chain validator や、Aleo、Filecoin などの chain で使われている**。

> 🛑 **理解度チェック。** 「MPC と閾値署名は同じ」というのは **誤り** である。両者は異なる。違いを言語化せよ。(ヒント: 一方は任意の署名スキームの上に構築されるプロトコル、もう一方は暗号的性質。)

MPC は **汎用プロトコル** であり、秘密 share 上の関数を露出させずに計算する仕組みで、任意の関数 (署名を含む) に適用できる。閾値署名は **特定の暗号プリミティブ** で、署名 scheme 自体が secret-sharing をネイティブにサポートしている。閾値署名のほうがクリーンで、MPC のほうが柔軟性が高い。

## 3. 「2 鍵」パターン

このパターンの目的は、鍵漏洩時の被害範囲を限定することにある。本番 validator の大半はこう分離している:

- **Withdrawal 鍵** (cold): staked 資金を支配する。オフライン保管 (紙、ハードウェアウォレット)
- **署名鍵** (hot): 投票/提案を支配する。オンラインで保持され、slashable

署名鍵が侵害されても、攻撃者にできるのは validator を **slash させる** こと (コスト: hot stake) までで、**資金そのものは盗めない** (withdrawal 鍵は cold だから)。損失は有界に抑えられる。

Ethereum の場合:
- Withdrawal credentials (0x01...): cold storage
- Validator 鍵 (BLS): attestation + proposal のためオンライン

Hyperliquid の場合:
- Validator 署名鍵: オンライン
- 報酬/withdrawal 鍵: cold

## 4. Slashing 防止チェックリスト

「報酬を稼ぐ validator」と「slashed される validator」を分けるのは以下の 4 ルールである。次のすべてを保証する必要がある:
1. **アイデンティティごとに署名者は 1 つだけ** — 同じ鍵で 2 つのプロセスを絶対に走らせない
2. **Slashing-protection データベース** — 署名したメッセージをすべて記録し、slashing を引き起こすような署名は拒否する
3. **不確実なときは fail-closed** — 直近の履歴を検証できないなら署名しない
4. **ネットワーク分断への耐性** — 分断の向こう側にいて sync を失っているなら署名しない (fork 上にいる可能性がある)

reth の \`crates/ethereum/blockchain-tree\` には Ethereum PoS 向けの slashing-protection ロジックが入っている。カスタム L1 は独自に実装する必要がある (Cosmos なら CometBFT のもの、Solana ならまとめて ledger を replay する仕組み)。

> 🛑 **予測。** ある validator が冗長化のため 2 台のマシンで重複したプロセスを走らせている。**待ち構えている slashable な違反は何か?** 失敗シナリオを追ってみよ。

両方のマシンに同じ鍵が入っている。両方が同じ epoch の attestation に署名する。一方は canonical となり、もう一方はネットワークから見ると **double-signing イベント** に見える。Slashed。冗長化のつもりが slashing 違反に化けてしまう。

修正: **active-passive** 構成で failover を厳格に行う (常に 1 ノードだけが署名権限を持ち、遷移はコンセンサスプロトコル経由でのみ行う)。

## 5. リモート signer パターン

本番 validator では **リモート signer** を使う構成がしばしば採られる:

\`\`\`
[Validator ノード] --API 経由ブロック署名-->  [HSM 付きリモート signer]
                                                  |
                                                  +--署名メッセージを追跡
                                                  +--危険な署名は拒否
                                                  +--HSM 内に鍵を保持
\`\`\`

Validator ノード自体は鍵をいっさい保持しない。実際の署名を行う remote signer サービスに接続するだけだ。Remote signer が slashing-protection を強制し、矛盾する 2 つのメッセージへの署名を拒否する。

本番で使われる実装:
- **Web3Signer** (Ethereum) — Java ベースの remote signer
- **Eth-Signer** — Rust による代替実装
- **Tetuna** — slashing-protection データベース

Tempo や Hyperliquid でも同様のパターンが採用される。Validator がコンセンサスノード + remote signer を動かし、鍵は HSM の中に置く。

## 6. マルチリージョン構成のデプロイ

データセンタ喪失を生き残るための構成:
- **DC1 のアクティブ validator** (ブロックに署名)
- **DC2 のスタンバイ** (引き継ぎ準備)
- **DC3 のコールドバックアップ** (DR)

最も難しいのはアクティブとスタンバイ間の遷移である。**自動化してはならない** — 両方が同時に署名してしまうリスクがあるからだ。通常はこう進める:

1. アクティブが block N に署名する
2. アクティブは block N の伝播と finalized を確認する
3. 手動オペレータが shutdown を確認する
4. スタンバイが署名権限を引き取る
5. スタンバイが block N+1 に署名する

View change を持つ BFT chain なら、コストは 1 slot を miss する程度。Nakamoto 系 chain ならさらに影響は小さい。

## 7. 自分のプロジェクトに当てはめると

### Tempo の validator 運用

Tempo が分散化して validator を運用するフェーズに入る場合:
- 署名鍵は HSM に
- 3 リージョンの active-passive 構成
- コンセンサスクライアントと統合された slashing-protection データベース
- Withdrawal 鍵は専用ハードウェアウォレットでオフライン保管

これが任意の レッスン1で validator を担うときの **ローンチ運用チェックリスト** になる。

### Soltempo / mppsol relayer の運用

CCIP、soltempo、mppsol の relayer は独自の鍵を使う。原則は同じ:
- コードに鍵を埋め込まない
- 本番では HSM か同等の仕組みを使う
- 定期的に鍵をローテートする
- バックアップを持つ

## 8. 練習

1. 計算: 3 ノードが t=2 で BLS 閾値署名を使う。何ノードまで compromised でも署名できるか? 何ノードを超えると合意なしに署名できてしまうか?
2. [Web3Signer docs](https://docs.web3signer.consensys.net/) の slashing-protection セクションを読む
3. 特定: 運用中に新しい HSM へ移行する際の slashing リスクはどこにあるか?

## 9. 読み物

- [EIP-2335 (BLS keystore)](https://eips.ethereum.org/EIPS/eip-2335)
- [Web3Signer](https://github.com/Consensys/web3signer)
- [Cosmos validator security](https://hub.cosmos.network/main/validators/security.html)

> 最終チェック: 一文で、「署名鍵のバックアップを持つ」がなぜ機能ではなく slashing 脆弱性なのか説明できるか? **答えに「重複した署名者が slashable な equivocation を生み出しうる」が含まれていなければ §4 を再読すること**。`,
                },
                {
                  title: 'Slashing 検知とオフライン validator',
                  slug: 'validator-slashing-detection-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 16,
                  xpReward: 40,
                  content: `# Slashing 検知とオフライン validator

Validator が stake を失う方法は厳密に 2 通りしかない。高くつくほう: **矛盾する 2 メッセージに署名する** (slashing — 1 回のイベントで stake の大部分が消える)。じわじわ来るほう: **ネットワークが必要とするときにオフラインでいる** (inactivity ペナルティ — 数日かけて少しずつ削られる)。本レッスンに出てくる運用判断はすべて、何かが壊れたときにこの 2 つの損失のうち小さいほうを選ぶことに帰着する。

> 🛑 **スクロール前に予測。** Validator が 2 日オフラインになった。**いくら失うか?** さらにその間、ネットワーク分断で 1/3 の validator が向こう側に持っていかれていたら?

## 1. Stake を失う 2 つの経路

| 経路 | 何が起きるか | なぜ |
| :--- | :--- | :--- |
| **能動的な不正動作 (slashing)** | 矛盾する 2 メッセージに署名 | 暗号的に証明可能; 主要なペナルティ |
| **受動的な不正動作 (inactivity)** | まったく署名しない | 分断中にじわじわ削られるペナルティ |

どちらもプロトコルが強制し、どちらも stake を削減する。決定的な違いは、slashing が **壊滅的** (1 イベントで stake の大部分または全部を失う) であるのに対し、inactivity は **緩やか** (時間をかけて少額ずつ失う) なことだ。

Ethereum mainnet の場合 (2026 年のパラメータの概算):
- Slashing: 最小 ~1 ETH、correlated slashing が起きると増加
- Inactivity leak: finality 問題が発生している期間、非参加 1 日あたり stake の ~0.1%

## 2. Slashable な違反の中身

### 2.1 Double voting

同じ height で別々のブロックに投票する例:

\`\`\`
Vote1: { height: 1000, block: 0xA..., signature: SigA }
Vote2: { height: 1000, block: 0xB..., signature: SigB }
\`\`\`

両方の票が valid で、いずれも validator V によって署名されていれば、V は slashable である。**両方の署名を持っている者であれば誰でも slashing proof を構築できる**。

修正: Validator software は署名したすべての票を **必ず** 追跡し、同じ height における 2 票目への署名を拒否しなければならない。これを担うのが **slashing-protection データベース** である。

### 2.2 Surround voting (Casper FFG 固有)

Casper FFG (Ethereum の finality gadget) では、validator は **source → target** のチェックポイントペアに投票する。Surround-vote とは、後の投票の範囲が先の投票の範囲を厳密に包含する形のもの:

Vote1: source A → target B
Vote2: source C → target D

C < A かつ D > B (つまり 2 つ目が 1 つ目を「surround」している) なら slashable。修正: 投票した source/target ペアをすべて追跡し、先行する投票を surround するような票は拒否する。

### 2.3 BFT (Tendermint、HotStuff) における equivocation

同じ height/round で別々のブロックに対する 2 つの pre-commit (BFT ラウンドにおける「このブロックにコミットする」メッセージ) のこと。ロジックは double voting と同じであり、slashing-protection データベースで捕捉する必要がある。

## 3. Slashing-protection データベース

本番 validator は例外なくこれを走らせる。仕事は以下の通り:

\`\`\`
Height H、round R でメッセージ M に署名する前に:
  (H, R) で内容の異なる署名済みメッセージが既に存在するなら:
    署名を拒否する  → slashing イベントを起こさない
  そうでなければ:
    M に署名する
    M をデータベースに記録する
\`\`\`

データベースに求められる要件:
- 再起動を跨いで永続化される
- ソフトウェア更新を生き延びる
- バックアップを取る (新規データベースだと現実に追いつかない)

代表的な実装:
- **EIP-3076 フォーマット** — Ethereum 標準
- **CometBFT priv_validator_state.json** — Cosmos chain
- **カスタムファイル** — chain 固有のフォーマット

## 4. リモート signer との統合

本番 validator の大半は、**slashing-protection も強制する** remote signer を走らせる構成を取る:

\`\`\`
[Validator ノード]  --署名要求-->  [Remote Signer]
                                            |
                                            +- Slashing-protection DB をチェック
                                            +- 安全なら: 署名して記録
                                            +- 危険なら: 拒否
\`\`\`

この構成によって **defense in depth** が成立する。Validator ノードにバグがあっても、remote signer のデータベースが最後の砦になる。**Validator ノードが double-sign を試みても、remote signer がそれを拒否する**。

Web3Signer (Ethereum) はこのパターンを実装している。CometBFT validator も独自の variant を持つ。

> 🛑 **理解度チェック。** なぜ slashing-protection DB は **署名者と同じマシン上** に置く必要があるのか? ネットワーク経由で呼び出すリモート DB ではダメな理由を答えよ。答えに「atomicity」または「署名中のネットワーク失敗」が含まれていなければ §3-4 を再読すること。

DB の書き込みと署名操作は **ひとつの atomic 操作** としてコミットされなければならない。署名してから記録しようとしてネットワーク失敗で記録できなかった場合、署名だけが記録なしに残り、再試行で同じ高さに再度署名してしまいうる。Atomicity とは「両方成功するか、両方失敗するか」のどちらかしかないこと。ネットワーク越しのリモート DB は、atomicity が崩れる窓を作ってしまう。

## 5. Whistleblower watcher

プロトコルが slashing を実行するのは **誰かが proof を提出したとき** だけだ。そこで watcher の出番となる。Slashing は **暗号的に証明可能** であり、矛盾する 2 つの署名を持っている者であれば誰でも slashing transaction を提出できる。多くの chain は slash された stake のごく一部を **whistleblower 報酬** として提出者に支払う。

Ethereum の場合、slashed 額の ~1/512 が proof 提出者に渡る。$1M の主要 slashing なら ~$2k — watcher を経済的に動機づけるには十分。

Watcher の実装:
- ブロックチェーンを走査して attestation を集める
- (validator、height、round) でインデックスを張る
- 衝突を検知する
- Slashing tx を提出する

自分で watcher を作るなら、ここはオープンソースの余地が残る領域だ。MEV searcher に似ているが、対象がプロトコルレベルの違反となる。

## 6. オフライン状態の validator — inactivity ペナルティ

Validator がオフラインになると:
- 通常運用中なら、報酬を取り逃す (日次の小さな損失)
- Finality に問題が発生している期間 (>1/3 がオフライン) なら、**inactivity leak** が発動する

Inactivity leak とは、Ethereum が分断した chain を >2/3 のオンライン状態へ強制的に押し戻すための機構である。epoch ごとにオフラインの validator は stake を失っていき、finality 遅延が長くなるほどその率は上がる。**Chain は自己回復する** — 最終的にオンラインの validator が >2/3 を回復し、finality が再開し、オフラインだった validator は stake を削減された状態で残る。

これが **BFT 系 chain における大規模オフラインイベントへの応答** の形だ。永久に halt させる代わりに、プロトコルがゆっくりとオフライン validator を削っていき、quorum が成立する地点まで戻す。

## 7. ネットワーク分断のリスク

古典的な災害シナリオ:
1. ネットワーク分断によって validator set が二つに割れる
2. 各分断が自分を majority だと誤認するおそれがある
3. それぞれが別々の fork 上で署名を続けてしまう
4. 分断が解消した瞬間に、fork をまたぐ大規模 slashing が発生する

緩和策:
- **Liveness watchdog**: 分断を検知する (peer から最近ブロックを受け取れていない) — 署名を停止
- **ネットワーク heartbeat**: 署名前に他の validator への接続性を確認
- **強制 sync**: ネットワークに追いつくまで署名を拒否

しっかり構築された validator は複数のチェックを併用する。Validator software 自体が侵害されてこれらのチェックを無効化されるケースは、現実のリスクとして残る。

> 🛑 **予測。** Validator は DC1 にある。DC1 がインターネット接続を 30 分失った。**Validator は署名を続けるべきか?** 続けた場合の失敗モードは? 続けなかった場合は?

続けた場合: 自分が分断側にいて、ネットワークの残りが目にしないブロックを生成してしまう可能性がある。やがてネットワークが回復し、自分の chain は間違いだったと判明し、double-sign に等価な状態となって slashed される。

止めた場合: 30 分の inactivity (小さなペナルティ)。接続が戻ったら sync し直して再開すればよい。

**停止が正解** である。Slashing のリスクと引き換えに、小さな inactivity ペナルティを払うほうがはるかにマシだ。Validator software は自動でこれを検知して fail-closed すべきである。

## 8. 自分のプロジェクトに当てはめると

### Tempo の validator を運用する場合

- 各 validator ノードと remote signer に slashing-protection DB を置く
- 30 分の heartbeat チェック — 接続を失ったら署名を拒否する
- 2 リージョンの active-passive 構成 (遷移はコンセンサスプロトコル経由でのみ)
- バージョニング付きの S3 に日次で DB をバックアップ

### Watcher のチャンス

Tempo には slashing watcher の市場が成立する可能性がある (ローンチ時点で slashing 機構が入る前提)。Watcher の構築は Rust 数百行 + インデキシングで足り、小規模な収益源になりうる。

## 9. 練習

1. 計算: stake 1000 ETH の validator が、double-vote によって 5% slashed された。いくら失うか?
2. 特定: Validator A は 95% の参加率でオンライン、validator B はオフライン。1 ヶ月後、stake が多いのはどちらか?
3. Slashing-protection ロジックの擬似コードを書け
4. [Web3Signer slashing protection](https://docs.web3signer.consensys.net/concepts/slashing-protection) を読む

## 10. 読み物

- [EIP-3076 (slashing protection フォーマット)](https://eips.ethereum.org/EIPS/eip-3076)
- [Web3Signer](https://github.com/Consensys/web3signer)
- [Inactivity leak 設計](https://eth2book.info/altair/part2/incentives/inactivity)

> 最終チェック: 一文で、「不確実なときは署名停止」がなぜ validator の正しいデフォルトなのか説明できるか? **答えに「slashing ペナルティ > inactivity ペナルティ」が含まれていなければ §7 を再読すること**。`,
                },
                {
                  title: 'Hot upgrade と協調 chain アップグレード',
                  slug: 'validator-hot-upgrades-ja',
                  type: 'CONTENT',
                  sortOrder: 2,
                  duration: 16,
                  xpReward: 45,
                  content: `# Hot upgrade と協調 chain アップグレード

メインネット hardfork 当日のことを想像してほしい。新しいバイナリはコンセンサスルールを書き換える。何万もの validator が、あらゆる大陸、あらゆるクラウド、あらゆる自宅セットアップに散らばって稼働している。マスタースイッチは存在しない。スケジュールされたメンテナンス窓もない。Chain を止めるわけにはいかない。それでも 14:13 UTC のその瞬間に、**canonical chain に残るすべての validator が一斉に新ルールでブロックを作り始める** — アップグレードしなかった者は静かに fork off して、無関係な存在になっていく。どうやって?

この協調問題こそ **ブロックチェーン運用で最も難しい問題** だ。validator たちは互いに直接話すこともなく、足並みを揃えてルールを切り替えなければならない。本レッスンでは、それを成立させているプロトコル上の仕組みと、運用上の drill を見ていく。

> 🛑 **スクロール前に予測。** Ethereum は主要な outage を起こすことなく 10 以上の hardfork を実行してきた。**これを成立させているプロトコル機構は何か?** 「全員が同じ瞬間にアップグレードする」ではない — それでは協調できない。もっと強い仕組みが裏にあるはずだ。

## 1. コア機構 — height-gate ルール

仕掛けは **バイナリそのものが切り替えのタイミングを知っている** という点にある。Hardfork は次の 2 つで定義される:
- 新ルールが activate される **block height (またはタイムスタンプ)**
- **新ルールのセット** (コンセンサス、EVM、gas など)

Validator は全員が同時にアップグレードする必要はない。Activation height の **前まで** にアップグレードを済ませておけばよい。Activation block の到来とともに、アップグレード済みのすべての validator が同じブロック、同じ瞬間に新ルールを適用する — 協調はいらない。アップグレードしていない validator は古いルールで動き続け、ネットワークの残りが reject するブロックを生成して **脱落する**。

\`\`\`
Block 999: 全 validator (旧コード + 新コード) がこのブロックを受け入れる
Block 1000: Activation 地点
Block 1001: 旧コードの validator はこれを reject する (新ルールに従っていない)
           新コードの validator は受け入れる
\`\`\`

Activation 以降、chain は新ルールに従って進む。旧コードは **明示的に invalid** になる。

## 2. Activation 条件

Activation は典型的には以下の方式を取る:

| タイプ | ユースケース | リスク |
| :--- | :--- | :--- |
| **Block height** | 決定論的な activation | 扱いやすい; PoW でも PoS でも動く |
| **Timestamp** | 壁時計ベースの activation | 精度が低い; プロトコルが drift しうる |
| **Difficulty** (PoW) | 歴史的な Ethereum | 時代遅れ |
| **Total difficulty** | Ethereum Merge での遷移 | 1 回限りの利用 |

現代の PoS chain は、人間にとっての読みやすさのために **timestamp**、精度のために **block height** を使い分ける。Casper FFG は **epoch 境界** を使う。

Tempo や Hyperliquid なら timestamp ベースの activation を採用するだろう。「Unix timestamp X の地点で fork Y に切り替える」という形だ。

## 3. アップグレードの協調プロトコル

オペレータが踏む手順:
1. **アップグレードのアナウンスを受け取る** (Github issue、Discord など)
2. **新バイナリをダウンロードして検証する**
3. **activation 前に全 validator ノードへデプロイする**
4. **デプロイが正しく行われたか検証する**
5. **Activation block を待つ** — 新ルールは自動的に適用される

ステップ 3 を逃した validator は、activation の瞬間に **chain から脱落する**。アップグレードして sync し直せば再合流できる。

Ethereum の場合、Merge、Shanghai、Cancun、Pectra の activation はすべてまさにこの手順で行われた。Validator にはアップグレード 1〜2 週間前に通知が出る。

> 🛑 **理解度チェック。** 「99% の validator がアップグレード、1% がしない、よって chain が fork する」 — **Yes だが、その先は?** 1% にはどんな結末が待っているか? 戻れるのか? 回復シナリオを追ってみよ。

1% は旧ルールで「stale fork」を生成する。99% は新ルールの canonical chain についていく。99% 側から見れば、1% は単にオフラインに見える (生成されたブロックが reject されるため)。回復の流れ:
1. オペレータが「自分の validator が rejected ブロックを生成している」ことに気づく
2. バイナリをアップグレードする
3. Validator が canonical chain に sync する (peer からブロックを取得)
4. Canonical chain 上で署名を再開する

Slashing のリスクはない (canonical 側で double-sign したのではなく、別の fork 上にいただけ)。負担するのは inactivity ペナルティだけ。

## 4. アップグレードは chain spec に組み込む

Reth ベースの chain では、アップグレードは **chain spec** (chain のアイデンティティ — genesis、fork height、chain ID — を定義する Rust の構造体) にエンコードされる。Course 1 (Consensus Engineering) の Lesson 5 より:

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

新しいバイナリのバージョンに更新された chain spec が同梱される。そのバージョンにアップグレードした validator は、新しい activation テーブルを手にすることになる。Activation block の到来とともに新ルールが発動する。

つまり、**アップグレードされているのは chain spec である**。

## 5. Pre-fork dry run

本番 chain では **testnet で先に** アップグレードを回す:
- Mainnet の activation はその 2〜3 週間後に設定する
- 同じ fork を testnet で走らせる
- すべてが正しく動くかを検証する
- 問題が見つかれば mainnet を遅延させる

これが致命的なバグを事前に拾う仕組みである。Ethereum の Pectra fork が 2 回遅延したのも、dry run 中に testnet で発見された問題が原因だった。

Tempo の場合、まさにこの目的で Tempo Moderato (testnet) が設けられる可能性が高い。Fork のシーケンスは Moderato → Mainnet となり、間に数週間が挟まる。

## 6. Hot software 更新 (hot fork ではない)

これら 2 つは別物である:

- **Hot fork** = コンセンサスルールのアップグレード。ここまで論じてきたもの。
- **Hot software 更新** = 再起動なしで validator ソフトウェアをアップグレードすること。こちらは純粋に運用上の話。

Hot software 更新の流れ:
- Validator software を新バージョンで再起動する
- 再起動中はオフラインになる (小さな inactivity ペナルティ)
- 新バージョンは直前の chain 状態から処理を続行する

多くの chain は **短い再起動なら許容する**。Slashing-protection データベースは再起動を跨いで生き残るため、double-sign のリスクはない。

一部の高度な構成では以下を採用する:
- **Active-passive failover** — まず passive ノードを再起動し、署名権限を移譲してから active ノードを再起動する
- **Live コードパッチ** — 極めて稀。ダウンタイムが許容できない性能修正のときに限る

## 7. 緊急対応プレイブック

バグが **デプロイ後** に見つかったらどうするか?

| 重大度 | 対応 |
| :--- | :--- |
| **Stale ブロック** | 待つ — peer が戻れば chain は自己回復する |
| **不正な state を生成するバグ** | 協調 rollback (validator が chain セグメントを破棄することに合意する) |
| **資金窃取バグ** | 機能を無効化する緊急 hardfork |
| **コンセンサス halt** | 協調リセット (稀; 大事件) |

2016 年の DAO 事件では盗まれた資金を取り戻すための協調 hardfork が行われた。2024 年の Polkadot 事件 (validator の不正動作) では協調 rollback が行われた。いずれも 24 時間程度の応答サイクルだった。

Tempo の場合、いずれ何らかの incident は起きる。Validator set とガバナンスはローンチ前に文書化されたプレイブックを用意しておく必要がある。

## 8. 「Halt して recover する」パターン

純粋 BFT 系の chain (Tempo、Hyperliquid) の場合:
- 1/3 を超える validator がオフラインになると chain は halt する (BFT の >2/3 quorum 要件から直接導かれる帰結 — quorum がなければ進捗もない)
- オペレータが validator をオンラインに戻す
- Chain はブロック生成を再開する

Ethereum (inactivity leak で回復させる方式) と比べると、BFT chain は halt-and-recover をクリーンに行える。**Halt は許容できる** — chain が fork せず、safety を失わず、ただ止まるだけだからだ。

Tempo にとっては、大規模 incident 時の **outage は設計上の選択** である。fork するくらいなら halt するほうがマシだ。

## 9. 練習

1. [Ethereum の Pectra アップグレード発表](https://eips.ethereum.org/EIPS/eip-7600) を読む
2. 特定: その EIP に activation ロジックはどう書かれているか?
3. スケッチ: L1 アップグレード用の validator 構成。デプロイのシーケンスはどうなる?
4. 特定: どのような状況で fork activation を遅延させるべきか?

## 10. 読み物

- [Ethereum hardfork リスト](https://ethereum.org/en/history/) — 各 fork がどう協調されたか
- [Ethereum execution-apis EngineAPI](https://github.com/ethereum/execution-apis) — EL/CL が fork activation をどう協調するか
- [Cosmos chain upgrade docs](https://docs.cosmos.network/)

> 最終チェック: 一文で、「全 validator が正確に同じ瞬間にアップグレードする」がなぜ hardfork のメンタルモデルとして誤りなのか説明できるか? **答えに「chain spec に組み込まれた height-gate ルール」が含まれていなければ §1-2 を再読すること**。`,
                },
                {
                  title: 'ファイナルクイズ: Validator 運用',
                  slug: 'validator-final-quiz-ja',
                  type: 'QUIZ',
                  sortOrder: 3,
                  duration: 10,
                  xpReward: 40,
                  content: `# ファイナルクイズ: Validator 運用

Validator ops の最終チェック。任意の validator 運用、レッスン1の経済設計、本番 chain がなぜ壊れるかを理解するために必要な内容を確認する。`,
                  quizQuestions: [
                    {
                      question: 'なぜ validator 鍵向けの **MPC (Multi-Party Computation)** が、**N ホストに鍵を分散して置く方式** と構造的に異なるのか?',
                      options: [
                        "MPC のほうが処理が速いから。",
                        "MPC は **どのデバイスもフル鍵を絶対に持たない** ことを保証する — 各デバイスは share を保持し、署名には N-of-M の協力が必要で、1 デバイスを攻撃しても攻撃者は役に立たない fraction しか得られない。一方、N ホストに鍵を分散して置く方式では、各ホストがフル鍵 (あるいは再構築可能なピース) を持つため、1 ホストが破られると壊滅的になる。",
                        'MPC は EIP-2335 で要求されているから。',
                        "MPC のほうがストレージ消費が少ないから。",
                      ],
                      correctIndex: 1,
                      explanation: "MPC は暗号的に「署名中に鍵を再構築しない」ことを保証する。安易に鍵を「分散」させる設計は、複数ホストにフル鍵を漏らしてしまう。MPC は、単一の信頼点を作らずに validator 鍵のセキュリティを本当の意味でスケールさせられる、数少ない手段のひとつである。",
                    },
                    {
                      question: 'なぜ **2 台のマシンで validator を重複稼働させる** と、たいてい冗長化ではなく **slashing** につながるのか?',
                      options: [
                        'Slashing は validator の構成とは無関係だから。',
                        '両マシンが同じ鍵を持つことになる。両方が同じ height/round で attestation に署名し、両署名は valid である。ネットワークから見ると、同じアイデンティティから矛盾する 2 つの署名が出てきている — まさに **slashable な equivocation** だ。冗長化の試みが slashing 違反に化けてしまう。',
                        '2 マシン構成は Ethereum の仕様で禁止されているから。',
                        "重複 validator は帯域を消費しすぎるから。",
                      ],
                      correctIndex: 1,
                      explanation: 'これが古典的な「慎重にやろうとして slashed される」パターンである。正しい修正は、failover を厳格に行う active-passive 構成 (常に 1 ノードだけが署名権限を持ち、遷移はコンセンサスプロトコル経由のみ)。さらに望ましいのは、鍵を持つ側がプロトコルレベルで single-signing を強制する remote signer アーキテクチャを採用することだ。',
                    },
                    {
                      question: 'なぜ **slashing-protection データベース** は **署名者と同じマシン上** に置く必要があるのか?',
                      options: [
                        'レイテンシの問題に過ぎないから。',
                        "DB への書き込みと署名操作が **atomic** に行われなければならないからだ — 両方成功するか、両方失敗するかのいずれかしかありえない。ネットワーク越しのリモート DB を挟むと、署名は済んだのに DB 更新が失敗するという窓 (たとえばネットワーク不調時) が生まれ、再試行によって同じ高さに再度署名してしまう可能性がある。Atomicity は、再試行時の double-sign を防ぐために必須である。",
                        'EIP-3076 が明示的にそう要求しているから。',
                        "ネットワーク呼び出しは遅すぎるから。",
                      ],
                      correctIndex: 1,
                      explanation: '本質は atomic 操作の要件である。同一プロセス内のローカル DB + signer なら atomic に保てる。リモート DB を挟むとレースコンディションが入り込む。この「atomic」保証こそが slashing-protection 全体のセキュリティモデルの土台になっている。',
                    },
                    {
                      question: 'Validator がネットワーク分断の片側にいる。**分断中に署名を続けるべきか?**',
                      options: [
                        'Yes、ただちに署名を再開する。',
                        "**No、分断中は署名を停止する**。続行すれば fork 側にいる可能性があり、ネットワークの残りが目にしないブロックを生成しているかもしれない。分断が解消したとき、自分の chain が誤っていれば canonical chain と equivocate することになり、slashed される。小さな inactivity ペナルティを払うほうが、大きな slashing ペナルティを払うよりはるかに良い。",
                        "オペレータの指示があったときだけ署名を停止する。",
                        '分断中は署名そのものが不可能である。',
                      ],
                      correctIndex: 1,
                      explanation: '署名を止めるのが正しいデフォルトだ。Inactivity ペナルティは小さく、slashing ペナルティは大きい。Validator は「自分は分断側にいるかもしれない」ことを検知し、>2/3 の peer との接続性を確認できるまで署名を拒否すべきである。これが「不確実なときは fail-closed」というコアな safety 性質である。',
                    },
                    {
                      question: '協調 hardfork において **validator が全員同時にアップグレードしない** のはなぜか? 正しい瞬間に新ルールへ切り替わることを保証しているのは何か?',
                      options: [
                        'Hardfork はチャットルームを使った手動協調を要するから。',
                        'Chain spec に **activation block height (またはタイムスタンプ)** がエンコードされている: そのブロックに到達した時点で新ルールが適用される。Validator は activation の *前* にアップグレードしておけばよく、早くても遅くてもかまわない。Activation block の到来とともに、コンセンサスが新ルールを強制する。アップグレードしていない validator は旧ルールのまま動き続けて fork から脱落するが、アップグレードして sync すれば再合流できる。',
                        'Fork は runtime に過半数の投票によって発火するから。',
                        'Hardfork は Ethereum のみがサポートしているから。',
                      ],
                      correctIndex: 1,
                      explanation: 'Height-gate ルールこそが鍵である。オペレータには各自アップグレードする時間が数週間与えられる。Activation block の瞬間、全員が同じルールに揃い、間に合わなかった者だけが脱落する。回復経路もシンプル (アップグレードして sync するだけ)。主要なすべての chain がこの方式でアップグレードを協調している。',
                    },
                    {
                      question: 'なぜ **withdrawal 鍵** は cold で、**署名鍵** はオンラインなのか?',
                      options: [
                        "すべての鍵を cold storage に置くべきだから。",
                        "関心事の分離を行うためである。署名鍵は attestation/proposal を行うためオンラインである必要があり (漏洩すれば slashable となり、最悪の場合 hot stake を失う)、一方 withdrawal 鍵は実際に staked された資金を支配するため cold に保たれる。こうしておけば、署名鍵を侵害されたとしても攻撃者は資金そのものを動かせない。",
                        'EIP-2335 が withdrawal 鍵を cold にすることを要求しているから。',
                        "Hot 鍵は withdrawal に使えないから。",
                      ],
                      correctIndex: 1,
                      explanation: 'Defense in depth の典型例である。署名鍵が漏れたときの最悪ケースは validator が slashed されることだが、withdrawal credential が cold にあれば staked balance の全額は守られる。真剣な validator 構成における標準であり、これを欠くと鍵漏洩は壊滅的な結末を招く。',
                    },
                    {
                      question: 'PoS chain の **whistleblower 報酬** とは何で、何を可能にしているのか?',
                      options: [
                        "すべての validator に対する固定の日次支払い。",
                        "誰かが slashing proof (矛盾する 2 つの署名) を提出すると、slashed された stake のごく一部 (典型的には ~1/512) を受け取れる仕組みである。これが **独立した watcher** が chain を監視して slashing proof を提出するための経済的インセンティブを生み、誰が見張るかを誰も指定しなくてもプロトコルが強制される — つまり permissionless な強制が成立する。",
                        '完璧な uptime を維持する validator に支払われるボーナス。',
                        '遅延した attestation に対するペナルティ。',
                      ],
                      correctIndex: 1,
                      explanation: 'Whistleblower 報酬は slashing 検知を経済ゲームに変える。Double-sign を見つけられる者なら誰でも利益を得られる。プロトコルの integrity が中央集権的な当事者に依存しなくなり、見張ろうとする者なら誰でも強制できる — permissionless な分散化にとって決定的に重要な仕組みである。',
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
