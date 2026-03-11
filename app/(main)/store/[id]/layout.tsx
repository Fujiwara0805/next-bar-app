/**
 * ============================================
 * ファイルパス: app/(main)/store/[id]/layout.tsx
 *
 * 機能: 店舗詳細ページの動的SEOメタデータ生成
 *       - 店舗ごとに固有のtitle / description / OGP
 *       - LocalBusiness JSON-LD 構造化データ
 *       - Google検索結果への最適化
 * ============================================
 */

import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const BASE_URL = 'https://nikenme.jp';
const DEFAULT_OGP_IMAGE =
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png';

type Props = {
  params: Promise<{ id: string }>;
};

async function getStore(id: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('stores')
    .select(
      'name, description, address, image_urls, google_rating, google_reviews_count, budget_min, budget_max, phone'
    )
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const store = await getStore(id);

  if (!store) {
    return {
      title: '店舗が見つかりません | NIKENME+',
      description: '指定された店舗は見つかりませんでした。',
    };
  }

  const title = `${store.name} - 大分のおすすめバー・スナック | NIKENME+`;

  // description: 店舗説明 + 住所（160文字以内）
  const descParts: string[] = [];
  if (store.description) {
    descParts.push(store.description);
  }
  if (store.address) {
    descParts.push(`📍${store.address}`);
  }
  if (store.budget_min || store.budget_max) {
    const min = store.budget_min ? `¥${store.budget_min.toLocaleString()}` : '';
    const max = store.budget_max ? `¥${store.budget_max.toLocaleString()}` : '';
    if (min && max) {
      descParts.push(`予算${min}〜${max}`);
    } else if (min) {
      descParts.push(`予算${min}〜`);
    } else if (max) {
      descParts.push(`予算〜${max}`);
    }
  }
  descParts.push('NIKENME+で空席情報をチェック');
  const description = descParts.join('。').slice(0, 160);

  const ogImage =
    store.image_urls && store.image_urls.length > 0
      ? store.image_urls[0]
      : DEFAULT_OGP_IMAGE;

  const storeUrl = `${BASE_URL}/store/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical: storeUrl,
    },
    openGraph: {
      title,
      description,
      url: storeUrl,
      siteName: 'NIKENME+',
      type: 'website',
      locale: 'ja_JP',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${store.name} | NIKENME+`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function StoreDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
