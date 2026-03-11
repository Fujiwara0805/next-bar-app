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
