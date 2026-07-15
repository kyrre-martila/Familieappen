import { router } from "expo-router";
import { RefreshControl, StyleSheet, View } from "react-native";
import { Screen } from "../../../components/Screen";
import { AppText } from "../../../components/AppText";
import { Button } from "../../../components/Button";
import { EmptyState, ErrorState, LoadingState } from "../../../components/States";
import { theme } from "../../../theme/tokens";
import { formatMonthTitle, formatSelectedDate } from "../date";
import { buildCalendarEventDetailPath, getCalendarEventIdentity } from "../events";
import { useCalendar } from "../hooks/useCalendar";
import { CalendarWeekNav } from "./CalendarWeekNav";
import { CalendarEventCard } from "./CalendarEventCard";

export function CalendarShell() {
  const calendar = useCalendar();
  const eventDates = new Set(calendar.events.map((event) => event.date));
  return <Screen bottomInset="tab" refreshControl={<RefreshControl refreshing={calendar.refreshing} onRefresh={calendar.refresh} tintColor={theme.colors.primary} />}>
    <View style={styles.header}>
      <AppText variant="label">Kalender</AppText>
      <AppText variant="title">{formatMonthTitle(calendar.selectedDate)}</AppText>
      <AppText style={styles.description}>Familiehendelser fra samme kalender-API som web.</AppText>
      <Button title="Ny hendelse" onPress={() => router.push("/(app)/calendar/create")} accessibilityLabel="Opprett ny kalenderhendelse" />
    </View>
    <CalendarWeekNav selectedDate={calendar.selectedDate} onSelectDate={calendar.setSelectedDate} eventDates={eventDates} />
    {calendar.loading ? <LoadingState title="Laster kalender" description="Henter hendelser for familien." /> : calendar.error ? <ErrorState description="Kunne ikke hente kalenderen akkurat nå." onRetry={() => void calendar.refresh()} /> : <View style={styles.daySection}>
      <AppText variant="heading">{formatSelectedDate(calendar.selectedDate)}</AppText>
      {calendar.eventsForSelectedDate.length === 0 ? <EmptyState title="Ingen hendelser" description="Denne dagen er rolig foreløpig. Nye hendelser fra web dukker opp her." /> : <View style={styles.eventList} accessibilityLabel="Hendelser for valgt dato">{calendar.eventsForSelectedDate.map((event) => <CalendarEventCard key={`${event.id}:${event.occurrenceDate ?? event.date}`} event={event} onPress={() => router.push(buildCalendarEventDetailPath(getCalendarEventIdentity(event)))} />)}</View>}
    </View>}
  </Screen>;
}
const styles = StyleSheet.create({ header: { gap: theme.spacing.xs }, description: { color: theme.colors.textMuted }, daySection: { gap: theme.spacing.md }, eventList: { gap: theme.spacing.md } });
