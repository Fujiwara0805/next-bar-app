'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapIcon, X, ExternalLink, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useLanguage } from '@/lib/i18n/context';

type Store = Database['public']['Tables']['stores']['Row'];

export default function StoreListPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 位置情報の読み込み
  useEffect(() => {
    loadUserLocation();
  }, []);

  // 位置情報が設定されたら店舗を取得
  useEffect(() => {
    if (userLocation) {
      fetchStores();
    }
  }, [userLocation]);

  // リアルタイム更新の設定
  useEffect(() => {
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
  }, [userLocation]); // userLocationを依存配列に追加

  useEffect(() => {
    // 検索クエリでフィルタリング（店舗名のみ）
    if (searchQuery.trim() === '') {
      setFilteredStores(stores);
    } else {
      const filtered = stores.filter(store => 
        store.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStores(filtered);
    }
  }, [searchQuery, stores]);

  const loadUserLocation = () => {
    // まずlocalStorageから位置情報を取得
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

    // localStorageに位置情報がない場合、Geolocation APIを使用
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
          // エラーの場合はデフォルト位置を使用（大分駅周辺）
          setUserLocation({ lat: 33.2382, lng: 131.6126 });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      // Geolocation APIが利用できない場合、デフォルト位置を使用（大分駅周辺）
      setUserLocation({ lat: 33.2382, lng: 131.6126 });
    }
  };

  const fetchStores = async () => {
    if (!userLocation) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const storeData: Store[] = data || [];
      
      // 現在地から近い順にソート
      if (storeData.length > 0) {
        const sortedStores = [...storeData].sort((a, b) => {
          const distanceA = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            Number(a.latitude),
            Number(a.longitude)
          );
          const distanceB = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            Number(b.latitude),
            Number(b.longitude)
          );
          return distanceA - distanceB;
        });
        
        setStores(sortedStores);
        setFilteredStores(sortedStores);
      } else {
        setStores(storeData);
        setFilteredStores(storeData);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
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

  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant':
        return t('store_list.vacant');
      case 'moderate':
        return t('store_list.moderate');
      case 'full':
        return t('store_list.full');
      case 'closed':
        return t('store_list.closed');
      default:
        return t('store_list.unknown');
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
        return '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1C1E26' }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-card-foreground text-center">{t('store_list.title')}</h1>
          </div>
          
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder={t('store_list.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-white border-gray-300 text-base font-bold"
              style={{ fontSize: '16px', color: '#1C1E26' }}
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
          <p className="text-sm text-card-foreground/70 mt-2 font-bold">
            {filteredStores.length}{t('store_list.results_count')}
          </p>
        </div>
      </header>

      {/* 店舗リスト */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 relative">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-white font-bold">{t('store_list.loading')}</p>
            </div>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white font-bold">
              {searchQuery ? t('store_list.no_results') : t('store_list.no_stores')}
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
                    className="p-4 cursor-pointer hover:shadow-lg transition-shadow h-full bg-white"
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
                          <h3 className="text-lg font-bold text-card-foreground truncate">{store.name}</h3>
                          
                          {/* Google評価表示 */}
                          {store.google_rating && (
                            <div className="flex items-center gap-2 -mt-1 mb-1">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= Math.round(store.google_rating!)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-gray-300 text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm font-bold text-card-foreground">
                                {store.google_rating.toFixed(1)}
                              </span>
                              {store.google_reviews_count && (
                                <span className="text-xs text-card-foreground/70">
                                  ({store.google_reviews_count})
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* 距離表示 */}
                          {userLocation && (
                            <p className="text-sm text-card-foreground/70 font-bold">
                              徒歩およそ{calculateWalkingTime(calculateDistance(
                                userLocation.lat,
                                userLocation.lng,
                                Number(store.latitude),
                                Number(store.longitude)
                              ))}分
                            </p>
                          )}
                          
                          {/* Googleマップで開くリンク */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name || '')}`;
                              window.open(mapsUrl, '_blank');
                            }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-bold"
                          >
                            <span>{t('store_list.open_in_google_maps')}</span>
                            <ExternalLink className="w-3 h-3" />
                          </motion.button>
                          
                          {/* 空席情報 */}
                          <motion.div 
                            className="flex items-center gap-2 pt-1"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                          >
                            <img 
                              src={getVacancyIcon(store.vacancy_status)}
                              alt={getVacancyLabel(store.vacancy_status)}
                              className="w-6 h-6 object-contain"
                            />
                            <span className="text-xl font-bold text-card-foreground">
                              {getVacancyLabel(store.vacancy_status)}
                            </span>
                          </motion.div>
                          
                          {/* 一言メッセージ */}
                          {store.status_message && (
                            <p className="text-sm text-card-foreground/80 font-bold line-clamp-2 pt-1">
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

        {/* マップボタン（画面右下） */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 z-20"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center"
          >
            <Button
              size="icon"
              onClick={() => router.push('/map?refresh=true')}
              className="bg-gray-600 w-14 h-14 border-2 border-gray-300 touch-manipulation active:scale-95"
              title="Map"
            >
              <MapIcon className="w-7 h-7" />
            </Button>
            <span className="text-xs font-bold mt-1 text-gray-700 dark:text-gray-300">
              Map
            </span>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

