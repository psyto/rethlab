import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Analytics } from '@vercel/analytics/next';
import { AnalyticsProvider } from '@/lib/analytics/provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: 'RethLab — The school for Rust EVM L1 engineers',
    template: '%s | RethLab',
  },
  description:
    'The school for Rust EVM L1 engineers. Hyperliquid, Tempo, and Berachain all run on Reth, Revm, Alloy, Foundry. RethLab walks the source line by line across 4 tiers — foundations, source-reading, L1 architecture, production. 13 courses, English + Japanese, free.',
  keywords: [
    'Reth',
    'Revm',
    'Alloy',
    'Rust Ethereum',
    'EVM',
    'ExEx',
    'Execution Extensions',
    'Paradigm',
    'Rust blockchain',
    'EVM internals',
    'RethLab',
    'psyto',
  ],
  authors: [{ name: 'psyto' }],
  creator: 'psyto',
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ja_JP',
    url: baseUrl,
    siteName: 'RethLab',
    title: 'RethLab — The school for Rust EVM L1 engineers',
    description:
      'The school for Rust EVM L1 engineers. Hyperliquid, Tempo, and Berachain all run on Reth, Revm, Alloy, Foundry. RethLab walks the source line by line across 4 tiers — foundations, source-reading, L1 architecture, production. 13 courses, English + Japanese, free.',
    // images are auto-derived from app/opengraph-image.tsx (PNG, 1200x630)
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RethLab — The school for Rust EVM L1 engineers',
    description:
      'The school for Rust EVM L1 engineers. Hyperliquid, Tempo, and Berachain all run on Reth, Revm, Alloy, Foundry. RethLab walks the source line by line across 4 tiers — foundations, source-reading, L1 architecture, production. 13 courses, English + Japanese, free.',
    creator: '@psyto',
    site: '@psyto',
    // images are auto-derived from app/opengraph-image.tsx
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
  },
  verification: {
    google: '5c_lCzf0xDy84wqRnV4apJXJ7H1zL75p6N3fVgD4qfA',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'RethLab',
  url: baseUrl,
  description: 'The new wave of EVM is purpose-built L1s — Hyperliquid, Tempo, Base. They all run on Reth, Revm, Alloy, Foundry. RethLab walks the real source line by line so you can catch up.',
  publisher: {
    '@type': 'Person',
    name: 'psyto',
    url: 'https://github.com/psyto',
  },
  inLanguage: ['en', 'ja'],
  potentialAction: {
    '@type': 'SearchAction',
    target: `${baseUrl}/courses?search={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
        <Analytics />
        <AnalyticsProvider />
      </body>
    </html>
  );
}
