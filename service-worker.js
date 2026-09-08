const CACHE='trend-v5-1-hotfix-20260908';
const CORE=[
  './style.css?v=5.1.0',
  './app.js?v=5.1.0',
  './manifest.webmanifest?v=5.1.0',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;

  // Always prefer the network for page navigations and app code.
  const isNavigation=event.request.mode==='navigate';
  const isAppFile=/\/(index\.html|app\.js|style\.css|manifest\.webmanifest)$/.test(url.pathname);

  if(isNavigation || isAppFile){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(resp=>{
          if(resp && resp.ok){
            const copy=resp.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          }
          return resp;
        })
        .catch(()=>caches.match(event.request).then(x=>x||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;
      return fetch(event.request).then(resp=>{
        if(resp && resp.ok){
          const copy=resp.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return resp;
      });
    })
  );
});
