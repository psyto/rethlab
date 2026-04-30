'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Trophy, BookOpen, Heart, Twitter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/locale-context';
import type { QuizQuestion } from '@/types';

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onComplete: () => void;
  isCompleted: boolean;
  /** Called when the user clicks "Next lesson" on the passed screen. If absent, the button is omitted (e.g. last lesson of a course). */
  onNext?: () => void;
  /** Title of the next lesson, shown alongside the button. */
  nextLessonTitle?: string;
}

export function QuizPlayer({ questions, onComplete, isCompleted, onNext, nextLessonTitle }: QuizPlayerProps) {
  const { t, formatT } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));

  const question = questions[currentIndex];
  const isCorrect = selectedAnswer === question?.correctIndex;
  const totalQuestions = questions.length;

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    setShowResult(true);
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedAnswer;
    setAnswers(newAnswers);
    if (selectedAnswer === question.correctIndex) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setFinished(true);
      // Auto-complete if passed (>= 70%)
      const finalCorrect = correctCount + (isCorrect ? 0 : 0); // already counted
      if (finalCorrect >= Math.ceil(totalQuestions * 0.7)) {
        onComplete();
      }
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setCorrectCount(0);
    setFinished(false);
    setAnswers(new Array(questions.length).fill(null));
  };

  if (finished) {
    const passed = correctCount >= Math.ceil(totalQuestions * 0.7);
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className={cn(
          'mx-auto flex h-16 w-16 items-center justify-center rounded-full',
          passed ? 'bg-primary/10' : 'bg-destructive/10'
        )}>
          {passed ? (
            <CheckCircle2 className="h-8 w-8 text-primary" />
          ) : (
            <XCircle className="h-8 w-8 text-destructive" />
          )}
        </div>
        <h2 className="mt-4 text-xl font-bold">
          {passed ? t('quiz.passed') : t('quiz.failed')}
        </h2>
        <p className="mt-2 text-2xl font-bold">
          {correctCount} / {totalQuestions}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {passed ? t('quiz.passedMessage') : t('quiz.failedMessage')}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {passed && onNext && (
            <button
              onClick={onNext}
              className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-fabrknt-gradient px-6 py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
            >
              {nextLessonTitle ? `${t('lesson.nextLesson')}: ${nextLessonTitle}` : t('lesson.nextLesson')}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {passed && !onNext && (
            <div className="flex w-full max-w-sm flex-col gap-3">
              <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-medium text-primary">
                <Trophy className="h-4 w-4" />
                {t('lesson.courseComplete')}
              </div>
              <Link
                href="/courses"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fabrknt-gradient px-6 py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
              >
                <BookOpen className="h-4 w-4" />
                {t('lesson.backToCourses')}
              </Link>
            </div>
          )}
          {!passed && (
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-fabrknt-gradient px-6 py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" />
              {t('quiz.retry')}
            </button>
          )}
        </div>
        {passed && (
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
            <button
              onClick={() => {
                const url = typeof window !== 'undefined' ? window.location.href : '';
                const text = t('quiz.shareText');
                const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                window.open(tweetUrl, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <Twitter className="h-3.5 w-3.5" />
              {t('quiz.shareOnX')}
            </button>
            <Link
              href="/donate"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <Heart className="h-3.5 w-3.5" />
              {t('donate.inlineNudge')}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Progress */}
      <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>{formatT('quiz.progress', { current: String(currentIndex + 1), total: String(totalQuestions) })}</span>
        <span>{correctCount} {t('quiz.correct')}</span>
      </div>
      <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="xp-bar h-full rounded-full"
          style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question */}
      <h3 className="text-lg font-semibold">{question.question}</h3>

      {/* Options */}
      <div className="mt-6 space-y-3">
        {question.options.map((option, i) => {
          let optionStyle = 'border-border bg-card hover:border-primary/50';
          if (showResult) {
            if (i === question.correctIndex) {
              optionStyle = 'border-primary bg-primary/10';
            } else if (i === selectedAnswer && !isCorrect) {
              optionStyle = 'border-destructive bg-destructive/10';
            } else {
              optionStyle = 'border-border bg-card opacity-50';
            }
          } else if (selectedAnswer === i) {
            optionStyle = 'border-primary bg-primary/5';
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={showResult}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all',
                optionStyle
              )}
            >
              <span className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                showResult && i === question.correctIndex
                  ? 'border-primary bg-primary text-primary-foreground'
                  : showResult && i === selectedAnswer && !isCorrect
                    ? 'border-destructive bg-destructive text-destructive-foreground'
                    : selectedAnswer === i
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground'
              )}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{option}</span>
              {showResult && i === question.correctIndex && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              )}
              {showResult && i === selectedAnswer && !isCorrect && (
                <XCircle className="h-5 w-5 shrink-0 text-destructive" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showResult && question.explanation && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{question.explanation}</p>
        </div>
      )}

      {/* Action button */}
      <div className="mt-6">
        {!showResult ? (
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-fabrknt-gradient py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90 disabled:opacity-50"
          >
            {t('quiz.checkAnswer')}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-fabrknt-gradient py-3 text-sm font-semibold text-fabrknt-dark transition-all hover:opacity-90"
          >
            {currentIndex < totalQuestions - 1 ? t('quiz.next') : t('quiz.seeResults')}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
