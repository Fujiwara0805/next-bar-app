// ============================================
// Twilio Webhook 署名検証ユーティリティ
//
// Twilio は各 Webhook リクエストに `X-Twilio-Signature` を付与する。
// 署名は「Twilio が叩いた完全なURL（クエリ含む） + POSTパラメータ（キー昇順連結）」を
// Auth Token を鍵に HMAC-SHA1 したもの。これを検証することで、
// 第三者が IVR 応答（予約の承認/拒否）を偽造することを防ぐ。
//
// 署名URLは、発信側 (`/api/reservations/request`) が Twilio に渡した
// コールバックURL（`NEXT_PUBLIC_APP_URL` 起点）と完全一致させる必要があるため、
// プロキシ経由でホストが書き換わる `request.url` ではなく
// `NEXT_PUBLIC_APP_URL` + pathname + search で再構成する。
// ============================================

import twilio from 'twilio';
import type { NextRequest } from 'next/server';

/**
 * Twilio が署名に用いた完全なURLを再構成する。
 * 例: https://app.example.com/api/twilio/ivr-response?reservationId=xxx
 */
function reconstructTwilioUrl(request: NextRequest): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const { pathname, search } = request.nextUrl;
  if (base) {
    // 末尾スラッシュを除去して結合（base に path が含まれない前提）
    return `${base.replace(/\/+$/, '')}${pathname}${search}`;
  }
  // フォールバック: リクエストURL（プロキシ環境では不一致の可能性あり）
  return request.url;
}

/**
 * Twilio 署名を検証する。
 *
 * @returns 検証結果と、消費済みの form パラメータ（呼び出し側で再利用するため返す）
 *
 * - `TWILIO_AUTH_TOKEN` 未設定時は検証不能のため `ok: false`（fail-closed）。
 * - 署名ヘッダ欠落・不一致は `ok: false`。
 */
export async function verifyTwilioRequest(
  request: NextRequest
): Promise<
  | { ok: true; params: Record<string, string> }
  | { ok: false; reason: 'no_token' | 'no_signature' | 'invalid_signature' | 'parse_error'; params: Record<string, string> }
> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // POSTボディ（application/x-www-form-urlencoded）をパラメータへ変換。
  // 一度しか読めないため、結果を呼び出し側へ返して再利用させる。
  let params: Record<string, string> = {};
  try {
    const form = await request.formData();
    form.forEach((value, key) => {
      params[key] = typeof value === 'string' ? value : '';
    });
  } catch {
    // ボディ無し（GET等）の場合は空のまま検証へ進む
    params = {};
  }

  if (!authToken) {
    return { ok: false, reason: 'no_token', params };
  }

  const signature = request.headers.get('x-twilio-signature');
  if (!signature) {
    return { ok: false, reason: 'no_signature', params };
  }

  const url = reconstructTwilioUrl(request);
  const valid = twilio.validateRequest(authToken, signature, url, params);
  if (!valid) {
    return { ok: false, reason: 'invalid_signature', params };
  }

  return { ok: true, params };
}
