/**
 * Read-only check of the production Neon DB user table.
 *
 * Loads DATABASE_URL from .env.production.local before importing PrismaClient,
 * so the prod connection string never has to be passed on the command line.
 *
 * Run with: npx tsx prisma/scripts/check-prod-users.ts
 *
 * SAFE to run — only SELECT / count queries, no writes.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load prod env BEFORE importing Prisma. `override: true` is essential —
// Prisma's auto-loader picks up `.env` (which has the localhost DATABASE_URL)
// at process startup, so without override the prod URL gets ignored.
config({ path: resolve(__dirname, '../../.env.production.local'), override: true });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.production.local');
  process.exit(1);
}

// Don't print the URL itself, but confirm we're pointing at Neon
const dbHost = (() => {
  try {
    const u = new URL(process.env.DATABASE_URL);
    return u.host.replace(/[^.]+\./, '*.'); // mask the subdomain
  } catch {
    return '???';
  }
})();
console.log(`Connecting to: ${dbHost}\n`);

import { PrismaClient } from '@prisma/client';
// Neon pooler is pgbouncer-flavored — Prisma needs `pgbouncer=true` to use
// it correctly. Also extend connect+pool timeouts for cold-wake from scale-to-zero.
const dbUrl = new URL(process.env.DATABASE_URL!);
dbUrl.searchParams.set('pgbouncer', 'true');
dbUrl.searchParams.set('connect_timeout', '60');
dbUrl.searchParams.set('pool_timeout', '60');
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl.toString() } } });

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, name: true, displayName: true, totalXP: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const real = users.filter((u) => u.email !== 'dev@rethlab.com');

  console.log(`Total users: ${users.length}`);
  console.log(`Non-dev users: ${real.length}\n`);

  if (real.length > 0) {
    console.log('Non-dev users:');
    for (const u of real) {
      const days = Math.floor((Date.now() - u.createdAt.getTime()) / 86400000);
      console.log(
        `  ${u.email.padEnd(40)} XP=${String(u.totalXP).padStart(4)}  ${u.createdAt.toISOString().slice(0, 10)}  (${days}d ago)`,
      );
    }
    console.log();
  }

  const enrollments = await prisma.enrollment.count();
  const progress = await prisma.lessonProgress.count();
  const xpEvents = await prisma.xPEvent.count();
  const streaks = await prisma.streakDay.count();

  console.log('Activity records:');
  console.log(`  Enrollments:        ${enrollments}`);
  console.log(`  Lesson progress:    ${progress}`);
  console.log(`  XP events:          ${xpEvents}`);
  console.log(`  Streak days:        ${streaks}`);

  const lessons = await prisma.lesson.count();
  const courses = await prisma.course.count();
  console.log(`\nContent in DB:`);
  console.log(`  Courses:  ${courses}`);
  console.log(`  Lessons:  ${lessons}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
