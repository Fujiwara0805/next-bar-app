/**
 * ============================================
 * ファイルパス: app/(ad)/ad-lp/layout.tsx
 * 
 * 機能: SNS広告LP専用レイアウト
 *       - OGP/メタデータ設定
 *       - フォント設定
 *       - ビューポート設定
 * ============================================
 */

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'NIKENME+ | 大分の夜と、数十年後の「おかえり」を守るために',
  description: '大分県の飲食店・ナイトスポットと地域を繋ぐ新しいプラットフォーム。今なら完全無料で加盟店登録いただけます。インバウンド需要の取り込み、デジタルプレゼンスの最大化、地域イベントの受け皿としてエリア全体の飲食店を支えます。',
  keywords: ['NIKENME+', 'ニケンメプラス', '大分', '飲食店', 'バー', '居酒屋', '加盟店募集', '無料', '大分市', '別府'],
  authors: [{ name: 'NIKENME+' }],
  creator: 'NIKENME+',
  publisher: 'NIKENME+',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'NIKENME+ | 大分の夜と、数十年後の「おかえり」を守るために',
    description: '大分県の飲食店・ナイトスポットと地域を繋ぐ新しいプラットフォーム。今なら完全無料で加盟店登録いただけます。',
    type: 'website',
    locale: 'ja_JP',
    siteName: 'NIKENME+',
    url: 'https://nikenme.com/ad-lp',
    images: [
      {
        url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
        width: 1200,
        height: 630,
        alt: 'NIKENME+ - 大分の夜と、数十年後の「おかえり」を守るために',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIKENME+ | 大分の夜と、数十年後の「おかえり」を守るために',
    description: '大分県の飲食店・ナイトスポットと地域を繋ぐ新しいプラットフォーム。今なら完全無料で加盟店登録いただけます。',
    images: ['https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png'],
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0A1628',
};

export default function AdLpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Preconnect for performance */}
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      
      {/* Favicon */}
      <link 
        rel="icon" 
        href="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" 
        type="image/png" 
      />
      
      {children}
    </>
  );
}