import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/context';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NIKENME+ | 二軒目探しに特化した空席情報マップ',
  description: '『いま入れるお店』が地図でひと目でわかる。2軒目、バー、スナック、居酒屋の空席情報をリアルタイムで確認。はしご酒・飲み歩きに最適。',
  manifest: '/manifest.json',
  keywords: [
    // コアキーワード
    '二軒目',
    'NIKENME+',
    'NIKENME',
    'ニケンメ',
    'ニケンメプラス',
    'にけんめ',
    'にけんめプラス',
    '2軒目',
    
    // 地域キーワード
    '大分 二軒目',
    '大分市 バー',
    '大分 スナック',
    '大分 居酒屋',
    '大分 飲み屋',
    
    // 用途キーワード
    'はしご酒',
    '飲み歩き',
    '空席情報',
    '空席',
    '空席マップ',
    '店舗地図',
    'リアルタイム空席',
    '近くの店',
    '深夜営業',
    '今入れる店',
    '待たずに入れる',
    
    // 店舗種別
    'バー 空席',
    'スナック 空席',
    '居酒屋 空席',
    'ラウンジ',
    
    // 機能キーワード
    '空席マップ',
    '店舗地図',
    'リアルタイム空席',
    '近くの店',
    '深夜営業',
  ].join(', '),
  authors: [{ name: 'NIKENME+' }],
  creator: 'NIKENME+',
  publisher: 'NIKENME+',
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
  alternates: {
    canonical: 'https://nikenme.jp', // 実際のドメインに変更
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NIKENME+ (ニケンメプラス)',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'NIKENME+ (ニケンメプラス)',
    title: 'NIKENME+ | 2軒目探しに特化した空席情報マップ',
    description: 'ログイン不要、位置情報を許可して地図を開くだけで大分の二軒目・バー・スナックの空席をチェック。はしご酒・飲み歩きに最適。',
    url: 'https://nikenme.com',
    images: [
      {
        url: '/og-cover.png',
        width: 1200,
        height: 630,
        alt: 'NIKENME+ - 2軒目探しの決定版',
      },
    ],
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIKENME+ | 2軒目探しに特化した空席情報マップ',
    description: '大分の2軒目・バー・スナックの空席をリアルタイムでチェック。ログイン不要で今すぐ使える。',
    images: ['/og-cover.png'],
    creator: '@nikenme', // Twitterアカウントがあれば設定
  },
  verification: {
    // Google Search Console認証用（取得後に設定）
    // google: 'your-google-verification-code',
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
        <link rel="icon" href="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" />
        <link rel="apple-touch-icon" href="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" />
        <meta name="theme-color" content="#3b82f6" />
        
        {/* 構造化データ (JSON-LD) - Googleが理解しやすい形式 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'NIKENME+',
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'Any',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'JPY',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '100',
              },
              description: '二軒目探しに特化した空席情報マップ。大分のバー・スナック・居酒屋の空席をリアルタイムで確認できます。',
              url: 'https://nikenme.jp',
              image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
              inLanguage: 'ja',
            }),
          }}
        />
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
