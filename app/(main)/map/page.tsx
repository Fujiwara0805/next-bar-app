'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Search, X, Filter, ArrowLeft } from 'lucide-react';
import { MapView } from '@/components/map/map-view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Store = Database['public']['Tables']['stores']['Row'];

export default function MapPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStores();
    loadUserLocation();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserLocation = () => {
    // localStorageから位置情報を取得（ランディングページで保存済み）
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setUserLocation(location);
        return;
      } catch (e) {
        console.error('Failed to parse saved location');
      }
    }

    // 保存された位置情報がない場合、再度取得を試みる
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          localStorage.setItem('userLocation', JSON.stringify(location));
        },
        (error) => {
          console.error('Error getting location:', error);
          // エラーの場合はデフォルト位置（東京）を使用
          setUserLocation({ lat: 35.6812, lng: 139.7671 });
        }
      );
    } else {
      // Geolocation APIが使えない場合はデフォルト位置
      setUserLocation({ lat: 35.6812, lng: 139.7671 });
    }
  };

  const getVacancyLabel = (status: string) => {
    switch (status) {
      case 'vacant':
        return '空席あり';
      case 'moderate':
        return 'やや混雑';
      case 'crowded':
        return '混雑';
      default:
        return '不明';
    }
  };

  const getVacancyColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'bg-green-500';
      case 'moderate':
        return 'bg-yellow-500';
      case 'crowded':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="relative h-screen flex flex-col">
      {/* ヘッダー - レスポンシブ対応 */}
      <header className="absolute top-0 left-0 right-0 z-10 pt-4 sm:pt-6 px-3 sm:px-4 safe-top">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full space-y-2 sm:space-y-3"
        >
          {/* ロゴと戻るボタン */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-lg">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => router.push('/landing')}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-primary/10"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </Button>
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="font-bold text-sm sm:text-base">MachiNow</span>
            </div>
          </div>

          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="お店を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 h-10 sm:h-12 text-sm sm:text-base bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-full"
            />
          </div>

          {/* フィルターボタン */}
          <div className="flex justify-end">
            <Button
              size="icon"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg bg-white/95 backdrop-blur-sm hover:bg-white"
              variant="secondary"
            >
              <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </motion.div>
      </header>

      {/* マップ */}
      <MapView
        stores={stores}
        center={userLocation || undefined}
        onStoreClick={setSelectedStore}
      />

      {/* 店舗詳細カード */}
      <AnimatePresence>
        {selectedStore && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-20 p-4"
            onClick={() => router.push(`/store/${selectedStore.id}`)}
          >
            <Card className="p-4 shadow-2xl cursor-pointer hover:shadow-3xl transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold">{selectedStore.name}</h3>
                    <Badge
                      variant="secondary"
                      className={`${getVacancyColor(selectedStore.vacancy_status)} text-white text-xs`}
                    >
                      {getVacancyLabel(selectedStore.vacancy_status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {selectedStore.address}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>
                      男性 {selectedStore.male_ratio}% / 女性 {selectedStore.female_ratio}%
                    </span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStore(null);
                  }}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 混雑状況の凡例 - レスポンシブ対応 */}
      <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-lg">
        <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500" />
            <span>空席</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
            <span>やや混雑</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500" />
            <span>混雑</span>
          </div>
        </div>
      </div>
    </div>
  );
}