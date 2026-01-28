/**
 * ============================================
 * ファイルパス: components/map/map-view.tsx
 * 
 * 機能: マップビューコンポーネント（フリッカー解消版）
 *       【修正】マーカーインスタンス再利用による点滅防止
 *       【修正】Google純正ライクな現在地マーカー（青いドット）
 *       【修正】初期描画時のカメラ位置即時設定
 *       【デザイン】店舗詳細画面統一カラーパレット適用
 *       【修正】マップカラーをネイビー系に調整
 *       【修正】1時間キャッシュ有効期限管理
 *       【最適化】メモリリーク対策強化
 * ============================================
 */

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Database } from '@/lib/supabase/types';

// ============================================================================
// 共通モジュールのインポート
// ============================================================================

import { locationCache, compassCache, cacheManager } from '@/lib/cache';
import { useLanguage } from '@/lib/i18n/context';

type Store = Database['public']['Tables']['stores']['Row'];

// ============================================================================
// 環境変数・デバッグ設定
// ============================================================================

const isDev = process.env.NODE_ENV === 'development';

function debugLog(message: string, data?: unknown): void {
  if (isDev) {
    console.log(`[MapView] ${message}`, data ?? '');
  }
}

function debugWarn(message: string, data?: unknown): void {
  if (isDev) {
    console.warn(`[MapView] ${message}`, data ?? '');
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
  
  // Google純正マーカー用カラー
  googleBlue: '#4285F4',
  googleBlueDark: '#1A73E8',
  white: '#FFFFFF',
};

// ============================================================================
// 型定義
// ============================================================================

interface MapViewProps {
  stores: Store[];
  center?: { lat: number; lng: number };
  onStoreClick?: (store: Store) => void;
  enableLocationTracking?: boolean;
  enableCompass?: boolean;
  onBoundsChange?: (bounds: google.maps.LatLngBounds, zoom: number) => void;
}

interface GeolocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  timestamp: number;
  isDefault?: boolean;
}

interface DeviceOrientationState {
  alpha: number;
  permissionGranted: boolean;
  isSupported: boolean;
}

// マーカー管理用の型
interface StoreMarkerData {
  marker: google.maps.Marker;
  touchArea: google.maps.Circle;
  lastStatus: string;
  lastPosition: { lat: number; lng: number };
}

// ============================================================================
// 定数
// ============================================================================

const DEFAULT_LOCATION = {
  lat: 33.2382,
  lng: 131.6126,
};

// 位置情報更新の閾値設定（API最適化）
const LOCATION_UPDATE_THRESHOLD_METERS = 50;
const LOCATION_UPDATE_INTERVAL_MS = 30000;
const BOUNDS_CHANGE_DEBOUNCE_MS = 600;

// 1時間キャッシュ有効期限（ミリ秒）
const CACHE_TTL_MS = 60 * 60 * 1000;

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * 2点間の距離を計算（メートル）
 */
function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
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

/**
 * マーカーアイコンURLを取得
 */
function getMarkerIconUrl(status: string): string {
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
}

// ============================================================================
// カスタムフック: useOptimizedGeolocation（1時間キャッシュ対応版）
// ============================================================================

