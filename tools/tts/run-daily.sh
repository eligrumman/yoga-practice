#!/bin/bash
# Daily resume run (called by launchd com.eli.yoga-tts). Generates narration MP3s, then publishes them
# (commit + push) so GitHub Pages serves them. Stops itself when everything is generated.
# Fail-safe: every failure is logged to tools/tts/run.log and the script exits; nothing retries in a loop.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" # launchd has a minimal PATH; ffmpeg lives in /opt/homebrew/bin
REPO=/Users/user/agents/yoga
LOG="$REPO/tools/tts/run.log"
TRAILER='Claude-Session: https://claude.ai/code/session_01PbMySQXABWHaFV21ukrRuT'
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

cd "$REPO" || { echo "$(date) cannot cd $REPO" >> /tmp/yoga-tts-run-daily.err; exit 1; }
[ -f narration-script.json ] || { log "no narration-script.json yet"; exit 0; }

/usr/bin/python3 tools/tts/generate.py --max-calls 90 >> tools/tts/launchd.out 2>&1
GEN_RC=$?
[ "$GEN_RC" -eq 0 ] || log "generate.py exited with code $GEN_RC (publishing skipped)"

if [ "$GEN_RC" -eq 0 ]; then
  # new or changed clips only (audio/ and the state file; never .env or logs)
  NEW=$(git status --porcelain -- audio/ tools/tts/state.json | wc -l | tr -d ' ')
  CLIPS=$(git status --porcelain --untracked-files=all -- audio/ | grep -c '\.mp3$')
  if [ "$NEW" -gt 0 ]; then
    if ! git pull --rebase --autostash >> "$LOG" 2>&1; then
      log "git pull --rebase failed; aborting rebase, not publishing this run"
      git rebase --abort >> "$LOG" 2>&1
    else
      git add audio/ tools/tts/state.json >> "$LOG" 2>&1
      if git diff --cached --quiet; then
        log "nothing staged after add, nothing to publish"
      elif git commit -q -m "Narration audio batch $(date +%F) ($CLIPS clips)" -m "$TRAILER" >> "$LOG" 2>&1; then
        if git push >> "$LOG" 2>&1; then log "published $CLIPS clips ($(git rev-parse --short HEAD))"; else log "git push failed (commit stays local, will be pushed with the next batch)"; fi
      else
        log "git commit failed"
      fi
    fi
  else
    log "no new audio files, nothing to publish"
  fi
fi

if [ "$(cat tools/tts/status.txt 2>/dev/null)" = "complete" ]; then
  launchctl bootout "gui/$(id -u)/com.eli.yoga-tts" 2>/dev/null
  log "all generated, launchd job removed"
fi
exit 0
