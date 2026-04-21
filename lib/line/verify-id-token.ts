// ============================================
// LIFF / LINE Login で取得した ID トークンの
// サーバー側検証（/oauth2/v2.1/verify を利用）
// ============================================
//
// LINEは ID トークンの検証用に専用エンドポイントを公開しており、
// JWKS を自前で扱うより信頼性・保守性が高い。
//
// Docs: https://developers.line.biz/ja/docs/line-login/verify-id-token/

export interface VerifiedLineIdToken {
  /** LINE userId (messaging API と同一) */
  sub: string;
  /** audience = Channel ID */
  aud: string;
  /** issued-at (unix seconds) */
  iat: number;
  /** expires-at (unix seconds) */
  exp: number;
  name?: string;
  picture?: string;
  email?: string;
}

const LINE_VERIFY_ENDPOINT = 'https://api.line.me/oauth2/v2.1/verify';

/**
 * LIFF / LINE Login の id_token を検証する。
 * 成功時は payload を、失敗時は例外を投げる。
 *
 * 必要な環境変数:
 *   - LINE_LOGIN_CHANNEL_ID: LIFFをホストしているLoginチャネルID（LIFF IDの前半ではない、OIDCのclient_id）
 *     未設定の場合は NEXT_PUBLIC_LIFF_ID の先頭部（channelId部）を fallback に使う。
 */
export async function verifyLineIdToken(idToken: string): Promise<VerifiedLineIdToken> {
  if (!idToken) {
    throw new Error('id_token is empty');
  }

  const channelId =
    process.env.LINE_LOGIN_CHANNEL_ID ||
    extractChannelIdFromLiffId(process.env.NEXT_PUBLIC_LIFF_ID);

  if (!channelId) {
    throw new Error(
      'LINE_LOGIN_CHANNEL_ID is not configured (and NEXT_PUBLIC_LIFF_ID fallback unavailable)'
    );
  }

  const body = new URLSearchParams({
    id_token: idToken,
    client_id: channelId,
  });

  const res = await fetch(LINE_VERIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LINE verify failed: ${res.status} ${text}`);
  }

  const payload = (await res.json()) as VerifiedLineIdToken & { error?: string };

  if (!payload.sub || !payload.aud) {
    throw new Error('LINE verify returned invalid payload');
  }

  if (payload.aud !== channelId) {
    throw new Error('LINE id_token audience mismatch');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    throw new Error('LINE id_token expired');
  }

  return payload;
}

/**
 * LIFF ID (`<channelId>-<liffSuffix>`) から前半の channelId を抜き出す。
 * LIFFチャネルとLoginチャネルが同一プロバイダ配下で設定されている場合、
 * LIFF IDの先頭部（ハイフン前）は Login チャネルIDと一致することがあるため
 * フォールバックとして利用する。本番では `LINE_LOGIN_CHANNEL_ID` を明示推奨。
 */
function extractChannelIdFromLiffId(liffId: string | undefined): string | null {
  if (!liffId) return null;
  const dashIdx = liffId.indexOf('-');
  if (dashIdx <= 0) return null;
  const prefix = liffId.slice(0, dashIdx);
  return /^\d+$/.test(prefix) ? prefix : null;
}
