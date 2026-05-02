'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import {
  Clock,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Code2,
  FileText,
  Play,
  ArrowRight,
  Loader2,
  Lock,
  HelpCircle,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { cn, formatDuration } from '@/lib/utils';
import { useCourse, useEnroll, useLocalCompletion } from '@/hooks';
import { useSession } from 'next-auth/react';

const LESSON_TYPE_ICONS: Record<string, typeof FileText> = {
  CONTENT: FileText,
  CHALLENGE: Code2,
  VIDEO: Play,
  QUIZ: HelpCircle,
};

const DIFFICULTY_COLORS = {
  BEGINNER: 'bg-green-500/10 text-green-400 border-green-500/20',
  INTERMEDIATE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  ADVANCED: 'bg-red-500/10 text-red-400 border-red-500/20',
  EXPERT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { t, locale } = useLocale();
  const { data: session } = useSession();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Redirect to correct locale version when language switches
  useEffect(() => {
    const isJaSlug = slug.endsWith('-ja');
    if (locale === 'ja' && !isJaSlug) {
      router.replace(`/courses/${slug}-ja`);
    } else if (locale === 'en' && isJaSlug) {
      router.replace(`/courses/${slug.replace(/-ja$/, '')}`);
    }
  }, [locale, slug, router]);

  const { data: course, isLoading, error } = useCourse(slug);
  const enrollMutation = useEnroll(slug);
  const localCompletion = useLocalCompletion();

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="py-20 text-center">
        <p className="text-destructive">{t('errors.loadCourse')}</p>
      </div>
    );
  }

  // Merge server-side completion (signed-in users) with localStorage
  // completion (anonymous users) so both populations see consistent
  // checkmarks and progress numbers.
  const isLessonDone = (lesson: { isCompleted?: boolean; slug: string }) =>
    Boolean(lesson.isCompleted) || localCompletion.isCompleted(lesson.slug);

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.filter(isLessonDone).length,
    0
  );
  const isEnrolled = course.enrollment !== null;
  // Show progress UI to anyone who has at least one completed lesson —
  // either via DB enrollment or local tracker.
  const showProgress = isEnrolled || completedLessons > 0;

  if (!initializedRef.current && course.modules.length > 0) {
    initializedRef.current = true;
    setExpandedModules(new Set(course.modules.map((m) => m.id)));
  }

  const handleEnroll = () => {
    if (!session?.user) return;
    enrollMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="lg:grid lg:grid-cols-3 lg:gap-12">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Course header */}
          <div>
            <span
              className={cn(
                'inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium',
                DIFFICULTY_COLORS[course.difficulty]
              )}
            >
              {t(`courses.difficulty.${course.difficulty.toLowerCase()}`)}
            </span>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{course.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{course.description}</p>

            <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(course.duration)}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {totalLessons} {t('courses.detail.lessons').toLowerCase()}
              </span>
            </div>
          </div>

          {/* Syllabus */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold">{t('courses.detail.syllabus')}</h2>
            <div className="mt-4 space-y-3">
              {course.modules.map((module, moduleIdx) => (
                <div key={module.id} className="rounded-xl border border-border bg-card">
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-xs font-medium">
                        {moduleIdx + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold">{module.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {module.lessons.length} {t('courses.detail.lessons').toLowerCase()}
                        </p>
                      </div>
                    </div>
                    {expandedModules.has(module.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {expandedModules.has(module.id) && (
                    <div className="border-t border-border">
                      {module.lessons.map((lesson) => {
                        const Icon = LESSON_TYPE_ICONS[lesson.type];
                        const done = isLessonDone(lesson);
                        // LAUNCH MODE: no gating — all courses open
                        const isGated = false;
                        const isPreview = false;
                        return (
                          <Link
                            key={lesson.id}
                            href={`/courses/${course.slug}/lessons/${lesson.id}`}
                            className="flex items-center justify-between border-b border-border/50 px-4 py-3 last:border-b-0 hover:bg-secondary/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {done ? (
                                <CheckCircle2 className="h-4 w-4 text-accent" />
                              ) : (
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={cn('text-sm', done && 'text-muted-foreground line-through')}>
                                {lesson.title}
                              </span>
                              {isPreview && (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  Preview
                                </span>
                              )}
                              {lesson.type === 'CHALLENGE' && (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  {t('lesson.challenge.title')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{formatDuration(lesson.duration)}</span>
                              {isGated && !session && !isPreview && !done && (
                                <Lock className="h-3 w-3 text-muted-foreground/50" />
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="mt-8 lg:mt-0">
          <div className="sticky top-24 rounded-2xl border border-border bg-card p-6">
            {/* Progress (if enrolled OR anonymous user has any local progress) */}
            {showProgress && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {completedLessons >= totalLessons ? t('courses.progress.complete') : t('courses.progress.inProgress')}
                  </span>
                  <span className="font-medium">
                    {Math.round((completedLessons / totalLessons) * 100)}%
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="xp-bar h-full rounded-full"
                    style={{ width: `${(completedLessons / totalLessons) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {completedLessons} / {totalLessons} lessons
                </p>
              </div>
            )}

            {/* Enroll CTA */}
            {!session ? (
              <Link
                href={`/courses/${course.slug}/lessons/${course.modules[0]?.lessons[0]?.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-fabrknt-gradient px-6 py-3 text-base font-semibold text-fabrknt-dark transition-all hover:opacity-90"
              >
                {t('landing.hero.cta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={isEnrolled || enrollMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-fabrknt-gradient px-6 py-3 text-base font-semibold text-fabrknt-dark transition-all hover:opacity-90 disabled:opacity-70"
              >
                {enrollMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEnrolled ? (
                  t('courses.detail.enrolled')
                ) : (
                  t('courses.detail.enroll')
                )}
                {!enrollMutation.isPending && <ArrowRight className="h-4 w-4" />}
              </button>
            )}

            {/* Course info */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('courses.detail.duration')}</span>
                <span className="font-medium">{formatDuration(course.duration)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('courses.detail.modules')}</span>
                <span className="font-medium">{course.modules.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('courses.detail.lessons')}</span>
                <span className="font-medium">{totalLessons}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
