#!/usr/bin/env tsx
/**
 * Build prisma/seed-reth-openhl-precompiles-{en,ja}.ts from drafts/openhl_precompiles_*.md.
 *
 * Sister script of build-openhl-clob-seed.ts. Same extraction logic, different
 * draft file naming convention (openhl_precompiles_l<N>_<locale>.md), different
 * output filename, different course metadata.
 *
 * Run from rethlab root:
 *   npx tsx .github/scripts/build-openhl-precompiles-seed.ts            # generates EN
 *   npx tsx .github/scripts/build-openhl-precompiles-seed.ts --locale=ja # generates JA
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
  outputFileName: 'seed-reth-openhl-precompiles-en.ts',
  exportName: 'seedRethOpenHlPrecompilesEN',
  course: {
    slug: 'building-openhl-precompiles-en',
    title: 'Build OpenHL Precompiles — connecting CLOB state to smart contracts',
    description:
      "Connect the CLOB from `building-openhl-clob` to smart contracts via custom EVM precompiles. Smart contracts gain read and write access to the matching engine at well-known precompile addresses, and the resulting fills route back through the bridge into the next payload. The third course in the DIY Perp series.",
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Custom EVM bootstrap', sortOrder: 1 },
    2: { title: 'Read precompile', sortOrder: 2 },
    3: { title: 'Write precompile', sortOrder: 3 },
    4: { title: 'Bridge integration', sortOrder: 4 },
    5: { title: 'Capstone', sortOrder: 5 },
  },
  lessons: [
    {
      draftFile: 'openhl_precompiles_l0_en.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'Build OpenHL Precompiles — connecting CLOB state to smart contracts',
      slug: 'openhl-precompiles-orientation-en',
      duration: 15,
      xpReward: 50,
      h1Marker: '# Build OpenHL Precompiles — connecting CLOB state to smart contracts',
      startSignature: 'The previous course',
    },
    {
      draftFile: 'openhl_precompiles_l1_en.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'Lesson 1 — OpenHlEvmFactory — hooking into every EVM creation',
      slug: 'openhl-precompiles-evm-scaffold-en',
      duration: 40,
      xpReward: 80,
      h1Marker: '# Lesson 1 — `OpenHlEvmFactory` — hooking into every EVM creation',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_precompiles_l2_en.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'Lesson 2 — clob_read_best_bid — the first real precompile',
      slug: 'openhl-precompiles-read-hardcoded-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 2 — `clob_read_best_bid` — the first real precompile',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_precompiles_l3_en.md',
      moduleNumber: 1,
      sortOrder: 2,
      title: 'Lesson 3 — NodeBuilder wiring + registry callability tests',
      slug: 'openhl-precompiles-node-wiring-en',
      duration: 35,
      xpReward: 70,
      h1Marker: '# Lesson 3 — NodeBuilder wiring + registry callability tests',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_precompiles_l4_en.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'Lesson 4 — install_clob() — bridging EVM state to the matching engine',
      slug: 'openhl-precompiles-install-clob-en',
      duration: 35,
      xpReward: 70,
      h1Marker: '# Lesson 4 — `install_clob()` — bridging EVM state to the matching engine',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_precompiles_l5_en.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'Lesson 5 — read_best_bid reads the wire — swap to current_best_bid()',
      slug: 'openhl-precompiles-swap-to-live-en',
      duration: 40,
      xpReward: 80,
      h1Marker: '# Lesson 5 — `read_best_bid` reads the wire — swap to `current_best_bid()`',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_precompiles_l6_en.md',
      moduleNumber: 2,
      sortOrder: 2,
      title: 'Lesson 6 — Module 2 milestone — proving the round-trip',
      slug: 'openhl-precompiles-live-state-proof-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 6 — Module 2 milestone — proving the round-trip',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_precompiles_l7_en.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'Lesson 7 — clob_place_order — calldata decoding scaffold',
      slug: 'openhl-precompiles-place-order-scaffold-en',
      duration: 40,
      xpReward: 80,
      h1Marker: '# Lesson 7 — `clob_place_order` — calldata decoding scaffold',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_precompiles_l8_en.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'Lesson 8 — book.submit(...) — the write path goes live',
      slug: 'openhl-precompiles-place-order-write-en',
      duration: 30,
      xpReward: 60,
      h1Marker: '# Lesson 8 — `book.submit(...)` — the write path goes live',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_precompiles_l9_en.md',
      moduleNumber: 4,
      sortOrder: 0,
      title: 'Lesson 9 — install_fill_sink — fills flow back to the bridge',
      slug: 'openhl-precompiles-fill-sink-en',
      duration: 40,
      xpReward: 80,
      h1Marker: '# Lesson 9 — `install_fill_sink` — fills flow back to the bridge',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_precompiles_l10_en.md',
      moduleNumber: 4,
      sortOrder: 1,
      title: 'Lesson 10 — Course milestone — the full stack in a real Reth node',
      slug: 'openhl-precompiles-bridge-integration-en',
      duration: 45,
      xpReward: 90,
      h1Marker: '# Lesson 10 — Course milestone — the full stack in a real Reth node',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_precompiles_l11_en.md',
      moduleNumber: 5,
      sortOrder: 0,
      title: "Lesson 11 — Capstone — what you built, what's deferred, what comes next",
      slug: 'openhl-precompiles-capstone-en',
      duration: 20,
      xpReward: 40,
      h1Marker: "# Lesson 11 — Capstone — what you built, what's deferred, what comes next",
      startSignature: 'You can sketch the EVM ↔ CLOB architecture',
    },
  ],
};

// ──────────────────────────────────────────────────────────────
// JA configuration
// ──────────────────────────────────────────────────────────────

const JA: LocaleConfig = {
  outputFileName: 'seed-reth-openhl-precompiles-ja.ts',
  exportName: 'seedRethOpenHlPrecompilesJA',
  course: {
    slug: 'building-openhl-precompiles-ja',
    title: 'OpenHL Precompile 開発ガイド：EVM 拡張による CLOB ステートのスマートコントラクト連携',
    description:
      '前回構築した CLOB ステートマシンを、カスタム EVM Precompile として再定義し、スマートコントラクト層へシームレスに結合します。コントラクトから well-known なアドレスを介してマッチングエンジンを直接 Read/Write するランタイムを実装。発生した fill（約定イベント）をブリッジ経由で次期ペイロードへ伝播させるデータパイプラインを完遂させます。「DIY Perp シリーズ」の第3ステップ。App-chain のコアとなる EVM 拡張基盤をハックします。',
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Custom EVM bootstrap', sortOrder: 1 },
    2: { title: 'Read precompile', sortOrder: 2 },
    3: { title: 'Write precompile', sortOrder: 3 },
    4: { title: 'Bridge 統合', sortOrder: 4 },
    5: { title: 'Capstone', sortOrder: 5 },
  },
  lessons: [
    {
      draftFile: 'openhl_precompiles_l0_ja.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'OpenHL Precompile を作る — CLOB state をスマートコントラクトに接続する',
      slug: 'openhl-precompiles-orientation-ja',
      duration: 15,
      xpReward: 50,
      h1Marker: '# OpenHL Precompile を作る — CLOB state をスマートコントラクトに接続する',
      startSignature: '前コース',
    },
    {
      draftFile: 'openhl_precompiles_l1_ja.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'レッスン 1 — OpenHlEvmFactory — すべての EVM 生成にフックする',
      slug: 'openhl-precompiles-evm-scaffold-ja',
      duration: 40,
      xpReward: 80,
      h1Marker: '# レッスン 1 — `OpenHlEvmFactory` — すべての EVM 生成にフックする',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_precompiles_l2_ja.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'レッスン 2 — clob_read_best_bid — 最初の本物の precompile',
      slug: 'openhl-precompiles-read-hardcoded-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 2 — `clob_read_best_bid` — 最初の本物の precompile',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_precompiles_l3_ja.md',
      moduleNumber: 1,
      sortOrder: 2,
      title: 'レッスン 3 — NodeBuilder への組み込み + registry callability test',
      slug: 'openhl-precompiles-node-wiring-ja',
      duration: 35,
      xpReward: 70,
      h1Marker: '# レッスン 3 — NodeBuilder への組み込み + registry callability test',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_precompiles_l4_ja.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'レッスン 4 — install_clob() — EVM の state をマッチングエンジンに橋渡しする',
      slug: 'openhl-precompiles-install-clob-ja',
      duration: 35,
      xpReward: 70,
      h1Marker: '# レッスン 4 — `install_clob()` — EVM の state をマッチングエンジンに橋渡しする',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_precompiles_l5_ja.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'レッスン 5 — read_best_bid がライブ状態を読む — current_best_bid() に差し替え',
      slug: 'openhl-precompiles-swap-to-live-ja',
      duration: 40,
      xpReward: 80,
      h1Marker: '# レッスン 5 — `read_best_bid` がライブ状態を読む — `current_best_bid()` に差し替え',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_precompiles_l6_ja.md',
      moduleNumber: 2,
      sortOrder: 2,
      title: 'レッスン 6 — Module 2 マイルストーン — ラウンドトリップを証明する',
      slug: 'openhl-precompiles-live-state-proof-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 6 — Module 2 マイルストーン — ラウンドトリップを証明する',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_precompiles_l7_ja.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'レッスン 7 — clob_place_order — calldata デコード scaffold',
      slug: 'openhl-precompiles-place-order-scaffold-ja',
      duration: 40,
      xpReward: 80,
      h1Marker: '# レッスン 7 — `clob_place_order` — calldata デコード scaffold',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_precompiles_l8_ja.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'レッスン 8 — book.submit(...) — 書き込みパスが live になる',
      slug: 'openhl-precompiles-place-order-write-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 8 — `book.submit(...)` — 書き込みパスが live になる',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_precompiles_l9_ja.md',
      moduleNumber: 4,
      sortOrder: 0,
      title: 'レッスン 9 — install_fill_sink — 約定を bridge に戻す',
      slug: 'openhl-precompiles-fill-sink-ja',
      duration: 40,
      xpReward: 80,
      h1Marker: '# レッスン 9 — `install_fill_sink` — 約定を bridge に戻す',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_precompiles_l10_ja.md',
      moduleNumber: 4,
      sortOrder: 1,
      title: 'レッスン 10 — コースマイルストーン — 実際の Reth ノード内でフルスタック',
      slug: 'openhl-precompiles-bridge-integration-ja',
      duration: 45,
      xpReward: 90,
      h1Marker: '# レッスン 10 — コースマイルストーン — 実際の Reth ノード内でフルスタック',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_precompiles_l11_ja.md',
      moduleNumber: 5,
      sortOrder: 0,
      title: 'レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの',
      slug: 'openhl-precompiles-capstone-ja',
      duration: 20,
      xpReward: 40,
      h1Marker: '# レッスン 11 — Capstone — 築いたもの、先送りしたもの、次にくるもの',
      startSignature: 'EVM ↔ CLOB のアーキテクチャを、記憶を頼りに',
    },
  ],
};

const LOCALES: Record<Locale, LocaleConfig> = { en: EN, ja: JA };

// ──────────────────────────────────────────────────────────────
// Generator (same shape as build-openhl-clob-seed.ts)
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
  duration: 400, // L0..L10 total 380 + L11 (20)
  xpReward: 820, // L0..L10 total 780 + L11 (40)
  tags: ['reth', 'evm', 'precompile', 'clob', 'l1', 'openhl', 'expert'],
  sortOrder: 800,
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

  return `// AUTO-GENERATED from drafts/openhl_precompiles_*_${locale}.md by .github/scripts/build-openhl-precompiles-seed.ts
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

  console.log(`Building openhl-precompiles seed file (locale=${locale}) from drafts...`);
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
