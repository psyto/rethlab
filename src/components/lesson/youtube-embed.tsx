'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

interface YouTubeEmbedProps {
  id: string;
  title?: string;
  start?: number;
}

/**
 * Lazy YouTube embed.
 *
 * Renders a thumbnail + play button by default; only mounts the actual
 * iframe (and its ~500KB of YouTube JS) once the user clicks play. Uses
 * youtube-nocookie.com so no cookies are set until then either.
 *
 * Markdown integration: see `lesson-markdown.tsx`. Authors write
 *
 *   ```youtube
 *   <video_id>[ | <optional title>][ @<start_seconds>]
 *   ```
 *
 * and that fenced block is converted into this component.
 */
export function YouTubeEmbed({ id, title, start }: YouTubeEmbedProps) {
  const [activated, setActivated] = useState(false);

  const startParam = start && start > 0 ? `?start=${start}&autoplay=1` : '?autoplay=1';
  const embedSrc = `https://www.youtube-nocookie.com/embed/${id}${startParam}`;
  // hqdefault is the most-likely-to-exist thumbnail across all videos.
  const thumbSrc = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const watchUrl = `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}`;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <div className="relative aspect-video w-full bg-black">
        {activated ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={embedSrc}
            title={title || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setActivated(true)}
            className="group absolute inset-0 h-full w-full"
            aria-label={title ? `Play: ${title}` : 'Play video'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbSrc}
              alt={title || 'YouTube thumbnail'}
              loading="lazy"
              className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 ring-1 ring-white/20 backdrop-blur transition-transform group-hover:scale-110">
                <Play className="h-7 w-7 translate-x-0.5 fill-white text-white" />
              </span>
            </span>
          </button>
        )}
      </div>
      {title && (
        <div className="flex items-center justify-between border-t border-border bg-background/40 px-4 py-2 text-xs">
          <span className="font-mono text-muted-foreground">{title}</span>
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            youtube ↗
          </a>
        </div>
      )}
    </div>
  );
}
