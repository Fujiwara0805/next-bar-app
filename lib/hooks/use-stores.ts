/**
 * ============================================
 * ファイルパス: lib/hooks/use-stores.ts
 * 
 * 機能: 店舗データ取得の最適化フック
 *       - 必要カラムのみ選択
 *       - エラーハンドリング + 指数バックオフリトライ
 *       - Realtime差分更新
 *       - キャッシュ統合
 * ============================================
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { storesCache } from '@/lib/cache';
import type { Database } from '@/lib/supabase/types';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Store = Database['public']['Tables']['stores']['Row'];

// ============================================================================
// 定数
// ============================================================================

const MAX_RETRY_COUNT = 3;
const BASE_RETRY_DELAY_MS = 1000;

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
  updated_at
` as const;

// ============================================================================
// 型定義
// ============================================================================

interface UseStoresOptions {
  enableRealtime?: boolean;
  autoFetch?: boolean;
}

interface UseStoresReturn {
  stores: Store[];
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  fetchStores: (forceRefresh?: boolean, boundsKey?: string) => Promise<void>;
  refreshStores: () => Promise<void>;
  updateLocalStore: (store: Store) => void;
}

type StorePayload = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
}>;

// ============================================================================
// ユーティリティ関数
// ============================================================================

const isDev = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: unknown): void {
  if (isDev) {
    console.log(`[useStores] ${message}`, data ?? '');
  }
}

function debugWarn(message: string, data?: unknown): void {
  if (isDev) {
    console.warn(`[useStores] ${message}`, data ?? '');
  }
}

/**
 * 指数バックオフ遅延を計算
 */
function calculateRetryDelay(retryCount: number): number {
  return BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
}

// ============================================================================
// メインフック
// ============================================================================

export function useStores(options: UseStoresOptions = {}): UseStoresReturn {
  const { enableRealtime = true, autoFetch = true } = options;

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
  const fetchStores = useCallback(async (
    forceRefresh: boolean = false,
    boundsKey?: string
  ): Promise<void> => {
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
            setRetryCount(prev => prev + 1);
            fetchStores(forceRefresh, boundsKey);
          }
        }, delay);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [retryCount]);

  /**
   * 強制リフレッシュ
   */
  const refreshStores = useCallback(async (): Promise<void> => {
    setRetryCount(0);
    await fetchStores(true);
  }, [fetchStores]);

  /**
   * ローカルの店舗データを更新（UIの即時反映用）
   */
  const updateLocalStore = useCallback((updatedStore: Store): void => {
    setStores(prev => 
      prev.map(store => 
        store.id === updatedStore.id ? updatedStore : store
      )
    );
    storesCache.updateStore(updatedStore);
  }, []);

  /**
   * Realtime変更のハンドラー（差分更新）
   */
  const handleRealtimeChange = useCallback((payload: StorePayload): void => {
    debugLog('Realtime change detected', payload.eventType);

    switch (payload.eventType) {
      case 'UPDATE': {
        const updatedStore = payload.new as Store;
        setStores(prev => 
          prev.map(store => 
            store.id === updatedStore.id ? { ...store, ...updatedStore } : store
          )
        );
        storesCache.updateStore(updatedStore);
        break;
      }

      case 'INSERT': {
        const newStore = payload.new as Store;
        setStores(prev => [newStore, ...prev]);
        storesCache.addStore(newStore);
        break;
      }

      case 'DELETE': {
        const deletedId = (payload.old as { id: string }).id;
        setStores(prev => prev.filter(store => store.id !== deletedId));
        storesCache.removeStore(deletedId);
        break;
      }

      default:
        // 不明なイベントの場合のみ全取得
        debugWarn('Unknown event type, fetching all stores');
        fetchStores(true);
    }
  }, [fetchStores]);

  /**
   * 初回マウント時のデータ取得
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (autoFetch) {
      fetchStores();
    }

    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [autoFetch, fetchStores]);

  /**
   * Realtime subscription
   */
  useEffect(() => {
    if (!enableRealtime) return;

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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enableRealtime, handleRealtimeChange]);

  return {
    stores,
    isLoading,
    error,
    retryCount,
    fetchStores,
    refreshStores,
    updateLocalStore,
  };
}

// ============================================================================
// Viewport フィルタリングユーティリティ
// ============================================================================

interface ViewportBounds {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
}

/**
 * Viewport内の店舗のみをフィルタリング
 * @param stores - 全店舗データ
 * @param bounds - Viewport範囲
 * @param padding - 余白（度数、約0.01 = 1km）
 */
export function filterStoresByViewport(
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
 * Bounds KeyをViewportから生成
 */
export function generateBoundsKey(bounds: ViewportBounds, zoom: number): string {
  return `${bounds.ne.lat.toFixed(4)},${bounds.ne.lng.toFixed(4)},${bounds.sw.lat.toFixed(4)},${bounds.sw.lng.toFixed(4)},${zoom}`;
}

export default useStores;