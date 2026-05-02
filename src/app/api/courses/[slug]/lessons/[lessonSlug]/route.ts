import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { apiSuccess, apiError, withErrorHandler } from '@/lib/api/utils';

export const GET = withErrorHandler(async (_req, ctx) => {
  const { slug, lessonSlug } = await ctx.params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { sortOrder: 'asc' },
        include: {
          lessons: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, title: true, slug: true },
          },
        },
      },
    },
  });

  if (!course) {
    return apiError('Course not found', 404);
  }

  // LAUNCH MODE: All courses fully open — no sign-in, no XP gating
  // Sign-in still needed for tracking progress (mark complete, earn XP)
  // TODO: Re-enable gating after launch period
  // const isBeginner = course.difficulty === 'BEGINNER';
  // const XP_REQUIREMENTS = { BEGINNER: 0, INTERMEDIATE: 350, ADVANCED: 750 };

  const authUser = await getCurrentUser().catch(() => null);

  // Flatten all lessons in order to find prev/next
  const allLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))
  );
  const lessonIndex = allLessons.findIndex((l) => l.slug === lessonSlug);

  if (lessonIndex === -1) {
    return apiError('Lesson not found', 404);
  }

  // Slug is unique within a module (per @@unique([moduleId, slug])); resolve
  // it to the row id we already have from the course query, then fetch the
  // full lesson body by id.
  const lessonId = allLessons[lessonIndex].id;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) {
    return apiError('Lesson not found', 404);
  }

  const prevLesson = lessonIndex > 0
    ? { slug: allLessons[lessonIndex - 1].slug, title: allLessons[lessonIndex - 1].title }
    : null;
  const nextLesson = lessonIndex < allLessons.length - 1
    ? { slug: allLessons[lessonIndex + 1].slug, title: allLessons[lessonIndex + 1].title }
    : null;

  // Check completion status
  const user = await getCurrentUser().catch(() => null);
  let isCompleted = false;

  if (user?.id) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    if (enrollment) {
      const progress = await prisma.lessonProgress.findUnique({
        where: {
          enrollmentId_lessonId: {
            enrollmentId: enrollment.id,
            lessonId,
          },
        },
      });
      isCompleted = progress?.isCompleted ?? false;
    }
  }

  return apiSuccess({
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    type: lesson.type,
    content: lesson.content,
    xpReward: lesson.xpReward,
    starterCode: lesson.starterCode,
    solutionCode: lesson.solutionCode,
    testCases: lesson.testCases,
    hints: lesson.hints,
    challengeLanguage: lesson.challengeLanguage,
    quizQuestions: lesson.quizQuestions,
    moduleTitle: allLessons[lessonIndex].moduleTitle,
    courseSlug: course.slug,
    courseTitle: course.title,
    courseXpReward: course.xpReward,
    lessonIndex,
    prevLesson,
    nextLesson,
    isCompleted,
  });
});
