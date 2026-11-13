// Pose tuner: edit poses/<id>.json joint by joint, preview live in 2D/3D, export the same JSON format.
import { JOINTS, AXES, limitOf, validateFrame, fullFrame, overlay, blendFrames, swapLR, round1 } from './rig.js';
import { Figure, viewToggle, poseFrames } from './figure.js';
import { fitView } from './figure2d.js';
import { serializeSpec } from './specfmt.js';
import { prepareSpec } from './specs.js';

const $ = (id) => document.getElementById(id);
const clone = (o) => JSON.parse(JSON.stringify(o));
let ids = [], raw = null, orig = null, fig = null, pendingCam = true, view = null;

const state = { level: 0, frame: 'hold', scrub: 1 };

async function getJSON(rel) { const r = await fetch(new URL('../poses/' + rel, import.meta.url), { cache: 'no-store' }); if (!r.ok) throw new Error(rel + ': ' + r.status); return r.json(); }

// The frame being edited as a full frame (alt is a partial overlay in the file; here it is shown resolved).
function levelRaw() { return raw.levels[state.level]; }
function editFrame() {
  const L = levelRaw();
  if (state.frame === 'start') return raw.start;
  if (state.frame === 'alt') { if (!L.alt) L.alt = {}; return L._altFull || (L._altFull = overlay(fullFrame(L.hold), L.alt)); }
  return L.hold;
}
// alt is saved as only the joints that differ from hold
function altPartial(L) {
  if (!L._altFull) return L.alt;
  const hold = fullFrame(L.hold), a = L._altFull, o = {};
  if (a.pelvis.pos.some((v, i) => v !== hold.pelvis.pos[i]) || a.pelvis.rot.some((v, i) => v !== hold.pelvis.rot[i])) o.pelvis = clone(a.pelvis);
  for (const j of JOINTS) if (j !== 'pelvis' && a[j].some((v, i) => v !== hold[j][i])) o[j] = [...a[j]];
  return Object.keys(o).length ? o : undefined;
}
function exportSpec() {
  const o = clone({ ...raw, levels: raw.levels.map((l) => { const { _altFull, ...r } = l; return r; }) });
  o.start = fullFrame(raw.start);
  raw.levels.forEach((l, i) => {
    o.levels[i].hold = fullFrame(l.hold);
    const a = altPartial(l);
    if (a) o.levels[i].alt = a; else delete o.levels[i].alt;
  });
  return serializeSpec(o);
}

function prepared() { return prepareSpec(JSON.parse(exportSpec())); }

function redraw() {
  const spec = prepared();
  const pose = { id: raw.id, spec };
  const P = poseFrames(pose, state.level);
  const cam = P.camera;
  const shown = state.frame === 'alt' && P.alt ? P.alt : state.frame === 'start' ? P.start : P.hold;
  const frame = state.scrub < 1 ? blendFrames(P.start, P.hold, state.scrub) : shown;
  view = fitView([P.start, P.hold, P.alt].filter(Boolean), cam);
  fig.draw(frame, { props: P.props, e: 1, breath: 0, view, cam: pendingCam ? cam : undefined });
  pendingCam = false;
  $('out').value = exportSpec();
  const errs = [];
  for (const [n, f] of [['start', P.start], ['hold', P.hold], ['alt', P.alt]]) if (f) errs.push(...validateFrame(f, `L${state.level}.${n}`));
  $('warn').textContent = errs.join('\n');
  $('scrubv').textContent = state.scrub >= 1 ? (state.frame === 'alt' ? 'alt' : state.frame) : `${Math.round(state.scrub * 100)}%`;
}

function sliderRow(label, val, lo, hi, step, on, bad) {
  const row = document.createElement('div');
  row.className = 'tn-ax' + (bad ? ' bad' : '');
  const l = document.createElement('span'); l.textContent = label;
  const r = document.createElement('input'); r.type = 'range'; r.min = lo; r.max = hi; r.step = step; r.value = val;
  r.setAttribute('aria-label', label);
  const o = document.createElement('output'); o.textContent = val;
  r.addEventListener('input', () => { const v = round1(+r.value); o.textContent = v; on(v); });
  row.append(l, r, o);
  return row;
}

