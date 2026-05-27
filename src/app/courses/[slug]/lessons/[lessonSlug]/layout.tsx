import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

type Props = {
  params: Promise<{ slug: string; lessonSlug: string }>;
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lessonSlug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, title: true },
  });

  if (!course) {
    return { title: 'Lesson Not Found' };
  }

  const lesson = await prisma.lesson.findFirst({
    where: { slug: lessonSlug, module: { courseId: course.id } },
    select: { title: true, content: true, slug: true },
  });

  if (!lesson) {
    return { title: 'Lesson Not Found' };
  }

  // Extract first ~155 chars of content as description (strip markdown)
  const description = lesson.content
    ? lesson.content.replace(/[#*`\[\]()>_~|\\-]/g, '').replace(/\n+/g, ' ').trim().slice(0, 155) + '...'
    : `${lesson.title} — ${course.title} on RethLab`;

  // Compute hreflang siblings: this course slug ↔ its EN/JA twin
  const isJa = slug.endsWith('-ja');
  const baseCourseSlug = isJa ? slug.replace(/-ja$/, '') : slug.replace(/-en$/, '');
  const baseLessonSlug = lesson.slug.replace(/-(en|ja)$/, '');

  const enLessonSlug = `${baseLessonSlug}-en`;
  const jaLessonSlug = `${baseLessonSlug}-ja`;

  // Slugs are stable across reseeds, so we can build hreflang URLs without
  // re-querying for the sibling lesson rows.
  const enUrl = `/courses/${baseCourseSlug}-en/lessons/${enLessonSlug}`;
  const jaUrl = `/courses/${baseCourseSlug}-ja/lessons/${jaLessonSlug}`;
  const canonical = isJa ? jaUrl : enUrl;
  const canonicalAbs = `${siteUrl}${canonical}`;

  const languages: Record<string, string> = {
    en: enUrl,
    ja: jaUrl,
    'x-default': enUrl,
  };

  const keywordSet = new Set<string>([
    'RethLab',
    'Rust Ethereum',
    'Reth',
    'Revm',
    'Alloy',
    'Foundry',
    'EVM',
  ]);
  for (const t of baseCourseSlug.split('-')) {
    if (t.length > 2) keywordSet.add(t.toLowerCase());
  }
  for (const t of baseLessonSlug.split('-')) {
    if (t.length > 2) keywordSet.add(t.toLowerCase());
  }

  return {
    title: `${lesson.title} — ${course.title}`,
    description,
    keywords: Array.from(keywordSet),
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: `${lesson.title} — ${course.title} | RethLab`,
      description,
      url: canonicalAbs,
      locale: isJa ? 'ja_JP' : 'en_US',
      alternateLocale: isJa ? 'en_US' : 'ja_JP',
    },
  };
}

export default async function LessonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; lessonSlug: string }>;
}) {
  const { slug, lessonSlug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, title: true, locale: true },
  });
  if (!course) return children;

  const lesson = await prisma.lesson.findFirst({
    where: { slug: lessonSlug, module: { courseId: course.id } },
    select: { title: true, content: true, slug: true },
  });
  if (!lesson) return children;

  const isJa = slug.endsWith('-ja');
  const baseCourseSlug = isJa ? slug.replace(/-ja$/, '') : slug.replace(/-en$/, '');
  const baseLessonSlug = lesson.slug.replace(/-(en|ja)$/, '');
  const enLessonSlug = `${baseLessonSlug}-en`;
  const jaLessonSlug = `${baseLessonSlug}-ja`;
  const enPath = `/courses/${baseCourseSlug}-en/lessons/${enLessonSlug}`;
  const jaPath = `/courses/${baseCourseSlug}-ja/lessons/${jaLessonSlug}`;
  const canonicalPath = isJa ? jaPath : enPath;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const coursePath = `/courses/${slug}`;
  const courseUrl = `${siteUrl}${coursePath}`;

  const plainText = lesson.content
    ? lesson.content.replace(/[#*`\[\]()>_~|\\-]/g, '').replace(/\n+/g, ' ').trim().slice(0, 200)
    : `${lesson.title} — ${course.title}`;

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: lesson.title,
    description: plainText,
    inLanguage: course.locale === 'ja' ? 'ja' : 'en',
    isPartOf: {
      '@type': 'Course',
      name: course.title,
      url: courseUrl,
    },
    author: {
      '@type': 'Organization',
      name: 'RethLab',
    },
    publisher: {
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
        item: courseUrl,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: lesson.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}
