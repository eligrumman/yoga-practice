/*! Bundle includes code from anidoodle (https://github.com/alexgreensh/anidoodle),
 Copyright 2026 Alex Greenshpun, licensed under the Apache License 2.0 (see LICENSE and NOTICE next to this file).
 Modifications: bundled with a pilot entry point; engine sources otherwise unchanged. */

// ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/human/canon.ts
var CANON = {
  // The average adult, 7.5 heads: crotch at half height, elbow at the waist, wrist at the crotch,
  // hand = face, foot = forearm.
  adult: {
    id: "adult",
    label: "Adult, realistic (7.5 heads)",
    age: 30,
    stylised: false,
    note: "Hogarth / Loomis average adult",
    heads: 7.5,
    eyeLine: 0.5,
    root: 4.12,
    hip: 3.9,
    knee: 2.1,
    ankle: 0.36,
    lumbar: 4.5,
    chest: 5,
    neckBase: 6.24,
    pivot: 6.74,
    shoulder: 6.12,
    hipX: 0.42,
    shoulderX: 0.76,
    upperArm: 1.42,
    forearm: 1.12,
    hand: 0.8,
    foot: 1.1,
    heel: 0.24,
    build: 0.5
  },
  // A nine-year-old is about 6.2 heads in life. Storybook enlarges the head (the reader looks at
  // the face) so the same child reads 5.2 heads tall. Limb ratios below the neck are the real
  // child's, rescaled: legs are 46% of height, not the adult 50%.
  storybookChild: {
    id: "storybookChild",
    label: "Child 9 y, storybook (5.2 heads, declared stylisation of 6.2)",
    age: 9,
    stylised: true,
    note: "head enlarged 1.19x over the age-9 canon; body ratios kept",
    heads: 5.2,
    eyeLine: 0.44,
    root: 2.72,
    hip: 2.62,
    knee: 1.42,
    ankle: 0.22,
    lumbar: 2.9,
    chest: 3.12,
    neckBase: 3.98,
    pivot: 4.44,
    shoulder: 3.9,
    hipX: 0.28,
    shoulderX: 0.6,
    upperArm: 0.9,
    forearm: 0.72,
    hand: 0.5,
    foot: 0.72,
    heel: 0.15,
    build: 0.35
  }
};

// ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/math3.ts
var DEG = Math.PI / 180;
var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
var cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var len = (a) => Math.hypot(a[0], a[1], a[2]);
var norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
var I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
var mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
var mm = (a, b) => {
  const o = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
};
var rx = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
var ry = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};
var rz = (a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};
var rotAxis = (axis, a) => {
  const [x, y, z] = norm(axis), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
};
var apply = (f, local) => add(f.p, mv(f.R, local));
var LAT = 7;
var LON = 14;
var UNIT = (() => {
  const o = [];
  for (let i = 0; i <= LAT; i++) {
    const ph = -Math.PI / 2 + i / LAT * Math.PI;
    const n = i === 0 || i === LAT ? 1 : LON;
    for (let j = 0; j < n; j++) {
      const th = j / n * Math.PI * 2;
      o.push([Math.cos(ph) * Math.cos(th), Math.sin(ph), Math.cos(ph) * Math.sin(th)]);
    }
  }
  return o;
})();

