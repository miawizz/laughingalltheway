// sw.js
const VERSION = '2025-11-05';
const CACHE_NAME = `latw-${VERSION}`;
const STATIC_ASSETS = [
  './',
  './index.html',
  './LATWlogo.png',
  './icon-192.png',
  './manifest.webmanifest'
  // Add other static assets here if you host CSS/JS as separate files
];

// Install: pre-cache core assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: clear old caches immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Fetch strategy:
// - HTML: network-first to avoid stale pages
// - Other: cache-first for speed, fall back to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const isHTML = request.mode === 'navigate' ||
                 (request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request, { cache: 'no-store' });
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, fresh.clone());
          return fresh;
        } catch (e) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          return cached || cache.match('./index.html');
        }
      })()
    );
    return;
  }

  // Non-HTML
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const resp = await fetch(request);
        // Cache GETs only
        if (request.method === 'GET' && resp.ok) {
          cache.put(request, resp.clone());
        }
        return resp;
      } catch (e) {
        return cached || Response.error();
      }
    })()
  );
});

// Optional: listen for a manual SKIP_WAITING trigger
self.addEventListener('message', evt => {
  if (evt.data === 'SKIP_WAITING') self.skipWaiting();
});
