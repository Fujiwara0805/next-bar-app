import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://nikenme.jp';
  const currentDate = new Date().toISOString();

  // 静的ページ
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/landing`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: currentDate,
      changeFrequency: 'always',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/store-list`,
      lastModified: currentDate,
      changeFrequency: 'always',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // 動的ページ: 個別店舗ページ（SEOに重要）
  let storePages: MetadataRoute.Sitemap = [];

  try {
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: stores } = await supabase
        .from('stores')
        .select('id, updated_at')
        .order('updated_at', { ascending: false });

      if (stores) {
        storePages = stores.map((store) => ({
          url: `${baseUrl}/store/${store.id}`,
          lastModified: store.updated_at || currentDate,
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }));
      }
    }
  } catch (error) {
    console.error('Error generating store sitemap entries:', error);
  }

  return [...staticPages, ...storePages];
}
