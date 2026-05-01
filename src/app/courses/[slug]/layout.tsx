import type { Metadata } from 'next';
import { prisma } from '@/lib/db';

type Props = {
  params: Promise<{ slug: string }>;
};

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

  return {
    title: course.title,
    description: course.description,
    alternates: {
      canonical,
      languages: {
        en: enUrl,
        ja: jaUrl,
      },
    },
    openGraph: {
      title: `${course.title} | RethLab`,
      description: course.description,
      locale: isJa ? 'ja_JP' : 'en_US',
      alternateLocale: isJa ? 'en_US' : 'ja_JP',
    },
  };
}

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
