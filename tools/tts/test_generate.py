#!/usr/bin/env python3
"""Offline tests for generate.py (no API, no ffmpeg): language filter, unused-segment skip, batching, silence split. Run: python3 tools/tts/test_generate.py"""
import array, math, random, sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate as G

RATE = 24000

def tone(sec, amp=8000):
    n = int(RATE * sec)
    return array.array('h', [int(amp * math.sin(i * 0.3) * (0.6 + 0.4 * math.sin(i * 0.002))) for i in range(n)])

def quiet(sec):
    r = random.Random(1)
    return array.array('h', [r.randint(-20, 20) for _ in range(int(RATE * sec))])

def make(parts):
    out = array.array('h')
    for kind, sec in parts: out.extend(tone(sec) if kind == 's' else quiet(sec))
    return out.tobytes()

class Filter(unittest.TestCase):
    segs = [
        {'id': 'pose.a.intro', 'lang': 'he', 'text': 'תנוחת א.'},
        {'id': 'pose.a.cue.1', 'lang': 'he', 'text': 'רמז ישן'},
        {'id': 'pose.a.entry.1', 'lang': 'he', 'text': 'בואו', 'v2': True},
        {'id': 'pose.a.intro', 'lang': 'ru', 'text': 'Поза'},
        {'id': 'pose.a.cue.1', 'lang': 'ru', 'text': 'Спина'},
        {'id': 'pose.a.cue.1', 'lang': 'en', 'text': 'Back'},
        {'id': 'common.x', 'lang': 'he', 'text': '  '},
    ]
    def test_default_is_hebrew_only(self):
        self.assertEqual(G.DEFAULT_LANGS, 'he')
        got = G.select_segments(self.segs, G.DEFAULT_LANGS.split(','))
        self.assertEqual([s['id'] for s in got], ['pose.a.intro', 'pose.a.entry.1'])
        self.assertTrue(all(s['lang'] == 'he' for s in got))
    def test_legacy_he_cues_skipped_unless_asked(self):
        self.assertTrue(G.is_unused(self.segs[1]))
        self.assertFalse(G.is_unused(self.segs[0]))   # pose intro/name ARE played in Hebrew
        self.assertFalse(G.is_unused(self.segs[4]))   # ru/en are not judged here: the language filter handles them
        self.assertEqual(len(G.select_segments(self.segs, ['he'], include_unused=True)), 3)
    def test_ru_en_come_back_with_flag(self):
        got = G.select_segments(self.segs, ['he', 'ru', 'en'])
        self.assertEqual({s['lang'] for s in got}, {'he', 'ru', 'en'})

class Batching(unittest.TestCase):
    def test_groups_by_count_letters_and_lang(self):
        todo = [{'id': str(i), 'lang': 'he', 'text': 'א' * 30} for i in range(10)] + [{'id': 'r', 'lang': 'ru', 'text': 'ф' * 5}]
        g = G.make_batches(todo, 4, 260)
        self.assertEqual([len(x) for x in g], [4, 4, 2, 1])
        self.assertEqual([s['id'] for x in g for s in x], [s['id'] for s in todo])   # order kept
        g = G.make_batches(todo, 4, 70)
        self.assertEqual([len(x) for x in g][:3], [2, 2, 2])
    def test_single_batch_mode(self):
        self.assertEqual(len(G.make_batches([{'id': 'a', 'lang': 'he', 'text': 'א'}], 1)), 1)

