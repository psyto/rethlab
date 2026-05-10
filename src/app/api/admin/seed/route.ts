import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { seedRethBeginnerEN } from '../../../../../prisma/seed-reth-beginner-en';
import { seedRethBeginnerJA } from '../../../../../prisma/seed-reth-beginner-ja';
import { seedRethFundamentalsEN } from '../../../../../prisma/seed-reth-fundamentals-en';
import { seedRethFundamentalsJA } from '../../../../../prisma/seed-reth-fundamentals-ja';
import { seedRethBridgeToAdvancedEN } from '../../../../../prisma/seed-reth-bridge-to-advanced-en';
import { seedRethBridgeToAdvancedJA } from '../../../../../prisma/seed-reth-bridge-to-advanced-ja';
import { seedRethAlloyAdvancedEN } from '../../../../../prisma/seed-reth-alloy-advanced-en';
import { seedRethAlloyAdvancedJA } from '../../../../../prisma/seed-reth-alloy-advanced-ja';
import { seedRethRevmAdvancedEN } from '../../../../../prisma/seed-reth-revm-advanced-en';
import { seedRethRevmAdvancedJA } from '../../../../../prisma/seed-reth-revm-advanced-ja';
import { seedRethAdvancedEN } from '../../../../../prisma/seed-reth-advanced-en';
import { seedRethAdvancedJA } from '../../../../../prisma/seed-reth-advanced-ja';
import { seedRethExpertEN } from '../../../../../prisma/seed-reth-expert-en';
import { seedRethExpertJA } from '../../../../../prisma/seed-reth-expert-ja';
import { seedRethBuildingEN } from '../../../../../prisma/seed-reth-building-en';
import { seedRethBuildingJA } from '../../../../../prisma/seed-reth-building-ja';

// Temporary admin endpoint — remove after seeding
// POST /api/admin/seed?key=<AUTH_SECRET>
// POST /api/admin/seed?key=<AUTH_SECRET>&mode=full  (clears all course data first)
// POST /api/admin/seed?key=<AUTH_SECRET>&mode=add   (only adds missing courses)
export async function POST(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const mode = url.searchParams.get('mode') || 'full';

  if (key !== process.env.AUTH_SECRET?.trim()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (mode === 'full') {
      // Clear all course data (preserves users/accounts/sessions)
      await prisma.xPEvent.deleteMany();
      await prisma.streakDay.deleteMany();
      await prisma.lessonProgress.deleteMany();
      await prisma.enrollment.deleteMany();
      await prisma.lesson.deleteMany();
      await prisma.module.deleteMany();
      await prisma.course.deleteMany();
    }

    const existing = await prisma.course.findMany({ select: { slug: true } });
    const existingSlugs = new Set(existing.map((c) => c.slug));

    const results: string[] = [];

    const tracks = [
      { name: 'Beginner EN', fn: seedRethBeginnerEN, checkSlug: 'reth-beginner-en' },
      { name: 'Beginner JA', fn: seedRethBeginnerJA, checkSlug: 'reth-beginner-ja' },
      { name: 'Fundamentals EN', fn: seedRethFundamentalsEN, checkSlug: 'reth-fundamentals-en' },
      { name: 'Fundamentals JA', fn: seedRethFundamentalsJA, checkSlug: 'reth-fundamentals-ja' },
      { name: 'Bridge to Advanced EN', fn: seedRethBridgeToAdvancedEN, checkSlug: 'reth-bridge-to-advanced-en' },
      { name: 'Bridge to Advanced JA', fn: seedRethBridgeToAdvancedJA, checkSlug: 'reth-bridge-to-advanced-ja' },
      { name: 'Alloy Advanced EN (draft)', fn: seedRethAlloyAdvancedEN, checkSlug: 'alloy-advanced-en' },
      { name: 'Alloy Advanced JA (draft)', fn: seedRethAlloyAdvancedJA, checkSlug: 'alloy-advanced-ja' },
      { name: 'Revm Advanced EN', fn: seedRethRevmAdvancedEN, checkSlug: 'revm-advanced-en' },
      { name: 'Revm Advanced JA', fn: seedRethRevmAdvancedJA, checkSlug: 'revm-advanced-ja' },
      { name: 'Reth Advanced EN', fn: seedRethAdvancedEN, checkSlug: 'reth-advanced-en' },
      { name: 'Reth Advanced JA', fn: seedRethAdvancedJA, checkSlug: 'reth-advanced-ja' },
      { name: 'Expert EN', fn: seedRethExpertEN, checkSlug: 'reth-expert-en' },
      { name: 'Expert JA', fn: seedRethExpertJA, checkSlug: 'reth-expert-ja' },
      { name: 'Building EN', fn: seedRethBuildingEN, checkSlug: 'reth-building-en' },
      { name: 'Building JA', fn: seedRethBuildingJA, checkSlug: 'reth-building-ja' },
    ];

    for (const track of tracks) {
      if (mode === 'add' && existingSlugs.has(track.checkSlug)) {
        results.push(`${track.name}: skipped (exists)`);
      } else {
        await track.fn(prisma);
        results.push(`${track.name}: seeded`);
      }
    }

    const courseCount = await prisma.course.count();
    const lessonCount = await prisma.lesson.count();

    return NextResponse.json({
      success: true,
      mode,
      courses: courseCount,
      lessons: lessonCount,
      results,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
