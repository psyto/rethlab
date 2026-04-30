import type { LearningProgressService, Progress } from '@/types';
import { prisma } from '@/lib/db';

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
}

export const learningService = new StubLearningProgressService();
