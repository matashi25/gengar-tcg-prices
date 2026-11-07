// Browser checks: cached reopen, offline reopen, slow network, pull-to-refresh, failed refresh.
// npm install puppeteer-core && CHROME_PATH=/usr/bin/google-chrome node test/pwa-offline.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = new URL('..', import.meta.url).pathname;
const MIME = {
  '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css'
};
const state = {mode: 'ok', delay: 0, stamp: null, log: []};

function send(res, code, body, type = 'text/plain', extraDelay = 0) {
  return new Promise(resolve => {
    setTimeout(() => {
      res.writeHead(code, {'Content-Type': type, 'Cache-Control': 'no-store'});
      res.end(body);
      resolve();
    }, extraDelay);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  state.log.push({t: Date.now(), method: req.method, path: url.pathname, refresh: req.headers['x-tcg-refresh'] || ''});
  if (url.pathname === '/__mode') {
    let raw = '';
    for await (const c of req) raw += c;
    Object.assign(state, JSON.parse(raw || '{}'));
    state.log = [];
    return send(res, 200, 'ok');
  }
  if (url.pathname === '/__log') return send(res, 200, JSON.stringify(state.log), 'application/json');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, 'nope');
  }
  const ext = path.extname(file);
  const isPrice = rel === '/prices.json' || rel === '/rates.json';
  const delay = isPrice ? state.delay : 0;
  if (isPrice && state.mode === 'fail' && req.headers['x-tcg-refresh'] === '1') {
    return send(res, 500, 'no', 'text/plain', delay);
  }
  let body = fs.readFileSync(file);
  if (rel === '/prices.json' && state.stamp) {
    const j = JSON.parse(body.toString());
    j.updated_at = state.stamp;
    body = Buffer.from(JSON.stringify(j));
  }
  return send(res, 200, body, MIME[ext] || 'application/octet-stream', delay);
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}/`;
const results = [];
function check(name, ok, detail = '') {
  results.push({name, ok, detail});
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
});

async function setMode(mode, extra = {}) {
  await fetch(origin + '__mode', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({mode, delay: 0, stamp: null, ...extra})});
}
function since(t) { return state.log.filter(x => x.t >= t); }
function priceHits(entries) { return entries.filter(x => x.path === '/prices.json' || x.path === '/rates.json'); }

async function waitFor(page, fn, ms = 15000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < ms) {
    try { last = await page.evaluate(fn); if (last) return last; } catch (e) { last = String(e); }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('timeout: ' + last);
}

const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
page.on('pageerror', err => console.log('PAGEERROR', err.message));
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE', msg.text()); });

try {
  await setMode('ok');
  const t0 = Date.now();
  await page.goto(origin, {waitUntil: 'domcontentloaded'});
  await waitFor(page, () => document.body.innerText.includes('299.95') && document.body.innerText.includes('Sylveon ex') && document.body.innerText.includes('Cubone'));
  const warmMs = Date.now() - t0;
  check('first load shows saved file prices', true, warmMs + 'ms');

  await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    const target = imgs.filter(i => /cn-csv95c-234|cn-gem3-407/.test(i.getAttribute('src') || ''));
    target.forEach(i => i.scrollIntoView({block: 'center'}));
    return target.length;
  });
  const dims = await waitFor(page, () => {
    const imgs = [...document.querySelectorAll('img')].filter(i => /cn-csv95c-234|cn-gem3-407/.test(i.currentSrc || i.src));
    if (imgs.length < 2) return null;
    if (imgs.some(i => !i.complete || i.naturalWidth < 400)) return null;
    return imgs.map(i => ({src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight}));
  });
  check('last two card pictures load at full size', dims.length === 2 && dims.every(d => d.w >= 400), JSON.stringify(dims));

  await waitFor(page, async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(reg && reg.active && navigator.serviceWorker.controller && localStorage.getItem('tcg-market-v1') && localStorage.getItem('tcg-img-rev') === '10');
  }, 20000);
  check('service worker controls page and snapshot is stored', true);

  // Cached reopen while price endpoints are slow. Must not wait on them.
  await setMode('ok', {delay: 8000, stamp: '2099-01-01T00:00:00Z'});
  const beforeReload = Date.now();
  await page.reload({waitUntil: 'domcontentloaded'});
  const shown = await waitFor(page, () => document.body.innerText.includes('299.95') ? document.getElementById('upd').innerText : '');
  const reloadMs = Date.now() - beforeReload;
  const reloadPriceReqs = priceHits(since(beforeReload));
  check('cached reopen is immediate while prices are slow', reloadMs < 2500 && shown.includes('Nov 6'), reloadMs + 'ms ' + shown.slice(0, 140));
  check('cached reopen does not request prices or rates', reloadPriceReqs.length === 0, JSON.stringify(reloadPriceReqs));
  check('slow stamp was not applied on open', !shown.includes('2099') && !shown.includes('Jan 1'), shown.slice(0, 160));

  // Cold offline page in the same profile. HTTP cache is disabled, so this has to come from the service worker.
  const cold = await browser.newPage();
  cold.on('pageerror', err => console.log('COLD PAGEERROR', err.message));
  cold.on('console', msg => { if (msg.type() === 'error') console.log('COLD CONSOLE', msg.text()); });
  await cold.setCacheEnabled(false);
  await cold.setOfflineMode(true);
  await cold.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
  const coldStart = Date.now();
  let coldErr = '';
  try { await cold.goto(origin, {waitUntil: 'domcontentloaded', timeout: 8000}); }
  catch (e) { coldErr = e.message; }
  let coldInfo = {text: '', upd: '', onLine: null};
  try { coldInfo = await cold.evaluate(() => ({text: document.body.innerText, upd: document.getElementById('upd').innerText, onLine: navigator.onLine})); }
  catch (e) { coldErr += ' ' + e.message; }
  const coldMs = Date.now() - coldStart;
  const coldOk = /299\.95/.test(coldInfo.text) && /Sylveon ex/.test(coldInfo.text) && /Cubone/.test(coldInfo.text) && coldInfo.onLine === false && /offline/i.test(coldInfo.upd);
  check('cold offline reopen shows last prices', coldOk, coldMs + 'ms online=' + coldInfo.onLine + ' ' + (coldErr || coldInfo.upd));
  if (/299\.95/.test(coldInfo.text)) {
    const coldImg = await cold.evaluate(async () => {
      const imgs = [...document.querySelectorAll('img')].filter(i => /cn-csv95c-234|cn-gem3-407/.test(i.getAttribute('src') || ''));
      imgs.forEach(i => i.scrollIntoView({block: 'center'}));
      await new Promise(r => setTimeout(r, 500));
      return imgs.map(i => ({src: i.getAttribute('src'), w: i.naturalWidth, complete: i.complete}));
    });
    check('card pictures still load offline', coldImg.length === 2 && coldImg.every(i => i.w >= 400), JSON.stringify(coldImg));
    await cold.evaluate(() => { const el = document.querySelector('[data-d="cn-gem3-407"]'); el.scrollIntoView({block:'center'}); el.click(); });
    await new Promise(r => setTimeout(r, 400));
    const chart = await cold.evaluate(() => document.body.innerText);
    check('offline chart uses saved history', /points saved on this phone/.test(chart), chart.includes('points saved') ? 'points saved' : chart.slice(-180).replace(/\n/g, ' | '));
    const cub = await cold.$('img[src*="cn-gem3-407"], img[src*="cn-csv95c-234"]');
    if (cub) await cub.screenshot({path: '/opt/cursor/artifacts/gengar-card-art.png'});
  }
  await cold.close();

  // User data survives reopen and both refresh outcomes.
  await page.evaluate(() => {
    const U = {
      v: 2,
      cards: {'jp-sv2a-201': {entries: [{qty: 2, price: 15000, cur: 'JPY', grade: 'psa_10', date: '2024-05-01'}], jhs: {price: 88, cur: 'CNY', label: '裸卡', date: '2026-02-02T00:00:00.000Z'}}},
      pending: [{url: 'https://www.pricecharting.com/game/pokemon-promo/mew-1', name: 'Pending Mew', set: 'Promo', number: '1', added: '2026-03-03T00:00:00.000Z'}],
      settings: {cur: 'EUR'}
    };
    localStorage.setItem('tcg-user-v1', JSON.stringify(U));
    localStorage.setItem('tcg-filter-v1', JSON.stringify({lang: 'JP', set: 'all', own: 'own'}));
  });
  await setMode('ok', {delay: 0, stamp: null});
  const userReloadAt = Date.now();
  await page.reload({waitUntil: 'domcontentloaded'});
  await waitFor(page, () => document.body.innerText.includes('Pending Mew') && document.body.innerText.includes('Charizard ex SAR'));
  const userText = await page.evaluate(() => document.body.innerText);
  const userStore = await page.evaluate(() => localStorage.getItem('tcg-user-v1'));
  check('collection, wishlist, currency and filter survive reopen', /Pending Mew/.test(userText) && /Charizard ex SAR/.test(userText) && /Owned ×2/.test(userText) && /€/.test(userText) && !/Sylveon ex/.test(userText), userText.slice(0, 220).replace(/\n/g, ' | '));
  check('reopen with saved collection does not fetch prices', priceHits(since(userReloadAt)).length === 0, JSON.stringify(priceHits(since(userReloadAt))));

  // Successful manual refresh, slow network. List must stay up.
  await setMode('slow', {delay: 2500, stamp: '2026-11-07T20:00:00.000Z', mode: 'ok'});
  const refreshAt = Date.now();
  await page.click('#pref');
  await waitFor(page, () => document.getElementById('upd').innerText.includes('Refreshing'));
  const mid = await page.evaluate(() => ({upd: document.getElementById('upd').innerText, body: document.body.innerText.includes('Charizard ex SAR') && document.body.innerText.includes('Pending Mew')}));
  check('slow refresh keeps the saved list on screen', mid.body && /Refreshing/.test(mid.upd), mid.upd);
  await waitFor(page, () => document.getElementById('upd').innerText.includes('Nov 7'), 10000);
  const after = await page.evaluate(() => ({upd: document.getElementById('upd').innerText, text: document.body.innerText, user: localStorage.getItem('tcg-user-v1'), filter: localStorage.getItem('tcg-filter-v1')}));
  const prices = JSON.parse(fs.readFileSync(new URL('../prices.json', import.meta.url), 'utf8'));
  const z = prices.cards.find(c => c.id === 'jp-sv2a-201').prices_usd.psa_10;
  check('manual refresh applies a new price time', /Nov 7/.test(after.upd) && /App v10/.test(after.upd), after.upd);
  check('manual refresh keeps collection data', after.user.includes('Pending Mew') && after.user.includes('15000') && after.user.includes('裸卡') && after.filter.includes('JP'), '');
  check('price file on disk was not rewritten', prices.updated_at === '2026-11-06T19:08:23Z' && z === 541, String(z));
  check('refresh request was manual', priceHits(since(refreshAt)).some(x => x.refresh === '1'), JSON.stringify(priceHits(since(refreshAt))));

  // Failed refresh keeps the newly saved snapshot.
  await setMode('fail', {delay: 400, mode: 'fail'});
  await page.click('#pref');
  await waitFor(page, () => /[Rr]efresh failed/.test(document.getElementById('upd').innerText), 10000);
  const failed = await page.evaluate(() => ({upd: document.getElementById('upd').innerText, text: document.body.innerText, user: localStorage.getItem('tcg-user-v1'), saved: JSON.parse(localStorage.getItem('tcg-market-v1')).prices.updated_at}));
  check('failed refresh keeps cached prices and says so', /Refresh failed/.test(failed.upd) && failed.saved === '2026-11-07T20:00:00.000Z' && /Charizard ex SAR/.test(failed.text) && /Pending Mew/.test(failed.text), failed.upd);
  check('failed refresh does not touch collection', failed.user.includes('15000') && failed.user.includes('Pending Mew'), '');

  // Pull down fallback path. Button already tested; gesture should also refresh.
  await setMode('ok', {delay: 300, stamp: '2026-11-07T21:30:00.000Z'});
  await page.evaluate(() => window.scrollTo(0, 0));
  const client = await page.createCDPSession();
  await client.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: 180, y: 260, id: 0}]});
  for (const y of [300, 360, 430, 500]) {
    await client.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: 180, y, id: 0}]});
    await new Promise(r => setTimeout(r, 30));
  }
  await client.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  let pulled = false;
  try {
    await waitFor(page, () => /1:30 PM/.test(document.getElementById('upd').innerText), 8000);
    pulled = true;
  } catch (e) { pulled = false; }
  const pullUpd = await page.evaluate(() => document.getElementById('upd').innerText);
  check('pull down refreshes prices', pulled, pullUpd);

  await page.screenshot({path: '/opt/cursor/artifacts/gengar-offline-refresh.png', fullPage: false});
  const art = await page.screenshot({path: '/tmp/cards-view.png'});
  void art;
} catch (e) {
  console.error('TEST ERROR', e);
  check('suite ran', false, e.stack || e.message);
  try { await page.screenshot({path: '/opt/cursor/artifacts/gengar-test-failure.png', fullPage: true}); } catch {}
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter(r => !r.ok);
console.log(JSON.stringify({passed: results.filter(r => r.ok).length, failed: failed.length, results}, null, 2));
process.exit(failed.length ? 1 : 0);
