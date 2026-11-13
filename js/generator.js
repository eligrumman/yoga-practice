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
  ['allfours', ['tabletop', 'cat-cow', 'cat', 'cow', 'downward-dog', 'plank']],
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
export const BEGINNER_EXTRA = new Set(['chair', 'warrior-1', 'warrior-2', 'downward-dog', 'supine-twist', 'happy-baby', 'seated-twist', 'figure-four', 'high-lunge']);
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
  return [match, p.difficulty, level === 'beginner' ? 0 : 0, p.flow];
}
const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

// beginner holds are short (about 20-30 s, cobra shortest); the time is filled with more easy poses, not longer holds
const baseHold = (p, level) => (level === 'beginner' ? Math.min(30, p.holdSeconds) : p.holdSeconds);
function slotNominal(p, f, level) {
  const hold = baseHold(p, level);
  return (p.sides === 'both' ? 2 : 1) * (grid(hold * f) + DEFAULT_TRANSITION);
}

// ---- beginner plans: few poses, longer holds. Item counts (incl. Savasana): 10 min ~9, 20 min ~16, 30 min ~22.
// A two-sided pose is ONE item (each side gets the full hold). Cat-Cow is one 'cat-cow' flow item.
const BEG_BODY = { 10: 8, 20: 16, 30: 23 };
const BEG_STAND_CAP = { 10: 3, 20: 4, 30: 5 };
const CATCOW_FLOW_BREATHS = 6; // 3 breath cycles of about 10 s
function begRange(p) {
  if (p.id === 'cobra') return [15, 20];
  if (p.id === 'upward-salute' || p.id === 'half-lift') return [15, 30];
  if (p.section === 'stand' || p.section === 'bal') return [20, 45];
  return [30, 45];
}
function generateBeginner({ minutes, focus, avoid }) {
  const T = minutes * 60;
  const avoidSet = new Set(avoid);
  const w = WEIGHTS[focus] || WEIGHTS.general;
  const pool = candidates({ focus, level: 'beginner', avoid: avoidSet }).filter((p) => !BREATH_POSES.has(p.id));
  const bySec = (sx) => pool.filter((p) => p.section === sx).sort((a, b) => cmp(rank(a, focus, 'beginner'), rank(b, focus, 'beginner')) || (a.sides === 'both' ? 0 : 1) - (b.sides === 'both' ? 0 : 1));
  // two-sided poses first within equal rank: each side is held in full, so they fill the time with fewer items
  const lists = { stand: bySec('stand').concat(bySec('bal')), floor: bySec('floor'), cool: bySec('cool') };
  const N = BEG_BODY[minutes] ?? Math.round(minutes * 0.7);
  const hasSalute = pool.some((p) => p.id === 'upward-salute');
  const warmN = 1 + (minutes >= 20 && hasSalute ? 1 : 0); // cat-cow (+ upward salute)
  const R = N - warmN;
  const sw = w.stand + w.bal, tot = sw + w.floor + w.cool;
  const stand = Math.max(2, Math.min(BEG_STAND_CAP[minutes] ?? 4, Math.round((R * sw) / tot)));
  let floor = Math.max(1, Math.round(((R - stand) * w.floor) / (w.floor + w.cool)));
  floor = Math.min(floor, lists.floor.length, R - stand - 1);
  let counts = { stand: Math.min(stand, lists.stand.length), floor, cool: R - stand - floor };
  if (counts.cool > lists.cool.length) { counts.floor += counts.cool - lists.cool.length; counts.cool = lists.cool.length; counts.floor = Math.min(counts.floor, lists.floor.length); }
  const picked = [];
  if (!avoidSet.has('cat-cow')) picked.push(POSE_BY_ID['cat-cow']);
  if (warmN > 1) picked.push(POSE_BY_ID['upward-salute']);
  for (const sx of ['stand', 'floor', 'cool']) picked.push(...lists[sx].filter((p) => p.id !== 'upward-salute').slice(0, counts[sx]));

  let items = picked.filter(Boolean).map((p) => (p.id === 'cat-cow'
    ? { pose: p.id, level: 0, unit: 'breath', amount: CATCOW_FLOW_BREATHS }
    : { pose: p.id, level: 0, unit: 'sec', amount: begRange(p)[0] }));
  items.sort((x, y) => SEQ_RANK[x.pose] - SEQ_RANK[y.pose]);
  const savasana = { pose: 'savasana', level: 0, unit: 'sec', amount: Math.max(60, grid(T * 0.15)) };
  items.push(savasana);
  const body = () => items.slice(0, -1);
  const range = (it) => begRange(POSE_BY_ID[it.pose]);
  // grow holds in 5 s steps, round-robin (deterministic), until the plan reaches T minus savasana
  let i = 0, extra = 0; // extra: only when the pool is exhausted (e.g. back-friendly 30 min), holds may stretch up to +15 s
  const maxItems = { 10: 10, 20: 18, 30: 24 }[minutes] ?? 24;
  for (let guard = 0; guard < 4000; guard++) {
    if (T - planSeconds(items) < 5) break;
    const cand = body().filter((it) => it.unit === 'sec' && it.amount + 5 <= range(it)[1] + (it.pose === 'cobra' ? 0 : extra));
    if (!cand.length) {
      // all holds at their maximum and still more than ~2 min short: add one more easy pose (cool-down first), within the item cap
      const left = T - planSeconds(items);
      const nStand = items.filter((it) => POSE_BY_ID[it.pose].section === 'stand').length;
      const more = [...lists.cool, ...lists.floor, ...(nStand < (BEG_STAND_CAP[minutes] ?? 4) ? lists.stand : [])].find((p) => !items.some((it) => it.pose === p.id));
      if (left > 150 && more && items.length < maxItems) {
        items.splice(items.length - 1, 0, { pose: more.id, level: 0, unit: 'sec', amount: begRange(more)[0] });
        const sv = items.pop(); items.sort((x, y) => SEQ_RANK[x.pose] - SEQ_RANK[y.pose]); items.push(sv);
        continue;
      }
      if (extra < 30 && left - DEFAULT_TRANSITION > 420) { extra += 15; continue; }
      break;
    }
    cand[i++ % cand.length].amount += 5;
  }
  // overflow at minimum holds: shrink savasana first
  savasana.amount = Math.max(30, savasana.amount + Math.min(0, T - planSeconds(items)));
  // still short: savasana absorbs the rest (up to 5 min for 10-20 min plans, 10 min at 30)
  const rest = T - planSeconds(body());
  savasana.amount = Math.max(30, Math.min(minutes >= 30 ? 600 : minutes >= 20 ? 300 : 240, grid(rest - DEFAULT_TRANSITION)));
  return { name: NAMES[focus] || NAMES.general, items, minutes, focus, level: 'beginner' };
}

export function generatePlan({ minutes = 20, focus = 'general', level = 'beginner', avoid = [] } = {}) {
  if (level === 'beginner') return generateBeginner({ minutes, focus, avoid });
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
