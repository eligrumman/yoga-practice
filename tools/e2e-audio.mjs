// End-to-end narration test in real browser engines with the REAL autoplay policy (no no-user-gesture flag).
//   node tools/e2e-audio.mjs [--url URL] [--engines webkit-iphone,chromium-pixel,chromium-desktop] [--seconds 150]
//                            [--out review/e2e-audio-DATE] [--plan starter-day-1] [--video] [--expect-ids]
// Starts a session the way a user does (home -> starter plan card -> tap play), instruments HTMLMediaElement
// (play() calls and their promise results, playing / ended / error / pause / stalled, currentTime) and compares the
// narration ids the player requested (window.__narrator.spoken) with the clips that really reached playing + ended.
// Playwright is resolved from `playwright`, $PLAYWRIGHT_DIR, or the local tools cache; browsers from the Playwright cache.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { slotPlan, introSeq, estDur } from '../js/narration-plan.js';
import { ALL_PRESETS } from '../data/plans-preset.js';
import { slots, planSeconds } from '../js/plan.js';
import { POSE_BY_ID } from '../data/poses.js';
import { segText } from '../data/narration.js';
import { attachSpecs } from '../js/specs.js';
import { POSES } from '../data/poses.js';
import { ffprobeDuration, filePath } from './audio-coverage.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const URL_ = arg('--url', 'https://eligrumman.github.io/yoga-practice/').replace(/\/?$/, '/');
const SECONDS = +arg('--seconds', 150);
const OUT = arg('--out', join(HERE, '..', 'review', 'e2e-audio-' + new Date().toISOString().slice(0, 10)));
const PLAN = arg('--plan', 'starter-day-1');
const ENGINES = arg('--engines', 'webkit-iphone,chromium-pixel,chromium-desktop').split(',');
const VIDEO = args.includes('--video');
const STRICT = args.includes('--strict-gesture'); // emulate the iOS rule: an element may start playing only inside a user-gesture window, or once it was unlocked by one

function loadPlaywright() {
  const cands = [process.env.PLAYWRIGHT_DIR, 'playwright', '/Users/user/Laor/.ds-sync/node_modules/playwright'].filter(Boolean);
  for (const c of cands) { try { return createRequire(import.meta.url)(c); } catch { /* next */ } }
  throw new Error('playwright not found: npm i playwright, or set PLAYWRIGHT_DIR');
}
const pw = loadPlaywright();

