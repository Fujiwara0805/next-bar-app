'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

interface MapViewProps {
  stores: Store[];
  center?: { lat: number; lng: number };
  onStoreClick?: (store: Store) => void;
}

export function MapView({ stores, center, onStoreClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const headingMarkerRef = useRef<google.maps.Marker | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [orientationPermission, setOrientationPermission] = useState<'granted' | 'denied' | 'prompt' | 'not-supported'>('prompt');
  const [needsPermissionRequest, setNeedsPermissionRequest] = useState(false);

  // デバイスの向きリスナーを開始
  const startOrientationListener = useCallback(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      let newHeading: number | null = null;
      
      if ((event as any).webkitCompassHeading !== undefined) {
        // iOS: webkitCompassHeading は北からの時計回りの角度
        newHeading = (event as any).webkitCompassHeading;
      } else if (event.alpha !== null) {
        // Android: alpha は北からの反時計回りの角度
        newHeading = 360 - event.alpha;
      }
      
      if (newHeading !== null) {
        setHeading(newHeading);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // デバイスの向き許可をリクエスト
  const requestOrientationPermission = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    const DeviceOrientationEventConstructor = window.DeviceOrientationEvent as any;
    
    if (typeof DeviceOrientationEventConstructor?.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEventConstructor.requestPermission();
        setOrientationPermission(permission);
        if (permission === 'granted') {
          startOrientationListener();
        }
      } catch (error) {
        console.error('Orientation permission error:', error);
        setOrientationPermission('denied');
      }
    }
  }, [startOrientationListener]);

  // 初回マウント時に許可状態をチェック（クライアントサイドのみ）
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const DeviceOrientationEventConstructor = window.DeviceOrientationEvent as any;

    // DeviceOrientationEvent がサポートされているかチェック
    if (!DeviceOrientationEventConstructor) {
      setOrientationPermission('not-supported');
      return;
    }

    // iOS 13+ では明示的な許可が必要
    if (typeof DeviceOrientationEventConstructor.requestPermission === 'function') {
      setNeedsPermissionRequest(true);
      // 許可状態は不明なので prompt のまま
    } else {
      // Android や古いブラウザは許可不要
      setOrientationPermission('granted');
      setNeedsPermissionRequest(false);
      const cleanup = startOrientationListener();
      return cleanup;
    }
  }, [startOrientationListener]);

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

  // 現在地マーカーの表示（方向ビーコン付き）
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !center) {
      return;
    }

    console.log('Creating user marker at:', center);

    // 既存のマーカーと円を削除
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }
    if (headingMarkerRef.current) {
      headingMarkerRef.current.setMap(null);
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
    }

    // 精度範囲の円
    const accuracyCircle = new google.maps.Circle({
      map: mapInstanceRef.current,
      center: center,
      radius: 100,
      fillColor: '#4285F4',
      fillOpacity: 0.15,
      strokeColor: '#4285F4',
      strokeOpacity: 0.4,
      strokeWeight: 2,
    });
    accuracyCircleRef.current = accuracyCircle;

    // 方向ビーコン（扇形）- headingがある場合のみ表示
    if (heading !== null) {
      const headingMarker = new google.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        icon: {
          path: 'M 0,-20 L 12,0 L 0,-5 L -12,0 Z',
          fillColor: '#4285F4',
          fillOpacity: 0.4,
          strokeColor: '#4285F4',
          strokeWeight: 1,
          scale: 1.5,
          rotation: heading,
          anchor: new google.maps.Point(0, 0),
        },
        zIndex: 999,
      });
      headingMarkerRef.current = headingMarker;
    }

    // 現在地の中心点
    const userMarker = new google.maps.Marker({
      position: center,
      map: mapInstanceRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: '現在地',
      zIndex: 1000,
    });
    userMarkerRef.current = userMarker;

    console.log('User marker created with heading:', heading);

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
      if (headingMarkerRef.current) {
        headingMarkerRef.current.setMap(null);
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
      }
    };
  }, [center, mapReady, heading]);

  // 方向だけが変わった時のマーカー回転更新
  useEffect(() => {
    if (headingMarkerRef.current && heading !== null) {
      headingMarkerRef.current.setIcon({
        path: 'M 0,-20 L 12,0 L 0,-5 L -12,0 Z',
        fillColor: '#4285F4',
        fillOpacity: 0.4,
        strokeColor: '#4285F4',
        strokeWeight: 1,
        scale: 1.5,
        rotation: heading,
        anchor: new google.maps.Point(0, 0),
      });
    }
  }, [heading]);

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

      {/* 方角許可リクエストボタン（iOSの場合） */}
      {needsPermissionRequest && orientationPermission === 'prompt' && (
        <button
          onClick={requestOrientationPermission}
          className="absolute top-4 right-4 z-50 bg-white shadow-lg rounded-full p-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
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
          <div>Heading: {heading !== null ? `${heading.toFixed(0)}°` : 'N/A'}</div>
          <div>Orientation: {orientationPermission}</div>
        </div>
      )}
    </div>
  );
}