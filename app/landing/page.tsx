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
  ChevronLeft,
  Building2,
  AlertCircle,
  Sparkles,
  Gift,
  MessageCircle,
  Instagram,
  Mail,
  ExternalLink,
  Scale,
  Sun,
  Moon,
  Coffee,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage, SUPPORTED_LANGUAGES, LANGUAGE_META } from '@/lib/i18n/context';
import type { Language } from '@/lib/i18n/translations';
import { supabase } from '@/lib/supabase/client';
import { locationCache } from '@/lib/cache';
import { useAppMode } from '@/lib/app-mode-context';
import { newsTranslations } from '@/lib/news-data';

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

interface CampaignStore {
  id: string;
  name: string;
  has_campaign: boolean;
  campaign_name: string | null;
  campaign_start_date: string | null;
  campaign_end_date: string | null;
  image_urls: string[] | null;
}

// キャンペーンマスタの型定義（campaignsテーブル）
interface CampaignMaster {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  image_url: string | null; // キャンペーン画像
}

const DEFAULT_LOCATION = {
  lat: 33.2382,
  lng: 131.6126,
  timestamp: Date.now(),
  isDefault: true,
};

const ACCENT_GOLD = '#C9A86C';
const GoldDivider = () => (
  <div className="flex items-center justify-center gap-3 my-6">
    <div className="h-px flex-1 max-w-16" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT_GOLD}40)` }} />
    <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: ACCENT_GOLD }} />
    <div className="h-px flex-1 max-w-16" style={{ background: `linear-gradient(90deg, ${ACCENT_GOLD}40, transparent)` }} />
  </div>
);

export default function LandingPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { colorsA: colors, mode, isBar, isCafe, toggleMode } = useAppMode();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'loading'>('prompt');
  const [showToast, setShowToast] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [partnerStores, setPartnerStores] = useState<PartnerStore[]>([]);
  const [campaignStores, setCampaignStores] = useState<CampaignStore[]>([]);
  const [campaignMasters, setCampaignMasters] = useState<CampaignMaster[]>([]);
  const [campaignSlide, setCampaignSlide] = useState(0);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [howtoSlide, setHowtoSlide] = useState(0);
  const [areaGuideSlide, setAreaGuideSlide] = useState(0);
  const [concernsSlide, setConcernsSlide] = useState(0);
  const locationAttemptRef = useRef(false);

  const renderWithLineBreaks = (text: string) => {
    return text.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const nightHeroImages = [
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501861/edgar-chaparro-Lwx-q6OdGAc-unsplash_x8q8jq.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501860/drew-beamer-bTN-zKFy9uA-unsplash_kmcnyo.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501854/kris-sevinc-NVX55qVyEkE-unsplash_pjwsez.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501854/nichika-sakurai-gUa30D-mL_M-unsplash_h9pskd.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501853/q-u-i-n-g-u-y-e-n-Zrp9b3PMIy8-unsplash_xjz1dm.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501853/masahiro-miyagi-RLDNGblOqHU-unsplash_zadhp8.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501852/sergio-alves-santos-OxKFC5u0980-unsplash_z1u5mj.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772522900/ash-edmonds-fsI-_MRsic0-unsplash_fgf0lv.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501853/patrick-tomasso-GXXYkSwndP4-unsplash_w4c9df.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772501852/jakub-dziubak-gj7BLlSzIFs-unsplash_virstu.jpg',
  ];
  const dayHeroImages = [
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1773409116/nathan-dumlao-2z3MOB3kfJU-unsplash_vnotg8.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1773409115/toa-heftiba-QnUywvDdI1o-unsplash_c5dsy7.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1773409115/shen-liu-2PUwRmJOdNo-unsplash_u3trvd.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1773409144/rodeo-project-management-software-PYqzYhTNjho-unsplash_oj05gw.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1773409116/petr-sevcovic-qE1jxYXiwOA-unsplash_amza7y.jpg',
    'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1773409142/copernico--8DAN9_oi8g-unsplash_pzzdj2.jpg',
  ];
  const heroImages = isCafe ? dayHeroImages : nightHeroImages;

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

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
          // @ts-ignore – store_category は Phase 2 で型定義済み、DBマイグレーション後に有効
          .or(`store_category.eq.${mode},store_category.eq.both`)
          .limit(10);
        if (error) return;
        if (data) { setPartnerStores((data as PartnerStore[]).filter((store) => store.image_urls && store.image_urls.length > 0)); }
      } catch (error) { console.error('Error fetching partner stores:', error); }
    };
    fetchPartnerStores();
  }, [mode]);

  // キャンペーンマスタとキャンペーン実施中の店舗を取得
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        // 今日の日付（YYYY-MM-DD形式）
        const today = new Date().toISOString().split('T')[0];
        
        // 1. キャンペーンマスタから有効なキャンペーンを取得
        // start_dateとend_dateはYYYY-MM-DD形式なので、同じ形式で比較
        const { data: campaigns, error: campaignError } = await supabase
          .from('campaigns')
          .select('id, name, description, start_date, end_date, is_active, image_url')
          .eq('is_active', true)
          .lte('start_date', today)
          .gte('end_date', today)
          .order('end_date', { ascending: true })
          .limit(5);
        
        if (campaignError) {
          console.error('Error fetching campaigns:', campaignError);
        } else {
          console.log('Fetched campaigns:', campaigns);
        }
        
        // 2. キャンペーン参加店舗を取得（既存のロジック）
        const now = new Date().toISOString();
        const { data: stores, error: storeError } = await supabase
          .from('stores')
          .select('id, name, has_campaign, campaign_name, campaign_start_date, campaign_end_date, image_urls')
          .eq('has_campaign', true)
          .or(`campaign_end_date.is.null,campaign_end_date.gte.${now}`)
          // @ts-ignore – store_category は Phase 2 で型定義済み、DBマイグレーション後に有効
          .or(`store_category.eq.${mode},store_category.eq.both`)
          .limit(10);
        
        if (storeError) {
          console.error('Error fetching campaign stores:', storeError);
        }
        
        if (stores) {
          setCampaignStores(stores as CampaignStore[]);
        }
        
        // キャンペーンマスタを設定
        if (campaigns && campaigns.length > 0) {
          setCampaignMasters(campaigns as CampaignMaster[]);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };
    fetchCampaigns();
  }, []);

  useEffect(() => {
    const checkVacantStores = async () => {
      try {
        const { data, error } = await supabase.from('stores').select('id, vacancy_status').eq('vacancy_status', 'vacant')
          // @ts-ignore – store_category フィルタ
          .or(`store_category.eq.${mode},store_category.eq.both`).limit(1);
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
    const timer = setTimeout(() => {
      setConcernsSlide((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearTimeout(timer);
  }, [concernsSlide]);



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
        setLocationPermission(location.isDefault ? 'denied' : 'granted');
        setTimeout(() => { setShowLocationModal(false); router.push('/map?from=landing'); }, 300);
      } catch {
        localStorage.setItem('userLocation', JSON.stringify({ ...DEFAULT_LOCATION, timestamp: Date.now() }));
        setLocationPermission('denied');
        setTimeout(() => { setShowLocationModal(false); router.push('/map?from=landing'); }, 300);
      }
    } else {
      localStorage.setItem('userLocation', JSON.stringify({ ...DEFAULT_LOCATION, timestamp: Date.now() }));
      setLocationPermission('denied');
      setShowLocationModal(false);
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
    <div className="min-h-screen overflow-x-hidden" style={{ background: colors.background }}>
      {/* 背景装飾エフェクト */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div className="absolute w-[700px] h-[700px] rounded-full" style={{ background: `radial-gradient(circle, ${colors.accent}10 0%, transparent 60%)`, top: '-250px', right: '-250px', filter: 'blur(80px)' }} animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[500px] h-[500px] rounded-full" style={{ background: `radial-gradient(circle, ${colors.surfaceLight}20 0%, transparent 60%)`, bottom: '10%', left: '-150px', filter: 'blur(60px)' }} animate={{ opacity: [0.2, 0.35, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className="fixed top-20 left-1/2 z-50">
            <div className="flex items-center gap-3 px-5 py-3 rounded-full" style={{ background: colors.surface, backdropFilter: 'blur(20px)', border: `1px solid ${colors.borderGold}`, boxShadow: colors.shadowGold }}>
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-2.5 h-2.5 rounded-full" style={{ background: '#4ADE80', boxShadow: '0 0 10px #4ADE80' }} />
              <span className="text-sm font-medium" style={{ color: colors.text }}>{t('landing.seats_available')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 safe-top" style={{ background: colors.luxuryGradient, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${colors.borderGold}` }}>
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            {isCafe
              ? <Coffee className="h-8 w-8" style={{ color: colors.accent }} />
              : <img src="https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" alt="NIKENME+" className="h-8 w-auto object-contain" />}
            <span className="hidden sm:inline-block text-[9px] px-2 py-1 rounded-full font-medium tracking-[0.1em] uppercase" style={{ background: `${colors.accent}15`, border: `1px solid ${colors.borderGold}`, color: colors.accent }}>{isCafe ? t('common.day_spot') : t('landing.night_spot')}</span>
          </motion.div>
          <div className="flex items-center gap-2 sm:gap-4">

            <Link href="/partner/apply"><Button variant="outline" size="sm" className="text-xs font-medium transition-all duration-300 hover:scale-105" style={{ borderColor: colors.borderGold, color: colors.accent, background: `${colors.accent}08` }}>{t('landing.cta_button_recruitment')}</Button></Link>
            <Link href="/login"><Button variant="outline" size="sm" className="text-xs font-medium transition-all duration-300 hover:scale-105" style={{ borderColor: colors.borderGold, color: colors.accent, background: `${colors.accent}08` }}>{t('header.store_login')}</Button></Link>
            <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)} style={{ color: colors.textMuted }}>{showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</Button>
          </div>
        </div>
      </header>

      {/* Side Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" style={{ background: 'rgba(10, 22, 40, 0.9)' }} onClick={() => setShowMenu(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 bottom-0 w-80 z-50 overflow-y-auto" style={{ background: colors.luxuryGradient, borderLeft: `1px solid ${colors.borderGold}` }}>
              <div className="p-6 pt-20">
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-1" style={{ color: colors.text }}>{t('menu.title')}</h2>
                  <p className="text-sm" style={{ color: colors.textSubtle }}>{t('menu.subtitle')}</p>
                </div>
                <nav className="space-y-1">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                        <Link href={item.href} onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-4 rounded-lg transition-colors group" style={{ color: colors.textMuted }}>
                          <Icon className="w-5 h-5" style={{ color: colors.accent }} /><span className="group-hover:opacity-100 font-medium">{item.label}</span><ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>
                {/* Official Account */}
                <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${colors.borderGold}` }}>
                  <p className="text-sm font-medium mb-3" style={{ color: colors.textMuted }}>{t('menu.official_account')}</p>
                  <a href="https://www.instagram.com/nikenme_plus/" target="_blank" rel="noopener noreferrer" onClick={() => setShowMenu(false)} className="flex items-center gap-3 p-4 rounded-lg transition-colors group" style={{ color: colors.textMuted }}>
                    <Instagram className="w-5 h-5" style={{ color: colors.accent }} /><span className="group-hover:opacity-100 font-medium">Instagram</span><ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                  </a>
                </div>
                <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${colors.borderGold}` }}>
                  <p className="text-xs text-center" style={{ color: colors.textSubtle }}>© 2025 NIKENME+<br />{t('menu.version')}</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative h-[100svh] lg:h-[75vh] flex flex-col px-4 overflow-hidden">
        <motion.div className="absolute inset-0 z-0" style={{ opacity: heroOpacity, scale: heroScale }}>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={heroImageIndex}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${heroImages[heroImageIndex]}')` }}
              />
            </motion.div>
          </AnimatePresence>
          <div
            className="absolute inset-0"
            style={{
              background: isCafe
                ? 'linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(0,0,0,0.2) 100%)'
                : `linear-gradient(to bottom, ${colors.background}90 0%, ${colors.background}60 40%, ${colors.background}CC 100%)`,
            }}
          />
        </motion.div>

        <div className="flex-1" />

        <motion.div
          className="relative z-10 text-center pb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
            <span style={{ color: isCafe ? '#FFFFFF' : colors.text, textShadow: isCafe ? '0 2px 8px rgba(0,0,0,0.5)' : 'none' }}>
              {isCafe
                ? renderWithLineBreaks(t('landing.cafe_hero_catchphrase'))
                : renderWithLineBreaks(t('landing.hero_catchphrase'))}
            </span>
          </h1>
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-full relative overflow-hidden group inline-block mb-6"
            style={{ boxShadow: colors.shadowGold }}
          >
            <Button
              size="lg"
              onClick={handleMapClick}
              className="text-lg px-10 py-6 rounded-full font-semibold transition-all relative z-10"
              style={{ background: isCafe ? 'linear-gradient(135deg, #5C3D2E 0%, #7A5C3C 50%, #4A2E1F 100%)' : colors.goldGradient, color: isCafe ? '#F7F3EE' : colors.background }}
            >
              <Store className="w-5 h-5 mr-2" />{t('landing.cta_button_primary')}
            </Button>
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
            />
          </motion.div>
          <p className="text-xs sm:text-sm tracking-wider mb-3" style={{ color: isCafe ? 'rgba(255,255,255,0.85)' : colors.textMuted, textShadow: isCafe ? '0 1px 4px rgba(0,0,0,0.4)' : 'none' }}>
            {isCafe
              ? t('landing.cafe_hero_subcopy')
              : t('landing.hero_subcopy')}
          </p>
          <span className="text-[10px] font-medium tracking-[0.3em] uppercase block mb-2" style={{ color: colors.textSubtle }}>
            SCROLL
          </span>
          <motion.div
            className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5 mx-auto"
            style={{ border: `1.5px solid ${colors.textSubtle}` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div
              className="w-1 h-1.5 rounded-full"
              style={{ background: colors.textMuted }}
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </motion.div>

        <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}60, transparent)` }} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: 'easeOut' }} />
      </section>

      {/* お知らせセクション */}
      <section className="relative py-16 px-4 overflow-hidden" style={{ background: colors.background }}>
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-3" style={{ color: colors.accent }}>News</span>
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: colors.text }}>{t('landing.news_title')}</h2>
          </motion.div>
          <div className="space-y-3">
            {(newsTranslations[language] || newsTranslations.ja).slice(0, 3).map((item, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: `${colors.surface}60`, border: `1px solid ${colors.borderSubtle}` }}>
                <span className="text-xs font-medium flex-shrink-0 pt-0.5" style={{ color: colors.accent }}>{item.date}</span>
                <div>
                  <p className="text-sm font-bold mb-0.5" style={{ color: colors.text }}>{item.title}</p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>{item.body}</p>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium transition-all hover:opacity-80" style={{ color: colors.accent }}>
                      <ExternalLink className="w-3 h-3" />
                      {item.linkLabel || item.link}
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-6">
            <Link href="/news" className="text-sm font-medium inline-flex items-center gap-1 transition-all hover:scale-105" style={{ color: colors.accent }}>
              {t('landing.news_view_all')} <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)` }} />
      </section>

      {/* キャンペーンセクション（campaignsテーブルからの動的データ） */}
      {(campaignMasters.length > 0 || campaignStores.length > 0) && (
        <section className="relative py-16 px-4 overflow-hidden" style={{ background: colors.surface }}>
          <div className="container mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <GoldDivider />
              <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-3" style={{ color: colors.accent }}>
                Special Campaign
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: colors.text }}>
                {t('campaign.section_title')}
              </h2>
              <p className="text-base" style={{ color: colors.textMuted }}>
                {t('campaign.dont_miss')}
              </p>
            </motion.div>

            {/* キャンペーンマスタからの表示（優先） */}
            {campaignMasters.length > 0 ? (
              campaignMasters.length === 1 ? (
                // 1件のみの場合はカード表示
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-md mx-auto"
                >
                  <Card
                    className="relative overflow-hidden cursor-pointer group"
                    style={{
                      background: `${colors.background}90`,
                      border: `2px solid ${colors.accent}`,
                      boxShadow: colors.shadowGold,
                    }}
                    onClick={() => {
                      router.push(`/store-list?campaign=true&campaign_name=${encodeURIComponent(campaignMasters[0].name)}`);
                    }}
                  >
                    {campaignMasters[0].image_url && (
                      <div className="absolute inset-0">
                        <img
                          src={campaignMasters[0].image_url}
                          alt=""
                          className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-300"
                        />
                        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.background} 0%, transparent 100%)` }} />
                      </div>
                    )}
                    <div className="relative z-10 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-2 h-2 rounded-full"
                          style={{ background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4ADE80' }}>
                          {t('campaign.now_on')}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:translate-x-1 transition-transform" style={{ color: colors.text }}>
                        {campaignMasters[0].name} 🍺
                      </h3>
                      {campaignMasters[0].description && (
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: colors.textMuted }}>
                          {campaignMasters[0].description}
                        </p>
                      )}
                      <p className="text-xs mb-4" style={{ color: colors.accent }}>
                        {t('campaign.until').replace('{date}', new Date(campaignMasters[0].end_date + 'T00:00:00').toLocaleDateString(language === 'ja' ? 'ja-JP' : language === 'ko' ? 'ko-KR' : language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' }))}
                      </p>
                      <div className="flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: colors.accent }}>
                        <span className="text-sm font-medium">{t('campaign.view_details')}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                // 複数キャンペーンの場合はカルーセル表示
                <div className="relative">
                  <div className="overflow-hidden rounded-2xl" style={{ touchAction: 'pan-x pan-y' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={campaignSlide}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.4 }}
                        className="w-full"
                      >
                        <Card
                          className="relative overflow-hidden cursor-pointer group mx-auto max-w-lg"
                          style={{
                            background: `${colors.background}90`,
                            border: `2px solid ${colors.accent}`,
                            boxShadow: colors.shadowGold,
                          }}
                          onClick={() => {
                            router.push(`/store-list?campaign=true&campaign_name=${encodeURIComponent(campaignMasters[campaignSlide].name)}`);
                          }}
                        >
                          {campaignMasters[campaignSlide].image_url && (
                            <div className="absolute inset-0">
                              <img
                                src={campaignMasters[campaignSlide].image_url}
                                alt=""
                                className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-300"
                              />
                              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.background} 0%, transparent 100%)` }} />
                            </div>
                          )}
                          <div className="relative z-10 p-6">
                            <div className="flex items-center gap-2 mb-3">
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-2 h-2 rounded-full"
                                style={{ background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }}
                              />
                              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4ADE80' }}>
                                {t('campaign.now_on')}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold mb-2 group-hover:translate-x-1 transition-transform" style={{ color: colors.text }}>
                              {campaignMasters[campaignSlide].name} 🍺
                            </h3>
                            {campaignMasters[campaignSlide].description && (
                              <p className="text-sm mb-3 line-clamp-2" style={{ color: colors.textMuted }}>
                                {campaignMasters[campaignSlide].description}
                              </p>
                            )}
                            <p className="text-xs mb-4" style={{ color: colors.accent }}>
                              {t('campaign.until').replace('{date}', new Date(campaignMasters[campaignSlide].end_date + 'T00:00:00').toLocaleDateString(language === 'ja' ? 'ja-JP' : language === 'ko' ? 'ko-KR' : language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' }))}
                            </p>
                            <div className="flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: colors.accent }}>
                              <span className="text-sm font-medium">{t('campaign.view_details')}</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* カルーセルナビゲーション */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setCampaignSlide((prev) => (prev - 1 + campaignMasters.length) % campaignMasters.length); }}
                    className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }}
                    aria-label="Previous campaign"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.text }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCampaignSlide((prev) => (prev + 1) % campaignMasters.length); }}
                    className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }}
                    aria-label="Next campaign"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.text }} />
                  </button>

                  {/* ドットインジケーター */}
                  <div className="flex justify-center gap-2 mt-6">
                    {campaignMasters.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCampaignSlide(index)}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: campaignSlide === index ? '24px' : '8px',
                          background: campaignSlide === index ? colors.accent : `${colors.text}30`,
                          boxShadow: campaignSlide === index ? `0 0 10px ${colors.accent}60` : 'none',
                        }}
                        aria-label={`Go to campaign ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )
            ) : (
              // キャンペーンマスタがない場合は店舗ベースの表示（フォールバック）
              campaignStores.length === 1 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-md mx-auto"
                >
                  <Card
                    className="relative overflow-hidden cursor-pointer group"
                    style={{
                      background: `${colors.background}90`,
                      border: `2px solid ${colors.accent}`,
                      boxShadow: colors.shadowGold,
                    }}
                    onClick={() => {
                      const campaignName = campaignStores[0].campaign_name;
                      const url = campaignName 
                        ? `/store-list?campaign=true&campaign_name=${encodeURIComponent(campaignName)}`
                        : '/store-list?campaign=true';
                      router.push(url);
                    }}
                  >
                    {campaignStores[0].image_urls && campaignStores[0].image_urls.length > 0 && (
                      <div className="absolute inset-0">
                        <img
                          src={campaignStores[0].image_urls[0]}
                          alt=""
                          className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-300"
                        />
                        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.background} 0%, transparent 100%)` }} />
                      </div>
                    )}
                    <div className="relative z-10 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-2 h-2 rounded-full"
                          style={{ background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4ADE80' }}>
                          {t('campaign.now_on')}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:translate-x-1 transition-transform" style={{ color: colors.text }}>
                        {campaignStores[0].campaign_name || t('campaign.default_name')} 🍺
                      </h3>
                      <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
                        {campaignStores[0].name}
                      </p>
                      {campaignStores[0].campaign_end_date && (
                        <p className="text-xs mb-4" style={{ color: colors.accent }}>
                          {t('campaign.until').replace('{date}', new Date(campaignStores[0].campaign_end_date).toLocaleDateString(language === 'ja' ? 'ja-JP' : language === 'ko' ? 'ko-KR' : language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' }))}
                        </p>
                      )}
                      <div className="flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: colors.accent }}>
                        <span className="text-sm font-medium">{t('campaign.view_details')}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                // 複数の店舗キャンペーン
                <div className="relative">
                  <div className="overflow-hidden rounded-2xl" style={{ touchAction: 'pan-x pan-y' }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.4 }}
                        className="w-full"
                      >
                        <Card
                          className="relative overflow-hidden cursor-pointer group mx-auto max-w-lg"
                          style={{
                            background: `${colors.background}90`,
                            border: `2px solid ${colors.accent}`,
                            boxShadow: colors.shadowGold,
                          }}
                          onClick={() => {
                            const campaignName = campaignStores[currentSlide].campaign_name;
                            const url = campaignName 
                              ? `/store-list?campaign=true&campaign_name=${encodeURIComponent(campaignName)}`
                              : '/store-list?campaign=true';
                            router.push(url);
                          }}
                        >
                          {campaignStores[currentSlide].image_urls && campaignStores[currentSlide].image_urls.length > 0 && (
                            <div className="absolute inset-0">
                              <img
                                src={campaignStores[currentSlide].image_urls[0]}
                                alt=""
                                className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-300"
                              />
                              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.background} 0%, transparent 100%)` }} />
                            </div>
                          )}
                          <div className="relative z-10 p-6">
                            <div className="flex items-center gap-2 mb-3">
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-2 h-2 rounded-full"
                                style={{ background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }}
                              />
                              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4ADE80' }}>
                                {t('campaign.now_on')}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold mb-2 group-hover:translate-x-1 transition-transform" style={{ color: colors.text }}>
                              {campaignStores[currentSlide].campaign_name || t('campaign.default_name')} 🍺
                            </h3>
                            <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
                              {campaignStores[currentSlide].name}
                            </p>
                            {campaignStores[currentSlide].campaign_end_date && (
                              <p className="text-xs mb-4" style={{ color: colors.accent }}>
                                {t('campaign.until').replace('{date}', new Date(campaignStores[currentSlide].campaign_end_date).toLocaleDateString(language === 'ja' ? 'ja-JP' : language === 'ko' ? 'ko-KR' : language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' }))}
                              </p>
                            )}
                            <div className="flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: colors.accent }}>
                              <span className="text-sm font-medium">{t('campaign.view_details')}</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* カルーセルナビゲーション */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev - 1 + campaignStores.length) % campaignStores.length); }}
                    className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }}
                    aria-label="Previous campaign"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.text }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentSlide((prev) => (prev + 1) % campaignStores.length); }}
                    className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }}
                    aria-label="Next campaign"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.text }} />
                  </button>

                  {/* ドットインジケーター */}
                  <div className="flex justify-center gap-2 mt-6">
                    {campaignStores.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: currentSlide === index ? '24px' : '8px',
                          background: currentSlide === index ? colors.accent : `${colors.text}30`,
                          boxShadow: currentSlide === index ? `0 0 10px ${colors.accent}60` : 'none',
                        }}
                        aria-label={`Go to campaign ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )
            )}

            {/* すべてのキャンペーン店舗を見るボタン */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-8"
            >
              <Button
                onClick={() => router.push('/store-list?campaign=true')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all hover:scale-105"
                style={{
                  background: `${colors.accent}15`,
                  border: `1px solid ${colors.borderGold}`,
                  color: colors.accent,
                }}
              >
                <Sparkles className="w-5 h-5" />
                {t('campaign.view_campaign_stores')}
              </Button>
            </motion.div>
          </div>
          <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)` }} />
        </section>
      )}

      {/* 課題提起セクション */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.surface }}>
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>{t('landing.problems_subtitle')}</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: colors.text }}>{t('landing.problems_title')}</h2>
          </motion.div>
          {(() => {
            const concernsData = [
              {
                image: 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772516026/Gemini_Generated_Image_tlb0sbtlb0sbtlb0_eyduk4_c_pad_b_gen_fill_w_1024_h_1024_urgdep.png',
                text: t('landing.problems_item1'),
              },
              {
                image: 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772516050/Gemini_Generated_Image_875iko875iko875i_k2i2bc_c_pad_b_gen_fill_w_1024_h_1024_zndtxt.png',
                text: t('landing.problems_item2'),
              },
              {
                image: 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772516019/Gemini_Generated_Image_tr2wh5tr2wh5tr2w_c3tjmr_c_pad_b_gen_fill_w_1024_h_1024_bolppa.png',
                text: t('landing.problems_item3'),
              },
            ];
            const renderConcernCard = (index: number) => {
              const concern = concernsData[index];
              return (
                <Card
                  className="h-full overflow-hidden relative"
                  style={{
                    background: `${colors.background}80`,
                    border: `1px solid ${colors.borderGold}`,
                  }}
                >
                  <div className="aspect-square w-full overflow-hidden">
                    <img
                      src={concern.image}
                      alt={concern.text.replace('\n', ' ')}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 sm:p-6 text-center">
                    <p className="text-base sm:text-lg font-bold leading-relaxed" style={{ color: colors.text }}>
                      {renderWithLineBreaks(concern.text)}
                    </p>
                  </div>
                </Card>
              );
            };
            return (
              <>
                {/* モバイル: スライド */}
                <div className="block lg:hidden relative">
                  <div className="overflow-hidden rounded-2xl">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={concernsSlide}
                        initial={{ opacity: 0, x: 80 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -80 }}
                        transition={{ duration: 0.35 }}
                      >
                        {renderConcernCard(concernsSlide)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={() => setConcernsSlide((prev) => (prev - 1 + concernsData.length) % concernsData.length)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }}
                  >
                    <ChevronLeft className="w-5 h-5" style={{ color: colors.text }} />
                  </button>
                  <button
                    onClick={() => setConcernsSlide((prev) => (prev + 1) % concernsData.length)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }}
                  >
                    <ChevronRight className="w-5 h-5" style={{ color: colors.text }} />
                  </button>
                  <div className="flex justify-center gap-2 mt-6">
                    {concernsData.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setConcernsSlide(index)}
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: concernsSlide === index ? '24px' : '8px',
                          background: concernsSlide === index ? colors.accent : `${colors.text}30`,
                          boxShadow: concernsSlide === index ? `0 0 10px ${colors.accent}60` : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* PC: 3列横並び */}
                <div className="hidden lg:grid lg:grid-cols-3 gap-6">
                  {concernsData.map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15 }}
                    >
                      {renderConcernCard(index)}
                    </motion.div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)` }} />
      </section>

      {/* 解決策・サービスの強みセクション */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.background }}>
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>{t('landing.solution_subtitle')}</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>{t('landing.solution_title')}</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: colors.textMuted }}>{renderWithLineBreaks(t('landing.solution_body'))}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: 1, Icon: Sparkles },
              { num: 2, Icon: Radio },
              { num: 3, Icon: Shield },
            ].map(({ num, Icon }, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.15 }}>
                  <Card className="h-full p-8 group cursor-pointer transition-all duration-500 hover:translate-y-[-4px] relative overflow-hidden text-center" style={{ background: `${colors.surface}80`, backdropFilter: 'blur(10px)', border: `1px solid ${colors.borderGold}` }}>
                    <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, ${colors.accent}10 0%, transparent 70%)` }} />
                    <div className="relative z-10 flex flex-col items-center">
                      <motion.div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 mx-auto" style={{ background: `${colors.accent}15`, border: `1px solid ${colors.borderGold}` }} whileHover={{ scale: 1.05 }}>
                        <Icon className="w-7 h-7" style={{ color: colors.accent }} />
                      </motion.div>
                      <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>{t(`landing.solution_feature${num}_title`)}</h3>
                      <p className="text-xs uppercase tracking-wider mb-4 font-medium" style={{ color: colors.accentDark }}>{t(`landing.solution_feature${num}_title_en`)}</p>
                      <p style={{ color: colors.textMuted }} className="leading-relaxed text-sm">{renderWithLineBreaks(t(`landing.solution_feature${num}_desc`))}</p>
                    </div>
                    <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: colors.goldGradient }} initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
                  </Card>
                </motion.div>
              ))}
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.surface }}>
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>{t('landing.howto_subtitle')}</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: colors.text }}>{t('landing.howto_title')}</h2>
          </motion.div>
          {(() => {
            const howtoSteps = [
              { step: '01', num: 1, highlight: false },
              { step: '02', num: 2, highlight: false },
              { step: '03', num: 3, highlight: true, badge: 'common.auto_voice' as const },
              { step: '04', num: 4, highlight: true, badge: 'bonus' as const },
            ];
            const stepIcons = [MapPin, Store, Phone, Gift];
            const images = [
              'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772413015/Gemini_Generated_Image_kklaofkklaofkkla_faupob_c_pad_b_gen_fill_w_1024_h_1024_puu1hp.png',
              'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772413014/Gemini_Generated_Image_4et50r4et50r4et5_zo8vh4_c_pad_b_gen_fill_w_1024_h_1024_entmxs.png',
              'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772413152/Gemini_Generated_Image_3qcvnq3qcvnq3qcv_acv91j_c_pad_w_1024_h_1024_sr05n9.png',
              'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772412891/Gemini_Generated_Image_4o9bjm4o9bjm4o9b_j6hwmu_c_pad_b_gen_fill_w_1024_h_1024_gmu92v.png',
            ];
            const renderStepCard = (index: number) => {
              const { step, num, highlight, badge } = howtoSteps[index];
              const Icon = stepIcons[index];
              const stepTitle = t(`landing.howto_step${num}_title`);
              const isStep4 = num === 4;
              return (
                <Card className="h-full overflow-hidden group relative" style={{ background: highlight ? `${colors.accent}10` : colors.background, border: highlight ? `2px solid ${colors.accent}` : `1px solid ${colors.borderGold}`, boxShadow: highlight ? colors.shadowGold : 'none' }}>
                  {isStep4 && (<motion.div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${colors.accent}20 0%, transparent 50%)` }} animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />)}
                  <div className="p-6 sm:p-8 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl font-bold" style={{ color: highlight ? colors.accent : colors.accentDark }}>{step}</span>
                        <motion.div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${colors.accent}15`, border: `1px solid ${colors.borderGold}` }} animate={isStep4 ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                          <Icon className="w-5 h-5" style={{ color: highlight ? colors.accent : colors.textMuted }} />
                        </motion.div>
                      </div>
                      {badge === 'common.auto_voice' && (<span className="text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider" style={{ background: `${colors.accent}20`, color: colors.accent, border: `1px solid ${colors.accent}40` }}>{t('common.auto_voice')}</span>)}
                      {badge === 'bonus' && (<motion.span className="text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)', color: '#fff', boxShadow: '0 0 12px rgba(74, 222, 128, 0.4)' }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}><Sparkles className="w-3 h-3" />Bonus</motion.span>)}
                    </div>
                    <h3 className="text-xl font-bold mb-1" style={{ color: colors.text }}>{stepTitle}</h3>
                    <p className="text-xs uppercase tracking-wider mb-4 font-medium" style={{ color: colors.accentDark }}>{t(`landing.howto_step${num}_title_en`)}</p>
                    <p className="mb-6 leading-relaxed text-sm" style={{ color: colors.textMuted }}>{renderWithLineBreaks(t(`landing.howto_step${num}_desc`))}</p>
                    <div className="rounded-xl overflow-hidden relative" style={{ border: `1px solid ${colors.borderGold}` }}>
                      <img src={images[index]} alt={stepTitle} className="w-full h-auto object-cover" />
                      {isStep4 && (<motion.div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(45deg, transparent 0%, rgba(201, 168, 108, 0.15) 50%, transparent 100%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }} />)}
                    </div>
                  </div>
                  <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: colors.goldGradient }} initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
                </Card>
              );
            };
            return (
              <>
                {/* モバイル: スライド */}
                <div className="block lg:hidden relative">
                  <div className="overflow-hidden rounded-2xl">
                    <AnimatePresence mode="wait">
                      <motion.div key={howtoSlide} initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -80 }} transition={{ duration: 0.35 }}>
                        {renderStepCard(howtoSlide)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={() => setHowtoSlide((prev) => (prev - 1 + howtoSteps.length) % howtoSteps.length)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }}
                  >
                    <ChevronLeft className="w-5 h-5" style={{ color: colors.text }} />
                  </button>
                  <button
                    onClick={() => setHowtoSlide((prev) => (prev + 1) % howtoSteps.length)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }}
                  >
                    <ChevronRight className="w-5 h-5" style={{ color: colors.text }} />
                  </button>
                  <div className="flex justify-center gap-2 mt-6">
                    {howtoSteps.map((_, index) => (
                      <button key={index} onClick={() => setHowtoSlide(index)} className="h-2 rounded-full transition-all duration-300" style={{ width: howtoSlide === index ? '24px' : '8px', background: howtoSlide === index ? colors.accent : `${colors.text}30`, boxShadow: howtoSlide === index ? `0 0 10px ${colors.accent}60` : 'none' }} />
                    ))}
                  </div>
                </div>
                {/* PC: グリッド */}
                <div className="hidden lg:grid lg:grid-cols-2 gap-8">
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

      {/* SEO エリアガイドセクション（カフェ版では非表示 - 後日カフェ版を作成予定） */}
      {isBar && <section className="relative py-20 px-4 overflow-hidden" style={{ background: colors.background }}>
        <div className="container mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>{t('landing.area_guide_label')}</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: colors.text }}>{renderWithLineBreaks(t('landing.area_guide_title'))}</h2>
            <p className="text-base max-w-2xl mx-auto" style={{ color: colors.textMuted }}>{renderWithLineBreaks(t('landing.area_guide_subtitle'))}</p>
          </motion.div>

          {(() => {
            const areaGuides = [
              {
                image: 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772414070/Gemini_Generated_Image_8eyd8x8eyd8x8eyd_fy2omk_c_pad_b_gen_fill_w_1024_h_1024_x3jvuh.png',
                title: t('landing.area_guide_miyako_title'),
                desc1: t('landing.area_guide_miyako_desc1'),
                desc2: t('landing.area_guide_miyako_desc2'),
              },
              {
                image: 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1772414069/Gemini_Generated_Image_f6wtfvf6wtfvf6wt_aovpzh_c_pad_b_gen_fill_w_1024_h_1024_dmxlqs.png',
                title: t('landing.area_guide_chuo_title'),
                desc1: t('landing.area_guide_chuo_desc1'),
                desc2: t('landing.area_guide_chuo_desc2'),
              },
            ];
            const renderAreaCard = (index: number) => {
              const guide = areaGuides[index];
              return (
                <article className="rounded-2xl overflow-hidden" style={{ background: `${colors.surface}60`, border: `1px solid ${colors.borderSubtle}` }}>
                  <div className="aspect-[16/9] w-full overflow-hidden">
                    <img src={guide.image} alt={guide.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-3" style={{ color: colors.text }}>{guide.title}</h3>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: colors.textMuted }}>{guide.desc1}</p>
                    <p className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>{guide.desc2}</p>
                  </div>
                </article>
              );
            };
            return (
              <>
                {/* モバイル: スライド */}
                <div className="block lg:hidden relative">
                  <div className="overflow-hidden rounded-2xl">
                    <AnimatePresence mode="wait">
                      <motion.div key={areaGuideSlide} initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -80 }} transition={{ duration: 0.35 }}>
                        {renderAreaCard(areaGuideSlide)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={() => setAreaGuideSlide((prev) => (prev - 1 + areaGuides.length) % areaGuides.length)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }}
                  >
                    <ChevronLeft className="w-5 h-5" style={{ color: colors.text }} />
                  </button>
                  <button
                    onClick={() => setAreaGuideSlide((prev) => (prev + 1) % areaGuides.length)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }}
                  >
                    <ChevronRight className="w-5 h-5" style={{ color: colors.text }} />
                  </button>
                  <div className="flex justify-center gap-2 mt-6">
                    {areaGuides.map((_, index) => (
                      <button key={index} onClick={() => setAreaGuideSlide(index)} className="h-2 rounded-full transition-all duration-300" style={{ width: areaGuideSlide === index ? '24px' : '8px', background: areaGuideSlide === index ? colors.accent : `${colors.text}30`, boxShadow: areaGuideSlide === index ? `0 0 10px ${colors.accent}60` : 'none' }} />
                    ))}
                  </div>
                </div>
                {/* PC: 縦並び */}
                <div className="hidden lg:block space-y-8">
                  {areaGuides.map((_, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                      {renderAreaCard(index)}
                    </motion.div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)` }} />
      </section>}

      {/* Partner Stores Section - 流れるマーキー */}
      {partnerStores.length > 0 && (
        <section className="relative py-24 overflow-hidden" style={{ background: colors.background }}>
          <div className="container mx-auto max-w-6xl relative z-10 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <GoldDivider />
              <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>Partner Stores</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>{t('common.partner_stores')}</h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: colors.textMuted }}>{t('common.partner_stores_subtitle')}</p>
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
                  style={{ border: `1px solid ${colors.borderGold}` }}
                  onClick={() => handleStoreCardClick(store.id)}
                >
                  <div className="relative aspect-[4/3]">
                    <img src={store.image_urls?.[0] || ''} alt={store.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.background} 0%, transparent 60%)` }} />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-sm font-bold truncate" style={{ color: colors.text, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{store.name}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
          <div className="container mx-auto max-w-6xl relative z-10 px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-10">
              <Button onClick={() => router.push('/store-list')} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all hover:scale-105 min-h-[48px]" style={{ background: `${colors.accent}15`, border: `1px solid ${colors.borderGold}`, color: colors.accent }}><Store className="w-5 h-5" />{t('common.view_all_partners')}</Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.background }}>
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>Contact</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>{t('landing.contact_title')}</h2>
            <p className="text-base mb-8" style={{ color: colors.textMuted }}>{renderWithLineBreaks(t('landing.contact_subtitle'))}</p>
            <Link href="/contact">
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} className="inline-block">
                <Button size="lg" className="text-base px-8 py-6 rounded-full font-semibold" style={{ background: isCafe ? 'linear-gradient(135deg, #5C3D2E 0%, #7A5C3C 50%, #4A2E1F 100%)' : colors.goldGradient, color: isCafe ? '#F7F3EE' : colors.background, boxShadow: colors.shadowGold }}>
                  <Mail className="w-5 h-5 mr-2" />{t('landing.contact_button')}
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)` }} />
      </section>

      {/* Company Section */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.surface }}>
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>Company</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: colors.text }}>{t('landing.company_title')}</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl p-6 sm:p-8" style={{ background: `${colors.background}80`, border: `1px solid ${colors.borderSubtle}` }}>
            <div className="space-y-4">
              {[
                { label: t('landing.company_name_label'), value: t('landing.company_name_value') },
                { label: t('landing.company_address_label'), value: t('landing.company_address_value') },
                { label: t('landing.company_ceo_label'), value: t('landing.company_ceo_value') },
                { label: t('landing.company_business_label'), value: t('landing.company_business_value') },
              ].map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-3" style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <span className="text-xs font-bold uppercase tracking-wider flex-shrink-0 sm:w-32" style={{ color: colors.accent }}>{item.label}</span>
                  <span className="text-sm" style={{ color: colors.textMuted }}>{renderWithLineBreaks(item.value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <a href="https://www.nobody-inc.jp/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium transition-all hover:scale-105" style={{ color: colors.accent }}>
                {t('landing.company_website')} <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4" style={{ background: colors.background, borderTop: `1px solid ${colors.borderGold}` }}>
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center mb-8">
            {isCafe
              ? <Coffee className="h-12 w-12 opacity-70" style={{ color: colors.accent }} />
              : <img src="https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" alt="NIKENME+" className="h-12 w-auto object-contain opacity-70" />}
          </div>
          <nav className="grid grid-cols-2 gap-4 sm:gap-6 max-w-md mx-auto mb-8">
            {footerLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link key={index} href={link.href} className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 min-h-[56px] group" style={{ background: `${colors.surface}60`, border: `1px solid ${colors.borderSubtle}` }}>
                  <Icon className="w-5 h-5 transition-colors" style={{ color: colors.accent }} />
                  <span className="text-base font-medium transition-colors" style={{ color: colors.textMuted }}>{link.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.textSubtle }}>{t('landing.footer_copyright')}</p>
            <p className="text-lg font-bold" style={{ color: colors.accent }}>{t('common.slogan')}</p>
          </div>
        </div>
      </footer>

      {/* Location Permission Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: isCafe ? 'rgba(45, 36, 32, 0.95)' : 'rgba(10, 22, 40, 0.95)' }} onClick={() => locationPermission !== 'loading' && setShowLocationModal(false)}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ backgroundColor: isCafe ? 'rgba(45, 36, 32, 0.5)' : 'rgba(10, 22, 40, 0.5)' }} />
            <motion.div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${colors.accent}15 0%, transparent 70%)`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', filter: 'blur(60px)' }} animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />

            {locationPermission === 'loading' ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative z-10 flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <motion.div className="absolute inset-0 -m-4" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} style={{ background: `radial-gradient(circle, ${colors.accent}40 0%, transparent 70%)`, filter: 'blur(20px)' }} />
                  <motion.div className="w-20 h-20 rounded-full" style={{ border: `2px solid ${colors.borderGold}`, borderTopColor: colors.accent }} animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                      <Sparkles className="w-8 h-8" style={{ color: colors.accent }} />
                    </motion.div>
                  </div>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8 text-center">
                  <p className="text-lg font-medium mb-2" style={{ color: colors.text }}>{t('landing.getting_location')}</p>
                  <p className="text-sm" style={{ color: colors.textMuted }}>{t('landing.map_shortly')}</p>
                </motion.div>
                <div className="flex gap-2 mt-6">
                  {[0, 1, 2].map((i) => (<motion.div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }} animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }} />))}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.3 }} className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden" style={{ background: colors.luxuryGradient, border: `1px solid ${colors.borderGold}`, boxShadow: `${colors.shadowDeep}, 0 0 60px ${colors.accent}15` }} onClick={(e) => e.stopPropagation()}>
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                <div className="h-1" style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}, transparent)` }} />
                <div className="p-8">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-3" style={{ color: colors.text }}>{t('modal.location_title')}</h2>
                    <p className="text-base leading-relaxed" style={{ color: colors.textMuted }}>{t('modal.location_desc')}</p>
                  </motion.div>
                  <GoldDivider />
                  {locationPermission === 'denied' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#F87171' }} />
                      <p className="text-sm" style={{ color: '#F87171' }}>{t('modal.location_error')}</p>
                    </motion.div>
                  )}
                  <div className="space-y-3">
                    <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => handleLocationPermission(true)} className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all relative overflow-hidden group" style={{ background: isCafe ? 'linear-gradient(135deg, #5C3D2E 0%, #7A5C3C 50%, #4A2E1F 100%)' : colors.goldGradient, color: isCafe ? '#F7F3EE' : colors.background, boxShadow: colors.shadowGold }}>
                      <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }} />
                      <span className="relative z-10 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />{t('modal.location_allow')}</span>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleLocationPermission(false)} className="w-full py-4 px-6 rounded-xl font-medium text-base transition-all" style={{ background: `${colors.accent}08`, border: `1px solid ${colors.borderGold}`, color: colors.textMuted }}>{t('modal.location_deny')}</motion.button>
                  </div>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mt-6 text-xs" style={{ color: colors.textSubtle }}>{t('common.location_info_note')}</motion.p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* フローティングボタン群（画面右下） */}
      <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-3 items-end safe-bottom">
        {/* モード切替トグルボタン */}
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={toggleMode}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-manipulation active:scale-95 rounded-lg"
              style={{
                background: isBar ? 'rgba(5,5,5,0.7)' : 'rgba(247,243,238,0.9)',
                backdropFilter: 'blur(20px)',
                border: isBar ? '1px solid rgba(201,168,108,0.3)' : '1px solid rgba(160,120,80,0.3)',
                boxShadow: isBar ? '0 0 20px rgba(201,168,108,0.2)' : '0 0 20px rgba(160,120,80,0.2)',
                minWidth: '56px',
                minHeight: '56px',
              }}
            >
              {isBar ? <Moon className="w-5 h-5" style={{ color: '#FDFBF7' }} /> : <Sun className="w-5 h-5" style={{ color: '#2D2420' }} />}
              <span className="text-[9px] font-bold leading-tight text-center" style={{ color: isBar ? '#FDFBF7' : '#2D2420' }}>
                {isBar ? t('common.mode_night') : t('common.mode_day')}
              </span>
            </Button>
          </motion.div>
        </motion.div>

        {/* 言語変更ボタン */}
        <div className="relative language-menu-container">
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
                  setShowLanguageMenu(!showLanguageMenu);
                }}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-manipulation active:scale-95 rounded-lg"
                style={{
                  background: showLanguageMenu ? colors.accent : (isBar ? 'rgba(5,5,5,0.7)' : 'rgba(247,243,238,0.9)'),
                  backdropFilter: 'blur(20px)',
                  border: showLanguageMenu ? `1px solid ${colors.accent}` : `1px solid ${colors.borderGold}`,
                  boxShadow: `0 0 20px ${colors.accent}33`,
                  minWidth: '56px',
                  minHeight: '56px',
                }}
                title={t('menu.language')}
              >
                <Globe className="w-5 h-5" style={{ color: showLanguageMenu ? colors.background : colors.text }} />
                <span className="text-[10px] font-bold" style={{ color: showLanguageMenu ? colors.background : colors.text }}>
                  {t('menu.language').length > 4 ? t('menu.language').slice(0, 4) : t('menu.language')}
                </span>
              </Button>
            </motion.div>
          </motion.div>

          {/* 言語選択メニュー */}
          <AnimatePresence>
            {showLanguageMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full right-0 mb-2 w-52"
              >
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: isBar ? 'rgba(30, 30, 30, 0.95)' : 'rgba(247, 243, 238, 0.98)',
                    backdropFilter: 'blur(12px)',
                    border: isBar ? '1px solid rgba(255,255,255,0.1)' : `1px solid ${colors.borderGold}`,
                    boxShadow: isBar ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.15)',
                  }}
                >
                  <div className="p-2">
                    <p className="text-xs px-3 py-2 font-bold" style={{ color: colors.textMuted }}>
                      {t('language_selector.title') || t('menu.language')}
                    </p>
                    
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageSelect(lang)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          language === lang
                            ? (isBar ? 'bg-amber-500/20' : 'bg-amber-700/10')
                            : (isBar ? 'hover:bg-white/10' : 'hover:bg-black/5')
                        }`}
                        style={{ color: language === lang ? colors.accent : colors.text }}
                      >
                        <span className="text-xl">{LANGUAGE_META[lang].flag}</span>
                        <span className="font-bold text-sm flex-1 text-left">
                          {LANGUAGE_META[lang].nativeName}
                        </span>
                        {language === lang && (
                          <CheckCircle className="w-4 h-4" style={{ color: colors.accent }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}