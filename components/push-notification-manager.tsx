'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/context';
import { subscribeToPush } from '@/lib/push/client';

/**
 * プッシュ通知自動購読コンポーネント
 * 店舗ダッシュボードにマウントするだけで自動的にService Worker登録＋購読を行う
 * UIは一切レンダリングしない
 */
export function PushNotificationManager() {
  const { store } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (!store?.id || attempted.current) return;
    attempted.current = true;

    subscribeToPush(store.id);
  }, [store?.id]);

  return null;
}
