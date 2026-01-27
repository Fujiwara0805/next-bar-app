/**
 * ============================================
 * ファイルパス: app/(main)/map/page.tsx
 * 
 * 機能: マップページ（スケーラブル改善版）
 *       【最適化】共通キャッシュモジュール統合
 *       【最適化】useStoresフックによる差分更新
 *       【最適化】エラーハンドリング + リトライUI
 *       【最適化】メモリリーク対策
 *       【追加】詳細ボタンのローディング表示
 *       【デザイン】店舗詳細画面統一カラーパレット適用
 * ============================================
 */

'use client';

import { useEffect, useState, Suspense, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, List, ExternalLink, Building2, RefreshCw, Home, Star, AlertCircle, Loader2 } from 'lucide-react';
import { MapView } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useLanguage } from '@/lib/i18n/context';

// ============================================================================
// 共通モジュールのインポート
// ============================================================================

import { 
  locationCache, 
  storesCache, 
  cacheManager,
  type LocationCacheData 
} from '@/lib/cache';

type Store = Database['public']['Tables']['stores']['Row'];

// ============================================================================
// 環境変数・デバッグ設定
// ============================================================================

const isDev = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: unknown): void {
  if (isDev) {
    console.log(`[MapPage] ${message}`, data ?? '');
  }
}

function debugWarn(message: string, data?: unknown): void {
  if (isDev) {
    console.warn(`[MapPage] ${message}`, data ?? '');
  }
}

// ============================================================================
// デザイントークン（店舗詳細画面と統一）
// ============================================================================

const colors = {
  // ベースカラー（60%）- 背景・余白
  background: '#0A1628',        // Deep Navy
  surface: '#162447',           // Midnight Blue
  surfaceLight: '#1F4068',      // Royal Navy
  cardBackground: '#FDFBF7',    // Ivory
  
  // アクセントカラー（10%）- CTA・重要要素
  accent: '#C9A86C',            // Champagne Gold
  accentLight: '#E8D5B7',       // Pale Gold
  accentDark: '#B8956E',        // Antique Gold
  
  // テキストカラー
  text: '#FDFBF7',              // Ivory
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  
  // グラデーション
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  
  // ボーダー・シャドウ
  borderGold: 'rgba(201, 168, 108, 0.3)',
  borderSubtle: 'rgba(201, 168, 108, 0.15)',
  shadowGold: '0 8px 30px rgba(201, 168, 108, 0.4)',
  shadowDeep: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  
  // エラー
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.15)',
  errorBorder: 'rgba(239, 68, 68, 0.3)',
};

// ============================================================================
// 定数
// ============================================================================

const DEFAULT_LOCATION = {
  lat: 33.2382,
  lng: 131.6126,
};

const MAX_RETRY_COUNT = 3;
const BASE_RETRY_DELAY_MS = 1000;
const DEBOUNCE_DELAY_MS = 600;

// 必要なカラムのみ選択（パフォーマンス最適化）
const STORE_SELECT_COLUMNS = `
  id,
  name,
  latitude,
  longitude,
  vacancy_status,
  status_message,
  image_urls,
  google_rating,
  google_reviews_count,
  is_open,
  phone,
  address,
  website_url,
  description,
  business_hours,
  created_at,
  updated_at,
  has_campaign,
  campaign_name,
  campaign_start_date,
  campaign_end_date
`;

// ============================================================================
// 型定義
// ============================================================================

