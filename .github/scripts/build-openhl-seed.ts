#!/usr/bin/env tsx
/**
 * Build prisma/seed-reth-openhl-consensus-{en,ja}.ts from drafts/openhl_*.md.
 *
 * Each draft file has one or two lessons inside it, wrapped in metadata
 * blocks. This script extracts the lesson markdown, escapes it for TS
 * template literals, and emits a single seed file that registers the course
 * + every lesson in the right module/sortOrder.
 *
 * Locale selection: pass `--locale=ja` (default `en`). The script picks
 * EN- or JA-flavored lesson metadata + draft file paths accordingly.
 *
 * Drift policy: this is a build artifact. Re-run when drafts/ changes.
 * Don't hand-edit the generated seed files (changes to course metadata go
 * here in the build script, not the output).
 *
 * Run from rethlab root:
 *   npx tsx .github/scripts/build-openhl-seed.ts            # generates EN
 *   npx tsx .github/scripts/build-openhl-seed.ts --locale=ja # generates JA
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
  /** H1 marker in the markdown so the extractor can find the lesson start. */
  h1Marker: string;
  /** First N chars of the lesson body; used to disambiguate when one draft has multiple lessons. */
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
  outputFileName: 'seed-reth-openhl-consensus-en.ts',
  exportName: 'seedRethOpenHlConsensusEN',
  course: {
    slug: 'reth-openhl-consensus-en',
    title: 'Build OpenHL — from `cargo init` to a single-validator devnet',
    description:
      "OpenHL is the open-source reference implementation of Hyperliquid (HyperBFT consensus + HyperCore matching engine + HyperEVM execution, all closed source). This is the build-along course for openhl's Module 1 (the consensus substrate): starting from `cargo init` on an empty directory, you write code lesson by lesson and end with a Rust workspace that drives a real BFT consensus round end-to-end through real Reth and real Malachite. By the last lesson, `cargo test first_block_via_engine_actors` produces a passing single-validator round in ~0.02 seconds against code you wrote yourself, with `psyto/openhl` as the answer key. This course covers openhl Build arc Module 1 only — the substrate — not Modules 2-5 (CLOB, precompiles, settlement, vault), which become their own rethlab courses later.",
    track: 'reth-l1-architect',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Foundations', sortOrder: 1 },
    2: { title: 'Contract types', sortOrder: 2 },
    3: { title: 'EL test double', sortOrder: 3 },
  },
  lessons: [
    {
      draftFile: 'openhl_l0_en.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'Build OpenHL — from cargo init to a single-validator devnet',
      slug: 'openhl-orientation-en',
      duration: 20,
      xpReward: 60,
      h1Marker: '# Build OpenHL — from `cargo init` to a single-validator devnet',
      startSignature: 'This is not a course you read. This is a course you **build**.',
    },
    {
      draftFile: 'openhl_l1_en.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'Lesson 1 — Workspace + Reth + Malachite (Stages 1-3)',
      slug: 'openhl-workspace-en',
      duration: 45,
      xpReward: 80,
      h1Marker: '# Lesson 1 — Workspace + Reth + Malachite (Stages 1-3)',
      startSignature: 'By the end of this lesson, run from your `~/code/my-openhl/` directory:',
    },
    {
      draftFile: 'openhl_l2_en.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'Lesson 2 — Shared contract types in openhl-types',
      slug: 'openhl-contract-types-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 2 — Shared contract types in `openhl-types`',
      startSignature: 'By the end of this lesson:',
    },
    {
      draftFile: 'openhl_l3_en.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'Lesson 3 — The ConsensusBridge trait',
      slug: 'openhl-bridge-trait-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 3 — The `ConsensusBridge` trait',
      startSignature: 'By the end of this lesson:',
    },
    {
      draftFile: 'openhl_l4_en.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'Lesson 4 — InMemoryEvmBridge — first impl of the trait',
      slug: 'openhl-in-memory-bridge-en',
      duration: 40,
      xpReward: 70,
      h1Marker: '# Lesson 4 — `InMemoryEvmBridge` — first impl of the trait',
      startSignature: 'By the end of this lesson:',
    },
  ],
};

// ──────────────────────────────────────────────────────────────
// JA configuration
// ──────────────────────────────────────────────────────────────

