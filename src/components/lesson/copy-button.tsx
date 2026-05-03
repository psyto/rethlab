'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * "Copy" button rendered inside the terminal-frame header of code blocks.
 *
 * Pure client interaction: clipboard write on click, swap to a check
 * icon for ~1.5s, then reset. No tooltip library — the title attribute
 * is enough for the rare hover case.
 */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (rare — http context, permissions). Silent
      // no-op is fine; the user still has the code in front of them.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied' : 'Copy code'}
      aria-label={copied ? 'Copied' : 'Copy code'}
      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
