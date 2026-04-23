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
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading-screen';

const REFRESH_INTERVAL_SEC = 90;

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
    <div className="min-h-screen bg-background pb-16 safe-top">
      <div className="max-w-md mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="h-px w-6 bg-brass-500" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-500">
                {t('mypageQr.badge')}
              </span>
              <div className="h-px w-6 bg-brass-500" />
            </div>
            <h1 className="text-xl font-bold mb-1">{t('mypageQr.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('mypageQr.subtitle')}
            </p>
          </div>

          <Card className="p-6 mb-4">
            <div className="flex flex-col items-center">
              <div className="p-4 rounded-2xl bg-cream-50 border border-brass-500/30 shadow-md">
                {generating && !qrDataUrl ? (
                  <div className="w-[280px] h-[280px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-brass-500" />
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
                  <div className="w-[280px] h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                    {t('mypageQr.generate_failed')}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <QrCode className="w-4 h-4" />
                <span className="font-medium text-foreground">{displayName}</span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {generating
                      ? t('mypageQr.refreshing')
                      : t('mypageQr.refresh_in').replace(
                          '{n}',
                          String(secondsLeft)
                        )}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => regenerate()}
                  disabled={generating}
                >
                  {t('mypageQr.tap_to_refresh')}
                </Button>
              </div>

              {error && (
                <p className="mt-3 text-xs text-destructive">{error}</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-brass-500" />
              <h2 className="font-semibold text-sm">
                {t('mypageQr.how_to_use_title')}
              </h2>
            </div>
            <ol className="text-sm space-y-2 list-decimal ml-5 text-muted-foreground">
              <li>{t('mypageQr.how_to_use_1')}</li>
              <li>{t('mypageQr.how_to_use_2')}</li>
              <li>
                {t('mypageQr.how_to_use_3').replace(
                  '{sec}',
                  String(REFRESH_INTERVAL_SEC)
                )}
              </li>
            </ol>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
