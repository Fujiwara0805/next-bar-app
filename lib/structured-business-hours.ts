/**
 * 構造化営業時間による開店/閉店判定ユーティリティ
 *
 * - 翌日閉店（例: 18:00-02:00）に対応
 * - 当日のデータがない場合は null を返し、Google API へのフォールバックを許可
 * - タイムゾーンは Asia/Tokyo 固定
 */

import type { BusinessHours } from '@/lib/supabase/types';

const DAY_KEYS: Array<keyof Required<BusinessHours>> = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * 時間文字列 (HH:MM) を分数に変換
 */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * 日本時間 (Asia/Tokyo) の現在時刻を取得
 */
function getNowInJST(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
  );
}

/**
 * 構造化営業時間から開店/閉店を判定する
 *
 * @returns true = 営業中, false = 営業外, null = 判定不可（当日データなし）
 */
export function checkIsOpenFromStructuredHours(
  hours: BusinessHours | null | undefined
): boolean | null {
  if (!hours) return null;

  const now = getNowInJST();
  const currentDayIndex = now.getDay(); // 0 = Sunday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const currentDayKey = DAY_KEYS[currentDayIndex];
  const previousDayKey = DAY_KEYS[(currentDayIndex + 6) % 7];

  const todayHours = hours[currentDayKey];
  const yesterdayHours = hours[previousDayKey];

  // Check 1: 前日の翌日またぎ営業のoverflow期間内か？
  // 例: 前日が 18:00-02:00 で、今が 01:30 → まだ営業中
  if (
    yesterdayHours &&
    !yesterdayHours.closed &&
    yesterdayHours.open &&
    yesterdayHours.close
  ) {
    const yOpenMin = parseTimeToMinutes(yesterdayHours.open);
    const yCloseMin = parseTimeToMinutes(yesterdayHours.close);

    // 翌日またぎ（close <= open）の場合のみ
    if (yCloseMin <= yOpenMin && currentMinutes < yCloseMin) {
      return true;
    }
  }

  // Check 2: 当日のデータがない → 判定不可
  if (!todayHours) return null;

  // Check 3: 当日が定休日
  if (todayHours.closed) return false;

  // Check 4: 当日の営業時間内か？
  if (todayHours.open && todayHours.close) {
    const openMin = parseTimeToMinutes(todayHours.open);
    const closeMin = parseTimeToMinutes(todayHours.close);

    if (closeMin > openMin) {
      // 同日閉店（例: 09:00-17:00）
      return currentMinutes >= openMin && currentMinutes < closeMin;
    } else {
      // 翌日閉店（例: 18:00-02:00）→ 開店時間以降なら営業中
      return currentMinutes >= openMin;
    }
  }

  // open/close が未入力なら判定不可
  return null;
}

/**
 * 当日の営業開始時間（時の部分）を取得する（定休日でない営業日のみ）
 *
 * @returns 営業開始の時 (例: "18")、または null（定休日・データなし）
 */
export function getTodayOpenTime(
  hours: BusinessHours | null | undefined
): string | null {
  if (!hours) return null;

  const now = getNowInJST();
  const currentDayIndex = now.getDay();
  const currentDayKey = DAY_KEYS[currentDayIndex];

  const todayHours = hours[currentDayKey];
  if (!todayHours) return null;
  if (todayHours.closed) return null;
  if (!todayHours.open) return null;

  const hour = parseInt(todayHours.open.split(':')[0], 10);
  if (isNaN(hour)) return null;
  return String(hour);
}

/**
 * 当日が定休日かどうかを判定する
 */
export function isTodayClosedDay(
  hours: BusinessHours | null | undefined
): boolean {
  if (!hours) return false;

  const now = getNowInJST();
  const currentDayIndex = now.getDay();
  const currentDayKey = DAY_KEYS[currentDayIndex];

  const todayHours = hours[currentDayKey];
  return !!todayHours?.closed;
}
