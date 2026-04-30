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

  return {
    title: course.title,
    description: course.description,
    openGraph: {
      title: `${course.title} | Fabrknt Learn`,
      description: course.description,
    },
  };
}

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