const JA: LocaleConfig = {
  outputFileName: 'seed-reth-openhl-consensus-ja.ts',
  exportName: 'seedRethOpenHlConsensusJA',
  course: {
    slug: 'reth-openhl-consensus-ja',
    title: 'OpenHL を自作する — `cargo init` から動く single-validator devnet まで',
    description:
      'OpenHL は Hyperliquid (HyperBFT consensus、HyperCore matching engine、HyperEVM execution、すべてクローズドソース) のオープンソース・リファレンス実装である。本コースは openhl Module 1 (consensus substrate) を自分で build するための build-along コース: 空ディレクトリで `cargo init` するところから始め、レッスンごとにコードを書き、最終的には実 Reth と実 Malachite の上で BFT consensus を end-to-end で 1 ラウンド走らせる Rust workspace を手にする。最終レッスンを終える頃には、自分で書いたコードに対して `cargo test first_block_via_engine_actors` が約 0.02 秒で pass する。答え合わせ用のリファレンスは `psyto/openhl`。本コースが扱うのは openhl Build arc Module 1 (substrate) のみで、Module 2-5 (CLOB、precompile、settlement、vault) は後続の rethlab コースに分けて扱う。',
    track: 'reth-l1-architect',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Foundations', sortOrder: 1 },
    2: { title: 'Contract types', sortOrder: 2 },
    3: { title: 'EL test double', sortOrder: 3 },
  },
  lessons: [
    {
      draftFile: 'openhl_l0_ja.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'OpenHL を自作する — cargo init から動く single-validator devnet まで',
      slug: 'openhl-orientation-ja',
      duration: 20,
      xpReward: 60,
      h1Marker: '# OpenHL を自作する — `cargo init` から動く single-validator devnet まで',
      startSignature: 'これは「読む」コースではない。これは「**作る**」コースだ。',
    },
    {
      draftFile: 'openhl_l1_ja.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'レッスン 1 — Workspace + Reth + Malachite (Stages 1-3)',
      slug: 'openhl-workspace-ja',
      duration: 45,
      xpReward: 80,
      h1Marker: '# レッスン 1 — Workspace + Reth + Malachite (Stages 1-3)',
      startSignature: 'このレッスンの終わりに、`~/code/my-openhl/` ディレクトリで次を実行する:',
    },
    {
      draftFile: 'openhl_l2_ja.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'レッスン 2 — openhl-types の共通 contract type',
      slug: 'openhl-contract-types-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 2 — `openhl-types` の共通 contract type',
      startSignature: 'このレッスンの終わりに:',
    },
    {
      draftFile: 'openhl_l3_ja.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'レッスン 3 — ConsensusBridge trait',
      slug: 'openhl-bridge-trait-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 3 — `ConsensusBridge` trait',
      startSignature: 'このレッスンの終わりに:',
    },
    {
      draftFile: 'openhl_l4_ja.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'レッスン 4 — InMemoryEvmBridge — trait の最初の impl',
      slug: 'openhl-in-memory-bridge-ja',
      duration: 40,
      xpReward: 70,
      h1Marker: '# レッスン 4 — `InMemoryEvmBridge` — trait の最初の impl',
      startSignature: 'このレッスンの終わりに:',
    },
  ],
};

const LOCALES: Record<Locale, LocaleConfig> = { en: EN, ja: JA };

// ──────────────────────────────────────────────────────────────
// Generator
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
  duration: 165, // L0 (20) + L1 (45) + L2 (30) + L3 (30) + L4 (40) — build-along pilot
  xpReward: 330, // L0 (60) + L1 (80) + L2 (60) + L3 (60) + L4 (70) — build-along pilot
  tags: ['reth', 'malachite', 'bft', 'evm', 'clob', 'l1', 'openhl', 'expert'],
  sortOrder: 600,
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

async function buildLesson(
  spec: LessonSpec,
): Promise<Lesson> {
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

  return `// AUTO-GENERATED from drafts/openhl_*_${locale}.md by .github/scripts/build-openhl-seed.ts
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

  console.log(`Building openhl seed file (locale=${locale}) from drafts...`);
  console.log(`  drafts:  ${DRAFTS_DIR}`);
  console.log(`  output:  ${outPath}`);

  const lessons: Lesson[] = [];
  for (const spec of config.lessons) {
    try {
      const lesson = await buildLesson(spec);
      lessons.push(lesson);
      console.log(`  ✓ ${spec.slug.padEnd(35)} (M${spec.moduleNumber}.${spec.sortOrder})`);
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
