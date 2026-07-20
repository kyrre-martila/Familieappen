import { getDateStripSwipeDirection, shouldActivateDateStripSwipe } from "./dateStripSwipe";

function assertEqual<T>(actual: T, expected: T, description: string): void {
  if (actual !== expected) throw new Error(`${description}: expected ${expected}, got ${actual}`);
}

assertEqual(shouldActivateDateStripSwipe(-18, 4), true, "clear horizontal movement activates responder");
assertEqual(shouldActivateDateStripSwipe(8, 1), false, "short movement does not activate responder");
assertEqual(shouldActivateDateStripSwipe(20, 25), false, "mostly vertical movement stays with parent scroll");
assertEqual(getDateStripSwipeDirection(-64, 8, -0.2), "forward", "clear left swipe navigates forward");
assertEqual(getDateStripSwipeDirection(64, 8, 0.2), "back", "clear right swipe navigates back");
assertEqual(getDateStripSwipeDirection(-24, 4, -0.7), "forward", "short but fast left swipe navigates forward");
assertEqual(getDateStripSwipeDirection(20, 4, 0.7), "back", "short but fast right swipe navigates back");
assertEqual(getDateStripSwipeDirection(-20, 4, -0.2), null, "short weak swipe does not navigate");
assertEqual(getDateStripSwipeDirection(-80, 80, -1), null, "mostly vertical swipe does not navigate horizontally");
