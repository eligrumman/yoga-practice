// Original procedural background music (WebAudio only: no audio files, no samples, nothing imitated).
// Soft evolving pads over a slow chord progression, an optional drone / wind / sparse bell, no beat.
// Nothing is created before a user gesture: start() with no gesture only records the wish and returns 'pending'.
//
//   const m = new Music({ ctxFactory, hasGesture });   // both injectable for tests
//   m.start('soft', 0.5)   -> 'started' | 'pending' | 'none'
//   m.duck(true|false)     -> lower the music while the narrator speaks
//   m.stop()               -> fade out and release
//   m.setVolume(v)  m.setMood(id)  m.setPaused(bool)  m.gesture()

export const MOODS = ['soft', 'nature', 'deep'];       // + 'none'
export const MUSIC_DEFAULTS = { mood: 'soft', vol: 0.5 };
export const DUCK_LEVEL = 0.3;       // music level while narration speaks (x normal)
export const DUCK_ATTACK = 0.35;     // time constants (s)
export const DUCK_RELEASE = 1.4;
export const FADE_IN = 4;            // s
export const FADE_OUT = 1.8;         // s
export const MAX_GAIN = 0.55;        // slider 1.0 -> this linear gain on the master bus (pads are quiet by design)

export const normMood = (m) => (m === 'none' || MOODS.includes(m) ? m : MUSIC_DEFAULTS.mood);
export const normVol = (v) => (Number.isFinite(+v) ? Math.min(1, Math.max(0, +v)) : MUSIC_DEFAULTS.vol);
export const volToGain = (v) => normVol(v) ** 1.6 * MAX_GAIN;   // gentle taper so the lower half of the slider is usable

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// Chords are MIDI arrays. Bell scales are MIDI arrays (pentatonic / modal, so any note fits any chord).
export const MOOD_DEFS = {
  soft: {   // "רך": warm major-seventh pads, slow I - vi - IV - V6 in C, a sparse high bell
    chordSec: 15, wave: 'triangle', cutoff: 1100, voices: 3, detune: 7, atk: 0.42, rel: 0.5, level: 0.17,
    chords: [[48, 55, 59, 64, 67], [45, 52, 60, 64, 67], [41, 53, 57, 60, 64], [43, 55, 59, 62, 64]],
    drone: null, wind: 0, bell: { every: [9, 17], scale: [72, 74, 76, 79, 81, 84], vol: 0.05, decay: 7 },
  },
  nature: { // "טבע-דרון": a steady open drone (D + A), suspended chords, a breath of wind, rare low bell
    chordSec: 22, wave: 'sine', cutoff: 800, voices: 2, detune: 9, atk: 0.5, rel: 0.5, level: 0.15,
    chords: [[50, 57, 62, 64, 69], [50, 57, 60, 67, 69], [48, 55, 62, 65, 69], [50, 57, 62, 66, 69]],
    drone: [38, 45], wind: 0.5, bell: { every: [18, 32], scale: [62, 64, 69, 74], vol: 0.04, decay: 9 },
  },
  deep: {   // "שקט עמוק": very slow, low, mostly sine; long chords with long overlaps, no bell
    chordSec: 28, wave: 'sine', cutoff: 520, voices: 2, detune: 5, atk: 0.55, rel: 0.55, level: 0.2,
    chords: [[45, 52, 57, 60, 64], [41, 48, 55, 60, 64], [43, 50, 55, 59, 62], [40, 47, 55, 59, 64]],
    drone: [33], wind: 0, bell: null,
  },
};

const defaultCtxFactory = () => {
  const AC = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
  return AC ? new AC() : null;
};
const defaultHasGesture = () => {
  try { return !!(typeof navigator !== 'undefined' && navigator.userActivation && navigator.userActivation.hasBeenActive); } catch { return false; }
};

