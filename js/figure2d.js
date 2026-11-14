// 2D SVG renderer. Draws the SAME solved primitives (rig.js solve()) that the 3D renderer uses.
// Sphere-hulls, tapered capsules and ellipsoids are projected orthographically, sorted by depth
// (painter's algorithm) and filled with soft gradients lit from the upper left.
import { solve, camera, project, app, FACE } from './rig.js';
import { inkOn, inkSoftId, inkEdgeId, inkTwinK } from './inkstyle.js';

export const VBW = 400, VBH = 300, FLOOR = 262;
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};

// ------------------------------------------------------------ shared gradient defs
const MATS = { skin: 'sk', top: 'tp', legs: 'lg', hair: 'hr' };
function ensureDefs() {
  if (document.getElementById('fig-defs')) return;
  const svg = mk('svg', { id: 'fig-defs', width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden' });
  const defs = mk('defs', {}, svg);
  const stop = (g, off, v, far) => {
    const s = mk('stop', { offset: off }, g);
    const c = far ? `color-mix(in srgb, var(--${v}) 80%, var(--fig-far, #1d1814))` : `var(--${v})`;
    s.setAttribute('style', `stop-color:var(--${v});stop-color:${c}`);
  };
  for (const [name, v] of Object.entries(MATS)) {
    for (const far of [false, true]) {
      const g = mk('radialGradient', { id: `fg-${name}${far ? '-far' : ''}`, cx: '.5', cy: '.5', r: '.75', fx: '.34', fy: '.28' }, defs);
      stop(g, '0', `${v}-hi`, far); stop(g, '.5', v, far); stop(g, '1', `${v}-lo`, far);
    }
  }
  const sh = mk('radialGradient', { id: 'fg-shadow' }, defs);
  mk('stop', { offset: '0', 'stop-color': '#1c1814', 'stop-opacity': '.34' }, sh);
  mk('stop', { offset: '.6', 'stop-color': '#1c1814', 'stop-opacity': '.12' }, sh);
  mk('stop', { offset: '1', 'stop-color': '#1c1814', 'stop-opacity': '0' }, sh);
  document.body.appendChild(svg);
}

// ink style: flat cel tones (hard stop between the lit tone and the shade tone) instead of soft gradients
function celStops(g, v, far, at) {
  const stop = (off, name) => {
    const s = mk('stop', { offset: off }, g);
    const c = far ? `color-mix(in srgb, var(--${name}) 80%, var(--fig-far, #1d1814))` : `var(--${name})`;
    s.setAttribute('style', `stop-color:var(--${name});stop-color:${c}`);
  };
  stop('0', v); stop(at, v); stop(at, v + '-lo'); stop('1', v + '-lo');
}
function ensureInkDefs() {
  if (document.getElementById('fig-defs-ink')) return;
  const svg = mk('svg', { id: 'fig-defs-ink', width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden' });
  const defs = mk('defs', {}, svg);
  for (const [name, v] of Object.entries(MATS)) {
    for (const far of [false, true]) {
      const g = mk('radialGradient', { id: `fg-ink-${name}${far ? '-far' : ''}`, cx: '.5', cy: '.5', r: '.75', fx: '.34', fy: '.28' }, defs);
      celStops(g, v, far, '.55');
    }
  }
  document.body.appendChild(svg);
}

function linGrad(defs, id, v, far, cel) {
  const g = mk('linearGradient', { id, gradientUnits: 'userSpaceOnUse' }, defs);
  const stop = (off, name) => {
    const s = mk('stop', { offset: off }, g);
    const c = far ? `color-mix(in srgb, var(--${name}) 80%, var(--fig-far, #1d1814))` : `var(--${name})`;
    s.setAttribute('style', `stop-color:var(--${name});stop-color:${c}`);
  };
  if (cel) { celStops(g, v, far, '.58'); return g; }
  stop('0', v); stop('.28', v + '-hi'); stop('.62', v); stop('1', v + '-lo');
  return g;
}

// ------------------------------------------------------------ fitting
// A view = { cam, scale, cx }: orthographic camera, px per model unit, model-space screen-x centre.
export function framesBounds(frames, cam) {
  let sx0 = 1e9, sx1 = -1e9, sy1 = -1e9, sy0 = 1e9;
  for (const f of frames) {
    const S = solve(f);
    for (const p of S.prims) {
      const pts = p.kind === 'cap' ? [p.p0, p.p1] : p.kind === 'hull' ? p.pts : [p.c];
      const r0 = p.kind === 'cap' ? Math.max(p.r0, p.r1) : p.kind === 'hull' ? 0 : Math.max(...p.ax.map((a) => Math.hypot(a[0], a[1], a[2])));
      for (const q of pts) {
        const s = project(cam, q), r = p.kind === 'hull' ? q[3] : r0;
        sx0 = Math.min(sx0, s[0] - r); sx1 = Math.max(sx1, s[0] + r);
        sy1 = Math.max(sy1, s[1] + r); sy0 = Math.min(sy0, s[1] - r);
      }
    }
  }
  return { sx0, sx1, sy0, sy1 };
}
export function fitView(frames, camSpec, { minScale = 0.7, maxScale = 2.1, pad = 1 } = {}) {
  const cam = camera(camSpec.az, camSpec.el);
  const b = framesBounds(frames, cam);
  const w = (b.sx1 - b.sx0) * pad + 14, h = Math.max(1, b.sy1) + 8;
  const scale = Math.max(minScale, Math.min(maxScale, (VBW - 44) / w, (FLOOR - 22) / h));
  return { cam, scale, cx: (b.sx0 + b.sx1) / 2 };
}

// ------------------------------------------------------------ geometry helpers
const capPath = (x0, y0, r0, x1, y1, r1) => {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
  const circ = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
  if (d <= Math.abs(r0 - r1) + 0.01) return r0 >= r1 ? circ(x0, y0, r0) : circ(x1, y1, r1);
  const th = Math.atan2(dy, dx), a = Math.asin((r0 - r1) / d);
  const t1 = th + Math.PI / 2 + a, t2 = th - Math.PI / 2 - a;
  const P = (x, y, r, t) => [x + r * Math.cos(t), y + r * Math.sin(t)];
  const a0 = P(x0, y0, r0, t1), a1 = P(x1, y1, r1, t1), b1 = P(x1, y1, r1, t2), b0 = P(x0, y0, r0, t2);
  const f = (v) => v.map((n) => +n.toFixed(2)).join(' ');
  return `M${f(a0)}L${f(a1)}A${r1} ${r1} 0 1 0 ${f(b1)}L${f(b0)}A${r0} ${r0} 0 1 0 ${f(a0)}z`;
};

// outline of the convex hull of circles [[x, y, r], ...] (support mapping, sampled directions)
const NH = 48, HC = [], HS = [];
for (let k = 0; k < NH; k++) { HC.push(Math.cos((k / NH) * 2 * Math.PI)); HS.push(Math.sin((k / NH) * 2 * Math.PI)); }
const hullPath = (cs) => {
  let d = '';
  for (let k = 0; k < NH; k++) {
    const dx = HC[k], dy = HS[k]; let best = -1e9, c = cs[0];
    for (let i = 0; i < cs.length; i++) { const v = cs[i][0] * dx + cs[i][1] * dy + cs[i][2]; if (v > best) { best = v; c = cs[i]; } }
    d += (k ? 'L' : 'M') + (c[0] + c[2] * dx).toFixed(2) + ' ' + (c[1] + c[2] * dy).toFixed(2);
  }
  return d + 'z';
};
const TORSO = new Set(['pelvis', 'waist', 'chest', 'trap', 'neck']);

export class Renderer2D {
  constructor(svg, { floor = true, ink = inkOn() } = {}) {
    ensureDefs();
    this.ink = !!ink;
    svg.classList.toggle('fig-ink', this.ink);
    if (this.ink) ensureInkDefs();
    this.svg = svg;
    svg.setAttribute('viewBox', `0 0 ${VBW} ${VBH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = '';
    this.floorOn = floor;
    this.defs = mk('defs', {}, svg); this.lgs = new Map(); this.uid = 'l' + (Renderer2D._n = (Renderer2D._n || 0) + 1);
    this.shadow = mk('ellipse', { fill: 'url(#fg-shadow)', class: 'fig-shadow' }, svg);
    if (floor) this.floor = mk('line', { x1: 10, x2: VBW - 10, y1: FLOOR, y2: FLOOR, class: 'fig-floor' }, svg);
    this.root = mk('g', {}, svg);
    this.back = mk('g', { class: 'fig-props' }, this.root);
    this.under = this.ink ? mk('g', { class: 'fig-under' }, this.root) : null; // thick ink silhouette, drawn below the body
    this.body = mk('g', { class: 'fig-body' }, this.root);
    this.faceG = mk('g', { class: 'fig-face', fill: 'none', 'stroke-linecap': 'round' });
    this.front = mk('g', { class: 'fig-props' }, this.root);
    this.els = new Map();
    this.order = '';
    this.cheeks = FACE.cheeks.map(() => mk('ellipse', { class: 'fig-cheek' }, this.faceG));
    this.strokes = FACE.strokes.map((k) => mk('path', { class: 'fig-' + k.cls }, this.faceG));
  }

  // frame: full frame; props: [{type,...}]; e: 0..1 prop visibility; view from fitView
  draw(frame, { props = [], e = 1, breath = 0, view }) {
    const { cam, scale, cx } = view;
    const S = solve(frame, { breath });
    const PX = (p) => { const s = project(cam, p); return [200 + (s[0] - cx) * scale, FLOOR - s[1] * scale, s[2]]; };
    const mat = (m, far, id) => `url(#fg-${this.ink && !inkSoftId(id) ? 'ink-' : ''}${m}${far ? '-far' : ''})`;
    // body depth reference (so the far limbs read darker)
    let dsum = 0;
    for (const k of ['pelvis', 'spine3']) dsum += PX(S.J[k])[2];
    const dref = dsum / 2;

    const items = [];
    for (const p of S.prims) {
      let key, d;
      if (p.kind === 'hull') {
        const cs = p.pts.map((q) => { const s = PX(q); return [s[0], s[1], q[3] * scale, s[2]]; });
        key = 0; let wz = 0; for (let i = 0; i < cs.length; i++) { key += cs[i][3]; wz += p.pts[i][2]; }
        items.push({ p, key: key / cs.length + (p.bias || 0), hull: true, cs, d: hullPath(cs), wz: wz / cs.length });
      } else if (p.kind === 'cap') {
        const a = PX(p.p0), b = PX(p.p1);
        key = (a[2] + b[2]) / 2; d = capPath(a[0], a[1], p.r0 * scale, b[0], b[1], p.r1 * scale);
        items.push({ p, key: key + (p.bias || 0), cap: true, d });
      } else {
        const c = PX(p.c);
        const u = p.ax.map((v) => [(v[0] * cam.right[0] + v[1] * cam.right[1] + v[2] * cam.right[2]) * scale, -(v[0] * cam.up[0] + v[1] * cam.up[1] + v[2] * cam.up[2]) * scale]);
        let A = 0, B = 0, C = 0;
        for (const v of u) { A += v[0] * v[0]; B += v[0] * v[1]; C += v[1] * v[1]; }
        const m = (A + C) / 2, q = Math.sqrt(((A - C) / 2) ** 2 + B * B);
        const l1 = Math.max(0.01, m + q), l2 = Math.max(0.01, m - q);
        const ang = (0.5 * Math.atan2(2 * B, A - C) * 180) / Math.PI;
        items.push({ p, key: c[2] + (p.bias || 0), cap: false, c, rx: Math.sqrt(l1), ry: Math.sqrt(l2), ang });
      }
    }
    items.sort((a, b) => a.key - b.key);
    const sig = items.map((i) => i.p.id).join();
    for (const it of items) {
      const id = it.p.id;
      let el = this.els.get(id);
      const tag = it.cap || it.hull ? 'path' : 'ellipse';
      if (!el) {
        el = mk(tag, { class: 'fp fp-' + it.p.mat + (it.p.mat === 'hair' ? ' fp-hair' : id === 'h_head' ? ' fp-head' : '') });
        this.els.set(id, el);
      }
      if (it.hull) {
        el.setAttribute('d', it.d);
        const farH = !TORSO.has(id) && !id.startsWith('h_') && it.wz < S.J.pelvis[2] - 3 && it.key < dref - 4;
        if (it.p.g === 'rad') { el.setAttribute('fill', mat(it.p.mat, farH, id)); continue; }
        // shaded across the hull's long axis (first -> last sphere), light from the upper left
        const cs = it.cs, a = cs[0], b = cs[cs.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy);
        let nx = -0.5 / 0.986, ny = -0.85 / 0.986;
        if (dl > 0.35 * (a[2] + b[2])) { nx = -dy / dl; ny = dx / dl; if (nx * -0.5 + ny * -0.85 < 0) { nx = -nx; ny = -ny; } }
        let hi = -1e9, lo = 1e9;
        for (const c of cs) { const v = c[0] * nx + c[1] * ny; hi = Math.max(hi, v + c[2]); lo = Math.min(lo, v - c[2]); }
        const gk = id + (farH ? 'f' : 'n');
        let g = this.lgs.get(gk);
        if (!g) { g = linGrad(this.defs, `${this.uid}-${gk}`, MATS[it.p.mat], farH, this.ink && !inkSoftId(id)); this.lgs.set(gk, g); }
        g.setAttribute('x1', (nx * hi).toFixed(2)); g.setAttribute('y1', (ny * hi).toFixed(2));
        g.setAttribute('x2', (nx * lo).toFixed(2)); g.setAttribute('y2', (ny * lo).toFixed(2));
        el.setAttribute('fill', `url(#${this.uid}-${gk})`);
        continue;
      }
      const far = it.cap ? (it.p.p0[2] + it.p.p1[2]) / 2 < S.J.pelvis[2] - 3 && PX(it.p.p0)[2] < dref - 4 : false;
      const farEll = !it.cap && it.p.c[2] < S.J.pelvis[2] - 6 && it.key < dref - 4;
      const m = it.p.mat;
      const fill = mat(m, it.cap ? far : farEll && !id.startsWith('h_'), id);
      if (it.cap) {
        el.setAttribute('d', it.d);
        // cylindrical shading: linear gradient across the limb axis, light from the upper left
        const a = PX(it.p.p0), b = PX(it.p.p1), dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
        let nx = -dy / dl, ny = dx / dl; if (nx * -0.5 + ny * -0.85 < 0) { nx = -nx; ny = -ny; }
        const rr = Math.max(it.p.r0, it.p.r1) * scale, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const key = id + (far ? 'f' : 'n');
        let g = this.lgs.get(key);
        if (!g) { g = linGrad(this.defs, `${this.uid}-${key}`, MATS[m], far, this.ink && !inkSoftId(id)); this.lgs.set(key, g); }
        g.setAttribute('x1', (mx + nx * rr).toFixed(2)); g.setAttribute('y1', (my + ny * rr).toFixed(2));
        g.setAttribute('x2', (mx - nx * rr).toFixed(2)); g.setAttribute('y2', (my - ny * rr).toFixed(2));
        el.setAttribute('fill', `url(#${this.uid}-${key})`);
        continue;
      } else {
        el.setAttribute('cx', it.c[0].toFixed(2)); el.setAttribute('cy', it.c[1].toFixed(2));
        el.setAttribute('rx', it.rx.toFixed(2)); el.setAttribute('ry', it.ry.toFixed(2));
        el.setAttribute('transform', `rotate(${it.ang.toFixed(2)} ${it.c[0].toFixed(2)} ${it.c[1].toFixed(2)})`);
      }
      el.setAttribute('fill', fill);
    }
    if (this.ink) this.inkPass(items);
    if (sig !== this.order) {
      // the face features sit right on top of the face piece
      const ids = items.map((i) => i.p.id);
      const at = ids.indexOf('h_head');
      ids.forEach((id, i) => { this.body.appendChild(this.els.get(id)); if (i === at) this.body.appendChild(this.faceG); });
      this.order = sig;
    }

    // ------- face
    this.drawFace(S, cam, PX, scale, items);

    // ------- ground shadow
    const b = S.bounds;
    const gc = PX([(b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2]);
    const sw = ((b.maxX - b.minX) * Math.abs(cam.right[0]) + (b.maxZ - b.minZ) * Math.abs(cam.right[2])) / 2 * scale;
    const lift = S.lift || 0;
    this.shadow.setAttribute('cx', gc[0]); this.shadow.setAttribute('cy', gc[1] + 1);
    this.shadow.setAttribute('rx', Math.max(24, sw * 1.05 + 10)); this.shadow.setAttribute('ry', 7 + Math.abs(cam.toCam[1]) * 40);
    this.shadow.setAttribute('opacity', String(Math.max(0.2, 1 - lift / 40)));

    this.drawProps(props, S, cam, PX, scale, e);
    this.S = S;
    return S;
  }

  // ink style: a hairline silhouette (a fill-and-stroke twin of every part drawn underneath the body, so only the outer edge shows),
  // plus a thin inner line on hands and feet. Widths are screen pixels (non-scaling stroke), set in CSS.
  inkPass(items) {
    if (!this.twins) this.twins = new Map();
    for (const it of items) {
      const id = it.p.id, el = this.els.get(id);
      if (inkEdgeId(id)) el.classList.add('fp-edge');
      const k = inkTwinK(id);
      if (!k) continue;
      let tw = this.twins.get(id);
      if (!tw) { tw = mk(el.tagName, { class: 'fig-twin' }); if (k < 1) tw.style.setProperty('--tw-k', String(k)); this.twins.set(id, tw); this.under.appendChild(tw); }
      for (const a of ['d', 'cx', 'cy', 'rx', 'ry', 'transform']) { const v = el.getAttribute(a); if (v !== null) tw.setAttribute(a, v); }
    }
  }

  // closed eyes, brows, mouth and a hint of blush: the shared FACE definition (head-local), faded out as it turns away
  drawFace(S, cam, PX, scale) {
    const { c, F } = S.head;
    const P = (v) => { const w = app(F, v); return PX([c[0] + w[0], c[1] + w[1], c[2] + w[2]]); };
    const vis = (n) => { const w = app(F, n); return Math.max(0, Math.min(1, (w[0] * cam.toCam[0] + w[1] * cam.toCam[1] + w[2] * cam.toCam[2] - 0.1) * 4)); };
    const f = (n) => n.toFixed(2);
    FACE.strokes.forEach((k, i) => {
      const [A, M, B] = k.pts.map(P), el = this.strokes[i];
      el.setAttribute('d', `M${f(A[0])} ${f(A[1])}Q${f(2 * M[0] - (A[0] + B[0]) / 2)} ${f(2 * M[1] - (A[1] + B[1]) / 2)} ${f(B[0])} ${f(B[1])}`);
      el.setAttribute('opacity', f(vis(k.n) * (k.cls === 'brow' ? 0.75 : 1)));
      el.style.strokeWidth = f(Math.max(0.55, k.w * scale));
    });
    FACE.cheeks.forEach((k, i) => {
      const p = P(k.c), el = this.cheeks[i];
      el.setAttribute('cx', f(p[0])); el.setAttribute('cy', f(p[1]));
      el.setAttribute('rx', f(k.rz * scale)); el.setAttribute('ry', f(k.ry * scale));
      el.setAttribute('opacity', f(vis(k.n) * 0.4));
    });
  }

  // ---- props: blocks, cushion, wall, strap (projected 3D boxes)
  drawProps(props, S, cam, PX, scale, e) {
    this.back.innerHTML = ''; this.front.innerHTML = '';
    const op = String(Math.max(0, Math.min(1, e * 1.4 - 0.2)));
    const poly = (parent, pts, cls, extra = {}) => mk('polygon', { points: pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), class: cls, opacity: op, ...extra }, parent);
    const box = (parent, c, sz, cls, cornerR = 0) => {
      const [hx, hy, hz] = [sz[0] / 2, sz[1] / 2, sz[2] / 2];
      const V = (sx, sy, sz2) => PX([c[0] + sx * hx, c[1] + sy * hy, c[2] + sz2 * hz]);
      const faces = [];
      // top, +x, -x, +z, -z faces; draw those facing the camera, top lighter
      const tc = cam.toCam;
      if (tc[1] > 0.001) faces.push([[V(-1, 1, -1), V(1, 1, -1), V(1, 1, 1), V(-1, 1, 1)], cls + ' top']);
      if (tc[0] > 0.001) faces.push([[V(1, -1, -1), V(1, -1, 1), V(1, 1, 1), V(1, 1, -1)], cls + ' side2']);
      if (tc[0] < -0.001) faces.push([[V(-1, -1, -1), V(-1, -1, 1), V(-1, 1, 1), V(-1, 1, -1)], cls + ' side2']);
      if (tc[2] > 0.001) faces.push([[V(-1, -1, 1), V(1, -1, 1), V(1, 1, 1), V(-1, 1, 1)], cls + ' side1']);
      if (tc[2] < -0.001) faces.push([[V(-1, -1, -1), V(1, -1, -1), V(1, 1, -1), V(-1, 1, -1)], cls + ' side1']);
      for (const [pts, k] of faces) poly(parent, pts, k, { 'stroke-linejoin': 'round' });
    };
    for (const p of props) {
      if (p.type === 'block') {
        const h = p.h || 22;
        for (const k of p.arms || ['R']) {
          const w = S.J['wrist' + k];
          box(this.back, [w[0], h / 2 * Math.max(0.01, Math.min(1, e * 1.4)), w[2]], [24, h * Math.max(0.01, Math.min(1, e * 1.4)), 12], 'prop-block');
        }
      } else if (p.type === 'cushion') {
        const pl = S.J.pelvis, h = (p.h || 12) * Math.min(1, e * 1.4);
        box(this.back, [pl[0] - 2, h / 2, pl[2]], [(p.w || 56), h, 36], 'prop-cushion');
      } else if (p.type === 'wall') {
        const b = S.bounds;
        const x = b.maxX + 8;
        const q = [PX([x, 0, -70]), PX([x, 0, 70]), PX([x, 215, 70]), PX([x, 215, -70])];
        poly(this.back, q, 'prop-wall');
      } else if (p.type === 'strap') {
        const w = S.J['wrist' + (p.arm || 'R')], an = S.J['ankle' + (p.leg || 'R')], toe = S.J['toe' + (p.leg || 'R')];
        const f = [(an[0] + toe[0]) / 2, (an[1] + toe[1]) / 2 - 2, (an[2] + toe[2]) / 2 + 1];
        const a = PX(w), z = PX(f);
        mk('line', { x1: a[0], y1: a[1], x2: z[0], y2: z[1], class: 'prop-strap', opacity: op, 'stroke-linecap': 'round' }, this.front);
        mk('ellipse', { cx: z[0], cy: z[1], rx: 4.5 * scale, ry: 7 * scale, class: 'prop-strap-loop', opacity: op }, this.front);
      }
    }
  }
}
