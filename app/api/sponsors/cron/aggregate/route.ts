import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/sponsors/cron/aggregate
 *
 * 日次レポート集計を実行する。
 * Supabase上のaggregate_sponsor_daily_reports()関数を呼び出す。
 *
 * 呼び出し方法:
 *   1. 管理画面の「集計実行」ボタンから手動実行
 *   2. 外部サービス（GitHub Actions等）からのHTTPトリガー
 *
 * セキュリティ:
 *   - CRON_SECRET ヘッダーによる認証（外部トリガー用）
 *   - または管理者セッション認証
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // 契約ステータスも同時に更新
    await supabase.rpc('update_sponsor_contract_statuses');

    // 日次レポート集計
    const { error } = await supabase.rpc('aggregate_sponsor_daily_reports');

    if (error) {
      console.error('[sponsors/cron/aggregate] RPC error:', error);
      return NextResponse.json(
        { error: 'Failed to aggregate reports', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Daily report aggregation completed',
      executed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[sponsors/cron/aggregate] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
