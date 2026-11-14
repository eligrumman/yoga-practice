// Figure facade: one API (Figure / Animator / renderStatic / poseFrames) over the shared rig (rig.js),
// the SVG renderer (figure2d.js) and the optional three.js renderer (figure3d.js).
// Motion data comes from pose.spec (poses/<id>.json, attached by specs.js). The same frames drive 2D and 3D.
import { blendFrames, swapLR, solve, fullFrame } from './rig.js';
import { Renderer2D, fitView } from './figure2d.js';

export { FLOOR, VBW, VBH } from './figure2d.js';
export { solve };

// ------------------------------------------------------------------ spec access
const mirrorSide = (v) => (v === 'R' ? 'L' : v === 'L' ? 'R' : Array.isArray(v) ? v.map(mirrorSide) : v);
export const mirrorProps = (props) => props.map((p) => {
  const o = { ...p };
  for (const k of ['arm', 'leg', 'arms', 'legs', 'side']) if (k in o) o[k] = mirrorSide(o[k]);
  return o;
});

// { start, hold, alt (full frame or null), props, camera } for one level of a pose (hold position, unmirrored).
export function poseFrames(pose, level = 1) {
  const spec = pose.spec;
  if (!spec) throw new Error(`pose ${pose.id}: spec not loaded (call attachSpecs first)`);
  const L = spec.levels[level] || spec.levels[1];
  return {
    start: spec.start, hold: L.hold, frame: L.hold, alt: L.altFull || null, seq: L.seqFull || null,
    props: L.props, camera: L.camera || spec.camera,
  };
}

const viewCache = new Map();
// Per-pose framing for the 2D view: fitted once from the hold (and alt) frames so the figure never jumps while it moves.
function viewFor(pose, level, mirror) {
  const key = `${pose.id}|${level}|${mirror ? 1 : 0}`;
  if (!viewCache.has(key)) {
    const P = poseFrames(pose, level);
    const fs = [P.hold, P.alt, ...(P.seq || []).map((s) => s.frame)].filter(Boolean).map((f) => (mirror ? swapLR(f) : f));
    viewCache.set(key, fitView(fs, P.camera));
  }
  return viewCache.get(key);
}

// ------------------------------------------------------------------ 2D / 3D mode
const LS = 'yoga.view';
const lsGet = () => { try { return localStorage.getItem(LS); } catch { return null; } };
const lsSet = (v) => { try { localStorage.setItem(LS, v); } catch { /* ignore */ } };
const subs = new Set();
let g3 = null; // lazily imported figure3d module
let failed3d = false;

export const view3d = {
  // can this device show 3D at all (WebGL)?
  get available() {
    if (typeof document === 'undefined' || failed3d) return false;
    if (g3) return g3.webglAvailable();
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
  },
  // default when the user has not chosen: 3D only on capable devices without reduced-motion
  get auto() {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const rm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return this.available && cores > 4 && !rm ? '3d' : '2d';
  },
  get mode() {
    const s = lsGet();
    if (s === '2d') return '2d';
    if (s === '3d') return this.available ? '3d' : '2d';
    return this.auto;
  },
  set(m) { lsSet(m); subs.forEach((f) => f()); },
  on(fn) { subs.add(fn); return () => subs.delete(fn); },
  fail() { failed3d = true; subs.forEach((f) => f()); },
};

async function load3d() {
  if (!g3) g3 = await import('./figure3d.js');
  return g3;
}

// A small "2D | 3D" toggle button. Hidden when WebGL is unavailable.
export function viewToggle() {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn view-toggle'; b.setAttribute('aria-live', 'polite');
  const sync = () => {
    b.hidden = !view3d.available;
    const m = view3d.mode;
    b.textContent = m === '3d' ? '3D' : '2D';
    b.title = m === '3d' ? '3D → 2D' : '2D → 3D';
    b.setAttribute('aria-label', b.title);
  };
  b.addEventListener('click', () => view3d.set(view3d.mode === '3d' ? '2d' : '3d'));
  const off = view3d.on(() => { if (!b.isConnected) off(); else sync(); });
  sync();
  return b;
}

// ------------------------------------------------------------------ Figure
export class Figure {
  constructor(svg, { floor = true } = {}) {
    this.svg = svg; this.floor = floor;
    this.r2 = new Renderer2D(svg, { floor });
    this.r3 = null; this.host = null; this.loading = false; this.dead = false; this.last = null;
    this.off = view3d.on(() => this.apply());
    this.apply();
  }

  // frame: full (already mirrored) frame; opts: { props, e, breath, view (2D framing), cam (3D default camera) }
  draw(frame, opts = {}) {
    this.last = [frame, opts];
    if (!this.r3 && !this.loading && !this.dead && view3d.mode === '3d') this.enable3d();
    if (this.r3 && this.is3d()) this.r3.draw(frame, { props: opts.props || [], e: opts.e ?? 1, breath: opts.breath || 0, cam: opts.cam });
    else if (opts.view) this.r2.draw(frame, { props: opts.props || [], e: opts.e ?? 1, breath: opts.breath || 0, view: opts.view });
  }
  redraw() { if (this.last) this.draw(this.last[0], this.last[1]); }
  is3d() { return view3d.mode === '3d' && !!this.r3 && !!this.host; }

  apply() {
    if (this.dead) return;
    if (view3d.mode === '3d' && !this.r3) { this.enable3d(); }
    const on = this.is3d();
    this.svg.style.display = on ? 'none' : '';
    if (this.host) this.host.style.display = on ? '' : 'none';
    if (on) this.r3.resize();
    this.redraw();
  }

