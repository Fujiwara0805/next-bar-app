// ============================================
// lib/line-harness/client.ts
//
// NIKENME+ ⇄ LINE Harness 連携のための軽量クライアント。
//
// 設計方針:
//   - 環境変数 (LINE_HARNESS_WEBHOOK_URL / LINE_HARNESS_API_BASE / LINE_HARNESS_API_TOKEN) が
//     未設定なら全関数が即座に { ok: false, skipped: 'not_configured' } を返し、
//     既存挙動を一切壊さない。
//   - 通信はファイア&フォーゲット用途を想定。失敗は warn ログのみで本処理を止めない。
//   - LINE Harness 側の REST API は SDK ドキュメント参照。エンドポイントは段階的に確定する。
//
// ============================================

const TIMEOUT_MS = 4000;

function getWebhookUrl(): string | null {
  return process.env.LINE_HARNESS_WEBHOOK_URL ?? null;
}

function getApiBase(): string | null {
  return process.env.LINE_HARNESS_API_BASE ?? null;
}

function getApiToken(): string | null {
  return process.env.LINE_HARNESS_API_TOKEN ?? null;
}

export function isLineHarnessConfigured(): boolean {
  return !!getApiBase() && !!getApiToken();
}

export function isLineHarnessForwardingConfigured(): boolean {
  return !!getWebhookUrl() && !!getApiToken();
}

type Result = { ok: boolean; status?: number; skipped?: string; error?: string };

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * LINE Platform から受け取った Webhook イベントを LINE Harness にミラー転送する。
 * 主に follow / unfollow / message を LINE Harness 内の友だち管理に反映するための経路。
 * 失敗しても呼び元の処理は継続させたいため、必ず success の結果オブジェクトを返す。
 */
export async function forwardWebhookEvent(rawBody: string): Promise<Result> {
  const url = getWebhookUrl();
  const token = getApiToken();
  if (!url || !token) {
    return { ok: false, skipped: 'not_configured' };
  }
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-nikenme-source': 'webhook-forward',
      },
      body: rawBody,
    });
    if (!res.ok) {
      console.warn('[line-harness] forward webhook failed', res.status);
      return { ok: false, status: res.status, error: 'http_error' };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.warn(
      '[line-harness] forward webhook exception',
      err instanceof Error ? err.message : err
    );
    return { ok: false, error: 'fetch_failed' };
  }
}

/**
 * 指定 lineUserId にタグを付与する。
 * 来店時 / クーポン受領時 / 消込時 などのトリガーで呼び出す。
 */
export async function assignTag(lineUserId: string, tag: string): Promise<Result> {
  const base = getApiBase();
  const token = getApiToken();
  if (!base || !token) {
    return { ok: false, skipped: 'not_configured' };
  }
  try {
    const res = await fetchWithTimeout(`${base}/friends/${encodeURIComponent(lineUserId)}/tags`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tag }),
    });
    if (!res.ok) {
      console.warn('[line-harness] assignTag failed', res.status, tag);
      return { ok: false, status: res.status, error: 'http_error' };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.warn(
      '[line-harness] assignTag exception',
      err instanceof Error ? err.message : err
    );
    return { ok: false, error: 'fetch_failed' };
  }
}

/**
 * 指定 lineUserId からタグを削除する。
 */
export async function removeTag(lineUserId: string, tag: string): Promise<Result> {
  const base = getApiBase();
  const token = getApiToken();
  if (!base || !token) {
    return { ok: false, skipped: 'not_configured' };
  }
  try {
    const res = await fetchWithTimeout(
      `${base}/friends/${encodeURIComponent(lineUserId)}/tags/${encodeURIComponent(tag)}`,
      {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );
    if (!res.ok) {
      console.warn('[line-harness] removeTag failed', res.status, tag);
      return { ok: false, status: res.status, error: 'http_error' };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.warn(
      '[line-harness] removeTag exception',
      err instanceof Error ? err.message : err
    );
    return { ok: false, error: 'fetch_failed' };
  }
}

/**
 * メタデータを書き込む (例: first_visit_at, last_visit_at, etc.)
 */
export async function setMetadata(
  lineUserId: string,
  key: string,
  value: string | number | boolean | null
): Promise<Result> {
  const base = getApiBase();
  const token = getApiToken();
  if (!base || !token) {
    return { ok: false, skipped: 'not_configured' };
  }
  try {
    const res = await fetchWithTimeout(
      `${base}/friends/${encodeURIComponent(lineUserId)}/metadata`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: value }),
      }
    );
    if (!res.ok) {
      console.warn('[line-harness] setMetadata failed', res.status, key);
      return { ok: false, status: res.status, error: 'http_error' };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    console.warn(
      '[line-harness] setMetadata exception',
      err instanceof Error ? err.message : err
    );
    return { ok: false, error: 'fetch_failed' };
  }
}
