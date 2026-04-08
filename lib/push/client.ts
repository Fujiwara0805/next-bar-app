/**
 * クライアント側プッシュ通知購読ヘルパー（店舗向け）
 * Service Workerを登録し、プッシュ購読を作成してサーバーに保存する
 */
export async function subscribeToPush(storeId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn('VAPID public key not configured');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    // 既存の購読があればそのまま使う
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });
    }

    const subJson = subscription.toJSON();

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return false;
  }
}

/**
 * ユーザー向けプッシュ通知購読ヘルパー（空席通知用）
 * 位置情報とプッシュ購読を取得し、サーバーに保存する
 */
export async function subscribeUserToPush(
  latitude: number,
  longitude: number
): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn('VAPID public key not configured');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });
    }

    const subJson = subscription.toJSON();

    const response = await fetch('/api/push/subscribe-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        latitude,
        longitude,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('User push subscription failed:', error);
    return false;
  }
}
