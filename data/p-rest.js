// Supine and resting poses (original content)
export default [
  {
    id: 'knees-to-chest', sa: 'Apanasana', en: 'Knees to chest', he: 'ברכיים לחזה', ru: 'Колени к груди', cat: 'supine', sec: 'cool', flow: 60, d: 1, hold: 30, sides: 'single',
    tags: ['back', 'relax', 'flex'], start: 'lie',
    kf: { t: 180, s: 172, h: 165, a: [60, 20], l: [112, -165, -100], fix: { a: { to: 'l', pt: 'knee', bend: 1 } } },
    cue: {
      he: ['שכבו על הגב וקרבו את שתי הברכיים לחזה.', 'חבקו את הברכיים או את השוקיים.', 'הרפו את הכתפיים והראש לרצפה.', 'נשמו עמוק, ואפשר להתנדנד קלות.'],
      en: ['Lie on your back and draw both knees toward the chest.', 'Hug the knees or the shins.', 'Let the shoulders and head rest on the floor.', 'Breathe deeply; a gentle rock is fine.'],
      ru: ['Лягте на спину и подтяните оба колена к груди.', 'Обхватите колени или голени руками.', 'Пусть плечи и голова лежат на полу.', 'Дышите глубоко, можно слегка покачаться.'],
    },
    safe: { he: 'בהריון מתקדם או כאבי ברכיים: פתחו מעט את הברכיים או חבקו ירך אחת.', en: 'Late pregnancy or knee pain: open the knees slightly or hug one leg.', ru: 'При поздней беременности или боли в коленях слегка раздвиньте колени или обнимите одну ногу.' },
    v: [
      { he: 'ברך אחת בכל פעם.', en: 'One knee at a time.', ru: 'По одному колену.', kf: { m: [20, -75, 0], s: 180, h: 180 } },
      { he: 'שתי ברכיים לחזה.', en: 'Both knees to the chest.', ru: 'Оба колена к груди.', kf: {} },
      { he: 'הרימו גם את הראש לכיוון הברכיים.', en: 'Also lift the head toward the knees.', ru: 'Поднимите голову к коленям.', kf: { s: 150, h: 135, t: 175 } },
    ],
  },
  {
    id: 'supine-twist', sa: 'Supta Matsyendrasana', en: 'Reclined twist', he: 'סיבוב בשכיבה', ru: 'Скручивание лёжа', cat: 'twist', sec: 'cool', flow: 70, d: 1, hold: 35, sides: 'both',
    tags: ['back', 'relax', 'flex'], start: 'lie',
    kf: { t: 180, s: 180, h: 188, a: [-55, -50], b: [105, 110], l: [50, 10, 0], m: [58, 18, 0], z: { l: [0.85, 0.8, 0.7], m: [0.85, 0.8, 0.7], a: 0.3, b: 0.75 } },
    cue: {
      he: ['שכבו על הגב, ברכיים כפופות.', 'הורידו את שתי הברכיים לצד אחד.', 'פתחו את הידיים לצדדים והכתפיים נשארות על הרצפה.', 'הפנו את המבט לצד ההפוך ונשמו.'],
      en: ['Lie on your back with the knees bent.', 'Lower both knees to one side.', 'Open the arms wide and keep the shoulders on the floor.', 'Turn your gaze the other way and breathe.'],
      ru: ['Лягте на спину, колени согнуты.', 'Опустите оба колена в одну сторону.', 'Раскройте руки в стороны, плечи остаются на полу.', 'Поверните взгляд в другую сторону и дышите.'],
    },
    safe: { he: 'כאבי גב תחתון או הריון: הניחו כרית מתחת לברכיים ורדו רק עד נוחות.', en: 'Lower back pain or pregnancy: place a cushion under the knees and go only as far as comfortable.', ru: 'При боли в пояснице или беременности подложите подушку под колени и опускайтесь лишь до удобного предела.' },
    v: [
      { he: 'ברכיים על כרית, סיבוב קטן.', en: 'Knees on a cushion, small twist.', ru: 'Колени на подушке, небольшое скручивание.', kf: { l: [75, -30, 0], m: [80, -25, 0], z: { l: [0.95, 0.9, 0.8], m: [0.95, 0.9, 0.8], a: 0.3, b: 0.85 }, a: [-45, -45], b: [95, 100] } },
      { he: 'שתי ברכיים לצד.', en: 'Both knees to the side.', ru: 'Оба колена в сторону.', kf: {} },
      { he: 'רגל אחת ישרה, יד אוחזת בברך.', en: 'One leg straight, hand on the bent knee.', ru: 'Одна нога прямая, рука на согнутом колене.', kf: { m: [0, 0, 80], z: { l: [0.85, 0.8, 0.7], m: 1, a: 0.3, b: 0.75 }, l: [45, 5, 0] } },
    ],
  },
  {
    id: 'happy-baby', sa: 'Ananda Balasana', en: 'Happy baby', he: 'תינוק שמח', ru: 'Счастливый малыш', cat: 'hip opener', sec: 'cool', flow: 80, d: 2, hold: 30, sides: 'single',
    tags: ['flex', 'relax', 'back'], start: 'lie',
    kf: { t: 180, s: 158, h: 150, a: [60, 70], l: [130, 85, 90], fix: { a: { to: 'l', pt: 'ankle', bend: 1 } } },
    cue: {
      he: ['שכבו על הגב והרימו את הברכיים לכיוון בתי השחי.', 'אחזו בחלק החיצוני של כפות הרגליים.', 'הניחו לאגן ולגב התחתון להישאר ברצפה.', 'נדנדו מעט מצד לצד אם נעים.'],
      en: ['Lie on your back and draw the knees toward the armpits.', 'Hold the outer edges of your feet.', 'Keep the pelvis and lower back resting on the floor.', 'Rock gently side to side if it feels good.'],
      ru: ['Лягте на спину и подтяните колени к подмышкам.', 'Возьмитесь за внешние края стоп.', 'Таз и поясница остаются на полу.', 'Если приятно, слегка покачайтесь из стороны в сторону.'],
    },
    safe: { he: 'כאבי צוואר או הריון מתקדם: אחזו בשוקיים או ברצועה, ושמרו את הראש על הרצפה.', en: 'Neck pain or late pregnancy: hold the shins or a strap and keep the head down.', ru: 'При боли в шее или поздней беременности держитесь за голени или ремень, голова лежит на полу.' },
    v: [
      { he: 'אחיזה בשוקיים.', en: 'Hold the shins.', ru: 'Держите голени.', kf: { fix: { a: { to: 'l', pt: 'knee', bend: 1 } }, l: [115, 100, 90], s: 170, h: 165 } },
      { he: 'אחיזה בקצוות כפות הרגליים.', en: 'Hold the outer feet.', ru: 'Держите внешние края стоп.', kf: {} },
      { he: 'ברכיים רחבות יותר וגב פתוח.', en: 'Knees wider, back open.', ru: 'Колени шире, спина раскрыта.', kf: { l: [140, 80, 85], s: 150 } },
    ],
  },
  {
    id: 'figure-four', sa: 'Supta Kapotasana', en: 'Reclined figure four', he: 'ארבע שכובה', ru: 'Лёжа, ноги «четвёркой»', cat: 'hip opener', sec: 'cool', flow: 90, d: 2, hold: 30, sides: 'both',
    tags: ['flex', 'back', 'noback'], start: 'lie',
    kf: { t: 180, s: 178, h: 175, a: [-10, -8], l: [55, -80, 0], m: [125, -20, -90], z: { m: [0.95, 0.9, 0.9] }, fix: { m: { to: 'l', pt: 'knee', bend: 1 } } },
    cue: {
      he: ['שכבו על הגב, ברכיים כפופות.', 'הניחו קרסול אחד על הירך הנגדית.', 'משכו את הרגל התומכת לעבר החזה.', 'לחצו קלות את הברך שבחוץ והרפו.'],
      en: ['Lie on your back with the knees bent.', 'Cross one ankle over the opposite thigh.', 'Draw the supporting leg toward your chest.', 'Gently press the outer knee away and release.'],
      ru: ['Лягте на спину, колени согнуты.', 'Положите одну лодыжку на противоположное бедро.', 'Подтяните опорную ногу к груди.', 'Мягко отведите наружное колено и расслабьтесь.'],
    },
    safe: { he: 'כאבי ברכיים: כופפו את כף הרגל העליונה ואל תלחצו על הברך. אפשר להשאיר את כף הרגל התחתונה על הרצפה.', en: 'Knee pain: flex the top foot and never press the knee. You may keep the lower foot on the floor.', ru: 'При боли в коленях согните верхнюю стопу и не давите на колено. Нижнюю стопу можно оставить на полу.' },
    v: [
      { he: 'כף רגל תחתונה על הרצפה.', en: 'Lower foot on the floor.', ru: 'Нижняя стопа на полу.', kf: {} },
      { he: 'רגל תחתונה באוויר, ידיים סביב הירך.', en: 'Lower leg lifted, hands around the thigh.', ru: 'Нижняя нога поднята, руки обхватывают бедро.', kf: { l: [90, 5, 0] } },
      { he: 'משיכה קרובה יותר לחזה.', en: 'Draw the leg closer to the chest.', ru: 'Подтяните ногу ближе к груди.', kf: { l: [105, 15, 0], s: 160, h: 150, fix: { a: { to: 'l', pt: 'knee', bend: 1 } } } },
    ],
  },
  {
    id: 'hand-to-toe', sa: 'Supta Padangusthasana', en: 'Reclined hand-to-toe', he: 'יד לבוהן בשכיבה', ru: 'Лёжа, рука к стопе', cat: 'supine', sec: 'cool', flow: 50, d: 2, hold: 30, sides: 'both',
    tags: ['flex', 'back', 'noback'], start: 'lie',
    kf: { t: 180, s: 180, h: 178, a: [58, 50], l: [82, 82, 95], m: [-3, -3, 80] },
    cue: {
      he: ['שכבו על הגב, הרימו רגל אחת למעלה.', 'השתמשו ברצועה סביב כף הרגל.', 'הרגל השנייה נשארת פעילה על הרצפה.', 'משכו קלות ונשמו, בלי לעגל את הגב.'],
      en: ['Lie on your back and raise one leg.', 'Use a strap around the foot.', 'The other leg stays active on the floor.', 'Pull lightly and breathe; do not round the back.'],
      ru: ['Лягте на спину и поднимите одну ногу.', 'Используйте ремень вокруг стопы.', 'Другая нога остаётся активной на полу.', 'Слегка потяните и дышите, не округляя спину.'],
    },
    safe: { he: 'כאבי גב תחתון: כופפו ברך שעל הרצפה. אל תכפו את הרגל המורמת.', en: 'Lower back pain: bend the knee on the floor. Do not force the raised leg.', ru: 'При боли в пояснице согните колено на полу. Не форсируйте поднятую ногу.' },
    v: [
      { he: 'ברך מורמת כפופה, רצועה.', en: 'Raised knee bent, with a strap.', ru: 'Поднятое колено согнуто, с ремнём.', props: [{ type: 'strap', arm: 'a', leg: 'l' }], kf: { l: [75, 35, 60] } },
      { he: 'רגל ישרה עם רצועה.', en: 'Straight leg with a strap.', ru: 'Нога прямая, с ремнём.', props: [{ type: 'strap', arm: 'a', leg: 'l' }], kf: {} },
      { he: 'הרגל קרובה לפנים, אחיזה בבוהן.', en: 'Leg close to the face, holding the toe.', ru: 'Нога ближе к лицу, рука держит палец.', kf: { l: [100, 100, 100], s: 160, h: 150, fix: { a: { to: 'l', pt: 'toe', bend: 1 } } } },
    ],
  },
  {
    id: 'legs-up-wall', sa: 'Viparita Karani', en: 'Legs up the wall', he: 'רגליים על הקיר', ru: 'Ноги на стене', cat: 'inversion-light', sec: 'cool', flow: 95, d: 1, hold: 60, sides: 'single',
    tags: ['relax', 'back'], start: 'lie',
    kf: { t: 180, s: 180, h: 180, a: [-9, -7], l: [90, 90, 90] },
    cue: {
      he: ['שבו ליד הקיר ושכבו על הגב.', 'הניחו את הרגליים על הקיר, האגן קרוב אליו.', 'הידיים רפויות לצדדים, כפות ידיים כלפי מעלה.', 'עצמו עיניים ונשמו לאט.'],
      en: ['Sit beside a wall and lie back.', 'Rest the legs up the wall with the hips close to it.', 'Let the arms fall loosely to the sides, palms up.', 'Close the eyes and breathe slowly.'],
      ru: ['Сядьте у стены и лягте на спину.', 'Положите ноги на стену, таз близко к ней.', 'Руки свободно в стороны, ладони вверх.', 'Закройте глаза и дышите медленно.'],
    },
    safe: { he: 'גלאוקומה, לחץ דם גבוה מאוד או הריון מתקדם: דלגו או הרימו את הרגליים רק מעט. אם מתרחשת נימול ברגליים, הורידו אותן.', en: 'Glaucoma, very high blood pressure or late pregnancy: skip or raise the legs only slightly. If the legs go numb, lower them.', ru: 'При глаукоме, очень высоком давлении или поздней беременности пропустите позу или поднимайте ноги лишь слегка. Если ноги немеют, опустите их.' },
    v: [
      { he: 'ברכיים כפופות על הקיר.', en: 'Knees bent against the wall.', ru: 'Колени согнуты, стопы на стене.', props: [{ type: 'wall' }], kf: { l: [55, 100, 100], a: [-10, -8] } },
      { he: 'רגליים ישרות על הקיר.', en: 'Legs straight up the wall.', ru: 'Ноги прямые вдоль стены.', props: [{ type: 'wall' }], kf: {} },
      { he: 'ידיים מעל הראש, פתיחת חזה.', en: 'Arms overhead, opening the chest.', ru: 'Руки над головой, грудь раскрыта.', props: [{ type: 'wall' }], kf: { a: [172, 175] } },
    ],
  },
  {
    id: 'savasana', sa: 'Savasana', en: 'Final rest', he: 'שכיבת מנוחה', ru: 'Шавасана', cat: 'rest', sec: 'rest', flow: 100, d: 1, hold: 90, sides: 'single',
    tags: ['relax'], start: 'lie',
    kf: { t: 180, s: 180, h: 180, a: [-6, -3], l: [-2, -2, 75] },
    cue: {
      he: ['שכבו על הגב ופרשו את הרגליים קלות.', 'ידיים לצדדים, כפות ידיים כלפי מעלה.', 'הרפו את הפנים, הלסת והבטן.', 'הניחו לנשימה לחזור לקצב טבעי.'],
      en: ['Lie on your back with the legs slightly apart.', 'Arms by your sides, palms up.', 'Soften the face, jaw and belly.', 'Let the breath return to its natural rhythm.'],
      ru: ['Лягте на спину, ноги слегка разведены.', 'Руки вдоль тела, ладони вверх.', 'Расслабьте лицо, челюсть и живот.', 'Пусть дыхание вернётся к естественному ритму.'],
    },
    safe: { he: 'כאבי גב תחתון או הריון מתקדם: כופפו ברכיים או שכבו על הצד. התכסו אם קר.', en: 'Lower back pain or late pregnancy: bend the knees or lie on your side. Cover up if you are cold.', ru: 'При боли в пояснице или поздней беременности согните колени или лягте на бок. Укройтесь, если холодно.' },
    v: [
      { he: 'ברכיים כפופות, כפות רגליים על הרצפה.', en: 'Knees bent, feet on the floor.', ru: 'Колени согнуты, стопы на полу.', kf: { l: [53, -76, 0] } },
      { he: 'רגליים ישרות, ידיים ליד הגוף.', en: 'Legs straight, arms by your sides.', ru: 'Ноги прямые, руки вдоль тела.', kf: {} },
      { he: 'ידיים רחוקות מהגוף ועיניים עצומות.', en: 'Arms away from the body, eyes closed.', ru: 'Руки в стороны от тела, глаза закрыты.', kf: { a: [-9, -7] } },
    ],
  },
];
