'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  MapPin,
  Store,
  Menu,
  X,
  FileText,
  Shield,
  HelpCircle,
  Globe,
  Radio,
  ChevronRight,
  Phone,
  CheckCircle,
  Building2,
  AlertCircle,
  MessageCircle,
  Instagram,
  Mail,
  ExternalLink,
  Scale,
  LogIn,
  Loader2,
  Users,
  Landmark,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { useLanguage, SUPPORTED_LANGUAGES, LANGUAGE_META } from '@/lib/i18n/context';
import type { Language } from '@/lib/i18n/translations';
import { supabase } from '@/lib/supabase/client';
import { locationCache } from '@/lib/cache';
import { useAppMode } from '@/lib/app-mode-context';
import { newsTranslations } from '@/lib/news-data';
import { SponsorModal } from '@/components/sponsors/sponsor-modal';
import { SponsorCtaButton } from '@/components/sponsors/sponsor-cta-button';
import { LineFriendCta } from '@/components/line/line-friend-cta';
import { SponsorProvider, useSponsor } from '@/lib/sponsors/context';
import {
  fetchActiveStoreParticipations,
  type ActiveStoreEvent,
} from '@/lib/types/active-store-event';

// ============================================
// 統一カラーパレット
// → useAppMode().colorsA で取得（app-mode-context.tsx）
// ============================================

interface PartnerStore {
  id: string;
  name: string;
  image_urls: string[] | null;
  website_url: string | null;
  description: string | null;
  vacancy_status: 'vacant' | 'open' | 'full' | 'closed';
}

const DEFAULT_LOCATION = {
  lat: 33.2382,
  lng: 131.6126,
  timestamp: Date.now(),
  isDefault: true,
};

const LP_NAVY = '#13294b';
const LP_YELLOW = '#ffc82c';

// LINE公式アカウント 友だち追加URL（Basic ID @621uzlfv → @ を %40 にURLエンコード）
const LINE_OA_FRIEND_URL = 'https://line.me/R/ti/p/%40621uzlfv';
const LINE_BRAND_ICON_URL =
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1776852523/LINE_Brand_icon_zfypmz.png';
const LP_ON_NAVY = {
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.78)',
  textSubtle: 'rgba(255, 255, 255, 0.55)',
  border: 'rgba(255, 255, 255, 0.14)',
} as const;
/** Company以外のセクション上のカード（オフホワイト） */
const LP_CARD = {
  bg: '#F7F3E9',
  text: '#13294b',
  textMuted: '#4A5568',
  textSubtle: '#718096',
  borderSubtle: 'rgba(19, 41, 75, 0.1)',
} as const;

const GoldDivider = () => (
  <div className="flex items-center justify-center gap-3 my-6">
    <div className="h-px flex-1 max-w-16" style={{ backgroundColor: `${LP_YELLOW}40` }} />
    <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: LP_YELLOW }} />
    <div className="h-px flex-1 max-w-16" style={{ backgroundColor: `${LP_YELLOW}40` }} />
  </div>
);

/**
 * セクション間を自然な曲線で繋ぐSVGウェーブ。
 * `fill` に "上のセクション色" を渡し、`position='bottom'` なら上セクション下端に、
 * `position='top'` なら下セクション上端に絶対配置する。
 */
const WaveDivider = ({
  fill,
  position = 'bottom',
  className = '',
}: {
  fill: string;
  position?: 'top' | 'bottom';
  className?: string;
}) => (
  <svg
    className={`absolute ${position === 'bottom' ? 'bottom-0' : 'top-0'} left-0 right-0 w-full pointer-events-none ${className}`}
    viewBox="0 0 1440 80"
    preserveAspectRatio="none"
    style={{
      display: 'block',
      height: '60px',
      transform: position === 'top' ? 'rotate(180deg) translateY(1px)' : 'translateY(1px)',
    }}
    aria-hidden
  >
    <path
      d="M0,40 C240,80 480,0 720,30 C960,60 1200,20 1440,50 L1440,80 L0,80 Z"
      fill={fill}
    />
  </svg>
);

