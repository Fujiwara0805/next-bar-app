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
const STORE_ALLOWED_SEGMENTS = /^(update|edit|change-password|scan|broadcast|analytics|coupons|redeem)$/;

/** 未認証のとき: 店舗用URL想定なら /login/store へ、運営ダッシュボード等は /login/operator へ */
function loginUrlForUnauthenticatedStorePath(pathname: string, requestUrl: string) {
  const base = new URL(requestUrl);
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 4 && parts[0] === 'store' && parts[1] === 'manage') {
    return new URL('/login/store', base);
  }
  return new URL('/login/operator', base);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accountType = request.cookies.get('account-type')?.value;
  const storeId = request.cookies.get('store-id')?.value;

  // ── /store/manage/* の保護 ──
  if (pathname.startsWith('/store/manage')) {
    if (!accountType) {
      return NextResponse.redirect(loginUrlForUnauthenticatedStorePath(pathname, request.url));
    }

    if (accountType === 'customer') {
      // 顧客アカウントは /store/manage にアクセス不可
      return NextResponse.redirect(new URL('/landing', request.url));
    }

    if (accountType === 'store') {
      // 店舗アカウント: /store/manage/{storeId}/(update|edit|change-password) のみ許可
      const match = pathname.match(/^\/store\/manage\/([^/]+)\/([^/]+)$/);
      if (!match) {
        // /store/manage 直下やサブページなし → 自店舗のupdateにリダイレクト
        if (storeId) {
          return NextResponse.redirect(new URL(`/store/manage/${storeId}/update`, request.url));
        }
        return NextResponse.redirect(new URL('/login/store', request.url));
      }

      const [, pathStoreId, segment] = match;
      if (!STORE_ALLOWED_SEGMENTS.test(segment)) {
        // 許可外のセグメント → 自店舗のupdateへ
        if (storeId) {
          return NextResponse.redirect(new URL(`/store/manage/${storeId}/update`, request.url));
        }
        return NextResponse.redirect(new URL('/login/store', request.url));
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
      return NextResponse.redirect(new URL('/login/store', request.url));
    }
    return NextResponse.next();
  }

  // ── /login, /login/customer, /login/operator, /login/store, /register: ログイン済みなら適切なダッシュボードへ ──
  const isLoginPath =
    pathname === '/login' ||
    pathname === '/login/customer' ||
    pathname === '/login/operator' ||
    pathname === '/login/store';
  if (isLoginPath || pathname === '/register') {
    const redirectParam = request.nextUrl.searchParams.get('redirect');

    if (accountType === 'platform') {
      return NextResponse.redirect(new URL('/store/manage', request.url));
    }
    if (accountType === 'store' && storeId) {
      return NextResponse.redirect(new URL(`/store/manage/${storeId}/update`, request.url));
    }
    if (accountType === 'customer') {
      // redirect パラメータが同一オリジン相対パスの場合、ログイン画面を通してクライアント側で復帰させる
      if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
        return NextResponse.next();
      }
      // 顧客ログイン画面を明示的に開く場合は、ログアウトして再ログインするためのアクセスを許可する
      if (pathname === '/login/customer') {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/map', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/store/manage/:path*',
    '/profile/:path*',
    '/login',
    '/login/customer',
    '/login/operator',
    '/login/store',
    '/register',
  ],
};
