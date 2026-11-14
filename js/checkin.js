// End-of-session check-in: "how was it?" -> suggests which ready-made plan to try next.
// Pure function, no DOM. presets: [{id, minutes, level}]; current: {id?, minutes, level?}.
export const FEELS = ['easy', 'ok', 'hard'];
export function suggestNext(feel, current, presets) {
  const cur = String(current.id || '').replace(/^preset:/, '');
  const list = presets.filter((p) => p.id !== cur);
  if (!list.length) return null;
  const m = current.minutes || 0, lvl = current.level ?? 0;
  const by = (f, cmp) => list.filter(f).sort(cmp)[0];
  const asc = (a, b) => a.minutes - b.minutes, desc = (a, b) => b.minutes - a.minutes;
  if (feel === 'easy') return by((p) => p.minutes > m || p.level > lvl, asc) || [...list].sort(desc)[0]; // a bit longer or a step harder
  if (feel === 'hard') return by((p) => p.level === 0 && p.minutes <= m, desc) || [...list].sort(asc)[0]; // shorter and gentle
  const near = (a, b) => Math.abs(a.minutes - m) - Math.abs(b.minutes - m); // just right: same level, similar length, a different plan
  return by((p) => p.level === lvl, near) || [...list].sort(near)[0];
}
