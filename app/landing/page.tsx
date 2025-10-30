'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Store, ArrowRight, Navigation } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomModal } from '@/components/ui/custom-modal';

export default function LandingPage() {
  const router = useRouter();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const features = [
    {
      icon: MapPin,
      title: '今すぐ入れるお店が見つかる',
      description: '待たずに入れるお店がすぐ分かります。',
    },
    {
      icon: Store,
      title: '加盟店のリアルタイム情報',
      description: 'お店が更新する最新の空席情報をチェック。',
    },
    {
      icon: Navigation,
      title: 'お店までの距離が分かる',
      description: '現在地からの距離を表示。',
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
            let errorMessage = '位置情報の取得に失敗しました。';
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = '位置情報の使用が拒否されました。';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = '位置情報が利用できません。';
                break;
              case error.TIMEOUT:
                errorMessage = '位置情報の取得がタイムアウトしました。';
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

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー - レスポンシブ対応 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b safe-top">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="https://res.cloudinary.com/dz9trbwma/image/upload/v1761355092/%E3%82%B5%E3%83%BC%E3%83%92%E3%82%99%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png"
              alt="2軒目"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm border-2">
                店舗ログイン
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ヒーローセクション - レスポンシブ対応 */}
      <section className="pt-20 sm:pt-32 pb-12 sm:pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-foreground">
              大分の二軒目探しは<br/> NIKENME+（ニケンメプラス）
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-foreground mb-6 sm:mb-8 max-w-3xl mx-auto px-4 font-bold">
              「夜の続きは、ここから」
              <br/>
              次のお店を今すぐマップで探そう
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Button 
                size="lg" 
                variant="secondary"
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 text-foreground"
                onClick={handleMapClick}
              >
                マップを見る
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
            <div className="aspect-video bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <div className="text-center text-[#F5F5F5] p-4 sm:p-8">
                <MapPin className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-4" />
                <p className="text-lg sm:text-2xl font-bold">アプリのデモ画面</p>
                <p className="text-sm sm:text-base text-[#F5F5F5]/80 mt-1 sm:mt-2 font-bold">地図上で店舗情報を確認</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 機能セクション - レスポンシブ対応 */}
      <section className="py-12 sm:py-20 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-[#F5F5F5]">こんな時に便利</h2>
            <p className="text-base sm:text-xl text-[#F5F5F5]/80 font-bold">
              2軒目のお店探しをもっとスマートに
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
                  <Card className="p-5 sm:p-6 h-full hover:shadow-lg transition-shadow bg-card border-border">
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
      <section className="py-12 sm:py-20 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-[#F5F5F5]">使い方はとても簡単</h2>
            <p className="text-base sm:text-xl text-[#F5F5F5]/80 font-bold">
              ログイン不要で今すぐ使えます
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: '位置情報を許可',
                description: '現在地周辺のお店を表示するために位置情報の使用を許可してください。',
                icon: Navigation,
              },
              {
                step: '2',
                title: 'マップで空席を確認',
                description: '地図上のアイコンで空席状況を確認できます。',
                icon: MapPin,
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="p-6 sm:p-8 h-full bg-card border-border">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-[#F5F5F5] text-xl sm:text-2xl font-bold flex items-center justify-center shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-bold mb-2 text-card-foreground">{item.title}</h3>
                      <p className="text-sm sm:text-base text-card-foreground/80 font-bold">{item.description}</p>
                    </div>
                  </div>
                  
                  {/* 視覚的な説明用のアイコン表示 */}
                  <div className="mt-6 p-6 bg-primary/10 rounded-lg flex items-center justify-center">
                    <item.icon className="w-16 h-16 sm:w-20 sm:h-20 text-primary" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTAセクション - レスポンシブ対応 */}
      <section className="py-12 sm:py-20 px-4 bg-[#2C5F6F] text-[#F5F5F5]">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-foreground">
              今すぐ入れるお店を探そう
            </h2>
            <p className="text-base sm:text-xl text-[#F5F5F5]/90 mb-6 sm:mb-8 font-bold">
              ログイン不要、今すぐマップ画面へ
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary" 
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 text-foreground"
                onClick={handleMapClick}
              >
                マップを見る
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
              © 2025 2軒目. All rights reserved.
              <br />
              いますぐ、2軒目へ
            </p>
          </div>
        </div>
      </footer>

      {/* 位置情報許可モーダル */}
      <CustomModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="位置情報の使用許可"
        description="位置情報の使用を許可してください。"
        showCloseButton={false}
      >
        <div className="space-y-4">
          {locationPermission === 'denied' && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs sm:text-sm">
              位置情報の取得に失敗しました。デフォルトの位置で地図を表示します。
            </div>
          )}
        
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => handleLocationPermission(true)}
              className="w-full"
              size="lg"
            >
              現在地から探す
            </Button>
            <Button
              onClick={() => handleLocationPermission(false)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              許可しない
            </Button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}