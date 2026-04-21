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
  const { user, profile, accountType, loading: authLoading } = useAuth();
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
    if (authLoading) return;
    if (!user) {
      router.replace('/login?role=customer&redirect=/profile/stamps');
      return;
    }
    if (accountType !== 'customer') {
      router.replace('/map');
      return;
    }
  }, [authLoading, user, accountType, router]);

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

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <Stamp className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">{t('stamps.title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            {t('stamps.subtitle')}
          </p>

          {/* 12h窓の進捗 */}
          <Card className="p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-brass-500" />
                <h2 className="font-semibold">{t('stamps.today_progress')}</h2>
              </div>
              <span className="text-2xl font-bold">
                {windowStoreCount}
                <span className="text-sm text-muted-foreground ml-1">
                  / {LOTTERY_MAX}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-3">
              {stampSlots.map((filled, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-all ${
                    filled
                      ? 'border-primary bg-primary/10'
                      : 'border-dashed border-muted-foreground/30 bg-muted/30'
                  }`}
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
                    <span className="text-xs text-muted-foreground">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {remainingForLottery > 0
                ? t('stamps.remaining_hint').replace('{n}', String(remainingForLottery))
                : t('stamps.lottery_ready')}
            </p>
          </Card>

          {/* 抽選応募エリア */}
          {todayEntry ? (
            <Card className="p-5 mb-4 border-primary/40 bg-primary/5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{t('stamps.entry_confirmed')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('stamps.entry_email_hint')}: {todayEntry.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('stamps.entry_status')}: {t(`stamps.status_${todayEntry.status}`) || todayEntry.status}
                  </p>
                </div>
              </div>
            </Card>
          ) : eligible ? (
            showEntryForm ? (
              <Card className="p-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Ticket className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">{t('stamps.enter_lottery_title')}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('stamps.enter_lottery_desc')}
                </p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Label htmlFor="entry-email" className="text-xs">
                      {t('stamps.email_label')}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="entry-email"
                        type="email"
                        required
                        className="pl-9"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Ticket className="w-4 h-4 mr-2" />
                    )}
                    {t('stamps.submit_entry')}
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="p-5 mb-4 border-primary/40 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{t('stamps.eligible_title')}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t('stamps.eligible_desc')}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setShowEntryForm(true)}>
                    {t('stamps.enter')}
                  </Button>
                </div>
              </Card>
            )
          ) : null}

          {/* 履歴 */}
          <div className="mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">{t('stamps.history')}</h2>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedDates.length === 0 ? (
            <Card className="p-6 text-center">
              <Stamp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('stamps.empty')}</p>
              <Link href="/map">
                <Button variant="outline" size="sm" className="mt-3">
                  <MapPin className="w-4 h-4 mr-2" />
                  {t('stamps.find_stores')}
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedDates.map((dateKey) => {
                const items = grouped.get(dateKey) ?? [];
                const d = new Date(dateKey);
                return (
                  <Card key={dateKey} className="p-4">
                    <div className="text-xs text-muted-foreground mb-2">
                      {format(d, 'PPP', { locale: dateLocale })}
                    </div>
                    <ul className="space-y-2">
                      {items.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-sm">
                          <Stamp className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {c.store_name ?? '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