export class Music {
  constructor({ ctxFactory = defaultCtxFactory, hasGesture = defaultHasGesture, rand = Math.random } = {}) {
    this.ctxFactory = ctxFactory; this.hasGesture = hasGesture; this.rand = rand;
    this.mood = 'none'; this.vol = MUSIC_DEFAULTS.vol; this.wanted = false; this.running = false; this.paused = false; this.ducked = false;
    this.ctx = null; this.master = null; this.duckG = null; this.fadeG = null; this.reverb = null;
    this.voices = new Set(); this.timers = new Set(); this.gen = 0;
    this.log = [];            // [{t, ev, v}] for tests and debugging
    this._gestureUnlock = null;
  }
  note(ev, v) { const e = { t: this.ctx ? +this.ctx.currentTime.toFixed(2) : 0, ev, v: typeof v === 'number' ? +v.toFixed(3) : v }; this.log.push(e); if (this.log.length > 200) this.log.shift(); }
  get granted() { return !!this.hasGesture(); }
  // current gains for debugging / tests
  gains() { return this.master ? { master: +this.master.gain.value.toFixed(4), duck: +this.duckG.gain.value.toFixed(4), fade: +this.fadeG.gain.value.toFixed(4) } : null; }

  // Begin (or switch to) a mood. Without a user gesture nothing is created: returns 'pending' and waits for gesture().
  start(mood = this.mood, vol = this.vol) {
    this.mood = normMood(mood); this.vol = normVol(vol);
    if (this.mood === 'none') { this.wanted = false; this.stop(); return 'none'; }
    this.wanted = true;
    if (!this.granted) { this.note('pending', 0); this.armGesture(); return 'pending'; }
    return this.boot() ? 'started' : 'pending';
  }
  // Call from any user event (pointerdown / keydown / touchend): lets a pending start go ahead.
  gesture() { if (this.wanted && !this.running && this.mood !== 'none') this.boot(true); }
  armGesture() {
    if (this._gestureUnlock || typeof document === 'undefined') return;
    const go = () => { this.disarmGesture(); this.gesture(); };
    const evs = ['pointerdown', 'keydown', 'touchend', 'click'];
    evs.forEach((e) => document.addEventListener(e, go, { capture: true, passive: true }));
    this._gestureUnlock = () => evs.forEach((e) => document.removeEventListener(e, go, { capture: true }));
  }
  disarmGesture() { this._gestureUnlock?.(); this._gestureUnlock = null; }

  boot(force = false) {
    if (this.running) { this.rebuild(); return true; }
    if (!force && !this.granted) return false;
    try { this.ctx = this.ctx || this.ctxFactory(); } catch { this.ctx = null; }
    if (!this.ctx) { this.note('noaudio', 0); return false; }
    const c = this.ctx;
    this.flushTeardown();
    try { c.resume?.(); } catch { /* ignore */ }
    // bus: voices -> (reverb + dry) -> duckG -> fadeG -> master -> destination
    this.master = c.createGain(); this.duckG = c.createGain(); this.fadeG = c.createGain();
    this.master.gain.value = volToGain(this.vol); this.duckG.gain.value = this.ducked ? DUCK_LEVEL : 1; this.fadeG.gain.value = 0.0001;
    this.bus = c.createGain(); this.bus.gain.value = 1;
    this.reverb = this.makeReverb(c);
    const wet = c.createGain(); wet.gain.value = 0.55;
    this.bus.connect(this.duckG); this.bus.connect(this.reverb); this.reverb.connect(wet); wet.connect(this.duckG);
    this.duckG.connect(this.fadeG); this.fadeG.connect(this.master); this.master.connect(c.destination);
    this.running = true; this.disarmGesture();
    const now = c.currentTime;
    this.fadeG.gain.setValueAtTime(0.0001, now);
    this.fadeG.gain.linearRampToValueAtTime(this.paused ? 0.0001 : 1, now + FADE_IN);
    this.note('start:' + this.mood, volToGain(this.vol));
    this.rebuild();
    return true;
  }

