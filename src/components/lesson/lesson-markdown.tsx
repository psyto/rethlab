'use client';

import { isValidElement, type ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MermaidDiagram } from './mermaid-diagram';

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
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
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

          // Mermaid diagrams: render directly without the terminal frame
          if (lang === 'mermaid') {
            return <>{children}</>;
          }

          const label = LANG_LABELS[lang] ?? lang;

          return (
            <div className="my-6 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border bg-background/40 px-4 py-2 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
                </div>
                {label && (
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                )}
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
                {children}
              </pre>
            </div>
          );
        },
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const lang = match?.[1];
          const codeStr = String(children).replace(/\n$/, '');

          if (lang === 'mermaid') {
            return <MermaidDiagram code={codeStr} />;
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
