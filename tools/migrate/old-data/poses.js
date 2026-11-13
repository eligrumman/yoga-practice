// Pose library. All text and joint-angle data are original work for this project.
import warm from './p-warm.js';
import standing from './p-standing.js';
import floor from './p-floor.js';
import rest from './p-rest.js';

export const CATEGORIES = [
  'warm-up', 'standing', 'balance', 'forward fold', 'backbend', 'twist',
  'hip opener', 'inversion-light', 'floor/seated', 'supine', 'rest',
];
export const CATEGORY_LABELS = {
  'warm-up': { he: 'חימום', en: 'Warm-up', ru: 'Разминка' },
  standing: { he: 'עמידה', en: 'Standing', ru: 'Стоя' },
  balance: { he: 'שיווי משקל', en: 'Balance', ru: 'Равновесие' },
  'forward fold': { he: 'קיפול קדימה', en: 'Forward fold', ru: 'Наклоны вперёд' },
  backbend: { he: 'כפיפה אחורה', en: 'Backbend', ru: 'Прогибы' },
  twist: { he: 'סיבוב', en: 'Twist', ru: 'Скручивания' },
  'hip opener': { he: 'פתיחת ירכיים', en: 'Hip opener', ru: 'Раскрытие бёдер' },
  'inversion-light': { he: 'הפוכה עדינה', en: 'Gentle inversion', ru: 'Лёгкая инверсия' },
  'floor/seated': { he: 'ישיבה / רצפה', en: 'Floor / seated', ru: 'Сидя / на полу' },
  supine: { he: 'שכיבה על הגב', en: 'Supine', ru: 'Лёжа на спине' },
  rest: { he: 'מנוחה', en: 'Rest', ru: 'Отдых' },
};
export const LEVEL_LABELS = [
  { he: 'מתחילים', en: 'Beginner', ru: 'Начинающий' },
  { he: 'בינוני', en: 'Intermediate', ru: 'Средний' },
  { he: 'מתקדם', en: 'Advanced', ru: 'Продвинутый' },
];

function merge(base, over = {}) {
  const o = { ...base, ...over };
  const fix = { ...(base.fix || {}), ...(over.fix || {}) };
  for (const k of Object.keys(fix)) if (fix[k] === null) delete fix[k];
  if (Object.keys(fix).length) o.fix = fix; else delete o.fix;
  return o;
}

const RAW = [...warm, ...standing, ...floor, ...rest];

export const POSES = RAW.map((r) => ({
  id: r.id,
  sanskrit: r.sa,
  en: r.en,
  he: r.he,
  ru: r.ru,
  category: r.cat,
  section: r.sec,
  flow: r.flow,
  difficulty: r.d,
  holdSeconds: r.hold,
  sides: r.sides,
  tags: r.tags || [],
  start: r.start,
  cues: r.cue,
  safety: r.safe,
  variations: r.v.map((v, i) => ({
    level: i, he: v.he, en: v.en, ru: v.ru, props: v.props || [], kf: merge(r.kf, v.kf), ...(r.alt ? { alt: merge(r.alt, v.alt) } : {}),
  })),
}));

export const POSE_BY_ID = Object.fromEntries(POSES.map((p) => [p.id, p]));
