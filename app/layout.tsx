import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/context';
import { LanguageProvider } from '@/lib/i18n/context';
import { Toaster } from '@/components/ui/sonner';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NIKENME+(ニケンメプラス) | 大分のおすすめバー・スナック・居酒屋の空席情報マップ',
  description: '大分でおすすめのバー・スナック・居酒屋を探すなら NIKENME+。大分市都町・中央町エリアの人気店の空席情報がリアルタイムでわかる地図アプリ。2軒目探し、はしご酒、飲み歩き、デート、一人飲みに最適。出張・観光の夜のお店探しにも。ログイン不要で完全無料。',

  // AI検索エンジン向けの詳細な説明を追加
  abstract: 'NIKENME+（ニケンメプラス）は、大分県大分市を中心におすすめのバー・スナック・居酒屋・飲食店の空席情報をリアルタイムで提供するマップサービスです。大分市都町・中央町の繁華街エリアを中心に、今すぐ入れる人気のお店を地図上で簡単に見つけられます。大分の夜を楽しむなら必見。デート、一人飲み、女子会、出張、観光、忘年会・新年会の二次会探しにも最適。ログイン不要で即座に利用可能です。',
  
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
    'nikenme',

    // ★ 主要検索キーワード（大分×夜の飲食店探し）
    '大分 おすすめ バー',
    '大分 おすすめ スナック',
    '大分 おすすめ 居酒屋',
    '大分 バー',
    '大分 スナック',
    '大分 居酒屋',
    '大分 飲食店',
    '大分市 バー',
    '大分市 スナック',
    '大分市 居酒屋',
    '大分市 飲食店',
    '大分 飲み屋',
    '大分 夜 飲み',
    '大分 バー おすすめ',
    '大分 居酒屋 おすすめ',
    '大分 スナック おすすめ',

    // ★ 大分県内ユーザーのローカル検索キーワード
    '大分 バー ランキング',
    '大分 居酒屋 ランキング',
    '大分 スナック ランキング',
    '大分 人気 バー',
    '大分 人気 居酒屋',
    '大分 人気 スナック',
    '大分 バー 人気',
    '大分 居酒屋 人気',
    '大分 夜 おすすめ',
    '大分 夜遊び',
    '大分 ナイトスポット',
    '大分 夜の街',
    '大分 飲み おすすめ',
    '大分 飲み放題',
    '大分 カクテルバー',
    '大分 ショットバー',
    '大分 オーセンティックバー',
    '大分 ダイニングバー',
    '大分 ガールズバー',
    '大分 ラウンジ',
    '大分 クラブ',
    '大分 スポーツバー',
    '大分 ワインバー',
    '大分 日本酒バー',
    '大分 焼酎バー',
    '大分 カラオケスナック',

    // エリア特化キーワード
    '大分 都町 バー',
    '大分 都町 スナック',
    '大分 都町 居酒屋',
    '大分 都町 飲食店',
    '大分 都町 おすすめ',
    '大分 都町 人気',
    '大分 都町 ナイトスポット',
    '大分 中央町 バー',
    '大分 中央町 居酒屋',
    '大分 中央町 おすすめ',
    '大分 繁華街',
    '大分 繁華街 おすすめ',
    '大分駅 バー',
    '大分駅 居酒屋',
    '大分駅前 飲み屋',
    '大分駅 近く バー',
    '大分駅 近く 居酒屋',
    '大分駅周辺 バー',
    '大分駅周辺 居酒屋',
    '別府 バー',
    '別府 スナック',
    '別府 居酒屋',
    '別府 飲み屋',

    // 2軒目・はしご酒キーワード
    '大分 二軒目',
    '大分 2軒目',
    '二軒目 大分',
    '2軒目 大分',
    '大分 はしご酒',
    '大分 飲み歩き',
    '大分 梯子酒',
    '大分 二次会',
    '大分 二次会 おすすめ',
    '大分 三次会',

    // シーン・目的別キーワード
    '大分 今入れる店',
    '大分 空席 バー',
    '大分 空席情報',
    '大分 深夜営業',
    '大分 深夜営業 バー',
    '大分 深夜営業 居酒屋',
    '大分 一人飲み',
    '大分 一人 バー',
    '大分 一人飲み おすすめ',
    '大分 デート バー',
    '大分 デート 居酒屋',
    '大分 デート おすすめ',
    '大分 女子会',
    '大分 女子会 おすすめ',
    '大分 合コン',
    '大分 接待 バー',
    '大分 接待 居酒屋',
    '大分 記念日',
    '大分 誕生日 バー',
    '大分 個室 バー',
    '大分 個室 居酒屋',
    '大分 飲み会 おすすめ',
    '大分 宴会 おすすめ',

    // 季節・イベントキーワード
    '大分 忘年会',
    '大分 新年会',
    '大分 歓迎会',
    '大分 送別会',
    '大分 忘年会 おすすめ',
    '大分 新年会 おすすめ',

    // ビジネスマン・出張キーワード
    '大分 出張 飲み',
    '大分 出張 バー',
    '大分 出張 おすすめ',
    '大分 出張 夜',
    '大分 ビジネス 飲食',
    '大分 出張 一人飲み',
    '大分 出張 居酒屋',

    // 観光・インバウンドキーワード
    '大分 観光 夜',
    '大分 観光 バー',
    '大分 観光 グルメ',
    '大分 観光 おすすめ 夜',
    '大分 温泉 夜 飲み',
    '別府温泉 夜 飲み',
    '大分 旅行 夜',
    'Oita bar',
    'Oita nightlife',
    'Oita izakaya',
    'Oita restaurant',
    'bars in Oita',
    'Oita bar recommendations',
    'Oita nightlife guide',
    'best bars in Oita',
    'Oita snack bar',
    'Oita drinking',

    // 機能・利便性キーワード
    '空席マップ',
    '飲食店 空席',
    '近くの バー',
    '近くの 居酒屋',
    '近くの スナック',
    '今入れる店',
    '大分 近くのバー',
    '大分 近くの居酒屋',
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
    'service-type': 'real-time restaurant availability map service',
    'target-audience': '大分市でおすすめのバー・スナック・居酒屋を探す地元の方、ビジネスマン、観光客',
    'primary-location': '大分県大分市（都町・中央町エリア中心）',
    'key-features': 'リアルタイム空席情報、ログイン不要、地図表示、無料利用、多言語対応、おすすめ店舗、人気ランキング',
    'use-cases': '大分のおすすめバー探し、おすすめスナック探し、おすすめ居酒屋探し、2軒目探し、はしご酒、飲み歩き、デート、一人飲み、女子会、出張時の飲食店探し、観光客向け夜のお店ガイド、忘年会・新年会の二次会探し',
    'geo.region': 'JP-44',
    'geo.placename': '大分市',
    'geo.position': '33.2382;131.6126',
    'ICBM': '33.2382, 131.6126',
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
    title: 'NIKENME+ | 大分のおすすめバー・スナック・居酒屋の空席マップ',
    description: '大分でおすすめのバー・スナック・居酒屋を探すならNIKENME+。人気店の空席がリアルタイムでわかる地図アプリ。大分市都町・中央町エリアの2軒目探し、はしご酒、デート、一人飲みに最適。出張・観光にも。',
    url: 'https://nikenme.jp',
    images: [
      {
        url: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
        width: 1200,
        height: 630,
        alt: 'NIKENME+ - 大分の飲食店・バー・スナック・居酒屋の空席情報マップ',
      },
    ],
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NIKENME+ | 大分のおすすめバー・スナック・居酒屋を今すぐ探せる空席マップ',
    description: '大分でおすすめのバー・スナック・居酒屋をお探しなら。人気店の空席情報をリアルタイムで確認。デート、一人飲み、出張にも最適。',
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
              description: 'NIKENME+（ニケンメプラス）は、大分県大分市のおすすめバー・スナック・居酒屋の空席情報をリアルタイムで地図上に表示するWebアプリです。大分市都町・中央町の繁華街を中心に、今すぐ入れる人気のお店が一目でわかります。デート、一人飲み、女子会、出張、観光、忘年会・新年会の二次会探し、はしご酒、飲み歩きに最適。ログイン不要・完全無料で利用可能。English, Korean, Chinese supported.',
              
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
                '大分市のおすすめバー・スナック・居酒屋のリアルタイム空席情報',
                '地図ベースの店舗検索（大分市都町・中央町エリア対応）',
                'ログイン不要・完全無料で即時利用',
                '多言語対応（日本語・英語・韓国語・中国語）',
                '位置情報による近くのバー・居酒屋・スナック表示',
                'デート・一人飲み・女子会・出張に最適なお店探し',
                'はしご酒・飲み歩き・二次会探し支援',
                'Google Maps連携ナビゲーション',
                '大分の人気店・おすすめ店の空席がひと目でわかる',
              ],
              
              areaServed: {
                '@type': 'City',
                name: '大分市',
                containedIn: {
                  '@type': 'AdministrativeArea',
                  name: '大分県',
                },
              },
              availableLanguage: [
                { '@type': 'Language', name: 'Japanese', alternateName: 'ja' },
                { '@type': 'Language', name: 'English', alternateName: 'en' },
                { '@type': 'Language', name: 'Korean', alternateName: 'ko' },
                { '@type': 'Language', name: 'Chinese', alternateName: 'zh' },
              ],
              
              // 対象ユーザー
              audience: {
                '@type': 'Audience',
                audienceType: '大分市でおすすめのバー・スナック・居酒屋を探す方（地元の方、出張ビジネスマン、観光客・インバウンド客、デートカップル、一人飲み派）',
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
              '@id': 'https://nikenme.jp/#business',
              name: 'NIKENME+ (ニケンメプラス)',
              image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
              description: '大分市のおすすめバー・スナック・居酒屋のリアルタイム空席情報マップ。大分で今すぐ入れる人気のお店が地図で一目でわかる。デート、一人飲み、出張、観光、はしご酒に最適。',
              url: 'https://nikenme.jp',
              address: {
                '@type': 'PostalAddress',
                addressLocality: '大分市',
                addressRegion: '大分県',
                postalCode: '870-0000',
                addressCountry: 'JP',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 33.2382,
                longitude: 131.6126,
              },
              areaServed: [
                { '@type': 'City', name: '大分市' },
                { '@type': 'AdministrativeArea', name: '大分県' },
              ],
              knowsAbout: [
                '大分 おすすめ バー',
                '大分 おすすめ スナック',
                '大分 おすすめ 居酒屋',
                '大分 バー ランキング',
                '大分 人気 バー',
                '大分 飲食店',
                '大分 バー',
                '大分 スナック',
                '大分 居酒屋',
                '大分 都町 おすすめ',
                '大分 中央町',
                '大分 はしご酒',
                '大分 飲み歩き',
                '大分 2軒目',
                '大分 出張 飲み',
                '大分 観光 夜',
                '大分 デート バー',
                '大分 一人飲み',
                '大分 女子会',
                '大分 深夜営業 バー',
                '大分 ナイトスポット',
              ],
              priceRange: '無料',
              openingHoursSpecification: {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                opens: '00:00',
                closes: '23:59',
              },
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
                  name: '大分でおすすめのバーを探すにはどうすればいいですか？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'NIKENME+（ニケンメプラス）がおすすめです。大分市の都町・中央町エリアを中心に、おすすめのバー・スナック・居酒屋の空席情報をリアルタイムで地図表示します。ログイン不要・完全無料で、今すぐ入れる人気店がひと目でわかります。',
                  },
                },
                {
                  '@type': 'Question',
                  name: '大分でおすすめのスナックはどこですか？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'NIKENME+では、大分市都町・中央町のおすすめスナックを多数掲載しています。空席情報をリアルタイムで確認できるので、行ってみたら満席だったということがありません。地図で近くのスナックを簡単に見つけられます。',
                  },
                },
                {
                  '@type': 'Question',
                  name: '大分でおすすめの居酒屋を教えてください',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'NIKENME+（https://nikenme.jp）では、大分市内のおすすめ居酒屋の情報を多数掲載しています。空席状況がリアルタイムでわかるため、予約なしでもすぐに入れるお店が見つかります。大分駅周辺から都町エリアまで幅広くカバーしています。',
                  },
                },
                {
                  '@type': 'Question',
                  name: '大分に出張で来たのですが、夜に飲みに行けるバーや居酒屋を探す方法は？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'NIKENME+（https://nikenme.jp）にアクセスして位置情報を許可するだけで、現在地周辺の空席のあるバーや居酒屋が地図上に表示されます。大分市の繁華街（都町・中央町エリア）の店舗情報が充実しており、出張ビジネスマンの一人飲みにも最適です。',
                  },
                },
                {
                  '@type': 'Question',
                  name: '大分の都町エリアで2軒目・はしご酒をしたいのですが？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'NIKENME+は大分の2軒目探し・はしご酒に特化したサービスです。都町・中央町エリアのおすすめバー、スナック、居酒屋の空席状況をリアルタイムで確認できるため、次のお店選びに迷いません。',
                  },
                },
                {
                  '@type': 'Question',
                  name: '大分でデートにおすすめのバーはありますか？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'NIKENME+では、大分市内のおしゃれなバーやダイニングバーも掲載しています。空席情報をリアルタイムで確認できるので、デートの際に「満席で入れない」ということを防げます。都町エリアには雰囲気の良いバーが多数あります。',
                  },
                },
                {
                  '@type': 'Question',
                  name: '大分で深夜営業しているバーやスナックを探すには？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'NIKENME+では、営業中の店舗がリアルタイムで地図上に表示されます。深夜でも営業中のバーやスナックがある場合、「営業中」マーカーで確認できます。大分市都町エリアを中心に深夜営業の店舗も多数掲載しています。',
                  },
                },
                {
                  '@type': 'Question',
                  name: '大分で一人飲みにおすすめのお店を探すには？',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'NIKENME+の地図上で空席のあるバーや居酒屋を確認できます。一人飲みでも気軽に入れるお店が大分市内に多数掲載されています。カウンター席のあるバーやオーセンティックバーなど、一人でも楽しめるおすすめ店が見つかります。',
                  },
                },
                {
                  '@type': 'Question',
                  name: '外国人観光客ですが、大分でバーや居酒屋を探せますか？（For foreign tourists）',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes! NIKENME+ supports English, Korean, and Chinese. Just visit https://nikenme.jp and allow location access to find recommended bars, izakaya, and snack bars with real-time availability in Oita city. No login or registration required.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'NIKENME+の使い方を教えてください',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: '1) https://nikenme.jp にアクセス、2) 位置情報の許可を承認、3) 地図上で空席のあるお店を確認。ログインや会員登録は一切不要で、完全無料です。大分市内のおすすめバー・スナック・居酒屋の空席情報がリアルタイムで表示されます。',
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
