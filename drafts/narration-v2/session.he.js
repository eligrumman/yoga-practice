// DRAFT narration v2, session-level segments (Hebrew only). pauseAfter = intended silence (s) after the clip in the player.
export const INTRO = {
  arrive:   { id: 'session.intro.arrive',   he: 'ברוכים הבאים. מצאו תנוחה נוחה והניחו לגוף להתיישב.', pauseAfter: 2 },
  breath:   { id: 'session.intro.breath',   he: 'שאפו עמוק דרך האף, ונשפו לאט.', pauseAfter: 3 },
  breath2:  { id: 'session.intro.breath2',  he: 'עוד נשימה אחת, ובנשיפה הניחו לכתפיים לרדת.', pauseAfter: 3 },
  safety:   { id: 'session.intro.safety',   he: 'התרגול הזה אינו ייעוץ רפואי. זוזו רק בתוך מה שנוח לכם, ואם מופיע כאב, הקלו או עצרו.', pauseAfter: 2 },
  props:    { id: 'session.intro.props',    he: 'אם יש לכם בלוק, רצועה, כרית או שמיכה, הניחו אותם קרוב. אפשר גם בלעדיהם.', pauseAfter: 3 },
  intention:{ id: 'session.intro.intention',he: 'אם תרצו, בחרו כוונה פשוטה לתרגול, מילה אחת או תחושה אחת.', pauseAfter: 2 },
  intention2:{id: 'session.intro.intention2',he: 'אולי רוגע, אולי יציבות. אין תשובה נכונה.', pauseAfter: 8 },
  start:    { id: 'session.intro.start',    he: 'בואו נתחיל.', pauseAfter: 1 },
};
export const CLOSE = {
  enter:  { id: 'session.close.enter',  he: 'עכשיו זה זמן מנוחה. אין מה לעשות ואין לאן ללכת.', pauseAfter: 6 },
  scan1:  { id: 'session.close.scan.1', he: 'הרגישו את כפות הרגליים והרגליים, והניחו להן להיות כבדות.', pauseAfter: 8 },
  scan2:  { id: 'session.close.scan.2', he: 'הרגישו את הגב, הבטן והחזה, ותנו להם להתרכך עם הנשימה.', pauseAfter: 8 },
  scan3:  { id: 'session.close.scan.3', he: 'הרפו את הידיים, הכתפיים והפנים.', pauseAfter: 10 },
  scanlite:{id: 'session.close.scan.lite', he: 'הרגישו את כל הגוף נח על הרצפה, וההרפיה מתפשטת.', pauseAfter: 10 },
  out1:   { id: 'session.close.out.1',  he: 'העמיקו לאט את הנשימה. הניעו את האצבעות בידיים וברגליים.', pauseAfter: 4 },
  out2:   { id: 'session.close.out.2',  he: 'כשתהיו מוכנים, התגלגלו על הצד ועלו לאט לישיבה.', pauseAfter: 4 },
  line:   { id: 'session.close.line',   he: 'תודה שתרגלתם. קחו איתכם את השקט הזה להמשך היום.', pauseAfter: 1 },
};
// variants = composition by segment key (order = play order). Silence is left in savasana between enter/scan and out.
export const INTRO_VARIANTS = {
  short:  { forMinutes: 10, keys: ['arrive', 'breath', 'safety', 'start'] },
  medium: { forMinutes: 20, keys: ['arrive', 'breath', 'safety', 'props', 'intention', 'start'] },
  long:   { forMinutes: 30, keys: ['arrive', 'breath', 'breath2', 'safety', 'props', 'intention', 'intention2', 'start'] },
};
export const CLOSE_VARIANTS = {
  short:  { forMinutes: 10, keys: ['enter', 'out1', 'out2', 'line'] },
  medium: { forMinutes: 20, keys: ['enter', 'scan1', 'scan2', 'out1', 'out2', 'line'] },
  long:   { forMinutes: 30, keys: ['enter', 'scan1', 'scan2', 'scan3', 'scanlite', 'out1', 'out2', 'line'] },
};
