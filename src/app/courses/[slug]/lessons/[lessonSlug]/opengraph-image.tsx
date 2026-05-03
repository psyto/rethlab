import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/db';

export const alt = 'RethLab lesson';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = {
  params: Promise<{ slug: string; lessonSlug: string }>;
};

/**
 * Per-lesson OG card.
 *
 * Same visual language as the site-root OG (terminal-frame motif,
 * orange accent, monospace), but the headline is the actual lesson
 * title and the course is shown as a context pill — so a posted lesson
 * link previews as that lesson, not as a generic site card.
 */
export default async function Image({ params }: Props) {
  const { slug, lessonSlug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, title: true, difficulty: true },
  });

  // Lesson lookup mirrors the page-level layout: scope by course to
  // avoid cross-course slug collisions, even though they're rare.
  const lesson = course
    ? await prisma.lesson.findFirst({
        where: { slug: lessonSlug, module: { courseId: course.id } },
        select: { title: true, type: true },
      })
    : null;

  const courseTitle = course?.title ?? 'RethLab';
  const lessonTitle = lesson?.title ?? 'Lesson';
  const difficulty = course?.difficulty ?? 'BEGINNER';
  const lessonType = lesson?.type ?? 'CONTENT';

  // Fit the lesson title into the headline area without truncating
  // mid-word for short titles. ~26 chars per line at fontSize 64.
  const headlineFontSize = lessonTitle.length > 60 ? 48 : lessonTitle.length > 38 ? 56 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          background: 'linear-gradient(135deg, #050505 0%, #161618 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: 60,
          position: 'relative',
          color: '#fafafa',
          fontFamily: 'monospace',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            🦀
          </div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>RethLab</div>
        </div>

        {/* Course + difficulty + type pill row */}
        <div style={{ marginTop: 28, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: '#1a1a1d',
              border: '1px solid #27272a',
              fontSize: 16,
              color: '#a8a29e',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 999, background: '#f97316' }} />
            {courseTitle}
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: '#1a1a1d',
              border: '1px solid #27272a',
              fontSize: 14,
              color: '#71717a',
            }}
          >
            {difficulty.toLowerCase()} · {lessonType.toLowerCase()}
          </div>
        </div>

        {/* Lesson title — the headline */}
        <div
          style={{
            marginTop: 36,
            fontSize: headlineFontSize,
            fontWeight: 800,
            lineHeight: 1.1,
            color: '#fafafa',
            display: 'flex',
          }}
        >
          {lessonTitle}
        </div>

        {/* Terminal frame, blank — keeps the visual identity from the site OG
            without competing with the lesson title for attention */}
        <div
          style={{
            marginTop: 'auto',
            background: '#111114',
            border: '1px solid #27272a',
            borderRadius: 14,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            fontSize: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#71717a',
              fontSize: 14,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 999, background: '#ef4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: 999, background: '#eab308' }} />
            <div style={{ width: 10, height: 10, borderRadius: 999, background: '#22c55e' }} />
            <span style={{ marginLeft: 12 }}>rethlab.fabrknt.com</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            left: 60,
            right: 60,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 14,
          }}
        >
          <span style={{ color: '#a8a29e' }}>
            Reth · Revm · Alloy · Foundry — line by line
          </span>
          <span style={{ color: '#f97316' }}>@psyto</span>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 14,
            background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
