import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/context';
import { LanguageProvider } from '@/lib/i18n/context';
import { Toaster } from '@/components/ui/sonner';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NIKENME+(ニケンメプラス) | 大分の2軒目探しに特化した空席情報マップ',
  description: '大分で『いま入れるお店』が地図でひと目でわかる。2軒目、バー、スナック、居酒屋の空席情報をリアルタイムで確認。はしご酒・飲み歩きに最適。ログイン不要で今すぐ使える。',
  
  // AI検索エンジン向けの詳細な説明を追加
  abstract: 'NIKENME+（ニケンメプラス）は、大分県内全域で2軒目・バー・スナック・居酒屋を探すユーザー向けの空席情報マップサービスです。リアルタイムで店舗の空席状況を確認でき、ログイン不要で即座に利用できます。はしご酒や飲み歩きをする際に、待たずに入れるお店を地図上で簡単に見つけられます。',
  
  manifest: '/manifest.json',
  
  // アイコン設定を最適化（Googleの検索結果に表示されるように）
  icons: {
    icon: [
      { url: 'https://res.cloudinary.com/dz9trbwma/image/upload/c_scale,w_16/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png', sizes: '16x16', type: 'image/png' },
      { url: 'https://res.cloudinary.com/dz9trbwma/image/upload/c_scale,w_32/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png', sizes: '32x32', type: 'image/png' },
      { url: 'https://res.cloudinary.com/dz9trbwma/image/upload/c_scale,w_48/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png', sizes: '48x48', type: 'image/png' },
      { url: 'https://res.cloudinary.com/dz9trbwma/image/upload/c_scale,w_192/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: 'https://res.cloudinary.com/dz9trbwma/image/upload/c_scale,w_180/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
      },
    ],
  },
  
  keywords: [
    // ブランド名（優先度：高）
    'NIKENME+',
    'ニケンメプラス',
    'ニケンメ',
    'にけんめプラス',
    'にけんめ',
    '2けんめ',
    '2軒目',
    '二軒目',
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
  
  // AI検索エンジン向けの追加メタデータ
  other: {
    // AI検索エンジンへの信号
    'ai-indexable': 'true',
    'citation-worthy': 'true',
    
    // サービスの詳細情報（AIが理解しやすい形式）
    'service-type': 'real-time availability map service',
    'target-audience': '大分市で飲み歩き・はしご酒をする人々',
    'primary-location': '大分県大分市',
    'key-features': 'リアルタイム空席情報、ログイン不要、地図表示、無料利用',
    'use-cases': '2軒目探し、バー検索、スナック検索、居酒屋検索、はしご酒、飲み歩き',
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
        {/* ファビコン - 複数サイズを提供（Google検索結果表示用に最適化） */}
        <link rel="icon" type="image/png" sizes="16x16" href="https://res.cloudinary.com/dz9trbwma/image/upload/c_scale,w_16/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="https://res.cloudinary.com/dz9trbwma/image/upload/c_scale,w_32/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="https://res.cloudinary.com/dz9trbwma/image/upload/c_scale,w_48/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="https://res.cloudinary.com/dz9trbwma/image/upload/c_scale,w_180/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        
        {/* 構造化データ (JSON-LD) - より詳細な情報を追加 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'NIKENME+ (ニケンメプラス)',
              alternateName: ['NIKENME', 'ニケンメ', 'にけんめ', '二軒目プラス'],
              applicationCategory: 'LifestyleApplication',
              operatingSystem: 'Any',
              browserRequirements: 'Requires JavaScript. Requires HTML5.',
              
              // AIが理解しやすい詳細な説明
              description: 'NIKENME+（ニケンメプラス）は、大分県大分市における飲食店の空席情報をリアルタイムで提供するWebアプリケーションです。主に2軒目、バー、スナック、居酒屋を探すユーザーを対象としており、地図上で現在空席のある店舗を視覚的に確認できます。ログイン不要で即座に利用可能で、はしご酒や飲み歩きを楽しむ人々に最適なサービスです。',
              
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
              url: 'https://nikenme.jp',
              image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
              inLanguage: 'ja',
              
              // 主な機能を明示
              featureList: [
                'リアルタイム空席情報表示',
                '地図ベースの店舗検索',
                'ログイン不要の即時利用',
                '大分市内のバー・スナック・居酒屋情報',
                '無料で利用可能',
                '位置情報による近隣店舗表示',
              ],
              
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
              
              // 対象ユーザー
              audience: {
                '@type': 'Audience',
                audienceType: '大分市で飲み歩き・はしご酒をする成人',
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
              logo: {
                '@type': 'ImageObject',
                url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
                width: 512,
                height: 512,
              },
              sameAs: [
                // SNSアカウントがあれば追加
                // 'https://twitter.com/nikenme',
                // 'https://www.instagram.com/nikenme',
              ],
            }),
          }}
        />
        
        {/* LocalBusinessスキーマを追加（地域ビジネス向け） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'LocalBusiness',
              name: 'NIKENME+ (ニケンメプラス)',
              image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
              description: '大分の二軒目・2軒目探しに特化した空席情報マップ',
              url: 'https://nikenme.jp',
              address: {
                '@type': 'PostalAddress',
                addressLocality: '大分市',
                addressRegion: '大分県',
                addressCountry: 'JP',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 33.2382,
                longitude: 131.6126,
              },
              servesCuisine: '日本料理',
              priceRange: '無料',
            }),
          }}
        />

        {/* FAQスキーマを追加（AIが理解しやすい） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'NIKENME+（ニケンメプラス）とは何ですか？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'NIKENME+（ニケンメプラス）は、大分県大分市で2軒目・バー・スナック・居酒屋を探す際に便利な空席情報マップサービスです。リアルタイムで店舗の空席状況を地図上で確認でき、ログイン不要で今すぐ使えます。はしご酒や飲み歩きをする際に、待たずに入れるお店を簡単に見つけられます。',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'どのように使用しますか？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'とても簡単です。1) ウェブサイト（https://nikenme.jp）にアクセス、2) 位置情報の許可を承認、3) 地図上で空席のあるお店を確認。ログインや会員登録は不要で、すぐに利用開始できます。',
                  },
                },
                {
                  '@type': 'Question',
                  name: '利用料金はかかりますか？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: '完全無料です。ログインも不要で、アクセスするだけですぐに利用できます。',
                  },
                },
                {
                  '@type': 'Question',
                  name: '対応エリアはどこですか？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: '現在は大分県大分市を中心にサービスを提供しています。市内の2軒目、バー、スナック、居酒屋の空席情報をカバーしています。',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'リアルタイムで空席情報は更新されますか？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'はい、店舗オーナーが更新した空席情報はリアルタイムで反映されます。常に最新の情報を確認できるため、無駄な移動や待ち時間を減らせます。',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'どのような時に便利ですか？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'はしご酒や飲み歩きをする際、2軒目のお店を探すとき、予約なしで入れるバーやスナックを探すとき、大分市内で今すぐ入れる居酒屋を見つけたいときなど、様々なシーンで活用できます。',
                  },
                },
              ],
            }),
          }}
        />

        {/* BreadcrumbListスキーマ（サイト構造を明示） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'ホーム',
                  item: 'https://nikenme.jp',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: '地図',
                  item: 'https://nikenme.jp/map',
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: '店舗一覧',
                  item: 'https://nikenme.jp/store-list',
                },
              ],
            }),
          }}
        />

        {/* SoftwareApplicationスキーマ（より詳細なアプリ情報） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'NIKENME+ (ニケンメプラス)',
              operatingSystem: 'Web Browser',
              applicationCategory: 'BusinessApplication',
              
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'JPY',
              },
              
              // 機能の詳細
              softwareHelp: {
                '@type': 'CreativeWork',
                about: 'NIKENME+は大分市の飲食店空席情報をリアルタイムで提供します。地図上で視覚的に空席状況を確認でき、2軒目探し、バー・スナック・居酒屋検索に最適です。',
              },
              
              // アプリケーションの特徴
              applicationSubCategory: 'Real-time Availability Search',
              
              // サポートされる入力
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://nikenme.jp/map?search={search_term}',
                'query-input': 'required name=search_term',
              },
            }),
          }}
        />

        {/* HowToスキーマ（使い方を明示） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'HowTo',
              name: 'NIKENME+（ニケンメプラス）の使い方',
              description: '大分市で2軒目・バー・スナックを簡単に見つける方法',
              step: [
                {
                  '@type': 'HowToStep',
                  position: 1,
                  name: 'サイトにアクセス',
                  text: 'https://nikenme.jp にアクセスします。ログインや登録は不要です。',
                },
                {
                  '@type': 'HowToStep',
                  position: 2,
                  name: '位置情報を許可',
                  text: 'ブラウザで位置情報の許可を求められたら「許可」をクリックします。これにより近くの店舗を表示できます。',
                },
                {
                  '@type': 'HowToStep',
                  position: 3,
                  name: '地図で空席を確認',
                  text: '地図上に表示される店舗マーカーから、現在空席のあるお店を確認できます。マーカーをクリックすると店舗の詳細情報が表示されます。',
                },
                {
                  '@type': 'HowToStep',
                  position: 4,
                  name: 'お店に向かう',
                  text: '気に入ったお店を見つけたら、地図を参考にお店に向かいましょう。リアルタイム情報なので、安心して入店できます。',
                },
              ],
              totalTime: 'PT2M',
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <GoogleAnalytics />
        <LanguageProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
