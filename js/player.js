// Guided player: timer, looping figure, narration schedule, next preview, finish screen.
import { Figure, Animator, renderStatic, viewToggle } from './figure.js';
import { slots, planSeconds, fmtTime } from './plan.js';
import { tr, poseOf, finishStats } from './i18n.js';
import { store, streak, countsForStreak } from './store.js';
import { NARR_LEVELS, slotPlan, introSeq, introSeconds, poseV2Ids, sessionIds, closingPlays } from './narration-plan.js';
import { segText } from '../data/narration.js';
import { LEVEL_LABELS } from '../data/poses.js';
import { transcriptFor } from './transcript.js';
import { music, MOODS, normMood } from './music.js';

const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, ''); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
const SVGNS = 'http://www.w3.org/2000/svg';

export class Player {
  constructor(root, { plan, narrator, lang, onExit, onFinish }) {
    this.root = root; this.plan = plan; this.nar = narrator; this.lang = lang; this.onExit = onExit; this.onFinish = onFinish;
    this.st = store.settings;
    this.mult = this.st.holdMult; this.trans = this.st.transition;
    this.list = slots(plan.items);
    this.idx = 0; this.phase = 'hold'; this.paused = false; this.done = false;
    this.holdTotal = 0; this.remain = 0; this.elapsedAll = 0; this.actualSec = 0; this.totalAll = planSeconds(plan.items, this.trans, this.mult);
    this.halfSaid = false; this.nextSaid = false; this.midSaid = false; this.t0 = 0; this.timer = 0;
    this.audioCtx = null; this.wake = null;
    this.events = []; this.evIdx = 0; this.announced = -1; this.closed = false; this.introLeft = 0; this.introT = 0; this.introSpent = 0;
    this.build();
  }
  T(k, sub) { return tr(k, this.lang, sub); }

