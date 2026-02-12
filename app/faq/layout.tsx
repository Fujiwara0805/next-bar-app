import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'よくある質問 | NIKENME+ 大分のおすすめバー・スナック・居酒屋検索',
  description: 'NIKENME+のよくある質問。大分でおすすめのバー・スナック・居酒屋の探し方、使い方、空席情報の確認方法など。大分市都町・中央町エリアの夜のお店探しに。',
  alternates: {
    canonical: 'https://nikenme.jp/faq',
  },
  openGraph: {
    title: 'よくある質問 | NIKENME+',
    description: 'NIKENME+のよくある質問。大分でおすすめのバー・スナック・居酒屋の探し方をご案内。',
    url: 'https://nikenme.jp/faq',
  },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
