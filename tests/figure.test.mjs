// Figure checks: hand / foot / head primitives exist, follow their joints, and touch the floor where the pose says so.
// Run alone: node tests/figure.test.mjs   (also called from tests/run.mjs)
import { POSES } from '../data/poses.js';
import { poseFrames } from '../js/figure.js';
import { attachSpecs } from '../js/specs.js';
import { solve, primBox, zeroFrame, swapLR, validateFrame, JOINTS } from '../js/rig.js';
import { readFileSync } from 'node:fs';

const TOL = 2.0; // world units (the figure is about 200 tall)
const ALL = [0, 1, 2];
// [pose, levels, parts that rest on the floor]  hand = palm/fingers/thumb, foot = foot/toes
const CONTACT = [
  ['tabletop', [0, 1], ['handR', 'handL', 'footR', 'footL']], ['tabletop', [2], ['handR', 'footL']],
  ['cat', ALL, ['handR', 'handL', 'footR', 'footL']], ['cow', ALL, ['handR', 'handL', 'footR', 'footL']], ['cat-cow', ALL, ['handR', 'handL', 'footR', 'footL']],
  ['plank', [0, 1], ['handR', 'handL', 'footR', 'footL']], ['plank', [2], ['handR', 'handL', 'footR']],
  ['crow', [0], ['handR', 'handL', 'footR', 'footL']], ['crow', [1], ['handR', 'handL', 'footR']], ['crow', [2], ['handR', 'handL']],
  ['pigeon', [1, 2], ['handR', 'handL', 'footR', 'footL']],
  ['triangle', ALL, ['footR', 'footL']],
  ['extended-side-angle', ALL, ['footR', 'footL']], ['extended-side-angle', [2], ['handR']],
  ['wide-legged-fold', ALL, ['footR', 'footL']],
  ['downward-dog', ALL, ['handR', 'handL', 'footR', 'footL']], ['cobra', ALL, ['handR', 'handL', 'footR', 'footL']],
  ['child', ALL, ['handR', 'handL', 'footR', 'footL']], ['bridge', ALL, ['handR', 'handL', 'footR', 'footL']],
  ['uttanasana', [1, 2], ['handR', 'handL']], ['half-lift', [2], ['handR', 'handL']], ['savasana', ALL, ['handR', 'handL', 'footR', 'footL']],
  ...['mountain', 'upward-salute', 'chair', 'warrior-1', 'warrior-2', 'high-lunge', 'uttanasana', 'half-lift', 'revolved-chair', 'low-lunge', 'half-split',
    'camel', 'easy-seat', 'cobbler', 'seated-fold', 'seated-twist'].map((id) => [id, ALL, ['footR', 'footL']]),
  ['tree', ALL, ['footR']], ['tree', [0], ['footL']], ['warrior-3', ALL, ['footR']], ['dancer', ALL, ['footR']],
];
const PARTS = { hand: ['palm', 'fing', 'thumb'], foot: ['foot', 'toes'] };
const lowest = (S, part) => { const s = part.slice(-1); const pre = PARTS[part.slice(0, -1)].map((p) => p + s); return Math.min(...S.prims.filter((p) => pre.includes(p.id)).map((p) => primBox(p).lo)); };

