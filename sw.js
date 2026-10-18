const V='tcg-v2';
const SHELL=['./','index.html','app.js','manifest.webmanifest','icon.svg','icon-180.png','icon-192.png','icon-512.png','prices.json',
'img/en-151-198.jpg','img/en-151-199.jpg','img/en-151-200.jpg','img/jp-sv2a-200.jpg','img/jp-sv2a-201.jpg','img/jp-sv2a-202.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  if(u.pathname.endsWith('prices.json')){ // network-first so refreshed prices arrive; cache fallback offline
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put('prices.json',c));return r}).catch(()=>caches.match('prices.json')));return}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(n=>{const c=n.clone();caches.open(V).then(x=>x.put(e.request,c));return n})));
});
