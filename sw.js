const V='tcg-v8';
const SHELL=['./','index.html','app.js','manifest.webmanifest','icon.svg','icon-180.png','icon-192.png','icon-512.png','prices.json','rates.json'];
async function precache(){const c=await caches.open(V);
  await Promise.all(SHELL.map(u=>fetch(u,{cache:'no-store'}).then(r=>r.ok&&c.put(u,r)).catch(()=>{})));
  try{const d=await (await caches.match('prices.json')).json();
    await Promise.all(d.cards.flatMap(x=>[x.image,x.history]).filter(Boolean).map(u=>c.add(u).catch(()=>{})))}catch(e){}}
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(precache())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  const p=u.pathname, net=e.request.mode==='navigate'||/\/$|\.(html|js|json|webmanifest)$/.test(p);
  if(net){ // network-first, cache fallback offline
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request.mode==='navigate'?'./':e.request,c))}return r})
      .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||(e.request.mode==='navigate'?caches.match('./'):undefined))));return}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(n=>{if(n.ok){const c=n.clone();caches.open(V).then(x=>x.put(e.request,c))}return n})));
});
