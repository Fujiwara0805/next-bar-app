'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Store as StoreIcon, Edit, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

export default function StoreManagePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.is_business) {
      router.push('/profile');
      return;
    }

    fetchStores();
  }, [profile, router]);

  const fetchStores = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b safe-top">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold">店舗管理</h1>
          <Link href="/store/manage/new">
            <Button size="icon" className="rounded-full">
              <Plus className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {stores.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-12 text-center">
              <StoreIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">
                まだ店舗が登録されていません
              </h2>
              <p className="text-muted-foreground mb-6">
                最初の店舗を登録して、情報を共有しましょう
              </p>
              <Link href="/store/manage/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  店舗を登録
                </Button>
              </Link>
            </Card>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {stores.map((store, index) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  {store.image_url && (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={store.image_url}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">
                          {store.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {store.address}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => router.push(`/store/manage/${store.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>

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

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        男性 {store.male_ratio}% / 女性 {store.female_ratio}%
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/store/manage/${store.id}/update`)}
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        状況更新
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
