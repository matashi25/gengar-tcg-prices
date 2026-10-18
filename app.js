const KEY='tcg-user-v1',GR={ungraded:'Ungraded',grade_7:'Grade 7',grade_8:'Grade 8',grade_9:'Grade 9',grade_9_5:'Grade 9.5',psa_10:'PSA 10'};
const CUR=['USD','CNY','JPY','HKD','SGD','MYR','EUR','GBP','AUD','CAD','KRW','TWD'],APP_VERSION='v9';
const TZ='America/Los_Angeles',dt=(t,o)=>new Date(t).toLocaleString('en-US',{timeZone:TZ,...o});
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let D={cards:[]},R={rates:{USD:1}},U=migrate(load());
function load(){try{const o=JSON.parse(localStorage.getItem(KEY));return o&&typeof o==='object'?o:{}}catch{return{}}}
function migrate(o){try{return migrate0(o)}catch(e){console.error('migrate',e);try{localStorage.setItem(KEY+'-backup-'+Date.now(),JSON.stringify(o))}catch{}return{v:2,cards:{},pending:[],settings:{cur:'USD'}}}}
function migrate0(o){o=o||{}; // v1 {cards:{id:{status,grade,price,date}}} -> v2 {v:2,cards:{id:{entries:[]}}}
  if(o.v===2){o.cards=o.cards&&typeof o.cards==='object'?o.cards:{};for(const k in o.cards){const x=o.cards[k];if(!x||typeof x!=='object'){delete o.cards[k];continue}if(!Array.isArray(x.entries))x.entries=[]}o.pending=Array.isArray(o.pending)?o.pending:[];o.settings=o.settings&&typeof o.settings==='object'?o.settings:{};if(!CUR.includes(o.settings.cur))o.settings.cur='USD';return o}const n={v:2,cards:{},pending:Array.isArray(o.pending)?o.pending:[],settings:{cur:'USD'}};
  for(const[id,x]of Object.entries(o.cards||{})){if(x&&x.entries){n.cards[id]=x;continue}
    if(x&&x.status==='own'){const p=parseFloat(x.price);n.cards[id]={entries:[{qty:1,price:isNaN(p)?null:p,cur:'USD',grade:x.grade||'ungraded',date:x.date||''}]}}}
  return n}
function save(){localStorage.setItem(KEY,JSON.stringify(U))}save();
let F=(()=>{try{return JSON.parse(localStorage.getItem('tcg-filter-v1'))||{}}catch{return{}}})();F.lang=F.lang||'all';F.set=F.set||'all';F.own=F.own||'all';
const saveF=()=>localStorage.setItem('tcg-filter-v1',JSON.stringify(F));
const disp=()=>U.settings.cur||'USD',rate=c=>R.rates[c]||null,fx=()=>rate(disp())||1,SYM=()=>(0).toLocaleString('en-US',{style:'currency',currency:disp(),maximumFractionDigits:0}).replace(/[\d.,\s]/g,'');
const money=(v,c=disp())=>v==null||isNaN(v)?'—':(+v).toLocaleString('en-US',{style:'currency',currency:c,maximumFractionDigits:['JPY','KRW','TWD'].includes(c)?0:2});
const f=usd=>usd==null?'—':money(usd*fx());
const jh=id=>U.cards[id]&&U.cards[id].jhs;
const jhTxt=id=>{const j=jh(id);if(!j||j.price==null)return '<i>tap to add</i>';const usd=rate(j.cur)?j.price/rate(j.cur):null;return `<b>${usd!=null?money(usd*fx()):money(j.price,j.cur)}</b>${j.cur!==disp()?` (${money(j.price,j.cur)})`:''}${j.label?' · '+esc(j.label):''} · <i>entered ${dt(j.date,{month:'short',day:'numeric',year:'numeric'})}</i>`};
function jhForm(id){const c=D.cards.find(x=>x.id===id),j=jh(id)||{cur:'CNY'};$('#ov').innerHTML=`<div class="ov" data-close><div class="sheet"><div class="top"><div><div class="nm">集换社 price</div><div class="meta">${esc(c.name)} · ${esc(c.set)} #${esc(c.number)}</div></div><button class="x" data-close>×</button></div>
  <label>Price</label><input id="j-p" inputmode="decimal" value="${j.price??''}" placeholder="0.00"><label>Currency</label><select id="j-c">${CUR.map(x=>`<option ${x===(j.cur||'CNY')?'selected':''}>${x}</option>`).join('')}</select>
  <label>Grade / condition (optional)</label><input id="j-l" value="${esc(j.label||'')}" placeholder="e.g. 裸卡 / PSA 10">
  <button class="addb" data-js="${id}">Save</button>${j.price!=null?`<button class="del" style="width:100%" data-jc="${id}">Clear 集换社 price</button>`:''}
  <div class="note">${j.date?'Last entered '+dt(j.date,{dateStyle:'medium',timeStyle:'short'})+' (Pacific). ':''}Saved only on this phone (included in Export).</div></div></div>`}
