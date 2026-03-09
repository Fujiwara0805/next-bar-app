'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  X,
  Building2,
  Star,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  DollarSign,
  Phone,
  ExternalLink,
  CreditCard,
  Loader2,
  Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n/context';
import { translations } from '@/lib/i18n/translations';
import { OgoriTicketBadge } from '@/components/ogori/OgoriTicketBadge';
import { OgoriSection } from '@/components/ogori/OgoriSection';
import { InstantReservationButton } from '@/components/instant-reservation-button';
import { getTodayOpenTime, isTodayClosedDay, checkIsOpenFromStructuredHours } from '@/lib/structured-business-hours';
import { sendGAEvent } from '@/lib/analytics';
import type { Database, BusinessHours } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

interface StoreDetailPanelProps {
  store: Store;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onSwipeNext: () => void;
  onSwipePrev: () => void;
  onNavigateToDetail: (id: string) => void;
  isNavigating: boolean;
}

// ダークテーマ色（通常カード用）
const darkTheme = {
  background: '#0A1628',
  surface: '#162447',
  accent: '#C9A86C',
  accentLight: '#E8D5B7',
  text: '#FDFBF7',
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  borderGold: 'rgba(201, 168, 108, 0.3)',
  borderSubtle: 'rgba(201, 168, 108, 0.15)',
  shadowGold: '0 8px 30px rgba(201, 168, 108, 0.4)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
};

// ライトテーマ色（展開時の詳細用）
const lightTheme = {
  background: '#FFFFFF',
  surface: '#FDFBF7',
  accent: '#C9A86C',
  text: '#0A1628',
  textMuted: '#636E72',
  textSubtle: '#9BA4A9',
  borderGold: 'rgba(201, 168, 108, 0.25)',
  borderSubtle: 'rgba(201, 168, 108, 0.12)',
  badgeBg: 'rgba(10, 22, 40, 0.04)',
};

