import { NextRequest, NextResponse } from 'next/server';
import {
  assertPlatformAdmin,
  resolveManageAuth,
} from '@/lib/api/manage-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** テーブル未作成(42P01)を 0 として扱うためのヘルパ */
function isMissingTable(error: { code?: string } | null | undefined) {
  return error?.code === '42P01';
}

/**
 * イベントの費用対効果（ROI）集計（運営admin専用）。
 * 紙クーポン・デジタル特典の両方を横断し、費用入力に対する効率指標を返す。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const auth = await resolveManageAuth(request);
  if (!auth.ok) return auth.response;
  const forbidden = await assertPlatformAdmin(auth.ctx);
  if (forbidden) return forbidden;

  const admin = auth.ctx.admin as any;
  const eventId = params.eventId;

  // イベント本体
  const { data: event, error: eventErr } = await admin
    .from('platform_events')
    .select('id, title, cost_total, start_at, end_at, stamp_enabled, stamp_goal, stamp_reward_text')
    .eq('id', eventId)
    .maybeSingle();
  if (eventErr && !isMissingTable(eventErr)) {
    console.error('[roi] event fetch error', eventErr);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: 'event_not_found' }, { status: 404 });
  }

  // 参加店舗
  const { data: parts } = await admin
    .from('store_event_participations')
    .select('store_id')
    .eq('event_id', eventId)
    .eq('is_participating', true);
  const storeIds: string[] = (parts ?? []).map((p: any) => p.store_id);
  const participatingStores = storeIds.length;

  // 店舗名（内訳表示用）
  const storeNameById = new Map<string, string>();
  if (storeIds.length > 0) {
    const { data: stores } = await admin
      .from('stores')
      .select('id, name')
      .in('id', storeIds);
    (stores ?? []).forEach((s: any) => storeNameById.set(s.id, s.name));
  }

  // チェックイン（イベント期間内・参加店舗）。期間/参加店が無ければ0。
  // 参加店ごとの内訳も同時に集計する（来店数・ユニーク客数）。
  let checkInsTotal = 0;
  let uniqueCustomers = 0;
  const checkInsByStore = new Map<string, number>();
  const uniqueCustByStore = new Map<string, Set<string>>();
  if (storeIds.length > 0) {
    let q = admin
      .from('store_check_ins')
      .select('user_id, store_id', { count: 'exact' })
      .in('store_id', storeIds);
    if (event.start_at) q = q.gte('checked_in_at', event.start_at);
    if (event.end_at) q = q.lte('checked_in_at', event.end_at);
    const { data: checkIns, count: ciCount, error: ciErr } = await q.limit(10000);
    if (ciErr && !isMissingTable(ciErr)) {
      console.warn('[roi] check-in warning', ciErr);
    }
    checkInsTotal = typeof ciCount === 'number' ? ciCount : (checkIns ?? []).length;
    uniqueCustomers = new Set((checkIns ?? []).map((r: any) => r.user_id)).size;
    for (const r of (checkIns ?? []) as any[]) {
      checkInsByStore.set(r.store_id, (checkInsByStore.get(r.store_id) ?? 0) + 1);
      if (!uniqueCustByStore.has(r.store_id)) uniqueCustByStore.set(r.store_id, new Set());
      if (r.user_id) uniqueCustByStore.get(r.store_id)!.add(r.user_id);
    }
  }

  // デジタル特典消込（会員QR→特典消込）。合計＋参加店ごとの件数。
  const { count: digitalCount, error: drErr } = await admin
    .from('store_event_benefit_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);
  if (drErr && !isMissingTable(drErr)) console.warn('[roi] digital redemption warning', drErr);
  const digitalRedemptions = typeof digitalCount === 'number' ? digitalCount : 0;

  const digitalByStore = new Map<string, number>();
  {
    const { data: redStoreRows } = await admin
      .from('store_event_benefit_redemptions')
      .select('store_id')
      .eq('event_id', eventId)
      .limit(10000);
    for (const r of (redStoreRows ?? []) as any[]) {
      if (r.store_id) digitalByStore.set(r.store_id, (digitalByStore.get(r.store_id) ?? 0) + 1);
    }
  }

  // per-user 消込（会員証スキャン）の明細 — 「どの顧客がいつ消し込んだか」を把握
  type PerUserRedemption = {
    id: string;
    user_id: string;
    customer_name: string;
    store_id: string;
    store_name: string;
    redeemed_at: string;
  };
  let perUserRedemptions: PerUserRedemption[] = [];
  const { data: redemptionRows, error: redErr } = await admin
    .from('store_event_benefit_redemptions')
    .select('*')
    .eq('event_id', eventId)
    .order('redeemed_at', { ascending: false })
    .limit(200);
  if (redErr && !isMissingTable(redErr)) {
    console.warn('[roi] per-user redemption warning', redErr);
  }
  const withUser = (redemptionRows ?? []).filter((r: any) => r.user_id);
  if (withUser.length > 0) {
    const uids = Array.from(new Set(withUser.map((r: any) => r.user_id)));
    const { data: users } = await admin
      .from('users')
      .select('id, display_name, line_display_name')
      .in('id', uids);
    const nameById = new Map<string, string>();
    (users ?? []).forEach((u: any) =>
      nameById.set(u.id, u.line_display_name || u.display_name || 'ゲスト')
    );
    // 店舗名を補完（参加店以外で消込された場合も考慮）
    const missingStoreIds = withUser
      .map((r: any) => r.store_id)
      .filter((sid: string) => sid && !storeNameById.has(sid));
    if (missingStoreIds.length > 0) {
      const { data: extraStores } = await admin
        .from('stores')
        .select('id, name')
        .in('id', Array.from(new Set(missingStoreIds)));
      (extraStores ?? []).forEach((s: any) => storeNameById.set(s.id, s.name));
    }
    perUserRedemptions = withUser.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      customer_name: nameById.get(r.user_id) ?? 'ゲスト',
      store_id: r.store_id,
      store_name: storeNameById.get(r.store_id) ?? '—',
      redeemed_at: r.redeemed_at,
    }));
  }
  const perUserUniqueCustomers = new Set(perUserRedemptions.map((r) => r.user_id)).size;

  // スタンプ達成（特典受取済）
  const { count: stampClaimedCount, error: srErr } = await admin
    .from('event_stamp_rewards')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .not('reward_claimed_at', 'is', null);
  if (srErr && !isMissingTable(srErr)) console.warn('[roi] stamp reward warning', srErr);
  const stampRewardsClaimed = typeof stampClaimedCount === 'number' ? stampClaimedCount : 0;

  // スタンプ満了「送信」一覧（会員が全スタンプ達成→運営に送信した記録）
  type StampSubmission = {
    user_id: string;
    customer_name: string;
    submitted_at: string;
    submit_note: string | null;
  };
  let stampSubmissions: StampSubmission[] = [];
  const { data: submittedRows, error: subErr } = await admin
    .from('event_stamp_rewards')
    .select('user_id, submitted_at, submit_note')
    .eq('event_id', eventId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(500);
  // submitted_at/submit_note 列が未作成(42703)でも落とさず空扱い
  if (subErr && !isMissingTable(subErr) && subErr.code !== '42703') {
    console.warn('[roi] stamp submission warning', subErr);
  }
  if ((submittedRows ?? []).length > 0) {
    const uids = Array.from(new Set((submittedRows ?? []).map((r: any) => r.user_id)));
    const { data: subUsers } = await admin
      .from('users')
      .select('id, display_name, line_display_name')
      .in('id', uids);
    const subNameById = new Map<string, string>();
    (subUsers ?? []).forEach((u: any) =>
      subNameById.set(u.id, u.line_display_name || u.display_name || 'ゲスト')
    );
    stampSubmissions = (submittedRows ?? []).map((r: any) => ({
      user_id: r.user_id,
      customer_name: subNameById.get(r.user_id) ?? 'ゲスト',
      submitted_at: r.submitted_at,
      submit_note: r.submit_note ?? null,
    }));
  }

  // 紙クーポン報告（参加店ごと）
  const { data: paperRows, error: pErr } = await admin
    .from('store_event_paper_coupons')
    .select('store_id, distributed_count, redeemed_count, reported_at')
    .eq('event_id', eventId);
  if (pErr && !isMissingTable(pErr)) console.warn('[roi] paper coupon warning', pErr);
  type PaperReport = {
    store_id: string;
    store_name: string;
    distributed_count: number;
    redeemed_count: number;
    reported_at: string | null;
  };
  const paperReports: PaperReport[] = (paperRows ?? []).map((r: any) => ({
    store_id: r.store_id,
    store_name: storeNameById.get(r.store_id) ?? '—',
    distributed_count: r.distributed_count ?? 0,
    redeemed_count: r.redeemed_count ?? 0,
    reported_at: r.reported_at ?? null,
  }));
  const paperDistributed = paperReports.reduce((s, r) => s + r.distributed_count, 0);
  const paperRedeemed = paperReports.reduce((s, r) => s + r.redeemed_count, 0);
  const paperReportedStores = paperReports.filter((r) => r.reported_at).length;

  // 参加店ごとの総合内訳（主催者へ提供するレポート用）。
  // 紙クーポン配布/使用・デジタル消込・来店(チェックイン)・ユニーク客数を1行にまとめる。
  const paperByStoreId = new Map(paperReports.map((p) => [p.store_id, p]));
  const storeBreakdown = storeIds
    .map((sid) => {
      const paper = paperByStoreId.get(sid);
      return {
        store_id: sid,
        store_name: storeNameById.get(sid) ?? '—',
        paper_distributed: paper?.distributed_count ?? 0,
        paper_redeemed: paper?.redeemed_count ?? 0,
        paper_reported: !!paper?.reported_at,
        digital_redemptions: digitalByStore.get(sid) ?? 0,
        check_ins: checkInsByStore.get(sid) ?? 0,
        unique_customers: uniqueCustByStore.get(sid)?.size ?? 0,
      };
    })
    .sort(
      (a, b) =>
        b.check_ins + b.digital_redemptions + b.paper_redeemed -
        (a.check_ins + a.digital_redemptions + a.paper_redeemed)
    );

  // 集計指標
  const totalRedemptions = digitalRedemptions + paperRedeemed;
  const cost = typeof event.cost_total === 'number' ? event.cost_total : null;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const metrics = {
    cost_total: cost,
    participating_stores: participatingStores,
    check_ins_total: checkInsTotal,
    unique_customers: uniqueCustomers,
    digital_redemptions: digitalRedemptions,
    per_user_redemptions: perUserRedemptions.length,
    per_user_unique_customers: perUserUniqueCustomers,
    stamp_rewards_claimed: stampRewardsClaimed,
    stamp_submissions: stampSubmissions.length,
    paper_distributed: paperDistributed,
    paper_redeemed: paperRedeemed,
    paper_reported_stores: paperReportedStores,
    total_redemptions: totalRedemptions,
    cost_per_check_in: cost !== null && checkInsTotal > 0 ? round2(cost / checkInsTotal) : null,
    cost_per_redemption: cost !== null && totalRedemptions > 0 ? round2(cost / totalRedemptions) : null,
    paper_redemption_rate: paperDistributed > 0 ? round2(paperRedeemed / paperDistributed) : null,
  };

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      cost_total: cost,
      start_at: event.start_at,
      end_at: event.end_at,
      stamp_enabled: event.stamp_enabled,
      stamp_goal: event.stamp_goal,
    },
    metrics,
    paper_reports: paperReports,
    per_user_redemptions: perUserRedemptions,
    stamp_submissions: stampSubmissions,
    store_breakdown: storeBreakdown,
  });
}
