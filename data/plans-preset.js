// Ready-made plans (original sequences and texts).
// Item: { pose, level 0-2, unit 'sec'|'breath', amount }. Both-sided poses are played twice.
const I = (pose, level, unit, amount) => ({ pose, level, unit, amount });
const s = (pose, level, amount) => I(pose, level, 'sec', amount);
const b = (pose, level, amount) => I(pose, level, 'breath', amount);

export const PRESETS = [
  {
    id: 'morning-wakeup', minutes: 10, level: 0,
    name: { he: 'התעוררות בוקר', ru: 'Утреннее пробуждение', en: 'Morning wake-up' },
    desc: {
      he: 'רצף עדין שמעיר את הגוף: חימום הגב, מתיחת הצד ועמידה יציבה. מתאים לפני הקפה.',
      ru: 'Мягкая последовательность, которая будит тело: разминка спины, растяжка боков и устойчивая стойка. Подойдёт перед утренним кофе.',
      en: 'A gentle sequence that wakes the body: spine warm-up, side stretch and a steady stance. Works before your morning coffee.',
    },
    items: [
      b('tabletop', 1, 3), b('cat', 1, 4), b('cow', 1, 4), s('downward-dog', 0, 25),
      s('uttanasana', 0, 20), s('upward-salute', 1, 15), s('warrior-1', 0, 20), s('warrior-2', 0, 20),
      s('chair', 0, 20), s('mountain', 1, 20), s('tree', 0, 20), s('cobra', 0, 20),
      s('child', 1, 25), s('knees-to-chest', 1, 25), s('savasana', 1, 165),
    ],
  },
  {
    id: 'beginner-foundations', minutes: 20, level: 0,
    name: { he: 'יסודות למתחילים', ru: 'Основы для начинающих', en: 'Beginner foundations' },
    desc: {
      he: 'היכרות עם התנוחות הבסיסיות, בקצב רגוע. כל תנוחה מוסברת ומוחזקת זמן נעים.',
      ru: 'Знакомство с базовыми позами в спокойном темпе. Каждая поза объясняется и держится комфортное время.',
      en: 'An introduction to the basic poses at a calm pace. Every pose is explained and held for a comfortable time.',
    },
    items: [
      b('tabletop', 0, 6), b('cat', 0, 8), b('cow', 0, 8), s('downward-dog', 0, 30),
      s('half-lift', 0, 35), s('uttanasana', 0, 40), s('upward-salute', 0, 35), s('mountain', 0, 40),
      s('warrior-1', 0, 40), s('warrior-2', 0, 40), s('chair', 0, 35), s('tree', 0, 30),
      s('cobra', 0, 20), s('child', 0, 60), s('bridge', 0, 40), s('knees-to-chest', 0, 60),
      s('supine-twist', 0, 55), s('savasana', 0, 255),
    ],
  },
  {
    id: 'back-relief', minutes: 15, level: 0,
    name: { he: 'הקלה לגב', ru: 'Облегчение для спины', en: 'Back relief' },
    desc: {
      he: 'תנועות רכות ללא עומס לחימום ושחרור הגב התחתון. בלי קיפולים עמוקים ובלי כפיפה אחורה חזקה.',
      ru: 'Мягкие движения без нагрузки, чтобы разогреть и расслабить поясницу. Без глубоких наклонов и сильных прогибов.',
      en: 'Soft, low-load movements to warm up and release the lower back. No deep folds and no strong backbends.',
    },
    items: [
      b('tabletop', 0, 6), b('cat', 0, 10), b('cow', 0, 10), s('child', 0, 65),
      s('downward-dog', 0, 40), s('half-lift', 0, 35), s('child', 0, 45), s('bridge', 0, 40),
      s('knees-to-chest', 0, 55), s('supine-twist', 0, 55), s('happy-baby', 0, 50), s('figure-four', 0, 50),
      s('savasana', 0, 155),
    ],
  },
  {
    id: 'hips-hamstrings', minutes: 20, level: 1,
    name: { he: 'ירכיים ופלג גוף תחתון', ru: 'Бёдра и задняя поверхность ног', en: 'Hips & hamstrings' },
    desc: {
      he: 'מתיחות ארוכות לירכיים ולשרירי הירך האחוריים. מתאים אחרי ישיבה ממושכת או ריצה.',
      ru: 'Долгие растяжки для бёдер и задней поверхности ног. Хорошо после долгого сидения или бега.',
      en: 'Long stretches for the hips and hamstrings. A good fit after long sitting or a run.',
    },
    items: [
      b('tabletop', 1, 5), b('cat', 1, 6), b('cow', 1, 6), s('downward-dog', 1, 50),
      s('low-lunge', 1, 50), s('half-split', 1, 50), s('uttanasana', 1, 50), s('warrior-2', 1, 40),
      s('seated-fold', 1, 65), s('cobbler', 1, 65), s('easy-seat', 1, 50), s('hand-to-toe', 1, 60),
      s('figure-four', 1, 60), s('happy-baby', 1, 50), s('savasana', 1, 165),
    ],
  },
  {
    id: 'evening-wind-down', minutes: 15, level: 0,
    name: { he: 'הרפיה לפני השינה', ru: 'Вечернее расслабление', en: 'Evening wind-down' },
    desc: {
      he: 'רצף איטי ושקט לסיום היום. רובו על הרצפה, עם נשימה ארוכה ושכיבת מנוחה.',
      ru: 'Медленная тихая последовательность для конца дня. В основном на полу, с долгим дыханием и отдыхом лёжа.',
      en: 'A slow, quiet sequence to end the day. Mostly on the floor, with long breaths and a final rest.',
    },
    items: [
      s('easy-seat', 1, 55), b('cat', 0, 7), b('cow', 0, 7), s('child', 0, 65),
      s('cobbler', 0, 55), s('seated-fold', 0, 55), s('seated-twist', 0, 35), s('knees-to-chest', 0, 50),
      s('supine-twist', 0, 55), s('legs-up-wall', 0, 85), s('savasana', 0, 220),
    ],
  },
  {
    id: 'core-balance', minutes: 20, level: 1,
    name: { he: 'ליבה ושיווי משקל', ru: 'Кор и равновесие', en: 'Core & balance' },
    desc: {
      he: 'חיזוק הבטן והרגליים ותרגול של איזון. הרצף כולל פלאנק, סירה ועמידה על רגל אחת; בעמידות האיזון אפשר להישען על קיר או על כיסא.',
      ru: 'Укрепляет живот и ноги и тренирует равновесие. В последовательности планка, лодка и стойка на одной ноге; в балансах можно опереться на стену или стул.',
      en: 'Strengthens the belly and legs and trains balance. The sequence includes plank, boat and one-leg stands; for the balance poses you can lean on a wall or a chair.',
    },
    items: [
      b('tabletop', 1, 5), b('cat', 1, 6), b('cow', 1, 6), s('plank', 1, 35),
      s('downward-dog', 1, 50), s('chair', 1, 40), s('warrior-3', 1, 35), s('warrior-1', 1, 40),
      s('tree', 1, 45), s('high-lunge', 1, 40), s('dancer', 1, 40), s('boat', 1, 40),
      s('locust', 1, 30), s('child', 1, 50), s('bridge', 1, 40), s('knees-to-chest', 1, 45),
      s('supine-twist', 1, 60), s('savasana', 1, 150),
    ],
  },
  {
    id: 'full-flow', minutes: 30, level: 1,
    name: { he: 'רצף מלא', ru: 'Полная практика', en: 'Full flow' },
    desc: {
      he: 'תרגול שלם: חימום, עמידות, איזון, רצפה ומנוחה. לימים שיש בהם זמן.',
      ru: 'Полная практика: разминка, стоячие позы, равновесие, пол и отдых. Для дней, когда есть время.',
      en: 'A complete practice: warm-up, standing poses, balance, floor work and rest. For days when you have time.',
    },
    items: [
      b('tabletop', 1, 6), b('cat', 1, 8), b('cow', 1, 8), s('downward-dog', 1, 50),
      s('plank', 1, 35), s('cobra', 1, 35), s('downward-dog', 1, 40), s('half-lift', 1, 25),
      s('uttanasana', 1, 40), s('upward-salute', 1, 25), s('chair', 1, 40), s('warrior-1', 1, 40),
      s('warrior-2', 1, 40), s('high-lunge', 1, 40), s('tree', 1, 40), s('warrior-3', 1, 35),
      s('revolved-chair', 1, 35), s('low-lunge', 1, 50), s('locust', 1, 25), s('child', 1, 40),
      s('cobbler', 1, 55), s('seated-fold', 1, 50), s('seated-twist', 1, 40), s('bridge', 1, 40),
      s('knees-to-chest', 1, 45), s('supine-twist', 1, 55), s('savasana', 1, 220),
    ],
  },
  {
    id: 'desk-break', minutes: 5, level: 0,
    name: { he: 'הפסקה מהשולחן', ru: 'Перерыв за рабочим столом', en: 'Desk break' },
    desc: {
      he: 'חמש דקות להתעוררות אחרי ישיבה ארוכה: כתפיים, גב וירכיים. בלי רצפה, אפשר גם בבגדי עבודה.',
      ru: 'Пять минут, чтобы размяться после долгого сидения: плечи, спина и бёдра. Пол не нужен, подойдёт и рабочая одежда.',
      en: 'Five minutes to shake off long sitting: shoulders, back and hips. No floor needed, works in work clothes.',
    },
    items: [
      s('mountain', 0, 20), s('upward-salute', 0, 15), s('half-lift', 0, 15), s('uttanasana', 0, 25),
      s('warrior-1', 0, 20), s('warrior-2', 0, 20), s('chair', 0, 30), s('mountain', 0, 65),
    ],
  },
];