// ../../../../../../../.claude/jobs/618456c6/tmp/anidoodle-src/skills/anidoodle/engine/src/canvas-core/character/human/skeleton.ts
var SIDES = ["L", "R"];
var sgn = (s) => s === "L" ? 1 : -1;
var LIMITS = {
  pelvisTilt: [-20, 30],
  pelvisSide: [-15, 15],
  pelvisTwist: [-40, 40],
  spineBend: [-30, 70],
  spineSide: [-35, 35],
  spineTwist: [-45, 45],
  neckBend: [-40, 45],
  neckSide: [-35, 35],
  neckTwist: [-60, 60],
  headNod: [-30, 30],
  headTilt: [-20, 20],
  headTurn: [-30, 30],
  clavLift: [-10, 30],
  clavFwd: [-15, 25],
  shoulderRaise: [0, 180],
  shoulderSwing: [-90, 140],
  shoulderTwist: [-90, 90],
  elbow: [0, 150],
  pronation: [-90, 90],
  wristFlex: [-70, 80],
  wristDev: [-25, 35],
  hipFlex: [-20, 125],
  hipAbd: [-25, 45],
  hipRot: [-40, 45],
  knee: [0, 140],
  ankle: [-45, 25],
  toe: [0, 60]
};
var JOINT_NAMES = [
  "pelvisTilt",
  "pelvisSide",
  "pelvisTwist",
  "spineBend",
  "spineSide",
  "spineTwist",
  "neckBend",
  "neckSide",
  "neckTwist",
  "headNod",
  "headTilt",
  "headTurn",
  ...["clavLift", "clavFwd", "shoulderRaise", "shoulderSwing", "shoulderTwist", "elbow", "pronation", "wristFlex", "wristDev", "hipFlex", "hipAbd", "hipRot", "knee", "ankle", "toe"].flatMap((j) => [j + "L", j + "R"])
];
var baseName = (j) => /[LR]$/.test(j) && LIMITS[j.slice(0, -1)] ? j.slice(0, -1) : j;
var limitViolations = (j) => {
  const out2 = [];
  for (const [k, v] of Object.entries(j)) {
    const b = baseName(k), L = LIMITS[b];
    if (!L) {
      out2.push(`unknown joint '${k}'`);
      continue;
    }
    if (!Number.isFinite(v)) out2.push(`${k} is not a number`);
    else if (v < L[0] - 1e-6 || v > L[1] + 1e-6) out2.push(`${k} = ${v.toFixed(1)} outside ${L[0]}..${L[1]}`);
  }
  const g = (k) => j[k] ?? 0;
  for (const s of ["L", "R"]) {
    const f = g("wristFlex" + s), d = g("wristDev" + s), lf = f >= 0 ? 80 : 70, ld = d >= 0 ? 35 : 25;
    if ((f / lf) ** 2 + (d / ld) ** 2 > 1.0001) out2.push(`wrist${s} cone: flex ${f} with deviation ${d} exceeds the wrist ellipse`);
    const r = g("shoulderRaise" + s), w = g("shoulderSwing" + s);
    if (w < 0 && r * Math.sin(-w * DEG) > 62) out2.push(`shoulder${s} cone: ${(r * Math.sin(-w * DEG)).toFixed(0)} deg of extension behind the body (max ~60)`);
    if (w > 90 && r * Math.sin((w - 90) * DEG) > 55) out2.push(`shoulder${s} cone: ${(r * Math.sin((w - 90) * DEG)).toFixed(0)} deg of cross-body adduction (max ~50)`);
    if (g("knee" + s) < 20 && g("hipFlex" + s) > 95) out2.push(`hip${s}: flexion ${g("hipFlex" + s)} with a straight knee (hamstrings stop a straight leg near 90)`);
  }
  const nb = g("neckBend") + g("headNod"), ns = g("neckSide") + g("headTilt"), nt = g("neckTwist") + g("headTurn");
  if ((nb / (nb >= 0 ? 60 : 55)) ** 2 + (ns / 45) ** 2 > 1.0001) out2.push(`neck cone: bend ${nb} with side ${ns} exceeds the cervical ellipse`);
  if (Math.abs(nt) > 80) out2.push(`neck: total head rotation ${nt} (max ~80)`);
  return out2;
};
var dimsFromCanon = (c, heightM) => {
  const hh = heightM / c.heads, k = (v) => v * hh;
  return {
    hh,
    height: heightM,
    root: k(c.root),
    hipDrop: k(c.root - c.hip),
    hipX: k(c.hipX),
    thigh: k(c.hip - c.knee),
    shin: k(c.knee - c.ankle),
    ankleH: k(c.ankle),
    heel: k(c.heel),
    toe: k(c.foot - c.heel),
    ball: k((c.foot - c.heel) * 0.72),
    lumbar: k(c.lumbar - c.root),
    chest: k(c.chest - c.lumbar),
    neckBase: k(c.neckBase - c.chest),
    neckBaseZ: -k(0.1),
    neck: k(c.pivot - c.neckBase),
    pivotToChin: k(c.pivot - (c.heads - 1)),
    shoulderX: k(c.shoulderX),
    shoulderY: k(c.shoulder - c.chest),
    upperArm: k(c.upperArm),
    forearm: k(c.forearm),
    hand: k(c.hand)
  };
};
var child = (f, off, R = I3) => ({ p: apply(f, off), R: mm(f.R, R) });
var flexFwd = (a) => rx(a * DEG);
var sideTo = (a) => rz(-a * DEG);
var twist = (a) => ry(a * DEG);
var fk = (dims2, pose) => {
  const j = pose.joints, g = (k) => j[k] ?? 0, d = dims2;
  const body = mm(ry(pose.yaw * DEG), mm(rx((pose.pitch ?? 0) * DEG), rz(-(pose.roll ?? 0) * DEG)));
  const pelvis = { p: pose.root, R: mm(body, mm(twist(g("pelvisTwist")), mm(flexFwd(g("pelvisTilt")), sideTo(g("pelvisSide"))))) };
  const spine = (k) => mm(twist(g("spineTwist") * k), mm(flexFwd(g("spineBend") * k), sideTo(g("spineSide") * k)));
  const lumbar = child(pelvis, [0, d.lumbar, -0.01 * d.hh], spine(0.5));
  const chest = child(lumbar, [0, d.chest, 0], spine(0.5));
  const neck = child(chest, [0, d.neckBase, d.neckBaseZ], mm(twist(g("neckTwist")), mm(flexFwd(g("neckBend") + 12), sideTo(g("neckSide")))));
  const head = child(neck, [0, d.neck, 0], mm(twist(g("headTurn")), mm(flexFwd(g("headNod") - 12), sideTo(g("headTilt")))));
  const rig = { dims: dims2, j, pelvis, lumbar, chest, neck, head, shoulder: {}, upper: {}, fore: {}, hand: {}, hip: {}, thigh: {}, shin: {}, foot: {}, toes: {}, joints: {} };
  for (const s of SIDES) {
    const k = sgn(s), G = (n) => g(n + s);
    const sh = child(chest, [k * d.shoulderX, d.shoulderY + Math.sin(G("clavLift") * DEG) * d.shoulderX * 0.55, -0.02 * d.hh + Math.sin(G("clavFwd") * DEG) * d.shoulderX * 0.5]);
    const out2 = [k, 0, 0], fwd = [0, 0, 1], down = [0, -1, 0], w = G("shoulderSwing") * DEG;
    const h = norm(add(out2.map((v) => v * Math.cos(w)), fwd.map((v) => v * Math.sin(w))));
    const Rr = rotAxis(cross(down, h), G("shoulderRaise") * DEG), dir = mv(Rr, down);
    const Rup = mm(rotAxis(dir, -k * G("shoulderTwist") * DEG), Rr);
    const upper = { p: sh.p, R: mm(chest.R, Rup) };
    const fore = child(upper, [0, -d.upperArm, 0], rx(-G("elbow") * DEG));
    const wrist = child(fore, [0, -d.forearm, 0], mm(ry(-k * G("pronation") * DEG), mm(rz(-k * G("wristFlex") * DEG), rx(-G("wristDev") * DEG))));
    rig.shoulder[s] = sh;
    rig.upper[s] = upper;
    rig.fore[s] = fore;
    rig.hand[s] = wrist;
    const hip = child(pelvis, [k * d.hipX, -d.hipDrop, 0]);
    const thigh = { p: hip.p, R: mm(pelvis.R, mm(rx(-G("hipFlex") * DEG), mm(rz(k * G("hipAbd") * DEG), ry(k * G("hipRot") * DEG)))) };
    const shin = child(thigh, [0, -d.thigh, 0], rx(G("knee") * DEG));
    const foot = child(shin, [0, -d.shin, 0], rx(-G("ankle") * DEG));
    const toes = child(foot, [0, -d.ankleH * 0.85, d.ball], rx(-G("toe") * DEG));
    rig.hip[s] = hip;
    rig.thigh[s] = thigh;
    rig.shin[s] = shin;
    rig.foot[s] = foot;
    rig.toes[s] = toes;
    Object.assign(rig.joints, { ["shoulder" + s]: sh.p, ["elbow" + s]: fore.p, ["wrist" + s]: wrist.p, ["hip" + s]: hip.p, ["knee" + s]: shin.p, ["ankle" + s]: foot.p, ["ball" + s]: toes.p, ["heel" + s]: apply(foot, [0, -d.ankleH * 0.9, -d.heel]), ["toeTip" + s]: apply(toes, [0, 0, d.toe - d.ball]) });
  }
  Object.assign(rig.joints, { pelvis: pelvis.p, lumbar: lumbar.p, chest: chest.p, neck: neck.p, head: head.p, crown: apply(head, [0, d.hh - d.pivotToChin, 0]) });
  return rig;
};