function useOptimizedGeolocation(enabled: boolean = true) {
  const [location, setLocation] = useState<GeolocationState | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs（メモリリーク対策：依存配列を最小化）
  const isMountedRef = useRef(true);
  const lastUpdateRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);
  const smoothedLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const cacheCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const SMOOTHING_FACTOR = 0.3;

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
        smoothedLocationRef.current.lat * (1 - SMOOTHING_FACTOR) + lat * SMOOTHING_FACTOR;
      const smoothedLng =
        smoothedLocationRef.current.lng * (1 - SMOOTHING_FACTOR) + lng * SMOOTHING_FACTOR;

      smoothedLocationRef.current = { lat: smoothedLat, lng: smoothedLng };
      return { lat: smoothedLat, lng: smoothedLng };
    },
    []
  );

  /**
   * 位置更新が必要かどうかを判定
   */
  const shouldUpdateLocation = useCallback((newLat: number, newLng: number): boolean => {
    if (!lastUpdateRef.current) return true;

    const timeSinceLastUpdate = Date.now() - lastUpdateRef.current.time;
    if (timeSinceLastUpdate < LOCATION_UPDATE_INTERVAL_MS) {
      const distance = calculateDistanceMeters(
        lastUpdateRef.current.lat,
        lastUpdateRef.current.lng,
        newLat,
        newLng
      );
      return distance >= LOCATION_UPDATE_THRESHOLD_METERS;
    }

    return true;
  }, []);

  /**
   * 位置取得成功時のハンドラー（Ref経由で最新の関数を参照）
   */
  const handlePositionSuccessRef = useRef<(position: GeolocationPosition) => void>();
  
  handlePositionSuccessRef.current = (position: GeolocationPosition) => {
    if (!isMountedRef.current) return;

    const { latitude, longitude, accuracy, heading } = position.coords;

    if (!shouldUpdateLocation(latitude, longitude)) {
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

    lastUpdateRef.current = {
      lat: smoothed.lat,
      lng: smoothed.lng,
      time: Date.now(),
    };

    setLocation({
      latitude: smoothed.lat,
      longitude: smoothed.lng,
      accuracy,
      heading,
      timestamp: position.timestamp,
      isDefault: false,
    });
    setError(null);
  };

  /**
   * キャッシュの有効期限をチェックし、期限切れなら再取得
   */
  const checkCacheExpiry = useCallback(() => {
    if (locationCache.isExpired()) {
      debugLog('Location cache expired (1 hour TTL), clearing and refetching...');
      locationCache.clear();
      
      // 再取得をトリガー
      if (navigator.geolocation && isMountedRef.current) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            handlePositionSuccessRef.current?.(position);
          },
          (err) => {
            debugWarn('Geolocation refetch error:', err.message);
          },
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 0,
          }
        );
      }
    }
  }, []);

  /**
   * 初期位置の即座取得（キャッシュ優先、1時間TTLチェック）
   */
  useEffect(() => {
    if (!enabled) return;

    // 1時間TTLチェック
    cacheManager.clearExpired();

    const cached = locationCache.get();
    if (cached && !cached.isDefault) {
      debugLog('Using cached location (within 1 hour TTL)', cached);
      setLocation({
        latitude: cached.lat,
        longitude: cached.lng,
        accuracy: cached.accuracy || 100,
        heading: null,
        timestamp: cached.timestamp,
        isDefault: cached.isDefault,
      });
      smoothedLocationRef.current = { lat: cached.lat, lng: cached.lng };
      lastUpdateRef.current = { lat: cached.lat, lng: cached.lng, time: cached.timestamp };
      setIsInitialized(true);
    } else {
      debugLog('No valid cache, using default location');
      setLocation({
        latitude: DEFAULT_LOCATION.lat,
        longitude: DEFAULT_LOCATION.lng,
        accuracy: 1000,
        heading: null,
        timestamp: Date.now(),
        isDefault: true,
      });
      setIsInitialized(true);
    }
  }, [enabled]);

  /**
   * 定期的なキャッシュ有効期限チェック（10分ごと）
   */
  useEffect(() => {
    if (!enabled) return;

    cacheCheckIntervalRef.current = setInterval(checkCacheExpiry, 10 * 60 * 1000);

    return () => {
      if (cacheCheckIntervalRef.current) {
        clearInterval(cacheCheckIntervalRef.current);
        cacheCheckIntervalRef.current = null;
      }
    };
  }, [enabled, checkCacheExpiry]);

  /**
   * Visibility APIでバックグラウンド時の取得を停止
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      
      // フォアグラウンドに戻った時にキャッシュ有効期限をチェック
      if (isVisibleRef.current) {
        checkCacheExpiry();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkCacheExpiry]);

  /**
   * ポーリングベースの位置取得
   */
  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      return;
    }

    isMountedRef.current = true;

    const fetchPosition = () => {
      if (!isVisibleRef.current || !isMountedRef.current) return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          handlePositionSuccessRef.current?.(position);
        },
        (err) => {
          if (isMountedRef.current) {
            debugWarn('Geolocation error:', err.message);
            setError(err);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
        }
      );
    };

    // 初回取得
    const initialTimer = setTimeout(fetchPosition, 100);

    // ポーリング開始
    setIsTracking(true);
    pollingIntervalRef.current = setInterval(fetchPosition, LOCATION_UPDATE_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initialTimer);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsTracking(false);
    };
  }, [enabled]);

  return { location, error, isTracking, isInitialized };
}

// ============================================================================
// カスタムフック: useDeviceOrientation（1時間キャッシュ対応版）
// ============================================================================

