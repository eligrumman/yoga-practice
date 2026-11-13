// Standalone pilot page: draws OUR poses (fitted to anidoodle's skeleton, see fit.ts) with anidoodle's
// human mannequin and its marker-comic / storybook hands. Loads nothing from the site.
// Contains code imported from anidoodle (Apache-2.0, (c) 2026 Alex Greenshpun); see ./NOTICE.
import { Gfx, PENCIL } from "@ani/core";
import { camera, lensPx } from "@ani/character/math3";
import { CANON } from "@ani/character/human/canon";
import { ADULT_BODY } from "@ani/character/human/mannequin";
import { ADULT_HEAD } from "@ani/character/human/head";
import { type FigureSpec, assemble, build } from "@ani/character/human/figure";
import { renderMarker } from "@ani/character/render/marker";
import { renderStorybook } from "@ani/character/render/storybook";
import type { Pose } from "@ani/character/types";
import fitted from "../fitted.json";
import targets from "../targets.json";

const SPEC: FigureSpec = {
  canon: CANON.adult, height: 1.7, body: ADULT_BODY, head: ADULT_HEAD,
  roles: { skin: "skin", torso: "top", hips: "pants", upperArm: "skin", thigh: "pants", shin: "pants", foot: "skin" },
};
const pal = (hex: Record<string, [string, string]>) => Object.fromEntries(Object.entries(hex).map(([k, [base, shade]]) => [k, { base, shade }]));
const COMMON = { skin: ["#f1c4a2", "#d79a76"], top: ["#2f7d78", "#1f5753"], pants: ["#46407a", "#2d2956"], nail: ["#f7d9c4", "#e8b99c"], hair: ["#4a3328", "#2d1d15"], white: ["#ffffff", "#dfe6ee"], pupil: ["#222", "#222"], blush: ["#ee8a8f", "#d46a70"], mouth: ["#8a3a3a", "#6b2929"], lip: ["#e08a8d", "#c26a70"], brow: ["#3a2a22", "#3a2a22"] } as Record<string, [string, string]>;
const PAL = pal(COMMON);

const W = 640, H = 640;
const mkEnv = (scale: number) => ({
  W, H, scale, cache: new Map<string, unknown>(),
  canvas: (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return { canvas: c, ctx: c.getContext("2d")! }; },
});

export function drawPose(cv: HTMLCanvasElement, id: string, hand: "marker" | "storybook", scale = 1) {
  cv.width = W * scale; cv.height = H * scale;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#f6f1e7"; ctx.fillRect(0, 0, cv.width, cv.height);
  const pose = (fitted as any)[id].pose as Pose, cam0 = (targets as any)[id].camera as { az: number; el: number };
  // our camera (az 90 = looking at the front, 0 = from the side) -> theirs
  const a = (cam0.az * Math.PI) / 180, e = (cam0.el * Math.PI) / 180;
  const dir: [number, number, number] = [-Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)];
  const dist = 9, tgt: [number, number, number] = [0, 0.95, 0];
  const eye: [number, number, number] = [tgt[0] + dir[0] * dist, tgt[1] + dir[1] * dist, tgt[2] + dir[2] * dist];
  const span = 2.3; // metres shown top to bottom
  const cam = camera(eye, tgt, (H / span) * dist * (1 - 0) , W / 2, H / 2);
  const built = build(SPEC, pose, cam);
  const scene = assemble(cam, built, pose, { line: "line", pupil: "pupil", white: "white", blush: "blush", brow: "brow", mouth: "mouth", lip: "lip" });
  const g = new Gfx(ctx as any, mkEnv(scale) as any, 0, PENCIL);
  if (hand === "marker") renderMarker(g, scene, PAL as any);
  else renderStorybook(g, scene, PAL as any);
}
(window as any).drawPose = drawPose;
