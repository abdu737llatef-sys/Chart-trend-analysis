const CACHE='trend-v5-6-2-20260912';
const CORE=['./style.css?v=5.6.2','./app.js?v=5.6.2','./scanner.html?v=5.6.2','./scanner.js?v=5.6.2.2','./manifest.webmanifest?v=5.6.2','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);if(u.origin!==location.origin)return;
  const dynamic=e.request.mode==='navigate'||/\/(index\.html|app\.js|style\.css|manifest\.webmanifest)$/.test(u.pathname);
  if(dynamic){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(CACHE).then(k=>k.put(e.request,c));}return r;}).catch(()=>caches.match(e.request).then(x=>x||caches.match('./'))));
  }else{
    e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(CACHE).then(k=>k.put(e.request,c));}return r;})));
  }
});
