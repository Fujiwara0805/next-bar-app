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
import { translations } from '@/lib/i18n/translations';

const seo = translations.ja.seo.store_detail;

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
      'name, description, address, image_urls, google_rating, google_reviews_count, budget_min, budget_max, phone, store_category, latitude, longitude'
    )
    .eq('id', id)
    .maybeSingle();
  return data;
}

/**
 * 日本の住所文字列から「都道府県＋市区町村」を抽出する。
 * SEO上の主目的は (a) 店舗名で検索された際の上位表示、
 * (b) 加盟店所在エリアの「飲食店探し」検索の上位表示。
 * いずれもタイトル/説明文にエリア名を含めることが必須のため、ここで安全に抽出する。
 *
 * 例: "大分県大分市大字旦野原700番地" → "大分県大分市"
 *     "福岡県福岡市中央区天神2-1-1"     → "福岡県福岡市中央区"（区まで含めて精度UP）
 */
function extractArea(address: string | null | undefined): string | null {
  if (!address) return null;
  // 都道府県（4文字以内の最短マッチ）
  const prefMatch = address.match(/^[぀-ヿ一-鿿々ヶ]{1,4}?(?:都|道|府|県)/);
  const prefecture = prefMatch ? prefMatch[0] : '';
  const rest = prefecture ? address.slice(prefecture.length) : address;
  // 市区町村（最初の市/区/町/村まで）
  const cityMatch = rest.match(/^[぀-ヿ一-鿿々ヶ]{1,8}?(?:市|区|町|村)/);
  let city = cityMatch ? cityMatch[0] : '';
  // 政令市配下の「区」も含める（例: 福岡市中央区）
  if (city.endsWith('市')) {
    const afterCity = rest.slice(city.length);
    const wardMatch = afterCity.match(/^[぀-ヿ一-鿿々ヶ]{1,6}?区/);
    if (wardMatch) city += wardMatch[0];
  }
  const area = `${prefecture}${city}`.trim();
  return area || null;
}

/**
 * store_category 値を日本語ラベルに正規化（SEOキーワード適合）。
 * 検索クエリ「〇〇市 バー」「〇〇 居酒屋」等のロングテール対策。
 */
function categoryLabel(category: string | null | undefined): string {
  switch ((category || '').toLowerCase()) {
    case 'bar':
      return 'バー';
    case 'snack':
    case 'snack_bar':
      return 'スナック';
    case 'izakaya':
      return '居酒屋';
    case 'dining_bar':
    case 'dining':
      return 'ダイニングバー';
    case 'lounge':
      return 'ラウンジ';
    case 'cocktail_bar':
      return 'カクテルバー';
    default:
      return 'バー';
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const store = await getStore(id);

  if (!store) {
    return {
      title: seo.not_found_title,
      description: seo.not_found_description,
    };
  }

  const area = extractArea(store.address);
  const category = categoryLabel(store.store_category);

  // タイトル: 店舗名を主軸に、エリア×ジャンルを併記。
  // エリアが取れたときは title_template、取れないときは従来の suffix にフォールバック。
  const title = area
    ? seo.title_template
        .replace('{name}', store.name)
        .replace('{area}', area)
        .replace('{category}', category)
    : `${store.name}｜${seo.title_suffix}`;

  // description: 店舗説明 + エリア・ジャンル文 + 住所 + 予算（160字に丸める）
  const descParts: string[] = [];
  if (store.description) {
    descParts.push(store.description);
  }
  if (area) {
    descParts.push(
      seo.description_template
        .replace(/\{name\}/g, store.name)
        .replace(/\{area\}/g, area)
        .replace(/\{category\}/g, category)
    );
  } else if (store.address) {
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
  const description = descParts.join('。').slice(0, 160);

  // 店舗ページ専用キーワード: 店舗名 × エリア × ジャンル × シーンの組み合わせを生成。
  // 「店舗名で検索」「店舗名＋エリア」「エリア＋ジャンル」のロングテールを同時にカバー。
  const keywordSet = new Set<string>();
  keywordSet.add(store.name);
  keywordSet.add(`${store.name} 空席`);
  keywordSet.add(`${store.name} 予約`);
  keywordSet.add(`${store.name} 営業時間`);
  keywordSet.add(`${store.name} 口コミ`);
  if (area) {
    keywordSet.add(`${store.name} ${area}`);
    keywordSet.add(`${area} ${category}`);
    keywordSet.add(`${area} ${category} おすすめ`);
    keywordSet.add(`${area} ${category} 人気`);
    keywordSet.add(`${area} ${category} 空席`);
    keywordSet.add(`${area} 飲食店`);
    keywordSet.add(`${area} 二軒目`);
    keywordSet.add(`${area} はしご酒`);
    keywordSet.add(`${area} 一人飲み`);
    keywordSet.add(`${area} デート ${category}`);
    keywordSet.add(`${area} 深夜営業`);
  }
  keywordSet.add(category);
  keywordSet.add(`${category} 空席`);
  keywordSet.add('NIKENME+');
  keywordSet.add('にけんめぷらす');
  const keywords = Array.from(keywordSet).join(', ');

  const ogImage =
    store.image_urls && store.image_urls.length > 0
      ? store.image_urls[0]
      : DEFAULT_OGP_IMAGE;

  const storeUrl = `${BASE_URL}/store/${id}`;

  return {
    title,
    description,
    keywords,
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
          alt: `${store.name}${area ? `（${area}・${category}）` : ''}｜NIKENME+`,
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
