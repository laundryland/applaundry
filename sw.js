// sw.js - Applaundry PWA Service Worker - auto version upgrade
const CACHE_NAME = 'applaundry-v2.5.28-PELANGGAN-2ROW-ICONS-20241009';
const ASSETS_TO_CACHE = [
  '/',
  '/FIX-ALL-SETTING.html',
  '/manifest.json',
  '/favicon-32x32.png',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/logo.png'
];

// Install - cache new version
self.addEventListener('install', event => {
  console.log('[SW] Install', CACHE_NAME);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('[SW] Cache addAll fail, cache partial', err);
      });
    })
  );
});

// Activate - delete old caches -> auto upgrade when html baru push
self.addEventListener('activate', event => {
  console.log('[SW] Activate', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key.startsWith('applaundry-')).map(key => {
          console.log('[SW] Delete old cache', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - network first for HTML (biar selalu dapat html baru), cache first untuk asset
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  
  // Jangan cache supabase & vercel analytics
  if (url.hostname.includes('supabase.co') || url.hostname.includes('vercel')) {
    return;
  }
  
  // HTML - network first
  if (req.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('/FIX-ALL-SETTING.html')))
    );
    return;
  }
  
  // Asset - cache first
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});
