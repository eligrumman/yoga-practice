// Static narration coverage: every Hebrew narration id any plan/player path can request, checked against
// audio/manifest.json, the file on disk (ffprobe: decodes, duration > 0) and optionally the live site (HTTP 200).
// Library: import { collectHeIds, checkDisk } ; CLI: node tools/audio-coverage.mjs [--live URL] [--ffprobe] [--json out.json]
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { POSES } from '../data/poses.js';
import { PRESETS, STARTER_PATH, ALL_PRESETS } from '../data/plans-preset.js';
import { generatePlan, FOCUSES, LENGTHS, GEN_LEVELS } from '../js/generator.js';
import { HEALTH_FLAGS, isSavasana } from '../js/health.js';
import { slots } from '../js/plan.js';
import { slotPlan, introSeq, sessionIds, estDur, NARR_LEVELS } from '../js/narration-plan.js';
import { segText } from '../data/narration.js';
import { attachSpecs } from '../js/specs.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANG = 'he';

// Every id the Hebrew player can ask the narrator to say.
export async function collectHeIds() {
  await attachSpecs(POSES);
  const ids = new Map(); // id -> Set(source)
  const add = (id, src) => { if (!ids.has(id)) ids.set(id, new Set()); ids.get(id).add(src); };
  const dur = (id) => estDur(segText(id, LANG));
  // player-level fixed ids
  for (const id of ['common.welcome', 'common.halfway', 'common.next', 'common.switch_sides', 'common.savasana_end', 'common.finish', 'common.breathe_slow']) add(id, 'player');
  for (const id of sessionIds()) add(id, 'session');
  for (const level of ['full', 'short']) for (const minutes of [5, 10, 12, 13, 20, 24, 25, 30, 45]) for (const x of introSeq({ lang: LANG, level, minutes })) add(x.id, `intro:${level}`);
  // per-pose plan ids over every level/side/hold combination (superset of what any plan can need)
  const holds = [5, 8, 10, 15, 20, 25, 30, 40, 45, 60, 90, 120, 180, 300, 600];
  for (const p of POSES) {
    add(`pose.${p.id}.name`, 'next-announce');
    for (const level of NARR_LEVELS) for (const lvl of [0, 1, 2]) for (const side of [0, 1]) for (const announced of [false, true])
      for (const lastSavasana of (isSavasana(p.id) ? [false, true] : [false])) for (const minutes of [10, 20, 30]) for (const hold of holds) {
        const r = slotPlan({ lang: LANG, level, poseId: p.id, side, sides: p.sides === 'both' ? 2 : 1, hold, lvl, dur, announced, lastSavasana, minutes });
        for (const id of r.ids) add(id, `slot:${p.id}`);
      }
  }
  // ids reached through real plans: generated (length x focus x level x every health subset), presets, starter days
  const plans = [];
  const subsets = []; for (let m = 0; m < 1 << HEALTH_FLAGS.length; m++) subsets.push(HEALTH_FLAGS.filter((_, i) => m & (1 << i)));
  for (const minutes of LENGTHS) for (const focus of FOCUSES) for (const level of GEN_LEVELS) for (const health of subsets) plans.push([`gen:${minutes}/${focus}/${level}/${health.join('+') || 'none'}`, generatePlan({ minutes, focus, level, health })]);
  for (const p of [...PRESETS, ...STARTER_PATH, ...ALL_PRESETS]) plans.push([`preset:${p.id}`, p]);
  const poseSeen = new Set();
  for (const [src, plan] of plans) {
    const mins = Math.max(1, Math.round(plan.minutes || 20));
    const list = slots(plan.items);
    list.forEach((s, i) => {
      const last = i === list.length - 1;
      for (const level of ['full', 'short', 'name']) {
        const hold = Math.max(5, s.hold);
        const r = slotPlan({ lang: LANG, level, poseId: s.pose.id, side: s.side, sides: s.sides, hold, lvl: s.level, dur, announced: false, lastSavasana: isSavasana(s.pose.id) && last, minutes: mins });
        for (const id of r.ids) add(id, src);
      }
      const n = list[i + 1]; if (n) add(`pose.${n.pose.id}.name`, src);
      poseSeen.add(s.pose.id);
    });
  }
  return { ids, plans: plans.length, poses: poseSeen.size };
}

export const manifestSet = () => new Set(JSON.parse(readFileSync(join(ROOT, 'audio/manifest.json'), 'utf8')));
export const filePath = (id) => join(ROOT, 'audio', LANG, `${id}.mp3`);

export function ffprobeDuration(path) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path], { encoding: 'utf8' });
  return r.status === 0 ? parseFloat(String(r.stdout).trim()) : NaN;
}

// Returns {missingManifest, missingFile, emptyFile, undecodable, noText, total}
export function checkDisk(ids, { probe = false } = {}) {
  const man = manifestSet();
  const out = { total: ids.length, missingManifest: [], missingFile: [], emptyFile: [], undecodable: [], noText: [] };
  for (const id of ids) {
    if (!segText(id, LANG)) out.noText.push(id);
    if (!man.has(`${LANG}/${id}`)) out.missingManifest.push(id);
    const f = filePath(id);
    if (!existsSync(f)) { out.missingFile.push(id); continue; }
    if (statSync(f).size < 1000) { out.emptyFile.push(id); continue; }
    if (probe) { const d = ffprobeDuration(f); if (!(d > 0)) out.undecodable.push(id); }
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const { ids, plans, poses } = await collectHeIds();
  const list = [...ids.keys()].sort();
  console.log(`plans enumerated: ${plans}, poses seen in plans: ${poses}, distinct he ids requestable: ${list.length}`);
  const r = checkDisk(list, { probe: args.includes('--ffprobe') });
  const live = arg('--live'); r.liveNon200 = [];
  if (live) {
    const base = live.replace(/\/?$/, '/');
    let n = 0;
    const q = list.slice();
    await Promise.all(Array.from({ length: 12 }, async () => {
      while (q.length) {
        const id = q.shift();
        try { const res = await fetch(`${base}audio/he/${id}.mp3?c=${Date.now()}`, { method: 'HEAD' }); n++; if (res.status !== 200) r.liveNon200.push(`${id} -> ${res.status}`); } catch (e) { r.liveNon200.push(`${id} -> ${e.message}`); }
      }
    }));
    console.log(`live HEAD checks: ${n}`);
  }
  for (const [k, v] of Object.entries(r)) if (Array.isArray(v)) console.log(`${k}: ${v.length}${v.length ? '\n  ' + v.slice(0, 80).join('\n  ') : ''}`);
  const missing = new Set([...r.missingManifest, ...r.missingFile]);
  if (arg('--json')) writeFileSync(arg('--json'), JSON.stringify({ plans, poses, requestable: list.length, ...r, sources: Object.fromEntries([...missing].map((i) => [i, [...ids.get(i)].slice(0, 5)])) }, null, 1));
  const bad = r.missingManifest.length + r.missingFile.length + r.emptyFile.length + r.undecodable.length + r.liveNon200.length + r.noText.length;
  console.log(bad ? 'COVERAGE: FAIL' : 'COVERAGE: OK');
  process.exit(bad ? 1 : 0);
}
