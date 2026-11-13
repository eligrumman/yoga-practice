// Run: node tests/run.mjs   (no dependencies)
import { POSES, POSE_BY_ID } from '../data/poses.js';
import { SEGMENTS, LANGS, segText, cueIds } from '../data/narration.js';
import { PRESETS, STARTER_PATH, ALL_PRESETS } from '../data/plans-preset.js';
import { planSeconds, validatePlanObject, exportPlanJSON, parsePlanJSON, slots, APP_ID } from '../js/plan.js';
import { generatePlan, FOCUSES, LENGTHS, GEN_LEVELS } from '../js/generator.js';
import { poseFrames, geometry, bottom, FLOOR } from '../js/figure.js';
import { streak } from '../js/store.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const hasLatin = (s) => /[A-Za-z]/.test(s), hasDigit = (s) => /[0-9]/.test(s);
const hebrew = (s) => /[֐-׿]/.test(s), cyr = (s) => /[Ѐ-ӿ]/.test(s);

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
    const { frame } = poseFrames(p, n);
    const g = geometry(frame); const b = bottom(g);
    ok(Number.isFinite(b) && JSON.stringify(g).indexOf('null') < 0 && JSON.stringify(g).indexOf('NaN') < 0, `${p.id} L${n} geometry is finite`);
  });
  // levels must actually differ in motion data (animated variations)
  const sig = p.variations.map((v) => JSON.stringify(v.kf));
  ok(new Set(sig).size >= 2, `${p.id} variations differ`);
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

// ---- export / import round trip + validation
const plan = { name: 'Test', items: generatePlan({ minutes: 10 }).items };
const txt = exportPlanJSON(plan); const back = parsePlanJSON(txt);
ok(back.plan && JSON.stringify(back.plan.items) === JSON.stringify(plan.items) && JSON.parse(txt).app === APP_ID, 'export -> import round trip');
ok(parsePlanJSON('nope').error, 'bad JSON rejected');
ok(parsePlanJSON(JSON.stringify({ app: 'other', version: 1, plan })).error, 'wrong app rejected');
ok(parsePlanJSON(JSON.stringify({ app: APP_ID, version: 1, plan: { name: 'x', items: [{ pose: 'zzz', level: 0, unit: 'sec', amount: 5 }] } })).error, 'unknown pose rejected');
ok(parsePlanJSON(JSON.stringify({ app: APP_ID, version: 1, plan: { name: 'x', items: [{ pose: 'tree', level: 9, unit: 'sec', amount: 5 }] } })).error, 'bad level rejected');

// ---- streak
const d = (n) => { const x = new Date(2026, 10, 13); x.setDate(x.getDate() - n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
ok(streak([{ date: d(0) }, { date: d(1) }, { date: d(2) }, { date: d(4) }], new Date(2026, 10, 13)) === 3, 'streak counts consecutive days');
ok(streak([{ date: d(1) }], new Date(2026, 10, 13)) === 1, 'streak not broken before today practice');
ok(streak([], new Date()) === 0, 'empty streak');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
