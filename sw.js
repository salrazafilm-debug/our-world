/* Network-first service worker: always tries the live site so updates arrive at
   once, and falls back to the last copy when offline. Only touches this site's
   own files; Supabase and fonts go straight to the network. */
const CACHE = 'our-world-v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'vendor/supabase.js', 'manifest.webmanifest', 'icon-192.png'])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./')))
  );
});
