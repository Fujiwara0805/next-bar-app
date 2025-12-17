'use client';

import { useEffect, useRef, useState } from 'react';
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
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

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

        // 既にスクリプトが読み込まれているかチェック
        if (window.google && window.google.maps) {
          console.log('Google Maps already loaded');
          if (!mapInstanceRef.current) {
            createMap();
          }
          return;
        }

        // 既にスクリプトタグが存在するかチェック
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
        // タッチ操作の最適化
        gestureHandling: 'greedy', // スクロールとピンチ操作を優先
        clickableIcons: false, // デフォルトのPOIアイコンを無効化
      });

      mapInstanceRef.current = map;
      setLoading(false);
      
      // マップが完全に初期化されたらフラグを立てる
      google.maps.event.addListenerOnce(map, 'idle', () => {
        console.log('Map is ready');
        setMapReady(true);
      });
    };

    initMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空の依存配列で初回のみ実行

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
      // 同じ位置のマーカー数をカウントしてオフセットを計算
      const positionKey = `${store.latitude},${store.longitude}`;
      const samePositionStores = stores.filter(s => 
        `${s.latitude},${s.longitude}` === positionKey
      );
      const indexAtPosition = samePositionStores.findIndex(s => s.id === store.id);

      // 同じ位置に複数店舗がある場合、円形にオフセットを追加
      let latOffset = 0;
      let lngOffset = 0;
      
      if (samePositionStores.length > 1) {
        const offsetDistance = 0.00008; // 約9m（マーカーが重ならない程度）
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
          scaledSize: new google.maps.Size(48, 48), // サイズを大きく（40→48）
          anchor: new google.maps.Point(24, 24), // アンカーも調整
        },
        optimized: true, // パフォーマンス改善のためtrueに変更
        zIndex: 100,
        cursor: 'pointer',
        // タップ領域を拡大
        clickable: true,
      });

      // タッチデバイス用の追加設定
      marker.addListener('click', () => {
        console.log('Store clicked:', store.name);
        if (onStoreClick) {
          // マーカークリック時にフィードバックを追加
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 700);
          onStoreClick(store);
        }
      });

      // タップ領域をさらに広げるために、見えない円形エリアを追加
      const touchArea = new google.maps.Circle({
        map: mapInstanceRef.current!,
        center: { 
          lat: Number(store.latitude) + latOffset, 
          lng: Number(store.longitude) + lngOffset 
        },
        radius: 10, // 10m半径のタップ可能エリア
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

  // 現在地マーカーの表示
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !center) {
      console.log('Cannot create user marker:', {
        hasMap: !!mapInstanceRef.current,
        mapReady,
        hasCenter: !!center
      });
      return;
    }

    console.log('Creating user marker at:', center);

    // 既存の現在地マーカーと円を削除
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
    }

    // 現在地の周りに円（精度範囲）を表示
    const accuracyCircle = new google.maps.Circle({
      map: mapInstanceRef.current,
      center: center,
      radius: 30,
      fillColor: '#4285F4',
      fillOpacity: 0.15,
      strokeColor: '#4285F4',
      strokeOpacity: 0.4,
      strokeWeight: 2,
    });
    accuracyCircleRef.current = accuracyCircle;

    // 現在地マーカーを作成（デフォルトスタイル）
    const userMarker = new google.maps.Marker({
      position: center,
      map: mapInstanceRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      title: '現在地',
      zIndex: 1000,
      animation: google.maps.Animation.DROP,
    });

    userMarkerRef.current = userMarker;

    console.log('User marker created successfully');

    // クリーンアップ関数
    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
      }
    };
  }, [center, mapReady]);

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
      {/* デバッグ情報 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-20 left-4 bg-black/70 text-white text-xs p-2 rounded z-50">
          <div>Map Ready: {mapReady ? '✓' : '✗'}</div>
          <div>Center: {center ? `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}` : 'None'}</div>
          <div>User Marker: {userMarkerRef.current ? '✓' : '✗'}</div>
        </div>
      )}
    </div>
  );
}