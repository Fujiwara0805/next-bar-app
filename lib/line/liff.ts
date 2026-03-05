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
 * LINEログインを実行
 * - LINE内: 自動的にログイン済み
 * - ブラウザ: LINEログイン画面にリダイレクト
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
