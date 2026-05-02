import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { TestCase, QuizQuestion } from '@/types';

export interface LessonDetail {
  id: string;
  slug: string;
  title: string;
  type: 'CONTENT' | 'CHALLENGE' | 'VIDEO' | 'QUIZ';
  content: string;
  xpReward: number;
  starterCode: string | null;
  solutionCode: string | null;
  testCases: TestCase[] | null;
  hints: string[];
  challengeLanguage: string | null;
  quizQuestions: QuizQuestion[] | null;
  moduleTitle: string;
  courseSlug: string;
  courseTitle: string;
  courseXpReward: number;
  lessonIndex: number;
  prevLesson: { slug: string; title: string } | null;
  nextLesson: { slug: string; title: string } | null;
  isCompleted: boolean;
}

export function useLesson(slug: string, lessonSlug: string) {
  return useQuery<LessonDetail>({
    queryKey: ['lesson', slug, lessonSlug],
    queryFn: () => apiFetch<LessonDetail>(`/api/courses/${slug}/lessons/${lessonSlug}`),
    enabled: !!slug && !!lessonSlug,
  });
}
