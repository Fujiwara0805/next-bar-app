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

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'error';

export function useOptimizedLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDefaultLocation, setIsDefaultLocation] = useState(true);
  const [locationStatus, setLocationStatus] = useState<GeolocationStatus>('idle');
  const isUpdatingRef = useRef(false);
  const isMountedRef = useRef(true);
  const hasRealLocationRef = useRef(false);

  const updateLocationInBackground = useCallback(() => {
    if (isUpdatingRef.current || !isMountedRef.current) return;
    if (!navigator.geolocation) {
      if (hasRealLocationRef.current) {
        setIsDefaultLocation(false);
        setLocationStatus('granted');
      } else {
        locationCache.set({ ...DEFAULT_LOCATION, isDefault: true });
        setLocation(DEFAULT_LOCATION);
        setIsDefaultLocation(true);
        setLocationStatus('unavailable');
      }
      return;
    }

    isUpdatingRef.current = true;
    setLocationStatus('requesting');
    let resolved = false;

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        isUpdatingRef.current = false;
        if (isMountedRef.current) {
          if (hasRealLocationRef.current) {
            setIsDefaultLocation(false);
            setLocationStatus('granted');
          } else {
            setIsDefaultLocation(true);
            setLocationStatus('timeout');
          }
        }
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
          hasRealLocationRef.current = true;
          setIsDefaultLocation(false);
          setLocationStatus('granted');
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
          if (isMountedRef.current) {
            if (hasRealLocationRef.current) {
              setIsDefaultLocation(false);
              setLocationStatus('granted');
            } else {
              locationCache.set({ ...DEFAULT_LOCATION, isDefault: true });
              setLocation(DEFAULT_LOCATION);
              setIsDefaultLocation(true);
              setLocationStatus(
                error.code === error.PERMISSION_DENIED
                  ? 'denied'
                  : error.code === error.POSITION_UNAVAILABLE
                    ? 'unavailable'
                    : error.code === error.TIMEOUT
                      ? 'timeout'
                      : 'error'
              );
            }
          }
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

    const cached = locationCache.get();
    if (cached && !cached.isDefault) {
      hasRealLocationRef.current = true;
      setLocation({ lat: cached.lat, lng: cached.lng });
      setIsDefaultLocation(false);
      setLocationStatus('granted');
      setIsLoading(false);
      updateLocationInBackground();
    } else {
      hasRealLocationRef.current = false;
      setLocation(DEFAULT_LOCATION);
      setIsDefaultLocation(true);
      setIsLoading(false);
      updateLocationInBackground();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [updateLocationInBackground]);

  const refreshLocation = useCallback(() => {
    updateLocationInBackground();
  }, [updateLocationInBackground]);

  return {
    location,
    isLoading,
    isDefaultLocation,
    locationStatus,
    refreshLocation,
  };
}
