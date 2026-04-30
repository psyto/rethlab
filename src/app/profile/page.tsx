'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/contexts/locale-context';
import { calculateLevel, formatXP, xpProgressInLevel } from '@/lib/utils';
import {
  Zap,
  Flame,
  Trophy,
  Star,
  Calendar,
  Settings,
  Award,
  BookOpen,
  Loader2,
  Lock,
  Code,
  Shield,
  Layers,
  Globe,
  Terminal,
} from 'lucide-react';
import { useProfile } from '@/hooks';
import type { Achievement } from '@/types';

const SKILL_KEYS: Record<string, { labelKey: string; icon: typeof Code }> = {
  'hl-architecture': { labelKey: 'profile.skillArchitecture', icon: Globe },
  'trading-api': { labelKey: 'profile.skillTradingApi', icon: Terminal },
  'vault-development': { labelKey: 'profile.skillVaults', icon: Layers },
  'deltaneutral': { labelKey: 'profile.skillDeltaNeutral', icon: Code },
  'strategies': { labelKey: 'profile.skillStrategies', icon: Shield },
};

function SkillRadar({ skills, t, formatT }: { skills: Record<string, number>; t: (key: string) => string; formatT: (key: string, params: Record<string, string>) => string }) {
  const maxVal = Math.max(...Object.values(skills), 1);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Object.entries(SKILL_KEYS).map(([key, { labelKey, icon: Icon }]) => {
        const val = skills[key] ?? 0;
        const pct = Math.min((val / Math.max(maxVal, 5)) * 100, 100);
        return (
          <div key={key} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="xp-bar h-full rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs font-medium">{formatT('profile.lessonsCount', { count: val.toString() })}</p>
          </div>
        );
      })}
    </div>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
        achievement.isUnlocked
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card opacity-50'
      }`}
      title={achievement.description}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          achievement.isUnlocked ? 'bg-fabrknt-gradient text-white' : 'bg-secondary text-muted-foreground'
        }`}
      >
        {achievement.isUnlocked ? (
          <Award className="h-5 w-5" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
      </div>
      <p className="text-[11px] font-medium leading-tight">{achievement.name}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, formatT } = useLocale();
  const { data: profile, isLoading, error } = useProfile();

  if (status === 'unauthenticated') {
    router.replace('/auth/signin');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="py-20 text-center">
        <p className="text-destructive">{t('errors.loadProfile')}</p>
      </div>
    );
  }

  const level = calculateLevel(profile.totalXP);
  const achievements: Achievement[] = profile.achievements ?? [];
  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const skills: Record<string, number> = profile.skills ?? {};

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Profile header */}
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-fabrknt-gradient text-3xl font-bold text-white">
          {(session?.user?.name || profile.displayName)[0]}
        </div>
        <div className="mt-4 sm:ml-6 sm:mt-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{session?.user?.name || profile.displayName}</h1>
            <Link
              href="/settings"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
          {profile.bio && (
            <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatT('profile.memberSince', {
                date: new Date(profile.joinDate).toLocaleDateString(),
              })}
            </span>
          </div>
          {/* XP + Level */}
          <div className="mt-3 flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm font-semibold text-fabrknt-gradient">
              <Zap className="h-4 w-4" />
              {formatXP(profile.totalXP)} XP
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5" />
              {formatT('gamification.level', { level: level.toString() })}
            </span>
            <span className="flex items-center gap-1 text-sm text-orange-400">
              <Flame className="h-3.5 w-3.5" />
              {formatT('profile.streakDays', { count: profile.currentStreak.toString() })}
            </span>
          </div>
        </div>
      </div>

      {/* Skill Breakdown */}
      {Object.values(skills).some((v) => v > 0) && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">{t('profile.skills')}</h2>
          <SkillRadar skills={skills} t={t} formatT={formatT} />
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('profile.achievements')}</h2>
            <span className="text-sm text-muted-foreground">
              {formatT('profile.achievementsUnlocked', { unlocked: unlockedCount.toString(), total: achievements.length.toString() })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {achievements
              .sort((a, b) => (a.isUnlocked === b.isUnlocked ? a.id - b.id : a.isUnlocked ? -1 : 1))
              .map((achievement) => (
                <AchievementBadge key={achievement.id} achievement={achievement} />
              ))}
          </div>
        </div>
      )}

      {/* Completed courses */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">{t('profile.completedCourses')}</h2>
        {profile.completedCourses.length > 0 ? (
          <div className="space-y-3">
            {profile.completedCourses.map((course) => (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <div>
                    <h3 className="text-sm font-semibold">{course.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatT('profile.completedOn', { date: new Date(course.completedAt).toLocaleDateString() })}
                    </p>
                  </div>
                </div>
                <Trophy className="h-4 w-4 text-yellow-400" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('profile.noCourses')}</p>
        )}
      </div>
    </div>
  );
}
