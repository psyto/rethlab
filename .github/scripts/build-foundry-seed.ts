#!/usr/bin/env tsx
/**
 * Build prisma/seed-reth-foundry-{en,ja}.ts from drafts/foundry_*.md.
 *
 * Sister script of build-openhl-adl-seed.ts. Same extraction logic,
 * different draft file naming (foundry_l<N>_<locale>.md), different
 * output filename, different course metadata.
 *
 * Currently covers L0 only — orientation. L1..L6 will be added as drafts
 * land. The Foundry course doesn't pin an openhl SHA (it teaches Foundry
 * itself); L6's capstone references openhl-liquidation Stage 10b
 * (260883b) and lives in-repo at examples/foundry-capstone/.
 *
 * Run from rethlab root:
 *   npx tsx .github/scripts/build-foundry-seed.ts            # generates EN
 *   npx tsx .github/scripts/build-foundry-seed.ts --locale=ja # generates JA
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
  outputFileName: 'seed-reth-foundry-en.ts',
  exportName: 'seedRethFoundryEN',
  course: {
    slug: 'mastering-foundry-en',
    title: 'Mastering Foundry — Solidity testing discipline for engineers who already think in Rust',
    description:
      "The rigorous-testing discipline you learned in rethlab's openhl courses (proptest! conservation laws, debug_assert! routing contracts, byte-for-byte answer keys against openhl SHAs) transfers to Solidity contracts almost 1:1 — and Foundry is the tool that makes the transfer mechanical. This course teaches forge test / fuzz / invariant + cast + anvil for L1 / contract / engine engineers who already think in Rust. By the L6 capstone, you'll have ported openhl-liquidation Stage 10b's InsuranceFund from Rust to Solidity and proven the same 4 conservation invariants with forge — same theorem, two languages, both mechanically proven. Foundry mastery is now a commodity prerequisite for serious L1 work; this course assumes you already have the discipline and gives you the Solidity syntax. 7 lessons across 4 modules, openhl SHA references via L6 capstone, in-repo answer keys at examples/foundry-capstone/.",
    track: 'reth-stack',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Test discipline', sortOrder: 1 },
    2: { title: 'CLI & state-aware testing', sortOrder: 2 },
    3: { title: 'Capstone', sortOrder: 3 },
  },
  lessons: [
    {
      draftFile: 'foundry_l0_en.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'Mastering Foundry — Solidity testing discipline for engineers who already think in Rust',
      slug: 'foundry-orientation-en',
      duration: 15,
      xpReward: 50,
      h1Marker: '# Mastering Foundry — Solidity testing discipline for engineers who already think in Rust',
      startSignature: "If you've been through any of rethlab's openhl courses",
    },
    {
      draftFile: 'foundry_l1_en.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'Lesson 1 — forge test — the Solidity equivalent of cargo test',
      slug: 'foundry-forge-test-basics-en',
      duration: 25,
      xpReward: 50,
      h1Marker: '# Lesson 1 — `forge test` — the Solidity equivalent of `cargo test`',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'foundry_l2_en.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: "Lesson 2 — forge fuzz — Solidity's proptest!",
      slug: 'foundry-forge-fuzz-en',
      duration: 35,
      xpReward: 70,
      h1Marker: "# Lesson 2 — `forge fuzz` — Solidity's `proptest!`",
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'foundry_l3_en.md',
      moduleNumber: 1,
      sortOrder: 2,
      title: 'Lesson 3 — forge invariant — multi-call invariant testing via the Handler pattern',
      slug: 'foundry-forge-invariant-en',
      duration: 40,
      xpReward: 80,
      h1Marker: '# Lesson 3 — `forge invariant` — multi-call invariant testing via the Handler pattern',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'foundry_l4_en.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: "Lesson 4 — cast — the EVM's curl + jq",
      slug: 'foundry-cast-cli-en',
      duration: 30,
      xpReward: 60,
      h1Marker: "# Lesson 4 — `cast` — the EVM's `curl` + `jq`",
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'foundry_l5_en.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'Lesson 5 — anvil + cheatcodes — local development with mainnet state',
      slug: 'foundry-anvil-cheatcodes-en',
      duration: 35,
      xpReward: 70,
      h1Marker: '# Lesson 5 — `anvil` + cheatcodes — local development with mainnet state',
      startSignature: "Concepts you'll grasp in this lesson",
    },
    {
      draftFile: 'foundry_l6_en.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: "Lesson 6 — Capstone — port openhl-liquidation's InsuranceFund to Solidity, prove the 4 invariants",
      slug: 'foundry-capstone-en',
      duration: 60,
      xpReward: 110,
      h1Marker: "# Lesson 6 — Capstone — port openhl-liquidation's `InsuranceFund` to Solidity, prove the 4 invariants",
      startSignature: "Concepts you'll grasp in this lesson",
    },
  ],
};

// ──────────────────────────────────────────────────────────────
// JA configuration
// ──────────────────────────────────────────────────────────────

const JA: LocaleConfig = {
  outputFileName: 'seed-reth-foundry-ja.ts',
  exportName: 'seedRethFoundryJA',
  course: {
    slug: 'mastering-foundry-ja',
    title: 'Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律',
    description:
      '本コースは、rethlab の openhl 系列コースで学んだ厳格なテスト規律（proptest! による保存則、debug_assert! によるルーティング契約、openhl SHA に対する Byte-for-byte の検証）を、Solidity コントラクトへ機械的に転写（Transfer）するための道具立てとして Foundry を扱います。\n\nすでに Rust で思考する L1 / コントラクト / エンジン開発者を前提に、forge test の基本アサーションから、forge fuzz（Solidity 版 proptest!）、複数呼び出しに対する forge invariant、CLI ツールとしての cast、メインネット状態を再現する anvil --fork-url ＋ cheatcodes までを網羅。Cheatcodes が単に「リモートノードに JSON-RPC で依頼する」のではなく、「REVM を内部から操作する Magic Precompile」であるというアーキテクチャの正体まで掘り下げます。\n\n最終章（L7 Capstone）では、openhl-liquidation Stage 10b の InsuranceFund を Rust から Solidity へ移植（Port）。まったく同じ 4 つの保存則（Invariants）を forge invariant で 10,000 iteration 実行し、同じ定理を 2 つの言語で機械的に検証することで、テスト規律が言語の壁を超えて成立することを体感します。\n\n2026 年現在、Foundry の習得は本格的な L1 / インフラ開発における前提条件（Commodity Prerequisite）であり、もはやそれ自体は競争優位ではありません。本コースは単なる「ツールの使い方」ではなく、「すでに脳内にある厳格な規律を Solidity 側へいかに持ち込むか」を叩き込む、唯一無二のポジショニングを取ります。\n\n全 4 モジュール・7 レッスン。リポジトリ内の examples/foundry-capstone/ にリファレンス実装が常駐します。',
    track: 'reth-stack',
    instructorName: 'RethLab',
  },
  modules: {
    0: { title: 'Orientation', sortOrder: 0 },
    1: { title: 'Test discipline', sortOrder: 1 },
    2: { title: 'CLI & state-aware testing', sortOrder: 2 },
    3: { title: 'Capstone', sortOrder: 3 },
  },
  lessons: [
    {
      draftFile: 'foundry_l0_ja.md',
      moduleNumber: 0,
      sortOrder: 0,
      title: 'Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律',
      slug: 'foundry-orientation-ja',
      duration: 15,
      xpReward: 50,
      h1Marker: '# Foundry を極める — すでに Rust で考えるエンジニアのための Solidity テスト規律',
      startSignature: 'rethlab の openhl 系コース',
    },
    {
      draftFile: 'foundry_l1_ja.md',
      moduleNumber: 1,
      sortOrder: 0,
      title: 'レッスン 1 — forge test — cargo test の Solidity 等価物',
      slug: 'foundry-forge-test-basics-ja',
      duration: 25,
      xpReward: 50,
      h1Marker: '# レッスン 1 — `forge test` — `cargo test` の Solidity 等価物',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'foundry_l2_ja.md',
      moduleNumber: 1,
      sortOrder: 1,
      title: 'レッスン 2 — forge fuzz — Solidity の proptest!',
      slug: 'foundry-forge-fuzz-ja',
      duration: 35,
      xpReward: 70,
      h1Marker: '# レッスン 2 — `forge fuzz` — Solidity の `proptest!`',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'foundry_l3_ja.md',
      moduleNumber: 1,
      sortOrder: 2,
      title: 'レッスン 3 — forge invariant — Handler パターンによる multi-call invariant testing',
      slug: 'foundry-forge-invariant-ja',
      duration: 40,
      xpReward: 80,
      h1Marker: '# レッスン 3 — `forge invariant` — Handler パターンによる multi-call invariant testing',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'foundry_l4_ja.md',
      moduleNumber: 2,
      sortOrder: 0,
      title: 'レッスン 4 — cast — EVM の curl + jq',
      slug: 'foundry-cast-cli-ja',
      duration: 30,
      xpReward: 60,
      h1Marker: '# レッスン 4 — `cast` — EVM の `curl` + `jq`',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'foundry_l5_ja.md',
      moduleNumber: 2,
      sortOrder: 1,
      title: 'レッスン 5 — anvil + cheatcodes — real な mainnet state でのローカル開発',
      slug: 'foundry-anvil-cheatcodes-ja',
      duration: 35,
      xpReward: 70,
      h1Marker: '# レッスン 5 — `anvil` + cheatcodes — real な mainnet state でのローカル開発',
      startSignature: 'このレッスンで掴む概念',
    },
    {
      draftFile: 'foundry_l6_ja.md',
      moduleNumber: 3,
      sortOrder: 0,
      title: 'レッスン 6 — Capstone — openhl-liquidation の InsuranceFund を Solidity へ port し、4 つの invariant を証明する',
      slug: 'foundry-capstone-ja',
      duration: 60,
      xpReward: 110,
      h1Marker: '# レッスン 6 — Capstone — openhl-liquidation の `InsuranceFund` を Solidity へ port し、4 つの invariant を証明する',
      startSignature: 'このレッスンで掴む概念',
    },
  ],
};

const LOCALES: Record<Locale, LocaleConfig> = { en: EN, ja: JA };

// ──────────────────────────────────────────────────────────────
// Generator (same shape as build-openhl-adl-seed.ts)
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
  difficulty: 'ADVANCED' as const,
  duration: 240, // L0..L6 (15+25+35+40+30+35+60) — COURSE COMPLETE
  xpReward: 490, // L0..L6 (50+50+70+80+60+70+110) — COURSE COMPLETE
  tags: ['foundry', 'forge', 'anvil', 'cast', 'solidity', 'testing', 'invariants', 'fuzz', 'l1', 'reth'],
  sortOrder: 350,
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

  return `// AUTO-GENERATED from drafts/foundry_*_${locale}.md by .github/scripts/build-foundry-seed.ts
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

  console.log(`Building foundry seed file (locale=${locale}) from drafts...`);
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
