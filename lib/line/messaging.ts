// ============================================
// LINE Messaging API (OA push) 薄ラッパー
// ============================================
//
// 共通LINE OAから友だち登録済みユーザーへのメッセージ送信を担う。
// 設定が未投入の環境でも import 時にエラーにならないよう、
// 実送信時に初回チェックする方針。
//
// Docs: https://developers.line.biz/ja/reference/messaging-api/

import { messagingApi, validateSignature } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

export type LineTextMessage = messagingApi.TextMessage;
export type LineFlexMessage = messagingApi.FlexMessage;
export type LineMessage = messagingApi.Message;

type PushResult = {
  requested: number;
  delivered: number;
  failed: number;
  errors: string[];
};

function getChannelAccessToken(): string | null {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? null;
}

function getChannelSecret(): string | null {
  return process.env.LINE_CHANNEL_SECRET ?? null;
}

export function isMessagingConfigured(): boolean {
  return !!getChannelAccessToken() && !!getChannelSecret();
}

function buildClient(): InstanceType<typeof MessagingApiClient> {
  const token = getChannelAccessToken();
  if (!token) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
  }
  return new MessagingApiClient({ channelAccessToken: token });
}

/**
 * 1人に push。
 * 失敗しても例外は投げず、結果を返す（呼び出し側でログ/集計しやすいように）。
 */
export async function pushToUser(
  lineUserId: string,
  messages: LineMessage[]
): Promise<PushResult> {
  if (!isMessagingConfigured()) {
    return {
      requested: 1,
      delivered: 0,
      failed: 1,
      errors: ['messaging_not_configured'],
    };
  }
  try {
    const client = buildClient();
    await client.pushMessage({ to: lineUserId, messages });
    return { requested: 1, delivered: 1, failed: 0, errors: [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error';
    return { requested: 1, delivered: 0, failed: 1, errors: [msg] };
  }
}

/**
 * 最大500人まで一括push（multicast）。500超は自動で分割する。
 */
export async function multicast(
  lineUserIds: string[],
  messages: LineMessage[]
): Promise<PushResult> {
  const unique = Array.from(new Set(lineUserIds.filter(Boolean)));
  const result: PushResult = {
    requested: unique.length,
    delivered: 0,
    failed: 0,
    errors: [],
  };
  if (unique.length === 0) return result;
  if (!isMessagingConfigured()) {
    result.failed = unique.length;
    result.errors.push('messaging_not_configured');
    return result;
  }
  const client = buildClient();
  const CHUNK = 500;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    try {
      await client.multicast({ to: chunk, messages });
      result.delivered += chunk.length;
    } catch (err) {
      result.failed += chunk.length;
      result.errors.push(err instanceof Error ? err.message : 'unknown_error');
    }
  }
  return result;
}

/**
 * 2点間距離（km, Haversine）
 */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 近傍フィルタ用の購読者行の最小形。Phase 4で notify_center_* 列が追加済み。 */
export type NearbyCandidate = {
  line_user_id: string;
  latest_latitude: number | null;
  latest_longitude: number | null;
  notify_center_latitude?: number | null;
  notify_center_longitude?: number | null;
  vacancy_notify_opt_in: boolean;
  vacancy_notify_radius_km: number | null;
  unfollowed_at: string | null;
  last_vacancy_sent_at?: string | null;
  daily_notify_count?: number;
  daily_notify_date?: string | null;
};

/** 1ユーザーが LINE OA から1日に受け取れる通知の上限（vacancy + broadcast 共通） */
export const DAILY_NOTIFY_CAP = 5;

/** Asia/Tokyo の今日（YYYY-MM-DD）を返す。DBの date 列と直接比較できる形式。 */
export function todayJst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
}

/** ユーザー指定の通知拠点があれば優先、なければ最新共有位置を使う */
function pickNotifyCoord(c: NearbyCandidate): { lat: number; lng: number } | null {
  const lat = c.notify_center_latitude ?? c.latest_latitude;
  const lng = c.notify_center_longitude ?? c.latest_longitude;
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

/**
 * 店舗位置を中心に、OA友だちのうち通知拠点（または位置共有）が指定半径内 & 通知ON のユーザーを抽出する。
 * （broadcast "nearby" ターゲット用。スロットルは適用しない）
 */
export function filterNearbySubscribers(
  subscribers: NearbyCandidate[],
  storeLat: number,
  storeLng: number,
  defaultRadiusKm: number
): string[] {
  return subscribers
    .filter((s) => s.unfollowed_at === null && s.vacancy_notify_opt_in)
    .filter((s) => {
      const coord = pickNotifyCoord(s);
      if (!coord) return false;
      const radius = s.vacancy_notify_radius_km ?? defaultRadiusKm;
      return distanceKm(storeLat, storeLng, coord.lat, coord.lng) <= radius;
    })
    .map((s) => s.line_user_id);
}

/**
 * 空席通知向けのターゲット抽出。近傍フィルタに加え、
 *  - 直近 throttleHours 時間以内に同一ユーザーへ通知を送っていない
 *  - JST の当日通知数が dailyCap 未満
 * を条件にする。
 */
export function filterVacancyTargets(
  subscribers: NearbyCandidate[],
  storeLat: number,
  storeLng: number,
  defaultRadiusKm: number,
  throttleHours: number,
  dailyCap: number = DAILY_NOTIFY_CAP
): string[] {
  const threshold = Date.now() - throttleHours * 60 * 60 * 1000;
  const today = todayJst();
  return subscribers
    .filter((s) => s.unfollowed_at === null && s.vacancy_notify_opt_in)
    .filter((s) => {
      if (!s.last_vacancy_sent_at) return true;
      const ts = new Date(s.last_vacancy_sent_at).getTime();
      if (Number.isNaN(ts)) return true;
      return ts <= threshold;
    })
    .filter((s) => {
      // JSTの「今日」と一致する日付のカウンタのみ有効。日付が違う/NULLなら 0 扱い。
      if (s.daily_notify_date !== today) return true;
      return (s.daily_notify_count ?? 0) < dailyCap;
    })
    .filter((s) => {
      const coord = pickNotifyCoord(s);
      if (!coord) return false;
      const radius = s.vacancy_notify_radius_km ?? defaultRadiusKm;
      return distanceKm(storeLat, storeLng, coord.lat, coord.lng) <= radius;
    })
    .map((s) => s.line_user_id);
}

/**
 * Webhook署名検証。`X-Line-Signature` ヘッダと raw body を照合。
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = getChannelSecret();
  if (!secret) return false;
  try {
    return validateSignature(rawBody, secret, signature);
  } catch {
    return false;
  }
}
