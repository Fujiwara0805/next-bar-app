/**
 * イベント専用スタンプラリーの集計
 *
 * チェックインした店舗が「現在アクティブなスタンプ有効イベント」の参加店である場合、
 * そのイベント内で訪問した distinct 参加店数を数え、ゴール（stamp_goal）到達で特典を
 * アンロックする。ゴール到達は event_stamp_rewards に per-user で1行記録する。
 *
 * 設計（正本 §4 / tasks/nikenme-plus-feature-gap-plan C1）:
 * - スタンプ = store_check_ins の再利用（新チェックインテーブルは作らない）
 * - 旧 generic（12時間窓・stamp_rally_entries・lottery_rounds）は置き換え（停止）
 * - 報酬 = 特典アンロック（抽選なし）。引き換えは reward_claimed_at（別途・店舗側）
 *
 * Phase 11（客QR→店スキャン）と Phase 2-B（店舗QR→客LIFF）の両経路から呼ぶため、
 * insert を挟んで pre/post の2段で使う（既存 aggregate.ts と同じ作法）。
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type Admin = SupabaseClient<Database>;

/** start_at が null のイベント窓の下限フォールバック */
const FAR_PAST_ISO = '1970-01-01T00:00:00.000Z';

/** insert 前のスナップショット（finalize に渡す） */
export type EventStampSnapshot = {
  eventId: string;
  eventTitle: string;
  stampGoal: number;
  rewardText: string | null;
  startIso: string;
  participatingStoreIds: string[];
  preDistinctCount: number;
  wasStoreAlreadyStamped: boolean;
};

/** チェックイン応答に載せるイベントスタンプ進捗 */
export type EventStampProgress = {
  eventId: string;
  eventTitle: string;
  stampCount: number;
  stampGoal: number;
  goalReached: boolean;
  /** このチェックインで新しい参加店スタンプを獲得したか */
  isNewStamp: boolean;
  /** このチェックインでゴールに到達したか（特典アンロックの瞬間） */
  isNewlyCompleted: boolean;
  rewardText: string | null;
  rewardClaimedAt: string | null;
};

/**
 * 店舗が参加している「現在アクティブなスタンプ有効イベント」を1件返す。
 * 複数該当時は終了が近いものを優先（end_at 昇順）。
 */
async function findActiveStampEvent(
  admin: Admin,
  storeId: string,
  nowIso: string
): Promise<{
  id: string;
  title: string;
  stamp_goal: number;
  stamp_reward_text: string | null;
  start_at: string | null;
  end_at: string | null;
} | null> {
  const { data: parts } = await admin
    .from('store_event_participations')
    .select('event_id')
    .eq('store_id', storeId)
    .eq('is_participating', true);

  const eventIds = Array.from(new Set((parts ?? []).map((p) => p.event_id)));
  if (eventIds.length === 0) return null;

  const { data: events } = await admin
    .from('platform_events')
    .select('id, title, stamp_goal, stamp_reward_text, start_at, end_at')
    .in('id', eventIds)
    .eq('status', 'published')
    .eq('stamp_enabled', true);

  const active = (events ?? []).filter((e) => {
    const startOk = !e.start_at || e.start_at <= nowIso;
    const endOk = !e.end_at || e.end_at >= nowIso;
    return startOk && endOk;
  });
  if (active.length === 0) return null;

  active.sort((a, b) => {
    const ae = a.end_at ?? '9999-12-31';
    const be = b.end_at ?? '9999-12-31';
    return ae < be ? -1 : ae > be ? 1 : 0;
  });
  return active[0];
}

/** イベント窓内で user が訪れた distinct 参加店の集合 */
async function distinctVisitedStores(
  admin: Admin,
  userId: string,
  storeIds: string[],
  startIso: string,
  untilIso: string
): Promise<Set<string>> {
  if (storeIds.length === 0) return new Set();
  const { data } = await admin
    .from('store_check_ins')
    .select('store_id')
    .eq('user_id', userId)
    .in('store_id', storeIds)
    .gte('checked_in_at', startIso)
    .lte('checked_in_at', untilIso);
  return new Set((data ?? []).map((r) => r.store_id));
}

/**
 * insert 前に呼ぶ。チェックイン店舗のアクティブなスタンプイベントを引き、
 * 現時点の distinct 訪問数・当該店が既スタンプかを記録する。
 * スタンプ対象イベントが無ければ null。
 */
