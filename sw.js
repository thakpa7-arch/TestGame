// Service worker for offline play (e.g. iPhone "Add to Home Screen"). The game shell (HTML) is served
// NETWORK-FIRST so code updates land immediately when online, falling back to cache only when offline;
// other assets stay cache-first. The remote card art is cross-origin (images.weserv.nl) and isn't
// cached — offline, cards fall back to their text faces.
const CACHE = 'gundam-tcg-v83';
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
  let sameOrigin = false, path = '';
  try { const u = new URL(req.url); sameOrigin = u.origin === self.location.origin; path = u.pathname; } catch (err) { /* ignore */ }
  const isDoc = req.mode === 'navigate' || req.destination === 'document' || path.endsWith('.html');

  // Network-first for the game shell: always try the network so the newest code wins; on failure
  // (offline) serve the cached copy so the game still runs.
  if (isDoc && sameOrigin) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('gundam-card-game.html')))
    );
    return;
  }

  // Cache-first for everything else (icons, manifest, static assets).
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      try {
        if (res && res.ok && sameOrigin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
      } catch (err) { /* ignore */ }
      return res;
    }).catch(() => caches.match(req)))
  );
});
