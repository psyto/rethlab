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
    const advancedRenames = [
      ['revm-interpreter', 'revm-add-buildup'],
      ['custom-opcodes', 'custom-opcodes-table'],
      ['revm-database-trait', 'revm-database-buildup'],
      ['staged-sync', 'staged-sync-buildup'],
      ['reth-exex', 'reth-exex-buildup'],
      ['reth-sdk-appchain', 'reth-sdk-buildup'],
    ];
    return advancedRenames.flatMap(([oldStem, newStem]) =>
      ['en', 'ja'].map((locale) => ({
        source: `/courses/reth-advanced-${locale}/lessons/${oldStem}-${locale}`,
        destination: `/courses/reth-advanced-${locale}/lessons/${newStem}-${locale}`,
        permanent: true,
      })),
    );
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
