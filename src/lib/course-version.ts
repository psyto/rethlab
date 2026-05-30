export type CourseVersion = 'v1' | 'v2';

export function resolveCourseVersion(value: string | null | undefined): CourseVersion {
  return value === 'v2' ? 'v2' : 'v1';
}

export function isV2Slug(slug: string): boolean {
  return slug.includes('-v2-');
}
