'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, MapPin, Ticket, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { toast } from 'sonner';

type CheckInResult = {
  storeId: string;
  storeName: string;
  isNewStampToday: boolean;
  todayStoreCount: number;
  lotteryThreshold: number;
  canEnterLottery: boolean;
  hasLotteryEntry: boolean;
  visitDate: string;
};

export default function CheckInPage() {
  return (
    <Suspense fallback={<LoadingScreen size="lg" />}>
      <CheckInPageInner />
    </Suspense>
  );
}

function CheckInPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLanguage();
  const { user, accountType, loading: authLoading } = useAuth();

  const storeId = params.get('s');
  const sig = params.get('sig');

  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [result, setResult] = useState<CheckInResult | null>(null);

  // 未ログイン: 顧客ログインへ誘導（復帰先付き）
  useEffect(() => {
    if (authLoading) return;
    if (!storeId || !sig) {
      setStatus('error');
      setErrorMsg(t('checkin.invalid_link'));
      return;
    }
    if (!user) {
      const redirect = `/check-in?s=${encodeURIComponent(storeId)}&sig=${encodeURIComponent(sig)}`;
      router.replace(`/login?role=customer&redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (accountType === 'store' || accountType === 'platform') {
      setStatus('error');
      setErrorMsg(t('checkin.customer_only'));
      return;
    }
  }, [authLoading, user, accountType, storeId, sig, router, t]);

  // チェックイン実行
  useEffect(() => {
    if (authLoading || !user || !storeId || !sig || status !== 'idle') return;
    if (accountType !== 'customer') return;

    const run = async () => {
      setStatus('processing');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setStatus('error');
          setErrorMsg(t('checkin.session_expired'));
          return;
        }
        const res = await fetch('/api/check-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ storeId, sig }),
        });
        const json = await res.json();
        if (!res.ok) {
          setStatus('error');
          setErrorMsg(json?.error ? t(`checkin.error.${json.error}`) || json.error : t('checkin.unknown_error'));
          return;
        }
        setResult(json as CheckInResult);
        setStatus('success');
      } catch (err) {
        console.error('[check-in] error', err);
        setStatus('error');
        setErrorMsg(t('checkin.unknown_error'));
      }
    };
    run();
  }, [authLoading, user, accountType, storeId, sig, status, t]);

  if (authLoading || !user || status === 'idle' || status === 'processing') {
    return <LoadingScreen size="lg" />;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background px-4 py-16 flex flex-col items-center justify-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">{t('checkin.error_title')}</h1>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">{errorMsg}</p>
        <Button onClick={() => router.push('/map')}>{t('checkin.back_to_map')}</Button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen bg-background pb-16 safe-top">
      <motion.div
        className="max-w-md mx-auto px-4 pt-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Check className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-1">
            {result.isNewStampToday ? t('checkin.stamp_added') : t('checkin.already_checked_in')}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">{result.storeName}</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">
                {t('checkin.today_visits')}
              </div>
              <div className="text-2xl font-bold">
                {result.todayStoreCount}
                <span className="text-sm text-muted-foreground ml-1">
                  / {result.lotteryThreshold}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">{t('checkin.status')}</div>
              <div className="text-sm font-semibold pt-1">
                {result.hasLotteryEntry
                  ? t('checkin.entered')
                  : result.canEnterLottery
                  ? t('checkin.lottery_eligible')
                  : `${Math.max(0, result.lotteryThreshold - result.todayStoreCount)} ${t('checkin.more_stores')}`}
              </div>
            </div>
          </div>

          {result.canEnterLottery && (
            <Link href="/profile/stamps?enter=1" className="block mb-3">
              <Button className="w-full" size="lg">
                <Ticket className="w-4 h-4 mr-2" />
                {t('checkin.enter_lottery')}
              </Button>
            </Link>
          )}

          <Link href="/map" className="block mb-2">
            <Button variant="outline" className="w-full">
              <MapPin className="w-4 h-4 mr-2" />
              {t('checkin.find_next_store')}
            </Button>
          </Link>

          <Link
            href="/profile/stamps"
            className="inline-flex items-center justify-center text-sm text-muted-foreground mt-4 hover:text-foreground"
          >
            {t('checkin.view_stamps')}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Card>
      </motion.div>
    </div>
  );
}
