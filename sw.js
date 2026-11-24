// GRUMPSTONE service worker – rychlý a offline start, automatické aktualizace.
// Jádro (HTML/JS/CSS) = network-first (nová verze hned, offline z cache); obrázky = cache-first s obnovou na pozadí.
const VERSION = 'v20261124-194734';
const CORE = 'grump-core-' + VERSION, IMG = 'grump-img-v1';
const CORE_FILES = ['./', 'index.html', 'style.css', 'peerjs.min.js', 'net_config.js', 'pwa.js', 'places.js', 'npc.js', 'items.js', 'combat_data.js', 'combat.js', 'game.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/favicon-32.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CORE).then(c => c.addAll(CORE_FILES.map(u => new Request(u, { cache: 'reload' })))).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('grump-core-') && k !== CORE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (/\/assets\/|\/icons\//.test(u.pathname)) {
    e.respondWith(caches.open(IMG).then(async c => { const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net; }));
    return;
  }
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { if (res.ok) caches.open(CORE).then(c => c.put(r, res.clone())); return res; })
    .catch(async () => (await caches.match(r, { ignoreSearch: true })) || (r.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});
