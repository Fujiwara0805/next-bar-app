'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  MapPin,
  Store,
  Navigation,
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
  Footprints,
  MapPinned,
  ExternalLink,
  Building2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomModal } from '@/components/ui/custom-modal';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';

// 店舗データの型定義
interface PartnerStore {
  id: string;
  name: string;
  image_urls: string[] | null;
  website_url: string | null;
  description: string | null;
  vacancy_status: 'vacant' | 'moderate' | 'full' | 'closed';
}

export default function LandingPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [showToast, setShowToast] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [partnerStores, setPartnerStores] = useState<PartnerStore[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Parallax effect for hero
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 1.1]);

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
          // 画像があるストアのみフィルタリング
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

  // Toast notification - 空席のある店舗をチェック
  useEffect(() => {
    const checkVacantStores = async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, vacancy_status')
          .eq('vacancy_status', 'vacant')
          .limit(1);

        if (error) {
          console.error('Error checking vacant stores:', error);
          return;
        }

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
    }, 4000);
    return () => clearInterval(interval);
  }, [partnerStores.length]);

  const features = [
    {
      icon: Zap,
      title: language === 'ja' ? '今すぐ入れる' : 'Instant Availability',
      titleEn: 'Instant Entry',
      description:
        language === 'ja'
          ? '待たずに入れるお店がすぐ分かります。'
          : 'Quickly discover spots with no wait time.',
      gradient: 'from-amber-500/30 to-orange-600/30',
      iconColor: 'text-amber-400',
      glowColor: 'rgba(245,158,11,0.4)',
      size: 'large',
    },
    {
      icon: Radio,
      title: language === 'ja' ? 'リアルタイム情報' : 'Real-time Updates',
      titleEn: 'Live Status',
      description:
        language === 'ja'
          ? 'お店が更新する最新の空席情報をチェック。'
          : 'Check the latest availability updates from venues.',
      gradient: 'from-fuchsia-500/30 to-pink-600/30',
      iconColor: 'text-fuchsia-400',
      glowColor: 'rgba(217,70,239,0.4)',
      size: 'medium',
    },
    {
      icon: MapPinned,
      title: language === 'ja' ? '到着時間と距離' : 'Time & Distance',
      titleEn: 'Nearby',
      description:
        language === 'ja'
          ? 'お店までの徒歩時間と距離を同時に表示。'
          : 'View walking time and distance to venues.',
      gradient: 'from-cyan-500/30 to-blue-600/30',
      iconColor: 'text-cyan-400',
      glowColor: 'rgba(6,182,212,0.4)',
      size: 'medium',
    },
  ];

  const menuItems = [
    { icon: FileText, label: t('menu.terms'), href: '/terms' },
    { icon: Shield, label: t('menu.privacy'), href: '/privacy' },
    { icon: HelpCircle, label: t('menu.faq'), href: '/faq' },
    { icon: FileText, label: t('menu.release_notes'), href: '/release-notes' },
  ];

  // フッターリンク（2x2グリッド用）
  const footerLinks = [
    { icon: Building2, label: language === 'ja' ? '会社概要' : 'About Us', href: '/about' },
    { icon: FileText, label: language === 'ja' ? '利用規約' : 'Terms of Service', href: '/terms' },
    { icon: HelpCircle, label: language === 'ja' ? 'よくある質問' : 'FAQ', href: '/faq' },
    { icon: FileText, label: language === 'ja' ? 'リリースノート' : 'Release Notes', href: '/release-notes' },
  ];

  const handleMapClick = () => {
    setShowLocationModal(true);
  };

  // ✅ Task 1: Geolocation Timeout 修正
  const handleLocationPermission = async (allow: boolean) => {
    if (allow) {
      if (navigator.geolocation) {
        // 修正: 高精度モードを無効化し、キャッシュを許容
        const options = {
          enableHighAccuracy: false, // 取得速度とバッテリー持ちを優先
          timeout: 10000,            // 10秒待機
          maximumAge: 60000,         // 1分間のキャッシュを許容
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: Date.now(),
              accuracy: position.coords.accuracy,
            };

            setLocationPermission('granted');
            localStorage.setItem('userLocation', JSON.stringify(location));

            setShowLocationModal(false);
            router.push('/map?from=landing');
          },
          (error) => {
            console.error('位置情報の取得に失敗しました:', error);
            setLocationPermission('denied');

            const defaultLocation = {
              lat: 33.2382,
              lng: 131.6126,
              timestamp: Date.now(),
              isDefault: true,
            };
            localStorage.setItem('userLocation', JSON.stringify(defaultLocation));

            setTimeout(() => {
              setShowLocationModal(false);
              router.push('/map?from=landing');
            }, 1500);
          },
          options
        );
      } else {
        const defaultLocation = {
          lat: 33.2382,
          lng: 131.6126,
          timestamp: Date.now(),
          isDefault: true,
        };
        localStorage.setItem('userLocation', JSON.stringify(defaultLocation));

        setShowLocationModal(false);
        router.push('/map?from=landing');
      }
    } else {
      setLocationPermission('denied');

      const defaultLocation = {
        lat: 33.2382,
        lng: 131.6126,
        timestamp: Date.now(),
        isDefault: true,
      };
      localStorage.setItem('userLocation', JSON.stringify(defaultLocation));

      setShowLocationModal(false);
      router.push('/map?from=landing');
    }
  };

  const handleLanguageToggle = () => {
    const newLanguage = language === 'ja' ? 'en' : 'ja';
    setLanguage(newLanguage);
    window.location.reload();
  };

  const nextSlide = () => {
    if (partnerStores.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % partnerStores.length);
  };

  const prevSlide = () => {
    if (partnerStores.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + partnerStores.length) % partnerStores.length);
  };

  // 空席ステータスのラベルと色を取得
  const getVacancyStatusInfo = (status: PartnerStore['vacancy_status']) => {
    switch (status) {
      case 'vacant':
        return { label: '空席あり', labelEn: 'Available', color: '#22C55E', bgColor: 'rgba(34,197,94,0.25)' };
      case 'moderate':
        return { label: 'やや混雑', labelEn: 'Moderate', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.25)' };
      case 'full':
        return { label: '満席', labelEn: 'Full', color: '#EF4444', bgColor: 'rgba(239,68,68,0.25)' };
      case 'closed':
        return { label: '閉店中', labelEn: 'Closed', color: '#6B7280', bgColor: 'rgba(107,114,128,0.25)' };
      default:
        return { label: '不明', labelEn: 'Unknown', color: '#6B7280', bgColor: 'rgba(107,114,128,0.25)' };
    }
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #1a0a1f 30%, #0f1a2a 60%, #0a0a0f 100%)',
      }}
    >
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Neon glow orbs */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
            top: '-200px',
            right: '-200px',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(217,70,239,0.12) 0%, transparent 70%)',
            bottom: '20%',
            left: '-150px',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
            top: '40%',
            right: '-100px',
            filter: 'blur(50px)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />
      </div>

      {/* Toast Notification */}
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
                background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,70,239,0.15))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(245,158,11,0.4)',
                boxShadow: '0 0 40px rgba(245,158,11,0.3), inset 0 0 20px rgba(245,158,11,0.1)',
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: '#F59E0B',
                  boxShadow: '0 0 10px #F59E0B',
                }}
              />
              <span className="text-sm text-white font-bold tracking-wide">
                空席のお店あり
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Neon Glassmorphism */}
      <header
        className="fixed top-0 left-0 right-0 z-50 safe-top"
        style={{
          background: 'rgba(10,10,15,0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(245,158,11,0.15)',
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Logo + Badge */}
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <span
                className="text-lg font-black tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #D946EF, #06B6D4)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 30px rgba(245,158,11,0.5)',
                }}
              >
                NIKENME+
              </span>
              <span
                className="hidden sm:inline-block text-[9px] px-2 py-1 rounded-full font-bold tracking-[0.15em] uppercase"
                style={{
                  background: 'linear-gradient(135deg, rgba(217,70,239,0.2), rgba(6,182,212,0.2))',
                  border: '1px solid rgba(217,70,239,0.4)',
                  color: '#D946EF',
                  boxShadow: '0 0 15px rgba(217,70,239,0.3)',
                }}
              >
                Night Spot
              </span>
            </motion.div>
          </div>

          {/* Right: Language Toggle, Store Login, Menu */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleLanguageToggle}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white/60 hover:text-white/90 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'ja' ? 'EN' : 'JP'}</span>
            </button>

            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold transition-all duration-300 hover:scale-105"
                style={{
                  borderColor: 'rgba(245,158,11,0.5)',
                  color: '#F59E0B',
                  background: 'rgba(245,158,11,0.05)',
                  boxShadow: '0 0 15px rgba(245,158,11,0.2)',
                }}
              >
                {t('header.store_login')}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMenu(!showMenu)}
              className="text-white/60 hover:text-white/90 hover:bg-white/5"
            >
              {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.85)' }}
              onClick={() => setShowMenu(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 z-50 overflow-y-auto"
              style={{
                background: 'linear-gradient(180deg, #1a0a1f 0%, #0a0a0f 100%)',
                borderLeft: '1px solid rgba(217,70,239,0.2)',
              }}
            >
              <div className="p-6 pt-20">
                <div className="mb-8">
                  <h2 className="text-xl font-black text-white mb-1">{t('menu.title')}</h2>
                  <p className="text-sm text-white/50">{t('menu.subtitle')}</p>
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
                          className="flex items-center gap-3 p-4 rounded-lg hover:bg-white/5 transition-colors group"
                        >
                          <Icon className="w-5 h-5 text-fuchsia-400/70 group-hover:text-fuchsia-400" />
                          <span className="text-white/70 group-hover:text-white font-medium">
                            {item.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-white/30 ml-auto" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                <div className="mt-12 pt-6 border-t border-white/10">
                  <p className="text-xs text-white/30 text-center">
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

      {/* Hero Section - Immersive Neon */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 pb-20 px-4 overflow-hidden">
        {/* Background Visual */}
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ opacity: heroOpacity, scale: heroScale }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/12_hotel_bar_t3ti2i.jpg')`,
              opacity: 0.35,
            }}
          />
          {/* Gradient overlays */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center top, transparent 0%, rgba(10,10,15,0.8) 50%, #0a0a0f 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, rgba(26,10,31,0.5) 50%, #0a0a0f 100%)',
            }}
          />
        </motion.div>

        {/* Animated neon lights */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${5 + (i * 8) % 90}%`,
                top: `${15 + (i * 13) % 70}%`,
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.5, 1],
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.4,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: i % 3 === 0 ? '#F59E0B' : i % 3 === 1 ? '#D946EF' : '#06B6D4',
                  boxShadow: `0 0 20px 8px ${i % 3 === 0 ? 'rgba(245,158,11,0.5)' : i % 3 === 1 ? 'rgba(217,70,239,0.5)' : 'rgba(6,182,212,0.5)'}`,
                }}
              />
            </motion.div>
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
                  animate={{
                    opacity: [0.4, 0.8, 0.4],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{
                    background: 'radial-gradient(circle, rgba(245,158,11,0.4) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                  }}
                />
                <img
                  src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                  alt="NIKENME+"
                  className="relative h-28 sm:h-36 w-auto object-contain"
                  style={{ filter: 'drop-shadow(0 0 40px rgba(245,158,11,0.5))' }}
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
                background: 'linear-gradient(135deg, rgba(217,70,239,0.15), rgba(6,182,212,0.15))',
                border: '1px solid rgba(217,70,239,0.3)',
                boxShadow: '0 0 20px rgba(217,70,239,0.2)',
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-fuchsia-400"
              />
              <span
                className="text-[10px] font-bold tracking-[0.3em] uppercase"
                style={{ color: '#D946EF' }}
              >
                Night Spot Map
              </span>
            </motion.div>

            {/* H1 */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-6 leading-tight">
              <span
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F59E0B 50%, #D946EF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                夜の続きは、ここから
              </span>
              <br />
              <span
                className="text-lg sm:text-xl md:text-2xl font-medium"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                The Night Continues From Here
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg sm:text-xl md:text-2xl mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              大分の二軒目探しは <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>NIKENME+</span>
              <br />
              次のお店を今すぐマップで探そう。
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {/* Primary CTA with Neon Pulse */}
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.2)',
                    '0 0 40px rgba(245,158,11,0.6), 0 0 80px rgba(245,158,11,0.3)',
                    '0 0 20px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.2)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="rounded-full"
              >
                <Button
                  size="lg"
                  onClick={handleMapClick}
                  className="text-lg px-10 py-6 rounded-full font-black transition-transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#0a0a0f',
                  }}
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  {t('hero.cta')}
                </Button>
              </motion.div>

              {/* Secondary CTA */}
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
                    borderColor: 'rgba(217,70,239,0.4)',
                    color: 'rgba(255,255,255,0.8)',
                    background: 'rgba(217,70,239,0.05)',
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
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(245,158,11,0.2)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 40px rgba(245,158,11,0.1)',
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
                    background:
                      'linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(26,10,31,0.5) 30%, transparent 60%)',
                  }}
                >
                  <p className="text-white text-xl sm:text-2xl md:text-3xl font-black text-center px-4">
                    {t('hero.demo_text')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Neon Bento Grid */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span
              className="inline-block text-xs font-bold tracking-[0.3em] uppercase mb-4 px-4 py-2 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(217,70,239,0.15), rgba(6,182,212,0.15))',
                border: '1px solid rgba(217,70,239,0.3)',
                color: '#D946EF',
                boxShadow: '0 0 20px rgba(217,70,239,0.2)',
              }}
            >
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto">
              2軒目のお店探しをもっとスマートに
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isLarge = feature.size === 'large';

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={isLarge ? 'md:col-span-2 lg:col-span-1' : ''}
                >
                  <Card
                    className="h-full p-6 sm:p-8 group cursor-pointer transition-all duration-500 hover:scale-[1.02] relative overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Hover glow effect */}
                    <motion.div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${feature.gradient}`}
                      style={{ filter: 'blur(40px)' }}
                    />
                    <div className="relative z-10">
                      {/* Icon */}
                      <div className="flex items-center gap-3 mb-5">
                        <motion.div
                          className="w-14 h-14 rounded-xl flex items-center justify-center"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            boxShadow: `0 0 20px ${feature.glowColor}`,
                          }}
                          whileHover={{ scale: 1.1 }}
                        >
                          <Icon className={`w-7 h-7 ${feature.iconColor}`} />
                        </motion.div>
                        {feature.icon === Radio && (
                          <motion.div
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-2.5 h-2.5 rounded-full bg-emerald-400"
                            style={{ boxShadow: '0 0 10px #34D399' }}
                          />
                        )}
                      </div>

                      <h3 className="text-xl font-black text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-white/40 mb-3 uppercase tracking-wider font-bold">
                        {feature.titleEn}
                      </p>
                      <p className="text-white/60 leading-relaxed text-base">
                        {feature.description}
                      </p>

                      {/* Distance + Time display example for the third feature */}
                      {feature.icon === MapPinned && (
                        <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(6,182,212,0.1)' }}>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Footprints className="w-4 h-4 text-cyan-400" />
                              <span className="text-white/80 font-bold">徒歩 5分</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Navigation className="w-4 h-4 text-cyan-400" />
                              <span className="text-white/80 font-bold">350m</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span
              className="inline-block text-xs font-bold tracking-[0.3em] uppercase mb-4 px-4 py-2 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,70,239,0.15))',
                border: '1px solid rgba(245,158,11,0.3)',
                color: '#F59E0B',
                boxShadow: '0 0 20px rgba(245,158,11,0.2)',
              }}
            >
              How to Use
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              {t('how_to.title')}
            </h2>
            <p className="text-lg text-white/60">{t('how_to.subtitle')}</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                step: '01',
                icon: MapPin,
                title: t('how_to.step1_title'),
                titleEn: 'Check',
                description: t('how_to.step1_desc'),
                image:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/v1761800378/27F4F4F4-749D-4141-BEDC-5B93091BA278_1_102_o_juxfgv.jpg',
                glowColor: 'rgba(6,182,212,0.3)',
              },
              {
                step: '02',
                icon: Store,
                title: t('how_to.step2_title'),
                titleEn: 'Details',
                description: t('how_to.step2_desc'),
                image:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/v1761802358/%E5%90%8D%E7%A7%B0%E6%9C%AA%E8%A8%AD%E5%AE%9A%E3%81%AE%E3%83%86%E3%82%99%E3%82%B5%E3%82%99%E3%82%A4%E3%83%B3_ekfjbe.png',
                glowColor: 'rgba(217,70,239,0.3)',
              },
              {
                step: '03',
                icon: Phone,
                title: language === 'ja' ? '席をキープする' : 'Keep Your Seat',
                titleEn: 'Reserve',
                description:
                  language === 'ja'
                    ? '自動音声があなたの代わりに予約。10分・20分・30分後のキープを選択可能。'
                    : 'Auto-voice reserves for you. Choose 10, 20, or 30 minute hold.',
                image:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/v1763549853/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2025-11-19_19.56.23_slrq2t.png',
                highlight: true,
                glowColor: 'rgba(245,158,11,0.4)',
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
                      background: item.highlight
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,70,239,0.08))'
                        : 'rgba(255,255,255,0.02)',
                      border: item.highlight
                        ? '1px solid rgba(245,158,11,0.4)'
                        : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: item.highlight ? `0 0 40px ${item.glowColor}` : 'none',
                    }}
                  >
                    <div className="p-6 sm:p-8">
                      {/* Step number and icon */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span
                            className="text-4xl font-black"
                            style={{
                              background: item.highlight
                                ? 'linear-gradient(135deg, #F59E0B, #D946EF)'
                                : 'linear-gradient(135deg, #4B5563, #374151)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            {item.step}
                          </span>
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              boxShadow: `0 0 15px ${item.glowColor}`,
                            }}
                          >
                            <Icon
                              className={`w-5 h-5 ${
                                item.highlight ? 'text-amber-400' : 'text-white/40'
                              }`}
                            />
                          </div>
                        </div>
                        {item.highlight && (
                          <motion.span
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider"
                            style={{
                              background: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(217,70,239,0.3))',
                              color: '#F59E0B',
                              boxShadow: '0 0 15px rgba(245,158,11,0.3)',
                            }}
                          >
                            Killer Feature
                          </motion.span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-black text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-3 font-bold">
                        {item.titleEn}
                      </p>

                      {/* Description */}
                      <p className="text-white/60 leading-relaxed mb-6 text-base">
                        {item.description}
                      </p>

                      {/* Image */}
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.08)',
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

      {/* ✅ Task 2: Partner Stores Section - 刷新されたカルーセルUI */}
      {partnerStores.length > 0 && (
        <section className="relative py-20 px-4 overflow-hidden">
          {/* Background glow */}
          <div
            className="absolute inset-0 z-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(217,70,239,0.08) 0%, transparent 50%)',
            }}
          />

          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <span
                className="inline-block text-xs font-bold tracking-[0.3em] uppercase mb-4 px-4 py-2 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(217,70,239,0.15), rgba(245,158,11,0.15))',
                  border: '1px solid rgba(217,70,239,0.3)',
                  color: '#D946EF',
                  boxShadow: '0 0 20px rgba(217,70,239,0.2)',
                }}
              >
                Partner Stores
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                {language === 'ja' ? '加盟店の様子' : 'Partner Store Gallery'}
              </h2>
              <p className="text-lg text-white/60 max-w-xl mx-auto">
                {language === 'ja' 
                  ? 'NIKENME+に参加しているお店の雰囲気をチェック' 
                  : 'Check out the atmosphere of stores on NIKENME+'}
              </p>
            </motion.div>

            {/* ✅ 刷新されたカルーセル - Instagram風カードUI */}
            <div className="relative">
              {/* Carousel Container with touch-action fix */}
              <div 
                ref={carouselRef}
                className="overflow-hidden rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(217,70,239,0.2)',
                  touchAction: 'pan-x pan-y', // ✅ Task 1: Google Maps Intervention 修正
                }}
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
                        {/* 背景画像 */}
                        <img
                          src={partnerStores[currentSlide].image_urls?.[0] || ''}
                          alt={partnerStores[currentSlide].name}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* ✅ ダークオーバーレイ */}
                        <div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.2) 100%)',
                          }}
                        />
                        
                        {/* ✅ 左上: 店舗名（太字・視認性重視） */}
                        <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
                          <h3 
                            className="text-xl sm:text-2xl md:text-3xl font-black text-white drop-shadow-lg"
                            style={{
                              textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
                            }}
                          >
                            {partnerStores[currentSlide].name}
                          </h3>
                        </div>
                        
                        {/* ✅ 右下: 空席ステータスバッジ */}
                        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
                          <div
                            className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-full flex items-center gap-2.5 min-h-[44px]"
                            style={{
                              background: getVacancyStatusInfo(partnerStores[currentSlide].vacancy_status).bgColor,
                              border: `2px solid ${getVacancyStatusInfo(partnerStores[currentSlide].vacancy_status).color}`,
                              backdropFilter: 'blur(10px)',
                            }}
                          >
                            <motion.div
                              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                              className="w-3 h-3 rounded-full"
                              style={{
                                background: getVacancyStatusInfo(partnerStores[currentSlide].vacancy_status).color,
                                boxShadow: `0 0 12px ${getVacancyStatusInfo(partnerStores[currentSlide].vacancy_status).color}`,
                              }}
                            />
                            <span
                              className="text-base sm:text-lg font-black"
                              style={{ color: getVacancyStatusInfo(partnerStores[currentSlide].vacancy_status).color }}
                            >
                              {language === 'ja' 
                                ? getVacancyStatusInfo(partnerStores[currentSlide].vacancy_status).label
                                : getVacancyStatusInfo(partnerStores[currentSlide].vacancy_status).labelEn
                              }
                            </span>
                          </div>
                        </div>
                        
                        {/* ✅ 左下: Webサイトリンク（タップ領域44px以上確保） */}
                        {partnerStores[currentSlide].website_url && (
                          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                            <a
                              href={partnerStores[currentSlide].website_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-full text-base font-bold transition-all hover:scale-105 active:scale-95 min-h-[44px] min-w-[44px]"
                              style={{
                                background: 'rgba(6,182,212,0.2)',
                                border: '2px solid rgba(6,182,212,0.6)',
                                color: '#22D3EE',
                                backdropFilter: 'blur(10px)',
                              }}
                            >
                              <ExternalLink className="w-5 h-5" />
                              <span className="hidden sm:inline">
                                {language === 'ja' ? '詳細を見る' : 'View Details'}
                              </span>
                            </a>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Navigation Arrows - タップ領域確保 (44px以上) */}
              <button
                onClick={prevSlide}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  background: 'rgba(10,10,15,0.85)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(10px)',
                }}
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                style={{
                  background: 'rgba(10,10,15,0.85)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(10px)',
                }}
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </button>

              {/* Dots Indicator */}
              <div className="flex justify-center gap-2 mt-6">
                {partnerStores.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className="w-3 h-3 rounded-full transition-all duration-300"
                    style={{
                      background: currentSlide === index 
                        ? 'linear-gradient(135deg, #F59E0B, #D946EF)' 
                        : 'rgba(255,255,255,0.25)',
                      boxShadow: currentSlide === index ? '0 0 12px rgba(245,158,11,0.6)' : 'none',
                      transform: currentSlide === index ? 'scale(1.4)' : 'scale(1)',
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all hover:scale-105 min-h-[48px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(217,70,239,0.2), rgba(245,158,11,0.2))',
                  border: '1px solid rgba(217,70,239,0.4)',
                  color: '#D946EF',
                  boxShadow: '0 0 20px rgba(217,70,239,0.2)',
                }}
              >
                <MapPin className="w-5 h-5" />
                {language === 'ja' ? 'すべての加盟店を見る' : 'View All Partner Stores'}
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.15) 0%, transparent 50%)',
          }}
        />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6">
              {t('cta.title')}
            </h2>
            <p className="text-lg sm:text-xl text-white/60 mb-10">
              {t('cta.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {/* Big Glowing CTA */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  boxShadow: [
                    '0 0 30px rgba(245,158,11,0.4), 0 0 60px rgba(245,158,11,0.2)',
                    '0 0 60px rgba(245,158,11,0.6), 0 0 100px rgba(245,158,11,0.3)',
                    '0 0 30px rgba(245,158,11,0.4), 0 0 60px rgba(245,158,11,0.2)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="rounded-full"
              >
                <Button
                  size="lg"
                  onClick={handleMapClick}
                  className="text-xl px-12 py-7 rounded-full font-black"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#0a0a0f',
                  }}
                >
                  <MapPin className="w-6 h-6 mr-3" />
                  {t('cta.button')}
                </Button>
              </motion.div>

              {/* Secondary */}
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
                    borderColor: 'rgba(217,70,239,0.4)',
                    color: 'rgba(255,255,255,0.8)',
                    background: 'rgba(217,70,239,0.05)',
                  }}
                >
                  {t('cta.recruiting_stores')}
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ✅ Task 3: 刷新されたフッター - 2x2グリッドレイアウト */}
      <footer
        className="py-12 px-4"
        style={{
          background: 'linear-gradient(to top, #0a0a0f, #1a0a1f)',
          borderTop: '1px solid rgba(217,70,239,0.1)',
        }}
      >
        <div className="container mx-auto max-w-6xl">
          {/* ロゴ */}
          <div className="flex justify-center mb-8">
            <img
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
              alt="NIKENME+"
              className="h-12 w-auto object-contain opacity-80"
            />
          </div>

          {/* ✅ 2x2 グリッドレイアウト */}
          <nav className="grid grid-cols-2 gap-4 sm:gap-6 max-w-md mx-auto mb-8">
            {footerLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link
                  key={index}
                  href={link.href}
                  className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl transition-all hover:scale-105 active:scale-95 min-h-[56px] group"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Icon className="w-5 h-5 text-fuchsia-400/70 group-hover:text-fuchsia-400 transition-colors" />
                  <span className="text-base text-white/70 group-hover:text-white font-medium transition-colors">
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* コピーライト & タグライン */}
          <div className="text-center">
            <p className="text-sm text-white/50 mb-2">{t('footer.copyright')}</p>
            <p
              className="text-lg font-black"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D946EF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              いますぐ、2軒目へ
            </p>
          </div>
        </div>
      </footer>

      {/* Location Permission Modal */}
      <CustomModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title={t('modal.location_title')}
        description={t('modal.location_desc')}
        showCloseButton={false}
      >
        <div className="space-y-4">
          {locationPermission === 'denied' && (
            <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">
              {t('modal.location_error')}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => handleLocationPermission(true)}
              className="w-full py-6 text-lg font-black rounded-xl transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#0a0a0f',
                boxShadow: '0 0 30px rgba(245,158,11,0.3)',
              }}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {t('modal.location_allow')}
            </Button>
            <Button
              onClick={() => handleLocationPermission(false)}
              variant="outline"
              className="w-full py-6 text-lg font-bold rounded-xl"
              style={{
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.6)',
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