import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SLUGS = [
  // New/rewritten lessons this session
  'stateless-ethereum-en',
  'stateless-ethereum-ja',
  'revm-jit-aot-revmc-en',
  'revm-jit-aot-revmc-ja',
  'build-mpp-payments-en',
  'build-mpp-payments-ja',
  'build-exex-indexer-en',
  'build-exex-indexer-ja',
  'build-mev-searcher-en',
  'build-mev-searcher-ja',
];

function check(content: string): string[] {
  const issues: string[] = [];

  // Code fence balance
  const fences = (content.match(/^```/gm) ?? []).length;
  if (fences % 2 !== 0) issues.push(`UNBALANCED CODE FENCES (${fences})`);

  // Mermaid block balance
  const mermaidOpens = (content.match(/^```mermaid/gm) ?? []).length;
  const mermaidCloses = content.match(/```mermaid[\s\S]*?^```/gm)?.length ?? 0;
  if (mermaidOpens !== mermaidCloses) issues.push(`UNCLOSED MERMAID (${mermaidOpens} opens, ${mermaidCloses} closes)`);

  // Stray escape artefacts (literal escaped backtick in rendered output is a tell)
  if (content.includes('\\`')) issues.push('stray escaped backtick (may be intentional, but check)');

  // Suspicious literal escapes
  if (/\\n[a-zA-Z]/.test(content)) issues.push('possible literal \\n (should be real newline)');

  // Forcing-function presence (sanity — Expert/Advanced lessons should have them)
  const stopPrompts = (content.match(/🛑/gu) ?? []).length;
  const findPrompts = (content.match(/🔍/gu) ?? []).length;

  return [
    `🛑×${stopPrompts}  🔍×${findPrompts}`,
    ...issues,
  ];
}

async function main() {
  for (const slug of SLUGS) {
    const lesson = await prisma.lesson.findFirst({
      where: { slug },
      include: { module: { include: { course: true } } },
    });

    if (!lesson) {
      console.log(`❌ ${slug.padEnd(28)}  NOT FOUND`);
      continue;
    }

    const ch = lesson.content?.length ?? 0;
    const signals = check(lesson.content ?? '');
    const course = lesson.module.course.slug;
    const issues = signals.slice(1).join(' | ');

    console.log(
      `✓  ${slug.padEnd(28)}  ${String(ch).padStart(6)} chars  ${signals[0]}  [${course}]${
        issues ? '  ⚠ ' + issues : ''
      }`,
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
