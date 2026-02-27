/**
 * ============================================
 * おごり酒チケット使用 API
 * ============================================
 * 利用可能な最も古いおごり酒チケットを使用済みにする
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { storeId, drinkId, drinkName, userId } = await request.json();

    // 入力検証
    if (!storeId) {
      return NextResponse.json(
        { error: '店舗IDが必要です' },
        { status: 400 }
      );
    }

    // 最も古い利用可能なチケットを取得
    const { data: ticket, error: fetchError } = await supabase
      .from('ogori_tickets')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'available')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !ticket) {
      return NextResponse.json(
        { error: '利用可能なおごり酒チケットがありません' },
        { status: 404 }
      );
    }

    // チケットを使用済みに更新
    const { data: updatedTicket, error: updateError } = await (supabase
      .from('ogori_tickets') as any)
      .update({
        status: 'used' as const,
        used_by: userId || null,
        used_at: new Date().toISOString(),
        used_drink_id: drinkId || null,
        used_drink_name: drinkName || null,
      })
      .eq('id', (ticket as any).id)
      .eq('status', 'available') // 楽観的ロック：他のリクエストとの競合を防ぐ
      .select()
      .single();

    if (updateError || !updatedTicket) {
      console.error('チケット更新エラー:', updateError);
      return NextResponse.json(
        { error: 'チケットの使用に失敗しました。既に使用された可能性があります。' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error('チケット使用エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
