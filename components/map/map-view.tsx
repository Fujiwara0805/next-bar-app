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
// localStorage ヘルパー
// ============================================================================

const COMPASS_STORAGE_KEY = 'nikenme_compass_permission';
const COMPASS_EXPIRY_MS = 30 * 60 * 1000;

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
// シンプルローディング画面
// ============================================================================

function MapLoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: '#1a1a1a' }}
    >
      <div className="text-center">
        {/* シンプルなスピナー */}
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div 
            className="absolute inset-0 rounded-full border-2 border-gray-700"
          />
          <div 
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 animate-spin"
          />
        </div>
        
        {/* テキスト */}
        <p className="text-gray-400 text-sm">
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
          background: 'rgba(30, 30, 30, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(251,191,36,0.2)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.1)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#FBBF24" strokeWidth="1.5" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">方向表示をオンにする</h4>
            <p className="text-gray-500 text-xs">あなたの向きをマップに表示</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-lg text-sm text-gray-400 transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            スキップ
          </button>
          <button
            onClick={onRequestPermission}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold text-black transition-colors"
            style={{ background: '#FBBF24' }}
          >
            オンにする
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// マップスタイル
// ============================================================================

const mediumMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1F2937' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#4B5563' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#D1D5DB' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#E5E7EB' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#2D4A4A' }, { visibility: 'simplified' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#4B5563' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#374151' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9CA3AF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#78716C' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#FCD34D' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#52525B' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#4B5563' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1E3A5F' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#60A5FA' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#3F3F46' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#374151' }] },
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

  // マップ中心の更新
  useEffect(() => {
    if (mapInstanceRef.current && currentPosition && mapReady) {
      mapInstanceRef.current.panTo(currentPosition);
    }
  }, [currentPosition, mapReady]);

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
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: compassEnabled ? '#FBBF24' : 'rgba(30,30,30,0.9)',
            border: compassEnabled ? '1px solid #FBBF24' : '1px solid rgba(255,255,255,0.1)',
          }}
          aria-label={compassEnabled ? '方向表示をオフ' : '方向表示をオン'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: compassEnabled ? '#000' : '#FBBF24' }}
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" fill="currentColor" />
          </svg>
        </motion.button>

        {/* ズームイン */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{
            background: 'rgba(30,30,30,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.8)',
          }}
          aria-label="ズームイン"
        >
          +
        </motion.button>

        {/* ズームアウト */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{
            background: 'rgba(30,30,30,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.8)',
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