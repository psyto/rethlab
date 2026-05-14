/**
 * Builds Japanese-locale curriculum exports:
 *   - rethlab-ja.pdf   (formatted, with page numbers in footer)
 *   - rethlab-ja.epub  (reflowable, for Kindle / iBooks etc.)
 *
 * Pipeline:
 *   prisma seed funcs  →  combined markdown  →  pandoc  →  PDF (via Chrome) + EPUB
 *
 * Run with: npm run build:ja-ebook
 *
 * Requires: pandoc on PATH (`brew install pandoc`), Google Chrome at the
 * standard macOS location for the PDF step.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { seedRethBeginnerJA } from '../seed-reth-beginner-ja';
import { seedRethFundamentalsJA } from '../seed-reth-fundamentals-ja';
import { seedRethBridgeToAdvancedJA } from '../seed-reth-bridge-to-advanced-ja';
import { seedRethAlloyAdvancedJA } from '../seed-reth-alloy-advanced-ja';
import { seedRethRevmAdvancedJA } from '../seed-reth-revm-advanced-ja';
import { seedRethAdvancedJA } from '../seed-reth-advanced-ja';
import { seedRethConsensusEngineeringJA } from '../seed-reth-consensus-engineering-ja';
import { seedRethCrossChainBridgesJA } from '../seed-reth-cross-chain-bridges-ja';
import { seedRethSequencerRollupJA } from '../seed-reth-sequencer-rollup-ja';
import { seedRethP2PNetworkingJA } from '../seed-reth-p2p-networking-ja';
import { seedRethValidatorOpsJA } from '../seed-reth-validator-ops-ja';
import { seedRethExpertJA } from '../seed-reth-expert-ja';
import { seedRethBuildingJA } from '../seed-reth-building-ja';

const REPO_ROOT = resolve(__dirname, '../..');
const MD_PATH = '/tmp/rethlab-ja.md';
const HEADER_PATH = '/tmp/rethlab-ja-header.html';
const HTML_PATH = '/tmp/rethlab-ja.html';
const PDF_PATH = resolve(REPO_ROOT, 'rethlab-ja.pdf');
const EPUB_PATH = resolve(REPO_ROOT, 'rethlab-ja.epub');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TITLE = 'RethLab — 全カリキュラム (日本語版)';
const AUTHOR = 'RethLab';

const seeds: Array<(p: any) => Promise<unknown>> = [
  seedRethBeginnerJA,
  seedRethFundamentalsJA,
  seedRethBridgeToAdvancedJA,
  seedRethAlloyAdvancedJA,
  seedRethRevmAdvancedJA,
  seedRethAdvancedJA,
  seedRethConsensusEngineeringJA,
  seedRethCrossChainBridgesJA,
  seedRethSequencerRollupJA,
  seedRethP2PNetworkingJA,
  seedRethValidatorOpsJA,
  seedRethExpertJA,
  seedRethBuildingJA,
];

// Inline CSS for the PDF. Page numbers live in @bottom-center via CSS Paged Media,
// which Chrome's headless print-to-pdf supports.
const PDF_HEADER_HTML = `<style>
  body {
    font-family: -apple-system, "Hiragino Sans", "Hiragino Kaku Gothic ProN",
                 "Yu Gothic", "Meiryo", sans-serif;
    font-size: 10.5pt;
    line-height: 1.7;
    max-width: 760px;
    margin: 2em auto;
    padding: 0 1em;
    color: #1a1a1a;
  }
  h1 {
    font-size: 22pt;
    border-bottom: 2px solid #333;
    padding-bottom: 0.3em;
    margin-top: 2em;
    page-break-before: always;
  }
  h1:first-of-type { page-break-before: avoid; }
  h2 {
    font-size: 16pt;
    border-bottom: 1px solid #999;
    padding-bottom: 0.2em;
    margin-top: 1.5em;
  }
  h3 { font-size: 13.5pt; margin-top: 1.2em; color: #222; }
  h4 { font-size: 12pt; margin-top: 1em; }
  h5, h6 { font-size: 11pt; margin-top: 0.8em; }
  code {
    font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
    font-size: 0.88em;
    background: #f4f4f4;
    padding: 0.08em 0.3em;
    border-radius: 3px;
  }
  pre {
    background: #f5f5f5;
    padding: 0.7em 0.9em;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.84em;
    line-height: 1.45;
    page-break-inside: avoid;
    white-space: pre-wrap;
    word-break: break-word;
  }
  pre code { background: none; padding: 0; font-size: 1em; }
  blockquote {
    border-left: 4px solid #888;
    padding: 0.4em 1em;
    margin: 1em 0;
    color: #333;
    background: #fafafa;
  }
  table { border-collapse: collapse; margin: 1em 0; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 0.4em 0.7em; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; }
  a { color: #0066cc; text-decoration: none; }
  hr { border: 0; border-top: 1px solid #ccc; margin: 1.5em 0; }
  nav#TOC { font-size: 9.5pt; page-break-after: always; }
  nav#TOC ul { list-style: none; padding-left: 1em; }
  @page {
    margin: 2cm 1.8cm 2.5cm;
    @bottom-center {
      content: counter(page) " / " counter(pages);
      font-size: 9pt;
      color: #666;
      font-family: -apple-system, sans-serif;
    }
  }
</style>
`;

async function extractMarkdown(): Promise<string> {
  const allCourses: any[] = [];
  const mockPrisma: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'course') {
          return {
            create: async ({ data }: any) => {
              allCourses.push(data);
              return data;
            },
          };
        }
        return new Proxy({}, { get: () => async () => null });
      },
    },
  );

  for (const fn of seeds) await fn(mockPrisma);

  let md = '---\n';
  md += `title: "${TITLE}"\n`;
  md += `author: "${AUTHOR}"\n`;
  md += 'lang: ja\n';
  md += '---\n\n';

  for (const course of allCourses) {
    md += `\n\n# ${course.title}\n\n`;
    if (course.description) md += `${course.description}\n\n`;

    const modules = course.modules?.create ?? [];
    const sortedModules = [...modules].sort(
      (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );

    for (const mod of sortedModules) {
      md += `\n## ${mod.title}\n\n`;
      if (mod.description) md += `${mod.description}\n\n`;

      const lessons = mod.lessons?.create ?? [];
      const sortedLessons = [...lessons].sort(
        (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );

      for (const lesson of sortedLessons) {
        if (lesson.type === 'QUIZ') continue;
        md += `\n### ${lesson.title}\n\n`;
        if (lesson.content) {
          // Demote lesson-internal heading levels by 3 so the document
          // hierarchy is course=h1, module=h2, lesson=h3, then lesson body.
          const demoted = lesson.content.replace(
            /^(#{1,3}) /gm,
            (_match: string, hashes: string) => '#'.repeat(hashes.length + 3) + ' ',
          );
          md += `${demoted}\n\n`;
        }
      }
    }
  }
  return md;
}

async function main() {
  console.log('1/4  Extracting markdown from JA seeds...');
  const md = await extractMarkdown();
  writeFileSync(MD_PATH, md, 'utf8');
  console.log(`     → ${MD_PATH} (${md.length.toLocaleString()} chars)`);

  console.log('2/4  Pandoc → HTML (for PDF step)...');
  writeFileSync(HEADER_PATH, PDF_HEADER_HTML, 'utf8');
  execSync(
    `pandoc ${MD_PATH} -o ${HTML_PATH} --standalone --toc --toc-depth=2 ` +
      `-V lang=ja --include-in-header=${HEADER_PATH} ` +
      `--metadata title="${TITLE}"`,
    { stdio: 'inherit' },
  );

  console.log('3/4  Chrome headless → PDF...');
  if (!existsSync(CHROME_PATH)) {
    throw new Error(`Chrome not found at ${CHROME_PATH}`);
  }
  execSync(
    `"${CHROME_PATH}" --headless=new --disable-gpu --no-pdf-header-footer ` +
      `--print-to-pdf="${PDF_PATH}" "file://${HTML_PATH}"`,
    { stdio: 'inherit' },
  );
  console.log(`     → ${PDF_PATH}`);

  console.log('4/4  Pandoc → EPUB...');
  execSync(
    `pandoc ${MD_PATH} -o "${EPUB_PATH}" --toc --toc-depth=2 --split-level=1 ` +
      `-V lang=ja --metadata title="${TITLE}" --metadata author="${AUTHOR}" ` +
      `--metadata description="Rust EVM L1 エンジニアのための学校 — 全カリキュラム"`,
    { stdio: 'inherit' },
  );
  console.log(`     → ${EPUB_PATH}`);

  console.log('\nDone. Both outputs ready for distribution.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
