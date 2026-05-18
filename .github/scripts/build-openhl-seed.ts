#!/usr/bin/env tsx
/**
 * Build prisma/seed-reth-openhl-consensus-en.ts from drafts/openhl_*_en.md.
 *
 * Each draft file in drafts/openhl_*_en.md has one or two lessons inside it,
 * wrapped in metadata blocks. This script extracts the lesson markdown,
 * escapes it for TS template literals, and emits a single seed file that
 * registers the course + every lesson in the right module/sortOrder.
 *
 * Drift policy: this is a build artifact. Re-run when drafts/ changes.
 * Don't hand-edit the generated seed file (changes to course metadata go
 * here in the build script, not the output).
 *
 * Run from rethlab root:
 *   npx tsx .github/scripts/build-openhl-seed.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const RETHLAB_ROOT = join(SCRIPT_DIR, '..', '..');
const DRAFTS_DIR = join(RETHLAB_ROOT, 'drafts');
const OUT_PATH = join(RETHLAB_ROOT, 'prisma', 'seed-reth-openhl-consensus-en.ts');

/** A lesson as it appears in a draft, plus its location in the course. */
interface Lesson {
  /** From the draft's `- **Module:** N (Title), sortOrder K within module` line. */
  moduleNumber: number;
  moduleTitle: string;
  moduleSortOrder: number;
  /** From the draft's `- ... sortOrder K within module` line. */
  sortOrder: number;
  /** From the draft's `## L<N> — \`<slug>\`` heading and surrounding context. */
  title: string;
  slug: string;
  duration: number;
  xpReward: number;
  /** Raw markdown body — TS-escaped (backticks + ${} escaped). */
  content: string;
}

// Course-level constants. The build script controls these; the drafts don't.
const COURSE = {
  slug: 'reth-openhl-consensus-en',
  title: 'Building OpenHL — Consensus Substrate',
  description:
    "The L1 Architect tier's worked example: build a Hyperliquid-shape L1 (BFT consensus + EVM execution + CLOB matching engine) on Reth and Malachite. By the end you've followed every load-bearing piece — the four-message ConsensusBridge contract, Malachite's Context trait, Reth's NodeBuilder swap-slots, the proposer hot loop, custom EVM precompiles that read live orderbook state — through real code at psyto/openhl. The course where consensus theory becomes a running cargo binary.",
  difficulty: 'EXPERT' as const,
  // Sum of lesson durations from the 13 drafts.
  duration: 195,
  // Sum of lesson XP rewards.
  xpReward: 560,
  track: 'reth-l1-architect',
  tags: ['reth', 'malachite', 'bft', 'evm', 'clob', 'l1', 'openhl', 'expert'],
  sortOrder: 600,
  locale: 'en',
  instructorName: 'RethLab',
  isPublished: false,
};

// Module metadata. Each is keyed by module-number-in-the-course-outline.
const MODULES: Record<number, { title: string; sortOrder: number }> = {
  1: { title: 'The execution/consensus split', sortOrder: 0 },
  2: { title: 'Malachite as a library', sortOrder: 1 },
  3: { title: 'Reth as a library', sortOrder: 2 },
  4: { title: 'Wiring it up — the consensus crate', sortOrder: 3 },
  5: { title: 'Single-validator devnet', sortOrder: 4 },
};

// Per-lesson metadata. Each lesson lives in exactly one draft file.
// We hard-code the mapping so the build script doesn't have to parse the
// (markdown, human-readable) metadata blocks; that would be brittle.
const LESSONS: Array<{
  draftFile: string;
  moduleNumber: number;
  sortOrder: number;
  title: string;
  slug: string;
  duration: number;
  xpReward: number;
  /** H1 marker in the markdown so the extractor can find the lesson start. */
  h1Marker: string;
  /** First N chars of the lesson; used to disambiguate when one draft has multiple lessons. */
  startSignature: string;
}> = [
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
    startSignature: '**You don\'t fork Reth. You configure it.**',
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
];

