#!/bin/bash
# Daily resume run (called by launchd com.eli.yoga-tts). Stops itself when everything is generated.
cd /Users/user/agents/yoga || exit 1
[ -f narration-script.json ] || { echo "$(date) no narration-script.json yet" >> tools/tts/run.log; exit 0; }
/usr/bin/python3 tools/tts/generate.py --max-calls 90 >> tools/tts/launchd.out 2>&1
if [ "$(cat tools/tts/status.txt 2>/dev/null)" = "complete" ]; then
  launchctl bootout "gui/$(id -u)/com.eli.yoga-tts" 2>/dev/null
  echo "$(date) all generated, launchd job removed" >> tools/tts/run.log
fi
