'use client';

/**
 * 店内QRコード表示ページ (店舗管理)
 *
 * 顧客QRページ (`/mypage/qr`) と同じ簡素なレイアウトで、店舗が掲示する
 * セルフチェックイン用 QR を表示する。PDF / 印刷 / PNG 保存に対応。
 * 顧客がスマホでスキャンすると `/liff/store-checkin?store={storeId}&v=1`
 * へ遷移し、ジオフェンス検証を経てチェックインが完了する。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Download,
  Loader2,
  QrCode,
  Sparkles,
  ImageDown,
  ScanLine,
  X,
  AlertCircle,
  CheckCircle2,
  User,
  Ticket,
  Clock,
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { LoadingScreen } from '@/components/ui/loading-screen';

const POSTER_VERSION = '1';
const SCANNER_REGION_ID = 'store-qr-customer-scanner-region';

const BG_OFFWHITE = '#F7F3E9';
const NAVY = '#13294b';
const BRASS = '#ffc62d';
const COPPER = '#B87333';
const GOLD_GRADIENT =
  '#ffc52d';
const NAVY_GRADIENT =
  '#13294b';

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

function resolveSiteUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://nikenme.jp';
}

/**
 * data: URL を Blob 化する。
 * iOS Safari は <a download> + dataURL を確実にサポートしないため、
 * Blob URL に変換した上で Web Share API もしくは <a download> を使う。
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

type ShareResult = 'shared' | 'downloaded' | 'failed';

/**
 * Blob を Web Share API (files対応) でネイティブ共有シートに渡す。
 * 不可なら <a download> + Blob URL でフォールバック。
 * iOS でもネイティブ「ファイルに保存」「写真に保存」が出るため確実に保存できる。
 */
