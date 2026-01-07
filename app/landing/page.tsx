'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Zap,
  Radio,
  ChevronRight,
  Phone,
  CheckCircle,
  ChevronLeft,
  MapPinned,
  Building2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomModal } from '@/components/ui/custom-modal';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';

// ===== デザイントークン（高級ラウンジテーマ） =====
const colors = {
  background: '#2B1F1A',
  surface: '#1C1C1C',
  accent: '#C89B3C',
  accentDark: '#8A6A2F',
  text: '#F2EBDD',
  textMuted: 'rgba(242, 235, 221, 0.6)',
  textSubtle: 'rgba(242, 235, 221, 0.4)',
};

// 店舗データの型定義
interface PartnerStore {
  id: string;
  name: string;
  image_urls: string[] | null;
  website_url: string | null;
  description: string | null;
  vacancy_status: 'vacant' | 'moderate' | 'full' | 'closed';
}

// ===== 位置情報のデフォルト値（大分市中心部） =====
const DEFAULT_LOCATION = {
  lat: 33.2382,
  lng: 131.6126,
  timestamp: Date.now(),
  isDefault: true,
};

export default function LandingPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<'granted' | 'denied' | 'prompt' | 'loading'>('prompt');
  const [showToast, setShowToast] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [partnerStores, setPartnerStores] = useState<PartnerStore[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const locationAttemptRef = useRef(false);

  // Parallax effect for hero
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 1.05]);

  // ===== 位置情報取得の最適化 =====
  const getLocationWithFallback = useCallback((): Promise<{ lat: number; lng: number; isDefault?: boolean }> => {
    return new Promise((resolve) => {
      // すでに試行中なら早期リターン
      if (locationAttemptRef.current) {
        resolve(DEFAULT_LOCATION);
        return;
      }
      locationAttemptRef.current = true;

      // ブラウザが位置情報をサポートしていない場合
      if (!navigator.geolocation) {
        resolve(DEFAULT_LOCATION);
        return;
      }

      // キャッシュされた位置情報をまず確認
      const cached = localStorage.getItem('userLocation');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // 5分以内のキャッシュなら即座に使用
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            resolve({ lat: parsed.lat, lng: parsed.lng, isDefault: parsed.isDefault });
            return;
          }
        } catch {
          // キャッシュパースエラーは無視
        }
      }

      let resolved = false;

      // タイムアウト処理（5秒で強制的にデフォルト値を使用）
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log('Location timeout - using default');
          resolve(DEFAULT_LOCATION);
        }
      }, 5000);

      // 位置情報取得（低精度モードで高速取得）
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
        },
        (error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            console.log('Geolocation error:', error.message);
            resolve(DEFAULT_LOCATION);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 300000, // 5分間のキャッシュを許容
        }
      );
    });
  }, []);

  // Partner stores - 店舗データを取得
  useEffect(() => {
    const fetchPartnerStores = async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name, image_urls, website_url, description, vacancy_status')
          .not('image_urls', 'is', null)
          .limit(10);

        if (error) {
          console.error('Error fetching partner stores:', error);
          return;
        }

        if (data) {
          const storesWithImages = (data as PartnerStore[]).filter(
            (store) => store.image_urls && store.image_urls.length > 0
          );
          setPartnerStores(storesWithImages);
        }
      } catch (error) {
        console.error('Error fetching partner stores:', error);
      }
    };

    fetchPartnerStores();
  }, []);

  // Toast notification
  useEffect(() => {
    const checkVacantStores = async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, vacancy_status')
          .eq('vacancy_status', 'vacant')
          .limit(1);

        if (error) return;

        if (data && data.length > 0) {
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }
      } catch (error) {
        console.error('Error checking vacant stores:', error);
      }
    };

    const initialTimer = setTimeout(checkVacantStores, 2000);
    const interval = setInterval(checkVacantStores, 8000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  // Partner stores carousel auto-slide
  useEffect(() => {
    if (partnerStores.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % partnerStores.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [partnerStores.length]);

  // ===== Features =====
  const features = [
    {
      icon: Zap,
      title: language === 'ja' ? '今すぐ入れる' : 'Instant Entry',
      titleEn: 'Instant Entry',
      description: language === 'ja' 
        ? '待ち時間なしで入れるお店を瞬時に発見。' 
        : 'Discover spots with no wait instantly.',
    },
    {
      icon: Radio,
      title: language === 'ja' ? 'リアルタイム更新' : 'Live Updates',
      titleEn: 'Live Status',
      description: language === 'ja' 
        ? '店舗が更新する最新の空席状況を確認。' 
        : 'Check real-time availability from venues.',
    },
    {
      icon: MapPinned,
      title: language === 'ja' ? '距離と時間' : 'Distance & Time',
      titleEn: 'Nearby',
      description: language === 'ja' 
        ? '徒歩時間と距離をリアルタイムで表示。' 
        : 'View walking time and distance live.',
    },
  ];

  const menuItems = [
    { icon: FileText, label: t('menu.terms'), href: '/terms' },
    { icon: Shield, label: t('menu.privacy'), href: '/privacy' },
    { icon: HelpCircle, label: t('menu.faq'), href: '/faq' },
    { icon: FileText, label: t('menu.release_notes'), href: '/release-notes' },
  ];

  const footerLinks = [
    { icon: Building2, label: language === 'ja' ? '会社概要' : 'About Us', href: '/about' },
    { icon: FileText, label: language === 'ja' ? '利用規約' : 'Terms', href: '/terms' },
    { icon: HelpCircle, label: language === 'ja' ? 'よくある質問' : 'FAQ', href: '/faq' },
    { icon: FileText, label: language === 'ja' ? 'リリースノート' : 'Release Notes', href: '/release-notes' },
  ];

  const handleMapClick = () => {
    setShowLocationModal(true);
  };

  // ===== 位置情報許可ハンドラー（最適化版） =====
  const handleLocationPermission = async (allow: boolean) => {
    if (allow) {
      setLocationPermission('loading');
      
      try {
        const location = await getLocationWithFallback();
        
        const locationData = {
          ...location,
          timestamp: Date.now(),
        };
        
        localStorage.setItem('userLocation', JSON.stringify(locationData));
        setLocationPermission(location.isDefault ? 'denied' : 'granted');
        
        // 即座に遷移（ローディング表示後）
        setTimeout(() => {
          setShowLocationModal(false);
          router.push('/map?from=landing');
        }, 300);
        
      } catch {
        // エラー時もデフォルト位置で続行
        localStorage.setItem('userLocation', JSON.stringify({
          ...DEFAULT_LOCATION,
          timestamp: Date.now(),
        }));
        setLocationPermission('denied');
        
        setTimeout(() => {
          setShowLocationModal(false);
          router.push('/map?from=landing');
        }, 300);
      }
    } else {
      // 拒否時は即座にデフォルト位置で遷移
      localStorage.setItem('userLocation', JSON.stringify({
        ...DEFAULT_LOCATION,
        timestamp: Date.now(),
      }));
      setLocationPermission('denied');
      setShowLocationModal(false);
      router.push('/map?from=landing');
    }
  };

  const handleLanguageToggle = () => {
    const newLanguage = language === 'ja' ? 'en' : 'ja';
    setLanguage(newLanguage);
    window.location.reload();
  };

  // ===== Partner Store カードクリック処理（遷移先変更） =====
  const handleStoreCardClick = (storeId: string) => {
    router.push(`/store/${storeId}`);
  };

  const nextSlide = () => {
    if (partnerStores.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % partnerStores.length);
  };

  const prevSlide = () => {
    if (partnerStores.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + partnerStores.length) % partnerStores.length);
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: colors.background }}
    >
      {/* ===== 背景装飾エフェクト ===== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${colors.accent}10 0%, transparent 60%)`,
            top: '-250px',
            right: '-250px',
            filter: 'blur(80px)',
          }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${colors.accentDark}15 0%, transparent 60%)`,
            bottom: '10%',
            left: '-150px',
            filter: 'blur(60px)',
          }}
          animate={{ opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
      </div>

      {/* ===== Toast Notification ===== */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 z-50"
          >
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-full"
              style={{
                background: colors.surface,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${colors.accentDark}`,
                boxShadow: `0 4px 30px ${colors.accent}30`,
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: '#4ADE80', boxShadow: '0 0 10px #4ADE80' }}
              />
              <span className="text-sm font-medium" style={{ color: colors.text }}>
                {language === 'ja' ? '空席のお店があります' : 'Seats available now'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Header ===== */}
      <header
        className="fixed top-0 left-0 right-0 z-50 safe-top"
        style={{
          background: `${colors.background}E6`,
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${colors.accentDark}40`,
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <span
              className="text-lg font-bold tracking-wider"
              style={{ color: colors.accent }}
            >
              NIKENME+
            </span>
            <span
              className="hidden sm:inline-block text-[9px] px-2 py-1 rounded-full font-medium tracking-[0.1em] uppercase"
              style={{
                background: `${colors.accent}15`,
                border: `1px solid ${colors.accentDark}`,
                color: colors.accent,
              }}
            >
              Night Spot
            </span>
          </motion.div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleLanguageToggle}
              className="flex items-center gap-1 px-2 py-1 rounded transition-colors"
              style={{ color: colors.textMuted }}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">{language === 'ja' ? 'EN' : 'JP'}</span>
            </button>

            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-medium transition-all duration-300 hover:scale-105"
                style={{
                  borderColor: colors.accentDark,
                  color: colors.accent,
                  background: `${colors.accent}08`,
                }}
              >
                {t('header.store_login')}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
              style={{ color: colors.textMuted }}
            >
              {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Side Menu ===== */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.8)' }}
              onClick={() => setShowMenu(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 z-50 overflow-y-auto"
              style={{
                background: colors.surface,
                borderLeft: `1px solid ${colors.accentDark}40`,
              }}
            >
              <div className="p-6 pt-20">
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-1" style={{ color: colors.text }}>
                    {t('menu.title')}
                  </h2>
                  <p className="text-sm" style={{ color: colors.textSubtle }}>
                    {t('menu.subtitle')}
                  </p>
                </div>

                <nav className="space-y-1">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-3 p-4 rounded-lg transition-colors group"
                          style={{ color: colors.textMuted }}
                        >
                          <Icon className="w-5 h-5" style={{ color: colors.accent }} />
                          <span className="group-hover:opacity-100 font-medium">
                            {item.label}
                          </span>
                          <ChevronRight className="w-4 h-4 ml-auto opacity-30" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                <div className="mt-12 pt-6" style={{ borderTop: `1px solid ${colors.accentDark}30` }}>
                  <p className="text-xs text-center" style={{ color: colors.textSubtle }}>
                    © 2025 NIKENME+
                    <br />
                    {t('menu.version')}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Hero Section ===== */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 pb-20 px-4 overflow-hidden">
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/12_hotel_bar_t3ti2i.jpg')`,
              opacity: 0.25,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at center top, transparent 0%, ${colors.background}CC 50%, ${colors.background} 100%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, transparent 0%, ${colors.background}80 50%, ${colors.background} 100%)`,
            }}
          />
        </motion.div>

        {/* Floating gold particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                left: `${10 + (i * 12) % 80}%`,
                top: `${20 + (i * 11) % 60}%`,
                background: colors.accent,
                boxShadow: `0 0 15px ${colors.accent}80`,
              }}
              animate={{
                opacity: [0.2, 0.6, 0.2],
                y: [0, -15, 0],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.6,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center mb-8"
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 -m-8"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  style={{
                    background: `radial-gradient(circle, ${colors.accent}40 0%, transparent 70%)`,
                    filter: 'blur(40px)',
                  }}
                />
                <img
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                  alt="NIKENME+"
                  className="relative h-28 sm:h-36 w-auto object-contain"
                  style={{ filter: `drop-shadow(0 0 30px ${colors.accent}60)` }}
                />
              </div>
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full"
              style={{
                background: `${colors.accent}10`,
                border: `1px solid ${colors.accentDark}`,
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: colors.accent }}
              />
              <span
                className="text-[10px] font-medium tracking-[0.25em] uppercase"
                style={{ color: colors.accent }}
              >
                Night Spot Map
              </span>
            </motion.div>

            {/* H1 */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
              <span style={{ color: colors.text }}>
                楽しみは、これから
              </span>
              <br />
              <span
                className="text-lg sm:text-xl md:text-2xl font-normal"
                style={{ color: colors.textMuted }}
              >
                The Night Continues From Here
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg sm:text-xl md:text-2xl mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{ color: colors.textMuted }}
            >
              大分の二軒目探しは <span style={{ color: colors.accent, fontWeight: 600 }}>NIKENME+</span>
              <br />
              次のお店を今すぐマップで探そう。
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-full"
                style={{
                  boxShadow: `0 0 40px ${colors.accent}40`,
                }}
              >
                <Button
                  size="lg"
                  onClick={handleMapClick}
                  className="text-lg px-10 py-6 rounded-full font-semibold transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
                    color: colors.background,
                  }}
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  {t('hero.cta')}
                </Button>
              </motion.div>

              <a
                href="https://forms.gle/18LmBfyJAJ1txmF56"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-base px-8 py-6 rounded-full font-medium border transition-all hover:scale-105"
                  style={{
                    borderColor: colors.accentDark,
                    color: colors.textMuted,
                    background: `${colors.accent}05`,
                  }}
                >
                  <Store className="w-4 h-4 mr-2" />
                  {t('cta.recruiting_stores')}
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Demo Screen */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 relative"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: `${colors.surface}80`,
                border: `1px solid ${colors.accentDark}40`,
                boxShadow: `0 25px 80px rgba(0,0,0,0.5), 0 0 40px ${colors.accent}10`,
              }}
            >
              <div className="relative aspect-video">
                <img
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761800365/79FA3ECA-EEF6-4627-808B-E157EA37FBF4_1_201_a_atzbik.jpg"
                  alt="App Demo"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 flex items-end justify-center pb-10"
                  style={{
                    background: `linear-gradient(to top, ${colors.background} 0%, ${colors.background}80 30%, transparent 60%)`,
                  }}
                >
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-center px-4" style={{ color: colors.text }}>
                    {t('hero.demo_text')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Gold line divider */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}60, transparent)` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </section>

      {/* ===== Features Section ===== */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.surface }}>
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              className="inline-block mb-4"
              initial={{ width: 0 }}
              whileInView={{ width: 60 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="h-px" style={{ background: colors.accent }} />
            </motion.div>
            <span
              className="block text-xs font-medium tracking-[0.3em] uppercase mb-4"
              style={{ color: colors.accent }}
            >
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: colors.text }}>
              {t('features.title')}
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: colors.textMuted }}>
              {language === 'ja' ? '二軒目探しをスマートに' : 'Find your next spot smartly'}
            </p>
          </motion.div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <Card
                    className="h-full p-8 group cursor-pointer transition-all duration-500 hover:translate-y-[-4px] relative overflow-hidden text-center"
                    style={{
                      background: `${colors.background}80`,
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${colors.accentDark}30`,
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `radial-gradient(circle at center, ${colors.accent}10 0%, transparent 70%)`,
                      }}
                    />

                    <div className="relative z-10 flex flex-col items-center">
                      <motion.div
                        className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 mx-auto"
                        style={{
                          background: `${colors.accent}15`,
                          border: `1px solid ${colors.accentDark}50`,
                        }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Icon className="w-7 h-7" style={{ color: colors.accent }} />
                      </motion.div>

                      <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
                        {feature.title}
                      </h3>
                      <p 
                        className="text-xs uppercase tracking-wider mb-4 font-medium"
                        style={{ color: colors.accentDark }}
                      >
                        {feature.titleEn}
                      </p>
                      <p style={{ color: colors.textMuted }} className="leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: colors.accent }}
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${colors.accentDark}60, transparent)` }}
        />
      </section>

      {/* ===== How to Use Section ===== */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              className="inline-block mb-4"
              initial={{ width: 0 }}
              whileInView={{ width: 60 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="h-px" style={{ background: colors.accent }} />
            </motion.div>
            <span
              className="block text-xs font-medium tracking-[0.3em] uppercase mb-4"
              style={{ color: colors.accent }}
            >
              How to Use
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: colors.text }}>
              {t('how_to.title')}
            </h2>
            <p className="text-lg" style={{ color: colors.textMuted }}>
              {t('how_to.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: MapPin,
                title: t('how_to.step1_title'),
                titleEn: 'Check',
                description: t('how_to.step1_desc'),
                image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761800378/27F4F4F4-749D-4141-BEDC-5B93091BA278_1_102_o_juxfgv.jpg',
              },
              {
                step: '02',
                icon: Store,
                title: t('how_to.step2_title'),
                titleEn: 'Details',
                description: t('how_to.step2_desc'),
                image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761802358/%E5%90%8D%E7%A7%B0%E6%9C%AA%E8%A8%AD%E5%AE%9A%E3%81%AE%E3%83%86%E3%82%99%E3%82%B5%E3%82%99%E3%82%A4%E3%83%B3_ekfjbe.png',
              },
              {
                step: '03',
                icon: Phone,
                title: language === 'ja' ? '席をキープ' : 'Reserve',
                titleEn: 'Reserve',
                description: language === 'ja'
                  ? '自動音声で予約。10・20・30分後から選択可能。'
                  : 'Auto-voice reserves. Choose 10, 20, or 30 min.',
                image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1763549853/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2025-11-19_19.56.23_slrq2t.png',
                highlight: true,
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <Card
                    className="h-full overflow-hidden group relative"
                    style={{
                      background: item.highlight ? `${colors.accent}08` : colors.surface,
                      border: item.highlight 
                        ? `1px solid ${colors.accent}60` 
                        : `1px solid ${colors.accentDark}30`,
                      boxShadow: item.highlight ? `0 0 40px ${colors.accent}20` : 'none',
                    }}
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span
                            className="text-4xl font-bold"
                            style={{ color: item.highlight ? colors.accent : colors.accentDark }}
                          >
                            {item.step}
                          </span>
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{
                              background: `${colors.accent}15`,
                              border: `1px solid ${colors.accentDark}50`,
                            }}
                          >
                            <Icon
                              className="w-5 h-5"
                              style={{ color: item.highlight ? colors.accent : colors.textMuted }}
                            />
                          </div>
                        </div>
                        {item.highlight && (
                          <span
                            className="text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider"
                            style={{
                              background: `${colors.accent}20`,
                              color: colors.accent,
                              border: `1px solid ${colors.accent}40`,
                            }}
                          >
                            Recommended
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold mb-1" style={{ color: colors.text }}>
                        {item.title}
                      </h3>
                      <p
                        className="text-xs uppercase tracking-wider mb-4 font-medium"
                        style={{ color: colors.accentDark }}
                      >
                        {item.titleEn}
                      </p>
                      <p className="mb-6 leading-relaxed" style={{ color: colors.textMuted }}>
                        {item.description}
                      </p>

                      <div
                        className="rounded-xl overflow-hidden"
                        style={{
                          border: `1px solid ${colors.accentDark}30`,
                        }}
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Partner Stores Section（空席表示削除・遷移先変更） ===== */}
      {partnerStores.length > 0 && (
        <section className="relative py-24 px-4 overflow-hidden" style={{ background: colors.surface }}>
          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <motion.div
                className="inline-block mb-4"
                initial={{ width: 0 }}
                whileInView={{ width: 60 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="h-px" style={{ background: colors.accent }} />
              </motion.div>
              <span
                className="block text-xs font-medium tracking-[0.3em] uppercase mb-4"
                style={{ color: colors.accent }}
              >
                Partner Stores
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: colors.text }}>
                {language === 'ja' ? '加盟店の様子' : 'Partner Store Gallery'}
              </h2>
              <p className="text-lg max-w-xl mx-auto" style={{ color: colors.textMuted }}>
                {language === 'ja' 
                  ? 'NIKENME+に参加しているお店をチェック' 
                  : 'Check out stores on NIKENME+'}
              </p>
            </motion.div>

            {/* Carousel */}
            <div className="relative">
              <div 
                ref={carouselRef}
                className="overflow-hidden rounded-2xl cursor-pointer group"
                style={{
                  background: `${colors.background}80`,
                  border: `1px solid ${colors.accentDark}40`,
                  touchAction: 'pan-x pan-y',
                }}
                onClick={() => partnerStores[currentSlide] && handleStoreCardClick(partnerStores[currentSlide].id)}
              >
                <div className="relative aspect-[4/3] sm:aspect-[16/9]">
                  <AnimatePresence mode="wait">
                    {partnerStores[currentSlide] && (
                      <motion.div
                        key={partnerStores[currentSlide].id}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0"
                      >
                        <img
                          src={partnerStores[currentSlide].image_urls?.[0] || ''}
                          alt={partnerStores[currentSlide].name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        
                        {/* Dark overlay */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(to top, ${colors.background} 0%, ${colors.background}60 40%, transparent 100%)`,
                          }}
                        />
                        
                        {/* Store name - top left */}
                        <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
                          <h3 
                            className="text-xl sm:text-2xl md:text-3xl font-bold"
                            style={{
                              color: colors.text,
                              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                            }}
                          >
                            {partnerStores[currentSlide].name}
                          </h3>
                        </div>

                        {/* Tap to view hint - bottom center */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6">
                          <motion.span 
                            className="text-sm font-medium px-4 py-2.5 rounded-full flex items-center gap-2"
                            style={{
                              background: `${colors.accent}25`,
                              color: colors.accent,
                              border: `1px solid ${colors.accent}50`,
                              backdropFilter: 'blur(8px)',
                            }}
                            whileHover={{ scale: 1.05 }}
                          >
                            <ChevronRight className="w-4 h-4" />
                            {language === 'ja' ? 'タップして詳細を見る' : 'Tap to view details'}
                          </motion.span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  background: `${colors.background}E6`,
                  border: `1px solid ${colors.accentDark}60`,
                  backdropFilter: 'blur(10px)',
                }}
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: colors.text }} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  background: `${colors.background}E6`,
                  border: `1px solid ${colors.accentDark}60`,
                  backdropFilter: 'blur(10px)',
                }}
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: colors.text }} />
              </button>

              {/* Dots Indicator */}
              <div className="flex justify-center gap-2 mt-6">
                {partnerStores.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      background: currentSlide === index ? colors.accent : `${colors.text}30`,
                      transform: currentSlide === index ? 'scale(1.4)' : 'scale(1)',
                      boxShadow: currentSlide === index ? `0 0 10px ${colors.accent}60` : 'none',
                    }}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Map CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mt-10"
            >
              <Button
                onClick={handleMapClick}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all hover:scale-105 min-h-[48px]"
                style={{
                  background: `${colors.accent}15`,
                  border: `1px solid ${colors.accentDark}`,
                  color: colors.accent,
                }}
              >
                <MapPin className="w-5 h-5" />
                {language === 'ja' ? 'すべての加盟店を見る' : 'View All Partner Stores'}
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== CTA Section ===== */}
      <section className="relative py-28 px-4 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `radial-gradient(ellipse at center, ${colors.accent}12 0%, transparent 50%)`,
          }}
        />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="inline-block mb-6"
              initial={{ width: 0 }}
              whileInView={{ width: 80 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="h-px" style={{ background: colors.accent }} />
            </motion.div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6" style={{ color: colors.text }}>
              {t('cta.title')}
            </h2>
            <p className="text-lg sm:text-xl mb-10" style={{ color: colors.textMuted }}>
              {t('cta.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-full"
                style={{ boxShadow: `0 0 50px ${colors.accent}40` }}
              >
                <Button
                  size="lg"
                  onClick={handleMapClick}
                  className="text-xl px-12 py-7 rounded-full font-semibold"
                  style={{
                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
                    color: colors.background,
                  }}
                >
                  <MapPin className="w-6 h-6 mr-3" />
                  {t('cta.button')}
                </Button>
              </motion.div>

              <a
                href="https://forms.gle/18LmBfyJAJ1txmF56"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-base px-8 py-6 rounded-full font-medium border transition-all hover:scale-105"
                  style={{
                    borderColor: colors.accentDark,
                    color: colors.textMuted,
                    background: `${colors.accent}05`,
                  }}
                >
                  {t('cta.recruiting_stores')}
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer
        className="py-12 px-4"
        style={{
          background: colors.surface,
          borderTop: `1px solid ${colors.accentDark}30`,
        }}
      >
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-center mb-8">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
              alt="NIKENME+"
              className="h-12 w-auto object-contain opacity-70"
            />
          </div>

          <nav className="grid grid-cols-2 gap-4 sm:gap-6 max-w-md mx-auto mb-8">
            {footerLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link
                  key={index}
                  href={link.href}
                  className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 min-h-[56px] group"
                  style={{
                    background: `${colors.background}60`,
                    border: `1px solid ${colors.accentDark}30`,
                  }}
                >
                  <Icon className="w-5 h-5 transition-colors" style={{ color: colors.accent }} />
                  <span 
                    className="text-base font-medium transition-colors"
                    style={{ color: colors.textMuted }}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="text-center">
            <p className="text-sm mb-2" style={{ color: colors.textSubtle }}>
              {t('footer.copyright')}
            </p>
            <p
              className="text-lg font-bold"
              style={{ color: colors.accent }}
            >
              いますぐ、2軒目へ
            </p>
          </div>
        </div>
      </footer>

      {/* ===== Location Permission Modal（ローディング状態追加） ===== */}
      <CustomModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title={t('modal.location_title')}
        description={t('modal.location_desc')}
        showCloseButton={false}
      >
        <div className="space-y-4">
          {locationPermission === 'denied' && (
            <div 
              className="p-3 rounded-lg text-sm"
              style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171' }}
            >
              {t('modal.location_error')}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => handleLocationPermission(true)}
              disabled={locationPermission === 'loading'}
              className="w-full py-6 text-lg font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
                color: colors.background,
                boxShadow: `0 0 30px ${colors.accent}30`,
              }}
            >
              {locationPermission === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {language === 'ja' ? '位置情報を取得中...' : 'Getting location...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {t('modal.location_allow')}
                </>
              )}
            </Button>
            <Button
              onClick={() => handleLocationPermission(false)}
              disabled={locationPermission === 'loading'}
              variant="outline"
              className="w-full py-6 text-lg font-medium rounded-xl disabled:opacity-50"
              style={{
                border: `1px solid ${colors.accentDark}`,
                color: colors.textMuted,
              }}
            >
              {t('modal.location_deny')}
            </Button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}