function useDeviceOrientation(enabled: boolean = true) {
  const [orientation, setOrientation] = useState<DeviceOrientationState>({
    alpha: 0,
    permissionGranted: false,
    isSupported: false,
  });
  const [needsPermission, setNeedsPermission] = useState(false);

  const smoothedAlphaRef = useRef<number>(0);
  const ALPHA_SMOOTHING = 0.15;

  const angleDifference = useCallback((current: number, target: number): number => {
    let diff = target - current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  }, []);

  const smoothAlpha = useCallback(
    (newAlpha: number): number => {
      const diff = angleDifference(smoothedAlphaRef.current, newAlpha);
      const smoothed = smoothedAlphaRef.current + diff * ALPHA_SMOOTHING;

      let normalized = smoothed % 360;
      if (normalized < 0) normalized += 360;

      smoothedAlphaRef.current = normalized;
      return normalized;
    },
    [angleDifference]
  );

  // Ref経由でハンドラーを参照
  const handleOrientationRef = useRef<(event: DeviceOrientationEvent) => void>();
  
  handleOrientationRef.current = (event: DeviceOrientationEvent) => {
    let alpha = 0;

    if ('webkitCompassHeading' in event) {
      alpha = (event as DeviceOrientationEvent & { webkitCompassHeading: number })
        .webkitCompassHeading;
    } else if (event.alpha !== null) {
      alpha = (360 - event.alpha) % 360;
    }

    const smoothedAlpha = smoothAlpha(alpha);

    setOrientation((prev) => ({
      ...prev,
      alpha: smoothedAlpha,
    }));
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function'
    ) {
      try {
        const permission = await (
          DeviceOrientationEvent as unknown as {
            requestPermission: () => Promise<string>;
          }
        ).requestPermission();

        if (permission === 'granted') {
          setOrientation((prev) => ({ ...prev, permissionGranted: true }));
          setNeedsPermission(false);
          return true;
        }
      } catch (err) {
        debugWarn('DeviceOrientation permission error:', err);
      }
      return false;
    }
    setOrientation((prev) => ({ ...prev, permissionGranted: true }));
    return true;
  }, []);

  const setPermissionGranted = useCallback((granted: boolean) => {
    setOrientation((prev) => ({ ...prev, permissionGranted: granted }));
    setNeedsPermission(false);
  }, []);

  // 初期化時にキャッシュから状態を復元（1時間TTLチェック）
  useEffect(() => {
    if (!enabled) return;

    // 1時間TTLチェック
    if (compassCache.isExpired()) {
      debugLog('Compass cache expired (1 hour TTL), clearing...');
      compassCache.clear();
    }

    const isSupported = typeof DeviceOrientationEvent !== 'undefined';
    setOrientation((prev) => ({ ...prev, isSupported }));

    if (!isSupported) return;

    const needsRequest =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function';

    const handleOrientation = (event: DeviceOrientationEvent) => {
      handleOrientationRef.current?.(event);
    };

    if (needsRequest) {
      setNeedsPermission(true);
    } else {
      setOrientation((prev) => ({ ...prev, permissionGranted: true }));
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [enabled]);

  useEffect(() => {
    if (orientation.permissionGranted && enabled) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        handleOrientationRef.current?.(event);
      };

      window.addEventListener('deviceorientation', handleOrientation, true);
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      };
    }
  }, [orientation.permissionGranted, enabled]);

  return { orientation, needsPermission, requestPermission, setPermissionGranted };
}

// ============================================================================
// ローディング画面
// ============================================================================

function MapLoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="absolute inset-0 z-50 flex items-center justify-center"
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
          マップを読み込んでいます...
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// 方向表示許可ダイアログ
// ============================================================================

interface DirectionPermissionDialogProps {
  onRequestPermission: () => void;
  onDismiss: () => void;
}

