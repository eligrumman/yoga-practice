// Hand-authored overrides applied on top of the automatic planar->3-D conversion (tools/migrate-poses.mjs).
// The planar source data could not express front-facing poses (hips turned out, spine twists), so these poses are
// written directly in 3-D joint angles. Anatomical sign conventions: see the header of js/rig.js and poses/README.md.
import * as R from '../../js/rig.js';

export const CAMERAS = {
  'warrior-2': { az: 90, el: 4 },
  tree: { az: 70, el: 4 },
  cobbler: { az: 80, el: 8 },
  'easy-seat': { az: 70, el: 8 },
  'supine-twist': { az: 60, el: 22 },
  'seated-twist': { az: 60, el: 8 },
  'revolved-chair': { az: 80, el: 6 },
  'happy-baby': { az: 70, el: 18 },
};

const FOOT = ['ankle', 'heel', 'toes'];
const low = (S, ids, side) => Math.min(...S.prims.filter((p) => ids.some((k) => p.id === k + side)).map((p) => R.primBox(p).lo));
export const footLow = (f, side) => low(R.solve(f), FOOT, side);

// Bisect one joint angle (f[joint][axis]) until both feet reach the same height (heights measured on the solved body).
export function matchFeet(f, joint, axis, lo, hi) {
  const side = joint.endsWith('L') ? 'L' : 'R';
  const other = side === 'L' ? 'R' : 'L';
  const err = () => footLow(f, side) - footLow(f, other);
  let a = lo, b = hi;
  f[joint][axis] = a; const ea = err();
  f[joint][axis] = b; const eb = err();
  if (ea * eb > 0) return false;
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2; f[joint][axis] = m;
    const em = err();
    if (em * ea <= 0) b = m; else a = m;
  }
  f[joint][axis] = R.round1((a + b) / 2);
  return true;
}

// Make the sole of one foot horizontal by searching the ankle's roll (x) and pitch (z); the yaw (y) stays as authored.
export function levelFoot(f, side) {
  const cost = () => {
    const S = R.solve(f);
    const ell = S.prims.find((p) => p.id === 'ankle' + side);
    return (S.J['toe' + side][1] - S.J['heel' + side][1]) ** 2 + (ell.ax[2][1]) ** 2 * 4;
  };
  const a = 'ankle' + side;
  for (let it = 0; it < 6; it++) {
    for (const ax of [0, 2]) {
      const [lo, hi] = R.limitOf(a, R.AXES[ax]);
      let best = f[a][ax], bc = cost();
      for (let d = 40; d >= 0.25; d /= 2) {
        for (const sgn of [-1, 1]) {
          const v = Math.max(lo, Math.min(hi, best + sgn * d)); const old = f[a][ax]; f[a][ax] = v;
          const c = cost(); if (c < bc - 1e-9) { bc = c; best = v; } else f[a][ax] = old;
        }
        f[a][ax] = best;
      }
    }
  }
  f[a] = f[a].map(R.round1);
}


