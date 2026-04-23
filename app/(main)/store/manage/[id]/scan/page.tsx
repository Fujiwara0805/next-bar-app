'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Camera,
  CameraOff,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  User,
  Ticket,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';

type ScannerState = 'idle' | 'starting' | 'scanning' | 'paused' | 'error';

type CheckInResult = {
  storeId: string;
  storeName: string;
  userId: string;
  userDisplayName: string;
  isNewStamp: boolean;
  windowStoreCount: number;
  lotteryThreshold: number;
  lotteryMax: number;
  canEnterLottery: boolean;
  hasLotteryEntry: boolean;
  visitDate: string;
  windowHours: number;
};

const QR_REGION_ID = 'store-scan-qr-region';

export default function StoreScanPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const { user, accountType, store, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { colorsB: COLORS } = useAppMode();

  const scannerRef = useRef<any>(null);
  const lockRef = useRef(false);
  const [state, setState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  const isAuthorized = useMemo(() => {
    if (authLoading || !user) return false;
    if (accountType === 'platform') return true;
    if (accountType === 'store' && store?.id === storeId) return true;
    return false;
  }, [authLoading, user, accountType, store, storeId]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    body.style.background = bg;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, [COLORS.cardGradient]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login/store');
      return;
    }
    if (!isAuthorized) {
      router.replace('/store/manage');
    }
  }, [authLoading, user, isAuthorized, router]);

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

  const submitCheckIn = useCallback(
    async (payload: { u: string; t: number; s: string }) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setResultError(t('storeScan.error.unauthorized'));
          return;
        }
        const res = await fetch(`/api/stores/${storeId}/check-in-scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          const key = `storeScan.error.${json?.error ?? 'unknown'}`;
          const translated = t(key);
          setResultError(
            translated === key ? t('storeScan.error.unknown') : translated
          );
          return;
        }
        setResult(json as CheckInResult);
      } catch (err) {
        console.error('[store/scan] submit error', err);
        setResultError(t('storeScan.error.unknown'));
      }
    },
    [storeId, t]
  );

  const handleDecodedText = useCallback(
    (decoded: string) => {
      if (lockRef.current) return;
      try {
        const url = new URL(decoded, window.location.origin);
        // Expected path: /c or /c/
        if (!url.pathname.replace(/\/$/, '').endsWith('/c')) {
          // Allow arbitrary hosts but enforce /c path
          setErrorMsg(t('storeScan.invalid_qr'));
          return;
        }
        const u = url.searchParams.get('u');
        const tParam = url.searchParams.get('t');
        const s = url.searchParams.get('s');
        if (!u || !tParam || !s || !/^\d+$/.test(tParam)) {
          setErrorMsg(t('storeScan.invalid_qr'));
          return;
        }
        lockRef.current = true;
        setState('paused');
        stopScanner();
        setErrorMsg('');
        submitCheckIn({ u, t: Number(tParam), s });
      } catch {
        setErrorMsg(t('storeScan.invalid_qr'));
      }
    },
    [stopScanner, submitCheckIn, t]
  );

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setState('starting');
    setErrorMsg('');
    try {
      const mod = await import('html5-qrcode');
      const Html5Qrcode = mod.Html5Qrcode;
      const scanner = new Html5Qrcode(QR_REGION_ID);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      };

      try {
        await scanner.start(
          { facingMode: { exact: 'environment' } } as MediaTrackConstraints,
          config,
          handleDecodedText,
          () => {}
        );
      } catch {
        await scanner.start(
          { facingMode: 'environment' },
          config,
          handleDecodedText,
          () => {}
        );
      }
      setState('scanning');
    } catch (err) {
      console.error('[store/scan] start error', err);
      setState('error');
      setErrorMsg(t('storeScan.camera_error'));
    }
  }, [handleDecodedText, t]);

  useEffect(() => {
    if (!isAuthorized) return;
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  const handleRetry = async () => {
    await stopScanner();
    lockRef.current = false;
    setState('idle');
    setErrorMsg('');
    setResult(null);
    setResultError(null);
    startScanner();
  };

  const handleClose = async () => {
    await stopScanner();
    router.push(`/store/manage/${storeId}/update`);
  };

  if (authLoading || !user || !isAuthorized) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center"
        style={{ background: COLORS.cardGradient }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-10 h-10" style={{ color: COLORS.champagneGold }} />
        </motion.div>
      </div>
    );
  }

  const showingResult = !!result || !!resultError;

  return (
    <div className="min-h-[100dvh] pb-20" style={{ background: COLORS.cardGradient }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="flex items-center justify-center p-4 relative">
          <h1
            className="text-lg font-light tracking-widest"
            style={{ color: COLORS.ivory }}
          >
            {t('storeScan.title')}
          </h1>
          <CloseCircleButton
            type="button"
            size="lg"
            onClick={handleClose}
            className="absolute right-4"
            aria-label={t('common.close')}
          />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <div
                className="h-px w-6"
                style={{ background: COLORS.champagneGold }}
              />
              <span
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: COLORS.champagneGold }}
              >
                {t('storeScan.badge')}
              </span>
              <div
                className="h-px w-6"
                style={{ background: COLORS.champagneGold }}
              />
            </div>
            <p className="text-sm font-medium" style={{ color: COLORS.warmGray }}>
              {t('storeScan.subtitle')}
            </p>
          </div>

          {!showingResult && (
            <Card
              className="relative aspect-square overflow-hidden mb-4"
              style={{
                background: '#0a0a0a',
                border: `1px solid rgba(201, 168, 108, 0.2)`,
              }}
            >
              <div id={QR_REGION_ID} className="w-full h-full" />

              {state === 'scanning' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative w-60 h-60">
                    <div
                      className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg"
                      style={{ borderColor: COLORS.champagneGold }}
                    />
                    <div
                      className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg"
                      style={{ borderColor: COLORS.champagneGold }}
                    />
                    <div
                      className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg"
                      style={{ borderColor: COLORS.champagneGold }}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg"
                      style={{ borderColor: COLORS.champagneGold }}
                    />
                    <motion.div
                      className="absolute left-0 right-0 h-[2px]"
                      style={{ background: COLORS.champagneGold }}
                      animate={{ top: ['5%', '95%', '5%'] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                </div>
              )}

              {state === 'starting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                  <Camera className="w-10 h-10 mb-3 animate-pulse text-white/70" />
                  <p className="text-sm text-white/80">{t('storeScan.starting')}</p>
                </div>
              )}

              {state === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
                  <CameraOff className="w-10 h-10 mb-3 text-destructive" />
                  <p className="text-sm text-white/80 mb-4">
                    {errorMsg || t('storeScan.camera_error')}
                  </p>
                  <Button size="sm" variant="secondary" onClick={handleRetry}>
                    {t('storeScan.retry')}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {!showingResult && state === 'scanning' && (
            <div
              className="flex items-center justify-center gap-2 text-sm mb-2"
              style={{ color: COLORS.warmGray }}
            >
              <ScanLine className="w-4 h-4" />
              <span>{t('storeScan.point_to_qr')}</span>
            </div>
          )}

          {!showingResult && errorMsg && state === 'scanning' && (
            <div className="flex items-start gap-2 text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg p-3 mb-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {result && (
            <Card
              className="p-6 rounded-2xl shadow-lg"
              style={{
                background: '#FFFFFF',
                border: `1px solid rgba(201, 168, 108, 0.15)`,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34, 197, 94, 0.12)' }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: '#16a34a' }} />
              </motion.div>

              <h2
                className="text-xl font-bold text-center mb-1"
                style={{ color: COLORS.deepNavy }}
              >
                {result.isNewStamp
                  ? t('storeScan.new_stamp')
                  : t('storeScan.already_stamped')}
              </h2>
              <p
                className="text-xs text-center mb-4"
                style={{ color: COLORS.warmGray }}
              >
                {result.storeName}
              </p>

              <div
                className="rounded-xl p-4 mb-4 flex items-center gap-3"
                style={{ background: 'rgba(201, 168, 108, 0.08)' }}
              >
                <User className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
                <div>
                  <div
                    className="text-xs font-medium"
                    style={{ color: COLORS.warmGray }}
                  >
                    {t('storeScan.customer_label')}
                  </div>
                  <div
                    className="text-base font-bold"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {result.userDisplayName}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(0, 0, 0, 0.03)' }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: COLORS.warmGray }}
                  >
                    {t('storeScan.progress_label')}
                  </div>
                  <div
                    className="text-2xl font-bold"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {result.windowStoreCount}
                    <span
                      className="text-sm ml-1"
                      style={{ color: COLORS.warmGray }}
                    >
                      / {result.lotteryThreshold}
                    </span>
                  </div>
                </div>
                <div
                  className="rounded-xl p-3 flex items-center"
                  style={{ background: 'rgba(0, 0, 0, 0.03)' }}
                >
                  <div className="flex items-start gap-2">
                    {result.hasLotteryEntry ? (
                      <Ticket className="w-5 h-5 mt-0.5" style={{ color: '#16a34a' }} />
                    ) : result.canEnterLottery ? (
                      <Ticket className="w-5 h-5 mt-0.5" style={{ color: COLORS.champagneGold }} />
                    ) : (
                      <Clock className="w-5 h-5 mt-0.5" style={{ color: COLORS.warmGray }} />
                    )}
                    <div
                      className="text-xs font-semibold leading-tight"
                      style={{ color: COLORS.charcoal }}
                    >
                      {result.hasLotteryEntry
                        ? t('storeScan.lottery_entered')
                        : result.canEnterLottery
                        ? t('storeScan.lottery_ready')
                        : t('storeScan.more_stores').replace(
                            '{n}',
                            String(
                              Math.max(
                                0,
                                result.lotteryThreshold - result.windowStoreCount
                              )
                            )
                          )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRetry}
                  size="lg"
                  className="flex-1 rounded-xl font-bold"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                  }}
                >
                  <ScanLine className="w-4 h-4 mr-2" />
                  {t('storeScan.scan_next')}
                </Button>
                <Button
                  onClick={handleClose}
                  size="lg"
                  variant="outline"
                  className="rounded-xl font-bold"
                >
                  {t('storeScan.done')}
                </Button>
              </div>
            </Card>
          )}

          {!result && resultError && (
            <Card
              className="p-6 rounded-2xl shadow-lg"
              style={{
                background: '#FFFFFF',
                border: `1px solid rgba(220, 38, 38, 0.2)`,
              }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-destructive/10">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h2
                className="text-lg font-bold text-center mb-2"
                style={{ color: COLORS.deepNavy }}
              >
                {t('storeScan.error_title')}
              </h2>
              <p
                className="text-sm text-center mb-5"
                style={{ color: COLORS.warmGray }}
              >
                {resultError}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleRetry}
                  size="lg"
                  className="flex-1 rounded-xl font-bold"
                  style={{
                    background: COLORS.goldGradient,
                    color: COLORS.deepNavy,
                  }}
                >
                  {t('storeScan.retry')}
                </Button>
                <Button
                  onClick={handleClose}
                  size="lg"
                  variant="outline"
                  className="rounded-xl font-bold"
                >
                  {t('storeScan.done')}
                </Button>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