function DirectionPermissionDialog({
  onRequestPermission,
  onDismiss,
}: DirectionPermissionDialogProps) {
  const { t } = useLanguage();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-28 left-4 right-4"
      style={{ zIndex: 9999 }}
    >
      <div
        className="rounded-xl p-4"
        style={{
          background: colors.surface,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${colors.borderGold}`,
          boxShadow: colors.shadowGold,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${colors.accent}15` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke={colors.accent} strokeWidth="1.5" />
              <path
                d="M12 2v2M12 20v2M2 12h2M20 12h2"
                stroke={colors.accent}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <h4 style={{ color: colors.text }} className="font-bold text-sm">
              {t('map_direction.enable_direction')}
            </h4>
            <p style={{ color: colors.textSubtle }} className="text-xs">
              {t('map_direction.show_your_direction')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
            style={{
              background: `${colors.text}08`,
              color: colors.textMuted,
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onRequestPermission}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors"
            style={{
              background: colors.goldGradient,
              color: colors.background,
            }}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// マップスタイル（ネイビー・ゴールド系に調整）
// ============================================================================

const luxuryMapStyles: google.maps.MapTypeStyle[] = [
  // ベース背景: Deep Navy系
  { elementType: 'geometry', stylers: [{ color: '#1A2A40' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  
  // ラベル文字を白系に（視認性向上）
  { elementType: 'labels.text.fill', stylers: [{ color: '#FDFBF7' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A1628' }, { weight: 2.5 }] },
  
  // 行政区域
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#C9A86C' }] },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#FDFBF7' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#FDFBF7' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#E8D5B7' }],
  },
  
  // POI（店舗名などを表示）
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#FDFBF7' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0A1628' }, { weight: 2 }],
  },
  {
    featureType: 'poi.business',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.attraction',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1F3A3A' }, { visibility: 'simplified' }],
  },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  
  // 道路: ネイビー系グラデーション
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2A4060' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#162447' }] },
  { 
    featureType: 'road', 
    elementType: 'labels.text.fill', 
    stylers: [{ color: '#FDFBF7' }] 
  },
  { 
    featureType: 'road', 
    elementType: 'labels.text.stroke', 
    stylers: [{ color: '#0A1628' }, { weight: 3 }] 
  },
  
  // 高速道路: ゴールドアクセント
  { 
    featureType: 'road.highway', 
    elementType: 'geometry', 
    stylers: [{ color: '#3A5070' }] 
  },
  { 
    featureType: 'road.highway', 
    elementType: 'geometry.stroke', 
    stylers: [{ color: '#C9A86C' }, { weight: 0.8 }] 
  },
  { 
    featureType: 'road.highway', 
    elementType: 'labels.text.fill', 
    stylers: [{ color: '#FDFBF7' }] 
  },
  
  // 幹線道路
  { 
    featureType: 'road.arterial', 
    elementType: 'geometry', 
    stylers: [{ color: '#2A4060' }] 
  },
  { 
    featureType: 'road.arterial', 
    elementType: 'labels.text.fill', 
    stylers: [{ color: '#FDFBF7' }] 
  },
  
  // 地方道路
  { 
    featureType: 'road.local', 
    elementType: 'geometry', 
    stylers: [{ color: '#1F3555' }] 
  },
  { 
    featureType: 'road.local', 
    elementType: 'labels.text.fill', 
    stylers: [{ color: '#E8D5B7' }] 
  },
  
  // 交通機関
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1F3555' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { 
    featureType: 'transit.station', 
    elementType: 'labels.text.fill', 
    stylers: [{ color: '#FDFBF7' }] 
  },
  
  // 水域: 深いネイビーブルー
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A1628' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6B8CAE' }] },
  
  // 景観
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#1A2A40' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1A2A40' }] },
];

// ============================================================================
// メインコンポーネント: MapView
// ============================================================================

