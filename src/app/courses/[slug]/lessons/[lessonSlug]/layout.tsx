import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

type Props = {
  params: Promise<{ slug: string; lessonSlug: string }>;
};

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

  const languages: Record<string, string> = {
    en: enUrl,
    ja: jaUrl,
  };

  return {
    title: `${lesson.title} — ${course.title}`,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: `${lesson.title} — ${course.title} | RethLab`,
      description,
      locale: isJa ? 'ja_JP' : 'en_US',
      alternateLocale: isJa ? 'en_US' : 'ja_JP',
    },
  };
}

export default function LessonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
