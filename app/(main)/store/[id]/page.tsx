'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

export default function StoreDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchStore(params.id as string);
    }
  }, [params.id]);

  const fetchStore = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setStore(data);
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant':
        return '空席あり';
      case 'moderate':
        return 'やや混雑';
      case 'crowded':
        return '混雑';
      default:
        return '不明';
    }
  };

  const getVacancyColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'bg-green-500';
      case 'moderate':
        return 'bg-yellow-500';
      case 'crowded':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-lg text-muted-foreground mb-4">店舗が見つかりませんでした</p>
        <Button onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4 safe-top">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">店舗詳細</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-3">{store.name}</h2>
              <div className="flex gap-2 mb-3">
                <Badge
                  variant="secondary"
                  className={`${getVacancyColor(store.vacancy_status)} text-white`}
                >
                  {getVacancyLabel(store.vacancy_status)}
                </Badge>
                <Badge variant="outline">
                  {store.is_open ? '営業中' : '閉店'}
                </Badge>
              </div>
            </div>

            {store.description && (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {store.description}
                </p>
                <Separator className="my-4" />
              </>
            )}

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">住所</p>
                  <p className="text-sm text-muted-foreground">{store.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">来客層</p>
                  <p className="text-sm text-muted-foreground">
                    男性 {store.male_ratio}% / 女性 {store.female_ratio}%
                  </p>
                </div>
              </div>

              {store.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">電話番号</p>
                    <a
                      href={`tel:${store.phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {store.phone}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">営業時間</p>
                  <p className="text-sm text-muted-foreground">
                    {store.opening_hours ? JSON.stringify(store.opening_hours) : '情報なし'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">混雑状況の推移</h3>
            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
              混雑状況グラフ（今後実装予定）
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            className="w-full"
            size="lg"
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`, '_blank')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            地図で見る
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
