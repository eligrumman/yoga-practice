// Player tests: Hebrew "common mistake" (fix) cues, narration budget ordering, background music (pure logic, fake audio), transcript assembly.
import { POSES } from '../data/poses.js';
import { POSE_V2, SEGMENTS_V2 } from '../data/narration-he-v2.js';
import { segText } from '../data/narration.js';
import * as NP from '../js/narration-plan.js';
import { transcriptFor } from '../js/transcript.js';
import { Music, MOODS, MOOD_DEFS, DUCK_LEVEL, normMood, normVol, volToGain, MAX_GAIN } from '../js/music.js';

export let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

// ---- D. fix cues: every pose has fix.1 (fix.2 optional), spoken-style Hebrew without Latin letters or digits
for (const p of POSES) {
  const f = POSE_V2[p.id]?.fix;
  ok(Array.isArray(f) && f.length >= 1 && f.length <= 2, `fix: ${p.id} has 1-2 lines`);
  for (let i = 0; i < (f || []).length; i++) {
    const id = `pose.${p.id}.fix.${i + 1}`, t = segText(id, 'he');
    ok(t === f[i] && t.length > 8, `fix: ${id} is a segment with text`);
    ok(!/[A-Za-z0-9]/.test(t), `fix: ${id} has no Latin letters or digits`);
    ok(/[֐-׿]/.test(t), `fix: ${id} is Hebrew`);
  }
}
ok(SEGMENTS_V2.filter((s) => /\.fix\.\d$/.test(s.id)).length === POSES.reduce((n, p) => n + (POSE_V2[p.id].fix || []).length, 0), 'fix: every fix line is a v2 segment');
ok(NP.poseV2Ids('tree').includes('pose.tree.fix.1'), 'fix: poseV2Ids includes fix ids');

// ---- budget ordering with fix lines (tree: two-sided)
const dur = (id) => NP.estDur(segText(id, 'he'));
const base = { lang: 'he', poseId: 'tree', side: 0, sides: 2, hold: 120, lvl: 0, dur, announced: false, lastSavasana: false, minutes: 20 };
const plan = (o) => NP.slotPlan({ ...base, ...o });
const full = plan({ level: 'full' });
const ix = (id) => full.ids.indexOf(`pose.tree.${id}`);
const lastEntry = Math.max(...full.ids.map((x, i) => (/\.entry\.\d$/.test(x) ? i : -1)));
ok(ix('fix.1') > lastEntry && ix('fix.1') > ix('mod.L0'), 'budget: fix.1 plays after entry and mod');
ok(ix('fix.1') < ix('align.1'), 'budget: fix.1 plays before the extra align lines');
ok(!plan({ level: 'short' }).ids.some((x) => x.includes('.fix.')), 'budget: short mode plays no fix lines');
ok(!plan({ level: 'name' }).ids.some((x) => x.includes('.fix.')), 'budget: name mode plays no fix lines');
ok(!plan({ level: 'full', side: 1, announced: true }).ids.some((x) => x.includes('.fix.')), 'budget: side two does not repeat fix lines');
// tighten the hold step by step: aligns drop before fix lines, fix before intro/entry.1/mod
let sawFixKeptAlignDropped = false, mandatory = true, spokeOk = true;
for (let hold = 120; hold >= 8; hold -= 2) {
  const r = plan({ level: 'full', hold });
  const has = (s) => r.ids.includes(`pose.tree.${s}`);
  if (has('fix.1') && !has('align.1')) sawFixKeptAlignDropped = true;
  if (has('align.1') && !has('fix.1')) mandatory = false;               // align must never outlive fix.1
  if (r.speech > NP.BUDGET * hold + 0.001 && r.ids.length > 3) spokeOk = false;   // beyond the mandatory 3 the budget holds
}
ok(sawFixKeptAlignDropped, 'budget: some hold keeps the fix line while the align lines are already dropped');
ok(mandatory, 'budget: an align line is never kept without the fix line');
ok(spokeOk, 'budget: speech stays within 65% of the hold');
{ // all poses at a roomy hold: fix.1 present in full mode
  let all = true;
  for (const p of POSES) {
    if (p.id === 'savasana') continue;
    const r = NP.slotPlan({ ...base, poseId: p.id, sides: p.sides === 'both' ? 2 : 1, hold: 150, level: 'full' });
    if (!r.ids.includes(`pose.${p.id}.fix.1`)) { all = false; console.log('  no fix.1 in plan for', p.id); }
  }
  ok(all, 'budget: full mode with a long hold plays fix.1 for every pose');
}

