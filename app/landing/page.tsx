'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, TrendingUp, Store, Shield, Zap, ArrowRight, Navigation } from 'lucide-react';
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
      title: 'リアルタイム位置情報',
      description: '地図上で近くのお店の混雑状況を一目で確認できます。',
    },
    {
      icon: Users,
      title: '来客情報の可視化',
      description: '男女比や混雑度を見て、最適なお店を選べます。',
    },
    {
      icon: TrendingUp,
      title: '最新の情報共有',
      description: 'ユーザーが投稿する最新の店舗情報をチェック。',
    },
    {
      icon: Store,
      title: '店舗管理機能',
      description: '企業アカウントで店舗情報をリアルタイム更新。',
    },
    {
      icon: Shield,
      title: '安全なデータ管理',
      description: 'Supabaseによる堅牢なセキュリティ。',
    },
    {
      icon: Zap,
      title: '高速なレスポンス',
      description: '最新技術による快適な操作感。',
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
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-xl sm:text-2xl font-bold">MachiNow</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                ログイン
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="text-xs sm:text-sm">
                今すぐ始める
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
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent px-4">
              いますぐ、2軒目へ
            </h1>
            <p className="text-base sm:text-xl md:text-2xl text-muted-foreground mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
              飲食店の混雑状況をリアルタイムで共有。
              <br className="hidden sm:block" />
              あなたの街の「今」を、みんなで作る。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8">
                  無料で始める
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8"
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
              <div className="text-center text-white p-4 sm:p-8">
                <MapPin className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-4" />
                <p className="text-lg sm:text-2xl font-bold">アプリのデモ画面</p>
                <p className="text-sm sm:text-base text-white/80 mt-1 sm:mt-2">地図上で店舗情報を確認</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 機能セクション - レスポンシブ対応 */}
      <section className="py-12 sm:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">主な機能</h2>
            <p className="text-base sm:text-xl text-muted-foreground">
              MachiNowが提供する充実の機能
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                  <Card className="p-5 sm:p-6 h-full hover:shadow-lg transition-shadow">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 使い方セクション - レスポンシブ対応 */}
      <section className="py-12 sm:py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">使い方はとても簡単</h2>
            <p className="text-base sm:text-xl text-muted-foreground">
              3つのステップで今すぐ始められます
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                step: '1',
                title: 'アカウント登録',
                description: 'メールアドレスで簡単に登録できます。',
              },
              {
                step: '2',
                title: '地図を確認',
                description: '近くのお店の混雑状況をチェック。',
              },
              {
                step: '3',
                title: '情報を共有',
                description: 'あなたの体験を投稿して共有。',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-white text-xl sm:text-2xl font-bold flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTAセクション - レスポンシブ対応 */}
      <section className="py-12 sm:py-20 px-4 bg-primary text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6">
              今すぐMachiNowを始めましょう
            </h2>
            <p className="text-base sm:text-xl text-white/90 mb-6 sm:mb-8">
              無料で登録して、あなたの街の「今」を共有しよう
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8">
                  無料で始める
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* フッター - レスポンシブ対応 */}
      <footer className="py-8 sm:py-12 px-4 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-xl sm:text-2xl font-bold">MachiNow</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center md:text-right">
              © 2025 MachiNow. All rights reserved.
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
        description="近くのお店を表示するために、位置情報の使用を許可してください。"
        showCloseButton={false}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center py-4 sm:py-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
          </div>
          
          {locationPermission === 'denied' && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs sm:text-sm">
              位置情報の取得に失敗しました。デフォルトの位置で地図を表示します。
            </div>
          )}
          
          <div className="text-xs sm:text-sm text-muted-foreground space-y-2">
            <p>位置情報を許可すると：</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>現在地周辺のお店が表示されます</li>
              <li>より正確な距離情報が得られます</li>
              <li>最適なルート案内が可能になります</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => handleLocationPermission(true)}
              className="w-full"
              size="lg"
            >
              位置情報を許可する
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