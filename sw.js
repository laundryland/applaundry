const CACHE_NAME = 'laundryland-v12-deposito-aman';
self.addEventListener('install', e=>{
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET' || e.request.url.includes('supabase.co')) return;
  e.respondWith(
    fetch(e.request).then(r=>{
      // Jangan cache index.html biar selalu fresh
      if(e.request.url.includes('index.html') || e.request.url.endsWith('/') || e.request.url.endsWith('/applaundry/')){
        return r;
      }
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
  );
});