  async enable3d() {
    if (this.loading || this.r3) return;
    this.loading = true;
    try {
      const G = await load3d();
      const THREE = await G.loadThree();
      if (this.dead) return;
      const parent = this.svg.parentNode;
      if (!parent) { this.loading = false; return; } // not mounted yet: a later apply() retries
      const host = document.createElement('div');
      host.className = (this.svg.getAttribute('class') || '') + ' fig3d-host';
      host.setAttribute('aria-hidden', 'true');
      parent.insertBefore(host, this.svg.nextSibling);
      this.host = host;
      this.r3 = new G.Renderer3D(host, THREE, { floor: this.floor });
    } catch (e) {
      console.warn('3D unavailable, using 2D', e);
      view3d.fail();
    }
    this.loading = false;
    this.apply();
  }

  resetCamera() { this.r3?.reset(); }

  dispose() {
    this.dead = true; this.off?.();
    try { this.r3?.dispose(); } catch { /* ignore */ }
    this.host?.remove(); this.r3 = null; this.host = null;
    this.svg.style.display = '';
  }
}

// ------------------------------------------------------------------ Animator
const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };

// Time-driven animation of one pose: 'loop' (library: enter, hold, leave, repeat) or 'once' (player: enter, then hold).
export class Animator {
  constructor(fig) {
    this.fig = fig; this.speed = 1; this.playing = true; this.time = 0; this.raf = 0; this.last = 0; this.cfg = null;
  }
  set(pose, level, { from = null, mirror = false, mode = 'loop', intro = 2.8 } = {}) {
    const P = poseFrames(pose, level);
    let hold = P.hold, alt = P.alt, seq = P.seq, start = from || P.start, props = P.props;
    if (mirror) {
      hold = swapLR(hold); alt = alt && swapLR(alt); seq = seq?.map((s) => ({ ...s, frame: swapLR(s.frame) })); props = mirrorProps(props);
      if (!from) start = swapLR(start);
    }
    const view = viewFor(pose, level, mirror);
    // the hold view can be zoomed in far more than the standing start frame fits: ease the framing from the start view to the hold view
    const sv = fitView([fullFrame(start)], P.camera, { maxScale: 1.45 });
    this.cfg = { start: fullFrame(start), hold, alt, seq, props, mode, intro, view, startView: sv.scale < view.scale ? sv : null, cam: P.camera };
    this.time = 0;
    this.frame(0);
  }
  // progress u (0 = start frame, 1 = full pose) at a time
  progress(time) {
    const c = this.cfg;
    if (c.mode === 'once') return clamp((time - 0.25) / c.intro);
    if (c.alt || c.seq) return 1; // flow pose in the library: keep flowing
    const T = time % 10;
    if (T < 0.6) return 0;
    if (T < 3.4) return (T - 0.6) / 2.8;
    if (T < 7.2) return 1;
    return 1 - (T - 7.2) / 2.8;
  }
  frameAt(time) {
    const c = this.cfg;
    const u = this.progress(time);
    let f = blendFrames(c.start, c.hold, u);
    // A duration includes the smooth transition into the next step. One plan hold unit is one round.
    if (c.seq && u >= 1) {
      const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) f = c.seq[0].frame;
      else {
        const total = c.seq.reduce((n, s) => n + s.dur, 0);
        const t0 = c.mode === 'once' ? 0.25 + c.intro : 0;
        let t = ((time - t0) % total + total) % total, i = 0;
        while (i < c.seq.length - 1 && t >= c.seq[i].dur) t -= c.seq[i++].dur;
        const a = c.seq[i], b = c.seq[(i + 1) % c.seq.length];
        f = blendFrames(a.frame, b.frame, smooth(t / a.dur));
      }
    }
    // flow pose (cat-cow): once in the pose, alternate hold <-> alt, one half-cycle every 5 s
    if (c.alt && !c.seq && u >= 1) {
      const t0 = c.mode === 'once' ? 0.25 + c.intro : 0;
      f = blendFrames(c.hold, c.alt, 0.5 - 0.5 * Math.cos(((time - t0) * 2 * Math.PI) / 10));
    }
    // breathing in the hold: ~5 s cycle
    const k = clamp((u - 0.92) / 0.08);
    const breath = Math.sin((time * 2 * Math.PI) / 5) * 0.03 * k;
    return { f, e: smooth(u), breath, u };
  }
  frame(time) {
    const { f, e, breath } = this.frameAt(time);
    const c = this.cfg;
    let view = c.view;
    if (c.startView) { const k = Math.min(1, Math.max(0, e)); view = { cam: view.cam, scale: c.startView.scale + (view.scale - c.startView.scale) * k, cx: c.startView.cx + (view.cx - c.startView.cx) * k }; }
    this.fig.draw(f, { props: c.props, e, breath, view, cam: c.cam });
  }
  loop = (now) => {
    if (!this.raf) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.playing && this.cfg) { this.time += dt * this.speed; this.frame(this.time); }
    this.raf = requestAnimationFrame(this.loop);
  };
  start() { if (this.raf) return; this.last = performance.now(); this.raf = requestAnimationFrame(this.loop); }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  destroy() { this.stop(); this.fig.dispose(); }
  setPlaying(p) { this.playing = p; if (p) this.last = performance.now(); }
  replay() { this.time = 0; }
  setSpeed(s) { this.speed = s; }
  currentFrame() { return this.frameAt(this.time).f; }
}

// Static render of the hold position in 2D (cards, thumbnails, previews).
export function renderStatic(svg, pose, level = 1, { mirror = false, floor = true } = {}) {
  const r = new Renderer2D(svg, { floor });
  const P = poseFrames(pose, level);
  r.draw(mirror ? swapLR(P.hold) : P.hold, { props: mirror ? mirrorProps(P.props) : P.props, e: 1, view: viewFor(pose, level, mirror) });
  return r;
}