// If the Playwright-pinned browser revision is not installed, fall back to the newest cached one.
function cachedExe(prefix, rel) {
  const base = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  if (!existsSync(base)) return undefined;
  const dirs = readdirSync(base).filter((d) => d.startsWith(prefix)).sort().reverse();
  for (const d of dirs) { const p = join(base, d, rel); if (existsSync(p)) return p; }
  return undefined;
}
async function launch(type, extraArgs = []) {
  try { return await type.launch({ args: extraArgs }); } catch (e) {
    const exe = type === pw.webkit ? cachedExe('webkit_mac', 'pw_run.sh') : cachedExe('chromium-', 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
    if (!exe) throw e;
    return await type.launch({ executablePath: exe, args: extraArgs });
  }
}

const ENGINE_DEFS = {
  'webkit-iphone': { type: () => pw.webkit, args: [], ctx: () => ({ ...pw.devices['iPhone 14'] }) },
  // Android Chrome enforces document-user-activation-required; make the desktop binary do the same.
  'chromium-pixel': { type: () => pw.chromium, args: ['--autoplay-policy=document-user-activation-required'], ctx: () => ({ ...pw.devices['Pixel 7'] }) },
  'chromium-desktop': { type: () => pw.chromium, args: ['--autoplay-policy=document-user-activation-required'], ctx: () => ({ viewport: { width: 1280, height: 800 } }) },
};

const INIT = () => {
  const L = (window.__aud = { t0: performance.now(), ev: [], n: 0 });
  const now = () => Math.round(performance.now() - L.t0);
  const short = (s) => (s || '').replace(/^.*\/audio\//, 'audio/').replace(/\?.*$/, '');
  const rec = (type, el, extra) => L.ev.push({ t: now(), type, el: el.__n, src: short(el.currentSrc || el.getAttribute('src') || el.src), ct: +(el.currentTime || 0).toFixed(2), dur: Number.isFinite(el.duration) ? +el.duration.toFixed(2) : null, ...extra });
  const origPlay = HTMLMediaElement.prototype.play;
  const strict = !!window.__STRICT_GESTURE;
  let lastGesture = -1e9;
  if (strict) for (const t of ['click', 'touchend', 'pointerup', 'keydown']) window.addEventListener(t, (e) => { if (e.isTrusted) lastGesture = performance.now(); }, true);
  HTMLMediaElement.prototype.play = function (...a) {
    if (!this.__n) {
      this.__n = ++L.n;
      for (const t of ['playing', 'ended', 'error', 'pause', 'stalled', 'waiting', 'emptied', 'abort', 'loadedmetadata']) this.addEventListener(t, () => rec(t, this, t === 'error' ? { code: this.error && this.error.code, msg: this.error && this.error.message } : undefined));
    }
    rec('play()', this, { activation: navigator.userActivation ? { active: navigator.userActivation.isActive, sticky: navigator.userActivation.hasBeenActive } : undefined });
    if (strict) {
      const inGesture = performance.now() - lastGesture < 5000;
      if (!inGesture && !this.__unlocked) { const e = new DOMException('play() failed because the user didn\'t interact with the document first (emulated iOS gesture policy)', 'NotAllowedError'); rec('play-REJECTED', this, { err: `${e.name}: ${e.message}` }); return Promise.reject(e); }
      if (inGesture) this.__unlocked = true;
    }
    const p = origPlay.apply(this, a);
    if (p && p.then) p.then(() => rec('play-resolved', this), (e) => rec('play-REJECTED', this, { err: `${e && e.name}: ${e && e.message}` }));
    return p;
  };
  try {
    const os = window.speechSynthesis && window.speechSynthesis.speak;
    if (os) window.speechSynthesis.speak = function (u) { L.ev.push({ t: now(), type: 'tts.speak', text: (u.text || '').slice(0, 40) }); return os.call(this, u); };
  } catch { /* none */ }
  window.addEventListener('error', (e) => L.ev.push({ t: now(), type: 'page-error', msg: String(e.message) }));
  window.addEventListener('unhandledrejection', (e) => L.ev.push({ t: now(), type: 'unhandled-rejection', msg: String(e.reason) }));
};

// expected narration for the first minute: intro ids, then the t=0 event of pose 1 (durations from the real clips)
async function expectedIds(planId) {
  await attachSpecs(POSES);
  const plan = ALL_PRESETS.find((p) => p.id === planId);
  const minutes = planSeconds(plan.items, 5, 1) / 60;
  const dur = (id) => { const d = ffprobeDuration(filePath(id)); return d > 0 ? d : estDur(segText(id, 'he')); };
  const intro = introSeq({ lang: 'he', level: 'full', minutes }).map((x) => x.id);
  const s0 = slots(plan.items)[0];
  const r = slotPlan({ lang: 'he', level: 'full', poseId: s0.pose.id, side: s0.side, sides: s0.sides, hold: s0.hold, lvl: s0.level, dur, announced: false, lastSavasana: false, minutes });
  const first = r.events.filter((e) => e.t <= 0.01).flatMap((e) => e.items.map((x) => x.id));
  return { intro, first, minutes };
}

async function runEngine(name) {
  const def = ENGINE_DEFS[name];
  const dir = join(OUT, name); mkdirSync(dir, { recursive: true });
  const browser = await launch(def.type(), def.args);
  const ctxOpts = { ...def.ctx(), locale: 'he-IL', ...(VIDEO ? { recordVideo: { dir: join(dir, 'video'), size: { width: 390, height: 844 } } } : {}) };
  const ctx = await browser.newContext(ctxOpts);
  if (STRICT) await ctx.addInitScript(() => { window.__STRICT_GESTURE = true; });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const lines = []; const T0 = Date.now();
  const log = (s) => { const l = `[${((Date.now() - T0) / 1000).toFixed(1).padStart(6)}s] ${s}`; lines.push(l); };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log(`console.${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => log(`PAGEERROR ${e.message}`));
  page.on('requestfailed', (r) => log(`REQFAILED ${r.url().replace(URL_, '')} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.url().includes('/audio/') && r.status() !== 200 && r.status() !== 206) log(`HTTP ${r.status()} ${r.url().replace(URL_, '')}`); });

  // first visit: skip only the health sheet, everything else default (music default is on, like a real first session)
  await page.goto(URL_ + '?e2e=' + Date.now(), { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.setItem('hyf.healthSeen', 'true'); localStorage.setItem('hyf.lang', JSON.stringify('he')); localStorage.setItem('hyf.settings', JSON.stringify({ wake: false })); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(dir, '01-home.png') });
  // tap the play button of the --plan card on home (a real touch/mouse gesture); older builds without data-plan: the first starter card
  const byId = page.locator(`button[data-plan="${PLAN}"]`).first();
  const card = (await byId.count()) ? byId : page.locator(`#starter .btn.primary`).first();
  await card.scrollIntoViewIfNeeded();
  const isTouch = !!ctxOpts.hasTouch;
  if (isTouch) await card.tap(); else await card.click();
  log(`tapped play on the ${PLAN} card (${isTouch ? 'touch' : 'mouse'})`);
  const tPlay = Date.now();
  const exp = await expectedIds(PLAN);
  log(`expected intro: ${exp.intro.join(', ')}; pose-1 t=0: ${exp.first.join(', ')}`);
  let shot = 2, nextShot = 8000;
  const samples = [];
  while (Date.now() - tPlay < SECONDS * 1000) {
    await page.waitForTimeout(1000);
    const s = await page.evaluate(() => ({
      name: document.querySelector('.p-name')?.textContent || '', cap: document.querySelector('.caption')?.textContent || '', on: document.querySelector('.tx.on')?.getAttribute('data-id') || '',
      notice: document.querySelector('.notice:not([hidden])')?.textContent || '', resume: !!document.querySelector('.tap-resume:not([hidden])'),
      spoken: (window.__narrator?.spoken || []).length, busy: window.__narrator?.busy, q: (window.__narrator?.queue || []).length,
    })).catch(() => null);
    if (s) samples.push({ t: Date.now() - tPlay, ...s });
    if (Date.now() - tPlay > nextShot) { await page.screenshot({ path: join(dir, `${String(shot++).padStart(2, '0')}-t${Math.round((Date.now() - tPlay) / 1000)}s.png`) }).catch(() => {}); nextShot += 25000; }
  }
  await page.screenshot({ path: join(dir, '99-end.png') }).catch(() => {});
  const data = await page.evaluate(() => ({ ev: window.__aud.ev, spoken: (window.__narrator?.spoken || []).slice(), notice: window.__narrator?._n || null, ua: navigator.userAgent }));
  await ctx.close(); await browser.close();
  return analyse(name, dir, data, samples, exp, lines, tPlay - T0);
}

