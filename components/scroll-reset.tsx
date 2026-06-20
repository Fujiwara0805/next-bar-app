'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ルート遷移時にスクロール位置を先頭へ戻すグローバルコンポーネント。
 *
 * 【背景】
 * Next.js App Router は「遷移先ページが直前のスクロール位置より短い」場合などに
 * 自動スクロールリセットをスキップすることがある。そのため、縦に長い一覧
 * （例: 店舗一覧の最後のカード）までスクロールしてから店舗詳細や他画面へ遷移すると、
 * スクロールが先頭に戻らず画面全体が上にずれて表示される不具合が起きる。
 * モバイルでは body の min-height:100vh によるアドレスバー分の余白がズレを助長する。
 *
 * 【挙動】
 * - 前進ナビゲーション（リンク/router.push 等）: 先頭へスクロール。
 * - ブラウザの戻る/進む（popstate）: 履歴のスクロール位置復元を尊重し、何もしない。
 */
export function ScrollReset() {
  const pathname = usePathname();
  // 直近の遷移が「戻る/進む」かどうか。popstate を検知してフラグを立てる。
  const isPopNavigation = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      isPopNavigation.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (isPopNavigation.current) {
      // 戻る/進むはスクロール位置の復元に任せる
      isPopNavigation.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
