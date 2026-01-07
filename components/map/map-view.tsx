'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

// ============================================================================
// デザイントークン（LP画面と統一）
// ============================================================================

const colors = {
  background: '#2B1F1A',      // Dark Brown
  surface: '#1C1C1C',         // Charcoal Black
  accent: '#C89B3C',          // Amber Gold
  accentDark: '#8A6A2F',      // Dark Gold
  text: '#F2EBDD',            // Ivory
  textMuted: 'rgba(242, 235, 221, 0.6)',
  textSubtle: 'rgba(242, 235, 221, 0.4)',
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

// ============================================================================
// 定数
// ============================================================================

const DEFAULT_LOCATION = {
  lat: 33.2382,
  lng: 131.6126,
};

const LOCATION_CACHE_KEY = 'nikenme_user_location';
const LOCATION_CACHE_MAX_AGE = 5 * 60 * 1000; // 5分

const COMPASS_STORAGE_KEY = 'nikenme_compass_permission';
const COMPASS_EXPIRY_MS = 30 * 60 * 1000;

// ============================================================================
// localStorage ヘルパー
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
    
    // キャッシュが有効期限内なら使用
    if (age < LOCATION_CACHE_MAX_AGE) {
      return parsed;
    }
    
    return null;
  } catch {
    return null;
  }
}

function setLocationCache(data: LocationCacheData): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }));
  } catch {
    // ignore
  }
}

interface CompassStorageData {
  granted: boolean;
  enabled: boolean;
  timestamp: number;
}

function getCompassStorage(): CompassStorageData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(COMPASS_STORAGE_KEY);
    if (!data) return null;
    
    const parsed: CompassStorageData = JSON.parse(data);
    const now = Date.now();
    
    if (now - parsed.timestamp > COMPASS_EXPIRY_MS) {
      localStorage.removeItem(COMPASS_STORAGE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
}

function setCompassStorage(granted: boolean, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  
  try {
    const data: CompassStorageData = {
      granted,
      enabled,
      timestamp: Date.now(),
    };
    localStorage.setItem(COMPASS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// ============================================================================
// カスタムフック: useOptimizedGeolocation（最適化版）
// ============================================================================

function useOptimizedGeolocation(enabled: boolean = true) {
  const [location, setLocation] = useState<GeolocationState | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const smoothedLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;
  const SMOOTHING_FACTOR = 0.3;

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

  // 初期位置の即座取得（キャッシュ優先）
  useEffect(() => {
    if (!enabled) return;

    // 1. キャッシュから即座に位置を設定
    const cached = getLocationCache();
    if (cached) {
      setLocation({
        latitude: cached.lat,
        longitude: cached.lng,
        accuracy: cached.accuracy || 100,
        heading: null,
        timestamp: cached.timestamp,
        isDefault: cached.isDefault,
      });
      smoothedLocationRef.current = { lat: cached.lat, lng: cached.lng };
      setIsInitialized(true);
    } else {
      // キャッシュがない場合はデフォルト位置を即座に設定
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

  // バックグラウンドで実際の位置を取得
  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      return;
    }

    let isMounted = true;

    const handleSuccess = (position: GeolocationPosition) => {
      if (!isMounted) return;

      const { latitude, longitude, accuracy, heading } = position.coords;
      const smoothed = smoothPosition(latitude, longitude);

      // キャッシュを更新
      setLocationCache({
        lat: smoothed.lat,
        lng: smoothed.lng,
        accuracy,
        timestamp: position.timestamp,
        isDefault: false,
      });

      setLocation({
        latitude: smoothed.lat,
        longitude: smoothed.lng,
        accuracy,
        heading,
        timestamp: position.timestamp,
        isDefault: false,
      });
      setError(null);
      retryCountRef.current = 0;
    };

    const handleError = (err: GeolocationPositionError) => {
      if (!isMounted) return;

      console.warn('Geolocation error:', err.message);
      setError(err);

      // リトライロジック
      if (retryCountRef.current < MAX_RETRIES && err.code !== 1) {
        retryCountRef.current++;
        // 低精度モードでリトライ
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          () => {
            // 最終的にエラーの場合はデフォルト位置を維持
            console.log('Using default location after retries');
          },
          {
            enableHighAccuracy: false,
            timeout: 3000,
            maximumAge: 600000, // 10分のキャッシュを許容
          }
        );
      }
    };

    // 初回取得（低精度・高速モード）
    const getInitialPosition = () => {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000, // 5分のキャッシュを許容
        }
      );
    };

    // 非同期で初回取得
    const initialTimer = setTimeout(getInitialPosition, 100);

    // watchPositionは少し遅延させて開始（初回取得後）
    const watchTimer = setTimeout(() => {
      if (!isMounted) return;

      setIsTracking(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        (err) => {
          // watchPositionのエラーはログのみ（UIには影響させない）
          console.warn('Watch position error:', err.message);
        },
        {
          enableHighAccuracy: false, // 低精度モードで安定性優先
          timeout: 10000,
          maximumAge: 30000, // 30秒のキャッシュを許容
        }
      );
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearTimeout(watchTimer);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
    };
  }, [enabled, smoothPosition]);

  return { location, error, isTracking, isInitialized };
}

// ============================================================================
// カスタムフック: useDeviceOrientation
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

  const angleDifference = useCallback(
    (current: number, target: number): number => {
      let diff = target - current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      return diff;
    },
    []
  );

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

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
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
    },
    [smoothAlpha]
  );

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
        console.error('DeviceOrientation permission error:', err);
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

  useEffect(() => {
    if (!enabled) return;

    const isSupported = typeof DeviceOrientationEvent !== 'undefined';
    setOrientation((prev) => ({ ...prev, isSupported }));

    if (!isSupported) return;

    const needsRequest =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
        .requestPermission === 'function';

    if (needsRequest) {
      setNeedsPermission(true);
    } else {
      setOrientation((prev) => ({ ...prev, permissionGranted: true }));
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [enabled, handleOrientation]);

  useEffect(() => {
    if (orientation.permissionGranted && enabled) {
      window.addEventListener('deviceorientation', handleOrientation, true);
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      };
    }
  }, [orientation.permissionGranted, enabled, handleOrientation]);

  return { orientation, needsPermission, requestPermission, setPermissionGranted };
}

