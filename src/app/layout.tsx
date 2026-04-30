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
    default: 'RethLab - Master Reth, Revm, and Alloy',
    template: '%s | RethLab',
  },
  description:
    'Learn the Rust Ethereum stack — Reth, Revm, and Alloy — from beginner Rust scripts to Execution Extensions and custom EVM opcodes. Self-paced courses in English and Japanese.',
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
    'Fabrknt',
  ],
  authors: [{ name: 'Fabrknt' }],
  creator: 'Fabrknt',
  metadataBase: new URL(baseUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'RethLab',
    title: 'RethLab - Master Reth, Revm, and Alloy',
    description:
      'Learn the Rust Ethereum stack — Reth, Revm, and Alloy — from beginner Rust scripts to Execution Extensions and custom EVM opcodes. Self-paced courses in English and Japanese.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'RethLab - Master Reth, Revm, and Alloy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RethLab - Master Reth, Revm, and Alloy',
    description:
      'Learn the Rust Ethereum stack — Reth, Revm, and Alloy — from beginner Rust scripts to Execution Extensions and custom EVM opcodes. Self-paced courses in English and Japanese.',
    creator: '@fabrknt',
    site: '@fabrknt',
    images: ['/og-image.svg'],
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
  description: 'Learn the Rust Ethereum stack — Reth, Revm, and Alloy — from beginner Rust scripts to Execution Extensions and custom EVM opcodes.',
  publisher: {
    '@type': 'Organization',
    name: 'Fabrknt',
    url: baseUrl,
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