interface ViewportBounds {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
  zoom: number;
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * 指数バックオフ遅延を計算
 */
function calculateRetryDelay(retryCount: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
}

/**
 * Viewport内の店舗のみをフィルタリング
 */
function filterStoresByViewport(
  stores: Store[],
  bounds: ViewportBounds | null,
  padding: number = 0.01
): Store[] {
  if (!bounds) return stores;

  return stores.filter((store) => {
    const lat = Number(store.latitude);
    const lng = Number(store.longitude);

    return (
      lat >= bounds.sw.lat - padding &&
      lat <= bounds.ne.lat + padding &&
      lng >= bounds.sw.lng - padding &&
      lng <= bounds.ne.lng + padding
    );
  });
}

/**
 * BoundsKeyを生成
 */
function generateBoundsKey(bounds: ViewportBounds): string {
  return `${bounds.ne.lat.toFixed(4)},${bounds.ne.lng.toFixed(4)},${bounds.sw.lat.toFixed(4)},${bounds.sw.lng.toFixed(4)},${bounds.zoom}`;
}

// ============================================================================
// 最適化された位置情報取得フック
// ============================================================================

function useOptimizedLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializedRef = useRef(false);
  const isUpdatingRef = useRef(false);
  const isMountedRef = useRef(true);

  const updateLocationInBackground = useCallback(() => {
    if (isUpdatingRef.current || !isMountedRef.current) return;
    if (!navigator.geolocation) {
      locationCache.set({ ...DEFAULT_LOCATION, isDefault: true });
      return;
    }

    isUpdatingRef.current = true;
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        isUpdatingRef.current = false;
      }
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!resolved && isMountedRef.current) {
          resolved = true;
          clearTimeout(timeoutId);
          isUpdatingRef.current = false;

          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setLocation(newLocation);
          locationCache.set({
            lat: newLocation.lat,
            lng: newLocation.lng,
            accuracy: position.coords.accuracy,
            isDefault: false,
          });
        }
      },
      (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          isUpdatingRef.current = false;
          debugWarn('Background location error:', error.message);
          locationCache.set({ ...DEFAULT_LOCATION, isDefault: true });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 2500,
        maximumAge: 300000,
      }
    );
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const cached = locationCache.get();
    if (cached && !cached.isDefault) {
      setLocation({ lat: cached.lat, lng: cached.lng });
      setIsLoading(false);
      updateLocationInBackground();
      return;
    }

    setLocation(DEFAULT_LOCATION);
    setIsLoading(false);
    updateLocationInBackground();

    return () => {
      isMountedRef.current = false;
    };
  }, [updateLocationInBackground]);

  const refreshLocation = useCallback(() => {
    updateLocationInBackground();
  }, [updateLocationInBackground]);

  return { location, isLoading, refreshLocation };
}

// ============================================================================
// 改善版Debounceフック（メモリリーク対策済み）
// ============================================================================

function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // callbackが変わってもタイマーは維持
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// ============================================================================
// 改善版店舗データ取得フック（エラーハンドリング・差分更新対応）
// ============================================================================

interface UseStoresReturn {
  stores: Store[];
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  fetchStores: (forceRefresh?: boolean, boundsKey?: string) => Promise<void>;
  refreshStores: () => Promise<void>;
}

