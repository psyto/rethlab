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
    title: 'Building OpenHL — Consensus Substrate',
    description:
      "The L1 Architect tier's worked example: build a Hyperliquid-shape L1 (BFT consensus + EVM execution + CLOB matching engine) on Reth and Malachite. By the end you've followed every load-bearing piece — the four-message ConsensusBridge contract, Malachite's Context trait, Reth's NodeBuilder swap-slots, the proposer hot loop, custom EVM precompiles that read live orderbook state — through real code at psyto/openhl. The course where consensus theory becomes a running cargo binary.",
    track: 'reth-l1-architect',
    instructorName: 'RethLab',
  },
  modules: {
    1: { title: 'The execution/consensus split', sortOrder: 0 },
    2: { title: 'Malachite as a library', sortOrder: 1 },
    3: { title: 'Reth as a library', sortOrder: 2 },
    4: { title: 'Wiring it up — the consensus crate', sortOrder: 3 },
    5: { title: 'Single-validator devnet', sortOrder: 4 },
  },
  lessons: [
    {
      draftFile: 'openhl_l1_en.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'The contract between BFT and the EVM',
      slug: 'openhl-consensus-contract-en',
      duration: 15,
      xpReward: 40,
      h1Marker: '# The contract between BFT and the EVM',
      startSignature: "It's 3am. Your OpenHL devnet halted three blocks ago.",
    },
    {
      draftFile: 'openhl_l2_l3_en.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'Where Hyperliquid, Tempo, and CometBFT-based chains all converge',
      slug: 'openhl-consensus-convergence-en',
      duration: 15,
      xpReward: 40,
      h1Marker: '# Where Hyperliquid, Tempo, and CometBFT-based chains all converge',
      startSignature: 'Pick any production BFT L1 and read its consensus-side architecture.',
    },
    {
      draftFile: 'openhl_l2_l3_en.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'What Malachite gives you — the Context trait',
      slug: 'openhl-malachite-context-en',
      duration: 15,
      xpReward: 40,
      h1Marker: '# What Malachite gives you — the `Context` trait',
      startSignature:
        'Malachite is one trait with ten associated types and four methods.',
    },
    {
      draftFile: 'openhl_l4_l5_en.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'What you implement — proposals, validators, votes, signing',
      slug: 'openhl-malachite-impl-en',
      duration: 20,
      xpReward: 60,
      h1Marker: '# What you implement — proposals, validators, votes, signing',
      startSignature: 'L3 named the ten types. Now we write them.',
    },
    {
      draftFile: 'openhl_l4_l5_en.md',
      moduleNumber: 2,
      sortOrder: 2,
      title: 'The actor model behind malachitebft-engine',
      slug: 'openhl-malachite-engine-en',
      duration: 15,
      xpReward: 40,
      h1Marker: '# The actor model behind `malachitebft-engine`',
      startSignature: 'L3 said Malachite is "the abstract Tendermint algorithm',
    },
    {
      draftFile: 'openhl_l6_l8_en.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'Reth without the geth-shape — NodeBuilder and components',
      slug: 'openhl-reth-nodebuilder-en',
      duration: 15,
      xpReward: 40,
      h1Marker: '# Reth without the geth-shape — NodeBuilder and components',
      startSignature: "**You don't fork Reth. You configure it.**",
    },
    {
      draftFile: 'openhl_l7_l10_en.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'The Engine API — what forkchoice_updated and new_payload actually do',
      slug: 'openhl-engine-api-en',
      duration: 15,
      xpReward: 40,
      h1Marker: '# The Engine API — what `forkchoice_updated` and `new_payload` actually do',
      startSignature: "It's 3am. Two services on the same machine",
    },
    {
      draftFile: 'openhl_l6_l8_en.md',
      moduleNumber: 3,
      sortOrder: 2,
      title: 'Where a block comes from — payload building inside Reth',
      slug: 'openhl-payload-building-en',
      duration: 15,
      xpReward: 40,
      h1Marker: '# Where a block comes from — payload building inside Reth',
      startSignature: 'Between `forkchoice_updated(parent, attrs)`',
    },
    {
      draftFile: 'openhl_l9_en.md',
      moduleNumber: 4,
      sortOrder: 0,
      title: 'Designing the contract — the ConsensusBridge trait',
      slug: 'openhl-bridge-trait-en',
      duration: 20,
      xpReward: 60,
      h1Marker: '# Designing the contract — the `ConsensusBridge` trait',
      startSignature: 'Every chain that bolts BFT onto an EVM ends up writing this trait.',
    },
    {
      draftFile: 'openhl_l7_l10_en.md',
      moduleNumber: 4,
      sortOrder: 1,
      title: 'From Malachite Decided to Reth forkchoice_updated',
      slug: 'openhl-decided-to-fcu-en',
      duration: 15,
      xpReward: 40,
      h1Marker: '# From Malachite `Decided` to Reth `forkchoice_updated`',
      startSignature:
        "It's 3am. Your validator just signed the deciding precommit on block 17.",
    },
    {
      draftFile: 'openhl_l11_en.md',
      moduleNumber: 4,
      sortOrder: 2,
      title: 'Producing blocks — Malachite proposer → Reth payload → broadcast',
      slug: 'openhl-proposer-en',
      duration: 15,
      xpReward: 40,
      h1Marker: '# Producing blocks — Malachite proposer → Reth payload → broadcast',
      startSignature:
        "It's 3am. Malachite's leader-election function just picked you as proposer",
    },
    {
      draftFile: 'openhl_l12_l13_en.md',
      moduleNumber: 5,
      sortOrder: 0,
      title: 'Bootstrapping — genesis, keys, the single-node config',
      slug: 'openhl-devnet-bootstrap-en',
      duration: 10,
      xpReward: 30,
      h1Marker: '# Bootstrapping — genesis, keys, the single-node config',
      startSignature: "You've installed every concept in modules 1–4.",
    },
    {
      draftFile: 'openhl_l12_l13_en.md',
      moduleNumber: 5,
      sortOrder: 1,
      title: 'The first block — running openhl and watching it tick',
      slug: 'openhl-devnet-first-block-en',
      duration: 10,
      xpReward: 30,
      h1Marker: '# The first block — running openhl and watching it tick',
      startSignature: 'If you see `decided_hash = BlockHash',
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
    title: 'OpenHL を構築する — Consensus Substrate',
    description:
      'L1 Architect tier の worked example: Reth と Malachite の上に Hyperliquid 形状の L1 (BFT consensus + EVM execution + CLOB matching engine) を構築する。読み終える頃には、load-bearing なすべての piece — 4 メッセージ ConsensusBridge contract、Malachite の Context trait、Reth の NodeBuilder swap-slot、proposer hot loop、live orderbook state を読むカスタム EVM precompile — を psyto/openhl の実コードを通じて追跡した。Consensus 理論が動く cargo バイナリになるコース。',
    track: 'reth-l1-architect',
    instructorName: 'RethLab',
  },
  modules: {
    1: { title: 'Execution/consensus split', sortOrder: 0 },
    2: { title: 'ライブラリとしての Malachite', sortOrder: 1 },
    3: { title: 'ライブラリとしての Reth', sortOrder: 2 },
    4: { title: '配線 — consensus crate', sortOrder: 3 },
    5: { title: 'Single-validator devnet', sortOrder: 4 },
  },
  lessons: [
    {
      draftFile: 'openhl_l1_ja.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'BFT と EVM の contract',
      slug: 'openhl-consensus-contract-ja',
      duration: 15,
      xpReward: 40,
      h1Marker: '# BFT と EVM の contract',
      startSignature: '午前 3 時。OpenHL の devnet が 3 ブロック前から停止している。',
    },
    {
      draftFile: 'openhl_l2_l3_ja.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'Hyperliquid、Tempo、CometBFT 系チェーンが converge する場所',
      slug: 'openhl-consensus-convergence-ja',
      duration: 15,
      xpReward: 40,
      h1Marker: '# Hyperliquid、Tempo、CometBFT 系チェーンがすべて converge する場所',
      startSignature:
        'Production の BFT L1 をどれか 1 つ取って、consensus 側のアーキテクチャを読め。',
    },
    {
      draftFile: 'openhl_l2_l3_ja.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'Malachite が与えてくれるもの — Context trait',
      slug: 'openhl-malachite-context-ja',
      duration: 15,
      xpReward: 40,
      h1Marker: '# Malachite が与えてくれるもの — `Context` trait',
      startSignature:
        'Malachite は 10 個の associated type と 4 個のメソッドを持つ 1 つの trait',
    },
    {
      draftFile: 'openhl_l4_l5_ja.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'お前が実装するもの — proposal、validator、vote、signing',
      slug: 'openhl-malachite-impl-ja',
      duration: 20,
      xpReward: 60,
      h1Marker: '# お前が実装するもの — proposal、validator、vote、signing',
      startSignature: 'L3 は 10 個の type に名前を付けた。次にそれらを書く。',
    },
    {
      draftFile: 'openhl_l4_l5_ja.md',
      moduleNumber: 2,
      sortOrder: 2,
      title: 'malachitebft-engine の actor model',
      slug: 'openhl-malachite-engine-ja',
      duration: 15,
      xpReward: 40,
      h1Marker: '# `malachitebft-engine` の actor model',
      startSignature:
        'L3 は Malachite を「I/O を抜いた抽象 Tendermint アルゴリズム」と言った。',
    },
    {
      draftFile: 'openhl_l6_l8_ja.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'Geth 形を捨てた Reth — NodeBuilder と component',
      slug: 'openhl-reth-nodebuilder-ja',
      duration: 15,
      xpReward: 40,
      h1Marker: '# Geth 形を捨てた Reth — NodeBuilder と component',
      startSignature: '**Reth を fork しない。configure する。**',
    },
    {
      draftFile: 'openhl_l7_ja.md',
      moduleNumber: 3,
      sortOrder: 1,
      title: 'Engine API — forkchoice_updated と new_payload が実際に何をしているか',
      slug: 'openhl-engine-api-ja',
      duration: 15,
      xpReward: 40,
      h1Marker:
        '# Engine API — `forkchoice_updated` と `new_payload` が実際に何をしているか',
      startSignature: '午前 3 時。同じマシン上の 2 つのサービス',
    },
    {
      draftFile: 'openhl_l6_l8_ja.md',
      moduleNumber: 3,
      sortOrder: 2,
      title: 'ブロックはどこから来るか — Reth 内の payload 構築',
      slug: 'openhl-payload-building-ja',
      duration: 15,
      xpReward: 40,
      h1Marker: '# ブロックはどこから来るか — Reth 内の payload 構築',
      startSignature: '`forkchoice_updated(parent, attrs)` (L7 の request) と',
    },
    {
      draftFile: 'openhl_l9_ja.md',
      moduleNumber: 4,
      sortOrder: 0,
      title: 'Contract を設計する — ConsensusBridge trait',
      slug: 'openhl-bridge-trait-ja',
      duration: 20,
      xpReward: 60,
      h1Marker: '# Contract を設計する — `ConsensusBridge` trait',
      startSignature: 'EVM の上に BFT をボルト止めするすべての chain は最終的にこの trait',
    },
    {
      draftFile: 'openhl_l10_ja.md',
      moduleNumber: 4,
      sortOrder: 1,
      title: 'Malachite の Decided から Reth の forkchoice_updated へ',
      slug: 'openhl-decided-to-fcu-ja',
      duration: 15,
      xpReward: 40,
      h1Marker: '# Malachite の `Decided` から Reth の `forkchoice_updated` へ',
      startSignature: '午前 3 時。バリデータが今しがた block 17 の決定的 precommit',
    },
    {
      draftFile: 'openhl_l11_ja.md',
      moduleNumber: 4,
      sortOrder: 2,
      title: 'ブロックを produce する — Malachite proposer → Reth payload → broadcast',
      slug: 'openhl-proposer-ja',
      duration: 15,
      xpReward: 40,
      h1Marker:
        '# ブロックを produce する — Malachite proposer → Reth payload → broadcast',
      startSignature:
        '午前 3 時。Malachite の leader election 関数が今しがた、お前を height 47',
    },
    {
      draftFile: 'openhl_l12_l13_ja.md',
      moduleNumber: 5,
      sortOrder: 0,
      title: 'Bootstrap — genesis、key、single-node config',
      slug: 'openhl-devnet-bootstrap-ja',
      duration: 10,
      xpReward: 30,
      h1Marker: '# Bootstrap — genesis、key、single-node config',
      startSignature: 'お前は module 1-4 のすべての概念をインストールした。',
    },
    {
      draftFile: 'openhl_l12_l13_ja.md',
      moduleNumber: 5,
      sortOrder: 1,
      title: '最初のブロック — openhl を走らせ、tick するのを見る',
      slug: 'openhl-devnet-first-block-ja',
      duration: 10,
      xpReward: 30,
      h1Marker: '# 最初のブロック — openhl を走らせ、tick するのを見る',
      startSignature: 'テスト出力に `decided_hash = BlockHash([0x42; 32])`',
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
  duration: 195, // sum of lesson durations
  xpReward: 560, // sum of lesson XP rewards
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