// ============================================================================
// 現在地マーカー
// ============================================================================

interface UserLocationMarkerProps {
  map: google.maps.Map;
  position: { lat: number; lng: number };
  heading: number;
  accuracy: number;
  showDirectionBeam: boolean;
}

function createUserLocationMarker({
  map,
  position,
  heading,
  accuracy,
  showDirectionBeam,
}: UserLocationMarkerProps): {
  marker: google.maps.Marker;
  accuracyCircle: google.maps.Circle;
  beam: google.maps.Polygon | null;
} {
  const accuracyCircle = new google.maps.Circle({
    map,
    center: position,
    radius: Math.min(Math.max(accuracy, 20), 100),
    fillColor: colors.accent,
    fillOpacity: 0.1,
    strokeColor: colors.accent,
    strokeOpacity: 0.3,
    strokeWeight: 1,
    zIndex: 998,
  });

  let beam: google.maps.Polygon | null = null;
  if (showDirectionBeam) {
    const beamPoints = calculateSimpleBeamPoints(position, heading);

    beam = new google.maps.Polygon({
      map,
      paths: beamPoints,
      fillColor: colors.accent,
      fillOpacity: 0.25,
      strokeWeight: 0,
      zIndex: 999,
    });
  }

  const marker = new google.maps.Marker({
    position,
    map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: colors.accent,
      fillOpacity: 1,
      strokeColor: colors.text,
      strokeWeight: 3,
    },
    zIndex: 1000,
  });

  return { marker, accuracyCircle, beam };
}

function calculateSimpleBeamPoints(
  center: { lat: number; lng: number },
  heading: number
): google.maps.LatLngLiteral[] {
  const beamLength = 0.0004;
  const spreadAngle = 40;

  const leftAngleRad = ((heading - spreadAngle / 2) * Math.PI) / 180;
  const rightAngleRad = ((heading + spreadAngle / 2) * Math.PI) / 180;

  const centerPoint = { lat: center.lat, lng: center.lng };

  const leftPoint = {
    lat: center.lat + Math.cos(leftAngleRad) * beamLength,
    lng: center.lng + Math.sin(leftAngleRad) * beamLength,
  };

  const rightPoint = {
    lat: center.lat + Math.cos(rightAngleRad) * beamLength,
    lng: center.lng + Math.sin(rightAngleRad) * beamLength,
  };

  return [centerPoint, leftPoint, rightPoint];
}

// ============================================================================
// ローディング画面（LP統一デザイン）
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
        {/* ゴールドアクセントのスピナー */}
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
          {/* 中央のドット */}
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
// 方向表示許可ダイアログ（LP統一デザイン）
// ============================================================================

interface DirectionPermissionDialogProps {
  onRequestPermission: () => void;
  onDismiss: () => void;
}

