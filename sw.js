// sw.js  — Laughing All the Way
// Fresh HTML, cached assets, instant activate

const VERSION = 'latw-2025-11-06-1';
const CACHE_NAME = `latw-${VERSION}`;

// List everything that lives in the repo root and is used by index.html
// Add more files if you introduce external JS/CSS later
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './LATWlogo.png',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache core assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: clear old caches and take control immediately
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

// Fetch:
//  • HTML/navigation → network-first to avoid stale shells
//  • Everything else → cache-first, then network, then stash
self.addEventListener('fetch', event => {
  const req = event.request;
  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        // Try exact request, then fall back to cached index
        return (await cache.match(req)) || (await cache.match('./index.html'));
      }
    })());
    return;
  }

  // Non-HTML
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      if (req.method === 'GET' && resp.ok) {
        cache.put(req, resp.clone());
      }
      return resp;
    } catch {
      // As a last resort, return anything cached if present
      return cached || Response.error();
    }
  })());
});

// Optional: receive a message to skip waiting immediately
self.addEventListener('message', evt => {
  if (evt.data && (evt.data === 'SKIP_WAITING' || evt.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});
