// "Anything we should know?" answers: which poses the generator leaves out, and which pose pages get a gentle personal note.
// Pure data and functions (no DOM). The answers stay on this device (store.health); they are never exported or sent anywhere.
export const HEALTH_FLAGS = ['knees', 'wrists', 'back', 'neck', 'pressure', 'pregnancy'];

// Poses a generated plan leaves out for each answer, plus the generator's own gate tokens (see generator.js).
// hard = never generated. soft = left out too, unless the remaining poses cannot fill the chosen length (then only the soft ones come back,
// and the pose page still carries the personal note). Plan lengths and holds are never changed.
export const HEALTH_HARD = {
  knees: ['high-lunge', 'low-lunge', 'chair', 'revolved-chair', 'warrior-flow', 'knee-avoid'],
  wrists: ['plank', 'downward-dog', 'crow', 'tabletop', 'cat', 'cow', 'cat-cow', 'sun-salutation-a', 'warrior-flow', 'wrist-avoid'],
  back: ['boat', 'camel', 'locust', 'cobra', 'revolved-chair'],
  neck: ['camel', 'bridge', 'locust', 'cobra', 'plank', 'dancer'],
  pressure: ['pyramid', 'wide-legged-fold', 'downward-dog', 'sun-salutation-a', 'warrior-flow', 'blood-pressure-avoid'],
  pregnancy: ['cobra', 'locust', 'camel', 'bridge', 'boat', 'plank', 'crow', 'revolved-chair', 'warrior-flow', 'sun-salutation-a', 'pregnancy-avoid'],
};
export const HEALTH_SOFT = {
  knees: ['half-split', 'pigeon', 'cobbler', 'figure-four'],
  wrists: [],
  back: ['wide-legged-fold', 'uttanasana', 'seated-twist', 'hand-to-toe', 'warrior-3', 'dancer'],
  neck: [],
  pressure: ['uttanasana', 'half-split', 'legs-up-wall'],
  pregnancy: ['supine-twist', 'seated-twist', 'hand-to-toe'],
};
export const HEALTH_AVOID = Object.fromEntries(HEALTH_FLAGS.map((f) => [f, [...HEALTH_HARD[f], ...HEALTH_SOFT[f]]]));
// Poses whose own page gets the personal note for an answer (the avoided poses, plus a few that only need care).
export const HEALTH_CARE = {
  knees: ['warrior-1', 'warrior-2', 'tree', 'child', 'triangle', 'extended-side-angle'],
  wrists: ['child'],
  back: ['child', 'warrior-2', 'half-lift', 'seated-fold', 'bridge'],
  neck: ['downward-dog', 'legs-up-wall', 'child', 'knees-to-chest'],
  pressure: ['child', 'mountain', 'half-lift', 'upward-salute'],
  pregnancy: ['warrior-1', 'warrior-2', 'triangle', 'extended-side-angle', 'tree', 'child', 'cobbler', 'savasana', 'savasana-side', 'legs-up-wall', 'downward-dog', 'figure-four', 'pigeon', 'low-lunge', 'high-lunge', 'chair', 'wide-legged-fold', 'pyramid', 'uttanasana', 'dancer', 'warrior-3'],
};

// Keep only known answers, once each, in a fixed order. Anything else (bad types, "none") is dropped.
export function cleanHealth(v) {
  if (!Array.isArray(v)) return [];
  return HEALTH_FLAGS.filter((f) => v.includes(f));
}
// Pose ids and gate tokens to hand to generatePlan({ avoid }).
export function healthAvoid(flags, { soft = true } = {}) {
  const f = cleanHealth(flags);
  return [...new Set(f.flatMap((x) => [...HEALTH_HARD[x], ...(soft ? HEALTH_SOFT[x] : [])]))];
}
// Answers that apply to one pose page.
export function flagsForPose(poseId, flags) {
  return cleanHealth(flags).filter((f) => HEALTH_AVOID[f].includes(poseId) || HEALTH_CARE[f].includes(poseId));
}
export const avoidsPose = (poseId, flags) => cleanHealth(flags).filter((f) => HEALTH_AVOID[f].includes(poseId));

// Pregnancy: the final rest is taken lying on the side. 'savasana-side' is a real pose (own figure, text and Hebrew narration);
// it is shown only when pregnancy is set, and replaces 'savasana' in generated plans and in the player. Holds are unchanged.
export const SIDE_REST = 'savasana-side';
export const isSavasana = (id) => id === 'savasana' || id === SIDE_REST;
export const restPoseFor = (poseId, flags) => (poseId === 'savasana' && cleanHealth(flags).includes('pregnancy') ? SIDE_REST : poseId);
export const swapRest = (items, flags) => (cleanHealth(flags).includes('pregnancy') ? items.map((it) => (it.pose === 'savasana' ? { ...it, pose: SIDE_REST } : it)) : items);
// Poses kept out of the library and the plan picker unless their answer is set.
export const hiddenPoses = (flags) => (cleanHealth(flags).includes('pregnancy') ? [] : [SIDE_REST]);