export default async function figureTests(ok) {
  await attachSpecs(POSES);
  // ---- primitives exist
  const S0 = solve(zeroFrame()); const ids = new Set(S0.prims.map((p) => p.id));
  for (const id of ['palmR', 'palmL', 'fingR', 'fingL', 'thumbR', 'thumbL', 'footR', 'footL', 'toesR', 'toesL', 'h_head', 'h_hair', 'h_bun', 'h_nose', 'h_earR', 'h_earL', 'neck', 'chest', 'waist', 'pelvis'])
    ok(ids.has(id), `figure primitive ${id} exists`);
  ok(S0.prims.every((p) => ['cap', 'ell', 'hull'].includes(p.kind) && ['skin', 'top', 'legs', 'hair'].includes(p.mat)), 'primitive kinds / materials known');
  ok(S0.hands && S0.feet && S0.head && ['R', 'L'].every((s) => S0.hands[s].n.length === 3 && S0.feet[s].n.length === 3), 'solve() reports hand / foot / head frames');
  ok(Math.abs(S0.feet.R.n[1] + 1) < 1e-6 && Math.abs(lowest(S0, 'footR')) < 0.5 && Math.abs(lowest(S0, 'footL')) < 0.5, 'standing: soles face down and rest on the floor');
  // ---- the head turns with the neck / head joints, the hand with the wrist
  const turn = zeroFrame(); turn.neck = [0, 40, 0]; turn.head = [0, 20, 0]; const St = solve(turn);
  ok(Math.hypot(...St.head.F.map((v, i) => v - S0.head.F[i])) > 0.3, 'head frame rotates with neck + head');
  ok(Math.abs(primBox(St.prims.find((p) => p.id === 'h_head')).lo - primBox(S0.prims.find((p) => p.id === 'h_head')).lo) < 3, 'turning the head keeps its height');
  const wr = zeroFrame(); wr.wristR = [0, 0, 60]; const Sw = solve(wr);
  ok(Math.hypot(...Sw.hands.R.d.map((v, i) => v - S0.hands.R.d[i])) > 0.5, 'hand direction follows the wrist');
  ok(Math.hypot(...Sw.hands.L.d.map((v, i) => v - S0.hands.L.d[i])) < 1e-6, 'the other hand stays');
  // ---- mirror keeps the hands
  const P1 = POSES.find((q) => q.id === 'warrior-2'); const h = poseFrames(P1, 1).hold; const A = solve(h), B = solve(swapLR(h));
  ok(Math.abs(lowest(A, 'handR') - lowest(B, 'handL')) < 0.2 && Math.abs(lowest(A, 'footL') - lowest(B, 'footR')) < 0.2, 'side mirror swaps hands and feet');
  const tri = POSES.find((q) => q.id === 'triangle');
  for (const l of ALL) {
    const f = poseFrames(tri, l).hold; const m = swapLR(f); const X = solve(f), Y = solve(m);
    ok(Math.abs(lowest(X, 'footR') - lowest(Y, 'footL')) < 0.2 && Math.abs(lowest(X, 'footL') - lowest(Y, 'footR')) < 0.2, `triangle L${l} mirrors floor contacts`);
  }
  const esa = POSES.find((q) => q.id === 'extended-side-angle');
  for (const l of ALL) {
    const f = poseFrames(esa, l).hold; const X = solve(f), Y = solve(swapLR(f));
    ok(Math.abs(lowest(X, 'footR') - lowest(Y, 'footL')) < 0.2 && Math.abs(lowest(X, 'footL') - lowest(Y, 'footR')) < 0.2, `extended-side-angle L${l} mirrors floor contacts`);
  }
  // ---- every pose / level: frames valid, primitives finite, nothing under the floor
  for (const P of POSES) for (const l of ALL) {
    const fr = poseFrames(P, l); const S = solve(fr.hold);
    ok(validateFrame(fr.hold).length === 0, `${P.id} L${l} hold within joint limits`);
    ok(S.prims.every((p) => Number.isFinite(primBox(p).lo)), `${P.id} L${l} primitives finite`);
    ok(Math.min(...S.prims.map((p) => primBox(p).lo)) > -0.01, `${P.id} L${l} nothing below the floor`);
  }
  // ---- spec files keep full frames (the tuner builds one slider group per joint from them)
  for (const P of POSES) {
    const sp = JSON.parse(readFileSync(new URL(`../poses/${P.id}.json`, import.meta.url), 'utf8'));
    ok([sp.start, ...sp.levels.map((l) => l.hold)].every((f) => JOINTS.every((j) => f[j])), `${P.id} spec frames list every joint`);
  }
  // ---- floor contacts
  for (const [id, levels, parts] of CONTACT) {
    const P = POSES.find((q) => q.id === id); ok(!!P, `contact pose ${id} exists`); if (!P) continue;
    for (const l of levels) { const S = solve(poseFrames(P, l).hold); for (const part of parts) { const lo = lowest(S, part); ok(lo <= TOL, `${id} L${l} ${part} on the floor (${lo.toFixed(2)} <= ${TOL})`); } }
  }
  // ---- flat palms: the palm normal points down in the weight-bearing poses
  for (const id of ['tabletop', 'cat', 'cow', 'plank', 'downward-dog', 'cobra', 'crow']) {
    const P = POSES.find((q) => q.id === id);
    for (const l of id === 'tabletop' ? [1] : ALL) { const S = solve(poseFrames(P, l).hold); ok(S.hands.R.n[1] < -0.9 && S.hands.L.n[1] < -0.9, `${id} L${l} palms flat (${S.hands.R.n[1].toFixed(2)})`); }
  }
  // ---- wide-legged fold: beginner/intermediate hands are supported by the block tops, not floating above them
  const wide = POSES.find((q) => q.id === 'wide-legged-fold');
  for (const l of [0, 1]) {
    const F = poseFrames(wide, l), S = solve(F.hold), block = F.props.find((p) => p.type === 'block');
    const armOffset = (side) => Math.hypot(S.J['shoulder' + side][0] - S.J['wrist' + side][0], S.J['shoulder' + side][2] - S.J['wrist' + side][2]);
    for (const side of ['R', 'L']) {
      const hand = lowest(S, 'hand' + side);
      ok(Math.abs(hand - block.h) <= 0.25, `wide-legged-fold L${l} ${side} palm rests on block (${hand.toFixed(2)} vs ${block.h.toFixed(2)})`);
      ok(armOffset(side) <= 3 && Math.abs(F.hold['elbow' + side][2]) <= 1, `wide-legged-fold L${l} ${side} arm reaches straight down`);
      ok(S.hands[side].n[1] < -0.99, `wide-legged-fold L${l} ${side} palm flat on block`);
    }
  }
  ok(wide.spec.levels[0].hold.pelvis.rot[2] < wide.spec.levels[1].hold.pelvis.rot[2] && wide.spec.levels[0].props[0].h > wide.spec.levels[1].props[0].h, 'wide-legged-fold L1 folds deeper onto a lower block than L0');
  // ---- lunges / warriors: front knee over the ankle, front sole flat
  for (const id of ['warrior-1', 'warrior-2', 'extended-side-angle', 'high-lunge', 'low-lunge']) {
    const P = POSES.find((q) => q.id === id);
    for (const l of ALL) { const S = solve(poseFrames(P, l).hold); const d = Math.hypot(S.J.kneeR[0] - S.J.ankleR[0], S.J.kneeR[2] - S.J.ankleR[2]); ok(d <= 8, `${id} L${l} front knee over ankle (${d.toFixed(1)})`); ok(S.feet.R.n[1] < -0.97, `${id} L${l} front sole flat`); }
  }
}

if (process.argv[1] && process.argv[1].endsWith('figure.test.mjs')) {
  let pass = 0, fail = 0;
  await figureTests((c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } });
  console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
}
