'use client';

import { isValidElement, type ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import { MermaidDiagram } from './mermaid-diagram';
import { YouTubeEmbed } from './youtube-embed';
import { CopyButton } from './copy-button';

// Recursively pull the text content out of a `pre`'s children so the
// copy button sees the raw source the user expects to paste, not the
// syntax-highlighted DOM tree.
function extractText(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement(node)) {
    const children = (node as ReactElement<{ children?: unknown }>).props.children;
    return extractText(children);
  }
  return '';
}

/**
 * Parses a `youtube` fenced-block payload.
 *
 * Format: `<id>[ | <title>][ @<seconds>]`
 * Examples:
 *   `_KsEPoLnJR4`
 *   `_KsEPoLnJR4 | RethLab demo (46s)`
 *   `dQw4w9WgXcQ | Reth deep dive @420`
 */
function parseYouTubePayload(raw: string): { id: string; title?: string; start?: number } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const startMatch = trimmed.match(/\s+@(\d+)\s*$/);
  const start = startMatch ? Number(startMatch[1]) : undefined;
  const withoutStart = startMatch ? trimmed.slice(0, startMatch.index!).trim() : trimmed;
  const [idPart, ...titleParts] = withoutStart.split('|').map((s) => s.trim());
  if (!idPart) return null;
  const title = titleParts.length > 0 ? titleParts.join(' | ') : undefined;
  return { id: idPart, title, start };
}

// Pretty labels for common languages we use in lessons
const LANG_LABELS: Record<string, string> = {
  rust: 'rust',
  rs: 'rust',
  ts: 'ts',
  typescript: 'ts',
  js: 'js',
  javascript: 'js',
  solidity: 'solidity',
  sol: 'solidity',
  bash: 'shell',
  sh: 'shell',
  shell: 'shell',
  toml: 'toml',
  yaml: 'yaml',
  yml: 'yaml',
  json: 'json',
  sql: 'sql',
  python: 'python',
  py: 'python',
};

export function LessonMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeHighlight, rehypeKatex]}
      components={{
        // Wrap fenced code blocks in a "terminal" frame matching the
        // home-page hero snippet — border, traffic-light dots, language
        // label. Mermaid blocks bypass this and render via MermaidDiagram
        // (handled in the `code` override below).
        pre({ children }) {
          // pre always wraps a single <code> element from markdown
          let lang = '';
          if (isValidElement(children)) {
            const childProps = (children as ReactElement<{ className?: string }>).props;
            const match = /language-(\w+)/.exec(childProps.className || '');
            if (match) lang = match[1].toLowerCase();
          }

          // Mermaid diagrams + YouTube embeds: render directly without the terminal frame
          if (lang === 'mermaid' || lang === 'youtube') {
            return <>{children}</>;
          }

          const label = LANG_LABELS[lang] ?? lang;
          const codeText = extractText(children);

          return (
            <div className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border bg-background/40 px-4 py-2 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="flex items-center gap-3">
                  {label && (
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {label}
                    </span>
                  )}
                  <CopyButton text={codeText} />
                </div>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
                {children}
              </pre>
            </div>
          );
        },
        // External-by-default for lesson links — most point to upstream
        // GitHub source, official docs, papers; opening in-place would lose
        // the lesson's scroll position.
        a({ href, children, ...props }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          );
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const lang = match?.[1];
          const codeStr = String(children).replace(/\n$/, '');

          if (lang === 'mermaid') {
            return <MermaidDiagram code={codeStr} />;
          }

          if (lang === 'youtube') {
            const parsed = parseYouTubePayload(codeStr);
            if (parsed) {
              return <YouTubeEmbed id={parsed.id} title={parsed.title} start={parsed.start} />;
            }
          }

          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
