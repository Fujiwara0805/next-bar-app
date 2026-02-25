/**
 * GA4カスタムイベント送信ユーティリティ
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function sendGAEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}
