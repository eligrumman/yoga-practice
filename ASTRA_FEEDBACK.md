# External browse-based UX review, round 1 (live site)

Site: https://eligrumman.github.io/yoga-practice/  | Date: 2026-11-13 | Evidence dir: `review/round1/` (gitignored)

## 1. Lane used

**Astra (ChatGPT/OpenAI Sol) could NOT browse in this environment. The review was done by the claude-native lane, model `sonnet`, verb `edit`, with `--with skills=agent-browser`.** So this is an external Claude Sonnet review, not an Astra review. Any "Astra said" claim should be read as "Sonnet said".

### Smoke-test log (S = outsourcerer.sh)

| # | Lane / command | Result |
|---|---|---|
| 1 | `S run -m sol --with skills=agent-browser "<open url, screenshot, title>"` (codex-native) | FAIL. Codex: `ERROR codex_core::tools::router: error=code-mode host is disabled`. It cannot run shell, so agent-browser never ran. No screenshot. (doctor: `code-mode-host: MISSING`) |
| 2 | `S yolo -m sol ...` | BLOCKED by the Claude Code auto-mode classifier ([Undermining Oversight]). Not retried or worked around. |
| 3 | `S research -m sol --with skills=agent-browser ...` (sandboxed exec) | FAIL. Same `code-mode host is disabled`. |
| 4 | claudex lane with Sol | UNAVAILABLE. `doctor`: claudex not set up (needs the user's own CLIProxyAPI). |
| 5 | `S run --provider cc -m glm --with skills=agent-browser ...` | FAIL. OpenRouter `402 This request requires more credits`. Self-heal to Devin: `Error: /upgrade to access this model`. Not paid for anything. |
| 6 | `S edit -m sonnet --with skills=agent-browser "Use agent-browser ... screenshot smoke.png, reply with the title"` (claude-native, interactive tmux auto-detach) | **WORKS.** Title returned: `יוגה בבית · תנוחות`. `review/round1/smoke.png` exists (105,677 bytes). I viewed it: Hebrew RTL home page, plans grid, dark theme. |

Other lanes in `doctor`: gemini/agy, droid, cursor, cline, pi, hermes not installed. Local lane has no model. The Devin GLM lane needs an upgrade.

### Real review run
- Same lane and command shape: `S edit -m sonnet --with skills=agent-browser "<review prompt>"`. The interactive launch did not stay up with the long prompt, so it auto-fell back to a headless background job `20261113-131652-335b3c8ced9b` and browsing still worked. Runtime about 19 min.
- It produced 46 screenshots plus 17 numbered items. The final text report is quoted into the table below.
- Coverage gaps the reviewer admitted: it did not wait out a natural timer, and did not test narration audio, the settings panel, favourites, import/export or the 7-day plan. It also did not view some RU/EN screenshots as images.

## 2. Evidence gate

Every item below cites a screenshot that exists on disk (`ls review/round1/`). Item 16 originally cited `/tmp/mt-strip.png`, which is outside the review folder, so I re-captured it myself (`v-mountain-t0.3.png`). Files prefixed `v-` are my own verification screenshots.

## 3. Triage table

IP rule: nothing here asks to imitate a specific app, so no REJECT for IP. "verified" = I reproduced it myself on the live site with agent-browser.

| # | Type | Sev | Summary | Evidence | Decision | Reason |
|---|---|---|---|---|---|---|
| 1 | visual/bug | high | At 375px the plan builder is unusable: pose names wrap one word per line, and the level/hold/unit controls collapse into tiny slivers, so hold time can't be edited on a phone | `09e-mobile-builder.png`, `v-mobile-builder-generated.png` | FIXED in bf01784 (was ADOPT) | verified (a generated plan at 375px shows the same collapsed controls) |
| 2 | bug | high | The practice log records the PLANNED duration, not elapsed time. Skipping through a 20-min plan in about 2 min logged `minutes: 20` and counted a streak day | `08d-player-finish.png`, `v-player-finish.png` | FIXED in bf01784 (was ADOPT) | verified: `hyf.history = [{"minutes":20,...}]` right after skipping through the plan |
| 3 | bug | med | The welcome caption stays visible on pose 2 after Skip | `08c-player-after-skip.png` | REJECT | not reproduced: after Skip my run showed the correct pose text ("תנוחת חתול."), see `v-player-after-skip.png` |
| 4 | content | med | "צד אחד" (one side) is shown for symmetric poses. Reviewer saw Downward Dog; I also saw it on Mountain | `04-pose-downward-dog-level2.png`, `v-mountain-t0.3.png` | FIXED in bf01784 (was ADOPT) | verified on Downward Dog and Mountain. The `sided` flags need auditing across all 36 poses |
| 5 | content | med | The "first time / Beginner / 20 min / General" plan has 28 poses, including Warrior III, Plank, Tree and Half-split, which is too demanding for a first-timer | `07b-generated-plan.png`, `v-mobile-builder-generated.png` | FIXED in bf01784 (was ADOPT) | verified via localStorage: `...,tree,warrior-3,downward-dog,plank,...,half-split,...` |
| 6 | UX | med | Dragging item 3 onto item 1 lands at position 2, one slot short | `06d-builder-after-drag.png`, `v-builder-after-drag.png` | ADOPT | verified in a synthetic drag (`tabletop,cat,cow` becomes `tabletop,cow,cat`). Caveat: synthetic drag may differ from a real mouse, so confirm by hand |
| 7 | UX | med | The builder gives no save feedback. It autosaves, and an empty "new plan" is stored immediately | `06b-builder-new.png`, `06f-builder-after-reload.png` | FIXED in bf01784 (was ADOPT) | reload persistence confirmed. A "saved" indicator would clarify it. Lower priority |
| 8 | UX | low | Hold values are silently clamped (0 becomes 1 s, 99999 becomes 600) with no hint | `06e-builder-edited.png` | ADOPT | not re-verified by me. Cheap fix: min/max attributes and a sensible minimum. Low priority |
| 9 | bug | low | Singular form: "1 תנוחות" after a search | `02b-library-search-kelev.png`, `v-library-search.png` | ADOPT | verified: search "כלב" shows "1 תנוחות" |
| 10 | content | low | Duplicated day prefix: "יום 1 · יום 1: להכיר את הנשימה" | `10b-ru-home-full.png` | ADOPT | verified, and it is broader than reported: it also happens in HE (home page text), not only EN/RU |
| 11 | a11y | low | The library filter selects have no accessible name | `02a-library.png` | FIXED in bf01784 (was ADOPT) | verified: the snapshot shows `combobox` with no name |
| 12 | visual | low | The "הוסף ל…" select on the pose page is truncated | `04-pose-downward-dog-level2.png` | ADOPT | verified (visible in `05-wrong-*` screenshots too) |
| 13 | visual | low | Finish screen: text is centred but the buttons are right-aligned | `08d-player-finish.png` | REJECT | not verified. Cosmetic. Re-check after the player is redone |
| 14 | visual | low | The generator dialog shows both a native radio dot and the highlighted pill | `07a-generator.png` | REJECT | not verified. Cosmetic. Could be a later polish item |
| 15 | visual | low | Mobile player: the sticky control bar covers the safety text, and the header nav wraps to two lines | `09d-mobile-player.png` | REJECT | not verified by me. Re-test after the #1 mobile layout pass |
| 16 | bug | med | A pose page starts with the wrong shape: Mountain first shows a seated figure at about 0.3 s before standing up | `v-mountain-t0.3.png` (reviewer's was `/tmp`, gate failed) | ADOPT | verified with my own capture. The animation agent should also check the other pose pages |
| 17 | UX | low | Saved plan names are not translated when switching language | `11c-en-generated.png` | REJECT | expected behaviour: names are user data |
| A1 | visual | high | Revolved Chair: no visible twist, reads as plain chair with one arm up | `05-wrong-revolved-chair-intermediate.png` | ADOPT | verified by viewing the screenshot. Hand off to the animation agent. Fixing this is a separate task, so I did not implement it |
| A2 | visual | high | Supine Twist: knees are bent, but the drop to one side is not shown | `05-wrong-supine-twist-intermediate.png` | ADOPT | verified by viewing |
| A3 | visual | high | Cobbler: one leg straight and one bent, not soles together with knees out | `05-wrong-cobbler-intermediate.png` | ADOPT | verified by viewing |
| A4 | visual | med | Seated Twist: no visible twist | `05-wrong-seated-twist-intermediate.png` | ADOPT | reviewer finding; I did not view this one. The screenshot exists |
| A5 | visual | med | Boat Advanced: arm up and diagonal legs, not a V-sit. Weak but recognizable: Camel, Tabletop Beginner, Half-lift Beginner, Downward Dog (levels nearly identical), Warrior I vs High Lunge, Tree Beginner (foot hidden) | `05-wrong-boat-intermediate.png`, `03-poses-e.png`, `03-poses-a.png` | ADOPT | reviewer judgement. Contact sheets are in `03-poses-a.png` to `03-poses-f.png`. Treat as input to the animation agent, not as a verified fact |
| L1 | content | low | HE: "ארבע שכובה" is an unnatural name. "תנוחות להימנע מהן" should read "שכדאי להימנע מהן". Plural and singular forms are mixed | `10c-ru-library.png`, `07a-generator.png` (HE strings come from page text) | ADOPT | suggestions only. The reviewer is not a native judge, so a native check is needed before changing any string |
| L2 | content | low | RU: "Воин один/два/три" (spelled-out numerals), "воином один", capitalised "Вашем", and "Лёжа, рука к стопе" | `10d-ru-pose.png`, `10b-ru-home-full.png` | ADOPT | suggestions only, native check needed. The risk is small if "Воин I/II/III" is used |

## 4. Counts

Final: **total 24 rows (17 reviewer items + A1-A5 animation + L1-L2 text), ADOPT 19, REJECT 5 (#3, #13, #14, #15, #17).** Of the 19 ADOPTs, verified by me: #1, #2, #4, #5, #6 (with synthetic-drag caveat), #9, #10, #11, #12, #16, A1, A2, A3. Reviewer-only and unverified by me: #7 (partly), #8, A4, A5, L1, L2.

## 5. ADOPT priority list

1. #1 Mobile plan builder layout at 375px (high, verified)
2. #2 Log actual elapsed time and require a minimum completion for streaks (high, verified)
3. A1, A2, A3 Revolved Chair, Supine Twist and Cobbler animations (high, verified, animation agent)
4. #16 Pose page starts from the wrong shape (med, verified)
5. #4 Audit the `sided` flags, because symmetric poses are marked "one side" (med, verified)
6. #5 Make the first-time Beginner plan gentler (med, verified)
7. #6 Drag-up reorder off by one (med, verified synthetically)
8. A4, A5 Seated Twist, Boat and the weaker poses
9. #7 Save indicator, #8 hold limits
10. #9 plural, #10 duplicated "Day 1", #11 select labels, #12 truncated select
11. L1, L2 Hebrew and Russian wording, only after a native check

---

## Round 2 — Astra (Sol) on agent-captured screenshots

**Capture:** 74 files in `review/round2/` (git-ignored; 1280px and 375px, HE/RU/EN), log in `review/round2/steps.md`, DOM text in `review/round2/dom-snapshots.md`, Sol's raw answer in `review/round2/sol-answer.md`. Captured on the live site after the Step-0 label revert (commit 1bc0e47).

**Lane and command (what actually worked):**
- Lane: `cxnative`, model `gpt-5.6-sol` (ChatGPT/Codex plan, $0 cash), headless, via outsourcerer 0.15.3, read-only (no yolo, no permission or codex-config changes).
- Image attachments FAILED: `outsourcerer.sh run -m sol --provider codex --cloud-ack "Look at the image file ...png"` -> Sol: "image-viewing tool returned: code-mode host is disabled". The wrapper has no image-attach flag.
- File reading FAILED too (first text attempt: Sol could not read steps.md, "code-mode host is disabled").
- Working fallback (steps.md + DOM text snapshot per screen, all INLINED in the prompt): `outsourcerer.sh bg run -m sol --provider codex --cloud-ack "$(cat /tmp/r2prompt2.txt)"` (prompt = yoga-teacher + UX-reviewer role, numbered feedback with screenshot/severity/fix, "go-to app" question, then steps.md and dom-snapshots.md inline; ~27 KB). Plain `run` (tmux auto-detach) rejected the long prompt ("command too long"), so `bg` was used.
- Caveat: Sol reviewed TEXT PROXIES, not pixels (it says so itself). Screenshot citations are by filename from the log. Animation comments are inferred from joint-angle source, not from watching the animation.

**Verified by me on the live site:** the player finish screen is blank (item 1). I reproduced it with a window error listener: `Uncaught ReferenceError: nCount is not defined @ js/player.js:240`. `nCount` is used in `finish()` but never imported in player.js; introduced by commit 9251b2f (round-1 plural fix). Every completed practice in every language ends on an empty page, and tests (3049 passing) do not cover finish(). Not fixed here (scope was Step 0 only).

| # | Type | Sev | Summary | Evidence | Decision | Reason |
|---|------|-----|---------|----------|----------|--------|
| 1 | UX/bug | Critical | Finish screen blank: `nCount` undefined in player.js:240 | 36-player-finish-he-1280.png | ADOPT | Reproduced live (error captured). Import nCount, add an end-of-practice test in he/ru/en |
| 2 | UX | High->Low | "20 min" shown as exact though breath-counted poses vary | 21-generated-plan-he-1280-full.png | ADOPT (low) | Valid, cheap: show "about" / range for plans with breath items |
| 3 | Pedagogy | High | Mountain -> Half Lift needs a forward fold first | 21-generated-plan-he-1280-full.png | REJECT | Half lift is entered by hinging from standing; order mountain, half lift, fold is a normal flow |
| 4 | Pedagogy | High | Tabletop and Cat 12 breaths each; Cat without Cow | 21-generated-plan-he-1280-full.png | ADOPT | Reproduced (tabletop:12, cat:12 breaths in generated plan; Cow exists in library). Use a few Cat-Cow cycles |
| 5 | Pedagogy | High | 60 s holds (cobra, fold, lunge, cobbler, seated fold) too long for unassessed beginner | 21-generated-plan-he-1280-full.png | ADOPT | Reproduced (mountain..seated-fold all 60 sec). Shorten beginner holds to ~20-30 s, cobra shortest. Also covers #8 |
| 6 | Pedagogy | High | Cobra 60 s then Bridge, no neutralizing pause | 21-generated-plan-he-1280-full.png | REJECT | Duplicate of #5 (fixed by shorter holds); child pose already follows within 2 poses |
| 7 | Pedagogy | Medium | Low Lunge (kneeling) after supine Bridge: awkward transition | 21-generated-plan-he-1280-full.png | ADOPT | Reproduced (bridge, then low-lunge, then child). Move lunge next to tabletop/cat or standing block |
| 8 | Pedagogy | Medium | Cobbler and 60 s seated fold intense for stiff beginners | 21-generated-plan-he-1280-full.png | REJECT | Duplicate of #5 (holds); easier options already shown on each pose page |
| 9 | Content | High | "Do not let the knee pass the ankle" is too absolute | 10-pose-warrior-2-L1-hold-1280.png | REJECT | Standard beginner Warrior II safety cue; keeping it |
| 10 | Content | Medium | Seated twist: "turn comes from the chest", "disc issues" too broad | 10-pose-seated-twist-L1-hold-1280.png | REJECT | Cue is conventional; safety note already says twist gently, never force |
| 11 | Content | High->Low | Bridge: blanket under shoulders needs "head stays on floor" | 10-pose-bridge-L1-hold-1280.png | ADOPT (low) | Safety line already says do not turn the head; append "head stays on the floor, neck relaxed" |
| 12 | Animation | High | Warrior II L2 lead-leg geometry, no foot/knee tracking | 10-pose-warrior-2-L2-hold-1280.png | REJECT | Stick figure is a single side/front silhouette; feet/knee-tracking not representable. Not reproducible as a visible defect |
| 13 | Animation | Medium | Generic interpolation on entry, stage the steps | 11-pose-warrior-2-L1-mid-1280.png | REJECT | Speculative; mid frame looks fine; out of scope |
| 14 | Animation | High->Low | Bridge L2 text says hands clasped, figure cannot show it | 10-pose-bridge-L2-hold-1280.png | FIXED in bf01784 (was ADOPT (low)) | Confirmed in screenshot: no visible clasp. Reword the L2 text or draw the arms |
| 15 | Animation | Medium | Bridge should lift vertebra by vertebra | 11-pose-bridge-L1-mid-1280.png | REJECT | Over-engineering for the figure rig; cue text already says it |
| 16 | Animation | Medium | Seated-twist L2 is just deeper rotation (range chasing) | 10-pose-seated-twist-L2-hold-1280.png | REJECT | L2 is the knee-hug variation, depth is optional per safety note |
| 17 | UX | Medium | 3 s side-change countdown too short | 33-player-side-switch-getready-he-1280.png | REJECT | Does not reproduce at defaults: my capture set transition to 3 s; default is 5 s and configurable in settings |
| 18 | UX | Medium->Low | Player counts "2/4" while plan says 3 poses (sides counted) | 31-player-mountain-hold-he-1280.png | FIXED in bf01784 (was ADOPT (low)) | Reproduced (plan 3 poses, player /4, sides labelled "first side"). Show "pose 2 of 3" or add "side" wording |
| 19 | UX | Medium | Paused state should make Resume primary | 35-player-paused-he-1280.png | REJECT | Screenshot shows the primary green button already becomes "Resume" (המשך) |
| 20 | Content | Medium | English page shows Hebrew saved-plan names | 10-pose-warrior-2-L1-hold-1280.png | REJECT | Plan names are user data created while HE was active, not a bug |
| 21 | Visual | Medium | Home long, one "start here" path | 01-home-he-1280-full.png | REJECT | Subjective; first-time button is already the top primary action |
| 22 | Visual | Medium | Group 15-pose plan into sections on mobile | 53-generated-plan-he-375.png | REJECT | Feature request, out of scope for polish round |
| 23 | Visual | Low | Library filters crowd mobile | 54-library-he-375.png | REJECT | 375px layout has no overflow (scrollWidth = 375); subjective |
| 24 | UX | Medium->Low | Empty library result has no recovery action | 05-library-empty-he-1280.png | FIXED in bf01784 (was ADOPT (low)) | Confirmed: only "no poses found" text. Add a "clear filters" button |
| 25 | Content | Low | Home blurb "before your coffee" vs practical notes | 40-home-en-1280-full.png | REJECT | Tone choice; safety/prop info is on pose pages and footer |

**Counts:** 25 total, 9 ADOPT (1 critical, 3 pedagogy/content medium-high, 5 low), 16 REJECT.

**Ranked ADOPT list:** 1 (finish screen crash, critical) > 5 (shorter beginner holds) > 4 (Cat-Cow cycles instead of 12-breath Cat) > 7 (lunge placement) > 11 (bridge head-on-floor cue) > 14 (bridge L2 text/figure mismatch) > 2 ("about 20 min") > 18 (pose vs side counter) > 24 (empty-state clear filters).

**Sol on "what makes this the go-to beginner app":** short onboarding (limits, pregnancy, injuries, props, session length); truly progressive first sessions with counter-poses and reliable final rest; transition coaching with a "ready" confirmation for side changes; animations that model movement paths and landmarks, not only end silhouettes; persistent beginner controls (easier, safe skip, more setup time, stop and rest); a 7-day path that remembers completion and explains what each day adds; fully consistent he/ru/en including generated names, voice, plurals; a dependable finish with effort check-in and next-session suggestion. (Items such as onboarding/progress tracking are feature ideas, not adopted this round.)

**Round 2 fix status:** all 9 ADOPT items FIXED in bf01784 (live-verified: smoke test he/ru/en at 1280 and 375, finish screen renders, no page errors; generated beginner 20-min plan = 20.00 min, holds 15-30 s, 3 Cat-Cow cycles, body-position order). Regression net: finishStats test, static import check, tools/smoke.sh. Note: lunge placement (#7) is solved by position sequencing (standing, kneeling, seated, prone, supine, savasana).


## Round 3 — figure quality (Sol + own visual pass)

**Method and lane.** Live site, cache-buster `?x=random`, agent-browser session `r3fig`. Captures in `review/round3/` (git-ignored): `sheet-L0.png`, `sheet-L1.png`, `sheet-L2.png` (dev/sheet.html, all 37 poses, 7 columns), `pose-<id>-<2d|3d>-<1280|375>.png` for 10 poses (warrior-2, downward-dog, tree, seated-twist, bridge, camel, child, savasana, uttanasana, revolved-chair), `player-3d-375-a.png` / `player-3d-375-b.png`.
Sol: `outsourcerer.sh bg run -m sol --provider codex --cloud-ack` (cxnative, gpt-5.6-sol), no yolo. **Image attachment was tried and failed**: Sol answered "IMAGES: not viewed" (the host rejects file and image tools); it could not read the specs file either. So Sol never saw a screenshot. Pass 1 (`sol-prompt.txt` / `sol-answer.txt`): text observations and file paths only; its numbers were generic ideal ranges, not deltas, so I did not trust them. Pass 2 (`sol-prompt2.txt` / `sol-answer2.txt`): the full spec dump inlined (`specs-dump.txt`: non-zero joints of all 37 poses x 3 levels, hold frames only, `alt` frames omitted) plus my text description of each screenshot; Sol answered with "current -> new" deltas computed from the real values. Numbers below come from pass 2 unless noted. Sol's judgements are therefore spec- and description-based, not a visual review; the visual verdicts are mine (I opened the 3 sheets, the 3D/2D pose shots and the 2 player shots). Numeric fixes are suggestions to be checked in tuner.html; none were applied.

| # | Pose / area | Issue | Evidence | Suggested numeric fix (spec degrees) | Verdict | Reason |
|---|---|---|---|---|---|---|
| 1 | camel L1/L2 | Hands hang straight down 3-4 cm in front of and above the heels, never reach them. Confirmed. Torso almost vertical (spine -7..-11 per segment) | review/round3/pose-camel-3d-1280.png, review/round3/pose-camel-2d-1280.png | L1: spine1/2/3 z -7.3 -> -12, neck/head z -11 -> -6, shoulderR/L z -37.5 -> -78, elbow z -1.7 -> 0..8, hip z 4 -> 0. L2: spine -11.3 -> -15, neck/head -13 -> -7, shoulder -48.6 -> -85, elbow -> 8. L0 (hands on sacrum) is fine | ADOPT | Reproduced; Sol and I agree; cue says hands to heels. Tune shoulder in tuner until fingertips touch heels |
| 2 | uttanasana L1/L2 | Head not readable: only hair visible between shins and hands. Confirmed. Spec has neck/head z = 0 while spine is 11.7 per segment | review/round3/pose-uttanasana-3d-1280.png, review/round3/pose-uttanasana-2d-375.png | L1 neck/head z 0 -> 8; L2 0 -> 6 (L0 already 5). Optional camera az 28 -> 18 (Sol, unverified) | ADOPT | Relaxed hanging head is correct form and makes the face visible |
| 3 | half-split L2 | Bent arms bunch up at the front foot, hands unreadable. Confirmed | review/round3/sheet-L2.png | shoulderR/L z 79.2 -> 45, elbowR/L z 107 -> 25, wristR/L z 0 -> 70 so palms land beside the leg | ADOPT | Reproduced; arms should be long, hands apart |
| 4 | seated-twist | Left hand floats by the hip, no support. L0/L1/L2 identical except that arm. Chest turn reads weak from az 60 | review/round3/pose-seated-twist-3d-1280.png, review/round3/sheet-L1.png | L1/L2 shoulderL [-0.1,-0.4,-12.9] -> [18,-12,-20], elbowL 66 -> 95 (hand to floor or knee). Optionally spine1/2/3 y 18/28/30 -> 15/20/22, neck/head y 16/10 -> 8/6 | ADOPT | Floating hand confirmed; hand numbers need tuner verification; different twist depth per level is a follow-up |
| 5 | revolved-chair | Camera az 80 shows the thighs end-on, knees merge into a blob, prayer hands tiny. Confirmed | review/round3/pose-revolved-chair-3d-1280.png | per-pose camera az 80 -> 55; head y 23.3/26/28.7 -> 12/14/16. Keep thigh angles | ADOPT | One-line camera change; do not change thigh form to suit the camera |
| 6 | bridge L0/L1/L2 | Near identical: pelvis rot -124 and hipR/L z -35 at all levels, only knee 96/88/80 and ankle differ. Confirmed | review/round3/pose-bridge-3d-1280.png, review/round3/sheet-L0.png, review/round3/sheet-L1.png, review/round3/sheet-L2.png | hipR/L z -35 -> -22 / -32 / -45; knee z 96/88/80 -> 102/92/82; shoulder z -58.5/-57.7/-56.2 -> -45/-58/-68. Do NOT use pelvis.pos[1]: the figure is auto-dropped to the floor, which cancels it | ADOPT | Levels should differ visibly; re-check feet on floor and knees over ankles in tuner |
| 7 | hand-to-toe | Lifted foot fully pointed (ankleR z -65/-77/-90); correct form is flexed, especially with a strap | review/round3/sheet-L1.png | ankleR z -65/-77/-90 -> +5/+5/+8 | ADOPT | README: ankle -z = point. Within LIMITS (-95..35) |
| 8 | 3D strap thin | Not captured in 3D (no 3D hand-to-toe screenshot); only the 2D strap on the sheet, which looks fine | review/round3/sheet-L1.png | 3D tube so apparent width is 3-5 px at 375 (about 1.0-1.5 cm in rig units; figure3d.js strap code) | ADOPT (low) | Reported by team, plausible, unverified by me; check in 3D after the change |
| 9 | dancer L1/L2 | Lifted-foot knee flexion shrinks with depth (kneeL z 140 / 80 / 75), heel moves away from the seat | review/round3/sheet-L1.png, review/round3/sheet-L2.png | kneeL z L1 80 -> 110, L2 75 -> 130; shoulderR z L1 -21.1 -> -35, L2 -34.7 -> -50; elbowR z 98.6 -> 110 / 58.1 -> 95 | ADOPT | Visible in the sheets (shin near horizontal), Sol numbers coherent |
| 10 | half-lift L2 | Reads as a low fold with hands on floor, not a half lift (pelvis rot 120, hip 120.8, shoulder 97.6) | review/round3/sheet-L2.png | pelvis rot 120 -> 100, hipR/L z 120.8 -> 101, spine z -5 -> 0, shoulder z 97.6 -> 40, elbow z 2 -> 35 | ADOPT (low) | Matches the sheet; check the L2 cue text still fits |
| 11 | figure-four L0 | Crossed foot fully pointed (ankleL z -95); cue is a flexed foot to protect the knee | review/round3/sheet-L0.png | ankleL z -95 -> +5. Sol also suggests hipL x/y 0 -> 35/40; not verified | ADOPT (low) | Ankle only; leave hip rotation to the tuner |
| 12 | look: ball joints, stacked-bead torso | Visible spheres at shoulders/elbows/hips; chest, belly, pelvis read as separate ellipsoids; wooden-mannequin look. Confirmed | review/round3/pose-tree-3d-1280.png, review/round3/pose-warrior-2-3d-1280.png | Bury joint sphere radii 55-70% inside adjacent tapered capsules; overlap torso segments by 8-12% of segment length; limb taper upper arm:forearm:wrist 1.00:0.78:0.55 | ADOPT | Biggest single "more human" gain |
| 13 | framing of low and lying poses | child, savasana, seated-fold fill only about 25% of stage height | review/round3/pose-child-3d-1280.png, review/round3/pose-savasana-3d-1280.png | per-pose fit on max(width/height) so the figure fills >= 60% of the shorter stage side; allow 4% crop at extremities | ADOPT (low) | Low poses are small. "Wide poses too small" REJECTED as stated: warrior-2 is fine (pose-warrior-2-3d-375.png) |
| 14 | motion easing | Generic 2.8 s ease; not judged by me (static capture) | review/round3/player-3d-375-b.png | 0.35 s anticipation + 2.0 s move + 0.4 s settle, cubic-bezier(0.4,0,0.2,1); distal joints lag 60-100 ms, head 80-140 ms | ADOPT (low) | Cheap polish but unseen; verify with a recorded clip |
| 15 | hands and feet shape | At 1280 hands read as tapered blobs, fingers merged; feet have no arch | review/round3/pose-warrior-2-3d-1280.png, review/round3/pose-tree-3d-1280.png | palm wedge + thumb + grouped fingers, curl 8-18 deg; heel pad, arch, toe wedge (toes 8-12% of foot length) | ADOPT (low) | Visible at 1280 |
| 16 | face detail (brows, mouth, nostrils) | Sol suggestion | review/round3/pose-tree-3d-1280.png | n/a | REJECT | Face is about 25 px at 1280; extra detail is invisible and risks the uncanny look |
| 17 | proportions (7.25-7.5 heads, hands 10.5%) | Sol's numbers are generic; Sol saw no image | review/round3/pose-warrior-2-3d-1280.png | n/a | REJECT | Looks adult-proportioned in the screenshots; not measured. Revisit if row 12 changes limb thickness |
| 18 | floating contacts (tabletop, plank, child, half-lift, low-lunge) | Not visible at contact-sheet scale; no zoomed shots taken | review/round3/sheet-L1.png | n/a | REJECT | Not reproduced; ask for a zoomed capture if someone still sees a gap |
| 19 | shadow orientation | 3D shows a soft blob under the body on every pose, nothing misoriented | review/round3/pose-warrior-2-3d-1280.png | n/a | REJECT | Not reproducible |
| 20 | cat-cow "cow only, no cat" (Sol) | Sol saw only the hold frame; specs have an `alt` frame (cat) at all levels | review/round3/sheet-L1.png | n/a | REJECT | Sol's input omitted `alt`; false positive |
| 21 | savasana L0, knees-to-chest L0, mountain L2, upward-salute L2 (Sol) | Bent knees, one-leg hug, tiptoes are deliberate easier/deeper variants | review/round3/sheet-L0.png, review/round3/sheet-L2.png | n/a | REJECT | Intentional variants |
| 22 | locust L2 arms, warrior-2 neck/head, warrior-1 rear leg, seated-fold L0 elbow -5, downward-dog ankle (Sol) | Sol retunes | review/round3/sheet-L2.png, review/round3/pose-warrior-2-3d-1280.png | n/a | REJECT | Arms-forward locust is standard; neck turn looks at the front hand and is in range; elbow -5 is inside LIMITS; dog ankle compensates leg tilt; warrior-1 not visibly wrong |
| 23 | Sol minor retunes: chair L2, high-lunge L2, plank L0/L2, cobra L1/L2, boat L2, warrior-3 L0/L2, mountain L0 | Small nudges from specs only | review/round3/sheet-L2.png | n/a | REJECT | Not visible in the sheets; defer to a tuner pass |
| 24 | Sol pass 1 generic ranges (all poses) | Based on no spec values | review/round3/sheet-L1.png | n/a | REJECT | Superseded by pass 2 |

**Counts:** 24 rows: 15 ADOPT (6 marked low), 9 REJECT. Known-issue checklist: confirmed 8 (camel, uttanasana, half-split, seated-twist, revolved-chair, bridge, ball-joint look, pointed foot); partly confirmed 1 (low poses small in 3D); unverified 2 (floating contacts, 3D strap); refuted 2 (shadow orientation, wide poses small).

**Ranked ADOPT list:**
1. Camel: spine -7.3 -> -12, shoulder -37.5 -> -78, neck -11 -> -6 (L2 -15 / -85 / -7) so hands reach heels (#1).
2. Ball joints and bead torso: overlapping tapered capsules, bury spheres 55-70% (#12).
3. Bridge levels: hip z -22 / -32 / -45, knee 102 / 92 / 82 (#6).
4. Seated twist: left hand to floor, shoulderL -> [18,-12,-20], elbowL 95 (#4).
5. Uttanasana: neck/head z 0 -> 8 (L1), 6 (L2) (#2).
6. Hand-to-toe and figure-four feet: ankle -65..-95 -> +5 (#7, #11).
7. Revolved-chair camera az 80 -> 55 (#5).
8. Half-split L2: shoulder 79 -> 45, elbow 107 -> 25, wrist -> 70 (#3).
9. Dancer depth: kneeL 80/75 -> 110/130 (#9).
10. Half-lift L2: pelvis 120 -> 100, shoulder 97.6 -> 40 (#10).
11. Low-pose framing (#13), strap thickness (#8), hands/feet shape (#15), easing (#14).

**Top 3 "more human and pleasant":** (1) hide the ball joints and blend the torso into tapered, overlapping limb capsules (row 12); (2) real hand and foot shapes (row 15) plus better frame fill for low poses (row 13); (3) softer motion with anticipation, settle and distal lag (row 14).

**Round 3 fix status (commit 228999a, worktree-yoga-narration-v2):**

| # | Item | Status | Final numbers / note |
|---|---|---|---|
| 1 | Camel reach | FIXED (adjusted) | LIMITS widened: shoulder z min -70 -> -100, spine3 z min -25 -> -32 (suggested values violated them). Optimizer-tuned per level so palms land at the heels; hips within about 4 units of the knees. Sheet: screenshots/round3-fix-after-sheet-L1.png |
| 2 | Ball joints / bead torso | FIXED (2D + 3D) | 2D: no per-prim outlines, per-limb linear gradient across the limb axis (cylindrical shading), outline kept only on head parts. Rig: delt now skin sphere r 5.2 buried in uarm r 5.4; limb radii continuous (thigh 9.4 -> 7.0, shank 7.0 -> 4.6, uarm 5.4 -> 4.5, farm 4.5 -> 3.2). 3D uses the same prims. |
| 3 | Bridge levels | FIXED (adjusted) | Suggested numbers left the feet floating; optimizer-derived hip/knee/ankle/shoulder per level, feet and hands on the floor |
| 4 | Seated-twist hand | FIXED | shoulderL/elbowL re-solved so the left hand rests on the floor (L1/L2) |
| 5 | Uttanasana head | FIXED (numbers); head still partly hidden behind the legs from az 28 | neck/head z 8 (L1), 6 (L2) |
| 6 | Pointed lifted feet | FIXED | hand-to-toe, figure-four ankle flexed; audit also fixed dancer, warrior-3, plank, boat, supine-twist, legs-up-wall |
| 7 | Revolved-chair | FIXED | camera az 55, head y 12/14/16 |
| 8 | Half-split L2 | FIXED | shoulder 45, elbow 25, wrist 70 |
| 9 | Dancer | FIXED | kneeL z 110/130, shoulderR -35/-50 |
| 10 | Half-lift L2 | FIXED | pelvis rot 100, hip 101, shoulder 40, elbow 35 |
| 11a | Low-pose framing | FIXED | 2D maxScale 1.45 -> 2.1: all 111 pose/levels fill >= 60% of the stage (lowest: seated-fold 0.63); view eases from the standing-start framing to the hold framing so nothing clips; 3D fit radius floor 112 -> 80 |
| 11b | 3D strap | FIXED | radius now scales with the view so the strap is about 4 px wide, clamp 1.0-2.4 units |
| 11c | Motion easing | FIXED | cubic-bezier(0.4,0,0.2,1) + 3% anticipation + 2.5% settle; joint lag head 110 ms, wrist 90 ms, elbow 70 ms, knee 25 ms (default 2.8 s entry). Clip: screenshots/round3-fix-easing-warrior-2.gif, screenshots/round3-fix-easing-child.gif |
| 11d | Shaped hands and feet | NOT DONE | out of time; hands/feet remain ellipsoid wedges |
| 18 | Floating contacts | FIXED + TESTED | tests/run.mjs asserts contact <= 2 units for tabletop (hands, toes), cow, cat-cow, plank, downward-dog (hands), child (toes) at all levels. Tabletop/child toes were 8.1/5.0 above the floor, now 0. Plank L0 2.23 -> 0.04. Cobra L1/L2 hands stay 3.7-3.8 above (hand flatness would break); low-lunge L0 hands rest on a 22-unit block by design. |
