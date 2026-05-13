'use client';

// ============================================
// /liff/coupons
// 受け取った全クーポンの一覧。リッチメニュー「クーポン一覧」から開く想定。
//   - LIFF ログイン + Supabase セッションで認証
//   - `GET /api/coupon-issues` で取得し、active/expired/redeemed にグルーピング表示
//   - カードタップで /liff/coupon/[issueId] (既存個別ページ) へ遷移
// ============================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Ticket, Calendar, Store as StoreIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLiff } from '@/lib/line/context';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { LINE_BRAND_COLOR } from '@/lib/line/constants';

type IssueStatus = 'active' | 'expired' | 'redeemed';

type IssueListItem = {
  id: string;
  issuedAt: string;
  redeemedAt: string | null;
  status: IssueStatus;
  coupon: {
    id: string;
    title: string;
    body: string | null;
    imageUrl: string | null;
    discountType: 'percent' | 'amount' | 'free_item' | 'other';
    discountValue: number | null;
    validUntil: string;
  };
  store: {
    id: string;
    name: string;
    imageUrl: string | null;
  } | null;
};

const BG_NAVY = '#13294b';
const TEXT_LIGHT = '#F5F3EC';
const ACCENT_YELLOW = '#ffc82c';

export default function LiffCouponsListPage() {
  const router = useRouter();
  const { isLiffReady, isLineLoggedIn, liffLogin, liffError } = useLiff();
  const { user, loading: authLoading, signInWithLine } = useAuth();

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<IssueListItem[]>([]);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [autoSigningIn, setAutoSigningIn] = useState(false);

  // LIFF ログイン済みかつ Supabase 未連携なら自動連携
  useEffect(() => {
    if (!isLiffReady) return;
    if (authLoading) return;
    if (user) return;
    if (!isLineLoggedIn) return;
    if (autoSigningIn) return;
    setAutoSigningIn(true);
    signInWithLine().finally(() => setAutoSigningIn(false));
  }, [isLiffReady, isLineLoggedIn, user, authLoading, signInWithLine, autoSigningIn]);

  const fetchIssues = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setFetchErr(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setFetchErr('セッションが無効です');
        return;
      }
      const res = await fetch('/api/coupon-issues', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        setFetchErr(json?.error ?? 'クーポンの取得に失敗しました');
        return;
      }
      setIssues((json.issues ?? []) as IssueListItem[]);
    } catch (err) {
      console.error('[liff coupons] fetch error', err);
      setFetchErr('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchIssues();
  }, [user, fetchIssues]);

  const grouped = useMemo(() => {
    return {
      active: issues.filter((i) => i.status === 'active'),
      expired: issues.filter((i) => i.status === 'expired'),
      redeemed: issues.filter((i) => i.status === 'redeemed'),
    };
  }, [issues]);

  // ===== レンダリング =====

  if (!isLiffReady || authLoading || autoSigningIn) {
    return <CenteredLoader message="読み込み中..." />;
  }

  if (!user && !isLineLoggedIn) {
    return (
      <LiffFrame>
        <Card className="p-6 bg-white text-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-5 h-5" style={{ color: LINE_BRAND_COLOR }} />
            <h1 className="text-base font-bold">クーポン一覧</h1>
          </div>
          <p className="text-sm mb-4">LINE でログインするとクーポン一覧を表示できます。</p>
          {liffError && <p className="text-xs text-red-600 mb-3">{liffError}</p>}
          <Button
            onClick={() => liffLogin()}
            className="w-full"
            style={{ backgroundColor: LINE_BRAND_COLOR, color: 'white' }}
          >
            LINE でログイン
          </Button>
        </Card>
      </LiffFrame>
    );
  }

  if (loading) {
    return <CenteredLoader message="クーポンを取得中..." />;
  }

  if (fetchErr) {
    return (
      <LiffFrame>
        <Card className="p-6 bg-white text-slate-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm font-bold">クーポンを表示できませんでした</p>
          </div>
          <p className="text-xs text-slate-500">{fetchErr}</p>
        </Card>
      </LiffFrame>
    );
  }

  if (issues.length === 0) {
    return (
      <LiffFrame>
        <Header />
        <Card className="p-6 bg-white text-slate-800 rounded-2xl mt-2">
          <div className="text-center py-6">
            <Ticket
              className="w-10 h-10 mx-auto mb-3 opacity-40"
              style={{ color: BG_NAVY }}
            />
            <p className="text-sm font-bold mb-1">まだクーポンはありません</p>
            <p className="text-xs text-slate-500">
              店舗からクーポンが配信されるとここに表示されます。
            </p>
          </div>
        </Card>
      </LiffFrame>
    );
  }

  return (
    <LiffFrame>
      <Header />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {grouped.active.length > 0 && (
          <Section title="使えるクーポン" count={grouped.active.length}>
            {grouped.active.map((issue) => (
              <CouponCard
                key={issue.id}
                issue={issue}
                onClick={() => router.push(`/liff/coupon/${issue.id}`)}
              />
            ))}
          </Section>
        )}

        {grouped.expired.length > 0 && (
          <Section title="期限切れ" count={grouped.expired.length} muted>
            {grouped.expired.map((issue) => (
              <CouponCard
                key={issue.id}
                issue={issue}
                onClick={() => router.push(`/liff/coupon/${issue.id}`)}
                dimmed
              />
            ))}
          </Section>
        )}

        {grouped.redeemed.length > 0 && (
          <Section title="使用済み" count={grouped.redeemed.length} muted>
            {grouped.redeemed.map((issue) => (
              <CouponCard
                key={issue.id}
                issue={issue}
                onClick={() => router.push(`/liff/coupon/${issue.id}`)}
                dimmed
              />
            ))}
          </Section>
        )}
      </motion.div>
    </LiffFrame>
  );
}

