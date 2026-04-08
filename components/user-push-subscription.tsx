'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { subscribeUserToPush } from '@/lib/push/client';

const USER_PAGES = ['/map', '/store-list', '/store/'];

const STORAGE_KEY = 'nikenme_user_push_sub';

interface StoredSubscription {
  latitude: number;
  longitude: number;
  subscribedAt: number;
}

function getStoredSubscription(): StoredSubscription | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * ユーザー向け空席通知の購読UIコンポーネント
 * ON/OFFトグル対応。位置情報とプッシュ通知許可を取得し、近くの店舗の空席通知を受け取れるようにする
 */
export function UserPushSubscription() {
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'idle' | 'subscribed' | 'denied' | 'unsupported'>('loading');
  const [isProcessing, setIsProcessing] = useState(false);
  const autoUpdateDone = useRef(false);

  const isUserPage = USER_PAGES.some((p) => pathname.startsWith(p)) && !pathname.startsWith('/store/manage');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    const stored = getStoredSubscription();
    if (stored && Notification.permission === 'granted') {
      setStatus('subscribed');
      if (!autoUpdateDone.current) {
        autoUpdateDone.current = true;
        updateLocationIfMoved(stored);
      }
    } else {
      setStatus('idle');
    }
  }, []);

  const updateLocationIfMoved = useCallback(async (stored: StoredSubscription) => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = haversineDistance(stored.latitude, stored.longitude, latitude, longitude);

        if (distance > 0.2) {
          const success = await subscribeUserToPush(latitude, longitude);
          if (success) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
              latitude,
              longitude,
              subscribedAt: Date.now(),
            }));
          }
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
    );
  }, []);

  const handleToggle = useCallback(async () => {
    // OFF にする
    if (status === 'subscribed') {
      localStorage.removeItem(STORAGE_KEY);

      // Service Workerの購読を解除
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      } catch {
        // 解除失敗しても状態はリセット
      }

      setStatus('idle');
      return;
    }

    // ON にする
    setIsProcessing(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;
      const success = await subscribeUserToPush(latitude, longitude);

      if (success) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          latitude,
          longitude,
          subscribedAt: Date.now(),
        }));
        setStatus('subscribed');
      } else {
        if (Notification.permission === 'denied') {
          setStatus('denied');
        }
      }
    } catch {
      // 位置情報の取得に失敗
    } finally {
      setIsProcessing(false);
    }
  }, [status]);

  const isMapPage = pathname === '/map';

  if (status === 'loading' || status === 'unsupported' || !isUserPage) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={isProcessing || status === 'denied'}
      className={`
        fixed left-4 z-50
        ${isMapPage ? 'top-36' : 'bottom-4'}
        flex items-center gap-2 px-3 py-2 rounded-full shadow-lg
        text-sm font-medium transition-all duration-200
        ${status === 'subscribed'
          ? 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
          : status === 'denied'
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-[#0A1628] text-white hover:bg-[#1a2a42] active:scale-95'
        }
      `}
      title={
        status === 'denied'
          ? '通知がブロックされています。ブラウザ設定から許可してください'
          : status === 'subscribed'
            ? 'タップで空席通知をOFFにする'
            : '近くのお店の空席通知を受け取る'
      }
    >
      {isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : status === 'subscribed' ? (
        <Bell className="w-4 h-4" />
      ) : status === 'denied' ? (
        <BellOff className="w-4 h-4" />
      ) : (
        <BellOff className="w-4 h-4" />
      )}
      <span>
        {isProcessing
          ? '設定中...'
          : status === 'subscribed'
            ? '空席通知 ON'
            : status === 'denied'
              ? '通知ブロック中'
              : '空席通知 OFF'}
      </span>
    </button>
  );
}
