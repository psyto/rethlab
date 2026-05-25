#!/usr/bin/env tsx
/**
 * Build prisma/seed-reth-openhl-adl-{en,ja}.ts from drafts/openhl_adl_*.md.
 *
 * Sister script of build-openhl-liquidation-seed.ts. Same extraction logic,
 * different draft file naming (openhl_adl_l<N>_<locale>.md), different
 * output filename, different course metadata.
 *
 * Currently covers L0 only — orientation. L1..L4 will be added as drafts
 * land. The ADL course pins to openhl SHA d66b44a (Stage 10d).
 *
 * Run from rethlab root:
 *   npx tsx .github/scripts/build-openhl-adl-seed.ts            # generates EN
 *   npx tsx .github/scripts/build-openhl-adl-seed.ts --locale=ja # generates JA
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
  outputFileName: 'seed-reth-openhl-adl-en.ts',
  exportName: 'seedRethOpenHlAdlEN',
  course: {
    slug: 'building-openhl-adl-en',
    title: 'Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade',
    description:
      "Build auto-deleveraging (ADL) — the cascade's last line of defense when the insurance fund couldn't absorb everything. Ranks profitable counter-positions by (pnl_pct × leverage) using Hyperliquid's convention, force-closes them via bookkeeping mutation rather than orderbook submission, and applies a haircut that absorbs the unfilled deficit. Includes the feedback-loop crash explanation (why ADL bypasses the orderbook entirely), the layered conservation law that closes the Stage 10 cascade math, and 4 invariant proptests proving determinism. 5 lessons across 2 modules, byte-for-byte against openhl Stage 10d (d66b44a). Course 6 of the DIY Perp series.",
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'ADL implementation', sortOrder: 1 },
  },
  lessons: [
    {
      draftFile: 'openhl_adl_l0_en.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade',
      slug: 'openhl-adl-orientation-en',
      duration: 15,
      xpReward: 50,
      h1Marker: '# Build OpenHL ADL — auto-deleveraging, Layer 3 of the safety-net cascade',
      startSignature: 'The previous course',
    },
    {
      draftFile: 'openhl_adl_l1_en.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'Lesson 1 — AdlScore, AdlRecord, AdlReport + adl_score — the ranking function',
      slug: 'openhl-adl-score-en',
      duration: 35,
      xpReward: 60,
      h1Marker: '# Lesson 1 — `AdlScore`, `AdlRecord`, `AdlReport` + `adl_score` — the ranking function',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_adl_l2_en.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'Lesson 2 — execute_adl — the 5-phase orchestration heart',
      slug: 'openhl-adl-execute-en',
      duration: 40,
      xpReward: 70,
      h1Marker: '# Lesson 2 — `execute_adl` — the 5-phase orchestration heart',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_adl_l3_en.md',
      moduleNumber: 1,
      sortOrder: 2,
      title: 'Lesson 3 — 6 nuanced absorption tests — proving execute_adl against the matrix',
      slug: 'openhl-adl-absorption-tests-en',
      duration: 35,
      xpReward: 60,
      h1Marker: '# Lesson 3 — 6 nuanced absorption tests — proving `execute_adl` against the matrix',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'openhl_adl_l4_en.md',
      moduleNumber: 1,
      sortOrder: 3,
      title: 'Lesson 4 — Capstone — 5 invariant proptests + Stage 10 quartet retrospective',
      slug: 'openhl-adl-capstone-en',
      duration: 45,
      xpReward: 90,
      h1Marker: '# Lesson 4 — Capstone — 5 invariant proptests + Stage 10 quartet retrospective',
      startSignature: "Concepts you'll grasp in this lesson",
    },
  ],
};

// ──────────────────────────────────────────────────────────────
// JA configuration
// ──────────────────────────────────────────────────────────────

const JA: LocaleConfig = {
  outputFileName: 'seed-reth-openhl-adl-ja.ts',
  exportName: 'seedRethOpenHlAdlJA',
  course: {
    slug: 'building-openhl-adl-ja',
    title: 'OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3',
    description:
      '保険基金が損失を吸収しきれなかった際の発火回路、最終防衛線「Auto-deleveraging (ADL)」を実装するDIY Perpシリーズ第6弾。\n\n利益の出ているカウンターポジションをランキングし、オーダーブックをバイパスした「帳簿の直接書き換え（Bookkeeping mutation）」による強制クローズとヘアカットを実装します。さらに、破綻を防ぐ「Feedback-loop crash」のメカニズム解説や、システムの決定性を証明する4つの不変条件（Invariant）プロパティテストも網羅。全5レッスンを通じ、Stage 10dに対応するByte-for-byteの一致を達成します。',
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'ADL implementation', sortOrder: 1 },
  },
  lessons: [
    {
      draftFile: 'openhl_adl_l0_ja.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3',
      slug: 'openhl-adl-orientation-ja',
      duration: 15,
      xpReward: 50,
      h1Marker: '# OpenHL ADL を作る — auto-deleveraging、safety-net cascade の Layer 3',
      startSignature: '前のコース',
    },
    {
      draftFile: 'openhl_adl_l1_ja.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'レッスン 1 — AdlScore, AdlRecord, AdlReport + adl_score — ranking 関数',
      slug: 'openhl-adl-score-ja',
      duration: 35,
      xpReward: 60,
      h1Marker: '# レッスン 1 — `AdlScore`, `AdlRecord`, `AdlReport` + `adl_score` — ranking 関数',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_adl_l2_ja.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'レッスン 2 — execute_adl — 5 フェーズのオーケストレーション中枢',
      slug: 'openhl-adl-execute-ja',
      duration: 40,
      xpReward: 70,
      h1Marker: '# レッスン 2 — `execute_adl` — 5 フェーズのオーケストレーション中枢',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_adl_l3_ja.md',
      moduleNumber: 1,
      sortOrder: 2,
      title: 'レッスン 3 — 6 つの nuanced absorption テスト — マトリクスで execute_adl を証明する',
      slug: 'openhl-adl-absorption-tests-ja',
      duration: 35,
      xpReward: 60,
      h1Marker: '# レッスン 3 — 6 つの nuanced absorption テスト — マトリクスで `execute_adl` を証明する',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_adl_l4_ja.md',
      moduleNumber: 1,
      sortOrder: 3,
      title: 'レッスン 4 — Capstone — 5 つの invariant proptest + Stage 10 四部作のレトロスペクティブ',
      slug: 'openhl-adl-capstone-ja',
      duration: 45,
      xpReward: 90,
      h1Marker: '# レッスン 4 — Capstone — 5 つの invariant proptest + Stage 10 四部作のレトロスペクティブ',
      startSignature: 'このレッスンで掴む概念',
    },
  ],
};

const LOCALES: Record<Locale, LocaleConfig> = { en: EN, ja: JA };

// ──────────────────────────────────────────────────────────────
// Generator (same shape as build-openhl-liquidation-seed.ts)
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
  duration: 170, // L0..L4 (15+35+40+35+45) — COURSE COMPLETE
  xpReward: 330, // L0..L4 (50+60+70+60+90) — COURSE COMPLETE
  tags: ['reth', 'evm', 'liquidation', 'adl', 'perpetual', 'l1', 'openhl', 'expert'],
  sortOrder: 1010,
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

  return `// AUTO-GENERATED from drafts/openhl_adl_*_${locale}.md by .github/scripts/build-openhl-adl-seed.ts
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

  console.log(`Building openhl-adl seed file (locale=${locale}) from drafts...`);
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
