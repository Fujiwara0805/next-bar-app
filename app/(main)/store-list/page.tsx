/**
 * ============================================
 * ファイルパス: app/(main)/store-list/page.tsx
 * 
 * 機能: 店舗一覧ページ
 *       【最適化】初回ロード時のみis_open更新APIを呼び出す
 *       【追加】コンシェルジュ機能による店舗提案
 *       【追加】空席ありフィルター機能
 *       【修正】おすすめバッジをカード内部に配置
 * ============================================
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapIcon, ExternalLink, Star, Filter, Check, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useLanguage } from '@/lib/i18n/context';
import { ConciergeModal } from '@/components/concierge-modal';

type Store = Database['public']['Tables']['stores']['Row'];

export default function StoreListPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // フィルター状態
  const [vacantOnly, setVacantOnly] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // コンシェルジュ状態
  const [showConcierge, setShowConcierge] = useState(false);
  const [conciergeFilters, setConciergeFilters] = useState<string[]>([]);
  const [isConciergeActive, setIsConciergeActive] = useState(false);

  // 初回ロード完了フラグ
  const isOpenUpdatedRef = useRef(false);

  // 位置情報の読み込み
  useEffect(() => {
    loadUserLocation();
  }, []);

  // 初回マウント時のみis_open更新APIを呼び出す
  useEffect(() => {
    const updateIsOpenOnce = async () => {
      if (isOpenUpdatedRef.current) return;
      isOpenUpdatedRef.current = true;

      try {
        const res = await fetch('/api/stores/update-is-open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const result = await res.json();
        console.log('is_open update result:', result);

        if (result.updated > 0 && userLocation) {
          fetchStoresOnly();
        }
      } catch (err) {
        console.warn('Failed to update is_open:', err);
      }
    };

    updateIsOpenOnce();
  }, []);

  // 位置情報が設定されたら店舗を取得
  useEffect(() => {
    if (userLocation) {
      fetchStoresOnly();
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
          fetchStoresOnly();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation]);

  // フィルタリングロジック
  useEffect(() => {
    let result = [...stores];

    // 空席ありフィルター
    if (vacantOnly) {
      result = result.filter(store => store.vacancy_status === 'vacant');
    }

    // コンシェルジュフィルター（facilitiesベース）
    if (isConciergeActive && conciergeFilters.length > 0) {
      result = result.filter(store => {
        if (!store.facilities || store.facilities.length === 0) return false;
        
        const matchCount = conciergeFilters.filter(filter => 
          store.facilities!.includes(filter)
        ).length;
        
        return matchCount > 0;
      });

      result.sort((a, b) => {
        const matchA = conciergeFilters.filter(f => a.facilities?.includes(f) || false).length;
        const matchB = conciergeFilters.filter(f => b.facilities?.includes(f) || false).length;
        
        if (matchB !== matchA) {
          return matchB - matchA;
        }
        
        return 0;
      });
    }

    setFilteredStores(result);
  }, [stores, vacantOnly, conciergeFilters, isConciergeActive]);

  const loadUserLocation = () => {
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
          setUserLocation({ lat: 33.2382, lng: 131.6126 });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setUserLocation({ lat: 33.2382, lng: 131.6126 });
    }
  };

  const fetchStoresOnly = async () => {
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
      } else {
        setStores(storeData);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateWalkingTime = (distanceKm: number): number => {
    const walkingSpeedKmPerHour = 4;
    const walkingTimeMinutes = (distanceKm / walkingSpeedKmPerHour) * 60;
    return Math.round(walkingTimeMinutes);
  };

  const getMatchScore = (store: Store): number => {
    if (!isConciergeActive || conciergeFilters.length === 0) return 0;
    if (!store.facilities) return 0;
    return conciergeFilters.filter(f => store.facilities!.includes(f)).length;
  };

  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant':
        return t('store_list.vacant');
      case 'full':
        return t('store_list.full');
      case 'open':
        return t('store_list.open');
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
      case 'full':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E6%BA%80%E5%B8%AD_gszsqi.png';
      case 'open':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1767848645/icons8-%E9%96%8B%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-94_a4tmzn.png';
      case 'closed':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761318837/icons8-%E9%96%89%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-100_fczegk.png';
      default:
        return '';
    }
  };

  const handleConciergeComplete = (selectedFacilities: string[]) => {
    setConciergeFilters(selectedFacilities);
    setIsConciergeActive(true);
    setShowConcierge(false);
  };

  const clearConciergeFilter = () => {
    setConciergeFilters([]);
    setIsConciergeActive(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.filter-menu-container')) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showFilterMenu]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1C1E26' }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-card-foreground text-center">{t('store_list.title')}</h1>
          </div>
          
          {/* コンシェルジュボタン */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowConcierge(true)}
            className="w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: isConciergeActive 
                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                : 'linear-gradient(135deg, #1C1E26 0%, #2D3748 100%)',
              color: isConciergeActive ? '#000' : '#F59E0B',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)',
            }}
          >
            <Sparkles className="w-5 h-5" />
            <span>
              {isConciergeActive ? 'コンシェルジュが提案中' : 'コンシェルジュに相談する'}
            </span>
          </motion.button>
          
          {/* フィルター状態表示 */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm text-card-foreground/70 font-bold">
              {filteredStores.length}{t('store_list.results_count')}
              {vacantOnly && (
                <span className="ml-2 text-green-600">（空席ありのみ）</span>
              )}
              {isConciergeActive && (
                <span className="ml-2 text-amber-600">（おすすめ順）</span>
              )}
            </p>
            
            {(vacantOnly || isConciergeActive) && (
              <button
                onClick={() => {
                  setVacantOnly(false);
                  clearConciergeFilter();
                }}
                className="text-sm text-blue-600 hover:underline font-bold flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                フィルター解除
              </button>
            )}
          </div>
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
              {isConciergeActive
                ? '条件に合う店舗が見つかりませんでした'
                : vacantOnly 
                  ? '空席ありの店舗が見つかりませんでした'
                  : t('store_list.no_stores')
              }
            </p>
            {(vacantOnly || isConciergeActive) && (
              <button
                onClick={() => {
                  setVacantOnly(false);
                  clearConciergeFilter();
                }}
                className="mt-4 text-amber-500 hover:underline font-bold"
              >
                すべての店舗を表示
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredStores.map((store, index) => {
                const matchScore = getMatchScore(store);
                
                return (
                  <motion.div
                    key={store.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow h-full bg-white relative overflow-hidden"
                      onClick={() => router.push(`/store/${store.id}`)}
                    >
                      {/* マッチ度バッジ - カード内部の右上に配置 */}
                      {isConciergeActive && matchScore > 0 && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                          style={{
                            background: matchScore >= 3 
                              ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                              : 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          }}
                        >
                          <Sparkles className="w-3 h-3" />
                          {matchScore >= 3 ? 'おすすめ' : `${matchScore}マッチ`}
                        </motion.div>
                      )}
                      
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
                            {/* 店舗名 - バッジと重ならないようにpr追加 */}
                            <h3 className={`text-lg font-bold text-card-foreground truncate ${isConciergeActive && matchScore > 0 ? 'pr-20' : ''}`}>
                              {store.name}
                            </h3>
                            
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
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* フローティングボタン群（画面右下） */}
        <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-3 items-end">
          {/* フィルターボタン */}
          <div className="relative filter-menu-container">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFilterMenu(!showFilterMenu);
                  }}
                  className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-manipulation active:scale-95 rounded-lg relative"
                  style={{
                    background: vacantOnly ? '#F59E0B' : 'rgba(5,5,5,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: vacantOnly ? '1px solid #F59E0B' : '1px solid rgba(245,158,11,0.3)',
                    boxShadow: '0 0 20px rgba(245,158,11,0.2)',
                    minWidth: '56px',
                    minHeight: '56px',
                  }}
                  title="フィルター"
                >
                  <Filter 
                    className="w-5 h-5" 
                    style={{ color: vacantOnly ? '#000' : '#F59E0B' }} 
                  />
                  <span 
                    className="text-[10px] font-bold" 
                    style={{ color: vacantOnly ? '#000' : '#F59E0B' }}
                  >
                    絞込
                  </span>
                  {vacantOnly && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </Button>
              </motion.div>
            </motion.div>

            {/* フィルターメニュー */}
            <AnimatePresence>
              {showFilterMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full right-0 mb-2 w-48"
                >
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: 'rgba(30, 30, 30, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div className="p-2">
                      <p className="text-xs text-gray-400 px-3 py-2 font-bold">
                        空席状況で絞り込み
                      </p>
                      
                      <button
                        onClick={() => {
                          setVacantOnly(!vacantOnly);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          vacantOnly 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        <img
                          src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png"
                          alt="空席あり"
                          className="w-5 h-5"
                        />
                        <span className="font-bold text-sm flex-1 text-left">
                          空席あり
                        </span>
                        {vacantOnly && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setVacantOnly(false);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          !vacantOnly 
                            ? 'bg-amber-500/20 text-amber-400' 
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        <span className="w-5 h-5 flex items-center justify-center text-lg">
                          🍺
                        </span>
                        <span className="font-bold text-sm flex-1 text-left">
                          すべて表示
                        </span>
                        {!vacantOnly && (
                          <Check className="w-4 h-4 text-amber-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* マップボタン */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => router.push('/map?refresh=true')}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-manipulation active:scale-95 rounded-lg"
                style={{
                  background: 'rgba(5,5,5,0.7)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  boxShadow: '0 0 20px rgba(245,158,11,0.2)',
                  minWidth: '56px',
                  minHeight: '56px',
                }}
                title="Map"
              >
                <MapIcon className="w-5 h-5" style={{ color: '#F59E0B' }} />
                <span className="text-[10px] font-bold" style={{ color: '#F59E0B' }}>
                  Map
                </span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* コンシェルジュモーダル */}
      <ConciergeModal
        isOpen={showConcierge}
        onClose={() => setShowConcierge(false)}
        onComplete={handleConciergeComplete}
      />
    </div>
  );
}