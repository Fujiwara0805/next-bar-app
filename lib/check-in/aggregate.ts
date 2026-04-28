/**
 * チェックイン後のスタンプ集計 + ロッタリー応募可否判定
 *
 * Phase 11 (客QR→店スキャン) と Phase 2-B (店舗QR→客LIFF) の両経路から
 * 同じロジックを呼び出すため、ここに切り出している。
 *
 * - 12時間ローリング窓で distinct 店舗数を数える
 * - 直近の応募 (stamp_rally_entries) が窓の起点を上書きする
 *   (応募後にリセットされる挙動の再現)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export const LOTTERY_STORE_THRESHOLD = 3;
export const LOTTERY_STORE_MAX = 5;
export const WINDOW_HOURS = 12;

export type AggregateResult = {
  isNewStamp: boolean;
  windowStoreCount: number;
  canEnterLottery: boolean;
  hasLotteryEntry: boolean;
  windowHours: number;
  lotteryThreshold: number;
  lotteryMax: number;
  visitDate: string;
};

function tokyoDateString(now: Date): string {
  const tokyoMs =
    now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60 * 1000;
  return new Date(tokyoMs).toISOString().slice(0, 10);
}

/**
 * 12時間 (or 直近の応募以降) の distinct 店舗チェックイン数を集計する。
 * INSERT 前後で2回呼んで isNewStamp を判定する用途。
 */
async function fetchWindowStoreIds(
  admin: SupabaseClient<Database>,
  userId: string,
  cutoffIso: string
): Promise<Set<string>> {
  const { data } = await admin
    .from('store_check_ins')
    .select('store_id')
    .eq('user_id', userId)
    .gte('checked_in_at', cutoffIso);
  return new Set((data ?? []).map((r) => r.store_id));
}

/**
 * 顧客のチェックイン直前の窓の状態を返す。
 * INSERT 前に呼んで wasAlreadyStamped を判定するため。
 */
export async function snapshotPreInsertWindow(
  admin: SupabaseClient<Database>,
  userId: string,
  storeId: string,
  now: Date = new Date()
): Promise<{ wasAlreadyStamped: boolean; cutoffIso: string }> {
  const windowStartMs = now.getTime() - WINDOW_HOURS * 60 * 60 * 1000;

  const { data: latestEntry } = await admin
    .from('stamp_rally_entries')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const entryMs = latestEntry?.created_at
    ? new Date(latestEntry.created_at).getTime()
    : 0;
  const cutoff = new Date(Math.max(windowStartMs, entryMs));
  const cutoffIso = cutoff.toISOString();

  const preStoreIds = await fetchWindowStoreIds(admin, userId, cutoffIso);
  return {
    wasAlreadyStamped: preStoreIds.has(storeId),
    cutoffIso,
  };
}

/**
 * INSERT 後に呼んで、現在の集計結果とロッタリー判定を返す。
 */
export async function aggregatePostInsert(
  admin: SupabaseClient<Database>,
  userId: string,
  cutoffIso: string,
  wasAlreadyStamped: boolean,
  now: Date = new Date()
): Promise<AggregateResult> {
  const visitDate = tokyoDateString(now);
  const postStoreIds = await fetchWindowStoreIds(admin, userId, cutoffIso);
  const windowStoreCount = postStoreIds.size;

  const { data: todayEntry } = await admin
    .from('stamp_rally_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('entry_date', visitDate)
    .maybeSingle();

  const hasLotteryEntry = !!todayEntry;
  const canEnterLottery =
    windowStoreCount >= LOTTERY_STORE_THRESHOLD && !hasLotteryEntry;

  return {
    isNewStamp: !wasAlreadyStamped,
    windowStoreCount,
    canEnterLottery,
    hasLotteryEntry,
    windowHours: WINDOW_HOURS,
    lotteryThreshold: LOTTERY_STORE_THRESHOLD,
    lotteryMax: LOTTERY_STORE_MAX,
    visitDate,
  };
}
