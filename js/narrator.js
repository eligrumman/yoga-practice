// Narrator: pre-generated mp3 (audio/<lang>/<id>.mp3 via audio/manifest.json) -> speechSynthesis -> captions only.
import { segText } from '../data/narration.js';
import { estDur } from './narration-plan.js';

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
  // Read mp3 metadata for ids that exist as audio; resolves when all are known or after maxMs.
  preload(ids, maxMs = 0) {
    const lang = this.lang;
    const jobs = ids.filter((id) => this.manifest.has(`${lang}/${id}`) && !this.durCache.has(`${lang}/${id}`)).map((id) => new Promise((res) => {
      try {
        const a = new Audio(); a.preload = 'metadata';
        a.onloadedmetadata = () => { if (Number.isFinite(a.duration) && a.duration > 0) this.durCache.set(`${lang}/${id}`, a.duration); res(); };
        a.onerror = () => res();
        a.src = `audio/${lang}/${id}.mp3`;
      } catch { res(); }
    }));
    if (!jobs.length) return Promise.resolve();
    const all = Promise.all(jobs);
    return maxMs ? Promise.race([all, new Promise((r) => setTimeout(r, maxMs))]) : all;
  }
  cancel() {
    this.gen++; this.queue = []; this.busy = false; this.current = null; this.setSpeaking(false);
    try { speechSynthesis.cancel(); } catch { /* none */ }
    if (this.audioEl) { try { this.audioEl.pause(); } catch { /* none */ } this.audioEl = null; }
  }
  pause() {
    this.paused = true; this.setSpeaking(false);
    try { speechSynthesis.pause(); } catch { /* none */ }
    if (this.audioEl) this.audioEl.pause();
  }
  resume() {
    this.paused = false;
    try { speechSynthesis.resume(); } catch { /* none */ }
    if (this.audioEl) this.audioEl.play().catch(() => {});
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
  speak(id, text, g) {
    const lang = this.lang;
    if (this.manifest.has(`${lang}/${id}`)) {
      return new Promise((res) => {
        const a = new Audio(`audio/${lang}/${id}.mp3`);
        a.volume = this.volume; this.audioEl = a;
        this.spoken.push({ id, lang, via: 'mp3' });
        const done = () => { if (this.audioEl === a) this.audioEl = null; res(); };
        a.onended = done;
        a.onerror = () => { this.speakTTS(id, text, lang, g).then(res); };
        a.play().catch(() => { this.speakTTS(id, text, lang, g).then(res); });
      });
    }
    return this.speakTTS(id, text, lang, g);
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