// Tiny IK by pattern search: nudge the listed joint angles ([joint, axisIndex]) until the named solved points reach their
// targets. goals: [{p:'wristR', t:[x,y,z] | (S)=>[x,y,z], w:1}]; all numbers are in the solved (ground = 0) world frame.
export function reach(f, goals, vars, { reg = 1e-4, rounds = 10 } = {}) {
  const v0 = vars.map(([j, a]) => f[j][a]);
  const cost = () => {
    const S = R.solve(f);
    let c = 0;
    for (const g of goals) {
      const t = typeof g.t === 'function' ? g.t(S) : g.t, q = S.J[g.p];
      c += (g.w ?? 1) * ((q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2);
    }
    vars.forEach(([j, a], i) => { c += reg * (f[j][a] - v0[i]) ** 2; });
    return c;
  };
  let bc = cost();
  for (let r = 0; r < rounds; r++) {
    for (const [i, [j, a]] of vars.entries()) {
      const [lo, hi] = R.limitOf(j, R.AXES[a]);
      for (let d = 24; d >= 0.2; d /= 2) {
        for (const sgn of [-1, 1]) {
          const old = f[j][a], nv = Math.max(lo, Math.min(hi, old + sgn * d));
          if (nv === old) continue;
          f[j][a] = nv;
          const c = cost();
          if (c < bc - 1e-9) bc = c; else f[j][a] = old;
        }
      }
    }
  }
  for (const [j] of vars) f[j] = f[j].map(R.round1);
  return Math.sqrt(bc);
}

const set = (f, o) => { for (const k of Object.keys(o)) { if (k === 'pelvis') Object.assign(f.pelvis, o.pelvis); else f[k] = [...o[k]]; } return f; };
const each = (levels, fn) => levels.forEach((l, i) => fn(l.hold, i, l));

export const PATCHES = {
  'warrior-2': ({ levels, start }) => {
    const depth = [48, 70, 84];
    each(levels, (h, i) => {
      set(h, {
        pelvis: { pos: [0, 0, 0], rot: [0, 0, 0] },
        spine1: [0, 0, 0], spine2: [0, 0, 0], spine3: [0, 0, 0], neck: [0, -58, 0], head: [0, -10, 0],
        shoulderR: [90, 0, 0], shoulderL: [90, 0, 0], elbowR: [0, 0, 0], elbowL: [0, 0, 0], wristR: [0, 0, 0], wristL: [0, 0, 0],
        hipR: [depth[i], 78, 0], kneeR: [0, 0, depth[i]], ankleR: [0, 0, 0],
        hipL: [40, -42, 0], kneeL: [0, 0, 0], ankleL: [0, 0, 0],
      });
      matchFeet(h, 'hipL', 0, 20, 70);
      levelFoot(h, 'R'); levelFoot(h, 'L'); matchFeet(h, 'hipL', 0, 20, 70);
    });
  },
};

const BASE = { pelvis: { pos: [0, 0, 0], rot: [0, 0, 0] }, spine1: [0, 0, 0], spine2: [0, 0, 0], spine3: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  shoulderR: [0, 0, 0], elbowR: [0, 0, 0], wristR: [0, 0, 0], hipR: [0, 0, 0], kneeR: [0, 0, 0], ankleR: [0, 0, 0],
  shoulderL: [0, 0, 0], elbowL: [0, 0, 0], wristL: [0, 0, 0], hipL: [0, 0, 0], kneeL: [0, 0, 0], ankleL: [0, 0, 0] };
const SH = (s) => [['shoulder' + s, 0], ['shoulder' + s, 1], ['shoulder' + s, 2], ['elbow' + s, 2]];
const HP = (s) => [['hip' + s, 0], ['hip' + s, 1], ['hip' + s, 2], ['knee' + s, 2]];

PATCHES.tree = ({ levels }) => each(levels, (h, i) => {
  set(h, { ...BASE, hipL: [58, 80, 30 - i * 5], kneeL: [0, 0, 118 + i * 6], ankleL: [0, 0, -15], head: [0, 0, 0] });
  reach(h, [{ p: 'ankleL', t: (S) => [S.J.kneeR[0] + 6, S.J.kneeR[1] + 18 + i * 8, S.J.kneeR[2] - 0.5], w: 1 }], HP('L'));
  set(h, { shoulderR: [30, 0, 0], shoulderL: [30, 0, 0], elbowR: [0, 0, 100], elbowL: [0, 0, 100] });
  const ch = (S) => [S.J.spine3[0] + 9, S.J.spine3[1] - 17, 0];
  reach(h, [{ p: 'wristR', t: (S) => { const c = ch(S); return [c[0], c[1], 2.4]; } }, { p: 'wristL', t: (S) => { const c = ch(S); return [c[0], c[1], -2.4]; } }], [...SH('R'), ...SH('L')]);
  set(h, { wristR: [0, 0, -20], wristL: [0, 0, -20] });
  if (i === 2) set(h, { shoulderR: h.shoulderR, shoulderL: h.shoulderL });
});

PATCHES.cobbler = ({ levels }) => each(levels, (h, i) => {
  set(h, { ...BASE, hipR: [58, 62, 66], kneeR: [0, 0, 125], hipL: [58, 62, 66], kneeL: [0, 0, 125], ankleR: [0, 0, 0], ankleL: [0, 0, 0], spine1: [0, 0, 4 - i * 2], spine2: [0, 0, 4], spine3: [0, 0, 2] });
  const fx = 26 - i * 3;
  reach(h, [{ p: 'ankleR', t: [fx, 8.5, 4.5] }], HP('R'));
  reach(h, [{ p: 'ankleL', t: [fx, 8.5, -4.5] }], HP('L'));
  set(h, { shoulderR: [12, 0, 38], shoulderL: [12, 0, 38], elbowR: [0, 0, 30], elbowL: [0, 0, 30] });
  reach(h, [{ p: 'wristR', t: [fx + 6, 14, 10] }], SH('R'));
  reach(h, [{ p: 'wristL', t: [fx + 6, 14, -10] }], SH('L'));
  if (i === 0) h.pelvis.pos[1] = 6;
});

PATCHES['easy-seat'] = ({ levels }) => each(levels, (h, i) => {
  set(h, { ...BASE, hipR: [48, 55, 70], kneeR: [0, 0, 128], hipL: [48, 55, 70], kneeL: [0, 0, 128], neck: [0, 0, 0], spine1: [0, 0, 2], spine3: [0, 0, 2] });
  reach(h, [{ p: 'ankleR', t: [24, 8.5, -11] }], HP('R'));
  reach(h, [{ p: 'ankleL', t: [26, 8.5, 11] }], HP('L'));
  set(h, { shoulderR: [8, 0, 10], shoulderL: [8, 0, 10], elbowR: [0, 0, 40], elbowL: [0, 0, 40] });
  reach(h, [{ p: 'wristR', t: (S) => [S.J.kneeR[0] - 4, S.J.kneeR[1] + 8, S.J.kneeR[2]] }], SH('R'));
  reach(h, [{ p: 'wristL', t: (S) => [S.J.kneeL[0] - 4, S.J.kneeL[1] + 8, S.J.kneeL[2]] }], SH('L'));
  if (i === 2) set(h, { wristR: [0, 0, 20], wristL: [0, 0, 20] });
});

PATCHES['supine-twist'] = ({ levels }) => each(levels, (h, i) => {
  const roll = 55 + i * 8;
  set(h, { ...BASE, pelvis: { pos: [0, 0, 0], rot: [0, roll, -90] }, spine1: [0, -22, 0], spine2: [0, -(roll - 22) / 2, 0], spine3: [0, -(roll - 22) / 2, 0],
    neck: [0, 12, 0], head: [0, 20, 0],
    hipR: [0, 0, 100 + i * 5], kneeR: [0, 0, 105 - i * 10], hipL: [0, 0, 100 + i * 5], kneeL: [0, 0, 105 - i * 10], ankleR: [0, 0, -30], ankleL: [0, 0, -30],
    shoulderR: [90, 0, 0], shoulderL: [90, 0, 0] });
  h.hipL[1] = 0;
});

PATCHES['seated-twist'] = ({ levels }) => each(levels, (h, i) => {
  set(h, { ...BASE, hipR: [5, 5, 92], kneeR: [0, 0, 0], ankleR: [0, 0, 5], hipL: [35, 25, 108], kneeL: [0, 0, 118], spine1: [0, 18, 0], spine2: [0, 28, 0], spine3: [0, 30, 0], neck: [0, 16, 0], head: [0, 10, 0] });
  reach(h, [{ p: 'ankleL', t: (S) => [S.J.kneeR[0] - 14, S.J.kneeR[1] + 0, S.J.kneeR[2] + 12] }], HP('L'));
  set(h, { shoulderR: [30, 0, 30], elbowR: [0, 0, 70], shoulderL: [10, 0, -35], elbowL: [0, 0, 5] });
  reach(h, [{ p: 'wristL', t: (S) => [S.J.hipL[0] - 18, 7, S.J.hipL[2] - 8 + 0] }], SH('L'));
  reach(h, [{ p: 'wristR', t: (S) => [S.J.kneeL[0] + 2, S.J.kneeL[1] + 8, S.J.kneeL[2] + 2] }], SH('R'));
  h.pelvis.pos[1] = 0;
});

PATCHES['revolved-chair'] = ({ levels }) => each(levels, (h, i) => {
  const tw = 70 + i * 8;
  set(h, { ...BASE, hipR: [4, 0, 100 - i * 6], kneeR: [0, 0, 78 + i * 6], hipL: [4, 0, 100 - i * 6], kneeL: [0, 0, 78 + i * 6], ankleR: [0, 0, 8], ankleL: [0, 0, 8],
    spine1: [0, -tw / 3, 10], spine2: [0, -tw / 3, 4], spine3: [0, -tw / 3, 0], neck: [0, 0, 0], head: [0, tw / 3, 0],
    shoulderR: [30, 0, 40], shoulderL: [30, 0, 40], elbowR: [0, 0, 100], elbowL: [0, 0, 100] });
  reach(h, [{ p: 'wristR', t: (S) => { const m = [(S.J.shoulderR[0] + S.J.shoulderL[0]) / 2, S.J.spine3[1] - 15, (S.J.shoulderR[2] + S.J.shoulderL[2]) / 2]; return [m[0] + 6, m[1], m[2] + 2]; } },
    { p: 'wristL', t: (S) => { const m = [(S.J.shoulderR[0] + S.J.shoulderL[0]) / 2, S.J.spine3[1] - 15, (S.J.shoulderR[2] + S.J.shoulderL[2]) / 2]; return [m[0] + 6, m[1], m[2] - 2]; } }], [...SH('R'), ...SH('L')]);
});

PATCHES['happy-baby'] = ({ levels }) => each(levels, (h, i) => {
  set(h, { ...BASE, pelvis: { pos: [0, 0, 0], rot: [0, 0, -90] }, neck: [0, 0, 8], head: [0, 0, 10],
    hipR: [62, 40, 118], kneeR: [0, 0, 105], hipL: [62, 40, 118], kneeL: [0, 0, 105], ankleR: [0, 0, 20], ankleL: [0, 0, 20] });
  set(h, { shoulderR: [30, 0, 70], shoulderL: [30, 0, 70], elbowR: [0, 0, 60], elbowL: [0, 0, 60] });
  reach(h, [{ p: 'wristR', t: (S) => S.J.toeR }], SH('R'));
  reach(h, [{ p: 'wristL', t: (S) => S.J.toeL }], SH('L'));
});

// bridge: shoulders/head and both soles on the floor, hips lifted; knee flexion is solved so the feet really touch down.
const UPPER = ['h_head', 'chest', 'neck', 'deltR', 'deltL'];
const upperLow = (f) => Math.min(...R.solve(f).prims.filter((p) => UPPER.includes(p.id)).map((p) => R.primBox(p).lo));
PATCHES.bridge = ({ levels }) => each(levels, (h, i) => {
  const kn = [96, 88, 80][i];
  set(h, { ...BASE, pelvis: { pos: [0, 0, 0], rot: [0, 0, -124] }, spine1: [0, 0, -4], spine2: [0, 0, -4], spine3: [0, 0, -4],
    neck: [0, 0, 20], head: [0, 0, 8], hipR: [0, 0, -35], hipL: [0, 0, -35], kneeR: [0, 0, kn], kneeL: [0, 0, kn], ankleR: [0, 0, 20], ankleL: [0, 0, 20],
    shoulderR: [0, 0, -60], shoulderL: [0, 0, -60] });
  // pelvis lift (z rotation) is bisected until the soles and the shoulders/head sit at the same height
  const err = (z) => { h.pelvis.rot[2] = z; return footLow(h, 'R') - upperLow(h); };
  let a = -150, b = -100; const ea = err(a);
  for (let n = 0; n < 40; n++) { const m = (a + b) / 2; if (err(m) * ea <= 0) b = m; else a = m; }
  h.pelvis.rot[2] = R.round1((a + b) / 2);
  levelFoot(h, 'R'); levelFoot(h, 'L');
  const fy = footLow(h, 'R');
  reach(h, [{ p: 'wristR', t: (S) => [S.J.heelR[0] - 14, fy + 5, S.J.shoulderR[2]] }], SH('R'));
  reach(h, [{ p: 'wristL', t: (S) => [S.J.heelL[0] - 14, fy + 5, S.J.shoulderL[2]] }], SH('L'));
  console.log('bridge L' + i, 'lift', h.pelvis.rot[2], 'foot', footLow(h, 'R').toFixed(1), 'upper', upperLow(h).toFixed(1), 'wristY', R.solve(h).J.wristR[1].toFixed(1));
});
