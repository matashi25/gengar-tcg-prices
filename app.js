const KEY='tcg-user-v1',GR={ungraded:'Ungraded',grade_7:'Grade 7',grade_8:'Grade 8',grade_9:'Grade 9',grade_9_5:'Grade 9.5',psa_10:'PSA 10'};
let D={cards:[]},U=load(),tab=new URLSearchParams(location.search).get('tab')==='wish'?'wish':'own';
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{cards:{}}}catch{return{cards:{}}}}
function save(){localStorage.setItem(KEY,JSON.stringify(U))}
const TZ='America/Los_Angeles',dt=(t,o)=>new Date(t).toLocaleString('en-US',{timeZone:TZ,...o});
const $=s=>document.querySelector(s),f=v=>v==null||isNaN(v)?'—':'$'+(+v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function init(){
  try{D=await (await fetch('prices.json',{cache:'no-store'})).json()}catch(e){$('#upd').textContent='Offline and no cached prices yet'}
  if(U.pending){const n=U.pending.length;U.pending=U.pending.filter(p=>!D.cards.some(c=>c.url===p.url));if(n!==U.pending.length)save()}
  render();
  const q=new URLSearchParams(location.search);if(q.get('detail'))detail(q.get('detail'));if(q.get('add'))addForm();
}
function u(id){return U.cards[id]||(U.cards[id]={status:null,grade:'ungraded',price:'',date:''})}
function card(c){
  const x=u(c.id),p=c.prices_usd||{},own=x.status==='own',cur=p[x.grade],bp=parseFloat(x.price),gl=own&&!isNaN(bp)&&cur!=null?cur-bp:null;
  return `<div class="c">${c.image?`<img src="${c.image}" alt="" loading="lazy" data-d="${c.id}">`:'<div></div>'}<div>
  <div class="nm" data-d="${c.id}">${esc(c.name)} <span style="font-size:12px;color:var(--glow)">📈</span><span class="tag ${c.language.toLowerCase()}">${c.language}</span></div>
  <div class="meta">${esc(c.set)} · #${esc(c.number)}</div>
  <div class="pr"><div><small>Ungraded</small>${f(p.ungraded)}</div><div><small>Grade 9</small>${f(p.grade_9)}</div><div><small>PSA 10</small>${f(p.psa_10)}</div></div>
  <div class="src"><a href="${c.url}" target="_blank" rel="noopener">PriceCharting ↗</a><span>eBay: <i>not connected yet</i></span><span>集换社: <i>not connected yet</i></span></div></div>
  <div class="act"><button class="own ${own?'on':''}" data-id="${c.id}" data-s="own">${own?'✓ Owned':'+ Owned'}</button><button class="wish ${x.status==='wish'?'on':''}" data-id="${c.id}" data-s="wish">${x.status==='wish'?'✓ Wish list':'+ Wish list'}</button></div>
  ${own?`<div class="own-f"><div><label>Paid (USD)</label><input inputmode="decimal" data-id="${c.id}" data-k="price" value="${esc(x.price)}" placeholder="0.00"></div>
  <div><label>Date</label><input type="date" data-id="${c.id}" data-k="date" value="${esc(x.date)}"></div>
  <div><label>Grade owned</label><select data-id="${c.id}" data-k="grade">${Object.entries(GR).map(([k,v])=>`<option value="${k}" ${k===x.grade?'selected':''}>${v}</option>`).join('')}</select></div></div>
  <div class="gl">Now (${GR[x.grade]}): <b>${f(cur)}</b>${gl!=null?` · <b class="${gl>=0?'up':'down'}">${gl>=0?'▲ +':'▼ −'}${f(Math.abs(gl)).slice(1)} (${(gl/bp*100).toFixed(1)}%)</b>`:''}</div>`:''}</div>`;
}
function render(){
  if(D.updated_at) $('#upd').innerHTML=`Prices updated <b>${dt(D.updated_at,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})}</b> · PriceCharting${navigator.onLine?'':' · offline'} · <span style="color:var(--glow)">${APP_VERSION}</span>`;
  $('#t-own').classList.toggle('on',tab==='own');$('#t-wish').classList.toggle('on',tab==='wish');
  const mine=D.cards.filter(c=>u(c.id).status===tab),rest=D.cards.filter(c=>!u(c.id).status);
  let h='';
  if(tab==='own'){let v=0,cost=0;for(const c of mine){const x=u(c.id),cur=c.prices_usd?.[x.grade];if(cur!=null)v+=cur;const b=parseFloat(x.price);if(!isNaN(b))cost+=b}
    const g=v-cost;h+=`<div class="tot"><div><small>Cards</small><b>${mine.length}</b></div><div><small>Value</small><b>${f(v)}</b></div><div><small>Gain/loss</small><b class="${g>=0?'up':'down'}">${cost?(g>=0?'+':'−')+f(Math.abs(g)).slice(1):'—'}</b></div></div>`}
  else{let v=0;for(const c of mine)v+=c.prices_usd?.ungraded||0;h+=`<div class="tot"><div><small>Wanted</small><b>${mine.length}</b></div><div><small>Ungraded total</small><b>${f(v)}</b></div><div><small>PSA 10 total</small><b>${f(mine.reduce((a,c)=>a+(c.prices_usd?.psa_10||0),0))}</b></div></div>`}
  h+=mine.length?mine.map(card).join(''):`<div class="empty">👻 Nothing here yet. Tap “${tab==='own'?'+ Owned':'+ Wish list'}” on a card below.</div>`;
  h+=`<button class="addb" id="add">＋ Add card</button>`;
  const pend=(U.pending||[]).filter(p=>!D.cards.some(c=>c.url===p.url));
  if(pend.length)h+=`<h2>Pending · prices arrive on next refresh</h2>`+pend.map((p,i)=>`<div class="c pend"><div style="font-size:40px;text-align:center">👻</div><div><div class="nm">${esc(p.name||'New card')}</div><div class="meta">${esc([p.set,p.number&&'#'+p.number].filter(Boolean).join(' · '))}</div><div class="meta"><b>Pending</b> · added ${dt(p.added,{month:'short',day:'numeric'})}</div>${p.url?`<div class="src"><a href="${esc(p.url)}" target="_blank" rel="noopener">PriceCharting ↗</a></div>`:''}</div><div class="act"><button data-cp="${esc(p.added)}">Copy request for Grok Bot</button><button data-rp="${esc(p.added)}">Remove</button></div></div>`).join('');
  if(rest.length)h+=`<h2>Not assigned yet</h2>`+rest.map(card).join('');
  h+=`<div class="bk"><button class="btn" id="exp">Export my data</button><button class="btn" id="impb">Import backup</button></div>`;
  $('#m').innerHTML=h;
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='t-own'||b.id==='t-wish'){tab=b.id==='t-own'?'own':'wish';render();scrollTo(0,0);return}
  if(b.dataset.s){const x=u(b.dataset.id);x.status=x.status===b.dataset.s?null:b.dataset.s;save();render();return}
  if(b.id==='exp'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'gengar-tcg',exported_at:new Date().toISOString(),...U},null,2)],{type:'application/json'}));a.download='tcg-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();return}
  if(b.id==='impb')$('#imp').click();
});
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='imp'){const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(!j.cards)throw 0;if(confirm('Replace your current collection data with this backup?')){U={cards:j.cards};save();render()}}catch{alert('Not a valid backup file')}};r.readAsText(t.files[0]);t.value='';return}
  if(t.dataset.k){u(t.dataset.id)[t.dataset.k]=t.value;save();render()}
});
// ---- detail + chart ----
const SER=[['ungraded','Ungraded','#b388ff'],['grade_9','Grade 9','#ff5ca8'],['psa_10','PSA 10','#ffd23f']];let rng='all';
function series(H){const m=H.monthly||[],last=m.length?m[m.length-1][0]:0;return m.concat((H.daily||[]).filter(d=>d[0]>last)).sort((a,b)=>a[0]-b[0])}
function chart(pts){
  const W=360,Hh=210,L=44,R=8,T=10,B=26;if(pts.length<2)return'<div class="note">Not enough history yet.</div>';
  const xs=pts.map(p=>p[0]),vs=pts.flatMap(p=>p.slice(1)).filter(v=>v!=null),x0=xs[0],x1=xs[xs.length-1],y0=Math.min(...vs)*.92,y1=Math.max(...vs)*1.05;
  const X=t=>L+(t-x0)/(x1-x0||1)*(W-L-R),Y=v=>T+(1-(v-y0)/(y1-y0||1))*(Hh-T-B);
  let g='<defs><filter id="gl"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  for(let i=0;i<=4;i++){const v=y0+(y1-y0)*i/4,y=Y(v);g+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#2a1d4d"/><text x="${L-4}" y="${y+3}" fill="#8f80bd" font-size="9" text-anchor="end">$${v>=1000?(v/1000).toFixed(1)+'k':Math.round(v)}</text>`}
  const ticks=4;for(let i=0;i<=ticks;i++){const t=x0+(x1-x0)*i/ticks;g+=`<text x="${X(t)}" y="${Hh-8}" fill="#8f80bd" font-size="9" text-anchor="${i==0?'start':i==ticks?'end':'middle'}">${dt(t,{month:'short',year:'2-digit'})}</text>`}
  SER.forEach(([k,n,col],j)=>{const d=pts.filter(p=>p[j+1]!=null).map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+','+Y(p[j+1]).toFixed(1)).join('');const lp=pts.filter(p=>p[j+1]!=null).pop();
    g+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="2" filter="url(#gl)" stroke-linejoin="round"/>`+(lp?`<circle cx="${X(lp[0])}" cy="${Y(lp[j+1])}" r="3.5" fill="${col}"/>`:'')});
  return `<svg viewBox="0 0 ${W} ${Hh}">${g}</svg>`;
}
async function detail(id){const c=D.cards.find(x=>x.id===id);if(!c)return;let H={};try{H=await (await fetch(c.history)).json()}catch{}
  const all=series(H),cut={'1y':365,'2y':730}[rng],pts=cut?all.filter(p=>p[0]>=Date.now()-cut*864e5):all,p=c.prices_usd||{};
  $('#ov').innerHTML=`<div class="ov" data-close><div class="sheet"><div class="top">${c.image?`<img src="${c.image}">`:''}<div><div class="nm">${esc(c.name)} <span class="tag ${c.language.toLowerCase()}">${c.language}</span></div><div class="meta">${esc(c.set)} · #${esc(c.number)}</div></div><button class="x" data-close>×</button></div>
  <div class="pr">${SER.map(([k,n,col])=>`<div><small style="color:${col}">${n}</small>${f(p[k])}</div>`).join('')}</div>
  <div class="chart">${chart(pts)}</div><div class="leg">${SER.map(([k,n,col])=>`<span><i style="background:${col};box-shadow:0 0 6px ${col}"></i>${n}</span>`).join('')}</div>
  <div class="rng">${[['1y','1Y'],['2y','2Y'],['all','All']].map(([k,n])=>`<button data-rng="${k}" data-id="${id}" class="${rng===k?'on':''}">${n}</button>`).join('')}</div>
  <div class="note">${all.length} points: monthly history from PriceCharting + daily refresh snapshots. Last point ${all.length?dt(all[all.length-1][0],{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'—'} (Pacific time). <a href="${c.url}" target="_blank" rel="noopener">PriceCharting ↗</a></div></div></div>`}
function addForm(){$('#ov').innerHTML=`<div class="ov" data-close><div class="sheet"><div class="top"><div class="nm">Add a card 👻</div><button class="x" data-close>×</button></div>
  <label>PriceCharting card URL (best)</label><input id="a-url" placeholder="https://www.pricecharting.com/game/…" inputmode="url">
  <label>…or describe it</label><input id="a-name" placeholder="Name, e.g. Mew ex"><input id="a-set" placeholder="Set, e.g. Pokemon 151"><input id="a-num" placeholder="Number, e.g. 205/165">
  <button class="addb" id="a-save">Save as pending</button>
  <div class="note">Your phone can't fetch PriceCharting itself. The card is saved here as <b>pending</b>; prices and chart appear after the next refresh once it's on the watch list. Simplest: tap “Copy request for Grok Bot” and paste it to Grok Bot in chat, and it'll add it.</div></div></div>`}
document.addEventListener('click',e=>{const t=e.target;
  const dd=t.closest('[data-d]');if(dd){detail(dd.dataset.d);return}
  if(t.dataset.rng){rng=t.dataset.rng;detail(t.dataset.id);return}
  if(t.hasAttribute('data-close')&&(t===e.target)&&(t.classList.contains('ov')||t.classList.contains('x'))){$('#ov').innerHTML='';return}
  if(t.id==='add'){addForm();return}
  if(t.id==='a-save'){const url=$('#a-url').value.trim(),name=$('#a-name').value.trim();if(!url&&!name){alert('Paste a URL or enter a name');return}
    if(url&&!/^https:\/\/www\.pricecharting\.com\/game\//.test(url)){alert('That doesn\'t look like a PriceCharting card URL');return}
    (U.pending=U.pending||[]).push({url:url.split('?')[0]||null,name:name||(url?decodeURIComponent(url.split('/').pop()).replace(/-/g,' '):''),set:$('#a-set').value.trim(),number:$('#a-num').value.trim(),added:new Date().toISOString()});save();$('#ov').innerHTML='';render();return}
  if(t.dataset.rp){U.pending=(U.pending||[]).filter(p=>p.added!==t.dataset.rp);save();render();return}
  if(t.dataset.cp){const p=U.pending.find(p=>p.added===t.dataset.cp),txt='Please add this card to my Gengar TCG watch list: '+[p.url,p.name,p.set,p.number&&'#'+p.number].filter(Boolean).join(' | ');
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>alert('Copied! Paste it to Grok Bot.'),()=>prompt('Copy this and send it to Grok Bot:',txt));return}
});
addEventListener('online',render);addEventListener('offline',render);
const APP_VERSION='v4';
if('serviceWorker' in navigator){
  const had=!!navigator.serviceWorker.controller;let reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!reloaded){reloaded=true;location.reload()}});
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{reg.update();
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update()})});
}
init();
