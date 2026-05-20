/**
 * Idempotent (upsert-based) seed.
 *
 * Unlike `seed.ts` which wipes users/enrollments/progress before re-seeding,
 * this script preserves all user data and only updates content (courses,
 * modules, lessons). Safe to run against production.
 *
 * Strategy:
 *   - Capture all course→module→lesson data from the existing seed functions
 *     via a Prisma-shaped Proxy (no schema or seed-function changes needed).
 *   - Upsert courses by `slug` (globally unique).
 *   - For each course, upsert modules by `(courseId, sortOrder)` (no unique
 *     constraint in the schema, so use findFirst + update/create).
 *   - Upsert lessons by `(moduleId, slug)` (composite unique).
 *   - Do NOT delete orphans. If a lesson/module is renamed or removed in
 *     seed data, the old row remains in the DB. Manual cleanup if needed.
 *   - Never touch User, Enrollment, LessonProgress, XPEvent, StreakDay.
 *
 * Run locally:    npm run seed:upsert
 * Run against prod (after `vercel env pull .env.production.local`):
 *   DATABASE_URL=$(grep '^DATABASE_URL' .env.production.local | cut -d'"' -f2) \
 *     npx tsx prisma/seed-upsert.ts
 */
import { PrismaClient, type Prisma } from '@prisma/client';

import { seedRethBeginnerJA } from './seed-reth-beginner-ja';
import { seedRethBeginnerEN } from './seed-reth-beginner-en';
import { seedRethFundamentalsJA } from './seed-reth-fundamentals-ja';
import { seedRethFundamentalsEN } from './seed-reth-fundamentals-en';
import { seedRethBridgeToAdvancedEN } from './seed-reth-bridge-to-advanced-en';
import { seedRethBridgeToAdvancedJA } from './seed-reth-bridge-to-advanced-ja';
import { seedRethAlloyAdvancedEN } from './seed-reth-alloy-advanced-en';
import { seedRethAlloyAdvancedJA } from './seed-reth-alloy-advanced-ja';
import { seedRethRevmAdvancedJA } from './seed-reth-revm-advanced-ja';
import { seedRethRevmAdvancedEN } from './seed-reth-revm-advanced-en';
import { seedRethAdvancedJA } from './seed-reth-advanced-ja';
import { seedRethAdvancedEN } from './seed-reth-advanced-en';
import { seedRethExpertJA } from './seed-reth-expert-ja';
import { seedRethExpertEN } from './seed-reth-expert-en';
import { seedRethBuildingEN } from './seed-reth-building-en';
import { seedRethBuildingJA } from './seed-reth-building-ja';
import { seedRethConsensusEngineeringEN } from './seed-reth-consensus-engineering-en';
import { seedRethConsensusEngineeringJA } from './seed-reth-consensus-engineering-ja';
import { seedRethCrossChainBridgesEN } from './seed-reth-cross-chain-bridges-en';
import { seedRethCrossChainBridgesJA } from './seed-reth-cross-chain-bridges-ja';
import { seedRethSequencerRollupEN } from './seed-reth-sequencer-rollup-en';
import { seedRethSequencerRollupJA } from './seed-reth-sequencer-rollup-ja';
import { seedRethP2PNetworkingEN } from './seed-reth-p2p-networking-en';
import { seedRethP2PNetworkingJA } from './seed-reth-p2p-networking-ja';
import { seedRethValidatorOpsEN } from './seed-reth-validator-ops-en';
import { seedRethValidatorOpsJA } from './seed-reth-validator-ops-ja';
import { seedRethOpenHlConsensusEN } from './seed-reth-openhl-consensus-en';
import { seedRethOpenHlConsensusJA } from './seed-reth-openhl-consensus-ja';
import { seedRethOpenHlClobEN } from './seed-reth-openhl-clob-en';
import { seedRethOpenHlClobJA } from './seed-reth-openhl-clob-ja';
import { seedRethOpenHlPrecompilesEN } from './seed-reth-openhl-precompiles-en';
import { seedRethOpenHlPrecompilesJA } from './seed-reth-openhl-precompiles-ja';
import { seedRethOpenHlFundingEN } from './seed-reth-openhl-funding-en';
import { seedRethOpenHlFundingJA } from './seed-reth-openhl-funding-ja';

const prisma = new PrismaClient();

// All seed functions in order
const seeds: Array<(p: any) => Promise<unknown>> = [
  seedRethBeginnerEN,
  seedRethBeginnerJA,
  seedRethFundamentalsEN,
  seedRethFundamentalsJA,
  seedRethBridgeToAdvancedEN,
  seedRethBridgeToAdvancedJA,
  seedRethAlloyAdvancedEN,
  seedRethAlloyAdvancedJA,
  seedRethRevmAdvancedEN,
  seedRethRevmAdvancedJA,
  seedRethAdvancedEN,
  seedRethAdvancedJA,
  seedRethExpertEN,
  seedRethExpertJA,
  seedRethBuildingEN,
  seedRethBuildingJA,
  seedRethConsensusEngineeringEN,
  seedRethConsensusEngineeringJA,
  seedRethCrossChainBridgesEN,
  seedRethCrossChainBridgesJA,
  seedRethSequencerRollupEN,
  seedRethSequencerRollupJA,
  seedRethP2PNetworkingEN,
  seedRethP2PNetworkingJA,
  seedRethValidatorOpsEN,
  seedRethValidatorOpsJA,
  seedRethOpenHlConsensusEN,
  seedRethOpenHlConsensusJA,
  seedRethOpenHlClobEN,
  seedRethOpenHlClobJA,
  seedRethOpenHlPrecompilesEN,
  seedRethOpenHlPrecompilesJA,
  seedRethOpenHlFundingEN,
  seedRethOpenHlFundingJA,
];

