// Deterministic first-time plan generator. Same inputs always give the same plan.
import { POSES, POSE_BY_ID } from '../data/poses.js';
import { planSeconds, sideCount, DEFAULT_TRANSITION, BREATH_SEC } from './plan.js';

export const FOCUSES = ['general', 'flexibility', 'strength', 'relax', 'back'];
export const LENGTHS = [10, 20, 30];
export const GEN_LEVELS = ['beginner', 'gentle']; // gentle = gentle-intermediate

const ORDER = ['warm', 'stand', 'bal', 'floor', 'cool'];
const WEIGHTS = {
  general: { warm: 0.12, stand: 0.28, bal: 0.1, floor: 0.2, cool: 0.3 },
  flexibility: { warm: 0.1, stand: 0.2, bal: 0.05, floor: 0.25, cool: 0.4 },
  strength: { warm: 0.08, stand: 0.36, bal: 0.14, floor: 0.28, cool: 0.14 },
  relax: { warm: 0.12, stand: 0.14, bal: 0.04, floor: 0.16, cool: 0.54 },
  back: { warm: 0.18, stand: 0.18, bal: 0.04, floor: 0.2, cool: 0.4 },
};
const FOCUS_TAG = { general: null, flexibility: 'flex', strength: 'strength', relax: 'relax', back: 'back' };
const BREATH_POSES = new Set(['tabletop', 'cat', 'cow']);
// Body-position order of a practice: all fours (warm-up) -> standing -> kneeling -> seated -> prone -> supine -> savasana.
// SEQ is the total order; a generated plan is sorted by it so there is never a supine -> kneeling/standing jump.
const SEQ = [
  ['allfours', ['tabletop', 'cat', 'cow', 'downward-dog', 'plank']],
  ['stand', ['mountain', 'upward-salute', 'chair', 'revolved-chair', 'warrior-1', 'warrior-2', 'high-lunge', 'tree', 'warrior-3', 'dancer', 'half-lift', 'uttanasana']],
  ['kneel', ['low-lunge', 'half-split', 'camel', 'child']],
  ['seated', ['easy-seat', 'cobbler', 'seated-fold', 'seated-twist', 'boat']],
  ['prone', ['cobra', 'locust']],
  ['supine', ['bridge', 'knees-to-chest', 'happy-baby', 'figure-four', 'hand-to-toe', 'supine-twist', 'legs-up-wall']],
  ['rest', ['savasana']],
];
export const POSITIONS = SEQ.map(([n]) => n);
export const POSITION = {}; const SEQ_RANK = {};
SEQ.forEach(([name, ids]) => ids.forEach((id) => { POSITION[id] = name; SEQ_RANK[id] = Object.keys(SEQ_RANK).length; }));
// easy two-sided/standing poses a beginner may meet in the first weeks (beyond difficulty 1), to fill time without longer holds
const BEGINNER_EXTRA = new Set(['chair', 'warrior-1', 'warrior-2', 'downward-dog', 'supine-twist', 'happy-baby', 'seated-twist', 'figure-four', 'high-lunge']);
export const CATCOW_CYCLES = 3, CATCOW_BREATHS = 3;
const NAMES = {
  general: { he: 'תכנית ראשונה', ru: 'Первая практика', en: 'First-time plan' },
  flexibility: { he: 'תכנית גמישות', ru: 'Практика на гибкость', en: 'Flexibility plan' },
  strength: { he: 'תכנית כוח עדין', ru: 'Практика на силу', en: 'Gentle strength plan' },
  relax: { he: 'תכנית הרפיה', ru: 'Практика для расслабления', en: 'Relaxing plan' },
  back: { he: 'תכנית ידידותית לגב', ru: 'Практика для спины', en: 'Back-friendly plan' },
};

// longest beginner hold per pose: cobra is the shortest (20 s)
const maxSec = (p) => (p.id === 'cobra' ? 20 : 40);
const grid = (x) => Math.round(x / 5) * 5;

