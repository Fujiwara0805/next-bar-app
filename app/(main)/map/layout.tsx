import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '大分のバー・スナック・居酒屋 空席マップ | NIKENME+',
  description: '大分市都町・中央町エリアのおすすめバー・スナック・居酒屋の空席情報を地図でリアルタイム表示。今すぐ入れる人気店が一目でわかる。大分の夜のお店探しに。',
  alternates: {
    canonical: 'https://nikenme.jp/map',
  },
  openGraph: {
    title: '大分のバー・スナック・居酒屋 空席マップ | NIKENME+',
    description: '大分市のおすすめバー・スナック・居酒屋の空席情報をリアルタイムで地図表示。今すぐ入れるお店がわかる。',
    url: 'https://nikenme.jp/map',
  },
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