export function StoreDetailPanel({
  store,
  userLocation,
  onClose,
  onSwipeNext,
  onSwipePrev,
  onNavigateToDetail,
  isNavigating,
}: StoreDetailPanelProps) {
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsExpanded(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [store.id]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (!isExpanded) {
      if (info.offset.y < -60) {
        setIsExpanded(true);
      } else if (Math.abs(info.offset.x) > 50) {
        if (info.offset.x < -50) onSwipeNext();
        else onSwipePrev();
      }
    } else {
      if (info.offset.y > 80) {
        setIsExpanded(false);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      }
    }
  }, [isExpanded, onSwipeNext, onSwipePrev]);

  // --- ユーティリティ ---

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateWalkingTime = (distanceKm: number) => Math.round((distanceKm / 4) * 60);

  const distanceInfo = useMemo(() => {
    if (!userLocation) return null;
    const lat = Number(store.latitude);
    const lng = Number(store.longitude);
    if (isNaN(lat) || isNaN(lng)) return null;
    const km = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
    if (isNaN(km)) return null;
    const m = Math.round(km * 1000);
    return {
      text: m >= 1000 ? `${km.toFixed(1)}km` : `${m}m`,
      minutes: calculateWalkingTime(km),
    };
  }, [userLocation, store.latitude, store.longitude]);

  const getEffectiveVacancyStatus = (): string => {
    const sbh = store.structured_business_hours as BusinessHours | null;
    if (!sbh) return store.vacancy_status ?? 'closed';
    const result = checkIsOpenFromStructuredHours(sbh);
    if (result === null) return store.vacancy_status ?? 'closed';
    if (result) {
      return store.vacancy_status === 'closed' ? 'open' : (store.vacancy_status ?? 'open');
    }
    return 'closed';
  };

  const effectiveStatus = getEffectiveVacancyStatus();

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
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png';
      case 'full':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761311529/%E6%BA%80%E5%B8%AD_gszsqi.png';
      case 'open':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1767848645/icons8-%E9%96%8B%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-94_a4tmzn.png';
      case 'closed':
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761318837/icons8-%E9%96%89%E5%BA%97%E3%82%B5%E3%82%A4%E3%83%B3-100_fczegk.png';
      default:
        return 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761311529/%E7%A9%BA%E5%B8%AD%E3%81%82%E3%82%8A_rzejgw.png';
    }
  };

  const formatBusinessHours = (hours: any) => {
    if (!hours) return t('store_detail.no_info');
    if (typeof hours === 'string') return hours;
    const dayLabelsJa: any = {
      monday: '月', tuesday: '火', wednesday: '水', thursday: '木',
      friday: '金', saturday: '土', sunday: '日',
    };
    const dayLabelsEn: any = {
      monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
      friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
    };
    const dayLabels = language === 'en' ? dayLabelsEn : dayLabelsJa;
    const closedText = t('store_detail.regular_holiday_day');
    return Object.entries(hours).map(([day, time]: any) => {
      if (time.closed) return `${dayLabels[day]}: ${closedText}`;
      if (time.open && time.close) return `${dayLabels[day]}: ${time.open} - ${time.close}`;
      return null;
    }).filter(Boolean).join(', ') || t('store_detail.no_info');
  };

  const translatePaymentMethod = (method: string): string => {
    const paymentMethodsMap = (translations as any)[language]?.payment_methods_map;
    return paymentMethodsMap?.[method] || method;
  };

  const translateFacility = (facility: string): string => {
    const facilitiesMap = (translations as any)[language]?.facilities_map;
    return facilitiesMap?.[facility] || facility;
  };

  const googleMapsDirectionUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.name)}&travelmode=walking`;

  // 展開時の高さ: 画面の82%
  const expandedHeight = typeof window !== 'undefined'
    ? Math.round(window.innerHeight * 0.82)
    : 700;

  // テーマ切替
  const theme = isExpanded ? lightTheme : darkTheme;

  return (
    <motion.div
      key={store.id}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-30 safe-bottom touch-manipulation flex flex-col"
      style={{ maxHeight: '92vh' }}
    >
      {/* ===== メインパネル ===== */}
      <motion.div
        className="flex flex-col overflow-hidden rounded-t-3xl"
        animate={{
          height: isExpanded ? expandedHeight : 'auto',
          backgroundColor: isExpanded ? '#FFFFFF' : darkTheme.surface,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        style={{
          borderTop: `1px solid ${darkTheme.borderGold}`,
        }}
        drag={isExpanded ? undefined : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={!isExpanded ? (_, info) => {
          if (Math.abs(info.offset.x) > 50) {
            if (info.offset.x < -50) onSwipeNext();
            else onSwipePrev();
          }
        } : undefined}
      >
        {/* ドラッグハンドル（上下スワイプ） */}
        <motion.div
          className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing flex-shrink-0"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.3}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-center gap-2">
            {!isExpanded && (
              <ChevronLeft className="w-4 h-4 opacity-40" style={{ color: darkTheme.accent }} />
            )}
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: isExpanded ? 'rgba(0,0,0,0.15)' : `${darkTheme.accent}50` }}
            />
            {!isExpanded && (
              <ChevronRight className="w-4 h-4 opacity-40" style={{ color: darkTheme.accent }} />
            )}
          </div>
          {!isExpanded && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              className="text-[10px] mt-0.5"
              style={{ color: darkTheme.textMuted }}
            >
              {t('map.swipe_up_hint')}
            </motion.p>
          )}
        </motion.div>

        {/* コンテンツ */}
        <div
          ref={scrollRef}
          className={`flex-1 px-4 pb-2 ${isExpanded ? 'overflow-y-auto' : 'overflow-hidden'}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* --- コンパクトビュー (常時表示) --- */}
          <div className="space-y-3">
            <div className="flex gap-4">
              {store.image_urls && store.image_urls.length > 0 ? (
                <img
                  src={store.image_urls[0]}
                  alt={store.name}
                  className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                  style={{ border: `1px solid ${theme.borderGold}` }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isExpanded ? '#F5F1EB' : darkTheme.background }}
                >
                  <Building2 className="w-12 h-12" style={{ color: theme.textMuted }} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg line-clamp-1" style={{ color: theme.text }}>
                    {store.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 -mt-1"
                    style={{ color: theme.textMuted }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {store.google_rating && (
                  <div className="flex items-center gap-2 -mt-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(store.google_rating!)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-600'
                          }`}
                          style={{
                            fill: star <= Math.round(store.google_rating!)
                              ? darkTheme.accent
                              : 'transparent',
                            color: star <= Math.round(store.google_rating!)
                              ? darkTheme.accent
                              : theme.textSubtle,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold" style={{ color: theme.text }}>
                      {store.google_rating.toFixed(1)}
                    </span>
                    {store.google_reviews_count && (
                      <span className="text-xs" style={{ color: theme.textMuted }}>
                        ({store.google_reviews_count})
                      </span>
                    )}
                  </div>
                )}

                {distanceInfo && (
                  <p className="text-sm font-bold" style={{ color: theme.textMuted }}>
                    {t('store_detail.walking_time')
                      .replace('{minutes}', String(distanceInfo.minutes))
                      .replace('{distance}', distanceInfo.text)}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <img
                    src={getVacancyIcon(effectiveStatus)}
                    alt={getVacancyLabel(effectiveStatus)}
                    className="w-6 h-6"
                  />
                  <span className="text-xl font-bold" style={{ color: theme.text }}>
                    {getVacancyLabel(effectiveStatus)}
                  </span>
                  {effectiveStatus === 'vacant' && store.vacant_seats != null && store.vacant_seats > 0 && (
                    <span className="text-sm font-bold px-2 py-0.5 rounded-lg" style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      color: '#16a34a',
                    }}>
                      {t('store_detail.vacant_seats').replace('{count}', String(store.vacant_seats))}
                    </span>
                  )}
                  {effectiveStatus === 'closed' && (() => {
                    const sbh = store.structured_business_hours as BusinessHours | null;
                    if (isTodayClosedDay(sbh)) {
                      return (
                        <span className="text-sm font-bold px-2 py-0.5 rounded-lg" style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                        }}>
                          {t('map.regular_holiday')}
                        </span>
                      );
                    }
                    const openTime = getTodayOpenTime(sbh);
                    if (!openTime) return null;
                    return (
                      <span className="text-sm font-bold px-2 py-0.5 rounded-lg" style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: '#16a34a',
                      }}>
                        {t('map.opens_at').replace('{time}', openTime)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            <OgoriTicketBadge storeId={store.id} compact />

            {store.status_message && (
              <div style={{ borderTop: `1px solid ${theme.borderSubtle}` }} className="pt-2">
                <p className="text-sm font-bold line-clamp-2" style={{ color: theme.textMuted }}>
                  {store.status_message}
                </p>
              </div>
            )}
          </div>

          {/* --- 展開時の詳細セクション --- */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mt-4 space-y-5"
              >
                {store.description && (
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: 'rgba(201, 168, 108, 0.06)' }}
                  >
                    <p className="text-sm font-medium leading-relaxed" style={{ color: lightTheme.textMuted }}>
                      {store.description}
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: lightTheme.accent }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1" style={{ color: lightTheme.text }}>
                      {t('store_detail.address')}
                    </p>
                    <p className="text-sm font-medium" style={{ color: lightTheme.textMuted }}>
                      {store.address || t('store_detail.no_info')}
                    </p>
                    {distanceInfo && (
                      <p className="text-sm font-medium mt-1" style={{ color: lightTheme.textMuted }}>
                        {t('store_detail.walking_time')
                          .replace('{minutes}', String(distanceInfo.minutes))
                          .replace('{distance}', distanceInfo.text)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: lightTheme.accent }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1" style={{ color: lightTheme.text }}>
                      {t('store_detail.business_hours')}
                    </p>
                    <p className="text-sm font-medium" style={{ color: lightTheme.textMuted }}>
                      {formatBusinessHours(store.business_hours)}
                    </p>
                    {store.regular_holiday && (
                      <p className="text-sm font-medium mt-1" style={{ color: lightTheme.textMuted }}>
                        {t('store_detail.regular_holiday')}: {store.regular_holiday}
                      </p>
                    )}
                  </div>
                </div>

                {store.budget_min && store.budget_max && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 shrink-0 mt-0.5" style={{ color: lightTheme.accent }} />
                    <div className="flex-1">
                      <p className="text-sm font-bold mb-1" style={{ color: lightTheme.text }}>
                        {t('store_detail.budget')}
                      </p>
                      <p className="text-sm font-medium" style={{ color: lightTheme.textMuted }}>
                        ¥{store.budget_min.toLocaleString()} 〜 ¥{store.budget_max.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {store.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 shrink-0 mt-0.5" style={{ color: lightTheme.accent }} />
                    <div className="flex-1">
                      <p className="text-sm font-bold mb-1" style={{ color: lightTheme.text }}>
                        {t('store_detail.phone')}
                      </p>
                      <a
                        href={`tel:${store.phone}`}
                        className="text-base font-bold hover:underline block"
                        style={{ color: '#1F4068' }}
                      >
                        {store.phone}
                      </a>
                    </div>
                  </div>
                )}

                <OgoriSection
                  storeId={store.id}
                  storeName={store.name}
                  ogoriEnabled={store.ogori_enabled ?? false}
                />

                {store.website_url && (
                  <div className="flex items-start gap-3">
                    <ExternalLink className="w-5 h-5 shrink-0 mt-0.5" style={{ color: lightTheme.accent }} />
                    <div className="flex-1">
                      <p className="text-sm font-bold mb-2" style={{ color: lightTheme.text }}>
                        {t('store_detail.website')}
                      </p>
                      <div className="flex gap-3">
                        {store.website_url.includes('instagram.com') ? (
                          <a href={store.website_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src="https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1759308496/icons8-%E3%82%A4%E3%83%B3%E3%82%B9%E3%82%BF%E3%82%AF%E3%82%99%E3%83%A9%E3%83%A0-100_idedfz.png"
                              alt="Instagram"
                              className="w-12 h-12 object-contain"
                            />
                          </a>
                        ) : (
                          <a href={store.website_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src="https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1759366399/icons8-%E3%82%A6%E3%82%A7%E3%83%95%E3%82%99-100_a6uwwq.png"
                              alt="Website"
                              className="w-12 h-12 object-contain"
                            />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {store.payment_methods && store.payment_methods.length > 0 && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 shrink-0 mt-0.5" style={{ color: lightTheme.accent }} />
                    <div className="flex-1">
                      <p className="text-sm font-bold mb-2" style={{ color: lightTheme.text }}>
                        {t('store_detail.payment_methods')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {store.payment_methods.map((method: string) => (
                          <Badge
                            key={method}
                            variant="outline"
                            className="text-xs font-bold"
                            style={{
                              borderColor: lightTheme.borderGold,
                              color: lightTheme.text,
                              background: lightTheme.badgeBg,
                            }}
                          >
                            {translatePaymentMethod(method)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {store.facilities && store.facilities.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 shrink-0 mt-0.5" style={{ color: lightTheme.accent }} />
                    <div className="flex-1">
                      <p className="text-sm font-bold mb-2" style={{ color: lightTheme.text }}>
                        {t('store_detail.facilities')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {store.facilities.map((facility: string) => (
                          <Badge
                            key={facility}
                            variant="outline"
                            className="text-xs font-bold"
                            style={{
                              borderColor: lightTheme.borderGold,
                              color: lightTheme.text,
                              background: lightTheme.badgeBg,
                            }}
                          >
                            {translateFacility(facility)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ===== フッターボタン ===== */}
      <motion.div
        className="flex gap-2 px-4 py-3 flex-shrink-0"
        animate={{
          backgroundColor: isExpanded ? '#FFFFFF' : darkTheme.surface,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        style={{
          borderTop: `1px solid ${isExpanded ? lightTheme.borderSubtle : darkTheme.borderSubtle}`,
        }}
      >
        {/* 通常時: 「詳細を見る」+「現地へ向かう」 / 展開時: 「席をキープする」+「現地へ向かう」 */}
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.button
              key="keep-seat-btn"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowReservationModal(true);
              }}
              className="flex-1 py-3.5 px-4 rounded-xl font-bold transition-all touch-manipulation flex items-center justify-center gap-2"
              style={{
                background: darkTheme.goldGradient,
                color: darkTheme.background,
                boxShadow: darkTheme.shadowGold,
              }}
            >
              <Clock className="w-4 h-4" />
              {t('map.keep_seat')}
            </motion.button>
          ) : (
            <motion.button
              key="view-details-btn"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              whileHover={{ scale: isNavigating ? 1 : 1.02 }}
              whileTap={{ scale: isNavigating ? 1 : 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isNavigating) {
                  onNavigateToDetail(store.id);
                }
              }}
              disabled={isNavigating}
              className="flex-1 py-3.5 px-4 rounded-xl font-bold transition-all touch-manipulation flex items-center justify-center gap-2"
              style={{
                background: isNavigating ? '#B8956E' : darkTheme.goldGradient,
                color: darkTheme.background,
                boxShadow: isNavigating ? 'none' : darkTheme.shadowGold,
                opacity: isNavigating ? 0.8 : 1,
                cursor: isNavigating ? 'not-allowed' : 'pointer',
              }}
            >
              {isNavigating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('common.loading')}</span>
                </>
              ) : (
                t('map.view_details')
              )}
            </motion.button>
          )}
        </AnimatePresence>

        <motion.a
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          href={googleMapsDirectionUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            sendGAEvent('route_search_click', {
              store_id: store.id,
              store_name: store.name,
            });
          }}
          className="flex-1 py-3.5 px-4 rounded-xl font-bold transition-all touch-manipulation flex items-center justify-center gap-2"
          style={{
            background: isExpanded ? 'rgba(201, 168, 108, 0.1)' : `${darkTheme.accent}15`,
            color: darkTheme.accent,
            border: `1px solid ${darkTheme.borderGold}`,
          }}
        >
          <Navigation className="w-4 h-4" />
          {t('map.go_to_store')}
        </motion.a>
      </motion.div>

      {/* 席キープモーダル（ボタンは非表示、外部から開閉制御） */}
      <InstantReservationButton
        storeId={store.id}
        storeName={store.name}
        hideButton
        externalOpen={showReservationModal}
        onExternalOpenChange={setShowReservationModal}
      />
    </motion.div>
  );
}
