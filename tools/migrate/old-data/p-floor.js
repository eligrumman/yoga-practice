// Floor, kneeling, seated and backbend poses (original content)
const HIPS = { a: { to: 'hip', bend: -1 }, b: { to: 'hip', bend: -1 } };
export default [
  {
    id: 'downward-dog', sa: 'Adho Mukha Svanasana', en: 'Downward dog', he: 'כלב מביט מטה', ru: 'Собака мордой вниз', cat: 'inversion-light', sec: 'floor', flow: 10, d: 2, hold: 30, sides: 'single',
    tags: ['strength', 'flex', 'back'], start: 'table',
    kf: { t: -48, s: -48, h: -60, a: [-48, -48], l: [-100, -100, -20], fix: { a: { x: 44, bend: -1 } } },
    cue: {
      he: ['מעמד שולחן: הרימו את האגן למעלה ואחורה.', 'לחצו את כפות הידיים לרצפה והאריכו את הגב.', 'הברכיים יכולות להישאר כפופות.', 'הרפו את הראש והצוואר ונשמו.'],
      en: ['From tabletop, lift your hips up and back.', 'Press your palms down and lengthen the spine.', 'The knees may stay bent.', 'Relax the head and neck and breathe.'],
      ru: ['Из позы стола поднимите таз вверх и назад.', 'Надавите ладонями на пол и вытяните спину.', 'Колени могут оставаться согнутыми.', 'Расслабьте голову и шею и дышите.'],
    },
    safe: { he: 'כאבי פרקי כף יד, לחץ דם גבוה או גלאוקומה: קצרו את ההחזקה או דלגו. הרמת הראש מעל הלב היא הפוכה עדינה.', en: 'Wrist pain, high blood pressure or glaucoma: keep it short or skip. Head below the heart is a mild inversion.', ru: 'При боли в запястьях, высоком давлении или глаукоме держите позу недолго или пропустите. Голова ниже сердца — это лёгкая инверсия.' },
    v: [
      { he: 'ברכיים כפופות, עקבים באוויר.', en: 'Bent knees, heels off the floor.', ru: 'Колени согнуты, пятки над полом.', kf: { l: [-112, -72, -20], t: -42, s: -42, a: [-42, -42], fix: { a: { x: 50, bend: -1 } } } },
      { he: 'רגליים כמעט ישרות, האגן גבוה.', en: 'Almost straight legs, hips high.', ru: 'Ноги почти прямые, таз высоко.', kf: {} },
      { he: 'עקבים לכיוון הרצפה וכתפיים פתוחות.', en: 'Heels reach toward the floor, shoulders open.', ru: 'Пятки тянутся к полу, плечи раскрыты.', kf: { l: [-98, -98, -50], a: [-52, -52], t: -52, s: -52 } },
    ],
  },
  {
    id: 'plank', sa: 'Phalakasana', en: 'Plank', he: 'קרש', ru: 'Планка', cat: 'floor/seated', sec: 'floor', flow: 20, d: 2, hold: 20, sides: 'single',
    tags: ['strength'], start: 'table',
    kf: { t: 22, s: 22, h: 25, a: [-90, -90], l: [-158, -158, -70], fix: { a: { x: 0, bend: -1 } } },
    cue: {
      he: ['כפות ידיים מתחת לכתפיים, גוף בקו אחד.', 'כווצו את הבטן ואל תתנו לאגן לצנוח.', 'דחפו את הרצפה והרחיקו את העקבים לאחור.', 'נשמו קצר וקבוע.'],
      en: ['Palms under the shoulders, body in one line.', 'Engage the belly and do not let the hips sag.', 'Press the floor away and reach the heels back.', 'Keep your breath short and steady.'],
      ru: ['Ладони под плечами, тело в одну линию.', 'Напрягите живот и не давайте тазу провисать.', 'Отталкивайтесь от пола и тянитесь пятками назад.', 'Дышите коротко и ровно.'],
    },
    safe: { he: 'כאבי פרקי כף יד, כתף או גב תחתון: רדו לברכיים. עצרו אם הגב התחתון צונח.', en: 'Wrist, shoulder or lower-back pain: drop to the knees. Stop if the lower back sags.', ru: 'При боли в запястьях, плечах или пояснице опуститесь на колени. Остановитесь, если поясница проваливается.' },
    v: [
      { he: 'על הברכיים.', en: 'On the knees.', ru: 'На коленях.', kf: { t: 38, s: 38, h: 40, l: [-142, 180, 180] } },
      { he: 'קרש מלא על קצות האצבעות.', en: 'Full plank on the toes.', ru: 'Полная планка на носках.', kf: {} },
      { he: 'הרמת רגל אחת לאחור.', en: 'Lift one leg behind you.', ru: 'Поднимите одну ногу назад.', kf: { m: [172, 172, 150] } },
    ],
  },
  {
    id: 'cobra', sa: 'Bhujangasana', en: 'Cobra', he: 'קוברה', ru: 'Кобра', cat: 'backbend', sec: 'floor', flow: 30, d: 1, hold: 20, sides: 'single',
    tags: ['back', 'flex', 'strength'], start: 'prone',
    kf: { t: 5, s: 45, h: 55, a: [-100, -30], l: [182, 182, 180] },
    cue: {
      he: ['שכבו על הבטן, כפות ידיים מתחת לכתפיים.', 'בשאיפה הרימו את החזה בעדינות.', 'המרפקים קרובים לגוף, הכתפיים רחוקות מהאוזניים.', 'הרגליים נשארות על הרצפה.'],
      en: ['Lie on your belly with palms under the shoulders.', 'Inhale and lift the chest gently.', 'Keep the elbows close and shoulders away from the ears.', 'Legs stay on the floor.'],
      ru: ['Лягте на живот, ладони под плечами.', 'На вдохе мягко приподнимите грудь.', 'Локти прижаты к бокам, плечи подальше от ушей.', 'Ноги остаются на полу.'],
    },
    safe: { he: 'בהריון, בפציעת גב או בקיעי בטן: הישארו נמוכים. אל תלחצו על הגב התחתון.', en: 'Pregnancy, back injury or hernia: stay low. Do not crunch the lower back.', ru: 'При беременности, травме спины или грыже оставайтесь низко. Не прогибайтесь в пояснице через силу.' },
    v: [
      { he: 'על האמות, חזה נמוך.', en: 'On forearms, low chest.', ru: 'На предплечьях, грудь невысоко.', kf: { s: 38, h: 45, fix: { a: { fore: true } }, a: [-90, 0] } },
      { he: 'כפות ידיים לרצפה, חזה מורם.', en: 'Palms down, chest lifted.', ru: 'Ладони на полу, грудь поднята.', kf: { fix: { a: { x: -4, bend: 1 } } } },
      { he: 'הרמה גבוהה יותר וזרועות ישרות יותר.', en: 'Higher lift with straighter arms.', ru: 'Выше подъём, руки почти прямые.', kf: { t: 14, s: 62, h: 75, fix: { a: { x: 6, bend: 1 } } } },
    ],
  },
  {
    id: 'locust', sa: 'Salabhasana', en: 'Locust', he: 'ארבה', ru: 'Саранча', cat: 'backbend', sec: 'floor', flow: 40, d: 2, hold: 15, sides: 'single',
    tags: ['back', 'strength'], start: 'prone',
    kf: { t: 4, s: 22, h: 30, a: [175, 175], l: [174, 174, 178] },
    cue: {
      he: ['שכבו על הבטן וידיים לצדי הגוף.', 'הרימו חזה ורגליים יחד, מבלי להרים את הצוואר.', 'הארכו את הגוף מהראש ועד העקבים.', 'נשמו רגוע, ואז הורידו לאט.'],
      en: ['Lie on your belly with arms by your sides.', 'Lift chest and legs together without cranking the neck.', 'Lengthen from the head to the heels.', 'Breathe calmly, then lower slowly.'],
      ru: ['Лягте на живот, руки вдоль тела.', 'Поднимите грудь и ноги вместе, не запрокидывая шею.', 'Вытягивайтесь от макушки до пяток.', 'Дышите спокойно, затем медленно опуститесь.'],
    },
    safe: { he: 'כאבי גב תחתון, בהריון: הרימו רק חזה או רק רגליים, מעט.', en: 'Lower back pain or pregnancy: lift only the chest or only the legs, slightly.', ru: 'При боли в пояснице или беременности поднимайте понемногу только грудь или только ноги.' },
    v: [
      { he: 'הרימו רק את החזה.', en: 'Lift only the chest.', ru: 'Поднимите только грудь.', kf: { l: [182, 182, 180], s: 20, a: [185, 185] } },
      { he: 'חזה ורגליים באוויר.', en: 'Chest and legs lifted.', ru: 'Грудь и ноги приподняты.', kf: {} },
      { he: 'ידיים פשוטות קדימה, הרמה גבוהה.', en: 'Arms reaching forward, higher lift.', ru: 'Руки вытянуты вперёд, подъём выше.', kf: { a: [25, 25], l: [166, 166, 170], s: 30, h: 38 } },
    ],
  },
  {
    id: 'camel', sa: 'Ustrasana', en: 'Camel', he: 'גמל', ru: 'Верблюд', cat: 'backbend', sec: 'floor', flow: 50, d: 3, hold: 15, sides: 'single',
    tags: ['flex', 'noback'], start: 'kneel',
    kf: { t: 86, s: 108, h: 130, a: [-125, -130], l: [-90, 180, 180], fix: { a: { to: 'l', pt: 'ankle', bend: 1 }, b: { to: 'l', pt: 'ankle', bend: 1 } } },
    cue: {
      he: ['כרעו על הברכיים, ירכיים מעל הברכיים.', 'כפות הידיים על הגב התחתון, אצבעות כלפי מטה.', 'הרימו את החזה והרחיבו אותו לתקרה.', 'הניחו לראש ולצוואר להישאר נוחים.'],
      en: ['Kneel with the hips over the knees.', 'Place the hands on your lower back, fingers down.', 'Lift the chest and open it toward the ceiling.', 'Keep the head and neck comfortable.'],
      ru: ['Встаньте на колени, бёдра над коленями.', 'Положите руки на поясницу, пальцы вниз.', 'Поднимите грудь и раскройте её к потолку.', 'Голова и шея остаются в удобном положении.'],
    },
    safe: { he: 'בעיות צוואר, לחץ דם או גב תחתון: שמרו את הסנטר קרוב והישארו ידיים במותניים.', en: 'Neck, blood pressure or lower back issues: tuck the chin and keep hands on the lower back.', ru: 'При проблемах с шеей, давлением или поясницей прижмите подбородок и держите руки на пояснице.' },
    v: [
      { he: 'ידיים במותניים, קשת קטנה.', en: 'Hands on the lower back, small arch.', ru: 'Руки на пояснице, небольшой прогиб.', kf: { t: 90, s: 108, h: 112, fix: { a: { to: 'hip', dx: -10, bend: -1 }, b: { to: 'hip', dx: -10, bend: -1 } } } },
      { he: 'קשת בינונית וידיים לכיוון העקבים.', en: 'Medium arch, hands toward the heels.', ru: 'Средний прогиб, руки тянутся к пяткам.', kf: {} },
      { he: 'קשת עמוקה יותר, מבט לאחור.', en: 'Deeper arch, gaze back.', ru: 'Прогиб глубже, взгляд назад.', kf: { t: 90, s: 124, h: 150 } },
    ],
  },
  {
    id: 'bridge', sa: 'Setu Bandhasana', en: 'Bridge', he: 'גשר', ru: 'Мост', cat: 'backbend', sec: 'floor', flow: 60, d: 1, hold: 20, sides: 'single',
    tags: ['back', 'strength', 'relax'], start: 'lie',
    kf: { t: -135, s: -118, h: -172, a: [-5, -5], l: [-22, -118, 0], fix: { a: { x: 72, bend: -1 } } },
    cue: {
      he: ['שכבו על הגב, ברכיים כפופות, עקבים קרובים לאגן.', 'לחצו את כפות הרגליים והרימו את האגן.', 'הרחיקו את הברכיים זו מזו קלות, לא יותר מרוחב האגן.', 'הורידו אחרי כמה נשימות, חוליה אחר חוליה.', 'הראש נשאר על הרצפה והצוואר רפוי; אל תסובבו את הראש.'],
      en: ['Lie on your back, knees bent, heels near the hips.', 'Press the feet down and lift the hips.', 'Keep the knees hip-width apart.', 'Lower after a few breaths, one vertebra at a time.', 'The head stays on the floor, neck relaxed; do not turn the head.'],
      ru: ['Лягте на спину, колени согнуты, пятки у таза.', 'Надавите стопами на пол и поднимите таз.', 'Колени держите на ширине таза.', 'Через несколько вдохов медленно опуститесь, позвонок за позвонком.', 'Голова остаётся на полу, шея расслаблена; не поворачивайте голову.'],
    },
    safe: { he: 'הראש נשאר על הרצפה והצוואר רפוי; אל תסובבו את הראש בזמן ההחזקה. צוואר רגיש: הניחו שמיכה מתחת לכתפיים.', en: 'The head stays on the floor, neck relaxed; do not turn the head while holding. Sensitive neck: place a folded blanket under the shoulders.', ru: 'Голова остаётся на полу, шея расслаблена; не поворачивайте голову во время удержания. Если шея чувствительна, подложите сложенное одеяло под плечи.' },
    v: [
      { he: 'הרמה נמוכה של האגן.', en: 'Low lift of the hips.', ru: 'Небольшой подъём таза.', kf: { t: -148, s: -134, h: -165, l: [-8, -110, 0] } },
      { he: 'גשר יציב עם ידיים ליד הגוף.', en: 'Steady bridge with arms alongside.', ru: 'Устойчивый мост, руки вдоль тела.', kf: {} },
      { he: 'גשר גבוה יותר, ידיים לוחצות אל הרצפה לצד הגוף.', en: 'Higher bridge, arms pressing into the floor alongside.', ru: 'Мост выше, руки прижаты к полу вдоль тела.', kf: { t: -125, s: -110, h: -175, l: [-28, -122, 0] } },
    ],
  },
  {
    id: 'child', sa: 'Balasana', en: "Child's pose", he: 'תנוחת הילד', ru: 'Поза ребёнка', cat: 'floor/seated', sec: 'cool', flow: 10, d: 1, hold: 40, sides: 'single',
    tags: ['relax', 'back', 'flex'], start: 'kneel',
    kf: { t: -5, s: -10, h: -15, a: [-15, -10], l: [-25, 180, 180], fix: { a: { x: 70, bend: -1 } } },
    cue: {
      he: ['שבו על העקבים והניחו את החזה על הירכיים.', 'הושיטו ידיים קדימה והניחו אותן על הרצפה.', 'הרפו את הכתפיים והמצח לרצפה.', 'נשמו אל הגב התחתון.'],
      en: ['Sit back on your heels and rest the chest on the thighs.', 'Reach the arms forward and rest them on the floor.', 'Let the shoulders and forehead soften.', 'Breathe into your lower back.'],
      ru: ['Сядьте на пятки и положите грудь на бёдра.', 'Вытяните руки вперёд и положите их на пол.', 'Расслабьте плечи и лоб.', 'Дышите в поясницу.'],
    },
    safe: { he: 'כאבי ברכיים או הריון: פתחו ברכיים והניחו כרית בין העקבים לאגן.', en: 'Knee pain or pregnancy: open the knees and place a cushion between heels and hips.', ru: 'При боли в коленях или беременности раздвиньте колени и положите подушку между пятками и тазом.' },
    v: [
      { he: 'אגן גבוה יותר, ידיים לצד הגוף.', en: 'Hips higher, hands by your sides.', ru: 'Таз выше, руки вдоль тела.', kf: { l: [-40, 180, 180], t: -12, s: -22, h: -30, a: [-175, -170], fix: { a: null } } },
      { he: 'ידיים קדימה והמצח למטה.', en: 'Arms forward, forehead down.', ru: 'Руки вперёд, лоб вниз.', kf: {} },
      { he: 'אגן נמוך על העקבים, ידיים רחוקות קדימה.', en: 'Hips low on the heels, arms far forward.', ru: 'Таз низко на пятках, руки далеко вперёд.', kf: { l: [-15, 180, 180], t: -12, s: -15, fix: { a: { x: 80, bend: -1 } } } },
    ],
  },
  {
    id: 'low-lunge', sa: 'Anjaneyasana', en: 'Low lunge', he: 'מצעד נמוך', ru: 'Низкий выпад', cat: 'hip opener', sec: 'floor', flow: 70, d: 1, hold: 25, sides: 'both',
    tags: ['flex', 'strength'], start: 'kneel',
    kf: { t: 92, s: 92, h: 92, a: [92, 94], l: [5, -92, 0], m: [-100, 178, 180] },
    cue: {
      he: ['מעמד שולחן, צעדו עם רגל אחת קדימה בין הידיים.', 'הברך האחורית על הרצפה, הברך הקדמית מעל הקרסול.', 'הרימו את הגוף ואת הידיים כלפי מעלה.', 'לחצו את האגן קלות קדימה ונשמו.'],
      en: ['From tabletop, step one foot forward between the hands.', 'Back knee on the floor, front knee over the ankle.', 'Lift the torso and raise the arms.', 'Sink the hips gently forward and breathe.'],
      ru: ['Из позы стола поставьте одну стопу вперёд между руками.', 'Заднее колено на полу, переднее над лодыжкой.', 'Поднимите корпус и руки вверх.', 'Мягко опустите таз вниз и вперёд и дышите.'],
    },
    safe: { he: 'כאבי ברכיים: הניחו שמיכה מתחת לברך האחורית. בעיות איזון: השאירו ידיים על הירך.', en: 'Knee pain: pad the back knee with a blanket. Balance issues: keep hands on the front thigh.', ru: 'При боли в коленях подложите одеяло под заднее колено. Если трудно держать равновесие, оставьте руки на переднем бедре.' },
    v: [
      { he: 'ידיים על בלוקים משני צדי הרגל.', en: 'Hands on blocks beside the front foot.', ru: 'Руки на блоках по бокам от стопы.', props: [{ type: 'block', arms: ['a', 'b'] }], kf: { t: 60, s: 52, h: 45, a: [-55, -50], fix: { a: { x: 28, blockH: 22, bend: -1 }, b: { x: 28, blockH: 22, bend: -1 } } } },
      { he: 'ידיים למעלה, חזה פתוח.', en: 'Arms up, chest open.', ru: 'Руки вверх, грудь раскрыта.', kf: {} },
      { he: 'קשת לאחור ושתי ידיים מעל הראש.', en: 'Gentle backbend with both arms overhead.', ru: 'Лёгкий прогиб назад, обе руки над головой.', kf: { t: 95, s: 108, h: 122, a: [112, 118] } },
    ],
  },
  {
    id: 'half-split', sa: 'Ardha Hanumanasana', en: 'Half split', he: 'חצי פיצול', ru: 'Полушпагат', cat: 'forward fold', sec: 'floor', flow: 80, d: 2, hold: 25, sides: 'both',
    tags: ['flex', 'noback'], start: 'kneel',
    kf: { t: 28, s: 12, h: 5, a: [-20, -30], l: [-35, -35, 60], m: [-90, 180, 180], fix: { a: { to: 'l', pt: 'knee', bend: -1 } } },
    cue: {
      he: ['מעמד כריעה, ישרו רגל אחת קדימה והעקב על הרצפה.', 'האגן מעל הברך האחורית.', 'הארכו את הגב קדימה והניחו ידיים על הרגל או הרצפה.', 'כופפו את כף הרגל הקדמית אליכם ונשמו.'],
      en: ['From kneeling, straighten one leg forward with the heel on the floor.', 'Keep the hips above the back knee.', 'Lengthen the spine forward and rest hands on the leg or floor.', 'Flex the front foot toward you and breathe.'],
      ru: ['Из положения на коленях выпрямите одну ногу вперёд, пятка на полу.', 'Таз над задним коленом.', 'Вытяните спину вперёд, руки на ноге или на полу.', 'Потяните стопу на себя и дышите.'],
    },
    safe: { he: 'מתיחה בירך האחורית חזקה מדי? קצרו את המרחק. לא לעגל את הגב בכוח.', en: 'Too strong a hamstring stretch? Shorten the distance. Do not force a rounded back.', ru: 'Если растяжка задней поверхности бедра слишком сильная, слегка согните переднее колено. Не округляйте спину силой.' },
    v: [
      { he: 'ידיים על הירך, גב זקוף קלות.', en: 'Hands on the thigh, back fairly upright.', ru: 'Руки на бедре, спина почти прямая.', kf: { t: 58, s: 52, h: 48, fix: { a: { to: 'l', pt: 'knee', bend: -1 } } } },
      { he: 'ידיים על בלוקים, גב ארוך ושטוח.', en: 'Hands on blocks, long flat back.', ru: 'Руки на блоках, спина длинная и ровная.', props: [{ type: 'block', arms: ['a', 'b'] }], kf: { t: 34, s: 32, h: 30, fix: { a: { x: 30, blockH: 22, bend: -1 }, b: { x: 30, blockH: 22, bend: -1 } } } },
      { he: 'קיפול עמוק יותר, אחיזה בכף הרגל.', en: 'Deeper fold, holding the foot.', ru: 'Наклон глубже, рука держит стопу.', kf: { t: 10, s: -8, h: -16, fix: { a: { to: 'l', pt: 'toe', bend: -1 } } } },
    ],
  },
  {
    id: 'easy-seat', sa: 'Sukhasana', en: 'Easy seat', he: 'ישיבה נוחה', ru: 'Поза по-турецки', cat: 'floor/seated', sec: 'cool', flow: 20, d: 1, hold: 40, sides: 'single',
    tags: ['relax'], start: 'sit',
    kf: { t: 90, s: 90, h: 90, a: [-60, -50], l: [0, 180, -20], m: [10, 172, -20], fix: { a: { to: 'l', pt: 'knee', bend: -1 } } },
    cue: {
      he: ['שבו עם רגליים משוכלות בנוחות.', 'הושיבו את האגן גבוה מהברכיים אם צריך.', 'הארכו את עמוד השדרה והרפו את הכתפיים.', 'עצמו עיניים ונשמו לאט.'],
      en: ['Sit with your legs crossed comfortably.', 'Raise the hips above the knees if you need to.', 'Lengthen the spine and relax the shoulders.', 'Close your eyes and breathe slowly.'],
      ru: ['Сядьте, удобно скрестив ноги.', 'При необходимости сядьте на подушку, чтобы таз был выше колен.', 'Вытяните позвоночник и расслабьте плечи.', 'Закройте глаза и дышите медленно.'],
    },
    safe: { he: 'כאבי ברכיים או ירכיים: שבו על כרית גבוהה והחליפו את הרגל מלמעלה.', en: 'Knee or hip pain: sit on a high cushion and switch the top leg.', ru: 'При боли в коленях или бёдрах сядьте на высокую подушку и поменяйте верхнюю ногу.' },
    v: [
      { he: 'ישיבה על כרית, ידיים על הברכיים.', en: 'Seated on a cushion, hands on knees.', ru: 'Сидя на подушке, руки на коленях.', props: [{ type: 'cushion', h: 14 }], kf: {} },
      { he: 'ישיבה על הרצפה.', en: 'Seated on the floor.', ru: 'Сидя на полу.', kf: {} },
      { he: 'כפות ידיים מחוברות בחזה.', en: 'Palms together at the chest.', ru: 'Ладони вместе у груди.', kf: { a: [-55, 70], fix: { a: null } } },
    ],
  },
  {
    id: 'cobbler', sa: 'Baddha Konasana', en: 'Cobbler', he: 'סנדלר', ru: 'Бабочка', cat: 'hip opener', sec: 'cool', flow: 30, d: 1, hold: 30, sides: 'single',
    tags: ['flex', 'relax'], start: 'sit',
    kf: { t: 86, s: 84, h: 84, nz: 0, tw: 1.55, a: [-60, -100], l: [10, 205, 90], m: [170, -25, 90], z: { t: 0.92 }, fix: { a: { to: 'l', pt: 'knee', bend: 1 }, b: { to: 'm', pt: 'knee', bend: -1 } } },
    cue: {
      he: ['שבו וחברו את כפות הרגליים זו לזו.', 'הניחו לברכיים לרדת לצדדים.', 'אחזו בקרסוליים והאריכו את עמוד השדרה.', 'קפלו קדימה מעט מהירכיים, בנשימה.'],
      en: ['Sit and bring the soles of the feet together.', 'Let the knees fall out to the sides.', 'Hold the ankles and lengthen the spine.', 'Fold forward slightly from the hips with your breath.'],
      ru: ['Сядьте и соедините стопы подошвами.', 'Пусть колени опускаются в стороны.', 'Возьмитесь за лодыжки и вытяните позвоночник.', 'На выдохе слегка наклонитесь вперёд от бёдер.'],
    },
    safe: { he: 'כאבי ברכיים או מפשעה: הניחו כריות מתחת לברכיים ואל תלחצו עליהן.', en: 'Knee or groin pain: support the knees with cushions and never press on them.', ru: 'При боли в коленях или в паху подложите подушки под колени и не давите на них.' },
    v: [
      { he: 'ישיבה על כרית, גב זקוף.', en: 'On a cushion, upright back.', ru: 'На подушке, спина прямая.', props: [{ type: 'cushion', h: 14 }], kf: { t: 90, s: 90, h: 90, z: { t: 1 } } },
      { he: 'קיפול קל קדימה.', en: 'Gentle forward fold.', ru: 'Лёгкий наклон вперёд.', kf: {} },
      { he: 'קיפול עמוק, מצח לכיוון כפות הרגליים.', en: 'Deeper fold, forehead toward the feet.', ru: 'Глубокий наклон, лоб к стопам.', kf: { t: 90, s: 88, h: 78, z: { t: 0.8 } } },
    ],
  },
  {
    id: 'seated-fold', sa: 'Paschimottanasana', en: 'Seated forward fold', he: 'קיפול קדימה בישיבה', ru: 'Наклон вперёд сидя', cat: 'forward fold', sec: 'cool', flow: 40, d: 1, hold: 30, sides: 'single',
    tags: ['flex', 'relax', 'noback'], start: 'sit',
    kf: { t: 38, s: 18, h: 5, a: [0, 0], l: [-3, -3, 80], fix: { a: { to: 'l', pt: 'ankle', bend: -1 } } },
    cue: {
      he: ['שבו עם רגליים ישרות קדימה.', 'בשאיפה הארכו את הגב, בנשיפה כופפו מהירכיים.', 'אחזו בשוקיים, בקרסוליים או ברצועה.', 'הרפו את הראש והצוואר.'],
      en: ['Sit with your legs straight in front of you.', 'Inhale to lengthen, exhale to fold from the hips.', 'Hold the shins, ankles or a strap.', 'Let the head and neck relax.'],
      ru: ['Сядьте и вытяните ноги перед собой.', 'На вдохе вытяните спину, на выдохе наклонитесь от бёдер.', 'Возьмитесь за голени, лодыжки или ремень.', 'Расслабьте голову и шею.'],
    },
    safe: { he: 'בעיות גב או דיסק: כופפו ברכיים וארכו את הגב במקום לעגל.', en: 'Back or disc problems: bend the knees and keep the spine long instead of rounding.', ru: 'При проблемах со спиной или дисками согните колени и держите спину длинной, не округляя.' },
    v: [
      { he: 'ברכיים כפופות ורצועה סביב כפות הרגליים.', en: 'Bent knees with a strap around the feet.', ru: 'Колени согнуты, ремень вокруг стоп.', props: [{ type: 'strap', arm: 'a', leg: 'l' }], kf: { t: 65, s: 55, h: 50, l: [25, -10, 80], a: [-5, -10], fix: { a: null } } },
      { he: 'רגליים ישרות, ידיים על השוקיים.', en: 'Straight legs, hands on the shins.', ru: 'Ноги прямые, руки на голенях.', kf: {} },
      { he: 'קיפול עמוק, אחיזה בכפות הרגליים.', en: 'Deep fold, holding the feet.', ru: 'Глубокий наклон, руки держат стопы.', kf: { t: 14, s: 2, h: -6, fix: { a: { to: 'l', pt: 'toe', bend: -1 } } } },
    ],
  },
  {
    id: 'seated-twist', sa: 'Ardha Matsyendrasana', en: 'Seated twist', he: 'סיבוב בישיבה', ru: 'Скручивание сидя', cat: 'twist', sec: 'cool', flow: 50, d: 2, hold: 20, sides: 'both',
    tags: ['back', 'flex', 'noback'], start: 'sit',
    kf: { t: 92, s: 96, h: 100, nz: 0.1, a: [-110, -85], b: [65, 20], l: [62, -110, 0], m: [-3, -3, 80], tw: 1.55, fix: { a: { x: -22, bend: -1 }, b: { to: 'l', pt: 'knee', bend: 1 } } },
    cue: {
      he: ['שבו עם רגל אחת ישרה והשנייה כפופה כשכף הרגל על הרצפה.', 'הארכו את עמוד השדרה בשאיפה.', 'בנשיפה סובבו את החזה לכיוון הברך המורמת.', 'הסיבוב מגיע מהחזה. מבט עדין מעבר לכתף.'],
      en: ['Sit with one leg straight and one bent, foot on the floor.', 'Inhale to lengthen the spine.', 'Exhale and turn the chest toward the raised knee.', 'The turn comes from the chest. Gaze softly over the shoulder.'],
      ru: ['Сядьте: одна нога прямая, другая согнута, стопа на полу.', 'На вдохе вытяните позвоночник.', 'На выдохе поверните грудь к поднятому колену.', 'Поворот идёт от груди. Мягко смотрите через плечо.'],
    },
    safe: { he: 'בהריון, פיצול דיסק או בעיות בגב: סובבו מעט בלבד. אל תכפו.', en: 'Pregnancy, disc issues or back problems: twist only a little. Never force it.', ru: 'При беременности, проблемах с дисками или спиной скручивайтесь совсем немного. Не форсируйте.' },
    v: [
      { he: 'שתי רגליים ישרות, סיבוב קל.', en: 'Both legs straight, gentle twist.', ru: 'Обе ноги прямые, лёгкое скручивание.', kf: { l: [-3, -3, 80], h: 96, t: 90, s: 92, tw: 1.25, nz: 0.5, fix: { a: { x: -22, bend: -1 }, b: { to: 'hip', dx: 12, bend: 1 } } } },
      { he: 'ברך מורמת, יד סביב הברך.', en: 'Knee raised, arm around the knee.', ru: 'Колено поднято, рука обхватывает колено.', kf: {} },
      { he: 'סיבוב עמוק יותר עם חיבוק הברך.', en: 'Deeper twist, hugging the knee.', ru: 'Скручивание глубже, объятие колена.', kf: { s: 102, h: 108, b: [80, 40], tw: 1.8, nz: 0 } },
    ],
  },
  {
    id: 'boat', sa: 'Navasana', en: 'Boat', he: 'סירה', ru: 'Лодка', cat: 'floor/seated', sec: 'floor', flow: 90, d: 3, hold: 15, sides: 'single',
    tags: ['strength', 'noback'], start: 'sit',
    kf: { t: 108, s: 108, h: 104, a: [0, 0], l: [50, 50, 90] },
    cue: {
      he: ['שבו עם ברכיים כפופות והישענו מעט לאחור.', 'הרימו את הרגליים והישירו את הגב.', 'הושיטו ידיים קדימה במקביל לרצפה.', 'הבטן פעילה, הנשימה רגועה.'],
      en: ['Sit with knees bent and lean back slightly.', 'Lift the feet and keep the back long.', 'Reach the arms forward, parallel to the floor.', 'Keep the belly active and the breath calm.'],
      ru: ['Сядьте, колени согнуты, слегка отклонитесь назад.', 'Поднимите стопы и держите спину длинной.', 'Вытяните руки вперёд, параллельно полу.', 'Живот напряжён, дыхание спокойное.'],
    },
    safe: { he: 'כאבי גב תחתון או הריון: השאירו כפות רגליים על הרצפה. עצרו אם הגב מתעגל.', en: 'Lower back pain or pregnancy: keep the feet on the floor. Stop if the back rounds.', ru: 'При боли в пояснице или беременности оставьте стопы на полу. Остановитесь, если спина округляется.' },
    v: [
      { he: 'ברכיים כפופות, ידיים מאחורי הירכיים.', en: 'Bent knees, hands behind the thighs.', ru: 'Колени согнуты, руки за бёдрами.', kf: { t: 100, s: 100, h: 98, l: [55, -5, 80], fix: { a: { to: 'l', pt: 'knee', bend: -1 } } } },
      { he: 'ברכיים כפופות, שוקיים מקבילות לרצפה.', en: 'Knees bent, shins parallel to the floor.', ru: 'Колени согнуты, голени параллельны полу.', kf: { l: [62, 0, 80], a: [0, 0], t: 106, s: 106 } },
      { he: 'צורת V: רגליים ישרות, ידיים מקבילות לרצפה.', en: 'V shape: straight legs, arms parallel to the floor.', ru: 'Буква V: ноги прямые, руки параллельно полу.', kf: {} },
    ],
  },
];
