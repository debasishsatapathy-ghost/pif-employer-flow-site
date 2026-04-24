import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PIF Employer — AI Hiring Platform',
  description: 'Intelligent hiring platform for employers — powered by Mobeus AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Preload the Dashboard + Dashboard-ALT background SVGs: Home and Workforce
            use Dashboard, Hiring uses Dashboard-ALT (all three main tabs are dashboard
            family per the Figma prototype). Total ~5 KB for all 6 files. */}
        <link rel="preload" as="image" href="/bg/dash-ellipse5.svg" type="image/svg+xml" />
        <link rel="preload" as="image" href="/bg/dash-avatar.svg" type="image/svg+xml" />
        <link rel="preload" as="image" href="/bg/dash-avatar1.svg" type="image/svg+xml" />
        <link rel="preload" as="image" href="/bg/dashalt-ellipse5.svg" type="image/svg+xml" />
        <link rel="preload" as="image" href="/bg/dashalt-avatar.svg" type="image/svg+xml" />
        <link rel="preload" as="image" href="/bg/dashalt-avatar1.svg" type="image/svg+xml" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      {/* Fallback background matches the Dashboard variant base; PageBackground layers
          on top with variant-specific colours and soft cross-fades. */}
      <body className="antialiased" style={{ background: '#09090b', color: 'white' }}>
        {children}
      </body>
    </html>
  );
}
