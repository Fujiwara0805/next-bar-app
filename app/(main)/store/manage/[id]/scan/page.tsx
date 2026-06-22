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
  Calendar,
  StickyNote,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { useAppMode } from '@/lib/app-mode-context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';

type ScannerState = 'idle' | 'starting' | 'scanning' | 'paused' | 'error';

type EventStampProgress = {
  eventId: string;
  eventTitle: string;
  stampCount: number;
  stampGoal: number;
  goalReached: boolean;
  isNewStamp: boolean;
  isNewlyCompleted: boolean;
  rewardText: string | null;
  rewardClaimedAt: string | null;
};

type CheckInResult = {
  storeId: string;
  storeName: string;
  userId: string;
  userDisplayName: string;
  eventStamp: EventStampProgress | null;
  couponRedeemed?: number;
  customer?: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    line_linked: boolean;
    visit_count: number;
    last_visit_at: string;
    previous_visit_at: string | null;
    attributes: {
      address?: string;
      age?: string;
      occupation?: string;
      gender?: string;
    };
    memo: {
      order_notes: string | null;
      preference_notes: string | null;
      conversation_notes: string | null;
    } | null;
  };
};

const QR_REGION_ID = 'store-scan-qr-region';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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
  // 特典引換（goalReached の顧客に店舗が手渡した記録）
  const [claimedAt, setClaimedAt] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

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
      router.replace('/login');
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
    async (payload: { u: string; t: number; s: string; d?: string }) => {
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
        const r = json as CheckInResult;
        setResult(r);
        setClaimedAt(r.eventStamp?.rewardClaimedAt ?? null);
        setClaimError(null);
      } catch (err) {
        console.error('[store/scan] submit error', err);
        setResultError(t('storeScan.error.unknown'));
      }
    },
    [storeId, t]
  );

  const handleClaimReward = useCallback(async () => {
    if (!result?.eventStamp || claiming) return;
    setClaiming(true);
    setClaimError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setClaimError(t('storeScan.redeem_error'));
        return;
      }
      const res = await fetch(`/api/stores/${storeId}/event-stamp-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: result.userId,
          eventId: result.eventStamp.eventId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setClaimError(t('storeScan.redeem_error'));
        return;
      }
      setClaimedAt(json.rewardClaimedAt ?? new Date().toISOString());
    } catch (err) {
      console.error('[store/scan] claim error', err);
      setClaimError(t('storeScan.redeem_error'));
    } finally {
      setClaiming(false);
    }
  }, [result, claiming, storeId, t]);

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
        const d = url.searchParams.get('d') ?? undefined;
        if (!u || !tParam || !s || !/^\d+$/.test(tParam)) {
          setErrorMsg(t('storeScan.invalid_qr'));
          return;
        }
        lockRef.current = true;
        setState('paused');
        stopScanner();
        setErrorMsg('');
        submitCheckIn({ u, t: Number(tParam), s, d });
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
    setClaimedAt(null);
    setClaimError(null);
    setClaiming(false);
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
                <CheckCircle2 className="w-8 h-8" style={{ color: '#3E8E6B' }} />
              </motion.div>

              {(() => {
                const es = result.eventStamp;
                const title = !es
                  ? '来店を記録しました'
                  : es.isNewlyCompleted
                  ? 'コンプリート！特典GET 🎉'
                  : es.goalReached
                  ? '特典 獲得済み'
                  : es.isNewStamp
                  ? 'スタンプを記録しました'
                  : 'チェックイン済み';
                return (
                  <h2
                    className="text-xl font-bold text-center mb-1"
                    style={{ color: COLORS.deepNavy }}
                  >
                    {title}
                  </h2>
                );
              })()}
              <p
                className="text-xs text-center mb-2"
                style={{ color: COLORS.warmGray }}
              >
                {result.storeName}
              </p>

              {/* 電子クーポンを同時に消し込んだ場合のバッジ */}
              {(result.couponRedeemed ?? 0) > 0 && (
                <div className="flex justify-center mb-4">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: '#13294b', color: '#ffc82c' }}
                  >
                    🎟 クーポンを消し込みました
                  </span>
                </div>
              )}

              <div
                className="rounded-xl p-4 mb-4 flex items-center gap-3"
                style={{ background: 'rgba(201, 168, 108, 0.08)' }}
              >
                {result.customer?.avatar_url ? (
                  <img
                    src={result.customer.avatar_url}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5" style={{ color: COLORS.champagneGold }} />
                )}
                <div className="min-w-0">
                  <div
                    className="text-xs font-medium"
                    style={{ color: COLORS.warmGray }}
                  >
                    {t('storeScan.customer_label')}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="text-base font-bold truncate"
                      style={{ color: COLORS.deepNavy }}
                    >
                      {result.userDisplayName}
                    </div>
                    {result.customer?.line_linked && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(62, 142, 107, 0.12)', color: '#3E8E6B' }}>
                        <MessageCircle className="w-3 h-3" />
                        LINE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {result.customer && (
                <div
                  className="rounded-xl p-4 mb-4 space-y-3"
                  style={{ background: 'rgba(19, 41, 75, 0.04)' }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: COLORS.warmGray }}>この店舗の来店回数</p>
                      <p className="text-xl font-bold" style={{ color: COLORS.deepNavy }}>{result.customer.visit_count}回</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: COLORS.warmGray }}>前回来店</p>
                      <p className="text-sm font-bold flex items-center gap-1" style={{ color: COLORS.deepNavy }}>
                        <Calendar className="w-3.5 h-3.5" />
                        {fmtDate(result.customer.previous_visit_at)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: COLORS.charcoal }}>
                    <span>エリア: <strong>{result.customer.attributes.address || '—'}</strong></span>
                    <span>年代: <strong>{result.customer.attributes.age || '—'}</strong></span>
                    <span>職業: <strong>{result.customer.attributes.occupation || '—'}</strong></span>
                    <span>性別: <strong>{result.customer.attributes.gender || '—'}</strong></span>
                  </div>
                  {result.customer.memo && (
                    <div className="pt-3 border-t space-y-2" style={{ borderColor: 'rgba(19, 41, 75, 0.08)' }}>
                      <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: COLORS.warmGray }}>
                        <StickyNote className="w-3.5 h-3.5" />
                        店舗メモ
                      </p>
                      {[
                        ['注文', result.customer.memo.order_notes],
                        ['好み', result.customer.memo.preference_notes],
                        ['接客', result.customer.memo.conversation_notes],
                      ].filter(([, text]) => Boolean(text)).slice(0, 3).map(([label, text]) => (
                        <p key={label} className="text-xs leading-relaxed" style={{ color: COLORS.charcoal }}>
                          <span className="font-bold">{label}: </span>{text}
                        </p>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl font-bold"
                    onClick={() => router.push(`/store/manage/${storeId}/customers`)}
                  >
                    顧客データで詳しく見る
                  </Button>
                </div>
              )}

              {result.eventStamp && (
                <div
                  className="rounded-xl p-4 mb-5"
                  style={{ background: 'rgba(0, 0, 0, 0.03)' }}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span
                      className="text-xs font-semibold truncate pr-2"
                      style={{ color: COLORS.champagneGold }}
                    >
                      🎫 {result.eventStamp.eventTitle}
                    </span>
                    <span
                      className="text-2xl font-bold tabular-nums shrink-0"
                      style={{ color: COLORS.deepNavy }}
                    >
                      {Math.min(result.eventStamp.stampCount, result.eventStamp.stampGoal)}
                      <span className="text-sm ml-0.5" style={{ color: COLORS.warmGray }}>
                        / {result.eventStamp.stampGoal}
                      </span>
                    </span>
                  </div>
                  {result.eventStamp.goalReached ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-start gap-2">
                        <Ticket className="w-5 h-5 mt-0.5 shrink-0" style={{ color: COLORS.champagneGold }} />
                        <div className="text-xs font-semibold leading-tight" style={{ color: COLORS.charcoal }}>
                          コンプリート — 特典をお渡しください
                          {result.eventStamp.rewardText?.trim() && (
                            <span className="block font-bold mt-0.5" style={{ color: COLORS.deepNavy }}>
                              {result.eventStamp.rewardText.trim()}
                            </span>
                          )}
                        </div>
                      </div>
                      {claimedAt ? (
                        <div
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
                          style={{ background: 'rgba(62, 142, 107, 0.12)', color: '#3E8E6B' }}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {t('storeScan.reward_redeemed')}（{fmtDate(claimedAt)}）
                        </div>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleClaimReward}
                            disabled={claiming}
                            className="w-full rounded-xl font-bold"
                            style={{ background: COLORS.goldGradient, color: COLORS.deepNavy }}
                          >
                            <Ticket className="w-4 h-4 mr-1.5" />
                            {claiming ? t('storeScan.redeeming') : t('storeScan.redeem_reward')}
                          </Button>
                          {claimError && (
                            <p className="text-xs text-center" style={{ color: '#DC2626' }}>
                              {claimError}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4" style={{ color: COLORS.warmGray }} />
                      <span className="text-xs font-semibold" style={{ color: COLORS.charcoal }}>
                        あと{Math.max(0, result.eventStamp.stampGoal - result.eventStamp.stampCount)}店舗でコンプリート
                      </span>
                    </div>
                  )}
                </div>
              )}

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
