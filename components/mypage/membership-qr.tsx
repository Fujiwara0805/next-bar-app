'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Loader2,
  QrCode,
  ScanLine,
  X,
  AlertCircle,
  Stamp,
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

const REFRESH_INTERVAL_SEC = 90;
const SCANNER_REGION_ID = 'mypage-qr-scanner-region';
const CUSTOMER_DEVICE_ID_KEY = 'nikenme:customer-device-id';

const BG_OFFWHITE = '#F7F3E9';
const NAVY = '#13294b';
const BRASS = '#ffc82c';
const COPPER = '#B87333';
const GOLD_GRADIENT = '#ffc82c';

/** 会員証表示中に参加イベントのスタンプ進捗をポーリングする間隔（ms） */
const PROGRESS_POLL_MS = 6000;

type StampEvent = {
  id: string;
  title: string;
  stamp_goal: number;
  stamp_count: number;
  goal_reached: boolean;
};

function getCustomerDeviceId(): string {
  const existing = localStorage.getItem(CUSTOMER_DEVICE_ID_KEY);
  if (existing && /^[A-Za-z0-9_-]{16,80}$/.test(existing)) {
    return existing;
  }
  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`;
  localStorage.setItem(CUSTOMER_DEVICE_ID_KEY, generated);
  return generated;
}

/**
 * 会員証QR（来店チェックイン用）＋ 店舗QRスキャナー。
 * 旧 `/mypage/qr` ページを会員証ページ（/mypage）にインライン統合したもの。
 * 認証・プロフィール必須チェックは親（/mypage）が行う前提で、本コンポーネントは
 * 表示と更新・スキャナーのみを担う。
 */
export function MembershipQr({ displayName }: { displayName: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_SEC);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 参加イベントのスタンプ進捗（会員証表示中だけポーリングして即時反映する）
  const [stampEvents, setStampEvents] = useState<StampEvent[]>([]);
  const prevCountsRef = useRef<Record<string, number>>({});

  // 店舗QR読み取りモード
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerLockRef = useRef(false);

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
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId: getCustomerDeviceId() }),
      });
      if (!res.ok) {
        throw new Error('generate_failed');
      }
      const json = (await res.json()) as { u: string; t: number; s: string; d?: string };
      const url = new URL('/c', resolveSiteUrl());
      url.searchParams.set('u', json.u);
      url.searchParams.set('t', String(json.t));
      url.searchParams.set('s', json.s);
      if (json.d) url.searchParams.set('d', json.d);
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
    if (!user) return;
    regenerate();
  }, [user, regenerate]);

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

  // 参加イベントのスタンプ進捗を取得。会員証を店舗にスキャンされてスタンプが
  // 増えたら、このポーリングでカウントが更新され「スタンプGET！」を通知する。
  const fetchProgress = useCallback(async () => {
    if (!user) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/me/joined-events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const evs: StampEvent[] = (json.events ?? []).map(
        (e: {
          id: string;
          title: string;
          stamp_goal?: number;
          stamp_count?: number;
          goal_reached?: boolean;
        }) => ({
          id: e.id,
          title: e.title,
          stamp_goal: e.stamp_goal ?? 3,
          stamp_count: e.stamp_count ?? 0,
          goal_reached: e.goal_reached ?? false,
        })
      );
      // 既知イベントでカウントが増えていたら通知（初回ロードでは出さない）
      const prev = prevCountsRef.current;
      const increased = evs.some(
        (e) => prev[e.id] != null && e.stamp_count > prev[e.id]
      );
      prevCountsRef.current = Object.fromEntries(
        evs.map((e) => [e.id, e.stamp_count])
      );
      setStampEvents(evs);
      if (increased) toast.success('スタンプGET！', { className: 'bg-muted' });
    } catch {
      // 取得失敗は無視（次のポーリングで再取得）
    }
  }, [user]);

  // 会員証を表示している間だけポーリング（このコンポーネントはモーダルを
  // 開いた時のみマウントされる）。タブが非表示の間はスキップ。
  useEffect(() => {
    if (!user) return;
    fetchProgress();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchProgress();
    }, PROGRESS_POLL_MS);
    return () => clearInterval(id);
  }, [user, fetchProgress]);

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
          setScannerError(t('mypageQr.scanner_invalid'));
          return;
        }
        scannerLockRef.current = true;
        stopScanner();
        // 同一サイト内なのでクライアントナビゲーションで遷移
        router.push(`/liff/store-checkin?store=${storeIdParam}&v=1`);
      } catch {
        setScannerError(t('mypageQr.scanner_decode_failed'));
      }
    },
    [router, stopScanner, t]
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
      setScannerError(t('mypageQr.scanner_camera_error'));
    }
  }, [handleDecoded, t]);

  useEffect(() => {
    if (!scannerOpen) return;
    scannerLockRef.current = false;
    startScanner();
    return () => {
      stopScanner();
    };
  }, [scannerOpen, startScanner, stopScanner]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
      <div
        className="rounded-2xl p-6 mb-3 relative overflow-hidden"
        style={{
          background: 'white',
          border: `1px solid ${BRASS}33`,
          boxShadow: '0 12px 32px rgba(19, 41, 75, 0.10)',
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: GOLD_GRADIENT }} />
        <div className="flex items-center justify-center gap-2 mb-4">
          <span
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: COPPER }}
          >
            {t('mypageQr.badge')}
          </span>
        </div>
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
              <div className="w-[240px] h-[240px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: COPPER }} />
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Customer Check-in QR"
                className={`w-[240px] h-[240px] transition-opacity ${
                  generating ? 'opacity-40' : 'opacity-100'
                }`}
              />
            ) : (
              <div
                className="w-[240px] h-[240px] flex items-center justify-center text-sm"
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

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <div
              className="basis-full flex items-center justify-center gap-1.5 text-xs"
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
            <Button
              size="sm"
              onClick={() => setScannerOpen(true)}
              disabled={generating}
              style={{
                background: GOLD_GRADIENT,
                color: NAVY,
                border: `1.5px solid ${BRASS}`,
              }}
              className="rounded-xl font-bold"
            >
              <ScanLine className="w-4 h-4 mr-2" />
              {t('mypageQr.store_scan_start')}
            </Button>
          </div>

          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </div>
      </div>

      {/* スタンプ進捗（参加イベントのみ）。店舗が会員証QRをスキャンすると
          ポーリングでカウントが更新され、ユーザー側に即時反映される。 */}
      {stampEvents.length > 0 && (
        <div
          className="rounded-2xl p-4 mb-3 relative overflow-hidden"
          style={{
            background: 'white',
            border: `1px solid ${BRASS}33`,
            boxShadow: '0 8px 22px rgba(19, 41, 75, 0.08)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: GOLD_GRADIENT }} />
          <div className="flex items-center gap-1.5 mb-3">
            <Stamp className="w-4 h-4" style={{ color: COPPER }} />
            <span className="text-xs font-bold" style={{ color: NAVY }}>
              スタンプ進捗
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(19,41,75,0.5)' }}>
              スキャンで自動更新
            </span>
          </div>
          <div className="space-y-3">
            {stampEvents.map((ev) => {
              const goal = Math.max(1, ev.stamp_goal);
              const filled = Math.min(ev.stamp_count, goal);
              return (
                <div key={ev.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold truncate pr-2" style={{ color: NAVY }}>
                      🎫 {ev.title}
                    </span>
                    <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: NAVY }}>
                      {filled} / {goal}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: goal }).map((_, i) => {
                      const done = i < filled;
                      return (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={
                            done
                              ? { background: BRASS, border: `1px solid ${BRASS}` }
                              : { background: 'transparent', border: `1.5px dashed ${COPPER}66` }
                          }
                        >
                          {done ? (
                            <Stamp className="w-3.5 h-3.5" style={{ color: NAVY }} strokeWidth={2.5} />
                          ) : (
                            <span className="text-[10px] font-bold" style={{ color: `${COPPER}99` }}>
                              {i + 1}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 店舗QRスキャナーモーダル（会員証モーダル等の transform 配下でも全画面表示
          できるよう、body 直下へポータルで描画する。z-index はモーダル(50)より上） */}
      {scannerOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(10, 10, 10, 0.92)' }}
        >
          <div className="w-full max-w-md mx-auto px-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-base font-semibold text-white">
                {t('mypageQr.scanner_modal_title')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setScannerOpen(false);
                  setScannerError(null);
                }}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                aria-label={t('common.close')}
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
              <span>{t('mypageQr.scanner_aim_help')}</span>
            </div>

            {scannerError && (
              <div className="mt-3 flex items-start gap-2 text-xs bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-white/90">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{scannerError}</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
