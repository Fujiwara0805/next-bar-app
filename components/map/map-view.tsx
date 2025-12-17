'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

interface MapViewProps {
  stores: Store[];
  center?: { lat: number; lng: number };
  onStoreClick?: (store: Store) => void;
}

// 🔥 方角付き現在地マーカーアイコンを作成
const createDirectionalLocationIcon = (heading: number | null): google.maps.Icon => {
  const size = 40;
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = 16;
  const innerRadius = 8;
  const angle = heading !== null ? heading : 0;
  const angleRad = (angle - 90) * Math.PI / 180;
  const tipX = centerX + Math.cos(angleRad) * outerRadius;
  const tipY = centerY + Math.sin(angleRad) * outerRadius;
  const baseAngle1 = angleRad + Math.PI * 0.75;
  const baseAngle2 = angleRad - Math.PI * 0.75;
  const baseRadius = innerRadius + 3;
  const base1X = centerX + Math.cos(baseAngle1) * baseRadius;
  const base1Y = centerY + Math.sin(baseAngle1) * baseRadius;
  const base2X = centerX + Math.cos(baseAngle2) * baseRadius;
  const base2Y = centerY + Math.sin(baseAngle2) * baseRadius;
  
  // 方角がある場合は矢印を表示
  const directionIndicator = heading !== null 
    ? `<polygon points="${tipX},${tipY} ${base1X},${base1Y} ${base2X},${base2Y}" fill="#4285F4" fill-opacity="0.5"/>`
    : '';
  
  const svgIcon = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/>
      </filter>
    </defs>
    ${directionIndicator}
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="white" filter="url(#shadow)"/>
    <circle cx="${centerX}" cy="${centerY}" r="${innerRadius - 2.5}" fill="#4285F4"/>
  </svg>`;
  
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  };
};

export function MapView({ stores, center, onStoreClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [needsOrientationPermission, setNeedsOrientationPermission] = useState(false);
  const lastHeadingRef = useRef<number | null>(null);

  // 🔥 デバイスの向きハンドラー
  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
    let heading: number | null = null;
    
    // iOS: webkitCompassHeading
    if ('webkitCompassHeading' in event && typeof (event as any).webkitCompassHeading === 'number') {
      heading = (event as any).webkitCompassHeading;
    } 
    // Android: alpha
    else if (event.alpha !== null) {
      heading = 360 - event.alpha;
    }
    
    if (heading !== null) {
      // 🔥 5度以上変化した場合のみ更新（チカチカ防止）
      if (lastHeadingRef.current === null || Math.abs(heading - lastHeadingRef.current) > 5) {
        lastHeadingRef.current = heading;
        setDeviceHeading(heading);
      }
    }
  }, []);

  // 🔥 デバイスの向きを取得（SSR対策済み）
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // iOS 13+ では明示的な許可が必要
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      setNeedsOrientationPermission(true);
    } else {
      // Android や古いブラウザは許可不要
      window.addEventListener('deviceorientation', handleDeviceOrientation, true);
    }
    
    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    };
  }, [handleDeviceOrientation]);

  // 🔥 方角の許可をリクエスト（iOSボタン用）
  const handleRequestOrientationPermission = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      if (permission === 'granted') {
        setNeedsOrientationPermission(false);
        window.addEventListener('deviceorientation', handleDeviceOrientation, true);
      }
    } catch (error) {
      console.error('DeviceOrientation permission denied:', error);
    }
  };

  // Google Maps初期化（初回のみ）
  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key not found');
          setLoading(false);
          return;
        }

        if (window.google && window.google.maps) {
          console.log('Google Maps already loaded');
          if (!mapInstanceRef.current) {
            createMap();
          }
          return;
        }

        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          console.log('Google Maps script tag already exists, waiting for load...');
          const checkGoogle = setInterval(() => {
            if (window.google && window.google.maps) {
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

        script.onload = () => {
          console.log('Google Maps script loaded');
          createMap();
        };

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

      const defaultCenter = center || { lat: 35.6812, lng: 139.7671 };
      console.log('Creating map with center:', defaultCenter);

      const map = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 14,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        clickableIcons: false,
      });

      mapInstanceRef.current = map;
      setLoading(false);
      
      google.maps.event.addListenerOnce(map, 'idle', () => {
        console.log('Map is ready');
        setMapReady(true);
      });
    };

    initMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // centerが変更されたときにマップの中心を更新
  useEffect(() => {
    if (mapInstanceRef.current && center && mapReady) {
      console.log('Updating map center:', center);
      mapInstanceRef.current.panTo(center);
    }
  }, [center, mapReady]);

  // 店舗マーカーの表示
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    console.log('Updating store markers:', stores.length);

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    stores.forEach((store) => {
      const positionKey = `${store.latitude},${store.longitude}`;
      const samePositionStores = stores.filter(s => 
        `${s.latitude},${s.longitude}` === positionKey
      );
      const indexAtPosition = samePositionStores.findIndex(s => s.id === store.id);

      let latOffset = 0;
      let lngOffset = 0;
      
      if (samePositionStores.length > 1) {
        const offsetDistance = 0.00008;
        const angle = (indexAtPosition * (360 / samePositionStores.length)) * (Math.PI / 180);
        latOffset = Math.cos(angle) * offsetDistance;
        lngOffset = Math.sin(angle) * offsetDistance;
      }

      const marker = new google.maps.Marker({
        position: { 
          lat: Number(store.latitude) + latOffset, 
          lng: Number(store.longitude) + lngOffset 
        },
        map: mapInstanceRef.current!,
        title: store.name,
        icon: {
          url: getMarkerIcon(store.vacancy_status),
          scaledSize: new google.maps.Size(48, 48),
          anchor: new google.maps.Point(24, 24),
        },
        optimized: true,
        zIndex: 100,
        cursor: 'pointer',
        clickable: true,
      });

      marker.addListener('click', () => {
        console.log('Store clicked:', store.name);
        if (onStoreClick) {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 700);
          onStoreClick(store);
        }
      });

      const touchArea = new google.maps.Circle({
        map: mapInstanceRef.current!,
        center: { 
          lat: Number(store.latitude) + latOffset, 
          lng: Number(store.longitude) + lngOffset 
        },
        radius: 10,
        fillOpacity: 0,
        strokeOpacity: 0,
        clickable: true,
        zIndex: 99,
      });

      touchArea.addListener('click', () => {
        console.log('Touch area clicked:', store.name);
        if (onStoreClick) {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 700);
          onStoreClick(store);
        }
      });

      markersRef.current.push(marker);
    });
  }, [stores, onStoreClick, mapReady]);

  // 🔥 現在地マーカーの初期作成（centerが変わった時のみ）
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !center) {
      return;
    }

    // 🔥 精度範囲の円は一度だけ作成または位置更新
    if (!accuracyCircleRef.current) {
      const accuracyCircle = new google.maps.Circle({
        map: mapInstanceRef.current,
        center: center,
        radius: 30,
        fillColor: '#4285F4',
        fillOpacity: 0.1,
        strokeColor: '#4285F4',
        strokeOpacity: 0.3,
        strokeWeight: 1,
      });
      accuracyCircleRef.current = accuracyCircle;
    } else {
      accuracyCircleRef.current.setCenter(center);
    }

    // 🔥 マーカーは一度だけ作成または位置更新
    if (!userMarkerRef.current) {
      const directionalIcon = createDirectionalLocationIcon(deviceHeading);
      const userMarker = new google.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        icon: directionalIcon,
        title: '現在地',
        zIndex: 9999,
      });
      userMarkerRef.current = userMarker;
    } else {
      userMarkerRef.current.setPosition(center);
    }

    console.log('User marker position updated:', center);
  }, [center, mapReady]);

  // 🔥 方角が変わった時はアイコンのみ更新（チカチカ防止）
  useEffect(() => {
    if (!userMarkerRef.current || !window.google?.maps) return;
    
    const directionalIcon = createDirectionalLocationIcon(deviceHeading);
    userMarkerRef.current.setIcon(directionalIcon);
  }, [deviceHeading]);

  // 🔥 クリーンアップ
  useEffect(() => {
    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
        userMarkerRef.current = null;
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
        accuracyCircleRef.current = null;
      }
    };
  }, []);

  const getMarkerIcon = (status: string) => {
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

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">地図を読み込み中...</p>
          </div>
        </div>
      )}

      {/* 🔥 方角許可リクエストボタン（iOSの場合のみ・左下に配置） */}
      {needsOrientationPermission && (
        <button
          onClick={handleRequestOrientationPermission}
          className="absolute bottom-4 left-4 z-50 bg-white shadow-lg rounded-full p-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-200"
        >
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          方角を有効化
        </button>
      )}

      {/* デバッグ情報 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-20 left-4 bg-black/70 text-white text-xs p-2 rounded z-50">
          <div>Map Ready: {mapReady ? '✓' : '✗'}</div>
          <div>Center: {center ? `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}` : 'None'}</div>
          <div>User Marker: {userMarkerRef.current ? '✓' : '✗'}</div>
          <div>Heading: {deviceHeading !== null ? `${deviceHeading.toFixed(0)}°` : 'N/A'}</div>
          <div>Needs Permission: {needsOrientationPermission ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
}