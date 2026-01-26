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
  Search,
  Clock,
  Heart,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';

// ============================================
// 統一カラーパレット（店舗詳細画面準拠）
// ============================================
const colors = {
  // ベースカラー（60%）- 背景・余白
  background: '#0A1628',        // Deep Navy
  surface: '#162447',           // Midnight Blue
  surfaceLight: '#1F4068',      // Royal Navy
  cardBackground: '#FDFBF7',    // Ivory
  
  // メインカラー（30%）- 装飾・セクション
  primary: '#1F4068',           // Royal Navy
  charcoal: '#2D3436',
  warmGray: '#636E72',
  
  // アクセントカラー（10%）- CTA・重要要素
  accent: '#C9A86C',            // Champagne Gold
  accentLight: '#E8D5B7',       // Pale Gold
  accentDark: '#B8956E',        // Antique Gold
  
  // テキストカラー
  text: '#FDFBF7',              // Ivory
  textMuted: 'rgba(253, 251, 247, 0.7)',
  textSubtle: 'rgba(253, 251, 247, 0.5)',
  
  // グラデーション
  luxuryGradient: 'linear-gradient(165deg, #0A1628 0%, #162447 50%, #1F4068 100%)',
  goldGradient: 'linear-gradient(135deg, #C9A86C 0%, #E8D5B7 50%, #B8956E 100%)',
  cardGradient: 'linear-gradient(145deg, #FDFBF7 0%, #F5F1EB 100%)',
  
  // ボーダー・シャドウ
  borderGold: 'rgba(201, 168, 108, 0.3)',
  borderSubtle: 'rgba(201, 168, 108, 0.15)',
  shadowGold: '0 8px 30px rgba(201, 168, 108, 0.4)',
  shadowDeep: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
};

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

const copy = {
  ja: {
    hero: {
      catchphrase: '楽しみは、ここから',
      subcopy: 'The Next Spot is Ready',
      body: 'NIKENME+は、大分の夜を\n 案内するNight Spot Mapです。',
    },
    problems: {
      title: 'こんなお悩み、ありませんか？',
      subtitle: 'Common Concerns',
      items: [
        { icon: Search, text: '土地勘がなく、どのお店に\n 行けばいいかわからない' },
        { icon: Phone, text: '電話予約が苦手' },
        { icon: Clock, text: '混んでいるか空いているか、\n 行く前に知りたい' },
      ],
    },
    solution: {
      title: 'だから、NIKENME+',
      subtitle: 'Our Solution',
      body: 'あなたの不安を解消し、\n 夜の街を楽しむためのサービスです。',
      features: [
        { icon: Sparkles, title: '雰囲気がわかる', titleEn: 'See the Vibe', description: 'お店の雰囲気を画像にて事前に確認できます。\n 初めてのお店でも安心して入れます。' },
        { icon: Radio, title: '空席がわかる', titleEn: 'Live Availability', description: 'リアルタイムの空席情報を確認できます。\n 満席のお店を避けられます。' },
        { icon: Shield, title: '安心できる', titleEn: 'Safe & Clear', description: '料金目安や客層など、入る前に知りたい情報が揃っています。女性や観光客も安心です。' },
      ],
    },
    howto: {
      title: '使い方は、とてもシンプル',
      subtitle: '3 Easy Steps',
      steps: [
        { step: '01', title: '次に行くお店を探す', titleEn: 'Find', description: '現在地周辺の空席があるお店をマップで確認します。「空席あり」のアイコンが表示されているお店が今すぐ入れるお店です。' },
        { step: '02', title: 'お店の情報を確認', titleEn: 'Check', description: 'お店の雰囲気、メニュー、料金目安をチェック。気になるお店を見つけよう' },
        { step: '03', title: '席をキープする', titleEn: 'Reserve', description: '到着時間と人数、電話番号、名前を入力するだけ。自動音声があなたの代わりにお店へ電話します。', highlight: true },
      ],
    },
    cta: {
      title: '今夜の二軒目、ここで見つかる。',
      body: '大分の夜は、まだ終わらない。\n NIKENME+で、次のお店を探しましょう。',
      buttonPrimary: 'お店を探す',
      buttonSecondary: '加盟店募集中',
    },
  },
  en: {
    hero: {
      catchphrase: 'Your Next Spot is Ready.',
      subcopy: 'Find it now',
      body: 'NIKENME+ is a night spot map for Oita. Find available venues instantly and reserve your seat with auto-voice call.',
    },
    problems: {
      title: 'Sound Familiar?',
      subtitle: 'Common Concerns',
      items: [
        { icon: Search, text: "Don't know the area or where to go next" },
        { icon: Phone, text: 'Calling to reserve feels awkward or troublesome' },
        { icon: Heart, text: 'Looking for a place comfortable for solo or female guests' },
        { icon: Clock, text: 'Want to know if a place is busy before going' },
      ],
    },
    solution: {
      title: "That's Why NIKENME+",
      subtitle: 'Our Solution',
      body: 'A service designed to ease your concerns and help you enjoy the night.',
      features: [
        { icon: Sparkles, title: 'See the Vibe', titleEn: 'See the Vibe', description: 'Check photos and menus before you go. Feel confident entering a new place.' },
        { icon: Radio, title: 'Live Availability', titleEn: 'Live Availability', description: 'Venues update their status in real-time. Avoid crowded spots easily.' },
        { icon: Shield, title: 'Safe & Clear', titleEn: 'Safe & Clear', description: 'Price range, crowd type, and more info available upfront. Safe for women and tourists.' },
      ],
    },
    howto: {
      title: 'Simple to Use',
      subtitle: '3 Easy Steps',
      steps: [
        { step: '01', title: 'Find on Map', titleEn: 'Find', description: 'Check available venues near you on the map. Green pins mean "seats available now".' },
        { step: '02', title: 'Check Details', titleEn: 'Check', description: 'Review the vibe, menu, and price range. Found a place you like? Move to the next step.' },
        { step: '03', title: 'Reserve Seat', titleEn: 'Reserve', description: 'Just enter arrival time and party size. Auto-voice will call the venue for you.', highlight: true },
      ],
    },
    cta: {
      title: 'Find Your Next Spot Tonight.',
      body: "The night isn't over yet. Discover your next venue with NIKENME+.",
      buttonPrimary: 'View Map',
      buttonSecondary: 'Partner With Us',
    },
  },
};

