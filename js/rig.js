// Pose rig: one 3-D skeleton, shared by the 2-D (SVG) renderer, the 3-D (three.js) renderer, the tuner and the tests.
// Pure maths, no DOM. See poses/README.md for the pose file format.
//
// WORLD: x = the way the figure faces (screen-right in the default view), y = up, z = towards the default camera.
// The figure's RIGHT side is at +z (near the camera in the default view), its LEFT side at -z. Units: the figure is ~200 tall.
// Every joint is [x, y, z] degrees ("anatomical" values, same meaning on both sides):
//   spine/neck/head/pelvis:  x = side-bend (+ toward the figure's right), y = turn (+ toward its left), z = bend forward (+) / back (-)
//   shoulder/hip:  x = abduction (+ lifts away from the midline), y = external rotation (+ turns out), z = flexion (+ swings forward)
//   elbow/knee:    z = flexion (bend, 0 = straight), y = forearm / shin roll
//   wrist:         x = flexion toward the palm, y = pronation (+ turns the palm down/back), z = hand swing in the bending plane
//   ankle:         z = dorsiflexion (+ toes up) / plantarflexion (- toes down), x = inversion, y = toes turn out (+)
// Rotation order per joint (child frame = parent frame * Rz * Rx * Ry); bones run along local +Y (spine, neck, head) or -Y (limbs).

export const DIMS = {
  head: 27, hipW: 9.5, spine: [22, 22, 18], shW: 22, shDrop: 4, neck: 10.5,
  ua: 37.2, fa: 29.2, hand: 21.6, th: 49, sh: 49.2, ankleH: 7.8, footF: 24, footB: 6,
};
export const SPINE = ['spine1', 'spine2', 'spine3'];
export const MID = ['neck', 'head', ...SPINE];
export const LIMB_JOINTS = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'];
export const JOINTS = ['pelvis', 'spine1', 'spine2', 'spine3', 'neck', 'head',
  ...['R', 'L'].flatMap((s) => LIMB_JOINTS.map((j) => j + s))];
export const AXES = ['x', 'y', 'z'];

// anatomical limits [min, max] per axis (degrees)
const FREE = [-360, 360];
export const LIMITS = {
  pelvis: { x: [-180, 180], y: [-180, 180], z: [-180, 180] },
  spine1: { x: [-30, 30], y: [-25, 25], z: [-40, 55] },
  spine2: { x: [-30, 30], y: [-35, 35], z: [-30, 45] },
  spine3: { x: [-25, 25], y: [-35, 35], z: [-25, 40] },
  neck: { x: [-45, 45], y: [-80, 80], z: [-60, 65] },
  head: { x: [-30, 30], y: [-45, 45], z: [-40, 45] },
  shoulder: { x: [-45, 185], y: [-180, 180], z: [-70, 185] },
  elbow: { x: [0, 0], y: [-90, 90], z: [-5, 150] },
  wrist: { x: [-80, 80], y: [-95, 95], z: [-35, 95] },
  hip: { x: [-50, 90], y: [-50, 95], z: [-35, 165] },
  knee: { x: [-5, 5], y: [-15, 15], z: [-5, 155] },
  ankle: { x: [-35, 30], y: [-40, 40], z: [-95, 35] },
};
export const limitOf = (joint, axis) => (LIMITS[joint.replace(/[RL]$/, '')] || { x: FREE, y: FREE, z: FREE })[axis];

// anatomical -> raw rotation signs (right side; the left side additionally negates raw x and y)
const SIGN = {
  pelvis: [1, 1, -1], spine1: [1, 1, -1], spine2: [1, 1, -1], spine3: [1, 1, -1], neck: [1, 1, -1], head: [1, 1, -1],
  shoulder: [-1, -1, 1], elbow: [-1, 1, 1], wrist: [1, 1, 1], hip: [-1, -1, 1], knee: [-1, 1, -1], ankle: [1, -1, 1],
};

