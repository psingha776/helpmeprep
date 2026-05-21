/* ============================================================
   service-worker.js — offline cache for the Study Hub.
   Strategy: cache-first for same-origin GETs; network-first
   fallback on miss; ignore everything cross-origin (fonts CDN).
   Bump CACHE_VER on any asset change to force re-cache.
   ============================================================ */
const CACHE_VER='hmp-v1';
const CORE=['./','./index.html','./styles.css','./quizlib.js','./mocklib.js','./nav.js','./theme.js'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE_VER).then(c=>c.addAll(CORE).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_VER).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  e.respondWith(
    caches.match(e.request).then(hit=>{
      if(hit)return hit;
      return fetch(e.request).then(r=>{
        if(r.ok){const copy=r.clone();caches.open(CACHE_VER).then(c=>c.put(e.request,copy));}
        return r;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
