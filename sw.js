const CACHE = 'za-stromom';
const SHELL = ['./', 'index.html', 'privacy.html', 'manifest.webmanifest', 'css/game.css', 'js/ui/sounds.js', 'icons/icon-192.png', 'icons/icon-512.png'];

async function precache() {
  const cache = await caches.open(CACHE);
  const page = await fetch('index.html', { cache: 'no-cache' });
  const html = await page.clone().text();
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  await cache.addAll(SHELL.filter((u) => u !== 'index.html').concat(scripts));
  await cache.put('index.html', page);
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    (req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache' }) : fetch(req, { cache: 'no-cache' }))
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
