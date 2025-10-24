'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Users,
  Phone,
  CreditCard,
  Wifi,
  Calendar,
  DollarSign,
  ExternalLink,
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

  // 営業時間の表示用関数
  const formatBusinessHours = (hours: any) => {
    if (!hours) return '情報なし';
    
    const dayLabels: any = {
      monday: '月',
      tuesday: '火',
      wednesday: '水',
      thursday: '木',
      friday: '金',
      saturday: '土',
      sunday: '日'
    };

    return Object.entries(hours).map(([day, time]: any) => {
      if (time.closed) return `${dayLabels[day]}: 定休日`;
      if (time.open && time.close) return `${dayLabels[day]}: ${time.open} - ${time.close}`;
      return null;
    }).filter(Boolean).join(', ') || '情報なし';
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
          {/* 店舗画像カルーセル（今後実装） */}
          {store.image_url && (
            <div className="w-full h-64 mb-4 rounded-lg overflow-hidden">
              <img
                src={store.image_url}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

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

            {/* 一言メッセージ */}
            {store.status_message && (
              <>
                <div className="p-3 bg-primary/5 border-l-4 border-primary rounded mb-4">
                  <p className="text-sm">{store.status_message}</p>
                </div>
                <Separator className="my-4" />
              </>
            )}

            <div className="space-y-4">
              {/* 住所 */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">住所</p>
                  <p className="text-sm text-muted-foreground">{store.address}</p>
                </div>
              </div>

              {/* 営業時間 */}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">営業時間</p>
                  <p className="text-sm text-muted-foreground">
                    {formatBusinessHours(store.business_hours)}
                  </p>
                  {store.regular_holiday && (
                    <p className="text-sm text-muted-foreground mt-1">
                      定休日: {store.regular_holiday}
                    </p>
                  )}
                </div>
              </div>

              {/* 予算 */}
              {store.budget_min && store.budget_max && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">予算</p>
                    <p className="text-sm text-muted-foreground">
                      ¥{store.budget_min.toLocaleString()} 〜 ¥{store.budget_max.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* 来客層 */}
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">現在の来客層</p>
                  <p className="text-sm text-muted-foreground">
                    男性 {store.male_ratio}人 / 女性 {store.female_ratio}人
                  </p>
                </div>
              </div>

              {/* 電話番号 */}
              {store.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
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

              {/* ウェブサイト */}
              {store.website_url && (
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">ウェブサイト</p>
                    <a
                      href={store.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {store.website_url}
                    </a>
                  </div>
                </div>
              )}

              {/* 支払い方法 */}
              {store.payment_methods && store.payment_methods.length > 0 && (
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">支払い方法</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {store.payment_methods.map((method) => (
                        <Badge key={method} variant="secondary">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 設備 */}
              {store.facilities && store.facilities.length > 0 && (
                <div className="flex items-start gap-3">
                  <Wifi className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">設備・サービス</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {store.facilities.map((facility) => (
                        <Badge key={facility} variant="outline">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>


      </div>
    </div>
  );
}
