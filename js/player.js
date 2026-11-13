// Guided player: timer, looping figure, narration schedule, next preview, finish screen.
import { Figure, Animator, renderStatic } from './figure.js';
import { slots, planSeconds, fmtTime } from './plan.js';
import { tr, poseOf, finishStats } from './i18n.js';
import { store, streak, countsForStreak } from './store.js';
import { cueIds } from '../data/narration.js';
import { LEVEL_LABELS } from '../data/poses.js';

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
    this.build();
  }
  T(k, sub) { return tr(k, this.lang, sub); }

  build() {
    const T = (k, s) => this.T(k, s);
    this.root.innerHTML = '';
    this.svg = document.createElementNS(SVGNS, 'svg');
    this.svg.setAttribute('class', 'fig big'); this.svg.setAttribute('role', 'img');
    this.fig = new Figure(this.svg); this.anim = new Animator(this.fig);
    this.nextSvg = document.createElementNS(SVGNS, 'svg'); this.nextSvg.setAttribute('class', 'fig mini'); this.nextSvg.setAttribute('aria-hidden', 'true');
    this.elCount = el('div', { class: 'count', 'aria-live': 'off' }, '0:00');
    this.elName = el('h2', { class: 'p-name' });
    this.elSub = el('div', { class: 'p-sub' });
    this.elCues = el('ul', { class: 'cues' });
    this.elCap = el('div', { class: 'caption', 'aria-live': 'polite' });
    this.elNotice = el('div', { class: 'notice', hidden: true });
    this.elNextName = el('span', { class: 'next-name' });
    this.elNext = el('div', { class: 'next' }, el('span', { class: 'next-label' }, T('next') + ':'), this.nextSvg, this.elNextName);
    this.elBar = el('div', { class: 'bar-fill' });
    this.elBarTxt = el('span', { class: 'bar-txt' });
    this.elDetails = el('div', { class: 'p-details' });
    this.btnPause = el('button', { class: 'btn big-btn', onclick: () => this.togglePause() }, T('pause'));
    const ib = (label, fn, cls = '') => el('button', { class: 'btn ' + cls, onclick: fn, 'aria-label': label, title: label }, label);
    this.btnMute = el('button', { class: 'btn icon', onclick: () => this.toggleMute(), 'aria-label': T('mute') }, '');
    this.settingsBox = this.buildSettings();
    this.root.append(
      el('div', { class: 'player' },
        el('div', { class: 'p-top' },
          el('button', { class: 'btn ghost', onclick: () => this.exit() }, '✕ ' + T('exit')),
          el('div', { class: 'p-plan' }, this.plan.name),
          this.btnMute,
          el('button', { class: 'btn icon', onclick: () => { this.settingsBox.hidden = !this.settingsBox.hidden; }, 'aria-label': T('settings') }, '⚙')),
        this.settingsBox,
        el('div', { class: 'p-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, this.elBar),
        this.elBarTxt,
        el('div', { class: 'p-stage' },
          el('div', { class: 'p-fig' }, this.svg, this.elCount),
          el('div', { class: 'p-info' }, this.elName, this.elSub, this.elCues, this.elDetails)),
        this.elCap, this.elNotice,
        this.elNext,
        el('div', { class: 'p-ctrl', id: 'p-ctrl' },
          ib('⏮ ' + T('prev'), () => this.jump(-1)),
          ib('↺ ' + T('restart'), () => this.restartPose()),
          ib('▷ ' + T('replayEntry'), () => this.anim.replay()),
          this.btnPause,
          ib(T('plus10'), () => this.plus10()),
          ib(T('skip') + ' ⏭', () => this.jump(1)))));
    const ctrlEl = document.getElementById('p-ctrl');
    if (ctrlEl && window.ResizeObserver) {
      const pl = ctrlEl.parentElement;
      this._ro = new ResizeObserver(() => pl.style.setProperty('--bar-h', ctrlEl.offsetHeight + 'px'));
      this._ro.observe(ctrlEl);
    }
    this.nar.onCaption = (t) => { this.elCap.textContent = t; };
    this.nar.onNotice = (k) => { this.elNotice.hidden = false; this.elNotice.textContent = k === 'novoice' ? T('noVoice') : T('noSpeech'); };
    this.refreshMute();
  }

  buildSettings() {
    const T = (k, s) => this.T(k, s);
    const sel = (opts, val, fn) => { const s = el('select', { onchange: (e) => fn(e.target.value) }); for (const [v, t] of opts) s.append(el('option', { value: v, selected: String(v) === String(val) }, t)); return s; };
    const row = (label, ctl) => el('label', { class: 'row' }, el('span', {}, label), ctl);
    const nl = this.st.narrLang || '';
    return el('div', { class: 'p-settings', hidden: true },
      row(T('narrLang'), sel([['', T('sameAsUI')], ['he', 'עברית'], ['ru', 'Русский'], ['en', 'English']], nl, (v) => { store.saveSettings({ narrLang: v }); this.st = store.settings; this.nar.setLang(v || this.lang); })),
      row(T('density'), sel(['minimal', 'standard', 'full'].map((d) => [d, T('dens', d)]), this.st.density, (v) => { store.saveSettings({ density: v }); this.st = store.settings; })),
      row(T('volume'), el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: this.st.volume, oninput: (e) => { this.nar.volume = +e.target.value; store.saveSettings({ volume: +e.target.value }); } })),
      row(T('beep'), el('input', { type: 'checkbox', checked: this.st.beep, onchange: (e) => { store.saveSettings({ beep: e.target.checked }); this.st = store.settings; } })));
  }

  refreshMute() { this.btnMute.textContent = this.nar.mute ? '🔇' : '🔊'; this.btnMute.setAttribute('aria-label', this.nar.mute ? this.T('unmute') : this.T('mute')); }
  toggleMute() { this.nar.mute = !this.nar.mute; store.saveSettings({ mute: this.nar.mute }); if (this.nar.mute) this.nar.cancel(); this.refreshMute(); }

  start() {
    this.anim.start();
    this.acquireWake();
    this.nar.say(['common.welcome']);
    this.beginSlot(0, true);
    this.t0 = performance.now();
    this.timer = setInterval(() => this.tick(), 200);
  }
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
    const id = s.pose.id; const dens = this.st.density;
    const ids = [];
    if (s.side === 1) ids.push('common.switch_sides');
    else {
      ids.push(`pose.${id}.intro`);
      const cues = cueIds(id);
      if (dens === 'standard') ids.push(...cues.slice(0, 2)); else if (dens === 'full') ids.push(...cues);
    }
    this.nar.say(ids, { flush: !first });
    this.updateUI();
  }

  renderInfo(s) {
    const L = this.lang, p = s.pose;
    this.elName.textContent = p[L];
    this.elSub.textContent = `${p.sanskrit} · ${LEVEL_LABELS[s.level][L]}` + (s.sides > 1 ? ` · ${this.T('sideLR', s.side)}` : '');
    this.elCues.innerHTML = '';
    for (const c of p.cues[L]) this.elCues.append(el('li', {}, c));
    const easy = p.variations[0];
    this.elDetails.innerHTML = '';
    this.elDetails.append(
      el('p', { class: 'safety' }, el('strong', {}, this.T('safety') + ': '), p.safety[L]),
      el('p', { class: 'easier' }, el('strong', {}, this.T('easier') + ': '), easy[L]));
  }
  renderNext() {
    const n = this.list[this.idx + 1];
    if (!n) { this.elNext.hidden = true; return; }
    this.elNext.hidden = false;
    renderStatic(this.nextSvg, n.pose, n.level, { mirror: n.side === 1, floor: true });
    this.elNextName.textContent = n.pose[this.lang] + (n.sides > 1 && n.side === 1 ? ` (${this.T('sideLR', 1)})` : '');
  }

  tick() {
    const now = performance.now(); const dt = Math.min(1, (now - this.t0) / 1000); this.t0 = now;
    if (this.paused || this.done) return;
    this.remain -= dt; this.elapsedAll += dt; this.actualSec += dt; // actualSec: real practice time, never rewound by skips, not counted while paused
    if (this.phase === 'hold') {
      const s = this.slot();
      if (!this.midSaid && this.holdTotal >= 20 && this.remain <= this.holdTotal / 2 && this.st.density === 'full') {
        this.midSaid = true; this.nar.say(['common.breathe_in', 'common.breathe_out']);
      }
      const total = this.totalAll;
      if (!this.halfSaid && this.elapsedAll >= total / 2 && this.idx < this.list.length - 1 && this.list.length > 3) {
        this.halfSaid = true; this.nar.say(['common.halfway']);
      }
      if (this.remain <= 0) {
        if (this.idx >= this.list.length - 1) return this.finish();
        this.phase = 'trans'; this.remain = this.trans; this.beep(520, 0.12);
        const n = this.list[this.idx + 1];
        if (s.pose.id === 'savasana') this.nar.say(['common.savasana_end'], { flush: true });
        else if (n.pose.id === s.pose.id) this.nar.say(['common.switch_sides'], { flush: true });
        else this.nar.say(['common.next', `pose.${n.pose.id}.name`], { flush: true });
      }
    } else if (this.remain <= 0) {
      this.beginSlot(this.idx + 1);
    }
    this.updateUI();
  }

  updateUI() {
    const r = Math.max(0, Math.ceil(this.remain));
    this.elCount.textContent = this.phase === 'trans' ? this.T('getReady') + ' ' + r : fmtTime(r);
    this.elCount.classList.toggle('trans', this.phase === 'trans');
    const pct = Math.min(100, (this.elapsedAll / this.totalAll) * 100);
    this.elBar.style.width = pct + '%';
    this.elBarTxt.textContent = `${poseOf(this.slot().index + 1, this.plan.items.length, this.lang)} · ${fmtTime(this.elapsedAll)} / ${fmtTime(this.totalAll)}`;
    this.root.querySelector('.p-bar')?.setAttribute('aria-valuenow', Math.round(pct));
  }

  togglePause() {
    this.paused = !this.paused;
    this.anim.setPlaying(!this.paused);
    this.btnPause.textContent = this.paused ? this.T('resume') : this.T('pause');
    if (this.paused) this.nar.pause(); else { this.t0 = performance.now(); this.nar.resume(); }
  }
  plus10() { this.remain += 10; if (this.phase === 'hold') this.holdTotal += 10; this.totalAll += 10; this.updateUI(); }
  restartPose() { this.elapsedAll = Math.max(0, this.elapsedAll - (this.holdTotal - Math.max(0, this.remain))); this.beginSlot(this.idx); }
  jump(d) {
    const n = this.idx + d;
    if (n < 0) return this.restartPose();
    if (n >= this.list.length) return this.finish();
    // keep elapsed in sync with the start of the target slot
    this.elapsedAll = this.list.slice(0, n).reduce((a, s) => a + Math.round(s.hold * this.mult) + this.trans, 0);
    this.beginSlot(n);
  }

  finish() {
    if (this.done) return; this.done = true;
    clearInterval(this.timer); this.anim.stop();
    this.nar.say(['common.finish'], { flush: true });
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
    this.releaseWake();
    this.onFinish?.();
  }
  again() { this.destroy(); const p = new Player(this.root, { plan: this.plan, narrator: this.nar, lang: this.lang, onExit: this.onExit, onFinish: this.onFinish }); p.start(); this.successor = p; }
  releaseWake() { try { this.wake?.release(); } catch { /* none */ } this.wake = null; }
  destroy() { this._ro?.disconnect(); clearInterval(this.timer); this.anim.stop(); this.nar.cancel(); this.releaseWake(); this.nar.onCaption = () => {}; }
  exit(home) { this.destroy(); this.onExit?.(home); }
}
