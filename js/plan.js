// Pure plan helpers (no DOM): durations, validation, JSON import/export.
import { POSE_BY_ID } from '../data/poses.js';

export const BREATH_SEC = 5;
export const DEFAULT_TRANSITION = 5;
export const APP_ID = 'home-yoga-flow';

export const holdSeconds = (it) => (it.unit === 'breath' ? it.amount * BREATH_SEC : it.amount);
export const sideCount = (it) => (POSE_BY_ID[it.pose]?.sides === 'both' ? 2 : 1);
export const itemSeconds = (it, tr = DEFAULT_TRANSITION, mult = 1) =>
  sideCount(it) * (Math.round(holdSeconds(it) * mult) + tr);
export const planSeconds = (items, tr = DEFAULT_TRANSITION, mult = 1) =>
  items.reduce((n, it) => n + itemSeconds(it, tr, mult), 0);
export const fmtTime = (sec) => {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

// Expand plan into playable slots: one per side.
export function slots(items) {
  const out = [];
  items.forEach((it, index) => {
    const p = POSE_BY_ID[it.pose];
    const n = sideCount(it);
    for (let s = 0; s < n; s++) out.push({ index, side: s, sides: n, pose: p, level: it.level, hold: holdSeconds(it) });
  });
  return out;
}

export function validateItem(it) {
  if (!it || typeof it !== 'object') return 'item is not an object';
  if (!POSE_BY_ID[it.pose]) return `unknown pose "${it.pose}"`;
  if (![0, 1, 2].includes(it.level)) return 'level must be 0, 1 or 2';
  if (it.unit !== 'sec' && it.unit !== 'breath') return 'unit must be "sec" or "breath"';
  if (!Number.isFinite(it.amount) || it.amount < 1 || it.amount > 600) return 'amount must be 1-600';
  return null;
}

export function validatePlanObject(plan) {
  if (!plan || typeof plan !== 'object') return 'plan missing';
  if (typeof plan.name !== 'string' || !plan.name.trim()) return 'plan name missing';
  if (!Array.isArray(plan.items) || !plan.items.length) return 'plan has no items';
  if (plan.items.length > 200) return 'too many items';
  for (let i = 0; i < plan.items.length; i++) {
    const e = validateItem(plan.items[i]);
    if (e) return `item ${i + 1}: ${e}`;
  }
  return null;
}

export const cleanItem = (it) => ({ pose: it.pose, level: it.level, unit: it.unit, amount: Math.round(it.amount) });

export function exportPlanJSON(plan) {
  return JSON.stringify({ app: APP_ID, version: 1, plan: { name: plan.name, items: plan.items.map(cleanItem) } }, null, 2);
}

// Returns { plan } or { error }.
export function parsePlanJSON(text) {
  let o;
  try { o = JSON.parse(text); } catch { return { error: 'not valid JSON' }; }
  if (!o || o.app !== APP_ID) return { error: 'not a plan file from this app' };
  if (o.version !== 1) return { error: 'unsupported version' };
  const err = validatePlanObject(o.plan);
  if (err) return { error: err };
  return { plan: { name: o.plan.name.trim().slice(0, 80), items: o.plan.items.map(cleanItem) } };
}
