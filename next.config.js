/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  async redirects() {
    // After the 3-way Advanced split (Revm / Reth / Alloy), Module 0 lessons
    // (Revm internals) live in the new `revm-advanced-{en,ja}` course.
    // Module 1 lessons (Reth: sync/exex/sdk) stay in `reth-advanced-{en,ja}`.

    // Retired single-lesson slugs (from the build-up rewrite) → buildup entry.
    // Six of these now point at the revm-advanced course, six stay in reth-advanced.
    const retiredToRevm = [
      ['revm-interpreter', 'revm-add-buildup'],
      ['custom-opcodes', 'custom-opcodes-table'],
      ['revm-database-trait', 'revm-database-buildup'],
    ];
    const retiredToReth = [
      ['staged-sync', 'staged-sync-buildup'],
      ['reth-exex', 'reth-exex-buildup'],
      ['reth-sdk-appchain', 'reth-sdk-buildup'],
    ];

    // Module 0 lesson slugs that moved courses (reth-advanced → revm-advanced).
    // These all kept their slugs — only the course-path changed.
    const movedToRevm = [
      'revm-add-buildup',
      'revm-add-macro',
      'revm-add-opcode-quiz',
      'revm-add-opcode-drill',
      'custom-opcodes-table',
      'custom-opcodes-wiring',
      'custom-opcodes-quiz',
      'custom-opcodes-drill',
      'revm-database-buildup',
      'revm-database-companions',
      'revm-database-quiz',
      'revm-database-drill',
    ];

    // The retired final-quiz slug `advanced-quiz-{en,ja}` was split into
    // `revm-advanced-quiz-{en,ja}` (in the new revm course) and
    // `reth-advanced-quiz-{en,ja}` (in the slimmed reth course). Anyone landing
    // on the old URL goes to the reth final quiz (since `reth-advanced-en` is
    // the still-existing course slug).
    const retiredQuiz = [['advanced-quiz', 'reth-advanced-quiz']];

    const locales = ['en', 'ja'];

    return [
      // Retired single-lesson slugs → revm-advanced
      ...retiredToRevm.flatMap(([oldStem, newStem]) =>
        locales.map((locale) => ({
          source: `/courses/reth-advanced-${locale}/lessons/${oldStem}-${locale}`,
          destination: `/courses/revm-advanced-${locale}/lessons/${newStem}-${locale}`,
          permanent: true,
        })),
      ),
      // Retired single-lesson slugs → reth-advanced (unchanged target course)
      ...retiredToReth.flatMap(([oldStem, newStem]) =>
        locales.map((locale) => ({
          source: `/courses/reth-advanced-${locale}/lessons/${oldStem}-${locale}`,
          destination: `/courses/reth-advanced-${locale}/lessons/${newStem}-${locale}`,
          permanent: true,
        })),
      ),
      // Module 0 lessons that moved courses (slug unchanged, course path changed)
      ...movedToRevm.flatMap((slug) =>
        locales.map((locale) => ({
          source: `/courses/reth-advanced-${locale}/lessons/${slug}-${locale}`,
          destination: `/courses/revm-advanced-${locale}/lessons/${slug}-${locale}`,
          permanent: true,
        })),
      ),
      // The old combined final quiz → reth final quiz (best-guess landing)
      ...retiredQuiz.flatMap(([oldStem, newStem]) =>
        locales.map((locale) => ({
          source: `/courses/reth-advanced-${locale}/lessons/${oldStem}-${locale}`,
          destination: `/courses/reth-advanced-${locale}/lessons/${newStem}-${locale}`,
          permanent: true,
        })),
      ),
      // Welcome lesson rename: advanced-welcome-{en,ja} (in old combined course)
      // → reth-advanced-welcome-{en,ja} (in slimmed reth course)
      ...locales.map((locale) => ({
        source: `/courses/reth-advanced-${locale}/lessons/advanced-welcome-${locale}`,
        destination: `/courses/reth-advanced-${locale}/lessons/reth-advanced-welcome-${locale}`,
        permanent: true,
      })),
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'cdn.sanity.io' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  turbopack: {},
};

module.exports = nextConfig;
