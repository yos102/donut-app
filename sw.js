const CACHE = 'donut-guide-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './step1.jpg', './step2.jpg', './step3.jpg', './step4.jpg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Pages: network first (so updates show up), falling back to the saved copy offline.
// Everything else (images, Tailwind, fonts): saved copy first, filled in on first online load.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate' || /\/index\.html$/.test(new URL(e.request.url).pathname);
  if (isPage) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(function (list) {
    if (list.length) return list[0].focus();
    return self.clients.openWindow('./');
  }));
});
