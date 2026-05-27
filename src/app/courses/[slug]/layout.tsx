import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

type Props = {
  params: Promise<{ slug: string }>;
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { title: true, description: true },
  });

  if (!course) {
    return { title: 'Course Not Found' };
  }

  const isJa = slug.endsWith('-ja');
  const baseSlug = isJa ? slug.replace(/-ja$/, '') : slug.replace(/-en$/, '');
  const enUrl = `/courses/${baseSlug}-en`;
  const jaUrl = `/courses/${baseSlug}-ja`;
  const canonical = isJa ? jaUrl : enUrl;
  const canonicalAbs = `${siteUrl}${canonical}`;

  const keywordSet = new Set<string>([
    'RethLab',
    'Rust Ethereum',
    'Reth',
    'Revm',
    'Alloy',
    'Foundry',
    'EVM',
  ]);
  const slugTerms = baseSlug
    .split('-')
    .filter((t) => t.length > 2)
    .map((t) => t.toLowerCase());
  for (const term of slugTerms) keywordSet.add(term);

  return {
    title: course.title,
    description: course.description,
    keywords: Array.from(keywordSet),
    alternates: {
      canonical,
      languages: {
        en: enUrl,
        ja: jaUrl,
        'x-default': enUrl,
      },
    },
    openGraph: {
      title: `${course.title} | RethLab`,
      description: course.description,
      url: canonicalAbs,
      locale: isJa ? 'ja_JP' : 'en_US',
      alternateLocale: isJa ? 'en_US' : 'ja_JP',
    },
  };
}

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { title: true, description: true, locale: true },
  });

  if (!course) return children;

  const isJa = slug.endsWith('-ja');
  const baseSlug = isJa ? slug.replace(/-ja$/, '') : slug.replace(/-en$/, '');
  const enPath = `/courses/${baseSlug}-en`;
  const jaPath = `/courses/${baseSlug}-ja`;
  const canonicalPath = isJa ? jaPath : enPath;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    inLanguage: course.locale === 'ja' ? 'ja' : 'en',
    provider: {
      '@type': 'Organization',
      name: 'RethLab',
      url: siteUrl,
    },
    url: canonicalUrl,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Courses',
        item: `${siteUrl}/courses`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: course.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}
