/**
 * ============================================
 * ファイルパス: app/api/stores/[id]/vacancy-status/route.ts
 * APIエンドポイント: /api/stores/[id]/vacancy-status
 * 
 * 機能: 店舗のvacancy_statusを取得・更新する
 *       （お店側が空席状況を変更するためのAPI）
 * ============================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 有効なvacancy_statusの値
const VALID_VACANCY_STATUSES = ['vacant', 'moderate', 'full', 'closed'] as const;
type VacancyStatus = (typeof VALID_VACANCY_STATUSES)[number];

/**
 * 店舗のvacancy_statusを更新
 * PATCH /api/stores/[id]/vacancy-status
 * Body: { vacancy_status: 'vacant' | 'moderate' | 'full' | 'closed' }
 * 
 * ルール:
 * - is_open: true の場合 → vacant, moderate, full に設定可能
 * - is_open: false の場合 → closed のみ設定可能（変更不可）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    const body = await request.json();
    const { vacancy_status, status_message } = body;

    // vacancy_statusのバリデーション
    if (vacancy_status && !VALID_VACANCY_STATUSES.includes(vacancy_status)) {
      return NextResponse.json(
        { error: `Invalid vacancy_status. Must be one of: ${VALID_VACANCY_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // 店舗の現在の状態を取得
    const { data: store, error: fetchError } = await supabase
      .from('stores')
      .select('id, is_open, vacancy_status')
      .eq('id', storeId)
      .single();

    if (fetchError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // is_openがfalseの場合、closedへの変更のみ許可
    if (store.is_open === false && vacancy_status && vacancy_status !== 'closed') {
      return NextResponse.json(
        { 
          error: '営業時間外のため、空席状況を変更できません。',
          message: 'この店舗は現在営業時間外です。営業時間中に再度お試しください。',
          is_open: false,
          current_vacancy_status: 'closed'
        },
        { status: 400 }
      );
    }

    // 更新データを構築
    const updateData: {
      vacancy_status?: VacancyStatus;
      status_message?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (vacancy_status) {
      updateData.vacancy_status = vacancy_status;
    }

    if (status_message !== undefined) {
      updateData.status_message = status_message;
    }

    // 更新実行
    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', storeId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating vacancy_status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update vacancy_status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      store: updatedStore,
    });
  } catch (error) {
    console.error('Error in vacancy-status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stores/[id]/vacancy-status
 * 店舗の現在の空席状況を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;

    const { data: store, error } = await supabase
      .from('stores')
      .select('id, name, is_open, vacancy_status, status_message, updated_at')
      .eq('id', storeId)
      .single();

    if (error || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        is_open: store.is_open,
        vacancy_status: store.vacancy_status,
        status_message: store.status_message,
        updated_at: store.updated_at,
        // お店側が変更可能かどうか
        can_update_vacancy: store.is_open === true,
      },
    });
  } catch (error) {
    console.error('Error in vacancy-status GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}