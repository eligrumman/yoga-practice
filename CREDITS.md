# Credits

## Code, text and artwork
All code, pose data (joint-angle keyframes), cues, safety notes, Hebrew / Russian / English texts, the SVG figure and the animations are original work written for this project and released under the MIT license (see LICENSE).

## Third-party code, fonts, data
- three.js r160 (MIT, https://github.com/mrdoob/three.js), loaded at runtime only for the optional 3D view from a pinned URL, `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` (`THREE_URL` in `js/figure3d.js`). Nothing is copied into the repo. If it fails to load, or WebGL is missing, the site falls back to the 2D SVG figure. No other libraries, no web fonts (system fonts only), no analytics.
- The 2D figure uses well-known character-animation techniques (layered capsule limbs, follow-through, overlapping action, breathing, squash and soft shading), inspired by the open anidoodle project (Apache-2.0, https://github.com/alexgreensh/anidoodle) is not vendored; no anidoodle code, assets or text are included). The implementation in `js/rig.js`, `js/figure2d.js` and `js/figure3d.js` is original. Because nothing from it is vendored, no Apache-2.0 LICENSE or NOTICE file is shipped.

- The optional `?style=ink` figure style (dark ink contour plus flat cel shading, `js/inkstyle.js`) was inspired by the "marker" style of anidoodle (Apache-2.0, https://github.com/alexgreensh/anidoodle); the implementation is original and nothing is copied from it.

## Voice narration
Spoken guidance (he/ru/en) is synthesized with the Gemini API (model gemini-3.8-flash-lite-tts, voices Vindemiatrix / Achernar) and published as `audio/<lang>/<id>.mp3`.
Terms: Gemini API Additional Terms of Service (https://ai.google.dev/gemini-api/terms, redirects to https://aistudio.google.com/docs/terms; effective 2026-03-23). Summary: Google "won't claim ownership" over generated content; the user is responsible for its use and for how others use it; Google may generate similar output for others. No attribution is required by the terms themselves (only where law requires it for citation metadata, not applicable to TTS). Restrictions: do not use the service to build competing models, do not reverse engineer it, and do not use it for medical advice or clinical practice (the narration is general wellness guidance, not medical advice). Publishing the audio on this site is permitted.
