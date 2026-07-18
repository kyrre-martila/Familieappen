import type { ReminderFilter } from "./reminderHistory";
import type { HuskView } from "./hooks/useHusk";

export type HuskViewState = { view: HuskView; reminderFilter: ReminderFilter };

export function selectHuskView(state: HuskViewState, view: HuskView): HuskViewState {
  return { ...state, view };
}
