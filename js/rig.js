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
  spine3: { x: [-25, 25], y: [-35, 35], z: [-32, 40] },
  neck: { x: [-45, 45], y: [-80, 80], z: [-60, 65] },
  head: { x: [-30, 30], y: [-45, 45], z: [-40, 45] },
  shoulder: { x: [-45, 185], y: [-180, 180], z: [-100, 185] },
  elbow: { x: [0, 0], y: [-90, 90], z: [-5, 150] },
  wrist: { x: [-90, 80], y: [-95, 95], z: [-35, 95] },
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

// Per-joint time offsets (fraction of the ~2.8 s entry) so distal joints trail a little: follow-through.
// ~110 ms head, ~90 ms wrist, ~70 ms elbow, ~25 ms spine steps (at the default 2.8 s move).
const DELAY = { pelvis: 0, spine1: 0.004, spine2: 0.009, spine3: 0.014, neck: 0.028, head: 0.04, shoulder: 0.014, elbow: 0.025, wrist: 0.032, hip: 0, knee: 0.008, ankle: 0.03 };
const MAXD = 0.05;
// cubic-bezier(0.4, 0, 0.2, 1) plus a slight anticipation (3% back) and settle (2.5% over, back to rest)
const bez = (x1, y1, x2, y2) => (x) => {
  if (x <= 0) return 0; if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x;
    const d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
    if (Math.abs(d) < 1e-6) break; t -= cx / d;
  }
  t = Math.max(0, Math.min(1, t));
  return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
};
const bezE = bez(0.4, 0, 0.2, 1);
export const ease = (x) => {
  if (x <= 0) return 0; if (x >= 1) return 1;
  let v = bezE(x);
  if (x < 0.14) v -= 0.03 * Math.sin((Math.PI * x) / 0.14) * (1 - x / 0.14);
  if (x > 0.78) v += 0.025 * Math.sin((Math.PI * (x - 0.78)) / 0.22);
  return v;
};
export function blendFrames(a, b, u, { stagger = true } = {}) {
  const o = zeroFrame();
  const t = (j) => (stagger ? ease(u * (1 + MAXD) - (DELAY[j.replace(/[RL]$/, '')] ?? 0)) : u);
  const tt = Math.max(0, Math.min(1, u));
  for (let i = 0; i < 3; i++) {
    const te = stagger ? ease(tt) : tt;
    o.pelvis.pos[i] = a.pelvis.pos[i] + (b.pelvis.pos[i] - a.pelvis.pos[i]) * te;
    o.pelvis.rot[i] = a.pelvis.rot[i] + (b.pelvis.rot[i] - a.pelvis.rot[i]) * te;
  }
  for (const j of JOINTS) {
    if (j === 'pelvis') continue;
    const k = stagger ? t(j) : Math.max(0, Math.min(1, t(j)));
    for (let i = 0; i < 3; i++) o[j][i] = a[j][i] + (b[j][i] - a[j][i]) * k;
  }
  return o;
}

