import { useEffect, useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../src/components/AppText";
import { ErrorState, LoadingState } from "../../../src/components/States";
import { Screen } from "../../../src/components/Screen";
import { CalendarEventForm } from "../../../src/features/calendar/components/CalendarEventForm";
import { formatDateString } from "../../../src/features/calendar/date";
import { calendarEventToDuplicateCreateForm, defaultCalendarEventForm, type CalendarEventForm as Form } from "../../../src/features/calendar/eventForm";
import { useCreateCalendarEvent } from "../../../src/features/calendar/hooks/useCreateCalendarEvent";
import { useCalendarFamilyMembers } from "../../../src/features/calendar/hooks/useCalendarFamilyMembers";
import { getCalendarEventBackAction } from "../../../src/features/calendar/navigation";
import { parseCalendarEventDuplicateParams } from "../../../src/features/calendar/duplicateEventModel";
import { useDuplicateCalendarEventSource } from "../../../src/features/calendar/duplicateEvent";
import { theme } from "../../../src/theme/tokens";

function backToCalendar() { if (getCalendarEventBackAction(router.canGoBack()) === "back") router.back(); else router.replace("/(app)/(tabs)/calendar"); }

export default function CreateCalendarEventScreen() {
  const params = useLocalSearchParams<{ duplicateEventId?: string; sourceDate?: string; occurrenceDate?: string }>();
  const duplicateParams = parseCalendarEventDuplicateParams(params);
  const [form, setForm] = useState<Form>(() => defaultCalendarEventForm(formatDateString(new Date())));
  const [hydratedDuplicateKey, setHydratedDuplicateKey] = useState<string | null>(null);
  const create = useCreateCalendarEvent();
  const familyMembers = useCalendarFamilyMembers();
  const duplicate = useDuplicateCalendarEventSource(duplicateParams.error ? null : duplicateParams.duplicateEventId, duplicateParams.sourceDate, duplicateParams.occurrenceDate);
  const duplicateKey = duplicateParams.duplicateEventId ? `${duplicateParams.duplicateEventId}:${duplicateParams.occurrenceDate ?? duplicateParams.sourceDate ?? "event"}` : null;
  useEffect(() => {
    if (!duplicate.rawEvent || !duplicateKey || hydratedDuplicateKey === duplicateKey) return;
    setForm(calendarEventToDuplicateCreateForm(duplicate.rawEvent));
    setHydratedDuplicateKey(duplicateKey);
  }, [duplicate.rawEvent, duplicateKey, hydratedDuplicateKey]);
  const update = <K extends keyof Form>(key: K, value: Form[K]) => { create.resetError(); setForm((current) => ({ ...current, [key]: value })); };
  if (duplicateParams.error) return <Screen bottomInset="screen"><ErrorState title="Kan ikke duplisere hendelse" description={duplicateParams.error} onRetry={backToCalendar} /></Screen>;
  if (create.familiesLoading || (duplicateParams.duplicateEventId && duplicate.loading)) return <Screen bottomInset="screen"><LoadingState title={duplicateParams.duplicateEventId ? "Henter hendelse" : "Klargjør kalender"} description={duplicateParams.duplicateEventId ? "Henter hendelsen som skal dupliseres." : "Henter familien før hendelsen kan lagres."} /></Screen>;
  if (create.missingContext || duplicate.missingContext) return <Screen bottomInset="screen"><ErrorState title="Mangler familietilgang" description="Vi finner ikke en aktiv familie for kalenderen akkurat nå." onRetry={() => router.replace("/(app)/(tabs)/calendar")} /></Screen>;
  if (duplicateParams.duplicateEventId && duplicate.error) return <Screen bottomInset="screen"><ErrorState title="Kunne ikke hente hendelse" description={duplicate.error instanceof Error ? duplicate.error.message : "Prøv igjen, eller gå tilbake til kalenderen."} onRetry={() => void duplicate.refetch()} /></Screen>;
  if (duplicateParams.duplicateEventId && duplicate.notFound) return <Screen bottomInset="screen"><ErrorState title="Hendelsen finnes ikke" description="Vi fant ikke hendelsen som skulle dupliseres." onRetry={backToCalendar} /></Screen>;
  return <View style={styles.root}><Screen scroll={false} bottomInset="none" style={styles.headerScreen}><View style={styles.topbar}><Pressable accessibilityRole="button" accessibilityLabel="Tilbake til kalender" onPress={backToCalendar} disabled={create.saving} style={styles.backButton}><Ionicons name="chevron-back" size={24} color={theme.colors.primaryStrong} /><AppText style={styles.backText}>Tilbake</AppText></Pressable><AppText style={styles.headerTitle}>Ny hendelse</AppText><View style={styles.headerSpacer} /></View></Screen><CalendarEventForm title="" description="" form={form} onChange={update} onSubmit={() => create.createEvent(form)} onCancel={backToCalendar} submitting={create.saving} submitTitle="Lagre hendelse" submittingTitle="Lagrer …" error={create.error} familyMembers={familyMembers.familyMembers} familyMembersLoading={familyMembers.loading} /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, headerScreen: { paddingBottom: 0, gap: 0 }, topbar: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm }, backButton: { minHeight: 44, minWidth: 44, flexDirection: "row", alignItems: "center", gap: 2, borderRadius: theme.radius.pill }, backText: { color: theme.colors.primaryStrong, fontWeight: "800" }, headerTitle: { flex: 1, textAlign: "center", color: theme.colors.heading, fontSize: 17, fontWeight: "900" }, headerSpacer: { width: 88 } });
