// Transcript assembly (pure, no DOM): the full text of one pose slot, in reading/play order.
// Hebrew uses the v2 segments (entry, mod for this level, fix = common mistakes, align, breath, exit, side); ru/en use the existing cue ids.
// Each line: { id, kind, text }. kind: entry | mod | fix | align | breath | exit | side | cue. `notes`: safety + easier tip (small print).
import { POSE_V2 } from '../data/narration-he-v2.js';
import { segText, cueIds } from '../data/narration.js';

export function transcriptFor({ lang, pose, lvl = 0, side = 0, sides = 1 }) {
  const id = pose.id;
  const P = POSE_V2[id];
  const lines = [];
  const add = (sid, kind) => { const text = segText(sid, lang); if (text) lines.push({ id: sid, kind, text }); };
  if (lang === 'he' && P) {
    const k = (s) => `pose.${id}.${s}`;
    if (side === 1 && sides > 1 && P.side) add(k('side'), 'side');
    P.entry.forEach((_, i) => add(k(`entry.${i + 1}`), 'entry'));
    add(k(`mod.L${lvl}`), 'mod');
    (P.fix || []).forEach((_, i) => add(k(`fix.${i + 1}`), 'fix'));
    P.align.forEach((_, i) => add(k(`align.${i + 1}`), 'align'));
    add(k('breath'), 'breath');
    add(k('exit'), 'exit');
  } else {
    cueIds(id).forEach((cid) => add(cid, 'cue'));
  }
  const notes = [];
  if (pose.safety?.[lang]) notes.push({ kind: 'safety', text: pose.safety[lang] });
  const easy = pose.variations?.[0]?.[lang];
  if (easy) notes.push({ kind: 'easier', text: easy });
  return { lines, notes };
}
