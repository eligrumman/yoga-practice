// UI strings in HE / RU / EN. Pose and narration texts live in data/.
export const UI_LANGS = ['he', 'ru', 'en'];
export const DIR = { he: 'rtl', ru: 'ltr', en: 'ltr' };

const T = {
  appName: { he: 'יוגה בבית', ru: 'Йога дома', en: 'Home Yoga Flow' },
  tagline: { he: 'תרגול יוגה בקצב שלכם: תנוחות מונפשות, תכניות מוכנות והסבר קולי', ru: 'Йога в вашем темпе: анимированные позы, готовые программы и голосовые подсказки', en: 'Yoga at your own pace: animated poses, ready-made plans and voice guidance' },
  navHome: { he: 'בית', ru: 'Главная', en: 'Home' },
  navLibrary: { he: 'תנוחות', ru: 'Позы', en: 'Poses' },
  navPlans: { he: 'התכניות שלי', ru: 'Мои планы', en: 'My plans' },
  presets: { he: 'תכניות מוכנות', ru: 'Готовые программы', en: 'Ready-made plans' },
  starter: { he: 'מסלול פתיחה של 7 ימים', ru: 'Семидневный курс для начинающих', en: '7-day starter path' },
  starterHint: { he: 'שבעה תרגולים קצרים, מיום 1 עד יום 7, בהדרגה.', ru: 'Семь коротких практик с постепенным усложнением.', en: 'Seven short sessions, day 1 to day 7, gently progressive.' },
  day: { he: 'יום', ru: 'День', en: 'Day' },
  min: { he: 'דק׳', ru: 'мин', en: 'min' },
  play: { he: 'התחילו', ru: 'Начать', en: 'Start' },
  copy: { he: 'העתק לתכניות שלי', ru: 'Скопировать в мои планы', en: 'Copy to my plans' },
  copied: { he: 'הועתק לתכניות שלי', ru: 'Скопировано в мои планы', en: 'Copied to my plans' },
  firstPlan: { he: 'צור לי תכנית לפעם ראשונה', ru: 'Создать первую программу', en: 'Create my first-time plan' },
  genTitle: { he: 'תכנית לפעם ראשונה', ru: 'Первая программа', en: 'First-time plan' },
  genLength: { he: 'אורך', ru: 'Длительность', en: 'Length' },
  genFocus: { he: 'מיקוד', ru: 'Фокус', en: 'Focus' },
  genLevel: { he: 'רמה', ru: 'Уровень', en: 'Level' },
  genAvoid: { he: 'תנוחות להימנע מהן', ru: 'Позы, которых нужно избегать', en: 'Poses to avoid' },
  genGo: { he: 'צרו תכנית', ru: 'Составить программу', en: 'Generate' },
  focus: {
    general: { he: 'כללי', ru: 'Общий', en: 'General' },
    flexibility: { he: 'גמישות', ru: 'Гибкость', en: 'Flexibility' },
    strength: { he: 'כוח', ru: 'Сила', en: 'Strength' },
    relax: { he: 'הרפיה', ru: 'Расслабление', en: 'Relax' },
    back: { he: 'ידידותי לגב', ru: 'Для спины', en: 'Back-friendly' },
  },
  glevel: {
    beginner: { he: 'מתחילים', ru: 'Начинающий', en: 'Beginner' },
    gentle: { he: 'בינוני עדין', ru: 'Средний, щадящий', en: 'Gentle intermediate' },
  },
  search: { he: 'חיפוש תנוחה…', ru: 'Поиск позы…', en: 'Search poses…' },
  allCats: { he: 'כל הקטגוריות', ru: 'Все категории', en: 'All categories' },
  allLevels: { he: 'כל הרמות', ru: 'Все уровни', en: 'All levels' },
  favOnly: { he: 'מועדפים בלבד', ru: 'Только избранное', en: 'Favorites only' },
  count: { he: 'תנוחות', ru: 'поз', en: 'poses' },
  none: { he: 'לא נמצאו תנוחות', ru: 'Ничего не найдено', en: 'No poses found' },
  back: { he: 'חזרה', ru: 'Назад', en: 'Back' },
  levels: { he: 'רמה', ru: 'Уровень', en: 'Level' },
  props: { he: 'עזרים', ru: 'Инвентарь', en: 'Props' },
  prop: {
    block: { he: 'בלוק', ru: 'блок', en: 'block' },
    strap: { he: 'רצועה', ru: 'ремень', en: 'strap' },
    cushion: { he: 'כרית', ru: 'подушка', en: 'cushion' },
    wall: { he: 'קיר', ru: 'стена', en: 'wall' },
  },
  noProps: { he: 'בלי עזרים', ru: 'без инвентаря', en: 'no props' },
  cues: { he: 'הנחיות', ru: 'Подсказки', en: 'Cues' },
  safety: { he: 'בטיחות', ru: 'Безопасность', en: 'Safety' },
  easier: { he: 'אפשרות קלה יותר', ru: 'Облегчённый вариант', en: 'Easier option' },
  variation: { he: 'וריאציה', ru: 'Вариант', en: 'Variation' },
  sides: { single: { he: '', ru: '', en: '' }, both: { he: 'שני הצדדים', ru: 'обе стороны', en: 'both sides' } },
  hold: { he: 'החזקה', ru: 'Удержание', en: 'Hold' },
  sec: { he: 'שנ׳', ru: 'с', en: 's' },
  breaths: { he: 'נשימות', ru: 'вдохов', en: 'breaths' },
  speed: { he: 'מהירות', ru: 'Скорость', en: 'Speed' },
  pause: { he: 'השהיה', ru: 'Пауза', en: 'Pause' },
  resume: { he: 'המשך', ru: 'Продолжить', en: 'Resume' },
  addToPlan: { he: 'הוסף לתכנית', ru: 'Добавить в план', en: 'Add to plan' },
  addTo: { he: 'הוסף ל…', ru: 'Добавить в…', en: 'Add to…' },
  newPlan: { he: 'תכנית חדשה', ru: 'Новый план', en: 'New plan' },
  difficulty: { he: 'קושי', ru: 'Сложность', en: 'Difficulty' },
  star: { he: 'מועדף', ru: 'Избранное', en: 'Favorite' },
  plansTitle: { he: 'התכניות שלי', ru: 'Мои планы', en: 'My plans' },
  noPlans: { he: 'עדיין אין תכניות שמורות. צרו תכנית חדשה או העתיקו תכנית מוכנה.', ru: 'Пока нет сохранённых планов. Создайте новый или скопируйте готовый.', en: 'No saved plans yet. Create one or copy a ready-made plan.' },
  import: { he: 'ייבוא קובץ', ru: 'Импорт файла', en: 'Import file' },
  export: { he: 'ייצוא JSON', ru: 'Экспорт JSON', en: 'Export JSON' },
  importOk: { he: 'התכנית יובאה', ru: 'План импортирован', en: 'Plan imported' },
  importBad: { he: 'הקובץ לא תקין', ru: 'Неверный формат файла', en: 'Invalid file' },
  open: { he: 'פתח', ru: 'Открыть', en: 'Open' },
  del: { he: 'מחק', ru: 'Удалить', en: 'Delete' },
  confirmDel: { he: 'למחוק את התכנית?', ru: 'Удалить план?', en: 'Delete this plan?' },
  planName: { he: 'שם התכנית', ru: 'Название плана', en: 'Plan name' },
  total: { he: 'סה״כ', ru: 'Всего', en: 'Total' },
  items: { he: 'תנוחות', ru: 'поз', en: 'poses' },
  empty: { he: 'התכנית ריקה. הוסיפו תנוחות מהרשימה.', ru: 'План пуст. Добавьте позы из списка.', en: 'The plan is empty. Add poses from the list.' },
  up: { he: 'למעלה', ru: 'Вверх', en: 'Move up' },
  down: { he: 'למטה', ru: 'Вниз', en: 'Move down' },
  dup: { he: 'שכפל', ru: 'Дублировать', en: 'Duplicate' },
  remove: { he: 'הסר', ru: 'Убрать', en: 'Remove' },
  drag: { he: 'גרור לשינוי סדר', ru: 'Перетащите, чтобы изменить порядок', en: 'Drag to reorder' },
  unitSec: { he: 'שניות', ru: 'секунды', en: 'seconds' },
  unitBreath: { he: 'נשימות', ru: 'вдохи', en: 'breaths' },
  saved: { he: 'נשמר', ru: 'Сохранено', en: 'Saved' },
  playPlan: { he: 'נגן תכנית', ru: 'Запустить', en: 'Play plan' },
  addPose: { he: 'הוספת תנוחה', ru: 'Добавить позу', en: 'Add a pose' },
  practiced: { he: 'תרגלתם בפועל', ru: 'Практика', en: 'Practised' },
  planned: { he: 'מתוכנן', ru: 'По плану', en: 'Planned' },
  notCounted: { he: 'תרגול קצר מדי, לא נספר ברצף', ru: 'слишком коротко, в серию не засчитано', en: 'too short to count towards the streak' },
  category: { he: 'קטגוריה', ru: 'Категория', en: 'Category' },
  atLeast: { he: 'מינימום', ru: 'минимум', en: 'min' },
  atMost: { he: 'מקסימום', ru: 'максимум', en: 'max' },
  valueAdjusted: { he: 'הערך תוקן', ru: 'Значение изменено', en: 'Value adjusted' },
  savedAuto: { he: 'נשמר ✓', ru: 'Сохранено ✓', en: 'Saved ✓' },
  both: { he: 'פעמיים (שני צדדים)', ru: 'дважды (обе стороны)', en: 'twice (both sides)' },
  // player
  next: { he: 'הבאה', ru: 'Далее', en: 'Next' },
  skip: { he: 'דלג', ru: 'Пропустить', en: 'Skip' },
  prev: { he: 'הקודמת', ru: 'Назад', en: 'Previous' },
  plus10: { he: '+10 שנ׳', ru: '+10 с', en: '+10s' },
  restart: { he: 'התחל תנוחה מחדש', ru: 'Начать позу заново', en: 'Restart pose' },
  replayEntry: { he: 'הצג כניסה שוב', ru: 'Показать вход в позу', en: 'Replay entry' },
  side: { he: 'צד', ru: 'Сторона', en: 'Side' },
  sideLR: [{ he: 'צד ימין', ru: 'правая сторона', en: 'right side' }, { he: 'צד שמאל', ru: 'левая сторона', en: 'left side' }],
  clearFilters: { he: 'נקו את הסינון', ru: 'Сбросить фильтры', en: 'Clear filters' },
  switchSides: { he: 'החליפו צד', ru: 'Смените сторону', en: 'Switch sides' },
  getReady: { he: 'התכוננו', ru: 'Приготовьтесь', en: 'Get ready' },
  finishTitle: { he: 'כל הכבוד!', ru: 'Отлично!', en: 'Well done!' },
  finishText: { he: 'סיימתם את התרגול.', ru: 'Вы завершили практику.', en: 'You finished the practice.' },
  streak: { he: 'רצף ימים', ru: 'Дней подряд', en: 'Day streak' },
  again: { he: 'שוב', ru: 'Ещё раз', en: 'Again' },
  home: { he: 'לדף הבית', ru: 'На главную', en: 'Home' },
  exit: { he: 'יציאה', ru: 'Выйти', en: 'Exit' },
  voice: { he: 'הסבר קולי', ru: 'Голосовые подсказки', en: 'Voice guidance' },
  narrLang: { he: 'שפת ההסבר', ru: 'Язык подсказок', en: 'Voice language' },
  sameAsUI: { he: 'כמו שפת הממשק', ru: 'Как язык интерфейса', en: 'Same as interface' },
  mute: { he: 'השתק', ru: 'Выключить звук', en: 'Mute' },
  unmute: { he: 'הפעל קול', ru: 'Включить звук', en: 'Unmute' },
  volume: { he: 'עוצמה', ru: 'Громкость', en: 'Volume' },
  beep: { he: 'צליל מעבר', ru: 'Звуковой сигнал', en: 'Transition beep' },
  density: { he: 'פירוט ההסבר', ru: 'Подробность подсказок', en: 'Narration detail' },
  dens: { minimal: { he: 'מינימלי (שם בלבד)', ru: 'Минимальный (только название)', en: 'Minimal (name only)' }, standard: { he: 'רגיל (שם + 2 הנחיות)', ru: 'Обычный (название + 2 подсказки)', en: 'Standard (name + 2 cues)' }, full: { he: 'מלא (כל ההנחיות + נשימה)', ru: 'Полный (все подсказки + дыхание)', en: 'Full (all cues + breath)' } },
  narration: { he: 'רמת קריינות', ru: 'Уровень озвучки', en: 'Narration level' },
  narrLvl: {
    full: { he: 'מלאה', ru: 'Полная', en: 'Full' },
    short: { he: 'קצרה', ru: 'Краткая', en: 'Short' },
    name: { he: 'שם התנוחה בלבד', ru: 'Только название', en: 'Pose name only' },
    off: { he: 'ללא קריינות', ru: 'Без озвучки', en: 'Off' },
  },
  introPhase: { he: 'פתיחה', ru: 'Вступление', en: 'Intro' },
  skipIntro: { he: 'דלג על הפתיחה', ru: 'Пропустить вступление', en: 'Skip intro' },
  pace: { he: 'קצב', ru: 'Темп', en: 'Pace' },
  holdMult: { he: 'זמן החזקה', ru: 'Время удержания', en: 'Hold time' },
  transition: { he: 'מעבר בין תנוחות', ru: 'Время перехода', en: 'Transition time' },
  settings: { he: 'הגדרות', ru: 'Настройки', en: 'Settings' },
  music: { he: 'מוזיקת רקע', ru: 'Фоновая музыка', en: 'Background music' },
  musicMood: {
    none: { he: 'ללא', ru: 'Без музыки', en: 'None' },
    soft: { he: 'רך', ru: 'Мягкая', en: 'Soft' },
    nature: { he: 'טבע-דרון', ru: 'Природа и дрон', en: 'Nature drone' },
    deep: { he: 'שקט עמוק', ru: 'Глубокая тишина', en: 'Deep calm' },
  },
  musicVol: { he: 'עוצמת המוזיקה', ru: 'Громкость музыки', en: 'Music volume' },
  voiceVol: { he: 'עוצמת הקריינות', ru: 'Громкость голоса', en: 'Narration volume' },
  transcript: { he: 'תמלול התנוחה', ru: 'Текст позы', en: 'Pose transcript' },
  mistake: { he: 'שימו לב', ru: 'Обратите внимание', en: 'Watch out' },
  pinBar: { he: 'נעץ את הסרגל', ru: 'Закрепить панель', en: 'Pin the controls' },
  showBar: { he: 'הצג בקרים', ru: 'Показать управление', en: 'Show controls' },
  noVoice: { he: 'לא נמצא קול בשפה זו במכשיר. מוצגות כתוביות בלבד.', ru: 'На устройстве нет голоса для этого языка. Показаны только субтитры.', en: 'No voice for this language on this device. Showing captions only.' },
  noSpeech: { he: 'הדפדפן אינו תומך בהקראה. מוצגות כתוביות בלבד.', ru: 'Браузер не поддерживает озвучивание. Показаны только субтитры.', en: 'This browser has no speech support. Showing captions only.' },
  // history
  history: { he: 'היסטוריית תרגול', ru: 'История практик', en: 'Practice history' },
  noHistory: { he: 'עוד לא תרגלתם כאן. התחילו תכנית!', ru: 'Пока нет практик. Начните программу!', en: 'No sessions yet. Start a plan!' },
  minutes: { he: 'דקות', ru: 'минут', en: 'minutes' },
  disclaimer: {
    he: 'המידע באתר אינו ייעוץ רפואי. אם אתם בהריון, פצועים או סובלים ממצב רפואי, התייעצו עם איש מקצוע לפני התרגול. עצרו אם מופיע כאב.',
    ru: 'Материалы сайта не являются медицинским советом. Если вы беременны, травмированы или у вас есть заболевания, проконсультируйтесь со специалистом перед практикой. Если появилась боль, прекратите занятие.',
    en: 'This site is not medical advice. If you are pregnant, injured or have a medical condition, consult a professional before practicing. Stop if you feel pain.',
  },
  privacy: { he: 'הכל נשמר רק במכשיר שלכם. בלי חשבונות ובלי מעקב.', ru: 'Всё хранится только на вашем устройстве. Без аккаунтов и слежки.', en: 'Everything stays on your device. No accounts, no tracking.' },
  notFound: { he: 'העמוד לא נמצא', ru: 'Страница не найдена', en: 'Page not found' },
  mine: { he: 'שלי', ru: 'мой', en: 'mine' },
  close: { he: 'סגור', ru: 'Закрыть', en: 'Close' },
  cancel: { he: 'ביטול', ru: 'Отмена', en: 'Cancel' },
  exportBackup: { he: 'גיבוי כל הנתונים', ru: 'Резервная копия данных', en: 'Back up all data' },
  importBackup: { he: 'שחזור מגיבוי', ru: 'Восстановить из копии', en: 'Restore backup' },
};

