import { router, useLocalSearchParams } from "expo-router";
import { RefreshControl, StyleSheet, View } from "react-native";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Screen } from "../../../src/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "../../../src/components/States";
import { CalendarEventDetails } from "../../../src/features/calendar/components/CalendarEventDetails";
import { useCalendarEventDetails } from "../../../src/features/calendar/hooks/useCalendarEventDetails";
import { useDeleteCalendarEvent } from "../../../src/features/calendar/hooks/useDeleteCalendarEvent";
import { theme } from "../../../src/theme/tokens";
import { getCalendarEventBackAction } from "../../../src/features/calendar/navigation";
import { buildCalendarEventDuplicatePath } from "../../../src/features/calendar/duplicateEventModel";

export function goBackToCalendar() {
  if (getCalendarEventBackAction(router.canGoBack()) === "back") {
    router.back();
    return "back";
  }
  router.replace("/(app)/(tabs)/calendar");
  return "fallback";
}

function duplicateEvent(rawEvent: NonNullable<ReturnType<typeof useCalendarEventDetails>["rawEvent"]>) {
  const duplicateId = rawEvent.isRecurringOccurrence && rawEvent.recurringEventId && rawEvent.occurrenceDate ? rawEvent.recurringEventId : rawEvent.id;
  const occurrenceDate = rawEvent.isRecurringOccurrence && rawEvent.recurringEventId ? rawEvent.occurrenceDate : undefined;
  router.push(buildCalendarEventDuplicatePath({ eventId: duplicateId, occurrenceDate }));
}

export default function CalendarEventDetailScreen() {
  const params = useLocalSearchParams<{ eventId?: string; occurrenceDate?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : null;
  const occurrenceDate = typeof params.occurrenceDate === "string" ? params.occurrenceDate : undefined;
  const details = useCalendarEventDetails(eventId, occurrenceDate);
  const deleteMutation = useDeleteCalendarEvent({ eventId: eventId ?? "", previousEvent: details.rawEvent, occurrenceDate, selectedDate: details.event?.date });
  return <Screen bottomInset="screen" refreshControl={<RefreshControl refreshing={details.refreshing} onRefresh={() => void details.refetch()} tintColor={theme.colors.primary} />}><View style={styles.topbar}><Button title="Tilbake" variant="secondary" onPress={goBackToCalendar} /><AppText variant="label">Kalender</AppText></View>{details.event ? <CalendarEventDetails event={details.event} onEdit={(path) => router.push(path)} onDuplicate={() => details.rawEvent ? duplicateEvent(details.rawEvent) : undefined} onDelete={async (scope) => { await deleteMutation.deleteEvent(scope); }} deleting={deleteMutation.deleting} deleteError={deleteMutation.error} onResetDeleteError={deleteMutation.resetError} /> : details.loading ? <LoadingState title="Laster hendelse" description="Henter kalenderhendelsen." /> : details.missingContext ? <ErrorState title="Mangler familietilgang" description="Vi finner ikke en aktiv familie for kalenderen akkurat nå." onRetry={() => void details.refetch()} /> : details.error ? <ErrorState description="Kunne ikke hente hendelsen akkurat nå." onRetry={() => void details.refetch()} /> : <><EmptyState title="Hendelsen finnes ikke lenger" description="Den kan være slettet eller flyttet siden kalenderen ble lastet." /><Button title="Tilbake til kalender" onPress={() => router.replace("/(app)/(tabs)/calendar")} /></>}</Screen>;
}

const styles = StyleSheet.create({ topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md } });
