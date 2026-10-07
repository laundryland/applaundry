const CACHE_NAME = 'laundry-land-v2.5.28-fix5';
const urlsToCache = [
  './',
  './index.html',
  './css/app.css',
  './js/config.js',
  './js/supabase.js',
  './js/db.js',
  './original-body.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // cache addAll fails if 1 file 404, so add one by one safe
        return Promise.allSettled(urlsToCache.map(url => cache.add(url).catch(e=>console.warn('cache fail', url))));
      })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request).catch(()=>caches.match('./index.html')))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n))))
  );
  self.clients.claim();
});
