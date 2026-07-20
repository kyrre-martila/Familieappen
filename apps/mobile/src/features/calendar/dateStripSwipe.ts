const SWIPE_ACTIVATION_THRESHOLD = 10;
const SWIPE_DISTANCE_THRESHOLD = 44;
const SWIPE_VELOCITY_THRESHOLD = 0.55;
const HORIZONTAL_DOMINANCE_RATIO = 1.25;

export function shouldActivateDateStripSwipe(dx: number, dy: number) {
  return Math.abs(dx) > SWIPE_ACTIVATION_THRESHOLD && Math.abs(dx) > Math.abs(dy) * HORIZONTAL_DOMINANCE_RATIO;
}

export function getDateStripSwipeDirection(dx: number, dy: number, vx: number): "back" | "forward" | null {
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  if (horizontal <= vertical * HORIZONTAL_DOMINANCE_RATIO) return null;
  if (horizontal >= SWIPE_DISTANCE_THRESHOLD) return dx < 0 ? "forward" : "back";
  if (Math.abs(vx) < SWIPE_VELOCITY_THRESHOLD) return null;
  return vx < 0 ? "forward" : "back";
}
