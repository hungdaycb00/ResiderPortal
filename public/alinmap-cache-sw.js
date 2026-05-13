const CACHE_NAME = 'alinmap-openfreemap-v1';
const MAP_HOSTS = new Set(['tiles.openfreemap.org']);

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith('alinmap-openfreemap-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!MAP_HOSTS.has(url.hostname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const network = fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response.clone()).catch(() => undefined);
        }
        return response;
      })
      .catch(() => cached);

    return cached || network;
  })());
});
