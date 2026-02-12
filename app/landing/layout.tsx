import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '大分のおすすめバー・スナック・居酒屋を探すなら | NIKENME+(ニケンメプラス)',
  description: '大分でおすすめのバー・スナック・居酒屋を探すならNIKENME+。大分市都町・中央町エリアの人気店の空席情報がリアルタイムでわかる。デート、一人飲み、女子会、出張、観光、はしご酒に最適。ログイン不要で完全無料。',
  alternates: {
    canonical: 'https://nikenme.jp/landing',
  },
  openGraph: {
    title: '大分のおすすめバー・スナック・居酒屋を探すなら | NIKENME+',
    description: '大分でおすすめのバー・スナック・居酒屋を探すならNIKENME+。人気店の空席がリアルタイムでわかる地図アプリ。',
    url: 'https://nikenme.jp/landing',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