// src/fit.ts
import { writeFileSync } from "node:fs";

// targets.json
var targets_default = {
  "warrior-2": {
    camera: {
      az: 90,
      el: 4
    },
    J: {
      pelvis: [
        0,
        76.72,
        0
      ],
      spine1: [
        0,
        98.72,
        0
      ],
      spine2: [
        0,
        120.72,
        0
      ],
      spine3: [
        0,
        138.72,
        0
      ],
      neckTop: [
        0,
        149.22,
        0
      ],
      head: [
        0.56,
        158.22,
        1.39
      ],
      shoulderR: [
        0,
        134.72,
        22
      ],
      elbowR: [
        0,
        134.72,
        59.2
      ],
      wristR: [
        0,
        134.72,
        88.4
      ],
      hipR: [
        0,
        76.72,
        9.5
      ],
      kneeR: [
        3.83,
        57,
        54.19
      ],
      ankleR: [
        3.88,
        7.8,
        54.42
      ],
      fingersR: [
        0,
        134.72,
        110
      ],
      toeR: [
        5.96,
        3.03,
        78.34
      ],
      heelR: [
        3.4,
        3.5,
        48.45
      ],
      shoulderL: [
        0,
        134.72,
        -22
      ],
      elbowL: [
        0,
        134.72,
        -59.2
      ],
      wristL: [
        0,
        134.72,
        -88.4
      ],
      hipL: [
        0,
        76.72,
        -9.5
      ],
      kneeL: [
        1.92,
        42.37,
        -44.39
      ],
      ankleL: [
        3.85,
        7.88,
        -79.42
      ],
      fingersL: [
        0,
        134.72,
        -110
      ],
      toeL: [
        19.28,
        3.31,
        -60.98
      ],
      heelL: [
        0.4,
        3.54,
        -84.3
      ]
    },
    frame: {
      pelvis: {
        pos: [
          0,
          0,
          0
        ],
        rot: [
          0,
          0,
          0
        ]
      },
      spine1: [
        0,
        0,
        0
      ],
      spine2: [
        0,
        0,
        0
      ],
      spine3: [
        0,
        0,
        0
      ],
      neck: [
        0,
        -58,
        0
      ],
      head: [
        0,
        -10,
        0
      ],
      shoulderR: [
        90,
        0,
        0
      ],
      elbowR: [
        0,
        0,
        0
      ],
      wristR: [
        0,
        0,
        0
      ],
      hipR: [
        65.8,
        78,
        11
      ],
      kneeR: [
        0,
        0,
        66
      ],
      ankleR: [
        0.4,
        0,
        -0.2
      ],
      shoulderL: [
        90,
        0,
        0
      ],
      elbowL: [
        0,
        0,
        0
      ],
      wristL: [
        0,
        0,
        0
      ],
      hipL: [
        45.4,
        -42,
        3.2
      ],
      kneeL: [
        0,
        0,
        0
      ],
      ankleL: [
        29.4,
        0,
        32.4
      ]
    },
    props: []
  },
  "downward-dog": {
    camera: {
      az: 28,
      el: 6
    },
    J: {
      pelvis: [
        0,
        104.06,
        0
      ],
      spine1: [
        14.78,
        87.76,
        0
      ],
      spine2: [
        29.56,
        71.46,
        0
      ],
      spine3: [
        41.65,
        58.13,
        0
      ],
      neckTop: [
        47.85,
        49.66,
        0
      ],
      head: [
        51.08,
        41.12,
        0
      ],
      shoulderR: [
        38.96,
        61.09,
        22
      ],
      elbowR: [
        62.02,
        31.9,
        22
      ],
      wristR: [
        80.9,
        9.63,
        22
      ],
      hipR: [
        0,
        104.06,
        9.5
      ],
      kneeR: [
        -13.42,
        56.93,
        9.5
      ],
      ankleR: [
        -34.91,
        12.68,
        9.5
      ],
      fingersR: [
        101.98,
        4.92,
        22.34
      ],
      toeR: [
        -13.94,
        0.07,
        9.5
      ],
      heelR: [
        -42.01,
        10.65,
        9.5
      ],
      shoulderL: [
        38.96,
        61.09,
        -22
      ],
      elbowL: [
        62.02,
        31.9,
        -22
      ],
      wristL: [
        80.9,
        9.63,
        -22
      ],
      hipL: [
        0,
        104.06,
        -9.5
      ],
      kneeL: [
        -13.42,
        56.93,
        -9.5
      ],
      ankleL: [
        -34.91,
        12.68,
        -9.5
      ],
      fingersL: [
        101.98,
        4.92,
        -22.34
      ],
      toeL: [
        -13.94,
        0.07,
        -9.5
      ],
      heelL: [
        -42.01,
        10.65,
        -9.5
      ]
    },
    frame: {
      pelvis: {
        pos: [
          0,
          0,
          0
        ],
        rot: [
          0,
          0,
          137.8
        ]
      },
      spine1: [
        0,
        0,
        0
      ],
      spine2: [
        0,
        0,
        0
      ],
      spine3: [
        0,
        0,
        0
      ],
      neck: [
        0,
        0,
        6
      ],
      head: [
        0,
        0,
        6
      ],
      shoulderR: [
        0,
        0,
        176.1
      ],
      elbowR: [
        0,
        0,
        2
      ],
      wristR: [
        -0.9,
        88,
        37.1
      ],
      hipR: [
        0,
        0,
        121.9
      ],
      kneeR: [
        0,
        0,
        10
      ],
      ankleR: [
        0,
        0,
        6.2
      ],
      shoulderL: [
        0,
        0,
        176.1
      ],
      elbowL: [
        0,
        0,
        2
      ],
      wristL: [
        -0.9,
        88,
        37.1
      ],
      hipL: [
        0,
        0,
        121.9
      ],
      kneeL: [
        0,
        0,
        10
      ],
      ankleL: [
        0,
        0,
        6.2
      ]
    },
    props: []
  },
  tree: {
    camera: {
      az: 70,
      el: 4
    },
    J: {
      pelvis: [
        0,
        106,
        0
      ],
      spine1: [
        0,
        128,
        0
      ],
      spine2: [
        0,
        150,
        0
      ],
      spine3: [
        0,
        168,
        0
      ],
      neckTop: [
        0,
        178.5,
        0
      ],
      head: [
        1.5,
        187.5,
        0
      ],
      shoulderR: [
        0,
        164,
        22
      ],
      elbowR: [
        -12.09,
        130.23,
        12.12
      ],
      wristR: [
        10.99,
        145.51,
        2.8
      ],
      hipR: [
        0,
        106,
        9.5
      ],
      kneeR: [
        0,
        57,
        9.5
      ],
      ankleR: [
        0,
        7.8,
        9.5
      ],
      fingersR: [
        11,
        167.11,
        2.83
      ],
      toeR: [
        24,
        3,
        9.5
      ],
      heelR: [
        -6,
        3.5,
        9.5
      ],
      shoulderL: [
        0,
        164,
        -22
      ],
      elbowL: [
        -12.09,
        130.23,
        -12.12
      ],
      wristL: [
        10.99,
        145.51,
        -2.8
      ],
      hipL: [
        0,
        106,
        -9.5
      ],
      kneeL: [
        6.06,
        70.15,
        -42.35
      ],
      ankleL: [
        -2.57,
        46.02,
        -0.35
      ],
      fingersL: [
        11,
        167.11,
        -2.83
      ],
      toeL: [
        5.88,
        23.12,
        1.43
      ],
      heelL: [
        -4.12,
        51.22,
        4.65
      ]
    },
    frame: {
      pelvis: {
        pos: [
          0,
          0,
          0
        ],
        rot: [
          0,
          0,
          0
        ]
      },
      spine1: [
        0,
        0,
        0
      ],
      spine2: [
        0,
        0,
        0
      ],
      spine3: [
        0,
        0,
        0
      ],
      neck: [
        0,
        0,
        0
      ],
      head: [
        0,
        0,
        0
      ],
      shoulderR: [
        -15.4,
        -41.9,
        -19.7
      ],
      elbowR: [
        0,
        0,
        130.3
      ],
      wristR: [
        24.2,
        38.1,
        55
      ],
      hipR: [
        0,
        0,
        0
      ],
      kneeR: [
        0,
        0,
        0
      ],
      ankleR: [
        0,
        0,
        0
      ],
      shoulderL: [
        -15.4,
        -41.9,
        -19.7
      ],
      elbowL: [
        0,
        0,
        130.3
      ],
      wristL: [
        24.2,
        38.1,
        55
      ],
      hipL: [
        42.1,
        74.8,
        9.6
      ],
      kneeL: [
        0,
        0,
        103.6
      ],
      ankleL: [
        17.1,
        -19.1,
        -23.9
      ]
    },
    props: []
  }
};