  build() {
    const T = (k, s) => this.T(k, s);
    this.anim?.destroy();
    this.root.innerHTML = '';
    this.svg = document.createElementNS(SVGNS, 'svg');
    this.svg.setAttribute('class', 'fig big'); this.svg.setAttribute('role', 'img');
    this.fig = new Figure(this.svg); this.anim = new Animator(this.fig);
    const mk = (cls) => { const v = document.createElementNS(SVGNS, 'svg'); v.setAttribute('class', cls); v.setAttribute('aria-hidden', 'true'); return v; };
    this.nextSvg = mk('fig mini'); this.nextBigSvg = mk('fig fs-nextbig-fig');
    this.elCount = el('span', { class: 'count', 'aria-live': 'off' }, '0:00');
    const R = 18, C = 2 * Math.PI * R;
    this.ringC = C;
    const circ = (attrs) => { const c = document.createElementNS(SVGNS, 'circle'); for (const [k, v] of Object.entries(attrs)) c.setAttribute(k, v); return c; };
    this.ringFg = circ({ class: 'ring-fg', cx: 22, cy: 22, r: R, 'stroke-dasharray': C, 'stroke-dashoffset': 0 });
    const ring = document.createElementNS(SVGNS, 'svg'); ring.setAttribute('viewBox', '0 0 44 44'); ring.setAttribute('class', 'ring'); ring.setAttribute('aria-hidden', 'true');
    ring.append(circ({ class: 'ring-bg', cx: 22, cy: 22, r: R }), this.ringFg);
    this.elName = el('h2', { class: 'p-name' });
    this.elSub = el('span', { class: 'p-sub' });
    this.elBarTxt = el('span', { class: 'bar-txt' });
    this.elSide = el('div', { class: 'fs-side', hidden: true });
    this.elLines = el('ol', { class: 'tx-lines', 'aria-label': T('transcript') });
    this.elCap = el('div', { class: 'caption fs-cap', 'aria-live': 'polite' });
    this.elNotice = el('div', { class: 'notice', hidden: true });
    this.btnSkipIntro = el('button', { class: 'btn skip-intro', hidden: true, onclick: () => this.skipIntro() }, T('skipIntro'));
    this.elNextName = el('span', { class: 'next-name' });
    this.elNextBigName = el('div', { class: 'fs-nextbig-name' });
    this.elNext = el('div', { class: 'next fs-next' }, this.nextSvg, el('span', { class: 'fs-next-txt' }, el('span', { class: 'next-label' }, T('next')), this.elNextName));
    this.elNextBig = el('div', { class: 'fs-nextbig', hidden: true }, el('div', { class: 'next-label' }, T('next')), this.nextBigSvg, this.elNextBigName);
    this.elBar = el('div', { class: 'bar-fill' });
    this.btnPause = el('button', { class: 'btn big-btn', 'data-act': 'pause', onclick: () => this.togglePause() }, '⏸');
    this.btnPause.setAttribute('aria-label', T('pause')); this.btnPause.title = T('pause');
    const ib = (act, icon, label, fn, cls = '') => el('button', { class: 'btn icon ' + cls, 'data-act': act, onclick: fn, 'aria-label': label, title: label }, icon);
    this.btnMute = el('button', { class: 'btn', onclick: () => this.toggleMute() }, '');
    this.settingsBox = this.buildSettings();
    this.btnSettings = ib('settings', '⚙', T('settings'), () => { this.settingsBox.hidden = !this.settingsBox.hidden; this.btnSettings.setAttribute('aria-expanded', String(!this.settingsBox.hidden)); this.showBar(); });
    this.btnSettings.setAttribute('aria-expanded', 'false');
    this.pinned = !!this.st.barPin;
    this.btnHandle = el('button', { class: 'fs-handle', 'aria-pressed': String(this.pinned), onclick: () => this.handleClick() }, el('span', { class: 'fs-grip' }));
    this.btnHandle.setAttribute('aria-label', T('pinBar')); this.btnHandle.title = T('pinBar');
    this.bar = el('div', { class: 'p-ctrl', id: 'p-ctrl' },
      this.elNext,
      ib('prev', '⏮', T('prev'), () => this.jump(-1)),
      ib('restart', '↺', T('restart'), () => this.restartPose()),
      this.btnPause,
      ib('plus10', '+10', T('plus10'), () => this.plus10(), 'txt'),
      ib('skip', '⏭', T('skip'), () => this.jump(1)),
      this.btnSettings);
    this.pl = el('div', { class: 'player fs bar-on' + (this.pinned ? ' pinned' : '') },
      el('div', { class: 'p-bar fs-line', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': this.plan.name }, this.elBar),
      el('header', { class: 'fs-top' },
        el('button', { class: 'fs-exit', onclick: () => this.exit(), 'aria-label': T('exit'), title: T('exit') }, '✕'),
        el('div', { class: 'fs-title' }, this.elName, el('div', { class: 'fs-meta' }, this.elSub, ' ', this.elBarTxt)),
        el('div', { class: 'fs-ring' }, ring, this.elCount)),
      this.elNotice,
      el('div', { class: 'fs-stage' },
        el('div', { class: 'p-fig' }, this.svg, viewToggle(), this.elSide),
        el('div', { class: 'fs-tx' }, this.elCap, this.btnSkipIntro, this.elLines, this.elNextBig)),
      el('div', { class: 'fs-foot' }, this.settingsBox, this.btnHandle, this.bar));
    this.root.append(this.pl);
    this.lineEls = new Map(); this.onEl = null;
    this.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.pl.style.setProperty('--bar-h', (this.bar.offsetHeight + this.btnHandle.offsetHeight) + 'px'));
      this._ro.observe(this.bar);
    }
    // bar auto-hide: any interaction shows it; ~4 s of quiet hides it (never while paused, pinned, or the settings sheet is open)
    this._act = () => this.showBar();
    for (const ev of ['pointerdown', 'pointermove', 'keydown', 'touchstart']) this.pl.addEventListener(ev, this._act, { passive: true });
    this.pl.addEventListener('focusin', this._act);
    this._vis = () => { if (document.visibilityState === 'visible' && !this.done) this.acquireWake(); };
    document.addEventListener('visibilitychange', this._vis);
    this.nar.onCaption = (t, id) => this.caption(t, id);
    this.nar.onSpeaking = (v) => { music.duck(v); if (!v) this.setOn(null, true); };
    this.nar.onNotice = (k) => { this.elNotice.hidden = false; this.elNotice.textContent = k === 'novoice' ? T('noVoice') : T('noSpeech'); };
    this.refreshMute();
    this.armHide();
  }

