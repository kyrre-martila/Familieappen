import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../../src/components/AppText";
import { Button } from "../../../../src/components/Button";
import { ErrorState, LoadingState, EmptyState } from "../../../../src/components/States";
import { Screen } from "../../../../src/components/Screen";
import { CalendarEventForm } from "../../../../src/features/calendar/components/CalendarEventForm";
import { calendarEventToForm, type CalendarEventForm as Form } from "../../../../src/features/calendar/eventForm";
import { buildCalendarEventDetailPath, getCalendarEventEditRestriction } from "../../../../src/features/calendar/events";
import { useCalendarEventDetails } from "../../../../src/features/calendar/hooks/useCalendarEventDetails";
import { useUpdateCalendarEvent } from "../../../../src/features/calendar/hooks/useUpdateCalendarEvent";
import { getCalendarEventBackAction } from "../../../../src/features/calendar/navigation";
import { theme } from "../../../../src/theme/tokens";

function safeBack(eventId: string | null, occurrenceDate?: string) { if (getCalendarEventBackAction(router.canGoBack()) === "back") router.back(); else if (eventId) router.replace(buildCalendarEventDetailPath({ eventId, occurrenceDate })); else router.replace("/(app)/(tabs)/calendar"); }

export default function EditCalendarEventScreen() {
  const params = useLocalSearchParams<{ eventId?: string; occurrenceDate?: string }>();
  const eventId = typeof params.eventId === "string" && params.eventId.trim() ? params.eventId : null;
  const occurrenceDate = typeof params.occurrenceDate === "string" ? params.occurrenceDate : undefined;
  const details = useCalendarEventDetails(eventId, occurrenceDate);
  const rawEvent = details.rawEvent;
  const updateMutation = useUpdateCalendarEvent({ eventId: eventId ?? "", previousEvent: rawEvent, occurrenceDate });
  const [form, setForm] = useState<Form | null>(rawEvent ? calendarEventToForm(rawEvent) : null);
  useEffect(() => { if (rawEvent && !updateMutation.saving) setForm(calendarEventToForm(rawEvent)); }, [rawEvent, updateMutation.saving]);
  const restriction = getCalendarEventEditRestriction(details.event);
  const update = <K extends keyof Form>(key: K, value: Form[K]) => { updateMutation.resetError(); setForm((current) => current ? { ...current, [key]: value } : current); };
  if (!eventId) return <Screen bottomInset="screen"><ErrorState title="Ugyldig hendelse" description="Vi mangler en gyldig hendelses-id." onRetry={() => router.replace("/(app)/(tabs)/calendar")} /></Screen>;
  if (details.loading || updateMutation.familiesLoading || !form) return <Screen bottomInset="screen"><LoadingState title="Laster hendelse" description="Henter hendelsen før den kan redigeres." /></Screen>;
  if (details.missingContext || updateMutation.missingContext) return <Screen bottomInset="screen"><ErrorState title="Mangler familietilgang" description="Vi finner ikke en aktiv familie for kalenderen akkurat nå." onRetry={() => router.replace("/(app)/(tabs)/calendar")} /></Screen>;
  if (details.error) return <Screen bottomInset="screen"><ErrorState title="Kunne ikke hente hendelsen" description="Prøv igjen for å laste redigering." onRetry={() => void details.refetch()} /></Screen>;
  if (!details.event || !rawEvent) return <Screen bottomInset="screen"><EmptyState title="Hendelsen finnes ikke lenger" description="Den kan være slettet eller flyttet siden kalenderen ble lastet." /><Button title="Tilbake til kalender" onPress={() => router.replace("/(app)/(tabs)/calendar")} /></Screen>;
  if (restriction) return <Screen bottomInset="screen"><View style={styles.topbar}><Button title="Tilbake" variant="secondary" onPress={() => safeBack(eventId, occurrenceDate)} /></View><ErrorState title="Kan ikke redigeres" description={restriction} onRetry={() => safeBack(eventId, occurrenceDate)} /></Screen>;
  return <View style={styles.root}><View style={styles.topbar}><Button title="Tilbake" variant="secondary" onPress={() => safeBack(eventId, occurrenceDate)} disabled={updateMutation.saving} /><AppText variant="label">Kalender</AppText></View><CalendarEventForm title="Rediger hendelse" description="Oppdater denne kalenderhendelsen for familien." form={form} onChange={update} onSubmit={() => updateMutation.updateEvent(form)} onCancel={() => safeBack(eventId, occurrenceDate)} submitting={updateMutation.saving} submitTitle="Lagre endringer" submittingTitle="Lagrer …" error={updateMutation.error} footer="Mobil støtter foreløpig redigering av vanlige, ikke-importerte enkelthendelser." /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg } });
