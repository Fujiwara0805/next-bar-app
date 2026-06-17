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
import type { EventAwareStore } from '@/lib/types/active-store-event';

// ============================================================================
// 共通モジュールのインポート
// ============================================================================

import { locationCache, compassCache, cacheManager } from '@/lib/cache';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';
import { sendGAEvent } from '@/lib/analytics';
import { getVacancyFreshness } from '@/lib/vacancy/freshness';

// EventAwareStore = stores Row ＋ active_event（イベント参加時に付与）。
// イベント参加店は地図ピンを店舗写真→★アイコンに置換する（active_event の truthy 判定で分岐）。
type Store = EventAwareStore;

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
// → useAppMode().colorsA で取得 + Google固定色
// ============================================================================

const GOOGLE_MARKER_COLORS = {
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
  selectedStoreId?: string | null;
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

interface StoreMarkerData {
  marker: google.maps.Marker;
  touchArea: google.maps.Circle;
  lastIconKey: string;
  lastPosition: { lat: number; lng: number };
}

// ============================================================================
// 定数
// ============================================================================

const DEFAULT_LOCATION = {
  lat: 33.2382,
  lng: 131.6126,
};

/** マップ初期ズーム・ズームボタン時のフォールバック（getZoom が無い場合） */
const DEFAULT_MAP_ZOOM = 15;

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

const MARKER_ICON_WIDTH_PX = 112;
const MARKER_ICON_HEIGHT_PX = 66;
const MARKER_FRAME_SIZE_PX = 46;

/**
 * 高DPI（Retina）ディスプレイで鮮明に描画するためのレンダースケール。
 * SVGはベクターなので optimized:false により自動で端末解像度に追従するが、
 * SVGへ埋め込む「店舗写真（ラスター）」だけはソース解像度を上げる必要がある。
 * SSR安全のため window 不在時は 2 にフォールバックし、2〜3 にクランプする。
 */
const MARKER_RENDER_SCALE =
  typeof window === 'undefined'
    ? 2
    : Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 1)));

// 埋め込む店舗写真の解像度。
// 「円フレーム表示サイズ × DPR」だけだとデバイスピクセルとちょうど1:1になり、
// SVGラスタライズ時の再サンプリングで甘くなる。さらにスーパーサンプリング係数(2)を掛け、
// ブラウザの高品質縮小を効かせて鮮明化する（データURL肥大化を防ぐため256pxで上限）。
const MARKER_IMAGE_SUPERSAMPLE = 2;
const MARKER_IMAGE_SOURCE_PX = Math.min(
  256,
  MARKER_FRAME_SIZE_PX * MARKER_RENDER_SCALE * MARKER_IMAGE_SUPERSAMPLE
);
const markerImageCache = new Map<string, Promise<string | null>>();

function getMarkerImageUrl(store: Store): string | null {
  const firstImage = store.image_urls?.[0];
  return typeof firstImage === 'string' && firstImage.trim() ? firstImage.trim() : null;
}

/**
 * Cloudinary画像URLにマーカー用の最適化変換を注入する。
 * - c_fill + 正方形サイズで円フレームにちょうど収まるよう切り抜き（g_auto=被写体中心）
 * - f_auto,q_auto:good で配信形式を自動最適化しつつ、小サイズの圧縮アーティファクトを抑制
 * - dpr は MARKER_IMAGE_SOURCE_PX 側で吸収済みのため指定不要
 * Cloudinary以外のURLはそのまま返す。
 */
function optimizeMarkerImageUrl(url: string, sizePx: number): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  const transform = `c_fill,g_auto,w_${sizePx},h_${sizePx},f_auto,q_auto:good`;
  return url.replace('/upload/', `/upload/${transform}/`);
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncateMarkerTitle(title: string): string {
  return title.length > 10 ? `${title.slice(0, 10)}...` : title;
}

