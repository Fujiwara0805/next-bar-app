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
  Building2,
  ChevronDown,
  ChevronUp,
  Ticket,
} from 'lucide-react';
import { ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CloseCircleButton } from '@/components/ui/close-circle-button';
import { MembershipRedeemScanner } from '@/components/store/membership-redeem-scanner';
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
  const [scanEvent, setScanEvent] = useState<{ id: string; title: string } | null>(null);
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
  // クーポン番号での消込（公式LINEで配信された電子クーポン番号を手入力）
  const [codeDraft, setCodeDraft] = useState<Record<string, string>>({});
  const [codeSubmitting, setCodeSubmitting] = useState<string | null>(null);

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

  // クーポン番号で消し込む（公式LINEで配信された番号 #1111 等をイベントの番号と照合）
  const redeemByCode = useCallback(
    async (eventId: string) => {
      if (!storeId) return;
      const code = (codeDraft[eventId] ?? '').trim();
      if (!code) {
        toast.error('クーポン番号を入力してください', { position: 'top-center' });
        return;
      }
      setCodeSubmitting(eventId);
      try {
        const token = session?.access_token;
        if (!token) throw new Error('session_missing');
        const res = await fetch(
          `/api/stores/${storeId}/events/${eventId}/redeem-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ code }),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            json?.error === 'code_mismatch'
              ? 'クーポン番号が一致しません'
              : json?.error === 'no_code_configured'
                ? 'このイベントにはクーポン番号が設定されていません'
                : '消込に失敗しました';
          toast.error(msg, { position: 'top-center' });
          return;
        }
        toast.success('クーポン番号で消込しました', { position: 'top-center', duration: 1500 });
        setCodeDraft((prev) => ({ ...prev, [eventId]: '' }));
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
        if (expandedEventId === eventId) fetchHistory(eventId);
      } catch (error) {
        console.error('[event-benefits] redeem-code error', error);
        toast.error('消込に失敗しました', { position: 'top-center' });
      } finally {
        setCodeSubmitting(null);
      }
    },
    [storeId, codeDraft, session?.access_token, expandedEventId, fetchHistory]
  );

  // 会員証QR消込の成功時: 件数と履歴を最新化
  const handleRedeemed = useCallback(
    (eventId: string) => {
      fetchEvents();
      if (expandedEventId === eventId) fetchHistory(eventId);
    },
    [fetchEvents, expandedEventId, fetchHistory]
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
              特典の消し込み
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
                <Building2 className="w-6 h-6" style={{ color: COLORS.warmGray }} />
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
                    {event.redemption_code && (
                      <span
                        className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(19,41,75,0.06)', color: COLORS.deepNavy }}
                      >
                        クーポン番号 {event.redemption_code}
                      </span>
                    )}
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

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: 'rgba(19, 41, 75, 0.04)',
                        border: '1px solid rgba(19, 41, 75, 0.08)',
                      }}
                    >
                      <p className="text-[11px] font-bold" style={{ color: COLORS.warmGray }}>累計利用件数</p>
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

                  {/* 紙クーポン使用報告（イベント終了時に運営へ報告） */}
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

                  <Button
                    type="button"
                    onClick={() => setScanEvent({ id: event.id, title: event.title })}
                    className="w-full py-3 rounded-xl font-bold text-sm shadow-md mb-2"
                    style={{
                      background: COLORS.goldGradient,
                      color: COLORS.deepNavy,
                      boxShadow: '0 6px 18px rgba(201, 168, 108, 0.28)',
                    }}
                  >
                    <ScanLine className="w-4 h-4 mr-1.5" />
                    会員証QRで消込（顧客に記録）
                  </Button>

                  {/* クーポン番号で消し込む（公式LINEで配信された番号を手入力） */}
                  {event.redemption_code && (
                    <div
                      className="mb-2 rounded-xl p-3"
                      style={{ background: 'rgba(19,41,75,0.04)', border: '1px solid rgba(19,41,75,0.10)' }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <Ticket className="w-3.5 h-3.5" style={{ color: COLORS.deepNavy }} />
                        <span className="text-[11px] font-bold" style={{ color: COLORS.deepNavy }}>
                          クーポン番号で消し込む
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="text"
                          value={codeDraft[event.id] ?? ''}
                          onChange={(e) =>
                            setCodeDraft((prev) => ({ ...prev, [event.id]: e.target.value }))
                          }
                          placeholder={`例: ${event.redemption_code}`}
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-bold outline-none"
                          style={{ background: '#FFFFFF', border: '1px solid #DCE1EB', color: COLORS.deepNavy }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={codeSubmitting === event.id}
                          onClick={() => redeemByCode(event.id)}
                          className="text-xs font-bold shrink-0"
                          style={{ background: COLORS.deepNavy, color: '#ffc82c' }}
                        >
                          {codeSubmitting === event.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            '消込'
                          )}
                        </Button>
                      </div>
                      <p className="text-[10px] mt-1.5" style={{ color: COLORS.warmGray }}>
                        お客様が提示した電子クーポンの番号を入力して消し込みます。
                      </p>
                    </div>
                  )}

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
                        QRなしで件数のみ記録
                      </>
                    )}
                  </Button>

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
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {scanEvent && (
        <MembershipRedeemScanner
          storeId={storeId}
          eventId={scanEvent.id}
          eventTitle={scanEvent.title}
          onClose={() => setScanEvent(null)}
          onRedeemed={() => handleRedeemed(scanEvent.id)}
        />
      )}
    </div>
  );
}
