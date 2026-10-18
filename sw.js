const V='tcg-v3';
const SHELL=['./','index.html','app.js','manifest.webmanifest','icon.svg','icon-180.png','icon-192.png','icon-512.png','prices.json'];
async function precache(){const c=await caches.open(V);await c.addAll(SHELL);
  try{const d=await (await fetch('prices.json',{cache:'no-store'})).json();await c.put('prices.json',new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json'}}));
    await Promise.all(d.cards.flatMap(x=>[x.image,x.history]).filter(Boolean).map(u=>c.add(u).catch(()=>{})))}catch(e){}}
self.addEventListener('install',e=>{e.waitUntil(precache());self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  if(u.pathname.endsWith('.json')){ // network-first: fresh prices/history online, cached copy offline
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));return}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(n=>{if(n.ok){const c=n.clone();caches.open(V).then(x=>x.put(e.request,c))}return n})));
});
