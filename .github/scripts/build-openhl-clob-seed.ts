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
      "Course 7 of 10 in the L1 Architect track. Continues the openhl-based build-along arc from `building-openhl-consensus`: starting from a workspace that has the consensus substrate (live Reth + Malachite, single-validator BFT producing blocks in 0.02s), the reader adds the CLOB matching engine and wires its fills into committed blocks. End state: `cargo test clob_fills_flow_into_payload` passes — a real fill produced by the price-time-priority matching engine flows through `LiveRethEvmBridge::build_payload` and lands in a consensus-committed payload. Covers openhl Stage 8a (701 LOC, pure state machine) + Stage 8d (171 LOC, bridge integration). Out of scope: custom EVM precompiles (course 8), funding state machine (course 9).",
    track: 'reth-l1-architect',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'CLOB types', sortOrder: 1 },
    2: { title: 'Matching engine', sortOrder: 2 },
    3: { title: 'Testing', sortOrder: 3 },
    4: { title: 'Bridge integration', sortOrder: 4 },
    5: { title: 'Capstone', sortOrder: 5 },
  },
  lessons: [
    {
      draftFile: 'openhl_clob_l0_en.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'Build OpenHL CLOB — adding the matching engine on top of the substrate',
      slug: 'openhl-clob-orientation-en',
      duration: 15,
      xpReward: 50,
      h1Marker: '# Build OpenHL CLOB — adding the matching engine on top of the substrate',
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
      startSignature: 'By the end of this lesson:',
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
    title: 'OpenHL CLOB を作る — matching engine を追加する',
    description:
      'L1 Architect トラックの 10 コース中 7 番目。openhl ベースの build-along アークを `building-openhl-consensus` から続ける: consensus substrate (live Reth + Malachite、0.02 秒で block を produce する single-validator BFT) を持つ workspace から始め、reader が CLOB matching engine を追加して、その fill を committed block に配線する。終了状態: `cargo test clob_fills_flow_into_payload` が pass する — price-time-priority matching engine が produce した real fill が `LiveRethEvmBridge::build_payload` を通って consensus-committed payload に着地する。openhl Stage 8a (701 LOC、pure state machine) + Stage 8d (171 LOC、bridge integration) をカバー。範囲外: custom EVM precompile (course 8)、funding state machine (course 9)。',
    track: 'reth-l1-architect',
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
      title: 'OpenHL CLOB を作る — substrate の上に matching engine を載せる',
      slug: 'openhl-clob-orientation-ja',
      duration: 15,
      xpReward: 50,
      h1Marker: '# OpenHL CLOB を作る — substrate の上に matching engine を載せる',
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
      startSignature: 'このレッスンの終わりに:',
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
  duration: 40, // L0 (15) + L1 (25)
  xpReward: 110, // L0 (50) + L1 (60)
  tags: ['reth', 'malachite', 'clob', 'matching-engine', 'evm', 'l1', 'openhl', 'expert'],
  sortOrder: 700,
  isPublished: false,
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
