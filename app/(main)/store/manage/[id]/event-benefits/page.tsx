'use client';

/**
 * 店舗管理「特典管理」ページ
 * 集客設定 → 特典管理 から遷移
 * - 参加中イベントごとの特典内容
 * - 累計利用件数 / 最終利用日時 / 「特典利用を記録」ボタン / 履歴一覧
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Gift,
  Loader2,
  PartyPopper,
  Sparkles,
  CalendarDays,
  Plus,
  Utensils,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { useAuth } from '@/lib/auth/context';
import { useAppMode } from '@/lib/app-mode-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';
import type {
  StoreEventBenefitRedemption,
  StoreEventRow,
} from '@/lib/types/platform-event';

type Store = Database['public']['Tables']['stores']['Row'];

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

export default function StoreEventBenefitsPage() {
  const { colorsB: COLORS } = useAppMode();
  const router = useRouter();
  const params = useParams();
  const { user, accountType, session } = useAuth();
  const storeId = params?.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [events, setEvents] = useState<StoreEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordingEventId, setRecordingEventId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [historiesByEvent, setHistoriesByEvent] = useState<
    Record<string, StoreEventBenefitRedemption[]>
  >({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  // 紙クーポン使用報告
  type PaperReport = { distributed_count: number; redeemed_count: number; reported_at: string | null };
  const [paperByEvent, setPaperByEvent] = useState<Record<string, PaperReport>>({});
  const [paperDraft, setPaperDraft] = useState<Record<string, { distributed: string; redeemed: string }>>({});
  const [paperSaving, setPaperSaving] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const prevRoot = root.style.background;
    const prevBody = body.style.background;
    const bg = COLORS.cardGradient;
    root.style.background = bg;
    body.style.background = bg;
    return () => {
      root.style.background = prevRoot;
      body.style.background = prevBody;
    };
  }, [COLORS.cardGradient]);

  // 店舗情報
  useEffect(() => {
    if (!user || !storeId || !accountType) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id,name,image_urls,email,owner_id')
          .eq('id', storeId)
          .maybeSingle();
        if (error) throw error;
        if (data) setStore(data as Store);
      } catch (err) {
        console.error('Error fetching store:', err);
        toast.error('店舗情報の取得に失敗しました', { position: 'top-center' });
      } finally {
        setStoreLoading(false);
      }
    })();
  }, [user, storeId, accountType]);

  const fetchEvents = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/stores/${storeId}/events`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const rows = (json.events ?? []) as StoreEventRow[];
      // 参加中のみ
      setEvents(rows.filter((row) => row.participation?.is_participating));
    } catch (error) {
      console.warn('[event-benefits] fetch events warning', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, session?.access_token]);

  useEffect(() => {
    if (!user || !storeId || !accountType) return;
    fetchEvents();
  }, [user, storeId, accountType, fetchEvents]);

  // 参加イベントの紙クーポン報告を取得
  useEffect(() => {
    const token = session?.access_token;
    if (!token || !storeId || events.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        events.map(async (event) => {
          try {
            const res = await fetch(
              `/api/stores/${storeId}/events/${event.id}/paper-coupons`,
              { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) return null;
            const json = await res.json();
            return json.report ? ([event.id, json.report as PaperReport] as const) : null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const map: Record<string, PaperReport> = {};
      const drafts: Record<string, { distributed: string; redeemed: string }> = {};
      entries.forEach((e) => {
        if (!e) return;
        map[e[0]] = e[1];
        drafts[e[0]] = {
          distributed: String(e[1].distributed_count ?? 0),
          redeemed: String(e[1].redeemed_count ?? 0),
        };
      });
      setPaperByEvent(map);
      setPaperDraft((prev) => ({ ...drafts, ...prev }));
    })();
    return () => {
      cancelled = true;
    };
  }, [events, storeId, session?.access_token]);

  const savePaperReport = useCallback(
    async (eventId: string) => {
      if (!storeId) return;
      const token = session?.access_token;
      if (!token) return;
      const draft = paperDraft[eventId] ?? { distributed: '0', redeemed: '0' };
      setPaperSaving(eventId);
      try {
        const res = await fetch(
          `/api/stores/${storeId}/events/${eventId}/paper-coupons`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              distributed_count: Number(draft.distributed) || 0,
              redeemed_count: Number(draft.redeemed) || 0,
            }),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? `save_failed:${res.status}`);
        const report = json.report as PaperReport;
        setPaperByEvent((prev) => ({ ...prev, [eventId]: report }));
        setPaperDraft((prev) => ({
          ...prev,
          [eventId]: {
            distributed: String(report.distributed_count),
            redeemed: String(report.redeemed_count),
          },
        }));
        toast.success('紙クーポンの使用枚数を報告しました', { position: 'top-center', duration: 1800 });
      } catch (error) {
        console.error('[event-benefits] paper report error', error);
        toast.error('報告に失敗しました', { position: 'top-center' });
      } finally {
        setPaperSaving(null);
      }
    },
    [storeId, session?.access_token, paperDraft]
  );

  const fetchHistory = useCallback(
    async (eventId: string) => {
      if (!storeId) return;
      setHistoryLoading(eventId);
      try {
        const token = session?.access_token;
        if (!token) return;
        const res = await fetch(
          `/api/stores/${storeId}/events/${eventId}/redemptions`,
          { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return;
        const json = await res.json();
        const list = (json.redemptions ?? []) as StoreEventBenefitRedemption[];
        setHistoriesByEvent((prev) => ({ ...prev, [eventId]: list }));
      } catch (error) {
        console.warn('[event-benefits] fetch history warning', error);
      } finally {
        setHistoryLoading(null);
      }
    },
    [storeId, session?.access_token]
  );

  const recordRedemption = useCallback(
    async (eventId: string) => {
      if (!storeId) return;
      setRecordingEventId(eventId);
      try {
        const token = session?.access_token;
        if (!token) throw new Error('session_missing');
        const res = await fetch(
          `/api/stores/${storeId}/events/${eventId}/redemptions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? `save_failed:${res.status}`);
        toast.success('特典利用を記録しました', { position: 'top-center', duration: 1500 });
        // 楽観更新
        setEvents((prev) =>
          prev.map((event) =>
            event.id === eventId
              ? {
                  ...event,
                  stats: {
                    redemption_count: (event.stats?.redemption_count ?? 0) + 1,
                    last_redeemed_at: new Date().toISOString(),
                  },
                }
              : event
          )
        );
        // 履歴が展開中なら再取得
        if (expandedEventId === eventId) {
          fetchHistory(eventId);
        }
      } catch (error) {
        console.error('[event-benefits] record error', error);
        toast.error('記録に失敗しました', { position: 'top-center' });
      } finally {
        setRecordingEventId(null);
      }
    },
    [storeId, session?.access_token, expandedEventId, fetchHistory]
  );

  const toggleHistory = useCallback(
    (eventId: string) => {
      if (expandedEventId === eventId) {
        setExpandedEventId(null);
      } else {
        setExpandedEventId(eventId);
        if (!historiesByEvent[eventId]) {
          fetchHistory(eventId);
        }
      }
    },
    [expandedEventId, historiesByEvent, fetchHistory]
  );

  const totalRedemptions = useMemo(
    () => events.reduce((sum, event) => sum + (event.stats?.redemption_count ?? 0), 0),
    [events]
  );

  return (
    <div className="min-h-[100dvh] pb-20" style={{ background: COLORS.cardGradient }}>
      <header
        className="sticky top-0 z-20 safe-top"
        style={{
          background: COLORS.luxuryGradient,
          borderBottom: `1px solid rgba(201, 168, 108, 0.2)`,
        }}
      >
        <div className="flex items-center justify-center p-4 relative">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5" style={{ color: COLORS.ivory }} />
            <h1 className="text-lg font-light tracking-widest" style={{ color: COLORS.ivory }}>
              特典管理
            </h1>
          </div>
          <CloseCircleButton
            type="button"
            size="lg"
            onClick={() => router.push(`/store/manage/${storeId}/engagement`)}
            className="absolute right-4"
            aria-label="閉じる"
          />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* 店舗ヘッダー */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            className="p-5 rounded-2xl shadow-lg flex items-center gap-4"
            style={{
              background: '#FFFFFF',
              border: `1px solid rgba(201, 168, 108, 0.15)`,
            }}
          >
            {store?.image_urls && store.image_urls.length > 0 ? (
              <img
                src={store.image_urls[0]}
                alt={store.name}
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                style={{ border: `1px solid rgba(201, 168, 108, 0.25)` }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(201, 168, 108, 0.08)',
                  border: `1px solid rgba(201, 168, 108, 0.2)`,
                }}
              >
                <Utensils className="w-6 h-6" style={{ color: COLORS.warmGray }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: COLORS.warmGray }}>
                参加イベント数 {events.length} 件 / 累計利用 {totalRedemptions} 件
              </p>
              <h2 className="text-base font-bold truncate" style={{ color: COLORS.deepNavy }}>
                {storeLoading ? '読み込み中…' : store?.name || '店舗情報が取得できませんでした'}
              </h2>
            </div>
            <Sparkles className="w-5 h-5 shrink-0" style={{ color: COLORS.champagneGold }} />
          </Card>
        </motion.div>

        {/* イベント一覧 */}
        {loading ? (
          <Card className="p-6 rounded-2xl shadow-lg flex items-center justify-center gap-2" style={{ background: '#FFFFFF' }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.warmGray }} />
            <p className="text-sm font-semibold" style={{ color: COLORS.warmGray }}>読み込み中…</p>
          </Card>
        ) : events.length === 0 ? (
          <Card
            className="p-6 rounded-2xl shadow-lg text-center"
            style={{ background: '#FFFFFF', border: `1px solid rgba(201, 168, 108, 0.15)` }}
          >
            <PartyPopper className="w-10 h-10 mx-auto mb-3" style={{ color: COLORS.warmGray }} />
            <p className="text-sm font-bold mb-1" style={{ color: COLORS.deepNavy }}>
              参加中のイベントがありません
            </p>
            <p className="text-xs leading-relaxed" style={{ color: COLORS.warmGray }}>
              店舗管理 → イベント参加設定 でイベントに参加すると、こちらで特典の利用状況を管理できます。
            </p>
          </Card>
        ) : (
          events.map((event) => {
            const benefit = event.participation?.benefit_text?.trim() || '';
            const count = event.stats?.redemption_count ?? 0;
            const lastAt = event.stats?.last_redeemed_at ?? null;
            const recording = recordingEventId === event.id;
            const expanded = expandedEventId === event.id;
            const history = historiesByEvent[event.id] ?? [];
            const paper = paperByEvent[event.id];
            const pDraft = paperDraft[event.id] ?? { distributed: '', redeemed: '' };
            const savingPaper = paperSaving === event.id;
            // 紙クーポンイベント=デジタル消込なし（紙の使用報告で集計）。
            // 電子クーポンイベント=会員証スキャンでデジタル消込（来店と同時にカウント）。
            const isPaper = !!event.uses_paper_coupon;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className="p-5 rounded-2xl shadow-lg"
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid rgba(255, 200, 44, 0.4)`,
                  }}
                >
                  <div className="flex items-start gap-2 mb-3">
                    <PartyPopper className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#13294b' }} />
                    <h3 className="text-base font-bold leading-tight flex-1" style={{ color: COLORS.deepNavy }}>
                      {event.title}
                    </h3>
                  </div>

                  {benefit && (
                    <div
                      className="rounded-xl p-3 mb-3"
                      style={{
                        background: 'rgba(255, 200, 44, 0.10)',
                        border: '1px solid rgba(255, 200, 44, 0.35)',
                      }}
                    >
                      <p className="text-[11px] font-bold mb-1 inline-flex items-center gap-1" style={{ color: COLORS.warmGray }}>
                        <Gift className="w-3 h-3" /> 特典内容
                      </p>
                      <p className="text-sm font-semibold leading-relaxed" style={{ color: COLORS.deepNavy }}>
                        {benefit}
                      </p>
                    </div>
                  )}

                  {/* デジタル消込の実績（電子クーポンのみ。紙クーポンは常に 0 のため非表示） */}
                  {!isPaper && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div
                        className="rounded-xl p-3"
                        style={{
                          background: 'rgba(19, 41, 75, 0.04)',
                          border: '1px solid rgba(19, 41, 75, 0.08)',
                        }}
                      >
                        <p className="text-[11px] font-bold" style={{ color: COLORS.warmGray }}>デジタル消込</p>
                        <p className="text-2xl font-extrabold" style={{ color: COLORS.deepNavy }}>{count}</p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{
                          background: 'rgba(19, 41, 75, 0.04)',
                          border: '1px solid rgba(19, 41, 75, 0.08)',
                        }}
                      >
                        <p className="text-[11px] font-bold inline-flex items-center gap-1" style={{ color: COLORS.warmGray }}>
                          <CalendarDays className="w-3 h-3" /> 最終利用
                        </p>
                        <p className="text-sm font-bold" style={{ color: COLORS.deepNavy }}>
                          {formatDateTime(lastAt)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 紙クーポン使用報告（紙クーポンイベントのみ。イベント終了時に運営へ報告） */}
                  {isPaper && (
                  <div
                    className="rounded-xl p-3 mb-3"
                    style={{
                      background: 'rgba(19, 41, 75, 0.03)',
                      border: '1px solid rgba(19, 41, 75, 0.10)',
                    }}
                  >
                    <p className="text-[11px] font-bold mb-2 inline-flex items-center gap-1" style={{ color: COLORS.warmGray }}>
                      <Gift className="w-3 h-3" /> 紙クーポン使用報告
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <label className="block">
                        <span className="text-[10px] font-bold" style={{ color: COLORS.warmGray }}>配布枚数</span>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={pDraft.distributed}
                          onChange={(e) =>
                            setPaperDraft((prev) => ({
                              ...prev,
                              [event.id]: { distributed: e.target.value, redeemed: prev[event.id]?.redeemed ?? '' },
                            }))
                          }
                          placeholder="0"
                          className="mt-1 w-full px-3 py-2 rounded-lg text-sm font-bold outline-none"
                          style={{ background: '#FFFFFF', border: '1px solid #DCE1EB', color: COLORS.deepNavy }}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-bold" style={{ color: COLORS.warmGray }}>使用枚数</span>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={pDraft.redeemed}
                          onChange={(e) =>
                            setPaperDraft((prev) => ({
                              ...prev,
                              [event.id]: { distributed: prev[event.id]?.distributed ?? '', redeemed: e.target.value },
                            }))
                          }
                          placeholder="0"
                          className="mt-1 w-full px-3 py-2 rounded-lg text-sm font-bold outline-none"
                          style={{ background: '#FFFFFF', border: '1px solid #DCE1EB', color: COLORS.deepNavy }}
                        />
                      </label>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px]" style={{ color: COLORS.warmGray }}>
                        {paper?.reported_at ? `報告済 ${formatDateTime(paper.reported_at)}` : '未報告'}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={savingPaper}
                        onClick={() => savePaperReport(event.id)}
                        className="text-xs font-bold"
                        style={{ borderColor: '#13294b', color: '#13294b' }}
                      >
                        {savingPaper ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            報告中…
                          </>
                        ) : (
                          '使用枚数を報告'
                        )}
                      </Button>
                    </div>
                  </div>
                  )}

                  {/* 電子クーポン: 会員ごとの消込は「会員証読み取り」に一本化。手動は件数のみのフォールバック。
                      紙クーポン: デジタル消込は行わない旨を案内。 */}
                  {!isPaper ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={recording}
                        onClick={() => recordRedemption(event.id)}
                        className="w-full py-2.5 rounded-xl font-bold text-xs"
                        style={{ borderColor: 'rgba(19,41,75,0.25)', color: COLORS.deepNavy }}
                      >
                        {recording ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            記録中…
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1.5" />
                            特典利用を記録（+1）
                          </>
                        )}
                      </Button>
                      <p
                        className="mt-2 text-[11px] leading-relaxed text-center"
                        style={{ color: COLORS.warmGray }}
                      >
                        会員ごとの記録は「会員証読み取り」での会員証QRスキャンが自動で行います（来店と同時にデジタル消込）。
                      </p>
                    </>
                  ) : (
                    <p
                      className="text-[11px] leading-relaxed text-center"
                      style={{ color: COLORS.warmGray }}
                    >
                      紙クーポンの使用は上の「紙クーポン使用報告」で集計します。会員証読み取りは来店記録のみで、デジタル消込は行いません。
                    </p>
                  )}

                  {/* デジタル消込の利用履歴（電子クーポンのみ） */}
                  {!isPaper && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleHistory(event.id)}
                        className="mt-3 w-full inline-flex items-center justify-center gap-1 text-xs font-bold transition-colors"
                        style={{ color: COLORS.warmGray }}
                      >
                        利用履歴を{expanded ? '閉じる' : '見る'}
                        {expanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {expanded && (
                        <div className="mt-3">
                          {historyLoading === event.id ? (
                            <div className="flex items-center justify-center gap-2 py-3 text-xs" style={{ color: COLORS.warmGray }}>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              履歴を読み込み中…
                            </div>
                          ) : history.length === 0 ? (
                            <p className="text-xs text-center py-3 font-semibold" style={{ color: COLORS.warmGray }}>
                              まだ利用記録がありません
                            </p>
                          ) : (
                            <ul
                              className="rounded-xl divide-y"
                              style={{
                                background: 'rgba(19, 41, 75, 0.03)',
                                borderColor: 'rgba(19, 41, 75, 0.08)',
                              }}
                            >
                              {history.map((row) => (
                                <li
                                  key={row.id}
                                  className="px-3 py-2 text-xs font-semibold"
                                  style={{ color: COLORS.deepNavy, borderColor: 'rgba(19, 41, 75, 0.08)' }}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <CalendarDays className="w-3 h-3" style={{ color: '#13294b' }} />
                                    {formatDateTime(row.redeemed_at)}
                                    {row.customer_name && (
                                      <span
                                        className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                                        style={{ background: 'rgba(255,200,44,0.18)', color: '#13294b' }}
                                      >
                                        {row.customer_name}
                                      </span>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