function buildJoints() {
  const box = $('joints'); box.textContent = '';
  const f = editFrame();
  const mk = (j) => {
    const d = document.createElement('details'); d.className = 'tn-j';
    const s = document.createElement('summary'); s.textContent = j; d.append(s);
    if (j === 'pelvis') {
      AXES.forEach((ax, i) => d.append(sliderRow('rot ' + ax, f.pelvis.rot[i], -180, 180, 0.5, (v) => { f.pelvis.rot[i] = v; redraw(); })));
      AXES.forEach((ax, i) => d.append(sliderRow('pos ' + ax, f.pelvis.pos[i], -60, 80, 0.5, (v) => { f.pelvis.pos[i] = v; redraw(); })));
    } else {
      AXES.forEach((ax, i) => {
        const [lo, hi] = limitOf(j, ax);
        if (lo === hi) return;
        d.append(sliderRow(ax, f[j][i], lo, hi, 0.5, (v) => { f[j][i] = v; redraw(); }));
      });
    }
    return d;
  };
  for (const j of JOINTS) box.append(mk(j));
}

function buildCam() {
  const box = $('cam'); box.textContent = '';
  const L = levelRaw();
  const c = L.camera || raw.camera;
  const set = (k, v) => { const t = L.camera ? L.camera : (raw.camera); t[k] = v; pendingCam = true; redraw(); };
  box.append(sliderRow('az', c.az, -180, 180, 1, (v) => set('az', v)), sliderRow('el', c.el, -10, 80, 1, (v) => set('el', v)));
  box.querySelectorAll('.tn-ax').forEach((r) => { r.style.flex = '1 1 220px'; });
}

async function loadPose(id) {
  raw = await getJSON(id + '.json'); orig = clone(raw);
  raw.levels.forEach((l) => { delete l._altFull; });
  pendingCam = true;
  refresh();
}
function refresh() { buildJoints(); buildCam(); redraw(); }

async function main() {
  ids = await getJSON('index.json');
  const sel = $('pose');
  for (const id of ids) { const o = document.createElement('option'); o.value = o.textContent = id; sel.append(o); }
  fig = new Figure($('svg'), { floor: true });
  $('svg').parentNode.append(viewToggle());
  const hash = decodeURIComponent(location.hash.slice(1));
  const q = new URLSearchParams(location.search);
  const start = ids.includes(q.get('p')) ? q.get('p') : ids.includes(hash) ? hash : ids[0];
  sel.value = start;
  if (q.get('l')) { state.level = +q.get('l') || 0; $('level').value = state.level; }
  sel.addEventListener('change', () => { location.hash = sel.value; loadPose(sel.value); });
  $('level').addEventListener('change', (e) => { state.level = +e.target.value; pendingCam = true; refresh(); });
  $('frame').addEventListener('change', (e) => { state.frame = e.target.value; if (state.scrub < 1) { state.scrub = 1; $('scrub').value = 1; } refresh(); });
  $('scrub').addEventListener('input', (e) => { state.scrub = +e.target.value; redraw(); });
  $('reset').addEventListener('click', () => { raw = clone(orig); raw.levels.forEach((l) => { delete l._altFull; }); pendingCam = true; refresh(); });
  $('copy').addEventListener('click', async () => {
    const t = exportSpec();
    try { await navigator.clipboard.writeText(t); $('copy').textContent = 'Copied'; }
    catch { const o = $('out'); o.closest('details').open = true; o.select(); $('copy').textContent = 'Select + copy below'; }
    setTimeout(() => { $('copy').textContent = 'Copy JSON'; }, 1800);
  });
  $('dl').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportSpec()], { type: 'application/json' }));
    a.download = raw.id + '.json'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  await loadPose(start);
}
main().catch((e) => { document.body.prepend(Object.assign(document.createElement('pre'), { textContent: String(e.stack || e) })); });