// ---- transcript assembly per level
{
  const tree = POSES.find((p) => p.id === 'tree');
  for (const lvl of [0, 1, 2]) {
    const t = transcriptFor({ lang: 'he', pose: tree, lvl, side: 0, sides: 2 });
    const kinds = t.lines.map((l) => l.kind);
    ok(t.lines.filter((l) => l.kind === 'mod').length === 1 && t.lines.find((l) => l.kind === 'mod').id === `pose.tree.mod.L${lvl}`, `transcript L${lvl}: exactly the mod line for this level`);
    ok(kinds.join() === [...kinds].sort((a, b) => ['side', 'entry', 'mod', 'fix', 'align', 'breath', 'exit'].indexOf(a) - ['side', 'entry', 'mod', 'fix', 'align', 'breath', 'exit'].indexOf(b)).join(), `transcript L${lvl}: reading order entry, mod, fix, align, breath, exit`);
    ok(kinds.includes('fix') && kinds.includes('entry') && kinds.includes('exit') && kinds.includes('breath'), `transcript L${lvl}: has entry, fix, breath, exit`);
    ok(t.lines.every((l) => l.text === segText(l.id, 'he')), `transcript L${lvl}: texts come from the v2 segments`);
    ok(!kinds.includes('side'), `transcript L${lvl}: no side line on the first side`);
  }
  ok(transcriptFor({ lang: 'he', pose: tree, lvl: 0, side: 1, sides: 2 }).lines[0].kind === 'side', 'transcript: side line first on the second side');
  ok(transcriptFor({ lang: 'he', pose: tree, lvl: 0 }).lines.every((l) => !l.id.includes('mod.L1') && !l.id.includes('mod.L2')), 'transcript: other levels mod lines are not shown');
  for (const lang of ['ru', 'en']) {
    const t = transcriptFor({ lang, pose: tree, lvl: 1 });
    ok(t.lines.length >= 2 && t.lines.every((l) => l.kind === 'cue' && l.text), `transcript ${lang}: existing cues`);
    ok(t.lines.every((l) => !l.id.includes('.fix.')), `transcript ${lang}: no he-only fix lines`);
  }
  let allPoses = true;
  for (const p of POSES) for (const lang of ['he', 'ru', 'en']) { const t = transcriptFor({ lang, pose: p, lvl: 0 }); if (!t.lines.length) { allPoses = false; console.log('  empty transcript', p.id, lang); } }
  ok(allPoses, 'transcript: every pose has lines in he/ru/en');
}

// ---- music: pure logic with a fake audio context (no real audio)
function fakeCtx() {
  const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; }, setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
  const node = () => ({ gain: param(), frequency: param(), Q: param(), detune: param(), connect() {}, disconnect() {}, start() {}, stop() {}, type: '', buffer: null, loop: false });
  const c = { currentTime: 0, sampleRate: 8000, destination: node(), state: 'running', made: 0,
    createGain() { c.made++; return node(); }, createOscillator() { c.made++; return node(); }, createBiquadFilter() { c.made++; return node(); },
    createConvolver() { c.made++; return node(); }, createBufferSource() { c.made++; return node(); },
    createBuffer(ch, len) { const d = new Float32Array(len); return { getChannelData: () => d }; }, resume() {}, suspend() {} };
  return c;
}
{
  ok(MOODS.length >= 3 && MOODS.every((m) => MOOD_DEFS[m]), 'music: at least 3 moods defined');
  ok(normMood('zzz') === 'soft' && normMood('none') === 'none' && normMood('deep') === 'deep', 'music: normMood');
  ok(normVol(5) === 1 && normVol(-1) === 0 && normVol('x') === 0.5, 'music: normVol clamps');
  ok(volToGain(0) === 0 && Math.abs(volToGain(1) - MAX_GAIN) < 1e-9 && volToGain(0.3) < volToGain(0.6), 'music: volume taper is monotonic and capped');

  // no gesture: nothing is created
  let made = 0, gesture = false;
  const m = new Music({ ctxFactory: () => { made++; return fakeCtx(); }, hasGesture: () => gesture });
  ok(['start', 'stop', 'duck', 'setVolume', 'setMood', 'setPaused'].every((f) => typeof m[f] === 'function'), 'music: exposes start/stop/duck/setVolume/setMood/setPaused');
  ok(m.start('soft', 0.5) === 'pending' && made === 0 && !m.running && m.gains() === null, 'music: without a gesture start() is pending and creates no audio context');
  m.duck(true); ok(made === 0, 'music: duck before start creates nothing');
  m.duck(false);
  m.stop(); ok(made === 0 && !m.running, 'music: stop while pending is harmless');
  ok(m.start('none') === 'none' && made === 0, 'music: mood none starts nothing');
  // after a gesture it boots
  gesture = true;
  ok(m.start('soft', 0.5) === 'started' && made === 1 && m.running, 'music: with a gesture start() builds the audio graph');
  const g0 = m.gains();
  ok(g0 && Math.abs(g0.master - volToGain(0.5)) < 1e-3 && g0.duck === 1, 'music: master gain follows the volume, no ducking at first');
  m.duck(true); ok(Math.abs(m.gains().duck - DUCK_LEVEL) < 1e-6, 'music: duck(true) lowers the duck gain');
  m.duck(false); ok(m.gains().duck === 1, 'music: duck(false) restores it');
  ok(m.log.some((e) => e.ev === 'duck') && m.log.some((e) => e.ev === 'unduck'), 'music: duck events are logged');
  m.setVolume(0.9); ok(Math.abs(m.gains().master - volToGain(0.9)) < 1e-3, 'music: setVolume');
  ok(m.setMood('deep') === 'started' && m.mood === 'deep' && m.running, 'music: switching mood keeps it running');
  m.stop(); ok(!m.running && m.wanted === false, 'music: stop() ends it');
  m.flushTeardown();
  // pending -> gesture() starts it
  let g2 = false, made2 = 0;
  const m2 = new Music({ ctxFactory: () => { made2++; return fakeCtx(); }, hasGesture: () => g2 });
  m2.start('nature', 0.4); ok(made2 === 0, 'music: pending again');
  g2 = true; m2.gesture(); ok(made2 === 1 && m2.running, 'music: gesture() lets a pending start go ahead');
  m2.stop(); m2.flushTeardown();
  // no WebAudio at all: does not throw
  const m3 = new Music({ ctxFactory: () => null, hasGesture: () => true });
  ok(m3.start('soft') === 'pending' && !m3.running, 'music: no WebAudio support degrades silently');
}

console.log(`player tests: ${pass} passed, ${fail} failed`);