const GoldDivider = () => (
  <div className="flex items-center justify-center gap-3 my-6">
    <div className="h-px flex-1 max-w-16" style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}40)` }} />
    <div className="w-1.5 h-1.5 rotate-45" style={{ backgroundColor: colors.accent }} />
    <div className="h-px flex-1 max-w-16" style={{ background: `linear-gradient(90deg, ${colors.accent}40, transparent)` }} />
  </div>
);

export default function LandingPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | 'loading'>('prompt');
  const [showToast, setShowToast] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [partnerStores, setPartnerStores] = useState<PartnerStore[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const locationAttemptRef = useRef(false);

  const currentCopy = language === 'ja' ? copy.ja : copy.en;

  const renderWithLineBreaks = (text: string) => {
    return text.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

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
        const { data, error } = await supabase.from('stores').select('id, name, image_urls, website_url, description, vacancy_status').not('image_urls', 'is', null).limit(10);
        if (error) return;
        if (data) { setPartnerStores((data as PartnerStore[]).filter((store) => store.image_urls && store.image_urls.length > 0)); }
      } catch (error) { console.error('Error fetching partner stores:', error); }
    };
    fetchPartnerStores();
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

  const menuItems = [
    { icon: FileText, label: t('menu.terms'), href: '/terms' },
    { icon: Shield, label: t('menu.privacy'), href: '/privacy' },
    { icon: HelpCircle, label: t('menu.faq'), href: '/faq' },
    { icon: FileText, label: t('menu.release_notes'), href: '/release-notes' },
  ];

  const footerLinks = [
    { icon: Building2, label: language === 'ja' ? '会社概要' : 'About Us', href: 'https://www.nobody-inc.jp/' },
    { icon: FileText, label: language === 'ja' ? '利用規約' : 'Terms', href: '/terms' },
    { icon: HelpCircle, label: language === 'ja' ? 'よくある質問' : 'FAQ', href: '/faq' },
    { icon: FileText, label: language === 'ja' ? 'リリースノート' : 'Release Notes', href: '/release-notes' },
  ];

  const handleMapClick = () => { setShowLocationModal(true); };

  const handleLocationPermission = async (allow: boolean) => {
    if (allow) {
      setLocationPermission('loading');
      try {
        const location = await getLocationWithFallback();
        localStorage.setItem('userLocation', JSON.stringify({ ...location, timestamp: Date.now() }));
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

  const handleLanguageToggle = () => { setLanguage(language === 'ja' ? 'en' : 'ja'); window.location.reload(); };
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
              <span className="text-sm font-medium" style={{ color: colors.text }}>{language === 'ja' ? '空席があります' : 'Seats available now'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 safe-top" style={{ background: colors.luxuryGradient, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${colors.borderGold}` }}>
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-wider" style={{ color: colors.accent }}>NIKENME+</span>
            <span className="hidden sm:inline-block text-[9px] px-2 py-1 rounded-full font-medium tracking-[0.1em] uppercase" style={{ background: `${colors.accent}15`, border: `1px solid ${colors.borderGold}`, color: colors.accent }}>Night Spot</span>
          </motion.div>
          <div className="flex items-center gap-2 sm:gap-4">

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
                <div className="mt-12 pt-6" style={{ borderTop: `1px solid ${colors.borderGold}` }}>
                  <p className="text-xs text-center" style={{ color: colors.textSubtle }}>© 2025 NIKENME+<br />{t('menu.version')}</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 pb-20 px-4 overflow-hidden">
        <motion.div className="absolute inset-0 z-0" style={{ opacity: heroOpacity, scale: heroScale }}>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/12_hotel_bar_t3ti2i.jpg')`, opacity: 0.25 }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center top, transparent 0%, ${colors.background}CC 50%, ${colors.background} 100%)` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 0%, ${colors.background}80 50%, ${colors.background} 100%)` }} />
        </motion.div>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div key={i} className="absolute w-1 h-1 rounded-full" style={{ left: `${10 + (i * 12) % 80}%`, top: `${20 + (i * 11) % 60}%`, background: colors.accent, boxShadow: `0 0 15px ${colors.accent}80` }} animate={{ opacity: [0.2, 0.6, 0.2], y: [0, -15, 0] }} transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.6 }} />
          ))}
        </div>
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="flex justify-center mb-8">
              <div className="relative">
                <motion.div className="absolute inset-0 -m-8" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity }} style={{ background: `radial-gradient(circle, ${colors.accent}40 0%, transparent 70%)`, filter: 'blur(40px)' }} />
                <img src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" alt="NIKENME+" className="relative h-28 sm:h-36 w-auto object-contain" style={{ filter: `drop-shadow(0 0 30px ${colors.accent}60)` }} />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full" style={{ background: `${colors.accent}10`, border: `1px solid ${colors.borderGold}` }}>
              <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full" style={{ background: colors.accent }} />
              <span className="text-[10px] font-medium tracking-[0.25em] uppercase" style={{ color: colors.accent }}>Night Spot Map</span>
            </motion.div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight"><span style={{ color: colors.text }}>{currentCopy.hero.catchphrase}</span></h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-6" style={{ color: colors.textMuted }}>{currentCopy.hero.subcopy}</p>
            <p className="text-base sm:text-lg mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: colors.textMuted }}>{renderWithLineBreaks(currentCopy.hero.body)}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} className="rounded-full relative overflow-hidden group" style={{ boxShadow: colors.shadowGold }}>
                <Button size="lg" onClick={handleMapClick} className="text-lg px-10 py-6 rounded-full font-semibold transition-all relative z-10" style={{ background: colors.goldGradient, color: colors.background }}>
                  <Store className="w-5 h-5 mr-2" />{currentCopy.cta.buttonPrimary}
                </Button>
                <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }} />
              </motion.div>
              <a href="https://forms.gle/18LmBfyJAJ1txmF56" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="ghost" className="text-base px-8 py-6 rounded-full font-medium border transition-all hover:scale-105" style={{ borderColor: colors.borderGold, color: colors.textMuted, background: `${colors.accent}08` }}>
                  <Store className="w-5 h-5 mr-2" />{currentCopy.cta.buttonSecondary}
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}60, transparent)` }} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.5, ease: 'easeOut' }} />
      </section>

      {/* 課題提起セクション */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.surface }}>
        <div className="container mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>{currentCopy.problems.subtitle}</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: colors.text }}>{currentCopy.problems.title}</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentCopy.problems.items.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                  <div className="flex items-start gap-4 p-5 rounded-xl" style={{ background: `${colors.background}80`, border: `1px solid ${colors.borderSubtle}` }}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${colors.accent}15`, border: `1px solid ${colors.borderGold}` }}>
                      <Icon className="w-5 h-5" style={{ color: colors.accent }} />
                    </div>
                    <p className="text-base leading-relaxed pt-1.5" style={{ color: colors.textMuted }}>{renderWithLineBreaks(item.text)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        <motion.div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)` }} />
      </section>

      {/* 解決策・サービスの強みセクション */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.background }}>
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>{currentCopy.solution.subtitle}</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>{currentCopy.solution.title}</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: colors.textMuted }}>{renderWithLineBreaks(currentCopy.solution.body)}</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentCopy.solution.features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.15 }}>
                  <Card className="h-full p-8 group cursor-pointer transition-all duration-500 hover:translate-y-[-4px] relative overflow-hidden text-center" style={{ background: `${colors.surface}80`, backdropFilter: 'blur(10px)', border: `1px solid ${colors.borderGold}` }}>
                    <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at center, ${colors.accent}10 0%, transparent 70%)` }} />
                    <div className="relative z-10 flex flex-col items-center">
                      <motion.div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 mx-auto" style={{ background: `${colors.accent}15`, border: `1px solid ${colors.borderGold}` }} whileHover={{ scale: 1.05 }}>
                        <Icon className="w-7 h-7" style={{ color: colors.accent }} />
                      </motion.div>
                      <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>{feature.title}</h3>
                      <p className="text-xs uppercase tracking-wider mb-4 font-medium" style={{ color: colors.accentDark }}>{feature.titleEn}</p>
                      <p style={{ color: colors.textMuted }} className="leading-relaxed text-sm">{renderWithLineBreaks(feature.description)}</p>
                    </div>
                    <motion.div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: colors.goldGradient }} initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.surface }}>
        <div className="container mx-auto max-w-6xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <GoldDivider />
            <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>{currentCopy.howto.subtitle}</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: colors.text }}>{currentCopy.howto.title}</h2>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {currentCopy.howto.steps.map((item, index) => {
              const stepIcons = [MapPin, Store, Phone];
              const Icon = stepIcons[index];
              const images = [
                'https://res.cloudinary.com/dz9trbwma/image/upload/v1767761406/26ef2985-e460-4b06-a245-8e5e0f65a459_lk9q5d.png',
                'https://res.cloudinary.com/dz9trbwma/image/upload/v1767762176/Gemini_Generated_Image_4tiamt4tiamt4tia_bnxmn9.png',
                'https://res.cloudinary.com/dz9trbwma/image/upload/v1767763441/Gemini_Generated_Image_3qcvnq3qcvnq3qcv_acv91j.png',
              ];
              return (
                <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.15 }}>
                  <Card className="h-full overflow-hidden group relative" style={{ background: item.highlight ? `${colors.accent}10` : colors.background, border: item.highlight ? `2px solid ${colors.accent}` : `1px solid ${colors.borderGold}`, boxShadow: item.highlight ? colors.shadowGold : 'none' }}>
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl font-bold" style={{ color: item.highlight ? colors.accent : colors.accentDark }}>{item.step}</span>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${colors.accent}15`, border: `1px solid ${colors.borderGold}` }}>
                            <Icon className="w-5 h-5" style={{ color: item.highlight ? colors.accent : colors.textMuted }} />
                          </div>
                        </div>
                        {item.highlight && (<span className="text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider" style={{ background: `${colors.accent}20`, color: colors.accent, border: `1px solid ${colors.accent}40` }}>{language === 'ja' ? '自動音声' : 'Auto Voice'}</span>)}
                      </div>
                      <h3 className="text-xl font-bold mb-1" style={{ color: colors.text }}>{item.title}</h3>
                      <p className="text-xs uppercase tracking-wider mb-4 font-medium" style={{ color: colors.accentDark }}>{item.titleEn}</p>
                      <p className="mb-6 leading-relaxed text-sm" style={{ color: colors.textMuted }}>{renderWithLineBreaks(item.description)}</p>
                      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.borderGold}` }}>
                        <img src={images[index]} alt={item.title} className="w-full h-auto object-cover" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Partner Stores Section */}
      {partnerStores.length > 0 && (
        <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.background }}>
          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <GoldDivider />
              <span className="block text-xs font-medium tracking-[0.3em] uppercase mb-4" style={{ color: colors.accent }}>Partner Stores</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>{language === 'ja' ? '加盟店の様子' : 'Partner Store Gallery'}</h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: colors.textMuted }}>{language === 'ja' ? 'NIKENME+を利用しているお店をCHECK' : 'Check out stores on NIKENME+'}</p>
            </motion.div>

            {/* モバイル: カルーセル表示 */}
            <div className="block sm:hidden relative">
              <div ref={carouselRef} className="overflow-hidden rounded-2xl cursor-pointer group" style={{ background: `${colors.surface}80`, border: `1px solid ${colors.borderGold}`, touchAction: 'pan-x pan-y' }} onClick={() => partnerStores[currentSlide] && handleStoreCardClick(partnerStores[currentSlide].id)}>
                <div className="relative aspect-[4/3]">
                  <AnimatePresence mode="wait">
                    {partnerStores[currentSlide] && (
                      <motion.div key={partnerStores[currentSlide].id} initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.5 }} className="absolute inset-0">
                        <img src={partnerStores[currentSlide].image_urls?.[0] || ''} alt={partnerStores[currentSlide].name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.background} 0%, ${colors.background}60 40%, transparent 100%)` }} />
                        <div className="absolute top-4 left-4"><h3 className="text-xl font-bold" style={{ color: colors.text, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{partnerStores[currentSlide].name}</h3></div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                          <motion.span className="text-sm font-medium px-4 py-2.5 rounded-full flex items-center gap-2" style={{ background: `${colors.accent}25`, color: colors.accent, border: `1px solid ${colors.accent}50`, backdropFilter: 'blur(8px)' }} whileHover={{ scale: 1.05 }}>
                            <ChevronRight className="w-4 h-4" />{language === 'ja' ? '詳細をみる' : 'Tap to find a store'}
                          </motion.span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }} aria-label="Previous slide"><ChevronLeft className="w-6 h-6" style={{ color: colors.text }} /></button>
              <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={{ background: `${colors.background}E6`, border: `1px solid ${colors.borderGold}`, backdropFilter: 'blur(10px)' }} aria-label="Next slide"><ChevronRight className="w-6 h-6" style={{ color: colors.text }} /></button>
              <div className="flex justify-center gap-2 mt-6">
                {partnerStores.map((_, index) => (<button key={index} onClick={() => setCurrentSlide(index)} className="h-2 rounded-full transition-all duration-300" style={{ width: currentSlide === index ? '24px' : '8px', background: currentSlide === index ? colors.accent : `${colors.text}30`, boxShadow: currentSlide === index ? `0 0 10px ${colors.accent}60` : 'none' }} aria-label={`Go to slide ${index + 1}`} />))}
              </div>
            </div>

            {/* PC: グリッド表示 */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {partnerStores.slice(0, 6).map((store, index) => (
                <motion.div key={store.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="relative group cursor-pointer overflow-hidden rounded-2xl" style={{ background: `${colors.surface}80`, border: `1px solid ${colors.borderGold}` }} onClick={() => handleStoreCardClick(store.id)}>
                  <div className="relative aspect-[4/3]">
                    <img src={store.image_urls?.[0] || ''} alt={store.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.background} 0%, ${colors.background}80 50%, transparent 100%)` }} />
                    <div className="absolute top-4 left-4 right-4"><h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2" style={{ color: colors.text, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>{store.name}</h3></div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2"><motion.span className="text-sm font-medium px-4 py-2.5 rounded-full flex items-center gap-2" style={{ background: `${colors.accent}25`, color: colors.accent, border: `1px solid ${colors.accent}50`, backdropFilter: 'blur(8px)' }} whileHover={{ scale: 1.05 }}><ChevronRight className="w-4 h-4" />{language === 'ja' ? '詳細をみる' : 'View Details'}</motion.span></div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-10">
              <Button onClick={() => router.push('/store-list')} className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all hover:scale-105 min-h-[48px]" style={{ background: `${colors.accent}15`, border: `1px solid ${colors.borderGold}`, color: colors.accent }}><Store className="w-5 h-5" />{language === 'ja' ? 'すべての加盟店を見る' : 'View All Partner Stores'}</Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative py-28 px-4 overflow-hidden" style={{ background: colors.surface }}>
        <div className="absolute inset-0 z-0" style={{ background: `radial-gradient(ellipse at center, ${colors.accent}15 0%, transparent 50%)` }} />
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <GoldDivider />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6" style={{ color: colors.text }}>{currentCopy.cta.title}</h2>
            <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style={{ color: colors.textMuted }}>{renderWithLineBreaks(currentCopy.cta.body)}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} className="rounded-full relative overflow-hidden group" style={{ boxShadow: colors.shadowGold }}>
                <Button size="lg" onClick={handleMapClick} className="text-xl px-12 py-7 rounded-full font-semibold relative z-10" style={{ background: colors.goldGradient, color: colors.background }}><MapPin className="w-6 h-6 mr-3" />{currentCopy.cta.buttonPrimary}</Button>
                <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }} />
              </motion.div>
              <a href="https://forms.gle/18LmBfyJAJ1txmF56" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="ghost" className="text-base px-8 py-6 rounded-full font-medium border transition-all hover:scale-105" style={{ borderColor: colors.borderGold, color: colors.textMuted, background: `${colors.accent}08` }}><Store className="w-5 h-5 mr-2" />{currentCopy.cta.buttonSecondary}</Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4" style={{ background: colors.background, borderTop: `1px solid ${colors.borderGold}` }}>
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center mb-8">
            <img src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png" alt="NIKENME+" className="h-12 w-auto object-contain opacity-70" />
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
            <p className="text-sm mb-2" style={{ color: colors.textSubtle }}>© 2025 NIKENME+ All rights reserved.</p>
            <p className="text-lg font-bold" style={{ color: colors.accent }}>{language === 'ja' ? 'いますぐ、2軒目へ' : 'Find Your Next Spot Now'}</p>
          </div>
        </div>
      </footer>

      {/* Location Permission Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(10, 22, 40, 0.95)' }} onClick={() => locationPermission !== 'loading' && setShowLocationModal(false)}>
            <div className="absolute inset-0 backdrop-blur-md" style={{ backgroundColor: 'rgba(10, 22, 40, 0.5)' }} />
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
                  <p className="text-lg font-medium mb-2" style={{ color: colors.text }}>{language === 'ja' ? '位置情報を取得中...' : 'Getting your location...'}</p>
                  <p className="text-sm" style={{ color: colors.textMuted }}>{language === 'ja' ? 'まもなくマップを表示します' : 'Map will appear shortly'}</p>
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
                    <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => handleLocationPermission(true)} className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all relative overflow-hidden group" style={{ background: colors.goldGradient, color: colors.background, boxShadow: colors.shadowGold }}>
                      <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }} />
                      <span className="relative z-10 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />{t('modal.location_allow')}</span>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleLocationPermission(false)} className="w-full py-4 px-6 rounded-xl font-medium text-base transition-all" style={{ background: `${colors.accent}08`, border: `1px solid ${colors.borderGold}`, color: colors.textMuted }}>{t('modal.location_deny')}</motion.button>
                  </div>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mt-6 text-xs" style={{ color: colors.textSubtle }}>{language === 'ja' ? '位置情報は周辺のお店を表示する為だけに使用します' : 'Location is only used to show nearby venues'}</motion.p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* フローティングボタン群（画面右下） */}
      <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-3 items-end safe-bottom">
        {/* 言語変更ボタン */}
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
              onClick={handleLanguageToggle}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 touch-manipulation active:scale-95 rounded-lg"
              style={{
                background: 'rgba(5,5,5,0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(201,168,108,0.3)',
                boxShadow: '0 0 20px rgba(201,168,108,0.2)',
                minWidth: '56px',
                minHeight: '56px',
              }}
              title={language === 'ja' ? 'Switch to English' : '日本語に切り替え'}
            >
              <Globe className="w-5 h-5" style={{ color: '#C9A86C' }} />
              <span className="text-[10px] font-bold" style={{ color: '#C9A86C' }}>
                {language === 'ja' ? '英語' : '日本語'}
              </span>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}