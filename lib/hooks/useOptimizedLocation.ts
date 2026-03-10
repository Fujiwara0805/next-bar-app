/**
 * 共有の位置情報取得フック
 *
 * locationCache（nikenme_user_location）を使用し、
 * マップ・店舗一覧・店舗詳細で同一の位置情報を共有する。
 * これにより徒歩時間の表示が全画面で一致する。
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { locationCache } from '@/lib/cache';

export const DEFAULT_LOCATION = {
  lat: 33.2382,
  lng: 131.6126,
};

export function useOptimizedLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializedRef = useRef(false);
  const isUpdatingRef = useRef(false);
  const isMountedRef = useRef(true);

  const updateLocationInBackground = useCallback(() => {
    if (isUpdatingRef.current || !isMountedRef.current) return;
    if (!navigator.geolocation) {
      locationCache.set({ ...DEFAULT_LOCATION, isDefault: true });
      return;
    }

    isUpdatingRef.current = true;
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        isUpdatingRef.current = false;
      }
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!resolved && isMountedRef.current) {
          resolved = true;
          clearTimeout(timeoutId);
          isUpdatingRef.current = false;

          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setLocation(newLocation);
          locationCache.set({
            lat: newLocation.lat,
            lng: newLocation.lng,
            accuracy: position.coords.accuracy,
            isDefault: false,
          });
        }
      },
      (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          isUpdatingRef.current = false;
          locationCache.set({ ...DEFAULT_LOCATION, isDefault: true });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 2500,
        maximumAge: 300000,
      }
    );
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const cached = locationCache.get();
    if (cached && !cached.isDefault) {
      setLocation({ lat: cached.lat, lng: cached.lng });
      setIsLoading(false);
      updateLocationInBackground();
      return;
    }

    setLocation(DEFAULT_LOCATION);
    setIsLoading(false);
    updateLocationInBackground();

    return () => {
      isMountedRef.current = false;
    };
  }, [updateLocationInBackground]);

  const refreshLocation = useCallback(() => {
    updateLocationInBackground();
  }, [updateLocationInBackground]);

  return { location, isLoading, refreshLocation };
}
