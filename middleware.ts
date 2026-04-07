import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * サーバーサイドのルート保護ミドルウェア
 *
 * クライアントサイドの auth context が設定する cookie を読み取り、
 * 未認証・権限不足のリクエストをログインページへリダイレクトする。
 * クライアントサイドの useAuth ガード (layout.tsx) と二重防御を形成する。
 */

/** 店舗アカウントがアクセス可能なセグメント */
const STORE_ALLOWED_SEGMENTS = /^(update|edit|change-password)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accountType = request.cookies.get('account-type')?.value;
  const storeId = request.cookies.get('store-id')?.value;

  // ── /store/manage/* の保護 ──
  if (pathname.startsWith('/store/manage')) {
    if (!accountType) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (accountType === 'store') {
      // 店舗アカウント: /store/manage/{storeId}/(update|edit|change-password) のみ許可
      const match = pathname.match(/^\/store\/manage\/([^/]+)\/([^/]+)$/);
      if (!match) {
        // /store/manage 直下やサブページなし → 自店舗のupdateにリダイレクト
        if (storeId) {
          return NextResponse.redirect(new URL(`/store/manage/${storeId}/update`, request.url));
        }
        return NextResponse.redirect(new URL('/login?role=store', request.url));
      }

      const [, pathStoreId, segment] = match;
      if (!STORE_ALLOWED_SEGMENTS.test(segment)) {
        // 許可外のセグメント → 自店舗のupdateへ
        if (storeId) {
          return NextResponse.redirect(new URL(`/store/manage/${storeId}/update`, request.url));
        }
        return NextResponse.redirect(new URL('/login?role=store', request.url));
      }

      if (storeId && pathStoreId !== storeId) {
        // 他店舗のページへのアクセス → 自店舗にリダイレクト
        return NextResponse.redirect(new URL(`/store/manage/${storeId}/${segment}`, request.url));
      }
    }

    // platform アカウントは全 /store/manage/* にアクセス可能 → 通過
    return NextResponse.next();
  }

  // ── /profile/* の保護 ──
  if (pathname.startsWith('/profile')) {
    if (!accountType) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (accountType === 'store') {
      // 店舗アカウントは profile ページにアクセス不可
      if (storeId) {
        return NextResponse.redirect(new URL(`/store/manage/${storeId}/update`, request.url));
      }
      return NextResponse.redirect(new URL('/login?role=store', request.url));
    }
    return NextResponse.next();
  }

  // ── /login, /register: ログイン済みなら適切なダッシュボードへ ──
  if (pathname === '/login' || pathname === '/register') {
    if (accountType === 'platform') {
      return NextResponse.redirect(new URL('/store/manage', request.url));
    }
    if (accountType === 'store' && storeId) {
      return NextResponse.redirect(new URL(`/store/manage/${storeId}/update`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/store/manage/:path*',
    '/profile/:path*',
    '/login',
    '/register',
  ],
};
