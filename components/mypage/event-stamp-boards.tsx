'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Stamp,
  Check,
  Sparkles,
  PartyPopper,
  Send,
  CheckCircle2,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

const NAVY = '#13294b';
const BRASS = '#ffc82c';
const COPPER = '#B87333';

type JoinedEvent = {
  id: string;
  title: string;
  area_label: string | null;
  image_url: string | null;
  start_at: string | null;
  end_at: string | null;
  stamp_goal: number;
  stamp_reward_text: string | null;
  stamp_count: number;
  goal_reached: boolean;
  reward_claimed_at: string | null;
  submitted_at: string | null;
  joined_at: string | null;
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * 会員ページのイベントスタンプボード。
 * 「参加する」を押したイベントだけを `/api/me/joined-events` から取得し、
 * スタンプの進捗ボードを表示する。ゴール到達時は運営へ「送信」できる。
 */
export function EventStampBoards() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [events, setEvents] = useState<JoinedEvent[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  // 「参加をやめる」: 確認待ち・処理中の対象イベント
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const token = await getToken();
      if (!token) {
        setError(true);
        return;
      }
      const res = await fetch('/api/me/joined-events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = await res.json();
      setEvents(json.events ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSubmit = useCallback(
    async (eventId: string) => {
      try {
        setSubmittingId(eventId);
        const token = await getToken();
        if (!token) {
          toast.error('ログインが必要です');
          return;
        }
        const note = (noteDraft[eventId] ?? '').trim();
        const res = await fetch(`/api/me/events/${eventId}/submit`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(note ? { note } : {}),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(
            json?.error === 'goal_not_reached'
              ? 'まだスタンプが揃っていません'
              : '送信に失敗しました'
          );
          return;
        }
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, submitted_at: json.submitted_at ?? new Date().toISOString() }
              : e
          )
        );
        toast.success('運営に送信しました。特典のご案内をお待ちください。', {
          className: 'bg-muted',
        });
      } catch {
        toast.error('送信に失敗しました');
      } finally {
        setSubmittingId(null);
      }
    },
    [getToken, noteDraft]
  );

  const handleLeave = useCallback(
    async (eventId: string) => {
      try {
        setLeavingId(eventId);
        const token = await getToken();
        if (!token) {
          toast.error('ログインが必要です');
          return;
        }
        const res = await fetch(`/api/me/events/${eventId}/join`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          toast.error('参加の取り消しに失敗しました');
          return;
        }
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        setConfirmLeaveId(null);
        toast.success('イベントへの参加を取り消しました', { className: 'bg-muted' });
      } catch {
        toast.error('参加の取り消しに失敗しました');
      } finally {
        setLeavingId(null);
      }
    },
    [getToken]
  );

  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 mb-4 bg-white flex items-center justify-center"
        style={{ border: `1px solid ${BRASS}33` }}
      >
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: COPPER }} />
      </div>
    );
  }

  // 参加イベントが無い / 取得失敗時は何も表示しない（会員ページをすっきり保つ）
  if (error || events.length === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4" style={{ color: COPPER }} />
        <h3 className="font-bold text-sm" style={{ color: NAVY }}>
          参加中のイベント・スタンプ
        </h3>
      </div>

      <AnimatePresence initial={false}>
        {events.map((ev) => {
          const goal = Math.max(1, ev.stamp_goal);
          const filled = Math.min(ev.stamp_count, goal);
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl p-5 bg-white relative overflow-hidden"
              style={{
                border: `1px solid ${BRASS}33`,
                boxShadow: '0 8px 22px rgba(19, 41, 75, 0.08)',
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: BRASS }}
              />

              {/* イベント見出し */}
              <div className="flex items-center gap-3 mb-3">
                {ev.image_url ? (
                  <img
                    src={ev.image_url}
                    alt={ev.title}
                    className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${NAVY}0D` }}
                  >
                    <Stamp className="w-5 h-5" style={{ color: COPPER }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate" style={{ color: NAVY }}>
                    🎊 {ev.title}
                  </p>
                  {ev.area_label && (
                    <p className="text-xs truncate" style={{ color: 'rgba(19,41,75,0.55)' }}>
                      {ev.area_label}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: `${NAVY}0D`, color: NAVY }}
                >
                  {filled} / {goal}
                </span>
              </div>

              {/* スタンプマス */}
              <div className="flex flex-wrap gap-2 mb-3">
                {Array.from({ length: goal }).map((_, i) => {
                  const done = i < filled;
                  return (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={
                        done
                          ? { background: BRASS, border: `1px solid ${BRASS}` }
                          : {
                              background: 'transparent',
                              border: `1.5px dashed ${COPPER}66`,
                            }
                      }
                    >
                      {done ? (
                        <Check className="w-4 h-4" style={{ color: NAVY }} strokeWidth={3} />
                      ) : (
                        <span className="text-xs font-bold" style={{ color: `${COPPER}99` }}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 特典文 */}
              {ev.stamp_reward_text && (
                <p
                  className="text-xs mb-3 px-3 py-2 rounded-lg"
                  style={{ background: `${BRASS}14`, color: NAVY }}
                >
                  🎁 {ev.stamp_reward_text}
                </p>
              )}

              {/* ゴール到達 → 送信 */}
              {ev.goal_reached ? (
                ev.submitted_at ? (
                  <div
                    className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold"
                    style={{ background: `${NAVY}0D`, color: NAVY }}
                  >
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#2E7D32' }} />
                    送信済み（{formatDateTime(ev.submitted_at)}）
                  </div>
                ) : (
                  <>
                    {/* 運営への任意メッセージ */}
                    <label className="block mb-2">
                      <span
                        className="flex items-center gap-1.5 text-[11px] font-bold mb-1"
                        style={{ color: NAVY }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" style={{ color: COPPER }} />
                        運営へのメッセージ（任意）
                      </span>
                      <textarea
                        value={noteDraft[ev.id] ?? ''}
                        onChange={(e) =>
                          setNoteDraft((prev) => ({ ...prev, [ev.id]: e.target.value }))
                        }
                        rows={2}
                        maxLength={500}
                        placeholder="感想・受け取り希望など（500文字まで）"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                        style={{
                          background: '#FFFFFF',
                          border: `1px solid ${BRASS}50`,
                          color: NAVY,
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSubmit(ev.id)}
                      disabled={submittingId === ev.id}
                      className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
                      style={{ background: NAVY, color: BRASS }}
                    >
                      {submittingId === ev.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <PartyPopper className="w-4 h-4" />
                          スタンプ達成！運営に送信する
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </>
                )
              ) : (
                <p className="text-xs text-center" style={{ color: 'rgba(19,41,75,0.55)' }}>
                  参加店で会員証QRを提示してスタンプを集めよう
                </p>
              )}

              {/* 参加をやめる（インライン確認つき） */}
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(19,41,75,0.08)' }}>
                {confirmLeaveId === ev.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] flex-1" style={{ color: 'rgba(19,41,75,0.7)' }}>
                      参加をやめると進捗は表示されなくなります
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmLeaveId(null)}
                      disabled={leavingId === ev.id}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: `${NAVY}0D`, color: NAVY }}
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLeave(ev.id)}
                      disabled={leavingId === ev.id}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 disabled:opacity-60"
                      style={{ background: '#B3453F', color: '#fff' }}
                    >
                      {leavingId === ev.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'やめる'
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmLeaveId(ev.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold transition-colors"
                    style={{ color: 'rgba(19,41,75,0.5)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    このイベントの参加をやめる
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
