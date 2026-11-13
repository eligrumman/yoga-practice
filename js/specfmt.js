// Canonical text format of poses/<id>.json (one joint per line, so diffs and hand edits stay readable).
// Used by tools/migrate-poses.mjs and by the tuner's Export button.
import { JOINTS } from './rig.js';

const num = (v) => String(Math.round(v * 10) / 10);
const arr = (a) => `[${a.map(num).join(', ')}]`;
const pelvis = (p) => `{ "pos": ${arr(p.pos)}, "rot": ${arr(p.rot)} }`;

function frameText(f, ind, partial) {
  const pad = ' '.repeat(ind);
  const lines = [];
  if (f.pelvis && (!partial || f.pelvis.pos || f.pelvis.rot)) lines.push(`${pad}"pelvis": ${f.pelvis.pos && f.pelvis.rot ? pelvis(f.pelvis) : JSON.stringify(f.pelvis)}`);
  for (const j of JOINTS) if (j !== 'pelvis' && f[j]) lines.push(`${pad}"${j}": ${arr(f[j])}`);
  return '{\n' + lines.join(',\n') + '\n' + ' '.repeat(ind - 2) + '}';
}

// spec: { id, format, camera, start, levels: [{level, camera?, hold, alt?, props}] }
export function serializeSpec(o) {
  let s = '{\n';
  s += `  "id": ${JSON.stringify(o.id)},\n  "format": 1,\n  "camera": ${JSON.stringify(o.camera)},\n`;
  s += `  "start": ${frameText(o.start, 4)},\n  "levels": [\n`;
  s += o.levels.map((l, i) => {
    let t = `    {\n      "level": ${l.level ?? i},\n`;
    if (l.camera) t += `      "camera": ${JSON.stringify(l.camera)},\n`;
    t += `      "hold": ${frameText(l.hold, 8)},\n`;
    if (l.alt) t += `      "alt": ${frameText(l.alt, 8, true)},\n`;
    t += `      "props": ${JSON.stringify(l.props || [])}\n    }`;
    return t;
  }).join(',\n');
  return s + '\n  ]\n}\n';
}
