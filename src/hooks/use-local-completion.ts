'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'rethlab:completed';

/**
 * Browser-local completion tracker for anonymous (signed-out) users.
 *
 * Lesson completion for signed-in users is persisted in the database via
 * `useCompleteLesson`. Anonymous users get a parallel localStorage-backed
 * tracker so they can still see which lessons they've finished without
 * creating an account.
 *
 * Storage key: localStorage["rethlab:completed"] = JSON array of lesson slugs.
 *
 * We key on **slug**, not on the database `id`, because lesson IDs are
 * regenerated on every full reseed, but slugs are stable.
 *
 * Caveats: per-browser, lost on browser-data clear, not synced across
 * devices. Sign-in is still the right answer for users who want durable,
 * cross-device progress + XP / streaks.
 */
export function useLocalCompletion() {
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(new Set());

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCompletedSlugs(new Set(parsed.filter((s) => typeof s === 'string')));
        }
      }
    } catch {
      // Corrupt entry — silently ignore and start fresh.
    }
  }, []);

  const persist = useCallback((next: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // Quota exceeded or storage unavailable — silently ignore.
    }
  }, []);

  const markComplete = useCallback(
    (slug: string) => {
      setCompletedSlugs((prev) => {
        if (prev.has(slug)) return prev;
        const next = new Set(prev);
        next.add(slug);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const markIncomplete = useCallback(
    (slug: string) => {
      setCompletedSlugs((prev) => {
        if (!prev.has(slug)) return prev;
        const next = new Set(prev);
        next.delete(slug);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const isCompleted = useCallback(
    (slug: string) => completedSlugs.has(slug),
    [completedSlugs]
  );

  return { completedSlugs, isCompleted, markComplete, markIncomplete };
}