function candidates({ focus, level, avoid }) {
  // beginner: difficulty-1 poses plus a short list of easy extras (no Tree, Warrior III, Plank, Half-split...)
  const maxD = focus === 'back' && level !== 'beginner' ? 2 : 3;
  const okLevel = (p) => (level === 'beginner' ? p.difficulty === 1 || BEGINNER_EXTRA.has(p.id) : p.difficulty <= maxD);
  return POSES.filter((p) => p.section !== 'rest' && okLevel(p) && !(focus === 'back' && p.tags.includes('noback')) && !avoid.has(p.id));
}

function rank(p, focus, level) {
  const tag = FOCUS_TAG[focus];
  const match = tag && p.tags.includes(tag) ? 0 : 1;
  // beginners: prefer one-sided poses (every second side doubles the time on a pose)
  return [match, p.difficulty, level === 'beginner' ? (p.sides === 'both' ? 1 : 0) : 0, p.flow];
}
const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

// beginner holds are short (about 20-30 s, cobra shortest); the time is filled with more easy poses, not longer holds
const baseHold = (p, level) => (level === 'beginner' ? Math.min(30, p.holdSeconds) : p.holdSeconds);
function slotNominal(p, f, level) {
  const hold = baseHold(p, level);
  return (p.sides === 'both' ? 2 : 1) * (grid(hold * f) + DEFAULT_TRANSITION);
}

