/**
 * ============================================
 * おごり酒ドリンクメニュー取得 API
 * ============================================
 * 指定された店舗のおごり酒対象ドリンクメニューを返す
 * レスポンス: { id, name, image_url, is_active } (price なし)
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

    // アクティブなドリンクメニューを取得（id, name, image_url のみ）
    const { data: drinks, error } = await supabase
      .from('ogori_drinks')
      .select('id, name, image_url')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('ドリンクメニュー取得エラー:', error);
      return NextResponse.json(
        { error: 'ドリンクメニューの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ drinks: drinks ?? [] });
  } catch (error) {
    console.error('ドリンクメニュー取得エラー:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