function useStores(): UseStoresReturn {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const isMountedRef = useRef(true);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /**
   * 店舗データを取得
   */
  const fetchStores = useCallback(
    async (forceRefresh: boolean = false, boundsKey?: string): Promise<void> => {
      // キャッシュチェック（強制リフレッシュでなければ）
      if (!forceRefresh) {
        const cached = storesCache.get(boundsKey);
        if (cached) {
          debugLog('Using cached stores', { count: cached.stores.length });
          setStores(cached.stores);
          setIsLoading(false);
          setError(null);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('stores')
          .select(STORE_SELECT_COLUMNS)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (!isMountedRef.current) return;

        const storesData = (data as Store[]) || [];

        debugLog('Fetched stores', { count: storesData.length });

        setStores(storesData);
        storesCache.set(storesData, boundsKey);
        setRetryCount(0);
        setError(null);
      } catch (err) {
        if (!isMountedRef.current) return;

        const errorInstance = err instanceof Error ? err : new Error('Unknown error');
        setError(errorInstance);

        debugWarn('Fetch error', errorInstance.message);

        // 自動リトライ（指数バックオフ）
        if (retryCount < MAX_RETRY_COUNT) {
          const delay = calculateRetryDelay(retryCount);
          debugLog(`Scheduling retry ${retryCount + 1}/${MAX_RETRY_COUNT} in ${delay}ms`);

          retryTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount((prev) => prev + 1);
              fetchStores(forceRefresh, boundsKey);
            }
          }, delay);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [retryCount]
  );

  /**
   * 強制リフレッシュ
   */
  const refreshStores = useCallback(async (): Promise<void> => {
    setRetryCount(0);
    await fetchStores(true);
  }, [fetchStores]);

  /**
   * Realtime変更のハンドラー（差分更新）
   */
  const handleRealtimeChange = useCallback(
    (payload: {
      eventType: string;
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => {
      debugLog('Realtime change detected', payload.eventType);

      switch (payload.eventType) {
        case 'UPDATE': {
          const updatedStore = payload.new as Store;
          setStores((prev) =>
            prev.map((store) =>
              store.id === updatedStore.id ? { ...store, ...updatedStore } : store
            )
          );
          storesCache.updateStore(updatedStore);
          break;
        }

        case 'INSERT': {
          const newStore = payload.new as Store;
          setStores((prev) => [newStore, ...prev]);
          storesCache.addStore(newStore);
          break;
        }

        case 'DELETE': {
          const deletedId = (payload.old as { id: string }).id;
          setStores((prev) => prev.filter((store) => store.id !== deletedId));
          storesCache.removeStore(deletedId);
          break;
        }

        default:
          debugWarn('Unknown event type, fetching all stores');
          fetchStores(true);
      }
    },
    [fetchStores]
  );

  /**
   * マウント時の初期化とRealtime subscription
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Realtime subscription
    channelRef.current = supabase
      .channel('stores-realtime-optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stores',
        },
        handleRealtimeChange
      )
      .subscribe((status) => {
        debugLog('Realtime subscription status', status);
      });

    return () => {
      isMountedRef.current = false;

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [handleRealtimeChange]);

  return {
    stores,
    isLoading,
    error,
    retryCount,
    fetchStores,
    refreshStores,
  };
}

// ============================================================================
// エラー表示コンポーネント
// ============================================================================

interface ErrorBannerProps {
  error: Error;
  retryCount: number;
  onRetry: () => void;
}

function ErrorBanner({ error, retryCount, onRetry }: ErrorBannerProps) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 left-4 right-4 z-50"
    >
      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{
          background: colors.errorBg,
          border: `1px solid ${colors.errorBorder}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.error }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: colors.error }}>
            {t('map.error_fetch_failed')}
          </p>
          {retryCount > 0 && retryCount < MAX_RETRY_COUNT && (
            <p className="text-xs mt-1" style={{ color: `${colors.error}99` }}>
              {t('map.error_retrying').replace('{retryCount}', String(retryCount)).replace('{maxRetryCount}', String(MAX_RETRY_COUNT))}
            </p>
          )}
          {retryCount >= MAX_RETRY_COUNT && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs underline"
              style={{ color: colors.error }}
            >
              {t('map.retry')}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// メインコンポーネント
// ============================================================================

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();

  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentBounds, setCurrentBounds] = useState<ViewportBounds | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const { location: userLocation, refreshLocation } = useOptimizedLocation();
  const { stores, isLoading, error, retryCount, fetchStores, refreshStores } = useStores();

  const isOpenUpdatedRef = useRef(false);
  const lastFetchBoundsRef = useRef<string | null>(null);

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
        debugLog('is_open update result:', result);

        if (result.updated > 0) {
          fetchStores();
        }
      } catch (err) {
        debugWarn('Failed to update is_open:', err);
      }
    };

    updateIsOpenOnce();
  }, [fetchStores]);

  // Debounced bounds change handler
  const handleBoundsChangeInternal = useCallback(
    (bounds: google.maps.LatLngBounds, zoom: number) => {
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      const newBounds: ViewportBounds = {
        ne: { lat: ne.lat(), lng: ne.lng() },
        sw: { lat: sw.lat(), lng: sw.lng() },
        zoom,
      };

      const boundsKey = generateBoundsKey(newBounds);

      // 前回と同じboundsなら何もしない
      if (lastFetchBoundsRef.current === boundsKey) {
        return;
      }

      lastFetchBoundsRef.current = boundsKey;
      setCurrentBounds(newBounds);

      // キャッシュ付きで取得
      fetchStores(false, boundsKey);
    },
    [fetchStores]
  );

  const handleBoundsChange = useDebouncedCallback(handleBoundsChangeInternal, DEBOUNCE_DELAY_MS);

  // LPからの遷移時・初回ロード
  useEffect(() => {
    const shouldRefresh = searchParams?.get('refresh') === 'true';
    const fromLanding = searchParams?.get('from') === 'landing';

    const loadData = async () => {
      if (fromLanding || shouldRefresh) {
        try {
          const res = await fetch('/api/stores/update-is-open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forceUpdate: true }),
          });
          const result = await res.json();
          debugLog('Auto refresh from landing result:', result);
        } catch (err) {
          debugWarn('Failed to auto-refresh is_open:', err);
        }
      }

      await fetchStores(fromLanding || shouldRefresh);

      if (shouldRefresh || fromLanding) {
        router.replace('/map', { scroll: false });
      }
    };

    loadData();
  }, [searchParams, router, fetchStores]);

  // Visibility change handler（バックグラウンド復帰時）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLocation();
        // キャッシュが無効なら取得
        if (storesCache.isExpired()) {
          fetchStores(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshLocation, fetchStores]);

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
      debugLog('Force refresh result:', result);

      await refreshStores();
    } catch (err) {
      debugWarn('Error refreshing:', err);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 500);
    }
  };

  // 詳細ページへの遷移（ローディング付き）
  const handleNavigateToDetail = useCallback((storeId: string) => {
    setIsNavigating(true);
    router.push(`/store/${storeId}`);
  }, [router]);

  // Viewport内の店舗のみをフィルタリング（メモ化）
  const filteredStores = useMemo(() => {
    return filterStoresByViewport(stores, currentBounds);
  }, [stores, currentBounds]);

  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant':
        return t('map.vacant');
      case 'full':
        return t('map.full');
      case 'open':
        return t('map.open');
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
      case 'full':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E6%BA%80%E5%B8%AD_gszsqi.png';
      case 'open':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1767848645/icons8-%E9%96%8B%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-94_a4tmzn.png';
      case 'closed':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761318837/icons8-%E9%96%89%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-100_fczegk.png';
      default:
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png';
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
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
      {/* エラーバナー */}
      <AnimatePresence>
        {error && (
          <ErrorBanner
            error={error}
            retryCount={retryCount}
            onRetry={() => refreshStores()}
          />
        )}
      </AnimatePresence>

      {/* ヘッダー */}
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
                    border: `1px solid ${colors.borderGold}`,
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
                    border: `1px solid ${colors.borderGold}`,
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
                    border: `1px solid ${colors.borderGold}`,
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
        stores={filteredStores}
        center={userLocation || undefined}
        onStoreClick={setSelectedStore}
        onBoundsChange={handleBoundsChange}
      />

      {/* 店舗詳細カード */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-30 safe-bottom touch-manipulation"
          >
            <Card
              className="rounded-t-3xl rounded-b-none border-0 cursor-pointer transition-colors"
              style={{
                background: colors.surface,
                borderTop: `1px solid ${colors.borderGold}`,
              }}
              onClick={() => handleNavigateToDetail(selectedStore.id)}
            >
              <div className="p-4 space-y-3">
                <div className="flex gap-4">
                  {selectedStore.image_urls && selectedStore.image_urls.length > 0 ? (
                    <img
                      src={selectedStore.image_urls[0]}
                      alt={selectedStore.name}
                      className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                      style={{ border: `1px solid ${colors.borderGold}` }}
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
                          setIsNavigating(false);
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
                                fill:
                                  star <= Math.round(selectedStore.google_rating!)
                                    ? colors.accent
                                    : 'transparent',
                                color:
                                  star <= Math.round(selectedStore.google_rating!)
                                    ? colors.accent
                                    : colors.textSubtle,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-bold" style={{ color: colors.text }}>
                          {selectedStore.google_rating.toFixed(1)}
                        </span>
                        {selectedStore.google_reviews_count && (
                          <span className="text-xs" style={{ color: colors.textMuted }}>
                            ({selectedStore.google_reviews_count})
                          </span>
                        )}
                      </div>
                    )}

                    {userLocation && (() => {
                      const distanceKm = calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        Number(selectedStore.latitude),
                        Number(selectedStore.longitude)
                      );
                      const distanceM = Math.round(distanceKm * 1000);
                      const distanceText = distanceM >= 1000 
                        ? `${(distanceKm).toFixed(1)}km` 
                        : `${distanceM}m`;
                      const walkingTime = calculateWalkingTime(distanceKm);
                      return (
                        <p className="text-sm font-bold" style={{ color: colors.textMuted }}>
                          {t('store_detail.walking_time')
                            .replace('{minutes}', String(walkingTime))
                            .replace('{distance}', distanceText)
                          }
                        </p>
                      );
                    })()}

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        selectedStore.name
                      )}`}
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
                      <span className="text-xl font-bold" style={{ color: colors.text }}>
                        {getVacancyLabel(selectedStore.vacancy_status)}
                      </span>
                    </div>

                    {/* キャンペーン情報 */}
                    {selectedStore.has_campaign && selectedStore.campaign_name && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 px-3 py-2 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.accent}10 100%)`,
                          border: `1px solid ${colors.accent}40`,
                        }}
                      >
                        <p className="text-sm font-bold" style={{ color: colors.accent }}>
                          {selectedStore.campaign_name} 🍺
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>

                {selectedStore.status_message && (
                  <div
                    className="pt-2"
                    style={{ borderTop: `1px solid ${colors.borderSubtle}` }}
                  >
                    <p
                      className="text-sm font-bold line-clamp-2"
                      style={{ color: colors.textMuted }}
                    >
                      {selectedStore.status_message}
                    </p>
                  </div>
                )}

                {/* 詳細を見るボタン（ローディング付き） */}
                <motion.button
                  whileHover={{ scale: isNavigating ? 1 : 1.02 }}
                  whileTap={{ scale: isNavigating ? 1 : 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isNavigating) {
                      handleNavigateToDetail(selectedStore.id);
                    }
                  }}
                  disabled={isNavigating}
                  className="w-full py-3.5 px-4 rounded-xl font-bold transition-all touch-manipulation flex items-center justify-center gap-2"
                  style={{
                    background: isNavigating 
                      ? colors.accentDark
                      : colors.goldGradient,
                    color: colors.background,
                    boxShadow: isNavigating 
                      ? 'none'
                      : colors.shadowGold,
                    opacity: isNavigating ? 0.8 : 1,
                    cursor: isNavigating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isNavigating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('common.loading')}</span>
                    </>
                  ) : (
                    t('map.view_details')
                  )}
                </motion.button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 凡例 */}
      <div
        className="fixed bottom-24 left-4 z-20 rounded-xl shadow-lg p-3 safe-bottom pointer-events-auto"
        style={{
          background: `${colors.surface}F0`,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${colors.borderGold}`,
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png"
              alt={t('map.vacant')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: colors.text }}>
              {t('map.vacant')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E6%BA%80%E5%B8%AD_gszsqi.png"
              alt={t('map.full')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: colors.text }}>
              {t('map.full')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1767848645/icons8-%E9%96%8B%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-94_a4tmzn.png"
              alt={t('map.open')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: colors.text }}>
              {t('map.open')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761318837/icons8-%E9%96%89%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-100_fczegk.png"
              alt={t('map.closed')}
              className="w-6 h-6"
            />
            <span className="text-sm font-bold" style={{ color: colors.text }}>
              {t('map.closed')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ローディングフォールバック
// ============================================================================

function MapPageLoading() {
  const { t } = useLanguage();
  return (
    <div
      className="flex items-center justify-center h-screen"
      style={{ background: colors.background }}
    >
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-5">
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${colors.borderGold}` }}
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
          {t('common.loading')}
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