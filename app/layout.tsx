import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/context';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MachiNow – 2軒目がすぐ見つかるマップ',
  description: '『いま入れるバー・スナック』が地図でひと目でわかる。二軒目難民にならない、空席をさっとチェックできるマップアプリ。ログイン不要。位置情報を許可して地図を開くだけ。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MachiNow (2軒目マップ)',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'MachiNow',
    title: 'MachiNow – 2軒目がすぐ見つかるマップ',
    description: '『いま入れるバー・スナック』が地図でひと目。ログイン不要、位置情報を許可して地図を開くだけで空席チェック。',
    images: ['/og-cover.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MachiNow – 2軒目がすぐ見つかるマップ',
    description: '二軒目にサクッと入れるお店が地図でわかる。ログイン不要、位置情報を許可して空席をチェック。',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* PWA用アイコン */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#3b82f6" />
        <meta property="og:image" content="/og-cover.png" />
        <meta property="og:locale" content="ja_JP" />
        <meta name="keywords" content="二軒目, バー, スナック, 空席, 地図, 大分, はしご酒" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
