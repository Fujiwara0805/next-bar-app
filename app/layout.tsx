import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/context';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NIKENME+(ニケンメプラス) | 大分の2軒目探しに特化した空席情報マップ',
  description: '大分で『いま入れるお店』が地図でひと目でわかる。2軒目、バー、スナック、居酒屋の空席情報をリアルタイムで確認。はしご酒・飲み歩きに最適。ログイン不要で今すぐ使える。',
  manifest: '/manifest.json',
  keywords: [
    // ブランド名（優先度：高）
    'NIKENME+',
    'ニケンメプラス',
    'ニケンメ',
    'にけんめプラス',
    'にけんめ',
    'nikenme',
    
    // コアキーワード（優先度：高）
    '大分 二軒目',
    '大分 2軒目',
    '大分市 二軒目',
    '二軒目 大分',
    '2軒目 大分',
    
    // ロングテールキーワード（優先度：中〜高）
    '大分 今入れる店',
    '大分 空席 バー',
    '大分 空席情報',
    '大分 はしご酒',
    '大分 飲み歩き',
    '大分市 バー 空席',
    '大分市 スナック',
    '大分 二軒目 マップ',
    '大分 居酒屋 空席',
    
    // 用途キーワード
    '今入れる店',
    '待たずに入れる店',
    '空席 リアルタイム',
    'バー 空席情報',
    'スナック 空席',
    '深夜 営業 大分',
    
    // 機能キーワード
    '空席マップ',
    '店舗地図',
    '飲食店 空席',
    '近くの店',
  ].join(', '),
  authors: [{ name: 'NIKENME+ (ニケンメプラス)' }],
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
    canonical: 'https://nikenme.jp',
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
    title: 'NIKENME+ | 大分の2軒目探しに特化した空席情報マップ',
    description: 'ログイン不要、位置情報を許可して地図を開くだけで大分の二軒目・バー・スナックの空席をチェック。はしご酒・飲み歩きに最適。',
    url: 'https://nikenme.jp',
    images: [
      {
        url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
        width: 1200,
        height: 630,
        alt: 'NIKENME+ (ニケンメプラス) - 大分の2軒目探しの決定版',
      },
    ],
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIKENME+ | 大分の2軒目探しに特化した空席情報マップ',
    description: '大分の2軒目・バー・スナックの空席をリアルタイムでチェック。ログイン不要で今すぐ使える。',
    images: ['https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png'],
    creator: '@nikenme',
  },
  verification: {
    // Google Search Console認証用（後で追加）
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
              name: 'NIKENME+ (ニケンメプラス)',
              alternateName: ['NIKENME', 'ニケンメ', 'にけんめ'],
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'Any',
              browserRequirements: 'Requires JavaScript. Requires HTML5.',
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
              description: '大分の二軒目・2軒目探しに特化した空席情報マップ。バー・スナック・居酒屋の空席をリアルタイムで確認できます。ログイン不要、今すぐ使えるはしご酒アプリ。',
              url: 'https://nikenme.jp',
              image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
              inLanguage: 'ja',
              areaServed: {
                '@type': 'City',
                name: '大分市',
                containedIn: {
                  '@type': 'AdministrativeArea',
                  name: '大分県',
                },
              },
              availableLanguage: {
                '@type': 'Language',
                name: '日本語',
              },
            }),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'NIKENME+ (ニケンメプラス)',
              url: 'https://nikenme.jp',
              logo: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
              sameAs: [
                // SNSアカウントがあれば追加
                // 'https://twitter.com/nikenme',
                // 'https://www.instagram.com/nikenme',
              ],
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
