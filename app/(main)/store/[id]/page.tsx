/**
 * ============================================
 * ファイルパス: app/(main)/store/[id]/page.tsx
 * 
 * 機能: 店舗詳細ページ
 *       画面表示時に該当店舗のis_open更新APIを呼び出す
 *       Google Mapsの口コミ投稿フォームへ直接誘導する機能
 *       複数画像の自動スライド機能（3秒間隔）
 * ============================================
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
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

type Store = Database['public']['Tables']['stores']['Row'];

/** 自動スライドの間隔（ミリ秒） */
const AUTO_SLIDE_INTERVAL = 3000;

/**
 * Google Maps口コミ投稿URLを生成する関数
 * @param placeId - Google Place ID
 * @returns 口コミ投稿ページのURL
 */
const generateReviewUrl = (placeId: string): string => {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
};

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
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  
  // 自動スライド用のタイマーRef
  const autoSlideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const photoCarouselTimerRef = useRef<NodeJS.Timeout | null>(null);
  // ユーザーがホバー中かどうか（ホバー中は自動スライドを一時停止）
  const [isHovering, setIsHovering] = useState(false);
  const [isPhotoHovering, setIsPhotoHovering] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchStore(params.id as string);
    }
    loadUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadUserLocation = () => {
    // まずlocalStorageから位置情報を取得
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

    // localStorageに位置情報がない場合、Geolocation APIを使用
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
          // エラーの場合はデフォルト位置を使用（大分駅周辺）
          setUserLocation({ lat: 33.2382, lng: 131.6126 });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      // Geolocation APIが利用できない場合、デフォルト位置を使用
      setUserLocation({ lat: 33.2382, lng: 131.6126 });
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 距離から徒歩時間を計算（徒歩速度: 4km/h = 約67m/分）
  const calculateWalkingTime = (distanceKm: number): number => {
    const walkingSpeedKmPerHour = 4; // 徒歩速度 4km/h
    const walkingTimeMinutes = (distanceKm / walkingSpeedKmPerHour) * 60;
    return Math.round(walkingTimeMinutes);
  };

  // Google Place Photosを取得
  const fetchPlacePhotos = async (placeId: string) => {
    setLoadingPhotos(true);
    try {
      const response = await fetch(`/api/stores/place-photos?placeId=${encodeURIComponent(placeId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch place photos');
      }
      const data = await response.json();
      if (data.photos && Array.isArray(data.photos)) {
        setPlacePhotos(data.photos);
      }
    } catch (error) {
      console.error('Error fetching place photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const fetchStore = async (id: string) => {
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
        
        // 距離を計算
        if (userLocation) {
          const dist = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            Number(storeData.latitude),
            Number(storeData.longitude)
          );
          setDistance(dist);
        }

        // ★★★ バックグラウンドでis_openを更新（該当店舗のみ） ★★★
        if (storeData.google_place_id) {
          fetch(`/api/stores/update-is-open?storeId=${id}`, {
            method: 'GET',
          })
            .then((res) => res.json())
            .then((result) => {
              console.log('is_open update result:', result);
            })
            .catch((err) => {
              console.warn('Failed to update is_open:', err);
            });
          
          // Google Place Photosを取得
          fetchPlacePhotos(storeData.google_place_id);
        }
      }
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

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
  }, [store, userLocation]);

  // ============================================
  // 自動スライド機能
  // ============================================
  
  /**
   * 自動スライドタイマーをリセットする関数
   * ユーザーが手動操作した際にタイマーをリセットし、
   * 操作後から再度3秒後にスライドが始まるようにする
   */
  const resetAutoSlideTimer = useCallback(() => {
    if (autoSlideTimerRef.current) {
      clearInterval(autoSlideTimerRef.current);
    }
    
    if (imageUrls.length > 1 && !isHovering) {
      autoSlideTimerRef.current = setInterval(() => {
        setSelectedImageIndex((prev) => (prev + 1) % imageUrls.length);
      }, AUTO_SLIDE_INTERVAL);
    }
  }, [imageUrls.length, isHovering]);

  // 自動スライドのセットアップ
  useEffect(() => {
    // 画像が2枚以上あり、ホバー中でない場合のみ自動スライド
    if (imageUrls.length > 1 && !isHovering) {
      autoSlideTimerRef.current = setInterval(() => {
        setSelectedImageIndex((prev) => (prev + 1) % imageUrls.length);
      }, AUTO_SLIDE_INTERVAL);
    }

    // クリーンアップ
    return () => {
      if (autoSlideTimerRef.current) {
        clearInterval(autoSlideTimerRef.current);
      }
    };
  }, [imageUrls.length, isHovering]);

  // ============================================
  // 写真カルーセル機能
  // ============================================
  
  /**
   * 写真カルーセルの自動スライドタイマーをリセットする関数
   */
  const resetPhotoCarouselTimer = useCallback(() => {
    if (photoCarouselTimerRef.current) {
      clearInterval(photoCarouselTimerRef.current);
    }
    
    // 一列2枚表示なので、2枚ずつ進める
    const pairsCount = Math.ceil(placePhotos.length / 2);
    if (pairsCount > 1 && !isPhotoHovering) {
      photoCarouselTimerRef.current = setInterval(() => {
        setSelectedPhotoIndex((prev) => (prev + 1) % pairsCount);
      }, AUTO_SLIDE_INTERVAL);
    }
  }, [placePhotos.length, isPhotoHovering]);

  // 写真カルーセルの自動スライドのセットアップ
  useEffect(() => {
    const pairsCount = Math.ceil(placePhotos.length / 2);
    if (pairsCount > 1 && !isPhotoHovering) {
      photoCarouselTimerRef.current = setInterval(() => {
        setSelectedPhotoIndex((prev) => (prev + 1) % pairsCount);
      }, AUTO_SLIDE_INTERVAL);
    }

    // クリーンアップ
    return () => {
      if (photoCarouselTimerRef.current) {
        clearInterval(photoCarouselTimerRef.current);
      }
    };
  }, [placePhotos.length, isPhotoHovering]);

  // 写真カルーセルの次のペアへ
  const nextPhotoPair = () => {
    const pairsCount = Math.ceil(placePhotos.length / 2);
    setSelectedPhotoIndex((prev) => (prev + 1) % pairsCount);
    resetPhotoCarouselTimer();
  };

  // 写真カルーセルの前のペアへ
  const prevPhotoPair = () => {
    const pairsCount = Math.ceil(placePhotos.length / 2);
    setSelectedPhotoIndex((prev) => (prev - 1 + pairsCount) % pairsCount);
    resetPhotoCarouselTimer();
  };

  // 写真カルーセルの指定ペアへ
  const goToPhotoPair = (index: number) => {
    setSelectedPhotoIndex(index);
    resetPhotoCarouselTimer();
  };

  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant':
        return t('map.vacant');
      case 'full':
        return t('map.full');
      case 'open': 
        return t('map.open');
      case 'closed':
        return t('map.closed');
      default:
        return t('map.unknown');
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

  const getVacancyColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'bg-green-500';
      case 'full':
        return 'bg-red-500';
      case 'open':
        return 'bg-yellow-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  // 営業時間の表示用関数
  const formatBusinessHours = (hours: any) => {
    if (!hours) return t('store_detail.no_info');
    
    // 文字列の場合はそのまま返す
    if (typeof hours === 'string') {
      return hours;
    }
    
    // オブジェクト形式の場合は従来の処理
    const dayLabels: any = {
      monday: '月',
      tuesday: '火',
      wednesday: '水',
      thursday: '木',
      friday: '金',
      saturday: '土',
      sunday: '日'
    };

    return Object.entries(hours).map(([day, time]: any) => {
      if (time.closed) return `${dayLabels[day]}: 定休日`;
      if (time.open && time.close) return `${dayLabels[day]}: ${time.open} - ${time.close}`;
      return null;
    }).filter(Boolean).join(', ') || t('store_detail.no_info');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-lg text-muted-foreground font-bold mb-4">{t('store_detail.not_found')}</p>
        <Button onClick={() => router.back()} className="font-bold">
          {t('store_detail.back')}
        </Button>
      </div>
    );
  }

  // 次の画像へ（手動操作時はタイマーリセット）
  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % imageUrls.length);
    resetAutoSlideTimer();
  };

  // 前の画像へ（手動操作時はタイマーリセット）
  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
    resetAutoSlideTimer();
  };

  // インジケータークリック時（手動操作時はタイマーリセット）
  const goToImage = (index: number) => {
    setSelectedImageIndex(index);
    resetAutoSlideTimer();
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-10 bg-background border-b safe-top">
        <div className="flex items-center justify-center p-4 relative">
          <h1 className="text-xl font-bold">{t('store_detail.title')}</h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push('/map?refresh=true')}
            className="rounded-full absolute right-4"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        {/* パンくずリスト */}
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
              className="relative w-full h-80 mb-4 rounded-lg overflow-hidden"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onTouchStart={() => setIsHovering(true)}
              onTouchEnd={() => {
                // タッチ終了後、少し遅延してから自動スライド再開
                setTimeout(() => setIsHovering(false), 1000);
              }}
            >
              <motion.img
                key={selectedImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                src={imageUrls[selectedImageIndex]}
                alt={`${store.name} - ${selectedImageIndex + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* カルーセルコントロール */}
              {imageUrls.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
                    onClick={nextImage}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  
                  {/* インジケーター */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {imageUrls.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToImage(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          index === selectedImageIndex 
                            ? 'bg-white w-6' 
                            : 'bg-white/50 w-2 hover:bg-white/70'
                        }`}
                        aria-label={`画像 ${index + 1} を表示`}
                      />
                    ))}
                  </div>
                  
                </>
              )}
            </div>
          )}

          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold ">{store.name}</h2>
              
              {/* Google評価 */}
              {store.google_rating && (
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  {/* 星アイコン表示 */}
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
                              : 'fill-gray-300 text-gray-300'
                          }`}
                        />
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* 評価スコア */}
                  <span className="text-sm font-bold">{store.google_rating.toFixed(1)}</span>
                  
                  {/* 口コミ件数 */}
                  {store.google_reviews_count && (
                    <span className="text-xs text-muted-foreground">
                      ({store.google_reviews_count.toLocaleString()}件)
                    </span>
                  )}
                  
                  {/* 口コミリンク群 */}
                  <div className="flex items-center gap-3 ml-auto">
                    {/* 口コミを見るリンク */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      口コミを見る
                    </a>
                    
                    {/* 口コミを記入ボタン - google_place_idがある場合のみ表示 */}
                    {store.google_place_id && (
                      <motion.a
                        href={generateReviewUrl(store.google_place_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        aria-label={`${store.name}の口コミを記入`}
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        口コミを記入
                      </motion.a>
                    )}
                  </div>
                </div>
              )}
              
              {/* Google評価がない場合でも口コミ記入ボタンを表示 */}
              {!store.google_rating && store.google_place_id && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-muted-foreground">まだ評価がありません</span>
                  <motion.a
                    href={generateReviewUrl(store.google_place_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-full shadow-sm hover:shadow-md transition-all duration-200 ml-auto"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    aria-label={`${store.name}の口コミを記入`}
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    最初の口コミを記入
                  </motion.a>
                </div>
              )}
              
              <div className="flex gap-2 mb-3 items-center flex-wrap">
                {/* 空席情報アイコン */}
                <motion.div 
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <img 
                    src={getVacancyIcon(store.vacancy_status)}
                    alt={getVacancyLabel(store.vacancy_status)}
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-lg font-bold">
                    {getVacancyLabel(store.vacancy_status)}
                  </span>
                </motion.div>
              </div>
            </div>

            {store.description && (
              <>
                <p className="text-sm text-muted-foreground font-bold mb-4">
                  {store.description}
                </p>
                <Separator className="my-4" />
              </>
            )}

            {/* 一言メッセージ */}
            {store.status_message && (
              <>
                <div className="p-3 bg-primary/5 border-l-4 border-primary rounded mb-4">
                  <p className="text-sm font-bold">{store.status_message}</p>
                </div>
                <Separator className="my-4" />
              </>
            )}

            <div className="space-y-4">
              {/* 住所 */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">{t('store_detail.address')}</p>
                  <div className="space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name || '')}`;
                        window.open(mapsUrl, '_blank');
                      }}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline font-bold"
                    >
                      <span>{t('store_detail.open_in_google_maps')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </motion.button>
                    {distance !== null && (
                      <p className="text-sm text-muted-foreground font-bold">
                        徒歩およそ{calculateWalkingTime(distance)}分
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 営業時間 */}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">{t('store_detail.business_hours')}</p>
                  <p className="text-sm text-muted-foreground font-bold">
                    {formatBusinessHours(store.business_hours)}
                  </p>
                  {store.regular_holiday && (
                    <p className="text-sm text-muted-foreground font-bold mt-1">
                      {t('store_detail.regular_holiday')}: {store.regular_holiday}
                    </p>
                  )}
                </div>
              </div>

              {/* 予算 */}
              {store.budget_min && store.budget_max && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">{t('store_detail.budget')}</p>
                    <p className="text-sm text-muted-foreground font-bold">
                      ¥{store.budget_min.toLocaleString()} 〜 ¥{store.budget_max.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* 来客層 */}
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">{t('store_detail.customer_demographics')}</p>
                  <p className="text-sm text-muted-foreground font-bold">
                    {t('store_detail.male')} {store.male_ratio}{t('store_detail.people')} / {t('store_detail.female')} {store.female_ratio}{t('store_detail.people')}
                  </p>
                </div>
              </div>

              {/* 電話番号 */}
              {store.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">{t('store_detail.phone')}</p>
                    <motion.a
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      href={`tel:${store.phone}`}
                      className="text-base font-bold text-primary hover:underline block mb-2"
                    >
                      {store.phone}
                    </motion.a>
                    <p className="text-xs text-muted-foreground font-bold mb-3">
                      {t('store_detail.phone_note')}
                    </p>
                  </div>
                </div>
              )}

              {/* 席をキープする */}
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">席をキープする</p>
                  <InstantReservationButton
                    storeId={store.id}
                    storeName={store.name}
                  />
                </div>
              </div>

              {/* 写真 */}
              {store.google_place_id && (
                <div className="flex items-start gap-3">
                  <ImageIcon className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-3">写真</p>
                    {loadingPhotos ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : placePhotos.length > 0 ? (
                      <div 
                        className="relative"
                        onMouseEnter={() => setIsPhotoHovering(true)}
                        onMouseLeave={() => setIsPhotoHovering(false)}
                        onTouchStart={() => setIsPhotoHovering(true)}
                        onTouchEnd={() => {
                          setTimeout(() => setIsPhotoHovering(false), 1000);
                        }}
                      >
                        <div className="grid grid-cols-2 gap-2 overflow-hidden">
                          {(() => {
                            const pairsCount = Math.ceil(placePhotos.length / 2);
                            const startIndex = selectedPhotoIndex * 2;
                            const currentPair = placePhotos.slice(startIndex, startIndex + 2);
                            
                            return currentPair.map((photoUrl, index) => (
                              <motion.div
                                key={`${selectedPhotoIndex}-${index}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="relative aspect-square rounded-lg overflow-hidden"
                              >
                                <img
                                  src={photoUrl}
                                  alt={`${store.name}の写真 ${startIndex + index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </motion.div>
                            ));
                          })()}
                        </div>
                        
                        {/* カルーセルコントロール */}
                        {Math.ceil(placePhotos.length / 2) > 1 && (
                          <>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white z-10"
                              onClick={prevPhotoPair}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white z-10"
                              onClick={nextPhotoPair}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                            
                            {/* インジケーター */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 mt-2">
                              {Array.from({ length: Math.ceil(placePhotos.length / 2) }).map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => goToPhotoPair(index)}
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    index === selectedPhotoIndex 
                                      ? 'bg-white w-6' 
                                      : 'bg-white/50 w-2 hover:bg-white/70'
                                  }`}
                                  aria-label={`写真ペア ${index + 1} を表示`}
                                />
                              ))}
                            </div>
                            
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground font-bold">写真がありません</p>
                    )}
                  </div>
                </div>
              )}

              {/* ウェブサイト・SNS */}
              {store.website_url && (
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-2">{t('store_detail.website')}</p>
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
                  <CreditCard className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">{t('store_detail.payment_methods')}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {store.payment_methods.map((method) => (
                        <Badge key={method} variant="secondary" className="font-bold">
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
                  <Wifi className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">{t('store_detail.facilities')}</p>
                    
                    {/* 新規客・一人客向けを強調表示 */}
                    {store.facilities.some(f => ['一人客歓迎', 'おひとり様大歓迎', '初めての方歓迎'].includes(f)) && (
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 font-bold mb-1 flex items-center gap-1">
                          ✨ {t('store_detail.facilities_newcomer')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {store.facilities
                            .filter(f => ['一人客歓迎', 'おひとり様大歓迎', '初めての方歓迎', 'カウンター充実', '常連さんが優しい'].includes(f))
                            .map((facility) => (
                              <Badge key={facility} variant="secondary" className="font-bold bg-blue-100 text-blue-800 border-blue-300">
                                {facility}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* 女性客向けを強調表示 */}
                    {store.facilities.some(f => ['女性客多め', '女性一人でも安心', '女性スタッフ在籍', 'レディースデー有'].includes(f)) && (
                      <div className="mb-3 p-2 bg-pink-50 rounded-lg border border-pink-200">
                        <p className="text-xs text-pink-700 font-bold mb-1 flex items-center gap-1">
                          💕 {t('store_detail.facilities_women')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {store.facilities
                            .filter(f => ['女性客多め', '女性一人でも安心', '女性バーテンダー在籍', '女性スタッフ在籍', 'レディースデー有'].includes(f))
                            .map((facility) => (
                              <Badge key={facility} variant="secondary" className="font-bold bg-pink-100 text-pink-800 border-pink-300">
                                {facility}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* 料金関連を強調表示 */}
                    {store.facilities.some(f => ['チャージなし', '席料なし', 'お通しなし', '明朗会計', '価格表示あり'].includes(f)) && (
                      <div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 font-bold mb-1 flex items-center gap-1">
                          💰 {t('store_detail.facilities_pricing')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {store.facilities
                            .filter(f => ['チャージなし', '席料なし', 'お通しなし', '明朗会計', '価格表示あり', '予算相談OK'].includes(f))
                            .map((facility) => (
                              <Badge key={facility} variant="secondary" className="font-bold bg-green-100 text-green-800 border-green-300">
                                {facility}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* その他の設備・サービス */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {store.facilities
                        .filter(f => ![
                          '一人客歓迎', 'おひとり様大歓迎', '初めての方歓迎', 'カウンター充実', '常連さんが優しい',
                          '女性客多め', '女性一人でも安心', '女性バーテンダー在籍', '女性スタッフ在籍', 'レディースデー有',
                          'チャージなし', '席料なし', 'お通しなし', '明朗会計', '価格表示あり', '予算相談OK'
                        ].includes(f))
                        .map((facility) => (
                          <Badge key={facility} variant="secondary" className="font-bold">
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
    </div>
  );
}