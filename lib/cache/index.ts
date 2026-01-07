/**
 * ============================================
 * ファイルパス: lib/cache/index.ts
 * 
 * 機能: キャッシュユーティリティの共通化
 *       - 位置情報キャッシュ
 *       - 店舗データキャッシュ
 *       - コンパス許可キャッシュ
 *       【更新】1時間のキャッシュ有効期限管理
 * ============================================
 */

import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

// ============================================================================
// 定数
// ============================================================================

const CACHE_KEYS = {
  LOCATION: 'nikenme_user_location',
  STORES: 'nikenme_stores_cache',
  COMPASS: 'nikenme_compass_permission',
} as const;

// 【更新】全キャッシュを1時間（3600000ms）に統一
const CACHE_MAX_AGE = {
  LOCATION: 60 * 60 * 1000,   // 1時間
  STORES: 60 * 1000,          // 1分（店舗データはリアルタイム性が重要）
  COMPASS: 60 * 60 * 1000,    // 1時間
} as const;

// ============================================================================
// 型定義
// ============================================================================

export interface LocationCacheData {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
  isDefault?: boolean;
}

export interface StoresCacheData {
  stores: Store[];
  timestamp: number;
  boundsKey?: string;
}

export interface CompassCacheData {
  granted: boolean;
  enabled: boolean;
  timestamp: number;
}

