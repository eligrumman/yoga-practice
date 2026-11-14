// Loads poses/<id>.json (the single source of truth for pose motion) and attaches it as `pose.spec`.
// Browser: fetch relative to this module. Node (tests, tools): read from disk.
import { fullFrame, overlay } from './rig.js';

const isNode = typeof window === 'undefined';
const cache = new Map();

async function readJSON(rel) {
  if (isNode) {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    return JSON.parse(await readFile(fileURLToPath(new URL('../poses/' + rel, import.meta.url)), 'utf8'));
  }
  const r = await fetch(new URL('../poses/' + rel, import.meta.url));
  if (!r.ok) throw new Error(`poses/${rel}: HTTP ${r.status}`);
  return r.json();
}

// Normalise a raw spec: every start/hold/sequence frame is full; alt stays a partial overlay plus a resolved full frame.
export function prepareSpec(raw) {
  const spec = { ...raw, start: fullFrame(raw.start) };
  spec.levels = raw.levels.map((l) => {
    const hold = fullFrame(l.hold);
    const seqFull = l.seq?.map((s) => ({ ...s, frame: fullFrame(s.frame) })) || null;
    return { ...l, hold, seqFull, altFull: l.alt ? overlay(hold, l.alt) : null, props: l.props || [] };
  });
  return spec;
}

export async function loadSpec(id) {
  if (!cache.has(id)) cache.set(id, readJSON(id + '.json').then(prepareSpec));
  return cache.get(id);
}

// Attach pose.spec to every pose in the list; rejects if any spec is missing.
export async function attachSpecs(poses) {
  await Promise.all(poses.map(async (p) => { p.spec = await loadSpec(p.id); }));
  return poses;
}
