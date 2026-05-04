'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Stamp,
  Ticket,
  Mail,
  Loader2,
  CheckCircle2,
  MapPin,
  Clock,
  Trophy,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useLiff } from '@/lib/line/context';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ja, enUS, ko, zhCN } from 'date-fns/locale';

const LOTTERY_THRESHOLD = 3;
const LOTTERY_MAX = 5;
const WINDOW_HOURS = 12;

const STAMP_ICON_URL =
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png';

const BG_OFFWHITE = '#F7F3E9';
const NAVY = '#13294b';
const BRASS = '#ffc62d';
const COPPER = '#B87333';
const GOLD_GRADIENT = 'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)';
const NAVY_GRADIENT = 'linear-gradient(165deg, #13294b 0%, #1A3562 50%, #1F57A4 100%)';

type CheckIn = {
  id: string;
  store_id: string;
  visit_date: string;
  checked_in_at: string;
  store_name: string | null;
};

type Entry = {
  id: string;
  entry_date: string;
  email: string;
  status: string;
  visited_store_ids: string[];
};

function tokyoDateString(): string {
  const now = new Date();
  const tokyoMs = now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60 * 1000;
  return new Date(tokyoMs).toISOString().slice(0, 10);
}

export default function StampsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, accountType, loading: authLoading, signInWithLine } = useAuth();
  const { isLiffReady, isLineLoggedIn, isInLine, liffLogin } = useLiff();
  const [autoSigningIn, setAutoSigningIn] = useState(false);
  const { t, language } = useLanguage();

  const dateLocale = useMemo(() => {
    switch (language) {
      case 'en':
        return enUS;
      case 'ko':
        return ko;
      case 'zh':
        return zhCN;
      default:
        return ja;
    }
  }, [language]);

  const [loading, setLoading] = useState(true);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [cutoffIso, setCutoffIso] = useState<string>('');
  const [todayEntry, setTodayEntry] = useState<Entry | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(params.get('enter') === '1');

  const today = tokyoDateString();

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

  // LINE リッチメニューから来たユーザーは LIFF コンテキスト内なので、
  // ログイン画面を出さずに自動で LINE→Supabase セッション交換を行う。
  // 通常ブラウザ (LIFF 不在) の場合は従来どおりログイン画面に誘導。
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (accountType && accountType !== 'customer') {
        router.replace('/map');
      }
      return;
    }
    // 未認証 — まずは LIFF 準備を待つ
    if (!isLiffReady) return;
    if (autoSigningIn) return;

    // LINE 内で LINE ログイン済み → Supabase セッションへ自動交換
    if (isLineLoggedIn) {
      setAutoSigningIn(true);
      signInWithLine().finally(() => setAutoSigningIn(false));
      return;
    }
    // LINE 内 (LIFF) だが未ログイン → liff.login() でリダイレクト (戻ってきたら再評価)
    if (isInLine) {
      liffLogin();
      return;
    }
    // 通常ブラウザ → 従来どおりログイン画面に誘導
    router.replace('/login?redirect=/profile/stamps');
  }, [
    authLoading,
    user,
    accountType,
    isLiffReady,
    isLineLoggedIn,
    isInLine,
    autoSigningIn,
    signInWithLine,
    liffLogin,
    router,
  ]);

  useEffect(() => {
    if (!user || accountType !== 'customer') return;
    const run = async () => {
      setLoading(true);

      // 直近のエントリ created_at を取得してカットオフ算出
      const { data: latestEntry } = await supabase
        .from('stamp_rally_entries')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = Date.now();
      const windowStartMs = now - WINDOW_HOURS * 60 * 60 * 1000;
      const entryMs = latestEntry?.created_at
        ? new Date(latestEntry.created_at).getTime()
        : 0;
      const cutoffIsoLocal = new Date(
        Math.max(windowStartMs, entryMs)
      ).toISOString();
      setCutoffIso(cutoffIsoLocal);

      const { data: checkInRows } = await supabase
        .from('store_check_ins')
        .select('id, store_id, visit_date, checked_in_at')
        .eq('user_id', user.id)
        .order('checked_in_at', { ascending: false })
        .limit(100);

      const storeIds = Array.from(
        new Set((checkInRows ?? []).map((r) => r.store_id))
      );
      const storeNameMap = new Map<string, string>();
      if (storeIds.length > 0) {
        const { data: stores } = await supabase
          .from('stores')
          .select('id, name')
          .in('id', storeIds);
        for (const s of stores ?? []) storeNameMap.set(s.id, s.name);
      }

      setCheckIns(
        (checkInRows ?? []).map((r) => ({
          id: r.id,
          store_id: r.store_id,
          visit_date: r.visit_date,
          checked_in_at: r.checked_in_at,
          store_name: storeNameMap.get(r.store_id) ?? null,
        }))
      );

      const { data: entry } = await supabase
        .from('stamp_rally_entries')
        .select('id, entry_date, email, status, visited_store_ids')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();
      setTodayEntry(entry ?? null);

      const defaultEmail = profile?.email ?? user.email ?? '';
      if (defaultEmail && !defaultEmail.endsWith('@line.nikenme.local')) {
        setEmail(defaultEmail);
      }

      setLoading(false);
    };
    run();
  }, [user, accountType, today, profile]);

  const windowStoreCount = useMemo(() => {
    if (!cutoffIso) return 0;
    return new Set(
      checkIns
        .filter((c) => c.checked_in_at >= cutoffIso)
        .map((c) => c.store_id)
    ).size;
  }, [checkIns, cutoffIso]);

  const eligible = !todayEntry && windowStoreCount >= LOTTERY_THRESHOLD;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error(t('checkin.session_expired'));
        return;
      }
      const res = await fetch('/api/stamp-rally/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(
          json?.error === 'already_entered'
            ? t('stamps.already_entered')
            : json?.error === 'threshold_not_met'
            ? t('stamps.threshold_not_met')
            : json?.error === 'invalid_email'
            ? t('stamps.invalid_email')
            : t('stamps.submit_failed')
        );
        return;
      }
      toast.success(t('stamps.entry_success'));
      setTodayEntry(json.entry);
      setShowEntryForm(false);
    } catch (err) {
      console.error('[stamps entry] error', err);
      toast.error(t('stamps.submit_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || accountType !== 'customer') {
    return <LoadingScreen size="lg" />;
  }

  // 日付ごとにグループ化
  const grouped = new Map<string, CheckIn[]>();
  for (const c of checkIns) {
    const arr = grouped.get(c.visit_date) ?? [];
    arr.push(c);
    grouped.set(c.visit_date, arr);
  }
  const sortedDates = Array.from(grouped.keys()).sort((a, b) => (a < b ? 1 : -1));

  const progressPct = Math.min(
    100,
    Math.round((windowStoreCount / LOTTERY_THRESHOLD) * 100)
  );
  const remainingForLottery = Math.max(0, LOTTERY_THRESHOLD - windowStoreCount);
  const stampSlots = Array.from(
    { length: LOTTERY_MAX },
    (_, i) => i < windowStoreCount
  );

  const whiteCardStyle: React.CSSProperties = {
    background: 'white',
    border: `1px solid ${BRASS}33`,
    boxShadow: '0 12px 32px rgba(19, 41, 75, 0.08)',
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: BG_OFFWHITE }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{ background: NAVY_GRADIENT, borderBottom: `1px solid ${BRASS}33` }}
      >
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#FDFBF7' }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <h1 className="text-lg font-light tracking-[0.2em]" style={{ color: '#FDFBF7' }}>
            {t('stamps.history')}
          </h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Stamp className="w-5 h-5" style={{ color: COPPER }} />
              <h2 className="text-2xl font-bold" style={{ color: NAVY }}>
                {t('stamps.title')}
              </h2>
            </div>
            <p className="text-sm" style={{ color: 'rgba(19, 41, 75, 0.65)' }}>
              {t('stamps.subtitle')}
            </p>
          </div>

          {/* 12h窓の進捗 */}
          <div className="p-5 mb-4 rounded-2xl relative overflow-hidden" style={whiteCardStyle}>
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: GOLD_GRADIENT }} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5" style={{ color: COPPER }} />
                <h3 className="font-semibold" style={{ color: NAVY }}>
                  {t('stamps.today_progress')}
                </h3>
              </div>
              <span className="text-2xl font-bold" style={{ color: NAVY }}>
                {windowStoreCount}
                <span className="text-sm ml-1" style={{ color: 'rgba(19, 41, 75, 0.5)' }}>
                  / {LOTTERY_MAX}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-3">
              {stampSlots.map((filled, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl flex items-center justify-center transition-all"
                  style={
                    filled
                      ? {
                          border: `2px solid ${BRASS}`,
                          background: `linear-gradient(135deg, ${BRASS}1f 0%, ${BRASS}0a 100%)`,
                          boxShadow: `0 4px 12px ${BRASS}33`,
                        }
                      : {
                          border: `2px dashed rgba(19, 41, 75, 0.25)`,
                          background: 'rgba(19, 41, 75, 0.04)',
                        }
                  }
                >
                  {filled ? (
                    <motion.img
                      src={STAMP_ICON_URL}
                      alt="stamp"
                      className="w-full h-full object-contain p-1"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 15,
                        delay: i * 0.04,
                      }}
                    />
                  ) : (
                    <span
                      className="text-xs font-semibold"
                      style={{ color: 'rgba(19, 41, 75, 0.4)' }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{ background: 'rgba(19, 41, 75, 0.08)' }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: GOLD_GRADIENT }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
              {remainingForLottery > 0
                ? t('stamps.remaining_hint').replace('{n}', String(remainingForLottery))
                : t('stamps.lottery_ready')}
            </p>
          </div>

          {/* 抽選応募エリア */}
          {todayEntry ? (
            <div
              className="p-5 mb-4 rounded-2xl"
              style={{
                background: `${BRASS}12`,
                border: `1px solid ${BRASS}66`,
                boxShadow: '0 12px 32px rgba(19, 41, 75, 0.08)',
              }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5" style={{ color: COPPER }} />
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: NAVY }}>
                    {t('stamps.entry_confirmed')}
                  </h3>
                  <p className="text-sm" style={{ color: 'rgba(19, 41, 75, 0.7)' }}>
                    {t('stamps.entry_email_hint')}: {todayEntry.email}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(19, 41, 75, 0.55)' }}>
                    {t('stamps.entry_status')}:{' '}
                    {t(`stamps.status_${todayEntry.status}`) || todayEntry.status}
                  </p>
                </div>
              </div>
            </div>
          ) : eligible ? (
            showEntryForm ? (
              <div className="p-5 mb-4 rounded-2xl" style={whiteCardStyle}>
                <div className="flex items-center gap-2 mb-3">
                  <Ticket className="w-5 h-5" style={{ color: COPPER }} />
                  <h3 className="font-semibold" style={{ color: NAVY }}>
                    {t('stamps.enter_lottery_title')}
                  </h3>
                </div>
                <p className="text-sm mb-4" style={{ color: 'rgba(19, 41, 75, 0.7)' }}>
                  {t('stamps.enter_lottery_desc')}
                </p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Label
                      htmlFor="entry-email"
                      className="text-xs font-semibold"
                      style={{ color: NAVY }}
                    >
                      {t('stamps.email_label')}
                    </Label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: COPPER }}
                      />
                      <Input
                        id="entry-email"
                        type="email"
                        required
                        className="pl-9 h-11 rounded-xl"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ fontSize: '16px', color: NAVY }}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 font-bold rounded-xl"
                    style={{
                      background: GOLD_GRADIENT,
                      color: NAVY,
                      boxShadow: `0 6px 22px ${BRASS}55`,
                    }}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Ticket className="w-4 h-4 mr-2" />
                    )}
                    {t('stamps.submit_entry')}
                  </Button>
                </form>
              </div>
            ) : (
              <div
                className="p-5 mb-4 rounded-2xl"
                style={{
                  background: `${BRASS}12`,
                  border: `1px solid ${BRASS}66`,
                  boxShadow: '0 12px 32px rgba(19, 41, 75, 0.08)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Ticket className="w-5 h-5 flex-shrink-0" style={{ color: COPPER }} />
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate" style={{ color: NAVY }}>
                        {t('stamps.eligible_title')}
                      </h3>
                      <p className="text-xs truncate" style={{ color: 'rgba(19, 41, 75, 0.65)' }}>
                        {t('stamps.eligible_desc')}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowEntryForm(true)}
                    className="font-bold rounded-xl flex-shrink-0"
                    style={{
                      background: GOLD_GRADIENT,
                      color: NAVY,
                      boxShadow: `0 4px 14px ${BRASS}55`,
                    }}
                  >
                    {t('stamps.enter')}
                  </Button>
                </div>
              </div>
            )
          ) : null}

          {/* 履歴 */}
          <div className="mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: COPPER }} />
            <h2 className="font-semibold" style={{ color: NAVY }}>
              {t('stamps.history')}
            </h2>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: COPPER }} />
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="p-6 text-center rounded-2xl" style={whiteCardStyle}>
              <Stamp className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(19, 41, 75, 0.4)' }} />
              <p className="text-sm" style={{ color: 'rgba(19, 41, 75, 0.65)' }}>
                {t('stamps.empty')}
              </p>
              <Link href="/map">
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 font-semibold rounded-xl"
                  style={{
                    background: 'white',
                    color: NAVY,
                    border: `1.5px solid ${BRASS}60`,
                  }}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {t('stamps.find_stores')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedDates.map((dateKey) => {
                const items = grouped.get(dateKey) ?? [];
                const d = new Date(dateKey);
                return (
                  <div key={dateKey} className="p-4 rounded-2xl" style={whiteCardStyle}>
                    <div className="text-xs mb-2" style={{ color: 'rgba(19, 41, 75, 0.6)' }}>
                      {format(d, 'PPP', { locale: dateLocale })}
                    </div>
                    <ul className="space-y-2">
                      {items.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-sm">
                          <Stamp className="w-4 h-4" style={{ color: COPPER }} />
                          <span className="font-medium" style={{ color: NAVY }}>
                            {c.store_name ?? '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
