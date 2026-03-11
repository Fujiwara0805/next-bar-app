// NIKENME+ Push Notification Service Worker

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'NIKENME+';
  const options = {
    body: data.body || '',
    icon: 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,c_scale,w_192/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
    badge: 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,c_scale,w_48/v1761355092/%E3%82%B5%E3%83%BC%E3%83%93%E3%82%B9%E3%82%A2%E3%82%A4%E3%82%B3%E3%83%B3_dggltf.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    tag: data.tag || 'nikenme-notification',
  };
  event.waitUntil(
    self.registration.showNotification(title, options).then(function() {
      // バッジカウントを更新（未読通知数をアプリアイコンに表示）
      if (navigator.setAppBadge) {
        return self.registration.getNotifications().then(function(notifications) {
          return navigator.setAppBadge(notifications.length);
        });
      }
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    // バッジカウントを減らしてから画面を開く
    self.registration.getNotifications().then(function(notifications) {
      if (navigator.setAppBadge) {
        if (notifications.length > 0) {
          navigator.setAppBadge(notifications.length);
        } else {
          navigator.clearAppBadge();
        }
      }
    }).then(function() {
      return clients.matchAll({ type: 'window', includeUncontrolled: true });
    }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