// ---------------------------------------------------------------- small linear algebra (3x3 row-major arrays)
const rad = (d) => (d * Math.PI) / 180;
export const deg = (r) => (r * 180) / Math.PI;
const Rx = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const Ry = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const Rz = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
export const mul = (A, B) => {
  const o = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return o;
};
export const app = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
export const transp = (M) => [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const mid = (a, b) => scl(add(a, b), 0.5);
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
// child rotation from raw degrees [x,y,z]: Rz * Rx * Ry
export const euler = (r) => mul(Rz(rad(r[2])), mul(Rx(rad(r[0])), Ry(rad(r[1]))));
// decompose Rz*Rx*Ry back to raw degrees [x,y,z]
export function eulerOf(M) {
  const x = Math.asin(Math.max(-1, Math.min(1, M[7])));
  let y, z;
  if (Math.abs(M[7]) < 0.99999) { z = Math.atan2(-M[1], M[4]); y = Math.atan2(-M[6], M[8]); } else { z = Math.atan2(M[3], M[0]); y = 0; }
  return [deg(x), deg(y), deg(z)];
}
export const rawOf = (joint, side, a) => {
  const sg = SIGN[joint]; const m = side === 'L' ? -1 : 1;
  return [a[0] * sg[0] * m, a[1] * sg[1] * m, a[2] * sg[2]];
};
export const anatOf = (joint, side, raw) => {
  const sg = SIGN[joint]; const m = side === 'L' ? -1 : 1;
  return [raw[0] * sg[0] * m, raw[1] * sg[1] * m, raw[2] * sg[2]];
};
const E = (joint, side, a) => euler(rawOf(joint, side, a || [0, 0, 0]));

// ---------------------------------------------------------------- frames (the pose data)
export const zeroFrame = () => {
  const f = { pelvis: { pos: [0, 0, 0], rot: [0, 0, 0] } };
  for (const j of JOINTS) if (j !== 'pelvis') f[j] = [0, 0, 0];
  return f;
};
export const cloneFrame = (f) => JSON.parse(JSON.stringify(f));
export const jointVal = (f, j) => (j === 'pelvis' ? f.pelvis.rot : f[j]);
// fill missing joints with zeros (partial frames, alt overrides)
export const fullFrame = (f) => {
  const z = zeroFrame();
  if (f.pelvis) { z.pelvis.pos = [...(f.pelvis.pos || [0, 0, 0])]; z.pelvis.rot = [...(f.pelvis.rot || [0, 0, 0])]; }
  for (const j of JOINTS) if (j !== 'pelvis' && f[j]) z[j] = [...f[j]];
  return z;
};
export const overlay = (base, over) => {
  const o = cloneFrame(base);
  if (!over) return o;
  if (over.pelvis) { if (over.pelvis.pos) o.pelvis.pos = [...over.pelvis.pos]; if (over.pelvis.rot) o.pelvis.rot = [...over.pelvis.rot]; }
  for (const j of JOINTS) if (j !== 'pelvis' && over[j]) o[j] = [...over[j]];
  return o;
};
// L/R swap (the same pose done on the other side). Midline side-bend and turn flip sign.
export const swapLR = (f) => {
  const o = cloneFrame(f);
  for (const j of LIMB_JOINTS) { o[j + 'R'] = [...f[j + 'L']]; o[j + 'L'] = [...f[j + 'R']]; }
  o.pelvis.rot = [-f.pelvis.rot[0], -f.pelvis.rot[1], f.pelvis.rot[2]];
  o.pelvis.pos = [f.pelvis.pos[0], f.pelvis.pos[1], -f.pelvis.pos[2]];
  for (const j of MID) o[j] = [-f[j][0], -f[j][1], f[j][2]];
  return o;
};

// Per-joint time offsets (fraction of the move) so distal joints trail a little: follow-through.
const DELAY = { pelvis: 0, spine1: 0.02, spine2: 0.05, spine3: 0.08, neck: 0.11, head: 0.14, shoulder: 0.06, elbow: 0.1, wrist: 0.15, hip: 0, knee: 0.04, ankle: 0.09 };
const MAXD = 0.15;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10));
export function blendFrames(a, b, u, { stagger = true } = {}) {
  const o = zeroFrame();
  const t = (j) => (stagger ? smooth((u * (1 + MAXD) - (DELAY[j.replace(/[RL]$/, '')] ?? 0)) / 1) : u);
  const tt = Math.max(0, Math.min(1, u));
  for (let i = 0; i < 3; i++) {
    o.pelvis.pos[i] = a.pelvis.pos[i] + (b.pelvis.pos[i] - a.pelvis.pos[i]) * tt;
    o.pelvis.rot[i] = a.pelvis.rot[i] + (b.pelvis.rot[i] - a.pelvis.rot[i]) * (stagger ? Math.min(1, Math.max(0, tt)) : tt);
  }
  for (const j of JOINTS) {
    if (j === 'pelvis') continue;
    const k = Math.max(0, Math.min(1, t(j)));
    for (let i = 0; i < 3; i++) o[j][i] = a[j][i] + (b[j][i] - a[j][i]) * k;
  }
  return o;
}

