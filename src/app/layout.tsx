import type { Metadata, Viewport } from 'next';
import { Sora, Inter } from 'next/font/google';
import './globals.css';
import { getSiteSettings } from '@/lib/data/settings';

const display = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

// Bare shell shared by the public site and the admin dashboard. All marketing
// chrome (Nav/Footer/SmoothScroll/JSON-LD) lives in (site)/layout.tsx so the
// admin doesn't inherit it.
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    metadataBase: new URL(site.url),
    title: { default: site.name, template: `%s | ${site.name}` },
  };
}

export const viewport: Viewport = {
  themeColor: '#05060a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (translate, grammar, dark-mode)
    // inject attributes/nodes into <html>/<body> before React hydrates. Without
    // this, that mutation corrupts reconciliation and surfaces as the
    // "removeChild ... not a child of this node" crash.
    <html
      lang="en"
      className={`${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
