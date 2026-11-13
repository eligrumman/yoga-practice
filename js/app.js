import { POSES, POSE_BY_ID, CATEGORIES, CATEGORY_LABELS, LEVEL_LABELS } from '../data/poses.js';
import { PRESETS, STARTER_PATH, ALL_PRESETS } from '../data/plans-preset.js';
import { Figure, Animator, renderStatic } from './figure.js';
import { planSeconds, fmtTime, itemSeconds, exportPlanJSON, parsePlanJSON, cleanItem, BREATH_SEC, holdSeconds, clampAmount, amountRange as amountRangeOf, dropIndex, reorder } from './plan.js';
import { generatePlan, FOCUSES, LENGTHS, GEN_LEVELS } from './generator.js';
import { store, streak, histMinutes, DEFAULT_SETTINGS } from './store.js';
import { tr, UI_LANGS, DIR, nPoses } from './i18n.js';
import { Narrator } from './narrator.js';
import { Player } from './player.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const $ = (s, r = document) => r.querySelector(s);
export const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, ''); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
const svgEl = (cls) => { const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('class', cls); return s; };

let lang = store.lang; if (!UI_LANGS.includes(lang)) lang = 'he';
const T = (k, s) => tr(k, lang, s);
const main = $('#app');
const narrator = new Narrator();
window.__narrator = narrator; // test hook: narrator.spoken lists every segment spoken
let cleanup = null; // called when leaving a view
const toastEl = $('#toast');
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('show'), 2200); }

function applyLang() {
  document.documentElement.lang = lang; document.documentElement.dir = DIR[lang];
  document.title = `${T('appName')} · ${T('navLibrary')}`;
  $('#nav-home').textContent = T('navHome'); $('#nav-lib').textContent = T('navLibrary'); $('#nav-plans').textContent = T('navPlans');
  $('#brand').textContent = T('appName');
  $('#disc').textContent = T('disclaimer'); $('#priv').textContent = T('privacy');
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', b.dataset.lang === lang);
}
for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => {
  lang = b.dataset.lang; store.lang = lang; applyLang(); applyNarr(); route();
});
function applyNarr() {
  const s = store.settings;
  narrator.setLang(s.narrLang || lang); narrator.mute = s.mute; narrator.volume = s.volume;
}
applyNarr(); narrator.loadManifest();

const minutesOf = (items, mult = 1, tr_ = 5) => Math.round(planSeconds(items, tr_, mult) / 60);
const levelBadge = (n) => el('span', { class: `badge lv${n}` }, LEVEL_LABELS[n][lang]);
const stars = (n) => '●'.repeat(n) + '○'.repeat(3 - n);
const poseName = (p) => p[lang];

// ---------------- routing ----------------
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [view, ...rest] = h.split('/');
  return { view: view || 'home', id: decodeURIComponent(rest.join('/')) };
}
function route() {
  if (cleanup) { try { cleanup(); } catch { /* none */ } cleanup = null; }
  const { view, id } = parseHash();
  document.body.dataset.view = view;
  for (const a of document.querySelectorAll('nav a')) a.classList.toggle('on', a.dataset.v === view || (view === 'plan' && a.dataset.v === 'plans') || (view === 'pose' && a.dataset.v === 'library'));
  main.replaceChildren();
  window.scrollTo(0, 0);
  try {
    if (view === 'home') cleanup = viewHome();
    else if (view === 'library') cleanup = viewLibrary();
    else if (view === 'pose') cleanup = viewPose(id);
    else if (view === 'plans') cleanup = viewPlans();
    else if (view === 'plan') cleanup = viewPlan(id);
    else if (view === 'player') cleanup = viewPlayer(id);
    else main.append(el('p', { class: 'empty' }, T('notFound')));
  } catch (e) { console.error(e); main.append(el('p', { class: 'empty' }, String(e))); }
}
window.addEventListener('hashchange', route);
const go = (h) => { location.hash = h; };

