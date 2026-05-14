import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// (slug, markers we expect to find in the lesson's content)
const CHECKS: Array<[string, string[]]> = [
  ['reth-sdk-components-en', ['MegaETH', 'tempoxyz/reth', 'megaeth-labs/reth', 'berachain/bera-reth', 'compose, don\'t fork']],
  ['reth-sdk-components-ja', ['MegaETH', 'tempoxyz/reth', 'megaeth-labs/reth', 'berachain/bera-reth', 'compose, don\'t fork']],
  ['paradigm-stack-case-study-en', ['MegaETH', 'megaeth-labs/salt', 'megaeth-labs/stateless-validator', '0 commits ahead, 7666']],
  ['paradigm-stack-case-study-ja', ['MegaETH', 'megaeth-labs/salt', 'megaeth-labs/stateless-validator', '0 commits ahead, 7666']],
  ['mdbx-storage-en', ['SALT', 'megaeth-labs/salt', 'Small Authentication Large Trie']],
  ['mdbx-storage-ja', ['SALT', 'megaeth-labs/salt', 'Small Authentication Large Trie']],
  ['performance-engineering-en', ['schelk', 'tempoxyz/schelk', 'dm-era']],
  ['performance-engineering-ja', ['schelk', 'tempoxyz/schelk', 'dm-era']],
];

async function main() {
  for (const [slug, markers] of CHECKS) {
    const lesson = await prisma.lesson.findFirst({ where: { slug } });
    if (!lesson) {
      console.log(`❌ ${slug.padEnd(34)}  NOT FOUND`);
      continue;
    }
    const content = lesson.content ?? '';
    const missing = markers.filter((m) => !content.includes(m));
    if (missing.length === 0) {
      console.log(`✓  ${slug.padEnd(34)}  all ${markers.length} markers present`);
    } else {
      console.log(`⚠  ${slug.padEnd(34)}  MISSING: ${missing.join(', ')}`);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
