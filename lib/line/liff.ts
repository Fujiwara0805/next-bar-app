// ============================================
// LIFF SDK 初期化シングルトン
// SSR安全な動的importでLIFF SDKをロード
// ============================================

import type { LineProfile } from './types';

type Liff = typeof import('@line/liff').default;

let liffInstance: Liff | null = null;
let liffInitPromise: Promise<Liff | null> | null = null;

/**
 * LIFF SDKを初期化して返す（シングルトン）
 * - SSR環境では null を返す
 * - LIFF IDが未設定の場合は null を返す
 * - 一度だけ初期化し、以降はキャッシュを返す
 */
export async function getLiff(): Promise<Liff | null> {
  // SSRガード
  if (typeof window === 'undefined') return null;

  // 環境変数ガード
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) return null;

  // 既に初期化済み
  if (liffInstance) return liffInstance;

  // 初期化中ならそのPromiseを返す（重複初期化防止）
  if (liffInitPromise) return liffInitPromise;

  liffInitPromise = (async () => {
    try {
      const liffModule = await import('@line/liff');
      const liff = liffModule.default;

      await liff.init({ liffId });
      liffInstance = liff;
      return liff;
    } catch (error) {
      console.error('[LIFF] 初期化エラー:', error);
      liffInitPromise = null; // 再試行可能にする
      return null;
    }
  })();

  return liffInitPromise;
}

/**
 * LINEアプリ内で動作しているかどうかを判定
 */
export async function isInLineClient(): Promise<boolean> {
  const liff = await getLiff();
  if (!liff) return false;
  return liff.isInClient();
}

/**
 * LINEにログイン済みかどうかを判定
 */
export async function isLineLoggedIn(): Promise<boolean> {
  const liff = await getLiff();
  if (!liff) return false;
  return liff.isLoggedIn();
}

/**
 * LINEプロフィールを取得
 */
export async function getLineProfile(): Promise<LineProfile | null> {
  const liff = await getLiff();
  if (!liff || !liff.isLoggedIn()) return null;

  try {
    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
  } catch (error) {
    console.error('[LIFF] プロフィール取得エラー:', error);
    return null;
  }
}

/**
 * LINE IDトークンを取得（サーバー側検証用）
 */
export async function getLineIdToken(): Promise<string | null> {
  const liff = await getLiff();
  if (!liff || !liff.isLoggedIn()) return null;

  try {
    return liff.getIDToken();
  } catch (error) {
    console.error('[LIFF] IDトークン取得エラー:', error);
    return null;
  }
}

/**
 * JWT id_token の exp を確認して期限切れかどうか判定する。
 * LIFF SDK はキャッシュされた id_token を返すため、期限切れを検出したら
 * logout → login でリフレッシュする必要がある。
 * 余裕を持って exp の 60 秒前で期限切れ扱いにする。
 */
export function isLineIdTokenExpired(idToken: string | null | undefined): boolean {
  if (!idToken) return true;
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(
      typeof atob === 'function'
        ? decodeURIComponent(
            atob(padded)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
        : Buffer.from(padded, 'base64').toString('utf8')
    );
    if (typeof payload.exp !== 'number') return true;
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp - nowSec < 60;
  } catch {
    return true;
  }
}

/**
 * 期限切れを考慮して id_token を取得。
 * 期限切れなら一度 logout → login させ、リダイレクト後に取り直す。
 * login はリダイレクトを発生させるため、この関数から戻らない場合がある。
 */
export async function getFreshLineIdToken(): Promise<string | null> {
  const liff = await getLiff();
  if (!liff) return null;

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    return null;
  }

  const token = (() => {
    try {
      return liff.getIDToken();
    } catch (err) {
      console.error('[LIFF] IDトークン取得エラー:', err);
      return null;
    }
  })();

  if (!token || isLineIdTokenExpired(token)) {
    try {
      liff.logout();
    } catch (err) {
      console.error('[LIFF] logout エラー:', err);
    }
    liff.login({ redirectUri: window.location.href });
    return null;
  }

  return token;
}

/**
 * LINEログインを実行
 * - LINEアプリ内ブラウザ: 多くの場合セッションがありスムーズ
 * - 通常ブラウザ: LINE の OAuth 画面へ飛ばす。未ログインだと **LINE 側** の
 *   サインイン（メール/パスワード等）が出る。これはアプリの認証ではなく
 *   LINE 株式会社の画面であり、**完全に省略することは原則できない**。
 *   スムーズにしたい場合はリッチメニュー等から LINE 内で LIFF を開く運用を検討する。
 *
 * @see https://developers.line.biz/ja/docs/liff/
 */
export async function lineLogin(): Promise<void> {
  const liff = await getLiff();
  if (!liff) return;

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
  }
}

/**
 * LINEログアウトを実行
 */
export async function lineLogout(): Promise<void> {
  const liff = await getLiff();
  if (!liff) return;

  if (liff.isLoggedIn()) {
    liff.logout();
  }
}
