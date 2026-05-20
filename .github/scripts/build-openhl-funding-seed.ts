#!/usr/bin/env tsx
/**
 * Build prisma/seed-reth-openhl-funding-{en,ja}.ts from drafts/openhl_funding_*.md.
 *
 * Sister script of build-openhl-precompiles-seed.ts. Same extraction logic, different
 * draft file naming convention (openhl_funding_l<N>_<locale>.md), different
 * output filename, different course metadata.
 *
 * Run from rethlab root:
 *   npx tsx .github/scripts/build-openhl-funding-seed.ts            # generates EN
 *   npx tsx .github/scripts/build-openhl-funding-seed.ts --locale=ja # generates JA
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
  outputFileName: 'seed-reth-openhl-funding-en.ts',
  exportName: 'seedRethOpenHlFundingEN',
  course: {
    slug: 'building-openhl-funding-en',
    title: 'Build OpenHL Funding — perpetual funding state machine',
    description:
      "Build the perpetual-funding state machine — a deterministic fixed-point pipeline (premium → rate → settlement) gated by an interval clock that enforces no-catch-up semantics. Pure state, no I/O; the integration into the bridge belongs to a later course. The fourth course in the DIY Perp series.",
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Determinism + types', sortOrder: 1 },
    2: { title: 'Pure compute', sortOrder: 2 },
    3: { title: 'Clock state machine', sortOrder: 3 },
    4: { title: 'Capstone', sortOrder: 4 },
  },
  lessons: [
    {
      draftFile: 'openhl_funding_l0_en.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'Build OpenHL Funding — perpetual funding state machine',
      slug: 'openhl-funding-orientation-en',
      duration: 15,
      xpReward: 50,
      h1Marker: '# Build OpenHL Funding — perpetual funding state machine',
      startSignature: 'The previous course',
    },
    {
      draftFile: 'openhl_funding_l1_en.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'Lesson 1 — RATE_SCALE — the constant that defends consensus',
      slug: 'openhl-funding-rate-scale-en',
      duration: 25,
      xpReward: 50,
      h1Marker: '# Lesson 1 — `RATE_SCALE` — the constant that defends consensus',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_funding_l2_en.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'Lesson 2 — Money types — newtypes for prices, premiums, and notional',
      slug: 'openhl-funding-money-types-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 2 — Money types — newtypes for prices, premiums, and notional',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_funding_l3_en.md',
      moduleNumber: 1,
      sortOrder: 2,
      title: 'Lesson 3 — Position types — finishing the roster + HL defaults',
      slug: 'openhl-funding-position-types-en',
      duration: 35,
      xpReward: 70,
      h1Marker: '# Lesson 3 — Position types — finishing the roster + HL defaults',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_funding_l4_en.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'Lesson 4 — compute_premium — first math, first tests',
      slug: 'openhl-funding-compute-premium-en',
      duration: 40,
      xpReward: 80,
      h1Marker: '# Lesson 4 — `compute_premium` — first math, first tests',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_funding_l5_en.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'Lesson 5 — Overflow philosophy + the first proptest',
      slug: 'openhl-funding-overflow-proptest-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 5 — Overflow philosophy + the first proptest',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_funding_l6_en.md',
      moduleNumber: 2,
      sortOrder: 2,
      title: 'Lesson 6 — compute_rate — divisor + cap',
      slug: 'openhl-funding-compute-rate-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 6 — `compute_rate` — divisor + cap',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_funding_l7_en.md',
      moduleNumber: 2,
      sortOrder: 3,
      title: 'Lesson 7 — apply_funding — sign convention + zero-sum proptest',
      slug: 'openhl-funding-apply-funding-en',
      duration: 40,
      xpReward: 80,
      h1Marker: '# Lesson 7 — `apply_funding` — sign convention + zero-sum proptest',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_funding_l8_en.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'Lesson 8 — FundingClock — the discrete event loop',
      slug: 'openhl-funding-clock-scaffold-en',
      duration: 35,
      xpReward: 70,
      h1Marker: '# Lesson 8 — `FundingClock` — the discrete event loop',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_funding_l9_en.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'Lesson 9 — Interval-gating invariant — three deeper tests',
      slug: 'openhl-funding-interval-invariant-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 9 — Interval-gating invariant — three deeper tests',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_funding_l10_en.md',
      moduleNumber: 3,
      sortOrder: 2,
      title: 'Lesson 10 — No-catch-up invariant — the design philosophy in one test',
      slug: 'openhl-funding-no-catchup-en',
      duration: 25,
      xpReward: 50,
      h1Marker: '# Lesson 10 — No-catch-up invariant — the design philosophy in one test',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_funding_l11_en.md',
      moduleNumber: 4,
      sortOrder: 0,
      title: "Lesson 11 — Capstone — what you built, what's deferred, what comes next",
      slug: 'openhl-funding-capstone-en',
      duration: 20,
      xpReward: 40,
      h1Marker: "# Lesson 11 — Capstone — what you built, what's deferred, what comes next",
      startSignature: 'You can sketch the funding pipeline',
    },
  ],
};

// ──────────────────────────────────────────────────────────────
// JA configuration
// ──────────────────────────────────────────────────────────────

const JA: LocaleConfig = {
  outputFileName: 'seed-reth-openhl-funding-ja.ts',
  exportName: 'seedRethOpenHlFundingJA',
  course: {
    slug: 'building-openhl-funding-ja',
    title: 'OpenHL Funding を作る — 永久先物 funding state machine',
    description:
      '永久先物 funding の state machine を構築する。固定小数点で deterministic な数学パイプライン (premium → rate → settlement) を、no-catch-up セマンティクスを強制する interval clock で gate する。Pure state で I/O なし — bridge への統合は後続のコースで扱う。DIY Perp シリーズの 4 つ目のコース。',
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Determinism と型', sortOrder: 1 },
    2: { title: '純粋な compute', sortOrder: 2 },
    3: { title: 'Clock state machine', sortOrder: 3 },
    4: { title: 'Capstone', sortOrder: 4 },
  },
  lessons: [
    {
      draftFile: 'openhl_funding_l0_ja.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'OpenHL Funding を作る — 永久先物 funding state machine',
      slug: 'openhl-funding-orientation-ja',
      duration: 15,
      xpReward: 50,
      h1Marker: '# OpenHL Funding を作る — 永久先物 funding state machine',
      startSignature: '前コース',
    },
    {
      draftFile: 'openhl_funding_l1_ja.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'レッスン 1 — RATE_SCALE — consensus を守る定数',
      slug: 'openhl-funding-rate-scale-ja',
      duration: 25,
      xpReward: 50,
      h1Marker: '# レッスン 1 — `RATE_SCALE` — consensus を守る定数',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_funding_l2_ja.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'レッスン 2 — Money 型 — price、premium、notional の newtype',
      slug: 'openhl-funding-money-types-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 2 — Money 型 — price、premium、notional の newtype',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_funding_l3_ja.md',
      moduleNumber: 1,
      sortOrder: 2,
      title: 'レッスン 3 — Position 型 — roster 完成 + HL デフォルト',
      slug: 'openhl-funding-position-types-ja',
      duration: 35,
      xpReward: 70,
      h1Marker: '# レッスン 3 — Position 型 — roster 完成 + HL デフォルト',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_funding_l4_ja.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'レッスン 4 — compute_premium — 最初の数学、最初のテスト',
      slug: 'openhl-funding-compute-premium-ja',
      duration: 40,
      xpReward: 80,
      h1Marker: '# レッスン 4 — `compute_premium` — 最初の数学、最初のテスト',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_funding_l5_ja.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'レッスン 5 — Overflow 哲学 + 最初の proptest',
      slug: 'openhl-funding-overflow-proptest-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 5 — Overflow 哲学 + 最初の proptest',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_funding_l6_ja.md',
      moduleNumber: 2,
      sortOrder: 2,
      title: 'レッスン 6 — compute_rate — divisor + cap',
      slug: 'openhl-funding-compute-rate-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 6 — `compute_rate` — divisor + cap',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_funding_l7_ja.md',
      moduleNumber: 2,
      sortOrder: 3,
      title: 'レッスン 7 — apply_funding — 符号規約 + zero-sum proptest',
      slug: 'openhl-funding-apply-funding-ja',
      duration: 40,
      xpReward: 80,
      h1Marker: '# レッスン 7 — `apply_funding` — 符号規約 + zero-sum proptest',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_funding_l8_ja.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'レッスン 8 — FundingClock — discrete event loop',
      slug: 'openhl-funding-clock-scaffold-ja',
      duration: 35,
      xpReward: 70,
      h1Marker: '# レッスン 8 — `FundingClock` — discrete event loop',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_funding_l9_ja.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'レッスン 9 — Interval-gating 不変条件 — 3 つの deeper test',
      slug: 'openhl-funding-interval-invariant-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 9 — Interval-gating 不変条件 — 3 つの deeper test',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_funding_l10_ja.md',
      moduleNumber: 3,
      sortOrder: 2,
      title: 'レッスン 10 — No-catch-up 不変条件 — 1 テストで設計哲学',
      slug: 'openhl-funding-no-catchup-ja',
      duration: 25,
      xpReward: 50,
      h1Marker: '# レッスン 10 — No-catch-up 不変条件 — 1 テストで設計哲学',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_funding_l11_ja.md',
      moduleNumber: 4,
      sortOrder: 0,
      title: 'レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの',
      slug: 'openhl-funding-capstone-ja',
      duration: 20,
      xpReward: 40,
      h1Marker: '# レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの',
      startSignature: 'Funding pipeline を記憶からホワイトボードに',
    },
  ],
};

const LOCALES: Record<Locale, LocaleConfig> = { en: EN, ja: JA };

// ──────────────────────────────────────────────────────────────
// Generator (same shape as build-openhl-precompiles-seed.ts)
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
  duration: 355, // L0..L10 total 335 + L11 (20)
  xpReward: 730, // L0..L10 total 690 + L11 (40)
  tags: ['reth', 'evm', 'funding', 'perpetual', 'l1', 'openhl', 'expert'],
  sortOrder: 900,
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

  return `// AUTO-GENERATED from drafts/openhl_funding_*_${locale}.md by .github/scripts/build-openhl-funding-seed.ts
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

  console.log(`Building openhl-funding seed file (locale=${locale}) from drafts...`);
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
