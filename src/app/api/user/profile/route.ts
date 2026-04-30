import { prisma } from '@/lib/db';
import { requireAuth, apiSuccess, apiError, withErrorHandler } from '@/lib/api/utils';
import { getUserAchievements } from '@/lib/services/achievements';

export const GET = withErrorHandler(async () => {
  const user = await requireAuth();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      displayName: true,
      name: true,
      bio: true,
      totalXP: true,
      currentStreak: true,
      longestStreak: true,
      createdAt: true,
      locale: true,
      theme: true,
      isPublic: true,
      image: true,
      email: true,
      achievements: true,
    },
  });

  if (!dbUser) {
    return apiError('User not found', 404);
  }

  // Completed courses
  const completedEnrollments = await prisma.enrollment.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    include: {
      course: { select: { slug: true, title: true, track: true } },
    },
    orderBy: { completedAt: 'desc' },
  });

  const completedCourses = completedEnrollments.map((e) => ({
    slug: e.course.slug,
    title: e.course.title,
    completedAt: e.completedAt?.toISOString() || e.startedAt.toISOString(),
  }));

  // Skill breakdown for radar chart (count completed lessons by track)
  const allEnrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: {
      course: { select: { track: true } },
      lessonProgress: { where: { isCompleted: true } },
    },
  });

  const skillMap: Record<string, number> = {
    'hl-architecture': 0,
    'trading-api': 0,
    'vault-development': 0,
    'hyperevm': 0,
    'strategies': 0,
  };
  for (const enr of allEnrollments) {
    const track = enr.course.track;
    if (track && track in skillMap) {
      skillMap[track] += enr.lessonProgress.length;
    }
  }

  // Achievements
  const achievements = getUserAchievements(dbUser.achievements);

  return apiSuccess({
    displayName: dbUser.displayName || dbUser.name || 'Anonymous',
    bio: dbUser.bio,
    totalXP: dbUser.totalXP,
    currentStreak: dbUser.currentStreak,
    longestStreak: dbUser.longestStreak,
    joinDate: dbUser.createdAt.toISOString(),
    completedCourses,
    locale: dbUser.locale,
    theme: dbUser.theme,
    isPublic: dbUser.isPublic,
    image: dbUser.image,
    email: dbUser.email,
    achievements,
    skills: skillMap,
  });
});

export const PATCH = withErrorHandler(async (req) => {
  const user = await requireAuth();
  const body = await req.json();

  const allowedFields = ['name', 'displayName', 'bio', 'theme', 'locale', 'isPublic'] as const;
  const data: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  if (Object.keys(data).length === 0) {
    return apiError('No valid fields to update', 400);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      displayName: true,
      name: true,
      bio: true,
      theme: true,
      locale: true,
      isPublic: true,
    },
  });

  return apiSuccess(updated);
});
