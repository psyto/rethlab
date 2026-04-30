import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { title: true, content: true },
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
    : `${lesson.title} — ${course.title} on Fabrknt Learn`;

  return {
    title: `${lesson.title} — ${course.title}`,
    description,
    openGraph: {
      title: `${lesson.title} — ${course.title} | Fabrknt Learn`,
      description,
    },
  };
}

export default function LessonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
