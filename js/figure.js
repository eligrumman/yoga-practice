// Original jointed SVG mannequin: forward kinematics + small IK helpers.
// Convention: figure faces +x (right). Angles are absolute world angles in degrees,
// 0 = forward (+x), 90 = up, 180 = back, -90 = down.
// Frame: { t: lower torso, s: upper torso (default t), h: head, a:[upper,fore] near arm,
//          b: far arm (default a), l:[thigh,shin,foot] near leg, m: far leg (default l),
//          fix: optional constraints (hand/foot planting) }

export const D = { th: 50, sh: 48, ft: 14, tl: 30, neck: 8, head: 12, ua: 36, fa: 40 };
const rad = (d) => (d * Math.PI) / 180;
export const dir = (d) => [Math.cos(rad(d)), -Math.sin(rad(d))];
const add = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];
const ang = (a, b) => (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI;

export const VBW = 400, VBH = 300, FLOOR = 262;

function ik(p0, target, L1, L2, bend) {
  const dx = target[0] - p0[0], dy = target[1] - p0[1];
  const d = Math.hypot(dx, dy);
  const max = L1 + L2 - 0.01, min = Math.abs(L1 - L2) + 0.01;
  const dd = Math.min(max, Math.max(min, d));
  const base = ang(p0, target);
  const c = (L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd);
  const A = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  const a1 = base + bend * A;
  const e = add(p0, dir(a1), L1);
  const tgt = d > max || d < min ? add(p0, dir(base), dd) : target;
  return [a1, ang(e, tgt)];
}

function legPts(P, l) {
  const k = add(P, dir(l[0]), D.th), a = add(k, dir(l[1]), D.sh), t = add(a, dir(l[2]), D.ft);
  return [P, k, a, t];
}

// Resolve constraints into plain angles.
export function resolve(f) {
  const o = {
    t: f.t, s: f.s ?? f.t, h: f.h ?? f.s ?? f.t,
    a: [...f.a], b: [...(f.b || f.a)], l: [...f.l], m: [...(f.m || f.l)],
  };
  const fx = f.fix;
  if (!fx) return o;
  const P = [0, 0];
  if (fx.m) {
    const L1 = legPts(P, o.l);
    const g1 = Math.max(L1[2][1], L1[3][1]);
    const toeOff = -Math.sin(rad(o.m[2])) * D.ft;
    const ay = g1 - Math.max(0, toeOff);
    let dx = fx.m.x;
    const reach = D.th + D.sh - 0.5;
    if (Math.hypot(dx, ay) > reach) dx = Math.sign(dx) * Math.sqrt(Math.max(0, reach * reach - ay * ay));
    const [a1, a2] = ik(P, [dx, ay], D.th, D.sh, fx.m.bend ?? 1);
    o.m[0] = a1; o.m[1] = a2;
  }
  const M = add(P, dir(o.t), D.tl), S = add(M, dir(o.s), D.tl);
  const legs = { l: legPts(P, o.l), m: legPts(P, o.m) };
  const hc = add(S, dir(o.h), D.neck + D.head);
  let G = Math.max(P[1] + 13, M[1] + 13, S[1] + 13, hc[1] + 12);
  for (const q of Object.values(legs)) G = Math.max(G, q[1][1] + 8, q[2][1] + 7, q[3][1] + 4);
  for (const k of ['a', 'b']) {
    const c = fx[k];
    if (!c) continue;
    if (c.to) {
      let tgt;
      if (c.to === 'hip') tgt = [P[0] + (c.dx ?? 8), P[1] - 8];
      else tgt = legs[c.to][{ knee: 1, ankle: 2, toe: 3 }[c.pt || 'ankle']];
      o[k] = ik(S, tgt, D.ua, D.fa, c.bend ?? -1);
    } else if (c.fore) {
      const ey = G - 5.5, dy = ey - S[1];
      if (dy >= D.ua) o[k] = [-90, c.fa ?? 0];
      else {
        const dx = Math.sqrt(D.ua * D.ua - dy * dy) * (c.back ? -1 : 1) + (c.x || 0);
        o[k] = [ang(S, [S[0] + dx, ey]), c.fa ?? 0];
      }
    } else {
      o[k] = ik(S, [S[0] + (c.x || 0), G - (c.blockH || 0) - 4.5], D.ua, D.fa, c.bend ?? -1);
    }
  }
  if (!f.b && !fx.b && fx.a) o.b = [...o.a];
  return o;
}

export function geometry(f) {
  const P = [0, 0];
  const M = add(P, dir(f.t), D.tl), S = add(M, dir(f.s), D.tl);
  const head = add(S, dir(f.h), D.neck + D.head);
  const arm = (a) => { const e = add(S, dir(a[0]), D.ua); return [S, e, add(e, dir(a[1]), D.fa)]; };
  return { P, M, S, head, a: arm(f.a), b: arm(f.b), l: legPts(P, f.l), m: legPts(P, f.m) };
}

export function bottom(g) {
  let y = Math.max(g.P[1], g.M[1], g.S[1]) + 13;
  y = Math.max(y, g.head[1] + 12);
  for (const k of ['l', 'm']) y = Math.max(y, g[k][1][1] + 8, g[k][2][1] + 7, g[k][3][1] + 4);
  for (const k of ['a', 'b']) y = Math.max(y, g[k][1][1] + 5.5, g[k][2][1] + 5);
  return y;
}
export function xExtent(g) {
  let lo = 1e9, hi = -1e9;
  const pts = [g.P, g.M, g.S, g.head, ...g.a, ...g.b, ...g.l, ...g.m];
  for (const p of pts) { lo = Math.min(lo, p[0] - 8); hi = Math.max(hi, p[0] + 8); }
  return [lo, hi];
}

const lerpA = (a, b, t) => a + (((b - a + 540) % 360) - 180) * t;
const lerpArr = (x, y, t) => x.map((v, i) => lerpA(v, y[i], t));
export function blend(f0, f1, t) {
  return {
    t: lerpA(f0.t, f1.t, t), s: lerpA(f0.s, f1.s, t), h: lerpA(f0.h, f1.h, t),
    a: lerpArr(f0.a, f1.a, t), b: lerpArr(f0.b, f1.b, t),
    l: lerpArr(f0.l, f1.l, t), m: lerpArr(f0.m, f1.m, t),
  };
}

export const NEUTRAL = {
  stand: { t: 90, h: 90, a: [-92, -90], l: [-90, -90, 0] },
  sit: { t: 90, h: 90, a: [-67, -67], l: [-4, -2, 90], fix: { a: { x: 26, bend: -1 } } },
  kneel: { t: 90, h: 90, a: [-90, -90], l: [-90, 180, 180] },
  lie: { t: 180, h: 180, a: [-8, -5], l: [53, -76, 0] },
  prone: { t: 0, h: 0, a: [185, 185], l: [182, 182, 180] },
  table: { t: 15, h: 20, a: [-90, -90], l: [-90, 180, 180], fix: { a: { x: 0, bend: -1 } } },
};
export const neutralFrame = (k) => resolve(NEUTRAL[k] || NEUTRAL.stand);

// pose.kf is the intermediate/base frame; pose.vars[i].kf are overrides merged onto it.
export function poseFrames(pose, level) {
  const v = pose.variations[level] || pose.variations[1];
  const raw = v.kf;
  return { frame: resolve(raw), props: v.props || [], note: v };
}

// ------------------------------------------------------------------ rendering
const NS = 'http://www.w3.org/2000/svg';
function mk(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const W = { torso: 26, th: 20, sh: 15, ft: 9, ua: 12, fa: 10, neck: 9 };

export class Figure {
  constructor(svg, { floor = true } = {}) {
    this.svg = svg;
    svg.setAttribute('viewBox', `0 0 ${VBW} ${VBH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = '';
    if (floor) this.floor = mk('line', { x1: 10, x2: VBW - 10, y1: FLOOR, y2: FLOOR, class: 'fig-floor' }, svg);
    this.root = mk('g', {}, svg);
    this.back = mk('g', { class: 'fig-props' }, this.root);
    const seg = (cls, w) => mk('line', { class: 'seg ' + cls, 'stroke-width': w, 'stroke-linecap': 'round' }, this.root);
    this.s = {
      bua: seg('far', W.ua), bfa: seg('far', W.fa),
      mth: seg('far', W.th), msh: seg('far', W.sh), mft: seg('far', W.ft),
      t1: seg('torso', W.torso), t2: seg('torso', W.torso),
      lth: seg('near', W.th), lsh: seg('near', W.sh), lft: seg('near', W.ft),
      neck: seg('torso', W.neck),
      aua: seg('near', W.ua), afa: seg('near', W.fa),
    };
    this.headEl = mk('circle', { r: D.head, class: 'fig-head' }, this.root);
    this.nose = mk('circle', { r: 2.6, class: 'fig-nose' }, this.root);
    this.front = mk('g', { class: 'fig-props' }, this.root);
  }

  // props: [{type, ...}], e: 0..1 prop visibility, cx: horizontal centre (model x mapped to 200)
  draw(frame, { mirror = false, props = [], e = 1, cx = null } = {}) {
    const g = geometry(frame);
    let lift = 0;
    for (const p of props) if (p.type === 'cushion') lift = (p.h || 12) * e;
    const [x0, x1] = xExtent(g);
    const c = cx ?? (x0 + x1) / 2;
    const ox = 200 - c, oy = FLOOR - lift - bottom(g);
    const T = (p) => [p[0] + ox, p[1] + oy];
    const ln = (el, p, q) => {
      const a = T(p), b = T(q);
      el.setAttribute('x1', a[0]); el.setAttribute('y1', a[1]); el.setAttribute('x2', b[0]); el.setAttribute('y2', b[1]);
    };
    const s = this.s;
    ln(s.bua, g.b[0], g.b[1]); ln(s.bfa, g.b[1], g.b[2]);
    ln(s.mth, g.m[0], g.m[1]); ln(s.msh, g.m[1], g.m[2]); ln(s.mft, g.m[2], g.m[3]);
    ln(s.t1, g.P, g.M); ln(s.t2, g.M, g.S);
    ln(s.lth, g.l[0], g.l[1]); ln(s.lsh, g.l[1], g.l[2]); ln(s.lft, g.l[2], g.l[3]);
    ln(s.neck, g.S, g.head);
    ln(s.aua, g.a[0], g.a[1]); ln(s.afa, g.a[1], g.a[2]);
    const h = T(g.head);
    this.headEl.setAttribute('cx', h[0]); this.headEl.setAttribute('cy', h[1]);
    const nd = dir(frame.h - 90);
    this.nose.setAttribute('cx', h[0] + nd[0] * 8.5); this.nose.setAttribute('cy', h[1] + nd[1] * 8.5 - 1);
    this.root.setAttribute('transform', mirror ? `translate(${VBW},0) scale(-1,1)` : '');
    this.drawProps(props, g, T, e, lift);
  }

  drawProps(props, g, T, e, lift) {
    this.back.innerHTML = ''; this.front.innerHTML = '';
    for (const p of props) {
      const op = String(Math.max(0, Math.min(1, e * 1.4 - 0.2)));
      if (p.type === 'block') {
        for (const k of p.arms || ['a']) {
          const w = T(g[k][2]);
          const top = w[1] + 5, h = FLOOR - lift - top;
          if (h > 3) mk('rect', { x: w[0] - 15, y: top, width: 30, height: h, rx: 3, class: 'prop-block', opacity: op }, this.back);
        }
      } else if (p.type === 'strap') {
        const w = T(g[p.arm || 'a'][2]);
        const A = T(g[p.leg || 'l'][2]), Tt = T(g[p.leg || 'l'][3]);
        const f = [A[0] + (Tt[0] - A[0]) * 0.55, A[1] + (Tt[1] - A[1]) * 0.55];
        mk('line', { x1: w[0], y1: w[1], x2: f[0], y2: f[1], class: 'prop-strap', opacity: op }, this.front);
        mk('circle', { cx: f[0], cy: f[1], r: 6, class: 'prop-strap-loop', opacity: op }, this.front);
      } else if (p.type === 'cushion') {
        const c = T(g.P), h = (p.h || 12) * e, wd = p.w || 64;
        mk('rect', { x: c[0] - wd / 2, y: FLOOR - h, width: wd, height: Math.max(0, h), rx: 6, class: 'prop-cushion' }, this.back);
      } else if (p.type === 'wall') {
        let mx = -1e9;
        for (const k of ['l', 'm']) for (const q of g[k]) mx = Math.max(mx, T(q)[0]);
        mk('rect', { x: mx + 12, y: 30, width: 14, height: FLOOR - 30, class: 'prop-wall', opacity: op }, this.back);
      }
    }
  }
}

// Time-driven animation of one pose
export class Animator {
  constructor(fig) {
    this.fig = fig; this.speed = 1; this.playing = true; this.time = 0; this.raf = 0; this.last = 0;
    this.cfg = null;
  }
  // mode 'loop' (library) or 'once' (player: transition in, then hold)
  set(pose, level, { from = null, mirror = false, mode = 'loop', intro = 2.8 } = {}) {
    const { frame, props } = poseFrames(pose, level);
    const start = from || neutralFrame(pose.start);
    const gs = geometry(start), ge = geometry(frame);
    const [a0, a1] = xExtent(gs), [b0, b1] = xExtent(ge);
    this.cfg = { start, end: frame, props, mirror, mode, intro, c0: (a0 + a1) / 2, c1: (b0 + b1) / 2 };
    this.time = 0;
    this.frame(0);
  }
  frameAt(time) {
    const c = this.cfg;
    let e;
    if (c.mode === 'once') e = ease(clamp((time - 0.25) / c.intro));
    else {
      const T = time % 10;
      if (T < 0.6) e = 0;
      else if (T < 3.4) e = ease((T - 0.6) / 2.8);
      else if (T < 7.2) e = 1;
      else if (T < 10) e = 1 - ease((T - 7.2) / 2.8);
      else e = 0;
    }
    let f = blend(c.start, c.end, e);
    if (e > 0.98) { // breathing
      const b = Math.sin((time * 2 * Math.PI) / 4.5);
      f = { ...f, s: f.s + b * 1.4, h: f.h + b * 0.8 };
    }
    return { f, e };
  }
  frame(time) {
    const { f, e } = this.frameAt(time);
    const c = this.cfg;
    this.fig.draw(f, { mirror: c.mirror, props: c.props, e, cx: c.c0 + (c.c1 - c.c0) * e });
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
  setPlaying(p) { this.playing = p; }
  setSpeed(s) { this.speed = s; }
  currentFrame() { return this.frameAt(this.time).f; }
}
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// Static render of the hold position (used for cards and previews)
export function renderStatic(svg, pose, level = 1, { mirror = false, floor = true } = {}) {
  const fig = new Figure(svg, { floor });
  const { frame, props } = poseFrames(pose, level);
  fig.draw(frame, { mirror, props, e: 1 });
  return fig;
}
