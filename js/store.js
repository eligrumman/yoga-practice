// All persistence in localStorage (this device only). Every access is guarded.
const K = 'hyf.';
const mem = {};
function get(key, def) {
  try { const v = localStorage.getItem(K + key); return v == null ? def : JSON.parse(v); } catch { return key in mem ? mem[key] : def; }
}
function set(key, val) {
  mem[key] = val;
  try { localStorage.setItem(K + key, JSON.stringify(val)); } catch { /* private mode: memory only */ }
}

export const DEFAULT_SETTINGS = { holdMult: 1, transition: 5, density: 'standard', beep: true, mute: false, volume: 0.9, narrLang: '', wake: true };

export const store = {
  get lang() { return get('lang', 'he'); },
  set lang(v) { set('lang', v); },
  get settings() { return { ...DEFAULT_SETTINGS, ...get('settings', {}) }; },
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
  addHistory(plan, minutes) {
    const h = this.history;
    h.unshift({ date: dayKey(new Date()), plan, minutes: Math.max(1, Math.round(minutes)) });
    set('history', h.slice(0, 400));
  },
  setHistory(h) { set('history', h); },
  setFavs(f) { set('favs', f); },
};

export const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function streak(history, today = new Date()) {
  const days = new Set(history.map((h) => h.date));
  let n = 0; const d = new Date(today);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not yet practiced does not break the streak
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
