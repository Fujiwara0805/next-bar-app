import { createHmac, timingSafeEqual } from 'crypto';

/**
 * 店舗QRコードのHMAC署名ユーティリティ
 *
 * QR URL形式: `${SITE_URL}/check-in?s={store_id}&sig={hmac}`
 *   sig = base64url( HMAC_SHA256(secret, store_id).slice(0, 16) )
 *
 * 静的URL（印刷して店舗に設置）+ 署名で改ざん耐性を持たせる。
 * secret は環境変数 QR_SIGNATURE_SECRET に格納。
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

export function signStoreId(storeId: string): string {
  const mac = createHmac('sha256', getSecret()).update(storeId).digest().subarray(0, SIG_BYTES);
  return toBase64Url(mac);
}

export function verifyStoreSignature(storeId: string, sig: string): boolean {
  try {
    const expected = createHmac('sha256', getSecret())
      .update(storeId)
      .digest()
      .subarray(0, SIG_BYTES);
    const given = fromBase64Url(sig);
    if (given.length !== expected.length) return false;
    return timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

export function buildCheckInUrl(baseUrl: string, storeId: string): string {
  const sig = signStoreId(storeId);
  const url = new URL('/check-in', baseUrl);
  url.searchParams.set('s', storeId);
  url.searchParams.set('sig', sig);
  return url.toString();
}