// Seven-day beginner starter path: gently progressive, day 1 -> day 7.
export const STARTER_PATH = [
  {
    id: 'starter-day-1', minutes: 5, level: 0, day: 1,
    name: { he: 'יום 1: להכיר את הנשימה', ru: 'День 1: знакомство с дыханием', en: 'Day 1: meet your breath' },
    desc: {
      he: 'חמש דקות של תנועה קטנה ונשימה. מספיק כדי להתחיל.',
      ru: 'Пять минут лёгкого движения и дыхания. Этого достаточно для начала.',
      en: 'Five minutes of small movement and breath. Enough to begin.',
    },
    items: [
      s('easy-seat', 1, 25), b('cat', 0, 4), b('cow', 0, 4), s('child', 0, 25),
      s('knees-to-chest', 0, 25), s('savasana', 0, 155),
    ],
  },
  {
    id: 'starter-day-2', minutes: 8, level: 0, day: 2,
    name: { he: 'יום 2: לפתוח את הגב', ru: 'День 2: разминаем спину', en: 'Day 2: open the spine' },
    desc: {
      he: 'חימום קל לעמוד השדרה ולכתפיים, עם הרפיה ארוכה בסוף.',
      ru: 'Лёгкая разминка позвоночника и плеч, в конце долгое расслабление.',
      en: 'A light warm-up for the spine and shoulders with a long relaxation at the end.',
    },
    items: [
      b('tabletop', 0, 5), b('cat', 0, 7), b('cow', 0, 7), s('downward-dog', 0, 25),
      s('cobra', 0, 20), s('child', 0, 40), s('bridge', 0, 25), s('supine-twist', 0, 35),
      s('savasana', 0, 155),
    ],
  },
  {
    id: 'starter-day-3', minutes: 10, level: 0, day: 3,
    name: { he: 'יום 3: עמידה ראשונה', ru: 'День 3: первая стойка', en: 'Day 3: first standing' },
    desc: {
      he: 'מכירים את ההר, את הכיסא ואת לוחם 1. הרגליים מתחילות לעבוד.',
      ru: 'Знакомимся с горой, стулом и воином один. Ноги начинают работать.',
      en: 'Meet mountain, chair and warrior one. The legs begin to work.',
    },
    items: [
      s('mountain', 0, 55), s('upward-salute', 0, 35), s('uttanasana', 0, 40), s('chair', 0, 35),
      s('warrior-1', 0, 45), s('child', 0, 65),
      s('knees-to-chest', 0, 60), s('savasana', 0, 175),
    ],
  },
  {
    id: 'starter-day-4', minutes: 10, level: 0, day: 4,
    name: { he: 'יום 4: ירכיים רפויות', ru: 'День 4: свободные бёдра', en: 'Day 4: loose hips' },
    desc: {
      he: 'מתיחות רכות לירכיים ולירך האחורית, בישיבה ובשכיבה.',
      ru: 'Мягкие растяжки для бёдер и задней поверхности ног, сидя и лёжа.',
      en: 'Soft stretches for the hips and hamstrings, seated and lying.',
    },
    items: [
      s('easy-seat', 1, 50), b('cat', 0, 6), b('cow', 0, 6), s('low-lunge', 0, 35),
      s('seated-fold', 0, 50), s('cobbler', 0, 50), s('happy-baby', 0, 45), s('figure-four', 0, 35),
      s('savasana', 0, 150),
    ],
  },
  {
    id: 'starter-day-5', minutes: 12, level: 0, day: 5,
    name: { he: 'יום 5: כוח עדין', ru: 'День 5: мягкая сила', en: 'Day 5: gentle strength' },
    desc: {
      he: 'מוסיפים קרש על הברכיים וחיזוק הרגליים, עדיין עם הרבה מנוחה.',
      ru: 'Добавляем планку на коленях и укрепление ног, по-прежнему с большим количеством отдыха.',
      en: 'We add a kneeling plank and leg strength, still with plenty of rest.',
    },
    items: [
      b('tabletop', 0, 6), b('cat', 0, 7), b('cow', 0, 7), s('plank', 0, 15),
      s('downward-dog', 0, 35), s('chair', 0, 30), s('warrior-1', 0, 30), s('warrior-2', 0, 30),
      s('cobra', 0, 30), s('child', 0, 45), s('bridge', 0, 30), s('supine-twist', 0, 35),
      s('savasana', 0, 165),
    ],
  },
  {
    id: 'starter-day-6', minutes: 15, level: 0, day: 6,
    name: { he: 'יום 6: איזון ושקט', ru: 'День 6: равновесие и покой', en: 'Day 6: balance and calm' },
    desc: {
      he: 'מנסים עמידה על רגל אחת, ואז מרפים ארוך.',
      ru: 'Пробуем стойку на одной ноге, а затем долго расслабляемся.',
      en: 'We try a one-leg stand, then relax for a long time.',
    },
    items: [
      b('tabletop', 0, 5), b('cat', 0, 7), b('cow', 0, 7), s('downward-dog', 0, 35),
      s('uttanasana', 0, 35), s('mountain', 0, 25), s('chair', 0, 25), s('warrior-1', 0, 35),
      s('warrior-2', 0, 35), s('tree', 0, 30), s('cobra', 0, 25), s('child', 0, 40),
      s('cobbler', 0, 40), s('knees-to-chest', 0, 40), s('supine-twist', 0, 40), s('savasana', 0, 155),
    ],
  },
  {
    id: 'starter-day-7', minutes: 15, level: 0, day: 7,
    name: { he: 'יום 7: הכול ביחד', ru: 'День 7: всё вместе', en: 'Day 7: putting it together' },
    desc: {
      he: 'חוזרים על מה שלמדתם בשבוע, מחימום ועד שכיבת מנוחה.',
      ru: 'Повторяем всё, что вы освоили за неделю, от разминки до отдыха.',
      en: 'A review of the week, from warm-up to final rest.',
    },
    items: [
      b('tabletop', 0, 5), b('cat', 0, 6), b('cow', 0, 6), s('downward-dog', 0, 30),
      s('half-lift', 0, 20), s('uttanasana', 0, 30), s('upward-salute', 0, 20), s('chair', 0, 25),
      s('warrior-1', 0, 30), s('warrior-2', 0, 30), s('tree', 0, 25), s('plank', 0, 20),
      s('cobra', 0, 25), s('child', 0, 40), s('bridge', 0, 25), s('knees-to-chest', 0, 30),
      s('supine-twist', 0, 40), s('savasana', 0, 190),
    ],
  },
];

export const ALL_PRESETS = [...PRESETS, ...STARTER_PATH];
