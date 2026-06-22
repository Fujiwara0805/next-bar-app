'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

const NAVY = '#13294b';
const BRASS = '#ffc82c';

/**
 * イベント参加店の店舗詳細パネルに表示する「ログイン必須／参加する」CTA。
 *
 * - 未ログイン: 「スタンプ獲得にはログインが必要」と案内し、ログイン(メール/LINE)へ誘導。
 * - ログイン済み(会員)で未参加: 「このイベントに参加する」→ 参加すると会員ページに
 *   スタンプボードが表示される。
 * - 参加済み: 「参加中・会員証QRでスタンプを集めよう」。
 */
export function EventParticipationCta({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle?: string;
}) {
  const router = useRouter();
  const { user, accountType, loading: authLoading } = useAuth();
  const isCustomer = accountType === 'customer';

  const [joined, setJoined] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  // ログイン会員なら参加状態を取得
  useEffect(() => {
    let active = true;
    if (authLoading || !user || !isCustomer) {
      setJoined(null);
      return;
    }
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`/api/me/events/${eventId}/join`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (active) setJoined(!!json.joined);
      } catch {
        /* noop */
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, isCustomer, eventId, getToken]);

  const goLogin = useCallback(() => {
    const redirect =
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : '/map';
    router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
  }, [router]);

  const handleJoin = useCallback(async () => {
    try {
      setBusy(true);
      const token = await getToken();
      if (!token) {
        goLogin();
        return;
      }
      const res = await fetch(`/api/me/events/${eventId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('参加に失敗しました');
        return;
      }
      setJoined(true);
      toast.success('参加しました！会員ページにスタンプボードが表示されます。', {
        className: 'bg-muted',
      });
    } catch {
      toast.error('参加に失敗しました');
    } finally {
      setBusy(false);
    }
  }, [eventId, getToken, goLogin]);

  // 未ログイン（または店舗/運営アカウント）→ ログイン案内
  if (!user || !isCustomer) {
    return (
      <button
        type="button"
        onClick={goLogin}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold"
        style={{ background: NAVY, color: BRASS }}
      >
        <LogIn className="w-4 h-4" />
        ログインしてイベントに参加（メール / LINE）
      </button>
    );
  }

  // 参加状態の取得中
  if (joined === null) {
    return (
      <div
        className="w-full flex items-center justify-center h-10 rounded-xl"
        style={{ background: 'rgba(19,41,75,0.06)' }}
      >
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: NAVY }} />
      </div>
    );
  }

  // 参加済み
  if (joined) {
    return (
      <div
        className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold"
        style={{ background: 'rgba(19,41,75,0.06)', color: NAVY }}
      >
        <CheckCircle2 className="w-4 h-4" style={{ color: '#2E7D32' }} />
        参加中（会員証QRを提示）
      </div>
    );
  }

  // ログイン済み・未参加 → 参加するCTA
  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={busy}
      className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold transition-opacity disabled:opacity-60"
      style={{ background: NAVY, color: BRASS }}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          {eventTitle ? `「${eventTitle}」に参加する` : 'このイベントに参加する'}
        </>
      )}
    </button>
  );
}
