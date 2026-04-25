import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ReportResponse, SlotType, CreativePerformance } from '@/lib/sponsors/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sponsorId: string }> }
) {
  try {
    const { sponsorId } = await params;
    const { searchParams } = new URL(request.url);

    const endDate =
      searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const startDate =
      searchParams.get('start_date') ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const supabase = createServerSupabaseClient();

    // 1. Query pre-aggregated sponsor_reports
    const { data: reportData, error: reportError } = await supabase
      .from('sponsor_reports')
      .select('*')
      .eq('sponsor_id', sponsorId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: true });

    if (reportError) {
      console.error('[sponsors/reports] sponsor_reports query error:', reportError);
    }

    const reports = reportData || [];
    const coveredDates = new Set(reports.map((r) => r.report_date));

    console.log(`[sponsors/reports] sponsorId=${sponsorId}, range=${startDate}~${endDate}, sponsor_reports rows=${reports.length}, coveredDates=${Array.from(coveredDates).join(',')}`);

    // 2. Query sponsor_impressions for dates NOT covered by sponsor_reports
    const startTimestamp = `${startDate}T00:00:00+09:00`;
    const endTimestamp = `${endDate}T23:59:59+09:00`;

    const { data: impressions, error: impError } = await supabase
      .from('sponsor_impressions')
      .select('event_type, session_id, device_type, ad_slot_id, creative_id, created_at')
      .eq('sponsor_id', sponsorId)
      .gte('created_at', startTimestamp)
      .lte('created_at', endTimestamp)
      .order('created_at', { ascending: true });

    if (impError) {
      console.error('[sponsors/reports] sponsor_impressions query error:', impError);
    }

    const allEvents = impressions || [];

    // Filter raw events to only uncovered dates
    const rawEvents = allEvents.filter((event) => {
      const date = new Date(event.created_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
      return !coveredDates.has(date);
    });

    // 全期間の真のユニークユーザー数（日別合算ではなく重複排除）
    const allSessionIds = new Set(allEvents.map((e) => e.session_id).filter(Boolean));
    const trueUniqueUsers = allSessionIds.size;

    console.log(`[sponsors/reports] raw impressions=${allEvents.length}, uncovered rawEvents=${rawEvents.length}, trueUniqueUsers=${trueUniqueUsers}`);

    // 3. Get contract total price for CPM/CPC calculation
    const { data: contracts } = await supabase
      .from('sponsor_contracts')
      .select('price')
      .eq('sponsor_id', sponsorId)
      .in('status', ['active', 'expired']);

    const contractTotalPrice = (contracts || []).reduce((sum, c) => sum + (c.price || 0), 0) || null;

    // 4. クリエイティブIDからスロットタイプのマッピングを取得
    // （slot削除済みでも creative.ad_slot_id 経由で2段階取得 → 必ず slot_type を返す）
    const creativeIds = Array.from(new Set(allEvents.map((e) => e.creative_id).filter(Boolean)));
    const creativeSlotMap: Record<string, string> = {};
    if (creativeIds.length > 0) {
      const { data: creativeRows } = await supabase
        .from('sponsor_ad_creatives')
        .select('id, ad_slot_id')
        .in('id', creativeIds);
      const slotIds = Array.from(new Set((creativeRows || []).map((r) => r.ad_slot_id).filter(Boolean)));
      const slotTypeById: Record<string, string> = {};
      if (slotIds.length > 0) {
        const { data: slotRows } = await supabase
          .from('sponsor_ad_slots')
          .select('id, slot_type')
          .in('id', slotIds);
        for (const s of slotRows || []) {
          if (s.slot_type) slotTypeById[s.id] = s.slot_type;
        }
      }
      for (const row of creativeRows || []) {
        const st = slotTypeById[row.ad_slot_id];
        if (st) creativeSlotMap[row.id] = st;
      }
    }

    // 5. Merge both sources
    const response = buildMergedResponse(reports, rawEvents, allEvents, contractTotalPrice, trueUniqueUsers, creativeSlotMap);
    console.log(`[sponsors/reports] response summary:`, JSON.stringify(response.summary));
    return NextResponse.json(response);
  } catch (err) {
    console.error('[sponsors/reports] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
}

function buildMergedResponse(
  reports: any[],
  rawEvents: any[],
  allEvents: any[],
  contractTotalPrice: number | null,
  trueUniqueUsers: number,
  creativeSlotMap: Record<string, string>
): ReportResponse {
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalCtaClicks = 0;
  let totalConversions = 0;

  const daily: ReportResponse['daily'] = [];
  const deviceTotals = { mobile: 0, tablet: 0, desktop: 0 };
  const hourlyMerged: Record<string, Record<string, number>> = {};
  const slotTotals: Record<string, { impressions: number; clicks: number }> = {};

  // --- Process pre-aggregated sponsor_reports ---
  for (const row of reports) {
    const imp = row.impressions_count || 0;
    const clicks = row.clicks_count || 0;
    const ctaClicks = row.cta_clicks_count || 0;

    totalImpressions += imp;
    totalClicks += clicks;
    totalCtaClicks += ctaClicks;

    daily.push({
      date: row.report_date,
      impressions: imp,
      clicks,
      ctr: imp > 0 ? clicks / imp : 0,
      unique_users: row.unique_users_count || 0,
    });

    const deviceData = parseJsonField<Record<string, number>>(row.device_breakdown, {});
    for (const [device, count] of Object.entries(deviceData)) {
      if (device in deviceTotals) {
        deviceTotals[device as keyof typeof deviceTotals] += count;
      }
    }

    const hourlyData = parseJsonField<Record<string, number>>(row.hourly_breakdown, {});
    const dayOfWeek = new Date(row.report_date).toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'Asia/Tokyo',
    });
    if (!hourlyMerged[dayOfWeek]) hourlyMerged[dayOfWeek] = {};
    for (const [hour, count] of Object.entries(hourlyData)) {
      hourlyMerged[dayOfWeek][hour] = (hourlyMerged[dayOfWeek][hour] || 0) + count;
    }

    const slotData = parseJsonField<Record<string, { impressions?: number; clicks?: number }>>(
      row.slot_breakdown, {}
    );
    for (const [slotType, values] of Object.entries(slotData)) {
      if (!slotTotals[slotType]) slotTotals[slotType] = { impressions: 0, clicks: 0 };
      slotTotals[slotType].impressions += values.impressions || 0;
      slotTotals[slotType].clicks += values.clicks || 0;
    }
  }

  // --- Process raw sponsor_impressions for uncovered dates ---
  const byDate: Record<string, {
    impressions: number; clicks: number; ctaClicks: number; conversions: number;
    sessions: Set<string>; devices: Record<string, number>;
    slots: Record<string, { impressions: number; clicks: number }>;
    hours: Record<string, number>;
  }> = {};

  for (const event of rawEvents) {
    const date = new Date(event.created_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
    if (!byDate[date]) {
      byDate[date] = {
        impressions: 0, clicks: 0, ctaClicks: 0, conversions: 0,
        sessions: new Set(), devices: {}, slots: {}, hours: {},
      };
    }
    const day = byDate[date];
    if (event.session_id) day.sessions.add(event.session_id);

    const slotKey = event.ad_slot_id || 'unknown';

    if (event.event_type === 'impression') {
      day.impressions++;
      // デバイス集計はimpressionのみカウント
      const device = event.device_type || 'desktop';
      day.devices[device] = (day.devices[device] || 0) + 1;
      if (!day.slots[slotKey]) day.slots[slotKey] = { impressions: 0, clicks: 0 };
      day.slots[slotKey].impressions++;
    } else if (event.event_type === 'click' || event.event_type === 'cta_click') {
      day.clicks++;
      if (event.event_type === 'cta_click') day.ctaClicks++;
      if (!day.slots[slotKey]) day.slots[slotKey] = { impressions: 0, clicks: 0 };
      day.slots[slotKey].clicks++;
    } else if (event.event_type === 'conversion') {
      day.conversions++;
    }

    const hour = new Date(event.created_at).toLocaleString('en-US', {
      hour: '2-digit', hour12: false, timeZone: 'Asia/Tokyo',
    });
    day.hours[hour] = (day.hours[hour] || 0) + 1;
  }

  for (const date of Object.keys(byDate).sort()) {
    const day = byDate[date];
    totalImpressions += day.impressions;
    totalClicks += day.clicks;
    totalCtaClicks += day.ctaClicks;
    totalConversions += day.conversions;

    daily.push({
      date,
      impressions: day.impressions,
      clicks: day.clicks,
      ctr: day.impressions > 0 ? day.clicks / day.impressions : 0,
      unique_users: day.sessions.size,
    });

    for (const [device, count] of Object.entries(day.devices)) {
      if (device in deviceTotals) {
        deviceTotals[device as keyof typeof deviceTotals] += count;
      }
    }

    const dayOfWeek = new Date(date).toLocaleDateString('en-US', {
      weekday: 'short', timeZone: 'Asia/Tokyo',
    });
    if (!hourlyMerged[dayOfWeek]) hourlyMerged[dayOfWeek] = {};
    for (const [hour, count] of Object.entries(day.hours)) {
      hourlyMerged[dayOfWeek][hour] = (hourlyMerged[dayOfWeek][hour] || 0) + count;
    }

    for (const [slotId, values] of Object.entries(day.slots)) {
      if (!slotTotals[slotId]) slotTotals[slotId] = { impressions: 0, clicks: 0 };
      slotTotals[slotId].impressions += values.impressions;
      slotTotals[slotId].clicks += values.clicks;
    }
  }

  daily.sort((a, b) => a.date.localeCompare(b.date));

  // クリエイティブ別パフォーマンスは全期間の生データから算出（集計済み日も含む）
  const creativeTotals: Record<string, { impressions: number; clicks: number }> = {};
  for (const event of allEvents) {
    const creativeKey = event.creative_id || 'unknown';
    if (event.event_type === 'impression') {
      if (!creativeTotals[creativeKey]) creativeTotals[creativeKey] = { impressions: 0, clicks: 0 };
      creativeTotals[creativeKey].impressions++;
    } else if (event.event_type === 'click' || event.event_type === 'cta_click') {
      if (!creativeTotals[creativeKey]) creativeTotals[creativeKey] = { impressions: 0, clicks: 0 };
      creativeTotals[creativeKey].clicks++;
    }
  }

  const creativePerformance: CreativePerformance[] = Object.entries(creativeTotals)
    .filter(([id]) => id !== 'unknown')
    .map(([creativeId, v]) => ({
      creative_id: creativeId,
      slot_type: creativeSlotMap[creativeId],
      impressions: v.impressions,
      clicks: v.clicks,
      ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
    }));

  // ユニークユーザーは全期間の真の重複排除値を使用
  const frequency = trueUniqueUsers > 0 ? totalImpressions / trueUniqueUsers : 0;
  const estimatedCpm = contractTotalPrice && totalImpressions > 0
    ? (contractTotalPrice / totalImpressions) * 1000
    : null;
  const estimatedCpc = contractTotalPrice && totalClicks > 0
    ? contractTotalPrice / totalClicks
    : null;

  return {
    summary: {
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_cta_clicks: totalCtaClicks,
      total_conversions: totalConversions,
      avg_ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      unique_users: trueUniqueUsers,
      frequency: Math.round(frequency * 100) / 100,
      estimated_cpm: estimatedCpm ? Math.round(estimatedCpm) : null,
      estimated_cpc: estimatedCpc ? Math.round(estimatedCpc) : null,
    },
    daily,
    hourly_heatmap: hourlyMerged,
    device_breakdown: deviceTotals,
    slot_performance: Object.entries(slotTotals).map(([slotType, v]) => ({
      slot_type: slotType as SlotType,
      impressions: v.impressions,
      clicks: v.clicks,
      ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
    })),
    creative_performance: creativePerformance,
    contract_total_price: contractTotalPrice,
  };
}
