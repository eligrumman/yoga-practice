// Narrator tests: the queue never stalls on a failed / missing / hanging clip, one unlocked audio element is reused,
// autoplay rejection shows the tap-to-resume state instead of going silent, and every Hebrew id any plan can request has audio.
import { existsSync, statSync } from 'node:fs';
import { collectHeIds, checkDisk, manifestSet } from '../tools/audio-coverage.mjs';

// ---- fakes (no DOM): an Audio whose behaviour per file is scripted
let constructed = 0;
const behaviour = {}; // id -> 'ok' | 'error' | 'hang' | 'deny' (NotAllowedError until unlocked by a tap) | 'abort'
let tapped = false;
class FakeAudio {
  constructor() { constructed++; this.paused = true; this.ended = false; this.duration = 0.05; this._src = ''; this.volume = 1; }
  get src() { return this._src; }
  set src(v) { this._src = v; this.ended = false; }
  setAttribute() {}
  removeAttribute() {} load() {}
  pause() { this.paused = true; }
  id() { return (this._src.match(/\/([^/]+)\.mp3$/) || [])[1] || (this._src.startsWith('data:') ? '__silence' : ''); }
  play() {
    const id = this.id(), b = behaviour[id] || 'ok';
    if (id === '__silence') { this.paused = false; return Promise.resolve(); }
    if (b === 'deny' && !tapped) return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
    if (b === 'error') { setTimeout(() => this.onerror?.(), 1); return Promise.resolve(); }
    if (b === 'hang') return new Promise(() => {});
    this.paused = false;
    setTimeout(() => { this.onplaying?.(); }, 1);
    setTimeout(() => { this.paused = true; this.ended = true; this.onpause?.(); this.onended?.(); }, 6);
    return Promise.resolve();
  }
}
const FAKES = { window: globalThis, Audio: FakeAudio, SpeechSynthesisUtterance: class { constructor(t) { this.text = t; } },
  speechSynthesis: { getVoices: () => [], addEventListener() {}, cancel() {}, pause() {}, resume() {}, speak(u) { setTimeout(() => u.onend?.(), 1); } } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDS = ['session.intro.arrive', 'session.intro.breath', 'session.intro.safety', 'session.intro.start'];
let Narrator;
const mk = () => { const n = new Narrator(); n.lang = 'he'; n.manifest = new Set(IDS.map((i) => `he/${i}`)); n.manifestLoaded = true; n.startTimeout = 80; n.endSlack = 80; return n; };
const until = async (fn, ms = 6000) => { const t = Date.now(); while (!fn() && Date.now() - t < ms) await sleep(10); return fn(); };

export default async function (ok) {
  const saved = {}; for (const k of Object.keys(FAKES)) { saved[k] = Object.getOwnPropertyDescriptor(globalThis, k); Object.defineProperty(globalThis, k, { value: FAKES[k], configurable: true, writable: true }); }
  ({ Narrator } = await import('../js/narrator.js'));
  try { await body(ok); } finally { for (const k of Object.keys(FAKES)) { if (saved[k]) Object.defineProperty(globalThis, k, saved[k]); else delete globalThis[k]; } }
}
async function body(ok) {
  // 1. happy path: every clip plays in order on ONE audio element
  {
    const n = mk(); for (const k of Object.keys(behaviour)) delete behaviour[k]; tapped = false;
    const before = constructed;
    n.say(IDS); await until(() => n.spoken.length === 4 && !n.busy && !n.queue.length, 3000); await sleep(30);
    ok(JSON.stringify(n.spoken.map((s) => s.id)) === JSON.stringify(IDS), 'narrator: all four clips requested in order');
    ok(n.spoken.every((s) => s.via === 'mp3'), 'narrator: all four played as mp3');
    ok(constructed - before === 1, `narrator: one shared audio element for all clips (constructed ${constructed - before})`);
    ok(n.failed.length === 0, 'narrator: no skipped clips on the happy path');
  }
  // 2. a clip that errors (404 / decode) does not stop the queue
  {
    const n = mk(); for (const k of Object.keys(behaviour)) delete behaviour[k]; behaviour['session.intro.breath'] = 'error';
    n.say(IDS); await until(() => n.spoken.filter((s) => s.via === 'mp3').length === 4 && !n.busy, 5000); await sleep(30);
    ok(n.spoken.filter((s) => s.via === 'mp3').map((s) => s.id).join() === IDS.join(), 'narrator: after an errored clip the later clips still play');
    ok(n.failed.some((f) => f.id === 'session.intro.breath' && f.reason === 'error'), 'narrator: the errored clip is logged as skipped');
  }
  // 3. a clip that never starts or never ends is dropped by the watchdog
  {
    const n = mk(); for (const k of Object.keys(behaviour)) delete behaviour[k]; behaviour['session.intro.arrive'] = 'hang';
    n.say(IDS); await until(() => n.spoken.filter((s) => s.via === 'mp3').length === 4 && !n.busy, 6000); await sleep(30);
    ok(n.spoken.filter((s) => s.via === 'mp3').length === 4, 'narrator: a hanging first clip does not stall the queue');
    ok(n.failed.some((f) => f.id === 'session.intro.arrive' && f.reason === 'load-timeout'), 'narrator: hanging clip reported as load-timeout');
  }
  // 4. an id that is in the plan but not in the manifest is skipped over (device voice / captions), the queue continues
  {
    const n = mk(); n.manifest = new Set(['he/session.intro.arrive', 'he/session.intro.safety']); for (const k of Object.keys(behaviour)) delete behaviour[k];
    n.say(IDS); await until(() => n.spoken.length >= 4 && !n.busy, 5000); await sleep(30);
    ok(n.spoken.map((s) => s.id).join() === IDS.join(), 'narrator: ids missing from the manifest do not stop the queue');
    ok(n.spoken.filter((s) => s.via === 'tts').length === 2 && n.spoken.filter((s) => s.via === 'mp3').length === 2, 'narrator: missing ids use the device voice, the rest play as mp3');
  }
  // 5. autoplay rejection: tap-to-resume state, captions keep moving, a tap restores sound, queue never stalls
  {
    const n = mk(); for (const k of Object.keys(behaviour)) delete behaviour[k]; behaviour['session.intro.breath'] = 'deny'; tapped = false; n.captionScale = 20;
    const flags = []; n.onBlocked = (b) => flags.push(b);
    n.say(IDS);
    ok(await until(() => flags.includes(true), 3000), 'narrator: a rejected play() raises the tap-to-resume state');
    ok(n.blocked === true, 'narrator: blocked flag is set while sound is refused');
    // the user taps: the gesture handler calls unlock() -> the pending clip is retried inside the gesture
    tapped = true; n.unlock();
    await until(() => n.spoken.length >= 4 && !n.busy, 6000); await sleep(40);
    ok(n.spoken.map((s) => s.id).join() === IDS.join(), 'narrator: after a blocked clip the queue continues with every later clip');
    ok(flags.at(-1) === false && n.blocked === false, 'narrator: tap-to-resume state clears once sound plays again');
    ok(n.spoken.filter((s) => s.via === 'mp3').length === 4, 'narrator: the blocked clip was retried and played after the tap');
  }
  // 6. blocked and never tapped: the queue still finishes (caption pace), nothing hangs
  {
    const n = mk(); for (const k of Object.keys(behaviour)) delete behaviour[k]; for (const i of IDS) behaviour[i] = 'deny'; tapped = false; n.captionScale = 0.1;
    n.say(IDS); const done = await until(() => n.spoken.length === 4 && !n.busy && !n.queue.length, 9000);
    ok(done, 'narrator: with sound blocked for every clip the queue still runs through (captions only)');
    ok(n.blocked === true, 'narrator: still showing tap-to-resume after four blocked clips');
  }
  // 7. cancel resolves the pending clip, a later say() works
  {
    const n = mk(); for (const k of Object.keys(behaviour)) delete behaviour[k]; behaviour['session.intro.arrive'] = 'hang'; n.startTimeout = 60000;
    n.say(IDS); await sleep(30); n.cancel(); delete behaviour['session.intro.arrive'];
    ok(!n.busy && n.queue.length === 0 && !n._cur, 'narrator: cancel frees the queue and the current clip');
    n.say(['session.intro.start']); await until(() => n.spoken.at(-1)?.id === 'session.intro.start' && !n.busy, 2000);
    ok(n.spoken.at(-1)?.id === 'session.intro.start', 'narrator: new say() after cancel plays');
  }
  // 8. unlock() runs the silent play on the shared element once, inside the gesture
  {
    const n = mk(); const before = constructed; n.unlock(); n.unlock();
    ok(n.unlocked === true && constructed - before === 1, 'narrator: unlock() creates and unlocks one shared element');
  }

  // ---- id coverage: every Hebrew id any plan can request has a manifest entry, a file, and text
  const { ids, plans, poses } = await collectHeIds();
  const list = [...ids.keys()];
  ok(plans > 1900 && poses >= 40 && list.length > 600, `coverage: enumerated ${plans} plans / ${poses} poses / ${list.length} ids`);
  const r = checkDisk(list);
  ok(r.missingManifest.length === 0, `coverage: every requestable he id is in audio/manifest.json (missing: ${r.missingManifest.slice(0, 5).join(', ')})`);
  ok(r.missingFile.length === 0 && r.emptyFile.length === 0, `coverage: every requestable he id has a non-empty mp3 on disk (missing: ${r.missingFile.slice(0, 5).join(', ')})`);
  ok(r.noText.length === 0, `coverage: every requestable he id has Hebrew text (${r.noText.slice(0, 5).join(', ')})`);
  for (const must of ['session.intro.arrive', 'session.intro.breath', 'session.intro.breath2', 'session.intro.safety', 'session.intro.props', 'session.intro.intention', 'session.intro.intention2', 'session.intro.start', 'session.close.line', 'pose.savasana-side.intro', 'common.switch_sides', 'common.welcome'])
    ok(ids.has(must) && manifestSet().has(`he/${must}`), `coverage: ${must} is requested and recorded`);
  // the manifest has no entry without a file (a dangling entry would 404 on the live site)
  const dangling = [...manifestSet()].filter((m) => !existsSync(new URL(`../audio/${m}.mp3`, import.meta.url)) || statSync(new URL(`../audio/${m}.mp3`, import.meta.url)).size < 1000);
  ok(dangling.length === 0, `coverage: no manifest entry without a file (${dangling.slice(0, 5).join(', ')})`);
}
