'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  QrCode,
  Map,
  LogOut,
  ChevronRight,
  UserCog,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useLanguage } from '@/lib/i18n/context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAppMode } from '@/lib/app-mode-context';
import { toast } from 'sonner';

// Brewers Navy + Brass + Copper パレット（StoreDetailPanel と統一）
const NAVY = '#13294b'; // Brewers Dark Navy
const NAVY_SOFT = 'rgba(19, 41, 75, 0.08)';
const BRASS = '#ffc82c'; // Brass Yellow
const COPPER = '#B87333'; // Copper / orange accent
// グラデ廃止: フラットカラーで統一
const GOLD_GRADIENT = '#ffc82c';
const NAVY_GRADIENT = '#13294b';

export default function MyPage() {
  const router = useRouter();
  const { user, profile, accountType, signOut, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { colorsB: COLORS } = useAppMode();
  const pageBackground = COLORS.cardGradient;

  // 背景をログイン画面と同じベースカラーで上書き
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    root.style.background = pageBackground;
    body.style.background = pageBackground;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, [pageBackground]);

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

  // QR表示前提のプロフィール必須項目チェック（住所エリア / 年齢 / 職業 / 性別）
  const profileAttrs = (profile?.profile_attributes ?? {}) as {
    address?: string;
    age?: string;
    occupation?: string;
    gender?: string;
  };
  const isProfileComplete = Boolean(
    profileAttrs.address?.trim() &&
      profileAttrs.age?.trim() &&
      profileAttrs.occupation?.trim() &&
      profileAttrs.gender?.trim()
  );

  return (
    <div
      className="min-h-screen pb-24 relative"
      style={{ background: pageBackground }}
    >
      {/* ヘッダー（店舗管理画面と同じビジュアル言語） */}
      <header
        className="sticky top-0 z-20 safe-top"
        style={{
          background: NAVY_GRADIENT,
          borderBottom: `1px solid ${BRASS}33`,
        }}
      >
        <div className="relative flex items-center justify-center p-4 max-w-md mx-auto">
          <h1 className="text-lg font-light tracking-[0.2em]" style={{ color: '#F7F3E9' }}>
            {t('mypage.title')}
          </h1>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CloseCircleButton
              size="md"
              aria-label={t('common.close')}
              onClick={() => router.push('/map')}
            />
          </div>
        </div>
      </header>

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
                <h2
                  className="text-lg font-bold truncate"
                  style={{ color: NAVY }}
                >
                  {displayName}
                </h2>
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: 'rgba(19, 41, 75, 0.6)' }}
                >
                  {user.email?.endsWith('@line.nikenme.local') ? 'LINE' : user.email}
                </p>
              </div>
              <Link
                href="/mypage/edit"
                className="flex-shrink-0 inline-flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-lg transition-colors"
                aria-label={t('mypage.edit')}
              >
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg"
                  style={{
                    background: `${BRASS}18`,
                    border: `1px solid ${BRASS}50`,
                  }}
                >
                  <UserCog className="w-4 h-4" style={{ color: COPPER }} />
                </span>
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{ color: NAVY }}
                >
                  {t('mypage.edit')}
                </span>
              </Link>
            </div>
          </div>

          {/* チェックインQR表示誘導（プロフィール未入力時はガード表示） */}
          {isProfileComplete ? (
            <Link href="/mypage/qr" className="block mb-4">
              <div
                className="rounded-2xl p-5 transition-all hover:translate-y-[-2px] relative overflow-hidden bg-white"
                style={{
                  boxShadow:
                    '0 18px 48px rgba(19, 41, 75, 0.12), 0 4px 12px rgba(19, 41, 75, 0.06)',
                  border: `1px solid ${BRASS}33`,
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ background: GOLD_GRADIENT }}
                />
                <div className="relative flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${BRASS}18`,
                      border: `1px solid ${BRASS}44`,
                    }}
                  >
                    <QrCode className="w-7 h-7" style={{ color: NAVY }} />
                  </div>
                  <div className="flex-1">
                    <h2
                      className="font-bold text-base mb-0.5"
                      style={{ color: NAVY }}
                    >
                      {t('mypage.qr_cta_title')}
                    </h2>
                    <p
                      className="text-xs"
                      style={{ color: 'rgba(19, 41, 75, 0.62)' }}
                    >
                      {t('mypage.qr_cta_desc')}
                    </p>
                  </div>
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: NAVY,
                      color: BRASS,
                      boxShadow: '0 6px 18px rgba(19, 41, 75, 0.22)',
                    }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <div
              className="rounded-2xl p-5 mb-4 relative overflow-hidden"
              style={{
                background: 'white',
                border: `1px dashed ${COPPER}88`,
                boxShadow: '0 8px 22px rgba(19, 41, 75, 0.08)',
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${COPPER}1c`, border: `1px solid ${COPPER}44` }}
                >
                  <QrCode className="w-5 h-5" style={{ color: COPPER }} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm mb-1" style={{ color: NAVY }}>
                    {t('mypage.profile_required_title')}
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'rgba(19, 41, 75, 0.72)' }}
                  >
                    {t('mypage.profile_required_desc')}
                  </p>
                </div>
              </div>
              <Link href="/mypage/edit">
                <Button
                  className="w-full h-11 font-bold rounded-xl"
                  style={{
                    background: GOLD_GRADIENT,
                    color: NAVY,
                    boxShadow: `0 6px 18px ${BRASS}44`,
                  }}
                >
                  <UserCog className="w-4 h-4 mr-2" />
                  {t('mypage.profile_required_cta')}
                </Button>
              </Link>
            </div>
          )}


          {/* その他導線（プロフィール編集はアバター横へ統合済） */}
          <div className="space-y-2 mb-4">
            <Link href="/liff/vacancy">
              <Button
                variant="outline"
                className="w-full justify-start h-12 rounded-xl font-medium"
                style={{
                  background: 'white',
                  border: `1px solid ${BRASS}55`,
                  color: NAVY,
                }}
              >
                <Bell className="w-4 h-4 mr-2" style={{ color: COPPER }} />
                空席通知の設定
              </Button>
            </Link>
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
                <Map className="w-4 h-4 mr-2" style={{ color: COPPER }} />
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
                color: '#B3453F',
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
