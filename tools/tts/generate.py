#!/usr/bin/env python3
"""Gemini TTS -> MP3 pipeline for the yoga site. Resumable, idempotent.
Usage: python3 tools/tts/generate.py [--script narration-script.json] [--max-calls 90] [--lang he] [--batch 1] [--include-unused] [--out DIR] [--dry-run]
Default language is Hebrew only (Owner 2026-11-20). --batch N puts up to N consecutive Hebrew lines in ONE API call and splits the audio on the long silences
between them (EXPERIMENTAL, off by default: see --batch); every batch is validated (cut count, gap sizes, per-line duration vs letters) and any doubt falls back to per-item calls for that batch only.
The API key is read at runtime from env GEMINI_API_KEY or from the .env file (path in KEY_ENV_FILES). It is never printed or stored."""
import os, sys, json, time, re, wave, base64, hashlib, subprocess, argparse, tempfile, urllib.request, urllib.error
from pathlib import Path
import array

ROOT = Path(__file__).resolve().parent.parent.parent
TTS = Path(__file__).resolve().parent
MODEL = 'gemini-3.8-flash-lite-tts'
KEY_ENV_FILES = [Path('/Users/user/learn_russian/russian-course-v2/.env'), ROOT / '.env']
VOICES = {'he': 'Vindemiatrix', 'ru': 'Achernar', 'en': 'Achernar'}
STYLE = {
    'he': 'Calm, warm, slow yoga instructor voice. Soft and unhurried Hebrew. Read only the supplied text once, no added words.',
    'ru': 'Calm, warm, slow yoga instructor voice. Soft and unhurried Russian. Read only the supplied text once, no added words.',
    'en': 'Calm, warm, slow yoga instructor voice. Soft and unhurried English. Read only the supplied text once, no added words.',
}
LANG_ORDER = ['he', 'ru', 'en']
DEFAULT_LANGS = 'he'            # ru/en recording is paused (Owner 2026-11-20); pass --lang he,ru,en to resume it
BATCH_MAX_ITEMS, BATCH_MAX_LETTERS = 4, 260
BATCH_STYLE = (' Each part below is a separate line. Read every line exactly once, in the given order, as its own complete utterance,'
               ' then stay completely silent for about three seconds before starting the next line. Do not read numbers, labels or punctuation names. No commentary between lines.')
# duration of a finished clip (incl. 0.5 s lead + 0.7 s tail) vs Hebrew letters, fitted on the 510 recorded he clips: 2.63 + 0.152 * letters, observed ratio 0.78..1.38
FIT_A, FIT_B = 2.63, 0.1523
RATIO_OK = (0.7, 1.5)
PAD = 0.05                      # seconds of model silence kept around the speech of a split piece (recorded clips have ~0 s)
MIN_GAP = 0.9                   # every chosen cut must be at least this long (s)

def letters(text): return max(1, sum(c.isalpha() for c in text))
def expected_clip_seconds(text): return FIT_A + FIT_B * letters(text)

def is_unused(seg):
    """Hebrew legacy cue lines (pose.<id>.cue.N, non-v2) are never played: every pose has v2 lines and hePlan() never asks for cues (tests/tts.test.mjs proves it)."""
    return seg['lang'] == 'he' and not seg.get('v2') and re.match(r'pose\.[^.]+\.cue\.\d+$', seg['id']) is not None

def select_segments(segs, langs, include_unused=False):
    return [s for s in segs if s['lang'] in langs and s.get('text', '').strip() and (include_unused or not is_unused(s))]

def make_batches(todo, n=BATCH_MAX_ITEMS, max_letters=BATCH_MAX_LETTERS):
    """Group consecutive pending segments of the same language (priority order kept) into API calls of up to n lines / max_letters letters."""
    out, cur, ltr = [], [], 0
    for s in todo:
        L = letters(s['text'])
        if cur and (len(cur) >= n or cur[0]['lang'] != s['lang'] or ltr + L > max_letters):
            out.append(cur); cur, ltr = [], 0
        cur.append(s); ltr += L
    if cur: out.append(cur)
    return out
