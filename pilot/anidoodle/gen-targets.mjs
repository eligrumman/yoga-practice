// Reads our pose specs (poses/<id>.json, level 1 = the middle level), runs OUR rig (js/rig.js solve)
// and writes the world joint positions (our convention: x forward, y up, z toward camera, cm).
import { readFileSync, writeFileSync } from 'node:fs';
import { solve, fullFrame } from '../../js/rig.js';
const out = {};
for (const id of ['warrior-2', 'downward-dog', 'tree']) {
  const spec = JSON.parse(readFileSync(new URL(`../../poses/${id}.json`, import.meta.url)));
  const L = spec.levels[1];
  const r = solve(fullFrame(L.hold));
  const J = {};
  for (const [k, v] of Object.entries(r.J)) J[k] = v.map((x) => Math.round(x * 100) / 100);
  out[id] = { camera: L.camera || spec.camera, J, frame: L.hold, props: L.props || [] };
}
writeFileSync(new URL('./targets.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(Object.keys(out), Object.keys(out.tree.J).join(' '));
