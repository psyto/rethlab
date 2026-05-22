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
      "Build the consensus substrate for an HL-shape L1 from scratch — wire real Reth (EVM) and real Malachite (BFT) into a single Rust workspace that produces blocks end-to-end. The reference implementation is `psyto/openhl`. The first course in the DIY Perp series.",
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Foundations', sortOrder: 1 },
    2: { title: 'Contract types', sortOrder: 2 },
    3: { title: 'EL test double', sortOrder: 3 },
    4: { title: 'CL types', sortOrder: 4 },
    5: { title: 'Engine integration', sortOrder: 5 },
    6: { title: 'Live Reth', sortOrder: 6 },
    7: { title: 'Capstone', sortOrder: 7 },
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
      startSignature: 'Concepts you\'ll grasp in this lesson',
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
      startSignature: 'Concepts you\'ll grasp in this lesson',
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
      startSignature: 'Concepts you\'ll grasp in this lesson',
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
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l5_en.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'Lesson 5 — RethEvmBridge with real alloy types',
      slug: 'openhl-reth-bridge-en',
      duration: 40,
      xpReward: 70,
      h1Marker: '# Lesson 5 — `RethEvmBridge` with real alloy types',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l6_en.md',
      moduleNumber: 4,
      sortOrder: 0,
      title: 'Lesson 6 — OpenHlContext and the 10 Malachite sub-types',
      slug: 'openhl-malachite-context-en',
      duration: 50,
      xpReward: 90,
      h1Marker: '# Lesson 6 — `OpenHlContext` and the 10 Malachite sub-types',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l7_en.md',
      moduleNumber: 4,
      sortOrder: 1,
      title: 'Lesson 7 — OpenHlSigningProvider and canonical encoding',
      slug: 'openhl-signing-provider-en',
      duration: 40,
      xpReward: 80,
      h1Marker: '# Lesson 7 — `OpenHlSigningProvider` and canonical encoding',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l8_en.md',
      moduleNumber: 4,
      sortOrder: 2,
      title: 'Lesson 8 — OpenHlCodec — codec slot the engine demands',
      slug: 'openhl-codec-en',
      duration: 35,
      xpReward: 70,
      h1Marker: '# Lesson 8 — `OpenHlCodec` — codec slot the engine demands',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l9_en.md',
      moduleNumber: 4,
      sortOrder: 3,
      title: 'Lesson 9 — OpenHlNode and the first start_engine call',
      slug: 'openhl-node-en',
      duration: 55,
      xpReward: 100,
      h1Marker: '# Lesson 9 — `OpenHlNode` and the first `start_engine` call',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l10_en.md',
      moduleNumber: 5,
      sortOrder: 0,
      title: 'Lesson 10 — run_engine_app and the first block through the actor pipeline',
      slug: 'openhl-engine-app-en',
      duration: 55,
      xpReward: 100,
      h1Marker: '# Lesson 10 — `run_engine_app` and the first block through the actor pipeline',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l11_en.md',
      moduleNumber: 6,
      sortOrder: 0,
      title: 'Lesson 11 — Booting a live Reth EthereumNode in your workspace',
      slug: 'openhl-reth-bootstrap-en',
      duration: 40,
      xpReward: 80,
      h1Marker: '# Lesson 11 — Booting a live Reth `EthereumNode` in your workspace',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l12_en.md',
      moduleNumber: 6,
      sortOrder: 1,
      title: 'Lesson 12 — LiveRethEvmBridge reads parents from the real chain',
      slug: 'openhl-live-bridge-en',
      duration: 50,
      xpReward: 100,
      h1Marker: '# Lesson 12 — `LiveRethEvmBridge` reads parents from the real chain',
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l13_en.md',
      moduleNumber: 6,
      sortOrder: 2,
      title: "Lesson 13 — validate_payload runs Reth's EthBeaconConsensus",
      slug: 'openhl-validate-payload-en',
      duration: 55,
      xpReward: 100,
      h1Marker: "# Lesson 13 — `validate_payload` runs Reth's `EthBeaconConsensus`",
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l14_en.md',
      moduleNumber: 6,
      sortOrder: 3,
      title: "Lesson 14 — commit drives Reth's Engine API forkchoice",
      slug: 'openhl-commit-forkchoice-en',
      duration: 50,
      xpReward: 90,
      h1Marker: "# Lesson 14 — `commit` drives Reth's Engine API forkchoice",
      startSignature: 'Concepts you\'ll grasp in this lesson',
    },
    {
      draftFile: 'openhl_l15_en.md',
      moduleNumber: 7,
      sortOrder: 0,
      title: "Lesson 15 — What you built, what's still stub, where to go next",
      slug: 'openhl-capstone-en',
      duration: 25,
      xpReward: 60,
      h1Marker: "# Lesson 15 — What you built, what's still stub, where to go next",
      startSignature: 'Over 14 lessons you went from `cargo init`',
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
    title: 'OpenHL 自作開発ガイド：`cargo init` から始める single-validator devnet 構築',
    description:
      'Hyperliquid シェイプの L1 コンセンサス層をスクラッチで構築します。プロダクションクオリティの Reth (EVM) と Malachite (BFT) を単一の Rust workspace へ統合し、end-to-end でのブロック生成機構を実装。リファレンス実装（psyto/openhl）をベースに手を動かしながら学ぶ、「DIY Perp シリーズ」の記念すべきファーストステップです。',
    track: 'diy-perp',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Foundations', sortOrder: 1 },
    2: { title: 'Contract types', sortOrder: 2 },
    3: { title: 'EL test double', sortOrder: 3 },
    4: { title: 'CL types', sortOrder: 4 },
    5: { title: 'Engine integration', sortOrder: 5 },
    6: { title: 'Live Reth', sortOrder: 6 },
    7: { title: 'Capstone', sortOrder: 7 },
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
      startSignature: 'このレッスンで掴む概念',
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
      startSignature: 'このレッスンで掴む概念',
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
      startSignature: 'このレッスンで掴む概念',
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
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l5_ja.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'レッスン 5 — real alloy 型を使う RethEvmBridge',
      slug: 'openhl-reth-bridge-ja',
      duration: 40,
      xpReward: 70,
      h1Marker: '# レッスン 5 — real alloy 型を使う `RethEvmBridge`',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l6_ja.md',
      moduleNumber: 4,
      sortOrder: 0,
      title: 'レッスン 6 — OpenHlContext と Malachite の 10 sub-type',
      slug: 'openhl-malachite-context-ja',
      duration: 50,
      xpReward: 90,
      h1Marker: '# レッスン 6 — `OpenHlContext` と Malachite の 10 sub-type',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l7_ja.md',
      moduleNumber: 4,
      sortOrder: 1,
      title: 'レッスン 7 — OpenHlSigningProvider と canonical encoding',
      slug: 'openhl-signing-provider-ja',
      duration: 40,
      xpReward: 80,
      h1Marker: '# レッスン 7 — `OpenHlSigningProvider` と canonical encoding',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l8_ja.md',
      moduleNumber: 4,
      sortOrder: 2,
      title: 'レッスン 8 — OpenHlCodec — エンジンが要求する codec スロット',
      slug: 'openhl-codec-ja',
      duration: 35,
      xpReward: 70,
      h1Marker: '# レッスン 8 — `OpenHlCodec` — エンジンが要求する codec スロット',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l9_ja.md',
      moduleNumber: 4,
      sortOrder: 3,
      title: 'レッスン 9 — OpenHlNode と初の start_engine 呼び出し',
      slug: 'openhl-node-ja',
      duration: 55,
      xpReward: 100,
      h1Marker: '# レッスン 9 — `OpenHlNode` と初の `start_engine` 呼び出し',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l10_ja.md',
      moduleNumber: 5,
      sortOrder: 0,
      title: 'レッスン 10 — run_engine_app と actor pipeline 経由の最初のブロック',
      slug: 'openhl-engine-app-ja',
      duration: 55,
      xpReward: 100,
      h1Marker: '# レッスン 10 — `run_engine_app` と actor pipeline 経由の最初のブロック',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l11_ja.md',
      moduleNumber: 6,
      sortOrder: 0,
      title: 'レッスン 11 — workspace で live Reth EthereumNode を boot する',
      slug: 'openhl-reth-bootstrap-ja',
      duration: 40,
      xpReward: 80,
      h1Marker: '# レッスン 11 — workspace で live Reth `EthereumNode` を boot する',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l12_ja.md',
      moduleNumber: 6,
      sortOrder: 1,
      title: 'レッスン 12 — LiveRethEvmBridge が real chain から parent を読む',
      slug: 'openhl-live-bridge-ja',
      duration: 50,
      xpReward: 100,
      h1Marker: '# レッスン 12 — `LiveRethEvmBridge` が real chain から parent を読む',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l13_ja.md',
      moduleNumber: 6,
      sortOrder: 2,
      title: 'レッスン 13 — validate_payload が Reth の EthBeaconConsensus を走らせる',
      slug: 'openhl-validate-payload-ja',
      duration: 55,
      xpReward: 100,
      h1Marker: '# レッスン 13 — `validate_payload` が Reth の `EthBeaconConsensus` を走らせる',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l14_ja.md',
      moduleNumber: 6,
      sortOrder: 3,
      title: 'レッスン 14 — commit が Reth の Engine API forkchoice を駆動する',
      slug: 'openhl-commit-forkchoice-ja',
      duration: 50,
      xpReward: 90,
      h1Marker: '# レッスン 14 — `commit` が Reth の Engine API forkchoice を駆動する',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'openhl_l15_ja.md',
      moduleNumber: 7,
      sortOrder: 0,
      title: 'レッスン 15 — 作ったもの、まだ stub のもの、次に行く先',
      slug: 'openhl-capstone-ja',
      duration: 25,
      xpReward: 60,
      h1Marker: '# レッスン 15 — 作ったもの、まだ stub のもの、次に行く先',
      startSignature: '空ディレクトリの `cargo init` から、',
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
  duration: 660, // L0..L14 total 635 + L15 (25) — build-along pilot complete
  xpReward: 1270, // L0..L14 total 1210 + L15 (60) — build-along pilot complete
  tags: ['reth', 'malachite', 'bft', 'evm', 'clob', 'l1', 'openhl', 'expert'],
  sortOrder: 600,
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
