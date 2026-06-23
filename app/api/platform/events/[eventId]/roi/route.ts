import { NextRequest, NextResponse } from 'next/server';
import {
  assertPlatformAdmin,
  resolveManageAuth,
} from '@/lib/api/manage-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Surrogate-Control': 'no-store',
};

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

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
    return jsonNoStore({ error: 'fetch_failed' }, { status: 500 });
  }
  if (!event) {
    return jsonNoStore({ error: 'event_not_found' }, { status: 404 });
  }

  // 参加店舗
  // 注意: ここを silent に握り潰すと「クエリ失敗」を「参加店0」と誤表示し、
  // チェックイン/内訳まで 0 に連鎖する。失敗時は 0 を返さず明示的にエラーにする。
  // 一過性のコールドスタート起因のエラーに備えて 1 回だけ即時リトライする。
  const fetchParticipations = async () =>
    admin
      .from('store_event_participations')
      .select('store_id')
      .eq('event_id', eventId)
      .eq('is_participating', true);
  let { data: parts, error: partsErr } = await fetchParticipations();
  if (partsErr && !isMissingTable(partsErr)) {
    console.warn('[roi] participations fetch retry after error', partsErr);
    ({ data: parts, error: partsErr } = await fetchParticipations());
  }
  if (partsErr && !isMissingTable(partsErr)) {
    console.error('[roi] participations fetch error', partsErr);
    return jsonNoStore({ error: 'participations_fetch_failed' }, { status: 500 });
  }
  const participatingStoreIds: string[] = (parts ?? [])
    .map((p: any) => p.store_id)
    .filter(Boolean);
  const reportStoreIds = new Set<string>(participatingStoreIds);

  // 店舗名（内訳表示用）
  const storeNameById = new Map<string, string>();
  const loadStoreNames = async (ids: string[]) => {
    const missingIds = Array.from(new Set(ids.filter((id) => id && !storeNameById.has(id))));
    if (missingIds.length === 0) return;
    const { data: stores, error: storesErr } = await admin
      .from('stores')
      .select('id, name')
      .in('id', missingIds);
    if (storesErr && !isMissingTable(storesErr)) {
      console.warn('[roi] store name warning', storesErr);
    }
    (stores ?? []).forEach((s: any) => storeNameById.set(s.id, s.name));
  };
  await loadStoreNames(participatingStoreIds);

  // デジタル特典消込（会員QR→特典消込）。合計＋参加店ごとの件数。
  const { count: digitalCount, error: drErr } = await admin
    .from('store_event_benefit_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);
  if (drErr && !isMissingTable(drErr)) console.warn('[roi] digital redemption warning', drErr);
  const digitalRedemptions = typeof digitalCount === 'number' ? digitalCount : 0;

  const digitalByStore = new Map<string, number>();
  const digitalUserStoreSet = new Set<string>(); // `${user_id}:${store_id}` = この店でデジタル消込した会員
  {
    const { data: redStoreRows, error: redStoreErr } = await admin
      .from('store_event_benefit_redemptions')
      .select('user_id, store_id')
      .eq('event_id', eventId)
      .limit(10000);
    if (redStoreErr && !isMissingTable(redStoreErr)) {
      console.warn('[roi] redemption store warning', redStoreErr);
    }
    for (const r of (redStoreRows ?? []) as any[]) {
      if (r.store_id) {
        reportStoreIds.add(r.store_id);
        digitalByStore.set(r.store_id, (digitalByStore.get(r.store_id) ?? 0) + 1);
      }
      if (r.user_id && r.store_id) digitalUserStoreSet.add(`${r.user_id}:${r.store_id}`);
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
    await loadStoreNames(withUser.map((r: any) => r.store_id).filter(Boolean));
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
  const paperRowList = (paperRows ?? []) as any[];
  paperRowList.forEach((r: any) => {
    if (r.store_id) reportStoreIds.add(r.store_id);
  });
  await loadStoreNames(Array.from(reportStoreIds));
  const paperReports: PaperReport[] = paperRowList.map((r: any) => ({
    store_id: r.store_id,
    store_name: storeNameById.get(r.store_id) ?? '—',
    distributed_count: r.distributed_count ?? 0,
    redeemed_count: r.redeemed_count ?? 0,
    reported_at: r.reported_at ?? null,
  }));
  const paperDistributed = paperReports.reduce((s, r) => s + r.distributed_count, 0);
  const paperRedeemed = paperReports.reduce((s, r) => s + r.redeemed_count, 0);
  const paperReportedStores = paperReports.filter((r) => r.reported_at).length;

  // チェックイン（イベント期間内・ROI対象店舗）。期間/対象店舗が無ければ0。
  // 参加行が無い環境でも、紙クーポン報告や消込実績がある店舗は内訳に含める。
  let checkInsTotal = 0;
  let uniqueCustomers = 0;
  const checkInsByStore = new Map<string, number>();
  const uniqueCustByStore = new Map<string, Set<string>>();
  // 店舗ごとの来店者明細（誰がどの店に何回来たか）。store_id → user_id → {visits,last}
  const visitorsByStore = new Map<string, Map<string, { visits: number; last: string | null }>>();
  const breakdownStoreIds = Array.from(reportStoreIds);
  if (breakdownStoreIds.length > 0) {
    let q = admin
      .from('store_check_ins')
      .select('user_id, store_id, checked_in_at', { count: 'exact' })
      .in('store_id', breakdownStoreIds);
    if (event.start_at) q = q.gte('checked_in_at', event.start_at);
    if (event.end_at) q = q.lte('checked_in_at', event.end_at);
    const { data: checkIns, count: ciCount, error: ciErr } = await q.limit(10000);
    if (ciErr && !isMissingTable(ciErr)) {
      console.warn('[roi] check-in warning', ciErr);
    }
    checkInsTotal = typeof ciCount === 'number' ? ciCount : (checkIns ?? []).length;
    uniqueCustomers = new Set((checkIns ?? []).map((r: any) => r.user_id).filter(Boolean)).size;
    for (const r of (checkIns ?? []) as any[]) {
      checkInsByStore.set(r.store_id, (checkInsByStore.get(r.store_id) ?? 0) + 1);
      if (!uniqueCustByStore.has(r.store_id)) uniqueCustByStore.set(r.store_id, new Set());
      if (r.user_id) uniqueCustByStore.get(r.store_id)!.add(r.user_id);
      if (r.user_id) {
        if (!visitorsByStore.has(r.store_id)) visitorsByStore.set(r.store_id, new Map());
        const vmap = visitorsByStore.get(r.store_id)!;
        const ts: string | null = r.checked_in_at ?? null;
        const prev = vmap.get(r.user_id);
        if (prev) {
          prev.visits += 1;
          if (ts && (!prev.last || ts > prev.last)) prev.last = ts;
        } else {
          vmap.set(r.user_id, { visits: 1, last: ts });
        }
      }
    }
  }

  // 来店者の解決（参加店ごとの来店者明細用）。チェックインした全会員の表示名＋属性を一括取得。
  // 属性（性別/年代/職業/住所）は会員証ページで入力された profile_attributes に格納されている。
  type VisitorAttrs = { gender: string; age: string; occupation: string; address: string };
  const visitorUids = new Set<string>();
  visitorsByStore.forEach((vmap) => vmap.forEach((_v, uid) => visitorUids.add(uid)));
  const visitorNameById = new Map<string, string>();
  const visitorAttrsById = new Map<string, VisitorAttrs>();
  if (visitorUids.size > 0) {
    const { data: vUsers } = await admin
      .from('users')
      .select('id, display_name, line_display_name, profile_attributes')
      .in('id', Array.from(visitorUids));
    (vUsers ?? []).forEach((u: any) => {
      visitorNameById.set(u.id, u.line_display_name || u.display_name || 'ゲスト');
      const a = (u.profile_attributes && typeof u.profile_attributes === 'object' && !Array.isArray(u.profile_attributes))
        ? (u.profile_attributes as Record<string, unknown>)
        : {};
      visitorAttrsById.set(u.id, {
        gender: typeof a.gender === 'string' ? a.gender : '',
        age: typeof a.age === 'string' ? a.age : '',
        occupation: typeof a.occupation === 'string' ? a.occupation : '',
        address: typeof a.address === 'string' ? a.address : '',
      });
    });
  }

  // 参加店ごとの総合内訳（主催者へ提供するレポート用）。
  // 紙クーポン配布/使用・デジタル消込・来店(チェックイン)・ユニーク客数・スタンプ達成を1行にまとめる。
  // スタンプ達成（店舗別）= 全スタンプを達成し運営へ送信した会員のうち、当該店に来店した人数。
  // visitors = 各店に来店した会員の明細（誰が・何回・最終来店・消込/達成）。展開行で表示。
  type VisitorDetail = {
    user_id: string;
    customer_name: string;
    visits: number;
    last_checked_in_at: string | null;
    digital_redeemed: boolean;
    stamp_completed: boolean;
    gender: string;
    age: string;
    occupation: string;
    address: string;
  };
  const stampCompleterUids = new Set(stampSubmissions.map((s) => s.user_id));
  const paperByStoreId = new Map(paperReports.map((p) => [p.store_id, p]));
  const storeBreakdown = breakdownStoreIds
    .map((sid) => {
      const paper = paperByStoreId.get(sid);
      const visitorSet = uniqueCustByStore.get(sid);
      let stampCompletions = 0;
      if (visitorSet) {
        visitorSet.forEach((uid) => { if (stampCompleterUids.has(uid)) stampCompletions++; });
      }
      const vmap = visitorsByStore.get(sid);
      const visitors: VisitorDetail[] = vmap
        ? Array.from(vmap.entries())
            .map(([uid, v]) => {
              const attrs = visitorAttrsById.get(uid);
              return {
                user_id: uid,
                customer_name: visitorNameById.get(uid) ?? 'ゲスト',
                visits: v.visits,
                last_checked_in_at: v.last,
                digital_redeemed: digitalUserStoreSet.has(`${uid}:${sid}`),
                stamp_completed: stampCompleterUids.has(uid),
                gender: attrs?.gender ?? '',
                age: attrs?.age ?? '',
                occupation: attrs?.occupation ?? '',
                address: attrs?.address ?? '',
              };
            })
            .sort((a, b) =>
              b.visits !== a.visits
                ? b.visits - a.visits
                : (b.last_checked_in_at ?? '').localeCompare(a.last_checked_in_at ?? '')
            )
        : [];
      return {
        store_id: sid,
        store_name: storeNameById.get(sid) ?? '—',
        paper_distributed: paper?.distributed_count ?? 0,
        paper_redeemed: paper?.redeemed_count ?? 0,
        paper_reported: !!paper?.reported_at,
        digital_redemptions: digitalByStore.get(sid) ?? 0,
        check_ins: checkInsByStore.get(sid) ?? 0,
        unique_customers: uniqueCustByStore.get(sid)?.size ?? 0,
        stamp_completions: stampCompletions,
        visitors,
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
    participating_stores: breakdownStoreIds.length,
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

  return jsonNoStore({
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
