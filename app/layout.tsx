import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/context';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NIKENME',
  description: '『いま入れるお店』が地図でひと目でわかる。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NIKENME (マップ)',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'NIKENME',
    title: 'NIKENME',
    description: '『いま入れるお店』が地図でひと目。ログイン不要、位置情報を許可して地図を開くだけで空席チェック。',
    images: ['/og-cover.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIKENME',
    description: '2軒目にサクッと入れるお店が地図でわかる。ログイン不要、位置情報を許可して空席をチェック。',
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
        {/* PWA用アイコン - Cloudinaryから直接読み込み */}
        <link rel="icon" href="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" />
        <link rel="apple-touch-icon" href="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" />
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
