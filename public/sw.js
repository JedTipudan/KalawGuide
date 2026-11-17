/*
 * KalawGuide service worker: makes the installed web app open without internet.
 *
 * - Pages: network first, so users always get the newest version when online (no stale app after
 *   a deploy); the last copy is used offline.
 * - Built files (/_expo/static/…, fonts, icons, images): their names change on every build, so
 *   they are served from the cache first and stored the first time they load.
 * - Other websites (Gemini, Turso, map tiles, Google) are never touched.
 */
const VERSION = 'kalawguide-v1';
const SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // App pages: every route is the same single-page app (index.html).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) caches.open(VERSION).then(c => c.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  if (url.pathname === '/sw.js') return;

  // Scripts, styles, fonts, images: cache first, then network (and remember it).
  event.respondWith(
    caches.match(req).then(hit =>
      hit ||
      fetch(req).then(res => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
