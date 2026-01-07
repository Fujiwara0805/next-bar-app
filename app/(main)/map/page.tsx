/**
 * ============================================
 * ファイルパス: app/(main)/map/page.tsx
 * 
 * 機能: マップページ
 *       【最適化】位置情報取得の高パフォーマンス化
 *       【デザイン】LP統一カラーパレット適用
 * ============================================
 */

'use client';

import { useEffect, useState, Suspense, useRef, useCallback } from 'react';
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

// ============================================================================
// デザイントークン（LP統一）
// ============================================================================

const colors = {
  background: '#2B1F1A',
  surface: '#1C1C1C',
  accent: '#C89B3C',
  accentDark: '#8A6A2F',
  text: '#F2EBDD',
  textMuted: 'rgba(242, 235, 221, 0.6)',
  textSubtle: 'rgba(242, 235, 221, 0.4)',
};

// ============================================================================
// 定数
// ============================================================================

const LOCATION_CACHE_KEY = 'nikenme_user_location';
const LOCATION_CACHE_MAX_AGE = 5 * 60 * 1000; // 5分

const DEFAULT_LOCATION = {
  lat: 33.2382,
  lng: 131.6126,
};

// ============================================================================
// 位置情報キャッシュヘルパー
// ============================================================================

interface LocationCacheData {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
  isDefault?: boolean;
}

function getLocationCache(): LocationCacheData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!data) return null;
    
    const parsed: LocationCacheData = JSON.parse(data);
    const age = Date.now() - parsed.timestamp;
    
    if (age < LOCATION_CACHE_MAX_AGE) {
      return parsed;
    }
    
    return null;
  } catch {
    return null;
  }
}

function setLocationCache(lat: number, lng: number, accuracy?: number, isDefault?: boolean): void {
  if (typeof window === 'undefined') return;
  
  try {
    const data: LocationCacheData = {
      lat,
      lng,
      accuracy,
      timestamp: Date.now(),
      isDefault,
    };
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// ============================================================================
// 最適化された位置情報取得フック（無限ループ修正版）
// ============================================================================

function useOptimizedLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializedRef = useRef(false);
  const isUpdatingRef = useRef(false);

  // バックグラウンドで位置を更新する関数（依存なし）
  const updateLocationInBackground = useCallback(() => {
    if (isUpdatingRef.current) return;
    if (!navigator.geolocation) {
      setLocationCache(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, undefined, true);
      return;
    }

    isUpdatingRef.current = true;

    let resolved = false;

    // 3秒で強制タイムアウト
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        isUpdatingRef.current = false;
        console.log('Location background update timeout');
      }
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          isUpdatingRef.current = false;
          
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          setLocation(newLocation);
          setLocationCache(newLocation.lat, newLocation.lng, position.coords.accuracy, false);
        }
      },
      (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          isUpdatingRef.current = false;
          console.warn('Background location error:', error.message);
          
          // エラー時はデフォルト位置をキャッシュ（現在の位置がなければ）
          setLocationCache(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, undefined, true);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 2500,
        maximumAge: 300000,
      }
    );
  }, []);

  // 初回マウント時のみ実行
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // 1. キャッシュから即座に位置を設定
    const cached = getLocationCache();
    if (cached && !cached.isDefault) {
      setLocation({ lat: cached.lat, lng: cached.lng });
      setIsLoading(false);
      // バックグラウンドで更新を試みる
      updateLocationInBackground();
      return;
    }

    // 2. キャッシュがない場合はデフォルト位置を即座に設定
    setLocation(DEFAULT_LOCATION);
    setIsLoading(false);

    // 3. バックグラウンドで実際の位置を取得
    updateLocationInBackground();
  }, [updateLocationInBackground]);

  // 強制リフレッシュ関数
  const refreshLocation = useCallback(() => {
    updateLocationInBackground();
  }, [updateLocationInBackground]);

  return { location, isLoading, refreshLocation };
}

