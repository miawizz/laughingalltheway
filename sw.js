// sw.js (SAFE MODE - TEMPORARY)
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  // Always go to network; fall back to whatever the browser has if offline
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
