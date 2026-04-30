'use client';

import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import {
  ArrowRight,
  Zap,
  Terminal,
  TrendingUp,
  BookOpen,
  Shield,
  Boxes,
  Code2,
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
  const { t, formatT } = useLocale();

  const tracks = [
    {
      title: t('courses.categories.beginner'),
      description: t('page.tracks.basicsDesc'),
      icon: BookOpen,
      courses: 1,
      difficulty: t('courses.difficulty.beginner'),
      color: 'from-green-500/20 to-emerald-500/20',
    },
    {
      title: t('courses.difficulty.intermediate'),
      description: t('page.tracks.fundamentalsDesc'),
      icon: Code2,
      courses: 1,
      difficulty: t('courses.difficulty.intermediate'),
      color: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      title: t('courses.categories.advanced'),
      description: t('page.tracks.hyperliquidDesc'),
      icon: Terminal,
      courses: 1,
      difficulty: t('courses.difficulty.advanced'),
      color: 'from-violet-500/20 to-purple-500/20',
    },
    {
      title: t('courses.categories.expert'),
      description: t('page.tracks.expertDesc'),
      icon: Boxes,
      courses: 1,
      difficulty: t('courses.difficulty.advanced'),
      color: 'from-orange-500/20 to-red-500/20',
    },
  ];

  const whyRethLab = [
    {
      icon: Shield,
      title: t('page.whyRethLab.builtByBuilder'),
      description: t('page.whyRethLab.builtByBuilderDesc'),
    },
    {
      icon: Code2,
      title: t('page.whyRethLab.learnByDoing'),
      description: t('page.whyRethLab.learnByDoingDesc'),
    },
    {
      icon: TrendingUp,
      title: t('page.whyRethLab.growingPlatform'),
      description: t('page.whyRethLab.growingPlatformDesc'),
    },
    {
      icon: BookOpen,
      title: t('page.whyRethLab.allCoursesFree'),
      description: t('page.whyRethLab.allCoursesFreeDesc'),
    },
  ];

  const stats = [
    { value: '8', label: t('landing.stats.courses') },
    { value: '74', label: t('landing.stats.lessons') },
    { value: '4', label: t('landing.stats.tracks') },
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

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Reth-style chip */}
            <div className="mb-12 flex justify-center">
              <div className="reth-chip relative w-[280px] px-8 py-7">
                <span className="screw-tl" />
                <span className="screw-tr" />
                <span className="screw-bl" />
                <span className="screw-br" />
                <div className="absolute right-4 top-4 rounded-md border border-border bg-black/40 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  v 1.0
                </div>
                <div className="flex justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-2xl">
                    🦀
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <div className="text-3xl font-bold tracking-tight text-foreground">RethLab</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Made in <span className="font-semibold text-primary">Rust</span>
                  </div>
                </div>
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="text-fabrknt-gradient">{t('landing.hero.title')}</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
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
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-3xl font-bold text-fabrknt-gradient sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why RethLab */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            {...fadeIn}
          >
            <h2 className="text-3xl font-bold sm:text-4xl">
              {t('page.whyRethLab.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('page.whyRethLab.subtitle')}
            </p>
          </motion.div>

          <motion.div
            className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {whyRethLab.map((item, i) => (
              <motion.div
                key={i}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                variants={fadeIn}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fabrknt-gradient">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Learning Tracks */}
      <section className="border-t border-border bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            {...fadeIn}
          >
            <h2 className="text-3xl font-bold sm:text-4xl">
              {t('page.tracks.title')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('page.tracks.subtitle')}
            </p>
          </motion.div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {tracks.map((track, i) => (
              <motion.div
                key={i}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${track.color} p-6 transition-all hover:border-primary/50`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/50">
                    <track.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <span className="rounded-full bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {track.difficulty}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{track.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{track.description}</p>
                <div className="mt-4 text-xs text-muted-foreground">
                  {formatT('page.tracks.courseCount', { count: String(track.courses) })}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-xl bg-fabrknt-gradient px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl"
            >
              {t('common.exploreCourses')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-fabrknt-gradient p-12 text-center sm:p-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              {t('landing.cta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              {t('landing.cta.description')}
            </p>
            <div className="mt-8">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary shadow-lg transition-all hover:bg-white/90"
              >
                {t('common.getStarted')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
