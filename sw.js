
const CACHE_NAME = 'laundry-land-v3.7-fix-x-final';
const urlsToCache = ['./','./index.html','./manifest.json','./favicon-32x32.png','./favicon-192x192.png','./favicon-512x512.png','./apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache)).then(()=>self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>{if(k!==CACHE_NAME) return caches.delete(k);}))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e => { if(e.request.url.includes('supabase.co')||e.request.url.includes('cdn.jsdelivr.net')||e.request.method!=='GET') return; e.respondWith(caches.match(e.request).then(r=> r||fetch(e.request).then(res=>{ if(!res||res.status!==200||res.type!=='basic') return res; const clone=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(e.request,clone)); return res; }))); });
