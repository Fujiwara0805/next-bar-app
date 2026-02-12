import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '大分のおすすめバー・スナック・居酒屋一覧 | NIKENME+',
  description: '大分市都町・中央町エリアのおすすめバー・スナック・居酒屋の店舗一覧。空席状況をリアルタイムで確認。人気店、デート向け、一人飲み向けなど大分の夜の飲食店を探せます。',
  alternates: {
    canonical: 'https://nikenme.jp/store-list',
  },
  openGraph: {
    title: '大分のおすすめバー・スナック・居酒屋一覧 | NIKENME+',
    description: '大分市のおすすめバー・スナック・居酒屋の店舗一覧。空席状況をリアルタイムで確認できます。',
    url: 'https://nikenme.jp/store-list',
  },
};

export default function StoreListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
