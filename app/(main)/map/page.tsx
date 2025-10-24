'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, List, ExternalLink } from 'lucide-react';
import { MapView } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

export default function MapPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores();
    loadUserLocation();

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
          fetchStores(); // 変更があったら再取得
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserLocation = () => {
    // localStorageから位置情報を取得
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setUserLocation(location);
        return;
      } catch (e) {
        console.error('Failed to parse saved location');
      }
    }

    // 保存された位置情報がない場合、デフォルト位置を使用
    setUserLocation({ lat: 35.6812, lng: 139.7671 });
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
    <div className="relative h-screen flex flex-col">
      {/* ヘッダー - レスポンシブ対応 */}
      <header className="absolute top-0 left-0 right-0 z-10 pt-4 sm:pt-6 px-3 sm:px-4 safe-top">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full"
        >
          {/* ロゴと戻るボタン */}
          <div className="flex items-center justify-end">
            
            {/* リストボタン */}
            <Button
              size="icon"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg bg-white/95 backdrop-blur-sm hover:bg-white mt-4"
              variant="secondary"
              onClick={() => router.push('/store-list')}
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </motion.div>
      </header>

      {/* マップ */}
      <MapView
        stores={stores}
        center={userLocation || undefined}
        onStoreClick={setSelectedStore}
      />

      {/* 店舗詳細カード */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-20 p-4"
          >
            <Card className="p-4 shadow-2xl">
              <div className="flex gap-3">
                {/* 店舗画像 */}
                {selectedStore.image_urls && selectedStore.image_urls.length > 0 && (
                  <motion.img
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={selectedStore.image_urls[0]}
                    alt={selectedStore.name}
                    className="w-24 h-24 object-cover rounded-lg cursor-pointer flex-shrink-0"
                    onClick={() => router.push(`/store/${selectedStore.id}`)}
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/store/${selectedStore.id}`)}
                    >
                      <h3 className="text-lg font-bold mb-1">{selectedStore.name}</h3>
                      {/* Googleマップで開くリンク */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedStore.address || '')}`;
                          window.open(mapsUrl, '_blank');
                        }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mb-2"
                      >
                        <span>Googleマップで開く</span>
                        <ExternalLink className="w-3 h-3" />
                      </motion.button>
                      {/* 空席情報を大きく表示 */}
                      <div className="mb-2">
                        <Badge
                          variant="secondary"
                          className={`${getVacancyColor(selectedStore.vacancy_status)} text-white text-xl py-1 px-3`}
                        >
                          {getVacancyLabel(selectedStore.vacancy_status)}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStore(null);
                      }}
                      className="shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* 一言メッセージ */}
                  {selectedStore.status_message && (
                    <p className="text-sm text-foreground mb-2 line-clamp-2">
                      {selectedStore.status_message}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 混雑状況の凡例 - レスポンシブ対応 */}
      <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-lg">
        <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500" />
            <span>空席</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
            <span>やや混雑</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500" />
            <span>満席</span>
          </div>
        </div>
      </div>
    </div>
  );
}