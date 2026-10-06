
const CACHE_NAME = 'laundryland-v8';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k!==CACHE_NAME ? caches.delete(k) : null)))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      return resp || fetch(event.request).then(r => {
        // cache html only
        if(event.request.url.includes('index.html') || event.request.url.endsWith('/')){
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, r.clone()));
        }
        return r;
      });
    }).catch(()=> caches.match('./index.html'))
  );
});
