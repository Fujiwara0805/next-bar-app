'use client';

/**
 * 運営: イベント費用対効果（ROI）ダッシュボード
 * /store/manage/events/[eventId]/roi
 * 紙クーポン・デジタル特典を横断し、費用入力に対する効率指標を可視化する。
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BarChart3, Loader2, Users, Footprints, Store as StoreIcon,
  Ticket, Banknote, Download,
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

type StoreBreakdown = {
  store_id: string;
  store_name: string;
  paper_distributed: number;
  paper_redeemed: number;
  paper_reported: boolean;
  digital_redemptions: number;
  check_ins: number;
  unique_customers: number;
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

export default function EventRoiPage() {
  const { colors: C } = useAdminTheme();
  const router = useRouter();
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
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`fetch_failed:${res.status}`);
      setData(await res.json());
    } catch (err) {
      console.error('[roi] fetch error', err);
      setError('費用対効果データの取得に失敗しました');
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
  const paperColumns: AdminColumn<PaperReport>[] = [
    {
      key: 'store',
      header: '店舗',
      width: '2fr',
      render: (r) => <span className="text-sm font-semibold" style={{ color: C.text }}>{r.store_name}</span>,
    },
    {
      key: 'distributed',
      header: '配布',
      width: '1fr',
      render: (r) => <span className="text-sm" style={{ color: C.textMuted }}>{r.distributed_count}</span>,
    },
    {
      key: 'redeemed',
      header: '使用',
      width: '1fr',
      render: (r) => <span className="text-sm font-bold" style={{ color: C.text }}>{r.redeemed_count}</span>,
    },
    {
      key: 'rate',
      header: '消込率',
      width: '1fr',
      render: (r) => (
        <span className="text-sm" style={{ color: C.textMuted }}>
          {r.distributed_count > 0 ? `${Math.round((r.redeemed_count / r.distributed_count) * 100)}%` : '—'}
        </span>
      ),
    },
    {
      key: 'reported',
      header: '報告',
      width: '1fr',
      render: (r) => (
        <span className="text-xs" style={{ color: r.reported_at ? C.success : C.textSubtle }}>
          {r.reported_at ? '報告済' : '未報告'}
        </span>
      ),
    },
  ];

  const fmtDateTime = (iso: string) => {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '—';
    return d.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const redemptionColumns: AdminColumn<PerUserRedemption>[] = [
    {
      key: 'customer',
      header: '顧客',
      width: '2fr',
      render: (r) => <span className="text-sm font-semibold" style={{ color: C.text }}>{r.customer_name}</span>,
    },
    {
      key: 'store',
      header: '消込店舗',
      width: '2fr',
      render: (r) => <span className="text-sm" style={{ color: C.textMuted }}>{r.store_name}</span>,
    },
    {
      key: 'redeemed_at',
      header: '消込日時',
      width: '2fr',
      render: (r) => <span className="text-sm" style={{ color: C.textMuted }}>{fmtDateTime(r.redeemed_at)}</span>,
    },
  ];

  const submissionColumns: AdminColumn<StampSubmission>[] = [
    {
      key: 'customer',
      header: '会員',
      width: '2fr',
      render: (r) => <span className="text-sm font-semibold" style={{ color: C.text }}>{r.customer_name}</span>,
    },
    {
      key: 'submitted_at',
      header: '送信日時',
      width: '2fr',
      render: (r) => <span className="text-sm" style={{ color: C.textMuted }}>{fmtDateTime(r.submitted_at)}</span>,
    },
    {
      key: 'note',
      header: 'メッセージ',
      width: '2fr',
      render: (r) => <span className="text-sm" style={{ color: C.textSubtle }}>{r.submit_note || '—'}</span>,
    },
  ];

  const storeBreakdownColumns: AdminColumn<StoreBreakdown>[] = [
    {
      key: 'store',
      header: '参加店',
      width: '2.4fr',
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
  ];

  // 主催者へ提供するための参加店レポートを CSV で書き出す
  const exportCsv = () => {
    if (!data) return;
    const rows = data.store_breakdown ?? [];
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['参加店', '紙クーポン配布', '紙クーポン使用', '紙クーポン報告', 'デジタル消込', 'スタンプ来店数', 'ユニーク客数'];
    const body = rows.map((r) =>
      [r.store_name, r.paper_distributed, r.paper_redeemed, r.paper_reported ? '報告済' : '未報告', r.digital_redemptions, r.check_ins, r.unique_customers]
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

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <button
            type="button"
            onClick={() => router.push('/store/manage/events')}
            className="inline-flex items-center gap-1.5 text-sm font-medium mb-3"
            style={{ color: C.textMuted }}
          >
            <ArrowLeft className="w-4 h-4" /> イベント管理へ戻る
          </button>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: C.accent }} />
            <span className="font-en text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: C.textSubtle }}>
              EVENT ROI
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>
            {data?.event.title ?? 'イベント'}
          </h1>
          <p className="text-sm mt-1" style={{ color: C.textSubtle }}>
            費用対効果 ／ {fmtDate(data?.event.start_at ?? null)} - {fmtDate(data?.event.end_at ?? null)}
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

            {/* 参加店ごとの総合内訳（主催者へ提供するレポート） */}
            <section>
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-wide" style={{ color: C.text }}>参加店ごとの内訳</h2>
                  <span className="text-xs" style={{ color: C.textSubtle }}>全 {m.participating_stores} 店</span>
                </div>
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={!data?.store_breakdown?.length}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-50"
                  style={{ background: C.accent, color: '#13294b' }}
                >
                  <Download className="w-3.5 h-3.5" />
                  CSVで書き出す（主催者提供用）
                </button>
              </div>
              <AdminDataTable
                columns={storeBreakdownColumns}
                data={data?.store_breakdown ?? []}
                keyExtractor={(r) => r.store_id}
                emptyIcon={<StoreIcon className="w-12 h-12" style={{ color: C.textSubtle }} />}
                emptyTitle="参加店がまだありません"
                emptyDescription="加盟店がイベントに参加すると、紙クーポン・消込・スタンプ来店がここに集計されます"
                mobileCardRender={(r) => (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: C.text }}>{r.store_name}</p>
                      <span className="text-xs" style={{ color: C.textSubtle }}>来店 {r.check_ins}（{r.unique_customers}名）</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: C.textMuted }}>
                      <span>紙 {r.paper_redeemed}/{r.paper_distributed}{!r.paper_reported && '（未報告）'}</span>
                      <span>デジタル消込 {r.digital_redemptions}</span>
                    </div>
                  </div>
                )}
              />
            </section>

            {/* 紙クーポン報告（店舗別内訳） */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold tracking-wide" style={{ color: C.text }}>紙クーポン報告（店舗別）</h2>
                <span className="text-xs" style={{ color: C.textSubtle }}>
                  {m.paper_reported_stores} / {m.participating_stores} 店が報告済
                </span>
              </div>
              <AdminDataTable
                columns={paperColumns}
                data={data?.paper_reports ?? []}
                keyExtractor={(r) => r.store_id}
                emptyIcon={<Ticket className="w-12 h-12" style={{ color: C.textSubtle }} />}
                emptyTitle="紙クーポンの報告がまだありません"
                emptyDescription="加盟店が特典管理から使用枚数を報告すると、ここに集計されます"
                mobileCardRender={(r) => (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: C.text }}>{r.store_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.textSubtle }}>
                        配布 {r.distributed_count} / 使用 {r.redeemed_count}
                      </p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: r.reported_at ? C.success : C.textSubtle }}>
                      {r.reported_at ? '報告済' : '未報告'}
                    </span>
                  </div>
                )}
              />
            </section>

            {/* 会員証スキャンによる消込（顧客×消込） */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold tracking-wide" style={{ color: C.text }}>会員証スキャン消込（顧客別）</h2>
                <span className="text-xs" style={{ color: C.textSubtle }}>
                  {m.per_user_unique_customers ?? 0} 名 / {m.per_user_redemptions ?? 0} 件
                </span>
              </div>
              <AdminDataTable
                columns={redemptionColumns}
                data={data?.per_user_redemptions ?? []}
                keyExtractor={(r) => r.id}
                emptyIcon={<Ticket className="w-12 h-12" style={{ color: C.textSubtle }} />}
                emptyTitle="会員証スキャンによる消込はまだありません"
                emptyDescription="加盟店が会員証QRをスキャンして消し込むと、顧客名とともにここに記録されます"
                mobileCardRender={(r) => (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: C.text }}>{r.customer_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.textSubtle }}>{r.store_name}</p>
                    </div>
                    <span className="text-xs" style={{ color: C.textSubtle }}>{fmtDateTime(r.redeemed_at)}</span>
                  </div>
                )}
              />
            </section>

            {/* スタンプ満了「送信」一覧（会員が全スタンプ達成→運営に送信） */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold tracking-wide" style={{ color: C.text }}>スタンプ達成・送信（会員別）</h2>
                <span className="text-xs" style={{ color: C.textSubtle }}>
                  {m.stamp_submissions ?? 0} 件
                </span>
              </div>
              <AdminDataTable
                columns={submissionColumns}
                data={data?.stamp_submissions ?? []}
                keyExtractor={(r) => r.user_id}
                emptyIcon={<Ticket className="w-12 h-12" style={{ color: C.textSubtle }} />}
                emptyTitle="スタンプ達成の送信はまだありません"
                emptyDescription="会員が全スタンプを集めて「送信」すると、会員名とともにここに記録されます"
                mobileCardRender={(r) => (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: C.text }}>{r.customer_name}</p>
                      <span className="text-xs" style={{ color: C.textSubtle }}>{fmtDateTime(r.submitted_at)}</span>
                    </div>
                    {r.submit_note && (
                      <p className="text-xs mt-1" style={{ color: C.textSubtle }}>{r.submit_note}</p>
                    )}
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
