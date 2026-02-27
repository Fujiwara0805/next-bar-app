/**
 * ============================================
 * おごり酒チケット数取得 API
 * ============================================
 * 指定された店舗の利用可能なおごり酒チケット数を返す
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    if (!storeId) {
      return NextResponse.json(
        { error: '店舗IDが必要です' },
        { status: 400 }
      );
    }

    // 利用可能なチケット数を取得
    const { count, error } = await supabase
      .from('ogori_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'available');

    if (error) {
      console.error('チケット数取得エラー:', error);
      return NextResponse.json(
        { error: 'チケット数の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    console.error('チケット数取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
