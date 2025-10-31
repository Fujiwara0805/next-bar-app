'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Store, ArrowRight, Navigation, Menu, X, FileText, Shield, HelpCircle, Globe, Languages } from 'lucide-react';
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
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

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
        // 位置情報取得のオプション
        const options = {
          enableHighAccuracy: true, // 高精度モード
          timeout: 10000, // 10秒でタイムアウト
          maximumAge: 0 // キャッシュを使用しない
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            // 位置情報取得成功
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: Date.now(), // タイムスタンプを追加
              accuracy: position.coords.accuracy // 精度情報も保存
            };
            
            setLocationPermission('granted');
            
            // localStorageに保存
            localStorage.setItem('userLocation', JSON.stringify(location));
            
            console.log('位置情報を保存しました:', location);
            
            setShowLocationModal(false);
            router.push('/map');
          },
          (error) => {
            console.error('位置情報の取得に失敗しました:', error);
            setLocationPermission('denied');
            
            // エラーメッセージを表示
            let errorMessage = t('modal.location_error');
            switch(error.code) {
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
            
            // デフォルト位置（東京）を保存
            const defaultLocation = {
              lat: 35.6812,
              lng: 139.7671,
              timestamp: Date.now(),
              isDefault: true
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
        // Geolocation APIが使えない場合
        alert('お使いのブラウザは位置情報に対応していません');
        
        // デフォルト位置を保存
        const defaultLocation = {
          lat: 35.6812,
          lng: 139.7671,
          timestamp: Date.now(),
          isDefault: true
        };
        localStorage.setItem('userLocation', JSON.stringify(defaultLocation));
        
        setShowLocationModal(false);
        router.push('/map');
      }
    } else {
      // 位置情報を許可しない場合
      setLocationPermission('denied');
      
      // デフォルト位置を保存
      const defaultLocation = {
        lat: 35.6812,
        lng: 139.7671,
        timestamp: Date.now(),
        isDefault: true
      };
      localStorage.setItem('userLocation', JSON.stringify(defaultLocation));
      
      setShowLocationModal(false);
      router.push('/map');
    }
  };

  const handleLanguageToggle = () => {
    const newLanguage = language === 'ja' ? 'en' : 'ja';
    setLanguage(newLanguage);
    // ページをリロード
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー - レスポンシブ対応 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b safe-top">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* ハンバーガーメニューボタン */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMenu(!showMenu)}
            className="relative z-50"
          >
            {showMenu ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>

          {/* 店舗ログインボタン */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm border-2">
                {t('header.store_login')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 言語切り替えボタン（固定・右下）- テキスト表示に変更 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            size="lg"
            onClick={handleLanguageToggle}
            className="rounded-lg px-4 py-2 shadow-lg bg-white hover:bg-gray-100 border-2 border-gray-300"
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

            {/* メニューパネル */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-card border-r z-40 overflow-y-auto safe-top"
            >
              <div className="p-6 pt-20">
                {/* メニューヘッダー */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-card-foreground mb-2">{t('menu.title')}</h2>
                  <p className="text-sm text-muted-foreground">{t('menu.subtitle')}</p>
                </div>

                {/* メニューアイテム */}
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
                          <span className="font-medium text-card-foreground">{item.label}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                {/* フッター情報 */}
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

      {/* ヒーローセクション - レスポンシブ対応 */}
      <section className="relative pt-20 sm:pt-32 pb-12 sm:pb-20 px-4 overflow-hidden">
        {/* 背景画像 */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/12_hotel_bar_t3ti2i.jpg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center mb-6 sm:mb-8"
            >
              <img 
src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                alt="2軒目"
                className="h-24 sm:h-32 md:h-40 w-auto object-contain"
              />
            </motion.div>
            {/* タイトル部分に地域名を追加 */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-white">
              {t('hero.title')}<br/> {t('hero.title_app')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white mb-6 sm:mb-8 max-w-3xl mx-auto px-4 font-bold">
              {t('hero.subtitle')}
              <br/>
              {t('hero.subtitle2')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Button 
                size="lg" 
                variant="secondary"
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 text-foreground"
                onClick={handleMapClick}
              >
                {t('hero.cta')}
              </Button>
            </div>
          </motion.div>

          {/* デモ画面 - レスポンシブ対応 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl mb-12 sm:mb-20"
          >
            <div className="relative aspect-video">
              <img
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761800365/79FA3ECA-EEF6-4627-808B-E157EA37FBF4_1_201_a_atzbik.jpg"
                alt="アプリのデモ画面"
                className="w-full h-full object-cover"
              />
              {/* テキストオーバーレイ */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex justify-center items-end pb-8">
                <p className="text-white text-xl sm:text-3xl font-bold text-center px-4">
                  {t('hero.demo_text')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 機能セクション - レスポンシブ対応 */}
      <section className="relative py-12 sm:py-20 px-4 overflow-hidden">
        {/* 背景画像 */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/08_night_view_lounge_vdhksc.jpg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-white">{t('features.title')}</h2>
            <p className="text-base sm:text-xl text-white/90 font-bold">
              {t('features.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="p-5 sm:p-6 h-full hover:shadow-lg transition-shadow bg-card/90 backdrop-blur-sm border-border">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold mb-2 text-card-foreground">{feature.title}</h3>
                      <p className="text-sm sm:text-base text-card-foreground/80 font-bold">{feature.description}</p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 使い方セクション - レスポンシブ対応 */}
      <section className="relative py-12 sm:py-20 px-4 overflow-hidden">
        {/* 背景画像 */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/01_dark_bar_counter_tfsqjd.jpg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-white">{t('how_to.title')}</h2>
            <p className="text-base sm:text-xl text-white/90 font-bold">
              {t('how_to.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: t('how_to.step1_title'),
                description: t('how_to.step1_desc'),
                image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761800378/27F4F4F4-749D-4141-BEDC-5B93091BA278_1_102_o_juxfgv.jpg',
              },
              {
                step: '2',
                title: t('how_to.step2_title'),
                description: t('how_to.step2_desc'),
                image: 'https://res.cloudinary.com/dz9trbwma/image/upload/v1761802358/%E5%90%8D%E7%A7%B0%E6%9C%AA%E8%A8%AD%E5%AE%9A%E3%81%AE%E3%83%86%E3%82%99%E3%82%B5%E3%82%99%E3%82%A4%E3%83%B3_ekfjbe.png',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="p-6 sm:p-8 h-full bg-card/90 backdrop-blur-sm border-border">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-[#F5F5F5] text-xl sm:text-2xl font-bold flex items-center justify-center shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold mb-2 text-card-foreground">{item.title}</h3>
                      <p className="text-sm sm:text-base text-card-foreground/80 font-bold">{item.description}</p>
                    </div>
                  </div>
                  
                  {/* スクリーンショット画像表示 - サイズを小さく */}
                  <div className="mt-6 rounded-lg overflow-hidden shadow-lg max-w-[200px] mx-auto">
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

      {/* CTAセクション - レスポンシブ対応 */}
      <section className="relative py-12 sm:py-20 px-4 overflow-hidden">
        {/* 背景画像 */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761799700/15_turquoise_bar_rk1rtx.jpg"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-white">
              {t('cta.title')}
            </h2>
            <p className="text-base sm:text-xl text-white/90 mb-6 sm:mb-8 font-bold">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary" 
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 text-foreground"
                onClick={handleMapClick}
              >
                {t('cta.button')}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* フッター - レスポンシブ対応 */}
      <footer className="py-8 sm:py-12 px-4 bg-[#2C5F6F]">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center">
              <img 
                src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
                alt="2軒目"
                className="h-10 sm:h-12 w-auto object-contain filter brightness-0 invert"
              />
            </div>
            <p className="text-xs sm:text-sm text-[#F5F5F5]/80 text-center md:text-right font-bold">
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