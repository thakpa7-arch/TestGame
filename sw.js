// Service worker for offline play (e.g. iPhone "Add to Home Screen"). Pre-caches the game shell on
// install, then serves cache-first with runtime caching of same-origin GETs. The remote card art is
// cross-origin (images.weserv.nl) and isn't cached — offline, cards fall back to their text faces.
const CACHE = 'gundam-tcg-v53';
const SHELL = ['gundam-card-game.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      try {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
      } catch (err) { /* ignore */ }
      return res;
    }).catch(() => caches.match(req)))
  );
});
