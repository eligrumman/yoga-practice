// One-off migration: old planar pose data (tools/migrate/old-data + old-figure.mjs) -> poses/<id>.json (3-D joint rotations).
// Run: node tools/migrate-poses.mjs [id ...]      (writes poses/*.json; prints contact residuals)
// The output files are then the single source of truth; this script is kept for provenance only.
import { serializeSpec } from '../js/specfmt.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve as oldResolve, geometry as oldGeometry, bottom as oldBottom, NEUTRAL } from './migrate/old-figure.mjs';
import { POSES } from './migrate/old-data/poses.js';
import * as R from '../js/rig.js';
import { PATCHES, CAMERAS } from './migrate/patches.mjs';

const D = R.DIMS;
const normR = (a, lo) => ((((a - lo) % 360) + 360) % 360) + lo;
const norm = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const rad = (d) => (d * Math.PI) / 180;
const dg = (r) => (r * 180) / Math.PI;
const r1 = (x) => Math.round(x * 10) / 10;

// ---- absolute planar description -> rig frame
function fromAbs(A) {
  const fr = R.zeroFrame();
  const { t, s, h } = A;
  fr.pelvis.rot = [0, 0, norm(90 - t)];
  const tot = norm(s - t);
  for (const k of R.SPINE) fr[k] = [0, 0, -tot / 3];
  const hh = norm(h - s);
  fr.neck = [0, 0, -hh * 0.5]; fr.head = [0, 0, -hh * 0.5];
  const arm = (side, a) => {
    const z = normR(a[0] - s + 180, -90);
    let e = norm(a[1] - a[0]);
    let sy = 0;
    if (e < -5) { sy = 180; e = -e; }
    fr['shoulder' + side] = [0, sy, z];
    fr['elbow' + side] = [0, 0, Math.max(-5, e)];
    fr['wrist' + side] = [0, 0, a[2] === true ? norm(-a[1]) : 0];
  };
  arm('R', A.a); arm('L', A.b);
  const leg = (side, l) => {
    fr['hip' + side] = [0, 0, norm(l[0] - t + 180)];
    fr['knee' + side] = [0, 0, -norm(l[1] - l[0])];
    fr['ankle' + side] = [0, 0, norm(l[2] - (l[1] + 90))];
  };
  leg('R', A.l); leg('L', A.m);
  return fr;
}
// planar 2-link IK in the x-y plane (y up), same maths as the old model
function ik(p0, target, L1, L2, bend) {
  const dx = target[0] - p0[0], dy = target[1] - p0[1];
  const d = Math.hypot(dx, dy);
  const max = L1 + L2 - 0.01, min = Math.abs(L1 - L2) + 0.01;
  const dd = Math.min(max, Math.max(min, d));
  const base = dg(Math.atan2(dy, dx));
  const c = (L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd);
  const A = dg(Math.acos(Math.max(-1, Math.min(1, c))));
  const a1 = base + bend * A;
  const e = [p0[0] + Math.cos(rad(a1)) * L1, p0[1] + Math.sin(rad(a1)) * L1];
  const tgt = d > max || d < min ? [p0[0] + Math.cos(rad(base)) * dd, p0[1] + Math.sin(rad(base)) * dd] : target;
  return [a1, dg(Math.atan2(tgt[1] - e[1], tgt[0] - e[0])), d > max];
}
const lowOf = (S, ids) => Math.min(...S.prims.filter((p) => ids.some((i) => p.id === i)).map((p) => R.primBox(p).lo));
const HANDS = (s) => ['palm' + s, 'fing' + s, 'thumb' + s];
const FEET = (s) => ['ankle' + s, 'heel' + s, 'toes' + s];
const ALLHAND = [...HANDS('R'), ...HANDS('L')];

// ---- contact detection in the OLD geometry
function oldContacts(f) {
  const g = oldGeometry(f);
  const G = oldBottom(g);
  const foot = (leg) => leg[3][1] + 4 >= G - 2.5 || leg[2][1] + 7 >= G - 2.5;
  return { G, footR: foot(g.l), footL: foot(g.m), g };
}

