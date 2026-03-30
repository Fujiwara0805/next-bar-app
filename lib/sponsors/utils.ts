import type { ScheduleConfig } from './types';

/**
 * 現在の曜日・時間帯がスケジュール設定に合致するか判定
 */
export function isWithinSchedule(config: ScheduleConfig): boolean {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const day = jst.getDay(); // 0=日, 6=土
  const hour = jst.getHours();

  // 曜日チェック
  if (config.weekdays && config.weekdays.length > 0) {
    if (!config.weekdays.includes(day)) return false;
  }

  // 時間帯チェック
  if (config.start_hour !== undefined && config.end_hour !== undefined) {
    if (config.start_hour <= config.end_hour) {
      // 通常: 例 9-17
      if (hour < config.start_hour || hour >= config.end_hour) return false;
    } else {
      // 深夜跨ぎ: 例 17-5
      if (hour < config.start_hour && hour >= config.end_hour) return false;
    }
  }

  return true;
}

/**
 * デバイスタイプを判定
 */
export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * プランタイプから終了日を計算
 */
export function calculateEndDate(
  startDate: string,
  planType: '1day' | '7day' | '30day' | 'custom'
): string {
  const start = new Date(startDate);
  switch (planType) {
    case '1day':
      return startDate; // 同日
    case '7day':
      start.setDate(start.getDate() + 6);
      return start.toISOString().split('T')[0];
    case '30day':
      start.setDate(start.getDate() + 29);
      return start.toISOString().split('T')[0];
    default:
      return startDate;
  }
}
