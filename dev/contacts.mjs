// usage: node dev/contacts.mjs [pose-id]  -> which body points touch the floor (clearance<=3) per level
import { POSES } from '../data/poses.js';
import { poseFrames, geometry, bottom } from '../js/figure.js';
const only = process.argv[2];
for (const p of POSES) {
  if (only && p.id !== only) continue;
  for (const l of [0, 1, 2]) {
    const g = geometry(poseFrames(p, l).frame), b = bottom(g);
    const c = [];
    const pt = (n, q, r) => { const cl = b - q[1] - r; if (cl <= 3) c.push(n); else if (cl <= 12) c.push(`~${n}(${cl.toFixed(0)})`); };
    pt('hip', g.P, 13); pt('mid', g.M, 13); pt('sh', g.S, 13); pt('head', g.head, 12);
    for (const k of ['l', 'm']) { pt(k + 'knee', g[k][1], 8); pt(k + 'ank', g[k][2], 7); pt(k + 'toe', g[k][3], 4); }
    for (const k of ['a', 'b']) { pt(k + 'elb', g[k][1], 5.5); pt(k + 'hand', g[k][2], 5); }
    console.log(`${p.id} L${l}: ${c.join(' ')}`);
  }
}
