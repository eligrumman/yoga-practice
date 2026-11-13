// All persistence in localStorage (this device only). Every access is guarded.
import { resolveNarration } from './narration-plan.js';
const K = 'hyf.';
const mem = {};
function get(key, def) {
  try { const v = localStorage.getItem(K + key); return v == null ? def : JSON.parse(v); } catch { return key in mem ? mem[key] : def; }
}
function set(key, val) {
  mem[key] = val;
  try { localStorage.setItem(K + key, JSON.stringify(val)); } catch { /* private mode: memory only */ }
}

export const DEFAULT_SETTINGS = { holdMult: 1, transition: 5, beep: true, mute: false, volume: 0.9, narrLang: '', wake: true, music: 'soft', musicVol: 0.5, barPin: false };

export const store = {
  get lang() { return get('lang', 'he'); },
  set lang(v) { set('lang', v); },
  // `narration` (full|short|name|off) replaces the old `density` (minimal|standard|full): migrated on read, default 'full' for a first-ever session.
  get settings() { const raw = get('settings', {}); return { ...DEFAULT_SETTINGS, ...raw, narration: resolveNarration(raw) }; },
  saveSettings(patch) { set('settings', { ...this.settings, ...patch }); },

  // plans: [{id, name, items, updated}]
  get plans() { return get('plans', []); },
  savePlans(p) { set('plans', p); },
  getPlan(id) { return this.plans.find((p) => p.id === id) || null; },
  upsertPlan(plan) {
    const all = this.plans;
    const i = all.findIndex((p) => p.id === plan.id);
    const rec = { ...plan, updated: Date.now() };
    if (i >= 0) all[i] = rec; else all.unshift(rec);
    this.savePlans(all);
    return rec;
  },
  deletePlan(id) { this.savePlans(this.plans.filter((p) => p.id !== id)); },
  newId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },

  get favorites() { return get('favs', []); },
  toggleFav(id) {
    const f = this.favorites; const i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    set('favs', f); return i < 0;
  },

  // history: [{date 'YYYY-MM-DD', plan, minutes}]
  get history() { return get('history', []); },
  // actualSec = time really practised (pauses excluded); plannedSec = length of the plan.
  addHistory(plan, actualSec, plannedSec) {
    const h = this.history;
    const sec = Math.max(0, Math.round(actualSec));
    h.unshift({ date: dayKey(new Date()), plan, minutes: Math.max(1, Math.round(sec / 60)), seconds: sec, planned: Math.round(plannedSec / 60), counted: countsForStreak(sec, plannedSec) });
    set('history', h.slice(0, 400));
  },
  setHistory(h) { set('history', h); },
  setFavs(f) { set('favs', f); },
};

export const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// A session counts towards the streak if at least half of the plan was practised, or at least 5 minutes.
export const STREAK_MIN_SEC = 300, STREAK_MIN_FRACTION = 0.5;
export const countsForStreak = (actualSec, plannedSec) => actualSec >= STREAK_MIN_SEC || (plannedSec > 0 && actualSec >= plannedSec * STREAK_MIN_FRACTION);
// Display minutes for a history entry: "<1" for very short sessions.
export const histMinutes = (h) => (h.seconds != null && h.seconds < 60 ? '<1' : String(h.minutes));

export function streak(history, today = new Date()) {
  const days = new Set(history.filter((h) => h.counted !== false).map((h) => h.date)); // old entries have no flag: they count
  let n = 0; const d = new Date(today);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not yet practiced does not break the streak
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
