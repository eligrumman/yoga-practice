// Run: node tests/run.mjs   (no dependencies)
import { POSES, POSE_BY_ID } from '../data/poses.js';
import { SEGMENTS, LANGS, segText, cueIds } from '../data/narration.js';
import { PRESETS, STARTER_PATH, ALL_PRESETS } from '../data/plans-preset.js';
import { mergeHistory, mergeFavorites, SCHEMA_VERSION, planSeconds, validatePlanObject, exportPlanJSON, parsePlanJSON, slots, APP_ID, holdSeconds, clampAmount, dropIndex, reorder } from '../js/plan.js';
import { generatePlan, FOCUSES, LENGTHS, GEN_LEVELS, POSITIONS, POSITION } from '../js/generator.js';
import { poseFrames, geometry, bottom, FLOOR } from '../js/figure.js';
import { streak, countsForStreak, histMinutes } from '../js/store.js';
import { nPoses, nCount, tr, poseOf, approxMin, finishStats } from '../js/i18n.js';
import { hasBreaths } from '../js/plan.js';
import { readFileSync, readdirSync } from 'node:fs';

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

// ---- beginner plans: easy poses only, few items, 30-45 s holds on the floor, ONE Cat-Cow flow item, two-sided poses count once
const BEG_OK = new Set(['chair', 'warrior-1', 'warrior-2', 'downward-dog', 'supine-twist', 'happy-baby', 'seated-twist', 'figure-four', 'high-lunge']);
const BEG_ITEMS = { 10: [8, 10], 20: [14, 18], 30: [19, 24] }; // total items incl. Savasana
for (const f of FOCUSES) {
  for (const m of LENGTHS) {
    const g = generatePlan({ minutes: m, focus: f, level: 'beginner' });
    const [lo, hi] = BEG_ITEMS[m];
    ok(g.items.length >= lo && g.items.length <= hi, `beginner ${m} min ${f}: ${g.items.length} items, expected ${lo}-${hi}`);
    ok(g.items.every((i) => POSE_BY_ID[i.pose].difficulty === 1 || BEG_OK.has(i.pose) || i.pose === 'cat-cow'), `beginner ${m}/${f} only easy poses`);
    ok(!g.items.some((i) => ['tree', 'warrior-3', 'plank', 'half-split', 'dancer', 'boat'].includes(i.pose)), `beginner ${m}/${f} no demanding poses`);
    ok(g.items.every((i) => i.level === 0), `beginner ${m}/${f} uses level-0 variations`);
    const nStand = g.items.filter((i) => POSE_BY_ID[i.pose].section === 'stand').length;
    ok(nStand >= 2 && nStand <= (m === 30 ? 5 : 4), `beginner ${m}/${f} has ${nStand} standing poses (2-4, up to 5 at 30 min)`);
    ok(new Set(g.items.map((i) => i.pose)).size === g.items.length, `beginner ${m}/${f} no repeated pose item (two sides = one item)`);
    const body = g.items.slice(0, -1).filter((i) => i.unit === 'sec');
    for (const i of body) {
      const p = POSE_BY_ID[i.pose];
      if (i.pose === 'cobra') ok(i.amount >= 15 && i.amount <= 20, `beginner ${m}/${f} cobra short`);
      else if (['floor', 'cool'].includes(p.section)) ok(i.amount >= 30 && i.amount <= (m === 30 && f === "back" ? 75 : 45), `beginner ${m}/${f} ${i.pose} floor hold 30-45 s (${i.amount})`);
      else ok(i.amount >= 15 && i.amount <= (m === 30 && f === "back" ? 75 : 45), `beginner ${m}/${f} ${i.pose} hold (${i.amount})`);
    }
    const cc = g.items.filter((i) => i.pose === 'cat-cow');
    ok(cc.length === 1 && cc[0].unit === 'breath' && cc[0].amount >= 4 && cc[0].amount <= 8, `beginner ${m}/${f} exactly one Cat-Cow flow item`);
    ok(!g.items.some((i) => ['cat', 'cow', 'tabletop'].includes(i.pose)), `beginner ${m}/${f} no separate cat/cow/tabletop items`);
    ok(g.items[0].pose === 'cat-cow', `beginner ${m}/${f} starts with the Cat-Cow flow`);
  }
}
// cat-cow flow pose: alternates two frames (cow <-> cat) in the animator and has its own narration
const CC = POSE_BY_ID['cat-cow'];
ok(CC && CC.variations.every((v) => v.alt), 'cat-cow has an alternate (cat) frame on every level');
ok(poseFrames(CC, 1).alt && poseFrames(CC, 1).alt.t > poseFrames(CC, 1).frame.t + 20, 'cat-cow: alt frame is the rounded (cat) spine, base is the arched (cow) spine');
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
const BOTH = ['warrior-1', 'warrior-2', 'high-lunge', 'tree', 'warrior-3', 'dancer', 'revolved-chair', 'low-lunge', 'half-split', 'seated-twist', 'supine-twist', 'figure-four', 'hand-to-toe'];
const gotBoth = POSES.filter((p) => p.sides === 'both').map((p) => p.id).sort();
ok(JSON.stringify(gotBoth) === JSON.stringify([...BOTH].sort()), `exactly the 13 two-sided poses (got ${gotBoth.join(',')})`);
ok(POSE_BY_ID.mountain.start === 'stand', 'mountain.start === stand');
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
