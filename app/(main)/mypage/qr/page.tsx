'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Info, Loader2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';

const REFRESH_INTERVAL_SEC = 90;

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
  }, [authLoading, user, accountType, router]);

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
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#FDFBF7' }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <h1 className="text-lg font-light tracking-[0.2em]" style={{ color: '#FDFBF7' }}>
            チェックインQR
          </h1>
          <div className="w-12" />
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
    </div>
  );
}