function getMarkerIconKey(
  status: string,
  imageUrl: string | null,
  title: string,
  isEvent: boolean
): string {
  return `${status}|${imageUrl ?? ''}|${title}|${isEvent ? 'ev' : ''}`;
}

function createBeerSvgPaths(): string {
  return `
    <path d="M4 8h11v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8Z"/>
    <path d="M15 10h2a3 3 0 0 1 0 6h-2"/>
    <path d="M5 8a3 3 0 0 1 5-3 3 3 0 0 1 5 3"/>
    <path d="M8 12v6"/>
    <path d="M11 12v6"/>
  `;
}

/** 中心(cx,cy)・外半径outerR・内半径innerRの5角星の path data を返す（頂点を上向きに固定）。 */
function createStarPath(cx: number, cy: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = ((-90 + i * 36) * Math.PI) / 180;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
}

/** 営業状態 → 外周リング色（イベント参加店ピン用。open/vacant=緑・full=赤・closed=灰・他=白）。
 *  金色は使わない（イベントである主張は中央の金★が担うため、リングは営業可否のみ表す）。 */
function statusRingColor(status: string): string {
  if (status === 'open' || status === 'vacant') return '#22c55e';
  if (status === 'full') return '#ef4444';
  if (status === 'closed') return '#9CA3AF';
  return '#FFFFFF';
}

function createMarkerSvgDataUrl(
  status: string,
  title: string,
  imageDataUrl: string | null,
  isEvent: boolean = false
): string {
  const iconX = (MARKER_ICON_WIDTH_PX - MARKER_FRAME_SIZE_PX) / 2;
  const iconY = 0;
  const centerX = MARKER_ICON_WIDTH_PX / 2;
  const centerY = MARKER_FRAME_SIZE_PX / 2;
  const radius = MARKER_FRAME_SIZE_PX / 2 - 2;
  const labelY = MARKER_FRAME_SIZE_PX + 3;
  const labelText = escapeSvgText(truncateMarkerTitle(title));
  // 営業中=グリーン / 営業時間外(closed)=グレー / その他=白
  const borderColor =
    status === 'open' ? '#22c55e' : status === 'closed' ? '#9CA3AF' : '#FFFFFF';
  // 店舗名はネイビー(#13294b)の文字に白い縁取りを付与（paint-order="stroke" で白縁を文字背面に描画）
  const label = `
    <text x="${centerX}" y="${labelY + 11.5}" text-anchor="middle" fill="#13294b" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" paint-order="stroke" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="10" font-weight="800">${labelText}</text>
  `;

  let body = '';
  if (isEvent) {
    // イベント参加店は店舗写真を★アイコンに置換する（中央の金★がイベントの目印）。
    // 営業可否（open/vacant=緑・full=赤・closed=灰・他=白）は外周リングの色で表現する。
    const ringColor = statusRingColor(status);
    const starPath = createStarPath(centerX, centerY, radius * 0.66, radius * 0.28);
    body = `
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="#13294b" stroke="${ringColor}" stroke-width="4"/>
      <path d="${starPath}" fill="#ffc82c" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/>
    `;
  } else if (status === 'vacant' || status === 'full') {
    const fill = status === 'vacant' ? '#22c55e' : '#ef4444';
    const text = status === 'vacant' ? '空' : '満';
    body = `
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${fill}" stroke="#FFFFFF" stroke-width="3"/>
      <text x="${centerX}" y="${centerY + 7}" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="20" font-weight="900">${text}</text>
    `;
  } else if (imageDataUrl) {
    body = `
      <defs>
        <clipPath id="storeClip"><circle cx="${centerX}" cy="${centerY}" r="${radius}"/></clipPath>
      </defs>
      <image href="${imageDataUrl}" x="${iconX}" y="${iconY}" width="${MARKER_FRAME_SIZE_PX}" height="${MARKER_FRAME_SIZE_PX}" preserveAspectRatio="xMidYMid slice" clip-path="url(#storeClip)"/>
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${borderColor}" stroke-width="3"/>
    `;
  } else {
    body = `
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="#13294b" stroke="${borderColor}" stroke-width="3"/>
      <g transform="translate(${centerX - 12} ${centerY - 12})" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        ${createBeerSvgPaths()}
      </g>
    `;
  }

  // SVGの実寸（intrinsic）を論理サイズ×DPRで出力し、表示時は scaledSize で論理サイズへ縮小する。
  // これによりモバイルSafari等でも端末解像度ぶんのビットマップが確保され、文字・図形が鮮明になる。
  // viewBox は論理座標のまま据え置くため、内部の座標計算は一切変更不要。
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_ICON_WIDTH_PX * MARKER_RENDER_SCALE}" height="${MARKER_ICON_HEIGHT_PX * MARKER_RENDER_SCALE}" viewBox="0 0 ${MARKER_ICON_WIDTH_PX} ${MARKER_ICON_HEIGHT_PX}">
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.32"/>
      </filter>
      <g filter="url(#shadow)">${body}${label}</g>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createGoogleMarkerIcon(url: string): google.maps.Icon {
  return {
    url,
    scaledSize: new google.maps.Size(MARKER_ICON_WIDTH_PX, MARKER_ICON_HEIGHT_PX),
    anchor: new google.maps.Point(MARKER_ICON_WIDTH_PX / 2, MARKER_FRAME_SIZE_PX / 2),
  };
}

