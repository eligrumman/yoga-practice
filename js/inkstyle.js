// Optional "ink" figure style: a hairline warm contour around the silhouette, hands and feet, flat cel shading on the body,
// a calm soft-shaded face. Off by default.
// On when the URL query says ?style=ink (override; hash routes keep working: /?style=ink#/pose/tree)
// or the user picked "קו מצויר" in the settings (localStorage key yoga.style = 'ink').
export const INK_KEY = 'yoga.style';
export function inkRequested(search) {
  try { return new URLSearchParams(search ?? (typeof location !== 'undefined' ? location.search : '')).get('style') === 'ink'; } catch { return false; }
}
export function inkStored() {
  try { return localStorage.getItem(INK_KEY) === 'ink'; } catch { return false; }
}
export const inkOn = (search) => inkRequested(search) || inkStored();

const subs = new Set();
export const inkStyle = {
  get on() { return inkOn(); },
  get forced() { return inkRequested(); }, // the URL override wins over the stored choice
  set(on) { try { localStorage.setItem(INK_KEY, on ? 'ink' : 'plain'); } catch { /* private mode: no persistence */ } subs.forEach((f) => f()); },
  onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
};

// the face and head keep the soft gradient even in ink mode (no cel crescent across the cheek)
export const inkSoftId = (id) => id.startsWith('h_');
// hands and feet keep a thin inner line so they read against the body; every other interior joint line is dropped
export const inkEdgeId = (id) => /^(palm|thumb|fing|foot|toes)/.test(id);
// no outline at all on the nose and ears; the head and hair get the thinnest silhouette
export const inkTwinK = (id) => (id === 'h_nose' || id.startsWith('h_ear') ? 0 : id === 'h_head' || id.startsWith('h_hair') || id === 'h_bun' ? 0.75 : 1);

