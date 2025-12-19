'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Clock,
  ChevronRight,
  Phone,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomModal } from '@/components/ui/custom-modal';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';

export default function LandingPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [showToast, setShowToast] = useState(false);

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

        // vacantの店舗があればトーストを表示
        if (data && data.length > 0) {
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }
      } catch (error) {
        console.error('Error checking vacant stores:', error);
      }
    };

    // Initial delay
    const initialTimer = setTimeout(checkVacantStores, 2000);
    // Repeat every 8 seconds
    const interval = setInterval(checkVacantStores, 8000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const features = [
    {
      icon: Zap,
      title: language === 'ja' ? '今すぐ入れる' : 'Instant Availability',
      titleEn: 'Instant Entry',
      description:
        language === 'ja'
          ? '待たずに入れるお店がすぐ分かります。'
          : 'Quickly discover spots with no wait time.',
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
      size: 'large', // Bento grid size
    },
    {
      icon: Radio,
      title: language === 'ja' ? 'リアルタイム情報' : 'Real-time Updates',
      titleEn: 'Live Status',
      description:
        language === 'ja'
          ? 'お店が更新する最新の空席情報をチェック。'
          : 'Check the latest availability updates from venues.',
      gradient: 'from-indigo-500/20 to-purple-500/20',
      iconColor: 'text-indigo-400',
      size: 'medium',
    },
    {
      icon: Navigation,
      title: language === 'ja' ? '現在地からの距離' : 'Distance Display',
      titleEn: 'Nearby',
      description:
        language === 'ja'
          ? 'あなたの場所からお店までの距離を表示。'
          : 'View distance from your current location.',
      gradient: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
      size: 'medium',
    },
  ];

  const menuItems = [
    { icon: FileText, label: t('menu.terms'), href: '/terms' },
    { icon: Shield, label: t('menu.privacy'), href: '/privacy' },
    { icon: HelpCircle, label: t('menu.faq'), href: '/faq' },
    { icon: FileText, label: t('menu.release_notes'), href: '/release-notes' },
  ];

  const handleMapClick = () => {
    setShowLocationModal(true);
  };

  const handleLocationPermission = async (allow: boolean) => {
    if (allow) {
      if (navigator.geolocation) {
        const options = {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
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
            router.push('/map');
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
              router.push('/map');
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
        router.push('/map');
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
      router.push('/map');
    }
  };

  const handleLanguageToggle = () => {
    const newLanguage = language === 'ja' ? 'en' : 'ja';
    setLanguage(newLanguage);
    window.location.reload();
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #050505 0%, #0F172A 50%, #050505 100%)',
      }}
    >
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
              className="flex items-center gap-3 px-4 py-3 rounded-full"
              style={{
                background: 'rgba(245,158,11,0.15)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(245,158,11,0.3)',
                boxShadow: '0 0 30px rgba(245,158,11,0.2)',
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-amber-400"
              />
              <span className="text-sm text-white/90 font-medium">
                空席のお店あり
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - Sticky & Glassmorphism */}
      <header
        className="fixed top-0 left-0 right-0 z-50 safe-top"
        style={{
          background: 'rgba(5,5,5,0.7)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
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
                className="text-lg font-bold tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                NIKENME+
              </span>
              <span
                className="hidden sm:inline-block text-[10px] px-2 py-1 rounded-full font-semibold tracking-wider"
                style={{
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  color: '#F59E0B',
                  textShadow: '0 0 10px rgba(245,158,11,0.5)',
                }}
              >
                NIGHT SPOT MAP
              </span>
            </motion.div>
          </div>

          {/* Right: Language Toggle, Store Login, Menu */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language Toggle */}
            <button
              onClick={handleLanguageToggle}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white/60 hover:text-white/90 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'ja' ? 'EN' : 'JP'}</span>
            </button>

            {/* Store Login */}
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold"
                style={{
                  borderColor: '#F59E0B',
                  color: '#F59E0B',
                }}
              >
                {t('header.store_login')}
              </Button>
            </Link>

            {/* Menu Button */}
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
                background: 'linear-gradient(180deg, #0F172A 0%, #050505 100%)',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="p-6 pt-20">
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-1">{t('menu.title')}</h2>
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
                          <Icon className="w-5 h-5 text-amber-400/70 group-hover:text-amber-400" />
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

      {/* Hero Section - Immersive */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 pb-20 px-4 overflow-hidden">
        {/* Background Map Visual */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: `url('https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/12_hotel_bar_t3ti2i.jpg')`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center top, transparent 0%, #050505 70%)',
            }}
          />
          {/* Animated map pins */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${10 + (i * 12) % 80}%`,
                  top: `${20 + (i * 17) % 60}%`,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: '#F59E0B',
                    boxShadow: '0 0 20px 5px rgba(245,158,11,0.4)',
                  }}
                />
              </motion.div>
            ))}
          </div>
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
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                alt="NIKENME+"
                className="h-28 sm:h-36 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 0 30px rgba(245,158,11,0.3))' }}
              />
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full"
              style={{
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
              }}
            >
              <span
                className="text-[10px] font-bold tracking-[0.3em] uppercase"
                style={{ color: '#818CF8' }}
              >
                NIGHT SPOT MAP
              </span>
            </motion.div>

            {/* H1 */}
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 leading-tight"
              style={{ color: '#FFFFFF' }}
            >
              夜の続きは、ここから
              <br />
              <span
                className="text-xl sm:text-2xl md:text-3xl font-medium"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                The Night Continues From Here
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg sm:text-xl md:text-2xl mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              大分の二軒目探しは NIKENME+。
              <br />
              次のお店を今すぐマップで探そう。
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {/* Primary CTA with Pulse */}
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(245,158,11,0.4)',
                    '0 0 40px rgba(245,158,11,0.6)',
                    '0 0 20px rgba(245,158,11,0.4)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="rounded-full"
              >
                <Button
                  size="lg"
                  onClick={handleMapClick}
                  className="text-lg px-10 py-6 rounded-full font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#050505',
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
                  className="text-base px-8 py-6 rounded-full font-medium border"
                  style={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.7)',
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
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
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
                      'linear-gradient(to top, rgba(5,5,5,0.9) 0%, transparent 50%)',
                  }}
                >
                  <p className="text-white text-xl sm:text-2xl md:text-3xl font-bold text-center px-4">
                    {t('hero.demo_text')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span
              className="inline-block text-xs font-semibold tracking-[0.3em] uppercase mb-4 px-4 py-2 rounded-full"
              style={{
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: '#818CF8',
              }}
            >
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
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
                  className={isLarge ? 'md:col-span-2 lg:col-span-1 lg:row-span-1' : ''}
                >
                  <Card
                    className="h-full p-6 sm:p-8 group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl bg-gradient-to-br ${feature.gradient}`}
                    />
                    <div className="relative z-10">
                      {/* Icon with live indicator for real-time */}
                      <div className="flex items-center gap-3 mb-5">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                          <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                        </div>
                        {feature.icon === Radio && (
                          <motion.div
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-2 h-2 rounded-full bg-emerald-400"
                          />
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">
                        {feature.titleEn}
                      </p>
                      <p className="text-white/60 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How to Use Section - Step Scroll */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span
              className="inline-block text-xs font-semibold tracking-[0.3em] uppercase mb-4 px-4 py-2 rounded-full"
              style={{
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.2)',
                color: '#F59E0B',
              }}
            >
              How to Use
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
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
              },
              {
                step: '02',
                icon: Store,
                title: t('how_to.step2_title'),
                titleEn: 'Details',
                description: t('how_to.step2_desc'),
                image:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/v1761802358/%E5%90%8D%E7%A7%B0%E6%9C%AA%E8%A8%AD%E5%AE%9A%E3%81%AE%E3%83%86%E3%82%99%E3%82%B5%E3%82%99%E3%82%A4%E3%83%B3_ekfjbe.png',
              },
              {
                step: '03',
                icon: Phone,
                title:
                  language === 'ja'
                    ? '自動音声で予約'
                    : 'Auto Voice Reservation',
                titleEn: 'Reserve',
                description:
                  language === 'ja'
                    ? '自動音声があなたの代わりに予約。10分・20分・30分後のキープを選択可能。'
                    : 'Auto-voice reserves for you. Choose 10, 20, or 30 minute hold.',
                image:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/v1763549853/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2025-11-19_19.56.23_slrq2t.png',
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
                    className="h-full overflow-hidden group"
                    style={{
                      background: item.highlight
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(99,102,241,0.1))'
                        : 'rgba(255,255,255,0.03)',
                      border: item.highlight
                        ? '1px solid rgba(245,158,11,0.3)'
                        : '1px solid rgba(255,255,255,0.08)',
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
                                ? 'linear-gradient(135deg, #F59E0B, #6366F1)'
                                : 'linear-gradient(135deg, #374151, #1F2937)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            {item.step}
                          </span>
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                          >
                            <Icon
                              className={`w-5 h-5 ${
                                item.highlight ? 'text-amber-400' : 'text-white/40'
                              }`}
                            />
                          </div>
                        </div>
                        {item.highlight && (
                          <span
                            className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider"
                            style={{
                              background: 'rgba(245,158,11,0.2)',
                              color: '#F59E0B',
                            }}
                          >
                            Killer Feature
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-3">
                        {item.titleEn}
                      </p>

                      {/* Description */}
                      <p className="text-white/60 leading-relaxed mb-6">
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

      {/* CTA Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(245,158,11,0.1) 0%, transparent 50%)',
          }}
        />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6">
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
                    '0 0 30px rgba(245,158,11,0.3)',
                    '0 0 60px rgba(245,158,11,0.5)',
                    '0 0 30px rgba(245,158,11,0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="rounded-full"
              >
                <Button
                  size="lg"
                  onClick={handleMapClick}
                  className="text-xl px-12 py-7 rounded-full font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#050505',
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
                  className="text-base px-8 py-6 rounded-full font-medium border"
                  style={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {t('cta.recruiting_stores')}
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-12 px-4"
        style={{
          background: 'linear-gradient(to top, #050505, #0F172A)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                alt="NIKENME+"
                className="h-10 w-auto object-contain opacity-80"
              />
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm text-white/50 mb-2">{t('footer.copyright')}</p>
              <p
                className="text-lg font-bold"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                いますぐ、2軒目へ
              </p>
            </div>
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
              className="w-full py-6 text-lg font-bold rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#050505',
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