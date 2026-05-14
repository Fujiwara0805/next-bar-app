// ============================================
// LIFF URL ビルダー
// Flex Message の uri アクションを LIFF URL 形式
// (https://liff.line.me/{LIFF_ID}/...) に揃えるためのヘルパー。
//
// LINE Flex の uri アクションは、通常の https URL だとユーザー設定の
// ブラウザで開かれる (多くは LINE 外の Safari/Chrome に飛ぶ)。
// LIFF URL を使うと LINE アプリ内 LIFF webview で開かれるため、
// クーポン / 空席通知 / 配信メッセージなどを「LINE 内で完結」させたい
// ケースで本ヘルパーを使う。
//
// 前提: LINE Developers コンソールの LIFF Endpoint URL がサイトルート
// (例: https://nikenmeplus.com/) に設定されていること。
// LIFF_ID 未設定の dev 環境などでは絶対URLにフォールバックする。
// ============================================

const LIFF_BASE = 'https://liff.line.me';

function getLiffId(): string | null {
  return process.env.NEXT_PUBLIC_LIFF_ID ?? null;
}

function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
}

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * 同一オリジンの相対パスを LIFF URL にラップする。
 * LIFF_ID が未設定なら絶対URLにフォールバック。
 */
export function buildLiffPathUrl(relativePath: string): string {
  const path = ensureLeadingSlash(relativePath);
  const liffId = getLiffId();
  if (liffId) {
    return `${LIFF_BASE}/${liffId}${path}`;
  }
  return `${getSiteOrigin()}${path}`;
}

/**
 * クリック追跡付きの LIFF URL を作る。
 * `/api/line/track` 経由で click_count を +1 した後、LIFF webview 内で
 * `targetPath` へ 302 リダイレクトされる。
 */
export function buildLiffTrackingUrl(messageId: string, targetPath: string): string {
  const target = ensureLeadingSlash(targetPath);
  const trackPath = `/api/line/track?mid=${messageId}&u=${encodeURIComponent(target)}`;
  return buildLiffPathUrl(trackPath);
}
