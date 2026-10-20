const CACHE_NAME="nota-ls-supa-exact-v16-uang-hadir-susulan";
const ASSETS=["./","./index.html","./supabase.js","./manifest.json"];
self.addEventListener("install",e=>{self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS).catch(()=>{})))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{ const u=new URL(e.request.url); if(u.hostname.includes("supabase.co")) return; if(e.request.mode==="navigate"){ e.respondWith(fetch(e.request).then(r=>{ const c=r.clone(); caches.open(CACHE_NAME).then(ca=>ca.put(e.request,c)); return r; }).catch(()=>caches.match("./index.html"))); return; } e.respondWith(caches.match(e.request).then(ch=>ch||fetch(e.request).then(r=>{ if(r.ok && e.request.method==="GET"){ const cl=r.clone(); caches.open(CACHE_NAME).then(ca=>ca.put(e.request,cl)); } return r; }))); });
