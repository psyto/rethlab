import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://fabrknt.com/rethlab';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/courses`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/leaderboard`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/auth/signin`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Dynamic course pages
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    select: { slug: true, updatedAt: true },
  });

  const coursePages: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${baseUrl}/courses/${course.slug}`,
    lastModified: course.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticPages, ...coursePages];
}
