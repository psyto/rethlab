#!/usr/bin/env tsx
/**
 * Build prisma/seed-reth-perp-primer-{en,ja}.ts from drafts/perp_primer_*.md.
 *
 * Concept-only course (no Rust code), 4 lessons in 1 module, prerequisite
 * to the DIY Perp track. Different from the openhl-* builders in that the
 * lessons aren't pinned to openhl commit SHAs — the content is timeless
 * perp domain knowledge.
 *
 * Run from rethlab root:
 *   npx tsx .github/scripts/build-perp-primer-seed.ts            # generates EN
 *   npx tsx .github/scripts/build-perp-primer-seed.ts --locale=ja # generates JA
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
  outputFileName: 'seed-reth-perp-primer-en.ts',
  exportName: 'seedRethPerpPrimerEN',
  course: {
    slug: 'perp-primer-en',
    title: 'Perp DEX Primer — the perpetual-futures mechanics behind the DIY Perp track',
    description:
      "Concept-only prerequisite course for the DIY Perp track. Four lessons covering: (1) what perpetual futures are and why they have no expiry, (2) mark, index, and funding rates, (3) margin model and the four health states, (4) liquidation, insurance fund, and ADL. No Rust code — just the perp domain knowledge the build-along courses quietly assume. Worked numerical examples at Hyperliquid's actual parameter values throughout.",
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Perp Primer', sortOrder: 0 },
  },
  lessons: [
    {
      draftFile: 'perp_primer_l0_en.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'L0 — What perpetual futures are, and why they have no expiry',
      slug: 'perp-primer-what-is-a-perp-en',
      duration: 30,
      xpReward: 50,
      h1Marker: '# What perpetual futures are — and why they have no expiry',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'perp_primer_l1_en.md',
      moduleNumber: 0,
      sortOrder: 1,
      title: 'L1 — Mark, index, and funding — how perps stay anchored without expiry',
      slug: 'perp-primer-mark-index-funding-en',
      duration: 35,
      xpReward: 60,
      h1Marker: '# Mark, index, and funding — how perps stay anchored without expiry',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'perp_primer_l2_en.md',
      moduleNumber: 0,
      sortOrder: 2,
      title: 'L2 — Margin model — collateral, leverage, equity, and the four states',
      slug: 'perp-primer-margin-model-en',
      duration: 40,
      xpReward: 70,
      h1Marker: '# Margin model — collateral, leverage, equity, and the four states',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'perp_primer_l3_en.md',
      moduleNumber: 0,
      sortOrder: 3,
      title: 'L3 — Liquidation, insurance fund, and ADL — the safety net mechanics',
      slug: 'perp-primer-liquidation-insurance-adl-en',
      duration: 35,
      xpReward: 60,
      h1Marker: '# Liquidation, insurance fund, and ADL — the safety net mechanics',
      startSignature: "Concepts you'll grasp in this lesson",
    },
  ],
};

// ──────────────────────────────────────────────────────────────
// JA configuration
// ──────────────────────────────────────────────────────────────

const JA: LocaleConfig = {
  outputFileName: 'seed-reth-perp-primer-ja.ts',
  exportName: 'seedRethPerpPrimerJA',
  course: {
    slug: 'perp-primer-ja',
    title: 'Perp DEX Primer — DIY Perp track の前提となる永久先物の仕組み',
    description:
      'DIY Perp track の prerequisite となる概念コース。4 レッスン: (1) 永久先物とは何か、なぜ期限がないのか、(2) mark / index / funding rate、(3) margin model と 4 つの health state、(4) liquidation、insurance fund、ADL。Rust コードは扱わない — build-along コースが暗黙のうちに前提にしている perp 領域の知識のみ。全レッスンを通じて Hyperliquid の実パラメータでの計算例。',
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Perp Primer', sortOrder: 0 },
  },
  lessons: [
    {
      draftFile: 'perp_primer_l0_ja.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'L0 — 永久先物とは何か、そしてなぜ期限がないのか',
      slug: 'perp-primer-what-is-a-perp-ja',
      duration: 30,
      xpReward: 50,
      h1Marker: '# 永久先物とは何か — そしてなぜ期限がないのか',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'perp_primer_l1_ja.md',
      moduleNumber: 0,
      sortOrder: 1,
      title: 'L1 — Mark、index、funding — 期限なしで perp が anchor を保つ仕組み',
      slug: 'perp-primer-mark-index-funding-ja',
      duration: 35,
      xpReward: 60,
      h1Marker: '# Mark、index、funding — 期限なしで perp が anchor を保つ仕組み',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'perp_primer_l2_ja.md',
      moduleNumber: 0,
      sortOrder: 2,
      title: 'L2 — Margin model — collateral、leverage、equity、4 状態',
      slug: 'perp-primer-margin-model-ja',
      duration: 40,
      xpReward: 70,
      h1Marker: '# Margin model — collateral、leverage、equity、4 状態',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'perp_primer_l3_ja.md',
      moduleNumber: 0,
      sortOrder: 3,
      title: 'L3 — Liquidation、insurance fund、ADL — セーフティネットの仕組み',
      slug: 'perp-primer-liquidation-insurance-adl-ja',
      duration: 35,
      xpReward: 60,
      h1Marker: '# Liquidation、insurance fund、ADL — セーフティネットの仕組み',
      startSignature: 'このレッスンで掴む概念',
    },
  ],
};

const LOCALES: Record<Locale, LocaleConfig> = { en: EN, ja: JA };

// ──────────────────────────────────────────────────────────────
// Generator (same shape as build-openhl-*-seed.ts)
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
  difficulty: 'INTERMEDIATE' as const,
  duration: 140, // 30 + 35 + 40 + 35
  xpReward: 240, // 50 + 60 + 70 + 60
  tags: ['perpetual', 'concept', 'primer', 'prerequisite', 'hyperliquid'],
  sortOrder: 500,
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

  return `// AUTO-GENERATED from drafts/perp_primer_*_${locale}.md by .github/scripts/build-perp-primer-seed.ts
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

  console.log(`Building perp-primer seed file (locale=${locale}) from drafts...`);
  console.log(`  drafts:  ${DRAFTS_DIR}`);
  console.log(`  output:  ${outPath}`);

  const lessons: Lesson[] = [];
  for (const spec of config.lessons) {
    try {
      const lesson = await buildLesson(spec);
      lessons.push(lesson);
      console.log(`  ✓ ${spec.slug.padEnd(50)} (M${spec.moduleNumber}.${spec.sortOrder})`);
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