export default function LandingPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { colorsA: colors } = useAppMode();

  /** Bar: ページ=ネイビー・カード=オフ白 */
  const lpPage = {
    bg: LP_NAVY,
    text: LP_ON_NAVY.text,
    textMuted: LP_ON_NAVY.textMuted,
    textSubtle: LP_ON_NAVY.textSubtle,
    border: LP_ON_NAVY.border,
  } as const;
  const lpElevated = {
    bg: LP_CARD.bg,
    text: LP_CARD.text,
    textMuted: LP_CARD.textMuted,
    textSubtle: LP_CARD.textSubtle,
    border: LP_CARD.borderSubtle,
  } as const;
  const lpFab = {
    bg: '#FFFFFFE6',
    border: LP_CARD.borderSubtle,
    icon: LP_CARD.text,
  } as const;
  const lpDotInactive = 'rgba(255, 255, 255, 0.28)';
  const lpLinkOnElevated = LP_NAVY;
  const lpSubtitleOnElevated = colors.accentDark;

  /** NEWS〜料金: オフ白ページ＋ネイビーカード */
  const lpMid = {
    page: {
      bg: LP_CARD.bg,
      text: LP_CARD.text,
      textMuted: LP_CARD.textMuted,
      textSubtle: LP_CARD.textSubtle,
      border: LP_CARD.borderSubtle,
    },
    elevated: {
      bg: LP_NAVY,
      text: LP_ON_NAVY.text,
      textMuted: LP_ON_NAVY.textMuted,
      textSubtle: LP_ON_NAVY.textSubtle,
      border: LP_ON_NAVY.border,
    },
    fab: {
      bg: `rgba(19, 41, 75, 0.9)`,
      border: 'rgba(255, 198, 45, 0.35)',
      icon: LP_ON_NAVY.text,
    },
    dotInactive: 'rgba(19, 41, 75, 0.22)',
    linkOnElevated: LP_YELLOW,
    subtitleOnElevated: LP_ON_NAVY.textSubtle,
  };

  /** オフホワイト／白地ではアクセント文字をネイビーに（イエローは暗色面のみ） */
  const accentTextOnLightBg = (surfaceBg: string) =>
    surfaceBg === LP_CARD.bg || surfaceBg === '#FFFFFF' ? LP_NAVY : LP_YELLOW;

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showStoreActionsModal, setShowStoreActionsModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'loading'>('prompt');
  const [showToast, setShowToast] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [partnerStores, setPartnerStores] = useState<PartnerStore[]>([]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeEvents, setActiveEvents] = useState<ActiveStoreEvent[]>([]);
  const locationAttemptRef = useRef(false);

  const renderWithLineBreaks = (text: string) => {
    return text.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Hero背景画像（Cloudinary最適化: f_auto,q_auto）
  const heroImage =
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1781483273/Hero_nd2fnb.png';

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const prevBodyColor = body.style.backgroundColor;
    const bg = LP_NAVY;
    root.style.background = bg;
    body.style.background = bg;
    body.style.backgroundColor = '';
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
      body.style.backgroundColor = prevBodyColor;
    };
  }, []);

  // Hero画像をプリロードして初期表示の空白を防ぐ
  useEffect(() => {
    const img = new Image();
    img.src = heroImage;
  }, [heroImage]);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 1.05]);


  const getLocationWithFallback = useCallback((): Promise<{ lat: number; lng: number; isDefault?: boolean }> => {
    return new Promise((resolve) => {
      if (locationAttemptRef.current) { resolve(DEFAULT_LOCATION); return; }
      locationAttemptRef.current = true;
      if (!navigator.geolocation) { resolve(DEFAULT_LOCATION); return; }
      const cached = localStorage.getItem('userLocation');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            resolve({ lat: parsed.lat, lng: parsed.lng, isDefault: parsed.isDefault });
            return;
          }
        } catch {}
      }
      let resolved = false;
      const timeoutId = setTimeout(() => { if (!resolved) { resolved = true; resolve(DEFAULT_LOCATION); } }, 5000);
      navigator.geolocation.getCurrentPosition(
        (position) => { if (!resolved) { resolved = true; clearTimeout(timeoutId); resolve({ lat: position.coords.latitude, lng: position.coords.longitude }); } },
        () => { if (!resolved) { resolved = true; clearTimeout(timeoutId); resolve(DEFAULT_LOCATION); } },
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
      );
    });
  }, []);

  useEffect(() => {
    const fetchPartnerStores = async () => {
      try {
        const { data, error } = await supabase.from('stores').select('id, name, image_urls, website_url, description, vacancy_status')
          .not('image_urls', 'is', null)
          .limit(10);
        if (error) return;
        if (data) { setPartnerStores((data as PartnerStore[]).filter((store) => store.image_urls && store.image_urls.length > 0)); }
      } catch (error) { console.error('Error fetching partner stores:', error); }
    };
    fetchPartnerStores();
  }, []);

  useEffect(() => {
    const fetchActiveEvents = async () => {
      try {
        const participations = await fetchActiveStoreParticipations();
        const eventMap = new Map<string, ActiveStoreEvent>();
        participations.forEach((p) => {
          if (!eventMap.has(p.event.id)) eventMap.set(p.event.id, p.event);
        });
        setActiveEvents(Array.from(eventMap.values()));
      } catch (error) {
        console.error('Error fetching active events:', error);
      }
    };
    fetchActiveEvents();
  }, []);

  useEffect(() => {
    const checkVacantStores = async () => {
      try {
        const { data, error } = await supabase.from('stores').select('id, vacancy_status').eq('vacancy_status', 'vacant').limit(1);
        if (error) return;
        if (data && data.length > 0) { setShowToast(true); setTimeout(() => setShowToast(false), 3000); }
      } catch (error) { console.error('Error checking vacant stores:', error); }
    };
    const initialTimer = setTimeout(checkVacantStores, 2000);
    const interval = setInterval(checkVacantStores, 8000);
    return () => { clearTimeout(initialTimer); clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (partnerStores.length === 0) return;
    const checkIsMobile = () => window.innerWidth < 640;
    if (!checkIsMobile()) return;
    const interval = setInterval(() => { setCurrentSlide((prev) => (prev + 1) % partnerStores.length); }, 5000);
    return () => clearInterval(interval);
  }, [partnerStores.length]);

  useEffect(() => {
    const handleScroll = () => {
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { icon: Radio, label: t('menu.news'), href: '/news' },
    { icon: FileText, label: t('menu.terms'), href: '/terms' },
    { icon: Shield, label: t('menu.privacy'), href: '/privacy' },
    { icon: HelpCircle, label: t('menu.faq'), href: '/faq' },
    { icon: FileText, label: t('menu.release_notes'), href: '/release-notes' },
    { icon: MessageCircle, label: t('menu.contact'), href: '/contact' },
  ];

  const footerLinks = [
    { icon: Building2, label: t('landing.company_info'), href: 'https://www.nobody-inc.jp/' },
    { icon: Radio, label: t('menu.news'), href: '/news' },
    { icon: FileText, label: t('static_pages.terms_title'), href: '/terms' },
    { icon: Scale, label: t('static_pages.legal_title'), href: '/legal' },
  ];

  const handleMapClick = () => { setShowLocationModal(true); };

  const handleLocationPermission = async (allow: boolean) => {
    if (allow) {
      setLocationPermission('loading');
      // 位置情報キャッシュをリセットして最新の位置を取得
      locationCache.clear();
      localStorage.removeItem('userLocation');
      locationAttemptRef.current = false;
      try {
        const location = await getLocationWithFallback();
        localStorage.setItem('userLocation', JSON.stringify({ ...location, timestamp: Date.now() }));
        locationCache.set({ lat: location.lat, lng: location.lng, isDefault: location.isDefault });
        if (location.isDefault) {
          // 位置情報が取得できなかった（デフォルト位置）場合はモーダル内でエラー表示
          setLocationPermission('denied');
        } else {
          setLocationPermission('granted');
          setTimeout(() => { setShowLocationModal(false); router.push('/map?from=landing'); }, 300);
        }
      } catch {
        setLocationPermission('denied');
      }
    } else {
      setLocationPermission('denied');
    }
  };

  const handleLanguageSelect = (lang: Language) => { 
    setLanguage(lang); 
    setShowLanguageMenu(false);
    window.location.reload(); 
  };

  // 言語メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.language-menu-container')) {
        setShowLanguageMenu(false);
      }
    };
    if (showLanguageMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showLanguageMenu]);

  const handleStoreCardClick = (storeId: string) => { router.push(`/store/${storeId}`); };
  const nextSlide = () => { if (partnerStores.length === 0) return; setCurrentSlide((prev) => (prev + 1) % partnerStores.length); };
  const prevSlide = () => { if (partnerStores.length === 0) return; setCurrentSlide((prev) => (prev - 1 + partnerStores.length) % partnerStores.length); };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden" style={{ background: lpPage.bg }}>
      {/* 背景装飾エフェクト */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div className="absolute w-[700px] h-[700px] rounded-full" style={{ backgroundColor: 'rgba(255, 197, 45, 0.08)', top: '-250px', right: '-250px', filter: 'blur(80px)' }} animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[500px] h-[500px] rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', bottom: '10%', left: '-150px', filter: 'blur(60px)' }} animate={{ opacity: [0.2, 0.35, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className="fixed top-20 left-1/2 z-50">
            <div className="flex items-center gap-3 px-5 py-3 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 198, 45, 0.35)', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-2.5 h-2.5 rounded-full" style={{ background: '#4ADE80', boxShadow: '0 0 10px #4ADE80' }} />
              <span className="text-sm font-medium lg:text-lg" style={{ color: lpPage.text }}>{t('landing.seats_available')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 safe-top" style={{ background: lpPage.bg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${lpPage.border}` }}>
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 min-w-0">
            <motion.button
              type="button"
              onClick={() => window.location.reload()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-3 rounded-lg touch-manipulation text-left sm:h-auto sm:min-h-10 sm:w-auto sm:justify-start sm:px-1 sm:-ml-1"
              style={{ color: accentTextOnLightBg(lpPage.bg) }}
              aria-label={t('menu.for_stores')}
            >
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1777628277/e075bc44-b508-4353-ad2e-b91e79e08186_fqrdzs.png"
                alt="NIKENME+"
                className="h-10 w-auto shrink-0"
              />
              <span
                className="hidden sm:inline-block text-[9px] px-2 py-1 rounded-full font-medium tracking-[0.1em] uppercase shrink-0"
                style={{ background: 'rgba(255, 198, 45, 0.15)', border: '1px solid rgba(255, 198, 45, 0.4)', color: LP_YELLOW }}
              >
                {t('landing.night_spot')}
              </span>
            </motion.button>
          </motion.div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 言語切替 */}
            <div className="relative language-menu-container">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); setShowLanguageMenu(!showLanguageMenu); }}
                className="touch-manipulation active:scale-95 rounded-lg"
                style={{ color: showLanguageMenu ? accentTextOnLightBg(lpPage.bg) : lpPage.text }}
                title={t('menu.language')}
              >
                <Globe className="w-5 h-5" />
              </Button>
              {/* 言語選択ドロップダウン */}
              <AnimatePresence>
                {showLanguageMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-52 z-50"
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
                        <p className="text-xs px-3 py-2 font-bold lg:text-base" style={{ color: lpPage.textMuted }}>
                          {t('language_selector.title') || t('menu.language')}
                        </p>
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <button
                            key={lang}
                            onClick={() => handleLanguageSelect(lang)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                              language === lang
                                ? 'bg-brass-500/20'
                                : 'hover:bg-cream-50/10'
                            }`}
                            style={{ color: language === lang ? LP_YELLOW : lpPage.text }}
                          >
                            <span className="text-xl lg:text-3xl">{LANGUAGE_META[lang].flag}</span>
                            <span className="font-bold text-sm flex-1 text-left lg:text-lg">
                              {LANGUAGE_META[lang].nativeName}
                            </span>
                            {language === lang && (
                              <CheckCircle className="w-4 h-4" style={{ color: LP_YELLOW }} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* ハンバーガーメニュー */}
            <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)} style={{ color: lpPage.textMuted }}>{showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</Button>
          </div>
        </div>
      </header>

      {/* Side Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" style={{ background: 'rgba(10, 22, 40, 0.9)' }} onClick={() => setShowMenu(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 w-80 z-50 overflow-y-auto" style={{ background: lpPage.bg, borderLeft: `1px solid ${lpPage.border}` }}>
              <div className="p-6 pt-20">
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                  className="flex flex-col items-center mb-8 pb-6"
                  style={{ borderBottom: `1px solid ${lpPage.border}` }}
                >
                  <img
                    src="https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1777628277/e075bc44-b508-4353-ad2e-b91e79e08186_fqrdzs.png"
                    alt="NIKENME+"
                    className="h-14 w-auto max-w-[240px] object-contain object-center"
                  />
                </motion.div>
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-1 lg:text-3xl" style={{ color: lpPage.text }}>{t('menu.title')}</h2>
                  <p className="text-sm lg:text-lg" style={{ color: lpPage.textSubtle }}>{t('menu.subtitle')}</p>
                </div>
                <nav className="space-y-1">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                        <Link href={item.href} onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-4 rounded-lg transition-colors group" style={{ color: lpPage.textMuted }}>
                          <Icon className="w-5 h-5" style={{ color: accentTextOnLightBg(lpPage.bg) }} /><span className="group-hover:opacity-100 font-medium">{item.label}</span><ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>
                {/* ログイン（顧客 / 店舗 / 運営すべて共通） + 加盟店登録 */}
                <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${lpPage.border}` }}>
                  <p className="text-sm font-medium mb-3 lg:text-lg" style={{ color: lpPage.textMuted }}>{t('menu.account')}</p>
                  <Link href="/login" onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-4 rounded-lg transition-colors group" style={{ color: lpPage.textMuted }}>
                    <LogIn className="w-5 h-5" style={{ color: accentTextOnLightBg(lpPage.bg) }} /><span className="group-hover:opacity-100 font-medium">{t('auth.login')}</span><ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                  </Link>
                  <Link href="/partner/apply" onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-4 rounded-lg transition-colors group" style={{ color: lpPage.textMuted }}>
                    <Building2 className="w-5 h-5" style={{ color: accentTextOnLightBg(lpPage.bg) }} /><span className="group-hover:opacity-100 font-medium">{t('landing.cta_button_recruitment')}</span><ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                  </Link>
                </div>
                {/* Official Account */}
                <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${lpPage.border}` }}>
                  <p className="text-sm font-medium mb-3 lg:text-lg" style={{ color: lpPage.textMuted }}>{t('menu.official_account')}</p>
                  <a href="https://www.instagram.com/nikenme_nobody/" target="_blank" rel="noopener noreferrer" onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-4 rounded-lg transition-colors group" style={{ color: lpPage.textMuted }}>
                    <Instagram className="w-5 h-5" style={{ color: accentTextOnLightBg(lpPage.bg) }} /><span className="group-hover:opacity-100 font-medium">Instagram</span><ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                  </a>
                  <a href={LINE_OA_FRIEND_URL} target="_blank" rel="noopener noreferrer" onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-4 rounded-lg transition-colors group" style={{ color: lpPage.textMuted }}>
                    <img src={LINE_BRAND_ICON_URL} alt="" width={20} height={20} className="w-5 h-5 object-contain shrink-0" /><span className="group-hover:opacity-100 font-medium">LINE</span><ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                  </a>
                </div>
                <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${lpPage.border}` }}>
                  <p className="text-xs text-center lg:text-base" style={{ color: lpPage.textSubtle }}>© 2025 NIKENME+<br />{t('menu.version')}</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative h-[100svh] lg:h-[96svh] overflow-hidden" style={{ background: lpPage.bg }}>
        {/* Hero全体を覆う背景画像（PC/モバイル共通でセクション全面） */}
        <motion.div className="absolute inset-0 z-0" style={{ opacity: heroOpacity, scale: heroScale }}>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${heroImage}')` }}
          />
        </motion.div>

        {/* テキスト可読性のためのオーバーレイ */}
        {/* モバイル: 下から上へのグラデーション（テキストは下部中央） */}
        <div
          className="absolute inset-0 z-[1] lg:hidden"
          style={{ background: 'linear-gradient(to top, rgba(19,41,75,0.88) 0%, rgba(19,41,75,0.45) 42%, rgba(19,41,75,0.12) 100%)' }}
          aria-hidden
        />
        {/* PC: 左から右へのグラデーション（テキストは左カラム） */}
        <div
          className="absolute inset-0 z-[1] hidden lg:block"
          style={{ background: 'linear-gradient(to right, rgba(19,41,75,0.92) 0%, rgba(19,41,75,0.72) 32%, rgba(19,41,75,0.3) 58%, rgba(19,41,75,0) 82%)' }}
          aria-hidden
        />

        <div className="relative z-10 h-full grid grid-cols-1 lg:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
          {/* Left Column - PC only: Service description */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:flex flex-col justify-center px-12 xl:px-20 relative z-20"
          >
            {/* 装飾: 左上のイエローのドット */}
            <div
              className="absolute top-14 left-12 xl:left-20 w-1.5 h-1.5 rotate-45"
              style={{ backgroundColor: LP_YELLOW, opacity: 0.9 }}
              aria-hidden
            />
            <div
              className="absolute top-14 left-[3.5rem] xl:left-[5.5rem] h-px w-20"
              style={{ backgroundColor: LP_YELLOW }}
              aria-hidden
            />

            <div className="max-w-lg">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <span
                  className="inline-block text-[10px] tracking-[0.32em] uppercase font-semibold mb-6"
                  style={{ color: LP_YELLOW }}
                >
                  Night Discovery Platform
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h1 className="text-2xl xl:text-[2.4rem] leading-[1.25] font-bold mb-7 tracking-tight" style={{ color: lpPage.text }}>
                  {t('landing.hero_pc_title').split('\n').map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </h1>
                <p className="text-base xl:text-lg leading-[1.85] mb-10" style={{ color: lpPage.textMuted }}>
                  {renderWithLineBreaks(t('landing.hero_pc_description'))}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap items-center gap-3"
              >
                {/* 主CTA: 地図でお店を探す */}
                <button
                  type="button"
                  onClick={handleMapClick}
                  className="inline-flex w-fit max-w-full items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95 lg:text-base"
                  style={{ color: LP_NAVY, background: LP_YELLOW, boxShadow: '0 8px 24px rgba(255, 198, 45, 0.32)' }}
                >
                  <Store className="w-4 h-4" />{t('landing.cta_button_primary')}
                </button>
                {/* 副CTA: LINE友だち追加（LINEカラー・転換装置・source=hero） */}
                <LineFriendCta source="hero" variant="compact" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="text-xs tracking-wider mt-6 lg:text-sm"
                style={{ color: lpPage.textSubtle }}
              >
                {t('landing.hero_subcopy')}
              </motion.p>
            </div>
          </motion.aside>

          {/* Right Column (full width on mobile): テキストオーバーレイ（背景画像はセクション全面に配置済み） */}
          <div className="relative flex flex-col px-4 lg:px-0">
            {/* PC: 左テキストと画像を繋ぐ細い縦のゴールドアクセントライン */}
            <motion.div
              className="absolute top-[18%] bottom-[18%] left-0 w-px z-10 hidden lg:block"
              style={{
                backgroundColor: `${LP_YELLOW}80`,
              }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.6 }}
            />

            <div className="flex-1" />

            {/* Mobile/Tablet: show text overlay on image */}
            <motion.div
              className="relative z-10 text-center pb-12 mt-3 lg:hidden px-2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <span
                className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-4"
                style={{ color: LP_YELLOW, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
              >
                Night Discovery Platform
              </span>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-bold mb-4 leading-tight tracking-tight">
                <span style={{ color: '#FFFFFF', textShadow: '0 2px 14px rgba(0,0,0,0.5)' }}>
                  {t('landing.hero_catchphrase').split('\n').map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </h1>
              {/* サービス説明（PCの説明文をモバイルでも表示） */}
              <p
                className="text-sm sm:text-base leading-relaxed mb-6 px-2"
                style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}
              >
                {renderWithLineBreaks(t('landing.hero_pc_description'))}
              </p>
              {/* CTA群 */}
              <div className="mb-6 mx-auto max-w-xs">
                {/* 主CTA: 地図でお店を探す */}
                <button
                  type="button"
                  onClick={handleMapClick}
                  className="inline-flex w-fit max-w-full items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-semibold transition-all active:scale-95"
                  style={{ color: LP_NAVY, background: LP_YELLOW, boxShadow: '0 8px 24px rgba(255, 198, 45, 0.35)' }}
                >
                  <Store className="w-4 h-4" />{t('landing.cta_button_primary')}
                </button>
                {/* 副CTA: LINE友だち追加（LINEカラー・転換装置・source=hero） */}
                <LineFriendCta source="hero" variant="compact" className="mt-3" />
              </div>
              <p className="text-xs sm:text-sm tracking-wider mb-3 lg:text-base" style={{ color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                {t('landing.hero_subcopy')}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Hero 下端: 次セクション(オフホワイト)への自然な曲線ウェーブ */}
        <WaveDivider fill={lpMid.page.bg} position="bottom" className="z-20" />
      </section>

      {/* お知らせセクション */}
      <section className="relative py-8 md:py-16 px-4 overflow-hidden" style={{ background: lpMid.page.bg }}>
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-3 lg:text-base" style={{ color: lpMid.page.text }}>News</span>
            <h2 className="text-2xl sm:text-3xl font-bold lg:text-4xl" style={{ color: lpMid.page.text }}>{t('landing.news_title')}</h2>
          </motion.div>
          <div className="space-y-3">
            {(newsTranslations[language] || newsTranslations.ja).slice(0, 3).map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: lpMid.elevated.bg, border: `1px solid ${lpMid.elevated.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <span className="text-xs font-medium flex-shrink-0 pt-0.5 lg:text-base" style={{ color: LP_YELLOW }}>{item.date}</span>
                <div>
                  <p className="text-sm font-bold mb-0.5 lg:text-lg" style={{ color: lpMid.elevated.text }}>{item.title}</p>
                  <p className="text-xs lg:text-base" style={{ color: lpMid.elevated.textMuted }}>{item.body}</p>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium transition-all hover:opacity-80 lg:text-base" style={{ color: lpMid.linkOnElevated }}>
                      <ExternalLink className="w-3 h-3" />
                      {item.linkLabel || item.link}
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-6">
            <Link href="/news" className="text-sm font-medium inline-flex items-center gap-1 transition-all hover:scale-105 lg:text-lg" style={{ color: lpMid.page.text }}>
              {t('landing.news_view_all')} <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ backgroundColor: `${LP_YELLOW}40` }} />
      </section>

      {/* イベントセクション（参加店舗があるイベントのみ表示） */}
      {activeEvents.length > 0 && (
        <section className="relative py-8 md:py-16 px-4 overflow-hidden" style={{ background: lpMid.page.bg }}>
          <div className="container mx-auto max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
              <GoldDivider />
              <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-3 lg:text-base" style={{ color: lpMid.page.text }}>
                {t('landing.events_subtitle')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold lg:text-4xl flex items-center justify-center gap-2" style={{ color: lpMid.page.text }}>
                {t('landing.events_title')}
              </h2>
            </motion.div>
            <div className="space-y-4">
              {activeEvents.map((event, index) => (
                <motion.button
                  key={event.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => router.push('/store-list?event=true')}
                  className="w-full text-left rounded-2xl overflow-hidden block"
                  style={{
                    background: LP_YELLOW,
                    border: `1px solid ${LP_NAVY}33`,
                    boxShadow: `0 6px 20px ${LP_NAVY}1f`,
                  }}
                  aria-label={`${event.title} - ${t('landing.events_view_stores')}`}
                >
                  {event.image_url && (
                    <div className="aspect-[16/9] w-full overflow-hidden" style={{ background: `${LP_NAVY}10` }}>
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-bold truncate lg:text-xl" style={{ color: LP_NAVY }}>
                        {event.title}
                      </p>
                      <p className="text-xs sm:text-sm font-medium mt-1 inline-flex items-center gap-1" style={{ color: LP_NAVY }}>
                        {t('landing.events_view_stores')} <ChevronRight className="w-4 h-4" />
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
          <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ backgroundColor: `${LP_YELLOW}40` }} />
        </section>
      )}


      {/* Partner Stores Section - 流れるマーキー */}
      {partnerStores.length > 0 && (
        <section className="relative py-12 md:py-24 overflow-hidden" style={{ background: lpPage.bg }}>
          <div className="container mx-auto max-w-6xl relative z-10 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <GoldDivider />
              <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4 lg:text-base" style={{ color: accentTextOnLightBg(lpPage.bg) }}>Partner Stores</span>
              <h2 className="text-2xl sm:text-3xl md:text-6xl font-bold mb-4" style={{ color: lpPage.text }}>{t('common.partner_stores')}</h2>
              <p className="text-lg max-w-xl mx-auto lg:text-2xl" style={{ color: lpPage.textMuted }}>{t('common.partner_stores_subtitle')}</p>
            </motion.div>
          </div>
          <div className="relative w-full overflow-hidden">
            <motion.div
              className="flex gap-4"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ x: { duration: partnerStores.length * 4, repeat: Infinity, ease: 'linear' } }}
              style={{ width: 'max-content' }}
            >
              {[...partnerStores, ...partnerStores].map((store, index) => (
                <div
                  key={`${store.id}-${index}`}
                  className="flex-shrink-0 w-[260px] sm:w-[320px] relative group cursor-pointer overflow-hidden rounded-2xl"
                  style={{ border: '1px solid rgba(255, 198, 45, 0.35)' }}
                  onClick={() => handleStoreCardClick(store.id)}
                >
                  <div className="relative aspect-[4/3]">
                    <img src={store.image_urls?.[0] || ''} alt={store.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0" style={{ backgroundColor: 'rgba(19,41,75,0.65)' }} />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-sm font-bold truncate lg:text-lg" style={{ color: '#FFFFFF', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{store.name}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
          <div className="container mx-auto max-w-6xl relative z-10 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-10">
              <Button
                onClick={() => router.push('/store-list')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all hover:scale-105 min-h-[48px]"
                style={{ background: `${LP_YELLOW}15`, border: '1px solid rgba(255, 198, 45, 0.4)', color: LP_YELLOW }}
              >
                <Store className="w-5 h-5" />
                {t('common.view_all_partners')}
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* 解決策・サービスの強みセクション */}
      <section className="relative py-12 md:py-24 px-4 overflow-hidden" style={{ background: lpMid.page.bg }}>
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4 lg:text-base" style={{ color: lpMid.page.text }}>{t('landing.solution_subtitle')}</span>
            <h2 className="text-2xl sm:text-3xl md:text-6xl font-bold mb-4" style={{ color: lpMid.page.text }}>{t('landing.solution_title')}</h2>
            <p className="text-lg max-w-xl mx-auto lg:text-2xl" style={{ color: lpMid.page.textMuted }}>{renderWithLineBreaks(t('landing.solution_body'))}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              // 雰囲気がわかる / 空席がわかる / 安心できる の3アイコンを Cloudinary 画像化（`f_auto,q_auto` 最適化）。
              {
                num: 1,
                imgSrc:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1778062912/ChatGPT_Image_2026%E5%B9%B45%E6%9C%886%E6%97%A5_18_30_59_bww8dp.png',
              },
              {
                num: 2,
                imgSrc:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1778062912/ChatGPT_Image_2026%E5%B9%B45%E6%9C%886%E6%97%A5_18_34_45_erfmyp.png',
              },
              {
                num: 3,
                imgSrc:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1778062911/ChatGPT_Image_2026%E5%B9%B45%E6%9C%886%E6%97%A5_18_40_04_d7a9hj.png',
              },
            ].map(({ num, imgSrc }, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.15 }}>
                  <Card className="h-full p-8 group cursor-pointer transition-all duration-500 hover:translate-y-[-4px] relative overflow-hidden text-center" style={{ background: lpMid.elevated.bg, backdropFilter: 'blur(10px)', border: `1px solid ${lpMid.elevated.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                    <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: `${LP_YELLOW}10` }} />
                    <div className="relative z-10 flex flex-col items-center">
                      <motion.div
                        className="w-28 h-28 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-6 mx-auto overflow-hidden"
                        style={{ background: `${LP_YELLOW}15`, border: `1px solid ${LP_YELLOW}25` }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <img
                          src={imgSrc}
                          alt={t(`landing.solution_feature${num}_title`)}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain"
                        />
                      </motion.div>
                      <h3 className="text-xl font-bold mb-2 lg:text-3xl" style={{ color: lpMid.elevated.text }}>{t(`landing.solution_feature${num}_title`)}</h3>
                      <p className="text-xs uppercase tracking-wider mb-4 font-medium lg:text-base" style={{ color: lpMid.subtitleOnElevated }}>{t(`landing.solution_feature${num}_title_en`)}</p>
                      <p style={{ color: lpMid.elevated.textMuted }} className="leading-relaxed text-sm lg:text-lg">
                        {/* PC: \n を除去して幅で自然折返し / モバイル: \n を <br/> に変換 */}
                        <span className="lg:hidden">{renderWithLineBreaks(t(`landing.solution_feature${num}_desc`))}</span>
                        <span className="hidden lg:inline">{t(`landing.solution_feature${num}_desc`).replace(/\n/g, '')}</span>
                      </p>
                    </div>
                    <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: LP_YELLOW }} initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
                  </Card>
                </motion.div>
              ))}
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section className="relative py-12 md:py-24 px-4 overflow-hidden" style={{ background: lpMid.page.bg }}>
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4 lg:text-base" style={{ color: lpMid.page.text }}>{t('landing.howto_subtitle')}</span>
            <h2 className="text-2xl sm:text-3xl md:text-6xl font-bold" style={{ color: lpMid.page.text }}>{t('landing.howto_title')}</h2>
          </motion.div>
          {(() => {
            const howtoSteps = [
              { step: '01', num: 1, highlight: false },
              { step: '02', num: 2, highlight: false },
              { step: '03', num: 3, highlight: true, badge: 'common.auto_voice' as const },
            ];
            const stepIcons = [MapPin, Store, Phone];
            const images = [
              'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_1024/v1781495370/ChatGPT_Image_2026%E5%B9%B46%E6%9C%8814%E6%97%A5_22_26_55_2_w2ayfd.png',
              'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_1024/v1781495436/ChatGPT_Image_2026%E5%B9%B46%E6%9C%8814%E6%97%A5_22_26_56_4_knwhwc.png',
              'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_1024/v1781494974/%E5%B8%AD%E3%82%92%E3%82%AD%E3%83%BC%E3%83%95%E3%82%9A%E3%81%99%E3%82%8B_xuhood.png',
            ];
            const renderStepCard = (index: number) => {
              const { step, num, highlight, badge } = howtoSteps[index];
              const Icon = stepIcons[index];
              const stepTitle = t(`landing.howto_step${num}_title`);
              const isStep4 = num === 4;
              return (
                <Card className="h-full overflow-hidden group relative" style={{ background: lpMid.elevated.bg, border: `1px solid ${lpMid.elevated.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div className="p-6 sm:p-8 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-bold lg:text-6xl" style={{ color: highlight ? LP_YELLOW : LP_ON_NAVY.textMuted }}>{step}</span>
                        <motion.div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${LP_YELLOW}15`, border: `1px solid ${LP_YELLOW}25` }} animate={isStep4 ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                          <Icon className="w-5 h-5" style={{ color: highlight ? LP_YELLOW : lpMid.elevated.textMuted }} />
                        </motion.div>
                      </div>
                      {badge === 'common.auto_voice' && (<span className="text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider" style={{ background: LP_YELLOW, color: LP_NAVY, border: '1px solid rgba(255, 198, 45, 0.55)' }}>{t('common.auto_voice')}</span>)}
                    </div>
                    <h3 className="text-xl font-bold mb-1 lg:text-3xl" style={{ color: lpMid.elevated.text }}>{stepTitle}</h3>
                    <p className="text-xs uppercase tracking-wider mb-4 font-medium lg:text-base" style={{ color: lpMid.subtitleOnElevated }}>{t(`landing.howto_step${num}_title_en`)}</p>
                    <p className="mb-6 leading-relaxed text-sm lg:text-lg" style={{ color: lpMid.elevated.textMuted }}>{renderWithLineBreaks(t(`landing.howto_step${num}_desc`))}</p>
                    <div className="rounded-xl overflow-hidden relative" style={{ border: `1px solid ${lpMid.elevated.border}` }}>
                      <img src={images[index]} alt={stepTitle} className="w-full h-auto object-cover" />
                      {isStep4 && (<motion.div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(255,197,45,0.12)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }} />)}
                    </div>
                  </div>
                  <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: LP_YELLOW }} initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
                </Card>
              );
            };
            return (
              <>
                {/* モバイル: 縦並び */}
                <div className="flex flex-col gap-6 lg:hidden">
                  {howtoSteps.map((_, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                      {renderStepCard(index)}
                    </motion.div>
                  ))}
                </div>
                {/* PC: グリッド */}
                <div className="hidden lg:grid lg:grid-cols-3 gap-8">
                  {howtoSteps.map((_, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.15 }}>
                      {renderStepCard(index)}
                    </motion.div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* お客様の声セクション */}
      <section className="relative py-12 md:py-24 px-4 overflow-hidden" style={{ background: lpMid.page.bg }}>
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4 lg:text-base" style={{ color: lpMid.page.text }}>{t('landing.customer_voices_label')}</span>
            <h2 className="text-2xl sm:text-3xl md:text-6xl font-bold mb-4" style={{ color: lpMid.page.text }}>{t('landing.customer_voices_title')}</h2>
            <p className="text-base max-w-2xl mx-auto lg:text-xl" style={{ color: lpMid.page.textMuted }}>
              <span className="lg:hidden block">{renderWithLineBreaks(t('landing.customer_voices_subtitle_mobile'))}</span>
              <span className="hidden lg:inline">{t('landing.customer_voices_subtitle')}</span>
            </p>
          </motion.div>
          {(() => {
            const voices = [1, 2, 3] as const;
            const renderVoiceCard = (n: 1 | 2 | 3) => (
              <Card className="h-full overflow-hidden relative" style={{ background: lpMid.elevated.bg, border: `1px solid ${lpMid.elevated.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div className="p-6 sm:p-8 flex flex-col h-full">
                  <div className="mb-5 flex items-center justify-center">
                    <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: '#FAF7F0', border: `1px solid ${LP_YELLOW}25` }}>
                      <img src={t(`landing.voice${n}_illustration`)} alt={t(`landing.voice${n}_author`)} className="w-full h-full object-contain" loading="lazy" />
                    </div>
                  </div>
                  <span className="text-5xl font-serif leading-none mb-1" style={{ color: LP_YELLOW }}>“</span>
                  <p className="flex-1 leading-relaxed text-sm lg:text-lg mb-6" style={{ color: lpMid.elevated.textMuted }}>{t(`landing.voice${n}_text`)}</p>
                  <div className="pt-4" style={{ borderTop: `1px solid ${lpMid.elevated.border}` }}>
                    <p className="text-sm font-bold lg:text-lg" style={{ color: lpMid.elevated.text }}>{t(`landing.voice${n}_author`)}</p>
                    <p className="text-xs uppercase tracking-wider mt-1 lg:text-sm" style={{ color: lpMid.subtitleOnElevated }}>{t(`landing.voice${n}_role`)}</p>
                  </div>
                </div>
                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: LP_YELLOW }} initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
              </Card>
            );
            return (
              <>
                {/* モバイル: 縦並び */}
                <div className="flex flex-col gap-6 lg:hidden">
                  {voices.map((n, index) => (
                    <motion.div key={n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                      {renderVoiceCard(n)}
                    </motion.div>
                  ))}
                </div>
                {/* PC: グリッド */}
                <div className="hidden lg:grid lg:grid-cols-3 gap-8">
                  {voices.map((n, index) => (
                    <motion.div key={n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.15 }}>
                      {renderVoiceCard(n)}
                    </motion.div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative py-12 md:py-24 px-4 overflow-hidden" style={{ background: lpMid.page.bg }}>
        <div className="container mx-auto max-w-4xl lg:max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 lg:mb-16">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4 lg:text-base" style={{ color: lpMid.page.text }}>{t('landing.pricing_label')}</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 lg:text-4xl" style={{ color: lpMid.page.text }}>{renderWithLineBreaks(t('landing.pricing_title'))}</h2>
            <p className="text-base max-w-2xl mx-auto lg:text-xl" style={{ color: lpMid.page.textMuted }}>{renderWithLineBreaks(t('landing.pricing_subtitle'))}</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8 items-stretch">
            {/* ユーザー（消費者）= 無料 */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -6 }} transition={{ duration: 0.4 }} className="h-full">
              <article className="rounded-2xl h-full flex flex-col p-7 lg:p-8" style={{ background: lpMid.elevated.bg, border: `1px solid ${lpMid.elevated.border}`, boxShadow: '0 12px 32px rgba(19,41,75,0.08)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,200,44,0.14)' }}>
                    <Users className="w-6 h-6" style={{ color: LP_YELLOW }} />
                  </div>
                  <h3 className="text-base font-bold flex-1 min-w-0 leading-snug lg:text-xl" style={{ color: lpMid.elevated.text }}>{t('landing.pricing_user_name')}</h3>
                  <p className="text-xl font-extrabold shrink-0 text-right lg:text-2xl" style={{ color: lpMid.elevated.text }}>{t('landing.pricing_user_price')}</p>
                </div>
                <div className="h-px w-full mb-5" style={{ background: lpMid.elevated.border }} />
                <ul className="space-y-3 mb-7 flex-1">
                  {['pricing_user_feat1', 'pricing_user_feat2', 'pricing_user_feat3'].map((k) => (
                    <li key={k} className="flex items-start gap-2.5 text-sm lg:text-base" style={{ color: lpMid.elevated.textMuted }}>
                      <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: LP_YELLOW }} />
                      <span>{t(`landing.${k}`)}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/map" className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95" style={{ background: 'transparent', color: LP_YELLOW, border: `1.5px solid ${LP_YELLOW}` }}>
                  {t('landing.pricing_user_cta')}<ChevronRight className="w-4 h-4" />
                </Link>
              </article>
            </motion.div>

            {/* 加盟店 = 基本無料／公式LINE配信は有料（おすすめ・アクセント） */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -6 }} transition={{ duration: 0.4, delay: 0.1 }} className="h-full">
              <article className="relative rounded-2xl h-full flex flex-col p-7 lg:p-8" style={{ background: lpMid.elevated.bg, border: `2px solid ${LP_YELLOW}`, boxShadow: `0 16px 44px ${LP_YELLOW}33` }}>
                <span className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider" style={{ background: LP_YELLOW, color: LP_NAVY }}>{t('landing.pricing_badge_popular')}</span>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: LP_YELLOW }}>
                    <Store className="w-6 h-6" style={{ color: LP_NAVY }} />
                  </div>
                  <h3 className="text-base font-bold flex-1 min-w-0 leading-snug lg:text-xl" style={{ color: lpMid.elevated.text }}>{t('landing.pricing_store_name')}</h3>
                  <p className="text-xl font-extrabold shrink-0 text-right lg:text-2xl" style={{ color: lpMid.elevated.text }}>{t('landing.pricing_store_price')}</p>
                </div>
                <p className="text-sm font-bold mb-5" style={{ color: LP_YELLOW }}>{t('landing.pricing_store_price_note')}</p>
                <div className="h-px w-full mb-5" style={{ background: lpMid.elevated.border }} />
                <ul className="space-y-3 mb-7 flex-1">
                  {['pricing_store_feat1', 'pricing_store_feat2', 'pricing_store_feat3'].map((k) => (
                    <li key={k} className="flex items-start gap-2.5 text-sm lg:text-base" style={{ color: lpMid.elevated.textMuted }}>
                      <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: LP_YELLOW }} />
                      <span>{t(`landing.${k}`)}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/partner/apply" className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95" style={{ background: LP_YELLOW, color: LP_NAVY }}>
                  {t('landing.pricing_store_cta')}<ChevronRight className="w-4 h-4" />
                </Link>
              </article>
            </motion.div>

            {/* イベント開催者（自治体・主催者）= 要相談 */}
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} whileHover={{ y: -6 }} transition={{ duration: 0.4, delay: 0.2 }} className="h-full">
              <article className="rounded-2xl h-full flex flex-col p-7 lg:p-8" style={{ background: lpMid.elevated.bg, border: `1px solid ${lpMid.elevated.border}`, boxShadow: '0 12px 32px rgba(19,41,75,0.08)' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,200,44,0.14)' }}>
                    <Landmark className="w-6 h-6" style={{ color: LP_YELLOW }} />
                  </div>
                  <h3 className="text-base font-bold flex-1 min-w-0 leading-snug lg:text-xl" style={{ color: lpMid.elevated.text }}>{renderWithLineBreaks(t('landing.pricing_organizer_name'))}</h3>
                  <p className="text-xl font-extrabold shrink-0 text-right lg:text-2xl" style={{ color: lpMid.elevated.text }}>{t('landing.pricing_organizer_price')}</p>
                </div>
                <div className="h-px w-full mb-5" style={{ background: lpMid.elevated.border }} />
                <ul className="space-y-3 mb-5 flex-1">
                  {['pricing_organizer_feat1', 'pricing_organizer_feat2', 'pricing_organizer_feat3'].map((k) => (
                    <li key={k} className="flex items-start gap-2.5 text-sm lg:text-base" style={{ color: lpMid.elevated.textMuted }}>
                      <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: LP_YELLOW }} />
                      <span>{t(`landing.${k}`)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs leading-relaxed mb-5" style={{ color: lpMid.elevated.textMuted }}>{renderWithLineBreaks(t('landing.pricing_organizer_desc'))}</p>
                <Link href="/contact" className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95" style={{ background: LP_YELLOW, color: LP_NAVY }}>
                  <Mail className="w-4 h-4" />{t('landing.pricing_organizer_cta')}
                </Link>
              </article>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-12 md:py-24 px-4 overflow-hidden" style={{ background: lpMid.page.bg }}>
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 lg:mb-14">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4 lg:text-base" style={{ color: lpMid.page.text }}>{t('landing.faq_label')}</span>
            <h2 className="text-2xl sm:text-3xl font-bold lg:text-4xl" style={{ color: lpMid.page.text }}>{renderWithLineBreaks(t('landing.faq_title'))}</h2>
          </motion.div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n, idx) => {
              const open = openFaq === idx;
              return (
                <motion.div key={n} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05 }}>
                  <div className="rounded-2xl overflow-hidden" style={{ background: lpMid.elevated.bg, border: `1px solid ${open ? LP_YELLOW : lpMid.elevated.border}`, boxShadow: '0 12px 32px rgba(19,41,75,0.08)' }}>
                    <button type="button" onClick={() => setOpenFaq(open ? null : idx)} className="w-full flex items-center justify-between gap-4 p-5 lg:p-6 text-left transition-colors" aria-expanded={open}>
                      <span className="text-sm font-bold lg:text-lg" style={{ color: lpMid.elevated.text }}>{t(`landing.faq_q${n}`)}</span>
                      <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                        <ChevronRight className="w-5 h-5" style={{ color: LP_YELLOW }} />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                          <p className="px-5 lg:px-6 pb-5 lg:pb-6 text-sm leading-relaxed lg:text-base" style={{ color: lpMid.elevated.textMuted }}>{renderWithLineBreaks(t(`landing.faq_a${n}`))}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        {/* cream → navy 自然な曲線ウェーブ */}
        <WaveDivider fill={lpPage.bg} position="bottom" />
      </section>

      {/* 主催者向けセクション（イベント主催者・自治体向けB2Bバンド） */}
      <section className="relative py-12 md:py-24 px-4 overflow-hidden" style={{ background: lpPage.bg }}>
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl p-8 sm:p-12 text-center overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255, 198, 45, 0.35)',
              boxShadow: '0 16px 44px rgba(7,16,34,0.35)',
            }}
          >
            {/* 装飾グロー */}
            <div
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
              style={{ backgroundColor: 'rgba(255, 198, 45, 0.12)', filter: 'blur(70px)' }}
              aria-hidden
            />
            <div className="relative z-10">
              <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4 lg:text-base" style={{ color: LP_YELLOW }}>
                {t('landing.organizer_section_label')}
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-5 leading-tight" style={{ color: lpPage.text }}>
                {renderWithLineBreaks(t('landing.organizer_section_title'))}
              </h2>
              <p className="text-base max-w-2xl mx-auto mb-8 leading-relaxed lg:text-lg" style={{ color: lpPage.textMuted }}>
                {renderWithLineBreaks(t('landing.organizer_section_body'))}
              </p>
              <Link href="/contact">
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} className="inline-block">
                  <Button size="lg" className="text-base px-8 py-6 rounded-full font-semibold lg:text-lg" style={{ background: LP_YELLOW, color: LP_NAVY, boxShadow: '0 8px 28px rgba(255, 198, 45, 0.35)' }}>
                    <Mail className="w-5 h-5 mr-2" />{t('landing.organizer_section_cta')}
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="relative py-12 md:py-24 px-4 overflow-hidden" style={{ background: lpPage.bg }}>
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4 lg:text-base" style={{ color: accentTextOnLightBg(lpPage.bg) }}>Contact</span>
            <h2 className="text-2xl sm:text-3xl md:text-6xl font-bold mb-4" style={{ color: lpPage.text }}>{t('landing.contact_title')}</h2>
            <p className="text-base mb-8 lg:text-xl" style={{ color: lpPage.textMuted }}>{renderWithLineBreaks(t('landing.contact_subtitle'))}</p>
            <Link href="/contact">
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} className="inline-block">
                <Button size="lg" className="text-base px-8 py-6 rounded-full font-semibold lg:text-xl" style={{ background: LP_YELLOW, color: LP_NAVY, boxShadow: '0 8px 28px rgba(255, 198, 45, 0.35)' }}>
                  <Mail className="w-5 h-5 mr-2" />{t('landing.contact_button')}
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
        {/* navy → cream 自然な曲線ウェーブ */}
        <WaveDivider fill={LP_CARD.bg} position="bottom" />
      </section>

      {/* Company Section */}
      <section className="relative py-12 md:py-24 px-4 overflow-hidden" style={{ background: LP_CARD.bg }}>
        <div className="container mx-auto max-w-3xl relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4 lg:text-base" style={{ color: LP_NAVY }}>Company</span>
            <h2 className="text-2xl sm:text-3xl md:text-6xl font-bold" style={{ color: LP_CARD.text }}>{t('landing.company_title')}</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl p-6 sm:p-8" style={{ background: '#FFFFFF', border: `1px solid ${LP_CARD.borderSubtle}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <div className="space-y-4">
              {[
                { label: t('landing.company_name_label'), value: t('landing.company_name_value') },
                { label: t('landing.company_address_label'), value: t('landing.company_address_value') },
                { label: t('landing.company_ceo_label'), value: t('landing.company_ceo_value') },
                { label: t('landing.company_business_label'), value: t('landing.company_business_value') },
              ].map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-3" style={{ borderBottom: `1px solid ${LP_CARD.borderSubtle}` }}>
                  <span className="text-xs font-bold uppercase tracking-wider flex-shrink-0 sm:w-32 lg:text-base" style={{ color: LP_NAVY }}>{item.label}</span>
                  <span className="text-sm lg:text-lg" style={{ color: LP_CARD.textMuted }}>{renderWithLineBreaks(item.value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <a href="https://www.nobody-inc.jp/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium transition-all hover:scale-105 lg:text-lg" style={{ color: LP_NAVY }}>
                {t('landing.company_website')} <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
        {/* cream → navy (Footer) 自然な曲線ウェーブ */}
        <WaveDivider fill={lpPage.bg} position="bottom" />
      </section>

      {/* Footer */}
      <footer className="py-12 px-4" style={{ background: lpPage.bg }}>
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center mb-8">
            <img src="https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1777628277/e075bc44-b508-4353-ad2e-b91e79e08186_fqrdzs.png" alt="NIKENME+" className="h-12 w-auto object-contain opacity-70" />
          </div>
          <nav className="grid grid-cols-2 gap-4 sm:gap-6 max-w-md mx-auto mb-8">
            {footerLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link key={index} href={link.href} className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 min-h-[56px] group" style={{ background: lpElevated.bg, border: `1px solid ${lpElevated.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <Icon className="w-5 h-5 transition-colors" style={{ color: LP_YELLOW }} />
                  <span className="text-base font-medium transition-colors lg:text-xl" style={{ color: lpElevated.text }}>{link.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="text-center">
            <p className="text-sm mb-2 lg:text-lg" style={{ color: lpPage.textSubtle }}>{t('landing.footer_copyright')}</p>
            <p className="text-lg font-bold lg:text-2xl" style={{ color: accentTextOnLightBg(lpPage.bg) }}>{t('common.slogan')}</p>
          </div>
        </div>
      </footer>

      {/* Location Permission Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(10, 22, 40, 0.95)' }} onClick={() => locationPermission !== 'loading' && setShowLocationModal(false)}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ backgroundColor: 'rgba(10, 22, 40, 0.5)' }} />
            <motion.div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none" style={{ backgroundColor: `${LP_YELLOW}15`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', filter: 'blur(60px)' }} animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />

              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.3 }} className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden" style={{ background: lpPage.bg, border: '1px solid rgba(255, 198, 45, 0.35)', boxShadow: `${colors.shadowDeep}, 0 0 60px rgba(255, 198, 45, 0.12)` }} onClick={(e) => e.stopPropagation()}>
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                <div className="h-1" style={{ backgroundColor: LP_YELLOW }} />
                <div className="p-8">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-3 lg:text-4xl" style={{ color: lpPage.text }}>{t('modal.location_title')}</h2>
                    <p className="text-base leading-relaxed lg:text-xl" style={{ color: lpPage.textMuted }}>{t('modal.location_desc')}</p>
                  </motion.div>
                  <GoldDivider />
                  {locationPermission === 'denied' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                      <div className="flex items-start gap-3 mb-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-destructive" />
                        <p className="text-sm font-semibold lg:text-lg text-destructive">{t('modal.location_denied_title')}</p>
                      </div>
                      <p className="text-xs leading-relaxed ml-8 whitespace-pre-line lg:text-base text-destructive/70">{t('modal.location_denied_desc')}</p>
                    </motion.div>
                  )}
                  <div className="space-y-3">
                    <motion.button whileHover={locationPermission !== 'loading' ? { scale: 1.02, y: -2 } : {}} whileTap={locationPermission !== 'loading' ? { scale: 0.98 } : {}} onClick={() => locationPermission !== 'loading' && handleLocationPermission(true)} className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all relative overflow-hidden group lg:text-2xl" style={{ background: LP_YELLOW, color: LP_NAVY, boxShadow: '0 8px 28px rgba(255, 198, 45, 0.35)', opacity: locationPermission === 'loading' ? 0.8 : 1 }}>
                      <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }} />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {locationPermission === 'loading' ? (
                          <><Loader2 className="w-5 h-5 animate-spin" />{t('landing.getting_location')}</>
                        ) : (
                          <><CheckCircle className="w-5 h-5" />{t('modal.location_allow')}</>
                        )}
                      </span>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setLocationPermission('prompt'); setShowLocationModal(false); }} className="w-full py-4 px-6 rounded-xl font-medium text-base transition-all lg:text-xl" style={{ background: LP_CARD.bg, border: `1px solid ${LP_CARD.borderSubtle}`, color: LP_CARD.textMuted, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} disabled={locationPermission === 'loading'}>{t('modal.location_deny')}</motion.button>
                  </div>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mt-6 text-xs lg:text-base" style={{ color: lpPage.textSubtle }}>{t('common.location_info_note')}</motion.p>
                </div>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* スポンサー広告（DB駆動） */}
      <SponsorProvider>
        <LandingSponsorAds />
      </SponsorProvider>

      {/* 店舗向けアクション（位置情報モーダルと同一のラグジュアリーUI） */}
      <AnimatePresence>
        {showStoreActionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(10, 22, 40, 0.95)' }}
            onClick={() => setShowStoreActionsModal(false)}
          >
            <div className="absolute inset-0 backdrop-blur-md" style={{ backgroundColor: 'rgba(10, 22, 40, 0.5)' }} />
            <motion.div
              className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
              style={{
                backgroundColor: `${LP_YELLOW}15`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                filter: 'blur(60px)',
              }}
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden"
              style={{
                background: lpPage.bg,
                border: '1px solid rgba(255, 198, 45, 0.35)',
                boxShadow: `${colors.shadowDeep}, 0 0 60px rgba(255, 198, 45, 0.12)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
              />
              <CloseCircleButton
                type="button"
                size="lg"
                onClick={() => setShowStoreActionsModal(false)}
                className="absolute top-3 right-3 z-20"
                aria-label={t('common.close')}
              />
              <div className="h-1" style={{ backgroundColor: LP_YELLOW }} />
              <div className="p-8 pt-10">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="text-center mb-6"
                >
                  <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: `${LP_YELLOW}18`, border: `1px solid rgba(255, 198, 45, 0.35)` }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Store className="h-7 w-7" style={{ color: accentTextOnLightBg(lpPage.bg) }} />
                    </motion.div>
                  </div>
                  <h2 className="text-2xl font-bold mb-3 lg:text-4xl" style={{ color: lpPage.text }}>
                    {t('menu.for_stores')}
                  </h2>
                  <p className="text-base leading-relaxed px-1 lg:text-xl" style={{ color: lpPage.textMuted }}>
                    {t('auth.login_join_us')}
                  </p>
                </motion.div>
                <GoldDivider />
                <div className="space-y-3 mt-6">
                  <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href="/partner/apply"
                      onClick={() => setShowStoreActionsModal(false)}
                      className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-4 px-6 text-lg font-semibold transition-all group lg:text-2xl"
                      style={{
                        background: LP_YELLOW,
                        color: LP_NAVY,
                        boxShadow: '0 8px 28px rgba(255, 198, 45, 0.35)',
                      }}
                    >
                      <motion.div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                      />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {t('landing.cta_button_recruitment')}
                      </span>
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href="/login"
                      onClick={() => setShowStoreActionsModal(false)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-4 px-6 text-base font-medium transition-all lg:text-xl"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255, 198, 45, 0.35)',
                        color: lpPage.textMuted,
                      }}
                    >
                      <LogIn className="h-5 w-5 shrink-0" style={{ color: accentTextOnLightBg(lpPage.bg) }} />
                      {t('header.store_login')}
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

/** SponsorProvider内で広告を表示するラッパー */
function LandingSponsorAds() {
  const { ads, setShouldShowModal } = useSponsor();

  useEffect(() => {
    if (!ads?.modal) return;
    const timer = setTimeout(() => {
      setShouldShowModal(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [ads?.modal, setShouldShowModal]);

  return (
    <>
      <SponsorCtaButton />
      <SponsorModal />
    </>
  );
}
