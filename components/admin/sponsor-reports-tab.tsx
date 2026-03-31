'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAdminTheme } from '@/lib/admin-theme-context';
import {
  Eye,
  MousePointer,
  Users,
  TrendingUp,
  Smartphone,
  Monitor,
  Tablet,
  Download,
  RefreshCw,
  Database,
  BarChart3,
  Target,
  Repeat,
  DollarSign,
  Zap,
  Layers,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AdminKpiCard, getKpiGradient } from '@/components/admin/admin-kpi-card';
import type { ReportResponse } from '@/lib/sponsors/types';

interface Props {
  sponsorId: string;
}

type Period = '1d' | '7d' | '30d' | 'all';

function getDateRange(period: Period): { start: string; end: string } {
  const end = new Date().toISOString().split('T')[0];
  const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 365;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  return { start, end };
}

const INDUSTRY_AVG = { cpm: 400, cpc: 80 };

const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HEATMAP_DAY_LABELS: Record<string, string> = {
  Mon: '月', Tue: '火', Wed: '水', Thu: '木', Fri: '金', Sat: '土', Sun: '日',
};
const HEATMAP_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

export function SponsorReportsTab({ sponsorId }: Props) {
  const { colors: C } = useAdminTheme();
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [aggregating, setAggregating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(period);
      const res = await fetch(
        `/api/sponsors/${sponsorId}/reports?start_date=${start}&end_date=${end}`
      );
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error(`レポート取得エラー: ${res.status}`);
      }
    } catch {
      toast.error('レポートデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [sponsorId, period]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const { start, end } = getDateRange(period);
      const url = `/api/sponsors/${sponsorId}/reports/export?format=${format}&start_date=${start}&end_date=${end}`;
      if (format === 'csv') {
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `report_${start}_${end}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        const res = await fetch(url);
        const pdfData = await res.json();
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('NIKENME+ Sponsor Report', 20, 20);
        doc.setFontSize(11);
        doc.text(`Company: ${pdfData.company_name}`, 20, 32);
        doc.text(`Period: ${pdfData.start_date} - ${pdfData.end_date}`, 20, 40);
        if (data?.summary) {
          doc.setFontSize(13);
          doc.text('Summary', 20, 55);
          doc.setFontSize(10);
          doc.text(`Impressions: ${data.summary.total_impressions.toLocaleString()}`, 20, 65);
          doc.text(`Clicks: ${data.summary.total_clicks.toLocaleString()}`, 20, 72);
          doc.text(`CTR: ${(data.summary.avg_ctr * 100).toFixed(2)}%`, 20, 79);
          doc.text(`Unique Users: ${data.summary.unique_users.toLocaleString()}`, 20, 86);
        }
        doc.setFontSize(13);
        doc.text('Daily Data', 20, 100);
        doc.setFontSize(8);
        let y = 110;
        doc.text('Date       Impressions  Clicks  CTR     Users', 20, y);
        y += 6;
        for (const row of pdfData.rows.slice(0, 30)) {
          doc.text(
            `${row.date}  ${String(row.impressions).padStart(8)}  ${String(row.clicks).padStart(6)}  ${(Number(row.ctr) * 100).toFixed(2).padStart(6)}%  ${String(row.unique_users).padStart(5)}`,
            20, y
          );
          y += 5;
          if (y > 270) { doc.addPage(); y = 20; }
        }
        doc.setFontSize(7);
        doc.text(`Generated: ${new Date().toISOString()} | Confidential`, 20, 285);
        doc.save(`report_${pdfData.start_date}_${pdfData.end_date}.pdf`);
      }
    } catch {
      toast.error('エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };

  const handleAggregate = async () => {
    setAggregating(true);
    try {
      const res = await fetch('/api/sponsors/cron/aggregate', { method: 'POST' });
      if (res.ok) {
        toast.success('レポート集計が完了しました');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || '集計に失敗しました');
      }
    } catch {
      toast.error('集計に失敗しました');
    } finally {
      setAggregating(false);
    }
  };

  const summary = data?.summary;
  const daily = data?.daily || [];
  const device = data?.device_breakdown || { mobile: 0, tablet: 0, desktop: 0 };
  const deviceTotal = device.mobile + device.tablet + device.desktop;

  const heatmapMax = useMemo(() => {
    if (!data?.hourly_heatmap) return 1;
    let max = 1;
    for (const day of Object.values(data.hourly_heatmap)) {
      for (const count of Object.values(day)) {
        if (count > max) max = count;
      }
    }
    return max;
  }, [data?.hourly_heatmap]);

  const periods: { key: Period; label: string }[] = [
    { key: '1d', label: '1日' },
    { key: '7d', label: '7日' },
    { key: '30d', label: '30日' },
    { key: 'all', label: '全期間' },
  ];

  const deviceData = [
    { name: 'Mobile', value: device.mobile, icon: Smartphone },
    { name: 'Desktop', value: device.desktop, icon: Monitor },
    { name: 'Tablet', value: device.tablet, icon: Tablet },
  ];
  const pieColors = [C.info, C.accent, C.warning];

  return (
    <div className="space-y-6">
      {/* Period selector + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {periods.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ background: period === p.key ? C.accent : C.bgInput, color: period === p.key ? '#fff' : C.textMuted, border: `1px solid ${period === p.key ? C.accent : C.border}` }}>
              {p.label}
            </button>
          ))}
          <button onClick={fetchData} className="px-2 py-1.5 rounded-lg" style={{ background: C.bgInput, border: `1px solid ${C.border}` }} title="更新">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: C.textMuted }} />
          </button>
          <button onClick={handleAggregate} disabled={aggregating}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg"
            style={{ background: C.bgInput, color: C.textMuted, border: `1px solid ${C.border}`, opacity: aggregating ? 0.5 : 1 }} title="前日分のレポートを集計">
            <Database className={`w-3 h-3 ${aggregating ? 'animate-pulse' : ''}`} /> 集計
          </button>
        </div>
        <div className="flex gap-1">
          <button onClick={() => handleExport('csv')} disabled={exporting || !data}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg"
            style={{ background: C.bgInput, color: C.text, border: `1px solid ${C.border}`, opacity: exporting || !data ? 0.5 : 1 }}>
            <Download className="w-3 h-3" /> CSV
          </button>
          <button onClick={() => handleExport('pdf')} disabled={exporting || !data}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg"
            style={{ background: C.bgInput, color: C.text, border: `1px solid ${C.border}`, opacity: exporting || !data ? 0.5 : 1 }}>
            <Download className="w-3 h-3" /> PDF
          </button>
        </div>
      </div>

      {/* KPI Cards - 8 cards with gradient backgrounds */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AdminKpiCard icon={Eye} label="インプレッション" value={summary ? summary.total_impressions.toLocaleString('ja-JP') : '-'} gradient={getKpiGradient('blue')} index={0} />
        <AdminKpiCard icon={MousePointer} label="クリック" value={summary ? summary.total_clicks.toLocaleString('ja-JP') : '-'} gradient={getKpiGradient('gold')} index={1} />
        <AdminKpiCard icon={TrendingUp} label="CTR" value={summary ? `${(summary.avg_ctr * 100).toFixed(2)}%` : '-'} gradient={getKpiGradient('green')} index={2} />
        <AdminKpiCard icon={Users} label="ユニークユーザー" value={summary ? summary.unique_users.toLocaleString('ja-JP') : '-'} gradient={getKpiGradient('amber')} index={3} />
        <AdminKpiCard icon={Target} label="CTAクリック" value={summary ? summary.total_cta_clicks.toLocaleString('ja-JP') : '-'} gradient={getKpiGradient('teal')} index={4} />
        <AdminKpiCard icon={Zap} label="コンバージョン" value={summary ? summary.total_conversions.toLocaleString('ja-JP') : '-'} gradient={getKpiGradient('purple')} index={5} />
        <AdminKpiCard icon={Repeat} label="フリークエンシー" value={summary ? `${summary.frequency}回` : '-'} subLabel="1人あたり表示回数" gradient={getKpiGradient('rose')} index={6} />
        <AdminKpiCard icon={DollarSign} label="推定CPM" value={summary?.estimated_cpm ? `¥${summary.estimated_cpm.toLocaleString('ja-JP')}` : '-'} subLabel="1000表示あたり" gradient={getKpiGradient('slate')} index={7} />
      </div>

      {/* Cost Efficiency Dashboard */}
      {data?.contract_total_price && summary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6"
          style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4" style={{ color: C.accent }} />
            <span className="text-sm font-bold" style={{ color: C.text }}>投資効率ダッシュボード</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CostMetricCard
              label="契約金額"
              value={`¥${data.contract_total_price.toLocaleString('ja-JP')}`}
              C={C}
            />
            <CostMetricCard
              label="CPM"
              value={summary.estimated_cpm ? `¥${summary.estimated_cpm.toLocaleString('ja-JP')}` : '—'}
              comparison={summary.estimated_cpm ? { industry: INDUSTRY_AVG.cpm, actual: summary.estimated_cpm } : undefined}
              C={C}
            />
            <CostMetricCard
              label="CPC"
              value={summary.estimated_cpc ? `¥${summary.estimated_cpc.toLocaleString('ja-JP')}` : '—'}
              comparison={summary.estimated_cpc ? { industry: INDUSTRY_AVG.cpc, actual: summary.estimated_cpc } : undefined}
              C={C}
            />
            <CostMetricCard
              label="リーチ単価"
              value={summary.unique_users > 0
                ? `¥${Math.round(data.contract_total_price / summary.unique_users).toLocaleString('ja-JP')}`
                : '—'}
              subLabel="1ユーザーあたり"
              C={C}
            />
          </div>
        </motion.div>
      )}

      {/* Daily Trend Chart */}
      <div className="rounded-2xl p-6" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4" style={{ color: C.accent }} />
          <span className="text-sm font-bold" style={{ color: C.text }}>日次推移</span>
        </div>
        {daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: C.textMuted }}
                tickFormatter={(v: string) => {
                  const [, m, d] = v.split('-');
                  return `${Number(m)}/${Number(d)}`;
                }}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: C.textMuted }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textMuted }} />
              <Tooltip
                contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                labelFormatter={(label: string) => {
                  const [y, m, d] = label.split('-');
                  return `${y}年${Number(m)}月${Number(d)}日`;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="impressions" name="インプレッション" stroke={C.info} strokeWidth={2} dot={daily.length <= 7} />
              <Line yAxisId="right" type="monotone" dataKey="clicks" name="クリック" stroke={C.accent} strokeWidth={2} dot={daily.length <= 7} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 rounded-lg flex items-center justify-center" style={{ background: C.bgInput, border: `1px dashed ${C.border}` }}>
            <p className="text-sm" style={{ color: C.textSubtle }}>{loading ? '読み込み中...' : 'データがありません'}</p>
          </div>
        )}
      </div>

      {/* CTR Trend */}
      {daily.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
          <span className="text-sm font-bold mb-4 block" style={{ color: C.text }}>CTR推移</span>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: C.textMuted }}
                tickFormatter={(v: string) => {
                  const [, m, d] = v.split('-');
                  return `${Number(m)}/${Number(d)}`;
                }}
              />
              <YAxis tick={{ fontSize: 10, fill: C.textMuted }} tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
              <Tooltip
                formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'CTR']}
                labelFormatter={(label: string) => {
                  const [y, m, d] = label.split('-');
                  return `${y}年${Number(m)}月${Number(d)}日`;
                }}
                contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="ctr" stroke={C.success} fill={`${C.success}30`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Hourly Heatmap */}
      {data?.hourly_heatmap && Object.keys(data.hourly_heatmap).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6"
          style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
        >
          <span className="text-sm font-bold mb-4 block" style={{ color: C.text }}>時間帯別アクティビティ</span>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* 時間軸ラベル（全24時間表示） */}
              <div className="flex gap-0.5 mb-1 ml-8">
                {HEATMAP_HOURS.map((h) => (
                  <span key={h} className="text-[8px] w-[22px] text-center" style={{ color: C.textSubtle }}>
                    {Number(h) % 2 === 0 ? `${Number(h)}時` : ''}
                  </span>
                ))}
              </div>
              {HEATMAP_DAYS.map((day) => (
                <div key={day} className="flex items-center gap-0.5 mb-0.5">
                  <span className="text-[10px] w-7 text-right font-medium" style={{ color: C.textMuted }}>
                    {HEATMAP_DAY_LABELS[day] || day}
                  </span>
                  {HEATMAP_HOURS.map((hour) => {
                    const count = data.hourly_heatmap[day]?.[hour] || 0;
                    const intensity = count / heatmapMax;
                    return (
                      <div
                        key={hour}
                        className="w-[22px] h-[18px] rounded-sm"
                        style={{
                          background: count > 0
                            ? `rgba(201, 168, 108, ${0.15 + intensity * 0.85})`
                            : C.bgInput,
                        }}
                        title={`${HEATMAP_DAY_LABELS[day] || day}曜日 ${Number(hour)}:00〜${Number(hour)}:59 — ${count}件`}
                      />
                    );
                  })}
                </div>
              ))}
              {/* 補足ラベル */}
              <div className="flex justify-between mt-2 ml-8 pr-1">
                <span className="text-[9px]" style={{ color: C.textSubtle }}>0:00（深夜）</span>
                <span className="text-[9px]" style={{ color: C.textSubtle }}>12:00（正午）</span>
                <span className="text-[9px]" style={{ color: C.textSubtle }}>23:00</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Device + Slot + Creative Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device breakdown */}
        <div className="rounded-2xl p-6" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
          <span className="text-sm font-bold mb-4 block" style={{ color: C.text }}>デバイス別内訳</span>
          {deviceTotal > 0 ? (
            <div className="flex items-center justify-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={deviceData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" strokeWidth={0}>
                    {deviceData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {deviceData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: pieColors[i] }} />
                    <d.icon className="w-4 h-4" style={{ color: C.textSubtle }} />
                    <span className="text-xs" style={{ color: C.textMuted }}>{d.name}</span>
                    <span className="text-xs font-bold" style={{ color: C.text }}>
                      {deviceTotal > 0 ? `${Math.round((d.value / deviceTotal) * 100)}%` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {deviceData.map((d) => (
                <div key={d.name} className="text-center">
                  <d.icon className="w-6 h-6 mx-auto mb-1" style={{ color: C.textSubtle }} />
                  <p className="text-lg font-bold" style={{ color: C.text }}>-</p>
                  <p className="text-xs" style={{ color: C.textMuted }}>{d.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slot performance */}
        <div className="rounded-2xl p-6" style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
          <span className="text-sm font-bold mb-4 block" style={{ color: C.text }}>広告枠別パフォーマンス</span>
          {data?.slot_performance && data.slot_performance.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data.slot_performance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis type="number" tick={{ fontSize: 10, fill: C.textMuted }} />
                <YAxis type="category" dataKey="slot_type" tick={{ fontSize: 10, fill: C.textMuted }} width={100} />
                <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="impressions" name="Imp" fill={C.info} radius={[0, 4, 4, 0]} />
                <Bar dataKey="clicks" name="Click" fill={C.accent} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: C.textSubtle }}>
              {loading ? '読み込み中...' : 'データがありません'}
            </p>
          )}
        </div>
      </div>

      {/* Creative Performance */}
      {data?.creative_performance && data.creative_performance.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6"
          style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4" style={{ color: C.accent }} />
            <span className="text-sm font-bold" style={{ color: C.text }}>クリエイティブ別パフォーマンス</span>
          </div>
          <div className="space-y-2">
            {data.creative_performance.map((cp) => (
              <div
                key={cp.creative_id}
                className="flex items-center gap-4 p-3 rounded-xl text-sm"
                style={{ background: C.bgElevated }}
              >
                <span className="text-xs font-mono truncate w-24" style={{ color: C.textSubtle }}>
                  {cp.creative_id.slice(0, 8)}...
                </span>
                <div className="flex-1 flex items-center gap-6">
                  <div>
                    <span className="text-xs" style={{ color: C.textMuted }}>Imp</span>
                    <p className="font-bold" style={{ color: C.text }}>{cp.impressions.toLocaleString('ja-JP')}</p>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: C.textMuted }}>Click</span>
                    <p className="font-bold" style={{ color: C.text }}>{cp.clicks.toLocaleString('ja-JP')}</p>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: C.textMuted }}>CTR</span>
                    <p className="font-bold" style={{ color: C.success }}>{(cp.ctr * 100).toFixed(2)}%</p>
                  </div>
                </div>
                <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: C.bgInput }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(cp.ctr * 100 * 10, 100)}%`,
                      background: C.accent,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CostMetricCard({
  label,
  value,
  subLabel,
  comparison,
  C,
}: {
  label: string;
  value: string;
  subLabel?: string;
  comparison?: { industry: number; actual: number };
  C: any;
}) {
  const isGood = comparison ? comparison.actual <= comparison.industry : undefined;
  return (
    <div className="p-4 rounded-xl" style={{ background: C.bgElevated }}>
      <p className="text-xs font-medium mb-1" style={{ color: C.textMuted }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: C.text }}>{value}</p>
      {subLabel && <p className="text-[10px] mt-0.5" style={{ color: C.textSubtle }}>{subLabel}</p>}
      {comparison && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              background: isGood ? C.successBg : C.dangerBg,
              color: isGood ? C.success : C.danger,
            }}
          >
            {isGood ? '業界平均以下' : '業界平均以上'}
          </span>
          <span className="text-[10px]" style={{ color: C.textSubtle }}>
            (平均 ¥{comparison.industry.toLocaleString('ja-JP')})
          </span>
        </div>
      )}
    </div>
  );
}