// ---------------------------------------------------------------- forward kinematics
const D = DIMS;
// returns { J: joint points, prims: drawable primitives, head: {...}, minY, ext }
export function solve(frame, { breath = 0 } = {}) {
  const f = frame;
  const J = {};
  const P0 = [f.pelvis.pos[0], 0, f.pelvis.pos[2]];
  const Fp = mul(E('pelvis', 'R', f.pelvis.rot), I3);
  J.pelvis = P0;
  const F1 = mul(Fp, E('spine1', 'R', f.spine1));
  const p1 = add(P0, app(F1, [0, D.spine[0], 0]));
  const F2 = mul(F1, E('spine2', 'R', f.spine2));
  const p2 = add(p1, app(F2, [0, D.spine[1], 0]));
  const F3 = mul(F2, E('spine3', 'R', f.spine3));
  const p3 = add(p2, app(F3, [0, D.spine[2], 0]));
  const Fn = mul(F3, E('neck', 'R', f.neck));
  const pn = add(p3, app(Fn, [0, D.neck, 0]));
  const Fh = mul(Fn, E('head', 'R', f.head));
  const hc = add(pn, app(Fh, [1.5, 9, 0]));
  Object.assign(J, { spine1: p1, spine2: p2, spine3: p3, neckTop: pn, head: hc });
  const fr = {};
  for (const s of ['R', 'L']) {
    const z = s === 'R' ? 1 : -1;
    const sh = add(p3, app(F3, [0, -D.shDrop, z * D.shW]));
    const Fs = mul(F3, E('shoulder', s, f['shoulder' + s]));
    const el = add(sh, app(Fs, [0, -D.ua, 0]));
    const Fe = mul(Fs, E('elbow', s, f['elbow' + s]));
    const wr = add(el, app(Fe, [0, -D.fa, 0]));
    const Fw = mul(Fe, E('wrist', s, f['wrist' + s]));
    const hip = add(P0, app(Fp, [0, 0, z * D.hipW]));
    const Fi = mul(Fp, E('hip', s, f['hip' + s]));
    const kn = add(hip, app(Fi, [0, -D.th, 0]));
    const Fk = mul(Fi, E('knee', s, f['knee' + s]));
    const an = add(kn, app(Fk, [0, -D.sh, 0]));
    const Fa = mul(Fk, E('ankle', s, f['ankle' + s]));
    J['shoulder' + s] = sh; J['elbow' + s] = el; J['wrist' + s] = wr; J['hip' + s] = hip; J['knee' + s] = kn; J['ankle' + s] = an;
    J['fingers' + s] = add(wr, app(Fw, [0, -D.hand, 0]));
    J['toe' + s] = add(an, app(Fa, [D.footF, -D.ankleH + 3, 0]));
    J['heel' + s] = add(an, app(Fa, [-D.footB, -D.ankleH + 3.5, 0]));
    fr[s] = { Fs, Fe, Fw, Fi, Fk, Fa };
  }
  // ---- primitives
  const prims = [];
  const cap = (id, mat, a, b, r0, r1, bias = 0) => prims.push({ id, kind: 'cap', mat, p0: a, p1: b, r0, r1, bias });
  const ell = (id, mat, c, M, rx, ry, rz, bias = 0) => prims.push({ id, kind: 'ell', mat, c, ax: [app(M, [rx, 0, 0]), app(M, [0, ry, 0]), app(M, [0, 0, rz])], bias });
  const br = 1 + breath;
  ell('pelvis', 'legs', add(P0, app(Fp, [0, 6, 0])), Fp, 12.2, 12.4, 17.8, 0.5);
  cap('waist', 'top', add(P0, app(Fp, [0, 9, 0])), add(p2, app(F3, [0, 5, 0])), 10.6, 11.4, -0.4);
  ell('abdomen', 'top', p1, F2, 10.8 * (1 + breath * 1.5), 14.5, 14.2 * (1 + breath * 0.6), 0);
  ell('chest', 'top', add(p2, app(F3, [0, 8.5, 0])), F3, 12 * br, 17, 16.5 * br, 0);
  cap('neck', 'skin', add(p3, app(Fn, [0, -3, 0])), pn, 5.8, 4.9);
  for (const s of ['R', 'L']) {
    const { Fs, Fe, Fw, Fi, Fk, Fa } = fr[s];
    const sh = J['shoulder' + s], el = J['elbow' + s], wr = J['wrist' + s], hip = J['hip' + s], kn = J['knee' + s], an = J['ankle' + s];
    ell('delt' + s, 'top', sh, F3, 6.6, 6.6, 6.6, 0.2);
    cap('uarm' + s, 'skin', sh, el, 5.2, 4.3);
    cap('farm' + s, 'skin', el, wr, 4.3, 3.1);
    ell('palm' + s, 'skin', add(wr, app(Fw, [0, -6, 0])), Fw, 4.1, 6.4, 2.5);
    ell('fing' + s, 'skin', add(wr, app(Fw, [0, -15.3, 0])), Fw, 3.7, 5.9, 2.05);
    cap('thumb' + s, 'skin', add(wr, app(Fw, [2.2, -3.4, 0])), add(wr, app(Fw, [5.2, -10.8, 0.4])), 1.9, 1.35);
    cap('thigh' + s, 'legs', hip, kn, 9.4, 6.3, -0.1);
    cap('shank' + s, 'legs', kn, an, 5.9, 3.7);
    ell('ankle' + s, 'skin', add(an, app(Fa, [1, -3.2, 0])), Fa, 11.5, 5.4, 4.2);
    cap('heel' + s, 'skin', add(an, app(Fa, [-D.footB + 1.5, -D.ankleH + 3.8, 0])), add(an, app(Fa, [13, -D.ankleH + 3.3, 0])), 3.8, 3.4);
    cap('toes' + s, 'skin', add(an, app(Fa, [13, -D.ankleH + 3.3, 0])), add(an, app(Fa, [D.footF - 2.4, -D.ankleH + 2.7, 0])), 3.4, 2.7);
  }
  // head (all ids start with 'h_' so renderers can group them)
  const rx = 11, ry = 13.5, rz = 8.8;
  ell('h_head', 'skin', hc, Fh, rx, ry, rz, 0);
  ell('h_jaw', 'skin', add(hc, app(Fh, [3.4, -6.4, 0])), Fh, 7.2, 6.4, 6.4, 0);
  ell('h_hair', 'hair', add(hc, app(Fh, [-3.4, 2.6, 0])), Fh, rx * 1.04, ry * 1.01, rz * 1.1, -0.5);
  ell('h_fringe', 'hair', add(hc, app(Fh, [1.4, 6.4, 0])), Fh, 9.8, 7.4, 8.9, 0.4);
  ell('h_bun', 'hair', add(hc, app(Fh, [-10.8, 10.6, 0])), Fh, 5.4, 5.4, 5.4, -0.6);
  ell('h_nose', 'skin', add(hc, app(Fh, [10.2, -1.6, 0])), Fh, 2.4, 3.1, 1.7, 0.3);
  ell('h_earR', 'skin', add(hc, app(Fh, [-1.2, -1.6, 8.4])), Fh, 2.4, 3.4, 1.3, 0.1);
  ell('h_earL', 'skin', add(hc, app(Fh, [-1.2, -1.6, -8.4])), Fh, 2.4, 3.4, 1.3, 0.1);
  const head = { c: hc, F: Fh, rx, ry, rz };
  // ground: lowest point of any primitive
  let minY = 1e9, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, maxY = -1e9;
  for (const p of prims) {
    let lo, hi, xl, xh, zl, zh;
    if (p.kind === 'cap') {
      lo = Math.min(p.p0[1] - p.r0, p.p1[1] - p.r1); hi = Math.max(p.p0[1] + p.r0, p.p1[1] + p.r1);
      xl = Math.min(p.p0[0] - p.r0, p.p1[0] - p.r1); xh = Math.max(p.p0[0] + p.r0, p.p1[0] + p.r1);
      zl = Math.min(p.p0[2] - p.r0, p.p1[2] - p.r1); zh = Math.max(p.p0[2] + p.r0, p.p1[2] + p.r1);
    } else {
      const e = (i) => Math.hypot(p.ax[0][i], p.ax[1][i], p.ax[2][i]);
      lo = p.c[1] - e(1); hi = p.c[1] + e(1); xl = p.c[0] - e(0); xh = p.c[0] + e(0); zl = p.c[2] - e(2); zh = p.c[2] + e(2);
    }
    if (p.id === 'bun') { /* decoration, still counts */ }
    minY = Math.min(minY, lo); maxY = Math.max(maxY, hi); minX = Math.min(minX, xl); maxX = Math.max(maxX, xh); minZ = Math.min(minZ, zl); maxZ = Math.max(maxZ, zh);
  }
  const lift = f.pelvis.pos[1] || 0;
  const dy = -minY + lift;
  const shift = (v) => [v[0], v[1] + dy, v[2]];
  for (const k of Object.keys(J)) J[k] = shift(J[k]);
  for (const p of prims) {
    if (p.kind === 'cap') { p.p0 = shift(p.p0); p.p1 = shift(p.p1); } else p.c = shift(p.c);
  }
  head.c = shift(head.c);
  return { J, prims, head, F: { pelvis: Fp, chest: F3 }, bounds: { minX, maxX, minY: 0, maxY: maxY + dy, minZ, maxZ }, lift };
}

