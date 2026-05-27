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
