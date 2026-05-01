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

  return [...staticPages, ...coursePages];
}
