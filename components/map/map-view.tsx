'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

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
}

interface DeviceOrientationState {
  alpha: number;
  permissionGranted: boolean;
  isSupported: boolean;
}

// ============================================================================
// localStorage ヘルパー（コンパス許可状態の保存・取得）
// ============================================================================

const COMPASS_STORAGE_KEY = 'nikenme_compass_permission';
const COMPASS_EXPIRY_MS = 30 * 60 * 1000; // 30分

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
    
    // 30分経過していたら無効
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
    // localStorage が使えない場合は無視
  }
}

// ============================================================================
// カスタムフック: useGeolocation
// ============================================================================

function useGeolocation(enabled: boolean = true) {
  const [location, setLocation] = useState<GeolocationState | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const smoothedLocationRef = useRef<{ lat: number; lng: number } | null>(null);
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

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      return;
    }

    setIsTracking(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading } = position.coords;
        const smoothed = smoothPosition(latitude, longitude);

        setLocation({
          latitude: smoothed.lat,
          longitude: smoothed.lng,
          accuracy,
          heading,
          timestamp: position.timestamp,
        });
        setError(null);
      },
      (err) => {
        setError(err);
        console.error('Geolocation error:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
    };
  }, [enabled, smoothPosition]);

  return { location, error, isTracking };
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
    // 権限が不要な環境（Android等）
    setOrientation((prev) => ({ ...prev, permissionGranted: true }));
    return true;
  }, []);

  // 外部から許可済みフラグを設定
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
// 現在地マーカー（シンプルな扇形ビーム）
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
    fillColor: '#F59E0B',
    fillOpacity: 0.1,
    strokeColor: '#F59E0B',
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
      fillColor: '#F59E0B',
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
      fillColor: '#F59E0B',
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
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
// ローディングコンポーネント（バー/スナック風）
// ============================================================================

function MapLoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } }}
      className="absolute inset-0 z-50 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0C0C0C 0%, #1A1A1A 50%, #0C0C0C 100%)',
      }}
    >
      {/* 背景のボケライト */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-80 h-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 60%)',
            top: '15%',
            left: '-10%',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute w-60 h-60 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(217,119,6,0.1) 0%, transparent 60%)',
            bottom: '20%',
            right: '-5%',
            filter: 'blur(50px)',
          }}
          animate={{
            scale: [1.1, 1, 1.1],
            x: [0, -15, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* メインコンテンツ */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
        {/* カクテルグラスアイコン */}
        <motion.div
          className="relative mb-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className="w-32 h-32 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 65%)',
                filter: 'blur(20px)',
              }}
            />
          </motion.div>

          <motion.svg
            width="100"
            height="100"
            viewBox="0 0 80 80"
            className="relative z-10"
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <defs>
              <linearGradient id="glassStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <linearGradient id="liquidFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.7" />
              </linearGradient>
              <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              d="M15 18 L65 18 L40 50 Z"
              fill="none"
              stroke="url(#glassStroke)"
              strokeWidth="2"
              strokeLinejoin="round"
              filter="url(#glowFilter)"
            />

            <motion.path
              d="M22 24 L58 24 L40 46 Z"
              fill="url(#liquidFill)"
              animate={{ opacity: [0.7, 0.9, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />

            <line
              x1="40" y1="50" x2="40" y2="65"
              stroke="url(#glassStroke)"
              strokeWidth="2"
              strokeLinecap="round"
              filter="url(#glowFilter)"
            />

            <path
              d="M30 65 L50 65"
              stroke="url(#glassStroke)"
              strokeWidth="2"
              strokeLinecap="round"
              filter="url(#glowFilter)"
            />

            <motion.g
              animate={{ y: [-1, 1, -1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <circle cx="40" cy="32" r="5" fill="#84CC16" opacity="0.9" />
              <circle cx="40" cy="32" r="2" fill="#DC2626" opacity="0.8" />
            </motion.g>

            <motion.path
              d="M25 22 L35 22"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1"
              strokeLinecap="round"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.svg>
        </motion.div>

        {/* テキスト */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <motion.h1
            className="text-3xl font-bold tracking-widest mb-3"
            style={{
              color: '#FBBF24',
              textShadow: `
                0 0 5px rgba(251,191,36,0.5),
                0 0 10px rgba(251,191,36,0.4),
                0 0 20px rgba(251,191,36,0.3),
                0 0 40px rgba(251,191,36,0.2)
              `,
            }}
            animate={{
              textShadow: [
                `0 0 5px rgba(251,191,36,0.5), 0 0 10px rgba(251,191,36,0.4), 0 0 20px rgba(251,191,36,0.3)`,
                `0 0 8px rgba(251,191,36,0.7), 0 0 15px rgba(251,191,36,0.5), 0 0 30px rgba(251,191,36,0.4)`,
                `0 0 5px rgba(251,191,36,0.5), 0 0 10px rgba(251,191,36,0.4), 0 0 20px rgba(251,191,36,0.3)`,
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            NIKENME+
          </motion.h1>

          <motion.p
            className="text-sm tracking-wider"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            近くのお店を探しています...
          </motion.p>
        </motion.div>

        {/* ローディングバー */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 w-48 h-0.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #FBBF24, transparent)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
        />
      </div>
    </motion.div>
  );
}

// ============================================================================
// 方向表示許可ダイアログ（z-index を高くして店舗カードより上に表示）
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
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="absolute bottom-28 left-4 right-4"
      style={{ zIndex: 9999 }} // 店舗カードより上に表示
    >
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(145deg, rgba(28,28,35,0.97) 0%, rgba(18,18,24,0.97) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(251,191,36,0.15)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(245,158,11,0.08)',
        }}
      >
        <div
          className="absolute top-0 left-8 right-8 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent)',
          }}
        />

        <div className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              className="relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(217,119,6,0.08) 100%)',
              }}
            >
              <motion.div
                className="absolute -top-3 left-1/2 -translate-x-1/2"
                animate={{ y: [-2, 2, -2], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                  <path d="M10 0 L0 14 L10 10 L20 14 Z" fill="url(#beamGrad)" opacity="0.8" />
                  <defs>
                    <linearGradient id="beamGrad" x1="10" y1="0" x2="10" y2="14" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FBBF24" />
                      <stop offset="1" stopColor="#FBBF24" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
              
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="7" y="4" width="10" height="16" rx="1.5" stroke="#FBBF24" strokeWidth="1.5" />
                <circle cx="12" cy="17" r="1" fill="#FBBF24" />
              </svg>
            </motion.div>

            <div className="flex-1">
              <h4 className="text-white font-bold text-[15px] mb-0.5">
                方向表示をオンにする
              </h4>
              <p className="text-gray-500 text-xs">
                あなたの向きをマップに表示
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              スキップ
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onRequestPermission}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                color: '#000',
                boxShadow: '0 4px 20px rgba(251,191,36,0.25)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              オンにする
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// マップスタイル定義
// ============================================================================

const mediumMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1F2937' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#4B5563' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#D1D5DB' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#E5E7EB' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#2D4A4A' }, { visibility: 'simplified' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#4B5563' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#374151' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#78716C' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#57534E' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#FCD34D' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#52525B' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#3F3F46' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#4B5563' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#4B5563' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#A5B4FC' }] },
  { featureType: 'transit.station', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1E3A5F' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#60A5FA' }] },
  { featureType: 'landscape.man_made', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#3F3F46' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#374151' }] },
];

// ============================================================================
// マーカーアイコンURL取得
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
  
  // コンパス表示のON/OFF状態
  const [compassEnabled, setCompassEnabled] = useState(false);

  const { location: geoLocation } = useGeolocation(enableLocationTracking);
  const { orientation, needsPermission, requestPermission, setPermissionGranted } =
    useDeviceOrientation(enableCompass);

  const currentPosition = useMemo(() => {
    if (center) return center;
    if (geoLocation) {
      return { lat: geoLocation.latitude, lng: geoLocation.longitude };
    }
    return { lat: 33.2382, lng: 131.6126 };
  }, [center, geoLocation]);

  // ============================================================================
  // 初期化時にlocalStorageから状態を復元
  // ============================================================================

  useEffect(() => {
    const stored = getCompassStorage();
    if (stored) {
      setCompassEnabled(stored.enabled);
      if (stored.granted) {
        setPermissionGranted(true);
      }
    }
  }, [setPermissionGranted]);

  // ============================================================================
  // Google Maps初期化
  // ============================================================================

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
        styles: mediumMapStyles,
        backgroundColor: '#374151',
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

  // ============================================================================
  // コンパスボタンのハンドラー
  // ============================================================================

  const handleCompassToggle = useCallback(async () => {
    if (compassEnabled) {
      // OFF にする
      setCompassEnabled(false);
      setCompassStorage(orientation.permissionGranted, false);
    } else {
      // ON にする
      if (needsPermission && !orientation.permissionGranted) {
        // iOS で許可が必要な場合はダイアログを表示
        setShowDirectionDialog(true);
      } else {
        // 許可不要 or 既に許可済みの場合はそのまま ON
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

  // ============================================================================
  // マップ中心の更新
  // ============================================================================

  useEffect(() => {
    if (mapInstanceRef.current && currentPosition && mapReady) {
      mapInstanceRef.current.panTo(currentPosition);
    }
  }, [currentPosition, mapReady]);

  // ============================================================================
  // 店舗マーカーの更新
  // ============================================================================

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

  // ============================================================================
  // 現在地マーカー（ビーム）の更新
  // ============================================================================

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !currentPosition) return;

    const heading = orientation.permissionGranted ? orientation.alpha : 0;
    const accuracy = geoLocation?.accuracy || 30;
    // コンパスが ON かつ 許可済みの場合のみビームを表示
    const showBeam = compassEnabled && orientation.permissionGranted;

    // 既存をクリア
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    if (userBeamRef.current) userBeamRef.current.setMap(null);
    if (accuracyCircleRef.current) accuracyCircleRef.current.setMap(null);

    // 新規作成
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

  // ============================================================================
  // ビームのリアルタイム更新
  // ============================================================================

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

  // ============================================================================
  // ズームハンドラー
  // ============================================================================

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

  const handleCenterOnUser = useCallback(() => {
    if (mapInstanceRef.current && currentPosition) {
      mapInstanceRef.current.panTo(currentPosition);
      mapInstanceRef.current.setZoom(16);
    }
  }, [currentPosition]);

  // ============================================================================
  // レンダリング
  // ============================================================================

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* ローディング */}
      <AnimatePresence>{loading && <MapLoadingScreen />}</AnimatePresence>

      {/* 方向表示許可ダイアログ */}
      <AnimatePresence>
        {showDirectionDialog && (
          <DirectionPermissionDialog
            onRequestPermission={handleRequestPermission}
            onDismiss={handleDismissDialog}
          />
        )}
      </AnimatePresence>

      {/* コントロールボタン */}
      <div className="absolute bottom-32 right-4 z-10 flex flex-col gap-2.5">
        {/* コンパスON/OFFボタン */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleCompassToggle}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: compassEnabled
              ? 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)'
              : 'linear-gradient(145deg, rgba(28,28,35,0.95) 0%, rgba(18,18,24,0.95) 100%)',
            backdropFilter: 'blur(12px)',
            border: compassEnabled
              ? '1px solid rgba(251,191,36,0.5)'
              : '1px solid rgba(255,255,255,0.08)',
            boxShadow: compassEnabled
              ? '0 4px 20px rgba(251,191,36,0.4)'
              : '0 4px 20px rgba(0,0,0,0.4)',
          }}
          aria-label={compassEnabled ? '方向表示をオフ' : '方向表示をオン'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: compassEnabled ? '#000' : '#FBBF24' }}
          >
            {/* コンパスアイコン */}
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M12 2v2M12 20v2M2 12h2M20 12h2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"
              fill="currentColor"
            />
          </svg>
        </motion.button>


        {/* ズームイン */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleZoomIn}
          className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-light"
          style={{
            background: 'linear-gradient(145deg, rgba(28,28,35,0.95) 0%, rgba(18,18,24,0.95) 100%)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.8)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
          aria-label="ズームイン"
        >
          +
        </motion.button>

        {/* ズームアウト */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleZoomOut}
          className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-light"
          style={{
            background: 'linear-gradient(145deg, rgba(28,28,35,0.95) 0%, rgba(18,18,24,0.95) 100%)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.8)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
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