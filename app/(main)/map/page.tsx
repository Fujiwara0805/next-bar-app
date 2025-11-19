'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, List, ExternalLink, Building2, RefreshCw, Home, Star } from 'lucide-react';
import { MapView } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useLanguage } from '@/lib/i18n/context';

type Store = Database['public']['Tables']['stores']['Row'];

// useSearchParams()を使用する内部コンポーネント
function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // 初回ロードまたはrefreshパラメータがある場合に実行
    const shouldRefresh = searchParams?.get('refresh') === 'true';
    
    fetchStores();
    loadUserLocation();

    // refreshパラメータがあった場合は削除（履歴を汚さない）
    if (shouldRefresh) {
      router.replace('/map', { scroll: false });
    }

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
  }, [searchParams, router]);

  // マップ画面に戻ってきたときに位置情報と空席情報を再取得
  useEffect(() => {
    const handleVisibilityChange = () => {
      // ページが表示されたとき（他の画面から戻ってきたとき）に位置情報と空席情報を再取得
      if (document.visibilityState === 'visible') {
        loadUserLocation();
        fetchStores();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          localStorage.setItem('userLocation', JSON.stringify(location));
        },
        (error) => {
          console.error('Error getting location:', error);
          // エラーの場合は保存された位置情報を使用
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
          // デフォルト位置（大分駅周辺）
          setUserLocation({ lat: 33.2382, lng: 131.6126 });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      // Geolocation APIが利用できない場合
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
      // デフォルト位置（大分駅周辺）
      setUserLocation({ lat: 33.2382, lng: 131.6126 });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // 店舗情報の再取得
      await fetchStores();
      // 位置情報の再取得
      loadUserLocation();
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
  };

  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant':
        return t('map.vacant');
      case 'moderate':
        return t('map.moderate');
      case 'full':
        return t('map.full');
      case 'closed':
        return t('map.closed');
      default:
        return t('map.unknown');
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

  // 距離から徒歩時間を計算（徒歩速度: 4km/h = 約67m/分）
  const calculateWalkingTime = (distanceKm: number): number => {
    const walkingSpeedKmPerHour = 4; // 徒歩速度 4km/h
    const walkingTimeMinutes = (distanceKm / walkingSpeedKmPerHour) * 60;
    return Math.round(walkingTimeMinutes);
  };

  return (
    <div className="relative h-screen flex flex-col touch-manipulation">
      {/* ヘッダー - レスポンシブ対応 */}
      <header className="absolute top-0 left-0 right-0 z-10 pt-4 sm:pt-6 px-3 sm:px-4 safe-top pointer-events-none">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full"
        >
          {/* ロゴと戻るボタン */}
          <div className="flex items-center justify-end">
            
            {/* ボタングループ */}
            <div className="flex flex-col gap-3 pointer-events-auto">
              {/* ホームボタン */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center"
              >
                <Button
                  size="icon"
                  onClick={() => router.push('/landing')}
                  className="bg-gray-600 w-14 h-14 mt-12 border-2 border-gray-300 touch-manipulation active:scale-95"
                  title={t('map.home')}
                >
                  <Home className="w-7 h-7" />
                </Button>
                <span className="text-xs font-bold mt-1 text-gray-700 dark:text-gray-300">
                  {t('map.home')}
                </span>
              </motion.div>

              {/* リストボタン */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center"
              >
                <Button
                  size="icon"
                  onClick={() => router.push('/store-list')}
                  className="bg-gray-600 w-14 h-14 border-2 border-gray-300 touch-manipulation active:scale-95"
                  title={t('map.store_list')}
                >
                  <List className="w-7 h-7" />
                </Button>
                <span className="text-xs font-bold mt-1 text-gray-700 dark:text-gray-300">
                  {t('map.store_list')}
                </span>
              </motion.div>

              {/* 更新ボタン */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center"
              >
                <Button
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-gray-600 w-14 h-14 border-2 border-gray-300 touch-manipulation active:scale-95"
                  title={t('map.refresh')}
                >
                  <RefreshCw className={`w-7 h-7 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <span className="text-xs font-bold mt-1 text-gray-700 dark:text-gray-300">
                  {t('map.refresh')}
                </span>
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
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-30 bg-card shadow-lg border-t safe-bottom touch-manipulation"
          >
            <Card 
              className="rounded-t-3xl rounded-b-none border-0 cursor-pointer active:bg-muted/50 transition-colors"
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

                  <div className="flex-1 min-w-0 ">
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

                    {/* Google評価表示 */}
                    {selectedStore.google_rating && (
                      <div className="flex items-center gap-2 -mt-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(selectedStore.google_rating!)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'fill-gray-300 text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-bold">
                          {selectedStore.google_rating.toFixed(1)}
                        </span>
                        {selectedStore.google_reviews_count && (
                          <span className="text-xs text-muted-foreground">
                            ({selectedStore.google_reviews_count})
                          </span>
                        )}
                      </div>
                    )}

                    {/* 距離表示 */}
                    {userLocation && (
                      <p className="text-sm text-muted-foreground font-bold">
                        徒歩およそ{calculateWalkingTime(calculateDistance(
                          userLocation.lat,
                          userLocation.lng,
                          Number(selectedStore.latitude),
                          Number(selectedStore.longitude)
                        ))}分
                      </p>
                    )}

                    {/* Googleマップで開く */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedStore.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-bold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('map.open_in_google_maps')}
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
                  <div className="pt-2 border-t border-gray-800">
                    <p className="text-sm text-muted-foreground font-bold line-clamp-2">
                      {selectedStore.status_message}
                    </p>
                  </div>
                )}

                {/* 詳細を見るボタン */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/store/${selectedStore.id}`);
                  }}
                  className="w-full py-3 px-4 rounded-lg font-bold text-white transition-colors touch-manipulation"
                  style={{ backgroundColor: '#2c5f6f' }}
                >
                  {t('map.view_details')}
                </motion.button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 凡例（画面左下） */}
      <div className="fixed bottom-24 left-4 z-20 bg-card/90 backdrop-blur-sm rounded-lg shadow-lg p-3 safe-bottom pointer-events-auto">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png"
              alt={t('map.vacant')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: '#2a505f' }}>{t('map.vacant')}</span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311676/%E3%82%84%E3%82%84%E6%B7%B7%E9%9B%91_qjfizb.png"
              alt={t('map.moderate')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: '#2a505f' }}>{t('map.moderate')}</span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E6%BA%80%E5%B8%AD_gszsqi.png"
              alt={t('map.full')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: '#2a505f' }}>{t('map.full')}</span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761318837/icons8-%E9%96%89%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-100_fczegk.png"
              alt={t('map.closed')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: '#2a505f' }}>{t('map.closed')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Suspenseでラップしたエクスポートコンポーネント
export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">地図を読み込んでいます...</p>
        </div>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}