export async function snapshotEventStampPre(
  admin: Admin,
  userId: string,
  storeId: string,
  now: Date = new Date()
): Promise<EventStampSnapshot | null> {
  const nowIso = now.toISOString();
  const event = await findActiveStampEvent(admin, storeId, nowIso);
  if (!event) return null;

  const { data: parts } = await admin
    .from('store_event_participations')
    .select('store_id')
    .eq('event_id', event.id)
    .eq('is_participating', true);
  const participatingStoreIds = Array.from(
    new Set((parts ?? []).map((p) => p.store_id))
  );

  const startIso = event.start_at ?? FAR_PAST_ISO;
  const preSet = await distinctVisitedStores(
    admin,
    userId,
    participatingStoreIds,
    startIso,
    nowIso
  );

  return {
    eventId: event.id,
    eventTitle: event.title,
    stampGoal: event.stamp_goal ?? 3,
    rewardText: event.stamp_reward_text ?? null,
    startIso,
    participatingStoreIds,
    preDistinctCount: preSet.size,
    wasStoreAlreadyStamped: preSet.has(storeId),
  };
}

/**
 * insert 後に呼ぶ。distinct 訪問数を再集計し、ゴール到達なら特典アンロックを
 * event_stamp_rewards に冪等 upsert する。進捗を返す。
 */
export async function finalizeEventStamp(
  admin: Admin,
  userId: string,
  snap: EventStampSnapshot,
  now: Date = new Date()
): Promise<EventStampProgress> {
  const nowIso = now.toISOString();
  const postSet = await distinctVisitedStores(
    admin,
    userId,
    snap.participatingStoreIds,
    snap.startIso,
    nowIso
  );
  const stampCount = postSet.size;
  const goalReached = stampCount >= snap.stampGoal;
  const isNewlyCompleted = goalReached && snap.preDistinctCount < snap.stampGoal;

  let rewardClaimedAt: string | null = null;
  if (goalReached) {
    // 冪等: (user_id, event_id) ユニーク。既存があれば何もしない。
    await admin
      .from('event_stamp_rewards')
      .upsert(
        { user_id: userId, event_id: snap.eventId },
        { onConflict: 'user_id,event_id', ignoreDuplicates: true }
      );
    const { data: row } = await admin
      .from('event_stamp_rewards')
      .select('reward_claimed_at')
      .eq('user_id', userId)
      .eq('event_id', snap.eventId)
      .maybeSingle();
    rewardClaimedAt = row?.reward_claimed_at ?? null;
  }

  return {
    eventId: snap.eventId,
    eventTitle: snap.eventTitle,
    stampCount,
    stampGoal: snap.stampGoal,
    goalReached,
    isNewStamp: !snap.wasStoreAlreadyStamped,
    isNewlyCompleted,
    rewardText: snap.rewardText,
    rewardClaimedAt,
  };
}

/** 読み取り専用の進捗（チェックインを伴わない常設表示用） */
export type EventStampReadProgress = {
  eventId: string;
  stampCount: number;
  stampGoal: number;
  goalReached: boolean;
  rewardClaimedAt: string | null;
};

/**
 * 指定イベント × ユーザーの現在のスタンプ進捗を読み取り専用で返す（副作用なし）。
 * イベントが未公開／スタンプ無効なら null。店舗詳細の常設表示などから使う。
 */
export async function getEventStampProgress(
  admin: Admin,
  userId: string,
  eventId: string,
  now: Date = new Date()
): Promise<EventStampReadProgress | null> {
  const { data: event } = await admin
    .from('platform_events')
    .select('id, stamp_enabled, stamp_goal, start_at, status')
    .eq('id', eventId)
    .maybeSingle();
  if (!event || event.status !== 'published' || !event.stamp_enabled) return null;

  const { data: parts } = await admin
    .from('store_event_participations')
    .select('store_id')
    .eq('event_id', eventId)
    .eq('is_participating', true);
  const participatingStoreIds = Array.from(
    new Set((parts ?? []).map((p) => p.store_id))
  );

  const startIso = event.start_at ?? FAR_PAST_ISO;
  const visited = await distinctVisitedStores(
    admin,
    userId,
    participatingStoreIds,
    startIso,
    now.toISOString()
  );
  const stampCount = visited.size;
  const stampGoal = event.stamp_goal ?? 3;
  const goalReached = stampCount >= stampGoal;

  let rewardClaimedAt: string | null = null;
  if (goalReached) {
    const { data: row } = await admin
      .from('event_stamp_rewards')
      .select('reward_claimed_at')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle();
    rewardClaimedAt = row?.reward_claimed_at ?? null;
  }

  return { eventId, stampCount, stampGoal, goalReached, rewardClaimedAt };
}