RPM_GAP = 6.5
LEAD, TAIL = 0.5, 0.7

def log(msg):
    line = time.strftime('%F %T ') + msg
    print(line, flush=True)
    with open(TTS / 'run.log', 'a', encoding='utf-8') as f:
        f.write(line + '\n')

def get_key():
    k = os.environ.get('GEMINI_API_KEY')
    if k: return k
    for p in KEY_ENV_FILES:
        if p.exists():
            for ln in p.read_text().splitlines():
                m = re.match(r'\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*(.*)', ln)
                if m: return m.group(1).strip().strip('"\'')
    raise SystemExit('GEMINI_API_KEY not found (env or .env)')

KEY = None
class Quota(Exception): pass

def api(text, lang):
    """text: one string (single line) or a list of strings (batch: one part per line, BATCH_STYLE appended)."""
    texts = text if isinstance(text, list) else [text]
    style = STYLE[lang] + (BATCH_STYLE if isinstance(text, list) else '')
    body = {'contents': [{'role': 'user', 'parts': [{'text': x, 'speech_metadata': {'style': style}} for x in texts]}],
            'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': VOICES[lang]}}}}}
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent'
    for attempt in range(4):
        req = urllib.request.Request(url, data=json.dumps(body, ensure_ascii=False).encode(),
                                     headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace').replace(KEY, '[REDACTED]')
            if e.code == 429:
                low = msg.lower().replace(' ', '').replace('_', '')
                if 'perday' in low or attempt >= 3:
                    raise Quota(msg[:300])
                m = re.search(r'retry in ([0-9.]+)\s*s', msg, re.I) or re.search(r'"retryDelay":\s*"([0-9.]+)s"', msg)
                w = (float(m.group(1)) if m else 58.0) + 2
                log(f'429 per-minute, sleeping {w:.0f}s (retry {attempt+1}/3)')
                time.sleep(w); continue
            raise RuntimeError(f'HTTP {e.code}: {msg[:300]}')
    raise Quota('retries exhausted')

def pcm_from(result):
    blocks = [p['inlineData'] for c in result.get('candidates', [])[:1] for p in c.get('content', {}).get('parts', []) if 'inlineData' in p]
    if len(blocks) != 1: raise RuntimeError('expected one audio block')
    b = blocks[0]; raw = base64.b64decode(b['data'])
    m = re.search(r'rate=(\d+)', b.get('mimeType', ''))
    return raw, int(m[1]) if m else 24000

def to_mp3(raw, rate, out):
    out = Path(out)
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / 'a.wav'
        with wave.open(str(wav), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(raw)
        out.parent.mkdir(parents=True, exist_ok=True)
        tmp = out.with_suffix('.tmp.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(wav),
                        '-af', f'adelay={int(LEAD*1000)}:all=1,apad=pad_dur={TAIL}',
                        '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '64k', str(tmp)], check=True)
        tmp.replace(out)

def verify(path):
    """returns (ok, duration, speech_ratio)"""
    p = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True)
    dur = float(p.stdout.strip() or 0)
    r = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(path), '-f', 's16le', '-ac', '1', '-ar', '8000', '-'], capture_output=True)
    a = array.array('h'); a.frombytes(r.stdout[: len(r.stdout) // 2 * 2])
    win = 400  # 50ms
    loud = tot = 0
    for i in range(0, len(a) - win, win):
        tot += 1
        if max(abs(x) for x in a[i:i+win]) > 500: loud += 1
    ratio = loud / tot if tot else 0
    return dur > 0.5 and ratio > 0.25, dur, ratio

def frame_db(raw, rate, hop_s=0.01):
    a = array.array('h'); a.frombytes(raw[: len(raw) // 2 * 2])
    hop = int(rate * hop_s); out = []
    for i in range(0, len(a) - hop + 1, hop):
        seg = a[i:i + hop]
        ms = sum(x * x for x in seg) / hop
        out.append(10 * __import__('math').log10(ms / (32768.0 ** 2) + 1e-18))
    return out

def split_speech(raw, rate, n):
    """Cut one batch recording into exactly n pieces at its n-1 longest silences. Returns (bounds [(start_sample, end_sample)], info) or (None, info).
    Accepted only if, at some threshold, the n-1 longest silent runs (>= 0.5 s) are each >= MIN_GAP and the next-longest run is <= 0.6x the shortest chosen cut
    (so an in-sentence pause can never be mistaken for a line break, and a skipped / merged / doubled line shows up as a wrong count)."""
    db = frame_db(raw, rate); info = {'tried': []}
    if n == 1: return None, {'reason': 'single'}
    for thr in (-50, -45, -40, -35):
        sp = [i for i, d in enumerate(db) if d >= thr]
        if not sp: info['tried'].append((thr, 'no speech')); continue
        first, last = sp[0], sp[-1] + 1
        runs, a = [], None
        for k in range(first, last):
            if db[k] < thr and a is None: a = k
            elif db[k] >= thr and a is not None:
                if k - a >= 50: runs.append((a, k))
                a = None
        if len(runs) < n - 1: info['tried'].append((thr, 'too few gaps %d' % len(runs))); continue
        order = sorted(runs, key=lambda r: r[0] - r[1])      # longest first
        chosen = sorted(order[:n - 1])
        shortest = min(r[1] - r[0] for r in chosen) / 100.0
        nxt = (order[n - 1][1] - order[n - 1][0]) / 100.0 if len(order) >= n else 0.0
        if shortest < MIN_GAP: info['tried'].append((thr, 'gap %.2fs < %.1fs' % (shortest, MIN_GAP))); continue
        if nxt > 0.6 * shortest: info['tried'].append((thr, 'ambiguous: next pause %.2fs vs cut %.2fs' % (nxt, shortest))); continue
        pad = int(PAD * 100)
        starts = [first] + [r[1] for r in chosen]; ends = [r[0] for r in chosen] + [last]
        bounds = []
        for s, e in zip(starts, ends):
            s = max(0, s - pad); e = min(len(db), e + pad)
            bounds.append((s * int(rate * 0.01), e * int(rate * 0.01)))
        info.update(thr=thr, gaps=[round((r[1] - r[0]) / 100.0, 2) for r in chosen], next_pause=nxt)
        return bounds, info
    info['reason'] = 'no threshold gave exactly %d clean cuts: %s' % (n - 1, info['tried'])
    return None, info

def piece_ratios(durs, texts):
    """durs: speech seconds of each piece (without lead/tail). Returns per-piece ratio of final clip length vs the letters-based expectation."""
    return [(d + LEAD + TAIL) / expected_clip_seconds(t) for d, t in zip(durs, texts)]

def ratio_outliers(ratios):
    med = sorted(ratios)[len(ratios) // 2]
    return [i for i, r in enumerate(ratios) if not (RATIO_OK[0] <= r <= RATIO_OK[1]) or not (0.75 * med <= r <= 1.33 * med)]

def sha(t): return hashlib.sha256(t.encode('utf-8')).hexdigest()[:16]

def plan_rank():
    """order of pose ids by first appearance in data/plans*.js (poses used in preset plans first)."""
    rank = {}
    for f in sorted((ROOT / 'data').glob('plan*.js')):
        for m in re.finditer(r"['\"]([a-z0-9_-]+)['\"]", f.read_text(encoding='utf-8')):
            rank.setdefault(m.group(1), len(rank))
    return rank

V2_PRIO = {'intro': 0, 'close': 1, 'beginner': 2, 'fix': 3, 'rest': 4}

def priority(seg, rank):
    """Hebrew v2 segments first (intro -> close -> beginner-plan poses -> fix (common mistakes) -> rest), then the old order (common, names, plan poses, rest)."""
    i = seg['id']; lang = LANG_ORDER.index(seg['lang']) if seg['lang'] in LANG_ORDER else 9
    m = re.match(r'pose\.([^.]+)\.(\w+)', i)
    if seg.get('v2'):
        pr = V2_PRIO.get(seg.get('prio'), 4)
        return (pr, 0, rank.get(m[1], 9999) if m else 0, 0)  # 0: stable sort keeps script (play) order inside a group
    if i.startswith('common.'): tier, sub = 4, 0
    elif m and m[2] == 'name': tier, sub = 5, rank.get(m[1], 9999)
    elif m and m[1] in rank: tier, sub = 6, rank[m[1]]
    else: tier, sub = 7, 0
    return (tier, lang, sub, i)

def update_manifest(state, out_dir):
    items = []
    for k in state:
        lang, i = k.split('|', 1)
        if (out_dir / lang / f'{i}.mp3').exists(): items.append(f'{lang}/{i}')
    out_dir.mkdir(exist_ok=True)
    (out_dir / 'manifest.json').write_text(json.dumps(sorted(items), ensure_ascii=False, indent=0), encoding='utf-8')

def internal_pauses(path):
    """silences >= 0.35 s strictly inside a clip (the 0.5 s lead and the 0.7 s tail are excluded)."""
    o = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-i', str(path), '-af', 'silencedetect=n=-45dB:d=0.35', '-f', 'null', '-'], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)', o)]
    durs = [float(x) for x in re.findall(r'silence_duration: ([0-9.]+)', o)]
    return [d for s, d in zip(starts, durs) if s > 0.1][:-1] if durs else []

class Runner:
    def __init__(self, out_dir, state, state_path):
        self.out_dir, self.state, self.sp = out_dir, state, state_path
        self.calls = self.done = self.errors = 0; self.last = 0.0; self.max_calls = 0

    def budget(self): return self.calls < self.max_calls
    def call(self, text, lang):
        w = RPM_GAP - (time.monotonic() - self.last)
        if w > 0: time.sleep(w)
        self.last = time.monotonic(); self.calls += 1
        return pcm_from(api(text, lang))
    def path(self, s): return self.out_dir / s['lang'] / f"{s['id']}.mp3"
    def commit(self, s, out, dur, ratio, tag):
        self.state[f"{s['lang']}|{s['id']}"] = sha(s['text']); self.done += 1
        self.sp.write_text(json.dumps(self.state, ensure_ascii=False, indent=0))
        update_manifest(self.state, self.out_dir)
        log(f"OK {s['lang']}/{s['id']} dur={dur:.2f}s speech={ratio:.2f} {tag}")

    def single(self, s):
        out = self.path(s)
        raw, rate = self.call(s['text'], s['lang'])
        to_mp3(raw, rate, out)
        ok, dur, ratio = verify(out)
        if not ok:
            out.unlink(); self.errors += 1
            log(f"VERIFY FAIL {s['lang']}/{s['id']} dur={dur:.2f} speech={ratio:.2f}"); return False
        self.commit(s, out, dur, ratio, 'single'); return True

    def batch(self, group):
        """one call for len(group) lines; any doubt -> per-item calls (only as far as the budget allows)."""
        lang = group[0]['lang']; texts = [s['text'] for s in group]
        raw, rate = self.call(texts, lang)
        bounds, info = split_speech(raw, rate, len(group))
        if bounds is None:
            log(f"BATCH FALLBACK ({len(group)} lines, {group[0]['id']}...): {info.get('reason')}"); self.dump(raw, rate, group); return self.per_item(group)
        pcm = array.array('h'); pcm.frombytes(raw[: len(raw) // 2 * 2])
        durs = [(e - s) / rate - 2 * PAD for s, e in bounds]
        ratios = piece_ratios(durs, texts); bad = ratio_outliers(ratios)
        log(f"batch split n={len(group)} thr={info['thr']} gaps={info['gaps']} next_pause={info['next_pause']:.2f} ratios={[round(r, 2) for r in ratios]}")
        if len(bad) > 1:
            log(f"BATCH FALLBACK: {len(bad)} duration outliers {bad}"); self.dump(raw, rate, group); return self.per_item(group)
        redo = []
        for k, (s, (a, b)) in enumerate(zip(group, bounds)):
            if k in bad: redo.append(s); continue
            out = self.path(s)
            to_mp3(pcm[a:b].tobytes(), rate, out)
            ok, dur, ratio = verify(out); pauses = internal_pauses(out)
            if not ok or any(x >= 1.0 for x in pauses):
                out.unlink(); redo.append(s); log(f"PIECE REJECTED {s['id']} dur={dur:.2f} speech={ratio:.2f} internal_pauses={pauses}"); continue
            self.commit(s, out, dur, ratio, f"batch ratio={ratios[k]:.2f}")
        if redo: log(f'BATCH redo per-item: {[s["id"] for s in redo]}'); self.per_item(redo)

    def dump(self, raw, rate, group):
        d = TTS / 'batch-debug'; d.mkdir(exist_ok=True)
        with wave.open(str(d / (group[0]['id'] + '.wav')), 'wb') as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate); f.writeframes(raw)

    def per_item(self, group):
        for s in group:
            if not self.budget(): log('call budget reached, stopping'); return
            try: self.single(s)
            except Quota: raise
            except Exception as e: self.errors += 1; log(f"ERROR {s['lang']}/{s['id']}: {str(e)[:300]}")

def main():
    global KEY
    ap = argparse.ArgumentParser()
    ap.add_argument('--script', default=str(ROOT / 'narration-script.json'))
    ap.add_argument('--max-calls', type=int, default=90)
    ap.add_argument('--lang', default=DEFAULT_LANGS)
    ap.add_argument('--batch', type=int, default=1, help='max lines per API call; default 1 = one call per line. EXPERIMENTAL >1: trial 2026-11-20 showed the Hebrew model leaves only 0.5-0.6 s between lines (2/2 batches rejected), so batching currently just wastes calls')
    ap.add_argument('--include-unused', action='store_true', help='also generate segments the player never plays (he legacy cues)')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--out', default=str(ROOT / 'audio'))
    a = ap.parse_args()
    out_dir = Path(a.out)
    segs = json.loads(Path(a.script).read_text(encoding='utf-8'))
    langs = a.lang.split(',')
    segs = select_segments(segs, langs, a.include_unused)
    sp = TTS / 'state.json'
    state = json.loads(sp.read_text()) if sp.exists() else {}
    rank = plan_rank()
    segs.sort(key=lambda s: priority(s, rank))
    todo = [s for s in segs if not (state.get(f"{s['lang']}|{s['id']}") == sha(s['text']) and (out_dir / s['lang'] / f"{s['id']}.mp3").exists())]
    groups = make_batches(todo, a.batch) if a.batch > 1 else [[s] for s in todo]
    log(f'segments={len(segs)} pending={len(todo)} calls_needed~{len(groups)} max_calls={a.max_calls} langs={a.lang} batch={a.batch}')
    if a.dry_run: return
    KEY = get_key()
    r = Runner(out_dir, state, sp); r.max_calls = a.max_calls
    try:
        for g in groups:
            if not r.budget(): log('call budget reached, stopping'); break
            try:
                if len(g) == 1: r.per_item(g)
                else: r.batch(g)
            except Quota: raise
            except Exception as e:
                r.errors += 1; log(f"ERROR batch {g[0]['id']}...: {str(e)[:300]}")
    except Quota as e:
        log('DAILY QUOTA reached, stopping cleanly: ' + str(e)[:200])
    update_manifest(state, out_dir)
    remaining = len([s for s in segs if state.get(f"{s['lang']}|{s['id']}") != sha(s['text'])])
    log(f'done={r.done} errors={r.errors} calls={r.calls} remaining={remaining}')
    (TTS / 'status.txt').write_text('complete' if remaining == 0 else f'pending {remaining}')

if __name__ == '__main__':
    main()
