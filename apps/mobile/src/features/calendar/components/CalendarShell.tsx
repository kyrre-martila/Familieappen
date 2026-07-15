import { RefreshControl, StyleSheet, View } from "react-native";
import { Screen } from "../../../components/Screen";
import { AppText } from "../../../components/AppText";
import { EmptyState, ErrorState, LoadingState } from "../../../components/States";
import { theme } from "../../../theme/tokens";
import { formatMonthTitle, formatSelectedDate } from "../date";
import { useCalendar } from "../hooks/useCalendar";
import { CalendarWeekNav } from "./CalendarWeekNav";

export function CalendarShell() {
  const calendar = useCalendar();
  const eventDates = new Set(calendar.events.map((event) => event.date));
  return <Screen bottomInset="tab" refreshControl={<RefreshControl refreshing={calendar.refreshing} onRefresh={calendar.refresh} tintColor={theme.colors.primary} />}>
    <View style={styles.header}>
      <AppText variant="label">Kalender</AppText>
      <AppText variant="title">{formatMonthTitle(calendar.selectedDate)}</AppText>
      <AppText style={styles.description}>Familiehendelser fra samme kalender-API som web.</AppText>
    </View>
    <CalendarWeekNav selectedDate={calendar.selectedDate} onSelectDate={calendar.setSelectedDate} eventDates={eventDates} />
    {calendar.loading ? <LoadingState title="Laster kalender" description="Henter hendelser for familien." /> : calendar.error ? <ErrorState description="Kunne ikke hente kalenderen akkurat nå." onRetry={() => void calendar.refresh()} /> : <View style={styles.daySection}>
      <AppText variant="heading">{formatSelectedDate(calendar.selectedDate)}</AppText>
      {calendar.eventsForSelectedDate.length === 0 ? <EmptyState title="Ingen hendelser" description="Denne dagen er rolig foreløpig." /> : calendar.eventsForSelectedDate.map((event) => <View key={event.id} style={styles.eventPreview}><AppText variant="small" style={styles.time}>{event.allDay ? "Hele dagen" : event.startTime ?? ""}</AppText><AppText variant="lead">{event.title}</AppText></View>)}
    </View>}
  </Screen>;
}
const styles = StyleSheet.create({ header: { gap: theme.spacing.xs }, description: { color: theme.colors.textMuted }, daySection: { gap: theme.spacing.md }, eventPreview: { padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceWarm, borderWidth: 1, borderColor: theme.colors.border }, time: { color: theme.colors.primary, fontWeight: "800" } });
