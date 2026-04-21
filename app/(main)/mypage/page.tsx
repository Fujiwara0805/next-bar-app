'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  QrCode,
  Ticket,
  MapPin,
  LogOut,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { toast } from 'sonner';

const LOTTERY_STORE_THRESHOLD = 3;
const LOTTERY_STORE_MAX = 5;
const WINDOW_HOURS = 12;

const STAMP_ICON_URL =
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png';

function tokyoDateString(): string {
  const now = new Date();
  const tokyoMs = now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60 * 1000;
  return new Date(tokyoMs).toISOString().slice(0, 10);
}

export default function MyPage() {
  const router = useRouter();
  const { user, profile, accountType, signOut, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [windowStoreCount, setWindowStoreCount] = useState(0);
  const [hasTodayEntry, setHasTodayEntry] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login?role=customer&redirect=/mypage');
      return;
    }
    if (accountType === 'platform') {
      router.replace('/profile');
      return;
    }
    if (accountType === 'store') {
      router.replace('/store/manage');
      return;
    }
  }, [authLoading, user, accountType, router]);

  useEffect(() => {
    if (!user || accountType !== 'customer') return;
    const run = async () => {
      setLoading(true);

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
      const cutoff = new Date(Math.max(windowStartMs, entryMs)).toISOString();

      const { data: rows } = await supabase
        .from('store_check_ins')
        .select('store_id')
        .eq('user_id', user.id)
        .gte('checked_in_at', cutoff);
      setWindowStoreCount(new Set((rows ?? []).map((r) => r.store_id)).size);

      const { data: entry } = await supabase
        .from('stamp_rally_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', tokyoDateString())
        .maybeSingle();
      setHasTodayEntry(!!entry);

      setLoading(false);
    };
    run();
  }, [user, accountType]);

  const slots = useMemo(() => {
    return Array.from({ length: LOTTERY_STORE_MAX }, (_, i) => i < windowStoreCount);
  }, [windowStoreCount]);

  const canEnterLottery =
    windowStoreCount >= LOTTERY_STORE_THRESHOLD && !hasTodayEntry;
  const remaining = Math.max(0, LOTTERY_STORE_THRESHOLD - windowStoreCount);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t('auth.logout_success'));
      router.replace('/login?role=customer');
    } catch {
      toast.error(t('auth.logout_failed'));
    }
  };

  if (authLoading || !user || accountType !== 'customer') {
    return <LoadingScreen size="lg" />;
  }

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? '';

  return (
    <div className="min-h-screen bg-background pb-24 safe-top">
      <div className="max-w-md mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* プロフィール */}
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>{displayName[0] ?? '?'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold truncate">{displayName}</h1>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email?.endsWith('@line.nikenme.local') ? 'LINE' : user.email}
                </p>
              </div>
            </div>
          </Card>

          {/* スキャナ誘導 */}
          <Link href="/mypage/scan" className="block mb-4">
            <Card className="p-5 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-base mb-0.5">
                    {t('mypage.scan_cta_title')}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {t('mypage.scan_cta_desc')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>

          {/* スタンプ進捗 */}
          <Card className="p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brass-500" />
                <h2 className="font-semibold text-sm">
                  {t('mypage.stamp_progress')}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t('mypage.window_hint').replace('{h}', String(WINDOW_HOURS))}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {slots.map((filled, i) => (
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
                        delay: i * 0.05,
                      }}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                {loading
                  ? '...'
                  : remaining > 0
                  ? t('mypage.remaining_hint').replace('{n}', String(remaining))
                  : hasTodayEntry
                  ? t('mypage.already_entered_today')
                  : t('mypage.lottery_ready')}
              </span>
              <span className="text-xl font-bold">
                {windowStoreCount}
                <span className="text-xs text-muted-foreground ml-0.5">
                  / {LOTTERY_STORE_MAX}
                </span>
              </span>
            </div>

            {canEnterLottery ? (
              <Link href="/profile/stamps?enter=1">
                <Button className="w-full" size="lg">
                  <Ticket className="w-4 h-4 mr-2" />
                  {t('mypage.enter_lottery')}
                </Button>
              </Link>
            ) : (
              <Link href="/profile/stamps">
                <Button variant="outline" className="w-full">
                  <Ticket className="w-4 h-4 mr-2" />
                  {t('mypage.view_stamps')}
                </Button>
              </Link>
            )}
          </Card>

          {/* その他導線 */}
          <div className="space-y-2 mb-4">
            <Link href="/map">
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                {t('mypage.find_stores')}
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.logout')}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
