'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, List, ExternalLink, Building2, RefreshCw } from 'lucide-react';
import { MapView } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
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
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = () => {
    setRefreshing(true);
    // ページをリロード
    window.location.reload();
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

  const getVacancyIcon = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png';
      case 'moderate':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761311676/%E3%82%84%E3%82%84%E6%B7%B7%E9%9B%91_qjfizb.png';
      case 'full':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E6%BA%80%E5%B8%AD_gszsqi.png';
      case 'closed':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761318837/icons8-%E9%96%89%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-100_fczegk.png';
      default:
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png';
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

  // Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
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
            
            {/* ボタングループ */}
            <div className="flex flex-col gap-2">
              {/* リストボタン */}
              <Button
                size="icon"
                onClick={() => router.push('/store-list')}
                className="bg-gray-600 w-12 h-12 mt-12 border-2 border-gray-300"
              >
                <List className="w-7 h-7" />
              </Button>

              {/* 更新ボタン */}
              <motion.div
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-gray-600 w-12 h-12 border-2 border-gray-300"
                  title="ページを更新"
                >
                  <RefreshCw className={`w-7 h-7 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </motion.div>
            </div>
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
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-30 bg-card shadow-lg border-t safe-bottom"
          >
            <Card 
              className="rounded-t-3xl rounded-b-none border-0 cursor-pointer"
              onClick={() => router.push(`/store/${selectedStore.id}`)}
            >
              <div className="p-4 space-y-3">
                {/* 画像と基本情報 */}
                <div className="flex gap-4">
                  {selectedStore.image_urls && selectedStore.image_urls.length > 0 ? (
                    <img
                      src={selectedStore.image_urls[0]}
                      alt={selectedStore.name}
                      className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-lg line-clamp-1">{selectedStore.name}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 -mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStore(null);
                        }}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    {/* 距離表示 */}
                    {userLocation && (
                      <p className="text-sm text-muted-foreground font-bold">
                        現在地から {calculateDistance(
                          userLocation.lat,
                          userLocation.lng,
                          Number(selectedStore.latitude),
                          Number(selectedStore.longitude)
                        ).toFixed(1)}km
                      </p>
                    )}

                    {/* Googleマップで開く */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedStore.latitude},${selectedStore.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-bold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Googleマップで開く
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {/* 空席情報 */}
                    <div className="flex items-center gap-2 pt-1">
                      <img
                        src={getVacancyIcon(selectedStore.vacancy_status)}
                        alt={getVacancyLabel(selectedStore.vacancy_status)}
                        className="w-6 h-6"
                      />
                      <span className="text-xl font-bold">
                        {getVacancyLabel(selectedStore.vacancy_status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 一言メッセージ */}
                {selectedStore.status_message && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground font-bold line-clamp-2">
                      {selectedStore.status_message}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 凡例（画面左下） */}
      <div className="fixed bottom-24 left-4 z-20 bg-card/90 backdrop-blur-sm rounded-lg shadow-lg p-3 safe-bottom">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png"
              alt="空席あり"
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: '#2a505f' }}>空席あり</span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311676/%E3%82%84%E3%82%84%E6%B7%B7%E9%9B%91_qjfizb.png"
              alt="やや混雑"
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: '#2a505f' }}>やや混雑</span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E6%BA%80%E5%B8%AD_gszsqi.png"
              alt="満席"
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: '#2a505f' }}>満席</span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761318837/icons8-%E9%96%89%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-100_fczegk.png"
              alt="閉店"
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: '#2a505f' }}>閉店</span>
          </div>
        </div>
      </div>
    </div>
  );
}