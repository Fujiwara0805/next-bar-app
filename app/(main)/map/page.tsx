'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Users, Search, X, Filter, Menu } from 'lucide-react';
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
    getUserLocation();
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

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
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
      <header className="absolute top-0 left-0 right-0 z-10 pt-6 px-4 safe-top">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full space-y-3"
        >
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg w-fit">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-bold text-base">MachiNow</span>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="お店を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 h-12 bg-white/95 backdrop-blur-sm shadow-lg border-0 rounded-full"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="icon"
              className="rounded-full shadow-lg bg-white/95 backdrop-blur-sm hover:bg-white"
              variant="secondary"
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </header>

      <MapView
        stores={stores}
        center={userLocation || undefined}
        onStoreClick={setSelectedStore}
      />

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

      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>空席</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>やや混雑</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>混雑</span>
          </div>
        </div>
      </div>
    </div>
  );
}
