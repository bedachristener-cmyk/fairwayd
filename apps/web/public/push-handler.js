/* Fairwayd push events loaded by the existing Workbox-generated service worker.
 * Payloads intentionally contain no private trip item details.
 */
/* global self */
self.addEventListener('push', function (event) {
  var payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_error) {
    payload = {};
  }
  var title = typeof payload.title === 'string' && payload.title.length <= 120
    ? payload.title : 'Fairwayd';
  var rawPath = typeof payload.path === 'string' ? payload.path : '/trips';
  // Navigation is same-origin and restricted to trip routes.
  var path = /^\/trips(?:\/|$)/.test(rawPath) && !rawPath.startsWith('//')
    ? rawPath : '/trips';
  event.waitUntil(self.registration.showNotification(title, {
    body: 'There is an update to one of your trips.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 100) : 'fairwayd-trip',
    data: { path: path },
  }));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var path = event.notification.data && event.notification.data.path || '/trips';
  var url = new URL(path, self.location.origin);
  if (url.origin !== self.location.origin || !/^\/trips(?:\/|$)/.test(url.pathname)) {
    url = new URL('/trips', self.location.origin);
  }
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url === url.href && 'focus' in clients[i]) return clients[i].focus();
      }
      return self.clients.openWindow(url.href);
    }));
});