// vertical / horizontal extent of one primitive
export function primBox(p) {
  if (p.kind === 'cap') {
    return { lo: Math.min(p.p0[1] - p.r0, p.p1[1] - p.r1), hi: Math.max(p.p0[1] + p.r0, p.p1[1] + p.r1), xl: Math.min(p.p0[0] - p.r0, p.p1[0] - p.r1), xh: Math.max(p.p0[0] + p.r0, p.p1[0] + p.r1) };
  }
  const e = (i) => Math.hypot(p.ax[0][i], p.ax[1][i], p.ax[2][i]);
  return { lo: p.c[1] - e(1), hi: p.c[1] + e(1), xl: p.c[0] - e(0), xh: p.c[0] + e(0) };
}

// ---------------------------------------------------------------- camera / projection (orthographic)
export function camera(az = 0, el = 0) {
  const a = rad(az), e = rad(el);
  const toCam = [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
  const right = [Math.cos(a), 0, -Math.sin(a)];
  const up = [toCam[1] * right[2] - toCam[2] * right[1], toCam[2] * right[0] - toCam[0] * right[2], toCam[0] * right[1] - toCam[1] * right[0]];
  return { toCam, right, up, az, el };
}
// world point -> [screenX (right +), screenY (up +), depth (towards viewer +)]
export const project = (cam, p) => [
  p[0] * cam.right[0] + p[1] * cam.right[1] + p[2] * cam.right[2],
  p[0] * cam.up[0] + p[1] * cam.up[1] + p[2] * cam.up[2],
  p[0] * cam.toCam[0] + p[1] * cam.toCam[1] + p[2] * cam.toCam[2],
];

// ---------------------------------------------------------------- spec validation
export const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
export function validateFrame(f, label = 'frame', { strict = true } = {}) {
  const errs = [];
  if (!f || typeof f !== 'object') return [`${label}: missing`];
  const p = f.pelvis;
  if (!p || !Array.isArray(p.pos) || p.pos.length !== 3 || !p.pos.every(isNum)) errs.push(`${label}.pelvis.pos must be [x,y,z] numbers`);
  if (!p || !Array.isArray(p.rot) || p.rot.length !== 3 || !p.rot.every(isNum)) errs.push(`${label}.pelvis.rot must be [x,y,z] numbers`);
  for (const j of JOINTS) {
    if (j === 'pelvis') continue;
    const v = f[j];
    if (!Array.isArray(v) || v.length !== 3 || !v.every(isNum)) { errs.push(`${label}.${j} must be [x,y,z] numbers`); continue; }
    if (!strict) continue;
    AXES.forEach((ax, i) => { const [lo, hi] = limitOf(j, ax); if (v[i] < lo - 0.01 || v[i] > hi + 0.01) errs.push(`${label}.${j}.${ax}=${v[i]} outside [${lo},${hi}]`); });
  }
  return errs;
}
export function clampFrame(f) {
  const o = cloneFrame(f);
  for (const j of JOINTS) {
    if (j === 'pelvis') continue;
    AXES.forEach((ax, i) => { const [lo, hi] = limitOf(j, ax); o[j][i] = Math.max(lo, Math.min(hi, o[j][i])); });
  }
  return o;
}
export const round1 = (x) => Math.round(x * 10) / 10;