function loadMarkerImageDataUrl(imageUrl: string): Promise<string | null> {
  if (imageUrl.startsWith('data:')) return Promise.resolve(imageUrl);
  const cached = markerImageCache.get(imageUrl);
  if (cached) return cached;

  const promise = new Promise<string | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = MARKER_IMAGE_SOURCE_PX;
        canvas.height = MARKER_IMAGE_SOURCE_PX;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        // 高解像度ソースを縮小する際のジャギー/ボケを抑える（鮮明化）
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const scale = Math.max(
          MARKER_IMAGE_SOURCE_PX / image.naturalWidth,
          MARKER_IMAGE_SOURCE_PX / image.naturalHeight
        );
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        ctx.drawImage(
          image,
          (MARKER_IMAGE_SOURCE_PX - drawWidth) / 2,
          (MARKER_IMAGE_SOURCE_PX - drawHeight) / 2,
          drawWidth,
          drawHeight
        );
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = imageUrl;
  });

  markerImageCache.set(imageUrl, promise);
  return promise;
}

async function createMarkerIconUrl(
  status: string,
  imageUrl: string | null,
  title: string,
  isEvent: boolean = false
): Promise<string> {
  // イベント参加店は★アイコンを描画するため店舗写真は読み込まない（無駄な取得を避ける）。
  const optimizedUrl =
    !isEvent && imageUrl && (status === 'open' || status === 'closed')
      ? optimizeMarkerImageUrl(imageUrl, MARKER_IMAGE_SOURCE_PX)
      : null;
  const imageDataUrl = optimizedUrl ? await loadMarkerImageDataUrl(optimizedUrl) : null;
  return createMarkerSvgDataUrl(status, title, imageDataUrl, isEvent);
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
  const { colorsA } = useAppMode();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: colorsA.background }}
    >
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-5">
          <div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${colorsA.borderGold}` }}
          />
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              border: '2px solid transparent',
              borderTopColor: colorsA.accent,
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{ background: colorsA.accent }}
          />
        </div>

        <p style={{ color: colorsA.textMuted }} className="text-sm font-medium">
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
  const { colorsA } = useAppMode();

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
          background: colorsA.background,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${colorsA.borderGold}`,
          boxShadow: colorsA.shadowGold,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${colorsA.accent}15` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke={colorsA.accent} strokeWidth="1.5" />
              <path
                d="M12 2v2M12 20v2M2 12h2M20 12h2"
                stroke={colorsA.accent}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <h4 style={{ color: colorsA.text }} className="font-bold text-sm">
              {t('map_direction.enable_direction')}
            </h4>
            <p style={{ color: colorsA.textSubtle }} className="text-xs">
              {t('map_direction.show_your_direction')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
            style={{
              background: `${colorsA.text}08`,
              color: colorsA.textMuted,
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onRequestPermission}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors"
            style={{
              background: colorsA.goldGradient,
              color: colorsA.background,
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
  // ベース背景: Cream Off-white
  { elementType: 'geometry', stylers: [{ color: '#F7F3E9' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  // ラベル文字をダークネイビー系に
  { elementType: 'labels.text.fill', stylers: [{ color: '#13294b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F7F3E9' }, { weight: 2.5 }] },

  // 行政区域: ダークネイビー
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#13294b' }, { weight: 0.8 }] },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#13294b' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#13294b' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#335280' }],
  },

  // POI: Brewer Navy 500
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#335280' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#F7F3E9' }, { weight: 2 }],
  },
  {
    featureType: 'poi.business',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.attraction',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#D4E8D0' }, { visibility: 'simplified' }],
  },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'on' }] },

  // 道路: 白ベース
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#DCE1EB' }] },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4D5567' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#F7F3E9' }, { weight: 3 }]
  },

  // 高速道路: イエローアクセント
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#ffdf85' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#ffc82c' }, { weight: 0.8 }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#13294b' }]
  },

  // 幹線道路
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }]
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4D5567' }]
  },

  // 地方道路
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#EEF0F4' }]
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8D95A6' }]
  },

  // 交通機関: ネイビーアクセント
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#DCE1EB' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#335280' }]
  },

  // 水域: Brewer Navy 100
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#E1E8F3' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#13294b' }] },

  // 景観: オフホワイト
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#F7F3E9' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#EEF0F4' }] },
];

// ============================================================================
// カフェモード マップスタイル（ライトベージュ・ブラウン系）
// ============================================================================

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
  selectedStoreId,
}: MapViewProps) {
  const { colorsA: colors } = useAppMode();

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
        zoom: DEFAULT_MAP_ZOOM,
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
        backgroundColor: '#13294b',
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

  // モード切替時・マップ準備完了時にマップスタイルを更新
  useEffect(() => {
    if (mapInstanceRef.current && mapReady) {
      mapInstanceRef.current.setOptions({
        styles: luxuryMapStyles,
        backgroundColor: '#13294b',
      });
    }
  }, [mapReady]);

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

      // 空席鮮度を加味したマーカー表示ステータス（古い vacant は要確認=open へ降格）。
      // 一覧・詳細と同一基準（lib/vacancy/freshness）でマップ上の信用を守る（死因#1対策）。
      const markerStatus = getVacancyFreshness(
        store.vacancy_status,
        store.last_updated ?? store.updated_at
      ).displayStatus;
      const markerImageUrl = getMarkerImageUrl(store);
      const isEventStore = !!store.active_event;
      const markerIconKey = getMarkerIconKey(markerStatus, markerImageUrl, store.name, isEventStore);

      if (existingMarkerData) {
        // 既存マーカーを再利用（位置と表示のみ更新）
        const needsPositionUpdate =
          existingMarkerData.lastPosition.lat !== position.lat ||
          existingMarkerData.lastPosition.lng !== position.lng;

        const needsIconUpdate = existingMarkerData.lastIconKey !== markerIconKey;

        if (needsPositionUpdate) {
          existingMarkerData.marker.setPosition(position);
          existingMarkerData.touchArea.setCenter(position);
          existingMarkerData.lastPosition = position;
        }

        if (needsIconUpdate) {
          existingMarkerData.lastIconKey = markerIconKey;
          createMarkerIconUrl(markerStatus, markerImageUrl, store.name, isEventStore).then((iconUrl) => {
            const latestMarkerData = storeMarkersRef.current.get(store.id);
            if (!latestMarkerData || latestMarkerData.lastIconKey !== markerIconKey) return;
            latestMarkerData.marker.setIcon(createGoogleMarkerIcon(iconUrl));
            latestMarkerData.marker.setTitle(store.name);
          });
        }
      } else {
        let marker: google.maps.Marker | null = null;

        // クリックイベント（クロージャでstoreをキャプチャ）
        const handleClick = () => {
          if (onStoreClick) {
            sendGAEvent('map_pin_click', {
              store_id: store.id,
              store_name: store.name,
              vacancy_status: store.vacancy_status ?? 'unknown',
            });
            marker?.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => marker?.setAnimation(null), 700);
            onStoreClick(store);
          }
        };

        // 新規マーカーを作成
        marker = new google.maps.Marker({
          position,
          map,
          title: store.name,
          icon: createGoogleMarkerIcon(createMarkerSvgDataUrl(markerStatus, store.name, null, isEventStore)),
          // 高DPIで鮮明に描画するため非最適化（共有キャンバスの等倍ラスタライズを回避）。
          // 各マーカーが個別<img>になり、端末解像度でSVG/写真が再ラスタライズされる。
          optimized: false,
          zIndex: 100,
          cursor: 'pointer',
          clickable: true,
        });

        createMarkerIconUrl(markerStatus, markerImageUrl, store.name, isEventStore).then((iconUrl) => {
          const latestMarkerData = storeMarkersRef.current.get(store.id);
          if (!latestMarkerData || latestMarkerData.lastIconKey !== markerIconKey) return;
          latestMarkerData.marker.setIcon(createGoogleMarkerIcon(iconUrl));
        });

        marker.addListener('click', handleClick);

        const touchArea = new google.maps.Circle({
          map,
          center: position,
          radius: 15,
          fillOpacity: 0,
          strokeOpacity: 0,
          clickable: true,
          zIndex: 99,
        });

        touchArea.addListener('click', handleClick);

        existingMarkers.set(store.id, {
          marker,
          touchArea,
          lastIconKey: markerIconKey,
          lastPosition: position,
        });

        debugLog('Created new marker for store', store.id);
      }
    });
  }, [stores, onStoreClick, mapReady]);

  // ============================================================================
  // 選択された店舗のマーカーをアニメーション（スワイプ時も反映）
  // ============================================================================

  useEffect(() => {
    if (!selectedStoreId || !mapReady) return;

    const markerData = storeMarkersRef.current.get(selectedStoreId);
    if (markerData) {
      markerData.marker.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(() => markerData.marker.setAnimation(null), 700);
    }
  }, [selectedStoreId, mapReady]);

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
          optimized: false, // 高DPIで現在地アイコンを鮮明に
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
    const storeMarkers = storeMarkersRef.current;

    return () => {
      // 店舗マーカーのクリーンアップ
      storeMarkers.forEach((markerData) => {
        markerData.marker.setMap(null);
        markerData.touchArea.setMap(null);
      });
      storeMarkers.clear();

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
      const currentZoom = mapInstanceRef.current.getZoom() || DEFAULT_MAP_ZOOM;
      mapInstanceRef.current.setZoom(currentZoom + 1);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || DEFAULT_MAP_ZOOM;
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
        {/* ズームイン */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomIn}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-medium"
          style={{
            background: colors.background,
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
            background: colors.background,
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
  
  const svgIcon = `<svg width="${size * MARKER_RENDER_SCALE}" height="${size * MARKER_RENDER_SCALE}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/></filter></defs>
    <polygon points="${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}" fill="#13294b" fill-opacity="0.4" filter="url(#shadow)"/>
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius + 6}" fill="#13294b" fill-opacity="0.2"/>
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="white" filter="url(#shadow)"/>
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius - 3}" fill="#13294b"/>
  </svg>`;
  
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
};

export default MapView;
