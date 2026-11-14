# Pose specs

`poses/<id>.json` is the single source of truth for how a pose looks and moves. The 2D (SVG) figure, the 3D (three.js) figure, the library, the player, the thumbnails and the tuner all draw from these files. Names, cues and safety text are not here; they live in `data/p-*.js`.

`poses/index.json` lists the ids. `tools/migrate-poses.mjs` produced the first version of every file from the old planar keyframes (plus `tools/migrate/patches.mjs` for hand-built poses). That tool is historical: the JSON is now the source, and re-running the migration would overwrite later hand edits. Edit the JSON (or use the tuner) instead.

## Format

```json
{
  "id": "bridge",
  "format": 1,
  "camera": {"az":28,"el":6},
  "start": { "pelvis": {"pos":[0,0,0],"rot":[0,0,-90]}, "spine1":[0,0,0], ... },
  "levels": [
    { "level": 0, "camera": {"az":60,"el":10},
      "hold": { ...full frame... },
      "alt":  { "spine1":[0,0,20] },
      "props": [ {"type":"block","arms":["R","L"],"h":22} ] }
  ]
}
```

* `start`: the full frame the pose is entered from (shared by all levels).
* `levels[i].hold`: the full frame held at level i (0 easy, 1 medium, 2 deep).
* `levels[i].alt` (optional): a partial frame. Only the joints listed replace the hold frame. Used for the second half of a flow (cat-cow). The animation goes start, hold, alt, hold.
* `levels[i].seq` (optional): an ordered multi-step flow, `[{name, frame, dur, breath}, ...]`. Frames use the full hold-frame schema; `dur` is seconds at 1× and the sum is the round length. The sequence interpolates smoothly and loops. A plan's default hold unit represents one complete round. Reduced-motion displays the first frame.
* `levels[i].props` (optional): `{"type":"strap","arm":"R","leg":"R"}`, `{"type":"block","arms":["R","L"],"h":22}`, `{"type":"cushion","h":10}`, `{"type":"wall"}`. Sides are `R`/`L`.
* `camera` (top level, and optionally per level): `az` is the horizontal angle (90 = looking at the front, about 28 = a 3/4 view, 0 = from the side), `el` is the elevation in degrees. The 2D view is an orthographic projection with this camera; the 3D view starts at this camera and can then be orbited.

A **frame** has `pelvis` and 17 joints. Every joint is `[x, y, z]` in degrees:

| key | meaning |
| --- | --- |
| `pelvis.pos` | `[x, y, z]` offset in cm from the standing position. `pos[1]` lifts the whole body (a cushion under the hips, for example). |
| `pelvis.rot` | whole-body rotation. Standing = `[0,0,0]`. Lying on the back = `[0,0,-90]` (head toward -x). |
| `spine1`, `spine2`, `spine3`, `neck`, `head` | `x` side-bend, `y` twist, `z` forward bend (+) / back bend (-) |
| `shoulderR/L` | `z` raises the arm forward and up, `x` raises to the side, `y` rotates the arm |
| `elbowR/L` | `z` bends (0 straight, 150 fully bent) |
| `wristR/L` | `z` flexes, `x`/`y` deviate and rotate |
| `hipR/L` | `z` lifts the thigh forward (+) or back (-), `x` opens it out to the side, `y` rotates it |
| `kneeR/L` | `z` bends (0 straight, 155 fully bent) |
| `ankleR/L` | `z` points the foot (-) or flexes it (+) |

World frame: x is the direction the figure faces, y is up, z points toward the default camera. The figure's right side is +z. The floor is y = 0: the whole figure is dropped so its lowest point touches the floor. Use `pelvis.pos[1]` for the lift of a pose that sits on a prop.

Every joint axis has a range (see `LIMITS` in `js/rig.js`); values outside it fail the tests. Numbers are written with one decimal.

## How to tweak a pose

1. Open `tuner.html` (it is not linked from the app; add `?p=<id>&l=<level>` to open a pose). Pick the pose, level and which frame to edit (hold, start, alt).
2. Move the sliders (one per joint axis). The preview updates live. Choose 2D or 3D with the toggle in the preview; drag in 3D to look from any side. The "entry -> hold" slider scrubs the motion between start and hold.
3. `az` / `el` sliders set the pose's default camera.
4. Press Copy JSON (or Download JSON) and replace `poses/<id>.json` with it. The format is identical to the file on disk, one joint per line, so the diff shows exactly what changed.
5. Run `node tests/run.mjs`. It validates every spec (ranges, shapes, left/right and props), checks that feet and hands that should touch the floor do, and that the 2D and 3D views use the same frames.

You can also edit the numbers by hand in the JSON. Look at the contact sheet (`dev/sheet.html?p=<id>&l=0`, served over http) to check all levels of a pose at once.