function analyse(name, dir, data, samples, exp, lines, tPlayOff) {
  const ev = data.ev;
  const clips = []; // one per requested mp3/tts id, in request order
  const byEl = {};
  for (const e of ev) if (e.el) (byEl[e.el] ||= []).push(e);
  const playsFor = (id) => ev.filter((e) => e.type === 'play()' && (e.src || '').endsWith(`/${id}.mp3`));
  const findEvt = (id, type) => ev.filter((e) => e.type === type && (e.src || '').endsWith(`/${id}.mp3`));
  let spokenIdx = 0;
  for (const sp of data.spoken) {
    const c = { id: sp.id, via: sp.via, played: false, ended: false, rejected: null, error: null, tStart: null, tEnd: null, maxCt: 0, dur: null };
    if (sp.via === 'mp3') {
      const pl = findEvt(sp.id, 'playing'), en = findEvt(sp.id, 'ended'), rj = findEvt(sp.id, 'play-REJECTED'), er = findEvt(sp.id, 'error');
      c.played = pl.length > 0; c.ended = en.length > 0; c.rejected = rj[0]?.err || null; c.error = er[0] ? `code ${er[0].code}` : null;
      c.tStart = pl[0]?.t ?? null; c.tEnd = en[0]?.t ?? null;
      const all = ev.filter((e) => (e.src || '').endsWith(`/${sp.id}.mp3`) && e.ct != null); c.maxCt = Math.max(0, ...all.map((e) => e.ct)); c.dur = all.find((e) => e.dur)?.dur ?? null;
      c.calls = playsFor(sp.id).length;
    }
    clips.push(c); spokenIdx++;
  }
  const reqIds = data.spoken.map((s) => s.id);
  const want = [...exp.intro, ...exp.first];
  const prefixOk = want.every((id, i) => reqIds[i] === id);
  const failures = [];
  if (!prefixOk) failures.push(`requested order differs from expected: want [${want.join(', ')}] got [${reqIds.slice(0, want.length).join(', ')}]`);
  const need = Math.min(want.length, clips.length);
  if (clips.length < want.length) failures.push(`only ${clips.length} of ${want.length} expected clips were even requested`);
  clips.slice(0, want.length).forEach((c, i) => {
    if (c.via !== 'mp3') failures.push(`#${i + 1} ${c.id}: played via ${c.via} not mp3`);
    else if (!c.played) failures.push(`#${i + 1} ${c.id}: never reached 'playing'${c.rejected ? ` (play() REJECTED: ${c.rejected})` : ''}${c.error ? ` (media error ${c.error})` : ''}`);
    else if (!c.ended && !(c.dur && c.maxCt >= c.dur - 0.3)) failures.push(`#${i + 1} ${c.id}: playing but never ended (currentTime ${c.maxCt}/${c.dur})`);
  });
  const rej = ev.filter((e) => e.type === 'play-REJECTED'); if (rej.length) failures.push(`${rej.length} play() rejection(s): ${[...new Set(rej.map((r) => r.err))].join(' | ')}`);
  const errs = ev.filter((e) => ['error', 'page-error', 'unhandled-rejection'].includes(e.type)); if (errs.length) failures.push(`${errs.length} media/page error(s): ${errs.slice(0, 3).map((e) => `${e.type} ${e.src || ''} ${e.msg || e.code || ''}`).join(' | ')}`);
  // stall: a clip that ended but whose successor started more than pause+4 s later (max pause in the intro is 8 s)
  const mp3 = clips.filter((c) => c.played && c.tEnd != null).sort((a, b) => a.tStart - b.tStart);
  const gaps = []; for (let i = 1; i < mp3.length; i++) gaps.push(+((mp3[i].tStart - mp3[i - 1].tEnd) / 1000).toFixed(1));
  const stall = gaps.filter((g) => g > 12).length; if (stall) failures.push(`${stall} inter-clip gap(s) over 12 s: ${gaps.join(', ')}`);
  const resumeShown = samples.some((s) => s.resume);
  const lastSample = samples[samples.length - 1] || {};
  const out = { engine: name + (STRICT ? ' [strict-gesture emulation]' : ''), ua: data.ua, requested: clips.length, expectedFirst: want.length, playedOk: clips.filter((c) => c.played && c.ended).length, mp3Requested: clips.filter((c) => c.via === 'mp3').length, ttsFallback: clips.filter((c) => c.via !== 'mp3').length, rejections: rej.length, mediaErrors: errs.length, gaps, resumeAffordanceShown: resumeShown, lastPoseName: lastSample.name, failures, pass: failures.length === 0, clips };
  writeFileSync(join(dir, 'events.json'), JSON.stringify(data.ev, null, 1));
  writeFileSync(join(dir, 'samples.json'), JSON.stringify(samples, null, 1));
  const txt = [
    `engine: ${name}`, `ua: ${data.ua}`, `plan: ${PLAN}  url: ${URL_}`, '',
    'REQUESTED vs PLAYED (time = ms since page load, from HTMLMediaElement events)',
    'idx  id                                   via  calls play ended  start(ms)  end(ms)  ct/dur',
    ...clips.map((c, i) => `${String(i + 1).padStart(3)}  ${c.id.padEnd(36)} ${c.via.padEnd(4)} ${String(c.calls ?? '-').padStart(3)}   ${c.played ? 'Y' : 'N'}    ${c.ended ? 'Y' : 'N'}   ${String(c.tStart ?? '-').padStart(8)}  ${String(c.tEnd ?? '-').padStart(7)}  ${c.maxCt}/${c.dur}${c.rejected ? '  REJECTED ' + c.rejected : ''}${c.error ? '  ERROR ' + c.error : ''}`),
    '', `gaps between consecutive clips (s): ${gaps.join(', ')}`, `failures: ${failures.length ? '\n  - ' + failures.join('\n  - ') : 'none'}`,
    '', 'RAW MEDIA EVENTS', ...ev.map((e) => `${String(e.t).padStart(7)}ms el#${e.el ?? '-'} ${e.type.padEnd(15)} ${e.src || e.text || e.msg || ''} ct=${e.ct ?? ''}${e.err ? ' ' + e.err : ''}${e.activation ? ' activation=' + JSON.stringify(e.activation) : ''}`),
    '', 'PAGE LOG', ...lines,
  ].join('\n');
  writeFileSync(join(dir, 'log.txt'), txt);
  return out;
}

