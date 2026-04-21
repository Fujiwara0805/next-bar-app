'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, CameraOff, ScanLine, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading-screen';

type ScannerState = 'idle' | 'starting' | 'scanning' | 'stopped' | 'error';

const QR_REGION_ID = 'nikenme-qr-region';

export default function ScanPage() {
  const router = useRouter();
  const { user, accountType, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const scannerRef = useRef<any>(null);
  const lockRef = useRef(false);
  const [state, setState] = useState<ScannerState>('idle');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?role=customer&redirect=/mypage/scan');
      return;
    }
    if (accountType !== 'customer') {
      router.replace('/mypage');
      return;
    }
  }, [authLoading, user, accountType, router]);

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

  const handleDecodedText = useCallback(
    (decoded: string) => {
      if (lockRef.current) return;

      // /check-in?s=...&sig=... を抽出
      try {
        const url = new URL(decoded, window.location.origin);
        if (!url.pathname.endsWith('/check-in')) {
          setError(t('scan.unsupported_qr'));
          return;
        }
        const storeId = url.searchParams.get('s');
        const sig = url.searchParams.get('sig');
        if (!storeId || !sig) {
          setError(t('scan.unsupported_qr'));
          return;
        }
        lockRef.current = true;
        stopScanner();
        router.replace(
          `/check-in?s=${encodeURIComponent(storeId)}&sig=${encodeURIComponent(sig)}`
        );
      } catch {
        setError(t('scan.unsupported_qr'));
      }
    },
    [router, stopScanner, t]
  );

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setState('starting');
    setError('');
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

      // 背面カメラ優先: exact指定を試み、失敗したらフォールバック
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
      console.error('[scan] start error', err);
      setState('error');
      setError(t('scan.camera_error'));
    }
  }, [handleDecodedText, t]);

  useEffect(() => {
    if (authLoading || !user || accountType !== 'customer') return;
    startScanner();
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, accountType]);

  const handleRetry = async () => {
    await stopScanner();
    lockRef.current = false;
    setState('idle');
    setError('');
    startScanner();
  };

  if (authLoading || !user || accountType !== 'customer') {
    return <LoadingScreen size="lg" />;
  }

  return (
    <div className="min-h-screen bg-black text-white safe-top">
      <div className="max-w-md mx-auto px-4 py-6">
        <button
          onClick={() => {
            stopScanner();
            router.back();
          }}
          className="flex items-center gap-1 text-sm text-white/70 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold mb-1">{t('scan.title')}</h1>
          <p className="text-sm text-white/60 mb-4">{t('scan.subtitle')}</p>

          <Card className="relative aspect-square overflow-hidden bg-black border-white/20 mb-4">
            <div id={QR_REGION_ID} className="w-full h-full" />

            {/* オーバーレイ: スキャンフレーム */}
            {state === 'scanning' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative w-60 h-60">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
                  <motion.div
                    className="absolute left-0 right-0 h-[2px] bg-primary shadow-[0_0_8px_rgba(0,0,0,0.4)]"
                    animate={{ top: ['5%', '95%', '5%'] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              </div>
            )}

            {state === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                <Camera className="w-10 h-10 mb-3 animate-pulse text-white/70" />
                <p className="text-sm text-white/70">{t('scan.starting')}</p>
              </div>
            )}

            {state === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
                <CameraOff className="w-10 h-10 mb-3 text-destructive" />
                <p className="text-sm text-white/80 mb-4">
                  {error || t('scan.camera_error')}
                </p>
                <Button size="sm" variant="secondary" onClick={handleRetry}>
                  {t('scan.retry')}
                </Button>
              </div>
            )}
          </Card>

          {state === 'scanning' && (
            <div className="flex items-center justify-center gap-2 text-sm text-white/70 mb-4">
              <ScanLine className="w-4 h-4" />
              <span>{t('scan.point_to_qr')}</span>
            </div>
          )}

          {error && state === 'scanning' && (
            <div className="flex items-start gap-2 text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg p-3 mb-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
