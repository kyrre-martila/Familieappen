import { useEffect, useRef, useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { AppText } from "../../../src/components/AppText";
import { ErrorState, LoadingState } from "../../../src/components/States";
import { CalendarEventForm } from "../../../src/features/calendar/components/CalendarEventForm";
import { calendarEventToDuplicateCreateForm, defaultCalendarEventForm, type CalendarEventForm as Form } from "../../../src/features/calendar/eventForm";
import { useCreateCalendarEvent } from "../../../src/features/calendar/hooks/useCreateCalendarEvent";
import { useCalendarFamilyMembers } from "../../../src/features/calendar/hooks/useCalendarFamilyMembers";
import { getCalendarEventBackAction } from "../../../src/features/calendar/navigation";
import { parseCalendarEventDuplicateParams } from "../../../src/features/calendar/duplicateEventModel";
import { useDuplicateCalendarEventSource } from "../../../src/features/calendar/duplicateEvent";
import { getSelectableCalendarParticipantIds } from "../../../src/features/calendar/participants";
import { theme } from "../../../src/theme/tokens";

function backToCalendar() { if (getCalendarEventBackAction(router.canGoBack()) === "back") router.back(); else router.replace("/(app)/(tabs)/calendar"); }

export default function CreateCalendarEventScreen() {
  const params = useLocalSearchParams<{ duplicateEventId?: string; sourceDate?: string; occurrenceDate?: string }>();
  const duplicateParams = parseCalendarEventDuplicateParams(params);
  const [form, setForm] = useState<Form>(() => defaultCalendarEventForm());
  const [hydratedDuplicateKey, setHydratedDuplicateKey] = useState<string | null>(null);
  const participantsInitializedRef = useRef(false);
  const participantsDirtyRef = useRef(false);
  const create = useCreateCalendarEvent();
  const familyMembers = useCalendarFamilyMembers();
  const duplicate = useDuplicateCalendarEventSource(duplicateParams.error ? null : duplicateParams.duplicateEventId, duplicateParams.sourceDate, duplicateParams.occurrenceDate);
  const duplicateKey = duplicateParams.duplicateEventId ? `${duplicateParams.duplicateEventId}:${duplicateParams.occurrenceDate ?? duplicateParams.sourceDate ?? "event"}` : null;
  useEffect(() => {
    if (!duplicate.rawEvent || !duplicateKey || hydratedDuplicateKey === duplicateKey) return;
    setForm(calendarEventToDuplicateCreateForm(duplicate.rawEvent));
    setHydratedDuplicateKey(duplicateKey);
    participantsInitializedRef.current = true;
  }, [duplicate.rawEvent, duplicateKey, hydratedDuplicateKey]);

  useEffect(() => {
    if (duplicateKey || participantsInitializedRef.current || participantsDirtyRef.current || familyMembers.loading) return;
    const participantIds = getSelectableCalendarParticipantIds(familyMembers.familyMembers);
    if (!participantIds.length) return;
    participantsInitializedRef.current = true;
    setForm((current) => current.participantFamilyMemberIds.length ? current : { ...current, participantFamilyMemberIds: participantIds });
  }, [duplicateKey, familyMembers.familyMembers, familyMembers.loading]);
  const update = <K extends keyof Form>(key: K, value: Form[K]) => { if (key === "participantFamilyMemberIds") participantsDirtyRef.current = true; create.resetError(); setForm((current) => ({ ...current, [key]: value })); };
  if (duplicateParams.error) return <SafeAreaView style={styles.root}><ErrorState title="Kan ikke duplisere hendelse" description={duplicateParams.error} onRetry={backToCalendar} /></SafeAreaView>;
  if (create.familiesLoading || (duplicateParams.duplicateEventId && duplicate.loading)) return <SafeAreaView style={styles.root}><LoadingState title={duplicateParams.duplicateEventId ? "Henter hendelse" : "Klargjør kalender"} description={duplicateParams.duplicateEventId ? "Henter hendelsen som skal dupliseres." : "Henter familien før hendelsen kan lagres."} /></SafeAreaView>;
  if (create.missingContext || duplicate.missingContext) return <SafeAreaView style={styles.root}><ErrorState title="Mangler familietilgang" description="Vi finner ikke en aktiv familie for kalenderen akkurat nå." onRetry={() => router.replace("/(app)/(tabs)/calendar")} /></SafeAreaView>;
  if (duplicateParams.duplicateEventId && duplicate.error) return <SafeAreaView style={styles.root}><ErrorState title="Kunne ikke hente hendelse" description={duplicate.error instanceof Error ? duplicate.error.message : "Prøv igjen, eller gå tilbake til kalenderen."} onRetry={() => void duplicate.refetch()} /></SafeAreaView>;
  if (duplicateParams.duplicateEventId && duplicate.notFound) return <SafeAreaView style={styles.root}><ErrorState title="Hendelsen finnes ikke" description="Vi fant ikke hendelsen som skulle dupliseres." onRetry={backToCalendar} /></SafeAreaView>;
  return <View style={styles.root}><SafeAreaView edges={["top"]} style={styles.headerSafeArea}><View style={styles.topbar}><Pressable accessibilityRole="button" accessibilityLabel="Tilbake til kalender" onPress={backToCalendar} disabled={create.saving} style={styles.backButton}><Ionicons name="chevron-back" size={24} color={theme.colors.primaryStrong} /><AppText style={styles.backText}>Tilbake</AppText></Pressable><AppText style={styles.headerTitle}>Ny hendelse</AppText><View style={styles.headerSpacer} /></View></SafeAreaView><CalendarEventForm title="" description="" topInset="none" form={form} onChange={update} onSubmit={() => create.createEvent(form)} onCancel={backToCalendar} submitting={create.saving} submitTitle="Lagre hendelse" submittingTitle="Lagrer …" error={create.error} familyMembers={familyMembers.familyMembers} familyMembersLoading={familyMembers.loading} /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, headerSafeArea: { backgroundColor: theme.colors.background }, topbar: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm }, backButton: { minHeight: 44, minWidth: 44, flexDirection: "row", alignItems: "center", gap: 2, borderRadius: theme.radius.pill }, backText: { color: theme.colors.primaryStrong, fontWeight: "800" }, headerTitle: { flex: 1, textAlign: "center", color: theme.colors.heading, fontSize: 17, fontWeight: "900" }, headerSpacer: { width: 88 } });
