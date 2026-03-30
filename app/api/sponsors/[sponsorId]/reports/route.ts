import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ReportResponse, SlotType } from '@/lib/sponsors/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sponsorId: string }> }
) {
  try {
    const { sponsorId } = await params;
    const { searchParams } = new URL(request.url);

    // Default: last 30 days
    const endDate =
      searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const startDate =
      searchParams.get('start_date') ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const supabase = createServerSupabaseClient();

    // オンデマンドで前日分までの未集計データを集計
    // （pg_cronの代替: レポート閲覧時に最新化）
    const { error: aggError } = await supabase.rpc('aggregate_sponsor_daily_reports');
    if (aggError) {
      console.warn('[sponsors/reports] On-demand aggregation failed (non-blocking):', aggError.message);
    }

    const { data, error } = await supabase
      .from('sponsor_reports')
      .select('*')
      .eq('sponsor_id', sponsorId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: true });

    if (error) {
      console.error('[sponsors/reports] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    const reports = data || [];

    // Aggregate summary
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCtaClicks = 0;
    let totalUniqueUsers = 0;

    const daily: ReportResponse['daily'] = [];
    const deviceTotals = { mobile: 0, tablet: 0, desktop: 0 };
    const hourlyMerged: Record<string, Record<string, number>> = {};
    const slotTotals: Record<
      string,
      { impressions: number; clicks: number }
    > = {};

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
        clicks: clicks,
        ctr: imp > 0 ? clicks / imp : 0,
        unique_users: unique,
      });

      // Device breakdown merge
      const deviceData = row.device_breakdown as Record<string, number> | null;
      if (deviceData) {
        deviceTotals.mobile += deviceData.mobile || 0;
        deviceTotals.tablet += deviceData.tablet || 0;
        deviceTotals.desktop += deviceData.desktop || 0;
      }

      // Hourly breakdown merge
      const hourlyData = row.hourly_breakdown as Record<string, number> | null;
      if (hourlyData) {
        const dayOfWeek = new Date(row.report_date).toLocaleDateString('en-US', {
          weekday: 'short',
          timeZone: 'Asia/Tokyo',
        });
        if (!hourlyMerged[dayOfWeek]) {
          hourlyMerged[dayOfWeek] = {};
        }
        for (const [hour, count] of Object.entries(hourlyData)) {
          hourlyMerged[dayOfWeek][hour] =
            (hourlyMerged[dayOfWeek][hour] || 0) + (count as number);
        }
      }

      // Slot breakdown merge
      const slotData = row.slot_breakdown as Record<
        string,
        { impressions?: number; clicks?: number }
      > | null;
      if (slotData) {
        for (const [slotType, values] of Object.entries(slotData)) {
          if (!slotTotals[slotType]) {
            slotTotals[slotType] = { impressions: 0, clicks: 0 };
          }
          slotTotals[slotType].impressions += values.impressions || 0;
          slotTotals[slotType].clicks += values.clicks || 0;
        }
      }
    }

    const avgCtr =
      totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    const slotPerformance = Object.entries(slotTotals).map(
      ([slotType, values]) => ({
        slot_type: slotType as SlotType,
        impressions: values.impressions,
        clicks: values.clicks,
        ctr:
          values.impressions > 0
            ? values.clicks / values.impressions
            : 0,
      })
    );

    const response: ReportResponse = {
      summary: {
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_cta_clicks: totalCtaClicks,
        avg_ctr: avgCtr,
        unique_users: totalUniqueUsers,
      },
      daily,
      hourly_heatmap: hourlyMerged,
      device_breakdown: deviceTotals,
      slot_performance: slotPerformance,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[sponsors/reports] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
