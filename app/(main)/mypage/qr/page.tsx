'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Info,
  Loader2,
  QrCode,
  Camera,
  ScanLine,
  X,
  AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { LoadingScreen } from '@/components/ui/loading-screen';

const REFRESH_INTERVAL_SEC = 90;
const SCANNER_REGION_ID = 'mypage-qr-scanner-region';

const BG_OFFWHITE = '#F7F3E9';
const NAVY = '#13294b';
const BRASS = '#ffc62d';
const COPPER = '#B87333';
const GOLD_GRADIENT = 'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)';
const NAVY_GRADIENT = 'linear-gradient(165deg, #13294b 0%, #1A3562 50%, #1F57A4 100%)';

export default function MyPageQrPage() {
  const router = useRouter();
  const { user, accountType, profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SEC);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 店舗QR読み取りモード
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerLockRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    root.style.background = BG_OFFWHITE;
    body.style.background = BG_OFFWHITE;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?redirect=/mypage/qr');
      return;
    }
    if (accountType !== 'customer') {
      router.replace('/mypage');
      return;
    }
    // プロフィール必須項目（住所エリア / 年齢 / 職業 / 性別）が未入力なら QR を表示しない
    const attrs = (profile?.profile_attributes ?? {}) as {
      address?: string;
      age?: string;
      occupation?: string;
      gender?: string;
    };
    const isComplete = Boolean(
      attrs.address?.trim() &&
        attrs.age?.trim() &&
        attrs.occupation?.trim() &&
        attrs.gender?.trim()
    );
    if (profile && !isComplete) {
      router.replace('/mypage');
      return;
    }
  }, [authLoading, user, accountType, profile, router]);

  const resolveSiteUrl = (): string => {
    const env =
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (env) return env;
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://nikenme.jp';
  };

  const regenerate = useCallback(async () => {
    if (!user) return;
    try {
      setGenerating(true);
      setError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('session_missing');
      }
      const res = await fetch('/api/me/check-in-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('generate_failed');
      }
      const json = (await res.json()) as { u: string; t: number; s: string };
      const url = new URL('/c', resolveSiteUrl());
      url.searchParams.set('u', json.u);
      url.searchParams.set('t', String(json.t));
      url.searchParams.set('s', json.s);
      const dataUrl = await QRCode.toDataURL(url.toString(), {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 512,
        color: { dark: '#13294b', light: '#FFFFFF' },
      });
      setQrDataUrl(dataUrl);
      setSecondsLeft(REFRESH_INTERVAL_SEC);
    } catch (err) {
      console.error('[mypage/qr] regenerate error', err);
      setError(t('mypageQr.generate_failed'));
    } finally {
      setGenerating(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (authLoading || !user || accountType !== 'customer') return;
    regenerate();
  }, [authLoading, user, accountType, regenerate]);

  useEffect(() => {
    if (!qrDataUrl) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          regenerate();
          return REFRESH_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [qrDataUrl, regenerate]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.getState && scanner.getState() === 2) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch {
      // ignore teardown errors
    }
    scannerRef.current = null;
  }, []);

  const handleDecoded = useCallback(
    (decoded: string) => {
      if (scannerLockRef.current) return;
      try {
        const url = new URL(decoded, window.location.origin);
        const isStoreCheckIn =
          url.pathname === '/liff/store-checkin' ||
          url.pathname === '/liff/store-checkin/';
        const storeIdParam = url.searchParams.get('store');
        if (!isStoreCheckIn || !storeIdParam) {
          setScannerError('店舗QRコードではありません');
          return;
        }
        scannerLockRef.current = true;
        stopScanner();
        // 同一サイト内なのでクライアントナビゲーションで遷移
        router.push(`/liff/store-checkin?store=${storeIdParam}&v=1`);
      } catch {
        setScannerError('QRコードの読み取りに失敗しました');
      }
    },
    [router, stopScanner]
  );

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setScannerError(null);
    try {
      const mod = await import('html5-qrcode');
      const Html5Qrcode = mod.Html5Qrcode;
      const scanner = new Html5Qrcode(SCANNER_REGION_ID);
      scannerRef.current = scanner;
      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };
      try {
        await scanner.start(
          { facingMode: { exact: 'environment' } } as MediaTrackConstraints,
          config,
          handleDecoded,
          () => {}
        );
      } catch {
        await scanner.start(
          { facingMode: 'environment' },
          config,
          handleDecoded,
          () => {}
        );
      }
    } catch (err) {
      console.error('[mypage/qr] scanner start error', err);
      setScannerError('カメラを起動できませんでした');
    }
  }, [handleDecoded]);

  useEffect(() => {
    if (!scannerOpen) return;
    scannerLockRef.current = false;
    startScanner();
    return () => {
      stopScanner();
    };
  }, [scannerOpen, startScanner, stopScanner]);

  if (authLoading || !user || accountType !== 'customer') {
    return <LoadingScreen size="lg" />;
  }

  const displayName =
    profile?.display_name ?? user.email?.split('@')[0] ?? 'ゲスト';

  return (
    <div className="min-h-screen pb-16" style={{ background: BG_OFFWHITE }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{ background: NAVY_GRADIENT, borderBottom: `1px solid ${BRASS}33` }}
      >
        <div className="relative flex items-center justify-center p-4 max-w-md mx-auto">
          <h1 className="text-lg font-light tracking-[0.2em]" style={{ color: '#FDFBF7' }}>
            チェックインQR
          </h1>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CloseCircleButton
              size="md"
              aria-label={t('common.close')}
              onClick={() => router.push('/mypage')}
            />
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="h-px w-6" style={{ background: BRASS }} />
              <span
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: COPPER }}
              >
                {t('mypageQr.badge')}
              </span>
              <div className="h-px w-6" style={{ background: BRASS }} />
            </div>
            <h2 className="text-xl font-bold mb-1" style={{ color: NAVY }}>
              {t('mypageQr.title')}
            </h2>
            <p className="text-sm" style={{ color: 'rgba(19, 41, 75, 0.65)' }}>
              {t('mypageQr.subtitle')}
            </p>
          </div>

          <div
            className="rounded-2xl p-6 mb-4 relative overflow-hidden"
            style={{
              background: 'white',
              border: `1px solid ${BRASS}33`,
              boxShadow: '0 12px 32px rgba(19, 41, 75, 0.10)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: GOLD_GRADIENT }} />
            <div className="flex flex-col items-center">
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: BG_OFFWHITE,
                  border: `1px solid ${BRASS}50`,
                  boxShadow: `0 4px 14px ${BRASS}22`,
                }}
              >
                {generating && !qrDataUrl ? (
                  <div className="w-[280px] h-[280px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: COPPER }} />
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Customer Check-in QR"
                    className={`w-[280px] h-[280px] transition-opacity ${
                      generating ? 'opacity-40' : 'opacity-100'
                    }`}
                  />
                ) : (
                  <div
                    className="w-[280px] h-[280px] flex items-center justify-center text-sm"
                    style={{ color: 'rgba(19, 41, 75, 0.6)' }}
                  >
                    {t('mypageQr.generate_failed')}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: NAVY }}>
                <QrCode className="w-4 h-4" style={{ color: COPPER }} />
                <span className="font-semibold">{displayName}</span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: 'rgba(19, 41, 75, 0.6)' }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {generating
                      ? t('mypageQr.refreshing')
                      : t('mypageQr.refresh_in').replace('{n}', String(secondsLeft))}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => regenerate()}
                  disabled={generating}
                  style={{
                    background: 'white',
                    color: NAVY,
                    border: `1.5px solid ${BRASS}60`,
                  }}
                >
                  {t('mypageQr.tap_to_refresh')}
                </Button>
              </div>

              {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
            </div>
          </div>

          {/* 店舗QRを読み取る (双方向化セクション) */}
          <div
            className="rounded-2xl p-5 mb-4 relative overflow-hidden"
            style={{
              background: 'white',
              border: `1px solid ${BRASS}33`,
              boxShadow: '0 12px 32px rgba(19, 41, 75, 0.08)',
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" style={{ color: COPPER }} />
                <h3 className="font-semibold text-sm" style={{ color: NAVY }}>
                  店舗QRを読み取る
                </h3>
              </div>
              <span
                className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
                style={{ background: `${BRASS}20`, color: COPPER }}
              >
                NEW
              </span>
            </div>
            <p
              className="text-xs mb-2"
              style={{ color: 'rgba(19, 41, 75, 0.65)' }}
            >
              店内に掲示されたQRコードを読み取ってセルフチェックインできます
            </p>
            <p
              className="text-[11px] mb-3"
              style={{ color: 'rgba(19, 41, 75, 0.5)' }}
            >
              ※ セルフチェックインはLINEログインと位置情報の許可が必要です
            </p>
            <Button
              size="sm"
              onClick={() => setScannerOpen(true)}
              style={{
                background: GOLD_GRADIENT,
                color: NAVY,
                width: '100%',
              }}
              className="rounded-xl font-bold"
            >
              <ScanLine className="w-4 h-4 mr-2" />
              スキャンを開始
            </Button>
          </div>

          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: 'white',
              border: `1px solid ${BRASS}33`,
              boxShadow: '0 12px 32px rgba(19, 41, 75, 0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4" style={{ color: COPPER }} />
              <h3 className="font-semibold text-sm" style={{ color: NAVY }}>
                {t('mypageQr.how_to_use_title')}
              </h3>
            </div>
            <ol
              className="text-sm space-y-2 list-decimal ml-5"
              style={{ color: 'rgba(19, 41, 75, 0.75)' }}
            >
              <li>{t('mypageQr.how_to_use_1')}</li>
              <li>{t('mypageQr.how_to_use_2')}</li>
              <li>
                {t('mypageQr.how_to_use_3').replace('{sec}', String(REFRESH_INTERVAL_SEC))}
              </li>
            </ol>
          </div>
        </motion.div>
      </div>

      {/* 店舗QRスキャナーモーダル */}
      {scannerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(10, 10, 10, 0.92)' }}
        >
          <div className="w-full max-w-md mx-auto px-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-base font-semibold text-white">
                店舗QRを読み取り
              </h3>
              <button
                type="button"
                onClick={() => {
                  setScannerOpen(false);
                  setScannerError(null);
                }}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                aria-label="閉じる"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div
              className="aspect-square w-full rounded-2xl overflow-hidden relative"
              style={{ background: '#0a0a0a' }}
            >
              <div id={SCANNER_REGION_ID} className="w-full h-full" />

              {/* スキャナガイド枠 */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative w-56 h-56">
                  <div
                    className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 rounded-tl-lg"
                    style={{ borderColor: BRASS }}
                  />
                  <div
                    className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 rounded-tr-lg"
                    style={{ borderColor: BRASS }}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 rounded-bl-lg"
                    style={{ borderColor: BRASS }}
                  />
                  <div
                    className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 rounded-br-lg"
                    style={{ borderColor: BRASS }}
                  />
                  <motion.div
                    className="absolute left-0 right-0 h-[2px]"
                    style={{ background: BRASS }}
                    animate={{ top: ['5%', '95%', '5%'] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/80">
              <ScanLine className="w-4 h-4" />
              <span>店内のQRコードを枠内に合わせてください</span>
            </div>

            {scannerError && (
              <div className="mt-3 flex items-start gap-2 text-xs bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-white/90">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{scannerError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
