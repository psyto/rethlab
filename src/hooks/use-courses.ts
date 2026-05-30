import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { CourseCard } from '@/types';

export function useCourses(search?: string, difficulty?: string, locale?: string, version?: 'v1' | 'v2') {
  return useQuery<CourseCard[]>({
    queryKey: ['courses', search, difficulty, locale, version],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (difficulty && difficulty !== 'all') params.set('difficulty', difficulty);
      if (locale) params.set('locale', locale);
      if (version) params.set('version', version);
      const qs = params.toString();
      return apiFetch<CourseCard[]>(`/api/courses${qs ? `?${qs}` : ''}`);
    },
  });
}
