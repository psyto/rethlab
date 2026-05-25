#!/usr/bin/env tsx
/**
 * Build prisma/seed-reth-openhl-liquidation-{en,ja}.ts from drafts/openhl_liquidation_*.md.
 *
 * Sister script of build-openhl-funding-seed.ts. Same extraction logic, different
 * draft file naming convention (openhl_liquidation_l<N>_<locale>.md), different
 * output filename, different course metadata.
 *
 * Covers L0..L13 — the full Liquidation course: Stage 10a (margin math),
 * Stage 10b (insurance fund + close-outcome decomposition), and Stage 10c
 * (multi-account scanner + capstone). 13 lessons / 5 modules. The next
 * stage in the openhl roadmap (Stage 10d, ADL — auto-deleveraging) will be
 * a separate course.
 *
 * Run from rethlab root:
 *   npx tsx .github/scripts/build-openhl-liquidation-seed.ts            # generates EN
 *   npx tsx .github/scripts/build-openhl-liquidation-seed.ts --locale=ja # generates JA
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const RETHLAB_ROOT = join(SCRIPT_DIR, '..', '..');
const DRAFTS_DIR = join(RETHLAB_ROOT, 'drafts');

type Locale = 'en' | 'ja';

interface LessonSpec {
  draftFile: string;
  moduleNumber: number;
  sortOrder: number;
  title: string;
  slug: string;
  duration: number;
  xpReward: number;
  h1Marker: string;
  startSignature: string;
}

interface LocaleConfig {
  outputFileName: string;
  exportName: string;
  course: {
    slug: string;
    title: string;
    description: string;
    track: string;
    instructorName: string;
  };
  modules: Record<number, { title: string; sortOrder: number }>;
  lessons: LessonSpec[];
}

// ──────────────────────────────────────────────────────────────
// EN configuration
// ──────────────────────────────────────────────────────────────

const EN: LocaleConfig = {
  outputFileName: 'seed-reth-openhl-liquidation-en.ts',
  exportName: 'seedRethOpenHlLiquidationEN',
  course: {
    slug: 'building-openhl-liquidation-en',
    title: 'Build OpenHL Liquidation — perpetual position liquidation engine',
    description:
      "Build the perpetual-position liquidation engine end-to-end: the pure-compute layer that classifies accounts (Safe / AtRisk / Liquidatable / Underwater) from margin ratios and generates close-order specs, the insurance-fund state machine that absorbs deficits via a three-variant outcome enum (Covered / PartiallyDrained / Depleted), and the multi-account scanner that ties them into a single orchestration loop the bridge calls once per block. Includes the leveraged-regime non-monotonicity discovery, three layers of conservation-law proptests that compose vertically, the credit/debit decomposition that bridges pure compute and stateful book-keeping, and the discriminated-dispatch pattern via debug_assert! pairs. 14 lessons (L0–L13) across 5 modules, byte-for-byte against openhl's full Stage 10 trilogy (margin math + insurance fund + scanner). The fifth course in the DIY Perp series.",
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Types', sortOrder: 1 },
    2: { title: 'Pure compute', sortOrder: 2 },
    3: { title: 'Insurance fund', sortOrder: 3 },
    4: { title: 'Scanner & capstone', sortOrder: 4 },
  },
  lessons: [
    {
      draftFile: 'openhl_liquidation_l0_en.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'Build OpenHL Liquidation — perpetual position liquidation engine',
      slug: 'openhl-liquidation-orientation-en',
      duration: 15,
      xpReward: 50,
      h1Marker: '# Build OpenHL Liquidation — perpetual position liquidation engine',
      startSignature: 'The previous course',
    },
    {
      draftFile: 'openhl_liquidation_l1_en.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'Lesson 1 — MARGIN_SCALE + LiquidationParams — the dials on the risk engine',
      slug: 'openhl-liquidation-margin-scale-en',
      duration: 30,
      xpReward: 60,
      h1Marker:
        '# Lesson 1 — `MARGIN_SCALE` + `LiquidationParams` — the dials on the risk engine',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l2_en.md',
      moduleNumber: 1,
      sortOrder: 1,
      title:
        'Lesson 2 — MarginRatio + MarginHealth — the classification types the engine returns',
      slug: 'openhl-liquidation-margin-types-en',
      duration: 25,
      xpReward: 50,
      h1Marker:
        '# Lesson 2 — `MarginRatio` + `MarginHealth` — the classification types the engine returns',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l3_en.md',
      moduleNumber: 1,
      sortOrder: 2,
      title: "Lesson 3 — AccountSnapshot + CloseOrderSpec — the engine's input and output types",
      slug: 'openhl-liquidation-snapshot-spec-en',
      duration: 25,
      xpReward: 50,
      h1Marker:
        "# Lesson 3 — `AccountSnapshot` + `CloseOrderSpec` — the engine's input and output types",
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l4_en.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'Lesson 4 — notional_value + unrealized_pnl — the signed-multiplication trick',
      slug: 'openhl-liquidation-notional-pnl-en',
      duration: 45,
      xpReward: 80,
      h1Marker:
        '# Lesson 4 — `notional_value` + `unrealized_pnl` — the signed-multiplication trick',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l5_en.md',
      moduleNumber: 2,
      sortOrder: 1,
      title:
        'Lesson 5 — account_equity + margin_ratio — and the proptest that breaks your first mental model',
      slug: 'openhl-liquidation-equity-ratio-en',
      duration: 60,
      xpReward: 100,
      h1Marker:
        '# Lesson 5 — `account_equity` + `margin_ratio` — and the proptest that breaks your first mental model',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l6_en.md',
      moduleNumber: 2,
      sortOrder: 2,
      title: 'Lesson 6 — margin_health — the classification cascade and boundary semantics',
      slug: 'openhl-liquidation-margin-health-en',
      duration: 30,
      xpReward: 60,
      h1Marker:
        '# Lesson 6 — `margin_health` — the classification cascade and boundary semantics',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l7_en.md',
      moduleNumber: 2,
      sortOrder: 3,
      title: "Lesson 7 — close_order_spec — Stage 10a's last function",
      slug: 'openhl-liquidation-close-order-spec-en',
      duration: 20,
      xpReward: 40,
      h1Marker: "# Lesson 7 — `close_order_spec` — Stage 10a's last function",
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l8_en.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'Lesson 8 — InsuranceFund — where the crate stops being pure',
      slug: 'openhl-liquidation-insurance-fund-intro-en',
      duration: 25,
      xpReward: 50,
      h1Marker: '# Lesson 8 — `InsuranceFund` — where the crate stops being pure',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l9_en.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'Lesson 9 — withdraw_shortfall — the Layer 2 → Layer 3 boundary as code',
      slug: 'openhl-liquidation-withdraw-shortfall-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 9 — `withdraw_shortfall` — the Layer 2 → Layer 3 boundary as code',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l10_en.md',
      moduleNumber: 3,
      sortOrder: 2,
      title:
        'Lesson 10 — liquidation_fee + close-outcome decomposition — the bridge between compute and insurance',
      slug: 'openhl-liquidation-close-outcome-decomposition-en',
      duration: 35,
      xpReward: 70,
      h1Marker:
        '# Lesson 10 — `liquidation_fee` + close-outcome decomposition — the bridge between `compute` and `insurance`',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l11_en.md',
      moduleNumber: 4,
      sortOrder: 0,
      title:
        'Lesson 11 — Scanner type vocabulary — CloseOutcomeKind, LiquidationRecord, ScanReport, LiquidationScanner',
      slug: 'openhl-liquidation-scanner-types-en',
      duration: 25,
      xpReward: 50,
      h1Marker:
        '# Lesson 11 — Scanner type vocabulary — `CloseOutcomeKind`, `LiquidationRecord`, `ScanReport`, `LiquidationScanner`',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l12_en.md',
      moduleNumber: 4,
      sortOrder: 1,
      title: 'Lesson 12 — scan — the orchestration heart of the safety cascade',
      slug: 'openhl-liquidation-scan-method-en',
      duration: 35,
      xpReward: 70,
      h1Marker: '# Lesson 12 — `scan` — the orchestration heart of the safety cascade',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_liquidation_l13_en.md',
      moduleNumber: 4,
      sortOrder: 2,
      title:
        'Lesson 13 — Scanner capstone — 6 nuanced unit tests + 4 invariant proptests + the Stage 10 retrospective',
      slug: 'openhl-liquidation-scanner-capstone-en',
      duration: 40,
      xpReward: 80,
      h1Marker:
        '# Lesson 13 — Scanner capstone — 6 nuanced unit tests + 4 invariant proptests + the Stage 10 retrospective',
      startSignature: "Concepts you'll grasp in this lesson",
    },
  ],
};

// ──────────────────────────────────────────────────────────────
// JA configuration
// ──────────────────────────────────────────────────────────────

const JA: LocaleConfig = {
  outputFileName: 'seed-reth-openhl-liquidation-ja.ts',
  exportName: 'seedRethOpenHlLiquidationJA',
  course: {
    slug: 'building-openhl-liquidation-ja',
    title: 'OpenHL Liquidation 開発ガイド：レバレッジ環境における非単調性の発見と清算エンジンの構築',
    description:
      '永久先物（Perpetual Futures）の清算エンジン中核をEnd-to-Endで実装する、DIY Perpシリーズ第5弾。\n\nアカウントの4フェーズ分類（pure compute）、保険基金（Insurance Fund）のステートマシン、そしてマルチアカウント・スキャナーを1つのオーケストレーション・ループへ結合します。さらに、レバレッジ環境特有の「非単調性」を proptest で炙り出す手法や、debug_assert! による契約検証まで網羅。Stage 10三部作に対応する全14レッスンを通じ、バイト単位（Byte-for-byte）で一致する堅牢な実装を構築します。',
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: '型', sortOrder: 1 },
    2: { title: '純粋な compute', sortOrder: 2 },
    3: { title: '保険基金', sortOrder: 3 },
    4: { title: 'Scanner & capstone', sortOrder: 4 },
  },
  lessons: [
    {
      draftFile: 'openhl_liquidation_l0_ja.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'OpenHL Liquidation を作る — 永久先物ポジション liquidation エンジン',
      slug: 'openhl-liquidation-orientation-ja',
      duration: 15,
      xpReward: 50,
      h1Marker: '# OpenHL Liquidation を作る — 永久先物ポジション liquidation エンジン',
      startSignature: '前のコース',
    },
    {
      draftFile: 'openhl_liquidation_l1_ja.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'レッスン 1 — MARGIN_SCALE + LiquidationParams — リスクエンジンのダイヤル',
      slug: 'openhl-liquidation-margin-scale-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 1 — `MARGIN_SCALE` + `LiquidationParams` — リスクエンジンのダイヤル',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l2_ja.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'レッスン 2 — MarginRatio + MarginHealth — エンジンが返す分類型',
      slug: 'openhl-liquidation-margin-types-ja',
      duration: 25,
      xpReward: 50,
      h1Marker: '# レッスン 2 — `MarginRatio` + `MarginHealth` — エンジンが返す分類型',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l3_ja.md',
      moduleNumber: 1,
      sortOrder: 2,
      title: 'レッスン 3 — AccountSnapshot + CloseOrderSpec — エンジンの入出力型',
      slug: 'openhl-liquidation-snapshot-spec-ja',
      duration: 25,
      xpReward: 50,
      h1Marker: '# レッスン 3 — `AccountSnapshot` + `CloseOrderSpec` — エンジンの入出力型',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l4_ja.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'レッスン 4 — notional_value + unrealized_pnl — signed-multiplication のトリック',
      slug: 'openhl-liquidation-notional-pnl-ja',
      duration: 45,
      xpReward: 80,
      h1Marker:
        '# レッスン 4 — `notional_value` + `unrealized_pnl` — signed-multiplication のトリック',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l5_ja.md',
      moduleNumber: 2,
      sortOrder: 1,
      title:
        'レッスン 5 — account_equity + margin_ratio — そして最初のメンタルモデルを壊す proptest',
      slug: 'openhl-liquidation-equity-ratio-ja',
      duration: 60,
      xpReward: 100,
      h1Marker:
        '# レッスン 5 — `account_equity` + `margin_ratio` — そして最初のメンタルモデルを壊す proptest',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l6_ja.md',
      moduleNumber: 2,
      sortOrder: 2,
      title: 'レッスン 6 — margin_health — 分類カスケードと境界セマンティクス',
      slug: 'openhl-liquidation-margin-health-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 6 — `margin_health` — 分類カスケードと境界セマンティクス',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l7_ja.md',
      moduleNumber: 2,
      sortOrder: 3,
      title: 'レッスン 7 — close_order_spec — Stage 10a の最後の関数',
      slug: 'openhl-liquidation-close-order-spec-ja',
      duration: 20,
      xpReward: 40,
      h1Marker: '# レッスン 7 — `close_order_spec` — Stage 10a の最後の関数',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l8_ja.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'レッスン 8 — InsuranceFund — クレートが純粋でなくなる地点',
      slug: 'openhl-liquidation-insurance-fund-intro-ja',
      duration: 25,
      xpReward: 50,
      h1Marker: '# レッスン 8 — `InsuranceFund` — クレートが純粋でなくなる地点',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l9_ja.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'レッスン 9 — withdraw_shortfall — Layer 2 → Layer 3 境界をコードで表現する',
      slug: 'openhl-liquidation-withdraw-shortfall-ja',
      duration: 30,
      xpReward: 60,
      h1Marker:
        '# レッスン 9 — `withdraw_shortfall` — Layer 2 → Layer 3 境界をコードで表現する',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l10_ja.md',
      moduleNumber: 3,
      sortOrder: 2,
      title:
        'レッスン 10 — liquidation_fee + close-outcome decomposition — compute と insurance をつなぐ橋',
      slug: 'openhl-liquidation-close-outcome-decomposition-ja',
      duration: 35,
      xpReward: 70,
      h1Marker:
        '# レッスン 10 — `liquidation_fee` + close-outcome decomposition — `compute` と `insurance` をつなぐ橋',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l11_ja.md',
      moduleNumber: 4,
      sortOrder: 0,
      title:
        'レッスン 11 — Scanner 型の語彙 — CloseOutcomeKind、LiquidationRecord、ScanReport、LiquidationScanner',
      slug: 'openhl-liquidation-scanner-types-ja',
      duration: 25,
      xpReward: 50,
      h1Marker:
        '# レッスン 11 — Scanner 型の語彙 — `CloseOutcomeKind`、`LiquidationRecord`、`ScanReport`、`LiquidationScanner`',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l12_ja.md',
      moduleNumber: 4,
      sortOrder: 1,
      title: 'レッスン 12 — scan — safety cascade のオーケストレーションの心臓',
      slug: 'openhl-liquidation-scan-method-ja',
      duration: 35,
      xpReward: 70,
      h1Marker: '# レッスン 12 — `scan` — safety cascade のオーケストレーションの心臓',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_liquidation_l13_ja.md',
      moduleNumber: 4,
      sortOrder: 2,
      title:
        'レッスン 13 — Scanner capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Stage 10 retrospective',
      slug: 'openhl-liquidation-scanner-capstone-ja',
      duration: 40,
      xpReward: 80,
      h1Marker:
        '# レッスン 13 — Scanner capstone — 6 個の nuanced unit test + 4 個の invariant proptest + Stage 10 retrospective',
      startSignature: 'このレッスンで掴む概念',
    },
  ],
};

const LOCALES: Record<Locale, LocaleConfig> = { en: EN, ja: JA };

// ──────────────────────────────────────────────────────────────
// Generator (same shape as build-openhl-funding-seed.ts)
// ──────────────────────────────────────────────────────────────

interface Lesson {
  moduleNumber: number;
  sortOrder: number;
  title: string;
  slug: string;
  duration: number;
  xpReward: number;
  content: string;
}

const COURSE_SHARED = {
  difficulty: 'EXPERT' as const,
  duration: 440, // L0..L13 total: 15+30+25+25+45+60+30+20+25+30+35+25+35+40
  xpReward: 870, // L0..L13 total: 50+60+50+50+80+100+60+40+50+60+70+50+70+80
  tags: ['reth', 'evm', 'liquidation', 'perpetual', 'l1', 'openhl', 'expert'],
  sortOrder: 1000,
  isPublished: true,
};

function escapeForTemplateLiteral(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function extractLessonBody(draft: string, h1Marker: string, startSig: string): string {
  const fenceRe = /^````markdown\s*$/m;
  const closeFenceRe = /^````\s*$/m;

  let cursor = 0;
  while (cursor < draft.length) {
    const fenceMatch = fenceRe.exec(draft.slice(cursor));
    if (!fenceMatch) break;
    const startOfBody = cursor + fenceMatch.index + fenceMatch[0].length + 1;
    const remainderForClose = draft.slice(startOfBody);
    const closeMatch = closeFenceRe.exec(remainderForClose);
    if (!closeMatch) break;
    const body = remainderForClose.slice(0, closeMatch.index).replace(/\n$/, '');

    if (body.startsWith(h1Marker) && body.includes(startSig)) {
      return body;
    }
    cursor = startOfBody + closeMatch.index + closeMatch[0].length + 1;
  }
  throw new Error(`Could not find lesson body with H1 "${h1Marker}" in draft`);
}

async function buildLesson(spec: LessonSpec): Promise<Lesson> {
  const draftPath = join(DRAFTS_DIR, spec.draftFile);
  const draft = await readFile(draftPath, 'utf8');
  const body = extractLessonBody(draft, spec.h1Marker, spec.startSignature);
  const escaped = escapeForTemplateLiteral(body);
  return {
    moduleNumber: spec.moduleNumber,
    sortOrder: spec.sortOrder,
    title: spec.title,
    slug: spec.slug,
    duration: spec.duration,
    xpReward: spec.xpReward,
    content: escaped,
  };
}

function renderSeedFile(locale: Locale, lessons: Lesson[]): string {
  const config = LOCALES[locale];
  const { course, modules, exportName } = config;

  const lessonsByModule = new Map<number, Lesson[]>();
  for (const l of lessons) {
    const arr = lessonsByModule.get(l.moduleNumber) ?? [];
    arr.push(l);
    lessonsByModule.set(l.moduleNumber, arr);
  }

  const moduleBlocks = [...lessonsByModule.entries()]
    .sort(([a], [b]) => a - b)
    .map(([num, mLessons]) => {
      const module = modules[num];
      const lessonBlocks = mLessons
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(
          (l) => `                {
                  title: ${JSON.stringify(l.title)},
                  slug: ${JSON.stringify(l.slug)},
                  type: 'CONTENT',
                  sortOrder: ${l.sortOrder},
                  duration: ${l.duration},
                  xpReward: ${l.xpReward},
                  content: \`${l.content}\`,
                }`,
        )
        .join(',\n');
      return `          {
            title: ${JSON.stringify(module.title)},
            sortOrder: ${module.sortOrder},
            lessons: {
              create: [
${lessonBlocks},
              ],
            },
          }`;
    })
    .join(',\n');

  return `// AUTO-GENERATED from drafts/openhl_liquidation_*_${locale}.md by .github/scripts/build-openhl-liquidation-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function ${exportName}(prisma: PrismaClient) {
  const tags = ${JSON.stringify(COURSE_SHARED.tags)};

  await prisma.course.create({
    data: {
      slug: ${JSON.stringify(course.slug)},
      title: ${JSON.stringify(course.title)},
      description:
        ${JSON.stringify(course.description)},
      difficulty: ${JSON.stringify(COURSE_SHARED.difficulty)},
      duration: ${COURSE_SHARED.duration},
      xpReward: ${COURSE_SHARED.xpReward},
      track: ${JSON.stringify(course.track)},
      tags,
      isPublished: ${COURSE_SHARED.isPublished},
      sortOrder: ${COURSE_SHARED.sortOrder},
      locale: ${JSON.stringify(locale)},
      instructorName: ${JSON.stringify(course.instructorName)},
      modules: {
        create: [
${moduleBlocks},
        ],
      },
    },
  });
}
`;
}

function parseLocale(argv: string[]): Locale {
  const arg = argv.find((a) => a.startsWith('--locale='));
  if (!arg) return 'en';
  const value = arg.slice('--locale='.length);
  if (value !== 'en' && value !== 'ja') {
    throw new Error(`Invalid --locale=${value}; must be en or ja`);
  }
  return value;
}

async function main(): Promise<void> {
  const locale = parseLocale(process.argv.slice(2));
  const config = LOCALES[locale];
  const outPath = join(RETHLAB_ROOT, 'prisma', config.outputFileName);

  console.log(`Building openhl-liquidation seed file (locale=${locale}) from drafts...`);
  console.log(`  drafts:  ${DRAFTS_DIR}`);
  console.log(`  output:  ${outPath}`);

  const lessons: Lesson[] = [];
  for (const spec of config.lessons) {
    try {
      const lesson = await buildLesson(spec);
      lessons.push(lesson);
      console.log(`  ✓ ${spec.slug.padEnd(45)} (M${spec.moduleNumber}.${spec.sortOrder})`);
    } catch (err) {
      console.error(`  ✗ ${spec.slug}: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  const seedFile = renderSeedFile(locale, lessons);
  await writeFile(outPath, seedFile, 'utf8');
  console.log();
  console.log(
    `Wrote ${lessons.length} lessons across ${new Set(lessons.map((l) => l.moduleNumber)).size} modules.`,
  );
  console.log(`Output: ${outPath}`);
}

main().catch((err: unknown) => {
  console.error('UNCAUGHT:', err);
  process.exit(2);
});
