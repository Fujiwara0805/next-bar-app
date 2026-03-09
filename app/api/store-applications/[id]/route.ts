/**
 * ============================================
 * APIエンドポイント: /api/store-applications/[id]
 * GET: 単件取得
 * PATCH: ステータス更新・管理メモ更新
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('store_applications')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Store application fetch error:', error);
      return NextResponse.json({ error: '申し込みの取得に失敗しました' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Store application GET error:', error);
    return NextResponse.json({ error: '申し込みの取得に失敗しました' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.admin_notes !== undefined) updateData.admin_notes = body.admin_notes;
    if (body.reviewed_by !== undefined) updateData.reviewed_by = body.reviewed_by;
    if (body.reviewed_at !== undefined) updateData.reviewed_at = body.reviewed_at;

    const { data, error } = await supabase
      .from('store_applications')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Store application update error:', error);
      return NextResponse.json({ error: '申し込みの更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Store application PATCH error:', error);
    return NextResponse.json({ error: '申し込みの更新に失敗しました' }, { status: 500 });
  }
}
