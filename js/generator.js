// Deterministic first-time plan generator. Same inputs always give the same plan.
import { POSES } from '../data/poses.js';
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
const NAMES = {
  general: { he: 'תכנית ראשונה', ru: 'Первая практика', en: 'First-time plan' },
  flexibility: { he: 'תכנית גמישות', ru: 'Практика на гибкость', en: 'Flexibility plan' },
  strength: { he: 'תכנית כוח עדין', ru: 'Практика на силу', en: 'Gentle strength plan' },
  relax: { he: 'תכנית הרפיה', ru: 'Практика для расслабления', en: 'Relaxing plan' },
  back: { he: 'תכנית ידידותית לגב', ru: 'Практика для спины', en: 'Back-friendly plan' },
};

const grid = (x) => Math.round(x / 5) * 5;

function candidates({ focus, level, avoid }) {
  const maxD = level === 'beginner' || focus === 'back' ? 2 : 3;
  return POSES.filter((p) => p.section !== 'rest' && p.difficulty <= maxD && !(focus === 'back' && p.tags.includes('noback')) && !avoid.has(p.id));
}

function rank(p, focus) {
  const tag = FOCUS_TAG[focus];
  const match = tag && p.tags.includes(tag) ? 0 : 1;
  return [match, p.difficulty, p.flow];
}
const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

function slotNominal(p, f) {
  const hold = BREATH_POSES.has(p.id) ? p.holdSeconds : p.holdSeconds;
  return (p.sides === 'both' ? 2 : 1) * (grid(hold * f) + DEFAULT_TRANSITION);
}

export function generatePlan({ minutes = 20, focus = 'general', level = 'beginner', avoid = [] } = {}) {
  const avoidSet = new Set(avoid);
  const T = minutes * 60;
  const lvl = level === 'beginner' ? 0 : 1;
  const all = candidates({ focus, level, avoid: new Set() });
  const pool = candidates({ focus, level, avoid: avoidSet });
  const w = WEIGHTS[focus] || WEIGHTS.general;
  const savasanaTarget = Math.max(45, grid(T * 0.1));
  const budgetTotal = T - (savasanaTarget + DEFAULT_TRANSITION);

  const sections = ORDER.filter((s) => pool.some((p) => p.section === s));
  const wsum = sections.reduce((n, s) => n + w[s], 0);

  const chosen = [];
  const used = new Set();
  for (const s of sections) {
    const budget = (budgetTotal * w[s]) / wsum;
    const full = all.filter((p) => p.section === s).sort((a, b) => cmp(rank(a, focus), rank(b, focus)));
    // pick from the full set first; replace avoided picks by same-category substitutes
    const picked = [];
    let sum = 0;
    for (const p of full) {
      if (sum >= budget * 0.9 && picked.length) break;
      picked.push(p);
      sum += slotNominal(p, 1);
    }
    const out = [];
    for (const p of picked) {
      if (!avoidSet.has(p.id)) { out.push(p); continue; }
      const sub = pool.filter((q) => !picked.includes(q) && !out.includes(q) && !used.has(q.id) && q.section === s)
        .sort((a, b) => (b.category === p.category) - (a.category === p.category) || (b.section === p.section) - (a.section === p.section) || cmp(rank(a, focus), rank(b, focus)))[0];
      if (sub) out.push(sub);
    }
    out.forEach((p) => used.add(p.id));
    out.sort((a, b) => a.flow - b.flow);
    chosen.push({ s, budget, poses: out });
  }

  // second pass: poses missing for budget -> add from the pool (any section matching order)
  let items = [];
  for (const sec of chosen) {
    const nominal = sec.poses.reduce((n, p) => n + slotNominal(p, 1), 0) || 1;
    const k = Math.max(0.6, Math.min(1.8, sec.budget / nominal));
    for (const p of sec.poses) {
      let hold = Math.max(10, grid(p.holdSeconds * k));
      if (BREATH_POSES.has(p.id)) items.push({ pose: p.id, level: lvl, unit: 'breath', amount: Math.max(2, Math.round(hold / BREATH_SEC)) });
      else items.push({ pose: p.id, level: lvl, unit: 'sec', amount: Math.min(90, hold) });
    }
  }
  items.push({ pose: 'savasana', level: lvl, unit: 'sec', amount: savasanaTarget });

  // fine tune toward T by nudging holds in 5 s steps (round-robin, deterministic)
  const body = () => items.slice(0, -1);
  const step = (i, d) => {
    const it = items[i];
    const unitSec = it.unit === 'breath' ? BREATH_SEC : 5;
    const amt = it.amount + (d > 0 ? unitSec / (it.unit === 'breath' ? BREATH_SEC : 1) : -unitSec / (it.unit === 'breath' ? BREATH_SEC : 1));
    const lo = it.unit === 'breath' ? 2 : 10, hi = it.unit === 'breath' ? 14 : 90;
    if (amt < lo || amt > hi) return false;
    it.amount = amt;
    return true;
  };
  let guard = 0, i = 0;
  while (guard++ < 2000) {
    const diff = T - planSeconds(items);
    if (Math.abs(diff) <= 5) break;
    const n = body().length;
    let moved = false;
    for (let tries = 0; tries < n && !moved; tries++) { moved = step(i % n, diff); i++; }
    if (!moved) break;
  }
  // let savasana absorb what is left (30-480 s)
  const rest = T - planSeconds(body());
  items[items.length - 1].amount = Math.max(30, Math.min(480, grid(rest - DEFAULT_TRANSITION)));
  return { name: NAMES[focus] || NAMES.general, items, minutes, focus, level };
}

export const _sideCount = sideCount;
