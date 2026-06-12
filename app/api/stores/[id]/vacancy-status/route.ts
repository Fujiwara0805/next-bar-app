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
import { sendPushToNearbyUsers } from '@/lib/push/server';
import { filterVacancyTargets, isMessagingConfigured, multicast } from '@/lib/line/messaging';
import { buildAnnouncementFlexMessage } from '@/lib/line/flex-announcement';
import { buildLiffPathUrl, buildLiffTrackingUrl } from '@/lib/line/liff-url';
import { assertStoreAccess, resolveManageAuth } from '@/lib/api/manage-auth';

const DEFAULT_LINE_VACANCY_RADIUS_KM = 1.0;
const VACANCY_THROTTLE_HOURS = 0.05; // 1ユーザー3分に1通まで（運用緩和: テスト中は連続送信可）

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 有効なvacancy_statusの値
const VALID_VACANCY_STATUSES = ['vacant', 'open', 'full', 'closed'] as const;
type VacancyStatus = (typeof VALID_VACANCY_STATUSES)[number];

/**
 * 店舗のvacancy_statusを更新
 * PATCH /api/stores/[id]/vacancy-status
 * Body: { vacancy_status: 'vacant' | 'open' | 'full' | 'closed' }
 * 
 * ルール:
 * - is_open: true の場合 → vacant, open, full に設定可能
 * - is_open: false の場合 → closed のみ設定可能（変更不可）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
    }

    const { id: storeId } = await params;
    const auth = await resolveManageAuth(request);
    if (!auth.ok) return auth.response;

    const forbidden = await assertStoreAccess(auth.ctx, storeId);
    if (forbidden) return forbidden;

    const supabase = auth.ctx.admin;
    const body = await request.json();
    const {
      vacancy_status,
      status_message,
      is_open,
      vacant_seats,
      manual_closed,
      closed_reason,
      manual_closed_at,
      last_is_open_check_at,
      last_updated,
    } = body;

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
      .select('id, name, is_open, vacancy_status, latitude, longitude, image_urls')
      .eq('id', storeId)
      .single();

    if (fetchError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // 更新データを構築（update/page.tsxが送る全フィールドに対応）
  
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (vacancy_status !== undefined) updateData.vacancy_status = vacancy_status;
    // 空席ステータス変更時は鮮度アンカー(last_updated)を必ず打刻する。
    // クライアントが last_updated を送らないケースでも鮮度判定を正しく機能させる。
    // ([[lib/vacancy/freshness.ts]] の自動降格はこの値を基準にする)
    if (vacancy_status !== undefined) updateData.last_updated = new Date().toISOString();
    if (status_message !== undefined) updateData.status_message = status_message;
    if (is_open !== undefined) updateData.is_open = is_open;
    if (vacant_seats !== undefined) updateData.vacant_seats = vacant_seats;
    if (manual_closed !== undefined) updateData.manual_closed = manual_closed;
    if (closed_reason !== undefined) updateData.closed_reason = closed_reason;
    if (manual_closed_at !== undefined) updateData.manual_closed_at = manual_closed_at;
    if (last_is_open_check_at !== undefined) updateData.last_is_open_check_at = last_is_open_check_at;
    // vacancy_status 変更時はサーバ打刻を優先（クライアント値で上書きさせない）
    if (last_updated !== undefined && vacancy_status === undefined) {
      updateData.last_updated = last_updated;
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

    // 空席ありに保存されたら、近くのユーザーにプッシュ通知（fire-and-forget）。
    // 「遷移」ではなく「現在 vacant」を条件にして、再保存でも発火可能にする。
    // 30分のスロットル ([[filterVacancyTargets]]) と日次キャップが連投を防ぐ。
    if (
      vacancy_status === 'vacant' &&
      store.latitude != null &&
      store.longitude != null
    ) {
      sendPushToNearbyUsers(
        store.latitude,
        store.longitude,
        {
          title: '近くのお店に空席があります！',
          body: `${store.name} に空席が出ました`,
          url: `/store/${storeId}`,
          tag: `vacancy-${storeId}`,
        }
      );

      // LINE OA への配信（fire-and-forget）。未設定環境ではスキップ。
      if (isMessagingConfigured()) {
        const storeLat = store.latitude as number;
        const storeLng = store.longitude as number;
        (async () => {
          try {
            const { data: subscribers } = await supabase
              .from('line_oa_subscribers')
              .select(
                'line_user_id, latest_latitude, latest_longitude, notify_center_latitude, notify_center_longitude, vacancy_notify_opt_in, vacancy_notify_radius_km, unfollowed_at, last_vacancy_sent_at, daily_notify_count, daily_notify_date'
              )
              .is('unfollowed_at', null)
              .eq('vacancy_notify_opt_in', true);

            const targets = filterVacancyTargets(
              subscribers ?? [],
              storeLat,
              storeLng,
              DEFAULT_LINE_VACANCY_RADIUS_KM,
              VACANCY_THROTTLE_HOURS
            );

            // 先にメッセージをインサートしてIDを取得（クリック追跡URLに使う）
            const { data: msgRow } = await supabase
              .from('store_messages')
              .insert({
                store_id: storeId,
                kind: 'auto_vacancy',
                body: `${store.name} に空席が出ました`,
                target_audience: 'nearby',
                target_radius_km: DEFAULT_LINE_VACANCY_RADIUS_KM,
                sent_count: 0,
                failed_count: 0,
                status: 'pending',
              })
              .select('id')
              .maybeSingle();

            if (targets.length === 0) {
              if (msgRow?.id) {
                await supabase
                  .from('store_messages')
                  .update({ status: 'sent' })
                  .eq('id', msgRow.id);
              }
              return;
            }

            const trackUrl = msgRow?.id
              ? buildLiffTrackingUrl(msgRow.id, `/store/${storeId}`)
              : buildLiffPathUrl(`/store/${storeId}`);

            const heroImage = Array.isArray(store.image_urls)
              ? store.image_urls[0] ?? null
              : null;
            const flex = buildAnnouncementFlexMessage({
              kind: 'vacancy',
              storeName: store.name,
              body: '空席が出ました。ご来店をお待ちしております。',
              trackingUrl: trackUrl,
              imageUrl: heroImage,
              vacantSeats: typeof vacant_seats === 'number' ? vacant_seats : null,
            });

            const result = await multicast(targets, [flex]);

            // 送信成功したtargetsへ last_vacancy_sent_at と日次カウンタを反映（JSTで自動リセット）
            if (result.delivered > 0 && targets.length > 0) {
              await supabase.rpc('bump_line_oa_daily_count', { p_users: targets });
            }

            if (msgRow?.id) {
              await supabase
                .from('store_messages')
                .update({
                  sent_count: result.delivered,
                  failed_count: result.failed,
                  status:
                    result.failed === 0
                      ? 'sent'
                      : result.delivered === 0
                      ? 'failed'
                      : 'partial',
                  error_message: result.errors.slice(0, 3).join('; ') || null,
                })
                .eq('id', msgRow.id);
            }
          } catch (err) {
            console.error('[line vacancy push] error', err);
          }
        })();
      }
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
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
    }

    const storeId = params.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
