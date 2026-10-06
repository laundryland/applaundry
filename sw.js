const CACHE_NAME = 'laundryland-v24-fix-outlet-layanan-karyawan-sync';
self.addEventListener('install', e=>{
  self.skipWaiting();
  // Clear all old caches that contain multi-hp sync
  e.waitUntil(
    caches.keys().then(keys=>{
      return Promise.all(keys.map(key=>{
        if(key!==CACHE_NAME){
          return caches.delete(key);
        }
      }));
    })
  );
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>{
      return Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    }).then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET' || e.request.url.includes('supabase.co')) return;
  if(e.request.url.includes('index.html') || e.request.url.endsWith('/') || e.request.url.endsWith('/applaundry') || e.request.url.endsWith('/applaundry/')) return;
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