// convert one level: kf (old, merged) -> frame
function convert(kfRaw, name) {
  const f = oldResolve(kfRaw);
  const A = { t: f.t, s: f.s, h: f.h, a: [...f.a], b: [...f.b], l: [...f.l], m: [...f.m] };
  const fx = kfRaw.fix || {};
  const C = oldContacts(f);
  const log = [];
  let fr = fromAbs(A);

  // legs: bring planted feet to the floor
  const fixLeg = (side) => {
    const key = side === 'R' ? 'l' : 'm';
    if (!(side === 'R' ? C.footR : C.footL)) return;
    if (Math.abs(norm(A[key][1] - 180)) < 45 || Math.abs(norm(A[key][1] - A[key][0])) > 100) return; // kneeling / folded legs rest on the floor already
    for (let it = 0; it < 6; it++) {
      const S = R.solve(fr);
      const hf = lowOf(S, FEET(side));
      const hOthers = Math.min(...S.prims.filter((p) => !FEET(side).includes(p.id)).map((p) => R.primBox(p).lo));
      // other foot / body defines the floor; this foot should sit on it
      const other = side === 'R' ? 'L' : 'R';
      const otherDown = (side === 'R' ? C.footL : C.footR) ? lowOf(S, FEET(other)) : 1e9;
      const floor = Math.min(0, otherDown);
      const dh = hf - Math.max(0, floor);
      if (Math.abs(dh) < 0.35) break;
      const hip = S.J['hip' + side], an = S.J['ankle' + side];
      const tgt = [an[0], an[1] - dh];
      const cur = A[key];
      const bend = 1;
      const [a1, a2] = ik([hip[0], hip[1]], tgt, D.th, D.sh, bend);
      const footAbs = cur[2];
      A[key] = [a1, a2, footAbs];
      fr = fromAbs(A);
    }
  };
  // arms: re-solve the old constraints with the new proportions
  const arms = () => {
    const S = R.solve(fr);
    for (const [k, side] of [['a', 'R'], ['b', 'L']]) {
      let c = fx[k];
      if (!c && k === 'b' && fx.a && !kfRaw.b) { A.b = [...A.a]; continue; }
      if (!c) continue;
      const sh = S.J['shoulder' + side];
      let tgt, L2 = D.fa + D.hand, flat = false;
      const legSide = (nm) => (nm === 'l' ? 'R' : 'L');
      if (c.to) {
        if (c.to === 'hip') tgt = [S.J.pelvis[0] + (c.dx ?? 8), S.J.pelvis[1] + 2];
        else {
          let lg = c.to;
          if (k === 'b' && kfRaw.m == null && lg === 'l') lg = 'm'; // symmetric legs: far hand goes to the far leg
          const sd = legSide(lg);
          const J = S.J;
          tgt = c.pt === 'knee' ? J['knee' + sd] : c.pt === 'toe' ? J['toe' + sd] : J['ankle' + sd];
          tgt = [tgt[0], tgt[1]];
          if (c.pt === 'knee') tgt[1] += 4;
        }
      } else if (c.fore) {
        // forearm flat on the floor: elbow at floor height
        const floor = Math.min(...S.prims.filter((p) => !ALLHAND.includes(p.id)).map((p) => R.primBox(p).lo));
        const ey = floor + 4.4, dy = sh[1] - ey;
        let phiU;
        if (dy >= D.ua) phiU = -90; else { const dx = Math.sqrt(D.ua * D.ua - dy * dy); phiU = dg(Math.atan2(ey - sh[1], dx)); }
        A[k] = [phiU, c.fa ?? 0, true];
        // forearm direction is flat
        continue;
      } else {
        const floor = Math.min(...S.prims.filter((p) => !ALLHAND.includes(p.id)).map((p) => R.primBox(p).lo));
        flat = true; L2 = D.fa;
        tgt = [sh[0] + (c.x || 0) - 9.5, floor + (c.blockH || 0) + 3.4];
      }
      const bend = c.bend ?? -1;
      const [a1, a2] = ik([sh[0], sh[1]], tgt, D.ua, L2, bend);
      A[k] = [a1, a2, flat];
    }
    fr = fromAbs(A);
  };
  fixLeg('R'); fixLeg('L'); arms();
  // second pass: legs can move the floor
  fixLeg('R'); fixLeg('L'); arms();
  // twist hint from the old data
  fr._tw = f.tw; fr._nz = f.nz;
  // report residuals
  const S = R.solve(fr);
  const res = [];
  for (const [k, side] of [['a', 'R'], ['b', 'L']]) if (fx[k] && !fx[k].to && !fx[k].fore) { const hl = lowOf(S, HANDS(side)) - (fx[k].blockH || 0); if (Math.abs(hl) > 0.8) res.push(`hand${side} ${hl.toFixed(1)}`); }
  for (const side of ['R', 'L']) if (side === 'R' ? C.footR : C.footL) { const hl = lowOf(S, FEET(side)); if (Math.abs(hl) > 0.8) res.push(`foot${side} ${hl.toFixed(1)}`); }
  if (res.length) log.push(`${name}: floating ${res.join(', ')}`);
  return { fr, log };
}