  makeReverb(c) {   // procedural impulse response: decaying stereo noise (~4.5 s)
    const len = Math.floor(c.sampleRate * 4.5), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (this.rand() * 2 - 1) * (1 - i / len) ** 2.6; }
    const cv = c.createConvolver(); cv.buffer = buf; return cv;
  }

  // (re)start the generative loop for the current mood; old voices fade out
  rebuild() {
    this.clearTimers(); this.releaseVoices(2.5);
    const g = ++this.gen; this.chordIdx = 0;
    const def = MOOD_DEFS[this.mood]; if (!def) return;
    if (def.drone) this.startDrone(def);
    if (def.wind) this.startWind(def);
    this.nextChord(g);
    if (def.bell) this.nextBell(g);
  }
  later(fn, sec) { const id = setTimeout(() => { this.timers.delete(id); fn(); }, sec * 1000); this.timers.add(id); }
  clearTimers() { for (const id of this.timers) clearTimeout(id); this.timers.clear(); }

  nextChord(g) {
    if (g !== this.gen || !this.running) return;
    const def = MOOD_DEFS[this.mood], c = this.ctx, now = c.currentTime;
    const chord = def.chords[this.chordIdx++ % def.chords.length];
    const dur = def.chordSec * 1.25;                          // overlap with the next chord
    chord.forEach((m, n) => {
      for (let v = 0; v < def.voices; v++) {
        const o = c.createOscillator(), gn = c.createGain(), f = c.createBiquadFilter();
        o.type = def.wave; o.frequency.value = mtof(m); o.detune.value = (v - (def.voices - 1) / 2) * def.detune * 2 + (this.rand() - 0.5) * 4;
        f.type = 'lowpass'; f.frequency.value = def.cutoff; f.Q.value = 0.3;
        const peak = def.level / (chord.length * def.voices) * (n === 0 ? 1.4 : 1);
        gn.gain.setValueAtTime(0.0001, now);
        gn.gain.linearRampToValueAtTime(peak, now + dur * def.atk);
        gn.gain.linearRampToValueAtTime(peak * 0.75, now + dur * (1 - def.rel * 0.5));
        gn.gain.linearRampToValueAtTime(0.0001, now + dur);
        o.connect(f); f.connect(gn); gn.connect(this.bus);
        o.start(now); o.stop(now + dur + 0.2);
        this.track(o, gn);
      }
    });
    this.later(() => this.nextChord(g), def.chordSec);
  }

  startDrone(def) {
    const c = this.ctx, now = c.currentTime;
    for (const m of def.drone) {
      const o = c.createOscillator(), gn = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      o.type = 'sine'; o.frequency.value = mtof(m);
      gn.gain.value = 0.0001; gn.gain.linearRampToValueAtTime(0.085, now + 8);
      l.frequency.value = 0.04 + this.rand() * 0.04; lg.gain.value = 0.025; l.connect(lg); lg.connect(gn.gain);   // slow swell
      o.connect(gn); gn.connect(this.bus); o.start(now); l.start(now);
      this.track(o, gn, l);
    }
  }
  startWind(def) {   // filtered noise, slowly sweeping: a breath of air, not a sound effect
    const c = this.ctx, now = c.currentTime, len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (this.rand() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.9;
    const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 0.045; lg.gain.value = 260; l.connect(lg); lg.connect(f.frequency);
    const gn = c.createGain(); gn.gain.value = 0.0001; gn.gain.linearRampToValueAtTime(0.1 * def.wind, now + 10);
    const l2 = c.createOscillator(), lg2 = c.createGain(); l2.frequency.value = 0.07; lg2.gain.value = 0.04 * def.wind; l2.connect(lg2); lg2.connect(gn.gain);
    src.connect(f); f.connect(gn); gn.connect(this.bus); src.start(now); l.start(now); l2.start(now);
    this.track(src, gn, l, l2);
  }

  nextBell(g) {
    const def = MOOD_DEFS[this.mood]; if (!def?.bell) return;
    const [a, b] = def.bell.every; const wait = a + this.rand() * (b - a);
    this.later(() => {
      if (g !== this.gen || !this.running) return;
      if (!this.paused) this.bell(def.bell);
      this.nextBell(g);
    }, wait);
  }
  bell(b) {
    const c = this.ctx, now = c.currentTime, m = b.scale[Math.floor(this.rand() * b.scale.length)], f = mtof(m);
    [[1, 1], [2.01, 0.35], [3.98, 0.12]].forEach(([r, a]) => {
      const o = c.createOscillator(), gn = c.createGain();
      o.type = 'sine'; o.frequency.value = f * r;
      gn.gain.setValueAtTime(0.0001, now); gn.gain.linearRampToValueAtTime(b.vol * a, now + 0.03); gn.gain.exponentialRampToValueAtTime(0.0001, now + b.decay);
      o.connect(gn); gn.connect(this.bus); o.start(now); o.stop(now + b.decay + 0.1); this.track(o, gn);
    });
    this.note('bell', m);
  }

  track(...nodes) { const v = { nodes }; this.voices.add(v); const first = nodes[0]; if (first) first.onended = () => { this.voices.delete(v); try { nodes.forEach((n) => n.disconnect?.()); } catch { /* ignore */ } }; }
  releaseVoices(sec) {   // fade running voices out (used when switching mood)
    const c = this.ctx; if (!c) return;
    for (const v of this.voices) for (const n of v.nodes) {
      try { if (n.gain) { n.gain.cancelScheduledValues(c.currentTime); n.gain.setTargetAtTime(0.0001, c.currentTime, sec / 4); } if (n.stop) n.stop(c.currentTime + sec + 0.5); } catch { /* ignore */ }
    }
    this.voices.clear();
  }

  duck(on) {
    on = !!on; if (on === this.ducked) return;
    this.ducked = on;
    if (!this.duckG) return;
    const c = this.ctx;
    try { this.duckG.gain.cancelScheduledValues(c.currentTime); this.duckG.gain.setTargetAtTime(on ? DUCK_LEVEL : 1, c.currentTime, on ? DUCK_ATTACK : DUCK_RELEASE); } catch { /* ignore */ }
    this.note(on ? 'duck' : 'unduck', on ? DUCK_LEVEL : 1);
  }
  setVolume(v) {
    this.vol = normVol(v);
    if (!this.master) return;
    try { this.master.gain.cancelScheduledValues(this.ctx.currentTime); this.master.gain.setTargetAtTime(volToGain(this.vol), this.ctx.currentTime, 0.15); } catch { /* ignore */ }
    this.note('volume', volToGain(this.vol));
  }
  setMood(m) {
    m = normMood(m);
    if (m === this.mood && (this.running || m === 'none')) return this.wanted ? 'started' : 'none';
    return this.start(m, this.vol);
  }
  // pause = practice paused: fade the music out (kept alive) and back in on resume
  setPaused(p) {
    this.paused = !!p;
    if (!this.running) return;
    const c = this.ctx, t = c.currentTime;
    try { this.fadeG.gain.cancelScheduledValues(t); this.fadeG.gain.setTargetAtTime(p ? 0.0001 : 1, t, p ? 0.6 : 1.2); } catch { /* ignore */ }
    this.note(p ? 'pause' : 'resume', p ? 0 : 1);
  }
  stop() {
    this.wanted = false; this.disarmGesture(); this.gen++; this.clearTimers();
    if (!this.running) return;
    this.running = false;
    const c = this.ctx, t = c.currentTime, nodes = [this.fadeG, this.master, this.duckG, this.bus, this.reverb], vs = [...this.voices];
    try { this.fadeG.gain.cancelScheduledValues(t); this.fadeG.gain.setValueAtTime(Math.max(0.0001, this.fadeG.gain.value), t); this.fadeG.gain.linearRampToValueAtTime(0.0001, t + FADE_OUT); } catch { /* ignore */ }
    this.note('stop', 0);
    this.voices = new Set();
    const fn = () => { try { for (const v of vs) for (const n of v.nodes) { try { n.stop?.(); } catch { /* ignore */ } } nodes.forEach((n) => n?.disconnect?.()); c.suspend?.(); } catch { /* ignore */ } };
    this._teardown = { id: setTimeout(() => { this._teardown = null; fn(); }, FADE_OUT * 1000 + 200), fn };
  }
  flushTeardown() { if (this._teardown) { clearTimeout(this._teardown.id); const f = this._teardown.fn; this._teardown = null; try { f(); } catch { /* ignore */ } } }
}

export const music = new Music();