// ---------------------------------------------------------------- forward kinematics
const D = DIMS;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---- head shape (head-local: x = face forward, y = up, z = the figure's right; origin = head centre)
// The skin "face" piece sits on the front of the hair-coloured cranium, so its outline is the hairline
// from every direction (2D painter's order and the 3D depth buffer agree).
const FACE_HULL = [
  [5.4, 4.4, 2.6, 4.9], [5.4, 4.4, -2.6, 4.9],     // forehead / brow
  [4.4, -3.4, 3.8, 4.9], [4.4, -3.4, -3.8, 4.9],   // cheekbones
  [5.5, -10.2, 0, 3.2],                            // chin
  [0.6, -0.8, 4.6, 4.8], [0.6, -0.8, -4.6, 4.8],   // temples (skin reaches the ear in profile)
  [-0.4, -6.2, 5.1, 3.0], [-0.4, -6.2, -5.1, 3.0], // jaw angles
];
const HAIR_HULL = [[-1.6, 3.8, 0, 10.0], [-4.8, -3.6, 0, 6.4]];
// frontmost x of a sphere-hull at (y, z), and the surface normal there (support-function minimisation)
function hullFront(pts, y, z) {
  let best = 1e9, bn = [1, 0, 0];
  for (let i = -30; i <= 30; i++) for (let j = -30; j <= 30; j++) {
    const a = (i / 30) * 1.25, b = (j / 30) * 1.25;
    const d = [Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b)];
    let h = -1e9;
    for (const p of pts) h = Math.max(h, p[0] * d[0] + p[1] * d[1] + p[2] * d[2] + p[3]);
    const x = (h - y * d[1] - z * d[2]) / d[0];
    if (x < best) { best = x; bn = d; }
  }
  return { x: best, n: bn };
}
const r2 = (v) => v.map((x) => Math.round(x * 100) / 100);
const onFace = (y, z, lift = 0.22) => { const f = hullFront(FACE_HULL, y, z); return { p: r2([f.x + lift, y, z]), n: r2(f.n) }; };
// Face features, defined once (head-local) and drawn by both renderers. Closed, relaxed eyes; soft brows; a small calm mouth.
export const FACE = (() => {
  const strokes = [], cheeks = [];
  const stroke = (id, cls, w, yz) => { const q = yz.map(([y, z]) => onFace(y, z)); strokes.push({ id, cls, w, pts: q.map((v) => v.p), n: q[1].n }); };
  for (const [s, k] of [[1, 'R'], [-1, 'L']]) {
    stroke('eye' + k, 'eye', 0.62, [[0.1, 1.9 * s], [-0.75, 3.7 * s], [0.0, 5.45 * s]]);
    stroke('brow' + k, 'brow', 0.5, [[2.75, 1.7 * s], [3.45, 3.6 * s], [2.85, 5.7 * s]]);
    const c = onFace(-4.0, 5.3 * s, -0.25);
    cheeks.push({ id: 'cheek' + k, c: c.p, n: c.n, ry: 1.45, rz: 2.1 });
  }
  stroke('mouth', 'mouth', 0.55, [[-7.85, -1.75], [-8.35, 0], [-7.85, 1.75]]);
  return { strokes, cheeks };
})();

