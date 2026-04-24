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
import { useAppMode } from '@/lib/app-mode-context';
import { supabase } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { toast } from 'sonner';

const LOTTERY_STORE_THRESHOLD = 3;
const LOTTERY_STORE_MAX = 5;
const WINDOW_HOURS = 12;

const STAMP_ICON_URL =
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png';

// Brewers Navy + Brass + Copper パレット（StoreDetailPanel と統一）
const BG_OFFWHITE = '#F7F3E9'; // cream-50
const NAVY = '#13294b'; // Brewers Dark Navy
const NAVY_SOFT = 'rgba(19, 41, 75, 0.08)';
const BRASS = '#ffc62d'; // Brewers Yellow
const COPPER = '#B87333'; // Copper / orange accent
const GOLD_GRADIENT = 'linear-gradient(135deg, #ffc62d 0%, #FFD966 50%, #C9A86C 100%)';
const COPPER_GRADIENT = 'linear-gradient(135deg, #B87333 0%, #C9A86C 100%)';

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

  // 背景をオフホワイトで上書き
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
      router.replace('/login?redirect=/mypage');
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
    } catch {
      toast.error(t('auth.logout_failed'));
    }
  };

  if (authLoading || !user || accountType !== 'customer') {
    return <LoadingScreen size="lg" />;
  }

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? '';

  return (
    <div
      className="min-h-screen pb-24 safe-top relative"
      style={{ background: BG_OFFWHITE }}
    >
      {/* 装飾的なアクセント */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full"
          style={{
            background: `radial-gradient(circle, ${BRASS}1f 0%, transparent 60%)`,
          }}
        />
        <div
          className="absolute -bottom-40 -left-24 h-[26rem] w-[26rem] rounded-full"
          style={{
            background: `radial-gradient(circle, ${NAVY}14 0%, transparent 60%)`,
          }}
        />
      </div>

      <div className="relative max-w-md mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* プロフィール */}
          <div
            className="rounded-2xl p-5 mb-4 bg-white relative overflow-hidden"
            style={{
              border: `1px solid ${BRASS}33`,
              boxShadow: '0 12px 32px rgba(19, 41, 75, 0.10)',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: GOLD_GRADIENT }}
            />
            <div className="flex items-center gap-4">
              <Avatar
                className="w-16 h-16"
                style={{ boxShadow: `0 0 0 2px ${BRASS}66, 0 4px 12px ${NAVY_SOFT}` }}
              >
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback
                  style={{ background: NAVY, color: BRASS, fontWeight: 700 }}
                >
                  {displayName[0] ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1
                  className="text-lg font-bold truncate"
                  style={{ color: NAVY }}
                >
                  {displayName}
                </h1>
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: 'rgba(19, 41, 75, 0.6)' }}
                >
                  {user.email?.endsWith('@line.nikenme.local') ? 'LINE' : user.email}
                </p>
              </div>
            </div>
          </div>

          {/* チェックインQR表示誘導 */}
          <Link href="/mypage/qr" className="block mb-4">
            <div
              className="rounded-2xl p-5 transition-all hover:translate-y-[-2px] relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, #1A3562 100%)`,
                boxShadow: `0 14px 36px rgba(19, 41, 75, 0.30)`,
                border: `1px solid ${BRASS}55`,
              }}
            >
              <div
                className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-30"
                style={{ background: `radial-gradient(circle, ${BRASS}, transparent 70%)` }}
              />
              <div className="relative flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: GOLD_GRADIENT,
                    boxShadow: `0 6px 16px ${BRASS}55`,
                  }}
                >
                  <QrCode className="w-7 h-7" style={{ color: NAVY }} />
                </div>
                <div className="flex-1">
                  <h2
                    className="font-bold text-base mb-0.5"
                    style={{ color: '#FDFBF7' }}
                  >
                    {t('mypage.qr_cta_title')}
                  </h2>
                  <p
                    className="text-xs"
                    style={{ color: 'rgba(253, 251, 247, 0.75)' }}
                  >
                    {t('mypage.qr_cta_desc')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5" style={{ color: BRASS }} />
              </div>
            </div>
          </Link>

          {/* スタンプ進捗 */}
          <div
            className="rounded-2xl p-5 mb-4 bg-white relative overflow-hidden"
            style={{
              border: `1px solid ${BRASS}33`,
              boxShadow: '0 12px 32px rgba(19, 41, 75, 0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" style={{ color: COPPER }} />
                <h2 className="font-semibold text-sm" style={{ color: NAVY }}>
                  {t('mypage.stamp_progress')}
                </h2>
              </div>
              <span
                className="text-xs flex items-center gap-1"
                style={{ color: 'rgba(19, 41, 75, 0.6)' }}
              >
                <Clock className="w-3 h-3" />
                {t('mypage.window_hint').replace('{h}', String(WINDOW_HOURS))}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {slots.map((filled, i) => (
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
                          border: `2px dashed ${NAVY}33`,
                          background: NAVY_SOFT,
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
                        delay: i * 0.05,
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

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm" style={{ color: 'rgba(19, 41, 75, 0.7)' }}>
                {loading
                  ? '...'
                  : remaining > 0
                  ? t('mypage.remaining_hint').replace('{n}', String(remaining))
                  : hasTodayEntry
                  ? t('mypage.already_entered_today')
                  : t('mypage.lottery_ready')}
              </span>
              <span className="text-2xl font-bold" style={{ color: NAVY }}>
                {windowStoreCount}
                <span
                  className="text-xs ml-0.5"
                  style={{ color: 'rgba(19, 41, 75, 0.5)' }}
                >
                  / {LOTTERY_STORE_MAX}
                </span>
              </span>
            </div>

            {canEnterLottery ? (
              <Link href="/profile/stamps?enter=1">
                <Button
                  className="w-full h-12 font-bold rounded-xl"
                  size="lg"
                  style={{
                    background: GOLD_GRADIENT,
                    color: NAVY,
                    boxShadow: `0 8px 22px ${BRASS}55`,
                  }}
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  {t('mypage.enter_lottery')}
                </Button>
              </Link>
            ) : (
              <Link href="/profile/stamps">
                <Button
                  variant="outline"
                  className="w-full h-12 font-semibold rounded-xl"
                  style={{
                    border: `1.5px solid ${NAVY}`,
                    color: NAVY,
                    background: 'transparent',
                  }}
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  {t('mypage.view_stamps')}
                </Button>
              </Link>
            )}
          </div>

          {/* その他導線 */}
          <div className="space-y-2 mb-4">
            <Link href="/map">
              <Button
                variant="outline"
                className="w-full justify-start h-12 rounded-xl font-medium"
                style={{
                  background: 'white',
                  border: `1px solid ${BRASS}55`,
                  color: NAVY,
                }}
              >
                <MapPin className="w-4 h-4 mr-2" style={{ color: COPPER }} />
                {t('mypage.find_stores')}
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full justify-start h-12 rounded-xl font-medium"
              onClick={handleSignOut}
              style={{
                background: 'white',
                border: '1px solid rgba(220, 38, 38, 0.35)',
                color: '#dc2626',
              }}
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
