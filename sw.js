const CACHE_NAME = 'laundry-land-v2.5.28';
const urlsToCache = [
  './',
  './index.html',
  './css/app.css',
  './js/config.js',
  './js/supabase.js',
  './js/db.js',
  './js/modules/header-home.js',
  './js/modules/master-pelanggan.js',
  './js/modules/print-thermal.js',
  './js/modules/wa-share.js',
  './original-body.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
