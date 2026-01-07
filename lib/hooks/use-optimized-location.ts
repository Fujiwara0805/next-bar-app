/**
 * ============================================
 * ファイルパス: lib/hooks/use-optimized-location.ts
 * 
 * 機能: 位置情報取得の最適化フック
 *       - 閾値ベースの更新
 *       - ポーリング方式（watchPosition代替）
 *       - Visibility API対応
 *       - 共通キャッシュ統合
 * ============================================
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { locationCache, type LocationCacheData } from '@/lib/cache';

// ============================================================================
// 定数
// ============================================================================

const DEFAULT_LOCATION = {
  lat: 33.2382,
  lng: 131.6126,
};

const LOCATION_UPDATE_THRESHOLD_METERS = 50;  // 50m以上移動したら更新
const LOCATION_UPDATE_INTERVAL_MS = 30000;    // 30秒間隔でポーリング
const LOCATION_TIMEOUT_MS = 5000;             // 5秒タイムアウト
const SMOOTHING_FACTOR = 0.3;                 // 位置スムージング係数

// ============================================================================
// 型定義
// ============================================================================

export interface GeolocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  timestamp: number;
  isDefault: boolean;
}

interface UseOptimizedLocationOptions {
  enabled?: boolean;
  enablePolling?: boolean;
  pollingInterval?: number;
}

interface UseOptimizedLocationReturn {
  location: GeolocationState | null;
  error: GeolocationPositionError | null;
  isTracking: boolean;
  isInitialized: boolean;
  refreshLocation: () => void;
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

const isDev = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: unknown): void {
  if (isDev) {
    console.log(`[useOptimizedLocation] ${message}`, data ?? '');
  }
}

/**
 * 2点間の距離を計算（メートル）
 */
function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// メインフック
// ============================================================================

