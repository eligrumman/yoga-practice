// Ink figure style is the only style (Owner decision): a hairline warm contour around the silhouette, hands and feet,
// flat cel shading on the body, a calm soft-shaded face. No setting, no URL override.
// The plain (non-ink) branches in figure2d.js / figure3d.js are kept but unreachable (ink is always passed as true by default);
// removing them is riskier than leaving them.
export const inkOn = () => true;
// drop the retired setting from old installs
try { localStorage.removeItem('yoga.style'); } catch { /* no storage */ }

// the face and head keep the soft gradient even in ink mode (no cel crescent across the cheek)
export const inkSoftId = (id) => id.startsWith('h_');
// hands and feet keep a thin inner line so they read against the body; every other interior joint line is dropped
export const inkEdgeId = (id) => /^(palm|thumb|fing|foot|toes)/.test(id);
// no outline at all on the nose and ears; the head and hair get the thinnest silhouette
export const inkTwinK = (id) => (id === 'h_nose' || id.startsWith('h_ear') ? 0 : id === 'h_head' || id.startsWith('h_hair') || id === 'h_bun' ? 0.75 : 1);