// returns { J: joint points, prims: drawable primitives, head: {...}, hands, feet, F, bounds, lift }
// Primitive kinds: 'cap' (tapered capsule p0,p1,r0,r1), 'ell' (ellipsoid c, ax[3]) and
// 'hull' (convex hull of spheres pts = [[x,y,z,r],...]; g: 'rad' = round shading, else shaded across pts[0] -> pts[last]).
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
  const hull = (id, mat, pts, bias = 0, g) => { const p = { id, kind: 'hull', mat, pts: pts.map((q) => [...q]), bias }; if (g) p.g = g; prims.push(p); return p; };
  // sphere at o + M*v
  const sp = (o, M, v, r) => { const w = app(M, v); return [o[0] + w[0], o[1] + w[1], o[2] + w[2], r]; };
  const br = 1 + breath, bb = 1 + breath * 1.5;

  // torso: pelvis (leggings, with glutes) -> waist -> rib cage with the shoulder line; neighbours share spheres
  hull('pelvis', 'legs', [
    sp(P0, Fp, [0.8, 12, 5.8], 7.7), sp(P0, Fp, [0.8, 12, -5.8], 7.7),
    sp(P0, Fp, [3.0, 4, 0], 9.0 * bb),
    sp(P0, Fp, [0, -1, 9], 9.8), sp(P0, Fp, [0, -1, -9], 9.8),
    sp(P0, Fp, [-4.2, -1.8, 6.5], 9.2), sp(P0, Fp, [-4.2, -1.8, -6.5], 9.2),
  ], 0.5, 'rad');
  const rib = [sp(p2, F3, [1, 0, 7.2], 8.2 * br), sp(p2, F3, [1, 0, -7.2], 8.2 * br)];
  hull('waist', 'top', [
    sp(P0, Fp, [0.8, 11, 5.8], 7.5), sp(P0, Fp, [0.8, 11, -5.8], 7.5),
    sp(p1, F2, [0.6 + breath * 12, 2, 5.5], 7.4), sp(p1, F2, [0.6 + breath * 12, 2, -5.5], 7.4),
    ...rib,
  ], -0.4);
  hull('chest', 'top', [
    ...rib,
    sp(p2, F3, [3.4, 7.5, 6.2], 8.0 * br), sp(p2, F3, [3.4, 7.5, -6.2], 8.0 * br),
    sp(p2, F3, [-2.6, 9, 7], 8.0), sp(p2, F3, [-2.6, 9, -7], 8.0),
    sp(p3, F3, [0, -4.6, 19], 5.4), sp(p3, F3, [0, -4.6, -19], 5.4),
  ], 0);
  hull('trap', 'skin', [sp(p3, F3, [-1.5, -0.6, 8.5], 3.6), sp(p3, F3, [-1.5, -0.6, -8.5], 3.6), sp(p3, Fn, [-0.3, 4.2, 0], 5.0)], -0.3, 'rad');
  cap('neck', 'skin', add(p3, app(Fn, [0, -2, 0])), add(pn, app(Fh, [0.4, 2.5, 0])), 5.1, 4.6, -0.2);

  const tips = []; // finger / toe hulls are added after the first floor estimate
  for (const s of ['R', 'L']) {
    const { Fs, Fe, Fw, Fi, Fk, Fa } = fr[s];
    const z = s === 'R' ? 1 : -1;
    const sh = J['shoulder' + s], el = J['elbow' + s], wr = J['wrist' + s], hip = J['hip' + s], kn = J['knee' + s], an = J['ankle' + s];
    // arm: deltoid cap blended into the upper arm, forearm with a soft bulge below the elbow, flat wrist
    hull('uarm' + s, 'skin', [sp(sh, Fs, [0, -1.2, 0.8 * z], 6.0), sp(sh, Fs, [0.5, -15, 0], 4.9), sp(el, Fs, [0, 0, 0], 4.0)], 0.3);
    const wA = sp(wr, Fw, [1.3, 0, 0], 2.4), wB = sp(wr, Fw, [-1.3, 0, 0], 2.4);
    hull('farm' + s, 'skin', [sp(el, Fe, [0, 0, 0], 4.0), sp(el, Fe, [0.3, -7.5, 0], 4.3), wA, wB], 0.1);
    // hand (hand-local: fingers along -y, thumb side +x, palm faces -z*s). The palm side is one flat plane 2.5 under the wrist.
    const PZ = (r) => -z * (2.5 - r);
    const kI = sp(wr, Fw, [2.8, -10.6, PZ(1.9)], 1.9), kP = sp(wr, Fw, [-3.0, -9.8, PZ(1.75)], 1.75);
    hull('palm' + s, 'skin', [wA, wB, sp(wr, Fw, [2.3, -4.6, PZ(2.2)], 2.2), sp(wr, Fw, [-2.5, -4.6, PZ(2.1)], 2.1), kI, kP], 0.15);
    cap('thumb' + s, 'skin', add(wr, app(Fw, [2.5, -3.9, PZ(2.0)])), add(wr, app(Fw, [6.0, -9.9, PZ(1.4)])), 2.0, 1.4, 0.1);
    tips.push({ kind: 'hand', s, z, wr, Fw, kI, kP, PZ });
    // leg
    hull('thigh' + s, 'legs', [sp(hip, Fi, [0, -0.5, 0], 10.0), sp(hip, Fi, [1.2, -20, 0], 8.8), sp(kn, Fi, [0, 0, 0], 6.5)], -0.1);
    hull('shank' + s, 'legs', [sp(kn, Fk, [0, 0, 0], 6.4), sp(kn, Fk, [-1.8, -14, 0], 6.2), sp(an, Fk, [0, 1, 0], 3.7)], 0);
    // foot (foot-local: toes +x, sole at y = -ankleH, big toe on the inner side)
    const m = -z, Y = (r) => -D.ankleH + r;
    const inst = sp(an, Fa, [1, -2.2, 0], 3.7);
    const bI = sp(an, Fa, [15.4, Y(2.4), 2.4 * m], 2.4), bO = sp(an, Fa, [13.6, Y(2.1), -2.9 * m], 2.1);
    hull('foot' + s, 'skin', [sp(an, Fa, [-2.8, Y(3.3), 0], 3.3), inst, sp(an, Fa, [8, -3.7, 0.3 * m], 3.0), bI, bO], 0.05);
    tips.push({ kind: 'foot', s, m, an, Fa, bI, bO, Y });
  }
  // head (all ids start with 'h_' so renderers can group them)
  const hp = (v) => sp(hc, Fh, [v[0], v[1], v[2]], v[3]);
  hull('h_hair', 'hair', HAIR_HULL.map(hp), -0.2, 'rad');
  ell('h_bun', 'hair', add(hc, app(Fh, [-11.2, -2.6, 0])), Fh, 4.4, 4.6, 4.6, -0.5);
  hull('h_head', 'skin', FACE_HULL.map(hp), 0.2, 'rad');
  hull('h_nose', 'skin', [hp([8.9, 0.2, 0, 0.9]), hp([9.9, -3.4, 0, 1.25])], 0.6, 'rad');
  ell('h_earR', 'skin', add(hc, app(Fh, [-1.7, -1.6, 9.1])), Fh, 1.7, 2.7, 1.1, 0.9);
  ell('h_earL', 'skin', add(hc, app(Fh, [-1.7, -1.6, -9.1])), Fh, 1.7, 2.7, 1.1, 0.9);
  const head = { c: hc, F: Fh, rx: 11, ry: 13.5, rz: 8.8 };

  // first floor estimate without fingers and toes, then lay those flat where the palm / ball of the foot rests on the floor
  let floor0 = 1e9;
  for (const p of prims) floor0 = Math.min(floor0, primBox(p).lo);
  const hands = {}, feet = {};
  for (const t of tips) {
    if (t.kind === 'hand') {
      const { s, z, wr, Fw, kI, kP, PZ } = t;
      const n = app(Fw, [0, 0, -z]), d = app(Fw, [0, -1, 0]);
      const low = Math.min(kI[1] - kI[3], kP[1] - kP[3], wr[1] - 2.5) - floor0;
      const w = (1 - sm(1.5, 6, low)) * sm(0.45, 0.8, -n[1]);
      const flat = Math.max(-0.8, Math.min(0.6, Math.atan2(d[1], -n[1] || 1e-6)));
      const a1 = 0.17 * (1 - w) + flat * w, a2 = a1 + 0.26 * (1 - w);
      // finger chain in the (along, toward-palm) plane, hinged at the knuckles
      const fp = (x, y0, l1, l2, r, seg) => {
        const u = seg === 1 ? l1 * Math.cos(a1) : l1 * Math.cos(a1) + l2 * Math.cos(a2);
        const v = seg === 1 ? l1 * Math.sin(a1) : l1 * Math.sin(a1) + l2 * Math.sin(a2);
        return sp(wr, Fw, [x, y0 - u, PZ(r) - z * v], r);
      };
      hull('fing' + s, 'skin', [kI, kP,
        fp(2.6, -10.6, 5.4, 4.3, 1.6, 1), fp(-2.9, -9.8, 4.6, 3.4, 1.45, 1),
        fp(1.5, -10.6, 5.4, 3.9, 1.35, 2), fp(-0.4, -10.4, 5.6, 4.3, 1.35, 2), fp(-2.6, -9.8, 4.6, 3.4, 1.2, 2)], 0.2);
      hands[s] = { n, d, flat: w };
    } else {
      const { s, m, an, Fa, bI, bO, Y } = t;
      const n = app(Fa, [0, -1, 0]), d = app(Fa, [1, 0, 0]);
      const low = Math.min(bI[1] - bI[3], bO[1] - bO[3]) - floor0;
      const w = (1 - sm(1.5, 6, low)) * sm(0.15, 0.45, -n[1]);
      const b = w * Math.max(0, Math.min(1.5, Math.atan2(-d[1], -n[1] || 1e-6)));
      const tp = (x, zz, r) => { const dx = x - 14.5; return sp(an, Fa, [14.5 + dx * Math.cos(b), Y(r) + dx * Math.sin(b), zz], r); };
      hull('toes' + s, 'skin', [bI, bO, tp(22.6, 2.7 * m, 1.5), tp(21.6, 0.2 * m, 1.4), tp(18.8, -3.7 * m, 1.3)], 0.1);
      feet[s] = { n, d, flat: w };
    }
  }
  // ground: lowest point of any primitive
  let minY = 1e9, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, maxY = -1e9;
  for (const p of prims) {
    const b = primBox(p);
    minY = Math.min(minY, b.lo); maxY = Math.max(maxY, b.hi); minX = Math.min(minX, b.xl); maxX = Math.max(maxX, b.xh); minZ = Math.min(minZ, b.zl); maxZ = Math.max(maxZ, b.zh);
  }
  const lift = f.pelvis.pos[1] || 0;
  const dy = -minY + lift;
  const shift = (v) => [v[0], v[1] + dy, v[2]];
  for (const k of Object.keys(J)) J[k] = shift(J[k]);
  for (const p of prims) {
    if (p.kind === 'cap') { p.p0 = shift(p.p0); p.p1 = shift(p.p1); } else if (p.kind === 'hull') { for (const q of p.pts) q[1] += dy; } else p.c = shift(p.c);
  }
  head.c = shift(head.c);
  return { J, prims, head, hands, feet, F: { pelvis: Fp, chest: F3 }, bounds: { minX, maxX, minY: 0, maxY: maxY + dy, minZ, maxZ }, lift };
}

