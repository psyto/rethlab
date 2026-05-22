#!/usr/bin/env tsx
/**
 * Build prisma/seed-reth-openhl-clob-{en,ja}.ts from drafts/openhl_clob_*.md.
 *
 * Sister script of build-openhl-seed.ts. Same extraction logic, different
 * draft file naming convention (openhl_clob_l<N>_<locale>.md), different
 * output filename, different course metadata.
 *
 * Run from rethlab root:
 *   npx tsx .github/scripts/build-openhl-clob-seed.ts            # generates EN
 *   npx tsx .github/scripts/build-openhl-clob-seed.ts --locale=ja # generates JA
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
  outputFileName: 'seed-reth-openhl-clob-en.ts',
  exportName: 'seedRethOpenHlClobEN',
  course: {
    slug: 'building-openhl-clob-en',
    title: 'Build OpenHL CLOB — adding the matching engine',
    description:
      "Add a price-time-priority matching engine to the consensus substrate from `building-openhl-consensus`. Build the CLOB as a pure state machine, then wire its fills through the bridge into consensus-committed blocks. The second course in the DIY Perp series.",
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'CLOB types', sortOrder: 1 },
    2: { title: 'Matching engine', sortOrder: 2 },
    3: { title: 'Testing', sortOrder: 3 },
    4: { title: 'Bridge integration', sortOrder: 4 },
    5: { title: 'Capstone', sortOrder: 5 }, // EN config already had this entry
  },
  lessons: [
    {
      draftFile: 'openhl_clob_l0_en.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'Build OpenHL CLOB — adding the matching engine on top of the Reth substrate',
      slug: 'openhl-clob-orientation-en',
      duration: 15,
      xpReward: 50,
      h1Marker: '# Build OpenHL CLOB — adding the matching engine on top of the Reth substrate',
      startSignature: 'The previous course',
    },
    {
      draftFile: 'openhl_clob_l1_en.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'Lesson 1 — CLOB newtypes, Side, OrderType',
      slug: 'openhl-clob-types-newtype-en',
      duration: 25,
      xpReward: 60,
      h1Marker: '# Lesson 1 — CLOB newtypes, `Side`, `OrderType`',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l2_en.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'Lesson 2 — Order, Fill, FillResult',
      slug: 'openhl-clob-types-records-en',
      duration: 20,
      xpReward: 50,
      h1Marker: '# Lesson 2 — `Order`, `Fill`, `FillResult`',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l3_en.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'Lesson 3 — The Book struct and the Reverse<Price> trick',
      slug: 'openhl-clob-book-struct-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 3 — The `Book` struct and the `Reverse<Price>` trick',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l4_en.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'Lesson 4 — submit for Limit orders + match_at_level',
      slug: 'openhl-clob-submit-limit-en',
      duration: 45,
      xpReward: 80,
      h1Marker: '# Lesson 4 — `submit` for Limit orders + `match_at_level`',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l5_en.md',
      moduleNumber: 2,
      sortOrder: 2,
      title: 'Lesson 5 — submit_market — orders that take any price',
      slug: 'openhl-clob-submit-market-en',
      duration: 25,
      xpReward: 60,
      h1Marker: '# Lesson 5 — `submit_market` — orders that take any price',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l6_en.md',
      moduleNumber: 2,
      sortOrder: 3,
      title: 'Lesson 6 — cancel — pulling an order off the book',
      slug: 'openhl-clob-cancel-en',
      duration: 20,
      xpReward: 50,
      h1Marker: '# Lesson 6 — `cancel` — pulling an order off the book',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l7_en.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'Lesson 7 — 9 hand-traced unit tests',
      slug: 'openhl-clob-unit-tests-en',
      duration: 35,
      xpReward: 70,
      h1Marker: '# Lesson 7 — 9 hand-traced unit tests',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l8_en.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'Lesson 8 — 3 proptest invariants: 768 random scenarios',
      slug: 'openhl-clob-proptests-en',
      duration: 40,
      xpReward: 80,
      h1Marker: '# Lesson 8 — 3 proptest invariants: 768 random scenarios',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l9_en.md',
      moduleNumber: 4,
      sortOrder: 0,
      title: 'Lesson 9 — LiveRethEvmBridge gets a CLOB + submit_order',
      slug: 'openhl-clob-bridge-fields-en',
      duration: 40,
      xpReward: 70,
      h1Marker: '# Lesson 9 — `LiveRethEvmBridge` gets a CLOB + `submit_order`',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l10_en.md',
      moduleNumber: 4,
      sortOrder: 1,
      title: 'Lesson 10 — build_payload drains pending fills',
      slug: 'openhl-clob-bridge-drain-en',
      duration: 25,
      xpReward: 50,
      h1Marker: '# Lesson 10 — `build_payload` drains pending fills',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l11_en.md',
      moduleNumber: 4,
      sortOrder: 2,
      title: 'Lesson 11 — clob_fills_flow_into_payload — the milestone test',
      slug: 'openhl-clob-integration-test-en',
      duration: 30,
      xpReward: 70,
      h1Marker: '# Lesson 11 — `clob_fills_flow_into_payload` — the milestone test',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_clob_l12_en.md',
      moduleNumber: 5,
      sortOrder: 0,
      title: "Lesson 12 — What you built, what's still stub, where to go next",
      slug: 'openhl-clob-capstone-en',
      duration: 15,
      xpReward: 50,
      h1Marker: "# Lesson 12 — What you built, what's still stub, where to go next",
      startSignature: 'Over 11 lessons you added a',
    },
  ],
};

// ──────────────────────────────────────────────────────────────
// JA configuration
// ──────────────────────────────────────────────────────────────

const JA: LocaleConfig = {
  outputFileName: 'seed-reth-openhl-clob-ja.ts',
  exportName: 'seedRethOpenHlClobJA',
  course: {
    slug: 'building-openhl-clob-ja',
    title: 'OpenHL CLOB 開発ガイド：マッチングエンジンの追加とステートマシンの統合',
    description:
      '前層で組み上げたコンセンサス・サブストレート上に、Price-Time Priority 準拠のマッチングエンジンを実装します。CLOB を決定論的な純粋ステートマシン（Pure State Machine）として設計し、その約定イベント（fill）をブリッジを介してコンセンサス側でコミットされたブロックへと結合します。「DIY Perp シリーズ」の第2ステップ。コアとなる取引実行レーンを自作します。',
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'CLOB 型', sortOrder: 1 },
    2: { title: 'Matching engine', sortOrder: 2 },
    3: { title: 'テスト', sortOrder: 3 },
    4: { title: 'Bridge 統合', sortOrder: 4 },
    5: { title: 'Capstone', sortOrder: 5 },
  },
  lessons: [
    {
      draftFile: 'openhl_clob_l0_ja.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'OpenHL CLOB を作る — Reth 基盤の上に matching engine を載せる',
      slug: 'openhl-clob-orientation-ja',
      duration: 15,
      xpReward: 50,
      h1Marker: '# OpenHL CLOB を作る — Reth 基盤の上に matching engine を載せる',
      startSignature: '前コース',
    },
    {
      draftFile: 'openhl_clob_l1_ja.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'レッスン 1 — CLOB の newtype、Side、OrderType',
      slug: 'openhl-clob-types-newtype-ja',
      duration: 25,
      xpReward: 60,
      h1Marker: '# レッスン 1 — CLOB の newtype、`Side`、`OrderType`',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l2_ja.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'レッスン 2 — Order、Fill、FillResult',
      slug: 'openhl-clob-types-records-ja',
      duration: 20,
      xpReward: 50,
      h1Marker: '# レッスン 2 — `Order`、`Fill`、`FillResult`',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l3_ja.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'レッスン 3 — Book struct と Reverse<Price> トリック',
      slug: 'openhl-clob-book-struct-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 3 — `Book` struct と `Reverse<Price>` トリック',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l4_ja.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'レッスン 4 — Limit order 用 submit + match_at_level',
      slug: 'openhl-clob-submit-limit-ja',
      duration: 45,
      xpReward: 80,
      h1Marker: '# レッスン 4 — Limit order 用 `submit` + `match_at_level`',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l5_ja.md',
      moduleNumber: 2,
      sortOrder: 2,
      title: 'レッスン 5 — submit_market — 任意の価格を取る order',
      slug: 'openhl-clob-submit-market-ja',
      duration: 25,
      xpReward: 60,
      h1Marker: '# レッスン 5 — `submit_market` — 任意の価格を取る order',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l6_ja.md',
      moduleNumber: 2,
      sortOrder: 3,
      title: 'レッスン 6 — cancel — order を book から引き抜く',
      slug: 'openhl-clob-cancel-ja',
      duration: 20,
      xpReward: 50,
      h1Marker: '# レッスン 6 — `cancel` — order を book から引き抜く',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l7_ja.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'レッスン 7 — hand-trace された unit test 9 個',
      slug: 'openhl-clob-unit-tests-ja',
      duration: 35,
      xpReward: 70,
      h1Marker: '# レッスン 7 — hand-trace された unit test 9 個',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l8_ja.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'レッスン 8 — proptest invariant 3 個: 768 ランダムシナリオ',
      slug: 'openhl-clob-proptests-ja',
      duration: 40,
      xpReward: 80,
      h1Marker: '# レッスン 8 — proptest invariant 3 個: 768 ランダムシナリオ',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l9_ja.md',
      moduleNumber: 4,
      sortOrder: 0,
      title: 'レッスン 9 — LiveRethEvmBridge に CLOB + submit_order を持たせる',
      slug: 'openhl-clob-bridge-fields-ja',
      duration: 40,
      xpReward: 70,
      h1Marker: '# レッスン 9 — `LiveRethEvmBridge` に CLOB + `submit_order` を持たせる',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l10_ja.md',
      moduleNumber: 4,
      sortOrder: 1,
      title: 'レッスン 10 — build_payload が pending fill を drain する',
      slug: 'openhl-clob-bridge-drain-ja',
      duration: 25,
      xpReward: 50,
      h1Marker: '# レッスン 10 — `build_payload` が pending fill を drain する',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l11_ja.md',
      moduleNumber: 4,
      sortOrder: 2,
      title: 'レッスン 11 — clob_fills_flow_into_payload — マイルストーンテスト',
      slug: 'openhl-clob-integration-test-ja',
      duration: 30,
      xpReward: 70,
      h1Marker: '# レッスン 11 — `clob_fills_flow_into_payload` — マイルストーンテスト',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_clob_l12_ja.md',
      moduleNumber: 5,
      sortOrder: 0,
      title: 'レッスン 12 — 作ったもの、まだ stub のもの、次に行く先',
      slug: 'openhl-clob-capstone-ja',
      duration: 15,
      xpReward: 50,
      h1Marker: '# レッスン 12 — 作ったもの、まだ stub のもの、次に行く先',
      startSignature: 'Course 6 で build した substrate に',
    },
  ],
};

const LOCALES: Record<Locale, LocaleConfig> = { en: EN, ja: JA };

// ──────────────────────────────────────────────────────────────
// Generator (same shape as build-openhl-seed.ts)
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
  duration: 365, // L0..L11 total 350 + L12 (15) — course 7 complete
  xpReward: 800, // L0..L11 total 750 + L12 (50) — course 7 complete
  tags: ['reth', 'malachite', 'clob', 'matching-engine', 'evm', 'l1', 'openhl', 'expert'],
  sortOrder: 700,
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

  return `// AUTO-GENERATED from drafts/openhl_clob_*_${locale}.md by .github/scripts/build-openhl-clob-seed.ts
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

  console.log(`Building openhl-clob seed file (locale=${locale}) from drafts...`);
  console.log(`  drafts:  ${DRAFTS_DIR}`);
  console.log(`  output:  ${outPath}`);

  const lessons: Lesson[] = [];
  for (const spec of config.lessons) {
    try {
      const lesson = await buildLesson(spec);
      lessons.push(lesson);
      console.log(`  ✓ ${spec.slug.padEnd(40)} (M${spec.moduleNumber}.${spec.sortOrder})`);
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
