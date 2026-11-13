#!/usr/bin/env python3
"""Gemini TTS -> MP3 pipeline for the yoga site. Resumable, idempotent.
Usage: python3 tools/tts/generate.py [--script narration-script.json] [--max-calls 90] [--lang he,ru,en] [--dry-run]
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
    body = {'contents': [{'role': 'user', 'parts': [{'text': text, 'speech_metadata': {'style': STYLE[lang]}}]}],
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

def update_manifest(state):
    items = []
    for k in state:
        lang, i = k.split('|', 1)
        if (ROOT / 'audio' / lang / f'{i}.mp3').exists(): items.append(f'{lang}/{i}')
    (ROOT / 'audio').mkdir(exist_ok=True)
    (ROOT / 'audio' / 'manifest.json').write_text(json.dumps(sorted(items), ensure_ascii=False, indent=0), encoding='utf-8')

def main():
    global KEY
    ap = argparse.ArgumentParser()
    ap.add_argument('--script', default=str(ROOT / 'narration-script.json'))
    ap.add_argument('--max-calls', type=int, default=90)
    ap.add_argument('--lang', default='he,ru,en')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--out', default=str(ROOT / 'audio'))
    a = ap.parse_args()
    segs = json.loads(Path(a.script).read_text(encoding='utf-8'))
    langs = a.lang.split(',')
    segs = [s for s in segs if s['lang'] in langs and s.get('text', '').strip()]
    sp = TTS / 'state.json'
    state = json.loads(sp.read_text()) if sp.exists() else {}
    rank = plan_rank()
    segs.sort(key=lambda s: priority(s, rank))
    todo = [s for s in segs if not (state.get(f"{s['lang']}|{s['id']}") == sha(s['text']) and (ROOT / 'audio' / s['lang'] / f"{s['id']}.mp3").exists())]
    log(f'segments={len(segs)} pending={len(todo)} max_calls={a.max_calls}')
    if a.dry_run: return
    KEY = get_key()
    calls = done = errors = 0; last = 0.0
    for s in todo:
        if calls >= a.max_calls: log('call budget reached, stopping'); break
        w = RPM_GAP - (time.monotonic() - last)
        if w > 0: time.sleep(w)
        out = ROOT / 'audio' / s['lang'] / f"{s['id']}.mp3"
        try:
            last = time.monotonic(); calls += 1
            raw, rate = pcm_from(api(s['text'], s['lang']))
            to_mp3(raw, rate, out)
            ok, dur, ratio = verify(out)
            if not ok:
                out.unlink(); errors += 1
                log(f"VERIFY FAIL {s['lang']}/{s['id']} dur={dur:.2f} speech={ratio:.2f}"); continue
            state[f"{s['lang']}|{s['id']}"] = sha(s['text']); done += 1
            sp.write_text(json.dumps(state, ensure_ascii=False, indent=0))
            update_manifest(state)
            log(f"OK {s['lang']}/{s['id']} dur={dur:.2f}s speech={ratio:.2f}")
        except Quota as e:
            log('DAILY QUOTA reached, stopping cleanly: ' + str(e)[:200]); break
        except Exception as e:
            errors += 1; log(f"ERROR {s['lang']}/{s['id']}: {str(e)[:300]}")
    update_manifest(state)
    remaining = len([s for s in segs if state.get(f"{s['lang']}|{s['id']}") != sha(s['text'])])
    log(f'done={done} errors={errors} calls={calls} remaining={remaining}')
    (TTS / 'status.txt').write_text('complete' if remaining == 0 else f'pending {remaining}')

if __name__ == '__main__':
    main()
