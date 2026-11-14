// Pose library: names, cues and safety text. Motion lives in poses/<id>.json (see poses/README.md).
import warm from './p-warm.js';
import standing from './p-standing.js';
import floor from './p-floor.js';
import rest from './p-rest.js';

export const CATEGORIES = [
  'warm-up', 'standing', 'balance', 'forward fold', 'backbend', 'twist',
  'hip opener', 'inversion-light', 'floor/seated', 'supine', 'rest',
  'arm balance',
];
export const CATEGORY_LABELS = {
  'warm-up': { he: 'חימום', en: 'Warm-up', ru: 'Разминка' },
  standing: { he: 'עמידה', en: 'Standing', ru: 'Стоя' },
  balance: { he: 'שיווי משקל', en: 'Balance', ru: 'Равновесие' },
  'forward fold': { he: 'קיפול קדימה', en: 'Forward fold', ru: 'Наклоны вперёд' },
  backbend: { he: 'כפיפה אחורה', en: 'Backbend', ru: 'Прогибы' },
  twist: { he: 'סיבוב', en: 'Twist', ru: 'Скручивания' },
  'hip opener': { he: 'פתיחת ירכיים', en: 'Hip opener', ru: 'Раскрытие бёдер' },
  'arm balance': { he: 'שיווי משקל על הידיים', en: 'Arm balance', ru: 'Баланс на руках' },
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
export const FLOW_LABEL = { he: 'זרימה', en: 'Flow', ru: 'Поток' };

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
  isFlow: !!r.isFlow,
  difficulty: r.d,
  holdSeconds: r.hold,
  sides: r.sides,
  tags: r.tags || [],
  cues: r.cue,
  safety: r.safe,
  variations: r.v.map((v, i) => ({
    level: i, he: v.he, en: v.en, ru: v.ru, props: v.props || [],
  })),
}));

export const POSE_BY_ID = Object.fromEntries(POSES.map((p) => [p.id, p]));
