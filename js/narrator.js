// Narrator: pre-generated mp3 (audio/<lang>/<id>.mp3 via audio/manifest.json) -> speechSynthesis -> captions only.
import { segText } from '../data/narration.js';
import { estDur } from './narration-plan.js';

// 0.1 s of 8 kHz silence, played inside a user gesture to unlock the shared audio element (iOS/Android autoplay policy)
function silentWav(n = 800) {
  const b = new Uint8Array(44 + n), dv = new DataView(b.buffer);
  const w = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true); b.fill(128, 44);
  let bin = ''; for (const x of b) bin += String.fromCharCode(x);
  return 'data:audio/wav;base64,' + btoa(bin);
}
const GESTURES = ['touchend', 'pointerup', 'click', 'keydown'];
const START_TIMEOUT = 10000, END_SLACK = 8000; // ms defaults: a clip that never starts / never ends must not stall the queue (instance fields startTimeout / endSlack override)

const LOCALE = { he: ['he-IL', 'he'], ru: ['ru-RU', 'ru'], en: ['en-US', 'en-GB', 'en'] };

export class Narrator {
  constructor() {
    this.lang = 'he'; this.mute = false; this.volume = 0.9;
    this.manifest = new Set(); this.manifestLoaded = false;
    this.onCaption = () => {}; this.onNotice = () => {};
    this.onSpeaking = () => {}; this._sp = false; // onSpeaking(bool): true while a clip is playing or queued (music ducking)
    this.queue = []; this.busy = false; this.paused = false; this.current = null; this.gen = 0;
    this.spoken = []; // test hook: [{id, lang, via}]
    this.voices = [];
    this.el = null; this.unlocked = false; this.blocked = false; this._cur = null; this._probing = new Set();
    this.onBlocked = () => {}; // onBlocked(bool): the browser refused to start sound until the next tap -> show a visible "tap to resume sound"
    this.captionScale = 1; this.startTimeout = START_TIMEOUT; this.endSlack = END_SLACK;
    this.failed = []; // test hook: [{id, reason}] clips that were skipped (error / timeout / blocked)
    this.durCache = new Map(); // `${lang}/${id}` -> real mp3 duration (s), filled from HTMLAudioElement metadata
    if ('speechSynthesis' in window) {
      const load = () => { this.voices = speechSynthesis.getVoices(); };
      load(); try { speechSynthesis.addEventListener('voiceschanged', load); } catch { /* old browsers */ }
    }
  }
  async loadManifest() {
    try {
      const r = await fetch('audio/manifest.json', { cache: 'no-cache' });
      if (r.ok) { const j = await r.json(); this.manifest = new Set(Array.isArray(j) ? j : []); }
    } catch { /* no audio files yet */ }
    this.manifestLoaded = true;
  }
  setLang(l) { this.lang = l; }
  pickVoice(lang) {
    const tags = LOCALE[lang];
    const vs = this.voices.filter((v) => tags.some((t) => v.lang.replace('_', '-').toLowerCase().startsWith(t.toLowerCase())));
    if (!vs.length) return null;
    const score = (v) => (v.localService ? 0 : 2) + (/google|natural|enhanced|premium/i.test(v.name) ? 3 : 0) + (v.lang.replace('_', '-').toLowerCase() === tags[0].toLowerCase() ? 1 : 0);
    return vs.sort((a, b) => score(b) - score(a))[0];
  }
  hasVoice(lang = this.lang) { return !!this.pickVoice(lang); }
  // ids: array of segment ids spoken one after another (composite announcements)
  // entries: 'id' | {id, pause (s of silence after the clip)} | function (called when reached, e.g. end of the intro)
  say(ids, { flush = false } = {}) {
    if (!Array.isArray(ids)) ids = [ids];
    if (flush) this.cancel();
    this.queue.push(...ids);
    this.pump();
  }
  // Clip length: real mp3 duration when known, else the estimate (2.3 s + 0.65 s/word)
  dur(id) {
    const real = this.durCache.get(`${this.lang}/${id}`);
    return real || estDur(segText(id, this.lang));
  }
  // Read mp3 metadata for ids that exist as audio (4 probe elements at a time, never one element per clip);
  // resolves when all are known or after maxMs. A failed probe is ignored: dur() falls back to the estimate.
  preload(ids, maxMs = 0) {
    const lang = this.lang;
    const todo = ids.filter((id) => this.manifest.has(`${lang}/${id}`) && !this.durCache.has(`${lang}/${id}`) && !this._probing.has(`${lang}/${id}`));
    if (!todo.length || typeof Audio === 'undefined') return Promise.resolve();
    todo.forEach((id) => this._probing.add(`${lang}/${id}`));
    const q = todo.slice();
    const worker = async () => {
      let a; try { a = new Audio(); a.preload = 'metadata'; } catch { return; }
      while (q.length) {
        const id = q.shift();
        await new Promise((res) => {
          const to = setTimeout(res, 4000);
          const fin = () => { clearTimeout(to); res(); };
          a.onloadedmetadata = () => { if (Number.isFinite(a.duration) && a.duration > 0) this.durCache.set(`${lang}/${id}`, a.duration); fin(); };
          a.onerror = fin;
          try { a.src = `audio/${lang}/${id}.mp3`; } catch { fin(); }
        });
        this._probing.delete(`${lang}/${id}`);
      }
      try { a.onloadedmetadata = a.onerror = null; a.removeAttribute('src'); a.load(); } catch { /* none */ }
    };
    const all = Promise.all([worker(), worker(), worker(), worker()]);
    return maxMs ? Promise.race([all, new Promise((r) => setTimeout(r, maxMs))]) : all;
  }
  // ---- one persistent <audio> element, unlocked by the first user gesture and reused for every clip.
  // (A new Audio() per clip is blocked by the iOS/Android autoplay policy after the first one: the second clip never started.)
  _audio() {
    if (!this.el) { this.el = new Audio(); this.el.preload = 'auto'; try { this.el.setAttribute('playsinline', ''); } catch { /* none */ } }
    return this.el;
  }
  // Call synchronously inside a user gesture (bindGestureUnlock does this for every tap). Safe to call any number of times.
  unlock() {
    if (typeof Audio === 'undefined') return;
    if (this._cur) { if (this.blocked) this._cur.retry(); return; }   // a clip is waiting for sound permission: this tap is the permission
    if (this.unlocked) return;
    try {
      const a = this._audio(); a.src = silentWav();
      const p = a.play(); this.unlocked = true; // marked at call time: the call itself ran inside the gesture
      p?.then?.(() => { if (!this._cur) { try { a.pause(); } catch { /* none */ } this.setBlocked(false); } }, (e) => { if (e?.name === 'NotAllowedError') this.unlocked = false; });
    } catch { this.unlocked = false; }
  }
  bindGestureUnlock(doc = document) { for (const t of GESTURES) doc.addEventListener(t, () => this.unlock(), { capture: true, passive: true }); }
  setBlocked(v) { if (v !== this.blocked) { this.blocked = v; try { this.onBlocked(v); } catch { /* listener error */ } } }
  cancel() {
    this.gen++; this.queue = []; this.busy = false; this.setSpeaking(false);
    const c = this._cur; this._cur = null; if (c) c.finish('cancel');
    this.setBlocked(false);
    try { speechSynthesis.cancel(); } catch { /* none */ }
    if (this.el) { try { this.el.pause(); } catch { /* none */ } }
  }
  pause() {
    this.paused = true; this.setSpeaking(false);
    try { speechSynthesis.pause(); } catch { /* none */ }
    if (this.el && this._cur) { try { this.el.pause(); } catch { /* none */ } }
  }
  resume() {
    this.paused = false;
    try { speechSynthesis.resume(); } catch { /* none */ }
    if (this.el && this._cur && this.el.paused) { try { this.el.play()?.catch?.((e) => { if (e?.name === 'NotAllowedError') this.setBlocked(true); }); } catch { /* none */ } }
    this.pump();
  }
  setSpeaking(v) { if (v !== this._sp) { this._sp = v; try { this.onSpeaking(v); } catch { /* listener error */ } } }
  async pump() {
    if (this.busy || this.paused) return;
    let id = this.queue.shift();
    if (!id) return this.setSpeaking(false);
    if (typeof id === 'function') { try { id(); } catch { /* callback error */ } return this.pump(); }
    let pause = 0;
    if (typeof id === 'object') { pause = id.pause || 0; id = id.id; }
    this.busy = true; const g = this.gen;
    const text = segText(id, this.lang);
    if (!text) { this.busy = false; return this.pump(); }
    this.onCaption(text, id);
    if (!this.mute) this.setSpeaking(true);
    if (this.mute) { await new Promise((r) => setTimeout(r, Math.min(4000, 400 + text.length * 45))); }
    else await this.speak(id, text, g);
    if (g !== this.gen) return;
    if (pause > 0) { await new Promise((r) => setTimeout(r, pause * 1000)); if (g !== this.gen) return; }
    this.busy = false;
    this.pump();
  }
  async speak(id, text, g) {
    const lang = this.lang;
    if (this.manifest.has(`${lang}/${id}`) && typeof Audio !== 'undefined') {
      const r = await this.playClip(id, text, lang);
      if (r === 'ended' || r === 'cancel' || r === 'blocked') return;   // blocked: caption-only for this clip, the tap-to-resume button is on screen
      if (g !== this.gen) return;
      this.failed.push({ id, reason: r }); try { console.warn(`[narrator] clip ${lang}/${id} skipped: ${r}`); } catch { /* none */ }
      return this.speakTTS(id, text, lang, g);                          // error / timeout: device voice, then the queue continues
    }
    return this.speakTTS(id, text, lang, g);
  }
  // Plays one clip on the shared element. Resolves 'ended' | 'cancel' | 'blocked' | 'error' | 'timeout' | 'load-timeout' | 'rejected'; never rejects, never hangs.
  playClip(id, text, lang) {
    return new Promise((resolve) => {
      const a = this._audio();
      let settled = false, wd = 0, blockT = 0, playing = false;
      const finish = (r) => {
        if (settled) return; settled = true;
        clearTimeout(wd); clearTimeout(blockT); a.onended = a.onerror = a.onplaying = a.onpause = null;
        if (this._cur === rec) this._cur = null;
        if (r === 'blocked') this.failed.push({ id, reason: 'blocked' });
        resolve(r);
      };
      const arm = (ms, why) => { clearTimeout(wd); wd = setTimeout(() => { if (this.paused) return arm(1000, why); finish(why); }, ms); };
      const start = () => {
        let p; try { p = a.play(); } catch { return finish('rejected'); }
        p?.then?.(() => { if (settled) return; this.unlocked = true; this.setBlocked(false); clearTimeout(blockT); }, (e) => {
          if (settled) return;
          if (e?.name === 'AbortError') return;                       // src changed or pause() raced: a newer clip owns the element
          if (e?.name === 'NotAllowedError') {                        // autoplay policy: ask for a tap, keep the schedule moving with captions
            this.unlocked = false; this.setBlocked(true);
            clearTimeout(wd); clearTimeout(blockT);
            blockT = setTimeout(() => finish('blocked'), this.captionScale * Math.min(4000, 400 + text.length * 45));
            return;
          }
          finish('rejected');
        });
      };
      const rec = { id, finish, retry: () => { if (!settled) start(); } };
      this._cur = rec;
      this.spoken.push({ id, lang, via: 'mp3' });
      a.onplaying = () => { playing = true; this.setBlocked(false); arm((Number.isFinite(a.duration) && a.duration > 0 ? a.duration * 1000 : this.dur(id) * 1000) + this.endSlack, 'timeout'); };
      a.onended = () => finish('ended');
      a.onerror = () => finish('error');
      // paused by the system (call, Bluetooth, another tab) while we did not ask for it: try to carry on, ask for a tap if refused
      a.onpause = () => { if (!settled && !this.paused && playing && !a.ended) start(); };
      try { a.volume = this.volume; a.src = `audio/${lang}/${id}.mp3`; } catch { return finish('error'); }
      arm(this.startTimeout, 'load-timeout');
      start();
    });
  }
  speakTTS(id, text, lang, g) {
    return new Promise((res) => {
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
        this.notice('nospeech'); this.spoken.push({ id, lang, via: 'caption' });
        setTimeout(res, Math.min(4000, 600 + text.length * 45)); return;
      }
      const u = new SpeechSynthesisUtterance(text);
      const v = this.pickVoice(lang);
      u.lang = LOCALE[lang][0]; if (v) u.voice = v; else this.notice('novoice');
      u.volume = this.volume; u.rate = 0.92;
      this.spoken.push({ id, lang: u.lang, via: 'tts' });
      let fin = false;
      const done = () => { if (!fin) { fin = true; res(); } };
      u.onend = done; u.onerror = done;
      // safety: some browsers never fire onend
      setTimeout(done, 3000 + text.length * 120);
      try { speechSynthesis.speak(u); } catch { done(); }
    });
  }
  notice(kind) { if (this._n !== kind) { this._n = kind; this.onNotice(kind); } }
}
