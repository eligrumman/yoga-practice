// Standing, balance, forward-fold and twist poses (original content)
const ST = [-90, -90, 0];
const W1 = { l: [-20, -90, 0], m: [-140, -140, 0], fix: { m: { x: -120 } } };
const HIPS = { a: { to: 'hip', bend: -1 }, b: { to: 'hip', bend: -1 } };
export default [
  {
    id: 'mountain', sa: 'Tadasana', en: 'Mountain', he: 'תנוחת ההר', ru: 'Гора', cat: 'standing', sec: 'stand', flow: 10, d: 1, hold: 30, sides: 'single',
    tags: ['relax', 'back', 'strength'], start: 'stand',
    kf: { t: 90, s: 90, h: 90, a: [-92, -90], l: ST },
    cue: {
      he: ['עמדו עם כפות רגליים ברוחב האגן ולחצו בעדינות לרצפה.', 'הניחו לברכיים להיות רכות, לא נעולות.', 'אורך בעמוד השדרה, כתפיים רפויות.', 'נשמו עמוק ורגיעו את הלסת.'],
      en: ['Stand with feet hip-width apart and press gently into the floor.', 'Keep the knees soft, not locked.', 'Lengthen the spine and relax the shoulders.', 'Breathe deeply and soften the jaw.'],
      ru: ['Встаньте, стопы на ширине таза, мягко надавите ими на пол.', 'Колени держите мягкими, не запирайте их.', 'Вытяните позвоночник, расслабьте плечи.', 'Дышите глубоко и расслабьте челюсть.'],
    },
    safe: { he: 'סחרחורת או לחץ דם נמוך: עמדו ליד קיר ופתחו מעט את הברכיים.', en: 'Dizziness or low blood pressure: stand near a wall and keep the knees slightly bent.', ru: 'При головокружении или низком давлении встаньте у стены и слегка согните колени.' },
    v: [
      { he: 'ברכיים רכות, ידיים רפויות.', en: 'Soft knees, relaxed arms.', ru: 'Колени мягкие, руки расслаблены.', kf: { l: [-85, -97, 0], a: [-90, -88] } },
      { he: 'עמידה זקופה ויציבה.', en: 'Tall, steady stance.', ru: 'Прямая, устойчивая стойка.', kf: {} },
      { he: 'כפות ידיים בחזה ועמידה על קצות האצבעות.', en: 'Palms at the chest and rise onto the toes.', ru: 'Ладони у груди, подъём на носки.', kf: { a: [-55, 70], l: [-90, -90, -55] } },
    ],
  },
  {
    id: 'chair', sa: 'Utkatasana', en: 'Chair', he: 'כיסא', ru: 'Стул', cat: 'standing', sec: 'stand', flow: 20, d: 2, hold: 25, sides: 'single',
    tags: ['strength'], start: 'stand',
    kf: { t: 62, s: 66, h: 70, a: [78, 78], l: [-35, -95, 0] },
    cue: {
      he: ['כופפו ברכיים כאילו אתם יושבים אחורה על כיסא.', 'הברכיים מעל הקרסוליים, המשקל על העקבים.', 'הרימו את הידיים ואריכו את הגב.', 'כווצו קלות את הבטן ונשמו.'],
      en: ['Bend the knees as if sitting back onto a chair.', 'Keep the knees over the ankles and weight in the heels.', 'Raise the arms and lengthen the back.', 'Draw the belly in slightly and breathe.'],
      ru: ['Согните колени, как будто садитесь на стул.', 'Колени над лодыжками, вес на пятках.', 'Поднимите руки и вытяните спину.', 'Слегка подтяните живот и дышите.'],
    },
    safe: { he: 'כאבי ברכיים: הפחיתו את עומק הכיפוף. פגיעה בגב תחתון: שמרו על גב ארוך.', en: 'Knee pain: reduce the depth. Lower back issues: keep the back long.', ru: 'При боли в коленях не приседайте глубоко. При проблемах с поясницей держите спину длинной.' },
    v: [
      { he: 'כיפוף רדוד, ידיים קדימה.', en: 'Shallow bend, arms forward.', ru: 'Неглубокий присед, руки вперёд.', kf: { l: [-55, -98, 0], t: 75, s: 75, h: 80, a: [0, 0] } },
      { he: 'כיפוף בינוני וידיים מעל הראש.', en: 'Medium bend, arms overhead.', ru: 'Средний присед, руки над головой.', kf: {} },
      { he: 'כיפוף עמוק יותר.', en: 'A deeper bend.', ru: 'Присед глубже.', kf: { l: [-15, -100, 0], t: 50, s: 55, h: 60, a: [70, 72] } },
    ],
  },
  {
    id: 'warrior-1', sa: 'Virabhadrasana I', en: 'Warrior I', he: 'לוחם 1', ru: 'Воин один', cat: 'standing', sec: 'stand', flow: 30, d: 2, hold: 25, sides: 'both',
    tags: ['strength', 'flex'], start: 'stand',
    kf: { t: 92, s: 92, h: 94, a: [95, 95], l: [-22, -90, 0], m: [-142, -142, 0], z: { m: [1, 1, 0.5] }, fix: { m: { x: -118 } } },
    cue: {
      he: ['צעדו רחב, הברך הקדמית מעל הקרסול.', 'הרגל האחורית ישרה ועקב לחוץ לרצפה.', 'הרימו את הידיים והארכו את הגוף.', 'אגן ישר קדימה, נשימה רגועה.'],
      en: ['Step wide with the front knee over the ankle.', 'Keep the back leg straight and the heel pressing down.', 'Raise the arms and lengthen the body.', 'Square the hips forward and breathe calmly.'],
      ru: ['Сделайте широкий шаг, передняя нога согнута, колено над лодыжкой.', 'Задняя нога прямая, пятка прижата к полу.', 'Поднимите руки и вытяните корпус.', 'Таз направьте вперёд и дышите ровно.'],
    },
    safe: { he: 'בעיות ברכיים או כתפיים: קצרו את הצעד, הורידו ידיים למותניים.', en: 'Knee or shoulder issues: shorten the stance and place hands on hips.', ru: 'При проблемах с коленями или плечами сделайте шаг короче, руки на пояс.' },
    v: [
      { he: 'צעד קצר, ידיים במותניים.', en: 'Short stance, hands on hips.', ru: 'Короткий шаг, руки на поясе.', kf: { l: [-40, -92, 0], fix: HIPS } },
      { he: 'צעד רחב, ידיים למעלה.', en: 'Wide stance, arms up.', ru: 'Широкий шаг, руки вверх.', kf: {} },
      { he: 'כיפוף עמוק יותר ופתיחת חזה לאחור.', en: 'Deeper bend with a gentle chest-opening arch.', ru: 'Глубже в выпад, грудь раскрыта назад.', kf: { t: 92, s: 105, h: 115, a: [112, 118], l: [-10, -90, 0] } },
    ],
  },
  {
    id: 'warrior-2', sa: 'Virabhadrasana II', en: 'Warrior II', he: 'לוחם 2', ru: 'Воин два', cat: 'standing', sec: 'stand', flow: 40, d: 2, hold: 25, sides: 'both',
    tags: ['strength', 'back'], start: 'stand',
    kf: { t: 90, s: 90, h: 90, a: [0, 0], b: [180, 180], ...W1 },
    cue: {
      he: ['רגליים רחבות, הברך הקדמית מכופפת מעל הקרסול.', 'פשטו ידיים לצדדים בגובה כתפיים.', 'הגוף זקוף, האגן במרכז בין הרגליים.', 'מבט מעל היד הקדמית.'],
      en: ['Feet wide apart, front knee bent over the ankle.', 'Extend the arms to the sides at shoulder height.', 'Keep the torso upright, hips centered between the legs.', 'Gaze over the front hand.'],
      ru: ['Ноги широко, передняя согнута, колено над лодыжкой.', 'Разведите руки в стороны на уровне плеч.', 'Корпус прямой, таз по центру между ногами.', 'Смотрите поверх передней руки.'],
    },
    safe: { he: 'לחץ דם גבוה או כאבי כתפיים: הורידו ידיים למותניים. אל תכופפו את הברך מעבר לקרסול.', en: 'High blood pressure or shoulder pain: put hands on hips. Do not let the knee pass the ankle.', ru: 'При высоком давлении или боли в плечах положите руки на пояс. Колено не должно выходить за лодыжку.' },
    v: [
      { he: 'צעד קצר וכיפוף עדין.', en: 'Shorter stance, gentle bend.', ru: 'Короче шаг, лёгкий сгиб колена.', kf: { l: [-45, -93, 0], a: [20, 20], b: [160, 160] } },
      { he: 'צעד רחב וידיים ישרות.', en: 'Wide stance with straight arms.', ru: 'Широкий шаг, руки прямые.', kf: {} },
      { he: 'כיפוף עמוק יותר, ירך כמעט מקבילה לרצפה.', en: 'Deeper bend, thigh almost parallel to the floor.', ru: 'Глубже, бедро почти параллельно полу.', kf: { l: [-8, -90, 0] } },
    ],
  },
  {
    id: 'high-lunge', sa: 'Ashta Chandrasana', en: 'High lunge', he: 'מצעד גבוה', ru: 'Высокий выпад', cat: 'standing', sec: 'stand', flow: 45, d: 2, hold: 25, sides: 'both',
    tags: ['strength', 'flex'], start: 'stand',
    kf: { t: 82, s: 82, h: 86, a: [80, 80], l: [-10, -90, 0], m: [-150, -150, -78], fix: { m: { x: -128 } } },
    cue: {
      he: ['צעד גדול קדימה, עקב אחורי מורם.', 'הברך הקדמית מעל הקרסול.', 'הרגל האחורית פעילה וישרה.', 'הרימו את הידיים והארכו את הגוף.'],
      en: ['Step far forward with the back heel lifted.', 'Front knee stays over the ankle.', 'Keep the back leg active and straight.', 'Raise the arms and lengthen the body.'],
      ru: ['Сделайте большой шаг вперёд, задняя пятка приподнята.', 'Переднее колено над лодыжкой.', 'Задняя нога прямая и сильная.', 'Поднимите руки и вытяните корпус.'],
    },
    safe: { he: 'בעיות ברכיים או איזון: החזיקו כיסא או קיר, או הורידו את הברך האחורית.', en: 'Knee or balance issues: hold a chair or wall, or lower the back knee.', ru: 'При проблемах с коленями или равновесием держитесь за стул или стену либо опустите заднее колено.' },
    v: [
      { he: 'צעד קצר וידיים במותניים.', en: 'Short stance, hands on hips.', ru: 'Короткий шаг, руки на поясе.', kf: { t: 88, s: 88, l: [-35, -92, 0], fix: HIPS } },
      { he: 'ידיים למעלה, רגל אחורית ישרה.', en: 'Arms up, back leg straight.', ru: 'Руки вверх, задняя нога прямая.', kf: {} },
      { he: 'כיפוף עמוק וקשת קלה לאחור.', en: 'Deeper bend with a slight backbend.', ru: 'Глубже, лёгкий прогиб назад.', kf: { t: 95, s: 108, h: 118, a: [112, 118], l: [-12, -90, 0] } },
    ],
  },
  {
    id: 'tree', sa: 'Vrksasana', en: 'Tree', he: 'עץ', ru: 'Дерево', cat: 'balance', sec: 'bal', flow: 10, d: 2, hold: 25, sides: 'both',
    tags: ['strength', 'relax'], start: 'stand',
    kf: { t: 90, s: 90, h: 90, a: [-55, 70], l: ST, m: [-35, -140, -90] },
    cue: {
      he: ['העבירו את המשקל לרגל אחת ולחצו אותה לרצפה.', 'הניחו את כף הרגל השנייה על השוק או הירך, לא על הברך.', 'קבעו נקודת מבט מולכם.', 'חברו כפות ידיים בחזה ונשמו.'],
      en: ['Shift your weight onto one leg and press it into the floor.', 'Place the other foot on the calf or thigh, never on the knee.', 'Fix your gaze on a point in front of you.', 'Bring palms together at the chest and breathe.'],
      ru: ['Перенесите вес на одну ногу и прижмите её к полу.', 'Другую стопу поставьте на голень или бедро, но не на колено.', 'Смотрите в одну точку перед собой.', 'Соедините ладони у груди и дышите.'],
    },
    safe: { he: 'בעיות שיווי משקל: עמדו ליד קיר. לא להניח את הכף על הברך.', en: 'Balance issues: stand beside a wall. Never press the foot against the knee.', ru: 'Если трудно держать равновесие, встаньте у стены. Не упирайте стопу в колено.' },
    v: [
      { he: 'קצה כף הרגל נוגע ברצפה ליד הקרסול.', en: 'Toes rest on the floor beside the ankle.', ru: 'Носок касается пола рядом с лодыжкой.', kf: { m: [-62, -110, -15] } },
      { he: 'כף הרגל על השוק, ידיים בחזה.', en: 'Foot on the calf, hands at the chest.', ru: 'Стопа на голени, руки у груди.', kf: {} },
      { he: 'כף הרגל על הירך וידיים בצורת V למעלה.', en: 'Foot on the thigh, arms in a V overhead.', ru: 'Стопа на бедре, руки вверх буквой V.', kf: { m: [-25, -155, -100], a: [70, 75], b: [110, 105] } },
    ],
  },
  {
    id: 'warrior-3', sa: 'Virabhadrasana III', en: 'Warrior III', he: 'לוחם 3', ru: 'Воин три', cat: 'balance', sec: 'bal', flow: 20, d: 2, hold: 20, sides: 'both',
    tags: ['strength', 'noback'], start: 'stand',
    kf: { t: 0, s: 0, h: 5, a: [0, 0], l: ST, m: [180, 180, -95] },
    cue: {
      he: ['הישענו קדימה והרימו רגל אחת לאחור.', 'צרו קו ישר מהראש ועד העקב.', 'ברך הרגל התומכת רכה.', 'הושיטו ידיים קדימה והביטו לרצפה.'],
      en: ['Lean forward and lift one leg behind you.', 'Make one long line from head to heel.', 'Keep the standing knee soft.', 'Reach the arms forward and gaze at the floor.'],
      ru: ['Наклонитесь вперёд и поднимите одну ногу назад.', 'Вытяните тело в одну линию от макушки до пятки.', 'Опорное колено оставьте мягким.', 'Руки вытяните вперёд, смотрите в пол.'],
    },
    safe: { he: 'בעיות איזון או גב תחתון: הניחו ידיים על קיר או מותניים.', en: 'Balance or lower back issues: rest hands on a wall or hips.', ru: 'При проблемах с равновесием или поясницей обопритесь руками о стену или положите их на пояс.' },
    v: [
      { he: 'ידיים במותניים, רגל נמוכה.', en: 'Hands on hips, leg lower.', ru: 'Руки на поясе, нога ниже.', kf: { t: 30, s: 30, h: 35, m: [205, 205, -95], fix: HIPS } },
      { he: 'גוף במקביל לרצפה.', en: 'Body parallel to the floor.', ru: 'Тело параллельно полу.', kf: {} },
      { he: 'רגל מורמת גבוה וידיים קדימה.', en: 'Leg lifted higher with arms forward.', ru: 'Нога выше, руки вперёд.', kf: { t: -6, s: -6, h: -4, m: [172, 172, -95] } },
    ],
  },
  {
    id: 'dancer', sa: 'Natarajasana', en: 'Dancer', he: 'רקדן', ru: 'Танцор', cat: 'balance', sec: 'bal', flow: 30, d: 3, hold: 20, sides: 'both',
    tags: ['flex', 'noback'], start: 'stand',
    kf: { t: 75, s: 75, h: 80, a: [20, 20], b: [20, 25], l: ST, m: [165, 85, 170], fix: { a: { to: 'm', pt: 'ankle', bend: 1 } } },
    cue: {
      he: ['עמדו על רגל אחת ואחזו בקרסול הנגדי מאחור.', 'דחפו את כף הרגל אל היד, והחזה נפתח.', 'הושיטו יד קדימה לשיווי משקל.', 'מבט קבוע לנקודה אחת.'],
      en: ['Stand on one leg and hold the opposite ankle behind you.', 'Press the foot into the hand as the chest opens.', 'Reach the other arm forward for balance.', 'Keep a steady gaze on one point.'],
      ru: ['Встаньте на одну ногу и возьмите другую за лодыжку сзади.', 'Прижимайте стопу к руке, грудь раскрывается.', 'Вторую руку вытяните вперёд для равновесия.', 'Смотрите в одну точку.'],
    },
    safe: { he: 'עמדו ליד קיר. בעיות ברכיים, גב תחתון או איזון: בצעו רק את מתיחת הירך.', en: 'Stand beside a wall. With knee, lower-back or balance issues, do only the thigh stretch.', ru: 'Встаньте рядом со стеной. При проблемах с коленями, поясницей или равновесием делайте только растяжку бедра.' },
    v: [
      { he: 'מתיחת ירך בעמידה, גוף זקוף.', en: 'Standing thigh stretch, torso upright.', ru: 'Растяжка бедра стоя, корпус прямой.', kf: { t: 90, s: 90, h: 90, a: [-116, -116], b: [90, 90], m: [-100, 120, 160], fix: { a: { to: 'm', pt: 'ankle', bend: -1 } } } },
      { he: 'הרמת הרגל לאחור והישענות קלה קדימה.', en: 'Lift the leg back and lean slightly forward.', ru: 'Поднимите ногу назад и слегка наклонитесь.', kf: {} },
      { he: 'הישענות עמוקה קדימה ורגל גבוהה.', en: 'Deeper forward lean with the leg higher.', ru: 'Глубже вперёд, нога выше.', kf: { t: 55, s: 55, h: 60, m: [160, 85, 170], a: [20, 20], b: [15, 15] } },
    ],
  },
  {
    id: 'uttanasana', sa: 'Uttanasana', en: 'Standing forward fold', he: 'קיפול קדימה בעמידה', ru: 'Наклон вперёд стоя', cat: 'forward fold', sec: 'stand', flow: 70, d: 1, hold: 30, sides: 'single',
    tags: ['flex', 'relax', 'noback'], start: 'stand',
    kf: { t: -65, s: -100, h: -100, a: [-90, -90], l: ST, fix: { a: { x: 25, bend: -1 }, b: { x: 25, bend: -1 } } },
    cue: {
      he: ['כופפו מהירכיים, לא מהגב.', 'הניחו לראש ולצוואר להיות כבדים.', 'כופפו ברכיים כמה שצריך.', 'הרימו לאט כשאתם מסיימים.'],
      en: ['Fold from the hips, not from the back.', 'Let the head and neck hang heavy.', 'Bend the knees as much as you need.', 'Rise slowly when you finish.'],
      ru: ['Наклоняйтесь от бёдер, а не от спины.', 'Пусть голова и шея свободно свисают.', 'Согните колени настолько, насколько нужно.', 'В конце поднимайтесь медленно.'],
    },
    safe: { he: 'בעיות גב או דיסק, לחץ דם גבוה, גלאוקומה: כופפו ברכיים או הימנעו.', en: 'Back or disc problems, high blood pressure, glaucoma: bend the knees or skip.', ru: 'При проблемах со спиной, высоком давлении или глаукоме сгибайте колени либо пропустите позу.' },
    v: [
      { he: 'ברכיים כפופות וידיים על השוקיים.', en: 'Bent knees, hands on shins.', ru: 'Колени согнуты, руки на голенях.', kf: { l: [-70, -105, 0], t: -50, s: -70, h: -80, fix: { a: { to: 'l', pt: 'ankle', bend: -1 }, b: { to: 'l', pt: 'ankle', bend: -1 } } } },
      { he: 'רגליים ישרות, ידיים לרצפה.', en: 'Legs straight, hands toward the floor.', ru: 'Ноги прямые, руки к полу.', kf: {} },
      { he: 'אחיזה בבהונות והצמדת החזה לירכיים.', en: 'Hold the big toes and draw the chest to the thighs.', ru: 'Возьмитесь за большие пальцы ног, грудь к бёдрам.', kf: { t: -75, s: -110, h: -110, fix: { a: { to: 'l', pt: 'toe', bend: -1 }, b: { to: 'l', pt: 'toe', bend: -1 } } } },
    ],
  },
  {
    id: 'half-lift', sa: 'Ardha Uttanasana', en: 'Half lift', he: 'חצי הרמה', ru: 'Полунаклон', cat: 'forward fold', sec: 'stand', flow: 60, d: 1, hold: 20, sides: 'single',
    tags: ['flex', 'back'], start: 'stand',
    kf: { t: 0, s: 0, h: -10, a: [-90, -90], l: ST, fix: { a: { to: 'l', pt: 'knee', bend: -1 }, b: { to: 'l', pt: 'knee', bend: -1 } } },
    cue: {
      he: ['כופפו קדימה מהירכיים עד גב שטוח.', 'ידיים על השוקיים או הירכיים.', 'הצוואר ארוך, מבט כלפי הרצפה.', 'הרגישו את הגב מתארך עם השאיפה.'],
      en: ['Hinge forward from the hips until the back is flat.', 'Rest hands on shins or thighs.', 'Keep the neck long, gaze toward the floor.', 'Feel the spine lengthen as you inhale.'],
      ru: ['Наклонитесь от бёдер, пока спина не станет ровной.', 'Руки на голенях или бёдрах.', 'Шея длинная, взгляд к полу.', 'На вдохе чувствуйте, как вытягивается спина.'],
    },
    safe: { he: 'אל תעגלו את הגב. בכאב גב כופפו ברכיים והניחו ידיים על הירכיים.', en: 'Do not round the back. With back pain, bend the knees and rest hands on thighs.', ru: 'Не округляйте спину. При боли в спине согните колени и положите руки на бёдра.' },
    v: [
      { he: 'ברכיים כפופות, ידיים על הירכיים.', en: 'Bent knees, hands on thighs.', ru: 'Колени согнуты, руки на бёдрах.', kf: { l: [-70, -110, 0] } },
      { he: 'גב שטוח, ידיים על השוקיים.', en: 'Flat back, hands on shins.', ru: 'Спина ровная, руки на голенях.', kf: {} },
      { he: 'קצות האצבעות על הרצפה.', en: 'Fingertips on the floor.', ru: 'Кончики пальцев на полу.', kf: { t: -30, s: -15, fix: { a: { to: null, x: 0, bend: -1 }, b: { to: null, x: 0, bend: -1 } } } },
    ],
  },
  {
    id: 'revolved-chair', sa: 'Parivrtta Utkatasana', en: 'Revolved chair', he: 'כיסא מסתובב', ru: 'Стул со скручиванием', cat: 'twist', sec: 'stand', flow: 55, d: 2, hold: 20, sides: 'both',
    tags: ['strength', 'noback'], start: 'stand',
    kf: { t: 52, s: 64, h: 82, nz: 0.1, tw: 1.5, a: [-62, 38], b: [-50, 50], z: { a: [0.85, 1], b: [0.95, 1] }, l: [-28, -95, 0] },
    cue: {
      he: ['מכסא כופפים ברכיים ומסובבים את החזה הצידה.', 'יד אחת אל הרצפה, השנייה כלפי התקרה.', 'הסיבוב בא מהחזה, לא מהצוואר.', 'נשמו ופתחו את הכתפיים.'],
      en: ['From chair pose, twist the chest to one side.', 'One hand toward the floor, the other toward the ceiling.', 'The turn comes from the chest, not the neck.', 'Breathe and open the shoulders.'],
      ru: ['Из позы стула разверните грудную клетку в сторону.', 'Одна рука к полу, другая к потолку.', 'Поворот идёт от груди, а не от шеи.', 'Дышите и раскрывайте плечи.'],
    },
    safe: { he: 'בעיות גב או ברכיים: סיבוב קל עם כפות ידיים בחזה. בהריון הימנעו מסיבוב עמוק.', en: 'Back or knee issues: use a gentle twist with palms at the chest. Pregnancy: avoid deep twists.', ru: 'При проблемах со спиной или коленями скручивайтесь мягко, ладони у груди. При беременности избегайте глубоких скручиваний.' },
    v: [
      { he: 'כיסא רדוד וכפות ידיים בחזה.', en: 'Shallow chair, palms together.', ru: 'Неглубокий стул, ладони вместе.', kf: { l: [-52, -98, 0], t: 72, s: 80, h: 88, tw: 1.25, nz: 0.45, a: [-60, 62], b: [-50, 62], z: { a: [0.85, 1], b: [0.95, 1] } } },
      { he: 'כפות ידיים יחד, המרפק מחוץ לירך.', en: 'Palms together, elbow hooked outside the thigh.', ru: 'Ладони вместе, локоть снаружи бедра.', kf: {} },
      { he: 'כיסא עמוק וסיבוב רחב.', en: 'Deeper chair and wider twist.', ru: 'Стул глубже, скручивание шире.', kf: { l: [-12, -100, 0], t: 38, s: 50, h: 70, nz: 0, tw: 1.7, a: [-55, 28], b: [-45, 40], z: { a: [0.85, 1], b: [0.95, 1] } } },
    ],
  },
];
