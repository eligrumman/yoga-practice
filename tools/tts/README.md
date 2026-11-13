# Yoga narration TTS pipeline

Gemini TTS -> MP3. Input `narration-script.json` (`[{id, lang, text}]`, from `node tools/export-narration.mjs`).
Output `audio/<lang>/<id>.mp3` (mono, 24 kHz, 64 kbps, 0.5s lead + 0.7s tail silence) and `audio/manifest.json` (list of `"<lang>/<id>"`).

## Run / resume
    python3 tools/tts/generate.py                 # up to 90 API calls (daily quota ~100/model), then stops
    python3 tools/tts/generate.py --dry-run       # just count pending
    python3 tools/tts/generate.py --lang he       # one language
    python3 tools/tts/generate.py --script tools/tts/sample-script.json   # test with sample

Idempotent: `tools/tts/state.json` maps `lang|id` -> sha of text; a segment is skipped if its MP3 exists and the hash matches; changed text is regenerated.
On a per-day 429 it stops cleanly; just run again the next day. Per-minute 429: waits retryDelay+2s, up to 3 retries. Calls are spaced 6.5s (10 RPM).
Every MP3 is verified (duration > 0.5s, >25% of 50ms windows non-silent); failures are deleted and logged.
Log: `tools/tts/run.log` (no secrets). Status: `tools/tts/status.txt` (`complete` / `pending N`).

## Priority order
common.* (he, ru, en) -> pose names -> intros/cues of poses used in `data/plan*.js` -> everything else. Within each tier: Hebrew, Russian, English.

## API key
Read at runtime from env `GEMINI_API_KEY`, else from `/Users/user/learn_russian/russian-course-v2/.env`, else `<repo>/.env` (gitignored). Never committed or logged.

## Model and voices
Model `gemini-3.8-flash-lite-tts`. Style prompt: "Calm, warm, slow yoga instructor voice. Soft and unhurried <language>. Read only the supplied text once, no added words."
| lang | voice |
|---|---|
| he | Vindemiatrix (gentle) |
| ru | Achernar (soft) |
| en | Achernar (soft) |
Change in `VOICES` at the top of generate.py; delete the matching state.json entries to regenerate.

## Daily auto-resume (launchd, local Mac)
`com.eli.yoga-tts` runs `tools/tts/run-daily.sh` daily at 09:10 and removes itself (`launchctl bootout`) once status is `complete`.
Install: `cp tools/tts/com.eli.yoga-tts.plist ~/Library/LaunchAgents/ && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.eli.yoga-tts.plist`
Remove manually: `launchctl bootout gui/$(id -u)/com.eli.yoga-tts`
