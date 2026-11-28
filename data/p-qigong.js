// Qigong and joint warm-up exercises, standing (original content). Used by the "qigong-joints" preset; not used by the generator.
const V = (he0, en0, ru0, he1, en1, ru1) => [
  { he: he0, en: en0, ru: ru0 },
  { he: he1, en: en1, ru: ru1 },
  { he: he1, en: en1, ru: ru1 },
];
export default [
  {
    id: 'qg-ground', sa: 'Qigong · Grounding', en: 'Sensing the ground', he: 'הרגשת הקרקע', ru: 'Почувствовать землю', cat: 'qigong', sec: 'qigong', flow: 1, d: 1, hold: 35, sides: 'single', tags: ['relax', 'balance'],
    cue: {
      he: ['הרפו את כל הגוף.', 'הרגישו את כפות הרגליים על הרצפה.', 'העבירו את המשקל לאט מרגל לרגל.'],
      en: ['Let your whole body relax.', 'Feel your feet on the floor.', 'Slowly shift your weight from foot to foot.'],
      ru: ['Расслабьте всё тело.', 'Почувствуйте стопы на полу.', 'Медленно переносите вес с ноги на ногу.'],
    },
    safe: { he: 'אם קשה לעמוד, אפשר לעשות את זה בישיבה על כיסא.', en: 'If standing is hard, do this sitting on a chair.', ru: 'Если стоять трудно, делайте это сидя на стуле.' },
    v: V('עמידה רכה, או ישיבה על כיסא.', 'Soft standing, or sitting on a chair.', 'Мягко стоя или сидя на стуле.', 'עמידה רפויה, הברכיים רכות.', 'Relaxed standing, soft knees.', 'Расслабленно стоя, колени мягкие.'),
  },
  {
    id: 'qg-hand-channels', sa: 'Qigong · Hand channels', en: 'Cleansing the hand channels', he: 'ניקוי ערוצי האנרגיה בידיים', ru: 'Очищение каналов рук', cat: 'qigong', sec: 'qigong', flow: 2, d: 1, hold: 108, sides: 'single', tags: ['relax'],
    cue: {
      he: ['התחילו ביד שמאל, מהזרת. החליקו על כל אצבע פעמיים.', 'דמיינו שאתם סוחטים החוצה את האנרגיה הישנה, כמו דרך צינור.', 'אחר כך היד השנייה, ואותו דבר ברגליים.'],
      en: ['Start with the left hand, from the little finger. Slide along each finger twice.', 'Imagine squeezing old energy out, as if through a pipe.', 'Then the other hand, and the same along the legs.'],
      ru: ['Начните с левой руки, с мизинца. Проведите по каждому пальцу дважды.', 'Представьте, что выжимаете старую энергию, как через трубку.', 'Потом другая рука, и так же по ногам.'],
    },
    safe: { he: 'האצבעות רפויות, בלי ללחוץ חזק. אפשר בישיבה.', en: 'Keep the fingers relaxed and do not squeeze hard. You can sit.', ru: 'Пальцы расслаблены, не сжимайте сильно. Можно сидя.' },
    v: V('בישיבה על כיסא, בתנועה עדינה.', 'Sitting on a chair, gently.', 'Сидя на стуле, мягко.', 'בעמידה, כל אצבע פעמיים.', 'Standing, each finger twice.', 'Стоя, каждый палец дважды.'),
  },
  {
    id: 'qg-heel-drops', sa: 'Qigong · Heel drops', en: 'Heel drops', he: 'קפיצות על העקבים', ru: 'Встряхивание на пятках', cat: 'qigong', sec: 'qigong', flow: 3, d: 1, hold: 84, sides: 'single', tags: ['energy'],
    cue: {
      he: ['הבהונות כאילו דבוקות לרצפה.', 'דחיפה קטנה למעלה, ואז תנו לגוף ליפול על העקבים.', 'כל הגוף רפוי, גם השוקיים.'],
      en: ['Toes stay as if glued to the floor.', 'A small push up, then let the body drop onto the heels.', 'The whole body stays loose, calves too.'],
      ru: ['Пальцы ног будто приклеены к полу.', 'Небольшой толчок вверх, и дайте телу опуститься на пятки.', 'Всё тело расслаблено, икры тоже.'],
    },
    safe: { he: 'בהריון, בבעיות ברכיים, גב או שיווי משקל: רק הרימו והורידו את העקבים בעדינות, בלי קפיצה, ואפשר להחזיק בכיסא.', en: 'Pregnancy, knee, back or balance problems: only lift and lower the heels gently, no bouncing, and hold a chair if needed.', ru: 'При беременности, проблемах с коленями, спиной или равновесием: только мягко поднимайте и опускайте пятки, без подскоков, можно держаться за стул.' },
    v: V('הרמה והורדה עדינה של העקבים, בלי קפיצה.', 'Gently lift and lower the heels, no bounce.', 'Мягко поднимайте и опускайте пятки, без подскока.', 'דחיפה קטנה ונפילה רפויה על העקבים.', 'A small push and a loose drop onto the heels.', 'Небольшой толчок и свободное опускание на пятки.'),
  },
  {
    id: 'qg-release-down', sa: 'Qigong · Release', en: 'Releasing tension to the ground', he: 'שחרור המתח לאדמה', ru: 'Напряжение уходит в землю', cat: 'qigong', sec: 'qigong', flow: 4, d: 1, hold: 70, sides: 'single', tags: ['relax'],
    cue: {
      he: ['עמדו רגועים והקשיבו לגוף.', 'הרגישו איך כל המיותר זורם לאדמה.', 'הנשימה חופשית.'],
      en: ['Stand calmly and listen to your body.', 'Feel everything extra flowing down into the ground.', 'Breathe freely.'],
      ru: ['Стойте спокойно и прислушайтесь к телу.', 'Почувствуйте, как всё лишнее уходит в землю.', 'Дыхание свободное.'],
    },
    safe: { he: 'אם קשה לעמוד, אפשר לשבת על כיסא.', en: 'If standing is hard, sit on a chair.', ru: 'Если стоять трудно, сядьте на стул.' },
    v: V('ישיבה או עמידה רכה.', 'Sitting or soft standing.', 'Сидя или мягко стоя.', 'עמידה רפויה, הראש מעט מורכן.', 'Relaxed standing, head slightly bowed.', 'Расслабленно стоя, голова слегка опущена.'),
  },
  {
    id: 'qg-sky-press', sa: 'Qigong · Sky to earth', en: 'Sky energy to the earth', he: 'אנרגיית השמיים לאדמה', ru: 'Энергия неба в землю', cat: 'qigong', sec: 'qigong', flow: 5, d: 1, hold: 66, sides: 'single', tags: ['energy', 'shoulders'],
    cue: {
      he: ['בשאיפה, הרימו את הידיים ואספו אנרגיה מהשמיים.', 'בנשיפה, כמו בוכנה, דחפו את המיותר דרך הגוף לאדמה.', 'הכתפיים נשארות רפויות.'],
      en: ['Inhale, raise your arms and gather energy from the sky.', 'Exhale, like a piston, press everything extra down through the body into the ground.', 'Keep the shoulders relaxed.'],
      ru: ['На вдохе поднимите руки и соберите энергию неба.', 'На выдохе, как поршнем, протолкните всё лишнее через тело в землю.', 'Плечи остаются расслабленными.'],
    },
    safe: { he: 'כתפיים רגישות: הרימו את הידיים רק לגובה שנוח.', en: 'Sensitive shoulders: raise the arms only as high as is comfortable.', ru: 'Если плечи чувствительны, поднимайте руки только до удобной высоты.' },
    v: V('הידיים עולות רק עד גובה הכתפיים.', 'Arms rise only to shoulder height.', 'Руки поднимаются только до уровня плеч.', 'הידיים עד למעלה, ודחיפה איטית למטה.', 'Arms all the way up, then a slow press down.', 'Руки до самого верха, затем медленно вниз.'),
  },
  {
    id: 'qg-zhgonka-heel', sa: 'Qigong · Zhgonka', en: 'Swing twist from the heel', he: "ז'גונקה מהעקב", ru: 'Жгонка от пятки', cat: 'qigong', sec: 'qigong', flow: 6, d: 1, hold: 96, sides: 'single', tags: ['twist', 'back', 'energy'],
    cue: {
      he: ['דחיפה מהעקב של רגל אחת, וכל הגוף הרפוי מסתובב לצד השני.', 'ואז דחיפה מהעקב של הרגל השנייה.', 'הידיים חופשיות, הגוף זז מעצמו.'],
      en: ['Push from one heel and let the loose body swing to the other side.', 'Then push from the other heel.', 'Arms are free; the body moves by itself.'],
      ru: ['Толчок от пятки одной ноги, и свободное тело поворачивается в другую сторону.', 'Затем толчок от пятки другой ноги.', 'Руки свободны, тело движется само.'],
    },
    safe: { he: 'בהריון או בגב רגיש: סיבוב קטן ועדין, בלי תנופה חזקה.', en: 'Pregnancy or a sensitive back: a small, gentle turn without a strong swing.', ru: 'При беременности или чувствительной спине: небольшой мягкий поворот, без сильного размаха.' },
    v: V('סיבוב קטן ועדין.', 'A small, gentle turn.', 'Небольшой мягкий поворот.', 'סיבוב חופשי מדחיפת העקב.', 'A free swing from the heel push.', 'Свободный поворот от толчка пятки.'),
  },
  {
    id: 'qg-zhgonka-legs', sa: 'Qigong · Zhgonka', en: 'Swing twist from both legs', he: "ז'גונקה משתי הרגליים", ru: 'Жгонка от обеих ног', cat: 'qigong', sec: 'qigong', flow: 7, d: 1, hold: 60, sides: 'single', tags: ['twist', 'back', 'legs', 'energy'],
    cue: {
      he: ['כופפו קצת את הברכיים.', 'דחפו משתי הרגליים ביחד, והידיים זזות לבד.', 'הידיים חופשיות, כמו שוטים.'],
      en: ['Bend your knees a little.', 'Push from both legs together and let the arms move by themselves.', 'Arms are free, like whips.'],
      ru: ['Немного согните колени.', 'Толкнитесь обеими ногами, и руки двигаются сами.', 'Руки свободны, как плети.'],
    },
    safe: { he: 'בהריון, בברכיים או בגב רגישים: כיפוף קטן וסיבוב קטן.', en: 'Pregnancy, sensitive knees or back: bend a little and turn a little.', ru: 'При беременности, чувствительных коленях или спине: сгибайте немного и поворачивайтесь немного.' },
    v: V('כיפוף קטן בברכיים וסיבוב קטן.', 'A small knee bend and a small turn.', 'Небольшое сгибание коленей и небольшой поворот.', 'דחיפה משתי הרגליים וסיבוב חופשי.', 'Push from both legs and swing freely.', 'Толчок обеими ногами и свободный поворот.'),
  },
  {
    id: 'qg-arm-whips', sa: 'Qigong · Arm whips', en: 'Arm whips', he: 'ידיים כמו שוטים', ru: 'Руки как плети', cat: 'qigong', sec: 'qigong', flow: 8, d: 1, hold: 74, sides: 'single', tags: ['shoulders', 'energy'],
    cue: {
      he: ['תנו לידיים להתנדנד.', 'הגוף מניע אותן, והן פשוט תלויות.', 'ואז לכיוון השני.'],
      en: ['Let your arms swing.', 'The body moves them; they just hang.', 'Then the other direction.'],
      ru: ['Позвольте рукам раскачиваться.', 'Их двигает тело, руки просто висят.', 'Затем в другую сторону.'],
    },
    safe: { he: 'כתפיים רגישות: תנועה קטנה, בלי לזרוק את הידיים בכוח.', en: 'Sensitive shoulders: a small movement, do not throw the arms hard.', ru: 'Если плечи чувствительны: небольшое движение, не бросайте руки с силой.' },
    v: V('נדנוד קטן ורך.', 'A small, soft swing.', 'Небольшое мягкое раскачивание.', 'נדנוד חופשי לשני הכיוונים.', 'A free swing both ways.', 'Свободное раскачивание в обе стороны.'),
  },
  {
    id: 'qg-pelvis-eight', sa: 'Qigong · Pelvis eight', en: 'Pelvis figure eight', he: 'שמונה באגן', ru: 'Восьмёрка тазом', cat: 'qigong', sec: 'qigong', flow: 9, d: 1, hold: 25, sides: 'single', tags: ['hips', 'back'],
    cue: {
      he: ['ידיים על המותניים.', 'ציירו שמונה עם האגן.', 'הכתפיים רגועות, הברכיים רכות.'],
      en: ['Hands on your waist.', 'Draw a figure eight with your pelvis.', 'Shoulders calm, knees soft.'],
      ru: ['Руки на талии.', 'Нарисуйте тазом восьмёрку.', 'Плечи спокойны, колени мягкие.'],
    },
    safe: { he: 'גב תחתון רגיש: שמונה קטנה ואיטית.', en: 'Sensitive lower back: a small, slow eight.', ru: 'Если чувствительна поясница: маленькая медленная восьмёрка.' },
    v: V('שמונה קטנה.', 'A small eight.', 'Маленькая восьмёрка.', 'שמונה רחבה ונינוחה.', 'A wide, easy eight.', 'Широкая свободная восьмёрка.'),
  },
  {
    id: 'qg-knee-eight', sa: 'Qigong · Knee eight', en: 'Knee figure eight', he: 'שמונה בברך', ru: 'Восьмёрка коленом', cat: 'qigong', sec: 'qigong', flow: 10, d: 1, hold: 35, sides: 'both', tags: ['hips', 'balance', 'knees'],
    cue: {
      he: ['הרימו רגל אחת.', 'ציירו שמונה עם הברך.', 'אפשר להיעזר בידיים או בקיר לשיווי משקל.'],
      en: ['Lift one leg.', 'Draw a figure eight with the knee.', 'Use your hands or a wall for balance.'],
      ru: ['Поднимите одну ногу.', 'Нарисуйте коленом восьмёрку.', 'Для равновесия можно опереться на стену.'],
    },
    safe: { he: 'בהריון, בברכיים רגישות או בשיווי משקל לא יציב: החזיקו בקיר או בכיסא, והרימו את הברך רק מעט.', en: 'Pregnancy, sensitive knees or unsteady balance: hold a wall or chair and lift the knee only a little.', ru: 'При беременности, чувствительных коленях или неустойчивом равновесии: держитесь за стену или стул и поднимайте колено лишь немного.' },
    v: V('עם יד על קיר או כיסא, הברך נמוכה.', 'One hand on a wall or chair, knee low.', 'Рукой о стену или стул, колено низко.', 'הברך גבוהה, שמונה רחבה.', 'Knee high, a wide eight.', 'Колено высоко, широкая восьмёрка.'),
  },
  {
    id: 'qg-foot-boat', sa: 'Qigong · Foot boat', en: 'Foot boat', he: 'סירה בכף הרגל', ru: 'Лодочка стопой', cat: 'qigong', sec: 'qigong', flow: 11, d: 1, hold: 55, sides: 'both', tags: ['balance', 'ankles'],
    cue: {
      he: ['כף הרגל היא כמו סירה.', 'החרטום מצייר שמונה לפניכם.', 'ואחר כך העקב מוביל את השמונה.'],
      en: ['Your foot is like a boat.', 'Its bow draws a figure eight in front of you.', 'Then the heel leads the eight.'],
      ru: ['Стопа как лодочка.', 'Её нос рисует перед Вами восьмёрку.', 'Потом восьмёрку ведёт пятка.'],
    },
    safe: { he: 'בהריון או בשיווי משקל לא יציב: החזיקו בקיר או בכיסא.', en: 'Pregnancy or unsteady balance: hold a wall or a chair.', ru: 'При беременности или неустойчивом равновесии держитесь за стену или стул.' },
    v: V('עם יד על קיר או כיסא, שמונה קטנה.', 'Hand on a wall or chair, a small eight.', 'Рукой о стену или стул, маленькая восьмёрка.', 'שמונה גדולה, כמה שאפשר.', 'A big eight, as big as you can.', 'Большая восьмёрка, насколько можете.'),
  },
  {
    id: 'qg-palm-rub', sa: 'Qigong · Palm rub', en: 'Palm rubbing', he: 'שפשוף כפות הידיים', ru: 'Растирание ладоней', cat: 'qigong', sec: 'qigong', flow: 12, d: 1, hold: 30, sides: 'single', tags: ['relax'],
    cue: {
      he: ['שפשפו את כפות הידיים עד שהן חמות.', 'הכתפיים רפויות, רק הידיים עובדות.', 'הרגישו את החום בין כפות הידיים.'],
      en: ['Rub your palms until they are warm.', 'Shoulders loose; only the hands work.', 'Feel the warmth between your palms.'],
      ru: ['Растирайте ладони, пока они не станут тёплыми.', 'Плечи расслаблены, работают только руки.', 'Почувствуйте тепло между ладонями.'],
    },
    safe: { he: 'שפשפו בקצב שלכם, עד חום נעים.', en: 'Rub at your own pace, until pleasantly warm.', ru: 'Растирайте в своём темпе, до приятного тепла.' },
    v: V('שפשוף איטי.', 'Slow rubbing.', 'Медленное растирание.', 'שפשוף מהיר עד חום.', 'Brisk rubbing until warm.', 'Быстрое растирание до тепла.'),
  },
  {
    id: 'qg-child-prays', sa: 'Qigong · Child prays', en: 'Little child prays to the Buddha', he: 'ילד קטן מתפלל לבודהה', ru: 'Маленький ребёнок молится Будде', cat: 'qigong', sec: 'qigong', flow: 13, d: 1, hold: 206, sides: 'single', tags: ['wrists', 'relax'],
    cue: {
      he: ['רגליים ברוחב הכתפיים, הברכיים רכות.', 'ידיים צמודות מול החזה.', 'סובבו את פרקי הידיים, שמונה פעמים פנימה ושמונה החוצה.'],
      en: ['Feet shoulder-width apart, knees soft.', 'Palms pressed together in front of the chest.', 'Circle the wrists, eight times inward and eight outward.'],
      ru: ['Стопы на ширине плеч, колени мягкие.', 'Ладони сложены перед грудью.', 'Вращайте запястьями, восемь раз внутрь и восемь наружу.'],
    },
    safe: { he: 'עמידה ארוכה קשה? אפשר לעשות את התרגיל בישיבה על כיסא. פרקי ידיים רגישים: עיגולים קטנים.', en: 'Long standing is hard? Do it sitting on a chair. Sensitive wrists: small circles.', ru: 'Если долго стоять трудно, делайте сидя на стуле. Если чувствительны запястья, делайте маленькие круги.' },
    v: V('בישיבה, עיגולים קטנים.', 'Sitting, small circles.', 'Сидя, маленькие круги.', 'בעמידה, עיגולים מלאים.', 'Standing, full circles.', 'Стоя, полные круги.'),
  },
  {
    id: 'qg-big-buddha', sa: 'Qigong · Big Buddha', en: 'Big Buddha scans the earth', he: 'בודהה גדול סורק את האדמה', ru: 'Большой Будда сканирует землю', cat: 'qigong', sec: 'qigong', flow: 14, d: 1, hold: 295, sides: 'single', tags: ['shoulders', 'chest'],
    cue: {
      he: ['דמיינו שאתם בודהה ענקי, וכפות הידיים מרגישות את האדמה.', 'פתחו את הידיים לצדדים, והרגישו איך החזה נפתח.', 'בנשיפה, סגרו את הידיים קדימה. בשאיפה, הצמידו את השכמות.'],
      en: ['Imagine you are a giant Buddha; your palms sense the earth.', 'Open your arms wide to the sides and feel the chest open.', 'Exhale, close the arms forward. Inhale, draw the shoulder blades together.'],
      ru: ['Представьте себя огромным Буддой, ладони чувствуют землю.', 'Раскройте руки в стороны и почувствуйте, как раскрывается грудь.', 'На выдохе сведите руки вперёд. На вдохе сведите лопатки.'],
    },
    safe: { he: 'עמידה ארוכה קשה? אפשר בישיבה על כיסא. כתפיים רגישות: הידיים נמוכות יותר.', en: 'Long standing is hard? Do it sitting on a chair. Sensitive shoulders: keep the arms lower.', ru: 'Если долго стоять трудно, делайте сидя на стуле. Если плечи чувствительны, держите руки ниже.' },
    v: V('בישיבה, ידיים נמוכות יותר.', 'Sitting, arms lower.', 'Сидя, руки ниже.', 'בעמידה, ידיים רחבות לגובה הכתפיים.', 'Standing, arms wide at shoulder height.', 'Стоя, руки широко на уровне плеч.'),
  },
  {
    id: 'qg-crane', sa: 'Qigong · Crane', en: 'Crane drinks water', he: 'עגור שותה מים', ru: 'Журавль пьёт воду', cat: 'qigong', sec: 'qigong', flow: 15, d: 1, hold: 288, sides: 'single', tags: ['neck'],
    cue: {
      he: ['מתחו את הסנטר קדימה, ואז עשו חצי עיגול גדול.', 'שמונה פעמים לכל צד.', 'ואז העגור שותה מים, פעמיים.'],
      en: ['Stretch your chin forward, then draw a big half circle.', 'Eight times to each side.', 'Then the crane drinks water, twice.'],
      ru: ['Вытяните подбородок вперёд и нарисуйте большой полукруг.', 'Восемь раз в каждую сторону.', 'Потом журавль пьёт воду, дважды.'],
    },
    safe: { he: 'צוואר רגיש: עיגול קטן ואיטי, והצוואר לא נלחץ לאחור.', en: 'Sensitive neck: a small, slow circle, and do not press the neck back.', ru: 'Если шея чувствительна: маленький медленный круг, не запрокидывайте шею назад.' },
    v: V('עיגול קטן ואיטי.', 'A small, slow circle.', 'Маленький медленный круг.', 'חצי עיגול גדול עם הסנטר.', 'A big half circle with the chin.', 'Большой полукруг подбородком.'),
  },
  {
    id: 'qg-dragon', sa: 'Qigong · Dragon', en: 'Dragon whirlpool', he: 'מערבולת הדרקון', ru: 'Водоворот дракона', cat: 'qigong', sec: 'qigong', flow: 16, d: 1, hold: 281, sides: 'single', tags: ['hips', 'back', 'legs'],
    cue: {
      he: ['עמדו בפישוק רחב ויציב, ידיים חמות על הכליות.', 'סובבו את האגן, שמונה פעמים שמאלה ושמונה ימינה.', 'בסוף, שלוש דחיפות מהעקבים.'],
      en: ['Stand in a wide, steady stance, warm hands on your kidneys.', 'Circle the pelvis, eight times left and eight times right.', 'At the end, three pushes from the heels.'],
      ru: ['Встаньте широко и устойчиво, тёплые ладони на почках.', 'Вращайте тазом, восемь раз влево и восемь вправо.', 'В конце три толчка пятками.'],
    },
    safe: { he: 'בהריון, בברכיים או בגב רגישים: פישוק קטן יותר, סיבוב קטן, ודחיפות עדינות מאוד.', en: 'Pregnancy, sensitive knees or back: a narrower stance, smaller circles and very gentle pushes.', ru: 'При беременности, чувствительных коленях или спине: стойка уже, круги меньше, толчки очень мягкие.' },
    v: V('פישוק קטן, סיבוב קטן.', 'A narrower stance, small circles.', 'Стойка уже, круги меньше.', 'פישוק רחב, סיבוב מלא.', 'A wide stance, full circles.', 'Широкая стойка, полные круги.'),
  },
];