// find a plan by id: saved plan, or preset "preset:<id>"
function resolvePlan(id) {
  if (id.startsWith('preset:')) {
    const p = ALL_PRESETS.find((x) => x.id === id.slice(7));
    return p ? { id, name: p.name[lang], items: p.items.map(cleanItem), preset: p } : null;
  }
  const p = store.getPlan(id);
  return p ? { ...p } : null;
}
function copyPreset(p) {
  const rec = store.upsertPlan({ id: store.newId(), name: p.name[lang], items: p.items.map(cleanItem) });
  toast(T('copied')); return rec;
}

// ---------------- home ----------------
function presetCard(p) {
  const mins = p.minutes;
  return el('article', { class: 'card preset' },
    el('div', { class: 'preset-top' },
      el('h3', {}, p.name[lang]), // starter names already begin with "Day N:"
      el('div', { class: 'meta' }, el('span', { class: 'badge' }, `${mins} ${T('min')}`), levelBadge(p.level))),
    el('p', {}, p.desc[lang]),
    el('div', { class: 'row-btns' },
      el('button', { class: 'btn primary', onclick: () => go(`/player/preset:${p.id}`) }, '▶ ' + T('play')),
      el('button', { class: 'btn', onclick: () => copyPreset(p) }, T('copy'))));
}
function viewHome() {
  const hist = store.history; const st = streak(hist);
  main.append(
    el('section', { class: 'hero' },
      el('h1', {}, T('appName')), el('p', { class: 'lead' }, T('tagline')),
      el('div', { class: 'row-btns' },
        el('button', { class: 'btn primary xl', id: 'btn-gen', onclick: openGenerator }, '✨ ' + T('firstPlan')),
        el('a', { class: 'btn xl', href: '#/library' }, T('navLibrary')))),
    el('section', {}, el('h2', {}, T('presets')), el('div', { class: 'grid cards', id: 'presets' }, PRESETS.map(presetCard))),
    el('section', {}, el('h2', {}, T('starter')), el('p', { class: 'hint' }, T('starterHint')), el('div', { class: 'grid cards', id: 'starter' }, STARTER_PATH.map(presetCard))),
    settingsSection(),
    el('section', {}, el('h2', {}, T('history')),
      hist.length ? el('div', {}, el('p', { class: 'stat' }, `${T('streak')}: ${st}`),
        el('ul', { class: 'hist' }, hist.slice(0, 8).map((h) => el('li', {}, `${h.date} · ${h.plan} · ${histMinutes(h)} ${T('min')}`)))) : el('p', { class: 'hint' }, T('noHistory'))));
  return null;
}
function settingsSection() {
  const s = store.settings;
  const sel = (opts, val, fn) => { const e = el('select', { onchange: (ev) => fn(ev.target.value) }); for (const [v, t] of opts) e.append(el('option', { value: v, selected: String(v) === String(val) }, t)); return e; };
  return el('section', { class: 'card settings' }, el('h2', {}, T('pace')),
    el('label', { class: 'row' }, el('span', {}, T('holdMult')), sel([[0.75, '0.75×'], [1, '1×'], [1.5, '1.5×']], s.holdMult, (v) => store.saveSettings({ holdMult: +v }))),
    el('label', { class: 'row' }, el('span', {}, T('transition')), sel([[3, '3 ' + T('sec')], [5, '5 ' + T('sec')], [8, '8 ' + T('sec')]], s.transition, (v) => store.saveSettings({ transition: +v }))),
    el('label', { class: 'row' }, el('span', {}, T('density')), sel(['minimal', 'standard', 'full'].map((d) => [d, T('dens', d)]), s.density, (v) => store.saveSettings({ density: v }))),
    el('label', { class: 'row' }, el('span', {}, T('narrLang')), sel([['', T('sameAsUI')], ['he', 'עברית'], ['ru', 'Русский'], ['en', 'English']], s.narrLang, (v) => { store.saveSettings({ narrLang: v }); applyNarr(); })));
}

