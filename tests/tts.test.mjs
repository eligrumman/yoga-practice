// TTS pipeline tests: Hebrew-only default, legacy he cue skip is safe (the player never asks for them), generate.py offline unit tests.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { POSES } from '../data/poses.js';
import { POSE_V2 } from '../data/narration-he-v2.js';
import * as NP from '../js/narration-plan.js';
import { segText } from '../data/narration.js';

export default async function (ok) {
  // 1. every pose has v2 Hebrew lines, so the legacy he plan (which uses cue ids) can never run for any pose
  for (const p of POSES) ok(!!POSE_V2[p.id], `tts: ${p.id} has v2 lines`);
  // 2. no Hebrew plan, for any pose/level/side/lvl/hold, ever schedules a legacy cue id
  const dur = (id) => NP.estDur(segText(id, 'he'));
  let cueHits = 0, plans = 0;
  for (const p of POSES) for (const level of ['full', 'short', 'name']) for (const side of [0, 1]) for (const lvl of [0, 1, 2]) for (const hold of [15, 30, 60, 120]) for (const last of [false, true]) {
    const r = NP.slotPlan({ lang: 'he', level, poseId: p.id, side, sides: 2, hold, lvl, dur, announced: false, lastSavasana: last && /savasana/.test(p.id), minutes: 20 });
    plans++; cueHits += r.ids.filter((i) => /\.cue\.\d+$/.test(i)).length;
  }
  ok(plans > 1000 && cueHits === 0, `tts: Hebrew plans never schedule legacy cue ids (${plans} plans, ${cueHits} hits)`);
  // 3. pose intro / name / common.* are still played in Hebrew, so they must NOT be skipped
  const full = NP.slotPlan({ lang: 'he', level: 'full', poseId: 'tree', side: 0, sides: 2, hold: 60, lvl: 0, dur, announced: false, lastSavasana: false, minutes: 20 });
  ok(full.ids.includes('pose.tree.intro'), 'tts: he plan uses pose.<id>.intro (kept)');
  ok(/common\.next/.test(readFileSync(new URL('../js/player.js', import.meta.url), 'utf8')) && /\.name`/.test(readFileSync(new URL('../js/player.js', import.meta.url), 'utf8')), 'tts: player says common.next + pose name (kept)');
  // 4. generate.py: default language, unused skip, batching, silence split (offline python unit tests)
  const r = spawnSync('python3', ['tools/tts/test_generate.py'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
  ok(r.status === 0, `tts: python unit tests pass ${r.status === 0 ? '' : (r.stderr || r.stdout).slice(-600)}`);
  const src = readFileSync(new URL('../tools/tts/generate.py', import.meta.url), 'utf8');
  ok(/DEFAULT_LANGS = 'he'/.test(src), 'tts: default language is he only');
  const sh = readFileSync(new URL('../tools/tts/run-daily.sh', import.meta.url), 'utf8');
  ok(/generate\.py --lang he /.test(sh) && /--max-calls 90/.test(sh), 'tts: run-daily.sh passes --lang he');
}