const ents=id=>(U.cards[id]&&U.cards[id].entries)||[];
function stats(c){const E=ents(c.id);let qty=0,cost=0,costOk=0,val=0,valOk=0;
  for(const e of E){const q=+e.qty||0;qty+=q;const p=parseFloat(e.price);if(!isNaN(p)&&rate(e.cur)){cost+=q*p/rate(e.cur)*fx();costOk+=q}
    const m=c.prices_usd?.[e.grade];if(m!=null){val+=q*m*fx();valOk+=q}}
  return{qty,cost,val,costOk,valOk,gl:costOk&&costOk===valOk&&costOk===qty?val-cost:null}}
const pass=c=>(F.lang==='all'||c.language===F.lang)&&(F.set==='all'||c.set===F.set)&&(F.own==='all'||(F.own==='own')===(stats(c).qty>0));
function fatal(e){console.error(e);const m=document.getElementById('m');if(m)m.innerHTML=`<div class="empty" style="text-align:left"><b style="color:var(--eye)">👻 Something went wrong loading the app.</b><br><small>${esc(e&&e.message||e)}</small><br><br>Your collection data is kept. Try:<br><button class="addb" id="rst">Reset app cache &amp; reload</button></div>`}
async function resetCache(){try{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}catch{}try{for(const k of await caches.keys())await caches.delete(k)}catch{}location.replace(location.pathname+'?r='+Date.now())}
async function init(){try{await init0()}catch(e){fatal(e)}}
async function init0(){
  try{R=await (await fetch('rates.json')).json()}catch{}
  try{D=await (await fetch('prices.json',{cache:'no-store'})).json()}catch(e){$('#upd').textContent='Offline and no cached prices yet'}
  if(U.pending){const n=U.pending.length;U.pending=U.pending.filter(p=>!D.cards.some(c=>c.url===p.url));if(n!==U.pending.length)save()}
  render();const q=new URLSearchParams(location.search);if(q.get('detail'))detail(q.get('detail'));if(q.get('add'))addForm();if(q.get('entries'))entries(q.get('entries'));
}
function filters(){const L=[...new Set(D.cards.map(c=>c.language))].sort(),S=[...new Set(D.cards.filter(c=>F.lang==='all'||c.language===F.lang).map(c=>c.set))].sort();if(F.set!=='all'&&!S.includes(F.set))F.set='all';
  return `<div class="flt"><div class="chips">${['all',...L].map(l=>`<button data-fl="${l}" class="${F.lang===l?'on':''}">${l==='all'?'All':l}</button>`).join('')}</div><select id="fset"><option value="all">All sets</option>${S.map(x=>`<option ${x===F.set?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
  <div class="flt"><div class="chips">${[['all','All'],['own','Owned'],['not','Not owned']].map(([k,n])=>`<button data-fo="${k}" class="${F.own===k?'on':''}">${n}</button>`).join('')}</div><select id="fcur" aria-label="Display currency">${CUR.map(c=>`<option ${c===disp()?'selected':''}>${c}</option>`).join('')}</select></div>`}
function card(c){const p=c.prices_usd||{},s=stats(c);
  return `<div class="c">${c.image?`<img src="${c.image}" alt="" loading="lazy" data-d="${c.id}">`:`<div class="noimg" data-d="${c.id}">👻</div>`}<div>
  <div class="nm" data-d="${c.id}">${esc(c.name)} <span style="font-size:12px;color:var(--glow)">📈</span><span class="tag ${c.language.toLowerCase()}">${c.language}</span>${s.qty?`<span class="own-b">Owned ×${s.qty}</span>`:''}</div>
  <div class="meta">${esc(c.set)} · #${esc(c.number)}</div>
  <div class="pr"><div><small>Ungraded</small>${f(p.ungraded)}</div><div><small>Grade 9</small>${f(p.grade_9)}</div><div><small>PSA 10</small>${f(p.psa_10)}</div></div>
  <div class="src"><a href="${c.url}" target="_blank" rel="noopener">PriceCharting ↗</a><span>eBay: <i>not connected yet</i></span><span class="jhs" data-jh="${c.id}">集换社: ${jhTxt(c.id)}</span></div></div>
  ${s.qty?`<div class="sum"><div><small>Qty</small>${s.qty}</div><div><small>Avg cost</small>${s.costOk?money(s.cost/s.costOk):'—'}</div><div><small>Value</small>${s.valOk?money(s.val):'—'}</div><div><small>Gain/loss</small>${s.gl==null?'—':`<b class="${s.gl>=0?'up':'down'}">${s.gl>=0?'+':'−'}${money(Math.abs(s.gl))}</b>`}</div></div>`:''}
  <div class="act"><button data-en="${c.id}">${s.qty?`✎ My copies (${ents(c.id).length} ${ents(c.id).length===1?'entry':'entries'})`:'＋ I own this'}</button></div></div>`}
function render(){
  if(D.updated_at)$('#upd').innerHTML=`Prices ${dt(D.updated_at,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'})} · FX ${R.date?dt(R.date,{month:'short',day:'numeric'}):'—'}${navigator.onLine?'':' · offline'} · <span style="color:var(--glow)">${APP_VERSION}</span>`;
  const list=D.cards.filter(pass);let n=0,cost=0,val=0,glc=0,gl=0,anyGl=false;
  for(const c of list){const s=stats(c);if(!s.qty)continue;n++;cost+=s.cost;val+=s.val;if(s.gl!=null){gl+=s.gl;anyGl=true}}
  let h=filters()+`<div class="tot t4"><div><small>Cards owned</small><b>${n}</b></div><div><small>Total cost</small><b>${money(cost)}</b></div><div><small>Value</small><b>${money(val)}</b></div><div><small>Gain/loss</small><b class="${gl>=0?'up':'down'}">${anyGl?(gl>=0?'+':'−')+money(Math.abs(gl)):'—'}</b></div></div>`;
  h+=list.length?list.map(card).join(''):`<div class="empty">👻 No cards match these filters.</div>`;
  h+=`<button class="addb" id="add">＋ Add card</button>`;
  const pend=(U.pending||[]).filter(p=>!D.cards.some(c=>c.url===p.url));
  if(pend.length)h+=`<h2>Pending · prices arrive on next refresh</h2>`+pend.map(p=>`<div class="c pend"><div style="font-size:40px;text-align:center">👻</div><div><div class="nm">${esc(p.name||'New card')}</div><div class="meta">${esc([p.set,p.number&&'#'+p.number].filter(Boolean).join(' · '))}</div><div class="meta"><b>Pending</b> · added ${dt(p.added,{month:'short',day:'numeric'})}</div>${p.url?`<div class="src"><a href="${esc(p.url)}" target="_blank" rel="noopener">PriceCharting ↗</a></div>`:''}</div><div class="act"><button data-cp="${esc(p.added)}">Copy request for Grok Bot</button><button data-rp="${esc(p.added)}">Remove</button></div></div>`).join('');
  h+=`<div class="bk"><button class="btn" id="exp">Export my data</button><button class="btn" id="impb">Import backup</button></div><div class="note" style="text-align:center"><button class="btn" id="rst2" style="margin:8px 0">Reset app cache</button><br>FX: ${esc(R.source||'')} ${R.date?dt(R.date,{dateStyle:'medium'}):''} · PriceCharting prices are USD, converted.</div>`;
  $('#m').innerHTML=h;
}
function entries(id){const c=D.cards.find(x=>x.id===id);if(!c)return;const E=ents(id),s=stats(c);
  $('#ov').innerHTML=`<div class="ov" data-close><div class="sheet"><div class="top">${c.image?`<img src="${c.image}">`:''}<div><div class="nm">${esc(c.name)} <span class="tag ${c.language.toLowerCase()}">${c.language}</span></div><div class="meta">${esc(c.set)} · #${esc(c.number)}</div></div><button class="x" data-close>×</button></div>
  <h2 style="margin-top:12px">My copies</h2>
  ${E.map((e,i)=>`<div class="ent"><div><label>Qty</label><input inputmode="numeric" data-e="${i}" data-k="qty" value="${esc(e.qty)}"></div>
   <div><label>Price paid (each)</label><input inputmode="decimal" data-e="${i}" data-k="price" value="${esc(e.price??'')}" placeholder="0.00"></div>
   <div><label>Currency</label><select data-e="${i}" data-k="cur">${CUR.map(x=>`<option ${x===e.cur?'selected':''}>${x}</option>`).join('')}</select></div>
   <div><label>Grade</label><select data-e="${i}" data-k="grade">${Object.entries(GR).map(([k,v])=>`<option value="${k}" ${k===e.grade?'selected':''}>${v}</option>`).join('')}</select></div>
   <div><label>Date (optional)</label><input type="date" data-e="${i}" data-k="date" value="${esc(e.date||'')}"></div>
   <div class="ev"><label>Now each</label>${f(c.prices_usd?.[e.grade])}<button class="del" data-del="${i}">Delete</button></div></div>`).join('')||'<div class="note">No copies recorded yet.</div>'}
  <button class="addb" data-ne="${id}">＋ Add purchase</button>
  ${s.qty?`<div class="sum"><div><small>Qty</small>${s.qty}</div><div><small>Avg cost</small>${s.costOk?money(s.cost/s.costOk):'—'}</div><div><small>Value</small>${money(s.val)}</div><div><small>Gain/loss</small>${s.gl==null?'—':`<b class="${s.gl>=0?'up':'down'}">${s.gl>=0?'+':'−'}${money(Math.abs(s.gl))}</b>`}</div></div>`:''}
  <div class="note">Shown in ${disp()}. Purchase prices are converted using ${esc(R.source||'')} rates from ${R.date?dt(R.date,{dateStyle:'medium'}):'—'}.</div></div></div>`;$('#ov').dataset.id=id}
// ---- detail + chart ----
const SER=[['ungraded','Ungraded','#b388ff'],['grade_9','Grade 9','#ff5ca8'],['psa_10','PSA 10','#ffd23f']];let rng='all';
function series(H){const m=H.monthly||[],last=m.length?m[m.length-1][0]:0;return m.concat((H.daily||[]).filter(d=>d[0]>last)).sort((a,b)=>a[0]-b[0])}
function chart(pts){
  const W=360,Hh=210,L=44,R=8,T=10,B=26;if(pts.length<2)return'<div class="note">Not enough history yet.</div>';
  const xs=pts.map(p=>p[0]),vs=pts.flatMap(p=>p.slice(1)).filter(v=>v!=null),x0=xs[0],x1=xs[xs.length-1],y0=Math.min(...vs)*.92,y1=Math.max(...vs)*1.05;
  const X=t=>L+(t-x0)/(x1-x0||1)*(W-L-R),Y=v=>T+(1-(v-y0)/(y1-y0||1))*(Hh-T-B);
  let g='<defs><filter id="gl"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  for(let i=0;i<=4;i++){const v=y0+(y1-y0)*i/4,y=Y(v);g+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#2a1d4d"/><text x="${L-4}" y="${y+3}" fill="#8f80bd" font-size="9" text-anchor="end">${SYM()}${v>=1000?(v/1000).toFixed(1)+'k':Math.round(v)}</text>`}
  const ticks=4;for(let i=0;i<=ticks;i++){const t=x0+(x1-x0)*i/ticks;g+=`<text x="${X(t)}" y="${Hh-8}" fill="#8f80bd" font-size="9" text-anchor="${i==0?'start':i==ticks?'end':'middle'}">${dt(t,{month:'short',year:'2-digit'})}</text>`}
  SER.forEach(([k,n,col],j)=>{const d=pts.filter(p=>p[j+1]!=null).map((p,i)=>(i?'L':'M')+X(p[0]).toFixed(1)+','+Y(p[j+1]).toFixed(1)).join('');const lp=pts.filter(p=>p[j+1]!=null).pop();
    g+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="2" filter="url(#gl)" stroke-linejoin="round"/>`+(lp?`<circle cx="${X(lp[0])}" cy="${Y(lp[j+1])}" r="3.5" fill="${col}"/>`:'')});
  return `<svg viewBox="0 0 ${W} ${Hh}">${g}</svg>`;
}
async function detail(id){const c=D.cards.find(x=>x.id===id);if(!c)return;let H={};if(c.history)try{H=await (await fetch(c.history)).json()}catch{}
  const all=series(H).map(p=>[p[0],...p.slice(1).map(v=>v==null?null:v*fx())]),cut={'1y':365,'2y':730}[rng],pts=cut?all.filter(p=>p[0]>=Date.now()-cut*864e5):all,p=c.prices_usd||{};
  $('#ov').innerHTML=`<div class="ov" data-close><div class="sheet"><div class="top">${c.image?`<img src="${c.image}">`:''}<div><div class="nm">${esc(c.name)} <span class="tag ${c.language.toLowerCase()}">${c.language}</span></div><div class="meta">${esc(c.set)} · #${esc(c.number)}</div></div><button class="x" data-close>×</button></div>
  <div class="pr">${SER.map(([k,n,col])=>`<div><small style="color:${col}">${n}</small>${f(p[k])}</div>`).join('')}</div>
  <div class="src" style="margin:4px 0"><span class="jhs" data-jh="${c.id}">集换社: ${jhTxt(c.id)}</span><span>eBay: <i>not connected yet</i></span></div><div class="chart">${chart(pts)}</div><div class="leg">${SER.map(([k,n,col])=>`<span><i style="background:${col};box-shadow:0 0 6px ${col}"></i>${n}</span>`).join('')}</div>
  <div class="rng">${[['1y','1Y'],['2y','2Y'],['all','All']].map(([k,n])=>`<button data-rng="${k}" data-id="${id}" class="${rng===k?'on':''}">${n}</button>`).join('')}</div>
  <div class="note">${all.length} points: monthly history from PriceCharting + daily refresh snapshots. Last point ${all.length?dt(all[all.length-1][0],{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'—'} (Pacific time). <a href="${c.url}" target="_blank" rel="noopener">PriceCharting ↗</a></div></div></div>`}
function addForm(){$('#ov').innerHTML=`<div class="ov" data-close><div class="sheet"><div class="top"><div class="nm">Add a card 👻</div><button class="x" data-close>×</button></div>
  <label>PriceCharting card URL (best)</label><input id="a-url" placeholder="https://www.pricecharting.com/game/…" inputmode="url">
  <label>…or describe it</label><input id="a-name" placeholder="Name, e.g. Mew ex"><input id="a-set" placeholder="Set, e.g. Pokemon 151"><input id="a-num" placeholder="Number, e.g. 205/165">
  <button class="addb" id="a-save">Save as pending</button>
  <div class="note">Your phone can't fetch PriceCharting itself. The card is saved here as <b>pending</b>; prices and chart appear after the next refresh once it's on the watch list. Simplest: tap “Copy request for Grok Bot” and paste it to Grok Bot in chat, and it'll add it.</div></div></div>`}

document.addEventListener('click',e=>{const t=e.target,b=t.closest('button');if(b&&(b.id==='rst'||b.id==='rst2')){resetCache();return}
  const dd=t.closest('[data-d]');if(t.closest('[data-jh]')){jhForm(t.closest('[data-jh]').dataset.jh);return}
  if(dd&&!b){detail(dd.dataset.d);return}
  if(t.classList&&t.classList.contains('ov')||(b&&b.classList.contains('x'))){$('#ov').innerHTML='';render();return}
  if(!b)return;const d=b.dataset;
  if(d.rng){rng=d.rng;detail(d.id);return}
  if(d.fl){F.lang=d.fl;saveF();render();return}
  if(d.fo){F.own=d.fo;saveF();render();return}
  if(d.js){const v=parseFloat($('#j-p').value);const o=(U.cards[d.js]=U.cards[d.js]||{entries:[]});if(isNaN(v)){alert('Enter a price');return}o.jhs={price:v,cur:$('#j-c').value,label:$('#j-l').value.trim(),date:new Date().toISOString()};save();$('#ov').innerHTML='';render();return}
  if(d.jc){delete U.cards[d.jc].jhs;save();$('#ov').innerHTML='';render();return}
  if(d.en){entries(d.en);return}
  if(d.ne){(U.cards[d.ne]=U.cards[d.ne]||{entries:[]}).entries.push({qty:1,price:null,cur:disp(),grade:'ungraded',date:''});save();entries(d.ne);return}
  if(d.del){const id=$('#ov').dataset.id;if(confirm('Delete this purchase entry?')){U.cards[id].entries.splice(+d.del,1);save();entries(id)}return}
  if(b.id==='add'){addForm();return}
  if(b.id==='a-save'){const url=$('#a-url').value.trim(),name=$('#a-name').value.trim();if(!url&&!name){alert('Paste a URL or enter a name');return}
    if(url&&!/^https:\/\/www\.pricecharting\.com\/game\//.test(url)){alert("That doesn't look like a PriceCharting card URL");return}
    (U.pending=U.pending||[]).push({url:url.split('?')[0]||null,name:name||(url?decodeURIComponent(url.split('/').pop()).replace(/-/g,' '):''),set:$('#a-set').value.trim(),number:$('#a-num').value.trim(),added:new Date().toISOString()});save();$('#ov').innerHTML='';render();return}
  if(d.rp){U.pending=(U.pending||[]).filter(p=>p.added!==d.rp);save();render();return}
  if(d.cp){const p=U.pending.find(p=>p.added===d.cp),txt='Please add this card to my Gengar TCG watch list: '+[p.url,p.name,p.set,p.number&&'#'+p.number].filter(Boolean).join(' | ');
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>alert('Copied! Paste it to Grok Bot.'),()=>prompt('Copy this and send it to Grok Bot:',txt));return}
  if(b.id==='exp'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({app:'gengar-tcg',exported_at:new Date().toISOString(),...U},null,2)],{type:'application/json'}));a.download='tcg-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();return}
  if(b.id==='impb')$('#imp').click();
});
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='fset'){F.set=t.value;saveF();render();return}
  if(t.id==='fcur'){U.settings.cur=t.value;save();render();return}
  if(t.id==='imp'){const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(!j.cards)throw 0;if(confirm('Replace your current collection data with this backup?')){const{app,exported_at,...rest}=j;U=migrate(rest);save();render()}}catch{alert('Not a valid backup file')}};r.readAsText(t.files[0]);t.value='';return}
  if(t.dataset.e!=null){const id=$('#ov').dataset.id,en=U.cards[id].entries[+t.dataset.e],k=t.dataset.k;
    en[k]=k==='qty'?Math.max(0,parseInt(t.value)||0):k==='price'?(t.value===''?null:parseFloat(t.value)):t.value;save();entries(id)}
});
addEventListener('online',render);addEventListener('offline',render);
if('serviceWorker' in navigator){
  const had=!!navigator.serviceWorker.controller;let reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!reloaded&&!sessionStorage.getItem('swr')){reloaded=true;sessionStorage.setItem('swr','1');location.reload()}});
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{reg.update();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update()})});
}
window.__boot=1;init().catch(fatal);
