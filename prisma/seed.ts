import { PrismaClient } from '@prisma/client';
import { seedRethBeginnerJA } from './seed-reth-beginner-ja';
import { seedRethBeginnerEN } from './seed-reth-beginner-en';
import { seedRethFundamentalsJA } from './seed-reth-fundamentals-ja';
import { seedRethFundamentalsEN } from './seed-reth-fundamentals-en';
import { seedRethAdvancedJA } from './seed-reth-advanced-ja';
import { seedRethAdvancedEN } from './seed-reth-advanced-en';
import { seedRethExpertJA } from './seed-reth-expert-ja';
import { seedRethExpertEN } from './seed-reth-expert-en';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding RethLab database...');

  // Clear existing data
  await prisma.xPEvent.deleteMany();
  await prisma.streakDay.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // Dev user
  const devUser = await prisma.user.create({
    data: {
      name: 'Dev User',
      displayName: 'RethDev',
      email: 'dev@rethlab.com',
      totalXP: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  });

  console.log('\nSeeding Beginner courses...');
  await seedRethBeginnerEN(prisma);
  await seedRethBeginnerJA(prisma);
  console.log('  Seeded Beginner (EN + JA)');

  console.log('\nSeeding Fundamentals courses...');
  await seedRethFundamentalsEN(prisma);
  await seedRethFundamentalsJA(prisma);
  console.log('  Seeded Fundamentals (EN + JA)');

  console.log('\nSeeding Advanced courses...');
  await seedRethAdvancedEN(prisma);
  await seedRethAdvancedJA(prisma);
  console.log('  Seeded Advanced (EN + JA)');

  console.log('\nSeeding Expert courses...');
  await seedRethExpertEN(prisma);
  await seedRethExpertJA(prisma);
  console.log('  Seeded Expert (EN + JA)');

  const courseCount = await prisma.course.count();
  const moduleCount = await prisma.module.count();
  const lessonCount = await prisma.lesson.count();
  console.log(`\nTotal courses: ${courseCount}`);
  console.log(`Total modules: ${moduleCount}`);
  console.log(`Total lessons: ${lessonCount}`);
  console.log(`Dev user: ${devUser.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\nSeeding complete!');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
