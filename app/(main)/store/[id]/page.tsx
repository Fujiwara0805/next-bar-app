'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useLanguage } from '@/lib/i18n/context';

type Store = Database['public']['Tables']['stores']['Row'];

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

  useEffect(() => {
    if (params.id) {
      fetchStore(params.id as string);
    }
    loadUserLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadUserLocation = () => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setUserLocation(location);
      } catch (e) {
        console.error('Failed to parse saved location');
      }
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

  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant':
        return t('map.vacant');
      case 'moderate':
        return t('map.moderate');
      case 'full':
        return t('map.full');
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
      case 'moderate':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761311676/%E3%82%84%E3%82%84%E6%B7%B7%E9%9B%91_qjfizb.png';
      case 'full':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E6%BA%80%E5%B8%AD_gszsqi.png';
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
      case 'moderate':
        return 'bg-yellow-500';
      case 'full':
        return 'bg-red-500';
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

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
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
      </header>

      <div className="p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* 店舗画像カルーセル */}
          {imageUrls.length > 0 && (
            <div className="relative w-full h-80 mb-4 rounded-lg overflow-hidden">
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
                        onClick={() => setSelectedImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === selectedImageIndex 
                            ? 'bg-white w-6' 
                            : 'bg-white/50'
                        }`}
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
                <div className="flex items-center gap-3 mb-3">
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
                  
                  {/* 口コミを見るリンク */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold ml-auto"
                  >
                    <ExternalLink className="w-3 h-3" />
                    口コミを見る
                  </a>
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
                    <p className="text-sm text-muted-foreground font-bold">{store.address}</p>
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
                        {t('store_detail.distance_from_current')} {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
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
                    <a
                      href={`tel:${store.phone}`}
                      className="text-sm text-primary hover:underline block mb-1 font-bold"
                    >
                      {store.phone}
                    </a>
                    <p className="text-xs text-muted-foreground italic font-bold">
                      {t('store_detail.phone_note')}
                    </p>
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