// ---------------- generator dialog ----------------
function openGenerator() {
  const dlg = $('#dlg'); dlg.replaceChildren();
  let minutes = 20, focus = 'general', level = 'beginner'; const avoid = new Set();
  const radios = (name, opts, val, fn) => el('div', { class: 'seg-ctl', role: 'radiogroup' }, opts.map(([v, t]) =>
    el('label', { class: 'chip' }, el('input', { type: 'radio', name, value: v, checked: String(v) === String(val), onchange: () => fn(v) }), el('span', {}, t))));
  dlg.append(el('form', { method: 'dialog', class: 'dlg-body' },
    el('h2', {}, T('genTitle')),
    el('fieldset', {}, el('legend', {}, T('genLength')), radios('len', LENGTHS.map((m) => [m, `${m} ${T('min')}`]), minutes, (v) => { minutes = +v; })),
    el('fieldset', {}, el('legend', {}, T('genFocus')), radios('foc', FOCUSES.map((f) => [f, T('focus', f)]), focus, (v) => { focus = v; })),
    el('fieldset', {}, el('legend', {}, T('genLevel')), radios('lev', GEN_LEVELS.map((l) => [l, T('glevel', l)]), level, (v) => { level = v; })),
    el('details', {}, el('summary', {}, T('genAvoid')),
      el('div', { class: 'avoid' }, POSES.filter((p) => p.section !== 'rest').map((p) =>
        el('label', { class: 'chip sm' }, el('input', { type: 'checkbox', onchange: (e) => { e.target.checked ? avoid.add(p.id) : avoid.delete(p.id); } }), el('span', {}, poseName(p)))))),
    el('div', { class: 'row-btns' },
      el('button', { class: 'btn primary', id: 'gen-go', value: 'go', onclick: (e) => {
        e.preventDefault();
        const g = generatePlan({ minutes, focus, level, avoid: [...avoid] });
        const rec = store.upsertPlan({ id: store.newId(), name: g.name[lang], items: g.items });
        dlg.close(); go(`/plan/${rec.id}`);
      } }, T('genGo')),
      el('button', { class: 'btn', value: 'cancel' }, T('cancel')))));
  dlg.showModal();
}
$('#btn-gen-top')?.addEventListener('click', openGenerator);

// ---------------- library ----------------
function viewLibrary() {
  const q = { text: '', cat: '', lvl: '', fav: false };
  const grid = el('div', { class: 'grid poses', id: 'pose-grid' }); const count = el('span', { class: 'hint' });
  const draw = () => {
    const favs = store.favorites; const t = q.text.trim().toLowerCase();
    const list = POSES.filter((p) =>
      (!q.cat || p.category === q.cat) && (!q.lvl || p.difficulty === +q.lvl) && (!q.fav || favs.includes(p.id)) &&
      (!t || [p.sanskrit, p.en, p.he, p.ru, p.id].some((x) => x.toLowerCase().includes(t))));
    grid.replaceChildren(...list.map((p) => {
      const svg = svgEl('fig card-fig'); renderStatic(svg, p, 1);
      return el('a', { class: 'card pose-card', href: `#/pose/${p.id}` }, svg,
        el('div', { class: 'pc-body' }, el('h3', {}, poseName(p)), el('div', { class: 'sans' }, p.sanskrit),
          el('div', { class: 'meta' }, el('span', { class: 'badge' }, CATEGORY_LABELS[p.category][lang]), el('span', { class: 'dots', title: T('difficulty') }, stars(p.difficulty)), favs.includes(p.id) ? el('span', { class: 'fav-on', 'aria-label': T('star') }, '★') : null)));
    }));
    if (!list.length) grid.append(el('p', { class: 'empty' }, T('none')));
    count.textContent = nPoses(list.length, lang);
  };
  const sel = (id, label, opts, fn) => { const s = el('select', { id, 'aria-label': label, onchange: (e) => fn(e.target.value) }); for (const [v, t] of opts) s.append(el('option', { value: v }, t)); return s; };
  main.append(el('h1', {}, T('navLibrary')),
    el('div', { class: 'filters' },
      el('input', { type: 'search', id: 'q', placeholder: T('search'), 'aria-label': T('search'), oninput: (e) => { q.text = e.target.value; draw(); } }),
      sel('f-cat', T('category'), [['', T('allCats')], ...CATEGORIES.map((c) => [c, CATEGORY_LABELS[c][lang]])], (v) => { q.cat = v; draw(); }),
      sel('f-lvl', T('levels'), [['', T('allLevels')], ['1', LEVEL_LABELS[0][lang]], ['2', LEVEL_LABELS[1][lang]], ['3', LEVEL_LABELS[2][lang]]], (v) => { q.lvl = v; draw(); }),
      el('label', { class: 'chip' }, el('input', { type: 'checkbox', id: 'f-fav', onchange: (e) => { q.fav = e.target.checked; draw(); } }), el('span', {}, '★ ' + T('favOnly')))),
    count, grid);
  draw(); return null;
}

