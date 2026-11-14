// Run: node tests/run.mjs   (no dependencies)
import { POSES, POSE_BY_ID } from '../data/poses.js';
import { SEGMENTS, LANGS, segText, cueIds } from '../data/narration.js';
import { PRESETS, STARTER_PATH, ALL_PRESETS } from '../data/plans-preset.js';
import { mergeHistory, mergeFavorites, SCHEMA_VERSION, planSeconds, validatePlanObject, exportPlanJSON, parsePlanJSON, slots, APP_ID, holdSeconds, clampAmount, dropIndex, reorder } from '../js/plan.js';
import { generatePlan, FOCUSES, LENGTHS, GEN_LEVELS, POSITIONS, POSITION } from '../js/generator.js';
import { poseFrames, Animator } from '../js/figure.js';
import { attachSpecs } from '../js/specs.js';
import { solve, validateFrame, camera, project, swapLR, primBox } from '../js/rig.js';
import { streak, countsForStreak, histMinutes } from '../js/store.js';
import { nPoses, nCount, tr, poseOf, approxMin, finishStats } from '../js/i18n.js';
import { hasBreaths } from '../js/plan.js';
import { readFileSync, readdirSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const hasLatin = (s) => /[A-Za-z]/.test(s), hasDigit = (s) => /[0-9]/.test(s);
const hebrew = (s) => /[֐-׿]/.test(s), cyr = (s) => /[Ѐ-ӿ]/.test(s);

await attachSpecs(POSES);

// ---- poses
ok(POSES.length >= 30, `30+ poses (have ${POSES.length})`);
const ids = new Set();
for (const p of POSES) {
  ok(!ids.has(p.id), `unique id ${p.id}`); ids.add(p.id);
  ok(p.sanskrit && p.en && p.he && p.ru, `${p.id} names he/ru/en/sanskrit`);
  ok(hebrew(p.he) && cyr(p.ru), `${p.id} he/ru scripts`);
  ok([1, 2, 3].includes(p.difficulty), `${p.id} difficulty`);
  ok(p.holdSeconds > 0 && ['single', 'both'].includes(p.sides), `${p.id} hold/sides`);
  for (const l of LANGS) {
    ok(p.cues[l].length >= 3 && p.cues[l].length <= 5, `${p.id} cues ${l} count (${p.cues[l].length})`);
    ok(p.safety[l] && p.safety[l].length > 10, `${p.id} safety ${l}`);
  }
  ok(p.cues.he.length === p.cues.ru.length && p.cues.ru.length === p.cues.en.length, `${p.id} cue count equal across langs`);
  ok(p.variations.length === 3, `${p.id} has 3 variations`);
  p.variations.forEach((v, n) => {
    ok(v.level === n && v.he && v.ru && v.en, `${p.id} L${n} texts (easier option present on L0)`);
    ok(Array.isArray(v.props), `${p.id} L${n} props`);
    const { hold, start, alt, camera: cam } = poseFrames(p, n);
    for (const [nm, f] of [['start', start], ['hold', hold], ...(alt ? [['alt', alt]] : [])]) {
      const errs = validateFrame(f, `${p.id} L${n} ${nm}`);
      ok(!errs.length, errs.join('; ') || `${p.id} L${n} ${nm} valid`);
    }
    // 2D and 3D renderers consume the same solve() output: finite primitives
    const S = solve(hold);
    ok(S.prims.length > 20 && !/null|NaN|Infinity/.test(JSON.stringify(S.prims)), `${p.id} L${n} solve() is finite`);
    ok(project(camera(cam.az, cam.el), S.J.head).every(Number.isFinite), `${p.id} L${n} camera projects`);
    ok(solve(swapLR(hold)).prims.length === S.prims.length, `${p.id} L${n} mirror solves`);
  });
  // levels must actually differ in motion data (animated variations)
  const sig = [0, 1, 2].map((n) => JSON.stringify(poseFrames(p, n).hold));
  ok(new Set(sig).size >= 2, `${p.id} variations differ`);
  ok(p.spec && p.spec.id === p.id && p.spec.format === 1 && p.spec.levels.length === 3, `${p.id} spec shape`);
}
// the animator never produces an invalid frame, in loop and once modes
for (const p of POSES) for (const mode of ['loop', 'once']) {
  const A = new Animator({ draw() {}, dispose() {} });
  A.set(p, 1, { mode, mirror: p.sides === 'both' });
  let bad = 0;
  for (let t = 0; t <= 22; t += 0.5) { const { f } = A.frameAt(t); if (validateFrame(f, 'f', { strict: false }).length || /NaN/.test(JSON.stringify(f))) bad++; }
  ok(!bad, `${p.id} animator ${mode} frames valid`);
}
// both renderers are driven by the same rig and the same spec
const src2d = readFileSync(new URL('../js/figure2d.js', import.meta.url), 'utf8');
const src3d = readFileSync(new URL('../js/figure3d.js', import.meta.url), 'utf8');
ok(/from '\.\/rig\.js'/.test(src2d) && /solve\(/.test(src2d), '2D renderer uses rig.solve');
ok(/from '\.\/rig\.js'/.test(src3d) && /solve\(/.test(src3d), '3D renderer uses rig.solve');
ok(/THREE_URL = 'https:\/\/cdn\.jsdelivr\.net\/npm\/three@\d+\.\d+\.\d+\//.test(src3d), 'three.js pinned to an exact version');
const IDX = JSON.parse(readFileSync(new URL('../poses/index.json', import.meta.url), 'utf8'));
ok(IDX.length === POSES.length && POSES.every((p) => IDX.includes(p.id)), 'poses/index.json lists every pose');
for (const f of readdirSync(new URL('../data/', import.meta.url)).filter((n) => /^p-.*\.js$/.test(n))) {
  ok(!/\bkf:|\balt:|\bstart:/.test(readFileSync(new URL('../data/' + f, import.meta.url), 'utf8')), `${f} has no motion data`);
}

// ---- narration
for (const s of SEGMENTS) for (const l of LANGS) {
  const t = s[l]; ok(typeof t === 'string' && t.length > 0, `segment ${s.id} ${l} present`);
  if (l !== 'en' && t) { ok(!hasLatin(t), `${s.id} ${l} has no Latin letters: ${t}`); ok(!hasDigit(t), `${s.id} ${l} has no digits`); }
}
ok(SEGMENTS.some((s) => s.id === 'common.next'), 'common.next');
for (const p of POSES) { ok(segText(`pose.${p.id}.name`, 'ru') && segText(`pose.${p.id}.intro`, 'he'), `${p.id} name+intro`); ok(cueIds(p.id).length >= 3, `${p.id} cue ids`); }
ok(!/\b(ты|тебя|твой)\b/i.test(SEGMENTS.map((s) => s.ru).join(' ')), 'RU uses Вы, not ты');

// ---- presets
ok(PRESETS.length === 8 && STARTER_PATH.length === 7, 'presets 8 + starter 7');
for (const p of ALL_PRESETS) {
  const err = validatePlanObject({ name: p.name.en, items: p.items });
  ok(!err, `preset ${p.id} valid: ${err}`);
  for (const l of LANGS) ok(p.name[l] && p.desc[l], `preset ${p.id} ${l} texts`);
  const mins = planSeconds(p.items) / 60;
  ok(Math.abs(mins - p.minutes) <= 1, `preset ${p.id} duration ${mins} ~ ${p.minutes}`);
  for (const it of p.items) ok(POSE_BY_ID[it.pose], `preset ${p.id} pose ${it.pose}`);
}
ok(STARTER_PATH.every((p, i) => p.day === i + 1), 'starter days 1..7');

// ---- generator
for (const m of LENGTHS) for (const f of FOCUSES) for (const l of GEN_LEVELS) {
  const a = generatePlan({ minutes: m, focus: f, level: l }), b = generatePlan({ minutes: m, focus: f, level: l });
  ok(JSON.stringify(a.items) === JSON.stringify(b.items), `deterministic ${m}/${f}/${l}`);
  const mins = planSeconds(a.items) / 60;
  ok(Math.abs(mins - m) <= 1, `generator ${m}/${f}/${l} = ${mins.toFixed(2)} min`);
  ok(!validatePlanObject({ name: 'x', items: a.items }), `generator ${m}/${f}/${l} valid`);
  ok(a.items.at(-1).pose === 'savasana', `generator ${m}/${f}/${l} ends with savasana`);
  const first = POSE_BY_ID[a.items[0].pose];
  ok(first.section === 'warm', `generator ${m}/${f}/${l} starts with warm-up`);
  ok(slots(a.items).length >= a.items.length, 'both sides expand');
  if (f === 'back') ok(a.items.every((i) => !POSE_BY_ID[i.pose].tags.includes('noback')), `back-friendly ${m}/${l}`);
}
const av = generatePlan({ minutes: 20, focus: 'general', level: 'beginner', avoid: ['downward-dog', 'tree', 'cobra'] });
ok(!av.items.some((i) => ['downward-dog', 'tree', 'cobra'].includes(i.pose)), 'avoid list respected');
ok(Math.abs(planSeconds(av.items) / 60 - 20) <= 1, 'avoid plan still ~20 min');
for (const m of [20, 30]) for (const f of FOCUSES) {
  const g = generatePlan({ minutes: m, focus: f, level: 'beginner' });
  ok(new Set(g.items.map((i) => i.pose)).size <= 12, `first-time ${m}/${f} has at most 12 distinct poses`);
  ok(g.items.at(-1).amount >= (m === 20 ? 180 : 300), `first-time ${m}/${f} reserves final rest`);
}
for (const m of [20, 30]) {
  const g = generatePlan({ minutes: m, focus: 'relax', level: 'beginner' });
  ok(g.items.every((i) => POSE_BY_ID[i.pose].section !== 'stand' && POSE_BY_ID[i.pose].section !== 'bal'), `first-time relax ${m} has no standing poses`);
}
for (const m of LENGTHS) for (const f of FOCUSES) for (const l of GEN_LEVELS) {
  const ids = generatePlan({ minutes: m, focus: f, level: l }).items.map((i) => i.pose);
  ok(!ids.includes('crow'), `crow safety gate: excluded from generated ${m}/${f}/${l}`);
  if (l === 'beginner' || f !== 'flexibility') ok(!ids.includes('pigeon'), `pigeon gate: only gentle-intermediate flexibility plans ${m}/${f}/${l}`);
  if (l === 'beginner' || f !== 'general') ok(!ids.includes('extended-side-angle'), `extended-side-angle gate: only gentle-intermediate general plans ${m}/${f}/${l}`);
  if (l === 'beginner' || !['general', 'flexibility'].includes(f)) ok(!ids.includes('wide-legged-fold'), `wide-legged fold gate: gentle general/flexibility only ${m}/${f}/${l}`);
}
ok(!ALL_PRESETS.some((p) => p.items.some((i) => i.pose === 'crow')), 'crow safety gate: excluded from presets and 7-day starter path');

// Sun Salutation A: generic multi-step flow, one 72-second home-version round.
{
  const sun = POSE_BY_ID['sun-salutation-a'];
  ok(sun?.isFlow && ['he', 'ru', 'en'].every((l) => sun[l] && sun.cues[l].length === 4 && sun.safety[l]), 'sun flow i18n and library marker complete');
  const orders = [
    ['mountain', 'arms-up', 'fold', 'half-lift', 'knees-down', 'knees-chest-chin', 'low-cobra', 'child-reset', 'step-forward-half-lift', 'fold-return', 'rise-arms-up', 'hands-to-heart'],
    ['mountain', 'arms-up', 'fold', 'half-lift', 'knees-plank', 'lower-to-belly', 'low-cobra', 'downward-dog', 'step-forward-half-lift', 'fold-return', 'rise-arms-up', 'hands-to-heart'],
    ['mountain', 'arms-up', 'fold', 'half-lift', 'full-plank', 'lower-to-belly', 'cobra', 'downward-dog', 'step-through-half-lift', 'fold-return', 'rise-arms-up', 'hands-to-heart'],
  ];
  for (let l = 0; l < 3; l++) {
    const seq = poseFrames(sun, l).seq;
    ok(seq.map((s) => s.name).join() === orders[l].join(), `sun L${l} sequence order`);
    ok(seq.reduce((n, s) => n + s.dur, 0) === 72, `sun L${l} round is 72 seconds at 1x`);
    for (const s of seq) {
      const S = solve(s.frame), lo = Math.min(...S.prims.map((p) => primBox(p).lo));
      ok(validateFrame(s.frame).length === 0 && lo > -0.01 && lo <= 2, `sun L${l} ${s.name} valid and grounded`);
      if (/plank|knees-chest-chin|cobra|downward-dog/.test(s.name)) ok(S.hands.R.n[1] < -0.9 && S.hands.L.n[1] < -0.9, `sun L${l} ${s.name} weight-bearing palms flat`);
    }
  }
  ok(!poseFrames(POSE_BY_ID['cat-cow'], 1).seq && poseFrames(POSE_BY_ID['cat-cow'], 1).alt, 'cat-cow remains the unchanged alt-frame flow');
  ok(generatePlan({ minutes: 20, focus: 'general', level: 'intermediate' }).items.some((i) => i.pose === sun.id && i.amount === 72), 'sun flow may warm a non-beginner 20+ minute plan as one round');
  for (const avoid of [['sun-salutation-a'], ['pregnancy-avoid'], ['blood-pressure-avoid'], ['wrist-avoid']])
    ok(!generatePlan({ minutes: 20, focus: 'general', level: 'intermediate', avoid }).items.some((i) => i.pose === sun.id), `sun flow gated by ${avoid[0]}`);
  ok(!generatePlan({ minutes: 30, focus: 'general', level: 'beginner' }).items.some((i) => i.pose === sun.id), 'sun flow never generated for beginners');
  const appSrc = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  ok(/FLOW_LABEL/.test(appSrc) && /p\.isFlow/.test(appSrc), 'library card and pose page render the flow badge');
}
// Gentle Flow: seated, breath-led, one 60-second round and safe for beginner warm-ups.
{
  const gentle = POSE_BY_ID['gentle-flow'];
  ok(gentle?.isFlow && gentle.sides === 'single' && ['he', 'ru', 'en'].every((l) => gentle[l] && gentle.cues[l].length === 4 && gentle.safety[l]), 'gentle flow i18n and library marker complete');
  const order = ['seated-tall', 'arms-up', 'side-bend-right', 'center-after-right', 'side-bend-left', 'center-after-left', 'twist-right', 'center-after-twist', 'twist-left', 'hands-to-heart'];
  for (let l = 0; l < 3; l++) {
    const seq = poseFrames(gentle, l).seq;
    ok(seq.map((s) => s.name).join() === order.join(), `gentle flow L${l} sequence order`);
    ok(seq.reduce((n, s) => n + s.dur, 0) === 60, `gentle flow L${l} round is 60 seconds at 1x`);
    for (const s of seq) {
      const S = solve(s.frame), boxes = S.prims.map(primBox), lo = Math.min(...boxes.map((b) => b.lo));
      ok(validateFrame(s.frame).length === 0 && lo > -0.01 && lo <= 0.01, `gentle flow L${l} ${s.name} valid and on the floor`);
      ok(boxes.filter((b) => b.lo <= 0.01).length <= 2, `gentle flow L${l} ${s.name} has at most two floor contacts`);
    }
  }
  const beginner = generatePlan({ minutes: 20, focus: 'general', level: 'beginner', avoid: ['cat-cow', 'tabletop'] });
  ok(beginner.items.some((i) => i.pose === gentle.id && i.amount === 60), 'gentle flow may warm a beginner general plan as one fixed round');
  ok(!generatePlan({ minutes: 20, focus: 'general', level: 'beginner', avoid: ['cat-cow', 'tabletop', gentle.id] }).items.some((i) => i.pose === gentle.id), 'gentle flow follows its pose avoid');
}
// Warrior Flow: one complete 70-second round per side, mirrored by the standard two-sided engine.
{
  const warrior = POSE_BY_ID['warrior-flow'];
  ok(warrior?.isFlow && warrior.sides === 'both' && ['he', 'ru', 'en'].every((l) => warrior[l] && warrior.cues[l].length === 4 && warrior.safety[l]), 'warrior flow i18n, sides, and library marker complete');
  const order = ['mountain', 'warrior-one', 'warrior-two', 'reverse-warrior', 'warrior-two-return', 'step-together'];
  for (let l = 0; l < 3; l++) {
    const seq = poseFrames(warrior, l).seq;
    ok(seq.map((s) => s.name).join() === order.join(), `warrior flow L${l} sequence order`);
    ok(seq.reduce((n, s) => n + s.dur, 0) === 70, `warrior flow L${l} round is 70 seconds at 1x`);
    for (const s of seq) {
      const S = solve(s.frame), M = solve(swapLR(s.frame));
      const boxes = S.prims.map(primBox), mirrorBoxes = M.prims.map(primBox);
      const lo = Math.min(...boxes.map((b) => b.lo)), mirrorLo = Math.min(...mirrorBoxes.map((b) => b.lo));
      ok(validateFrame(s.frame).length === 0 && lo > -0.01 && lo <= 0.01, `warrior flow L${l} ${s.name} valid and on the floor`);
      const contacts = ['R', 'L'].filter((side) => Math.min(S.J[`toe${side}`][1], S.J[`heel${side}`][1]) <= 4).length
        + ['R', 'L'].filter((side) => Math.min(S.J[`wrist${side}`][1], S.J[`fingers${side}`][1]) <= 4).length;
      ok(contacts <= 2, `warrior flow L${l} ${s.name} has at most two weight-bearing limb contacts`);
      ok(M.prims.length === S.prims.length && mirrorLo > -0.01 && mirrorLo <= 0.01, `warrior flow L${l} ${s.name} mirrors cleanly for side two`);
      for (const side of ['R', 'L']) if (Math.min(S.J[`wrist${side}`][1], S.J[`fingers${side}`][1]) <= 4)
        ok(S.hands[side].n[1] < -0.9, `warrior flow L${l} ${s.name} weight-bearing palm is flat`);
    }
  }
  ok(generatePlan({ minutes: 20, focus: 'general', level: 'gentle' }).items.some((i) => i.pose === warrior.id && i.amount === 70), 'warrior flow may serve a non-beginner general standing block');
  ok(generatePlan({ minutes: 20, focus: 'strength', level: 'gentle' }).items.some((i) => i.pose === warrior.id && i.amount === 70), 'warrior flow may serve a non-beginner strength standing block');
  for (const avoid of [[warrior.id], ['pregnancy-avoid'], ['blood-pressure-avoid'], ['knee-avoid']])
    ok(!generatePlan({ minutes: 20, focus: 'general', level: 'gentle', avoid }).items.some((i) => i.pose === warrior.id), `warrior flow gated by ${avoid[0]}`);
  ok(!generatePlan({ minutes: 30, focus: 'general', level: 'beginner' }).items.some((i) => i.pose === warrior.id), 'warrior flow never generated for beginners');
}
ok(!STARTER_PATH.some((p) => p.items.some((i) => i.pose === 'pigeon')), 'pigeon excluded from 7-day starter path');
for (const m of LENGTHS) for (const f of FOCUSES) for (const l of GEN_LEVELS) {
  const ids = generatePlan({ minutes: m, focus: f, level: l }).items.map((i) => i.pose);
  if (f !== 'general') ok(!ids.includes('triangle'), `triangle gate: excluded from non-general ${m}/${f}/${l}`);
  if (ids.includes('triangle')) {
    const tri = ids.indexOf('triangle');
    ok(ids.slice(0, tri).includes('warrior-2'), `triangle follows warrior-2 in ${m}/${l}`);
    ok(ids[tri + 1] === 'half-lift' || (ids[tri + 1] === 'extended-side-angle' && ids[tri + 2] === 'half-lift'), `triangle flows to half-lift, optionally through extended-side-angle, in ${m}/${l}`);
  }
  if (ids.includes('extended-side-angle')) {
    const ext = ids.indexOf('extended-side-angle');
    ok(ids.indexOf('warrior-2') >= 0 && ids.indexOf('triangle') > ids.indexOf('warrior-2') && ext > ids.indexOf('triangle'), `extended-side-angle follows warrior-2 and triangle in ${m}/${l}`);
  }
}
ok(!generatePlan({ minutes: 30, focus: 'general', level: 'beginner' }).items.some((i) => ['warrior-3', 'dancer'].includes(i.pose)), '30-minute beginner general plan keeps advanced balances out');
ok(!STARTER_PATH.some((p) => p.items.some((i) => i.pose === 'wide-legged-fold')), 'wide-legged fold excluded from 7-day starter path');

const REST_HOLD = new Set(['child', 'easy-seat', 'cobbler', 'seated-fold', 'seated-twist', 'knees-to-chest', 'happy-baby', 'figure-four', 'supine-twist', 'legs-up-wall']);
// ---- beginner plans: easy poses only, at most twelve distinct shapes, ONE Cat-Cow flow item
const BEG_OK = new Set(['chair', 'warrior-1', 'warrior-2', 'triangle', 'downward-dog', 'supine-twist', 'happy-baby', 'seated-twist', 'figure-four', 'high-lunge']);
const BEG_ITEMS = { 10: [8, 10], 20: [8, 12], 30: [8, 12] }; // total items incl. Savasana
for (const f of FOCUSES) {
  for (const m of LENGTHS) {
    const g = generatePlan({ minutes: m, focus: f, level: 'beginner' });
    const [lo, hi] = BEG_ITEMS[m];
    ok(g.items.length >= lo && g.items.length <= hi, `beginner ${m} min ${f}: ${g.items.length} items, expected ${lo}-${hi}`);
    ok(g.items.every((i) => POSE_BY_ID[i.pose].difficulty === 1 || BEG_OK.has(i.pose) || i.pose === 'cat-cow'), `beginner ${m}/${f} only easy poses`);
    ok(!g.items.some((i) => ['tree', 'warrior-3', 'plank', 'half-split', 'dancer', 'boat', 'crow', 'pigeon', 'extended-side-angle'].includes(i.pose)), `beginner ${m}/${f} no demanding poses`);
    ok(g.items.every((i) => i.level === 0), `beginner ${m}/${f} uses level-0 variations`);
    const nStand = g.items.filter((i) => POSE_BY_ID[i.pose].section === 'stand').length;
    ok(f === 'relax' ? nStand === 0 : nStand >= 2 && nStand <= (m === 30 ? 5 : 4) + (f === 'strength' ? 1 : 0), `beginner ${m}/${f} standing block is focused (${nStand})`);
    ok(new Set(g.items.map((i) => i.pose)).size === g.items.length, `beginner ${m}/${f} no repeated pose item (two sides = one item)`);
    const body = g.items.slice(0, -1).filter((i) => i.unit === 'sec');
    for (const i of body) {
      const p = POSE_BY_ID[i.pose];
      if (i.pose === 'cobra') ok(i.amount >= 15 && i.amount <= 20, `beginner ${m}/${f} cobra short`);
      else if (['floor', 'cool'].includes(p.section)) ok(i.amount >= 30 && i.amount <= (REST_HOLD.has(i.pose) ? 180 : 75), `beginner ${m}/${f} ${i.pose} unhurried floor hold (${i.amount})`);
      else ok(i.amount >= 20 && i.amount <= 75, `beginner ${m}/${f} ${i.pose} hold (${i.amount})`);
    }
    const cc = g.items.filter((i) => i.pose === 'cat-cow');
    ok(cc.length === 1 && cc[0].unit === 'breath' && cc[0].amount >= 4 && cc[0].amount <= 8, `beginner ${m}/${f} exactly one Cat-Cow flow item`);
    ok(!g.items.some((i) => ['cat', 'cow', 'tabletop'].includes(i.pose)), `beginner ${m}/${f} no separate cat/cow/tabletop items`);
    ok(g.items[0].pose === 'cat-cow', `beginner ${m}/${f} starts with the Cat-Cow flow`);
  }
}
// cat-cow flow pose: alternates two frames (cow <-> cat) in the animator and has its own narration
const CC = POSE_BY_ID['cat-cow'];
ok(CC && [0, 1, 2].every((n) => poseFrames(CC, n).alt), 'cat-cow has an alternate (cat) frame on every level');
ok(poseFrames(CC, 1).alt.spine2[2] > poseFrames(CC, 1).hold.spine2[2] + 8, 'cat-cow: alt frame is the rounded (cat) spine, base is the arched (cow) spine');
ok(/Inhale/.test(CC.cues.en[1]) && /cow/i.test(CC.cues.en[1]) && /Exhale/.test(CC.cues.en[2]) && /cat/i.test(CC.cues.en[2]), 'cat-cow narration: inhale cow, exhale cat');
ok(cueIds('cat-cow').length === 4 && segText('pose.cat-cow.name', 'en') && segText('pose.cat-cow.name', 'he') && segText('pose.cat-cow.name', 'ru'), 'cat-cow narration segments exist');
ok(generatePlan({ minutes: 20, level: 'gentle' }).items.length > 15, 'gentle level keeps the longer, richer plan');

// ---- sequencing: all fours -> standing -> kneeling -> seated -> prone -> supine -> savasana, never supine -> kneel/stand
const RANK = Object.fromEntries(POSITIONS.map((n, i) => [n, i]));
for (const m of LENGTHS) for (const f of FOCUSES) for (const l of GEN_LEVELS) for (const avoid of [[], ['tabletop', 'downward-dog', 'cobra']]) {
  const g = generatePlan({ minutes: m, focus: f, level: l, avoid });
  const pos = g.items.map((i) => POSITION[i.pose]);
  ok(pos.every((x) => x), `sequence ${m}/${f}/${l}: every pose has a position`);
  ok(pos.every((x, i) => i === 0 || RANK[x] >= RANK[pos[i - 1]]), `sequence ${m}/${f}/${l}/${avoid.length}: body positions never go backwards (${pos.join('>')})`);
  const fs = pos.indexOf('supine');
  ok(fs < 0 || pos.slice(fs).every((x) => x === 'supine' || x === 'rest'), `sequence ${m}/${f}/${l}: no supine -> kneeling/standing before savasana`);
}

// ---- builder helpers
ok(JSON.stringify(reorder(['a', 'b', 'c', 'd'], 2, 0)) === '["c","a","b","d"]', 'reorder: item 3 to position 1');
ok(JSON.stringify(reorder(['a', 'b', 'c', 'd'], 0, 3)) === '["b","c","d","a"]', 'reorder: first to last');
ok(JSON.stringify(reorder(['a', 'b', 'c'], 1, 1)) === '["a","b","c"]', 'reorder: same index is a no-op');
const cs = [30, 90, 150, 210]; // row centres, rows 60 px high
ok(dropIndex(cs, cs[2] - 120) === 0, 'drop: item 3 dragged exactly onto item 1 -> index 0 (was 1)');
ok(dropIndex(cs, cs[2] - 100) === 0, 'drop: item 3 dragged near item 1 -> 0');
ok(dropIndex(cs, cs[2] - 60) === 1, 'drop: one row up -> 1');
ok(dropIndex(cs, cs[0] + 400) === 3 && dropIndex(cs, -50) === 0, 'drop: clamped at both ends');
ok(dropIndex(cs, cs[1]) === 1, 'drop: no movement stays put');
ok(clampAmount(0, 'sec').value === 5 && clampAmount(0, 'sec').clamped === 'min', 'clamp 0 s -> min 5');
ok(clampAmount(99999, 'sec').value === 600 && clampAmount(99999, 'sec').clamped === 'max', 'clamp huge -> max 600');
ok(clampAmount('abc', 'breath').value === 1 && clampAmount(7, 'breath').clamped === null, 'clamp breaths');

ok(['he', 'ru', 'en'].every((l) => typeof tr('sideLR', l, 0) === 'string' && typeof tr('sideLR', l, 1) === 'string'), 'side labels (first/second) resolve per language');

// ---- plurals
ok(nPoses(1, 'he') === 'תנוחה אחת' && nPoses(5, 'he') === '5 תנוחות', 'he plural');
ok(nPoses(1, 'en') === '1 pose' && nPoses(0, 'en') === '0 poses' && nPoses(12, 'en') === '12 poses', 'en plural');
ok([[1, '1 поза'], [2, '2 позы'], [4, '4 позы'], [5, '5 поз'], [11, '11 поз'], [14, '14 поз'], [21, '21 поза'], [22, '22 позы'], [25, '25 поз'], [101, '101 поза']].every(([n, t]) => nPoses(n, 'ru') === t), 'ru plural 1/2-4/5+');

// ---- export / import round trip + validation
const plan = { name: 'Test', items: generatePlan({ minutes: 10 }).items };
const txt = exportPlanJSON(plan); const back = parsePlanJSON(txt);
ok(back.plan && JSON.stringify(back.plan.items) === JSON.stringify(plan.items) && JSON.parse(txt).app === APP_ID, 'export -> import round trip');
ok(parsePlanJSON('nope').error, 'bad JSON rejected');
ok(parsePlanJSON(JSON.stringify({ app: 'other', version: 1, plan })).error, 'wrong app rejected');
ok(parsePlanJSON(JSON.stringify({ app: APP_ID, version: 1, plan: { name: 'x', items: [{ pose: 'zzz', level: 0, unit: 'sec', amount: 5 }] } })).error, 'unknown pose rejected');
ok(parsePlanJSON(JSON.stringify({ app: APP_ID, version: 1, plan: { name: 'x', items: [{ pose: 'tree', level: 9, unit: 'sec', amount: 5 }] } })).error, 'bad level rejected');

// favorites + history travel in the export (schema v2); import merges them without duplicates
const favs = ['tree', 'child'];
const hist = [
  { date: '2026-11-12', plan: 'Evening', minutes: 10, seconds: 600, planned: 10, counted: true },
  { date: '2026-11-10', plan: 'Morning', minutes: 20, seconds: 1180, planned: 20, counted: true },
];
const full = exportPlanJSON(plan, { favorites: favs, history: hist });
ok(JSON.parse(full).version === SCHEMA_VERSION && SCHEMA_VERSION === 2, 'export is schema version 2');
const rt = parsePlanJSON(full);
ok(!rt.error && JSON.stringify(rt.favorites) === JSON.stringify(favs) && JSON.stringify(rt.history) === JSON.stringify(hist), 'round trip keeps favorites and history');
ok(JSON.stringify(rt.plan.items) === JSON.stringify(plan.items), 'round trip keeps plan items');
let devFav = ['child', 'mountain'], devHist = [{ date: '2026-11-12', plan: 'Evening', minutes: 10, seconds: 600, planned: 10, counted: true }];
for (let n = 0; n < 2; n++) { // importing the same file twice changes nothing the second time
  devFav = mergeFavorites(devFav, rt.favorites); const m = mergeHistory(devHist, rt.history); devHist = m.history;
  ok(n === 0 ? m.added === 1 : m.added === 0, `import #${n + 1}: history entries added = ${m.added}`);
}
ok(JSON.stringify(devFav) === '["child","mountain","tree"]', 'favorites merged as a union');
ok(devHist.length === 2 && devHist[0].date === '2026-11-12' && devHist[1].plan === 'Morning', 'history merged without duplicates, newest first');
ok(!parsePlanJSON(JSON.stringify({ app: APP_ID, version: 1, plan })).error && parsePlanJSON(JSON.stringify({ app: APP_ID, version: 1, plan })).history.length === 0, 'v1 file (plan only) still imports');
ok(parsePlanJSON(JSON.stringify({ app: APP_ID, version: 3, plan })).error, 'future version rejected');
const dirty = parsePlanJSON(JSON.stringify({ app: APP_ID, version: 2, plan, favorites: ['nope', 'tree', 5], history: [{ date: 'x', plan: 'y' }, { date: '2026-01-01', plan: 'ok', minutes: 3 }, null] }));
ok(dirty.favorites.length === 1 && dirty.history.length === 1, 'invalid favorites/history entries are dropped');

// ---- streak
const d = (n) => { const x = new Date(2026, 10, 13); x.setDate(x.getDate() - n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
ok(streak([{ date: d(0) }, { date: d(1) }, { date: d(2) }, { date: d(4) }], new Date(2026, 10, 13)) === 3, 'streak counts consecutive days');
ok(streak([{ date: d(1) }], new Date(2026, 10, 13)) === 1, 'streak not broken before today practice');
ok(streak([], new Date()) === 0, 'empty streak');
// practice log: actual time decides whether a day counts (>= 50% of plan or >= 5 min)
ok(!countsForStreak(120, 1200), '2 min of a 20 min plan does not count');
ok(countsForStreak(600, 1200) && countsForStreak(300, 1800) && !countsForStreak(299, 1800), 'half the plan, or 5 minutes, counts');
ok(countsForStreak(100, 180) && !countsForStreak(80, 180), 'short plan: 50% rule');
ok(streak([{ date: d(0), counted: false }, { date: d(1) }], new Date(2026, 10, 13)) === 1, 'uncounted session adds no streak day');
ok(streak([{ date: d(0), counted: false }], new Date(2026, 10, 13)) === 0, 'only an uncounted session today -> streak 0');
ok(histMinutes({ minutes: 1, seconds: 30 }) === '<1' && histMinutes({ minutes: 20 }) === '20' && histMinutes({ minutes: 7, seconds: 400 }) === '7', 'history minutes label');

// ---- two-sided poses and sides label
const BOTH = ['warrior-1', 'warrior-2', 'warrior-flow', 'triangle', 'extended-side-angle', 'high-lunge', 'tree', 'warrior-3', 'dancer', 'revolved-chair', 'low-lunge', 'half-split', 'seated-twist', 'supine-twist', 'figure-four', 'pigeon', 'hand-to-toe'];
const gotBoth = POSES.filter((p) => p.sides === 'both').map((p) => p.id).sort();
ok(JSON.stringify(gotBoth) === JSON.stringify([...BOTH].sort()), `exactly the 17 two-sided poses (got ${gotBoth.join(',')})`);
for (const l of LANGS) {
  const p = POSE_BY_ID.triangle;
  ok(p[l] && p.cues[l].length === 4 && p.safety[l] && p.variations.every((v) => v[l]), `triangle i18n ${l}`);
  const w = POSE_BY_ID['wide-legged-fold'];
  ok(w[l] && w.cues[l].length === 4 && w.safety[l] && w.variations.every((v) => v[l]), `wide-legged-fold i18n ${l}`);
  const e = POSE_BY_ID['extended-side-angle'];
  ok(e[l] && e.cues[l].length === 4 && e.safety[l] && e.variations.every((v) => v[l]), `extended-side-angle i18n ${l}`);
}
ok(Math.abs(POSE_BY_ID.mountain.spec.start.pelvis.rot[2]) < 1 && POSE_BY_ID.mountain.spec.start.hipR[2] === 0, 'mountain starts from a neutral stand');
for (const l of LANGS) ok(tr('sides', l, 'single') === '' && tr('sides', l, 'both').length > 0, `sides label ${l}: none for single, text for both`);
// ---- Russian plurals
ok(nCount(1, 'minute', 'ru') === '1 минута' && nCount(3, 'minute', 'ru') === '3 минуты' && nCount(5, 'minute', 'ru') === '5 минут' && nCount(11, 'minute', 'ru') === '11 минут' && nCount(21, 'minute', 'ru') === '21 минута', 'ru minute plurals');
ok(nCount(2, 'day', 'ru') === '2 дня' && nCount(7, 'day', 'ru') === '7 дней' && nCount(22, 'breath', 'ru') === '22 вдоха' && nCount(12, 'second', 'ru') === '12 секунд', 'ru day/breath/second plurals');

// ---- finish screen (regression: nCount was not imported in player.js and the finish page was blank)
for (const l of LANGS) {
  for (const [act, plan, cnt] of [[30, 1200, false], [600, 1200, true], [1500, 1500, true]]) {
    const f = finishStats(l, act, plan, 3, cnt);
    ok(Object.values(f).every((v) => typeof v === 'string' && v.length > 0 && !/undefined|NaN|\[object/.test(v)), `finish ${l} ${act}s renders text: ${JSON.stringify(f)}`);
  }
  ok(finishStats(l, 600, 1200, 3, true).stat.includes('10') && finishStats(l, 600, 1200, 3, true).planned.includes('20'), `finish ${l} shows practiced 10 / planned 20 minutes`);
  ok(!finishStats(l, 600, 1200, 3, true).planned.includes(tr('notCounted', l)) && finishStats(l, 100, 1200, 3, false).planned.includes(tr('notCounted', l)), `finish ${l} notCounted note`);
}
// every identifier a module uses from i18n (or imports from any local module) must be imported and exported
{
  const exportsOf = (src) => { const e = new Set(); for (const m of src.matchAll(/export\s+(?:async\s+)?(?:const|let|function\*?|class)\s+([A-Za-z_$][\w$]*)/g)) e.add(m[1]); for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) for (const x of m[1].split(',')) { const n = x.trim().split(/\s+as\s+/).pop(); if (n) e.add(n); } return e; };
  const rd = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
  const stripC = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const i18nExp = exportsOf(rd('../js/i18n.js'));
  for (const file of readdirSync(new URL('../js/', import.meta.url)).filter((f) => f.endsWith('.js'))) {
    const src = stripC(rd('../js/' + file)); const imported = new Set();
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(\.[^']+)'/g)) {
      const target = new URL(m[2], new URL('../js/' + file, import.meta.url)); const exp = exportsOf(readFileSync(target, 'utf8'));
      for (const x of m[1].split(',')) { const [n, loc] = x.trim().split(/\s+as\s+/); if (!n) continue; ok(exp.has(n), `${file}: imports ${n} from ${m[2]} which exports it`); imported.add(loc || n); }
    }
    if (file === 'i18n.js') continue;
    for (const n of i18nExp) {
      if (n === 'T') continue;
      if (new RegExp(`(?<![\\w$.])${n}\\(`).test(src)) ok(imported.has(n) || new RegExp(`(?:const|let|function)\\s+${n}\\b`).test(src), `${file}: uses i18n ${n}() so it must import it`);
    }
  }
}

// ---- plan totals, player counter, bridge cue
ok(hasBreaths(generatePlan({ minutes: 20 }).items) && !hasBreaths([{ pose: 'tree', level: 0, unit: 'sec', amount: 30 }]), 'hasBreaths');
ok(approxMin(1230, 'en') === '≈ 21 min' && approxMin(1200, 'en') === '≈ 20 min' && approxMin(1200, 'he') === 'כ-20 דק׳' && approxMin(1200, 'ru') === '≈ 20 мин', 'approx minutes he/ru/en');
ok(poseOf(2, 3, 'en') === 'Pose 2 of 3' && poseOf(2, 3, 'he') === 'תנוחה 2 מתוך 3' && poseOf(2, 3, 'ru') === 'Поза 2 из 3', 'pose counter he/ru/en');
ok(slots(generatePlan({ minutes: 20 }).items).every((s) => s.index < generatePlan({ minutes: 20 }).items.length), 'slot.index is the item index (pose counter)');
for (const [l, re] of [['he', /הראש נשאר על הרצפה/], ['ru', /Голова остаётся на полу/], ['en', /head stays on the floor/i]]) {
  const b = POSE_BY_ID.bridge;
  ok(re.test(b.safety[l]) && b.cues[l].some((c) => re.test(c)), `bridge head-stays-on-floor cue (safety + spoken cue) ${l}`);
}
ok(!/clasp|שלובות|сцеплен/.test(JSON.stringify(POSE_BY_ID.bridge.variations)), 'bridge L2 text does not promise clasped hands the figure cannot show');
for (const l of LANGS) ok(tr('clearFilters', l) !== 'clearFilters', `clear-filters label ${l}`);

// ================= Round 4 (yoga master) pose-text regressions =================
{
  const { POSE_V2 } = await import('../data/narration-he-v2.js');
  // row 1: downward dog has the head BELOW the heart, never "above"
  for (const l of LANGS) {
    const s = POSE_BY_ID['downward-dog'].safety[l];
    ok(!/מעל הלב|above the heart|выше сердца/i.test(s), `dog SAFE does not put the head above the heart ${l}`);
  }
  ok(/מתחת ללב/.test(POSE_BY_ID['downward-dog'].safety.he), 'dog SAFE (he) says the head is below the heart');
  // row 2: glaucoma / blood pressure never fixed by "bend the knees"; clinician is named
  for (const id of ['downward-dog', 'uttanasana']) for (const l of LANGS) {
    const eye = POSE_BY_ID[id].safety[l].split(/(?<=[.!])\s+/).filter((x) => /גלאוקומה|glaucoma|глаукоме/i.test(x)).join(' ');
    ok(eye && !/כופפו ברכיים|bend the knees|сгибайте колени/i.test(eye) && /איש מקצוע רפואי|clinician|врач/i.test(eye), `${id} eye/BP line has no bent-knee fix and names a clinician ${l}`);
  }
  // row 3: pregnancy lines in the 9 poses never suggest "stay low"; they point to a clinician
  const PREG = /הריון|pregnan|беремен/i, LOW = /נמוכים|stay low|низко/i, CLIN = /איש מקצוע רפואי|clinician|health professional|врач|медицинскому специалисту/i;
  for (const id of ['cobra', 'locust', 'camel', 'boat', 'seated-twist', 'knees-to-chest', 'supine-twist', 'happy-baby', 'child']) for (const l of LANGS) {
    const lines = POSE_BY_ID[id].safety[l].split(/(?<=[.!])\s+/).filter((x) => PREG.test(x));
    ok(lines.every((x) => !LOW.test(x) && CLIN.test(x)), `${id} pregnancy line: no "stay low", names a clinician ${l}`);
  }
  // row 4: plank L1 is on the toes (בהונות), not the fingertips
  ok(/בהונות/.test(POSE_BY_ID.plank.variations[1].he) && !/אצבעות/.test(POSE_BY_ID.plank.variations[1].he), 'plank L1 (he) says בהונות');
  ok(/בהונות/.test(POSE_V2.plank.mod[1]) && !/קצות האצבעות/.test(POSE_V2.plank.mod[1]), 'plank L1 narration (he) says בהונות');
  ok(!/קצות האצבעות/.test(JSON.stringify(POSE_BY_ID.mountain.variations.map((v) => v.he)) + POSE_V2.mountain.mod.join('')), 'mountain L2 (he) uses בהונות for rising onto the toes');
  // row 5: plank breath does not teach short breaths
  ok(!/קצר/.test(POSE_BY_ID.plank.cues.he.join(' ') + POSE_V2.plank.breath), 'plank breath cue is not "short breaths"');

  // round 5: translated on-screen safety and level text stays aligned with Hebrew
  for (const l of ['ru', 'en']) {
    ok(!/short|shortly|коротк/i.test(POSE_BY_ID.plank.cues[l].at(-1)), `plank breath is continuous ${l}`);
    ok(!/gaze back|взгляд назад/i.test(JSON.stringify(POSE_BY_ID.camel.variations) + POSE_BY_ID.camel.safety[l]), `camel has no gaze-back instruction ${l}`);
    ok(!/tuck the chin|прижмите подбородок/i.test(POSE_BY_ID.camel.safety[l]), `camel SAFE does not tuck the chin ${l}`);
    ok(/pelvis|pelvis level|таз ровно/i.test(POSE_BY_ID.tabletop.variations[2][l]), `tabletop L2 keeps pelvis level ${l}`);
    ok(/return to tabletop|tabletop with control|вернитесь в положение стола/i.test(POSE_BY_ID.tabletop.variations[2][l]), `tabletop L2 returns with control ${l}`);
    ok(/head on the floor|head stays on the floor|голова остаётся на полу/i.test(POSE_BY_ID.bridge.safety[l]) && /neck free|шея свободна/i.test(POSE_BY_ID.bridge.safety[l]), `bridge blanket keeps head down and neck free ${l}`);
    ok(/tailbone down|копчик вниз/i.test(POSE_BY_ID['low-lunge'].cues[l][3]), `low-lunge cue four lengthens tailbone ${l}`);
    ok(!/higher lift|подъём выше/i.test(POSE_BY_ID.locust.variations[2][l]), `locust L2 does not chase lift height ${l}`);
  }
  ok(/palms together at the chest/i.test(POSE_BY_ID['revolved-chair'].cues.en.join(' ')) && /ладони вместе у груди/i.test(POSE_BY_ID['revolved-chair'].cues.ru.join(' ')), 'revolved-chair RU/EN keep palms at chest');
  ok(/heel no higher than the pelvis/i.test(POSE_BY_ID['warrior-3'].variations[2].en) && /пятка не выше таза/i.test(POSE_BY_ID['warrior-3'].variations[2].ru), 'warrior-3 L2 RU/EN cap heel at pelvis');
  ok(/rest on your side/i.test(POSE_BY_ID['legs-up-wall'].safety.en) && /отдыхайте на боку/i.test(POSE_BY_ID['legs-up-wall'].safety.ru), 'legs-up-wall RU/EN offer side rest in later pregnancy');
  ok(/health professional/i.test(POSE_BY_ID['legs-up-wall'].safety.en) && /медицинским специалистом/i.test(POSE_BY_ID['legs-up-wall'].safety.ru), 'legs-up-wall RU/EN direct glaucoma or uncontrolled BP questions to a health professional');
  for (const [l, preg, clinician] of [['he', /בהריון/, /איש מקצוע רפואי/], ['ru', /беременност/i, /медицинскому специалисту/i], ['en', /pregnancy/i, /health professional/i]]) {
    ok(preg.test(POSE_BY_ID.camel.safety[l]) && clinician.test(POSE_BY_ID.camel.safety[l]), `camel SAFE has supported pregnancy guidance ${l}`);
  }
}

// ================= Narration v2 (Hebrew) =================
{
  const { POSE_V2, SEGMENTS_V2, INTRO, CLOSE, INTRO_VARIANTS, CLOSE_VARIANTS } = await import('../data/narration-he-v2.js');
  const NP = await import('../js/narration-plan.js');
  const { store: st2 } = await import('../js/store.js');
  const { SEGMENTS: SEGS_NOW, SEGMENT_BY_ID } = await import('../data/narration.js');
  const { BEGINNER_EXTRA } = await import('../js/generator.js');
  const dur = (id) => NP.estDur(segText(id, 'he'));

  // coverage: every Hebrew pose has all parts, side lines exactly for two-sided poses
  for (const p of POSES) {
    const t = POSE_V2[p.id];
    ok(!!t, `v2 ${p.id} exists`); if (!t) continue;
    ok(t.entry.length >= 1 && t.entry.length <= 3, `v2 ${p.id} entry 1-3`);
    ok(t.align.length >= 1 && t.align.length <= 3, `v2 ${p.id} align 1-3`);
    ok(typeof t.breath === 'string' && t.breath.length > 3, `v2 ${p.id} breath`);
    ok(t.mod.length === 3 && t.mod.every((m) => m && m.length > 3), `v2 ${p.id} mod L0-L2`);
    ok(typeof t.exit === 'string' && t.exit.length > 3, `v2 ${p.id} exit`);
    ok(!!t.side === (p.sides === 'both'), `v2 ${p.id} side line iff two-sided`);
    for (const id of NP.poseV2Ids(p.id)) ok(segText(id, 'he').length > 2, `v2 segText ${id}`);
  }
  ok(Object.keys(POSE_V2).length === POSES.length, 'v2 has exactly the poses we have');
  ok(SEGMENTS_V2.length === 544, `544 v2 segments including warrior-flow (have ${SEGMENTS_V2.length})`);
  ok(new Set(SEGMENTS_V2.map((s) => s.id)).size === SEGMENTS_V2.length, 'v2 ids unique');
  for (const s of SEGMENTS_V2) ok(!hasLatin(s.he) && !hasDigit(s.he) && hebrew(s.he), `v2 ${s.id} Hebrew only, no Latin/digits`);
  ok(SEGMENTS_V2.every((s) => !SEGMENTS_V2.some((o) => o !== s && o.id === s.id)), 'v2 ids do not collide');
  ok(!SEGS_NOW.some((s) => s.id.startsWith('session.') || /\.(entry|align|breath|mod|exit|side)\b/.test(s.id)), 'old SEGMENTS list has no v2 ids');
  ok(SEGMENT_BY_ID['session.intro.arrive'] && SEGMENT_BY_ID['pose.tree.side'], 'v2 ids resolvable through SEGMENT_BY_ID');

  // ru/en narration unchanged (snapshot of the pre-v2 data)
  const legacy = JSON.parse(readFileSync(new URL('./fixtures/narration-legacy.json', import.meta.url), 'utf8'));
  const newPoseSegment = (s) => /^pose\.(crow|pigeon|triangle|wide-legged-fold|extended-side-angle|sun-salutation-a|gentle-flow|warrior-flow)\./.test(s.id);
  const legacyRuEn = (xs) => xs.filter((s) => !newPoseSegment(s)).map(({ id, ru, en }) => ({ id, ru, en }));
  ok(JSON.stringify(legacyRuEn(SEGS_NOW)) === JSON.stringify(legacyRuEn(legacy)), 'pre-existing ru/en legacy SEGMENTS identical to the snapshot');
  ok(SEGS_NOW.length === legacy.length + 48, 'legacy narration adds only the 48 required new-pose segments');

  // setting migration + defaults
  ok(NP.resolveNarration({ density: 'minimal' }) === 'name' && NP.resolveNarration({ density: 'standard' }) === 'short' && NP.resolveNarration({ density: 'full' }) === 'full', 'dens migration minimal/standard/full');
  ok(NP.resolveNarration({}) === 'full' && NP.resolveNarration(undefined) === 'full', 'first-ever session defaults to full');
  ok(NP.resolveNarration({ narration: 'off', density: 'full' }) === 'off' && NP.resolveNarration({ narration: 'bogus', density: 'standard' }) === 'short', 'explicit choice wins, invalid falls back to migration');
  ok(st2.settings.narration === 'full', 'store default narration is full');
  st2.saveSettings({ narration: 'name' }); ok(st2.settings.narration === 'name', 'store persists narration');
  st2.saveSettings({ narration: 'full' });
  ok(['full', 'short', 'name', 'off'].every((k) => tr('narrLvl', 'he', k) !== 'narrLvl' && tr('narrLvl', 'ru', k) && tr('narrLvl', 'en', k)), 'level labels he/ru/en');
  ok(tr('narrLvl', 'he', 'full') === 'מלאה' && tr('narrLvl', 'he', 'short') === 'קצרה' && tr('narrLvl', 'he', 'name') === 'שם התנוחה בלבד' && tr('narrLvl', 'he', 'off') === 'ללא קריינות' && tr('narration', 'he') === 'רמת קריינות', 'Hebrew level labels');
  ok(tr('narrLvl', 'ru', 'full') === 'Полная' && tr('narrLvl', 'ru', 'short') === 'Краткая' && tr('narrLvl', 'ru', 'name') === 'Только название' && tr('narrLvl', 'ru', 'off') === 'Без озвучки', 'Russian level labels');
  ok(tr('narrLvl', 'en', 'full') === 'Full' && tr('narrLvl', 'en', 'short') === 'Short' && tr('narrLvl', 'en', 'name') === 'Pose name only' && tr('narrLvl', 'en', 'off') === 'Off', 'English level labels');

  // intro/closing variants by plan length
  ok(NP.introVariantKey(10) === 'short' && NP.introVariantKey(12) === 'short' && NP.introVariantKey(13) === 'medium' && NP.introVariantKey(24) === 'medium' && NP.introVariantKey(25) === 'long' && NP.introVariantKey(30) === 'long', 'intro variant by plan length');
  const idsOf = (seq) => seq.map((x) => x.id);
  ok(idsOf(NP.introSeq({ lang: 'he', level: 'full', minutes: 10 })).join() === INTRO_VARIANTS.short.keys.map((k) => INTRO[k].id).join(), 'full intro 10 min = short variant');
  ok(idsOf(NP.introSeq({ lang: 'he', level: 'full', minutes: 20 })).length === 6 && idsOf(NP.introSeq({ lang: 'he', level: 'full', minutes: 30 })).length === 8, 'full intro 20/30 min = medium/long');
  ok(idsOf(NP.introSeq({ lang: 'he', level: 'short', minutes: 30 })).length === 4, 'short level uses the short intro for every length');
  ok(NP.introSeq({ lang: 'he', level: 'name', minutes: 30 }).length === 0 && NP.introSeq({ lang: 'he', level: 'off', minutes: 30 }).length === 0 && NP.introSeq({ lang: 'ru', level: 'full', minutes: 30 }).length === 0, 'no intro phase for name/off/ru/en');

  // level -> segments mapping (tree: two-sided; hold long enough that nothing is dropped)
  const base = { lang: 'he', poseId: 'tree', side: 0, sides: 2, hold: 60, lvl: 0, dur, announced: false, lastSavasana: false, minutes: 20 };
  const P = (o) => NP.slotPlan({ ...base, ...o });
  const full = P({ level: 'full', hold: 130 });
  ok(full.ids[0] === 'pose.tree.intro' && full.ids.includes('pose.tree.entry.1') && full.ids.includes('pose.tree.mod.L0') && full.ids.includes('pose.tree.align.1') && full.ids.includes('pose.tree.breath') && full.ids.includes('pose.tree.exit'), 'full: intro, entry, mod, align, breath, exit');
  ok(full.ids.indexOf('pose.tree.mod.L0') > full.ids.indexOf('pose.tree.entry.1') && full.ids.indexOf('pose.tree.mod.L0') < full.ids.indexOf('pose.tree.align.1'), 'full: mod comes after entry and before align');
  ok(P({ level: 'full', hold: 130, lvl: 2 }).ids.includes('pose.tree.mod.L2') && !P({ level: 'full', hold: 130, lvl: 2 }).ids.includes('pose.tree.mod.L0'), 'full: mod follows the item level');
  const shortL0 = P({ level: 'short', lvl: 0, hold: 60 }), shortL1 = P({ level: 'short', lvl: 1, hold: 30 });
  ok(shortL0.ids.join() === 'pose.tree.intro,pose.tree.entry.1,pose.tree.mod.L0,pose.tree.breath', 'short L0: intro, entry.1, mod.L0, breath (hold>=25, budget allows)');
  ok(shortL1.ids.join() === 'pose.tree.intro,pose.tree.entry.1,pose.tree.breath' && !P({ level: 'short', lvl: 0, hold: 20 }).ids.includes('pose.tree.breath'), 'short L1: no mod; no breath when hold < 25');
  ok(P({ level: 'name' }).ids.join() === 'pose.tree.intro', 'name: pose name only');
  ok(P({ level: 'off' }).ids.length === 0, 'off: silent');
  ok(P({ level: 'name', side: 1 }).ids.join() === 'common.switch_sides' && P({ level: 'short', side: 1 }).ids.join() === 'common.switch_sides' && P({ level: 'name', side: 1, announced: true }).ids.length === 0, 'name/short side two: switch line only (not repeated when already announced)');
  const s2 = P({ level: 'full', side: 1, hold: 40, announced: true });
  ok(s2.ids.join() === 'pose.tree.side,pose.tree.align.1,pose.tree.breath', 'full side two: side line, one align, breath');
  ok(P({ level: 'full', side: 1, hold: 40 }).ids[0] === 'common.switch_sides', 'full side two starts with the switch line when not yet announced');
  const longHold = P({ level: 'full', hold: 180 });
  ok(longHold.ids.filter((i) => i === 'common.breathe_slow').length >= 2, 'long hold: breath reminders about every 30 s');
  ok(longHold.events.filter((e) => e.items[0].id === 'common.breathe_slow').every((e) => e.t % 30 === 0), 'reminders on the 30 s grid');
  ok(!P({ level: 'full', hold: 30 }).ids.includes('common.breathe_slow'), 'no reminders in short holds');
  // ru/en keep the existing behaviour
  for (const l of ['ru', 'en']) {
    const o = { lang: l, lvl: 0, poseId: 'mountain', hold: 30, side: 0, sides: 1 };
    ok(P({ ...o, level: 'full' }).ids.join() === ['pose.mountain.intro', ...cueIds('mountain'), 'common.breathe_in', 'common.breathe_out'].join(), `${l} full = intro + all cues + mid breath`);
    ok(P({ ...o, level: 'short' }).ids.join() === ['pose.mountain.intro', ...cueIds('mountain').slice(0, 2)].join(), `${l} short = intro + 2 cues`);
    ok(P({ ...o, level: 'name' }).ids.join() === 'pose.mountain.intro', `${l} name = name only`);
    ok(P({ ...o, level: 'off' }).ids.length === 0, `${l} off = silent`);
  }
  // events are time ordered and inside the hold
  for (const lvl of ['full', 'short']) {
    const e = P({ level: lvl, hold: 40 }).events;
    ok(e.every((x, i) => i === 0 || e[i - 1].t <= x.t) && e.every((x) => x.t >= 0 && x.t < 40), `${lvl} events ordered and inside the hold`);
  }

  // budget rule: speech <= 65% of the hold in every generated plan (or only the never-dropped segments remain)
  const never = (id, lvl) => /\.intro$/.test(id) || id.endsWith('.entry.1') || id.endsWith(`.mod.L${lvl}`) || id.endsWith('.side') || id === 'common.switch_sides';
  const plans = [];
  for (const m of LENGTHS) for (const f of FOCUSES) for (const g of GEN_LEVELS) plans.push([`gen ${m}/${f}/${g}`, generatePlan({ minutes: m, focus: f, level: g })]);
  for (const pr of ALL_PRESETS) plans.push([`preset ${pr.id || pr.name?.en}`, pr]);
  let slotsChecked = 0, tight = 0;
  for (const [name, pl] of plans) {
    const list = slots(pl.items);
    for (const mult of [0.75, 1, 1.5]) list.forEach((s, i) => {
      const hold = Math.max(5, Math.round(s.hold * mult));
      const last = s.pose.id === 'savasana' && i === list.length - 1;
      for (const lvl of ['full', 'short']) {
        const r = NP.slotPlan({ lang: 'he', level: lvl, poseId: s.pose.id, side: s.side, sides: s.sides, hold, lvl: s.level, dur, announced: s.side === 1, lastSavasana: last, minutes: 20 });
        slotsChecked++;
        if (last) { // closing replaces savasana align/mod and fits the hold
          ok(!r.ids.some((x) => /savasana\.(align|mod)/.test(x)), `${name} savasana closing replaces align/mod (${lvl})`);
          if (hold >= 60) ok(r.ids.includes('session.close.line') && r.ids.includes('session.close.out.1'), `${name} savasana closing out lines present (${lvl}, hold ${hold})`);
          continue;
        }
        const budget = NP.BUDGET * hold;
        if (r.speech <= budget + 1e-9) continue;
        tight++;
        ok(r.ids.every((x) => never(x, s.level)), `${name} ${s.pose.id} hold ${hold} ${lvl}: speech ${r.speech.toFixed(1)} > ${budget.toFixed(1)} yet droppable ids remain: ${r.ids.join()}`);
      }
    });
  }
  ok(slotsChecked > 1000, `budget simulation covered ${slotsChecked} slots`);
  // drop order: later aligns go first, then the breath line; never entry.1 / mod
  const tight1 = NP.slotPlan({ ...base, level: 'full', hold: 28, lvl: 1, poseId: 'tree' });
  ok(!tight1.ids.includes('pose.tree.align.2') || tight1.ids.includes('pose.tree.align.1'), 'drop order: align.2 never kept without align.1');
  ok(tight1.ids.includes('pose.tree.entry.1') && tight1.ids.includes('pose.tree.mod.L1'), 'never drop entry.1 or mod');
  const mid = NP.slotPlan({ ...base, level: 'full', hold: 40, lvl: 0, poseId: 'warrior-2', side: 0 });
  ok(mid.speech <= 0.65 * 40 || mid.ids.every((x) => never(x, 0)), 'warrior-2 hold 40 within budget');
  // real durations override the estimate
  const r2 = NP.slotPlan({ ...base, level: 'full', hold: 40, dur: () => 20 });
  ok(r2.ids.length <= 4 && r2.ids.includes('pose.tree.entry.1') && r2.ids.includes('pose.tree.mod.L0'), 'very long real clips drop everything droppable');

  // savasana: closing variants by plan length, replaces align/mod, fits the hold
  const sv = (o) => NP.slotPlan({ lang: 'he', level: 'full', poseId: 'savasana', side: 0, sides: 1, hold: 165, lvl: 0, dur, announced: false, lastSavasana: true, minutes: 20, ...o });
  ok(sv({ hold: 220, minutes: 30 }).ids.includes('session.close.scan.lite') && sv({ hold: 220, minutes: 30 }).ids.includes('session.close.scan.3'), 'savasana 30 min: long closing');
  ok(sv({ minutes: 20 }).ids.includes('session.close.scan.2') && !sv({ minutes: 20 }).ids.includes('session.close.scan.3'), 'savasana 20 min: medium closing');
  ok(!sv({ hold: 60, minutes: 10 }).ids.some((x) => x.includes('.scan.')) && sv({ hold: 60, minutes: 10 }).ids.includes('session.close.enter'), 'savasana 10 min: short closing');
  ok(sv({ level: 'short', minutes: 30 }).ids.join() === 'pose.savasana.intro,pose.savasana.entry.1,session.close.enter,session.close.out.1,session.close.out.2,session.close.line', 'short level savasana closing');
  ok(sv({ level: 'name' }).ids.join() === 'pose.savasana.intro,common.savasana_end', 'name level savasana: name + savasana_end');
  ok(sv({ level: 'off' }).ids.length === 0, 'off level savasana silent');
  ok(sv({}).ids.indexOf('session.close.out.1') > sv({}).ids.indexOf('session.close.enter'), 'closing: enter before out');
  for (const h of [60, 90, 120, 165, 225, 300]) for (const m of [10, 20, 30]) {
    const r = sv({ hold: h, minutes: m });
    const lastEv = r.events[r.events.length - 1];
    ok(lastEv.t + lastEv.items.reduce((a, x) => a + dur(x.id) + x.pause, 0) <= h + 1e-6, `savasana closing finishes inside hold ${h}/${m}min`);
  }
  ok(NP.closingPlays({ lang: 'he', level: 'full', lastSavasana: true }) && !NP.closingPlays({ lang: 'he', level: 'name', lastSavasana: true }) && !NP.closingPlays({ lang: 'ru', level: 'full', lastSavasana: true }), 'closingPlays');
  ok(Object.keys(CLOSE_VARIANTS).join() === 'short,medium,long', 'closing variants present');

  // TTS priority: intro -> close -> beginner poses -> rest, hebrew v2 before the legacy segments
  const script = JSON.parse(readFileSync(new URL('../narration-script.json', import.meta.url), 'utf8'));
  const v2s = script.filter((s) => s.v2);
  ok(v2s.length === 544 && v2s.every((s) => s.lang === 'he'), 'narration-script.json has 544 Hebrew v2 entries');
  ok(script.filter((s) => !s.v2).length === 281 * 3, 'narration-script.json has 281 legacy entries in each language');
  const beg = new Set(POSES.filter((p) => p.difficulty === 1 || BEGINNER_EXTRA.has(p.id)).map((p) => p.id));
  ok(v2s.filter((s) => s.prio === 'intro').length === 8 && v2s.filter((s) => s.prio === 'close').length === 8, 'prio intro/close counts');
  ok(v2s.filter((s) => s.prio === 'beginner').every((s) => beg.has(s.id.split('.')[1])) && v2s.filter((s) => s.prio === 'rest').every((s) => !beg.has(s.id.split('.')[1])), 'prio beginner/rest by pose');
  ok(script.every((s) => !s.v2 || (s.lang === 'he')), 'no ru/en v2 segments queued');
}

// ---- floor contacts (round 3): the parts that should touch the floor are within 2 units of the lowest point
{
  const { primBox } = await import('../js/rig.js');
  const CONTACT = { tabletop: ['palm', 'toes'], cow: ['palm'], 'cat-cow': ['palm'], plank: ['palm'], 'downward-dog': ['palm'], child: ['toes'] };
  for (const [id, parts] of Object.entries(CONTACT)) {
    const P = POSES.find((q) => q.id === id);
    for (let l = 0; l < 3; l++) {
      const S = solve(poseFrames(P, l).hold);
      for (const part of parts) {
        const lo = Math.min(...S.prims.filter((p) => p.id.startsWith(part) || (part === 'palm' && p.id.startsWith('fing'))).map((p) => primBox(p).lo));
        ok(lo <= 2.0, `${id} L${l} ${part} contact ${lo.toFixed(2)} <= 2`);
      }
    }
  }
}

// ---- ink figure style: the only style (no setting, no override)
{
  const { inkOn, inkSoftId, inkEdgeId, inkTwinK } = await import('../js/inkstyle.js');
  const inkMod = await import('../js/inkstyle.js');
  ok(inkOn() === true && inkOn('') === true && inkOn('?style=plain') === true, 'ink: always on, no URL override');
  ok(!('inkStyle' in inkMod) && !('inkRequested' in inkMod) && !('inkStored' in inkMod) && !('INK_KEY' in inkMod), 'ink: no setting API exported');
  const i18nSrc = readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');
  ok(!/drawStyle|drawPlain|drawInk/.test(i18nSrc), 'ink: no style toggle strings in i18n');
  for (const f of ['app.js', 'player.js', 'figure.js']) {
    const src = readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
    ok(!/drawStyle|inkStyle|yoga\.style/.test(src), `ink: ${f} has no style toggle or yoga.style usage`);
  }
  // face: no cel crescent on the head, nose, ears, hair; no outline on nose and ears; hands and feet keep an inner line
  for (const id of ['h_head', 'h_nose', 'h_earR', 'h_earL', 'h_hair', 'h_bun']) ok(inkSoftId(id), `ink: ${id} keeps the soft gradient (no cel shade)`);
  for (const id of ['uarmR', 'thighL', 'chest', 'palmR', 'footL']) ok(!inkSoftId(id), `ink: ${id} gets cel shading`);
  ok(inkTwinK('h_nose') === 0 && inkTwinK('h_earR') === 0 && inkTwinK('h_head') < 1 && inkTwinK('uarmR') === 1, 'ink: no outline on nose/ears, thinner on head');
  ok(['palmR', 'thumbL', 'fingR', 'footL', 'toesR'].every(inkEdgeId) && !['pelvis', 'uarmR', 'shankL', 'h_head'].some(inkEdgeId), 'ink: inner lines only on hands and feet');
  const src2d = readFileSync(new URL('../js/figure2d.js', import.meta.url), 'utf8'), src3d = readFileSync(new URL('../js/figure3d.js', import.meta.url), 'utf8');
  ok(/ink = inkOn\(\)/.test(src2d) && /ink = inkOn\(\)/.test(src3d), 'ink: both renderers default to inkOn() (always true)');
  ok(/farH, this\.ink && !inkSoftId\(id\)\)/.test(src2d) && /this\.ink && !inkSoftId\(id\)\); this\.lgs\.set\(key/.test(src2d) && /this\.ink && !inkSoftId\(id\) \? 'ink-'/.test(src2d) && /if \(cel\) \{ celStops/.test(src2d), '2d: cel gradients only when ink');
  ok(/this\.ink \? new T\.MeshToonMaterial/.test(src3d) && /: new T\.MeshStandardMaterial/.test(src3d), '3d: toon material only when ink, standard otherwise');
  ok(/if \(!this\.ink\) return;/.test(src3d), '3d: outline only when ink');
}

// ---- round 4 (rows 29-39): sequencing, warm-up, savasana cap, L0 default, pregnancy note
{
  const { isBackbend, savasanaCap, needsPregnancyNote } = await import('../js/generator.js');
  const WARM = new Set(['cat-cow', 'tabletop']);
  const backOk = (items, m) => { for (let i = 1; i < items.length; i++) ok(!(isBackbend(items[i - 1].pose) && isBackbend(items[i].pose)), `${m}: no adjacent backbends at ${i} (${items[i - 1].pose}, ${items[i].pose})`); };
  for (const lvl of GEN_LEVELS) for (const f of FOCUSES) for (const mins of LENGTHS) for (const avoid of [[], ['cat-cow'], ['cat-cow', 'child', 'cobra']]) {
    const g = generatePlan({ minutes: mins, focus: f, level: lvl, avoid }), tag = `${lvl}/${f}/${mins}/${avoid.join('+') || '-'}`;
    backOk(g.items, tag);
    const sv = g.items.at(-1);
    const restFloor = lvl === 'beginner' && mins >= 30 ? 300 : lvl === 'beginner' && mins >= 20 ? 180 : 30;
    ok(sv.pose === 'savasana' && sv.amount >= restFloor && sv.amount <= 600, `${tag}: savasana ${sv.amount}s meets the final-rest floor`);
    if (lvl === 'beginner') ok(g.items.slice(0, 2).some((it) => WARM.has(it.pose)), `${tag}: beginner opens with a warm-up (${g.items[0].pose})`);
  }
  ok(generatePlan({ minutes: 10, focus: 'general', level: 'beginner' }).items[0].pose === 'cat-cow', 'beginner 10 min starts with cat-cow');
  ok(generatePlan({ minutes: 10, focus: 'general', level: 'beginner', avoid: ['cat-cow'] }).items[0].pose === 'tabletop', 'cat-cow avoided: tabletop breaths warm up instead');
  for (const p of ALL_PRESETS) backOk(p.items, `preset ${p.id}`);
  ok(savasanaCap(10) <= 90 && savasanaCap(20) >= 180 && savasanaCap(30) >= 300, 'first-time final rest: 3 min at 20, 5 min at 30');
  const P = Object.fromEntries(ALL_PRESETS.map((p) => [p.id, p]));
  const seq = (id) => P[id].items.map((i) => i.pose);
  ok(seq('desk-break').at(-1) !== 'revolved-chair', 'desk-break does not end on revolved-chair');
  ok(seq('desk-break').at(-1) === 'easy-seat' && seq('desk-break').filter((id) => POSE_BY_ID[id].section === 'stand').length <= 5, 'desk-break is simple standing movement followed by distinct seated recovery');
  { const s = seq('core-balance'); ok(s.every((x, i) => !(x === 'tree' && s[i + 1] === 'dancer')), 'core-balance: no tree directly before dancer'); ok(/קיר|כיסא/.test(P['core-balance'].desc.he), 'core-balance mentions a wall or chair'); }
  ok(!seq('starter-day-3').includes('tree') && !seq('starter-day-3').includes('warrior-2'), 'day 3 trimmed to standing basics (no tree, no warrior-2)');
  ok(['allfours', 'seated-warm', 'seated'].includes(POSITION[seq('starter-day-3')[0]]), 'starter-day-3 starts with a floor warm-up pose');
  {
    const bands = seq('morning-wakeup').map((id) => POSITION[id] === 'stand' ? 'standing' : id === 'savasana' || ['supine', 'allfours', 'prone', 'kneel', 'seated', 'seated-warm'].includes(POSITION[id]) ? 'floor' : 'floor');
    const changes = bands.filter((band, i) => i && band !== bands[i - 1]).length;
    ok(changes <= 2, `morning-wakeup has at most one floor-standing transition pair (${bands.join('>')})`);
  }
  { const h = (id, pose) => P[id].items.find((i) => i.pose === pose)?.amount; ok(h('beginner-foundations', 'downward-dog') === 30 && h('beginner-foundations', 'tree') <= 30 && h('beginner-foundations', 'cobra') <= 20, 'beginner-foundations: dog 30, tree <=30, cobra short'); ok(h('starter-day-5', 'plank') <= 15 && h('starter-day-6', 'tree') <= 30, 'starter days: plank 15 s, tree <=30 s'); }
  ok(!seq('full-flow').includes('camel') && !seq('back-relief').includes('cobra'), 'full-flow has no camel; back-relief has no cobra');
  ok(seq('back-relief').some((x) => x === 'child' || x === 'seated-fold' || x === 'uttanasana'), 'back-relief has a fold or child');
  ok(needsPregnancyNote(P['back-relief'].items) && needsPregnancyNote(P['core-balance'].items) && needsPregnancyNote(P['full-flow'].items), 'pregnancy note shows on prone/supine/twist/balance plans');
  ok(!needsPregnancyNote([{ pose: 'mountain' }, { pose: 'uttanasana' }, { pose: 'savasana' }]), 'pregnancy note hidden on standing-only plans');
  ok(['he', 'ru', 'en'].every((l) => tr('pregNote', l).length > 20 && tr('pregNote', l) !== 'pregNote'), 'pregNote exists in he/ru/en');
  ok(hebrew(tr('pregNote', 'he')) && cyr(tr('pregNote', 'ru')), 'pregNote scripts');
  const appSrc = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  ok(/let level = 0, speed = 1/.test(appSrc) && /setLevel\(level\)/.test(appSrc), 'pose page defaults to L0');
  ok(/needsPregnancyNote\(plan\.items\)/.test(appSrc) && /preg-note/.test(appSrc), 'plan screen wires the pregnancy note');
}

{ // end-of-session check-in
  const { suggestNext, FEELS } = await import('../js/checkin.js');
  const pre = PRESETS.map((p) => ({ id: p.id, minutes: p.minutes, level: p.level }));
  ok(FEELS.length === 3, 'three feelings');
  for (const f of FEELS) for (const p of pre) {
    const r = suggestNext(f, { id: 'preset:' + p.id, minutes: p.minutes, level: p.level }, pre);
    ok(r && r.id !== p.id && pre.some((x) => x.id === r.id), `checkin ${f} after ${p.id} gives another real preset`);
    if (f === 'hard') ok(r.minutes <= p.minutes || r.level === 0, `checkin hard after ${p.id} is not longer and harder`);
    if (f === 'easy') ok(r.minutes > p.minutes || r.level > p.level || p.minutes === Math.max(...pre.map((x) => x.minutes)), `checkin easy after ${p.id} steps up`);
  }
  ok(suggestNext('ok', { minutes: 10 }, []) === null, 'checkin with no presets is null');
  ok(['howWasIt', 'feelEasy', 'feelOk', 'feelHard', 'nextSuggest'].every((k) => ['he', 'ru', 'en'].every((l) => tr(k, l) && tr(k, l) !== k)), 'checkin strings he/ru/en');
  const ps = readFileSync(new URL('../js/player.js', import.meta.url), 'utf8');
  ok(/id: 'checkin'/.test(ps) && /suggestNext/.test(ps), 'finish screen wires the check-in');
}

{ const pt = await import('./player.test.mjs'); pass += pt.pass; fail += pt.fail; } // player: fix cues, music, transcript

await (await import('./figure.test.mjs')).default(ok);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
