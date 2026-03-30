import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ReportResponse, SlotType, CreativePerformance } from '@/lib/sponsors/types';

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

    // Filter raw events to only uncovered dates
    const rawEvents = (impressions || []).filter((event) => {
      const date = new Date(event.created_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
      return !coveredDates.has(date);
    });

    console.log(`[sponsors/reports] raw impressions=${(impressions || []).length}, uncovered rawEvents=${rawEvents.length}`);

    // 3. Get contract total price for CPM/CPC calculation
    const { data: contracts } = await supabase
      .from('sponsor_contracts')
      .select('price')
      .eq('sponsor_id', sponsorId)
      .in('status', ['active', 'expired']);

    const contractTotalPrice = (contracts || []).reduce((sum, c) => sum + (c.price || 0), 0) || null;

    // 4. Merge both sources
    const response = buildMergedResponse(reports, rawEvents, contractTotalPrice);
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
  contractTotalPrice: number | null
): ReportResponse {
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalCtaClicks = 0;
  let totalConversions = 0;
  let totalUniqueUsers = 0;

  const daily: ReportResponse['daily'] = [];
  const deviceTotals = { mobile: 0, tablet: 0, desktop: 0 };
  const hourlyMerged: Record<string, Record<string, number>> = {};
  const slotTotals: Record<string, { impressions: number; clicks: number }> = {};
  const creativeTotals: Record<string, { impressions: number; clicks: number }> = {};

  // --- Process pre-aggregated sponsor_reports ---
  for (const row of reports) {
    const imp = row.impressions_count || 0;
    const clicks = row.clicks_count || 0;
    const ctaClicks = row.cta_clicks_count || 0;
    const unique = row.unique_users_count || 0;

    totalImpressions += imp;
    totalClicks += clicks;
    totalCtaClicks += ctaClicks;
    totalUniqueUsers += unique;

    daily.push({
      date: row.report_date,
      impressions: imp,
      clicks,
      ctr: imp > 0 ? clicks / imp : 0,
      unique_users: unique,
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

    const device = event.device_type || 'desktop';
    day.devices[device] = (day.devices[device] || 0) + 1;

    const slotKey = event.ad_slot_id || 'unknown';
    const creativeKey = event.creative_id || 'unknown';

    if (event.event_type === 'impression') {
      day.impressions++;
      if (!day.slots[slotKey]) day.slots[slotKey] = { impressions: 0, clicks: 0 };
      day.slots[slotKey].impressions++;
      if (!creativeTotals[creativeKey]) creativeTotals[creativeKey] = { impressions: 0, clicks: 0 };
      creativeTotals[creativeKey].impressions++;
    } else if (event.event_type === 'click' || event.event_type === 'cta_click') {
      day.clicks++;
      if (event.event_type === 'cta_click') day.ctaClicks++;
      if (!day.slots[slotKey]) day.slots[slotKey] = { impressions: 0, clicks: 0 };
      day.slots[slotKey].clicks++;
      if (!creativeTotals[creativeKey]) creativeTotals[creativeKey] = { impressions: 0, clicks: 0 };
      creativeTotals[creativeKey].clicks++;
    } else if (event.event_type === 'conversion') {
      day.conversions++;
    }

    const hour = new Date(event.created_at).toLocaleString('en-US', {
      hour: '2-digit', hour12: false, timeZone: 'Asia/Tokyo',
    });
    day.hours[hour] = (day.hours[hour] || 0) + 1;
  }

  const allRawSessions = new Set<string>();
  for (const date of Object.keys(byDate).sort()) {
    const day = byDate[date];
    totalImpressions += day.impressions;
    totalClicks += day.clicks;
    totalCtaClicks += day.ctaClicks;
    totalConversions += day.conversions;
    day.sessions.forEach((s) => allRawSessions.add(s));

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

  totalUniqueUsers += allRawSessions.size;

  daily.sort((a, b) => a.date.localeCompare(b.date));

  const frequency = totalUniqueUsers > 0 ? totalImpressions / totalUniqueUsers : 0;
  const estimatedCpm = contractTotalPrice && totalImpressions > 0
    ? (contractTotalPrice / totalImpressions) * 1000
    : null;
  const estimatedCpc = contractTotalPrice && totalClicks > 0
    ? contractTotalPrice / totalClicks
    : null;

  const creativePerformance: CreativePerformance[] = Object.entries(creativeTotals)
    .filter(([id]) => id !== 'unknown')
    .map(([creativeId, v]) => ({
      creative_id: creativeId,
      impressions: v.impressions,
      clicks: v.clicks,
      ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
    }));

  return {
    summary: {
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_cta_clicks: totalCtaClicks,
      total_conversions: totalConversions,
      avg_ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      unique_users: totalUniqueUsers,
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
