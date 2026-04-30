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
  Lock,
  Hexagon,
  Trophy,
  BookOpen,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useLesson, useCompleteLesson } from '@/hooks';
import { runChallenge } from '@/lib/challenge-runner';
import { QuizPlayer } from '@/components/quiz/quiz-player';
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
    const errorStatus = error && 'status' in error ? (error as { status: number }).status : 0;
    const errorMessage = error instanceof Error ? error.message : '';

    // 401: not signed in → simple sign-in prompt
    if (errorStatus === 401) {
      return (
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{t('gate.title')}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t('gate.subtitle')}
          </p>
          <Link
            href="/auth/signin"
            className="mt-4 rounded-xl bg-fabrknt-gradient px-6 py-3 text-sm font-semibold text-fabrknt-dark transition-opacity hover:opacity-90"
          >
            {t('common.signIn')}
          </Link>
        </div>
      );
    }

    // 403: not enough XP → show XP requirement
    if (errorStatus === 403) {
      // Extract numbers from error message like "You need 200 XP...You have 50."
      const needMatch = errorMessage.match(/need (\d+)/);
      const haveMatch = errorMessage.match(/have (\d+)/);
      const needed = needMatch ? needMatch[1] : '?';
      const current = haveMatch ? haveMatch[1] : '0';

      return (
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10">
            <Hexagon className="h-8 w-8 text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold">{t('honey.needMore')}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {formatT('honey.requirement', { needed, current })}
          </p>
          <div className="mt-2 h-3 w-48 overflow-hidden rounded-full bg-secondary">
            <div
              className="xp-bar h-full rounded-full"
              style={{ width: `${Math.min((Number(current) / Number(needed)) * 100, 100)}%` }}
            />
          </div>
          <Link
            href="/courses"
            className="mt-4 rounded-xl bg-fabrknt-gradient px-6 py-3 text-sm font-semibold text-fabrknt-dark transition-opacity hover:opacity-90"
          >
            {t('honey.earnMore')}
          </Link>
        </div>
      );
    }

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
        completeMutation.mutate();
      }
    } catch {
      setOutput(t('errors.runCode'));
    } finally {
      setIsRunning(false);
    }
  };

  const handleMarkComplete = () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }
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
              +{lesson.xpReward} XP
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
            {/* Render markdown content */}
            <div
              className="text-sm leading-relaxed text-foreground [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:text-muted-foreground [&_p]:mb-3 [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-card [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre_code]:p-0 [&_pre_code]:bg-transparent [&_pre_code]:rounded-none [&_li]:text-muted-foreground [&_li]:mb-1 [&_ul]:mb-3 [&_ol]:mb-3 [&_strong]:text-foreground [&_table]:w-full [&_table]:my-4 [&_table]:text-sm [&_table]:border-collapse [&_table]:rounded-lg [&_table]:overflow-hidden [&_thead]:bg-secondary [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:text-muted-foreground [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-muted-foreground [&_td]:border-t [&_td]:border-border/50 [&_tr:hover]:bg-secondary/30"
              dangerouslySetInnerHTML={{
                __html: (() => {
                  let content = lesson.content;
                  // Extract fenced code blocks into placeholders before other regexes
                  const codeBlocks: string[] = [];
                  content = content.replace(/```(\w+)?\n([\s\S]+?)```/g, (_match, _lang, code) => {
                    const index = codeBlocks.length;
                    codeBlocks.push(`<pre><code>${code.replace(/^\n+|\n+$/g, '')}</code></pre>`);
                    return `\x00CODEBLOCK_${index}\x00`;
                  });
                  // Convert markdown tables to HTML
                  content = content.replace(
                    /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g,
                    (_match, headerRow, bodyRows) => {
                      const headers = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean);
                      const rows = bodyRows.trim().split('\n').map((row: string) =>
                        row.split('|').map((c: string) => c.trim()).filter(Boolean)
                      );
                      const thead = `<thead><tr>${headers.map((h: string) => `<th>${h}</th>`).join('')}</tr></thead>`;
                      const tbody = `<tbody>${rows.map((row: string[]) => `<tr>${row.map((c: string) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
                      return `<table>${thead}${tbody}</table>`;
                    }
                  );

                  // Run heading/list/bold/inline-code/paragraph regexes on remaining content
                  content = content
                    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                    .replace(/^- (.+)$/gm, '<li>$1</li>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/`([^`]+)`/g, '<code>$1</code>')
                    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/^(?!<[hluop\x00])/gm, '<p>');
                  // Re-insert code blocks after all other replacements
                  content = content.replace(/\x00CODEBLOCK_(\d+)\x00/g, (_match, index) => codeBlocks[Number(index)]);
                  return content;
                })()
              }}
            />

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
                onComplete={handleMarkComplete}
                isCompleted={isCompleted}
              />
              {isCompleted && <LessonCompletionNav lesson={lesson} router={router} t={t} />}
            </div>
          )}

          {/* Mark complete + navigation (for content lessons) */}
          {!isChallenge && !isQuiz && (
            <div className="border-t border-border p-4 space-y-3">
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
                ) : !session ? (
                  'Sign in to track progress'
                ) : (
                  t('lesson.markComplete')
                )}
              </button>

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
              <div className="border-t border-border p-3">
                <LessonCompletionNav lesson={lesson} router={router} t={t} />
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
        {formatT('lesson.courseCompleteMessage', { honey: String(lesson.courseXpReward) })}
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
    </div>
  );
}
