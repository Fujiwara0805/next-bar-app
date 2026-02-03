import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const JST = 'Asia/Tokyo';

/**
 * 現在時刻が JST で 18:00〜28:00（翌4時）の間かどうかを判定する。
 * 初回マウント時の update-is-open API 呼び出しをこの時間帯に制限するために使用。
 */
export function isWithinIsOpenUpdateWindow(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: JST,
    hour: 'numeric',
    hour12: false,
    hourCycle: 'h23',
  });
  const hour = parseInt(formatter.format(now), 10);
  // 18:00〜28:00（翌4時）＝ 18時台〜23時台 または 0時台〜3時台
  return hour >= 18 || hour < 4;
}