// src/fit.ts
var T = (p) => [-p[2], p[1], p[0]];
var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var nrm = (a) => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var dims = dimsFromCanon(CANON.adult, 1.7);
var BONES = [
  ["torso", "pelvis", "spine3", "pelvis", "neck", 2],
  ["neck", "spine3", "neckTop", "neck", "head", 1],
  ["head", "neckTop", "head", "head", "crown", 0.6],
  ["shoulderLine", "shoulderR", "shoulderL", "shoulderR", "shoulderL", 1],
  ["hipLine", "hipR", "hipL", "hipR", "hipL", 1],
  ...["L", "R"].flatMap((s) => [
    ["upperArm" + s, "shoulder" + s, "elbow" + s, "shoulder" + s, "elbow" + s, 1.5],
    ["forearm" + s, "elbow" + s, "wrist" + s, "elbow" + s, "wrist" + s, 1.5],
    ["thigh" + s, "hip" + s, "knee" + s, "hip" + s, "knee" + s, 1.5],
    ["shin" + s, "knee" + s, "ankle" + s, "knee" + s, "ankle" + s, 1.5],
    ["foot" + s, "ankle" + s, "toe" + s, "ankle" + s, "toeTip" + s, 1]
  ])
];
var free = JOINT_NAMES.filter((j) => !/^(pelvisSide|clav|pronation|wrist|toe|headTilt|headNod)/.test(j));
var base = (j) => /[LR]$/.test(j) && LIMITS[j.slice(0, -1)] ? j.slice(0, -1) : j;
var lim = (j) => LIMITS[base(j)];
var mkPose = (s) => ({ root: [0, 0, 0], yaw: s.yaw, pitch: s.pitch, roll: s.roll, joints: s.j, expression: {}, plant: true });
var loss = (s, goal) => {
  const bad = limitViolations(s.j).length;
  const rig = fk(dims, mkPose(s));
  let L = bad * 5;
  for (const [n, , , a, b, w] of BONES) {
    const d = nrm(sub(rig.joints[b], rig.joints[a]));
    L += w * (1 - dot(d, goal[n]));
  }
  return L;
};
var fit = (id) => {
  const t = targets_default[id], J = t.J;
  const goal = {};
  for (const [n, a, b] of BONES) goal[n] = nrm(sub(T(J[b]), T(J[a])));
  let best = null;
  const yaws = [0, 90, 180, 270], pitches = [-90, 0, 90], rolls = [-90, 0, 90];
  for (const yaw of yaws) for (const pitch of pitches) for (const roll of rolls) {
    const s2 = { yaw, pitch, roll, j: {} };
    for (const j of free) s2.j[j] = Math.max(lim(j)[0], Math.min(lim(j)[1], 0));
    let L = loss(s2, goal);
    for (let step = 40; step > 0.2; step *= 0.6) {
      for (let sweep = 0; sweep < 6; sweep++) {
        let moved = false;
        const tryMove = (apply2, undo) => {
          for (const d of [step, -step]) {
            apply2(d);
            const l2 = loss(s2, goal);
            if (l2 < L - 1e-9) {
              L = l2;
              moved = true;
              return;
            }
            undo();
          }
        };
        for (const k of ["yaw", "pitch", "roll"]) {
          const o = s2[k];
          tryMove((d) => s2[k] = o + d, () => s2[k] = o);
        }
        for (const j of free) {
          const o = s2.j[j], [lo, hi] = lim(j);
          tryMove((d) => s2.j[j] = Math.max(lo, Math.min(hi, o + d)), () => s2.j[j] = o);
        }
        if (!moved) break;
      }
    }
    if (!best || L < best.L) best = { s: JSON.parse(JSON.stringify(s2)), L };
  }
  const s = best.s, rig = fk(dims, mkPose(s));
  const err = {};
  for (const [n, , , a, b] of BONES) err[n] = Math.round(Math.acos(Math.min(1, dot(nrm(sub(rig.joints[b], rig.joints[a])), goal[n]))) * 180 / Math.PI * 10) / 10;
  return { pose: mkPose(s), loss: best.L, errDeg: err, violations: limitViolations(s.j) };
};
var out = {};
for (const id of Object.keys(targets_default)) {
  const r = fit(id);
  out[id] = r;
  console.log(id, "loss", r.loss.toFixed(4), "violations", r.violations.length, "\n  err deg", JSON.stringify(r.errDeg));
}
writeFileSync(new URL("../fitted.json", import.meta.url).pathname.replace("/src/../", "/"), JSON.stringify(out, null, 1));
