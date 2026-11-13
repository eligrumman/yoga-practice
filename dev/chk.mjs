// usage: node dev/chk.mjs pose-id [level]  -> joint heights above floor (up positive) and x offsets
import { POSES } from '../data/poses.js';
import { poseFrames, geometry, bottom } from '../js/figure.js';
const [id, lv] = process.argv.slice(2);
const p = POSES.find((x) => x.id === id);
for (const l of lv ? [+lv] : [0, 1, 2]) {
  const g = geometry(poseFrames(p, l).frame), b = bottom(g);
  const f = (q) => `(${q[0].toFixed(0)},${(b - q[1]).toFixed(0)})`;
  console.log(`${id} L${l}: P${f(g.P)} M${f(g.M)} S${f(g.S)} head${f(g.head)} a:${g.a.map(f)} b:${g.b.map(f)} l:${g.l.map(f)} m:${g.m.map(f)}`);
}
