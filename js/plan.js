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
export const hasBreaths = (items) => items.some((it) => it.unit === 'breath');
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

// ---- export / import. Schema: { app, version: 2, plan, favorites?: [poseId], history?: [{date, plan, minutes, ...}] }.
// Version 1 files (plan only) are still accepted.
export const SCHEMA_VERSION = 2;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const cleanHistoryEntry = (h) => {
  if (!h || typeof h !== 'object' || !DATE_RE.test(h.date) || typeof h.plan !== 'string') return null;
  const num = (v) => (Number.isFinite(v) && v >= 0 && v < 1e6 ? Math.round(v) : undefined);
  const o = { date: h.date, plan: h.plan.slice(0, 80), minutes: num(h.minutes) ?? 1 };
  for (const k of ['seconds', 'planned']) if (num(h[k]) !== undefined) o[k] = num(h[k]);
  if (typeof h.counted === 'boolean') o.counted = h.counted;
  return o;
};
// Identity of a practice session: same day, plan name and length = the same entry (import never duplicates it).
export const historyKey = (h) => [h.date, h.plan, h.seconds ?? '', h.minutes, h.planned ?? ''].join('|');
// Imported entries are added once; existing ones win. Newest first (by date, stable), max 400.
export function mergeHistory(existing, incoming) {
  const seen = new Set(existing.map(historyKey));
  const added = [];
  for (const raw of incoming || []) {
    const h = cleanHistoryEntry(raw);
    if (!h || seen.has(historyKey(h))) continue;
    seen.add(historyKey(h)); added.push(h);
  }
  const all = [...existing, ...added].map((h, i) => [h, i]).sort((x, y) => (x[0].date < y[0].date ? 1 : x[0].date > y[0].date ? -1 : x[1] - y[1]));
  return { history: all.map((x) => x[0]).slice(0, 400), added: added.length };
}
export function mergeFavorites(existing, incoming) {
  const out = [...existing];
  for (const id of incoming || []) if (POSE_BY_ID[id] && !out.includes(id)) out.push(id);
  return out;
}

export function exportPlanJSON(plan, { favorites = [], history = [] } = {}) {
  return JSON.stringify({
    app: APP_ID, version: SCHEMA_VERSION,
    plan: { name: plan.name, items: plan.items.map(cleanItem) },
    favorites: favorites.filter((id) => POSE_BY_ID[id]),
    history: history.map(cleanHistoryEntry).filter(Boolean),
  }, null, 2);
}

// Returns { plan, favorites, history } or { error }.
export function parsePlanJSON(text) {
  let o;
  try { o = JSON.parse(text); } catch { return { error: 'not valid JSON' }; }
  if (!o || o.app !== APP_ID) return { error: 'not a plan file from this app' };
  if (o.version !== 1 && o.version !== 2) return { error: 'unsupported version' };
  const err = validatePlanObject(o.plan);
  if (err) return { error: err };
  const res = { plan: { name: o.plan.name.trim().slice(0, 80), items: o.plan.items.map(cleanItem) }, favorites: [], history: [] };
  if (o.version === 2) {
    if (Array.isArray(o.favorites)) res.favorites = o.favorites.filter((id) => typeof id === 'string' && POSE_BY_ID[id]);
    if (Array.isArray(o.history)) res.history = o.history.map(cleanHistoryEntry).filter(Boolean);
  }
  return res;
}

// ---- builder helpers (pure) ----
// Allowed range for the hold amount per unit (seconds: 5-600, breaths: 1-120 = 5-600 s).
export const amountRange = (unit) => (unit === 'breath' ? { min: 1, max: 120 } : { min: 5, max: 600 });
// Returns { value, clamped: null | 'min' | 'max', range }.
export function clampAmount(raw, unit) {
  const range = amountRange(unit);
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < range.min) return { value: range.min, clamped: 'min', range };
  if (n > range.max) return { value: range.max, clamped: 'max', range };
  return { value: n, clamped: null, range };
}

// Where a dragged row lands: index of the row whose centre is nearest to the dragged row's centre.
// (Centre-to-centre means "drop item 3 onto item 1" gives index 0.)
export function dropIndex(centers, y) {
  let best = 0;
  for (let i = 1; i < centers.length; i++) if (Math.abs(centers[i] - y) < Math.abs(centers[best] - y)) best = i;
  return best;
}
// Move arr[from] to position `to` (returns a new array).
export function reorder(arr, from, to) {
  const out = arr.slice();
  if (from === to || from < 0 || from >= out.length) return out;
  const [m] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, m);
  return out;
}