function DirectionPermissionDialog({
  onRequestPermission,
  onDismiss,
}: DirectionPermissionDialogProps) {
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
          border: `1px solid ${colors.accentDark}60`,
          boxShadow: `0 4px 30px ${colors.accent}20`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${colors.accent}15` }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke={colors.accent} strokeWidth="1.5" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h4 style={{ color: colors.text }} className="font-bold text-sm">方向表示をオンにする</h4>
            <p style={{ color: colors.textSubtle }} className="text-xs">あなたの向きをマップに表示</p>
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
            スキップ
          </button>
          <button
            onClick={onRequestPermission}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors"
            style={{ 
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
              color: colors.background,
            }}
          >
            オンにする
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// マップスタイル（LP統一ダークブラウンテーマ）
// ============================================================================

const luxuryMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#2B1F1A' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A89078' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1C1C1C' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#8A6A2F' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#C89B3C' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#F2EBDD' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#2D3A2A' }, { visibility: 'simplified' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3D2E26' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2B1F1A' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#A89078' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#5C4A3A' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#C89B3C' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#4A3828' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#3D2E26' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1A2A3A' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6B8CAE' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#2B1F1A' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#2B1F1A' }] },
];

// ============================================================================
// マーカーアイコンURL
// ============================================================================

function getMarkerIcon(status: string): string {
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
}

// ============================================================================
// メインコンポーネント: MapView
// ============================================================================

export function MapView({
  stores,
  center,
  onStoreClick,
  enableLocationTracking = true,
  enableCompass = true,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const touchAreasRef = useRef<google.maps.Circle[]>([]);

  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const userBeamRef = useRef<google.maps.Polygon | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);

  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [showDirectionDialog, setShowDirectionDialog] = useState(false);
  const [compassEnabled, setCompassEnabled] = useState(false);

  const { location: geoLocation, isInitialized } = useOptimizedGeolocation(enableLocationTracking);
  const { orientation, needsPermission, requestPermission, setPermissionGranted } =
    useDeviceOrientation(enableCompass);

  const currentPosition = useMemo(() => {
    if (center) return center;
    if (geoLocation) {
      return { lat: geoLocation.latitude, lng: geoLocation.longitude };
    }
    return DEFAULT_LOCATION;
  }, [center, geoLocation]);

  // 初期化時にlocalStorageから状態を復元
  useEffect(() => {
    const stored = getCompassStorage();
    if (stored) {
      setCompassEnabled(stored.enabled);
      if (stored.granted) {
        setPermissionGranted(true);
      }
    }
  }, [setPermissionGranted]);

  // Google Maps初期化
  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key not found');
          setLoading(false);
          return;
        }

        if (window.google?.maps) {
          if (!mapInstanceRef.current) {
            createMap();
          }
          return;
        }

        const existingScript = document.querySelector(
          'script[src*="maps.googleapis.com"]'
        );
        if (existingScript) {
          const checkGoogle = setInterval(() => {
            if (window.google?.maps) {
              clearInterval(checkGoogle);
              if (!mapInstanceRef.current) {
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

        script.onload = () => createMap();
        script.onerror = () => {
          console.error('Error loading Google Maps');
          setLoading(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setLoading(false);
      }
    };

    const createMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = new google.maps.Map(mapRef.current, {
        center: currentPosition,
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
        backgroundColor: colors.background,
      });

      mapInstanceRef.current = map;
      setLoading(false);

      google.maps.event.addListenerOnce(map, 'idle', () => {
        setMapReady(true);
      });
    };

    initMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // コンパスボタンハンドラー
  const handleCompassToggle = useCallback(async () => {
    if (compassEnabled) {
      setCompassEnabled(false);
      setCompassStorage(orientation.permissionGranted, false);
    } else {
      if (needsPermission && !orientation.permissionGranted) {
        setShowDirectionDialog(true);
      } else {
        setCompassEnabled(true);
        setCompassStorage(true, true);
      }
    }
  }, [compassEnabled, needsPermission, orientation.permissionGranted]);

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission();
    setShowDirectionDialog(false);
    
    if (granted) {
      setCompassEnabled(true);
      setCompassStorage(true, true);
    }
  }, [requestPermission]);

  const handleDismissDialog = useCallback(() => {
    setShowDirectionDialog(false);
  }, []);

  // マップ中心の更新（初回のみ、または明示的なcenter変更時）
  useEffect(() => {
    if (mapInstanceRef.current && currentPosition && mapReady && isInitialized) {
      // 初回のみパン（位置が更新されるたびにパンしない）
      if (!geoLocation?.isDefault) {
        mapInstanceRef.current.panTo(currentPosition);
      }
    }
  }, [isInitialized, mapReady]); // currentPositionは依存から除外

  // 店舗マーカーの更新
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    touchAreasRef.current.forEach((circle) => circle.setMap(null));
    touchAreasRef.current = [];

    stores.forEach((store) => {
      const positionKey = `${store.latitude},${store.longitude}`;
      const samePositionStores = stores.filter(
        (s) => `${s.latitude},${s.longitude}` === positionKey
      );
      const indexAtPosition = samePositionStores.findIndex(
        (s) => s.id === store.id
      );

      let latOffset = 0;
      let lngOffset = 0;

      if (samePositionStores.length > 1) {
        const offsetDistance = 0.00008;
        const angle =
          (indexAtPosition * (360 / samePositionStores.length) * Math.PI) / 180;
        latOffset = Math.cos(angle) * offsetDistance;
        lngOffset = Math.sin(angle) * offsetDistance;
      }

      const position = {
        lat: Number(store.latitude) + latOffset,
        lng: Number(store.longitude) + lngOffset,
      };

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current!,
        title: store.name,
        icon: {
          url: getMarkerIcon(store.vacancy_status),
          scaledSize: new google.maps.Size(52, 52),
          anchor: new google.maps.Point(26, 26),
        },
        optimized: true,
        zIndex: 100,
        cursor: 'pointer',
        clickable: true,
      });

      marker.addListener('click', () => {
        if (onStoreClick) {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 700);
          onStoreClick(store);
        }
      });

      const touchArea = new google.maps.Circle({
        map: mapInstanceRef.current!,
        center: position,
        radius: 15,
        fillOpacity: 0,
        strokeOpacity: 0,
        clickable: true,
        zIndex: 99,
      });

      touchArea.addListener('click', () => {
        if (onStoreClick) {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 700);
          onStoreClick(store);
        }
      });

      markersRef.current.push(marker);
      touchAreasRef.current.push(touchArea);
    });
  }, [stores, onStoreClick, mapReady]);

  // 現在地マーカーの更新
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !currentPosition) return;

    const heading = orientation.permissionGranted ? orientation.alpha : 0;
    const accuracy = geoLocation?.accuracy || 30;
    const showBeam = compassEnabled && orientation.permissionGranted;

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    if (userBeamRef.current) userBeamRef.current.setMap(null);
    if (accuracyCircleRef.current) accuracyCircleRef.current.setMap(null);

    const { marker, accuracyCircle, beam } = createUserLocationMarker({
      map: mapInstanceRef.current,
      position: currentPosition,
      heading,
      accuracy,
      showDirectionBeam: showBeam,
    });

    userMarkerRef.current = marker;
    userBeamRef.current = beam;
    accuracyCircleRef.current = accuracyCircle;

    return () => {
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);
      if (userBeamRef.current) userBeamRef.current.setMap(null);
      if (accuracyCircleRef.current) accuracyCircleRef.current.setMap(null);
    };
  }, [currentPosition, orientation.permissionGranted, geoLocation?.accuracy, mapReady, compassEnabled]);

  // ビームのリアルタイム更新
  useEffect(() => {
    if (
      !userBeamRef.current ||
      !currentPosition ||
      !orientation.permissionGranted ||
      !compassEnabled
    )
      return;

    const newBeamPoints = calculateSimpleBeamPoints(currentPosition, orientation.alpha);
    userBeamRef.current.setPath(newBeamPoints);
  }, [orientation.alpha, currentPosition, orientation.permissionGranted, compassEnabled]);

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

  // 現在地に戻るハンドラー
  const handleCenterToUser = useCallback(() => {
    if (mapInstanceRef.current && currentPosition) {
      mapInstanceRef.current.panTo(currentPosition);
      mapInstanceRef.current.setZoom(16);
    }
  }, [currentPosition]);

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

      {/* コントロールボタン（LP統一デザイン） */}
      <div className="absolute bottom-32 right-4 z-10 flex flex-col gap-2">
        {/* 現在地ボタン */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCenterToUser}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: colors.surface,
            border: `1px solid ${colors.accentDark}60`,
            boxShadow: `0 2px 10px rgba(0,0,0,0.3)`,
          }}
          aria-label="現在地に戻る"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill={colors.accent} />
            <circle cx="12" cy="12" r="8" stroke={colors.accent} strokeWidth="1.5" fill="none" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={colors.accent} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.button>

        {/* コンパスON/OFFボタン */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCompassToggle}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: compassEnabled 
              ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`
              : colors.surface,
            border: compassEnabled 
              ? `1px solid ${colors.accent}`
              : `1px solid ${colors.accentDark}60`,
            boxShadow: compassEnabled 
              ? `0 0 15px ${colors.accent}40`
              : `0 2px 10px rgba(0,0,0,0.3)`,
          }}
          aria-label={compassEnabled ? '方向表示をオフ' : '方向表示をオン'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle 
              cx="12" cy="12" r="9" 
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
            border: `1px solid ${colors.accentDark}60`,
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
            border: `1px solid ${colors.accentDark}60`,
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

export default MapView;