  // ---- bar visibility
  showBar() {
    if (!this.barOn) { this.barOn = true; this.pl.classList.add('bar-on'); }
    this.armHide();
  }
  armHide() {
    clearTimeout(this.hideT);
    if (this.done) return;
    this.hideT = setTimeout(() => this.hideBar(), 4000);
  }
  hideBar() {
    const a = document.activeElement;
    if (this.pinned || this.paused || !this.settingsBox.hidden || (a && this.bar.contains(a) && a.matches?.(':focus-visible'))) { this.armHide(); return; }
    this.barOn = false; this.pl.classList.remove('bar-on');
  }
  handleClick() {
    if (!this.barOn) return this.showBar();
    this.pinned = !this.pinned; store.saveSettings({ barPin: this.pinned }); this.st = store.settings;
    this.pl.classList.toggle('pinned', this.pinned); this.btnHandle.setAttribute('aria-pressed', String(this.pinned));
    this.armHide();
  }
  get barOn() { return this._barOn !== false; }
  set barOn(v) { this._barOn = v; }

  // ---- fullscreen (Fullscreen API where it exists; iOS Safari falls back to the fixed full-viewport layout)
  enterFs() {
    try {
      const r = this.root.requestFullscreen || this.root.webkitRequestFullscreen;
      if (r && !document.fullscreenElement) { const p = r.call(this.root, { navigationUI: 'hide' }); p?.catch?.(() => {}); }
    } catch { /* not allowed or unsupported */ }
  }
  exitFs() {
    try {
      if (document.fullscreenElement === this.root || document.webkitFullscreenElement === this.root) (document.exitFullscreen || document.webkitExitFullscreen).call(document)?.catch?.(() => {});
    } catch { /* none */ }
  }

  // ---- transcript: the full text of the current pose; the line being spoken is highlighted
  renderTranscript(s) {
    const { lines, notes } = transcriptFor({ lang: this.nlang, pose: s.pose, lvl: s.level, side: s.side, sides: s.sides });
    this.elLines.innerHTML = ''; this.lineEls = new Map(); this.onEl = null;
    for (const l of lines) {
      const li = el('li', { class: 'tx tx-' + l.kind, 'data-id': l.id }, l.kind === 'fix' ? el('span', { class: 'tx-tag' }, tr('mistake', this.nlang)) : null, l.text);
      this.lineEls.set(l.id, li); this.elLines.append(li);
    }
    for (const n of notes) this.elLines.append(el('li', { class: 'tx-note tx-' + n.kind }, el('strong', {}, tr(n.kind, this.nlang) + ': '), n.text));
    this.elLines.scrollTop = 0;
    this.elCap.textContent = '';
  }
  setOn(li, ended = false) {
    if (this.onEl && this.onEl !== li) { this.onEl.classList.remove('on'); this.onEl.classList.add('past'); }
    if (ended) { this.onEl = null; return; }
    this.onEl = li;
    if (li) {
      li.classList.remove('past'); li.classList.add('on');
      const box = this.elLines;
      const top = li.offsetTop - (box.clientHeight - li.offsetHeight) / 2;
      try { box.scrollTo({ top: Math.max(0, top), behavior: this.reduce ? 'auto' : 'smooth' }); } catch { box.scrollTop = Math.max(0, top); }
    }
  }
  caption(text, id) {
    const li = this.lineEls.get(id);
    if (li) { this.setOn(li); this.elCap.textContent = ''; } else { this.setOn(null); this.elCap.textContent = text; }
  }

