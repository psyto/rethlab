import { PrismaClient } from '@prisma/client';

export async function seedRethValidatorOpsBootcampJA(prisma: PrismaClient) {
  const tags = ['reth', 'validator', 'ops', 'runbook', 'incident', 'sre', 'l1'];

  await prisma.course.create({
    data: {
      slug: 'reth-validator-ops-bootcamp-ja',
      title: 'Validator Ops Bootcamp — Runbook・障害対応・復旧',
      description:
        '実行可能な運用演習コース。SLO/SLI設計、障害検知、二重署名封じ込め、ロールバック復旧をコマンド付きで検証する。',
      difficulty: 'ADVANCED',
      duration: 170,
      xpReward: 520,
      track: 'reth-l1-architect',
      tags,
      isPublished: true,
      sortOrder: 350,
      locale: 'ja',
      instructorName: 'RethLab',
      modules: {
        create: [
          {
            title: 'Runbook Foundations',
            sortOrder: 0,
            lessons: {
              create: [
                {
                  title: 'Validator運用のSLO/SLI設計',
                  slug: 'validator-ops-slo-sli-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 28,
                  xpReward: 90,
                  content: `# Validator運用のSLO/SLI設計

30 分間 attestation を取りこぼした validator は inflation reward を逃し、長時間オフラインを罰するチェーンでは *liveness* slashing の引き金にもなる。1 度の double-sign で stake の数十パーセントが消える chain もある。**劣化コストは線形ではなく、次にどの劣化が損失を引き起こすかは事前にわからない。** だから validator 運用は *予算* の規律になる — 1 四半期にどれだけの劣化を許すか、その予算をチームがどう使うか、そして runbook が「何か変だ」を「今すぐ誰かを page する」にどう変換するか。

本レッスンは、ブートキャンプ全体で「何のために起きるべきか」を語る共通言語 — **SLI**、**SLO**、**error budget** — を据える。

## 1. SLI と SLO — 2 行の定義

- **SLI (Service Level Indicator)**: validator について *測定できる数字* のこと。例: 秒単位の head lag、直近 1 時間の attestation 成功率、p99 import latency、peer 数。
- **SLO (Service Level Objective)**: SLI に対して期間付きで commit する *目標値* のこと。例:「直近 7 日間のうち 99.5% の時間で head lag < 6 秒」。

SLO は on-call ローテーションが守る対象。SLI はダッシュボードに映る対象。**SLI のない SLO は願望、SLO のない SLI はただの telemetry である。**

## 2. Reth validator にとって load-bearing な 4 つの SLI

百個の metric を入れることもできるが、どの validator チームも最低限これら 4 つは追っている。

| SLI | 何を測るか | なぜ load-bearing か |
| :--- | :--- | :--- |
| **Head lag** | \`(network_head_block - local_head_block)\` の秒数 | 単一で最も状況を要約する信号。chain から遅れていれば、古い state で attest しているか、slot を取りこぼしている。 |
| **Attestation participation** | 直近 N slot のうち実際に出した attestation の割合 | 直接の経済信号 — 取りこぼした attestation は全て逃した reward。 |
| **Import latency p99** | 「peer から block を受信」から「実行して canonical chain に追加」までの時間 | 遅い EVM 実行、ディスクの逼迫、データベース compaction の stall を、head lag に波及する前に拾える。 |
| **Peer churn rate** | 1 分あたりの接続獲得/喪失数 | sync の異常、network partition、eclipse 攻撃の早期警告。 |

他に計測する指標（RAM、ディスク、network 帯域、signer の uptime）は *二次的* — 上の 4 つが動いた *理由* を説明するが、それ自体は最前線の信号ではない。

## 3. SLI から SLO — 目標値の決め方

目標は数字だが、間違った数字を選ぶと「役立つ page」と「アラート疲れ」を分けるラインを越えてしまう。Ethereum mainnet や OP-stack チェーン上の single-chain Reth validator にとって、出発点として有用な 3 つの SLO:

| SLO | 目標 | 根拠 |
| :--- | :--- | :--- |
| **Head lag** | 任意の 7 日間で **99.5%** の時間が < 6 秒 | 1 slot の余裕は OK、3 slot は問題、6 slot は *liveness* レベル。 |
| **Attestation participation** | rolling 24 時間で ≥ **99.0%** | 95% を切ると inflation reward に有意な影響、99% を切れば理由を知っているべき。 |
| **Import latency p99** | rolling 24 時間で **99.0%** の block が < 1500ms | Ethereum mainnet の block time は ~12 秒。1 回の import が 1.5 秒を超えると per-slot 予算の大半を食う。 |

これは *出発点*。実際の運用チームは stake サイズ、chain の経済性、週末に page される耐性に応じて調整する。**規律は数字を暗記することではなく、書き留めて四半期ごとに見直すこと。**

## 4. Error budget — 規律の方針側

SLO が「99.5% の時間 head lag が 6 秒未満」なら、暗黙のうちに **0.5% の out-of-SLO 時間** という予算を自分に与えている — 週あたりおよそ 50 分。これが *error budget* である。

方針: **予算が燃えているときチームは何をするか?** 知っておくべき 3 段階:

- **Green (予算健全)** — upgrade を出す、drill を走らせる、リスクを取る。
- **Yellow (予算 >50% 消費、ウィンドウの半分以上残)** — 緊急性のない変更を停止、直近の burn を post-mortem、secondary on-call を投入して調査。
- **Red (予算枯渇)** — deploy を凍結、実験的な機能（custom precompile、新しい gossip protocol）を停止、根本原因を解消してから再開。

ブートキャンプが矯正する 2 つのアンチパターン: (a) **方針を暗黙のままにする**（「起きたときに考える」— 実際には考えず、その場しのぎで悪化させる）。(b) **Green を「何もしない」と解釈する**。Green は予防的な仕事をするタイミング、Red は予防的な仕事をする余裕がないタイミング。

## 5. Alert tier — SLI を page に変える

SLI ダッシュボードは「今どうか」を見せる。Alert routing は「今すぐ人間が必要か」を決める。最小限の 3 段階:

| Tier | Trigger | 通知先 |
| :--- | :--- | :--- |
| **PAGE** | SLI 違反が 60 秒以上継続（または double-sign の兆候が出た任意の時点） | primary on-call の電話、5 分応答無しで secondary のチャット |
| **TICKET** | SLI 違反が 60 秒未満、または error budget が >50% 消費されていて 5 日以上残っている | on-call チャンネル、電話なし、次の standup で議論 |
| **LOG** | tier-2 閾値に達しない異常 | metrics アーカイブ、ダッシュボード |

PAGE は on-call が *acknowledge して放置できない* もの — double-sign の可能性、head が stuck している、validator が 1 slot 以上オフライン。それ以外は TICKET か LOG。**誤 PAGE のコストは高い（睡眠）が、見逃した実 PAGE のコストはもっと高い（slashing、reward 喪失、評判失墜）。** page 寄りに振っておき、実アクションに繋がらない page は容赦なくチューニングで削る。

> 🛑 **予測。** validator の head lag が 2 秒から 9 秒に跳ね上がり、90 秒間続いた後に回復した。**この事象は on-call を page すべきだったか?** SLO 違反 + 継続時間 + error budget への影響、の観点で先を読む前に答えを下書きする。

(答え: yes — 9 秒は 6 秒の SLO 目標を超えており、90 秒は PAGE tier の 60 秒継続閾値も大きく超える。回復後でも、このイベントは週 head lag error budget の ~3% を消費しており、次の standup で post-mortem 対象になる。)

## 前提

- ローカルでシェルコマンドを実行できること
- リポジトリのルートにいること

## 実行手順

1. 演習アセットを初期化:

\`\`\`bash
cd examples/validator-ops
./scripts/init-lab.sh
\`\`\`

期待出力:

\`\`\`text
[ok] lab initialized
\`\`\`

2. ベースライン確認:

\`\`\`bash
cat artifacts/metrics-baseline.json
\`\`\`

3. runbookを本文の内容で作成:

\`\`\`bash
cat > artifacts/validator-ops-runbook.md <<'EOF'
# Validator Ops Runbook

## Reliability Targets
- SLI-1: Head lag p95 < 2 blocks
- SLI-2: Import latency p95 < 500ms
- SLI-3: Missed proposal rate < 0.5%
- SLI-4: Unexpected signer switch = 0

## Alert tiers
- Ticket: trend watch only
- Page: immediate operator response (<= 10 min)
- Incident: multi-signal degradation with user impact

## Error budget policy
- Monthly reliability target: 99.9%
- 50% budget burn: freeze risky upgrades
- 100% budget burn: reliability-only sprint
EOF
\`\`\`

## 合格条件

- \`artifacts/validator-ops-runbook.md\` に以下がある
  - Reliability Targets
  - Alert tiers
  - Error budget policy

## 検証コマンド

\`\`\`bash
grep -n "Reliability Targets\|Alert tiers\|Error budget" artifacts/validator-ops-runbook.md
\`\`\`
`,
                },
                {
                  title: 'Validatorノードの監視スタック',
                  slug: 'validator-ops-observability-stack-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 28,
                  xpReward: 90,
                  content: `# Validatorノードの監視スタック

## 実行手順

1. 遅延インシデント信号を生成:

\`\`\`bash
cd examples/validator-ops
./scripts/simulate-head-lag.sh
cat artifacts/incident-head-lag.log
\`\`\`

2. runbookにDetection章を本文どおり追記:

\`\`\`bash
cat >> artifacts/validator-ops-runbook.md <<'EOF'

## Detection
1. local問題かネットワーク全体かを切り分ける
2. head lag と import latency の相関を確認する
3. peer churn と再接続の急増を確認する
4. PAGE 発報後 10 分以内に一次切り分けを完了する
EOF
\`\`\`

## 期待証跡

- \`artifacts/incident-head-lag.log\` に \`ALERT=PAGE\` が含まれる
- runbookに \`## Detection\` が追記されている

## 検証コマンド

\`\`\`bash
grep -q "ALERT=PAGE" artifacts/incident-head-lag.log && echo PASS
grep -n "^## Detection" artifacts/validator-ops-runbook.md
\`\`\`
`,
                },
              ],
            },
          },
          {
            title: 'Incident Drills',
            sortOrder: 1,
            lessons: {
              create: [
                {
                  title: '二重署名インシデント対応',
                  slug: 'validator-ops-double-sign-incident-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 32,
                  xpReward: 100,
                  content: `# 二重署名インシデント対応

## 実行手順

1. 二重署名インシデントを模擬:

\`\`\`bash
cd examples/validator-ops
./scripts/simulate-double-signer.sh
cat artifacts/incident-double-signer.log
\`\`\`

2. runbookに封じ込め手順を本文どおり追記:

\`\`\`bash
cat >> artifacts/validator-ops-runbook.md <<'EOF'

## Double-sign Containment
1. containment 開始を宣言し、書き込み経路を 1 系統に制限
2. secondary signer を停止
3. single-writer=PASS を確認
4. 鍵ローテーション計画を作成して再開条件を明文化

### Preventive controls
- signer lease lock
- 起動ガード（重複プロセス拒否）
- duplicate-signer アラート
EOF
\`\`\`

## 合格条件

- ログに \`single-writer=PASS\` がある
- runbookに Double-sign Containment 章がある

## 検証コマンド

\`\`\`bash
grep -q "single-writer=PASS" artifacts/incident-double-signer.log && echo PASS
grep -n "Double-sign Containment" artifacts/validator-ops-runbook.md
\`\`\`
`,
                },
                {
                  title: 'アップグレードのロールバック演習',
                  slug: 'validator-ops-upgrade-rollback-ja',
                  type: 'CONTENT',
                  sortOrder: 1,
                  duration: 32,
                  xpReward: 100,
                  content: `# アップグレードのロールバック演習

## 実行手順

1. ロールバック演習を実行:

\`\`\`bash
cd examples/validator-ops
./scripts/rollback-drill.sh
cat artifacts/rollback-drill.log
\`\`\`

2. runbookにロールバック章を本文どおり追記:

\`\`\`bash
cat >> artifacts/validator-ops-runbook.md <<'EOF'

## Rollback Procedure
1. canary 観測を 15 分実施し、閾値超過を判定する
2. 閾値超過時は即時ロールバックを発動する
3. rollback 後に head lag / import latency / signer 状態を再確認する
4. recovery PASS を満たしたら段階再開する
EOF
\`\`\`

## 合格条件

- ログに \`recovery PASS\` がある
- runbookに Rollback Procedure 章がある

## 検証コマンド

\`\`\`bash
grep -q "recovery PASS" artifacts/rollback-drill.log && echo PASS
grep -n "Rollback Procedure" artifacts/validator-ops-runbook.md
\`\`\`
`,
                },
              ],
            },
          },
          {
            title: 'Capstone',
            sortOrder: 2,
            lessons: {
              create: [
                {
                  title: 'Capstone — 本番runbookレビュー',
                  slug: 'validator-ops-capstone-runbook-ja',
                  type: 'CONTENT',
                  sortOrder: 0,
                  duration: 35,
                  xpReward: 140,
                  content: `# Capstone — 本番runbookレビュー

## ゴール

本文手順だけで以下の成果物を完成させる:

- \`artifacts/validator-ops-runbook.md\`
- \`artifacts/incident-head-lag.log\`
- \`artifacts/incident-double-signer.log\`
- \`artifacts/rollback-drill.log\`

## 最終検証

\`\`\`bash
cd examples/validator-ops
./scripts/verify-drill.sh
\`\`\`

期待出力:

\`\`\`text
[pass] validator-ops simulation checks passed
\`\`\`

## 合格条件

- 検証スクリプトがPASS
- runbookテンプレの全セクションを埋めている
- ドリル後の改善点を1つ以上説明できる

## 仕上げテンプレ

以下を runbook の末尾に追記し、改善アクションを明文化する:

\`\`\`bash
cat >> artifacts/validator-ops-runbook.md <<'EOF'

## Post-Incident Improvements
- 改善1:
- 改善2:
- 改善3:
EOF
\`\`\`
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