// clean: remove helper keys, clamp to limits, round
function finish(fr, name, log) {
  const o = R.cloneFrame(fr); delete o._tw; delete o._nz;
  const c = R.clampFrame(o);
  for (const j of R.JOINTS) { if (j === 'pelvis') continue; for (let i = 0; i < 3; i++) { if (Math.abs(c[j][i] - o[j][i]) > 0.5) log.push(`${name}: ${j}.${'xyz'[i]} ${r1(o[j][i])} clamped to ${r1(c[j][i])}`); c[j][i] = r1(c[j][i]); } }
  c.pelvis.rot = c.pelvis.rot.map(r1); c.pelvis.pos = c.pelvis.pos.map(r1);
  return c;
}
const diff = (base, f) => {
  const o = {}; let any = false;
  for (const j of R.JOINTS) {
    if (j === 'pelvis') { if (JSON.stringify(base.pelvis) !== JSON.stringify(f.pelvis)) { o.pelvis = f.pelvis; any = true; } continue; }
    if (base[j].some((v, i) => Math.abs(v - f[j][i]) > 0.05)) { o[j] = f[j]; any = true; }
  }
  return any ? o : null;
};
const sideMap = { a: 'R', b: 'L', l: 'R', m: 'L' };
const convProp = (p) => {
  const q = { ...p };
  if (q.arms) q.arms = q.arms.map((x) => sideMap[x]);
  if (q.arm) q.arm = sideMap[q.arm];
  if (q.leg) q.leg = sideMap[q.leg];
  if (q.type === 'block' && q.h == null) q.h = 22;
  return q;
};

const only = process.argv.slice(2);
mkdirSync(new URL('../poses/', import.meta.url), { recursive: true });
const allLogs = [];
for (const p of POSES) {
  if (only.length && !only.includes(p.id)) continue;
  const logs = [];
  const startRes = convert(NEUTRAL[p.start] || NEUTRAL.stand, p.id + ':start');
  let start = finish(startRes.fr, p.id + ':start', logs);
  const levels = p.variations.map((v, i) => {
    const name = `${p.id}:L${i}`;
    const c = convert(v.kf, name);
    logs.push(...c.log);
    let hold = finish(c.fr, name, logs);
    let alt = null;
    if (v.alt) { const ca = convert({ ...v.kf, ...v.alt }, name + ':alt'); alt = diff(hold, finish(ca.fr, name + ':alt', logs)); }
    const props = (v.props || []).map(convProp);
    const cush = props.find((q) => q.type === 'cushion');
    if (cush) hold.pelvis.pos[1] = cush.h || 12;
    return { hold, alt, props };
  });
  // hand patches
  const patch = PATCHES[p.id];
  if (patch) patch({ start, levels, p, R });
  // round again & validate
  const out = {
    id: p.id,
    format: 1,
    camera: CAMERAS[p.id] || { az: 28, el: 6 },
    start: R.cloneFrame(start),
    levels: levels.map((l, i) => ({ level: i, hold: l.hold, ...(l.alt ? { alt: l.alt } : {}), props: l.props, ...(l.camera ? { camera: l.camera } : {}) })),
  };
  for (const f of [out.start, ...out.levels.map((l) => l.hold)]) { const e = R.validateFrame(f, p.id); if (e.length) logs.push(...e); }
  writeFileSync(new URL(`../poses/${p.id}.json`, import.meta.url), serializeSpec(out));
  allLogs.push(...logs);
}
console.log(allLogs.join('\n') || 'no warnings');

if (!only.length) writeFileSync(new URL('../poses/index.json', import.meta.url), JSON.stringify(POSES.map((p) => p.id)) + '\n');
