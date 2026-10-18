const KEY='tcg-user-v1',GR={ungraded:'Ungraded',grade_7:'Grade 7',grade_8:'Grade 8',grade_9:'Grade 9',grade_9_5:'Grade 9.5',psa_10:'PSA 10'};
let D={cards:[]},U=load(),tab=new URLSearchParams(location.search).get('tab')==='wish'?'wish':'own';
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{cards:{}}}catch{return{cards:{}}}}
function save(){localStorage.setItem(KEY,JSON.stringify(U))}
const $=s=>document.querySelector(s),f=v=>v==null||isNaN(v)?'—':'$'+(+v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function init(){
  try{D=await (await fetch('prices.json',{cache:'no-store'})).json()}catch(e){$('#upd').textContent='Offline and no cached prices yet'}
  render();
}
function u(id){return U.cards[id]||(U.cards[id]={status:null,grade:'ungraded',price:'',date:''})}
function card(c){
  const x=u(c.id),p=c.prices_usd||{},own=x.status==='own',cur=p[x.grade],bp=parseFloat(x.price),gl=own&&!isNaN(bp)&&cur!=null?cur-bp:null;
  return `<div class="c">${c.image?`<img src="${c.image}" alt="" loading="lazy">`:'<div></div>'}<div>
  <div class="nm">${esc(c.name)}<span class="tag ${c.language==='EN'?'en':''}">${c.language}</span></div>
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
  if(D.updated_at) $('#upd').innerHTML=`Prices updated <b>${new Date(D.updated_at).toLocaleString()}</b> · PriceCharting${navigator.onLine?'':' · offline'}`;
  $('#t-own').classList.toggle('on',tab==='own');$('#t-wish').classList.toggle('on',tab==='wish');
  const mine=D.cards.filter(c=>u(c.id).status===tab),rest=D.cards.filter(c=>!u(c.id).status);
  let h='';
  if(tab==='own'){let v=0,cost=0;for(const c of mine){const x=u(c.id),cur=c.prices_usd?.[x.grade];if(cur!=null)v+=cur;const b=parseFloat(x.price);if(!isNaN(b))cost+=b}
    const g=v-cost;h+=`<div class="tot"><div><small>Cards</small><b>${mine.length}</b></div><div><small>Value</small><b>${f(v)}</b></div><div><small>Gain/loss</small><b class="${g>=0?'up':'down'}">${cost?(g>=0?'+':'−')+f(Math.abs(g)).slice(1):'—'}</b></div></div>`}
  else{let v=0;for(const c of mine)v+=c.prices_usd?.ungraded||0;h+=`<div class="tot"><div><small>Wanted</small><b>${mine.length}</b></div><div><small>Ungraded total</small><b>${f(v)}</b></div><div><small>PSA 10 total</small><b>${f(mine.reduce((a,c)=>a+(c.prices_usd?.psa_10||0),0))}</b></div></div>`}
  h+=mine.length?mine.map(card).join(''):`<div class="empty">👻 Nothing here yet. Tap “${tab==='own'?'+ Owned':'+ Wish list'}” on a card below.</div>`;
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
addEventListener('online',render);addEventListener('offline',render);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
init();
