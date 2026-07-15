import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { ErrorState, LoadingState } from "../../../src/components/States";
import { Screen } from "../../../src/components/Screen";
import { CalendarEventForm } from "../../../src/features/calendar/components/CalendarEventForm";
import { formatDateString } from "../../../src/features/calendar/date";
import { defaultCalendarEventForm, type CalendarEventForm as Form } from "../../../src/features/calendar/eventForm";
import { useCreateCalendarEvent } from "../../../src/features/calendar/hooks/useCreateCalendarEvent";
import { getCalendarEventBackAction } from "../../../src/features/calendar/navigation";
import { theme } from "../../../src/theme/tokens";

function backToCalendar() { if (getCalendarEventBackAction(router.canGoBack()) === "back") router.back(); else router.replace("/(app)/(tabs)/calendar"); }

export default function CreateCalendarEventScreen() {
  const [form, setForm] = useState<Form>(defaultCalendarEventForm(formatDateString(new Date())));
  const create = useCreateCalendarEvent();
  const update = <K extends keyof Form>(key: K, value: Form[K]) => { create.resetError(); setForm((current) => ({ ...current, [key]: value })); };
  if (create.familiesLoading) return <Screen bottomInset="screen"><LoadingState title="Klargjør kalender" description="Henter familien før hendelsen kan lagres." /></Screen>;
  if (create.missingContext) return <Screen bottomInset="screen"><ErrorState title="Mangler familietilgang" description="Vi finner ikke en aktiv familie for kalenderen akkurat nå." onRetry={() => router.replace("/(app)/(tabs)/calendar")} /></Screen>;
  return <View style={styles.root}><View style={styles.topbar}><Button title="Tilbake" variant="secondary" onPress={backToCalendar} disabled={create.saving} /><AppText variant="label">Kalender</AppText></View><CalendarEventForm title="Ny hendelse" description="Opprett en kalenderhendelse for familien." form={form} onChange={update} onSubmit={() => create.createEvent(form)} onCancel={backToCalendar} submitting={create.saving} submitTitle="Lagre hendelse" submittingTitle="Lagrer …" error={create.error} footer="Støttede backend-felter brukt nå: tittel, dato, heldag, starttid, sluttid, lokasjon og beskrivelse. Øvrige støttede felt sendes med standardverdier." /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg } });
