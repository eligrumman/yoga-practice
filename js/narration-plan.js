// Narration v2 planning (pure, no DOM): which segments play when, per narration level.
// Levels: full | short | name | off. Hebrew uses the v2 segments (data/narration-he-v2.js);
// ru/en keep the existing cue ids (full = intro + all cues + mid-hold breath, short = intro + 2 cues, name = intro only, off = silent).
import { INTRO, CLOSE, INTRO_VARIANTS, CLOSE_VARIANTS, POSE_V2 } from '../data/narration-he-v2.js';
import { segText, cueIds } from '../data/narration.js';

export const NARR_LEVELS = ['full', 'short', 'name', 'off'];
// old `density` setting -> new level
export const DENS_MIGRATION = { minimal: 'name', standard: 'short', full: 'full' };
// Effective level from raw saved settings: explicit choice, else migrated density, else 'full' (first-ever session).
export const resolveNarration = (raw) => (NARR_LEVELS.includes(raw?.narration) ? raw.narration : DENS_MIGRATION[raw?.density] || 'full');

export const BUDGET = 0.65;          // speech <= 65% of the hold (Owner default, option A)
export const BREATH_EVERY = 30;      // mid-hold reminder cadence in long holds (s)
export const LONG_HOLD = 45;
export const PAUSE = { afterIntroName: 0.8, afterEntry: 1.5, afterMod: 2, afterAlign: 2 };

export const countWords = (t) => (t || '').trim().split(/\s+/).filter(Boolean).length;
// Measured on the existing Hebrew clips: 2.3 s + 0.65 s per word.
export const estDur = (t) => 2.3 + 0.65 * countWords(t);
export const introVariantKey = (minutes) => (minutes <= 12 ? 'short' : minutes <= 24 ? 'medium' : 'long');

const SESSION_BY_ID = {};
for (const g of [INTRO, CLOSE]) for (const s of Object.values(g)) SESSION_BY_ID[s.id] = s;
const pauseOfSession = (id) => SESSION_BY_ID[id]?.pauseAfter ?? 1;

// every v2 id of a pose (used for preloading clip metadata)
export function poseV2Ids(poseId) {
  const P = POSE_V2[poseId]; if (!P) return [];
  const k = (s) => `pose.${poseId}.${s}`;
  return [...P.entry.map((_, i) => k(`entry.${i + 1}`)), ...P.align.map((_, i) => k(`align.${i + 1}`)), k('breath'), k('mod.L0'), k('mod.L1'), k('mod.L2'), k('exit'), ...(P.side ? [k('side')] : [])];
}
export const sessionIds = () => Object.keys(SESSION_BY_ID);

const it = (id, pause = 0) => ({ id, pause });
const seqTime = (items, dur) => items.reduce((t, x) => t + dur(x.id) + x.pause, 0);
const sumDur = (ids, dur) => ids.reduce((t, id) => t + dur(id), 0);

// ---------- session intro ----------
// Returns [{id, pause}] for the intro phase (before the first pose). Empty when the level has no intro phase.
export function introSeq({ lang, level, minutes }) {
  if (lang !== 'he' || (level !== 'full' && level !== 'short')) return [];
  const variant = level === 'short' ? 'short' : introVariantKey(minutes);
  return INTRO_VARIANTS[variant].keys.map((k) => it(INTRO[k].id, INTRO[k].pauseAfter));
}
export const introSeconds = (seq, dur) => seqTime(seq, dur);

// ---------- one pose slot ----------
// o: {lang, level, poseId, side, sides, hold, lvl (0-2), dur(id), announced, lastSavasana, minutes}
// returns {events:[{t, items:[{id,pause}]}], speech, ids, dropped}
export function slotPlan(o) {
  const { lang, level } = o;
  if (level === 'off') return { events: [], speech: 0, ids: [], dropped: [] };
  return lang === 'he' ? hePlan(o) : legacyPlan(o);
}

const finish = (events, dur, dropped = []) => {
  const ids = events.flatMap((e) => e.items.map((x) => x.id));
  return { events: events.filter((e) => e.items.length), speech: sumDur(ids, dur), ids, dropped };
};

function legacyPlan({ level, poseId, side, hold, dur, announced }) {
  if (side === 1) return finish(announced ? [] : [{ t: 0, items: [it('common.switch_sides')] }], dur);
  const cues = cueIds(poseId);
  const ids = [`pose.${poseId}.intro`];
  if (level === 'short') ids.push(...cues.slice(0, 2)); else if (level === 'full') ids.push(...cues);
  const ev = [{ t: 0, items: ids.map((i) => it(i)) }];
  if (level === 'full' && hold >= 20) ev.push({ t: hold / 2, items: [it('common.breathe_in'), it('common.breathe_out')] });
  return finish(ev, dur);
}

// drop ids (in order) until the speech fits the budget; mandatory ids are never dropped
function fit(list, dropOrder, budget, dur) {
  const kept = list.slice(), dropped = [];
  for (const d of dropOrder) {
    if (sumDur(kept, dur) <= budget) break;
    const i = kept.indexOf(d); if (i >= 0) { kept.splice(i, 1); dropped.push(d); }
  }
  return { kept, dropped };
}

function hePlan(o) {
  const { level, poseId, side, hold, lvl, dur, announced } = o;
  const P = POSE_V2[poseId];
  const k = (s) => `pose.${poseId}.${s}`;
  const intro = k('intro');
  const budget = BUDGET * hold;
  if (!P) return legacyPlan(o);

  // second side
  if (side === 1) {
    if (level !== 'full') return finish(announced ? [] : [{ t: 0, items: [it('common.switch_sides')] }], dur);
    const base = [...(announced ? [] : ['common.switch_sides']), ...(P.side ? [k('side')] : []), ...(P.align.length ? [k('align.1')] : []), ...(hold >= 20 ? [k('breath')] : [])];
    const { kept, dropped } = fit(base, [k('breath'), k('align.1')], budget, dur);
    const head = kept.filter((i) => i !== k('breath'));
    const ev = [{ t: 0, items: head.map((i, n) => it(i, n === head.length - 1 ? 0 : PAUSE.afterEntry)) }];
    if (kept.includes(k('breath'))) ev.push({ t: Math.max(hold / 2, seqTime(ev[0].items, dur) + 1), items: [it(k('breath'))] });
    return finish(ev, dur, dropped);
  }

  if (level === 'name') {
    const ev = [{ t: 0, items: [it(intro)] }];
    if (o.lastSavasana) ev.push({ t: Math.max(dur(intro) + 2, hold - dur('common.savasana_end') - 2), items: [it('common.savasana_end')] });
    return finish(ev, dur);
  }

  if (o.lastSavasana) return savasanaPlan(o);

  const entries = P.entry.map((_, i) => k(`entry.${i + 1}`));
  const aligns = P.align.map((_, i) => k(`align.${i + 1}`));
  const mod = k(`mod.L${lvl}`);
  const breath = k('breath'), exit = k('exit');
  let list, dropOrder;
  if (level === 'full') {
    list = [intro, ...entries, mod, ...aligns, ...(hold >= 20 ? [breath] : []), exit];
    // Owner rule: later align lines go first, then the breath line, then exit and the extra entry steps. Never intro, entry.1, mod.
    dropOrder = [...aligns.slice().reverse(), breath, exit, ...entries.slice(1).reverse()];
  } else { // short
    list = [intro, entries[0], ...(lvl === 0 ? [mod] : []), ...(hold >= 25 ? [breath] : [])];
    dropOrder = [breath];
  }
  const { kept, dropped } = fit(list, dropOrder, budget, dur);
  const main = kept.filter((i) => i !== breath && i !== exit);
  const items = main.map((id, n) => {
    const nxt = main[n + 1];
    let pause = 0;
    if (id === intro) pause = PAUSE.afterIntroName; else if (id.includes('.entry.')) pause = PAUSE.afterEntry; else if (id === mod) pause = PAUSE.afterMod; else if (id.includes('.align.')) pause = PAUSE.afterAlign;
    return it(id, nxt ? pause : 0);
  });
  const ev = [{ t: 0, items }];
  let end = seqTime(items, dur), tBreath = null;
  if (kept.includes(breath)) { tBreath = Math.max(hold / 2, end + 1.5); ev.push({ t: tBreath, items: [it(breath)] }); end = tBreath + dur(breath); }
  if (kept.includes(exit)) { const t = Math.max(end + 1, Math.min(hold - 8, hold - dur(exit) - 0.5)); ev.push({ t, items: [it(exit)] }); end = t + dur(exit); }
  // mid-hold breath reminders in long holds (full only), only while the budget allows
  if (level === 'full' && hold >= LONG_HOLD) {
    let used = sumDur(kept, dur);
    const mainEnd = seqTime(items, dur);
    for (let t = BREATH_EVERY; t <= hold - 15; t += BREATH_EVERY) {
      if (t < mainEnd + 2 || (tBreath != null && Math.abs(t - tBreath) < 10)) continue;
      const d = dur('common.breathe_slow');
      if (used + d > budget) break;
      used += d; ev.push({ t, items: [it('common.breathe_slow')] });
    }
  }
  ev.sort((a, b) => a.t - b.t);
  return finish(ev, dur, dropped);
}

