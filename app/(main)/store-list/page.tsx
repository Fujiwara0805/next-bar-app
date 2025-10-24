'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapIcon, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

export default function StoreListPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores();

    // リアルタイム更新の設定
    const channel = supabase
      .channel('stores-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stores'
        },
        (payload) => {
          console.log('Store change detected:', payload);
          fetchStores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // 検索クエリでフィルタリング
    if (searchQuery.trim() === '') {
      setFilteredStores(stores);
    } else {
      const filtered = stores.filter(store => 
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStores(filtered);
    }
  }, [searchQuery, stores]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
      setFilteredStores(data || []);
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
      case 'full':
        return '満席';
      case 'closed':
        return '閉店中';
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
      case 'full':
        return 'bg-red-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold">加盟店リスト</h1>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => router.push('/map')}
              className="rounded-full"
            >
              <MapIcon className="w-5 h-5" />
            </Button>
          </div>
          
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="店舗名、住所、説明で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {/* 検索結果数 */}
          <p className="text-sm text-muted-foreground mt-2">
            {filteredStores.length}件の店舗
          </p>
        </div>
      </header>

      {/* 店舗リスト */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            </div>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? '検索結果が見つかりませんでした' : '店舗がありません'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredStores.map((store, index) => (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="p-4 cursor-pointer hover:shadow-lg transition-shadow h-full"
                    onClick={() => router.push(`/store/${store.id}`)}
                  >
                    <div className="flex gap-3 h-full">
                      {/* 店舗画像 */}
                      {store.image_urls && store.image_urls.length > 0 && (
                        <motion.img
                          whileHover={{ scale: 1.05 }}
                          src={store.image_urls[0]}
                          alt={store.name}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-1 truncate">{store.name}</h3>
                          
                          {/* Googleマップで開くリンク */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address || '')}`;
                              window.open(mapsUrl, '_blank');
                            }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mb-2"
                          >
                            <span>Googleマップで開く</span>
                            <ExternalLink className="w-3 h-3" />
                          </motion.button>
                          
                          {/* 空席情報 */}
                          <div className="mb-2">
                            <Badge
                              variant="secondary"
                              className={`${getVacancyColor(store.vacancy_status)} text-white text-xl py-1 px-3`}
                            >
                              {getVacancyLabel(store.vacancy_status)}
                            </Badge>
                          </div>
                          
                          {/* 一言メッセージ */}
                          {store.status_message && (
                            <p className="text-sm text-foreground line-clamp-2">
                              {store.status_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}