// ============================================================================
// 汎用キャッシュヘルパー
// ============================================================================

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function safeGetItem<T>(key: string): T | null {
  if (!isClient()) return null;
  
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

function safeSetItem<T>(key: string, data: T): boolean {
  if (!isClient()) return false;
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key: string): void {
  if (!isClient()) return;
  
  try {
    localStorage.removeItem(key);
  } catch {
    // Silent fail
  }
}

/**
 * キャッシュの有効期限をチェック
 * @param timestamp キャッシュのタイムスタンプ
 * @param maxAge 最大有効期間（ミリ秒）
 * @returns 期限切れならtrue
 */
function isCacheExpired(timestamp: number, maxAge: number): boolean {
  return Date.now() - timestamp >= maxAge;
}

// ============================================================================
// 位置情報キャッシュ（1時間TTL）
// ============================================================================

export const locationCache = {
  get(): LocationCacheData | null {
    const data = safeGetItem<LocationCacheData>(CACHE_KEYS.LOCATION);
    if (!data) return null;
    
    // 1時間経過していたらキャッシュを破棄
    if (isCacheExpired(data.timestamp, CACHE_MAX_AGE.LOCATION)) {
      this.clear();
      return null;
    }
    
    return data;
  },

  set(location: Omit<LocationCacheData, 'timestamp'>): boolean {
    return safeSetItem(CACHE_KEYS.LOCATION, {
      ...location,
      timestamp: Date.now(),
    });
  },

  clear(): void {
    safeRemoveItem(CACHE_KEYS.LOCATION);
  },

  isExpired(): boolean {
    const data = safeGetItem<LocationCacheData>(CACHE_KEYS.LOCATION);
    if (!data) return true;
    return isCacheExpired(data.timestamp, CACHE_MAX_AGE.LOCATION);
  },

  /**
   * キャッシュの残り有効時間を取得（ミリ秒）
   */
  getRemainingTime(): number {
    const data = safeGetItem<LocationCacheData>(CACHE_KEYS.LOCATION);
    if (!data) return 0;
    
    const elapsed = Date.now() - data.timestamp;
    const remaining = CACHE_MAX_AGE.LOCATION - elapsed;
    return Math.max(0, remaining);
  },

  /**
   * キャッシュのタイムスタンプを取得
   */
  getTimestamp(): number | null {
    const data = safeGetItem<LocationCacheData>(CACHE_KEYS.LOCATION);
    return data?.timestamp || null;
  },
};

// ============================================================================
// 店舗データキャッシュ
// ============================================================================

export const storesCache = {
  get(boundsKey?: string): StoresCacheData | null {
    const data = safeGetItem<StoresCacheData>(CACHE_KEYS.STORES);
    if (!data) return null;
    
    if (isCacheExpired(data.timestamp, CACHE_MAX_AGE.STORES)) {
      this.clear();
      return null;
    }
    
    // boundsKeyが指定されていて、異なる場合はnull
    if (boundsKey && data.boundsKey !== boundsKey) {
      return null;
    }
    
    return data;
  },

  set(stores: Store[], boundsKey?: string): boolean {
    return safeSetItem(CACHE_KEYS.STORES, {
      stores,
      boundsKey,
      timestamp: Date.now(),
    });
  },

  /**
   * 単一店舗を更新（差分更新用）
   */
  updateStore(updatedStore: Store): boolean {
    const data = this.get();
    if (!data) return false;
    
    const updatedStores = data.stores.map(store =>
      store.id === updatedStore.id ? updatedStore : store
    );
    
    return safeSetItem(CACHE_KEYS.STORES, {
      ...data,
      stores: updatedStores,
      timestamp: Date.now(),
    });
  },

  /**
   * 店舗を追加（差分更新用）
   */
  addStore(newStore: Store): boolean {
    const data = this.get();
    const stores = data ? [newStore, ...data.stores] : [newStore];
    
    return safeSetItem(CACHE_KEYS.STORES, {
      stores,
      boundsKey: data?.boundsKey,
      timestamp: Date.now(),
    });
  },

  /**
   * 店舗を削除（差分更新用）
   */
  removeStore(storeId: string): boolean {
    const data = this.get();
    if (!data) return false;
    
    const filteredStores = data.stores.filter(store => store.id !== storeId);
    
    return safeSetItem(CACHE_KEYS.STORES, {
      ...data,
      stores: filteredStores,
      timestamp: Date.now(),
    });
  },

  clear(): void {
    safeRemoveItem(CACHE_KEYS.STORES);
  },

  isExpired(): boolean {
    const data = safeGetItem<StoresCacheData>(CACHE_KEYS.STORES);
    if (!data) return true;
    return isCacheExpired(data.timestamp, CACHE_MAX_AGE.STORES);
  },
};

// ============================================================================
// コンパス許可キャッシュ（1時間TTL）
// ============================================================================

export const compassCache = {
  get(): CompassCacheData | null {
    const data = safeGetItem<CompassCacheData>(CACHE_KEYS.COMPASS);
    if (!data) return null;
    
    // 1時間経過していたらキャッシュを破棄
    if (isCacheExpired(data.timestamp, CACHE_MAX_AGE.COMPASS)) {
      this.clear();
      return null;
    }
    
    return data;
  },

  set(granted: boolean, enabled: boolean): boolean {
    return safeSetItem(CACHE_KEYS.COMPASS, {
      granted,
      enabled,
      timestamp: Date.now(),
    });
  },

  clear(): void {
    safeRemoveItem(CACHE_KEYS.COMPASS);
  },

  isExpired(): boolean {
    const data = safeGetItem<CompassCacheData>(CACHE_KEYS.COMPASS);
    if (!data) return true;
    return isCacheExpired(data.timestamp, CACHE_MAX_AGE.COMPASS);
  },

  /**
   * キャッシュの残り有効時間を取得（ミリ秒）
   */
  getRemainingTime(): number {
    const data = safeGetItem<CompassCacheData>(CACHE_KEYS.COMPASS);
    if (!data) return 0;
    
    const elapsed = Date.now() - data.timestamp;
    const remaining = CACHE_MAX_AGE.COMPASS - elapsed;
    return Math.max(0, remaining);
  },
};

// ============================================================================
// キャッシュ全体の操作
// ============================================================================

export const cacheManager = {
  /**
   * 全キャッシュをクリア
   */
  clearAll(): void {
    locationCache.clear();
    storesCache.clear();
    compassCache.clear();
  },

  /**
   * 期限切れキャッシュのみクリア
   */
  clearExpired(): void {
    if (locationCache.isExpired()) locationCache.clear();
    if (storesCache.isExpired()) storesCache.clear();
    if (compassCache.isExpired()) compassCache.clear();
  },

  /**
   * キャッシュの有効期限情報を取得
   */
  getCacheStatus(): {
    location: { expired: boolean; remainingMs: number };
    compass: { expired: boolean; remainingMs: number };
    stores: { expired: boolean };
  } {
    return {
      location: {
        expired: locationCache.isExpired(),
        remainingMs: locationCache.getRemainingTime(),
      },
      compass: {
        expired: compassCache.isExpired(),
        remainingMs: compassCache.getRemainingTime(),
      },
      stores: {
        expired: storesCache.isExpired(),
      },
    };
  },
};

export default {
  location: locationCache,
  stores: storesCache,
  compass: compassCache,
  manager: cacheManager,
};