// last pose is Savasana (full/short): its own entry/breath + the session closing replace savasana align/mod.
function savasanaPlan(o) {
  const { level, hold, dur, minutes } = o;
  const P = POSE_V2.savasana;
  const intro = 'pose.savasana.intro';
  const entries = P.entry.map((_, i) => `pose.savasana.entry.${i + 1}`);
  const first = level === 'short' ? 'short' : introVariantKey(minutes);
  const order = ['long', 'medium', 'short'].slice(['long', 'medium', 'short'].indexOf(first));
  const build = (variant, fullEntry) => {
    const keys = CLOSE_VARIANTS[variant].keys;
    const iOut = keys.indexOf('out1');
    const pre = keys.slice(0, iOut), out = keys.slice(iOut);
    const A = [it(intro, PAUSE.afterIntroName), ...(fullEntry && level === 'full' ? entries : entries.slice(0, 1)).map((id) => it(id, PAUSE.afterEntry)),
      ...(fullEntry && level === 'full' ? [it('pose.savasana.breath', 2)] : []),
      ...pre.map((kk) => it(CLOSE[kk].id, CLOSE[kk].pauseAfter))];
    const B = out.map((kk, n) => it(CLOSE[kk].id, n === out.length - 1 ? 0 : CLOSE[kk].pauseAfter));
    return { A, B };
  };
  let pick = null;
  const cands = [];
  for (const v of order) cands.push(build(v, true));
  for (const v of order) cands.push(build(v, false));
  for (const c of cands) { if (seqTime(c.A, dur) + seqTime(c.B, dur) <= hold - 3) { pick = c; break; } }
  if (!pick) { const c = build('short', false); c.A = c.A.map((x) => ({ ...x, pause: Math.min(x.pause, 2) })); pick = c; }
  const endA = seqTime(pick.A, dur), totB = seqTime(pick.B, dur);
  const tB = Math.max(endA, hold - totB - 2);
  const dropped = [];
  return finish([{ t: 0, items: pick.A }, { t: tB, items: pick.B }], dur, dropped);
}

// Savasana closing is played only when savasana is the last slot; the final "finish" line is then skipped by the player.
export const closingPlays = ({ lang, level, lastSavasana }) => lang === 'he' && lastSavasana && (level === 'full' || level === 'short');

// segText re-export for tests
export { segText };
