import HE from './poses.he.js';
import fs from 'fs';
import { INTRO, CLOSE, INTRO_VARIANTS, CLOSE_VARIANTS } from './session.he.js';
import { POSES } from '/Users/user/agents/yoga/data/poses.js';
const D = Object.fromEntries(Object.entries(HE).map(([k, v]) => [k, { he: v }]));
const BEGINNER_EXTRA = new Set(['chair','warrior-1','warrior-2','downward-dog','supine-twist','happy-baby','seated-twist','figure-four','high-lunge']);
const words = (t) => t.trim().split(/\s+/).length;
const secs = (t) => 2.3 + 0.65 * words(t);      // fit to existing he/*.mp3: clip = 2.3 s overhead + 0.65 s/word
const poseSegs = {}; const out = {}; const errs = [];
for (const p of POSES) {
  const d = D[p.id]?.he; if (!d) { errs.push('missing ' + p.id); continue; }
  if ((p.sides === 'both') !== !!d.side) errs.push('side mismatch ' + p.id);
  const s = [];
  d.entry.forEach((t, i) => s.push([`pose.${p.id}.entry.${i + 1}`, t]));
  d.align.forEach((t, i) => s.push([`pose.${p.id}.align.${i + 1}`, t]));
  s.push([`pose.${p.id}.breath`, d.breath]);
  d.mod.forEach((t, i) => s.push([`pose.${p.id}.mod.L${i}`, t]));
  s.push([`pose.${p.id}.exit`, d.exit]);
  if (d.side) s.push([`pose.${p.id}.side`, d.side]);
  poseSegs[p.id] = s;
  out[p.id] = { entry: d.entry, align: d.align, breath: d.breath, mod: d.mod, exit: d.exit, ...(d.side ? { side: d.side } : {}) };
}
// existing he cue texts (to detect reuse of already-defined text)
const oldTexts = new Set(POSES.flatMap((p) => p.cues.he));
const lat = /[A-Za-z]/;
const all = [];
for (const [id, t] of Object.values(INTRO).map((x) => [x.id, x.he])) all.push([id, t, 'intro']);
for (const [id, t] of Object.values(CLOSE).map((x) => [x.id, x.he])) all.push([id, t, 'close']);
for (const p of POSES) for (const [id, t] of poseSegs[p.id] || []) all.push([id, t, (p.difficulty === 1 || BEGINNER_EXTRA.has(p.id)) ? 'beginner' : 'rest']);
for (const [id, t] of all) if (lat.test(t) || /\d/.test(t)) errs.push('latin/digit ' + id);
const dup = all.length - new Set(all.map((a) => a[0])).size; if (dup) errs.push('dup ids ' + dup);
const tier = {}; for (const [id, t, k] of all) { tier[k] ??= { segs: 0, reuse: 0, new: 0 }; tier[k].segs++; if (oldTexts.has(t)) tier[k].reuse++; else tier[k].new++; }
console.log('ERRORS', errs);
console.log('TIERS (he)', JSON.stringify(tier), 'total segs', all.length);
// variants
const vs = (V, S) => Object.entries(V).map(([n, v]) => { const sp = v.keys.reduce((a, k) => a + secs(S[k].he), 0); const pa = v.keys.reduce((a, k) => a + S[k].pauseAfter, 0); const w = v.keys.reduce((a, k) => a + words(S[k].he), 0); return `${n} (${v.forMinutes} min): ${v.keys.length} clips, ${w} words, speech ${sp.toFixed(0)}s (+pauses ${pa}s = ${(sp + pa).toFixed(0)}s)`; });
console.log(vs(INTRO_VARIANTS, INTRO).join('\n')); console.log(vs(CLOSE_VARIANTS, CLOSE).join('\n'));
// per pose per level seconds
const L = (p, lvl) => {
  const g = poseSegs[p.id]; const pick = (re) => g.filter(([id]) => re.test(id)).map((x) => x[1]);
  const name = 3.6; // existing common.next + name clips are separate; the name clip ~3.5 s
  const entry = pick(/\.entry\./), align = pick(/\.align\./), breath = pick(/\.breath$/), mod = g.filter(([id]) => id.endsWith('.mod.L0')).length ? [] : [];
  return { entry, align, breath };
};
const rows = [];
for (const p of POSES) {
  const g = poseSegs[p.id]; const get = (re) => g.filter(([id]) => re.test(id)).map((x) => x[1]);
  const entry = get(/\.entry\./), align = get(/\.align\./), br = get(/\.breath$/), exit = get(/\.exit$/), side = get(/\.side$/);
  const W = (a) => a.reduce((s, t) => s + words(t), 0), S = (a) => a.reduce((s, t) => s + secs(t), 0);
  const mod = (l) => get(new RegExp(`\\.mod\\.L${l}$`));
  const fullW = (l) => W(entry) + W(align) + W(br) + W(mod(l)) + W(exit);
  const fullS = (l) => S(entry) + S(align) + S(br) + S(mod(l)) + S(exit);
  const shortW = W(entry.slice(0, 1)) + W(br), shortS = S(entry.slice(0, 1)) + S(br);
  rows.push(`| ${p.id} | ${p.holdSeconds} | ${p.sides === 'both' ? 'כן' : ''} | ${p.difficulty === 1 || BEGINNER_EXTRA.has(p.id) ? 'B' : ''} | ${fullW(0)}/${fullS(0).toFixed(0)} | ${fullW(1)}/${fullS(1).toFixed(0)} | ${fullW(2)}/${fullS(2).toFixed(0)} | ${shortW}/${shortS.toFixed(0)} | ${side.length ? W(side) + '/' + S(side).toFixed(0) : '-'} |`);
}
fs.writeFileSync('./poses-table.md', '| pose | hold s | two-sided | beginner | full L0 words/s | full L1 | full L2 | short words/s | side-line words/s |\n|---|---|---|---|---|---|---|---|---|\n' + rows.join('\n') + '\n');
fs.writeFileSync('./narration-v2.he.json', JSON.stringify({ lang: 'he', note: 'DRAFT-needs-review. Hebrew only (Owner scope 2026-11-13). en/ru intentionally absent.', intro: INTRO, close: CLOSE, introVariants: INTRO_VARIANTS, closeVariants: CLOSE_VARIANTS, poses: out }, null, 1));
fs.writeFileSync('./segments.he.json', JSON.stringify(all.map(([id, he, tier]) => ({ id, he, tier, words: words(he), secs: +secs(he).toFixed(1), reusesExistingCueText: oldTexts.has(he) })), null, 1));
console.log('rows', rows.length);
