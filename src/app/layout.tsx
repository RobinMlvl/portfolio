import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { SITE_URL } from '@/lib/siteUrl';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Robin Malaval',
  description: 'Full-stack engineer. I build software end to end, then I run it: five products, one pair of hands, from the first commit to the server bill.',
  openGraph: { title: 'Robin Malaval', description: 'Full-stack engineer. Five products, one pair of hands.', type: 'website', url: '/' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