export function tr(key, lang, sub) {
  let v = T[key];
  if (sub != null && v) v = v[sub];
  if (!v) return key;
  return v[lang] || v.en;
}
// Russian plural forms via Intl.PluralRules (one / few / many).
const RU_FORMS = {
  pose: ['поза', 'позы', 'поз'], breath: ['вдох', 'вдоха', 'вдохов'], minute: ['минута', 'минуты', 'минут'],
  second: ['секунда', 'секунды', 'секунд'], day: ['день', 'дня', 'дней'],
};
const RU_PR = new Intl.PluralRules('ru');
export function ruPlural(n, kind) {
  const f = RU_FORMS[kind]; const c = RU_PR.select(Math.abs(n));
  return f[c === 'one' ? 0 : c === 'few' ? 1 : 2];
}
// "1 pose" / "2 poses" in he / ru / en for kinds pose, breath, minute, second, day.
const HE = { pose: ['תנוחה אחת', 'שתי תנוחות', 'תנוחות'], breath: ['נשימה אחת', 'שתי נשימות', 'נשימות'], minute: ['דקה אחת', 'שתי דקות', 'דקות'], second: ['שנייה אחת', 'שתי שניות', 'שניות'], day: ['יום אחד', 'יומיים', 'ימים'] };
const EN = { pose: ['pose', 'poses'], breath: ['breath', 'breaths'], minute: ['minute', 'minutes'], second: ['second', 'seconds'], day: ['day', 'days'] };
export function nCount(n, kind, lang) {
  if (lang === 'he') { const h = HE[kind]; return n === 1 ? h[0] : n === 2 ? h[1] : `${n} ${h[2]}`; }
  if (lang === 'ru') return `${n} ${ruPlural(n, kind)}`;
  return `${n} ${EN[kind][n === 1 ? 0 : 1]}`;
}
// "Pose 2 of 3": counted by pose, not by side.
export const poseOf = (a, b, lang) => (lang === 'he' ? `תנוחה ${a} מתוך ${b}` : lang === 'ru' ? `Поза ${a} из ${b}` : `Pose ${a} of ${b}`);
// Approximate total ("≈ 20 min") for plans whose breath-counted items vary with the breathing pace.
export const approxMin = (sec, lang) => `${lang === 'he' ? 'כ-' : '≈ '}${Math.round(sec / 60)} ${tr('min', lang)}`;
// Texts of the finish screen, as pure data so they can be tested without a DOM.
export function finishStats(lang, actualSec, plannedSec, streakDays, counted) {
  const m = actualSec < 60 ? 0 : Math.round(actualSec / 60);
  const practiced = m === 0 ? `<1 ${tr('min', lang)}` : nCount(m, 'minute', lang);
  return {
    title: tr('finishTitle', lang), text: tr('finishText', lang),
    stat: `${tr('practiced', lang)}: ${practiced} · ${tr('streak', lang)}: ${streakDays}`,
    planned: `${tr('planned', lang)}: ${nCount(Math.round(plannedSec / 60), 'minute', lang)}` + (counted ? '' : ` · ${tr('notCounted', lang)}`),
  };
}
export const nPoses = (n, lang) => nCount(n, 'pose', lang);
export { T };
