// Writes narration-script.json: [{id, lang, text}] for every segment and language,
// plus the Hebrew v2 segments (he only) with a "prio" tag used by tools/tts/generate.py:
//   intro -> close -> beginner (difficulty-1 poses + BEGINNER_EXTRA) -> fix (common-mistake lines, all poses) -> rest.
import { writeFileSync } from 'node:fs';
import { SEGMENTS, LANGS } from '../data/narration.js';
import { SEGMENTS_V2 } from '../data/narration-he-v2.js';
import { POSES } from '../data/poses.js';
import { BEGINNER_EXTRA } from '../js/generator.js';

const beginner = new Set(POSES.filter((p) => p.difficulty === 1 || BEGINNER_EXTRA.has(p.id)).map((p) => p.id));
const list = [];
for (const s of SEGMENTS) for (const lang of LANGS) list.push({ id: s.id, lang, text: s[lang] });
const counts = { intro: 0, close: 0, beginner: 0, fix: 0, rest: 0 };
for (const s of SEGMENTS_V2) {
  let prio;
  if (s.id.startsWith('session.intro.')) prio = 'intro';
  else if (s.id.startsWith('session.close.')) prio = 'close';
  else if (s.id.includes('.fix.')) prio = 'fix';
  else prio = beginner.has(s.id.split('.')[1]) ? 'beginner' : 'rest';
  counts[prio]++;
  list.push({ id: s.id, lang: 'he', text: s.he, v2: true, prio });
}
const out = new URL('../narration-script.json', import.meta.url);
writeFileSync(out, JSON.stringify(list, null, 1) + '\n');
console.log(`wrote narration-script.json: ${list.length} entries (${SEGMENTS.length} segments x ${LANGS.length} languages + ${SEGMENTS_V2.length} Hebrew v2: ${JSON.stringify(counts)})`);
