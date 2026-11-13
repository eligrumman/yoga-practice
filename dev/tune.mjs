// usage: node dev/tune.mjs '<kf json merged over neutral>'  -> contacts + joints
import { resolve, geometry, bottom } from '../js/figure.js';
const kf = JSON.parse(process.argv[2]);
const f = resolve(kf), g = geometry(f), b = bottom(g);
const F = (q) => `(${q[0].toFixed(0)},${(b - q[1]).toFixed(0)})`;
const c = [];
const pt = (n, q, r) => { const cl = b - q[1] - r; if (cl <= 3) c.push(n); else if (cl <= 12) c.push(`~${n}(${cl.toFixed(0)})`); };
pt('hip', g.P, 13); pt('mid', g.M, 13); pt('sh', g.S, 13); pt('head', g.head, 12);
for (const k of ['l', 'm']) { pt(k + 'knee', g[k][1], 8); pt(k + 'ank', g[k][2], 7); pt(k + 'toe', g[k][3], 4); }
for (const k of ['a', 'b']) { pt(k + 'elb', g[k][1], 5.5); pt(k + 'hand', g[k][2], 5); }
console.log('touch:', c.join(' '));
console.log(`P${F(g.P)} M${F(g.M)} S${F(g.S)} head${F(g.head)} a:${g.a.map(F)} l:${g.l.map(F)} m:${g.m.map(F)}`);
console.log('resolved', JSON.stringify(f));
