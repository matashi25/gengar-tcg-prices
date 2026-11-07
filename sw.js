const SHELL_CACHE='tcg-shell-v10';
const IMAGE_CACHE='tcg-images-v1';
const DATA_CACHE='tcg-data-v1';
const SHELL=['./','./index.html','./app.js','./app.js?v=10','./manifest.webmanifest','./icon.svg','./icon-180.png','./icon-192.png','./icon-512.png'];
// Never hand Safari a redirected response for a navigation (it shows a blank page).
const clean=async r=>r&&r.redirected?new Response(await r.blob(),{status:r.status,statusText:r.statusText,headers:r.headers}):r;
const keep=k=>k===SHELL_CACHE||k===IMAGE_CACHE||k===DATA_CACHE;

async function precacheShell(){
  const c=await caches.open(SHELL_CACHE);
  for(const u of SHELL){
    try{const r=await clean(await fetch(u,{cache:'reload'}));if(r&&r.ok)await c.put(u,r.clone())}catch(e){}
  }
  const html=await c.match('./')||await c.match('./index.html');
  const js=await c.match('./app.js?v=10')||await c.match('./app.js');
  return !!(html&&js);
}
function bare(req){const u=new URL(req.url);return new Request(u.origin+u.pathname)}
async function migrate(){
  const data=await caches.open(DATA_CACHE),images=await caches.open(IMAGE_CACHE);
  for(const k of await caches.keys()){
    if(keep(k))continue;
    const c=await caches.open(k);
    for(const req of await c.keys()){
      const res=await c.match(req);if(!res)continue;
      const path=new URL(req.url).pathname, dest=bare(req);
      if(/\/(?:prices|rates)\.json$/.test(path)||/\/history\/[^/]+\.json$/.test(path)){
        if(!(await data.match(dest,{ignoreSearch:true})))await data.put(dest,res.clone());
      }else if(/\/img\/.+\.(?:jpg|jpeg|png|webp)$/i.test(path)){
        if(!(await images.match(dest,{ignoreSearch:true})))await images.put(dest,res.clone());
      }
    }
  }
}
self.addEventListener('install',e=>{
  e.waitUntil((async()=>{if(!(await precacheShell()))throw new Error('shell incomplete');await self.skipWaiting()})());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    await migrate();
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>!keep(k)).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
async function shellHtml(){
  const c=await caches.open(SHELL_CACHE);
  return (await c.match('./'))||(await c.match('./index.html'))||(await c.match('index.html'))
}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);if(u.origin!==location.origin)return;
  // Manual refresh (prices, rates, pictures, charts). Never used on open.
  if(req.headers.get('x-tcg-refresh')==='1'){e.respondWith(fetch(req).catch(()=>Response.error()));return}
  // iOS standalone can blank the page if the SW answers icon/manifest requests.
  if(/(?:icon-[0-9]+\.png|manifest\.webmanifest)$/.test(u.pathname))return;
  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      const hit=await shellHtml();if(hit)return hit;
      try{const r=await clean(await fetch(req));
        if(r&&r.ok){const c=await caches.open(SHELL_CACHE);await c.put('./',r.clone());await c.put('./index.html',r.clone())}
        return r;
      }catch(_){return new Response('<!doctype html><meta name=viewport content="width=device-width"><title>Gengar TCG Prices</title><body style="background:#0d0820;color:#eee;font:16px system-ui;padding:40px">Offline, and this phone does not have the app saved yet. Connect once, then you can reopen it offline.</body>',{headers:{'Content-Type':'text/html;charset=utf-8'}})}})());
    return;
  }
  if(/\/(?:prices|rates)\.json$/.test(u.pathname)||/\/history\/[^/]+\.json$/.test(u.pathname)){
    e.respondWith((async()=>{
      const hit=await caches.match(req,{ignoreSearch:true});
      if(hit)return hit;
      return new Response(JSON.stringify({offline:true}),{status:504,headers:{'Content-Type':'application/json'}});
    })());
    return;
  }
  if(/\.js$/.test(u.pathname)){
    e.respondWith((async()=>{
      const c=await caches.open(SHELL_CACHE);
      const hit=await c.match('./app.js?v=10')||await c.match(req,{ignoreSearch:true})||await c.match('./app.js');
      if(hit)return hit;
      const r=await clean(await fetch(req));
      if(r&&r.ok)await c.put('./app.js?v=10',r.clone());
      return r;
    })());
    return;
  }
  if(/\/img\/.+\.(?:jpg|jpeg|png|webp)$/i.test(u.pathname)||/icon\.svg$/.test(u.pathname)){
    e.respondWith((async()=>{
      const c=await caches.open(IMAGE_CACHE);
      const hit=await c.match(req,{ignoreSearch:true});
      if(hit)return hit;
      try{const r=await clean(await fetch(req));if(r&&r.ok)await c.put(bare(req),r.clone());return r}
      catch(_){return Response.error()}
    })());
  }
});