/** Escape a markdown string so it's a safe TS template-literal body. */
function escapeForTemplateLiteral(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/**
 * Extract one lesson's body from a draft. Drafts have lesson content wrapped
 * in ````markdown … ```` fences. Some drafts have two lessons; we
 * disambiguate via the H1 marker.
 */
function extractLessonBody(draft: string, h1Marker: string, startSig: string): string {
  // Find the H1 marker inside any ````markdown fenced block.
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

async function buildLesson(spec: (typeof LESSONS)[number]): Promise<Lesson> {
  const draftPath = join(DRAFTS_DIR, spec.draftFile);
  const draft = await readFile(draftPath, 'utf8');
  const body = extractLessonBody(draft, spec.h1Marker, spec.startSignature);
  const escaped = escapeForTemplateLiteral(body);
  return {
    moduleNumber: spec.moduleNumber,
    moduleTitle: MODULES[spec.moduleNumber].title,
    moduleSortOrder: MODULES[spec.moduleNumber].sortOrder,
    sortOrder: spec.sortOrder,
    title: spec.title,
    slug: spec.slug,
    duration: spec.duration,
    xpReward: spec.xpReward,
    content: escaped,
  };
}

function renderSeedFile(lessons: Lesson[]): string {
  const lessonsByModule = new Map<number, Lesson[]>();
  for (const l of lessons) {
    const arr = lessonsByModule.get(l.moduleNumber) ?? [];
    arr.push(l);
    lessonsByModule.set(l.moduleNumber, arr);
  }

  const moduleBlocks = [...lessonsByModule.entries()]
    .sort(([a], [b]) => a - b)
    .map(([num, mLessons]) => {
      const module = MODULES[num];
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

  return `// AUTO-GENERATED from drafts/openhl_*_en.md by .github/scripts/build-openhl-seed.ts
// Do not hand-edit. Re-run the build script when drafts change.

import { PrismaClient } from '@prisma/client';

export async function seedRethOpenHlConsensusEN(prisma: PrismaClient) {
  const tags = ${JSON.stringify(COURSE.tags)};

  await prisma.course.create({
    data: {
      slug: ${JSON.stringify(COURSE.slug)},
      title: ${JSON.stringify(COURSE.title)},
      description:
        ${JSON.stringify(COURSE.description)},
      difficulty: ${JSON.stringify(COURSE.difficulty)},
      duration: ${COURSE.duration},
      xpReward: ${COURSE.xpReward},
      track: ${JSON.stringify(COURSE.track)},
      tags,
      isPublished: ${COURSE.isPublished},
      sortOrder: ${COURSE.sortOrder},
      locale: ${JSON.stringify(COURSE.locale)},
      instructorName: ${JSON.stringify(COURSE.instructorName)},
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

async function main(): Promise<void> {
  console.log('Building openhl seed file from drafts...');
  console.log(`  drafts:  ${DRAFTS_DIR}`);
  console.log(`  output:  ${OUT_PATH}`);

  const lessons: Lesson[] = [];
  for (const spec of LESSONS) {
    try {
      const lesson = await buildLesson(spec);
      lessons.push(lesson);
      console.log(`  ✓ ${spec.slug.padEnd(35)} (M${spec.moduleNumber}.${spec.sortOrder})`);
    } catch (err) {
      console.error(`  ✗ ${spec.slug}: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  const seedFile = renderSeedFile(lessons);
  await writeFile(OUT_PATH, seedFile, 'utf8');
  console.log();
  console.log(`Wrote ${lessons.length} lessons across ${new Set(lessons.map((l) => l.moduleNumber)).size} modules.`);
  console.log(`Output: ${OUT_PATH}`);
}

main().catch((err: unknown) => {
  console.error('UNCAUGHT:', err);
  process.exit(2);
});
