'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'strict',
  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
  themeVariables: {
    background: '#0a0a0b',
    primaryColor: '#1a1a1d',
    primaryBorderColor: '#f97316',
    primaryTextColor: '#fafafa',
    lineColor: '#71717a',
    secondaryColor: '#27272a',
    tertiaryColor: '#18181b',
  },
});

let idCounter = 0;
const nextId = () => `mermaid-${++idCounter}-${Date.now()}`;

export function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = nextId();
    mermaid
      .render(id, code)
      .then((result) => {
        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Diagram failed to render: {error}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="my-6 overflow-x-auto rounded-lg border border-border bg-card/40 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
