// Writes narration-script.json: [{id, lang, text}] for every segment and language.
import { writeFileSync } from 'node:fs';
import { SEGMENTS, LANGS } from '../data/narration.js';

const list = [];
for (const s of SEGMENTS) for (const lang of LANGS) list.push({ id: s.id, lang, text: s[lang] });
const out = new URL('../narration-script.json', import.meta.url);
writeFileSync(out, JSON.stringify(list, null, 1) + '\n');
console.log(`wrote narration-script.json: ${list.length} entries (${SEGMENTS.length} segments x ${LANGS.length} languages)`);