// ============================================================================
// メインコンポーネント
// ============================================================================

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 最適化された位置情報フック
  const { location: userLocation, refreshLocation } = useOptimizedLocation();

  // 初回ロード完了フラグ（is_open更新の重複防止）
  const isOpenUpdatedRef = useRef(false);

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

        if (result.updated > 0) {
          fetchStoresOnly();
        }
      } catch (err) {
        console.warn('Failed to update is_open:', err);
      }
    };

    updateIsOpenOnce();
  }, []);

  // LPからの遷移時に自動でデータ取得を行う
  useEffect(() => {
    const shouldRefresh = searchParams?.get('refresh') === 'true';
    const fromLanding = searchParams?.get('from') === 'landing';
    
    const loadData = async () => {
      setLoading(true);
      
      if (fromLanding || shouldRefresh) {
        try {
          const res = await fetch('/api/stores/update-is-open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forceUpdate: true }),
          });
          const result = await res.json();
          console.log('Auto refresh from landing result:', result);
        } catch (err) {
          console.warn('Failed to auto-refresh is_open:', err);
        }
      }
      
      await fetchStoresOnly();
      
      if (shouldRefresh || fromLanding) {
        router.replace('/map', { scroll: false });
      }
    };
    
    loadData();

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
  }, [searchParams, router]);

  // ページ復帰時の処理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLocation();
        fetchStoresOnly();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshLocation]);

  const fetchStoresOnly = async () => {
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

  // 更新ボタン押下時
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      refreshLocation();

      const res = await fetch('/api/stores/update-is-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceUpdate: true }),
      });
      const result = await res.json();
      console.log('Force refresh result:', result);

      await fetchStoresOnly();
    } catch (error) {
      console.error('Error refreshing:', error);
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

  return (
    <div 
      className="relative h-screen flex flex-col touch-manipulation"
      style={{ background: colors.background }}
    >
      {/* ヘッダー（LP統一デザイン） */}
      <header className="absolute top-0 left-0 right-0 z-10 pt-4 sm:pt-6 px-3 sm:px-4 safe-top pointer-events-none">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full"
        >
          <div className="flex items-center justify-end">
            <div className="flex flex-col gap-3 pointer-events-auto">
              {/* ホームボタン */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center"
              >
                <Button
                  onClick={() => router.push('/landing')}
                  className="flex flex-col items-center justify-center gap-1 px-3 py-2 mt-12 touch-manipulation active:scale-95 rounded-xl"
                  style={{
                    background: colors.surface,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${colors.accentDark}60`,
                    boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 15px ${colors.accent}15`,
                    minWidth: '56px',
                    minHeight: '56px',
                  }}
                  title={t('map.home')}
                >
                  <Home className="w-5 h-5" style={{ color: colors.accent }} />
                  <span className="text-[10px] font-bold" style={{ color: colors.accent }}>
                    {t('map.home')}
                  </span>
                </Button>
              </motion.div>

              {/* リストボタン */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center"
              >
                <Button
                  onClick={() => router.push('/store-list')}
                  className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-manipulation active:scale-95 rounded-xl"
                  style={{
                    background: colors.surface,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${colors.accentDark}60`,
                    boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 15px ${colors.accent}15`,
                    minWidth: '56px',
                    minHeight: '56px',
                  }}
                  title={t('map.store_list')}
                >
                  <List className="w-5 h-5" style={{ color: colors.accent }} />
                  <span className="text-[10px] font-bold" style={{ color: colors.accent }}>
                    {t('map.store_list')}
                  </span>
                </Button>
              </motion.div>

              {/* 更新ボタン */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center"
              >
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-manipulation active:scale-95 rounded-xl"
                  style={{
                    background: colors.surface,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${colors.accentDark}60`,
                    boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 15px ${colors.accent}15`,
                    minWidth: '56px',
                    minHeight: '56px',
                    opacity: refreshing ? 0.6 : 1,
                  }}
                  title={t('map.refresh')}
                >
                  <RefreshCw 
                    className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
                    style={{ color: colors.accent }}
                  />
                  <span className="text-[10px] font-bold" style={{ color: colors.accent }}>
                    {t('map.refresh')}
                  </span>
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

      {/* 店舗詳細カード（LP統一デザイン） */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-30 safe-bottom touch-manipulation"
          >
            <Card 
              className="rounded-t-3xl rounded-b-none border-0 cursor-pointer transition-colors"
              style={{
                background: colors.surface,
                borderTop: `1px solid ${colors.accentDark}40`,
              }}
              onClick={() => router.push(`/store/${selectedStore.id}`)}
            >
              <div className="p-4 space-y-3">
                <div className="flex gap-4">
                  {selectedStore.image_urls && selectedStore.image_urls.length > 0 ? (
                    <img
                      src={selectedStore.image_urls[0]}
                      alt={selectedStore.name}
                      className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                      style={{ border: `1px solid ${colors.accentDark}40` }}
                    />
                  ) : (
                    <div 
                      className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: colors.background }}
                    >
                      <Building2 className="w-12 h-12" style={{ color: colors.textMuted }} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 
                        className="font-bold text-lg line-clamp-1"
                        style={{ color: colors.text }}
                      >
                        {selectedStore.name}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 -mt-1"
                        style={{ color: colors.textMuted }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStore(null);
                        }}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    {selectedStore.google_rating && (
                      <div className="flex items-center gap-2 -mt-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= Math.round(selectedStore.google_rating!)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-600'
                              }`}
                              style={{
                                fill: star <= Math.round(selectedStore.google_rating!) ? colors.accent : 'transparent',
                                color: star <= Math.round(selectedStore.google_rating!) ? colors.accent : colors.textSubtle,
                              }}
                            />
                          ))}
                        </div>
                        <span 
                          className="text-sm font-bold"
                          style={{ color: colors.text }}
                        >
                          {selectedStore.google_rating.toFixed(1)}
                        </span>
                        {selectedStore.google_reviews_count && (
                          <span 
                            className="text-xs"
                            style={{ color: colors.textMuted }}
                          >
                            ({selectedStore.google_reviews_count})
                          </span>
                        )}
                      </div>
                    )}

                    {userLocation && (
                      <p 
                        className="text-sm font-bold"
                        style={{ color: colors.textMuted }}
                      >
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
                      className="inline-flex items-center gap-1 text-sm hover:underline font-bold"
                      style={{ color: colors.accent }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('map.open_in_google_maps')}
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <div className="flex items-center gap-2 pt-1">
                      <img
                        src={getVacancyIcon(selectedStore.vacancy_status)}
                        alt={getVacancyLabel(selectedStore.vacancy_status)}
                        className="w-6 h-6"
                      />
                      <span 
                        className="text-xl font-bold"
                        style={{ color: colors.text }}
                      >
                        {getVacancyLabel(selectedStore.vacancy_status)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedStore.status_message && (
                  <div 
                    className="pt-2"
                    style={{ borderTop: `1px solid ${colors.accentDark}30` }}
                  >
                    <p 
                      className="text-sm font-bold line-clamp-2"
                      style={{ color: colors.textMuted }}
                    >
                      {selectedStore.status_message}
                    </p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/store/${selectedStore.id}`);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl font-bold transition-colors touch-manipulation"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
                    color: colors.background,
                    boxShadow: `0 4px 15px ${colors.accent}30`,
                  }}
                >
                  {t('map.view_details')}
                </motion.button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 凡例（LP統一デザイン） */}
      <div 
        className="fixed bottom-24 left-4 z-20 rounded-xl shadow-lg p-3 safe-bottom pointer-events-auto"
        style={{
          background: `${colors.surface}F0`,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${colors.accentDark}40`,
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png"
              alt={t('map.vacant')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: colors.text }}>{t('map.vacant')}</span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311676/%E3%82%84%E3%82%84%E6%B7%B7%E9%9B%91_qjfizb.png"
              alt={t('map.moderate')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: colors.text }}>{t('map.moderate')}</span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E6%BA%80%E5%B8%AD_gszsqi.png"
              alt={t('map.full')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: colors.text }}>{t('map.full')}</span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761318837/icons8-%E9%96%89%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-100_fczegk.png"
              alt={t('map.closed')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: colors.text }}>{t('map.closed')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ローディングフォールバック（LP統一デザイン）
// ============================================================================

function MapPageLoading() {
  return (
    <div 
      className="flex items-center justify-center h-screen"
      style={{ background: colors.background }}
    >
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-5">
          <div 
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${colors.accentDark}40` }}
          />
          <div 
            className="absolute inset-0 rounded-full animate-spin"
            style={{ 
              border: '2px solid transparent',
              borderTopColor: colors.accent,
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{ background: colors.accent }}
          />
        </div>
        <p style={{ color: colors.textMuted }} className="text-sm font-medium">
          読み込み中...
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// エクスポート
// ============================================================================

export default function MapPage() {
  return (
    <Suspense fallback={<MapPageLoading />}>
      <MapPageContent />
    </Suspense>
  );
}