export function useOptimizedLocation(
  options: UseOptimizedLocationOptions = {}
): UseOptimizedLocationReturn {
  const {
    enabled = true,
    enablePolling = true,
    pollingInterval = LOCATION_UPDATE_INTERVAL_MS,
  } = options;

  const [location, setLocation] = useState<GeolocationState | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs（useCallback依存を最小化するため）
  const isMountedRef = useRef(true);
  const isVisibleRef = useRef(true);
  const lastUpdateRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const smoothedLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 位置をスムージング
   */
  const smoothPosition = useCallback(
    (lat: number, lng: number): { lat: number; lng: number } => {
      if (!smoothedLocationRef.current) {
        smoothedLocationRef.current = { lat, lng };
        return { lat, lng };
      }

      const smoothedLat =
        smoothedLocationRef.current.lat * (1 - SMOOTHING_FACTOR) +
        lat * SMOOTHING_FACTOR;
      const smoothedLng =
        smoothedLocationRef.current.lng * (1 - SMOOTHING_FACTOR) +
        lng * SMOOTHING_FACTOR;

      smoothedLocationRef.current = { lat: smoothedLat, lng: smoothedLng };
      return { lat: smoothedLat, lng: smoothedLng };
    },
    []
  );

  /**
   * 位置更新が必要かどうかを判定
   */
  const shouldUpdateLocation = useCallback(
    (newLat: number, newLng: number): boolean => {
      if (!lastUpdateRef.current) return true;

      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current.time;
      
      // 時間閾値未満の場合、距離閾値をチェック
      if (timeSinceLastUpdate < pollingInterval) {
        const distance = calculateDistanceMeters(
          lastUpdateRef.current.lat,
          lastUpdateRef.current.lng,
          newLat,
          newLng
        );
        return distance >= LOCATION_UPDATE_THRESHOLD_METERS;
      }

      return true; // 時間閾値を超えていれば更新
    },
    [pollingInterval]
  );

  /**
   * 位置取得成功ハンドラー
   */
  const handlePositionSuccess = useCallback(
    (position: GeolocationPosition) => {
      if (!isMountedRef.current) return;

      const { latitude, longitude, accuracy, heading } = position.coords;

      // 閾値チェック
      if (!shouldUpdateLocation(latitude, longitude)) {
        debugLog('Skipping update (below threshold)');
        return;
      }

      const smoothed = smoothPosition(latitude, longitude);

      // キャッシュ更新
      locationCache.set({
        lat: smoothed.lat,
        lng: smoothed.lng,
        accuracy,
        isDefault: false,
      });

      // 参照更新
      lastUpdateRef.current = {
        lat: smoothed.lat,
        lng: smoothed.lng,
        time: Date.now(),
      };

      // State更新
      setLocation({
        latitude: smoothed.lat,
        longitude: smoothed.lng,
        accuracy,
        heading,
        timestamp: position.timestamp,
        isDefault: false,
      });
      setError(null);

      debugLog('Location updated', { lat: smoothed.lat, lng: smoothed.lng });
    },
    [shouldUpdateLocation, smoothPosition]
  );

  /**
   * 位置取得エラーハンドラー
   */
  const handlePositionError = useCallback(
    (err: GeolocationPositionError) => {
      if (!isMountedRef.current) return;
      
      debugLog('Geolocation error', err.message);
      setError(err);
    },
    []
  );

  /**
   * 単発の位置取得
   */
  const fetchPosition = useCallback(() => {
    if (!navigator.geolocation) {
      debugLog('Geolocation not supported');
      return;
    }

    // バックグラウンド時はスキップ
    if (!isVisibleRef.current) {
      debugLog('Skipping fetch (background)');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: false,
        timeout: LOCATION_TIMEOUT_MS,
        maximumAge: 60000, // 1分のキャッシュを許容
      }
    );
  }, [handlePositionSuccess, handlePositionError]);

  /**
   * 手動で位置をリフレッシュ
   */
  const refreshLocation = useCallback(() => {
    debugLog('Manual refresh triggered');
    fetchPosition();
  }, [fetchPosition]);

  /**
   * 初期化：キャッシュから即座に位置を設定
   */
  useEffect(() => {
    if (!enabled) return;

    const cached = locationCache.get();
    
    if (cached && !cached.isDefault) {
      debugLog('Using cached location', cached);
      
      setLocation({
        latitude: cached.lat,
        longitude: cached.lng,
        accuracy: cached.accuracy || 100,
        heading: null,
        timestamp: cached.timestamp,
        isDefault: false,
      });
      
      smoothedLocationRef.current = { lat: cached.lat, lng: cached.lng };
      lastUpdateRef.current = { 
        lat: cached.lat, 
        lng: cached.lng, 
        time: cached.timestamp 
      };
    } else {
      debugLog('Using default location');
      
      setLocation({
        latitude: DEFAULT_LOCATION.lat,
        longitude: DEFAULT_LOCATION.lng,
        accuracy: 1000,
        heading: null,
        timestamp: Date.now(),
        isDefault: true,
      });
    }

    setIsInitialized(true);
  }, [enabled]);

  /**
   * Visibility API：バックグラウンド時の処理停止
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      debugLog('Visibility changed', isVisibleRef.current);
      
      // フォアグラウンドに戻ったら即座に取得
      if (isVisibleRef.current && enabled) {
        fetchPosition();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, fetchPosition]);

  /**
   * ポーリングベースの位置取得
   */
  useEffect(() => {
    if (!enabled || !enablePolling || !navigator.geolocation) {
      return;
    }

    isMountedRef.current = true;

    // 初回取得（100ms遅延）
    const initialTimer = setTimeout(fetchPosition, 100);

    // ポーリング開始
    setIsTracking(true);
    pollingIntervalRef.current = setInterval(fetchPosition, pollingInterval);

    debugLog('Polling started', { interval: pollingInterval });

    return () => {
      isMountedRef.current = false;
      clearTimeout(initialTimer);
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      setIsTracking(false);
      debugLog('Polling stopped');
    };
  }, [enabled, enablePolling, pollingInterval, fetchPosition]);

  return {
    location,
    error,
    isTracking,
    isInitialized,
    refreshLocation,
  };
}

// ============================================================================
// シンプル版（ポーリングなし、初回取得のみ）
// ============================================================================

export function useSimpleLocation(): {
  location: { lat: number; lng: number } | null;
  isLoading: boolean;
  refreshLocation: () => void;
} {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializedRef = useRef(false);
  const isUpdatingRef = useRef(false);

  const updateLocationInBackground = useCallback(() => {
    if (isUpdatingRef.current || !navigator.geolocation) return;

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
        if (!resolved) {
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
      () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          isUpdatingRef.current = false;
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
  }, [updateLocationInBackground]);

  return {
    location,
    isLoading,
    refreshLocation: updateLocationInBackground,
  };
}

export default useOptimizedLocation;