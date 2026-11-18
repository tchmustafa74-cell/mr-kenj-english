// Offline support: cache the app shell and successful font files, serve network-first so updates show up.
const CACHE='mr-kenj-v8';
const FILES=['./','index.html','manifest.json','icon.svg','icon-192.png','icon-512.png','icon-maskable.png'];
const FONT_ORIGINS=['https://fonts.googleapis.com','https://fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))));
  self.clients.claim();
});

function canCache(request, response){
  if(!response || !response.ok) return false;
  if(response.type!=='basic' && response.type!=='cors') return false;
  const url=new URL(request.url);
  if(url.origin===self.location.origin) return true;
  return FONT_ORIGINS.includes(url.origin);
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith((async()=>{
    try{
      const response=await fetch(e.request);
      if(canCache(e.request, response)){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(e.request, copy)).catch(()=>{});
      }
      return response;
    }catch(err){
      const cached=await caches.match(e.request);
      if(cached) return cached;
      const accept=e.request.headers.get('accept')||'';
      if(e.request.mode==='navigate' || accept.includes('text/html')){
        return (await caches.match('./')) || (await caches.match('index.html')) || Response.error();
      }
      return Response.error();
    }
  })());
});