function Header() {
  return (
    <div className="mb-2 px-1">
      <div className="flex items-center gap-2">
        <Ticket className="w-5 h-5" style={{ color: ACCENT_YELLOW }} />
        <h1 className="text-lg font-bold" style={{ color: TEXT_LIGHT }}>
          クーポン一覧
        </h1>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  muted,
  children,
}: {
  title: string;
  count: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 px-1 mb-2">
        <p
          className="text-xs font-bold"
          style={{ color: muted ? 'rgba(245,243,236,0.55)' : TEXT_LIGHT }}
        >
          {title}
        </p>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            background: muted ? 'rgba(245,243,236,0.1)' : 'rgba(255, 198, 45, 0.22)',
            color: muted ? 'rgba(245,243,236,0.55)' : ACCENT_YELLOW,
          }}
        >
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CouponCard({
  issue,
  onClick,
  dimmed,
}: {
  issue: IssueListItem;
  onClick: () => void;
  dimmed?: boolean;
}) {
  const { coupon, store, status } = issue;
  const discountLabel = (() => {
    if (coupon.discountValue == null) return null;
    if (coupon.discountType === 'percent') return `${coupon.discountValue}% OFF`;
    if (coupon.discountType === 'amount') return `¥${coupon.discountValue} OFF`;
    return null;
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left"
      style={{ opacity: dimmed ? 0.6 : 1 }}
    >
      <Card
        className="overflow-hidden rounded-2xl"
        style={{
          background: '#FFFFFF',
          border: `1px solid ${
            status === 'active' ? 'rgba(255, 198, 45, 0.3)' : 'rgba(99, 110, 114, 0.2)'
          }`,
          boxShadow: status === 'active' ? '0 4px 14px rgba(0,0,0,0.18)' : 'none',
        }}
      >
        <div className="flex">
          {coupon.imageUrl ? (
            <img
              src={coupon.imageUrl}
              alt=""
              className="w-24 h-24 object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center bg-slate-100">
              <Ticket className="w-7 h-7 text-slate-300" />
            </div>
          )}
          <div className="flex-1 min-w-0 p-3">
            {store?.name && (
              <div
                className="flex items-center gap-1 text-[10px] mb-0.5"
                style={{ color: '#4D5567' }}
              >
                <StoreIcon className="w-3 h-3" />
                <span className="truncate">{store.name}</span>
              </div>
            )}
            <p
              className="text-sm font-bold line-clamp-2 mb-1"
              style={{ color: BG_NAVY }}
            >
              {coupon.title}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {discountLabel && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: 'rgba(255, 198, 45, 0.18)',
                    color: BG_NAVY,
                  }}
                >
                  {discountLabel}
                </span>
              )}
              <StatusBadge status={status} />
            </div>
            <div
              className="flex items-center gap-1 text-[10px] mt-1.5"
              style={{ color: status === 'expired' ? '#B3453F' : '#4D5567' }}
            >
              <Calendar className="w-3 h-3" />
              <span>
                〜{new Date(coupon.validUntil).toLocaleDateString('ja-JP', {
                  month: '2-digit',
                  day: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </button>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  if (status === 'redeemed') {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: 'rgba(99, 110, 114, 0.18)', color: '#4D5567' }}
      >
        <CheckCircle2 className="w-2.5 h-2.5" />
        使用済み
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: 'rgba(220, 38, 38, 0.12)', color: '#B3453F' }}
      >
        期限切れ
      </span>
    );
  }
  return null;
}

function LiffFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen safe-top pb-16" style={{ background: BG_NAVY, color: TEXT_LIGHT }}>
      <div className="max-w-xl mx-auto px-4 pt-6">{children}</div>
    </div>
  );
}

function CenteredLoader({ message }: { message: string }) {
  return (
    <LiffFrame>
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-xs opacity-70">{message}</p>
      </div>
    </LiffFrame>
  );
}
