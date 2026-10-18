const V='tcg-v9b';
const SHELL=['./','index.html','app.js','manifest.webmanifest','icon.svg','icon-180.png','icon-192.png','icon-512.png','prices.json','rates.json'];
// Never hand Safari a redirected response for a navigation (it shows a blank page)
const clean=async r=>r&&r.redirected?new Response(await r.blob(),{status:r.status,statusText:r.statusText,headers:r.headers}):r;
async function precache(){const c=await caches.open(V);
  await Promise.all(SHELL.map(u=>fetch(u,{cache:'reload'}).then(clean).then(r=>r&&r.ok&&c.put(u,r)).catch(()=>{}))); // one missing file never fails install
  try{const d=await (await caches.match('prices.json')).json();
    await Promise.all(d.cards.flatMap(x=>[x.image,x.history]).filter(Boolean).map(u=>c.add(u).catch(()=>{})))}catch(e){}}
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(precache())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request,u=new URL(req.url); if(req.method!=='GET'||u.origin!==location.origin) return;
  if(/(icon-[0-9]+\.png|icon\.svg|manifest\.webmanifest)$/.test(u.pathname)) return; // let iOS fetch icons/manifest straight from the network
  if(req.mode==='navigate'){ // network (plain request, no init: iOS standalone dislikes rebuilt navigate requests), else cached shell
    e.respondWith((async()=>{try{const r=await clean(await fetch(req));if(r.ok){caches.open(V).then(c=>c.put('./',r.clone()))}return r}
      catch(_){return (await caches.match('./'))||(await caches.match('index.html'))||new Response('<meta name=viewport content="width=device-width"><body style="background:#0d0820;color:#eee;font:16px system-ui;padding:40px">Offline and app not cached yet. Connect and reopen.</body>',{headers:{'Content-Type':'text/html'}})}})());return}
  if(/\.(js|json|webmanifest)$/.test(u.pathname)){
    e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(req,c))}return r}).catch(async()=>(await caches.match(req,{ignoreSearch:true}))||Response.error()));return}
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(r=>r||fetch(req).then(n=>{if(n.ok){const c=n.clone();caches.open(V).then(x=>x.put(req,c))}return n})));
});
