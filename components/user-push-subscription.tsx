'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Loader2, X, Share } from 'lucide-react';
import { subscribeUserToPush } from '@/lib/push/client';
import { useLanguage } from '@/lib/i18n/context';

// マップページでのみ表示（レイアウトではなくマップページから直接マウント）
const STORAGE_KEY = 'nikenme_user_push_sub';
const PWA_BANNER_DISMISSED_KEY = 'nikenme_pwa_banner_dismissed_at';
const PWA_BANNER_COOLDOWN_MS = 60 * 60 * 1000; // 1時間

function isPWABannerCoolingDown(): boolean {
  try {
    const val = localStorage.getItem(PWA_BANNER_DISMISSED_KEY);
    if (!val) return false;
    return Date.now() - Number(val) < PWA_BANNER_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function recordPWABannerDismissed(): void {
  try {
    localStorage.setItem(PWA_BANNER_DISMISSED_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

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

function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);
}

function isIOSBrowser(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !isPWA();
}

/**
 * iOS ブラウザ向け PWA インストール促進バナー
 * ダークネイビー + ゴールドのカラーパレット、画面上中央に表示
 */
function PWAInstallBanner({ onDismiss, t }: { onDismiss: () => void; t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-16 left-4 right-4 z-50 mx-auto max-w-xs rounded-2xl shadow-2xl p-3"
      style={{ background: 'linear-gradient(135deg, #13294b 0%, #1a3560 100%)' }}
    >
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-[#FDFBF7]/50 hover:text-[#FDFBF7]"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-[#ffc62d]/20 border border-[#ffc62d]/30 flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-[#ffc62d]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#FDFBF7]">
            {t('pushNotification.title')}
          </p>
          <p className="text-xs text-[#FDFBF7]/60 mt-1 leading-relaxed">
            {t('pushNotification.description_line1')}
            <br />
            {t('pushNotification.description_line2')}
          </p>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-[#ffc62d] font-medium">
            <Share className="w-3.5 h-3.5" />
            <span>
              {t('pushNotification.share_instruction')}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * ユーザー向け空席通知の購読UIコンポーネント
 * ベルアイコン + スライドトグル + PWAインストールバナー
 */
export function UserPushSubscription() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [status, setStatus] = useState<'loading' | 'idle' | 'subscribed' | 'denied' | 'unsupported' | 'ios-browser'>('loading');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPWABanner, setShowPWABanner] = useState(false);
  const autoUpdateDone = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMapPage = pathname === '/map';

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
              latitude, longitude, subscribedAt: Date.now(),
            }));
          }
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    // iOS ブラウザ（非PWA）の場合
    if (isIOSBrowser()) {
      setStatus('ios-browser');
      if (!isPWABannerCoolingDown()) {
        setShowPWABanner(true);
      }
      return;
    }

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
  }, [updateLocationIfMoved]);

  // 展開後3秒で自動で閉じる
  useEffect(() => {
    if (isExpanded) {
      collapseTimer.current = setTimeout(() => setIsExpanded(false), 3000);
    }
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, [isExpanded]);

  const handleIconTap = useCallback(() => {
    if (isProcessing) return;
    setIsExpanded((prev) => !prev);
  }, [isProcessing]);

  const handleToggle = useCallback(async () => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);

    // OFF にする
    if (status === 'subscribed') {
      localStorage.removeItem(STORAGE_KEY);
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
      } catch { /* ignore */ }
      setStatus('idle');
      setIsExpanded(false);
      return;
    }

    // ON にする
    setIsProcessing(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, timeout: 5000, maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;
      const success = await subscribeUserToPush(latitude, longitude);

      if (success) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          latitude, longitude, subscribedAt: Date.now(),
        }));
        setStatus('subscribed');
      } else if (Notification.permission === 'denied') {
        setStatus('denied');
      }
    } catch { /* ignore */ } finally {
      setIsProcessing(false);
      setIsExpanded(false);
    }
  }, [status]);

  const dismissPWABanner = useCallback(() => {
    setShowPWABanner(false);
    recordPWABannerDismissed();
  }, []);

  if (status === 'loading' || status === 'unsupported' || !isMapPage) return null;

  // iOS ブラウザ: PWA インストールバナーのみ
  if (status === 'ios-browser') {
    return (
      <AnimatePresence>
        {showPWABanner && <PWAInstallBanner onDismiss={dismissPWABanner} t={t} />}
      </AnimatePresence>
    );
  }

  const isOn = status === 'subscribed';
  const iconColor = isOn ? 'bg-green-500' : 'bg-gray-400';

  return (
    <div
      className="fixed left-4 z-50 top-36"
    >
      <div className="flex items-center gap-0">
        {/* ベルアイコン（常時表示） */}
        <motion.button
          onClick={handleIconTap}
          whileTap={{ scale: 0.9 }}
          className={`
            relative w-11 h-11 rounded-full shadow-lg flex items-center justify-center
            transition-colors duration-300 z-10
            ${iconColor}
          `}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : isOn ? (
            <Bell className="w-5 h-5 text-white" />
          ) : (
            <BellOff className="w-5 h-5 text-white" />
          )}

          {/* ON時のリングアニメーション */}
          {isOn && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-green-400"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            />
          )}
        </motion.button>

        {/* スライドトグルラベル */}
        <AnimatePresence>
          {isExpanded && (
            <motion.button
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={handleToggle}
              disabled={isProcessing || status === 'denied'}
              className={`
                h-9 rounded-r-full -ml-2 pl-4 pr-4 flex items-center
                text-sm font-medium text-white whitespace-nowrap overflow-hidden
                transition-colors duration-300
                ${isOn
                  ? 'bg-green-600 hover:bg-green-700'
                  : status === 'denied'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#0A1628] hover:bg-[#1a2a42]'
                }
              `}
            >
              {isProcessing
                ? t('pushNotification.setting')
                : isOn
                  ? t('pushNotification.turn_off')
                  : status === 'denied'
                    ? t('pushNotification.blocked')
                    : t('pushNotification.turn_on')}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
