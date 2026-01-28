/**
 * ============================================
 * ファイルパス: app/(main)/store-list/page.tsx
 * 
 * 機能: 店舗一覧ページ
 *       【最適化】初回ロード時のみis_open更新APIを呼び出す
 *       【追加】コンシェルジュ機能による店舗提案
 *       【追加】空席ありフィルター機能
 *       【追加】営業中フィルター機能
 *       【修正】おすすめバッジをカード内部に配置
 *       【修正】コンシェルジュ結果を上位3件に制限
 * ============================================
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapIcon, ExternalLink, Star, Filter, Check, Sparkles, X, Clock, Ticket, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useLanguage } from '@/lib/i18n/context';
import { ConciergeModal } from '@/components/concierge-modal';

type Store = Database['public']['Tables']['stores']['Row'];

// ============================================
// カラーパレット定義（店舗詳細画面準拠）
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

// コンシェルジュが提案する店舗数
const CONCIERGE_RECOMMENDATION_LIMIT = 3;

/**
 * 営業時間判定ユーティリティ
 * 様々な形式の営業時間データに対応
 */
interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    isOpen?: boolean;
  } | string | null;
}

/**
 * 現在時刻が営業時間内かどうかを判定
 * @param store - 店舗データ
 * @returns boolean - 営業中ならtrue
 */
const isStoreCurrentlyOpen = (store: Store): boolean => {
  // is_openフィールドがある場合はそれを優先
  if (typeof store.is_open === 'boolean') {
    return store.is_open;
  }

  // business_hoursフィールドから判定
  const businessHours = store.business_hours as BusinessHours | null;
  if (!businessHours) return false;

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 100 + now.getMinutes();

  // 曜日別の営業時間を取得
  const todayHours = businessHours[currentDay];
  
  if (!todayHours) return false;
  
  // 文字列形式の場合（例: "18:00-02:00"）
  if (typeof todayHours === 'string') {
    return parseTimeRange(todayHours, currentTime);
  }
  
  // オブジェクト形式の場合
  if (typeof todayHours === 'object' && todayHours !== null) {
    if (todayHours.isOpen === false) return false;
    return parseTimeRange(`${todayHours.open}-${todayHours.close}`, currentTime);
  }

  return false;
};

/**
 * 時間範囲文字列をパースして現在時刻が範囲内かチェック
 * 深夜営業（日をまたぐ場合）にも対応
 */
const parseTimeRange = (timeRange: string, currentTime: number): boolean => {
  const match = timeRange.match(/(\d{1,2}):?(\d{2})?\s*[-~～]\s*(\d{1,2}):?(\d{2})?/);
  if (!match) return false;

  const openHour = parseInt(match[1], 10);
  const openMin = parseInt(match[2] || '0', 10);
  const closeHour = parseInt(match[3], 10);
  const closeMin = parseInt(match[4] || '0', 10);

  const openTime = openHour * 100 + openMin;
  let closeTime = closeHour * 100 + closeMin;

  // 深夜営業（翌日にまたがる場合）
  if (closeTime < openTime) {
    // 現在時刻が開店時間以降、または閉店時間より前
    return currentTime >= openTime || currentTime < closeTime;
  }

  return currentTime >= openTime && currentTime < closeTime;
};

