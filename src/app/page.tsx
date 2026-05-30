'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import {
  ArrowRight,
  Terminal,
  BookOpen,
  Boxes,
  Code2,
  CheckCircle2,
  Hammer,
} from 'lucide-react';
import { motion } from 'framer-motion';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: {
    transition: { staggerChildren: 0.1 },
  },
};

export default function LandingPage() {
  const { t, formatT, locale } = useLocale();
  const isJA = locale === 'ja';

  // 2-axis model: 4 source-reading tiers (difficulty ladder) + 1 build-along
  // project series. Visually split so users see the two formats are different
  // entry points, not a 5th difficulty level.
  const sourceReadingTracks = [
    {
      title: t('courses.categories.beginner'),
      description: t('page.tracks.basicsDesc'),
      icon: BookOpen,
      courses: 3,
      href: isJA ? '/courses/reth-beginner-ja' : '/courses/reth-beginner-en',
      difficulty: t('courses.difficulty.beginner'),
      color: 'from-green-500/20 to-emerald-500/20',
    },
    {
      title: t('courses.categories.intermediate'),
      description: t('page.tracks.fundamentalsDesc'),
      icon: Code2,
      courses: 4,
      href: isJA ? '/courses/alloy-advanced-ja' : '/courses/alloy-advanced-en',
      difficulty: t('courses.difficulty.intermediate'),
      color: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      title: t('courses.categories.advanced'),
      description: t('page.tracks.hyperliquidDesc'),
      icon: Terminal,
      courses: 5,
      href: isJA ? '/courses/reth-consensus-engineering-ja' : '/courses/reth-consensus-engineering-en',
      difficulty: t('courses.difficulty.advanced'),
      color: 'from-violet-500/20 to-purple-500/20',
    },
    {
      title: t('courses.categories.expert'),
      description: t('page.tracks.expertDesc'),
      icon: Boxes,
      courses: 2,
      href: isJA ? '/courses/reth-expert-ja' : '/courses/reth-expert-en',
      difficulty: t('courses.difficulty.expert'),
      color: 'from-orange-500/20 to-red-500/20',
    },
  ];

  const buildAlongTracks = [
    {
      title: t('courses.categories.diyPerp'),
      description: t('page.tracks.diyPerpDesc'),
      icon: Hammer,
      courses: 7,
      href: isJA ? '/courses/reth-openhl-consensus-ja' : '/courses/reth-openhl-consensus-en',
      difficulty: t('page.tracks.diyPerpTag'),
      color: 'from-pink-500/20 to-rose-500/20',
    },
  ];

  return (
    <div>
      {/* Launch Banner */}
      <div className="bg-fabrknt-gradient px-4 py-2.5 text-center text-sm font-medium text-white">
        {t('page.launchBanner')}
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-reth-tiles">
        <div className="pointer-events-none absolute inset-0 bg-fabrknt-gradient-subtle" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Tagline */}
            <div className="mb-6 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 font-mono text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t('landing.hero.tagline')}
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-fabrknt-gradient">{t('landing.hero.title')}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
              {t('landing.hero.subtitle')}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-fabrknt-gradient px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl"
              >
                {t('landing.hero.cta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                {t('page.whyRethLab.title')}
              </Link>
            </div>

            {/* Real source code on hero — proof of source-first approach */}
            <motion.div
              className="mt-12 text-left"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border bg-background/40 px-4 py-2.5 font-mono text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                    <span className="ml-3">bluealloy/revm · interpreter/instructions/arithmetic.rs</span>
                  </div>
                  <a
                    href="https://github.com/bluealloy/revm/blob/main/crates/interpreter/src/instructions/arithmetic.rs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    view on GitHub →
                  </a>
                </div>
                <pre className="max-h-56 overflow-x-auto overflow-y-auto p-4 font-mono text-[12px] leading-relaxed">
                  <code>
                    <span className="text-muted-foreground">{`// The real ADD opcode that runs on every Ethereum block`}</span>{`\n`}
                    <span className="text-primary">pub fn</span>{` `}<span className="text-foreground">add</span><span className="text-muted-foreground">{`<`}</span><span className="text-primary">IT</span><span className="text-muted-foreground">{`: ITy, `}</span><span className="text-primary">H</span><span className="text-muted-foreground">{`: ?Sized>(`}</span>{`\n    `}<span className="text-foreground">context</span><span className="text-muted-foreground">{`: Ictx<'_, H, IT>,`}</span>{`\n`}<span className="text-muted-foreground">{`) -> `}</span><span className="text-primary">Result</span>{` {`}{`\n    `}<span className="text-yellow-400">popn_top!</span>{`([op1], op2, context.interpreter);`}{`\n    `}<span className="text-muted-foreground">{`*`}</span>op2{` = op1.`}<span className="text-foreground">wrapping_add</span>{`(`}<span className="text-muted-foreground">{`*`}</span>op2{`);`}{`\n    `}<span className="text-primary">Ok</span>{`(())`}{`\n}`}{`\n`}{`\n`}
                    <span className="text-muted-foreground">{`// Walked through line-by-line in lesson:`}</span>{`\n`}
                    <span className="text-muted-foreground">{`// → reth-advanced / revm-interpreter`}</span>
                  </code>
                </pre>
              </div>
              <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <p className="font-mono text-xs text-muted-foreground">
                  {isJA
                    ? '中級・Expert は本番コード起点で学ぶ。'
                    : 'Intermediate/Expert are anchored in real production source.'}
                </p>
                <Link
                  href={
                    isJA
                      ? '/courses/revm-advanced-ja/lessons/revm-add-buildup-ja'
                      : '/courses/revm-advanced-en/lessons/revm-add-buildup-en'
                  }
                  className="rounded-md border border-border px-2.5 py-1 text-xs hover:border-primary/40 hover:bg-secondary"
                >
                  {isJA ? 'このレッスンを見る' : 'Open This Lesson'}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Learning Tracks */}
      <section className="border-t border-border bg-card/30 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            {...fadeIn}
          >
            <h2 className="text-2xl font-bold sm:text-3xl">
              {t('page.tracks.title')}
            </h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              {t('page.tracks.subtitle')}
            </p>
          </motion.div>

          {/* Section 1: Source-Reading (4 difficulty tiers) */}
          <div className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="font-mono text-xs uppercase tracking-widest text-primary">
                {t('page.tracks.sourceReadingHeader')}
              </h3>
              <span className="text-xs text-muted-foreground">
                {t('page.tracks.sourceReadingSubheader')}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {sourceReadingTracks.map((track, i) => (
                <Link key={i} href={track.href} className="block">
                  <motion.div
                    className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${track.color} p-5 transition-all hover:border-primary/50`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/50">
                        <track.icon className="h-4.5 w-4.5 text-foreground" />
                      </div>
                      <span className="rounded-full bg-background/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {track.difficulty}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold">{track.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{track.description}</p>
                    <div className="mt-3 text-[11px] text-muted-foreground/70">
                      {formatT('page.tracks.courseCount', { count: String(track.courses) })}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* Section 2: Build-Along (project series) */}
          <div className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="font-mono text-xs uppercase tracking-widest text-pink-400">
                {t('page.tracks.buildAlongHeader')}
              </h3>
              <span className="text-xs text-muted-foreground">
                {t('page.tracks.buildAlongSubheader')}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {buildAlongTracks.map((track, i) => (
                <Link key={i} href={track.href} className="block">
                  <motion.div
                    className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${track.color} p-5 transition-all hover:border-primary/50`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/50">
                        <track.icon className="h-4.5 w-4.5 text-foreground" />
                      </div>
                      <span className="rounded-full bg-background/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {track.difficulty}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold">{track.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{track.description}</p>
                    <div className="mt-3 text-[11px] text-muted-foreground/70">
                      {formatT('page.tracks.courseCount', { count: String(track.courses) })}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-fabrknt-gradient-subtle p-8 text-center sm:p-10">
            <h2 className="text-2xl font-bold sm:text-3xl">
              {t('landing.cta.title')}
            </h2>
            <div className="mx-auto mt-3 max-w-2xl space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('landing.cta.description')
                .split('\n\n')
                .map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
            </div>
            <div className="mt-6">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-fabrknt-gradient px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 hover:shadow-lg"
              >
                {t('landing.cta.cta')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
