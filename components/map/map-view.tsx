'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

interface MapViewProps {
  stores: Store[];
  center?: { lat: number; lng: number };
  onStoreClick?: (store: Store) => void;
}

// LP画面のテーマカラー（アンバー/インディゴ）を活かしたミディアムテーマスタイル
const mediumMapStyles: google.maps.MapTypeStyle[] = [
  // 全体の基本色 - ミディアムグレーベース
  {
    elementType: 'geometry',
    stylers: [{ color: '#374151' }],
  },
  // ラベル（テキスト）のアイコンを非表示
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  // ラベルのテキスト
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9CA3AF' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1F2937' }],
  },
  // 行政区域
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#4B5563' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#D1D5DB' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#E5E7EB' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9CA3AF' }],
  },
  // POI（店舗、ビジネス等）を完全に非表示
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#2D4A4A' }, { visibility: 'simplified' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  // 道路 - ミディアムグレー
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#4B5563' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#374151' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9CA3AF' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#78716C' }], // ウォームグレー
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#57534E' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#FCD34D' }], // アンバー系
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#52525B' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3F3F46' }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#4B5563' }],
  },
  // 交通機関
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#4B5563' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A5B4FC' }], // インディゴ系
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  // 水域 - ダークブルーグレー
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#1E3A5F' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#60A5FA' }],
  },
  // ランドマーク非表示
  {
    featureType: 'landscape.man_made',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: '#3F3F46' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#374151' }],
  },
];

export function MapView({ stores, center, onStoreClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const touchAreasRef = useRef<google.maps.Circle[]>([]);
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

      const defaultCenter = center || { lat: 33.2382, lng: 131.6126 };
      console.log('Creating map with center:', defaultCenter);

      const map = new google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 15,
        disableDefaultUI: true, // デフォルトUIを無効化
        zoomControl: false, // ズームコントロールも非表示（カスタムで追加）
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        scaleControl: false,
        rotateControl: false,
        // タッチ操作の最適化
        gestureHandling: 'greedy',
        clickableIcons: false, // デフォルトのPOIアイコンを無効化
        // ミディアムテーマスタイルを適用
        styles: mediumMapStyles,
        // 背景色をミディアムカラーに
        backgroundColor: '#374151',
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

    // 既存のマーカーとタッチエリアをクリア
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    touchAreasRef.current.forEach((circle) => circle.setMap(null));
    touchAreasRef.current = [];

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
        const offsetDistance = 0.00008;
        const angle = (indexAtPosition * (360 / samePositionStores.length)) * (Math.PI / 180);
        latOffset = Math.cos(angle) * offsetDistance;
        lngOffset = Math.sin(angle) * offsetDistance;
      }

      const position = { 
        lat: Number(store.latitude) + latOffset, 
        lng: Number(store.longitude) + lngOffset 
      };

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current!,
        title: store.name,
        icon: {
          url: getMarkerIcon(store.vacancy_status),
          scaledSize: new google.maps.Size(52, 52), // さらに大きく
          anchor: new google.maps.Point(26, 26),
        },
        optimized: true,
        zIndex: 100,
        cursor: 'pointer',
        clickable: true,
      });

      // クリックイベント
      marker.addListener('click', () => {
        console.log('Store clicked:', store.name);
        if (onStoreClick) {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 700);
          onStoreClick(store);
        }
      });

      // タップ領域を広げる透明な円
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
        console.log('Touch area clicked:', store.name);
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

  // 現在地マーカーの表示 - LP画面のアンバーカラーを使用
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !center) {
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

    // 現在地の周りに円（精度範囲）- アンバーカラーで統一（ミディアムテーマ用）
    const accuracyCircle = new google.maps.Circle({
      map: mapInstanceRef.current,
      center: center,
      radius: 30,
      fillColor: '#F59E0B', // LP画面のアンバーカラー
      fillOpacity: 0.15,
      strokeColor: '#FBBF24',
      strokeOpacity: 0.5,
      strokeWeight: 2,
    });
    accuracyCircleRef.current = accuracyCircle;

    // 現在地マーカー - アンバーカラー（ミディアムテーマ用）
    const userMarker = new google.maps.Marker({
      position: center,
      map: mapInstanceRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#F59E0B', // LP画面のアンバーカラー
        fillOpacity: 1,
        strokeColor: '#1F2937', // ダークストローク
        strokeWeight: 3,
      },
      title: '現在地',
      zIndex: 1000,
      animation: google.maps.Animation.DROP,
    });

    userMarkerRef.current = userMarker;

    console.log('User marker created successfully');

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
      
      {/* ローディング - ミディアムテーマスタイル */}
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{
            background: 'linear-gradient(180deg, #1F2937 0%, #374151 50%, #1F2937 100%)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            {/* パルスするロゴ風アニメーション */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(245,158,11,0.3)',
                  '0 0 40px rgba(245,158,11,0.5)',
                  '0 0 20px rgba(245,158,11,0.3)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full"
              />
            </motion.div>
            <p
              className="text-sm font-bold tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              マップを読み込み中...
            </p>
          </motion.div>
        </div>
      )}

      {/* ズームコントロール - ミディアムテーマ */}
      <div className="absolute bottom-32 right-4 z-10 flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (mapInstanceRef.current) {
              const currentZoom = mapInstanceRef.current.getZoom() || 15;
              mapInstanceRef.current.setZoom(currentZoom + 1);
            }
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-lg"
          style={{
            background: 'rgba(55,65,81,0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#E5E7EB',
          }}
        >
          +
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (mapInstanceRef.current) {
              const currentZoom = mapInstanceRef.current.getZoom() || 15;
              mapInstanceRef.current.setZoom(currentZoom - 1);
            }
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-lg"
          style={{
            background: 'rgba(55,65,81,0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#E5E7EB',
          }}
        >
          −
        </motion.button>
      </div>
    </div>
  );
}