export function MapView({
  stores,
  center,
  onStoreClick,
  enableLocationTracking = true,
  enableCompass = true,
  onBoundsChange,
}: MapViewProps) {
  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  
  // マーカーをMapで管理（フリッカー防止）
  const storeMarkersRef = useRef<Map<string, StoreMarkerData>>(new Map());
  
  // 現在地マーカー関連
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  
  const boundsChangeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const initialCenterSetRef = useRef(false);

  // State
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [showDirectionDialog, setShowDirectionDialog] = useState(false);
  const [compassEnabled, setCompassEnabled] = useState(false);

  // Hooks
  const { t } = useLanguage();
  const { location: geoLocation, isInitialized } = useOptimizedGeolocation(enableLocationTracking);
  const { orientation, needsPermission, requestPermission, setPermissionGranted } =
    useDeviceOrientation(enableCompass);

  // 現在位置（メモ化）
  const currentPosition = useMemo(() => {
    if (center) return center;
    if (geoLocation) {
      return { lat: geoLocation.latitude, lng: geoLocation.longitude };
    }
    return DEFAULT_LOCATION;
  }, [center, geoLocation]);

  // 初期化時にlocalStorageから状態を復元（1時間TTLチェック）
  useEffect(() => {
    // 1時間TTLチェック
    if (compassCache.isExpired()) {
      debugLog('Compass cache expired on mount, clearing...');
      compassCache.clear();
      return;
    }

    const stored = compassCache.get();
    if (stored) {
      setCompassEnabled(stored.enabled);
      if (stored.granted) {
        setPermissionGranted(true);
      }
    }
  }, [setPermissionGranted]);

  // ============================================================================
  // Google Maps初期化（初期位置を即座に設定）
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;

    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          debugWarn('Google Maps API key not found');
          setLoading(false);
          return;
        }

        if (window.google?.maps) {
          if (!mapInstanceRef.current) {
            createMap();
          }
          return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          const checkGoogle = setInterval(() => {
            if (window.google?.maps) {
              clearInterval(checkGoogle);
              if (!mapInstanceRef.current && isMountedRef.current) {
                createMap();
              }
            }
          }, 100);
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-script';

        script.onload = () => {
          if (isMountedRef.current) {
            createMap();
          }
        };
        script.onerror = () => {
          debugWarn('Error loading Google Maps');
          setLoading(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        debugWarn('Error loading Google Maps:', error);
        setLoading(false);
      }
    };

    const createMap = () => {
      if (!mapRef.current || mapInstanceRef.current || !isMountedRef.current) return;

      // キャッシュから初期位置を取得（即座にカメラ設定）
      let initialCenter = DEFAULT_LOCATION;
      const cached = locationCache.get();
      if (cached && !cached.isDefault) {
        initialCenter = { lat: cached.lat, lng: cached.lng };
        debugLog('Using cached location for initial map center', initialCenter);
      }

      const map = new google.maps.Map(mapRef.current, {
        center: initialCenter,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        scaleControl: false,
        rotateControl: false,
        gestureHandling: 'greedy',
        clickableIcons: false,
        styles: luxuryMapStyles,
        backgroundColor: '#0A1628',
      });

      mapInstanceRef.current = map;
      setLoading(false);

      // Debounced bounds change listener
      map.addListener('idle', () => {
        if (boundsChangeTimerRef.current) {
          clearTimeout(boundsChangeTimerRef.current);
        }

        boundsChangeTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          
          const bounds = map.getBounds();
          const zoom = map.getZoom();
          if (bounds && zoom && onBoundsChange) {
            onBoundsChange(bounds, zoom);
          }
        }, BOUNDS_CHANGE_DEBOUNCE_MS);
      });

      google.maps.event.addListenerOnce(map, 'idle', () => {
        if (isMountedRef.current) {
          setMapReady(true);
        }
      });
    };

    initMap();

    return () => {
      isMountedRef.current = false;
      if (boundsChangeTimerRef.current) {
        clearTimeout(boundsChangeTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // GPS取得後に初回のみカメラを移動
  // ============================================================================

  useEffect(() => {
    if (
      mapInstanceRef.current && 
      currentPosition && 
      mapReady && 
      isInitialized && 
      !initialCenterSetRef.current &&
      !geoLocation?.isDefault
    ) {
      debugLog('Setting initial camera position', currentPosition);
      mapInstanceRef.current.panTo(currentPosition);
      initialCenterSetRef.current = true;
    }
  }, [isInitialized, mapReady, currentPosition, geoLocation?.isDefault]);

  // ============================================================================
  // コンパスボタンハンドラー
  // ============================================================================

  const handleCompassToggle = useCallback(async () => {
    if (compassEnabled) {
      setCompassEnabled(false);
      compassCache.set(orientation.permissionGranted, false);
    } else {
      if (needsPermission && !orientation.permissionGranted) {
        setShowDirectionDialog(true);
      } else {
        setCompassEnabled(true);
        compassCache.set(true, true);
      }
    }
  }, [compassEnabled, needsPermission, orientation.permissionGranted]);

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission();
    setShowDirectionDialog(false);

    if (granted) {
      setCompassEnabled(true);
      compassCache.set(true, true);
    }
  }, [requestPermission]);

  const handleDismissDialog = useCallback(() => {
    setShowDirectionDialog(false);
  }, []);

  // ============================================================================
  // 店舗マーカーの差分更新（フリッカー防止）
  // ============================================================================

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    const map = mapInstanceRef.current;
    const existingMarkers = storeMarkersRef.current;
    const currentStoreIds = new Set(stores.map(s => s.id));

    // 1. 削除された店舗のマーカーを削除
    existingMarkers.forEach((markerData, storeId) => {
      if (!currentStoreIds.has(storeId)) {
        markerData.marker.setMap(null);
        markerData.touchArea.setMap(null);
        existingMarkers.delete(storeId);
        debugLog('Removed marker for store', storeId);
      }
    });

    // 2. 同一座標の店舗をグループ化
    const positionGroups = new Map<string, Store[]>();
    stores.forEach(store => {
      const key = `${store.latitude},${store.longitude}`;
      if (!positionGroups.has(key)) {
        positionGroups.set(key, []);
      }
      positionGroups.get(key)!.push(store);
    });

    // 3. 各店舗のマーカーを更新または作成
    stores.forEach((store) => {
      const positionKey = `${store.latitude},${store.longitude}`;
      const samePositionStores = positionGroups.get(positionKey) || [];
      const indexAtPosition = samePositionStores.findIndex((s) => s.id === store.id);

      // オフセット計算（同一座標に複数店舗がある場合）
      let latOffset = 0;
      let lngOffset = 0;
      if (samePositionStores.length > 1) {
        const offsetDistance = 0.00008;
        const angle = (indexAtPosition * (360 / samePositionStores.length) * Math.PI) / 180;
        latOffset = Math.cos(angle) * offsetDistance;
        lngOffset = Math.sin(angle) * offsetDistance;
      }

      const position = {
        lat: Number(store.latitude) + latOffset,
        lng: Number(store.longitude) + lngOffset,
      };

      const existingMarkerData = existingMarkers.get(store.id);

      if (existingMarkerData) {
        // 既存マーカーを再利用（位置とアイコンのみ更新）
        const needsPositionUpdate = 
          existingMarkerData.lastPosition.lat !== position.lat ||
          existingMarkerData.lastPosition.lng !== position.lng;
        
        const needsIconUpdate = existingMarkerData.lastStatus !== store.vacancy_status;

        if (needsPositionUpdate) {
          existingMarkerData.marker.setPosition(position);
          existingMarkerData.touchArea.setCenter(position);
          existingMarkerData.lastPosition = position;
        }

        if (needsIconUpdate) {
          existingMarkerData.marker.setIcon({
            url: getMarkerIconUrl(store.vacancy_status),
            scaledSize: new google.maps.Size(52, 52),
            anchor: new google.maps.Point(26, 26),
          });
          existingMarkerData.lastStatus = store.vacancy_status;
        }
      } else {
        // 新規マーカーを作成
        const marker = new google.maps.Marker({
          position,
          map,
          title: store.name,
          icon: {
            url: getMarkerIconUrl(store.vacancy_status),
            scaledSize: new google.maps.Size(52, 52),
            anchor: new google.maps.Point(26, 26),
          },
          optimized: true,
          zIndex: 100,
          cursor: 'pointer',
          clickable: true,
        });

        const touchArea = new google.maps.Circle({
          map,
          center: position,
          radius: 15,
          fillOpacity: 0,
          strokeOpacity: 0,
          clickable: true,
          zIndex: 99,
        });

        // クリックイベント（クロージャでstoreをキャプチャ）
        const handleClick = () => {
          if (onStoreClick) {
            marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => marker.setAnimation(null), 700);
            onStoreClick(store);
          }
        };

        marker.addListener('click', handleClick);
        touchArea.addListener('click', handleClick);

        existingMarkers.set(store.id, {
          marker,
          touchArea,
          lastStatus: store.vacancy_status,
          lastPosition: position,
        });

        debugLog('Created new marker for store', store.id);
      }
    });
  }, [stores, onStoreClick, mapReady]);

  // ============================================================================
  // 方角付きユーザー位置マーカー（コンパス有効時のみ方角を表示）
  // ============================================================================

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !currentPosition) return;

    const map = mapInstanceRef.current;
    const userPosition = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);
    
    // コンパスが有効な場合のみ方角を表示、それ以外はnull（方角なし）
    const headingForIcon = compassEnabled && orientation.permissionGranted ? orientation.alpha : null;
    const directionalIcon = createDirectionalLocationIcon(headingForIcon);
    
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(userPosition);
      userMarkerRef.current.setIcon(directionalIcon);
      userMarkerRef.current.setMap(map);
      userMarkerRef.current.setZIndex(9999);
    } else {
      try {
        const marker = new google.maps.Marker({
          position: userPosition,
          map,
          title: "あなたの現在地",
          icon: directionalIcon,
          zIndex: 9999,
        });
        userMarkerRef.current = marker;
      } catch (error) {
        console.error('Failed to create user location marker:', error);
      }
    }
  }, [
    currentPosition,
    mapReady,
    compassEnabled,
    orientation.permissionGranted,
    orientation.alpha,
  ]);

  // ============================================================================
  // コンポーネントアンマウント時のクリーンアップ
  // ============================================================================

  useEffect(() => {
    return () => {
      // 店舗マーカーのクリーンアップ
      storeMarkersRef.current.forEach((markerData) => {
        markerData.marker.setMap(null);
        markerData.touchArea.setMap(null);
      });
      storeMarkersRef.current.clear();

      // 現在地マーカーのクリーンアップ
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
    };
  }, []);

  // ズームハンドラー
  const handleZoomIn = useCallback(() => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || 15;
      mapInstanceRef.current.setZoom(currentZoom + 1);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || 15;
      mapInstanceRef.current.setZoom(currentZoom - 1);
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      <AnimatePresence>{loading && <MapLoadingScreen />}</AnimatePresence>

      <AnimatePresence>
        {showDirectionDialog && (
          <DirectionPermissionDialog
            onRequestPermission={handleRequestPermission}
            onDismiss={handleDismissDialog}
          />
        )}
      </AnimatePresence>

      {/* コントロールボタン */}
      <div className="absolute bottom-32 right-4 z-10 flex flex-col gap-2">
        {/* コンパスON/OFFボタン */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCompassToggle}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: compassEnabled
              ? colors.goldGradient
              : colors.surface,
            border: compassEnabled
              ? `1px solid ${colors.accent}`
              : `1px solid ${colors.borderGold}`,
            boxShadow: compassEnabled
              ? colors.shadowGold
              : `0 2px 10px rgba(0,0,0,0.3)`,
          }}
          aria-label={compassEnabled ? t('map_direction.disable_direction') : t('map_direction.enable_direction')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke={compassEnabled ? colors.background : colors.accent}
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M12 2v2M12 20v2M2 12h2M20 12h2"
              stroke={compassEnabled ? colors.background : colors.accent}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"
              fill={compassEnabled ? colors.background : colors.accent}
            />
          </svg>
        </motion.button>

        {/* ズームイン */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomIn}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-medium"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.borderGold}`,
            color: colors.text,
            boxShadow: `0 2px 10px rgba(0,0,0,0.3)`,
          }}
          aria-label="ズームイン"
        >
          +
        </motion.button>

        {/* ズームアウト */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomOut}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-medium"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.borderGold}`,
            color: colors.text,
            boxShadow: `0 2px 10px rgba(0,0,0,0.3)`,
          }}
          aria-label="ズームアウト"
        >
          −
        </motion.button>
      </div>
    </div>
  );
}

