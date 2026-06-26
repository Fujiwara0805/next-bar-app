/**
 * 電子クーポンの自動デジタル消込
 *
 * チェックインした店舗が参加している「電子クーポン」イベント
 * （uses_paper_coupon=false・公開中・期間内）について、会員へ紐付けて消し込む。
 * 会員証QR（店スキャン）・店舗QR（客LIFF）のどちらの来店経路からでも、
 * 来店記録と同時にデジタル消込を完了させるための共通ロジック。
 *
 * - 1会員1イベント1回（部分ユニークインデックス uq_sebr_event_user が重複を弾く）。
 *   重複(23505)・列/表未作成は無視し、実際に消し込めた件数を返す。
 * - createdBy は記録者（admin/店舗スタッフ）。客セルフチェックインでは null。
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type Admin = SupabaseClient<Database>;

export async function autoRedeemElectronicCoupons(
  admin: Admin,
  userId: string,
  storeId: string,
  options: { createdBy?: string | null; now?: Date } = {}
): Promise<number> {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  let redeemedCount = 0;
  try {
    const { data: storeParts } = await admin
      .from('store_event_participations')
      .select('event_id')
      .eq('store_id', storeId)
      .eq('is_participating', true);
    const evIds = Array.from(new Set((storeParts ?? []).map((p) => p.event_id)));
    if (evIds.length === 0) return 0;

    const { data: evs } = await admin
      .from('platform_events')
      .select('id, status, start_at, end_at, uses_paper_coupon')
      .in('id', evIds)
      .eq('status', 'published')
      .eq('uses_paper_coupon', false);
    const activeElectronic = (evs ?? []).filter((e) => {
      const startOk = !e.start_at || e.start_at <= nowIso;
      const endOk = !e.end_at || e.end_at >= nowIso;
      return startOk && endOk;
    });

    for (const e of activeElectronic) {
      const ins = await admin.from('store_event_benefit_redemptions').insert({
        event_id: e.id,
        store_id: storeId,
        user_id: userId,
        redeemed_at: nowIso,
        created_by: options.createdBy ?? null,
      });
      if (!ins.error) redeemedCount += 1; // 23505=既消込 等は加算しない
    }
  } catch (e) {
    console.warn('[coupon-redeem] auto-redeem warning', e);
  }
  return redeemedCount;
}