export function generatePlan({ minutes = 20, focus = 'general', level = 'beginner', avoid = [] } = {}) {
  const avoidSet = new Set(avoid);
  const T = minutes * 60;
  const lvl = level === 'beginner' ? 0 : 1;
  const all = candidates({ focus, level, avoid: new Set() });
  const pool = candidates({ focus, level, avoid: avoidSet });
  const w = WEIGHTS[focus] || WEIGHTS.general;
  const savasanaTarget = level === 'beginner' ? Math.max(60, grid(T * 0.15)) : Math.max(45, grid(T * 0.1));
  const budgetTotal = T - (savasanaTarget + DEFAULT_TRANSITION);

  const sections = ORDER.filter((s) => pool.some((p) => p.section === s));
  const wsum = sections.reduce((n, s) => n + w[s], 0);

  // beginner: a section can only absorb so much (few d1 poses, holds capped at 60 s); spill the rest to other sections
  const cap = {};
  const sectionBudget = {};
  if (level === 'beginner') {
    for (const sx of sections) cap[sx] = all.filter((p) => p.section === sx).reduce((n, p) => n + slotNominal(p, 1, level), 0);
    let active = [...sections], left = budgetTotal;
    for (let g = 0; g < 10 && active.length; g++) {
      const ws = active.reduce((n, sx) => n + w[sx], 0);
      const over = active.filter((sx) => (left * w[sx]) / ws > cap[sx]);
      if (!over.length) { for (const sx of active) sectionBudget[sx] = (left * w[sx]) / ws; break; }
      for (const sx of over) { sectionBudget[sx] = cap[sx]; left -= cap[sx]; }
      active = active.filter((sx) => !over.includes(sx));
    }
  }

  const chosen = [];
  const used = new Set();
  for (const s of sections) {
    const budget = sectionBudget[s] ?? (budgetTotal * w[s]) / wsum;
    const full = all.filter((p) => p.section === s).sort((a, b) => cmp(rank(a, focus, level), rank(b, focus, level)));
    // pick from the full set first; replace avoided picks by same-category substitutes
    const picked = [];
    let sum = 0;
    for (const p of full) {
      const n = slotNominal(p, 1, level);
      if (picked.length && (level === 'beginner' ? sum + n / 2 > budget : sum >= budget * 0.9)) break;
      picked.push(p);
      sum += n;
    }
    const out = [];
    for (const p of picked) {
      if (!avoidSet.has(p.id)) { out.push(p); continue; }
      const sub = pool.filter((q) => !picked.includes(q) && !out.includes(q) && !used.has(q.id) && q.section === s)
        .sort((a, b) => (b.category === p.category) - (a.category === p.category) || (b.section === p.section) - (a.section === p.section) || cmp(rank(a, focus, level), rank(b, focus, level)))[0];
      if (sub) out.push(sub);
    }
    out.forEach((p) => used.add(p.id));
    out.sort((a, b) => a.flow - b.flow);
    chosen.push({ s, budget, poses: out });
  }

  // build items, then order by body position (see SEQ)
  const beg = level === 'beginner';
  let items = [];
  for (const sec of chosen) {
    const nominal = sec.poses.reduce((n, p) => n + slotNominal(p, 1, level), 0) || 1;
    const k = Math.max(0.6, Math.min(1.8, sec.budget / nominal));
    for (const p of sec.poses) {
      const hold = Math.max(beg ? 15 : 10, grid(baseHold(p, level) * k));
      if (BREATH_POSES.has(p.id)) items.push({ pose: p.id, level: lvl, unit: 'breath', amount: beg ? CATCOW_BREATHS : Math.max(2, Math.round(hold / BREATH_SEC)) });
      else items.push({ pose: p.id, level: lvl, unit: 'sec', amount: Math.min(beg ? Math.min(30, maxSec(p)) : 90, hold) });
    }
  }
  items.sort((x, y) => SEQ_RANK[x.pose] - SEQ_RANK[y.pose]);
  // beginner: no 12-breath Tabletop/Cat. A few Cat-Cow cycles instead (fixed, not stretched by the tuner).
  const fixed = new WeakSet();
  if (beg && items.some((i) => BREATH_POSES.has(i.pose))) {
    const out = []; let flowDone = false;
    const flow = () => { flowDone = true; for (let c = 0; c < CATCOW_CYCLES; c++) for (const id of ['cat', 'cow']) { const x = { pose: id, level: lvl, unit: 'breath', amount: CATCOW_BREATHS }; fixed.add(x); out.push(x); } };
    for (const it of items) {
      if (it.pose === 'tabletop') { it.amount = CATCOW_BREATHS; fixed.add(it); out.push(it); if (!flowDone) flow(); }
      else if (it.pose === 'cat' || it.pose === 'cow') { if (!flowDone) flow(); }
      else out.push(it);
    }
    items = out;
  }
  items.push({ pose: 'savasana', level: lvl, unit: 'sec', amount: savasanaTarget });

  // fine tune toward T by nudging holds in 5 s steps (round-robin, deterministic)
  const body = () => items.slice(0, -1);
  let stretch = false; // beginner: holds stay 15-30 s (up to 40 s only if a 30 min plan cannot otherwise be filled)
  const step = (i, d) => {
    const it = items[i];
    if (fixed.has(it)) return false;
    const sec = it.unit === 'sec';
    const amt = it.amount + (d > 0 ? 5 : -5) / (sec ? 1 : BREATH_SEC);
    const lo = sec ? (beg ? 15 : 10) : 2;
    const hi = sec ? (beg ? Math.min(stretch ? 40 : 30, maxSec(POSE_BY_ID[it.pose])) : 90) : 14;
    if (amt < lo || amt > hi) return false;
    it.amount = amt;
    return true;
  };
  let i = 0;
  const tune = () => {
    for (let guard = 0; guard < 4000; guard++) {
      const diff = T - planSeconds(items);
      if (Math.abs(diff) <= 5) break;
      const n = body().length;
      let moved = false;
      for (let tries = 0; tries < n && !moved; tries++) { moved = step(i % n, diff); i++; }
      if (!moved) break;
    }
  };
  tune();
  if (beg && T - planSeconds(body()) - DEFAULT_TRANSITION > 420) {
    stretch = true; items[items.length - 1].amount = grid(T * 0.2); tune();
  }
  // let savasana absorb what is left (30-480 s, up to 600 s for a 30 min beginner plan)
  const rest = T - planSeconds(body());
  items[items.length - 1].amount = Math.max(30, Math.min(beg ? 600 : 480, grid(rest - DEFAULT_TRANSITION)));
  return { name: NAMES[focus] || NAMES.general, items, minutes, focus, level };
}

export const _sideCount = sideCount;