  buildSettings() {
    const T = (k, s) => this.T(k, s);
    const sel = (opts, val, fn) => { const s = el('select', { onchange: (e) => fn(e.target.value) }); for (const [v, t] of opts) s.append(el('option', { value: v, selected: String(v) === String(val) }, t)); return s; };
    const row = (label, ctl) => el('label', { class: 'row' }, el('span', {}, label), ctl);
    const nl = this.st.narrLang || '';
    const mood = normMood(this.st.music);
    const chips = ['none', ...MOODS].map((m) => el('label', { class: 'chip sm' }, el('input', { type: 'radio', name: 'music-mood', value: m, checked: m === mood, onchange: () => this.setMusic(m) }), T('musicMood', m)));
    return el('div', { class: 'p-settings', hidden: true },
      el('div', { class: 'row-set' }, el('strong', {}, T('music')), el('div', { class: 'seg-ctl' }, chips)),
      row(T('musicVol'), el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: this.st.musicVol, 'aria-label': T('musicVol'), oninput: (e) => { music.setVolume(+e.target.value); store.saveSettings({ musicVol: +e.target.value }); this.st = store.settings; } })),
      row(T('narrLang'), sel([['', T('sameAsUI')], ['he', 'עברית'], ['ru', 'Русский'], ['en', 'English']], nl, (v) => { store.saveSettings({ narrLang: v }); this.st = store.settings; this.nar.setLang(v || this.lang); if (this.list && !this.done && this.phase === 'hold') this.renderTranscript(this.slot()); })),
      row(T('narration'), sel(NARR_LEVELS.map((d) => [d, T('narrLvl', d)]), this.st.narration, (v) => { store.saveSettings({ narration: v }); this.st = store.settings; })),
      row(T('voiceVol'), el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: this.st.volume, 'aria-label': T('voiceVol'), oninput: (e) => { this.nar.volume = +e.target.value; store.saveSettings({ volume: +e.target.value }); } })),
      el('div', { class: 'row' }, this.btnMute, el('label', { class: 'chip sm' }, el('input', { type: 'checkbox', checked: this.st.beep, onchange: (e) => { store.saveSettings({ beep: e.target.checked }); this.st = store.settings; } }), T('beep')),
        el('button', { class: 'btn', onclick: () => this.anim.replay() }, '▷ ' + T('replayEntry'))));
  }
  setMusic(m) {
    store.saveSettings({ music: m }); this.st = store.settings;
    if (m === 'none') music.stop(); else { music.start(m, this.st.musicVol); music.setPaused(this.paused); }
  }

  refreshMute() { this.btnMute.textContent = (this.nar.mute ? '🔇 ' : '🔊 ') + (this.nar.mute ? this.T('unmute') : this.T('mute')); }
  toggleMute() { this.nar.mute = !this.nar.mute; store.saveSettings({ mute: this.nar.mute }); if (this.nar.mute) this.nar.cancel(); this.refreshMute(); }

  get level() { return NARR_LEVELS.includes(this.st.narration) ? this.st.narration : 'full'; }
  get nlang() { return this.nar.lang || this.lang; }
  minutes() { return this.totalAll / 60; }
  introItems() { return introSeq({ lang: this.nlang, level: this.level, minutes: this.minutes() }); }

  start() {
    this.anim.start();
    this.acquireWake();
    this.enterFs();
    if (normMood(this.st.music) !== 'none') music.start(this.st.music, this.st.musicVol);
    this.t0 = performance.now();
    this.timer = setInterval(() => this.tick(), 200);
    const pre = this.nlang === 'he' && this.level !== 'off' ? [...sessionIds(), ...this.list.slice(0, 1).flatMap((s) => poseV2Ids(s.pose.id))] : [];
    this.phase = 'wait';
    // read real clip lengths first (bounded wait), then play the intro or go straight to the first pose
    Promise.resolve(this.nar.preload(pre, 1200)).then(() => { if (!this.done && this.phase === 'wait') this.begin(); });
  }
  begin() {
    const level = this.level;
    const intro = this.introItems();
    if (intro.length) return this.startIntro(intro);
    if (level !== 'off') this.nar.say(['common.welcome']);
    // name/off: the safety note is shown on screen only (not spoken)
    if ((level === 'name' || level === 'off') && this.nlang === 'he') this.elCap.textContent = segText('session.intro.safety', 'he');
    this.beginSlot(0, true);
    this.t0 = performance.now();
  }
  startIntro(items) {
    this.phase = 'intro';
    this.introLeft = introSeconds(items, (id) => this.nar.dur(id)); this.introT = this.introLeft; this.introSpent = 0;
    const first = this.list[0];
    this.anim.set(first.pose, first.level, { mirror: false, mode: 'once', from: null });
    this.anim.setPlaying(!this.paused);
    this.elName.textContent = this.T('introPhase'); this.elSub.textContent = ''; this.elLines.innerHTML = ''; this.lineEls = new Map(); this.onEl = null; this.elSide.hidden = true;
    this.renderNext(-1);
    this.btnSkipIntro.hidden = false; this.pl.classList.add('is-intro');
    this.nar.say([...items, () => this.endIntro()], { flush: true });
    this.updateUI();
  }
  endIntro() { if (this.phase !== 'intro') return; this.btnSkipIntro.hidden = true; this.pl.classList.remove('is-intro'); this.t0 = performance.now(); this.beginSlot(0, true); }
  skipIntro() { if (this.phase !== 'intro') return; this.nar.cancel(); this.elCap.textContent = ''; this.endIntro(); }
  async acquireWake() { try { if (this.st.wake && navigator.wakeLock) this.wake = await navigator.wakeLock.request('screen'); } catch { /* denied */ } }
  beep(freq = 660, dur = 0.12) {
    if (!this.st.beep) return;
    try {
      this.audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = this.audioCtx.createOscillator(), g = this.audioCtx.createGain();
      o.frequency.value = freq; g.gain.value = 0.06 * (this.nar.volume || 1);
      o.connect(g); g.connect(this.audioCtx.destination); o.start(); o.stop(this.audioCtx.currentTime + dur);
    } catch { /* no audio */ }
  }

  slot() { return this.list[this.idx]; }
  beginSlot(i, first = false) {
    this.idx = i; const s = this.slot();
    this.phase = 'hold';
    this.holdTotal = Math.max(5, Math.round(s.hold * this.mult)); this.remain = this.holdTotal;
    this.nextSaid = false; this.midSaid = false;
    const lvl = s.level;
    const prevFrame = null;
    this.anim.set(s.pose, lvl, { mirror: s.side === 1, mode: 'once', from: prevFrame });
    this.anim.setPlaying(!this.paused);
    this.svg.setAttribute('aria-label', s.pose[this.lang]);
    this.renderInfo(s);
    this.renderNext();
    if (!first) this.beep(880, 0.15);
    // narration for this slot
    this.evIdx = 0; this.events = [];
    const plan = slotPlan({ lang: this.nlang, level: this.level, poseId: s.pose.id, side: s.side, sides: s.sides, hold: this.holdTotal, lvl: s.level,
      dur: (id) => this.nar.dur(id), announced: this.announced === i, lastSavasana: s.pose.id === 'savasana' && i === this.list.length - 1, minutes: this.minutes() });
    this.plan2 = plan; this.events = plan.events;
    this.closed = closingPlays({ lang: this.nlang, level: this.level, lastSavasana: s.pose.id === 'savasana' && i === this.list.length - 1 });
    if (!this.events.length) this.nar.cancel();
    this.fireEvents(0, !first);
    // read real clip lengths for the next pose in the background
    const n = this.list[i + 1];
    if (n && this.nlang === 'he') this.nar.preload(poseV2Ids(n.pose.id));
    this.updateUI();
  }

  fireEvents(elapsed, flush = false) {
    while (this.evIdx < this.events.length && this.events[this.evIdx].t <= elapsed + 0.01) {
      const e = this.events[this.evIdx++];
      this.nar.say(e.items, { flush: flush && this.evIdx === 1 });
    }
  }

  renderInfo(s) {
    const L = this.lang, p = s.pose;
    this.elName.textContent = p[L];
    this.elSub.textContent = `${p.sanskrit} · ${LEVEL_LABELS[s.level][L]}`;
    this.elSide.hidden = !(s.sides > 1);
    if (s.sides > 1) this.elSide.textContent = this.T('sideLR', s.side);
    this.renderTranscript(s);
  }
  renderNext(from = this.idx) {
    const n = this.list[from + 1];
    if (!n) { this.elNext.hidden = true; this.elNextBig.hidden = true; return; }
    this.elNext.hidden = false;
    renderStatic(this.nextSvg, n.pose, n.level, { mirror: n.side === 1, floor: true });
    renderStatic(this.nextBigSvg, n.pose, n.level, { mirror: n.side === 1, floor: true });
    const nm = n.pose[this.lang] + (n.sides > 1 && n.side === 1 ? ` (${this.T('sideLR', 1)})` : '');
    this.elNextName.textContent = nm; this.elNextBigName.textContent = nm;
  }

  tick() {
    const now = performance.now(); const dt = Math.min(1, (now - this.t0) / 1000); this.t0 = now;
    if (this.paused || this.done) return;
    if (this.phase === 'wait') return;
    if (this.phase === 'intro') {
      this.introLeft = Math.max(0, this.introLeft - dt); this.introSpent += dt;
      if (this.introSpent > this.introT * 1.6 + 25) this.endIntro(); // safety: the narrator never finished
      else this.updateUI();
      return;
    }
    this.remain -= dt; this.elapsedAll += dt; this.actualSec += dt; // actualSec: real practice time, never rewound by skips, not counted while paused
    if (this.phase === 'hold') {
      const s = this.slot();
      this.fireEvents(this.holdTotal - this.remain);
      const total = this.totalAll;
      const lvl = this.level;
      if (!this.halfSaid && this.elapsedAll >= total / 2 && this.idx < this.list.length - 1 && this.list.length > 3 && (lvl === 'full' || lvl === 'short' || (lvl === 'name' && this.nlang !== 'he'))) {
        this.halfSaid = true; this.nar.say(['common.halfway']);
      }
      if (this.remain <= 0) {
        if (this.idx >= this.list.length - 1) return this.finish();
        this.phase = 'trans'; this.remain = this.trans; this.beep(520, 0.12);
        const n = this.list[this.idx + 1];
        const same = n.pose.id === s.pose.id;
        if (same) this.announced = this.idx + 1;
        if (lvl === 'off') { /* silent */ }
        else if (s.pose.id === 'savasana') this.nar.say(['common.savasana_end'], { flush: true });
        else if (same) this.nar.say(['common.switch_sides'], { flush: true });
        else if (lvl !== 'name') this.nar.say(['common.next', `pose.${n.pose.id}.name`], { flush: true });
      }
    } else if (this.remain <= 0) {
      this.beginSlot(this.idx + 1);
    }
    this.updateUI();
  }

  updateUI() {
    const r = Math.max(0, Math.ceil(this.remain));
    let frac;
    if (this.phase === 'trans') { this.elCount.textContent = String(r); frac = this.trans ? Math.max(0, this.remain) / this.trans : 0; }
    else if (this.phase === 'intro') { this.elCount.textContent = fmtTime(Math.ceil(this.introLeft)); frac = this.introT ? this.introLeft / this.introT : 0; }
    else { this.elCount.textContent = fmtTime(r); frac = this.holdTotal ? Math.max(0, this.remain) / this.holdTotal : 0; }
    this.ringFg.setAttribute('stroke-dashoffset', String(this.ringC * (1 - Math.min(1, Math.max(0, frac)))));
    const trans = this.phase === 'trans';
    this.pl.classList.toggle('is-trans', trans);
    this.elNextBig.hidden = !trans || this.elNext.hidden;
    this.elCount.classList.toggle('trans', trans);
    const pct = Math.min(100, (this.elapsedAll / this.totalAll) * 100);
    this.elBar.style.width = pct + '%';
    this.elBarTxt.textContent = `${poseOf(this.slot().index + 1, this.plan.items.length, this.lang)} · ${fmtTime(this.elapsedAll)} / ${fmtTime(this.totalAll)}`;
    this.pl.querySelector('.p-bar')?.setAttribute('aria-valuenow', Math.round(pct));
  }

  togglePause() {
    this.paused = !this.paused;
    this.anim.setPlaying(!this.paused);
    this.btnPause.textContent = this.paused ? '▶' : '⏸';
    this.btnPause.setAttribute('aria-label', this.paused ? this.T('resume') : this.T('pause')); this.btnPause.title = this.btnPause.getAttribute('aria-label');
    music.setPaused(this.paused);
    if (this.paused) { this.nar.pause(); this.showBar(); } else { this.t0 = performance.now(); this.nar.resume(); this.armHide(); }
  }
  plus10() { this.remain += 10; if (this.phase === 'hold') this.holdTotal += 10; this.totalAll += 10; this.updateUI(); }
  restartPose() { this.elapsedAll = Math.max(0, this.elapsedAll - (this.holdTotal - Math.max(0, this.remain))); this.beginSlot(this.idx); }
  jump(d) {
    if (this.phase === 'intro') { if (d > 0) return this.skipIntro(); return; }
    const n = this.idx + d;
    if (n < 0) return this.restartPose();
    if (n >= this.list.length) return this.finish();
    // keep elapsed in sync with the start of the target slot
    this.elapsedAll = this.list.slice(0, n).reduce((a, s) => a + Math.round(s.hold * this.mult) + this.trans, 0);
    this.beginSlot(n);
  }

  finish() {
    if (this.done) return; this.done = true;
    clearInterval(this.timer); this.anim.destroy(); clearTimeout(this.hideT); music.stop(); this.exitFs();
    if (this.level !== 'off' && !this.closed) this.nar.say(['common.finish'], { flush: true });
    const actual = this.actualSec;
    store.addHistory(this.plan.name, actual, this.totalAll);
    const counted = countsForStreak(actual, this.totalAll);
    const st = streak(store.history);
    const fs = finishStats(this.lang, actual, this.totalAll, st, counted);
    this.beep(660, 0.3);
    this.root.innerHTML = '';
    this.root.append(el('div', { class: 'finish' },
      el('div', { class: 'finish-mark', 'aria-hidden': 'true' }, '🪷'),
      el('h2', {}, fs.title),
      el('p', {}, fs.text),
      el('p', { class: 'stat', id: 'finish-stat' }, fs.stat),
      el('p', { class: 'small', id: 'finish-planned' }, fs.planned),
      el('div', { class: 'row-btns' },
        el('button', { class: 'btn primary', onclick: () => this.again() }, this.T('again')),
        el('button', { class: 'btn', onclick: () => this.exit(true) }, this.T('home')))));
    this.releaseWake(); document.removeEventListener('visibilitychange', this._vis); this.nar.onSpeaking = () => {};
    this.onFinish?.();
  }
  again() { this.destroy(); const p = new Player(this.root, { plan: this.plan, narrator: this.nar, lang: this.lang, onExit: this.onExit, onFinish: this.onFinish }); p.start(); this.successor = p; }
  releaseWake() { try { this.wake?.release(); } catch { /* none */ } this.wake = null; }
  destroy() {
    this._ro?.disconnect(); clearInterval(this.timer); clearTimeout(this.hideT); this.anim.destroy(); this.nar.cancel(); this.releaseWake(); music.stop(); this.exitFs();
    document.removeEventListener('visibilitychange', this._vis); this.nar.onCaption = () => {}; this.nar.onSpeaking = () => {};
  }
  exit(home) { this.destroy(); this.onExit?.(home); }
}
