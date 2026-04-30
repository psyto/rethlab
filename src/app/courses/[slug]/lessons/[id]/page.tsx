'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  Eye,
  Play,
  RotateCcw,
  Loader2,
  Menu,
  Trophy,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Heart,
  Twitter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useLesson, useCompleteLesson } from '@/hooks';
import { runChallenge } from '@/lib/challenge-runner';
import { QuizPlayer } from '@/components/quiz/quiz-player';
import { LessonMarkdown } from '@/components/lesson/lesson-markdown';
import type { ChallengeResult } from '@/types';

// Lazy load Monaco Editor for performance
const CodeEditor = dynamic(() => import('@/components/editor/code-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const { t, formatT, locale } = useLocale();
  const slug = params.slug as string;
  const id = params.id as string;

  // Redirect to course list if locale doesn't match slug
  useEffect(() => {
    const isJaSlug = slug.endsWith('-ja');
    if ((locale === 'ja' && !isJaSlug) || (locale === 'en' && isJaSlug)) {
      router.replace('/courses');
    }
  }, [locale, slug, router]);

  const { data: session } = useSession();
  const { data: lesson, isLoading, error } = useLesson(slug, id);
  const completeMutation = useCompleteLesson(slug, id);

  const [code, setCode] = useState('');
  const [codeInitialized, setCodeInitialized] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [testResults, setTestResults] = useState<ChallengeResult['testResults']>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [splitPosition] = useState(50);

  // Initialize code from lesson data once loaded
  if (lesson && !codeInitialized) {
    setCode(lesson.starterCode || '');
    setCodeInitialized(true);
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-destructive">{t('errors.loadLesson')}</p>
      </div>
    );
  }

  const isChallenge = lesson.type === 'CHALLENGE';
  const isQuiz = lesson.type === 'QUIZ';
  const isCompleted = lesson.isCompleted || completeMutation.isSuccess;

  const handleRun = async () => {
    setIsRunning(true);
    setOutput('');
    setTestResults([]);

    try {
      const result = await runChallenge({
        code,
        language: lesson.challengeLanguage || 'python',
        testCases: (lesson.testCases || []) as import('@/types').TestCase[],
        solutionCode: lesson.solutionCode || '',
      });

      setTestResults(result.testResults);
      setOutput(result.output);

      if (result.passed) {
        handleAutoComplete();
      }
    } catch {
      setOutput(t('errors.runCode'));
    } finally {
      setIsRunning(false);
    }
  };

  // Triggered by an explicit user action (Mark Complete button on CONTENT lessons).
  // Guests get a friendly redirect to the sign-in page since they actively asked.
  const handleMarkComplete = () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    completeMutation.mutate();
  };

  // Triggered automatically when a quiz passes or all challenge tests pass.
  // Guests should NOT be redirected — they should see the Next button and
  // continue. They just don't earn XP because progress isn't persisted.
  const handleAutoComplete = () => {
    if (!session) return;
    completeMutation.mutate();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Lesson header bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="text-sm">
            <span className="text-muted-foreground">{lesson.courseTitle}</span>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="font-medium">{lesson.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted && (
            <div className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              <CheckCircle2 className="h-4 w-4" />
              {t('lesson.completed')}
            </div>
          )}
          {lesson.prevLesson && (
            <button
              onClick={() => router.push(`/courses/${lesson.courseSlug}/lessons/${lesson.prevLesson!.id}`)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
              title={t('lesson.previousLesson')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {lesson.nextLesson && (
            <button
              onClick={() => router.push(`/courses/${lesson.courseSlug}/lessons/${lesson.nextLesson!.id}`)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
              title={t('lesson.nextLesson')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main content area — split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane: Lesson content */}
        <div
          className="flex flex-col overflow-y-auto border-r border-border"
          style={{ width: isChallenge ? `${splitPosition}%` : '100%' }}
        >
          <div className="prose prose-invert max-w-none p-6">
            <div className="text-sm leading-relaxed text-foreground [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:text-muted-foreground [&_p]:mb-3 [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-card [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre_code]:p-0 [&_pre_code]:bg-transparent [&_pre_code]:rounded-none [&_li]:text-muted-foreground [&_li]:mb-1 [&_ul]:mb-3 [&_ol]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:text-foreground [&_table]:w-full [&_table]:my-4 [&_table]:text-sm [&_table]:border-collapse [&_table]:rounded-lg [&_table]:overflow-hidden [&_thead]:bg-secondary [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:text-muted-foreground [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-muted-foreground [&_td]:border-t [&_td]:border-border/50 [&_tr:hover]:bg-secondary/30">
              <LessonMarkdown content={lesson.content} />
            </div>

            {/* Hints */}
            {isChallenge && lesson.hints.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowHints(!showHints)}
                  className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20"
                >
                  <Lightbulb className="h-4 w-4" />
                  {t('lesson.hint')}
                </button>
                {showHints && (
                  <ol className="mt-3 space-y-2">
                    {lesson.hints.map((hint, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-yellow-400">{i + 1}.</span>
                        {hint}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Solution toggle */}
            {isChallenge && (
              <div className="mt-4">
                <button
                  onClick={() => setShowSolution(!showSolution)}
                  className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Eye className="h-4 w-4" />
                  {t('lesson.solution')}
                </button>
                {showSolution && (
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-card p-4 text-xs">
                    <code className="font-mono">{lesson.solutionCode}</code>
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Quiz player */}
          {isQuiz && lesson.quizQuestions && (
            <div className="border-t border-border p-6">
              <QuizPlayer
                questions={lesson.quizQuestions}
                onComplete={handleAutoComplete}
                isCompleted={isCompleted}
                onNext={
                  lesson.nextLesson
                    ? () => router.push(`/courses/${lesson.courseSlug}/lessons/${lesson.nextLesson!.id}`)
                    : undefined
                }
                nextLessonTitle={lesson.nextLesson?.title}
              />
              {isCompleted && <LessonCompletionNav lesson={lesson} router={router} t={t} />}
            </div>
          )}

          {/* Mark complete + navigation (for content lessons) */}
          {!isChallenge && !isQuiz && (
            <div className="border-t border-border p-4 space-y-3">
              {session && (
                <button
                  onClick={handleMarkComplete}
                  disabled={isCompleted || completeMutation.isPending}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all',
                    isCompleted
                      ? 'bg-accent/10 text-accent'
                      : 'bg-fabrknt-gradient text-white hover:opacity-90'
                  )}
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCompleted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {t('lesson.completed')}
                    </>
                  ) : (
                    t('lesson.markComplete')
                  )}
                </button>
              )}

              <div className="flex gap-3">
                {lesson.prevLesson && (
                  <button
                    onClick={() => router.push(`/courses/${lesson.courseSlug}/lessons/${lesson.prevLesson!.id}`)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t('lesson.previousLesson')}
                  </button>
                )}
                {lesson.nextLesson ? (
                  <button
                    onClick={() => router.push(`/courses/${lesson.courseSlug}/lessons/${lesson.nextLesson!.id}`)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {t('lesson.nextLesson')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => router.push(`/courses`)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {t('lesson.backToCourses')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right pane: Code editor (challenges only) */}
        {isChallenge && (
          <div
            className="flex flex-col"
            style={{ width: `${100 - splitPosition}%` }}
          >
            {/* Editor */}
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={code}
                onChange={(value) => setCode(value || '')}
                language={lesson.challengeLanguage || 'python'}
              />
            </div>

            {/* Output panel */}
            {(output || testResults.length > 0) && (
              <div className="max-h-48 overflow-y-auto border-t border-border bg-card p-4">
                {testResults.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {testResults.map((result, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 text-xs">
                          {result.passed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-destructive" />
                          )}
                          <span className={result.passed ? 'text-accent' : 'text-destructive'}>
                            {result.description}
                          </span>
                        </div>
                        {!result.passed && (result.expected || result.actual) && (
                          <div className="ml-5.5 mt-1 space-y-0.5 rounded bg-secondary/50 px-3 py-2 text-xs">
                            {result.expected && (
                              <div>
                                <span className="text-muted-foreground">{t('lesson.challenge.expected')} </span>
                                <code className="whitespace-pre-wrap rounded bg-secondary px-1 py-0.5 font-mono text-accent">
                                  {result.expected}
                                </code>
                              </div>
                            )}
                            {result.actual && (
                              <div>
                                <span className="text-muted-foreground">{t('lesson.challenge.actual')} </span>
                                <code className="whitespace-pre-wrap rounded bg-secondary px-1 py-0.5 font-mono text-destructive">
                                  {result.actual}
                                </code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {output && (
                  <pre className="text-xs text-muted-foreground">{output}</pre>
                )}
              </div>
            )}

            {/* Next lesson after challenge completion */}
            {isCompleted && (
              <div className="border-t border-border bg-primary/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">{t('lesson.challenge.allPassed')}</p>
                  </div>
                </div>
                {lesson.nextLesson ? (
                  <button
                    onClick={() => router.push(`/courses/${lesson.courseSlug}/lessons/${lesson.nextLesson!.id}`)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-fabrknt-gradient py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
                  >
                    {t('lesson.nextLesson')}: {lesson.nextLesson.title}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 py-3 text-sm font-medium text-primary">
                    <Trophy className="h-4 w-4" />
                    {t('lesson.courseComplete')}
                  </div>
                )}
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
              <button
                onClick={() => setCode(lesson.starterCode || '')}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('lesson.challenge.reset')}
              </button>

              <div className="flex items-center gap-2">
                {testResults.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatT('lesson.challenge.passedCount', { passed: testResults.filter((r) => r.passed).length.toString(), total: testResults.length.toString() })}
                  </span>
                )}
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 rounded-lg bg-fabrknt-gradient px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {t('lesson.challenge.run')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LessonCompletionNav({
  lesson,
  router,
  t,
}: {
  lesson: import('@/hooks').LessonDetail;
  router: ReturnType<typeof useRouter>;
  t: (key: string) => string;
}) {
  const { formatT } = useLocale();

  // Has next lesson → show next lesson button
  if (lesson.nextLesson) {
    return (
      <button
        onClick={() => router.push(`/courses/${lesson.courseSlug}/lessons/${lesson.nextLesson!.id}`)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-fabrknt-gradient py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
      >
        {t('lesson.nextLesson')}: {lesson.nextLesson.title}
        <ChevronRight className="h-4 w-4" />
      </button>
    );
  }

  // Last lesson of course → show course completion
  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-fabrknt-gradient">
        <Trophy className="h-7 w-7 text-fabrknt-dark" />
      </div>
      <h3 className="mt-3 text-lg font-bold">{t('lesson.courseComplete')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('lesson.courseCompleteMessage')}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={() => router.push('/courses')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-fabrknt-gradient py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
        >
          <BookOpen className="h-4 w-4" />
          {t('lesson.backToCourses')}
        </button>
      </div>
      <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
        <button
          onClick={() => {
            const url = typeof window !== 'undefined' ? window.location.href : '';
            const text = t('share.courseCompleteText');
            const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            window.open(tweetUrl, '_blank', 'noopener,noreferrer');
          }}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <Twitter className="h-3.5 w-3.5" />
          {t('share.onX')}
        </button>
        <Link
          href="/donate"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <Heart className="h-3.5 w-3.5" />
          {t('donate.inlineNudge')}
        </Link>
      </div>
    </div>
  );
}
