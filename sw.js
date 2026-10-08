// sw.js - AppLaundry Final Clean A - PWA Offline Cache
const CACHE_NAME = 'applaundry-v3-final-clean-a-2026-05-13';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/components.css',
  './css/modals.css',
  './js/core/config.js',
  './js/core/supabase.js',
  './js/core/storage.js',
  './js/core/router.js',
  './js/core/app.js',
  './js/modules/ui.js',
  './js/modules/outlet.js',
  './js/modules/pelanggan.js',
  './js/modules/layanan.js',
  './js/modules/karyawan.js',
  './js/modules/antrian.js',
  './js/modules/nota-bayar.js',
  './js/modules/struk.js',
  './js/modules/laporan.js',
  './js/modules/backup.js',
  './js/modules/icons.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      });
    }).catch(()=>caches.match('./index.html'))
  );
});
