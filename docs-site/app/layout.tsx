import './global.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { JetBrains_Mono, Anybody } from 'next/font/google';

// The same two faces as the site, because this app is served at /docs on the same domain and one
// nav tab away: Inter here (the fumadocs scaffold default) made the docs read as a different
// product, and DESIGN.md reflex-rejects it by name. Mono already matched.
const sans = Anybody({ subsets: ['latin'], variable: '--font-sans', display: 'swap', axes: ['wdth'] });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  // "·" not an em dash, matching the site's titles.
  title: { default: 'Vawe docs', template: '%s · Vawe docs' },
  description:
    'Documentation for Vawe: one self-describing JSON becomes one rendered video. Scene primitives, motion, blocks, themes, and the quality gates.',
  // Relative, and deliberately the SITE's copy: in production this app is proxied under the site's
  // origin, so /assets/favicon.svg resolves to the one favicon there is. Hardcoding an absolute
  // origin would bake in a domain (the site answers on vawe.dev, and answered on vawe.upsurge.cc
  // before that), and a second copy in this app's public/ would be a duplicate free to drift.
  // Declaring any icon is also what stops the browser probing /favicon.ico, which 404s.
  icons: { icon: '/assets/favicon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
