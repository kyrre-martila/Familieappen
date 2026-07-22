import { applyDateOffset, getArrowDateOffset, getSnappedDateOffset, shouldActivateHorizontalDateStrip } from "./dateStripModel";

function assertEqual<T>(actual: T, expected: T, description: string): void { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${description}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
function assertOk(actual: unknown, description: string): void { if (!actual) throw new Error(description); }
assertEqual(getSnappedDateOffset({ dx: -54, itemWidth: 50 }), 1, "kort drag tilsvarer én dag");
assertEqual(getSnappedDateOffset({ dx: -130, itemWidth: 50 }), 3, "lengre drag tilsvarer flere dager");
assertOk(getSnappedDateOffset({ dx: -60, vx: -1.2, itemWidth: 50 }) > getSnappedDateOffset({ dx: -60, vx: 0, itemWidth: 50 }), "rask flick flytter flere dager enn sakte drag");
assertEqual(getSnappedDateOffset({ dx: -50, itemWidth: 50 }), 1, "negativ offset navigerer fremover");
assertEqual(getSnappedDateOffset({ dx: 50, itemWidth: 50 }), -1, "positiv offset navigerer bakover");
assertEqual(Number.isInteger(getSnappedDateOffset({ dx: -333, vx: -2, itemWidth: 47 })), true, "sluttposisjon snapper til helt dagstrinn");
assertEqual(getSnappedDateOffset({ dx: -5, itemWidth: 50 }), 0, "svært kort drag under terskel går tilbake");
assertEqual(applyDateOffset("2026-01-31", 1), "2026-02-01", "navigasjon over månedsskifte");
assertEqual(applyDateOffset("2026-12-31", 1), "2027-01-01", "navigasjon over årsskifte");
assertEqual(getArrowDateOffset("forward"), 1, "pil frem flytter én dag");
assertEqual(getArrowDateOffset("back"), -1, "pil tilbake flytter én dag");
assertOk(getSnappedDateOffset({ dx: -360, vx: -2, itemWidth: 50 }) > 5, "swipe kan flytte mer enn fem dager");
assertEqual(shouldActivateHorizontalDateStrip(20, 40), false, "vertikal-dominert gest aktiverer ikke horisontal navigasjon");
