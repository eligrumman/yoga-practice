// Figure checks: hand / foot / head primitives exist, follow their joints, and touch the floor where the pose says so.
// Run alone: node tests/figure.test.mjs   (also called from tests/run.mjs)
import { POSES } from '../data/poses.js';
import { poseFrames } from '../js/figure.js';
import { attachSpecs } from '../js/specs.js';
import { solve, primBox, zeroFrame, swapLR, validateFrame, JOINTS, blockBoxes } from '../js/rig.js';
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
  // ---- wide-legged fold: the palms rest on the block tops that the renderers draw (blockBoxes is the shared box both use)
  const wide = POSES.find((q) => q.id === 'wide-legged-fold');
  const sub3 = (a, b) => a.map((v, i) => v - b[i]), len3 = (v) => Math.hypot(...v);
  const bend = (a, b, c) => 180 - (Math.acos(sub3(a, b).reduce((s, v, i) => s + v * sub3(c, b)[i], 0) / len3(sub3(a, b)) / len3(sub3(c, b))) * 180) / Math.PI;
  for (const l of [0, 1]) {
    const F = poseFrames(wide, l), S = solve(F.hold), boxes = blockBoxes(F.props, S, 1), J = S.J;
    ok(boxes.length === 2, `wide-legged-fold L${l} draws two blocks`);
    for (const side of ['R', 'L']) {
      const bx = boxes.find((b) => b.k === side); if (!bx) { ok(false, `wide-legged-fold L${l} ${side} block exists`); continue; }
      const palmPrims = S.prims.filter((p) => ['palm', 'fing', 'thumb'].includes(p.id.slice(0, -1)) && p.id.endsWith(side));
      const hand = Math.min(...palmPrims.map((p) => primBox(p).lo));
      ok(Math.abs(hand - bx.top) <= 0.5, `wide-legged-fold L${l} ${side} palm touches the block top it is drawn on (${hand.toFixed(2)} vs ${bx.top.toFixed(2)})`);
      const pp = S.prims.find((p) => p.id === 'palm' + side), pts = pp.pts; const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cz = pts.reduce((s, q) => s + q[2], 0) / pts.length;
      ok(Math.abs(cx - bx.c[0]) <= bx.size[0] / 2 && Math.abs(cz - bx.c[2]) <= bx.size[2] / 2, `wide-legged-fold L${l} ${side} palm centre is over the block footprint`);
      ok(Math.hypot(J['wrist' + side][0] - J['shoulder' + side][0], J['wrist' + side][2] - J['shoulder' + side][2]) <= 3 && Math.abs(F.hold['elbow' + side][2]) <= 1, `wide-legged-fold L${l} ${side} arm reaches straight down`);
      ok(S.hands[side].n[1] < -0.99, `wide-legged-fold L${l} ${side} palm flat on block`);
      ok(bend(J['hip' + side], J['knee' + side], J['ankle' + side]) <= 12, `wide-legged-fold L${l} ${side} knee is soft, not bent`);
    }
    ok(bend(J.pelvis, J.spine1, J.spine3) <= 12, `wide-legged-fold L${l} back stays long and flat`);
    ok(Math.abs(J.ankleR[0] - J.ankleL[0]) < 1 && Math.abs(J.ankleR[2] + J.ankleL[2]) < 1 && Math.abs(S.head.c[2]) < 1 && Math.abs(J.pelvis[2]) < 1, `wide-legged-fold L${l} straddle symmetric, torso centred`);
    ok(J.ankleR[0] - J.hipR[0] > -12 && J.ankleR[0] - J.hipR[0] < 12, `wide-legged-fold L${l} feet under the hips (hinge at the hips)`);
  }
  ok(wide.spec.levels[0].hold.pelvis.rot[2] < wide.spec.levels[1].hold.pelvis.rot[2] && wide.spec.levels[0].props[0].h > wide.spec.levels[1].props[0].h, 'wide-legged-fold L1 folds deeper onto a lower block than L0');
  // ---- reviewed standing / kneeling variants keep the support and alignment shown in their level text
  {
    const utt = POSES.find((q) => q.id === 'uttanasana'), U0 = solve(poseFrames(utt, 0).hold), U2 = solve(poseFrames(utt, 2).hold);
    for (const side of ['R', 'L']) {
      const shin = sub3(U0.J['ankle' + side], U0.J['knee' + side]), hand = sub3(U0.J['wrist' + side], U0.J['knee' + side]);
      const t = Math.max(0, Math.min(1, hand.reduce((s, v, i) => s + v * shin[i], 0) / shin.reduce((s, v) => s + v * v, 0)));
      ok(len3(sub3(hand, shin.map((v) => v * t))) <= 8, `uttanasana L0 ${side} hand rests on the front shin`);
      ok(len3(sub3(U2.J['wrist' + side], U2.J['toe' + side])) <= 8, `uttanasana L2 ${side} hand reaches the big-toe position`);
    }
    const half = solve(poseFrames(POSES.find((q) => q.id === 'half-lift'), 2).hold);
    ok(lowest(half, 'handR') <= 0.5 && lowest(half, 'handL') <= 0.5, 'half-lift L2 fingertips touch the floor');
    ok(bend(half.J.pelvis, half.J.spine1, half.J.spine3) <= 8, 'half-lift L2 keeps a long flat back');
    const mt = solve(poseFrames(POSES.find((q) => q.id === 'mountain'), 2).hold);
    ok(len3(sub3(mt.J.wristR, mt.J.wristL)) <= 6 && mt.J.wristR[1] > mt.J.spine1[1], 'mountain L2 palms meet at the chest');
    ok(mt.J.heelR[1] - mt.J.toeR[1] > 8 && mt.J.heelL[1] - mt.J.toeL[1] > 8, 'mountain L2 heels are lifted');
  }
  {
    const ext = POSES.find((q) => q.id === 'extended-side-angle'), E0 = solve(poseFrames(ext, 0).hold), F1 = poseFrames(ext, 1), E1 = solve(F1.hold);
    const forearm = sub3(E0.J.wristR, E0.J.elbowR), thigh = sub3(E0.J.kneeR, E0.J.hipR);
    const angle = Math.acos(forearm.reduce((s, v, i) => s + v * thigh[i], 0) / len3(forearm) / len3(thigh)) * 180 / Math.PI;
    ok(angle <= 25 && len3(sub3(E0.J.wristR, E0.J.kneeR)) <= 5, 'extended-side-angle L0 forearm rests along the front thigh');
    const bx = blockBoxes(F1.props, E1, 1).find((b) => b.k === 'R');
    ok(bx && Math.abs(lowest(E1, 'handR') - bx.top) <= 0.5, 'extended-side-angle L1 lower hand rests on the block top');
    const split = solve(poseFrames(POSES.find((q) => q.id === 'half-split'), 2).hold);
    ok(bend(split.J.pelvis, split.J.spine1, split.J.spine3) <= 10 && bend(split.J.spine1, split.J.spine3, split.head.c) <= 12, 'half-split L2 keeps the spine and neck long');
    const camel = POSES.find((q) => q.id === 'camel'), C2f = poseFrames(camel, 2), C2 = solve(C2f.hold);
    ok(C2f.hold.neck[2] >= 20 && C2f.hold.head[2] >= 15, 'camel L2 counter-rotates the neck to neutral');
    ok(len3(sub3(C2.J.wristR, C2.J.heelR)) <= 22 && len3(sub3(C2.J.wristL, C2.J.heelL)) <= 22, 'camel L2 hands reach the heels');
    const plank = solve(poseFrames(POSES.find((q) => q.id === 'plank'), 2).hold);
    ok(bend(plank.J.hipL, plank.J.kneeL, plank.J.ankleL) <= 3 && plank.J.ankleL[1] > plank.J.ankleR[1] + 8, 'plank L2 lifted leg is long, straight, and slightly raised');
  }
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
