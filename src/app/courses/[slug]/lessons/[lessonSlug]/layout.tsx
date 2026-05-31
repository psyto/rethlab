import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

type Props = {
  params: Promise<{ slug: string; lessonSlug: string }>;
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const PUBLISHER_LOGO_URL = `${siteUrl}/favicon.svg`;

/**
 * Distill a clean meta description out of lesson markdown.
 * Strips HTML comments, fenced code, headings, list/quote markers, emphasis,
 * tables, links/images, and HTML — then collapses whitespace and trims to
 * a sentence boundary (or word boundary as fallback) so the result reads as
 * prose, not as mangled markdown.
 */
function distillDescription(content: string | null | undefined, maxLen: number): string | null {
  if (!content) return null;
  const cleaned = content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/^>+\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/(^|[^_])_([^_\n]+)_(?!\w)/g, '$1$2')
    .replace(/<[^>]+>/g, '')
    // Strip pure-separator lines like `|---|---|` left by markdown tables.
    // Pattern intentionally built via `new RegExp` so the Tailwind v4 source
    // scanner does not interpret the bracket form as an arbitrary class.
    .replace(new RegExp('^[\\s\\-:|]+$', 'gm'), '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  if (cleaned.length <= maxLen) return cleaned;
  const sliced = cleaned.slice(0, maxLen);
  // Prefer a sentence boundary in the last quarter of the slice, so snippets
  // don't end mid-phrase. Covers EN punctuation + JA full-width 。！？
  const minBoundary = Math.floor(maxLen * 0.75);
  const sentenceEnd = sliced.search(/[.!?。！？](?=[^.!?。！？]*$)/);
  if (sentenceEnd >= minBoundary) {
    return sliced.slice(0, sentenceEnd + 1).trim();
  }
  const trimmed = sliced.replace(/\s+\S*$/, '');
  return (trimmed || sliced) + '…';
}

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

  const description =
    distillDescription(lesson.content, 155) ?? `${lesson.title} — ${course.title} on RethLab`;

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

  const ogImageAlt = `${lesson.title} — RethLab`;

  return {
    // Lesson title alone (drops the redundant course-title suffix). The root
    // layout's `title.template = '%s | RethLab'` appends the site brand.
    title: lesson.title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: 'article',
      siteName: 'RethLab',
      title: `${lesson.title} — ${course.title}`,
      description,
      url: canonicalAbs,
      locale: isJa ? 'ja_JP' : 'en_US',
      alternateLocale: isJa ? 'en_US' : 'ja_JP',
      // Override the static module-level alt from opengraph-image.tsx with the
      // actual lesson title so social-card alt-text is meaningful.
      images: [
        {
          url: `${canonicalAbs}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${lesson.title} — ${course.title}`,
      description,
      creator: '@psyto',
      site: '@psyto',
      images: [
        {
          url: `${canonicalAbs}/opengraph-image`,
          alt: ogImageAlt,
        },
      ],
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
    select: { id: true, title: true, locale: true, difficulty: true },
  });
  if (!course) return children;

  const lesson = await prisma.lesson.findFirst({
    where: { slug: lessonSlug, module: { courseId: course.id } },
    select: {
      title: true,
      content: true,
      slug: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    },
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
  const ogImageUrl = `${canonicalUrl}/opengraph-image`;

  const plainText =
    distillDescription(lesson.content, 200) ?? `${lesson.title} — ${course.title}`;

  // Multi-type the lesson as both an Article (broad rich-result eligibility)
  // and a LearningResource (semantically accurate for course content).
  const lessonJsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Article', 'LearningResource'],
    headline: lesson.title,
    name: lesson.title,
    description: plainText,
    inLanguage: course.locale === 'ja' ? 'ja' : 'en',
    image: ogImageUrl,
    datePublished: lesson.createdAt.toISOString(),
    dateModified: lesson.updatedAt.toISOString(),
    educationalLevel: course.difficulty.toLowerCase(),
    learningResourceType: lesson.type === 'QUIZ' ? 'Quiz' : 'Lesson',
    isPartOf: {
      '@type': 'Course',
      name: course.title,
      url: courseUrl,
    },
    author: {
      '@type': 'Organization',
      name: 'RethLab',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'RethLab',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: PUBLISHER_LOGO_URL,
      },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(lessonJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {children}
    </>
  );
}