// Capture seed data without writing to DB
async function captureSeedData(): Promise<any[]> {
  const allCourses: any[] = [];
  const captureProxy: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'course') {
          return {
            create: async ({ data }: any) => {
              allCourses.push(data);
              return data;
            },
          };
        }
        // Stub everything else (deleteMany, user.create, etc.) as no-ops
        return new Proxy(
          {},
          {
            get: () => async () => null,
          },
        );
      },
    },
  );

  for (const fn of seeds) await fn(captureProxy);
  return allCourses;
}

type Counts = {
  coursesCreated: number;
  coursesUpdated: number;
  modulesCreated: number;
  modulesUpdated: number;
  lessonsCreated: number;
  lessonsUpdated: number;
};

async function upsertAll(courses: any[]): Promise<Counts> {
  const counts: Counts = {
    coursesCreated: 0,
    coursesUpdated: 0,
    modulesCreated: 0,
    modulesUpdated: 0,
    lessonsCreated: 0,
    lessonsUpdated: 0,
  };

  for (const course of courses) {
    // Pull out the nested modules — everything else is course's own fields
    const { modules, ...courseFields } = course;
    const moduleList: any[] = modules?.create ?? [];

    // Upsert course by slug
    const existingCourse = await prisma.course.findUnique({ where: { slug: course.slug } });
    let courseId: string;
    if (existingCourse) {
      const { slug: _slug, ...rest } = courseFields;
      await prisma.course.update({ where: { slug: course.slug }, data: rest });
      courseId = existingCourse.id;
      counts.coursesUpdated++;
    } else {
      const created = await prisma.course.create({ data: { ...courseFields, modules: undefined } as Prisma.CourseCreateInput });
      courseId = created.id;
      counts.coursesCreated++;
    }

    for (const mod of moduleList) {
      const { lessons, ...moduleFields } = mod;
      const lessonList: any[] = lessons?.create ?? [];

      // Upsert module by (courseId, sortOrder). No unique constraint in schema,
      // so use findFirst + update/create.
      const existingModule = await prisma.module.findFirst({
        where: { courseId, sortOrder: moduleFields.sortOrder },
      });
      let moduleId: string;
      if (existingModule) {
        await prisma.module.update({
          where: { id: existingModule.id },
          data: { title: moduleFields.title },
        });
        moduleId = existingModule.id;
        counts.modulesUpdated++;
      } else {
        const createdMod = await prisma.module.create({
          data: { ...moduleFields, courseId, lessons: undefined } as Prisma.ModuleCreateInput,
        });
        moduleId = createdMod.id;
        counts.modulesCreated++;
      }

      for (const lesson of lessonList) {
        // Lesson is @@unique([moduleId, slug]) — use upsert directly
        await prisma.lesson.upsert({
          where: { moduleId_slug: { moduleId, slug: lesson.slug } },
          create: { ...lesson, moduleId },
          update: { ...lesson },
        });
        // Can't easily distinguish create vs update from upsert return value;
        // do a quick re-check via createdAt vs updatedAt
        const updated = await prisma.lesson.findUnique({
          where: { moduleId_slug: { moduleId, slug: lesson.slug } },
          select: { createdAt: true, updatedAt: true },
        });
        if (
          updated &&
          updated.createdAt.getTime() === updated.updatedAt.getTime()
        ) {
          counts.lessonsCreated++;
        } else {
          counts.lessonsUpdated++;
        }
      }
    }
  }

  return counts;
}

async function main() {
  console.log('Capturing seed data...');
  const courses = await captureSeedData();
  console.log(`  Captured ${courses.length} courses\n`);

  console.log('Upserting (preserves users / enrollments / progress / XP / streaks)...');
  const start = Date.now();
  const counts = await upsertAll(courses);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\nDone in ${elapsed}s:`);
  console.log(`  Courses:  created=${counts.coursesCreated}  updated=${counts.coursesUpdated}`);
  console.log(`  Modules:  created=${counts.modulesCreated}  updated=${counts.modulesUpdated}`);
  console.log(`  Lessons:  created=${counts.lessonsCreated}  updated=${counts.lessonsUpdated}`);

  // Final totals for sanity
  const [c, m, l] = await Promise.all([
    prisma.course.count(),
    prisma.module.count(),
    prisma.lesson.count(),
  ]);
  console.log(`\nDB totals after upsert: ${c} courses, ${m} modules, ${l} lessons`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
