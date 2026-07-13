'use client';

/**
 * 運営: イベント効果測定（ROI）ダッシュボード
 * /store/manage/events/[eventId]/roi
 * 紙クーポン・デジタル特典を横断し、費用入力に対する効率指標を可視化する。
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart3, Loader2, Footprints, Store as StoreIcon,
  Ticket, Banknote, Download, Users,
} from 'lucide-react';
import { useAdminTheme } from '@/lib/admin-theme-context';
import { useAuth } from '@/lib/auth/context';
import { AdminKpiCard, AdminKpiGrid, getKpiGradient } from '@/components/admin/admin-kpi-card';
import { AdminDataTable, type AdminColumn } from '@/components/admin/admin-data-table';

type RoiMetrics = {
  cost_total: number | null;
  participating_stores: number;
  check_ins_total: number;
  unique_customers: number;
  digital_redemptions: number;
  stamp_rewards_claimed: number;
  paper_distributed: number;
  paper_redeemed: number;
  paper_reported_stores: number;
  total_redemptions: number;
  per_user_redemptions?: number;
  per_user_unique_customers?: number;
  stamp_submissions?: number;
  cost_per_check_in: number | null;
  cost_per_redemption: number | null;
  paper_redemption_rate: number | null;
};

type PerUserRedemption = {
  id: string;
  user_id: string;
  customer_name: string;
  store_id: string;
  store_name: string;
  redeemed_at: string;
};

type PaperReport = {
  store_id: string;
  store_name: string;
  distributed_count: number;
  redeemed_count: number;
  reported_at: string | null;
};

type StampSubmission = {
  user_id: string;
  customer_name: string;
  submitted_at: string;
  submit_note: string | null;
};

type VisitorDetail = {
  user_id: string;
  customer_name: string;
  visits: number;
  last_checked_in_at: string | null;
  digital_redeemed: boolean;
  stamp_completed: boolean;
  gender: string;
  age: string;
  occupation: string;
  address: string;
};

type StoreBreakdown = {
  store_id: string;
  store_name: string;
  paper_distributed: number;
  paper_redeemed: number;
  paper_reported: boolean;
  digital_redemptions: number;
  check_ins: number;
  unique_customers: number;
  stamp_completions: number;
  visitors: VisitorDetail[];
};

type RoiResponse = {
  event: { id: string; title: string; cost_total: number | null; start_at: string | null; end_at: string | null };
  metrics: RoiMetrics;
  paper_reports: PaperReport[];
  per_user_redemptions?: PerUserRedemption[];
  stamp_submissions?: StampSubmission[];
  store_breakdown?: StoreBreakdown[];
};

const yen = (n: number | null) => (n === null ? '—' : `¥${n.toLocaleString('ja-JP')}`);
const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);
function fmtDate(iso: string | null) {
  if (!iso) return '未設定';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '未設定';
  return d.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit' });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
// 会員証ページで入力された属性（profile_attributes）のラベル化
const GENDER_LABEL: Record<string, string> = {
  female: '女性',
  male: '男性',
  other: 'その他',
  prefer_not_to_say: '未回答',
};
/** 年齢(数値文字列)を年代に変換。例: "28" → "20代" */
function ageBand(age: string): string {
  const n = parseInt(age, 10);
  if (!Number.isFinite(n) || n <= 0) return age || '未回答';
  if (n < 10) return '10歳未満';
  if (n >= 100) return '100代以上';
  return `${Math.floor(n / 10) * 10}代`;
}

