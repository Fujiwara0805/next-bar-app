'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomModal } from '@/components/ui/custom-modal';
import { useLanguage } from '@/lib/i18n/context';

export default function LandingPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<'granted' | 'denied' | 'prompt'>('prompt');

  const features = [
    {
      icon: MapPin,
      title: t('features.feature1_title'),
      description: t('features.feature1_desc'),
    },
    {
      icon: Store,
      title: t('features.feature2_title'),
      description: t('features.feature2_desc'),
    },
    {
      icon: Navigation,
      title: t('features.feature3_title'),
      description: t('features.feature3_desc'),
    },
  ];

  const menuItems = [
    {
      icon: FileText,
      label: t('menu.terms'),
      href: '/terms',
    },
    {
      icon: Shield,
      label: t('menu.privacy'),
      href: '/privacy',
    },
    {
      icon: HelpCircle,
      label: t('menu.faq'),
      href: '/faq',
    },
    {
      icon: FileText,
      label: t('menu.release_notes'),
      href: '/release-notes',
    },
    {
      icon: Globe,
      label: t('menu.language'),
      href: '/language-settings',
    },
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
            console.log('位置情報を保存しました:', location);

            setShowLocationModal(false);
            router.push('/map');
          },
          (error) => {
            console.error('位置情報の取得に失敗しました:', error);
            setLocationPermission('denied');

            let errorMessage = t('modal.location_error');
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = t('modal.location_permission_denied');
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = t('modal.location_unavailable');
                break;
              case error.TIMEOUT:
                errorMessage = t('modal.location_timeout');
                break;
            }

            alert(errorMessage + ' デフォルトの位置で表示します。');

            const defaultLocation = {
              lat: 35.6812,
              lng: 139.7671,
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
        alert('お使いのブラウザは位置情報に対応していません');

        const defaultLocation = {
          lat: 35.6812,
          lng: 139.7671,
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
        lat: 35.6812,
        lng: 139.7671,
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
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b safe-top">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* メニュー */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMenu(!showMenu)}
            className="relative z-50"
          >
            {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>

          {/* 中央ロゴ */}
          <div className="hidden sm:flex flex-col items-center">
            <span className="text-xs tracking-[0.25em] uppercase text-muted-foreground font-semibold">
              NIKENME+
            </span>
            <span className="text-sm font-bold text-foreground">
              {t('header.tagline')}
            </span>
          </div>

          {/* 右側：店舗ログイン */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm border-2 font-semibold"
              >
                {t('header.store_login')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 言語切り替えボタン（右下固定） */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="lg"
            onClick={handleLanguageToggle}
            className="rounded-lg px-4 py-2 shadow-lg bg-white hover:bg-gray-100 border border-gray-300"
            title={language === 'ja' ? 'Switch to English' : '日本語に切り替え'}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-base font-bold text-gray-700">
                {language === 'ja' ? '日本語' : 'English'}
              </span>
              <span className="text-xs font-normal text-gray-500">
                {language === 'ja' ? '言語設定' : 'Language'}
              </span>
            </div>
          </Button>
        </motion.div>
      </motion.div>

      {/* サイドメニュー */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* パネル */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-card border-r z-40 overflow-y-auto safe-top"
            >
              <div className="p-6 pt-20">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-card-foreground mb-2">
                    {t('menu.title')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('menu.subtitle')}
                  </p>
                </div>

                <nav className="space-y-2">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-3 p-4 rounded-lg hover:bg-accent transition-colors"
                        >
                          <Icon className="w-5 h-5 text-primary" />
                          <span className="font-medium text-card-foreground">
                            {item.label}
                          </span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                <div className="mt-12 pt-6 border-t">
                  <p className="text-xs text-muted-foreground text-center">
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

      {/* ヒーローセクション */}
      <section className="relative pt-20 sm:pt-28 pb-14 sm:pb-20 px-4 overflow-hidden">
        {/* 背景画像 */}
        <div className="absolute inset-0 -z-10">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/12_hotel_bar_t3ti2i.jpg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="container mx-auto max-w-6xl relative">
          {/* ロゴ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 sm:mb-12"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex justify-center mb-6 sm:mb-8"
            >
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                alt="NIKENME+"
                className="h-24 sm:h-32 md:h-40 w-auto object-contain"
              />
            </motion.div>

            <div className="inline-flex items-center gap-2 px-4 py-1 mb-4 rounded-full bg-white/10 border border-white/30">
              <span className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] text-white/70 uppercase">
                NIGHT SPOT MAP
              </span>
              <span className="text-xs sm:text-sm text-white/80 font-medium">
                {t('hero.badge')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4 sm:mb-6 text-white leading-tight tracking-tight">
              {t('hero.title')}
              <br />
              <span className="text-white/90">{t('hero.title_app')}</span>
            </h1>

            <p className="text-base sm:text-xl md:text-2xl text-white/90 mb-6 sm:mb-8 max-w-3xl mx-auto px-2 font-semibold leading-relaxed">
              {t('hero.subtitle')}
              <br />
              {t('hero.subtitle2')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto text-base sm:text-lg px-7 sm:px-9 text-foreground font-bold flex items-center justify-center gap-2"
                onClick={handleMapClick}
              >
                {t('hero.cta')}
              </Button>
               {/* 加盟店募集中ボタン（同じ大きさ・縦に並ぶ） */}
  <a
    href="https://forms.gle/18LmBfyJAJ1txmF56"
    target="_blank"
    rel="noopener noreferrer"
    className="w-full sm:w-auto"
  >
    <Button
      size="lg"
      variant="outline"
      className="w-full sm:w-auto text-base sm:text-lg px-7 sm:px-9 font-bold flex items-center justify-center gap-2"
    >
      {t('cta.recruiting_stores')}
    </Button>
  </a>
            </div>
          </motion.div>

          {/* デモスクリーン */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black/40"
          >
            <div className="relative aspect-video">
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761800365/79FA3ECA-EEF6-4627-808B-E157EA37FBF4_1_201_a_atzbik.jpg"
                alt="アプリのデモ画面"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/65 flex justify中心 items-end pb-7 pt-10">
                <p className="text-white text-lg sm:text-2xl md:text-3xl font-bold text-center px-4">
                  {t('hero.demo_text')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 機能セクション */}
      <section className="relative py-14 sm:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/08_night_view_lounge_vdhksc.jpg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/80" />
        </div>

        <div className="container mx-auto max-w-6xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 sm:mb-14"
          >
            <p className="inline-block px-4 py-1 mb-3 text-[11px] sm:text-xs tracking-[0.25em] font-semibold text-white/70 border border-white/30 rounded-full uppercase">
              Features
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3 text-white tracking-tight">
              {t('features.title')}
            </h2>
            <p className="text-sm sm:text-lg text-white/85 font-semibold max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-7">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                >
                  <Card className="p-5 sm:p-6 h-full bg-zinc-900/90 border border-white/15 hover:border-primary/60 hover:shadow-xl transition-all duration-200">
                    <div className="flex flex-col items-start text-left">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/5 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-sm sm:text-base text-white/80 font-medium leading-relaxed">
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

      {/* 使い方セクション */}
      <section className="relative py-14 sm:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/01_dark_bar_counter_tfsqjd.jpg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/80" />
        </div>

        <div className="container mx-auto max-w-6xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 sm:mb-14"
          >
            <p className="inline-block px-4 py-1 mb-3 text-[11px] sm:text-xs tracking-[0.25em] font-semibold text-white/70 border border-white/30 rounded-full uppercase">
              How to use
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-3 text-white tracking-tight">
              {t('how_to.title')}
            </h2>
            <p className="text-sm sm:text-lg text-white/85 font-semibold max-w-2xl mx-auto">
              {t('how_to.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {[
              {
                step: '1',
                title: t('how_to.step1_title'),
                description: t('how_to.step1_desc'),
                image:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/v1761800378/27F4F4F4-749D-4141-BEDC-5B93091BA278_1_102_o_juxfgv.jpg',
              },
              {
                step: '2',
                title: t('how_to.step2_title'),
                description: t('how_to.step2_desc'),
                image:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/v1761802358/%E5%90%8D%E7%A7%B0%E6%9C%AA%E8%A8%AD%E5%AE%9A%E3%81%AE%E3%83%86%E3%82%99%E3%82%B5%E3%82%99%E3%82%A4%E3%83%B3_ekfjbe.png',
              },
              {
                step: '3',
                title: t('how_to.step3_title'),
                description: t('how_to.step3_desc'),
                image:
                  'https://res.cloudinary.com/dz9trbwma/image/upload/v1763549853/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2025-11-19_19.56.23_slrq2t.png',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
              >
                <Card className="p-6 sm:p-7 h-full bg-zinc-900/90 border border-white/15">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-[#F5F5F5] text-lg sm:text-xl font-bold flex items-center justify-center shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">
                        {item.title}
                      </h3>
                      <p className="text-sm sm:text-base text-white/80 font-medium leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-lg overflow-hidden shadow-md max-w-[220px] mx-auto border border-white/10 bg-black">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA セクション */}
      <section className="relative py-14 sm:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/15_turquoise_bar_rk1rtx.jpg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="container mx-auto max-w-4xl text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-4 sm:mb-5 text-white">
              {t('cta.title')}
            </h2>
            <p className="text-sm sm:text-lg text-white/85 mb-6 sm:mb-8 font-semibold">
              {t('cta.subtitle')}
            </p>

            {/* 縦並びのCTAボタン群 */}
            <div className="flex flex-col gap-3 sm:gap-4 justify-center items-center">
              {/* マップを見るボタン */}
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto text-base sm:text-lg px-7 sm:px-9 text-foreground font-bold flex items-center justify-center gap-2"
                onClick={handleMapClick}
              >
                {t('cta.button')}
              </Button>

              {/* 加盟店募集中ボタン（同サイズ・縦に並ぶ） */}
              <a
                href="https://forms.gle/18LmBfyJAJ1txmF56"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-base sm:text-lg px-7 sm:px-9 font-bold flex items-center justify-center gap-2"
                >
                  加盟店募集中
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* フッター */}
      <footer className="py-8 sm:py-12 px-4 bg-[#12313B]">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                alt="NIKENME+"
                className="h-8 sm:h-10 w-auto object-contain filter brightness-0 invert"
              />
              <div className="hidden sm:block">
                <p className="text-xs text-[#F5F5F5]/80 font-semibold">
                  NIKENME+ / Night Spot Map
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-[#F5F5F5]/80 text-center md:text-right font-semibold">
              {t('footer.copyright')}
              <br />
              {t('footer.slogan')}
            </p>
          </div>
        </div>
      </footer>

      {/* 位置情報許可モーダル */}
      <CustomModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title={t('modal.location_title')}
        description={t('modal.location_desc')}
        showCloseButton={false}
      >
        <div className="space-y-4">
          {locationPermission === 'denied' && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs sm:text-sm">
              {t('modal.location_error')}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => handleLocationPermission(true)}
              className="w-full"
              size="lg"
            >
              {t('modal.location_allow')}
            </Button>
            <Button
              onClick={() => handleLocationPermission(false)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {t('modal.location_deny')}
            </Button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}