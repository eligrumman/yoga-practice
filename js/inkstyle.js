// Optional "ink" figure style: dark hand-inked contour + flat cel shading. Off by default.
// Enabled with the URL query ?style=ink (hash routes keep working: /?style=ink#/pose/tree).
// Preview only: nothing here changes the default rendering.
export function inkRequested(search) {
  try { return new URLSearchParams(search ?? (typeof location !== 'undefined' ? location.search : '')).get('style') === 'ink'; } catch { return false; }
}
export const inkOn = (search) => inkRequested(search);
// small stable per-id factor in [0.85, 1.15] so the line weight varies slightly from part to part, like a pen
export function inkJitter(id) {
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 0.85 + 0.3 * ((h % 97) / 96);
}
