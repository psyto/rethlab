'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import { Search, Clock, BookOpen, Loader2 } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { useCourses, useLocalCompletion } from '@/hooks';

const DIFFICULTY_COLORS = {
  BEGINNER: 'bg-green-500/10 text-green-400 border-green-500/20',
  INTERMEDIATE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  ADVANCED: 'bg-red-500/10 text-red-400 border-red-500/20',
  EXPERT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const TRACK_COLORS: Record<string, string> = {
  'diy-perp': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
};

export default function CourseCatalogPage() {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState('');
  const isJA = locale === 'ja';
  const conceptCourseSlug = isJA ? 'reth-beginner-ja' : 'reth-beginner-en';
  const conceptSystemsSlug = isJA
    ? 'ethereum-as-systems-engineering-ja'
    : 'ethereum-as-systems-engineering-en';
  const conceptAdversarialSlug = isJA
    ? 'ethereum-adversarial-forces-ja'
    : 'ethereum-adversarial-forces-en';

  const { data: courses, isLoading, error } = useCourses(search, 'all', locale);
  const localCompletion = useLocalCompletion();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('courses.catalog.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('courses.catalog.subtitle')}</p>
      </div>

      {/* Concept-first entry points */}
      <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-primary">
          {isJA ? 'Concept First' : 'Concept First'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isJA
            ? 'RethLabの核となるコンセプトを先に掴むなら、まずこの2本から。'
            : 'Start with these two lessons to get the core RethLab concept framing.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/courses/${conceptCourseSlug}/lessons/${conceptSystemsSlug}`}
            className="rounded-lg border border-primary/30 px-3 py-1.5 hover:bg-primary/10"
          >
            {isJA ? 'Ethereumをシステムエンジニアリングとして捉える' : 'Ethereum as Systems Engineering'}
          </Link>
          <Link
            href={`/courses/${conceptCourseSlug}/lessons/${conceptAdversarialSlug}`}
            className="rounded-lg border border-primary/30 px-3 py-1.5 hover:bg-primary/10"
          >
            {isJA ? 'Ethereumを動かす敵対的な力学' : 'Ethereum Adversarial Forces'}
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('courses.catalog.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-20 text-center">
          <p className="text-destructive">{t('errors.loadCourses')}</p>
        </div>
      )}

      {/* Course Grid — strategy-aligned sections:
          Flagship (OpenHL) / Prerequisites / Deep Dives / Advanced */}
      {courses && (() => {
        const text = {
          flagshipHeader: isJA ? 'Flagship Path' : 'Flagship Path',
          flagshipSub: isJA
            ? 'OpenHLを主導線にした実装ジャーニー'
            : 'OpenHL-led implementation journey',
          prereqHeader: isJA ? 'Prerequisites' : 'Prerequisites',
          prereqSub: isJA
            ? 'OpenHLに入る前に固める基礎'
            : 'Foundations before entering OpenHL',
          deepDiveHeader: isJA ? 'Deep Dives (Optional)' : 'Deep Dives (Optional)',
          deepDiveSub: isJA
            ? '詰まった時に参照する中級読解コース'
            : 'Reference tracks for unblock moments',
          advancedHeader: isJA ? 'Advanced Architect' : 'Advanced Architect',
          advancedSub: isJA
            ? 'L1設計・運用の上位トラック'
            : 'Upper-tier L1 architecture and operations',
        };

        const isFlagship = (slug: string, track?: string | null) =>
          track === 'diy-perp' || slug.includes('openhl');
        const isPrereq = (slug: string) =>
          slug.includes('beginner') ||
          slug.includes('fundamentals') ||
          slug.includes('bridge-to-advanced') ||
          slug.includes('perp-primer');
        const isDeepDive = (slug: string) =>
          slug.includes('mastering-foundry') ||
          slug.includes('revm-advanced') ||
          slug.includes('reth-advanced') ||
          slug.includes('alloy-advanced');

        const sectionFor = (course: typeof courses[number]) => {
          if (isFlagship(course.slug, course.track)) return 'flagship';
          if (isPrereq(course.slug)) return 'prereq';
          if (isDeepDive(course.slug)) return 'deep';
          return 'advanced';
        };

        const renderCard = (course: typeof courses[number]) => {
          const localCompleted = course.lessonSlugs.filter((s) =>
            localCompletion.isCompleted(s)
          ).length;
          const localProgress =
            course.totalLessons > 0
              ? Math.round((localCompleted / course.totalLessons) * 100)
              : 0;
          const displayProgress =
            course.userProgress !== undefined
              ? course.userProgress
              : localCompleted > 0
                ? localProgress
                : undefined;
          return (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group rounded-2xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex h-40 items-center justify-center rounded-t-2xl bg-fabrknt-gradient-subtle">
                <BookOpen className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <div className="p-5">
                {course.track && TRACK_COLORS[course.track] ? (
                  <span
                    className={cn(
                      'inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      TRACK_COLORS[course.track]
                    )}
                  >
                    {course.track === 'diy-perp'
                      ? t('courses.categories.diyPerp')
                      : course.track}
                  </span>
                ) : (
                  <span
                    className={cn(
                      'inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      DIFFICULTY_COLORS[course.difficulty]
                    )}
                  >
                    {t(`courses.difficulty.${course.difficulty.toLowerCase()}`)}
                  </span>
                )}
                <h3 className="mt-3 text-lg font-semibold group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                  {course.description}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(course.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course.totalLessons} {t('courses.detail.lessons').toLowerCase()}
                  </span>
                </div>
                {displayProgress !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {displayProgress >= 100 ? t('courses.progress.complete') : t('courses.progress.inProgress')}
                      </span>
                      <span className="font-medium">{displayProgress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="xp-bar h-full rounded-full"
                        style={{ width: `${displayProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Link>
          );
        };

        const flagship = courses.filter((c) => sectionFor(c) === 'flagship');
        const prerequisites = courses.filter((c) => sectionFor(c) === 'prereq');
        const deepDives = courses
          .filter((c) => sectionFor(c) === 'deep')
          .sort((a, b) => {
            const aFoundry = a.slug.includes('mastering-foundry');
            const bFoundry = b.slug.includes('mastering-foundry');
            if (aFoundry && !bFoundry) return -1;
            if (!aFoundry && bFoundry) return 1;
            return 0;
          });
        const advanced = courses.filter((c) => sectionFor(c) === 'advanced');

        return (
          <>
            {flagship.length > 0 && (
              <div className="mb-12">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-pink-400">
                    {text.flagshipHeader}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {text.flagshipSub}
                  </span>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {flagship.map(renderCard)}
                </div>
              </div>
            )}

            {prerequisites.length > 0 && (
              <div className="mb-12">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-primary">
                    {text.prereqHeader}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {text.prereqSub}
                  </span>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {prerequisites.map(renderCard)}
                </div>
              </div>
            )}

            {deepDives.length > 0 && (
              <div className="mb-12">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-yellow-400">
                    {text.deepDiveHeader}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {text.deepDiveSub}
                  </span>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {deepDives.map(renderCard)}
                </div>
              </div>
            )}

            {advanced.length > 0 && (
              <div className="mb-12">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-red-400">
                    {text.advancedHeader}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {text.advancedSub}
                  </span>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {advanced.map(renderCard)}
                </div>
              </div>
            )}

            {courses.length === 0 && (
              <div className="py-20 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">{t('courses.catalog.noResults')}</p>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
