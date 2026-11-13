# יוגה בבית · Home Yoga Flow · Йога дома

**Live / אתר חי / Сайт:** https://eligrumman.github.io/yoga-practice/

---

## עברית
אפליקציית יוגה לבית, חינמית ופתוחה. בלי חשבונות, בלי מעקב; הכל נשמר רק בדפדפן שלכם.

- **ספריית תנוחות:** 36 תנוחות עם שמות בעברית, רוסית, אנגלית וסנסקריט; חיפוש וסינון לפי קטגוריה ורמת קושי.
- **סימולציה:** דמות מונפשת לכל תנוחה בשלוש רמות (מתחילים / בינוני / מתקדם), עם עזרים (בלוק, רצועה, כרית, קיר), הנחיות, הערת בטיחות ואפשרות קלה יותר.
- **תכניות מוכנות:** 8 תכניות ומסלול פתיחה של 7 ימים. אפשר להתחיל בלחיצה אחת או להעתיק ל"התכניות שלי".
- **בונה תכניות:** הוספה, הסרה, שכפול, גרירה לשינוי סדר (גם במגע), זמן בשניות או בנשימות, רמה לכל תנוחה, שמירה אוטומטית, ייצוא וייבוא JSON.
- **"צור לי תכנית לפעם ראשונה":** מחולל דטרמיניסטי (10/20/30 דקות, מיקוד, רמה, תנוחות להימנע מהן).
- **נגן מודרך:** ספירה לאחור, דמות מונפשת, הצצה לתנוחה הבאה, החלפת צד, +10 שניות, התחלה מחדש, צליל מעבר, הסבר קולי בעברית / רוסית / אנגלית (שפה נפרדת משפת הממשק), נעילת מסך.
- **היסטוריה:** תרגולים ורצף ימים, במכשיר בלבד.

**הסבר קולי:** הקבצים המוקלטים (`audio/<שפה>/<מזהה>.mp3`) משמשים כשהם קיימים; אחרת הדפדפן מקריא בעזרת Web Speech API; ואם אין קול, מוצגות כתוביות.

> אין כאן ייעוץ רפואי. בהריון, בפציעה או במצב רפואי, התייעצו עם איש מקצוע. עצרו אם מופיע כאב.

## Русский
Бесплатное приложение для практики йоги дома. Без аккаунтов и слежки, всё хранится только в Вашем браузере.

- 36 поз с названиями на иврите, русском, английском и санскрите; поиск и фильтры.
- Анимированная фигура для каждой позы на трёх уровнях, опоры, подсказки, заметка о безопасности и облегчённый вариант.
- 8 готовых программ и 7-дневный стартовый путь; запуск одним касанием или копирование в «Мои планы».
- Конструктор планов (перетаскивание, в том числе пальцем; секунды или вдохи; импорт и экспорт JSON).
- Кнопка «Создать мою первую программу»: детерминированный генератор на 10 / 20 / 30 минут.
- Плеер с таймером, превью следующей позы, голосовыми подсказками на иврите / русском / английском.

> Материалы не являются медицинским советом. При беременности, травмах и заболеваниях проконсультируйтесь со специалистом. При боли прекратите.

## English
A free, open home-yoga app. No accounts, no tracking; everything stays in your browser.

- 36 poses with Hebrew, Russian, English and Sanskrit names; search and filters.
- An animated jointed figure for every pose at three levels, with props, cues, a safety note and an easier option.
- 8 ready-made plans and a 7-day starter path: play in one tap or copy to "My plans".
- Plan builder: add / remove / duplicate, drag to reorder (touch works), seconds or breaths, per-pose level, autosave, JSON export and import.
- "Create my first-time plan": deterministic generator (10 / 20 / 30 min, focus, level, poses to avoid).
- Guided player: countdown, looping figure, next-pose preview, side switching, +10 s, restart pose, beep, voice guidance in Hebrew / Russian / English (separate from the UI language), wake-lock.

Voice: pre-generated `audio/<lang>/<id>.mp3` when present (listed in `audio/manifest.json`), otherwise the browser's speech synthesis, otherwise captions only.

> Not medical advice. If you are pregnant, injured or have a medical condition, consult a professional. Stop if you feel pain.

## Development
No build step. Serve the folder with any static server, e.g. `python3 -m http.server`, and open it.

```
node tests/run.mjs                    # tests
node tools/export-narration.mjs       # writes narration-script.json (single source: data/narration.js)
```

Layout: `index.html`, `css/`, `js/` (figure engine, plan helpers, generator, narrator, player, app), `data/` (poses, presets, narration), `tools/tts/` (optional voice generation), `audio/`.

Plan files: `{ "app": "home-yoga-flow", "version": 1, "plan": { "name": "...", "items": [{ "pose": "tree", "level": 1, "unit": "sec", "amount": 30 }] } }`.

License: MIT. See CREDITS.md.
