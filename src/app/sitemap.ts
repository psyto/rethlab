import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const root =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://rethlab.fabrknt.com';

  const staticPages: MetadataRoute.Sitemap = [
    { url: root, changeFrequency: 'weekly', priority: 1 },
    { url: `${root}/courses`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${root}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${root}/donate`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${root}/auth/signin`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });

  // Build hreflang annotations so Google can pair EN/JA siblings at the
  // sitemap level (belt-and-suspenders alongside the page-level hreflang).
  const courseAlternates = (slug: string) => {
    const base = slug.replace(/-(en|ja)$/, '');
    return {
      languages: {
        en: `${root}/courses/${base}-en`,
        ja: `${root}/courses/${base}-ja`,
        'x-default': `${root}/courses/${base}-en`,
      },
    };
  };

  const coursePages: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${root}/courses/${course.slug}`,
    lastModified: course.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
    alternates: courseAlternates(course.slug),
  }));

  const lessons = await prisma.lesson.findMany({
    where: { module: { course: { isPublished: true } } },
    select: {
      slug: true,
      updatedAt: true,
      module: { select: { course: { select: { slug: true } } } },
    },
  });

  const lessonAlternates = (courseSlug: string, lessonSlug: string) => {
    const baseCourse = courseSlug.replace(/-(en|ja)$/, '');
    const baseLesson = lessonSlug.replace(/-(en|ja)$/, '');
    return {
      languages: {
        en: `${root}/courses/${baseCourse}-en/lessons/${baseLesson}-en`,
        ja: `${root}/courses/${baseCourse}-ja/lessons/${baseLesson}-ja`,
        'x-default': `${root}/courses/${baseCourse}-en/lessons/${baseLesson}-en`,
      },
    };
  };

  const lessonPages: MetadataRoute.Sitemap = lessons.map((lesson) => ({
    url: `${root}/courses/${lesson.module.course.slug}/lessons/${lesson.slug}`,
    lastModified: lesson.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
    alternates: lessonAlternates(lesson.module.course.slug, lesson.slug),
  }));

  return [...staticPages, ...coursePages, ...lessonPages];
}
