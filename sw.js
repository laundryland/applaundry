// sw.js - FINAL CLEAN A - VERSION BUMP TO CLEAR CACHE
const CACHE_NAME = 'laundry-final-clean-A-v999';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/core/app.js',
  '/js/core/config-v2.js',
  '/js/core/supabase.js'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing v999 - clearing old cache');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating v999 - deleting old caches');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if(cacheName !== CACHE_NAME){
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // NEVER cache config and supabase - always fetch fresh
  if(event.request.url.includes('config') || event.request.url.includes('supabase')){
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
