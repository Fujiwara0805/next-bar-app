'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import {
  fetchActiveStoreParticipations,
  type ActiveStoreEvent,
} from '@/lib/types/active-store-event';
import { toast } from 'sonner';

const NAVY = '#13294b';
const BRASS = '#ffc82c';
const COPPER = '#B87333';

/**
 * 会員ページの「開催中のイベントに参加しますか？」カード。
 * 現在開催中（参加店がある）のイベントのうち、まだ参加(opt-in)していないものを表示し、
 * その場で「参加する」と会員ページにスタンプボードが追加される。
 */
export function EventJoinPrompt({ onJoined }: { onJoined?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ActiveStoreEvent[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setEvents([]);
        return;
      }
      // 開催中イベント（参加店あり）と、自分が参加済みのID群を並行取得
      const [participations, joinedRes] = await Promise.all([
        fetchActiveStoreParticipations(),
        fetch('/api/me/event-participations', {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : { eventIds: [] })),
      ]);
      const joinedIds = new Set<string>(joinedRes?.eventIds ?? []);
      // イベント単位に集約し、未参加のものだけ残す
      const byId = new Map<string, ActiveStoreEvent>();
      for (const p of participations) {
        if (!byId.has(p.event.id)) byId.set(p.event.id, p.event);
      }
      setEvents(Array.from(byId.values()).filter((e) => !joinedIds.has(e.id)));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const handleJoin = useCallback(
    async (eventId: string) => {
      try {
        setJoiningId(eventId);
        const token = await getToken();
        if (!token) {
          toast.error('ログインが必要です');
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
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        toast.success('参加しました！スタンプボードを表示します。', { className: 'bg-muted' });
        onJoined?.();
      } catch {
        toast.error('参加に失敗しました');
      } finally {
        setJoiningId(null);
      }
    },
    [getToken, onJoined]
  );

  // ローディング中・対象が無い場合は何も表示しない（会員ページをすっきり保つ）
  if (loading || events.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4" style={{ color: COPPER }} />
        <h3 className="font-bold text-sm" style={{ color: NAVY }}>
          開催中のイベント
        </h3>
      </div>

      <AnimatePresence initial={false}>
        {events.map((ev) => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: BRASS,
              boxShadow: '0 8px 22px rgba(19, 41, 75, 0.12)',
            }}
          >
            <div className="flex items-center gap-3">
              {ev.image_url ? (
                <img
                  src={ev.image_url}
                  alt={ev.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(19,41,75,0.12)' }}
                >
                  <CalendarDays className="w-5 h-5" style={{ color: NAVY }} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight" style={{ color: NAVY }}>
                  🎊 {ev.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(19,41,75,0.7)' }}>
                  イベントに参加しますか？
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleJoin(ev.id)}
              disabled={joiningId === ev.id}
              className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
              style={{ background: NAVY, color: BRASS }}
            >
              {joiningId === ev.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  参加する
                </>
              )}
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
