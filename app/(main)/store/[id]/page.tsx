/**
 * ============================================
 * ファイルパス: app/(main)/store/[id]/page.tsx
 * 
 * 機能: 店舗詳細ページ（ラグジュアリーデザイン版）
 *       - ディープネイビー × シャンパンゴールドの高級感
 *       - Google Place Photos の遅延読み込み・キャッシュ最適化
 *       - スケルトンローディングによるUX向上
 *       - 画像フルスクリーン表示（ライトボックス）
 * ============================================
 */

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Clock,
  Users,
  Phone,
  CreditCard,
  Wifi,
  DollarSign,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  PenLine,
  User,
  Image as ImageIcon,
  Ticket,
  Sparkles,
  Expand,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useLanguage } from '@/lib/i18n/context';
import { InstantReservationButton } from '@/components/instant-reservation-button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CouponDisplayModal } from '@/components/store/CouponDisplayModal';
import { isCouponValid, type CouponData } from '@/lib/types/coupon';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

type Store = Database['public']['Tables']['stores']['Row'];

// ============================================
// カラーパレット定義（コンシェルジュモーダル準拠）
// ============================================
const COLORS = {
  // プライマリ
  deepNavy: '#0A1628',
  midnightBlue: '#162447',
  royalNavy: '#1F4068',
  
  // アクセント
  champagneGold: '#C9A86C',
  paleGold: '#E8D5B7',
  antiqueGold: '#B8956E',
  
  // ニュートラル
  charcoal: '#2D3436',
  warmGray: '#636E72',
  platinum: '#DFE6E9',
  ivory: '#FDFBF7',
  
  // グラデーション
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
};

/** 自動スライドの間隔（ミリ秒） */
const AUTO_SLIDE_INTERVAL = 3000;

/** 写真キャッシュ（セッション中有効） */
const photoCache = new Map<string, string[]>();

/**
 * Google Maps口コミ投稿URLを生成
 */
const generateReviewUrl = (placeId: string): string => {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
};

/**
 * スケルトンローディングコンポーネント
 */
const Skeleton = ({ className }: { className?: string }) => (
  <div 
    className={`animate-pulse rounded-lg ${className}`}
    style={{ backgroundColor: 'rgba(201, 168, 108, 0.1)' }}
  />
);

/**
 * 写真グリッドスケルトン
 */
const PhotoGridSkeleton = () => (
  <div className="grid grid-cols-2 gap-2">
    {[0, 1].map((i) => (
      <Skeleton key={i} className="aspect-square" />
    ))}
  </div>
);

/**
 * ゴールド装飾ディバイダー
 */
const GoldDivider = () => (
  <div className="flex items-center justify-center gap-3 my-4">
    <div 
      className="h-px flex-1 max-w-12"
      style={{ background: `linear-gradient(90deg, transparent, ${COLORS.champagneGold}30)` }}
    />
    <div 
      className="w-1 h-1 rotate-45"
      style={{ backgroundColor: COLORS.champagneGold }}
    />
    <div 
      className="h-px flex-1 max-w-12"
      style={{ background: `linear-gradient(90deg, ${COLORS.champagneGold}30, transparent)` }}
    />
  </div>
);

