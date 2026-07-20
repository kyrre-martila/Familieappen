import { AppHeader } from "../../../src/components/AppHeader";
import { CalendarShell } from "../../../src/features/calendar/components/CalendarShell";

export default function CalendarScreen() {
  return <><AppHeader title="Kalender" /><CalendarShell topInset="none" /></>;
}
