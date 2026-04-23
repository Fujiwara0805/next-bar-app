import { createHmac, timingSafeEqual } from 'crypto';

/**
 * QR署名ユーティリティ（Phase 11 以降: 顧客マイページQR方式）
 *
 * QR URL形式: `${SITE_URL}/c?u={userId}&t={unixSec}&s={hmac16B_b64url}`
 *   s = base64url( HMAC_SHA256(secret, `${userId}|${unixSec}`).slice(0, 16) )
 *
 * 顧客がマイページでQRを表示、店舗スタッフがスキャンする。
 * `t` を含めてローテートすることでスクショ使い回しを抑止。
 * secret は環境変数 QR_SIGNATURE_SECRET（32文字以上）に格納。
 */

const SIG_BYTES = 16;

function getSecret(): string {
  const secret = process.env.QR_SIGNATURE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('QR_SIGNATURE_SECRET must be set (min 32 chars)');
  }
  return secret;
}

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export type CustomerCheckInPayload = { u: string; t: number; s: string };

function signCustomerPayload(userId: string, unixSec: number): string {
  const mac = createHmac('sha256', getSecret())
    .update(`${userId}|${unixSec}`)
    .digest()
    .subarray(0, SIG_BYTES);
  return toBase64Url(mac);
}

export function buildCustomerCheckInToken(
  userId: string,
  nowMs: number = Date.now()
): CustomerCheckInPayload {
  const t = Math.floor(nowMs / 1000);
  const s = signCustomerPayload(userId, t);
  return { u: userId, t, s };
}

export function buildCustomerCheckInUrl(
  baseUrl: string,
  userId: string,
  nowMs: number = Date.now()
): string {
  const { u, t, s } = buildCustomerCheckInToken(userId, nowMs);
  const url = new URL('/c', baseUrl);
  url.searchParams.set('u', u);
  url.searchParams.set('t', String(t));
  url.searchParams.set('s', s);
  return url.toString();
}

export type VerifyCustomerResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'expired' };

export function verifyCustomerCheckInToken(
  payload: CustomerCheckInPayload,
  maxAgeSec = 180,
  nowMs: number = Date.now()
): VerifyCustomerResult {
  try {
    const expected = createHmac('sha256', getSecret())
      .update(`${payload.u}|${payload.t}`)
      .digest()
      .subarray(0, SIG_BYTES);
    const given = fromBase64Url(payload.s);
    if (given.length !== expected.length) {
      return { ok: false, reason: 'invalid' };
    }
    if (!timingSafeEqual(expected, given)) {
      return { ok: false, reason: 'invalid' };
    }
    const nowSec = Math.floor(nowMs / 1000);
    const age = nowSec - payload.t;
    // 端末時計のずれを最大 30s まで許容、それ以上未来のトークンは不正扱い
    if (age < -30) return { ok: false, reason: 'invalid' };
    if (age > maxAgeSec) return { ok: false, reason: 'expired' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

export function parseCustomerCheckInPayload(
  raw: unknown
): CustomerCheckInPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const u = typeof r.u === 'string' ? r.u : null;
  const s = typeof r.s === 'string' ? r.s : null;
  const t =
    typeof r.t === 'number'
      ? r.t
      : typeof r.t === 'string' && /^\d+$/.test(r.t)
      ? Number(r.t)
      : null;
  if (!u || !s || t === null) return null;
  return { u, t, s };
}
