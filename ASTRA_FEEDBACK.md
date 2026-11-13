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
