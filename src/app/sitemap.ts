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

  const coursePages: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${root}/courses/${course.slug}`,
    lastModified: course.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const lessons = await prisma.lesson.findMany({
    where: { module: { course: { isPublished: true } } },
    select: {
      slug: true,
      updatedAt: true,
      module: { select: { course: { select: { slug: true } } } },
    },
  });

  const lessonPages: MetadataRoute.Sitemap = lessons.map((lesson) => ({
    url: `${root}/courses/${lesson.module.course.slug}/lessons/${lesson.slug}`,
    lastModified: lesson.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...coursePages, ...lessonPages];
}
