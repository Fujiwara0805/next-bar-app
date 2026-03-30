'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAdminTheme } from '@/lib/admin-theme-context';
import {
  BarChart3,
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
import type { ReportResponse } from '@/lib/sponsors/types';

interface Props {
  sponsorId: string;
}

type Period = '7d' | '30d' | 'all';

function getDateRange(period: Period): { start: string; end: string } {
  const end = new Date().toISOString().split('T')[0];
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 365;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  return { start, end };
}

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
      }
    } catch {
      toast.error('レポートデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [sponsorId, period]);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
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
        // PDF: fetch data and generate client-side with jspdf
        const res = await fetch(url);
        const pdfData = await res.json();
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text('NIKENME+ Sponsor Report', 20, 20);
        doc.setFontSize(11);
        doc.text(`Company: ${pdfData.company_name}`, 20, 32);
        doc.text(`Period: ${pdfData.start_date} - ${pdfData.end_date}`, 20, 40);

        // Summary
        if (data?.summary) {
          doc.setFontSize(13);
          doc.text('Summary', 20, 55);
          doc.setFontSize(10);
          doc.text(`Impressions: ${data.summary.total_impressions.toLocaleString()}`, 20, 65);
          doc.text(`Clicks: ${data.summary.total_clicks.toLocaleString()}`, 20, 72);
          doc.text(`CTR: ${(data.summary.avg_ctr * 100).toFixed(2)}%`, 20, 79);
          doc.text(`Unique Users: ${data.summary.unique_users.toLocaleString()}`, 20, 86);
        }

        // Daily table
        doc.setFontSize(13);
        doc.text('Daily Data', 20, 100);
        doc.setFontSize(8);
        let y = 110;
        doc.text('Date       Impressions  Clicks  CTR     Users', 20, y);
        y += 6;
        for (const row of pdfData.rows.slice(0, 30)) {
          doc.text(
            `${row.date}  ${String(row.impressions).padStart(8)}  ${String(row.clicks).padStart(6)}  ${(Number(row.ctr) * 100).toFixed(2).padStart(6)}%  ${String(row.unique_users).padStart(5)}`,
            20,
            y
          );
          y += 5;
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        }

        doc.setFontSize(7);
        doc.text(
          `Generated: ${new Date().toISOString()} | Confidential`,
          20,
          285
        );

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

  const kpis = [
    {
      label: 'インプレッション',
      value: summary ? summary.total_impressions.toLocaleString('ja-JP') : '-',
      icon: Eye,
      color: C.info,
    },
    {
      label: 'クリック',
      value: summary ? summary.total_clicks.toLocaleString('ja-JP') : '-',
      icon: MousePointer,
      color: C.accent,
    },
    {
      label: 'CTR',
      value: summary ? `${(summary.avg_ctr * 100).toFixed(2)}%` : '-',
      icon: TrendingUp,
      color: C.success,
    },
    {
      label: 'ユニークユーザー',
      value: summary ? summary.unique_users.toLocaleString('ja-JP') : '-',
      icon: Users,
      color: C.warning,
    },
  ];

  const deviceData = [
    { name: 'Mobile', value: device.mobile, icon: Smartphone },
    { name: 'Desktop', value: device.desktop, icon: Monitor },
    { name: 'Tablet', value: device.tablet, icon: Tablet },
  ];
  const pieColors = [C.info, C.accent, C.warning];

  const periods: { key: Period; label: string }[] = [
    { key: '7d', label: '7日' },
    { key: '30d', label: '30日' },
    { key: 'all', label: '全期間' },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector + Export */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{
                background: period === p.key ? C.accent : C.bgInput,
                color: period === p.key ? '#fff' : C.textMuted,
                border: `1px solid ${period === p.key ? C.accent : C.border}`,
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={fetchData}
            className="px-2 py-1.5 rounded-lg"
            style={{ background: C.bgInput, border: `1px solid ${C.border}` }}
            title="更新"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              style={{ color: C.textMuted }}
            />
          </button>
          <button
            onClick={handleAggregate}
            disabled={aggregating}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg"
            style={{
              background: C.bgInput,
              color: C.textMuted,
              border: `1px solid ${C.border}`,
              opacity: aggregating ? 0.5 : 1,
            }}
            title="前日分のレポートを集計"
          >
            <Database className={`w-3 h-3 ${aggregating ? 'animate-pulse' : ''}`} />
            集計
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting || !data}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg"
            style={{
              background: C.bgInput,
              color: C.text,
              border: `1px solid ${C.border}`,
              opacity: exporting || !data ? 0.5 : 1,
            }}
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting || !data}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg"
            style={{
              background: C.bgInput,
              color: C.text,
              border: `1px solid ${C.border}`,
              opacity: exporting || !data ? 0.5 : 1,
            }}
          >
            <Download className="w-3 h-3" />
            PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="p-4 rounded-xl"
            style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              <span className="text-xs font-medium" style={{ color: C.textMuted }}>
                {kpi.label}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: C.text }}>
              {loading ? '...' : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Daily Trend Chart */}
      <div
        className="rounded-xl p-6"
        style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4" style={{ color: C.accent }} />
          <span className="text-sm font-semibold" style={{ color: C.text }}>
            日次推移
          </span>
        </div>
        {daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: C.textMuted }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: C.textMuted }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: C.textMuted }}
              />
              <Tooltip
                contentStyle={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="impressions"
                name="インプレッション"
                stroke={C.info}
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="clicks"
                name="クリック"
                stroke={C.accent}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="h-48 rounded-lg flex items-center justify-center"
            style={{ background: C.bgInput, border: `1px dashed ${C.border}` }}
          >
            <p className="text-sm" style={{ color: C.textSubtle }}>
              {loading ? '読み込み中...' : 'データがありません'}
            </p>
          </div>
        )}
      </div>

      {/* CTR Trend */}
      {daily.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
        >
          <span className="text-sm font-semibold mb-4 block" style={{ color: C.text }}>
            CTR推移
          </span>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: C.textMuted }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: C.textMuted }}
                tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
              />
              <Tooltip
                formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'CTR']}
                contentStyle={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="ctr"
                stroke={C.success}
                fill={`${C.success}30`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Device breakdown + Slot performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device breakdown pie chart */}
        <div
          className="rounded-xl p-6"
          style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
        >
          <span className="text-sm font-semibold mb-4 block" style={{ color: C.text }}>
            デバイス別内訳
          </span>
          {deviceTotal > 0 ? (
            <div className="flex items-center justify-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {deviceData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: pieColors[i] }}
                    />
                    <d.icon className="w-4 h-4" style={{ color: C.textSubtle }} />
                    <span className="text-xs" style={{ color: C.textMuted }}>
                      {d.name}
                    </span>
                    <span className="text-xs font-bold" style={{ color: C.text }}>
                      {deviceTotal > 0
                        ? `${Math.round((d.value / deviceTotal) * 100)}%`
                        : '-'}
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
        <div
          className="rounded-xl p-6"
          style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
        >
          <span className="text-sm font-semibold mb-4 block" style={{ color: C.text }}>
            広告枠別パフォーマンス
          </span>
          {data?.slot_performance && data.slot_performance.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data.slot_performance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis type="number" tick={{ fontSize: 10, fill: C.textMuted }} />
                <YAxis
                  type="category"
                  dataKey="slot_type"
                  tick={{ fontSize: 10, fill: C.textMuted }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: C.bgCard,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
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
    </div>
  );
}
