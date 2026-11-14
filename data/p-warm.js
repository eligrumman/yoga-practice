// Warm-up poses (original content)
export default [
  {
    id: 'tabletop', sa: 'Bharmanasana', en: 'Tabletop', he: 'שולחן', cat: 'warm-up', sec: 'warm', flow: 10, d: 1, hold: 30, sides: 'single',
    ru: 'Стол', tags: ['relax', 'back', 'flex'],
    cue: {
      he: ['ידיים מתחת לכתפיים, ברכיים מתחת לירכיים.', 'גב ארוך ונייטרלי, מבט אל הרצפה.', 'לחצו בעדינות את כף היד אל הרצפה.', 'נשמו לאט אל הבטן.'],
      en: ['Hands under shoulders, knees under hips.', 'Keep a long, neutral spine and look at the floor.', 'Press your palms gently into the floor.', 'Breathe slowly into your belly.'],
      ru: ['Ладони под плечами, колени под бёдрами.', 'Держите спину длинной и ровной, смотрите в пол.', 'Мягко надавите ладонями на пол.', 'Дышите медленно, животом.'],
    },
    safe: { he: 'כאבי פרקי כף יד או ברך: הניחו שמיכה מתחת לברכיים או רדו לאמות.', en: 'Wrist or knee pain: pad your knees with a blanket or lower onto forearms.', ru: 'Если болят запястья или колени, подложите одеяло под колени или опуститесь на предплечья.' },
    v: [
      { he: 'על האמות: מקלה על פרקי כף היד.', en: 'On forearms: easier on the wrists.', ru: 'На предплечьях: так легче запястьям.' },
      { he: 'שולחן יציב על כפות הידיים.', en: 'Steady tabletop on your palms.', ru: 'Устойчивый стол на ладонях.' },
      { he: 'הושיטו יד אחת קדימה ורגל נגדית אחורה, האגן ישר, וחזרו לשולחן בשליטה.', en: 'Reach one arm forward and the opposite leg back, keep the pelvis level, then return to tabletop with control.', ru: 'Вытяните одну руку вперёд, а противоположную ногу назад, удерживайте таз ровно и плавно вернитесь в положение стола.' },
    ],
  },
  {
    id: 'cat-cow', sa: 'Marjaryasana-Bitilasana', en: 'Cat-Cow flow', he: 'זרימת חתול ופרה', cat: 'warm-up', sec: 'warm', flow: 15, d: 1, hold: 30, sides: 'single', isFlow: true,
    ru: 'Кошка и корова, поток', tags: ['relax', 'back', 'flex'],
    cue: {
      he: ['על ארבע, ידיים מתחת לכתפיים וברכיים מתחת לירכיים.', 'בשאיפה הורידו את הבטן והרימו את החזה, פרה.', 'בנשיפה עגלו את הגב לתקרה, חתול.', 'המשיכו לנוע לאט, תנועה אחת לכל נשימה.'],
      en: ['On all fours, hands under shoulders and knees under hips.', 'Inhale: drop the belly and lift the chest, cow.', 'Exhale: round the back toward the ceiling, cat.', 'Keep moving slowly, one movement per breath.'],
      ru: ['Встаньте на четвереньки, ладони под плечами, колени под бёдрами.', 'На вдохе опустите живот и поднимите грудь, корова.', 'На выдохе округлите спину к потолку, кошка.', 'Двигайтесь медленно, одно движение на одно дыхание.'],
    },
    safe: { he: 'כאבי פרקי כף יד, ברכיים או צוואר: הקטינו את התנועה והניחו שמיכה מתחת לברכיים.', en: 'Wrist, knee or neck pain: make the movement smaller and pad the knees with a blanket.', ru: 'При боли в запястьях, коленях или шее делайте движение меньше и подложите одеяло под колени.' },
    v: [
      { he: 'תנועה קטנה ונעימה.', en: 'Small, comfortable movement.', ru: 'Небольшое, комфортное движение.' },
      { he: 'זרימה מלאה עם הנשימה.', en: 'Full flow with the breath.', ru: 'Полный поток в ритме дыхания.' },
      { he: 'זרימה עמוקה יותר, מבט מורם בפרה.', en: 'Deeper flow with a lifted gaze in cow.', ru: 'Глубже, взгляд поднят в положении коровы.' },
    ],
  },
  {
    id: 'sun-salutation-a', sa: 'Surya Namaskar A', en: 'Sun Salutation A (home version)', he: 'ברכת השמש א׳ (גרסה ביתית)', ru: 'Приветствие солнцу А (домашняя версия)', cat: 'warm-up', sec: 'warm', flow: 18, d: 2, hold: 72, sides: 'single', isFlow: true,
    tags: ['flex', 'strength'],
    cue: {
      he: ['עמדו בהר; שאפו והרימו ידיים, נשפו לקיפול עם ברכיים רכות.', 'שאפו לחצי הרמה; נשפו והחזירו רגליים לאחור לפי הרמה, בלי צ׳טורנגה.', 'שאפו לקוברה נמוכה; נשפו דרך שולחן או תנוחת הילד אל כלב מביט מטה.', 'צעדו קדימה: שאפו לחצי הרמה, נשפו לקיפול, שאפו ועלו; נשפו ידיים אל הלב.'],
      en: ['From Mountain, inhale arms up and exhale to a soft-knee fold.', 'Inhale to half lift; exhale and step back to your level, with no chaturanga.', 'Inhale to low cobra; exhale through tabletop or Child’s Pose to Downward Dog.', 'Step forward, half lift, fold, rise with arms up, then exhale hands to heart.'],
      ru: ['Из Горы вдохните, поднимите руки и с выдохом наклонитесь, смягчая колени.', 'Вдох — полунаклон; выдох — шаг назад по своему уровню, без чатуранги.', 'Вдох — низкая кобра; выдох — через стол или позу ребёнка в собаку мордой вниз.', 'Шаг вперёд, полунаклон, наклон, подъём с руками вверх и выдох — ладони к сердцу.'],
    },
    safe: {
      he: 'זה אינו ייעוץ רפואי. לחץ דם או סחרחורת: דלגו על מצבים שבהם הראש נמוך מהלב, או השאירו ראש גבוה וברכיים רכות. בהריון: אין לשכב על הבטן; החליפו את ההורדה בשולחן ובחתול־פרה. רגישות בפרקי כף היד: הישענו על אגרופים או אמות ועצרו אם כואב. גב תחתון: קוברה נמוכה בלבד; צוואר ארוך ומבט קדימה־מטה.',
      en: 'Not medical advice. For blood-pressure concerns or dizziness, skip head-below-heart steps or keep the head high with soft knees. During pregnancy, do not lie on the belly; replace the lowering with tabletop and Cat-Cow. For wrist issues use fists or forearms; keep cobra low and the neck long.',
      ru: 'Это не медицинская рекомендация. При проблемах с давлением или головокружении пропустите положения ниже уровня сердца либо держите голову выше, смягчая колени. При беременности не ложитесь на живот: замените опускание столом и кошкой-коровой. При боли в запястьях используйте кулаки или предплечья; кобра низкая, шея длинная.',
    },
    v: [
      { he: 'ברכיים נשארות למטה: ברכיים־חזה־סנטר, קוברה נמוכה על האמות וברכיים רכות בקיפולים.', en: 'Knees stay down: knees-chest-chin, low forearm cobra, and soft knees in folds.', ru: 'Колени остаются на полу: колени-грудь-подбородок, низкая кобра на предплечьях, мягкие колени в наклонах.' },
      { he: 'קרש על הברכיים, ירידה לבטן, קוברה נמוכה וכלב מביט מטה.', en: 'Knees plank, lower to the belly, low cobra, and Downward Dog.', ru: 'Планка с колен, опускание на живот, низкая кобра и собака мордой вниз.' },
      { he: 'קרש מלא, ירידה אל הבטן, קוברה, כלב מביט מטה וצעד קדימה — ללא צ׳טורנגה וללא כלב מביט מעלה.', en: 'Full plank, lower to the belly, cobra, Downward Dog, and step through—no chaturanga or Upward Dog.', ru: 'Полная планка, опускание на живот, кобра, собака мордой вниз и шаг вперёд — без чатуранги и собаки мордой вверх.' },
    ],
  },
  {
    id: 'cat', sa: 'Marjaryasana', en: 'Cat', he: 'חתול', cat: 'warm-up', sec: 'warm', flow: 20, d: 1, hold: 30, sides: 'single',
    ru: 'Кошка', tags: ['relax', 'back', 'flex'],
    cue: {
      he: ['בנשיפה עגלו את הגב כלפי התקרה.', 'הכניסו את הסנטר אל החזה, הטו את האגן אחורה ועצם הזנב פנימה.', 'דחפו את הרצפה והרחיקו את השכמות זו מזו.', 'חזרו לנוע לאט עם הנשימה.'],
      en: ['Exhale and round your back toward the ceiling.', 'Tuck your chin and tilt your pelvis under.', 'Push the floor away and spread the shoulder blades.', 'Keep moving slowly with your breath.'],
      ru: ['На выдохе округлите спину к потолку.', 'Подтяните подбородок к груди и подкрутите таз, копчик вниз.', 'Отталкивайтесь от пола и разводите лопатки.', 'Двигайтесь медленно, в ритме дыхания.'],
    },
    safe: { he: 'שמרו על תנועה קטנה אם יש כאב צוואר או גב. אל תכפו את הצוואר בכוח.', en: 'Keep the movement small if your neck or back hurts. Do not force the neck.', ru: 'При боли в шее или пояснице делайте движение меньше. Не напрягайте шею.' },
    v: [
      { he: 'תנועה קטנה ונעימה.', en: 'Small, comfortable movement.', ru: 'Небольшое, комфортное движение.' },
      { he: 'עיגול מלא של הגב.', en: 'Full rounding of the spine.', ru: 'Полное округление спины.' },
      { he: 'עיגול עמוק יותר עם כיווץ הבטן.', en: 'Deeper rounding, drawing the belly in.', ru: 'Более глубокое округление, живот подтянут.' },
    ],
  },
  {
    id: 'cow', sa: 'Bitilasana', en: 'Cow', he: 'פרה', cat: 'warm-up', sec: 'warm', flow: 30, d: 1, hold: 30, sides: 'single',
    ru: 'Корова', tags: ['relax', 'back', 'flex'],
    cue: {
      he: ['בשאיפה הניחו לבטן לרדת והרימו את החזה.', 'הרחיקו את הכתפיים מהאוזניים.', 'מבט קדימה או מעט למעלה, בלי להכביד על הצוואר.', 'התחלפו בין חתול לפרה בקצב הנשימה.'],
      en: ['Inhale, let the belly drop and lift your chest.', 'Keep your shoulders away from your ears.', 'Look forward or slightly up without straining the neck.', 'Alternate with cat at the pace of your breath.'],
      ru: ['На вдохе опустите живот и поднимите грудь.', 'Держите плечи подальше от ушей.', 'Смотрите вперёд или чуть выше, не напрягая шею.', 'Чередуйте с кошкой в ритме дыхания.'],
    },
    safe: { he: 'אם יש כאב בגב התחתון, הקטינו את הקשת. צוואר רגיש: שמרו על מבט אל הרצפה.', en: 'If your lower back hurts, make the arch smaller. Sensitive neck: keep your gaze down.', ru: 'Если болит поясница, сделайте прогиб меньше. Если шея чувствительна, смотрите вниз.' },
    v: [
      { he: 'קשת קטנה, מבט אל הרצפה.', en: 'Small arch, gaze down.', ru: 'Небольшой прогиб, взгляд вниз.' },
      { he: 'קשת נינוחה, חזה פתוח.', en: 'Relaxed arch, open chest.', ru: 'Спокойный прогиб, грудь открыта.' },
      { he: 'קשת עמוקה יותר והרמת מבט.', en: 'Deeper arch and lifted gaze.', ru: 'Прогиб глубже, взгляд поднят.' },
    ],
  },
  {
    id: 'upward-salute', sa: 'Urdhva Hastasana', en: 'Upward salute', he: 'הרמת ידיים למעלה', cat: 'warm-up', sec: 'warm', flow: 40, d: 1, hold: 20, sides: 'single',
    ru: 'Руки вверх', tags: ['flex', 'back', 'relax'],
    cue: {
      he: ['עמדו עם כפות רגליים ברוחב האגן.', 'בשאיפה הרימו את הידיים לצדדים ולמעלה.', 'הרחיקו את הכתפיים מהאוזניים.', 'אורך בעמוד השדרה, נשימה רגועה.'],
      en: ['Stand with feet hip-width apart.', 'Inhale and sweep your arms out and up.', 'Keep your shoulders away from your ears.', 'Lengthen the spine and breathe calmly.'],
      ru: ['Встаньте, стопы на ширине таза.', 'На вдохе поднимите руки через стороны вверх.', 'Держите плечи подальше от ушей.', 'Вытяните позвоночник и дышите спокойно.'],
    },
    safe: { he: 'בעיות כתפיים: הרימו רק עד גובה נוח. סחרחורת: הורידו את הידיים לאט.', en: 'Shoulder issues: raise only as far as comfortable. If dizzy, lower your arms slowly.', ru: 'При проблемах с плечами поднимайте руки лишь до удобной высоты. Если закружилась голова, медленно опустите руки.' },
    v: [
      { he: 'ידיים באלכסון, לא גבוה מדי.', en: 'Arms on a diagonal, not too high.', ru: 'Руки по диагонали, не слишком высоко.' },
      { he: 'ידיים למעלה לאורך האוזניים.', en: 'Arms up beside the ears.', ru: 'Руки вверх вдоль ушей.' },
      { he: 'קשת עדינה לאחור ועמידה על קצות האצבעות.', en: 'Gentle backward arch and rise onto the toes.', ru: 'Лёгкий прогиб назад и подъём на носки.' },
    ],
  },
];