export default function EventRoiPage() {
  const { colors: C } = useAdminTheme();
  const params = useParams();
  const eventId = params?.eventId as string;
  const { session, loading: authLoading } = useAuth();
  const accessToken = session?.access_token;

  const [data, setData] = useState<RoiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoi = useCallback(async () => {
    if (!accessToken || !eventId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/events/${eventId}/roi`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Cache-Control': 'no-cache',
        },
      });
      if (!res.ok) throw new Error(`fetch_failed:${res.status}`);
      const json = (await res.json()) as RoiResponse;
      setData(json);
    } catch (err) {
      console.error('[roi] fetch error', err);
      setError('効果測定データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [accessToken, eventId]);

  useEffect(() => {
    if (authLoading) return;
    fetchRoi();
  }, [authLoading, fetchRoi]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.accent }} />
      </div>
    );
  }

  const m = data?.metrics;
  const storeBreakdownColumns: AdminColumn<StoreBreakdown>[] = [
    {
      key: 'store',
      header: '参加店',
      width: '2.2fr',
      render: (r) => <span className="text-sm font-semibold" style={{ color: C.text }}>{r.store_name}</span>,
    },
    {
      key: 'paper',
      header: '紙クーポン（使用/配布）',
      width: '1.8fr',
      render: (r) => (
        <span className="text-sm" style={{ color: C.textMuted }}>
          {r.paper_redeemed} / {r.paper_distributed}
          {!r.paper_reported && <span className="text-xs ml-1" style={{ color: C.textSubtle }}>(未報告)</span>}
        </span>
      ),
    },
    {
      key: 'digital',
      header: 'デジタル消込',
      width: '1.2fr',
      render: (r) => <span className="text-sm font-semibold" style={{ color: C.text }}>{r.digital_redemptions}</span>,
    },
    {
      key: 'checkins',
      header: 'スタンプ来店（客数）',
      width: '1.6fr',
      render: (r) => (
        <span className="text-sm" style={{ color: C.textMuted }}>
          {r.check_ins} <span className="text-xs" style={{ color: C.textSubtle }}>({r.unique_customers}名)</span>
        </span>
      ),
    },
    {
      key: 'stamp',
      header: 'スタンプ達成',
      width: '1.1fr',
      render: (r) => <span className="text-sm font-semibold" style={{ color: C.text }}>{r.stamp_completions}</span>,
    },
  ];

  // 会員別の表（要望: イベント管理にユーザー用の表）。
  // スタンプを全て集めて運営に送信した会員 / 会員証スキャンで消し込んだ会員。
  const submissionColumns: AdminColumn<StampSubmission>[] = [
    {
      key: 'name',
      header: '会員',
      width: '1.4fr',
      render: (r) => <span className="text-sm font-semibold" style={{ color: C.text }}>{r.customer_name}</span>,
    },
    {
      key: 'submitted',
      header: '送信日時',
      width: '1.2fr',
      render: (r) => <span className="text-sm" style={{ color: C.textMuted }}>{fmtDateTime(r.submitted_at)}</span>,
    },
    {
      key: 'note',
      header: 'メッセージ',
      width: '2fr',
      render: (r) => <span className="text-sm" style={{ color: C.textMuted }}>{r.submit_note?.trim() || '—'}</span>,
    },
  ];

  const redemptionColumns: AdminColumn<PerUserRedemption>[] = [
    {
      key: 'name',
      header: '会員',
      width: '1.4fr',
      render: (r) => <span className="text-sm font-semibold" style={{ color: C.text }}>{r.customer_name}</span>,
    },
    {
      key: 'store',
      header: '店舗',
      width: '1.6fr',
      render: (r) => <span className="text-sm" style={{ color: C.textMuted }}>{r.store_name}</span>,
    },
    {
      key: 'redeemed',
      header: '消込日時',
      width: '1.2fr',
      render: (r) => <span className="text-sm" style={{ color: C.textMuted }}>{fmtDateTime(r.redeemed_at)}</span>,
    },
  ];

  // 主催者へ提供するための参加店レポートを CSV で書き出す
  const exportCsv = () => {
    if (!data) return;
    const rows = data.store_breakdown ?? [];
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['参加店', '紙クーポン配布', '紙クーポン使用', '紙クーポン報告', 'デジタル消込', 'スタンプ来店数', 'ユニーク客数', 'スタンプ達成'];
    const body = rows.map((r) =>
      [r.store_name, r.paper_distributed, r.paper_redeemed, r.paper_reported ? '報告済' : '未報告', r.digital_redemptions, r.check_ins, r.unique_customers, r.stamp_completions]
        .map(esc)
        .join(',')
    );
    const csv = [header.join(','), ...body].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const title = (data.event.title ?? 'event').replace(/[\\/:*?"<>|]/g, '_');
    a.download = `${title}_参加店レポート.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 主催者提供用: 個人名を除いた匿名の会員属性CSV（性別・年代・職業など会員証ページの入力情報）。
  // 全店の来店者をユーザー単位で集約し、イベント全体の重複来店を1会員にまとめて出力する。
  const exportAttributesCsv = () => {
    if (!data) return;
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const byUser = new Map<
      string,
      {
        gender: string; age: string; occupation: string; address: string;
        visits: number; stores: Set<string>; digital: boolean; stamp: boolean; last: string | null;
      }
    >();
    for (const s of data.store_breakdown ?? []) {
      for (const v of s.visitors) {
        const cur = byUser.get(v.user_id);
        if (cur) {
          cur.visits += v.visits;
          cur.stores.add(s.store_id);
          cur.digital = cur.digital || v.digital_redeemed;
          cur.stamp = cur.stamp || v.stamp_completed;
          if (v.last_checked_in_at && (!cur.last || v.last_checked_in_at > cur.last)) cur.last = v.last_checked_in_at;
        } else {
          byUser.set(v.user_id, {
            gender: v.gender, age: v.age, occupation: v.occupation, address: v.address,
            visits: v.visits, stores: new Set([s.store_id]),
            digital: v.digital_redeemed, stamp: v.stamp_completed, last: v.last_checked_in_at,
          });
        }
      }
    }
    const header = ['性別', '年代', '職業', '住所エリア', '来店店舗数', '総来店回数', '最終来店日時', 'デジタル消込', 'スタンプ達成'];
    const body = Array.from(byUser.values())
      .sort((a, b) => b.visits - a.visits)
      .map((u) =>
        [
          GENDER_LABEL[u.gender] || u.gender || '未回答',
          ageBand(u.age),
          u.occupation || '未回答',
          u.address || '',
          u.stores.size,
          u.visits,
          fmtDateTime(u.last),
          u.digital ? '○' : '',
          u.stamp ? '○' : '',
        ]
          .map(esc)
          .join(',')
      );
    const csv = [header.join(','), ...body].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const title = (data.event.title ?? 'event').replace(/[\\/:*?"<>|]/g, '_');
    a.download = `${title}_会員属性（匿名）.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto space-y-6 px-4 py-5 sm:py-8 md:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: C.accent }} />
            <span className="font-en text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: C.textSubtle }}>
              EVENT ROI
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: C.text }}>
            {data?.event.title ?? 'イベント'}
          </h1>
          <p className="text-sm mt-1" style={{ color: C.textSubtle }}>
            効果測定 ／ {fmtDate(data?.event.start_at ?? null)} - {fmtDate(data?.event.end_at ?? null)}
          </p>
        </motion.div>

        {error && (
          <div className="rounded-xl p-4 text-sm" style={{ background: C.dangerBg, color: C.danger, border: `1px solid ${C.border}` }}>
            {error}
          </div>
        )}

        {m && (
          <>
            {/* 主要KPI */}
            <AdminKpiGrid>
              <AdminKpiCard icon={Banknote} label="イベント費用" value={yen(m.cost_total)} gradient={getKpiGradient('gold')} index={0} />
              <AdminKpiCard icon={Footprints} label="チェックイン" value={m.check_ins_total} subLabel={`ユニーク ${m.unique_customers}人`} gradient={getKpiGradient('blue')} index={1} />
              <AdminKpiCard icon={Ticket} label="特典消込（合計）" value={m.total_redemptions} subLabel={`デジタル ${m.digital_redemptions} / 紙 ${m.paper_redeemed}`} gradient={getKpiGradient('amber')} index={2} />
              <AdminKpiCard icon={StoreIcon} label="参加店舗" value={m.participating_stores} gradient={getKpiGradient('green')} index={3} />
            </AdminKpiGrid>

            {/* 効率指標 */}
            <section>
              <h2 className="text-sm font-bold tracking-wide mb-3" style={{ color: C.text }}>効率指標</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'コスト / チェックイン', value: yen(m.cost_per_check_in), hint: '1チェックインあたりの費用' },
                  { label: 'コスト / 特典消込', value: yen(m.cost_per_redemption), hint: '1消込あたりの費用（紙＋デジタル）' },
                  { label: '紙クーポン消込率', value: pct(m.paper_redemption_rate), hint: `使用 ${m.paper_redeemed} / 配布 ${m.paper_distributed}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-4" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                    <p className="text-xs font-medium" style={{ color: C.textSubtle }}>{item.label}</p>
                    <p className="text-2xl font-bold mt-1.5 tracking-tight" style={{ color: C.text }}>{item.value}</p>
                    <p className="text-[11px] mt-1" style={{ color: C.textSubtle }}>{item.hint}</p>
                  </div>
                ))}
              </div>
              {m.cost_total === null && (
                <p className="text-xs mt-2" style={{ color: C.warning }}>
                  ※ イベント費用が未入力のため、コスト系指標は算出できません。イベント編集で費用を入力してください。
                </p>
              )}
            </section>

            {/* 参加店ごとの内訳（紙クーポン報告・会員証スキャン消込・スタンプ達成を1つの表に統合） */}
            <section>
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold tracking-wide" style={{ color: C.text }}>参加店ごとの内訳</h2>
                  <span className="text-xs" style={{ color: C.textSubtle }}>全 {m.participating_stores} 店</span>
                  <span className="text-[11px]" style={{ color: C.textSubtle }}>・行をタップで来店した会員を表示</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={exportCsv}
                    disabled={!data?.store_breakdown?.length}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-50"
                    style={{ background: C.accent, color: '#fffaf0' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    店舗別レポートCSV
                  </button>
                  <button
                    type="button"
                    onClick={exportAttributesCsv}
                    disabled={!data?.store_breakdown?.some((s) => s.visitors.length > 0)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-50"
                    style={{ background: C.bgCard, color: C.text, border: `1px solid ${C.border}` }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    会員属性CSV（匿名）
                  </button>
                </div>
              </div>
              {/* 統合サマリー: 紙クーポン報告・会員証消込・スタンプ達成の全体総数 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { label: '紙クーポン報告済', value: `${m.paper_reported_stores} / ${m.participating_stores} 店` },
                  { label: '会員証スキャン消込', value: `${m.per_user_redemptions ?? 0} 件（${m.per_user_unique_customers ?? 0} 名）` },
                  { label: 'スタンプ達成・送信', value: `${m.stamp_submissions ?? 0} 件` },
                ].map((chip) => (
                  <div key={chip.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                    <span style={{ color: C.textSubtle }}>{chip.label}</span>
                    <span className="font-bold" style={{ color: C.text }}>{chip.value}</span>
                  </div>
                ))}
              </div>
              <AdminDataTable
                columns={storeBreakdownColumns}
                data={data?.store_breakdown ?? []}
                keyExtractor={(r) => r.store_id}
                emptyIcon={<StoreIcon className="w-12 h-12" style={{ color: C.textSubtle }} />}
                emptyTitle="参加店がまだありません"
                emptyDescription="加盟店がイベントに参加すると、紙クーポン・会員証消込・スタンプ達成がここに集計されます"
                mobileCardRender={(r) => (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: C.text }}>{r.store_name}</p>
                      <span className="text-xs" style={{ color: C.textSubtle }}>来店 {r.check_ins}（{r.unique_customers}名）</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs" style={{ color: C.textMuted }}>
                      <span>紙 {r.paper_redeemed}/{r.paper_distributed}{!r.paper_reported && '（未報告）'}</span>
                      <span>デジタル消込 {r.digital_redemptions}</span>
                      <span>スタンプ達成 {r.stamp_completions}</span>
                    </div>
                  </div>
                )}
                renderExpanded={(r) => (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-3.5 h-3.5" style={{ color: C.textSubtle }} />
                      <span className="text-xs font-bold" style={{ color: C.text }}>来店した会員（誰がこの店に入ったか）</span>
                      <span className="text-xs" style={{ color: C.textSubtle }}>{r.visitors.length} 名</span>
                    </div>
                    {r.visitors.length === 0 ? (
                      <p className="text-xs" style={{ color: C.textSubtle }}>この店への来店記録はまだありません。</p>
                    ) : (
                      <div className="space-y-1.5">
                        {r.visitors.map((v) => (
                          <div
                            key={v.user_id}
                            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                            style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: C.text }}>{v.customer_name}</p>
                              <p className="text-[11px]" style={{ color: C.textSubtle }}>
                                最終来店 {fmtDateTime(v.last_checked_in_at)} ・ {v.visits}回
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {v.digital_redeemed && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: C.accentBg, color: C.accent }}>消込</span>
                              )}
                              {v.stamp_completed && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: C.successBg, color: C.success }}>達成</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              />
            </section>

            {/* 会員別: スタンプ達成・送信した会員（運営が誰に特典を案内するか把握する表） */}
            <section>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <h2 className="text-sm font-bold tracking-wide" style={{ color: C.text }}>スタンプ達成・送信した会員</h2>
                <span className="text-xs" style={{ color: C.textSubtle }}>{m.stamp_submissions ?? 0} 件</span>
                <span className="text-[11px]" style={{ color: C.textSubtle }}>・全スタンプを集めて運営に送信した会員</span>
              </div>
              <AdminDataTable
                columns={submissionColumns}
                data={data?.stamp_submissions ?? []}
                keyExtractor={(r) => r.user_id}
                emptyIcon={<Users className="w-12 h-12" style={{ color: C.textSubtle }} />}
                emptyTitle="まだ送信した会員はいません"
                emptyDescription="会員が全スタンプを集めて運営に送信すると、ここに表示されます"
                mobileCardRender={(r) => (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: C.text }}>{r.customer_name}</p>
                      <span className="text-xs" style={{ color: C.textSubtle }}>{fmtDateTime(r.submitted_at)}</span>
                    </div>
                    {r.submit_note?.trim() && (
                      <p className="text-xs mt-1" style={{ color: C.textMuted }}>{r.submit_note.trim()}</p>
                    )}
                  </div>
                )}
              />
            </section>

            {/* 会員別: 会員証スキャン消込（どの会員がどの店で消し込んだか） */}
            <section>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <h2 className="text-sm font-bold tracking-wide" style={{ color: C.text }}>会員証スキャン消込</h2>
                <span className="text-xs" style={{ color: C.textSubtle }}>{m.per_user_redemptions ?? 0} 件（{m.per_user_unique_customers ?? 0} 名）</span>
                <span className="text-[11px]" style={{ color: C.textSubtle }}>・会員証QRのスキャンで電子クーポンを消し込んだ記録</span>
              </div>
              <AdminDataTable
                columns={redemptionColumns}
                data={data?.per_user_redemptions ?? []}
                keyExtractor={(r) => r.id}
                emptyIcon={<Ticket className="w-12 h-12" style={{ color: C.textSubtle }} />}
                emptyTitle="まだ消込はありません"
                emptyDescription="加盟店が会員証QRをスキャンすると、ここに会員別の消込が表示されます"
                mobileCardRender={(r) => (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: C.text }}>{r.customer_name}</p>
                      <span className="text-xs" style={{ color: C.textSubtle }}>{fmtDateTime(r.redeemed_at)}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: C.textMuted }}>{r.store_name}</p>
                  </div>
                )}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