// ---------------- pose page ----------------
function viewPose(id) {
  const p = POSE_BY_ID[id];
  if (!p) { main.append(el('p', { class: 'empty' }, T('notFound'))); return null; }
  let level = 1, speed = 1;
  const svg = svgEl('fig big'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', poseName(p));
  const fig = new Figure(svg); const anim = new Animator(fig);
  const tabs = el('div', { class: 'tabs', role: 'tablist' });
  const varText = el('p', { class: 'var-text' }); const propsLine = el('p', { class: 'props' });
  const playBtn = el('button', { class: 'btn', id: 'pp', onclick: () => { anim.setPlaying(!anim.playing); playBtn.textContent = anim.playing ? '⏸ ' + T('pause') : '▶ ' + T('resume'); } }, '⏸ ' + T('pause'));
  const setLevel = (n) => {
    level = n; anim.set(p, n, { mode: 'loop' });
    anim.time = 3.4; anim.frame(anim.time); // open on the finished pose, not on the loop's start frame
    for (const b of tabs.children) { b.setAttribute('aria-selected', b.dataset.l == n); }
    const v = p.variations[n];
    varText.textContent = v[lang];
    propsLine.textContent = `${T('props')}: ` + (v.props.length ? v.props.map((x) => T('prop', x)).join(', ') : T('noProps'));
  };
  [0, 1, 2].forEach((n) => tabs.append(el('button', { class: 'tab', role: 'tab', 'data-l': n, id: `lv${n}`, onclick: () => setLevel(n) }, LEVEL_LABELS[n][lang])));
  const fav = el('button', { class: 'btn icon', id: 'fav', 'aria-label': T('star'), onclick: () => { const on = store.toggleFav(p.id); fav.textContent = on ? '★' : '☆'; } }, store.favorites.includes(p.id) ? '★' : '☆');
  const plans = store.plans;
  const addSel = el('select', { id: 'add-sel', 'aria-label': T('addTo') }, el('option', { value: '' }, T('addTo')), el('option', { value: '__new' }, T('newPlan')), plans.map((x) => el('option', { value: x.id }, x.name)));
  addSel.addEventListener('change', () => {
    const v = addSel.value; if (!v) return;
    const item = { pose: p.id, level, unit: 'sec', amount: p.holdSeconds };
    let rec;
    if (v === '__new') rec = store.upsertPlan({ id: store.newId(), name: T('newPlan'), items: [item] });
    else { rec = store.getPlan(v); rec.items.push(item); store.upsertPlan(rec); }
    toast(T('saved') + ': ' + rec.name); addSel.value = '';
  });
  main.append(
    el('a', { class: 'back', href: '#/library' }, (DIR[lang] === 'rtl' ? '→ ' : '← ') + T('back')),
    el('div', { class: 'pose-page' },
      el('div', { class: 'pose-stage' }, svg,
        tabs, el('div', { class: 'row-btns' }, playBtn,
          el('label', { class: 'row inline' }, el('span', {}, T('speed')), el('select', { id: 'spd', onchange: (e) => { speed = +e.target.value; anim.setSpeed(speed); } }, [0.5, 0.75, 1, 1.5].map((s) => el('option', { value: s, selected: s === 1 }, s + '×'))))),
        varText, propsLine),
      el('div', { class: 'pose-info' },
        el('div', { class: 'title-row' }, el('h1', {}, poseName(p)), fav),
        el('div', { class: 'sans' }, `${p.sanskrit} · ${p.en}`),
        el('div', { class: 'meta' }, el('span', { class: 'badge' }, CATEGORY_LABELS[p.category][lang]), el('span', { class: 'dots' }, stars(p.difficulty)),
          el('span', { class: 'badge' }, `${T('hold')}: ${p.holdSeconds} ${T('sec')}` + (p.sides === 'both' ? ` · ${T('sides', 'both')}` : ''))),
        el('h3', {}, T('cues')), el('ol', { class: 'cues' }, p.cues[lang].map((c) => el('li', {}, c))),
        el('div', { class: 'note safety' }, el('strong', {}, '⚠ ' + T('safety') + ': '), p.safety[lang]),
        el('div', { class: 'note easier' }, el('strong', {}, '✓ ' + T('easier') + ': '), p.variations[0][lang]),
        el('div', { class: 'row-btns' }, addSel))));
  setLevel(1); anim.start();
  return () => anim.stop();
}

// ---------------- plans list ----------------
function downloadText(name, text) {
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const slug = (s) => (s || 'plan').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'plan';
function importFile(file, done) {
  const r = new FileReader();
  r.onload = () => {
    const res = parsePlanJSON(String(r.result));
    if (res.error) { toast(`${T('importBad')}: ${res.error}`); return; }
    const rec = store.upsertPlan({ id: store.newId(), ...res.plan });
    toast(T('importOk')); done(rec);
  };
  r.readAsText(file);
}
function viewPlans() {
  const list = el('div', { class: 'grid cards' });
  const fileIn = el('input', { type: 'file', accept: '.json,application/json', hidden: true, id: 'import-file', onchange: (e) => { const f = e.target.files[0]; if (f) importFile(f, (rec) => go(`/plan/${rec.id}`)); e.target.value = ''; } });
  const draw = () => {
    const plans = store.plans;
    list.replaceChildren(...(plans.length ? plans.map((p) => el('article', { class: 'card plan-card' },
      el('h3', {}, p.name), el('div', { class: 'meta' }, el('span', { class: 'badge' }, nPoses(p.items.length, lang)), el('span', { class: 'badge' }, `${fmtTime(planSeconds(p.items))}`)),
      el('div', { class: 'row-btns' },
        el('a', { class: 'btn primary', href: `#/player/${p.id}` }, '▶ ' + T('play')),
        el('a', { class: 'btn', href: `#/plan/${p.id}` }, T('open')),
        el('button', { class: 'btn', onclick: () => downloadText(`${slug(p.name)}.json`, exportPlanJSON(p)) }, T('export')),
        el('button', { class: 'btn danger', onclick: () => { if (confirm(T('confirmDel'))) { store.deletePlan(p.id); draw(); } } }, T('del'))))) : [el('p', { class: 'empty' }, T('noPlans'))]));
  };
  main.append(el('h1', {}, T('plansTitle')),
    el('div', { class: 'row-btns' },
      el('button', { class: 'btn primary', id: 'new-plan', onclick: () => { const r = store.upsertPlan({ id: store.newId(), name: T('newPlan'), items: [] }); go(`/plan/${r.id}`); } }, '＋ ' + T('newPlan')),
      el('button', { class: 'btn', onclick: openGenerator }, '✨ ' + T('firstPlan')),
      el('button', { class: 'btn', onclick: () => fileIn.click() }, T('import')), fileIn),
    list, el('h2', {}, T('history')),
    store.history.length ? el('ul', { class: 'hist' }, store.history.slice(0, 20).map((h) => el('li', {}, `${h.date} · ${h.plan} · ${histMinutes(h)} ${T('min')}`))) : el('p', { class: 'hint' }, T('noHistory')));
  draw(); return null;
}

// ---------------- plan builder ----------------
function viewPlan(id) {
  const plan = store.getPlan(id);
  if (!plan) { main.append(el('p', { class: 'empty' }, T('notFound'))); return null; }
  const listEl = el('ol', { class: 'items', id: 'items' });
  const totalEl = el('div', { class: 'total', id: 'total' });
  const savedEl = el('span', { class: 'save-state', id: 'save-state', role: 'status', 'aria-live': 'polite' }, T('savedAuto'));
  const flashSaved = () => { savedEl.textContent = T('savedAuto'); savedEl.classList.add('flash'); clearTimeout(flashSaved.t); flashSaved.t = setTimeout(() => savedEl.classList.remove('flash'), 1500); };
  const save = () => { store.upsertPlan(plan); totalEl.textContent = `${T('total')}: ${fmtTime(planSeconds(plan.items))} \u00b7 ${nPoses(plan.items.length, lang)}`; flashSaved(); };
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= plan.items.length) return; plan.items = reorder(plan.items, i, j); save(); draw(); };
  const row = (it, i) => {
    const p = POSE_BY_ID[it.pose];
    const svg = svgEl('fig item-fig'); renderStatic(svg, p, it.level);
    const note = el('div', { class: 'clamp-note', role: 'status', 'aria-live': 'polite' });
    const amt = el('input', { class: 'amt', type: 'number', inputmode: 'numeric', min: amountRangeOf(it.unit).min, max: amountRangeOf(it.unit).max, value: it.amount, 'aria-label': T('hold') });
    const applyAmount = () => {
      const r = clampAmount(amt.value, it.unit);
      it.amount = r.value; amt.value = r.value;
      amt.min = r.range.min; amt.max = r.range.max;
      const u = it.unit === 'breath' ? T('unitBreath') : T('sec');
      note.textContent = r.clamped ? `${T('valueAdjusted')}: ${T(r.clamped === 'min' ? 'atLeast' : 'atMost')} ${r.range[r.clamped]} ${u}` : '';
      clearTimeout(note.t); if (r.clamped) note.t = setTimeout(() => { note.textContent = ''; }, 4000);
      save();
    };
    amt.addEventListener('change', applyAmount);
    const li = el('li', { class: 'item', 'data-i': i },
      el('button', { class: 'handle', 'aria-label': T('drag'), title: T('drag') }, '\u283f'),
      el('a', { href: `#/pose/${p.id}`, class: 'item-fig-wrap', tabindex: -1 }, svg),
      el('div', { class: 'item-main' },
        el('div', { class: 'item-name' }, `${i + 1}. ${poseName(p)}`, p.sides === 'both' ? el('span', { class: 'badge' }, '\u00d72') : null),
        el('div', { class: 'item-ctl' },
          el('select', { class: 'lv', 'aria-label': T('levels'), onchange: (e) => { it.level = +e.target.value; save(); draw(); } }, [0, 1, 2].map((n) => el('option', { value: n, selected: it.level === n }, LEVEL_LABELS[n][lang]))),
          amt,
          el('select', { class: 'unit', 'aria-label': T('hold'), onchange: (e) => { it.unit = e.target.value; applyAmount(); } }, el('option', { value: 'sec', selected: it.unit === 'sec' }, T('unitSec')), el('option', { value: 'breath', selected: it.unit === 'breath' }, T('unitBreath'))),
          note)),
      el('div', { class: 'item-btns' },
        el('button', { class: 'btn icon', 'aria-label': T('up'), title: T('up'), onclick: () => move(i, -1) }, '\u2191'),
        el('button', { class: 'btn icon', 'aria-label': T('down'), title: T('down'), onclick: () => move(i, 1) }, '\u2193'),
        el('button', { class: 'btn icon dup', 'aria-label': T('dup'), title: T('dup'), onclick: () => { plan.items.splice(i + 1, 0, { ...it }); save(); draw(); } }, '\u29c9'),
        el('button', { class: 'btn icon danger', 'aria-label': T('remove'), title: T('remove'), onclick: () => { plan.items.splice(i, 1); save(); draw(); } }, '\u2715')));
    enableDrag(li, i);
    return li;
  };
  // pointer-events drag & drop (mouse + touch): drag the handle
  function enableDrag(li, from) {
    const h = li.querySelector('.handle');
    h.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); h.setPointerCapture(ev.pointerId);
      const items = [...listEl.children]; const rects = items.map((x) => x.getBoundingClientRect());
      const centers = rects.map((r) => r.top + r.height / 2);
      const startY = ev.clientY; let to = from;
      li.classList.add('dragging');
      const onMove = (e) => {
        const dy = e.clientY - startY; li.style.transform = `translateY(${dy}px)`;
        to = dropIndex(centers, centers[from] + dy);
        items.forEach((x, k) => { if (x === li) return; let shift = 0; if (from < to && k > from && k <= to) shift = -rects[from].height; if (from > to && k >= to && k < from) shift = rects[from].height; x.style.transform = shift ? `translateY(${shift}px)` : ''; });
      };
      const end = () => {
        h.removeEventListener('pointermove', onMove); h.removeEventListener('pointerup', end); h.removeEventListener('pointercancel', end);
        if (to !== from) { plan.items = reorder(plan.items, from, to); save(); }
        draw();
      };
      h.addEventListener('pointermove', onMove); h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    });
  }
  const draw = () => {
    listEl.replaceChildren(...(plan.items.length ? plan.items.map(row) : [el('li', { class: 'empty' }, T('empty'))]));
    totalEl.textContent = `${T('total')}: ${fmtTime(planSeconds(plan.items))} \u00b7 ${nPoses(plan.items.length, lang)}`;
  };
  // picker
  const pick = el('select', { id: 'pick', 'aria-label': T('addPose') }, POSES.map((p) => el('option', { value: p.id }, `${poseName(p)} — ${p.sanskrit}`)));
  const nameIn = el('input', { type: 'text', id: 'plan-name', value: plan.name, maxlength: 80, 'aria-label': T('planName'), oninput: (e) => { plan.name = e.target.value || T('newPlan'); store.upsertPlan(plan); flashSaved(); } });
  main.append(
    el('a', { class: 'back', href: '#/plans' }, (DIR[lang] === 'rtl' ? '→ ' : '← ') + T('plansTitle')),
    el('div', { class: 'plan-head' }, nameIn, el('div', { class: 'plan-meta' }, totalEl, savedEl)),
    el('div', { class: 'row-btns' },
      el('a', { class: 'btn primary', id: 'play-plan', href: `#/player/${plan.id}` }, '▶ ' + T('playPlan')),
      el('button', { class: 'btn', id: 'export', onclick: () => downloadText(`${slug(plan.name)}.json`, exportPlanJSON(plan)) }, T('export')),
      el('button', { class: 'btn', onclick: () => $('#import-here').click() }, T('import')),
      el('input', { type: 'file', id: 'import-here', accept: '.json,application/json', hidden: true, onchange: (e) => { const f = e.target.files[0]; if (f) importFile(f, (rec) => go(`/plan/${rec.id}`)); e.target.value = ''; } }),
      el('button', { class: 'btn danger', onclick: () => { if (confirm(T('confirmDel'))) { store.deletePlan(plan.id); go('/plans'); } } }, T('del'))),
    listEl,
    el('div', { class: 'add-row' }, pick, el('button', { class: 'btn primary', id: 'add', onclick: () => {
      const p = POSE_BY_ID[pick.value]; plan.items.push({ pose: p.id, level: 1, unit: 'sec', amount: p.holdSeconds }); save(); draw();
    } }, '＋ ' + T('addPose'))));
  draw(); return null;
}

// ---------------- player view ----------------
function viewPlayer(id) {
  const plan = resolvePlan(id);
  if (!plan || !plan.items.length) { main.append(el('p', { class: 'empty' }, T('notFound'))); return null; }
  const box = el('div', { id: 'player-root' }); main.append(box);
  document.body.classList.add('in-player');
  const s = store.settings;
  const player = new Player(box, { plan, narrator, lang, onExit: (home) => { if (home) go('/home'); else history.length > 1 ? history.back() : go('/home'); } });
  window.__player = player;
  player.start();
  return () => { document.body.classList.remove('in-player'); (player.successor || player).destroy(); };
}

applyLang();
route();
if ('serviceWorker' in navigator && false) navigator.serviceWorker.register('sw.js');
