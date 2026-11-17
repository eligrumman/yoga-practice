// "Anything we should know?" sheet: flags -> generator avoid/gates, plan lengths, persistence, strings, skippable sheet.
import { POSE_BY_ID } from '../data/poses.js';
import { generatePlan, FOCUSES, LENGTHS, GEN_LEVELS, savasanaCap } from '../js/generator.js';
import { planSeconds } from '../js/plan.js';
import { HEALTH_FLAGS, HEALTH_HARD, HEALTH_SOFT, HEALTH_AVOID, cleanHealth, healthAvoid, flagsForPose, avoidsPose } from '../js/health.js';
import { store } from '../js/store.js';
import { tr } from '../js/i18n.js';
import { readFileSync } from 'node:fs';

export default async function (ok) {
  const L = ['he', 'ru', 'en'];
  ok(HEALTH_FLAGS.join() === 'knees,wrists,back,neck,pressure,pregnancy', 'health: six answers');
  ok(JSON.stringify(cleanHealth(['pregnancy', 'x', 'knees', 'knees', 7, null, 'none'])) === '["knees","pregnancy"]', 'cleanHealth keeps known answers once, in order');
  ok(cleanHealth('bad').length === 0 && cleanHealth(undefined).length === 0 && cleanHealth({}).length === 0, 'cleanHealth non-array -> []');
  // every listed id is a real pose or one of the generator's gate tokens
  const TOKENS = new Set(['knee-avoid', 'wrist-avoid', 'blood-pressure-avoid', 'pregnancy-avoid']);
  for (const f of HEALTH_FLAGS) for (const id of HEALTH_AVOID[f]) ok(POSE_BY_ID[id] || TOKENS.has(id), `health ${f}: ${id} is a pose or gate token`);
  ok(HEALTH_AVOID.knees.includes('knee-avoid') && HEALTH_AVOID.pressure.includes('blood-pressure-avoid') && HEALTH_AVOID.pregnancy.includes('pregnancy-avoid') && HEALTH_AVOID.wrists.includes('wrist-avoid'), 'existing generator gate tokens are fed');
  ok(healthAvoid([]).length === 0, 'no answers -> nothing avoided');

  // no answers: plans are exactly what they were
  for (const m of LENGTHS) for (const f of FOCUSES) for (const l of GEN_LEVELS)
    ok(JSON.stringify(generatePlan({ minutes: m, focus: f, level: l, health: [] }).items) === JSON.stringify(generatePlan({ minutes: m, focus: f, level: l }).items), `no answers leaves ${m}/${f}/${l} unchanged`);

  // each answer on its own: its poses are gone (hard and soft), length and ending kept
  const distinctCap = (m) => (m === 30 ? 16 : 12);
  for (const fl of HEALTH_FLAGS) for (const m of LENGTHS) for (const f of FOCUSES) for (const l of GEN_LEVELS) {
    const g = generatePlan({ minutes: m, focus: f, level: l, health: [fl] });
    const ids = g.items.map((i) => i.pose);
    ok(HEALTH_AVOID[fl].every((id) => !ids.includes(id)), `health ${fl} ${m}/${f}/${l}: avoided poses absent (${ids.filter((i) => HEALTH_AVOID[fl].includes(i))})`);
    ok(Math.abs(planSeconds(g.items) / 60 - m) <= 1, `health ${fl} ${m}/${f}/${l}: keeps its length`);
    ok(ids.at(-1) === 'savasana' && POSE_BY_ID[ids[0]].section === 'warm', `health ${fl} ${m}/${f}/${l}: warm-up first, Savasana last`);
    if (l === 'beginner') ok(new Set(ids).size <= distinctCap(m) && g.items.at(-1).amount >= (m === 10 ? 60 : m === 20 ? 180 : 300), `health ${fl} ${m}/${f}: beginner item cap and final rest kept`);
  }
  // every combination of answers: hard exclusions always hold, every plan keeps its target length
  let worst = 0;
  for (let mask = 1; mask < 64; mask++) {
    const hs = HEALTH_FLAGS.filter((_, i) => mask >> i & 1);
    for (const m of LENGTHS) for (const f of FOCUSES) for (const l of GEN_LEVELS) {
      const g = generatePlan({ minutes: m, focus: f, level: l, health: hs }), ids = g.items.map((i) => i.pose);
      const diff = Math.abs(planSeconds(g.items) / 60 - m); worst = Math.max(worst, diff);
      ok(hs.every((h) => HEALTH_HARD[h].every((id) => !ids.includes(id))), `health ${hs} ${m}/${f}/${l}: hard exclusions hold`);
      ok(diff <= 1 && ids.at(-1) === 'savasana', `health ${hs} ${m}/${f}/${l}: keeps its length (${diff.toFixed(2)})`);
    }
  }
  ok(worst <= 1, 'all 63 answer combinations stay within a minute of the target');
  // soft exclusions only come back when the poses left cannot fill the length
  const heavy = generatePlan({ minutes: 30, focus: 'relax', level: 'beginner', health: ['knees', 'wrists', 'back', 'neck', 'pressure', 'pregnancy'] });
  ok(Math.abs(planSeconds(heavy.items) / 60 - 30) <= 1, 'six answers at 30 min relax still reach 30 min');

  // specific mappings the Owner will care about
  const has = (g, id) => g.items.some((i) => i.pose === id);
  const base = (h, extra = {}) => generatePlan({ minutes: 20, focus: 'general', level: 'beginner', health: h, ...extra });
  ok(has(base([], { focus: 'strength' }), 'chair') && has(base([], { focus: 'strength' }), 'low-lunge'), 'baseline strength 20 uses chair and low lunge');
  ok(!has(base(['knees'], { focus: 'strength' }), 'high-lunge') && !has(base(['knees'], { focus: 'strength' }), 'chair') && !has(base(['knees'], { focus: 'strength' }), 'low-lunge'), 'knees: no lunge or chair');
  ok(!has(base(['wrists']), 'downward-dog') && !has(base(['wrists']), 'plank') && !has(base(['wrists']), 'cat-cow') && has(base(['wrists']), 'gentle-flow'), 'wrists: no weight on the hands; seated gentle flow warms up');
  ok(['boat', 'camel', 'locust', 'cobra'].every((id) => !has(base(['back'], { focus: 'strength' }), id)), 'lower back: no boat, camel, locust, cobra');
  ok(['bridge', 'camel', 'cobra', 'locust'].every((id) => !has(base(['neck'], { focus: 'strength' }), id)), 'neck: no bridge or backbends');
  ok(!has(base(['pressure']), 'downward-dog') && !has(base(['pressure']), 'uttanasana') && !has(base(['pressure']), 'legs-up-wall'), 'blood pressure: no head-below-heart poses');
  for (const f of FOCUSES) ok(['cobra', 'locust', 'boat', 'plank', 'bridge', 'supine-twist', 'seated-twist', 'revolved-chair'].every((id) => !has(base(['pregnancy'], { focus: f }), id)), `pregnancy ${f}: no prone, deep-twist, boat or plank poses`);
  // the existing flow gates work through the answers for gentle-intermediate plans too
  const gi = (h) => generatePlan({ minutes: 30, focus: 'general', level: 'gentle', health: h }).items.map((i) => i.pose);
  ok(gi([]).includes('sun-salutation-a'), 'baseline gentle 30 min has Sun Salutation');
  for (const h of ['pregnancy', 'pressure', 'wrists']) ok(!gi([h]).includes('sun-salutation-a'), `${h} gates Sun Salutation`);
  for (const h of ['pregnancy', 'pressure', 'knees']) ok(!gi([h]).includes('warrior-flow'), `${h} gates Warrior Flow`);
  // explicit avoid still merges with the answers
  ok(!base(['knees'], { avoid: ['tree', 'triangle'] }).items.some((i) => ['tree', 'triangle', 'high-lunge'].includes(i.pose)), 'explicit avoid merges with the answers');
  ok(JSON.stringify(base(['knees']).items) === JSON.stringify(base(['knees']).items), 'plans with answers stay deterministic');

  // pose page notes
  ok(flagsForPose('cobra', ['pregnancy']).join() === 'pregnancy' && flagsForPose('cobra', []).length === 0, 'pose note: cobra flagged only for pregnancy');
  ok(flagsForPose('savasana', ['pregnancy']).length === 1 && flagsForPose('savasana', ['knees']).length === 0, 'pose note: savasana flagged for pregnancy only');
  ok(avoidsPose('high-lunge', ['knees', 'wrists']).join() === 'knees', 'avoidsPose names the answer');
  for (const f of HEALTH_FLAGS) for (const id of [...HEALTH_AVOID[f]].filter((x) => POSE_BY_ID[x])) ok(flagsForPose(id, [f]).includes(f) && POSE_BY_ID[id].safety.he.length > 10, `pose ${id} has a note for ${f} and an existing safety line to highlight`);

  // persistence (memory fallback in node; the store guards every localStorage access)
  ok(store.health.flags.length === 0 && store.health.seen === false, 'persistence: starts empty and unseen');
  store.markHealthSeen();
  ok(store.health.seen === true && store.health.flags.length === 0, 'persistence: skipping marks seen with no answers');
  store.saveHealth(['pregnancy', 'knees', 'bogus', 'knees']);
  ok(JSON.stringify(store.health) === '{"flags":["knees","pregnancy"],"seen":true}', 'persistence: saved answers are cleaned and read back');
  store.saveHealth([]);
  ok(store.health.flags.length === 0 && store.health.seen === true, 'persistence: "none" clears the answers');
  // real localStorage round trip, as the browser uses it
  const data = {}; globalThis.localStorage = { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, removeItem: (k) => { delete data[k]; } };
  store.saveHealth(['neck', 'back']);
  ok(data['hyf.health'] === '["back","neck"]' && data['hyf.healthSeen'] === 'true', 'persistence: stored under hyf.health / hyf.healthSeen');
  data['hyf.health'] = '"junk"'; ok(store.health.flags.length === 0, 'persistence: corrupt stored value reads as empty');
  data['hyf.health'] = '{bad json'; ok(Array.isArray(store.health.flags), 'persistence: invalid JSON does not throw');
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  store.saveHealth(['knees']); ok(store.health.flags.join() === 'knees', 'persistence: blocked localStorage falls back to memory');
  delete globalThis.localStorage; store.saveHealth([]);
  // not part of the plan export
  const planSrc = readFileSync(new URL('../js/plan.js', import.meta.url), 'utf8');
  ok(!/health/i.test(planSrc), 'answers are not written into plan export files');

  // strings
  const keys = ['healthTitle', 'healthIntro', 'healthLegend', 'healthNone', 'healthSave', 'healthSkip', 'healthNotMedical', 'healthClinician', 'healthRow', 'healthEdit', 'healthNoneSaved', 'healthSaved', 'healthPersonal', 'healthGenNote'];
  for (const l of L) {
    for (const k of keys) ok(tr(k, l) !== k && tr(k, l).length > 3, `i18n ${k} ${l}`);
    for (const f of HEALTH_FLAGS) ok(tr('healthF', l, f).length > 2 && tr('healthNote', l, f).length > 20, `i18n flag ${f} ${l}`);
    ok(tr('healthGenNote', l).includes('{list}'), `healthGenNote ${l} keeps {list}`);
  }
  ok(tr('healthTitle', 'he') === 'יש משהו שכדאי שנדע?', 'he sheet title is as agreed');
  ok(L.every((l) => /(רופא|врач|clinician)/.test(tr('healthClinician', l))), 'pregnancy/injury line says to ask a clinician in he/ru/en');
  ok(L.every((l) => tr('healthNotMedical', l).length > 10), 'not-medical-advice line in he/ru/en');
  ok(HEALTH_FLAGS.every((f) => L.every((l) => tr('healthNote', l, f) !== f)) && !/(אבחן|diagnos)/i.test(tr('healthNote', 'he', 'knees')), 'notes are calm, not diagnostic');

  // the sheet: real form, labelled checkboxes, focus, Escape and Skip, never forced
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  ok(/el\('dialog', \{ id: 'health-dlg', 'aria-labelledby': 'health-title' \}/.test(app) && /\.showModal\(\)/.test(app), 'sheet is a modal dialog labelled by its title');
  ok(/el\('form', \{ method: 'dialog'/.test(app) && /el\('fieldset'/.test(app) && /el\('legend'/.test(app) && /type: 'checkbox'/.test(app), 'sheet is a real form with a fieldset, legend and checkboxes');
  ok(/el\('label', \{ class: 'chip block', for: inp\.id \}/.test(app), 'every checkbox has a label');
  ok(/title\.focus\(\)/.test(app) && /opener && opener\.isConnected/.test(app), 'focus moves into the sheet and returns to the opener');
  ok(/id: 'health-skip'[^\n]*dlg\.close\(\); finish\(\)/.test(app), 'Skip button closes the sheet');
  ok(/function finish\(\) \{ if \(done\) return; done = true; if \(!store\.health\.seen\) store\.markHealthSeen\(\)/.test(app) && /addEventListener\('close', finish\)/.test(app), 'closing (Escape, Skip or Save) marks it seen without changing answers; no cancel handler blocks Escape');
  ok(!/addEventListener\('cancel'/.test(app.slice(app.indexOf('function openHealthSheet'), app.indexOf('function settingsSection'))), 'Escape is not intercepted');
  ok(/if \(!store\.health\.seen\) setTimeout\(\(\) => \{ if \(parseHash\(\)\.view === 'home' && !document\.querySelector\('dialog\[open\]'\)\)/.test(app), 'auto-opens only on first visit at home, never over another dialog');
  ok(/id: 'health-edit'/.test(app), 'settings has an edit button for the sheet');
  ok(/health: store\.health\.flags/.test(app), 'generator dialog passes the answers to generatePlan');
  ok(/flagsForPose\(p\.id, store\.health\.flags\)/.test(app) && /'note safety' \+ \(hf\.length \? ' hl'/.test(app), 'pose page shows the personal note and highlights the safety line');
  const smoke = readFileSync(new URL('../tools/smoke.sh', import.meta.url), 'utf8');
  ok(/hyf\.healthSeen/.test(smoke), 'smoke marks the sheet as seen so it never blocks');
}
