import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { apiSuccess, withErrorHandler } from '@/lib/api/utils';
import { getCourses as getCMSCourses, type CMSCourse } from '@/lib/cms/client';
import { resolveCourseVersion } from '@/lib/course-version';
import type { CourseCard } from '@/types';

export const GET = withErrorHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const difficulty = searchParams.get('difficulty') || 'all';
  const locale = searchParams.get('locale') || 'en';
  const version = resolveCourseVersion(searchParams.get('version'));

  const where: Record<string, unknown> = { isPublished: true, locale };
  where.slug = version === 'v2' ? { contains: '-v2-' } : { not: { contains: '-v2-' } };

  if (difficulty !== 'all') {
    where.difficulty = difficulty;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { hasSome: [search.toLowerCase()] } },
    ];
  }

  // Fetch from Prisma (primary source with user-specific data)
  const courses = await prisma.course.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
    include: {
      modules: {
        orderBy: { sortOrder: 'asc' },
        include: {
          lessons: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, slug: true },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  // Fetch CMS data for enrichment (thumbnails, instructor images)
  let cmsIndex: Record<string, CMSCourse> = {};
  try {
    const cmsCourses = await getCMSCourses();
    if (cmsCourses.length > 0) {
      cmsIndex = Object.fromEntries(cmsCourses.map((c) => [c.slug, c]));
    }
  } catch {
    // CMS unavailable — continue with DB data only
  }

  // Optionally add user progress
  const user = await getCurrentUser().catch(() => null);
  let enrollments: Record<string, number> = {};

  if (user?.id) {
    const userEnrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      select: { courseId: true, progress: true },
    });
    enrollments = Object.fromEntries(
      userEnrollments.map((e) => [e.courseId, e.progress])
    );
  }

  const result: CourseCard[] = courses.map((course) => {
    const cms = cmsIndex[course.slug];
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      thumbnail: cms?.thumbnail || course.thumbnail,
      difficulty: course.difficulty,
      duration: course.duration,
      xpReward: course.xpReward,
      track: course.track,
      tags: course.tags,
      instructorName: cms?.instructorName || course.instructorName,
      instructorImage: cms?.instructorImage || course.instructorImage,
      totalLessons: course.modules.reduce((sum, m) => sum + m.lessons.length, 0),
      lessonSlugs: course.modules.flatMap((m) => m.lessons.map((l) => l.slug)),
      enrolledCount: course._count.enrollments,
      userProgress: enrollments[course.id],
      version,
    };
  });

  return apiSuccess(result);
});
