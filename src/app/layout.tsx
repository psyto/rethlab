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
    default: 'RethLab — Hardcore Rust Ethereum Developer Training',
    template: '%s | RethLab',
  },
  description:
    'HyperEVM, Tempo, Base — the new wave of EVM chains is Rust-native. RethLab brings you up to speed by walking the real Reth, Revm, Alloy, and Foundry source line by line. Free, English + Japanese, no signup required.',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'RethLab',
    title: 'RethLab — Hardcore Rust Ethereum Developer Training',
    description:
      'HyperEVM, Tempo, Base — the new wave of EVM chains is Rust-native. RethLab brings you up to speed by walking the real Reth, Revm, Alloy, and Foundry source line by line. Free, English + Japanese, no signup required.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'RethLab — Catch up with the Rust-native EVM wave (Reth, Revm, Alloy, Foundry) line by line',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RethLab — Hardcore Rust Ethereum Developer Training',
    description:
      'HyperEVM, Tempo, Base — the new wave of EVM chains is Rust-native. RethLab brings you up to speed by walking the real Reth, Revm, Alloy, and Foundry source line by line. Free, English + Japanese, no signup required.',
    creator: '@psyto',
    site: '@psyto',
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
  description: 'HyperEVM, Tempo, Base — the new wave of EVM chains is Rust-native. RethLab walks the real Reth, Revm, Alloy, and Foundry source line by line so you can catch up.',
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
