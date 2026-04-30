import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://fabrknt.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/rethlab',
      disallow: ['/rethlab/api/', '/rethlab/profile/', '/rethlab/settings/'],
    },
    sitemap: `${origin}/rethlab/sitemap.xml`,
  };
}
