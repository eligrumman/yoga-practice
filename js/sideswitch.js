// "I'm ready" side switch: pure decision logic (no DOM).
// After the first side of a two-sided pose the player may wait for a tap instead of switching by itself.
export const normManual = (v) => v === true;
export function shouldWaitForSide(manualSide, cur, next) {
  return normManual(manualSide) && !!cur && !!next && cur.sides > 1 && cur.side === 0 && next.pose?.id === cur.pose?.id && next.side === 1;
}