async function shareOrSaveFile(
  blob: Blob,
  filename: string,
  mimeType: string
): Promise<ShareResult> {
  try {
    if (typeof navigator !== 'undefined' && typeof File !== 'undefined') {
      const file = new File([blob], filename, { type: mimeType });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        try {
          await nav.share({ files: [file], title: filename });
          return 'shared';
        } catch (err) {
          // ユーザーがキャンセルしたケースは成功扱い
          if ((err as Error)?.name === 'AbortError') return 'shared';
          // それ以外はフォールバック
        }
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    // iOS Safari: 一部ケースで download が無視される。その場合は別タブで開いて長押し保存。
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'downloaded';
  } catch (err) {
    console.error('[shareOrSaveFile] error:', err);
    return 'failed';
  }
}

export default function StoreQrPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);
  const { user, accountType, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [storeName, setStoreName] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [scannerError, setScannerError] = useState<string>('');
  const [scanResult, setScanResult] = useState<CheckInResult | null>(null);
  const [scanResultError, setScanResultError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const scannerLockRef = useRef(false);

  // ページ背景を顧客QRと揃える
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

  // 認可: platform は owner_id 一致, store は email 一致 (poster と同パターン)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!accountType) return;
    if (accountType !== 'platform' && accountType !== 'store') {
      router.replace('/store/manage');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: storeRow, error } = await supabase
          .from('stores')
          .select('id, name, email, owner_id')
          .eq('id', storeId)
          .maybeSingle();
        if (cancelled) return;
        if (error || !storeRow) {
          router.replace('/store/manage');
          return;
        }
        if (accountType === 'platform') {
          if (storeRow.owner_id !== user.id) {
            router.replace('/store/manage');
            return;
          }
        } else if (accountType === 'store') {
          if (storeRow.email !== user.email) {
            router.replace('/store/manage');
            return;
          }
        }
        setStoreName(storeRow.name ?? '');
        setAuthChecked(true);
      } catch {
        if (!cancelled) router.replace('/store/manage');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, accountType, storeId, router]);

  const checkInUrl = useMemo(() => {
    const url = new URL('/liff/store-checkin', resolveSiteUrl());
    url.searchParams.set('store', storeId);
    url.searchParams.set('v', POSTER_VERSION);
    return url.toString();
  }, [storeId]);

  // QR 生成 (認可確定後のみ)
  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    (async () => {
      try {
        setGenerating(true);
        const dataUrl = await QRCode.toDataURL(checkInUrl, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 1024,
          color: { dark: '#13294b', light: '#FFFFFF' },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('[store/qr] generate error', err);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authChecked, checkInUrl]);

  const downloadQrAsPng = useCallback(async () => {
    if (!qrDataUrl) return;
    try {
      const blob = await dataUrlToBlob(qrDataUrl);
      const filename = `nikenme-checkin-${storeId.slice(0, 8)}.png`;
      const result = await shareOrSaveFile(blob, filename, 'image/png');
      if (result === 'failed') {
        toast.error(t('store_qr.png_save_failed'));
        return;
      }
      toast.success(t('store_qr.png_saved'), {
        description: t('store_qr.png_saved_description'),
      });
    } catch (err) {
      console.error('[store/qr] png save error', err);
      toast.error(t('store_qr.png_save_failed'));
    }
  }, [qrDataUrl, storeId, t]);

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

  const closeScanner = useCallback(async () => {
    await stopScanner();
    scannerLockRef.current = false;
    setScannerOpen(false);
    setScannerState('idle');
    setScannerError('');
    setScanResult(null);
    setScanResultError(null);
  }, [stopScanner]);

  const submitCheckIn = useCallback(
    async (payload: { u: string; t: number; s: string }) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setScanResultError(t('storeScan.error.unauthorized'));
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
          setScanResultError(
            translated === key ? t('storeScan.error.unknown') : translated
          );
          return;
        }
        setScanResult(json as CheckInResult);
      } catch (err) {
        console.error('[store/qr] scan submit error', err);
        setScanResultError(t('storeScan.error.unknown'));
      }
    },
    [storeId, t]
  );

  const handleDecodedText = useCallback(
    (decoded: string) => {
      if (scannerLockRef.current) return;
      try {
        const url = new URL(decoded, window.location.origin);
        if (!url.pathname.replace(/\/$/, '').endsWith('/c')) {
          setScannerError(t('storeScan.invalid_qr'));
          return;
        }
        const u = url.searchParams.get('u');
        const tParam = url.searchParams.get('t');
        const s = url.searchParams.get('s');
        if (!u || !tParam || !s || !/^\d+$/.test(tParam)) {
          setScannerError(t('storeScan.invalid_qr'));
          return;
        }
        scannerLockRef.current = true;
        setScannerState('paused');
        setScannerError('');
        stopScanner();
        submitCheckIn({ u, t: Number(tParam), s });
      } catch {
        setScannerError(t('storeScan.invalid_qr'));
      }
    },
    [stopScanner, submitCheckIn, t]
  );

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setScannerState('starting');
    setScannerError('');
    try {
      const mod = await import('html5-qrcode');
      const Html5Qrcode = mod.Html5Qrcode;
      const scanner = new Html5Qrcode(SCANNER_REGION_ID);
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
      setScannerState('scanning');
    } catch (err) {
      console.error('[store/qr] scanner start error', err);
      setScannerState('error');
      setScannerError(t('storeScan.camera_error'));
    }
  }, [handleDecodedText, t]);

  const handleScannerRetry = useCallback(async () => {
    await stopScanner();
    scannerLockRef.current = false;
    setScannerState('idle');
    setScannerError('');
    setScanResult(null);
    setScanResultError(null);
    startScanner();
  }, [startScanner, stopScanner]);

  useEffect(() => {
    if (!scannerOpen) return;
    scannerLockRef.current = false;
    setScannerState('idle');
    setScannerError('');
    setScanResult(null);
    setScanResultError(null);
    startScanner();
    return () => {
      stopScanner();
    };
  }, [scannerOpen, startScanner, stopScanner]);

  const handleDownloadPdf = useCallback(async () => {
    if (!qrDataUrl) return;
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const navy = '#13294b';
      const gold = '#C9A86C';

      doc.setFillColor(201, 168, 108);
      doc.rect(0, 0, pageWidth, 4, 'F');

      doc.setTextColor(navy);
      doc.setFontSize(10);
      doc.text('NIKENME+ CHECK-IN', pageWidth / 2, 25, { align: 'center' });

      doc.setDrawColor(gold);
      doc.setLineWidth(0.4);
      doc.line(pageWidth / 2 - 20, 28, pageWidth / 2 + 20, 28);

      // jsPDF は日本語フォント未対応なので ASCII のみで店舗名描画
      const isAsciiOnly = /^[\x20-\x7E]*$/.test(storeName);
      if (storeName && isAsciiOnly) {
        doc.setFontSize(20);
        doc.setTextColor(navy);
        doc.text(storeName, pageWidth / 2, 42, { align: 'center' });
      }

      const qrSize = 110;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = storeName && isAsciiOnly ? 60 : 50;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      const guideY = qrY + qrSize + 16;
      doc.setFontSize(13);
      doc.setTextColor(navy);
      doc.text('Scan to check in', pageWidth / 2, guideY, {
        align: 'center',
      });
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(
        'Open your camera or NIKENME+ scanner',
        pageWidth / 2,
        guideY + 7,
        { align: 'center' }
      );

      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text('powered by NIKENME+', pageWidth / 2, 285, { align: 'center' });

      // iOS Safari の Blob 共有 / 通常ブラウザの <a download> 両対応のため
      // doc.save() ではなく blob を取り出して shareOrSaveFile を使う。
      const pdfBlob = doc.output('blob') as Blob;
      const filename = `nikenme-checkin-${storeId.slice(0, 8)}.pdf`;
      const result = await shareOrSaveFile(pdfBlob, filename, 'application/pdf');
      if (result === 'failed') {
        // 最後の手段として PNG にフォールバック
        toast.warning(t('store_qr.pdf_failed'), {
          description: t('store_qr.pdf_failed_description'),
        });
        await downloadQrAsPng();
      }
    } catch (err) {
      console.error('[store/qr] pdf error, falling back to PNG:', err);
      toast.warning(t('store_qr.pdf_failed'), {
        description: t('store_qr.pdf_failed_description'),
      });
      await downloadQrAsPng();
    } finally {
      setDownloading(false);
    }
  }, [qrDataUrl, storeName, storeId, downloadQrAsPng, t]);

  if (authLoading || !user || !authChecked) {
    return <LoadingScreen size="lg" />;
  }

  return (
    <div
      className="min-h-screen pb-16 print:bg-white"
      style={{ background: BG_OFFWHITE }}
    >
      <header
        className="sticky top-0 z-20 safe-top print:hidden"
        style={{ background: NAVY_GRADIENT, borderBottom: `1px solid ${BRASS}33` }}
      >
        <div className="relative flex items-center justify-center p-4 max-w-md mx-auto">
          <h1
            className="text-lg font-light tracking-[0.2em]"
            style={{ color: '#FDFBF7' }}
          >
            {t('store_qr.header_title')}
          </h1>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CloseCircleButton
              size="md"
              aria-label={t('common.close')}
              onClick={() => router.push(`/store/manage/${storeId}/update`)}
            />
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 print:max-w-none print:p-0">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 text-center print:hidden">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="h-px w-6" style={{ background: BRASS }} />
              <span
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: COPPER }}
              >
                {t('store_qr.badge')}
              </span>
              <div className="h-px w-6" style={{ background: BRASS }} />
            </div>
            <h2 className="text-xl font-bold mb-1" style={{ color: NAVY }}>
              {t('store_qr.title')}
            </h2>
            <p className="text-sm" style={{ color: 'rgba(19, 41, 75, 0.65)' }}>
              {t('store_qr.subtitle')}
            </p>
          </div>

          {/* QR カード (印刷対象) */}
          <div ref={printRef} className="print:p-12">
            <div
              className="rounded-2xl p-6 mb-4 relative overflow-hidden print:shadow-none print:border-0 print:rounded-none"
              style={{
                background: 'white',
                border: `1px solid ${BRASS}33`,
                boxShadow: '0 12px 32px rgba(19, 41, 75, 0.10)',
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px] print:h-[6px]"
                style={{ background: GOLD_GRADIENT }}
              />
              <div className="flex flex-col items-center">
                {storeName && (
                  <div
                    className="mt-2 mb-3 text-base font-bold print:text-3xl text-center"
                    style={{ color: NAVY }}
                  >
                    {storeName}
                  </div>
                )}
                <div
                  className="p-4 rounded-2xl print:p-6 print:rounded-none"
                  style={{
                    background: BG_OFFWHITE,
                    border: `1px solid ${BRASS}50`,
                    boxShadow: `0 4px 14px ${BRASS}22`,
                  }}
                >
                  {generating || !qrDataUrl ? (
                    <div className="w-[280px] h-[280px] flex items-center justify-center">
                      <Loader2
                        className="w-8 h-8 animate-spin"
                        style={{ color: COPPER }}
                      />
                    </div>
                  ) : (
                    <img
                      src={qrDataUrl}
                      alt="Store Check-in QR"
                      className="w-[280px] h-[280px] print:w-[400px] print:h-[400px]"
                    />
                  )}
                </div>
                <div
                  className="mt-4 flex items-center gap-2 text-sm"
                  style={{ color: NAVY }}
                >
                  <QrCode className="w-4 h-4" style={{ color: COPPER }} />
                  <span className="font-semibold">
                    {t('store_qr.scan_instruction')}
                  </span>
                </div>
                <p
                  className="mt-1 text-xs print:text-base text-center"
                  style={{ color: 'rgba(19, 41, 75, 0.55)' }}
                >
                  {t('store_qr.scan_instruction_sub')}
                </p>
              </div>
            </div>
          </div>

          {/* アクションボタン: PDF出力 + QR画像で保存 (横並び) */}
          <div className="grid grid-cols-2 gap-3 mb-3 print:hidden">
            <Button
              onClick={handleDownloadPdf}
              disabled={generating || downloading || !qrDataUrl}
              size="lg"
              className="rounded-xl font-bold"
              style={{ background: GOLD_GRADIENT, color: NAVY }}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {t('store_qr.pdf_download')}
            </Button>
            <Button
              onClick={downloadQrAsPng}
              disabled={generating || !qrDataUrl}
              size="lg"
              variant="outline"
              className="rounded-xl font-bold"
              style={{
                background: 'white',
                color: NAVY,
                border: `1.5px solid ${BRASS}40`,
              }}
            >
              <ImageDown className="w-4 h-4 mr-2" />
              {t('store_qr.save_png')}
            </Button>
          </div>
          <div className="mb-5 print:hidden">
            <Button
              onClick={() => setScannerOpen(true)}
              size="lg"
              className="rounded-xl font-bold w-full"
              style={{ background: GOLD_GRADIENT, color: NAVY }}
            >
              <ScanLine className="w-4 h-4 mr-2" />
              {t('store_qr.scan_customer_qr')}
            </Button>
          </div>

          {/* セキュリティ注意事項 */}
          <div
            className="rounded-2xl p-5 print:hidden"
            style={{
              background: `${BRASS}10`,
              border: `1px solid ${BRASS}40`,
            }}
          >
            <div className="flex items-start gap-2">
              <Sparkles
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: COPPER }}
              />
              <div className="text-xs leading-relaxed" style={{ color: NAVY }}>
                <p className="font-semibold mb-1">
                  {t('store_qr.security_title')}
                </p>
                <p style={{ color: 'rgba(19, 41, 75, 0.7)' }}>
                  {t('store_qr.security_body')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            background: white !important;
          }
        }
      `}</style>

      {scannerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center print:hidden"
          style={{ background: 'rgba(10, 10, 10, 0.92)' }}
        >
          <div className="w-full max-w-md mx-auto px-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-base font-semibold text-white">
                {t('storeScan.title')}
              </h3>
              <button
                type="button"
                onClick={closeScanner}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {!scanResult && !scanResultError && (
              <>
                <div
                  className="aspect-square w-full rounded-2xl overflow-hidden relative"
                  style={{ background: '#0a0a0a' }}
                >
                  <div id={SCANNER_REGION_ID} className="w-full h-full" />

                  {scannerState === 'scanning' && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative w-60 h-60">
                        <div
                          className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg"
                          style={{ borderColor: BRASS }}
                        />
                        <div
                          className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg"
                          style={{ borderColor: BRASS }}
                        />
                        <div
                          className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg"
                          style={{ borderColor: BRASS }}
                        />
                        <div
                          className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg"
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
                  )}

                  {scannerState === 'starting' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                      <Loader2 className="w-10 h-10 mb-3 animate-spin text-white/70" />
                      <p className="text-sm text-white/80">
                        {t('storeScan.starting')}
                      </p>
                    </div>
                  )}

                  {scannerState === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
                      <AlertCircle className="w-10 h-10 mb-3 text-destructive" />
                      <p className="text-sm text-white/80 mb-4">
                        {scannerError || t('storeScan.camera_error')}
                      </p>
                      <Button size="sm" variant="secondary" onClick={handleScannerRetry}>
                        {t('storeScan.retry')}
                      </Button>
                    </div>
                  )}
                </div>

                {scannerState === 'scanning' && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/80">
                    <ScanLine className="w-4 h-4" />
                    <span>{t('storeScan.point_to_qr')}</span>
                  </div>
                )}

                {scannerError && scannerState === 'scanning' && (
                  <div className="mt-3 flex items-start gap-2 text-xs bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-white/90">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{scannerError}</span>
                  </div>
                )}
              </>
            )}

            {scanResult && (
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-500/10">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-center mb-1" style={{ color: NAVY }}>
                  {scanResult.isNewStamp
                    ? t('storeScan.new_stamp')
                    : t('storeScan.already_stamped')}
                </h2>
                <p className="text-xs text-center mb-4" style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
                  {scanResult.storeName}
                </p>

                <div className="rounded-xl p-4 mb-4 flex items-center gap-3 bg-black/[0.03]">
                  <User className="w-5 h-5" style={{ color: COPPER }} />
                  <div>
                    <div className="text-xs font-medium" style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
                      {t('storeScan.customer_label')}
                    </div>
                    <div className="text-base font-bold" style={{ color: NAVY }}>
                      {scanResult.userDisplayName}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl p-3 bg-black/[0.03]">
                    <div className="text-xs mb-1" style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
                      {t('storeScan.progress_label')}
                    </div>
                    <div className="text-2xl font-bold" style={{ color: NAVY }}>
                      {scanResult.windowStoreCount}
                      <span className="text-sm ml-1" style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
                        / {scanResult.lotteryThreshold}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl p-3 flex items-center bg-black/[0.03]">
                    <div className="flex items-start gap-2">
                      {scanResult.hasLotteryEntry ? (
                        <Ticket className="w-5 h-5 mt-0.5 text-green-600" />
                      ) : scanResult.canEnterLottery ? (
                        <Ticket className="w-5 h-5 mt-0.5" style={{ color: COPPER }} />
                      ) : (
                        <Clock className="w-5 h-5 mt-0.5" style={{ color: 'rgba(19, 41, 75, 0.55)' }} />
                      )}
                      <div className="text-xs font-semibold leading-tight" style={{ color: NAVY }}>
                        {scanResult.hasLotteryEntry
                          ? t('storeScan.lottery_entered')
                          : scanResult.canEnterLottery
                          ? t('storeScan.lottery_ready')
                          : t('storeScan.more_stores').replace(
                              '{n}',
                              String(
                                Math.max(
                                  0,
                                  scanResult.lotteryThreshold - scanResult.windowStoreCount
                                )
                              )
                            )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleScannerRetry}
                    size="lg"
                    className="flex-1 rounded-xl font-bold"
                    style={{ background: GOLD_GRADIENT, color: NAVY }}
                  >
                    <ScanLine className="w-4 h-4 mr-2" />
                    {t('storeScan.scan_next')}
                  </Button>
                  <Button
                    onClick={closeScanner}
                    size="lg"
                    variant="outline"
                    className="rounded-xl font-bold"
                  >
                    {t('storeScan.done')}
                  </Button>
                </div>
              </div>
            )}

            {!scanResult && scanResultError && (
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-destructive/10">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-lg font-bold text-center mb-2" style={{ color: NAVY }}>
                  {t('storeScan.error_title')}
                </h2>
                <p className="text-sm text-center mb-5" style={{ color: 'rgba(19, 41, 75, 0.65)' }}>
                  {scanResultError}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleScannerRetry}
                    size="lg"
                    className="flex-1 rounded-xl font-bold"
                    style={{ background: GOLD_GRADIENT, color: NAVY }}
                  >
                    {t('storeScan.retry')}
                  </Button>
                  <Button
                    onClick={closeScanner}
                    size="lg"
                    variant="outline"
                    className="rounded-xl font-bold"
                  >
                    {t('storeScan.done')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