export default function StoreDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [placePhotos, setPlacePhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photosRequested, setPhotosRequested] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showCouponModal, setShowCouponModal] = useState(false);
  
  // ライトボックス用の状態
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  
  // 自動スライド用のタイマーRef
  const autoSlideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const photoCarouselTimerRef = useRef<NodeJS.Timeout | null>(null);
  const photoSectionRef = useRef<HTMLDivElement>(null);
  
  // ホバー状態
  const [isHovering, setIsHovering] = useState(false);
  const [isPhotoHovering, setIsPhotoHovering] = useState(false);

  // ============================================
  // ライトボックスを開く・閉じる関数
  // ============================================
  const openLightbox = useCallback((images: string[], index: number) => {
    // 先に状態をリセットしてから開く
    setLightboxOpen(false);
    // 次のレンダリングサイクルで新しい値をセット
    setTimeout(() => {
      setLightboxImages(images);
      setLightboxInitialIndex(index);
      setLightboxOpen(true);
    }, 10);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    // 閉じた後に状態をリセット
    setTimeout(() => {
      setLightboxImages([]);
      setLightboxInitialIndex(0);
    }, 300); // アニメーション完了後にリセット
  }, []);

  // ============================================
  // 位置情報の読み込み
  // ============================================
  const loadUserLocation = useCallback(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setUserLocation(location);
        return;
      } catch (e) {
        console.error('Failed to parse saved location');
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          localStorage.setItem('userLocation', JSON.stringify(location));
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation({ lat: 33.2382, lng: 131.6126 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setUserLocation({ lat: 33.2382, lng: 131.6126 });
    }
  }, []);

  // ============================================
  // 距離計算
  // ============================================
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const calculateWalkingTime = useCallback((distanceKm: number): number => {
    const walkingSpeedKmPerHour = 4;
    const walkingTimeMinutes = (distanceKm / walkingSpeedKmPerHour) * 60;
    return Math.round(walkingTimeMinutes);
  }, []);

  // ============================================
  // Google Place Photos 取得（キャッシュ対応・遅延読み込み）
  // ============================================
  const fetchPlacePhotos = useCallback(async (placeId: string) => {
    // キャッシュチェック
    if (photoCache.has(placeId)) {
      setPlacePhotos(photoCache.get(placeId)!);
      return;
    }

    setLoadingPhotos(true);
    try {
      const response = await fetch(`/api/stores/place-photos?placeId=${encodeURIComponent(placeId)}`);
      if (!response.ok) throw new Error('Failed to fetch place photos');
      
      const data = await response.json();
      if (data.photos && Array.isArray(data.photos)) {
        // キャッシュに保存
        photoCache.set(placeId, data.photos);
        setPlacePhotos(data.photos);
        
        // 画像のプリロード（最初の4枚）
        data.photos.slice(0, 4).forEach((url: string) => {
          const img = new Image();
          img.src = url;
        });
      }
    } catch (error) {
      console.error('Error fetching place photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  // ============================================
  // Intersection Observer で写真セクションの遅延読み込み
  // ============================================
  useEffect(() => {
    if (!store?.google_place_id || photosRequested) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && store.google_place_id) {
            setPhotosRequested(true);
            fetchPlacePhotos(store.google_place_id);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    if (photoSectionRef.current) {
      observer.observe(photoSectionRef.current);
    }

    return () => observer.disconnect();
  }, [store?.google_place_id, photosRequested, fetchPlacePhotos]);

  // ============================================
  // 店舗データ取得
  // ============================================
  const fetchStore = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const storeData = data as Store;
        setStore(storeData);
        setImageUrls(storeData.image_urls || []);
        
        // バックグラウンドでis_openを更新
        if (storeData.google_place_id) {
          fetch(`/api/stores/update-is-open?storeId=${id}`, { method: 'GET' })
            .then((res) => res.json())
            .catch(console.warn);
        }
      }
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchStore(params.id as string);
    }
    loadUserLocation();
  }, [params.id, fetchStore, loadUserLocation]);

  useEffect(() => {
    if (store && userLocation) {
      const dist = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        Number(store.latitude),
        Number(store.longitude)
      );
      setDistance(dist);
    }
  }, [store, userLocation, calculateDistance]);

  // ============================================
  // 自動スライド機能
  // ============================================
  const resetAutoSlideTimer = useCallback(() => {
    if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current);
    
    if (imageUrls.length > 1 && !isHovering) {
      autoSlideTimerRef.current = setInterval(() => {
        setSelectedImageIndex((prev) => (prev + 1) % imageUrls.length);
      }, AUTO_SLIDE_INTERVAL);
    }
  }, [imageUrls.length, isHovering]);

  useEffect(() => {
    if (imageUrls.length > 1 && !isHovering) {
      autoSlideTimerRef.current = setInterval(() => {
        setSelectedImageIndex((prev) => (prev + 1) % imageUrls.length);
      }, AUTO_SLIDE_INTERVAL);
    }
    return () => {
      if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current);
    };
  }, [imageUrls.length, isHovering]);

  // 写真カルーセル
  const resetPhotoCarouselTimer = useCallback(() => {
    if (photoCarouselTimerRef.current) clearInterval(photoCarouselTimerRef.current);
    
    const pairsCount = Math.ceil(placePhotos.length / 2);
    if (pairsCount > 1 && !isPhotoHovering) {
      photoCarouselTimerRef.current = setInterval(() => {
        setSelectedPhotoIndex((prev) => (prev + 1) % pairsCount);
      }, AUTO_SLIDE_INTERVAL);
    }
  }, [placePhotos.length, isPhotoHovering]);

  useEffect(() => {
    const pairsCount = Math.ceil(placePhotos.length / 2);
    if (pairsCount > 1 && !isPhotoHovering) {
      photoCarouselTimerRef.current = setInterval(() => {
        setSelectedPhotoIndex((prev) => (prev + 1) % pairsCount);
      }, AUTO_SLIDE_INTERVAL);
    }
    return () => {
      if (photoCarouselTimerRef.current) clearInterval(photoCarouselTimerRef.current);
    };
  }, [placePhotos.length, isPhotoHovering]);

  const nextPhotoPair = () => {
    const pairsCount = Math.ceil(placePhotos.length / 2);
    setSelectedPhotoIndex((prev) => (prev + 1) % pairsCount);
    resetPhotoCarouselTimer();
  };

  const prevPhotoPair = () => {
    const pairsCount = Math.ceil(placePhotos.length / 2);
    setSelectedPhotoIndex((prev) => (prev - 1 + pairsCount) % pairsCount);
    resetPhotoCarouselTimer();
  };

  const goToPhotoPair = (index: number) => {
    setSelectedPhotoIndex(index);
    resetPhotoCarouselTimer();
  };

  // ============================================
  // ヘルパー関数
  // ============================================
  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant': return t('map.vacant');
      case 'full': return t('map.full');
      case 'open': return t('map.open');
      case 'closed': return t('map.closed');
      default: return t('map.unknown');
    }
  };

  const getVacancyIcon = (status: string) => {
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
        return '';
    }
  };

  const formatBusinessHours = (hours: any) => {
    if (!hours) return t('store_detail.no_info');
    if (typeof hours === 'string') return hours;
    
    const dayLabels: any = {
      monday: '月', tuesday: '火', wednesday: '水', thursday: '木',
      friday: '金', saturday: '土', sunday: '日'
    };

    return Object.entries(hours).map(([day, time]: any) => {
      if (time.closed) return `${dayLabels[day]}: 定休日`;
      if (time.open && time.close) return `${dayLabels[day]}: ${time.open} - ${time.close}`;
      return null;
    }).filter(Boolean).join(', ') || t('store_detail.no_info');
  };

  // ============================================
  // ローディング画面
  // ============================================
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: COLORS.luxuryGradient }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-10 h-10" style={{ color: COLORS.champagneGold }} />
        </motion.div>
      </div>
    );
  }

  if (!store) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: COLORS.luxuryGradient }}
      >
        <p className="text-lg font-bold mb-4" style={{ color: COLORS.ivory }}>
          {t('store_detail.not_found')}
        </p>
        <Button 
          onClick={() => router.back()} 
          className="font-bold"
          style={{ background: COLORS.goldGradient, color: COLORS.deepNavy }}
        >
          {t('store_detail.back')}
        </Button>
      </div>
    );
  }

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % imageUrls.length);
    resetAutoSlideTimer();
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
    resetAutoSlideTimer();
  };

  const goToImage = (index: number) => {
    setSelectedImageIndex(index);
    resetAutoSlideTimer();
  };

  return (
    <div 
      className="min-h-screen pb-6"
      style={{ background: COLORS.cardGradient }}
    >
      {/* ヘッダー */}
      <header 
        className="sticky top-0 z-10 safe-top"
        style={{ 
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="flex items-center justify-center p-4 relative">
          <h1 
            className="text-lg font-light tracking-widest"
            style={{ color: COLORS.ivory }}
          >
            {t('store_detail.title')}
          </h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push('/map?refresh=true')}
            className="rounded-full absolute right-4"
            style={{ color: COLORS.warmGray }}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="px-4 pb-2">
          <Breadcrumbs storeName={store.name} />
        </div>
      </header>

      <div className="p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* 店舗画像カルーセル */}
          {imageUrls.length > 0 && (
            <div 
              className="relative w-full h-80 mb-4 rounded-2xl overflow-hidden shadow-xl group cursor-pointer"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onTouchStart={() => setIsHovering(true)}
              onTouchEnd={() => setTimeout(() => setIsHovering(false), 1000)}
              style={{ border: `1px solid rgba(201, 168, 108, 0.2)` }}
              onClick={() => openLightbox(imageUrls, selectedImageIndex)}
              role="button"
              tabIndex={0}
              aria-label="画像を拡大表示"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openLightbox(imageUrls, selectedImageIndex);
                }
              }}
            >
              <motion.img
                key={selectedImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={imageUrls[selectedImageIndex]}
                alt={`${store.name} - ${selectedImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* 拡大アイコンオーバーレイ */}
              <div 
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ backgroundColor: 'rgba(10, 22, 40, 0.3)' }}
              >
                <div 
                  className="p-3 rounded-full"
                  style={{ 
                    backgroundColor: 'rgba(10, 22, 40, 0.8)',
                    border: `1px solid rgba(201, 168, 108, 0.3)`,
                  }}
                >
                  <Expand className="w-6 h-6" style={{ color: COLORS.champagneGold }} />
                </div>
              </div>
              
              {imageUrls.length > 1 && (
                <>
                  <Button
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    style={{ 
                      backgroundColor: 'rgba(10, 22, 40, 0.8)',
                      color: COLORS.champagneGold,
                      border: `1px solid rgba(201, 168, 108, 0.3)`,
                    }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    style={{ 
                      backgroundColor: 'rgba(10, 22, 40, 0.8)',
                      color: COLORS.champagneGold,
                      border: `1px solid rgba(201, 168, 108, 0.3)`,
                    }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {imageUrls.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToImage(index);
                        }}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: index === selectedImageIndex ? '24px' : '8px',
                          backgroundColor: index === selectedImageIndex 
                            ? COLORS.champagneGold 
                            : 'rgba(201, 168, 108, 0.4)',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* メインカード */}
          <Card 
            className="p-6 rounded-2xl shadow-lg"
            style={{ 
              background: '#FFFFFF',
              border: `1px solid rgba(201, 168, 108, 0.15)`,
            }}
          >
            <div className="mb-4">
              <h2 
                className="text-2xl font-bold mb-2"
                style={{ color: COLORS.deepNavy }}
              >
                {store.name}
              </h2>
              
              {/* Google評価 */}
              {store.google_rating && (
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.div
                        key={star}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: star * 0.05 }}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= Math.round(store.google_rating!)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'fill-gray-200 text-gray-200'
                          }`}
                        />
                      </motion.div>
                    ))}
                  </div>
                  
                  <span className="text-sm font-bold" style={{ color: COLORS.charcoal }}>
                    {store.google_rating.toFixed(1)}
                  </span>
                  
                  {store.google_reviews_count && (
                    <span className="text-xs" style={{ color: COLORS.warmGray }}>
                      ({store.google_reviews_count.toLocaleString()}件)
                    </span>
                  )}
                  
                  <div className="flex items-center gap-3 ml-auto">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                      style={{ color: COLORS.royalNavy }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      口コミを見る
                    </a>
                    
                    {store.google_place_id && (
                      <motion.a
                        href={generateReviewUrl(store.google_place_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full shadow-sm transition-all duration-200"
                        style={{
                          background: COLORS.luxuryGradient,
                          color: COLORS.paleGold,
                          border: `1px solid rgba(201, 168, 108, 0.3)`,
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        口コミを記入
                      </motion.a>
                    )}
                  </div>
                </div>
              )}
              
              {/* 空席情報とクーポン */}
              <div className="flex gap-2 mb-3 items-center flex-wrap justify-between">
                <motion.div 
                  className="flex items-center gap-2 rounded-xl px-4 py-2"
                  style={{ 
                    backgroundColor: 'rgba(10, 22, 40, 0.05)',
                    border: `1px solid rgba(10, 22, 40, 0.1)`,
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <img 
                    src={getVacancyIcon(store.vacancy_status)}
                    alt={getVacancyLabel(store.vacancy_status)}
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
                    {getVacancyLabel(store.vacancy_status)}
                  </span>
                </motion.div>

                {/* 高級感のあるクーポンボタン */}
                {store.coupon_is_active && store.coupon_title && isCouponValid(store as Partial<CouponData>) && (
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowCouponModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg relative overflow-hidden group"
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                      boxShadow: '0 8px 25px rgba(201, 168, 108, 0.35)',
                    }}
                  >
                    {/* シマーエフェクト */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      }}
                    />
                    <Ticket className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">クーポン</span>
                  </motion.button>
                )}
              </div>
            </div>

            {store.description && (
              <>
                <p className="text-sm font-medium mb-4" style={{ color: COLORS.warmGray }}>
                  {store.description}
                </p>
                <GoldDivider />
              </>
            )}

            {store.status_message && (
              <>
                <div 
                  className="p-4 rounded-xl mb-4"
                  style={{ 
                    backgroundColor: 'rgba(201, 168, 108, 0.08)',
                    borderLeft: `4px solid ${COLORS.champagneGold}`,
                  }}
                >
                  <p className="text-sm font-bold" style={{ color: COLORS.deepNavy }}>
                    {store.status_message}
                  </p>
                </div>
                <GoldDivider />
              </>
            )}

            <div className="space-y-5">
              {/* 住所 */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1" style={{ color: COLORS.deepNavy }}>
                    {t('store_detail.address')}
                  </p>
                  <div className="space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name || '')}`;
                        window.open(mapsUrl, '_blank');
                      }}
                      className="flex items-center gap-1 text-sm font-bold hover:underline"
                      style={{ color: COLORS.royalNavy }}
                    >
                      <span>{t('store_detail.open_in_google_maps')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </motion.button>
                    {distance !== null && (
                      <p className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
                        徒歩およそ{calculateWalkingTime(distance)}分
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 営業時間 */}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1" style={{ color: COLORS.deepNavy }}>
                    {t('store_detail.business_hours')}
                  </p>
                  <p className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
                    {formatBusinessHours(store.business_hours)}
                  </p>
                  {store.regular_holiday && (
                    <p className="text-sm font-medium mt-1" style={{ color: COLORS.warmGray }}>
                      {t('store_detail.regular_holiday')}: {store.regular_holiday}
                    </p>
                  )}
                </div>
              </div>

              {/* 予算 */}
              {store.budget_min && store.budget_max && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1" style={{ color: COLORS.deepNavy }}>
                      {t('store_detail.budget')}
                    </p>
                    <p className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
                      ¥{store.budget_min.toLocaleString()} 〜 ¥{store.budget_max.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* 来客層 */}
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1" style={{ color: COLORS.deepNavy }}>
                    {t('store_detail.customer_demographics')}
                  </p>
                  <p className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
                    {t('store_detail.male')} {store.male_ratio}{t('store_detail.people')} / {t('store_detail.female')} {store.female_ratio}{t('store_detail.people')}
                  </p>
                </div>
              </div>

              {/* 電話番号 */}
              {store.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1" style={{ color: COLORS.deepNavy }}>
                      {t('store_detail.phone')}
                    </p>
                    <motion.a
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      href={`tel:${store.phone}`}
                      className="text-base font-bold hover:underline block mb-2"
                      style={{ color: COLORS.royalNavy }}
                    >
                      {store.phone}
                    </motion.a>
                    <p className="text-xs font-medium mb-3" style={{ color: COLORS.warmGray }}>
                      {t('store_detail.phone_note')}
                    </p>
                  </div>
                </div>
              )}

              {/* 席をキープ */}
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1" style={{ color: COLORS.deepNavy }}>
                    席をキープする
                  </p>
                  <InstantReservationButton storeId={store.id} storeName={store.name} />
                </div>
              </div>

              {/* 写真セクション（遅延読み込み） */}
              {store.google_place_id && (
                <div className="flex items-start gap-3" ref={photoSectionRef}>
                  <ImageIcon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-3" style={{ color: COLORS.deepNavy }}>
                      お店の雰囲気（写真）
                    </p>
                    
                    {/* ローディング状態 */}
                    {(loadingPhotos || (!photosRequested && placePhotos.length === 0)) && (
                      <PhotoGridSkeleton />
                    )}
                    
                    {/* 写真カルーセル */}
                    {!loadingPhotos && placePhotos.length > 0 && (
                      <div 
                        className="relative"
                        onMouseEnter={() => setIsPhotoHovering(true)}
                        onMouseLeave={() => setIsPhotoHovering(false)}
                        onTouchStart={() => setIsPhotoHovering(true)}
                        onTouchEnd={() => setTimeout(() => setIsPhotoHovering(false), 1000)}
                      >
                        <div className="grid grid-cols-2 gap-2 overflow-hidden">
                          {(() => {
                            const startIndex = selectedPhotoIndex * 2;
                            const currentPair = placePhotos.slice(startIndex, startIndex + 2);
                            
                            return currentPair.map((photoUrl, index) => (
                              <motion.div
                                key={`${selectedPhotoIndex}-${index}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                                style={{ border: `1px solid rgba(201, 168, 108, 0.2)` }}
                                onClick={() => openLightbox(placePhotos, startIndex + index)}
                                role="button"
                                tabIndex={0}
                                aria-label={`写真 ${startIndex + index + 1} を拡大表示`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openLightbox(placePhotos, startIndex + index);
                                  }
                                }}
                              >
                                <img
                                  src={photoUrl}
                                  alt={`${store.name}の写真 ${startIndex + index + 1}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                {/* 拡大アイコンオーバーレイ */}
                                <div 
                                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                  style={{ backgroundColor: 'rgba(10, 22, 40, 0.3)' }}
                                >
                                  <div 
                                    className="p-2 rounded-full"
                                    style={{ 
                                      backgroundColor: 'rgba(10, 22, 40, 0.8)',
                                      border: `1px solid rgba(201, 168, 108, 0.3)`,
                                    }}
                                  >
                                    <Expand className="w-4 h-4" style={{ color: COLORS.champagneGold }} />
                                  </div>
                                </div>
                              </motion.div>
                            ));
                          })()}
                        </div>
                        
                        {Math.ceil(placePhotos.length / 2) > 1 && (
                          <>
                            <Button
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                prevPhotoPair();
                              }}
                              style={{ 
                                backgroundColor: 'rgba(10, 22, 40, 0.8)',
                                color: COLORS.champagneGold,
                                border: `1px solid rgba(201, 168, 108, 0.3)`,
                              }}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                nextPhotoPair();
                              }}
                              style={{ 
                                backgroundColor: 'rgba(10, 22, 40, 0.8)',
                                color: COLORS.champagneGold,
                                border: `1px solid rgba(201, 168, 108, 0.3)`,
                              }}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                            
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                              {Array.from({ length: Math.ceil(placePhotos.length / 2) }).map((_, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    goToPhotoPair(index);
                                  }}
                                  className="h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: index === selectedPhotoIndex ? '20px' : '8px',
                                    backgroundColor: index === selectedPhotoIndex 
                                      ? COLORS.champagneGold 
                                      : 'rgba(201, 168, 108, 0.4)',
                                  }}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* 写真なし */}
                    {!loadingPhotos && photosRequested && placePhotos.length === 0 && (
                      <p className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
                        写真がありません
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ウェブサイト */}
              {store.website_url && (
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-2" style={{ color: COLORS.deepNavy }}>
                      {t('store_detail.website')}
                    </p>
                    <div className="flex gap-3">
                      {store.website_url.includes('instagram.com') ? (
                        <motion.a
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          href={store.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png"
                            alt="Instagram"
                            className="w-12 h-12 object-contain"
                          />
                        </motion.a>
                      ) : (
                        <motion.a
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          href={store.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img 
                            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1759366399/icons8-%E3%82%A6%E3%82%A7%E3%83%95%E3%82%99-100_a6uwwq.png"
                            alt="Website"
                            className="w-12 h-12 object-contain"
                          />
                        </motion.a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 支払い方法 */}
              {store.payment_methods && store.payment_methods.length > 0 && (
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1" style={{ color: COLORS.deepNavy }}>
                      {t('store_detail.payment_methods')}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {store.payment_methods.map((method) => (
                        <Badge 
                          key={method} 
                          className="font-medium"
                          style={{ 
                            backgroundColor: 'rgba(201, 168, 108, 0.1)',
                            color: COLORS.charcoal,
                            border: `1px solid rgba(201, 168, 108, 0.2)`,
                          }}
                        >
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 設備・サービス */}
              {store.facilities && store.facilities.length > 0 && (
                <div className="flex items-start gap-3">
                  <Wifi className="w-5 h-5 shrink-0 mt-0.5" style={{ color: COLORS.champagneGold }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-2" style={{ color: COLORS.deepNavy }}>
                      {t('store_detail.facilities')}
                    </p>
                    
                    {/* 新規客・一人客向け */}
                    {store.facilities.some(f => ['一人客歓迎', 'おひとり様大歓迎', '初めての方歓迎'].includes(f)) && (
                      <div 
                        className="mb-3 p-3 rounded-xl"
                        style={{ 
                          backgroundColor: 'rgba(10, 22, 40, 0.05)',
                          border: `1px solid rgba(10, 22, 40, 0.1)`,
                        }}
                      >
                        <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: COLORS.royalNavy }}>
                          ✨ {t('store_detail.facilities_newcomer')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {store.facilities
                            .filter(f => ['一人客歓迎', 'おひとり様大歓迎', '初めての方歓迎', 'カウンター充実', '常連さんが優しい'].includes(f))
                            .map((facility) => (
                              <Badge 
                                key={facility} 
                                className="font-medium text-xs"
                                style={{ 
                                  backgroundColor: 'rgba(31, 64, 104, 0.1)',
                                  color: COLORS.royalNavy,
                                  border: `1px solid rgba(31, 64, 104, 0.2)`,
                                }}
                              >
                                {facility}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* 女性客向け */}
                    {store.facilities.some(f => ['女性客多め', '女性一人でも安心', '女性スタッフ在籍', 'レディースデー有'].includes(f)) && (
                      <div 
                        className="mb-3 p-3 rounded-xl"
                        style={{ 
                          backgroundColor: 'rgba(201, 168, 108, 0.08)',
                          border: `1px solid rgba(201, 168, 108, 0.15)`,
                        }}
                      >
                        <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: COLORS.antiqueGold }}>
                          💕 {t('store_detail.facilities_women')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {store.facilities
                            .filter(f => ['女性客多め', '女性一人でも安心', '女性バーテンダー在籍', '女性スタッフ在籍', 'レディースデー有'].includes(f))
                            .map((facility) => (
                              <Badge 
                                key={facility} 
                                className="font-medium text-xs"
                                style={{ 
                                  backgroundColor: 'rgba(201, 168, 108, 0.15)',
                                  color: COLORS.antiqueGold,
                                  border: `1px solid rgba(201, 168, 108, 0.25)`,
                                }}
                              >
                                {facility}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* 料金関連 */}
                    {store.facilities.some(f => ['チャージなし', '席料なし', 'お通しなし', '明朗会計', '価格表示あり'].includes(f)) && (
                      <div 
                        className="mb-3 p-3 rounded-xl"
                        style={{ 
                          backgroundColor: 'rgba(34, 197, 94, 0.08)',
                          border: `1px solid rgba(34, 197, 94, 0.15)`,
                        }}
                      >
                        <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: '#16a34a' }}>
                          💰 {t('store_detail.facilities_pricing')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {store.facilities
                            .filter(f => ['チャージなし', '席料なし', 'お通しなし', '明朗会計', '価格表示あり', '予算相談OK'].includes(f))
                            .map((facility) => (
                              <Badge 
                                key={facility} 
                                className="font-medium text-xs"
                                style={{ 
                                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                  color: '#16a34a',
                                  border: `1px solid rgba(34, 197, 94, 0.25)`,
                                }}
                              >
                                {facility}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* その他 */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {store.facilities
                        .filter(f => ![
                          '一人客歓迎', 'おひとり様大歓迎', '初めての方歓迎', 'カウンター充実', '常連さんが優しい',
                          '女性客多め', '女性一人でも安心', '女性バーテンダー在籍', '女性スタッフ在籍', 'レディースデー有',
                          'チャージなし', '席料なし', 'お通しなし', '明朗会計', '価格表示あり', '予算相談OK'
                        ].includes(f))
                        .map((facility) => (
                          <Badge 
                            key={facility} 
                            className="font-medium"
                            style={{ 
                              backgroundColor: 'rgba(201, 168, 108, 0.1)',
                              color: COLORS.charcoal,
                              border: `1px solid rgba(201, 168, 108, 0.2)`,
                            }}
                          >
                            {facility}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* クーポンモーダル */}
      {store && (
        <CouponDisplayModal
          isOpen={showCouponModal}
          onClose={() => setShowCouponModal(false)}
          coupon={store as Partial<CouponData>}
          storeName={store.name}
          storeId={store.id}
          onCouponUsed={() => fetchStore(store.id)}
        />
      )}

      {/* 画像ライトボックス */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        alt={store.name}
      />
    </div>
  );
}