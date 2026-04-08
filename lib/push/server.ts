import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:info@nikenme.jp',
    vapidPublicKey,
    vapidPrivateKey
  );
}

/**
 * 店舗にプッシュ通知を送信する
 * fire-and-forget で使用可能（awaitしなくてもOK）
 */
export async function sendPushToStore(
  storeId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification');
    return;
  }

  try {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('store_id', storeId);

    if (!subscriptions?.length) return;

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      )
    );

    // 期限切れサブスクリプションを自動削除（410 Gone）
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (
        result.status === 'rejected' &&
        (result.reason as { statusCode?: number })?.statusCode === 410
      ) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscriptions[i].endpoint);
      }
    }
  } catch (error) {
    console.error('Push notification error:', error);
  }
}

/**
 * Haversine距離計算（km）
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 店舗の近くにいるユーザーにプッシュ通知を送信する
 * fire-and-forget で使用可能（awaitしなくてもOK）
 */
export async function sendPushToNearbyUsers(
  storeLat: number,
  storeLng: number,
  payload: { title: string; body: string; url?: string; tag?: string },
  radiusKm: number = 1.0
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification');
    return;
  }

  try {
    // バウンディングボックスで粗フィルタ（SQLレベル）
    const latDelta = radiusKm / 111.0;
    const lngDelta = radiusKm / (111.0 * Math.cos(storeLat * Math.PI / 180));

    const { data: subscriptions } = await supabase
      .from('user_push_subscriptions')
      .select('endpoint, p256dh, auth, latitude, longitude')
      .gte('latitude', storeLat - latDelta)
      .lte('latitude', storeLat + latDelta)
      .gte('longitude', storeLng - lngDelta)
      .lte('longitude', storeLng + lngDelta);

    if (!subscriptions?.length) return;

    // Haversineで精密フィルタ（JSレベル）
    const nearby = subscriptions.filter(
      (sub) => haversineDistance(storeLat, storeLng, sub.latitude, sub.longitude) <= radiusKm
    );

    if (!nearby.length) return;

    const results = await Promise.allSettled(
      nearby.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      )
    );

    // 期限切れサブスクリプションを自動削除（410 Gone）
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (
        result.status === 'rejected' &&
        (result.reason as { statusCode?: number })?.statusCode === 410
      ) {
        await supabase
          .from('user_push_subscriptions')
          .delete()
          .eq('endpoint', nearby[i].endpoint);
      }
    }

    console.log(`Sent vacancy push to ${nearby.length} nearby users`);
  } catch (error) {
    console.error('Nearby user push notification error:', error);
  }
}