class Split(unittest.TestCase):
    def test_clean_three_lines(self):
        raw = make([('s', 2.0), ('q', 3.0), ('s', 3.0), ('q', 3.0), ('s', 1.5)])
        b, info = G.split_speech(raw, RATE, 3)
        self.assertIsNotNone(b, info)
        self.assertEqual(len(b), 3)
        d = [(e - s) / RATE for s, e in b]
        for got, want in zip(d, [2.0, 3.0, 1.5]): self.assertAlmostEqual(got, want + 2 * G.PAD, delta=0.08)
    def test_pause_inside_line_is_not_a_cut(self):
        raw = make([('s', 2.0), ('q', 0.5), ('s', 2.0), ('q', 3.0), ('s', 2.5)])
        b, info = G.split_speech(raw, RATE, 2)
        self.assertIsNotNone(b, info)
        self.assertAlmostEqual((b[0][1] - b[0][0]) / RATE, 4.5 + 2 * G.PAD, delta=0.08)   # the 0.5 s comma pause stayed inside piece 1
    def test_short_gaps_rejected(self):
        raw = make([('s', 2.0), ('q', 0.6), ('s', 3.0)])
        b, info = G.split_speech(raw, RATE, 2)
        self.assertIsNone(b)
    def test_wrong_count_rejected(self):
        raw = make([('s', 2.0), ('q', 3.0), ('s', 3.0)])          # 2 lines recorded, 3 expected
        self.assertIsNone(G.split_speech(raw, RATE, 3)[0])
    def test_merged_or_extra_line_rejected(self):
        raw = make([('s', 2.0), ('q', 3.0), ('s', 3.0), ('q', 3.0), ('s', 1.5)])   # 3 recorded, 2 expected -> second-longest gap is as big as the chosen one
        self.assertIsNone(G.split_speech(raw, RATE, 2)[0])
    def test_duration_outlier(self):
        texts = ['א' * 40, 'א' * 40, 'א' * 40]
        exp = [G.expected_clip_seconds(t) - 1.2 for t in texts]
        self.assertEqual(G.ratio_outliers(G.piece_ratios(exp, texts)), [])
        bad = [exp[0], exp[1] * 0.4, exp[2]]                       # truncated line
        self.assertEqual(G.ratio_outliers(G.piece_ratios(bad, texts)), [1])

class ClassAndReuse(unittest.TestCase):
    def test_class_lines_after_close_before_beginner(self):
        segs = [
            {'id': 'pose.b.entry.1', 'lang': 'he', 'text': 'ב', 'v2': True, 'prio': 'beginner'},
            {'id': 'pose.qg-x.name', 'lang': 'he', 'text': 'שם', 'prio': 'class'},
            {'id': 'pose.qg-x.entry.1', 'lang': 'he', 'text': 'כניסה', 'v2': True, 'prio': 'class'},
            {'id': 'session.close.line', 'lang': 'he', 'text': 'סוף', 'v2': True, 'prio': 'close'},
            {'id': 'pose.qg-x.intro', 'lang': 'ru', 'text': 'Упражнение'},
        ]
        order = [s['id'] + '|' + s['lang'] for s in sorted(segs, key=lambda s: G.priority(s, {}))]
        self.assertEqual(order, ['session.close.line|he', 'pose.qg-x.name|he', 'pose.qg-x.entry.1|he', 'pose.b.entry.1|he', 'pose.qg-x.intro|ru'])
    def test_same_text_reuses_clip_without_call(self):
        import json, tempfile
        with tempfile.TemporaryDirectory() as d:
            d = Path(d); (d / 'he').mkdir()
            (d / 'he' / 'pose.a.breath.mp3').write_bytes(b'x' * 2000)
            state = {'he|pose.a.breath': G.sha('הנשימה חופשית.')}
            r = G.Runner(d, state, d / 'state.json'); r.max_calls = 0
            calls = []
            r.call = lambda *a: calls.append(a)
            saved = G.verify, G.log; G.verify = lambda p: (True, 2.0, 0.8); G.log = lambda m: None
            try:
                r.per_item([{'id': 'pose.qg-x.breath', 'lang': 'he', 'text': 'הנשימה חופשית.'},
                            {'id': 'pose.qg-x.exit', 'lang': 'he', 'text': 'טקסט חדש.'}])
            finally: G.verify, G.log = saved
            self.assertEqual(calls, [])
            self.assertEqual((d / 'he' / 'pose.qg-x.breath.mp3').read_bytes(), b'x' * 2000)
            self.assertEqual(state['he|pose.qg-x.breath'], G.sha('הנשימה חופשית.'))
            self.assertNotIn('he|pose.qg-x.exit', state)
            self.assertIn('he/pose.qg-x.breath', json.loads((d / 'manifest.json').read_text()))

if __name__ == '__main__':
    unittest.main(verbosity=1)
