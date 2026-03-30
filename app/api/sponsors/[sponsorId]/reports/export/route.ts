import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sponsorId: string }> }
) {
  try {
    const { sponsorId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    const endDate =
      searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const startDate =
      searchParams.get('start_date') ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    const supabase = createServerSupabaseClient();

    // Get sponsor info
    const { data: sponsor } = await supabase
      .from('sponsors')
      .select('company_name')
      .eq('id', sponsorId)
      .single();

    // Get reports
    const { data: reports, error } = await supabase
      .from('sponsor_reports')
      .select('*')
      .eq('sponsor_id', sponsorId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    const rows = reports || [];
    const companyName = sponsor?.company_name || 'Unknown';

    if (format === 'csv') {
      return generateCSV(rows, companyName, startDate, endDate);
    }

    // PDF format — return JSON data for client-side PDF generation
    // (jspdf is a client-side library, so we return structured data)
    return NextResponse.json({
      company_name: companyName,
      start_date: startDate,
      end_date: endDate,
      rows: rows.map((r) => ({
        date: r.report_date,
        impressions: r.impressions_count || 0,
        clicks: r.clicks_count || 0,
        cta_clicks: r.cta_clicks_count || 0,
        ctr: r.impressions_count
          ? ((r.clicks_count || 0) / r.impressions_count).toFixed(4)
          : '0.0000',
        unique_users: r.unique_users_count || 0,
      })),
    });
  } catch (err) {
    console.error('[sponsors/reports/export] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateCSV(
  rows: Array<{
    report_date: string;
    impressions_count: number | null;
    clicks_count: number | null;
    cta_clicks_count: number | null;
    unique_users_count: number | null;
  }>,
  companyName: string,
  startDate: string,
  endDate: string
): NextResponse {
  const header = 'date,impressions,clicks,cta_clicks,ctr,unique_users';
  const csvRows = rows.map((r) => {
    const imp = r.impressions_count || 0;
    const clicks = r.clicks_count || 0;
    const ctaClicks = r.cta_clicks_count || 0;
    const unique = r.unique_users_count || 0;
    const ctr = imp > 0 ? (clicks / imp).toFixed(4) : '0.0000';
    return `${r.report_date},${imp},${clicks},${ctaClicks},${ctr},${unique}`;
  });

  const csv = [header, ...csvRows].join('\n');
  const filename = `sponsor_report_${companyName}_${startDate}_${endDate}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
