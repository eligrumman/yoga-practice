// Fits anidoodle's human skeleton (character/human/skeleton.ts) to OUR pose: for every bone, the
// direction of the bone in our rig (js/rig.js, via targets.json) is matched by the same bone in
// anidoodle's rig. The two rigs use different joint parameterisations (ours: per-joint XYZ Euler,
// theirs: shoulderRaise/Swing/Twist, hipFlex/Abd/Rot, ...) and different bone proportions, so there
// is no closed-form conversion; this is a numeric retarget. Output: fitted.json (their Pose per
// pose id) and a residual report.
// Contains code imported from anidoodle (Apache-2.0, (c) 2026 Alex Greenshpun); see ../NOTICE.
import { CANON } from "@ani/character/human/canon";
import { JOINT_NAMES, LIMITS, dimsFromCanon, fk, limitViolations } from "@ani/character/human/skeleton";
import type { Pose } from "@ani/character/types";
import { writeFileSync } from "node:fs";
import targets from "../targets.json";

type V = [number, number, number];
// our world (x fwd, y up, z toward camera, right side +z) -> theirs (+x her left, y up, +z forward)
const T = (p: number[]): V => [-p[2], p[1], p[0]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm = (a: V): V => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const dims = dimsFromCanon(CANON.adult, 1.7);
// bones: [name, our A, our B, their A, their B, weight]
const BONES: [string, string, string, string, string, number][] = [
  ["torso", "pelvis", "spine3", "pelvis", "neck", 2],
  ["neck", "spine3", "neckTop", "neck", "head", 1],
  ["head", "neckTop", "head", "head", "crown", 0.6],
  ["shoulderLine", "shoulderR", "shoulderL", "shoulderR", "shoulderL", 1],
  ["hipLine", "hipR", "hipL", "hipR", "hipL", 1],
  ...(["L", "R"] as const).flatMap((s) => [
    ["upperArm" + s, "shoulder" + s, "elbow" + s, "shoulder" + s, "elbow" + s, 1.5],
    ["forearm" + s, "elbow" + s, "wrist" + s, "elbow" + s, "wrist" + s, 1.5],
    ["thigh" + s, "hip" + s, "knee" + s, "hip" + s, "knee" + s, 1.5],
    ["shin" + s, "knee" + s, "ankle" + s, "knee" + s, "ankle" + s, 1.5],
    ["foot" + s, "ankle" + s, "toe" + s, "ankle" + s, "toeTip" + s, 1],
  ] as [string, string, string, string, string, number][]),
];
// which of their joints exist in rig.joints
const free = JOINT_NAMES.filter((j) => !/^(pelvisSide|clav|pronation|wrist|toe|headTilt|headNod)/.test(j));
const base = (j: string) => (/[LR]$/.test(j) && LIMITS[j.slice(0, -1)] ? j.slice(0, -1) : j);
const lim = (j: string) => LIMITS[base(j)];

type State = { yaw: number; pitch: number; roll: number; j: Record<string, number> };
const mkPose = (s: State): Pose => ({ root: [0, 0, 0], yaw: s.yaw, pitch: s.pitch, roll: s.roll, joints: s.j, expression: {}, plant: true });

const loss = (s: State, goal: Record<string, V>) => {
  const bad = limitViolations(s.j).length;
  const rig = fk(dims, mkPose(s));
  let L = bad * 5;
  for (const [n, , , a, b, w] of BONES) { const d = nrm(sub(rig.joints[b] as V, rig.joints[a] as V)); L += w * (1 - dot(d, goal[n])); }
  return L;
};

const fit = (id: string) => {
  const t = (targets as any)[id], J = t.J as Record<string, number[]>;
  const goal: Record<string, V> = {};
  for (const [n, a, b] of BONES) goal[n] = nrm(sub(T(J[b]), T(J[a])));
  let best: { s: State; L: number } | null = null;
  const yaws = [0, 90, 180, 270], pitches = [-90, 0, 90], rolls = [-90, 0, 90];
  for (const yaw of yaws) for (const pitch of pitches) for (const roll of rolls) {
    const s: State = { yaw, pitch, roll, j: {} };
    for (const j of free) s.j[j] = Math.max(lim(j)[0], Math.min(lim(j)[1], 0));
    let L = loss(s, goal);
    for (let step = 40; step > 0.2; step *= 0.6) {
      for (let sweep = 0; sweep < 6; sweep++) {
        let moved = false;
        const tryMove = (apply: (d: number) => void, undo: () => void) => {
          for (const d of [step, -step]) { apply(d); const l2 = loss(s, goal); if (l2 < L - 1e-9) { L = l2; moved = true; return; } undo(); }
        };
        for (const k of ["yaw", "pitch", "roll"] as const) { const o = s[k]; tryMove((d) => (s[k] = o + d), () => (s[k] = o)); }
        for (const j of free) { const o = s.j[j], [lo, hi] = lim(j); tryMove((d) => (s.j[j] = Math.max(lo, Math.min(hi, o + d))), () => (s.j[j] = o)); }
        if (!moved) break;
      }
    }
    if (!best || L < best.L) best = { s: JSON.parse(JSON.stringify(s)), L };
  }
  const s = best!.s, rig = fk(dims, mkPose(s));
  const err: Record<string, number> = {};
  for (const [n, , , a, b] of BONES) err[n] = Math.round((Math.acos(Math.min(1, dot(nrm(sub(rig.joints[b] as V, rig.joints[a] as V)), goal[n]))) * 180) / Math.PI * 10) / 10;
  return { pose: mkPose(s), loss: best!.L, errDeg: err, violations: limitViolations(s.j) };
};

const out: Record<string, unknown> = {};
for (const id of Object.keys(targets)) {
  const r = fit(id);
  out[id] = r;
  console.log(id, "loss", r.loss.toFixed(4), "violations", r.violations.length, "\n  err deg", JSON.stringify(r.errDeg));
}
writeFileSync(new URL("../fitted.json", import.meta.url).pathname.replace("/src/../", "/"), JSON.stringify(out, null, 1));