export default function StoreListPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // フィルター状態
  const [vacantOnly, setVacantOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [couponOnly, setCouponOnly] = useState(false);
  const [campaignOnly, setCampaignOnly] = useState(false);
  const [campaignNameFilter, setCampaignNameFilter] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // コンシェルジュ状態
  const [showConcierge, setShowConcierge] = useState(false);
  const [conciergeFilters, setConciergeFilters] = useState<string[]>([]);
  const [isConciergeActive, setIsConciergeActive] = useState(false);

  // 初回ロード完了フラグ
  const isOpenUpdatedRef = useRef(false);

  // アクティブなフィルター数
  const activeFilterCount = [vacantOnly, openNowOnly, couponOnly, campaignOnly].filter(Boolean).length;

  // 位置情報の読み込み
  useEffect(() => {
    loadUserLocation();
  }, []);

  // URLパラメータからキャンペーンフィルターを初期化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const campaign = urlParams.get('campaign');
    const campaignName = urlParams.get('campaign_name');
    
    if (campaign) {
      setCampaignOnly(true);
      // キャンペーン名での絞り込みも確認（空でない場合のみ）
      if (campaignName && campaignName.trim() !== '') {
        setCampaignNameFilter(campaignName);
      }
    }
  }, []);

  // 初回マウント時のみis_open更新APIを呼び出す
  useEffect(() => {
    const updateIsOpenOnce = async () => {
      if (isOpenUpdatedRef.current) return;
      isOpenUpdatedRef.current = true;

      try {
        const res = await fetch('/api/stores/update-is-open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const result = await res.json();
        console.log('is_open update result:', result);

        if (result.updated > 0 && userLocation) {
          fetchStoresOnly();
        }
      } catch (err) {
        console.warn('Failed to update is_open:', err);
      }
    };

    updateIsOpenOnce();
  }, []);

  // 位置情報が設定されたら店舗を取得
  useEffect(() => {
    if (userLocation) {
      fetchStoresOnly();
    }
  }, [userLocation]);

  // リアルタイム更新の設定
  useEffect(() => {
    const channel = supabase
      .channel('stores-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stores'
        },
        (payload) => {
          console.log('Store change detected:', payload);
          fetchStoresOnly();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation]);

  // クーポンが有効かどうかをチェック
  const hasCoupon = (store: Store): boolean => {
    return !!(
      store.coupon_is_active && 
      store.coupon_title &&
      (!store.coupon_expiry_date || new Date(store.coupon_expiry_date) > new Date()) &&
      (!store.coupon_max_uses || (store.coupon_current_uses || 0) < store.coupon_max_uses)
    );
  };

  // キャンペーンが有効かどうかをチェック
  const hasCampaign = (store: Store): boolean => {
    if (!store.has_campaign) return false;
    const now = new Date();
    // 開始日チェック（開始日がある場合）
    if (store.campaign_start_date && new Date(store.campaign_start_date) > now) return false;
    // 終了日チェック（終了日がある場合）
    if (store.campaign_end_date && new Date(store.campaign_end_date) < now) return false;
    return true;
  };

  // フィルタリングロジック
  useEffect(() => {
    let result = [...stores];

    // 空席ありフィルター
    if (vacantOnly) {
      result = result.filter(store => store.vacancy_status === 'vacant');
    }

    // 営業中フィルター
    if (openNowOnly) {
      result = result.filter(store => isStoreCurrentlyOpen(store));
    }

    // クーポンありフィルター
    if (couponOnly) {
      result = result.filter(store => hasCoupon(store));
    }

    // キャンペーンフィルター
    if (campaignOnly) {
      result = result.filter(store => hasCampaign(store));
      
      // 特定のキャンペーン名で絞り込み
      if (campaignNameFilter) {
        result = result.filter(store => store.campaign_name === campaignNameFilter);
      }
    }

    // コンシェルジュフィルター（facilitiesベース）
    if (isConciergeActive && conciergeFilters.length > 0) {
      result = result.filter(store => {
        if (!store.facilities || store.facilities.length === 0) return false;
        
        const matchCount = conciergeFilters.filter(filter => 
          store.facilities!.includes(filter)
        ).length;
        
        return matchCount > 0;
      });

      // マッチ度でソート（高い順）
      result.sort((a, b) => {
        const matchA = conciergeFilters.filter(f => a.facilities?.includes(f) || false).length;
        const matchB = conciergeFilters.filter(f => b.facilities?.includes(f) || false).length;
        
        if (matchB !== matchA) {
          return matchB - matchA;
        }
        
        return 0;
      });

      // ★ 上位3件のみに制限
      result = result.slice(0, CONCIERGE_RECOMMENDATION_LIMIT);
    }

    setFilteredStores(result);
  }, [stores, vacantOnly, openNowOnly, couponOnly, campaignOnly, campaignNameFilter, conciergeFilters, isConciergeActive]);

  const loadUserLocation = () => {
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
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setUserLocation({ lat: 33.2382, lng: 131.6126 });
    }
  };

  const fetchStoresOnly = async () => {
    if (!userLocation) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const storeData: Store[] = data || [];
      
      if (storeData.length > 0) {
        const sortedStores = [...storeData].sort((a, b) => {
          const distanceA = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            Number(a.latitude),
            Number(a.longitude)
          );
          const distanceB = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            Number(b.latitude),
            Number(b.longitude)
          );
          return distanceA - distanceB;
        });
        
        setStores(sortedStores);
      } else {
        setStores(storeData);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateWalkingTime = (distanceKm: number): number => {
    const walkingSpeedKmPerHour = 4;
    const walkingTimeMinutes = (distanceKm / walkingSpeedKmPerHour) * 60;
    return Math.round(walkingTimeMinutes);
  };

  const getMatchScore = (store: Store): number => {
    if (!isConciergeActive || conciergeFilters.length === 0) return 0;
    if (!store.facilities) return 0;
    return conciergeFilters.filter(f => store.facilities!.includes(f)).length;
  };

  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant':
        return t('store_list.vacant');
      case 'full':
        return t('store_list.full');
      case 'open':
        return t('store_list.open');
      case 'closed':
        return t('store_list.closed');
      default:
        return t('store_list.unknown');
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

  const handleConciergeComplete = (selectedFacilities: string[]) => {
    setConciergeFilters(selectedFacilities);
    setIsConciergeActive(true);
    setShowConcierge(false);
  };

  const clearConciergeFilter = () => {
    setConciergeFilters([]);
    setIsConciergeActive(false);
  };

  const clearAllFilters = useCallback(() => {
    setVacantOnly(false);
    setOpenNowOnly(false);
    setCouponOnly(false);
    setCampaignOnly(false);
    setCampaignNameFilter(null);
    clearConciergeFilter();
    // URLパラメータもクリア
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('campaign');
      url.searchParams.delete('campaign_name');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.filter-menu-container')) {
        setShowFilterMenu(false);
      }
    };

    if (showFilterMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showFilterMenu]);

  // フィルター状態のテキスト生成
  const getFilterStatusText = (): string => {
    const statuses: string[] = [];
    if (vacantOnly) statuses.push(t('store_list.vacant'));
    if (openNowOnly) statuses.push(t('store_list.open'));
    if (couponOnly) statuses.push(t('store_list.filter_has_coupon'));
    if (campaignOnly) {
      if (campaignNameFilter) {
        statuses.push(campaignNameFilter);
      } else {
        statuses.push(t('store_list.filter_campaign') || 'キャンペーン中');
      }
    }
    if (isConciergeActive) statuses.push(t('store_list.concierge_active'));
    return statuses.length > 0 ? `（${statuses.join('・')}）` : '';
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1C1E26' }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-center" style={{ color: COLORS.deepNavy }}>{t('store_list.title')}</h1>
          </div>
          
          {/* コンシェルジュボタン */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowConcierge(true)}
            className="w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: isConciergeActive 
                ? 'linear-gradient(135deg, #C9A86C 0%, #B8956E 100%)'
                : 'linear-gradient(135deg, #0A1628 0%, #162447 100%)',
              color: isConciergeActive ? '#0A1628' : '#C9A86C',
              border: '1px solid rgba(201, 168, 108, 0.4)',
              boxShadow: '0 4px 15px rgba(201, 168, 108, 0.25)',
            }}
          >
            <Sparkles className="w-5 h-5" />
            <span>
              {isConciergeActive ? t('store_list.concierge_active') : t('store_list.concierge_button')}
            </span>
          </motion.button>
          
          {/* キャンペーン名フィルター表示 */}
          {campaignNameFilter && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-xl flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(201, 168, 108, 0.15) 0%, rgba(184, 149, 110, 0.1) 100%)',
                border: '1px solid rgba(201, 168, 108, 0.3)',
              }}
            >
              <div className="flex items-center gap-2">
                <PartyPopper className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
                <span className="font-bold text-sm" style={{ color: COLORS.champagneGold }}>
                  {campaignNameFilter}
                </span>
              </div>
              <button
                onClick={() => {
                  setCampaignNameFilter(null);
                  // URLパラメータからcampaign_nameを削除
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('campaign_name');
                    window.history.replaceState({}, '', url.toString());
                  }
                }}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                style={{ color: COLORS.warmGray }}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* フィルター状態表示 */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-sm font-bold" style={{ color: COLORS.warmGray }}>
              {filteredStores.length}{t('store_list.results_count')}
            </p>
            
            {(vacantOnly || openNowOnly || couponOnly || campaignOnly || isConciergeActive) && (
              <button
                onClick={clearAllFilters}
                className="text-sm font-bold hover:underline flex items-center gap-1"
                style={{ color: COLORS.royalNavy }}
              >
                <X className="w-3 h-3" />
                {t('store_list.filter_clear')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 店舗リスト */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 relative">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm font-bold" style={{ color: COLORS.warmGray }}>{t('store_list.loading')}</p>
            </div>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-bold" style={{ color: COLORS.warmGray }}>
              {(isConciergeActive || vacantOnly || openNowOnly || couponOnly || campaignOnly)
                ? t('store_list.no_matching_stores')
                : t('store_list.no_stores')
              }
            </p>
            {(vacantOnly || openNowOnly || couponOnly || campaignOnly || isConciergeActive) && (
              <button
                onClick={clearAllFilters}
                className="mt-4 font-bold hover:underline"
                style={{ color: COLORS.champagneGold }}
              >
                {t('store_list.show_all_stores')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* コンシェルジュ提案時のヘッダーメッセージ */}
            {isConciergeActive && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-xl text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(201, 168, 108, 0.15) 0%, rgba(184, 149, 110, 0.1) 100%)',
                  border: '1px solid rgba(201, 168, 108, 0.3)',
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" style={{ color: '#C9A86C' }} />
                  <span className="text-lg font-light tracking-wide" style={{ color: '#C9A86C' }}>
                    {t('store_list.concierge_selection')}
                  </span>
                </div>
                <p className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
                  {t('store_list.concierge_intro').replace('{count}', String(filteredStores.length))}
                </p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredStores.map((store, index) => {
                  const matchScore = getMatchScore(store);
                  const isOpen = isStoreCurrentlyOpen(store);
                  
                  return (
                    <motion.div
                      key={store.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card 
                        className={`p-4 cursor-pointer hover:shadow-lg transition-shadow h-full bg-white relative overflow-hidden ${
                          isConciergeActive ? 'ring-2 ring-amber-400/30' : ''
                        }`}
                        onClick={() => router.push(`/store/${store.id}`)}
                      >
                        {/* コンシェルジュおすすめバッジ */}
                        {isConciergeActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1 + 0.2 }}
                            className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                            style={{
                              background: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
                              color: '#0A1628',
                              boxShadow: '0 4px 12px rgba(201, 168, 108, 0.4)',
                            }}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>No.{index + 1}</span>
                          </motion.div>
                        )}

                        {/* クーポンあり / キャンペーン中バッジ（コンシェルジュ非アクティブ時） */}
                        {!isConciergeActive && (hasCoupon(store) || hasCampaign(store)) && (
                          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                            {/* キャンペーン中バッジ */}
                            {hasCampaign(store) && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                                style={{
                                  background: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
                                  color: '#0A1628',
                                  boxShadow: '0 2px 8px rgba(201, 168, 108, 0.4)',
                                }}
                              >
                                <PartyPopper className="w-3 h-3" />
                                {t('store_list.filter_campaign') || 'キャンペーン'}
                              </motion.div>
                            )}
                            {/* クーポンありバッジ */}
                            {hasCoupon(store) && (
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 bg-amber-500 text-white"
                                style={{
                                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                                }}
                              >
                                <Ticket className="w-3 h-3" />
                                {t('store_list.filter_has_coupon')}
                              </motion.div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex gap-3 h-full">
                          {/* 店舗画像 */}
                          {store.image_urls && store.image_urls.length > 0 && (
                            <motion.img
                              whileHover={{ scale: 1.05 }}
                              src={store.image_urls[0]}
                              alt={store.name}
                              className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex-1">
                              {/* 店舗名 - バッジと重ならないようにpr追加 */}
                              <h3 
                                className={`text-lg font-bold truncate ${isConciergeActive || hasCoupon(store) || hasCampaign(store) ? 'pr-20' : ''}`}
                                style={{ color: COLORS.deepNavy }}
                              >
                                {store.name}
                              </h3>
                              
                              {/* Google評価表示 */}
                              {store.google_rating && (
                                <div className="flex items-center gap-2 -mt-1 mb-1">
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-4 h-4 ${
                                          star <= Math.round(store.google_rating!)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'fill-gray-200 text-gray-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm font-bold" style={{ color: COLORS.charcoal }}>
                                    {store.google_rating.toFixed(1)}
                                  </span>
                                  {store.google_reviews_count && (
                                    <span className="text-xs" style={{ color: COLORS.warmGray }}>
                                      {t('store_list.reviews_count').replace('{count}', store.google_reviews_count.toLocaleString())}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* 距離表示 */}
                              {userLocation && (() => {
                                const distanceKm = calculateDistance(
                                  userLocation.lat,
                                  userLocation.lng,
                                  Number(store.latitude),
                                  Number(store.longitude)
                                );
                                const distanceM = Math.round(distanceKm * 1000);
                                const distanceText = distanceM >= 1000 
                                  ? `${(distanceKm).toFixed(1)}km` 
                                  : `${distanceM}m`;
                                return (
                                  <p className="text-sm font-bold" style={{ color: COLORS.warmGray }}>
                                    {t('store_list.walking_time')
                                      .replace('{minutes}', String(calculateWalkingTime(distanceKm)))
                                      .replace('{distance}', distanceText)}
                                  </p>
                                );
                              })()}
                              
                              {/* Googleマップで開くリンク */}
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name || '')}`;
                                  window.open(mapsUrl, '_blank');
                                }}
                                className="flex items-center gap-1 text-xs font-bold hover:underline"
                                style={{ color: COLORS.royalNavy }}
                              >
                                <span>{t('store_list.open_in_google_maps')}</span>
                                <ExternalLink className="w-3 h-3" />
                              </motion.button>
                              
                              {/* 空席情報 */}
                              <motion.div 
                                className="flex items-center gap-2 pt-1"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                              >
                                <img 
                                  src={getVacancyIcon(store.vacancy_status)}
                                  alt={getVacancyLabel(store.vacancy_status)}
                                  className="w-6 h-6 object-contain"
                                />
                                <span className="text-lg font-bold" style={{ color: COLORS.deepNavy }}>
                                  {getVacancyLabel(store.vacancy_status)}
                                </span>
                              </motion.div>
                              
                              {/* 一言メッセージ */}
                              {store.status_message && (
                                <p className="text-sm font-bold line-clamp-2 pt-1" style={{ color: COLORS.deepNavy }}>
                                  {store.status_message}
                                </p>
                              )}

                              {/* コンシェルジュマッチ情報 */}
                              {isConciergeActive && matchScore > 0 && (
                                <p className="text-xs mt-2 px-2 py-1 rounded-md inline-block"
                                  style={{
                                    backgroundColor: 'rgba(201, 168, 108, 0.1)',
                                    color: '#B8956E',
                                  }}
                                >
                                  {t('store_list.items_match').replace('{count}', String(matchScore))}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* フローティングボタン群（画面右下） */}
        <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-3 items-end">
          {/* フィルターボタン */}
          <div className="relative filter-menu-container">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFilterMenu(!showFilterMenu);
                  }}
                  className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-manipulation active:scale-95 rounded-lg relative"
                  style={{
                    background: activeFilterCount > 0 ? '#C9A86C' : 'rgba(5,5,5,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: activeFilterCount > 0 ? '1px solid #C9A86C' : '1px solid rgba(201,168,108,0.3)',
                    boxShadow: '0 0 20px rgba(201,168,108,0.2)',
                    minWidth: '56px',
                    minHeight: '56px',
                  }}
                  title={t('store_list.filter')}
                >
                  <Filter 
                    className="w-5 h-5" 
                    style={{ color: activeFilterCount > 0 ? '#0A1628' : '#C9A86C' }} 
                  />
                  <span 
                    className="text-[10px] font-bold" 
                    style={{ color: activeFilterCount > 0 ? '#0A1628' : '#C9A86C' }}
                  >
                    {t('store_list.filter')}
                  </span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </motion.div>
            </motion.div>

            {/* フィルターメニュー */}
            <AnimatePresence>
              {showFilterMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full right-0 mb-2 w-56"
                >
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: 'rgba(30, 30, 30, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div className="p-2">
                      <div className="flex items-center justify-between px-3 py-2">
                        <p className="text-xs text-gray-400 font-bold">
                          {t('store_list.filter_title')}
                        </p>
                        <button
                          onClick={() => setShowFilterMenu(false)}
                          className="text-gray-400 hover:text-white transition-colors p-1 -mr-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* 営業中フィルター */}
                      <button
                        onClick={() => {
                          setOpenNowOnly(!openNowOnly);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          openNowOnly 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        <img
                          src="https://res.cloudinary.com/dz9trbwma/image/upload/v1767848645/icons8-%E9%96%8B%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-94_a4tmzn.png"
                          alt={t('store_list.open')}
                          className="w-5 h-5"
                        />
                        <span className="font-bold text-sm flex-1 text-left">
                          {t('store_list.open')}
                        </span>
                        {openNowOnly && (
                          <Check className="w-4 h-4 text-blue-400" />
                        )}
                      </button>

                      {/* 空席ありフィルター */}
                      <button
                        onClick={() => {
                          setVacantOnly(!vacantOnly);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          vacantOnly 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        <img
                          src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png"
                          alt={t('store_list.vacant')}
                          className="w-5 h-5"
                        />
                        <span className="font-bold text-sm flex-1 text-left">
                          {t('store_list.vacant')}
                        </span>
                        {vacantOnly && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </button>

                      {/* クーポンありフィルター */}
                      <button
                        onClick={() => {
                          setCouponOnly(!couponOnly);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          couponOnly 
                            ? 'bg-orange-500/20 text-orange-400' 
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        <Ticket className="w-5 h-5" style={{ color: couponOnly ? '#fb923c' : '#C9A86C' }} />
                        <span className="font-bold text-sm flex-1 text-left">
                          {t('store_list.filter_has_coupon')}
                        </span>
                        {couponOnly && (
                          <Check className="w-4 h-4 text-orange-400" />
                        )}
                      </button>

                      {/* キャンペーン中フィルター */}
                      <button
                        onClick={() => {
                          setCampaignOnly(!campaignOnly);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          campaignOnly 
                            ? 'bg-pink-500/20 text-pink-400' 
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        <PartyPopper className="w-5 h-5" style={{ color: campaignOnly ? '#f472b6' : '#C9A86C' }} />
                        <span className="font-bold text-sm flex-1 text-left">
                          {t('store_list.filter_campaign') || 'キャンペーン中'}
                        </span>
                        {campaignOnly && (
                          <Check className="w-4 h-4 text-pink-400" />
                        )}
                      </button>

                      {/* 区切り線 */}
                      <div className="my-2 border-t border-white/10" />

                      {/* すべて表示 */}
                      <button
                        onClick={() => {
                          setVacantOnly(false);
                          setOpenNowOnly(false);
                          setCouponOnly(false);
                          setCampaignOnly(false);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          !vacantOnly && !openNowOnly && !couponOnly && !campaignOnly
                            ? 'bg-amber-500/20 text-amber-400' 
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        <span className="w-5 h-5 flex items-center justify-center text-lg">
                          🍺
                        </span>
                        <span className="font-bold text-sm flex-1 text-left">
                          {t('store_list.filter_show_all')}
                        </span>
                        {!vacantOnly && !openNowOnly && !couponOnly && !campaignOnly && (
                          <Check className="w-4 h-4 text-amber-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* マップボタン */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => router.push('/map?refresh=true')}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-manipulation active:scale-95 rounded-lg"
                style={{
                  background: 'rgba(5,5,5,0.7)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(201,168,108,0.3)',
                  boxShadow: '0 0 20px rgba(201,168,108,0.2)',
                  minWidth: '56px',
                  minHeight: '56px',
                }}
                title="Map"
              >
                <MapIcon className="w-5 h-5" style={{ color: '#C9A86C' }} />
                <span className="text-[10px] font-bold" style={{ color: '#C9A86C' }}>
                  Map
                </span>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* コンシェルジュモーダル */}
      <ConciergeModal
        isOpen={showConcierge}
        onClose={() => setShowConcierge(false)}
        onComplete={handleConciergeComplete}
      />
    </div>
  );
}