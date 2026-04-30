import type {
  LearningProgressService,
  Progress,
  StreakData,
  LeaderboardEntry,
} from '@/types';
import { prisma } from '@/lib/db';
import { calculateLevel } from '@/lib/utils';
import { checkAndUnlockAchievements } from './achievements';

/**
 * Implementation of LearningProgressService.
 * Uses Prisma/PostgreSQL for progress tracking.
 */
export class StubLearningProgressService implements LearningProgressService {
  async getProgress(userId: string, courseId: string): Promise<Progress> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        lessonProgress: { where: { isCompleted: true } },
        course: {
          include: {
            modules: {
              include: { lessons: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return {
        courseId,
        userId,
        completedLessons: [],
        totalLessons: 0,
        percentage: 0,
        enrollmentStatus: 'active',
      };
    }

    const totalLessons = enrollment.course.modules.reduce(
      (sum, m) => sum + m.lessons.length,
      0
    );
    const completedLessonIds = enrollment.lessonProgress.map((lp) => {
      const allLessons = enrollment.course.modules.flatMap((m) => m.lessons);
      return allLessons.findIndex((l) => l.id === lp.lessonId);
    });

    return {
      courseId,
      userId,
      completedLessons: completedLessonIds.filter((i) => i >= 0),
      totalLessons,
      percentage: totalLessons > 0
        ? Math.round((completedLessonIds.length / totalLessons) * 100)
        : 0,
      enrollmentStatus: enrollment.status.toLowerCase() as 'active' | 'completed' | 'dropped',
    };
  }

  async completeLesson(
    userId: string,
    courseId: string,
    lessonIndex: number
  ): Promise<void> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { sortOrder: 'asc' },
              include: {
                lessons: { orderBy: { sortOrder: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!enrollment) throw new Error('Not enrolled');

    const allLessons = enrollment.course.modules.flatMap((m) => m.lessons);
    const lesson = allLessons[lessonIndex];
    if (!lesson) throw new Error('Lesson not found');

    // Check if lesson was already completed (avoid double XP)
    const existing = await prisma.lessonProgress.findUnique({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
        },
      },
    });
    const alreadyCompleted = existing?.isCompleted ?? false;

    await prisma.lessonProgress.upsert({
      where: {
        enrollmentId_lessonId: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
        isCompleted: true,
        completedAt: new Date(),
      },
      update: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // Only award XP if not already completed
    if (!alreadyCompleted) {
      // Award lesson XP — this is the only source of XP (no hidden bonuses)
      await prisma.xPEvent.create({
        data: {
          userId,
          amount: lesson.xpReward,
          reason: lesson.type === 'CHALLENGE' ? 'CHALLENGE_COMPLETE' : 'LESSON_COMPLETE',
          sourceId: lesson.id,
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalXP: { increment: lesson.xpReward },
          lastActiveAt: new Date(),
        },
      });

      // Update streak (tracking only, no bonus)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.streakDay.upsert({
        where: { userId_date: { userId, date: today } },
        create: { userId, date: today },
        update: {},
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const hadYesterday = await prisma.streakDay.findUnique({
          where: { userId_date: { userId, date: yesterday } },
        });
        const newStreak = hadYesterday ? user.currentStreak + 1 : 1;
        await prisma.user.update({
          where: { id: userId },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, user.longestStreak),
          },
        });
      }
    }

    // Update enrollment progress
    const completedCount = await prisma.lessonProgress.count({
      where: { enrollmentId: enrollment.id, isCompleted: true },
    });
    const totalLessons = allLessons.length;
    const progress = Math.round((completedCount / totalLessons) * 100);

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progress,
        status: progress >= 100 ? 'COMPLETED' : 'ACTIVE',
        completedAt: progress >= 100 ? new Date() : undefined,
      },
    });
  }

  async getXP(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalXP: true },
    });
    return user?.totalXP ?? 0;
  }

  async getStreak(userId: string): Promise<StreakData> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true, lastActiveAt: true },
    });

    const recentDays = await prisma.streakDay.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 90,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isActiveToday = recentDays.some(
      (d) => d.date.getTime() === today.getTime()
    );

    return {
      currentStreak: user?.currentStreak ?? 0,
      longestStreak: user?.longestStreak ?? 0,
      lastActiveDate: user?.lastActiveAt?.toISOString() ?? null,
      streakHistory: recentDays.map((d) => d.date.toISOString().split('T')[0]),
      isActiveToday,
    };
  }

  async getLeaderboard(
    timeframe: 'weekly' | 'monthly' | 'alltime'
  ): Promise<LeaderboardEntry[]> {
    if (timeframe === 'alltime') {
      // All-time: sort by totalXP directly
      const users = await prisma.user.findMany({
        where: { isPublic: true },
        orderBy: { totalXP: 'desc' },
        take: 100,
        select: {
          id: true,
          displayName: true,
          name: true,
          image: true,
          totalXP: true,
          currentStreak: true,
        },
      });

      return users.map((user, index) => ({
        rank: index + 1,
        userId: user.id,
        displayName: user.displayName || user.name || 'Anonymous',
        image: user.image,
        totalXP: user.totalXP,
        level: calculateLevel(user.totalXP),
        currentStreak: user.currentStreak,
      }));
    }

    // Weekly/monthly: aggregate XP events within timeframe
    const now = new Date();
    const since = new Date();
    if (timeframe === 'weekly') {
      since.setDate(now.getDate() - 7);
    } else {
      since.setDate(now.getDate() - 30);
    }

    const xpByUser = await prisma.xPEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 100,
    });

    if (xpByUser.length === 0) return [];

    const userIds = xpByUser.map((x) => x.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, isPublic: true },
      select: {
        id: true,
        displayName: true,
        name: true,
        image: true,
        totalXP: true,
        currentStreak: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return xpByUser
      .filter((x) => userMap.has(x.userId))
      .map((x, index) => {
        const user = userMap.get(x.userId)!;
        return {
          rank: index + 1,
          userId: user.id,
          displayName: user.displayName || user.name || 'Anonymous',
          image: user.image,
          totalXP: x._sum.amount ?? 0,
          level: calculateLevel(user.totalXP),
          currentStreak: user.currentStreak,
        };
      });
  }
}

export const learningService = new StubLearningProgressService();