// ============================================================================
// 方角付き現在地マーカーアイコンを作成
// ============================================================================

const createDirectionalLocationIcon = (heading: number | null): google.maps.Icon => {
  const size = 48;
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = 20;
  const innerRadius = 10;
  const angle = heading !== null ? heading : 0;
  const angleRad = (angle - 90) * Math.PI / 180;
  const tipX = centerX + Math.cos(angleRad) * outerRadius;
  const tipY = centerY + Math.sin(angleRad) * outerRadius;
  const baseAngle1 = angleRad + Math.PI * 0.75;
  const baseAngle2 = angleRad - Math.PI * 0.75;
  const baseRadius = innerRadius + 4;
  const base1X = centerX + Math.cos(baseAngle1) * baseRadius;
  const base1Y = centerY + Math.sin(baseAngle1) * baseRadius;
  const base2X = centerX + Math.cos(baseAngle2) * baseRadius;
  const base2Y = centerY + Math.sin(baseAngle2) * baseRadius;
  
  const svgIcon = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/></filter></defs>
    <polygon points="${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}" fill="#C89B3C" fill-opacity="0.4" filter="url(#shadow)"/>
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius + 6}" fill="#C89B3C" fill-opacity="0.2"/>
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="white" filter="url(#shadow)"/>
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius - 3}" fill="#C89B3C"/>
  </svg>`;
  
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
};

export default MapView;