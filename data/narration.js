// ONE source for every spoken line. Each segment: { id, he, ru, en }.
// Ids are stable so pre-generated audio (audio/<lang>/<id>.mp3) can be matched to them.
// Rules: numbers as words, no Latin letters in he/ru text, short sentences, Russian addresses the listener as "Вы".
// Composite announcements are separate segments: common.next + pose.<id>.name.
import { POSES } from './poses.js';

export const LANGS = ['he', 'ru', 'en'];

const COMMON = {
  welcome: {
    he: 'ברוכים הבאים. נתחיל בתרגול. התמקמו בנוחות וקחו נשימה עמוקה.',
    ru: 'Добро пожаловать. Начинаем практику. Устройтесь удобно и сделайте глубокий вдох.',
    en: 'Welcome. Let us begin the practice. Settle in comfortably and take a deep breath.',
  },
  breathe_in: { he: 'שאפו.', ru: 'Вдох.', en: 'Breathe in.' },
  breathe_out: { he: 'נשפו.', ru: 'Выдох.', en: 'Breathe out.' },
  breathe_slow: { he: 'המשיכו לנשום לאט.', ru: 'Продолжайте дышать медленно.', en: 'Keep breathing slowly.' },
  ease_off: {
    he: 'אם מופיע כאב, הקלו או צאו מהתנוחה.',
    ru: 'Если появилась боль, смягчите позу или выйдите из неё.',
    en: 'If you feel pain, ease off or come out of the pose.',
  },
  switch_sides: { he: 'החליפו צד.', ru: 'Смените сторону.', en: 'Switch sides.' },
  next: { he: 'התנוחה הבאה.', ru: 'Следующая поза.', en: 'Next pose.' },
  halfway: { he: 'עברתם חצי מהתרגול.', ru: 'Вы прошли половину практики.', en: 'You are halfway through.' },
  savasana_end: {
    he: 'העמיקו לאט את הנשימה. הניעו את האצבעות בידיים וברגליים. כשתהיו מוכנים, התגלגלו על הצד ועלו לישיבה.',
    ru: 'Медленно углубите дыхание. Пошевелите пальцами рук и ног. Когда будете готовы, перекатитесь на бок и сядьте.',
    en: 'Slowly deepen your breath. Wiggle your fingers and toes. When you are ready, roll onto your side and come up to sitting.',
  },
  finish: {
    he: 'כל הכבוד. התרגול הסתיים. הקדישו רגע להרגיש את הגוף.',
    ru: 'Отлично. Практика окончена. Побудьте немного в тишине и прислушайтесь к своему телу.',
    en: 'Well done. The practice is complete. Take a moment to notice how your body feels.',
  },
};

// Names that contain numerals are written out for speech.
const SPOKEN_NAME = {
  'warrior-1': { he: 'לוחם אחד', en: 'Warrior one' },
  'warrior-2': { he: 'לוחם שניים', en: 'Warrior two' },
  'warrior-3': { he: 'לוחם שלוש', en: 'Warrior three' },
};
const INTRO = {
  he: (n) => (n.startsWith('תנוחת') ? `${n}.` : `תנוחת ${n}.`),
  ru: (n) => (n.startsWith('Поза') ? `${n}.` : `Поза: ${n}.`),
  en: (n) => `Pose: ${n}.`,
};

export const SEGMENTS = [];
for (const [k, t] of Object.entries(COMMON)) SEGMENTS.push({ id: `common.${k}`, ...t });
for (const p of POSES) {
  const nm = {};
  for (const l of LANGS) nm[l] = SPOKEN_NAME[p.id]?.[l] || p[l];
  SEGMENTS.push({ id: `pose.${p.id}.name`, ...nm });
  SEGMENTS.push({ id: `pose.${p.id}.intro`, he: INTRO.he(nm.he), ru: INTRO.ru(nm.ru), en: INTRO.en(nm.en) });
  const n = Math.max(p.cues.he.length, p.cues.ru.length, p.cues.en.length);
  for (let i = 0; i < n; i++) {
    SEGMENTS.push({ id: `pose.${p.id}.cue.${i + 1}`, he: p.cues.he[i], ru: p.cues.ru[i], en: p.cues.en[i] });
  }
}

export const SEGMENT_BY_ID = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]));
export const segText = (id, lang) => SEGMENT_BY_ID[id]?.[lang] || '';
export const cueIds = (poseId) => SEGMENTS.filter((s) => s.id.startsWith(`pose.${poseId}.cue.`)).map((s) => s.id);