// vertical / horizontal extent of one primitive
export function primBox(p) {
  if (p.kind === 'cap') {
    return { lo: Math.min(p.p0[1] - p.r0, p.p1[1] - p.r1), hi: Math.max(p.p0[1] + p.r0, p.p1[1] + p.r1), xl: Math.min(p.p0[0] - p.r0, p.p1[0] - p.r1), xh: Math.max(p.p0[0] + p.r0, p.p1[0] + p.r1), zl: Math.min(p.p0[2] - p.r0, p.p1[2] - p.r1), zh: Math.max(p.p0[2] + p.r0, p.p1[2] + p.r1) };
  }
  if (p.kind === 'hull') {
    const b = { lo: 1e9, hi: -1e9, xl: 1e9, xh: -1e9, zl: 1e9, zh: -1e9 };
    for (const q of p.pts) { b.lo = Math.min(b.lo, q[1] - q[3]); b.hi = Math.max(b.hi, q[1] + q[3]); b.xl = Math.min(b.xl, q[0] - q[3]); b.xh = Math.max(b.xh, q[0] + q[3]); b.zl = Math.min(b.zl, q[2] - q[3]); b.zh = Math.max(b.zh, q[2] + q[3]); }
    return b;
  }
  const e = (i) => Math.hypot(p.ax[0][i], p.ax[1][i], p.ax[2][i]);
  return { lo: p.c[1] - e(1), hi: p.c[1] + e(1), xl: p.c[0] - e(0), xh: p.c[0] + e(0), zl: p.c[2] - e(2), zh: p.c[2] + e(2) };
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