// Scenario: the session starts with NO user gesture (deep link / reload) under the strict policy, so sound is refused.
// Expect: a visible "tap to resume sound" button, captions and the schedule keep moving, one tap restores the sound.
async function runNoTap(name) {
  const def = ENGINE_DEFS[name]; const dir = join(OUT, name + '-no-tap'); mkdirSync(dir, { recursive: true });
  const browser = await launch(def.type(), def.args);
  const ctx = await browser.newContext({ ...def.ctx(), locale: 'he-IL', ...(VIDEO ? { recordVideo: { dir: join(dir, 'video'), size: { width: 390, height: 844 } } } : {}) });
  await ctx.addInitScript(() => { window.__STRICT_GESTURE = true; }); await ctx.addInitScript(INIT);
  const page = await ctx.newPage(); const failures = []; const lines = []; const T0 = Date.now();
  const log = (x) => lines.push(`[${((Date.now() - T0) / 1000).toFixed(1).padStart(6)}s] ${x}`);
  await page.goto(URL_ + '?e2e=' + Date.now()); await page.evaluate(() => { localStorage.setItem('hyf.healthSeen', 'true'); localStorage.setItem('hyf.lang', JSON.stringify('he')); localStorage.setItem('hyf.settings', JSON.stringify({ wake: false, music: 'none' })); });
  await page.goto(URL_ + `?e2e=${Date.now()}#/player/preset:${PLAN}`); // no click, no tap
  const btn = page.locator('.tap-resume:not([hidden])');
  try { await btn.waitFor({ timeout: 15000 }); log('tap-to-resume button visible'); } catch { failures.push('no visible tap-to-resume button after sound was refused'); }
  await page.screenshot({ path: join(dir, '01-blocked-tap-to-resume.png') });
  const capBefore = await page.evaluate(() => document.querySelector('.p-name')?.textContent + ' | ' + (document.querySelector('.tx.on')?.textContent || document.querySelector('.caption')?.textContent || ''));
  await page.waitForTimeout(9000);
  const progressed = await page.evaluate(() => ({ spoken: window.__narrator.spoken.length, name: document.querySelector('.p-name')?.textContent }));
  log(`while blocked: spoken(requested) ${progressed.spoken}, caption/name ${capBefore} -> ${progressed.name}`);
  if (progressed.spoken < 2) failures.push(`schedule stalled while sound was blocked (only ${progressed.spoken} clips requested in 9 s)`);
  const evBefore = (await page.evaluate(() => window.__aud.ev.length));
  if (await btn.count()) { if (def.ctx().hasTouch) await btn.tap(); else await btn.click(); log('tapped the button'); }
  await page.waitForTimeout(14000);
  const after = await page.evaluate((n) => ({ playing: window.__aud.ev.slice(n).filter((e) => e.type === 'playing' && /audio\/he\//.test(e.src || '')).map((e) => e.src), btnHidden: !document.querySelector('.tap-resume:not([hidden])'), rej: window.__aud.ev.slice(n).filter((e) => e.type === 'play-REJECTED').length }), evBefore);
  log(`after tap: playing ${JSON.stringify(after.playing)}, button hidden ${after.btnHidden}, rejections ${after.rej}`);
  if (!after.playing.length) failures.push('sound did not resume after tapping the button');
  if (!after.btnHidden) failures.push('tap-to-resume button still visible after sound resumed');
  await page.screenshot({ path: join(dir, '02-after-tap.png') });
  const ev = await page.evaluate(() => window.__aud.ev); writeFileSync(join(dir, 'events.json'), JSON.stringify(ev, null, 1));
  writeFileSync(join(dir, 'log.txt'), [...lines, '', ...ev.map((e) => `${String(e.t).padStart(7)}ms ${e.type.padEnd(15)} ${e.src || ''} ${e.err || ''}`)].join('\n'));
  await ctx.close(); await browser.close();
  return { engine: name + ' [no-tap scenario, strict-gesture]', pass: failures.length === 0, failures, requested: progressed.spoken, expectedFirst: 0, playedOk: after.playing.length, mp3Requested: 0, ttsFallback: 0, rejections: -1, mediaErrors: 0, gaps: [], resumeAffordanceShown: !failures.some((f) => /no visible/.test(f)) };
}

mkdirSync(OUT, { recursive: true });
const results = [];
if (args.includes('--no-tap')) {
  for (const e of ENGINES) { try { results.push(await runNoTap(e)); } catch (err) { results.push({ engine: e + ' no-tap', pass: false, failures: [`harness error: ${err.message}`], gaps: [] }); } const r = results.at(-1); console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.engine}`); for (const f of r.failures) console.log('   - ' + f); }
  writeFileSync(join(OUT, 'summary-no-tap.json'), JSON.stringify(results, null, 1));
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}
for (const e of ENGINES) {
  try { results.push(await runEngine(e)); } catch (err) { results.push({ engine: e, pass: false, failures: [`harness error: ${err.message}`], requested: 0, expectedFirst: 0, playedOk: 0, mp3Requested: 0, ttsFallback: 0, rejections: 0, mediaErrors: 0, gaps: [] }); }
  const r = results[results.length - 1];
  console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.engine}: requested ${r.requested}, expected-first ${r.expectedFirst}, played+ended ${r.playedOk}, tts/caption fallback ${r.ttsFallback}, rejections ${r.rejections}, errors ${r.mediaErrors}`);
  for (const f of r.failures) console.log('   - ' + f);
}
const md = ['| engine | expected (intro + pose 1) | requested | played+ended | tts fallback | play() rejected | media errors | max gap s | tap-to-resume shown | result |', '|---|---|---|---|---|---|---|---|---|---|',
  ...results.map((r) => `| ${r.engine} | ${r.expectedFirst} | ${r.requested} | ${r.playedOk} | ${r.ttsFallback} | ${r.rejections} | ${r.mediaErrors} | ${(r.gaps || []).length ? Math.max(...r.gaps) : '-'} | ${r.resumeAffordanceShown ? 'yes' : 'no'} | ${r.pass ? 'PASS' : 'FAIL'} |`)].join('\n');
writeFileSync(join(OUT, 'summary.md'), `# e2e audio ${URL_}\n\nplan ${PLAN}, ${SECONDS}s real time per engine\n\n${md}\n\n${results.flatMap((r) => r.failures.map((f) => `- ${r.engine}: ${f}`)).join('\n')}\n`);
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(results.map(({ clips, ...r }) => r), null, 1));
console.log('\n' + md);
process.exit(results.every((r) => r.pass) ? 0 : 1);
