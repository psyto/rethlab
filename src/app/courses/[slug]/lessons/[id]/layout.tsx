import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { title: true, content: true, slug: true },
  });

  const course = await prisma.course.findUnique({
    where: { slug },
    select: { title: true },
  });

  if (!lesson || !course) {
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

  const [enLesson, jaLesson] = await Promise.all([
    prisma.lesson.findUnique({ where: { slug: enLessonSlug }, select: { id: true } }),
    prisma.lesson.findUnique({ where: { slug: jaLessonSlug }, select: { id: true } }),
  ]);

  const enUrl = enLesson ? `/rethlab/courses/${baseCourseSlug}-en/lessons/${enLesson.id}` : undefined;
  const jaUrl = jaLesson ? `/rethlab/courses/${baseCourseSlug}-ja/lessons/${jaLesson.id}` : undefined;
  const canonical = isJa ? jaUrl : enUrl;

  const languages: Record<string, string> = {};
  if (enUrl) languages.en = enUrl;
  if (jaUrl) languages.ja = jaUrl;

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
