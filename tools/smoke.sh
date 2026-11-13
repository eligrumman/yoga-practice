#!/usr/bin/env bash
# Smoke test: load the site, play a tiny 2-pose plan to the end (skip), assert the finish screen has text and there are no page errors.
# Usage: tools/smoke.sh [URL] [LANG he|ru|en] [WIDTH] [SCREENSHOT_PATH]
set -u
URL="${1:-https://eligrumman.github.io/yoga-practice/}"
LANG_="${2:-he}"; W="${3:-1280}"; SHOT="${4:-}"
export AGENT_BROWSER_SESSION="smoke-$$-$RANDOM"
AB=agent-browser
fail() { echo "SMOKE FAIL ($LANG_ ${W}px): $*"; $AB close >/dev/null 2>&1; exit 1; }
BASE="${URL%%[?#]*}"; X="?x=$RANDOM$RANDOM"
$AB set viewport "$W" 900 >/dev/null 2>&1
$AB open "$BASE$X" >/dev/null || fail "cannot open $BASE"
$AB eval "localStorage.setItem('hyf.lang', JSON.stringify('$LANG_')); localStorage.setItem('hyf.plans', JSON.stringify([{id:'smoke',name:'Smoke',updated:Date.now(),items:[{pose:'mountain',level:0,unit:'sec',amount:5},{pose:'child',level:0,unit:'sec',amount:5}]}])); localStorage.setItem('hyf.settings', JSON.stringify({mute:true,beep:false,wake:false}));" >/dev/null
$AB open "$BASE$X#/player/smoke" >/dev/null
$AB reload >/dev/null; sleep 2
$AB errors --clear >/dev/null 2>&1
PNAME=$($AB eval "document.querySelector('.p-name')?.textContent || ''" | tr -d '"')
[ -n "$PNAME" ] || fail "player did not render a pose name"
# Hebrew starts with an intro phase (the first skip only skips the intro), so skip until the finish screen shows (max 6 clicks)
for i in 1 2 3 4 5 6; do
  [ "$($AB eval "!!document.querySelector('.finish')")" = true ] && break
  $AB eval "(document.querySelector('[data-act=skip]') || document.querySelector('#p-ctrl button:last-child')).click()" >/dev/null || fail "skip click failed"
  sleep 1
done
FIN=$($AB eval "document.querySelector('.finish')?.innerText || ''")
ERR=$($AB errors 2>&1)
[ -n "$SHOT" ] && $AB screenshot "$SHOT" >/dev/null 2>&1
echo "finish text: $FIN"
echo "page errors: ${ERR:-none}"
[ "${#FIN}" -gt 20 ] || fail "finish screen is blank or too short"
echo "$FIN" | grep -qiE 'undefined|NaN|\[object' && fail "finish text contains undefined/NaN"
echo "$ERR" | grep -qiE 'error|not defined|undefined' && fail "page errors present"
$AB close >/dev/null 2>&1
echo "SMOKE OK ($LANG_ ${W}px)"
